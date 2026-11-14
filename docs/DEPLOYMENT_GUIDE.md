# HƯỚNG DẪN TRIỂN KHAI MÁY CHỦ PRODUCTION (DEPLOYMENT GUIDE)
**Quy trình triển khai hệ thống MediRead AI trên máy chủ Linux VPS / Cloud**  
*Hệ điều hành khuyến nghị: Ubuntu 22.04 LTS / Debian 12*  
*Cấu hình tối thiểu: 4 vCPU, 8 GB RAM, 50 GB NVMe SSD (8 vCPU / 16GB RAM nếu chạy Ollama Qwen 7B trên CPU)*

---

## 1. THIẾT LẬP MÁY CHỦ BAN ĐẦU VÀ BẢO MẬT HẠ TẦNG

### 1.1. Tạo người dùng deploy và khóa SSH
```bash
# Đăng nhập máy chủ với quyền root
ssh root@YOUR_SERVER_IP

# Tạo người dùng deploy không có quyền root mặc định
adduser deploy
usermod -aG sudo,docker deploy

# Thiết lập SSH Key cho deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 1.2. Cấu hình Firewall (UFW)
Chỉ mở cổng HTTP (80), HTTPS (443) và SSH (22 hoặc cổng tùy chỉnh). **Tuyệt đối không mở cổng 11434 (Ollama) hoặc 8000 ra ngoài Internet.**
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 1.3. Cài đặt Docker & Docker Compose
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## 2. TRIỂN KHAI MÃ NGUỒN VÀ KHỞI ĐỘNG CÁC SERVICE

### 2.1. Clone mã nguồn và cấu hình biến môi trường
```bash
cd /home/deploy
git clone https://github.com/YOUR_ORG/mediread.git
cd mediread

# Tạo tệp cấu hình production từ mẫu
cp .env.example .env
nano .env  # Cập nhật SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
```

### 2.2. Khởi tạo mô hình Qwen 2.5 7B trong Ollama
```bash
# Khởi động dịch vụ Ollama nội bộ
docker compose -f infra/compose.production.yml up -d ollama

# Tải mô hình Qwen 2.5 7B vào volume nội bộ
docker compose -f infra/compose.production.yml exec ollama ollama pull qwen2.5:7b
```

### 2.3. Khởi động toàn bộ cụm dịch vụ
```bash
docker compose -f infra/compose.production.yml up -d --build
```

### 2.4. Kiểm tra sức khỏe dịch vụ
```bash
# Kiểm tra liveness
curl -f http://localhost/health/live

# Kiểm tra readiness
curl -f http://localhost/health/ready
```

---

## 3. CẤP CHỨNG CHỈ SSL VỚI CERTBOT (HTTPS)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mediread.ai -d api.mediread.ai
```
Chứng chỉ được tự động gia hạn định kỳ qua cron job của Certbot.
