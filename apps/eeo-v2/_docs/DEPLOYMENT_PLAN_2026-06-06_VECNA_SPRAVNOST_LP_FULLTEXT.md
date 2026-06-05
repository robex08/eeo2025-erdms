# 🚀 DEPLOYMENT PLAN - 5. - 6. června 2026

## 📋 Přehled změn
**Datum přípravy:** 5. - 6. iunie 2026  
**Datum nasazení:** 6. június 2026+  
**Verze:** v2.58  
**Branch:** `feature/v3-development`  
**Rozsah:** Věcná správnost (zamítnutí), LP fulltext search + filtrování  
**Poslední commit:** `1c1e0553` - LP fulltext search a filtrování

---

## 🎯 KLÍČOVÉ FUNKCE

### 1️⃣ **VĚCNÁ SPRÁVNOST - ZAMÍTNUTÍ FAKTUR**
**Commity:** `8797e136` (Phase 1) → `72aac789` (Phase 5) → `9c370eb8` (finalizace)

✅ **Funkce:**
- **Tři stavy faktury** (`vecna_spravnost_potvrzeno`):
  - `NULL` = Neověřeno (výchozí stav)
  - `1` = Potvrzeno (`VECNA_SPRAVNOST` status) ✅
  - `2` = Zamítnuté (`ZAMITNUTO` status) ❌

- **Zamítnutí** (nové!):
  - Stav faktury: `ZAEVIDOVANA` → `ZAMITNUTO`
  - Povinný **důvod** (`vecna_spravnost_duvod`)
  - Automatické nastavení: `potvrdil_vecnou_spravnost_id = current_user_id`, `dt_potvrzeni_vecne_spravnosti`
  - **Reverz:** Zrušení zamítnutí → `ZAMITNUTO` → `ZAEVIDOVANA`

- **Filtrování:**
  - Nový filtr "Zamítnuté" v tabulce faktur
  - Filtr automaticky přepočítá SUM queries pro čerpání LP
  - Zobrazení: Číslo faktur (bez +ikonů při status "Zamítnuté")

- **UX vylepšení:**
  - Barevný tooltip na ikonu věcné správnosti (zelená/červená)
  - Zkrácení důvodu s elipsou + hover pro full text
  - Datum a jméno uživatele, který potvrdil

📁 **Změněné soubory:**
- `invoiceHandlers.php` - SQL filtrování, SUM queries s rejection
- `invoiceCheckHandlers.php` - Backend logika pro zamítnutí
- `orderV2Endpoints.php` - Inline update s reverse logikou
- `orderV2InvoiceHandlers.php` - CRUD operace s auto-nastavením
- `InvoiceEvidencePage.js` - UI pro zamítnutí + tooltips
- `Invoices25List.js` - Filtr + zobrazení status
- `apiInvoiceCheck.js` - API service
- `OrderForm25.js` - Invoice header clickable

---

### 2️⃣ **INVOICE HEADER - CLICKABLE EDIT**
**Commit:** `f4979af8`

✅ **Funkce:**
- **FAKTURA header** (s číslem VS) je nyní clickable
- Klik → navigace do `/invoice-evidence` s `editInvoiceId` state
- Zachováno původní stylování (font-size, font-weight, letter-spacing)
- Pouze pro persisted faktury (ne temp-* IDs)
- Disabled stav pro neuložené faktury

📁 **Změněné soubory:**
- `OrderForm25.js` - Convert header na button
- `InvoiceEvidencePage.js` - Přijetí `editInvoiceId` z location state

---

### 3️⃣ **LP FULLTEXT SEARCH A FILTROVÁNÍ**
**Commit:** `1c1e0553`

✅ **Funkce:**
- **Fulltext search** LP:
  - Hledání v čísle LP, názvu, úseku, příkazci
  - Index na `nazev_lp`, `cislo_lp`, `nazev_usek`, `nazev_prikazce`
  - Optimalizované pro LIKE a FULLTEXT vyhledávání

- **Filtrování:**
  - Status filtr (aktivní/neaktivní)
  - Rozsah čerpání
  - Úsek/Příkazce
  - Datum vytvoření

