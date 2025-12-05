# 🔧 TODO Alarm System - Implementační Detaily

## 📦 Souhrn Změn

### Nové Soubory
- ✅ `src/components/FloatingAlarmPopup.js` - Floating popup komponenta a manager

### Upravené Soubory
- ✅ `src/components/panels/TodoPanel.js` - Přidána priorita do AlarmModal
- ✅ `src/hooks/useTodoAlarms.js` - Podpora priorit a floating popups
- ✅ `src/components/Layout.js` - Integrace s FloatingAlarmManager

### Dokumentace
- ✅ `TODO-ALARM-SYSTEM.md` - Kompletní dokumentace
- ✅ `TODO-ALARM-QUICKSTART.md` - Quick start guide
- ✅ `TODO-ALARM-EXAMPLES.md` - Příklady použití

---

## 🏗️ Architektura

```
┌─────────────────────────────────────────────────────┐
│                    Layout.js                         │
│  ┌─────────────────────────────────────────────┐   │
│  │  useFloatingPanels()                         │   │
│  │  - tasks state                               │   │
│  │  - updateTaskAlarm()                         │   │
│  └────────────┬─────────────────────────────────┘   │
│               │                                      │
│               ▼                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  useTodoAlarms()                             │   │
│  │  - checkAlarms() každou minutu               │   │
│  │  - activeAlarms (HIGH priority)              │   │
│  │  - onNotification (NORMAL priority)          │   │
│  └────────────┬─────────────────────────────────┘   │
│               │                                      │
│       ┌───────┴───────┐                             │
│       ▼               ▼                             │
│  ┌─────────┐    ┌──────────────────┐              │
│  │ Notif   │    │ FloatingAlarm    │              │
│  │ Bell    │    │ Manager          │              │
│  │ 🔔      │    │ 🚨               │              │
│  └─────────┘    └──────────────────┘              │
│   NORMAL            HIGH                            │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Nastavení Alarmu

```javascript
TodoPanel
  ├─ AlarmModal (user input)
  │   ├─ date: "2025-10-20"
  │   ├─ time: "14:30"
  │   └─ priority: "HIGH"
  │
  ├─ onSave() → updateTaskAlarm(taskId, {
  │               time: timestamp,
  │               priority: "HIGH",
  │               fired: false,
  │               acknowledged: false
  │             })
  │
  └─ useFloatingPanels.updateTaskAlarm()
      ├─ Update tasks state
      ├─ Save to secureStorage (encrypted)
      └─ Save to localStorage backup
```

### 2. Background Check

```javascript
useTodoAlarms
  ├─ useEffect() → setInterval(60000)
  │   └─ checkAlarms()
  │       ├─ Loop through tasks
  │       ├─ Check if alarm.time <= now
  │       └─ Check if !alarm.fired
  │
  ├─ If NORMAL priority:
  │   └─ onNotification({
  │       type: 'TODO_ALARM',
  │       message: task.text,
  │       ...
  │     })
  │     └─ addNotification() in Layout
  │         └─ Shows in NotificationBell 🔔
  │
  └─ If HIGH priority:
      └─ setActiveAlarms([...prev, task])
          └─ FloatingAlarmManager
              └─ Maps to FloatingAlarmPopup components
```

### 3. User Interaction

```javascript
FloatingAlarmPopup
  ├─ onDismiss(taskId)
  │   └─ Remove from activeAlarms
  │
  └─ onComplete(taskId)
      ├─ Remove from activeAlarms
      └─ toggleTask(taskId)
          └─ Mark task as done
