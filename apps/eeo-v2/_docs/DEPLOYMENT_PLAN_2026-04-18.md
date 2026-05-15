# 🚀 DEPLOYMENT PLAN - Duben 2026
**Datum přípravy:** 18. dubna 2026  
**Cíl:** Nasazení Entra ID integrace + rozšíření faktur do produkce  
**Prostředí:** DEV → PROD (`EEO-OSTRA-DEV` → `eeo2025`)

---

## 📋 EXEC SUMMARY

### Co nasazujeme:
1. ✅ **Entra ID / Microsoft AD integrace** - kompletní autentizace přes Azure AD
2. ✅ **Rozšíření faktur** - věcná správnost, přílohy, kontroly
3. ✅ **Dashboard aktivních uživatelů** - admin monitoring
4. ✅ **Komentáře a notifikace** - editace + notifikace pro odpovědi
5. ✅ **Různé UI/UX vylepšení** - dashboard refresh, invoice list improvements

---

## 🗄️ ČÁST 1: DATABÁZOVÉ MIGRACE

### A) KRITICKÉ MIGRACE (nutné před nasazením aplikace)

#### 1.1 Entra ID / AD Integrace
**Tabulka:** `25_uzivatele`  
**Změny:** Sloupce pro Entra ID metadata  
```sql
-- Tyto sloupce by měly už existovat v PROD, ale ověř to:
-- entra_id VARCHAR(255)
-- upn VARCHAR(255)  
-- auth_mode ENUM('local','entra','both')
```
**Ověření:**
```sql
SHOW COLUMNS FROM 25_uzivatele WHERE Field IN ('entra_id', 'upn', 'auth_mode');
```
**⚠️ Poznámka:** Pokud sloupce NEEXISTUJÍ, bude třeba vytvořit migraci.

#### 1.2 Komentáře objednávek - Notifikace
**Soubor:** `/apps/eeo-v2/SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql`  
**Operace:**
- ✅ Přidání sloupce `dt_aktualizace` do `25a_objednavky_komentare`
- ✅ Přidání event types: `ORDER_COMMENT_ADDED`, `COMMENT_REPLY`
- ✅ Přidání notifikačních šablon

**Spustit:**
```bash
cd /var/www/erdms-platform/apps/eeo-v2
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql
```

#### 1.3 Dashboard aktivních uživatelů - Oprávnění
**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/migrations/2026-04-13_dashboard_active_users_permission.sql`  
**Operace:**
- ✅ Přidání práva `DASHBOARD_ACTIVE_USERS`
- ✅ Automatické přiřazení práva SUPERADMIN roli

**Spustit:**
```bash
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < \
  api-legacy/api.eeo/migrations/2026-04-13_dashboard_active_users_permission.sql
```

#### 1.4 Faktury - Věcná správnost
**Soubor:** `/apps/eeo-v2/client/sql/migration_faktury_vecna_spravnost.sql`  
**Tabulka:** `25a_faktury_objednavek`  
**Změny:**
- `potvrzeni_vecne_spravnosti` ENUM('ANO', 'NE')
- `potvrzeno_uzivatel_id` INT
- `potvrzeno_datum` DATETIME
- `vecna_spravnost_umisteni_majetku` TEXT
- `vecna_spravnost_poznamka` TEXT
- Foreign key: `fk_faktury_potvrzeno_uzivatel`

**Ověření PŘED migrací:**
```sql
-- Pokud už sloupce existují (aplikovaly se dříve), skip
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'eeo2025' 
  AND TABLE_NAME = '25a_faktury_objednavek' 
  AND COLUMN_NAME = 'potvrzeni_vecne_spravnosti';
```

**Spustit (pokud sloupce NEEXISTUJÍ):**
```bash
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < \
  client/sql/migration_faktury_vecna_spravnost.sql
