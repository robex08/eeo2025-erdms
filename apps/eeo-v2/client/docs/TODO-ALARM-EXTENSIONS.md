# TODO Alarm - Rozšíření Funkcí

## 📋 Přehled změn

Přidány dvě nové funkce do TODO alarm systému:

1. **Počet aktivních alarmů na TODO ikoně** (vlevo nahoře)
2. **HIGH priority alarmy v notifikačním zvonečku** (kromě floating popup)

---

## 🎯 1. Počet Aktivních Alarmů na TODO Ikoně

### Vizuální Design

#### Pozice Badgů
```
┌─────────────────┐
│  ⏰  📝  🔔      │  TODO ikona s dvěma badgi
│     📋          │
│     ├─ ⏰ vlevo  │  Počet aktivních alarmů
│     └─ 5 vpravo │  Počet nedokončených úkolů
└─────────────────┘
```

#### Styling - Levý Badge (Alarmy)
```css
position: absolute;
top: -6px;
left: -6px;  /* VLEVO */
background: linear-gradient(135deg, #fb923c, #f97316);  /* Oranžový gradient */
color: white;
border-radius: 50%;
min-width: 18px;
height: 18px;
font-size: 11px;
border: 2px solid white;
box-shadow: 0 2px 6px rgba(249, 115, 22, 0.4);  /* Oranžový stín */
content: ⏰  /* Emoji zvonečku */
```

#### Styling - Pravý Badge (Nedokončené úkoly)
```css
position: absolute;
top: -6px;
right: -6px;  /* VPRAVO */
background: #dc2626;  /* Červená */
color: white;
border-radius: 50%;
min-width: 18px;
height: 18px;
font-size: 11px;
border: 2px solid white;
content: "5"  /* Číslo úkolů */
```

### Implementace

#### Layout.js - Výpočet Počtu Alarmů
```javascript
// Počet aktivních TODO alarmů pro badge (vlevo na ikoně)
const activeAlarmsCount = useMemo(() => {
  const now = Date.now();
  return tasks.filter(task => {
    if (!task.alarm || task.done) return false;
    const alarmTime = typeof task.alarm === 'object' ? task.alarm.time : task.alarm;
    return alarmTime && alarmTime > now; // Budoucí aktivní alarmy
  }).length;
}, [tasks]);
```

#### Layout.js - Renderování Badgů
```javascript
<RoundFab /* TODO ikona */ style={{ position: 'relative' }}>
  <FontAwesomeIcon icon={faTasks} />
  
  {/* Badge vlevo - počet aktivních alarmů */}
  {!todoOpen && activeAlarmsCount > 0 && (
    <span style={{ /* levý badge styling */ }}>
      ⏰
    </span>
  )}
  
  {/* Badge vpravo - počet nedokončených úkolů */}
  {!todoOpen && unfinishedTasksCount > 0 && (
    <span style={{ /* pravý badge styling */ }}>
      {unfinishedTasksCount > 99 ? '99+' : unfinishedTasksCount}
    </span>
  )}
</RoundFab>
```

### Příklad

```
TODO ikona bez otevřeného panelu:

┌──────────┐
│ ⏰       │  ← Levý badge: 2 aktivní alarmy
│    📋    │
│       5  │  ← Pravý badge: 5 nedokončených úkolů
└──────────┘
```

---

## 🔔 2. HIGH Priority Alarmy v Notifikačním Zvonečku

### Změna Chování

#### Před změnou:
- **NORMAL alarmy** → pouze notifikační zvonek
- **HIGH alarmy** → pouze floating popup

#### Po změně:
- **NORMAL alarmy** → pouze notifikační zvonek (beze změny)
- **HIGH alarmy** → floating popup **+ notifikační zvonek** ✨

### Vizuální Design HIGH Alarmů

#### Gradient Background - Červený
```css
background: linear-gradient(135deg, 
  rgba(239, 68, 68, 0.12),   /* #ef4444 */
  rgba(220, 38, 38, 0.15),   /* #dc2626 */
  rgba(185, 28, 28, 0.1)     /* #b91c1c */
);
```

#### Border - Tlustší Červený
```css
border-left: 5px solid #dc2626;  /* 5px místo 4px pro NORMAL */
border-bottom: 1px solid rgba(239, 68, 68, 0.3);
```

#### Box Shadow - Výraznější Červený
```css
box-shadow: 0 3px 12px rgba(220, 38, 38, 0.25);

/* Při hoveru: */
box-shadow: 0 5px 16px rgba(220, 38, 38, 0.35);
```

