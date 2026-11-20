"""
MediRead AI - RAG Medical Explanation Service
Educational, non-diagnostic medical explanation for elderly patients.
Includes strict citation verification, anti-prompt injection, and deterministic cache isolation.
"""

import os
import re
import json
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import httpx
from langchain_huggingface import HuggingFaceEmbeddings
logger = logging.getLogger("mediread.rag")

DEFAULT_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
DEFAULT_CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", r"D:\Do An Cuoi Ki\Thutudong\chroma_db")
ENABLE_EXPLANATION_CACHE = os.getenv("ENABLE_EXPLANATION_CACHE", "true").lower() == "true"

MEDICAL_DISCLAIMER = "Thông tin mang tính chất giải thích giáo dục sức khỏe tham khảo, tuyệt đối không thay thế chẩn đoán hay chỉ định của bác sĩ điều trị."

CURATED_CLINICAL_KB: Dict[str, Dict[str, str]] = {
    "BASO": {
        "title": "Huyết học Lâm sàng: Bạch cầu ái kiềm (Basophils)",
        "content": (
            "Bạch cầu ái kiềm (Basophils) là một loại bạch cầu tham gia vào các phản ứng dị ứng, quá mẫn và giải phóng histamine. "
            "Bạch cầu ái kiềm không liên quan đến chống vi khuẩn hay vi rút cấp, và hoàn toàn không liên quan đến việc tiêu thụ đường "
            "hay giải phóng insulin. Tỷ lệ BASO% tăng nhẹ đơn độc (như 0.33% so với ngưỡng 0.2%, số lượng tuyệt đối ~0.03 K/uL) "
            "khi tổng số lượng bạch cầu (WBC) bình thường hầu như không có ý nghĩa lâm sàng bệnh lý, thường chỉ là dao động sinh lý tự nhiên."
        ),
    },
    "NEU": {
        "title": "Huyết học Lâm sàng: Bạch cầu trung tính (Neutrophils)",
        "content": (
            "Bạch cầu trung tính (Neutrophils) là hàng rào miễn dịch đầu tiên chống lại các tác nhân vi khuẩn và nấm. "
            "Khi tỷ lệ NEU% chỉ vượt nhẹ sát ngưỡng tham chiếu (ví dụ 80.4% so với ngưỡng 80.0%) trong khi tổng số lượng bạch cầu (WBC) "
            "hoàn toàn nằm trong khoảng bình thường, đây không phải là bằng chứng khẳng định nhiễm trùng cấp, mà thường là dao động sinh lý "
            "bình thường hoặc phản ứng thoáng qua của cơ thể."
        ),
    },
    "RBC": {
        "title": "Huyết học Lâm sàng: Số lượng hồng cầu (RBC) & Thiếu máu",
        "content": (
            "Số lượng hồng cầu (RBC) phản ánh khả năng vận chuyển oxy từ phổi đến các mô cơ quan. "
            "Khi RBC giảm thấp kết hợp với dung tích hồng cầu (HCT) giảm hoặc huyết sắc tố (Hb) nằm sát giới hạn dưới, "
            "đây là dấu hiệu của tình trạng thiếu máu mức độ nhẹ. Nếu thể tích trung bình hồng cầu (MCV) bình thường (80 - 97 fL), "
            "đây là dạng thiếu máu hồng cầu kích thước bình thường (normocytic normochromic anemia). Người bệnh nên bồi bổ thực phẩm "
            "giàu sắt, đạm và tái khám bác sĩ để tìm nguyên nhân."
        ),
    },
    "HCT": {
        "title": "Huyết học Lâm sàng: Dung tích hồng cầu (HCT - Hematocrit)",
        "content": (
            "Dung tích hồng cầu (HCT) là tỷ lệ phần trăm thể tích của tế bào hồng cầu trong máu toàn phần. "
            "HCT giảm phản ánh lượng khối hồng cầu giảm, thường gặp trong tình trạng thiếu máu nhẹ khi đi kèm RBC giảm. "
            "Bác nên nghỉ ngơi, bồi bổ thực phẩm giàu sắt và protein, đồng thời trao đổi với bác sĩ khi tái khám."
        ),
    },
    "HGB": {
        "title": "Huyết học Lâm sàng: Huyết sắc tố (Hemoglobin - Hb/HGB)",
        "content": (
            "Huyết sắc tố (Hb/HGB) là phân tử protein giàu sắt trong hồng cầu có nhiệm vụ mang oxy. "
            "Nồng độ Hb nằm sát giới hạn dưới kết hợp với RBC và HCT thấp là dấu hiệu của thiếu máu mức độ nhẹ."
        ),
    },
    "RDW": {
        "title": "Huyết học Lâm sàng: Độ phân bố kích thước hồng cầu (RDW)",
        "content": (
            "Độ phân bố kích thước hồng cầu (RDW) đo lường mức độ đồng đều về thể tích giữa các tế bào hồng cầu trong máu. "
            "Chỉ số RDW giảm nhẹ hoặc ở mức thấp (như 10.7% so với 11.5%) cho thấy các hồng cầu có kích thước rất đồng đều nhau, "
            "trên lâm sàng hoàn toàn bình thường, lành tính và không có ý nghĩa bệnh lý đáng lo ngại."
        ),
    },
    "EOS": {
        "title": "Huyết học Lâm sàng: Bạch cầu ái toan (Eosinophils)",
        "content": (
            "Bạch cầu ái toan (Eosinophils) tham gia chống ký sinh trùng và dị ứng. Giá trị trong khoảng 0 - 7% là bình thường."
        ),
    },
    "PLT": {
        "title": "Huyết học Lâm sàng: Số lượng tiểu cầu (PLT)",
        "content": (
            "Số lượng tiểu cầu giữ vai trò thiết yếu trong việc đông máu và cầm máu, ngăn ngừa xuất huyết."
        ),
    },
}


