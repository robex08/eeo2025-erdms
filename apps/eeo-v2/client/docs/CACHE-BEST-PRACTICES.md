# Cache Solutions - Srovnání a Best Practices

## 📊 Srovnání různých cache řešení pro React

| Řešení | Rychlost | Persistence | Size Limit | Complexity | Use Case |
|--------|----------|-------------|------------|------------|----------|
| **In-Memory Cache** ⭐ | ⚡⚡⚡ Nejrychlejší | ❌ Ztráta při refresh | ♾️ Neomezený | 🟢 Nízká | **Naše volba** |
| **SessionStorage** | ⚡⚡ Rychlý | ⚠️ Jen do zavření tabu | ~5-10 MB | 🟢 Nízká | Backup pro F5 |
| **LocalStorage** | ⚡⚡ Rychlý | ✅ Trvalý | ~5-10 MB | 🟢 Nízká | ❌ Nevhodný pro velká data |
| **IndexedDB** | ⚡ Střední | ✅ Trvalý | ~50+ MB | 🔴 Vysoká | Offline apps, velká data |
| **Redux/Zustand** | ⚡⚡⚡ Velmi rychlý | ❌ Ztráta při refresh | ♾️ Neomezený | 🟡 Střední | State management |
| **React Query** | ⚡⚡ Rychlý | ⚠️ Konfigurovatelný | ♾️ Neomezený | 🟡 Střední | Auto refetch, optimistic updates |
| **SWR** | ⚡⚡ Rychlý | ⚠️ Konfigurovatelný | ♾️ Neomezený | 🟡 Střední | Real-time data |

## 🎯 Proč In-Memory Cache?

### ✅ Výhody našeho řešení:
1. **Nejrychlejší** - data v RAM, ne I/O operace
2. **Bez size limitu** - localStorage má max 5-10 MB
3. **Jednoduchá implementace** - žádné další dependencies
4. **SessionStorage backup** - přežije F5
5. **Per-user izolace** - bezpečnost
6. **TTL auto-expiration** - synchronizace s background task
7. **LRU eviction** - automatické čištění
8. **Debug friendly** - console logging

### ⚠️ Nevýhody:
1. ❌ Ztráta při hard refresh (kromě sessionStorage backup)
2. ❌ Ztráta při zavření tabu (záměrné - bezpečnost)
3. ❌ Není sdílená mezi taby (záměrné - bezpečnost)

---

## 🏆 Naše hybridní řešení: In-Memory + SessionStorage

```javascript
┌─────────────────────────────────────────────────────────┐
│                    USER REQUEST                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Check In-Memory Cache │
                └───────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
            Cache HIT              Cache MISS
                │                       │
                ▼                       ▼
        ┌──────────────┐      ┌─────────────────┐
        │ Return Data  │      │  Fetch from DB  │
        │  (5-10 ms)   │      │   (500+ ms)     │
        └──────────────┘      └─────────────────┘
                                        │
                                        ▼
                            ┌─────────────────────┐
                            │ Store in Memory     │
                            │ + SessionStorage    │
                            └─────────────────────┘
                                        │
                                        ▼
                            ┌─────────────────────┐
                            │   Return Data       │
                            └─────────────────────┘

F5 REFRESH:
────────────
                ┌───────────────────────┐
                │ Check SessionStorage  │
                └───────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Restore to Memory    │
                │  Clean Expired        │
                └───────────────────────┘
```

---

## 📚 Best Practices

### 1. Kdy používat cache?

✅ **ANO:**
- Read-heavy operace (seznam objednávek)
- Data, která se nemění často
- Expensive DB queries
- Přepínání mezi stránkami
- Filtrování/sorting (client-side)

❌ **NE:**
- Real-time data (chat messages)
- Autentizační tokeny (bezpečnost)
- Write operace (save/delete)
- Data s vysokou frekvencí změn
- Sensitive data (hesla, platební info)

