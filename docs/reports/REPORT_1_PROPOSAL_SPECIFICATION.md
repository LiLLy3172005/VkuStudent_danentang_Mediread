# [REPORT 1] ĐỀ XUẤT ĐỀ TÀI, YÊU CẦU NGHIỆP VỤ & FIGMA INTERACTIVE PROTOTYPE (M1 - 10%)
**Học phần:** Phát triển Ứng dụng Di động Đa nền tảng (Cross-Platform Mobile App Development)  
**Khoa:** Khoa học Máy tính — Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU)  
**Giảng viên phụ trách:** TS. Nguyễn Thanh Tuấn  
**Tên đề tài (Tiếng Việt):** Ứng dụng di động MediRead AI — Số hóa, giải thích phiếu xét nghiệm, đơn thuốc y khoa và trợ lý Bác sĩ AI bằng Trí tuệ Nhân tạo  
**Tên đề tài (Tiếng Anh):** MediRead AI — Cross-Platform Mobile Application for Medical Document Digitization, Lab Result Explanation and On-Device AI Health Consultation  
**Tên nhóm:** Nhóm 04 - MediRead Team • **Năm học:** Học kỳ 1 (2026 - 2027)

---

## 1. ĐỘNG LỰC ĐỀ TÀI & BỐI CẢNH THỰC TIỄN (PROJECT MOTIVATION & PROBLEM STATEMENT)
### 1.1. Bối cảnh & Vấn đề thực tế
Tại Việt Nam, sau mỗi lần đi khám tại bệnh viện hoặc phòng khám, bệnh nhân và người nhà thường nhận về các tài liệu giấy:
1. **Phiếu kết quả xét nghiệm sinh hóa / huyết học:** Chứa hàng loạt thuật ngữ viết tắt tiếng Anh (như AST, ALT, Creatinin, Glucose, eGFR, HbA1c...), các con số kèm đơn vị đo phức tạp và ký hiệu cờ cảnh báo (H - High, L - Low, *). Đa số người bệnh, đặc biệt là người cao tuổi, không hiểu được ý nghĩa các chỉ số này và cảm thấy hoang mang, lo lắng.
2. **Đơn thuốc viết tay hoặc in dạng mã:** Người bệnh cao tuổi thường gặp khó khăn trong việc ghi nhớ liều lượng, giờ uống thuốc cụ thể (sáng/trưa/chiều/tối), cũng như không nắm rõ công dụng và các lưu ý chống chỉ định.
3. **Quá tải tại cơ sở y tế:** Bác sĩ thường chỉ có 3–5 phút cho mỗi lượt khám nên không đủ thời gian giải thích cặn kẽ từng chỉ số xét nghiệm cho bệnh nhân.

**MediRead AI** ra đời nhằm giải quyết triệt để vấn đề này bằng cách tận dụng công nghệ di động đa nền tảng kết hợp Trí tuệ Nhân tạo:
* Cho phép chụp ảnh phiếu xét nghiệm hoặc đơn thuốc trực tiếp từ điện thoại.
* Tự động trích xuất bảng chỉ số bằng OCR y khoa.
* Ánh xạ và đối chiếu với khoảng tham chiếu sinh lý học chuẩn Việt Nam.
* Cung cấp lời giải thích bằng ngôn ngữ giản dị, gần gũi, kèm giọng đọc nhân tạo (Text-to-Speech) và tính năng trò chuyện trực tiếp với "Bác Sĩ AI".

### 1.2. Chân dung Người dùng Mục tiêu (Target User Personas)
* **Persona 1 - Người cao tuổi có bệnh nền mạn tính (Primary):**
  * *Độ tuổi:* 55 – 75 tuổi.
  * *Đặc điểm:* Thị lực giảm, mắt mờ, trí nhớ suy giảm, dễ nhầm lẫn giờ uống thuốc, không rành công nghệ phức tạp.
  * *Nhu cầu cốt lõi:* Cần giao diện chữ to, icon rõ ràng, nút bấm to bản, màu sắc tương phản cao, hỗ trợ đọc to bằng giọng nói tiếng Việt, giải thích y khoa dễ hiểu như lời bác sĩ trò chuyện.
* **Persona 2 - Người con/cháu chăm sóc người thân (Caregiver):**
  * *Độ tuổi:* 22 – 45 tuổi.
  * *Nhu cầu cốt lõi:* Theo dõi xu hướng chỉ số sức khỏe của cha mẹ theo thời gian (biểu đồ đường huyết, chức năng gan, thận), lưu trữ lịch sử phiếu khám tập trung để tiện tra cứu khi đưa người thân đi tái khám.

### 1.3. User Story Tiêu biểu
* *"Là một bệnh nhân cao tuổi vừa nhận phiếu xét nghiệm từ bệnh viện, tôi muốn mở ứng dụng, bấm nút chụp ảnh phiếu khám để hệ thống tự động đọc và giải thích bằng lời nói xem chỉ số men gan của tôi có bị cao không và tôi cần ăn uống kiêng cữ những gì."*
* *"Là một người chăm sóc cha mẹ già, tôi muốn xem biểu đồ xu hướng Creatinin và Đường huyết của bố trong 6 tháng qua để biết chức năng thận của bố có ổn định hay không."*

---

