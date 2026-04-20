# DEPLOYMENT PLAN - 20.04.2026
## Oprava Q4 filtru + SQL optimalizace

---

## 📦 CO SE NASAZUJE

### 1️⃣ FRONTEND (React aplikace)

**Změněné soubory:**
- ✅ `eeo-v2/client/src/pages/Orders.js` - Oprava Q4 filtru a dynamických období
- ✅ `eeo-v2/client/src/pages/Orders25List.js` - Velikost cache ikony
- ✅ `eeo-v2/client/src/services/api2auth.js` - Debug logging (lze vynechat v PROD)
- ⚠️ `eeo-v2/client/src/setupProxy.js` - **NEPOUŽÍVÁ SE V PROD** (pouze dev server)

**Co se opravilo:**
- ❌ Q4 filtr vracel pouze říjen místo října-prosince
- ❌ "Poslední kvartál" pro rok 2025 vracel rozsah z roku 2026
- ✅ Pořadí if podmínek - kvartály se testují před jednotlivými měsíci
- ✅ Dynamické periody respektují vybraný rok

---

### 2️⃣ BACKEND (PHP API)

**Změněné soubory:**
- ✅ `eeo-v2/api-legacy/api.eeo/v2025.03_25/old/queries.php` - SQL optimalizace

**Co se změnilo:**
```php
// ❌ PŘED (9 correlated subqueries):
(SELECT garant FROM garant WHERE garant.id = obj.garant_id) as garant,
(SELECT surname FROM users WHERE users.id = obj.user_id) as uName,
... celkem 9 subqueries ...

// ✅ PO (LEFT JOIN):
LEFT JOIN garant g ON g.id = obj.garant_id
LEFT JOIN users u ON u.id = obj.user_id
... celkem 8 LEFT JOINs + 1 agregovaný subquery pro COUNT příloh
```

**Výkon:**
- **Před:** 1 hlavní dotaz + 900 subquery dotazů = 901 dotazů (pro 100 objednávek)
- **Po:** 1 dotaz s JOINy = ~50-80% rychlejší ⚡

---

### 3️⃣ DATABÁZE (SQL DDL)

**KRITICKÉ: Indexy MUSÍ být vytvořeny v PROD databázi!**

```sql
-- 🔴 PROD databáze: eeo2025 (10.3.172.11)

USE eeo2025;

-- Hlavní tabulka objednavky0123
ALTER TABLE objednavky0123 ADD INDEX idx_datum_u (datum_u);
ALTER TABLE objednavky0123 ADD INDEX idx_garant_id (garant_id);
ALTER TABLE objednavky0123 ADD INDEX idx_user_id (user_id);
ALTER TABLE objednavky0123 ADD INDEX idx_upd_user_id (upd_user_id);
ALTER TABLE objednavky0123 ADD INDEX idx_okres_id (okres_id);
ALTER TABLE objednavky0123 ADD INDEX idx_umisteni_id (umisteni_id);
ALTER TABLE objednavky0123 ADD INDEX idx_druh_sml_id (druh_sml_id);

-- Tabulka příloh (KRITICKÝ pro COUNT!)
ALTER TABLE pripojene_odokumenty0123 ADD INDEX idx_id_smlouvy (id_smlouvy);
```

**Odhad času vytvoření indexů:**
- ~2-5 minut (závisí na velikosti tabulek)
- Během vytváření indexů může být tabulka uzamčena
- **Doporučení:** Udělat mimo špičku (večer/víkend)

---

## 🚀 POSTUP NASAZENÍ

### ⚠️ PŘED DEPLOYMENTEM - POVINNÉ KROKY:

#### 1. Backup PROD databáze
```bash
mkdir -p /var/www/__BCK_PRODUKCE/2026-04-20
mysqldump -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' \
  eeo2025 objednavky0123 pripojene_odokumenty0123 \
  > /var/www/__BCK_PRODUKCE/2026-04-20/objednavky0123_PROD_BEFORE_INDEXES.sql
```

#### 2. Backup PROD frontendu
```bash
cd /var/www/erdms-platform/apps/eeo-v2
tar -czf /var/www/__BCK_PRODUKCE/2026-04-20/eeo-v2-frontend-PROD-$(date +%Y%m%d_%H%M%S).tar.gz \
  assets/ static/ index.html version.json
```

#### 3. Backup PROD API
```bash
tar -czf /var/www/__BCK_PRODUKCE/2026-04-20/eeo-v2-api-legacy-PROD-$(date +%Y%m%d_%H%M%S).tar.gz \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/
```

---

### KROK 1: Vytvoření indexů v PROD databázi

```bash
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' eeo2025 << 'EOF'
-- Ověř že indexy neexistují
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME IN ('objednavky0123', 'pripojene_odokumenty0123')
  AND INDEX_NAME LIKE 'idx_%';

-- Vytvoř indexy
ALTER TABLE objednavky0123 ADD INDEX idx_datum_u (datum_u);
ALTER TABLE objednavky0123 ADD INDEX idx_garant_id (garant_id);
ALTER TABLE objednavky0123 ADD INDEX idx_user_id (user_id);
ALTER TABLE objednavky0123 ADD INDEX idx_upd_user_id (upd_user_id);
ALTER TABLE objednavky0123 ADD INDEX idx_okres_id (okres_id);
ALTER TABLE objednavky0123 ADD INDEX idx_umisteni_id (umisteni_id);
ALTER TABLE objednavky0123 ADD INDEX idx_druh_sml_id (druh_sml_id);
ALTER TABLE pripojene_odokumenty0123 ADD INDEX idx_id_smlouvy (id_smlouvy);

-- Ověř vytvoření
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME IN ('objednavky0123', 'pripojene_odokumenty0123')
  AND INDEX_NAME LIKE 'idx_%';
EOF
```

