"""
MediRead AI - API Configuration Service
Uses pydantic-settings to validate production environment variables.
"""

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(ROOT_DIR / ".env"),
            str(ROOT_DIR / ".env.local"),
            str(Path(__file__).resolve().parent.parent / ".env"),
            str(Path(__file__).resolve().parent.parent / ".env.local"),
            ".env",
            ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "production"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "your-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = "super-secret-jwt-key-min-32-chars-long"

    GEMINI_API_KEY: str = ""

    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"

    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_IMAGE_MIME: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
    ]

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://172.16.0.2:3000",
        "http://172.16.0.2:8000",
    ]
    # Regex matching all private LAN IPs (172.16-31.x.x, 192.168.x.x, 10.x.x.x), localhost, and tunnel/cloud domains (Vercel, Cloudflare, Ngrok, Netlify)
    CORS_ORIGIN_REGEX: str = (
        r"^https?://(localhost|127\.0\.0\.1|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|[a-zA-Z0-9-]+\.trycloudflare\.com|[a-zA-Z0-9-]+\.ngrok-free\.(app|dev)|[a-zA-Z0-9-]+\.vercel\.app|[a-zA-Z0-9-]+\.pages\.dev|[a-zA-Z0-9-]+\.netlify\.app|[a-zA-Z0-9-]+\.mediread\.ai)(:\d+)?$"
    )

    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_SCAN: str = "10/minute"
    RATE_LIMIT_AUTH: str = "20/minute"
    RATE_LIMIT_AI: str = "20/minute"


settings = Settings()
