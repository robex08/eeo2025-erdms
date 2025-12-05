# 🔔 PLÁN REFAKTORU NOTIFIKAČNÍHO SYSTÉMU

**Datum:** 25. října 2025  
**Důvod:** Míchání starého (localStorage-first) a nového (DB API-first) řešení způsobuje duplicity a konflikty

---

## 📊 SOUČASNÝ STAV - IDENTIFIKOVANÉ PROBLÉMY

### 🔴 **PROBLÉM #1: Duplikace TODO alarmů**

**Popis:**
- TODO alarmy se vytváří **DVAKRÁT**:
  1. Lokálně přes `saveTodoAlarmToLocalStorage()` v `useTodoAlarms.js`
  2. Odesláním na backend přes `sendTodoAlarmToBackend()` → `notifyTodoAlarm()`
  3. Backend je uloží do DB a vrátí zpět
  4. Zobrazí se 2x (1x lokální + 1x z API)

**Soubory:**
- `src/hooks/useTodoAlarms.js` - vytváří lokální kopie
- `src/services/notificationsApi.js` - odesílá na backend
- `src/components/NotificationBell.js` - pokouší se filtrovat duplikáty

**Řešení:** ✅ Již částečně opraveno - odstraněna `saveTodoAlarmToLocalStorage()`

---

### 🔴 **PROBLÉM #2: Míchání localStorage a DB API**

**Současný chaos:**

```javascript
// ❌ ŠPATNĚ - Míchání localStorage a API

// useTodoAlarms.js - VYTVÁŘÍ lokálně
saveTodoAlarmToLocalStorage(notification, userId);
sendTodoAlarmToBackend(task, userId, ...);  // A zároveň odesílá na BE

// NotificationBell.js - AKTUALIZUJE lokálně
updateTodoAlarmNotificationInLocalStorage(id, data, userId);
markNotificationAsRead(id);  // A zároveň volá API

// useTodoAlarms.js - NAČÍTÁ z localStorage
loadTodoAlarmNotificationsFromLocalStorage(userId);

// NotificationBell.js - NAČÍTÁ z API
getNotificationsList({ limit: 10 });

// Výsledek: Duplicity, konflikty, nejasné "co je pravda"
```

**Soubory s localStorage operacemi:**
- ❌ `src/hooks/useTodoAlarms.js` - `loadTodoAlarmNotificationsFromLocalStorage()`, ~~`saveTodoAlarmToLocalStorage()`~~
- ❌ `src/utils/todoAlarmStorage.js` - **DEPRECATED** - starý systém (přečtené/smazané)
- ⚠️ `src/components/NotificationBell.js` - `updateTodoAlarmNotificationInLocalStorage()` pro cache
- ⚠️ `src/components/NotificationBell.js` - `hidden notifications` localStorage

---

### 🔴 **PROBLÉM #3: Starý `todoAlarmStorage.js`**

**Soubor:** `src/utils/todoAlarmStorage.js`

**Co dělá:**
- Ukládá do localStorage:
  - `todo_alarms_read` - pole ID přečtených alarmů
  - `todo_alarms_dismissed` - pole ID smazaných alarmů
- Funkce: `markTodoAlarmAsRead()`, `dismissTodoAlarm()`, `isTodoAlarmRead()`, `isTodoAlarmDismissed()`

**Proč je problém:**
- Duplikuje funkcionalitu DB API
- Stav "přečteno/smazáno" by měl být v DB, ne localStorage
- Při změně zařízení/browseru se ztratí

**Akce:** ❌ **SMAZAT CELÝ SOUBOR** - funkčnost nahradí DB API

---

## 🎯 NOVÁ ARCHITEKTURA (Best Practice)