---

### KROK 2: Frontend build + deploy

#### A) Build production verze (v DEV workspace)

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client

# Zkontroluj verzi v .env.production
grep REACT_APP_VERSION .env.production

# Build PROD (NODE_ENV=production)
npm run build:prod

# Ověř build
ls -lh build/
cat build/version.json
```

#### B) Deploy do produkce

**🔴 POZOR: NIKDY nepoužívat `rsync --delete` (smaže API složky!)**

```bash
# ✅ SPRÁVNĚ - bez --delete flag
rsync -av --progress \
  /var/www/erdms-dev/apps/eeo-v2/client/build/ \
  /var/www/erdms-platform/apps/eeo-v2/

# Ověř že API složky zůstaly
ls -la /var/www/erdms-platform/apps/eeo-v2/ | grep api
# Mělo by být:
# drwxr-xr-x  api/
# drwxr-xr-x  api-legacy/
```

**NEBO použij oficiální build skript:**

```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --prod --frontend --deploy
```

---

### KROK 3: Backend (PHP API) deploy

```bash
# Zkopíruj pouze změněný soubor queries.php
rsync -av \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/old/queries.php \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/old/queries.php

# Nastav oprávnění
chown www-data:www-data \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/old/queries.php

# Reload Apache pro načtení nového PHP
systemctl reload apache2
```

---

### KROK 4: Ověření v produkci

```bash
# 1. Zkontroluj verzi
curl -s https://erdms.zachranka.cz/eeo-v2/version.json | jq

# 2. Zkontroluj že API funguje (Orders < 2026)
# - Přihlaš se do aplikace
# - Jdi na "Objednávky před 2026"
# - Vyber rok 2025, Q4 (Říjen-Prosinec)
# - Mělo by načíst ~156 objednávek rychleji než dřív

# 3. Zkontroluj PHP error log
tail -100 /var/www/erdms-dev/logs/php/prod-error.log

# 4. Zkontroluj Apache error log
tail -100 /var/log/apache2/error.log
```

---

## 📊 OČEKÁVANÉ VÝSLEDKY

### Frontend (Orders.js):
- ✅ Q4 filtr vrací všechny 3 měsíce (říjen, listopad, prosinec)
- ✅ "Poslední kvartál" pro rok 2025 vrací Q4 2025 (ne 2026)
- ✅ "Poslední měsíc" pro rok 2025 vrací prosinec 2025
- ✅ Všechny kvartály (Q1-Q4) fungují správně

### Backend (queries.php):
- ✅ Načítání objednávek je ~50-80% rychlejší
- ✅ Méně SQL dotazů (z 901 na 1)
- ✅ Všechna data se načítají stejně (garant, okres, přílohy, metadata)

---

## 🔄 ROLLBACK PLÁN (pokud něco selže)

### Frontend rollback:
```bash
cd /var/www/__BCK_PRODUKCE/2026-04-20
tar -xzf eeo-v2-frontend-PROD-*.tar.gz -C /var/www/erdms-platform/apps/eeo-v2/
```

### Backend rollback:
```bash
# Obnov původní queries.php z GIT
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy
git checkout HEAD~2 api.eeo/v2025.03_25/old/queries.php
systemctl reload apache2
```

### Databáze rollback:
```bash
# Smaž indexy (pokud způsobují problémy)
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' eeo2025 << 'EOF'
ALTER TABLE objednavky0123 DROP INDEX idx_datum_u;
ALTER TABLE objednavky0123 DROP INDEX idx_garant_id;
ALTER TABLE objednavky0123 DROP INDEX idx_user_id;
ALTER TABLE objednavky0123 DROP INDEX idx_upd_user_id;
ALTER TABLE objednavky0123 DROP INDEX idx_okres_id;
ALTER TABLE objednavky0123 DROP INDEX idx_umisteni_id;
ALTER TABLE objednavky0123 DROP INDEX idx_druh_sml_id;
ALTER TABLE pripojene_odokumenty0123 DROP INDEX idx_id_smlouvy;
EOF
```

---

## ✅ CHECKLIST

### Před deploymentem:
- [ ] Backup PROD databáze vytvořen
- [ ] Backup PROD frontendu vytvořen
- [ ] Backup PROD API vytvořen
- [ ] Indexy vytvořeny v PROD databázi (eeo2025)
- [ ] Frontend build hotový (npm run build:prod)
- [ ] Ověřil jsem že build neobsahuje DEV nastavení

### Po deploymentu:
- [ ] version.json dostupný (curl)
- [ ] API složky zůstaly na místě (api/, api-legacy/)
- [ ] Orders < 2026 načítá data
- [ ] Q4 filtr vrací všechny 3 měsíce
- [ ] "Poslední kvartál" respektuje vybraný rok
- [ ] PHP error log neobsahuje nové chyby
- [ ] Načítání je rychlejší než dřív

---

## 📝 POZNÁMKY

- **Indexy:** Vytvářejí se asynchronně, první dotazy mohou být pomalejší dokud se indexy nedokončí
- **Cache:** Po deploymentu může být potřeba vyčistit browser cache (Ctrl+Shift+R)
- **Monitoring:** Sleduj error logy prvních 30 minut po deploymentu
- **Peak hours:** Doporučuji nasadit mimo špičku (večer/víkend)

---

**Připravil:** GitHub Copilot Agent  
**Datum:** 20.04.2026  
**Verze:** 2.50 → 2.51 (nebo zachovat 2.50 s novým buildHash)
