"""
MediRead AI - Ollama Qwen 2.5 Extraction Service
Production LLM client with timeout, retry, and strict schema validation.
"""

import os
import re
import json
import logging
from typing import Dict, Any, Optional, List
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
1. "value" là kết quả của bệnh nhân:
   - Đối với chỉ số định lượng: chỉ ghi SỐ ĐO (ví dụ: "9.84", "12.5", "3.92"). Tuyệt đối không chép khoảng tham chiếu vào "value".
   - Đối với xét nghiệm định tính / nhóm máu: ghi giá trị chữ hoặc ký hiệu (ví dụ: "A", "B", "AB", "O", "+", "-", "Dương tính", "Âm tính"). Bắt buộc phải trích xuất đầy đủ các dòng Nhóm máu và Rh nếu có trên phiếu!
2. Nếu dòng chỉ có tên và khoảng chuẩn mà chưa có số đo hay kết quả, để "value" là "".
3. "flag": Nếu có dấu H, *, hoặc chữ 'Cao', đặt "high". Nếu có dấu L hoặc chữ 'Thấp', đặt "low". Nếu có chữ 'Bình thường' hoặc trong ngưỡng rõ ràng (hoặc là nhóm máu, Rh bình thường), đặt "normal". Nếu không chắc chắn, đặt "unknown".
4. "name": Phục hồi dấu tiếng Việt chuẩn và chính xác cho tên xét nghiệm (ví dụ: 'WBC' -> 'Số lượng bạch cầu (WBC)', 'RBC' -> 'Số lượng hồng cầu (RBC)', 'PLT' -> 'Số lượng tiểu cầu (PLT)', 'HGB' -> 'Huyết sắc tố (HGB)', 'HCT' -> 'Dung tích hồng cầu (HCT)', 'MCV' -> 'Thể tích trung bình hồng cầu (MCV)', 'MCH' -> 'Lượng huyết sắc tố trung bình hồng cầu (MCH)', 'MCHC' -> 'Nồng độ huyết sắc tố trung bình hồng cầu (MCHC)', 'RDW' -> 'Độ phân bố kích thước hồng cầu (RDW)', 'MPV' -> 'Thể tích trung bình tiểu cầu (MPV)', 'Glucose' -> 'Đường huyết (Glucose)', 'Albumin' -> 'Định lượng Albumin', 'Protein' -> 'Protein toàn phần', 'Nhóm máu' -> 'Nhóm máu hệ ABO', 'Rh' -> 'Yếu tố Rhesus (Rh)'). Tuyệt đối giữ đúng mã viết tắt gốc trong ngoặc đơn, không nhầm lẫn giữa HGB, MCH và MCHC.
5. "unit" và "reference_range": Nhận diện và sửa các lỗi OCR thường gặp:
   - Đơn vị: nếu OCR đọc nhầm '2/dL' -> 'g/dL', 'P8' -> 'pg', 'GN'/'&M'/'%B'/'%E' -> '%', 'IL'/'fi' -> 'fL'.
   - Khoảng tham chiếu: nếu OCR dính dấu chấm thành '11.5.14.5' -> sửa thành '11.5 - 14.5'; nếu '0.7' hoặc '(0.7)' -> sửa thành '0 - 7'.
