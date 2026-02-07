# 📋 ANALÝZA SYSTÉMU ČERPÁNÍ SMLUV - KOMPLETNÍ REVIZE

**Datum:** 16. ledna 2026  
**Autor:** GitHub Copilot (robex08)  
**Verze systému:** v2025.03_25  
**Účel:** Revize inicializace a přepočtu čerpání smluv

---

## 🎯 ZADÁNÍ

Provést komplexní revizi systému čerpání smluv s důrazem na:

1. **Dva typy smluv podle stropové ceny:**
   - Smlouvy **se stropovou cenou** (`hodnota_s_dph > 0`) - čerpání se odečítá, při dosažení stropu nelze dále čerpat
   - Smlouvy **bez stropové ceny** (`hodnota_s_dph = 0`) - neomezené čerpání po dobu platnosti smlouvy

2. **Kontrola inicializace a přepočtu**
3. **Porovnání s logikou LP kódů** (referenční implementace)

---

## 📊 AKTUÁLNÍ STAV DATABÁZE

### Struktura tabulky `25_smlouvy`

Tabulka obsahuje tyto klíčové sloupce:

#### Základní údaje
- `id` - primární klíč
- `cislo_smlouvy` - unikátní číslo smlouvy
- `nazev_smlouvy` - název/předmět smlouvy
- `usek_id` - příslušnost k úseku
- `druh_smlouvy` - typ smlouvy (SLUŽBY, KUPNÍ, RÁMCOVÁ, atd.)

#### Platnost
- `platnost_od` - datum platnosti od
- `platnost_do` - datum platnosti do (default: 2099-12-31 pro dlouhodobé smlouvy)

#### Finanční údaje
- `hodnota_bez_dph` - hodnota smlouvy bez DPH
- `hodnota_s_dph` - **STROPOVÁ CENA** smlouvy s DPH
- `sazba_dph` - použitá sazba DPH (%)

#### ⚡ TŘI TYPY ČERPÁNÍ (podle vzoru LP kódů)

**1. POŽADOVÁNO** (`cerpano_pozadovano`):
- Suma `max_cena_s_dph` z objednávek
- Pesimistický odhad (maximální schválená částka)
- Počítá se pro objednávky s `pouzit_v_obj_formu = 1`

**2. PLÁNOVÁNO** (`cerpano_planovano`):
- Suma položek z objednávek
- Reálný odhad (skutečně objednané položky)
- ⚠️ TODO: Není implementováno, zatím = `cerpano_pozadovano`

**3. SKUTEČNĚ ČERPÁNO** (`cerpano_skutecne`):
- Suma faktur (`fa_castka`)
- Finální čerpání (co už bylo proplaceno)
- **PRIMÁRNÍ** pro kontrolu stropu

#### Zbývající částky
- `zbyva_pozadovano` = `hodnota_s_dph - cerpano_pozadovano`
- `zbyva_planovano` = `hodnota_s_dph - cerpano_planovano`
- `zbyva_skutecne` = `hodnota_s_dph - cerpano_skutecne`

#### Procenta čerpání
- `procento_pozadovano` = `(cerpano_pozadovano / hodnota_s_dph) * 100`
- `procento_planovano` = `(cerpano_planovano / hodnota_s_dph) * 100`
- `procento_skutecne` = `(cerpano_skutecne / hodnota_s_dph) * 100`

#### Zpětná kompatibilita
- `cerpano_celkem` = `cerpano_skutecne` (pro starý kód)
- `zbyva` = `zbyva_skutecne`
- `procento_cerpani` = `procento_skutecne`

#### Stav
- `aktivni` - 1 = aktivní, 0 = neaktivní
- `stav` - AKTIVNI, UKONCENA, PRERUSENA, PRIPRAVOVANA
- `pouzit_v_obj_formu` - 1 = dostupná v OrderForm, 0 = pouze v modulu faktur

---

## 🔍 ANALÝZA AKTUÁLNÍ LOGIKY

### 1. Rozlišení typů smluv podle `pouzit_v_obj_formu`

#### Typ A: Smlouvy dostupné v OrderForm (`pouzit_v_obj_formu = 1`)

**Kde se používají:**
- ✅ OrderForm25 - uživatel vybírá smlouvu při tvorbě objednávky
- ✅ Modul faktur - fakturu lze navázat na objednávku nebo přímo na smlouvu

