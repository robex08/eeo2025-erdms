# ANALÝZA SYSTÉMU ČERPÁNÍ - KOMPLETNÍ PŘEHLED

**Datum:** 13. května 2026  
**Autor:** GitHub Copilot  
**Účel:** Ověření a oprava výpočtů čerpání z limitovaných příslibů a smluv

---

## 📊 PŘEHLED SYSTÉMU ČERPÁNÍ

### 1. FÁZE: Čerpání z limitovaných příslibů (LP)

Systém LP má **DVĚ SEKCE** (tři typy čerpání):

#### Sekce A: **REZERVACE** (Pesimistický odhad)
- **Co počítá:** Maximální ceny (`max_cena_s_dph`) ze schválených objednávek
- **Kdy:** Objednávka je ve stavu "Schválená" a ještě NEMÁ faktury ani položky
- **Účel:** Prevence překročení limitu před fakturací
- **Vzorec:** `SUM(max_cena_s_dph / počet_LP)` pro každou objednávku BEZ faktur a BEZ položek

#### Sekce B: **PŘEDPOKLAD** (Reálný odhad)
- **Co počítá:** Suma položek z objednávek odeslaných dodavateli
- **Kdy:** Objednávka je odeslána dodavateli (ne "Ke schválení", ne "Schválená"), ale NEMÁ fakturu s potvrzenou věcnou správností
- **Účel:** Přesnější odhad než rezervace
- **Vzorec:** 
  - Pokud má objednávka položky s `lp_id` → `SUM(cena_s_dph)` těchto položek
  - Jinak → `max_cena_s_dph / počet_LP`
- **Logika:** Započítávají se objednávky:
  - a) Bez faktury (`fakt.id IS NULL`)
  - b) S fakturou BEZ potvrzené věcné správnosti (`potvrdil_vecnou_spravnost_id IS NULL`)

### 2. FÁZE: Čerpání skutečné (LP + Smlouvy)

#### **SKUTEČNÉ ČERPÁNÍ** z LP
- **Co počítá:** 
  1. **Faktury** - pouze s potvrzenou věcnou správností (`potvrdil_vecnou_spravnost_id IS NOT NULL`)
  2. **Pokladna** - výdaje z pokladních položek
- **Vzorec:**
  ```
  skutecne_cerpano = faktury (samostatný sloupec)
  cerpano_pokladna = pokladna (samostatný sloupec)
  celkove_skutecne = skutecne_cerpano + cerpano_pokladna
  ```
- **Priorita při počítání faktur:**
  - Primárně: LP rozpis z tabulky `25a_faktury_lp_cerpani` (pro multi-LP objednávky)
  - Fallback: Poměr `fa_castka / počet_LP`

#### **ZBÝVAJÍCÍ ČÁSTKY** (tři typy)
```sql
zbyva_rezervace = celkovy_limit - (rezervovano + celkove_skutecne)
zbyva_predpoklad = celkovy_limit - (predpokladane_cerpani + celkove_skutecne)
zbyva_skutecne = celkovy_limit - celkove_skutecne
```

**⚠️ KLÍČOVÉ:** Rezervace a Předpoklad se SČÍTAJÍ s Skutečným čerpáním, protože:
- Rezervace/Předpoklad = objednávky BEZ faktur
- Skutečné = pouze objednávky S fakturami
- Každá objednávka je BUĎTO v rezervaci/předpokladu, NEBO ve skutečném

---

## 🔧 SMLOUVY - TŘI TYPY ČERPÁNÍ

### Varianta 1: Smlouvy v objednávkovém formuláři (`pouzit_v_obj_formu = 1`)

#### **POŽADOVÁNO** (`cerpano_pozadovano`)
- Suma položek objednávek **BEZ faktury**
- SQL: `LEFT JOIN faktury WHERE f.id IS NULL` (klíčový filtr!)
- **Účel:** Odhad čerpání před fakturací

#### **PLÁNOVÁNO** (`cerpano_planovano`)
- Prozatím stejné jako požadováno
- **TODO:** Implementace samostatné logiky

#### **SKUTEČNĚ** (`cerpano_skutecne`)
- Suma faktur (jak přes objednávku, tak přímé na smlouvu)
- **Filtr:** Pouze faktury s `stav != 'STORNO'`

### Varianta 2: Smlouvy MIMO objednávkový formulář (`pouzit_v_obj_formu = 0`)

- **POŽADOVÁNO:** 0 Kč (nejsou objednávky)
- **PLÁNOVÁNO:** 0 Kč (nejsou objednávky)
- **SKUTEČNĚ:** Jen přímé faktury na smlouvu

### ⚠️ KRITICKÁ OPRAVA - Dvojité počítání

**PROBLÉM:** Položky objednávek S fakturou se počítaly jak do `pozadovano`, tak do `skutecne` → 4000% čerpání!

**ŘEŠENÍ:** 
```sql
-- V stored procedure sp_prepocet_cerpani_smluv:
-- Položky BEZ faktury
LEFT JOIN faktury f ON f.objednavka_id = o.id
WHERE f.id IS NULL  -- ⚠️ KLÍČOVÉ!
```

