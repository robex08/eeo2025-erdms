# 📋 ANALÝZA: Přidání poznámky pro LP variantu financování

**Datum:** 17. ledna 2026  
**Požadavek:** Přidat pole "poznámka" k LP variantě financování (stejně jako u SMLOUVA, INDIVIDUALNI, POJISTNA_UDALOST)

---

## 🔍 SOUČASNÝ STAV

### JSON Struktura Financování v DB (sloupec `financovani`)

```json
{
  "typ": "LP",
  "lp_kody": [1, 5, 8]  // Array ID limitovaných příslibů
}
```

**Ostatní varianty financování MAJ poznamku:**

```json
// SMLOUVA:
{
  "typ": "SMLOUVA",
  "cislo_smlouvy": "SM/2025/001",
  "smlouva_poznamka": "Dodatečné info o smlouvě"  ✅
}

// INDIVIDUALNI:
{
  "typ": "INDIVIDUALNI",
  "individualni_schvaleni": "I-0001/...",
  "individualni_poznamka": "Důvod schválení"  ✅
}

// POJISTNA_UDALOST:
{
  "typ": "POJISTNA_UDALOST",
  "pojistna_udalost_cislo": "PU123",
  "pojistna_udalost_poznamka": "Popis škody"  ✅
}
```

**LP varianta NEMÁ poznámku:**
```json
{
  "typ": "LP",
  "lp_kody": [1, 5, 8]
  // ❌ CHYBÍ: "lp_poznamka": ""
}
```

---

## 📊 DOPADY ZMĚNY

### 1. **Databáze** ✅ Žádné změny potřeba
- Sloupec `financovani` je TEXT/JSON → pojme nové pole bez změny struktury
- Zpětná kompatibilita: Staré záznamy bez `lp_poznamka` budou stále fungovat

### 2. **Backend API** (PHP)

#### Soubory k úpravě:

**A) `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`**
- Řádky 1873-1940: Funkce `handle_orders25_insert()`
- Řádky 2385+: Funkce pro normalizaci financování
- **Změna:** Přidat `lp_poznamka` do seznamu dynamických polí

**B) `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/OrderV2Handler.php`**
- Řádky 260-350: Metoda `standardizeInputData()`
- **Změna:** Přidat `lp_poznamka` do seznamu zpracovávaných polí

**Konkrétní místa:**
```php
// orderHandlers.php, řádek ~1930
foreach (array(
    'lp_kody', 
    'lp_kod', 
    'lp_poznamka',  // ✅ PŘIDAT
    'cislo_smlouvy', 
    'smlouva_poznamka',
    // ...
) as $key) {
    if (isset($parsed[$key])) {
        $financovaniData[$key] = $parsed[$key];
    }
}
```

```php
// OrderV2Handler.php, řádek ~310
foreach (array(
    'lp_kody', 
    'lp_kod', 
    'lp_poznamka',  // ✅ PŘIDAT
    'cislo_smlouvy',
    // ...
) as $key) {
    if (isset($parsed[$key])) {
        $financovaniData[$key] = $parsed[$key];
    }
}
```

### 3. **Frontend** (React)

#### A) Form State (`OrderForm25.js`)

**Řádek ~4633:** Přidat do initial state
```javascript
const initialFormData = {
  // ... existing fields
  lp_kod: [], // LP kódy pro Limitovaný příslib (multiselect)
  lp_poznamka: '', // ✅ PŘIDAT - Poznámka k LP
  smlouva_poznamka: '', // Poznámka ke smlouvě
  // ...
};
```

#### B) UI Rendering (`OrderForm25.js`)

**Řádek ~20420-20455:** Po LP multiselect přidat textarea

