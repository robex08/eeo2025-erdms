# 📋 CHANGELOG - Roční poplatky V1.1

**Datum:** 30. ledna 2026  
**Modul:** Evidence ročních poplatků  
**Verze:** 1.0 → 1.1  
**Databáze DEV:** EEO-OSTRA-DEV ✅ HOTOVO  
**Databáze PROD:** eeo2025 ⏳ PŘIPRAVENO  

---

## 🎯 PŘEHLED ZMĚN

### 1️⃣ Hlavní tabulka `25a_rocni_poplatky`

#### ✅ Přidáno pole `poznamka`
```sql
ALTER TABLE `25a_rocni_poplatky`
ADD COLUMN `poznamka` TEXT NULL COMMENT 'Poznámka k ročnímu poplatku'
AFTER `popis`;
```

**Použití:**
- Volitelné poznámky k celému ročnímu poplatku
- Text bez omezení délky
- Zobrazí se v UI hlavního řádku

#### ✅ Potvrzeno: Existující pole
- `rok` (YEAR) - již v tabulce ✅
- `druh` (VARCHAR(50), default='JINE') - beze změny ✅
- `platba` (VARCHAR(50), default='MESICNI') - beze změny ✅

---

### 2️⃣ Nová tabulka `25a_rocni_poplatky_prilohy`

#### 🆕 Struktura
```sql
CREATE TABLE `25a_rocni_poplatky_prilohy` (
  `id` INT(10) UNSIGNED AUTO_INCREMENT,
  `rocni_poplatek_id` INT(10) UNSIGNED NOT NULL,
  `guid` VARCHAR(50) NULL,
  `typ_prilohy` VARCHAR(50) NULL,
  `originalni_nazev_souboru` VARCHAR(255) NOT NULL,
  `systemova_cesta` VARCHAR(255) NOT NULL,
  `velikost_souboru_b` INT(10) UNSIGNED NULL,
  `nahrano_uzivatel_id` INT(10) UNSIGNED NULL,
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` DATETIME NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`rocni_poplatek_id`) REFERENCES `25a_rocni_poplatky` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`nahrano_uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
);
```

**Vlastnosti:**
- ✅ Přílohy vztaženy k **hlavnímu řádku** (ne k podřádkům)
- ✅ Prefix při ukládání: **"rp"** (roční poplatek)
- ✅ Podle vzoru tabulek `25a_objednavky_prilohy` a `25a_faktury_prilohy`
- ✅ CASCADE delete - smazání ročního poplatku = smazání příloh

**Ukládání souborů:**
```
/var/www/erdms-dev/data/eeo-v2/prilohy/rp/{guid}_{nazev_souboru}
```

---

## 📊 AKTUÁLNÍ STAV DATABÁZE

### DEV (EEO-OSTRA-DEV) ✅

```
mysql> SHOW TABLES LIKE '25a_rocni_poplatky%';
+-------------------------------------+
| Tables_in_EEO-OSTRA-DEV             |
+-------------------------------------+
| 25a_rocni_poplatky                  |
| 25a_rocni_poplatky_polozky          |
| 25a_rocni_poplatky_prilohy          | ← NOVÉ
+-------------------------------------+

mysql> DESCRIBE 25a_rocni_poplatky;
+----------------------------+------------------+------+-----+-------------+
| Field                      | Type             | Null | Key | Default     |
+----------------------------+------------------+------+-----+-------------+
| id                         | int(10) unsigned | NO   | PRI | NULL        |
| smlouva_id                 | int(11)          | NO   | MUL | NULL        |
| nazev                      | varchar(255)     | NO   |     | NULL        |
| popis                      | text             | YES  |     | NULL        |
| poznamka                   | text             | YES  |     | NULL        | ← NOVÉ
| rok                        | year(4)          | NO   | MUL | NULL        |
| druh                       | varchar(50)      | NO   | MUL | JINE        |
| platba                     | varchar(50)      | NO   | MUL | MESICNI     |
| celkova_castka             | decimal(15,2)    | NO   |     | 0.00        |
| zaplaceno_celkem           | decimal(15,2)    | NO   |     | 0.00        |
| zbyva_zaplatit             | decimal(15,2)    | NO   |     | 0.00        |
| stav                       | varchar(50)      | NO   | MUL | NEZAPLACENO |
| rozsirujici_data           | longtext         | YES  |     | NULL        |
| vytvoril_uzivatel_id       | int(10) unsigned | NO   | MUL | NULL        |
| aktualizoval_uzivatel_id   | int(10) unsigned | YES  |     | NULL        |
| dt_vytvoreni               | datetime         | NO   | MUL | NULL        |
| dt_aktualizace             | datetime         | YES  |     | NULL        |
| aktivni                    | tinyint(1)       | NO   | MUL | 1           |
+----------------------------+------------------+------+-----+-------------+
```

