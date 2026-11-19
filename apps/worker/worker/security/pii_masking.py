"""
MediRead AI - PII Masking Service
Masks personal identifiable information (Patient Name, DOB, Phone, National ID, Barcodes, Signatures)
prior to processing and persistent storage.
"""

import os
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import cv2
import numpy as np

# Administrative and Patient PII Regex Patterns
ADMIN_KEYWORDS = [
    r"họ\s*(và|&)?\s*tên(\s*người\s*bệnh)?",
    r"người\s*bệnh",
    r"bệnh\s*nhân",
    r"tên/địa\s*chỉ\s*khách\s*hàng",
    r"khách\s*hàng",
    r"patient('s)?(\s+name)?",
    r"năm\s*sinh",
    r"ngày\s*sinh",
    r"\bns\b",
    r"\btuổi\b",
    r"\bage\b",
    r"địa\s*chỉ",
    r"address",
    r"điện\s*thoại",
    r"\bđt\b",
    r"\bsđt\b",
    r"\btel\b",
    r"phone",
    r"\bpid\b",
    r"\bsid\b",
    r"mã\s*(bn|bệnh\s*nhân|số|hồ\s*sơ|mẫu)",
    r"số\s*(thẻ|thẻ\s*bhyt|chỉ\s*định|mẫu)",
    r"cccd",
    r"cmnd",
    r"bác\s*sĩ(\s*chỉ\s*định|\s*điều\s*trị)?",
    r"\bbs(\.|\s*chỉ\s*định)?\b",
    r"chẩn\s*đoán"
]

FOOTER_KEYWORDS = [
    r"bác\s*sĩ(\s*điều\s*trị|\s*xét\s*nghiệm)?",
    r"trưởng\s*khoa",
    r"kỹ\s*thuật\s*viên",
    r"technologist",
    r"chữ\s*ký",
    r"signature",
    r"\bdr\.\b",
    r"\bbs\.\b"
]


def mask_barcodes(image: np.ndarray) -> Tuple[np.ndarray, int]:
    """
    Detects and blacks out barcodes / QR codes in the image.
    Uses pyzbar if available, with morphological contour fallback.
    """
    count = 0
    img_out = image.copy()

    # Try pyzbar first
    try:
        from pyzbar.pyzbar import decode
        decoded = decode(image)
        for obj in decoded:
            rect = obj.rect
            x, y, w, h = rect.left, rect.top, rect.width, rect.height
            # Add margin
            x = max(0, x - 5)
            y = max(0, y - 5)
            w = min(image.shape[1] - x, w + 10)
            h = min(image.shape[0] - y, h + 10)
            cv2.rectangle(img_out, (x, y), (x + w, y + h), (20, 20, 20), -1)
            count += 1
    except Exception:
        pass

    # Morphological fallback for barcode-like strip patterns
    if count == 0:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        gradX = cv2.Sobel(gray, ddepth=cv2.CV_32F, dx=1, dy=0, ksize=-1)
        gradY = cv2.Sobel(gray, ddepth=cv2.CV_32F, dx=0, dy=1, ksize=-1)
        gradient = cv2.subtract(gradX, gradY)
        gradient = cv2.convertScaleAbs(gradient)

        blurred = cv2.blur(gradient, (9, 9))
        _, thresh = cv2.threshold(blurred, 225, 255, cv2.THRESH_BINARY)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 7))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        closed = cv2.erode(closed, None, iterations=4)
        closed = cv2.dilate(closed, None, iterations=4)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            x, y, w, h = cv2.boundingRect(c)
            aspect_ratio = w / float(h) if h > 0 else 0
            if aspect_ratio > 2.0 and (w * h) > 1500 and (w * h) < (image.shape[0] * image.shape[1] * 0.15):
                cv2.rectangle(img_out, (x, y), (x + w, y + h), (20, 20, 20), -1)
                count += 1

    return img_out, count


def mask_pii_boxes(image: np.ndarray, ocr_boxes_and_texts: List[Dict[str, Any]]) -> Tuple[np.ndarray, int]:
    """
    Masks regions identified by OCR to contain patient administrative information or doctor signatures.
    Each item in ocr_boxes_and_texts should have 'box' [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] and 'text'.
    """
    img_out = image.copy()
    mask_count = 0

    admin_pattern = re.compile("|".join(ADMIN_KEYWORDS), re.IGNORECASE)
    footer_pattern = re.compile("|".join(FOOTER_KEYWORDS), re.IGNORECASE)

    h_img, w_img = image.shape[:2]

    for item in ocr_boxes_and_texts:
        text = str(item.get("text", "")).strip()
        box = item.get("box")
        if not box or len(box) < 4:
            continue

        xs = [int(p[0]) for p in box]
        ys = [int(p[1]) for p in box]
        x_min, x_max = max(0, min(xs)), min(w_img, max(xs))
        y_min, y_max = max(0, min(ys)), min(h_img, max(ys))
        box_h = y_max - y_min

        # Check if text matches admin header PII keyword
        if admin_pattern.search(text):
            # Mask the value field to the right of the label (up to 300px or until next column)
            mask_x_start = x_min
            mask_x_end = min(w_img, x_max + int((x_max - x_min) * 2.5) + 150)
            cv2.rectangle(img_out, (mask_x_start, max(0, y_min - 2)), (mask_x_end, min(h_img, y_max + 2)), (30, 30, 30), -1)
            mask_count += 1

        # Check if text matches footer signature keyword
        elif footer_pattern.search(text) and y_min > h_img * 0.70:
            # Mask doctor signature box below keyword
            mask_y_end = min(h_img, y_max + box_h * 4)
            cv2.rectangle(img_out, (max(0, x_min - 20), y_min), (min(w_img, x_max + 20), mask_y_end), (30, 30, 30), -1)
            mask_count += 1

    return img_out, mask_count


def _safe_imread(path_str: str) -> Optional[np.ndarray]:
    """Reads image safely handling Windows Unicode paths."""
    try:
        with open(path_str, "rb") as f:
            data = bytearray(f.read())
        arr = np.asarray(data, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def _safe_imwrite(path_str: str, img: np.ndarray) -> bool:
    """Writes image safely handling Windows Unicode paths."""
    try:
        ext = os.path.splitext(path_str)[1] or ".jpg"
        success, buffer = cv2.imencode(ext, img)
        if success:
            with open(path_str, "wb") as f:
                f.write(buffer)
            return True
        return False
    except Exception:
        return False


def mask_pii_from_image(input_image_path: str | Path, output_image_path: str | Path, ocr_cells: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Main entry point for PII masking.
    Loads image, applies barcode & PII box masking, and saves masked image.
    """
    input_path = str(input_image_path)
    output_path = Path(output_image_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    img = _safe_imread(input_path)
    if img is None:
        raise ValueError(f"Cannot read image for PII masking: {input_path}")

    # 1. Barcode masking
    img_masked, barcode_count = mask_barcodes(img)
    total_masks = barcode_count

    # 2. Text-based PII masking if OCR cells provided
    if ocr_cells:
        img_masked, text_masks = mask_pii_boxes(img_masked, ocr_cells)
        total_masks += text_masks

    _safe_imwrite(str(output_path), img_masked)

    return {
        "is_pii_masked": True,
        "barcodes_masked": barcode_count,
        "total_regions_masked": total_masks,
        "output_path": str(output_path)
    }
