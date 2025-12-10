# 🎯 OrderForm25 - Bezpečný Optimalizační Plán

**Datum:** 10. prosince 2025  
**Cíl:** Optimalizace bez rozbití workflow  
**Strategie:** Low-risk, high-impact changes

---

## 🎯 Prioritizace (co NEBUDEME dělat)

### ❌ **NEBUDEME rozdělit na komponenty** (zatím)
- Ponecháme monolitickou strukturu
- Minimalizujeme riziko rozbití workflow
- Fokus na interní optimalizaci

---

## ✅ Fáze 1: Cleanup a Příprava (2-3 dny)

### 🗑️ **Krok 1.1: Odstranění zakomentovaného kódu**

**Riziko:** 🟢 NÍZKÉ (zakomentovaný kód nic nedělá)  
**Dopad:** ✅ Čitelnější kód, menší soubor

```javascript
// ❌ ODSTRANIT všechny tyto bloky:

// ❌ DEPRECATED: order25DraftStorageService - použij draftManager místo toho
// import order25DraftStorageService from '../services/order25DraftStorageService';

// const [isFakturaceUnlocked, setIsFakturaceUnlocked] = useState(false);
// const [isVecnaSpravnostUnlocked, setIsVecnaSpravnostUnlocked] = useState(false);
// const [isDokonceniUnlocked, setIsDokonceniUnlocked] = useState(false);

// useEffect(() => {
//   // Starý kód
// }, []);
```

**Akce:**
```bash
# Vyhledat všechny komentované bloky
grep -n "^[[:space:]]*//[[:space:]]*const\|^[[:space:]]*//[[:space:]]*useState\|^[[:space:]]*//[[:space:]]*useEffect" OrderForm25.js

# Kontrola deprecated importů
grep -n "DEPRECATED\|❌" OrderForm25.js
```

**Postup:**
1. ✅ Najít všechny commented-out useState/useEffect
2. ✅ Zkontrolovat že nejsou používány nikde jinde
3. ✅ Smazat (Git pamatuje historii)
4. ✅ Test že formulář funguje

---

### 🧹 **Krok 1.2: Odstranění deprecated importů**

**Riziko:** 🟢 NÍZKÉ (pokud se nepoužívají)  
**Dopad:** ✅ Čistší dependencies

```javascript
// ❌ ODSTRANIT (pokud se nepoužívají):
import {
  getStrediska25,           // ❓ Zkontrolovat použití
  getFinancovaniZdroj25,    // ❓ Zkontrolovat použití
  getDruhyObjednavky25,     // ❓ Zkontrolovat použití
  // ❌ DEPRECATED - URČITĚ ODSTRANIT:
  // getOrder25,
  // getNextOrderNumber25,
  // createPartialOrder25,
  // updatePartialOrder25,
  // uploadAttachment25,
  // listAttachments25,
} from '../services/api25orders';
```

**Kontrola:**
```bash
# Najít všechna použití deprecated funkcí
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms

# Kontrola getOrder25 (mělo by být 0 výskytů)
grep -n "getOrder25" OrderForm25.js | grep -v "^[[:space:]]*//"

# Kontrola createPartialOrder25 (mělo by být 0 výskytů)
grep -n "createPartialOrder25" OrderForm25.js | grep -v "^[[:space:]]*//"

# Kontrola uploadAttachment25 (mělo by být 0 výskytů)
grep -n "uploadAttachment25\|listAttachments25" OrderForm25.js | grep -v "^[[:space:]]*//"
```

---

## ✅ Fáze 2: Unifikace API V2 (3-5 dní)

### 🔍 **Krok 2.1: Audit současného stavu API**

**Vytvoříme audit report:**

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms

# Najít všechna API volání
echo "=== API25 (STARÝ) ==="
grep -n "getStrediska25\|getFinancovaniZdroj25\|getDruhyObjednavky25" OrderForm25.js | wc -l

echo "=== API V2 (NOVÝ) ==="
grep -n "getOrderV2\|createOrderV2\|updateOrderV2" OrderForm25.js | wc -l

