#!/bin/bash

# RYCHLÁ OPRAVA - Kritické Duplicitní Klíče
# Tento skript opraví 4 nejkritičtější problémy s duplicitními klíči

echo "🚨 RYCHLÁ OPRAVA - Duplicitní Klíče"
echo "===================================="
echo ""

# Barvy
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Záloha
echo -e "${YELLOW}📦 Vytváření zálohy...${NC}"
BACKUP_DIR="_BCK_/dupe-keys-fix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Soubory, které budeme opravovat
FILES=(
    "src/pages/CashBookPage.js"
    "src/hooks/useFloatingPanels.js"
    "src/pages/Orders25List.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "   ✓ Zálohováno: $file"
    fi
done

echo -e "${GREEN}✓ Záloha vytvořena v: $BACKUP_DIR${NC}"
echo ""

# Info o problémech
echo -e "${RED}Nalezené duplicitní klíče:${NC}"
echo ""
echo "1. src/pages/CashBookPage.js - Line ~1336: Duplicate key 'state'"
echo "2. src/hooks/useFloatingPanels.js - Line ~1936: Duplicate key 'serverSyncStatus'"
echo "3. src/pages/Orders25List.js - Line ~7021: Duplicate key 'size'"
echo "4. src/pages/Orders25List.js - Line ~7023: Duplicate key 'maxSize'"
echo ""

echo -e "${YELLOW}⚠️  VAROVÁNÍ:${NC}"
echo "Tato oprava vyžaduje manuální kontrolu!"
echo "Doporučuji otevřít soubory v editoru a opravit ručně."
echo ""
echo -e "${BLUE}Postup:${NC}"
cat << 'EOF'

Pro každý soubor:
1. Najděte řádek s duplicitním klíčem
2. Rozhodněte, který klíč zachovat
3. Odstraňte nebo přejmenujte druhý

Příklad:
--------
const config = {
  size: 'large',
  color: 'red',
  size: 'medium'  // ❌ Duplicitní! Druhý přepíše první
};

Oprava:
-------
const config = {
  size: 'medium',  // ✅ Zachováno pouze jeden
  color: 'red'
};

EOF

echo ""
echo -e "${YELLOW}Chcete otevřít soubory pro kontrolu? (y/n)${NC}"
read -p "> " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Otevírám soubory..."
    
    # Pokud je k dispozici VS Code
    if command -v code &> /dev/null; then
        code "src/pages/CashBookPage.js:1336"
        code "src/hooks/useFloatingPanels.js:1936"
        code "src/pages/Orders25List.js:7021"
        echo -e "${GREEN}✓ Soubory otevřeny v VS Code${NC}"
    else
        echo "VS Code není k dispozici. Otevřete soubory manuálně:"
        for file in "${FILES[@]}"; do
            echo "  • $file"
        done
    fi
fi

echo ""
echo "================================================"
echo ""
echo -e "${BLUE}📝 KONKRÉTNÍ MÍSTA K OPRAVĚ:${NC}"
echo ""

echo "1. CashBookPage.js (řádek ~1336):"
echo "   Hledejte objekt s duplicitním 'state' klíčem"
echo ""

echo "2. useFloatingPanels.js (řádek ~1936):"
echo "   Hledejte objekt s duplicitním 'serverSyncStatus' klíčem"
echo ""

echo "3. Orders25List.js (řádek ~7021-7023):"
echo "   Hledejte objekt s duplicitními 'size' a 'maxSize' klíči"
echo ""

echo "================================================"
echo ""
echo "Po opravě spusťte: npm run build"
echo "Pro kontrolu změn: git diff"
echo "Pro obnovení zálohy: cp $BACKUP_DIR/* src/..."
echo ""