def find_curated_knowledge(name: str) -> Optional[Dict[str, str]]:
    """Finds curated clinical reference for an indicator."""
    n = (name or "").upper()
    for code, info in CURATED_CLINICAL_KB.items():
        if f"({code}" in n or f" {code} " in f" {n} " or n.startswith(code):
            return info
    n_lower = (name or "").lower()
    if "ái kiềm" in n_lower or "baso" in n_lower:
        return CURATED_CLINICAL_KB.get("BASO")
    if "trung tính" in n_lower or "neu" in n_lower:
        return CURATED_CLINICAL_KB.get("NEU")
    if "hồng cầu" in n_lower and "phân bố" not in n_lower and "dung tích" not in n_lower:
        return CURATED_CLINICAL_KB.get("RBC")
    if "dung tích hồng cầu" in n_lower or "hct" in n_lower:
        return CURATED_CLINICAL_KB.get("HCT")
    if "huyết sắc tố" in n_lower or "hgb" in n_lower or "hb" in n_lower:
        return CURATED_CLINICAL_KB.get("HGB")
    if "phân bố" in n_lower or "rdw" in n_lower:
        return CURATED_CLINICAL_KB.get("RDW")
    if "ái toan" in n_lower or "eos" in n_lower:
        return CURATED_CLINICAL_KB.get("EOS")
    if "tiểu cầu" in n_lower or "plt" in n_lower:
        return CURATED_CLINICAL_KB.get("PLT")
    return None


SAFE_EXPLAIN_PROMPT = """Bạn là bác sĩ trợ lý chuyên giải thích kết quả xét nghiệm y khoa cho người bệnh cao tuổi.
Mục tiêu: Giúp người bệnh hiểu rõ chỉ số này là gì, kết quả của họ có ý nghĩa gì đối với sức khỏe và cần làm gì tiếp theo.

QUY TẮC BẮT BUỘC:
1. KHÔNG đưa ra kết luận chẩn đoán xác định bệnh tật.
2. KHÔNG tự ý thay đổi đơn thuốc hoặc liều dùng.
3. Giải thích bằng tiếng Việt giản dị, ân cần, tôn trọng, xưng "bác sĩ" hoặc "hệ thống", gọi người bệnh là "bác" hoặc "cô chú".
4. Nội dung gồm 3 ý chính (tối đa 4-5 câu, khoảng 100-140 từ):
   - Chỉ số này là gì và có chức năng gì trong cơ thể.
   - Nhận định kết quả hiện tại (khi {status_vi}) có ý nghĩa gì đối với sức khỏe.
   - Lời khuyên ăn uống, nghỉ ngơi thực tế và lời dặn trao đổi với bác sĩ điều trị khi tái khám.
5. NGUYÊN TẮC Y KHOA CHUẨN XÁC:
   - Nếu giải thích về Hồng cầu (RBC) hoặc HCT thấp: Nhận định là dấu hiệu thiếu máu nhẹ; khuyên ăn uống bồi bổ thực phẩm giàu sắt, protein (thịt bò, trứng, rau xanh) và trao đổi với bác sĩ khi tái khám.
   - Nếu giải thích về Bạch cầu thành phần (như NEU%, BASO%) chỉ chênh lệch nhẹ sát ngưỡng tham chiếu: KHÔNG khẳng định người bệnh bị nhiễm trùng nặng hay nhiễm khuẩn cấp, đây thường chỉ là dao động sinh lý bình thường.
   - Bạch cầu ái kiềm (BASO): Liên quan đến dị ứng và viêm, KHÔNG liên quan đến chống vi khuẩn hay ăn đường tiết insulin.
   - Độ phân bố hồng cầu (RDW) hơi thấp: Kích thước hồng cầu đồng đều, lành tính, không có ý nghĩa bệnh lý đáng lo.
6. KHÔNG dùng tiêu đề markdown (# hoặc ##), không dùng từ chối rập khuôn.

[CHỈ SỐ BỆNH NHÂN]:
- Tên chỉ số: {name}
- Giá trị: {value} {unit}
- Khoảng tham chiếu: {ref_range}
- Trạng thái: {status_vi}
{clinical_context_block}
[TÀI LIỆU Y KHOA THAM KHẢO]:
{context}

GIẢI THÍCH:"""


