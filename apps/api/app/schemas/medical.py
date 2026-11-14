"""
MediRead AI - Lab & Medication API Schemas
"""

import uuid
from datetime import date, datetime, time
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------- Lab Results & Trends

class LabResultItem(BaseModel):
    id: uuid.UUID
    document_id: Optional[uuid.UUID] = None
    name: str
    normalized_code: Optional[str] = None
    value_num: Optional[float] = None
    value_text: Optional[str] = None
    unit: Optional[str] = None
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None
    ref_text: Optional[str] = None
    flag: Literal["H", "L", "N", "UNKNOWN"] = "UNKNOWN"
    flag_note: Optional[str] = None
    measured_at: Optional[date] = None
    created_at: datetime


class LabTrendPoint(BaseModel):
    measured_at: date
    value_num: float
    unit: str
    flag: str
    document_id: uuid.UUID


class LabTrendResponse(BaseModel):
    name: str
    normalized_code: str
    current_value: Optional[float] = None
    unit: str
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None
    history: List[LabTrendPoint] = Field(default_factory=list)


# ---------------------------------------------------------------- Medications & Schedules

class MedicationItem(BaseModel):
    id: uuid.UUID
    document_id: Optional[uuid.UUID] = None
    name: str
    normalized_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    dose_amount: Optional[float] = None
    dose_unit: Optional[str] = None
    times_per_day: Optional[int] = None
    instructions: Optional[str] = None
    duration_days: Optional[int] = None
    active: bool = True
    created_at: datetime


class ScheduleItem(BaseModel):
    id: uuid.UUID
    medication_id: uuid.UUID
    medication_name: str
    time_of_day: str  # "07:00:00"
    days_of_week: List[int]
    enabled: bool = True


class DoseLogItem(BaseModel):
    id: uuid.UUID
    schedule_id: uuid.UUID
    medication_name: str
    dosage: Optional[str] = None
    scheduled_at: datetime
    status: Literal["pending", "taken", "skipped", "missed"]
    taken_at: Optional[datetime] = None
    note: Optional[str] = None


class MarkDoseRequest(BaseModel):
    status: Literal["taken", "skipped", "missed"]
    note: Optional[str] = None


# ---------------------------------------------------------------- Care Links

class CareLinkItem(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    patient_name: Optional[str] = None
    caregiver_id: uuid.UUID
    caregiver_name: Optional[str] = None
    status: Literal["pending", "accepted", "revoked"]
    created_at: datetime


class RequestCareLinkRequest(BaseModel):
    patient_id: uuid.UUID
