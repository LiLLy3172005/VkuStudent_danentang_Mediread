"""
MediRead AI - Clinical Doctor AI Consultation Route
Provides empathetic, elderly-accessible medical explanations grounded in HMU clinical knowledge.
"""

import os
import re
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, AuthenticatedUser
from app.services.supabase_service import db_service

logger = logging.getLogger("mediread.ai")
router = APIRouter(prefix="/api/v1/ai", tags=["AI Clinical Consultation"])

# Clinical Knowledge Base for Vietnamese Elderly Health
CLINICAL_KB: Dict[str, Dict[str, Any]] = {
    "glucose": {
        "keywords": ["đường", "glucose", "đường huyết", "tiểu đường", "hba1c"],
        "normal_range": "3.9 - 6.4 mmol/L (khi đói)",
        "explanation": (
            "Chỉ số Đường huyết (Glucose) phản ánh lượng đường lưu hành trong máu.\n\n"
            "• Mức bình thường khi nhịn ăn 8 tiếng: 3.9 - 6.4 mmol/L.\n"
            "• Nếu trên 7.0 mmol/L khi đói: Có nguy cơ tăng đường huyết hoặc đái tháo đường.\n"
            "• Lời khuyên cho bác: Hạn chế ăn nhiều cơm trắng, bánh mì trắng, bánh kẹo ngọt; nên ăn nhiều rau có chất xơ (rau muống, bí, mướp đắng) và đi bộ nhẹ nhàng 20-30 phút mỗi ngày."
        ),
        "suggestions": ["Đường huyết lúc đói bao nhiêu là nguy hiểm?", "Người cao tuổi nên kiêng ăn gì khi đường huyết cao?"],
    },
    "creatinin": {
        "keywords": ["creatinin", "creatinine", "thận", "ure", "urea", "egfr"],
        "normal_range": "Nam: 62 - 120 µmol/L; Nữ: 53 - 100 µmol/L",
        "explanation": (
            "Chỉ số Creatinin máu là thước đo quan trọng hàng đầu để đánh giá chức năng lọc của thận.\n\n"
            "• Creatinin bình thường chứng tỏ thận vẫn lọc chất thải tốt.\n"
            "• Khi Creatinin tăng cao: Cảnh báo chức năng thận đang giảm, thận bị quá tải hoặc cơ thể thiếu nước.\n"
            "• Lời khuyên cho bác: Uống đủ 1.5 - 2 lít nước ấm mỗi ngày, hạn chế ăn mặn (kho dưới 5g muối/ngày), không tự ý uống các loại thuốc giảm đau hay lá cây không rõ nguồn gốc."
        ),
        "suggestions": ["Creatinin tăng cao có phải suy thận không?", "Người bệnh thận nên uống bao nhiêu nước một ngày?"],
    },
    "cholesterol": {
        "keywords": ["cholesterol", "mỡ máu", "triglycerid", "triglyceride", "hdl", "ldl", "lipid"],
        "normal_range": "Cholesterol toàn phần: dưới 5.2 mmol/L; Triglycerid: dưới 1.88 mmol/L",
        "explanation": (
            "Bộ chỉ số Lipid máu phản ánh lượng chất béo và mỡ trong lòng mạch.\n\n"
            "• Nếu Cholesterol > 5.2 mmol/L hoặc Triglycerid > 2.2 mmol/L: Mỡ máu đang ở mức cao, dễ tạo mảng xơ vữa làm xơ cứng thành mạch.\n"
            "• Lời khuyên cho bác: Giảm ăn mỡ động vật, da gà vịt, nội tạng; thay bằng dầu thực vật hoặc mỡ cá; ăn thêm các loại hạt và rau xanh."
        ),
        "suggestions": ["Mỡ máu cao có gây đột quỵ không?", "Cách hạ mỡ máu tự nhiên cho người cao tuổi?"],
    },
    "ast_alt": {
        "keywords": ["ast", "alt", "got", "gpt", "men gan", "gan"],
        "normal_range": "Dưới 35 U/L (cả nam và nữ)",
        "explanation": (
            "Chỉ số Men gan (AST/ALT) phản ánh mức độ tổn thương của tế bào gan.\n\n"
            "• Bình thường: Dưới 35 U/L.\n"
            "• Khi men gan tăng: Tế bào gan đang bị kích thích do thuốc, viêm gan hoặc rượu bia.\n"
            "• Lời khuyên cho bác: Uống thuốc đúng giờ, không tự ý tăng liều; ngủ trước 23h để gan đào thải độc tố tốt nhất."
        ),
        "suggestions": ["Men gan cao bao nhiêu thì nguy hiểm?", "Uống thuốc tây dài ngày có làm tăng men gan không?"],
    },
    "blood_pressure": {
        "keywords": ["huyết áp", "cao huyết áp", "tăng huyết áp", "amlodipin", "losartan"],
        "normal_range": "Dưới 130/80 mmHg (người cao tuổi an toàn dưới 140/90 mmHg)",
        "explanation": (
            "Huyết áp là áp lực của dòng máu lên thành động mạch.\n\n"
            "• Ngưỡng an toàn cho người cao tuổi: 120/80 đến dưới 140/90 mmHg.\n"
            "• QUAN TRỌNG: Thuốc huyết áp (như Amlodipin) cần được uống đều đặn mỗi sáng sau ăn, tuyệt đối không được ngừng thuốc đột ngột khi thấy người khỏe vì có thể gây tăng huyết áp kịch phát."
        ),
        "suggestions": ["Huyết áp 140/90 có cần uống thuốc không?", "Nên đo huyết áp vào thời điểm nào trong ngày?"],
    },
}


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    document_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    suggested_questions: List[str] = []
    has_clinical_source: bool = True


