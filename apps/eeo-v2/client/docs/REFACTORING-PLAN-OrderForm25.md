# 🚨 REFACTORING PLÁN - OrderForm25.js
# Řešení race condition problémů při načítání formuláře

## 📊 SOUČASNÝ STAV - IDENTIFIKOVANÉ PROBLÉMY

### 1. **RACE CONDITIONS**
- ❌ **50+ useEffect hooků** - nekontrolovatelné pořadí spuštění
- ❌ **Duplicitní načítací funkce**: `loadOrderForEdit()`, `loadOrderForCopy()`, `loadOrderData()`
- ❌ **Nekonzistentní inicializace**: Data se načítají v různých useEffect hookách
- ❌ **Chybějící loading states**: Formulář se renderuje před načtením dat
- ❌ **Dependency hell**: useEffect hooky se spouští v nesprávném pořadí

### 2. **PROBLEMATICKÉ ČÁSTI**
```javascript
// Řádek 4453: loadOrderForCopy - useEffect
// Řádek 4593: loadOrderForEdit - useEffect (záložní)
// Řádek 9304: loadOrderForEdit - useEffect (duplikát)
// Řádek 9786: loadOrderData - useEffect (další duplikát)
```

### 3. **CHYBĚJÍCÍ ARCHITEKTURA**
- Žádná jasná lifecycle fáze
- Inicializace smíchaná s rendering logikou
- Data loading bez kontroly dependencies
- Chybí centralizovaný state management

---

## 🎯 NOVÁ ARCHITEKTURA - FUNKCIONÁLNÍ PŘÍSTUP

### **FÁZE INICIALIZACE** (Strict Order)

```
┌─────────────────────────────────────────────────────┐
│  FÁZE 1: MOUNTING & INITIALIZATION                  │
├─────────────────────────────────────────────────────┤
│  ✅ Parse URL params (?edit, ?copy, ?archivovano)   │
│  ✅ Initialize refs & state                          │
│  ✅ Set user context (AuthContext)                   │
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  FÁZE 2: DICTIONARY LOADING                         │
├─────────────────────────────────────────────────────┤
│  ✅ Load číselníky (strediska, financování, druhy)  │
│  ✅ Load users & approvers                           │
│  ✅ Wait for ALL dictionaries → setDictionariesReady│
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  FÁZE 3: FORM INITIALIZATION (EMPTY STATE)          │
├─────────────────────────────────────────────────────┤
│  ✅ Initialize formData with DEFAULTS                │
│  ✅ Setup validation rules                           │
│  ✅ Initialize FÁZE 1-8 system                       │
│  ✅ READY FOR RENDERING (empty form visible)        │
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  FÁZE 4: DATA LOADING (if edit/copy mode)           │
├─────────────────────────────────────────────────────┤
│  ✅ IF editOrderId → loadOrderFromDB()               │
│  ✅ IF copyOrderId → loadAndCopyOrder()              │
│  ✅ ELSE → loadDraft() OR keep empty                 │
│  ✅ Transform data → setFormData()                   │
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  FÁZE 5: FORM POPULATION & VALIDATION               │
├─────────────────────────────────────────────────────┤
│  ✅ Fill form fields with loaded data                │
│  ✅ Validate workflow state                          │
│  ✅ Setup locking/unlocking                          │
│  ✅ Enable user interaction                          │
└─────────────────────────────────────────────────────┘
```

---

## 📝 IMPLEMENTAČNÍ KROKY

### **KROK 1: Centralizace načítacích funkcí**
```javascript
// ✅ JEDNA FUNKCE pro načítání - žádné duplikáty
const loadOrderData = useCallback(async ({ orderId, mode = 'edit' }) => {
  if (!token || !username || !areDictionariesReady) {
    return null;
  }
  
  setIsLoadingFormData(true);
  
  try {
    const dbOrder = await getOrder25({ token, username, orderId });
    
    if (mode === 'copy') {
      return prepareCopyData(dbOrder);
    }
    
    return transformOrderData(dbOrder);
  } catch (error) {
    showToast?.('Chyba při načítání objednávky', 'error');
    return null;
  } finally {
    setIsLoadingFormData(false);
  }
}, [token, username, areDictionariesReady]);
```

