"""
MediRead AI - Ollama Qwen 2.5 Extraction Service
Production LLM client with timeout, retry, and strict schema validation.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
import httpx
from pydantic import ValidationError

from worker.extraction.schemas import ExtractionResult, LabItemDraft, MedicineItemDraft

logger = logging.getLogger("mediread.extraction")

DEFAULT_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
DEFAULT_OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "90"))  # Giảm từ 180 → 90s

EXTRACT_LAB_PROMPT = """Bạn là trợ lý trích xuất dữ liệu phiếu xét nghiệm y khoa.
Dưới đây là văn bản OCR từ ảnh phiếu xét nghiệm. Mỗi dòng là một hàng của phiếu, các ô trong hàng ngăn cách bằng dấu "|".

[VĂN BẢN OCR]:
{raw_text}

Nhiệm vụ: Trích xuất các chỉ số xét nghiệm và trả về DUY NHẤT một JSON hợp lệ theo định dạng sau:
{{
  "doc_type": "lab_report",
  "facility_name": "tên bệnh viện hoặc phòng khám nếu có, không có thì để null",
  "issued_date": "ngày xét nghiệm định dạng YYYY-MM-DD hoặc DD/MM/YYYY nếu có, không có thì để null",
  "lab_items": [
    {{
      "name": "tên xét nghiệm",
      "value": "kết quả đo được của bệnh nhân",
      "unit": "đơn vị",
      "reference_range": "khoảng tham chiếu",
      "flag": "high hoặc low hoặc normal hoặc unknown"
    }}
  ],
  "medicine_items": []
}}

