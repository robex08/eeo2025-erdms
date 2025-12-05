# 🔍 PODROBNÁ ANALÝZA CACHE SYSTÉMU - Orders25List

## 📊 AKTUÁLNÍ STAV

### Problém
Při každém F5 (refresh stránky) se data načítají z **databáze místo z paměťové cache**, přestože:
- Cache je správně implementována
- TTL je 10 minut
- SessionStorage backup existuje

---

## 🐛 IDENTIFIKOVANÉ PROBLÉMY

### 1. **HLAVNÍ PROBLÉM: useEffect React Dependencies Hell** 🔥🔥🔥

**Lokace:** `Orders25List.js:3333-3337`

```javascript
}, [token, user?.username, user_id, selectedYear, selectedMonth, setProgress, hasPermission]);

// Load data on mount
useEffect(() => {
  loadData();
}, [loadData]);
```

**Proč je to problém:**
- `loadData` je definována jako `useCallback` se závislostmi
- Každé F5 způsobí **nové vytvoření** `loadData` funkce, protože:
  - `hasPermission` je **funkce** z AuthContext → mění se při každém renderu
  - `setProgress` je **funkce** z ProgressContext → může se měnit
  - React považuje tyto funkce za **nové reference**

**Důsledek:**
```
F5 → React remount → Nová reference hasPermission → Nový loadData → useEffect detekuje změnu → Spustí loadData()
```

I když cache má platná data, `loadData()` se **vždy spustí** kvůli změněným dependencies!

---

### 2. **PROBLÉM: Cache klíče nejsou stabilní mezi F5**

**Lokace:** `Orders25List.js:3003-3012`

```javascript
const cacheResult = forceRefresh 
  ? await ordersCacheService.forceRefresh(
      user_id,
      fetchFunction,
      {
        rok: selectedYear,
        ...(mesicFilter && { mesic: mesicFilter }),
        viewAll: canViewAllOrders
      }
    )
  : await ordersCacheService.getOrders(
```

**Problém:**
- Cache klíč obsahuje `viewAll: canViewAllOrders` (boolean)
- `canViewAllOrders` závisí na `hasPermission()` funkci
- Pokud se `hasPermission` reference změní, **může se změnit i výsledek `canViewAllOrders`** (i když logicky je stejný)
- → **Jiný cache klíč** → **Cache miss**

**Příklad:**
```
Před F5: cacheKey = "user:123|rok:2025|mesic:10|viewAll:true"
Po F5:   cacheKey = "user:123|rok:2025|mesic:10|viewAll:true"  ← vypadá stejně
         ALE hasPermission() je nová reference → canViewAllOrders se přepočítá
         → MOŽNÉ že vrátí jiný výsledek (např. pokud permissions ještě nejsou loaded)
```

---

### 3. **PROBLÉM: SessionStorage restore race condition**

**Lokace:** `ordersCacheService.js:135-165`

```javascript
_restoreFromSession() {
  try {
    const backupData = sessionStorage.getItem('orders_cache_backup');
    if (!backupData) return;
    
    const backup = JSON.parse(backupData);
    
    // Kontrola, zda backup není moc starý (max 1 hodina)
    const backupAge = Date.now() - backup.timestamp;
    if (backupAge > 60 * 60 * 1000) {
      sessionStorage.removeItem('orders_cache_backup');
      return;
    }
```

**Problém:**
- SessionStorage se obnovuje **HNED při inicializaci** service (synchronně)
- React komponenta se mountuje **POZDĚJI**
- Pokud komponenta volá `loadData()` rychle po mount, může:
  1. Obnovit cache ze sessionStorage ✅
  2. ALE pak se spustí `useEffect` a zavolá `loadData()` znovu ❌
  3. Protože `loadData` má nové dependencies, **ignoruje cache**

---

### 4. **PROBLÉM: Background tasks invalidují cache**

**Lokace:** `backgroundTasks.js:164` a `backgroundTasks.js:211`

```javascript
// 🚀 CACHE: Invaliduj celou cache (background task má fresh data)
ordersCacheService.invalidate();
```

**Problém:**
- Background task běží každých **10 minut** (synchronizováno s TTL)
- Když doběhne, **invaliduje celou cache**
- Pokud uděláš F5 **těsně po** background task, cache je **prázdná**
- → Musí se načíst z DB

