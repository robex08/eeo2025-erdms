#!/bin/bash

# ============================================
# ERDMS Multi-App Stop Script
# Zastavení všech backend služeb
# ============================================

echo "🛑 ERDMS Multi-App Stop Script"
echo "=============================="
echo ""

BASE_DIR="/var/www/erdms-dev"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# ============================================
# 1. Stop Auth API
# ============================================
echo "Stopping Auth API..."
if [ -f "$BASE_DIR/auth-api/logs/auth-api.pid" ]; then
    PID=$(cat "$BASE_DIR/auth-api/logs/auth-api.pid")
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        echo -e "${GREEN}✅ Auth API stopped (PID: $PID)${NC}"
    else
        echo "⚠️  Process not running"
    fi
    rm "$BASE_DIR/auth-api/logs/auth-api.pid"
else
    echo "⚠️  PID file not found"
fi

echo ""

# ============================================
# 2. Stop EEO API
# ============================================
echo "Stopping EEO Node.js API..."
if [ -f "$BASE_DIR/apps/eeo-v2/api/logs/eeo-api.pid" ]; then
    PID=$(cat "$BASE_DIR/apps/eeo-v2/api/logs/eeo-api.pid")
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        echo -e "${GREEN}✅ EEO API stopped (PID: $PID)${NC}"
    else
        echo "⚠️  Process not running"
    fi
    rm "$BASE_DIR/apps/eeo-v2/api/logs/eeo-api.pid"
else
    echo "⚠️  PID file not found"
fi

echo ""

# ============================================
# 3. Fallback - kill by port
# ============================================
echo "Checking for remaining processes..."

# Check port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Killing process on port 3000..."
    lsof -ti:3000 | xargs kill -9
    echo -e "${GREEN}✅ Port 3000 cleared${NC}"
fi

# Check port 5000
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Killing process on port 5000..."
    lsof -ti:5000 | xargs kill -9
    echo -e "${GREEN}✅ Port 5000 cleared${NC}"
fi

echo ""
echo -e "${GREEN}================================"
echo "✅ All services stopped!"
echo "================================${NC}"
echo ""