```

### B) DALŠÍ MIGRACE (aplikované dříve, ale ověř)

#### 1.5 Cashbook Reports Práva
**Soubor:** `api-legacy/api.eeo/migrations/2026-04-01_cashbook_reports_prava.sql`  
**Status:** ✅ Pravděpodobně již aplikováno v dubnu

#### 1.6 Sticky Notes Permissions
**Soubor:** `api-legacy/api.eeo/migrations/2026-02-14_sticky_manage_permission.sql`  
**Status:** ✅ Aplikováno v únoru

---

## 🗂️ ČÁST 2: BACKEND API ZMĚNY

### A) Nové/upravené PHP soubory (api-legacy/api.eeo/v2025.03_25/lib/)

| Soubor | Změny | Důležitost |
|--------|-------|------------|
| `entraAuthHandlers.php` | 🆕 **NOVÝ** - kompletní Entra ID autentizace | **🔴 KRITICKÁ** |
| `systemAuthHandlers.php` | ✏️ Rozšíření o Entra config endpoint | **🔴 KRITICKÁ** |
| `globalSettingsHandlers.php` | ✏️ Nastavení `entra_enabled`, `auth_mode` | **🟡 VYSOKÁ** |
| `dashboardHandlers.php` | ✏️ Přidán endpoint `getActiveUsersAdmin()` | **🟢 STŘEDNÍ** |
| `userDetailHandlers.php` | ✏️ Extended user detail with Entra data | **🟢 STŘEDNÍ** |
| `invoiceHandlers.php` | ✏️ Věcná správnost, přílohy | **🟡 VYSOKÁ** |
| `orderV2InvoiceHandlers.php` | ✏️ Invoice attachments extended | **🟡 VYSOKÁ** |
| `orderV3Handlers.php` | ✏️ Komentáře s editací | **🟢 STŘEDNÍ** |
| `handlers.php` | ✏️ General fixes | **🟢 NÍZKÁ** |
| `queries.php` | ✏️ SQL queries update | **🟢 NÍZKÁ** |

### B) Kritické API endpointy k testování po deployi

```bash
# 1. Test Entra Auth Config
curl -X POST https://erdms.zachranka.cz/api.eeo/v2.0/system/auth-config \
  -H "Content-Type: application/json"

# 2. Test Dashboard Active Users (s admin tokenem)
curl -X POST https://erdms.zachranka.cz/api.eeo/v2.0/dashboard/active-users \
  -H "Content-Type: application/json" \
  -d '{"token":"ADMIN_TOKEN","username":"admin"}'

# 3. Test Invoice List
curl -X POST https://erdms.zachranka.cz/api.eeo/v2.0/invoices25/list \
  -H "Content-Type: application/json" \
  -d '{"token":"USER_TOKEN","username":"user123"}'
```

---

## 🎨 ČÁST 3: FRONTEND ZMĚNY

### A) Změněné komponenty (client/src/)

| Soubor | Změny | Důležitost |
|--------|-------|------------|
| `pages/DashboardPage.js` | ✏️ Refresh control, active users widget | **🟡 VYSOKÁ** |
| `pages/Invoices25List.js` | ✏️ Přílohy, refresh, UI improvements | **🟡 VYSOKÁ** |
| `utils/dashboardRefresh.js` | 🆕 **NOVÝ** - refresh helper | **🟢 STŘEDNÍ** |

### B) ENV Variables - KRITICKÁ KONTROLA

#### Frontend (.env)
**Soubor:** `/apps/eeo-v2/client/.env.production`  
**Kontrola:**
```bash
# Ověř, že PROD .env má správné hodnoty:
REACT_APP_API_BASE_URL=/api
REACT_APP_API2_BASE_URL=/api.eeo/
REACT_APP_VERSION=2.40-PROD
APP_ENV=production
```

#### Backend (.env)
**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/.env.production`  
**Kontrola:**
```bash
DB_HOST=10.3.172.11
DB_NAME=eeo2025  # ⚠️ PROD databáze!
UPLOAD_ROOT_PATH=/var/www/erdms-data/
APP_ENV=production
```

**⚠️ NIKDY nepoužívej hardcoded hodnoty!** Vše musí být z .env.

---

## 🔐 ČÁST 4: ENTRA ID KONFIGURACE

### A) Globální nastavení v DB (25a_nastaveni_globalni)

Po deployi **ZKONTROLUJ** následující nastavení v PROD DB:

```sql
SELECT klic, hodnota, popis 
FROM 25a_nastaveni_globalni 
WHERE klic IN ('entra_enabled', 'auth_mode', 'auto_provision_enabled');
```

