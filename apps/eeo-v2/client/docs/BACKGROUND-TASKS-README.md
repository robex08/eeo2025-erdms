# 🚀 Background Tasks System

Kompletní systém pro správu background úloh v React aplikaci.

## 📦 Co bylo vytvořeno

### 1. Core Service (`src/services/backgroundTaskService.js`)
- **Singleton service** pro správu všech background úloh
- Registrace/odregistrace tasků s intervalovým spouštěním
- Okamžité manuální spouštění
- Podmíněné spouštění (např. jen když je uživatel přihlášen)
- Prevence paralelního běhu stejné úlohy
- Error handling
- Event listeners pro sledování změn

### 2. React Hook (`src/hooks/useBackgroundTasks.js`)
- `useBackgroundTasks()` - hlavní hook pro komponenty
- `useBackgroundTask()` - zjednodušený hook pro jednu úlohu
- Automatický cleanup při unmount
- Tracking stavu úloh (optional)
- Pohodlné API pro React komponenty

### 3. Task Definitions (`src/services/backgroundTasks.js`)
Předpřipravené úlohy:
- ✅ **checkNotifications** - kontrola notifikací (60s interval)
- ✅ **checkChatMessages** - kontrola zpráv (90s interval)
- ✅ **autoRefreshOrders** - auto-refresh objednávek (10min interval)
- ✅ **postOrderCreation** - kombinovaná úloha po vytvoření objednávky

### 4. Example Component (`src/examples/BackgroundTasksExample.js`)
- Plně funkční demo komponenta
- Ukázka všech funkcí systému
- UI pro ovládání a monitoring tasků
- Připravená k použití jako reference

### 5. Dokumentace
- 📘 **docs/BACKGROUND-TASKS-SYSTEM.md** - kompletní API dokumentace
- 📘 **docs/BACKGROUND-TASKS-INTEGRATION.js** - quick start guide

---

## ⚡ Quick Start

### 1. Základní použití

```javascript
import { useBackgroundTasks } from './hooks/useBackgroundTasks';

function App() {
  const bgTasks = useBackgroundTasks();

  useEffect(() => {
    bgTasks.register({
      name: 'myTask',
      interval: 60000, // 60 sekund
      callback: async () => {
        console.log('Task running!');
      },
      immediate: true
    });
  }, []);

  return <YourApp />;
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
        console.log('New notifications:', data);
      },
      onNewMessages: (data) => {
        console.log('New messages:', data);
      },
      onOrdersRefreshed: (data) => {
        console.log('Orders refreshed:', data);
      }
    });

    tasks.forEach(task => bgTasks.register(task));
  }, []);

  return <YourApp />;
}
```

### 3. Okamžité spuštění (např. po vytvoření objednávky)

```javascript
const handleOrderCreated = () => {
  // Okamžitý refresh + kontrola notifikací
  bgTasks.runNow('postOrderCreation');
};
```

---

## 🎯 Případy použití

### ✅ Co je připraveno:

1. **Kontrola notifikací každých 60s**
   ```javascript
   createNotificationCheckTask(onNewNotifications)
   ```

2. **Kontrola chat zpráv každých 90s**
   ```javascript
   createChatCheckTask(onNewMessages)
   ```

3. **Auto-refresh objednávek každých 10min**
   ```javascript
   createOrdersRefreshTask(onOrdersRefreshed)
   ```

4. **Event-driven refresh po akci**
   ```javascript
   bgTasks.runNow('autoRefreshOrders'); // Okamžitě
   ```

### 🔧 Co je třeba dodělat:

- [ ] Implementovat skutečná API volání v `src/services/backgroundTasks.js`
- [ ] Připojit callbacky ke stavům/akcím v aplikaci
- [ ] Přidat toast notifikace pro uživatele
- [ ] Napojit na existující notification systém

---

## 📁 Struktura souborů

```
src/
├── services/
│   ├── backgroundTaskService.js    ← Core singleton service
│   └── backgroundTasks.js          ← Task definitions (TODO: implementovat API)
├── hooks/
│   └── useBackgroundTasks.js       ← React hooks
├── examples/
│   └── BackgroundTasksExample.js   ← Demo komponenta
└── docs/
    ├── BACKGROUND-TASKS-SYSTEM.md        ← API dokumentace
    └── BACKGROUND-TASKS-INTEGRATION.js   ← Integration guide
```

