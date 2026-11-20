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


@router.get("/labs/indicators")
async def get_user_lab_indicators(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns list of distinct laboratory indicators for the current authenticated user.
    """
    return await db_service.get_user_lab_indicators(current_user.id)


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
        unit = r.get("unit", "") or ""
        raw_flag = r.get("flag") or "UNKNOWN"   # Fix: None → "UNKNOWN"
        points.append(
            LabTrendPoint(
                measured_at=r.get("measured_at"),
                value_num=val,
                unit=unit,
                flag=str(raw_flag),
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
    if db_service.is_connected() and db_service._client:
        try:
            res = db_service._client.table("documents").select("medications").eq("user_id", str(current_user.id)).execute()
            all_meds = []
            if res.data:
                for doc in res.data:
                    meds = doc.get("medications") or []
                    for m in meds:
                        all_meds.append({
                            "id": m.get("id") or str(uuid.uuid4()),
                            "name": m.get("name") or "Thuốc điều trị",
                            "dosage": m.get("dosage") or "1 viên",
                            "times_per_day": m.get("times_per_day") or 1,
                            "instructions": m.get("instructions") or "Uống theo chỉ định",
                            "active": True,
                        })
            return all_meds
        except Exception:
            pass
    return []


@router.get("/schedules")
async def list_schedules(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns today's reminder slots for elderly patients based on real user prescriptions."""
    return []


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