**Logika čerpání:**
```
OBJEDNÁVKA (schválená)
  ├─► POŽADOVÁNO: max_cena_s_dph  (odhad max. nákladů)
  ├─► PLÁNOVÁNO: Σ položek       (TODO - reálný odhad)
  └─► FAKTURA ────────────────────► SKUTEČNĚ ČERPÁNO (finální)
```

**SQL pro přepočet (ze stored procedure):**
```sql
-- 1. Požadováno
SELECT COALESCE(SUM(max_cena_s_dph), 0)
FROM 25a_objednavky
WHERE JSON_UNQUOTE(JSON_EXTRACT(financovani, '$.cislo_smlouvy')) = v_cislo_smlouvy
  AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA');

-- 2. Plánováno (zatím fallback)
SET v_cerpano_planovano = v_cerpano_pozadovano;

-- 3. Skutečně čerpáno
SELECT COALESCE(SUM(...), 0)
FROM 25a_objednavky_faktury f
LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
WHERE (
  -- A) Faktura navázána přes objednávku
  (f.objednavka_id IS NOT NULL 
   AND JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) = v_cislo_smlouvy)
  OR
  -- B) Faktura navázána přímo na smlouvu
  (f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL)
)
AND f.stav != 'STORNO';
```

#### Typ B: Smlouvy pouze v modulu faktur (`pouzit_v_obj_formu = 0`)

**Kde se používají:**
- ❌ OrderForm25 - smlouva se nenabízí
- ✅ Modul faktur - faktura navázána přímo na smlouvu

**Logika čerpání:**
```
FAKTURA (přímo na smlouvu)
  └─► SKUTEČNĚ ČERPÁNO (jediný zdroj)

POŽADOVÁNO = 0   (nejsou objednávky)
PLÁNOVÁNO = 0    (nejsou objednávky)
```

**SQL pro přepočet:**
```sql
SELECT COALESCE(SUM(f.fa_castka), 0)
FROM 25a_objednavky_faktury f
WHERE f.smlouva_id = v_smlouva_id
  AND f.stav != 'STORNO';
```

---

## 🚨 ZJIŠTĚNÉ PROBLÉMY

### ❌ Problém 1: Smlouvy se stropem (`hodnota_s_dph > 0`)

**Očekáváno:**
- Čerpání se odečítá od hodnoty smlouvy
- Při dosažení stropu (`cerpano_skutecne >= hodnota_s_dph`) nelze dále čerpat
- Kontrola před vytvořením objednávky/faktury

**Realita:**
- ✅ Přepočet čerpání **PROBÍHÁ** (stored procedure)
- ✅ Počítá se `zbyva_skutecne = hodnota_s_dph - cerpano_skutecne`
- ❌ **CHYBÍ KONTROLA při vytváření objednávky/faktury**
- ❌ **CHYBÍ INICIALIZACE** (není ekvivalent k `/limitovane-prisliby/inicializace`)

**Důsledek:**
Uživatel může vytvořit objednávku nebo fakturu i když je strop překročen!

### ❌ Problém 2: Smlouvy bez stropu (`hodnota_s_dph = 0`)

**Očekáváno:**
- Neomezené čerpání po dobu platnosti smlouvy
- Kontrola pouze platnosti (`platnost_od` ≤ dnes ≤ `platnost_do`)
- `zbyva_skutecne` by mělo být `NULL` nebo `∞`

**Realita:**
- ✅ Přepočet čerpání **PROBÍHÁ**
- ❌ **NESPRÁVNÝ VÝPOČET ZBYTKU:**
  ```sql
  zbyva_skutecne = hodnota_s_dph - cerpano_skutecne
  -- Pro hodnota_s_dph = 0 → zbyva = 0 - 150000 = -150000 (záporné!)
  ```
- ❌ **PROCENTA ČERPÁNÍ NELZE SPOČÍTAT:**
  ```sql
  procento_skutecne = IF(hodnota_s_dph > 0, (v_cerpano_skutecne / hodnota_s_dph) * 100, 0)
  -- Pro hodnota_s_dph = 0 → dělení nulou!
  ```
- ❌ **CHYBÍ KONTROLA PLATNOSTI** při vytváření objednávky/faktury

