# 🚀 DEPLOYMENT PLAN - 5. - 6. června 2026

## 📋 Přehled změn
**Datum přípravy:** 5. - 6. iunie 2026  
**Datum nasazení:** 6. június 2026+  
**Verze:** v2.60  
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

### 🔴 **HOTFIX #5: Chybějící notifikační event typy (KRITICKÉ!)**
**Soubor:** [`HOTFIX_NOTIFICATION_EVENT_TYPES_20260606.sql`](../_sql/HOTFIX_NOTIFICATION_EVENT_TYPES_20260606.sql)  
**Datum:** 2026-06-06  
**Priorita:** 🔴 KRITICKÉ (MUSÍ být PRVNÍ v pořadí migrac!)  
**Status:** ✅ HOTFIX aplikován do DB eeo2025-dev

```sql
-- ============================================================================
-- HOTFIX: Doplnění chybějících event typů v notifikačním systému
-- 
-- PROBLÉM: Org hierarchie nemůže najít recipients pro 4 event typy:
--   - ORDER_INVOICE_PENDING (mapuje se na order_status_faktura_ceka)
--   - ORDER_INVOICE_APPROVED (mapuje se na order_status_faktura_schvalena)
--   - ORDER_INVOICE_PAID (mapuje se na order_status_faktura_uhrazena)
--   - INVOICE_MATERIAL_CHECK_REJECTED (mapuje se na order_status_kontrola_zamitnuta)
--
-- DOPAD: RH ADMIN nedostane notifikaci když je faktura zamítnutá!
--   → Notifikace se zavolá ✓, ale org hierarchie najde 0 recipients ✗
--   → Debug log: "NO RECIPIENTS FOUND" ✗
--
-- ŘEŠENÍ: Přidat chybějící event typy do 25_notifikace_typy_udalosti
--   1. Org hierarchie najde EDGES pro tyto eventy ✓
--   2. Příjemci se správně identifikují ✓
--   3. Notifikace se odesílají ✓
--
-- TESTOVÁNÍ: Po vložení spustit test:
--   SELECT COUNT(*) FROM 25_notifikace_typy_udalosti 
--   WHERE kod IN ('ORDER_INVOICE_PENDING', 'ORDER_INVOICE_APPROVED', 
--                 'ORDER_INVOICE_PAID', 'INVOICE_MATERIAL_CHECK_REJECTED');
--   Výsledek MUSÍ být: 4 ✓
-- ============================================================================

INSERT INTO `25_notifikace_typy_udalosti` 
  (`kod`, `nazev`, `kategorie`, `aktivni`) 
VALUES
  (
    'ORDER_INVOICE_PENDING',
    'Objednávka čeká na fakturu',
    'invoices',
    1
  ),
  (
    'ORDER_INVOICE_APPROVED',
    'Faktura schválena',
    'invoices',
    1
  ),
  (
    'ORDER_INVOICE_PAID',
    'Faktura uhrazena',
    'invoices',
    1
  ),
  (
    'INVOICE_MATERIAL_CHECK_REJECTED',
    'Věcná správnost zamítnuta',
    'invoices',
    1
  );

-- ✅ OVĚŘENÍ:
-- Mělo se vložit přesně 4 event typy
SELECT 
  id, kod, nazev, kategorie, aktivni 
FROM `25_notifikace_typy_udalosti`
WHERE kod IN (
  'ORDER_INVOICE_PENDING', 
  'ORDER_INVOICE_APPROVED', 
  'ORDER_INVOICE_PAID', 
  'INVOICE_MATERIAL_CHECK_REJECTED'
)
ORDER BY kod;
-- 
-- OČEKÁVANÝ VÝSLEDEK:
-- | ID  | KOD                           | NAZEV                          | KATEGORIE | AKTIVNI |
-- |----|-------------------------------|--------------------------------|-----------|---------|
-- | 32 | INVOICE_MATERIAL_CHECK_REJECTED | Věcná správnost zamítnuta      | invoices  | 1       |
-- | 33 | ORDER_INVOICE_APPROVED        | Faktura schválena              | invoices  | 1       |
-- | 34 | ORDER_INVOICE_PAID            | Faktura uhrazena               | invoices  | 1       |
-- | 32 | ORDER_INVOICE_PENDING         | Objednávka čeká na fakturu     | invoices  | 1       |
```