#### Ikona - Rychlejší Animace
```css
font-size: 26px;  /* Větší než NORMAL (24px) */
animation: bell-ring-fast 0.6s ease infinite;  /* Rychlejší než NORMAL (1s) */
filter: drop-shadow(0 3px 6px rgba(220, 38, 38, 0.5));  /* Červený stín */

@keyframes bell-ring-fast {
  0%, 100% { transform: rotate(0deg) scale(1); }
  10% { transform: rotate(-12deg) scale(1.05); }  /* Větší rotace */
  20% { transform: rotate(12deg) scale(1.05); }
  30% { transform: rotate(-12deg) scale(1.05); }
  40% { transform: rotate(12deg) scale(1.05); }
  50% { transform: rotate(0deg) scale(1); }
}
```

#### Titulek - Červený
```css
color: #dc2626 !important;
font-weight: 900 !important;  /* Extra tučné */
text-shadow: 0 1px 3px rgba(220, 38, 38, 0.3);
```

#### Hover Efekt - Výraznější
```css
&:hover {
  background: linear-gradient(135deg, 
    rgba(239, 68, 68, 0.18),
    rgba(220, 38, 38, 0.22),
    rgba(185, 28, 28, 0.15)
  );
  box-shadow: 0 5px 16px rgba(220, 38, 38, 0.35);
  transform: translateX(3px);  /* 3px místo 2px pro NORMAL */
}
```

### Implementace

#### useTodoAlarms.js - Odesílání HIGH do Notifikací
```javascript
if (alarmPriority === 'HIGH') {
  // HIGH priority - floating popup + notifikace do zvonečku
  newHighAlarms.push({
    ...task,
    alarm: updatedAlarm
  });
  
  // ✨ Poslat i do notifikací (NOVÉ)
  if (onNotification) {
    onNotification({
      id: `todo-alarm-high-${task.id}`,
      type: 'todo-alarm',
      priority: 'HIGH',  // 🔑 Klíčové
      title: '🚨 TODO Alarm (HIGH)',
      message: task.text,
      timestamp: now,
      taskId: task.id,
      alarmTime: alarmTime
    });
  }
}
```

#### Layout.js - Přijetí HIGH Priority
```javascript
const handleTodoAlarmNotification = useCallback((notification) => {
  const isHighPriority = notification.priority === 'HIGH';
  
  setNotifications(prev => [{
    id: notification.id,
    type: 'TODO_ALARM',
    title: isHighPriority 
      ? `🚨 TODO Alarm (HIGH): ${notification.message}` 
      : `⏰ TODO Alarm: ${notification.message}`,
    message: notification.message,
    dt_created: new Date(notification.timestamp).toISOString(),
    timestamp: notification.timestamp,
    is_read: 0,
    read: false,
    priority: notification.priority || 'NORMAL',  // 🔑 Uložení priority
    data: {
      taskId: notification.taskId,
      alarmTime: notification.alarmTime
    }
  }, ...prev]);
}, [setNotifications]);
```

#### NotificationBell.js - Detekce Priority
```javascript
notifications.map(notification => {
  const config = getNotificationConfig(notification.type);
  const isUnread = !notification.is_read || notification.is_read === 0;
  const isTodoAlarm = notification.type === 'TODO_ALARM';
  const priority = notification.priority || 'NORMAL';  // 🔑 Načtení priority
  
  return (
    <NotificationItem
      isTodoAlarm={isTodoAlarm}
      priority={priority}  // 🔑 Předání do styled components
    >
      <NotificationIcon isTodoAlarm={isTodoAlarm} priority={priority}>
        {config.icon}
      </NotificationIcon>
      <NotificationTitle isUnread={isUnread} isTodoAlarm={isTodoAlarm} priority={priority}>
        {notification.title}
      </NotificationTitle>
    </NotificationItem>
  );
});
```

#### NotificationBell.js - Podmíněný Styling
```javascript
const NotificationItem = styled.div`
  /* Základní styling... */
  
  /* NORMAL priority - oranžový */
  ${props => props.isTodoAlarm && props.priority !== 'HIGH' && `
    background: linear-gradient(135deg, rgba(251, 146, 60, 0.08), ...);
    border-left: 4px solid #fb923c;
    ...
  `}
  
  /* HIGH priority - červený */
  ${props => props.isTodoAlarm && props.priority === 'HIGH' && `
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), ...);
    border-left: 5px solid #dc2626;
    ...
  `}
`;
```

---

## 🎨 Vizuální Srovnání

### NORMAL Priority Alarm
```
┌────────────────────────────────────┐
│ ⏰  TODO Alarm: Dokončit report    │  ← Oranžová ikona (animace 1s)
│     Dokončit report pro management │     Oranžový gradient pozadí
│     před 2 minutami                │     Border 4px
└────────────────────────────────────┘
     ↑ Oranžový levý border
```

### HIGH Priority Alarm
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃⚠️⚠️ TODO Alarm (HIGH): URGENTNÍ!   ┃  ← Červená ikona (animace 0.6s)
┃    URGENTNÍ! Zavolat klientovi    ┃     Červený gradient pozadí
┃    právě teď                       ┃     Border 5px
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
     ↑ Tlustší červený levý border
