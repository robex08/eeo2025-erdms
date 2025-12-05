#!/bin/bash

# Manuální Opravy - Průvodce pro Kritické Problémy
# Tento skript vás provede kritickými problémy, které vyžadují manuální kontrolu

echo "🔍 ESLint - Manuální Opravy Kritických Problémů"
echo "================================================"
echo ""

# Barvy
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Spuštění buildu pro aktuální stav
echo -e "${BLUE}📊 Analyzuji aktuální stav...${NC}"
npm run build 2>&1 > /tmp/eslint-manual-check.log
echo ""

# 1. DUPLICITNÍ KLÍČE (KRITICKÉ!)
echo -e "${RED}🚨 KRITICKÉ: Duplicitní Klíče Objektů${NC}"
echo "======================================"
DUPE_COUNT=$(grep -c "no-dupe-keys" /tmp/eslint-manual-check.log)
echo -e "Nalezeno: ${RED}${DUPE_COUNT}${NC} problémů"
echo ""

if [ $DUPE_COUNT -gt 0 ]; then
    echo "Soubory s duplicitními klíči:"
    grep -B3 "no-dupe-keys" /tmp/eslint-manual-check.log | grep "^src/" | sort -u | while read file; do
        echo -e "  ${RED}•${NC} $file"
        
        # Najít konkrétní řádky
        grep -A2 "^$file" /tmp/eslint-manual-check.log | grep "Duplicate key" | head -1
    done
    echo ""
    echo -e "${YELLOW}⚠️  AKCE POTŘEBNÁ:${NC}"
    echo "   1. Otevřete každý soubor"
    echo "   2. Najděte duplicitní klíče"
    echo "   3. Odstraňte nebo přejmenujte jeden z nich"
    echo ""
    echo -e "${BLUE}Příklad opravy:${NC}"
    cat << 'EOF'
   // ŠPATNĚ:
   const config = {
     size: 'large',
     size: 'medium'  // ❌ Duplicitní!
   };
   
   // SPRÁVNĚ:
   const config = {
     size: 'medium'  // ✅ Pouze jeden
   };
EOF
    echo ""
    read -p "Stiskněte Enter pro pokračování..."
fi

echo ""
echo "================================================"
echo ""

# 2. POUŽITÍ == MÍSTO ===
echo -e "${YELLOW}⚠️  Použití == místo ===${NC}"
echo "======================================"
EQEQ_COUNT=$(grep -c "eqeqeq" /tmp/eslint-manual-check.log)
echo -e "Nalezeno: ${YELLOW}${EQEQ_COUNT}${NC} problémů"
echo ""

if [ $EQEQ_COUNT -gt 0 ]; then
    echo "Soubory s == problémy:"
    grep -B2 "eqeqeq" /tmp/eslint-manual-check.log | grep "^src/" | sort -u | while read file; do
        echo -e "  ${YELLOW}•${NC} $file"
    done
    echo ""
    echo -e "${YELLOW}⚠️  AKCE POTŘEBNÁ:${NC}"
    echo "   Můžete použít automatickou opravu:"
    echo -e "   ${BLUE}npx eslint src --fix --rule 'eqeqeq: error'${NC}"
    echo ""
    read -p "Provést automatickou opravu? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Opravuji..."
        npx eslint src --fix --rule 'eqeqeq: error' 2>&1 | head -20
        echo -e "${GREEN}✓ Hotovo${NC}"
    fi
fi

echo ""
echo "================================================"
echo ""

# 3. CHYBĚJÍCÍ DEFAULT CASES
echo -e "${YELLOW}📋 Chybějící Default Cases ve Switch${NC}"
echo "======================================"
DEFAULT_COUNT=$(grep -c "default-case" /tmp/eslint-manual-check.log)
echo -e "Nalezeno: ${YELLOW}${DEFAULT_COUNT}${NC} problémů"
echo ""

if [ $DEFAULT_COUNT -gt 0 ]; then
    echo "Soubory s chybějícími default cases:"
    grep -B2 "default-case" /tmp/eslint-manual-check.log | grep "^src/" | sort -u | while read file; do
        echo -e "  ${YELLOW}•${NC} $file"
    done
    echo ""
    echo -e "${YELLOW}⚠️  AKCE POTŘEBNÁ:${NC}"
    echo "   Přidejte default case do každého switch:"
    echo ""
    echo -e "${BLUE}Příklad opravy:${NC}"
    cat << 'EOF'
   // PŘED:
   switch (status) {
     case 'draft': return 'Koncept';
     case 'approved': return 'Schváleno';
   }
   
   // PO:
   switch (status) {
     case 'draft': return 'Koncept';
     case 'approved': return 'Schváleno';
     default: return null; // ✅ nebo throw new Error(...)
   }
