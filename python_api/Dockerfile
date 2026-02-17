FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Optional: install dependencies when requirements.txt exists.
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

COPY . .

EXPOSE 8000

# Template default (replace with your real app start command).
CMD ["python", "-m", "http.server", "8000"]