@router.post("/chat", response_model=ChatResponse)
async def chat_doctor_ai(
    req: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Direct clinical consultation endpoint for elderly patients and caregivers.
    1. Inspects query keywords against clinical knowledge base
    2. Incorporates patient context if document_id is provided
    3. Responds in empathetic, clear, Vietnamese medical guidance.
    """
    user_query = req.message.strip().lower()
    doc_context = ""

    # 1. Pull document context if provided
    if req.document_id:
        try:
            doc = await db_service.get_document(req.document_id, current_user.id)
            if doc and doc.get("lab_results"):
                labs_summary = ", ".join(
                    f"{l.get('name')}: {l.get('value_num') or l.get('value_text')} {l.get('unit', '')}"
                    for l in doc["lab_results"][:6]
                )
                doc_context = f"Thông tin phiếu khám của bác: Cơ sở: {doc.get('facility_name', 'Bệnh viện')}, Chỉ số gồm: {labs_summary}."
        except Exception as exc:
            logger.warning("Could not pull doc context: %s", exc)

    # 2. Check clinical KB matching
    matched_topic = None
    for topic, data in CLINICAL_KB.items():
        if any(kw in user_query for kw in data["keywords"]):
            matched_topic = data
            break

    if matched_topic:
        reply_text = f"Dạ thưa bác, cháu xin giải thích rõ thắc mắc của bác:\n\n{matched_topic['explanation']}"
        if doc_context:
            reply_text = f"{doc_context}\n\n{reply_text}"
        suggestions = matched_topic.get("suggestions", [])
    else:
        # General empathetic medical guidance
        reply_text = (
            "Dạ thưa bác, cháu đã tiếp nhận câu hỏi của bác.\n\n"
            "Để chăm sóc sức khỏe tốt nhất ở độ tuổi này, bác lưu ý:\n"
            "1. Uống thuốc đúng giờ, đúng liều lượng bác sĩ kê đơn, không tự ý thêm bớt liều.\n"
            "2. Duy trì chế độ ăn thanh đạm, ít muối, hạn chế dầu mỡ và đồ ngọt; bổ sung rau xanh và uống đủ nước ấm.\n"
            "3. Vận động nhẹ nhàng (đi bộ, tập dưỡng sinh) 20-30 phút mỗi ngày.\n"
            "4. Nếu có dấu hiệu mệt mỏi bất thường, đau đầu, tức ngực hoặc chóng mặt, bác hãy báo ngay cho người thân hoặc đến cơ sở y tế gần nhất nhé!"
        )
        if doc_context:
            reply_text = f"{doc_context}\n\n{reply_text}"
        suggestions = [
            "Chỉ số đường huyết bao nhiêu là bình thường?",
            "Uống thuốc huyết áp lúc nào tốt nhất?",
            "Mỡ máu cao nên kiêng ăn gì?",
        ]

    return ChatResponse(
        reply=reply_text,
        suggested_questions=suggestions,
        has_clinical_source=True,
    )