**Logika po opravě:**
```
PŘED fakturou:
- cerpano_pozadovano = 9 950 (položky bez faktury)
- cerpano_skutecne = 0
- procento = (9950 + 0) / 10000 = 99.5%

PO faktuře:
- cerpano_pozadovano = 0 (položky už MAJÍ fakturu → vyfiltruje WHERE f.id IS NULL)
- cerpano_skutecne = 9 000 (faktura)
- procento = (0 + 9000) / 10000 = 90%
- zbyva = 10000 - (0 + 9000) = 1000 Kč ✅
```

---

## 📁 KLÍČOVÉ SOUBORY

### Backend - Limitované přísliby
- **Handler:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php`
- **Funkce:** `prepocetCerpaniPodleIdLP_PDO($pdo, $lp_id, $rok)`
- **Tabulky:**
  - `25_limitovane_prisliby` (master)
  - `25_limitovane_prisliby_cerpani` (agregace)
  - `25a_faktury_lp_cerpani` (vazba faktur-LP)

### Backend - Smlouvy
- **Handler:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php`
- **Stored Procedure:** `/archive/sql-scripts/fixes/fix_smlouvy_cerpani_OPRAVA_V2.sql`
- **Funkce:** 
  - `handle_ciselniky_smlouvy_prepocet_cerpani()`
  - `prepocetCerpaniSmlouvyAuto($cislo_smlouvy)`
  - `handle_ciselniky_smlouvy_inicializace()`

### Frontend
- **Hlavní stránka:** `/apps/eeo-v2/client/src/pages/CerpaniPage.js`
- **LP Manager:** `/apps/eeo-v2/client/src/components/LimitovanePrislibyManager.js`
- **Smlouvy Tab:** `/apps/eeo-v2/client/src/components/dictionaries/tabs/SmlouvyTab.js`

### Dokumentace
- `/docs/LIMITOVANE_PRISLIBY_DOKUMENTACE.md`
- `/docs/SMLOUVY_TRI_TYPY_CERPANI.md`
- `/apps/eeo-v2/client/docs/API-LIMITOVANE-PRISLIBY-DOKUMENTACE-V3.md`

---

## ✅ OVĚŘENÍ VÝPOČTŮ

### LP - Kontrolní body

#### 1. Rezervace (Schválené objednávky bez faktur)
```sql
SELECT 
    obj.id,
    obj.max_cena_s_dph,
    obj.financovani
FROM 25a_objednavky obj
LEFT JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id AND fakt.aktivni = 1
LEFT JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = obj.id
WHERE obj.aktivni = 1
AND obj.stav_objednavky = 'Schválená'
AND fakt.id IS NULL  -- BEZ faktur
AND pol.id IS NULL   -- BEZ položek
```

#### 2. Předpoklad (Odeslané objednávky bez potvrzených faktur)
```sql
SELECT 
    obj.id,
    obj.financovani,
    obj.max_cena_s_dph,
    SUM(CASE WHEN pol.lp_id = :lp_id THEN pol.cena_s_dph ELSE 0 END) as suma_lp_polozky
FROM 25a_objednavky obj
LEFT JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = obj.id
LEFT JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id AND fakt.aktivni = 1
WHERE obj.stav_objednavky NOT IN ('Ke schválení', 'Schválená', 'Nová', ...)
AND (fakt.id IS NULL OR fakt.potvrdil_vecnou_spravnost_id IS NULL)
```

#### 3. Skutečné (Potvrzené faktury + Pokladna)
```sql
-- Faktury
SELECT SUM(CASE WHEN flp.lp_id = :lp_id THEN flp.castka ELSE fa_castka/pocet_lp END)
FROM 25a_objednavky_faktury fakt
WHERE fakt.potvrdil_vecnou_spravnost_id IS NOT NULL
AND fakt.stav != 'STORNO'

-- Pokladna
SELECT SUM(pp.castka_vydaj)
FROM 25a_pokladni_polozky pp
WHERE pp.lp_kod = :cislo_lp
```

### Smlouvy - Kontrolní body

#### Položky BEZ faktury (cerpano_pozadovano)
```sql
SELECT SUM(pol.cena_s_dph)
FROM 25a_objednavky o
INNER JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = o.id
LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
WHERE o.financovani LIKE '%"cislo_smlouvy":"XXX"%'
AND f.id IS NULL  -- ⚠️ KLÍČOVÉ!
```

#### Faktury (cerpano_skutecne)
```sql
SELECT SUM(f.fa_castka)
FROM 25a_objednavky_faktury f
LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
WHERE (
  (f.objednavka_id IS NOT NULL AND o.financovani LIKE '%"cislo_smlouvy":"XXX"%')
  OR (f.smlouva_id = :id AND f.objednavka_id IS NULL)
)
AND f.stav != 'STORNO'
```

---

## 🔍 MOŽNÉ PROBLÉMY A ŘEŠENÍ