### 2. Synchronizace TTL s Background Tasks

```javascript
// ⚠️ DŮLEŽITÉ: TTL = Background Task Interval
const CACHE_TTL = 10 * 60 * 1000;           // 10 minut
const BACKGROUND_TASK_INTERVAL = 10 * 60 * 1000;  // 10 minut

// Proč?
// - Cache expiruje přesně když background task načte nová data
// - Žádná kolize mezi background refresh a cache
// - Konzistentní data
```

### 3. Invalidace strategie

```javascript
// Okamžitá invalidace (save/delete)
ordersCacheService.invalidate(user_id);

// Smart invalidace (změna jedné objednávky)
ordersCacheService.invalidateOrder(order_id, user_id, orderData);

// Globální invalidace (background refresh)
ordersCacheService.invalidate();

// Granulární invalidace (specifický filtr)
ordersCacheService.invalidate(user_id, { rok: 2025, mesic: 10 });
```

### 4. Cache klíče design

```javascript
// ✅ DOBRÝ design - obsahuje všechny důležité parametry
const cacheKey = `user:${userId}|rok:${rok}|mesic:${mesic}|viewAll:${viewAll}`;

// ❌ ŠPATNÝ design - chybí parametry, kolize
const cacheKey = `user:${userId}`;  // Všechny filtry sdílí stejný klíč!
```

### 5. Prefetching strategie

```javascript
// Prefetch po úspěšném načtení
useEffect(() => {
  if (orders.length > 0 && !loading) {
    // Počkej 2 sekundy a prefetchni příští měsíc
    const timer = setTimeout(() => {
      ordersCacheService.prefetch(user_id, fetchNextMonth, { 
        rok: nextYear, 
        mesic: nextMonth 
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }
}, [orders, loading]);
```

### 6. Error handling

```javascript
// ✅ DOBRÝ error handling
try {
  const orders = await ordersCacheService.getOrders(
    user_id,
    fetchFunction,
    filters
  );
  setOrders(orders);
} catch (error) {
  console.error('Failed to load orders:', error);
  // Fallback - zkus načíst přímo z DB bez cache
  try {
    const fallbackOrders = await fetchFunction();
    setOrders(fallbackOrders);
  } catch (fallbackError) {
    toast.error('Načtení objednávek selhalo');
  }
}
```

### 7. Development vs Production

```javascript
// index.js nebo App.js
if (process.env.NODE_ENV === 'production') {
  ordersCacheService.configure({
    debug: false,              // ❌ Vypnout logging
    ttl: 10 * 60 * 1000,       // 10 minut
    maxCacheSize: 100
  });
} else {
  ordersCacheService.configure({
    debug: true,               // ✅ Zapnout logging
    ttl: 1 * 60 * 1000,        // 1 minuta (rychlejší testování)
    maxCacheSize: 20           // Menší cache (snadnější debug)
  });
}
```

### 8. Monitoring cache performance

```javascript
// Přidat do DevTools / Debug panel
const CacheMonitor = () => {
  const [stats, setStats] = useState(ordersCacheService.getStats());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(ordersCacheService.getStats());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="cache-monitor">
      <h3>Cache Stats</h3>
      <div>Hit Rate: {stats.hitRate}</div>
      <div>Hits: {stats.hits} / Misses: {stats.misses}</div>
      <div>Cache Size: {stats.cacheSize}</div>
      <div>Total Requests: {stats.totalRequests}</div>
      <button onClick={() => ordersCacheService.clear()}>
        Clear Cache
      </button>
    </div>
  );
};
```

---

## 🚫 Anti-Patterns (Co NEDĚLAT)

### ❌ 1. Cache pro write operace
```javascript
// ŠPATNĚ - cachovat save/delete
const saveOrder = async (order) => {
  const result = await ordersCacheService.getOrders(...); // ❌ NEPOUŽÍVAT
  // ...
};
```