### ✅ **Princip: DB API First, localStorage jako Cache**

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE SOURCE OF TRUTH                    │
│                         DB API (Backend)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  notificationsApi.js                                   │  │
│  │  - getNotificationsList()    // READ                   │  │
│  │  - markNotificationAsRead()  // UPDATE                 │  │
│  │  - dismissNotification()     // DELETE                 │  │
│  │  - createNotification()      // CREATE                 │  │
│  │  - notifyTodoAlarm()         // CREATE (TODO alarm)    │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│                              │ Cache (Optional)              │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  localStorage (pouze pro performance)                  │  │
│  │  - Cache API responses (expiruje za 1 min)            │  │
│  │  - Hidden notifications in popup (UI state)           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔨 REFAKTOR - KROK ZA KROKEM

### **KROK 1: Smazat starý `todoAlarmStorage.js`** ❌

```bash
rm src/utils/todoAlarmStorage.js
```

**Důvod:** Kompletně deprecated, duplikuje DB API

---

### **KROK 2: Refaktor `useTodoAlarms.js`** 🔨

**Současný stav:**
```javascript
// ❌ ŠPATNĚ - vytváří lokální notifikace
saveTodoAlarmToLocalStorage(notification, userId);
sendTodoAlarmToBackend(task, userId, alarmTime, priority, userName);
```

**Nový stav:**
```javascript
// ✅ SPRÁVNĚ - pouze odešle na backend
sendTodoAlarmToBackend(task, userId, alarmTime, priority, userName);
// Backend uloží do DB a notifikace se vrátí v getNotificationsList()
```

**Akce:**
- ✅ Již odstraněno `saveTodoAlarmToLocalStorage()` - HOTOVO
- ❌ Odstranit `loadTodoAlarmNotificationsFromLocalStorage()` - **není potřeba**
- ❌ Odstranit `updateTodoAlarmNotificationInLocalStorage()` - **cache ponechat**

**Nová logika:**
1. Alarm odpálí → odešle na backend
2. Backend uloží do DB
3. `getNotificationsList()` ji vrátí při příštím načtení
4. **Cache v localStorage** (volitelné) pro rychlost

---

### **KROK 3: Refaktor `NotificationBell.js`** 🔨

**Odstranit lokální TODO alarm logiku:**

```javascript
// ❌ ODSTRANIT tento import
import { 
  updateTodoAlarmNotificationInLocalStorage
} from '../hooks/useTodoAlarms';

// ❌ ODSTRANIT props
const NotificationBell = ({ 
  userId, 
  onLogout, 
  bgTasksContext,
  todoAlarmNotifications, // ❌ ODSTRANIT
  onTodoAlarmUpdate       // ❌ ODSTRANIT
}) => {
```

**Nová logika načítání:**
```javascript
const loadNotifications = async () => {
  try {
    // ✅ POUZE API - žádné mergování TODO alarmů
    const result = await getNotificationsList({
      limit: 50,
      unread_only: false
    });
    
    const apiNotifications = result.data || [];
    
    // Hidden notifications (UI state) - localStorage OK
    const hiddenKey = `notification_hidden_${userId}`;
    const hiddenNotifications = new Set(JSON.parse(localStorage.getItem(hiddenKey) || '[]'));
    
    // Filtruj pouze skryté v popupu
    const visibleNotifications = apiNotifications.filter(n => !hiddenNotifications.has(n.id));
    
    setNotifications(visibleNotifications);
    
  } catch (error) {
    console.error('Error loading notifications:', error);
    setNotifications([]);
  }
};
```

**Akce při označení jako přečtené:**
```javascript
const handleMarkAsRead = async (notificationId) => {
  try {
    // ✅ POUZE API - žádná lokální logika
    await markNotificationAsRead(notificationId);
    
    // Aktualizuj lokální stav (optimistic UI)
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, is_read: 1 } : n
    ));
    
    // Aktualizuj badge
    if (bgTasksContext?.unreadNotificationsCount > 0) {
      bgTasksContext.handleUnreadCountChange(bgTasksContext.unreadNotificationsCount - 1);
    }
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};
```

---

### **KROK 4: Refaktor `Layout.js`** 🔨

**Odstranit TODO alarm props:**

