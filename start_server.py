"""
File khởi chạy server MediRead AI (Backend + Web App)
Chạy: python start_server.py
Hoặc: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import sys
import os
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR / "backend"

if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("   🏥 KHỞI ĐỘNG HỆ THỐNG MEDIREAD AI (RAG - BACKEND - WEB APP)")
    print("="*60)
    print(" -> Web App đang mở tại:       http://localhost:8000")
    print(" -> Tài liệu API Swagger tại:  http://localhost:8000/docs")
    print(" -> Hợp đồng RAG:              backend/app/services/rag_service.py")
    print("="*60 + "\n")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=str(BACKEND_DIR))
