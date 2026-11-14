# KIẾN TRÚC HỆ THỐNG MEDIREAD AI PRODUCTION
**Bản đặc tả thiết kế kiến trúc kỹ thuật (Software Architecture Document)**  
*Phiên bản: 2.0.0 — Production Ready*

---

## 1. TỔNG QUAN HỆ THỐNG
MediRead AI là nền tảng y tế số hỗ trợ người cao tuổi và gia đình đọc hiểu, số hóa và theo dõi kết quả xét nghiệm sinh hóa, đơn thuốc thông qua pipeline OCR cục bộ (PaddleOCR), mô hình ngôn ngữ lớn Qwen 2.5 7B (qua Ollama), cơ sở tri thức y khoa RAG (ChromaDB / pgvector) và hệ thống lưu trữ phân tán bảo mật (Supabase).

```
                      +---------------------------------------+
                      |         Web Client (Next.js 15)       |
                      |   Design Tokens: #0B6B73 Teal / WCAG  |
                      +---------------------------------------+
                                          |
                                          | HTTPS + JWT Bearer
                                          v
                      +---------------------------------------+
                      |          Reverse Proxy (Nginx)        |
                      |   TLS Termination, 10M Body Limit     |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |       Backend API (FastAPI Async)     |
                      |   JWT Validation, RateLimit, Scopes   |
                      +---------------------------------------+
                                   |             |
           +-----------------------+             +-----------------------+
           | (Private Signed URL)                                        | (Enqueue Task)
           v                                                             v
+-------------------------+                                   +-------------------------+
| Supabase Storage (Priv) |                                   |  Async Worker Pipeline  |
| Bucket: 'documents'     |                                   |  - Image Sanitization   |
| Path: {user}/{doc}/...  |                                   |  - PII Masking (OpenCV) |
+-------------------------+                                   |  - PaddleOCR Engine     |
           ^                                                  |  - Qwen 2.5 Extraction  |
           |                                                  |  - Lab Normalizer & KB  |
           |                                                  |  - Safe RAG Explainer   |
           |                                                  +-------------------------+
           |                                                               |
           +-------------------------+-------------------------------------+
                                     |
                                     v
                      +---------------------------------------+
                      |     Supabase PostgreSQL & Vector      |
                      |    - RLS Policies on 10 Tables        |
                      |    - Multi-tenant Patient/Caregiver   |
                      |    - Complete Provenance Tracking     |
                      +---------------------------------------+
```

---

## 2. CÁC THÀNH PHẦN KIẾN TRÚC VÀ TRÁCH NHIỆM

### 2.1. Web Client (`apps/web`)
- **Công nghệ**: Next.js 15, React 19, TypeScript, TailwindCSS.
- **Bảng màu**: Kế thừa trực tiếp từ Figma Mobile App:
  - Deep Medical Teal (`#0B6B73`): Màu nhận diện thương hiệu y khoa chính.
  - Dark Navy Teal (`#073F46`): Tiêu đề, chữ nhấn mạnh và container tương phản cao.
  - Soft Mint (`#DDEEEB` / `#F2F8F7`): Nền thẻ, chip chọn lọc dịu mắt.
  - Slate Navy (`#14283A`) & Slate Gray (`#5B6B77`): Hệ màu chữ dễ đọc cho người lớn tuổi.
- **Tiêu chuẩn Trợ năng (Accessibility - WCAG AAA cho người già)**:
  - Vùng bấm tối thiểu $\ge 48\text{px}$ (`elderly-tap-target`).
  - Thanh công cụ điều chỉnh cỡ chữ nhanh $100\% - 115\% - 130\%$.
  - Trợ lý đọc giọng nói tiếng Việt tự nhiên tốc độ chậm $0.85\text{x}$ (`Web Speech Synthesis API`).

### 2.2. Backend API (`apps/api`)
- **Công nghệ**: FastAPI, Python 3.10, Pydantic v2, SlowAPI, PyJWT.
- **Trách nhiệm**:
  - Xác thực người dùng bằng Supabase Auth JWT chữ ký HS256 / Ed25519; trích xuất `user_id` từ claims (`sub`). Tuyệt đối không tin `user_id` do client gửi trong body hay URL.
  - Kiểm tra an ninh upload: MIME type thật, magic bytes, dimensions ảnh ($300\text{px} \le W,H \le 40\text{MP}$), dung lượng $\le 10\text{MB}$.
  - Giới hạn tần suất gọi API (Rate Limiting: 10 upload/phút, 100 request/phút) chống DoS.
  - Điều phối tác vụ xử lý nền (Background Tasks), không làm nghẽn HTTP request.

### 2.3. OCR & AI Worker Pipeline (`apps/worker`)
- **PaddleOCR Engine**: Khởi tạo trễ (Lazy init), cấu hình qua biến môi trường (`PADDLE_DET_DIR`, `PADDLE_REC_DIR`, `PADDLE_CLS_DIR`), thuật toán dò đường cong và góc nghiêng bảng kết quả.
- **PII Masking**: Tự động nhận diện và che vạch mã barcode, số định danh CCCD, tên bệnh nhân và chữ ký bác sĩ trước khi lưu trữ lâu dài.
- **LLM Extraction**: Qwen 2.5 7B chạy qua Ollama nội bộ với JSON mode và schema validation chặt chẽ bằng Pydantic. Có cơ chế tự động sửa JSON khi lỗi cú pháp.
- **Lab Normalizer**:
  - Chuẩn hóa số học Việt Nam (phân biệt dấu phẩy thập phân và dấu phẩy hàng nghìn).
  - Ưu tiên tuyệt đối khoảng tham chiếu in trên phiếu; tra cứu bảng nội bộ HMU khi phiếu bị mờ và gắn nguồn `internal_kb`.
  - Phân loại 4 cờ: `high`, `low`, `normal`, `unknown`. Tuyệt đối không biến thiếu dữ liệu thành bình thường (`normal`).
- **Safe RAG Explainer**:
  - Tra cứu ngữ cảnh y khoa từ ChromaDB vector store.
  - System prompt an toàn nghiêm ngặt: không chẩn đoán bệnh, không kê đơn, trả về từ chối an toàn khi tài liệu không đủ bằng chứng.

### 2.4. Supabase Database & Private Storage
- **Row Level Security (RLS)**: Bật trên 10 bảng dữ liệu; kiểm soát quan hệ bệnh nhân (`patient`) và người chăm sóc (`caregiver`).
- **Care Links RPCs**: Chỉ có người bệnh mới có quyền chấp thuận yêu cầu theo dõi từ người thân. Người gửi yêu cầu không thể tự duyệt.
- **Private Storage Bucket**: Tệp ảnh phiếu khám lưu trong bucket `documents` (private); chỉ cấp quyền đọc thông qua Signed URL có thời hạn cho đúng chủ sở hữu hoặc caregiver được ủy quyền.
