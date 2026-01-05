#!/bin/bash
# Script pro přidání granulárních oprávnění do všech dictionary tabů

# Pole: název_souboru:PREFIX_PRAV
declare -a tabs=(
  "PoziceTab.js:POSITIONS"
  "UsekyTab.js:DEPARTMENTS"
  "OrganizaceTab.js:ORGANIZATIONS"
  "StavyTab.js:STATES"
  "RoleTab.js:ROLES"
  "PravaTab.js:PERMISSIONS"
  "DocxSablonyTab.js:DOCX_TEMPLATES"
  "CashbookTab.js:CASH_BOOKS"
  "SmlouvyTab.js:CONTRACTS"
)

BASE_DIR="/var/www/erdms-dev/apps/eeo-v2/client/src/components/dictionaries/tabs"

echo "Úprava dictionary tabů pro granulární oprávnění..."

for tab_info in "${tabs[@]}"; do
  IFS=':' read -r filename prefix <<< "$tab_info"
  filepath="$BASE_DIR/$filename"
  
  if [ ! -f "$filepath" ]; then
    echo "⚠️  Soubor $filename nenalezen, přeskakuji..."
    continue
  fi
  
  echo "✏️  Zpracov\u00e1v\u00e1m $filename (prefix: $prefix)..."
  
  # Zkontrolovat, jestli již neobsahuje permission helper
  if grep -q "createDictionaryPermissionHelper" "$filepath"; then
    echo "   ℹ️  Soubor již obsahuje permission helper, přeskakuji..."
    continue
  fi
  
  echo "   ✅ Soubor upraven"
done

echo ""
echo "✅ Skript dokončen!"
echo "⚠️  POZNÁMKA: Toto je pouze šablona - skutečné úpravy je třeba udělat pomocí Copilot nástrojů"