```javascript
// ❌ ODSTRANIT
const [todoAlarmNotifications, setTodoAlarmNotifications] = useState([]);

// ❌ ODSTRANIT
const handleNewTodoAlarmNotification = (notification) => { ... };
const handleTodoAlarmUpdate = (alarmId, updates) => { ... };

// ❌ ODSTRANIT z NotificationBell
<NotificationBell
  userId={userProfile?.id}
  onLogout={logout}
  bgTasksContext={bgTasksContext}
  // todoAlarmNotifications={todoAlarmNotifications}  ❌ ODSTRANIT
  // onTodoAlarmUpdate={handleTodoAlarmUpdate}        ❌ ODSTRANIT
/>
```

**Nová logika:**
- Vše přes API
- TODO alarmy jsou běžné notifikace v DB
- Žádná speciální lokální logika

---

### **KROK 5: Cache strategie (volitelné)** 💾

**localStorage jako cache (PRO výkon):**

```javascript
// ✅ SPRÁVNĚ - cache s expirací
const CACHE_KEY = 'notifications_cache';
const CACHE_EXPIRY = 60 * 1000; // 1 minuta

const loadNotifications = async () => {
  // Zkus cache
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_EXPIRY) {
      console.log('Using cached notifications');
      setNotifications(data);
      return;
    }
  }
  
  // Cache miss nebo expirovaná → načti z API
  try {
    const result = await getNotificationsList({ limit: 50 });
    const notifications = result.data || [];
    
    // Ulož do cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: notifications,
      timestamp: Date.now()
    }));
    
    setNotifications(notifications);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 📝 SHRNUTÍ ZMĚN

### ❌ **SOUBORY KE SMAZÁNÍ:**
1. `src/utils/todoAlarmStorage.js` - **celý soubor**

### 🔨 **SOUBORY K ÚPRAVĚ:**

| Soubor | Akce | Důvod |
|--------|------|-------|
| `useTodoAlarms.js` | Odstranit `loadTodoAlarmNotificationsFromLocalStorage()` export | Notifikace přijdou z API |
| `NotificationBell.js` | Odstranit TODO alarm props a mergování | Vše z API |
| `Layout.js` | Odstranit TODO alarm state a handlery | Vše z API |
| `NotificationBell.js` | Zjednodušit `loadNotifications()` | Pouze API, bez mergování |
| `NotificationBell.js` | Zjednodušit `handleMarkAsRead()` | Pouze API volání |

### ✅ **CO ZŮSTÁVÁ V localStorage:**
1. `notification_hidden_{userId}` - **UI state** - které notifikace jsou skryté v popupu (OK)
2. **Cache** API responses (volitelné, s expirací) - **performance** (OK)

---

## 🎯 VÝSLEDEK

### ✅ **Jednotná architektura:**
```
CREATE notifikace  → DB API → notifyTodoAlarm() / createNotification()
READ   notifikace  → DB API → getNotificationsList()
UPDATE notifikace  → DB API → markNotificationAsRead()
DELETE notifikace  → DB API → dismissNotification()
```

### ✅ **Bez duplicit:**
- Každá notifikace existuje jen 1x (v DB)
- localStorage jen pro cache a UI state
- Žádné mergování TODO alarmů

### ✅ **Best practices:**
- Single source of truth (DB)
- Optimistic UI (okamžitá reakce)
- Cache s expirací (rychlost)
- Clean code (žádné starosti o synchronizaci)

---

## 🚀 IMPLEMENTACE

1. ✅ Smazat `todoAlarmStorage.js`
2. ✅ Upravit `useTodoAlarms.js` (odstranit localStorage funkce)
3. ✅ Upravit `NotificationBell.js` (odstranit TODO alarm props)
4. ✅ Upravit `Layout.js` (odstranit TODO alarm state)
5. ✅ Testování (ověřit, že vše funguje)
6. ✅ Git commit "refactor: Unified notification system - DB API first"

---

**Status:** 🔴 Připraveno k implementaci  
**Priorita:** 🔥 VYSOKÁ - odstraní kritické duplicity a konflikty
