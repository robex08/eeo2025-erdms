# 🚀 Migrace databáze evidence_smluv → eeo2025

**Datum:** 4. prosince 2025  
**Zdroj:** MySQL 5.5.46 (10.1.1.253) - databáze `evidence_smluv`  
**Cíl:** MariaDB 11.8.3 (10.3.172.11) - databáze `eeo2025`  
**Velikost:** ~40-45 MB (92 tabulek, 51 FK vztahů)

---

## 📋 PŘEHLED DATABÁZE

### Statistiky
```
Celkem tabulek:           92
Foreign keys:             51 vazeb
Největší tabulka:         25a_objednavky (6.81 MB, 9593 řádků)
Celková velikost:         ~40-45 MB
```

### Kategorie tabulek

#### ✅ K IMPORTU (aktivní tabulky)
```
📋 HLAVNÍ APLIKACE (prefix 25_): ~60 tabulek
├─ Smlouvy, objednávky, limitované příslíby
├─ Chat systém (8 tabulek)
├─ Notifikace (4 tabulky)
├─ Uživatelé, role, práva (9 tabulek)
└─ Číselníky, dodavatelé, lokality

💰 POKLADNA (prefix 25a_): ~12 tabulek
├─ Pokladny, faktury, audit
└─ Vazby na objednávky

🗂️ LEGACY STRUKTURA (bez prefixu): ~15 tabulek
├─ smlouvy, partner, majetek
├─ users, groups, rights
└─ druh_smlouvy, garant, okresy
```

#### ❌ VYNECHAT (neimportujeme)
```
🚫 25_objednavky                    (požadavek uživatele)
🚫 *_bck, *_backup                  (zálohy)
🚫 *_OLD, *_old                     (staré verze)
🚫 *_test                           (testovací data)
🚫 DEMO_*                           (demo data)
```

### Seznam vynechaných tabulek
```
25_limitovane_prisliby_OLD
25_notification_templates_bck
25_role_prava_bck
25_uzivatele_test
25a_objednavky_bck
25a_objednavky_polozky_bck
25a_pokladny_uzivatele_backup
DEMO_objednavky_2025
DEMO_pripojene_odokumenty
smlouvy_bck_02-2016
users_bck_12-2023
25_objednavky (+ vazby)
25_objednavky_polozky
25_objednavky_prilohy
```

---

## 🔧 PŘÍPRAVA

### 1. Připojení na zdrojový MySQL
```bash
mysql -h 10.1.1.253 -u root -p'CHANGE_ME_LEGACY_DB_PASSWORD' --skip-ssl evidence_smluv
```

### 2. Připojení na cílovou MariaDB
```bash
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' eeo2025
```

---

## 📦 FÁZE 2: VYTVOŘENÍ CÍLOVÉ DATABÁZE

### Krok 2.1: Vytvoření databáze
```sql
CREATE DATABASE eeo2025 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_czech_ci;
```

### Krok 2.2: Grant práv
```sql
GRANT ALL PRIVILEGES ON eeo2025.* TO 'erdms_user'@'%';
FLUSH PRIVILEGES;
```

### Krok 2.3: Ověření
```sql
SHOW DATABASES LIKE 'eeo2025';
```

---

## 📥 FÁZE 3: EXPORT ZE STARÉHO MYSQL

### Strategie
Rozdělíme dump na 3 části pro bezpečnost a přehlednost:

#### 3.1: Dump struktury (bez dat)
```bash
mysqldump -h 10.1.1.253 -u root -p'CHANGE_ME_LEGACY_DB_PASSWORD' --skip-ssl \
  --no-data \
  --routines \
  --triggers \
  evidence_smluv > /tmp/eeo2025_schema.sql
```

**Očekávaný výstup:**
- Soubor: `/tmp/eeo2025_schema.sql` (~500 KB)
- Obsahuje: CREATE TABLE, FK, triggery, procedury

#### 3.2: Filtrování struktury (manuální editace)
```bash
# Otevřít soubor a odstranit:
# - DROP TABLE / CREATE TABLE pro 25_objednavky
# - DROP TABLE / CREATE TABLE pro všechny *_bck, *_OLD, DEMO_*, r_*
# - Foreign keys odkazující na 25_objednavky
```

