# 🔄 NOTIFIKAČNÍ SYSTÉM - API Specifikace pro Backend

**Datum:** 25. října 2025  
**Status:** Frontend připraven, čeká na backend  
**Priorita:** HIGH

---

## 📋 PŘEHLED ZMĚN

Frontend byl **kompletně předělán** s novým notifikačním systémem:

- ✅ Nový **NotificationDropdown** komponent (hover = zobrazí seznam)
- ✅ Nová **NotificationsPage** stránka (click na zvonek = přehled)
- ✅ **Stabilní bez problikávání**
- ✅ Připraveno pro backend API
- ✅ Integrováno s Background Tasks

---

## 🎯 OČEKÁVANÉ API ENDPOINTY

### 1. **GET /api/notifications**

**Popis:** Získání seznamu notifikací pro aktuálního uživatele

**Query parametry:**
```
limit?: number         // Počet notifikací (default: 50)
offset?: number        // Pro paginaci (default: 0)
unread_only?: boolean  // Pouze nepřečtené (default: false)
priority?: string      // Filter podle priority: urgent|high|normal
type?: string         // Filter podle typu: TODO_ALARM|order|system|...
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "user_id": 5,
      "type": "TODO_ALARM",
      "priority": "urgent",
      "title": "🚨 URGENTNÍ: Zavolat dodavateli",
      "message": "Termín urgentního TODO úkolu již prošel o 15 minut.",
      "app_title": "URGENTNÍ úkol",
      "app_message": "Zavolat dodavateli - VYŽADUJE POZORNOST!",
      "is_read": 0,
      "is_sent": 1,
      "dt_created": "2025-10-25 14:30:00",
      "dt_read": null,
      "dt_sent": "2025-10-25 14:30:05",
      "from_user_id": null,
      "from_user_name": "Systém",
      "related_entity": "todo",
      "related_id": 456,
      "order_id": 789,
      "data_json": "{\"todo_id\": 456, \"order_id\": 789, \"note\": \"Urgentní\"}",
      "metadata": null
    },
    {
      "id": 124,
      "user_id": 5,
      "type": "order",
      "priority": "high",
      "title": "Nová objednávka čeká na schválení",
      "message": "Objednávka #ZZS-2025-0123 od Jana Nováka vyžaduje vaše schválení.",
      "app_title": "Nová objednávka",
      "app_message": "Objednávka #ZZS-2025-0123 čeká na schválení",
      "is_read": 0,
      "is_sent": 1,
      "dt_created": "2025-10-25 12:15:00",
      "dt_read": null,
      "dt_sent": "2025-10-25 12:15:02",
      "from_user_id": 3,
      "from_user_name": "Jan",
      "from_user_surname": "Novák",
      "related_entity": "order",
      "related_id": 123,
      "order_id": 123,
      "data_json": "{\"order_id\": 123, \"order_number\": \"ZZS-2025-0123\"}",
      "metadata": null
    }
  ],
  "meta": {
    "total": 45,
    "unread": 12,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 2. **GET /api/notifications/unread**

**Popis:** Získání pouze nepřečtených notifikací

**Query parametry:**
```
limit?: number  // Počet notifikací (default: 10)
```

**Response:**
```json
{
  "success": true,
  "data": [...],  // Stejná struktura jako GET /api/notifications
  "meta": {
    "unread": 12
  }
}
```

---

### 3. **GET /api/notifications/count**

**Popis:** Získání počtu nepřečtených notifikací (pro badge)

**Response:**
```json
{
  "success": true,
  "count": 12
}
```

---

### 4. **POST /api/notifications/:id/read**

**Popis:** Označit notifikaci jako přečtenou

**Path parametry:**
```
id: number  // ID notifikace
```

**Response:**
```json
{
  "success": true,
  "message": "Notifikace označena jako přečtená",
  "data": {
    "id": 123,
    "is_read": 1,
    "dt_read": "2025-10-25 15:30:00"
  }
}
```

---

### 5. **POST /api/notifications/read-all**

**Popis:** Označit všechny notifikace jako přečtené

**Response:**
```json
{
  "success": true,
  "message": "Všechny notifikace označeny jako přečtené",
  "count": 12
}
```

---

### 6. **DELETE /api/notifications/:id**

**Popis:** Smazat (dismiss) notifikaci

**Path parametry:**
```
id: number  // ID notifikace
```

**Response:**
```json
{
  "success": true,
  "message": "Notifikace smazána"
}
```

---

### 7. **DELETE /api/notifications**

**Popis:** Smazat všechny notifikace

**Query parametry:**
```
unread_only?: boolean  // Smazat pouze nepřečtené (default: false)
```

**Response:**
```json
{
  "success": true,
  "message": "Všechny notifikace smazány",
  "count": 25
}
```

---

## 📊 DATOVÁ STRUKTURA NOTIFIKACE

### Notifikace objekt (v databázi):

```sql
CREATE TABLE notification (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,  -- TODO_ALARM, order, system, user_message, ...
  priority VARCHAR(20) DEFAULT 'normal',  -- urgent, high, normal
  
  -- Texty pro zobrazení
  title VARCHAR(255),
  message TEXT,
  app_title VARCHAR(255),  -- Pro mobilní notifikace
  app_message TEXT,        -- Pro mobilní notifikace
  
  -- Stavy
  is_read TINYINT(1) DEFAULT 0,
  is_sent TINYINT(1) DEFAULT 0,
  
  -- Časové údaje
  dt_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  dt_read DATETIME NULL,
  dt_sent DATETIME NULL,
  
  -- Odesílatel (volitelné)
  from_user_id INT NULL,
  from_user_name VARCHAR(100) NULL,
  from_user_surname VARCHAR(100) NULL,
  
  -- Vztahy
  related_entity VARCHAR(50) NULL,  -- todo, order, user, ...
  related_id INT NULL,
  order_id INT NULL,  -- Pro rychlé napojení na objednávky
  
  -- Data
  data_json TEXT NULL,  -- JSON s dodatečnými daty
  metadata TEXT NULL,   -- JSON s metadaty
  
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_user_created (user_id, dt_created),
  INDEX idx_type (type),
  INDEX idx_priority (priority),
  INDEX idx_order (order_id)
);
```

---

## 🎨 TYPY NOTIFIKACÍ

### 1. **TODO_ALARM**
Automatická notifikace z TODO alarmu

```json
{
  "type": "TODO_ALARM",
  "priority": "urgent|high|normal",
  "title": "🚨 URGENTNÍ: {todo_title}",
  "message": "Termín TODO úkolu již prošel o {time}.",
  "related_entity": "todo",
  "related_id": 456,
  "order_id": 789,
  "data_json": "{\"todo_id\": 456, \"alarm_datetime\": \"2025-10-25 14:30:00\"}"
}
```

### 2. **order**
Notifikace související s objednávkou

```json
{
  "type": "order",
  "priority": "high|normal",
  "title": "Nová objednávka čeká na schválení",
  "message": "Objednávka #{order_number} od {user_name} vyžaduje vaše schválení.",
  "related_entity": "order",
  "related_id": 123,
  "order_id": 123,
  "from_user_id": 3,
  "data_json": "{\"order_id\": 123, \"order_number\": \"ZZS-2025-0123\"}"
}
```

### 3. **system**
Systémová notifikace

```json
{
  "type": "system",
  "priority": "normal",
  "title": "Aktualizace systému dokončena",
  "message": "Systém byl úspěšně aktualizován na verzi 2.5.3.",
  "related_entity": null,
  "related_id": null
}
```

### 4. **user_message**
Zpráva od jiného uživatele

```json
{
  "type": "user_message",
  "priority": "normal",
  "title": "Nová zpráva od {user_name}",
  "message": "{message_content}",
  "from_user_id": 5,
  "from_user_name": "Jan",
  "from_user_surname": "Novák"
}
```

---

## 🔄 INTEGRACE S BACKGROUND TASKS

Frontend již obsahuje Background Tasks systém, který:

1. **Každých 60 sekund** volá `/api/notifications/count`
2. **Aktualizuje badge** s počtem nepřečtených notifikací
3. **Zobrazuje pulzaci** zvonečku při nových notifikacích

### Jak to funguje:

```javascript
// V BackgroundTasksContext.js
const checkNotifications = async () => {
  try {
    const count = await getUnreadCount(); // GET /api/notifications/count
    setUnreadNotificationsCount(count);
  } catch (error) {
    console.error('Chyba při načítání počtu notifikací:', error);
  }
};

