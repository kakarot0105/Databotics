#!/bin/bash
set -e

# Start FastAPI backend
uvicorn app.api:app --host 0.0.0.0 --port 8000 &

# Start Next.js frontend (standalone mode)
cd /app/frontend-standalone
node server.js &

wait -n
