# BÁO CÁO KIỂM TOÁN KIẾN TRÚC VÀ MÃ NGUỒN MEDIREAD AI
**Tài liệu kiểm toán kỹ thuật trước khi Refactor Production**  
*Ngày thực hiện: 14/11/2026*  
*Người kiểm toán: Senior Full-stack / AI & DevSecOps Engineer*

---

## 1. TỔNG QUAN HỆ THỐNG VÀ CẤU TRÚC REPOSITORY HIỆN CÓ

Qua rà soát thực tế trên hệ thống lưu trữ dự án, mã nguồn MediRead AI đang phân tán tại các khu vực:
1. `D:\Do An Cuoi Ki\mediread`:
   - `backend/`: FastAPI demo cũ, sử dụng SQLite cục bộ (`mediread.sqlite3`), xác thực giả lập (`demo-user-elderly`), upload lưu công khai tại `backend/uploads/`.
   - `backend/app/services/extractor.py`: Sử dụng Tesseract / Gemini API cũ thay vì pipeline cục bộ.
   - `backend/static/index.html`: Giao diện HTML đơn trang Tailwind thuần.
   - `rag/`: Mã nguồn mẫu ChromaDB chưa đồng bộ hóa với pipeline thí nghiệm.
2. `D:\Do An Cuoi Ki\Thutudong`:
   - `local_ocr_parser.py`: Pipeline PaddleOCR 2.7.3 cục bộ + Qwen 2.5 7B (Ollama) + logic chuẩn hóa chỉ số xét nghiệm và bảng tham chiếu.
   - `full_local_pipeline.py`: Tích hợp RAG tra cứu tri thức y khoa từ ChromaDB và Qwen 2.5.
   - `kb_chunks.jsonl`, `knowledge_base_clean.txt`: Dữ liệu tri thức y khoa.
   - `evaluate.py`, `eval_report.json`: Đánh giá thử nghiệm OCR.
3. `C:\Users\Lưu Ly\.gemini\antigravity\scratch\mediread-ai`:
   - Ứng dụng di động React Native / Expo SDK 58 với đầy đủ 50 màn hình Figma, token màu sắc chuẩn (`#0B6B73` Deep Medical Teal, `#073F46`, `#DDEEEB`, `#F8FAFA`, `#14283A`, `#5B6B77`).
4. `C:\paddle_models`:
   - Bộ trọng số mô hình PaddleOCR cục bộ (Detection: `en_PP-OCRv3_det`, Recognition: `latin_PP-OCRv3_rec` & `vi`, Classification: `ch_ppocr_mobile_v2.0_cls`).

---

## 2. BẢNG PHÂN LOẠI LỖI THEO MỨC ĐỘ NGHIÊM TRỌNG (P0 - P3)

