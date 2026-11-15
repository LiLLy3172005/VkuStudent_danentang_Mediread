# CHECKLIST PHÁT HÀNH ỨNG DỤNG MOBILE (RELEASE CHECKLIST)

**Dự án:** MediRead AI Mobile App  
**Phiên bản:** 2.0.0 (Production Candidate)

---

## 1. THIẾT KẾ VÀ TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)
- [x] Đã trích xuất và sử dụng chuẩn xác hệ màu nhận diện từ Figma: Deep Medical Teal (`#0B6B73`), Dark Navy (`#073F46`), Soft Mint (`#DDEEEB`), Background Canvas (`#F8FAFA`).
- [x] Đã thiết kế vùng chạm tối thiểu 48x48px cho người cao tuổi theo tiêu chuẩn WCAG AAA.
- [x] Hỗ trợ chuyển đổi linh hoạt kích thước phông chữ: 100% (Chuẩn), 125% (Lớn), 145% (Rất lớn).
- [x] Tích hợp nút nghe đọc to bằng giọng nói tiếng Việt (Text-to-Speech) tại tất cả các chỉ số quan trọng và lời giải thích y khoa.
- [x] Đã thiết lập thanh điều hướng đáy (Bottom Tabs) nổi bật với nút chụp ảnh trung tâm.

## 2. KỸ THUẬT VÀ NỀN TẢNG (ENGINEERING)
- [x] Sử dụng 100% React Native gốc với Expo SDK và TypeScript (không dùng webview giả lập).
- [x] Cấu trúc định tuyến hiện đại sử dụng Expo Router (`app/`).
- [x] Quản lý session và JWT an toàn bằng `expo-secure-store`.
- [x] Gọi API RESTful chuẩn đa nền tảng kết nối trực tiếp vào FastAPI Backend và Supabase Database.
- [x] Xử lý upload ảnh đa phương tiện (Camera và Thư viện ảnh) với thanh hiển thị tiến trình AI.
- [x] Kiểm tra tĩnh `npx tsc --noEmit` đạt 0 lỗi.

## 3. BẢO MẬT VÀ QUYỀN RIÊNG TƯ (DEVSECOPS)
- [x] Khử định danh PII: Tự động che mờ thông tin cá nhân và mã vạch trước khi xử lý.
- [x] Không lưu trữ token dạng plain text; lưu trữ an toàn trong Secure Enclave / KeyStore.
- [x] Không hardcode secret keys hay Service Role Key trong bundle Mobile.
- [x] Phân quyền chặt chẽ giữa Bệnh nhân và Người chăm sóc thông qua cơ chế Row Level Security (RLS).

## 4. BẢO ĐẢM TÍNH TOÀN VẸN CỦA HỆ THỐNG
- [x] Ứng dụng Web Next.js 15 (`apps/web`) vẫn build và chạy độc lập hoàn hảo, không bị xung đột mã nguồn.
- [x] Backend FastAPI (`apps/api`) phục vụ đồng thời cả Web và Mobile.
- [x] Cơ sở dữ liệu Supabase đồng bộ thời gian thực giữa hai nền tảng.