6. Chỉ trả về JSON thuần túy, không có thẻ markdown ```json, không giải thích.
"""

EXTRACT_PRESCRIPTION_PROMPT = """Bạn là trợ lý trích xuất đơn thuốc y khoa chuyên nghiệp.
Dưới đây là văn bản OCR từ ảnh đơn thuốc (hoặc toa thuốc). Các dòng ngăn cách bằng dấu "|".

[VĂN BẢN OCR]:
{raw_text}

Nhiệm vụ: Trích xuất danh sách các loại thuốc điều trị và trả về DUY NHẤT một JSON hợp lệ theo định dạng sau:
{{
  "doc_type": "prescription",
  "facility_name": "tên bệnh viện hoặc cơ sở y tế",
  "issued_date": "ngày kê đơn nếu có",
  "lab_items": [],
  "medicine_items": [
    {{
      "name": "tên thuốc đầy đủ bao gồm hàm lượng và biệt dược trong ngoặc",
      "dosage": "liều lượng mỗi lần uống, vd: 1 viên, 2 viên, 1 gói",
      "dosage_form": "viên, gói, chai, ống",
      "times_per_day": 2,
      "times": ["morning", "afternoon"],
      "instructions": "hướng dẫn cách dùng cụ thể, vd: Ngày uống 2 lần, mỗi lần 1 viên, trước ăn sáng, chiều",
      "duration_days": 28
    }}
  ]
}}

QUY TẮC BẮT BUỘC ĐỂ TRÁNH LỖI NHẬN DIỆN:
1. "name": Phục hồi chính xác tên dược chất hoặc biệt dược gốc và hàm lượng (ví dụ: 'RABEPRAZOL 20mg (RABICAD)', 'BARUDON', 'MOSAPRID 5mg (UVOMO)', 'SYNNEUPEP', 'MEBEVERIN 135mg (MEBSYN)', 'BISCAN-G'). Hãy loại bỏ các số thứ tự đầu dòng như '1 .', '2 .'.
2. TUYỆT ĐỐI KHÔNG COI DÒNG HƯỚNG DẪN LÀ TÊN THUỐC:
   - Các dòng chữ ghi cách uống thuốc như: 'Ngày uống 2 lần, mỗi lần 1 viên...', 'Uống sau ăn 2 giờ...', 'Ngay0ong 2...', 'Cách dùng: Sáng 1 viên...' TUYỆT ĐỐI KHÔNG ĐƯỢC TẠO THÀNH THUỐC MỚI.
   - Đó là trường "instructions" của thuốc nằm ngay trước nó!
   - Không được sinh ra các thuốc có tên như 'Ngay0ong 2...', 'Ngày uống...', 'Cách dùng...'.
3. "dosage": Ghi số lượng mỗi lần uống, ví dụ: '1 viên', '2 viên', '1 gói'.
4. "dosage_form": Xác định đúng dạng bào chế dựa trên đơn: 'viên', 'gói', 'chai', 'lọ'.
5. "times": Nếu có 'sáng' thêm "morning", 'trưa' thêm "noon", 'chiều' thêm "afternoon", 'tối' thêm "evening".
6. "duration_days": Nếu đơn ghi rõ số ngày uống (ví dụ 'Toa: 20 ngày' -> 20), hoặc tính từ tổng số lượng chia liều mỗi ngày (ví dụ: 56 viên / 2 viên/ngày = 28 ngày).
7. Chỉ trả về JSON thuần túy, không có thẻ markdown ```json, không giải thích thêm.
"""


def sanitize_medicine_items(items: List[MedicineItemDraft]) -> List[MedicineItemDraft]:
    cleaned: List[MedicineItemDraft] = []
    instruction_keywords = [
        "ngày uống", "ngay uong", "ngayoong", "ngay0ong", "cách dùng", "cach dung",
        "mỗi lần", "moi lan", "sau ăn", "sau an", "trước ăn", "truoc an",
        "lời dặn", "loi dan", "tái khám", "tai kham", "chẩn đoán", "chan doan",
        "uống sáng", "uong sang", "uống chiều", "uong chieu", "uống tối", "uong toi"
    ]
    for it in items:
        name_str = (it.name or "").strip()
        name_lower = name_str.lower()

        # Check if name looks like an instruction line or prescription noise
        is_instruction = any(kw in name_lower for kw in instruction_keywords) or \
                         (re.search(r'\b(ngay\s*\d|uong\s*\d|vien|goi|chai|ong)\b', name_lower) is not None and len(name_lower) < 40 and not any(c.isupper() for c in name_str if len(name_str) > 5))

        if len(name_str) < 3 or name_lower in ("toa thuốc", "đơn thuốc", "bác sĩ", "chẩn đoán", "họ tên", "năm sinh"):
            continue

        if is_instruction:
            # Gộp vào instructions của thuốc trước đó nếu có
            if cleaned:
                prev = cleaned[-1]
                if not prev.instructions or prev.instructions == "Theo chỉ định":
                    prev.instructions = name_str
                else:
                    prev.instructions += f" • {name_str}"
            continue

        # Strip leading numbering like "1. ", "1 . ", "2/ "
        clean_name = re.sub(r'^\s*\d+[\s\.\,\-\/\)]+\s*', '', name_str).strip()
        if clean_name:
            it.name = clean_name

        cleaned.append(it)
    return cleaned


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
                "num_ctx": 4096,
                "num_predict": 3072,
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

        result = None
        # First attempt
        raw_output = self._call_ollama(prompt)
        try:
            parsed_json = json.loads(raw_output)
            # Ensure doc_type matches request if missing
            if "doc_type" not in parsed_json:
                parsed_json["doc_type"] = doc_type
            result = ExtractionResult.model_validate(parsed_json)
        except (json.JSONDecodeError, ValidationError) as first_err:
            logger.warning("First LLM extraction attempt failed schema validation: %s. Retrying...", first_err)

        if result is None:
            # Retry with correction prompt
            fix_prompt = f"""Chuỗi JSON sau đây bị lỗi cú pháp hoặc sai schema Pydantic:
{raw_output[:1500]}

Hãy sửa lại thành một JSON DUY NHẤT hoàn chỉnh, hợp lệ, không thừa thiếu dấu ngoặc, theo đúng format:
{{"doc_type": "{doc_type}", "facility_name": null, "issued_date": null, "lab_items": [...], "medicine_items": [...]}}
"""
            try:
                retry_output = self._call_ollama(fix_prompt)
                parsed_retry = json.loads(retry_output)
                result = ExtractionResult.model_validate(parsed_retry)
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
                    result = ExtractionResult(
                        doc_type=doc_type,
                        facility_name=candidate.get("facility_name"),
                        issued_date=candidate.get("issued_date"),
                        lab_items=safe_labs,
                        medicine_items=safe_meds,
                    )
                except Exception:
                    result = ExtractionResult(doc_type=doc_type)

        if result and result.medicine_items:
            result.medicine_items = sanitize_medicine_items(result.medicine_items)

        return result
