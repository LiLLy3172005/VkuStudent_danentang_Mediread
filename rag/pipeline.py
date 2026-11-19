"""
Module RAG y tế: pipeline.py
Hợp đồng hàm duy nhất giao tiếp với Backend:
explain(query: str) -> dict:
    Trả về {'answer': str, 'sources': [{'title': str, 'chunk': str}], 'grounded': bool}
"""

import os
import sys
import unicodedata
import re
from pathlib import Path
from typing import Dict, Any, List

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
EXTERNAL_CHROMA_DIR = Path(r"D:\Do An Cuoi Ki\Thutudong\chroma_db")
LOCAL_CHROMA_DIR = CURRENT_DIR / "chroma_db"

CHROMA_DIR = EXTERNAL_CHROMA_DIR if EXTERNAL_CHROMA_DIR.exists() else LOCAL_CHROMA_DIR
EMBEDDING_MODEL_NAME = "bkai-foundation-models/vietnamese-bi-encoder"

# Ngưỡng distance dựa trên thực nghiệm với bkai-bi-encoder 768 dim:
# - Có dấu đúng: dist ~0.47–0.59 → ✅ tìm được
# - Mất dấu (OCR): dist ~0.60–0.70 → cần cover
# - Không liên quan: dist > 0.75 → loại bỏ
MAX_DISTANCE = 0.75

SYSTEM_PROMPT = """Bạn là trợ lý MediRead AI - chuyên giải thích đơn thuốc và xét nghiệm y khoa cho người cao tuổi.
Chỉ trả lời DỰA DUY NHẤT VÀO tài liệu y khoa được cung cấp bên dưới.
Quy tắc:
1. Giải thích bằng ngôn ngữ giản dị, câu ngắn, rõ ràng, ân cần.
2. Luôn mở đầu bằng: 'Theo tài liệu [Tên sách hoặc Dược thư]: ...'
3. Nêu rõ tác dụng chính, cách dùng thông thường hoặc ý nghĩa chỉ số (cao/thấp có nguy cơ gì).
4. Nhắc nhở người bệnh tuân thủ chỉ định của bác sĩ.
5. Nếu trong tài liệu không có thông tin về câu hỏi, trả lời đúng một từ: KHONG_CO_THONG_TIN.
"""

# Bảng nguồn tài liệu dễ đọc hơn cho metadata
SOURCE_DISPLAY_NAMES = {
    "duoc_ly": "Dược lý học - Bộ Y tế",
    "hoa_sinh": "Hóa sinh lâm sàng",
    "duoc_thu": "Dược thư Quốc gia Việt Nam",
    "xet_nghiem": "Hướng dẫn đọc kết quả xét nghiệm",
}

_vector_db = None
_embedding_model = None


def _normalize_query(query: str) -> str:
    """Chuẩn hoá NFC để ký tự tổ hợp dấu được encode đúng."""
    return unicodedata.normalize("NFC", query.strip())


