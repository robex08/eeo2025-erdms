# 🔬 HLOUBKOVÁ ANALÝZA: Navigace na OrderForm25

## 📊 Executive Summary

**Problém:** URL parametr `?edit=123` se ztrácí při určitých operacích, což způsobuje konflikt mezi useFormController (myslí si že je NEW order) a formData (obsahuje data existující objednávky).

**Root Cause:** `window.history.pushState(null, '', window.location.pathname)` na řádku 11542 v OrderForm25.js **ODSTRAŇUJE** query parametry z URL.

**Dopad:** 
- ❌ Po F5 refresh se načte formulář bez editOrderId
- ❌ useFormController se chová jako NEW order
- ❌ Draft se načte z localStorage (obsahuje data jiné objednávky)
- ❌ Nesoulad mezi stavem aplikace

---

## 🗺️ Mapa všech navigačních bodů

### **1. Orders25List.js** (Hlavní seznam objednávek)

#### 📍 Místo volání: `handleEdit()` - řádek 8073

```javascript
const handleEdit = async (order) => {
  // ... kontrola zamčení, draftu ...
  
  navigate(`/order-form-25?edit=${order.id}`); // ✅ SPRÁVNĚ
};
```

**Vlastnosti:**
- ✅ **KOMPLETNÍ draft management** (kontrola ownership)
- ✅ **Lock checking** (kontrola zda není zamčená jiným uživatelem)
- ✅ **Confirm dialog** (pokud existuje draft jiné objednávky)
- ✅ **URL parametr `?edit=` VŽDY přítomen**

**Flow:**
```
1. Kliknutí na "Editovat" v seznamu
2. getOrderV2() - kontrola lock_info
3. DraftManager.hasDraft() - kontrola existence draftu
4. Pokud draft existuje → DraftManager.loadDraft()
5. Porovnání draftOrderId vs currentOrderId
6. Rozhodnutí: Dialog nebo přímá navigace
7. navigate('/order-form-25?edit=123')
```

---

### **2. NotificationsPanel.js** (Plovoucí notifikační panel - REACT PORTAL)

#### 📍 Místo volání: `handleOrderClick()` - řádek 39

```javascript
const handleOrderClick = async (orderId) => {
  // ... kontrola draftu ...
  
  navigate(`/order-form-25?edit=${targetOrderId}`); // ✅ SPRÁVNĚ
};
```

**Vlastnosti:**
- ✅ **React Portal** - renderuje se do `document.body`, MIMO Layout DOM strukturu
- ✅ **KOMPLETNÍ draft management** (stejný pattern jako Orders25List)
- ✅ **useNavigate hook** - standardní React Router navigate
- ⚠️ **Problém:** Panel se renderuje mimo Layout, ale `useNavigate` FUNGUJE správně (je v RouterContext)

**React Portal Analýza:**
```javascript
// NotificationsPanel.js - řádek 301
return createPortal(bubble, document.body);
```

**Důležité zjištění:**
- ✅ React Portal **NEOVLIVŇUJE** React Router
- ✅ `useNavigate` hook **FUNGUJE** i v Portalu
- ✅ Navigace se provádí **STEJNĚ** jako z normální komponenty
- ✅ URL parametry se **PŘEDÁVAJÍ SPRÁVNĚ**

**Důkaz:**
```javascript
// NotificationsPanel.js používá useNavigate z react-router-dom
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
// ... později:
navigate(`/order-form-25?edit=${targetOrderId}`); // ← Funguje perfektně!
```

---

### **3. Layout.js** (Alarm dropdown v headeru)

#### 📍 Místo volání: `handleNotificationClick()` - řádek 1026

```javascript
const handleNotificationClick = async (notification) => {
  // ... kontrola draftu ...
  
  navigate(`/order-form-25?edit=${data.order_id}`); // ✅ SPRÁVNĚ
};
```

**Vlastnosti:**
- ✅ **Kompletní draft management**
- ✅ **Confirm dialog**
- ✅ **URL parametr přítomen**

---

### **4. EntityDetailViews.js** (SlideInDetailPanel - REACT PORTAL)

#### 📍 Místo volání: `handleOrderClick()` - řádek 434

```javascript
const handleOrderClick = async () => {
  // ... kontrola draftu ...
  
  navigate(`/order-form-25?edit=${targetOrderId}`); // ✅ SPRÁVNĚ
};
```

**Vlastnosti:**
- ✅ **React Portal** (SlideInDetailPanel renderuje přes Portal)
- ✅ **Draft management**
- ✅ **Custom confirm dialog** (ne window.confirm, ale React state)
- ✅ **URL parametr přítomen**

**Speciální poznámka:**
```javascript
// EntityDetailViews.js - používá custom confirm dialog
const [showConfirmDialog, setShowConfirmDialog] = useState(false);

if (shouldShowConfirmDialog && draftDataToStore) {
  setShowConfirmDialog(true); // ← React state, NE window.confirm!
  return;
}
```

---

## 🐛 Bug Analysis: Ztráta URL parametru

