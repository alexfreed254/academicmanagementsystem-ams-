# TTTI AMS — Flask API for Cloudflare Containers
# Unmodified app code; production process is gunicorn (not flask run).

FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

# System libs used by Pillow / ReportLab fonts & images
RUN apt-get update && apt-get install -y --no-install-recommends \
      libjpeg62-turbo \
      zlib1g \
      libfreetype6 \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Application source (Flask blueprints, templates, static, helpers)
COPY app.py extensions.py db.py auth_utils.py security_utils.py \
     notifications.py grading_utils.py stats_utils.py report_utils.py \
     academic_result_transcript.py exam_booking_form1a.py \
     unit_attendance_register.py utils.py ./
COPY routes/ ./routes/
COPY templates/ ./templates/
COPY static/ ./static/
COPY assets/ ./assets/

# Non-root user (container-friendly)
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

# Healthcheck against a real Flask route (no custom /health required)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/v1/csrf-token" >/dev/null || exit 1

# gunicorn: bind all interfaces, 2 workers, reuse ProxyFix already in app.py
CMD ["gunicorn", "app:app", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "2", \
     "--threads", "4", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--capture-output"]
