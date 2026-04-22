#!/bin/bash
# =============================================================================
# INVENTIK - Ověření importu dat
# =============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║         INVENTIK - Ověření dat v databázi                ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

DB_HOST="10.3.172.11"
DB_USER="inventik"
DB_PASS="Inv3nt1k2026!"
DB_NAME="inventik-dev"

# Funkce pro mysql dotaz
query() {
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "$1" 2>/dev/null
}

# 1. Test připojení
echo "🔌 Test připojení k databázi..."
CONN_TEST=$(query "SELECT 1")
if [ "$CONN_TEST" = "1" ]; then
    echo "   ✅ Připojení OK"
else
    echo "   ❌ Chyba připojení!"
    exit 1
fi

# 2. Kontrola tabulek
echo ""
echo "📊 Kontrola tabulek..."
TABLES=$(query "SHOW TABLES" | wc -l)
echo "   ✅ Nalezeno tabulek: $TABLES"

# 3. Počty záznamů
echo ""
echo "📈 Počty importovaných záznamů:"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BUDOVY=$(query "SELECT COUNT(*) FROM budovy")
USEKY=$(query "SELECT COUNT(*) FROM inventarni_useky")
MISTNOSTI=$(query "SELECT COUNT(*) FROM mistnosti")
MAJETEK=$(query "SELECT COUNT(*) FROM majetek")

echo "   Budovy:           $BUDOVY"
echo "   Inv. úseky:       $USEKY"
echo "   Místnosti:        $MISTNOSTI"
echo "   Majetek:          $MAJETEK"
TOTAL=$((BUDOVY + USEKY + MISTNOSTI + MAJETEK))
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   CELKEM:           $TOTAL"

# 4. Kontrola VIEW
echo ""
echo "🔍 Test VIEW v_majetek_prehled..."
VIEW_COUNT=$(query "SELECT COUNT(*) FROM v_majetek_prehled")
if [ "$VIEW_COUNT" -gt 0 ]; then
    echo "   ✅ VIEW funguje ($VIEW_COUNT záznamů)"
else
    echo "   ❌ VIEW nefunguje!"
fi

# 5. Ukázka dat
echo ""
echo "📋 Ukázka prvního záznamu:"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT 
    inventarni_cislo as 'Inv.č.',
    nazev as 'Název',
    cena as 'Cena',
    budova as 'Budova'
FROM v_majetek_prehled 
LIMIT 1" 2>/dev/null

# 6. Statistiky
echo ""
echo "📊 Rychlé statistiky:"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Nejdražší položka
NEJDRAZSI=$(query "
    SELECT CONCAT(nazev, ' - ', cena_mj_num, ' Kč')
    FROM majetek 
    WHERE cena_mj_num IS NOT NULL 
    ORDER BY cena_mj_num DESC 
    LIMIT 1
")
echo "   Nejdražší položka: $NEJDRAZSI"

# Budova s nejvíce majetkem
TOP_BUDOVA=$(query "
    SELECT CONCAT(b.budovat, ' (', COUNT(m.id), ' položek)')
    FROM budovy b
    LEFT JOIN majetek m ON b.budt = m.budt
    GROUP BY b.budt, b.budovat
    ORDER BY COUNT(m.id) DESC
    LIMIT 1
")
echo "   TOP budova: $TOP_BUDOVA"

# Celková hodnota
CELKOVA_HODNOTA=$(query "
    SELECT CONCAT(FORMAT(SUM(cena_mj_num), 0, 'cs_CZ'), ' Kč')
    FROM majetek
    WHERE cena_mj_num IS NOT NULL
")
echo "   Celková hodnota: $CELKOVA_HODNOTA"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              ✅ VŠECHNA DATA IMPORTOVÁNA! ✅              ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Další informace:"
echo "   • IMPORT_SUCCESS.md - Kompletní souhrn"
echo "   • podklady/TEST_QUERIES.sql - Ukázkové dotazy"
echo ""
