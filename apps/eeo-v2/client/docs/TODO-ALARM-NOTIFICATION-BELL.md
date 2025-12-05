# TODO Alarm - Notifikační Zvonek - Speciální Design

## 📋 Přehled

TODO alarmy s prioritou **NORMAL i HIGH** se zobrazují v notifikačním zvonečku na menu baru se **speciálním vizuálním designem**, který je odlišuje od ostatních notifikací.

### Priority Systém
- **NORMAL priority** 🟧 → Oranžový design, normální animace
- **HIGH priority** 🟥 → Červený design, rychlejší animace, také floating popup

## 🎨 Vizuální Design

### 🟧 NORMAL Priority Alarm

#### 1. **Oranžový Gradient Background**
```css
background: linear-gradient(135deg, 
  rgba(251, 146, 60, 0.08),   /* #fb923c světlá oranžová */
  rgba(249, 115, 22, 0.12),   /* #f97316 středně oranžová */
  rgba(234, 88, 12, 0.08)     /* #ea580c tmavší oranžová */
);
```

### 2. **Oranžový Levý Border**
- **Šířka:** 4px
- **Barva:** `#fb923c` (světlá oranžová)
- Vizuálně odděluje TODO alarmy od ostatních notifikací

### 3. **Stínování (Box Shadow)**
```css
box-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);

/* Při hoveru: */
box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
```

### 4. **Animovaná Ikona Zvonečku (⏰)**
```css
@keyframes bell-ring {
  0%, 100% { transform: rotate(0deg); }
  10% { transform: rotate(-10deg); }
  20% { transform: rotate(10deg); }
  30% { transform: rotate(-10deg); }
  40% { transform: rotate(10deg); }
  50% { transform: rotate(0deg); }
}

animation: bell-ring 1s ease infinite;
font-size: 24px; /* Větší než ostatní ikony (20px) */
filter: drop-shadow(0 2px 4px rgba(249, 115, 22, 0.4));
```

### 5. **Oranžový Titulek**
- **Barva:** `#ea580c` (tmavá oranžová)
- **Font-weight:** 800 (extra tučné)
- **Text-shadow:** `0 1px 2px rgba(249, 115, 22, 0.2)`

### 6. **Hover Efekt**
```css
&:hover {
  background: linear-gradient(135deg, 
    rgba(251, 146, 60, 0.15),
    rgba(249, 115, 22, 0.18),
    rgba(234, 88, 12, 0.12)
  );
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
  transform: translateX(2px); /* Posun doprava */
}
```

---

### 🟥 HIGH Priority Alarm

#### 1. **Červený Gradient Background**
```css
background: linear-gradient(135deg, 
  rgba(239, 68, 68, 0.12),   /* #ef4444 */
  rgba(220, 38, 38, 0.15),   /* #dc2626 */
  rgba(185, 28, 28, 0.1)     /* #b91c1c */
);
```

#### 2. **Tlustší Červený Levý Border**
- **Šířka:** 5px (oproti 4px u NORMAL)
- **Barva:** `#dc2626` (červená)

#### 3. **Výraznější Stínování**
```css
box-shadow: 0 3px 12px rgba(220, 38, 38, 0.25);

/* Při hoveru: */
box-shadow: 0 5px 16px rgba(220, 38, 38, 0.35);
```

#### 4. **Rychlejší Animace Ikony (⚠️)**
```css
@keyframes bell-ring-fast {
  0%, 100% { transform: rotate(0deg) scale(1); }
  10% { transform: rotate(-12deg) scale(1.05); }
  20% { transform: rotate(12deg) scale(1.05); }
  30% { transform: rotate(-12deg) scale(1.05); }
  40% { transform: rotate(12deg) scale(1.05); }
  50% { transform: rotate(0deg) scale(1); }
}

animation: bell-ring-fast 0.6s ease infinite;  /* Rychlejší než NORMAL */
font-size: 26px; /* Větší než NORMAL (24px) */
filter: drop-shadow(0 3px 6px rgba(220, 38, 38, 0.5));
```

