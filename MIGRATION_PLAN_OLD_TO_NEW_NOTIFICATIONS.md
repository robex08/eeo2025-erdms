# 🔄 MIGRACE NOTIFIKAČNÍHO SYSTÉMU - Inventura

**Datum:** 18. prosince 2025  
**Účel:** Kompletní eliminace starého systému, ponechat jen org. hierarchii

---

## 📊 INVENTURA ENDPOINTŮ

### ✅ **PONECHAT** (Potřebné pro běžnou funkčnost)

| Endpoint | Handler | Použití | Status |
|----------|---------|---------|--------|
| `/notifications/list` | `handle_notifications_list()` | Načtení seznamu notifikací | ✅ KEEP |
| `/notifications/unread-count` | `handle_notifications_unread_count()` | Počet nepřečtených | ✅ KEEP |
| `/notifications/mark-read` | `handle_notifications_mark_read()` | Označit jako přečtenou | ✅ KEEP |
| `/notifications/mark-all-read` | `handle_notifications_mark_all_read()` | Označit vše jako přečtené | ✅ KEEP |
| `/notifications/dismiss` | `handle_notifications_dismiss()` | Skrýt notifikaci | ✅ KEEP |
| `/notifications/dismiss-all` | `handle_notifications_dismiss_all()` | Skrýt všechny | ✅ KEEP |
| `/notifications/restore` | `handle_notifications_restore()` | Obnovit notifikaci | ✅ KEEP |
| `/notifications/delete` | `handle_notifications_delete()` | Smazat notifikaci | ✅ KEEP |
| `/notifications/delete-all` | `handle_notifications_delete_all()` | Smazat všechny | ✅ KEEP |
| `/notifications/user-preferences` | `handle_notifications_user_preferences()` | Načíst preference | ✅ KEEP |
| `/notifications/user-preferences/update` | `handle_notifications_user_preferences_update()` | Uložit preference | ✅ KEEP |
| `/notifications/templates/list` | `handle_notification_templates_list()` | Seznam šablon | ✅ KEEP |
| `/notifications/templates/detail` | `handle_notification_templates_detail()` | Detail šablony | ✅ KEEP |
| `/notifications/templates/create` | `handle_notification_templates_create()` | Vytvořit šablonu | ✅ KEEP |
| `/notifications/event-types/list` | `handle_notification_event_types_list()` | Seznam event typů | ✅ KEEP |

### 🎯 **NOVÝ SYSTÉM** (Org. hierarchie - hlavní flow)

| Endpoint | Handler | Použití | Status |
|----------|---------|---------|--------|
| `/notifications/trigger` | `handle_notifications_trigger()` | **HLAVNÍ** - Trigger události přes org. hierarchii | ✅ KEEP |

### ❌ **ODSTRANIT** (Starý systém - DEPRECATED)

| Endpoint | Handler | Problém | Nahradit |
|----------|---------|---------|----------|
| `/notifications/send-dual` | `handle_notifications_send_dual()` | Ignoruje org. hierarchii, bere `email_vychozi` z DB | → `/notifications/trigger` |
| `/notifications/create` | `handle_notifications_create()` | Ruční vytváření, bypass org. hierarchie | → `/notifications/trigger` |
| `/notifications/send-bulk` | `handle_notifications_send_bulk()` | Ruční hromadné odeslání, bypass | → `/notifications/trigger` |
| `/notifications/preview` | `handle_notifications_preview()` | Preview starého systému | → Odstranit nebo přepsat |
| `/notifications/templates` | `handle_notifications_templates()` | Duplicate? | → Zkontrolovat |

---

## 🔍 INVENTURA FRONTEND VOLÁNÍ

### OrderForm25.js - HLAVNÍ PROBLÉM

**Řádek ~10238 a ~10698:**
```javascript
await notificationServiceDual.sendOrderApprovalNotifications({
  orderData: currentOrder,
  ...
});
```

**Co dělá:**
- Volá `/notifications/send-dual` (starý handler)
- Ignoruje org. hierarchii
- Bere `email_vychozi` z šablony v DB
- **❌ MUSÍ SE PŘEPSAT**

**Řešení:**
- Nahradit voláním `/notifications/trigger`
- Event typ: `ORDER_SENT_FOR_APPROVAL`
- Org. hierarchie rozhodne o příjemcích a kanálech

---

### notificationService.js - DEPRECATED FUNKCE

**Funkce k odstranění:**

1. **`sendOrderApprovalNotifications()`** (řádek ~460)
   - Volá `/notifications/send-dual`
   - ❌ ODSTRANIT

2. **`createNotification()`** (řádek ~67)
   - Volá `/notifications/create`
   - ⚠️ MOŽNÁ PONECHAT pro manuální testy
   - Nebo přepsat na wrapper pro `/trigger`

3. **`sendBulkNotifications()`** (řádek ~162)
   - Volá `/notifications/send-bulk`
   - ❌ ODSTRANIT

---

### notificationsUnified.js - ČÁSTEČNĚ OK

**Funkce:**

1. **`createNotification()`** (řádek ~695)
   - Volá `/notifications/create`
   - ⚠️ Použití: Test panely, manuální triggery
   - **ROZHODNUTÍ:** Ponechat ale přidat WARNING deprecation