**Účel:**
- Doplnění 4 chybějících event typů do DB
- Org hierarchie pak správně najde EDGES pro tyto notifikační eventy
- RH ADMIN začne dostávat notifikace o zamítnutí faktury ✓
- Mapování v `notificationHandlers.php` (řádky 108-118) začne fungovat

**Kdy se to objevilo:**
- Při testování zamítnutí faktury (věcná správnost)
- RH ADMIN nedostala notifikaci o zamítnutí
- Debug log: `NO RECIPIENTS FOUND` pro `INVOICE_MATERIAL_CHECK_REJECTED`
- Příčina: Event typ neexistoval v DB → org hierarchie nemohla najít recipients

**AKTUALIZACE ŠABLON:**
Zároveň byla aktualizována šablona `order_status_kontrola_zamitnuta` (ID:21) aby obsahovala placeholder pro důvod:

```diff
- In-app zpráva (STARÝ): "Kontrola kvality objednávky {order_number} byla zamítnuta - nutné úpravy"
+ In-app zpráva (NOVÝ): "Kontrola kvality objednávky {order_number} byla zamítnuta - nutné úpravy.\n\nDůvod: {vecna_spravnost_duvod}"

- Email subject (STARÝ): "❌ Kontrola objednávky {order_number} byla zamítnuta"
+ Email subject (NOVÝ): "❌ Kontrola objednávky {order_number} byla zamítnuta - {vecna_spravnost_duvod}"

+ Email body (NOVÝ): Přidána stylovaná sekce na konci HTML emailu
  ❌ Důvod zamítnutí:
  [{vecna_spravnost_duvod}] ← v červeném rámci
```

**Pořadí nasazení:**
1. ⭐ **MUSÍ být PRVNÍ** (před ostatními migracemi)
2. Pak ostatní SQL migrace
3. Pak build + deploy

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

### **POŘADÍ MIGRAC (NEJDŮLEŽITĚJŠÍ!):**
1. ⭐ **HOTFIX_NOTIFICATION_EVENT_TYPES_20260606.sql** - Přidání 4 event typů (MUSÍ PRVNÍ!)
2. ✅ `MIGRATION_VECNA_SPRAVNOST_ZAMITNUTI.sql` - Rozšíření vecna_spravnost na 3 stavy
3. ✅ `MIGRATION_VECNA_SPRAVNOST_DUVOD.sql` - Přidání sloupce pro důvod zamítnutí
4. ✅ `SQL_INSERT_INVOICE_REJECTED_EMAIL_TEMPLATE_20260606.sql` - Email šablona pro zamítnutí
5. (Volitelné) `SQL_LP_FULLTEXT_INDEXES_20260606.sql` - FULLTEXT index na LP tabulku

**DŮVOD:** HOTFIX MUSÍ být PRVNÍ aby org hierarchie mohla správně mapovat notifikace!

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

-- ⭐ HOTFIX #0 (MUSÍ BÝT PRVNÍ!): Chybějící event typy
--    DŮVOD: Org hierarchie bez těchto typů nemůže najít recipients pro notifikace!
--    DOPAD: RH ADMIN nedostane notifikaci o zamítnutí faktury
SOURCE /var/www/erdms-platform/apps/eeo-v2/_sql/HOTFIX_NOTIFICATION_EVENT_TYPES_20260606.sql;

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

---

---

# 🔴 HOTFIX: EMAIL NOTIFIKACE - METADATA ZAMÍTNUTÍ (2026-06-06)

**Status:** ✅ HOTOVO - Připraveno k nasazení
**DEV Testing:** ✅ KOMPLETNÍ (kód + šablona)
**Severity:** 🔴 CRITICAL - RH ADMIN nemá info KDO a KDY zamítl fakturu
**Release date:** 2026-06-06 (dnes)

---

## 🎯 PROBLÉM