EOF
    echo ""
fi

echo ""
echo "================================================"
echo ""

# 4. REACT HOOKS DEPENDENCIES
echo -e "${BLUE}⚛️  React Hooks Dependencies${NC}"
echo "======================================"
HOOKS_COUNT=$(grep -c "react-hooks/exhaustive-deps" /tmp/eslint-manual-check.log)
echo -e "Nalezeno: ${BLUE}${HOOKS_COUNT}${NC} problémů"
echo ""

if [ $HOOKS_COUNT -gt 0 ]; then
    echo "Top 10 souborů s hooks problémy:"
    grep -B2 "react-hooks/exhaustive-deps" /tmp/eslint-manual-check.log | \
        grep "^src/" | \
        sort | \
        uniq -c | \
        sort -rn | \
        head -10 | \
        while read count file; do
            echo -e "  ${BLUE}•${NC} $file: $count varování"
        done
    echo ""
    echo -e "${YELLOW}⚠️  DŮLEŽITÉ:${NC}"
    echo "   Hooks dependencies vyžadují pečlivou kontrolu!"
    echo "   Každý případ je třeba zvážit individuálně."
    echo ""
    echo -e "${BLUE}Strategie:${NC}"
    cat << 'EOF'
   1. CHYBĚJÍCÍ DEPENDENCY:
      • Přidejte ji, pokud se může měnit
      • Obalte do useCallback, pokud je to funkce
      • Přidejte eslint-disable komentář, pokud je to záměr
   
   2. ZBYTEČNÁ DEPENDENCY:
      • Odstraňte ji, pokud se nepoužívá v efektu
   
   3. FUNKCE V DEPENDENCIES:
      • Použijte useCallback pro stabilní referenci
      • Nebo přesuňte funkci dovnitř efektu
EOF
    echo ""
    echo "📖 Více informací v: ESLINT-OPRAVY-PLAN.md (sekce 3.2)"
    echo ""
fi

echo ""
echo "================================================"
echo ""

# 5. NEPOUŽÍVANÉ PROMĚNNÉ
echo -e "${GREEN}🗑️  Nepoužívané Proměnné${NC}"
echo "======================================"
UNUSED_COUNT=$(grep -c "no-unused-vars" /tmp/eslint-manual-check.log)
echo -e "Nalezeno: ${GREEN}${UNUSED_COUNT}${NC} problémů"
echo ""

echo "Top 10 souborů s nepoužívanými proměnnými:"
grep -B2 "no-unused-vars" /tmp/eslint-manual-check.log | \
    grep "^src/" | \
    sort | \
    uniq -c | \
    sort -rn | \
    head -10 | \
    while read count file; do
        echo -e "  ${GREEN}•${NC} $file: $count varování"
    done
echo ""
echo -e "${YELLOW}💡 TIP:${NC}"
echo "   Většinu lze odstranit bezpečně."
echo "   Pokud potřebujete proměnnou pro destructuring:"
echo "   • Přejmenujte ji na _nazev (např. _userName)"
echo ""

echo ""
echo "================================================"
echo ""

# SOUHRN
echo -e "${BLUE}📊 SOUHRN${NC}"
echo "========"
echo ""
echo "Priorita oprav:"
echo -e "  ${RED}1. VYSOKÁ${NC} - Duplicitní klíče: $DUPE_COUNT"
echo -e "  ${YELLOW}2. STŘEDNÍ${NC} - eqeqeq: $EQEQ_COUNT"
echo -e "  ${YELLOW}3. STŘEDNÍ${NC} - Default cases: $DEFAULT_COUNT"
echo -e "  ${BLUE}4. NÍZKÁ${NC} - Hooks deps: $HOOKS_COUNT"
echo -e "  ${GREEN}5. NÍZKÁ${NC} - Nepoužívané proměnné: $UNUSED_COUNT"
echo ""
echo "📝 Další kroky:"
echo "   1. Opravte KRITICKÉ problémy (duplicitní klíče)"
echo "   2. Spusťte build pro kontrolu: npm run build"
echo "   3. Opravte STŘEDNÍ prioritu"
echo "   4. Postupně řešte NÍZKOU prioritu"
echo ""
echo "📖 Detailní návod: ESLINT-OPRAVY-PLAN.md"
echo ""