```javascript
// LP KÓD - zobrazit pouze když je vybraný Limitovaný příslib
{(() => {
  const selectedSource = financovaniOptions.find(/* ... */);
  const nazev = selectedSource?.nazev_stavu || selectedSource?.nazev || '';
  return nazev.includes('Limitovan') || nazev.includes('příslib');
})() && (
  <>
    <FormRow>
      <FormGroup style={{gridColumn: '1 / -1'}}>
        <Label required>LP KÓD</Label>
        <StableCustomSelect /* ... */ />
      </FormGroup>
    </FormRow>
    
    {/* ✅ PŘIDAT TENTO BLOK */}
    <FormRow>
      <FormGroup style={{gridColumn: '1 / -1'}}>
        <Label>POZNÁMKA K LP</Label>
        <InputWithIcon hasIcon>
          <FileText />
          <Input
            type="text"
            name="lp_poznamka"
            placeholder="Dodatečné informace k limitovanému příslibu"
            value={formData.lp_poznamka || ''}
            onChange={(e) => handleInputChange('lp_poznamka', e.target.value)}
            onBlur={() => handleFieldBlur('lp_poznamka', formData.lp_poznamka)}
            disabled={shouldLockFinancovaniSection}
            hasError={!!validationErrors.lp_poznamka}
            hasIcon
          />
        </InputWithIcon>
      </FormGroup>
    </FormRow>
  </>
)}
```

#### C) Data Transformation (`dataTransformHelpers.js`)

**Řádek ~150:** Přidat mapping v `normalizeFinancovaniFromBackend()`
```javascript
// LP poznámka
if (financing.lp_poznamka) result.lp_poznamka = financing.lp_poznamka;
```

**Řádek ~230-240:** Přidat do `transformFrontendDataToBackend()`
```javascript
if (formData.lp_kod && Array.isArray(formData.lp_kod) && formData.lp_kod.length > 0) {
  // Convert string IDs to integers
  result.lp_kody = formData.lp_kod.map(id => parseInt(id, 10));
}
if (formData.lp_poznamka) {  // ✅ PŘIDAT
  result.lp_poznamka = formData.lp_poznamka;
}
```

#### D) Data Loader Hook (`useOrderDataLoader.js`)

**Řádek ~132-142:** Přidat do transformace
```javascript
// Financování
zpusob_financovani: dbOrder.financovani.typ || '',
lp_kod: dbOrder.financovani.lp_kody || [],
lp_nazev: dbOrder.financovani.nazev || '',
lp_poznamka: dbOrder.financovani.lp_poznamka || '',  // ✅ PŘIDAT
```

#### E) Clear Handler (`OrderForm25.js`)

**Řádek ~16117-16121:** Přidat reset pro LP poznámku
```javascript
case 'LP':
case 'LIMITOVANY_PRISLIB':
  newData.lp_kod = [];
  newData.lp_poznamka = '';  // ✅ PŘIDAT
  break;
```

#### F) Field Preservation (`OrderForm25.js`)

**Řádek ~18418-18422:** Přidat do seznamu preserved polí
```javascript
// LP
next.lp_kod = prev.lp_kod;
next.lp_poznamka = prev.lp_poznamka;  // ✅ PŘIDAT
```

**Řádek ~18351-18352:** Přidat do tracked fields
```javascript
const financniPole = [
  'zpusob_financovani', 'financovani', 
  'lp_kod', 'lp_poznamka',  // ✅ PŘIDAT lp_poznamka
  'cislo_smlouvy', 'smlouva_poznamka',
  // ...
];
```

#### G) Read-Only View (`OrderFormReadOnly.js`)

**Přidat zobrazení poznámky pod LP kódy (řádek ~750-770):**
```javascript
{/* LP - Limitované přísliby */}
{orderData.financovani?.lp_nazvy && orderData.financovani.lp_nazvy.length > 0 && (
  <>
    <KeyValuePair style={{ gridColumn: '1 / -1' }}>
      <KeyLabel>Limitované přísliby</KeyLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {orderData.financovani.lp_nazvy.map((lp, idx) => (
          <Badge key={idx} $bg="#dbeafe" $color="#1e40af">
            {lpText}
          </Badge>
        ))}
      </div>
    </KeyValuePair>
    
    {/* ✅ PŘIDAT */}
    {orderData.financovani?.lp_poznamka && (
      <KeyValuePair style={{ gridColumn: '1 / -1' }}>
        <KeyLabel>Poznámka k LP</KeyLabel>
        <ValueText>{orderData.financovani.lp_poznamka}</ValueText>
      </KeyValuePair>
    )}
  </>
)}
```

