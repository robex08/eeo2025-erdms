#!/bin/bash
# ============================================================================
# EEO v2 - PROD Deployment Script - verze 1.95b
# ============================================================================
# Datum: 3. ledna 2026
# Popis: Kompletní deployment včetně API legacy a aktualizace .env
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "EEO v2 - PROD Deployment - verze 1.95b"
echo "============================================================================"
echo ""

# 1. Deploy frontend
echo "📦 [1/6] Kopírování frontendu..."
cp -r /var/www/erdms-dev/apps/eeo-v2/client/build-prod/* /var/www/erdms-platform/apps/eeo-v2/
echo "✅ Frontend zkopírován"
echo ""

# 2. Deploy API
echo "📦 [2/6] Kopírování API legacy..."
cp -r /var/www/erdms-dev/apps/eeo-v2/api-legacy /var/www/erdms-platform/apps/eeo-v2/
echo "✅ API legacy zkopírováno"
echo ""

# 3. KRITICKÉ - Opravit PROD .env
echo "⚠️  [3/6] Aktualizace PROD .env..."
cat > /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env << 'EOF'
# PROD Environment - Database Configuration
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=eeo2025
DB_USER=erdms_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_CHARSET=utf8mb4

# Application version
REACT_APP_VERSION=1.95b

# Upload paths - PROD používá /var/www/erdms-platform/data/
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
EOF
echo "✅ PROD .env aktualizován"
echo ""

# 4. Deploy manuály
echo "📦 [4/6] Kopírování manuálů..."
mkdir -p /var/www/erdms-platform/data/eeo-v2/manualy
cp -r /var/www/erdms-data/eeo-v2/manualy/* /var/www/erdms-platform/data/eeo-v2/manualy/
echo "✅ Manuály zkopírovány"
echo ""

# 5. Ověření verzí
echo "🔍 [5/6] Ověření verzí..."
echo "Frontend package.json:"
grep '"version"' /var/www/erdms-dev/apps/eeo-v2/client/package.json
echo ""
echo "PROD API .env:"
grep 'REACT_APP_VERSION' /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
echo ""

# 6. Reload Apache
echo "🔄 [6/6] Reload Apache..."
systemctl reload apache2
echo "✅ Apache reloadován"
echo ""

echo "============================================================================"
echo "✅ PROD deployment kompletní - verze 1.95b"
echo "============================================================================"
echo ""
echo "🌐 Produkční URL:"
echo "   Frontend: https://erdms.zachranka.cz/eeo-v2"
echo "   API:      https://erdms.zachranka.cz/api.eeo/"
echo ""
echo "💾 Databáze: eeo2025 (10.3.172.11)"
echo ""
