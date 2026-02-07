# 🔍 AUDIT NOTIFIKAČNÍHO SYSTÉMU - 16.12.2025

## ❌ HLAVNÍ PROBLÉM NALEZEN!

**Frontend volá STAROU funkci** `notificationService.create()` → `/notifications/create`  
**Místo NOVÉ** → `/notifications/trigger` (org-hierarchy-aware)

---

## ✅ CO FUNGUJE (DB + Backend)

### 1. Databáze - SPRÁVNĚ ✅
```sql
-- Aktivní profil
SELECT * FROM 25_hierarchie_profily WHERE nazev = 'NOTIF-01-2025';
-- id=10, aktivni=1, nodes=2, edges=1

-- Structure JSON obsahuje:
{
  "nodes": [
    {
      "id": "user-1-1765916219094",  // RH ADMIN (IT příkazce)
      "typ": "user"
    },
    {
      "id": "template-2-1765916987843",  // Šablona "Objednávka ke schválení"
      "typ": "template",
      "data": {
        "eventTypes": ["ORDER_SENT_FOR_APPROVAL"]
      }
    }
  ],
  "edges": [
    {
      "source": "template-2-1765916987843",
      "target": "user-1-1765916219094",
      "data": {
        "notifications": {
          "types": ["ORDER_SENT_FOR_APPROVAL"],
          "recipientRole": "APPROVAL",
          "inapp": true,
          "email": false
        },
        "onlyOrderParticipants": true  // ← DŮLEŽITÉ: Filtr zapnutý
      }
    }
  ]
}
```

### 2. Notifikační šablona - SPRÁVNĚ ✅
```sql
SELECT * FROM 25_notifikace_sablony WHERE typ = 'order_status_ke_schvaleni';
-- id=2, nazev="Objednávka odeslána ke schválení", aktivni=1
```

### 3. Event typ - SPRÁVNĚ ✅
```sql
SELECT * FROM 25_notifikace_typy_udalosti WHERE kod = 'ORDER_SENT_FOR_APPROVAL';
-- kategorie=orders, aktivni=1
```

### 4. Backend endpoint - EXISTUJE ✅
```
POST /api.eeo/notifications/trigger
Handler: handle_notifications_trigger()
  → notificationRouter()
    → findNotificationRecipients() (org hierarchie)
```

---

## ❌ CO NEFUNGUJE (Frontend)

### OrderForm25.js volá ŠPATNÝ endpoint:

```javascript
// ❌ AKTUÁLNĚ (ŠPATNĚ):
await notificationService.create({
  token,
  username,
  type: 'order_status_ke_schvaleni',  // ← POZOR: 'type' ne 'event_type'!
  order_id: orderId,
  action_user_id: user_id,
  recipients: validRecipients  // ← Tohle je HARDCODOVÁNO, ne z org hierarchie!
});

// ✅ MÁ BÝT (SPRÁVNĚ):
await notificationService.trigger({  // ← NOVÁ funkce!
  token,
  username,
  event_type: 'ORDER_SENT_FOR_APPROVAL',  // ← Event type, ne template type!
  object_id: orderId,
  trigger_user_id: user_id
  // ŽÁDNÉ recipients! Backend je najde v org hierarchii!
});
```

---

## 🔧 CO OPRAVIT

### 1. **Vytvořit novou funkci v notificationsApi.js**

```javascript
// apps/eeo-v2/client/src/services/notificationsApi.js

/**
 * 🆕 NOVÝ: Trigger notifikace podle org hierarchie
 * Backend automaticky najde příjemce v hierarchii a odešle notifikace
 */
export const triggerNotification = async (eventType, objectId, triggerUserId, placeholderData = {}) => {
  try {
    const auth = await getAuthData();

    const payload = {
      ...auth,
      event_type: eventType,
      object_id: objectId,
      trigger_user_id: triggerUserId,
      placeholder_data: placeholderData
    };

    console.log('════════════════════════════════════════════════════════════════');
    console.log('🔔 [NotificationsAPI] Triggering org-hierarchy notification');
    console.log('   Event Type:', eventType);
    console.log('   Object ID:', objectId);
    console.log('   Trigger User ID:', triggerUserId);
    console.log('════════════════════════════════════════════════════════════════');

    const response = await notificationsApi.post('/notifications/trigger', payload);
    const result = handleApiResponse(response);

    console.log('✅ [NotificationsAPI] Trigger response:', result);

    return result;

  } catch (error) {
    console.error('❌ [NotificationsAPI] Trigger failed:', error);
    throw error;
  }
};
```