#### H) Workflow Utils (`workflowUtils.js`)

**Řádek ~56-63:** Přidat label
```javascript
const FIELD_LABELS = {
  // ...
  lp_kod: 'LP kód',
  lp_poznamka: 'Poznámka k LP',  // ✅ PŘIDAT
  smlouva_poznamka: 'Poznámka ke smlouvě',
  // ...
};
```

**Řádek ~123-130:** Přidat mapping
```javascript
const FIELD_TO_SECTION = {
  // ...
  lp_kod: 'financovani',
  lp_poznamka: 'financovani',  // ✅ PŘIDAT
  cislo_smlouvy: 'financovani',
  // ...
};
```

### 4. **LocalStorage Draft** ✅ Automatická podpora
- Draft system ukládá celý `formData` objekt
- Nové pole `lp_poznamka` se automaticky uloží a obnoví

### 5. **PDF Export** (`FinancialControlPDF.js`)

**Řádek ~570-580:** Přidat do financovaniData
```javascript
const financovaniData = {
  typ: order.financovani.typ || order.zpusob_financovani,
  lp_kody: order.financovani.lp_kody || order.lp_kod,
  lp_poznamka: order.financovani.lp_poznamka || order.lp_poznamka,  // ✅ PŘIDAT
  cislo_smlouvy: order.financovani.cislo_smlouvy || order.cislo_smlouvy,
  // ...
};
```

**Řádek ~820-860:** Přidat rendering (stejný pattern jako ostatní):
```javascript
{/* LP - Limitované přísliby */}
{financovaniData.typ === 'LP' && financovaniData.lp_kody && (
  <>
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>LP kódy:</Text>
      <Text style={styles.controlValue}>
        {Array.isArray(financovaniData.lp_kody) 
          ? financovaniData.lp_kody.join(', ')
          : financovaniData.lp_kody}
      </Text>
    </View>
    
    {/* ✅ PŘIDAT */}
    {financovaniData.lp_poznamka && (
      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Poznámka k LP:</Text>
        <Text style={styles.controlValue}>{financovaniData.lp_poznamka}</Text>
      </View>
    )}
  </>
)}
```

### 6. **Orders List** (`Orders25List.js`)

**Řádek ~11884-11888:** Zobrazení v listu (už zobrazuje lp_kody, přidat tooltip s poznámkou)
```javascript
{order.financovani?.lp_kody && Array.isArray(order.financovani.lp_kody) && (
  <div title={order.financovani?.lp_poznamka || ''}>  {/* ✅ Tooltip */}
    {highlightSearchText(order.financovani.lp_kody.join(', '), globalFilter)}
  </div>
)}
```

**Řádek ~17661-17692:** Approval dialog
```javascript
{orderToApprove.financovani?.lp_kody && (
  <>
    <div>{orderToApprove.financovani.lp_kody.join(', ')}</div>
    
    {/* ✅ PŘIDAT */}
    {orderToApprove.financovani?.lp_poznamka && (
      <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
        Poznámka: {orderToApprove.financovani.lp_poznamka}
      </div>
    )}
  </>
)}
```

---

## ⚠️ ZPĚTNÁ KOMPATIBILITA

### ✅ Co FUNGUJE automaticky:

1. **Staré záznamy bez `lp_poznamka`:**
   - Backend: `isset($parsed['lp_poznamka'])` → false, nic se neulož
   - Frontend: `formData.lp_poznamka || ''` → prázdný string
   - UI: Zobrazí se prázdné pole ✅

2. **Nové záznamy s `lp_poznamka`:**
   - Backend: Uloží se do JSON jako nové pole
   - Frontend: Zobrazí a umožní upravit
   - PDF: Zobrazí poznámku ✅

