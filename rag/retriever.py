"""
rag/retriever.py - Tìm kiếm ngữ nghĩa đoạn văn bản liên quan từ ChromaDB
"""

import sys
from pathlib import Path
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

CURRENT_DIR = Path(__file__).resolve().parent
CHROMA_DIR = CURRENT_DIR / "chroma_db"
if not CHROMA_DIR.exists() and Path(r"D:\Do An Cuoi Ki\Thutudong\chroma_db").exists():
    CHROMA_DIR = Path(r"D:\Do An Cuoi Ki\Thutudong\chroma_db")

EMBEDDING_MODEL_NAME = "bkai-foundation-models/vietnamese-bi-encoder"

class MedicalRetriever:
    def __init__(self, persist_dir: str = str(CHROMA_DIR)):
        self.embedding = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )
        self.vector_db = Chroma(
            persist_directory=persist_dir,
            embedding_function=self.embedding
        )

    def search(self, query: str, k: int = 3):
        """Trả về danh sách tuple: [(Document, distance_score), ...]"""
        return self.vector_db.similarity_search_with_score(query, k=k)

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "Chỉ số Glucose máu bình thường là bao nhiêu?"
    print(f"Tra cứu thử: {q}")
    retriever = MedicalRetriever()
    results = retriever.search(q, k=2)
    for i, (doc, score) in enumerate(results, 1):
        print(f"\n[Kết quả #{i} - Điểm: {score:.4f}]")
        print(doc.page_content[:300])
