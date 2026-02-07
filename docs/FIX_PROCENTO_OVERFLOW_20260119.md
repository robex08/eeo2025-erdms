# FIX: Numeric Overflow při přepočtu čerpání smluv

**Datum:** 2026-01-19  
**Problém:** `SQLSTATE[22003]: Numeric value out of range: 1264 Out of range value for column 'procento_skutecne'`  
**Příčina:** Sloupce `procento_*` definované jako `DECIMAL(5,2)` (max 999.99) při nestandardních hodnotách způsobují overflow  

---

## 🔴 Problém

Při přepočtu čerpání smluv dochází k chybě:
```
Chyba pri prepoctu cerpani: SQLSTATE[22003]: Numeric value out of range: 1264 
Out of range value for column 'procento_skutecne' at row 1
```

### Příčina
- Sloupce `procento_cerpani`, `procento_pozadovano`, `procento_planovano`, `procento_skutecne` měly datový typ `DECIMAL(5,2)`
- Max hodnota: **999.99**
- Při nestandardních situacích (např. chybné hodnoty smluv, extrémní čerpání) může dojít k překročení limitu

---

## ✅ Řešení

### 1. Rozšíření datového typu sloupců

**Migrace:** `docs/database-migrations/2026-01-19_fix_procento_columns_overflow.sql`

```sql
ALTER TABLE `25_smlouvy` 
  MODIFY COLUMN `procento_cerpani` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_pozadovano` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_planovano` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_skutecne` DECIMAL(7,2) NULL DEFAULT 0.00;
```

**Nový rozsah:** `DECIMAL(7,2)` = max **99999.99** (dostatečné pro procenta)

### 2. Ošetření v stored procedure

**Soubor:** `docs/database-migrations/CREATE_SP_PREPOCET_CERPANI_SMLUV.sql`

Přidána funkce `LEAST()` pro omezení hodnot:

```sql
procento_skutecne = IF(hodnota_s_dph > 0, 
                       LEAST((v_cerpano_skutecne / hodnota_s_dph) * 100, 9999.99), 
                       NULL)
```

**Logika:**
- Pokud vypočítané procento > 9999.99 → uloží se 9999.99
- Pokud hodnota_s_dph = 0 (neomezená smlouva) → uloží se NULL
- Normální hodnoty (0-9999.99) → uloží se beze změny

---

## 📋 Aplikované změny

### Databázové změny
```bash
mysql -h10.3.172.11 -uerdms_user -p EEO-OSTRA-DEV \
  < docs/database-migrations/2026-01-19_fix_procento_columns_overflow.sql
```

### Aktualizace stored procedure
```bash
mysql -h10.3.172.11 -uerdms_user -p EEO-OSTRA-DEV \
  < docs/database-migrations/CREATE_SP_PREPOCET_CERPANI_SMLUV.sql
```

### Testování
```bash
mysql -h10.3.172.11 -uerdms_user -p EEO-OSTRA-DEV \
  -e "CALL sp_prepocet_cerpani_smluv(NULL, NULL);"
```

✅ **Výsledek:** Přepočteno čerpání pro 693 smluv bez chyby

---

## 🧪 Ověření

```sql
-- Zobrazení struktury sloupců
SHOW COLUMNS FROM 25_smlouvy LIKE 'procento%';

-- Kontrola stored procedure
SHOW CREATE PROCEDURE sp_prepocet_cerpani_smluv;

-- Test přepočtu všech smluv
CALL sp_prepocet_cerpani_smluv(NULL, NULL);

-- Kontrola extrémních hodnot
SELECT cislo_smlouvy, hodnota_s_dph, cerpano_skutecne, procento_skutecne
FROM 25_smlouvy 
WHERE procento_skutecne > 100 
ORDER BY procento_skutecne DESC 
LIMIT 10;
```

---

## 📊 Výsledek

| Položka | Před | Po |
|---------|------|-----|
| Datový typ | `DECIMAL(5,2)` | `DECIMAL(7,2)` |
| Max hodnota | 999.99 | 99999.99 |
| Ošetření overflow | ❌ Ne | ✅ `LEAST(..., 9999.99)` |
| Chyba při přepočtu | ❌ Ano | ✅ Ne |

---

## 🔗 Související soubory

- **Migrace:** `docs/database-migrations/2026-01-19_fix_procento_columns_overflow.sql`
- **Stored procedure:** `docs/database-migrations/CREATE_SP_PREPOCET_CERPANI_SMLUV.sql`
- **PHP handler:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php`

---

## 💡 Prevence do budoucna

1. ✅ Sloupce rozšířeny na větší rozsah (`DECIMAL(7,2)`)
2. ✅ Výpočty ošetřeny funkcí `LEAST()` proti overflow
3. ✅ NULL hodnoty pro neomezené smlouvy (hodnota_s_dph = 0)
4. ⚠️ Monitorovat log chyb pro případné další nestandardní situace

---

**Status:** ✅ **HOTOVO** - Chyba opravena, testováno na 693 smlouvách
