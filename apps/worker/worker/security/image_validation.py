"""
MediRead AI - Image Validation Service
Production-ready image security verification and metadata sanitization.
"""

import io
from pathlib import Path
from typing import Tuple, Dict, Any
from PIL import Image, ImageOps

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
MIN_DIMENSION = 300
MAX_PIXELS = 40_000_000  # 40 Megapixels
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class ImageValidationError(ValueError):
    """Raised when an uploaded image fails security or format validation."""
    pass


def validate_image_bytes(data: bytes) -> Dict[str, Any]:
    """
    Validate raw image bytes for security, integrity, and dimensions.
    Returns metadata dict if valid; raises ImageValidationError otherwise.
    """
    if not data:
        raise ImageValidationError("empty_image_data")

    if len(data) > MAX_UPLOAD_BYTES:
        raise ImageValidationError(f"file_size_exceeded: {len(data)} > {MAX_UPLOAD_BYTES}")

    # Step 1: Magic bytes / stream verification
    try:
        with Image.open(io.BytesIO(data)) as im:
            format_name = im.format
            if not format_name or format_name.upper() not in ALLOWED_FORMATS:
                raise ImageValidationError(f"unsupported_image_format: {format_name}")
            
            im.verify()  # Verifies file header and block structure
    except Exception as exc:
        raise ImageValidationError(f"corrupt_or_invalid_image: {str(exc)}") from exc

    # Step 2: Re-open for dimension and pixel count inspection
    try:
        with Image.open(io.BytesIO(data)) as im:
            width, height = im.size
            if width < MIN_DIMENSION or height < MIN_DIMENSION:
                raise ImageValidationError(f"resolution_too_low: {width}x{height} < {MIN_DIMENSION}x{MIN_DIMENSION}")

            pixel_count = width * height
            if pixel_count > MAX_PIXELS:
                raise ImageValidationError(f"pixel_limit_exceeded: {pixel_count} > {MAX_PIXELS}")

            return {
                "format": format_name.upper(),
                "width": width,
                "height": height,
                "pixels": pixel_count,
                "size_bytes": len(data)
            }
    except ImageValidationError:
        raise
    except Exception as exc:
        raise ImageValidationError(f"image_decode_failed: {str(exc)}") from exc


def sanitize_and_orient_image(image_path: str | Path, output_path: str | Path) -> Tuple[int, int]:
    """
    Safely opens the image, fixes orientation based on EXIF, strips dangerous tags,
    and saves a clean RGB image.
    """
    image_path = Path(image_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(image_path) as img:
        # Transpose according to EXIF Orientation tag if present
        img_oriented = ImageOps.exif_transpose(img)
        if img_oriented is None:
            img_oriented = img

        # Convert to RGB if needed (handling RGBA, CMYK, P modes)
        if img_oriented.mode not in ("RGB", "L"):
            img_clean = img_oriented.convert("RGB")
        else:
            img_clean = img_oriented

        # Resize if image is excessively large to accelerate OCR while preserving 100% legibility
        max_dim = max(img_clean.width, img_clean.height)
        if max_dim > 2048:
            scale = 2048.0 / max_dim
            new_w = int(img_clean.width * scale)
            new_h = int(img_clean.height * scale)
            img_clean = img_clean.resize((new_w, new_h), Image.Resampling.LANCZOS)

        width, height = img_clean.size
        # Save as high quality image without slow deflate brute-forcing
        img_clean.save(output_path, format="JPEG", quality=95)
        return width, height
