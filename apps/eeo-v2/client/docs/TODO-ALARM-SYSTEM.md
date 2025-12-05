# TODO Alarm Systém - Dokumentace

## 📋 Přehled

Systém alarmů pro TODO položky umožňuje nastavit časové upozornění s různými prioritami.

## 🎯 Funkce

### 1. Nastavení Alarmu

Při vytváření/editaci TODO můžete nastavit:
- **Datum**: Kdy má alarm vyprštět
- **Čas**: Přesný čas alarmu
- **Priorita**: 
  - `NORMAL` 🔔 - Standardní upozornění do notifikací
  - `HIGH` 🚨 - Důležitý alarm s floating popup okénkem

### 2. Vizuální Označení

Řádky TODO jsou barevně označeny podle priority alarmu:

- **Bez alarmu**: Výchozí modré podbarvení
- **NORMAL alarm**: Žluté podbarvení (#fef3c7)
- **HIGH alarm**: Světle červené podbarvení (#fee2e2)

### 3. Typy Notifikací

#### NORMAL Priority
- Zobrazí se v notifikacích (zvonek 🔔)
- Neklade vysoké nároky na pozornost
- Vhodné pro běžné připomínky

#### HIGH Priority
- Zobrazí se jako floating popup okénko
- Více oken může být zobrazeno současně
- Okénka jsou přesouvatelná drag & drop
- Automaticky se rozmístí, aby se nepřekrývala
- Vhodné pro kritické úkoly

### 4. Background Task

Systém kontroluje alarmy každou **1 minutu** na pozadí.

Když alarm vyprší:
1. Označí se jako `fired: true` v datech
2. Podle priority se zobrazí:
   - NORMAL → Notifikace do zvonečku
   - HIGH → Floating popup okénko
3. Alarm se již znovu neodpálí (i po F5)

## 📦 Datový Model

```javascript
// TODO struktura
{
  id: "unique-id",
  text: "Text úkolu",
  done: false,
  createdAt: 1234567890,
  alarm: {
    time: 1234567890,           // Timestamp kdy má alarm vyprštět
    priority: "NORMAL" | "HIGH", // Priorita alarmu
    fired: false,                // Zda už alarm odpálil
    acknowledged: false          // Zda uživatel potvrdil alarm
  }
}

// Zpětná kompatibilita - starý formát:
{
  id: "unique-id",
  text: "Text úkolu",
  alarm: 1234567890  // Prostý timestamp (= NORMAL priority)
}
```

## 🎨 Komponenty

### AlarmModal
**Soubor**: `src/components/panels/TodoPanel.js`

Modal pro nastavení alarmu s:
- Date picker
- Time picker
- Quick action: +15 minut
- Výběr priority (NORMAL/HIGH)
- Možnost zrušit alarm

### FloatingAlarmPopup
**Soubor**: `src/components/FloatingAlarmPopup.js`

Přesouvatelné popup okénko pro HIGH alarmy:
- Drag & drop přesouvání
- Animace při zobrazení/zavření
- Tlačítka: Zavřít, Označit hotové
- Zobrazení času alarmu
- Pulsující ikona 🚨

### FloatingAlarmManager
**Soubor**: `src/components/FloatingAlarmPopup.js`

Správce více floating popup oken:
- Automatické rozmístění oken (cascade efekt)
- Sledování pozic všech oken
- Předcházení překrývání

## 🔧 Hooki

### useTodoAlarms
**Soubor**: `src/hooks/useTodoAlarms.js`

Background kontrola alarmů:
```javascript
const { 
  activeAlarms,         // Array HIGH priority alarmů pro zobrazení
  handleDismissAlarm,   // (taskId) => void - zavře popup
  handleCompleteTask,   // (taskId) => taskId - označ jako hotové
  checkAlarms          // () => void - manuální kontrola
} = useTodoAlarms(
  tasks,                      // Array TODO položek
  updateTaskAlarm,            // (id, alarm) => void
  isLoggedIn,                 // boolean
  userId,                     // string
  onNotification              // callback pro NORMAL alarmy
);
```

## 🔄 Workflow

```
1. Uživatel nastaví alarm s prioritou
   ↓
2. Alarm se uloží do localStorage (šifrovaně)
   ↓
3. Background task kontroluje každou minutu
   ↓
4. Když čas vypršel:
   
   NORMAL:                    HIGH:
   ↓                          ↓
   → Notifikace do zvonečku   → Floating popup okénko
   → Typ: TODO_ALARM          → Přesouvatelné
   → Read: false              → Více oken možných
                               → Cascade rozmístění
```

## 🎮 Použití v Kódu

### Integrace do Layout.js

```javascript
import { useTodoAlarms } from '../hooks/useTodoAlarms';
import { FloatingAlarmManager } from './FloatingAlarmPopup';

// Callback pro NORMAL alarmy
const handleTodoAlarmNotification = useCallback((notification) => {
  addNotification({
    id: notification.id,
    type: 'TODO_ALARM',
    message: notification.message,
    timestamp: notification.timestamp,
    read: false,
    data: {
      taskId: notification.taskId,
      alarmTime: notification.alarmTime
    }
  });
}, [addNotification]);

// Hook pro alarmy
const { activeAlarms, handleDismissAlarm, handleCompleteTask } = useTodoAlarms(
  tasks, 
  updateTaskAlarm, 
  isLoggedIn, 
  user_id,
  handleTodoAlarmNotification
);

// Handler pro dokončení z alarmu
const handleCompleteFromAlarm = useCallback((taskId) => {
  const completedTaskId = handleCompleteTask(taskId);
  if (completedTaskId) {
    toggleTask(completedTaskId);
  }
}, [handleCompleteTask, toggleTask]);

// Render floating popups
<FloatingAlarmManager 
  alarms={activeAlarms} 
  onDismiss={handleDismissAlarm}
  onComplete={handleCompleteFromAlarm}
/>
```

## 🎨 Styling

### Barvy Podle Priority

```javascript
// TodoItemRow styled component
background: 
  - done: 'rgba(226,232,240,0.65)'
  - HIGH: 'rgba(254,226,226,0.90)'     // Světle červená
  - NORMAL: 'rgba(254,243,199,0.75)'   // Žlutá
  - none: 'rgba(255,255,255,0.85)'     // Bílá

border:
  - done: '#cbd5e1'
  - HIGH: '#fca5a5'                     // Červený border
  - NORMAL: '#fbbf24'                   // Žlutý border
  - none: '#bfdbfe'                     // Modrý border

left-bar:
  - done: '#64748b'
  - HIGH: '#dc2626'                     // Červený pruh
  - NORMAL: '#f59e0b'                   // Žlutý pruh
  - none: '#3b82f6'                     // Modrý pruh
```

## 🔒 Bezpečnost

- Alarmy jsou uloženy v **šifrovaném localStorage** (přes `secureStorage`)
- Každý uživatel vidí pouze své alarmy
- Session-based tracking zabraňuje duplicitnímu odpálení
- Background check běží pouze po přihlášení

## ⚡ Performance

- Background check: **1x za minutu** (60000 ms)
- Kontrola pouze aktivních (nefired) alarmů
- Session cache pro zamezení duplicit
- Lazy loading floating popups

## 🐛 Debugging

```javascript
// V konzoli se zobrazí:
console.log('🔔 ALARM FIRED [NORMAL|HIGH]:', taskText, alarmDate);

// LocalStorage pro alarmy:
localStorage.getItem(`todo-alarms-${userId}`);
```

## 📝 TODO / Budoucí Vylepšení

- [ ] Opakující se alarmy (denně, týdně)
- [ ] Snooze funkce (odložit o X minut)
- [ ] Vlastní zvuky pro alarmy
- [ ] Email notifikace pro HIGH priority
- [ ] Push notifications (Service Worker)
- [ ] Timezone handling pro cestovatele
- [ ] Alarm historie (log všech odpálených alarmů)

## 🎯 Best Practices

1. **HIGH priority**: Používej pouze pro opravdu důležité úkoly
2. **Časování**: Nastav alarm alespoň 5 minut dopředu
3. **Baterie**: Floating popupy mají animace - mohou spotřebovat více energie
4. **Cleanup**: Pravidelně mazat hotové úkoly s alarmem
5. **Testování**: Vždy otestuj alarm před produkčním nasazením

---

**Verze**: 1.0  
**Datum**: 19. října 2025  
**Autor**: AI Assistant (GitHub Copilot)
