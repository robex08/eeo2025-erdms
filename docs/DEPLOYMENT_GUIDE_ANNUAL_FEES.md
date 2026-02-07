# 🚀 DEPLOYMENT GUIDE - Roční poplatky (Evidence Annual Fees)

**Modul:** Evidence ročních poplatků  
**Datum:** 27.1.2026  
**Branch:** feature/generic-recipient-system  
**Cílová databáze PROD:** eeo2025  

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] Ověřeno v DEV prostředí (EEO-OSTRA-DEV)
- [ ] Základní CRUD operace fungují
- [ ] Automatické generování položek otestováno (měsíční, kvartální, roční)
- [ ] UI komponenta AnnualFeesPage.js otestována
- [ ] API endpointy vrací správné JSON odpovědi
- [ ] PHP syntax check bez errorů
- [ ] SQL migrace v DEV proběhla úspěšně
- [ ] Záloha PROD databáze vytvořena

---

## 📦 SOUBORY K NASAZENÍ

### 1️⃣ SQL Migrace (PROD)
```
/var/www/erdms-dev/docs/sql/annual_fees_migration_PROD.sql
```

### 2️⃣ Backend (PHP)
```
/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php
/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesQueries.php
/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php (UPDATED)
```

### 3️⃣ Frontend (React)
```
/var/www/erdms-dev/apps/eeo-v2/client/src/pages/AnnualFeesPage.js
/var/www/erdms-dev/apps/eeo-v2/client/src/App.js (UPDATED)
```

### 4️⃣ Dokumentace
```
/var/www/erdms-dev/docs/PLAN_ROCNI_POPLATKY.md
/var/www/erdms-dev/docs/PLAN_ROCNI_POPLATKY_API_CREATE.md
/var/www/erdms-dev/docs/PLAN_ROCNI_POPLATKY_INTEGRACE_SMLOUVY.md (budoucí rozšíření)
```

---

## 🔧 DEPLOYMENT KROKY

### KROK 1: Záloha PROD databáze ⚠️

```bash
# Přihlásit se na produkční server
ssh root@<prod-server>

# Vytvořit zálohu
mysqldump -h 10.3.172.11 -u erdms_user -p'<prod-password>' eeo2025 \
  > /backups/eeo2025_backup_$(date +%Y%m%d_%H%M%S).sql

# Ověřit velikost zálohy
ls -lh /backups/eeo2025_backup_*.sql | tail -1
```

---

### KROK 2: SQL Migrace v PROD 🗄️

```bash
# Spustit SQL migraci na PROD databázi
mysql -h 10.3.172.11 -u erdms_user -p'<prod-password>' eeo2025 \
  < /var/www/erdms-prod/docs/sql/annual_fees_migration_PROD.sql

# Ověřit vytvoření tabulek
mysql -h 10.3.172.11 -u erdms_user -p'<prod-password>' eeo2025 -e "
  SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA='eeo2025' 
    AND TABLE_NAME LIKE '25a_rocni%';
"

# Ověřit číselníky
mysql -h 10.3.172.11 -u erdms_user -p'<prod-password>' eeo2025 -e "
  SELECT typ_objektu, COUNT(*) as pocet 
  FROM 25_ciselnik_stavy 
  WHERE typ_objektu LIKE 'ROCNI_POPLATEK%' 
  GROUP BY typ_objektu;
"
```

**Očekávaný výstup:**
```
+---------------------------+-------+
| typ_objektu               | pocet |
+---------------------------+-------+
| ROCNI_POPLATEK            |     4 |
| ROCNI_POPLATEK_DRUH       |     4 |
| ROCNI_POPLATEK_PLATBA     |     4 |
+---------------------------+-------+
```

---

### KROK 3: Backend Deployment 🔧

```bash
# Zkopírovat backend soubory na PROD
cd /var/www/erdms-prod

# Přidat nové handler soubory
git pull origin feature/generic-recipient-system

# NEBO manuální copy (pokud není GIT ready):
# scp annualFeesHandlers.php root@prod:/var/www/erdms-prod/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
# scp annualFeesQueries.php root@prod:/var/www/erdms-prod/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/

# Ověřit PHP syntaxi
php -l apps/eeo-v2/api-legacy/api.eeo/api.php
php -l apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php
php -l apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesQueries.php
```

