"""
MediRead AI - Lab Value Normalization & Reference Range Service
Provides deterministic number parsing, unit normalization, age/sex-specific range evaluation,
and complete medical provenance tracking.
"""

import re
import difflib
import unicodedata
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field

NUM_PATTERN = r"\d+(?:[.,]\d+)?"


class AgeGroup(str, Enum):
    ADULT = "adult"
    CHILD = "child"
    UNKNOWN = "unknown"


class PatientSex(str, Enum):
    MALE = "nam"
    FEMALE = "nu"
    OTHER = "other"
    UNKNOWN = "unknown"


class LabFlag(str, Enum):
    HIGH = "high"
    LOW = "low"
    NORMAL = "normal"
    UNKNOWN = "unknown"


class QualityStatus(str, Enum):
    ACCEPTED = "accepted"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"


class NormalizedLabItem(BaseModel):
    name: str
    normalized_code: Optional[str] = None
    value_raw: str
    value_num: Optional[float] = None
    value_text: Optional[str] = None
    unit_raw: str = ""
    unit_normalized: str = ""
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None
    reference_range_raw: str = ""
    reference_range_used: str = ""
    reference_source: str = "printed_report"  # 'printed_report' | 'internal_kb' | 'unavailable'
    reference_version: str = "1.0-hmu-biochem"
    flag: LabFlag = LabFlag.UNKNOWN
    flag_note: Optional[str] = None
    quality_status: QualityStatus = QualityStatus.ACCEPTED
    review_reason: Optional[str] = None


# ---------------------------------------------------------------- Text & Number Cleaners

def fix_thousands(s: str) -> str:
    """Handles thousand commas (e.g. '4,000' -> '4000') while keeping VN decimals (e.g. '3,9')."""
    return re.sub(
        r"(?<!\d)[1-9]\d{0,2}(?:,\d{2,3})*,\d{3}(?!\d)",
        lambda m: m.group(0).replace(",", ""),
        str(s or "").strip(),
    )


def parse_numeric_value(s: str) -> Optional[float]:
    """Parses first numeric value safely. Returns None if range or invalid string."""
    raw = fix_thousands(s)
    if not raw:
        return None
    # If string is a range like "3.9 - 5.6", it's not a single patient value
    if re.search(rf"{NUM_PATTERN}\s*[-–~]\s*{NUM_PATTERN}", raw):
        return None

    m = re.match(rf"\s*([-−–+]?)\s*[<>≤≥]?\s*({NUM_PATTERN})", raw)
    if not m:
        return None
    try:
        sign_str = m.group(1).replace("−", "-").replace("–", "-")
        sign = -1.0 if sign_str == "-" else 1.0
        val = float(m.group(2).replace(",", "."))
        return sign * val
    except ValueError:
        return None


def clean_unit(u: str) -> str:
    """Normalizes OCR unit errors: 'umo1/L' -> 'µmol/L', '109/L' -> '10^9/L', filters machine models."""
    s = str(u or "").strip(" .,;:")
    # Strip machine analyzer models that leaked into unit column (e.g. 'Mission U120', 'MissionU120', 'BS200E')
    if re.search(r"(?i)(mission|bs-?200|cobas|architect|sysmex|mindray|mayxn)", s):
        return ""
    s = s.replace("mo1", "mol").replace("pumol", "µmol").replace("umol", "µmol")
    s = re.sub(r"(?<![\d^.])(10)(3|6|9|12)(?=\s*/)", r"\1^\2", s)
    s = re.sub(r"/1$", "/L", s)
    s = re.sub(r"/l$", "/L", s)
    if s.lower() in ("fi", "il", "fl"):
        s = "fL"
    # Sửa lỗi OCR hay đọc nhầm đơn vị huyết học:
    # 1. "2/dL", "2/dl", "2/L" -> "g/dL" hoặc "g/L" (chữ g bị nhầm thành số 2)
    if re.match(r"(?i)^2\s*/\s*d?l$", s):
        s = "g/dL" if "d" in s.lower() else "g/L"
    # 2. "P8", "p8", "P8/cell" -> "pg" (chữ g bị nhầm thành số 8)
    if re.match(r"(?i)^p8(/cell)?$", s):
        s = "pg"
    # 3. "GN", "&N", "%N", "&M", "%M", "%B", "%E", "gn" -> "%"
    if re.match(r"(?i)^[%&g][nlmeb]$", s):
        s = "%"
    return s