| ID | Mức độ | Thành phần / Tệp ảnh hưởng | Lỗi thực tế & Nguyên nhân gốc | Nguy cơ bảo mật & Vận hành | Phương án xử lý | Trạng thái |
|---|---|---|---|---|---|---|
| **SEC-01** | **P0** | `backend/app/main.py` (`current_user`) | Hàm `current_user` tự động gán user mặc định `demo-user-elderly` khi không có header Authorization, hoặc chỉ lấy chuỗi con 8 ký tự của token mà không xác thực JWT chữ ký với Supabase Auth. | Bất kỳ ai cũng có thể giả mạo danh tính, đọc và chỉnh sửa dữ liệu người bệnh khác mà không cần đăng nhập. | Tích hợp xác thực Supabase JWT chuẩn (`PyJWT` / `supabase-py`), trích xuất `auth.uid()`, từ chối request không có token hợp lệ. | Đang sửa |
| **SEC-02** | **P0** | `backend/app/main.py` (`/uploads`) | Thư mục upload ảnh được mount công khai trực tiếp qua `StaticFiles(directory=uploads)`. Tệp ảnh phiếu khám chứa PII có thể bị truy cập nặc danh qua URL tĩnh. | Vi phạm nghiêm trọng HIPAA / GDPR và Luật Bảo vệ Dữ liệu Cá nhân; rò rỉ hình ảnh phiếu xét nghiệm của người bệnh. | Gỡ bỏ mount static public; tích hợp Supabase Storage Private Bucket `documents`, chỉ sinh Signed URL có thời hạn ngắn (15-60 phút) cho người sở hữu hoặc caregiver được ủy quyền. | Đang sửa |
| **SEC-03** | **P0** | `backend/app/db.py` | Toàn bộ dữ liệu đang lưu trong file SQLite cục bộ `mediread.sqlite3`, không liên kết Supabase PostgreSQL và không áp dụng Row Level Security (RLS). | Không thể cô lập dữ liệu người dùng (multi-tenancy); không thể phân quyền caregiver theo quy định y tế. | Chuyển toàn bộ database layer sang Supabase PostgreSQL, kích hoạt RLS trên 10 bảng dữ liệu (`profiles`, `documents`, `extractions`, `lab_results`, v.v.). | Đang sửa |
| **MED-01** | **P0** | `full_local_pipeline.py` (dòng 75-80) | Nhánh cờ `if flag == "high": ... else: ...`. Nếu trạng thái là `unknown` hoặc `normal` bị lọt vào hàm này, nó tự động bị coi là `low` ("Thấp hơn khoảng chuẩn"). | Chẩn đoán sai lệch nghiêm trọng, tạo báo động giả về chỉ số tụt thấp cho người bệnh. | Enforce enum rõ ràng: `high`, `low`, `normal`, `unknown`. Chỉ giải thích khi flag là `high` hoặc `low`. Nếu `unknown`, báo rõ thiếu dữ liệu. | Đang sửa |
| **MED-02** | **P0** | `local_ocr_parser.py` (dòng 22, 76) | Khai báo cứng `PATIENT_IS_CHILD = False` khi không rõ tuổi, và `flag` mặc định là `normal` khi không có ký hiệu H/L/`*`. | Phiếu xét nghiệm của trẻ em sẽ bị so sánh với khoảng chuẩn người lớn; các chỉ số bất thường không có ký hiệu nhãn in sẽ bị che giấu thành bình thường. | Bổ sung trạng thái `age_group: adult / child / unknown`. Khi `unknown`, không được kết luận bình thường; gắn cờ `needs_review` và hiển thị ảnh gốc để xác nhận. | Đang sửa |
| **SYS-01** | **P1** | `local_ocr_parser.py`, `full_local_pipeline.py` | Khởi tạo PaddleOCR, Ollama LLM, ChromaDB ngay ở module level (import time). | Khi server khởi động hoặc import module để test, nếu Ollama chưa bật hoặc đường dẫn file chưa mount, toàn bộ ứng dụng bị crash ngay lập tức. | Chuyển sang mô hình Lazy Loading / Dependency Lifespan trong FastAPI lifespan context; có health check và retry timeout. | Đang sửa |
| **SYS-02** | **P1** | `local_ocr_parser.py` (dòng 24-26) | Đường dẫn model PaddleOCR được hardcode đường dẫn tuyệt đối Windows `C:\paddle_models\...`. | Ứng dụng không thể đóng gói Docker Linux hoặc chuyển sang server máy chủ khác. | Thay thế bằng biến môi trường `PADDLE_DET_DIR`, `PADDLE_REC_DIR`, `PADDLE_CLS_DIR` với cơ chế fallback thông minh. | Đang sửa |
| **SYS-03** | **P1** | `full_local_pipeline.py` (dòng 64-74) | Cache kết quả giải thích chỉ dùng `(name.lower(), flag)`. | Người bệnh A có Glucose = 7.5 và Người bệnh B có Glucose = 18.2 (kèm suy thận) sẽ nhận chung một lời giải thích cũ; không phân lập theo giá trị, đơn vị, tiền sử và phiên bản model. | Viết lại cache key có băm SHA-256 gồm (tên, giá trị, đơn vị, khoảng chuẩn, ngữ cảnh RAG, model version); tạm thời tắt cache lời giải thích ở production để đảm bảo an toàn. | Đang sửa |
| **SYS-04** | **P1** | `local_ocr_parser.py` & `backend/app/main.py` | Xử lý OCR và trích xuất LLM chạy đồng bộ (blocking) trong luồng request HTTP. | Thời gian chạy PaddleOCR + Qwen 7B mất từ 10 - 45 giây khiến trình duyệt bị timeout HTTP 504 và làm nghẽn toàn bộ worker web. | Tách riêng Worker xử lý nền (Background Worker / Job Queue), trả ngay `document_id` trạng thái `processing`, hỗ trợ polling và webhook cập nhật tiến độ. | Đang sửa |
| **AI-01** | **P1** | `local_ocr_parser.py` | Output JSON từ Qwen 2.5 không có schema validation nghiêm ngặt (Pydantic). | LLM có thể trả về trường lạ, số liệu cắt cụt, hoặc JSON lỗi khiến ứng dụng sập hoặc trả mảng rỗng giả. | Áp dụng Pydantic v2 `LabExtraction` với `extra="forbid"`, giới hạn độ dài trường, kiểm tra giá trị số và retry tự động 2 lần khi format lỗi. | Đang sửa |
| **MED-03** | **P1** | `local_ocr_parser.py` (dòng 348-360) | Bảng khoảng chuẩn cố định `REFERENCE_TABLE` âm thầm ghi đè khoảng tham chiếu in trên phiếu xét nghiệm của phòng xét nghiệm. | Mỗi máy xét nghiệm và cơ sở y tế có ngưỡng tham chiếu sinh hóa khác nhau; việc ghi đè âm thầm là sai quy trình y khoa. | Ưu tiên tuyệt đối khoảng chuẩn in trên phiếu. Lưu vết `provenance`: `reference_source = printed_report / internal_kb`, `reference_range_used`, `review_reason`. | Đang sửa |
| **SEC-04** | **P1** | `Supabase Schema` (care_links) | Policy RLS cho phép cập nhật care_links chưa giới hạn chặt chẽ điều kiện; chưa có RPC kiểm soát người bệnh là bên duy nhất có quyền chấp nhận / hủy liên kết. | Caregiver có thể tự gửi request và tự chấp nhận quyền truy cập hồ sơ bệnh nhân. | Viết Migration bổ sung RPC `accept_care_link`, `revoke_care_link` với `security definer set search_path = ''`, ràng buộc quyền kiểm soát thuộc về người bệnh. | Đang sửa |
| **API-01** | **P2** | `backend/app/main.py` | Thiếu validation kích thước tệp upload, magic bytes, dimensions ảnh; không có rate limiting. | Nguy cơ cạn kiệt tài nguyên (DoS) bằng tệp ảnh cực lớn hoặc tệp giả mạo. | Thêm middleware kiểm tra dung lượng tối đa 10MB, kiểm tra magic bytes qua Pillow, kích thước tối thiểu 300x300, pixel limit <= 40MP, tích hợp Rate Limiter. | Đang sửa |
| **FE-01** | **P2** | `backend/static/index.html` | Giao diện hiện tại là file HTML tĩnh đơn lẻ, thiếu các chức năng hồ sơ người bệnh, xu hướng chỉ số, quản lý người chăm sóc (Care links) và phân quyền route. | Trải nghiệm người dùng chưa đạt chuẩn ứng dụng y tế production; không tương thích với đặc tả hệ sinh thái MediRead AI. | Xây dựng Web App Next.js 15 / React 19 + TypeScript + TailwindCSS chuẩn hoá theo bảng màu `#0B6B73` Deep Medical Teal từ Figma Mobile App. | Đang sửa |
| **DEVOPS-01** | **P2** | Toàn bộ dự án | Chưa có cấu hình Dockerfile, Docker Compose production, health check endpoint chuẩn hóa, biến môi trường mẫu và tài liệu vận hành. | Khó triển khai lặp lại trên môi trường VPS Linux / Cloud; phụ thuộc vào cấu hình thủ công trên máy cá nhân. | Xây dựng `Dockerfile` cho Backend API & Worker, `compose.production.yml`, Nginx reverse proxy, tài liệu triển khai VPS. | Đang sửa |