### **KROK 2: Lifecycle useEffect - SPRÁVNÉ POŘADÍ**
```javascript
// 🎯 EFFECT 1: Mount - Načtení číselníků
useEffect(() => {
  if (!token || !username) return;
  
  const loadDictionaries = async () => {
    await Promise.all([
      loadStrediska(),
      loadFinancovani(),
      loadDruhy(),
      loadUsers()
    ]);
    setAreDictionariesReady(true);
  };
  
  loadDictionaries();
}, [token, username]); // ✅ Spustí se JEDNOU při mountu

// 🎯 EFFECT 2: Data Loading - POUZE když jsou číselníky ready
useEffect(() => {
  if (!areDictionariesReady) return;
  
  const initializeFormData = async () => {
    if (editOrderId) {
      const data = await loadOrderData({ orderId: editOrderId, mode: 'edit' });
      if (data) setFormData(data);
    } else if (copyOrderId) {
      const data = await loadOrderData({ orderId: copyOrderId, mode: 'copy' });
      if (data) setFormData(data);
    } else {
      loadDraftOrInitializeEmpty();
    }
  };
  
  initializeFormData();
}, [areDictionariesReady, editOrderId, copyOrderId]); // ✅ Dependencies jasné

// 🎯 EFFECT 3: Autosave - POUZE když jsou data ready a changed
useEffect(() => {
  if (!isFormDataReady || !isChanged) return;
  
  const timer = setTimeout(() => {
    saveDraft();
  }, 2000);
  
  return () => clearTimeout(timer);
}, [formData, isChanged, isFormDataReady]); // ✅ Autosave až když je vše hotové
```

### **KROK 3: Loading States**
```javascript
const [loadingStates, setLoadingStates] = useState({
  dictionaries: true,
  formData: false,
  saving: false
});

// 🎯 Zobraz loading overlay
if (loadingStates.dictionaries || loadingStates.formData) {
  return <LoadingOverlay message="Načítání formuláře..." />;
}
```

### **KROK 4: Cleanup duplicit**
- ❌ Smazat: `loadOrderForEdit` na řádku 4596
- ❌ Smazat: `loadOrderForEdit` na řádku 9305
- ❌ Smazat: `loadOrderData` na řádku 9786
- ✅ Nahradit: Jedna centralizovaná `loadOrderData` funkce

---

## 🎨 ZACHOVÁVÁME (NO CHANGES)

✅ **Design formuláře** - 100% stejný
✅ **FÁZE 1-8 system** - Žádné změny
✅ **Workflow states** - Beze změny
✅ **Validation rules** - Stejné
✅ **UI komponenty** - Beze změny

---

## 🔥 IMPLEMENTATION CHECKLIST

### Phase 1: Setup
- [ ] Backup (✅ HOTOVO - commit 148a0d8)
- [ ] Create new state management structure
- [ ] Define loading states enum

### Phase 2: Refactor Data Loading
- [ ] Create `useOrderDataLoader` custom hook
- [ ] Consolidate `loadOrderData` function
- [ ] Remove duplicate loading functions
- [ ] Add proper error handling

### Phase 3: Lifecycle Refactor
- [ ] Reduce useEffect count to 5-10 max
- [ ] Implement strict dependency arrays
- [ ] Add cleanup functions
- [ ] Add loading guards

### Phase 4: Testing
- [ ] Test new order creation
- [ ] Test edit mode (?edit=ID)
- [ ] Test copy mode (?copy=ID)
- [ ] Test draft loading
- [ ] Test race condition scenarios

### Phase 5: Commit
- [ ] Git commit with detailed message
- [ ] Update documentation

---

## 🏗️ CENTRALIZACE STATE MANAGEMENTU

### **PROBLÉM: 100+ useState hooks rozptýlených po celém kódu**

