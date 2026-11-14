# TÀI LIỆU KỸ THUẬT GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (API SPECIFICATION)
**Đặc tả hợp đồng API RESTful MediRead AI Production**  
*Phiên bản: 2.0.0*  
*Base URL: `https://api.mediread.ai` (hoặc `http://localhost:8000`)*

---

## 1. TIÊU CHUẨN CHUNG
- **Định dạng dữ liệu**: `application/json` (trừ upload file dùng `multipart/form-data`).
- **Chuẩn xác thực**: Header `Authorization: Bearer <supabase_auth_jwt>`.
- **Mã phản hồi chuẩn**:
  - `200 OK`: Yêu cầu thành công.
  - `400 Bad Request`: Dữ liệu đầu vào không hợp lệ hoặc tệp ảnh bị hỏng.
  - `401 Unauthorized`: Chưa truyền token hoặc token hết hạn/chữ ký giả mạo.
  - `403 Forbidden`: Người dùng không có quyền truy cập tài nguyên của người khác.
  - `404 Not Found`: Không tìm thấy tài liệu hoặc người bệnh.
  - `413 Payload Too Large`: Kích thước tệp vượt quá giới hạn 10 MB.
  - `415 Unsupported Media Type`: Định dạng tệp không nằm trong allowlist.
  - `429 Too Many Requests`: Vượt quá tần suất cho phép (Rate limit).

---

## 2. DANH MỤC ENDPOINTS

### 2.1. Quản lý Tài liệu & Quét OCR

#### `POST /api/v1/documents/upload`
Tải lên tệp ảnh phiếu xét nghiệm hoặc đơn thuốc để xử lý nền.
- **Quyền**: Yêu cầu xác thực (`authenticated`).
- **Tần suất**: Tối đa 10 lần / phút.
- **Content-Type**: `multipart/form-data`
- **Tham số Form**:
  - `file`: Tệp ảnh (`image/jpeg`, `image/png`, `image/webp`, `image/heic`).
  - `doc_type`: Chuỗi (`lab_report` hoặc `prescription`).
  - `patient_sex`: Chuỗi (`nam`, `nu`, `unknown`). Mặc định: `unknown`.
  - `age_group`: Chuỗi (`adult`, `child`, `unknown`). Mặc định: `unknown`.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "document_id": "9a6890dc-bd78-469c-98c3-52545b64c231",
  "storage_path": "9a6890dc-bd78-469c-98c3-52545b64c231/9a6890dc.../image.png",
  "status": "uploaded",
  "message": "Tài liệu đã được tải lên an toàn và đang được xử lý trong nền."
}
```

#### `GET /api/v1/documents`
Lấy danh sách các tài liệu đã quét của người dùng hiện tại.
- **Phản hồi mẫu (`200 OK`)**:
```json
[
  {
    "id": "9a6890dc-bd78-469c-98c3-52545b64c231",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "doc_type": "lab_report",
    "status": "needs_review",
    "facility_name": "Bệnh viện Đại học Y Hà Nội",
    "issued_date": "2026-11-12",
    "ocr_confidence": 0.92,
    "is_pii_masked": true,
    "created_at": "2026-11-14T10:00:00Z"
  }
]
```

#### `GET /api/v1/documents/{document_id}`
Lấy chi tiết một tài liệu bao gồm các chỉ số sinh hóa, nguồn khoảng chuẩn, và lời giải thích RAG.
- **Quyền**: Chủ sở hữu tài liệu hoặc Người chăm sóc đã được chấp thuận (`accepted care_link`).

#### `POST /api/v1/documents/{document_id}/confirm`
Người dùng hoặc bác sĩ xác nhận kết quả trích xuất sau khi kiểm tra.
- **Request Body**:
```json
{
  "confirmed_data": {
    "items": [...]
  },
  "notes": "Đã kiểm tra đối chiếu với phiếu gốc."
}
```

---

### 2.2. Xu hướng Chỉ số Sinh hóa (Lab Trends)

#### `GET /api/v1/labs/trends/{code}`
Lấy lịch sử biến thiên của một chỉ số sinh hóa theo thời gian (ví dụ: `GLU`, `CHOL`, `CREAT`, `URIC`).
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "name": "Glucose (Đường huyết lúc đói)",
  "normalized_code": "GLU",
  "current_value": 7.8,
  "unit": "mmol/L",
  "ref_low": 3.9,
  "ref_high": 6.4,
  "history": [
    {
      "measured_at": "2026-05-15",
      "value_num": 5.6,
      "unit": "mmol/L",
      "flag": "N",
      "document_id": "..."
    },
    {
      "measured_at": "2026-11-12",
      "value_num": 7.8,
      "unit": "mmol/L",
      "flag": "H",
      "document_id": "..."
    }
  ]
}
```

---

### 2.3. Lịch Uống Thuốc & Nhật Ký Liều

#### `GET /api/v1/schedules`
Lấy 4 khung giờ nhắc thuốc trong ngày (Sáng 07:00, Trưa 11:30, Chiều 16:00, Tối 20:00).

#### `POST /api/v1/doses/{log_id}/mark`
Đánh dấu trạng thái đã uống hoặc bỏ qua cữ thuốc.
- **Request Body**:
```json
{
  "status": "taken",
  "note": "Uống sau ăn sáng."
}
```

---

### 2.4. Người Chăm Sóc (Care Links)

#### `GET /api/v1/care-links`
Lấy danh sách các liên kết người chăm sóc liên quan đến tài khoản.

#### `POST /api/v1/care-links/request`
Người chăm sóc gửi yêu cầu theo dõi hồ sơ của người bệnh (khởi tạo ở trạng thái `pending`).

#### `POST /api/v1/care-links/{link_id}/accept`
**Chỉ người bệnh mới có quyền gọi API này** để chấp thuận cho người thân xem hồ sơ.

#### `POST /api/v1/care-links/{link_id}/revoke`
Hủy quyền xem hồ sơ ngay lập tức.
