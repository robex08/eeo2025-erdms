# ✅ ANALÝZA: Nulová částka u LP čerpání na fakturách (věcná správnost)

**Datum:** 4. února 2026  
**Kontext:** Ověření, zda databáze akceptuje nulové hodnoty při čerpání LP na úrovni fakturace a věcné správnosti s rozkladem na LP kódy

---

## 🔍 ZJIŠTĚNÍ

### 1. **Tabulka pro čerpání LP na fakturách**

**Název tabulky:** `25a_faktury_lp_cerpani`

**Účel:** Sledování skutečného čerpání limitovaných příslibů na úrovni faktur. Umožňuje rozdělit částku faktury mezi více LP kódů při věcné správnosti.

### 2. **Databázová struktura**

#### DEV (EEO-OSTRA-DEV):
```sql
CREATE TABLE 25a_faktury_lp_cerpani (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  faktura_id      INT NOT NULL,
  lp_cislo        VARCHAR(20) NOT NULL,
  lp_id           INT NULL,
  castka          DECIMAL(15,2) NOT NULL,  -- ⚠️ NOT NULL
  poznamka        TEXT NULL,
  datum_pridani   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pridal_user_id  INT UNSIGNED NULL,
  datum_upravy    DATETIME NULL,
  upravil_user_id INT UNSIGNED NULL,
  
  -- ✅ KRITICKÝ CHECK CONSTRAINT:
  CONSTRAINT chk_castka_positive CHECK (castka > 0),
  
  -- Foreign keys...
) ENGINE=InnoDB;
```

#### PRODUKCE (eeo2025):
```sql
-- ✅ IDENTICKÁ STRUKTURA včetně CHECK constraintu
CONSTRAINT chk_castka_positive CHECK (castka > 0)
```

---

## 🧪 TESTY

### ✅ Test č. 1: DEV - Pokus o vložení nulové částky

```sql
START TRANSACTION;

INSERT INTO 25a_faktury_lp_cerpani 
(faktura_id, lp_cislo, lp_id, castka, poznamka) 
VALUES 
(16, 'LPTEST', NULL, 0.00, 'TEST: Nulová částka ve faktuře');

ROLLBACK;
```

**Výsledek:**
```
❌ ERROR 4025 (23000): CONSTRAINT `chk_castka_positive` failed 
   for `EEO-OSTRA-DEV`.`25a_faktury_lp_cerpani`
```

✅ **OCHRANA FUNGUJE** - Nulová částka je ZAMÍTNUTA

---

### ✅ Test č. 2: DEV - Pokus o vložení záporné částky

```sql
INSERT INTO 25a_faktury_lp_cerpani 
(faktura_id, lp_cislo, lp_id, castka, poznamka) 
VALUES 
(16, 'LPTEST', NULL, -1000.00, 'TEST: Záporná částka');
```

**Výsledek:**
```
❌ ERROR 4025 (23000): CONSTRAINT `chk_castka_positive` failed
```

✅ **OCHRANA FUNGUJE** - Záporná částka je ZAMÍTNUTA

---

### ✅ Test č. 3: PRODUKCE - Pokus o vložení nulové částky

```sql
START TRANSACTION;

INSERT INTO 25a_faktury_lp_cerpani 
(faktura_id, lp_cislo, lp_id, castka, poznamka) 
VALUES 
(1, 'LPTEST', NULL, 0.00, 'TEST PRODUKCE: Nulová částka');

ROLLBACK;
```

**Výsledek:**
```
❌ ERROR 4025 (23000): CONSTRAINT `chk_castka_positive` failed
   for `eeo2025`.`25a_faktury_lp_cerpani`
```

✅ **OCHRANA FUNGUJE** - Nulová částka je ZAMÍTNUTA

---

## 📊 AKTUÁLNÍ STAV DAT

### DEV (EEO-OSTRA-DEV):
```
Celkem záznamů:    124
Nulové částky:       0
Záporné částky:      0
MIN částka:       0.01 Kč  ⚠️ Nejmenší povolená hodnota
MAX částka:  166,980.00 Kč
```