#### 5. **Červený Titulek**
- **Barva:** `#dc2626` (červená)
- **Font-weight:** 900 (extra extra tučné)
- **Text-shadow:** `0 1px 3px rgba(220, 38, 38, 0.3)`

#### 6. **Výraznější Hover Efekt**
```css
&:hover {
  background: linear-gradient(135deg, 
    rgba(239, 68, 68, 0.18),
    rgba(220, 38, 38, 0.22),
    rgba(185, 28, 28, 0.15)
  );
  box-shadow: 0 5px 16px rgba(220, 38, 38, 0.35);
  transform: translateX(3px); /* Větší posun než NORMAL */
}
```

---

## 🔧 Technická Implementace

### 1. **Typ Notifikace**
```javascript
// V notificationsApi.js
NOTIFICATION_TYPES.TODO_ALARM = 'TODO_ALARM';

NOTIFICATION_CONFIG[NOTIFICATION_TYPES.TODO_ALARM] = {
  icon: '⏰',
  color: '#f97316',
  category: 'todo',
  label: 'TODO Alarm',
  priority: 'normal',
  gradient: 'linear-gradient(135deg, #fb923c, #f97316, #ea580c)',
  borderColor: '#fb923c',
  shadowColor: 'rgba(249, 115, 22, 0.3)'
};
```

### 2. **Struktura Notifikace v Layout.js**
```javascript
const handleTodoAlarmNotification = useCallback((notification) => {
  setNotifications(prev => [{
    id: notification.id,
    type: 'TODO_ALARM',  // 🔑 Klíčový identifikátor
    title: `⏰ TODO Alarm: ${notification.message}`,
    message: notification.message,
    dt_created: new Date(notification.timestamp).toISOString(),
    timestamp: notification.timestamp,
    is_read: 0, // 0 = nepřečtená
    read: false,
    data: {
      taskId: notification.taskId,
      alarmTime: notification.alarmTime
    }
  }, ...prev]);
}, [setNotifications]);
```

### 3. **Detekce TODO Alarmu v NotificationBell.js**
```javascript
notifications.map(notification => {
  const config = getNotificationConfig(notification.type);
  const isUnread = !notification.is_read || notification.is_read === 0;
  const isTodoAlarm = notification.type === 'TODO_ALARM'; // 🔑 Detekce
  
  return (
    <NotificationItem
      isTodoAlarm={isTodoAlarm}  // Předání prop
      isUnread={isUnread}
    >
      <NotificationIcon isTodoAlarm={isTodoAlarm}>
        {config.icon}
      </NotificationIcon>
      <NotificationTitle isUnread={isUnread} isTodoAlarm={isTodoAlarm}>
        {notification.title}
      </NotificationTitle>
    </NotificationItem>
  );
});
```

### 4. **Styled Components s Podmínkami**
```javascript
const NotificationItem = styled.div`
  /* Základní styling... */
  
  /* Speciální styling pro TODO alarmy */
  ${props => props.isTodoAlarm && `
    background: linear-gradient(...);
    border-left: 4px solid #fb923c;
    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);
    
    &:hover {
      background: linear-gradient(...);
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
      transform: translateX(2px);
    }
  `}
`;
```

## 🎯 Workflow

```
┌──────────────────────┐
│  TODO Panel          │
│  - Uživatel nastaví  │
│    alarm s prioritou │
│    NORMAL            │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  useTodoAlarms Hook  │
│  - Každých 60s check │
│  - Najde expirovaný  │
│    NORMAL alarm      │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  Layout.js           │
│  handleTodoAlarm     │
│  Notification()      │
│  - Vytvoří notifikaci│
│    type: TODO_ALARM  │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  NotificationBell.js │
│  - Detekuje TODO_    │
│    ALARM             │
│  - Aplikuje speciální│
│    styling           │
│  - Zobrazí s orange  │
│    gradientem + anim │
└──────────────────────┘
```

## 🎭 Vizuální Srovnání