echo "=== MIXED (PROBLÉM) ==="
grep -n "api25orders\." OrderForm25.js | grep -v "//" | wc -l
```

### 📋 **Krok 2.2: Mapování migrace API**

| Funkce STARÁ (api25orders) | Funkce NOVÁ (apiOrderV2) | Status | Použití v kódu |
|----------------------------|--------------------------|--------|----------------|
| `getOrder25(id)` | ✅ `getOrderV2(id)` | HOTOVO | 0x |
| `createPartialOrder25()` | ✅ `createOrderV2()` | HOTOVO | 0x |
| `updatePartialOrder25()` | ✅ `updateOrderV2()` | HOTOVO | 0x |
| `getNextOrderNumber25()` | ✅ `getNextOrderNumberV2()` | HOTOVO | ?x |
| `uploadAttachment25()` | ✅ `uploadOrderAttachment()` | HOTOVO | 0x |
| `listAttachments25()` | ✅ `listOrderAttachments()` | HOTOVO | 0x |
| `deleteAttachment25()` | ✅ `deleteOrderAttachment()` | HOTOVO | 0x |
| `getStrediska25()` | ❓ **ZJISTIT** | TODO | ?x |
| `getFinancovaniZdroj25()` | ❓ **ZJISTIT** | TODO | ?x |
| `getDruhyObjednavky25()` | ❓ **ZJISTIT** | TODO | ?x |

**Akce:**
```bash
# Spustit audit
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms

# Vytvoříme dočasný audit soubor
cat > /tmp/api_audit.sh << 'EOF'
#!/bin/bash
echo "=== API AUDIT ORDERFORM25 ==="
echo ""
echo "1. getStrediska25:"
grep -n "getStrediska25" OrderForm25.js | grep -v "^[[:space:]]*//" | head -5
echo ""
echo "2. getFinancovaniZdroj25:"
grep -n "getFinancovaniZdroj25" OrderForm25.js | grep -v "^[[:space:]]*//" | head -5
echo ""
echo "3. getDruhyObjednavky25:"
grep -n "getDruhyObjednavky25" OrderForm25.js | grep -v "^[[:space:]]*//" | head -5
echo ""
echo "4. getNextOrderNumber (V1 vs V2):"
grep -n "getNextOrderNumber" OrderForm25.js | grep -v "^[[:space:]]*//"
echo ""
echo "5. Přímá volání api25orders.*:"
grep -n "api25orders\\.post\|api25orders\\.get" OrderForm25.js | grep -v "^[[:space:]]*//"
EOF

chmod +x /tmp/api_audit.sh
/tmp/api_audit.sh
```

### 🔄 **Krok 2.3: Kontrola apiOrderV2 - co už je dostupné**

**Zkontrolujeme apiOrderV2.js:**

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/services
grep "^export" apiOrderV2.js | grep "function\|const"
```

**Očekávané V2 funkce:**
- ✅ `getOrderV2`
- ✅ `createOrderV2`
- ✅ `updateOrderV2`
- ✅ `deleteOrderV2`
- ✅ `getNextOrderNumberV2`
- ✅ `checkOrderNumberV2`
- ✅ `getOrderTimestampV2`
- ✅ `uploadOrderAttachment`
- ✅ `listOrderAttachments`
- ✅ `downloadOrderAttachment`
- ✅ `deleteOrderAttachment`

**❓ CHYBÍ V2 API pro:**
- `getStrediska25()` → Potřebujeme `getStrediskaV2()` nebo endpoint v V2?
- `getFinancovaniZdroj25()` → V2 varianta?
- `getDruhyObjednavky25()` → V2 varianta?

### 🛠️ **Krok 2.4: Implementace chybějících V2 endpointů**

**Pokud neexistují V2 varianty, máme 2 možnosti:**

#### **Možnost A: Vytvořit V2 wrappery (DOPORUČENO)**

