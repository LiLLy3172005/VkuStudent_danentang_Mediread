# HƯỚNG DẪN MIGRATION CƠ SỞ DỮ LIỆU SUPABASE POSTGRESQL
**Tài liệu quản lý phiên bản lược đồ và bảo đảm an toàn dữ liệu**  
*Phiên bản: 2.0.0*

---

## 1. NGUYÊN TẮC QUẢN LÝ SCHEMA PRODUCTION
1. **Không sửa đổi trực tiếp các file migration đã chạy**: Mọi thay đổi đều được ghi thành file SQL mới có đánh số thứ tự (`001`, `002`, `003`).
2. **Không chạy migration phá hủy dữ liệu (Non-destructive migrations)**: Sử dụng kỹ thuật expand-and-contract, không drop cột trực tiếp khi code cũ vẫn đang đọc.
3. **Mọi bảng dữ liệu người dùng đều kích hoạt RLS**: Không để bảng nào tồn tại mà không có chính sách bảo vệ.

---

## 2. DANH MỤC CÁC BẢN MIGRATION

### `migrations/001_initial_schema.sql`
- **Mục tiêu**: Tạo cấu trúc 10 bảng cốt lõi, extensions, và các kiểu enum.
- **Điểm cải tiến**:
  - Bổ sung giá trị `UNKNOWN` vào kiểu enum `lab_flag` (`'H', 'L', 'N', 'UNKNOWN'`).
  - Hỗ trợ trigger `set_updated_at` tự động cập nhật thời gian sửa đổi.
  - Tự động tạo bản ghi `profiles` khi có người dùng đăng ký qua Supabase Auth trigger `on_auth_user_created`.
  - Thiết lập khóa ngoại `ON DELETE CASCADE` an toàn giữa `documents`, `extractions`, `lab_results`, `medications`, `schedules`, và `dose_logs`.

### `migrations/002_care_links_rpc_and_rls.sql`
- **Mục tiêu**: Thiết lập cơ chế kiểm soát ủy quyền người chăm sóc (`care_links`) và kích hoạt Row Level Security (RLS) trên toàn bộ 10 bảng.
- **Hàm bảo mật**:
  - `has_access(owner uuid)`: `security definer set search_path = ''`. Kiểm tra nếu `owner = auth.uid()` hoặc tồn tại liên kết `care_links` trạng thái `accepted`.
  - `request_care_link(p_patient_id uuid)`: Tạo yêu cầu liên kết với trạng thái ban đầu bắt buộc là `pending`. Ngăn chặn tự liên kết chính mình (`cannot_link_self`).
  - `accept_care_link(p_link_id uuid)`: **Chỉ người bệnh (bên được yêu cầu) mới có quyền chấp thuận**. Người gửi (caregiver) không thể tự duyệt yêu cầu của mình.
  - `revoke_care_link(p_link_id uuid)`: Cả người bệnh và người chăm sóc đều có quyền hủy liên kết bất kỳ lúc nào.
- **Chính sách RLS**:
  - Áp dụng kiểm tra chéo quan hệ (Cross-ownership verification) cho `extractions`, `lab_results`, và `schedules`. Ngăn chặn trường hợp chèn dữ liệu thuộc người dùng A nhưng lại gắn `document_id` của người dùng B.

### `migrations/003_storage_policies.sql`
- **Mục tiêu**: Cấu hình bucket lưu trữ riêng tư `documents` và các chính sách object storage.
- **Cấu hình**:
  - `public: false` (nghiêm cấm truy cập nặc danh qua URL công khai).
  - Giới hạn dung lượng tệp: $10\text{MB}$ ($10,485,760\text{ bytes}$).
  - Định dạng cho phép: `image/jpeg`, `image/png`, `image/webp`, `image/heic`.
  - Đường dẫn định danh: `{user_id}/{document_id}/{filename}`.
  - Chính sách RLS trên `storage.objects`: Chỉ cho phép người dùng đọc/ghi vào thư mục trùng với `auth.uid()`, hoặc người chăm sóc đã được chấp thuận thông qua `has_access(folder[1]::uuid)`.

---

## 3. CÁCH THỰC THI MIGRATION TRÊN SUPABASE

### Cách 1: Qua Supabase CLI
```bash
# Đăng nhập Supabase
supabase login

# Liên kết với dự án production
supabase link --project-ref YOUR_PROJECT_REF

# Thực thi các bản migration theo thứ tự
supabase db push
```

### Cách 2: Qua Supabase SQL Editor Dashboard
1. Đăng nhập vào trang quản trị Supabase Dashboard $\rightarrow$ chọn dự án $\rightarrow$ mở **SQL Editor**.
2. Sao chép và chạy lần lượt nội dung các tệp:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_care_links_rpc_and_rls.sql`
   - `migrations/003_storage_policies.sql`
3. Xác nhận không có thông báo lỗi cú pháp.

---

## 4. PHƯƠNG ÁN ROLLBACK
Nếu xảy ra sự cố cần rollback, thực thi lệnh hủy theo thứ tự ngược:
```sql
-- Rollback 003
drop policy if exists "documents_obj_select" on storage.objects;
drop policy if exists "documents_obj_insert" on storage.objects;
drop policy if exists "documents_obj_update" on storage.objects;
drop policy if exists "documents_obj_delete" on storage.objects;

-- Rollback 002
revoke all on function public.request_care_link(uuid) from authenticated;
revoke all on function public.accept_care_link(uuid) from authenticated;
revoke all on function public.revoke_care_link(uuid) from authenticated;
revoke all on function public.has_access(uuid) from authenticated;

-- Rollback 001 (Chỉ thực hiện trên môi trường Staging thử nghiệm; không drop bảng trên Production)
```
