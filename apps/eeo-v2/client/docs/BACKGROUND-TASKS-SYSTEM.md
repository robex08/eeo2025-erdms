# Background Tasks System - Dokumentace

## 📋 Přehled

Systém pro správu background úloh v React aplikaci. Umožňuje spouštět opakující se úlohy na pozadí (kontrola notifikací, zpráv, auto-refresh dat, atd.).

## 🏗️ Architektura

### Struktura souborů

```
src/
├── services/
│   ├── backgroundTaskService.js    # Core service (singleton)
│   └── backgroundTasks.js          # Předpřipravené task definice
├── hooks/
│   └── useBackgroundTasks.js       # React hook pro komponenty
└── examples/
    └── BackgroundTasksExample.js   # Ukázková komponenta
```

## 🚀 Základní použití

### 1. Jednoduchý příklad v komponentě

```javascript
import { useBackgroundTasks } from './hooks/useBackgroundTasks';

function MyComponent() {
  const bgTasks = useBackgroundTasks();

  useEffect(() => {
    // Registrace úlohy
    bgTasks.register({
      name: 'checkNotifications',
      interval: 60000, // 60 sekund
      callback: async () => {
        const data = await api.checkNotifications();
        console.log('Notifications:', data);
      },
      immediate: true  // Spustit hned při registraci
    });
  }, []);

  return <div>Background task is running...</div>;
}
```

### 2. Použití předpřipravených tasků

```javascript
import { useBackgroundTasks } from './hooks/useBackgroundTasks';
import { createStandardTasks } from './services/backgroundTasks';

function App() {
  const bgTasks = useBackgroundTasks({ trackState: true });

  useEffect(() => {
    const tasks = createStandardTasks({
      onNewNotifications: (data) => {
        toast.info(`Máte ${data.unread} nových notifikací`);
      },
      onNewMessages: (data) => {
        toast.info(`Máte ${data.unread} nových zpráv`);
      },
      onOrdersRefreshed: (data) => {
        setOrders(data.orders);
      }
    });

    tasks.forEach(task => bgTasks.register(task));
  }, []);

  return <YourApp />;
}
```

### 3. Okamžité spuštění úlohy

```javascript
// Po vytvoření objednávky okamžitě refresh
const handleOrderCreated = () => {
  bgTasks.runNow('autoRefreshOrders');
  // nebo kombinovaná úloha:
  bgTasks.runNow('postOrderCreation');
};
```

## 📚 API Reference

### `backgroundTaskService`

Core service pro správu úloh (singleton).

#### Metody:

```javascript
// Registrace úlohy
const taskId = backgroundTaskService.registerTask({
  name: 'myTask',           // Unikátní název
  interval: 60000,          // Interval v ms
  callback: async () => {}, // Async funkce k vykonání
  immediate: false,         // Spustit hned při registraci?
  enabled: true,            // Je úloha aktivní?
  condition: () => true,    // Podmínka pro spuštění (optional)
  onError: (err) => {}      // Error handler (optional)
});

// Zrušení úlohy
backgroundTaskService.unregisterTask(taskId);
backgroundTaskService.unregisterTaskByName('myTask');

// Okamžité spuštění
await backgroundTaskService.runTaskNow('myTask');

// Enable/disable
backgroundTaskService.setTaskEnabled('myTask', false);

// Globální enable/disable
backgroundTaskService.setGlobalEnabled(false);

// Informace o úlohách
const tasks = backgroundTaskService.getTasksInfo();

// Zrušení všech úloh
backgroundTaskService.unregisterAll();
```

### `useBackgroundTasks(options)`

React hook pro správu úloh v komponentách.

#### Options:

```javascript
{
  autoCleanup: true,  // Auto cleanup při unmount
  trackState: false   // Sledovat stav úloh (re-render)
}
```

#### Vrací:

```javascript
{
  register,           // (config) => taskId
  unregister,         // (taskId) => void
  unregisterByName,   // (name) => void
  runNow,            // (nameOrId) => Promise
  setEnabled,        // (nameOrId, enabled) => void
  tasks,             // Array<TaskInfo> (pokud trackState: true)
  getTaskInfo,       // (nameOrId) => TaskInfo
  isTaskRunning,     // (nameOrId) => boolean
  service            // Přímý přístup k backgroundTaskService
}
```

### `useBackgroundTask(config, deps)`

Zjednodušený hook pro jednu úlohu.

```javascript
const task = useBackgroundTask({
  name: 'myTask',
  interval: 60000,
  callback: async () => { ... }
}, []); // deps array

// task obsahuje:
// - isRunning: boolean
// - lastRun: Date | null
// - enabled: boolean
// - runNow: () => Promise
// - setEnabled: (enabled) => void
// - taskId: string
```

## 🎯 Předpřipravené úlohy

