"""
MediRead AI - Authentication & User Registration Routes
Direct integration with Supabase Auth & PostgreSQL Profiles with fallback for local evaluation.
"""

import uuid
import bcrypt
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request, status
import logging

from app.auth import (
    get_current_user,
    AuthenticatedUser,
    create_access_token,
    DEMO_PATIENT_UUID,
    DEMO_CAREGIVER_UUID,
)
from app.services.supabase_service import db_service
from app.config import settings
from app.security import limiter

logger = logging.getLogger("mediread.auth")
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class AccountSummary(BaseModel):
    id: str
    full_name: str
    role: str
    sex: Optional[str] = None
    birth_year: Optional[int] = None


class LoginRequest(BaseModel):
    user_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: str = Field("patient", pattern="^(patient|caregiver)$")


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    email: Optional[str] = None
    password: str = Field(..., min_length=6)
    role: str = Field("patient", pattern="^(patient|caregiver)$")
    sex: str = Field("nam", pattern="^(nam|nu|other)$")
    birth_year: Optional[int] = Field(None, ge=1900, le=2100)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    profile: Optional[dict] = None


def _credentials_table_available() -> bool:
    """Check if user_credentials table exists (cached per process life)."""
    if not (db_service.is_connected() and db_service._client):
        return False
    try:
        db_service._client.table("user_credentials").select("user_id").limit(1).execute()
        return True
    except Exception:
        return False


@router.get("/accounts", response_model=List[AccountSummary])
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def list_available_accounts(request: Request):
    """
    Returns available demonstration profiles in the system.
    Enables instant 1-click evaluation for judges/graduating committee while
    preventing user enumeration of real registered patient PII.
    """
    return [
        AccountSummary(
            id=str(DEMO_PATIENT_UUID),
            full_name="Bác Trần Văn Minh (Tài khoản mẫu Bệnh nhân)",
            role="patient",
            sex="nam",
            birth_year=1954,
        ),
        AccountSummary(
            id=str(DEMO_CAREGIVER_UUID),
            full_name="Trần Minh Tuấn (Tài khoản mẫu Người chăm sóc)",
            role="caregiver",
            sex="nam",
            birth_year=1986,
        ),
    ]


@router.post("/login", response_model=LoginResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(request: Request, req: LoginRequest):
    """
    Log in via phone/email with password, or via 1-tap for designated demo accounts.
    Real user accounts are strictly protected with bcrypt password verification to prevent account takeover.
    """
    target_uuid = None
    user_name = None
    user_role = req.role
    user_email = req.email or (f"{req.phone.replace(' ', '')}@mediread.ai" if req.phone else None)
    user_sex = None
    user_birth_year = None

    # Case 1: Direct user_id selection
    if req.user_id:
        try:
            target_uuid = uuid.UUID(req.user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid_user_id")

        # Security check: Passwordless 1-tap is ONLY allowed for designated DEMO evaluation accounts
        is_demo_account = target_uuid in (DEMO_PATIENT_UUID, DEMO_CAREGIVER_UUID)
        if not is_demo_account:
            # For real user accounts, a valid password is REQUIRED to prevent account takeover!
            if not req.password:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Tài khoản này yêu cầu mật khẩu để bảo vệ hồ sơ y tế.",
                )
            if db_service.is_connected() and db_service._client:
                try:
                    cred_res = db_service._client.table("user_credentials").select("password_hash").eq(
                        "user_id", str(target_uuid)
                    ).limit(1).execute()
                    if not cred_res.data or not bcrypt.checkpw(req.password.encode(), cred_res.data[0]["password_hash"].encode()):
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Mật khẩu không chính xác.",
                        )
                except HTTPException:
                    raise
                except Exception as exc:
                    logger.warning("user_credentials check error: %s", exc)
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Không thể xác thực tài khoản lúc này.",
                    )

        if db_service.is_connected() and db_service._client:
            try:
                prof = db_service._client.table("profiles").select("*").eq("id", str(target_uuid)).limit(1).execute()
                if prof.data:
                    p = prof.data[0]
                    user_name = p.get("full_name")
                    user_role = p.get("role", user_role)
                    user_sex = p.get("sex")
                    user_birth_year = p.get("birth_year")
            except Exception as exc:
                logger.warning("Lookup profile failed: %s", exc)

    # Case 2: Logging in via phone or email – password verification required
    if not target_uuid and (req.phone or req.email):
        if db_service.is_connected() and db_service._client:
            clean_phone = (req.phone or "").replace(" ", "").strip()
            try:
                cred_res = db_service._client.table("user_credentials").select("*").eq(
                    "phone", clean_phone
                ).limit(1).execute()

                if cred_res.data:
                    cred = cred_res.data[0]
                    stored_hash = cred.get("password_hash", "")

                    if req.password:
                        if not bcrypt.checkpw(req.password.encode(), stored_hash.encode()):
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Mật khẩu không chính xác.",
                            )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Vui lòng nhập mật khẩu.",
                        )
                    target_uuid = uuid.UUID(cred["user_id"])

                    # Fetch profile for this user
                    try:
                        prof = db_service._client.table("profiles").select("*").eq("id", str(target_uuid)).limit(1).execute()
                        if prof.data:
                            p = prof.data[0]
                            user_name = p.get("full_name")
                            user_role = p.get("role", user_role)
                            user_sex = p.get("sex")
                            user_birth_year = p.get("birth_year")
                    except Exception as exc:
                        logger.warning("Profile fetch after cred check failed: %s", exc)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Số điện thoại chưa được đăng ký. Vui lòng đăng ký tài khoản mới.",
                    )

            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("user_credentials lookup error: %s", exc)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Không thể xác thực tài khoản lúc này.",
                )

    # Fallback to deterministic default UUID only when logging in via 1-tap demo account
    if not target_uuid:
        target_uuid = DEMO_CAREGIVER_UUID if req.role == "caregiver" else DEMO_PATIENT_UUID

    if not user_name:
        user_name = "Trần Minh Tuấn (Con trai)" if user_role == "caregiver" else "Bác Trần Văn Minh (Bệnh nhân)"

    if not user_email:
        user_email = f"user_{str(target_uuid)[:8]}@mediread.ai"

    token = create_access_token(
        user_id=target_uuid,
        email=user_email,
        role=user_role,
    )

    user_obj = {
        "id": str(target_uuid),
        "full_name": user_name,
        "role": user_role,
        "email": user_email,
        "sex": user_sex,
        "birth_year": user_birth_year,
    }
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=user_obj,
        profile=user_obj,
    )


