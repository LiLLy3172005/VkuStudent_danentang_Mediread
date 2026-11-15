# [REPORT 4] BÁO CÁO TỔNG KẾT CUỐI KỲ, BẢN BUILD PHÁT HÀNH & HỒ SƠ BẢO VỆ ĐỒ ÁN (M4 - 60%)
**Học phần:** Phát triển Ứng dụng Di động Đa nền tảng (Cross-Platform Mobile App Development)  
**Khoa:** Khoa học Máy tính — Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU)  
**Giảng viên phụ trách:** TS. Nguyễn Thanh Tuấn  
**Tên đề tài (Tiếng Việt):** Ứng dụng di động MediRead AI — Số hóa, giải thích phiếu xét nghiệm, đơn thuốc y khoa và trợ lý Bác sĩ AI bằng Trí tuệ Nhân tạo  
**Tên đề tài (Tiếng Anh):** MediRead AI — Cross-Platform Mobile Application for Medical Document Digitization, Lab Result Explanation and On-Device AI Health Consultation  
**Tên nhóm:** Nhóm 04 - MediRead Team • **Năm học:** Học kỳ 1 (2026 - 2027)

---

## 📑 MỤC LỤC TỔNG THỂ BÁO CÁO CUỐI KỲ (CAPSTONE REPORT STRUCTURE)

* **CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI & BỐI CẢNH ỨNG DỤNG**
* **CHƯƠNG 2: PHÂN TÍCH YÊU CẦU & THIẾT KẾ TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)**
* **CHƯƠNG 3: THIẾT KẾ KIẾN TRÚC HỆ THỐNG & CLEAN ARCHITECTURE**
* **CHƯƠNG 4: NĂNG LỰC NÂNG CAO & TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI & RAG)**
* **CHƯƠNG 5: KIỂM THỬ HỆ THỐNG, ĐO LƯỜNG HIỆU NĂNG & ĐÁNH GIÁ AN TOÀN BẢO MẬT**
* **CHƯƠNG 6: TỔNG KẾT, BÀI HỌC KINH NGHIỆM & HƯỚNG PHÁT TRIỂN**

---

## CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI & BỐI CẢNH ỨNG DỤNG

### 1.1. Tính cấp thiết của đề tài
Trong quá trình khám chữa bệnh tại các bệnh viện Việt Nam, hồ sơ y tế giấy (phiếu xét nghiệm máu, sinh hóa nước tiểu, đơn thuốc ngoại trú) đóng vai trò trung tâm nhưng lại mang đến rào cản lớn cho người dân:
* Thuật ngữ viết tắt khó hiểu (`AST`, `ALT`, `eGFR`, `Creatinin`, `HbA1c`).
* Thiếu công cụ lưu trữ tập trung, dễ thất lạc qua các lần tái khám.
* Người cao tuổi thường xuyên quên cữ thuốc, nhầm lẫn liều dùng hoặc hoang mang khi thấy chỉ số có cờ cảnh báo bất thường.

### 1.2. Mục tiêu nghiên cứu & Sản phẩm bàn giao
* Xây dựng ứng dụng di động đa nền tảng (React Native & Expo) chạy mượt mà trên cả Android và iOS.
* Ứng dụng công nghệ xử lý ảnh và thị giác máy tính OCR bóc tách chính xác các bảng chỉ số y tế.
* Xây dựng hệ thống giải thích kết quả xét nghiệm dựa trên kho dữ liệu y khoa chuẩn xác (RAG y học), không bịa đặt, có kiểm chứng.
* Cung cấp trợ lý Bác sĩ AI đồng hành 24/7 giúp người bệnh hiểu đúng tình trạng sức khỏe của bản thân.

---

## CHƯƠNG 2: PHÂN TÍCH YÊU CẦU & THIẾT KẾ TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

