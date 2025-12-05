# Orders Cache System - Dokumentace

## 📋 Přehled

Implementace in-memory cache systému pro objednávky, která řeší problém zbytečného reloadování z databáze při:
- Stisknutí F5 (refresh stránky)
- Přepínání mezi sekcemi/stránkami
- Změně filtrů (rok, měsíc)

## 🎯 Klíčové vlastnosti

### ✅ In-Memory Cache
- **Rychlý přístup** - data v RAM, ne v localStorage
- **Bez size limitu** - localStorage má max ~5-10 MB
- **Per-user izolace** - každý uživatel má svoji cache
- **Per-filter cache** - různá cache pro různé filtry (rok, měsíc)

### ✅ TTL (Time To Live)
- **Automatická expirace** po 10 minutách (konfigurovatelné)
- **Synchronizace** s background task (10 min interval)
- **Smart invalidace** - vymaže jen potřebné části

### ✅ F5 Persistence
- **SessionStorage backup** - přežije F5
- **Nepřežije zavření tabu** - bezpečnostní izolace
- **Auto-cleanup** - vymaže expirované položky po restore

### ✅ Statistiky a monitoring
- Hit rate (cache využití)
- Počet hits/misses
- Debug logging

## 🚀 Použití

### 1. Základní načítání (s cache)

```javascript
import ordersCacheService from '../services/ordersCacheService';
import { getOrdersByUser25 } from '../services/api25orders';

// V komponentě Orders25List
const loadOrders = async () => {
  try {
    setLoading(true);
    
    // Fetch funkce (volá se jen při cache miss)
    const fetchFunction = async () => {
      return await getOrdersByUser25({
        token,
        username,
        userId: canViewAllOrders ? undefined : user_id,
        rok: selectedYear,
        ...(mesicFilter && { mesic: mesicFilter })
      });
    };
    
    // Načti z cache nebo DB
    const ordersData = await ordersCacheService.getOrders(
      user_id,           // ID uživatele pro cache klíč
      fetchFunction,     // Async funkce pro DB fetch
      {                  // Filtry pro cache klíč
        rok: selectedYear,
        mesic: mesicFilter,
        viewAll: canViewAllOrders
      }
    );
    
    setOrders(ordersData);
  } catch (error) {
    console.error('Failed to load orders:', error);
  } finally {
    setLoading(false);
  }
};
```

### 2. Force Refresh (tlačítko "Obnovit")

```javascript
const handleRefresh = async () => {
  try {
    setRefreshing(true);
    
    const fetchFunction = async () => {
      return await getOrdersByUser25({
        token,
        username,
        userId: canViewAllOrders ? undefined : user_id,
        rok: selectedYear,
        ...(mesicFilter && { mesic: mesicFilter })
      });
    };
    
    // Force refresh - ignoruje cache
    const freshOrders = await ordersCacheService.forceRefresh(
      user_id,
      fetchFunction,
      {
        rok: selectedYear,
        mesic: mesicFilter,
        viewAll: canViewAllOrders
      }
    );
    
    setOrders(freshOrders);
    toast.success('Objednávky aktualizovány');
  } catch (error) {
    console.error('Refresh failed:', error);
    toast.error('Načtení selhalo');
  } finally {
    setRefreshing(false);
  }
};
```

### 3. Invalidace po změně dat (save/delete)

```javascript
// Po uložení objednávky v OrderForm25
const handleSaveOrder = async (orderData) => {
  try {
    await saveOrder25(orderData);
    
    // Invaliduj cache pro aktuálního uživatele
    ordersCacheService.invalidate(user_id);
    
    // Nebo chytřejší invalidace konkrétní objednávky
    ordersCacheService.invalidateOrder(
      orderData.id,
      user_id,
      orderData // pro kontrolu objednatel_id
    );
    
    toast.success('Objednávka uložena');
  } catch (error) {
    console.error('Save failed:', error);
  }
};
```

### 4. Integrace s Background Task

```javascript
// V backgroundTasks.js - upravit createOrdersRefreshTask
export const createOrdersRefreshTask = (onOrdersRefreshed) => ({
  name: 'autoRefreshOrders',
  interval: 10 * 60 * 1000, // 10 minut - stejné jako cache TTL
  
  callback: async () => {
    try {
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();
      
      // Volání API
      const response = await getOrdersList25({ token, username: user.username });
      
      // Invaliduj celou cache - background task načetl nová data
      ordersCacheService.invalidate();
      
      // Callback pro refresh UI
      if (onOrdersRefreshed) {
        onOrdersRefreshed(response);
      }
      
      return {
        ordersCount: response?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[OrdersRefresh] Failed:', error);
      throw error;
    }
  }
});
```

## 🔧 Konfigurace

