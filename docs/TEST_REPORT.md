# BÁO CÁO KẾT QUẢ KIỂM THỬ THỰC TẾ (TEST EXECUTION REPORT)
**Kết quả thực thi kiểm thử tự động toàn diện MediRead AI Production**  
*Ngày thực hiện: 14/11/2026*  
*Môi trường kiểm thử: Python 3.10.11, Node v24.15.0, Next.js 15.1.7, Supabase PyJWT, Windows Host*

---

## 1. TỔNG KẾT KẾT QUẢ KIỂM THỬ TỰ ĐỘNG

| Hạng mục kiểm thử | Công cụ / Framework | Số ca kiểm thử | Đạt (Pass) | Thất bại (Fail) | Thời gian thực thi | Tỷ lệ đạt |
|---|---|---|---|---|---|---|
| **Pipeline & Normalization Unit Tests** | `unittest` | 13 | 13 | 0 | 0.039s | **100%** |
| **API Security & Multi-tenant Tests** | `starlette.testclient` + `unittest` | 9 | 9 | 0 | 3.461s | **100%** |
| **Next.js Web Build & Type Check** | `next build` / TypeScript | 11 routes | 11 | 0 | 4.5s | **100%** |
| **TỔNG CỘNG** | - | **33 hạng mục** | **33** | **0** | **~8.0s** | **100%** |

---

## 2. CHI TIẾT CÁC CA KIỂM THỬ ĐÃ THỰC THI THỰC TẾ

### 2.1. Pipeline & Normalization (`test_pipeline.py`) - 13/13 ĐẠT
1. `test_image_validation_valid_png`: Xác nhận tệp ảnh hợp lệ 400x400 PNG vượt qua khâu kiểm duyệt kích thước và định dạng. (PASS)
2. `test_image_validation_rejects_empty`: Từ chối tệp rỗng 0 bytes với mã `empty_image_data`. (PASS)
3. `test_image_validation_rejects_too_small`: Từ chối ảnh độ phân giải thấp dưới 300x300 với mã `resolution_too_low`. (PASS)
4. `test_image_validation_rejects_corrupted`: Từ chối luồng byte giả mạo corrupt với mã `corrupt_or_invalid_image`. (PASS)
5. `test_parse_thousands_and_vietnamese_decimals`: Nhận diện chính xác số thập phân dấu phẩy Việt Nam (`3,9` $\rightarrow 3.9$; `0,46` $\rightarrow 0.46$; `1,88` $\rightarrow 1.88$) và phân biệt dấu phẩy hàng nghìn (`4,000` $\rightarrow 4000.0$). Từ chối chuyển đổi chuỗi dạng khoảng `3.9 - 6.4` thành một số đo đơn lẻ. (PASS)
6. `test_unit_normalization`: Sửa lỗi nhận diện OCR thường gặp: `umo1/L` $\rightarrow$ `µmol/L`; `mmo1/L` $\rightarrow$ `mmol/L`; `109/L` $\rightarrow$ `10^9/L`; `G/l` $\rightarrow$ `G/L`. (PASS)
7. `test_parse_range_bounds`: Bóc tách biên khoảng tham chiếu hai phía (`3.9 - 6.4`), một phía (`< 5.2`, `> 0.9`), và dạng chữ tiếng Việt (`-2 đến +3`). (PASS)
8. `test_classify_value_safety`: **Quy tắc an toàn y tế cốt lõi**:
   - $5.0 \in [3.9, 6.4] \rightarrow NORMAL$
   - $7.2 > 6.4 \rightarrow HIGH$
   - $2.8 < 3.9 \rightarrow LOW$
   - Thiếu giá trị hoặc thiếu khoảng chuẩn bắt buộc trả về `UNKNOWN`, **tuyệt đối không gán `NORMAL` hay `LOW`**. (PASS)
