# MediRead AI — Hệ Thống Đọc Hiểu Y Khoa Cho Người Cao Tuổi

Dự án đồ án kết hợp **RAG (Retrieval-Augmented Generation)**, **Backend FastAPI**, và **Giao diện Web App chuyên dụng**.

---

## 1. Cấu Trúc Thư Mục Monorepo

```
mediread/
├── rag/                                # [Nhánh A] RAG Y Khoa
│   ├── ingest.py                       # Chunk văn bản, nhúng vector và lưu vào ChromaDB
│   ├── retriever.py                    # Tìm kiếm top-k đoạn văn bản y khoa
│   ├── pipeline.py                     # Hàm duy nhất explain(query) -> {answer, sources, grounded}
│   ├── data/                           # Tài liệu y khoa sạch (.txt)
│   └── chroma_db/                      # Thư mục vector store
│
├── backend/                            # [Nhánh B] Backend FastAPI & Services
│   ├── app/
│   │   ├── main.py                     # Định tuyến API (/scan, /explain, /schedules, v.v.)
│   │   ├── schemas.py                  # Pydantic Schema - Hợp đồng API chuẩn cố định
│   │   ├── db.py                       # Cơ sở dữ liệu SQLite & bảng tương thích Supabase
│   │   └── services/
│   │       ├── extractor.py            # Trích xuất JSON từ OCR bằng Gemini LLM
│   │       ├── rag_service.py          # [ĐIỂM NỐI RAG] USE_MOCK (Giả lập -> Thật)
│   │       └── anonymizer.py           # Tự động che thông tin cá nhân (PII) & Barcode
│   ├── static/
│   │   └── index.html                  # [Nhánh C] Giao diện Web App tương tác hoàn chỉnh
│   ├── uploads/                        # Lưu trữ ảnh tải lên và ảnh đã che PII
│   └── data/                           # File SQLite mediread.sqlite3
│
├── start_server.py                     # Script chạy server 1 lệnh
├── run.bat                             # File click đúp chạy nhanh trên Windows
├── requirements.txt                    # Thư viện phụ thuộc
└── .env                                # Khóa API và cấu hình môi trường
```

---

## 2. Điểm Chừa Sẵn Cho Nhánh RAG (Hợp Đồng API Chuẩn)

Hệ thống kết nối với nhánh RAG qua **đúng một hàm duy nhất** tại `backend/app/services/rag_service.py`:

```python
USE_MOCK = True  # Đổi sang False khi bạn muốn kích hoạt RAG thật

def explain(query: str) -> dict:
    if USE_MOCK:
        # Trả về dữ liệu mẫu có cấu trúc theo đúng hợp đồng API
        return {
            "answer": "...",
            "sources": [{"title": "...", "chunk": "..."}],
            "grounded": True
        }
    from rag.pipeline import explain as real_explain
    return real_explain(query)
```

### Cách thức hoạt động:
1. **Giai đoạn hiện tại (Đang phát triển RAG)**: `USE_MOCK = True`.
   - Toàn bộ Backend và Web App chạy mượt mà 100% với dữ liệu mẫu (Amlodipin, Metformin, Paracetamol, Glucose, Creatinin, Cholesterol...).
   - Bạn có thể demo quét ảnh, trích xuất thực thể, đọc to bằng giọng nói TTS, tạo lịch uống thuốc ngay lập tức.
2. **Khi RAG của bạn sẵn sàng**:
   - Bạn chỉ cần đặt file code vào `rag/pipeline.py` (hoặc giữ nguyên file mẫu đã tạo sẵn liên kết tới `chroma_db`).
   - Đổi `USE_MOCK = False` trong `rag_service.py` hoặc chuyển đổi trực tiếp ngay trên nút gạt ở góc phải màn hình Web App!

---

## 3. Các Tính Năng Nổi Bật Trong Web App

- **Giao diện tiếp cận người cao tuổi**: Cỡ chữ lớn (20-28px), độ tương phản cao, thẻ bo tròn mềm mại, nút bấm to >= 56px.
- **Trợ lý Giọng nói (Text-To-Speech)**: Đọc to kết quả đơn thuốc và lịch uống bằng giọng tiếng Việt tự nhiên với tốc độ chậm (0.8x).
- **Bảo mật PII tự động**: Sử dụng OpenCV, PyZbar và Pytesseract để che thông tin hành chính nhạy cảm (Tên, Năm sinh, CCCD, Mã bệnh nhân, Barcode) trước khi OCR.
- **Tự động tạo lịch nhắc thuốc**: Phân chia thuốc vào 4 khung giờ: Sáng (07:00), Trưa (11:30), Chiều (16:00), Tối (20:00) kèm nút đánh dấu "Đã uống".
- **Phòng thử nghiệm RAG (RAG Playground)**: Cho phép nhập câu hỏi bất kỳ, kiểm tra câu trả lời, nguồn tài liệu và cờ kiểm chứng `grounded`.

---

## 4. Cách Khởi Động Web App

Mở terminal tại thư mục dự án và chạy:

```bash
python start_server.py
```

Sau đó mở trình duyệt truy cập:
- **Web App**: [http://localhost:8000](http://localhost:8000)
- **Tài liệu Swagger API**: [http://localhost:8000/docs](http://localhost:8000/docs)
