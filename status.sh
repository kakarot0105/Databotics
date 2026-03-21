#!/bin/bash
# Check Databotics status

echo "📊 DATABOTICS STATUS"
echo "════════════════════"
echo ""

BACKEND_PID=$(lsof -ti:8000 2>/dev/null)
FRONTEND_PID=$(lsof -ti:3000 2>/dev/null)

if [ ! -z "$BACKEND_PID" ]; then
    echo "✅ Backend (FastAPI): RUNNING"
    echo "   PID: $BACKEND_PID"
    echo "   URL: http://localhost:8000"
    echo "   API: http://localhost:8000/docs"
else
    echo "❌ Backend: STOPPED"
fi

echo ""

if [ ! -z "$FRONTEND_PID" ]; then
    echo "✅ Frontend (Next.js): RUNNING"
    echo "   PID: $FRONTEND_PID"
    echo "   URL: http://localhost:3000"
else
    echo "❌ Frontend: STOPPED"
fi

echo ""
echo "════════════════════"

if [ -z "$BACKEND_PID" ] || [ -z "$FRONTEND_PID" ]; then
    echo ""
    echo "To start: ./start.sh"
fi
