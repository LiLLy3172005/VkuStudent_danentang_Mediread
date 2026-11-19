"""
MediRead AI - PaddleOCR Production Engine
Decoupled, lazy-initialized, environment-configurable OCR service.
Maintains curved-table tracing, angle correction, and layout grouping.
"""

import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

# Disable MKLDNN warning / multithreading lock on Windows
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_DISABLE_MKLDNN"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"


def resolve_model_dir(env_var: str, fallback_path: str) -> Optional[str]:
    """Resolves model path from environment variable with local fallback check."""
    custom = os.getenv(env_var)
    if custom and Path(custom).is_dir():
        return str(Path(custom).resolve())
    if Path(fallback_path).is_dir():
        return str(Path(fallback_path).resolve())
    return None


class OcrEngine:
    """Wrapper around PaddleOCR with lazy loading and thread safety."""

    def __init__(
        self,
        det_dir: Optional[str] = None,
        rec_dir: Optional[str] = None,
        cls_dir: Optional[str] = None,
        cpu_threads: int = 6,          # Tăng lên 6 threads CPU để xử lý nhanh
        use_angle_cls: bool = False,
        lang: str = "latin",
    ):
        self.det_dir = det_dir or resolve_model_dir(
            "PADDLE_DET_DIR", r"C:\paddle_models\whl\det\en\en_PP-OCRv3_det_infer"
        )
        # Sử dụng đúng model latin_PP-OCRv3_rec_infer nằm trong C:\paddle_models
        self.rec_dir = rec_dir or resolve_model_dir(
            "PADDLE_REC_DIR", r"C:\paddle_models\whl\rec\latin\latin_PP-OCRv3_rec_infer"
        )
        self.cls_dir = cls_dir or resolve_model_dir(
            "PADDLE_CLS_DIR", r"C:\paddle_models\whl\cls\ch_ppocr_mobile_v2.0_cls_infer"
        )
        self.cpu_threads = int(os.getenv("PADDLE_CPU_THREADS", cpu_threads))
        self.use_angle_cls = use_angle_cls
        self.lang = lang
        self._ocr = None

    def _init_model(self):
        if self._ocr is not None:
            return

        from paddleocr import PaddleOCR

        kwargs: Dict[str, Any] = {
            "use_angle_cls": self.use_angle_cls,
            "lang": self.lang,
            "enable_mkldnn": True,
            "cpu_threads": self.cpu_threads,
            "show_log": False,
        }
        if self.det_dir:
            kwargs["det_model_dir"] = self.det_dir
        if self.rec_dir:
            kwargs["rec_model_dir"] = self.rec_dir
        if self.cls_dir:
            kwargs["cls_model_dir"] = self.cls_dir

        # Bảo vệ: không để PaddleOCR rơi về thư mục mặc định ~/.paddleocr
        # (đường dẫn Windows user có dấu "Lưu Ly" khiến Paddle C++ không mở được file)
        missing = [n for n, d in (("det", self.det_dir), ("rec", self.rec_dir), ("cls", self.cls_dir)) if not d]
        if missing:
            raise RuntimeError(
                f"Không tìm thấy model PaddleOCR ({', '.join(missing)}) trong C:\\paddle_models. "
                "Hãy kiểm tra thư mục model hoặc đặt biến PADDLE_DET_DIR / PADDLE_REC_DIR / PADDLE_CLS_DIR."
            )

        self._ocr = PaddleOCR(**kwargs)

    @classmethod
    def create_default(cls) -> "OcrEngine":
        return cls()

    # ---------------------------------------------------------------- Layout & Grouping

    @staticmethod
    def _group_by_y(cells: List[Dict[str, Any]], tol: float) -> List[Dict[str, Any]]:
        """Simple row grouping: cells with vertical distance < tol share the same row."""
        rows = []
        for c in sorted(cells, key=lambda c: c["y"]):
            if rows and abs(c["y"] - rows[-1]["y"]) < tol:
                rows[-1]["cells"].append(c)
                rows[-1]["y"] = sum(x["y"] for x in rows[-1]["cells"]) / len(rows[-1]["cells"])
            else:
                rows.append({"y": c["y"], "cells": [c]})
        return rows

    @staticmethod
    def _trace_rows(cells: List[Dict[str, Any]], median_h: float) -> Optional[List[Dict[str, Any]]]:
        """
        Traces curved/skewed document rows.
        Begins from the leftmost cell (indicator name) and propagates slope across horizontal span.
        """
        if len(cells) < 12:
            return None
        xs = [c["x"] for c in cells]
        span = max(xs) - min(xs)
        if span <= 0:
            return None

        left_limit = min(xs) + 0.08 * span
        anchors = sorted((c for c in cells if c["x"] <= left_limit), key=lambda c: c["y"])
        gaps = sorted(
            b["y"] - a["y"] for a, b in zip(anchors, anchors[1:]) if b["y"] - a["y"] > 0.5 * median_h
        )
        if len(anchors) < 4 or not gaps:
            return None

        tol = 0.5 * gaps[len(gaps) // 2]
        anchor_ids = {id(a) for a in anchors}
        rest = sorted((c for c in cells if id(c) not in anchor_ids), key=lambda c: c["cx"])
        rows, slope = [], 0.0

        for a in anchors:
            members, last_x, last_y, left_over = [a], a["cx"], a["y"], []
            for c in rest:
                pred = last_y + slope * (c["cx"] - last_x)
                if c["cx"] > last_x and abs(c["y"] - pred) < tol:
                    members.append(c)
                    last_x, last_y = c["cx"], c["y"]
                else:
                    left_over.append(c)
            rest = left_over
            if len(members) >= 2 and last_x - a["cx"] > 0.3 * span:
                slope = max(-0.3, min(0.3, (last_y - a["y"]) / (last_x - a["cx"])))
            rows.append({"y": a["y"], "cells": members})

        leftover_rows = OcrEngine._group_by_y(rest, 0.6 * median_h)
        return rows + leftover_rows

    def process_image(self, image_path: str | Path) -> Dict[str, Any]:
        """
        Runs PaddleOCR on image, groups rows, and returns structured result.
        """
        image_path = str(image_path)
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        self._init_model()
        raw_result = self._ocr.ocr(image_path, cls=self.use_angle_cls)

        if not raw_result or not raw_result[0]:
            return {
                "raw_text": "",
                "cells": [],
                "confidence": 0.0,
                "needs_review": True,
                "review_reason": "no_text_detected",
            }

        cells, angles, confidences = [], [], []
        for item in raw_result[0]:
            try:
                box, (text, conf) = item[0], item[1]
            except (TypeError, ValueError, IndexError):
                continue

            if conf < 0.25:
                continue

            confidences.append(float(conf))
            ys = [p[1] for p in box]
            xs = [p[0] for p in box]
            cell_entry = {
                "box": box,
                "y": sum(ys) / len(ys),
                "x": min(xs),
                "cx": sum(xs) / len(xs),
                "h": max(ys) - min(ys),
                "text": text.strip(),
                "conf": float(conf),
            }
            cells.append(cell_entry)

            # Angle estimation for long text blocks
            try:
                dx, dy = box[1][0] - box[0][0], box[1][1] - box[0][1]
                if dx > 3 * (max(ys) - min(ys)) and dx > 0:
                    angles.append(math.atan2(dy, dx))
            except (TypeError, IndexError):
                pass

        if not cells:
            return {
                "raw_text": "",
                "cells": [],
                "confidence": 0.0,
                "needs_review": True,
                "review_reason": "low_confidence_text",
            }

        avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

        # Skew angle correction
        if angles:
            a = sorted(angles)[len(angles) // 2]
            a = max(-0.26, min(0.26, a))  # max ~15 degrees
            if abs(a) > 0.004:
                cos_a, sin_a = math.cos(a), math.sin(a)
                for c in cells:
                    c["y"] = c["y"] * cos_a - c["cx"] * sin_a

        cells.sort(key=lambda c: c["y"])
        median_h = sorted(c["h"] for c in cells)[len(cells) // 2]
        tol = 0.6 * median_h

        # Attempt curvature-aware row tracing, fallback to y grouping
        rows = self._trace_rows(cells, median_h)
        if rows is None:
            rows = self._group_by_y(cells, tol)
        rows.sort(key=lambda r: r["y"])

        formatted_rows = []
        for r in rows:
            sorted_cells = sorted(r["cells"], key=lambda c: c["x"])
            row_str = " | ".join(c["text"] for c in sorted_cells)
            if row_str.strip():
                formatted_rows.append(row_str)

        raw_text = "\n".join(formatted_rows)
        needs_review = avg_conf < 0.60 or len(formatted_rows) < 2

        return {
            "raw_text": raw_text,
            "cells": cells,
            "confidence": round(avg_conf, 3),
            "row_count": len(formatted_rows),
            "needs_review": needs_review,
            "review_reason": "low_ocr_confidence" if needs_review else None,
        }
