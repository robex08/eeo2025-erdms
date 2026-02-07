# Testování SQL filtrů pro Orders V3

**Datum:** 6. února 2026  
**Autor:** GitHub Copilot  
**Účel:** Kompletní přehled a testovací scénáře pro všechny filtry v Orders V3

---

## 1. FILTRY Z HORNÍHO PANELU (OrdersFiltersV3Full)

### 1.1 Fulltext vyhledávání
- **Frontend field:** `globalFilter` (string)
- **Backend param:** `fulltext` (string)
- **SQL:** `WHERE o.predmet LIKE '%...%'`
- **Test:**
  ```
  Zadej: "kancelář"
  Očekáváno: Objednávky obsahující "kancelář" v předmětu
  ```

### 1.2 Objednatel (multiselect)
- **Frontend field:** `filters.objednatel` (array of IDs: `['123', '456']`)
- **Backend param:** `objednatel` (array of IDs)
- **SQL:** `WHERE o.objednatel_id IN (?, ?)`
- **Test:**
  ```
  Vyber: Jan Novák (ID 123), Petr Svoboda (ID 456)
  Frontend odešle: {objednatel: ['123', '456']}
  SQL: o.objednatel_id IN (123, 456)
  Očekáváno: Jen objednávky těchto dvou uživatelů
  ```

### 1.3 Garant (multiselect)
- **Frontend field:** `filters.garant` (array of IDs: `['789']`)
- **Backend param:** `garant` (array of IDs)
- **SQL:** `WHERE o.garant_uzivatel_id IN (?)`
- **Test:**
  ```
  Vyber: Marie Dvořáková (ID 789)
  Frontend odešle: {garant: ['789']}
  SQL: o.garant_uzivatel_id IN (789)
  Očekáváno: Jen objednávky s tímto garantem
  ```

### 1.4 Příkazce (multiselect)
- **Frontend field:** `filters.prikazce` (array of IDs)
- **Backend param:** `prikazce` (array of IDs)
- **SQL:** `WHERE o.prikazce_id IN (?)`
- **Test:**
  ```
  Vyber: Jiří Horák (ID 321)
  Frontend odešle: {prikazce: ['321']}
  SQL: o.prikazce_id IN (321)
  ```

### 1.5 Schvalovatel (multiselect)
- **Frontend field:** `filters.schvalovatel` (array of IDs)
- **Backend param:** `schvalovatel` (array of IDs)
- **SQL:** `WHERE o.schvalovatel_id IN (?)`
- **Test:**
  ```
  Vyber: SYSTEM (ID 0)
  Frontend odešle: {schvalovatel: ['0']}
  SQL: o.schvalovatel_id IN (0)
  Očekáváno: Archivované objednávky se SYSTEM schvalovatelem
  ```

### 1.6 Stav objednávky (multiselect)
- **Frontend field:** `filters.stav` (array of status keys: `['NOVA', 'SCHVALENA']`)
- **Backend param:** `stav` (array)
- **SQL:** 
  ```php
  WHERE (
    JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = 'NOVA'
    OR
    JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'SCHVALENA'
  )
  ```
- **Test:**
  ```
  Vyber: Nová, Schválená
  Frontend odešle: {stav: ['NOVA', 'SCHVALENA']}
  SQL: Kontroluje první element (NOVA) nebo poslední (SCHVALENA)
  Očekáváno: Objednávky v těchto stavech
  ```

### 1.7 Datum od - do
- **Frontend fields:** `filters.dateFrom`, `filters.dateTo` (string: 'YYYY-MM-DD')
- **Backend params:** `datum_od`, `datum_do`
- **SQL:** 
  ```sql
  WHERE DATE(o.dt_objednavky) >= ? AND DATE(o.dt_objednavky) <= ?
  ```
- **Test:**
  ```
  Zadej: od 2026-01-01 do 2026-01-31
  Frontend odešle: {datum_od: '2026-01-01', datum_do: '2026-01-31'}
  Očekáváno: Objednávky vytvořené v lednu 2026
  ```

### 1.8 Cena od - do (Kč)
- **Frontend fields:** `filters.amountFrom`, `filters.amountTo` (number)
- **Backend params:** `cena_max_od`, `cena_max_do`
- **SQL:** 
  ```sql
  WHERE o.max_cena_s_dph BETWEEN ? AND ?
  -- nebo samostatně:
  WHERE o.max_cena_s_dph >= ? AND o.max_cena_s_dph <= ?
  ```
- **Test:**
  ```
  Zadej: od 10000 do 50000
  Frontend odešle: {cena_max_od: 10000, cena_max_do: 50000}
  SQL: o.max_cena_s_dph BETWEEN 10000 AND 50000
  Očekáváno: Objednávky s cenou 10k-50k Kč
  ```

