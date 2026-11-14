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
DEFAULT_OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "180"))

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
4. Giữ nguyên văn bản tên, giá trị, đơn vị như trên phiếu.
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
      "name": "tên thuốc đầy đủ (bao gồm hàm lượng nếu có)",
      "dosage": "liều dùng mỗi lần, vd: 1 viên, 5mg",
      "dosage_form": "viên, gói, chai, ống",
      "times_per_day": 2,
      "times": ["morning", "evening"],
      "instructions": "hướng dẫn, vd: uống sau ăn no 30 phút",
      "duration_days": 14
    }}
  ]
}}

QUY TẮC:
- "times": chọn trong danh sách: "morning" (sáng), "noon" (trưa), "afternoon" (chiều), "evening" (tối).
- Chỉ trả về JSON thuần túy, không có thẻ markdown ```json, không giải thích.
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
            "options": {
                "temperature": 0.0,
                "num_ctx": 8192,
                "num_predict": 4096,
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
        retry_output = self._call_ollama(fix_prompt)
        try:
            parsed_retry = json.loads(retry_output)
            return ExtractionResult.model_validate(parsed_retry)
        except Exception as retry_err:
            logger.error("LLM JSON repair also failed: %s", retry_err)
            raise ValueError(f"llm_invalid_schema: {str(retry_err)}") from retry_err
