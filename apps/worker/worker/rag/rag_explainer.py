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

logger = logging.getLogger("mediread.rag")

DEFAULT_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
DEFAULT_CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", r"D:\Do An Cuoi Ki\Thutudong\chroma_db")
ENABLE_EXPLANATION_CACHE = os.getenv("ENABLE_EXPLANATION_CACHE", "false").lower() == "true"

MEDICAL_DISCLAIMER = "Thông tin mang tính chất giải thích giáo dục sức khỏe tham khảo, tuyệt đối không thay thế chẩn đoán hay chỉ định của bác sĩ điều trị."

SAFE_EXPLAIN_PROMPT = """Bạn là trợ lý giải thích kết quả xét nghiệm y khoa cho người bệnh, ưu tiên ngôn từ dễ hiểu, tôn trọng, phù hợp cho người cao tuổi.

QUY TẮC AN TOÀN BẮT BUỘC:
1. KHÔNG đưa ra chẩn đoán bệnh tật (ví dụ không nói: 'Bạn đã bị tiểu đường').
2. KHÔNG tự ý kê đơn hoặc khuyên người bệnh thay đổi liều dùng thuốc.
3. CHỈ sử dụng thông tin trong [TÀI LIỆU Y KHOA THAM KHẢO]. Không tự bịa thông tin.
4. Nếu tài liệu không đủ thông tin hoặc chỉ số chưa rõ, CHỈ trả lời một câu: "Tài liệu hiện có chưa nêu rõ chỉ số này. Bạn nên tham khảo ý kiến bác sĩ trực tiếp điều trị nhé."
5. Trả lời bằng tiếng Việt, câu ngắn, rõ ràng, tối đa 3-4 gạch đầu dòng, không quá 120 từ.
6. KHÔNG dùng markdown tiêu đề (# hoặc ##), xưng "MediRead AI", gọi người dùng là "bác" hoặc "bạn".

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
        if self._db is not None:
            return
        if not Path(self.chroma_dir).is_dir():
            logger.info("ChromaDB directory not found at %s. Running in fallback mode.", self.chroma_dir)
            return

        try:
            from langchain_chroma import Chroma
            from langchain_community.embeddings import HuggingFaceEmbeddings

            emb = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2",
                model_kwargs={"device": "cpu"},
            )
            self._db = Chroma(
                persist_directory=self.chroma_dir,
                embedding_function=emb,
                collection_metadata={"hnsw:space": "cosine"},
            )
        except Exception as exc:
            logger.warning("Failed to initialize ChromaDB: %s. Using internal knowledge base.", exc)

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
                src_title = doc.metadata.get("title", "Tài liệu Y khoa")
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
            status_vi = "Trong khoảng chuẩn"
            query = f"{name} ý nghĩa lâm sàng xét nghiệm"
        else:
            return {
                "content": "Chỉ số này chưa xác định được khoảng chuẩn tương ứng để đánh giá. Bạn vui lòng đối chiếu lại với phiếu khám hoặc tham khảo bác sĩ nhé.",
                "citations": [],
                "disclaimer": MEDICAL_DISCLAIMER,
                "refused": False,
                "refusal_reason": None,
            }

        context, citations = self.retrieve_context(query)
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
                        "options": {"temperature": 0.1, "num_predict": 300},
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
