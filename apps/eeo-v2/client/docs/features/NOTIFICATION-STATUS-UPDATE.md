# 🔔 Aktualizace notifikačního systému na 18 typů

## 📋 Přehled změn

Notifikační systém byl rozšířen z původních **6 typů** na celkem **18 typů** notifikací podle DB tabulky `25_notification_templates`.

### Nové typy notifikací

**12 STAVŮ OBJEDNÁVEK:**
1. `order_status_nova` - Nová objednávka vytvořena
2. `order_status_ke_schvaleni` - Objednávka ke schválení
3. `order_status_schvalena` - Objednávka schválena
4. `order_status_zamitnuta` - Objednávka zamítnuta
5. `order_status_ceka_se` - Objednávka čeká (pozastavena)
6. `order_status_odeslana` - Objednávka odeslána dodavateli
7. `order_status_potvrzena` - Objednávka potvrzena dodavatelem
8. `order_status_dokoncena` - Objednávka dokončena
9. `order_status_zrusena` - Objednávka zrušena
10. `order_status_ceka_potvrzeni` - Čeká na potvrzení dodavatele
11. `order_status_smazana` - Objednávka smazána
12. `order_status_rozpracovana` - Objednávka rozpracována

**6 OBECNÝCH TYPŮ** (deprecated, ale ponecháno):
- `order_approved` - [DEPRECATED]
- `order_rejected` - [DEPRECATED]
- `order_created` - [DEPRECATED]
- `system_maintenance`
- `user_mention`
- `deadline_reminder`

---

## 🎨 Ikony a barvy

Každý typ má přiřazenou ikonu a barvu:

```javascript
📝 order_status_nova → #64748b (grey)
📋 order_status_ke_schvaleni → #3b82f6 (blue)
✅ order_status_schvalena → #16a34a (green)
❌ order_status_zamitnuta → #dc2626 (red)
⏸️ order_status_ceka_se → #f59e0b (orange)
📤 order_status_odeslana → #3b82f6 (blue)
✔️ order_status_potvrzena → #16a34a (green)
🎉 order_status_dokoncena → #16a34a (green)
🚫 order_status_zrusena → #dc2626 (red)
⏳ order_status_ceka_potvrzeni → #f59e0b (orange)
🗑️ order_status_smazana → #991b1b (dark red)
🔄 order_status_rozpracovana → #6366f1 (indigo)
```

---

## 🔧 Implementované změny

### 1. `src/services/notificationsApi.js`

**Konstanty aktualizovány:**
```javascript
export const NOTIFICATION_TYPES = {
  // 12 nových ORDER_STATUS_*
  ORDER_STATUS_NOVA: 'order_status_nova',
  ORDER_STATUS_KE_SCHVALENI: 'order_status_ke_schvaleni',
  // ... +10 dalších
  
  // Deprecated (kompatibilita)
  ORDER_APPROVED: 'order_approved',
  // ... +5 starých
};

export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.ORDER_STATUS_NOVA]: {
    icon: '📝',
    color: '#64748b',
    category: 'orders',
    label: 'Objednávka vytvořena',
    priority: 'low'
  },
  // ... +17 dalších konfigurací
};
```

**Helper funkce přepracovány:**

Nová centrální funkce:
```javascript
const notifyOrderStatusChange = async (order, status, extraData = {})
```

**11 nových helper funkcí:**
- `notifyOrderSubmittedForApproval(order)` - Ke schválení → GARANT + PŘÍKAZCE
- `notifyOrderApproved(order, approverName)` - Schválena → VLASTNÍK
- `notifyOrderRejected(order, rejectionReason)` - Zamítnuta → VLASTNÍK
- `notifyOrderWaiting(order, reason)` - Čeká → VLASTNÍK
- `notifyOrderSentToSupplier(order, supplierName)` - Odeslána → GARANT + PŘÍKAZCE
- `notifyOrderConfirmedBySupplier(order, supplierName)` - Potvrzena → GARANT + PŘÍKAZCE
- `notifyOrderInProgress(order)` - Rozpracována → GARANT + PŘÍKAZCE
- `notifyOrderCompleted(order)` - Dokončena → VŠICHNI
- `notifyOrderCancelled(order, cancellationReason)` - Zrušena → VLASTNÍK
- `notifyOrderAwaitingConfirmation(order, supplierName)` - Čeká na potvrzení → GARANT + PŘÍKAZCE
- `notifyOrderDeleted(order)` - Smazána → VLASTNÍK

**Deprecated funkce:**
```javascript
export const notifyOrderApprovers = async (order) => {
  console.warn('[NotificationsAPI] notifyOrderApprovers is deprecated, use notifyOrderSubmittedForApproval');
  return notifyOrderSubmittedForApproval(order);
};
```

---

### 2. `src/pages/NotificationTestPanel.js`

**Test data aktualizována:**
- Všech 18 typů notifikací s testovacími daty
- Rozděleno do 2 sekcí: "STAVY OBJEDNÁVEK" a "OBECNÉ NOTIFIKACE"

**UI aktualizováno:**
- 12 nových tlačítek pro stavy objednávek
- 6 tlačítek pro obecné notifikace (označené [OLD])
- Funkce `createAllNotifications()` vytvoří všech 18 typů

---

## 👥 Příjemci notifikací

### Automatické rozesílání podle typu:

