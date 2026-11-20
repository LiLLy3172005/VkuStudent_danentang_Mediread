"""
MediRead AI - Comprehensive Worker Pipeline Unit Tests (unittest standard library)
Tests image validation, number parsing, unit normalization, reference ranges, flag classification,
provenance tracking, and cache isolation.
"""

import unittest
import io
from PIL import Image

from worker.security.image_validation import (
    validate_image_bytes,
    ImageValidationError,
    MAX_UPLOAD_BYTES,
)
from worker.normalization.lab_normalizer import (
    fix_thousands,
    parse_numeric_value,
    clean_unit,
    parse_range_bounds,
    LabNormalizer,
    LabFlag,
    AgeGroup,
    PatientSex,
    QualityStatus,
)
from worker.rag.rag_explainer import make_cache_key
from worker.extraction.schemas import LabItemDraft, ExtractionResult


class TestImageValidation(unittest.TestCase):
    def test_image_validation_valid_png(self):
        img = Image.new("RGB", (400, 400), color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        data = buf.getvalue()

        meta = validate_image_bytes(data)
        self.assertEqual(meta["format"], "PNG")
        self.assertEqual(meta["width"], 400)
        self.assertEqual(meta["height"], 400)

    def test_image_validation_rejects_empty(self):
        with self.assertRaises(ImageValidationError) as ctx:
            validate_image_bytes(b"")
        self.assertIn("empty_image_data", str(ctx.exception))

    def test_image_validation_rejects_too_small(self):
        img = Image.new("RGB", (100, 100), color="white")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        data = buf.getvalue()

        with self.assertRaises(ImageValidationError) as ctx:
            validate_image_bytes(data)
        self.assertIn("resolution_too_low", str(ctx.exception))

    def test_image_validation_rejects_corrupted(self):
        with self.assertRaises(ImageValidationError) as ctx:
            validate_image_bytes(b"\x89PNG\r\n\x1a\nCorruptedFakeDataStream12345")
        self.assertIn("corrupt_or_invalid_image", str(ctx.exception))


class TestNumberAndUnitParsing(unittest.TestCase):
    def test_parse_thousands_and_vietnamese_decimals(self):
        # Vietnamese decimal comma
        self.assertEqual(parse_numeric_value("3,9"), 3.9)
        self.assertEqual(parse_numeric_value("0,46"), 0.46)
        self.assertEqual(parse_numeric_value("1,88"), 1.88)

        # Standard dot decimal
        self.assertEqual(parse_numeric_value("5.1"), 5.1)

        # Thousand commas: "4,000" -> 4000
        self.assertEqual(parse_numeric_value("4,000"), 4000.0)

        # Negative numbers and signs
        self.assertEqual(parse_numeric_value("-2.5"), -2.5)
        self.assertEqual(parse_numeric_value("< 0.9"), 0.9)
        self.assertEqual(parse_numeric_value("> 135"), 135.0)

        # Range string is not a single measurement
        self.assertIsNone(parse_numeric_value("3.9 - 6.4"))
        self.assertIsNone(parse_numeric_value("65 - 82"))

    def test_unit_normalization(self):
        self.assertEqual(clean_unit("umo1/L"), "µmol/L")
        self.assertEqual(clean_unit("mmo1/L"), "mmol/L")
        self.assertEqual(clean_unit("pumol/L"), "µmol/L")
        self.assertEqual(clean_unit("109/L"), "10^9/L")
        self.assertEqual(clean_unit("G/l"), "G/L")
        self.assertEqual(clean_unit("fi"), "fL")
        self.assertEqual(clean_unit("fl"), "fL")
        # Hematology OCR mistranscriptions
        self.assertEqual(clean_unit("2/dL"), "g/dL")
        self.assertEqual(clean_unit("P8"), "pg")
        self.assertEqual(clean_unit("GN"), "%")
        self.assertEqual(clean_unit("&M"), "%")
        self.assertEqual(clean_unit("%B"), "%")
        self.assertEqual(clean_unit("IL"), "fL")

    def test_parse_range_bounds(self):
        # Two-sided range
        self.assertEqual(parse_range_bounds("3.9 - 6.4"), (3.9, 6.4))
        self.assertEqual(parse_range_bounds("3,9 - 5,2"), (3.9, 5.2))
        # OCR dot typos
        self.assertEqual(parse_range_bounds("11.5.14.5"), (11.5, 14.5))
        self.assertEqual(parse_range_bounds("(11.5.14.5)"), (11.5, 14.5))
        self.assertEqual(parse_range_bounds("(0.7)"), (0.0, 7.0))
        self.assertEqual(parse_range_bounds("(31.36)"), (31.0, 36.0))

        # Upper bound only (< or <=)
        self.assertEqual(parse_range_bounds("< 5.2"), (None, 5.2))
        self.assertEqual(parse_range_bounds("≤ 37"), (None, 37.0))

        # Lower bound only (> or >=)
        self.assertEqual(parse_range_bounds("> 0.9"), (0.9, None))
        self.assertEqual(parse_range_bounds("≥ 1.3"), (1.3, None))

        # Word-based Vietnamese ranges
        self.assertEqual(parse_range_bounds("-2 đến +3"), (-2.0, 3.0))


class TestFlagAndProvenanceSafety(unittest.TestCase):
    def test_classify_value_safety(self):
        # Normal in range
        self.assertEqual(LabNormalizer.classify_value(5.0, 3.9, 6.4), LabFlag.NORMAL)

        # High
        self.assertEqual(LabNormalizer.classify_value(7.2, 3.9, 6.4), LabFlag.HIGH)

        # Low
        self.assertEqual(LabNormalizer.classify_value(2.8, 3.9, 6.4), LabFlag.LOW)

        # Missing value or range MUST be UNKNOWN, NEVER normal or low
        self.assertEqual(LabNormalizer.classify_value(None, 3.9, 6.4), LabFlag.UNKNOWN)
        self.assertEqual(LabNormalizer.classify_value(5.0, None, None), LabFlag.UNKNOWN)

    def test_phospho_child_vs_adult_provenance(self):
        item = {"name": "Phospho", "value": "1.8", "unit": "mmol/L", "reference_range": ""}

        # 1. Child: 1.8 is NORMAL (child range: 1.3 - 2.2)
        res_child = LabNormalizer.normalize_item(item, age_group=AgeGroup.CHILD)
        self.assertEqual(res_child.ref_low, 1.3)
        self.assertEqual(res_child.ref_high, 2.2)
        self.assertEqual(res_child.flag, LabFlag.NORMAL)
        self.assertEqual(res_child.reference_source, "internal_kb")

        # 2. Adult: 1.8 is HIGH (adult range: 0.9 - 1.5)
        res_adult = LabNormalizer.normalize_item(item, age_group=AgeGroup.ADULT)
        self.assertEqual(res_adult.ref_low, 0.9)
        self.assertEqual(res_adult.ref_high, 1.5)
        self.assertEqual(res_adult.flag, LabFlag.HIGH)
        self.assertEqual(res_adult.reference_source, "internal_kb")

        # 3. Unknown age: MUST NOT guess adult or child; flags needs_review
        res_unknown = LabNormalizer.normalize_item(item, age_group=AgeGroup.UNKNOWN)
        self.assertEqual(res_unknown.flag, LabFlag.UNKNOWN)
        self.assertEqual(res_unknown.quality_status, QualityStatus.NEEDS_REVIEW)
        self.assertIn("age_group_unknown_for_reference_range", res_unknown.review_reason or "")

    def test_creatinin_sex_specific_provenance(self):
        item = {"name": "Creatinin", "value": "110", "unit": "µmol/L", "reference_range": ""}

        # Male: 110 is NORMAL (male range: 62 - 120)
        res_male = LabNormalizer.normalize_item(item, patient_sex=PatientSex.MALE)
        self.assertEqual(res_male.flag, LabFlag.NORMAL)
        self.assertEqual(res_male.ref_low, 62)
        self.assertEqual(res_male.ref_high, 120)

        # Female: 110 is HIGH (female range: 53 - 100)
        res_female = LabNormalizer.normalize_item(item, patient_sex=PatientSex.FEMALE)
        self.assertEqual(res_female.flag, LabFlag.HIGH)
        self.assertEqual(res_female.ref_low, 53)
        self.assertEqual(res_female.ref_high, 100)

    def test_printed_range_priority_over_fixed_table(self):
        # Report has custom printed range 4.0 - 7.0 (different from internal KB 3.9 - 6.4)
        item = {"name": "Glucose", "value": "6.8", "unit": "mmol/L", "reference_range": "4.0 - 7.0"}
        res = LabNormalizer.normalize_item(item)

        # Must prioritize the report's printed range: 6.8 is NORMAL for this hospital!
        self.assertEqual(res.reference_source, "printed_report")
        self.assertEqual(res.ref_low, 4.0)
        self.assertEqual(res.ref_high, 7.0)
        self.assertEqual(res.flag, LabFlag.NORMAL)

    def test_rdw_does_not_match_urine_ph(self):
        item = {"name": "Độ phân bố kích thước hồng cầu (RDW)", "value": "10.7", "unit": "%", "reference_range": "(11.5.14.5)"}
        res = LabNormalizer.normalize_item(item)
        self.assertEqual(res.normalized_code, "RDW")
        self.assertNotIn("nước tiểu", res.name.lower())
        self.assertIn("rdw", res.name.lower())
        self.assertEqual(res.ref_low, 11.5)
        self.assertEqual(res.ref_high, 14.5)
        self.assertEqual(res.flag, LabFlag.LOW)

    def test_blood_group_and_rh_qualitative(self):
        abo_item = {"name": "Nhóm mau", "value": "A", "unit": "", "reference_range": ""}
        abo_res = LabNormalizer.normalize_item(abo_item)
        self.assertEqual(abo_res.normalized_code, "BLOOD_GROUP")
        self.assertEqual(abo_res.value_text, "A")
        self.assertEqual(abo_res.flag, LabFlag.NORMAL)
        self.assertEqual(abo_res.quality_status, QualityStatus.ACCEPTED)

        rh_item = {"name": "Rh", "value": "+", "unit": "", "reference_range": ""}
        rh_res = LabNormalizer.normalize_item(rh_item)
        self.assertEqual(rh_res.normalized_code, "RH")
        self.assertEqual(rh_res.value_text, "+")
        self.assertEqual(rh_res.flag, LabFlag.NORMAL)
        self.assertEqual(rh_res.quality_status, QualityStatus.ACCEPTED)

    def test_clinical_priority_sorting(self):
        from worker.jobs import clinical_priority_score
        rbc = LabNormalizer.normalize_item({"name": "Số lượng hồng cầu (RBC)", "value": "3.92", "unit": "M/uL", "reference_range": "4.2 - 6.3"})
        hct = LabNormalizer.normalize_item({"name": "Dung tích hồng cầu (HCT)", "value": "35.0", "unit": "%", "reference_range": "37.0 - 51.0"})
        rdw = LabNormalizer.normalize_item({"name": "RDW", "value": "10.7", "unit": "%", "reference_range": "11.5 - 14.5"})
        neu = LabNormalizer.normalize_item({"name": "Bạch cầu trung tính (NEU%)", "value": "80.4", "unit": "%", "reference_range": "37.0 - 80.0"})

        # RBC & HCT should be higher priority than NEU% (cờ CAO), and NEU% higher priority than RDW (giảm lành tính)
        self.assertGreater(clinical_priority_score(rbc), clinical_priority_score(neu))
        self.assertGreater(clinical_priority_score(hct), clinical_priority_score(neu))
        self.assertGreater(clinical_priority_score(neu), clinical_priority_score(rdw))


class TestCacheAndSchemaContracts(unittest.TestCase):
    def test_cache_key_isolation(self):
        k1 = make_cache_key("Glucose", "5.1", "mmol/L", "3.9-6.4", "normal", "Context A", "qwen2.5:7b")
        # Different value -> Different key
        k2 = make_cache_key("Glucose", "8.1", "mmol/L", "3.9-6.4", "high", "Context A", "qwen2.5:7b")
        self.assertNotEqual(k1, k2)

        # Different context -> Different key
        k3 = make_cache_key("Glucose", "5.1", "mmol/L", "3.9-6.4", "normal", "Context B", "qwen2.5:7b")
        self.assertNotEqual(k1, k3)

    def test_pydantic_schema_extra_fields_ignored(self):
        # extra="ignore" safely tolerates unexpected fields without crashing
        draft = LabItemDraft(name="Glucose", value="5.1", unit="mmol/L", reference_range="3.9-6.4", flag="normal", extra_key="ignored")
        self.assertEqual(draft.name, "Glucose")


if __name__ == "__main__":
    unittest.main()
