#!/bin/bash
echo "═══════════════════════════════════════════════════════════════════"
echo "EVENT TYPES MIGRATION - OVĚŘENÍ"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

echo "🔍 1. DATABÁZE - Event types s novými kódy:"
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD "eeo2025-dev" -e "
SELECT kod, nazev, kategorie FROM 25_notifikace_typy_udalosti 
WHERE kod LIKE 'ORDER_%' 
ORDER BY id 
LIMIT 10;"
echo ""

echo "🔍 2. DATABÁZE - Notifikace s novými kódy:"
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD "eeo2025-dev" -e "
SELECT typ, COUNT(*) as pocet 
FROM 25_notifikace 
WHERE typ LIKE 'ORDER_%' 
GROUP BY typ 
ORDER BY pocet DESC 
LIMIT 5;"
echo ""

echo "🔍 3. PHP BACKEND - Zbývající staré kódy:"
OLD_PHP=$(grep -r "order_status_" /var/www/erdms-dev/apps/eeo-v2/api-legacy --include="*.php" | grep -v ".git" | grep -v "ORDER_" | wc -l)
echo "   Nalezeno: $OLD_PHP výskytů (komentáře/logy OK)"
echo ""

echo "🔍 4. FRONTEND JS - Zbývající staré kódy:"
OLD_JS=$(grep -r "order_status_" /var/www/erdms-dev/apps/eeo-v2/client/src --include="*.js" --include="*.jsx" | grep -v ".git" | grep -v "ORDER_" | wc -l)
echo "   Nalezeno: $OLD_JS výskytů"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
if [ "$OLD_PHP" -eq 0 ] && [ "$OLD_JS" -eq 0 ]; then
    echo "✅ MIGRACE DOKONČENA - Žádné staré kódy nenalezeny!"
else
    echo "⚠️  POZOR - Zbývající staré kódy (pravděpodobně v komentářích)"
fi
echo "═══════════════════════════════════════════════════════════════════"