### 1.9 Stav registru (checkboxy)
- **Frontend fields:** `filters.maBytZverejneno`, `filters.byloZverejneno` (boolean)
- **Backend param:** `stav_registru` (array: `['publikovano', 'nepublikovano']`)
- **SQL:**
  ```sql
  WHERE (
    o.bylo_zverejneno = 1  -- publikovano
    OR
    (o.ma_byt_zverejneno = 1 AND o.bylo_zverejneno = 0)  -- nepublikovano
    OR
    o.ma_byt_zverejneno = 0  -- nezverejnovat
  )
  ```
- **Test:**
  ```
  Zaškrtni: Bylo již zveřejněno
  Frontend odešle: {byloZverejneno: true}
  Hook konvertuje: {stav_registru: ['publikovano']}
  SQL: o.bylo_zverejneno = 1
  Očekáváno: Jen publikované objednávky
  ```

### 1.10 Mimořádné události (checkbox)
- **Frontend field:** `filters.mimoradneObjednavky` (boolean)
- **Backend param:** `mimoradne_udalosti` (boolean)
- **SQL:** `WHERE o.mimoradna_udalost = 1`
- **Test:**
  ```
  Zaškrtni: Krize / Havárie
  Frontend odešle: {mimoradneObjednavky: true}
  Hook konvertuje: {mimoradne_udalosti: true}
  SQL: o.mimoradna_udalost = 1
  Očekáváno: Jen mimořádné objednávky
  ```

---

## 2. SLOUPCOVÉ FILTRY Z TABULKY (OrdersTableV3)

### 2.1 Datum (dt_objednavky)
- **Column ID:** `dt_objednavky`
- **Frontend:** Textový input
- **Backend:** `dt_objednavky` (string)
- **SQL:** `WHERE DATE(o.dt_objednavky) = ?` (nebo LIKE)
- **Test:** Zadej "2026-01-15"

### 2.2 Evidenční číslo (cislo_objednavky)
- **Column ID:** `cislo_objednavky`
- **Backend:** `cislo_objednavky`
- **SQL:** `WHERE o.cislo_objednavky LIKE '%...%'`
- **Test:** Zadej "2026/001"

### 2.3 Financování (financovani)
- **Column ID:** `financovani`
- **Backend:** `financovani`
- **SQL:** `WHERE o.financovani LIKE '%...%'` (JSON search)
- **Test:** Zadej "LP" nebo "Smlouva"

### 2.4 Objednatel / Garant (kombinovaný sloupec)
- **Column IDs:** Může přijít jako `objednatel_garant` nebo samostatně
- **Mapping v hooku:**
  ```javascript
  if (columnId === 'objednatel_garant') {
    // Rozdělit na oba filtry
    backendFilters.objednatel_jmeno = value;
    backendFilters.garant_jmeno = value;
  }
  ```
- **Backend params:** `objednatel_jmeno`, `garant_jmeno`
- **SQL (oba stejné):**
  ```sql
  WHERE (
    CONCAT(u1.jmeno, ' ', u1.prijmeni) LIKE '%...%'
    OR
    CONCAT(u2.jmeno, ' ', u2.prijmeni) LIKE '%...%'
  )
  ```
- **Test:** Zadej "Novák" do sloupcového filtru

### 2.5 Příkazce / Schvalovatel (kombinovaný sloupec)
- **Column IDs:** `prikazce_schvalovatel` nebo samostatně
- **Backend params:** `prikazce_jmeno`, `schvalovatel_jmeno`
- **SQL (oba stejné):**
  ```sql
  WHERE (
    CONCAT(u3.jmeno, ' ', u3.prijmeni) LIKE '%...%'
    OR
    CONCAT(u4.jmeno, ' ', u4.prijmeni) LIKE '%...%'
  )
  ```
- **Test:** Zadej "Svoboda"

### 2.6 Dodavatel (dodavatel_nazev)
- **Column ID:** `dodavatel`
- **Backend:** `dodavatel`
- **SQL:** `WHERE d.nazev LIKE '%...%'`
- **Test:** Zadej "ACME"

### 2.7 Stav (stav_workflow)
- **Column ID:** `stav`
- **Backend:** `stav_workflow`
- **SQL:** Kontroluje poslední element JSON pole
- **Test:** Zadej "schvalena"

### 2.8 Max. cena s DPH (s operátorem)
- **Column ID:** `cena_max`
- **Backend:** `cena_max` (string s operátorem: `>=10000`)
- **SQL:** `WHERE o.max_cena_s_dph >= ?`
- **Test:** Zadej ">=10000" nebo ">50000" nebo "=25000"

### 2.9 Cena s DPH (součet položek)
- **Column ID:** `cena_polozky`
- **Backend:** `cena_polozky` (string s operátorem)
- **SQL:**
  ```sql
  WHERE EXISTS (
    SELECT 1 FROM objednavky_polozky pol
    WHERE pol.objednavka_id = o.id
    GROUP BY pol.objednavka_id
    HAVING SUM(pol.cena_s_dph) >= ?
  )
  ```
- **Test:** Zadej ">=20000"

