#!/bin/bash
# =============================================================================
# POST-BUILD SCRIPT: Generate Build Hash and Version Info
# =============================================================================
#
# Tento script se spustí PO každém buildu a:
# 1. Vygeneruje build hash z hlavního JS souboru
# 2. Vytvoří version.json s build informacemi
# 3. Nahradí placeholder __BUILD_HASH__ v index.html
#
# Použití:
#   ./scripts/generate-build-info.sh <build-dir>
#
# Příklad:
#   ./scripts/generate-build-info.sh build
#   ./scripts/generate-build-info.sh build-prod
#
# =============================================================================

set -e  # Exit on error

# Zjisti build directory z parametru nebo použij výchozí
BUILD_DIR="${1:-build}"

# Zkontroluj že build directory existuje
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Error: Build directory '$BUILD_DIR' neexistuje!"
  exit 1
fi

echo "🔨 Generuji build informace pro: $BUILD_DIR"
echo "================================================"

# Najdi hlavní JS bundle soubor
MAIN_JS=$(find "$BUILD_DIR/static/js" -name "main.*.js" -o -name "index.*.js" | head -n 1)

if [ -z "$MAIN_JS" ]; then
  echo "⚠️  Warning: Nenalezen hlavní JS soubor, použiji index.html pro hash"
  MAIN_JS="$BUILD_DIR/index.html"
fi

echo "📦 Generuji hash z: $MAIN_JS"

# Generuj MD5 hash (prvních 12 znaků)
if command -v md5sum &> /dev/null; then
  # Linux
  BUILD_HASH=$(md5sum "$MAIN_JS" | cut -d' ' -f1 | cut -c1-12)
elif command -v md5 &> /dev/null; then
  # macOS
  BUILD_HASH=$(md5 -q "$MAIN_JS" | cut -c1-12)
else
  echo "❌ Error: md5sum ani md5 příkaz není dostupný!"
  exit 1
fi

# Generuj timestamp (ISO 8601 format)
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Zjisti verzi aplikace (REACT_APP_VERSION)
# PRIORITA:
# 1. ENV proměnná REACT_APP_VERSION (pokud je nastavená během buildu)
# 2. .env.production (pro production build)
# 3. .env.development (pro dev build)
# 4. .env (fallback)
APP_VERSION="${REACT_APP_VERSION}"

if [ -z "$APP_VERSION" ]; then
  # Zjisti absolutní cestu k client složce (parent directory scriptu)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
  
  if [ "$BUILD_DIR" = "build-prod" ]; then
    # Production build - čti z .env.production
    if [ -f "$CLIENT_DIR/.env.production" ]; then
      APP_VERSION=$(grep -E '^REACT_APP_VERSION=' "$CLIENT_DIR/.env.production" | tail -n 1 | cut -d'=' -f2-)
      echo "🔍 Verze načtena z .env.production: $APP_VERSION"
    fi
  else
    # Dev build - čti z .env.development nebo .env
    if [ -f "$CLIENT_DIR/.env.development" ]; then
      APP_VERSION=$(grep -E '^REACT_APP_VERSION=' "$CLIENT_DIR/.env.development" | tail -n 1 | cut -d'=' -f2-)
      echo "🔍 Verze načtena z .env.development: $APP_VERSION"
    elif [ -f "$CLIENT_DIR/.env" ]; then
      APP_VERSION=$(grep -E '^REACT_APP_VERSION=' "$CLIENT_DIR/.env" | tail -n 1 | cut -d'=' -f2-)
      echo "🔍 Verze načtena z .env: $APP_VERSION"
    fi
  fi
fi

# Pokud stále není verze, nastav fallback
if [ -z "$APP_VERSION" ]; then
  APP_VERSION="unknown"
  echo "⚠️  Warning: REACT_APP_VERSION nenalezena, použita fallback hodnota: unknown"
fi

echo "✅ Build hash: $BUILD_HASH"
echo "⏰ Build time: $BUILD_TIME"
echo "📌 App version: $APP_VERSION"

# Vytvoř version.json
VERSION_JSON="$BUILD_DIR/version.json"
cat > "$VERSION_JSON" << EOF
{
  "buildHash": "$BUILD_HASH",
  "buildTime": "$BUILD_TIME",
  "version": "${APP_VERSION}",
  "generated": "$(date)"
}
EOF

echo "📝 Vytvořen: $VERSION_JSON"

# Nahraď placeholder __BUILD_HASH__ v index.html
INDEX_HTML="$BUILD_DIR/index.html"
if [ -f "$INDEX_HTML" ]; then
  # macOS kompatibilní sed (použij -i '' na macOS, -i na Linux)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/__BUILD_HASH__/$BUILD_HASH/g" "$INDEX_HTML"
  else
    sed -i "s/__BUILD_HASH__/$BUILD_HASH/g" "$INDEX_HTML"
  fi
  echo "✅ Aktualizován: $INDEX_HTML (hash injected)"
else
  echo "⚠️  Warning: $INDEX_HTML nenalezen!"
fi

# Přidej .htaccess pravidlo pro no-cache version.json (pokud neexistuje)
HTACCESS="$BUILD_DIR/.htaccess"
if [ ! -f "$HTACCESS" ] || ! grep -q "version.json" "$HTACCESS"; then
  echo "" >> "$HTACCESS"
  echo "# Prevent caching of version.json for update detection" >> "$HTACCESS"
  echo "<Files \"version.json\">" >> "$HTACCESS"
  echo "  Header set Cache-Control \"no-cache, no-store, must-revalidate\"" >> "$HTACCESS"
  echo "  Header set Pragma \"no-cache\"" >> "$HTACCESS"
  echo "  Header set Expires 0" >> "$HTACCESS"
  echo "</Files>" >> "$HTACCESS"
  echo "✅ Přidána .htaccess pravidla pro version.json"
fi

echo "================================================"
echo "✅ Build informace úspěšně vygenerovány!"
echo ""
echo "📊 Shrnutí:"
echo "   - Build hash:  $BUILD_HASH"
echo "   - Build time:  $BUILD_TIME"
echo "   - Version.json: $VERSION_JSON"
echo "   - Index.html:   $INDEX_HTML"
echo ""
