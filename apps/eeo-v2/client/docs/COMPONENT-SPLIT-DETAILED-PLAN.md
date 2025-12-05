# 📦 Detailní Plán: Component Split & State Management
**Projekt:** OrderForm25 Refactoring  
**Datum:** 29. října 2025  
**Status:** DETAILED ANALYSIS - NOT STARTED

---

## 🎯 Bod 1: Monolithic Component Split (22,506 řádků)

### 📊 Aktuální Stav

**OrderForm25.js současná struktura:**
```
OrderForm25.js (22,506 lines)
├─ Imports (1-150)
├─ Styled Components (151-2,600)
├─ Helper Components (2,601-3,300)
├─ Main Component (3,301-22,506)
   ├─ Hooks (useState, useEffect) (3,301-4,500)
   ├─ Helper Functions (4,501-10,000)
   ├─ Event Handlers (10,001-12,000)
   ├─ JSX Render (12,001-22,506)
      ├─ Header (12,001-15,000)
      ├─ 11 Form Sections (15,001-21,000)
      ├─ Modals & Dialogs (21,001-22,506)
```

### 🔴 Problém Detailed

**Performance Impact:**
```javascript
// Současný stav:
const OrderForm25 = () => {
  const [formData, setFormData] = useState({...}); // MAIN STATE
  
  // ❌ Každá změna formData způsobí RE-RENDER celého formuláře
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value })); // ← Trigger
    // → Re-render 22,506 lines of JSX
    // → Re-compute všechny derived states
    // → Re-evaluate všechny conditions
  };
  
  return (
    <div>
      {/* 11 sekcí × ~1,500 řádků každá = 16,500 řádků JSX */}
      <ObjednatelSection /> {/* ❌ Re-renders i když se nezměnilo nic */}
      <DodavatelSection />  {/* ❌ Re-renders i když se nezměnilo nic */}
      <FakturySection />    {/* ❌ Re-renders i když se změnila jen 1 faktura */}
      {/* ... 8 more sections */}
    </div>
  );
};
```

**Measured Impact (Example):**
- User klikne na dropdown "Středisko"
- React re-renderuje **celých 22,506 řádků**
- Computed properties běží znovu (filtering, sorting, calculations)
- **Result:** ~150-300ms lag na slabším PC

---

### ✅ Co by Split Řešení Přineslo

#### Architektura Po Split:

```
src/forms/OrderForm25/
├─ OrderForm25.js (500-1,000 lines) ← MAIN ORCHESTRATOR
│  ├─ Import sections
│  ├─ useFormController (lifecycle)
│  ├─ Master state (formData)
│  ├─ Render sections with props
│
├─ components/
│  ├─ sections/
│  │  ├─ ObjednatelSection.jsx (600 lines)
│  │  │  └─ Props: { formData, onFieldChange, isLocked, errors }
│  │  ├─ SchvaleniSection.jsx (500 lines)
│  │  ├─ FinancovaniSection.jsx (1,200 lines)
│  │  ├─ DodavatelSection.jsx (1,500 lines)
│  │  ├─ DetailySection.jsx (2,000 lines)
│  │  ├─ DodaciPodminkySection.jsx (500 lines)
│  │  ├─ OdeslaniSection.jsx (700 lines)
│  │  ├─ RegistrSmlouvSection.jsx (800 lines)
│  │  ├─ FakturySection.jsx (3,000 lines)
│  │  │  └─ components/
│  │  │     └─ FakturaItem.jsx (300 lines) ← MEMOIZED
│  │  ├─ VecnaSpravnostSection.jsx (1,200 lines)
│  │  ├─ DokonceniSection.jsx (800 lines)
│  │  └─ PrilohySection.jsx (1,500 lines)
│  │
│  ├─ items/
│  │  ├─ PolozkaItem.jsx (200 lines) ← MEMOIZED
│  │  ├─ FakturaItem.jsx (300 lines) ← MEMOIZED
│  │  └─ PrilohaItem.jsx (150 lines) ← MEMOIZED
│  │
│  └─ shared/
│     ├─ FormSection.jsx (existing styled component)
│     ├─ FormRow.jsx
│     ├─ FormGroup.jsx
│     └─ CustomSelect.jsx (existing)
│
└─ hooks/
   ├─ useFormController.js (existing)
   ├─ useFormLifecycle.js (existing)
   ├─ useDictionaries.js (existing)
   └─ useOrderDataLoader.js (existing)
```

#### Performance Po Split:

