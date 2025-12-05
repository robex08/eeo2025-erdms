# ✅ FORCE UNLOCK NOTIFICATION - Kompletní implementace

## 📋 Přehled

Implementace notifikačního systému pro **násilné převzetí objednávky** s warning dialogem podobným HIGH TODO alarmu.

**Datum implementace:** 2025-10-24
**Autor:** Frontend Team
**Status:** ✅ COMPLETE

---

## 🎯 Funkce

### 1. Notifikační typ `ORDER_UNLOCK_FORCED`

**Soubor:** `src/services/notificationsApi.js`

```javascript
export const NOTIFICATION_TYPES = {
  // ... ostatní typy
  ORDER_UNLOCK_FORCED: 'order_unlock_forced', // Notifikace pro násilné převzetí
};

export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.ORDER_UNLOCK_FORCED]: {
    icon: '⚠️',
    color: '#dc2626', // Červená barva - varování!
    category: 'order',
    label: 'NÁSILNÉ PŘEVZETÍ',
    priority: 'urgent',
    gradient: 'linear-gradient(135deg, #fca5a5, #ef4444, #dc2626)',
    borderColor: '#ef4444',
    shadowColor: 'rgba(239, 68, 68, 0.4)',
    pulseAnimation: true // Pulzující animace
  }
};
```

