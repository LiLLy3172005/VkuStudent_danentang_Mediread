"""
MediRead AI - Extraction Data Contracts (Pydantic v2)
Strict schema validation for LLM outputs.
"""

from typing import List, Optional, Literal, Union, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


class LabItemDraft(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=160, description="Tên chỉ số xét nghiệm")
    value: str = Field(default="", max_length=80, description="Giá trị đo được")
    unit: str = Field(default="", max_length=40, description="Đơn vị đo")
    reference_range: str = Field(default="", max_length=120, description="Khoảng tham chiếu in trên phiếu")
    flag: Literal["high", "low", "normal", "unknown"] = Field(
        default="unknown", description="Cờ cảnh báo ban đầu từ phiếu"
    )

    @field_validator("flag", mode="before")
    @classmethod
    def normalize_flag(cls, v: Any) -> str:
        if not v:
            return "unknown"
        s = str(v).strip().lower()
        if s in ("high", "cao", "h", "*", "tăng", "+", "dương tính", "pos"):
            return "high"
        if s in ("low", "thấp", "l", "giảm", "-", "âm tính", "neg"):
            return "low"
        if s in ("normal", "bình thường", "n", "norm"):
            return "normal"
        return "unknown"


class MedicineItemDraft(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=160, description="Tên thuốc")
    dosage: Optional[str] = Field(default="", max_length=80, description="Liều dùng, vd: 1 viên, 5mg")
    dosage_form: Optional[str] = Field(default="", max_length=50, description="Dạng bào chế: viên, gói, siro")
    times_per_day: Optional[int] = Field(default=None, ge=1, le=12, description="Số lần dùng trong ngày")
    times: List[str] = Field(default_factory=list, description="Buổi uống: morning, noon, afternoon, evening")
    instructions: Optional[str] = Field(default="", max_length=300, description="Hướng dẫn sử dụng: uống sau ăn")
    duration_days: Optional[int] = Field(default=None, ge=1, le=365, description="Số ngày uống")


class ExtractionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    doc_type: Literal["lab_report", "prescription"] = "lab_report"
    facility_name: Optional[str] = Field(default=None, max_length=200, description="Tên bệnh viện / phòng khám")
    issued_date: Optional[str] = Field(default=None, max_length=50, description="Ngày khám / ngày in phiếu")
    lab_items: List[LabItemDraft] = Field(default_factory=list, max_length=200)
    medicine_items: List[MedicineItemDraft] = Field(default_factory=list, max_length=100)