### **Root Cause: OrderForm25.js řádek 11542**

```javascript
// OrderForm25.js - useEffect pro beforeunload/popstate handling
useEffect(() => {
  const handlePopState = (e) => {
    // ... kontrola neuložených příloh ...
    
    showToast && showToast(/* ... */, {
      action: {
        onCancel: () => {
          // ❌ BUG: Odstraní query parametry!
          window.history.pushState(null, '', window.location.pathname);
          // /order-form-25?edit=123 → /order-form-25
        }
      }
    });
  };
  
  window.addEventListener('popstate', handlePopState);
  // ...
}, [attachments, formData, user_id, isOrderSavedToDB, savedOrderId]);
```

### **Jak k tomu dochází:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. URL: /order-form-25?edit=123                                │
│    ✅ editOrderId = "123"                                       │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Uživatel klikne na browser back button (←)                  │
│    → Spustí se 'popstate' event                                │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. handlePopState detekuje neuložené přílohy                   │
│    → Zobrazí toast: "Opravdu chcete opustit?"                  │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Uživatel klikne "Zůstat"                                    │
│    → Spustí se onCancel callback                               │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. onCancel: window.history.pushState(...)                     │
│    → window.location.pathname = "/order-form-25"               │
│    ❌ Query parametry ZTRACENY!                                │
│    URL: /order-form-25?edit=123 → /order-form-25               │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Uživatel zmáčkne F5 (refresh)                               │
│    → Browser načte: /order-form-25 (bez parametru!)            │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. OrderForm25 se mountne                                       │
│    editOrderId = urlParams.get('edit') → null                  │
│    ❌ useFormController: "NEW order"                           │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. handleDataLoaded načte draft z localStorage                 │
│    ✅ formData obsahuje objednávku #123                        │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. KONFLIKT!                                                    │
│    - useFormController: "NEW order mode"                       │
│    - formData: obsahuje objednávku #123                        │
│    - URL: /order-form-25 (bez parametru)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Řešení: Zachování query parametrů

### **PŘED opravou:**
```javascript
onCancel: () => {
  window.history.pushState(null, '', window.location.pathname);
  // Odstraní vše za '?' včetně
}
```

### **PO opravě:**
```javascript
onCancel: () => {
  // 🔧 FIX: Zachovat query parametry (např. ?edit=123)
  const fullUrl = window.location.pathname + window.location.search;
  window.history.pushState(null, '', fullUrl);
  // Zachová parametry: /order-form-25?edit=123
}
```

---

## 🎯 Závěry a doporučení

### **✅ Co FUNGUJE správně:**

1. **Všechny navigační body správně předávají parametr `?edit=`**
   - Orders25List ✅
   - NotificationsPanel ✅
   - Layout.js ✅
   - EntityDetailViews ✅

2. **React Portal NEOVLIVŇUJE navigaci**
   - NotificationsPanel (Portal) ✅
   - SlideInDetailPanel (Portal) ✅
   - useNavigate funguje i v Portalu ✅

3. **Draft management je konzistentní**
   - Všechny komponenty používají stejný pattern ✅
   - DraftManager je centralizovaný ✅
   - Ownership checking funguje ✅

### **❌ Co NEFUNGOVALO (nyní opraveno):**

1. **window.history.pushState odstraňoval parametry**
   - OrderForm25.js řádek 11542 ✅ OPRAVENO

### **🔧 Další možná vylepšení:**

#### **1. Automatická oprava URL při detekci nesouladu**

```javascript
// OrderForm25.js - v handleDataLoaded
const handleDataLoaded = useCallback(async (loadedData, sourceOrderId) => {
  // Detekce nesouladu: editOrderId je null, ALE draft obsahuje savedOrderId
  if (!editOrderId && loadedData && !loadedData.id) {
    // Zkus načíst draft
    if (user_id) {
      draftManager.setCurrentUser(user_id);
      const hasDraft = await draftManager.hasDraft();
      
      if (hasDraft) {
        const draftData = await draftManager.loadDraft();
        const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
        
        if (draftOrderId) {
          // 🔧 AUTOMATICKÁ OPRAVA: Přidej parametr do URL
          console.warn('⚠️ Detekován nesoulad: URL bez parametru, ale draft obsahuje orderId');
          console.log('🔧 Automaticky opravuji URL...');
          
          const newUrl = `/order-form-25?edit=${draftOrderId}`;
          window.history.replaceState(null, '', newUrl);
          
          // Trigger re-render s novým editOrderId
          // (React Router ho detekuje automaticky)
          return;
        }
      }
    }
  }
  
  // ... zbytek kódu ...
}, [editOrderId, user_id]);
```

#### **2. Validace URL při každém mount**

```javascript
// OrderForm25.js - useEffect
useEffect(() => {
  // Pokud je formData.id nastaveno, ALE editOrderId je null → oprav URL
  if (formData.id && !editOrderId) {
    console.warn('⚠️ Detekován nesoulad: formData má ID, ale URL nemá parametr');
    console.log('🔧 Synchronizuji URL s formData...');
    
    const newUrl = `/order-form-25?edit=${formData.id}`;
    window.history.replaceState(null, '', newUrl);
  }
}, [formData.id, editOrderId]);
```

