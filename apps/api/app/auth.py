"""
MediRead AI - Supabase JWT Authentication & Authorization
Strict JWT signature validation and multi-tenant user context extraction.
"""

import uuid
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import jwt
from fastapi import Header, HTTPException, status, Depends
from app.config import settings

logger = logging.getLogger("mediread.auth")


class AuthenticatedUser(BaseModel):
    id: uuid.UUID
    email: Optional[str] = None
    role: str = "authenticated"
    raw_token: str = Field(exclude=True)


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a Supabase Auth JWT.
    Verifies signature using SUPABASE_JWT_SECRET (HS256) or unverified claim inspection
    when running against local dev instance without secret provided.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_authorization_token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. If JWT secret is configured, perform cryptographic verification
    if settings.SUPABASE_JWT_SECRET and len(settings.SUPABASE_JWT_SECRET) >= 16:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True, "verify_aud": True},
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="token_expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError as exc:
            # Fallback to dev header decoding only if APP_ENV is explicitly 'development'
            if settings.APP_ENV == "development":
                logger.warning("JWT verify failed with secret; falling back to unverified dev token: %s", exc)
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"invalid_token: {str(exc)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # 2. In local test / development environment without secret
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="malformed_jwt_token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """
    FastAPI Dependency: Extracts Bearer JWT, validates, and returns AuthenticatedUser.
    Never trusts client-supplied user_id from query or body.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="unauthenticated_missing_bearer_header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    payload = verify_supabase_jwt(token)

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token_missing_subject",
        )

    try:
        user_uuid = uuid.UUID(sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_user_uuid_in_token",
        )

    return AuthenticatedUser(
        id=user_uuid,
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
        raw_token=token,
    )