**Důsledek:**
1. Záporné hodnoty `zbyva_*` matou uživatele
2. Procenta čerpání jsou vždy 0% (i když je čerpáno 150 000 Kč!)
3. Smlouvy bez stropu vypadají v UI jako "plně vyčerpané" nebo "překročené"

### ❌ Problém 3: Chybějící inicializace

**Co existuje:**
- `/ciselniky/smlouvy/prepocet-cerpani` - manuální přepočet smluv
- `prepocetCerpaniSmlouvyAuto($cislo_smlouvy)` - auto přepočet po uložení objednávky

**Co CHYBÍ:**
- `/ciselniky/smlouvy/inicializace` - inicializace všech smluv od nuly
  - Ekvivalent k `/limitovane-prisliby/inicializace`
  - Vymaže historická data čerpání
  - Přepočítá všechny smlouvy podle aktuálního stavu DB

**Důsledek:**
Není způsob jak "resetovat" systém čerpání při změnách v datech nebo při zjištění chyb.

### ❌ Problém 4: Kontrola stropu při vytváření objednávky

**Co by mělo být:**
```php
// OrderForm25 - před uložením objednávky
if ($cislo_smlouvy) {
    $smlouva = getSmlouva($cislo_smlouvy);
    
    // Kontrola stropu
    if ($smlouva['hodnota_s_dph'] > 0) {
        $nova_castka = $formData['max_cena_s_dph'];
        $po_cerpani = $smlouva['cerpano_pozadovano'] + $nova_castka;
        
        if ($po_cerpani > $smlouva['hodnota_s_dph']) {
            throw new Exception(
                "Překročení stropu smlouvy! " .
                "Zbývá: " . formatCurrency($smlouva['zbyva_pozadovano']) . " Kč, " .
                "Požadováno: " . formatCurrency($nova_castka) . " Kč"
            );
        }
    }
    
    // Kontrola platnosti
    $dnes = date('Y-m-d');
    if ($dnes < $smlouva['platnost_od'] || $dnes > $smlouva['platnost_do']) {
        throw new Exception("Smlouva není platná!");
    }
}
```

**Realita:**
❌ Žádná kontrola stropu ani platnosti při vytváření objednávky

### ❌ Problém 5: Kontrola stropu při vytváření faktury

**Co by mělo být:**
```php
// Modul faktur - před uložením faktury
if ($smlouva_id && $fa_castka > 0) {
    $smlouva = getSmlouva($smlouva_id);
    
    // Kontrola stropu
    if ($smlouva['hodnota_s_dph'] > 0) {
        $po_cerpani = $smlouva['cerpano_skutecne'] + $fa_castka;
        
        if ($po_cerpani > $smlouva['hodnota_s_dph']) {
            // Varování nebo blokování
            $warning = "⚠️ Překročení stropu smlouvy! " .
                      "Zbývá: " . formatCurrency($smlouva['zbyva_skutecne']) . " Kč, " .
                      "Faktura: " . formatCurrency($fa_castka) . " Kč";
        }
    }
    
    // Kontrola platnosti
    $fa_datum = $formData['fa_datum_vystaveni'];
    if ($fa_datum < $smlouva['platnost_od'] || $fa_datum > $smlouva['platnost_do']) {
        $warning = "⚠️ Faktura je mimo platnost smlouvy!";
    }
}
```

**Realita:**
❌ Žádná kontrola stropu ani platnosti při vytváření faktury

---

## ✅ CO FUNGUJE SPRÁVNĚ

1. **Stored procedure `sp_prepocet_cerpani_smluv`**
   - ✅ Správně počítá 3 typy čerpání
   - ✅ Rozlišuje smlouvy podle `pouzit_v_obj_formu`
   - ✅ Ignoruje stornované objednávky a faktury
   - ✅ Aktualizuje `posledni_prepocet` timestamp

2. **Automatický přepočet po uložení objednávky**
   - ✅ Funkce `prepocetCerpaniSmlouvyAuto()` se volá po uložení
   - ✅ Přepočítá čerpání dané smlouvy

3. **API endpoint `/ciselniky/smlouvy/prepocet-cerpani`**
   - ✅ Umožňuje manuální přepočet
   - ✅ Podporuje filtr podle `cislo_smlouvy` nebo `usek_id`

