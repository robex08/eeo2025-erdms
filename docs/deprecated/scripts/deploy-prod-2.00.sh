#!/bin/bash
# ===============================================
# EEO v2 PRODUCTION DEPLOY - Verze 2.00
# Datum: 4. ledna 2026
# ===============================================

set -e  # Exit on error

echo "🚀 =================================================="
echo "🚀 EEO v2 PRODUCTION DEPLOY - Verze 2.00"
echo "🚀 =================================================="
echo ""

# 1. PROD Build
echo "📦 Step 1/8: Building PROD frontend..."
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:prod

echo ""
echo "✅ PROD build completed"
echo ""

# 2. Deploy frontend
echo "📂 Step 2/8: Deploying frontend..."
cp -r build-prod/* /var/www/erdms-platform/apps/eeo-v2/

echo "✅ Frontend deployed"
echo ""

# 3. Deploy API
echo "📂 Step 3/8: Deploying API Legacy..."
cp -r /var/www/erdms-dev/apps/eeo-v2/api-legacy /var/www/erdms-platform/apps/eeo-v2/

echo "✅ API Legacy deployed"
echo ""

# 4. KRITICKÉ - Opravit PROD .env
echo "⚙️  Step 4/8: Fixing PROD .env (CRITICAL)..."
cat > /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env << 'EOF'
# PROD Environment - Database Configuration
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=eeo2025
DB_USER=erdms_user
DB_PASSWORD=AhchohTahnoh7eim
DB_CHARSET=utf8mb4

# Application version
REACT_APP_VERSION=2.00

# Upload paths - PROD používá /var/www/erdms-platform/data/
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
EOF

echo "✅ PROD .env fixed"
echo ""

# 5. Deploy DOCX šablony
echo "📄 Step 5/8: Deploying DOCX templates..."
mkdir -p /var/www/erdms-platform/data/eeo-v2/sablony
cp -r /var/www/erdms-data/eeo-v2/sablony/* /var/www/erdms-platform/data/eeo-v2/sablony/

echo "✅ DOCX templates deployed"
echo ""

# 6. Deploy manuály
echo "📚 Step 6/8: Deploying manuals..."
mkdir -p /var/www/erdms-platform/data/eeo-v2/manualy
cp -r /var/www/erdms-data/eeo-v2/manualy/* /var/www/erdms-platform/data/eeo-v2/manualy/

echo "✅ Manuals deployed"
echo ""

# 7. Verifikace .env
echo "🔍 Step 7/8: Verifying PROD .env..."
PROD_DB=$(grep "DB_NAME=" /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | cut -d'=' -f2)
if [ "$PROD_DB" != "eeo2025" ]; then
  echo "❌ ERROR: PROD .env has wrong database: $PROD_DB (should be eeo2025)"
  exit 1
fi
echo "✅ PROD .env verified: DB_NAME=$PROD_DB"
echo ""

# 8. Reload Apache
echo "🔄 Step 8/8: Reloading Apache..."
systemctl reload apache2

echo ""
echo "🎉 =================================================="
echo "🎉 PROD DEPLOY COMPLETED!"
echo "🎉 =================================================="
echo ""
echo "📊 Deployment Summary:"
echo "   - Frontend: /var/www/erdms-platform/apps/eeo-v2/"
echo "   - API:      /var/www/erdms-platform/apps/eeo-v2/api-legacy/"
echo "   - DB:       eeo2025"
echo "   - URL:      https://erdms.zachranka.cz/eeo-v2/"
echo ""
echo "✅ All steps completed successfully!"
echo ""