def clean_reference_string(text: str) -> str:
    """Cleans OCR artifacts in reference range text: '11.5.14.5' -> '11.5 - 14.5', '(0.7)' -> '0 - 7'."""
    if not text:
        return ""
    s = str(text).strip()
    # Sửa lỗi OCR dính dấu chấm thay cho gạch nối giữa 2 số thập phân: "11.5.14.5" -> "11.5 - 14.5"
    s = re.sub(r"(\d+\.\d+)\.(\d+\.\d+)", r"\1 - \2", s)
    # Sửa lỗi OCR mất gạch nối giữa 2 số thập phân: "12.018.0" -> "12.0 - 18.0"
    s = re.sub(r"(\d+\.\d)(\d{2}\.\d)", r"\1 - \2", s)
    # Sửa lỗi OCR hai số nguyên dính dấu chấm: "(31.36)" -> "31 - 36"
    s = re.sub(r"(?<=[(\s])(\d{2})\.(\d{2})(?=[)\s])", r"\1 - \2", s)
    # Sửa lỗi OCR EOS "(0.7)" -> "0 - 7"
    s = re.sub(r"\(?\s*0\s*[.,–-]\s*7(?:\.0)?\s*\)?", "0 - 7", s)
    # Gỡ bỏ ngoặc đơn nếu bao bọc toàn bộ chuỗi: "(37.0-80.0)" -> "37.0 - 80.0"
    m_p = re.match(r"^\(\s*([^()]+)\s*\)$", s)
    if m_p:
        s = m_p.group(1).strip()
    s = re.sub(r"\s*[-–—]\s*", " - ", s)
    return s


def parse_range_bounds(text: str) -> Tuple[Optional[float], Optional[float]]:
    """Parses lower and upper bounds from a range string (e.g. '3.9 - 6.4', '< 5.2', '> 0.9')."""
    text = fix_thousands(text)
    if not text:
        return None, None

    # Áp dụng chuẩn hóa chuỗi khoảng tham chiếu
    text = clean_reference_string(text)

    # Handle negative ranges like "-2 đến +3"
    m_range = re.search(rf"([-−–+]?\s*{NUM_PATTERN})\s*(?:đến|d[eé]n|to|-|–)\s*([-−–+]?\s*{NUM_PATTERN})", text, re.I)
    if m_range:
        a = parse_numeric_value(m_range.group(1).replace(" ", ""))
        b = parse_numeric_value(m_range.group(2).replace(" ", ""))
        if a is not None and b is not None and a <= b:
            return a, b

    # Single bound inequalities
    nums = [parse_numeric_value(n) for n in re.findall(NUM_PATTERN, text)]
    nums = [n for n in nums if n is not None]
    if not nums:
        return None, None

    if re.search(r"[<≤]", text) or re.search(r"(?i)\b(up to|dưới)\b", text):
        return None, nums[0]
    if re.search(r"[>≥]", text) or re.search(r"(?i)\b(trên|từ)\b", text):
        return nums[0], None
    if len(nums) >= 2 and nums[0] < nums[1]:
        return nums[0], nums[1]

    return None, None


# ---------------------------------------------------------------- Medical Reference Table

def norm_name(s: str) -> str:
    """Chuẩn hóa chuỗi tên xét nghiệm, loại bỏ dấu và các tiền tố kỹ thuật OCR thường gặp."""
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^a-z0-9]", "", s.lower())
    # Loại bỏ tiền tố hành chính phổ biến trên phiếu xét nghiệm VN để tăng độ khớp
    for prefix in ("dinhluong", "dinhlurong", "xetnghiem", "soluong", "chiso", "tile", "tyle", "donvi"):
        if cleaned.startswith(prefix) and len(cleaned) > len(prefix) + 2:
            cleaned = cleaned[len(prefix):]
            break
    return cleaned


