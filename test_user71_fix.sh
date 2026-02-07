#!/bin/bash
# Test pro user 71 - měla by vidět 162 objednávek

echo "═══════════════════════════════════════════════════════════"
echo "🧪 TEST: User 71 visibility po FIX"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "📊 SQL Ověření:"
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' EEO-OSTRA-DEV -e "
SELECT 
    'Total orders (non-archived)' as test,
    COUNT(*) as expected_count,
    '162' as should_see
FROM 25a_objednavky
WHERE stav_objednavky != 'ARCHIVOVANO'

UNION ALL

SELECT 
    'User 71 has ORDER_READ_ALL' as test,
    COUNT(*) as has_permission,
    'YES' as should_see
FROM 25_role_prava rp
INNER JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.user_id = 71 
AND p.kod_prava = 'ORDER_READ_ALL' 
AND rp.aktivni = 1

UNION ALL

SELECT 
    'User 71 has EDIT_SUBORDINATE' as test,
    COUNT(*) as has_permission,
    'YES (but should be ignored)' as should_see
FROM 25_role_prava rp
INNER JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.user_id = 71 
AND p.kod_prava = 'ORDER_EDIT_SUBORDINATE' 
AND rp.aktivni = 1;"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Pokud vidíš 162 objednávek v UI, fix funguje!"
echo "❌ Pokud stále vidíš 30, zkontroluj error.log"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 Pro kontrolu logů:"
echo "   tail -f /var/log/apache2/error.log | grep 'User 71'"
echo "   tail -f /var/log/php8.4-fpm.log | grep 'ORDER_READ_ALL'"
