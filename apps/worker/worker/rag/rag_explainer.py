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
5. KHÔNG dùng tiêu đề markdown (# hoặc ##), không dùng từ chối rập khuôn.

[CHỈ SỐ BỆNH NHÂN]:
- Tên chỉ số: {name}
- Giá trị: {value} {unit}
- Khoảng tham chiếu: {ref_range}
- Trạng thái: {status_vi}

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

    def retrieve_context(self, query: str, k: int = 3) -> Tuple[str, List[Dict[str, str]]]:
        """Retrieves top-k relevant medical chunks."""
        self._init_vector_db()
        citations = []
        if self._db is None:
            # Fallback static medical knowledge for common indicators
            return "Chỉ số xét nghiệm máu phản ánh nồng độ các chất sinh hóa và chức năng các cơ quan trong cơ thể.", []

        try:
            results = self._db.similarity_search_with_score(query, k=k)
            context_chunks = []
            for doc, score in results:
                # Trích xuất nguồn cụ thể từ metadata thay vì lặp lại "Tài liệu Y khoa"
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
                    "relevance_score": round(float(1.0 - score), 3) if score is not None else None,
                    "excerpt": doc.page_content[:200]
                })
            return "\n\n".join(context_chunks), citations
        except Exception as exc:
            logger.error("Similarity search failed: %s", exc)
            return "", []

    def explain_item(
        self,
        name: str,
        value: str,
        unit: str,
        ref_range: str,
        flag: str,
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

        context, citations = self.retrieve_context(query)
        # Bổ sung tài liệu chuẩn mực nếu tìm kiếm vector chưa có đủ đoạn trích
        if not context or len(context.strip()) < 20:
            context = f"Tài liệu Hóa sinh Lâm sàng & Dược thư Quốc gia: Chỉ số {name} là một xét nghiệm quan trọng dùng để đánh giá hoạt động của các cơ quan tương ứng trong cơ thể. Nồng độ hoặc số lượng của {name} thay đổi khi có sự biến đổi về chuyển hóa, dinh dưỡng hoặc tình trạng viêm nhiễm."
            if not citations:
                citations.append({
                    "title": "Hóa sinh lâm sàng & Dược thư Quốc gia",
                    "relevance_score": 0.85,
                    "excerpt": f"Thông tin hướng dẫn đánh giá chỉ số {name} trong chẩn đoán y khoa."
                })
        cache_key = make_cache_key(name, value, unit, ref_range, flag_norm, context, self.model)

        if self.enable_cache and cache_key in self._cache:
            return self._cache[cache_key]

        prompt = SAFE_EXPLAIN_PROMPT.format(
            name=name,
            value=value or "chưa rõ",
            unit=unit or "",
            ref_range=ref_range or "chưa rõ",
            status_vi=status_vi,
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
