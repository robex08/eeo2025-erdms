#!/bin/bash

# 🔍 Skript pro nalezení všech tooltip komponent v aplikaci
# Použití: ./find-tooltips.sh

echo "🔍 Hledám všechny tooltip komponenty v aplikaci..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Najít všechny styled komponenty obsahující "tooltip" v názvu
echo "📦 Styled komponenty s názvem Tooltip:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -rn "const.*Tooltip.*=.*styled" src/ --include="*.js" | while IFS= read -r line; do
  echo "  $line"
done
echo ""

# Najít všechny třídy .tooltip
echo "🎨 Použití className='tooltip' nebo class='tooltip':"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -rn "className.*tooltip\|class.*tooltip" src/ --include="*.js" | head -20 | while IFS= read -r line; do
  echo "  $line"
done
echo ""

# Najít title atributy (native tooltips)
echo "📌 Native HTML title tooltips:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -rn "title=" src/ --include="*.js" | grep -v "PageTitle\|InfoTitle\|CardTitle\|DebugTitle" | head -20 | while IFS= read -r line; do
  echo "  $line"
done
echo ""

# Statistiky
echo "📊 Statistiky:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
STYLED_COUNT=$(grep -r "const.*Tooltip.*=.*styled" src/ --include="*.js" | wc -l)
CLASS_COUNT=$(grep -r "className.*tooltip\|class.*tooltip" src/ --include="*.js" | wc -l)
TITLE_COUNT=$(grep -r "title=" src/ --include="*.js" | grep -v "PageTitle\|InfoTitle\|CardTitle\|DebugTitle" | wc -l)

echo "  Styled Tooltip komponenty: $STYLED_COUNT"
echo "  Tooltip třídy: $CLASS_COUNT"
echo "  Title atributy: $TITLE_COUNT"
echo ""

# Doporučení
echo "💡 Doporučení pro migraci:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Začněte s Orders25List.js - CacheTooltip"
echo "  2. Pokračujte s Orders.js - podobný pattern"
echo "  3. Users.js - přidejte tooltips na action buttons"
echo "  4. Zvažte nahrazení title atributů za TooltipWrapper pro jednotnost"
echo ""
echo "🚀 Pro detailní návod viz: src/styles/TOOLTIP-USAGE.md"
echo ""
