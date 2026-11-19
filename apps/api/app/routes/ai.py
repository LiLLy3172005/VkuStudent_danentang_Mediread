"""
MediRead AI - Clinical Doctor AI Consultation Route
Primary Engine: Local Ollama Qwen 2.5 7B + Local RAG Knowledge Base (from Thutudong)
Fallback Engine: Gemini Flash Lite / Embedded Clinical KB
Direct, empathetic consultation for elderly patients and families in Vietnam.
"""

import os
import re
import json
import logging
from typing import Optional, List, Dict, Any
import httpx
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Request

from app.config import settings
from app.auth import get_current_user, AuthenticatedUser
from app.services.supabase_service import db_service
from app.security import limiter

logger = logging.getLogger("mediread.ai")
router = APIRouter(prefix="/api/v1/ai", tags=["AI Clinical Consultation"])

# Configuration for Local Ollama Bot & Cloud Fallback
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

GEMINI_API_KEY = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-flash-lite-latest"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# Path to the user's RAG knowledge FAQ in Thutudong
RAG_FAQ_PATHS = [
    r"D:\Do An Cuoi Ki\Thutudong\faq_xet_nghiem.md",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "Thutudong", "faq_xet_nghiem.md"),
]

SYSTEM_PROMPT = """Bạn là Bác Sĩ AI MediRead — trợ lý tư vấn sức khỏe và giải thích kết quả y khoa cho người bệnh lớn tuổi và gia đình tại Việt Nam.

QUY TẮC BẮT BUỘC:
1. TRẢ LỜI ĐÚNG TRỌNG TÂM câu hỏi của người bệnh. KHÔNG nói vòng vo, KHÔNG trả lời rập khuôn.
2. Giọng điệu ân cần, lễ phép, gần gũi. Xưng "cháu" và gọi người bệnh là "bác". Bắt đầu câu trả lời bằng: "Dạ thưa bác, ".
3. Giải thích ngắn gọn, dễ hiểu, tối đa 3-5 câu, tránh thuật ngữ y khoa phức tạp mà không giải nghĩa.
4. TUYỆT ĐỐI KHÔNG tự ý chẩn đoán xác định bệnh nan y hay khuyên người bệnh tự ý ngưng thuốc điều trị. Luôn nhắc nhở tham vấn bác sĩ trực tiếp khám bệnh khi cần thay đổi liều lượng.
5. Nếu trong ngữ cảnh có thông tin phiếu xét nghiệm của người bệnh, hãy đối chiếu trực tiếp với các chỉ số đó để trả lời chính xác.
"""

def load_local_rag_knowledge() -> List[Dict[str, str]]:
    """Loads sections from the user's Thutudong faq_xet_nghiem.md if available."""
    for path in RAG_FAQ_PATHS:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                raw_sections = content.split("## ")
                docs = []
                for s in raw_sections:
                    s = s.strip()
                    if not s:
                        continue
                    lines = s.split("\n", 1)
                    title = lines[0].strip()
                    body = lines[1].strip() if len(lines) > 1 else ""
                    docs.append({"title": title, "content": f"{title}\n{body}"})
                return docs
            except Exception as e:
                logger.warning("Could not read RAG FAQ from %s: %s", path, e)
    return []

LOCAL_RAG_DOCS = load_local_rag_knowledge()

def search_local_rag(query: str, top_k: int = 2) -> str:
    """Simple keyword matching over the user's RAG knowledge base."""
    if not LOCAL_RAG_DOCS:
        return ""
    q_words = [w.lower() for w in re.findall(r"\w+", query) if len(w) > 1]
    if not q_words:
        return ""
    scored = []
    for doc in LOCAL_RAG_DOCS:
        content_lower = doc["content"].lower()
        score = sum(1 for w in q_words if w in content_lower)
        if score > 0:
            scored.append((score, doc["content"]))
    scored.sort(key=lambda x: x[0], reverse=True)
    best = [c for _, c in scored[:top_k]]
    return "\n\n---\n\n".join(best)

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
    message: str = Field(..., min_length=1, max_length=1000)
    document_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    suggested_questions: List[str] = []
    has_clinical_source: bool = True
    engine: Optional[str] = None