### 2. **Upravit OrderForm25.js**

```javascript
// ❌ SMAZAT celou logiku s hardcodovanými recipients

// ✅ NAHRADIT tímto:
if (hasKeSchvaleni && !hadKeSchvaleni) {
  console.log('🔔 Triggering ORDER_SENT_FOR_APPROVAL notification');
  
  await notificationService.trigger(
    'ORDER_SENT_FOR_APPROVAL',
    orderId,
    user_id
  );
}

// Stejně pro ORDER_APPROVED, ORDER_REJECTED, atd.
```

### 3. **Mapování workflow → event types**

| Workflow stav | Event Type | Backend template |
|--------------|------------|------------------|
| ODESLANA_KE_SCHVALENI | ORDER_SENT_FOR_APPROVAL | order_status_ke_schvaleni |
| SCHVALENA | ORDER_APPROVED | order_status_schvalena |
| ZAMITNUTA | ORDER_REJECTED | order_status_zamitnuta |
| ODESLANA | ORDER_SENT_TO_SUPPLIER | order_status_odeslana |
| POTVRZENA | ORDER_CONFIRMED | order_status_potvrzena |
| DOKONCENA | ORDER_COMPLETED | order_status_dokoncena |

---

## 🎯 VÝSLEDEK PO OPRAVĚ

### Scénář: Robert (objednatel) odešle objednávku ke schválení

1. **Frontend (OrderForm25):**
   ```javascript
   await notificationService.trigger('ORDER_SENT_FOR_APPROVAL', 142, 10);
   ```

2. **Backend (notificationRouter):**
   - Načte profil `NOTIF-01-2025`
   - Najde template s `ORDER_SENT_FOR_APPROVAL`
   - Najde edge → user-1 (RH ADMIN)
   - Zkontroluje `onlyOrderParticipants = true`
   - Ověří, že RH ADMIN je příkazce objednávky ✅
   - Vloží notifikaci do DB:
     * **RH ADMIN**: recipientRole=APPROVAL, inApp=true → 🟠 DŮLEŽITÁ (schvalovací karta)

3. **Objednatel Robert:**
   - Nedostane nic (je triggerUserId, není v hierarchii pro tento event)

4. **RH ADMIN (příkazce):**
   - ✅ Dostane in-app notifikaci typu APPROVAL
   - ✅ Zobrazí se 🟠 oranžová karta "Objednávka ke schválení"

---

## 📋 CHECKLIST OPRAVY

- [ ] Přidat funkci `triggerNotification()` do notificationsApi.js
- [ ] Upravit export: `export { ..., triggerNotification }`
- [ ] Upravit `sendOrderNotifications()` v OrderForm25.js
- [ ] Odstranit hardcodované recipients
- [ ] Použít `notificationService.trigger()` místo `.create()`
- [ ] Testovat: Robert → odeslat ke schválení → RH ADMIN dostane notifikaci

---

## 🐛 DEBUG LOGY

### Backend (PHP error log):
```bash
tail -f /var/log/apache2/error.log | grep Notification
```

### Frontend (Browser console):
- Otevřít DevTools (F12) → Console
- Uvidíš `🔔 [NotificationsAPI] Triggering...`
- A odpověď ze serveru

---

## 🔗 Související dokumentace

- `NOTIFICATION_FILTERING_IMPLEMENTATION.md` - Checkbox filtry
- `HIERARCHY_REFACTOR_COMPLETE.md` - Org hierarchie v structure_json
- `CREATE_NOTIFICATION_SYSTEM_TABLES.sql` - DB schéma