---

## 📁 SQL SOUBORY

### Migrace pro DEV
- ✅ **annual_fees_migration_DEV.sql** - AKTUALIZOVÁNO (v1.1)
  - Přidán sloupec `poznamka`
  - Přidána tabulka `25a_rocni_poplatky_prilohy`

### Migrace pro PROD
- ✅ **annual_fees_migration_PROD.sql** - AKTUALIZOVÁNO (v1.1)
  - Stejné změny jako DEV
  - Pro databázi: `eeo2025`

### Update skripty
- ✅ **annual_fees_update_v1.1_DEV.sql** - hotovo ✅
- ✅ **annual_fees_update_v1.1_PROD.sql** - připraveno ⏳

---

## 🔧 TODO PRO FRONTEND/BACKEND

### Backend (PHP)
- [ ] Aktualizovat `annualFeesQueries.php`:
  - [ ] Přidat `poznamka` do SELECT dotazů
  - [ ] Přidat `poznamka` do INSERT/UPDATE operací
- [ ] Vytvořit handler pro přílohy:
  - [ ] Upload přílohy s prefixem "rp"
  - [ ] Seznam příloh k ročnímu poplatku
  - [ ] Smazání přílohy

### Frontend (React)
- [ ] Aktualizovat `AnnualFeesPage.js`:
  - [ ] Přidat input pro pole `poznamka` ve formuláři
  - [ ] Přidat komponentu pro upload příloh
  - [ ] Zobrazit seznam příloh v detailu
- [ ] Aktualizovat `apiAnnualFees.js`:
  - [ ] Přidat metody pro práci s přílohami

---

## ✅ OVĚŘENÍ V DEV

### Test 1: Sloupec poznamka
```sql
mysql> SELECT poznamka FROM 25a_rocni_poplatky LIMIT 1;
-- OK: Sloupec existuje
```

### Test 2: Tabulka příloh
```sql
mysql> SELECT COUNT(*) FROM 25a_rocni_poplatky_prilohy;
+----------+
| COUNT(*) |
+----------+
|        0 |
+----------+
-- OK: Tabulka existuje, zatím prázdná
```

### Test 3: Foreign keys
```sql
mysql> SHOW CREATE TABLE 25a_rocni_poplatky_prilohy\G
-- OK: Constraints fk_rp_prilohy_rocni_poplatek a fk_rp_prilohy_uzivatel nastaveny
```

---

## 📅 DEPLOYMENT DO PRODUKCE

### Prerekvizity
1. ✅ Otestováno v DEV
2. ⏳ Záloha PROD databáze
3. ⏳ Údržbové okno naplánováno
4. ⏳ Frontend/backend připraveny

### Příkaz pro PROD
```bash
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < annual_fees_update_v1.1_PROD.sql
```

---

## 📝 POZNÁMKY

- ✅ Databázové změny jsou **kompatibilní** se stávajícím kódem
- ✅ Nová pole jsou **volitelná** (NULL), takže nezpůsobí chyby
- ✅ Přílohy používají **stejný mechanismus** jako objednávky/faktury
- ⚠️ Frontend zatím **nepodporuje** zobrazení poznámky a příloh (TODO)

---

**Status:** 🟢 DEV hotovo | 🟡 PROD připraveno | 🔴 Frontend TODO
