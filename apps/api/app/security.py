"""
MediRead AI - API Security, Rate Limiting & Input Sanitization
Protects against DoS, path traversal, spoofed MIME types, and malicious payloads.
"""

import os
import uuid
import re
from pathlib import Path
from typing import Tuple
from fastapi import Request, HTTPException, status, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

# SlowAPI Limiter configured with client remote address
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])


def sanitize_filename(filename: str) -> str:
    """Removes path traversal characters and preserves only safe alphanumeric extension."""
    base = os.path.basename(filename)
    # Strip any directory traversal or dangerous characters
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    # Ensure safe extension
    ext = Path(clean).suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".heic"):
        ext = ".png"
    return f"{uuid.uuid4()}{ext}"


async def validate_upload_file(file: UploadFile) -> Tuple[bytes, str]:
    """
    Validates uploaded file against MIME allowlist, size constraints, and magic bytes.
    Returns (raw_bytes, safe_filename).
    """
    # 1. Content-Type header inspection
    content_type = (file.content_type or "").lower()
    if content_type not in settings.ALLOWED_IMAGE_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"unsupported_media_type: {content_type}. Allowed: {settings.ALLOWED_IMAGE_MIME}",
        )

    # 2. Read bytes and enforce size limit
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_file_uploaded")

    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"file_too_large: {len(data)} > {settings.MAX_UPLOAD_BYTES} bytes",
        )

    # 3. Magic bytes inspection via PIL
    try:
        from worker.security.image_validation import validate_image_bytes
        validate_image_bytes(data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"corrupt_or_unsupported_image: {str(exc)}",
        )

    safe_name = sanitize_filename(file.filename or "upload.png")
    return data, safe_name