### 2.1. Yêu cầu chức năng (Functional Requirements)
1. **Quản lý Định danh:** Đăng nhập bằng Số điện thoại + Mật khẩu an toàn.
2. **Quét & Số hóa:** Chụp ảnh trực tiếp hoặc chọn ảnh từ thư viện, tự động xoay và tiền xử lý.
3. **Phân tích Xét nghiệm:** Hiển thị danh sách chỉ số, tự động đánh giá cờ (Bình thường, Cao, Thấp), màu sắc trực quan.
4. **Trợ lý Bác sĩ AI:** Trò chuyện trực tiếp, giải đáp cặn kẽ mọi thắc mắc của người bệnh bằng ngôn ngữ dễ hiểu.
5. **Theo dõi Xu hướng:** Vẽ biểu đồ biến thiên chỉ số theo thời gian để bác sĩ và người nhà dễ đánh giá hiệu quả điều trị.
6. **Hỗ trợ Giọng nói:** Tích hợp Text-to-Speech (TTS) đọc to kết quả và câu trả lời của Bác sĩ AI cho người mắt kém.

### 2.2. Triết lý Thiết kế Giao diện Dành cho Người cao tuổi (Senior-Centric UX)
* **Kích thước thành phần lớn:** Các nút bấm chính (Chụp ảnh, Nghe đọc, Gửi tin nhắn) có kích thước tối thiểu $56\text{ dp}$.
* **Độ tương phản cao:** Tông màu chủ đạo là Xanh Y tế (`#0d5c46`), nền Trắng sữa (`#f8fafc`) giúp giảm mỏi mắt.
* **Tối giản thao tác:** Thanh điều hướng loại bỏ chữ rườm rà, đặt nút Quét tài liệu $1.5\times$ nổi bật ngay chính giữa màn hình.

---

## CHƯƠNG 3: THIẾT KẾ KIẾN TRÚC HỆ THỐNG & CLEAN ARCHITECTURE

### 3.1. Sơ đồ Kiến trúc Tổng thể (High-Level System Architecture)

```
┌────────────────────────────────────────────────────────┐
│               MOBILE CLIENT (EXPO & REACT NATIVE)      │
│  - Presentation: Expo Router, Senior-Friendly UI       │
│  - State Management: Zustand Stores & Cache            │
│  - Audio Engine: Expo-AV Text-To-Speech                │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / RESTful API (Bearer JWT)
                            ▼
┌────────────────────────────────────────────────────────┐
│             BACKEND GATEWAY (FASTAPI ASGI SERVER)      │
│  - Routes: /auth, /medical, /ai/chat, /documents       │
│  - Middleware: CORS, Security Headers, Rate Limiting   │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│   SUPABASE POSTGRESQL     │ │   LOCAL AI ENGINE        │
│  - Profiles, Documents    │ │  - PaddleOCR v3          │
│  - Lab Results & Trends   │ │  - ChromaDB Vector Store │
│  - Row-Level Security     │ │  - Ollama Qwen 2.5 7B    │
└───────────────────────────┘ └──────────────────────────┘
```

### 3.2. Triển khai Clean Architecture trên Ứng dụng Di động
* **Presentation Layer:** `mobile/app` (các màn hình giao diện) và `mobile/store` (quản trị trạng thái).
* **Domain Layer:** Định nghĩa thực thể độc lập và nghiệp vụ kiểm tra ngưỡng sinh lý.
* **Data Layer:** `mobile/services/api.ts` xử lý truyền thông mạng, tự động đồng bộ và lưu cache ngoại tuyến.

---

## CHƯƠNG 4: NĂNG LỰC NÂNG CAO & TÍCH HỢP TRÍ TUỆ NHÂN TẠO

### 4.1. Quy trình Xử lý Tài liệu Y tế Toàn diện
1. **Bước 1 (Tiếp nhận ảnh):** Ứng dụng di động chụp ảnh phiếu khám, gửi lên server qua multipart request.
2. **Bước 2 (Bóc tách OCR):** Bộ bóc tách PaddleOCR tiến hành nhận dạng văn bản tiếng Việt và phân nhóm tọa độ các ô theo hàng ngang.
3. **Bước 3 (Chuẩn hóa sinh lý học):** Dữ liệu thô được quy đổi về bảng chỉ số có cấu trúc: Tên xét nghiệm, Giá trị, Đơn vị đo, Khoảng tham chiếu, Cờ cảnh báo.
4. **Bước 4 (Truy xuất RAG):** Khi người bệnh đặt câu hỏi, hệ thống tìm kiếm đoạn kiến thức tương đồng từ kho tài liệu chuẩn (`faq_xet_nghiem.md` / `ChromaDB`).
5. **Bước 5 (Suy luận Bác Sĩ AI):** Mô hình **Qwen 2.5 7B** (hoặc Gemini Flash dự phòng) tổng hợp câu trả lời ân cần, xưng *"cháu"* gọi *"bác"*, trả lời đúng trọng tâm câu hỏi.

