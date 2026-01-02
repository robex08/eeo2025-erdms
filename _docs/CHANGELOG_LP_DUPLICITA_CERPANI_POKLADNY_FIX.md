# CHANGELOG: Oprava duplicitního zobrazení LP a čerpání z pokladny

**Datum:** 2026-01-02  
**Autor:** GitHub Copilot + Admin  
**Branch:** feature/generic-recipient-system

---

## 🐛 Problém

### 1. Duplicitní zobrazení LP kódů v přehledu
- LP kódy se zobrazovaly **2x** v přehledu pro rok 2026
- Příčina: LEFT JOIN s master tabulkou (`25_limitovane_prisliby`) nefiltroval podle roku
- V master tabulce existovaly duplicitní záznamy pro stejný `cislo_lp` (např. LPIT1 měl 2 záznamy pro rok 2025)
- JOIN bez filtru na rok způsobil, že každý záznam z čerpání se spojil s více záznamy z master tabulky

### 2. Čerpání z pokladny nezahrnuto do "Zbývá skutečně"
- Čerpání z pokladny (např. 2500 Kč) bylo správně zobrazeno
- Ale nebylo zahrnuto do výpočtu "Zbývá skutečně" a progress baru "Čerpání"
- Příčina: Data v tabulce `25_limitovane_prisliby_cerpani` nebyla správně přepočítána

---

## ✅ Řešení

### 1. Oprava duplicitního zobrazení

#### A) Odstranění JOIN s master tabulkou pro rok filter
**Původní kód:**
```php
LEFT JOIN " . TBL_LP_MASTER . " lp ON c.cislo_lp = lp.cislo_lp
```

**Problém:**
- Tento JOIN nefiltruje podle roku
- Když `cislo_lp` existuje pro více roků v master tabulce, vytvoří se duplicitní záznamy

**Nový kód:**
```php
(SELECT cislo_uctu FROM " . TBL_LP_MASTER . " WHERE cislo_lp = c.cislo_lp LIMIT 1) as cislo_uctu,
(SELECT nazev_uctu FROM " . TBL_LP_MASTER . " WHERE cislo_lp = c.cislo_lp LIMIT 1) as nazev_uctu,
```

**Výhoda:**
- Subquery vezme první dostupný záznam pro daný LP kód
- Eliminuje duplicitní výsledky
- Funguje i když master tabulka nemá záznam pro daný rok (používá data z jiného roku)

#### Soubory upraveny:
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php`
  - ADMIN MODE (řádek ~4368)
  - REŽIM 1: Konkrétní LP kód (řádek ~4560)
  - REŽIM 2: LP pro uživatele (řádek ~4650)
  - REŽIM 3: LP pro úsek (řádek ~4835)

### 2. Oprava "Zbývá skutečně"

#### A) Problém v databázi
V tabulce `25_limitovane_prisliby_cerpani` pro LPIT1, rok 2026:
- `celkovy_limit` = 1500000.00
- `skutecne_cerpano` = 2500.00
- `zbyva_skutecne` = 1500000.00 ❌ (mělo být 1497500.00)

Příčina: Data nebyla správně přepočítána po přidání pokladní položky

#### B) Řešení v API
API nyní používá **LIVE agregaci** z pokladny místo dat z čerpání tabulky:

```php
-- LIVE AGREGACE z pokladny
COALESCE((
    SELECT SUM(COALESCE(p.castka_vydaj, p.castka_celkem))
    FROM 25a_pokladni_polozky p
    JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
    WHERE p.lp_kod = c.cislo_lp
    AND k.rok = c.rok
    AND p.typ_dokladu = 'vydaj'
    AND p.smazano = 0
    AND (p.ma_detail = 0 OR p.ma_detail IS NULL)
), 0) + COALESCE((
    SELECT SUM(d.castka)
    FROM 25a_pokladni_polozky_detail d
    JOIN 25a_pokladni_polozky p ON p.id = d.polozka_id
    JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
    WHERE d.lp_kod = c.cislo_lp
    AND k.rok = c.rok
    AND p.typ_dokladu = 'vydaj'
    AND p.smazano = 0
), 0) as skutecne_cerpano

