# 🚀 Quick Start: Integrace Orders Cache

## 1️⃣ Orders25List.js - Hlavní seznam objednávek

### Import
```javascript
import ordersCacheService from '../services/ordersCacheService';
```

### Nahradit loadOrders / fetchOrders funkci

**PŘED (bez cache):**
```javascript
const loadOrders = async () => {
  try {
    setLoading(true);
    
    const ordersData = await getOrdersByUser25({
      token,
      username,
      userId: canViewAllOrders ? undefined : user_id,
      rok: selectedYear,
      ...(mesicFilter && { mesic: mesicFilter })
    });
    
    setOrders(ordersData);
  } catch (error) {
    console.error('Failed to load orders:', error);
  } finally {
    setLoading(false);
  }
};
```

**PO (s cache):**
```javascript
const loadOrders = async () => {
  try {
    setLoading(true);
    
    // Fetch funkce - volá se jen při cache miss
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
      user_id,
      fetchFunction,
      {
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

### Tlačítko "Obnovit"

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
    
    // Force refresh
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
  } finally {
    setRefreshing(false);
  }
};
```

---

## 2️⃣ OrderForm25.js - Formulář objednávky

### Po uložení objednávky

```javascript
const handleSaveOrder = async (orderData) => {
  try {
    // Ulož do DB
    await saveOrder25(orderData);
    
    // NOVÉ: Invaliduj cache
    ordersCacheService.invalidate(user.user_id);
    
    // Nebo chytřejší invalidace
    ordersCacheService.invalidateOrder(orderData.id, user.user_id, orderData);
    
    toast.success('Objednávka uložena');
  } catch (error) {
    console.error('Save failed:', error);
  }
};
```

### Po smazání objednávky

```javascript
const handleDeleteOrder = async (orderId) => {
  try {
    await deleteOrder25(orderId);
    
    // NOVÉ: Invaliduj cache
    ordersCacheService.invalidate(user.user_id);
    
    toast.success('Objednávka smazána');
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

---

## 3️⃣ backgroundTasks.js - Background refresh

### Upravit createOrdersRefreshTask

```javascript
export const createOrdersRefreshTask = (onOrdersRefreshed) => ({
  name: 'autoRefreshOrders',
  interval: 10 * 60 * 1000, // 10 minut - stejné jako cache TTL!
  
  callback: async () => {
    try {
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();
      
      // Načti z DB
      const response = await getOrdersList25({ token, username: user.username });
      
      // NOVÉ: Invaliduj celou cache (background task má fresh data)
      ordersCacheService.invalidate();
      
      // Callback pro UI refresh
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

---

## 4️⃣ Konfigurace (volitelné)

### V App.js nebo index.js

```javascript
import ordersCacheService from './services/ordersCacheService';

// Produkční nastavení
if (process.env.NODE_ENV === 'production') {
  ordersCacheService.configure({
    debug: false,              // Vypnout console.log
    ttl: 10 * 60 * 1000,       // 10 minut
    enableSessionBackup: true,  // Povolit F5 persistence
    maxCacheSize: 100           // Max 100 queries v cache
  });
} else {
  // Dev nastavení
  ordersCacheService.configure({
    debug: true,               // Zapnout debug logging
    ttl: 5 * 60 * 1000,        // 5 minut (kratší pro testování)
    enableSessionBackup: true,
    maxCacheSize: 50
  });
}
```

---

## 5️⃣ Zobrazení cache stats (DEV mód)

```javascript
// V Orders25List.js
{process.env.NODE_ENV === 'development' && (
  <div style={{ fontSize: '12px', opacity: 0.6 }}>
    Cache Stats: {(() => {
      const stats = ordersCacheService.getStats();
      return `${stats.hitRate} (${stats.hits}/${stats.totalRequests})`;
    })()}
  </div>
)}
```

---

## 6️⃣ Testing

### Test 1: Cache hit při přepínání sekcí
1. Načti objednávky (rok 2025)
2. Přejdi na jinou stránku (např. Uživatelé)
3. Vrať se zpět na Objednávky
4. ✅ Mělo by načíst INSTANT (z cache, ne z DB)

### Test 2: F5 persistence
1. Načti objednávky
2. Stiskni F5 (refresh stránky)
3. ✅ Mělo by načíst rychle (z sessionStorage)

### Test 3: TTL expiration
1. Načti objednávky
2. Počkej 10 minut (nebo změň TTL na 10s)
3. Přepni sekci a vrať se
4. ✅ Mělo by načíst z DB (cache expirovala)

### Test 4: Invalidace po save
1. Načti objednávky (cache fill)
2. Uprav objednávku a ulož
3. ✅ Cache by měla být invalidována
4. ✅ Další load načte z DB

### Test 5: Force refresh
1. Načti objednávky (cache fill)
2. Klikni "Obnovit"
3. ✅ Mělo by načíst z DB (ignore cache)

---

## 📊 Očekávané výsledky

### Console output v DEV módu:

```
[OrdersCache] Restored from session: 3 entries (cleaned 1 expired)
[OrdersCache] HIT: user:123|rok:2025 (age: 45s, accessed: 3x)
[OrdersCache] MISS: user:123|rok:2025|mesic:10 - fetching from DB...
[OrdersCache] SET: user:123|rok:2025|mesic:10 (15 orders)
[OrdersCache] FORCE REFRESH: user:123|rok:2025
[OrdersCache] INVALIDATE USER 123: cleared 5 entries
```

### Cache stats:

```
{
  hits: 25,
  misses: 5,
  invalidations: 2,
  refreshes: 1,
  hitRate: '83.3%',
  cacheSize: 8,
  totalRequests: 30
}
```

---

## ⚠️ Důležité poznámky

1. **Synchronizace TTL**: Cache TTL (10 min) = Background task interval (10 min)
2. **Invalidace po write**: VŽDY invalidovat cache po save/delete
3. **SessionStorage**: Přežije F5, nepřežije zavření tabu (bezpečnost)
4. **Per-user izolace**: Každý user má svou cache
5. **Force refresh**: Tlačítko "Obnovit" = forceRefresh (ignore cache)

---

## 🆘 Troubleshooting

### Cache se neinvaliduje po save
```javascript
// Zkontrolovat, zda je volána invalidace
ordersCacheService.invalidate(user.user_id);
```

### Cache stats neukazují hit
```javascript
// Zapnout debug mód
ordersCacheService.configure({ debug: true });
// Sledovat console.log
```

### F5 nenačte z cache
```javascript
// Zkontrolovat sessionStorage
console.log(sessionStorage.getItem('orders_cache_backup'));

// Zkontrolovat TTL
const stats = ordersCacheService.getStats();
console.log('Cache size:', stats.cacheSize);
```

### Cache zabírá moc paměti
```javascript
// Snížit maxCacheSize
ordersCacheService.configure({ maxCacheSize: 50 });

// Nebo vyčistit cache
ordersCacheService.clear();
```

---

**✅ Po integraci by mělo být:**
- Přepínání mezi sekcemi: **instant** (5-10ms)
- F5 refresh: **rychlé** (10-20ms)
- Změna filtru (nový klíč): **normální** (500ms)
- Background refresh: **každých 10 min** (auto invalidace)
- Tlačítko "Obnovit": **vždy fresh z DB**
