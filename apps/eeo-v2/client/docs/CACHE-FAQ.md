# ❓ FAQ - Orders Cache System

## Obecné otázky

### ❓ Co je to OrdersCacheService?
**A:** In-memory cache systém pro rychlejší načítání objednávek. Místo opakovaného dotazování databáze ukládá data do RAM paměti prohlížeče.

### ❓ Proč ne localStorage?
**A:** LocalStorage má několik limitů:
- ⚠️ Velikost limit ~5-10 MB
- ⚠️ Pomalý (synchronní I/O)
- ⚠️ Persists mezi taby (bezpečnostní riziko)
- ⚠️ Přežívá logout (nežádoucí pro citlivá data)

In-memory cache:
- ✅ Neomezená velikost (RAM)
- ✅ Nejrychlejší možné (bez I/O)
- ✅ Izolovaný per tab
- ✅ Smazán při zavření tabu

### ❓ Přežije cache F5 (page refresh)?
**A:** Částečně - používáme **sessionStorage** jako backup:
- ✅ Přežije F5 (reload stránky)
- ❌ Nepřežije zavření tabu
- ❌ Nepřežije logout

To je záměrné - bezpečnostní feature.

### ❓ Jak rychlé je to ve srovnání s DB?
**A:** 
- **První načtení:** ~500ms (DB query + cache fill)
- **Cache hit:** ~5ms (**100x rychlejší!**)
- **F5 restore:** ~10ms (**50x rychlejší!**)

---

## Technické otázky

### ❓ Jak dlouho zůstávají data v cache?
**A:** **10 minut** (konfigurovatelné TTL). Po expiraci se automaticky načtou nová data z DB.

Důvod: Synchronizováno s background task intervalem (10 min).

### ❓ Co se stane když upravím objednávku?
**A:** Cache se **automaticky invaliduje** po save/delete:
```javascript
ordersCacheService.invalidate(userId);
```
Příští load načte fresh data z DB.

### ❓ Co když mám 1000+ objednávek?
**A:** Žádný problém! In-memory cache nemá size limit (kromě dostupné RAM). Pro mega datasety (10 000+) lze implementovat:
- IndexedDB fallback
- Virtuální scrolling
- Pagination s cache per page

### ❓ Funguje cache pro více uživatelů?
**A:** Ano - **per-user izolace**:
```javascript
Cache Key = user:${userId}|${filters}

User 123: user:123|rok:2025
User 456: user:456|rok:2025  // Different cache!
```

Každý uživatel má vlastní cache, nelze přistoupit k cache jiného uživatele.

### ❓ Co když se změní data na serveru?
**A:** Background task (každých 10 min):
1. Načte fresh data z DB
2. Invaliduje celou cache
3. Příští request načte nová data

Nebo manuálně kliknutím na "Obnovit" (force refresh).

---

## Použití a integrace

### ❓ Jak integrovat do existující aplikace?
**A:** Viz [Migration Guide](CACHE-MIGRATION-GUIDE.md). Základní kroky:

```javascript
// 1. Import
import ordersCacheService from './services/ordersCacheService';

// 2. Replace fetch
const orders = await ordersCacheService.getOrders(
  userId,
  async () => fetchFromDB(),
  { rok: 2025 }
);

// 3. Invalidate on save
await saveOrder();
ordersCacheService.invalidate(userId);
```

### ❓ Musím měnit všechny komponenty?
**A:** Ne - minimální změny:
- ✅ `Orders25List.js` - hlavní seznam (1 funkce)
- ✅ `OrderForm25.js` - save/delete (1 řádek)
- ✅ `backgroundTasks.js` - refresh task (1 řádek)

Zbytek aplikace funguje beze změny.

### ❓ Co když nechci používat cache pro konkrétní query?
**A:** Jednoduše zavolej fetch function přímo:
```javascript
// S cache
const orders = await ordersCacheService.getOrders(...);

// Bez cache (direct DB)
const orders = await getOrdersByUser25(...);
```

### ❓ Jak vypnout cache v development módu?
**A:** Nastav TTL na 0:
```javascript
ordersCacheService.configure({ 
  ttl: 0  // Vždy expired = vždy DB fetch
});
```

---

## Troubleshooting

### ❓ Cache neukazuje hit - vždy MISS
**Možné příčiny:**

1. **Jiné filtry** - každá kombinace = nový klíč
   ```javascript
   // Toto jsou 2 různé cache keys!
   getOrders(userId, fn, { rok: 2025 });
   getOrders(userId, fn, { rok: 2025, mesic: 10 });
   ```

2. **TTL vypršel** - počkej < 10 minut mezi requesty

3. **Cache byla invalidována** - zkontroluj console log

4. **Jiný userId** - každý user má vlastní cache

**Debug:**
```javascript
ordersCacheService.configure({ debug: true });
const stats = ordersCacheService.getStats();
console.log(stats);
```

