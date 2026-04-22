#!/bin/bash

# ============================================
# INVENTIK - Quick Test Script
# ============================================

echo "======================================"
echo "INVENTIK - Quick Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Check directory structure
echo "📁 Test 1: Directory structure..."
if [ -d "/var/www/erdms-dev/apps/inventik/src" ] && [ -d "/var/www/erdms-dev/apps/inventik/api" ]; then
    echo -e "${GREEN}✓${NC} Directory structure OK"
else
    echo -e "${RED}✗${NC} Missing directories"
    exit 1
fi

# Test 2: Check if package.json exists
echo "📦 Test 2: package.json..."
if [ -f "/var/www/erdms-dev/apps/inventik/package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"
else
    echo -e "${RED}✗${NC} package.json not found"
    exit 1
fi

# Test 3: Check API files
echo "🔌 Test 3: API files..."
if [ -f "/var/www/erdms-dev/apps/inventik/api/api.php" ]; then
    echo -e "${GREEN}✓${NC} API files OK"
else
    echo -e "${RED}✗${NC} API files missing"
    exit 1
fi

# Test 4: Check DB credentials file
echo "🔐 Test 4: DB credentials..."
if [ -f "/var/www/erdms-dev/apps/inventik/db_credentials.md" ]; then
    echo -e "${GREEN}✓${NC} Credentials file exists"
else
    echo -e "${RED}✗${NC} Credentials file missing"
fi

# Test 5: Check if React source files exist
echo "⚛️  Test 5: React source files..."
if [ -f "/var/www/erdms-dev/apps/inventik/src/App.js" ]; then
    echo -e "${GREEN}✓${NC} React source files OK"
else
    echo -e "${RED}✗${NC} React source files missing"
    exit 1
fi

# Test 6: Database connection
echo "🗄️  Test 6: Database connection..."
DB_TEST=$(mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' -e "SHOW DATABASES LIKE 'inventik%';" 2>&1)
if echo "$DB_TEST" | grep -q "inventik"; then
    echo -e "${GREEN}✓${NC} Database exists"
else
    echo -e "${RED}⚠${NC}  Database not found (run init_database.sql first)"
fi

echo ""
echo "======================================"
echo "Test completed!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. npm install"
echo "2. Setup database: mysql < api/init_database.sql"
echo "3. npm start (dev) or npm run build (prod)"
