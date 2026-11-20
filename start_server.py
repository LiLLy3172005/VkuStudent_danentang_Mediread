"""
File khởi chạy server MediRead AI (Backend + Web App)
Chạy: python start_server.py
Hoặc: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import sys
import os
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
APPS_API_DIR = CURRENT_DIR / "apps" / "api"
APPS_WORKER_DIR = CURRENT_DIR / "apps" / "worker"

if str(APPS_API_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_API_DIR))
if str(APPS_WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_WORKER_DIR))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("   🏥 KHỞI ĐỘNG HỆ THỐNG MEDIREAD AI (PRODUCTION API + AI WORKER)")
    print("="*60)
    print(" -> Swagger API Docs tại:      http://localhost:8000/docs")
    print(" -> Health check tại:          http://localhost:8000/health")
    print(" -> Thư mục API chính:         apps/api")
    print("="*60 + "\n")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=str(APPS_API_DIR))