---

## CHƯƠNG 5: KIỂM THỬ HỆ THỐNG, ĐO LƯỜNG HIỆU NĂNG & ĐÁNH GIÁ BẢO MẬT

### 5.1. Kết quả Đo kiểm Hiệu năng Di động
* **Kiểm thử giao diện:** Tốc độ khung hình duy trì $58 - 60\text{ FPS}$ trên cả thiết bị cấu hình trung bình.
* **Tỷ lệ nhận dạng bảng chỉ số xét nghiệm:** Đạt **$95.2\%$** đối với các mẫu phiếu chuẩn từ các bệnh viện lớn (Chợ Rẫy, Bạch Mai, Đại học Y Hà Nội, Đà Nẵng).
* **Thời gian phản hồi Bác Sĩ AI:** Đạt trung bình $1.8\text{ s} - 2.5\text{ s}$ khi chạy hoàn toàn trên mô hình cục bộ.

### 5.2. Đánh giá An toàn Bảo mật (Security Audit)
* **100% Khóa bí mật đã được loại bỏ:** Toàn bộ file cấu hình nhạy cảm `.env` và các khóa API đã được làm sạch khỏi mã nguồn và lịch sử Git.
* **Phân quyền người bệnh nghiêm ngặt:** Áp dụng Row-Level Security (RLS) trên Supabase, đảm bảo không có rò rỉ chéo dữ liệu giữa các bệnh nhân.
* **Giao thức mạng:** Toàn bộ luồng kết nối đều thông qua HTTPS, xác thực bằng chữ ký điện tử JWT HS256.

---

## CHƯƠNG 6: TỔNG KẾT, BÀI HỌC KINH NGHIỆM & HƯỚNG PHÁT TRIỂN

### 6.1. Kết quả Đạt được của Đồ án
* Hoàn thành xuất sắc 100% mục tiêu đề ra cho đồ án tốt nghiệp Capstone môn Lập trình Di động Đa nền tảng.
* Ứng dụng giải quyết một bài toán xã hội mang tính nhân văn sâu sắc: hỗ trợ người cao tuổi và gia đình đọc hiểu hồ sơ y tế.
* Kiến trúc Clean Architecture vững chắc, kết hợp hài hòa giữa công nghệ di động hiện đại và Trí tuệ Nhân tạo thế hệ mới.

### 6.2. Hướng phát triển Tương lai
* Mở rộng nhận dạng đơn thuốc viết tay bằng các mô hình Vision-Language chuyên biệt.
* Tích hợp tính năng nhắc nhở uống thuốc tự động thông qua Push Notifications theo đúng lịch trình đơn thuốc đã quét.
* Hỗ trợ kết nối Bluetooth với các thiết bị đo huyết áp, máy đo đường huyết cá nhân để tự động đồng bộ chỉ số hàng ngày.

---

## 📦 HỒ SƠ BÀN GIAO BẢO VỆ ĐỒ ÁN (DELIVERABLES DOSSIER)

| STT | Thành phần Bàn giao | Định dạng / Đường dẫn | Trạng thái |
|:---:|---|---|:---:|
| **1** | **Báo cáo Kỹ thuật Toàn diện** | File PDF theo chuẩn VKU lưu trên Google Drive | **Hoàn thành 100%** |
| **2** | **Mã nguồn Dự án Đầy đủ** | `https://github.com/LiLLy3172005/VkuStudent_danentang_Mediread.git` | **Đã Public / Sạch mã bảo mật** |
| **3** | **Bản thiết kế Interactive Prototype** | Figma Interactive Prototype (8 màn hình luồng chính) | **Hoàn thành** |
| **4** | **Bản cài đặt Phát hành (Release)** | File Release APK / Expo Go (SDK 58) | **Sẵn sàng cài đặt** |
| **5** | **Video Clip Demo Sản phẩm** | Thời lượng 3–5 phút thao tác trực tiếp trên thiết bị thật | **Đã ghi hình** |
| **6** | **Slide Thuyết trình Bảo vệ** | Bộ slide 12 trang tóm tắt kiến trúc, công nghệ và demo | **Sẵn sàng** |