```javascript
// V apiOrderV2.js PŘIDAT:

/**
 * 🎯 V2: Načíst seznam středisek
 * (Dočasný wrapper pro api25orders, dokud nebude V2 endpoint)
 */
export async function getStrediskaV2() {
  // Dočasně volá staré API, ale přes jednotné rozhraní
  const response = await getStrediska25();
  // Případně normalize response do V2 formátu
  return response;
}

export async function getFinancovaniZdrojV2() {
  const response = await getFinancovaniZdroj25();
  return response;
}

export async function getDruhyObjednavkyV2() {
  const response = await getDruhyObjednavky25();
  return response;
}
```

**Výhody:**
- ✅ OrderForm25 používá pouze V2 API
- ✅ Snadná pozdější migrace (změníme jen apiOrderV2.js)
- ✅ Jednotné error handling
- ✅ Jednotné logging

#### **Možnost B: Nechat stará API pro číselníky (NE DOPORUČENO)**

- ❌ Mix API v kódu
- ❌ Inconsistentní error handling

---

## ✅ Fáze 3: Konsolidace useState (5-7 dní)

### 🎯 **Krok 3.1: Identifikace duplicitních loading states**

**Současný stav (NEÚNOSNÝ):**

```javascript
const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
const [isLoadingFormData, setIsLoadingFormData] = useState(false);
const [templatesLoading, setTemplatesLoading] = useState(false);
const [fakturyLoading, setFakturyLoading] = useState(false);
const [loadingSmlouvyList, setLoadingSmlouvyList] = useState(false);
const [loadingSmlouvaDetail, setLoadingSmlouvaDetail] = useState(false);
const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);
const [loadingAres, setLoadingAres] = useState(false);
const [usekyLoading, setUsekyLoading] = useState(false);
const [lpOptionsLoading, setLpOptionsLoading] = useState(false);
// ... a další
```

**Cílový stav (KONSOLIDOVANÝ):**

```javascript
// ✅ JEDEN objekt pro všechny loading states
const [loadingStates, setLoadingStates] = useState({
  ciselniky: true,
  formData: false,
  templates: false,
  faktury: false,
  smlouvyList: false,
  smlouvaDetail: false,
  supplierSearch: false,
  ares: false,
  useky: false,
  lpOptions: false,
});

// ✅ Helper funkce pro update
const setLoading = useCallback((key, value) => {
  setLoadingStates(prev => ({ ...prev, [key]: value }));
}, []);

// ✅ Použití:
setLoading('ciselniky', true);
setLoading('formData', false);
```

**Postup migrace:**

1. ✅ **PŘIDAT nový konsolidovaný state** (vedle starých)
2. ✅ **POSTUPNĚ MIGROVAT** každý loading state
3. ✅ **TESTOVAT** po každé migraci
4. ✅ **ODSTRANIT** staré states až po úplné migraci

### 🎯 **Krok 3.2: Konsolidace unlock/lock states**

**Současný stav (CHAOTICKÝ):**

```javascript
const [isPhase1Unlocked, setIsPhase1Unlocked] = useState(false);
const [isPhase3SectionsLocked, setIsPhase3SectionsLocked] = useState(false);
const [isPhase3SectionsUnlocked, setIsPhase3SectionsUnlocked] = useState(false);
const [isPhase3SectionsLockProcessedFromDB, setIsPhase3SectionsLockProcessedFromDB] = useState(false);
// const [isFakturaceUnlocked, setIsFakturaceUnlocked] = useState(false); // Zakomentované
// const [isVecnaSpravnostUnlocked, setIsVecnaSpravnostUnlocked] = useState(false);
```

**Cílový stav (STRUKTUROVANÝ):**

```javascript
// ✅ JEDEN objekt pro všechny unlock states
const [unlockStates, setUnlockStates] = useState({
  phase1: false,
  phase2: false,
  phase3: false,
  registr: false,
  potvrzeni: false,
  fakturace: false,
  dokonceni: false,
  storno: false,
});

// ✅ Helper
const setUnlocked = useCallback((phase, value) => {
  setUnlockStates(prev => ({ ...prev, [phase]: value }));
}, []);

// ✅ Computed value
const isPhase3Locked = useMemo(() => !unlockStates.phase3, [unlockStates.phase3]);
```

