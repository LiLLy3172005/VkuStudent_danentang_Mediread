# [REPORT 2] KIẾN TRÚC CLEAN ARCHITECTURE, CSDL SUPABASE & CORE IMPLEMENTATION (M2 - 15%)
**Học phần:** Phát triển Ứng dụng Di động Đa nền tảng (Cross-Platform Mobile App Development)  
**Khoa:** Khoa học Máy tính — Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU)  
**Giảng viên phụ trách:** TS. Nguyễn Thanh Tuấn  
**Tên đề tài:** Ứng dụng di động MediRead AI — Số hóa, giải thích phiếu xét nghiệm và đơn thuốc y khoa bằng Trí tuệ Nhân tạo  
**Tên nhóm:** Nhóm 04 - MediRead Team • **Năm học:** Học kỳ 1 (2026 - 2027)

---

## 1. TRIỂN KHAI KIẾN TRÚC CLEAN ARCHITECTURE (CLEAN ARCHITECTURE IMPLEMENTATION)

Ứng dụng di động MediRead AI được thiết kế tuân thủ nghiêm ngặt nguyên lý Clean Architecture 3 tầng, tách biệt hoàn toàn giữa giao diện người dùng, nghiệp vụ lõi và nguồn dữ liệu:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION LAYER (Giao diện & Quản trị trạng thái)    │
│  - Expo Router v5 File-based Routing ((tabs), (auth), doc) │
│  - Senior-Friendly UI Components (High Contrast, Large Tap) │
│  - Zustand State Stores (authStore, docStore, chatStore)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Gọi tương tác (Actions)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DOMAIN LAYER (Nghiệp vụ Y khoa & Thực thể)               │
│  - Entities & Schemas: MedicalDocument, LabResult, Medicine │
│  - Business Rules: Đánh giá cờ cảnh báo (H/L/Normal)       │
│  - Clinical Range Resolver: Chuẩn hóa tham chiếu nam/nữ/tuổi│
└──────────────────────────────┬──────────────────────────────┘
                               │ Phụ thuộc Interface
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. DATA LAYER (Nguồn dữ liệu & Tích hợp Mạng)               │
│  - Mobile API Service Client (Axios / Expo Fetch + JWT)     │
│  - Supabase Database & Storage Client                       │
│  - Local Cache Source (AsyncStorage / Offline Persistence)  │
└─────────────────────────────────────────────────────────────┘
```

### 1.1. Presentation Layer (Tầng hiển thị)
* **File-based Routing:** Tận dụng hệ thống định tuyến hiện đại của Expo Router (`mobile/app/(tabs)`, `mobile/app/(auth)`).
* **Quản trị trạng thái (Zustand):** Tối ưu hóa chu kỳ render, tách biệt logic giao diện khỏi luồng tải dữ liệu (`mobile/store/authStore.ts`).
* **UI thân thiện cho người lớn tuổi:**
  * Kích thước nút bấm tối thiểu $56 \times 56\text{ dp}$ theo chuẩn tiếp cận WCAG 2.1 AAA.
  * Phông chữ Inter/Roboto phóng to dễ đọc, loại bỏ các chi tiết đồ họa gây rối mắt.
  * Thanh điều hướng dưới đáy (Bottom Navigation Bar) loại bỏ nhãn chữ thừa, phóng to nút **Quét tài liệu** $1.5\times$ nằm ở trung tâm để người già dễ bấm chụp.

### 1.2. Domain Layer (Tầng nghiệp vụ lõi)
* Chứa toàn bộ các định nghĩa TypeScript Interfaces độc lập (`DocumentType`, `LabResultItem`, `MedicationItem`, `MedicalTrendPoint`).
* Thuật toán ánh xạ và so sánh chỉ số đo được với khoảng tham chiếu:
  $$\text{flag} = \begin{cases} \text{high} & \text{khi } x > \text{max\_ref} \\ \text{low} & \text{khi } x < \text{min\_ref} \\ \text{normal} & \text{khi } \text{min\_ref} \le x \le \text{max\_ref} \end{cases}$$
* Quy tắc bảo vệ danh tính y tế: Loại bỏ tên bệnh nhân, số bảo hiểm y tế khỏi dữ liệu gửi sang mô hình AI phân tích nhằm đảm bảo an toàn tuyệt đối.

### 1.3. Data Layer (Tầng dữ liệu)
* Triển khai bộ điều hợp HTTP Client mạnh mẽ (`mobile/services/api.ts`):
  * Tự động đính kèm JWT Bearer Token vào header mọi yêu cầu.
  * Hỗ trợ cơ chế tải ảnh multipart an toàn qua `expo-file-system.uploadAsync`.
  * Cơ chế cấu hình linh hoạt địa chỉ IP máy chủ Backend mạng LAN ngay trong ứng dụng thông qua modal cài đặt bảo mật.

---

## 2. LƯỢC ĐỒ CƠ SỞ DỮ LIỆU & CHÍNH SÁCH BẢO MẬT (DATABASE SCHEMA & SECURITY)

Hệ thống cơ sở dữ liệu quan hệ được triển khai trên **Supabase PostgreSQL** với cấu trúc chuẩn hóa:

```
┌─────────────────┐       1:N       ┌────────────────────────┐
│    PROFILES     ├─────────────────┤   MEDICAL_DOCUMENTS    │
│  (Người bệnh)   │                 │ (Phiếu khám/Đơn thuốc) │
├─────────────────┤                 ├────────────────────────┤
│ id (UUID, PK)   │                 │ id (UUID, PK)          │
│ phone (Unique)  │                 │ user_id (UUID, FK)     │
│ full_name       │                 │ doc_type (Enum)        │
│ birth_year      │                 │ file_url (Text)        │
│ sex (nam/nữ)    │                 │ facility_name          │
│ created_at      │                 │ issued_date            │
└────────┬────────┘                 └───────────┬────────────┘
         │                                      │
         │ 1:N                                  │ 1:N
         ▼                                      ▼
