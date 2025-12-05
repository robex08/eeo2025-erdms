# 🔍 Notifikační Systém - Analýza Před Migrací

**Datum:** 29. října 2025  
**Status:** ⚠️ **PŘED MIGRACÍ** - Analýza současného stavu

---

## 📊 Současný Stav (STARÝ systém)

### 1️⃣ **STARÝ Backend API** (`src/services/notificationsApi.js` - 1272 řádků)

#### Exportované funkce:

##### A) **CRUD Operace** (funkční, zachovat)
```javascript
✅ getNotificationsList(options)         // Seznam notifikací s filtry
✅ getUnreadCount()                      // Počet nepřečtených
✅ markNotificationAsRead(id)            // Označit jako přečtené
✅ markAllNotificationsAsRead()          // Označit vše
✅ dismissNotification(id)               // Skrýt notifikaci
✅ dismissAllNotifications()             // Skrýt vše
✅ restoreNotification(id)               // Obnovit skrytou
✅ deleteNotification(id)                // Smazat notifikaci
✅ deleteAllNotifications()              // Smazat vše
```

##### B) **LocalStorage operace** (pro dropdown)
```javascript
✅ hideNotificationInDropdown(id, userId)
✅ hideAllNotificationsInDropdown(ids, userId)
✅ getHiddenNotificationsInDropdown(userId)
✅ clearHiddenNotificationsInDropdown(userId)
```

##### C) **Vytváření notifikací** (nahradit NOVÝM API)
```javascript
⚠️ createNotification(data)              // STARÝ způsob - ruční placeholdery
⚠️ notifyUser(userId, type, title, msg)
⚠️ notifyUsers(userIds, type, title, msg)
⚠️ notifyAll(type, title, msg)
```

##### D) **Helper funkce pro objednávky** (nahradit)
```javascript
⚠️ notifyOrderSubmittedForApproval(order)
⚠️ notifyOrderApproved(order, approverName)
⚠️ notifyOrderRejected(order, reason)
⚠️ notifyOrderWaiting(order, reason)
⚠️ notifyOrderSentToSupplier(order, supplierName)
⚠️ notifyOrderConfirmedBySupplier(order, supplierName)
⚠️ notifyOrderInProgress(order)
⚠️ notifyOrderCompleted(order)
⚠️ notifyOrderCancelled(order, reason)
⚠️ notifyOrderAwaitingConfirmation(order, supplierName)
⚠️ notifyOrderDeleted(order)
⚠️ notifyOrderApprovers(order)
```

##### E) **TODO Alarmy** (nahradit)
```javascript
⚠️ notifyTodoAlarmNormal(userId, todoData)
⚠️ notifyTodoAlarmHigh(userId, todoData)
⚠️ notifyTodoAlarmExpired(userId, todoData)
⚠️ notifyTodoAlarm(userId, todoData, isExpired, isHighPriority)
```

##### F) **Konstanty** (nahradit)
```javascript
⚠️ NOTIFICATION_TYPES              // 12 základních typů → 30 nových typů
✅ NOTIFICATION_CONFIG              // Ikony, barvy (zachovat logiku)
✅ NOTIFICATION_PRIORITY            // Priority (zachovat)
✅ NOTIFICATION_CATEGORY            // Kategorie (zachovat)
```

---

### 2️⃣ **Frontend UI Komponenty** (FUNKČNÍ - zachovat všechny!)

#### A) **NotificationBell.js** (884 řádků) - Ikonka zvonečku v headeru
```javascript
📍 Používá:
  ✅ getNotificationsList()
  ✅ getUnreadCount()
  ✅ markNotificationAsRead()
  ✅ markAllNotificationsAsRead()
  ✅ dismissNotification()
  ✅ NOTIFICATION_CONFIG
  ✅ NOTIFICATION_PRIORITY

📦 Funkce:
  - Zobrazuje počet nepřečtených notifikací (badge)
  - Dropdown s posledními 10 notifikacemi
  - Kliknutím na notifikaci: přechod na detail objednávky
  - "Označit jako přečtené" (jedna i všechny)
  - "Skrýt" notifikaci z dropdownu
  - Auto-refresh každých 30 sekund
  - Animace při nových notifikacích

✅ STATUS: FUNGUJE - pouze refreshnout import konstanty
```