---

### KROK 4: Frontend Build & Deploy 🎨

```bash
# Build React aplikace
cd /var/www/erdms-prod/apps/eeo-v2/client
npm run build

# Ověřit build
ls -lh build/static/js/*.js | tail -3

# Apache automaticky servíruje z build/ složky
```

---

### KROK 5: Apache Restart ♻️

```bash
# Restartovat Apache pro načtení změn v api.php
sudo systemctl restart apache2

# Ověřit status
sudo systemctl status apache2

# Zkontrolovat logy
sudo tail -f /var/log/apache2/error.log
```

---

### KROK 6: Smoke Test 🔥

```bash
# Test 1: API dostupnost
curl -X POST https://<prod-domain>/api.eeo/annual-fees/stats \
  -H "Content-Type: application/json" \
  -d '{"token":"<valid-token>","username":"<admin-user>"}' | jq .

# Očekávaný výsledek:
# {
#   "status": "success",
#   "data": {
#     "celkem_poplatku": 0,
#     "celkova_castka_sum": 0,
#     ...
#   }
# }

# Test 2: Frontend dostupnost
curl -I https://<prod-domain>/annual-fees
# Očekáváno: HTTP/1.1 200 OK

# Test 3: Číselníky v API
curl -X POST https://<prod-domain>/api.eeo/ciselniky/list \
  -H "Content-Type: application/json" \
  -d '{"token":"<valid-token>","username":"<admin-user>","typ_objektu":"ROCNI_POPLATEK"}' | jq .
```

---

## 🧪 MANUÁLNÍ TESTOVÁNÍ (po deployu)

### 1️⃣ Vytvoření ročního poplatku (měsíční)
1. Přihlásit se jako admin
2. Otevřít **BETA → Evidence ročních poplatků**
3. Kliknout **Nový roční poplatek**
4. Vyplnit:
   - Smlouva: (vybrat existující)
   - Název: "Test - Nájemné 2026"
   - Rok: 2026
   - Druh: Nájemní
   - Typ platby: **Měsíční**
   - Částka na položku: 1000 Kč
   - První splatnost: 2026-01-20
5. Uložit
6. **Očekáváno:** Automaticky vytvoří 12 měsíčních položek (Leden 2026 - Prosinec 2026)

### 2️⃣ Rozbalení řádku
1. Kliknout na šipku ▼ u vytvořeného poplatku
2. **Očekáváno:** Zobrazí se 12 sub-řádků s měsíčními položkami

### 3️⃣ Aktualizace stavu položky
1. U první položky (Leden 2026) kliknout **Edit**
2. Změnit stav na **Zaplaceno**
3. Vybrat datum zaplacení
4. Uložit
5. **Očekáváno:** 
   - Položka má zelený badge "Zaplaceno"
   - Hlavička přepočítá: Zaplaceno celkem: 1000 Kč, Zbývá: 11000 Kč

### 4️⃣ Statistiky
1. Otevřít kartu **Statistiky**
2. **Očekáváno:** 
   - Celkem poplatků: 1
   - Zaplaceno: 1000 Kč
   - Nezaplaceno: 11000 Kč
   - Graf podle druhů

---

## 🐛 TROUBLESHOOTING

### Problem: "annual-fees/list" vrací 404
**Řešení:**
```bash
# 1. Ověřit .htaccess
cat /var/www/erdms-prod/apps/eeo-v2/api-legacy/api.eeo/.htaccess
# Zkontrolovat: RewriteRule ^(.*)$ api.php [QSA,L]

# 2. Restart Apache
sudo systemctl restart apache2

# 3. Zkontrolovat Apache config
sudo apachectl -t
```

### Problem: SQL migrace failuje na FK constraint
**Řešení:**
```sql
-- Zkontrolovat strukturu existujících tabulek
SHOW CREATE TABLE 25_smlouvy;
SHOW CREATE TABLE 25_dodavatele;
SHOW CREATE TABLE 25_uzivatele;

-- Ověřit datové typy sloupců id (musí být INT(11) nebo INT(10) UNSIGNED)
```

