FROM python:3.11-slim

# System dependencies for text extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    tesseract-ocr \
    tesseract-ocr-eng \
    libmagic1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/
COPY proto/ ./proto/

# Non-root user for security
RUN adduser --disabled-password --gecos "" raguser \
    && chown -R raguser:raguser /app
USER raguser

EXPOSE 8087

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8087/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8087", "--workers", "1"]