#### B) **NotificationDropdown.js** (704 řádků) - Samostatný dropdown komponent
```javascript
📍 Používá:
  ✅ getNotificationsList()
  ✅ markNotificationAsRead()
  ✅ markAllNotificationsAsRead()
  ✅ dismissNotification()
  ✅ hideNotificationInDropdown()
  ✅ NOTIFICATION_CONFIG

📦 Funkce:
  - Podobný jako NotificationBell, ale samostatný
  - Může být použit i jinde než v headeru
  - Stabilní animace a pozicování
  - Responsive design

✅ STATUS: FUNGUJE - pouze refreshnout import konstanty
```

#### C) **NotificationsPage.js** (2228 řádků) - KOMPLETNÍ správa notifikací
```javascript
📍 Používá:
  ✅ getNotificationsList()
  ✅ markNotificationAsRead()
  ✅ markAllNotificationsAsRead()
  ✅ dismissNotification()
  ✅ restoreNotification()
  ✅ deleteNotification()
  ✅ deleteAllNotifications()
  ✅ NOTIFICATION_CONFIG

📦 Funkce:
  - 📋 Kompletní seznam všech notifikací
  - 🔍 Vyhledávání a filtrování
  - 📊 Třídění (datum, priorita, kategorie)
  - 📑 Vlákna (grouping podle order_id)
  - ✅ Hromadné operace (označit, skrýt, smazat)
  - 🎨 Barevné kategorie a ikony
  - 📱 Responsive design
  - ♻️ Auto-refresh každých 30 sekund

✅ STATUS: FUNGUJE - pouze refreshnout import konstanty
```

#### D) **NotificationTestPanel.js** - Testovací panel (DEV)
```javascript
📍 Používá:
  ⚠️ createNotification() - STARÝ způsob

📦 Funkce:
  - Testování vytváření notifikací
  - Pouze pro DEV

⚠️ STATUS: ZASTARALÝ - nahradit NotificationTester.jsx
```

#### E) **NotificationTester.jsx** (230 řádků) - NOVÝ testovací komponent
```javascript
📍 Používá:
  🆕 notificationService.preview()
  🆕 notificationService.create()
  🆕 NOTIFICATION_TYPES (nový)

📦 Funkce:
  - Preview notifikace před odesláním
  - Testování NOVÉHO backend API
  - Zobrazuje placeholdery

✅ STATUS: NOVÝ - připraven k použití
```

---

### 3️⃣ **Kde se STARÝ systém používá**

#### A) **OrderForm25.js** (řádek 58)
```javascript
import { createNotification, NOTIFICATION_TYPES } from '../services/notificationsApi';

// Používá se na ~7 místech:
- Řádek 6003: notificationType = NOTIFICATION_TYPES.ORDER_STATUS_KE_SCHVALENI
- Řádek 6026: notificationType = NOTIFICATION_TYPES.ORDER_STATUS_SCHVALENA
- Řádek 6044: notificationType = NOTIFICATION_TYPES.ORDER_STATUS_ZAMITNUTA
- Řádek 6061: notificationType = NOTIFICATION_TYPES.ORDER_STATUS_CEKA_SE
- Řádek 6080: notificationType = NOTIFICATION_TYPES.ORDER_STATUS_ODESLANA
- Řádek 6097: notificationType = NOTIFICATION_TYPES.ORDER_STATUS_ZRUSENA
- Řádek 6116: notificationType = NOTIFICATION_TYPES.ORDER_STATUS_POTVRZENA
```

#### B) **useTodoAlarms.js** (hook pro TODO alarmy)
```javascript
import { notifyTodoAlarm } from '../services/notificationsApi';
```

#### C) **backgroundTasks.js** (background polling)
```javascript
import { getUnreadCount, getNotificationsList } from './notificationsApi';
```

---