- **LP Calculation Service:**
  - Auto-přepočet čerpání po každé faktury operaci
  - Započítání odborových faktur (pokud jsou)

📁 **Nové soubory:**
- `lpFulltextHandlers.php` - Fulltext search logika
- `lpFilterHandlers.php` - Filtrování query builder
- `test-fulltext-search.php` - Test fulltext vyhledávání
- `test-db-search.php` - Test DB search query

📁 **Změněné soubory:**
- `api.php` - Nové endpointy pro LP search
- `orderV3Handlers.php` - LP expand se filtrováním
- `LPCalculationService.php` - Auto-přepočet čerpání
- `LimitovanePrislibyManager.js` - UI manager pro LP

---

## 🗄️ DATABÁZOVÉ MIGRACE

### ✅ **MIGRACE #1: Věcná správnost - rozšíření na zamítnutí**
**Soubor:** `MIGRATION_VECNA_SPRAVNOST_ZAMITNUTI.sql`  
**Datum:** 2026-06-05  
**Priorita:** 🔴 KRITICKÉ

```sql
-- Rozšíření věcné správnosti na 3 stavy (neověřeno/potvrzeno/zamítnuté)
ALTER TABLE `25a_objednavky_faktury`
    MODIFY COLUMN `vecna_spravnost_potvrzeno` TINYINT(2) UNSIGNED NULL DEFAULT NULL
    COMMENT 'Stav VS: 0=neověřeno, 1=potvrzeno, 2=zamítnuto';
```

**Účel:** 
- Rozšíření na TINYINT(2) pro jistotu
- Podpora 3 stavů: NULL (neověřeno), 1 (potvrzeno), 2 (zamítnuté)
- Dokumentace změny ve sloupci komentářích

---

### ✅ **MIGRACE #2: Věcná správnost - důvod zamítnutí**
**Soubor:** `MIGRATION_VECNA_SPRAVNOST_DUVOD.sql`  
**Datum:** 2026-06-05  
**Priorita:** 🔴 KRITICKÉ

```sql
-- Přidání sloupce pro DŮVOD věcné správnosti
ALTER TABLE `25a_objednavky_faktury`
    ADD COLUMN `vecna_spravnost_duvod` TEXT NULL DEFAULT NULL
    COMMENT 'Důvod rozhodnutí VS (volitelný pro status 1, POVINNÝ pro status 2)'
    AFTER `vecna_spravnost_poznamka`;

-- Ověření:
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME = '25a_objednavky_faktury'
  AND COLUMN_NAME = 'vecna_spravnost_duvod';
```

**Účel:** 
- Oddělení důvodu od interní poznámky
- Povinné pole při zamítnutí faktury
- Zobrazení v tabulce s zkrácením a hover

---

### ✅ **MIGRACE #3: Email šablony - zamítnutí faktury**
**Soubor:** `SQL_INSERT_INVOICE_REJECTED_EMAIL_TEMPLATE_20260606.sql`  
**Datum:** 2026-06-06  
**Priorita:** 🟡 DOPORUČENO

```sql
-- Vložení šablony pro email - zamítnutí věcné správnosti
INSERT INTO `25_notifikace_sablony` 
  (`typ_notifikace`, `nazev_sablony`, `predmet_email`, `obsah_html`, `aktiv`, `dt_vytvoreni`)
VALUES
  (
    'invoice_rejected',
    'Faktury - Zamítnutí věcné správnosti',
    'Vaše faktury {objednavka_cislo} byly zamítnuty',
    '<html><body>...HTML obsah...</body></html>',
    1,
    NOW()
  );

-- Ověření:
SELECT * FROM 25_notifikace_sablony 
WHERE typ_notifikace = 'invoice_rejected';
```

**Účel:**
- Email šablona pro notifikaci o zamítnutí
- Automatické odeslání při zamítnutí faktury
- Customizovatelné proměnné: `{objednavka_cislo}`, `{faktura_cislo}`, `{vecna_spravnost_duvod}`

---

