#!/bin/bash

# ============================================
# ERDMS Multi-App Start Script
# Spuštění všech backend služeb
# ============================================

set -e

echo "🚀 ERDMS Multi-App Start Script"
echo "================================"
echo ""

BASE_DIR="/var/www/erdms-dev"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================
# 1. Start Auth API (port 3000)
# ============================================
echo -e "${YELLOW}🔐 Starting Auth API (port 3000)...${NC}"
cd "$BASE_DIR/auth-api"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 already in use, skipping..."
else
    nohup npm start > logs/auth-api.log 2>&1 &
    echo $! > logs/auth-api.pid
    echo -e "${GREEN}✅ Auth API started (PID: $(cat logs/auth-api.pid))${NC}"
fi

echo ""

# ============================================
# 2. Start EEO Node.js API (port 5000)
# ============================================
echo -e "${YELLOW}⚙️  Starting EEO Node.js API (port 5000)...${NC}"
cd "$BASE_DIR/apps/eeo-v2/api"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if already running
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 5000 already in use, skipping..."
else
    # Create logs directory if not exists
    mkdir -p logs
    nohup npm start > logs/eeo-api.log 2>&1 &
    echo $! > logs/eeo-api.pid
    echo -e "${GREEN}✅ EEO API started (PID: $(cat logs/eeo-api.pid))${NC}"
fi

echo ""

# ============================================
# 3. Summary
# ============================================
echo -e "${GREEN}================================"
echo "✅ All services started!"
echo "================================${NC}"
echo ""
echo "Running services:"
echo "  Auth API:    http://localhost:3000 (Entra ID)"
echo "  EEO API:     http://localhost:5000 (EEO2025)"
echo "  PHP API:     /api.eeo/ (via Apache)"
echo ""
echo "Applications:"
echo "  Dashboard:   https://erdms.zachranka.cz/"
echo "  EEO2025:     https://erdms.zachranka.cz/eeov2/"
echo ""
echo "Logs:"
echo "  Auth API:    $BASE_DIR/auth-api/logs/auth-api.log"
echo "  EEO API:     $BASE_DIR/apps/eeo-v2/api/logs/eeo-api.log"
echo ""
echo "To stop services:"
echo "  ./stop-multiapp.sh"
echo ""