## 🆕 NOVÝ Systém (commit 3a28a99 backend, a24abd7 frontend)

### Backend API (/api.eeo/notifications/*)

#### Nové endpointy:
```javascript
✅ POST /notifications/create      // Vytvoření s auto placeholdery
✅ POST /notifications/preview     // Náhled před odesláním
✅ POST /notifications/templates   // Seznam všech templates
✅ POST /notifications/send-bulk   // Hromadné odeslání
```

#### Nové vlastnosti:
```javascript
✅ 30 notification templates v DB (tabulka 25_notification_templates)
✅ Automatické naplnění 50+ placeholderů z order_id
✅ Email notifikace (PHPMailer)
✅ NOVÉ FÁZE:
   - Registr smluv (2 typy)
   - Fakturace (4 typy)
   - Věcná správnost (3 typy)
✅ TODO alarmy (5 typů)
✅ Systémové notifikace (10 typů)
```

### Frontend Service (`src/services/notificationService.js`)

#### Exportované funkce:
```javascript
🆕 notificationService.create()                      // Hlavní metoda
🆕 notificationService.preview()                     // Náhled
🆕 notificationService.getTemplates()                // Admin
🆕 notificationService.sendBulk()                    // Hromadné

// 11 helper funkcí:
🆕 notifyOrderApproved()
🆕 notifyOrderRejected()
🆕 notifyPendingApproval()
🆕 notifyWaitingForChanges()
🆕 notifySentToSupplier()
🆕 notifyConfirmedBySupplier()
🆕 notifyRegistryPublished()                         // NOVÉ
🆕 notifyInvoiceAdded()                              // NOVÉ
🆕 notifyInvoiceApproved()                           // NOVÉ
🆕 notifyInvoicePaid()                               // NOVÉ
🆕 notifyVecnaSpravnostConfirmed()                   // NOVÉ
```

### Frontend Constants (`src/constants/notificationTypes.js`)

```javascript
🆕 NOTIFICATION_TYPES                  // 30+ typů (vs. 12 starých)
🆕 getNotificationTypeName()           // České názvy
🆕 getNotificationIcon()               // Emoji ikony
🆕 getNotificationPriority()           // Priority
🆕 getPriorityIcon()                   // Priority emoji
```

---

## 📋 Migrační Strategie

### ✅ FÁZE 1: PŘÍPRAVA (5 minut)

#### 1.1. Backup současného stavu
```bash
git add .
git commit -m "💾 Backup před migrací notifikačního systému"
git push
```

#### 1.2. Test NOVÉHO systému
```javascript
// V App.js dočasně přidat:
import NotificationTester from './components/NotificationTester';

<NotificationTester token={token} username={username} userId={user.id} />
```

---

### ✅ FÁZE 2: MERGE STARÉHO A NOVÉHO API (30 minut)

#### 2.1. Vytvořit UNIFIED API soubor

**Cíl:** Sloučit `notificationsApi.js` (STARÝ) a `notificationService.js` (NOVÝ)

