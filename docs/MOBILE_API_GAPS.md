# MEDIREAD AI – ĐÁNH GIÁ KHẢ NĂNG ĐÁP ỨNG API (MOBILE API GAPS)

**Dự án:** MediRead AI Mobile App (Expo + React Native)  
**Ngày cập nhật:** 15/11/2026

---

## 1. TỔNG QUAN

Tất cả các API nghiệp vụ cốt lõi của Backend FastAPI hiện tại đã đáp ứng đầy đủ yêu cầu cho Mobile App:
- Đăng nhập, đăng ký và xác thực JWT: Đã hỗ trợ đầy đủ qua `/api/v1/auth`.
- Upload ảnh đa phương thức (Camera/Gallery) và kích hoạt PaddleOCR + RAG: Đã hỗ trợ qua `/api/v1/documents/upload`.
- Lấy kết quả xét nghiệm, phân loại cờ H/L/N và trích xuất lời giải thích RAG: Đã hỗ trợ qua `/api/v1/documents/{id}`.
- Xu hướng xét nghiệm và biểu đồ: Đã hỗ trợ qua `/api/v1/medical/trends`.
- Liên kết người thân và người chăm sóc: Đã hỗ trợ qua `/api/v1/care-links`.

---

## 2. BẢNG SO SÁNH VÀ ĐÁNH GIÁ KHOẢNG TRỐNG (GAP ANALYSIS)

| Chức năng trên Figma / Mobile | API Hiện Có | Trạng thái | Đánh giá & Giải pháp triển khai trên Mobile |
|---|---|---|---|
| **Đăng nhập chọn hồ sơ nhanh** | `GET /api/v1/auth/accounts`<br>`POST /api/v1/auth/login` | ✅ Đầy đủ | Tải danh sách hồ sơ từ Supabase và đăng nhập 1 chạm |
| **Đăng nhập số điện thoại** | `POST /api/v1/auth/login` | ✅ Đầy đủ | Đăng nhập an toàn, cấp JWT HS256 lưu vào Expo SecureStore |
| **Chụp ảnh từ Camera & Gallery** | `POST /api/v1/documents/upload` | ✅ Đầy đủ | Sử dụng `expo-image-picker` đóng gói FormData gửi tới backend |
| **Bảng chỉ số sinh hóa (Định tính + Định lượng)** | `GET /api/v1/documents/{id}` | ✅ Đầy đủ | Hỗ trợ hiển thị số thực, chuỗi định tính (`neg`), huy hiệu xanh/đỏ/xanh dương |
| **Giải thích y khoa RAG** | `GET /api/v1/documents/{id}` (`explanations`) | ✅ Đầy đủ | Trích xuất từ bảng `public.explanations` trên Supabase (ChromaDB + bkai bi-encoder) |
| **Giọng đọc tự động (TTS)** | Tích hợp client-side | ✅ Đầy đủ | Sử dụng thư viện gốc `expo-speech` tiếng Việt (`vi-VN`), không phụ thuộc API ngoài |
| **Biểu đồ xu hướng** | `GET /api/v1/medical/trends` | ✅ Đầy đủ | Vẽ trực tiếp bằng `react-native-svg` (dải chuẩn xanh lá, mốc đo qua các ngày) |
| **Hộp thuốc & Cữ uống thuốc** | Lưu trữ cục bộ & đồng bộ phiếu | ⚠️ Bổ sung sau | Hiện đã có giao diện ghi nhận cữ sáng/tối; có thể kết nối đồng bộ API bảng `dose_logs` khi mở rộng |
| **Trò chuyện y tế AI (Chatbot)** | RAG Engine hiện có | ✅ Sẵn sàng | Sử dụng prompt an toàn từ chối chẩn đoán, giải thích theo dược thư chuẩn HMU |
| **Liên kết người thân** | `GET /api/v1/care-links`<br>`POST /api/v1/care-links/request` | ✅ Đầy đủ | Quản lý kết nối bệnh nhân và người chăm sóc qua Supabase RLS |
