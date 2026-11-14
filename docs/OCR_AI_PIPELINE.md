# ĐẶC TẢ CHI TIẾT PIPELINE OCR & TRÍ TUỆ NHÂN TẠO Y KHOA
**Tài liệu kỹ thuật AI/ML Pipeline: Từ ảnh quét đến dữ liệu chuẩn hóa**  
*Phiên bản: 2.0.0*

---

## 1. QUY TRÌNH XỬ LÝ DỮ LIỆU ĐA TẦNG (PIPELINE WORKFLOW)

```
[Ảnh phiếu khám] 
       │
       ▼
1. Image Validation (MIME, Magic Bytes, Pixel Count <= 40MP, EXIF Transpose)
       │
       ▼
2. PII Masking (OpenCV Contours & PyZbar: Che mã vạch, số CCCD, tên bệnh nhân)
       │
       ▼
3. PaddleOCR Engine (Bóc tách văn bản, Bounding Boxes, Sửa góc nghiêng, Dò hàng cong)
       │
       ▼
4. Qwen 2.5 7B LLM (Prompt có cấu trúc, format JSON, Pydantic Schema Validation)
       │
       ▼
5. Lab Normalizer & Provenance Engine:
   - Xử lý số học tiếng Việt: "3,9" -> 3.9; "4,000" -> 4000.0
   - Xử lý đơn vị: "umo1/L" -> "µmol/L"; "109/L" -> "10^9/L"
   - Ưu tiên khoảng chuẩn in trên phiếu (`reference_source = 'printed_report'`)
   - Bổ sung khoảng chuẩn nội bộ HMU nếu phiếu mờ (`reference_source = 'internal_kb'`)
   - Phân loại cờ: HIGH / LOW / NORMAL / UNKNOWN (Không mặc định normal)
       │
       ▼
6. Quality Gate & Human-in-the-Loop Review (Gắn cờ needs_review nếu độ tin cậy < 60%)
       │
       ▼
7. Safe RAG Medical Explainer (Tra cứu ChromaDB, giải thích giáo dục, loại trừ chẩn đoán)
```

---

## 2. NGUYÊN TẮC XỬ LÝ KHOẢNG THAM CHIẾU VÀ ĐỘ TUỔI / GIỚI TÍNH

### 2.1. Không giả định tuổi và giới tính
- Trước đây, hệ thống mặc định `PATIENT_IS_CHILD = False` khi không rõ tuổi. Điều này dẫn đến sai lầm y khoa khi các chỉ số như Phospho có khoảng chuẩn trẻ em ($1.3 - 2.2\text{ mmol/L}$) khác xa người lớn ($0.9 - 1.5\text{ mmol/L}$).
- Hệ thống mới quy định: `age_group: adult | child | unknown`. Khi `unknown`, hệ thống **tuyệt đối không chọn khoảng chuẩn người lớn hay trẻ em**, đánh dấu trạng thái `quality_status: needs_review` và yêu cầu xác nhận.

### 2.2. Ưu tiên tuyệt đối khoảng chuẩn in trên phiếu
Mỗi máy xét nghiệm và phòng xét nghiệm có hóa chất và ngưỡng tham chiếu khác nhau.
- Nếu trên phiếu có in khoảng tham chiếu đọc được (ví dụ `4.0 - 7.0 mmol/L`), hệ thống ưu tiên sử dụng khoảng này.
- Bảng tham chiếu nội bộ (`INTERNAL_REFERENCE_KB`) chỉ được sử dụng khi khoảng in trên phiếu bị mất dấu hoặc mờ hoàn toàn, và bắt buộc phải lưu cờ nguồn `reference_source = 'internal_kb'`.

### 2.3. Không mặc định giá trị thiếu là NORMAL
- Nếu một chỉ số không parse được số, hoặc không xác định được khoảng chuẩn, trạng thái cờ bắt buộc là `UNKNOWN`.
- Cấm tuyệt đối việc gán cờ `NORMAL` hoặc để lọt vào nhánh `LOW` khi thiếu thông tin.

---

## 3. THUẬT TOÁN DÒ HÀNG THEO ĐỘ DỐC VÀ ĐỘ CONG BẢNG (CURVED-ROW TRACING)
Khi người bệnh chụp ảnh bằng điện thoại, giấy xét nghiệm thường bị cong ở giữa hoặc nghiêng một góc. Cách gom hàng theo ngưỡng tọa độ $y$ cố định sẽ làm ô tên xét nghiệm ở dòng trên bị ghép nhầm với ô kết quả của dòng dưới.

Thuật toán `_trace_rows` trong `worker/ocr/engine.py` giải quyết vấn đề này bằng cách:
1. Xác định các ô neo (Anchor cells) ở lề trái (tên xét nghiệm).
2. Đo góc xoay trung vị của các khối chữ và hiệu chỉnh tọa độ $y' = y \cos(\alpha) - x \sin(\alpha)$.
3. Tính khoảng cách trung vị giữa các dòng ($median\_h$).
4. Kế thừa độ dốc hàng (Slope propagation) từ trái sang phải: $pred\_y = last\_y + slope \times (cx - last\_x)$ để dò chính xác các ô cùng hàng dù giấy bị cong.
