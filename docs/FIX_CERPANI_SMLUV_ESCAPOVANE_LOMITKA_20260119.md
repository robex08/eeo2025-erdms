# FIX: Čerpání smluv - Oprava matchování objednávek s escapovanými lomítky

**Datum:** 2026-01-19  
**Problém:** Stored procedure `sp_prepocet_cerpani_smluv` nenacházela objednávky kvůli escapovaným lomítkům v JSON  
**Status:** ✅ **OPRAVENO a OTESTOVÁNO**

---

## 🔴 Původní problém

V přehledu smluv se **nezobrazovalo čerpání** z objednávek, i když objednávky na smlouvách existovaly.

### Příčina
JSON v poli `financovani` u objednávek obsahuje **escapované lomítka**:
```json
{"typ":"SMLOUVA","cislo_smlouvy":"S-253\/75030926\/2025"}
```

Stored procedure používala `JSON_UNQUOTE(JSON_EXTRACT(...))` (MySQL 5.7+), ale systém běží na **MySQL 5.5.43**, kde tyto funkce buď nefungují správně, nebo ignorují escapování.

---

## ✅ Řešení

Nahrazeno `JSON_EXTRACT` za **MySQL 5.5 kompatibilní** `REPLACE()` + `LIKE`:

### Před (nefungovalo):
```sql
WHERE JSON_UNQUOTE(JSON_EXTRACT(financovani, '$.cislo_smlouvy')) = v_cislo_smlouvy
```

### Po (funguje):
```sql
WHERE REPLACE(financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%')
```

---

## 📋 Aplikované změny

**Soubor:** `docs/database-migrations/CREATE_SP_PREPOCET_CERPANI_SMLUV.sql`

### 1. Požadované čerpání (objednávky)
```sql
SELECT COALESCE(SUM(max_cena_s_dph), 0) INTO v_cerpano_pozadovano
FROM 25a_objednavky
WHERE REPLACE(financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%')
  AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA');
```

### 2. Skutečné čerpání (faktury přes objednávky)
```sql
WHERE (
  (f.objednavka_id IS NOT NULL AND REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%'))
  OR
  (f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL)
)
```

---

## 🧪 Testování

### Před opravou (DEV):
```
Smlouvy celkem: 693
S požadovaným čerpáním: 0 ❌
S skutečným čerpáním: 12 (pouze přímé faktury)
```

### Po opravě (DEV):
```
Smlouvy celkem: 693
S požadovaným čerpáním: 6 ✅
S skutečným čerpáním: 12 ✅
Používané v obj. formuláři: 65
```

### Příklad: Smlouva S-325/75030926/2025
| Položka | Hodnota | %
|---------|---------|-----|
| Limit | 2 299 000 Kč | - |
| Požadováno (6 obj.) | **14 168 Kč** ✅ | 0.62% |
| Skutečně (1 fakt.) | **9 365 Kč** ✅ | 0.41% |

---

## 📊 Struktura vazeb faktur

Faktury mohou být napojeny **dvěma způsoby** (stored procedure řeší oba):

### 1. Via objednávku (`objednavka_id`)
```
Faktura → Objednávka → Smlouva (přes financovani JSON)
```
- **Počet:** 21 faktur (214k Kč)
- **Použití:** Faktury na konkrétní objednávku

### 2. Přímo na smlouvu (`smlouva_id`)
```
Faktura → Smlouva (přímá vazba)
```
- **Počet:** 14 faktur (15.9M Kč)
- **Použití:** Faktury bez objednávky (např. rámcové smlouvy)

### 3. Orphan faktury (bez vazby)
```
Faktura (bez vazby)
```
- **Počet:** 25 faktur (562k Kč)
- **Status:** ⚠️ Nezapočítávají se do čerpání smluv

---

## 🔧 Stored Procedure logika

```sql
IF v_pouzit_v_obj_formu = 1 THEN
  -- Smlouva dostupná v obj. formuláři
  
  -- 1. POŽADOVÁNO = suma max_cena_s_dph z objednávek
  SELECT ... FROM 25a_objednavky
  WHERE REPLACE(financovani, '\\/', '/') LIKE ... ✅
  
  -- 2. SKUTEČNĚ = faktury přes objednávky + přímé faktury
  SELECT ... FROM 25a_objednavky_faktury f
  LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
  WHERE (
    (f.objednavka_id IS NOT NULL AND REPLACE(o.financovani, '\\/', '/') LIKE ...) ✅
    OR
    (f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL) ✅
  )
  
ELSE
  -- Smlouva pouze v modulu smluv a faktur
  
  -- SKUTEČNĚ = pouze přímé faktury
  SELECT ... FROM 25a_objednavky_faktury f
  WHERE f.smlouva_id = v_smlouva_id ✅
```

---

## ✅ Výsledek

- ✅ Opraveno matchování objednávek s escapovanými lomítky
- ✅ Správně se počítá čerpání z objednávek
- ✅ Správně se počítá čerpání z přímých faktur
- ✅ Smlouvy s oběma typy vazeb fungují správně
- ✅ MySQL 5.5 kompatibilní
- ✅ Otestováno na DEV (693 smluv)

---

## 📁 Soubory

- **Stored procedure:** `docs/database-migrations/CREATE_SP_PREPOCET_CERPANI_SMLUV.sql`
- **Aplikováno na:** DEV (EEO-OSTRA-DEV)
- **Čeká na aplikaci:** PROD (eeo2025)

---

**Status:** ✅ **DEV - HOTOVO** | ⏳ **PROD - PŘIPRAVENO**
