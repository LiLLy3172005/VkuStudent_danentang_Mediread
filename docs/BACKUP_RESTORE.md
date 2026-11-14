# QUY TRÌNH SAO LƯU & KHÔI PHỤC DỮ LIỆU (BACKUP & RESTORE RUNBOOK)
**Quy trình khôi phục thảm họa (Disaster Recovery) cho MediRead AI**

---

## 1. MỤC TIÊU KHÔI PHỤC
- **RPO (Recovery Point Objective)**: $\le 6\text{ giờ}$ (Tối đa 6 giờ dữ liệu có thể phải nhập lại nếu xảy ra thảm họa toàn bộ trung tâm dữ liệu).
- **RTO (Recovery Time Objective)**: $\le 1\text{ giờ}$ (Thời gian tối đa để dựng lại hệ thống hoạt động bình thường).

---

## 2. QUY TRÌNH SAO LƯU ĐỊNH KỲ

### 2.1. Sao lưu Cơ sở Dữ liệu PostgreSQL
Supabase cung cấp Point-in-Time Recovery (PITR) tự động. Ngoài ra, tiến hành dump logic hàng ngày:
```bash
# Script sao lưu tự động (chạy qua cron job 02:00 sáng hàng ngày)
export PGPASSWORD="YOUR_DB_PASSWORD"
BACKUP_FILE="/backups/postgres/mediread_db_$(date +%Y%m%d_%H%M%S).sql.gz"

pg_dump -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres | gzip > "$BACKUP_FILE"

# Đồng bộ tệp backup sang kho lưu trữ đám mây cô lập (AWS S3 Glacier hoặc Cloudflare R2)
rclone copy "$BACKUP_FILE" remote_secure_backup:mediread-backups/database/
```

### 2.2. Sao lưu Object Storage (Ảnh phiếu khám)
```bash
# Sao lưu các tệp ảnh trong bucket documents
rclone sync supabase_storage:documents remote_secure_backup:mediread-backups/storage/
```

---

## 3. QUY TRÌNH DIỄN TẬP KHÔI PHỤC (DISASTER RECOVERY)

Khi xảy ra sự cố hỏng dữ liệu hoặc mất máy chủ:
1. **Dựng máy chủ VPS mới**: Cài đặt Docker và Docker Compose theo `DEPLOYMENT_GUIDE.md`.
2. **Khôi phục cấu trúc bảng**:
   ```bash
   gunzip -c /backups/postgres/mediread_db_LATEST.sql.gz | psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres
   ```
3. **Khôi phục tệp ảnh Storage**:
   ```bash
   rclone sync remote_secure_backup:mediread-backups/storage/ supabase_storage:documents
   ```
4. **Kiểm tra tính toàn vẹn quan hệ (Integrity Smoke Test)**:
   - Đăng nhập 2 tài khoản thử nghiệm Patient A và Patient B.
   - Xác nhận Patient A xem được ảnh phiếu của mình.
   - Xác nhận Patient B bị từ chối 403 khi xem tài liệu của Patient A.
   - Xác nhận Caregiver accepted xem được đúng hồ sơ ủy quyền.
