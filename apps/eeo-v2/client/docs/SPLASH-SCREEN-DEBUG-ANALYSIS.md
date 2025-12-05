# 🐛 Splash Screen Hanging - Root Cause Analysis

**Datum:** 29. října 2025  
**Problém:** Formulář se zasekává na splash screenu při načítání (nová i existující objednávka)  
**Status:** 🔍 ANALÝZA DOKONČENA

---

## 🎯 Root Cause

Formulář se zasekává na splash screenu protože **`lifecycle.isReady` nikdy nepřejde na `true`**.

### Flow problémy:

```javascript
// OrderForm25.js řádek 13925
if (!lifecycle.isReady) {
  return <LoadingOverlay>...</LoadingOverlay>;
}
```

### Proč `lifecycle.isReady` zůstává `false`?

#### 1. **useFormController - initializeForm() se volá duplicitně**

```javascript
// useFormController.js - řádek 229
useEffect(() => {
  if (token && username) {
    console.log('🎬 Starting auto-initialization');
    hasInitializedRef.current = true; // ✅ Označit že inicializace začala
    initializeForm();
  }
}, [token, username]); // ⚠️ CHYBÍ initializeForm v dependencies!
```

**Problém:** 
- `initializeForm` se mění při každém renderu (protože má dependencies)
- React ESLint varuje že chybí `initializeForm` v deps
- Bez něj v deps se může volat stará verze `initializeForm`

#### 2. **initializeForm() má nestabilní dependencies**

```javascript
// useFormController.js - řádek 58
const initializeForm = useCallback(async () => {
  // ...
}, [
  editOrderId,
  copyOrderId,
  archivovanoParam,
  userId,
  lifecycle,      // ⚠️ Objekt se mění každý render!
  dictionaries,   // ⚠️ Objekt se mění každý render!
  orderDataLoader,// ⚠️ Objekt se mění každý render!
  onDataLoaded,
  onError,
  onReady
]);
```

**Problém:**
- `lifecycle`, `dictionaries`, `orderDataLoader` jsou objekty z `useFormLifecycle()`, `useDictionaries()`, `useOrderDataLoader()`
- Tyto objekty se vytvářejí nově při každém renderu
- Způsobuje to že `initializeForm` callback je nestabilní

#### 3. **Race Condition - duplicitní volání**

```
┌─────────────────────────────────────────┐
│ 1. Mount komponenty                     │
│    → useFormController.initializeForm() │
│    → lifecycle.startDictionariesLoad()  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 2. State update (lifecycle změna)       │
│    → Re-render komponenty               │
│    → initializeForm callback se změní!  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 3. useEffect vidí nový token/username   │
│    → Volá initializeForm() ZNOVU!      │
│    → Druhá inicializace běží            │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 4. První inicializace skončí            │
│    → lifecycle.setReady() - OK          │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 5. Druhá inicializace běží pořád        │
│    → Volá lifecycle.reset() nebo error  │
│    → isReady = false ZNOVU!             │
└─────────────────────────────────────────┘
```

#### 4. **Locks nefungují správně**

```javascript
// useFormController.js - řádek 66
if (initLockRef.current) {
  console.log('⚠️ Init already in progress (ref lock)');
  return { success: false, reason: 'already_running' };
}

// ... loading ...

// ❌ PROBLÉM: Lock se nikdy neresetuje při úspěchu!
// Lock se resetuje JEN při chybě (řádek 161)
```

**Chybí:**
```javascript
// Na konci try bloku by mělo být:
initLockRef.current = false;
window.__orderFormInitInProgress = false;
```

---

## 🔧 Navržená řešení

### ✅ Řešení 1: Stabilizovat dependencies (DOPORUČENO)

**Opravit lifecycle, dictionaries, orderDataLoader aby byly stabilní objekty**

```javascript
// useFormLifecycle.js - PŘIDAT MEMOIZATION
export const useFormLifecycle = () => {
  const [state, dispatch] = useReducer(lifecycleReducer, initialLifecycleState);
  
  // ... actions ...
  
  // ✅ MEMOIZOVAT vrácený objekt
  return useMemo(() => ({
    phase: state.phase,
    isInitializing: state.isInitializing,
    isLoadingDictionaries: state.isLoadingDictionaries,
    isLoadingFormData: state.isLoadingFormData,
    isReady: state.isReady,
    error: state.error,
    phaseHistory: state.phaseHistory,
    
    // Actions - už jsou v useCallback, takže stabilní
    startDictionariesLoad,
    dictionariesLoaded,
    startDataLoad,
    dataLoaded,
    setReady,
    setError,
    reset,
    
    // Helpers
    isInPhase: (phase) => state.phase === phase,
    canLoadData: () => state.phase === LIFECYCLE_PHASES.READY_FOR_DATA
  }), [state, startDictionariesLoad, dictionariesLoaded, ...]);
};
```

**POZOR:** Toto je ČÁSTEČNÉ řešení - objekt je stabilní, ALE:
- `state` se mění → `useMemo` se přepočítá → vrací NOVÝ objekt
- Stále nestabilní!

**LEPŠÍ řešení:** Nevracet objekt, ale jednotlivé hodnoty + useCallback

---

### ✅ Řešení 2: Zjednodušit dependencies v initializeForm

**Nepoužívat celé objekty - jen funkcemi co potřebujeme**

