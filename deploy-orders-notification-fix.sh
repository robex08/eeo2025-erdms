#!/bin/bash
# Deploy: Orders notification fix + '0'→NULL defense
# Datum: 2026-05-29
# Commit: 39072b5a9dde419955a66f5ae821a12945add656

set -e  # Zastavit při chybě

echo "════════════════════════════════════════════════════════════════"
echo "🚀 DEPLOYMENT: Orders notification fix"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 CO SE BUDE DEPLOYOVAT:"
echo "   1. BE PHP (2 soubory):"
echo "      - orderV2Endpoints.php (notifikace při změně schvalovatele)"
echo "      - orderHandlers.php ('0'→NULL fix)"
echo "   2. FE React build (OrderForm25.js změny)"
echo ""
echo "📦 ZÁLOHY VYTVOŘENY:"
echo "   - DB: /var/www/__BCK_PRODUKCE/$(date +%Y-%m-%d)/eeo2025_backup_*.sql.gz"
echo "   - PHP: /var/www/__BCK_PRODUKCE/$(date +%Y-%m-%d)/php_backup_*/"
echo ""
echo "⚠️  DŮLEŽITÉ:"
echo "   - Produkční .env NEBUDE měněno"
echo "   - Databázová struktura NEBUDE měněna"
echo "   - API složka v produkci ZŮSTANE zachována"
echo ""
read -p "Pokračovat? (ano/NE): " confirm
if [ "$confirm" != "ano" ]; then
    echo "❌ Zrušeno uživatelem"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📝 KROK 1/4: Rsync BE PHP souborů"
echo "════════════════════════════════════════════════════════════════"

# Rsync PHP souborů
rsync -av --checksum \
    /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php \
    /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php \
    /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/

echo "✅ PHP soubory zkopírovány"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📝 KROK 2/4: Rsync FE buildu"
echo "════════════════════════════════════════════════════════════════"

# Rsync FE buildu - BEZ --delete aby se nesmazaly API složky!
rsync -av --checksum \
    --exclude='api' \
    --exclude='api-legacy' \
    --exclude='*.map' \
    /var/www/erdms-dev/apps/eeo-v2/client/build-prod/ \
    /var/www/erdms-platform/apps/eeo-v2/

echo "✅ FE build zkopírován"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📝 KROK 3/4: Nastavení oprávnění"
echo "════════════════════════════════════════════════════════════════"

chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/*.html
chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/static/
chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/*.json

echo "✅ Oprávnění nastavena"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📝 KROK 4/4: Reload Apache"
echo "════════════════════════════════════════════════════════════════"

systemctl reload apache2

echo "✅ Apache reloadnut"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT ÚSPĚŠNÝ!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔍 VERIFIKACE:"
echo ""
echo "1. Zkontroluj version.json:"
echo "   curl https://erdms.zachranka.cz/eeo-v2/version.json"
echo "   Očekávaný hash: 4421a2437d29"
echo ""
echo "2. Zkontroluj PHP logy za pár minut:"
echo "   tail -100 /var/www/erdms-dev/logs/php/prod-error.log | grep -i \"ORDER_PENDING_APPROVAL\|notification\""
echo ""
echo "3. Test scénář:"
echo "   - Vytvoř objednávku v ODESLANA_KE_SCHVALENI"
echo "   - Změň příkazce/garanta/schvalovatele"
echo "   - OVĚŘ že nový schvalovatel DOSTAL notifikaci"
echo ""
echo "4. Test '0' v usek/budova/mistnost:"
echo "   - Vytvoř položku s usek_kod='0' nebo budova_kod='0'"
echo "   - OVĚŘ že se uložilo jako '0' a ne jako NULL"
echo "   - SQL: SELECT usek_kod, budova_kod, mistnost_kod FROM 25a_objednavky_polozky WHERE id = [nové_id]"
echo ""
echo "════════════════════════════════════════════════════════════════"
