#!/bin/bash
# Self-host Databotics locally
# Run this to start both backend and frontend

echo "🚀 Starting Databotics Self-Host..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/Users/bulmanik/clawd/databotics"

# Check if already running
BACKEND_PID=$(lsof -ti:8000 2>/dev/null)
FRONTEND_PID=$(lsof -ti:3000 2>/dev/null)

if [ ! -z "$BACKEND_PID" ]; then
    echo "⚠️  Backend already running on port 8000 (PID: $BACKEND_PID)"
else
    echo "${BLUE}Starting Backend (FastAPI)...${NC}"
    cd "$PROJECT_ROOT/backend"
    source .venv/bin/activate 2>/dev/null || python3 -m venv .venv && source .venv/bin/activate && pip install -r ../requirements.txt -q
    uvicorn app.api:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo "${GREEN}✓ Backend started on http://localhost:8000${NC}"
fi

if [ ! -z "$FRONTEND_PID" ]; then
    echo "⚠️  Frontend already running on port 3000 (PID: $FRONTEND_PID)"
else
    echo "${BLUE}Starting Frontend (Next.js)...${NC}"
    cd "$PROJECT_ROOT/frontend"
    npm run dev &
    FRONTEND_PID=$!
    echo "${GREEN}✓ Frontend started on http://localhost:3000${NC}"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  🎉 DATABOTICS IS RUNNING!"
echo "═══════════════════════════════════════"
echo ""
echo "📊 Frontend: http://localhost:3000"
echo "⚙️  Backend:  http://localhost:8000"
echo "📚 API Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for interrupt
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
