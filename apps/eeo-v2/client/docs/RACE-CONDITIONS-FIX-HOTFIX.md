# 🔥 HOTFIX: Hanging Splash Screen

**Datum:** 29. října 2025  
**Problém:** Formulář se zasekával na splash screen po implementaci race condition fixes  
**Status:** ✅ VYŘEŠENO

## 🐛 Příčina problému

Po implementaci race condition fixes vznikl nekonečný loop:

```javascript
// ❌ PROBLÉM: initializeForm v dependencies
const initializeForm = useCallback(async () => {
  // ... async logic
}, [
  editOrderId,
  copyOrderId,
  archivovanoParam,
  userId,
  lifecycle,      // ⚠️ Mění se každý render!
  dictionaries,   // ⚠️ Mění se každý render!
  orderDataLoader // ⚠️ Mění se každý render!
]);

useEffect(() => {
  if (token && username) {
    initializeForm(); // ♾️ Spouští se znovu a znovu!
  }
}, [token, username, initializeForm]); // ⚠️ initializeForm se mění = infinite loop
```

**Důsledek:** Formulář se nikdy nedostal do `isReady` stavu → splash screen visel natrvalo.

## ✅ Řešení

### 1. Odstranit `initializeForm` z dependencies

```javascript
// ✅ OPRAVA: Pouze stabilní dependencies
useEffect(() => {
  if (token && username) {
    initializeForm();
  }
}, [token, username]); // ✅ Bez initializeForm!
```

### 2. Přidat `hasInitializedRef` pro tracking

```javascript
const hasInitializedRef = useRef(false);

useEffect(() => {
  // Skip pokud už proběhla inicializace
  if (hasInitializedRef.current) {
    return;
  }
  
  if (token && username) {
    hasInitializedRef.current = true; // ✅ Označit že začala
    initializeForm();
  }
}, [token, username]);
```

### 3. Reset při manual reset

```javascript
reset: () => {
  // ...
  hasInitializedRef.current = false; // ✅ Reset flag
  // ...
}
```

## 📝 Změněné soubory

1. **`useFormController.js`**
   - Přidán `hasInitializedRef`
   - Odstraněn `initializeForm` z useEffect deps
   - Přidán reset hasInitializedRef ve funkci reset()

2. **`useDictionaries.js`**
   - Odstraněn `signal` parameter z API calls (API ho zatím nepodporují)
   - Přidány TODO komentáře pro budoucí implementaci

3. **`OrderForm25.js`**
   - Upravený cleanup useEffect (nechat formController spravovat cleanup)

## 🧪 Testování

### ✅ Otestováno
- [x] Nový formulář se načte správně
- [x] Splash screen zmizí po načtení
- [x] Formulář je funkční

### 🔜 K otestování
- [ ] Edit mode (načtení existující objednávky)
- [ ] Copy mode (kopírování objednávky)
- [ ] StrictMode (development)
- [ ] HMR reload
- [ ] Multiple tabs
- [ ] Page refresh během loadingu

## 🎯 Lessons Learned

### ❌ Co NEDĚLAT
```javascript
// NIKDY nedávat nestabilní callbacks do dependencies
useEffect(() => {
  unstableCallback();
}, [unstableCallback]); // ⚠️ Infinite loop!
```

### ✅ Co DĚLAT
```javascript
// Použít ref pro tracking místo callback dependency
const hasRunRef = useRef(false);

useEffect(() => {
  if (hasRunRef.current) return;
  hasRunRef.current = true;
  
  unstableCallback();
}, [/* pouze stabilní deps */]);
```

## 📊 Performance Impact

| Metrika | Před hotfix | Po hotfixu | Změna |
|---------|-------------|------------|-------|
| Splash screen duration | ♾️ (visel) | ~1-2s | ✅ OPRAVENO |
| Initialization calls | ♾️ (loop) | 1x | ✅ 100% redukce |
| Memory usage | Rostoucí | Stabilní | ✅ Opraveno |

---

**Autor:** GitHub Copilot  
**Tested by:** @holovsky  
**Status:** Ready for testing
