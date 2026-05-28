# 🚀 DEPLOYMENT CHECKLIST v2.57 → PRODUKCE
**Datum:** 28. května 2026  
**Verze:** 2.52 → 2.57  
**Branch:** `feature/v3-development`  
**Poslední commit:** `add66f47` - refaktor smlouvy/list s batch JSON_VALUE

---

## 📊 PŘEHLED ZMĚN

### 🔥 HLAVNÍ OPTIMALIZACE (dnes 28.5.)
- **Smlouvy/List Refaktor** (commit `add66f47`):
  - Nahrazení 10 korelovaných `LIKE+REPLACE` subselectů batch JSON_VALUE queries
  - Snížení DB práce z ~8 360 plných scanů na ~3 batch agregace
  - **Výsledek:** ~10× rychlejší načítání modulu smluv

### 🆕 NOVÉ FUNKCE (26-27.5.)
1. **LP Odbory** - faktury bez objednávky přiřazené k LP
2. **LP Auto-přepočet** - automatické přepočítání LP čerpání při změnách faktur
3. **LP Modul visibility** - filtrování LP podle modulu (objednávky/faktury/pokladna)
4. **LP Reverse věcná správnost** - zrušení VS vrací fakturu do stavu ZAEVIDOVANA

### 💾 DATABÁZOVÉ ZMĚNY
- **1× nová tabulka:** `25a_odbory_lp_prirazeni`
- **3× nové sloupce:**
  - `25_limitovane_prisliby.modul` (varchar(50))
  - `25_limitovane_prisliby_cerpani.cerpano_odbory_faktury` (decimal(15,2))
  - `25_limitovane_prisliby_cerpani.cerpano_odbory_pokladna` (decimal(15,2))

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1️⃣ GIT KONTROLA (DEV)
```bash
cd /var/www/erdms-dev/apps
git status  # mělo by být clean
git log --oneline -10
# Ověř poslední commit: add66f47 perf(smlouvy): refaktor list endpointu...
```

### 2️⃣ AKTUALIZACE VERZÍ (DEV) ✅ HOTOVO
- [x] `/var/www/erdms-dev/apps/eeo-v2/client/.env` → `2.57-DEV`
- [x] `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env` → `2.57-DEV`

### 3️⃣ BUILD DEV
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev:explicit
# Ověř verzi v build/version.json - mělo být 2.57-DEV
```

### 4️⃣ BUILD PROD
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:prod
# Ověř verzi v build-prod/version.json - mělo být 2.57
```

---

## 🔒 PRODUKČNÍ DEPLOYMENT

### ⚠️ KROK 0: ZÁLOHA PRODUKCE
```bash
# Vytvoř záložní adresář s datem
BACKUP_DIR="/var/www/__BCK_PRODUKCE/$(date +%Y%m%d_%H%M%S)_v2.57"
mkdir -p "$BACKUP_DIR"

# Záloha Frontend
echo "📦 Zálohování FE..."
rsync -av --progress \
  /var/www/erdms-platform/apps/eeo-v2/client/build/ \
  "$BACKUP_DIR/FE_build/"

# Záloha Backend
echo "📦 Zálohování BE..."
rsync -av --progress \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/ \
  "$BACKUP_DIR/BE_api-legacy/" \
  --exclude='*.log' \
  --exclude='vendor/'

# Záloha .env souborů
echo "📦 Zálohování .env..."
cp /var/www/erdms-platform/apps/eeo-v2/client/.env "$BACKUP_DIR/client.env.bck"
cp /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env "$BACKUP_DIR/api.env.bck"

# Záloha DB (export struktury + důležitá data)
echo "📦 Zálohování DB struktury..."
mysqldump -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' \
  --no-data eeo2025 > "$BACKUP_DIR/eeo2025_structure_only.sql"

echo "✅ Záloha dokončena: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

### 🗄️ KROK 1: MIGRACE PRODUKČNÍ DB

**⚠️ KRITICKÉ: Spustit PŘED deployem kódu!**

```bash
# 1a) Zobraz migrace k potvrzení
cat /var/www/erdms-dev/apps/eeo-v2/_sql/PROD_MIGRATION_v2.57_20260528.sql