def get_vector_db():
    global _vector_db, _embedding_model
    if _vector_db is None and CHROMA_DIR.exists():
        try:
            # Fix lỗi 5: chỉ dùng langchain_huggingface, không import từ langchain_community.embeddings
            from langchain_huggingface import HuggingFaceEmbeddings
            from langchain_community.vectorstores import Chroma
            _embedding_model = HuggingFaceEmbeddings(
                model_name=EMBEDDING_MODEL_NAME,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            _vector_db = Chroma(
                persist_directory=str(CHROMA_DIR),
                embedding_function=_embedding_model,
            )
            count = _vector_db._collection.count()
            print(f"[RAG] ChromaDB loaded: {count} chunks from {CHROMA_DIR}", flush=True)
        except Exception as e:
            print(f"[RAG] Lỗi nạp ChromaDB ({e}). Sẽ sử dụng fallback.", file=sys.stderr)
            _vector_db = None
    return _vector_db


def _get_source_title(metadata: dict) -> str:
    """Trả về tên nguồn dễ đọc từ metadata chunk (fix lỗi 3: tránh lặp 'Tài liệu Y khoa')."""
    # Ưu tiên trường title có sẵn
    if metadata.get("title"):
        return metadata["title"]
    # Thử source key
    src = metadata.get("source") or metadata.get("file_name") or ""
    return SOURCE_DISPLAY_NAMES.get(src, src or "Dược thư Quốc gia & Hóa sinh Lâm sàng")


def call_llm(system_instruction: str, user_prompt: str) -> str:
    """Gọi LLM Gemini để diễn giải tài liệu y khoa."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )
        return resp.text.strip()
    except Exception:
        try:
            import google.generativeai as gai
            gai.configure(api_key=api_key)
            model = gai.GenerativeModel("gemini-1.5-flash")
            resp = model.generate_content(f"{system_instruction}\n\n{user_prompt}")
            return resp.text.strip()
        except Exception as e:
            return f"Lỗi kết nối mô hình ngôn ngữ: {e}"


def explain(query: str) -> Dict[str, Any]:
    """
    Hàm giải thích chính của RAG:
    - Chuẩn hoá query (NFC) để tránh mất dấu ảnh hưởng embedding.
    - Tìm kiếm vector top-5, lọc theo MAX_DISTANCE.
    - Nếu không khớp: trả grounded=False, không từ chối hàng loạt.
    - Nếu có tài liệu: tổng hợp có kiểm chứng, hiển thị nguồn rõ ràng.
    """
    db = get_vector_db()
    if db is None:
        return {
            "answer": "Hệ thống RAG thật chưa được khởi tạo kho dữ liệu vector. Bạn có thể bật chế độ RAG Giả để trải nghiệm đầy đủ.",
            "sources": [],
            "grounded": False,
        }

    # Chuẩn hoá query: NFC Unicode
    normalized_query = _normalize_query(query)

    try:
        # Tăng k=5 để lưới rộng hơn, lọc theo distance sau
        docs_with_scores = db.similarity_search_with_score(normalized_query, k=5)
        print(f"[RAG] query='{normalized_query}' scores={[round(s,3) for _,s in docs_with_scores]}", flush=True)

        filtered_docs = [doc for doc, score in docs_with_scores if score <= MAX_DISTANCE]

        if not filtered_docs:
            # Thử lại với tên không dấu (fallback khi OCR mất dấu)
            ascii_query = re.sub(r'[^\x00-\x7F]', '', normalized_query).strip()
            if ascii_query and ascii_query != normalized_query:
                docs_with_scores2 = db.similarity_search_with_score(ascii_query, k=5)
                filtered_docs = [doc for doc, score in docs_with_scores2 if score <= MAX_DISTANCE]
                print(f"[RAG] fallback ascii query='{ascii_query}' scores={[round(s,3) for _,s in docs_with_scores2]}", flush=True)

        if not filtered_docs:
            return {
                "answer": f"MediRead chưa tìm thấy thông tin chính xác về '{query}' trong tài liệu y khoa hiện có. Bác/cô chú nên trao đổi trực tiếp với bác sĩ điều trị để đảm bảo an toàn ạ.",
                "sources": [],
                "grounded": False,
            }

        context = "\n\n".join(d.page_content for d in filtered_docs)
        user_prompt = (
            f"Tài liệu y khoa tra cứu được:\n{context}\n\n"
            f"Câu hỏi: Hãy giải thích thông tin về '{query}' cho người cao tuổi."
        )
        llm_answer = call_llm(SYSTEM_PROMPT, user_prompt)

        if "KHONG_CO_THONG_TIN" in llm_answer:
            return {
                "answer": f"Tài liệu y khoa không có đủ cơ sở hướng dẫn về '{query}'. Bác/cô chú hãy hỏi lại ý kiến bác sĩ hoặc dược sĩ nhé.",
                "sources": [],
                "grounded": False,
            }

        # Fix lỗi 3: deduplicate nguồn theo title để tránh hiển thị lặp
        seen_titles = set()
        sources = []
        for d in filtered_docs:
            title = _get_source_title(d.metadata)
            if title not in seen_titles:
                seen_titles.add(title)
                sources.append({
                    "title": title,
                    "chunk": d.page_content[:320] + "..." if len(d.page_content) > 320 else d.page_content,
                })

        return {
            "answer": llm_answer,
            "sources": sources,
            "grounded": True,
        }

    except Exception as e:
        return {
            "answer": f"Đã xảy ra lỗi khi truy vấn tài liệu: {str(e)}",
            "sources": [],
            "grounded": False,
        }