INTERNAL_REFERENCE_KB = [
    # Huyết học - Công thức máu toàn phần (CBC)
    {"code": "WBC", "name": "Số lượng bạch cầu (WBC)", "aliases": ["wbc", "bachcau", "soluongbachcau", "bachcaumau", "leukocytes", "whitebloodcells"], "unit": "G/L", "range": (4.0, 10.0)},
    {"code": "RBC", "name": "Số lượng hồng cầu (RBC)", "aliases": ["rbc", "hongcau", "soluonghongcau", "hongcaumau", "erythrocytes", "redbloodcells"], "unit": "T/L", "range": {"nam": (4.2, 5.8), "nu": (3.8, 5.0)}},
    {"code": "HGB", "name": "Huyết sắc tố (Hb/HGB)", "aliases": ["hgb", "hb", "hemoglobin", "huyetsacto", "luonghuyetsacto"], "unit": "g/L", "range": {"nam": (130, 175), "nu": (120, 155)}},
    {"code": "HCT", "name": "Dung tích hồng cầu (HCT)", "aliases": ["hct", "hematocrit", "thetichkhoihongcau", "dungtichhongcau"], "unit": "%", "range": {"nam": (0.39, 0.49), "nu": (0.33, 0.43)}},
    {"code": "PLT", "name": "Số lượng tiểu cầu (PLT)", "aliases": ["plt", "tieucau", "soluongtieucau", "platelets", "tieucaumau"], "unit": "G/L", "range": (150, 450)},
    {"code": "MCV", "name": "Thể tích trung bình HC (MCV)", "aliases": ["mcv", "thetichtrungbinhhongcau"], "unit": "fL", "range": (80, 100)},
    {"code": "MCH", "name": "Lượng HST trung bình HC (MCH)", "aliases": ["mch"], "unit": "pg", "range": (27, 32)},
    {"code": "MCHC", "name": "Nồng độ HST trung bình HC (MCHC)", "aliases": ["mchc"], "unit": "g/L", "range": (320, 360)},
    {"code": "RDW", "name": "Dải phân bố kích thước HC (RDW)", "aliases": ["rdw", "rdwcv", "rdwsd"], "unit": "%", "range": (11.5, 14.5)},
    {"code": "NEU", "name": "Bạch cầu trung tính (NEU%)", "aliases": ["neu", "neutrophil", "neutrophils", "trungtinh", "bachcautrungtinh", "neu%"], "unit": "%", "range": (40, 74)},
    {"code": "LYM", "name": "Bạch cầu Lympho (LYM%)", "aliases": ["lym", "lymphocyte", "lymphocytes", "bachcaulympho", "lym%"], "unit": "%", "range": (20, 40)},
    {"code": "MONO", "name": "Bạch cầu Mono (MONO%)", "aliases": ["mono", "monocyte", "monocytes", "bachcaumono", "mono%"], "unit": "%", "range": (2, 8)},
    {"code": "EOS", "name": "Bạch cầu ái toan (EOS%)", "aliases": ["eos", "eosinophil", "eosinophils", "bachcauaitoan", "aitoan", "eos%"], "unit": "%", "range": (0, 7)},
    {"code": "BASO", "name": "Bạch cầu ái kiềm (BASO%)", "aliases": ["baso", "basophil", "basophils", "bachcauaikiem", "aikiem", "baso%"], "unit": "%", "range": (0, 1.5)},

    # Sinh hóa - Đường huyết & Chuyển hóa
    {"code": "GLU", "name": "Đường huyết lúc đói (Glucose)", "aliases": ["glucose", "glu", "duonghuyet", "duongmau", "dinhluongglucose"], "unit": "mmol/L", "range": (3.9, 6.4)},
    {"code": "HBA1C", "name": "Chỉ số đường huyết 3 tháng (HbA1C)", "aliases": ["hba1c", "hemoglobina1c"], "unit": "%", "range": (4.8, 6.0)},

    # Chức năng thận & Acid uric
    {"code": "URE", "name": "Định lượng Ure máu", "aliases": ["ure", "urea", "uremau", "dinhluongure"], "unit": "mmol/L", "range": (2.5, 7.5)},
    {"code": "CREAT", "name": "Định lượng Creatinin (Chức năng thận)", "aliases": ["creatinin", "creatinine", "creatininmau", "dinhluongcreatinin"], "unit": "µmol/L", "range": {"nam": (62, 120), "nu": (53, 100)}},
    {"code": "URIC", "name": "Định lượng Acid Uric (Nguy cơ Gút)", "aliases": ["aciduric", "uricacid", "aciduricmau", "dinhluongaciduric"], "unit": "µmol/L", "range": {"nam": (180, 420), "nu": (150, 360)}},

    # Mỡ máu (Lipid máu)
    {"code": "CHOL", "name": "Cholesterol toàn phần", "aliases": ["cholesterol", "cholesteroltoanphan", "cholesteroltp", "dinhluongcholesterol"], "unit": "mmol/L", "range": (3.9, 5.2)},
    {"code": "TRIG", "name": "Triglycerid (Mỡ máu)", "aliases": ["triglycerid", "triglyceride", "tg", "dinhluongtriglycerid"], "unit": "mmol/L", "range": (0.46, 1.88)},
    {"code": "HDL", "name": "HDL-Cholesterol (Mỡ tốt)", "aliases": ["hdlcho", "hdlc", "hdl", "cholesterolhdl", "hdlcholesterol"], "unit": "mmol/L", "range": (0.9, None)},
    {"code": "LDL", "name": "LDL-Cholesterol (Mỡ xấu)", "aliases": ["ldlcho", "ldlc", "ldl", "cholesterolldl", "ldlcholesterol"], "unit": "mmol/L", "range": (None, 3.4)},

    # Protein & Albumin huyết thanh
    {"code": "PROT", "name": "Protein toàn phần", "aliases": ["proteintp", "protein", "proteintoanphan", "dinhluongproteintoan", "dinhluongproteintoanphan"], "unit": "g/L", "range": (65, 82)},
    {"code": "ALB", "name": "Albumin huyết thanh", "aliases": ["albumin", "albumine", "albuminmau", "dinhluongalbumin", "dinhlurongalbumin"], "unit": "g/L", "range": (35, 50)},
    {"code": "GLOB", "name": "Globulin huyết thanh", "aliases": ["globulin"], "unit": "g/L", "range": (24, 38)},

    # Men gan & Mật
    {"code": "AST", "name": "Men gan AST (SGOT)", "aliases": ["ast", "got", "sgot", "menganast", "dinhluongast"], "unit": "U/L", "range": (None, 37)},
    {"code": "ALT", "name": "Men gan ALT (SGPT)", "aliases": ["alt", "gpt", "sgpt", "menganalt", "dinhluongalt"], "unit": "U/L", "range": (None, 41)},
    {"code": "GGT", "name": "Men gan GGT", "aliases": ["ggt", "menganggt", "dinhluongggt"], "unit": "U/L", "range": {"nam": (11, 50), "nu": (7, 32)}},
    {"code": "BILI_TP", "name": "Bilirubin toàn phần", "aliases": ["bilirubintp", "bilirubintoanphan", "bilirubin"], "unit": "µmol/L", "range": (None, 17)},

    # Điện giải đồ
    {"code": "NA", "name": "Điện giải đồ Natri (Na+)", "aliases": ["na", "natri", "natrimau"], "unit": "mmol/L", "range": (135, 145)},
    {"code": "K", "name": "Điện giải đồ Kali (K+)", "aliases": ["k", "kali", "kalimau"], "unit": "mmol/L", "range": (3.5, 5.0)},
    {"code": "CL", "name": "Điện giải đồ Clo (Cl-)", "aliases": ["cl", "cr", "clo", "clomau", "clorua"], "unit": "mmol/L", "range": (98, 106)},
    {"code": "CA", "name": "Định lượng Calci toàn phần", "aliases": ["calci", "calcium", "ca", "calcimau"], "unit": "mmol/L", "range": (2.15, 2.60)},
    {"code": "PHOS", "name": "Định lượng Phospho máu", "aliases": ["phospho", "phosphorus"], "unit": "mmol/L", "range": {"adult": (0.9, 1.5), "child": (1.3, 2.2)}},

    # Tuyến giáp
    {"code": "TSH", "name": "Hormone tuyến giáp (TSH)", "aliases": ["tsh", "hormonetsh"], "unit": "µIU/mL", "range": (0.27, 4.2)},
    {"code": "FT3", "name": "Triiodothyronine tự do (FT3)", "aliases": ["ft3", "freet3"], "unit": "pmol/L", "range": (3.1, 6.8)},
    {"code": "FT4", "name": "Thyroxine tự do (FT4)", "aliases": ["ft4", "freet4"], "unit": "pmol/L", "range": (12.0, 22.0)},

    # Nước tiểu 10 thông số
    {"code": "KET", "name": "Ketone nước tiểu (KET)", "aliases": ["ketone", "ket", "ketoneket"], "unit": "", "range": "Âm tính (-)", "qualitative": True},
    {"code": "NIT", "name": "Nitrit nước tiểu (NIT)", "aliases": ["nitrit", "nit", "nitritnit", "nitrite"], "unit": "", "range": "Âm tính (-)", "qualitative": True},
    {"code": "BIL_U", "name": "Bilirubin nước tiểu (BIL)", "aliases": ["bilirubin", "bil", "bilirubinbil"], "unit": "", "range": "Âm tính (-)", "qualitative": True},
    {"code": "PRO_U", "name": "Protein nước tiểu (PRO)", "aliases": ["protein", "pro", "proteinpro"], "unit": "", "range": "Âm tính (-)", "qualitative": True},
    {"code": "LEU_U", "name": "Bạch cầu nước tiểu (LEU)", "aliases": ["bachcau", "leu", "bachcauleu", "leukocytes"], "unit": "", "range": "Âm tính (-)", "qualitative": True},
    {"code": "ERY_U", "name": "Hồng cầu nước tiểu (ERY)", "aliases": ["hongcau", "ery", "haneclu", "hanecluery", "erythrocytes"], "unit": "", "range": "Âm tính (-)", "qualitative": True},
    {"code": "URO", "name": "Urobilinogen nước tiểu (URO)", "aliases": ["urobilinogen", "uro", "urobilinogenuro"], "unit": "mg/dL", "range": (0.2, 1.0)},
    {"code": "PH_U", "name": "Độ pH nước tiểu", "aliases": ["phnuoctieu", "ph_u"], "unit": "", "range": (4.8, 7.5)},

    # Nhóm máu
    {"code": "BLOOD_GROUP", "name": "Nhóm máu hệ ABO", "aliases": ["nhommau", "nhommauheabo", "abo", "bloodgroup"], "unit": "", "range": "A, B, AB, O", "qualitative": True},
    {"code": "RH", "name": "Yếu tố Rhesus (Rh)", "aliases": ["rh", "yeutorh", "rhesus", "rhfactor"], "unit": "", "range": "+ / -", "qualitative": True},
]