```javascript
// Změnit výchozí nastavení
ordersCacheService.configure({
  ttl: 15 * 60 * 1000,        // 15 minut místo 10
  enableSessionBackup: true,   // Povolit F5 persistence
  maxCacheSize: 200,           // Maximální počet queries v cache
  debug: false                 // Vypnout debug logging v produkci
});
```

## 📊 Statistiky

```javascript
// Získat statistiky použití
const stats = ordersCacheService.getStats();
console.log(stats);
// {
//   hits: 45,
//   misses: 5,
//   invalidations: 3,
//   refreshes: 2,
//   hitRate: '90.0%',
//   cacheSize: 12,
//   totalRequests: 50
// }

// Reset statistik
ordersCacheService.resetStats();

// Kompletní vyčištění (včetně sessionStorage)
ordersCacheService.clear();
```

## 🔄 Workflow

### Při prvním načtení stránky:
1. ✅ Zkus restore z sessionStorage (pokud F5)
2. ✅ Cache miss → fetch z DB
3. ✅ Ulož do cache + sessionStorage

### Při přepínání mezi sekcemi:
1. ✅ Zkontroluj cache (stejný user + filtry)
2. ✅ Cache hit → vrať data z RAM (instant!)
3. ✅ Cache miss → fetch z DB

### Při F5 (page refresh):
1. ✅ Restore cache ze sessionStorage
2. ✅ Vyčisti expirované položky (TTL check)
3. ✅ Použij validní cache data

### Při background task (každých 10 min):
1. ✅ Fetch nová data z DB
2. ✅ Invaliduj celou cache
3. ✅ Ulož nová data do cache

### Při uložení/smazání objednávky:
1. ✅ Save do DB
2. ✅ Invaliduj cache pro uživatele
3. ✅ Trigger background task (optional)

## 🛡️ Bezpečnostní aspekty

### Per-User Izolace
- ✅ Každý user má oddělenou cache
- ✅ Cache klíč obsahuje userId
- ✅ Nelze přistoupit k cache jiného uživatele

### Session vs Local Storage
- ✅ **sessionStorage** (přežije F5, nepřežije zavření tabu)
- ❌ **localStorage** (přežije vše, ale lze číst mezi taby)
- Důvod: sessionStorage je bezpečnější pro citlivá data

### Invalidace při změně oprávnění
```javascript
// Pokud uživatel změní role (admin → user)
useEffect(() => {
  // Clear cache když se změní oprávnění
  ordersCacheService.invalidate(user_id);
}, [hasPermission('ORDER_VIEW_ALL')]);
```

## 🎨 Best Practices

### ✅ DO:
- Používat cache pro read operace
- Invalidovat po write operacích
- Synchronizovat TTL s background task intervalem
- Používat forceRefresh pro tlačítko "Obnovit"
- Logovat cache stats v dev módu

### ❌ DON'T:
- Nečachovat data s vysokou frekvencí změn
- Nepoužívat pro real-time aktualizace
- Nezapomínat invalidovat po změně dat
- Nepoužívat pro autentizační tokeny

## 🐛 Debugging

```javascript
// Zapnout debug mód
ordersCacheService.configure({ debug: true });

// Sledovat cache operations v console
// [OrdersCache] HIT: user:123|rok:2025 (age: 45s, accessed: 3x)
// [OrdersCache] MISS: user:123|rok:2025|mesic:10 - fetching from DB...
// [OrdersCache] INVALIDATE USER 123: cleared 5 entries
```

## 📈 Výhody

### Před (bez cache):
```
Načtení stránky: 500ms (DB query)
Přepnutí sekce: 500ms (DB query)
F5: 500ms (DB query)
Změna filtru: 500ms (DB query)
```

### Po (s cache):
```
Načtení stránky: 500ms (DB query) → cache fill
Přepnutí sekce: ~5ms (RAM cache hit) ⚡
F5: ~10ms (sessionStorage restore) ⚡
Změna filtru: 500ms (DB query, nový klíč) → cache fill
```

**Zrychlení: 100x při cache hit!**

## 🔜 Možná vylepšení

1. **LRU (Least Recently Used) eviction** ✅ Implementováno
2. **Prefetching** - předběžné načtení příštího měsíce ✅ Implementováno
3. **Partial updates** - aktualizace jen změněných objednávek
4. **IndexedDB fallback** - pro větší data (>100MB)
5. **Service Worker cache** - offline podpora
6. **Redux/Zustand integrace** - centrální state management

## 📝 Poznámky

- Cache service je **singleton** - sdílený napříč komponentami
- Session backup je max **1 hodinu starý** (auto-cleanup)
- LRU eviction při překročení **maxCacheSize**
- TTL se synchronizuje s **background task intervalem**

---

**Autor:** OrdersCacheService v1.0  
**Datum:** 2025-10-17  
**Licence:** Pro interní použití v r-app-zzs-eeo-25