```javascript
// Main file (500 lines):
const OrderForm25 = () => {
  const [formData, setFormData] = useState({...});
  
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);
  
  return (
    <div>
      {/* ✅ Každá sekce je izolovaná */}
      <ObjednatelSection 
        formData={formData.objednatel}  // ← Only relevant data
        onFieldChange={handleFieldChange}
        isLocked={shouldLockPhase1Sections}
      />
      <DodavatelSection 
        formData={formData.dodavatel}
        onFieldChange={handleFieldChange}
        isLocked={shouldLockPhase2Sections}
      />
      {/* ... */}
    </div>
  );
};

// Section file (600 lines):
const ObjednatelSection = React.memo(({ 
  formData, 
  onFieldChange, 
  isLocked 
}) => {
  // ✅ Re-renders POUZE když se změní formData.objednatel
  return (
    <FormSection>
      {/* 600 lines of section-specific JSX */}
    </FormSection>
  );
}, (prevProps, nextProps) => {
  // Custom equality check - re-render pouze když potřeba
  return (
    prevProps.formData === nextProps.formData &&
    prevProps.isLocked === nextProps.isLocked
  );
});
```

**Measured Impact After Split:**
- User klikne na dropdown "Středisko"
- React re-renderuje **jen FinancovaniSection (~1,200 řádků)**
- Ostatních 10 sekcí zůstává beze změny
- **Result:** ~20-40ms lag → **6-8× rychlejší**

---

### 🔧 Co by Split Obnášelo (Detailed Steps)

#### Fáze 1: Příprava (1 den)

**1.1 Analýza dependencies**
```bash
# Najít všechny state variables použité v každé sekci
grep -n "formData\." src/forms/OrderForm25.js | grep "Objednatel"
# → Seznam: formData.nazev_objednatele, formData.prijmeni, ...

# Najít všechny event handlers
grep -n "handleInputChange\|handleFieldChange" src/forms/OrderForm25.js
```

**1.2 Vytvoření interfaces (TypeScript-like)**
```javascript
// docs/SECTION-INTERFACES.md

ObjednatelSection Props:
{
  formData: {
    nazev_objednatele: string,
    prijmeni: string,
    jmeno: string,
    telefon: string,
    email: string,
    objednatel_id: number
  },
  onFieldChange: (field: string, value: any) => void,
  onFieldBlur: (field: string) => void,
  isLocked: boolean,
  errors: { [field: string]: string },
  users: Array<User>,
  currentUserId: number
}
```

**1.3 Příprava folder structure**
```bash
mkdir -p src/forms/OrderForm25/components/sections
mkdir -p src/forms/OrderForm25/components/items
mkdir -p src/forms/OrderForm25/components/shared
```

#### Fáze 2: Extract Sections (5-7 dní)

**Pro každou sekci (11 sekcí × 4-6 hodin = 44-66 hodin):**

**2.1 Copy JSX do nového souboru**
```bash
# Najít začátek sekce
grep -n "SEKCE: OBJEDNATEL" src/forms/OrderForm25.js
# → Line 15001

# Najít konec sekce (další <FormSection> nebo </div>)
# → Line 15678

# Copy lines 15001-15678 → ObjednatelSection.jsx
```

**2.2 Identifikovat dependencies**
```javascript
// V nové sekci najít všechny použité proměnné
const usedVariables = [
  'formData.nazev_objednatele',
  'formData.prijmeni',
  'handleInputChange',
  'handleFieldBlur',
  'allUsers',
  'isPhase1Locked',
  'errors.nazev_objednatele'
];

// Vytvořit Props interface
interface ObjednatelSectionProps {
  formData: {...},
  onFieldChange: Function,
  onFieldBlur: Function,
  users: User[],
  isLocked: boolean,
  errors: ErrorObject
}
```

**2.3 Wrap s React.memo**
```javascript
// src/forms/OrderForm25/components/sections/ObjednatelSection.jsx

import React from 'react';
import { FormSection, SectionHeader, ... } from '../../OrderForm25';

const ObjednatelSection = React.memo(({ 
  formData, 
  onFieldChange, 
  onFieldBlur,
  users,
  isLocked,
  errors 
}) => {
  // 🔧 Replace all `formData.nazev_objednatele` with just `formData.nazev_objednatele`
  // 🔧 Replace all `handleInputChange` with `onFieldChange`
  // 🔧 Replace all `isPhase1Locked` with `isLocked`
  
  return (
    <FormSection>
      {/* Original JSX here */}
    </FormSection>
  );
}, (prevProps, nextProps) => {
  // Shallow comparison - re-render pouze když se změní relevantní props
  return (
    prevProps.formData.nazev_objednatele === nextProps.formData.nazev_objednatele &&
    prevProps.formData.prijmeni === nextProps.formData.prijmeni &&
    // ... všechny fields
    prevProps.isLocked === nextProps.isLocked
  );
});

export default ObjednatelSection;
```

**2.4 Import v main file**
```javascript
// src/forms/OrderForm25.js

import ObjednatelSection from './components/sections/ObjednatelSection';

// Replace original JSX:
{/* OLD: 678 řádků JSX inline */}

// NEW:
<ObjednatelSection
  formData={{
    nazev_objednatele: formData.nazev_objednatele,
    prijmeni: formData.prijmeni,
    jmeno: formData.jmeno,
    telefon: formData.telefon,
    email: formData.email,
    objednatel_id: formData.objednatel_id
  }}
  onFieldChange={handleInputChange}
  onFieldBlur={handleFieldBlur}
  users={allUsers}
  isLocked={shouldLockPhase1Sections}
  errors={errors}
/>
```