### 🎯 **Krok 3.3: Konsolidace dialog states**

**Současný stav:**

```javascript
const [showDeleteAttachmentDialog, setShowDeleteAttachmentDialog] = useState(false);
const [showDeleteAllAttachmentsDialog, setShowDeleteAllAttachmentsDialog] = useState(false);
const [showSupplierSearchDialog, setShowSupplierSearchDialog] = useState(false);
const [showSupplierAddDialog, setShowSupplierAddDialog] = useState(false);
const [aresPopupOpen, setAresPopupOpen] = useState(false);
const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState(false);
const [showUnlockPhase1Confirm, setShowUnlockPhase1Confirm] = useState(false);
const [showUnlockPhase2Confirm, setShowUnlockPhase2Confirm] = useState(false);
const [showUnlockPhase3Confirm, setShowUnlockPhase3Confirm] = useState(false);
const [showCancelPublishConfirm, setShowCancelPublishConfirm] = useState(false);
// ... 10+ dalších
```

**Cílový stav:**

```javascript
// ✅ JEDEN objekt pro všechny dialogy
const [dialogs, setDialogs] = useState({
  deleteAttachment: false,
  deleteAllAttachments: false,
  supplierSearch: false,
  supplierAdd: false,
  aresSearch: false,
  templateSave: false,
  templateDelete: false,
  unlockPhase1: false,
  unlockPhase2: false,
  unlockPhase3: false,
  cancelPublish: false,
  // ...
});

// ✅ Helper
const openDialog = useCallback((name) => {
  setDialogs(prev => ({ ...prev, [name]: true }));
}, []);

const closeDialog = useCallback((name) => {
  setDialogs(prev => ({ ...prev, [name]: false }));
}, []);

// ✅ Použití:
<ConfirmDialog
  isOpen={dialogs.deleteAttachment}
  onClose={() => closeDialog('deleteAttachment')}
  onConfirm={handleDeleteAttachment}
/>
```

---

## ✅ Fáze 4: Optimalizace useEffect (7-10 dní)

### 🎯 **Krok 4.1: Audit všech useEffect**

**Kategorizace 114 useEffects:**

```bash
# Vytvoříme audit script
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms

cat > /tmp/useeffect_audit.sh << 'EOF'
#!/bin/bash
echo "=== USEEFFECT AUDIT ==="
echo ""
echo "Total useEffect count:"
grep -c "useEffect" OrderForm25.js
echo ""
echo "Empty dependency array [] (run once on mount):"
grep -A 2 "useEffect" OrderForm25.js | grep -c "\[\]"
echo ""
echo "With formData dependency (DANGEROUS):"
grep -A 2 "useEffect" OrderForm25.js | grep -c "formData"
echo ""
echo "With multiple dependencies (>3):"
grep -A 3 "useEffect" OrderForm25.js | grep -E "\[.*,.*,.*," | wc -l
EOF

chmod +x /tmp/useeffect_audit.sh
/tmp/useeffect_audit.sh
```

### 🎯 **Krok 4.2: Kategorie useEffect pro optimalizaci**

#### **A) Inicializační effects (run once) - PONECHAT**

```javascript
// ✅ OK - spustí se pouze při mount
useEffect(() => {
  loadCiselniky();
}, []);

// ✅ OK - ESC handler
useEffect(() => {
  const handleEsc = (e) => { /* ... */ };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, []);
```

#### **B) Synchronizační effects - OPTIMALIZOVAT**

```javascript
// ❌ PROBLÉM - spouští se při každé změně formData
useEffect(() => {
  if (formData.id) {
    syncWithServer(formData);
  }
}, [formData]); // ❌ celý formData object!

// ✅ ŘEŠENÍ - specifické dependencies
useEffect(() => {
  if (formData.id) {
    syncWithServer(formData);
  }
}, [formData.id, formData.ev_cislo, formData.stav]); // Pouze konkrétní pole
```

#### **C) Kaskádové effects - ELIMINOVAT**

