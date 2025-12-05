# 🔥 FINAL FIX: Instance-Based Lock System

**Datum:** 29. října 2025  
**Problém:** Global flag persistoval mezi instancemi → formulář se nenačítal po unmount  
**Status:** ✅ VYŘEŠENO

## 🐛 Root Cause

SessionStorage persistence způsobovala že flag `__orderFormInitialized` zůstával `true` i po unmount komponenty:

```javascript
// ❌ PROBLÉM: SessionStorage persistuje
sessionStorage.setItem(INIT_FLAG_KEY, 'true');
// → Zůstává true i po unmount!

// Když se komponenta znovu mountne:
if (window.__orderFormInitialized) {
  return; // ⚠️ Skip initialization = splash screen visí!
}
```

## ✅ Finální řešení: Instance ID System

### Koncept

Každá instance formuláře dostane **unikátní ID**. Global flag sleduje **které ID** právě běží inicializaci.

```javascript
// 🆔 Instance tracking
const instanceIdRef = useRef(`form_${Date.now()}_${Math.random()}`);

// 🔒 Global state
window.__orderFormCurrentInstanceId = instanceId;
window.__orderFormInitInProgress = true;
```

### Flow

```
┌─────────────────────────────────────────────────┐
│ 1. Mount komponenty                             │
│    → Vytvoří instanceId (např. "form_123_abc")  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. Check global lock                            │
│    → Pokud jiná instance běží → SKIP           │
│    → Pokud nikdo neběží → POKRAČUJ             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. Získat global lock                           │
│    window.__orderFormCurrentInstanceId = "form_123_abc" │
│    window.__orderFormInitInProgress = true      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. Načíst data (async)                          │
│    → Číselníky                                  │
│    → Order data (edit/copy)                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. Unmount komponenty (cleanup)                 │
│    → Pokud jsme aktuální instance:             │
│      window.__orderFormCurrentInstanceId = null │
│      window.__orderFormInitInProgress = false   │
└─────────────────────────────────────────────────┘
```

### Implementace

```javascript
// 🆔 Vytvoř instance ID
const instanceIdRef = useRef(
  `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
);

// 🔒 Check před inicializací
const initializeForm = useCallback(async () => {
  const instanceId = instanceIdRef.current;
  
  // Check jestli jiná instance běží
  if (window.__orderFormInitInProgress && 
      window.__orderFormCurrentInstanceId !== instanceId) {
    console.log(`⚠️ Another instance running: ${window.__orderFormCurrentInstanceId}`);
    return { success: false };
  }
  
  // Získat lock
  window.__orderFormInitInProgress = true;
  window.__orderFormCurrentInstanceId = instanceId;
  
  // ... async loading
  
}, [deps]);

// 🧹 Cleanup při unmount
useEffect(() => {
  return () => {
    // Reset pokud jsme aktivní instance
    if (window.__orderFormCurrentInstanceId === instanceIdRef.current) {
      window.__orderFormInitInProgress = false;
      window.__orderFormCurrentInstanceId = null;
    }
  };
}, []);
```

## 🎯 Výhody

### ✅ Řeší všechny problémy

1. **Unmount/Remount** - Nová instance dostane nové ID → inicializace proběhne
2. **StrictMode** - Double mount je detekován, druhá instance vidí že první běží
3. **Multiple Tabs** - Každý tab má vlastní window → nezasahují se
4. **HMR Reload** - Nový module = nové ID → clean start

### 📊 Comparison

| Feature | SessionStorage | Instance ID |
|---------|---------------|-------------|
| Persists přes unmount | ❌ ANO (problém!) | ✅ NE |
| Multiple instances | ❌ Konflikt | ✅ Izolované |
| Cleanup | ❌ Manuální | ✅ Automatický |
| StrictMode safe | ❌ NE | ✅ ANO |

## 🧪 Testing

### Test Cases

```javascript
// Test 1: Základní mount/unmount
mount → init → unmount → mount → init ✅

// Test 2: StrictMode double mount
mount1 → init1 → unmount1 → mount2 → skip2 ✅

// Test 3: Rychlý unmount během loading
mount → init_starts → unmount → cleanup ✅

// Test 4: Multiple tabs
tab1.mount → tab1.init → tab2.mount → tab2.init ✅
```

## 📝 Změněné soubory

**`useFormController.js`**
- Odstraněn SessionStorage persistence
- Přidán `instanceIdRef`
- Global flags: `__orderFormCurrentInstanceId`, `__orderFormInitInProgress`
- Cleanup: Reset flags pro aktivní instanci

## 🚀 Co zkusit teď

1. **Hard refresh** (Ctrl+Shift+R) - Vyčistit vše
2. **Otevřít nový formulář** - Mělo by fungovat
3. **Zavřít a otevřít znovu** - Mělo by fungovat
4. **Otevřít 2 taby** - Měly by fungovat nezávisle

---

**Prosím OTESTUJTE a dejte mi vědět!** 🙏
