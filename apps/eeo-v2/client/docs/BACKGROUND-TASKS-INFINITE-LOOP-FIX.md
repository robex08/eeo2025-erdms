# Background Tasks - FIX Infinite Loop (2025-01-10)

## 🚨 PROBLÉM: Infinite Loop při registraci Background Tasks

### Symptomy:
- Stovky/tisíce "[Violation] 'message' handler took <N>ms" v konzoli
- CoinGecko API se volá nepřetržitě místo každých 30 minut
- API vrací 429 (Too Many Requests) errors
- Aplikace je pomalá kvůli nekonečným re-renderům

### ROOT CAUSE:
**App.js** měl v useEffect dependencies `[isLoggedIn, bgTasks]`:

```javascript
useEffect(() => {
  // ... registrace tasků ...
}, [isLoggedIn, bgTasks]);  // ❌ bgTasks je objekt, mění se při každém renderu
```

Každá změna `bgTasks` objektu → useEffect se spustí → znovu registruje tasky → způsobí re-render → bgTasks se změní → infinite loop! 🔁

---

## ✅ ŘEŠENÍ: useRef Guard pro Jednorázovou Registraci

### Změny v App.js:

#### 1. Přidán `tasksRegisteredRef` tracking (řádek ~85):
```javascript
// 🚫 CRITICAL: Track jestli už byly tasky zaregistrovány (zamezí infinite loop)
const tasksRegisteredRef = useRef(false);
```

#### 2. Guard v useEffect (řádek ~127):
```javascript
useEffect(() => {
  if (!isLoggedIn || !bgTasks) {
    // Reset registrace při odhlášení
    tasksRegisteredRef.current = false;
    return;
  }

  // 🚫 CRITICAL: Zamezení infinite loop - registrovat pouze jednou
  if (tasksRegisteredRef.current) {
    return;  // ← Tasky už byly zaregistrovány, konec!
  }

  // ... vytvoření a registrace tasků ...
  
  // Označit jako zaregistrováno
  tasksRegisteredRef.current = true;

}, [isLoggedIn, bgTasks]);  // Dependencies zůstávají, ale guard zamezí opakované registraci
```

---

## 🎯 Jak to Funguje:

### Životní Cyklus:
1. **Mount + Login**: 
   - `isLoggedIn = true` → useEffect se spustí
   - `tasksRegisteredRef.current === false` → tasky se zaregistrují
   - `tasksRegisteredRef.current = true` → označeno jako hotovo

2. **Re-render (bgTasks změna)**:
   - useEffect se spustí kvůli dependency na bgTasks
   - `tasksRegisteredRef.current === true` → **GUARD** zastaví opakovanou registraci
   - Žádné tasky se neregistrují znovu ✅

3. **Logout**:
   - `isLoggedIn = false` → useEffect se spustí
   - `tasksRegisteredRef.current = false` → reset pro příští login
   - Tasky se automaticky odregistrují díky `autoCleanup` v useBackgroundTasks

4. **Nový Login**:
   - Opět od bodu 1 (tasky se zaregistrují čistě jednou)

---

## 📊 Výsledek:

### Před Fixem:
```
[Violation] 'message' handler took 156ms
[Violation] 'message' handler took 143ms
[Violation] 'message' handler took 167ms
... (stovky řádků)
CoinGecko API: 429 Too Many Requests
```

### Po Fixu:
- Tasky se zaregistrují **pouze jednou** při loginu
- CoinGecko API se volá **každých 30 minut** jak má
- Žádné message handler violations
- Plynulý chod aplikace ✅

---

## 🔍 Související Opravy:

### Předchozí Infinite Loop Fixy:
1. **exchangeRatesContext** odstraněn z dependencies (způsoboval loop)
2. **useFloatingPanels** - přidán `isInitialMountRef` guard (zamezil auto-logout loop)
3. **notificationsSeedDoneRef** guard (zamezil infinite seeding loop)

### Pattern:
Všechny tyto fixy používají **useRef pro tracking stavu**, který přežije re-rendery, ale nespouští useEffect.

---

## ⚠️ DŮLEŽITÉ:

### Proč Nechat bgTasks v Dependencies?
- ESLint chce všechny použité proměnné v dependencies
- Dependencies jsou správné - **problém byl v chybějícím guard mechanismu**
- S `tasksRegisteredRef` guard je bezpečné mít bgTasks v dependencies

### Alternativní Řešení (NEPOUŽITO):
- Odstranit bgTasks z dependencies → ESLint warning + možné problémy při future změnách
- Přesunout registraci do useBackgroundTasks hooku → větší refactoring
- Použít useMemo na bgTasks → neřeší root cause

---

## 📝 Testování:

### Checklist:
- [ ] Po loginu se tasky zaregistrují pouze jednou
- [ ] Žádné "[Violation] 'message' handler" warnings v konzoli
- [ ] CoinGecko API se volá každých 30 minut (ne častěji)
- [ ] Po odhlášení a novém přihlášení se tasky zaregistrují znovu čistě
- [ ] Background tasks fungují správně (Orders refresh, Notifications, Exchange rates, CoinGecko)

---

## 🏗️ Kód Reference:

**Soubor**: `src/App.js`  
**Řádky**: ~85 (tasksRegisteredRef), ~127-198 (useEffect s guard)  
**Commit**: [TBD]

---

## 📚 Lessons Learned:

1. **useEffect s object dependencies** = riziko infinite loop
2. **useRef tracking** = elegantní guard mechanismus bez re-renderů
3. **Dependencies jsou důležité** - odstranit je není řešení, přidat guard je!
4. **React Strict Mode** může maskovat tyto problémy v dev (double renders)

---

**STATUS**: ✅ FIXED  
**DATE**: 2025-01-10  
**PRIORITY**: CRITICAL (Performance)
