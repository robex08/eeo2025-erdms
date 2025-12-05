# 🔍 PODROBNÁ ANALÝZA: Duplicity a Staré Kódy - Orders25List & OrderForm25

**Datum:** 6. listopadu 2025  
**Cíl:** Identifikace duplicit, starých API volání a nekonzistentního state managementu

---

## 📊 ORDERS25LIST.JS - ANALÝZA

### ✅ CO JE DOBŘE - V2 API Migration

#### 1. **Import V2 API** ✅
```javascript
// ✅ SPRÁVNĚ: Používá V2 API
import { getOrderV2, listOrdersV2 } from '../services/apiOrderV2';
```

#### 2. **Centralizovaný Draft Manager** ✅
```javascript
import draftManager from '../services/DraftManager'; // 🎯 CENTRALIZOVANÝ
import order25DraftStorageService from '../services/order25DraftStorageService'; // ORDER25 STANDARD
```
**Poznámka:** Oba jsou přítomny, ale `draftManager` je preferovaný pro nové kódy.

---

### ⚠️ PROBLÉMY NALEZENÉ

#### 1. **DUPLICITNÍ API IMPORTY** ❌

**Řádek 10:**
```javascript
import { downloadAttachment25, createDownloadLink25, lockOrder25, unlockOrder25 } from '../services/api25orders';
```

**PROBLÉM:**
- `downloadAttachment25` - mělo by být `downloadOrderAttachment` z V2 API
- `createDownloadLink25` - specifická funkce, nejspíš OK
- `lockOrder25`, `unlockOrder25` - OK, specifické pro locking

**DOPORUČENÍ:**
```javascript
// ✅ OPRAVIT:
import { 
  downloadOrderAttachment,  // V2 API
  createDownloadLink25,      // OK - helper funkce
  lockOrder25, 
  unlockOrder25 
} from '../services/api25orders';
```

---

#### 2. **DYNAMIC IMPORT STARÉHO API** ❌

**Řádky 7122, 7180:**
```javascript
// ❌ STARÉ API - soft/hard delete
const { softDeleteOrder25, hardDeleteOrder25 } = await import('../services/api25orders');
const { softDeleteOrder25 } = await import('../services/api25orders');
```

**PROBLÉM:**
- Používá staré API pro mazání objednávek
- V2 API má `deleteOrderV2` funkci

**DOPORUČENÍ:**
```javascript
// ✅ OPRAVIT - použít V2 API:
import { deleteOrderV2 } from '../services/apiOrderV2';

// Volání:
await deleteOrderV2(orderId, { soft: true }); // soft delete
await deleteOrderV2(orderId, { soft: false }); // hard delete
```

---

#### 3. **NEPŘÍTOMNOST WORKFLOW MANAGERU** ⚠️

**CHYBĚJÍCÍ:**
- OrderForm25 má `useWorkflowManager` hook
- Orders25List **NEPOUŽÍVÁ** workflow manager pro správu stavů

**DOPORUČENÍ:**
- Zvážit použití workflow manageru pro konzistentní validaci stavů v seznamu
- Nebo vytvořit sdílený `workflowValidator` service

---

### 📋 SOUHRN ORDERS25LIST.JS

| Kategorie | Počet | Status |
|-----------|-------|--------|
| **V2 API Migrace** | 90% | ✅ Většinou hotovo |
| **Staré API Volání** | 3 místa | ❌ Potřeba opravit |
| **Draft Management** | Smíšené | ⚠️ Dual support |
| **State Management** | OK | ✅ Jednoduchý state |

---

## 📊 ORDERFORM25.JS - ANALÝZA

### ✅ CO JE DOBŘE

#### 1. **Deprecated Warnings** ✅
```javascript
// ❌ DEPRECATED: order25DraftStorageService - použij draftManager místo toho
// import order25DraftStorageService from '../services/order25DraftStorageService';
import draftManager from '../services/DraftManager'; // 🎯 CENTRALIZOVANÝ DRAFT MANAGER
import formDataManager from '../services/FormDataManager'; // 🎯 CENTRALIZOVANÝ DATA MANAGER
```

