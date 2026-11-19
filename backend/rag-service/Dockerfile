FROM python:3.11-slim

# Install system dependencies for OCR (Tesseract) and document inspection
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (for Docker layer caching)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code, migrations, and proto definitions
COPY alembic.ini ./
COPY alembic ./alembic
COPY proto ./proto
COPY app ./app

# Pre-generate gRPC stubs at build time so runtime container filesystem does not require protoc writes
RUN python -c "from app.grpc_stubs.loader import ensure_ai_models_stubs, ensure_rag_stubs, ensure_file_stubs; ensure_ai_models_stubs(); ensure_rag_stubs(); ensure_file_stubs()"

# Run as non-root user
RUN useradd -m -u 1001 raguser && chown -R raguser:raguser /app
USER raguser

EXPOSE 8087 9097

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8087/health')"

CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8087 --workers 1"]