### `createNotificationCheckTask(onNewNotifications)`
- **Interval:** 60 sekund
- **Účel:** Kontrola nových notifikací
- **Podmínka:** Uživatel přihlášen

### `createChatCheckTask(onNewMessages)`
- **Interval:** 90 sekund
- **Účel:** Kontrola nových chat zpráv
- **Podmínka:** Uživatel přihlášen

### `createOrdersRefreshTask(onOrdersRefreshed)`
- **Interval:** 10 minut
- **Účel:** Automatické obnovení seznamu objednávek
- **Podmínka:** Uživatel přihlášen + je na stránce s objednávkami

### `createPostOrderCreationTask(callbacks)`
- **Interval:** Velmi dlouhý (spouští se manuálně)
- **Účel:** Kombinovaná úloha po vytvoření objednávky
- **Provede:** Refresh objednávek + kontrola notifikací

### `createStandardTasks(callbacks)`
Helper pro vytvoření všech standardních tasků najednou.

```javascript
const tasks = createStandardTasks({
  onNewNotifications: (data) => { ... },
  onNewMessages: (data) => { ... },
  onOrdersRefreshed: (data) => { ... }
});
```

## 🔧 Konfigurace intervalů

```javascript
import { TASK_INTERVALS } from './services/backgroundTasks';

TASK_INTERVALS.NOTIFICATIONS    // 60 * 1000 (1 minuta)
TASK_INTERVALS.CHAT              // 90 * 1000 (1.5 minuty)
TASK_INTERVALS.ORDERS_REFRESH    // 10 * 60 * 1000 (10 minut)
TASK_INTERVALS.HEALTH_CHECK      // 5 * 60 * 1000 (5 minut)
TASK_INTERVALS.SESSION_CHECK     // 15 * 60 * 1000 (15 minut)
```

## 💡 Best Practices

### 1. Vždy používej podmínku pro přihlášení

```javascript
condition: () => {
  const authToken = sessionStorage.getItem('authToken');
  return !!authToken;
}
```

### 2. Prevence duplicitních úloh

Service automaticky odstraní starou úlohu se stejným názvem při registraci nové.

### 3. Error handling

```javascript
onError: (error) => {
  console.error('Task failed:', error);
  // Zobraz notifikaci uživateli
  toast.error('Failed to check notifications');
}
```

### 4. Cleanup

S `autoCleanup: true` (default) se úlohy automaticky čistí při unmount.

### 5. Podmíněné spouštění

```javascript
condition: () => {
  const isAuth = !!sessionStorage.getItem('authToken');
  const isOnOrdersPage = window.location.pathname.includes('/orders');
  return isAuth && isOnOrdersPage;
}
```

## 🐛 Debugging

### Console logy

Service loguje všechny operace do console:
- `[BackgroundTask] Registered task "name"...`
- `[BackgroundTask] Running task "name"...`
- `[BackgroundTask] Task "name" completed successfully`

### Sledování stavu

```javascript
const bgTasks = useBackgroundTasks({ trackState: true });

console.log('Active tasks:', bgTasks.tasks);
console.log('Task running?', bgTasks.isTaskRunning('myTask'));
```

### Listener pro změny

```javascript
useEffect(() => {
  const unsubscribe = backgroundTaskService.addListener((tasks) => {
    console.log('Tasks changed:', tasks);
  });
  return unsubscribe;
}, []);
```

## 📦 Integrace do aplikace

### V App.js nebo root komponentě:

```javascript
import { useBackgroundTasks } from './hooks/useBackgroundTasks';
import { createStandardTasks } from './services/backgroundTasks';

function App() {
  const bgTasks = useBackgroundTasks();

  useEffect(() => {
    // Registrace při startu aplikace
    const tasks = createStandardTasks({
      onNewNotifications: handleNotifications,
      onNewMessages: handleMessages,
      onOrdersRefreshed: handleOrdersRefresh
    });

    tasks.forEach(task => bgTasks.register(task));

    // Cleanup automatický
  }, []);

  return <YourApp />;
}
```

## 🔮 Budoucí rozšíření

- ✅ WebSocket integrace pro real-time aktualizace
- ✅ Perzistence stavu (localStorage)
- ✅ Retry mechanismus při selhání
- ✅ Prioritizace úloh
- ✅ Adaptivní intervaly (zrychlení/zpomalení podle aktivity)
- ✅ Offline queue (spouštění po obnovení připojení)

## 📝 TODO

- [ ] Implementovat skutečná API volání v `backgroundTasks.js`
- [ ] Přidat UI pro správu tasků (enable/disable/run now)
- [ ] Integrovat s notification systémem
- [ ] Přidat testy
- [ ] Dokumentovat error handling strategie

---

**Verze:** 1.0.0  
**Datum:** 15. října 2025  
**Autor:** Background Tasks System