---

## 3. KẾ HOẠCH HÀNH ĐỘNG TRIỂN KHAI THEO THỨ TỰ ƯU TIÊN

1. **Khắc phục P0 (An toàn & Dữ liệu cốt lõi)**:
   - Sửa toàn bộ logic Flag, Age Group, và Reference Range trong pipeline OCR/LLM.
   - Viết Migration Supabase PostgreSQL hoàn chỉnh: 10 bảng, enum `lab_flag` (H, L, N, UNKNOWN), RPC Caregiver, RLS policies chặt chẽ.
   - Refactor Authentication: JWT verification với Supabase Auth.
2. **Khắc phục P1 (Kiến trúc & Độ tin cậy)**:
   - Refactor OCR Engine và Ollama Client: Lazy init, biến môi trường, Pydantic schema validation, provenance tracking.
   - Tách API Backend và Async Processing Worker (Job Queue).
   - Tắt cache lời giải thích không an toàn; thiết kế cơ chế hash key đa chiều.
3. **Phát triển Frontend Production**:
   - Khởi tạo và xây dựng Web App Next.js + React + TypeScript + TailwindCSS dựa trên Design Tokens từ Figma của bản App (`#0B6B73`, `#073F46`, `#DDEEEB`, `#F8FAFA`).
   - Đầy đủ 8 màn hình chức năng: Đăng nhập/Đăng ký, Quét & Xem lại OCR, Chi tiết lần khám, Xu hướng chỉ số, Lịch nhắc thuốc, Quản lý Caregiver, Cài đặt trợ năng người cao tuổi.
4. **Kiểm thử & Đóng gói Production**:
   - Viết Unit tests, Integration tests, Security tests.
   - Tạo Dockerfile, Docker Compose, Nginx SSL config.
   - Hoàn thiện bộ tài liệu bàn giao tại thư mục `docs/`.