```javascript
// ❌ SOUČASNÝ STAV - CHAOS
const [allUsers, setAllUsers] = useState([]);
const [approvers, setApprovers] = useState([]);
const [strediskaOptions, setStrediskaOptions] = useState([]);
const [financovaniOptions, setFinancovaniOptions] = useState([]);
const [loadingUsers, setLoadingUsers] = useState(false);
const [loadingApprovers, setLoadingApprovers] = useState(false);
const [loadingStrediska, setLoadingStrediska] = useState(false);
const [loadingFinancovani, setLoadingFinancovani] = useState(false);
const [areDictionariesReady, setAreDictionariesReady] = useState(false);
const [isLoadingFormData, setIsLoadingFormData] = useState(false);
const [isFormInitializing, setIsFormInitializing] = useState(true);
const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
// ... +90 dalších useState!!!
```

### **ŘEŠENÍ: useReducer + Centralizovaný State Management**

#### 1️⃣ **FormLifecycleReducer** - Řízení životního cyklu
```javascript
const initialLifecycleState = {
  phase: 'MOUNTING',           // MOUNTING → LOADING_DICTIONARIES → READY_FOR_DATA → DATA_LOADED → READY
  isInitializing: true,
  isLoadingDictionaries: false,
  isLoadingFormData: false,
  isReady: false,
  error: null
};

const lifecycleReducer = (state, action) => {
  switch (action.type) {
    case 'START_DICTIONARIES_LOAD':
      return { ...state, phase: 'LOADING_DICTIONARIES', isLoadingDictionaries: true };
    case 'DICTIONARIES_LOADED':
      return { ...state, phase: 'READY_FOR_DATA', isLoadingDictionaries: false };
    case 'START_DATA_LOAD':
      return { ...state, phase: 'LOADING_DATA', isLoadingFormData: true };
    case 'DATA_LOADED':
      return { ...state, phase: 'READY', isLoadingFormData: false, isInitializing: false, isReady: true };
    case 'ERROR':
      return { ...state, error: action.payload, isInitializing: false };
    default:
      return state;
  }
};

const [lifecycle, dispatchLifecycle] = useReducer(lifecycleReducer, initialLifecycleState);
```

#### 2️⃣ **DictionariesReducer** - Číselníky & Options
```javascript
const initialDictionariesState = {
  data: {
    allUsers: [],
    approvers: [],
    strediskaOptions: [],
    financovaniOptions: [],
    druhyObjednavkyOptions: [],
    lpKodyOptions: [],
    prilohyTypyOptions: []
  },
  loading: {
    users: false,
    approvers: false,
    strediska: false,
    financovani: false,
    druhy: false,
    lpKody: false,
    prilohyTypy: false
  },
  isReady: false,
  error: null
};

const dictionariesReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USERS':
      return {
        ...state,
        data: { ...state.data, allUsers: action.payload },
        loading: { ...state.loading, users: false }
      };
    case 'SET_STREDISKA':
      return {
        ...state,
        data: { ...state.data, strediskaOptions: action.payload },
        loading: { ...state.loading, strediska: false }
      };
    case 'ALL_LOADED':
      return { ...state, isReady: true };
    default:
      return state;
  }
};

const [dictionaries, dispatchDictionaries] = useReducer(dictionariesReducer, initialDictionariesState);
```

#### 3️⃣ **UIStateReducer** - UI stavy (modals, dialogs, etc.)
```javascript
const initialUIState = {
  modals: {
    showCancelConfirm: false,
    showSupplierSearch: false,
    aresPopup: false,
    showTemplateSave: false,
    showIcoCheck: false,
    showSaveProgress: false,
    showAddFaktura: false
  },
  sections: {
    collapsed: {},
    locked: {}
  },
  fullscreen: false,
  debugPanel: { visible: false, pinned: false }
};

const uiReducer = (state, action) => {
  switch (action.type) {
    case 'OPEN_MODAL':
      return { ...state, modals: { ...state.modals, [action.payload]: true } };
    case 'CLOSE_MODAL':
      return { ...state, modals: { ...state.modals, [action.payload]: false } };
    case 'TOGGLE_FULLSCREEN':
      return { ...state, fullscreen: !state.fullscreen };
    case 'COLLAPSE_SECTION':
      return { ...state, sections: { ...state.sections, collapsed: { ...state.sections.collapsed, [action.payload]: true } } };
    default:
      return state;
  }
};

const [ui, dispatchUI] = useReducer(uiReducer, initialUIState);
```

