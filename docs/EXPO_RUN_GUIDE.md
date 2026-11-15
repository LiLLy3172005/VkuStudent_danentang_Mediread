# HƯỚNG DẪN CHẠY ỨNG DỤNG EXPO MOBILE (EXPO RUN GUIDE)

**Ứng dụng:** MediRead AI Mobile App  
**Công nghệ:** Expo SDK 58 • React Native 0.88 • TypeScript • Expo Router

---

## 1. YÊU CẦU MÔI TRƯỜNG

- **Node.js**: Phiên bản 18+ (Đã cài đặt Node v24.15.0).
- **Điện thoại**: Android hoặc iOS đã cài ứng dụng **Expo Go** từ Google Play Store hoặc Apple App Store.
- **Mạng kết nối**: Máy tính chạy backend và điện thoại di động phải kết nối vào **cùng một mạng Wi-Fi**.

---

## 2. CẤU HÌNH ĐỊA CHỈ IP BACKEND

File cấu hình môi trường nằm tại `mobile/.env`:

```env
# Địa chỉ IP mạng LAN của máy tính phát triển (để điện thoại thật truy cập được)
EXPO_PUBLIC_API_URL=http://172.16.0.2:8000
```

> **Mẹo**: Nếu bạn đổi mạng Wi-Fi khác, hãy mở PowerShell chạy lệnh `ipconfig` để lấy địa chỉ IPv4 mới và cập nhật lại vào `mobile/.env`.

---

## 3. CÁC BƯỚC KHỞI ĐỘNG ỨNG DỤNG

### Bước 1: Đảm bảo Backend FastAPI đang chạy
Mở terminal 1 tại thư mục `apps/api`:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Bước 2: Khởi động Metro Bundler của Expo
Mở terminal 2 tại thư mục `mobile`:
```bash
cd mobile
npx expo start -c
```
*(Cờ `-c` giúp xóa sạch cache để nạp cấu hình mới nhất).*

### Bước 3: Mở trên điện thoại di động
- **Android**: Mở ứng dụng **Expo Go**, chọn **Scan QR code** và quét mã QR hiển thị trên màn hình terminal.
- **iOS**: Mở ứng dụng Camera mặc định của iPhone, hướng vào mã QR và bấm vào liên kết mở trong Expo Go.
- **Giả lập Android Emulator**: Nhấn phím `a` trên terminal.
- **Trình duyệt Web để xem trước**: Nhấn phím `w` trên terminal.

---

## 4. CÁCH ĐÓNG GÓI BẢN CÀI ĐẶT ANDROID (BUILD APK)

Nếu muốn tạo file `.apk` cài trực tiếp lên điện thoại mà không cần chạy Expo Go:

1. Cài đặt EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Đăng nhập tài khoản Expo:
   ```bash
   eas login
   ```
3. Cấu hình bản build preview dạng APK:
   ```bash
   eas build:configure
   ```
4. Chạy lệnh build APK:
   ```bash
   eas build --platform android --profile preview
   ```
   Sau khi hoàn tất, bạn sẽ nhận được đường link tải trực tiếp file `.apk` về điện thoại.