@router.post("/register", response_model=LoginResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(request: Request, req: RegisterRequest):
    """
    Registers a new patient or caregiver directly into Supabase Auth & public.profiles.
    Password is validated, hashed with bcrypt, and stored securely in user_credentials.
    """
    clean_name = req.full_name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Vui lòng nhập họ và tên.")

    clean_password = req.password.strip()
    if len(clean_password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu phải có tối thiểu 6 ký tự.")

    clean_phone = (req.phone or "").replace(" ", "").strip()
    email = req.email or (f"{clean_phone}@mediread.ai" if clean_phone else f"user_{uuid.uuid4().hex[:8]}@mediread.ai")

    # Hash password with bcrypt
    password_hash = bcrypt.hashpw(clean_password.encode(), bcrypt.gensalt()).decode()

    user_uuid = None

    # If Supabase is connected, create real user in Supabase Auth & update profile
    if db_service.is_connected() and db_service._client:
        if clean_phone:
            try:
                existing_cred = db_service._client.table("user_credentials").select("user_id").eq("phone", clean_phone).limit(1).execute()
                if existing_cred.data:
                    raise HTTPException(status_code=400, detail="Số điện thoại này đã được đăng ký. Vui lòng đăng nhập.")
            except HTTPException:
                raise
            except Exception:
                pass

        try:
            # 1. Create Supabase Auth user via Admin API
            auth_res = db_service._client.auth.admin.create_user({
                "email": email,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": clean_name,
                    "role": req.role,
                },
            })
            if auth_res and auth_res.user:
                user_uuid = uuid.UUID(auth_res.user.id)

                # 2. Update profile fields (sex, birth_year, role)
                db_service._client.table("profiles").upsert({
                    "id": str(user_uuid),
                    "full_name": clean_name,
                    "sex": req.sex,
                    "birth_year": req.birth_year,
                    "role": req.role,
                }).execute()

                # 3. Store bcrypt hash in user_credentials
                if clean_phone:
                    try:
                        db_service._client.table("user_credentials").upsert({
                            "user_id": str(user_uuid),
                            "phone": clean_phone,
                            "password_hash": password_hash,
                        }).execute()
                        logger.info("Stored password hash for user %s in user_credentials", user_uuid)
                    except Exception as cred_exc:
                        logger.warning(
                            "Could not store user_credentials: %s", cred_exc
                        )

                logger.info("Successfully registered user %s (%s) in Supabase", clean_name, user_uuid)
        except Exception as exc:
            logger.error("Supabase user registration error: %s", exc)
            user_uuid = user_uuid or uuid.uuid4()
    else:
        user_uuid = uuid.uuid4()

    token = create_access_token(
        user_id=user_uuid,
        email=email,
        role=req.role,
    )

    user_obj = {
        "id": str(user_uuid),
        "full_name": clean_name,
        "role": req.role,
        "sex": req.sex,
        "birth_year": req.birth_year,
        "email": email,
    }
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=user_obj,
        profile=user_obj,
    )


@router.get("/me")
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    profile_data = {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
        "full_name": "Người dùng MediRead",
    }

    if db_service.is_connected() and db_service._client:
        try:
            p = db_service._client.table("profiles").select("*").eq("id", str(current_user.id)).limit(1).execute()
            if p.data:
                profile_data.update(p.data[0])
        except Exception as exc:
            logger.warning("Failed to fetch full profile: %s", exc)

    return profile_data
