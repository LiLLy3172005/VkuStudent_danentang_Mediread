"""
MediRead AI - Background Worker Job Processor
Orchestrates:
Image Validation -> PII Masking -> PaddleOCR -> Qwen 2.5 Extraction -> Normalization -> Quality Gate
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# Load torch first to prevent DLL conflicts with PaddleOCR on Windows
try:
    import torch
except ImportError:
    pass

from worker.security.image_validation import validate_image_bytes, sanitize_and_orient_image
from worker.security.pii_masking import mask_pii_from_image
from worker.ocr.engine import OcrEngine
from worker.extraction.llm_client import ExtractionService
from worker.normalization.lab_normalizer import LabNormalizer, PatientSex, AgeGroup
from worker.rag.rag_explainer import RagExplainer

logger = logging.getLogger("mediread.worker")


class DocumentProcessor:
    """End-to-end document processing pipeline."""

    def __init__(
        self,
        ocr_engine: Optional[OcrEngine] = None,
        extraction_service: Optional[ExtractionService] = None,
        rag_explainer: Optional[RagExplainer] = None,
    ):
        self.ocr_engine = ocr_engine or OcrEngine.create_default()
        self.extraction_service = extraction_service or ExtractionService()
        self.rag_explainer = rag_explainer or RagExplainer()

    def process_document(
        self,
        file_path: str | Path,
        doc_type: str = "lab_report",
        patient_sex: str = "unknown",
        age_group: str = "unknown",
        work_dir: Optional[str | Path] = None,
    ) -> Dict[str, Any]:
        """
        Executes complete production pipeline on a local or staged image file.
        """
        file_path = Path(file_path)
        if not file_path.is_file():
            raise FileNotFoundError(f"Source file not found: {file_path}")

        work_path = Path(work_dir) if work_dir else file_path.parent / "processed"
        work_path.mkdir(parents=True, exist_ok=True)

        clean_image_path = work_path / f"clean_{file_path.name}"
        masked_image_path = work_path / f"masked_{file_path.name}"

        # Step 1: Validate file bytes
        with open(file_path, "rb") as f:
            data = f.read()
        validation_info = validate_image_bytes(data)

        # Step 2: Sanitize and fix orientation
        w, h = sanitize_and_orient_image(file_path, clean_image_path)

        # Step 3: Run OCR
        ocr_result = self.ocr_engine.process_image(clean_image_path)
        raw_ocr_text = ocr_result["raw_text"]
        ocr_cells = ocr_result["cells"]
        ocr_confidence = ocr_result["confidence"]

        # Step 4: Mask PII using OCR cells and barcode detection
        mask_info = mask_pii_from_image(clean_image_path, masked_image_path, ocr_cells)

        # Step 5: LLM Structured Extraction
        extraction = self.extraction_service.extract(raw_ocr_text, doc_type=doc_type)

        # Step 6: Normalization & Quality Gate
        sex_enum = PatientSex.MALE if patient_sex in ("nam", "male") else (
            PatientSex.FEMALE if patient_sex in ("nu", "female") else PatientSex.UNKNOWN
        )
        age_enum = AgeGroup.CHILD if age_group == "child" else (
            AgeGroup.ADULT if age_group == "adult" else AgeGroup.UNKNOWN
        )

        normalized_labs = []
        if doc_type == "lab_report":
            draft_items = [it.model_dump() for it in extraction.lab_items]
            normalized_labs = LabNormalizer.normalize_all(
                draft_items=draft_items,
                patient_sex=sex_enum,
                age_group=age_enum,
            )

        # Step 7: Explanations for abnormal indicators (tối ưu tốc độ: ưu tiên tối đa 3 chỉ số bất thường quan trọng nhất)
        explanations = []
        abnormal_labs = [
            lab for lab in normalized_labs
            if str(lab.flag.value if hasattr(lab.flag, "value") else lab.flag).lower() in ("high", "low")
        ]
        # Nếu không có chỉ số high/low thì mới xét needs_review
        target_labs = abnormal_labs if abnormal_labs else [
            lab for lab in normalized_labs
            if str(lab.quality_status.value if hasattr(lab.quality_status, "value") else lab.quality_status).lower() == "needs_review"
        ]

        for lab in target_labs[:2]:  # Ưu tiên 2 chỉ số bất thường quan trọng nhất để phản hồi nhanh dưới 20 giây
            flag_str = str(lab.flag.value if hasattr(lab.flag, "value") else lab.flag).lower()
            exp = self.rag_explainer.explain_item(
                name=lab.name,
                value=str(lab.value_num if lab.value_num is not None else lab.value_raw),
                unit=lab.unit_normalized or lab.unit_raw,
                ref_range=lab.reference_range_used or lab.reference_range_raw,
                flag=flag_str,
            )
            explanations.append({
                "indicator_name": lab.name,
                "explanation": exp["content"],
                "citations": exp["citations"],
                "disclaimer": exp["disclaimer"],
                "flag": flag_str,
            })

        # Step 8: Document Status Decision
        needs_review = ocr_result["needs_review"] or any(
            lab.quality_status.value == "needs_review" for lab in normalized_labs
        )
        # Tài liệu đã xử lý xong luôn chuyển thành 'needs_review' để người dùng xem và xác nhận
        status = "needs_review"

        return {
            "status": status,
            "validation_info": validation_info,
            "ocr_confidence": ocr_confidence,
            "raw_ocr_text": raw_ocr_text,
            "masked_image_path": str(masked_image_path),
            "facility_name": extraction.facility_name,
            "issued_date": extraction.issued_date,
            "lab_results": [it.model_dump(mode="json") for it in normalized_labs],
            "medications": [it.model_dump(mode="json") for it in extraction.medicine_items],
            "explanations": explanations,
            "is_pii_masked": mask_info["is_pii_masked"],
            "needs_review": needs_review,
        }