QUY TẮC BẮT BUỘC:
1. "value" chỉ là SỐ ĐO kết quả của bệnh nhân. Tuyệt đối không chép khoảng tham chiếu vào "value".
2. Nếu dòng chỉ có tên và khoảng chuẩn mà chưa có số đo, để "value" là "".
3. "flag": Nếu có dấu H, *, hoặc chữ 'Cao', đặt "high". Nếu có dấu L hoặc chữ 'Thấp', đặt "low". Nếu có chữ 'Bình thường' hoặc trong ngưỡng rõ ràng, đặt "normal". Nếu không chắc chắn, đặt "unknown".
4. "name": Phục hồi dấu tiếng Việt chuẩn và chính xác cho tên xét nghiệm (ví dụ: nếu OCR quét 'So luong bach cau' thì ghi 'Số lượng bạch cầu (WBC)', 'So luong hong cau' -> 'Số lượng hồng cầu (RBC)', 'So luong tieu cau' -> 'Số lượng tiểu cầu (PLT)', 'Dinh luong Glucose' -> 'Đường huyết (Glucose)', 'Dinh luong Albumin' -> 'Định lượng Albumin', 'Protein toan phan' -> 'Protein toàn phần'). Với các từ viết tắt (WBC, RBC, PLT, TSH, FT3, FT4,...) hãy mở rộng thành tên tiếng Việt dễ hiểu.
5. Chỉ trả về JSON thuần túy, không có thẻ markdown ```json, không giải thích.
"""

EXTRACT_PRESCRIPTION_PROMPT = """Bạn là trợ lý trích xuất đơn thuốc y khoa.
Dưới đây là văn bản OCR từ ảnh đơn thuốc. Các dòng ngăn cách bằng dấu "|".

[VĂN BẢN OCR]:
{raw_text}

Nhiệm vụ: Trích xuất danh sách thuốc và trả về DUY NHẤT một JSON hợp lệ theo định dạng sau:
{{
  "doc_type": "prescription",
  "facility_name": "tên bệnh viện hoặc cơ sở y tế",
  "issued_date": "ngày kê đơn nếu có",
  "lab_items": [],
  "medicine_items": [
    {{
      "name": "tên thuốc đầy đủ bao gồm hàm lượng và biệt dược trong ngoặc",
      "dosage": "liều lượng mỗi lần uống, vd: 1 viên, 1/2 viên, 5mg",
      "dosage_form": "viên, gói, chai, ống",
      "times_per_day": 1,
      "times": ["morning"],
      "instructions": "hướng dẫn cách dùng cụ thể, vd: Cách dùng: Sáng 1/2 viên",
      "duration_days": 20
    }}
  ]
}}

QUY TẮC BẮT BUỘC:
1. "name": Phục hồi đầy đủ dấu tiếng Việt chuẩn cho tên thuốc và thảo dược (ví dụ: 'Bình vôi 150mg + sen lá 180mg (Night queen)', 'Escitalopram oxalat 10mg (ESCIVEX 10 TABLETS)').
2. "instructions": Trích xuất chính xác dòng 'Cách dùng: ...' tương ứng của từng thuốc. Tuyệt đối không để trống nếu đơn có ghi cách dùng.
3. "times": Căn cứ vào cách dùng: nếu có 'Sáng' thêm "morning", 'Trưa' thêm "noon", 'Chiều' thêm "afternoon", 'Tối' thêm "evening".
4. "duration_days": Tìm trong phần lời dặn (ví dụ: 'Toa: 20 ngày uống' -> đặt 20).
5. Chỉ trả về JSON thuần túy, không có thẻ markdown ```json, không giải thích.
"""


class ExtractionService:
    """Manages connection to Ollama and ensures validated schema outputs."""

    def __init__(
        self,
        base_url: str = DEFAULT_OLLAMA_BASE_URL,
        model: str = DEFAULT_OLLAMA_MODEL,
        timeout: float = DEFAULT_OLLAMA_TIMEOUT,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def check_health(self) -> Dict[str, Any]:
        """Verifies Ollama connectivity and model presence."""
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", [])]
                    has_model = any(self.model in m for m in models)
                    return {
                        "status": "healthy" if has_model else "model_missing",
                        "available_models": models,
                        "required_model": self.model,
                    }
                return {"status": "unhealthy", "code": res.status_code}
        except Exception as exc:
            return {"status": "unavailable", "error": str(exc)}

    def _call_ollama(self, prompt: str) -> str:
        """Invokes Ollama generate API in JSON mode."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "keep_alive": "30m",
            "options": {
                "temperature": 0.0,
                "num_ctx": 2048,
                "num_predict": 896,
            },
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip()

    def extract(self, raw_text: str, doc_type: str = "lab_report") -> ExtractionResult:
        """
        Extracts structured data from raw OCR text with validation and 1 retry.
        """
        if not raw_text or not raw_text.strip():
            return ExtractionResult(doc_type="lab_report" if doc_type == "lab_report" else "prescription")

        prompt_template = EXTRACT_LAB_PROMPT if doc_type == "lab_report" else EXTRACT_PRESCRIPTION_PROMPT
        prompt = prompt_template.format(raw_text=raw_text)

        # First attempt
        raw_output = self._call_ollama(prompt)
        try:
            parsed_json = json.loads(raw_output)
            # Ensure doc_type matches request if missing
            if "doc_type" not in parsed_json:
                parsed_json["doc_type"] = doc_type
            return ExtractionResult.model_validate(parsed_json)
        except (json.JSONDecodeError, ValidationError) as first_err:
            logger.warning("First LLM extraction attempt failed schema validation: %s. Retrying...", first_err)

        # Retry with correction prompt
        fix_prompt = f"""Chuỗi JSON sau đây bị lỗi cú pháp hoặc sai schema Pydantic:
{raw_output[:1500]}

Hãy sửa lại thành một JSON DUY NHẤT hoàn chỉnh, hợp lệ, không thừa thiếu dấu ngoặc, theo đúng format:
{{"doc_type": "{doc_type}", "facility_name": null, "issued_date": null, "lab_items": [...], "medicine_items": [...]}}
"""
        try:
            retry_output = self._call_ollama(fix_prompt)
            parsed_retry = json.loads(retry_output)
            return ExtractionResult.model_validate(parsed_retry)
        except Exception as retry_err:
            logger.warning("LLM JSON repair failed: %s. Building safe partial extraction.", retry_err)
            safe_labs = []
            safe_meds = []
            try:
                candidate = parsed_json if 'parsed_json' in locals() and isinstance(parsed_json, dict) else {}
                for item in candidate.get("lab_items", []):
                    try:
                        safe_labs.append(LabItemDraft.model_validate(item))
                    except Exception:
                        pass
                for item in candidate.get("medicine_items", []):
                    try:
                        safe_meds.append(MedicineItemDraft.model_validate(item))
                    except Exception:
                        pass
                return ExtractionResult(
                    doc_type=doc_type,
                    facility_name=candidate.get("facility_name"),
                    issued_date=candidate.get("issued_date"),
                    lab_items=safe_labs,
                    medicine_items=safe_meds,
                )
            except Exception:
                return ExtractionResult(doc_type=doc_type)