async def query_local_ollama_ai(user_prompt: str, context_text: str = "", rag_text: str = "") -> Optional[str]:
    """
    Primary: Queries the user's local Qwen 2.5 7B model running on Ollama.
    Uses zero cloud dependencies, private, local, exactly from the user's project.
    """
    full_prompt = f"{SYSTEM_PROMPT}\n\n"
    if rag_text:
        full_prompt += f"[TÀI LIỆU Y KHOA THAM KHẢO]:\n{rag_text}\n\n"
    if context_text:
        full_prompt += f"[THÔNG TIN PHIẾU KHÁM CỦA BỆNH NHÂN]:\n{context_text}\n\n"
    full_prompt += f"[CÂU HỎI CỦA NGƯỜI BỆNH]:\n{user_prompt}\n\n[TRẢ LỜI]:"

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [{"role": "user", "content": full_prompt}],
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 400,
                    },
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                msg = data.get("message", {}).get("content", "").strip()
                if msg:
                    return msg
    except Exception as exc:
        logger.info("Local Ollama not reachable (%s), will try fallback...", exc)
    return None


async def query_gemini_ai(user_prompt: str, context_text: str = "", rag_text: str = "") -> Optional[str]:
    """Secondary Fallback: Queries Gemini API if local Ollama is offline."""
    if not GEMINI_API_KEY:
        return None

    full_prompt = f"{SYSTEM_PROMPT}\n\n"
    if rag_text:
        full_prompt += f"[TÀI LIỆU Y KHOA THAM KHẢO]:\n{rag_text}\n\n"
    if context_text:
        full_prompt += f"[THÔNG TIN PHIẾU KHÁM CỦA BỆNH NHÂN]:\n{context_text}\n\n"
    full_prompt += f"[CÂU HỎI CỦA NGƯỜI BỆNH]:\n{user_prompt}\n\n[TRẢ LỜI]:"

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
    except Exception as exc:
        logger.warning("Gemini API call failed: %s", exc)
    return None


@router.post("/chat", response_model=ChatResponse)
@limiter.limit(settings.RATE_LIMIT_AI)
async def chat_doctor_ai(
    request: Request,
    req: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Direct, dynamic clinical consultation endpoint:
    1. Retrieves relevant RAG chunks from the user's local FAQ/books.
    2. Prioritizes the user's Local Qwen 2.5 7B Bot via Ollama.
    3. Falls back gracefully to Gemini API if Ollama is not active.
    4. Falls back to static clinical KB if completely offline.
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

    # 2. Retrieve relevant chunks from local RAG KB
    rag_context = search_local_rag(user_query)

    # 3. Step 1: Query user's local Qwen 2.5 7B bot via Ollama
    engine_used = f"Ollama {OLLAMA_MODEL} (Local RAG)"
    ai_reply = await query_local_ollama_ai(user_query, doc_context, rag_context)

    # 4. Step 2: Cloud Fallback to Gemini if Ollama was not available
    if not ai_reply:
        engine_used = f"Gemini {GEMINI_MODEL} (Cloud Fallback)"
        ai_reply = await query_gemini_ai(user_query, doc_context, rag_context)

    # 5. Step 3: Offline Clinical KB Fallback
    if not ai_reply:
        engine_used = "Clinical Knowledge Base (Offline Fallback)"
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

    # 6. Follow-up suggestions
    suggestions = [
        "Chỉ số xét nghiệm của tôi có bình thường không?",
        "Khi nào nên uống thuốc huyết áp?",
        "Chế độ ăn phù hợp cho người cao tuổi?",
    ]

    return ChatResponse(
        reply=ai_reply,
        suggested_questions=suggestions,
        has_clinical_source=True,
        engine=engine_used,
    )