RH ADMIN dostane email o zamítnutí faktury, ale chybí:
- ❌ **KDO to zamítl** (jméno uživatele)
- ❌ **KDY to zamítl** (datum + čas)
- ❌ **PROČ to zamítl** (důvod není ve správném formátu)
- ❌ **DODAVATEL** (místo organizace)
- ❌ Email má nákupné pomlčky "-----" místo stylování

**Řešení:** Kompletní redesign email šablony + backend naplnění placeholderů

---

## ✅ IMPLEMENTACE

### 1️⃣ **Backend Changes (PHP)** - Naplnění placeholderů

#### **File: notificationHandlers.php**
**Location:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`
**Function:** `loadUniversalPlaceholders()` (řádky ~4937-4963)
**Přidáno:**

```php
// ✅ action_user_name - Kdo provádí akci (zamítá/schvaluje)
$action_user_name = 'Neznámý';
if ($triggerUserId) {
    try {
        $stmt_user = $db->prepare("SELECT CONCAT(TRIM(CONCAT(COALESCE(titul_pred,''), ' ', COALESCE(jmeno,''), ' ', COALESCE(prijmeni,''), ' ', COALESCE(titul_za,'')))) as full_name FROM " . TBL_UZIVATELE . " WHERE id = ?");
        $stmt_user->execute([$triggerUserId]);
        $user_row = $stmt_user->fetch(PDO::FETCH_ASSOC);
        if ($user_row && !empty(trim($user_row['full_name']))) {
            $action_user_name = trim($user_row['full_name']);
        }
    } catch (Exception $e) {
        error_log("[loadUniversalPlaceholders] Error loading action user name: " . $e->getMessage());
    }
}

$placeholders['action_user_name'] = $action_user_name;        // ✅ Kdo provádí
$placeholders['trigger_user_name'] = $action_user_name;       // Alias
$placeholders['action_performed_by'] = $action_user_name;     // Alias

// ✅ dt_action_formatted - Čas provádění akce (česká timezone)
$placeholders['dt_action_formatted'] = TimezoneHelper::getCzechDateTime();
$placeholders['dt_action'] = $placeholders['dt_action_formatted'];

// ✅ vecna_spravnost_duvod - Důvod zamítnutí
if (isset($data['vecna_spravnost_poznamka'])) {
    $placeholders['vecna_spravnost_duvod'] = !empty($data['vecna_spravnost_poznamka']) ? $data['vecna_spravnost_poznamka'] : '-';
} else {
    $placeholders['vecna_spravnost_duvod'] = '-';
}
```

**Status:** ✅ Hotovo

---

#### **File: invoiceCheckHandlers.php**
**Location:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php`
**Function:** `handle_invoice_check_zamitnout()` (řádky ~323-324)
**Přidáno:**

```php
// ❌ ZAMÍTNUTO - poslat notifikaci s customními placeholders
$customPlaceholders = array('vecna_spravnost_duvod' => $vecna_spravnost_duvod ?: 'Neuvedeno');
triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REJECTED', $faktura_id, $token_data['id'], $customPlaceholders);
```

**Status:** ✅ Hotovo

---

### 2️⃣ **Database Changes (SQL)** - Email šablona

#### **Table: 25_notifikace_sablony (ID 21)**
**Template name:** `order_status_kontrola_zamitnuta` (Věcná správnost zamítnuta)
**Status:** ✅ KOMPLETNĚ REDESIGNOVÁN

**Změny:**

| Field | Old | New |
|-------|-----|-----|
| `app_nadpis` | Kontrola zamítnuta | **"Kontrola zamítnuta: {order_number}"** |
| `app_zprava` | Kontrola kvality objednávky byla zamítnuta - nutné úpravy | **"Kontrola kvality objednávky {order_number} byla zamítnuta - nutné úpravy.\n\nDůvod: {vecna_spravnost_duvod}"** |
| `email_predmet` | ❌ Kontrola objednávky byla zamítnuta | **"❌ Kontrola objednávky {order_number} byla zamítnuta - {vecna_spravnost_duvod}"** |
| `email_telo` | Pomlčky + bez stylování | **HTML s red gradient header + tabulka + reason section** |