**Tabulky k odstranění ze schema dumpu:**
```
25_objednavky
25_objednavky_polozky
25_objednavky_prilohy
(+ všechny z kategorie "VYNECHAT" výše)
```

#### 3.3: Dump dat (po tabulkách)
Pro velké tabulky zvlášť:

**Velké tabulky (jednotlivě):**
```bash
# 25a_objednavky (6.81 MB)
mysqldump -h 10.1.1.253 -u root -p'CHANGE_ME_LEGACY_DB_PASSWORD' --skip-ssl \
  --no-create-info --skip-triggers \
  evidence_smluv 25a_objednavky > /tmp/eeo2025_data_25a_objednavky.sql

# 25a_objednavky_prilohy (4.52 MB)
mysqldump -h 10.1.1.253 -u root -p'CHANGE_ME_LEGACY_DB_PASSWORD' --skip-ssl \
  --no-create-info --skip-triggers \
  evidence_smluv 25a_objednavky_prilohy > /tmp/eeo2025_data_25a_objednavky_prilohy.sql

# 25a_objednavky_polozky (1.98 MB)
mysqldump -h 10.1.1.253 -u root -p'CHANGE_ME_LEGACY_DB_PASSWORD' --skip-ssl \
  --no-create-info --skip-triggers \
  evidence_smluv 25a_objednavky_polozky > /tmp/eeo2025_data_25a_objednavky_polozky.sql

# 25_notifications (1.75 MB)
mysqldump -h 10.1.1.253 -u root -p'CHANGE_ME_LEGACY_DB_PASSWORD' --skip-ssl \
  --no-create-info --skip-triggers \
  evidence_smluv 25_notifications > /tmp/eeo2025_data_25_notifications.sql
```

**Malé a střední tabulky (hromadně):**
```bash
# Všechny ostatní aktivní tabulky (kromě vynechaných)
mysqldump -h 10.1.1.253 -u root -p'CHANGE_ME_LEGACY_DB_PASSWORD' --skip-ssl \
  --no-create-info --skip-triggers \
  --ignore-table=evidence_smluv.25_objednavky \
  --ignore-table=evidence_smluv.25_objednavky_polozky \
  --ignore-table=evidence_smluv.25_objednavky_prilohy \
  --ignore-table=evidence_smluv.25a_objednavky \
  --ignore-table=evidence_smluv.25a_objednavky_prilohy \
  --ignore-table=evidence_smluv.25a_objednavky_polozky \
  --ignore-table=evidence_smluv.25_notifications \
  [... všechny _bck, _OLD, DEMO_, r_* tabulky] \
  evidence_smluv > /tmp/eeo2025_data_ostatni.sql
```

---

## 📤 FÁZE 4: IMPORT DO NOVÉ MARIADB

### 4.1: Import struktury
```bash
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' \
  eeo2025 < /tmp/eeo2025_schema.sql
```

**Kontrola:**
```sql
USE eeo2025;
SHOW TABLES;
-- Očekáváno: ~60 tabulek (bez _bck, _OLD, DEMO_, r_*, 25_objednavky)
```

### 4.2: Dočasné vypnutí FK kontrol
```sql
SET FOREIGN_KEY_CHECKS = 0;
```

### 4.3: Import dat - velké tabulky
```bash
# Postupně každou velkou tabulku
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' \
  eeo2025 < /tmp/eeo2025_data_25a_objednavky.sql

mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' \
  eeo2025 < /tmp/eeo2025_data_25a_objednavky_prilohy.sql

mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' \
  eeo2025 < /tmp/eeo2025_data_25a_objednavky_polozky.sql

mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' \
  eeo2025 < /tmp/eeo2025_data_25_notifications.sql
```

### 4.4: Import dat - ostatní tabulky
```bash
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' \
  eeo2025 < /tmp/eeo2025_data_ostatni.sql
```

### 4.5: Zapnutí FK kontrol zpět
```sql
SET FOREIGN_KEY_CHECKS = 1;
```

### 4.6: Kontrola FK integrity
```sql
SELECT TABLE_NAME, CONSTRAINT_NAME 
FROM information_schema.TABLE_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = 'eeo2025' 
  AND CONSTRAINT_TYPE = 'FOREIGN KEY';
```