## 2. PHẠM VI HỆ THỐNG & ĐẶC TẢ YÊU CẦU NGHIỆP VỤ (SYSTEM SCOPE & FUNCTIONAL SPECIFICATIONS)

| STT | Phân hệ (Module) | Tính năng chi tiết | Mức ưu tiên | Mô tả nghiệp vụ & Phạm vi kỹ thuật |
|:---:|---|---|:---:|---|
| **1** | **Xác thực & Bảo mật (Auth & Security)** | Đăng nhập SĐT + Mật khẩu, JWT token, Bảo mật thông tin | **Must-Have** | Xác thực qua Supabase Auth + JWT HS256. Ẩn thông tin nhạy cảm, bảo vệ quyền riêng tư người bệnh theo HIPAA/GDPR principles. |
| **2** | **Quét & Số hóa (Document Scan & OCR)** | Chụp ảnh camera, upload ảnh phiếu xét nghiệm / đơn thuốc | **Must-Have** | Tích hợp Camera di động, chọn ảnh từ thư viện, tiền xử lý ảnh và gửi phân tích OCR bảng chỉ số. |
| **3** | **Chi tiết & Diễn giải (Clinical Detail & Insights)** | Hiển thị bảng chỉ số sinh hóa, cờ báo động (H/L/Normal), lời khuyên | **Must-Have** | Phân loại chỉ số, gắn cờ cảnh báo trực quan màu sắc (Đỏ: Cao, Vàng: Thấp, Xanh: Bình thường). Diễn giải theo ngôn ngữ bình dân. |
| **4** | **Trợ lý Bác sĩ AI (AI Doctor Consultation)** | Chatbot y khoa hỏi đáp trực tiếp, gợi ý câu hỏi thông minh, đọc TTS | **Must-Have** | Kết nối trực tiếp mô hình ngôn ngữ lớn (Qwen 2.5 7B Local RAG / Gemini Flash fallback) để trả lời trúng trọng tâm câu hỏi của người bệnh. |
| **5** | **Xu hướng Sức khỏe (Health Trends)** | Biểu đồ biến thiên các chỉ số theo dòng thời gian (Creatinin, Glucose, AST...) | **Should-Have** | Vẽ biểu đồ trực quan, theo dõi tiến triển sức khỏe qua các lần xét nghiệm định kỳ. |
| **6** | **Lịch sử Hồ sơ (Medical History)** | Danh sách phiếu khám đã lưu, tìm kiếm, lọc theo ngày tháng và bệnh viện | **Should-Have** | Lưu trữ hồ sơ y tế tập trung, đồng bộ đám mây Supabase PostgreSQL. |
| **7** | **Đồng bộ Ngoại tuyến (Offline Resilience)** | Lưu cache cục bộ, cho phép xem lại hồ sơ khi mất mạng 4G/Wifi | **Should-Have** | Lưu trữ AsyncStorage / SQLite cục bộ, tự động đồng bộ khi có kết nối trở lại. |

---

## 3. TECH STACK & KIẾN TRÚC BAN ĐẦU (TECH STACK & INITIAL ARCHITECTURE)

### 3.1. Danh mục Công nghệ Lựa chọn
* **Mobile Client Framework:** **React Native & Expo (SDK 58 / React Native 0.88)** với **TypeScript** 100% Type-Safety.
* **Kiến trúc Di động:** Clean Architecture phân tách rõ 3 tầng: Presentation Layer (UI & Zustand Stores), Domain Layer (Use Cases & Types), Data Layer (API Client & Storage).
* **Quản trị Trạng thái (State Management):** **Zustand** kết hợp AsyncStorage cho hiệu năng cực nhẹ, tối ưu bộ nhớ di động.
* **Backend API Gateway:** **FastAPI (Python 3.10+)** chuẩn ASGI, xử lý bất đồng bộ (async/await), Pydantic validation và tự động sinh OpenAPI/Swagger.
* **Cơ sở Dữ liệu & Lưu trữ Đám mây:** **Supabase PostgreSQL** kết hợp Row-Level Security (RLS) và Storage Buckets lưu trữ ảnh y tế đã làm mờ thông tin cá nhân.
* **Trí tuệ Nhân tạo (AI & RAG Engine):**
  * *OCR Engine:* PaddleOCR v3 cục bộ kết hợp bóc tách bảng đa cột.
  * *Vector Database:* ChromaDB lưu trữ tri thức sách y khoa và dược thư (bkai-foundation-models/vietnamese-bi-encoder).
  * *Local LLM:* **Qwen 2.5 7B** chạy trên hạ tầng Ollama cục bộ, đảm bảo bảo mật và quyền riêng tư y tế.

### 3.2. Đường link Figma Interactive Prototype
* **🔗 Figma Prototype URL:** `https://www.figma.com/design/mediread-ai-elderly-ui-prototype` *(Đã thiết kế chuẩn Design System cho người lớn tuổi: font Inter cỡ lớn, độ tương phản WCAG AAA, tối thiểu 8 luồng màn hình chính: Auth, Dashboard, Camera Scanner, Analysis Waiting, Document Detail, AI Doctor Chat, Trends Analytics, Profile).*
* **🔗 GitHub Repository:** `https://github.com/LiLLy3172005/VkuStudent_danentang_Mediread.git`
