"""
MediRead AI - Document API Schemas
Pydantic contracts for document upload, processing status, and user confirmation.
"""

import uuid
from datetime import datetime, date
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class DocumentSummary(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    doc_type: Literal["prescription", "lab_report"]
    status: Literal["uploaded", "processing", "needs_review", "confirmed", "rejected"]
    facility_name: Optional[str] = None
    issued_date: Optional[date] = None
    ocr_confidence: Optional[float] = None
    is_pii_masked: bool = True
    created_at: datetime


class DocumentUploadResponse(BaseModel):
    document_id: uuid.UUID
    storage_path: str
    status: str = "uploaded"
    message: str = "Tải lên thành công, đã xếp hàng xử lý."


class ExtractionConfirmRequest(BaseModel):
    confirmed_data: Any = Field(default_factory=dict, description="Dữ liệu do người dùng chỉnh sửa hoặc xác nhận")
    notes: Optional[str] = None


class DocumentDetailResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    doc_type: str
    status: str
    storage_path: str
    signed_image_url: Optional[str] = None
    is_pii_masked: bool
    facility_name: Optional[str] = None
    issued_date: Optional[date] = None
    ocr_engine: Optional[str] = "paddleocr_local"
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    quality_flags: Dict[str, Any] = Field(default_factory=dict)
    lab_results: List[Dict[str, Any]] = Field(default_factory=list)
    medications: List[Dict[str, Any]] = Field(default_factory=list)
    explanations: List[Dict[str, Any]] = Field(default_factory=list)
    is_confirmed: bool = False
    created_at: datetime
    updated_at: datetime
