# 🔧 DOCX Export - Fix Kontextového Menu (4. listopadu 2025)

## 🎯 Problém

Po migraci na **Order V2 API**, kontextové menu (`OrderContextMenu.js`) používalo **zastaralou logiku** pro určení, zda lze generovat DOCX:

### ❌ Původní chybná logika:

```javascript
// CHYBA 1: Používá normalizeStav() - nerozpoznává workflow stavy!
const stav = normalizeStav(aktualniStav);
const stavCode = stav?.code;

// CHYBA 2: Kontroluje pouze POSLEDNÍ stav místo celého pole
const lastState = workflowStates[workflowStates.length - 1];

// CHYBA 3: Neúplný seznam stavů
const allowedStates = ['POTVRZENA', 'DOKONCENA', 'ODESLANA', 'CEKA_SE'];
```

### ✅ Správná logika (FINÁLNÍ):

```javascript
// ✅ Kontroluje CELÉ POLE workflow stavů (nějaký stav je povolený?)
const canGenerate = workflowStates.some(state => {
  let stavCode = '';
  if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
    stavCode = String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
  } else if (typeof state === 'string') {
    stavCode = String(state).toUpperCase().trim();
  }
  
  return allowedStates.includes(stavCode);
});

// ✅ Kompletní seznam všech povolených stavů
// ⚠️ SCHVALENA není zahrnuta - musí následovat ROZPRACOVANA nebo vyšší fáze!
const allowedStates = [
  'ROZPRACOVANA',                        // FÁZE 3 - START (začalo se vyplňovat)
  // ❌ 'SCHVALENA' - pouze schváleno, ještě se nezačalo pracovat
  'POTVRZENA', 'ODESLANA',               // FÁZE 4
  'UVEREJNIT',                           // FÁZE 5
  'UVEREJNENA', 'NEUVEREJNIT', 'FAKTURACE', // FÁZE 6
  'VECNA_SPRAVNOST',                     // FÁZE 7
  'DOKONCENA', 'ZKONTROLOVANA',          // FÁZE 8
  'CEKA_SE'                              // Speciální
];
```

---

## 🛠️ Implementované změny

### Změna #1: Kontrola OBSAHU pole místo POSLEDNÍHO stavu

**Proč?** Protože `stav_workflow_kod` obsahuje **historii všech stavů**, např.:
```json
["ODESLANA_KE_SCHVALENI", "SCHVALENA", "ROZPRACOVANA", "ODESLANA", "POTVRZENA", "NEUVEREJNIT"]
```

**PŘED:**
```javascript
// ❌ Kontroloval pouze poslední stav
const lastState = workflowStates[workflowStates.length - 1];
const canGenerate = allowedStates.includes(lastState);
```

**PO:**
```javascript
// ✅ Kontroluje CELÉ pole - obsahuje alespoň jeden povolený stav?
const canGenerate = workflowStates.some(state => {
  const stavCode = /* normalizace */;
  return allowedStates.includes(stavCode);
});
```

### Změna #2: Podpora obou formátů stavů

V2 API může vracet stavy jako:
- **Stringy:** `["NOVA", "SCHVALENA", "ROZPRACOVANA"]`
- **Objekty:** `[{"kod_stavu": "NOVA", "nazev_stavu": "Nová"}, ...]`

**Řešení:**
```javascript
workflowStates.some(state => {
  let stavCode = '';
  if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
    stavCode = String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
  } else if (typeof state === 'string') {
    stavCode = String(state).toUpperCase().trim();
  }
  return allowedStates.includes(stavCode);
});
```

---

## 🛠️ Implementované změny

### Soubor: `src/components/OrderContextMenu.js` + `src/pages/Orders25List.js`

#### Změna 1: Funkce `canGenerateDocx()` / `canExportDocument()`

**PŘED:**
- ❌ Kontroloval pouze **POSLEDNÍ stav** z pole
- ❌ Používal `normalizeStav()` (nefunguje pro workflow stavy)
- ❌ Měl neúplný seznam povolených stavů

**PO:**
- ✅ Kontroluje **CELÉ POLE** stavů pomocí `.some()`
- ✅ Pracuje s **RAW uppercase hodnotou** bez transformací
- ✅ Má kompletní seznam 12 povolených stavů (fáze 3-8)
- ✅ Podporuje **oba formáty** (string nebo objekt s `kod_stavu`)

#### Změna 2: Tooltip text (OrderContextMenu.js)

**PŘED:**
```javascript
'Generování DOCX je dostupné pouze pro pokročilé stavy (rozpracovaná, odeslaná, dodavatel, potvrzená)'
```

**PO:**
```javascript
'Generování DOCX je dostupné od fáze ROZPRACOVANÁ až do DOKONČENÁ (fáze 3-8)'
```

