#!/bin/bash
# Databotics Self-Host Setup
# Run once to set up auto-start

echo "🚀 Setting up Databotics Self-Host..."
echo ""

PROJECT_ROOT="/Users/bulmanik/clawd/databotics"
cd "$PROJECT_ROOT"

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend
python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -r ../requirements.txt -q

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

cd "$PROJECT_ROOT"

# Make scripts executable
chmod +x start.sh
chmod +x status.sh

# Load LaunchAgent for auto-start
cp com.databotics.selfhost.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.databotics.selfhost.plist 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "═══════════════════════════════════════"
echo "  🎉 DATABOTICS SELF-HOST READY"
echo "═══════════════════════════════════════"
echo ""
echo "Commands:"
echo "  ./start.sh    - Start Databotics manually"
echo "  ./status.sh   - Check if running"
echo ""
echo "Auto-start: Enabled (runs on login)"
echo ""
echo "URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Logs: logs/databotics.log"
echo ""
