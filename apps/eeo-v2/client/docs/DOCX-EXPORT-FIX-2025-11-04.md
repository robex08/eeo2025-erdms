# 📄 DOCX Export - Fix Implementován (4. listopadu 2025)

## 🔍 Problém
Uživatel hlásil, že tlačítko **"Generovat DOCX"** v kontextovém menu je **vždy disabled** (neaktivní).

## ✅ Řešení Implementováno

### Požadavek
> "Generování DOCX by měl jít od fáze **ROZPRACOVANA** až do fáze, dokud není OBJ **DOKONCENA**."

---

## 📋 Workflow Stavy podle WorkflowManager

Podle **`src/forms/OrderForm25/hooks/useWorkflowManager.js`** existují tyto stavy a fáze:

```javascript
// WorkflowManager: Mapování stavů na fáze (calculateCurrentPhase)
const stateToPhaseMap = {
  'NOVA': 1,                          // FÁZE 1 - Koncept
  'ODESLANA_KE_SCHVALENI': 2,         // FÁZE 2 - Čeká na schválení
  'CEKA_SE': 2,                       // FÁZE 2
  'ROZPRACOVANA': 3,                  // ✅ FÁZE 3 - START pro DOCX
  'SCHVALENA': 3,                     // ✅ FÁZE 3
  'POTVRZENA': 4,                     // ✅ FÁZE 4
  'ODESLANA': 4,                      // ✅ FÁZE 4
  'UVEREJNIT': 5,                     // ✅ FÁZE 5
  'UVEREJNENA': 6,                    // ✅ FÁZE 6
  'NEUVEREJNIT': 6,                   // ✅ FÁZE 6
  'FAKTURACE': 6,                     // ✅ FÁZE 6
  'VECNA_SPRAVNOST': 7,               // ✅ FÁZE 7
  'DOKONCENA': 8,                     // ✅ FÁZE 8 - KONEC pro DOCX
  'ZKONTROLOVANA': 8,                 // ✅ FÁZE 8
};
```

---

## 🛠️ Implementované změny

### Soubor: `src/pages/Orders25List.js`

**Funkce:** `canExportDocument(order)` (řádky ~6667-6745)

### PŘED (stará logika):

```javascript
const canExportDocument = (order) => {
  // ❌ PROBLÉM: Pouze 4 stavy povoleny + text fallback
  const allowedStates = ['POTVRZENA', 'DOKONCENA', 'ODESLANA', 'CEKA_SE'];
  
  // Fallback pro text obsahující "rozpracovan" nebo "dodavatel"
  const isRozpracovana = nazevStavu.toLowerCase().includes('rozpracovan');
  const isDodavatel = nazevStavu.toLowerCase().includes('dodavatel');
  
  return allowedStates.includes(stavCode) || isRozpracovana || isDodavatel;
};
```

**Problém:**
- ❌ `SCHVALENA` byl **VYLOUČEN** (nejčastější stav u schválených objednávek)
- ❌ Chyběly stavy: `ROZPRACOVANA`, `UVEREJNIT`, `UVEREJNENA`, `FAKTURACE`, `VECNA_SPRAVNOST`, `ZKONTROLOVANA`
- ⚠️ Fallback na text byl nespolehlivý a nekonzistentní

---

### PO (nová logika):

```javascript
const canExportDocument = (order) => {
  // ✅ Generování DOCX: od fáze ROZPRACOVANA až do DOKONCENA (fáze 3-8)
  
  // Získej POSLEDNÍ stav z order.stav_workflow_kod (V2 API vrací JSON array)
  const workflowStates = JSON.parse(order.stav_workflow_kod);
  const lastState = workflowStates[workflowStates.length - 1];
  const stavCode = normalizeStav(lastState)?.code;
  
  // ✅ NOVÉ POVOLENÉ STAVY: Od ROZPRACOVANA (fáze 3) až do DOKONCENA (fáze 8)
  const allowedStates = [
    'ROZPRACOVANA',     // ✅ FÁZE 3 - START
    'SCHVALENA',        // ✅ FÁZE 3 - NOVĚ PŘIDÁNO!
    'POTVRZENA',        // ✅ FÁZE 4
    'ODESLANA',         // ✅ FÁZE 4
    'UVEREJNIT',        // ✅ FÁZE 5 - NOVĚ PŘIDÁNO!
    'UVEREJNENA',       // ✅ FÁZE 6 - NOVĚ PŘIDÁNO!
    'NEUVEREJNIT',      // ✅ FÁZE 6 - NOVĚ PŘIDÁNO!
    'FAKTURACE',        // ✅ FÁZE 6 - NOVĚ PŘIDÁNO!
    'VECNA_SPRAVNOST',  // ✅ FÁZE 7 - NOVĚ PŘIDÁNO!
    'DOKONCENA',        // ✅ FÁZE 8 - KONEC
    'ZKONTROLOVANA',    // ✅ FÁZE 8 - NOVĚ PŘIDÁNO!
    'CEKA_SE'           // ✅ Speciální stav - čeká se na dodavatele
  ];
  
  return allowedStates.includes(stavCode);
};
```