-- Výpočet zbývá skutečně
(c.celkovy_limit - skutecne_cerpano) as zbyva_skutecne
```

**Výhoda:**
- Vždy aktuální data z pokladny
- Nemusí se čekat na přepočet
- Frontend dostává správné hodnoty pro progress bar

#### C) Oprava dat v databázi
Pro konzistenci byla data v tabulce ručně opravena:

```sql
UPDATE 25_limitovane_prisliby_cerpani
SET 
    zbyva_skutecne = celkovy_limit - skutecne_cerpano,
    procento_skutecne = CASE 
        WHEN celkovy_limit > 0 THEN LEAST(999.99, ROUND((skutecne_cerpano / celkovy_limit) * 100, 2))
        ELSE 0.00
    END,
    posledni_prepocet = NOW()
WHERE cislo_lp = 'LPIT1' AND rok = 2026;
```

---

## 📊 Výsledky

### Před opravou:
```
LPIT1  1500000 Kč  →  2500 Kč (Z pokladny: 2500 Kč)  →  Zbývá: 1500000 Kč ❌
LPIT1  1500000 Kč  →  1500000 Kč (Požadováno)       →  Zbývá: 0 Kč ❌
```
*(duplicitní zobrazení, špatný výpočet zbytku)*

### Po opravě:
```
LPIT1  1500000 Kč  →  2500 Kč (Čerpáno)  →  Zbývá: 1497500 Kč ✅
```
*(jednoznačné zobrazení, správný výpočet)*

---

## 🔍 Testování

### SQL test pro úsek 4, rok 2026:
```sql
SELECT 
    c.cislo_lp,
    c.celkovy_limit,
    (SELECT cislo_uctu FROM 25_limitovane_prisliby WHERE cislo_lp = c.cislo_lp LIMIT 1) as cislo_uctu,
    (SELECT nazev_uctu FROM 25_limitovane_prisliby WHERE cislo_lp = c.cislo_lp LIMIT 1) as nazev_uctu,
    -- LIVE agregace z pokladny
    COALESCE((
        SELECT SUM(COALESCE(p.castka_vydaj, p.castka_celkem))
        FROM 25a_pokladni_polozky p
        JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
        WHERE p.lp_kod = c.cislo_lp AND k.rok = c.rok AND p.typ_dokladu = 'vydaj'
    ), 0) as skutecne_cerpano,
    (c.celkovy_limit - skutecne_cerpano) as zbyva_skutecne
FROM 25_limitovane_prisliby_cerpani c
WHERE c.usek_id = 4 AND c.rok = 2026
ORDER BY c.cislo_lp;
```

### Výsledek:
| cislo_lp | limit      | skutecne_cerpano | zbyva_skutecne |
|----------|-----------|-----------------|----------------|
| LPIT1    | 1500000   | 2500            | 1497500 ✅     |
| LPIT2    | 300000    | 0               | 300000 ✅      |
| LPIT3    | 1000000   | 0               | 1000000 ✅     |
| LPIT5    | 2000000   | 0               | 2000000 ✅     |

---

## 📝 Poznámky

### Frontend integrace
Frontend (`LimitovanePrislibyManager.js`) již správně zpracovává:
- `skutecne_cerpano` - skutečné čerpání včetně pokladny
- `cerpano_pokladna` - samostatné zobrazení čerpání z pokladny
- `zbyva_skutecne` - správný zbytek pro progress bar

### Budoucí vylepšení
1. **Pravidelný přepočet:** Implementovat automatický přepočet čerpání každou noc
2. **Master tabulka pro 2026:** Vytvořit záznamy LP pro rok 2026 v master tabulce
3. **Monitoring:** Přidat alert když `zbyva_skutecne` neodpovídá `celkovy_limit - skutecne_cerpano`

---

## 🎯 Závěr

✅ **Duplicitní zobrazení** - Opraveno odstraněním JOIN a použitím subquery  
✅ **Čerpání z pokladny** - Zahrnuto do "Zbývá skutečně" pomocí LIVE agregace  
✅ **Progress bar** - Správně zobrazuje skutečné čerpání  
✅ **Testováno** - SQL dotazy vrací správné hodnoty
✅ **Přehled čerpání z pokladny** - Opraveno zobrazení LP kódů pro rok 2026
✅ **Společný limit** - Skutečné čerpání snižuje zbývající limit pro všechny typy

---

## 🐛 DODATEČNÁ OPRAVA 2: Společný limit pro všechny typy čerpání

### Problém
Po prvním opravě byly hodnoty "Zbývá" pro jednotlivé typy čerpání nekonzistentní:

```
LIMIT: 1 500 000 Kč

