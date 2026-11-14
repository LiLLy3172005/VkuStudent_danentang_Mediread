# THÔNG TIN PHÁT HÀNH PHIÊN BẢN (RELEASE NOTES)
**MediRead AI — Phiên bản 2.0.0 (Production Ready Release)**  
*Ngày phát hành: 14/11/2026*

---

## 1. TỔNG QUAN PHÁT HÀNH
Phiên bản 2.0.0 là bước chuyển đổi toàn diện từ pipeline thử nghiệm cục bộ sang nền tảng web production hoàn chỉnh, giải quyết triệt để các rủi ro an ninh dữ liệu y tế, chuẩn hóa quy trình nhận diện OCR và tích hợp giao diện Next.js chuẩn trợ năng người cao tuổi kế thừa từ bản thiết kế Figma Mobile App.

---

## 2. CÁC NÂNG CẤP & SỬA LỖI QUAN TRỌNG

### 2.1. Khắc phục lỗi P0 & P1 (An ninh & An toàn y tế)
- **SEC-01 (P0)**: Thay thế hoàn toàn hàm giả lập `demo-user-elderly` bằng cơ chế xác thực JWT chuẩn Supabase Auth (`sub` claim verification, token expiration, signature check).
- **SEC-02 (P0)**: Gỡ bỏ mount thư mục `/uploads` tĩnh công khai; chuyển toàn bộ tệp ảnh sang Supabase Storage Private Bucket `documents`, chỉ sinh Signed URL có thời hạn cho người có quyền.
- **SEC-03 (P0)**: Chuyển đổi dữ liệu từ file SQLite cục bộ sang Supabase PostgreSQL với 10 bảng dữ liệu được bảo vệ bằng Row Level Security (RLS).
- **MED-01 (P0)**: Sửa logic phân loại cờ; cấm tuyệt đối việc gán cờ `LOW` hoặc `NORMAL` cho các chỉ số thiếu dữ liệu hoặc không rõ khoảng chuẩn. Bắt buộc gắn cờ `UNKNOWN` và trạng thái `needs_review`.
- **MED-02 (P0)**: Bỏ khai báo cứng `PATIENT_IS_CHILD = False`. Hỗ trợ 3 trạng thái độ tuổi `adult / child / unknown`. Khi `unknown`, không tự ý chọn khoảng chuẩn người lớn.
- **SYS-01 (P1)**: Tách khởi tạo PaddleOCR, Ollama và ChromaDB ra khỏi import-time; chuyển sang mô hình Lazy Loading và quản lý qua FastAPI Lifespan.
- **SYS-02 (P1)**: Chuyển toàn bộ đường dẫn Windows hardcode sang biến môi trường (`PADDLE_DET_DIR`, `PADDLE_REC_DIR`, `PADDLE_CLS_DIR`) kèm fallback cục bộ.
- **SYS-03 (P1)**: Tắt cache lời giải thích RAG không an toàn trên production; bổ sung hàm băm SHA-256 cô lập ngữ cảnh khi cần bật cache.
- **SYS-04 (P1)**: Tách riêng luồng xử lý nền (Background Worker), phản hồi HTTP tức thì cho trình duyệt mà không bị timeout.

### 2.2. Giao diện Web Next.js 15 & Trợ năng
- Xây dựng 8 màn hình chức năng với bộ token màu sắc `#0B6B73` Deep Medical Teal, `#073F46`, `#DDEEEB` đồng bộ với bản thiết kế Figma Mobile App.
- Tích hợp thanh công cụ chỉnh cỡ chữ nhanh ($100\% - 115\% - 130\%$).
- Tích hợp trợ lý đọc giọng nói tiếng Việt tự nhiên tốc độ chậm ($0.85\text{x}$) cho toàn bộ lời giải thích xét nghiệm và hướng dẫn dùng thuốc.
- Màn hình đối chiếu OCR gốc (Human-in-the-loop review) kèm nút xác nhận chính thức từ người bệnh.
- Biểu đồ xu hướng chỉ số sức khỏe theo thời gian.
- Hệ thống nhắc 4 cữ uống thuốc trong ngày (Sáng, Trưa, Chiều, Tối).
- Quản lý ủy quyền người chăm sóc với cơ chế phê duyệt chặt chẽ.

### 2.3. Đóng gói & Hạ tầng
- Cấu hình `Dockerfile` độc lập cho Backend API, Worker và Next.js Web App.
- Cấu hình `compose.production.yml` cô lập Ollama trong mạng nội bộ, giới hạn tài nguyên CPU/RAM.
- Cấu hình Nginx reverse proxy với các header bảo mật HSTS, CSP, X-Frame-Options và giới hạn dung lượng tải lên $10\text{ MB}$.