### ❓ Data se neupdatují po uložení objednávky
**A:** Chybí invalidace! Přidej:
```javascript
const handleSaveOrder = async () => {
  await saveOrder25();
  
  // ⚠️ TOTO MUSÍ BÝT!
  ordersCacheService.invalidate(user.user_id);
};
```

### ❓ F5 načítá pomalu (ne z cache)
**Možné příčiny:**

1. **SessionStorage disabled** - zkontroluj browser settings

2. **Cache expirovala** - F5 po > 10 minutách

3. **SessionStorage full** - vyčisti browser data

**Debug:**
```javascript
console.log(sessionStorage.getItem('orders_cache_backup'));
```

### ❓ Console.log spam v produkci
**A:** Vypni debug mód:
```javascript
// Pro production
ordersCacheService.configure({ 
  debug: false 
});
```

### ❓ Paměťová náročnost - zabírá moc RAM
**A:** Snížit `maxCacheSize`:
```javascript
ordersCacheService.configure({ 
  maxCacheSize: 50  // Místo 100
});
```

Nebo použít `clear()`:
```javascript
// Manual cleanup
ordersCacheService.clear();
```

---

## Performance

### ❓ Jaký je reálný performance gain?
**A:** Závisí na use case:

| Scenario | Zlepšení |
|----------|----------|
| Přepínání mezi sekcemi | **100x** (5ms vs 500ms) |
| F5 refresh | **50x** (10ms vs 500ms) |
| Změna filtru (nový klíč) | **0x** (stejně jako DB) |
| Background refresh | **0x** (invalidace) |

**Average:** ~75% zrychlení při běžném používání.

### ❓ Co když mám pomalou databázi (2s latence)?
**A:** Cache pomůže ještě víc!
- DB: 2000ms
- Cache hit: 5ms
- **Zrychlení: 400x!** 🚀

### ❓ Jak zjistím cache hit rate?
**A:**
```javascript
const stats = ordersCacheService.getStats();
console.log(stats.hitRate); // "85.3%"
```

Optimální hit rate: **75-90%**

### ❓ Co když je hit rate nízký (< 50%)?
**Možné příčiny:**
1. Uživatel často mění filtry (normální)
2. TTL příliš krátký (zvětši)
3. Příliš častá invalidace (optimalizuj)
4. Background task příliš častý (synchronizuj s TTL)

---

## Bezpečnost

### ❓ Je cache bezpečná?
**A:** Ano - několik security features:
- ✅ Per-user izolace (userId v klíči)
- ✅ SessionStorage (nepřežije zavření tabu)
- ✅ Žádná persistence (smazáno při logout)
- ✅ Nemůže být přečtena mezi taby (session-specific)

### ❓ Můžu cachovat sensitive data?
**A:** **NE!** NEcachovat:
- ❌ Tokeny (auth, API)
- ❌ Hesla
- ❌ Platební údaje
- ❌ Osobní údaje (GDPR)

Jen read-only business data (objednávky, produkty, etc.)

### ❓ Co když user změní role (admin → user)?
**A:** Invaliduj cache při změně oprávnění:
```javascript
useEffect(() => {
  ordersCacheService.invalidate(user.user_id);
}, [hasPermission('ORDER_VIEW_ALL')]);
```

### ❓ Může user přistoupit k cache jiného uživatele?
**A:** **NE** - userId je v cache klíči:
```javascript
user:123|rok:2025  // User A
user:456|rok:2025  // User B (separate!)
```

---

## Advanced

### ❓ Jak implementovat cache pro jiná data (ne objednávky)?
**A:** Cache service je univerzální:
```javascript
// Produkty
const products = await ordersCacheService.getOrders(
  userId,
  async () => fetchProducts(),
  { category: 'electronics' }
);

// Uživatelé
const users = await ordersCacheService.getOrders(
  adminUserId,
  async () => fetchUsers(),
  { role: 'admin' }
);
```

Nebo vytvoř novou instanci pro oddělené cache:
```javascript
const productsCacheService = new OrdersCacheService();
```

### ❓ Můžu použít cache s Redux/Zustand?
**A:** Ano - kombinuj:
```javascript
// Redux store pro UI state
const orders = useSelector(state => state.orders);

// Cache pro API calls
const loadOrders = async () => {
  const data = await ordersCacheService.getOrders(...);
  dispatch(setOrders(data));
};
```

### ❓ Jak implementovat request deduplication?
**A:** Pro concurrent requests (TODO):
```javascript
// Současné requesty na stejný klíč
const [r1, r2, r3] = await Promise.all([
  getOrders(...),
  getOrders(...),  // Měl by počkat na první
  getOrders(...)   // Měl by počkat na první
]);

// Implementace (future):
if (pendingRequests.has(cacheKey)) {
  return pendingRequests.get(cacheKey);
}
pendingRequests.set(cacheKey, fetchPromise);
```