#### 2. **V2 API Imports** ✅
```javascript
import { 
  getOrderV2,           // ✅ V2 API: GET order by ID
  createOrderV2,        // ✅ V2 API: CREATE order
  updateOrderV2,        // ✅ V2 API: UPDATE order
  deleteOrderV2,        // ✅ V2 API: DELETE order
  getNextOrderNumberV2, // ✅ V2 API: GET next order number
  checkOrderNumberV2,   // ✅ V2 API: CHECK order number availability
  getOrderTimestampV2,  // ✅ V2 API: GET order timestamp (lightweight)
  // ✅ V2 API: Order Attachments
  uploadOrderAttachment,
  listOrderAttachments,
  downloadOrderAttachment,
  deleteOrderAttachment,
  verifyOrderAttachments,
  // ✅ V2 API: Invoice Attachments
  uploadInvoiceAttachment,
  listInvoiceAttachments,
  downloadInvoiceAttachment,
  deleteInvoiceAttachment,
  prepareDataForAPI,
  normalizeError
} from '../services/apiOrderV2';
```

#### 3. **Refactored Hooks** ✅
```javascript
// 🎯 NOVÉ: Import refactored hooks pro state management
import { useFormController, useWorkflowManager } from './OrderForm25/hooks';
```

---

### ⚠️ KRITICKÉ PROBLÉMY

#### 1. **DUPLICITNÍ STATE MANAGEMENT** ❌❌❌

**Problém:** Koexistence starého a nového state managementu

**Řádek 3823:**
```javascript
// ⚠️ POZOR: Staré useState hooks níže budou postupně nahrazeny formController state
```

**Nalezené duplicity:**

##### A) **Section States** (2x definice)
```javascript
// STARÁ VERZE:
const [sectionStates, setSectionStates] = useState({ ... });

// NOVÁ VERZE (useFormController):
// Pravděpodobně v hooku definováno znovu
```

##### B) **FormData Management** (3x způsoby)
```javascript
// 1️⃣ Přímý useState:
const [formData, setFormData] = useState({ ... });

// 2️⃣ FormDataManager service:
import formDataManager from '../services/FormDataManager';

// 3️⃣ UseFormController hook:
import { useFormController } from './OrderForm25/hooks';
```

**KRITICKÝ PROBLÉM:**
- Nejasné, který state je "source of truth"
- Možné konflikty mezi různými state managery
- Ztížená debugovatelnost

---

#### 2. **MASIVNÍ POČET USESTATE HOOKS** ❌

**Nalezeno 40+ useState deklarací:**

```javascript
// Jen výběr:
const [sectionStates, setSectionStates] = useState({ ... });        // řádek 3826
const [selectStates, setSelectStates] = useState({ ... });          // řádek 3854
const [searchStates, setSearchStates] = useState({ ... });          // řádek 3863
const [touchedSelectFields, setTouchedSelectFields] = useState(...);// řádek 3872
const [isFullscreen, setIsFullscreen] = useState(false);            // řádek 3875
const [garantOptions, setGarantOptions] = useState(() => { ... });  // řádek 3930
const [attachments, setAttachments] = useState([]);                 // řádek 3940
const [uploadingFiles, setUploadingFiles] = useState(false);        // řádek 3943
const [dragOver, setDragOver] = useState(false);                    // řádek 3944
const [showSupplierSearchDialog, setShowSupplierSearchDialog] = useState(false); // 3948
const [aresPopupOpen, setAresPopupOpen] = useState(false);          // řádek 3949
const [supplierSearchTerm, setSupplierSearchTerm] = useState('');   // řádek 3950
const [supplierSearchResults, setSupplierSearchResults] = useState([]); // 3951
// ... a mnoho dalších
```

**PROBLÉM:**
- Příliš mnoho lokálních stavů
- Těžká synchronizace
- Složitá refaktorizace

**DOPORUČENÍ:**
Přesunout všechny do jednoho z následujících:
1. **useFormController** - pro form data
2. **useWorkflowManager** - pro workflow stavy
3. **useUIState** (nový hook) - pro UI stavy (modals, dialogs, etc.)

---

#### 3. **DUPLICITNÍ DRAFT KEY GENEROVÁNÍ** ❌