```javascript
// ❌ PROBLÉM - kaskáda
useEffect(() => {
  setStateA(x);
}, [dep1]);

useEffect(() => {
  setStateB(y); // Spustí se kvůli stateA
}, [stateA]);

useEffect(() => {
  setStateC(z); // Spustí se kvůli stateB
}, [stateB]);

// ✅ ŘEŠENÍ - sloučit do jednoho
useEffect(() => {
  setStateA(x);
  setStateB(y);
  setStateC(z);
}, [dep1]);
```

#### **D) Data fetching effects - PŘESUNOUT DO CUSTOM HOOKS**

```javascript
// ❌ SOUČASNÝ STAV - v komponentě
useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      setData(data);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, [id]);

// ✅ CÍLOVÝ STAV - custom hook
const { data, loading, error } = useOrderData(id);
```

### 🎯 **Krok 4.3: Prioritní useEffect pro odstranění/optimalizaci**

| useEffect typ | Počet | Akce | Priorita |
|---------------|-------|------|----------|
| Kaskádové (A→B→C) | ~20 | SLOUČIT | 🔴 Vysoká |
| Celý formData jako dep | ~15 | PŘEPSAT na specifické deps | 🔴 Vysoká |
| Data fetching | ~30 | PŘESUNOUT do hooks | 🟡 Střední |
| Synchronizace UI | ~25 | OPTIMALIZOVAT | 🟡 Střední |
| Mount/unmount | ~15 | PONECHAT | 🟢 Nízká |
| Debugging/logging | ~9 | ODSTRANIT v produkci | 🟢 Nízká |

---

## ✅ Fáze 5: Centralizace pomocí existujících managerů (3-5 dní)

### 🎯 **Krok 5.1: Využití draftManager**

**Současný stav - partial usage:**

```javascript
// ✅ Import je OK
import draftManager from '../services/DraftManager';

// ❌ Ale používá se nekonzistentně
// Někde se volá draftManager, někde staré localStorage volání
```

**Audit použití:**

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms

# Najít přímá localStorage volání
grep -n "localStorage.getItem\|localStorage.setItem\|localStorage.removeItem" OrderForm25.js

# Najít draftManager volání
grep -n "draftManager\." OrderForm25.js
```

**Akce:**
- ✅ Nahradit VŠECHNA localStorage volání za draftManager
- ✅ Odstranit duplicitní draft logiku
- ✅ Použít draftManager.save(), draftManager.load(), draftManager.remove()

### 🎯 **Krok 5.2: Využití formDataManager**

```javascript
// ✅ Import je OK
import formDataManager from '../services/FormDataManager';

// Použití:
const normalized = formDataManager.normalizeFromBackend(rawData);
const forAPI = formDataManager.prepareForAPI(formData);
```

**Odstranit duplicitní normalizační funkce z komponenty.**

### 🎯 **Krok 5.3: Využití useAutosave hook**

```javascript
// ✅ Import je OK
import { useAutosave } from '../hooks/useAutosave';

