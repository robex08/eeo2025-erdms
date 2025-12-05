# 🔧 Debug: Cache indikátor v Orders.js

## 🐛 Problém
Cache indikátor v Orders.js **stále ukazuje DB ikonu** i po F5 refresh, cache se pravděpodobně nepoužívá.

## 🔍 Možné příčiny

### 1. **user_id není k dispozici**
Orders.js používal `userDetail?.user_id`, který může být `undefined` při prvním renderu nebo v některých případech.

**Oprava:**
```javascript
// PŘED
const user_id = userDetail?.user_id;

// PO
const user_id = userDetail?.user_id || user?.id; // Fallback na user.id
```

### 2. **Debug logy přidány**
Pro zjištění, co se děje, byly přidány dočasné debug logy:

```javascript
console.log('[Orders.js] Cache result:', { 
  fromCache: cacheResult.fromCache, 
  user_id, 
  yearFrom, 
  yearTo 
});
```

**Místa s debug logy:**
- `handleYearFilterChange()` - Změna roku
- `useEffect fetchOrders()` - Initial load + F5

---

## 🧪 Testování

### Otevři konzoli prohlížeče a sleduj logy:

#### Test 1: První načtení
1. Otevři Orders.js (staré objednávky)
2. Sleduj konzoli:
```
[Orders.js useEffect] Cache result: { fromCache: false, user_id: '1', yearFrom: '2024-01-01', yearTo: '2024-12-31' }
```
3. **Očekáváno**: `fromCache: false` → ikona DB 💾

#### Test 2: F5 refresh (do 10 minut)
1. Stiskni F5
2. Sleduj konzoli:
```
[Orders.js useEffect] Cache result: { fromCache: true, user_id: '1', yearFrom: '2024-01-01', yearTo: '2024-12-31' }
```
3. **Očekáváno**: `fromCache: true` → ikona cache ⚡

#### Test 3: Žádný user_id
Pokud vidíš:
```
[Orders.js useEffect] No user_id - fallback to direct fetch
```
To znamená, že `user_id` je `undefined` → cache se nepoužívá.

---

## 🎯 Co sledovat v konzoli

### ✅ Správné chování:
```javascript
// První load
[Orders.js useEffect] Cache result: { fromCache: false, user_id: '1', yearFrom: '2024-01-01', yearTo: '2024-12-31' }

// F5 refresh (do 10 min)
[Orders.js useEffect] Cache result: { fromCache: true, user_id: '1', yearFrom: '2024-01-01', yearTo: '2024-12-31' }
```

### ❌ Problém - žádný user_id:
```javascript
[Orders.js useEffect] No user_id - fallback to direct fetch
```
→ `user_id` je `undefined`, cache se nepoužívá

### ❌ Problém - cache vždy miss:
```javascript
// První load
[Orders.js useEffect] Cache result: { fromCache: false, user_id: '1', ... }

// F5 refresh
[Orders.js useEffect] Cache result: { fromCache: false, user_id: '1', ... }
```
→ Cache se sice používá, ale vždy je miss (možná TTL vypršel nebo jiný problém)

---

## 🔧 Další možné problémy

### 1. **Cache TTL vypršel**
Cache má TTL 10 minut. Pokud mezi načteními uplyne víc než 10 minut, cache expire → vždy DB.

**Řešení**: Zkus F5 refresh do 10 minut od prvního načtení.

### 2. **SessionStorage je prázdný**
F5 persistence závisí na sessionStorage. Pokud je vypnutý nebo full, cache nefunguje.

**Debug**:
```javascript
// V konzoli prohlížeče:
sessionStorage.getItem('orders_cache_backup')
```

Mělo by vrátit JSON s cache daty. Pokud vrátí `null`, sessionStorage backup nefunguje.

### 3. **Cache keys se neshodují**
Cache používá klíče ve formátu:
```
user:1|type:old-orders|yearFrom:2024-01-01|yearTo:2024-12-31
```

Pokud se filtry (year) změní, cache key se také změní → miss.

**Debug**:
```javascript
// V ordersCacheService.js - _getCacheKey()
console.log('[OrdersCache] Generated key:', cacheKey);
```

---

## 📋 Checklist debugování

- [ ] Otevři konzoli prohlížeče (F12)
- [ ] Načti Orders.js (staré objednávky)
- [ ] Zkontroluj log `[Orders.js useEffect] ...`
- [ ] Ověř, že máš `user_id` (ne undefined)
- [ ] Ověř, že první load má `fromCache: false`
- [ ] Proveď F5 refresh
- [ ] Ověř, že F5 load má `fromCache: true`
- [ ] Zkontroluj, zda se ikona změnila z 💾 na ⚡

---

## 🚀 Očekávané výsledky

### První načtení:
- **Konzole**: `fromCache: false`
- **Ikona**: 💾 Červená (DB)
- **Tooltip**: "Načteno z databáze"

### F5 refresh (do 10 min):
- **Konzole**: `fromCache: true`
- **Ikona**: ⚡ Fialová (Cache)
- **Tooltip**: "Načteno z cache (paměti)"

### Tlačítko Obnovit:
- **Konzole**: `fromCache: false` (force refresh)
- **Ikona**: 💾 Červená (DB)
- **Tooltip**: "Načteno z databáze"

---

## 🛠️ Po dokončení debugování

Až zjistíme, co je problém, **odstraníme debug logy**:
```javascript
// Smazat tyto řádky:
console.log('[Orders.js] Cache result:', ...);
console.log('[Orders.js useEffect] Cache result:', ...);
console.log('[Orders.js] No user_id - fallback to direct fetch');
console.log('[Orders.js useEffect] No user_id - fallback to direct fetch');
```

---

## 📊 Status

**DEBUG MODE ACTIVE** - Prosím, zkontroluj konzoli a pošli zpět výsledky logů.

**Změny v Orders.js**:
1. ✅ `user_id` fallback na `user?.id`
2. ✅ Debug logy přidány
3. ✅ Syntax check bez chyb

**Další krok**: Otevři aplikaci, načti Orders.js a sleduj konzoli!
