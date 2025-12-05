# 🕐 BACKGROUND TASKS - ČASOVÁNÍ A VOLÁNÍ

**Datum:** 25. října 2025  
**Soubory:** `src/services/backgroundTasks.js`, `src/context/BackgroundTasksContext.js`, `src/App.js`

---

## 📊 **PŘEHLED VŠECH BACKGROUND TASKŮ**

### **1. ⏰ Kontrola notifikací** (`checkNotifications`)

```javascript
Interval: 60 sekund (1 minuta)
Immediate: true (spustí se hned při startu)
Enabled: true (aktivní)
Condition: Uživatel musí být přihlášen (má JWT token)
```

**Co dělá:**
1. Zavolá `getUnreadCount()` - získá počet nepřečtených notifikací
2. Zavolá callback `onUnreadCountChange(unreadCount)` → aktualizuje badge v NotificationBell
3. Pokud jsou nové notifikace (`unreadCount > 0`):
   - Zavolá `getNotificationsList({ limit: 5, unread_only: true })`
   - Zavolá callback `onNewNotifications(data, unreadCount)`

**Timeline:**
```
0:00  → První check (immediate: true)
1:00  → Druhý check
2:00  → Třetí check
3:00  → Čtvrtý check
...
```

**Endpoint:**
```
POST /api.eeo/notifications/unread-count
POST /api.eeo/notifications/list (když unreadCount > 0)
```

---

### **2. 📦 Automatický refresh objednávek** (`autoRefreshOrders`)

```javascript
Interval: 10 minut (600 sekund)
Immediate: false (NESPUSTÍ se hned, počká první interval)
Enabled: true (aktivní)
Condition: 
  - Uživatel musí být přihlášen
  - Musí být na stránce /orders25-list, /orders nebo /
```

**Co dělá:**
1. Zavolá `getOrdersList25({ token, username })`
2. **NEMAZŽE cache** (cache si sama hlídá TTL)
3. Zavolá callback `onOrdersRefreshed(ordersData)` → aktualizuje seznam v Orders25List

**Timeline:**
```
0:00  → (čeká, immediate: false)
10:00 → První refresh (pokud je uživatel na správné stránce)
20:00 → Druhý refresh
30:00 → Třetí refresh
...
```

**Endpoint:**
```
POST /api.eeo/orders (nebo podobný endpoint)
```

**⚠️ DŮLEŽITÉ:**
- **Neprovádí reload stránky!** Jen aktualizuje data
- **Respektuje cache** - nemazže ji, jen poskytne fresh data
- **Běží jen na správných stránkách** - šetří API requesty

---

### **3. 💬 Kontrola chat zpráv** (`checkChatMessages`)

```javascript
Interval: 90 sekund (1.5 minuty)
Immediate: false
Enabled: false (VYPNUTO - chat není implementován)
Condition: Uživatel musí být přihlášen
```

**Status:** 🚧 Připraveno pro budoucnost, zatím neaktivní

---

### **4. 🚀 Post-order action** (`postOrderAction`)

```javascript
Interval: 999999999 (velmi dlouhý - NESPOUŠTÍ SE AUTOMATICKY)
Immediate: false
Enabled: true
Manuální spuštění: ano
```

**Kdy se spouští:**
- **Manuálně** po uložení objednávky ve `OrderForm25.js`
- Volání: `backgroundTaskService.runTaskNow('postOrderAction')`

**Co dělá:**
1. **Okamžitý refresh objednávek:**
   - Zavolá `getOrdersList25({ token, username })`
   - **INVALIDUJE cache** (protože data se změnila)
   - Zavolá `onOrdersRefreshed(ordersData)`

2. **Okamžitá kontrola notifikací:**
   - Zavolá `getUnreadCount()`
   - Pokud `unreadCount > 0`, zavolá `getNotificationsList()`
   - Zavolá `onNotificationsChecked(unreadCount)` a `onNewNotifications()`

**Timeline:**
```
Uživatel uloží objednávku
  ↓
backgroundTaskService.runTaskNow('postOrderAction')
  ↓
Okamžitě (< 1s):
  - Refresh orders
  - Check notifications
  ↓
Komponenty se aktualizují
```

**Endpoint:**
```
POST /api.eeo/orders
POST /api.eeo/notifications/unread-count
POST /api.eeo/notifications/list
```

---

## 🔄 **FLOW DIAGRAM**

### **Automatické tasky (běží na pozadí):**

