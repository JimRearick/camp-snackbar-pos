# Multi-stage build for Camp Snackbar POS
# Optimized for Intel x86_64 architecture

# Stage 1: Build stage
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
COPY backend/requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Install production WSGI server
RUN pip install --no-cache-dir gunicorn==21.2.0

# Stage 2: Runtime stage
FROM python:3.11-slim

# Create app user for security (don't run as root)
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/data /app/backups && \
    chown -R appuser:appuser /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_APP=app.py

# Set working directory
WORKDIR /app

# Copy application files
COPY --chown=appuser:appuser backend/ /app/backend/
COPY --chown=appuser:appuser static/ /app/static/
COPY --chown=appuser:appuser docker-entrypoint.sh /app/

# Copy static files to be served by the app
RUN cp -r /app/static /app/backend/

# Switch to non-root user
USER appuser

# Set entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/login.html', timeout=5)" || exit 1

# Run with Gunicorn (production WSGI server)
CMD ["gunicorn", \
     "--chdir", "/app/backend", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--threads", "2", \
     "--worker-class", "eventlet", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "app:app"]