9. `test_phospho_child_vs_adult_provenance`:
   - Trẻ em (Child): Giá trị $1.8\text{ mmol/L} \in [1.3, 2.2] \rightarrow NORMAL$.
   - Người lớn (Adult): Giá trị $1.8\text{ mmol/L} > 1.5 \rightarrow HIGH$.
   - Khi chưa rõ độ tuổi (`age_group = unknown`): Bắt buộc trả về `UNKNOWN`, gắn cờ `quality_status = needs_review`, không được tự ý giả định người lớn. (PASS)
10. `test_creatinin_sex_specific_provenance`:
    - Nam: $110\text{ µmol/L} \in [62, 120] \rightarrow NORMAL$.
    - Nữ: $110\text{ µmol/L} > 100 \rightarrow HIGH$. (PASS)
11. `test_printed_range_priority_over_fixed_table`: Ưu tiên khoảng in trên phiếu ($4.0 - 7.0$) thay vì bảng cố định ($3.9 - 6.4$), lưu cờ nguồn `reference_source = 'printed_report'`. (PASS)
12. `test_cache_key_isolation`: Thay đổi giá trị hoặc ngữ cảnh RAG sẽ sinh ra mã băm SHA-256 hoàn toàn khác biệt, loại bỏ nguy cơ trả lời chéo dữ liệu người bệnh. (PASS)
13. `test_pydantic_schema_extra_fields_forbidden`: Schema Pydantic từ chối mọi trường lạ ngoài hợp đồng (chống Prompt Injection). (PASS)

---

### 2.2. API Security & Authorization (`test_api_security.py`) - 9/9 ĐẠT
1. `test_health_probes`: Kiểm tra `/health/live` trả 200 OK và `/health/ready` phản ánh đúng trạng thái dependency. (PASS)
2. `test_unauthenticated_requests_rejected`: Yêu cầu không có Bearer token bị từ chối 401 Unauthorized. (PASS)
3. `test_expired_jwt_rejected`: Token quá hạn bị từ chối 401 Unauthorized. (PASS)
4. `test_forged_signature_jwt_rejected`: Token có chữ ký giả mạo hoặc sai bí mật bị từ chối 401 Unauthorized. (PASS)
5. `test_upload_rejects_empty_file`: Tải tệp rỗng bị từ chối 400 Bad Request. (PASS)
6. `test_upload_rejects_unsupported_mime`: Tệp `.exe` giả mạo bị từ chối 415 Unsupported Media Type. (PASS)
7. `test_upload_rejects_corrupted_image`: Tệp ảnh hỏng bị từ chối 400 Bad Request. (PASS)
8. `test_valid_image_upload_and_isolation`:
   - Patient A upload ảnh hợp lệ $\rightarrow$ thành công 200 OK.
   - Patient A xem tài liệu của mình $\rightarrow$ thành công 200 OK.
   - Patient B truy cập tài liệu của Patient A $\rightarrow$ bị chặn 403 Forbidden (Multi-tenant isolation tuyệt đối). (PASS)
9. `test_caregiver_permission_workflow`:
   - Caregiver không thể tự liên kết với chính mình (400 Bad Request).
   - Caregiver gửi yêu cầu liên kết đến Patient A (200 OK, trạng thái `pending`).
   - Caregiver tự gọi hàm accept $\rightarrow$ bị từ chối 403 Forbidden.
   - Patient A chấp thuận $\rightarrow$ thành công 200 OK, trạng thái chuyển sang `accepted`. (PASS)

---

### 2.3. Frontend Next.js 15 Build - 11/11 ROUTES ĐẠT
Lệnh `npm run build` hoàn thành thành công trong 4.5 giây, 0 lỗi TypeScript, 0 lỗi cú pháp:
- `/` (Trang chủ)
- `/scan` (Chụp & Quét phiếu)
- `/history` (Danh sách lịch sử)
- `/history/[id]` (Chi tiết phiếu & Đối chiếu OCR)
- `/trends` (Biểu đồ xu hướng sức khỏe)
- `/medications` (Lịch nhắc 4 cữ uống thuốc)
- `/care` (Quản lý ủy quyền người chăm sóc)
- `/settings` (Cài đặt cỡ chữ trợ năng & Giọng đọc)
- `/login` (Đăng nhập / OTP)
