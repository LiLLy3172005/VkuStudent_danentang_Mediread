"""
MediRead AI - Production FastAPI Application
Senior Architecture: Modular, Async, Decoupled Worker, Rate-Limited, Secure.
"""
import torch 
import sys
import time
import uuid
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

# Ensure sibling package apps/worker is importable
_WORKER_PATH = Path(__file__).resolve().parents[2] / "worker"
if _WORKER_PATH.is_dir() and str(_WORKER_PATH) not in sys.path:
    sys.path.insert(0, str(_WORKER_PATH))

from app.config import settings
from app.security import limiter
from app.routes import auth, documents, medical, care_links, health, ai

# Structured Logging Configuration
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("mediread.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: checks dependencies at startup, clears on shutdown."""
    logger.info("Starting MediRead AI Production API on %s:%s...", settings.APP_HOST, settings.APP_PORT)
    
    # Warmup models in background so first user request doesn't wait for cold weights loading
    import threading
    def _warmup():
        try:
            from worker.ocr.engine import OcrEngine
            from worker.rag.rag_explainer import RagExplainer
            ocr = OcrEngine.create_default()
            ocr._init_model()
            rag = RagExplainer()
            rag._init_vector_db()
            logger.info("MediRead AI Models (PaddleOCR & ChromaDB RAG) successfully warmed up in memory.")
        except Exception as e:
            logger.warning("Model warmup warning: %s", e)

    threading.Thread(target=_warmup, daemon=True).start()
    yield
    logger.info("Shutting down MediRead AI API...")


app = FastAPI(
    title="MediRead AI Production API",
    description="Hệ thống số hóa phiếu xét nghiệm & đơn thuốc y khoa cho người cao tuổi",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_ENV != "production_hardened" else None,
    redoc_url=None,
)

# 1. Attach SlowAPI Rate Limiter State
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "rate_limit_exceeded",
            "message": "Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ một chút rồi thử lại.",
        },
    )


# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3. Security Headers and Request ID Middleware
@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()

    response = await call_next(request)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(duration_ms)

    # Security Headers (HIPAA / OWASP compliant)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"

    # Redacted log without PII
    logger.info(
        "%s %s -> %s (%sms) [req_id=%s]",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        request_id,
    )

    return response


# 4. Include Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(medical.router)
app.include_router(care_links.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {
        "service": "MediRead AI Production API",
        "version": "2.0.0",
        "health": "/health/ready",
        "status": "operational",
    }
