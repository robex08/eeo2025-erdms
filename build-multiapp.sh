#!/bin/bash

# ============================================
# ERDMS Multi-App Build Script
# Builds všech aplikací pro produkci
# ============================================

set -e  # Exit on error

echo "🏗️  ERDMS Multi-App Build Script"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/var/www/erdms-dev"

# ============================================
# 1. BUILD DASHBOARD (root path /)
# ============================================
echo -e "${YELLOW}📦 Building Dashboard (/)...${NC}"
cd "$BASE_DIR/dashboard"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Building for production..."
npm run build

if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Dashboard build complete: dist/${NC}"
else
    echo -e "${RED}❌ Dashboard build failed!${NC}"
    exit 1
fi

echo ""

# ============================================
# 2. BUILD EEO2025 (/eeov2/ subdirectory)
# ============================================
echo -e "${YELLOW}📦 Building EEO2025 (/eeov2/)...${NC}"
cd "$BASE_DIR/apps/eeo-v2/client"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# CRITICAL: Set PUBLIC_URL for subdirectory routing
echo "Building with PUBLIC_URL=/eeov2..."
PUBLIC_URL=/eeov2 npm run build

if [ -d "build" ]; then
    echo -e "${GREEN}✅ EEO2025 build complete: build/${NC}"
    
    # Copy subdirectory .htaccess
    echo "Copying .htaccess for subdirectory routing..."
    cp .htaccess.subdirectory build/.htaccess
    echo -e "${GREEN}✅ .htaccess configured${NC}"
else
    echo -e "${RED}❌ EEO2025 build failed!${NC}"
    exit 1
fi

echo ""

# ============================================
# 3. SUMMARY
# ============================================
echo -e "${GREEN}=================================="
echo "✅ All builds completed successfully!"
echo "==================================${NC}"
echo ""
echo "Build outputs:"
echo "  Dashboard:  $BASE_DIR/dashboard/dist/"
echo "  EEO2025:    $BASE_DIR/apps/eeo-v2/client/build/"
echo ""
echo "Next steps:"
echo "  1. Copy Apache config: sudo cp $BASE_DIR/docs/deployment/apache-erdms-multiapp.conf /etc/apache2/sites-available/erdms.conf"
echo "  2. Enable site: sudo a2ensite erdms.conf"
echo "  3. Test config: sudo apache2ctl configtest"
echo "  4. Restart Apache: sudo systemctl restart apache2"
echo "  5. Start backend services:"
echo "     - Auth API: cd $BASE_DIR/auth-api && npm start"
echo "     - EEO API: cd $BASE_DIR/apps/eeo-v2/api && npm start"
echo ""
