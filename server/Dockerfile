# Imagem do servidor de extração (PyMuPDF) — para hospedar em Render/Railway/Fly/Cloud Run.
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
# gunicorn (produção). 1 worker, timeout alto (extração de PDF pode demorar).
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 1 --threads 2 --timeout 180 server:app"]