**Doporučené nastavení pro PROD (OSTRÉ SPUŠTĚNÍ):**
```sql
-- Povolit Entra ID login
UPDATE 25a_nastaveni_globalni 
SET hodnota = '1' 
WHERE klic = 'entra_enabled';

-- Režim: všichni mohou používat Entra i lokální login
UPDATE 25a_nastaveni_globalni 
SET hodnota = 'entra_admin_local'  -- nebo 'entra_all' pro všechny
WHERE klic = 'auth_mode';

-- Auto-provisioning: vypnuto pro prod (ruční schvalování)
UPDATE 25a_nastaveni_globalni 
SET hodnota = '0' 
WHERE klic = 'auto_provision_enabled';
```

### B) Centrální Auth API (eeo-auth.zachranka.cz)

**⚠️ DŮLEŽITÉ:** Entra ID integrace vyžaduje běžící centrální Auth API!

**Kontrola:**
```bash
# Test, že Auth API běží:
curl -I https://eeo-auth.zachranka.cz/health

# Test session endpoint:
curl https://eeo-auth.zachranka.cz/auth/me \
  -H "Cookie: auth_session=TEST_SESSION"
```

**Pokud Auth API NENÍ nasazené:**
- 🔴 NELZE použít Entra ID login v produkci
- Nastav `entra_enabled = '0'` v DB
- Deploy pouze ostatní změny

---

## 📦 ČÁST 5: DEPLOYMENT POSTUP

### KROK 1: BACKUP (KRITICKÝ!)

```bash
# 1.1 Backup PROD databáze
mkdir -p /var/www/__BCK_PRODUKCE/deploy-2026-04-18
cd /var/www/__BCK_PRODUKCE/deploy-2026-04-18

mysqldump -h 10.3.172.11 -u erdms_user -p eeo2025 \
  | gzip > db-eeo2025-$(date +%Y%m%d-%H%M%S).sql.gz

# 1.2 Backup PROD aplikace
rsync -av --exclude 'node_modules' \
  /var/www/erdms-platform/apps/eeo-v2/ \
  /var/www/__BCK_PRODUKCE/deploy-2026-04-18/eeo-v2-backup/

# 1.3 Ověření backupů
ls -lh /var/www/__BCK_PRODUKCE/deploy-2026-04-18/
```

### KROK 2: DATABÁZOVÉ MIGRACE (na PROD DB)

```bash
cd /var/www/erdms-dev/apps/eeo-v2

# 2.1 Komentáře + notifikace
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 \
  < SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql

# 2.2 Dashboard aktivních uživatelů
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 \
  < api-legacy/api.eeo/migrations/2026-04-13_dashboard_active_users_permission.sql

# 2.3 Faktury - věcná správnost (pokud ještě nebylo aplikováno)
# PŘED spuštěním ověř, že sloupce neexistují!
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 \
  < client/sql/migration_faktury_vecna_spravnost.sql

# 2.4 Ověření migrací
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
  SELECT COUNT(*) as komentare_dt_aktualizace 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA='eeo2025' 
    AND TABLE_NAME='25a_objednavky_komentare' 
    AND COLUMN_NAME='dt_aktualizace';
"
```

### KROK 3: FRONTEND BUILD & DEPLOY

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client

# 3.1 Build PROD verze
npm run build:prod

# 3.2 Ověření buildu
ls -lh build/
cat build/version.json

# 3.3 Deploy do PROD (BEZ --delete!)
rsync -av build/ /var/www/erdms-platform/apps/eeo-v2/ \
  --exclude 'api/' \
  --exclude 'api-legacy/' \
  --exclude 'node_modules'

# 3.4 Ověření, že API složky NEJSOU smazané
ls -la /var/www/erdms-platform/apps/eeo-v2/ | grep api
```

### KROK 4: BACKEND API DEPLOY

```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy

# 4.1 Sync API do PROD (BEZ --delete!)
rsync -av api.eeo/ /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/ \
  --exclude '.env*' \
  --exclude 'test-*.php' \
  --exclude 'migrations/' \
  --exclude 'vendor/'

# 4.2 Ověření důležitých souborů
ls -lh /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/entraAuthHandlers.php

# 4.3 Ověření .env PROD (NESMÍ se přepsat!)
head -20 /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
```

### KROK 5: OPRÁVNĚNÍ & RELOAD

```bash
# 5.1 Nastavení oprávnění
chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/

# 5.2 Reload Apache (aplikuje PHP změny)
systemctl reload apache2