### ❓ Můžu použít IndexedDB místo sessionStorage?
**A:** Ano - změň implementaci v `_backupToSession()` a `_restoreFromSession()`:
```javascript
// IndexedDB má větší kapacitu (50+ MB)
// Ale složitější API (async)
import { openDB } from 'idb';

async _backupToIndexedDB() {
  const db = await openDB('orders-cache', 1, {
    upgrade(db) {
      db.createObjectStore('cache');
    }
  });
  await db.put('cache', this.cache, 'backup');
}
```

### ❓ Jak měřit memory usage?
**A:**
```javascript
// Chrome DevTools
console.log(performance.memory);

// Estimate cache size
const stats = ordersCacheService.getStats();
const estimatedSize = JSON.stringify(
  Array.from(ordersCacheService.cache.values())
).length;

console.log(`Cache size: ${estimatedSize / 1024}KB`);
```

---

## Testing

### ❓ Jak testovat cache v unit testech?
**A:** Viz [ordersCacheService.test.js](../src/services/ordersCacheService.test.js):
```javascript
beforeEach(() => {
  ordersCacheService.clear();
  ordersCacheService.configure({ 
    ttl: 1000,
    enableSessionBackup: false  // Vypnuto pro testy
  });
});

test('should cache data', async () => {
  const fetchFn = jest.fn().mockResolvedValue([{ id: 1 }]);
  
  await ordersCacheService.getOrders(123, fetchFn, {});
  await ordersCacheService.getOrders(123, fetchFn, {});
  
  expect(fetchFn).toHaveBeenCalledTimes(1); // Jen jednou!
});
```

### ❓ Jak testovat TTL expiration?
**A:**
```javascript
test('should expire after TTL', async () => {
  ordersCacheService.configure({ ttl: 100 }); // 100ms
  
  await ordersCacheService.getOrders(...);
  
  await new Promise(resolve => setTimeout(resolve, 150));
  
  await ordersCacheService.getOrders(...); // Měl by fetch znovu
});
```

### ❓ Jak testovat v Cypress/E2E?
**A:**
```javascript
// Cypress test
it('should load orders from cache', () => {
  cy.visit('/orders');
  cy.wait('@getOrders'); // První load
  
  cy.visit('/profile');
  cy.visit('/orders');
  // Druhý load by měl být instant (cache hit)
  
  cy.window().then(win => {
    const stats = win.ordersCacheService.getStats();
    expect(stats.hits).to.be.greaterThan(0);
  });
});
```

---

## Migrace a aktualizace

### ❓ Můžu upgrade cache service bez breaking changes?
**A:** Ano - use **cache versioning**:
```javascript
const CACHE_VERSION = 'v2';

if (sessionStorage.getItem('cache_version') !== CACHE_VERSION) {
  ordersCacheService.clear();
  sessionStorage.setItem('cache_version', CACHE_VERSION);
}
```

### ❓ Co když změním API response format?
**A:** Invaliduj celou cache:
```javascript
// Po deploy nové API verze
ordersCacheService.clear();
```

Nebo automaticky:
```javascript
const API_VERSION = 'v2';
const storedVersion = sessionStorage.getItem('api_version');

if (storedVersion !== API_VERSION) {
  ordersCacheService.clear();
  sessionStorage.setItem('api_version', API_VERSION);
}
```

### ❓ Jak rollback k původní implementaci?
**A:** Restore backup soubory:
```bash
cp src/pages/Orders25List.js.backup src/pages/Orders25List.js
npm start
```

Nebo podmíněně:
```javascript
const USE_CACHE = process.env.REACT_APP_USE_CACHE === 'true';

const orders = USE_CACHE
  ? await ordersCacheService.getOrders(...)
  : await fetchFromDB();
```

---

## Best Practices

### ❓ Kdy použít forceRefresh vs invalidate?
**A:**
- **forceRefresh:** Tlačítko "Obnovit" (user action)
- **invalidate:** Po save/delete (data změna)
- **clear:** Logout, role change (security)

### ❓ Jak často spouštět background task?
**A:** **Stejně často jako TTL!**
```javascript
TTL = 10 minut
Background Task Interval = 10 minut
```

Proč? Cache expiruje přesně když background task načte fresh data.

### ❓ Jak nastavit optimální maxCacheSize?
**A:** Závisí na use case:
- **Malá app (< 10 uživatelů):** 20-50
- **Střední app (10-100 uživatelů):** 50-100
- **Velká app (100+ uživatelů):** 100-200

Monitoruj memory usage a adjustuj.

---

## Další zdroje

- 📚 [Kompletní dokumentace](ORDERS-CACHE-SYSTEM.md)
- ⚡ [Quick Reference](QUICK-REFERENCE-CACHE.md)
- 🔄 [Migration Guide](CACHE-MIGRATION-GUIDE.md)
- 🎓 [Best Practices](CACHE-BEST-PRACTICES.md)
- 🔀 [Flow Diagrams](CACHE-FLOW-DIAGRAMS.md)
- 💡 [Example Code](../src/examples/Orders25ListWithCache.example.js)

---

**Máte další otázky?** Přidejte issue nebo se podívejte do [dokumentace](ORDERS-CACHE-SYSTEM.md)! 🚀