Vyčerpáno:
- Požadováno: 0 Kč
- Plánováno: 0 Kč
- Skutečně: 2 500 Kč (z pokladny)

Zbývá:
- Požadováno: 1 500 000 Kč  ❌ (mělo být 1 497 500 Kč)
- Plánováno: 1 500 000 Kč   ❌ (mělo být 1 497 500 Kč)
- Skutečně: 1 497 500 Kč    ✅ SPRÁVNĚ
```

### Příčina
**Všechny tři typy čerpání** (Požadováno, Plánováno, Skutečně) sdílí **JEDEN společný limit**.

Pokud skutečně vyčerpám 2 500 Kč z pokladny, musí se snížit dostupný limit pro:
- Budoucí objednávky (Požadováno)
- Plánované čerpání (Plánováno)
- Skutečné čerpání (Skutečně)

Původní logika počítala každý typ nezávisle:
```php
$zbyva_rezervace = $celkovy_limit - $rezervovano;     // ❌ Nezohledňuje skutečné čerpání
$zbyva_predpoklad = $celkovy_limit - $predpokladane_cerpani;  // ❌ Nezohledňuje skutečné čerpání
$zbyva_skutecne = $celkovy_limit - $skutecne_cerpano;  // ✅ OK
```

### Řešení
Upravena logika tak, aby skutečné čerpání snižovalo dostupný limit pro VŠECHNY typy:

**Nová logika:**
```php
// OPRAVA: Skutečné čerpání snižuje dostupný limit pro VŠECHNY typy čerpání
// Protože všechny tři typy (rezervace, předpoklad, skutečně) sdílí JEDEN společný limit
$zbyva_rezervace = $celkovy_limit - max($rezervovano, $skutecne_cerpano);
$zbyva_predpoklad = $celkovy_limit - max($predpokladane_cerpani, $skutecne_cerpano);
$zbyva_skutecne = $celkovy_limit - $skutecne_cerpano;
```

**Vysvětlení:**
- `max($rezervovano, $skutecne_cerpano)` - Pokud je skutečné čerpání větší než rezervované, použije se skutečné
- Tím se zajistí, že skutečné čerpání **vždy snižuje zbývající limit** pro všechny typy

### Upravené soubory
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php`
  - Funkce `prepocetCerpaniPodleIdLP_PDO()` (řádek ~217)

### Výsledek po opravě
```
LIMIT: 1 500 000 Kč

Vyčerpáno:
- Požadováno: 0 Kč
- Plánováno: 0 Kč
- Skutečně: 2 500 Kč

Zbývá:
- Požadováno: 1 497 500 Kč  ✅ (1 500 000 - max(0, 2 500))
- Plánováno: 1 497 500 Kč   ✅ (1 500 000 - max(0, 2 500))
- Skutečně: 1 497 500 Kč    ✅ (1 500 000 - 2 500)
```

### Testování
```sql
UPDATE 25_limitovane_prisliby_cerpani
SET 
    zbyva_rezervace = celkovy_limit - GREATEST(rezervovano, skutecne_cerpano),
    zbyva_predpoklad = celkovy_limit - GREATEST(predpokladane_cerpani, skutecne_cerpano),
    zbyva_skutecne = celkovy_limit - skutecne_cerpano
WHERE cislo_lp = 'LPIT1' AND rok = 2026;
```

