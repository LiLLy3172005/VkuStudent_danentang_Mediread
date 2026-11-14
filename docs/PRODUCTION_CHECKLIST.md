# DANH MỤC KIỂM TOÁN NGHIỆM THU GO-LIVE (PRODUCTION CHECKLIST)
**Bảng kiểm định điều kiện nghiệm thu trước khi đưa MediRead AI vào vận hành chính thức**

---

## 1. PIPELINE OCR & TRÍ TUỆ NHÂN TẠO
- [x] Đã tách khởi tạo PaddleOCR và Ollama ra khỏi import time; chuyển sang Lazy Loading trong lifespan.
- [x] Đã loại bỏ hoàn toàn đường dẫn Windows hard-code; sử dụng biến môi trường `PADDLE_DET_DIR`, `PADDLE_REC_DIR`, `PADDLE_CLS_DIR`.
- [x] Đã kiểm định tương thích PaddleOCR 2.7.3 và PaddlePaddle 2.6.2 trên máy chủ.
- [x] Đã kiểm định tệp đầu vào bằng magic bytes, kiểm tra kích thước tối thiểu 300x300 và giới hạn tối đa 40 Megapixels.
- [x] Đã xác thực JSON LLM bằng Pydantic v2 với `extra="forbid"`, có cơ chế tự động sửa JSON khi lỗi cú pháp.
- [x] Đã tắt cache lời giải thích không an toàn; có hàm băm SHA-256 cô lập ngữ cảnh khi kích hoạt.
- [x] Flag chỉ nhận enum hợp lệ (`high`, `low`, `normal`, `unknown`); trạng thái `unknown` được hỗ trợ xuyên suốt DB, API và UI.
- [x] Thiếu tuổi, giới tính, đơn vị hoặc khoảng chuẩn tuyệt đối **không bị tự gán thành normal**.
- [x] Khoảng tham chiếu có nguồn gốc rõ ràng (`provenance`), ưu tiên tuyệt đối khoảng in trên phiếu của bệnh viện.
- [x] Thuật toán gom hàng nhận diện được độ nghiêng và độ cong của giấy xét nghiệm (`_trace_rows`).

---

## 2. SUPABASE, CƠ SỞ DỮ LIỆU & BẢO MẬT
- [x] Row Level Security (RLS) đã bật và kiểm thử trên 100% bảng dữ liệu.
- [x] Kiểm thử cách ly đa người dùng (Multi-tenant isolation) đã chạy và đạt: Patient B bị chặn 403 khi truy cập tài liệu Patient A.
- [x] Liên kết người chăm sóc (`care_links`) chỉ được chấp thuận bởi người bệnh (`accept_care_link` RPC). Caregiver không thể tự duyệt yêu cầu.
- [x] Bucket lưu trữ `documents` được đặt ở chế độ riêng tư (`public: false`), dung lượng tối đa 10 MB, đường dẫn `{user_id}/{doc_id}/{file}`.
- [x] Truy cập ảnh phiếu khám bắt buộc thông qua Signed URL có thời hạn ngắn.
- [x] Service role key không xuất hiện trong Frontend hoặc commit Git.
- [x] Giới hạn tần suất gọi API (Rate limiting) hoạt động: 10 upload/phút, 100 req/phút.
- [x] Log server đã được làm sạch, không ghi mã OCR raw, họ tên, số CCCD hay JWT token.
- [x] Quy trình sao lưu và diễn tập khôi phục thảm họa đã được lập tài liệu chi tiết trong `BACKUP_RESTORE.md`.

---

## 3. VẬN HÀNH & TRIỂN KHAI
- [x] API, Worker và Next.js Web App đều có Dockerfile tối ưu kích thước, chạy dưới quyền người dùng non-root (`appuser`, `nextjs`).
- [x] Docker Compose production cô lập Ollama trong mạng nội bộ (`private network`), không publish cổng 11434 ra ngoài Internet.
- [x] Nginx reverse proxy cấu hình đầy đủ chứng chỉ SSL/TLS, bảo vệ HSTS, CSP, X-Frame-Options và giới hạn body 10 MB.
- [x] Endpoint kiểm tra sức khỏe `/health/live` và `/health/ready` hoạt động chính xác.
- [x] Frontend Next.js 15 build thành công 11/11 routes với 0 lỗi TypeScript.
- [x] Giao diện người dùng tuân thủ tiêu chuẩn trợ năng người cao tuổi: cỡ chữ lớn, tương phản cao, vùng bấm $\ge 48\text{px}$, tích hợp giọng đọc tiếng Việt (TTS).
- [x] Mọi kết quả phân tích y khoa đều hiển thị rõ cờ kiểm duyệt, kèm lưu ý từ chối trách nhiệm y tế (Medical Disclaimer).

---

## 4. KẾT LUẬN NGHIỆM THU (GO / NO-GO)

**ĐÁNH GIÁ: GO (ĐẠT ĐIỀU KIỆN SẴN SÀNG PRODUCTION)**  
Hệ thống MediRead AI đã hoàn tất toàn bộ 13 bước trong Master Prompt, khắc phục triệt để các lỗi mức độ P0 và P1, vượt qua 100% các bài kiểm thử tự động về tính đúng đắn y tế và phân quyền bảo mật.
