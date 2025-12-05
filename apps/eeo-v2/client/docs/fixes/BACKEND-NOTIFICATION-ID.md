# 🔧 UPDATE: Backend vrací notification_id (ne id)

**Datum:** 15. října 2025, 22:55  
**Důvod:** Backend API vrací `notification_id` místo `id`

---

## 📋 Co bylo změněno

### Backend API Response (ověřeno):

```json
{
  "status": "ok",
  "message": "Notifikace byla vytvořena",
  "notification_id": 125  // ← TOTO backend vrací
}
```

**Ne:**
```json
{
  "status": "ok",
  "id": 125  // ← TOTO backend NEvrací
}
```

---

## ✅ Opravy v kódu

### 1. `src/pages/NotificationTestPanel.js`

**Změna priority kontroly:**

```javascript
// PŘED:
if (result.id) {
  addLog(`✅ SUCCESS: ID: ${result.id}`, 'success');
} else if (result.notification_id) {
  addLog(`✅ SUCCESS: ID: ${result.notification_id}`, 'success');
}

// PO:
if (result.notification_id) {  // ← notification_id PRVNÍ
  addLog(`✅ SUCCESS: ID: ${result.notification_id}`, 'success');
} else if (result.id) {  // ← id jako fallback
  addLog(`✅ SUCCESS: ID: ${result.id}`, 'success');
}
```

**Varování aktualizováno:**
```javascript
addLog(`💡 Backend should return { status: 'ok', notification_id: 123 }`, 'info');
```

---

### 2. `src/services/notificationsApi.js`

**Console log aktualizován:**

```javascript
console.log('[NotificationsAPI] Notification created:', result.notification_id || result.id);
```

**JSDoc komentář:**
```javascript
/**
 * @returns {Promise<Object>} - Response s notification_id vytvořené notifikace
 */
```

---

### 3. Dokumentace aktualizována

#### `docs/fixes/NOTIFICATION-API-FIX.md`:
```json
{
  "status": "ok",
  "notification_id": 123  // ← TOTO MUSÍ BÝT
}
```

#### `docs/fixes/TIMING-AND-ID-CHECK.md`:
```
📦 Backend response: {"status":"ok","notification_id":123}
✅ SUCCESS: Notification created! ID: 123
```

#### `docs/fixes/TEST-PANEL-IMPROVEMENTS.md`:
```php
return [
    'status' => 'ok',
    'notification_id' => $notification_id,  // ← DŮLEŽITÉ!
    'message' => 'Notification created successfully'
];
```

---

## 🎯 Priorita kontroly

Frontend nyní kontroluje v tomto pořadí:

1. **`result.notification_id`** ← Primární (backend standard)
2. **`result.id`** ← Fallback (pro kompatibilitu)

**Důvod:** Backend API vrací `notification_id`, ale ponecháváme `id` jako fallback pro případné alternativní implementace.

---

## 📊 Očekávaný log výstup

### ✅ Správná response:
```
[22:55:10] Creating notification: order_created
[22:55:10] 📤 Recipient: Current user (john_doe)
[22:55:10] Sending POST request to https://eeo.zachranka.cz/api.eeo/notifications/create...
[22:55:11] 📦 Backend response: {"status":"ok","message":"Notifikace byla vytvořena","notification_id":125}
[22:55:11] ✅ SUCCESS: Notification created! ID: 125
[22:55:11] 🔔 Notification will appear in bell icon within 60 seconds
```

### ⚠️ Response bez ID:
```
[22:55:11] 📦 Backend response: {"status":"ok","message":"Created"}
[22:55:11] ⚠️ WARNING: Notification created but ID not returned!
[22:55:11] 💡 Backend should return { status: 'ok', notification_id: 123 }
```

---

## 🔍 Backend API Dokumentace

**Endpoint:** `POST /api.eeo/notifications/create`

**REQUEST:**
```json
{
  "token": "jwt_token",
  "username": "john_doe",
  "type": "order_approved",
  "title": "Objednávka schválena",
  "message": "Vaše objednávka č. 2025/001 byla schválena",
  "priority": "normal",
  "category": "orders",
  "data_json": "{\"order_id\":1}"
}
```

**RESPONSE SUCCESS:**
```json
{
  "status": "ok",
  "message": "Notifikace byla vytvořena",
  "notification_id": 125
}
```

**RESPONSE ERROR:**
```json
{
  "err": "Error message here"
}
```

---

## ✅ Status změn

- [x] Frontend kontroluje `notification_id` jako primární
- [x] Fallback na `id` pro kompatibilitu
- [x] Console log aktualizován
- [x] Varování zobrazuje správný formát
- [x] Dokumentace aktualizována (3 soubory)
- [x] Žádné kompilační chyby

---

## 📝 Soubory změněny

1. ✅ `src/pages/NotificationTestPanel.js` - Priorita notification_id
2. ✅ `src/services/notificationsApi.js` - Console log + JSDoc
3. ✅ `docs/fixes/NOTIFICATION-API-FIX.md` - Response formát
4. ✅ `docs/fixes/TIMING-AND-ID-CHECK.md` - Log příklady
5. ✅ `docs/fixes/TEST-PANEL-IMPROVEMENTS.md` - PHP příklad
6. ✅ `docs/fixes/BACKEND-NOTIFICATION-ID.md` - Tento souhrn

---

**🎯 Shrnutí:**
- Backend vrací `notification_id` (ne `id`)
- Frontend to správně zpracovává (primárně `notification_id`, fallback `id`)
- Dokumentace aktualizována na všech místech
- Vše připraveno na testování