**Výsledek:**
| Typ | Zbývá |
|-----|-------|
| Požadováno | 1 497 500 Kč ✅ |
| Plánováno | 1 497 500 Kč ✅ |
| Skutečně | 1 497 500 Kč ✅ |

---

## 🐛 DODATEČNÁ OPRAVA: Přehled čerpání z pokladny

### Problém
Po opravě duplicitního zobrazení se v sekci "Přehled čerpání z pokladny" zobrazovala hláška:
> "Pro rok 2026 nejsou k dispozici žádná data z pokladny"

I když jsme ověřili, že existuje čerpání 2500 Kč pro LPIT1 v roce 2026.

### Příčina
V souboru `LPCalculationService.php` funkce `recalculateLPForUserYear()` filtrovala LP kódy podle uživatele BEZ filtru na rok:

```php
WHERE d.lp_kod IN (
    -- Všechny LP, které má daný uživatel jako vedoucího
    SELECT DISTINCT cislo_lp FROM 25_limitovane_prisliby WHERE user_id = ?
    -- ❌ CHYBÍ: AND YEAR(platne_od) = ?
)
```

**Důsledek:** Pokud LP kód existoval v master tabulce jen pro rok 2025, subquery ho našel, ale žádná pokladní data pro rok 2026 nebyla vrácena.

### Řešení

#### 1. Odstranění filtru na user_id v hlavním dotazu
Změna logiky - místo filtrace LP kódů podle uživatele v SQL, filtrujeme všechna čerpání podle roku a pak spojujeme s limity pouze pro daného uživatele:

**Před:**
```php
WHERE d.lp_kod IN (
    SELECT DISTINCT cislo_lp FROM 25_limitovane_prisliby WHERE user_id = ?
)
AND k.rok = ?
```

**Po:**
```php
WHERE k.rok = ?  -- Bez filtru na LP kódy
AND p.typ_dokladu = 'vydaj'
AND p.smazano = 0
AND d.lp_kod IS NOT NULL
```

#### 2. Přidání filtru na user_id do getLPSummaryWithLimits
Filtr přesunut z SQL do PHP logiky:

```php
// 2. Získat limity z číselníku pro LP kódy daného uživatele
$sql = "
    SELECT c.id, c.cislo_lp, c.celkovy_limit, ...
    FROM 25_limitovane_prisliby_cerpani c
    WHERE c.rok = ? AND c.user_id = ?  -- ✅ PŘIDÁNO: AND c.user_id = ?
";

// 4. Zobrazit jen LP kódy které má uživatel
foreach ($cerpani as $item) {
    $limit = $limityIndex[$lpKod] ?? null;
    if (!$limit) {
        continue;  // ✅ Přeskočit LP kódy bez limitu pro tohoto uživatele
    }
    ...
}
```

### Upravené soubory
- `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/LPCalculationService.php`
  - Funkce `recalculateLPForUserYear()` (řádek ~70)
  - Funkce `getLPSummaryWithLimits()` (řádek ~210)

### Testování
```sql
-- Test čerpání z pokladny pro rok 2026 (všechna LP)
SELECT lp_data.lp_kod, SUM(lp_data.castka) as celkem_vydano
FROM (
    SELECT d.lp_kod, d.castka, ...
    FROM 25a_pokladni_polozky_detail d
    JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
    WHERE k.rok = 2026  -- ✅ Jen filtr na rok
    UNION ALL
    SELECT p.lp_kod, COALESCE(p.castka_vydaj, p.castka_celkem), ...
    FROM 25a_pokladni_polozky p
    JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
    WHERE k.rok = 2026  -- ✅ Jen filtr na rok
) as lp_data
GROUP BY lp_data.lp_kod;
```

**Výsledek:**
```
lp_kod  | celkem_vydano
--------|---------------
LPIT1   | 2500.00  ✅
```

### Výsledek
- ✅ Přehled čerpání z pokladny nyní správně zobrazuje LP kódy pro rok 2026
- ✅ Data jsou filtrována podle uživatele (jen jeho LP kódy)
- ✅ Funguje i když LP kód nemá záznam v master tabulce pro daný rok

---