### 2.10 Cena FA (součet faktur)
- **Column ID:** `cena_faktury`
- **Backend:** `cena_faktury` (string s operátorem)
- **SQL:**
  ```sql
  WHERE EXISTS (
    SELECT 1 FROM faktury f
    WHERE f.objednavka_id = o.id AND f.aktivni = 1
    GROUP BY f.objednavka_id
    HAVING SUM(f.fa_castka) >= ?
  )
  ```
- **Test:** Zadej ">=15000"

---

## 3. KOMBINACE FILTRŮ

### 3.1 Panel + Sloupcové filtry
**Scénář:**
- Panel: Vyber objednatele Jan Novák (ID 123)
- Sloupec: Zadej dodavatel "ACME"

**Očekáváno:**
```sql
WHERE o.objednatel_id IN (123)
AND d.nazev LIKE '%ACME%'
```

**Test:** Výsledek musí obsahovat JEN objednávky Jana Nováka s dodavatelem ACME

### 3.2 Multiselect + Cenový rozsah
**Scénář:**
- Panel: Vyber stavy Nová, Schválená
- Panel: Cena 10000-50000

**Očekáváno:**
```sql
WHERE (
  JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = 'NOVA'
  OR
  JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'SCHVALENA'
)
AND o.max_cena_s_dph BETWEEN 10000 AND 50000
```

### 3.3 Datumový rozsah + Mimořádné události
**Scénář:**
- Panel: Datum od 2026-01-01 do 2026-01-31
- Panel: Zaškrtni Mimořádné události

**Očekáváno:**
```sql
WHERE DATE(o.dt_objednavky) >= '2026-01-01'
AND DATE(o.dt_objednavky) <= '2026-01-31'
AND o.mimoradna_udalost = 1
```

---

## 4. EDGE CASES A CHYBY

### 4.1 Prázdné pole ID
**Problém:** Frontend pošle `{objednatel: []}`
**Řešení:** Hook musí ignorovat prázdná pole
```javascript
if (filters.objednatel?.length > 0) {
  backendFilters.objednatel = filters.objednatel;
}
```

### 4.2 ID jako string vs number
**Problém:** Frontend posílá `['123']`, backend očekává `[123]`
**Řešení:** Backend konvertuje
```php
$ids = array_map('intval', $filters['objednatel']);
```

### 4.3 Neexistující workflow kód
**Problém:** Frontend pošle neplatný stav
**Řešení:** Backend mapuje a ignoruje neznámé
```php
if (isset($stav_map[$stav_key])) {
  // Process
}
```

### 4.4 Cenový rozsah jen s jednou hodnotou
**Problém:** Jen `amountFrom` bez `amountTo`
**Řešení:** Backend podporuje samostatné podmínky
```php
elseif (!empty($filters['cena_max_od'])) {
  $where_conditions[] = "o.max_cena_s_dph >= ?";
}
```

### 4.5 Kombinovaný sloupec - dvě jména
**Problém:** Sloupec "Objednatel / Garant" jako jeden filtr
**Řešení:** Backend OR logika při stejné hodnotě
```php
if ($objednatel_filter && $garant_filter && $objednatel_filter === $garant_filter) {
  $where_conditions[] = "(...LIKE ? OR ...LIKE ?)";
}
```

---

## 5. TESTOVACÍ CHECKLIST

### Před nasazením otestuj:

- [ ] **Fulltext:** Hledání v předmětu bez diakritiky
- [ ] **Multiselect uživatelé:** Vybrat 2+ objednatele, garanty, příkazce, schvalovatele
- [ ] **Multiselect stavy:** Vybrat 2+ stavy (NOVA + SCHVALENA)
- [ ] **Datumový rozsah:** Jen od, jen do, od-do
- [ ] **Cenový rozsah:** Jen od, jen do, od-do
- [ ] **Checkboxy:** Každý samostatně, kombinace
- [ ] **Sloupcové filtry:** Text v každém sloupci
- [ ] **Cenové operátory:** >=10000, >10000, =10000
- [ ] **Kombinace:** Panel + sloupce současně
- [ ] **Clear buttons:** Vymazání každého filtru
- [ ] **Clear All:** Vymazání všech filtrů najednou
- [ ] **Persistence:** Refresh stránky → filtry zůstanou

---

## 6. DEBUG PŘÍKAZY

### Backend PHP log:
```php
error_log("[OrderV3] Filters received: " . json_encode($filters));
error_log("[OrderV3] WHERE SQL: " . $where_sql);
error_log("[OrderV3] WHERE params: " . json_encode($where_params));
```

### Frontend console:
```javascript
console.log('🔍 Filters sent to API:', backendFilters);
console.log('📊 Response data:', data);
```

### MySQL query test:
```sql
SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph,
       CONCAT(u1.jmeno, ' ', u1.prijmeni) AS objednatel
FROM objednavky o
LEFT JOIN users u1 ON o.objednatel_id = u1.id
WHERE o.objednatel_id IN (123, 456)
AND o.max_cena_s_dph BETWEEN 10000 AND 50000
LIMIT 10;
```

---

**Status:** ✅ Všechny filtry implementovány  
**Další krok:** Manuální testování v prohlížeči
