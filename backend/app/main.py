import os
import uuid
import shutil
import pytesseract
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.schemas import (
    ScanRequest, ScanResponse, ExplainRequest, Explanation, 
    Item, Source, RagModeRequest
)
from app.services import extractor, rag_service, anonymizer
from app import db

# Thiết lập đường dẫn Tesseract
TESSERACT_EXE = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
if os.path.exists(TESSERACT_EXE):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="MediRead AI API",
    description="Hệ thống đọc hiểu đơn thuốc và phiếu xét nghiệm y khoa cho người cao tuổi (RAG - Backend - Web App)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phục vụ thư mục ảnh upload và tài nguyên tĩnh
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

def current_user(authorization: Optional[str] = Header(None)) -> str:
    """Xác thực token người dùng. Nếu chưa truyền header thì dùng tài khoản demo."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        # Sau này có thể tích hợp supabase.auth.get_user(token)
        return "user_" + token[:8]
    return "demo-user-elderly"

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "MediRead AI",
        "rag_mode": "mock" if rag_service.get_use_mock() else "real_rag",
        "version": "1.0.0"
    }

@app.post("/api/v1/scan", response_model=ScanResponse)
def scan(req: ScanRequest, user: str = Depends(current_user)):
    """
    Endpoint chuẩn theo hợp đồng API:
    1. Trích xuất JSON từ văn bản OCR (Gemini LLM)
    2. Với mỗi thuốc hoặc chỉ số, gọi hàm explain() của module RAG
    3. Lưu kết quả vào cơ sở dữ liệu và trả về cho client
    """
    raw_items, low_conf = extractor.extract(req.doc_type, req.ocr_text)
    items: List[Item] = []
    
    # Giờ nhắc mặc định theo buổi
    default_times = {
        "morning": "07:00",
        "noon": "11:30",
        "afternoon": "16:00",
        "evening": "20:00"
    }

    schedules_to_save = []
    scan_id = str(uuid.uuid4())

    for it in raw_items:
        item = Item(**it)
        # Điểm nối RAG duy nhất: Gọi giải thích y khoa
        explanation_dict = rag_service.explain(item.name)
        item.explanation = Explanation(**explanation_dict)
        items.append(item)

        # Nếu là thuốc, chuẩn bị lịch nhắc uống thuốc
        if item.kind == "medicine" and item.times:
            for t in item.times:
                schedules_to_save.append({
                    "id": str(uuid.uuid4()),
                    "medicine_name": item.name,
                    "dosage": item.dosage or "1 viên",
                    "time_slot": t,
                    "remind_at": default_times.get(t, "07:00"),
                    "active": True
                })

    # Lưu vào database
    scan_result_dict = {
        "scan_id": scan_id,
        "doc_type": req.doc_type,
        "items": [it.model_dump() for it in items],
        "low_confidence": low_conf
    }
    db.save_scan(scan_id, user, req.doc_type, req.ocr_text, scan_result_dict, low_conf, req.image_path or "")
    if schedules_to_save:
        db.save_schedules(user, scan_id, schedules_to_save)

    return ScanResponse(
        scan_id=scan_id,
        doc_type=req.doc_type,
        items=items,
        low_confidence=low_conf,
        disclaimer="Thông tin chỉ mang tính tham khảo y khoa, không thay thế chẩn đoán hoặc chỉ định của bác sĩ."
    )

@app.post("/api/v1/explain", response_model=Explanation)
def explain(req: ExplainRequest, user: str = Depends(current_user)):
    """Tra cứu trực tiếp một thuốc hoặc chỉ số xét nghiệm qua RAG"""
    res = rag_service.explain(req.query)
    return Explanation(**res)

@app.get("/api/v1/scans")
def list_scans(user: str = Depends(current_user)):
    """Lấy danh sách các lần quét trước đó của người dùng"""
    return db.get_scans(user)

@app.get("/api/v1/scans/{scan_id}")
def get_scan(scan_id: str, user: str = Depends(current_user)):
    """Xem chi tiết một lần quét cụ thể"""
    scan_data = db.get_scan_by_id(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản quét")
    return scan_data

@app.get("/api/v1/schedules")
def get_schedules(user: str = Depends(current_user)):
    """Lấy danh sách lịch nhắc uống thuốc đang kích hoạt"""
    return db.get_schedules(user)

@app.post("/api/v1/schedules/{schedule_id}/toggle")
def toggle_schedule(schedule_id: str, status: str = Form("taken"), user: str = Depends(current_user)):
    """Ghi nhận nhật ký đã uống hoặc chưa uống thuốc"""
    from datetime import date
    today_str = date.today().isoformat()
    db.toggle_schedule_log(schedule_id, user, today_str, status)
    return {"status": "success", "schedule_id": schedule_id, "today": today_str, "log_status": status}

@app.get("/api/v1/rag-status")
def get_rag_status():
    """Xem trạng thái RAG hiện tại (Mock hay Real)"""
    return {
        "use_mock": rag_service.get_use_mock(),
        "mode_text": "Bản Giả Lập (Mock)" if rag_service.get_use_mock() else "RAG Thật (ChromaDB + Gemini)"
    }

@app.post("/api/v1/rag-mode")
def set_rag_mode(req: RagModeRequest):
    """Chuyển đổi linh hoạt giữa RAG giả lập và RAG thật"""
    rag_service.set_use_mock(req.use_mock)
    return {
        "status": "success",
        "use_mock": rag_service.get_use_mock(),
        "mode_text": "Bản Giả Lập (Mock)" if rag_service.get_use_mock() else "RAG Thật (ChromaDB + Gemini)"
    }

@app.post("/api/v1/upload-and-scan", response_model=ScanResponse)
async def upload_and_scan(
    doc_type: str = Form("prescription"),
    file: UploadFile = File(...),
    mask_pii: bool = Form(True),
    user: str = Depends(current_user)
):
    """
    Tiện ích cho Web App:
    Tải ảnh trực tiếp -> Tự động che PII (nếu bật) -> OCR -> Trích xuất -> RAG giải thích
    """
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    raw_filename = f"raw_{uuid.uuid4().hex[:8]}{ext}"
    raw_filepath = UPLOADS_DIR / raw_filename

    with open(raw_filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    anonymized_url = None
    target_path_for_ocr = str(raw_filepath)

    if mask_pii:
        anon_filename = f"anon_{uuid.uuid4().hex[:8]}{ext}"
        anon_filepath = UPLOADS_DIR / anon_filename
        success = anonymizer.anonymize_and_save(str(raw_filepath), str(anon_filepath))
        if success:
            target_path_for_ocr = str(anon_filepath)
            anonymized_url = f"/uploads/{anon_filename}"

    # Thực hiện OCR tiếng Việt + Tiếng Anh bằng Tesseract (ưu tiên vie để giữ dấu)
    ocr_text = ""
    try:
        from PIL import Image
        import numpy as np
        img = Image.open(target_path_for_ocr)

        # Tiền xử lý ảnh: scale 2x + grayscale để cải thiện độ chính xác OCR
        orig_w, orig_h = img.size
        if max(orig_w, orig_h) < 2000:
            scale = 2000 / max(orig_w, orig_h)
            img = img.resize((int(orig_w * scale), int(orig_h * scale)), Image.LANCZOS)
        if img.mode not in ("L", "RGB"):
            img = img.convert("RGB")

        # Tesseract config tối ưu cho phiếu y tế: OEM 1 (LSTM), PSM 6 (block text)
        TESS_CFG = "--oem 1 --psm 6 -c preserve_interword_spaces=1"

        try:
            # Ưu tiên: vie+eng để giữ toàn bộ dấu tiếng Việt
            ocr_text = pytesseract.image_to_string(img, lang="vie+eng", config=TESS_CFG)
        except Exception:
            try:
                ocr_text = pytesseract.image_to_string(img, lang="vie", config=TESS_CFG)
            except Exception:
                ocr_text = pytesseract.image_to_string(img, lang="eng", config="--psm 6")

        # Hậu xử lý: chuẩn hoá ký tự Unicode NFC (vd: ươ → ươ)
        import unicodedata
        ocr_text = unicodedata.normalize("NFC", ocr_text)

    except Exception as e:
        print(f"[OCR Error] {e}", flush=True)
        ocr_text = ""

    # Nếu OCR ra quá ít chữ, ta vẫn gửi đường dẫn ảnh
    req = ScanRequest(
        doc_type=doc_type,
        ocr_text=ocr_text if len(ocr_text.strip()) > 10 else f"Ảnh tải lên: {file.filename}. Không nhận dạng được chữ rõ ràng.",
        image_path=anonymized_url or f"/uploads/{raw_filename}"
    )

    resp = scan(req, user)
    resp.anonymized_image_url = anonymized_url
    return resp

# Định tuyến trang chủ Web App
@app.get("/")
def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "MediRead AI API Backend is running. Please access /docs for API documentation."}
