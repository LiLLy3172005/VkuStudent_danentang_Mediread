"""
MediRead AI - Supabase PostgreSQL & Storage Access Service
Interacts with Supabase using authenticated RLS context and provides local fallback for staging/test.
"""

import os
import re
import uuid
from datetime import datetime, date
from typing import List, Dict, Any, Optional
import logging
from app.config import settings

logger = logging.getLogger("mediread.supabase")


def parse_safe_date(raw_date: Any) -> Optional[str]:
    """Safely normalizes raw date strings into ISO YYYY-MM-DD for PostgreSQL DATE column."""
    if not raw_date:
        return None
    if isinstance(raw_date, (date, datetime)):
        return raw_date.strftime("%Y-%m-%d")
    s = str(raw_date).strip()
    # Check YYYY-MM-DD
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        try:
            return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
        except Exception:
            pass
    # Check DD/MM/YYYY or DD-MM-YYYY
    m = re.match(r"^(\d{1,2})[/\.-](\d{1,2})[/\.-](\d{4})", s)
    if m:
        try:
            return f"{int(m.group(3)):04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
        except Exception:
            pass
    # Check Vietnamese text: "24 thang 4 nam 2019" or "24 thang 4nam 2019"
    m = re.search(r"(\d{1,2})\s*(?:tháng|thang|\/|-)\s*(\d{1,2})\s*(?:năm|nam)?\s*(\d{4})", s, re.I)
    if m:
        try:
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            return f"{y:04d}-{mo:02d}-{d:02d}"
        except Exception:
            pass
    return None