---

## ✅ FÁZE 5: VALIDACE

### 5.1: Porovnání počtu tabulek
```sql
-- Starý MySQL
SELECT COUNT(*) AS pocet_tabulek 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'evidence_smluv';

-- Nová MariaDB
SELECT COUNT(*) AS pocet_tabulek 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'eeo2025';
```

**Očekávaný rozdíl:**
- Starý: 92 tabulek
- Nový: ~60 tabulek (vynechány _bck, _OLD, DEMO_, r_*, 25_objednavky)

### 5.2: Porovnání počtu řádků (TOP tabulky)
```sql
-- Starý MySQL
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'evidence_smluv' 
  AND TABLE_NAME IN ('25a_objednavky', '25_uzivatele', '25_smlouvy')
ORDER BY TABLE_NAME;

-- Nová MariaDB
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'eeo2025' 
  AND TABLE_NAME IN ('25a_objednavky', '25_uzivatele', '25_smlouvy')
ORDER BY TABLE_NAME;
```

**Očekáváno:**
| Tabulka | Starý MySQL | Nová MariaDB |
|---------|-------------|--------------|
| 25a_objednavky | 9593 | 9593 |
| 25_uzivatele | ? | ? |
| 25_smlouvy | ? | ? |

### 5.3: Test SELECT z aplikace
```javascript
// Node.js test
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '10.3.172.11',
  user: 'erdms_user',
  password: 'CHANGE_ME_DB_PASSWORD',
  database: 'eeo2025',
  charset: 'utf8mb4'
});

async function testConnection() {
  const [rows] = await pool.query('SELECT COUNT(*) as total FROM 25_uzivatele');
  console.log('✅ Uživatelů v nové DB:', rows[0].total);
  
  const [objednavky] = await pool.query('SELECT COUNT(*) as total FROM 25a_objednavky');
  console.log('✅ Objednávek v nové DB:', objednavky[0].total);
}

testConnection();
```

---

## ⚙️ FÁZE 6: UPDATE KONFIGURACE

### 6.1: Backup .env
```bash
cp /var/www/eeo2025/server/.env /var/www/eeo2025/server/.env.backup_$(date +%Y%m%d_%H%M%S)
```

### 6.2: Update .env
```env
# =============================================================================
# EEO2025 APLIKACE - Nová databáze (migrace z evidence_smluv)
# =============================================================================
# Migrace z MySQL 5.5.46 (10.1.1.253) → MariaDB 11.8.3 (10.3.172.11)
# Datum migrace: 4. prosince 2025
#
EEO_DB_HOST=10.3.172.11
EEO_DB_PORT=3306
EEO_DB_NAME=eeo2025
EEO_DB_USER=erdms_user
EEO_DB_PASSWORD=CHANGE_ME_DB_PASSWORD
EEO_DB_CHARSET=utf8mb4
EEO_DB_COLLATION=utf8mb4_czech_ci
# =============================================================================

# =============================================================================
# PŮVODNÍ EEO APLIKACE - MySQL 5.5.46 (Legacy Database - POUZE PRO REFERENCI)
# =============================================================================
# POZOR: Toto jsou staré přihlašovací údaje k původní databázi
# Používá se POUZE pro dump/migrace nebo emergency rollback
# Server: 10.1.1.253 (starý MySQL server)
# Databáze: evidence_smluv
# 
EEO_LEGACY_DB_HOST=10.1.1.253
EEO_LEGACY_DB_PORT=3306
EEO_LEGACY_DB_NAME=evidence_smluv
EEO_LEGACY_DB_USER=root
EEO_LEGACY_DB_PASSWORD=CHANGE_ME_LEGACY_DB_PASSWORD
# =============================================================================
```

---

## 🔒 BEZPEČNOSTNÍ OPATŘENÍ

### ✅ CO DĚLÁME
1. ✅ Starý server PONECHÁVÁME nedotčený (read-only backup)
2. ✅ Postupný import s kontrolami po každé tabulce
3. ✅ FK kontroly vypnuté během importu, zapnuté po dokončení
4. ✅ Backup .env před změnou konfigurace
5. ✅ Validace dat před spuštěním aplikace