### Problem: Frontend ukazuje "Stránka nenalezena"
**Řešení:**
```bash
# 1. Zkontrolovat routing v App.js
grep -n "annual-fees" apps/eeo-v2/client/src/App.js

# 2. Rebuild frontend
cd apps/eeo-v2/client && npm run build

# 3. Clear browser cache
# Shift + F5 nebo Ctrl + Shift + R
```

### Problem: API vrací "Neautorizovaný přístup"
**Řešení:**
```bash
# Zkontrolovat authenticate_user funkci v handlers
# Ujistit se, že token a username jsou správně poslány v POST body
```

---

## 📊 POST-DEPLOYMENT MONITORING

### 1️⃣ Apache Error Logy (první 24h)
```bash
sudo tail -f /var/log/apache2/error.log | grep -i "annual\|rocni"
```

### 2️⃣ PHP Error Logy
```bash
sudo tail -f /var/log/php/error.log | grep -i "annual\|rocni"
```

### 3️⃣ Database Performance
```sql
-- Zkontrolovat indexy
SHOW INDEX FROM 25a_rocni_poplatky;
SHOW INDEX FROM 25a_rocni_poplatky_polozky;

-- Sledovat query časy (po několika dnech)
SELECT * FROM mysql.slow_query_log WHERE sql_text LIKE '%rocni_poplatky%';
```

---

## 🔄 ROLLBACK PLÁN (v případě problémů)

### URGENTNÍ Rollback (< 5 minut)
```bash
# 1. Vrátit změny v api.php (odstranit annual-fees routing)
git checkout HEAD~1 apps/eeo-v2/api-legacy/api.eeo/api.php

# 2. Restart Apache
sudo systemctl restart apache2

# 3. Smazat nové handler soubory
rm apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFees*.php

# Frontend zůstává - menu item bude nefunkční (přijatelné pro emergency)
```

### PLNÝ Rollback (databáze + kód)
```sql
-- VAROVÁNÍ: Smaže všechna data ročních poplatků!

-- 1. Odstranit tabulky
DROP TABLE IF EXISTS `25a_rocni_poplatky_polozky`;
DROP TABLE IF EXISTS `25a_rocni_poplatky`;

-- 2. Odstranit číselníky
DELETE FROM `25_ciselnik_stavy` WHERE typ_objektu LIKE 'ROCNI_POPLATEK%';
```

```bash
# 3. Rollback kódu
git revert <commit-hash>
git push origin main

# 4. Rebuild frontend
cd apps/eeo-v2/client && npm run build

# 5. Restart Apache
sudo systemctl restart apache2
```

---

## ✅ DEPLOYMENT COMPLETE CHECKLIST

Po úspěšném nasazení zkontrolovat:

- [ ] SQL migrace proběhla bez errorů
- [ ] Tabulky `25a_rocni_poplatky` a `25a_rocni_poplatky_polozky` existují
- [ ] Číselníky (12 záznamů) jsou v `25_ciselnik_stavy`
- [ ] API endpoint `/annual-fees/stats` vrací valid JSON
- [ ] Frontend `/annual-fees` je dostupný (HTTP 200)
- [ ] Menu "Evidence ročních poplatků" je viditelné v BETA sekci (admin only)
- [ ] Vytvořen testovací měsíční poplatek s 12 položkami
- [ ] Rozbalování řádků funguje
- [ ] Aktualizace stavu položky přepočítá sumy
- [ ] Apache logy neobsahují errory
- [ ] Záloha PROD databáze uložena a ověřena

---

## 📞 KONTAKT PRO PODPORU

**V případě problémů:**
- Zkontrolovat logy: `/var/log/apache2/error.log`
- Zkontrolovat PHP errory: `/var/log/php/error.log`
- Rollback podle návodu výše
- Informovat development team

---

**Deployment připravil:** GitHub Copilot  
**Datum:** 27.1.2026  
**Verze dokumentu:** 1.0.0
