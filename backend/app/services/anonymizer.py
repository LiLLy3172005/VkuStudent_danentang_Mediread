import os
import re
import cv2
import numpy as np
import pytesseract
from pytesseract import Output
from pyzbar.pyzbar import decode

# Đường dẫn Tesseract mặc định trên máy người dùng
TESSERACT_EXE = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
if os.path.exists(TESSERACT_EXE):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE

# 1. Từ khóa thông tin cá nhân cần che giá trị (hành chính)
ADMIN_KEYWORDS = [
    r"họ\s*(và|&)?\s*tên(\s*người\s*bệnh)?",
    r"người\s*bệnh",
    r"bệnh\s*nhân",
    r"tên/địa\s*chỉ\s*khách\s*hàng",
    r"khách\s*hàng",
    r"patient('s)?(\s+name)?",
    r"name",
    r"năm\s*sinh",
    r"ngày\s*sinh",
    r"\bns\b",
    r"\btuổi\b",
    r"\bage\b",
    r"\bsex\b",
    r"\bgender\b",
    r"giới\s*tính",
    r"địa\s*chỉ",
    r"\badd\b",
    r"address",
    r"nơi\s*gửi",
    r"điện\s*thoại",
    r"\bđt\b",
    r"\bsđt\b",
    r"\btel\b",
    r"phone",
    r"\bpid\b",
    r"\bsid\b",
    r"mã\s*(bn|bệnh\s*nhân|số|hồ\s*sơ|mẫu)",
    r"số\s*(thẻ|thẻ\s*bhyt|chỉ\s*định|mẫu)",
    r"reg(\.|\s*no)?",
    r"uhid",
    r"stt",
    r"bác\s*sĩ(\s*chỉ\s*định|\s*điều\s*trị)?",
    r"\bbs(\.|\s*chỉ\s*định)?\b",
    r"ref(\.|erred)?\s*(by)?",
    r"doctor('s)?(\s+requirement)?",
    r"người\s*lấy\s*mẫu",
    r"người\s*nhận\s*mẫu",
    r"người\s*thực\s*hiện",
    r"chẩn\s*đoán"
]

# 2. Từ khóa chân trang / chữ ký bác sĩ
FOOTER_KEYWORDS = [
    r"bác\s*sĩ(\s*điều\s*trị|\s*xét\s*nghiệm)?",
    r"trưởng\s*khoa(\s*xét\s*nghiệm|\s*hóa\s*sinh)?",
    r"tl\.\s*trưởng\s*khoa",
    r"tổ\s*xét\s*nghiệm",
    r"phòng\s*thí\s*nghiệm",
    r"phó\s*viện\s*trưởng",
    r"viện\s*trưởng",
    r"tổng\s*giám\s*đốc",
    r"phó\s*tổng\s*giám\s*đốc",
    r"ktv(\.|\s*xét\s*nghiệm)?",
    r"kỹ\s*thuật\s*viên",
    r"technologist",
    r"pathologist",
    r"doctor",
    r"\bdr\.\b",
    r"\bbs\.\b",
    r"\bths\.bs\b",
    r"\bts\.bs\b",
    r"\brmc\b"
]

# 3. Mốc ranh giới bắt đầu bảng dữ liệu y khoa
TABLE_START_MARKERS = [
    "tên xét nghiệm", "kết quả xét nghiệm", "kết quả kiểm nghiệm", 
    "complete blood count", "haematology", "sinh hóa", "sinh hóa máu", 
    "huyết học", "miễn dịch", "điện giải đồ", "nước tiểu", "thông số", 
    "chỉ tiêu", "diagnostic tests", "parameter", "test name",
    "tên thuốc", "hoạt chất", "chỉ định dùng", "uống", "viên"
]

ADMIN_REGEX = [re.compile(p, re.IGNORECASE) for p in ADMIN_KEYWORDS]
FOOTER_REGEX = [re.compile(p, re.IGNORECASE) for p in FOOTER_KEYWORDS]

def mask_barcodes(image: np.ndarray) -> np.ndarray:
    """Che triệt để các loại Barcode và QR Code"""
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        decoded_objects = decode(gray)
        for obj in decoded_objects:
            rect = obj.rect
            pad = 8
            x = max(0, rect.left - pad)
            y = max(0, rect.top - pad)
            w = rect.width + 2 * pad
            h = rect.height + 2 * pad
            cv2.rectangle(image, (x, y), (x + w, y + h), (0, 0, 0), -1)
    except Exception:
        pass
    return image

