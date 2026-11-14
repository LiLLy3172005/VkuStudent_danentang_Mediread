"""
MediRead AI - Documents & Upload Routes
Protected by Supabase Auth JWT, SlowAPI rate limiting, and background processing.
"""

import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, BackgroundTasks, Request

from app.config import settings
from app.auth import get_current_user, AuthenticatedUser
from app.security import limiter, validate_upload_file
from app.services.supabase_service import db_service
from app.schemas.documents import (
    DocumentUploadResponse,
    DocumentSummary,
    DocumentDetailResponse,
    ExtractionConfirmRequest,
)

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])

STORAGE_ROOT = Path("storage/documents")
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


async def process_document_background(
    doc_id: uuid.UUID,
    user_id: uuid.UUID,
    saved_file_path: Path,
    doc_type: str,
    patient_sex: str,
    age_group: str,
):
    """Worker task executed asynchronously in background."""
    try:
        from worker.jobs import DocumentProcessor
        processor = DocumentProcessor()
        results = processor.process_document(
            file_path=saved_file_path,
            doc_type=doc_type,
            patient_sex=patient_sex,
            age_group=age_group,
            work_dir=saved_file_path.parent / "processed",
        )
        await db_service.save_worker_results(doc_id, user_id, results)
    except Exception as exc:
        import logging
        logging.getLogger("mediread.worker").exception("Background processing error for doc %s: %s", doc_id, exc)


@router.post("/upload", response_model=DocumentUploadResponse)
@limiter.limit(settings.RATE_LIMIT_SCAN)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = Form("lab_report"),
    patient_sex: str = Form("unknown"),
    age_group: str = Form("unknown"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Secure document upload endpoint:
    1. Validates JWT
    2. Validates image MIME, magic bytes, dimensions, and size limit
    3. Saves into private user storage folder {user_id}/{doc_id}/{filename}
    4. Dispatches asynchronous worker task without blocking HTTP request
    """
    file_bytes, safe_filename = await validate_upload_file(file)

    doc_id = uuid.uuid4()
    user_folder = STORAGE_ROOT / str(current_user.id) / str(doc_id)
    user_folder.mkdir(parents=True, exist_ok=True)
    saved_path = user_folder / safe_filename

    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    storage_path = f"{current_user.id}/{doc_id}/{safe_filename}"
    await db_service.create_document(
        user_id=current_user.id,
        doc_type=doc_type,
        storage_path=storage_path,
        is_pii_masked=True,
        document_id=doc_id,
    )

    # Dispatch to background processor
    background_tasks.add_task(
        process_document_background,
        doc_id,
        current_user.id,
        saved_path,
        doc_type,
        patient_sex,
        age_group,
    )

    return DocumentUploadResponse(
        document_id=doc_id,
        storage_path=storage_path,
        status="uploaded",
        message="Tài liệu đã được tải lên an toàn và đang được xử lý trong nền.",
    )


@router.get("", response_model=List[DocumentSummary])
async def list_documents(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lists past documents belonging to current authenticated user."""
    docs = await db_service.list_documents(current_user.id)
    return docs


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document_detail(
    document_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Gets full extraction, OCR confidence, lab results, and RAG explanations."""
    doc = await db_service.get_document(document_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="document_not_found")

    # Verify ownership or caregiver access
    if str(doc["user_id"]) != str(current_user.id):
        # Check caregiver link
        care_links = await db_service.get_care_links(current_user.id)
        is_caregiver = any(
            str(link["patient_id"]) == str(doc["user_id"])
            and str(link["caregiver_id"]) == str(current_user.id)
            and link["status"] == "accepted"
            for link in care_links
        )
        if not is_caregiver:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="access_denied")

    return doc


@router.post("/{document_id}/confirm")
async def confirm_document_results(
    document_id: uuid.UUID,
    req: ExtractionConfirmRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """User reviews and accepts/modifies the draft OCR extraction."""
    doc = await db_service.get_document(document_id, current_user.id)
    if not doc or str(doc["user_id"]) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="document_not_found_or_unauthorized")

    result = await db_service.confirm_extraction(document_id, current_user.id, req.confirmed_data)
    return {"message": "Dữ liệu đã được người dùng xác nhận thành công.", "document": result}
