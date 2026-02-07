#!/bin/bash

# =============================================================================
# CLONE DATABASE: eeo2025 → EEO-OSTRA-DEV
# =============================================================================
# Tento script vytvoří kompletní klon ostré databáze eeo2025 do EEO-OSTRA-DEV
# 
# ⚠️ PŘED SPUŠTĚNÍM:
# 1. Ujisti se, že databáze EEO-OSTRA-DEV existuje (01-create-eeo-ostra-dev-database.sql)
# 2. Zkontroluj DB přihlašovací údaje níže
# 
# Použití:
# chmod +x 02-clone-eeo2025-to-dev.sh
# ./02-clone-eeo2025-to-dev.sh
# 
# =============================================================================

# Barvy pro výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# KONFIGURACE
# =============================================================================

DB_HOST="10.3.172.11"
DB_PORT="3306"
DB_USER="erdms_user"
DB_PASSWORD="AhchohTahnoh7eim"

SOURCE_DB="eeo2025"
TARGET_DB="EEO-OSTRA-DEV"

TEMP_DUMP="/tmp/eeo2025-clone-$(date +%Y%m%d_%H%M%S).sql"

# =============================================================================
# FUNKCE
# =============================================================================

print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# =============================================================================
# KONTROLY PŘED SPUŠTĚNÍM
# =============================================================================

print_header "KONTROLA PŘÍPRAVY"

# Kontrola mysql klienta
if ! command -v mysql &> /dev/null; then
    print_error "MySQL klient není nainstalován!"
    exit 1
fi
print_success "MySQL klient je dostupný"

# Kontrola mysqldump
if ! command -v mysqldump &> /dev/null; then
    print_error "mysqldump není nainstalován!"
    exit 1
fi
print_success "mysqldump je dostupný"

# Test připojení k databázi
print_info "Testuji připojení k databázi..."
if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    print_error "Nepodařilo se připojit k databázi!"
    exit 1
fi
print_success "Připojení k databázi je funkční"

# Kontrola existence zdrojové databáze
print_info "Kontroluji existenci zdrojové databáze $SOURCE_DB..."
if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $SOURCE_DB;" &> /dev/null; then
    print_error "Zdrojová databáze $SOURCE_DB neexistuje!"
    exit 1
fi
print_success "Zdrojová databáze $SOURCE_DB existuje"

