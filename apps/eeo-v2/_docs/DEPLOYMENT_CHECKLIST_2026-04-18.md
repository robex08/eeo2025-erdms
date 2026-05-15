# ✅ DEPLOYMENT CHECKLIST - Duben 2026

**Quick reference pro deployment** | Detaily viz: `DEPLOYMENT_PLAN_2026-04-18.md`

---

## 🔴 PŘED ZAČÁTKEM

- [ ] Backup PROD DB vytvořen (`/var/www/__BCK_PRODUKCE/deploy-2026-04-18/`)
- [ ] Backup PROD aplikace vytvořen
- [ ] Uživatelé informováni o krátkém výpadku (~5 min)
- [ ] DEV aplikace otestována a funkční
- [ ] Všechny změny commitnuté do GIT

---

## 🗄️ DATABÁZOVÉ MIGRACE

### Spustit v tomto pořadí:

```bash
cd /var/www/erdms-dev/apps/eeo-v2
```

- [ ] **1. Komentáře + notifikace**
  ```bash
  mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql
  ```

- [ ] **2. Dashboard aktivních uživatelů**
  ```bash
  mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < \
    api-legacy/api.eeo/migrations/2026-04-13_dashboard_active_users_permission.sql
  ```

- [ ] **3. Faktury - věcná správnost** (pokud ještě nebylo)
  ```bash
  # POZOR: Nejdříve ověř, že sloupce NEEXISTUJÍ:
  mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e \
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA='eeo2025' 
       AND TABLE_NAME='25a_faktury_objednavek' 
       AND COLUMN_NAME='potvrzeni_vecne_spravnosti';"
  
  # Pokud vrátí 0, spusť migraci:
  mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < \
    client/sql/migration_faktury_vecna_spravnost.sql
  ```

- [ ] **4. Ověření migrací**
  ```bash
  mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "
    -- Komentáře
    SHOW COLUMNS FROM 25a_objednavky_komentare WHERE Field='dt_aktualizace';
    
    -- Dashboard právo
    SELECT * FROM 25_prava WHERE kod_prava='DASHBOARD_ACTIVE_USERS';
    
    -- Faktury věcná správnost
    SHOW COLUMNS FROM 25a_faktury_objednavek WHERE Field='potvrzeni_vecne_spravnosti';
  "
  ```

---

## 🎨 FRONTEND DEPLOY

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
```

- [ ] **1. Build production**
  ```bash
  npm run build:prod
  ```

- [ ] **2. Ověření buildu**
  ```bash
  ls -lh build/
  cat build/version.json  # Mělo by být 2.40-PROD nebo vyšší
  ```

- [ ] **3. Deploy do PROD** (⚠️ BEZ --delete!)
  ```bash
  rsync -av build/ /var/www/erdms-platform/apps/eeo-v2/ \
    --exclude 'api/' \
    --exclude 'api-legacy/' \
    --exclude 'node_modules'
  ```

- [ ] **4. Ověření API složek** (NESMÍ být smazané!)
  ```bash
  ls -la /var/www/erdms-platform/apps/eeo-v2/ | grep -E "^d.*api"
  # Měly by se zobrazit: api/ a api-legacy/
  ```

---

## 🔧 BACKEND API DEPLOY

```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy
```

- [ ] **1. Sync API do PROD** (⚠️ BEZ --delete!)
  ```bash
  rsync -av api.eeo/ /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/ \
    --exclude '.env*' \
    --exclude 'test-*.php' \
    --exclude 'migrations/' \
    --exclude 'vendor/'
  ```

- [ ] **2. Ověření kritických souborů**
  ```bash
  # Entra Auth Handler (nový soubor)
  ls -lh /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/entraAuthHandlers.php
  
  # Upravené handlery
  ls -lh /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/{dashboardHandlers,invoiceHandlers,systemAuthHandlers}.php
  ```

- [ ] **3. Kontrola PROD .env** (NESMÍ se přepsat!)
  ```bash
  head -10 /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
  # Ověř: DB_NAME=eeo2025, APP_ENV=production
  ```

---

## ⚙️ RESTART & PERMISSIONS

- [ ] **1. Oprávnění**
  ```bash
  chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/
  ```

- [ ] **2. Reload Apache**
  ```bash
  systemctl reload apache2
  ```

- [ ] **3. Clear PHP OPcache** (pokud aktivní)
  ```bash
  # Vytvoř dočasný clear skript:
  echo '<?php opcache_reset(); echo "OK\n"; ?>' > /tmp/clear.php
  sudo -u www-data php /tmp/clear.php
  rm /tmp/clear.php
  ```

---

## ✅ POST-DEPLOY TESTING

### Kritické testy (provést IHNED):

- [ ] **Homepage funguje**
  ```bash
  curl -I https://erdms.zachranka.cz/ | head -1
  # Očekáváno: HTTP/1.1 200 OK
  ```

- [ ] **API Health**
  ```bash
  curl https://erdms.zachranka.cz/api.eeo/v2.0/system/health
  ```

- [ ] **Auth Config (Entra)**
  ```bash
  curl -X POST https://erdms.zachranka.cz/api.eeo/v2.0/system/auth-config \
    -H "Content-Type: application/json"
  ```

- [ ] **Dashboard načítání** (browser test)
  - Otevři: https://erdms.zachranka.cz/dashboard
  - Mělo by se načíst < 3s
  - Dashboard widgets zobrazeny

- [ ] **Invoice list** (browser test)
  - Otevři: https://erdms.zachranka.cz/invoices
  - Tabulka faktur se načte
  - Přílohy se zobrazují

- [ ] **Komentáře objednávek** (browser test)
  - Otevři nějakou objednávku
  - Přidej komentář
  - Zkus komentář editovat (měla by se zobrazit ikona tužky)

- [ ] **Věcná správnost faktury** (browser test)
  - Otevři fakturu
  - Zkontroluj, že se zobrazuje tlačítko "Potvrdit věcnou správnost"

---

## 📊 SLEDOVÁNÍ ERRORLOGŮ (prvních 30 minut)

- [ ] **PHP Error Log**
  ```bash
  tail -f /var/www/erdms-platform/logs/php/prod-error.log
  ```

- [ ] **Apache Error Log**
  ```bash
  tail -f /var/log/apache2/error.log
  ```

- [ ] **Hledání kritických chyb**
  ```bash
  grep -i "fatal\|critical" /var/www/erdms-platform/logs/php/prod-error.log | tail -20
  ```

---

## 🚨 ROLLBACK (pokud kritická chyba)

**OKAMŽITÝ ROLLBACK:**

```bash
# 1. Restore vše z backupu
rsync -av --delete \
  /var/www/__BCK_PRODUKCE/deploy-2026-04-18/eeo-v2-backup/ \
  /var/www/erdms-platform/apps/eeo-v2/