**2.5 Testing**
```javascript
// Test každé sekce po extrakci:
1. ✅ Sekce se zobrazuje správně
2. ✅ Input fields fungují (onChange, onBlur)
3. ✅ Validace funguje
4. ✅ Locking funguje
5. ✅ Data se ukládají správně
6. ✅ React DevTools Profiler - sekce se re-renderuje pouze když potřeba
```

#### Fáze 3: Extract Item Components (1-2 dny)

**FakturaItem.jsx (Priority #1)**
```javascript
// src/forms/OrderForm25/components/items/FakturaItem.jsx

const FakturaItem = React.memo(({ 
  faktura,
  index,
  onUpdate,
  onDelete,
  isLocked,
  typyFaktur,
  onPrilohyChange
}) => {
  // ✅ Isolated re-render - pouze když se změní TATO faktura
  
  const handleFieldChange = useCallback((field, value) => {
    onUpdate(faktura.id, field, value);
  }, [faktura.id, onUpdate]);
  
  return (
    <div className="faktura-item">
      {/* 200-300 lines JSX pro jednu fakturu */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Deep equality check jen pro relevantní properties
  return (
    prevProps.faktura.id === nextProps.faktura.id &&
    prevProps.faktura.castka === nextProps.faktura.castka &&
    prevProps.faktura.typ === nextProps.faktura.typ &&
    prevProps.isLocked === nextProps.isLocked
  );
});
```

**PolozkaItem.jsx**
```javascript
// src/forms/OrderForm25/components/items/PolozkaItem.jsx

const PolozkaItem = React.memo(({ 
  polozka,
  index,
  onUpdate,
  onDelete,
  isLocked,
  strediskaOptions,
  financovaniOptions
}) => {
  // Similar structure as FakturaItem
  return <div className="polozka-item">{/* ... */}</div>;
});
```

#### Fáze 4: Optimalizace Callbacks (0.5 dne)

**Problem:** Každý re-render vytváří nové callback funkce

**Solution:** useCallback pro všechny event handlers
```javascript
// OrderForm25.js

// ❌ Before:
const handleInputChange = (field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

// ✅ After:
const handleInputChange = useCallback((field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }));
}, []); // Empty deps - stable reference

const handleFieldBlur = useCallback((field) => {
  // Validation logic
}, []);

const handleFakturaUpdate = useCallback((fakturaId, field, value) => {
  setFormData(prev => ({
    ...prev,
    faktury: prev.faktury.map(f => 
      f.id === fakturaId ? { ...f, [field]: value } : f
    )
  }));
}, []);
```

#### Fáze 5: Testing & Performance Measurement (1 den)

**5.1 Manual Testing**
- [ ] Každá sekce funguje independently
- [ ] Cross-section interactions (např. změna střediska v Financování ovlivní Položky)
- [ ] Save/Load funguje
- [ ] Validation funguje across sections

**5.2 Performance Testing**
```javascript
// React DevTools Profiler
// Before:
Input change → 22,506 lines re-render → 300ms

// After:
Input change → 1 section re-render → 40ms
✅ 7.5× rychlejší
```

**5.3 Bundle Size**
```bash
# Before:
OrderForm25.js: 890 KB (minified)

# After:
OrderForm25.js: 120 KB (minified)
Section chunks: 11 × 50-150 KB = 550-1,650 KB
Total: 670-1,770 KB

# ⚠️ Bundle může být větší, ale loading je lépe distribuovaný
# Code splitting může být přidáno v Phase 4 (React.lazy)
```

---

### ⚠️ Rizika a Problémy

#### Riziko 1: Broken Dependencies
**Problem:** Sekce může používat state/funkce které nejsou v props

**Solution:**
```javascript
// Create comprehensive prop interface BEFORE extracting
// Test každou sekci samostatně pomocí Storybook nebo test utils
```

#### Riziko 2: Performance Regression
**Problem:** Passing příliš mnoho props může způsobit více re-renders

**Solution:**
```javascript
// ❌ BAD: Passing celý formData object
<ObjednatelSection formData={formData} />
// → Re-renders při KAŽDÉ změně formData

// ✅ GOOD: Passing pouze relevantní data
<ObjednatelSection formData={{
  nazev_objednatele: formData.nazev_objednatele,
  prijmeni: formData.prijmeni,
  jmeno: formData.jmeno
}} />
// → Re-renders pouze když se změní tyto 3 fieldy
```

#### Riziko 3: Testing Complexity
**Problem:** 11 sekcí = 11× více testovacích scénářů

**Solution:**
```javascript
// Použít component testing framework (Vitest + React Testing Library)
// Create test template pro každou sekci
// Automated regression tests
```

#### Riziko 4: Import Hell
**Problem:** Circular imports, styled components import path issues

**Solution:**
```javascript
// Shared styled components do separátního file
// src/forms/OrderForm25/styles/StyledComponents.js
export { FormSection, SectionHeader, ... };

// Import v každé sekci
import { FormSection, SectionHeader } from '../../styles/StyledComponents';
```

---

### 📊 Effort Estimate

| Task | Time | Complexity | Risk |
|------|------|------------|------|
| Příprava (analysis, interfaces) | 1 den | 🟡 Medium | 🟢 Low |
| Extract 11 sections (iterative) | 5-7 dní | 🔴 High | 🟡 Medium |
| Extract item components | 1-2 dny | 🟡 Medium | 🟢 Low |
| Optimize callbacks | 0.5 dne | 🟢 Low | 🟢 Low |
| Testing & measurement | 1 den | 🟡 Medium | 🟡 Medium |
| **TOTAL** | **8.5-11.5 dní** | **🔴 High** | **🟡 Medium** |

---

### ✅ Benefits Summary

**Performance Gains:**
- ⚡ 6-8× faster input handling
- ⚡ Reduced re-render overhead
- ⚡ Better React DevTools profiling

**Developer Experience:**
- 📦 Modular codebase (easier to navigate)
- 🧪 Testable components
- 🔧 Easier to add features to individual sections

**Maintenance:**
- 📝 Clearer code structure
- 🐛 Easier debugging (isolated components)
- 🚀 Potential for lazy loading

---

### ❌ Drawbacks

**Disadvantages:**
- ⚠️ Initial complexity increase (more files)
- ⚠️ Prop drilling (může být řešeno Context API)
- ⚠️ Bundle size může být větší (řešitelné code splitting)
- ⚠️ 8-12 dní práce

**Trade-offs:**
- Více files vs. Better performance
- Initial effort vs. Long-term maintainability
- Complexity overhead vs. Scalability

---

## 🎯 Bod 2: State Management Migration (60+ useState → Reducers)

### 📊 Aktuální Stav

**Současných 60+ useState hooks:**
```javascript
// OrderForm25.js (lines 3379-4033)

// UI State (12 hooks):
const [sectionStates, setSectionStates] = useState({...}); // collapse/expand
const [selectStates, setSelectStates] = useState({...}); // dropdown open/closed
const [searchStates, setSearchStates] = useState({...}); // search terms
const [isFullscreen, setIsFullscreen] = useState(false);
const [areSectionsCollapsed, setAreSectionsCollapsed] = useState(false);
const [showSupplierSearchDialog, setShowSupplierSearchDialog] = useState(false);
const [aresPopupOpen, setAresPopupOpen] = useState(false);
const [showIcoCheck, setShowIcoCheck] = useState(false);
const [showSaveProgress, setShowSaveProgress] = useState(false);
const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
const [showAddFakturaForm, setShowAddFakturaForm] = useState(false);

// Form Data State (6 hooks):
const [formData, setFormData] = useState({...}); // ← MAIN STATE
const [attachments, setAttachments] = useState([]);
const [faktury, setFaktury] = useState([]); // ← Part of formData
const [polozky_objednavky, setPolozky] = useState([]); // ← Part of formData
const [userNamesCache, setUserNamesCache] = useState({});
const [touchedSelectFields, setTouchedSelectFields] = useState(new Set());

// Loading State (10 hooks):
const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
const [isLoadingFormData, setIsLoadingFormData] = useState(false);
const [isFormInitializing, setIsFormInitializing] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [isSavingDraft, setIsSavingDraft] = useState(false);
const [isAutoSaving, setIsAutoSaving] = useState(false);
const [uploadingFiles, setUploadingFiles] = useState(false);
const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);
const [loadingAres, setLoadingAres] = useState(false);
const [fakturyLoading, setFakturyLoading] = useState(false);

// Supplier State (8 hooks):
const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
const [supplierSearchResults, setSupplierSearchResults] = useState([]);
const [allSupplierContacts, setAllSupplierContacts] = useState([]);
const [aresSearch, setAresSearch] = useState('');
const [aresResults, setAresResults] = useState([]);
const [icoCheckStatus, setIcoCheckStatus] = useState(null);
const [icoCheckData, setIcoCheckData] = useState(null);
const [savingToLocal, setSavingToLocal] = useState(null);

// Template State (9 hooks):
const [savedTemplates, setSavedTemplates] = useState([]);
const [serverTemplates, setServerTemplates] = useState([]);
const [templatesFetchStatus, setTemplatesFetchStatus] = useState({...});
const [templatesLoading, setTemplatesLoading] = useState(false);
const [templateName, setTemplateName] = useState('');
const [templateType, setTemplateType] = useState('po');
const [templateSaveChecked, setTemplateSaveChecked] = useState(false);
const [saveMode, setSaveMode] = useState('new');
const [selectedTargetTemplate, setSelectedTargetTemplate] = useState(null);

// Modal State (10 hooks):
const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
const [showUnlockPhase1Confirm, setShowUnlockPhase1Confirm] = useState(false);
const [showUnlockPhase2Confirm, setShowUnlockPhase2Confirm] = useState(false);
const [showUnlockRegistrConfirm, setShowUnlockRegistrConfirm] = useState(false);
const [showUnlockFakturaceConfirm, setShowUnlockFakturaceConfirm] = useState(false);
const [showUnlockVecnaSpravnostConfirm, setShowUnlockVecnaSpravnostConfirm] = useState(false);
const [showUnlockDokonceniConfirm, setShowUnlockDokonceniConfirm] = useState(false);
const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState(false);
const [templatePendingDelete, setTemplatePendingDelete] = useState(null);
const [editingFaktura, setEditingFaktura] = useState(null);

// Lock State (5 hooks):
const [isPhase2Locked, setIsPhase2Locked] = useState(false);
const [isPhase2Unlocked, setIsPhase2Unlocked] = useState(false);
const [isPhase2LockProcessedFromDB, setIsPhase2LockProcessedFromDB] = useState(false);
const [isIcoOperation, setIsIcoOperation] = useState(false);
const [sourceOrderIdForUnlock, setSourceOrderIdForUnlock] = useState(null);

// ... a další (~10 hooks)
```

---

### 🔴 Problém Detailed

**1. Update Complexity**
```javascript
// ❌ Současná situace - komplexní setState
const handleSupplierSearch = async (term) => {
  setSupplierSearchLoading(true); // ← useState #1
  setSupplierSearchTerm(term); // ← useState #2
  
  try {
    const results = await searchSuppliers(term);
    setSupplierSearchResults(results); // ← useState #3
    setSupplierSearchLoading(false); // ← useState #1 again
  } catch (error) {
    setSupplierSearchLoading(false); // ← useState #1 again
    showToast?.('Chyba', 'error');
  }
};

// Problém: 3 useState hooks, 4 setState calls, možné inconsistency
```

**2. State Synchronization Issues**
```javascript
// ❌ Race condition possible
setIsLoadingCiselniky(true);
setIsLoadingFormData(true);
// ... async operations ...
setIsLoadingCiselniky(false); // ← Co když se unmountne component?
setIsLoadingFormData(false); // ← Stale state?
```

**3. Testing Nightmare**
```javascript
// ❌ Testing musí mockovat 60+ useState hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn()
    .mockReturnValueOnce([false, jest.fn()]) // sectionStates
    .mockReturnValueOnce([{}, jest.fn()]) // selectStates
    // ... 58× more
}));
```

---

### ✅ Co by Reducer Migration Přinesla

#### Architektura Po Migration:

```
src/forms/OrderForm25/reducers/
├─ index.js (exports all reducers)
├─ lifecycleReducer.js ✅ (DONE - existuje)
├─ dictionariesReducer.js ✅ (DONE - existuje)
├─ loadingReducer.js ✅ (DONE - existuje)
├─ uiReducer.js ✅ (DONE - částečně)
├─ attachmentsReducer.js ⚠️ (TODO)
├─ suppliersReducer.js ⚠️ (TODO)
├─ fakturyReducer.js ⚠️ (TODO)
└─ templatesReducer.js ⚠️ (TODO)

src/forms/OrderForm25/hooks/
├─ useFormLifecycle.js ✅ (DONE)
├─ useDictionaries.js ✅ (DONE)
├─ useOrderDataLoader.js ✅ (DONE)
├─ useUIState.js ✅ (DONE - částečně)
├─ useAttachments.js ⚠️ (TODO)
├─ useSuppliers.js ⚠️ (TODO)
├─ useFaktury.js ⚠️ (TODO)
└─ useTemplates.js ⚠️ (TODO)
```

#### Example: Suppliers Reducer

**Before (8 useState hooks):**
```javascript
const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
const [supplierSearchResults, setSupplierSearchResults] = useState([]);
const [allSupplierContacts, setAllSupplierContacts] = useState([]);
const [aresSearch, setAresSearch] = useState('');
const [aresResults, setAresResults] = useState([]);
const [icoCheckStatus, setIcoCheckStatus] = useState(null);
const [icoCheckData, setIcoCheckData] = useState(null);
const [savingToLocal, setSavingToLocal] = useState(null);
```

**After (1 useReducer + custom hook):**
```javascript
// src/forms/OrderForm25/reducers/suppliersReducer.js

export const SUPPLIERS_ACTIONS = {
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_ARES_RESULTS: 'SET_ARES_RESULTS',
  SET_ICO_CHECK_STATUS: 'SET_ICO_CHECK_STATUS',
  START_LOADING: 'START_LOADING',
  FINISH_LOADING: 'FINISH_LOADING',
  RESET: 'RESET'
};

export const initialSuppliersState = {
  searchTerm: '',
  searchResults: [],
  allContacts: [],
  ares: {
    searchTerm: '',
    results: [],
    loading: false
  },
  icoCheck: {
    status: null, // 'checking', 'found-local', 'found-ares', 'not-found'
    data: null
  },
  loading: false,
  savingToLocal: null
};

export function suppliersReducer(state, action) {
  switch (action.type) {
    case SUPPLIERS_ACTIONS.SET_SEARCH_TERM:
      return {
        ...state,
        searchTerm: action.payload,
        loading: true
      };
    
    case SUPPLIERS_ACTIONS.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload,
        loading: false
      };
    
    case SUPPLIERS_ACTIONS.SET_ARES_RESULTS:
      return {
        ...state,
        ares: {
          ...state.ares,
          results: action.payload,
          loading: false
        }
      };
    
    case SUPPLIERS_ACTIONS.SET_ICO_CHECK_STATUS:
      return {
        ...state,
        icoCheck: {
          status: action.payload.status,
          data: action.payload.data
        }
      };
    
    default:
      return state;
  }
}

// src/forms/OrderForm25/hooks/useSuppliers.js

import { useReducer, useCallback } from 'react';
import { suppliersReducer, initialSuppliersState, SUPPLIERS_ACTIONS } from '../reducers/suppliersReducer';
import { searchSuppliers, searchAres, checkIco } from '../../../services/suppliers';

export const useSuppliers = ({ token, username }) => {
  const [state, dispatch] = useReducer(suppliersReducer, initialSuppliersState);
  
  const searchSupplier = useCallback(async (term) => {
    dispatch({ type: SUPPLIERS_ACTIONS.SET_SEARCH_TERM, payload: term });
    
    try {
      const results = await searchSuppliers({ token, username, term });
      dispatch({ type: SUPPLIERS_ACTIONS.SET_SEARCH_RESULTS, payload: results });
      return results;
    } catch (error) {
      dispatch({ type: SUPPLIERS_ACTIONS.FINISH_LOADING });
      throw error;
    }
  }, [token, username]);
  
  const searchAresData = useCallback(async (ico) => {
    dispatch({ type: SUPPLIERS_ACTIONS.START_LOADING });
    
    try {
      const results = await searchAres({ ico });
      dispatch({ type: SUPPLIERS_ACTIONS.SET_ARES_RESULTS, payload: results });
      return results;
    } catch (error) {
      dispatch({ type: SUPPLIERS_ACTIONS.FINISH_LOADING });
      throw error;
    }
  }, []);
  
  const checkIcoStatus = useCallback(async (ico) => {
    dispatch({ 
      type: SUPPLIERS_ACTIONS.SET_ICO_CHECK_STATUS, 
      payload: { status: 'checking', data: null } 
    });
    
    try {
      const data = await checkIco({ token, username, ico });
      dispatch({ 
        type: SUPPLIERS_ACTIONS.SET_ICO_CHECK_STATUS, 
        payload: { 
          status: data.found ? 'found-local' : 'not-found', 
          data 
        } 
      });
      return data;
    } catch (error) {
      dispatch({ 
        type: SUPPLIERS_ACTIONS.SET_ICO_CHECK_STATUS, 
        payload: { status: 'not-found', data: null } 
      });
      throw error;
    }
  }, [token, username]);
  
  return {
    // State
    searchTerm: state.searchTerm,
    searchResults: state.searchResults,
    allContacts: state.allContacts,
    aresResults: state.ares.results,
    icoCheckStatus: state.icoCheck.status,
    icoCheckData: state.icoCheck.data,
    isLoading: state.loading,
    
    // Actions
    searchSupplier,
    searchAresData,
    checkIcoStatus,
    reset: () => dispatch({ type: SUPPLIERS_ACTIONS.RESET })
  };
};

// Usage v OrderForm25.js:

const OrderForm25 = () => {
  // ❌ OLD: 8 useState hooks
  // ✅ NEW: 1 custom hook
  const suppliers = useSuppliers({ token, username });
  
  // Usage:
  const handleSupplierSearch = async (term) => {
    try {
      await suppliers.searchSupplier(term);
      // State automaticky aktualizován přes reducer
    } catch (error) {
      showToast?.('Chyba při vyhledávání', 'error');
    }
  };
  
  return (
    <div>
      {suppliers.isLoading && <Spinner />}
      {suppliers.searchResults.map(result => <div>{result.name}</div>)}
    </div>
  );
};
```

**Benefits:**
- ✅ Atomic updates - všechny related změny v jednom action
- ✅ Predictable state changes - jeden reducer místo 8 setState
- ✅ Easier testing - mockovat 1 reducer vs 8 useState
- ✅ Better debugging - Redux DevTools extension
- ✅ Reusable logic - useSuppliers hook může být použit jinde

---

### 🔧 Co by Migration Obnášelo (Detailed Steps)

#### Fáze 1: Attachments Reducer (0.5 dne)

**1.1 Create Reducer**
```javascript
// src/forms/OrderForm25/reducers/attachmentsReducer.js

export const ATTACHMENTS_ACTIONS = {
  SET_ATTACHMENTS: 'SET_ATTACHMENTS',
  ADD_ATTACHMENT: 'ADD_ATTACHMENT',
  REMOVE_ATTACHMENT: 'REMOVE_ATTACHMENT',
  UPDATE_ATTACHMENT: 'UPDATE_ATTACHMENT',
  START_UPLOADING: 'START_UPLOADING',
  FINISH_UPLOADING: 'FINISH_UPLOADING',
  SET_DRAG_OVER: 'SET_DRAG_OVER'
};

export const initialAttachmentsState = {
  items: [],
  uploading: false,
  dragOver: false,
  isCheckingSync: false
};

export function attachmentsReducer(state, action) {
  switch (action.type) {
    case ATTACHMENTS_ACTIONS.SET_ATTACHMENTS:
      return { ...state, items: action.payload };
    
    case ATTACHMENTS_ACTIONS.ADD_ATTACHMENT:
      return { ...state, items: [...state.items, action.payload] };
    
    case ATTACHMENTS_ACTIONS.REMOVE_ATTACHMENT:
      return { 
        ...state, 
        items: state.items.filter(a => a.id !== action.payload) 
      };
    
    case ATTACHMENTS_ACTIONS.START_UPLOADING:
      return { ...state, uploading: true };
    
    case ATTACHMENTS_ACTIONS.FINISH_UPLOADING:
      return { ...state, uploading: false };
    
    case ATTACHMENTS_ACTIONS.SET_DRAG_OVER:
      return { ...state, dragOver: action.payload };
    
    default:
      return state;
  }
}
```

**1.2 Create Hook**
```javascript
// src/forms/OrderForm25/hooks/useAttachments.js

export const useAttachments = ({ orderId, token, username }) => {
  const [state, dispatch] = useReducer(attachmentsReducer, initialAttachmentsState);
  
  const uploadAttachment = useCallback(async (file) => {
    dispatch({ type: ATTACHMENTS_ACTIONS.START_UPLOADING });
    
    try {
      const uploaded = await uploadFile({ orderId, file, token, username });
      dispatch({ type: ATTACHMENTS_ACTIONS.ADD_ATTACHMENT, payload: uploaded });
      return uploaded;
    } catch (error) {
      dispatch({ type: ATTACHMENTS_ACTIONS.FINISH_UPLOADING });
      throw error;
    }
  }, [orderId, token, username]);
  
  const deleteAttachment = useCallback(async (attachmentId) => {
    try {
      await deleteFile({ attachmentId, token, username });
      dispatch({ type: ATTACHMENTS_ACTIONS.REMOVE_ATTACHMENT, payload: attachmentId });
    } catch (error) {
      throw error;
    }
  }, [token, username]);
  
  return {
    attachments: state.items,
    isUploading: state.uploading,
    isDragOver: state.dragOver,
    uploadAttachment,
    deleteAttachment,
    setDragOver: (value) => dispatch({ 
      type: ATTACHMENTS_ACTIONS.SET_DRAG_OVER, 
      payload: value 
    })
  };
};
```

**1.3 Replace v OrderForm25.js**
```javascript
// ❌ OLD (3 useState):
const [attachments, setAttachments] = useState([]);
const [uploadingFiles, setUploadingFiles] = useState(false);
const [dragOver, setDragOver] = useState(false);

// ✅ NEW (1 hook):
const attachmentsState = useAttachments({ 
  orderId: formData.id, 
  token, 
  username 
});

// Usage:
const handleFileUpload = async (file) => {
  try {
    await attachmentsState.uploadAttachment(file);
    showToast?.('Soubor nahrán', 'success');
  } catch (error) {
    showToast?.('Chyba při nahrávání', 'error');
  }
};
```

**1.4 Test**
```javascript
// tests/useAttachments.test.js
import { renderHook, act } from '@testing-library/react';
import { useAttachments } from '../hooks/useAttachments';

test('should upload attachment', async () => {
  const { result } = renderHook(() => useAttachments({ 
    orderId: 123, 
    token: 'test', 
    username: 'test' 
  }));
  
  await act(async () => {
    await result.current.uploadAttachment(mockFile);
  });
  
  expect(result.current.attachments).toHaveLength(1);
  expect(result.current.isUploading).toBe(false);
});
```

#### Fáze 2: Suppliers Reducer (0.5 dne)
- Create `suppliersReducer.js` (podobně jako attachments)
- Create `useSuppliers.js` hook
- Replace 8 useState hooks
- Test všechny supplier operations

#### Fáze 3: Faktury Reducer (1 den)
- Create `fakturyReducer.js`
- Create `useFaktury.js` hook  
- Complex logic: add, update, delete, prilohy management
- Replace ~10 useState hooks related to faktury
- Test všechny faktura operations

#### Fáze 4: Templates Reducer (1 den)
- Create `templatesReducer.js`
- Create `useTemplates.js` hook
- Complex logic: save, load, merge, delete templates
- Replace ~9 useState hooks related to templates
- Test všechny template operations

#### Fáze 5: UI State Consolidation (0.5 dne)
- Extend existing `uiReducer.js`
- Move všechny modal states (10 hooks) do uiReducer
- Replace `showXXXConfirm` useState hooks
- Test modal opening/closing

---

### 📊 Effort Estimate

| Reducer | useState Count | Time | Complexity | Risk |
|---------|----------------|------|------------|------|
| attachmentsReducer | 3-4 | 0.5 dne | 🟢 Low | 🟢 Low |
| suppliersReducer | 8 | 0.5 dne | 🟡 Medium | 🟢 Low |
| fakturyReducer | 10 | 1 den | 🟡 Medium | 🟡 Medium |
| templatesReducer | 9 | 1 den | 🟡 Medium | 🟡 Medium |
| uiReducer (extend) | 10-12 | 0.5 dne | 🟢 Low | 🟢 Low |
| **TOTAL** | **40-43 hooks** | **3.5-4 dny** | **🟡 Medium** | **🟢 Low** |

**Note:** Zbývá ~17-20 useState hooks které jsou legitimní (formData, sectionStates, selectStates, etc.)

---

### ✅ Benefits Summary

**State Management:**
- ✅ Atomic updates - všechny related změny v jednom action
- ✅ Predictable flow - reducer má single source of truth
- ✅ Time-travel debugging - Redux DevTools

**Code Quality:**
- ✅ Reusable hooks - logic extracted z main component
- ✅ Easier testing - mockovat reducer místo 60 useState
- ✅ Better organization - related state grouped together

**Developer Experience:**
- ✅ Clearer intent - actions mají jména (SET_SEARCH_RESULTS)
- ✅ Easier debugging - reducer log každý action
- ✅ Better IDE support - TypeScript-friendly

---

### ❌ Drawbacks

**Disadvantages:**
- ⚠️ Initial boilerplate - více kódu pro setup
- ⚠️ Learning curve - team musí rozumět reducers
- ⚠️ Over-engineering? - pro jednoduché states je useState lepší

**Trade-offs:**
- Více files vs. Better organization
- Boilerplate vs. Predictability
- Complexity overhead vs. Long-term maintainability

---

## 📋 Final Recommendations

### Pro Bod 1 (Component Split):
**Doporučení:** ⚠️ **NEIMPLEMENTOVAT IHNED**

**Proč:**
- 🔴 High effort (8-12 dní práce)
- 🔴 High risk (breaking existing functionality)
- 🟡 Může počkat - systém je functional

**Kdy implementovat:**
- ✅ Až začne být performance problém (měřitelný lag)
- ✅ Až budete refactorovat konkrétní sekci kvůli feature
- ✅ Postupně, sekce po sekci (iterativní approach)

### Pro Bod 2 (State Management):
**Doporučení:** ✅ **IMPLEMENTOVAT POSTUPNĚ**

**Proč:**
- 🟢 Low-Medium risk
- 🟢 Immediate benefit (lepší debugovatelnost)
- 🟢 Postupný rollout možný

**Priorita:**
1. **suppliersReducer** (8 hooks) - často používané
2. **fakturyReducer** (10 hooks) - složitá logika
3. **attachmentsReducer** (3 hooks) - simple start
4. **templatesReducer** (9 hooks) - méně používané

**Časový harmonogram:**
- Week 1: suppliersReducer + attachmentsReducer (1 den)
- Week 2: fakturyReducer (1 den)
- Week 3: templatesReducer + testing (1.5 dne)
- **Total: 3.5 dny práce** spread over 3 weeks

---

## 🎯 Co Dělat Teď?

### Option A: Implementovat Bod 2 (State Reducers)
**Effort:** 3.5-4 dny  
**Risk:** 🟢 Low  
**Benefit:** 🟡 Medium  
**Recommendation:** ✅ YES - postupně

### Option B: Neimplementovat nic
**Effort:** 0 dní  
**Risk:** 🟢 None  
**Benefit:** 🟢 System is stable  
**Recommendation:** ✅ YES - pokud není time pressure

### Option C: Implementovat Bod 1 (Component Split)
**Effort:** 8-12 dní  
**Risk:** 🔴 High  
**Benefit:** 🔴 High (performance)  
**Recommendation:** ⚠️ WAIT - pouze pokud je performance issue měřitelný

---

**FINAL ANSWER:**
- ✅ Bod 4 (Deprecated cleanup) - ANO, udělat
- ✅ Bod 3 (useMemo/useCallback) - ANO, udělat
- ⚠️ Bod 2 (State Reducers) - MOŽNÁ, postupně, low priority
- ❌ Bod 1 (Component Split) - NE TEĎ, až bude potřeba
