# Limitované přísliby (LP) - Kompletní dokumentace

**Datum:** 2. ledna 2026  
**Verze:** 2.0  
**Autor:** GitHub Copilot + Robert Holovský

---

## 📋 Obsah

1. [Co jsou limitované přísliby](#co-jsou-limitované-přísliby)
2. [Architektura systému](#architektura-systému)
3. [Tři typy čerpání](#tři-typy-čerpání)
4. [Formáty financování](#formáty-financování)
5. [Přepočet čerpání](#přepočet-čerpání)
6. [Pokladní čerpání](#pokladní-čerpání)
7. [Časté problémy a řešení](#časté-problémy-a-řešení)

---

## Co jsou limitované přísliby

**Limitovaný příslib (LP)** je finanční limit přidělený konkrétnímu uživateli nebo úseku na určité období (rok). Umožňuje:

- **Sledování čerpání** - kolik z přiděleného limitu bylo vyčerpáno
- **Tři úrovně stavu** - rezervace, předpoklad, skutečnost
- **Multi-LP objednávky** - jedna objednávka může čerpat z více LP
- **Pokladní čerpání** - čerpání i mimo objednávkový systém

### Příklad
```
LP: LPIT1 (Oddělení IT)
Celkový limit: 1 500 000 Kč
Platnost: 1.1.2025 - 31.12.2025

Čerpání:
- Rezervováno (max. ceny): 626 466 Kč (42%)
- Předpoklad (položky): 947 024 Kč (63%)
- Skutečně (faktury): 243 544 Kč (16%)
- Pokladna: 27 367 Kč (2%)

Celkem skutečně: 270 911 Kč (18%)
Zbývá: 1 229 089 Kč
```

---

## Architektura systému

### Databázové tabulky

```
25_limitovane_prisliby (MASTER)
├── id (PK)
├── cislo_lp (např. "LPIT1")
├── kategorie (např. "LPIT")
├── user_id
├── usek_id
├── vyse_financniho_kryti (limit v Kč)
├── platne_od
└── platne_do

25_limitovane_prisliby_cerpani (AGREGACE)
├── id (PK)
├── cislo_lp
├── rok
├── celkovy_limit
├── rezervovano (max_cena_s_dph)
├── predpokladane_cerpani (suma položek)
├── skutecne_cerpano (suma faktur - BEZ pokladny!)
├── cerpano_pokladna (samostatný sloupec)
├── zbyva_rezervace
├── zbyva_predpoklad
├── zbyva_skutecne (= limit - skutecne - pokladna)
├── procento_rezervace
├── procento_predpoklad
├── procento_skutecne (= (skutecne + pokladna) / limit * 100)
├── pocet_zaznamu
├── ma_navyseni (boolean)
└── posledni_prepocet (timestamp)

25a_objednavky
└── financovani (OLD: "LPIA1" nebo NEW: {"typ":"LP","lp_kody":[1,2,3]})

25a_faktury_lp_cerpani (vazební tabulka)
├── lp_cislo
├── faktura_id
└── castka

25a_pokladni_polozky
└── lp_kod (OLD: "LPIT1" nebo NULL pokud ma_detail=1)

25a_pokladni_polozky_detail
└── lp_kod (NEW: multi-LP)
```

### Klíčové principy

✅ **Dva sloupce pro skutečné čerpání**:
- `skutecne_cerpano` = JEN faktury
- `cerpano_pokladna` = samostatně
- UI/API je sečte jako celkové skutečné čerpání

✅ **Datum vytvoření objednávky rozhoduje**:
- Objednávka se přiřadí k LP podle `dt_vytvoreni` a platnosti LP
- LP může překrývat roky (31.12.2025 - 31.12.2026)

✅ **Přepočet triggeruje tyto akce**:
- Vytvoření/úprava objednávky s LP
- Vytvoření/úprava faktury
- Vytvoření/úprava pokladního dokladu
- Manuální přepočet přes API

---

## Tři typy čerpání

### 1️⃣ REZERVOVÁNO (rezervovano)
**Zdroj:** `max_cena_s_dph` z objednávky  
**Stav:** `ODESLANA` (odeslána dodavateli)  
**Účel:** Pesimistický odhad (nejvyšší možná cena)

```sql
SELECT SUM(obj.max_cena_s_dph / pocet_lp) as rezervovano
FROM 25a_objednavky obj
WHERE obj.stav_workflow_kod LIKE '%ODESLANA%'
  AND obj.financovani obsahuje LP
  AND DATE(obj.dt_vytvoreni) BETWEEN platne_od AND platne_do
  AND neexistují faktury
```

**Kdy se počítá:**
- Objednávka odeslána dodavateli (stav ODESLANA)
- Ještě nejsou faktury

**Proč je nejvyšší:**
- Obsahuje max. očekávanou cenu včetně možných navýšení
- Reálná cena bývá nižší po zadání položek

### 2️⃣ PŘEDPOKLÁDANÉ ČERPÁNÍ (predpokladane_cerpani)
**Zdroj:** `SUM(polozky.cena_s_dph)` z položek objednávky  
**Stav:** `SCHVALENA` nebo `ODESLANA_KE_SCHVALENI`  
**Účel:** Reálný odhad (skutečné ceny položek)

```sql
SELECT SUM(pol.cena_s_dph / pocet_lp) as predpokladane
FROM 25a_objednavky obj
JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = obj.id
WHERE (obj.stav_workflow_kod LIKE '%SCHVALENA%' 
       OR obj.stav_workflow_kod LIKE '%ODESLANA_KE_SCHVALENI%')
  AND obj.financovani obsahuje LP
  AND DATE(obj.dt_vytvoreni) BETWEEN platne_od AND platne_do
  AND neexistují faktury
```

**Kdy se počítá:**
- Objednávka schválená nebo čeká na schválení
- Položky už jsou zadané
- Ještě nejsou faktury

**Proč je přesnější:**
- Obsahuje reálné ceny konkrétních položek
- Může být stále vyšší než fakturovaná částka

### 3️⃣ SKUTEČNÉ ČERPÁNÍ (skutecne_cerpano + cerpano_pokladna)
**Zdroj:** `SUM(faktury.fa_castka)` + `SUM(pokladna)`  
**Stav:** jakýkoliv (pokud existují faktury nebo pokladní doklady)  
**Účel:** Finální vyúčtování

```sql
-- Faktury
SELECT SUM(f.fa_castka / pocet_lp) as skutecne
FROM 25a_objednavky obj
JOIN 25a_objednavky_faktury f ON f.objednavka_id = obj.id
WHERE obj.financovani obsahuje LP
  AND DATE(obj.dt_vytvoreni) BETWEEN platne_od AND platne_do
  AND f.stav != 'STORNO'
  AND f.aktivni = 1

-- Pokladna
SELECT SUM(castka) as pokladna
FROM 25a_pokladni_polozky
WHERE lp_kod = 'LPIA1'
  AND smazano = 0
```

**Kdy se počítá:**
- Faktury existují (jakýkoliv stav objednávky)
- Pokladní doklady vytvořené (bez ohledu na uzavření knihy)

**Proč je finální:**
- Obsahuje skutečně zaplacenou/vyúčtovanou částku
- Může být nižší než předpoklad (slevy, změny)
- Může být vyšší (dodatečné náklady)

### Průběh životního cyklu

```
OBJEDNÁVKA VYTVOŘENA
└─> max_cena_s_dph = 5000 Kč

SCHVÁLENA → ODESLÁNA DODAVATELI
├─> rezervovano = 5000 Kč (max_cena)
└─> predpokladane = 4500 Kč (položky zadány)

FAKTURACE
├─> skutecne_cerpano = 4200 Kč (faktura)
├─> rezervovano = 0 (přestane se počítat)
└─> predpokladane = 0 (přestane se počítat)

FINÁLNÍ STAV
└─> skutecne_cerpano = 4200 Kč + cerpano_pokladna = 0 Kč
    CELKEM = 4200 Kč
```

---

## Formáty financování

### OLD formát (plain string)
**Použití:** 1482 objednávek (95.3%), 25.6 mil. Kč  
**Formát:** Jednoduchý řetězec LP kódu

```javascript
// Databáze
financovani = "LPIA1"

// Detekce v PHP
if (preg_match('/^LP[A-Z]+[0-9]+$/', $financovani)) {
    // OLD formát
    $lp_kod = $financovani; // "LPIA1"
    $pocet_lp = 1;
}
```

**Vlastnosti:**
- ✅ Single-LP - jedna objednávka = jedno LP
- ✅ Jednoduchý formát
- ❌ Nelze přiřadit více LP najednou

### NEW formát (JSON)
**Použití:** 70 objednávek (4.7%), 3.6 mil. Kč  
**Formát:** JSON objekt s polem LP IDčka

```javascript
// Databáze
financovani = '{"typ":"LP","lp_kody":[1,2,3]}'

// Detekce v PHP
$financovani = json_decode($financovani_raw, true);
if ($financovani && $financovani['typ'] === 'LP') {
    // NEW formát
    $lp_ids = $financovani['lp_kody']; // [1, 2, 3]
    $pocet_lp = count($lp_ids);
}
```

**Vlastnosti:**
- ✅ Multi-LP - jedna objednávka může čerpat z více LP
- ✅ Dělení nákladů podle počtu LP (např. 6000 Kč / 3 LP = 2000 Kč na každé)
- ⚠️ Vyžaduje parsování JSON

### Dělení nákladů v Multi-LP

```javascript
// Příklad: Objednávka za 12 000 Kč s 3 LP
financovani = '{"typ":"LP","lp_kody":[1,4,7]}'
max_cena_s_dph = 12000

// Každé LP dostane:
12000 / 3 = 4000 Kč

// LP ID=1: rezervovano += 4000
// LP ID=4: rezervovano += 4000
// LP ID=7: rezervovano += 4000
```

---

## Přepočet čerpání

### PHP Handler: prepocetCerpaniPodleIdLP_PDO()

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php`

**Kroky:**

1. **Načtení metadat LP**
```php
SELECT 
    lp.id, lp.cislo_lp, lp.kategorie, lp.usek_id, lp.user_id,
    YEAR(MAX(lp.platne_do)) as rok,
    SUM(lp.vyse_financniho_kryti) as celkovy_limit,
    MIN(lp.platne_od) as nejstarsi_platnost,
    MAX(lp.platne_do) as nejnovejsi_platnost
FROM 25_limitovane_prisliby lp
WHERE lp.id = :lp_id
```

2. **PLÁNOVÁNO (předpoklad)**
```php
SELECT obj.id, obj.max_cena_s_dph, obj.financovani
FROM 25a_objednavky obj
LEFT JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id
WHERE obj.financovani IS NOT NULL
  AND (obj.stav_workflow_kod LIKE '%ODESLANA_KE_SCHVALENI%' 
       OR obj.stav_workflow_kod LIKE '%SCHVALENA%')
  AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
  AND fakt.id IS NULL  -- bez faktur!
```

3. **POŽADOVÁNO (rezervace)**
```php
SELECT obj.id, obj.financovani, SUM(pol.cena_s_dph) as suma_cena
FROM 25a_objednavky obj
INNER JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = obj.id
LEFT JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id
WHERE obj.financovani IS NOT NULL
  AND obj.stav_workflow_kod LIKE '%ODESLANA%'
  AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
  AND fakt.id IS NULL  -- bez faktur!
GROUP BY obj.id, obj.financovani
```

4. **SKUTEČNĚ (faktury)**
```php
SELECT obj.id, obj.financovani, SUM(fakt.fa_castka) as suma_faktur
FROM 25a_objednavky obj
INNER JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id
WHERE obj.financovani IS NOT NULL
  AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
GROUP BY obj.id, obj.financovani
```

5. **POKLADNA**
```php
SELECT COALESCE(SUM(pp.castka_vydaj), 0) as cerpano_pokl
FROM 25a_pokladni_knihy pk
JOIN 25a_pokladni_polozky pp ON pp.pokladni_kniha_id = pk.id
WHERE pp.lp_kod = :cislo_lp
  AND pp.smazano = 0
  AND pk.rok = :rok
  -- BEZ filtru na stav_knihy! (aktivní knihy se počítají)
```

6. **Výpočet zůstatků**
```php
// CELKOVÉ skutečné = faktury + pokladna
$celkove_skutecne = $skutecne_cerpano + $cerpano_pokladna;

// Zbývá pro každý typ
$zbyva_rezervace = $celkovy_limit - max($rezervovano, $celkove_skutecne);
$zbyva_predpoklad = $celkovy_limit - max($predpokladane_cerpani, $celkove_skutecne);
$zbyva_skutecne = $celkovy_limit - $celkove_skutecne;
```

7. **Uložení do agregace**
```php
INSERT INTO 25_limitovane_prisliby_cerpani (
    cislo_lp, rok, celkovy_limit,
    rezervovano, predpokladane_cerpani, 
    skutecne_cerpano, cerpano_pokladna,  // SAMOSTATNĚ!
    zbyva_rezervace, zbyva_predpoklad, zbyva_skutecne,
    procento_rezervace, procento_predpoklad, procento_skutecne,
    posledni_prepocet
) VALUES (...)
ON DUPLICATE KEY UPDATE ...
```

### Stored Procedure: sp_prepocet_lp_cerpani_faktury()

**Soubor:** `/var/www/erdms-dev/_docs/database-migrations/2025-12-29_create_sp_prepocet_lp_cerpani_faktury.sql`

**Použití:** Přepočítá **JEN faktury a pokladnu** (ne objednávky!)

```sql
CALL sp_prepocet_lp_cerpani_faktury('LPIA1');  -- jeden LP
CALL sp_prepocet_lp_cerpani_faktury(NULL);     -- všechny LP
```

**Co dělá:**

1. Sečte faktury z `25a_faktury_lp_cerpani`
2. Sečte pokladnu (OLD + NEW formát) bez filtru na stav knihy
3. UPDATE agregace: `skutecne_cerpano` a `cerpano_pokladna`

**Neřeší:**
- ❌ Rezervace (objednávky)
- ❌ Předpoklad (položky)
- ❌ Zůstatky a procenta

**Kdy použít:**
- Rychlý přepočet po změně faktur/pokladny
- Když není potřeba přepočítat rezervace/předpoklad

---

## Pokladní čerpání

### Logika LIVE stavu

**⚠️ DŮLEŽITÁ ZMĚNA (2.1.2026):**

Pokladní doklady se započítávají **OKAMŽITĚ po uložení**, **bez ohledu na uzavření knihy**.

```php
// PŘED (starý stav)
WHERE pk.stav_knihy IN ('uzavrena_uzivatelem', 'zamknuta_spravcem')

// PO (nový stav)
WHERE pp.smazano = 0  -- jen nesmazané
// BEZ filtru na stav_knihy
```

**Důvod změny:**
- Pokladna je výdaj v daném čase/měsíci
- Není podmíněna uzavřením knihy
- Pokud se doklad změní/vyloučí → provede se nový přepočet

### Dva formáty pokladny

#### OLD formát (single-LP)
**Tabulka:** `25a_pokladni_polozky`  
**Pole:** `lp_kod` (např. "LPIT1")  
**Flag:** `ma_detail = 0` nebo `NULL`

```sql
SELECT COALESCE(pp.castka_vydaj, pp.castka_celkem) as castka
FROM 25a_pokladni_polozky pp
WHERE pp.lp_kod = 'LPIT1'
  AND pp.smazano = 0
  AND (pp.ma_detail = 0 OR pp.ma_detail IS NULL)
```

**Příklad:**
```
ID 96: castka_vydaj=2500, lp_kod="LPIT1", ma_detail=0
→ Čerpání: 2500 Kč z LP LPIT1
```

#### NEW formát (multi-LP)
**Tabulka:** `25a_pokladni_polozky_detail`  
**Pole:** `lp_kod`  
**Flag:** v hlavní tabulce `ma_detail = 1`

```sql
SELECT pd.castka
FROM 25a_pokladni_polozky_detail pd
JOIN 25a_pokladni_polozky pp ON pd.polozka_id = pp.id
WHERE pd.lp_kod = 'LPIT1'
  AND pp.smazano = 0
```

**Příklad:**
```
Hlavní záznam ID 50: ma_detail=1
Detail ID 10: castka=500, lp_kod="LPIT1"
Detail ID 11: castka=499, lp_kod="LPIT2"
→ LP LPIT1: 500 Kč, LP LPIT2: 499 Kč
```

### Stored Procedure - UNION ALL

```sql
SELECT COALESCE(SUM(castka), 0) INTO v_cerpano_pokladna
FROM (
  -- NOVÝ formát: Multi-LP detail položky
  SELECT pd.castka
  FROM 25a_pokladni_polozky_detail pd
  JOIN 25a_pokladni_polozky pp ON pd.polozka_id = pp.id
  WHERE pd.lp_kod = v_lp_cislo
    AND pp.smazano = 0
  
  UNION ALL
  
  -- STARÝ formát: Single-LP bez detailů
  SELECT COALESCE(pp.castka_vydaj, pp.castka_celkem) as castka
  FROM 25a_pokladni_polozky pp
  WHERE pp.lp_kod = v_lp_cislo
    AND pp.smazano = 0
    AND (pp.ma_detail = 0 OR pp.ma_detail IS NULL)
) as lp_pokladna;
```

**Klíč:** `ma_detail` flag zabraňuje duplicitám
- `ma_detail = 1` → počítá se JEN z detail tabulky
- `ma_detail = 0` → počítá se JEN z hlavní tabulky

---

## Časté problémy a řešení

### ❌ Problém: Objednávky se nezapočítávají

**Symptom:** Agregace má nulové nebo nízké hodnoty pro rezervaci/předpoklad

**Příčiny:**
1. **OLD formát není podporován** - kontrola:
```sql
SELECT COUNT(*) 
FROM 25a_objednavky 
WHERE financovani REGEXP '^LP[A-Z]+[0-9]+$';
```

2. **Datum mimo platnost** - kontrola:
```sql
SELECT obj.id, DATE(obj.dt_vytvoreni), lp.platne_od, lp.platne_do
FROM 25a_objednavky obj, 25_limitovane_prisliby lp
WHERE obj.financovani = lp.cislo_lp
  AND DATE(obj.dt_vytvoreni) NOT BETWEEN lp.platne_od AND lp.platne_do;
```

3. **Faktura už existuje** - kontrola:
```sql
SELECT obj.id, COUNT(f.id) as pocet_faktur
FROM 25a_objednavky obj
LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = obj.id
WHERE obj.financovani = 'LPIA1'
GROUP BY obj.id
HAVING pocet_faktur > 0;
```

**Řešení:**
- PHP handler v `limitovanePrislibyCerpaniHandlers_v2_pdo.php` už podporuje OLD formát ✅
- Zkontrolovat platnosti LP
- Pokud má objednávka fakturu, počítá se jen do `skutecne_cerpano`

### ❌ Problém: Pokladna se nezapočítává

**Symptom:** `cerpano_pokladna = 0` i přes doklady v pokladně

**Příčiny:**
1. **Nesprávný rok** - pokladna se filtruje podle `pk.rok`
```sql
SELECT pp.id, DATE(pp.datum_zapisu), pk.rok
FROM 25a_pokladni_polozky pp
JOIN 25a_pokladni_knihy pk ON pk.id = pp.pokladni_kniha_id
WHERE pp.lp_kod = 'LPIT1';
```

2. **Smazaný doklad** - kontrola `smazano` flag
```sql
SELECT pp.id, pp.smazano
FROM 25a_pokladni_polozky pp
WHERE pp.lp_kod = 'LPIT1';
```

3. **Duplicita OLD/NEW** - položka má `ma_detail=1` ALE i `lp_kod` v hlavní tabulce
```sql
SELECT pp.id, pp.lp_kod, pp.ma_detail,
       (SELECT COUNT(*) FROM 25a_pokladni_polozky_detail WHERE polozka_id = pp.id)
FROM 25a_pokladni_polozky pp
WHERE pp.lp_kod = 'LPIT1';
```

**Řešení:**
- Zkontrolovat `pk.rok` - musí odpovídat roku LP
- `pp.smazano` musí být 0
- Pokud `ma_detail=1`, nesmí být `lp_kod` v hlavní tabulce (nebo naopak)

### ❌ Problém: Rozdíl mezi max_cena a sumou položek

**Symptom:** `rezervovano != predpokladane_cerpani`

**Příčiny:**
- **To je normální!** Různé úrovně odhadů:
  - max_cena = pesimistický (nejvyšší možná)
  - suma položek = realný (skutečné ceny)
  
**Příklad:**
```
Objednávka 11172:
- max_cena_s_dph: 120 000 Kč (rezervace)
- suma položek: 118 500 Kč (předpoklad)
→ Rozdíl: 1 500 Kč (snížení při zadávání)

Objednávka 11290:
- max_cena_s_dph: 40 000 Kč (rezervace)
- suma položek: 40 Kč (předpoklad)
→ Rozdíl: 39 960 Kč (chyba při zadání?)
```

**Řešení:**
- Není problém - různé úrovně jsou očekávané
- Pokud je rozdíl extrémní (11290), zkontrolovat objednávku

### ❌ Problém: Stored procedure neaktualizuje hodnoty

**Symptom:** Po volání `sp_prepocet_lp_cerpani_faktury()` se hodnoty nemění

**Příčiny:**
1. **Procedura neexistuje** - kontrola:
```sql
SHOW PROCEDURE STATUS WHERE Name = 'sp_prepocet_lp_cerpani_faktury';
```

2. **Stará verze bez OLD formátu** - kontrola:
```sql
SHOW CREATE PROCEDURE sp_prepocet_lp_cerpani_faktury;
-- Hledat: ma_detail = 0 OR ma_detail IS NULL
```

3. **Chybí vazební tabulka `25a_faktury_lp_cerpani`**

**Řešení:**
```bash
# Znovu vytvořit proceduru
mysql < /var/www/erdms-dev/_docs/database-migrations/2025-12-29_create_sp_prepocet_lp_cerpani_faktury.sql

# Použít PHP handler místo procedury
php /var/www/erdms-dev/test-lp-single.php 6
```

### ❌ Problém: UI zobrazuje jiné hodnoty než agregace

**Symptom:** UI vs DB nesouhlasí

**Příčiny:**
1. **Cache v browseru** - hard refresh (Ctrl+Shift+R)
2. **Nesprávné API volání** - kontrola:
```javascript
// SPRÁVNĚ: čte z agregace
endpoint: 'limitovane-prisliby/stav'

// ŠPATNĚ: live agregace (deprecated)
endpoint: 'limitovane-prisliby/live'
```

3. **Součet pokladny v UI** - kontrola:
```javascript
// UI musí sečíst skutecne_cerpano + cerpano_pokladna
const celkem = data.skutecne_cerpano + data.cerpano_pokladna;
```

**Řešení:**
- Hard refresh v browseru
- Kontrola API endpointu
- Kontrola logiky v UI komponente

---

## Testování

### Test jednotlivého LP

```bash
cd /var/www/erdms-dev
php test-lp-single.php 6   # LP LPIA1 rok 2025
php test-lp-single.php 44  # LP LPIA1 rok 2026
```

### Test SQL dotazem

```sql
-- Manuální přepočet pro ověření
SET @lp_id = 6;
SET @cislo_lp = 'LPIA1';
SET @datum_od = '2025-01-01';
SET @datum_do = '2025-12-31';

-- FAKTURY
SELECT COALESCE(SUM(f.fa_castka), 0) as faktury
FROM 25a_objednavky o
JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
WHERE o.financovani = @cislo_lp
  AND DATE(o.dt_vytvoreni) BETWEEN @datum_od AND @datum_do
  AND f.stav != 'STORNO'
  AND f.aktivni = 1;

-- POKLADNA
SELECT COALESCE(SUM(pp.castka_vydaj), 0) as pokladna
FROM 25a_pokladni_polozky pp
WHERE pp.lp_kod = @cislo_lp
  AND pp.smazano = 0
  AND (pp.ma_detail = 0 OR pp.ma_detail IS NULL);

-- AGREGACE
SELECT skutecne_cerpano, cerpano_pokladna, zbyva_skutecne
FROM 25_limitovane_prisliby_cerpani
WHERE cislo_lp = @cislo_lp AND rok = 2025;
```

---

## API Reference

### POST /api.eeo/api.php - limitovane-prisliby/stav

**Request:**
```json
{
  "endpoint": "limitovane-prisliby/stav",
  "token": "...",
  "isAdmin": true,
  "rok": 2025
}
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 826,
      "cislo_lp": "LPIT1",
      "kategorie": "LPIT",
      "rok": 2025,
      "celkovy_limit": 1500000.00,
      "rezervovano": 626466.00,
      "predpokladane_cerpani": 947024.33,
      "skutecne_cerpano": 243544.00,
      "cerpano_pokladna": 27367.00,
      "zbyva_skutecne": 1229089.00,
      "procento_skutecne": 18.06,
      "posledni_prepocet": "2026-01-02 22:40:58"
    }
  ]
}
```

### POST /api.eeo/api.php - limitovane-prisliby/prepocet

**Request:**
```json
{
  "endpoint": "limitovane-prisliby/prepocet",
  "token": "...",
  "lp_id": 6,
  "rok": 2025
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "lp_id": 6,
    "cislo_lp": "LPIA1",
    "rok": 2025,
    "rezervovano": 24516.00,
    "predpokladane_cerpani": 84551.00,
    "skutecne_cerpano": 39480.00,
    "cerpano_pokladna": 245.25
  }
}
```

---

## Changelog

### 2.1.2026 - Oprava OLD formátu a pokladny

**Změny:**
1. ✅ PHP handler podporuje OLD formát (plain string LP kód)
2. ✅ Pokladna se počítá LIVE bez filtru na stav knihy
3. ✅ Stored procedure sjednocena s PHP handlerem
4. ✅ `skutecne_cerpano` a `cerpano_pokladna` samostatně

**Dopad:**
- Nyní se počítají **všechny objednávky** (OLD 95.3% + NEW 4.7%)
- Pokladní doklady započítány **okamžitě** po uložení
- Agregace **kompletní a přesná**

**Soubory:**
- `limitovanePrislibyCerpaniHandlers_v2_pdo.php` - upraveno
- `2025-12-29_create_sp_prepocet_lp_cerpani_faktury.sql` - upraveno

---

## Kontakt

**Autor:** Robert Holovský (robex08)  
**GitHub:** github.com/robex08/eeo2025-erdms  
**Datum:** 2. ledna 2026