### ❌ 2. Zapomenout invalidaci
```javascript
// ŠPATNĚ - save bez invalidace
const saveOrder = async (order) => {
  await saveOrder25(order);
  // Zapomněli jsme invalidovat cache! ❌
  // Cache teď obsahuje stará data!
};
```

### ❌ 3. Nekonzistentní cache klíče
```javascript
// ŠPATNĚ - jiné pořadí parametrů = jiný klíč
getOrders(userId, fn, { rok: 2025, mesic: 10 });
getOrders(userId, fn, { mesic: 10, rok: 2025 }); // ❌ Jiný klíč!

// DOBŘE - service je normalizuje automaticky ✅
```

### ❌ 4. Ukládat sensitive data
```javascript
// ŠPATNĚ - cache pro tokeny
ordersCacheService.getOrders('token', () => fetchToken()); // ❌ NEBEZPEČNÉ
```

### ❌ 5. Neošetřit F5 edge cases
```javascript
// ŠPATNĚ - předpokládat, že cache vždy existuje
const orders = ordersCacheService._get(cacheKey).data; // ❌ Může být undefined!

// DOBŘE - použít getOrders s fallback
const orders = await ordersCacheService.getOrders(userId, fetchFunction); // ✅
```

---

## 🎓 Advanced patterns

### 1. Conditional caching
```javascript
const loadOrders = async () => {
  // Cache jen pro běžné uživatele, ne pro adminy
  if (isAdmin) {
    return await fetchFunction(); // Přímý DB fetch
  } else {
    return await ordersCacheService.getOrders(...); // Cache
  }
};
```

### 2. Progressive cache warming
```javascript
// Postupně předběžně načíst všechny měsíce
const warmCache = async () => {
  for (let mesic = 1; mesic <= 12; mesic++) {
    await ordersCacheService.prefetch(user_id, 
      () => fetchOrders({ mesic }),
      { rok: 2025, mesic }
    );
    await new Promise(resolve => setTimeout(resolve, 1000)); // Throttle
  }
};
```

### 3. Cache versioning
```javascript
// Pokud se změní API schema, vyčistit starou cache
const API_VERSION = 'v2';
const storedVersion = sessionStorage.getItem('api_version');

if (storedVersion !== API_VERSION) {
  ordersCacheService.clear();
  sessionStorage.setItem('api_version', API_VERSION);
}
```

---

## 📈 Očekávaný Performance Gain

### Před (bez cache):
```
Load Orders:        500 ms  (DB query)
Switch Section:     500 ms  (DB query)
F5 Refresh:        500 ms  (DB query)
Change Filter:     500 ms  (DB query)
────────────────────────────────────
Avg Response Time:  500 ms
User Experience:    🐌 Slow
```

### Po (s cache):
```
Load Orders:        500 ms  (DB query, cache fill)
Switch Section:       5 ms  (memory cache hit) ⚡
F5 Refresh:          10 ms  (sessionStorage restore) ⚡
Change Filter:      500 ms  (DB query, new key, cache fill)
────────────────────────────────────
Avg Response Time:  ~130 ms (75% improvement)
User Experience:    ⚡ Fast & Smooth
```

**ROI:** 100x rychlejší při cache hits!

---

## 🔮 Budoucí vylepšení

1. **Service Worker cache** - offline podpora
2. **IndexedDB fallback** - pro velmi velká data (1000+ objednávek)
3. **Partial updates** - aktualizovat jen změněné objednávky
4. **WebSocket integration** - real-time invalidace
5. **Shared Worker** - sdílená cache mezi taby (optional)
6. **Compression** - gzip cache entries před uložením
7. **Metrics export** - export stats do monitoring systému

---

**Závěr:** In-Memory cache s SessionStorage backup je **ideální řešení** pro vaše požadavky - rychlý, jednoduchý, bezpečný a efektivní! 🚀
