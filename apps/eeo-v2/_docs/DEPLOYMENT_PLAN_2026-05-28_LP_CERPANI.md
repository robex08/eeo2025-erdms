# 🚀 DEPLOYMENT PLAN - 28. května 2026

## 📋 Přehled změn
**Datum přípravy:** 27. května 2026 (večer)  
**Datum nasazení:** 28. května 2026  
**Verze:** v2.57  
**Branch:** `feature/v3-development`  
**Poslední commit:** `7e1d6c86` - LP FAKTURY: Auto změna stavu faktury při potvrzení/zrušení věcné správnosti

---

## 🎯 Klíčové funkce a změny

### 1️⃣ **LP ČERPÁNÍ - AUTOMATICKÝ PŘEPOČET**
**Commit:** `8ce6c186`

✅ **Funkce:**
- Automatický přepočet LP čerpání po VŠECH operacích s fakturami:
  - ✅ Vytvoření faktury (create)
  - ✅ Vytvoření faktury s přílohou (create_with_attachment)
  - ✅ Aktualizace faktury (update)
  - ✅ Smazání faktury (delete)
- Přepočet probíhá pro všechny LP, které jsou v `financovani.lp_kody` objednávky + odbory LP

📁 **Změněné soubory:**
- `orderV2InvoiceHandlers.php` - přidán auto přepočet do všech invoice operací
- Volá: `prepocetCerpaniPodleIdLP_PDO()` pro každé LP

---

### 2️⃣ **LP FAKTURY - REVERSE LOGIKA VĚCNÉ SPRÁVNOSTI**
**Commit:** `7e1d6c86`

✅ **Funkce:**
- **Potvrzení věcné správnosti** (`vecna_spravnost_potvrzeno = 1`):
  - Stav faktury: `ZAEVIDOVANA` → `VECNA_SPRAVNOST` ✅
- **Zrušení věcné správnosti** (`vecna_spravnost_potvrzeno = 0`):
  - Stav faktury: `VECNA_SPRAVNOST` → `ZAEVIDOVANA` ✅ **[NOVÉ]**

📁 **Změněné soubory:**
- `orderV2Endpoints.php` - reverse logika v inline update faktur
- `orderV2InvoiceHandlers.php` - reverse logika v dedicated invoice endpointech
- `InvoiceEvidencePage.js` - oprava ESLint chyb (imports přesunuty na začátek)

---

### 3️⃣ **LP ODBORY - FAKTURY BEZ OBJEDNÁVKY**
**Commity:** `744fa1a5`, `b6c23121`, `298ef06d`

✅ **Funkce:**
- Nová tabulka `25a_odbory_lp_prirazeni` pro přiřazení LP k fakturám/pokladně mimo objednávky
- Odborové faktury se zobrazují v LP badge (počet) a v expand detailu
- Započítávají se do čerpání LP (předpoklad/skutečné dle věcné správnosti)
- Nové API endpointy:
  - `POST /api.eeo/limitovane-prisliby/odbory/save` - uložení LP přiřazení
  - `GET /api.eeo/limitovane-prisliby/odbory/get` - načtení LP přiřazení
  - `DELETE /api.eeo/limitovane-prisliby/odbory/delete` - smazání LP přiřazení

📁 **Nové soubory:**
- `odboryLpHandlers.php` - CRUD operace pro odbory LP
- `LPBadge.js` - React komponenta pro zobrazení LP s počtem faktur
- `LPPreview.js` - React komponenta pro rozbalovací detail LP čerpání

📁 **Změněné soubory:**
- `api.php` - přidány nové endpointy
- `orderV3Handlers.php` - odbory faktury v LP expand
- `InvoiceEvidencePage.js` - odbory LP editor, LP badge integrace
- `Invoices25List.js` - LP dropdown s ikonou počtu faktur

---

### 4️⃣ **LP MODUL - VYLEPŠENÍ UX**
**Commity:** `1d5d76fa`, `2a37b4fe`, `9941ba08`