---

## 🔍 Jak to funguje

```
┌─────────────────────────────────────────────────────────────┐
│  1. App.js registruje tasky přes useBackgroundTasks()       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. backgroundTaskService spouští intervaly                  │
│     - checkNotifications každých 60s                         │
│     - checkChatMessages každých 90s                          │
│     - autoRefreshOrders každých 10min                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Callback funkce (onNewNotifications, atd.)               │
│     - Aktualizují stav aplikace                              │
│     - Zobrazují notifikace                                   │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Manuální trigger (po akci uživatele)                     │
│     bgTasks.runNow('postOrderCreation')                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Features

### ✅ Implementováno:

- ✅ Intervalové spouštění úloh
- ✅ Okamžité manuální spuštění
- ✅ Podmíněné spouštění (jen když přihlášen, atd.)
- ✅ Prevence paralelního běhu stejné úlohy
- ✅ Automatický cleanup při unmount
- ✅ Error handling
- ✅ Event listeners pro změny stavu
- ✅ Enable/disable jednotlivých tasků
- ✅ Globální enable/disable
- ✅ Tracking stavu úloh
- ✅ Debug logging

### 🔮 Připraveno k rozšíření:

- WebSocket integrace
- Perzistence stavu
- Retry mechanismus
- Prioritizace úloh
- Adaptivní intervaly
- Offline queue

---

## 🧪 Testování

### 1. Spusť demo komponentu:

```javascript
// V App.js přidej:
import BackgroundTasksExample from './examples/BackgroundTasksExample';

// A v return:
<BackgroundTasksExample />
```

### 2. Otevři Console (F12)

Měly by běžet logy:
```
[BackgroundTask] Registered task "checkNotifications"...
[BackgroundTask] Running task "checkNotifications"...
[BackgroundTask] Task "checkNotifications" completed successfully
```

### 3. Testuj manuální triggery

Klikni na tlačítka v demo komponentě a sleduj console.

---

## 📚 Další kroky

### Krok 1: Implementuj API volání

Edituj `src/services/backgroundTasks.js`:

```javascript
callback: async () => {
  // Nahraď placeholder:
  // const mockNotifications = { ... };
  
  // Skutečným API voláním:
  const response = await api.checkNotifications();
  return response;
}
```

### Krok 2: Integruj do App.js

Viz `docs/BACKGROUND-TASKS-INTEGRATION.js` pro kopírovatelný kód.

### Krok 3: Připoj ke stavům

```javascript
const tasks = createStandardTasks({
  onNewNotifications: (data) => {
    setNotifications(prev => [...prev, ...data.items]);
    toast.info(`Máte ${data.unread} nových notifikací`);
  },
  // ...
});
```

### Krok 4: Napoj event triggery

```javascript
const handleOrderCreated = () => {
  // Po úspěšném vytvoření objednávky
  bgTasks.runNow('postOrderCreation');
};
```

---

## 🐛 Troubleshooting

### Úlohy se nespouštějí?

1. Zkontroluj console - měly by být logy
2. Zkontroluj podmínku (`condition` funkci)
3. Zkontroluj, zda je úloha enabled
4. Zkontroluj interval (min. 1000ms)

### Úloha běží vícekrát současně?

- Service má prevenci paralelního běhu
- Pokud vidíš warning v console, interval je příliš krátký pro délku callback

### Jak debugovat?

```javascript
// Sleduj stav všech tasků
const bgTasks = useBackgroundTasks({ trackState: true });
console.log(bgTasks.tasks);

// Přidej listener
backgroundTaskService.addListener((tasks) => {
  console.log('Tasks changed:', tasks);
});
```

---

## 📞 Použití v projektu

**Status:** ✅ Připraveno k použití

**Co je hotovo:**
- Core infrastruktura ✅
- React hooks ✅  
- Task definitions (placeholder) ✅
- Dokumentace ✅
- Demo komponenta ✅

**Co zbývá:**
- Implementovat API volání (TODO)
- Integrovat do App.js (viz integration guide)
- Napojit na UI notifikace (toast)
- Testování v produkci

---

**Vytvořeno:** 15. října 2025  
**Best Practices:** ✅ React hooks, ✅ Singleton pattern, ✅ Auto cleanup, ✅ Error handling
