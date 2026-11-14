"""
MediRead AI - Authentication Routes
Provides login, session tokens, and current user profile endpoints.
"""

import uuid
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, AuthenticatedUser, create_access_token, DEMO_PATIENT_UUID, DEMO_CAREGIVER_UUID
from app.config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    phone: str = Field(..., min_length=6, max_length=20)
    role: str = Field("patient", pattern="^(patient|caregiver)$")
    name: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """
    Log in or register with phone number.
    Returns a cryptographically signed HS256 JWT compatible with Supabase Auth schema.
    """
    # Deterministic or mock user UUID based on role
    user_id = DEMO_CAREGIVER_UUID if req.role == "caregiver" else DEMO_PATIENT_UUID
    email = f"{req.phone.replace(' ', '')}@mediread.ai"

    token = create_access_token(
        user_id=user_id,
        email=email,
        role=req.role,
    )

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": str(user_id),
            "phone": req.phone,
            "role": req.role,
            "name": req.name or ("Người chăm sóc" if req.role == "caregiver" else "Bệnh nhân cao tuổi"),
            "email": email,
        },
    )


@router.get("/me")
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
    }
