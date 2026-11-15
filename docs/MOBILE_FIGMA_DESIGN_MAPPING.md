# MEDIREAD AI – BẢNG ĐỐI CHIẾU THIẾT KẾ FIGMA (DESIGN MAPPING)


**Tổng số Section:** 7 phân hệ chính | **Tổng số Frame:** 102 frames

---

## 1. HỆ THỐNG MÃ MÀU & TYPOGRAPHY TRÍCH XUẤT TỪ FIGMA

```typescript
export const FigmaTheme = {
  colors: {
    primary: '#0B6B73',        // Deep Medical Teal (Màu nhận diện thương hiệu MediRead)
    primaryDark: '#073F46',    // Dark Navy Teal (Tiêu đề, nút bấm chính, thanh trạng thái)
    primaryLight: '#DDEEEB',   // Soft Mint Border / Background (Viền thẻ, khung nhập)
    primaryPale: '#F2F8F7',    // Light Mint Surface (Nền thẻ thông tin)
    background: '#F8FAFA',     // Canvas Background (Nền tổng thể ứng dụng)
    textMain: '#14283A',       // Slate Navy (Chữ nội dung chính)
    textMuted: '#5B6B77',      // Cool Gray (Chữ phụ, nhãn hướng dẫn)
    white: '#FFFFFF',
    // Cảnh báo & Trạng thái y khoa:
    warningBg: '#FDF1DC',      // Nền cảnh báo
    warningText: '#C2410C',    // Chữ cảnh báo / Cần kiểm tra
    errorBg: '#FEE2E2',        // Nền báo động / Chỉ số CAO
    errorText: '#DC2626',      // Chữ đỏ báo động CAO
    lowBg: '#EFF6FF',          // Nền xanh nhạt / Chỉ số THẤP
    lowText: '#1D4ED8',        // Chữ xanh dương chỉ số THẤP
    successBg: '#DCFCE7',      // Nền xanh lá / Chỉ số BÌNH THƯỜNG
    successText: '#15803D',    // Chữ xanh lá BÌNH THƯỜNG
  },
  typography: {
    fontFamily: 'System',      // Be Vietnam Pro / Inter
    titleLarge: { fontSize: 26, fontWeight: '800', lineHeight: 34 },
    titleMedium: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
    bodyLarge: { fontSize: 17, fontWeight: '600', lineHeight: 24 }, // Tối ưu cho người già
    bodyMedium: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  },
  spacing: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    card: 20,
    button: 16,
    pill: 999,
  }
};
```

---

## 2. BẢNG MAPPING CHI TIẾT TỪ FRAME FIGMA SANG REACT NATIVE

