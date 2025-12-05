# 📤 Notifikace - Rozšíření o příjemce (to_user_id, to_users, to_all_users)

**Datum:** 15. října 2025, 23:10  
**Změna:** Implementace podpory pro různé typy příjemců notifikací

---

## 📋 Co bylo přidáno

### 1. Typy příjemců notifikací

#### **A) Konkrétní uživatel** (`to_user_id`)
```javascript
{
  "to_user_id": 5,  // ID uživatele
  "type": "order_approved",
  "title": "Objednávka schválena",
  "message": "Vaše objednávka byla schválena"
}
```

**Použití:** Když chceš poslat notifikaci jednomu konkrétnímu uživateli.

---

#### **B) Skupina uživatelů** (`to_users`)
```javascript
{
  "to_users": [3, 5, 8],  // Array ID uživatelů
  "type": "order_created",
  "title": "Nová objednávka k schválení",
  "message": "Objednávka čeká na schválení"
}
```

**Použití:** Když chceš poslat notifikaci více uživatelům najednou (např. GARANT + PŘÍKAZCE).

---

#### **C) Všichni uživatelé** (`to_all_users`)
```javascript
{
  "to_all_users": true,  // Broadcast
  "type": "system_maintenance",
  "title": "Plánovaná údržba",
  "message": "Systém bude nedostupný od 22:00"
}
```

**Použití:** Systémové oznámení pro všechny uživatele.

---

#### **D) Aktuální uživatel** (default)
```javascript
{
  // Žádný příjemce nestanovený
  "type": "order_approved",
  "title": "Objednávka schválena"
}
```

**Použití:** Backend použije `username` z tokenu a najde odpovídající `user_id`.

---

## ⚠️ Pravidla pro použití

### **1. Použij POUZE JEDEN parametr:**
- ❌ `to_user_id` + `to_users` současně
- ❌ `to_all_users` + `to_user_id` současně
- ✅ Pouze jeden z nich (nebo žádný = aktuální uživatel)

### **2. Priorita:**
```
to_all_users  →  to_users  →  to_user_id  →  current user (default)
```

Backend by měl kontrolovat v tomto pořadí a použít první nalezený.

---

## 🔧 Implementace v kódu

### 1. `src/services/notificationsApi.js` - Rozšířeno

#### **Hlavní funkce:**
```javascript
/**
 * Vytvoření notifikace s podporou různých příjemců
 */
export const createNotification = async (notificationData) => {
  // Podporuje:
  // - to_user_id: 5
  // - to_users: [3, 5, 8]
  // - to_all_users: true
  // - (žádný parametr) = current user
  
  // Debug log příjemce
  if (notificationData.to_user_id) {
    console.log('[NotificationsAPI] Recipient: Single user ID', notificationData.to_user_id);
  } else if (notificationData.to_users) {
    console.log('[NotificationsAPI] Recipients: Multiple users', notificationData.to_users);
  } else if (notificationData.to_all_users) {
    console.log('[NotificationsAPI] Recipients: ALL USERS');
  } else {
    console.log('[NotificationsAPI] Recipient: Current user (default)');
  }
  
  // ... pošle request
};
```

---

#### **Helper funkce - Připraveno pro běžné use-cases:**

**1. Notifikace pro konkrétního uživatele:**
```javascript
import { notifyUser } from '../services/notificationsApi';

await notifyUser(
  5,  // user_id
  'order_approved',
  'Objednávka schválena',
  'Vaše objednávka č. 2025-001 byla schválena',
  {
    priority: 'normal',
    send_email: true
  }
);
```

---

**2. Notifikace pro skupinu uživatelů:**
```javascript
import { notifyUsers } from '../services/notificationsApi';

await notifyUsers(
  [3, 5, 8],  // array user_ids
  'order_created',
  'Nová objednávka k schválení',
  'Objednávka č. 2025-002 čeká na schválení',
  {
    priority: 'high',
    send_email: true
  }
);
```

---

**3. Broadcast pro všechny:**
```javascript
import { notifyAll } from '../services/notificationsApi';

await notifyAll(
  'system_maintenance',
  'Plánovaná údržba',
  'Systém bude nedostupný od 22:00 do 02:00',
  {
    priority: 'urgent',
    send_email: false
  }
);
```

