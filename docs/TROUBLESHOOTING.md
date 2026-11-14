# SỔ TAY XỬ LÝ SỰ CỐ PRODUCTION (TROUBLESHOOTING RUNBOOK)
**Hướng dẫn chẩn đoán và khắc phục nhanh các lỗi vận hành thường gặp**

---

## 1. MÃ LỖI VÀ HÀNH ĐỘNG XỬ LÝ

### 1.1. Sự cố: Ollama không phản hồi / Quá thời gian chờ (LLM Timeout)
- **Triệu chứng**: Worker log ghi nhận `llm_timeout` hoặc `httpx.ReadTimeout`. Trạng thái tài liệu chuyển sang `needs_review` hoặc `processing` quá 3 phút.
- **Nguyên nhân**:
  1. Container Ollama bị cạn RAM/CPU và bị hệ điều hành OOM Kill.
  2. Mô hình `qwen2.5:7b` chưa được tải về container Ollama mới dựng.
- **Cách xử lý**:
  ```bash
  # 1. Kiểm tra trạng thái container Ollama
  docker compose -f infra/compose.production.yml ps ollama

  # 2. Kiểm tra log
  docker compose -f infra/compose.production.yml logs --tail 100 ollama

  # 3. Kiểm tra danh sách mô hình đã tải
  docker compose -f infra/compose.production.yml exec ollama ollama list

  # 4. Nếu thiếu mô hình, tải lại
  docker compose -f infra/compose.production.yml exec ollama ollama pull qwen2.5:7b
  ```

---

### 1.2. Sự cố: PaddleOCR báo lỗi không tìm thấy mô hình (Model Directory Missing)
- **Triệu chứng**: Log ghi nhận `Missing OCR model directory` hoặc `RuntimeError: Inference model not found`.
- **Nguyên nhân**: Biến môi trường `PADDLE_DET_DIR`, `PADDLE_REC_DIR`, `PADDLE_CLS_DIR` trỏ tới đường dẫn không tồn tại hoặc chưa mount volume trong Docker.
- **Cách xử lý**:
  - Kiểm tra xem thư mục mô hình có đầy đủ 3 file: `inference.pdmodel`, `inference.pdiparams`, `inference.pdiparams.info`.
  - Trên Windows host: Kiểm tra `C:\paddle_models\whl\...` tồn tại.
  - Trên Docker: Kiểm tra volume mount `- ./models:/models:ro` trong `compose.production.yml`.

---

### 1.3. Sự cố: Trình duyệt nhận mã HTTP 401 Unauthorized liên tục
- **Triệu chứng**: Người dùng đã đăng nhập nhưng tất cả API đều trả về `unauthenticated_missing_bearer_header` hoặc `token_expired`.
- **Nguyên nhân**:
  1. `SUPABASE_JWT_SECRET` trong `.env` không trùng với JWT Secret trên Supabase Project Dashboard.
  2. Thời gian (đồng hồ) máy chủ bị lệch quá 5 phút so với giờ chuẩn NTP.
- **Cách xử lý**:
  - Vào Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ API $\rightarrow$ JWT Settings $\rightarrow$ Sao chép JWT Secret và dán vào `.env`.
  - Chạy `sudo chronyc -a makestep` hoặc `timedatectl` trên máy chủ VPS để đồng bộ giờ.

---

### 1.4. Sự cố: Người dùng nhận thông báo 429 Too Many Requests
- **Triệu chứng**: Người bệnh tải ảnh lần thứ 2 thì bị chặn và báo lỗi 429.
- **Nguyên nhân**: Rate limit của endpoint upload đang đặt ở mức nghiêm ngặt (10 scan/phút/IP) và nhiều người dùng trong cùng mạng Wi-Fi bệnh viện chia sẻ chung 1 địa chỉ IP NAT.
- **Cách xử lý**:
  - Cấu hình rate limit theo `user_id` thay vì IP đơn thuần khi người dùng đã gửi Bearer token.
  - Tăng nhẹ ngưỡng `RATE_LIMIT_SCAN=20/minute` trong `.env`.