class SupabaseService:
    """Manages database transactions and signed storage URLs."""

    def __init__(self):
        self._client = None
        self._init_client()
        # In-memory store for local testing/dev when Supabase credentials are placeholder
        self._mock_documents: Dict[str, Dict[str, Any]] = {}
        self._mock_lab_results: Dict[str, List[Dict[str, Any]]] = {}
        self._mock_medications: Dict[str, List[Dict[str, Any]]] = {}
        self._mock_schedules: Dict[str, List[Dict[str, Any]]] = {}
        self._mock_care_links: Dict[str, Dict[str, Any]] = {}

    def _init_client(self):
        if settings.SUPABASE_URL and "your-project" not in settings.SUPABASE_URL:
            try:
                from supabase import create_client, Client
                self._client: Optional[Client] = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
                )
            except Exception as exc:
                logger.warning("Could not connect to remote Supabase instance: %s. Using local repository.", exc)

    def is_connected(self) -> bool:
        return self._client is not None

    # ---------------------------------------------------------------- Document Operations

    async def create_document(
        self,
        user_id: uuid.UUID,
        doc_type: str,
        storage_path: str,
        is_pii_masked: bool = True,
        document_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        doc_id = document_id or uuid.uuid4()
        now = datetime.utcnow()
        record = {
            "id": doc_id,
            "user_id": user_id,
            "doc_type": doc_type,
            "status": "uploaded",
            "storage_path": storage_path,
            "is_pii_masked": is_pii_masked,
            "facility_name": None,
            "issued_date": None,
            "ocr_engine": "paddleocr_local",
            "ocr_text": None,
            "ocr_confidence": None,
            "quality_flags": {},
            "created_at": now,
            "updated_at": now,
            "lab_results": [],
            "medications": [],
            "explanations": [],
            "is_confirmed": False,
        }

        if self._client:
            try:
                res = self._client.table("documents").insert({
                    "id": str(doc_id),
                    "user_id": str(user_id),
                    "doc_type": doc_type,
                    "status": "uploaded",
                    "storage_path": storage_path,
                    "is_pii_masked": is_pii_masked,
                }).execute()
                if res.data:
                    return res.data[0]
            except Exception as exc:
                logger.error("Supabase insert document failed: %s", exc)

        # Local storage fallback
        self._mock_documents[str(doc_id)] = record
        return record

    async def update_document_status(self, document_id: uuid.UUID, status: str) -> None:
        doc_id_str = str(document_id)
        if doc_id_str in self._mock_documents:
            self._mock_documents[doc_id_str]["status"] = status
        if self._client:
            try:
                self._client.table("documents").update({"status": status}).eq("id", doc_id_str).execute()
            except Exception as exc:
                logger.error("Supabase update document status failed: %s", exc)

    async def get_document(self, document_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        doc_id_str = str(document_id)
        if self._client:
            try:
                res = self._client.table("documents").select("*").eq("id", doc_id_str).execute()
                if res.data:
                    doc = res.data[0]
                    # Fetch lab results, medications, and explanations
                    labs = self._client.table("lab_results").select("*").eq("document_id", doc_id_str).execute()
                    meds = self._client.table("medications").select("*").eq("document_id", doc_id_str).execute()
                    exps = self._client.table("explanations").select("*").eq("document_id", doc_id_str).execute()

                    # Build lab_id -> name map to enrich explanations
                    lab_id_to_name = {str(l["id"]): l.get("name") for l in (labs.data or []) if "id" in l}

                    normalized_exps = []
                    for e in (exps.data or []):
                        exp_dict = dict(e)
                        name = lab_id_to_name.get(str(exp_dict.get("lab_result_id") or ""))
                        if not name and exp_dict.get("citations") and isinstance(exp_dict["citations"], list):
                            for c in exp_dict["citations"]:
                                if isinstance(c, dict) and "indicator_name" in c:
                                    name = c["indicator_name"]
                                    break
                        exp_dict["indicator_name"] = name or "Chỉ số xét nghiệm"
                        exp_dict["explanation"] = exp_dict.get("content") or exp_dict.get("explanation") or ""
                        normalized_exps.append(exp_dict)

                    doc["lab_results"] = labs.data or []
                    doc["medications"] = meds.data or []
                    doc["explanations"] = normalized_exps
                    return doc
            except Exception as exc:
                logger.error("Supabase get document failed: %s", exc)

        return self._mock_documents.get(doc_id_str)

    async def list_documents(self, user_id: uuid.UUID, limit: int = 20) -> List[Dict[str, Any]]:
        user_str = str(user_id)
        if self._client:
            try:
                res = self._client.table("documents").select(
                    "id, user_id, doc_type, status, facility_name, issued_date, ocr_confidence, is_pii_masked, created_at"
                ).eq("user_id", user_str).order("created_at", desc=True).limit(limit).execute()
                return res.data or []
            except Exception as exc:
                logger.error("Supabase list documents failed: %s", exc)

        docs = [d for d in self._mock_documents.values() if str(d["user_id"]) == user_str]
        return sorted(docs, key=lambda x: x["created_at"], reverse=True)[:limit]

    async def save_worker_results(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        results: Dict[str, Any],
    ) -> None:
        """Saves pipeline results (extractions, lab results, medications, explanations)."""
        doc_id_str = str(document_id)
        user_str = str(user_id)

        # 1. Update Document status
        safe_issued_date = parse_safe_date(results.get("issued_date"))
        update_payload = {
            "status": results["status"],
            "ocr_text": results.get("raw_ocr_text"),
            "ocr_confidence": results.get("ocr_confidence"),
            "facility_name": results.get("facility_name"),
            "issued_date": safe_issued_date,
            "is_pii_masked": results.get("is_pii_masked", True),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Local update
        if doc_id_str in self._mock_documents:
            doc = self._mock_documents[doc_id_str]
            doc.update(update_payload)
            doc["lab_results"] = results.get("lab_results", [])
            doc["medications"] = results.get("medications", [])
            doc["explanations"] = results.get("explanations", [])

            # Also index lab trends
            for lab in results.get("lab_results", []):
                code = lab.get("normalized_code") or lab.get("name")
                if code:
                    if user_str not in self._mock_lab_results:
                        self._mock_lab_results[user_str] = []
                    self._mock_lab_results[user_str].append({
                        "document_id": document_id,
                        "name": lab["name"],
                        "normalized_code": code,
                        "value_num": lab.get("value_num", 0.0),
                        "unit": lab.get("unit_normalized", ""),
                        "flag": lab.get("flag", "UNKNOWN"),
                        "measured_at": safe_issued_date or date.today().isoformat(),
                    })

        if self._client:
            # Update Document record safely
            try:
                self._client.table("documents").update(update_payload).eq("id", doc_id_str).execute()
            except Exception as doc_exc:
                logger.warning("Supabase update document with issued_date failed: %s. Retrying without issued_date...", doc_exc)
                try:
                    update_payload["issued_date"] = None
                    self._client.table("documents").update(update_payload).eq("id", doc_id_str).execute()
                except Exception as retry_exc:
                    logger.error("Supabase fallback document update failed: %s", retry_exc)

            # Insert lab items
            lab_id_map = {}
            for lab in results.get("lab_results", []):
                try:
                    raw_val = getattr(lab.get("flag"), "value", lab.get("flag"))
                    raw_flag_str = str(raw_val or "").upper()
                    if "HIGH" in raw_flag_str or raw_flag_str == "H":
                        db_flag = "H"
                    elif "LOW" in raw_flag_str or raw_flag_str == "L":
                        db_flag = "L"
                    elif "NORM" in raw_flag_str or raw_flag_str == "N":
                        db_flag = "N"
                    else:
                        # Fallback evaluation based on value_num and bounds
                        val_num = lab.get("value_num")
                        ref_low = lab.get("ref_low")
                        ref_high = lab.get("ref_high")
                        if val_num is not None:
                            if ref_high is not None and val_num > ref_high:
                                db_flag = "H"
                            elif ref_low is not None and val_num < ref_low:
                                db_flag = "L"
                            elif ref_low is not None or ref_high is not None:
                                db_flag = "N"
                            else:
                                db_flag = None
                        else:
                            db_flag = None

                    lab_res = self._client.table("lab_results").insert({
                        "user_id": user_str,
                        "document_id": doc_id_str,
                        "name": lab["name"],
                        "normalized_code": lab.get("normalized_code"),
                        "value_num": lab.get("value_num"),
                        "value_text": lab.get("value_text"),
                        "unit": lab.get("unit_normalized") or lab.get("unit_raw"),
                        "ref_low": lab.get("ref_low"),
                        "ref_high": lab.get("ref_high"),
                        "ref_text": lab.get("reference_range_used"),
                        "flag": db_flag,
                        "flag_note": lab.get("flag_note") or (raw_flag_str if not db_flag else None),
                    }).execute()
                    if lab_res.data and len(lab_res.data) > 0:
                        lab_id_map[lab["name"]] = lab_res.data[0]["id"]
                except Exception as lab_exc:
                    logger.error("Supabase insert lab_result failed for %s: %s", lab.get("name"), lab_exc)

            # Insert explanations generated by RAG Explainer
            for exp in results.get("explanations", []):
                try:
                    ind_name = exp.get("indicator_name", "")
                    matched_lab_id = lab_id_map.get(ind_name)
                    cits = list(exp.get("citations", []))
                    if ind_name:
                        cits.append({"indicator_name": ind_name})

                    self._client.table("explanations").insert({
                        "user_id": user_str,
                        "document_id": doc_id_str,
                        "lab_result_id": matched_lab_id,
                        "content": exp.get("explanation") or exp.get("content") or "",
                        "citations": cits,
                        "refused": exp.get("refused", False),
                        "refusal_reason": exp.get("refusal_reason"),
                        "model": "qwen2.5:7b",
                    }).execute()
                except Exception as exp_exc:
                    logger.error("Supabase insert explanation failed: %s", exp_exc)

            # Insert medications
            for med in results.get("medications", []):
                try:
                    self._client.table("medications").insert({
                        "user_id": user_str,
                        "document_id": doc_id_str,
                        "name": med.get("name", ""),
                        "normalized_name": med.get("normalized_name") or med.get("name", ""),
                        "strength": med.get("strength"),
                        "dosage_form": med.get("dosage_form"),
                        "instructions": med.get("instructions"),
                        "times_per_day": med.get("times_per_day", 1),
                        "duration_days": med.get("duration_days"),
                        "notes": med.get("instructions"),
                        "active": True,
                    }).execute()
                except Exception as med_exc:
                    logger.error("Supabase insert medication failed for %s: %s", med.get("name"), med_exc)

    async def confirm_extraction(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        confirmed_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """User reviews and accepts/edits draft results."""
        doc_id_str = str(document_id)
        if doc_id_str in self._mock_documents:
            self._mock_documents[doc_id_str]["status"] = "confirmed"
            self._mock_documents[doc_id_str]["is_confirmed"] = True
            self._mock_documents[doc_id_str]["confirmed_data"] = confirmed_data
            return self._mock_documents[doc_id_str]

        if self._client:
            self._client.table("documents").update({"status": "confirmed"}).eq("id", doc_id_str).execute()
            self._client.table("extractions").update({
                "is_confirmed": True,
                "confirmed_json": confirmed_data,
                "confirmed_at": datetime.utcnow().isoformat(),
            }).eq("document_id", doc_id_str).execute()

        return {"document_id": document_id, "status": "confirmed"}

    # ---------------------------------------------------------------- Trends & Care Links

    async def get_user_lab_indicators(self, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        user_str = str(user_id)
        indicators = []
        if self._client:
            try:
                res = self._client.table("lab_results").select(
                    "name, normalized_code, value_num, unit, ref_low, ref_high, flag, created_at"
                ).eq("user_id", user_str).order("created_at", desc=False).execute()
                if res.data:
                    grouped = {}
                    for item in res.data:
                        code = (item.get("normalized_code") or item.get("name") or "LAB").strip()
                        name = item.get("name") or code
                        if code not in grouped:
                            grouped[code] = {
                                "code": code,
                                "name": name,
                                "unit": item.get("unit") or "",
                                "low": item.get("ref_low"),
                                "high": item.get("ref_high"),
                                "count": 0,
                                "latest_value": item.get("value_num"),
                                "latest_flag": item.get("flag"),
                                "latest_date": str(item.get("created_at", ""))[:10],
                            }
                        grouped[code]["count"] += 1
                        if item.get("value_num") is not None:
                            grouped[code]["latest_value"] = item.get("value_num")
                        if item.get("flag"):
                            grouped[code]["latest_flag"] = item.get("flag")
                        if item.get("created_at"):
                            grouped[code]["latest_date"] = str(item.get("created_at", ""))[:10]
                    indicators = list(grouped.values())
            except Exception as exc:
                logger.error("Supabase get_user_lab_indicators failed: %s", exc)
        return indicators

    async def get_lab_trends(self, user_id: uuid.UUID, code: str) -> List[Dict[str, Any]]:
        user_str = str(user_id)
        history = []
        code_upper = code.upper().strip()
        code_lower = code.lower().strip()

        if self._client:
            try:
                # 1. Look for user's own lab results only (no fake demo data)
                res = self._client.table("lab_results").select(
                    "id, document_id, name, normalized_code, value_num, unit, flag, created_at"
                ).eq("user_id", user_str).order("created_at", desc=False).execute()
                if res.data:
                    for item in res.data:
                        ncode = (item.get("normalized_code") or "").upper().strip()
                        name = (item.get("name") or "").lower().strip()
                        if ncode == code_upper or code_lower in name or (code_upper in ncode) or (name and name in code_lower):
                            history.append({
                                "document_id": item["document_id"],
                                "name": item["name"],
                                "normalized_code": ncode or code_upper,
                                "value_num": float(item.get("value_num") or 0.0),
                                "unit": item.get("unit", ""),
                                "flag": item.get("flag", "N"),
                                "measured_at": str(item.get("created_at", ""))[:10],
                            })
            except Exception as exc:
                logger.error("Supabase get_lab_trends failed: %s", exc)

        return history

    async def get_care_links(self, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        user_str = str(user_id)
        if self.is_connected() and self._client:
            try:
                res = self._client.table("care_links").select("*").or_(f"patient_id.eq.{user_str},caregiver_id.eq.{user_str}").execute()
                links = res.data or []
                if links:
                    for l in links:
                        try:
                            if "patient_name" not in l or not l.get("patient_name"):
                                p_res = self._client.table("profiles").select("full_name").eq("id", l["patient_id"]).execute()
                                if p_res.data:
                                    l["patient_name"] = p_res.data[0].get("full_name")
                            if "caregiver_name" not in l or not l.get("caregiver_name"):
                                c_res = self._client.table("profiles").select("full_name").eq("id", l["caregiver_id"]).execute()
                                if c_res.data:
                                    l["caregiver_name"] = c_res.data[0].get("full_name")
                        except Exception:
                            pass
                    return links
            except Exception as exc:
                logger.error("Supabase get_care_links failed: %s", exc)

        return [
            link for link in self._mock_care_links.values()
            if str(link.get("patient_id")) == user_str or str(link.get("caregiver_id")) == user_str
        ]

    async def connect_care_link_by_code(self, caregiver_id: uuid.UUID, code_str: str) -> Dict[str, Any]:
        raw_code = str(code_str or "").strip()
        for prefix in ("mediread:care:", "mediread://care/", "MR-", "mr-", "MR:"):
            if raw_code.startswith(prefix):
                raw_code = raw_code[len(prefix):]
                break

        # Sanitize code input to strict alphanumeric and hyphen characters to prevent wildcard/injection
        clean_code = re.sub(r"[^a-zA-Z0-9-]", "", raw_code)

        caregiver_str = str(caregiver_id)
        if clean_code.lower() == caregiver_str.lower():
            raise ValueError("Bác/Bạn không thể tự kết nối với chính tài khoản của mình.")

        patient_profile = None
        if self.is_connected() and self._client:
            try:
                # 1. Exact UUID match
                try:
                    p_uuid = uuid.UUID(clean_code)
                    res = self._client.table("profiles").select("*").eq("id", str(p_uuid)).execute()
                    if res.data:
                        patient_profile = res.data[0]
                except ValueError:
                    pass

                # 2. Prefix match (e.g. "600823")
                if not patient_profile and len(clean_code) >= 4:
                    res = self._client.table("profiles").select("*").ilike("id", f"{clean_code}%").execute()
                    if res.data:
                        patient_profile = res.data[0]

                # 3. Phone match
                if not patient_profile:
                    res = self._client.table("profiles").select("*").eq("phone", clean_code).execute()
                    if res.data:
                        patient_profile = res.data[0]
            except Exception as exc:
                logger.error("Supabase profile lookup failed: %s", exc)

        if not patient_profile:
            # Fallback for demo
            if clean_code.lower().startswith("11111111") or clean_code.upper().startswith("600823"):
                patient_profile = {
                    "id": clean_code if len(clean_code) == 36 else "11111111-1111-1111-1111-111111111111",
                    "full_name": "Bác Trần Văn Minh (Bệnh nhân)",
                    "role": "patient",
                }
            else:
                raise ValueError("Không tìm thấy hồ sơ người bệnh khớp với mã này. Bác vui lòng kiểm tra lại mã QR hoặc mã kết nối.")

        patient_id = patient_profile["id"]
        if str(patient_id) == caregiver_str:
            raise ValueError("Không thể tự kết nối với chính tài khoản của bạn.")

        link_id = uuid.uuid4()
        link_data = {
            "id": str(link_id),
            "patient_id": str(patient_id),
            "patient_name": patient_profile.get("full_name", "Người bệnh"),
            "caregiver_id": caregiver_str,
            "status": "accepted",
            "created_at": datetime.utcnow().isoformat(),
        }

        if self.is_connected() and self._client:
            try:
                existing = self._client.table("care_links").select("*").eq("patient_id", str(patient_id)).eq("caregiver_id", caregiver_str).execute()
                if existing.data:
                    link_id_existing = existing.data[0]["id"]
                    self._client.table("care_links").update({"status": "accepted"}).eq("id", link_id_existing).execute()
                    link_data["id"] = link_id_existing
                else:
                    self._client.table("care_links").insert({
                        "id": str(link_id),
                        "patient_id": str(patient_id),
                        "caregiver_id": caregiver_str,
                        "status": "accepted",
                    }).execute()
            except Exception as exc:
                logger.error("Supabase insert care_link failed: %s", exc)

        self._mock_care_links[str(link_data["id"])] = link_data
        return {
            "link": link_data,
            "patient": patient_profile,
        }

    async def request_care_link(self, caregiver_id: uuid.UUID, patient_id: uuid.UUID) -> Dict[str, Any]:
        link_id = uuid.uuid4()
        link = {
            "id": link_id,
            "patient_id": patient_id,
            "caregiver_id": caregiver_id,
            "status": "pending",
            "created_at": datetime.utcnow(),
        }
        self._mock_care_links[str(link_id)] = link
        return link

    async def accept_care_link(self, patient_id: uuid.UUID, link_id: uuid.UUID) -> Dict[str, Any]:
        link_str = str(link_id)
        if link_str in self._mock_care_links:
            link = self._mock_care_links[link_str]
            if str(link["patient_id"]) != str(patient_id):
                raise ValueError("unauthorized_only_patient_can_accept")
            link["status"] = "accepted"
            return link
        raise ValueError("link_not_found")

    async def revoke_care_link(self, user_id: uuid.UUID, link_id: uuid.UUID) -> Dict[str, Any]:
        """Revokes an existing care link; enforces that only the patient or caregiver can revoke."""
        user_str = str(user_id)
        link_str = str(link_id)

        if self.is_connected() and self._client:
            try:
                res = self._client.table("care_links").select("*").eq("id", link_str).execute()
                if not res.data:
                    raise ValueError("Không tìm thấy liên kết cần hủy.")
                link = res.data[0]
                if str(link.get("patient_id")) != user_str and str(link.get("caregiver_id")) != user_str:
                    raise ValueError("Bạn không có quyền hủy liên kết này.")

                self._client.table("care_links").update({"status": "revoked"}).eq("id", link_str).execute()
                link["status"] = "revoked"
                return link
            except ValueError:
                raise
            except Exception as exc:
                logger.error("Supabase revoke_care_link failed: %s", exc)

        if link_str in self._mock_care_links:
            link = self._mock_care_links[link_str]
            if str(link.get("patient_id")) != user_str and str(link.get("caregiver_id")) != user_str:
                raise ValueError("Bạn không có quyền hủy liên kết này.")
            link["status"] = "revoked"
            return link
        return {"id": link_str, "status": "revoked"}

    async def delete_care_link(self, user_id: uuid.UUID, link_id: uuid.UUID) -> Dict[str, Any]:
        """Permanently deletes an existing care link."""
        user_str = str(user_id)
        link_str = str(link_id)

        if self.is_connected() and self._client:
            try:
                res = self._client.table("care_links").select("*").eq("id", link_str).execute()
                if not res.data:
                    return {"id": link_str, "deleted": True}
                link = res.data[0]
                if str(link.get("patient_id")) != user_str and str(link.get("caregiver_id")) != user_str:
                    raise ValueError("Bạn không có quyền xóa liên kết này.")

                self._client.table("care_links").delete().eq("id", link_str).execute()
                return {"id": link_str, "deleted": True}
            except ValueError:
                raise
            except Exception as exc:
                logger.error("Supabase delete_care_link failed: %s", exc)

        if link_str in self._mock_care_links:
            del self._mock_care_links[link_str]
        return {"id": link_str, "deleted": True}

    async def delete_user_account(self, user_id: uuid.UUID, target_id: uuid.UUID) -> Dict[str, Any]:
        """Deletes a profile / relative account and associated records."""
        target_str = str(target_id)
        if self.is_connected() and self._client:
            try:
                # 1. Delete associated care links
                self._client.table("care_links").delete().or_(f"patient_id.eq.{target_str},caregiver_id.eq.{target_str}").execute()
                # 2. Delete credentials
                try:
                    self._client.table("user_credentials").delete().eq("user_id", target_str).execute()
                except Exception:
                    pass
                # 3. Delete documents
                try:
                    self._client.table("documents").delete().eq("user_id", target_str).execute()
                except Exception:
                    pass
                # 4. Delete profile
                self._client.table("profiles").delete().eq("id", target_str).execute()
                # 5. Delete Supabase Auth user if possible
                try:
                    self._client.auth.admin.delete_user(target_str)
                except Exception:
                    pass
                return {"id": target_str, "deleted": True}
            except Exception as exc:
                logger.error("Supabase delete_user_account failed: %s", exc)

        return {"id": target_str, "deleted": True}


db_service = SupabaseService()
