#!/bin/bash
#
# DEV Environment Deployment Script
# Version: 2.08-DEV
# 
# This script performs a complete DEV build with verification
#

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   DEV Environment Deployment v2.08     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Configuration
CLIENT_DIR="/var/www/erdms-dev/apps/eeo-v2/client"
API_DIR="/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo"
EXPECTED_VERSION="2.08-DEV"
EXPECTED_API_URL="/dev/api.eeo"

# Step 1: Check environment
echo -e "${BLUE}[1/6]${NC} Checking environment..."

if [ ! -d "$CLIENT_DIR" ]; then
    echo -e "${RED}❌ ERROR: Client directory not found: $CLIENT_DIR${NC}"
    exit 1
fi

if [ ! -d "$API_DIR" ]; then
    echo -e "${RED}❌ ERROR: API directory not found: $API_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment OK${NC}"

# Step 2: Backup current build
echo -e "${BLUE}[2/6]${NC} Backing up current build..."
cd "$CLIENT_DIR"

if [ -d "build" ]; then
    BACKUP_NAME="build.backup.$(date +%Y%m%d_%H%M%S)"
    mv build "$BACKUP_NAME"
    echo -e "${GREEN}✅ Backup created: $BACKUP_NAME${NC}"
else
    echo -e "${YELLOW}⚠️  No existing build to backup${NC}"
fi

# Step 3: Clean npm cache (optional but recommended)
echo -e "${BLUE}[3/6]${NC} Cleaning build cache..."
rm -rf node_modules/.cache
echo -e "${GREEN}✅ Cache cleaned${NC}"

# Step 4: Build frontend
echo -e "${BLUE}[4/6]${NC} Building frontend with DEV configuration..."
echo -e "${YELLOW}This may take a few minutes...${NC}"

if npm run build:dev:explicit; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
else
    echo -e "${RED}❌ ERROR: Build failed!${NC}"
    
    # Restore backup if exists
    if [ -d "$BACKUP_NAME" ]; then
        echo -e "${YELLOW}⚠️  Restoring backup...${NC}"
        mv "$BACKUP_NAME" build
        echo -e "${GREEN}✅ Backup restored${NC}"
    fi
    
    exit 1
fi

# Step 5: Verify build
echo -e "${BLUE}[5/6]${NC} Verifying build..."

# Check if build directory exists
if [ ! -d "build" ]; then
    echo -e "${RED}❌ ERROR: Build directory not created!${NC}"
    exit 1
fi

# Check if build contains files
if [ -z "$(ls -A build/static/js/*.js 2>/dev/null)" ]; then
    echo -e "${RED}❌ ERROR: Build directory is empty or incomplete!${NC}"
    exit 1
fi

# Verify API URL
if grep -r "$EXPECTED_API_URL" build/static/js/*.js > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API URL correct: $EXPECTED_API_URL${NC}"
else
    echo -e "${RED}❌ ERROR: Build does not contain expected API URL: $EXPECTED_API_URL${NC}"
    echo -e "${YELLOW}Found URLs:${NC}"
    grep -roh "\/api\.eeo\|\/dev\/api\.eeo" build/static/js/*.js | sort -u || echo "No API URLs found"
    exit 1
fi

# Verify version
if grep -r "$EXPECTED_VERSION" build/static/js/*.js > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Version correct: $EXPECTED_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Version $EXPECTED_VERSION not found in build${NC}"
    echo -e "${YELLOW}Found versions:${NC}"
    grep -roh "2\.[0-9][0-9]-DEV\|2\.[0-9][0-9]" build/static/js/*.js | sort -u || echo "No version strings found"
fi

# Step 6: Final summary
echo -e "${BLUE}[6/6]${NC} Deployment summary..."
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Deployment Successful! ✅           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Build Information:${NC}"
echo -e "  Version:     ${GREEN}$EXPECTED_VERSION${NC}"
echo -e "  Build Path:  ${GREEN}$CLIENT_DIR/build${NC}"
echo -e "  Build Size:  $(du -sh build | cut -f1)"
echo -e "  API URL:     ${GREEN}$EXPECTED_API_URL${NC}"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  Frontend: ${GREEN}http://erdms.zachranka.cz/dev/eeo-v2${NC}"
echo -e "  API:      ${GREEN}http://erdms.zachranka.cz/dev/api.eeo/${NC}"
echo ""
echo -e "${YELLOW}Note: If you made changes to PHP-FPM pool config, restart PHP-FPM:${NC}"
echo -e "  ${BLUE}sudo systemctl restart php8.4-fpm${NC}"
echo ""

# Optional: Test API endpoint
read -p "Do you want to test API endpoint? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Testing API...${NC}"
    RESPONSE=$(curl -s -X POST http://erdms.zachranka.cz/dev/api.eeo/v2025.03_25/api.php \
        -H "Content-Type: application/json" \
        -d '{"action":"getVersionInfo"}' || echo '{"status":"error"}')
    
    if echo "$RESPONSE" | grep -q '"status":"success"'; then
        echo -e "${GREEN}✅ API is responding correctly${NC}"
        echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    else
        echo -e "${RED}❌ API test failed or returned error${NC}"
        echo "$RESPONSE"
    fi
fi

echo ""
echo -e "${GREEN}✅ All done!${NC}"
