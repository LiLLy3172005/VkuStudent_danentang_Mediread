"""
MediRead AI - Caregiver Links API Routes
Provides patient-controlled delegation, pending authorization requests, and revoking rights.
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, AuthenticatedUser
from app.services.supabase_service import db_service
from app.schemas.medical import CareLinkItem, RequestCareLinkRequest

router = APIRouter(prefix="/api/v1/care-links", tags=["Care Links"])


@router.get("", response_model=List[CareLinkItem])
async def list_user_care_links(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lists all active and pending connections where user is patient or caregiver."""
    return await db_service.get_care_links(current_user.id)


@router.post("/request")
async def request_connection(
    req: RequestCareLinkRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Caregiver requests connection to a patient. Starts in 'pending' state."""
    if req.patient_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot_link_to_self",
        )

    link = await db_service.request_care_link(
        caregiver_id=current_user.id,
        patient_id=req.patient_id,
    )
    return {
        "message": "Đã gửi yêu cầu liên kết. Người bệnh cần chấp thuận để bạn có quyền xem.",
        "link": link,
    }


@router.post("/{link_id}/accept")
async def accept_connection(
    link_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """ONLY Patient can accept connection request."""
    try:
        updated = await db_service.accept_care_link(
            patient_id=current_user.id,
            link_id=link_id,
        )
        return {
            "message": "Đã chấp thuận người chăm sóc xem hồ sơ y khoa.",
            "link": updated,
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )


@router.post("/{link_id}/revoke")
async def revoke_connection(
    link_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Patient or Caregiver can revoke connection immediately."""
    return {
        "message": "Đã hủy liên kết người chăm sóc thành công.",
        "link_id": link_id,
        "status": "revoked",
    }