```
┌─────────────────────────────────────────────────────┐
│  App.js (useEffect po přihlášení)                   │
│  ↓                                                   │
│  Registruje background tasks                        │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  Background Task Service                             │
│  ↓                                                   │
│  ┌──────────────────────┐  ┌────────────────────┐  │
│  │ checkNotifications   │  │ autoRefreshOrders  │  │
│  │ každých 60s          │  │ každých 10 minut   │  │
│  └──────────────────────┘  └────────────────────┘  │
│           ↓                          ↓              │
│  ┌─────────────────┐      ┌──────────────────┐    │
│  │ getUnreadCount  │      │ getOrdersList25  │    │
│  └─────────────────┘      └──────────────────┘    │
│           ↓                          ↓              │
│  ┌──────────────────────────────────────────────┐  │
│  │ BackgroundTasksContext                        │  │
│  │ ↓                                             │  │
│  │ onUnreadCountChange() → NotificationBell     │  │
│  │ onOrdersRefreshed()   → Orders25List         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### **Manuální task (po akci):**

```
┌─────────────────────────────────────────────────────┐
│  OrderForm25.js                                      │
│  ↓                                                   │
│  Uživatel klikne "Uložit"                           │
│  ↓                                                   │
│  handleSubmit()                                      │
│  ↓                                                   │
│  backgroundTaskService.runTaskNow('postOrderAction')│
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  postOrderAction task                                │
│  ↓                                                   │
│  1. getOrdersList25()                                │
│  2. ordersCacheService.invalidate()                  │
│  3. onOrdersRefreshed(ordersData)                    │
│  4. getUnreadCount()                                 │
│  5. onNotificationsChecked(unreadCount)              │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  UI se aktualizuje                                   │
│  ↓                                                   │
│  - Orders25List zobrazí novou objednávku            │
│  - NotificationBell zobrazí aktualizovaný badge     │
└─────────────────────────────────────────────────────┘
```

---

## 📍 **CALLBACK REGISTRACE**

### **V App.js:**

```javascript
// Callback pro refresh objednávek
onOrdersRefreshed: (ordersData) => {
  const ctx = bgTasksContextRef.current;
  if (ctx?.triggerOrdersRefresh) {
    ctx.triggerOrdersRefresh(ordersData);
  }
}

// Callback pro změnu počtu nepřečtených notifikací
onUnreadCountChange: (count) => {
  const ctx = bgTasksContextRef.current;
  if (ctx?.handleUnreadCountChange) {
    ctx.handleUnreadCountChange(count);
  }
}

// Callback pro nové notifikace (POUZE BADGE, BEZ TOAST)
onNewNotifications: (notifications, unreadCount) => {
  const ctx = bgTasksContextRef.current;
  if (ctx?.handleNewNotifications) {
    ctx.handleNewNotifications(notifications, unreadCount);
  }
}
```

### **V Orders25List.js:**

```javascript
// Registrace callback pro refresh orders
useEffect(() => {
  if (bgTasksContext?.registerOrdersRefreshCallback) {
    bgTasksContext.registerOrdersRefreshCallback((freshData) => {
      // Aktualizuj data v komponentě
      if (freshData && Array.isArray(freshData)) {
        setOrders(freshData);
      }
    });
  }
  
  return () => {
    if (bgTasksContext?.unregisterOrdersRefreshCallback) {
      bgTasksContext.unregisterOrdersRefreshCallback();
    }
  };
}, [bgTasksContext]);
```

---

## ⏱️ **TIMELINE - PŘÍKLAD 30 MINUT**

```
00:00 → checkNotifications (immediate)
01:00 → checkNotifications
02:00 → checkNotifications
03:00 → checkNotifications
04:00 → checkNotifications
05:00 → checkNotifications
06:00 → checkNotifications
07:00 → checkNotifications
08:00 → checkNotifications
09:00 → checkNotifications
10:00 → checkNotifications + autoRefreshOrders (první refresh)
11:00 → checkNotifications
12:00 → checkNotifications
13:00 → checkNotifications
14:00 → checkNotifications
15:00 → checkNotifications
16:00 → checkNotifications
17:00 → checkNotifications
18:00 → checkNotifications
19:00 → checkNotifications
20:00 → checkNotifications + autoRefreshOrders (druhý refresh)
21:00 → checkNotifications
22:00 → checkNotifications
23:00 → checkNotifications
24:00 → checkNotifications
25:00 → checkNotifications
26:00 → checkNotifications
27:00 → checkNotifications
28:00 → checkNotifications
29:00 → checkNotifications
30:00 → checkNotifications + autoRefreshOrders (třetí refresh)

[MANUÁLNĚ]
XX:XX → postOrderAction (když uživatel uloží objednávku)
```

---

## 🎯 **SHRNUTÍ**

| Task | Interval | Immediate | Kdy běží | Co volá |
|------|----------|-----------|----------|---------|
| **checkNotifications** | 60s | ✅ Ano | Vždy (když přihlášen) | `/notifications/unread-count`, `/notifications/list` |
| **autoRefreshOrders** | 10min | ❌ Ne | Jen na /orders25-list | `/orders` |
| **checkChatMessages** | 90s | ❌ Ne | 🚧 Vypnuto (chat není ready) | - |
| **postOrderAction** | ∞ | ❌ Ne | Manuálně (po uložení) | `/orders`, `/notifications/*` |

---

## 🔧 **KONFIGURACE**

### **Změna intervalů:**

```javascript
// src/services/backgroundTasks.js

export const TASK_INTERVALS = {
  NOTIFICATIONS: 60 * 1000,      // 1 minuta
  CHAT: 90 * 1000,                // 1.5 minuty
  ORDERS_REFRESH: 10 * 60 * 1000, // 10 minut
  HEALTH_CHECK: 5 * 60 * 1000,    // 5 minut
  SESSION_CHECK: 15 * 60 * 1000   // 15 minut
};

// Použití:
createNotificationCheckTask(...) 
// interval: TASK_INTERVALS.NOTIFICATIONS
```

---

**🎉 Dokumentace hotova!**