✅ **Funkce:**
- LP dropdown zobrazuje skutečný počet faktur (ikona v pravém rohu)
- LP zobrazení: úsek + příkazce
- Rozšířené vyhledávání LP (číslo, název, úsek, příkazce)

---

## 🗄️ DATABÁZOVÉ ZMĚNY

### ✅ **SQL #1: Nová tabulka - odborové LP přiřazení**
**Soubor:** `SQL_LP_CREATE_ODBORY_TABLE_20260526.sql`

```sql
CREATE TABLE IF NOT EXISTS `25a_odbory_lp_prirazeni` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `faktura_id` INT(10) DEFAULT NULL,          -- FK na faktury
  `pokladni_polozka_id` INT(10) DEFAULT NULL, -- FK na pokladnu
  `lp_id` INT(11) NOT NULL,                   -- FK na LP
  `poznamka` TEXT,
  `vytvoril_uzivatel_id` INT(11) UNSIGNED DEFAULT NULL,
  `dt_vytvoreni` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uniq_faktura` (`faktura_id`),
  UNIQUE KEY `uniq_pokladna` (`pokladni_polozka_id`),
  INDEX `idx_lp` (`lp_id`),
  -- Foreign keys + constraints...
);
```

**Účel:** Přímé přiřazení LP k fakturám/pokladně bez objednávky

---

### ✅ **SQL #2: Nové sloupce - LP čerpání z odborů**
**Soubor:** `SQL_LP_ADD_ODBORY_CERPANI_COLUMNS_20260526.sql`

```sql
ALTER TABLE `25_limitovane_prisliby_cerpani`
ADD COLUMN `cerpano_odbory_faktury` DECIMAL(15,2) DEFAULT 0.00
    COMMENT 'Čerpání z faktur přiřazených přes odbory (bez objednávky)'
AFTER `cerpano_pokladna`;

ALTER TABLE `25_limitovane_prisliby_cerpani`
ADD COLUMN `cerpano_odbory_pokladna` DECIMAL(15,2) DEFAULT 0.00
    COMMENT 'Čerpání z pokladních položek přiřazených přes odbory'
AFTER `cerpano_odbory_faktury`;
```

**Účel:** Započítání odborových faktur/pokladny do celkového čerpání LP

---

## 📦 DEPLOYMENT CHECKLIST

### 🔴 **PŘED NASAZENÍM (DEV → PROD)**

#### 1. **Git kontrola**
- [ ] Ověřit, že všechny změny jsou commitnuty
- [ ] Ověřit, že branch `feature/v3-development` je pushnutý
- [ ] Poslední commit: `7e1d6c86`

```bash
cd /var/www/erdms-dev
git status
git log --oneline -5
```

#### 2. **Databázové migrace (PRODUKCE)**
⚠️ **KRITICKÉ:** Spustit SQL migrace v pořadí!

```bash
# Připojení k produkční DB
mysql -h 10.3.172.11 -u erdms_user -p eeo2025
```

**Pořadí SQL skriptů:**

```sql
-- MIGRACE #1: Vytvoření tabulky odbory LP
SOURCE /var/www/erdms-platform/apps/eeo-v2/_sql/SQL_LP_CREATE_ODBORY_TABLE_20260526.sql;

-- MIGRACE #2: Přidání sloupců do čerpání
SOURCE /var/www/erdms-platform/apps/eeo-v2/_sql/SQL_LP_ADD_ODBORY_CERPANI_COLUMNS_20260526.sql;

-- OVĚŘENÍ
SHOW CREATE TABLE 25a_odbory_lp_prirazeni;
DESCRIBE 25_limitovane_prisliby_cerpani;
SELECT COUNT(*) FROM 25a_odbory_lp_prirazeni;
```

#### 3. **Backend - rsync API Legacy**
```bash
# Backup produkce (POVINNÉ!)
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy
tar -czf ~/backup-api-legacy-$(date +%Y%m%d-%H%M%S).tar.gz api.eeo/

# Rsync z DEV do PROD (BEZ --delete!)
rsync -av --progress \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/ \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/ \
  --exclude='.env' \
  --exclude='*.log'

