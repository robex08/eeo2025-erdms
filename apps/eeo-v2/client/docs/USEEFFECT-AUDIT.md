# 📊 Audit useEffect Hooků v OrderForm25.js

**Datum:** 2025-01-XX  
**Soubor:** `src/forms/OrderForm25.js`  
**Celkem useEffect:** ~57 aktivních + 6 zakomentovaných

## 🎯 Cíl refactoringu
Redukovat počet useEffect z 50+ na 5-7 kontrolovaných hooků:
1. **Mount initialization** - inicializace formuláře při prvním mountu
2. **Dictionary watcher** - reakce na načtení číselníků
3. **Data loader** - načtení dat objednávky (edit/copy/draft modes)
4. **Autosave** - automatické ukládání konceptů
5. **Cleanup** - cleanup při unmount

## 📍 Seznam useEffect Hooků podle řádků

### Inicializační useEffect (řádky 2632-5353)
| Řádek | Účel | Status | Akce |
|-------|------|--------|------|
| 2632 | ? | 🟡 TBD | Přečíst a analyzovat |
| 2701 | ? | 🟡 TBD | Přečíst a analyzovat |
| 2711 | ? | 🟡 TBD | Přečíst a analyzovat |
| 3334 | ? | 🟡 TBD | Přečíst a analyzovat |
| 3398 | ? | 🟡 TBD | Přečíst a analyzovat |
| 3447 | ? | 🟡 TBD | Přečíst a analyzovat |
| 3487 | ❌ COMMENTED | ✅ Done | Already commented out |
| 3497 | ❌ COMMENTED | ✅ Done | Already commented out |
| 3566 | ? | 🟡 TBD | Přečíst a analyzovat |
| 4088 | ❌ COMMENTED | ✅ Done | Already commented out |
| 4103 | ? | 🟡 TBD | Přečíst a analyzovat |
| 4138 | ? | 🟡 TBD | Přečíst a analyzovat |
| 4480 | ? | 🟡 TBD | Přečíst a analyzovat |
| 4610 | ? | 🟡 TBD | Přečíst a analyzovat |
| 4620 | ? | 🟡 TBD | Přečíst a analyzovat |
| 4983 | ? | 🟡 TBD | Přečíst a analyzovat |
| 4988 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5005 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5024 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5053 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5076 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5126 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5174 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5185 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5193 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5202 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5218 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5229 | ? | 🟡 TBD | Přečíst a analyzovat |
| 5353 | ? | 🟡 TBD | Přečíst a analyzovat |

### Helper Functions useEffect (řádky 5884-9910)
| Řádek | Účel | Status | Akce |
|-------|------|--------|------|
| 5884 | ❌ COMMENTED | ✅ Done | Already commented out |
| 8194 | ? | 🟡 TBD | Přečíst a analyzovat |
| 8936 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9010 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9322 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9361 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9369 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9407 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9445 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9459 | ❌ COMMENTED | ✅ Done | Already commented out |
| 9464 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9481 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9653 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9669 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9680 | ❌ COMMENTED | ✅ Done | Already commented out |
| 9687 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9724 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9748 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9787 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9801 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9888 | ? | 🟡 TBD | Přečíst a analyzovat |
| 9910 | ? | 🟡 TBD | Přečíst a analyzovat |

### UI Logic useEffect (řádky 12190-13988)
| Řádek | Účel | Status | Akce |
|-------|------|--------|------|
| 12190 | ? | 🟡 TBD | Přečíst a analyzovat |
| 13592 | ? | 🟡 TBD | Přečíst a analyzovat |
| 13644 | ? | 🟡 TBD | Přečíst a analyzovat |
| 13874 | ? | 🟡 TBD | Přečíst a analyzovat |
| 13988 | ? | 🟡 TBD | Přečíst a analyzovat |

### Render useEffect (řádky 22020-22140)
| Řádek | Účel | Status | Akce |
|-------|------|--------|------|
| 22020 | ? | 🟡 TBD | Přečíst a analyzovat |
| 22035 | ? | 🟡 TBD | Přečíst a analyzovat |
| 22042 | ? | 🟡 TBD | Přečíst a analyzovat |
| 22063 | ? | 🟡 TBD | Přečíst a analyzovat |
| 22089 | ? | 🟡 TBD | Přečíst a analyzovat |
| 22140 | ? | 🟡 TBD | Přečíst a analyzovat |

## 📝 Poznámky

### Zakomentované useEffect (již hotovo ✅)
- `3487` - Odstraněn při migraci číselníků
- `3497` - Odstraněn při migraci číselníků
- `4088` - ?
- `5884` - ?
- `9459` - ?
- `9680` - ?

### Další kroky
1. **Identifikovat** - Přečíst každý useEffect a určit jeho účel
2. **Kategorizovat** - Rozdělit do kategorií (init, dictionary, data, autosave, cleanup)
3. **Konsolidovat** - Sloučit podobné useEffect do jednoho
4. **Eliminovat** - Odstranit zbytečné nebo duplikované useEffect
5. **Refaktorovat** - Přesunout logiku do custom hooků kde má smysl

## 🎯 Cílový stav

```javascript
// 1. MOUNT INITIALIZATION - inicializace při prvním mountu
useEffect(() => {
  console.log('[OrderForm25] MOUNT - Starting initialization');
  // Nic dalšího - vše řídí useFormController
}, []);

// 2. DICTIONARY WATCHER - reakce na načtení číselníků
useEffect(() => {
  if (dictionaries.isReady) {
    console.log('[OrderForm25] Dictionaries ready, form can continue');
    // Případné post-dictionary akce
  }
}, [dictionaries.isReady]);

// 3. DATA LOADED WATCHER - reakce na načtení dat
useEffect(() => {
  if (lifecycle.phase === 'DATA_LOADED') {
    console.log('[OrderForm25] Data loaded, applying to form');
    // Aplikovat data do formuláře
    // Trigger post-load validace
  }
}, [lifecycle.phase]);

// 4. AUTOSAVE - automatické ukládání konceptů
useEffect(() => {
  if (!lifecycle.isReady) return;
  
  const timer = setTimeout(() => {
    saveDraft();
  }, 3000);
  
  return () => clearTimeout(timer);
}, [formData, lifecycle.isReady]);

// 5. CLEANUP - úklid při unmount
useEffect(() => {
  return () => {
    console.log('[OrderForm25] UNMOUNT - Cleanup');
    // Uložit koncept
    // Zrušit pending requesty
  };
}, []);
```

## ✅ Progress

- [x] Zakomentované useEffect identificované (6 ks)
- [ ] Všechny useEffect přečtené a analyzované (0/57)
- [ ] UseEffect kategorizované
- [ ] UseEffect konsolidované
- [ ] UseEffect eliminované
- [ ] Cílový stav dosažen (5-7 useEffect)
