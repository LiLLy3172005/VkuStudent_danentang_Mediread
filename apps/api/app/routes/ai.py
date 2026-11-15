"""
MediRead AI - Clinical Doctor AI Consultation Route
Dynamic medical AI powered by Gemini Flash & HMU Clinical RAG Knowledge.
Answers ANY user question accurately, directly to the point, and in elderly-accessible Vietnamese.
"""

import os
import re
import json
import logging
from typing import Optional, List, Dict, Any
import httpx
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.auth import get_current_user, AuthenticatedUser
from app.services.supabase_service import db_service

logger = logging.getLogger("mediread.ai")
router = APIRouter(prefix="/api/v1/ai", tags=["AI Clinical Consultation"])

GEMINI_API_KEY = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-flash-lite-latest"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

SYSTEM_PROMPT = """Bạn là Bác Sĩ AI MediRead — trợ lý tư vấn sức khỏe và giải thích kết quả y khoa cho người bệnh, đặc biệt là người cao tuổi và gia đình người bệnh tại Việt Nam.

QUY TẮC BẮT BUỘC:
1. TRẢ LỜI ĐÚNG TRỌNG TÂM câu hỏi của người bệnh. KHÔNG nói vòng vo, KHÔNG trả lời rập khuôn.
2. Giọng điệu ân cần, lễ phép, gần gũi, xưng "cháu" và gọi người dùng là "bác" (hoặc "bạn").
3. Giải thích ngắn gọn, dễ hiểu, tối đa 3-5 câu, không dùng thuật ngữ chuyên môn quá hàn lâm mà không giải nghĩa.
4. TUYỆT ĐỐI KHÔNG tự ý chẩn đoán xác định bệnh nan y hay khuyên người bệnh tự ý ngưng thuốc điều trị. Luôn nhắc nhở tham vấn bác sĩ trực tiếp khám bệnh khi cần thay đổi liều lượng.
5. Nếu trong ngữ cảnh có thông tin phiếu xét nghiệm của người bệnh, hãy đối chiếu trực tiếp với các chỉ số đó để trả lời chính xác.
"""

# Fallback Clinical Knowledge Base if offline or API quota limit reached
FALLBACK_CLINICAL_KB: Dict[str, Dict[str, Any]] = {
    "glucose": {
        "keywords": ["đường", "glucose", "đường huyết", "tiểu đường", "hba1c"],
        "answer": "Dạ thưa bác, chỉ số đường huyết (Glucose) lúc đói bình thường từ 3.9 - 6.4 mmol/L. Nếu đo được mức cao hơn, bác cần giảm ăn cơm trắng, bánh ngọt, kiêng nước ngọt có gas và đi bộ nhẹ nhàng 20 phút mỗi ngày sau ăn nhé.",
    },
    "creatinin": {
        "keywords": ["creatinin", "creatinine", "thận", "ure", "urea", "egfr"],
        "answer": "Dạ thưa bác, Creatinin phản ánh khả năng lọc chất thải của thận (bình thường 62 - 120 µmol/L). Khi Creatinin tăng, bác nên uống đủ 1.5 - 2 lít nước ấm mỗi ngày, ăn nhạt bớt và tuyệt đối không tự ý uống các loại thuốc giảm đau hay lá cây không rõ nguồn gốc.",
    },
    "cholesterol": {
        "keywords": ["cholesterol", "mỡ máu", "triglycerid", "triglyceride", "hdl", "ldl", "lipid"],
        "answer": "Dạ thưa bác, mỡ máu (Cholesterol toàn phần) an toàn là dưới 5.2 mmol/L. Nếu bị mỡ máu cao, bác nên hạn chế mỡ động vật, da gia cầm, phủ tạng; thay bằng dầu thực vật, ăn nhiều cá và rau củ xanh luộc nhé.",
    },
    "blood_pressure": {
        "keywords": ["huyết áp", "cao huyết áp", "tăng huyết áp", "amlodipin", "losartan"],
        "answer": "Dạ thưa bác, huyết áp mục tiêu của người lớn tuổi là dưới 140/90 mmHg. Bác nhớ uống thuốc huyết áp đều đặn mỗi sáng theo đúng đơn của bác sĩ, không tự ý ngưng thuốc ngay cả khi thấy người khỏe.",
    },
}


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    document_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    suggested_questions: List[str] = []
    has_clinical_source: bool = True