### 🚫 CO NEDĚLÁME
1. ❌ NEMAŽEME starý MySQL server 10.1.1.253
2. ❌ NEPŘEPISUJEME původní databázi evidence_smluv
3. ❌ NESPOUŠTÍME aplikaci před validací
4. ❌ NEMODIFIKUJEME strukturu (1:1 migrace)

---

## 🐛 ŘEŠENÍ PROBLÉMŮ

### Chyba: FK constraint fails
**Příčina:** Import dat před strukturou nebo chybějící parent záznamy

**Řešení:**
```sql
-- Vypnout FK kontroly
SET FOREIGN_KEY_CHECKS = 0;

-- Reimportovat data
SOURCE /tmp/eeo2025_data_XXX.sql;

-- Zapnout FK kontroly zpět
SET FOREIGN_KEY_CHECKS = 1;

-- Najít broken FK
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = '25_objednavky';
```

### Chyba: Access denied
**Příčina:** erdms_user nemá práva na CREATE DATABASE

**Řešení:**
```bash
# Použít root účet na MariaDB
mysql -h 10.3.172.11 -u root -p
```

### Chyba: Character set conversion
**Příčina:** Rozdíl mezi MySQL 5.5 a MariaDB 11.8 v utf8mb4

**Řešení:**
```sql
-- Nastavit charset při importu
SET NAMES utf8mb4;
SET CHARACTER_SET_CLIENT = utf8mb4;
SET CHARACTER_SET_RESULTS = utf8mb4;
```

---

## 📊 MONITORING PRŮBĚHU

### Checkpoint 1: Po vytvoření databáze
```
✅ Databáze eeo2025 vytvořena
✅ Práva pro erdms_user nastavena
```

### Checkpoint 2: Po importu struktury
```
✅ Schema importována
✅ ~60 tabulek vytvořeno
✅ FK definované
```

### Checkpoint 3: Po importu dat
```
✅ Velké tabulky naimportovány (25a_objednavky, prilohy, polozky)
✅ Ostatní tabulky naimportovány
✅ FK kontroly prošly
```

### Checkpoint 4: Po validaci
```
✅ Počet řádků odpovídá originálu
✅ SELECT dotazy fungují
✅ FK integrity OK
```

### Checkpoint 5: Po update .env
```
✅ .env aktualizován
✅ Aplikace připojená na novou DB
✅ Test připojení OK
```

---

## 📞 KONTAKT

**Migrace provedena:** GitHub Copilot + Robert Holovský  
**Server:** akd-www-web01.zachranka.cz  
**Dokumentace:** /var/www/eeo2025/docs/MIGRACE_EEO2025.md

---

## 📊 AKTUÁLNÍ STAV MIGRACE

### ✅ DOKONČENO

**Fáze 1: PŘÍPRAVA A ANALÝZA**
```
✅ Připojení na starý MySQL 5.5.46 (10.1.1.253) - OK
✅ Analýza databáze evidence_smluv
   ├─ 92 tabulek celkem
   ├─ 51 foreign keys
   ├─ Největší: 25a_objednavky (6.81 MB, 9593 řádků)
   └─ Celková velikost: ~40-45 MB
✅ Identifikace tabulek k vynechání (30 tabulek)
   ├─ 25_objednavky + přílohy + položky
   ├─ *_bck, *_OLD, *_backup (zálohy)
   ├─ DEMO_* (demo data)
   └─ r_* (reporting tabulky)
```

**Fáze 2: VYTVOŘENÍ CÍLOVÉ DATABÁZE**
```
✅ GRANT pro phpmyadmin@10.3.174.11 vytvořen
✅ Databáze eeo2025 vytvořena (utf8mb4_czech_ci)
✅ Práva pro erdms_user@10.3.174.11 nastavena
✅ Práva pro erdms_user@akd-www-web01 nastavena
```

**Fáze 3: EXPORT STRUKTURY**
```
✅ Vytvořen vlastní bash script pro export (/tmp/export_schema.sh)
   Důvod: mysqldump nefunguje s MySQL 5.5.46 (generation_expression error)
✅ Export pomocí SHOW CREATE TABLE
   ├─ 62 tabulek exportováno
   ├─ 30 tabulek vynecháno
   ├─ Soubor: /tmp/eeo2025_schema.sql
   ├─ Velikost: 87 KB
   └─ Řádků: 460
```

