"""Script debug ChromaDB - chạy từ thư mục mediread"""
import chromadb

CHROMA_PATH = r"D:\Do An Cuoi Ki\Thutudong\chroma_db"
db = chromadb.PersistentClient(path=CHROMA_PATH)
col = db.get_collection("langchain")
print(f"Total chunks: {col.count()}")

# Test 1: mất dấu
res1 = col.query(query_texts=["Protein toan phan"], n_results=3, include=["metadatas","documents","distances"])
print("\n=== Mất dấu: 'Protein toan phan' ===")
for i, d in enumerate(res1["documents"][0]):
    score = res1["distances"][0][i]
    src = res1["metadatas"][0][i].get("source", "?")
    print(f"  score={score:.3f} src={src} | {d[:100]}")

# Test 2: có dấu
res2 = col.query(query_texts=["Protein toàn phần"], n_results=3, include=["metadatas","documents","distances"])
print("\n=== Có dấu: 'Protein toàn phần' ===")
for i, d in enumerate(res2["documents"][0]):
    score = res2["distances"][0][i]
    src = res2["metadatas"][0][i].get("source", "?")
    print(f"  score={score:.3f} src={src} | {d[:100]}")

# Test 3: Albumin
res3 = col.query(query_texts=["Albumin huyết thanh"], n_results=3, include=["metadatas","documents","distances"])
print("\n=== Albumin huyết thanh ===")
for i, d in enumerate(res3["documents"][0]):
    score = res3["distances"][0][i]
    src = res3["metadatas"][0][i].get("source", "?")
    print(f"  score={score:.3f} src={src} | {d[:100]}")

# Unique sources
all_sources = set()
peek = col.peek(limit=50)
for m in peek.get("metadatas", []):
    all_sources.add(m.get("source", "?"))
print(f"\nUnique sources (sample from peek): {all_sources}")
