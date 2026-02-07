# useReducer vs useState - Vysvětlení

## 🤔 Co je useReducer?

**useReducer** je React hook pro správu komplexního state, který má více částí a složitou logiku aktualizací.

---

## 📊 Srovnání: useState vs useReducer

### ❌ **useState** - Současný stav v ProfilePage.js

```javascript
const [userSettings, setUserSettings] = useState({
  vychozi_rok: 'current',
  vychozi_obdobi: 'all',
  viditelne_dlazdice: { nova: false, ke_schvaleni: false, ... },
  export_csv_sloupce: { id: true, cislo_objednavky: true, ... },
  notifikace: { povoleny: true, kategorie: { ... } },
  // ... 50+ properties
});

// Problém: Složité aktualizace
setUserSettings(prev => ({
  ...prev,
  viditelne_dlazdice: {
    ...prev.viditelne_dlazdice,
    nova: true
  }
}));
```

**Problémy:**
- ❌ Duplikovaná logika při každé aktualizaci
- ❌ Velké vnořené objekty jsou těžko čitelné
- ❌ Snadné udělat chybu (zapomenout `...prev`)
- ❌ Obtížné testování logiky

---

### ✅ **useReducer** - Čistší řešení

```javascript
// 1. Definuj akce (co chceš udělat)
const ACTIONS = {
  SET_YEAR: 'set_year',
  SET_PERIOD: 'set_period',
  TOGGLE_TILE: 'toggle_tile',
  LOAD_FROM_DB: 'load_from_db',
  RESET: 'reset'
};

// 2. Reducer = Funkce, která řídí, JAK se mění state
function settingsReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_YEAR:
      return { ...state, vychozi_rok: action.payload };
      
    case ACTIONS.SET_PERIOD:
      return { ...state, vychozi_obdobi: action.payload };
      
    case ACTIONS.TOGGLE_TILE:
      return {
        ...state,
        viditelne_dlazdice: {
          ...state.viditelne_dlazdice,
          [action.payload]: !state.viditelne_dlazdice[action.payload]
        }
      };
      
    case ACTIONS.LOAD_FROM_DB:
      // Komplexní merge logika na JEDNOM místě
      return mergeSettings(state, action.payload);
      
    case ACTIONS.RESET:
      return DEFAULT_SETTINGS;
      
    default:
      return state;
  }
}

// 3. Použití v komponentě
const [userSettings, dispatch] = useReducer(settingsReducer, DEFAULT_SETTINGS);

// 4. Aktualizace je teď snadná a čitelná
dispatch({ type: ACTIONS.SET_YEAR, payload: '2025' });
dispatch({ type: ACTIONS.TOGGLE_TILE, payload: 'nova' });
dispatch({ type: ACTIONS.LOAD_FROM_DB, payload: settingsFromDB });
```

---

## 🎯 Výhody useReducer

### 1. **Centralizovaná logika**
```javascript
// ❌ Před: Logika rozházená po celé komponentě
setUserSettings(prev => ({ ...prev, vychozi_rok: '2025' }));
setUserSettings(prev => ({ ...prev, vychozi_obdobi: 'all' }));

// ✅ Po: Všechna logika na jednom místě (v reduceru)
dispatch({ type: 'SET_YEAR', payload: '2025' });
dispatch({ type: 'SET_PERIOD', payload: 'all' });
```

### 2. **Lepší čitelnost**
```javascript
// ❌ Před: Co tohle dělá?
setUserSettings(prev => ({
  ...prev,
  viditelne_dlazdice: {
    ...prev.viditelne_dlazdice,
    nova: !prev.viditelne_dlazdice.nova
  }
}));

// ✅ Po: Jasné! Toggles tile visibility
dispatch({ type: 'TOGGLE_TILE', payload: 'nova' });
```

### 3. **Snazší testování**
```javascript
// ✅ Reducer je čistá funkce → snadné testování
test('toggles tile visibility', () => {
  const state = { viditelne_dlazdice: { nova: false } };
  const action = { type: 'TOGGLE_TILE', payload: 'nova' };
  const newState = settingsReducer(state, action);
  
  expect(newState.viditelne_dlazdice.nova).toBe(true);
});
```

### 4. **Prevence chyb**
```javascript
// ❌ Před: Snadné udělat chybu
setUserSettings({  // ← CHYBA! Zapomněl ...prev
  vychozi_rok: '2025'  // Všechny ostatní hodnoty zmizely!
});

// ✅ Po: Reducer vždy vrací správný formát
dispatch({ type: 'SET_YEAR', payload: '2025' });
// → Reducer zajistí { ...state, vychozi_rok: '2025' }
```

### 5. **Komplexní aktualizace**
```javascript
// ❌ Před: Složité vnořené aktualizace
setUserSettings(prev => ({
  ...prev,
  export_csv_sloupce: {
    ...prev.export_csv_sloupce,
    zakladni_identifikace: {
      ...prev.export_csv_sloupce.zakladni_identifikace,
      id: true
    }
  }
}));

// ✅ Po: Jednoduchá akce
dispatch({ 
  type: 'TOGGLE_CSV_COLUMN', 
  payload: { category: 'zakladni_identifikace', column: 'id' } 
});
```

---

## 🚀 Kdy použít useReducer?

### ✅ Použij useReducer když:
- State má **více než 3-4 properties**
- State má **vnořené objekty** (objekty v objektech)
- Máš **komplexní logiku aktualizací**
- Aktualizace závislé na **předchozím stavu**
- Chceš **centralizovat logiku** na jedno místo
- Potřebuješ **testovat state logiku**

### ❌ Zůstaň u useState když:
- State je **jednoduchý** (string, number, boolean)
- Máš **1-2 properties**
- Logika je **přímočará** (jen set hodnotu)
- Nepotřebuješ složité aktualizace

---

## 📈 Praktický příklad: ProfilePage.js

### Současný stav (useState):
```javascript
// 50+ properties v jednom objektu
const [userSettings, setUserSettings] = useState({ ... });

// Rozházená logika aktualizací
setUserSettings(prev => ({ ...prev, vychozi_rok: '2025' }));
setUserSettings(prev => ({ ...prev, viditelne_dlazdice: { ...prev.viditelne_dlazdice, nova: true } }));
```

### S useReducer:
```javascript
const [userSettings, dispatch] = useReducer(settingsReducer, DEFAULT_SETTINGS);

// Čitelné akce
dispatch({ type: 'SET_YEAR', payload: '2025' });
dispatch({ type: 'TOGGLE_TILE', payload: 'nova' });
dispatch({ type: 'LOAD_FROM_DB', payload: dataFromBackend });
```

---

## 🎓 Závěr

**useReducer** je mocný nástroj pro správu komplexního state. V ProfilePage.js by přinesl:

1. **Čistší kód** - Místo 200 řádků setState logiky → 1 reducer funkce
2. **Lepší maintainability** - Všechna logika na jednom místě
3. **Méně chyb** - Centralizovaná validace a kontrola
4. **Snadnější debugging** - Vidíš přesně jaké akce se dějí
5. **Lepší testování** - Reducer je čistá funkce

**Doporučení:** Pro ProfilePage.js **ANO**, useReducer by byl lepší volba! 🚀

---

## 📚 Další zdroje

- [React Docs: useReducer](https://react.dev/reference/react/useReducer)
- [When to use useReducer](https://kentcdodds.com/blog/should-i-usestate-or-usereducer)