# Ověření syntaxe
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib
php -l orderV2Endpoints.php
php -l orderV2InvoiceHandlers.php
php -l odboryLpHandlers.php
php -l limitovanePrislibyCerpaniHandlers_v2_pdo.php

# Reload Apache
systemctl reload apache2
```

#### 4. **Frontend - build PROD**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client

# Backup produkce
tar -czf ~/backup-eeo-v2-build-$(date +%Y%m%d-%H%M%S).tar.gz \
  /var/www/erdms-platform/apps/eeo-v2/client/build/

# Build produkce
npm run build:prod

# Rsync do PROD
rsync -av --progress --delete \
  build/ \
  /var/www/erdms-platform/apps/eeo-v2/client/build/

# Cache clear (volitelné)
rm -rf /var/www/erdms-platform/apps/eeo-v2/client/build/static/.cache
```

#### 5. **Produkční .env kontrola**
```bash
# Ověř produkční .env (NIKDY neměnit!)
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env

# MUSÍ obsahovat:
# DB_NAME=eeo2025
# DB_HOST=10.3.172.11
# UPLOAD_ROOT_PATH=/var/www/erdms-data/
```

---

### 🟢 **PO NASAZENÍ (TESTY)**

#### 1. **Funkční testy - LP Čerpání**
- [ ] Vytvořit novou fakturu v objednávce s LP → ověř auto přepočet
- [ ] Aktualizovat částku faktury → ověř auto přepočet
- [ ] Smazat fakturu → ověř auto přepočet

#### 2. **Funkční testy - Věcná správnost**
- [ ] Potvrdit věcnou správnost faktury → stav = `VECNA_SPRAVNOST`
- [ ] Zrušit věcnou správnost → stav = `ZAEVIDOVANA` ✅
- [ ] Ověř, že se čerpání přepočítá automaticky

#### 3. **Funkční testy - Odbory LP**
- [ ] Otevřít fakturu BEZ objednávky
- [ ] Přiřadit LP přes dropdown → uložit
- [ ] Ověř, že se LP zobrazuje v badge s počtem (1)
- [ ] Ověř, že se čerpání započítává do LP statistik
- [ ] Odebrat LP přiřazení → ověř přepočet

#### 4. **PHP Error log monitoring**
```bash
# Sleduj logy po nasazení
tail -f /var/www/erdms-dev/logs/php-error.log
tail -f /var/log/apache2/error.log

# Hledej kritické chyby
grep -i "SQLSTATE\|Fatal\|CRITICAL" /var/www/erdms-dev/logs/php-error.log | tail -20
```

#### 5. **Frontend kontrola**
- [ ] Login do produkce: `https://erdms.zachranka.cz/eeo-v2/`
- [ ] Otevři console (F12) → žádné JS errory
- [ ] Otevři fakturu s LP → badge se zobrazuje
- [ ] Otevři objednávku → inline faktury editace funguje

---

## 🔧 ROLLBACK PLÁN (V PŘÍPADĚ PROBLÉMŮ)

### **Databáze - rollback SQL**
```sql
-- Odebrat sloupce z čerpání
ALTER TABLE `25_limitovane_prisliby_cerpani` 
  DROP COLUMN `cerpano_odbory_faktury`,
  DROP COLUMN `cerpano_odbory_pokladna`;

-- Smazat tabulku odbory LP (POZOR: smaže data!)
DROP TABLE IF EXISTS `25a_odbory_lp_prirazeni`;
```

### **Backend - restore z backup**
```bash
# Najít poslední backup
ls -lh ~/backup-api-legacy-*.tar.gz | tail -5

# Restore
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy
tar -xzf ~/backup-api-legacy-YYYYMMDD-HHMMSS.tar.gz
systemctl reload apache2
```

### **Frontend - restore z backup**
```bash
# Najít poslední backup
ls -lh ~/backup-eeo-v2-build-*.tar.gz | tail -5

# Restore
cd /var/www/erdms-platform/apps/eeo-v2/client
rm -rf build/
tar -xzf ~/backup-eeo-v2-build-YYYYMMDD-HHMMSS.tar.gz
```

