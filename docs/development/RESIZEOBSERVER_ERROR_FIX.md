# 🐛 ResizeObserver Error Fix - Analýza a Řešení

**Datum:** 15. prosince 2025  
**Problém:** ResizeObserver loop error při mazání hierarchy profilu  
**Soubor:** `/apps/eeo-v2/client/src/pages/OrganizationHierarchy.js`

---

## 🔴 Chybová Zpráva

```
Uncaught runtime errors:
￼×
ERROR
ResizeObserver loop completed with undelivered notifications.
    at handleError (http://localhost:3000/eeo-v2/static/js/bundle.js:65705:58)
    at http://localhost:3000/eeo-v2/static/js/bundle.js:65724:7
```

---

## 🔍 Root Cause Analysis

### Kdy se error objevuje?
- ❌ Při mazání hierarchy profilu
- ❌ Konkrétně při volání `setNodes([])` a `setEdges([])` po úspěšném smazání

### Proč se to děje?

**ReactFlow + ResizeObserver interakce:**

1. `handleDeleteProfile()` úspěšně smaže profil v DB
2. Zavolá `setNodes([])` a `setEdges([])` → vyčistí canvas
3. ReactFlow detekuje změnu nodes/edges → spustí re-render
4. ReactFlow interně používá **ResizeObserver** pro sledování velikosti canvas
5. Během re-renderu dojde k vícenásobné změně velikosti DOM elementů
6. ResizeObserver nestihne doručit všechny notifikace → **loop completed error**

**Problém není kritický, ale:**
- ❌ Zahlcuje konzoli červenými errory
- ❌ Může zmást vývojáře/QA
- ❌ Vypadá to jako "něco je špatně"

### Současné řešení (částečné)

Už je implementován **global error handler** (lines 51-69):

```javascript
// Potlačit neškodnou ResizeObserver chybu (běžné u ReactFlow)
const resizeObserverErr = window.console.error;
window.console.error = (...args) => {
  const errorMsg = typeof args[0] === 'string' ? args[0] : args[0]?.message || '';
  if (errorMsg.includes('ResizeObserver loop completed') || 
      errorMsg.includes('ResizeObserver loop limit exceeded')) {
    return; // Ignorovat tuto konkrétní chybu
  }
  resizeObserverErr(...args);
};

// Potlačit ResizeObserver error i v error handleru
window.addEventListener('error', (e) => {
  if (e.message?.includes?.('ResizeObserver loop completed') ||
      e.message?.includes?.('ResizeObserver loop limit exceeded') ||
      e.message?.includes?.('undelivered notifications')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);
```

**✅ Tento handler potlačuje error v konzoli**  
**❌ Ale user stále vidí červenou chybovou hlášku v UI (React Error Boundary?)**

---

## 🛠️ Navrhovaná Řešení

### Řešení 1: Debounce State Updates (Doporučeno)

**Princip:** Oddálit `setNodes([])` a `setEdges([])` pomocí `requestAnimationFrame`

```javascript
const handleDeleteProfile = async () => {
  // ... existing code ...
  
  if (result.success) {
    setDialog({
      show: true,
      type: 'success',
      icon: '✅',
      title: 'Profil smazán',
      message: `Profil "${currentProfile.name}" byl úspěšně smazán.`,
      onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'OK',
      cancelText: null
    });

    // Obnovit seznam profilů
    await loadProfiles();
    
    // ✅ Vyčistit canvas s debounce
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNodes([]);
        setEdges([]);
      });
    });
  }
};
```

**Výhody:**
- ✅ Minimální změna kódu
- ✅ Dává ReactFlow čas na cleanup
- ✅ Eliminuje race condition s ResizeObserver

**Nevýhody:**
- ⚠️ Canvas se vyčistí s malým zpožděním (2 framy, ~32ms)

---

### Řešení 2: Conditional Rendering

**Princip:** Dočasně skrýt ReactFlow při mazání profilu

```javascript
const [isDeleting, setIsDeleting] = useState(false);

const handleDeleteProfile = async () => {
  // ... existing code ...
  
  onConfirm: async () => {
    setIsDeleting(true); // ✅ Skryj ReactFlow
    
    try {
      const response = await fetch(`${apiBase}/hierarchy/profiles/delete`, { /* ... */ });
      const result = await response.json();
      
      if (result.success) {
        await loadProfiles();
        
        // Canvas se sám vyčistí při re-render
        setTimeout(() => setIsDeleting(false), 100);
      }
    } catch (err) {
      setIsDeleting(false);
      // ... error handling
    }
  }
};

// V JSX:
{!isDeleting && (
  <ReactFlow
    nodes={nodes}
    edges={edges}
    // ...
  />
)}
```