┌─────────────────┐                 ┌────────────────────────┐
│ HEALTH_METRICS  │                 │      LAB_RESULTS       │
│ (Chỉ số đo đạc) │                 │  (Chỉ số xét nghiệm)   │
├─────────────────┤                 ├────────────────────────┤
│ id (UUID, PK)   │                 │ id (UUID, PK)          │
│ user_id (FK)    │                 │ document_id (UUID, FK) │
│ metric_type     │                 │ user_id (UUID, FK)     │
│ value (Numeric) │                 │ indicator_code (CRE...)│
│ recorded_at     │                 │ value_num (Numeric)    │
└─────────────────┘                 │ flag (high/low/normal) │
                                    └────────────────────────┘
```

### 2.1. Phân quyền và Bảo mật Dữ liệu (Row-Level Security - RLS)
* Kích hoạt RLS trên tất cả các bảng:
  ```sql
  ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
  
  -- Chính sách: Người dùng chỉ được truy vấn hồ sơ y tế của chính mình
  CREATE POLICY "Users can only view their own medical documents"
  ON medical_documents FOR SELECT
  USING (auth.uid() = user_id);
  ```
* **Bảo mật đăng nhập:** Xác thực bảo mật bằng Số điện thoại + Mật khẩu mã hóa Bcrypt. Đã loại bỏ hoàn toàn giao diện chọn tài khoản công khai để ngăn ngừa rò rỉ hồ sơ cá nhân.

---

## 3. TIẾN ĐỘ TRIỂN KHAI CÁC TÍNH NĂNG CỐT LÕI (CORE FEATURE IMPLEMENTATION)

1. **Module Xác thực (Authentication):** Đăng nhập bằng số điện thoại, cấp phát JWT HS256 với thời hạn an toàn, bảo vệ trạng thái đăng nhập qua `authStore`.
2. **Module Quét & Tải ảnh (Scan & Upload):** Tích hợp camera chụp ảnh phiếu khám, màn hình xem trước và nút bấm chụp to bản trực quan.
3. **Module Chi tiết Phiếu khám (Document Detail):** Hiển thị danh sách chỉ số xét nghiệm, phân tích màu sắc cảnh báo, nút bấm nghe đọc bằng giọng nói và liên kết sang Bác sĩ AI.
4. **Module Xu hướng Chỉ số (Health Trends):** API truy vấn chuỗi thời gian các chỉ số định lượng `indicator_code` (Creatinin, Glucose, AST, ALT...) hiển thị biểu đồ trực quan.

* **🔗 GitHub Repository:** `https://github.com/LiLLy3172005/VkuStudent_danentang_Mediread.git`  
* **🎥 Video Demo Tiến độ M2 (Thời lượng 3 phút):** `https://youtu.be/mediread-ai-milestone2-demo`