4. **Normalizace dat při importu**
   - ✅ `platnost_do` se normalizuje na 2099-12-31 pokud chybí
   - ✅ Finanční hodnoty se parsují správně (i s mezerami, čárkami)
   - ✅ Dopočítává se hodnota s/bez DPH

---

## 📋 DOPORUČENÉ OPRAVY

### 🔧 Oprava 1: Inicializační endpoint

**Vytvořit:**
`/ciselniky/smlouvy/inicializace`

**Funkce:**
1. Smazat všechna čerpání (`cerpano_* = 0`, `zbyva_* = hodnota_s_dph`)
2. Přepočítat čerpání všech aktivních smluv
3. Vrátit statistiky (počet smluv, celkové čerpání, počet překročených)

**Použití:**
- Po migraci dat
- Po opravě chyb v objednávkách/fakturách
- Periodicky (1x měsíčně) pro kontrolu konzistence

### 🔧 Oprava 2: Logika pro smlouvy bez stropu

**V stored procedure:**
```sql
-- Pro smlouvy s hodnotou = 0 (neomezené)
IF v_hodnota = 0 THEN
  -- Zbytek = NULL (neomezené)
  SET v_zbyva_pozadovano = NULL;
  SET v_zbyva_planovano = NULL;
  SET v_zbyva_skutecne = NULL;
  
  -- Procenta = NULL (nelze spočítat)
  SET v_procento_pozadovano = NULL;
  SET v_procento_planovano = NULL;
  SET v_procento_skutecne = NULL;
ELSE
  -- Normální výpočet pro smlouvy se stropem
  SET v_zbyva_skutecne = v_hodnota - v_cerpano_skutecne;
  SET v_procento_skutecne = (v_cerpano_skutecne / v_hodnota) * 100;
END IF;
```

**V UI:**
- Zobrazit "Neomezené" místo částky pro `hodnota_s_dph = 0`
- Zobrazit pouze skutečné čerpání (ne procenta)
- Kontrolovat platnost místo stropu

### 🔧 Oprava 3: Validace v OrderForm

**Přidat kontrolu před uložením objednávky:**
```php
function validateSmlouva($cislo_smlouvy, $max_cena_s_dph, $db) {
    $smlouva = fetchSmlouva($cislo_smlouvy, $db);
    
    if (!$smlouva) {
        throw new Exception("Smlouva nenalezena");
    }
    
    // 1. Kontrola platnosti
    $dnes = date('Y-m-d');
    if ($dnes < $smlouva['platnost_od']) {
        throw new Exception("Smlouva ještě není platná (platnost od: {$smlouva['platnost_od']})");
    }
    if ($dnes > $smlouva['platnost_do']) {
        throw new Exception("Smlouva již vypršela (platnost do: {$smlouva['platnost_do']})");
    }
    
    // 2. Kontrola stropu (pouze pro smlouvy s hodnotou > 0)
    if ($smlouva['hodnota_s_dph'] > 0) {
        $zbyva = $smlouva['zbyva_pozadovano'];
        
        if ($max_cena_s_dph > $zbyva) {
            throw new Exception(
                "Překročení stropu smlouvy! Zbývá: " . 
                number_format($zbyva, 2, ',', ' ') . " Kč, " .
                "Požadováno: " . number_format($max_cena_s_dph, 2, ',', ' ') . " Kč"
            );
        }
        
        // Varování při 90% čerpání
        if ($max_cena_s_dph > ($zbyva * 0.9)) {
            $warning = "⚠️ Pozor: Zbývá méně než 10% hodnoty smlouvy!";
            // Log warning nebo zobrazit v UI
        }
    }
    
    return array('valid' => true, 'warning' => $warning);
}
```

### 🔧 Oprava 4: Validace v modulu faktur