def match_internal_indicator(raw_name: str) -> Optional[Dict[str, Any]]:
    """Matches raw lab test name with internal dictionary prioritizing parenthesized codes."""
    k = norm_name(raw_name)
    if not k:
        return None

    # 1. Thử bóc tách từ viết tắt chuẩn trong ngoặc trước (ví dụ: "(RDW)", "(WBC)", "(HCT)", "(PLT)", "(MCV)")
    m_paren = re.search(r"\(([a-zA-Z0-9+%-]+)\)", str(raw_name or ""))
    if m_paren:
        code_cand = norm_name(m_paren.group(1))
        for entry in INTERNAL_REFERENCE_KB:
            if code_cand in [norm_name(a) for a in entry["aliases"]] or code_cand == norm_name(entry["code"]):
                return entry

    # 2. Khớp chính xác toàn bộ tên với alias
    for entry in INTERNAL_REFERENCE_KB:
        if k in [norm_name(a) for a in entry["aliases"]]:
            return entry

    # 3. Khớp từ viết tắt độc lập (WBC, RBC, RDW...) chỉ khi là từ đứng riêng rẽ
    for entry in INTERNAL_REFERENCE_KB:
        for alias in entry["aliases"]:
            ak = norm_name(alias)
            if len(ak) >= 3 and re.search(rf"\b{re.escape(ak)}\b", k):
                if ak == "ph" and "nuoc tieu" not in k:
                    continue
                return entry

    # 4. Fuzzy match với ngưỡng cao 0.88 (chỉ áp dụng cho từ có độ dài >= 4 để tránh khớp nhầm)
    for entry in INTERNAL_REFERENCE_KB:
        for alias in entry["aliases"]:
            if len(alias) >= 4 and difflib.SequenceMatcher(None, k, norm_name(alias)).ratio() >= 0.88:
                return entry
    return None