// ❌ Ale má vlastní autosave logiku
// Odstranit vlastní a použít centrální hook
```

---

## 📋 Konkrétní Checklist - Co dělat teď

### **Sprint 1: Cleanup (2-3 dny)** 🟢

- [ ] **1.1** Spustit API audit script
- [ ] **1.2** Spustit useEffect audit script
- [ ] **1.3** Najít všechny zakomentované bloky
- [ ] **1.4** Smazat zakomentovaný kód (commit: "cleanup: remove commented code")
- [ ] **1.5** Odstranit deprecated importy (commit: "cleanup: remove deprecated imports")
- [ ] **1.6** Test že formulář funguje
- [ ] **1.7** Commit + push

**Očekávaný výsledek:** -500 až -1000 řádků

### **Sprint 2: API Unifikace (3-5 dní)** 🟡

- [ ] **2.1** Zkontrolovat apiOrderV2.js - co je dostupné
- [ ] **2.2** Vytvořit V2 wrappery pro chybějící funkce (getStrediskaV2, etc.)
- [ ] **2.3** Najít všechna použití api25 funkcí v OrderForm25
- [ ] **2.4** Postupně nahradit za V2 API (po jedné funkci)
- [ ] **2.5** Test po každé změně
- [ ] **2.6** Odstranit import api25orders
- [ ] **2.7** Commit + push

**Očekávaný výsledek:** Pouze V2 API, jednotné error handling

### **Sprint 3: useState Konsolidace - Loading States (2 dny)** 🟡

- [ ] **3.1** Přidat nový `loadingStates` objekt
- [ ] **3.2** Přidat `setLoading` helper
- [ ] **3.3** Migrovat `isLoadingCiselniky` → `loadingStates.ciselniky`
- [ ] **3.4** Test
- [ ] **3.5** Migrovat `isLoadingFormData` → `loadingStates.formData`
- [ ] **3.6** Test
- [ ] **3.7** Postupně všechny loading states
- [ ] **3.8** Odstranit staré useState deklarace
- [ ] **3.9** Commit + push

**Očekávaný výsledek:** 10+ useState → 1 useState objekt

### **Sprint 4: useState Konsolidace - Dialog States (2 dny)** 🟡

- [ ] **4.1** Přidat nový `dialogs` objekt
- [ ] **4.2** Přidat `openDialog`, `closeDialog` helpers
- [ ] **4.3** Migrovat dialog states jeden po druhém
- [ ] **4.4** Test každého dialogu
- [ ] **4.5** Commit + push

**Očekávaný výsledek:** 15+ useState → 1 useState objekt

### **Sprint 5: useState Konsolidace - Unlock States (1-2 dny)** 🟢

- [ ] **5.1** Přidat nový `unlockStates` objekt
- [ ] **5.2** Migrovat unlock states
- [ ] **5.3** Test workflow transitions
- [ ] **5.4** Commit + push

### **Sprint 6: useEffect Optimalizace - Phase 1 (3-5 dní)** 🔴

- [ ] **6.1** Identifikovat kaskádové effects
- [ ] **6.2** Sloučit související effects
- [ ] **6.3** Test
- [ ] **6.4** Identifikovat effects s `formData` dependency
- [ ] **6.5** Přepsat na specifické dependencies
- [ ] **6.6** Test
- [ ] **6.7** Commit + push

**Očekávaný výsledek:** -20 až -30 useEffect

### **Sprint 7: Centralizace Managers (2-3 dny)** 🟢

- [ ] **7.1** Najít všechna localStorage volání
- [ ] **7.2** Nahradit za draftManager
- [ ] **7.3** Test draft save/load
- [ ] **7.4** Použít formDataManager pro normalizaci
- [ ] **7.5** Použít useAutosave hook
- [ ] **7.6** Commit + push

---

## 🎯 Celkový Timeline

| Sprint | Dny | Riziko | Status |
|--------|-----|--------|--------|
| Sprint 1: Cleanup | 2-3 | 🟢 Nízké | ⏳ TODO |
| Sprint 2: API Unifikace | 3-5 | 🟡 Střední | ⏳ TODO |
| Sprint 3: Loading States | 2 | 🟢 Nízké | ⏳ TODO |
| Sprint 4: Dialog States | 2 | 🟢 Nízké | ⏳ TODO |
| Sprint 5: Unlock States | 1-2 | 🟡 Střední | ⏳ TODO |
| Sprint 6: useEffect Opt | 3-5 | 🔴 Vysoké | ⏳ TODO |
| Sprint 7: Managers | 2-3 | 🟢 Nízké | ⏳ TODO |
| **CELKEM** | **15-25 dní** | | |

---

## 🧪 Testing Strategy

### Po každé změně:

```bash
# 1. Spustit aplikaci
cd /var/www/erdms-dev
npm run dev

# 2. Manuální test checklist:
- [ ] Formulář se načte
- [ ] Lze vytvořit novou objednávku
- [ ] Lze editovat existující objednávku
- [ ] Workflow transitions fungují
- [ ] Přílohy fungují
- [ ] Draft save/load funguje
- [ ] Validace funguje
- [ ] Uložení do DB funguje

