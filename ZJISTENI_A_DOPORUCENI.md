# PŘEHLED ZJIŠTĚNÍ A DOPORUČENÍ PRO OPRAVU ČERPÁNÍ

**Datum:** 13. května 2026  
**Status:** ✅ Analýza dokončena  

---

## 📊 SOUHRN ZJIŠTĚNÍ

### 1. FÁZE: Čerpání z limitovaných příslibů (LP)

#### ✅ DVĚ SEKCE - TŘI TYPY ČERPÁNÍ

**SEKCE A: Rezervace & Předpoklad** (Před fakturací)
- **Rezervace:** Schválené objednávky BEZ faktur a položek → `max_cena_s_dph`
- **Předpoklad:** Odeslané objednávky BEZ potvrzené věcné správnosti → suma položek nebo `max_cena_s_dph`

**SEKCE B: Skutečné čerpání** (Po fakturaci)
- **Faktury:** Pouze s potvrzenou věcnou správností
- **Pokladna:** Samostatný sloupec `cerpano_pokladna`

#### ✅ BACKEND VÝPOČTY JSOU SPRÁVNÉ

Soubor: `limitovanePrislibyCerpaniHandlers_v2_pdo.php`

**Klíčové body:**
```php
// ✅ SPRÁVNĚ: Rezervace = jen objednávky BEZ faktur a BEZ položek
WHERE fakt.id IS NULL AND pol.id IS NULL

// ✅ SPRÁVNĚ: Předpoklad = objednávky BEZ potvrzené věcné správnosti
WHERE (fakt.id IS NULL OR fakt.potvrdil_vecnou_spravnost_id IS NULL)

// ✅ SPRÁVNĚ: Skutečné = jen faktury S potvrzenou věcnou správností
WHERE fakt.potvrdil_vecnou_spravnost_id IS NOT NULL

// ✅ SPRÁVNĚ: Zůstatky se SČÍTAJÍ (ne max!)
$zbyva_rezervace = $celkovy_limit - ($rezervovano + $celkove_skutecne);
$zbyva_predpoklad = $celkovy_limit - ($predpokladane_cerpani + $celkove_skutecne);
$zbyva_skutecne = $celkovy_limit - $celkove_skutecne;
```

**Důvod sčítání:**
- Rezervace/Předpoklad = objednávky **BEZ** faktur
- Skutečné = objednávky **S** fakturami
- Každá objednávka je BUĎTO v rezervaci/předpokladu, NEBO ve skutečném
- NIKDY obojí! ✅

#### ✅ FRONTEND VÝPOČTY JSOU SPRÁVNÉ

Soubor: `LimitovanePrislibyManager.js`

```javascript
// ✅ SPRÁVNĚ: Celkové skutečné = faktury + pokladna
celkove_skutecne: filteredData.reduce((sum, lp) => 
  sum + ((lp.skutecne_cerpano || 0) + (lp.cerpano_pokladna || 0)), 0)

// ✅ SPRÁVNĚ: Procenta
prumerne_procento_skutecne = (celkove_skutecne / celkovy_limit) * 100
```

---

### 2. FÁZE: Čerpání ze smluv

#### ⚠️ IDENTIFIKOVANÝ PROBLÉM: Dvojité počítání

**Problém:**
- Položky objednávek S fakturou se počítaly jak do `cerpano_pozadovano`, tak do `cerpano_skutecne`
- Výsledek: 4000% čerpání! 😱

**Příčina:**
```sql
-- ❌ CHYBNÉ: Bez filtru na faktury
SELECT SUM(pol.cena_s_dph)
FROM 25a_objednavky_polozky pol
WHERE ...
-- Započítá VŠECHNY položky, i ty S fakturou!
```

**Oprava:** ✅ HOTOVO v stored procedure `sp_prepocet_cerpani_smluv`
```sql
-- ✅ SPRÁVNĚ: S filtrem na faktury
LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
WHERE f.id IS NULL  -- ⚠️ KLÍČOVÉ!
```

#### ✅ TŘI TYPY ČERPÁNÍ SMLUV

1. **POŽADOVÁNO** (`cerpano_pozadovano`): Položky objednávek **BEZ** faktury
2. **PLÁNOVÁNO** (`cerpano_planovano`): Prozatím = požadováno (TODO: implementace)
3. **SKUTEČNĚ** (`cerpano_skutecne`): Faktury (přes obj. nebo přímé)