**GARANT + PŘÍKAZCE** (to_users):
- `order_status_ke_schvaleni` - Objednávka k schválení
- `order_status_odeslana` - Odeslána dodavateli
- `order_status_potvrzena` - Potvrzena dodavatelem
- `order_status_rozpracovana` - Rozpracována
- `order_status_ceka_potvrzeni` - Čeká na potvrzení

**VLASTNÍK** (to_user_id = creator_id):
- `order_status_schvalena` - Schválena
- `order_status_zamitnuta` - Zamítnuta
- `order_status_ceka_se` - Čeká
- `order_status_zrusena` - Zrušena
- `order_status_smazana` - Smazána

**VŠICHNI** (VLASTNÍK + GARANT + PŘÍKAZCE):
- `order_status_dokoncena` - Dokončena

---

## 🚀 Použití v aplikaci

### 1. Import

```javascript
import {
  notifyOrderSubmittedForApproval,
  notifyOrderApproved,
  notifyOrderRejected,
  // ... další funkce
} from '../services/notificationsApi';
```

### 2. Volání při změně stavu

```javascript
// Při odeslání objednávky ke schválení
await notifyOrderSubmittedForApproval({
  id: 123,
  cislo_objednavky: '2025-001',
  predmet: 'Testovací objednávka',
  garant_id: 5,
  prikazce_id: 8
});

// Při schválení objednávky
await notifyOrderApproved({
  id: 123,
  cislo_objednavky: '2025-001',
  creator_id: 3
}, 'Jan Novák');

// Při zamítnutí objednávky
await notifyOrderRejected({
  id: 123,
  cislo_objednavky: '2025-001',
  creator_id: 3
}, 'Nedostatečné zdůvodnění');
```

---

## 📝 TODO: Implementace v OrderForm25

**Místa, kde je potřeba přidat volání:**

### 1. Při prvním uložení objednávky (status = "nova")

**Soubor:** `src/components/orders/OrderForm25.js` (nebo podobný)

```javascript
const handleSave = async () => {
  // ... uložení do DB ...
  
  if (savedOrder.status === 'nova') {
    // Notifikace se neposílá - pouze lokální akce
    console.log('Nová objednávka vytvořena, zatím v konceptu');
  }
};
```

### 2. Při odeslání ke schválení (status = "ke_schvaleni")

```javascript
const handleSubmitForApproval = async () => {
  // ... změna statusu v DB ...
  
  await notifyOrderSubmittedForApproval({
    id: order.id,
    cislo_objednavky: order.cislo_objednavky,
    predmet: order.predmet,
    garant_id: order.garant_id,
    prikazce_id: order.prikazce_id
  });
};
```

### 3. Při schválení objednávky

```javascript
const handleApprove = async () => {
  // ... změna statusu v DB ...
  
  await notifyOrderApproved({
    id: order.id,
    cislo_objednavky: order.cislo_objednavky,
    creator_id: order.creator_id || order.created_by_user_id
  }, currentUser.fullName);
};
```

### 4. Při zamítnutí objednávky

```javascript
const handleReject = async (rejectionReason) => {
  // ... změna statusu v DB ...
  
  await notifyOrderRejected({
    id: order.id,
    cislo_objednavky: order.cislo_objednavky,
    creator_id: order.creator_id || order.created_by_user_id
  }, rejectionReason);
};
```

### 5. Při dalších změnách statusu

Podobným způsobem přidat volání pro:
- `notifyOrderWaiting()` - status "ceka_se"
- `notifyOrderSentToSupplier()` - status "odeslana"
- `notifyOrderConfirmedBySupplier()` - status "potvrzena"
- `notifyOrderInProgress()` - status "rozpracovana"
- `notifyOrderCompleted()` - status "dokoncena"
- `notifyOrderCancelled()` - status "zrusena"
- `notifyOrderAwaitingConfirmation()` - status "ceka_potvrzeni"
- `notifyOrderDeleted()` - status "smazana"

---

## 🧪 Testování

### 1. Test panel

Přejdi na: `http://localhost:3000/test-notifications`

**Funkce:**
- Vytvoření jednotlivých notifikací (18 tlačítek)
- Hromadné vytvoření všech typů najednou
- Výběr příjemce (aktuální uživatel, konkrétní uživatel, skupina, všichni)
- Real-time log

### 2. Ruční test

```javascript
// V konzoli prohlížeče:
import { notifyOrderSubmittedForApproval } from './services/notificationsApi';

await notifyOrderSubmittedForApproval({
  id: 999,
  cislo_objednavky: 'TEST-001',
  predmet: 'Testovací objednávka',
  garant_id: 5,
  prikazce_id: 8
});
```

### 3. Kontrola v DB

```sql
-- Kontrola notifikací pro uživatele
SELECT * FROM 25_notifications 
WHERE user_id = 5 
ORDER BY dt_created DESC 
LIMIT 10;

-- Kontrola template
SELECT * FROM 25_notification_templates 
WHERE type LIKE 'order_status_%';
```

---

## 🔗 Související dokumentace

- [NOTIFICATION-RECIPIENTS.md](./NOTIFICATION-RECIPIENTS.md) - Režimy příjemců
- [BACKEND-NOTIFICATION-ID.md](./BACKEND-NOTIFICATION-ID.md) - Backend API struktura
- [TIMING-AND-ID-CHECK.md](./TIMING-AND-ID-CHECK.md) - Časování a kontrola ID

---

**Poslední aktualizace:** 2025-01-15  
**Status:** ✅ Helper funkce implementovány | ⏳ Implementace v OrderForm25 čeká
