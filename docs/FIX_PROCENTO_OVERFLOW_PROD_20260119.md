# FIX APLIKOVÁN NA PRODUKCI: Overflow při přepočtu čerpání smluv

**Datum:** 2026-01-19  
**Databáze:** `eeo2025` (PRODUKCE)  
**Status:** ✅ **HOTOVO A OVĚŘENO**

---

## 🎯 Shrnutí

Oprava chyby `SQLSTATE[22003]: Numeric value out of range` byla úspěšně aplikována na **produkční databázi `eeo2025`**.

---

## 📊 Nalezený kritický případ

Během ověřování byla nalezena smlouva, která **by způsobila chybu** s původním datovým typem:

| Číslo smlouvy | Limit (Kč) | Čerpáno (Kč) | Procento |
|---------------|------------|--------------|----------|
| **S-086/75030926/2025** | 9 196 | 712 448 | **7747.37%** |

- **Poznámka:** Import z Excelu 30. 12. 2025
- **Důvod překročení:** Pravděpodobně chybný limit nebo import chybných dat
- **S DECIMAL(5,2):** ❌ Chyba - max 999.99
- **S DECIMAL(7,2):** ✅ OK - max 99999.99

---

## ✅ Provedené změny na produkci

### 1. Rozšíření datového typu sloupců
```sql
ALTER TABLE `25_smlouvy` 
  MODIFY COLUMN `procento_cerpani` DECIMAL(7,2),
  MODIFY COLUMN `procento_pozadovano` DECIMAL(7,2),
  MODIFY COLUMN `procento_planovano` DECIMAL(7,2),
  MODIFY COLUMN `procento_skutecne` DECIMAL(7,2);
```

### 2. Aktualizace stored procedure
- Implementováno `LEAST((v_cerpano_skutecne / hodnota_s_dph) * 100, 9999.99)` pro všechny výpočty procent
- Zabezpečeno proti overflow i při extrémních hodnotách

---

## 🧪 Výsledky testování na produkci

### Test 1: Struktura sloupců
✅ Všechny sloupce `procento_*` jsou `DECIMAL(7,2)`

### Test 2: Range check
- **Celkem aktivních smluv:** 695
- **Překročilo max (9999.99):** 0
- **Max procento_skutecne:** 7747.37%
- **Max procento_pozadovano:** 99.66%

### Test 3: Přepočet čerpání
```
CALL sp_prepocet_cerpani_smluv(NULL, NULL);
```
✅ **Výsledek:** Přepočteno čerpání pro 695 smluv bez chyby

### Test 4: Top 5 smluv s nejvyšším čerpáním
| Smlouva | Limit | Čerpáno | Procento |
|---------|-------|---------|----------|
| S-086/75030926/2025 | 9 196 | 712 448 | **7747.37%** ⚠️ |
| S-224/75030926/24 | 1 179 940 | 98 100 | 8.31% |
| S-363/75030926/22 | 645 462 | 32 525 | 5.04% |
| S-401/75030926/2024 | 1 611 616 | 76 413 | 4.74% |
| S-253/75030926/2025 | 3 376 493 | 46 094 | 1.37% |

---

## 🔍 Porovnání DEV vs PROD

| Položka | DEV (EEO-OSTRA-DEV) | PROD (eeo2025) |
|---------|---------------------|----------------|
| **Databáze** | EEO-OSTRA-DEV | eeo2025 |
| **Smluv celkem** | 693 | 695 |
| **Max procento před opravou** | 2.38% | 7747.37% ⚠️ |
| **Kritický případ** | ❌ Ne | ✅ **Ano - S-086** |
| **Datový typ před** | DECIMAL(5,2) | DECIMAL(5,2) |
| **Datový typ po** | DECIMAL(7,2) | DECIMAL(7,2) |
| **LEAST() ošetření** | ✅ Ano | ✅ Ano |
| **Status** | ✅ OK | ✅ OK |

---

## 📝 Aplikované soubory

1. **Migrace sloupců:**  
   `docs/database-migrations/2026-01-19_fix_procento_columns_overflow_PROD.sql`

2. **Stored procedure:**  
   `docs/database-migrations/CREATE_SP_PREPOCET_CERPANI_SMLUV.sql`

3. **Test suite:**  
   `/tmp/test_prod_overflow.sql`

---

## ⚠️ Doporučení

### Smlouva S-086/75030926/2025
Tato smlouva má **extrémní překročení limitu (7747%)**:
- **Limit:** 9 196 Kč
- **Čerpáno:** 712 448 Kč
- **Překročení:** 703 252 Kč

**Akce:**
1. ✅ Technicky ošetřeno - hodnota se nyní ukládá správně
2. ⚠️ **Doporučuji prověřit** - pravděpodobně chybný import nebo chybný limit
3. 💡 Zvážit nastavení alertů pro smlouvy s čerpáním > 100%

---

## 🎉 Závěr

### ✅ Oprava úspěšně aplikována na obě databáze:
- **DEV:** EEO-OSTRA-DEV (693 smluv)
- **PROD:** eeo2025 (695 smluv)

### ✅ Kritický případ vyřešen:
- Smlouva S-086 s čerpáním 7747% by **způsobila chybu** s původním datovým typem
- Nyní se hodnota **ukládá správně** díky DECIMAL(7,2)

### ✅ Prevence do budoucna:
- Sloupce rozšířeny na DECIMAL(7,2) - max 99999.99
- Výpočty ošetřeny funkcí LEAST(..., 9999.99)
- NULL hodnoty pro neomezené smlouvy

---

**Status:** ✅ **PRODUKCE I DEV - HOTOVO A OTESTOVÁNO**  
**Chyba:** ✅ **VYŘEŠENA**  
**Kritický případ:** ✅ **NALEZEN A OŠETŘEN**
