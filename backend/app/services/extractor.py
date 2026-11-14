import os
import json
import re
import time
from typing import Tuple, List, Dict, Any
from pathlib import Path

# Các khóa API mặc định từ cấu hình đồ án
DEFAULT_API_KEYS = []

# Ưu tiên lấy từ biến môi trường nếu có
ENV_KEY = os.getenv("GEMINI_API_KEY")
ACTIVE_KEYS = [ENV_KEY] if ENV_KEY else list(DEFAULT_API_KEYS)
current_key_idx = 0

PROMPT_EXTRACTION = """Bạn là trợ lý AI chuyên số hóa hồ sơ y tế (đơn thuốc hoặc phiếu xét nghiệm).
Từ thông tin văn bản OCR dưới đây, hãy trích xuất toàn bộ các thuốc hoặc chỉ số xét nghiệm vào một đối tượng JSON duy nhất có dạng:
{{
  "items": [
    {{
      "kind": "medicine" hoặc "lab",
      "name": "Tên thuốc hoặc tên chỉ số xét nghiệm",
      "dosage": "Liều dùng (vd: 5mg, 500mg, 1 viên) hoặc null",
      "frequency": "Tần suất (vd: 1 viên/lần, 2 lần/ngày) hoặc null",
      "times": ["morning", "noon", "afternoon", "evening"] (chọn các cữ uống phù hợp nếu là thuốc, còn xét nghiệm thì rỗng []),
      "value": 0.0 (giá trị số đo được nếu là xét nghiệm, null nếu là thuốc),
      "unit": "đơn vị đo (vd: mmol/L, mg/dL, g/L) hoặc null",
      "reference_range": "khoảng tham chiếu bình thường (vd: 3.9 - 6.4) hoặc null",
      "flag": "low" hoặc "normal" hoặc "high" (nếu là xét nghiệm và vượt ngưỡng, null nếu bình thường hoặc là thuốc)
    }}
  ]
}}

Lưu ý:
- Nếu loại tài liệu là 'prescription', kind bắt buộc là 'medicine'.
- Nếu loại tài liệu là 'lab_result', kind bắt buộc là 'lab'.
- Chỉ trả về JSON thuần túy, tuyệt đối không thêm markdown hay giải thích ngoài lề.

Loại tài liệu: {doc_type}
Văn bản OCR:
{ocr_text}
"""

def _clean_json_str(text: str) -> str:
    s = text.strip()
    if s.startswith("```json"):
        s = s[7:]
    elif s.startswith("```"):
        s = s[3:]
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()

def _fallback_parse_prescription(ocr_text: str) -> List[Dict[str, Any]]:
    """Phân tích dự phòng bằng quy tắc khi không có mạng hoặc lỗi LLM"""
    items = []
    lines = [l.strip() for l in ocr_text.splitlines() if l.strip()]
    for line in lines:
        # Nhận diện dòng có định dạng thuốc, số viên, liều lượng
        if re.search(r"\b(\d+\s*mg|\d+\s*g|\d+\s*ml|viên|viên/lần|sáng|chiều|tối)\b", line, re.I):
            name_match = re.match(r"^(\d+[\.\)]\s*)?([a-zA-ZÀ-ỹ0-9\s\-]+?)(?:\s+\d+\s*(?:mg|g|ml)|\s*x|\s*:)", line, re.I)
            name = name_match.group(2).strip() if name_match else line[:25].strip()
            
            times = []
            low_line = line.lower()
            if "sáng" in low_line: times.append("morning")
            if "trưa" in low_line: times.append("noon")
            if "chiều" in low_line: times.append("afternoon")
            if "tối" in low_line: times.append("evening")
            if not times: times = ["morning"]

            dosage_match = re.search(r"(\d+\s*(?:mg|g|ml))", line, re.I)
            dosage = dosage_match.group(1) if dosage_match else "1 viên"

            items.append({
                "kind": "medicine",
                "name": name,
                "dosage": dosage,
                "frequency": "Theo chỉ định bác sĩ",
                "times": times,
                "value": None,
                "unit": None,
                "reference_range": None,
                "flag": None
            })
    return items

def _fallback_parse_lab(ocr_text: str) -> List[Dict[str, Any]]:
    """Phân tích dự phòng cho phiếu xét nghiệm"""
    items = []
    lines = [l.strip() for l in ocr_text.splitlines() if l.strip()]
    for line in lines:
        # Tìm các dòng có số và đơn vị xét nghiệm
        num_match = re.search(r"([0-9]+[\.,]?[0-9]*)\s*(mmol/L|mg/dL|g/L|µmol/L|U/L|%|g/dL|x10\^9/L)", line, re.I)
        if num_match:
            val_str = num_match.group(1).replace(",", ".")
            unit = num_match.group(2)
            name = line[:num_match.start()].strip(" :-\t")
            if len(name) > 2:
                items.append({
                    "kind": "lab",
                    "name": name,
                    "value": float(val_str) if val_str.replace('.', '', 1).isdigit() else None,
                    "unit": unit,
                    "reference_range": "3.9 - 6.4",
                    "flag": "normal",
                    "times": []
                })
    return items

def extract(doc_type: str, ocr_text: str) -> Tuple[List[Dict[str, Any]], bool]:
    """
    Trích xuất danh sách thực thể y khoa từ văn bản OCR.
    Trả về: (items, low_confidence)
    """
    if not ocr_text or len(ocr_text.strip()) < 10:
        return [], True

    global current_key_idx
    prompt = PROMPT_EXTRACTION.format(doc_type=doc_type, ocr_text=ocr_text)

    # Thử gọi Google GenAI với xoay vòng key
    for attempt in range(len(ACTIVE_KEYS)):
        api_key = ACTIVE_KEYS[current_key_idx]
        try:
            # Thử thư viện google.genai mới
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=api_key)
                resp = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1
                    )
                )
                text = resp.text
            except Exception:
                # Fallback sang google.generativeai cũ
                import google.generativeai as gai
                gai.configure(api_key=api_key)
                model = gai.GenerativeModel("gemini-1.5-flash")
                resp = model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                text = resp.text

            clean_json = _clean_json_str(text)
            data = json.loads(clean_json)
            items = data.get("items", [])
            if items:
                return items, False
        except Exception as e:
            # Xoay vòng sang key tiếp theo khi gặp rate limit hoặc lỗi
            current_key_idx = (current_key_idx + 1) % len(ACTIVE_KEYS)
            continue

    # Fallback nội bộ nếu không gọi được API
    fallback_items = _fallback_parse_prescription(ocr_text) if doc_type == "prescription" else _fallback_parse_lab(ocr_text)
    if fallback_items:
        return fallback_items, False

    return [], True
