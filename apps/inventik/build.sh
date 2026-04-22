#!/bin/bash

# ============================================
# INVENTIK - Build Script
# ============================================

set -e  # Exit on error

echo "======================================"
echo "INVENTIK - Production Build"
echo "======================================"
echo ""

# Navigate to app directory
cd /var/www/erdms-dev/apps/inventik

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Running npm install..."
    npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build/

# Build the app
echo "🔨 Building React app..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Build successful!"
    echo ""
    echo "Build output:"
    ls -lh build/
    echo ""
    echo "======================================"
    echo "Build completed successfully!"
    echo "======================================"
    echo ""
    echo "To deploy:"
    echo "1. Check Apache config: sudo apache2ctl configtest"
    echo "2. Restart Apache: sudo systemctl reload apache2"
    echo "3. Access: https://erdms.zachranka.cz/inventik/"
else
    echo "❌ Build failed!"
    exit 1
fi