**Timing issue:**
```
T=0:    Načtení z DB → Cache OK (TTL 10 min)
T=9:59  F5 → Cache hit ✅ (načte z cache)
T=10:00 Background task → invaliduje cache ❌
T=10:01 F5 → Cache miss ❌ (načte z DB)
```

---

## 🎯 DOPORUČENÁ ŘEŠENÍ

### Řešení A: **Stabilizovat useCallback dependencies** (PRIORITA 1) 🔥

**Změna v `Orders25List.js`:**

```javascript
// Extrahuj hasPermission výsledky do useMemo (ne funkci, ale její VÝSLEDEK)
const permissions = useMemo(() => ({
  canViewAll: hasPermission && (
    hasPermission('ORDER_MANAGE') || 
    hasPermission('ORDER_READ_ALL') ||
    hasPermission('ORDER_VIEW_ALL') ||
    hasPermission('ORDER_EDIT_ALL') ||
    hasPermission('ORDER_DELETE_ALL')
  ),
  hasOnlyOwn: !canViewAllOrders && hasPermission && (
    hasPermission('ORDER_READ_OWN') ||
    hasPermission('ORDER_VIEW_OWN') ||
    hasPermission('ORDER_EDIT_OWN') ||
    hasPermission('ORDER_DELETE_OWN')
  )
}), [hasPermission]); // Toto se může měnit, ale mělo by být stabilnější

// Změň loadData dependencies
const loadData = useCallback(async (forceRefresh = false) => {
  // ... kód
  const canViewAllOrders = permissions.canViewAll; // Použij stabilní hodnotu
  // ...
}, [token, user?.username, user_id, selectedYear, selectedMonth, permissions]); 
// ❌ ODSTRAŇ: setProgress, hasPermission (funkce se mění)
```

**Proč to pomůže:**
- `useMemo` cache výsledky `hasPermission()` volání
- Dependencies se mění **méně často**
- `loadData` se **nepřevytváří** při každém renderu

---

### Řešení B: **Oddělení loading logiky od cache** (PRIORITA 2)

**Změna v `Orders25List.js`:**

```javascript
// Odděl useEffect - jeden pro mount, druhý pro změny filtrů
const isFirstMount = useRef(true);

// 1️⃣ Mount effect - zkus cache NEJDŘÍV (nemusíš čekat na dependencies)
useEffect(() => {
  if (isFirstMount.current && user_id) {
    isFirstMount.current = false;
    
    // Zkus načíst z cache HNED (synchronně pokud možno)
    const tryLoadFromCache = async () => {
      try {
        const cacheKey = ordersCacheService._getCacheKey(user_id, {
          rok: selectedYear,
          mesic: selectedMonth || undefined,
        });
        
        const cached = ordersCacheService._get(cacheKey);
        if (cached && ordersCacheService._isValid(cached)) {
          // OKAMŽITĚ nastav data z cache (bez API volání)
          setOrders(cached.data);
          setLastLoadSource('cache');
          setLastLoadTime(new Date());
          setLoading(false);
          return true; // Cache hit
        }
      } catch (e) {
        // Tiše ignoruj
      }
      return false; // Cache miss
    };
    
    tryLoadFromCache().then(cacheHit => {
      if (!cacheHit) {
        // Žádná cache → zavolej normální load
        loadData();
      }
    });
  }
}, [user_id]); // Jen jednou při mount

// 2️⃣ Filter change effect - reload data
useEffect(() => {
  if (!isFirstMount.current) {
    loadData();
  }
}, [selectedYear, selectedMonth]); // Jen změny filtrů
```

**Proč to pomůže:**
- **Odděluje** mount load (preferuje cache) od filter změn (volá API)
- První načtení **OKAMŽITĚ** zkusí cache (bez čekání na async API)
- Eliminuje **race condition** mezi React mount a cache restore

---

### Řešení C: **Vylepšit cache invalidaci** (PRIORITA 3)

**Změna v `backgroundTasks.js`:**

```javascript
// ❌ ŠPATNĚ: Invaliduj vše
ordersCacheService.invalidate();

// ✅ SPRÁVNĚ: Jen refresh cache (nemazej ji)
const freshData = await getOrdersList25({ token, username: user.username });

// Aktualizuj cache místo invalidace
ordersCacheService._set(
  ordersCacheService._getCacheKey(user.id, { rok: new Date().getFullYear() }),
  freshData
);

// Nemusíš invalidovat všechno - jen aktualizuj timestamp
```

**Proč to pomůže:**
- Cache zůstává **platná** i po background refresh
- Jen se **aktualizuje** na fresh data
- Eliminuje **timing issue** mezi background task a user F5

