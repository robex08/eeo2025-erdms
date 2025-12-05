# 🎯 REFACTORING OrderForm25 - QUICK SUMMARY

## 🔴 SOUČASNÝ PROBLÉM

```
❌ Race Conditions při načítání formuláře
❌ 50+ useEffect hooků - nekontrolovatelné pořadí
❌ 100+ useState hooků - state management chaos
❌ Duplicitní loading funkce (3x loadOrderForEdit)
❌ Chybějící lifecycle management
❌ Data se načítají PŘED renderem formuláře
```

## ✅ ŘEŠENÍ

### Centralizace State Managementu
```javascript
// PŘED: 100+ useState hooks
const [allUsers, setAllUsers] = useState([]);
const [loadingUsers, setLoadingUsers] = useState(false);
// ... +98 dalších

// PO: 4 useReducer hooks
const [lifecycle, dispatchLifecycle] = useReducer(lifecycleReducer, initial);
const [dictionaries, dispatchDict] = useReducer(dictionariesReducer, initial);
const [loading, dispatchLoading] = useReducer(loadingReducer, initial);
const [ui, dispatchUI] = useReducer(uiReducer, initial);
```

### Řízený Lifecycle
```javascript
MOUNTING → LOADING_DICTIONARIES → READY_FOR_DATA → DATA_LOADED → READY
    ↓              ↓                      ↓              ↓          ↓
Initialize    Load číselníky      Render prázdný   Load data    Enable UI
                                     formulář
```

### Redukce useEffect hooků
```javascript
// PŘED: 50+ useEffect hooků
useEffect(() => { loadUsers(); }, [token]);
useEffect(() => { loadApprovers(); }, [token]);
useEffect(() => { loadStrediska(); }, [token]);
// ... +47 dalších

// PO: 5-7 kontrolovaných useEffect
useEffect(() => { initializeForm(); }, []); // Pouze jednou!
useEffect(() => { /* dictionaries watcher */ }, [dictionaries.isReady]);
useEffect(() => { /* autosave */ }, [formData, isChanged]);
```

## 🏗️ NOVÁ ARCHITEKTURA

```
OrderForm25
    ↓
useFormController (MASTER)
    ├─ useFormLifecycle     → Řídí fáze inicializace
    ├─ useDictionaries      → Načítá číselníky
    ├─ useOrderDataLoader   → Načítá data objednávky
    └─ useUIState           → Spravuje UI stavy

    ↓
Single useEffect → initializeForm()
    ↓
Loading Guard → if (!isReady) return <Loading />
    ↓
RENDER → Formulář FÁZE 1-8 (beze změny designu)
```

## 📊 METRICS

| Metrika | PŘED | PO | Zlepšení |
|---------|------|-----|----------|
| useState hooky | 100+ | ~20 | **-80%** |
| useEffect hooky | 50+ | 7 | **-86%** |
| Loading funkce | 3 duplicitní | 1 centralizovaná | **-67%** |
| Race conditions | ✗ Časté | ✓ Eliminované | **100%** |
| Lifecycle control | ✗ Žádný | ✓ Plný | **100%** |

## 🎨 CO ZACHOVÁVÁME

✅ **Design formuláře** - 100% stejný
✅ **FÁZE 1-8 systém** - Beze změny
✅ **Workflow states** - Stejné
✅ **Validation rules** - Stejné
✅ **API calls** - Stejné
✅ **Draft system** - Stejné

## ⏱️ ČASOVÝ ODHAD

| Etapa | Čas |
|-------|-----|
| 1. Příprava infrastruktury | 30 min |
| 2. Migrace state → reducers | 1 hod |
| 3. Refactor useEffect | 1.5 hod |
| 4. Testování | 1 hod |
| 5. Git commit & docs | 30 min |
| **CELKEM** | **~4.5 hod** |

## 🚀 IMPLEMENTAČNÍ POSTUP

### Phase 1: Setup
```bash
mkdir -p src/forms/OrderForm25/{reducers,hooks}
# Vytvořit reducery
# Git commit
```

### Phase 2: Custom Hooks
```javascript
// useFormLifecycle.js
// useDictionaries.js
// useOrderDataLoader.js
// useFormController.js
```

### Phase 3: Integrace
```javascript
// Import hooks do OrderForm25.js
// Nahradit useState → useReducer
// Git commit po každé větší změně
```

### Phase 4: Testing
```bash
# Test všech scénářů
# Fix bugů
# Final commit
```

## 📝 KLÍČOVÉ SOUBORY

- `src/forms/OrderForm25.js` - HLAVNÍ soubor (22754 řádků)
- `src/forms/OrderForm25/reducers/` - NOVÉ reducery
- `src/forms/OrderForm25/hooks/` - NOVÉ custom hooks
- `REFACTORING-PLAN-OrderForm25.md` - Detailní plán

## 🔗 SOUVISEJÍCÍ DOKUMENTY

- `REFACTORING-PLAN-OrderForm25.md` - Kompletní strategie
- `docs/RACE-CONDITION-FIX-*.md` - Předchozí pokusy
- `docs/CACHE-*.md` - Cache systém (nezávislý)

## ⚠️ DŮLEŽITÉ POZNÁMKY

1. **Pravidelně commitovat** - Po každé větší změně
2. **Testovat průběžně** - Ne až na konci
3. **Zachovat design** - Žádné vizuální změny
4. **Komunikovat s týmem** - Velký refactoring

## 🎯 CÍL

**Stabilní, udržovatelný formulář bez race conditions, se zachováním všech funkcí a designu.**

---

**Status:** 📋 Plán připraven, čeká se na implementaci
**Priority:** 🔴 Vysoká - Race conditions blokují UX
**Risk:** 🟡 Střední - Velký refactoring, ale s backup