```

---

## 🎨 Komponenty - API Reference

### FloatingAlarmPopup

**Props**:
```typescript
{
  alarm: {
    id: string,
    text: string,
    alarm: {
      time: number,
      priority: "NORMAL" | "HIGH",
      fired: boolean,
      acknowledged: boolean
    }
  },
  position: { x: number, y: number },
  onDismiss: (taskId: string) => void,
  onComplete: (taskId: string) => void,
  onPositionChange: (taskId: string, pos: {x, y}) => void
}
```

**Features**:
- Drag & drop (cursor: grab/grabbing)
- Animace slideIn/slideOut
- Pulsující ikona
- Responsive design

---

### FloatingAlarmManager

**Props**:
```typescript
{
  alarms: Array<Task>,
  onDismiss: (taskId: string) => void,
  onComplete: (taskId: string) => void
}
```

**Features**:
- Auto-positioning (cascade effect)
- Tracks all popup positions
- Prevents overlap
- Responsive to viewport size

---

### AlarmModal (v TodoPanel)

**Props**:
```typescript
{
  task: Task,
  onClose: () => void,
  onSave: (alarm: AlarmData | null) => void
}
```

**AlarmData**:
```typescript
{
  time: number,        // Unix timestamp
  priority: "NORMAL" | "HIGH",
  fired: boolean,
  acknowledged: boolean
}
```

**Features**:
- Date/Time pickers
- Quick +15m button
- Priority selector (visual buttons)
- Remove alarm option
- ReactDOM.createPortal to body

---

## 🔐 Bezpečnost & Storage

### localStorage Structure

```javascript
// Per-user encrypted tasks
`layout_tasks_${userId}` = encrypted([
  {
    id: "task-123",
    text: "...",
    alarm: {
      time: 1234567890,
      priority: "HIGH",
      fired: false,
      acknowledged: false
    }
  },
  ...
])

// Quick access alarm cache (unencrypted, minimal data)
`todo-alarms-${userId}` = JSON.stringify([
  {
    id: "task-123",
    text: "...",
    alarmTime: 1234567890,
    alarmPriority: "HIGH",
    userId: "user-456"
  },
  ...
])
```

### Šifrování

- **Tasks**: Šifrovány přes `secureStorage.setItem()`
- **Alarms cache**: Nešifrován (pouze metadata pro check)
- **Session**: `checkedAlarmsRef` v paměti (neiersistuje)

---

## ⚡ Performance Optimizations

### 1. Background Check Interval

```javascript
// 60 sekund místo 1 sekundy
setInterval(checkAlarms, 60000);

// Proč?
// - Nepotřebujeme sekundovou přesnost
// - Šetří CPU cycles
// - Baterie friendly na mobilech
```

### 2. Session Cache

```javascript
const checkedAlarmsRef = useRef(new Set());

// Zabrání duplicitnímu odpálení
// Bez dotazu do localStorage
// O(1) lookup
```

### 3. Lazy Rendering

```javascript
// Floating popups se renderují jen když existují
{activeAlarms.length > 0 && (
  <FloatingAlarmManager alarms={activeAlarms} />
)}

// TodoItemRow podmíněně renderuje alarm info
{alarmTime && (
  <span>...</span>
)}
```

### 4. Memoization

```javascript
// AlarmPriority vypočítán pouze když se změní task.alarm
const alarmPriority = useMemo(() => getAlarmPriority(), [task.alarm]);
```

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] `getAlarmPriority()` - správně detekuje priority
- [ ] `getAlarmTime()` - kompatibilita se starým/novým formátem
- [ ] `checkAlarms()` - filtruje správné alarmy
- [ ] `calculatePosition()` - nová okna se nepřekrývají

### Integration Tests

- [ ] NORMAL alarm → Zobrazí se v notifikacích
- [ ] HIGH alarm → Zobrazí se floating popup
- [ ] Více HIGH alarmů → Více popup oken
- [ ] Dismiss popup → Zmizí z activeAlarms
- [ ] Complete from popup → Označí task jako done
- [ ] F5 refresh → Alarmy persistují
- [ ] Session duplicates → Alarm se neodpálí 2x

### Manual Testing Scenarios

```javascript
// Test 1: NORMAL alarm za 1 minutu
1. Vytvoř task s NORMAL alarmem za 1 min
2. Počkej 1-2 minuty
3. ✅ Měla by se objevit notifikace v 🔔

// Test 2: HIGH alarm za 1 minutu
1. Vytvoř task s HIGH alarmem za 1 min
2. Počkej 1-2 minuty
3. ✅ Mělo by se objevit floating okénko

// Test 3: Více HIGH alarmů najednou
1. Vytvoř 3 tasky s HIGH alarmem současně
2. Počkej do vypršení
3. ✅ Měla by se objevit 3 okénka vedle sebe

// Test 4: Drag & Drop popup
1. Vyvolej HIGH alarm
2. Chyť okénko myší
3. ✅ Měl by jít přesouvat
4. ✅ Cursor: grab → grabbing

// Test 5: Complete from popup
1. Vyvolej HIGH alarm
2. Klikni "Označit hotové"
3. ✅ Okénko zmizí
4. ✅ Task je označen jako done
5. ✅ Task má done checkmark