# ---------------------------------------------------------------- Normalization Pipeline

class LabNormalizer:
    """Core normalizer ensuring provenance, age/sex accuracy, and unknown handling."""

    @classmethod
    def classify_value(cls, val: Optional[float], low: Optional[float], high: Optional[float]) -> LabFlag:
        """Determines flag status without defaulting unknown to normal."""
        if val is None or (low is None and high is None):
            return LabFlag.UNKNOWN
        if low is not None and val < low:
            return LabFlag.HIGH if high is not None and val > high else LabFlag.LOW
        if high is not None and val > high:
            return LabFlag.HIGH
        return LabFlag.NORMAL

    @classmethod
    def normalize_item(
        cls,
        draft_item: Dict[str, Any],
        patient_sex: PatientSex = PatientSex.UNKNOWN,
        age_group: AgeGroup = AgeGroup.UNKNOWN,
    ) -> NormalizedLabItem:
        raw_name = str(draft_item.get("name", "")).strip()
        raw_val = str(draft_item.get("value", "")).strip()
        raw_unit = str(draft_item.get("unit", "")).strip()
        raw_ref = str(draft_item.get("reference_range", "")).strip()

        unit_norm = clean_unit(raw_unit)
        val_num = parse_numeric_value(raw_val)

        # 1. Parse printed report range
        p_low, p_high = parse_range_bounds(raw_ref)
        kb_entry = match_internal_indicator(raw_name)

        ref_source = "printed_report"
        ref_used_str = clean_reference_string(raw_ref) or raw_ref
        ref_low, ref_high = p_low, p_high
        review_reasons = []

        # Nếu OCR chỉ bắt được cận trên (ví dụ 'Chuẩn: 7' thay vì '0 - 7' của EOS)
        if ref_low is None and ref_high is not None and kb_entry:
            ranges = kb_entry.get("range")
            if isinstance(ranges, (tuple, list)) and ranges[0] is not None:
                if ref_high == ranges[1] or abs(ref_high - ranges[1]) < 1.0:
                    ref_low = float(ranges[0])
                    ref_used_str = f"{int(ref_low) if ref_low.is_integer() else ref_low} - {int(ref_high) if ref_high.is_integer() else ref_high}"

        # 2. Check if printed report had valid range
        if ref_low is None and ref_high is None:
            # Need fallback to internal KB if available
            if kb_entry:
                ranges = kb_entry["range"]
                if isinstance(ranges, str):
                    ref_used_str = ranges
                    ref_source = "internal_kb"
                elif isinstance(ranges, (tuple, list)):
                    ref_low, ref_high = ranges
                    ref_source = "internal_kb"
                    ref_used_str = f"{ref_low or ''} - {ref_high or ''}".strip(" -")
                elif isinstance(ranges, dict):
                    # Requires age or sex
                    if "adult" in ranges or "child" in ranges:
                        if age_group == AgeGroup.ADULT and "adult" in ranges:
                            ref_low, ref_high = ranges["adult"]
                            ref_source = "internal_kb"
                            ref_used_str = f"NL: {ref_low} - {ref_high}"
                        elif age_group == AgeGroup.CHILD and "child" in ranges:
                            ref_low, ref_high = ranges["child"]
                            ref_source = "internal_kb"
                            ref_used_str = f"TE: {ref_low} - {ref_high}"
                        else:
                            review_reasons.append("age_group_unknown_for_reference_range")
                            ref_source = "unavailable"
                    elif "nam" in ranges or "nu" in ranges:
                        if patient_sex in (PatientSex.MALE, "nam") and "nam" in ranges:
                            ref_low, ref_high = ranges["nam"]
                            ref_source = "internal_kb"
                            ref_used_str = f"Nam: {ref_low} - {ref_high}"
                        elif patient_sex in (PatientSex.FEMALE, "nu") and "nu" in ranges:
                            ref_low, ref_high = ranges["nu"]
                            ref_source = "internal_kb"
                            ref_used_str = f"Nữ: {ref_low} - {ref_high}"
                        else:
                            review_reasons.append("sex_unknown_for_reference_range")
                            ref_source = "unavailable"
            else:
                ref_source = "unavailable"
                review_reasons.append("missing_reference_range")

        # Tự động đồng bộ đơn vị giữa g/dL và g/L cho HGB và MCHC (1 g/dL = 10 g/L)
        if kb_entry and kb_entry.get("code") in ("HGB", "MCHC") and val_num is not None:
            if unit_norm.lower() == "g/dl" and ref_low is not None and ref_low > 100:
                ref_low = round(ref_low / 10.0, 1)
                ref_high = round(ref_high / 10.0, 1) if ref_high is not None else None
                ref_used_str = f"{ref_low} - {ref_high}" if ref_high else f"> {ref_low}"
            elif unit_norm.lower() == "g/l" and ref_low is not None and ref_low < 50:
                ref_low = round(ref_low * 10.0, 1)
                ref_high = round(ref_high * 10.0, 1) if ref_high is not None else None
                ref_used_str = f"{ref_low} - {ref_high}" if ref_high else f"> {ref_low}"

        # 3. Classify flag
        calculated_flag = cls.classify_value(val_num, ref_low, ref_high)

        # 4. Handle qualitative test results (e.g. blood group ABO, Rh factor, urine strips)
        raw_val_clean = str(raw_val or "").strip().lower()
        is_blood_group = kb_entry and kb_entry.get("code") == "BLOOD_GROUP"
        is_rh = kb_entry and kb_entry.get("code") == "RH"
        is_qualitative = (kb_entry and kb_entry.get("qualitative")) or is_blood_group or is_rh

        is_qualitative_neg = raw_val_clean in ("neg", "negative", "âm tính", "am tinh", "norm", "normal", "bình thường", "binh thuong")
        is_qualitative_pos = raw_val_clean in ("pos", "positive", "dương tính", "duong tinh", "+", "++", "+++", "++++")

        if is_blood_group:
            final_flag = LabFlag.NORMAL
            if not ref_used_str:
                ref_used_str = "A, B, AB, O"
        elif is_rh:
            final_flag = LabFlag.NORMAL
            if not ref_used_str:
                ref_used_str = "+ / - (Dương/Âm)"
        elif is_qualitative_neg:
            final_flag = LabFlag.NORMAL
            if not ref_used_str:
                ref_used_str = "Âm tính (-)"
        elif is_qualitative_pos:
            final_flag = LabFlag.HIGH
            if not ref_used_str:
                ref_used_str = "Âm tính (-)"
        elif calculated_flag != LabFlag.UNKNOWN:
            final_flag = calculated_flag
        else:
            raw_flag = str(draft_item.get("flag", "unknown")).lower()
            if raw_flag in ("high", "low", "normal"):
                final_flag = LabFlag(raw_flag)
            else:
                final_flag = LabFlag.UNKNOWN

        # 5. Quality gate
        quality = QualityStatus.ACCEPTED
        if val_num is None and not is_qualitative and not raw_val:
            quality = QualityStatus.NEEDS_REVIEW
            review_reasons.append("unparseable_value_num")
        if ref_low is None and ref_high is None and not is_qualitative:
            quality = QualityStatus.NEEDS_REVIEW
        if final_flag == LabFlag.UNKNOWN and not is_qualitative:
            quality = QualityStatus.NEEDS_REVIEW

        return NormalizedLabItem(
            name=kb_entry["name"] if kb_entry else raw_name,
            normalized_code=kb_entry["code"] if kb_entry else None,
            value_raw=raw_val,
            value_num=val_num,
            value_text=raw_val if val_num is None else None,
            unit_raw=raw_unit,
            unit_normalized=unit_norm or (kb_entry["unit"] if kb_entry else ""),
            ref_low=ref_low,
            ref_high=ref_high,
            reference_range_raw=raw_ref,
            reference_range_used=ref_used_str,
            reference_source=ref_source,
            reference_version="1.0-hmu-biochem",
            flag=final_flag,
            flag_note=", ".join(review_reasons) if review_reasons else None,
            quality_status=quality,
            review_reason="; ".join(review_reasons) if review_reasons else None,
        )

    @classmethod
    def normalize_all(
        cls,
        draft_items: List[Dict[str, Any]],
        patient_sex: PatientSex = PatientSex.UNKNOWN,
        age_group: AgeGroup = AgeGroup.UNKNOWN,
    ) -> List[NormalizedLabItem]:
        return [cls.normalize_item(it, patient_sex, age_group) for it in draft_items]