# 3. Console check:
- [ ] Žádné chyby v console
- [ ] Žádné warning o re-renders
- [ ] Žádné memory leaks
```

---

## 📊 Očekávané Výsledky

### Před:
- 26 590 řádků
- 139 useState
- 114 useEffect
- Mix API V1/V2
- Zakomentovaný kód: ~500 řádků
- Deprecated imports: 10+

### Po (Sprint 1-7):
- ~25 000 řádků (-1500)
- ~110 useState (-29) - konsolidace loading/dialog/unlock
- ~85 useEffect (-29) - sloučení kaskád
- ✅ Pouze V2 API
- ✅ Žádný zakomentovaný kód
- ✅ Žádné deprecated imports
- ✅ Centralizované managery

### Performance:
- Render time: -20% až -30%
- Memory usage: -15%
- Re-render count: -40%

---

## 🚀 Jak začít PRÁVĚ TEĎ

### Příkaz #1: Cleanup audit

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms

# Vytvoříme complete audit report
cat > /tmp/orderform_audit.sh << 'EOF'
#!/bin/bash
echo "=========================================="
echo "   ORDERFORM25 OPTIMIZATION AUDIT"
echo "=========================================="
echo ""
echo "📊 ZÁKLADNÍ METRIKY:"
echo "Celkový počet řádků: $(wc -l < OrderForm25.js)"
echo "useState: $(grep -c 'useState' OrderForm25.js)"
echo "useEffect: $(grep -c 'useEffect' OrderForm25.js)"
echo "useCallback: $(grep -c 'useCallback' OrderForm25.js)"
echo "useMemo: $(grep -c 'useMemo' OrderForm25.js)"
echo ""
echo "🗑️  ZAKOMENTOVANÝ KÓD:"
echo "Zakomentované useState: $(grep -c '^[[:space:]]*//[[:space:]]*const \[.*useState' OrderForm25.js)"
echo "Zakomentované useEffect: $(grep -c '^[[:space:]]*//[[:space:]]*useEffect' OrderForm25.js)"
echo "Deprecated importy: $(grep -c 'DEPRECATED\|❌.*DEPRECATED' OrderForm25.js)"
echo ""
echo "🔍 API USAGE:"
echo "api25orders importy: $(grep -c 'from.*api25orders' OrderForm25.js)"
echo "apiOrderV2 importy: $(grep -c 'from.*apiOrderV2' OrderForm25.js)"
echo ""
echo "getStrediska25 calls: $(grep 'getStrediska25' OrderForm25.js | grep -v '//' | wc -l)"
echo "getOrderV2 calls: $(grep 'getOrderV2' OrderForm25.js | grep -v '//' | wc -l)"
echo ""
echo "=========================================="
EOF

chmod +x /tmp/orderform_audit.sh
/tmp/orderform_audit.sh > /tmp/orderform_audit_report.txt

# Zobrazit report
cat /tmp/orderform_audit_report.txt
```

### Příkaz #2: První cleanup commit

```bash
cd /var/www/erdms-dev

# Vytvořit feature branch
git checkout -b feature/orderform25-optimization

# První úkol: Smazat zakomentovaný kód
# (Manuálně editovat OrderForm25.js a odstranit commented code)

# Commit
git add .
git commit -m "cleanup(OrderForm25): remove commented/deprecated code

- Remove commented useState declarations
- Remove commented useEffect blocks
- Remove deprecated import comments
- Reduce file size by ~500 lines"

# Push
git push origin feature/orderform25-optimization
```

---

## ✅ Success Criteria

### Definice "Done" pro každý sprint:

1. ✅ Kód je commitnutý a pushnutý
2. ✅ Formulář funguje v DEV
3. ✅ Žádné console errors
4. ✅ Manuální test checklist passed
5. ✅ Code review (self-review min.)
6. ✅ Dokumentace aktualizovaná

---

**🎯 První krok:** Spustit audit a vytvořit feature branch!

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms
/tmp/orderform_audit.sh
```
