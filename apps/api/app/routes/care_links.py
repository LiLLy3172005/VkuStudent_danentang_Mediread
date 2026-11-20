"""
MediRead AI - Caregiver Links API Routes
Provides patient-controlled delegation, pending authorization requests, and revoking rights.
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request

from app.auth import get_current_user, AuthenticatedUser
from app.services.supabase_service import db_service
from app.schemas.medical import CareLinkItem, RequestCareLinkRequest, ConnectCodeRequest
from app.security import limiter
from app.config import settings

router = APIRouter(prefix="/api/v1/care-links", tags=["Care Links"])


@router.get("", response_model=List[CareLinkItem])
async def list_user_care_links(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lists all active and pending connections where user is patient or caregiver."""
    return await db_service.get_care_links(current_user.id)


@router.post("/connect-code")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def connect_by_code_or_qr(
    request: Request,
    req: ConnectCodeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Caregiver or family member connects to patient by entering code or scanning QR code."""
    try:
        result = await db_service.connect_care_link_by_code(
            caregiver_id=current_user.id,
            code_str=req.code,
        )
        patient_name = result["patient"].get("full_name", "Người thân")
        return {
            "message": f"Đã kết nối thành công với hồ sơ của {patient_name}!",
            "link": result["link"],
            "patient": result["patient"],
        }
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )


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
    """Patient or Caregiver can revoke connection immediately, strictly cutting off access."""
    try:
        revoked = await db_service.revoke_care_link(current_user.id, link_id)
        return {
            "message": "Đã hủy liên kết thành công.",
            "link_id": link_id,
            "status": "revoked",
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )


@router.delete("/{link_id}")
async def delete_connection(
    link_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Patient or Caregiver can permanently delete the care link."""
    try:
        result = await db_service.delete_care_link(current_user.id, link_id)
        return {
            "message": "Đã xóa liên kết người thân thành công.",
            "link_id": link_id,
            "deleted": True,
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