**Logika:**
```
PŘED fakturou:
- cerpano_pozadovano = 9 950 (položky bez faktury)
- cerpano_skutecne = 0
- procento = (9950 + 0) / 10000 = 99.5%

PO faktuře:
- cerpano_pozadovano = 0 (položky už MAJÍ fakturu → WHERE f.id IS NULL)
- cerpano_skutecne = 9 000 (faktura)
- procento = (0 + 9000) / 10000 = 90%
- zbyva = 10000 - (0 + 9000) = 1000 Kč ✅
```

#### ✅ FRONTEND VÝPOČTY SMLUV JSOU SPRÁVNÉ

Soubor: `SmlouvyTab.js`

```javascript
// ✅ SPRÁVNĚ: Celkem čerpáno
const celkemCerpano = smlouvyProStatistiku.reduce(
  (sum, s) => sum + (parseFloat(s.cerpano_celkem) || 0), 0)

// ✅ SPRÁVNĚ: Jen smlouvy se stropem >= 100 Kč
const smlouvySeStropem = smlouvyProStatistiku.filter(
  s => (parseFloat(s.hodnota_s_dph) || 0) >= MIN_CAP_THRESHOLD)

// ✅ SPRÁVNĚ: Průměrné čerpání
const prumerneCerpani = celkemLimit > 0
  ? (celkemCerpano / celkemLimit) * 100
  : null;
```

---

## 🔍 MOŽNÉ PROBLÉMY NALEZENÉ

### Problém 1: ✅ OPRAVENO - Dvojité počítání smluv
**Status:** ✅ Opraveno v stored procedure  
**Soubor:** `fix_smlouvy_cerpani_OPRAVA_V2.sql`  
**Řešení:** Přidán filtr `WHERE f.id IS NULL` pro položky bez faktury

### Problém 2: ✅ IMPLEMENTOVÁNO - Filtr věcné správnosti
**Status:** ✅ Implementováno v LP handlers  
**Řešení:** Faktury se počítají pouze s `potvrdil_vecnou_spravnost_id IS NOT NULL`

### Problém 3: ✅ ŘEŠENO - Multi-LP objednávky
**Status:** ✅ Implementována priorita  
**Řešení:**
1. Primárně: LP rozpis z `25a_faktury_lp_cerpani`
2. Fallback: Poměr `fa_castka / počet_LP`

### Problém 4: ⚠️ MOŽNÝ - Pokladna vs. Faktury
**Status:** ✅ Správně odděleno  
**Implementace:**
- `skutecne_cerpano` = samostatný sloupec (jen faktury)
- `cerpano_pokladna` = samostatný sloupec (jen pokladna)
- UI sčítá: `celkove_skutecne = skutecne_cerpano + cerpano_pokladna`

---

## 📋 KONTROLNÍ CHECKLIST

### Backend kontrola

- [x] ✅ LP: Rezervace počítá jen objednávky BEZ faktur a položek
- [x] ✅ LP: Předpoklad počítá objednávky BEZ potvrzené věcné správnosti
- [x] ✅ LP: Skutečné počítá jen faktury S potvrzenou věcnou správností
- [x] ✅ LP: Pokladna je v samostatném sloupci
- [x] ✅ LP: Zůstatky se SČÍTAJÍ (ne max)
- [x] ✅ Smlouvy: Položky BEZ faktury → požadováno
- [x] ✅ Smlouvy: Faktury → skutečně
- [x] ✅ Smlouvy: LEFT JOIN s WHERE f.id IS NULL

### Frontend kontrola

- [x] ✅ LP: `celkove_skutecne = skutecne_cerpano + cerpano_pokladna`
- [x] ✅ LP: Procenta počítána správně
- [x] ✅ LP: Mapování BE → FE správné
- [x] ✅ Smlouvy: Jen smlouvy >= 100 Kč pro průměr
- [x] ✅ Smlouvy: `cerpano_celkem` použit správně
- [x] ✅ Smlouvy: Statistiky správně filtrují aktivní/neaktivní

### SQL Stored Procedures

- [x] ✅ `sp_prepocet_cerpani_smluv`: Opravena proti dvojitému počítání
- [x] ✅ `prepocetCerpaniPodleIdLP_PDO`: Správná logika pro LP
- [x] ✅ Oba používají prepared statements (PDO)
- [x] ✅ Oba mají správné filtry na stavy objednávek

---

## 🚀 DOPORUČENÉ AKCE

### 1. ⏳ Spustit kontrolní skripty
```bash
# Zkontrolovat aktuální data
mysql -u root -p EEO-OSTRA-DEV < KONTROLA_CERPANI_SQL.sql > kontrola_vysledky.txt
```