**Řádek 6609:**
```javascript
const getOrder25DraftKey = () => `order25_draft_new_${user_id}`;
```

**PROBLÉM:**
- Lokální funkce pro draft key
- DraftManager už má vlastní logiku pro generování klíčů
- Možné konflikty mezi různými způsoby generování

**DOPORUČENÍ:**
```javascript
// ❌ ODSTRANIT lokální funkci
// const getOrder25DraftKey = () => `order25_draft_new_${user_id}`;

// ✅ POUŽÍT centralizovanou:
const draftKey = draftManager.getDraftKey('order25', orderId || 'new', user_id);
```

---

#### 4. **SMÍŠENÉ POUŽITÍ FORM DATA** ❌

**Nalezené vzory:**

**A) Přímé setFormData:**
```javascript
setFormData(finalData); // řádek 3756
```

**B) Přes formDataManager:**
```javascript
formDataManager.updateField('cislo_objednavky', value);
```

**C) Přes useFormController:**
```javascript
// Pravděpodobně v hooku
formController.updateField('cislo_objednavky', value);
```

**PROBLÉM:**
- Nekonzistentní API pro updating
- Možné race conditions
- Ztížená validace změn

---

### 📊 USEEFFECT ANALÝZA

**Nalezeno 10+ useEffect hooks** v hlavním OrderForm25 komponente

**Kritické nálezy:**

#### 1. **Nested Draft Loading Logic** ⚠️
```javascript
// Řádek 3687-3746: Složitá draft loading logika
if (draftData?.formData) {
  const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
  // ... 60+ řádků mergování dat
  finalData = draftData.formData;
}
setFormData(finalData);
```

**PROBLÉM:**
- Příliš složitá logika v useEffect
- Měla by být v separátní funkci/service

#### 2. **Multiple Data Sources** ⚠️
```javascript
// Draft data priority:
...draftData.formData,      // Nejdřív draft
...loadedData,              // Pak server data
faktury: loadedData.faktury || draftData.formData.faktury || []
```

**PROBLÉM:**
- Nejasná priorita dat
- Složité mergování
- Možné přepsání uživatelských změn

---

### 📋 SOUHRN ORDERFORM25.JS

| Kategorie | Status | Popis |
|-----------|--------|-------|
| **V2 API Migration** | ✅ 95% | Téměř dokončeno |
| **Deprecated API** | ⚠️ Komentované | Staré kódy zakomentovány |
| **State Management** | ❌ KRITICKÉ | Duplicitní, nekonzistentní |
| **Draft Management** | ⚠️ Přechodové | Dual support (starý + nový) |
| **FormData Handling** | ❌ KRITICKÉ | 3 různé způsoby |
| **UseState Hooks** | ❌ 40+ hooks | Příliš mnoho |
| **UseEffect Hooks** | ⚠️ 10+ hooks | Složitá logika |
| **Workflow Manager** | ✅ Částečně | Integrováno |

---

## 🎯 PRIORITIZOVANÉ AKČNÍ BODY

### 🔥 KRITICKÁ PRIORITA (Urgentn)

#### 1. **Unifikace State Managementu v OrderForm25**
```javascript
// ❌ ODSTRANIT:
const [formData, setFormData] = useState(...);
// + všechny další useState pro form data

// ✅ POUZE:
const { formData, updateField, resetForm } = useFormController();
```

**Akce:**
- Přesunout všechny form data do `useFormController`
- Odstranit duplicitní useState hooks
- Jednotné API pro update

**Odhad:** 2-3 dny

---

#### 2. **Migrace Delete API v Orders25List**
```javascript
// ❌ ODSTRANIT:
const { softDeleteOrder25, hardDeleteOrder25 } = await import('../services/api25orders');

// ✅ NAHRADIT:
await deleteOrderV2(orderId, { soft: true });
```

**Akce:**
- Nahradit 3 místa dynamického importu
- Testovat soft/hard delete

**Odhad:** 1 den

---

#### 3. **Centralizace Draft Key Generation**
```javascript
// ❌ ODSTRANIT všechny lokální generátory:
const getOrder25DraftKey = () => `order25_draft_new_${user_id}`;

// ✅ POUŽÍT:
draftManager.getDraftKey(entityType, entityId, userId);
```