**Email HTML struktura (nový):**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if gte mso 9]><xml>...(Outlook compat)...</xml><![endif]-->
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5;">
    <!-- Header - Red Gradient -->
    <div style="background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%); ...">
        <h1>❌ Věcná správnost faktury zamítnuta</h1>
    </div>
    
    <!-- Details Table -->
    <table>
        <tr><td><strong>Dodavatel</strong></td><td>{supplier_name}</td></tr>
        <tr><td><strong>Objednávka</strong></td><td>{order_number}</td></tr>
        <tr><td><strong>Zamítl</strong></td><td>{action_user_name}</td></tr>
        <tr><td><strong>Kdy</strong></td><td>{dt_action_formatted}</td></tr>
    </table>
    
    <!-- Reason Section - Red Box -->
    <div style="background: #ffe5e5; border: 2px solid #f44336; padding: 15px;">
        <h3>Důvod zamítnutí:</h3>
        <p>{vecna_spravnost_duvod}</p>
    </div>
    
    <!-- Footer -->
    <footer>© 2026 EEO V2 | Elektronická Evidence Objednávek</footer>
</body>
</html>
```

**SQL UPDATE:**
```sql
UPDATE `25_notifikace_sablony`
SET 
  `app_nadpis` = 'Kontrola zamítnuta: {order_number}',
  `app_zprava` = 'Kontrola kvality objednávky {order_number} byla zamítnuta - nutné úpravy.\n\nDůvod: {vecna_spravnost_duvod}',
  `email_predmet` = '❌ Kontrola objednávky {order_number} byla zamítnuta - {vecna_spravnost_duvod}',
  `email_telo` = '[NOVÝ KOMPLETNÍ HTML TEMPLATE S DETAILY A STYLOVÁNÍM]'
WHERE `id` = 21 AND `typ_notifikace` = 'order_status_kontrola_zamitnuta';
```

**Status:** ✅ Hotovo (13,623 bytes email_telo)

---

## 📦 DEPLOYMENT - HOTFIX

### **Pořadí nasazení (KRITICKÉ):**

#### **KROK 1️⃣ - Backend soubory** (MUSÍ být PRVNÍ)
```bash
# /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/

# Zkopíruj z DEV:
rsync -av --progress \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/

# Syntax check
php -l /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php
php -l /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php
```

**Status:** ⏳ Čeká na deployment

---

#### **KROK 2️⃣ - Database šablona** (DRUHÝ)
```bash
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
UPDATE \`25_notifikace_sablony\`
SET 
  \`app_nadpis\` = 'Kontrola zamítnuta: {order_number}',
  \`app_zprava\` = 'Kontrola kvality objednávky {order_number} byla zamítnuta - nutné úpravy.\\n\\nDůvod: {vecna_spravnost_duvod}',
  \`email_predmet\` = '❌ Kontrola objednávky {order_number} byla zamítnuta - {vecna_spravnost_duvod}',
  \`email_telo\` = '[NOVÝ HTML TEMPLATE]'
WHERE \`id\` = 21;
"

# Ověření
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
SELECT id, typ_notifikace, LENGTH(email_telo) FROM \`25_notifikace_sablony\` WHERE id = 21;
"
```

**Status:** ⏳ Čeká na deployment

---

#### **KROK 3️⃣ - Apache reload** (POSLEDNÍ)
```bash
systemctl reload apache2
```

**Status:** ⏳ Čeká na deployment

---

### **Pre-deployment checklist:**

- [ ] Backend soubory syncovány z DEV
- [ ] Syntax check OK ✓
- [ ] Backup starého notificationHandlers.php
- [ ] Backup starého invoiceCheckHandlers.php
- [ ] SQL UPDATE připraven
- [ ] Email šablona ověřena v DEV (LENGTH > 10000 bytes)
- [ ] Apache ready pro reload

---

## ✅ VERIFICATION (Po nasazení)

### **1. Syntax check**
```bash
php -l /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php
php -l /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php
```
✅ Musí vrátit: `No syntax errors detected`

---

### **2. Database ověření**
```bash
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
SELECT id, typ_notifikace, LENGTH(email_telo) as email_telo_size 
FROM \`25_notifikace_sablony\` WHERE id = 21;
"
```
✅ Musí vrátit: `| 21 | order_status_kontrola_zamitnuta | 13623 |`