// Spouští se každých 60 sekund
setInterval(checkNotifications, 60000);
```

---

## 🎯 PRIORITY NOTIFIKACÍ

| Priorita | Barva | Použití | Email | Icon |
|-----------|-------|---------|-------|------|
| **urgent** | Červená | Kritické notifikace, po termínu | ✅ Ano | ⚠️ |
| **high** | Oranžová | Důležité, blízko termínu | ✅ Ano | 🕐 |
| **normal** | Modrá | Standardní notifikace | ❌ Ne | ℹ️ |

---

## 💡 DOPORUČENÍ PRO BACKEND

### 1. **Vytvoření notifikace**
```php
// Příklad vytvoření notifikace v PHP
function createNotification($userId, $type, $priority, $title, $message, $relatedData = []) {
    $notification = [
        'user_id' => $userId,
        'type' => $type,
        'priority' => $priority,
        'title' => $title,
        'message' => $message,
        'app_title' => $title,
        'app_message' => $message,
        'is_read' => 0,
        'is_sent' => 1,
        'dt_created' => date('Y-m-d H:i:s'),
        'dt_sent' => date('Y-m-d H:i:s'),
        'related_entity' => $relatedData['entity'] ?? null,
        'related_id' => $relatedData['id'] ?? null,
        'order_id' => $relatedData['order_id'] ?? null,
        'from_user_id' => $relatedData['from_user_id'] ?? null,
        'data_json' => json_encode($relatedData['data'] ?? [])
    ];
    
    // INSERT do databáze
    DB::insert('notification', $notification);
    
    return $notification;
}
```

### 2. **Background worker pro TODO alarmy**
```php
// Kontrola TODO alarmů a vytvoření notifikací
function processTodoAlarms() {
    $alarms = DB::query("
        SELECT ta.*, t.title, t.user_id, t.order_id 
        FROM todo_alarm ta
        JOIN todo t ON ta.todo_id = t.id
        WHERE ta.alarm_datetime <= NOW() + INTERVAL 30 MINUTE
          AND ta.notification_sent = FALSE
          AND ta.is_completed = FALSE
    ");
    
    foreach ($alarms as $alarm) {
        $timeDiff = strtotime($alarm->alarm_datetime) - time();
        
        // Určit prioritu
        if ($timeDiff < 0) {
            $priority = 'urgent';
            $title = "🚨 URGENTNÍ: {$alarm->title}";
        } elseif ($timeDiff < 600) { // < 10 min
            $priority = 'high';
            $title = "⚠️ DŮLEŽITÉ: {$alarm->title}";
        } else {
            $priority = 'normal';
            $title = "📋 Připomínka: {$alarm->title}";
        }
        
        // Vytvořit notifikaci
        createNotification(
            $alarm->user_id,
            'TODO_ALARM',
            $priority,
            $title,
            "TODO úkol má termín " . date('d.m.Y H:i', strtotime($alarm->alarm_datetime)),
            [
                'entity' => 'todo',
                'id' => $alarm->todo_id,
                'order_id' => $alarm->order_id,
                'data' => [
                    'todo_id' => $alarm->todo_id,
                    'alarm_datetime' => $alarm->alarm_datetime
                ]
            ]
        );
        
        // Označit jako odesláno
        DB::update('todo_alarm', ['notification_sent' => 1], ['id' => $alarm->id]);
    }
}
```

### 3. **Optimalizace dotazů**
```sql
-- Indexy pro rychlé dotazy
CREATE INDEX idx_user_read ON notification (user_id, is_read);
CREATE INDEX idx_user_created ON notification (user_id, dt_created);
CREATE INDEX idx_type ON notification (type);
CREATE INDEX idx_priority ON notification (priority);
```

---

## ✅ CHECKLIST PRO BACKEND

- [ ] Vytvořit tabulku `notification` (nebo upravit existující)
- [ ] Implementovat API endpoint: `GET /api/notifications`
- [ ] Implementovat API endpoint: `GET /api/notifications/unread`
- [ ] Implementovat API endpoint: `GET /api/notifications/count`
- [ ] Implementovat API endpoint: `POST /api/notifications/:id/read`
- [ ] Implementovat API endpoint: `POST /api/notifications/read-all`
- [ ] Implementovat API endpoint: `DELETE /api/notifications/:id`
- [ ] Implementovat API endpoint: `DELETE /api/notifications`
- [ ] Vytvořit background worker pro TODO alarmy
- [ ] Nastavit cron job (každých 5 minut)
- [ ] Otestovat vytváření notifikací
- [ ] Otestovat API endpointy
- [ ] Ověřit integraci s frontendem

---

## 🧪 TESTOVÁNÍ

### 1. Vytvoř testovací notifikaci:
```sql
INSERT INTO notification (
  user_id, type, priority, title, message, 
  is_read, is_sent, dt_created
) VALUES (
  1, 'TODO_ALARM', 'urgent', 
  '🚨 URGENTNÍ: Test notifikace', 
  'Toto je testovací notifikace.',
  0, 1, NOW()
);
```

### 2. Zkontroluj počet:
```bash
curl -X GET http://localhost/api/notifications/count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Načti notifikace:
```bash
curl -X GET "http://localhost/api/notifications?limit=10&unread_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Označ jako přečtené:
```bash
curl -X POST http://localhost/api/notifications/1/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📞 KONTAKT

Frontend je připraven a čeká na backend API. Pokud máte jakékoliv dotazy:

- Struktura dat je připravena podle výše uvedené specifikace
- Frontend umí zobrazit libovolné typy notifikací
- Vše je připraveno na integraci

**Status:** ✅ Frontend READY, čeká na backend API 🚀

---

**Vytvořeno:** 25. října 2025  
**Frontend verze:** 2.0 (kompletně předěláno)  
**Backend:** Čeká na implementaci