---

## 📊 STATISTIKY ZMĚN

### Změněné soubory (Backend - PHP):
```
api-legacy/api.eeo/api.php                              (+254 řádků)
api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php (+15 řádků)
api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php (+25 řádků)
api-legacy/api.eeo/v2025.03_25/lib/odboryLpHandlers.php (NOVÝ, +200 řádků)
api-legacy/api.eeo/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php (+125 řádků)
api-legacy/api.eeo/v2025.03_25/lib/lpHandlers.php      (+71 řádků)
api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php (+99 řádků)
```

### Změněné soubory (Frontend - React):
```
client/src/pages/InvoiceEvidencePage.js                (+229 řádků)
client/src/pages/Invoices25List.js                     (+60 řádků)
client/src/components/LPPreview.js                     (NOVÝ, +323 řádků)
client/src/components/LPBadge.js                       (NOVÝ, +150 řádků)
client/src/services/apiLP.js                           (+50 řádků)
```

### SQL migrace:
- 1 nová tabulka: `25a_odbory_lp_prirazeni`
- 2 nové sloupce v: `25_limitovane_prisliby_cerpani`

---

## ✅ ZNÁMÉ PROBLÉMY A ŘEŠENÍ

### ❌ Problem: Build selhal - ESLint `import/first` chyby
**Řešení:** Opraveno v commit `7e1d6c86` - všechny importy přesunuty na začátek `InvoiceEvidencePage.js`

### ❌ Problem: Faktura zůstává ve stavu `VECNA_SPRAVNOST` po zrušení
**Řešení:** Implementována reverse logika v commit `7e1d6c86` - stav se změní zpět na `ZAEVIDOVANA`

### ❌ Problem: LP čerpání se nepřepočítává po změně faktury
**Řešení:** Auto přepočet v commit `8ce6c186` - volá se po každé invoice operaci

---

## 📝 POZNÁMKY PRO TÝM

1. **Timezone helper:** Všechny nové DB záznamy používají `TimezoneHelper::setMysqlTimezone($db)` pro českou časovou zónu
2. **PDO připojení:** Všechny endpointy používají PDO (žádné mysqli)
3. **Konstanty tabulek:** Všechny názvy tabulek jsou z konstant `TBL_*` v `api.php`
4. **ENV Variables:** Žádné hardcoded URL/cesty - vše z `.env`
5. **Error handling:** Všechny DB operace v try-catch s `error_log()`

---

## 🎯 SUCCESS KRITÉRIA

✅ **Deployment je úspěšný, pokud:**
1. SQL migrace proběhly bez chyb
2. PHP syntax check OK (žádné errory)
3. Frontend build OK (Compiled successfully)
4. Login do produkce funguje
5. Vytvoření/aktualizace faktury automaticky přepočítá LP
6. Zrušení věcné správnosti změní stav na ZAEVIDOVANA
7. Odbory LP přiřazení funguje u faktur bez objednávky
8. PHP error log neobsahuje CRITICAL chyby prvních 30 minut

---

## 👤 ODPOVĚDNOST

**Připravil:** AI Assistant (GitHub Copilot)  
**Schválil:** robex08  
**Nasazuje:** DevOps tým  
**Datum přípravy:** 27. května 2026, 23:45  
**Plánované nasazení:** 28. května 2026, dopoledne

---

## 📞 KONTAKT V PŘÍPADĚ PROBLÉMŮ

- **Chyby v DB:** Zkontroluj `/var/www/erdms-dev/logs/php-error.log`
- **Frontend chyby:** Browser console (F12)
- **Rollback:** Viz sekce "ROLLBACK PLÁN" výše

---

**🚨 DŮLEŽITÉ UPOZORNĚNÍ:**
- ❌ **NIKDY nepoužívej rsync s --delete flag** (smaže api-legacy/)
- ❌ **NIKDY neměň produkční .env** bez potvrzení
- ✅ **VŽDY udělej backup před nasazením**
- ✅ **VŽDY sleduj logy prvních 30 minut po nasazení**
