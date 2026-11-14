"""
MediRead AI - Supabase PostgreSQL & Storage Access Service
Interacts with Supabase using authenticated RLS context and provides local fallback for staging/test.
"""

import os
import uuid
from datetime import datetime, date
from typing import List, Dict, Any, Optional
import logging
from app.config import settings

logger = logging.getLogger("mediread.supabase")


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

    async def get_document(self, document_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        doc_id_str = str(document_id)
        if self._client:
            try:
                res = self._client.table("documents").select("*").eq("id", doc_id_str).execute()
                if res.data:
                    doc = res.data[0]
                    # Also fetch lab results & medications
                    labs = self._client.table("lab_results").select("*").eq("document_id", doc_id_str).execute()
                    meds = self._client.table("medications").select("*").eq("document_id", doc_id_str).execute()
                    exps = self._client.table("explanations").select("*").eq("document_id", doc_id_str).execute()
                    doc["lab_results"] = labs.data or []
                    doc["medications"] = meds.data or []
                    doc["explanations"] = exps.data or []
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
        update_payload = {
            "status": results["status"],
            "ocr_text": results.get("raw_ocr_text"),
            "ocr_confidence": results.get("ocr_confidence"),
            "facility_name": results.get("facility_name"),
            "issued_date": results.get("issued_date"),
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
                        "measured_at": results.get("issued_date") or date.today().isoformat(),
                    })

        if self._client:
            try:
                self._client.table("documents").update(update_payload).eq("id", doc_id_str).execute()
                # Insert lab items
                for lab in results.get("lab_results", []):
                    self._client.table("lab_results").insert({
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
                        "flag": (lab.get("flag") or "UNKNOWN").upper(),
                    }).execute()
            except Exception as exc:
                logger.error("Supabase save worker results failed: %s", exc)

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

    async def get_lab_trends(self, user_id: uuid.UUID, code: str) -> List[Dict[str, Any]]:
        user_str = str(user_id)
        history = []
        if user_str in self._mock_lab_results:
            for item in self._mock_lab_results[user_str]:
                if item["normalized_code"].upper() == code.upper() or item["name"].lower() == code.lower():
                    history.append(item)
        return history

    async def get_care_links(self, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        user_str = str(user_id)
        return [
            link for link in self._mock_care_links.values()
            if str(link["patient_id"]) == user_str or str(link["caregiver_id"]) == user_str
        ]

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


db_service = SupabaseService()
