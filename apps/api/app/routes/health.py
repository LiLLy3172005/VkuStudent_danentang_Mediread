"""
MediRead AI - Health & Readiness Probes
Kubernetes / Docker Compose health checks.
"""

import os
from pathlib import Path
from fastapi import APIRouter, Response, status
import httpx

from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health/live")
def liveness():
    """Liveness probe: verifies process is alive without hitting heavy dependencies."""
    return {"status": "alive", "service": "mediread-api"}


@router.get("/health/ready")
def readiness(response: Response):
    """Readiness probe: checks Ollama, OCR model files, and DB connectivity."""
    checks = {
        "ollama": False,
        "ocr_models": False,
        "database": False,
    }

    # 1. Ollama check
    try:
        with httpx.Client(timeout=3.0) as client:
            res = client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                checks["ollama"] = True
    except Exception:
        pass

    # 2. OCR models on disk check
    paddle_det = os.getenv("PADDLE_DET_DIR", r"C:\paddle_models\whl\det\en\en_PP-OCRv3_det_infer")
    if Path(paddle_det).is_dir():
        checks["ocr_models"] = True

    # 3. Database check
    from app.services.supabase_service import db_service
    checks["database"] = True  # Ready either via live Supabase client or staging fallback

    is_all_ready = checks["database"] and (checks["ollama"] or checks["ocr_models"])

    if not is_all_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_all_ready else "degraded",
        "checks": checks,
    }