# 5.3 Clear PHP OPcache (pokud je aktivní)
# Vytvoř soubor: /var/www/erdms-platform/apps/eeo-v2/clear-cache.php
cat > /var/www/erdms-platform/apps/eeo-v2/clear-cache.php << 'EOF'
<?php
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "OPcache cleared!\n";
} else {
    echo "OPcache not enabled\n";
}
?>
EOF

# Spusť přes curl:
curl https://erdms.zachranka.cz/clear-cache.php
rm /var/www/erdms-platform/apps/eeo-v2/clear-cache.php
```

---

## ✅ ČÁST 6: POST-DEPLOYMENT TESTING

### A) Kritické testy (provést IHNED po deployi)

#### 6.1 Základní dostupnost
```bash
# Homepage
curl -I https://erdms.zachranka.cz/

# API Health
curl https://erdms.zachranka.cz/api.eeo/v2.0/system/health

# Verze
curl https://erdms.zachranka.cz/version.json
```

#### 6.2 Autentizace
```bash
# Lokální login (musí fungovat bez Entra)
# Test přes frontend: https://erdms.zachranka.cz/login

# Auth config endpoint
curl -X POST https://erdms.zachranka.cz/api.eeo/v2.0/system/auth-config \
  -H "Content-Type: application/json"

# Očekávaný response:
# {
#   "status": "success",
#   "data": {
#     "entra_enabled": "1",  // nebo "0" pokud vypnuto
#     "auth_mode": "entra_admin_local",
#     "auto_provision_enabled": "0"
#   }
# }
```

#### 6.3 Dashboard
```bash
# Test, že dashboard se načítá (přihlášený uživatel)
# Vizuální test: https://erdms.zachranka.cz/dashboard

# Admin dashboard - active users (vyžaduje SUPERADMIN)
# Frontend test: https://erdms.zachranka.cz/dashboard
# Kontrola, že se zobrazuje widget "Aktivní uživatelé"
```

#### 6.4 Faktury
```bash
# Test invoice list
# Frontend: https://erdms.zachranka.cz/invoices

# Test věcné správnosti (otevři fakturu, klikni "Potvrdit věcnou správnost")
# Kontrola v DB:
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
  SELECT id, cislo_faktury, potvrzeni_vecne_spravnosti, potvrzeno_datum 
  FROM 25a_faktury_objednavek 
  WHERE potvrzeni_vecne_spravnosti IS NOT NULL 
  LIMIT 5;
"
```

#### 6.5 Komentáře objednávek
```bash
# Otevři objednávku, přidej komentář, edituj ho
# Frontend test: https://erdms.zachranka.cz/orders/545

# Kontrola v DB:
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
  SELECT id, text, dt_vytvoreni, dt_aktualizace 
  FROM 25a_objednavky_komentare 
  WHERE dt_aktualizace IS NOT NULL 
  LIMIT 5;
"
```

### B) Sledování Errorlogů

```bash
# PHP error log (hlavní místo pro debugging)
tail -f /var/www/erdms-platform/logs/php/prod-error.log

# Apache error log (sekundární)
tail -f /var/log/apache2/error.log

# Hledání kritických chyb:
grep -i "fatal\|error\|exception" /var/www/erdms-platform/logs/php/prod-error.log | tail -50
```

---

## 🚨 ČÁST 7: ROLLBACK PLÁN

**Pokud se objeví kritická chyba:**

### OKAMŽITÝ ROLLBACK (< 5 minut)

```bash
# 1. Restore frontend
rsync -av --delete \
  /var/www/__BCK_PRODUKCE/deploy-2026-04-18/eeo-v2-backup/ \
  /var/www/erdms-platform/apps/eeo-v2/

# 2. Restore API
rsync -av --delete \
  /var/www/__BCK_PRODUKCE/deploy-2026-04-18/eeo-v2-backup/api-legacy/ \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/

# 3. Reload Apache
systemctl reload apache2

# 4. Clear browser cache (sdělení uživatelům)
echo "Uživatelé: Ctrl+F5 nebo vyčistit cache prohlížeče"
```

### ROLLBACK DATABÁZE (pokud DB migrace způsobují problémy)

```bash
# ⚠️ POZOR: Ztráta dat vytvořených po migraci!

# 1. Restore DB
cd /var/www/__BCK_PRODUKCE/deploy-2026-04-18
zcat db-eeo2025-*.sql.gz | mysql -h 10.3.172.11 -u erdms_user -p eeo2025

