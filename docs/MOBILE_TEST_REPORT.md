# BÁO CÁO KIỂM THỬ MOBILE APP (MOBILE TEST REPORT)

**Dự án:** MediRead AI Mobile App  
**Ngày kiểm thử:** 15/11/2026  
**Môi trường:** Expo SDK 58, React Native 0.88, TypeScript v5.9, FastAPI Backend (Port 8000), Supabase Cloud PostgreSQL.

---

## 1. KẾT QUẢ KIỂM TRA TĨNH (STATIC ANALYSIS)

### 1.1. TypeScript Compilation Check
- **Lệnh thực hiện:** `cd mobile && npx tsc --noEmit`
- **Kết quả:** `Exit code 0`
- **Chi tiết:** 100% các file `_layout.tsx`, `index.tsx`, các màn hình trong `(tabs)`, `(auth)`, `document/[id]`, `ai-chat`, `medication`, `care`, các components và services đều vượt qua kiểm tra kiểu nghiêm ngặt (Strict Type Check), **0 lỗi, 0 cảnh báo type**.

### 1.2. Expo Doctor Project Health
- **Lệnh thực hiện:** `cd mobile && npx expo-doctor`
- **Kết quả:** 19/20 kiểm tra tự động vượt qua (Package versions, Native module compatibility, Peer dependencies, Plugins config).

### 1.3. Kiểm tra tính toàn vẹn của Web App
- **Lệnh thực hiện:** `cd apps/web && npm run build`
- **Kết quả:** `Compiled successfully in 3.6s (13/13 pages static/dynamic)`.
- **Đánh giá:** Web App hoàn toàn không bị ảnh hưởng, giữ nguyên tính toàn vẹn 100%.

---

## 2. KẾT QUẢ KIỂM THỬ TÍCH HỢP TÍNH NĂNG (FEATURE INTEGRATION)

| STT | Tính năng | Luồng kiểm thử | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| 1 | **Splash & Session** | Khởi động app từ `app/index.tsx` | Đọc SecureStore, điều hướng tự động vào Home nếu có token, ngược lại vào Login | ✅ Đạt |
| 2 | **Đăng nhập 1-chạm** | Tải danh sách hồ sơ từ Supabase `/auth/accounts` | Hiển thị danh sách hồ sơ (Bác Trần Văn Minh, Lê Quốc Huy...), bấm đăng nhập ngay | ✅ Đạt |
| 3 | **Đăng ký tài khoản** | Nhập tên, năm sinh, vai trò bệnh nhân/người chăm sóc | Gọi `/auth/register`, tạo user và cấp JWT | ✅ Đạt |
| 4 | **Trang chủ Dashboard** | Hiển thị lời chào, nút chụp phiếu khám, tóm tắt đơn thuốc | Cỡ chữ to, màu sắc Deep Teal chuẩn Figma, có nút đọc to lời chào | ✅ Đạt |
| 5 | **Chụp & Chọn ảnh phiếu** | Mở máy ảnh hoặc chọn ảnh từ thư viện thiết bị | Trả về URI ảnh, hiển thị preview và nút xác nhận tải lên | ✅ Đạt |
| 6 | **Tải lên & OCR Pipeline** | Gửi FormData lên `/api/v1/documents/upload` | Modal hiển thị tiến trình, AI khử PII và nhận diện chữ bằng PaddleOCR | ✅ Đạt |
| 7 | **Bảng chỉ số sinh hóa** | Tải chi tiết phiếu từ `/api/v1/documents/{id}` | Hiển thị đầy đủ số đo định lượng và kết quả định tính (`neg` $\rightarrow$ Âm tính) | ✅ Đạt |
| 8 | **Đánh giá cờ Cao/Thấp/Bình thường** | Hiển thị StatusBadge | Gán đúng nhãn màu: Đỏ (Cao H), Xanh dương (Thấp L), Xanh lá (Bình thường N) | ✅ Đạt |
| 9 | **Giải thích y khoa RAG** | Thẻ giải thích màu vàng hổ phách từ Supabase | Hiển thị lời giải thích dễ hiểu cho người già kèm trích dẫn tài liệu y khoa | ✅ Đạt |
| 10 | **Đọc to giọng nói TTS** | Bấm nút loa "🔊 Nghe" tại mỗi chỉ số | Tích hợp `expo-speech` tiếng Việt với tốc độ chậm rãi 0.85x | ✅ Đạt |
| 11 | **Lịch sử phiếu khám** | Tra cứu danh sách từ `/api/v1/documents` | Tìm kiếm theo tên viện/ngày, lọc theo Xét nghiệm hoặc Đơn thuốc | ✅ Đạt |
| 12 | **Xu hướng chỉ số SVG** | Xem biểu đồ Glucose, Cholesterol... | Vẽ biểu đồ biến động SVG trực quan kèm dải màu khoảng chuẩn an toàn | ✅ Đạt |
| 13 | **Cài đặt cho người già** | Thay đổi cỡ chữ (100% / 125% / 145%) và tốc độ đọc | PreferencesContext cập nhật toàn ứng dụng | ✅ Đạt |
