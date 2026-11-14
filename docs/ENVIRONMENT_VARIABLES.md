# DANH MỤC BIẾN MÔI TRƯỜNG PRODUCTION (ENVIRONMENT VARIABLES)
**Bảng tra cứu biến môi trường cho Backend API, Worker và Frontend Web**

---

## 1. BACKEND API & WORKER (`.env`)

| Tên biến | Bắt buộc | Mặc định | Ý nghĩa & Khuyến nghị bảo mật |
|---|---|---|---|
| `APP_ENV` | Có | `production` | Môi trường chạy (`production`, `staging`, `development`). |
| `APP_HOST` | Không | `0.0.0.0` | IP lắng nghe của FastAPI bên trong container. |
| `APP_PORT` | Không | `8000` | Cổng HTTP của Backend API. |
| `LOG_LEVEL` | Không | `INFO` | Mức độ ghi log (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `SUPABASE_URL` | **Bắt buộc** | - | URL endpoint dự án Supabase (vd: `https://xyz.supabase.co`). |
| `SUPABASE_ANON_KEY` | **Bắt buộc** | - | Khóa công khai của Supabase (dùng cho client xác thực). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Bắt buộc** | - | Khóa quản trị Supabase. **Chỉ đặt trong Secret Manager/Backend, tuyệt đối không gửi ra Frontend.** |
| `SUPABASE_JWT_SECRET` | **Bắt buộc** | - | Chuỗi bí mật ký JWT (HS256) từ Supabase Project Settings $\rightarrow$ API $\rightarrow$ JWT Secret. Dùng để xác thực chữ ký token người bệnh. |
| `OLLAMA_BASE_URL` | Có | `http://127.0.0.1:11434` | Địa chỉ mạng nội bộ của container Ollama. |
| `OLLAMA_MODEL` | Không | `qwen2.5:7b` | Tên mô hình LLM trích xuất dữ liệu và giải thích y khoa. |
| `OLLAMA_TIMEOUT_SECONDS`| Không | `180` | Thời gian chờ tối đa khi chạy inference (giây). |
| `PADDLE_DET_DIR` | Có | `/models/det` | Đường dẫn thư mục mô hình phát hiện văn bản PaddleOCR. |
| `PADDLE_REC_DIR` | Có | `/models/rec` | Đường dẫn thư mục mô hình nhận diện chữ PaddleOCR. |
| `PADDLE_CLS_DIR` | Có | `/models/cls` | Đường dẫn thư mục mô hình phân loại góc quay PaddleOCR. |
| `MAX_UPLOAD_BYTES` | Không | `10485760` | Dung lượng tệp ảnh tải lên tối đa ($10\text{ MB}$). |
| `ENABLE_EXPLANATION_CACHE`| Không | `false` | Bật/tắt cache lời giải thích RAG. Khuyến nghị `false` trên production để tránh trùng lặp chéo dữ liệu bệnh nhân. |

---

## 2. FRONTEND WEB NEXT.JS (`apps/web/.env.local`)

| Tên biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Có | `http://localhost:8000` | Địa chỉ công khai của Backend API để trình duyệt gọi dữ liệu. |
| `NEXT_PUBLIC_SUPABASE_URL` | Có | - | URL Supabase cho Client SDK. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Có | - | Khóa Anon Supabase cho Client SDK. |
