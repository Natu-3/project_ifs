FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install dependencies from requirements.txt (or python.txt fallback).
COPY requirements.txt* python.txt* ./
RUN if [ -f requirements.txt ]; then pip install -r requirements.txt; \
    elif [ -f python.txt ]; then pip install -r python.txt; fi

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
