#!/bin/bash
#===============================================================================
# EVENT TYPES NAMING REFACTOR - PHP BACKEND MIGRATION
#===============================================================================

declare -A MAPPING
MAPPING["order_status_nova"]="ORDER_CREATED"
MAPPING["order_status_rozpracovana"]="ORDER_DRAFT"
MAPPING["order_status_ke_schvaleni"]="ORDER_PENDING_APPROVAL"
MAPPING["order_status_schvalena"]="ORDER_APPROVED"
MAPPING["order_status_zamitnuta"]="ORDER_REJECTED"
MAPPING["order_status_ceka_se"]="ORDER_AWAITING_CHANGES"
MAPPING["order_status_odeslana"]="ORDER_SENT_TO_SUPPLIER"
MAPPING["order_status_ceka_potvrzeni"]="ORDER_AWAITING_CONFIRMATION"
MAPPING["order_status_potvrzena"]="ORDER_CONFIRMED_BY_SUPPLIER"
MAPPING["order_status_registr_ceka"]="ORDER_REGISTRY_PENDING"
MAPPING["order_status_registr_zverejnena"]="ORDER_REGISTRY_PUBLISHED"
MAPPING["order_status_faktura_ceka"]="ORDER_INVOICE_PENDING"
MAPPING["order_status_faktura_pridana"]="ORDER_INVOICE_ADDED"
MAPPING["order_status_faktura_schvalena"]="ORDER_INVOICE_APPROVED"
MAPPING["order_status_faktura_uhrazena"]="ORDER_INVOICE_PAID"
MAPPING["order_status_kontrola_ceka"]="ORDER_VERIFICATION_PENDING"
MAPPING["order_status_kontrola_potvrzena"]="ORDER_VERIFICATION_APPROVED"
MAPPING["order_status_kontrola_zamitnuta"]="ORDER_VERIFICATION_REJECTED"
MAPPING["order_status_dokoncena"]="ORDER_COMPLETED"
MAPPING["order_status_zrusena"]="ORDER_CANCELLED"
MAPPING["order_status_smazana"]="ORDER_DELETED"

BASE_DIR="/var/www/erdms-dev/apps/eeo-v2/api-legacy"

echo "🔍 Hledám PHP soubory s order_status_ event types..."

FILES=$(grep -rl "order_status_" "$BASE_DIR" --include="*.php")
FILE_COUNT=$(echo "$FILES" | grep -c .)

echo "📁 Nalezeno $FILE_COUNT souborů"
echo ""

TOTAL_REPLACEMENTS=0

for file in $FILES; do
    echo "📝 Zpracovávám: ${file/$BASE_DIR\//}"
    
    FILE_REPLACEMENTS=0
    
    for old_code in "${!MAPPING[@]}"; do
        new_code="${MAPPING[$old_code]}"
        
        COUNT=$(grep -c "'$old_code'" "$file" 2>/dev/null || echo 0)
        if [ "$COUNT" -gt 0 ]; then
            sed -i "s/'$old_code'/'$new_code'/g" "$file"
            echo "   🔄 '$old_code' → '$new_code' ($COUNT×)"
            FILE_REPLACEMENTS=$((FILE_REPLACEMENTS + COUNT))
        fi
        
        COUNT=$(grep -c "\"$old_code\"" "$file" 2>/dev/null || echo 0)
        if [ "$COUNT" -gt 0 ]; then
            sed -i "s/\"$old_code\"/\"$new_code\"/g" "$file"
            echo "   🔄 \"$old_code\" → \"$new_code\" ($COUNT×)"
            FILE_REPLACEMENTS=$((FILE_REPLACEMENTS + COUNT))
        fi
    done
    
    if [ "$FILE_REPLACEMENTS" -gt 0 ]; then
        echo "   ✅ $FILE_REPLACEMENTS změn"
        TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + FILE_REPLACEMENTS))
    else
        echo "   ⏭️  Žádné změny"
    fi
    echo ""
done

echo "═══════════════════════════════════════════════"
echo "✅ DOKONČENO: $TOTAL_REPLACEMENTS celkových změn v $FILE_COUNT souborech"
