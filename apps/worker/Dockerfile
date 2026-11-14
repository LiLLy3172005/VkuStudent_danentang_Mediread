# MediRead AI - OCR & LLM Worker Production Dockerfile
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    libzbar0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN useradd -m -u 1001 workeruser

COPY worker/ ./worker/

ENV PYTHONUNBUFFERED=1
ENV PADDLE_DET_DIR=/models/det
ENV PADDLE_REC_DIR=/models/rec
ENV PADDLE_CLS_DIR=/models/cls

USER workeruser

CMD ["python", "-m", "worker.main"]
