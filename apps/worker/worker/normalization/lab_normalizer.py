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
    """Normalizes OCR unit errors: 'umo1/L' -> 'µmol/L', '109/L' -> '10^9/L'."""
    s = str(u or "").strip(" .,;:")
    s = s.replace("mo1", "mol").replace("pumol", "µmol").replace("umol", "µmol")
    s = re.sub(r"(?<![\d^.])(10)(3|6|9|12)(?=\s*/)", r"\1^\2", s)
    s = re.sub(r"/1$", "/L", s)
    s = re.sub(r"/l$", "/L", s)
    if s.lower() == "fi":
        s = "fL"
    return s


def parse_range_bounds(text: str) -> Tuple[Optional[float], Optional[float]]:
    """Parses lower and upper bounds from a range string (e.g. '3.9 - 6.4', '< 5.2', '> 0.9')."""
    text = fix_thousands(text)
    if not text:
        return None, None

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
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", s.lower())


INTERNAL_REFERENCE_KB = [
    {"code": "GLU", "name": "Glucose", "aliases": ["glucose", "glu", "duonghuyet"], "unit": "mmol/L", "range": (3.9, 6.4)},
    {"code": "HBA1C", "name": "HbA1C", "aliases": ["hba1c"], "unit": "%", "range": (4.8, 6.0)},
    {"code": "URE", "name": "Ure", "aliases": ["ure", "urea"], "unit": "mmol/L", "range": (2.5, 7.5)},
    {"code": "CREAT", "name": "Creatinin", "aliases": ["creatinin", "creatinine"], "unit": "µmol/L", "range": {"nam": (62, 120), "nu": (53, 100)}},
    {"code": "URIC", "name": "Acid uric", "aliases": ["aciduric", "uricacid"], "unit": "µmol/L", "range": {"nam": (180, 420), "nu": (150, 360)}},
    {"code": "CHOL", "name": "Cholesterol", "aliases": ["cholesterol", "cholesterolph"], "unit": "mmol/L", "range": (3.9, 5.2)},
    {"code": "TRIG", "name": "Triglycerid", "aliases": ["triglycerid", "triglyceride", "tg"], "unit": "mmol/L", "range": (0.46, 1.88)},
    {"code": "HDL", "name": "HDL-cho", "aliases": ["hdlcho", "hdlc", "hdl", "cholesterolhdl"], "unit": "mmol/L", "range": (0.9, None)},
    {"code": "LDL", "name": "LDL-cho", "aliases": ["ldlcho", "ldlc", "ldl", "cholesterolldl"], "unit": "mmol/L", "range": (None, 3.4)},
    {"code": "PROT", "name": "Protein T.P", "aliases": ["proteintp", "protein"], "unit": "g/L", "range": (65, 82)},
    {"code": "ALB", "name": "Albumin", "aliases": ["albumin", "albumine"], "unit": "g/L", "range": (35, 50)},
    {"code": "GLOB", "name": "Globulin", "aliases": ["globulin"], "unit": "g/L", "range": (24, 38)},
    {"code": "NA", "name": "Na+", "aliases": ["na", "natri"], "unit": "mmol/L", "range": (135, 145)},
    {"code": "K", "name": "K+", "aliases": ["k", "kali"], "unit": "mmol/L", "range": (3.5, 5.0)},
    {"code": "CL", "name": "Cl-", "aliases": ["cl", "cr", "clo"], "unit": "mmol/L", "range": (98, 106)},
    {"code": "CA", "name": "Calci", "aliases": ["calci", "calcium", "ca"], "unit": "mmol/L", "range": (2.15, 2.60)},
    {"code": "PHOS", "name": "Phospho", "aliases": ["phospho", "phosphorus"], "unit": "mmol/L", "range": {"adult": (0.9, 1.5), "child": (1.3, 2.2)}},
    {"code": "AST", "name": "AST (GOT)", "aliases": ["ast", "got", "sgot"], "unit": "U/L", "range": (None, 37)},
    {"code": "ALT", "name": "ALT (GPT)", "aliases": ["alt", "gpt", "sgpt"], "unit": "U/L", "range": (None, 41)},
    {"code": "GGT", "name": "GGT", "aliases": ["ggt"], "unit": "U/L", "range": {"nam": (11, 50), "nu": (7, 32)}},
    {"code": "BILI_TP", "name": "Bilirubin TP", "aliases": ["bilirubintp", "bilirubintoanphan"], "unit": "µmol/L", "range": (None, 17)},
]


def match_internal_indicator(raw_name: str) -> Optional[Dict[str, Any]]:
    """Fuzzy matches raw lab test name with internal dictionary."""
    k = norm_name(raw_name)
    if not k:
        return None
    for entry in INTERNAL_REFERENCE_KB:
        if k in [norm_name(a) for a in entry["aliases"]]:
            return entry
    for entry in INTERNAL_REFERENCE_KB:
        for alias in entry["aliases"]:
            if difflib.SequenceMatcher(None, k, norm_name(alias)).ratio() >= 0.85:
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
        ref_used_str = raw_ref
        ref_low, ref_high = p_low, p_high
        review_reasons = []

        # 2. Check if printed report had valid range
        if ref_low is None and ref_high is None:
            # Need fallback to internal KB if available
            if kb_entry:
                ranges = kb_entry["range"]
                if isinstance(ranges, tuple):
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

        # 3. Classify flag
        calculated_flag = cls.classify_value(val_num, ref_low, ref_high)

        # 4. Handle initial flag from prompt or OCR marks
        raw_flag = str(draft_item.get("flag", "unknown")).lower()
        if calculated_flag != LabFlag.UNKNOWN:
            final_flag = calculated_flag
        elif raw_flag in ("high", "low", "normal"):
            final_flag = LabFlag(raw_flag)
        else:
            final_flag = LabFlag.UNKNOWN

        # 5. Quality gate
        quality = QualityStatus.ACCEPTED
        if val_num is None:
            quality = QualityStatus.NEEDS_REVIEW
            review_reasons.append("unparseable_value_num")
        if ref_low is None and ref_high is None:
            quality = QualityStatus.NEEDS_REVIEW
        if final_flag == LabFlag.UNKNOWN:
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
