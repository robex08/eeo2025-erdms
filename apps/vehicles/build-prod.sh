#!/bin/bash
# Build script pro PRODUKCI
# Použití: ./build-prod.sh

set -e

echo "🔧 Vehicles - PRODUCTION BUILD"
echo "================================"

# Backup aktuálního package.json
cp package.json package.json.tmp

# Změnit homepage na /vehicles (PROD)
sed -i 's|"homepage": "/dev/vehicles"|"homepage": "/vehicles"|g' package.json

# Změnit BUILD_PATH na build-prod
sed -i 's|"build": "react-scripts build"|"build": "BUILD_PATH=build-prod react-scripts build"|g' package.json

echo "✅ Homepage změněno na /vehicles"
echo "✅ Build cíl: build-prod/"
echo "✅ Produkční konfigurace: databaze=vehicle-zzs, API=/api.vehicles/vehicle/api.php"
echo "📦 Spouštím build..."

# Build s .env.production
REACT_APP_ENV=production \
REACT_APP_DB_LABEL=vehicle-zzs \
REACT_APP_APIURL_POST=/api.vehicles/vehicle/api.php \
REACT_APP_APIURL_GET=/api.vehicles/vehicle/api.php \
BUILD_PATH=build-prod npm run build

# Vrátit původní package.json
mv package.json.tmp package.json

echo "✅ Build dokončen: build-prod/"
echo "✅ Homepage vráceno na /dev/vehicles"
echo ""
echo "📋 Další kroky:"
echo "   1. Zkopírovat build-prod/ do /var/www/erdms-platform/apps/vehicles/"
echo "   2. Zkopírovat api/ do /var/www/erdms-platform/apps/vehicles/api/"
echo "   3. Nastavit .env v api/vehicle/ (PROD credentials)"
