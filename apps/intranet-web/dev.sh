#!/bin/bash

##############################################
# Intranet Web - Local Development Server
##############################################

set -e

PROJECT_ROOT="/var/www/erdms-dev/apps/intranet-web"
CLIENT_DIR="$PROJECT_ROOT/client"

echo "🚀 Starting Intranet Web Development Server"
echo "==========================================="
echo ""

cd "$CLIENT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
    echo ""
fi

echo "🌐 Starting Vite dev server on http://localhost:5174"
echo "📝 Press Ctrl+C to stop"
echo ""

npm run dev