2. **`sendBulkNotifications()`** (řádek ~766)
   - Volá `/notifications/send-bulk`
   - ⚠️ Použití: Hromadné akce mimo hierarchii
   - **ROZHODNUTÍ:** Ponechat ale přidat WARNING deprecation

3. **`triggerNotificationByEvent()`** (řádek ~811)
   - Volá `/notifications/trigger` ✅ SPRÁVNĚ!
   - ✅ PONECHAT - toto je nový systém

---

### notificationsApi.js - WRAPPER

**Funkce:**

1. **`createNotification()`** (řádek ~779)
   - Wrapper pro `/notifications/create`
   - ⚠️ MOŽNÁ PONECHAT pro zpětnou kompatibilitu

2. **`triggerNotification()`** (řádek ~822)
   - Wrapper pro `/notifications/trigger` ✅ SPRÁVNĚ!
   - ✅ PONECHAT - toto je nový systém

---

## 📋 MIGRAČNÍ PLÁN

### FÁZE 1: PŘEPSAT OrderForm25.js ⚠️ KRITICKÉ

**Před:**
```javascript
await notificationServiceDual.sendOrderApprovalNotifications({
  orderData: currentOrder,
  ...
});
```

**Po:**
```javascript
await notificationsApi.triggerNotification({
  event_type: 'ORDER_SENT_FOR_APPROVAL',
  object_id: currentOrder.id,
  trigger_user_id: currentUserId,
  placeholder_data: {
    order_number: currentOrder.ev_cislo,
    order_subject: currentOrder.predmet,
    // ... další data
  }
});
```

**Impact:**
- ✅ Respektuje org. hierarchii
- ✅ Respektuje edge config (sendEmail/sendInApp)
- ✅ Respektuje user preferences
- ✅ Respektuje global settings

---

### FÁZE 2: OZNAČIT DEPRECATED FUNKCE

**notificationService.js:**
```javascript
/**
 * @deprecated Use notificationsApi.triggerNotification() instead
 * This function bypasses organizational hierarchy
 */
async sendOrderApprovalNotifications() {
  console.warn('DEPRECATED: Use triggerNotification() instead');
  throw new Error('This function is deprecated. Use notifications/trigger API.');
}
```

---

### FÁZE 3: ODSTRANIT BACKEND HANDLERY

**V `api.php` - ODSTRANIT:**
```php
case 'notifications/send-dual':
case 'notifications/create':
case 'notifications/send-bulk':
case 'notifications/preview':
```

**V `handlers.php` - ODSTRANIT:**
```php
function handle_notifications_send_dual() { ... }
```

**V `notificationHandlers.php` - ODSTRANIT:**
```php
function handle_notifications_create() { ... }
function handle_notifications_send_bulk() { ... }
function handle_notifications_preview() { ... }
```

---

### FÁZE 4: CLEANUP DB

**Vypnout `email_vychozi` u všech šablon:**
```sql
UPDATE 25_notifikace_sablony 
SET email_vychozi = 0;
```

**Důvod:** Org. hierarchie nyní řídí vše, `email_vychozi` se nepoužívá.

---

## ⚠️ DISKUZNÍ BODY

### 1. `/notifications/create` - Ponechat?

**Pro:**
- Používá se v test panelech
- Může být užitečné pro manuální triggery
- Admin může chtít poslat notifikaci mimo hierarchii

**Proti:**
- Bypass org. hierarchie
- Bezpečnostní riziko
- Nekonzistentní s novým systémem

**💡 Doporučení:**
- Ponechat ale:
  - Přidat permission check (pouze ADMIN)
  - Přidat WARNING log
  - Přidat deprecation notice ve FE

---

### 2. `/notifications/send-bulk` - Ponechat?

**Pro:**
- Hromadné akce (např. "poslat všem")
- System announcements

**Proti:**
- Bypass org. hierarchie
- Může spamovat

**💡 Doporučení:**
- Ponechat ale:
  - Pouze pro SUPERADMIN
  - Přidat rate limiting
  - Logovat všechna použití

---

### 3. NotificationTestPanel.js - Co s ním?

**Současný stav:**
- Používá `/notifications/create`
- Test panel pro vývojáře

**💡 Doporučení:**
- Přepsat na použití `/notifications/trigger`
- Přidat UI pro výběr event typu
- Simulovat real-world scénáře

---

## 📊 TIMELINE

| Fáze | Úkol | Čas | Priorita |
|------|------|-----|----------|
| 1 | Přepsat OrderForm25.js | 2h | 🔴 Kritická |
| 2 | Přidat deprecation warnings | 1h | 🟡 Vysoká |
| 3 | Otestovat nový flow | 3h | 🔴 Kritická |
| 4 | Odstranit backend handlery | 1h | 🟢 Střední |
| 5 | Cleanup DB | 15min | 🟢 Nízká |
| 6 | Update dokumentace | 1h | 🟢 Nízká |

**Celkem:** ~8 hodin

---

## 🎯 OČEKÁVANÉ VÝSLEDKY

**Po migraci:**

✅ Všechny notifikace řídí **org. hierarchie**  
✅ `sendEmail`/`sendInApp` z **edge config**  
✅ Respektovány **user preferences**  
✅ Respektovány **global settings**  
✅ Žádné bypassy, žádné prázdné emaily  
✅ Konzistentní systém  

---

**Připraveno k diskuzi: 18.12.2025 01:30**