# 2. Ověření
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SHOW TABLES;"
```

---

## 📊 ČÁST 8: MONITORING PO DEPLOYI (24h)

### Co sledovat:

| Metrika | Nástroj | Threshold |
|---------|---------|-----------|
| **PHP Errory** | `/var/www/erdms-platform/logs/php/prod-error.log` | < 10 errors/hod |
| **API Response Time** | Browser DevTools Network | < 2s |
| **DB Queries** | MariaDB slow query log | < 5s |
| **User Complaints** | Email/Tickets | 0 kritických |

### Checklist 24h po deployi:

- [ ] ✅ Žádné kritické PHP errory v logu
- [ ] ✅ Dashboard se načítá < 2s
- [ ] ✅ Invoice list funguje správně
- [ ] ✅ Komentáře lze editovat
- [ ] ✅ Entra ID login funguje (pokud aktivní)
- [ ] ✅ Lokální login funguje (fallback)
- [ ] ✅ Žádné user complaints o nefunkčnosti
- [ ] ✅ Věcná správnost faktur funguje
- [ ] ✅ Přílohy faktur se stahují

---

## 🔧 ČÁST 9: ZNÁMÉ PROBLÉMY A ŘEŠENÍ

### Problem 1: Entra ID login nefunguje
**Symptom:** Redirect z Entra vrací 401  
**Řešení:**
1. Zkontroluj, že Auth API běží: `curl https://eeo-auth.zachranka.cz/health`
2. Zkontroluj `entra_enabled` v DB: `SELECT * FROM 25a_nastaveni_globalni WHERE klic='entra_enabled';`
3. Pokud Auth API neběží → nastav `entra_enabled='0'` v DB

### Problem 2: Dashboard se nenačítá
**Symptom:** Infinite loading spinner  
**Řešení:**
1. Check browser console: F12 → Console
2. Check API endpoint: `/api.eeo/v2.0/dashboard/data`
3. Check PHP error log: `tail -50 /var/www/erdms-platform/logs/php/prod-error.log`

### Problem 3: Faktury bez věcné správnosti
**Symptom:** Tlačítko "Potvrdit věcnou správnost" chybí  
**Řešení:**
1. Ověř DB sloupce: `SHOW COLUMNS FROM 25a_faktury_objednavek LIKE 'potvrzeni_vecne%';`
2. Pokud sloupce chybí → spusť migraci `migration_faktury_vecna_spravnost.sql`
3. Clear cache: `systemctl reload apache2` + Ctrl+F5 v prohlížeči

### Problem 4: PHP Fatal Error po deployi
**Symptom:** 500 Internal Server Error  
**Řešení:**
1. Check error log: `tail -100 /var/www/erdms-platform/logs/php/prod-error.log`
2. Nejčastější příčina: Missing soubor `entraAuthHandlers.php`
3. Verify: `ls -lh /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/entraAuthHandlers.php`
4. Pokud chybí → zkopíruj z DEV

---

## 📝 ZÁVĚR

### Před začátkem deploye:

- [ ] ✅ Backup PROD databáze vytvořen
- [ ] ✅ Backup PROD aplikace vytvořen
- [ ] ✅ DEV .env zkontrolován (žádný hardcode)
- [ ] ✅ PROD .env zkontrolován (správná DB, cesty)
- [ ] ✅ Migrační skripty připravené
- [ ] ✅ Auth API dostupné (pokud Entra aktivní)
- [ ] ✅ Uživatelé informováni o plánovaném restartu

### Časový odhad:
- **Backup:** 10 min
- **DB migrace:** 5 min
- **Frontend deploy:** 10 min
- **Backend deploy:** 5 min
- **Testing:** 20 min
- **CELKEM:** ~50 minut

### Doporučený čas deploye:
**Nejlépe: Večer 18:00-20:00 nebo víkend**  
_(nejnižší počet aktivních uživatelů)_

---

## 📞 KONTAKTY V PŘÍPADĚ PROBLÉMŮ

- **Dev tým:** Robert Holovský, Klára Šulgánová
- **DB Admin:** [kontakt]
- **Infrastructure:** [kontakt]

---

**Status:** ✅ PŘIPRAVENO K DEPLOYI  
**Last updated:** 2026-04-18 [aktuální čas]