### ✅ **MIGRACE #4: LP Fulltext indexy**
**Soubor:** `SQL_LP_FULLTEXT_INDEXES_20260606.sql`  
**Datum:** 2026-06-06  
**Priorita:** 🟢 VOLITELNÉ (ale doporučeno pro výkon)

```sql
-- FULLTEXT index pro LP vyhledávání
ALTER TABLE `25_limitovane_prisliby`
  ADD FULLTEXT INDEX `ft_lp_full_search` 
    (`cislo_lp`, `nazev_lp`, `nazev_usek`, `nazev_prikazce`);

-- Ověření:
SHOW INDEXES FROM `25_limitovane_prisliby` WHERE Index_type = 'FULLTEXT';
```

**Účel:**
- Optimalizace vyhledávání LP (fulltext search)
- Index na: číslo LP, název, úsek, příkazce
- Doporučeno pro tabulky s >10k řádků

---

## 📦 API ENDPOINTY

### 🆕 **Nové endpointy**

#### 1. **LP Fulltext Search**
```
POST /api.eeo/limitovane-prisliby/search
Body: {
  "token": "...",
  "username": "...",
  "query": "text for search",
  "status_filter": "active|all",
  "limit": 50
}
Response: {
  "status": "success",
  "data": [{id, cislo_lp, nazev_lp, nazev_usek, ...}],
  "count": 25
}
```

#### 2. **LP Filtrování**
```
POST /api.eeo/limitovane-prisliby/filter
Body: {
  "token": "...",
  "username": "...",
  "filters": {
    "status": "active",
    "usek_id": 123,
    "prikazce_id": 456,
    "date_from": "2026-01-01",
    "date_to": "2026-12-31"
  }
}
Response: {
  "status": "success",
  "data": [...],
  "total_count": 100
}
```

### ✅ **Aktualizované endpointy**

#### 1. **Invoice Update - Věcná správnost**
```
POST /api.eeo/invoice/update
Body: {
  "token": "...",
  "id": 123,
  "vecna_spravnost_potvrzeno": 2,  // 2 = zamítnuté
  "vecna_spravnost_duvod": "Chybí detailní specifikace...",
  "vecna_spravnost_poznamka": "Interní poznámka (volitelná)"
}
```

#### 2. **Invoice Reverse - Zrušení zamítnutí**
```
POST /api.eeo/invoice/reverse
Body: {
  "token": "...",
  "id": 123,
  "action": "reset_rejection"  // ZAMITNUTO -> ZAEVIDOVANA
}
```

---

## 📊 FRONTEND KOMPONENTY

### 🆕 **Nové komponenty**
- `LPBadge.js` - Zobrazení LP s počtem faktur
- `LPPreview.js` - Rozbalovací detail LP čerpání
- `LPFilterPanel.js` - Filtrační panel pro LP vyhledávání

### ✅ **Aktualizované komponenty**
- `LimitovanePrislibyManager.js` - Fulltext search + filtrování
- `InvoiceEvidencePage.js` - Zamítnutí faktury UI + tooltips
- `Invoices25List.js` - Filtr "Zamítnuté" + reverse akce
- `OrderForm25.js` - Invoice header clickable

---

## 🔴 DATABÁZOVÉ ZMĚNY - KRITICKÉ

Všechny migrace **MUSÍ** být v tomto pořadí!

### **POŘADÍ MIGRAC:**
1. ✅ `MIGRATION_VECNA_SPRAVNOST_DUVOD.sql` - Přidání sloupce
2. ✅ `SQL_ADD_invoice_material_check_rejected_template.sql` - Email šablona
3. (Volitelné) FULLTEXT index na LP tabulku

---

## ✅ DEPLOYMENT CHECKLIST

### 🔴 **PŘED NASAZENÍM (DEV → PROD)**

#### 1. **Git kontrola**
```bash
cd /var/www/erdms-dev
git status              # Měl by být čistý
git log --oneline -5   # Ověřit poslední commit 1c1e0553
```

- [ ] Všechny změny commitnuty
- [ ] Branch pushnutý do `feature/v3-development`
- [ ] Ověřen poslední commit: `1c1e0553`