---

### **3. Placeholder check**
```bash
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
SELECT 
  INSTR(email_telo, '{supplier_name}') as has_supplier,
  INSTR(email_telo, '{action_user_name}') as has_action_user,
  INSTR(email_telo, '{dt_action_formatted}') as has_dt_action,
  INSTR(email_telo, '{vecna_spravnost_duvod}') as has_reason
FROM \`25_notifikace_sablony\` WHERE id = 21;
"
```
✅ Musí vrátit: `| has_supplier=1 | has_action_user=1 | has_dt_action=1 | has_reason=1 |`

---

### **4. PHP error log check**
```bash
tail -50 /var/www/erdms-dev/logs/php-error.log | grep -i "notification\|email\|invoice"
```
✅ Musí být: Žádné chyby

---

## 🧪 END-TO-END TEST (Doporučeno)

1. Přihlásit se jako RH ADMIN
2. Vytvořit fakturu (+ objednávka)
3. Spustit věcnou správnost - schválení ✅
4. Spustit věcnou správnost - zamítnutí ❌
5. Zadat důvod: "Test důvod zamítnutí faktury 2026-06-06"
6. ✅ Ověřit e-mail:
   - Subject: `❌ Kontrola objednávky XXX byla zamítnuta - Test důvod...`
   - Body: Red header + tabulka s Dodavatel/Zamítl/Kdy + reason section
   - Všechny placeholdery jsou nahrazeny správnými hodnotami
7. ✅ Ověřit in-app notifikaci:
   - Text: `Kontrola kvality objednávky XXX byla zamítnuta - nutné úpravy. Důvod: Test důvod zamítnutí faktury 2026-06-06`

---

## 📝 PROBLÉM → ŘEŠENÍ MAPOVÁNÍ

| Problém | Řešení | Status |
|---------|--------|--------|
| ❌ KDO zamítl | Backend: action_user_name z TBL_UZIVATELE | ✅ |
| ❌ KDY zamítl | Backend: dt_action_formatted z TimezoneHelper | ✅ |
| ❌ PROČ zamítl | Backend: vecna_spravnost_duvod z payload | ✅ |
| ❌ DODAVATEL chybí | Email šablona: supplier_name místo organizace | ✅ |
| ❌ Pomlčky v emailu | Email šablona: HTML tabulka + stylovaná sekce | ✅ |

---

## 🔗 SOUBORY

**DEV (hotová implementace):**
- [notificationHandlers.php](../api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php) - Lines 4953-4981 (aliasy + dt_action_formatted)
- [invoiceCheckHandlers.php](../api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php) - Lines 323-330 (customPlaceholders s všemi aliasy)

**Database:**
- Table: `25_notifikace_sablony` (ID 137 - `INVOICE_MATERIAL_CHECK_REJECTED`) - **10,816 bytes email_telo (v3 - s CTA tlačítkem)**
- Starší ID 21: `order_status_kontrola_zamitnuta` - NEPOUŽÍVANÁ

---

# 📋 FINÁLNÍ HOTFIX - NOTIFIKACE ZAMÍTNUTÍ FAKTURY (2026-06-06 FINAL)

**Status:** ✅ HOTOVO V DEV - Připraveno k nasazení
**DEV Testing:** ✅ KOMPLETNÍ (kód + šablona ověřeny)
**Severity:** 🔴 CRITICAL 
**Release:** 2026-06-06

---

## 🔍 CO BYLO OPRAVENO

### KRITICKÝ OBJEV: Šablona ID 21 vs ID 137
Emailové notifikace používaly **šablonu ID 137** (`INVOICE_MATERIAL_CHECK_REJECTED`), NE ID 21!
- ❌ ID 21: `order_status_kontrola_zamitnuta` - NEPOUŽÍVANÁ pro email
- ✅ ID 137: `INVOICE_MATERIAL_CHECK_REJECTED` - SKUTEČNÁ šablona
- ❌ ID 137 měla Handlebars `{{#if}}` syntax (nepodporované → pomlčky)
- ❌ Placeholdery nebyly plněny (rejection_reason, organization_name, rejected_by_name)

---

## ✅ IMPLEMENTOVANÉ OPRAVY