```javascript
// src/services/notificationsUnified.js

import axios from 'axios';
import { loadAuthData } from '../utils/authStorage';

// =============================================================================
// A) ZACHOVAT ze STARÉHO API - CRUD operace (FUNKČNÍ!)
// =============================================================================

export const getNotificationsList = async (options = {}) => {
  // ✅ STARÝ kód - FUNGUJE - ZACHOVAT!
};

export const getUnreadCount = async () => {
  // ✅ STARÝ kód - FUNGUJE - ZACHOVAT!
};

export const markNotificationAsRead = async (notificationId) => {
  // ✅ STARÝ kód - FUNGUJE - ZACHOVAT!
};

export const markAllNotificationsAsRead = async () => {
  // ✅ STARÝ kód - FUNGUJE - ZACHOVAT!
};

export const dismissNotification = async (notificationId) => {
  // ✅ STARÝ kód - FUNGUJE - ZACHOVAT!
};

// ... další CRUD funkce ...

export const hideNotificationInDropdown = (notificationId, userId) => {
  // ✅ LocalStorage operace - ZACHOVAT!
};

// =============================================================================
// B) NAHRADIT NOVÝM API - Vytváření notifikací
// =============================================================================

// ❌ ODSTRANIT STARÉ:
// export const createNotification = async (data) => { ... }

// ✅ PŘIDAT NOVÉ:
class NotificationService {
  async create({ token, username, type, order_id, ... }) {
    // 🆕 NOVÝ backend API
  }
  
  async preview({ token, username, type, order_id, ... }) {
    // 🆕 NOVÝ backend API
  }
  
  // ... 11 helper funkcí ...
}

const notificationService = new NotificationService();
export { notificationService };

// =============================================================================
// C) KONSTANTY - Merge STARÉHO a NOVÉHO
// =============================================================================

// Import z NOVÉHO souboru:
export { 
  NOTIFICATION_TYPES,
  getNotificationTypeName,
  getNotificationIcon,
  getNotificationPriority,
  getPriorityIcon
} from '../constants/notificationTypes';

// ZACHOVAT ze STARÉHO:
export const NOTIFICATION_CONFIG = {
  // ✅ Ikony, barvy pro UI komponenty
};

export const NOTIFICATION_PRIORITY = {
  // ✅ Priority (urgent, high, normal, low)
};

export const NOTIFICATION_CATEGORY = {
  // ✅ Kategorie pro filtrování
};
```

#### 2.2. Aktualizovat importy v UI komponentech

**NotificationBell.js:**
```javascript
// PŘED:
import { 
  getNotificationsList, 
  getUnreadCount,
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  dismissNotification,
  NOTIFICATION_CONFIG,
  NOTIFICATION_PRIORITY 
} from '../services/notificationsApi';

// PO:
import { 
  getNotificationsList, 
  getUnreadCount,
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  dismissNotification,
  NOTIFICATION_CONFIG,
  NOTIFICATION_PRIORITY 
} from '../services/notificationsUnified'; // ✅ Pouze změna cesty!
```

**NotificationDropdown.js:**
```javascript
// Stejná změna - pouze cesta importu
```

**NotificationsPage.js:**
```javascript
// Stejná změna - pouze cesta importu
```

---

### ✅ FÁZE 3: MIGRACE OrderForm25.js (30 minut)

#### 3.1. Změnit import
```javascript
// OrderForm25.js řádek 58

// PŘED:
import { createNotification, NOTIFICATION_TYPES } from '../services/notificationsApi';

// PO:
import { notificationService, NOTIFICATION_TYPES } from '../services/notificationsUnified';
```

#### 3.2. Migrace volání notifikací (příklad)

**Schválení objednávky:**
```javascript
// PŘED (řádek ~6026):
if (notificationType) {
  await createNotification({
    token,
    username,
    type: NOTIFICATION_TYPES.ORDER_STATUS_SCHVALENA,
    user_id: formData.objednatel_id,
    order_id: savedOrderId,
    message: `Objednávka č. ${formData.order_number} byla schválena`
  });
}

// PO:
await notificationService.notifyOrderApproved({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id, // Kdo schválil
  creator_id: formData.objednatel_id // Komu poslat
});
// ✅ Backend automaticky naplní všechny placeholdery!
```

**Zamítnutí objednávky:**
```javascript
// PŘED (řádek ~6044):
await createNotification({
  token,
  username,
  type: NOTIFICATION_TYPES.ORDER_STATUS_ZAMITNUTA,
  user_id: formData.objednatel_id,
  order_id: savedOrderId,
  message: `Objednávka č. ${formData.order_number} byla zamítnuta. Důvod: ${rejectionReason}`
});

// PO:
await notificationService.notifyOrderRejected({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id,
  creator_id: formData.objednatel_id,
  rejection_reason: rejectionReason // ✅ Placeholder
});
```

