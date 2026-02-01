#!/bin/bash
# 
# Helper script pro kontrolu synchronizace build hashů
# Použití: ./check_build_hashes.sh [build-dir]
#

BUILD_DIR="${1:-apps/eeo-v2/client/build}"

echo "🔍 Kontroluji synchronizaci build hashů v: $BUILD_DIR"
echo "================================================"

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ ERROR: Build directory '$BUILD_DIR' neexistuje!"
    exit 1
fi

# Získej hashe
HASH_HTML=$(grep -o 'build-hash" content="[^"]*"' "$BUILD_DIR/index.html" 2>/dev/null | cut -d'"' -f3)
HASH_JSON=$(cat "$BUILD_DIR/version.json" 2>/dev/null | grep -o '"buildHash": "[^"]*"' | cut -d'"' -f4)

echo "📄 Hash v index.html:  $HASH_HTML"
echo "📦 Hash v version.json: $HASH_JSON"
echo ""

# Porovnej
if [ -z "$HASH_HTML" ]; then
    echo "❌ ERROR: Hash nenalezen v index.html!"
    exit 1
elif [ -z "$HASH_JSON" ]; then
    echo "❌ ERROR: Hash nenalezen v version.json!"
    exit 1
elif [ "$HASH_HTML" = "$HASH_JSON" ]; then
    echo "✅ SUCCESS: Hashe jsou synchronizované!"
    echo ""
    echo "ℹ️  Build hash: $HASH_HTML"
    
    # Ukaž také build time
    BUILD_TIME=$(cat "$BUILD_DIR/version.json" 2>/dev/null | grep -o '"buildTime": "[^"]*"' | cut -d'"' -f4)
    if [ -n "$BUILD_TIME" ]; then
        echo "⏰ Build time: $BUILD_TIME"
    fi
    
    exit 0
else
    echo "❌ ERROR: Hashe se NESHODUJÍ!"
    echo ""
    echo "⚠️  PŘÍČINA: Pravděpodobně byl spuštěn generate-build-info.sh manuálně po buildu."
    echo ""
    echo "🔧 ŘEŠENÍ:"
    echo "   1. Oprav version.json - použij hash z index.html:"
    echo "      jq '.buildHash = \"$HASH_HTML\"' $BUILD_DIR/version.json > tmp && mv tmp $BUILD_DIR/version.json"
    echo ""
    echo "   2. Nebo spusť nový build:"
    echo "      cd /var/www/erdms-dev/docs/scripts-shell"
    echo "      ./build-eeo-v2.sh --dev --explicit"
    
    exit 1
fi