### Problém 1: Dvojité počítání objednávek
**Symptom:** Čerpání přes 100%, nereálné procenta  
**Příčina:** Položky S fakturou se počítají jak do požadováno, tak do skutečně  
**Řešení:** ✅ Opraveno přidáním `LEFT JOIN ... WHERE f.id IS NULL`

### Problém 2: Chybějící filtr na věcnou správnost
**Symptom:** Faktury se počítají před potvrzením věcné správnosti  
**Příčina:** Chyběl filtr `potvrdil_vecnou_spravnost_id IS NOT NULL`  
**Řešení:** ✅ Implementováno v LP handlers

### Problém 3: Multi-LP objednávky
**Symptom:** Nesprávné rozdělení čerpání mezi více LP  
**Příčina:** Chybí LP rozpis v tabulce `25a_faktury_lp_cerpani`  
**Řešení:** 
- Priorita: LP rozpis z `25a_faktury_lp_cerpani`
- Fallback: Poměr `fa_castka / počet_LP`

### Problém 4: Pokladna vs. Faktury
**Symptom:** Nejasné, zda pokladna patří do skutečného čerpání  
**Řešení:** 
- ✅ Pokladna = samostatný sloupec `cerpano_pokladna`
- ✅ Faktury = samostatný sloupec `skutecne_cerpano`
- ✅ UI sčítá: `celkove_skutecne = skutecne_cerpano + cerpano_pokladna`

---

## 🎯 DOPORUČENÍ PRO OVĚŘENÍ

### 1. Zkontrolovat LP přepočet
```bash
# Přepočítat všechny LP pro rok 2025
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "limitovane-prisliby/prepocet",
    "username": "admin",
    "token": "...",
    "rok": 2025
  }'
```

### 2. Zkontrolovat smlouvy
```bash
# Přepočítat všechny smlouvy
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "ciselniky/smlouvy/inicializace",
    "username": "admin",
    "token": "..."
  }'
```

### 3. SQL kontrola - najít objednávky počítané dvakrát
```sql
-- LP: Objednávky S fakturou, které by neměly být v rezervaci
SELECT o.id, o.max_cena_s_dph, COUNT(f.id) as pocet_faktur
FROM 25a_objednavky o
INNER JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
WHERE o.stav_objednavky = 'Schválená'
AND o.aktivni = 1
GROUP BY o.id
HAVING pocet_faktur > 0;

-- Smlouvy: Položky S fakturou, které by neměly být v požadováno
SELECT pol.id, pol.cena_s_dph, f.fa_castka
FROM 25a_objednavky_polozky pol
INNER JOIN 25a_objednavky o ON pol.objednavka_id = o.id
INNER JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
WHERE o.financovani LIKE '%cislo_smlouvy%'
AND f.stav != 'STORNO';
```

---

## 📈 FRONTEND STATISTIKY

### LP Manager - Výpočet statistik
```javascript
const stats = {
  celkem_lp: filteredData.length,
  celkovy_limit: SUM(lp.vyse_financniho_kryti),
  celkove_rezervovano: SUM(lp.rezervovano),
  celkove_predpokladane: SUM(lp.predpokladane_cerpani),
  celkove_skutecne: SUM(lp.skutecne_cerpano + lp.cerpano_pokladna),
  celkove_pokladna: SUM(lp.cerpano_pokladna),
  
  // Zbývající částky
  celkem_zbyva_rezervace: SUM(lp.zbyva_rezervace),
  celkem_zbyva_predpoklad: SUM(lp.zbyva_predpoklad),
  celkem_zbyva_skutecne: SUM(lp.zbyva_skutecne),
  
  // Procenta
  prumerne_procento_rezervovano: (celkove_rezervovano / celkovy_limit) * 100,
  prumerne_procento_predpokladane: (celkove_predpokladane / celkovy_limit) * 100,
  prumerne_procento_skutecne: (celkove_skutecne / celkovy_limit) * 100
};
```

### Smlouvy Tab - Výpočet statistik
```javascript
const statistics = {
  celkem_cerpano: SUM(s.cerpano_celkem),  // kde show_inactive nebo aktivni=1
  celkem_limit: SUM(s.hodnota_s_dph),     // kde hodnota >= 100 Kč (MIN_CAP_THRESHOLD)
  celkem_zbyva: SUM(s.zbyva),             // jen smlouvy se stropem
  prumerne_cerpani: (celkem_cerpano / celkem_limit) * 100
};
```

---

## 🚀 DALŠÍ KROKY

1. ✅ **Ověřit stored proceduru** `sp_prepocet_cerpani_smluv` - HOTOVO
2. ⏳ **Zkontrolovat aktuální data** - najít případy dvojitého počítání
3. ⏳ **Implementovat testy** - jednotkové testy pro výpočty
4. ⏳ **Dokumentovat edge cases** - co když faktura nemá objednávku?
5. ⏳ **Optimalizace** - indexy na často dotazovaná pole

---

**Konec analýzy** 🎉