#### 4️⃣ **LoadingStatesReducer** - Všechny loading states
```javascript
const initialLoadingState = {
  dictionaries: false,
  formData: false,
  saving: false,
  autoSaving: false,
  uploading: false,
  ares: false,
  supplier: false,
  templates: false,
  invoices: false
};

const loadingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, [action.payload.key]: action.payload.value };
    case 'START_MULTIPLE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

const [loading, dispatchLoading] = useReducer(loadingReducer, initialLoadingState);
```

### **CUSTOM HOOKS - Další úroveň centralizace**

#### `useFormLifecycle` - Řízení celého lifecycle
```javascript
const useFormLifecycle = ({ token, username, editOrderId, copyOrderId }) => {
  const [lifecycle, dispatch] = useReducer(lifecycleReducer, initialLifecycleState);
  
  const initialize = useCallback(async () => {
    try {
      dispatch({ type: 'START_DICTIONARIES_LOAD' });
      await loadDictionaries();
      dispatch({ type: 'DICTIONARIES_LOADED' });
      
      if (editOrderId || copyOrderId) {
        dispatch({ type: 'START_DATA_LOAD' });
        await loadOrderData();
        dispatch({ type: 'DATA_LOADED' });
      } else {
        dispatch({ type: 'DATA_LOADED' }); // Prázdný form
      }
    } catch (error) {
      dispatch({ type: 'ERROR', payload: error.message });
    }
  }, [token, username, editOrderId, copyOrderId]);
  
  return { lifecycle, initialize };
};
```

#### `useDictionaries` - Načítání číselníků
```javascript
const useDictionaries = ({ token, username }) => {
  const [dictionaries, dispatch] = useReducer(dictionariesReducer, initialDictionariesState);
  
  const loadAll = useCallback(async () => {
    const [users, approvers, strediska, financovani] = await Promise.all([
      fetchAllUsers(token, username),
      fetchApprovers(token, username),
      getStrediska25(token, username),
      getFinancovaniZdroj25(token, username)
    ]);
    
    dispatch({ type: 'SET_USERS', payload: users });
    dispatch({ type: 'SET_APPROVERS', payload: approvers });
    dispatch({ type: 'SET_STREDISKA', payload: strediska });
    dispatch({ type: 'SET_FINANCOVANI', payload: financovani });
    dispatch({ type: 'ALL_LOADED' });
  }, [token, username]);
  
  return { dictionaries, loadAll };
};
```

#### `useOrderDataLoader` - Načítání dat objednávky
```javascript
const useOrderDataLoader = ({ token, username, dictionaries }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const loadOrder = useCallback(async ({ orderId, mode = 'edit' }) => {
    if (!dictionaries.isReady) {
      throw new Error('Dictionaries not ready');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const dbOrder = await getOrder25({ token, username, orderId });
      
      if (mode === 'copy') {
        return prepareCopyData(dbOrder, dictionaries);
      }
      
      return transformOrderData(dbOrder, dictionaries);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, username, dictionaries]);
  
  return { loadOrder, loading, error };
};
```

### **VÝHODY CENTRALIZACE**

✅ **Jasné pořadí inicializace** - Lifecycle reducer řídí fáze
✅ **Žádné race conditions** - Jeden reducer = jeden zdroj pravdy
✅ **Snadné debugování** - Všechny state změny jdou přes dispatch
✅ **Lepší performance** - Méně re-renderů
✅ **Testovatelnost** - Reducery jsou pure functions
✅ **Přehlednost** - State management na jednom místě

