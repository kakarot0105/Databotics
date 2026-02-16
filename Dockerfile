# ---- Stage 1: Build frontend ----
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python backend + static frontend ----
FROM python:3.12-slim
WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt requirements-optional.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir python-multipart uvicorn[standard]

# Copy backend code
COPY app/ ./app/
COPY connectors/ ./connectors/
COPY ui/validation_rules/ ./ui/validation_rules/
COPY test_data.csv ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/.next/standalone ./frontend-standalone/
COPY --from=frontend-build /app/frontend/.next/static ./frontend-standalone/.next/static
COPY --from=frontend-build /app/frontend/public ./frontend-standalone/public

# Expose ports: 8000 = API, 3000 = frontend
EXPOSE 8000 3000

# Start script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
CMD ["/docker-entrypoint.sh"]
