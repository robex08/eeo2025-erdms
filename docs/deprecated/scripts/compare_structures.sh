#!/bin/bash

TABLES=(
  "25_uzivatele"
  "25a_pokladni_audit"
  "25a_pokladni_knihy"
  "25a_pokladni_knihy_bck"
  "25a_pokladni_polozky"
  "25a_pokladni_polozky_detail"
  "25a_pokladny"
  "25a_pokladny_uzivatele"
  "25_notifikace"
  "25_notifikace_audit"
  "25_notifikace_backup_20260103"
  "25_notifikace_fronta"
  "25_notifikace_precteni"
  "25_notifikace_sablony"
  "25_notifikace_sablony_backup_20251222"
  "25_notifikace_typy_udalosti"
  "25_notifikace_typy_udalosti_backup_20260103"
  "25_notifikace_uzivatele_nastaveni"
  "25_hierarchie_profily"
)

echo "=========================================="
echo "POROVNÁNÍ STRUKTUR DEV vs PROD"
echo "=========================================="
echo ""

for table in "${TABLES[@]}"; do
  echo "Kontroluji: $table"
  
  # Get structure from DEV
  mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025-dev -e "SHOW CREATE TABLE \`$table\`" 2>&1 | tail -n +2 > /tmp/dev_$table.txt
  
  # Get structure from PROD  
  mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e "SHOW CREATE TABLE \`$table\`" 2>&1 | tail -n +2 > /tmp/prod_$table.txt
  
  # Compare
  if diff -q /tmp/dev_$table.txt /tmp/prod_$table.txt > /dev/null 2>&1; then
    echo "  ✅ IDENTICKÁ"
  else
    echo "  ⚠️  ROZDÍL DETEKOVÁN!"
    diff /tmp/dev_$table.txt /tmp/prod_$table.txt | head -20
  fi
  echo ""
done

echo "=========================================="
echo "KONTROLA DOKONČENA"
echo "=========================================="