**Výhody:**
- ✅ Úplně eliminuje problém (ReactFlow není mounted během delete)
- ✅ Clean unmount bez state updates

**Nevýhody:**
- ❌ Složitější implementace
- ❌ Canvas "blikne" (zmizí a znovu se objeví)

---

### Řešení 3: React Error Boundary (UI fix)

**Princip:** Zachytit error na úrovni React komponenty

```javascript
// ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Ignorovat ResizeObserver errors
    if (error.message?.includes('ResizeObserver')) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (!error.message?.includes('ResizeObserver')) {
      console.error('Uncaught error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

// V OrganizationHierarchy.js:
export default function OrganizationHierarchy() {
  return (
    <ErrorBoundary>
      {/* ... existing JSX ... */}
    </ErrorBoundary>
  );
}
```

**Výhody:**
- ✅ Zachytí error před zobrazením uživateli
- ✅ Aplikace pokračuje normálně

**Nevýhody:**
- ❌ Error stále existuje, jen je skrytý
- ❌ Řeší symptom, ne příčinu

---

### Řešení 4: Optimalizace loadProfiles()

**Princip:** `loadProfiles()` pravděpodobně triggeruje re-render, který koliduje s `setNodes/setEdges`

```javascript
const handleDeleteProfile = async () => {
  // ... existing code ...
  
  if (result.success) {
    // ✅ Vyčistit canvas PŘED loadProfiles()
    setNodes([]);
    setEdges([]);
    
    // Počkat na React reconciliation
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Teprve pak načíst profily
    await loadProfiles();
    
    setDialog({ /* success dialog */ });
  }
};
```

**Výhody:**
- ✅ Sekvenční operace, méně race conditions
- ✅ Žádné speciální React wrappery

**Nevýhody:**
- ⚠️ Umělé zpoždění (50ms)
- ⚠️ Může být nedostatečné na pomalých zařízeních

---

## 📊 Porovnání Řešení

| Řešení                    | Složitost | Efektivita | Side Effects | Doporučení |
|---------------------------|-----------|------------|--------------|------------|
| 1. Debounce rAF           | ⭐️        | ⭐️⭐️⭐️    | Minimální    | ✅ **ANO** |
| 2. Conditional Rendering  | ⭐️⭐️⭐️   | ⭐️⭐️⭐️⭐️  | Blikání UI   | ⚠️ Možné   |
| 3. Error Boundary         | ⭐️⭐️      | ⭐️⭐️       | Skrývá error | ❌ Ne      |
| 4. loadProfiles delay     | ⭐️        | ⭐️⭐️       | Zpoždění     | ⚠️ Možné   |
| 5. Global handler (current)| ⭐️       | ⭐️⭐️       | Partial fix  | ✅ Keep    |

---

## ✅ Doporučené Řešení: Kombinace 1 + 5

**Ponechat současný global handler** (lines 51-69) + **přidat debounce do handleDeleteProfile**

### Implementace:

```javascript
const handleDeleteProfile = async () => {
  if (!currentProfile || profiles.length <= 1) {
    return;
  }

  const relationshipsText = currentProfile.relationshipsCount > 0 
    ? `\n\n⚠️ Profil obsahuje ${currentProfile.relationshipsCount} vztahů, které budou také smazány!`
    : '';

  setDialog({
    show: true,
    type: 'confirm',
    icon: '🗑️',
    title: 'Smazat profil?',
    message: `Opravdu chcete smazat profil "${currentProfile.name}"?${relationshipsText}\n\nTato akce je nevratná!`,
    onConfirm: async () => {
      try {
        const token = await loadAuthData.token();
        const userData = await loadAuthData.user();
        const username = userData?.username || localStorage.getItem('username');
        const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

        const response = await fetch(`${apiBase}/hierarchy/profiles/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            username, 
            profile_id: currentProfile.id 
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setDialog({
            show: true,
            type: 'success',
            icon: '✅',
            title: 'Profil smazán',
            message: `Profil "${currentProfile.name}" byl úspěšně smazán.`,
            onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
            confirmText: 'OK',
            cancelText: null
          });

          // Obnovit seznam profilů
          await loadProfiles();
          
          // ✅ NOVÉ: Vyčistit canvas s debounce (eliminuje ResizeObserver race condition)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setNodes([]);
              setEdges([]);
            });
          });
        } else {
          throw new Error(result.error || 'Chyba při mazání profilu');
        }
      } catch (err) {
        console.error('Delete profile error:', err);
        setDialog({
          show: true,
          type: 'alert',
          icon: '❌',
          title: 'Chyba při mazání',
          message: err.message,
          onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
          confirmText: 'OK',
          cancelText: null
        });
      }
    },
    onCancel: () => setDialog(prev => ({ ...prev, show: false })),
    confirmText: 'Smazat',
    cancelText: 'Zrušit'
  });
};
```

### Změny:
1. ✅ Ponechat `await loadProfiles()` na původním místě
2. ✅ Přesunout `setNodes([])` a `setEdges([])` do double `requestAnimationFrame`
3. ✅ Global error handler zůstává (backup)

---

## 🧪 Testovací Plán

### Test Case 1: Delete Profile (Happy Path)
```
GIVEN: Máme 3 profily s vizualizovanou hierarchií
WHEN: Kliknu na "Smazat profil" a potvrdím
THEN:
  - ✅ Profil se smaže v DB
  - ✅ Canvas se vyčistí (nodes=[], edges=[])
  - ✅ Žádný ResizeObserver error v konzoli
  - ✅ Žádná červená chybová hláška v UI
  - ✅ Vybere se první dostupný profil ze seznamu
