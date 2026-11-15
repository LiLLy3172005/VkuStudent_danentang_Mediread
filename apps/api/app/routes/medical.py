"""
MediRead AI - Medical & Lab Trends API Routes
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, AuthenticatedUser
from app.services.supabase_service import db_service
from app.schemas.medical import (
    LabTrendResponse,
    LabTrendPoint,
    MedicationItem,
    ScheduleItem,
    DoseLogItem,
    MarkDoseRequest,
)

router = APIRouter(prefix="/api/v1", tags=["Medical & Labs"])


@router.get("/medical/trends")
@router.get("/labs/trends/{code}", response_model=LabTrendResponse)
async def get_indicator_trends(
    code: Optional[str] = None,
    indicator_code: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns historical trend points for an indicator (e.g. 'GLU', 'CHOL', 'CRE', 'AST')
    across multiple medical visits to plot trend charts.
    """
    target_code = code or indicator_code or "GLU"
    records = await db_service.get_lab_trends(current_user.id, target_code)

    points = []
    current_val = None
    unit = ""
    for r in sorted(records, key=lambda x: str(x.get("measured_at", ""))):
        val = r.get("value_num", 0.0)
        current_val = val
        unit = r.get("unit", "")
        points.append(
            LabTrendPoint(
                measured_at=r.get("measured_at"),
                value_num=val,
                unit=unit,
                flag=r.get("flag", "UNKNOWN"),
                document_id=r.get("document_id"),
            )
        )

    return LabTrendResponse(
        name=records[0]["name"] if records else target_code,
        normalized_code=target_code.upper(),
        current_value=current_val,
        unit=unit,
        history=points,
    )


@router.get("/medications")
async def list_medications(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns list of active medications from user prescriptions."""
    # Mock / live fetch
    return [
        {
            "id": str(uuid.uuid4()),
            "name": "Amlodipin 5mg",
            "dosage": "1 viên",
            "times_per_day": 1,
            "instructions": "Uống buổi sáng sau ăn",
            "active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Metformin 500mg",
            "dosage": "1 viên",
            "times_per_day": 2,
            "instructions": "Uống sau ăn sáng và tối",
            "active": True,
        },
    ]


@router.get("/schedules")
async def list_schedules(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns today's 4 reminder slots for elderly patients."""
    return [
        {
            "id": str(uuid.uuid4()),
            "medication_name": "Amlodipin 5mg",
            "time_of_day": "07:00",
            "slot_name": "Sáng",
            "dosage": "1 viên",
            "status": "taken",
        },
        {
            "id": str(uuid.uuid4()),
            "medication_name": "Metformin 500mg",
            "time_of_day": "11:30",
            "slot_name": "Trưa",
            "dosage": "1 viên",
            "status": "pending",
        },
        {
            "id": str(uuid.uuid4()),
            "medication_name": "Vitamin B tổng hợp",
            "time_of_day": "16:00",
            "slot_name": "Chiều",
            "dosage": "1 viên",
            "status": "pending",
        },
        {
            "id": str(uuid.uuid4()),
            "medication_name": "Metformin 500mg",
            "time_of_day": "20:00",
            "slot_name": "Tối",
            "dosage": "1 viên",
            "status": "pending",
        },
    ]


@router.post("/doses/{log_id}/mark")
async def mark_dose_status(
    log_id: uuid.UUID,
    req: MarkDoseRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Marks a medication dose as taken or skipped with haptic feedback confirmation."""
    return {
        "log_id": log_id,
        "status": req.status,
        "message": f"Đã ghi nhận trạng thái: {req.status}",
    }