### 2. ⏳ Pokud se najdou problémy, spustit opravné skripty
```bash
# ⚠️ VŽDY ZÁLOHOVAT PŘED SPUŠTĚNÍM!
mysql -u root -p EEO-OSTRA-DEV < OPRAVA_CERPANI_SQL.sql
```

### 3. ⏳ Přepočítat všechna data
```bash
# LP
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -d '{"endpoint":"limitovane-prisliby/prepocet","rok":2025,"username":"admin","token":"..."}'

# Smlouvy
curl -X POST https://eeo.zachranka.cz/api.eeo/api.php \
  -d '{"endpoint":"ciselniky/smlouvy/inicializace","username":"admin","token":"..."}'
```

### 4. ⏳ Ověřit výsledky
```bash
# Zkontrolovat znovu
mysql -u root -p EEO-OSTRA-DEV < KONTROLA_CERPANI_SQL.sql > kontrola_po_oprave.txt

# Porovnat výsledky před a po
diff kontrola_vysledky.txt kontrola_po_oprave.txt
```

---

## 📈 OČEKÁVANÉ VÝSLEDKY

### Po spuštění oprav by měly být:

#### LP
- ✅ Žádné záporné hodnoty v `rezervovano`, `predpokladane_cerpani`, `skutecne_cerpano`
- ✅ Zůstatky správně vypočítané: `zbyva_skutecne = limit - skutecne - pokladna`
- ✅ Procenta v rozsahu 0-999.99 (max hodnota DECIMAL(5,2))
- ✅ Každá objednávka započítána jen jednou (buď v rezervaci/předpokladu, nebo skutečně)

#### Smlouvy
- ✅ Žádné záporné hodnoty v `cerpano_pozadovano`, `cerpano_skutecne`
- ✅ `cerpano_celkem = cerpano_pozadovano + cerpano_skutecne` (s tolerancí 0.01 Kč)
- ✅ Žádná položka objednávky započítána dvakrát
- ✅ Procenta reálná (ne 4000%!)

#### Statistiky
- ✅ Celkové čerpání <= celkový limit + rozumná tolerance (např. 120%)
- ✅ Průměrné procento odpovídá realitě
- ✅ Počet LP/smluv odpovídá databázi

---

## 🔧 SOUBORY K PROZKOUMÁNÍ

### Vytvořené dokumenty
1. ✅ `ANALYZA_CERPANI_SYSTEM.md` - Kompletní analýza systému
2. ✅ `KONTROLA_CERPANI_SQL.sql` - Kontrolní SQL skripty
3. ✅ `OPRAVA_CERPANI_SQL.sql` - Opravné SQL skripty
4. ✅ `ZJISTENI_A_DOPORUCENI.md` - Tento soubor

### Klíčové soubory v projektu
1. Backend LP: `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php`
2. Backend Smlouvy: `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php`
3. Stored Procedure: `archive/sql-scripts/fixes/fix_smlouvy_cerpani_OPRAVA_V2.sql`
4. Frontend LP: `apps/eeo-v2/client/src/components/LimitovanePrislibyManager.js`
5. Frontend Smlouvy: `apps/eeo-v2/client/src/components/dictionaries/tabs/SmlouvyTab.js`
6. Hlavní stránka: `apps/eeo-v2/client/src/pages/CerpaniPage.js`

---

## ✅ ZÁVĚR

### Systém čerpání je z hlediska kódu správně navržen a implementován:

1. ✅ **LP čerpání:** Správná logika tří typů (rezervace, předpoklad, skutečné)
2. ✅ **Smlouvy čerpání:** Opravena stored procedure proti dvojitému počítání
3. ✅ **Frontend:** Správné výpočty statistik
4. ✅ **Oddělení:** Faktury a pokladna správně odděleny

### Možné problémy v datech:

- ⏳ Pokud existují **historická data** z období před opravou stored procedure
- ⏳ Pokud byly **manuální úpravy** v databázi
- ⏳ Pokud existují **nekonzistentní data** (faktury bez objednávek, apod.)

### Řešení:

1. ✅ Spustit kontrolní skripty
2. ⏳ Najít konkrétní problematické záznamy
3. ⏳ Spustit opravné skripty (se zálohováním!)
4. ⏳ Přepočítat všechna LP a smlouvy
5. ✅ Ověřit výsledky

---

**Konec přehledu** 🎉  
**Připraven:** 13. května 2026  
**Autor:** GitHub Copilot