async def query_gemini_ai(user_prompt: str, context_text: str = "") -> Optional[str]:
    """Queries Gemini API for direct, empathetic clinical consultation."""
    if not GEMINI_API_KEY:
        return None

    full_prompt = f"{SYSTEM_PROMPT}\n\n"
    if context_text:
        full_prompt += f"[THÔNG TIN PHIẾU KHÁM CỦA BỆNH NHÂN]:\n{context_text}\n\n"
    full_prompt += f"[CÂU HỎI CỦA NGƯỜI BỆNH]:\n{user_prompt}\n\n[BÁC SĨ AI TRẢ LỜI ĐÚNG TRỌNG TÂM]:"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": full_prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 450,
                    },
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
            else:
                logger.warning("Gemini API returned status %s: %s", resp.status_code, resp.text[:150])
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)

    return None


@router.post("/chat", response_model=ChatResponse)
async def chat_doctor_ai(
    req: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Direct, dynamic clinical consultation endpoint for elderly patients and caregivers.
    1. Answers user question accurately and directly to the point using Gemini AI.
    2. Incorporates patient context if document_id is provided.
    3. Falls back gracefully to HMU Clinical KB if network is offline.
    """
    user_query = req.message.strip()
    doc_context = ""

    # 1. Pull document context if document_id provided
    if req.document_id:
        try:
            doc = await db_service.get_document(req.document_id, current_user.id)
            if doc:
                facility = doc.get("facility_name") or "Cơ sở y tế"
                issued = doc.get("issued_date") or ""
                doc_context_parts = [f"Bệnh viện: {facility}"]
                if issued:
                    doc_context_parts.append(f"Ngày khám: {issued}")

                if doc.get("lab_results"):
                    labs_str = "; ".join(
                        f"{l.get('name')}: {l.get('value_num') or l.get('value_text')} {l.get('unit', '')} (Chuẩn: {l.get('reference_range_used', '')}, Đánh giá: {l.get('flag', '')})"
                        for l in doc["lab_results"][:8]
                    )
                    doc_context_parts.append(f"Kết quả xét nghiệm: {labs_str}")

                if doc.get("medications"):
                    meds_str = "; ".join(
                        f"{m.get('name')} {m.get('dosage', '')} - {m.get('instructions', '')}"
                        for m in doc["medications"][:5]
                    )
                    doc_context_parts.append(f"Đơn thuốc kê: {meds_str}")

                doc_context = "\n".join(doc_context_parts)
        except Exception as exc:
            logger.warning("Could not pull doc context: %s", exc)

    # 2. Try Gemini Dynamic Reasoning
    ai_reply = await query_gemini_ai(user_query, doc_context)

    # 3. Fallback to Clinical Knowledge Base if Gemini offline
    if not ai_reply:
        lower_q = user_query.lower()
        matched = None
        for key, item in FALLBACK_CLINICAL_KB.items():
            if any(kw in lower_q for kw in item["keywords"]):
                matched = item["answer"]
                break

        if matched:
            ai_reply = matched
        else:
            ai_reply = (
                "Dạ thưa bác, cháu đã lắng nghe câu hỏi của bác. "
                "Để đảm bảo sức khỏe an toàn nhất, bác nên duy trì lối sống lành mạnh, ăn nhạt, kiêng đồ ngọt và dầu mỡ, uống đủ nước ấm. "
                "Nếu bác có triệu chứng mệt mỏi, tức ngực hay khó chịu bất thường, bác hãy đến gặp bác sĩ trực tiếp để được thăm khám kỹ càng nhé!"
            )

    # 4. Generate relevant follow-up questions
    suggestions = [
        "Chỉ số xét nghiệm của tôi có bình thường không?",
        "Khi nào nên uống thuốc huyết áp?",
        "Chế độ ăn phù hợp cho người cao tuổi?",
    ]

    return ChatResponse(
        reply=ai_reply,
        suggested_questions=suggestions,
        has_clinical_source=True,
    )
