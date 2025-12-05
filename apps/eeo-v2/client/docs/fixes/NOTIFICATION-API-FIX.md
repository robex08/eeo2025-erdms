# 🔧 FIX: Notification API - Správné použití BASE_URL

**Datum:** 15. října 2025, 22:35  
**Problém:** Testovací panel používal hardcoded `/api/notifications/create` místo správného `/api.eeo/notifications/create`  
**Původce chyby:** Agent - při vytváření testovacího panelu použil špatnou URL  

---

## 📋 Popis problému

### Chyba v konzoli:
```
[22:35:33] ❌ ERROR: Unexpected token '<', "<!doctype "... is not valid JSON
[22:35:33] ⚠️ Backend endpoint /api/notifications/create might not exist yet.
```

### Příčina:
1. **Testovací panel** (`NotificationTestPanel.js`) používal:
   - ❌ Špatně: `/api/notifications/create`
   - ✅ Správně: `${REACT_APP_API2_BASE_URL}notifications/create`

2. **Chyběla funkce** `createNotification` v `notificationsApi.js`

3. **Používal přímý fetch** místo axios instance s autentizací

---

## ✅ Co bylo opraveno

### 1. `src/services/notificationsApi.js`
**Přidána funkce `createNotification`:**
```javascript
/**
 * Vytvoření nové notifikace (pro testování)
 * @param {Object} notificationData - Data notifikace
 * @param {string} notificationData.type - Typ notifikace (order_approved, atd.)
 * @param {string} notificationData.title - Nadpis notifikace
 * @param {string} notificationData.message - Text zprávy
 * @param {string} notificationData.priority - Priorita (low, normal, high, urgent)
 * @param {string} notificationData.category - Kategorie (orders, system, atd.)
 * @param {string} notificationData.data_json - JSON data
 * @returns {Promise<Object>} - Response s ID vytvořené notifikace
 */
export const createNotification = async (notificationData) => {
  try {
    const auth = await getAuthData();
    
    const payload = {
      ...auth,
      ...notificationData
    };

    console.log('[NotificationsAPI] Creating notification:', notificationData.type);
    
    const response = await notificationsApi.post('/notifications/create', payload);
    const result = handleApiResponse(response);
    
    console.log('[NotificationsAPI] Notification created:', result.id);
    
    return result;
    
  } catch (error) {
    console.error('[NotificationsAPI] Failed to create notification:', error);
    throw error;
  }
};
```

**Přidán export:**
```javascript
export default {
  getNotificationsList,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  createNotification,  // ← NOVÉ
  NOTIFICATION_TYPES,
  NOTIFICATION_CONFIG,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CATEGORY
};
```

**Aktualizován komentář:**
```javascript
/**
 * Endpointy:
 * - POST /notifications/list - Seznam notifikací
 * - POST /notifications/unread-count - Počet nepřečtených
 * - POST /notifications/mark-read - Označit jako přečtené
 * - POST /notifications/mark-all-read - Označit vše jako přečtené
 * - POST /notifications/dismiss - Skrýt notifikaci
 * - POST /notifications/create - Vytvořit notifikaci (testing)  ← NOVÉ
 */
```

---

### 2. `src/pages/NotificationTestPanel.js`

**Změna 1: Import API funkce**
```javascript
import { createNotification as createNotificationAPI } from '../services/notificationsApi';
```

**Změna 2: Používání správného BASE_URL**
```javascript
const baseURL = process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/';
addLog(`Sending POST request to ${baseURL}notifications/create...`, 'info');
```

**Změna 3: Použití API funkce místo přímého fetch**
```javascript
// PŘED (špatně):
const response = await fetch('/api.eeo/notifications/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Username': user.username
  },
  body: JSON.stringify(notification)
});

// PO (správně):
const result = await createNotificationAPI(notification);
```

**Změna 4: Lepší error handling**
```javascript
catch (error) {
  addLog(`❌ ERROR: ${error.message}`, 'error');
  
  // Kontrola, zda chyba obsahuje HTML (endpoint neexistuje)
  if (error.message.includes('<!doctype') || error.message.includes('HTML')) {
    addLog(`⚠️ Backend endpoint might not exist yet.`, 'error');
    addLog(`💡 Ask backend developer to implement: POST ${process.env.REACT_APP_API2_BASE_URL}notifications/create`, 'info');
  }
}
```