# 1b) Spusť migrace
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 \
  < /var/www/erdms-dev/apps/eeo-v2/_sql/PROD_MIGRATION_v2.57_20260528.sql

# 1c) Ověř výsledek
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e "
  -- Ověř tabulku
  SELECT COUNT(*) as poc_odbory FROM 25a_odbory_lp_prirazeni;
  
  -- Ověř sloupce
  SHOW COLUMNS FROM 25_limitovane_prisliby LIKE 'modul';
  SHOW COLUMNS FROM 25_limitovane_prisliby_cerpani LIKE 'cerpano_odbory%';
"
```

**Očekávaný výstup:**
```
poc_odbory: 0
modul: varchar(50) | YES | MUL | op
cerpano_odbory_faktury: decimal(15,2) | YES | | 0.00
cerpano_odbory_pokladna: decimal(15,2) | YES | | 0.00
```

### 🎨 KROK 2: DEPLOY FRONTEND

```bash
# 2a) Rsync build-prod → produkce (BEZ --delete!)
rsync -av --progress \
  --exclude='.env' \
  --exclude='*.log' \
  /var/www/erdms-dev/apps/eeo-v2/client/build-prod/ \
  /var/www/erdms-platform/apps/eeo-v2/client/build/

# 2b) Ověř verzi v produkci
cat /var/www/erdms-platform/apps/eeo-v2/client/build/version.json
# Očekáváno: "version": "2.57"
```

### 🔧 KROK 3: DEPLOY BACKEND (PHP API)

```bash
# 3a) Rsync api-legacy → produkce (BEZ --delete!)
rsync -av --progress \
  --exclude='.env' \
  --exclude='*.log' \
  --exclude='vendor/' \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/ \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/

# 3b) Reload Apache
systemctl reload apache2

# 3c) Ověř verzi v produkci
grep "VERSION\|REACT_APP_VERSION" /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/api.php | head -3
```

### ⚙️ KROK 4: AKTUALIZACE PRODUKČNÍ .ENV

**⚠️ RUČNÍ EDIT - NEPOUŽÍVEJ RSYNC!**

```bash
# 4a) Edituj Frontend .env
nano /var/www/erdms-platform/apps/eeo-v2/client/.env
# ZMĚŇ: REACT_APP_VERSION=2.52 → REACT_APP_VERSION=2.57

# 4b) Edituj Backend .env
nano /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
# ZMĚŇ: REACT_APP_VERSION=2.52 → REACT_APP_VERSION=2.57

# 4c) Ověř změny
grep REACT_APP_VERSION /var/www/erdms-platform/apps/eeo-v2/client/.env
grep REACT_APP_VERSION /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
# Obě by měly ukazovat: 2.57
```

**❌ NEMĚŇ TYTO HODNOTY:**
- `DB_NAME=eeo2025` (produkce)
- `DB_HOST=10.3.174.11` (pokud je nastaveno jinak než DEV)
- `UPLOAD_ROOT_PATH=/var/www/erdms-data/`
- Žádné další cesty ani URL

---

## 🧪 POST-DEPLOYMENT OVĚŘENÍ

### 1️⃣ ZÁKLADNÍ FUNKCE
```bash
# Zkontroluj PHP error log (měl by být čistý)
tail -50 /var/www/erdms-dev/logs/php-error.log | grep -i "fatal\|error" || echo "✅ Žádné chyby"