def mask_sensitive_data(image: np.ndarray) -> np.ndarray:
    """Tự động phát hiện và bôi đen vùng thông tin định danh bệnh nhân (PII)"""
    h_img, w_img, _ = image.shape
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    try:
        data = pytesseract.image_to_data(
            gray, 
            lang='vie+eng', 
            config='--psm 3', 
            output_type=Output.DICT
        )
    except Exception:
        try:
            data = pytesseract.image_to_data(gray, lang='eng', config='--psm 3', output_type=Output.DICT)
        except Exception:
            return image

    n_boxes = len(data.get('text', []))
    words = []
    for i in range(n_boxes):
        txt = str(data['text'][i]).strip()
        if not txt:
            continue
        words.append({
            'text': txt,
            'left': data['left'][i],
            'top': data['top'][i],
            'width': data['width'][i],
            'height': data['height'][i],
            'right': data['left'][i] + data['width'][i],
            'bottom': data['top'][i] + data['height'][i]
        })

    if not words:
        return image

    words.sort(key=lambda w: (w['top'], w['left']))
    lines = []
    for w in words:
        placed = False
        for line in lines:
            if abs(w['top'] - line['top']) <= 12:
                line['words'].append(w)
                line['top'] = min(line['top'], w['top'])
                line['bottom'] = max(line['bottom'], w['bottom'])
                placed = True
                break
        if not placed:
            lines.append({'top': w['top'], 'bottom': w['bottom'], 'words': [w]})

    cutoff_y = h_img * 0.48
    for line in lines:
        line_str = " ".join([w['text'] for w in line['words']]).lower()
        if any(marker in line_str for marker in TABLE_START_MARKERS):
            if line['top'] > h_img * 0.15:
                cutoff_y = min(cutoff_y, line['top'])
                break

    # 1. Che phần thông tin hành chính
    for line in lines:
        if line['top'] >= cutoff_y:
            continue
            
        words_in_line = sorted(line['words'], key=lambda x: x['left'])
        line_str = " ".join([w['text'] for w in words_in_line])

        for reg in ADMIN_REGEX:
            match = reg.search(line_str)
            if not match:
                continue

            start_char, end_char = match.span()
            curr_pos = 0
            label_last_idx = -1

            for idx, w in enumerate(words_in_line):
                w_len = len(w['text'])
                if curr_pos + w_len >= end_char:
                    label_last_idx = idx
                    break
                curr_pos += w_len + 1

            if label_last_idx == -1:
                continue

            mask_start_idx = label_last_idx + 1
            while mask_start_idx < len(words_in_line):
                token = words_in_line[mask_start_idx]['text']
                if token in [":", "-", "...", "---"] or token.endswith("):") or token.endswith(")"):
                    mask_start_idx += 1
                else:
                    break

            if mask_start_idx < len(words_in_line):
                start_x = words_in_line[mask_start_idx]['left'] - 2
            else:
                start_x = words_in_line[label_last_idx]['right'] + 6

            end_x = min(w_img - 15, start_x + int(w_img * 0.40))
            for next_idx in range(mask_start_idx, len(words_in_line)):
                w_next = words_in_line[next_idx]
                if any(r.search(w_next['text']) for r in ADMIN_REGEX) and w_next['left'] > start_x:
                    end_x = w_next['left'] - 6
                    break

            if end_x > start_x:
                y1 = max(0, line['top'] - 3)
                y2 = min(h_img, line['bottom'] + 4)
                cv2.rectangle(image, (start_x, y1), (end_x, y2), (0, 0, 0), -1)

    # 2. Che phần chân trang / chữ ký bác sĩ
    for line in lines:
        if line['top'] > h_img * 0.70:
            words_in_line = sorted(line['words'], key=lambda x: x['left'])
            line_str = " ".join([w['text'] for w in words_in_line])

            if any(f_reg.search(line_str) for f_reg in FOOTER_REGEX):
                y1 = max(0, line['top'] - 4)
                y2 = min(h_img, line['bottom'] + 6)
                x1 = max(0, words_in_line[0]['left'] - 6)
                x2 = min(w_img, words_in_line[-1]['right'] + 6)
                cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 0), -1)

    return image

def anonymize_and_save(input_image_path: str, output_image_path: str) -> bool:
    """Đọc ảnh, che barcode và PII, sau đó lưu ra file mới"""
    img = cv2.imdecode(np.fromfile(input_image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return False
    img = mask_barcodes(img)
    img = mask_sensitive_data(img)
    ext = os.path.splitext(output_image_path)[1]
    _, enc = cv2.imencode(ext if ext else ".jpg", img)
    enc.tofile(output_image_path)
    return True
