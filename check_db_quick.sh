#!/bin/bash
# Rychlá kontrola struktury a dat

echo "=== KONTROLA SLOUPCŮ 25a_pokladni_polozky ==="
timeout 3 mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' EEO-OSTRA-DEV -e "SHOW COLUMNS FROM 25a_pokladni_polozky" 2>/dev/null

echo ""
echo "=== TEST: Položky s pokladni_kniha_id = 20 ==="
timeout 3 mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' EEO-OSTRA-DEV -e "SELECT COUNT(*) as pocet FROM 25a_pokladni_polozky WHERE pokladni_kniha_id = 20" 2>/dev/null

echo ""
echo "=== VÝPIS POLOŽEK pro book_id=20 ==="
timeout 3 mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' EEO-OSTRA-DEV -e "SELECT * FROM 25a_pokladni_polozky WHERE pokladni_kniha_id = 20 LIMIT 5" 2>/dev/null