---

## 🔍 Jak to funguje teď

### Použití v testovacím panelu:
```javascript
// 1. Uživatel klikne na tlačítko "Nová objednávka"
// 2. Zavolá se createNotification('order_created')
// 3. Načtou se auth data (token + username)
// 4. Zavolá se createNotificationAPI z notificationsApi.js
// 5. Ta použije axios instanci s baseURL: process.env.REACT_APP_API2_BASE_URL
// 6. Pošle POST request na: https://eeo.zachranka.cz/api.eeo/notifications/create
// 7. Payload obsahuje: { token, username, type, title, message, priority, category, data_json }
```

### Použití jinde v aplikaci:
```javascript
import { createNotification } from '../services/notificationsApi';

// Vytvoření notifikace
const result = await createNotification({
  type: 'order_approved',
  title: 'Objednávka schválena',
  message: 'Objednávka č. 2025-001 byla schválena.',
  priority: 'normal',
  category: 'orders',
  data_json: JSON.stringify({ order_id: 1 })
});
```

---

## 🎯 Výhody nové implementace

1. ✅ **Správný BASE_URL** - používá `process.env.REACT_APP_API2_BASE_URL`
2. ✅ **Konzistentní s ostatními API** - stejný vzor jako v `api25orders.js`
3. ✅ **Automatická autentizace** - axios interceptory přidají token
4. ✅ **Centralizovaný error handling** - všechny chyby zpracovány na jednom místě
5. ✅ **Reusable** - funkce lze použít kdekoli v aplikaci
6. ✅ **Type-safe** - dokumentované parametry v JSDoc

---

## 📊 Porovnání URL

| Místo | Špatně (před) | Správně (po) |
|-------|---------------|--------------|
| **Testovací panel** | `/api/notifications/create` | `${REACT_APP_API2_BASE_URL}notifications/create` |
| **notificationsApi.js** | (neexistovalo) | `notificationsApi.post('/notifications/create', payload)` |
| **Výsledná URL** | `http://localhost:3000/api/notifications/create` ❌ | `https://eeo.zachranka.cz/api.eeo/notifications/create` ✅ |

---

## 🚀 Jak testovat

1. **Přihlaš se do aplikace:**
   ```
   http://localhost:3000
   ```

2. **Otevři testovací panel:**
   ```
   http://localhost:3000/test-notifications
   ```

3. **Klikni na "Nová objednávka"**

4. **V logu by mělo být:**
   ```
   [22:40:15] Creating notification: order_created
   [22:40:15] Sending POST request to https://eeo.zachranka.cz/api.eeo/notifications/create...
   [22:40:15] ✅ SUCCESS: Notification created! ID: 123
   [22:40:15] 🔔 Check the bell icon (wait 5-10s for background refresh)
   ```

5. **Počkej 5-10 sekund** - background task načte notifikace

6. **Zkontroluj zvoneček** - měl by mít červený badge s číslem

---

## 📝 Soubory změněny

1. ✅ `src/services/notificationsApi.js` - Přidána funkce `createNotification`
2. ✅ `src/pages/NotificationTestPanel.js` - Použití API funkce místo fetch
3. ✅ `docs/fixes/NOTIFICATION-API-FIX.md` - Tato dokumentace

---

## 🔗 Související dokumentace

- **API dokumentace:** `docs/ORDERS25_API_DOCUMENTATION.md`
- **Testování:** `docs/TESTING-NOTIFICATIONS.md`
- **Backend schema:** DB tabulky `25_notifications`, `25_notification_templates`

---

## ⚠️ Pro backend vývojáře

### Endpoint požadavky

Endpoint **musí** být dostupný na:
```
POST https://eeo.zachranka.cz/api.eeo/notifications/create
```

**Očekávaný payload:**
```json
{
  "token": "jwt_token_here",
  "username": "user123",
  "type": "order_approved",
  "title": "Objednávka schválena",
  "message": "Objednávka č. 2025-001 byla schválena.",
  "priority": "normal",
  "category": "orders",
  "data_json": "{\"order_id\":1,\"order_number\":\"2025-001\"}"
}
```