---

**4. Notifikace pro schvalovatele objednávky (GARANT + PŘÍKAZCE):**
```javascript
import { notifyOrderApprovers } from '../services/notificationsApi';

await notifyOrderApprovers({
  id: 123,
  number: '2025-001',
  garant_id: 3,
  prikazce_id: 5
});
```

**Co to udělá:**
- Pošle notifikaci typu `order_created`
- Příjemci: `to_users: [3, 5]` (garant + příkazce)
- Priorita: `high`
- Email: `true`
- Kategorie: `orders`

---

**5. Notifikace o schválení (pro tvůrce objednávky):**
```javascript
import { notifyOrderApproved } from '../services/notificationsApi';

await notifyOrderApproved(
  {
    id: 123,
    number: '2025-001',
    creator_id: 8
  },
  'Jan Novák'  // jméno schvalovatele
);
```

**Co to udělá:**
- Pošle notifikaci typu `order_approved`
- Příjemce: `to_user_id: 8` (tvůrce objednávky)
- Email: `true`
- Data obsahují jméno schvalovatele

---

**6. Notifikace o zamítnutí:**
```javascript
import { notifyOrderRejected } from '../services/notificationsApi';

await notifyOrderRejected(
  {
    id: 123,
    number: '2025-001',
    creator_id: 8
  },
  'Chybné číslo účtu'  // důvod zamítnutí
);
```

---

### 2. `src/pages/NotificationTestPanel.js` - Přidán výběr příjemce

#### **UI pro výběr:**
- 🔘 **Aktuální uživatel** (default)
- 🔘 **Konkrétní uživatel** + input pro user_id
- 🔘 **Skupina uživatelů** + input pro IDs (3,5,8)
- 🔘 **Všichni uživatelé** (broadcast)

#### **Nové state:**
```javascript
const [recipientMode, setRecipientMode] = useState('current');
const [recipientUserId, setRecipientUserId] = useState('5');
const [recipientUserIds, setRecipientUserIds] = useState('3,5,8');
```

#### **Payload se dynamicky upraví:**
```javascript
if (recipientMode === 'user') {
  notification.to_user_id = parseInt(recipientUserId);
} else if (recipientMode === 'users') {
  notification.to_users = recipientUserIds.split(',').map(id => parseInt(id.trim()));
} else if (recipientMode === 'all') {
  notification.to_all_users = true;
}
```

---

## 🎯 Použití v reálné aplikaci

### **Příklad: Schválení objednávky**

```javascript
// OrderForm25.js - Po kliknutí na "Odeslat ke schválení"
import { notifyOrderApprovers } from '../services/notificationsApi';

const handleSubmitForApproval = async (orderData) => {
  // 1. Ulož objednávku do DB
  const savedOrder = await api25orders.insertOrder(orderData);
  
  // 2. Pošli notifikaci schvalovátelům
  await notifyOrderApprovers({
    id: savedOrder.id,
    number: savedOrder.cislo_objednavky,
    garant_id: savedOrder.garant_id,
    prikazce_id: savedOrder.prikazce_id
  });
  
  // 3. Zobraz potvrzení
  toast.success('Objednávka byla odeslána ke schválení');
};
```

---

### **Příklad: Schválení objednávky**

```javascript
// ApprovalButtons.js - Po kliknutí na "Schválit"
import { notifyOrderApproved } from '../services/notificationsApi';

const handleApprove = async (order, approverName) => {
  // 1. Aktualizuj objednávku v DB
  await api25orders.updateOrder(order.id, { status: 'approved' });
  
  // 2. Pošli notifikaci tvůrci
  await notifyOrderApproved(
    {
      id: order.id,
      number: order.cislo_objednavky,
      creator_id: order.created_by_user_id
    },
    approverName
  );
  
  // 3. Zobraz potvrzení
  toast.success('Objednávka byla schválena');
};
```

---

### **Příklad: Zamítnutí objednávky**