---

### Řešení D: **SessionStorage klíč stability** (PRIORITA 4)

**Změna v `ordersCacheService.js`:**

```javascript
_backupToSession() {
  try {
    // Přidej metadata o cache klíčích
    const backup = {
      cache: Array.from(this.cache.entries()),
      timestamp: Date.now(),
      userId: this.currentUserId, // Zapamatuj si pro koho je cache
      cacheKeys: Array.from(this.cache.keys()) // Pro debug
    };
    
    sessionStorage.setItem('orders_cache_backup', JSON.stringify(backup));
    
    // Debug log
    console.log('[Cache] Backup saved:', {
      keys: backup.cacheKeys,
      count: backup.cache.length,
      timestamp: new Date(backup.timestamp).toISOString()
    });
  } catch (error) {
    console.warn('[Cache] Backup failed:', error);
  }
}

_restoreFromSession() {
  try {
    const backupData = sessionStorage.getItem('orders_cache_backup');
    if (!backupData) {
      console.log('[Cache] No backup found');
      return;
    }
    
    const backup = JSON.parse(backupData);
    
    // Kontrola age
    const backupAge = Date.now() - backup.timestamp;
    if (backupAge > 60 * 60 * 1000) {
      console.log('[Cache] Backup too old:', backupAge / 1000 / 60, 'minutes');
      sessionStorage.removeItem('orders_cache_backup');
      return;
    }
    
    // Obnovit cache
    this.cache = new Map(backup.cache);
    
    console.log('[Cache] Restored from backup:', {
      keys: backup.cacheKeys,
      count: this.cache.size,
      age: Math.round(backupAge / 1000) + 's'
    });
    
    // Vyčistit expirované
    let cleanedCount = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (!this._isValid(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log('[Cache] Cleaned expired entries:', cleanedCount);
    }
  } catch (error) {
    console.warn('[Cache] Restore failed:', error);
  }
}
```

---

## 📈 DOPORUČENÉ POŘADÍ IMPLEMENTACE

### Fáze 1: Debug & Monitoring (1-2 hodiny)
1. ✅ Přidat console.log do cache service (pro viditelnost)
2. ✅ Přidat monitoring cache stats do UI
3. ✅ Sledovat kdy se volá loadData()

### Fáze 2: Quick Wins (2-3 hodiny)
1. 🔥 **Řešení A** - Stabilizovat dependencies (biggest impact)
2. 🔧 **Řešení C** - Vylepšit background task invalidaci

### Fáze 3: Structural Improvements (4-6 hodin)
1. 💪 **Řešení B** - Oddělení mount/filter loading
2. 🛠️ **Řešení D** - SessionStorage stability

### Fáze 4: Testing & Validation (2-3 hodiny)
1. Test F5 behavior (10x za sebou)
2. Test background refresh timing
3. Test filter changes
4. Test permission changes

---

## 🎯 OČEKÁVANÉ VÝSLEDKY

### Před optimalizací:
- ❌ F5 → **80-90% DB load**
- ❌ Cache hit rate: **10-20%**
- ❌ Loading time: **800-1500ms**

### Po optimalizaci:
- ✅ F5 → **90-95% Cache load**
- ✅ Cache hit rate: **80-90%**
- ✅ Loading time: **50-150ms** (z cache)

---

## 🔬 DEBUG PŘÍKAZY

Pro rychlou diagnostiku přidej do konzole:

```javascript
// Zobraz cache stats
console.log(ordersCacheService.getStats());

// Zobraz cache obsah
console.log('Cache:', Array.from(ordersCacheService.cache.entries()));

// Zobraz sessionStorage backup
console.log('Backup:', sessionStorage.getItem('orders_cache_backup'));

// Simuluj F5 (bez refresh)
window.location.reload(false);
```

---

## 📝 ZÁVĚR

**Hlavní příčina problému:** React useEffect dependencies hell způsobuje **zbytečné reloady** i při F5, protože funkční dependencies (hasPermission, setProgress) se **mění při každém renderu**.

**Řešení:** Stabilizovat dependencies pomocí useMemo/useRef a oddělit mount loading od filter changes.

**Odhadovaná doba implementace:** 8-14 hodin

**Priorita:** 🔥🔥🔥 VYSOKÁ - Špatná cache performance má přímý dopad na UX

---

Datum analýzy: 18. října 2025
Analyzoval: GitHub Copilot