**Výhody:**
- ✅ **12 povolených stavů** místo původních 4
- ✅ Přidán **SCHVALENA** (klíčový stav!)
- ✅ Pokrývá **VŠECHNY fáze 3-8** (ROZPRACOVANA až DOKONCENA)
- ✅ Odstraněn nespolehlivý text fallback
- ✅ Explicitní a přehledný seznam stavů
- ✅ Konzistentní s WorkflowManagerem

---

## 📊 Srovnání stavů

| Stav | PŘED (❌/✅) | PO (✅) | Fáze | Poznámka |
|------|------------|---------|------|----------|
| NOVA | ❌ | ❌ | 1 | Koncept - není schválená |
| ODESLANA_KE_SCHVALENI | ❌ | ❌ | 2 | Čeká na schválení |
| **ROZPRACOVANA** | text fallback | ✅ | 3 | **NOVĚ EXPLICITNĚ** |
| **SCHVALENA** | ❌ | ✅ | 3 | **KLÍČOVÝ FIX!** |
| POTVRZENA | ✅ | ✅ | 4 | Potvrzená dodavatelem |
| ODESLANA | ✅ | ✅ | 4 | Odeslána dodavateli |
| **UVEREJNIT** | ❌ | ✅ | 5 | **NOVĚ PŘIDÁNO** |
| **UVEREJNENA** | ❌ | ✅ | 6 | **NOVĚ PŘIDÁNO** |
| **NEUVEREJNIT** | ❌ | ✅ | 6 | **NOVĚ PŘIDÁNO** |
| **FAKTURACE** | ❌ | ✅ | 6 | **NOVĚ PŘIDÁNO** |
| **VECNA_SPRAVNOST** | ❌ | ✅ | 7 | **NOVĚ PŘIDÁNO** |
| DOKONCENA | ✅ | ✅ | 8 | Dokončená objednávka |
| **ZKONTROLOVANA** | ❌ | ✅ | 8 | **NOVĚ PŘIDÁNO** |
| CEKA_SE | ✅ | ✅ | 2 | Speciální stav |
| ZAMITNUTA | ❌ | ❌ | - | Zamítnutá |
| ZRUSENA | ❌ | ❌ | - | Zrušená |
| ARCHIVOVANO | ❌ | ❌ | - | Archivovaná |

---

## 🔍 Debug log

Funkce nyní obsahuje debug log pro první objednávku v seznamu:

```javascript
// 🔍 DEBUG: Log pro analýzu stavů první objednávky
if (!canGenerate && orders.length > 0 && 
    (order.id === orders[0]?.id || order.objednavka_id === orders[0]?.objednavka_id)) {
  console.log('🔍 [DOCX Export Debug - První objednávka]', {
    orderId: order.id || order.objednavka_id,
    cislo: order.cislo_objednavky,
    aktualniStav,
    nazevStavu,
    stavCode,
    allowedStates,
    canGenerate,
    rawWorkflow: order.stav_workflow_kod
  });
}
```

**Jak použít:**
1. Otevřete konzoli prohlížeče (F12)
2. Načtěte seznam objednávek
3. Pokud je první objednávka disabled pro DOCX, uvidíte debug output

---

## 🚀 Testování

### Test case 1: SCHVALENA
1. Vytvořte objednávku
2. Schvalte ji (stav = SCHVALENA)
3. **Očekávaný výsledek:** Tlačítko "Generovat DOCX" je **AKTIVNÍ** ✅

### Test case 2: ROZPRACOVANA
1. Vytvořte objednávku
2. Dostante ji do stavu ROZPRACOVANA
3. **Očekávaný výsledek:** Tlačítko "Generovat DOCX" je **AKTIVNÍ** ✅

### Test case 3: NOVA
1. Vytvořte novou objednávku (koncept)
2. Stav = NOVA
3. **Očekávaný výsledek:** Tlačítko "Generovat DOCX" je **NEAKTIVNÍ** ❌

### Test case 4: DOKONCENA
1. Dokončete objednávku (stav = DOKONCENA)
2. **Očekávaný výsledek:** Tlačítko "Generovat DOCX" je **AKTIVNÍ** ✅

---

## 📝 Poznámky

### Důležitá poznámka k Order V2 API

Order V2 API používá **enriched endpoint** (`/order-v2/list-enriched`), který vrací:
- `order.stav_workflow_kod` jako **JSON array** (např. `["SCHVALENA"]` nebo `["SCHVALENA", "ODESLANA"]`)
- Funkce správně **bere POSLEDNÍ stav** z array (aktuální workflow stav)

### Konzistence s formulářem

Logika je nyní **konzistentní** s:
- ✅ `useWorkflowManager.js` - definice fází
- ✅ WorkflowManager fáze 3-8
- ✅ Order V2 API data struktura

---

## ✅ Status

- [x] Analýza workflow stavů
- [x] Identifikace WorkflowManager mapping
- [x] Implementace nových allowedStates
- [x] Odstranění text fallback logiky
- [x] Přidání debug logu
- [x] Dokumentace změn
- [ ] Manuální testování na DEV

---

## 📅 Historie

- **4. listopadu 2025** - Fix implementován
  - Přidáno 8 nových stavů do allowedStates
  - Odstraněn nespolehlivý text fallback
  - Přidán debug log
  - Vytvořena dokumentace