```javascript
// ApprovalButtons.js - Po kliknutí na "Zamítnout"
import { notifyOrderRejected } from '../services/notificationsApi';

const handleReject = async (order, reason) => {
  // 1. Aktualizuj objednávku v DB
  await api25orders.updateOrder(order.id, { 
    status: 'rejected',
    rejection_reason: reason 
  });
  
  // 2. Pošli notifikaci tvůrci
  await notifyOrderRejected(
    {
      id: order.id,
      number: order.cislo_objednavky,
      creator_id: order.created_by_user_id
    },
    reason
  );
  
  // 3. Zobraz potvrzení
  toast.error('Objednávka byla zamítnuta');
};
```

---

## 📊 Testování

### **1. Otevři testovací panel:**
```
http://localhost:3000/test-notifications
```

### **2. Vyber příjemce:**
- **Aktuální uživatel:** Notifikace pouze pro tebe
- **Konkrétní uživatel:** Zadej ID (např. 5)
- **Skupina:** Zadej IDs oddělené čárkou (např. 3,5,8)
- **Všichni:** Broadcast pro všechny uživatele

### **3. Klikni na typ notifikace**

### **4. Sleduj log:**
```
[23:10:15] Creating notification: order_created
[23:10:15] 📤 Recipient: Multiple users: [3,5,8]
[23:10:15] 📦 Payload: {"type":"order_created","recipient":"users: [3,5,8]"}
[23:10:15] Sending POST request to...
[23:10:16] ✅ SUCCESS: Notification created! ID: 125
```

### **5. Počkej max. 60 sekund**

### **6. Zkontroluj badge na zvonečku**

---

## 🔍 Backend kontrola

### **SQL - Zkontroluj komu se notifikace vytvořila:**

```sql
-- Pro konkrétního uživatele (to_user_id)
SELECT * FROM 25_notifications 
WHERE notification_id = 125;
-- Mělo by být: user_id = 5

-- Pro skupinu uživatelů (to_users)
SELECT * FROM 25_notifications 
WHERE notification_id IN (125, 126, 127);
-- Mělo by být 3 řádky: user_id = 3, 5, 8

-- Pro všechny uživatele (to_all_users)
SELECT COUNT(*) FROM 25_notifications 
WHERE type = 'system_maintenance' 
AND created_at > NOW() - INTERVAL 5 MINUTE;
-- Mělo by být: počet = počet aktivních uživatelů
```

---

## ✅ Export functions

```javascript
// src/services/notificationsApi.js
export default {
  // Základní funkce
  getNotificationsList,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  createNotification,
  
  // Helper funkce (NOVÉ)
  notifyUser,          // Pro konkrétního uživatele
  notifyUsers,         // Pro skupinu
  notifyAll,           // Pro všechny
  notifyOrderApprovers,// Pro GARANT + PŘÍKAZCE
  notifyOrderApproved, // Pro tvůrce (schváleno)
  notifyOrderRejected, // Pro tvůrce (zamítnuto)
  
  // Konstanty
  NOTIFICATION_TYPES,
  NOTIFICATION_CONFIG,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CATEGORY
};
```

---

## 📝 Soubory změněny

1. ✅ `src/services/notificationsApi.js` - Rozšířeno + helper funkce
2. ✅ `src/pages/NotificationTestPanel.js` - UI pro výběr příjemce
3. ✅ `docs/fixes/NOTIFICATION-RECIPIENTS.md` - Tato dokumentace

---

## 🎯 Další kroky

1. **Implementovat v OrderForm25:**
   - Import `notifyOrderApprovers`
   - Volat po odeslání objednávky

2. **Implementovat approval buttons:**
   - Import `notifyOrderApproved` a `notifyOrderRejected`
   - Volat po schválení/zamítnutí

3. **Testovat flow:**
   - Vytvoř objednávku → notifikace pro GARANT + PŘÍKAZCE
   - Schval objednávku → notifikace pro tvůrce
   - Zamítni objednávku → notifikace pro tvůrce

---

**🎯 Status:**
- [x] API rozšířeno o podporu příjemců
- [x] Helper funkce vytvořeny
- [x] Testovací panel má UI pro výběr
- [x] Dokumentace vytvořena
- [ ] **TODO:** Implementovat v reálných formulářích