### Normální Notifikace
```
┌────────────────────────────────┐
│ 📋  Objednávka schválena       │  ← Modrá ikona, bílé pozadí
│     Vaše objednávka #12345...  │
│     před 5 minutami            │
└────────────────────────────────┘
```

### TODO Alarm (Speciální)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃⏰⏰  TODO Alarm: Dokončit report  ┃  ← Animovaná ikona, oranžový gradient
┃     Dokončit report             ┃     Levý border 4px
┃     před 2 minutami             ┃     Box shadow
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
    ↑ Oranžový levý border
```

## 🎨 Barevná Paleta

| Element | Barva | Hex | RGB |
|---------|-------|-----|-----|
| **Světlá oranžová** | 🟧 | `#fb923c` | `rgb(251, 146, 60)` |
| **Středně oranžová** | 🟧 | `#f97316` | `rgb(249, 115, 22)` |
| **Tmavá oranžová** | 🟧 | `#ea580c` | `rgb(234, 88, 12)` |

## 🔍 Debug

### Console Log Output
```javascript
[NotificationBell] RENDER notification: {
  id: 1760831339944,
  title: "⏰ TODO Alarm: Dokončit report",
  type: "TODO_ALARM",          // ✅ Klíčový identifikátor
  isTodoAlarm: true,            // ✅ Detekováno
  is_read: 0,
  isUnread: true,
  willApplyBoldStyle: true
}
```

## ✅ Checklist Implementace

- [x] Přidat `TODO_ALARM` typ do `NOTIFICATION_TYPES`
- [x] Vytvořit konfiguraci v `NOTIFICATION_CONFIG`
- [x] Přidat `isTodoAlarm` prop do `NotificationItem`
- [x] Přidat `isTodoAlarm` prop do `NotificationIcon`
- [x] Přidat `isTodoAlarm` prop do `NotificationTitle`
- [x] Implementovat oranžový gradient background
- [x] Implementovat 4px levý border
- [x] Implementovat box shadow
- [x] Implementovat animaci zvonečku
- [x] Implementovat hover efekty
- [x] Aktualizovat `handleTodoAlarmNotification` v Layout.js
- [x] Přidat debug logging

## 🚀 Testování

### 1. Vytvořit TODO s NORMAL alarmem
```javascript
// V TodoPanel.js
{
  text: "Testovací úkol",
  alarm: {
    time: Date.now() + 10000, // Za 10 sekund
    priority: "NORMAL"
  }
}
```

### 2. Počkat 10 sekund
- Alarm by se měl spustit
- Notifikace by měla přijít do zvonečku

### 3. Otevřít notifikační zvonek
- Hledat notifikaci s typem `TODO_ALARM`
- Zkontrolovat:
  - ✅ Oranžový gradient pozadí
  - ✅ Oranžový levý border 4px
  - ✅ Animovaná ikona ⏰
  - ✅ Oranžový titulek
  - ✅ Box shadow
  - ✅ Hover efekt s translateX(2px)

## 📦 Soubory

| Soubor | Změny |
|--------|-------|
| `src/services/notificationsApi.js` | Přidán `TODO_ALARM` typ a konfigurace |
| `src/components/NotificationBell.js` | Přidán speciální styling pro TODO alarmy |
| `src/components/Layout.js` | Aktualizován `handleTodoAlarmNotification` |
| `TODO-ALARM-NOTIFICATION-BELL.md` | Dokumentace (tento soubor) |

## 🎓 Poznámky pro vývojáře

1. **TODO alarmy s HIGH prioritou** → FloatingAlarmPopup (jiný systém)
2. **TODO alarmy s NORMAL prioritou** → NotificationBell (tento systém)
3. Klíčový identifikátor: `type: 'TODO_ALARM'`
4. Detekce v render loop: `const isTodoAlarm = notification.type === 'TODO_ALARM'`
5. Styling podmíněně přes `${props => props.isTodoAlarm && `...`}`

---

**Vytvořeno:** 19. října 2025  
**Autor:** GitHub Copilot  
**Status:** ✅ Implementováno