#### **3. Debug warning v konzoli**

```javascript
// OrderForm25.js - v useFormController callback
if (process.env.NODE_ENV === 'development') {
  if (!editOrderId && formData.id) {
    console.group('⚠️ DETEKOVÁN NESOULAD URL ↔ formData');
    console.warn('editOrderId:', editOrderId, '(z URL)');
    console.warn('formData.id:', formData.id, '(ze state)');
    console.warn('location.search:', location.search);
    console.warn('Možná příčina: URL parametr byl odstraněn (např. history.pushState)');
    console.groupEnd();
  }
}
```

---

## 📚 Technické detaily: React Portal & React Router

### **Jak funguje React Portal?**

```javascript
// NotificationsPanel.js
import { createPortal } from 'react-dom';

export const NotificationsPanel = (props) => {
  const bubble = (
    <Bubble>{/* ... obsah ... */}</Bubble>
  );
  
  // ✅ Portal renderuje do document.body (MIMO Layout DOM)
  return createPortal(bubble, document.body);
};
```

**DOM struktura:**
```html
<div id="root">
  <Layout>
    <Routes>
      <Route path="/orders25-list" element={<Orders25List />} />
    </Routes>
  </Layout>
</div>

<!-- ✅ Portal se renderuje PŘÍMO do body, MIMO #root -->
<div class="Bubble">  ← NotificationsPanel
  <button onClick={() => navigate('/order-form-25?edit=123')}>
</div>
```

### **Proč useNavigate FUNGUJE v Portalu?**

```javascript
// React Router Context tree:
<BrowserRouter>  ← Vytvoří RouterContext
  <Routes>
    <Route />
  </Routes>
  
  {/* ✅ Portal je STÁLE POTOMKEM BrowserRouter v React tree! */}
  {createPortal(<NotificationsPanel />, document.body)}
</BrowserRouter>
```

**Důležité:**
- ✅ **React tree** (virtuální) != **DOM tree** (skutečný HTML)
- ✅ Portal mění **DOM pozici**, ALE **zachovává React Context**
- ✅ useNavigate čte z **RouterContext** (React tree), NE z DOM!
- ✅ Proto navigate() funguje i v Portalu ✅

### **Test: Ověření funkčnosti**

```javascript
// Test v NotificationsPanel.js
const navigate = useNavigate();

// ✅ navigate je funkce (ne undefined)
console.log('navigate:', typeof navigate); // "function"

// ✅ Volání funguje bez chyby
navigate('/order-form-25?edit=123'); // Funguje! ✅
```

---

## 🎓 Výukové závěry (Junior → Senior)

### **Junior myšlení:**
> "Portal renderuje do document.body, takže asi nemá přístup k React Router."

### **Senior vysvětlení:**
> "Portal mění **DOM pozici** komponenty, ale **zachovává React Context tree**. 
> useNavigate čte z RouterContext, který je součástí React tree, ne DOM tree.
> Proto navigate() funguje perfektně i v Portalu."

### **Praktický důkaz:**
```javascript
// Toto FUNGUJE:
<BrowserRouter>
  {createPortal(
    <button onClick={() => navigate('/path')}>Click</button>,
    document.body
  )}
</BrowserRouter>

// Protože React tree vypadá takto:
BrowserRouter (poskytuje RouterContext)
  └─ Portal (má přístup k RouterContext!)
      └─ button
```

---

## 🔍 Kontrolní seznam pro debugging navigace

Když se něco pokazí s navigací, zkontroluj:

### **1. Konzole logy:**
```
✅ Hledej: "🔗 Navigate URL: /order-form-25?edit=123"
✅ Zkontroluj: Je v URL parametr ?edit= přítomen?
```

### **2. Browser Network tab:**
```
✅ Otevři: DevTools → Network
✅ Klikni: Na odkaz objednávky
✅ Zkontroluj: Žádný HTTP request by se NEMĚL objevit (SPA!)
```

### **3. React DevTools:**
```
✅ Otevři: React DevTools → Components
✅ Najdi: OrderForm25 komponent
✅ Zkontroluj: Props → editOrderId (mělo by být "123", NE null)
```

### **4. URL bar:**
```
✅ Zkontroluj: /order-form-25?edit=123 (parametr MUSÍ být přítomen)
❌ Špatně: /order-form-25 (parametr chybí)
```

### **5. localStorage:**
```javascript
// Konzole:
localStorage.getItem('order25_draft_new_<user_id>')

// ✅ Pokud je null → žádný draft
// ✅ Pokud je objekt → draft existuje, zkontroluj savedOrderId
```

---

**Poslední aktualizace:** 28. listopadu 2025  
**Verze:** 2.0.0 (Hloubková analýza)  
**Autor:** Senior + Junior kolaborace 🚀