# Kontrola existence cílové databáze
print_info "Kontroluji existenci cílové databáze $TARGET_DB..."
if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE \`$TARGET_DB\`;" &> /dev/null; then
    print_error "Cílová databáze $TARGET_DB neexistuje!"
    print_warning "Prosím nejdřív spusť: mysql -u root -p < 01-create-eeo-ostra-dev-database.sql"
    exit 1
fi
print_success "Cílová databáze $TARGET_DB existuje"

echo ""

# =============================================================================
# POTVRZENÍ OD UŽIVATELE
# =============================================================================

print_warning "POZOR: Tato operace přepíše veškerý obsah databáze $TARGET_DB!"
print_info "Zdrojová databáze: $SOURCE_DB"
print_info "Cílová databáze:   $TARGET_DB"
print_info "Dočasný dump:      $TEMP_DUMP"
echo ""

read -p "Chceš pokračovat? (ano/ne): " confirm
if [ "$confirm" != "ano" ]; then
    print_warning "Operace zrušena."
    exit 0
fi

echo ""

# =============================================================================
# KROK 1: DUMP ZDROJOVÉ DATABÁZE
# =============================================================================

print_header "KROK 1: VYTVÁŘENÍ DUMPU Z $SOURCE_DB"

print_info "Začínám dump databáze $SOURCE_DB..."
print_info "Toto může trvat několik minut podle velikosti databáze..."

if mysqldump \
    -h"$DB_HOST" \
    -P"$DB_PORT" \
    -u"$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    --quick \
    --lock-tables=false \
    --routines \
    --triggers \
    --events \
    --no-create-db \
    "$SOURCE_DB" > "$TEMP_DUMP"; then
    
    DUMP_SIZE=$(du -h "$TEMP_DUMP" | cut -f1)
    print_success "Dump vytvořen: $TEMP_DUMP (velikost: $DUMP_SIZE)"
else
    print_error "Selhalo vytvoření dumpu!"
    rm -f "$TEMP_DUMP"
    exit 1
fi

echo ""

# =============================================================================
# KROK 2: VYPRÁZDNĚNÍ CÍLOVÉ DATABÁZE
# =============================================================================

print_header "KROK 2: PŘÍPRAVA CÍLOVÉ DATABÁZE $TARGET_DB"

print_info "Získávám seznam tabulek v cílové databázi..."
TABLES=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -Nse "SHOW TABLES FROM \`$TARGET_DB\`;")

if [ -n "$TABLES" ]; then
    print_warning "Cílová databáze obsahuje $(echo "$TABLES" | wc -l) tabulek"
    print_info "Zastavuji kontrolu cizích klíčů a mažu tabulky..."
    
    # Vypnutí kontrol cizích klíčů a smazání všech tabulek
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$TARGET_DB" <<EOF
SET FOREIGN_KEY_CHECKS = 0;
$(echo "$TABLES" | while read table; do echo "DROP TABLE IF EXISTS \`$table\`;"; done)
SET FOREIGN_KEY_CHECKS = 1;
EOF
    
    print_success "Cílová databáze vyprázdněna"
else
    print_success "Cílová databáze je již prázdná"
fi

echo ""

# =============================================================================
# KROK 3: IMPORT DO CÍLOVÉ DATABÁZE
# =============================================================================

print_header "KROK 3: IMPORT DO $TARGET_DB"

print_info "Začínám import dumpu do cílové databáze..."
print_info "Toto může trvat několik minut..."

if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$TARGET_DB" < "$TEMP_DUMP"; then
    print_success "Import úspěšně dokončen!"
else
    print_error "Selhalo importování dumpu!"
    print_warning "Dočasný dump zůstává v: $TEMP_DUMP"
    exit 1
fi

echo ""

# =============================================================================
# KROK 4: VERIFIKACE
# =============================================================================

print_header "KROK 4: VERIFIKACE KLONOVÁNÍ"

print_info "Počítám tabulky v obou databázích..."

SOURCE_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$SOURCE_DB';")
TARGET_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TARGET_DB';")

echo ""
print_info "Zdrojová databáze ($SOURCE_DB): $SOURCE_COUNT tabulek"
print_info "Cílová databáze ($TARGET_DB):   $TARGET_COUNT tabulek"
echo ""

if [ "$SOURCE_COUNT" -eq "$TARGET_COUNT" ]; then
    print_success "Počet tabulek se shoduje! ✓"
else
    print_warning "POZOR: Počet tabulek se neshoduje!"
fi

echo ""

# =============================================================================
# KROK 5: ÚKLID
# =============================================================================

print_header "KROK 5: ÚKLID"

print_info "Mažu dočasný dump..."
rm -f "$TEMP_DUMP"
print_success "Dočasný dump smazán"

echo ""

# =============================================================================
# HOTOVO
# =============================================================================

print_header "✓ KLONOVÁNÍ DOKONČENO!"

echo ""
print_success "Databáze $SOURCE_DB byla úspěšně naklonována do $TARGET_DB"
echo ""
print_info "Připojovací údaje pro novou databázi:"
echo "  DB_HOST=$DB_HOST"
echo "  DB_PORT=$DB_PORT"
echo "  DB_NAME=$TARGET_DB"
echo "  DB_USER=$DB_USER"
echo "  DB_PASSWORD=$DB_PASSWORD"
echo ""
print_warning "⚠️ NEZAPOMEŇ: Aktualizovat .env soubory, pokud budeš chtít používat tuto databázi"
echo ""