### **MIGRACE STÁVAJÍCÍCH useState → useReducer**

```javascript
// ❌ PŘED (rozházené po celém souboru)
const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
const [isLoadingFormData, setIsLoadingFormData] = useState(false);
const [isFormInitializing, setIsFormInitializing] = useState(true);

// ✅ PO (centralizované)
const { lifecycle } = useFormLifecycle({ token, username, editOrderId, copyOrderId });
const isLoading = lifecycle.isInitializing || lifecycle.isLoadingFormData;
const isReady = lifecycle.isReady;
```

---

## 🔧 ŘÍDÍCÍ MECHANISMY

### **1. FormController - Hlavní řídící třída/hook**

```javascript
const useFormController = () => {
  const { lifecycle, initialize } = useFormLifecycle({ token, username, editOrderId, copyOrderId });
  const { dictionaries, loadAll: loadDictionaries } = useDictionaries({ token, username });
  const { loadOrder } = useOrderDataLoader({ token, username, dictionaries });
  const { ui, dispatchUI } = useUIState();
  
  // 🎯 MASTER INITIALIZATION FUNCTION
  const initializeForm = useCallback(async () => {
    try {
      // Fáze 1: Načti číselníky
      await loadDictionaries();
      
      // Fáze 2: Načti data (pokud edit/copy)
      if (editOrderId) {
        const data = await loadOrder({ orderId: editOrderId, mode: 'edit' });
        setFormData(data);
      } else if (copyOrderId) {
        const data = await loadOrder({ orderId: copyOrderId, mode: 'copy' });
        setFormData(data);
      }
      
      // Fáze 3: Form ready
      return true;
    } catch (error) {
      console.error('Form initialization failed:', error);
      return false;
    }
  }, [loadDictionaries, loadOrder, editOrderId, copyOrderId]);
  
  // 🎯 AUTO-INIT při mountu
  useEffect(() => {
    initializeForm();
  }, []); // Pouze jednou!
  
  return {
    lifecycle,
    dictionaries,
    ui,
    initializeForm,
    isReady: lifecycle.isReady
  };
};
```

### **2. Guard Hooks - Ochrana před předčasným spuštěním**

```javascript
// 🛡️ Spustí callback POUZE když jsou číselníky ready
const useWaitForDictionaries = (callback, deps = []) => {
  const { dictionaries } = useContext(FormContext);
  
  useEffect(() => {
    if (!dictionaries.isReady) return;
    
    callback();
  }, [dictionaries.isReady, ...deps]);
};

// 🛡️ Spustí callback POUZE když je form ready
const useWaitForFormReady = (callback, deps = []) => {
  const { lifecycle } = useContext(FormContext);
  
  useEffect(() => {
    if (!lifecycle.isReady) return;
    
    callback();
  }, [lifecycle.isReady, ...deps]);
};
```

### **3. Loading Guards - Prevence paralelního načítání**

```javascript
const useLoadingGuard = (key) => {
  const loadingRef = useRef(false);
  
  const withGuard = useCallback(async (fn) => {
    if (loadingRef.current) {
      console.warn(`${key} is already loading, skipping...`);
      return;
    }
    
    loadingRef.current = true;
    try {
      return await fn();
    } finally {
      loadingRef.current = false;
    }
  }, [key]);
  
  return withGuard;
};

// Použití:
const guardedLoadOrder = useLoadingGuard('orderData');
await guardedLoadOrder(() => loadOrder({ orderId }));
```

### **4. Dependency Tracking - Debug helper**

```javascript
const useDependencyDebug = (name, deps) => {
  const prevDepsRef = useRef(deps);
  
  useEffect(() => {
    const changedDeps = deps.reduce((acc, dep, idx) => {
      if (dep !== prevDepsRef.current[idx]) {
        acc.push({ index: idx, old: prevDepsRef.current[idx], new: dep });
      }
      return acc;
    }, []);
    
    if (changedDeps.length > 0) {
      console.log(`[${name}] Dependencies changed:`, changedDeps);
    }
    
    prevDepsRef.current = deps;
  }, deps);
};
```