```

---

## 🔄 Workflow

### 1. TODO Ikona s Badgi
```
┌─────────────────────────────────────┐
│ Uživatel vytvoří TODO úkoly         │
│ s alarmy (NORMAL/HIGH)              │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ Layout.js vypočítá activeAlarmsCount│
│ (počet budoucích alarmů)            │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ Zobrazí se badges:                  │
│ - Vlevo: ⏰ (aktivní alarmy)        │
│ - Vpravo: 5 (nedokončené úkoly)     │
└─────────────────────────────────────┘
```

### 2. HIGH Alarm v Notifikacích
```
┌─────────────────────────────────────┐
│ Alarm s HIGH prioritou expiruje     │
└──────────┬──────────────────────────┘
           │
           ├─────────────────────────┐
           │                         │
           ↓                         ↓
┌──────────────────┐    ┌────────────────────┐
│ FloatingAlarmPopup│   │ NotificationBell   │
│ (Floating okénko) │   │ (Zvonek v menu)    │
│ - Červené         │   │ - Červený design   │
│ - Draggable       │   │ - Rychlá animace   │
│ - Dismiss/Complete│   │ - Border 5px       │
└──────────────────┘    └────────────────────┘
```

---

## 📊 Srovnávací Tabulka

| Feature | NORMAL Priority | HIGH Priority |
|---------|----------------|---------------|
| **Notifikační zvonek** | ✅ Ano (oranžový) | ✅ Ano (červený) |
| **Floating popup** | ❌ Ne | ✅ Ano |
| **Badge na TODO ikoně** | ✅ Počítá se | ✅ Počítá se |
| **Background gradient** | Oranžový (8-12%) | Červený (12-15%) |
| **Border šířka** | 4px | 5px |
| **Border barva** | #fb923c | #dc2626 |
| **Ikona velikost** | 24px | 26px |
| **Animace rychlost** | 1s | 0.6s |
| **Hover translateX** | 2px | 3px |
| **Titulek barva** | #ea580c | #dc2626 |
| **Font-weight** | 800 | 900 |

---

## 🧪 Testování

### Test 1: Badge Aktivních Alarmů
```javascript
// 1. Vytvořit 3 TODO úkoly s alarmy v budoucnosti
// 2. Zavřít TODO panel
// 3. Zkontrolovat TODO ikonu
// ✅ Měl by se zobrazit badge vlevo s ⏰
```

### Test 2: NORMAL Alarm v Zvonečku
```javascript
// 1. Vytvořit TODO s alarmem NORMAL za 10 sekund
// 2. Počkat 10 sekund
// 3. Otevřít notifikační zvonek
// ✅ Měla by se zobrazit oranžová notifikace
```

### Test 3: HIGH Alarm Všude
```javascript
// 1. Vytvořit TODO s alarmem HIGH za 10 sekund
// 2. Počkat 10 sekund
// 3. Zkontrolovat:
//    ✅ Floating popup (červené okénko)
//    ✅ Notifikační zvonek (červená notifikace)
```

### Test 4: Badge Mix
```javascript
// 1. Vytvořit:
//    - 2 TODO s alarmy v budoucnosti
//    - 5 TODO bez alarmů (nedokončené)
// 2. Zavřít TODO panel
// 3. Zkontrolovat TODO ikonu:
//    ✅ Vlevo: ⏰ badge
//    ✅ Vpravo: "5" badge
```

---

## 📦 Změněné Soubory

| Soubor | Změny |
|--------|-------|
| `src/components/Layout.js` | Přidán `activeAlarmsCount`, levý badge na TODO ikoně, aktualizován `handleTodoAlarmNotification` |
| `src/hooks/useTodoAlarms.js` | HIGH alarmy posílají notifikaci i do zvonečku |
| `src/components/NotificationBell.js` | Přidán styling pro HIGH priority (červený design) |
| `TODO-ALARM-EXTENSIONS.md` | Dokumentace (tento soubor) |

---

## 🎓 Klíčové Poznatky

1. **Dva badgi na jedné ikoně:**
   - Vlevo: Aktivní alarmy (budoucí) - oranžový gradient
   - Vpravo: Nedokončené úkoly - červený solid

2. **HIGH alarmy duplicitně:**
   - Floating popup: Pro okamžitou pozornost
   - Notifikační zvonek: Pro trvalý záznam

3. **Vizuální hierarchie:**
   - HIGH červenější, větší, rychlejší než NORMAL
   - Border 5px vs 4px
   - Animace 0.6s vs 1s

4. **Podmíněný styling:**
   - `${props => props.isTodoAlarm && props.priority === 'HIGH' && ...}`
   - Umožňuje různý design pro NORMAL/HIGH

---

**Vytvořeno:** 19. října 2025  
**Autor:** GitHub Copilot  
**Status:** ✅ Implementováno a zdokumentováno