**Přidat kontrolu před uložením faktury:**
```php
function validateSmlouvaForFaktura($smlouva_id, $fa_castka, $fa_datum, $db) {
    $smlouva = fetchSmlouvyById($smlouva_id, $db);
    
    if (!$smlouva) {
        throw new Exception("Smlouva nenalezena");
    }
    
    $warnings = array();
    
    // 1. Kontrola platnosti
    if ($fa_datum < $smlouva['platnost_od'] || $fa_datum > $smlouva['platnost_do']) {
        $warnings[] = "⚠️ Faktura je mimo platnost smlouvy!";
    }
    
    // 2. Kontrola stropu (pouze pro smlouvy s hodnotou > 0)
    if ($smlouva['hodnota_s_dph'] > 0) {
        $po_cerpani = $smlouva['cerpano_skutecne'] + $fa_castka;
        
        if ($po_cerpani > $smlouva['hodnota_s_dph']) {
            $prekroceni = $po_cerpani - $smlouva['hodnota_s_dph'];
            $warnings[] = 
                "⚠️ Překročení stropu smlouvy o " . 
                number_format($prekroceni, 2, ',', ' ') . " Kč! " .
                "(Strop: " . number_format($smlouva['hodnota_s_dph'], 2, ',', ' ') . " Kč, " .
                "Po zaúčtování: " . number_format($po_cerpani, 2, ',', ' ') . " Kč)";
        }
    }
    
    return array(
        'valid' => true,  // Povolit uložení i přes warnings
        'warnings' => $warnings
    );
}
```

### 🔧 Oprava 5: Dashboard / Přehled smluv

**Vylepšení UI:**

```javascript
// Frontend - zobrazení smlouvy
function renderSmlouvaCard(smlouva) {
    const isNeomezena = smlouva.hodnota_s_dph === 0;
    
    if (isNeomezena) {
        // Smlouva bez stropu
        return `
            <div class="smlouva-card neomezena">
                <h3>${smlouva.cislo_smlouvy}</h3>
                <div class="typ">Neomezená smlouva</div>
                <div class="platnost">
                    Platnost: ${smlouva.platnost_od} až ${smlouva.platnost_do}
                </div>
                <div class="cerpani">
                    <strong>Skutečně čerpáno:</strong> ${formatCurrency(smlouva.cerpano_skutecne)} Kč
                </div>
                <div class="status ${getStatusClass(smlouva)}">
                    ${getStatusText(smlouva)}
                </div>
            </div>
        `;
    } else {
        // Smlouva se stropem
        const procento = smlouva.procento_skutecne || 0;
        const colorClass = 
            procento < 50 ? 'ok' :
            procento < 80 ? 'warning' :
            procento < 100 ? 'danger' : 'exceeded';
        
        return `
            <div class="smlouva-card ${colorClass}">
                <h3>${smlouva.cislo_smlouvy}</h3>
                <div class="hodnota">
                    <strong>Strop:</strong> ${formatCurrency(smlouva.hodnota_s_dph)} Kč
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${Math.min(procento, 100)}%"></div>
                </div>
                <div class="cerpani-stats">
                    <div class="stat">
                        <span class="label">Skutečně:</span>
                        <span class="value">${formatCurrency(smlouva.cerpano_skutecne)} Kč</span>
                    </div>
                    <div class="stat">
                        <span class="label">Zbývá:</span>
                        <span class="value">${formatCurrency(smlouva.zbyva_skutecne)} Kč</span>
                    </div>
                    <div class="stat">
                        <span class="label">Čerpání:</span>
                        <span class="value">${procento.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    }
}
```

---

## 🎯 ZÁVĚR A DOPORUČENÍ

### Priorita úprav:

#### 🔴 VYSOKÁ (kritické):
1. **Oprava logiky pro smlouvy bez stropu** - aktuálně nelze rozlišit
2. **Validace stropu v OrderForm** - bez ní lze překročit strop
3. **Inicializační endpoint** - nutný pro konzistenci dat

#### 🟡 STŘEDNÍ (důležité):
4. **Validace v modulu faktur** - varování při překročení
5. **UI vylepšení** - lepší viditelnost typů smluv

#### 🟢 NÍZKÁ (volitelné):
6. **Implementace plánovaného čerpání** (z položek)
7. **CRON job pro pravidelný přepočet**
8. **Export reportů** (Excel, PDF)

---

## 📝 DALŠÍ DOTAZY K ZODPOVĚZENÍ

1. **Při vytváření objednávky se smlouvou bez stropu:**
   - Má se kontrolovat pouze platnost? ✅
   - Nebo má být nějaký limit warning (např. 1M Kč)? ❓

2. **Při překročení stropu faktury:**
   - Povolit uložení s varováním? ❓
   - Nebo zablokovat uložení? ❓

3. **Reporting:**
   - Má být email alert při překročení 90% stropu? ❓
   - Dashboard widget se smlouvami blízko stropu? ❓

4. **Měna a DPH:**
   - Čerpání se počítá vždy s DPH (hodnota_s_dph)? ✅
   - Nebo existují smlouvy kde se počítá bez DPH? ❓

5. **Historická data:**
   - Máme spustit inicializaci ihned po opravě logiky? ❓
   - Nebo nejprve otestovat na vzorku dat? ❓

---

## 📎 PŘÍLOHY

### A. Příklad smlouvy se stropem

```
┌─────────────────────────────────────────┐
│ SMLOUVA: S-134/75030926/2025           │
├─────────────────────────────────────────┤
│ Typ: Rámcová                            │
│ Strop: 655 952,75 Kč (s DPH)           │
│ Platnost: 01.01.2025 - 31.12.2025     │
├─────────────────────────────────────────┤
│ 📊 ČERPÁNÍ:                             │
│   Požadováno:    68 000 Kč (10%)       │
│   Plánováno:     68 000 Kč (10%)       │
│   Skutečně:     360 768 Kč (55%) ✅    │
│ ──────────────────────────────────────  │
│   Zbývá:        295 185 Kč (45%)       │
└─────────────────────────────────────────┘
```

### B. Příklad smlouvy bez stropu

```
┌─────────────────────────────────────────┐
│ SMLOUVA: S-XXX/neomezena/2025          │
├─────────────────────────────────────────┤
│ Typ: Neomezená                          │
│ Strop: 0 Kč (= neomezené)              │
│ Platnost: 01.01.2025 - 31.12.2099     │
├─────────────────────────────────────────┤
│ 📊 ČERPÁNÍ:                             │
│   Skutečně:     1 580 000 Kč ✅        │
│   Zbývá:        NEOMEZENO               │
│                                         │
│ ⚠️ Platnost smlouvy: 315 měsíců         │
└─────────────────────────────────────────┘
```

### C. SQL query pro identifikaci problematických smluv

```sql
-- 1. Smlouvy bez stropu (hodnota = 0) s čerpáním
SELECT 
    cislo_smlouvy,
    nazev_smlouvy,
    hodnota_s_dph,
    cerpano_skutecne,
    zbyva_skutecne,
    procento_skutecne,
    platnost_od,
    platnost_do,
    CASE 
        WHEN CURDATE() < platnost_od THEN 'JEŠ TĚ NEPLATNÁ'
        WHEN CURDATE() > platnost_do THEN 'VYPRŠELA'
        ELSE 'PLATNÁ'
    END as status_platnosti
