# User-Specific localStorage Isolation Implementation

## Přehled
Implementována uživatelsky specifická izolace pro localStorage napříč celou aplikací, aby se předešlo kontaminaci nastavení mezi různými uživateli na sdílených počítačích.

## Implementované změny

### 1. Orders25List.js
**Vyřešeno**: ~25+ localStorage klíčů bez uživatelské izolace

**Helper Functions:**
```javascript
const getUserKey = (baseKey) => {
  const sid = user_id || 'anon';
  return `${baseKey}_${sid}`;
};

const getUserStorage = (baseKey, defaultValue = null) => {
  try {
    const item = localStorage.getItem(getUserKey(baseKey));
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
    return defaultValue;
  }
};

const setUserStorage = (baseKey, value) => {
  try {
    localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
  } catch (error) {
    console.warn('Error writing to localStorage:', error);
  }
};
```

**Izolované klíče:**
- `orders25List_pageSize` → `orders25List_pageSize_{user_id}`
- `orders25List_pageIndex` → `orders25List_pageIndex_{user_id}`
- `orders25List_globalFilter` → `orders25List_globalFilter_{user_id}`
- `orders25List_druhyFilter` → `orders25List_druhyFilter_{user_id}`
- `orders25List_amountFrom` → `orders25List_amountFrom_{user_id}`
- `orders25List_amountTo` → `orders25List_amountTo_{user_id}`
- `orders25List_showDashboard` → `orders25List_showDashboard_{user_id}`
- `orders25List_showDebug` → `orders25List_showDebug_{user_id}`
- `orders25List_rowStriping` → `orders25List_rowStriping_{user_id}`
- `orders25List_rowHighlighting` → `orders25List_rowHighlighting_{user_id}`
- `orders25_dateFrom` → `orders25_dateFrom_{user_id}`
- `orders25_dateTo` → `orders25_dateTo_{user_id}`
- `calendar_order_counts` → `calendar_order_counts_{user_id}`
- `calendar_order_counts_updated` → `calendar_order_counts_updated_{user_id}`
- `order25-draft` → `order25-draft_{user_id}`
- A další...

### 2. AddressBookPage.js
**Vyřešeno**: Tab persistence bez uživatelské izolace

**Implementované helper functions a změny:**
- `addressBook_activeTab` → `addressBook_activeTab_{user_id}`

### 3. Orders.js (Starší objednávky)
**Vyřešeno**: ~10 localStorage klíčů bez uživatelské izolace

**Izolované klíče:**
- `orders_globalFilter` → `orders_globalFilter_{user_id}`
- `orders_garantFilter` → `orders_garantFilter_{user_id}`
- `orders_druhFilter` → `orders_druhFilter_{user_id}`
- `orders_yearFilter` → `orders_yearFilter_{user_id}`
- `orders_isCollapsed` → `orders_isCollapsed_{user_id}`
- `orders_isFilterCollapsed` → `orders_isFilterCollapsed_{user_id}`

### 4. Users.js
**Vyřešeno**: ~8 localStorage klíčů bez uživatelské izolace

**Izolované klíče:**
- `users_showDashboard` → `users_showDashboard_{user_id}`
- `users_pageSize` → `users_pageSize_{user_id}`
- `users_pageIndex` → `users_pageIndex_{user_id}`
- `users_showDebug` → `users_showDebug_{user_id}`

## Použitý vzor

### Storage Pattern
```javascript
// Místo přímého localStorage
localStorage.setItem('key', value); // ❌

// Použito user-specific storage
setUserStorage('key', value); // ✅ → key_{user_id}
```

### User ID Resolution
```javascript
const user_id = userDetail?.user_id;
const storageId = user_id || 'anon';
```

**Fallback logika:**
- Přihlášený uživatel: `key_{user_id}`
- Nepřihlášený uživatel: `key_anon`

## Již implementované komponenty

### useFloatingPanels.js ✅
- Již používal správnou uživatelskou izolaci
- Vzor: `{storageKey}_{user_id || 'anon'}`
- Používá se pro TODO, Notes, Chat panely

## Ověření

### Build Status
✅ Aplikace se úspěšně builduje bez chyb

### Funkčnost
- Uživatelé mají nyní izolovaná nastavení filtrů
- Paginace je specifická pro každého uživatele
- UI preference (dashboard, debug módy) jsou separované
- Kalendář objednávek je user-specific

## Bezpečnostní benefit

### Problém před změnou:
```javascript
// Uživatel A nastaví filter na "VIP"
localStorage.setItem('orders_globalFilter', 'VIP');

// Uživatel B na stejném PC vidí filter "VIP"
const filter = localStorage.getItem('orders_globalFilter'); // "VIP"
```

### Řešení po změně:
```javascript
// Uživatel A (ID: 123) nastaví filter
setUserStorage('orders_globalFilter', 'VIP'); 
// → orders_globalFilter_123 = "VIP"

// Uživatel B (ID: 456) na stejném PC
getUserStorage('orders_globalFilter'); // null (nový čistý stav)
// → orders_globalFilter_456 neexistuje
```

## Kompatibilita

### Zpětná kompatibilita
- Nové uživatelské klíče nezpůsobí konflikt s existujícími
- Starší data zůstávají v localStorage (pro případnou migraci)
- Anonymní uživatelé používají fallback `_anon` suffix

### Migrace dat
- Implementované helper funkce umožňují snadnou případnou migraci
- Data jsou čitelná v developer tools pro debugging

## Použité konvence

### Naming Convention
- Pattern: `{původní_klíč}_{user_id}`
- Anonymous: `{původní_klíč}_anon`

### Error Handling
```javascript
try {
  localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
} catch (error) {
  console.warn('Error writing to localStorage:', error);
}
```

## Status implementace
✅ **KOMPLETNÍ** - Všechny hlavní komponenty mají uživatelskou izolaci localStorage

**Výsledek:** Uživatelé na sdílených PC již nevidí nastavení jiných uživatelů.