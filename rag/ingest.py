"""
rag/ingest.py - Nạp dữ liệu, phân đoạn (Chunking) và Vector hóa lưu vào ChromaDB
Mỗi chunk được gắn metadata: source, title, section để RAG hiển thị nguồn rõ ràng.
"""

import os
import sys
from pathlib import Path
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
# Fix lỗi 5: chỉ import từ langchain_huggingface
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

CURRENT_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = CURRENT_DIR / "data" / "knowledge_base.txt"
BACKUP_DATA_PATH = Path(r"D:\Do An Cuoi Ki\Thutudong\knowledge_base.txt")
CHROMA_PERSIST_DIR = CURRENT_DIR / "chroma_db"
EMBEDDING_MODEL_NAME = "bkai-foundation-models/vietnamese-bi-encoder"

# Bảng nguồn: tên file (không có extension) → tên hiển thị cho metadata "title"
SOURCE_TITLE_MAP = {
    "knowledge_base":    "Dược thư Quốc gia & Hóa sinh Lâm sàng",
    "duoc_ly":           "Dược lý học - Bộ Y tế",
    "hoa_sinh":          "Hóa sinh lâm sàng",
    "xet_nghiem":        "Hướng dẫn đọc kết quả xét nghiệm",
    "duoc_thu":          "Dược thư Quốc gia Việt Nam",
}


def run_ingest(source_file: str = None):
    data_path = Path(source_file) if source_file else (DEFAULT_DATA_PATH if DEFAULT_DATA_PATH.exists() else BACKUP_DATA_PATH)

    if not data_path.exists():
        print(f"[Ingest Lỗi] Không tìm thấy file tài liệu tại: {data_path}")
        return False

    stem = data_path.stem  # tên file không có extension
    source_key = stem.lower().replace("-", "_")
    display_title = SOURCE_TITLE_MAP.get(source_key, stem)

    print(f"-> Bước 1: Nạp tài liệu y khoa từ: {data_path.name} (nguồn: {display_title})")
    loader = TextLoader(str(data_path), encoding="utf-8")
    docs = loader.load()
    print(f"   Đã đọc {len(docs[0].page_content):,} ký tự.")

    # Bổ sung metadata đầy đủ cho mỗi document trước khi chunk
    for doc in docs:
        doc.metadata["source"] = source_key
        doc.metadata["title"] = display_title
        doc.metadata["file_name"] = data_path.name

    print("-> Bước 2: Phân mảnh tài liệu (Chunk size=600, overlap=100)...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=100,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    print(f"   Đã tạo thành {len(chunks):,} đoạn văn bản.")

    print(f"-> Bước 3: Nhúng vector với mô hình {EMBEDDING_MODEL_NAME}...")
    embedding = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    print(f"-> Bước 4: Lưu kho dữ liệu vector vào: {CHROMA_PERSIST_DIR}...")
    vector_db = Chroma.from_documents(
        documents=chunks,
        embedding=embedding,
        persist_directory=str(CHROMA_PERSIST_DIR),
    )
    print("[Hoàn tất Ingest] Kho vector đã sẵn sàng cho RAG pipeline!")
    return True


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else None
    run_ingest(src)