#### 2. **PHP Syntax Check (DEV)**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib

php -l invoiceHandlers.php
php -l invoiceCheckHandlers.php
php -l orderV2Endpoints.php
php -l orderV2InvoiceHandlers.php
php -l lpFulltextHandlers.php
php -l lpFilterHandlers.php
php -l orderV3Handlers.php
```

- [ ] Všechny soubory prošly PHP syntax check
- [ ] Žádné Parse errors

#### 3. **Frontend Build Check (DEV)**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client

# Build DEV (na test)
npm run build:dev:explicit 2>&1 | grep -i "error\|warning" | head -20

# Pokud vše OK:
npm run build:prod
```

- [ ] Build:dev bez chyb
- [ ] Build:prod bez chyb
- [ ] Výstup v `/var/www/erdms-dev/apps/eeo-v2/client/build/`

---

### 🔴 **PRODUKČNÍ NASAZENÍ** ⚠️ VYŽADUJE POTVRZENÍ!

#### 4. **Databázové migrace (PRODUKCE)**

⚠️ **ZEPTAT SE: "Mám spustit DB migrace v produkci?"**

```bash
# Připojení k produkční DB
mysql -h 10.3.172.11 -u erdms_user -p

# PRODUKČNÍ databáze
USE eeo2025;

-- MIGRACE #1: Věcná správnost - rozšíření na zamítnutí
SOURCE /var/www/erdms-platform/apps/eeo-v2/_sql/MIGRATION_VECNA_SPRAVNOST_ZAMITNUTI.sql;

-- MIGRACE #2: Věcná správnost - důvod
SOURCE /var/www/erdms-platform/apps/eeo-v2/_sql/MIGRATION_VECNA_SPRAVNOST_DUVOD.sql;

-- MIGRACE #3: Email šablony - zamítnutí
SOURCE /var/www/erdms-platform/apps/eeo-v2/_sql/SQL_INSERT_INVOICE_REJECTED_EMAIL_TEMPLATE_20260606.sql;

-- MIGRACE #4 (VOLITELNÉ - doporučeno): LP Fulltext indexy
SOURCE /var/www/erdms-platform/apps/eeo-v2/_sql/SQL_LP_FULLTEXT_INDEXES_20260606.sql;

-- OVĚŘENÍ
DESCRIBE 25a_objednavky_faktury;
-- Měl by obsahovat: vecna_spravnost_duvod TEXT NULL

SELECT * FROM 25_notifikace_sablony WHERE typ_notifikace = 'invoice_rejected';
-- Měla by existovat nová šablona

SHOW INDEXES FROM 25_limitovane_prisliby WHERE Index_type = 'FULLTEXT';
-- Měly by existovat FULLTEXT indexy (pokud MIGRACE #4 byla spuštěna)
```

- [ ] MIGRACE #1 provedena bez chyb
- [ ] MIGRACE #2 provedena bez chyb
- [ ] MIGRACE #3 provedena bez chyb
- [ ] MIGRACE #4 (volitelná) provedena bez chyb
- [ ] Sloupce ověřeny
- [ ] Email šablona vložena
- [ ] FULLTEXT indexy ověřeny (pokud instalovány)

#### 5. **Backup produkce (POVINNÉ!)**
```bash
# Backup API legacy
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy
tar -czf ~/backup-api-legacy-$(date +%Y%m%d-%H%M%S).tar.gz api.eeo/

# Backup frontendu
tar -czf ~/backup-eeo-v2-build-$(date +%Y%m%d-%H%M%S).tar.gz \
  /var/www/erdms-platform/apps/eeo-v2/client/build/

# Backup DB
mysqldump -h 10.3.172.11 -u erdms_user -p eeo2025 > ~/backup-eeo2025-$(date +%Y%m%d-%H%M%S).sql
```

- [ ] Backup API legacy vytvořen
- [ ] Backup frontendu vytvořen
- [ ] Backup DB vytvořen