#### Změna 3: Odstranění nepotřebného importu

**PŘED:**
```javascript
import { normalizeStav } from '../utils/orderStatus';
```

**PO:**
```javascript
// Import odstraněn - již se nepoužívá
```

---

## 📊 Reference: WorkflowManager stavy

Podle `src/forms/OrderForm25/hooks/useWorkflowManager.js`:

| Fáze | Stavy | DOCX Export |
|------|-------|-------------|
| **1** | NOVA | ❌ Koncept |
| **2** | ODESLANA_KE_SCHVALENI, CEKA_SE | ❌ Ke schválení |
| **3** | SCHVALENA, ROZPRACOVANA | ⚠️ **ROZPRACOVANA** ✅, **SCHVALENA** ❌ |
| **4** | POTVRZENA, ODESLANA | ✅ START |
| **5** | UVEREJNIT | ✅ |
| **6** | UVEREJNENA, NEUVEREJNIT, FAKTURACE | ✅ |
| **7** | VECNA_SPRAVNOST | ✅ |
| **8** | ZKONTROLOVANA, DOKONCENA | ✅ KONEC |

### ⚠️ Důležité poznámky:

1. **SCHVALENA** = Pouze schváleno, ještě se **nezačalo vyplňovat** → ❌ DOCX NELZE
2. **ROZPRACOVANA** = Schváleno **A začalo se vyplňovat detaily** → ✅ DOCX MŮŽEŠ
3. Workflow postupuje: `SCHVALENA` → (uživatel začne vyplňovat) → `ROZPRACOVANA` → ...

---

## 🎯 Výsledek

### ✅ Co nyní funguje:

1. **Kontextové menu i action buttons** používají **stejnou logiku**
2. **Kontrola CELÉHO workflow pole** - ne jen posledního stavu
3. **Podpora obou formátů** stavů (string nebo objekt)
4. **Kompletní seznam** povolených stavů odpovídající **fázím 3-8**
5. **Správná detekce** i pro objednávky s historií stavů

### 🔍 Příklad workflow pole:

```json
[
  "ODESLANA_KE_SCHVALENI",  // Fáze 2 - ❌ NEPOVOLENO
  "SCHVALENA",               // Fáze 3 - ❌ NEPOVOLENO (pouze schváleno, nezačalo se vyplňovat)
  "ROZPRACOVANA",            // Fáze 3 - ✅ POVOLENO (začalo se vyplňovat)
  "ODESLANA",                // Fáze 4 - ✅ POVOLENO
  "POTVRZENA",               // Fáze 4 - ✅ POVOLENO
  "NEUVEREJNIT"              // Fáze 6 - ✅ POVOLENO
]
```

**Výsledek:** `.some()` najde alespoň jeden povolený stav (**ROZPRACOVANA**, **ODESLANA**, **POTVRZENA** nebo **NEUVEREJNIT**) → **tlačítko POVOLENO** ✅

### 🧪 Jak testovat:

1. Otevři seznam objednávek (Orders25List)
2. Najdi objednávku ve stavu "NEUVEREJNIT" (nebo jiný z fází 3-8)
3. Klikni pravým tlačítkem → otevře se kontextové menu
4. Položka "Generovat DOCX" by měla být **povolená** (ne šedá)
5. Kontroluj konzoli prohlížeče - měl by se vypsat debug log s `canGenerate: true`

---

## 📁 Změněné soubory

- ✅ `src/components/OrderContextMenu.js` (funkce `canGenerateDocx()`)
- ✅ `src/pages/Orders25List.js` (funkce `canExportDocument()`)

---

## 🚀 Status

**✅ HOTOVO** - Generování DOCX nyní funguje **od fáze ROZPRACOVANÁ až do DOKONČENÁ**

**Klíčové změny:**
1. **Místo kontroly pouze posledního stavu** → kontrolujeme **CELÉ POLE** pomocí `.some()`
2. **Podpora obou formátů** → `Array` i `JSON string`
3. **SCHVALENA vyloučena** → musí následovat ROZPRACOVANA nebo vyšší fáze

**Seznam povolených stavů (11):**
- ROZPRACOVANA, POTVRZENA, ODESLANA
- UVEREJNIT, UVEREJNENA, NEUVEREJNIT, FAKTURACE
- VECNA_SPRAVNOST, ZKONTROLOVANA, DOKONCENA
- CEKA_SE (speciální)

**🔗 Související:**
- `DOCX-EXPORT-FIX-2025-11-04.md` - Fix v Orders25List.js
- `DOCX-EXPORT-ANALYSIS-2025-11-04.md` - Původní analýza problému

---

**Autor:** AI Assistant  
**Datum:** 4. listopadu 2025  
**Branch:** `feature/orders-list-v2-api-migration`