### 1️⃣ **Backend placeholdery** - `notificationHandlers.php` (lines 4953-4981)

**Přidány aliasy pro všechny variace placeholderů:**

```php
// Kdo provádí akci (zamítá/schvaluje)
$placeholders['action_user_name'] = $action_user_name;
$placeholders['trigger_user_name'] = $action_user_name;
$placeholders['rejected_by_name'] = $action_user_name;      // ✅ Pro šablonu 137
$placeholders['approved_by_name'] = $action_user_name;      // ✅ Pro schválení

// Čas akce v české timezone
$placeholders['dt_action_formatted'] = TimezoneHelper::getCzechDateTime();
$placeholders['rejected_at'] = $placeholders['dt_action_formatted'];  // ✅ Pro šablonu
$placeholders['approved_at'] = $placeholders['dt_action_formatted'];

// Důvod - čte se z NOVÉHO DB sloupce vecna_spravnost_duvod (s fallbackem)
$duvod = $data['vecna_spravnost_duvod'] ?: $data['vecna_spravnost_poznamka'] ?: '-';
$placeholders['vecna_spravnost_duvod'] = $duvod;
$placeholders['rejection_reason'] = $duvod;      // ✅ Pro šablonu 137
$placeholders['reason'] = $duvod;

// Dodavatel = Organization (alias)
$placeholders['organization_name'] = $placeholders['supplier_name'] ?? '-';

// Detail URL pro CTA
$placeholders['detail_url'] = /* URL na invoice-evidence */;
```

**Bod 2 - customPlaceholders** - `invoiceCheckHandlers.php` (lines 323-330)

```php
$reason = $vecna_spravnost_duvod ?: 'Neuvedeno';
$customPlaceholders = array(
    'vecna_spravnost_duvod' => $reason,
    'rejection_reason'      => $reason,  // ✅ Alias pro šablonu 137
    'reason'                => $reason,  // ✅ Univerzální alias
);
triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REJECTED', $faktura_id, $token_data['id'], $customPlaceholders);
```

---

### 2️⃣ **Email šablona ID 137** - Kompletní redesign

**Změny (FINÁLNÍ v3):**
- ❌ Odebráno: Handlebars `{{#if}}` syntax
- ✅ Přidáno: Čisté placeholdery bez podmínek
- ✅ Přidáno: Info sekce o automatické generaci
- ✅ Přidáno: CTA tlačítko "✏️ Upravit fakturu" s Outlook VML fallback
- ✅ Odebráno: ❌ kříž z headeru (ponechán jen v subject)
- ✅ Patička: `© 2026 EEO V2 | Elektronická Evidence Objednávek`

**HTML struktura (10,816 bytes - v3 s CTA):**
```html
<!-- Header - Red -->
❌ Věcná správnost faktury zamítnuta

<!-- Main message -->
Věcná správnost faktury {{invoice_number}} byla zamítnuta kontrolorem.

<!-- Reason section (červené pole) -->
📌 Důvod zamítnutí:
{{rejection_reason}}

<!-- Details table -->
Dodavatel:      {{supplier_name}}
Objednávka:     {{order_number}}
Částka faktury: {{invoice_amount}}
Zamítl:         {{action_user_name}}
Datum a čas:    {{dt_action_formatted}}

<!-- Yellow warning -->
⚠️ Další kroky:
Faktura byla vrácena k dořešení...

<!-- CTA Button (NOVÉ) -->
✏️ Upravit fakturu → {{detail_url}}
   (Outlook-compatible VML + HTML fallback)

<!-- Info text -->
Tento e-mail byl automaticky vygenerován systémem EEO v2.
Po opravě prosím odešlete fakturu znovu ke kontrole věcné správnosti.

<!-- Footer -->
© 2026 EEO V2 | Elektronická Evidence Objednávek
```

**Detail URL placeholder:**
- `{{detail_url}}` se generuje z `$_ENV['FRONTEND_BASE_URL']` + `/invoice-evidence?edit={invoiceId}`
- DEV: `https://erdms.zachranka.cz/dev/eeo-v2/invoice-evidence?edit=2490`
- PROD: `https://erdms.zachranka.cz/eeo-v2/invoice-evidence?edit=2490`
- ✅ **PARAMETR:** `edit=` (NE `editInvoiceId=`)
- ✅ Nová velikost: **10,812 bytes** (v3 - bez ❌ v headeru)