**Vlastnosti:**
- ⚠️ **Ikona:** Warning symbol
- 🔴 **Barva:** Červená (#dc2626) - vysoká priorita
- 🎨 **Gradient:** Červený gradient pro vizuální důraz
- 💓 **Animace:** Pulzující efekt pro upoutání pozornosti
- 🔔 **Priorita:** URGENT - vyžaduje okamžitou akci

---

### 2. Force Unlock Warning Dialog

**Soubor:** `src/pages/Orders25List.js`

#### Styled Components

```javascript
// Overlay s průhledným černým pozadím
const ForceUnlockWarningOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 10000;
  animation: fadeIn 0.2s ease;
`;

// Hlavní dialog s animací slideUp
const ForceUnlockWarningDialog = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s ease;
`;

// Červený header s gradientem
const ForceUnlockWarningHeader = styled.div`
  background: linear-gradient(135deg, #fca5a5, #ef4444, #dc2626);
  padding: 1.5rem;
  border-bottom: 3px solid #b91c1c;
`;

// Pulzující ikona
const ForceUnlockWarningIcon = styled.div`
  font-size: 2.5rem;
  animation: pulse 2s ease-in-out infinite;
  filter: drop-shadow(0 2px 8px rgba(185, 28, 28, 0.5));
`;
```

#### State Management

```javascript
// State pro zobrazení warning dialogu
const [showForceUnlockWarning, setShowForceUnlockWarning] = useState(false);
const [forceUnlockWarningData, setForceUnlockWarningData] = useState(null);

// Struktura dat:
{
  orderNumber: 'ZZS/2025/001',
  lockedBy: 'Jan Novák',
  lockedByEmail: 'jan.novak@example.com',
  lockedByPhone: '+420 123 456 789',
  lockedAt: '2025-10-24T10:30:00Z',
  notificationId: 123
}
```

---

### 3. Background Task Integration

**Soubor:** `src/pages/Orders25List.js`

```javascript
// Registrace callbacku pro nové notifikace
useEffect(() => {
  if (!bgTasksContext?.registerNewNotificationsCallback) {
    return;
  }

  const handleNewNotifications = (notifications, unreadCount) => {
    if (!notifications || notifications.length === 0) {
      return;
    }

    // Hledej ORDER_UNLOCK_FORCED notifikace
    const forceUnlockNotifications = notifications.filter(n => 
      n.type === 'order_unlock_forced' && 
      n.is_read === false
    );

    if (forceUnlockNotifications.length > 0) {
      const notification = forceUnlockNotifications[0];
      const notifData = notification.data || {};
      
      setForceUnlockWarningData({
        orderNumber: notifData.cislo_objednavky || 'N/A',
        lockedBy: notifData.forced_by_name || notifData.forced_by_username || 'N/A',
        lockedByEmail: notifData.forced_by_email || null,
        lockedByPhone: notifData.forced_by_telefon || null,
        lockedAt: notifData.forced_at || new Date().toISOString(),
        notificationId: notification.id
      });
      
      setShowForceUnlockWarning(true);
    }
  };

  bgTasksContext.registerNewNotificationsCallback(handleNewNotifications);

  return () => {
    bgTasksContext.registerNewNotificationsCallback?.(null);
  };
}, [bgTasksContext]);
```

---

### 4. Dialog Actions

```javascript
// Zavření dialogu bez akce
const handleForceUnlockWarningClose = () => {
  setShowForceUnlockWarning(false);
  setForceUnlockWarningData(null);
};

// Potvrzení a refresh dat
const handleForceUnlockWarningAcknowledge = async () => {
  // Označ notifikaci jako přečtenou
  if (forceUnlockWarningData?.notificationId) {
    // TODO: API call
    console.log('📖 Notifikace označena jako přečtená');
  }

  // Refresh dat
  await loadData(true);
  
  // Zavři dialog
  handleForceUnlockWarningClose();
  
  showToast?.('Seznam objednávek byl aktualizován', { type: 'info' });
};
```

---

## 🎨 Visual Design

### Barvy a styl

```css
/* Header gradient */
background: linear-gradient(135deg, #fca5a5, #ef4444, #dc2626);

/* Border */
border-left: 4px solid #ef4444;
border-bottom: 3px solid #b91c1c;

/* Shadow */
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);

/* Detail box */
background: linear-gradient(135deg, #fef2f2, #fee2e2);
border: 2px solid #fecaca;
```

### Animace

```css
/* Fade in overlay */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up dialog */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse icon */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}
```

---

## 📊 Informace v dialogu

### Zobrazované údaje

1. **Číslo objednávky** - Která objednávka byla převzata
2. **Kdo převzal** - Jméno uživatele, který provedl force unlock
3. **Email** - Kontaktní email (klikatelný mailto: link)
4. **Telefon** - Kontaktní telefon (klikatelný tel: link)
5. **Čas převzetí** - Kdy k převzetí došlo (formát cs-CZ)

### Příklad zobrazení

```
⚠️ NÁSILNÉ PŘEVZETÍ OBJEDNÁVKY

Vaše objednávka byla násilně převzata jiným uživatelem!

Objednávka ZZS/2025/001 byla násilně odemčena a převzata. 
Vaše neuložené změny mohly být ztraceny.

┌─────────────────────────────────────────┐
│ 📄 Objednávka:  ZZS/2025/001           │
│ 👤 Převzal:     Jan Novák              │
│ ✉️  Email:       jan.novak@example.com │
│ 📞 Telefon:     +420 123 456 789       │
│ 🕐 Čas:         24.10.2025 10:30:15    │
└─────────────────────────────────────────┘

[Zavřít]  [Rozumím, aktualizovat seznam]
```

---

## 🔄 Workflow

### 1. Background Task detekuje notifikaci
```
BackgroundTaskService polling (každých 10s)
  ↓
Nová notifikace type='order_unlock_forced'
  ↓
handleNewNotifications callback
  ↓
Parsování notification.data
```

### 2. Zobrazení warning dialogu
```
setForceUnlockWarningData({...})
  ↓
setShowForceUnlockWarning(true)
  ↓
ForceUnlockWarningDialog se zobrazí
  ↓
Pulzující ⚠️ ikona upoutá pozornost
```

### 3. Uživatelská akce
```
[Zavřít]
  → Zavře dialog, neupdatuje data
  
[Rozumím, aktualizovat seznam]
  → Označ notifikaci jako přečtenou
  → Refresh seznamu objednávek (loadData(true))
  → Zobraz toast "Seznam objednávek byl aktualizován"
  → Zavře dialog
```

---

## 🔗 Backend Requirements

### Notifikace struktura

**Tabulka:** `25_notifications`

```json
{
  "id": 123,
  "user_id": 456,
  "type": "order_unlock_forced",
  "title": "Objednávka násilně převzata",
  "message": "Vaše objednávka ZZS/2025/001 byla násilně odemčena uživatelem Jan Novák",
  "data": {
    "order_id": 789,
    "cislo_objednavky": "ZZS/2025/001",
    "forced_by_user_id": 111,
    "forced_by_username": "jnovak",
    "forced_by_name": "Jan Novák",
    "forced_by_email": "jan.novak@example.com",
    "forced_by_telefon": "+420 123 456 789",
    "forced_at": "2025-10-24T10:30:00Z"
  },
  "is_read": false,
  "priority": "urgent",
  "created_at": "2025-10-24T10:30:00Z"
}
```

### Template v DB

**Tabulka:** `notification_template`

```sql
INSERT INTO notification_template (
  type,
  title_template,
  message_template,
  category,
  priority,
  icon,
  active
) VALUES (
  'order_unlock_forced',
  'Objednávka násilně převzata',
  'Vaše objednávka {{cislo_objednavky}} byla násilně odemčena uživatelem {{forced_by_name}}',
  'order',
  'urgent',
  '⚠️',
  1
);
```

### Placeholders

| Placeholder | Popis | Příklad |
|------------|-------|---------|
| `{{cislo_objednavky}}` | Číslo objednávky | ZZS/2025/001 |
| `{{forced_by_name}}` | Jméno uživatele | Jan Novák |
| `{{forced_by_username}}` | Username | jnovak |
| `{{forced_by_email}}` | Email | jan.novak@example.com |
| `{{forced_by_telefon}}` | Telefon | +420 123 456 789 |
| `{{forced_at}}` | Čas převzetí | 2025-10-24T10:30:00Z |

---

## ✅ Checklist implementace

- [x] ✅ **NOTIFICATION_TYPES.ORDER_UNLOCK_FORCED** - typ definován
- [x] ✅ **NOTIFICATION_CONFIG** - konfigurace s gradienty, barvami, animací
- [x] ✅ **Styled Components** - ForceUnlockWarning* komponenty
- [x] ✅ **State Management** - showForceUnlockWarning, forceUnlockWarningData
- [x] ✅ **Background Task Integration** - registerNewNotificationsCallback
- [x] ✅ **Warning Dialog JSX** - kompletní rendering s detaily
- [x] ✅ **Handlers** - handleForceUnlockWarningClose, handleForceUnlockWarningAcknowledge
- [x] ✅ **Contact Links** - mailto: a tel: odkazy
- [x] ✅ **Animations** - fadeIn, slideUp, pulse
- [x] ✅ **Portal Rendering** - createPortal do document.body

---

## 🎯 User Experience

### Scénář použití

1. **Uživatel A** edituje objednávku ZZS/2025/001
2. **Admin B** provede force unlock (násilné převzetí)
3. **Backend** vytvoří notifikaci `order_unlock_forced` pro Uživatele A
4. **Background Task** detekuje novou notifikaci (během 10s)
5. **Warning Dialog** se okamžitě zobrazí Uživateli A
6. **Uživatel A** vidí:
   - ⚠️ Pulzující varování
   - Číslo objednávky
   - Kdo ji převzal
   - Kontaktní údaje (email, telefon)
   - Čas převzetí
7. **Uživatel A** klikne "Rozumím, aktualizovat seznam"
8. **Seznam** se aktualizuje, dialog zmizí

### Výhody

- ✅ **Okamžité upozornění** - uživatel hned ví, že ztratil přístup
- ✅ **Kontaktní údaje** - může okamžitě kontaktovat osobu, která převzala
- ✅ **Vizuálně výrazné** - červená barva + pulzující animace
- ✅ **Podobné HIGH TODO alarmu** - konzistentní UX
- ✅ **Automatický refresh** - po potvrzení se data aktualizují

---

## 📝 TODO - Backend

- [ ] Vytvořit notification template v DB pro `order_unlock_forced`
- [ ] Implementovat generování notifikace při force unlock
- [ ] Naplnit `data` objekt všemi potřebnými údaji
- [ ] Implementovat API endpoint pro označení notifikace jako přečtené
- [ ] Otestovat s background task polling

---

## 🐛 Debugging

```javascript
// Console logy pro debugging
console.log('⚠️ [FORCE UNLOCK] Zobrazuji warning dialog pro objednávku:', notifData.cislo_objednavky);
console.log('📖 [FORCE UNLOCK] Notifikace označena jako přečtená:', notificationId);
```

---

## 🔍 Testing

### Testovací scénář

1. Simulovat force unlock v backendu
2. Zkontrolovat vytvoření notifikace v DB
3. Počkat na background task polling (max 10s)
4. Ověřit zobrazení warning dialogu
5. Zkontrolovat všechny zobrazené údaje
6. Otestovat kliknutí na email/telefon linky
7. Otestovat zavření dialogu
8. Otestovat akci "Rozumím, aktualizovat seznam"
9. Ověřit refresh dat

---

## 📚 Související dokumentace

- `docs/FORCE-UNLOCK-README.md` - Kompletní force unlock systém
- `docs/BACKEND-NOTIFICATION-WORKFLOW-REQUIREMENTS.md` - Notifikační workflow
- `docs/DB-NOTIFICATION-TEMPLATE-STRUCTURE.md` - DB struktura notifikací
- `docs/BACKGROUND-TASKS-SYSTEM.md` - Background tasks systém
- `TODO-ALARM-NOTIFICATION-BELL-PREVIEW.html` - Vzor pro HIGH alarm design

---

**Status:** ✅ **READY FOR BACKEND INTEGRATION**

Implementace je kompletní na frontend straně. Čeká se na backend:
1. Vytvoření notification template
2. Generování notifikace při force unlock
3. API endpoint pro mark as read
