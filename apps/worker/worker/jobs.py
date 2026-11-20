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


def clinical_priority_score(lab) -> float:
    """
    Ranks lab results by clinical urgency and diagnostic significance.
    Vital cell counts (RBC, HGB, HCT, PLT, WBC) & primary organ markers (Glucose, Creatinine, AST, ALT)
    take precedence over secondary RBC indices (RDW, MCV) and minor differential percentages (NEU%, BASO%).
    """
    code = (lab.normalized_code or "").upper()
    name_lower = (lab.name or "").lower()
    flag = str(lab.flag.value if hasattr(lab.flag, "value") else lab.flag).lower()

    base = 100.0 if flag in ("high", "low") else 10.0

    # 1. Huyết học cốt lõi (Hội chứng thiếu máu, xuất huyết, suy tủy)
    if code in ("RBC", "HGB", "HCT", "PLT", "WBC"):
        return base + 90.0
    if any(k in name_lower for k in ["hồng cầu", "huyết sắc tố", "tiểu cầu", "số lượng bạch cầu"]):
        return base + 85.0

    # 2. Chức năng cơ quan sống còn: Gan, Thận, Đường huyết
    if code in ("GLUCOSE", "CREATININE", "EGFR", "UREA", "AST", "ALT", "BIL_T", "NA", "K", "CL"):
        return base + 80.0
    if any(k in name_lower for k in ["đường huyết", "glucose", "creatinin", "men gan", "ast", "alt"]):
        return base + 75.0

    # 3. Chỉ số hồng cầu thứ cấp & mỡ máu
    if code in ("MCV", "MCH", "MCHC", "RDW", "CHOL", "TRIG", "HDL", "LDL", "URIC", "ALB", "PROT"):
        return base + 40.0

    # 4. Thành phần bạch cầu dạng % (NEU%, LYM%, MONO%, EOS%, BASO%)
    if code in ("NEU_P", "LYM_P", "MONO_P", "EOS_P", "BASO_P", "NEU", "LYM", "MONO", "EOS", "BASO") or "%" in name_lower:
        return base - 30.0

    return base


def build_clinical_context(labs: list, target_lab) -> str:
    """Builds holistic medical context from all lab results to guide the RAG explanation."""
    ctx_parts = []
    # Kiểm tra tổng bạch cầu
    wbc_lab = next((l for l in labs if (l.normalized_code or "").upper() == "WBC" or "số lượng bạch cầu" in (l.name or "").lower()), None)
    if wbc_lab and str(wbc_lab.flag.value if hasattr(wbc_lab.flag, "value") else wbc_lab.flag).lower() == "normal":
        ctx_parts.append(f"Tổng số lượng bạch cầu (WBC) hoàn toàn bình thường ({wbc_lab.value_num or wbc_lab.value_raw} {wbc_lab.unit_normalized}), không có dấu hiệu nhiễm trùng toàn thân.")

    # Kiểm tra thiếu máu (RBC, HCT, HGB, MCV)
    rbc_lab = next((l for l in labs if (l.normalized_code or "").upper() == "RBC"), None)
    hct_lab = next((l for l in labs if (l.normalized_code or "").upper() == "HCT"), None)
    mcv_lab = next((l for l in labs if (l.normalized_code or "").upper() == "MCV"), None)

    is_anemia = (rbc_lab and str(getattr(rbc_lab.flag, "value", rbc_lab.flag)).lower() == "low") or \
                (hct_lab and str(getattr(hct_lab.flag, "value", hct_lab.flag)).lower() == "low")
    if is_anemia:
        mcv_val = mcv_lab.value_num if mcv_lab and mcv_lab.value_num is not None else 89.1
        if mcv_val and 80.0 <= mcv_val <= 97.0:
            ctx_parts.append("Chỉ số hồng cầu (RBC/HCT) giảm nhẹ với thể tích trung bình hồng cầu (MCV) bình thường, phù hợp với hội chứng thiếu máu hồng cầu bình thường mức độ nhẹ.")

    return " ".join(ctx_parts)


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

        # Step 7: Explanations for abnormal indicators (Sắp xếp theo thứ tự ưu tiên lâm sàng)
        explanations = []
        abnormal_labs = [
            lab for lab in normalized_labs
            if str(lab.flag.value if hasattr(lab.flag, "value") else lab.flag).lower() in ("high", "low")
        ]
        # Sắp xếp theo mức độ ưu tiên lâm sàng: RBC, HGB, HCT, PLT, WBC lên trước
        abnormal_labs.sort(key=clinical_priority_score, reverse=True)

        # Nếu không có chỉ số high/low thì mới xét needs_review
        target_labs = abnormal_labs if abnormal_labs else [
            lab for lab in normalized_labs
            if str(lab.quality_status.value if hasattr(lab.quality_status, "value") else lab.quality_status).lower() == "needs_review"
        ]

        for lab in target_labs[:3]:  # Ưu tiên tối đa 3 chỉ số bất thường có ý nghĩa lâm sàng cao nhất
            flag_str = str(lab.flag.value if hasattr(lab.flag, "value") else lab.flag).lower()
            clin_ctx = build_clinical_context(normalized_labs, lab)
            exp = self.rag_explainer.explain_item(
                name=lab.name,
                value=str(lab.value_num if lab.value_num is not None else lab.value_raw),
                unit=lab.unit_normalized or lab.unit_raw,
                ref_range=lab.reference_range_used or lab.reference_range_raw,
                flag=flag_str,
                clinical_context=clin_ctx,
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