**Placeholdery v šabloně (všechny teď podporovány):**
- `{{invoice_number}}` ✅
- `{{rejection_reason}}` ✅
- `{{supplier_name}}` ✅
- `{{order_number}}` ✅
- `{{invoice_amount}}` ✅
- `{{action_user_name}}` ✅
- `{{dt_action_formatted}}` ✅
- `{{detail_url}}` ✅ (CTA tlačítko - generuje se z `FRONTEND_BASE_URL` env)

---

## 📦 DEPLOYMENT KROKY

### **KROK 1 - Backend soubory** (MUSÍ být první)
```bash
rsync -av --progress \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/

# Syntax check
php -l /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php
php -l /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php
```
✅ **Status:** ✅ Hotovo v DEV (syntax check OK)

---

### **KROK 2 - Database šablona** (ID 137)
```bash
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
UPDATE 25_notifikace_sablony
SET 
  app_nadpis = 'Věcná správnost zamítnuta: {{invoice_number}}',
  app_zprava = 'Věcná správnost faktury {{invoice_number}} byla zamítnuta kontrolorem {{action_user_name}} dne {{dt_action_formatted}}.\n\nDůvod: {{rejection_reason}}',
  email_predmet = '❌ Věcná správnost faktury {{invoice_number}} byla zamítnuta - {{rejection_reason}}',
  email_telo = '[NOVÝ HTML TEMPLATE - 10,816 bytes - v3 s CTA tlačítkem]'
WHERE id = 137;
"
```

**⚠️ DŮLEŽITÉ: Ověřit FRONTEND_BASE_URL v produkčním .env**
```bash
grep "FRONTEND_BASE_URL" /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
# Musí být: FRONTEND_BASE_URL=https://erdms.zachranka.cz/eeo-v2 (bez /dev)
```
✅ **Status:** ✅ Hotovo v DEV

---

### **KROK 3 - Verification**
```bash
# Kontrola šablony
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
SELECT id, LENGTH(email_telo) as bytes FROM 25_notifikace_sablony WHERE id = 137;
"
# Očekáváno: 10816 bytes (v3 s CTA tlačítkem)

# Kontrola placeholderů
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
SELECT email_telo FROM 25_notifikace_sablony WHERE id = 137
" --raw --batch | grep -oE '{{[^}]+}}' | sort -u
# Očekáváno: {{action_user_name}}, {{dt_action_formatted}}, {{invoice_amount}}, {{invoice_number}}, {{order_number}}, {{rejection_reason}}, {{supplier_name}}
```
✅ **Status:** ✅ Ověřeno v DEV

---

### **KROK 4 - Apache reload**
```bash
systemctl reload apache2
```
✅ **Status:** ✅ Hotovo v DEV

---

## 🧪 TESTOVÁNÍ V DEV

**Scénář: Zamítnutí faktury s důvodem**

1. Vytvořit objednávku (Dodavatel: Test GmbH, Číslo: TEST-2026-001)
2. Přidat fakturu (Číslo: FA-123456, Částka: 1000 Kč)
3. Spustit Věcnou správnost → Zamítnutí
4. Zadat důvod: "Chybí detailní specifikace položek"
5. **Ověřit Email:**
   - Subject: `❌ Věcná správnost faktury FA-123456 byla zamítnuta - Chybí detailní specifikace položek` ✅
   - From: `noreply@erdms.cz`
   - To: `RH ADMIN email`
   - Body obsahuje:
     - Header: `❌ Věcná správnost faktury zamítnuta` (red background) ✅
     - Zpráva: `Věcná správnost faktury FA-123456 byla zamítnuta kontrolorem.` ✅
     - Důvod: `Chybí detailní specifikace položek` (v červeném poli) ✅
     - Dodavatel: `Test GmbH` ✅
     - Objednávka: `TEST-2026-001` ✅
     - Zamítl: `[Jméno uživatele]` ✅
     - Datum: `[Aktuální čas v CZ timezone]` ✅
     - Zpráva: `Tento e-mail byl automaticky vygenerován...` ✅
     - Patička: `© 2026 EEO V2 | Elektronická Evidence Objednávek` ✅
