#!/bin/bash

# ============================================================================
# SKRIPT PRO KONTROLU A OPRAVU ČERPÁNÍ LP A SMLUV
# ============================================================================
# Použití: ./check_cerpani.sh [kontrola|oprava|prepocet|vse]
# Datum: 13. května 2026
# ============================================================================

set -e  # Ukončit při chybě

# Konfigurace
DB_HOST="localhost"
DB_NAME="EEO-OSTRA-DEV"
DB_USER="root"
DB_PASS=""  # ⚠️ DOPLNIT!

API_URL="https://eeo.zachranka.cz/api.eeo/api.php"
USERNAME="admin"
TOKEN=""  # ⚠️ DOPLNIT!

# Barvy pro výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkce pro výpis
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Kontrola prerekvizit
check_prerequisites() {
    info "Kontrola prerekvizit..."
    
    if ! command -v mysql &> /dev/null; then
        error "MySQL klient není nainstalován!"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        error "curl není nainstalován!"
        exit 1
    fi
    
    if [ -z "$DB_PASS" ]; then
        error "Není nastaveno heslo k databázi! Editujte skript a doplňte DB_PASS."
        exit 1
    fi
    
    if [ -z "$TOKEN" ]; then
        error "Není nastaven API token! Editujte skript a doplňte TOKEN."
        exit 1
    fi
    
    # Test připojení k databázi
    if ! mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME" 2>/dev/null; then
        error "Nelze se připojit k databázi $DB_NAME"
        exit 1
    fi
    
    success "Prerekvizity OK"
}

# Funkce pro kontrolu dat
run_kontrola() {
    info "Spouštím kontrolní skripty..."
    
    if [ ! -f "KONTROLA_CERPANI_SQL.sql" ]; then
        error "Soubor KONTROLA_CERPANI_SQL.sql nebyl nalezen!"
        exit 1
    fi
    
    local output_file="kontrola_vysledky_$(date +%Y%m%d_%H%M%S).txt"
    
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < KONTROLA_CERPANI_SQL.sql > "$output_file" 2>&1
    
    success "Kontrola dokončena. Výsledky uloženy do: $output_file"
    
    # Rychlá analýza výsledků
    info "Rychlá analýza:"
    
    # Počet LP s překročeným limitem
    local lp_prekroceno=$(grep -c "zbyva_skutecne.*-" "$output_file" 2>/dev/null || echo "0")
    if [ "$lp_prekroceno" -gt 0 ]; then
        warning "Nalezeno $lp_prekroceno LP s překročeným limitem"
    else
        success "Žádné LP s překročeným limitem"
    fi
    
    # Smlouvy s čerpáním > 100%
    local smlouvy_prekroceno=$(grep -c "procento_skutecne.*[0-9][0-9][0-9]\." "$output_file" 2>/dev/null || echo "0")
    if [ "$smlouvy_prekroceno" -gt 0 ]; then
        warning "Nalezeno $smlouvy_prekroceno smluv s čerpáním > 100%"
    else
        success "Žádné smlouvy s extrémním čerpáním"
    fi
    
    info "Pro detailní výsledky otevřete: $output_file"
}

# Funkce pro opravu dat
run_oprava() {
    warning "POZOR! Tato operace provede změny v databázi!"
    echo -n "Opravdu chcete pokračovat? (ano/ne): "
    read -r odpoved
    
    if [ "$odpoved" != "ano" ]; then
        info "Oprava zrušena uživatelem"
        exit 0
    fi
    
    info "Spouštím opravné skripty..."
    
    if [ ! -f "OPRAVA_CERPANI_SQL.sql" ]; then
        error "Soubor OPRAVA_CERPANI_SQL.sql nebyl nalezen!"
        exit 1
    fi
    
    # Vytvoření zálohy
    info "Vytváření zálohy databáze..."
    local backup_file="backup_cerpani_$(date +%Y%m%d_%H%M%S).sql"
    
    mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
        25_limitovane_prisliby_cerpani \
        25_smlouvy \
        > "$backup_file"
    
    success "Záloha vytvořena: $backup_file"
    
    # Spuštění oprav
    local output_file="oprava_vysledky_$(date +%Y%m%d_%H%M%S).txt"
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < OPRAVA_CERPANI_SQL.sql > "$output_file" 2>&1
    
    success "Oprava dokončena. Výsledky uloženy do: $output_file"
    
    info "Záloha k návratu: mysql -u $DB_USER -p $DB_NAME < $backup_file"
}

# Funkce pro přepočet přes API
run_prepocet() {
    info "Přepočítávám LP přes API..."
    
    local lp_response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"endpoint\": \"limitovane-prisliby/prepocet\",
            \"username\": \"$USERNAME\",
            \"token\": \"$TOKEN\",
            \"rok\": 2025
        }")
    
    if echo "$lp_response" | grep -q '"status":"ok"'; then
        success "LP přepočteny"
        echo "$lp_response" | grep -o '"updated":[0-9]*' || true
    else
        error "Chyba při přepočtu LP"
        echo "$lp_response"
    fi
    
    info "Přepočítávám smlouvy přes API..."
    
    local smlouvy_response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"endpoint\": \"ciselniky/smlouvy/inicializace\",
            \"username\": \"$USERNAME\",
            \"token\": \"$TOKEN\"
        }")
    
    if echo "$smlouvy_response" | grep -q '"status":"ok"'; then
        success "Smlouvy přepočteny"
    else
        error "Chyba při přepočtu smluv"
        echo "$smlouvy_response"
    fi
}

# Hlavní menu
show_menu() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  KONTROLA A OPRAVA ČERPÁNÍ LP A SMLUV"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  1) Kontrola dat (SQL dotazy)"
    echo "  2) Oprava dat (SQL skripty + záloha)"
    echo "  3) Přepočet přes API (LP + Smlouvy)"
    echo "  4) Vše (kontrola → oprava → přepočet)"
    echo "  0) Konec"
    echo ""
    echo -n "Vyberte akci: "
}

# Hlavní funkce
main() {
    clear
    check_prerequisites
    
    if [ $# -eq 0 ]; then
        # Interaktivní režim
        while true; do
            show_menu
            read -r choice
            
            case $choice in
                1)
                    run_kontrola
                    ;;
                2)
                    run_oprava
                    ;;
                3)
                    run_prepocet
                    ;;
                4)
                    info "Spouštím kompletní proces..."
                    run_kontrola
                    echo ""
                    run_oprava
                    echo ""
                    run_prepocet
                    success "Kompletní proces dokončen!"
                    ;;
                0)
                    info "Konec"
                    exit 0
                    ;;
                *)
                    error "Neplatná volba!"
                    ;;
            esac
            
            echo ""
            echo -n "Stiskněte Enter pro pokračování..."
            read -r
        done
    else
        # Příkazový režim
        case "$1" in
            kontrola)
                run_kontrola
                ;;
            oprava)
                run_oprava
                ;;
            prepocet)
                run_prepocet
                ;;
            vse)
                run_kontrola
                run_oprava
                run_prepocet
                ;;
            *)
                error "Neplatný argument! Použití: $0 [kontrola|oprava|prepocet|vse]"
                exit 1
                ;;
        esac
    fi
}

# Spuštění
main "$@"
