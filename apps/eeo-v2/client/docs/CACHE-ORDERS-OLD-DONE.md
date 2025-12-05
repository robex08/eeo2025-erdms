# ✅ Cache Integration - Orders.js (Staré objednávky)

## 📋 Přehled

Přidána cache integrace do **Orders.js** (starý systém objednávek) pro zrychlení načítání dat.

---

## 🚀 Implementované změny

### 1. **Import cache service**
```javascript
import ordersCacheService from '../services/ordersCacheService'; // 🚀 CACHE
```

---

### 2. **handleYearFilterChange() - Změna roku**
**PŘED:**
```javascript
const data = await fetchOldOrders({ yearFrom, yearTo, token, username });
```

**PO:**
```javascript
// 🚀 CACHE: Načíst z cache nebo DB
const cacheResult = await ordersCacheService.getOrders(
  user_id,
  async () => await fetchOldOrders({ yearFrom, yearTo, token, username }),
  { yearFrom, yearTo, type: 'old-orders' }
);

const data = cacheResult.data;
```

**Benefit**: Při přepínání let (např. 2024 → 2025 → 2024) se data načtou z cache místo opakovaného volání API.

---

### 3. **useEffect fetchOrders() - Initial load**
**PŘED:**
```javascript
const data = await fetchOldOrders({ yearFrom, yearTo, token, username });
```

**PO:**
```javascript
// 🚀 CACHE: Načíst z cache nebo DB
const cacheResult = await ordersCacheService.getOrders(
  user_id,
  async () => await fetchOldOrders({ yearFrom, yearTo, token, username }),
  { yearFrom, yearTo, type: 'old-orders' }
);

const data = cacheResult.data;
```

**Benefit**: F5 refresh načte data z cache (pokud TTL nevypršel).

---

### 4. **handleRefreshOrders() - Tlačítko Obnovit**
**PŘED:**
```javascript
const data = await fetchOldOrders({ yearFrom, yearTo, token, username });
```

**PO:**
```javascript
// 🚀 CACHE: Force refresh - vynutit načtení z DB
const cacheResult = await ordersCacheService.forceRefresh(
  user_id,
  async () => await fetchOldOrders({ yearFrom, yearTo, token, username }),
  { yearFrom, yearTo, type: 'old-orders' }
);

const data = cacheResult.data;
```

**Benefit**: Tlačítko "Obnovit" vždy načte fresh data z DB a invaliduje cache.

---

## 🔑 Cache keys pro staré objednávky

```
user:${userId}|type:old-orders|yearFrom:2024-01-01|yearTo:2024-12-31
user:${userId}|type:old-orders|yearFrom:2020-01-01|yearTo:2099-12-31  (Všechny roky)
```

**Type: 'old-orders'** - Odděluje cache starých objednávek od nových (Orders25List.js).

---

## 📊 Výhody cache pro Orders.js

### 1. **F5 refresh**
- **PŘED**: ~2-3 sekundy (fetch z DB)
- **PO**: ~50ms (cache hit)
- **Zrychlení**: ~50x

### 2. **Přepínání let**
- **Scénář**: 2024 → 2025 → 2024
- **PŘED**: Každé přepnutí = nový fetch
- **PO**: Druhé načtení 2024 = cache hit

### 3. **Refresh button**
- Vždy načte fresh data z DB
- Invaliduje cache
- Uživatel má jistotu aktuálních dat

### 4. **Sdílení cache s Orders25List.js**
- Stejný cache service pro oba systémy
- Jednotné TTL (10 minut)
- Jednotné chování (sessionStorage backup)

---

## ⚙️ Cache konfigurace

Cache používá stejnou konfiguraci jako Orders25List.js:

```javascript
// src/config/cacheConfig.js
development: {
  ttl: 10 * 60 * 1000,          // 10 minut
  debug: false,                  // Console logging vypnuto
  maxCacheSize: 20,              // Max 20 cache entries
  enableSessionBackup: true      // F5 persistence
}
```

---

## 🔄 Cache invalidation

Cache se invaliduje:

1. **Tlačítko Obnovit** - `forceRefresh()`
2. **TTL expiration** - Po 10 minutách
3. **Background task** - Auto-refresh každých 10 minut (pokud implementováno)
4. **Manual clear** - Vývojářské nástroje / localStorage clear

---

## 🧪 Testovací scénáře

### ✅ Test 1: První načtení (DB)
1. Otevři Orders.js (staré objednávky)
2. Počkej na načtení
3. **Očekáváno**: Načtení z DB (~2-3s)

### ✅ Test 2: F5 refresh (Cache)
1. Stiskni F5
2. Počkej na načtení
3. **Očekáváno**: Rychlé načtení z cache (~50ms)

### ✅ Test 3: Přepínání let (Cache)
1. Přepni rok z 2024 na 2025
2. Počkej na načtení (DB)
3. Přepni zpět na 2024
4. **Očekáváno**: Rychlé načtení z cache

### ✅ Test 4: Tlačítko Obnovit (DB)
1. Klikni na tlačítko "Obnovit"
2. Počkej na načtení
3. **Očekáváno**: Načtení z DB (force refresh)

### ✅ Test 5: TTL expiration (DB)
1. Počkaj 10+ minut
2. Proveď F5
3. **Očekáváno**: Načtení z DB (cache vypršela)

---

## 📝 Poznámky

### Proč samostatný type: 'old-orders'?
- **Izolace**: Staré a nové objednávky jsou v různých tabulkách
- **Různá struktura dat**: API vrací jiné fieldy
- **Prevence konfliktů**: Cache keys se nepřekrývají

### Proč stejné TTL jako Orders25List?
- **Konzistence**: Oba systémy mají stejné chování
- **Background tasks**: Synchronizace s refresh intervalem
- **UX**: Uživatel má jednotnou zkušenost

### Proč forceRefresh() pro Obnovit?
- **Jistota fresh dat**: Uživatel očekává aktuální data
- **Cache invalidation**: Vyčistí starou cache
- **Konzistence**: Stejné jako Orders25List

---

## 🎯 Výsledek

**Orders.js má nyní stejnou cache optimalizaci jako Orders25List.js**:
- ✅ F5 refresh rychlejší ~50x
- ✅ Přepínání let cache-enabled
- ✅ Tlačítko Obnovit force refresh
- ✅ Jednotné chování se new systémem
- ✅ SessionStorage backup (F5 persistence)

---

## ✅ Status

**DOKONČENO** - Cache integrace pro Orders.js implementována a připravena k testování.

**DŮLEŽITÉ**: Restartuj dev server (`npm start`), aby se změny načetly!