```

### Test Case 2: Delete Profile s Relationships
```
GIVEN: Profil obsahuje 10 vztahů
WHEN: Smažu profil
THEN:
  - ✅ Zobrazí se warning s počtem vztahů
  - ✅ Po potvrzení se smaže profil i všechny vztahy
  - ✅ Žádný error
```

### Test Case 3: Delete Last Profile
```
GIVEN: Máme poslední profil
WHEN: Kliknu na "Smazat profil"
THEN:
  - ❌ Tlačítko je disabled
  - ℹ️ Tooltip: "Nelze smazat poslední profil"
```

### Test Case 4: Delete Profile Error
```
GIVEN: Mazání profilu selže na backendu
WHEN: API vrátí error
THEN:
  - ❌ Zobrazí se error dialog
  - ✅ Canvas zůstane beze změny
  - ✅ Seznam profilů zůstane stejný
```

---

## 📝 Alternativní Nápady (Pro Budoucnost)

### 1. Použít ReactFlow Built-in API
ReactFlow má metodu `fitView()` a `project()`, možná i nějaké cleanup metody.

**Research:**
```javascript
// ReactFlowInstance má tyto metody:
const reactFlowInstance = useReactFlow();

reactFlowInstance.fitView();
reactFlowInstance.setNodes([]);
reactFlowInstance.setEdges([]);
```

**TODO:** Zjistit, zda `reactFlowInstance.setNodes([])` řeší problém lépe než `setNodes([])`

---

### 2. Custom ResizeObserver Wrapper
Vytvořit vlastní wrapper, který debounce ResizeObserver callbacky.

```javascript
// Custom hook
const useDebouncedResizeObserver = (callback, delay = 100) => {
  const timeoutRef = useRef(null);
  
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (timeoutRef.current) {
        cancelAnimationFrame(timeoutRef.current);
      }
      
      timeoutRef.current = requestAnimationFrame(() => {
        callback(entries);
      });
    });
    
    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        cancelAnimationFrame(timeoutRef.current);
      }
    };
  }, [callback]);
};
```

**Problém:** ReactFlow používá interní ResizeObserver, takže tento hook by neměl efekt.

---

### 3. Upgrade ReactFlow
Zkontrolovat, zda novější verze ReactFlow má tento problém opravený.

**Současná verze:** (zjistit z package.json)  
**Latest verze:** 11.x nebo 12.x?

**TODO:** Zkontrolovat changelogy ReactFlow pro ResizeObserver fixes

---

## 🏁 Závěr

### Immediate Fix (nyní)
✅ Implementovat **Řešení 1** - double `requestAnimationFrame` debounce v `handleDeleteProfile`

### Long-term (příští sprint)
- 🔍 Research ReactFlow API pro čistší cleanup
- 📦 Zvážit upgrade ReactFlow na latest verzi
- 🧪 Přidat unit testy pro delete profile flow

### Status
- ❌ **Před fixem:** ResizeObserver error viditelný v konzoli i UI
- ✅ **Po fixu:** Error suppressed global handlerem, debounce eliminuje race condition
- ✅ **Výsledek:** Žádné chybové hlášky, smooth UX

---

**Připraveno k implementaci! 🚀**
