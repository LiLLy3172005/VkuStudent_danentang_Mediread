"""Script debug RAG đúng cách: dùng bkai bi-encoder 768 dim"""
import sys, os
sys.path.insert(0, r"D:\Do An Cuoi Ki\mediread")

os.environ["GEMINI_API_KEY"] = ""  # không cần gọi LLM ở bước test này

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

CHROMA_PATH = r"D:\Do An Cuoi Ki\Thutudong\chroma_db"
MODEL_NAME = "bkai-foundation-models/vietnamese-bi-encoder"

print("[1] Nạp embedding model...")
emb = HuggingFaceEmbeddings(
    model_name=MODEL_NAME,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

print("[2] Load ChromaDB...")
db = Chroma(persist_directory=CHROMA_PATH, embedding_function=emb)
print(f"    Total chunks: {db._collection.count()}")

queries = [
    ("Mất dấu", "Protein toan phan"),
    ("Có dấu", "Protein toàn phần"),
    ("Albumin", "Albumin huyết thanh"),
    ("Cl-", "Clorua Cl- xét nghiệm"),
    ("Glucose", "Glucose đường huyết"),
]

for label, q in queries:
    res = db.similarity_search_with_score(q, k=4)
    print(f"\n=== {label}: '{q}' ===")
    for doc, score in res:
        src = doc.metadata.get("source", "?")
        topic = doc.metadata.get("topic", "")
        print(f"  dist={score:.3f}  src={src}  topic={topic[:40]}")
        print(f"  text: {doc.page_content[:100]}")

print("\n[OK] Test xong.")