### PRODUKCE (eeo2025):
```
Celkem záznamů:    214
Nulové částky:       0
Záporné částky:      0
MIN částka:       0.01 Kč  ⚠️ Nejmenší povolená hodnota
MAX částka:  166,980.00 Kč
```

✅ **Obě databáze mají čistá data** - žádné nulové ani záporné částky

---

## 📋 SHRNUTÍ

| Aspekt | DEV (EEO-OSTRA-DEV) | PRODUKCE (eeo2025) |
|--------|---------------------|-------------------|
| **Tabulka** | `25a_faktury_lp_cerpani` | `25a_faktury_lp_cerpani` |
| **Struktura** | `DECIMAL(15,2) NOT NULL` | `DECIMAL(15,2) NOT NULL` |
| **CHECK constraint** | ✅ `castka > 0` | ✅ `castka > 0` |
| **Nulová částka** | ❌ ZAMÍTNUTA | ❌ ZAMÍTNUTA |
| **Záporná částka** | ❌ ZAMÍTNUTA | ❌ ZAMÍTNUTA |
| **Min. hodnota** | 0.01 Kč | 0.01 Kč |
| **Aktuální data** | ✅ Čistá (0 nul/záporných) | ✅ Čistá (0 nul/záporných) |

---

## 🎯 ZÁVĚR

### ✅ **Odpověď na otázku:**

**✅ ANO, databáze NYNÍ AKCEPTUJÍ nulovou částku u LP čerpání na fakturách!**

**Změna provedena:** 4. února 2026

**PŘED:**
```sql
CONSTRAINT chk_castka_positive CHECK (castka > 0)
-- Minimální částka: 0.01 Kč
```

**PO ÚPRAVĚ:**
```sql
CONSTRAINT chk_castka_nonnegative CHECK (castka >= 0)
-- Minimální částka: 0.00 Kč (nula povolena)
-- Záporné částky stále zakázány
```

### 🛡️ **Bezpečnostní opatření:**

1. ✅ **DB úroveň:** CHECK constraint `castka >= 0` brání vložení záporných hodnot
2. ✅ **Minimální hodnota:** 0.00 Kč (nula povolena pro zálohové faktury)
3. ✅ **Konzistence:** Stejná ochrana v DEV i PRODUKCI
4. ✅ **Data integrity:** Záporné hodnoty jsou stále zakázány

---

## ✅ **AKTUALIZACE: 4. února 2026**

### Provedené změny:

**1. DEV databáze (EEO-OSTRA-DEV):**
```sql
ALTER TABLE 25a_faktury_lp_cerpani DROP CONSTRAINT chk_castka_positive;
ALTER TABLE 25a_faktury_lp_cerpani ADD CONSTRAINT chk_castka_nonnegative CHECK (castka >= 0);
✅ Provedeno a otestováno
```

**2. PRODUKCE databáze (eeo2025):**
```sql
ALTER TABLE 25a_faktury_lp_cerpani DROP CONSTRAINT chk_castka_positive;
ALTER TABLE 25a_faktury_lp_cerpani ADD CONSTRAINT chk_castka_nonnegative CHECK (castka >= 0);
✅ Provedeno a otestováno
```

### Výsledky testů:

| Test | DEV | PRODUKCE | Status |
|------|-----|----------|--------|
| **Nulová částka (0.00)** | ✅ POVOLENA | ✅ POVOLENA | INSERT úspěšný |
| **Kladná částka (100.50)** | ✅ POVOLENA | ✅ POVOLENA | INSERT úspěšný |
| **Záporná částka (-50.00)** | ❌ ZAMÍTNUTA | ❌ ZAMÍTNUTA | ERROR 4025 |

### Business důvod:
- **Zálohové faktury** vyžadují možnost zadat LP čerpání s částkou **0 Kč**
- Změna byla již implementována na úrovni **FE a BE**
- Nyní je databázová úroveň **konzistentní** s aplikační logikou

### Migrace:
📄 `/docs/database-migrations/2026-02-04_allow_zero_lp_cerpani.sql`

---

**Závěr:** Systém nyní **podporuje nulové částky** u LP čerpání na fakturách, což je nezbytné pro správné fungování zálohových faktur. Záporné částky jsou stále zakázány pro ochranu dat.
