import os
import sys
from pathlib import Path
from typing import Dict, Any

# Đảm bảo đường dẫn import được module rag nằm ở cấp gốc
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Cờ điều khiển RAG giả lập hay RAG thật
# Mặc định True để app và frontend chạy ngay độc lập, khi RAG xong chuyển thành False
USE_MOCK = os.getenv("USE_MOCK_RAG", "true").lower() in ("true", "1")

# Từ điển kiến thức y khoa mẫu phong phú phục vụ bản giả lập
MOCK_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "amlodipin": {
        "answer": "Theo tài liệu Dược thư Quốc gia: Amlodipin là thuốc thuộc nhóm chẹn kênh calci, có tác dụng giãn mạch máu để hạ huyết áp và giảm cơn đau thắt ngực. Bác nên uống thuốc đều đặn vào một khung giờ cố định mỗi ngày (thường là buổi sáng), uống nguyên viên với nước lọc.",
        "sources": [{"title": "Dược thư Quốc gia Việt Nam (Chương Tim mạch)", "chunk": "Amlodipin: Cơ chế chẹn kênh calci chọn lọc trên cơ trơn mạch máu, liều khởi đầu 5mg/ngày. Thận trọng với người hạ huyết áp tư thế."}],
        "grounded": True
    },
    "metformin": {
        "answer": "Theo tài liệu Hướng dẫn điều trị Đái tháo đường: Metformin là thuốc điều trị tiểu đường type 2 giúp kiểm soát lượng đường trong máu bằng cách giảm giải phóng glucose từ gan. Thuốc nên uống trong hoặc ngay sau bữa ăn để giảm tác dụng phụ khó chịu ở dạ dày.",
        "sources": [{"title": "Hướng dẫn chẩn đoán và điều trị Đái tháo đường Type 2 - Bộ Y tế", "chunk": "Metformin hydrochloride: Lựa chọn đầu tay trong kiểm soát đường huyết. Uống cùng hoặc sau bữa ăn để giảm kích ứng tiêu hóa."}],
        "grounded": True
    },
    "paracetamol": {
        "answer": "Theo tài liệu Dược thư: Paracetamol (hoặc Acetaminophen) là thuốc giảm đau và hạ sốt an toàn thông dụng. Khoảng cách giữa hai lần uống phải cách nhau ít nhất 4 đến 6 tiếng. Tuyệt đối không dùng quá 4g (4000mg) mỗi ngày để tránh gây độc cho gan.",
        "sources": [{"title": "Dược thư Quốc gia Việt Nam", "chunk": "Paracetamol: Giảm đau, hạ sốt nhẹ đến vừa. Khoảng liều 10-15mg/kg mỗi 4-6 giờ. Chống chỉ định suy gan nặng."}],
        "grounded": True
    },
    "glucose": {
        "answer": "Theo tài liệu Đọc hiểu kết quả xét nghiệm máu: Glucose là chỉ số đường huyết phản ánh lượng đường trong máu tại thời điểm lấy mẫu. Chỉ số bình thường lúc đói nằm trong khoảng 3.9 - 6.4 mmol/L. Nếu chỉ số cao hơn kéo dài có nguy cơ mắc đái tháo đường.",
        "sources": [{"title": "Hóa sinh lâm sàng & Đọc hiểu xét nghiệm", "chunk": "Glucose máu lúc đói bình thường: 70-100 mg/dL (3.9 - 5.6 mmol/L). Mức từ 5.6 - 6.9 mmol/L là tiền đái tháo đường."}],
        "grounded": True
    },
    "creatinin": {
        "answer": "Theo tài liệu Hóa sinh lâm sàng: Creatinin là sản phẩm thoái hóa từ cơ bắp được đào thải hoàn toàn qua thận, dùng để đánh giá chức năng lọc của thận. Chỉ số bình thường ở nam là 62 - 106 µmol/L, ở nữ là 44 - 88 µmol/L. Nếu tăng cao cho thấy chức năng thận có thể đang suy giảm.",
        "sources": [{"title": "Xét nghiệm Hóa sinh Thận - Tiết niệu", "chunk": "Nồng độ creatinin huyết thanh tương quan nghịch với mức lọc cầu thận (eGFR). Cần kết hợp tuổi và giới tính để đánh giá chính xác."}],
        "grounded": True
    },
    "cholesterol": {
        "answer": "Theo tài liệu Xét nghiệm mỡ máu: Cholesterol toàn phần phản ánh lượng mỡ trong máu, mức chuẩn an toàn là dưới 5.2 mmol/L. Mức cholesterol cao làm tăng nguy cơ xơ vữa động mạch và biến cố tim mạch ở người lớn tuổi.",
        "sources": [{"title": "Khuyến cáo phòng ngừa bệnh tim mạch", "chunk": "Mỡ máu toàn phần lý tưởng < 5.2 mmol/L. Khi vượt quá 6.2 mmol/L cần điều chỉnh chế độ ăn giảm mỡ động vật và dùng thuốc nếu có chỉ định."}],
        "grounded": True
    }
}

def get_use_mock() -> bool:
    return USE_MOCK

def set_use_mock(val: bool):
    global USE_MOCK
    USE_MOCK = val

def explain(query: str) -> dict:
    """
    Điểm gọi thống nhất giữa Backend và RAG.
    Khi RAG thật hoàn thành, chỉ cần USE_MOCK = False
    """
    if USE_MOCK:
        q_low = query.lower().strip()
        # Tìm kiếm đối sánh gần trong bảng mẫu
        for key, info in MOCK_KNOWLEDGE.items():
            if key in q_low or q_low in key:
                return info
        
        # Kiểm tra nếu là câu hỏi không liên quan đến y tế
        unrelated_keywords = ["thời tiết", "chính trị", "đá bóng", "giá vàng", "tin tức", "du lịch"]
        if any(w in q_low for w in unrelated_keywords):
            return {
                "answer": "MediRead AI là hệ thống chuyên hỗ trợ tra cứu y khoa, không giải đáp các vấn đề ngoài phạm vi sức khỏe và đơn thuốc.",
                "sources": [],
                "grounded": False
            }

        # Trả về câu trả lời mẫu tổng quát nếu chưa khớp từ khóa cụ thể
        return {
            "answer": f"[BẢN GIẢ LẬP] Theo tài liệu Dược thư và Hóa sinh Y khoa: Thông tin giải thích sơ bộ về '{query}'. Hãy uống đúng liều và tuân thủ chặt chẽ chỉ định của bác sĩ điều trị.",
            "sources": [{"title": "Dược thư Quốc gia Việt Nam (Tài liệu mẫu)", "chunk": f"Đoạn trích thông tin nghiên cứu và hướng dẫn liều dùng của {query}..."}],
            "grounded": True
        }

    # Gọi RAG THẬT từ rag/pipeline.py
    try:
        from rag.pipeline import explain as real_explain
        return real_explain(query)
    except Exception as e:
        # Nếu RAG thật gặp lỗi, fallback an toàn báo lỗi không làm sập server
        return {
            "answer": f"Lỗi khi thực thi mô hình RAG: {str(e)}. Hãy kiểm tra lại file vector ChromaDB hoặc chuyển về chế độ Mock.",
            "sources": [],
            "grounded": False
        }