```javascript
// useFormController.js
const initializeForm = useCallback(async () => {
  // ...
}, [
  editOrderId,
  copyOrderId,
  archivovanoParam,
  userId,
  // ❌ NE: lifecycle, dictionaries, orderDataLoader
  // ✅ ANO: Jen specifické funkce
  lifecycle.startDictionariesLoad,
  lifecycle.dictionariesLoaded,
  lifecycle.startDataLoad,
  lifecycle.dataLoaded,
  lifecycle.setReady,
  lifecycle.setError,
  dictionaries.loadAll,
  orderDataLoader.loadOrderForEdit,
  orderDataLoader.loadOrderForCopy,
  onDataLoaded,
  onError,
  onReady
]);
```

**PROBLÉM:** Hodně dependencies, pořád nestabilní pokud jsou funkce nestabilní

---

### ✅ Řešení 3: Odstranit initializeForm z useEffect deps (QUICK FIX) 🏆

**Nejrychlejší řešení - použít ref pro tracking**

```javascript
// useFormController.js
useEffect(() => {
  const instanceId = instanceIdRef.current;
  
  // Skip pokud už proběhla inicializace
  if (hasInitializedRef.current) {
    console.log('⏭️ Skipping - already initialized');
    return;
  }

  if (token && username) {
    console.log('🎬 Starting auto-initialization');
    hasInitializedRef.current = true;
    initializeForm(); // ✅ Stabilní nebo ne, zavolá se JEN JEDNOU
  }
}, [token, username]); // ✅ POUZE stabilní deps
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**Výhody:**
- ✅ Jednoduché
- ✅ Rychlé
- ✅ Funguje okamžitě
- ✅ `initializeForm` se zavolá JEN JEDNOU

**Nevýhody:**
- ⚠️ ESLint warning (ale je to OK - záměrné)

---

### ✅ Řešení 4: Opravit lock release

**Uvolnit lock po ÚSPĚŠNÉM dokončení**

```javascript
// useFormController.js - řádek 143
console.log(`✅ [useFormController ${instanceId}] Initialization complete`);

// ✅ PŘIDAT: Uvolnit lock po úspěchu
initLockRef.current = false;
window.__orderFormInitInProgress = false;
// Ale PONECHAT instanceId pro tracking

return {
  success: true,
  data: loadedData,
  sourceOrderId
};
```

---

### ✅ Řešení 5: Debugging - přidat console.log

**Zjistit PŘESNĚ co se děje**

```javascript
// useFormLifecycle.js - PŘIDAT DO KAŽDÉ AKCE
const setReady = useCallback(() => {
  console.log('🎉 [Lifecycle] Phase: READY');
  console.trace('📍 setReady called from:'); // ✅ Stack trace!
  dispatch({ type: LIFECYCLE_ACTIONS.READY });
}, []);
```

```javascript
// OrderForm25.js - řádek 13925
console.log('🔍 [OrderForm25] Checking lifecycle.isReady:', lifecycle.isReady);
console.log('🔍 [OrderForm25] Lifecycle phase:', lifecycle.phase);

if (!lifecycle.isReady) {
  return (
    <LoadingOverlay>
      <LoadingMessage>
        Phase: {lifecycle.phase} {/* ✅ Zobrazit v UI */}
      </LoadingMessage>
    </LoadingOverlay>
  );
}
```

---

## 🚀 Implementační plán

### Fáze 1: Quick Fix (5 minut) 🏆

1. ✅ Opravit `useFormController` useEffect - odstranit `initializeForm` z deps
2. ✅ Opravit lock release v `initializeForm` - uvolnit po úspěchu
3. ✅ Přidat debugging console.log do `useFormLifecycle.setReady()`

### Fáze 2: Testování (10 minut)

1. ✅ Otestovat novou objednávku
2. ✅ Otestovat editaci objednávky
3. ✅ Otestovat copy objednávky
4. ✅ Zkontrolovat konzoli - žádné duplicitní volání
5. ✅ Ověřit že splash screen zmizí správně

### Fáze 3: Dlouhodobé řešení (1-2 hodiny) - VOLITELNÉ

1. Refaktorovat `useFormLifecycle` na stabilní API
2. Refaktorovat `useDictionaries` na stabilní API
3. Refaktorovat `useOrderDataLoader` na stabilní API
4. Odstranit všechny object dependencies z `initializeForm`

---

## 📋 Checklist

### Okamžité opravy (TEĎ):

- [ ] Opravit `useFormController.js` - useEffect dependencies
- [ ] Opravit `useFormController.js` - lock release
- [ ] Přidat debugging log do `useFormLifecycle.js`
- [ ] Přidat debugging log do `OrderForm25.js` splash check

### Testování:

- [ ] Nová objednávka - splash zmizí do 2 sekund
- [ ] Edit objednávky - splash zmizí a data se načtou
- [ ] Copy objednávky - splash zmizí a data se zkopírují
- [ ] Žádné duplicitní inicializace v konzoli
- [ ] Žádné race conditions

### Dlouhodobé (můžeme odložit):

- [ ] Stabilizovat lifecycle API
- [ ] Stabilizovat dictionaries API
- [ ] Stabilizovat orderDataLoader API
- [ ] Odstranit všechny eslint-disable komentáře

---

## 🎯 Závěr

**Root cause:** Nestabilní dependencies v `initializeForm` callback způsobují duplicitní volání a lifecycle se nikdy nedostane do READY stavu.

**Quick fix:** Odstranit `initializeForm` z useEffect dependencies a použít ref pro tracking.

**Dlouhodobé řešení:** Refaktorovat hooks aby vracely stabilní API.

---

**Ready pro implementaci?** 🚀