| Phân hệ Figma | Frame ID & Tên trong Figma | Màn hình Mobile (Expo Router) | React Native Component triển khai | Mô tả chức năng & kết nối API |
|---|---|---|---|---|
| **A. Khởi động & Đăng nhập** | `1:65` 01 · Splash — Color | `app/index.tsx` | `SplashScreen.tsx` | Logo MediRead AI, kiểm tra session SecureStore tự động |
| | `1:77` 02 · Giới thiệu 1 | `app/(auth)/onboarding.tsx` | `OnboardingSlider.tsx` | Trượt giới thiệu: Đọc đơn thuốc & phiếu xét nghiệm |
| | `1:132` 04 · Chọn vai trò | `app/(auth)/role-select.tsx` | `RoleSelector.tsx` | Chọn: "Tôi là người bệnh" hoặc "Tôi là người chăm sóc" |
| | `1:179` 05 · Thiết lập chữ & giọng | `app/(auth)/accessibility-setup.tsx` | `AccessibilitySetup.tsx` | Cỡ chữ 100% / 130% / 150%, giọng đọc Bắc/Nam |
| | `1:218` 21 · Nhập mã xác thực | `app/(auth)/login.tsx` | `LoginForm.tsx` | Đăng nhập SĐT hoặc chọn hồ sơ nhanh, gọi `/api/v1/auth/login` |
| | `1:425` 62 · Chọn hồ sơ người dùng | `app/(auth)/select-profile.tsx` | `QuickProfilePicker.tsx` | 1 chạm vào hồ sơ có sẵn trên Supabase |
| **B. Trang chủ** | `1:700` 06 · Trang chủ — Color | `app/(tabs)/index.tsx` | `HomeDashboard.tsx` | Lời chào, nút quét lớn, đơn thuốc trong ngày, chỉ số gần nhất |
| | `1:923` 60 · Chế độ đơn giản | `components/home/SimpleModeCard.tsx`| `SimpleModeCard.tsx` | Chế độ nút to cực đại cho người cao tuổi thị lực kém |
| | `1:1074` 86 · Đã uống đủ hôm nay | `components/home/DoseCompletedBadge.tsx` | `DoseBadge.tsx` | Huy hiệu xanh xác nhận đã uống đủ thuốc |
| **C. Quét & đọc đơn** | `1:1277` 07 · Chụp đơn thuốc | `app/(tabs)/scan.tsx` | `CameraScanner.tsx` | Sử dụng `expo-camera`, khung chữ nhật căn phiếu, bật đèn pin |
| | `1:1564` 24 · Chọn ảnh từ thư viện | `components/scan/LibraryPicker.tsx` | `LibraryPicker.tsx` | Chọn ảnh/PDF bằng `expo-image-picker` |
| | `1:1343` 09 · AI đang xử lý | `components/scan/ProcessingModal.tsx` | `ProcessingModal.tsx` | Vòng quay Radar, hiển thị "Đang khử PII... Đang chạy PaddleOCR..." |
| | `1:1381` 10 · Xác nhận kết quả | `app/document/confirm.tsx` | `DocumentConfirm.tsx` | Cho phép kiểm tra lại trước khi lưu vào bệnh án |
| **D. Giải thích thuốc & RAG**| `1:2339` 12 · Giải thích thuốc | `components/document/MedExplainCard.tsx`| `MedExplainCard.tsx` | Hiển thị tác dụng, cách uống an toàn từ kho dược thư |
| | `1:2445` 17 · Đọc to bằng giọng nói | `components/common/TTSButton.tsx` | `TTSButton.tsx` | Tích hợp `expo-speech` đọc to nội dung với tốc độ 0.8x |
| | `1:2397` 13 · Hỏi AI & an toàn | `app/ai-chat/index.tsx` | `MedicalChatScreen.tsx` | Trò chuyện giải thích xét nghiệm qua Qwen 2.5 |
| **E. Lịch & nhắc thuốc** | `1:3230` Trang 14 · Lịch thuốc | `app/(tabs)/medication.tsx` | `MedicationList.tsx` | Danh sách thuốc: sáng/trưa/chiều/tối, đánh dấu Đã uống |
| | `1:3447` 30 · Lịch tháng | `components/medication/CalendarView.tsx` | `CalendarView.tsx` | Lịch theo dõi tuân thủ uống thuốc |
| **F. Hồ sơ & xét nghiệm** | `1:4729` 18 · Kết quả xét nghiệm | `app/document/[id].tsx` | `LabResultDetail.tsx` | Bảng chỉ số (Định lượng + Định tính), Badge H/L/N, RAG Card |
| | `1:4818` 19 · Lịch sử & hồ sơ | `app/(tabs)/history.tsx` | `HistoryList.tsx` | Danh sách các phiếu đã quét, lọc theo ngày/loại phiếu |
| | `1:4904` 36 · Xu hướng chỉ số | `app/(tabs)/trends.tsx` | `TrendsChart.tsx` | Biểu đồ SVG đường huyết, mỡ máu biến động qua các lần khám |
| **G. Cá nhân & cài đặt** | `1:5588` 20 · Cá nhân & riêng tư | `app/(tabs)/profile.tsx` | `ProfileScreen.tsx` | Thông tin người dùng, đổi cỡ chữ, phân quyền người chăm sóc |
| | `1:5682` 37 · Người thân chăm sóc| `app/care/index.tsx` | `CaregiverLinkScreen.tsx` | Danh sách liên kết bệnh nhân - người nhà qua Supabase |