**Fáze 4.1: IMPORT STRUKTURY**
```
✅ Schema importována do eeo2025
✅ Vytvořeno 64 tabulek (62 + 2 pomocné)
✅ Foreign keys vytvořeny
✅ Indexy vytvořeny
```

---

### ✅ FÁZE A DOKONČENA: LEGACY TABULKY

**Export/Import metoda:**
```
✅ MySQL CONCAT() + QUOTE() pro bezpečné escapování
   Důvod: mysqldump selže s MySQL 5.5.46 (generation_expression error)
✅ Automatický bash script: /tmp/migrate_legacy_tables.sh
   ├─ Generuje INSERT statements s QUOTE()
   ├─ Export + Import + Validace počtu řádků
   └─ Detailní logování průběhu
✅ Fallback: mysqldump --hex-blob --default-character-set=utf8mb4
   Pro tabulky s collation konfliktem (majetek, menu)
```

**Výsledky FÁZE A:**
```
✅ 36 LEGACY tabulek (bez prefixu 25_/25a_) - DOKONČENO
   ├─ druh_smlouvy, garant, groups, locations (28+10+15+40 řádků)
   ├─ majetek, majetek_duvod, map_okresy, menu (9+4+19+10 řádků)
   ├─ objednavky* verze (61+2933+3169+1895+4933+1375+2516 řádků)
   ├─ partner, pripojene_dokumenty, pripojene_odokumenty* (209+2790+29k řádků)
   ├─ r_* reporting tabulky (38+34+2+24+4 řádků)
   ├─ smlouvy, umisteni, users, user_location (2291+52+94 řádků)
   └─ Celkem: ~50,000 řádků, ~19 MB dat
⏱️ Čas: 43 sekund
📄 Log: /tmp/migration_legacy_20251204_081236.log
```

---

### ⏳ ZBÝVÁ DOKONČIT

**FÁZE B: HLAVNÍ APLIKACE (prefix 25_ a 25a_)**
```
⏳ Export dat tabulek s prefixem 25_
⏳ Export dat tabulek s prefixem 25a_
⏳ Import do nové MariaDB
⏳ Validace počtu řádků
```

**Fáze 5: VALIDACE**
```
⏳ Porovnat počet řádků (starý vs. nový)
⏳ Zkontrolovat FK integrity
⏳ Test SELECT dotazů z aplikace
```

**Fáze 6: KONFIGURACE**
```
⏳ Backup .env
⏳ Update .env s EEO_DB_* proměnnými
⏳ Test připojení aplikace na novou DB
```

---

## ✅ Checklist migrace

- [x] Fáze 1: Analýza dokončena (92 tabulek, 51 FK)
- [x] Fáze 2: Databáze eeo2025 vytvořena
- [x] Fáze 2: Práva pro erdms_user nastavena
- [x] Fáze 3.1: Schema dump vytvořen (vlastní bash script)
- [x] Fáze 3.2: Schema vyčištěn (vynechány _bck, _OLD, DEMO_, r_*, 25_objednavky)
- [ ] Fáze 3.3: Data dump vytvořen (velké tabulky zvlášť)
- [x] Fáze 4.1: Schema importována do eeo2025 (64 tabulek)
- [ ] Fáze 4.2: FK kontroly vypnuty
- [ ] Fáze 4.3: Velké tabulky naimportovány
- [ ] Fáze 4.4: Ostatní tabulky naimportovány
- [ ] Fáze 4.5: FK kontroly zapnuty zpět
- [ ] Fáze 4.6: FK integrity zkontrolována
- [ ] Fáze 5.1: Počet tabulek ověřen
- [ ] Fáze 5.2: Počet řádků porovnán
- [ ] Fáze 5.3: Test SELECT z aplikace OK
- [ ] Fáze 6.1: .env zálohován
- [ ] Fáze 6.2: .env aktualizován s EEO_DB_* proměnnými
- [ ] Validace: Aplikace funguje s novou DB
- [x] Dokumentace: MIGRACE_EEO2025.md vytvořena

---

**Verze dokumentu:** 1.0  
**Poslední update:** 4. prosince 2025