**Ke schválení:**
```javascript
// PŘED (řádek ~6003):
await createNotification({
  token,
  username,
  type: NOTIFICATION_TYPES.ORDER_STATUS_KE_SCHVALENI,
  user_id: formData.garant_uzivatel_id,
  order_id: savedOrderId,
  message: `Objednávka č. ${formData.order_number} čeká na vaše schválení`
});

// PO:
await notificationService.notifyPendingApproval({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id,
  garant_id: formData.garant_uzivatel_id // ✅ Komu poslat
});
```

---

### ✅ FÁZE 4: MIGRACE TODO alarmů (15 minut)

**useTodoAlarms.js:**
```javascript
// PŘED:
import { notifyTodoAlarm } from '../services/notificationsApi';

// PO:
import { notificationService, NOTIFICATION_TYPES } from '../services/notificationsUnified';

// Změna volání:
// PŘED:
await notifyTodoAlarm(userId, todoData, isExpired, isHighPriority);

// PO:
const type = isExpired 
  ? NOTIFICATION_TYPES.TODO_ALARM_EXPIRED
  : isHighPriority 
    ? NOTIFICATION_TYPES.TODO_ALARM_HIGH
    : NOTIFICATION_TYPES.TODO_ALARM_NORMAL;

await notificationService.create({
  token,
  username,
  type,
  order_id: todoData.order_id,
  action_user_id: userId,
  to_user_id: userId,
  todo_title: todoData.title,
  todo_deadline: todoData.deadline
});
```

---

### ✅ FÁZE 5: PŘIDÁNÍ NOVÝCH FÁZÍ (30 minut)

#### 5.1. Registr smluv
```javascript
// OrderForm25.js - při zveřejnění v registru
await notificationService.notifyRegistryPublished({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id,
  recipients: [formData.objednatel_id, formData.garant_uzivatel_id]
});
```

#### 5.2. Fakturace
```javascript
// Při přidání faktury
await notificationService.notifyInvoiceAdded({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id,
  recipients: [formData.garant_uzivatel_id, formData.prikazce_id]
});

// Při schválení faktury
await notificationService.notifyInvoiceApproved({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id,
  creator_id: formData.objednatel_id
});

// Při uhrazení faktury
await notificationService.notifyInvoicePaid({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id,
  creator_id: formData.objednatel_id
});
```

#### 5.3. Věcná správnost
```javascript
// Při potvrzení věcné správnosti
const recipients = [formData.garant_uzivatel_id, formData.prikazce_id].filter(Boolean);

await notificationService.notifyVecnaSpravnostConfirmed({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id,
  recipients
});

// Při zamítnutí (reklamace)
await notificationService.notifyVecnaSpravnostRejected({
  token,
  username,
  order_id: savedOrderId,
  action_user_id: user_id,
  recipients: [formData.objednatel_id, formData.garant_uzivatel_id]
});
```

---

### ✅ FÁZE 6: CLEANUP (15 minut)

#### 6.1. Odstranit staré soubory
```bash
# Přejmenovat jako backup:
mv src/services/notificationsApi.js src/services/notificationsApi.OLD.js
mv src/services/notificationService.js src/services/notificationService.OLD.js

# Unified soubor přejmenovat:
mv src/services/notificationsUnified.js src/services/notificationsApi.js
```

#### 6.2. Odstranit NotificationTestPanel.js
```bash
rm src/pages/NotificationTestPanel.js
```

#### 6.3. Odstranit NotificationTester.jsx z App.js (pokud byl přidán)
```javascript
// App.js - odstranit testovací komponent
```

---

## 🧪 Testovací Checklist

### Před spuštěním:
- [ ] Backup současného stavu (git commit)
- [ ] Backend běží (`http://localhost:5000`)
- [ ] 30 templates v DB (`SELECT * FROM 25_notification_templates`)

### Po migraci testovat:
- [ ] **NotificationBell** - zobrazuje notifikace
- [ ] **NotificationsPage** - kompletní správa notifikací
- [ ] **OrderForm25** - vytváří notifikace při změně stavu:
  - [ ] Ke schválení
  - [ ] Schválena
  - [ ] Zamítnuta
  - [ ] Vrácena k přepracování
  - [ ] Odeslána dodavateli
  - [ ] Potvrzena dodavatelem