// Test 6: Persistence přes F5
1. Nastav alarm za 5 min
2. F5 refresh
3. Počkej do vypršení
4. ✅ Alarm by se měl odpálit

// Test 7: Zpětná kompatibilita
1. Nastav starý formát: task.alarm = timestamp
2. ✅ Mělo by fungovat jako NORMAL
3. ✅ Žluté podbarvení
```

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Minutová přesnost**
   - Check interval je 60 sekund
   - Alarm může odpálit až o minutu později

2. **Offline režim**
   - Background check běží jen když je app otevřená
   - Neodpálí se když zavřeš tab

3. **Opakující se alarmy**
   - Zatím není podporováno
   - Musíš vytvořit nový task

4. **Timezone**
   - Používá local time
   - Problém při cestování přes časová pásma

5. **Mobile**
   - Drag & drop může být problematický na touch
   - Floating okna mohou být malá na mobile

### Workarounds

```javascript
// Issue: Alarm didn't fire
// Workaround: Manual check
const { checkAlarms } = useTodoAlarms(...);
useEffect(() => {
  // Force check on mount
  checkAlarms();
}, []);

// Issue: Too many HIGH popups
// Workaround: Use NORMAL for less critical
priority: taskImportance > 8 ? "HIGH" : "NORMAL"

// Issue: Popup blocking view
// Workaround: Dismiss and check notifications
onDismiss(taskId); // Popup zmizí ale task zůstane
```

---

## 🚀 Future Enhancements

### Priority 1 (Must Have)

- [ ] **Snooze funkce** (odložit o X minut)
- [ ] **Sound notifications** (zvuk při odpálení)
- [ ] **Mobile touch support** (lepší drag na mobilech)

### Priority 2 (Nice to Have)

- [ ] **Recurring alarms** (denně, týdně, měsíčně)
- [ ] **Custom alarm sounds** (upload vlastních zvuků)
- [ ] **Email notifications** (pro HIGH priority)
- [ ] **Alarm history** (log všech odpálených)

### Priority 3 (Future)

- [ ] **Service Worker** (offline alarm firing)
- [ ] **Push notifications** (browser push API)
- [ ] **Timezone handling** (cestovateli-friendly)
- [ ] **Voice commands** ("Nastav alarm na 14:00")
- [ ] **AI suggestions** (doporučení kdy nastavit alarm)

---

## 📊 Metrics & Analytics

### Track These Metrics

```javascript
// Kolik alarmů se odpálilo?
localStorage.getItem('alarm-fired-count');

// Jaká je preference NORMAL vs HIGH?
const normalCount = tasks.filter(t => 
  t.alarm?.priority === 'NORMAL'
).length;

const highCount = tasks.filter(t => 
  t.alarm?.priority === 'HIGH'
).length;

// Kolik alarmů bylo acknowledged?
const acknowledgedRate = 
  acknowledgedCount / totalFiredCount;
```

---

## 🎓 Developer Notes

### Styling Tips

```javascript
// Barvy jsou konzistentní s theme
NORMAL: '#fef3c7' (amber-100)
HIGH: '#fee2e2' (red-100)

// Použij stejné barvy pro:
- Background
- Border
- Left stripe
- Icon color
```

### Debugging Commands

```javascript
// V console:

// Zobraz všechny alarmy
JSON.parse(localStorage.getItem('todo-alarms-user123'))

// Force check alarmů
// (musíš mít referenci na checkAlarms)
checkAlarms()

// Reset checked alarms cache
checkedAlarmsRef.current.clear()

// Zobraz aktivní popupy
console.log(activeAlarms)
```

### Code Style Guidelines

```javascript
// ✅ GOOD: Destrukturuj alarm properties
const { time, priority, fired } = task.alarm;

// ❌ BAD: Přímý přístup
task.alarm.time

// ✅ GOOD: Zpětná kompatibilita
const alarmTime = typeof task.alarm === 'object' 
  ? task.alarm.time 
  : task.alarm;

// ❌ BAD: Předpokládej nový formát
const alarmTime = task.alarm.time;

// ✅ GOOD: Validace před použitím
if (alarmTime && alarmTime <= now && !fired) {
  // ...
}

// ❌ BAD: Bez validace
if (alarmTime <= now) {
  // může crashnout
}
```

---

**Verze**: 1.0  
**Poslední update**: 19.10.2025  
**Maintainer**: Development Team