**Očekávaná odpověď (SUCCESS):**
```json
{
  "status": "ok",
  "notification_id": 123,
  "message": "Notification created successfully"
}
```

**⚠️ DŮLEŽITÉ - notification_id v response:**
- Backend **MUSÍ** vracet `notification_id` vytvořené notifikace
- Frontend kontroluje `notification_id` (primárně) nebo `id` (fallback)
- Frontend zobrazuje toto ID v logu pro kontrolu
- Pokud ID chybí, frontend ukáže varování

**Očekávaná odpověď (ERROR):**
```json
{
  "err": "Error message here"
}
```

### Databázová struktura

Notifikace musí být uložena do tabulky `25_notifications` s těmito sloupci:
- `id` (auto-increment)
- `user_id` - ID uživatele (z tokenu/username)
- `type` - Typ notifikace (order_approved, atd.)
- `title` - Nadpis
- `message` - Text zprávy
- `priority` - Priorita (low, normal, high, urgent)
- `category` - Kategorie (orders, system, mentions, reminders)
- `data_json` - JSON data (může být NULL)
- `is_read` - Boolean (default: false)
- `created_at` - Timestamp vytvoření
- `read_at` - Timestamp přečtení (může být NULL)

### Časování background tasku

- Background task běží každých **60 sekund**
- První kontrola proběhne **do minuty** od vytvoření notifikace
- Frontend zobrazí badge s počtem nepřečtených notifikací
- Uživatel může zobrazit detail kliknutím na zvoněček

---

## ⏱️ Časování - Jak dlouho čekat?

### Background Task:
- **Interval:** 60 sekund (1 minuta)
- **První check:** 0-60 sekund po vytvoření notifikace
- **Průměrná doba:** ~30 sekund

### Testování:
1. **Vytvoř notifikaci** - klikni na tlačítko
2. **Počkej max. 60 sekund** - background task načte notifikace
3. **Zkontroluj badge** - červené číslo na zvonečku
4. **Klikni na zvoněček** - zobraz dropdown s notifikacemi

### Debug timing:
```javascript
// src/services/backgroundTasks.js
export const createNotificationCheckTask = (onNewNotifications, onUnreadCountChange) => ({
  name: 'checkNotifications',
  interval: 60 * 1000, // 60 sekund ← TADY
  execute: async () => {
    // Načtení notifikací
  }
});
```

---

## 🐛 Možné problémy a řešení

### 1. "ID: N/A" v logu

**Příčina:** Backend nevrací `notification_id` v response

**Řešení:** Backend musí vracet:
```json
{
  "status": "ok",
  "notification_id": 123  // ← TOTO MUSÍ BÝT
}
```

**Debug:**
- Frontend nyní zobrazuje celou response v logu
- Hledej řádek: `📦 Backend response: {...}`
- Zkontroluj, jestli tam je `notification_id` (preferováno) nebo `id` (fallback)

### 2. Notifikace se nezobrazí ani po minutě

**Možné příčiny:**
1. Backend neuložil notifikaci do DB
2. `user_id` není správně nastaveno
3. Backend vrací chybu při `/notifications/list`
4. Background task selhal (zkontroluj console)

**Debug kroky:**
```sql
-- 1. Zkontroluj DB
SELECT * FROM 25_notifications WHERE user_id = X ORDER BY created_at DESC LIMIT 5;

-- 2. Zkontroluj nepřečtené
SELECT COUNT(*) FROM 25_notifications WHERE user_id = X AND is_read = false;
```

### 3. "Unexpected token '<', "<!doctype "..."

**Příčina:** Backend endpoint neexistuje (vrací HTML login stránku)

**Řešení:** Implementuj endpoint `POST /api.eeo/notifications/create`

---

## ✅ Status

- [x] Opraveno hardcoded URL
- [x] Přidána funkce createNotification do API
- [x] Aktualizován testovací panel
- [x] Dokumentace vytvořena
- [x] Žádné kompilační chyby
- [ ] **Čeká na backend implementaci endpointu**