- [ ] **TODO alarmy** - fungují
- [ ] **Vlákna** - grouping podle order_id
- [ ] **Email** - odesílá se (pokud nakonfigurován)
- [ ] **Placeholdery** - automaticky naplněné

### SQL kontrola:
```sql
-- Ověř vytvoření notifikací
SELECT n.id, u.username, n.message, n.type, n.created_at
FROM 25_notifications n
LEFT JOIN 25_users u ON n.user_id = u.id
WHERE n.order_id = 123
ORDER BY n.created_at DESC;

-- Ověř použité templates
SELECT type, COUNT(*) as pocet
FROM 25_notifications
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
GROUP BY type
ORDER BY pocet DESC;
```

---

## 📊 Srovnání PŘED vs. PO

| Aspekt | PŘED (STARÝ) | PO (NOVÝ) |
|--------|--------------|-----------|
| **Notification types** | 12 základních | 30 templates |
| **Placeholdery** | Ruční (3-5 polí) | Automatické (50+ polí) |
| **Email** | ❌ Ne | ✅ Ano (PHPMailer) |
| **Preview** | ❌ Ne | ✅ Ano |
| **Bulk send** | ❌ Ne | ✅ Ano |
| **NOVÉ FÁZE** | ❌ Ne | ✅ Ano (registr, fakturace, věcná správnost) |
| **Helper funkce** | 12 funkcí | 11 funkcí (lepší API) |
| **UI komponenty** | ✅ Fungují | ✅ Fungují (stejné!) |
| **CRUD operace** | ✅ Fungují | ✅ Fungují (stejné!) |

---

## ⚠️ Rizika a Řešení

### Riziko 1: UI přestane fungovat
**Řešení:** Zachovat všechny CRUD funkce ze starého API beze změny.

### Riziko 2: Ztráta notifikací během migrace
**Řešení:** Migrace pouze mění KÓD, ne DATA v DB.

### Riziko 3: Konflikty importů
**Řešení:** Postupná migrace - nejprve merge API, pak UI, pak OrderForm25.

### Riziko 4: Backend není ready
**Řešení:** Backend JE ready (commit 3a28a99), otestovat před migrací.

---

## 🎯 Timeline

| Fáze | Čas | Popis |
|------|-----|-------|
| FÁZE 1 | 5 min | Backup + testování NotificationTester |
| FÁZE 2 | 30 min | Merge API + refresh UI importů |
| FÁZE 3 | 30 min | Migrace OrderForm25.js (7 volání) |
| FÁZE 4 | 15 min | Migrace TODO alarmů |
| FÁZE 5 | 30 min | Přidání NOVÝCH FÁZÍ (9 nových notifikací) |
| FÁZE 6 | 15 min | Cleanup + testování |
| **CELKEM** | **~2 hodiny** | **Kompletní migrace** |

---

## 📚 Dokumentace

Po migraci aktualizovat:
- [ ] README.md - nový systém je produkční
- [ ] NOTIFICATION-QUICKSTART.md - aktualizovat příklady
- [ ] FRONTEND-NOTIFICATION-INTEGRATION.md - aktualizovat API
- [ ] Tento soubor - označit jako COMPLETED

---

## 🚀 Next Steps

1. **BACKUP** - commit současného stavu
2. **TESTOVÁNÍ** - NotificationTester v App.js (5 min)
3. **MERGE API** - vytvořit notificationsUnified.js (30 min)
4. **REFRESH UI** - změnit importy v komponentech (10 min)
5. **MIGRACE OrderForm25** - změnit 7 volání (30 min)
6. **NOVÉ FÁZE** - přidat 9 nových notifikací (30 min)
7. **TESTOVÁNÍ** - kompletní workflow (20 min)
8. **CLEANUP** - odstranit staré soubory (10 min)

---

**Status:** 📋 **ANALÝZA KOMPLETNÍ - PŘIPRAVENO K MIGRACI**  
**Odhadovaný čas:** 2 hodiny  
**Riziko:** ⚠️ **NÍZKÉ** (zachováváme UI, jen měníme backend API)