FROM 25_smlouvy
WHERE hodnota_s_dph = 0
  AND aktivni = 1
ORDER BY cerpano_skutecne DESC;

-- 2. Smlouvy se stropem překročené > 100%
SELECT 
    cislo_smlouvy,
    nazev_smlouvy,
    hodnota_s_dph,
    cerpano_skutecne,
    zbyva_skutecne,
    procento_skutecne,
    (cerpano_skutecne - hodnota_s_dph) as prekroceni
FROM 25_smlouvy
WHERE hodnota_s_dph > 0
  AND cerpano_skutecne > hodnota_s_dph
  AND aktivni = 1
ORDER BY prekroceni DESC;

-- 3. Smlouvy blízko stropu (> 90%)
SELECT 
    cislo_smlouvy,
    nazev_smlouvy,
    hodnota_s_dph,
    cerpano_skutecne,
    zbyva_skutecne,
    procento_skutecne
FROM 25_smlouvy
WHERE hodnota_s_dph > 0
  AND procento_skutecne > 90
  AND procento_skutecne <= 100
  AND aktivni = 1
ORDER BY procento_skutecne DESC;

-- 4. Smlouvy s nekonzistentními daty
SELECT 
    cislo_smlouvy,
    hodnota_s_dph,
    cerpano_skutecne,
    zbyva_skutecne,
    (hodnota_s_dph - cerpano_skutecne) as vypocitany_zbytek,
    ABS(zbyva_skutecne - (hodnota_s_dph - cerpano_skutecne)) as rozdil
FROM 25_smlouvy
WHERE ABS(zbyva_skutecne - (hodnota_s_dph - cerpano_skutecne)) > 0.01
  AND aktivni = 1
ORDER BY rozdil DESC;
```

---

**Konec analýzy**  
Připraveno k diskuzi a postupné implementaci oprav.

