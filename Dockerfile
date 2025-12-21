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

# Install runtime dependencies (healthcheck, backup tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    rsync \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Create directories for data persistence
RUN mkdir -p /app/data /app/backups

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
COPY backend/ /app/backend/
COPY static/ /app/static/
COPY docker-entrypoint.sh /app/

# Set entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8000/login.html || exit 1

# Run with Gunicorn (production WSGI server)
# Note: Using only 1 worker with eventlet for Socket.IO compatibility
CMD ["gunicorn", \
     "--chdir", "/app/backend", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "1", \
     "--worker-class", "eventlet", \
     "--worker-connections", "1000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "app:app"]