# Test API health endpoint
curl -s https://erdms.zachranka.cz/api.eeo/system-info.php | jq '.version'
# Očekáváno: "2.57"
```

### 2️⃣ TESTOVACÍ SCÉNÁŘE

**A) Modul Smlouvy**
1. Otevři https://erdms.zachranka.cz/eeo-v2
2. Přejdi na Číselníky → Smlouvy
3. Zaškrtni "Načíst statistiky"
4. **Ověř:**
   - ✅ Načítání < 2 sekundy (místo 5-10 sec před)
   - ✅ Sloupce: Počet obj./fa, Čerpáno celkem, Čerpáno v procesu
   - ✅ Hodnoty odpovídají původním (rozdíly max ±5% kvůli cache refresh)

**B) LP Odbory**
1. Přejdi na Odbory → Faktury
2. Vyber fakturu BEZ objednávky
3. Otevři detail faktury
4. **Ověř:**
   - ✅ Dropdown "Přiřadit LP" je viditelný
   - ✅ Lze přiřadit LP odborové faktuře
   - ✅ LP badge ukazuje počet faktur

**C) LP Auto-přepočet**
1. Vytvoř novou fakturu na objednávce s LP
2. **Ověř:**
   - ✅ LP čerpání se automaticky aktualizovalo
   - ✅ V LP detailu je vidět nová faktura

**D) LP Reverse věcná správnost**
1. Najdi fakturu se stavem VECNA_SPRAVNOST
2. Zruš potvrzení věcné správnosti (checkbox OFF)
3. **Ověř:**
   - ✅ Stav faktury se změnil na ZAEVIDOVANA
   - ✅ LP čerpání se přepočítalo (předpoklad → 0)

---

## 🔄 ROLLBACK POSTUP (v případě problémů)

### RYCHLÝ ROLLBACK (do 15 minut)
```bash
# Najdi poslední zálohu
LAST_BACKUP=$(ls -td /var/www/__BCK_PRODUKCE/*_v2.57 | head -1)
echo "Rollback z: $LAST_BACKUP"

# Obnov FE
rsync -av --delete \
  "$LAST_BACKUP/FE_build/" \
  /var/www/erdms-platform/apps/eeo-v2/client/build/

# Obnov BE
rsync -av --delete \
  "$LAST_BACKUP/BE_api-legacy/" \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/

# Obnov .env
cp "$LAST_BACKUP/client.env.bck" /var/www/erdms-platform/apps/eeo-v2/client/.env
cp "$LAST_BACKUP/api.env.bck" /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env

# Reload Apache
systemctl reload apache2

# DB rollback (pouze pokud nutné - změny jsou additive-only)
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e "
  DROP TABLE IF EXISTS 25a_odbory_lp_prirazeni;
  ALTER TABLE 25_limitovane_prisliby DROP COLUMN modul;
  ALTER TABLE 25_limitovane_prisliby_cerpani DROP COLUMN cerpano_odbory_faktury;
  ALTER TABLE 25_limitovane_prisliby_cerpani DROP COLUMN cerpano_odbory_pokladna;
"
```

---

## 📋 FINÁLNÍ OVĚŘENÍ

- [ ] FE verze: `2.57` (zobrazeno v footeru aplikace)
- [ ] BE verze: `2.57` (system-info.php)
- [ ] DB migrace: ✅ (tabulka + sloupce existují)
- [ ] Smlouvy modul: ⚡ (rychlé načítání)
- [ ] LP odbory: ✅ (funkční přiřazení)
- [ ] LP auto-přepočet: ✅ (po změně faktury)
- [ ] Žádné chyby v PHP error logu
- [ ] Žádné chyby v browser console

---

## 📞 KONTAKT V PŘÍPADĚ PROBLÉMŮ

**Immediate rollback:** Použij postup výše  
**Nejčastější problémy:**
1. **500 Error** → zkontroluj PHP error log + ověř DB migrace
2. **404 na FE** → ověř rsync FE buildu
3. **Pomalé načítání smluv** → zkontroluj `include_stats` parameter v API volání

**Log files:**
- PHP: `/var/www/erdms-dev/logs/php-error.log`
- Apache: `/var/log/apache2/error.log`
- Browser: F12 → Console

---

**✅ DEPLOYMENT READY - ČEKÁ NA POTVRZENÍ UŽIVATELE**
