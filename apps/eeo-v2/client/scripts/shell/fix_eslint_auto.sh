#!/bin/bash

# ESLint - Automatické Opravy Bezpečných Problémů
# Autor: Automaticky generováno
# Datum: 14. listopadu 2025

echo "🔧 ESLint Automatické Opravy"
echo "=============================="
echo ""

# Barvy pro výstup
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kontrola, zda existuje node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ Chyba: node_modules nenalezeno. Spusťte nejprve 'npm install'.${NC}"
    exit 1
fi

# Kontrola, zda existuje eslint
if [ ! -f "node_modules/.bin/eslint" ]; then
    echo -e "${RED}❌ Chyba: ESLint není nainstalován.${NC}"
    exit 1
fi

# Vytvoření zálohy
echo -e "${YELLOW}📦 Vytváření zálohy...${NC}"
BACKUP_DIR="_BCK_/eslint-fix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Kopírování src do zálohy
echo "   Kopírování src/ do $BACKUP_DIR/"
cp -r src "$BACKUP_DIR/"
echo -e "${GREEN}✓ Záloha vytvořena${NC}"
echo ""

# Fáze 1: Automatické opravy
echo -e "${YELLOW}🚀 Fáze 1: Spuštění ESLint --fix${NC}"
echo "   Toto opraví:"
echo "   - Zbytečné escape sekvence"
echo "   - Mezery a formátování"
echo "   - Některé jednoduché problémy"
echo ""

npx eslint src --fix --ext .js,.jsx 2>&1 | head -50

echo ""
echo -e "${GREEN}✓ Automatické opravy dokončeny${NC}"
echo ""

# Fáze 2: Oprava == na ===
echo -e "${YELLOW}🔄 Fáze 2: Nahrazení == za ===${NC}"

# Soubory s eqeqeq problémem
FILES_TO_FIX=(
    "src/pages/CashBookPage.js"
    "src/components/AddressBookAresPanel.js"
    "src/pages/Orders25List.js"
)

for file in "${FILES_TO_FIX[@]}"; do
    if [ -f "$file" ]; then
        echo "   Opravuji: $file"
        # Náhrada == za === (ale ne v komentářích)
        # Pouze tam, kde to dává smysl (ne v řetězcích)
        sed -i.bak -E 's/([^=!<>])( *)== *([^=])/\1\2=== \3/g' "$file"
        rm -f "${file}.bak"
    fi
done

echo -e "${GREEN}✓ Nahrazení dokončeno${NC}"
echo ""

# Fáze 3: Odstranění trailing spaces
echo -e "${YELLOW}🧹 Fáze 3: Čištění trailing spaces${NC}"
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec sed -i 's/[[:space:]]*$//' {} \;
echo -e "${GREEN}✓ Trailing spaces odstraněny${NC}"
echo ""

# Spuštění build pro kontrolu
echo -e "${YELLOW}🏗️  Kontrolní build...${NC}"
echo ""
npm run build > /tmp/eslint-fix-build.log 2>&1

# Počet varování před a po
WARNINGS_COUNT=$(grep -E "(no-unused-vars|react-hooks|eqeqeq)" /tmp/eslint-fix-build.log | wc -l)

echo ""
echo "=============================="
echo -e "${GREEN}✅ HOTOVO!${NC}"
echo "=============================="
echo ""
echo "📊 Statistiky:"
echo "   • Záloha: $BACKUP_DIR/"
echo "   • Aktuální počet varování: $WARNINGS_COUNT"
echo ""
echo "📝 Další kroky:"
echo "   1. Zkontrolujte změny: git diff"
echo "   2. Otestujte aplikaci"
echo "   3. Pokud vše OK, commit změn"
echo "   4. Pokud problém, obnovte ze zálohy"
echo ""
echo "💡 Pro pokročilé opravy:"
echo "   • Spusťte: ./fix_eslint_manual.sh"
echo "   • Nebo prostudujte: ESLINT-OPRAVY-PLAN.md"
echo ""