---

## � VIZUALIZACE NOVÉ ARCHITEKTURY

```
┌───────────────────────────────────────────────────────────────┐
│                     OrderForm25 Component                      │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           useFormController (MASTER)                    │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  1. useFormLifecycle                              │   │  │
│  │  │     └─ Řídí: MOUNTING → LOADING → READY          │   │  │
│  │  │                                                    │   │  │
│  │  │  2. useDictionaries                               │   │  │
│  │  │     └─ Číselníky: users, strediska, financování   │   │  │
│  │  │                                                    │   │  │
│  │  │  3. useOrderDataLoader                            │   │  │
│  │  │     └─ Načítání: edit, copy, draft                │   │  │
│  │  │                                                    │   │  │
│  │  │  4. useUIState                                    │   │  │
│  │  │     └─ Modals, dialogs, sections                  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Centralizované Reducery                    │  │
│  │  ┌────────────┬─────────────┬──────────┬─────────────┐  │  │
│  │  │ lifecycle  │ dictionaries│  loading │   uiState   │  │  │
│  │  │  Reducer   │   Reducer   │  Reducer │   Reducer   │  │  │
│  │  └────────────┴─────────────┴──────────┴─────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                Single useEffect                         │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  useEffect(() => {                                │   │  │
│  │  │    initializeForm(); // Vše řízené z jednoho místa│   │  │
│  │  │  }, []); // Pouze jednou při mountu!              │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Loading States Guard                       │  │
│  │  if (!lifecycle.isReady) {                              │  │
│  │    return <LoadingOverlay />;                           │  │
│  │  }                                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           RENDER - Formulář FÁZE 1-8                   │  │
│  │  (Design beze změny, plně funkční)                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

---

## 🎯 FINÁLNÍ STRATEGIE IMPLEMENTACE

### **ETAPA 1: Příprava infrastruktury** (30 min)
```javascript
// 1. Vytvořit nové soubory pro reducery a custom hooks
src/forms/OrderForm25/
  ├── reducers/
  │   ├── lifecycleReducer.js
  │   ├── dictionariesReducer.js
  │   ├── loadingReducer.js
  │   └── uiReducer.js
  ├── hooks/
  │   ├── useFormLifecycle.js
  │   ├── useDictionaries.js
  │   ├── useOrderDataLoader.js
  │   └── useFormController.js
  └── OrderForm25.js (refactored)