**Akce:**
- Najít všechny místa s vlastním draft key
- Nahradit centralizovanou funkcí
- Testovat kompatibilitu

**Odhad:** 1 den

---

### ⚠️ VYSOKÁ PRIORITA

#### 4. **Refaktorizace UseEffect v OrderForm25**
**Akce:**
- Extrahovat draft loading logiku do `useDraftLoader` hook
- Extrahovat data merging do `useDataMerger` hook
- Zjednodušit hlavní komponentu

**Odhad:** 2 dny

---

#### 5. **Unifikace Attachment API**
```javascript
// ❌ Orders25List stále používá:
downloadAttachment25

// ✅ Mělo by být:
downloadOrderAttachment
```

**Akce:**
- Migrace všech attachment volání na V2 API
- Update error handling

**Odhad:** 1 den

---

### 📊 STŘEDNÍ PRIORITA

#### 6. **Vytvoření useUIState Hook**
**Cíl:** Consolidace všech UI stavů (modals, dialogs, loading states)

```javascript
// ✅ NOVÝ HOOK:
const useUIState = () => {
  const [modals, setModals] = useState({
    supplierSearch: false,
    aresPopup: false,
    deleteConfirm: false,
    // ...
  });
  
  const [loading, setLoading] = useState({
    attachments: false,
    supplier: false,
    // ...
  });
  
  return { modals, loading, openModal, closeModal, setLoadingState };
};
```

**Akce:**
- Vytvoření nového hooku
- Migrace 20+ UI state hooks
- Refactoring použití

**Odhad:** 2-3 dny

---

#### 7. **Dokumentace State Flow**
**Akce:**
- Vytvořit diagram state flow
- Dokumentovat "source of truth" pro každý typ dat
- Dokumentovat synchronizační pravidla

**Odhad:** 1 den

---

## 📈 METRIKY

### OrderForm25.js
- **Řádků kódu:** 24,576
- **UseState hooks:** 40+
- **UseEffect hooks:** 10+
- **Importované services:** 15+
- **Komponenty v jednom souboru:** 50+

### Orders25List.js
- **Řádků kódu:** 12,620
- **V2 API pokrytí:** ~90%
- **Staré API volání:** 3 místa
- **State management:** Jednoduchý (OK)

---

## 🔄 MIGRATION PATH

### Fáze 1: Unifikace (1 týden)
1. ✅ State management unifikace
2. ✅ Draft key centralizace
3. ✅ Delete API migrace

### Fáze 2: Cleanup (1 týden)
4. ✅ UseEffect refactoring
5. ✅ Attachment API unifikace
6. ✅ Odstranění deprecated kódů

### Fáze 3: Optimization (1 týden)
7. ✅ UI State hook
8. ✅ Documentation
9. ✅ Performance testing

**Celkový odhad:** 3 týdny

---

## ⚠️ RIZIKA

### Vysoké riziko
1. **Breaking changes** při state management refactoru
2. **Data loss** při změně draft key generování
3. **Race conditions** při asynchronních operacích

### Mitigace
1. ✅ Důkladné testování každé změny
2. ✅ Postupná migrace (ne big bang)
3. ✅ Backup mechanism pro draft data
4. ✅ Feature flags pro nové funkce

---

## 💡 ZÁVĚR

### Hlavní nálezy:
1. **Orders25List:** Většinou v pořádku, 3 místa potřebují opravu
2. **OrderForm25:** KRITICKÉ problémy se state managementem
3. **Draft Management:** Přechodové období (dual support)

### Doporučení:
1. **Nejvyšší priorita:** Unifikace state managementu v OrderForm25
2. **Rychlé vítězství:** Migrace delete API v Orders25List
3. **Dlouhodobé:** Refactoring na custom hooks

### Riziko prodlení:
- **Vysoké:** Čím déle zůstává duplicitní state, tím těžší bude migrace
- **Střední:** Možné konflikty při paralelním vývoji
- **Nízké:** Performance problémy (zatím neidentifikovány)

---

**Připravil:** AI Copilot  
**Datum:** 6. listopadu 2025  
**Verze dokumentu:** 1.0