#### 6. **Backend - rsync API Legacy**
```bash
# ⚠️ BEZ --delete!
rsync -av --progress \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/ \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/ \
  --exclude='.env' \
  --exclude='*.log' \
  --exclude='.git'

# Syntax check produkce
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib
php -l invoiceHandlers.php
php -l orderV2Endpoints.php
php -l lpFulltextHandlers.php
php -l lpFilterHandlers.php

# Reload Apache
systemctl reload apache2
```

- [ ] Rsync bez chyb
- [ ] Syntax check OK na produkci
- [ ] Apache reloaded

#### 7. **Frontend - Deploy produkce**
```bash
# Copy build z DEV
rsync -av --progress \
  /var/www/erdms-dev/apps/eeo-v2/client/build/ \
  /var/www/erdms-platform/apps/eeo-v2/client/build/

# Ověření
ls -lah /var/www/erdms-platform/apps/eeo-v2/client/build/index.html
```

- [ ] Frontend zkopírován
- [ ] index.html existuje

#### 8. **Produkční ověření (HTTP)**

⚠️ **Bez přístupu k produkčním HTTP testům**

```bash
# Jen kontrola logů
tail -50 /var/www/erdms-dev/logs/php-error.log | grep -i "invoice\|lp\|search"
```

- [ ] PHP error log bez chyb
- [ ] Žádné SQLSTATE chyby
- [ ] Žádné "Undefined" chyby

---

## 🐛 TROUBLESHOOTING

### ❌ Chyba: `SQLSTATE[42S22]: Column not found 'vecna_spravnost_duvod'`
**Řešení:** MIGRACE #1 nebyla spuštěna na produkci
```bash
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < /var/www/erdms-platform/apps/eeo-v2/_sql/MIGRATION_VECNA_SPRAVNOST_DUVOD.sql
```

### ❌ Chyba: LP fulltext search nefunguje
**Řešení:** Chybí lpFulltextHandlers.php na produkci
```bash
ls -la /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/lpFulltextHandlers.php
```

### ❌ Chyba: Invoice header není clickable
**Řešení:** Frontend build není deployován
```bash
tail -f /var/www/erdms-platform/logs/apache2/error.log | grep "invoice"
```

---

## 📝 POST-DEPLOYMENT VERIFICATION

```bash
# 1. Check PHP error log
tail -100 /var/www/erdms-dev/logs/php-error.log

# 2. Test DB connection
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT COUNT(*) FROM 25a_objednavky_faktury;"

# 3. Test LP fulltext
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT COUNT(*) FROM 25_limitovane_prisliby WHERE MATCH(cislo_lp) AGAINST('test');"

# 4. Check email templates
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT * FROM 25_sablony_notifikaci WHERE typ_notifikace = 'invoice_rejected';"
```

---

## 📊 SOUHRN ZMĚN

| Komponenta | Počet souborů | Typ | Status |
|-----------|------------|------|--------|
| Backend API | 8 | Změněno/Nové | ✅ |
| Frontend | 5 | Změněno | ✅ |
| Database | 4 SQL | Migrace | ✅ |
| Testy | 2 | Nové PHP testy | ✅ |
| **CELKEM** | **19** | **+1785 řádků** | **READY** |

---

## 📝 SEZNAM SQL MIGRAC

1. ✅ `MIGRATION_VECNA_SPRAVNOST_ZAMITNUTI.sql` - Rozšíření na zamítnutí
2. ✅ `MIGRATION_VECNA_SPRAVNOST_DUVOD.sql` - Sloupec důvodu
3. ✅ `SQL_INSERT_INVOICE_REJECTED_EMAIL_TEMPLATE_20260606.sql` - Email šablona
4. 🟢 `SQL_LP_FULLTEXT_INDEXES_20260606.sql` - LP fulltext indexy (volitelné)

---

## 🔗 REFERENCE

- **Branch:** `feature/v3-development`
- **Last commit:** `1c1e0553`
- **DEV log:** `/var/www/erdms-dev/logs/php-error.log`
- **Prod API:** `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/`
- **Frontend:** `/var/www/erdms-platform/apps/eeo-v2/client/build/`

---

**🚀 PŘIPRAVENO K NASAZENÍ!**