```

### **ETAPA 2: Migrace state → reducers** (1 hod)
```javascript
// Postupně přesunout useState → useReducer
// Priority:
// 1. Loading states (nejvíc problémové)
// 2. Dictionaries (závislosti)
// 3. UI states (nejméně kritické)
```

### **ETAPA 3: Refactor useEffect hooků** (1.5 hod)
```javascript
// Redukce z 50+ na cca 5-7 useEffect hooků:
// 1. Mount & initialization
// 2. Dictionary loading watcher
// 3. Data loading watcher
// 4. Autosave watcher
// 5. Cleanup on unmount
```

### **ETAPA 4: Testování** (1 hod)
```javascript
// Test scénáře:
// ✅ Nová objednávka (prázdný formulář)
// ✅ Edit mode (?edit=123)
// ✅ Copy mode (?copy=123)
// ✅ Draft loading
// ✅ Race condition test (rychlé klikání)
```

### **ETAPA 5: Git commit & dokumentace** (30 min)
```bash
git add -A
git commit -m "♻️ REFACTOR: OrderForm25 - Fix race conditions
- Centralizace state managementu (100+ useState → 4 useReducers)
- Redukce useEffect hooků (50+ → 7)
- Implementace FormController pattern
- Fix race conditions při načítání dat
- Zachován design a FÁZE 1-8 systém"
```

---

## 📋 DETAILNÍ CHECKLIST PRO IMPLEMENTACI

### Phase 1: Příprava
- [ ] Vytvořit strukturu adresářů `/reducers` a `/hooks`
- [ ] Implementovat `lifecycleReducer.js`
- [ ] Implementovat `dictionariesReducer.js`
- [ ] Implementovat `loadingReducer.js`
- [ ] Implementovat `uiReducer.js`
- [ ] Git commit: "🏗️ Setup: Vytvořena infrastruktura pro state management"

### Phase 2: Custom Hooks
- [ ] Vytvořit `useFormLifecycle.js`
- [ ] Vytvořit `useDictionaries.js`
- [ ] Vytvořit `useOrderDataLoader.js`
- [ ] Vytvořit `useUIState.js`
- [ ] Vytvořit `useFormController.js` (master hook)
- [ ] Git commit: "🎣 Custom hooks pro správu formuláře"

### Phase 3: Integrace do OrderForm25
- [ ] Import všech custom hooks
- [ ] Nahradit useState loading states → loadingReducer
- [ ] Nahradit useState dictionaries → dictionariesReducer
- [ ] Nahradit useState lifecycle → lifecycleReducer
- [ ] Přesunout UI states → uiReducer
- [ ] Git commit: "🔄 Migrace state managementu na reducery"

### Phase 4: Refactor useEffect
- [ ] Smazat duplicitní `loadOrderForEdit` (řádek 4596)
- [ ] Smazat duplicitní `loadOrderForEdit` (řádek 9305)
- [ ] Smazat duplicitní `loadOrderData` (řádek 9786)
- [ ] Implementovat single `useEffect` pro initialization
- [ ] Přidat guards pro závislosti
- [ ] Git commit: "🧹 Cleanup: Odstranění duplicit a race conditions"

### Phase 5: Loading Guards
- [ ] Implementovat `useLoadingGuard` hook
- [ ] Přidat guards na všechny data loading funkce
- [ ] Implementovat loading overlay při inicializaci
- [ ] Git commit: "🛡️ Loading guards a ochrana před race conditions"

### Phase 6: Testing
- [ ] Test: Nová objednávka
- [ ] Test: Edit mode
- [ ] Test: Copy mode
- [ ] Test: Draft loading
- [ ] Test: Rychlé přepínání mezi režimy
- [ ] Test: Slow network simulation
- [ ] Git commit: "✅ Testování dokončeno - vše funguje"

### Phase 7: Dokumentace
- [ ] Aktualizovat README.md
- [ ] Přidat komentáře do kódu
- [ ] Vytvořit migration guide
- [ ] Git commit: "📚 Dokumentace refactoringu"

---

## ⚠️ KRITICKÉ POZNÁMKY

### **CO ZACHOVAT**
- ✅ **Design formuláře** - Žádné vizuální změny
- ✅ **FÁZE 1-8 systém** - Workflow zůstává stejný
- ✅ **Workflow states** - NOVA, ODESLANA, atd.
- ✅ **Validation rules** - Stejná logika
- ✅ **API volání** - Beze změny
- ✅ **Draft system** - Funguje stejně

### **CO ZMĚNIT**
- ❌ **useState chaos** → useReducer centralizace
- ❌ **50+ useEffect** → 5-7 kontrolovaných
- ❌ **Duplicitní loading funkce** → Jedna centralizovaná
- ❌ **Race conditions** → Strict lifecycle control
- ❌ **Dependency hell** → Jasné závislosti

### **BEZPEČNOSTNÍ MECHANISMY**
```javascript
// 1. Lifecycle guard
if (!lifecycle.isReady) {
  return <LoadingOverlay />;
}

// 2. Dictionary guard
if (!dictionaries.isReady) {
  console.warn('Dictionaries not ready yet');
  return;
}

// 3. Loading guard
if (loading.formData) {
  console.warn('Already loading form data');
  return;
}
```

---

## 🚀 START IMPLEMENTATION

**Plán je kompletní! Ready to refactor?**

1. Začneme vytvořením reducerů a custom hooks
2. Postupně migrujeme state management
3. Redukujeme useEffect hooky
4. Testujeme všechny scénáře
5. Commitujeme funkční verzi

**Můžeme začít! 💪**
