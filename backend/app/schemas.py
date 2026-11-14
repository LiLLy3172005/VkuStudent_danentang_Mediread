from typing import Literal, Optional, List
from pydantic import BaseModel, Field

# -------------------------------------------------------------
# 1. HỢP ĐỒNG API CỐ ĐỊNH THEO TÀI LIỆU MEDIREAD AI
# -------------------------------------------------------------

class Source(BaseModel):
    title: str
    chunk: str

class Explanation(BaseModel):
    answer: str
    sources: List[Source] = []
    grounded: bool = True

class Item(BaseModel):
    kind: Literal["medicine", "lab"]
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    times: List[Literal["morning", "noon", "afternoon", "evening"]] = []
    value: Optional[float] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: Optional[Literal["low", "normal", "high"]] = None
    explanation: Optional[Explanation] = None

class ScanRequest(BaseModel):
    doc_type: Literal["prescription", "lab_result"]
    ocr_text: str
    image_path: Optional[str] = None

class ScanResponse(BaseModel):
    scan_id: str
    doc_type: str
    items: List[Item]
    low_confidence: bool = False
    disclaimer: str = "Thông tin chỉ mang tính tham khảo y khoa, không thay thế chẩn đoán hoặc chỉ định của bác sĩ."
    anonymized_image_url: Optional[str] = None

class ExplainRequest(BaseModel):
    query: str
    doc_type: Optional[Literal["medicine", "lab"]] = "medicine"

class MedicationScheduleItem(BaseModel):
    id: str
    medicine_name: str
    dosage: Optional[str] = None
    time_slot: Literal["morning", "noon", "afternoon", "evening"]
    remind_at: str  # "07:00", "11:30", "16:00", "20:00"
    active: bool = True
    taken_today: bool = False

class RagModeRequest(BaseModel):
    use_mock: bool
