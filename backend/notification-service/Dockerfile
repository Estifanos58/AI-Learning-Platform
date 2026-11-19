FROM python:3.12-slim

WORKDIR /app

COPY notification-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY notification-service/app ./app

ENV PYTHONUNBUFFERED=1

RUN useradd -m -u 1001 notifuser && chown -R notifuser:notifuser /app
USER notifuser

EXPOSE 8086

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8086/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8086"]
