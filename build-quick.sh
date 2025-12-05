#!/bin/bash
# ERDMS Quick Build Script
# Rychlý build a deploy na produkci

set -e

VERSION=${1:-$(date +%Y%m%d-%H%M%S)}
BUILD_DIR="/var/www/erdms-builds/releases/${VERSION}"

echo "════════════════════════════════════════════"
echo "🚀 ERDMS Quick Build"
echo "════════════════════════════════════════════"
echo "Version: ${VERSION}"
echo ""

# Vytvoření build složky
echo "📁 Vytvářím strukturu..."
mkdir -p ${BUILD_DIR}/dashboard
mkdir -p ${BUILD_DIR}/auth-api
mkdir -p ${BUILD_DIR}/apps/eeo-v2/client
mkdir -p ${BUILD_DIR}/apps/eeo-v2/api

# Build Dashboard
echo "🏠 Building Dashboard..."
cd /var/www/erdms-dev/dashboard
npm run build
cp -r dist ${BUILD_DIR}/dashboard/

# Copy Auth API
echo "🔐 Copying Auth API..."
cp -r /var/www/erdms-dev/auth-api/src ${BUILD_DIR}/auth-api/
cp /var/www/erdms-dev/auth-api/package*.json ${BUILD_DIR}/auth-api/
cd ${BUILD_DIR}/auth-api
npm ci --production

# Build EEO Client
echo "📱 Building EEO Client..."
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build
cp -r dist ${BUILD_DIR}/apps/eeo-v2/client/

# Copy EEO API
echo "📋 Copying EEO API..."
cp -r /var/www/erdms-dev/apps/eeo-v2/api/src ${BUILD_DIR}/apps/eeo-v2/api/
cp /var/www/erdms-dev/apps/eeo-v2/api/package*.json ${BUILD_DIR}/apps/eeo-v2/api/
cd ${BUILD_DIR}/apps/eeo-v2/api
npm ci --production

# Copy .env files
echo "⚙️ Copying production configs..."
cp /var/www/erdms-dev/auth-api/.env.production ${BUILD_DIR}/auth-api/.env 2>/dev/null || \
   cp /var/www/erdms-dev/auth-api/.env ${BUILD_DIR}/auth-api/.env

# Aktualizace production .env pro produkční porty a URL
sed -i 's/NODE_ENV=development/NODE_ENV=production/' ${BUILD_DIR}/auth-api/.env
sed -i 's/PORT=3000/PORT=4000/' ${BUILD_DIR}/auth-api/.env
sed -i 's|http://localhost:3000|https://erdms.zachranka.cz|g' ${BUILD_DIR}/auth-api/.env
sed -i 's|http://localhost:5173|https://erdms.zachranka.cz|g' ${BUILD_DIR}/auth-api/.env

# EEO API .env
cp /var/www/erdms-dev/apps/eeo-v2/api/.env.production ${BUILD_DIR}/apps/eeo-v2/api/.env 2>/dev/null || \
   cp /var/www/erdms-dev/auth-api/.env ${BUILD_DIR}/apps/eeo-v2/api/.env
sed -i 's/NODE_ENV=development/NODE_ENV=production/' ${BUILD_DIR}/apps/eeo-v2/api/.env
sed -i 's/PORT=5000/PORT=4001/' ${BUILD_DIR}/apps/eeo-v2/api/.env
sed -i 's|http://localhost|https://erdms.zachranka.cz|g' ${BUILD_DIR}/apps/eeo-v2/api/.env

# Aktualizace symlinku
echo "🔗 Updating symlink..."
ln -sfn ${BUILD_DIR} /var/www/erdms-builds/current

# Restart services
echo "🔄 Restarting services..."
systemctl restart erdms-auth-api 2>/dev/null || echo "⚠️ erdms-auth-api service not found"
systemctl restart erdms-eeo-api 2>/dev/null || echo "⚠️ erdms-eeo-api service not found"
systemctl reload apache2 || systemctl reload nginx

echo ""
echo "════════════════════════════════════════════"
echo "✅ Build complete!"
echo "════════════════════════════════════════════"
echo "Version: ${VERSION}"
echo "Location: ${BUILD_DIR}"
echo "Current: $(readlink /var/www/erdms-builds/current)"
echo ""
echo "🌐 URL: https://erdms.zachranka.cz"
echo "════════════════════════════════════════════"
