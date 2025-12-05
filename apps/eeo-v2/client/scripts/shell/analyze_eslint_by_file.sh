#!/bin/bash

# Analýza ESLint varování po souborech
# Vytvoří detailní report s počty varování pro každý soubor

echo "📊 ESLint Analýza Po Souborech"
echo "==============================="
echo ""

# Spuštění buildu a zachycení výstupu
echo "🔍 Analyzuji projekt..."
npm run build 2>&1 > /tmp/eslint-full-output.log

# Vytvoření report souboru
REPORT_FILE="eslint-report-by-file-$(date +%Y%m%d-%H%M%S).txt"

echo "ESLint Varování - Analýza Po Souborech" > "$REPORT_FILE"
echo "Datum: $(date)" >> "$REPORT_FILE"
echo "=======================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Extrakce souborů a jejich varování
grep -E "^src/" /tmp/eslint-full-output.log | while read -r line; do
    echo "$line" >> "$REPORT_FILE"
done

# Počet varování pro každý soubor
echo "" >> "$REPORT_FILE"
echo "TOP 20 Souborů s Nejvíce Varováními:" >> "$REPORT_FILE"
echo "=====================================" >> "$REPORT_FILE"
grep -E "^src/" /tmp/eslint-full-output.log | \
    cut -d: -f1 | \
    sort | \
    uniq -c | \
    sort -rn | \
    head -20 >> "$REPORT_FILE"

# Statistika typů varování
echo "" >> "$REPORT_FILE"
echo "Statistika Typů Varování:" >> "$REPORT_FILE"
echo "=========================" >> "$REPORT_FILE"
grep -oE "(no-unused-vars|react-hooks/exhaustive-deps|eqeqeq|default-case|no-dupe-keys|import/no-anonymous-default-export|no-useless-escape|no-mixed-operators)" /tmp/eslint-full-output.log | \
    sort | \
    uniq -c | \
    sort -rn >> "$REPORT_FILE"

# Soubory s kritickými problémy
echo "" >> "$REPORT_FILE"
echo "Soubory s Duplicitními Klíči (KRITICKÉ):" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
grep -B2 "no-dupe-keys" /tmp/eslint-full-output.log | \
    grep "^src/" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "Soubory s eqeqeq Problémy:" >> "$REPORT_FILE"
echo "==========================" >> "$REPORT_FILE"
grep -B2 "eqeqeq" /tmp/eslint-full-output.log | \
    grep "^src/" >> "$REPORT_FILE"

# Výstup
echo ""
echo "✅ Report vytvořen: $REPORT_FILE"
echo ""
echo "📋 Souhrn:"
grep -c "^src/" /tmp/eslint-full-output.log 2>/dev/null || echo "0" | while read count; do
    echo "   • Celkem souborů s varováními: $count"
done

echo ""
echo "🔝 Top 5 souborů s problémy:"
grep -E "^src/" /tmp/eslint-full-output.log | \
    cut -d: -f1 | \
    sort | \
    uniq -c | \
    sort -rn | \
    head -5 | \
    while read count file; do
        echo "   • $file: $count varování"
    done

echo ""
echo "💡 Pro zobrazení detailů: cat $REPORT_FILE"
echo ""
