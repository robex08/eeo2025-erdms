#!/bin/bash

# ============================================================================
# INSTALAČNÍ SKRIPT - KONTEXTOVÝ POMOCNÍK
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║     🤖 KONTEXTOVÝ POMOCNÍK - INSTALACE OPRÁVNĚNÍ                  ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Nastavení barev
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kontrola, zda existuje SQL soubor
if [ ! -f "setup_contextual_helper_permissions.sql" ]; then
    echo -e "${RED}❌ CHYBA: Soubor setup_contextual_helper_permissions.sql nebyl nalezen!${NC}"
    echo "   Zkontrolujte, zda jste ve správném adresáři."
    exit 1
fi

echo -e "${YELLOW}📝 Připravuji import SQL skriptu...${NC}"
echo ""

# Dotaz na přihlašovací údaje
read -p "🔐 MySQL username [root]: " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-root}

read -p "🗄️  Database name [evidence_smluv]: " DB_NAME
DB_NAME=${DB_NAME:-evidence_smluv}

echo ""
echo -e "${YELLOW}⏳ Spouštím SQL skript...${NC}"
echo ""

# Spuštění SQL skriptu
mysql -u "$MYSQL_USER" -p "$DB_NAME" < setup_contextual_helper_permissions.sql

# Kontrola výsledku
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SQL skript byl úspěšně proveden!${NC}"
    echo ""
    
    # Kontrolní dotaz
    echo -e "${YELLOW}📊 Kontrola vytvořených oprávnění:${NC}"
    echo ""
    
    mysql -u "$MYSQL_USER" -p "$DB_NAME" -e "
    SELECT 
      id, 
      kod_prava, 
      popis, 
      aktivni 
    FROM \`25_prava\` 
    WHERE kod_prava LIKE 'HELPER_%'
    ORDER BY kod_prava;
    "
    
    echo ""
    echo -e "${YELLOW}📊 Přiřazení k rolím:${NC}"
    echo ""
    
    mysql -u "$MYSQL_USER" -p "$DB_NAME" -e "
    SELECT 
      r.kod_role,
      MAX(CASE WHEN p.kod_prava = 'HELPER_VIEW' THEN '✓' ELSE '' END) AS VIEW,
      MAX(CASE WHEN p.kod_prava = 'HELPER_MANAGE' THEN '✓' ELSE '' END) AS MANAGE
    FROM \`25_role\` r
    LEFT JOIN \`25_role_prava\` rp ON r.id = rp.role_id
    LEFT JOIN \`25_prava\` p ON rp.pravo_id = p.id AND p.kod_prava LIKE 'HELPER_%'
    WHERE r.aktivni = 1
    GROUP BY r.id, r.kod_role
    ORDER BY r.id;
    "
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ INSTALACE DOKONČENA                                           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}📝 Další kroky:${NC}"
    echo "   1. Restartujte React aplikaci (npm start)"
    echo "   2. Přihlaste se do aplikace"
    echo "   3. Otevřete Pokladní knihu (/cash-book)"
    echo "   4. V levém spodním rohu uvidíte avatar mince 🪙"
    echo ""
    echo -e "${YELLOW}📚 Dokumentace:${NC}"
    echo "   - CONTEXTUAL-HELPER-QUICKSTART.md (rychlý start)"
    echo "   - CONTEXTUAL-HELPER-DOCUMENTATION.md (plná dokumentace)"
    echo ""
    
else
    echo ""
    echo -e "${RED}❌ CHYBA: SQL skript selhal!${NC}"
    echo "   Zkontrolujte chybové hlášky výše."
    echo ""
    exit 1
fi

exit 0