# 2. Reload
systemctl reload apache2

# 3. Informuj uživatele
echo "Rollback dokončen, aplikace obnovena na předchozí verzi"
```

---

## 🔧 ENTRA ID KONFIGURACE (VOLITELNÉ)

**Pokud chceš AKTIVOVAT Entra ID login:**

- [ ] **1. Ověř Auth API**
  ```bash
  curl -I https://eeo-auth.zachranka.cz/health
  # Mělo by vrátit 200 OK
  ```

- [ ] **2. Aktivuj v DB**
  ```sql
  -- Povolit Entra login
  UPDATE 25a_nastaveni_globalni 
  SET hodnota = '1' 
  WHERE klic = 'entra_enabled';
  
  -- Režim: admin Entra + ostatní local
  UPDATE 25a_nastaveni_globalni 
  SET hodnota = 'entra_admin_local' 
  WHERE klic = 'auth_mode';
  ```

- [ ] **3. Test Entra login**
  - Otevři: https://erdms.zachranka.cz/login
  - Mělo by se zobrazit tlačítko "Přihlásit přes Microsoft"
  - Klikni a zkus se přihlásit

**Pokud Auth API NEBĚŽÍ:**
```sql
-- Vypni Entra (fallback na lokální login)
UPDATE 25a_nastaveni_globalni SET hodnota = '0' WHERE klic = 'entra_enabled';
```

---

## 📋 FINÁLNÍ CHECKLIST (24h po deployi)

- [ ] Žádné kritické PHP errory v logu
- [ ] Dashboard funguje správně
- [ ] Invoice list funguje
- [ ] Komentáře lze editovat
- [ ] Věcná správnost faktur funguje
- [ ] Entra ID login funguje (pokud aktivní)
- [ ] Lokální login funguje jako fallback
- [ ] Žádné user complaints o výpadku funkcí
- [ ] Response time API < 2s

---

## 📞 V PŘÍPADĚ PROBLÉMŮ

**Immediate actions:**
1. Check error logs: `tail -100 /var/www/erdms-platform/logs/php/prod-error.log`
2. Check Apache: `systemctl status apache2`
3. Check DB connection: `mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT 1;"`

**Pokud nelze vyřešit do 10 minut → ROLLBACK!**

---

**Status deploye:** ⬜ NOT STARTED | ⏳ IN PROGRESS | ✅ COMPLETED | ❌ ROLLED BACK

**Deployed by:** ________________  
**Date/Time:** ________________  
**Duration:** ________________  
**Issues:** ________________