6. **Ověřit In-App notifikaci:**
   - Má důvod: `Důvod: Chybí detailní specifikace položek` ✅

---

## ✅ FINAL CHECKLIST

- [x] Backend PHP soubory syncovány (notificationHandlers.php, invoiceCheckHandlers.php)
- [x] Syntax check OK na DEV
- [x] Database: šablona ID 137 aktualizována (10,812 bytes v3 - bez ❌ v headeru, s CTA)
- [x] Všechny placeholdery přítomny: invoice_number, supplier_name, order_number, invoice_amount, action_user_name, dt_action_formatted, rejection_reason, detail_url
- [x] Handlebars {{#if}} jsou odstraněny - pouze čisté placeholdery
- [x] CTA tlačítko "Upravit fakturu" je přítomno + Outlook VML fallback
- [x] Detail URL parametr: `?edit=` (ne editInvoiceId)
- [x] FRONTEND_BASE_URL je v DEV .env
- [x] Automatická zpráva je přítomna: "Tento e-mail byl automaticky vygenerován..."
- [x] Patička: "© 2026 EEO V2 | Elektronická Evidence Objednávek"
- [x] Kříž ❌ je jen v email subject, nikoli v headeru HTML
- [x] Apache reload na DEV
- [x] Git commit s finálními změnami URL
- [ ] Apache reload na produkci
- [ ] Test: Zamítnutí faktury s kontrolou emailu
- [ ] Žádné chyby v PHP error logu

---

## 🎯 HOTFIX VERZE V3 - FINÁLNÍ STAV

**Email při zamítnutí faktury (RH ADMIN dostane):**
```
Subject: ❌ Věcná správnost faktury #123 byla zamítnuta - Chybí specifikace
────────────────────────────────────────────────────────────────

      Věcná správnost faktury zamítnuta

Věcná správnost faktury #123 byla zamítnuta kontrolorem.

📌 Důvod zamítnutí:
┌─────────────────────────────────┐
│ Chybí detailní specifikace      │
└─────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Dodavatel:     ABC s.r.o.              │
│ Objednávka:    OBJ-2026-001            │
│ Částka:        50,000 Kč               │
│ Zamítl:        Jan Novák               │
│ Datum a čas:   6.6.2026 14:30          │
└─────────────────────────────────────────┘

⚠️ Další kroky:
Faktura byla vrácena k dořešení. Prosím, upravte fakturu
podle důvodu zamítnutí...

                  [✏️ Upravit fakturu]

Tento e-mail byl automaticky vygenerován systémem EEO v2.
────────────────────────────────────────────────────────────────
© 2026 EEO V2 | Elektronická Evidence Objednávek
```

**Složení emailu:**
- ✅ Kříž ❌ jen v subject (pro prioritu)
- ✅ Header bez kříže (profesionální vzhled)
- ✅ Detailní tabulka s VŠEMI daty (dodavatel, objednávka, čas, kdo)
- ✅ Důvod v červeném poli (viditelnost)
- ✅ CTA tlačítko "Upravit fakturu" (přímý odkaz)
- ✅ Automatická zpráva + patička

---

## 📝 SHRNUTÍ ZMĚN V JEDNOM ŘÁDKU

**ID 137 email notifikace pro zamítnutí VS faktury: od "pomlčky & bez dat" → "profesionální email se všemi detaily + CTA"**

**Testing:**
- Manual test v DEV: Invoice zamítnutí + email check

---

## 📊 IMPACT

- **Users:** RH ADMIN, Invoice Controllers
- **Frequency:** Při každém zamítnutí faktury
- **Risk:** 🟢 NÍZKÉ (pouze display změny, bez SQL struktury)
- **Rollback:** Snadno (vrátit staré soubory + SQL UPDATE)

---
- **Prod API:** `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/`
- **Frontend:** `/var/www/erdms-platform/apps/eeo-v2/client/build/`

---

**🚀 PŘIPRAVENO K NASAZENÍ!**