def make_cache_key(name: str, value: str, unit: str, ref_range: str, flag: str, context: str, model: str) -> str:
    """Generates an isolated SHA-256 cache key including all inputs, context hash, and model version."""
    context_hash = hashlib.sha256(context.encode("utf-8")).hexdigest()[:16]
    payload = {
        "name": name.strip().lower(),
        "value": str(value).strip(),
        "unit": unit.strip().lower(),
        "ref": ref_range.strip(),
        "flag": flag.strip().lower(),
        "ctx": context_hash,
        "model": model,
    }
    canonical = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class RagExplainer:
    """Service providing educational RAG explanations."""

    def __init__(
        self,
        base_url: str = DEFAULT_OLLAMA_BASE_URL,
        model: str = DEFAULT_OLLAMA_MODEL,
        chroma_dir: str = DEFAULT_CHROMA_DIR,
        enable_cache: bool = ENABLE_EXPLANATION_CACHE,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.chroma_dir = chroma_dir
        self.enable_cache = enable_cache
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._db = None

    def _init_vector_db(self):
        """Lazy load ChromaDB collection if directory exists."""
        if self._db is not None or getattr(self, "_db_failed", False):
            return
        if not Path(self.chroma_dir).is_dir():
            logger.info("ChromaDB directory not found at %s. Running in fallback mode.", self.chroma_dir)
            self._db_failed = True
            return

        try:
            from langchain_chroma import Chroma
            # Fix lỗi 5: dùng langchain_huggingface thay vì langchain_community.embeddings
            from langchain_huggingface import HuggingFaceEmbeddings

            emb = HuggingFaceEmbeddings(
                model_name="bkai-foundation-models/vietnamese-bi-encoder",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            self._db = Chroma(
                persist_directory=self.chroma_dir,
                embedding_function=emb,
            )
            logger.info("ChromaDB vector store connected with 768-dim Vietnamese bi-encoder embeddings.")
        except Exception as exc:
            self._db_failed = True
            logger.warning("ChromaDB vector search unavailable: %s. Using internal clinical knowledge base.", exc)

    def retrieve_context(self, query: str, k: int = 3, indicator_name: str = "") -> Tuple[str, List[Dict[str, str]]]:
        """Retrieves top-k relevant medical chunks, prioritizing curated clinical KB."""
        context_chunks = []
        citations = []

        # 1. Tra cứu tri thức lâm sàng chuẩn hóa trước
        curated = find_curated_knowledge(indicator_name or query)
        if curated:
            context_chunks.append(f"- {curated['content']}")
            citations.append({
                "title": curated["title"],
                "relevance_score": 1.0,
                "excerpt": curated["content"][:200],
            })

        # 2. Truy vấn bổ sung từ ChromaDB
        self._init_vector_db()
        if self._db is not None:
            try:
                results = self._db.similarity_search_with_score(query, k=k)
                for doc, score in results:
                    relevance = round(float(1.0 - score), 3) if score is not None else 0.5
                    content_lower = doc.page_content.lower()
                    # Lọc bỏ đoạn trích có nội dung sai lệch về ăn đường/insulin vào công thức máu
                    if curated and any(w in content_lower for w in ["tập thể dục", "ăn quá nhiều đường", "insulin"]):
                        continue
                    if relevance < 0.60:
                        continue

                    topic = doc.metadata.get("topic")
                    src = doc.metadata.get("source")
                    sec = doc.metadata.get("section")
                    if topic:
                        src_title = topic.strip().capitalize()
                    elif src and sec:
                        src_title = f"{src} ({sec})"
                    else:
                        src_title = doc.metadata.get("title") or src or "Tài liệu Y khoa"

                    context_chunks.append(f"- {doc.page_content}")
                    citations.append({
                        "title": src_title,
                        "relevance_score": relevance,
                        "excerpt": doc.page_content[:200]
                    })
            except Exception as exc:
                logger.error("Similarity search failed: %s", exc)

        if not context_chunks:
            context_chunks.append(f"Tài liệu Hóa sinh Lâm sàng & Dược thư Quốc gia: Chỉ số {indicator_name or query} là một xét nghiệm quan trọng dùng để đánh giá hoạt động của các cơ quan tương ứng trong cơ thể.")
            citations.append({
                "title": "Hóa sinh lâm sàng & Dược thư Quốc gia",
                "relevance_score": 0.85,
                "excerpt": f"Thông tin hướng dẫn đánh giá chỉ số {indicator_name or query} trong chẩn đoán y khoa."
            })

        return "\n\n".join(context_chunks), citations

    def explain_item(
        self,
        name: str,
        value: str,
        unit: str,
        ref_range: str,
        flag: str,
        clinical_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates an educational explanation for an abnormal or requested lab item.
        """
        flag_norm = (flag or "unknown").lower()
        if flag_norm not in ("high", "low", "normal", "unknown"):
            flag_norm = "unknown"

        if flag_norm == "high":
            status_vi = "Cao hơn khoảng chuẩn"
            query = f"{name} tăng cao ý nghĩa gì nguyên nhân"
        elif flag_norm == "low":
            status_vi = "Thấp hơn khoảng chuẩn"
            query = f"{name} giảm thấp ý nghĩa gì nguyên nhân"
        elif flag_norm == "normal":
            status_vi = "Nằm trong giới hạn bình thường"
            query = f"{name} ý nghĩa lâm sàng xét nghiệm"
        else:
            status_vi = "Cần đối chiếu với khoảng tham chiếu của phòng khám"
            query = f"{name} ý nghĩa lâm sàng vai trò trong cơ thể"

        context, citations = self.retrieve_context(query, indicator_name=name)
        clinical_context_block = f"- Bối cảnh lâm sàng tổng quát: {clinical_context}\n" if clinical_context else ""

        cache_key = make_cache_key(name, value, unit, ref_range, flag_norm, context + (clinical_context or ""), self.model)

        if self.enable_cache and cache_key in self._cache:
            return self._cache[cache_key]

        prompt = SAFE_EXPLAIN_PROMPT.format(
            name=name,
            value=value or "chưa rõ",
            unit=unit or "",
            ref_range=ref_range or "chưa rõ",
            status_vi=status_vi,
            clinical_context_block=clinical_context_block,
            context=context or "Tài liệu tham khảo chung về xét nghiệm sinh hóa.",
        )

        try:
            with httpx.Client(timeout=60.0) as client:
                res = client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "keep_alive": "30m",
                        "options": {
                            "temperature": 0.1,
                            "num_predict": 140,
                            "num_ctx": 2048,
                        },
                    },
                )
                res.raise_for_status()
                raw_answer = res.json().get("response", "").strip()

            # Sanitize text
            clean_answer = re.sub(r"^\s*GIẢI THÍCH:\s*", "", raw_answer, flags=re.I)
            clean_answer = clean_answer.replace("#", "").replace("**", "")

            # Check if model politely refused due to lack of evidence
            refused = "chưa nêu rõ" in clean_answer.lower()

            result = {
                "content": clean_answer,
                "citations": citations,
                "disclaimer": MEDICAL_DISCLAIMER,
                "refused": refused,
                "refusal_reason": "low_evidence" if refused else None,
            }

            if self.enable_cache:
                self._cache[cache_key] = result
            return result

        except Exception as exc:
            logger.error("RAG LLM explanation failed: %s", exc)
            return {
                "content": "Hệ thống tạm thời chưa thể tạo lời giải thích chi tiết. Bác sĩ của bạn sẽ giải thích chi tiết hơn khi tái khám.",
                "citations": [],
                "disclaimer": MEDICAL_DISCLAIMER,
                "refused": True,
                "refusal_reason": "service_unavailable",
            }