3. **API validace:**
   - Poznámka NENÍ povinná → nebrání uložení starých objednávek
   - Žádné breaking changes ✅

---

## 📋 IMPLEMENTAČNÍ PLÁN

### ✅ FÁZE 1: Backend (2 soubory)
1. `orderHandlers.php` - řádky ~1930, ~2390
2. `OrderV2Handler.php` - řádky ~310

### ✅ FÁZE 2: Frontend Core (4 soubory)
1. `OrderForm25.js` - initial state (~4633)
2. `OrderForm25.js` - UI rendering (~20455)
3. `OrderForm25.js` - clear handler (~16117)
4. `OrderForm25.js` - field preservation (~18418, ~18351)

### ✅ FÁZE 3: Data Layer (2 soubory)
1. `dataTransformHelpers.js` - řádky ~150, ~240
2. `useOrderDataLoader.js` - řádek ~132

### ✅ FÁZE 4: UI Components (3 soubory)
1. `OrderFormReadOnly.js` - řádek ~770
2. `workflowUtils.js` - řádky ~60, ~130

### ✅ FÁZE 5: Export & List (2 soubory)
1. `FinancialControlPDF.js` - řádky ~575, ~850
2. `Orders25List.js` - řádky ~11888, ~17692

---

## 🔢 CELKOVÝ ROZSAH

### Soubory k úpravě: **11**

#### Backend (2):
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php` (3 místa)
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/OrderV2Handler.php` (2 místa)

#### Frontend (9):
- `apps/eeo-v2/client/src/forms/OrderForm25.js` (6 míst)
- `apps/eeo-v2/client/src/utils/dataTransformHelpers.js` (2 místa)
- `apps/eeo-v2/client/src/forms/OrderForm25/hooks/useOrderDataLoader.js` (1 místo)
- `apps/eeo-v2/client/src/components/OrderFormReadOnly.js` (1 místo)
- `apps/eeo-v2/client/src/utils/workflowUtils.js` (2 místa)
- `apps/eeo-v2/client/src/components/FinancialControlPDF.js` (2 místa)
- `apps/eeo-v2/client/src/pages/Orders25List.js` (2 místa)

### Celkový počet změn: **21 míst**

---

## ⏱️ ODHAD ČASU

- Backend změny: **10 minut**
- Frontend Form: **20 minut**
- Data Layer: **10 minut**
- UI Components: **15 minut**
- Export & List: **15 minut**
- **Testování: 20 minut**

**CELKEM: ~1.5 hodiny**

---

## 🎯 ZÁVĚR

**Velikost změny:** ⚡ **MALÁ až STŘEDNÍ**

**Důvody:**
1. ✅ Konzistentní pattern (kopírovat z `smlouva_poznamka`)
2. ✅ Žádné DB migrations potřeba
3. ✅ Automatická zpětná kompatibilita
4. ✅ Jednoduchý TextField (ne složitý komponent)
5. ✅ Jasně definovaná místa k úpravě

**Rizika:** 🟢 **NÍZKÁ**

**Doporučení:** ✅ **Implementovat ihned**

---

## 📝 TESTOVACÍ CHECKLIST

Po implementaci otestovat:

- [ ] Vytvoření nové objednávky s LP + poznámkou
- [ ] Úprava existující objednávky s LP (přidat poznámku)
- [ ] Otevření staré objednávky bez poznámky (prázdné pole)
- [ ] Změna z LP na jinou variantu (poznámka se vyčistí)
- [ ] Změna z jiné varianty na LP (poznámka prázdná)
- [ ] Draft: Uložení a obnovení poznámky
- [ ] Read-only view: Zobrazení poznámky
- [ ] PDF export: Poznámka v PDF
- [ ] Orders list: Tooltip s poznámkou
- [ ] API: POST/PUT s `lp_poznamka` v JSON

---

**Vytvořeno:** 2026-01-17  
**Autor:** GitHub Copilot  
**Status:** ✅ Připraveno k implementaci
