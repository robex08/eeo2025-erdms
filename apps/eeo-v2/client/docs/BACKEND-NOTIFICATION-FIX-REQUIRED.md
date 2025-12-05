# 🐛 BACKEND FIX: Notifikace se nezobrazují

## 📊 DB Struktura

Backend používá **2 tabulky**:

### 1. `25_notifications` - Notifikace (master data)
```sql
- id (PK)
- type (order_status_nova, atd.)
- title, message
- from_user_id, to_user_id
- to_users_json, to_all_users
- priority, category
- send_email, email_sent, email_sent_at
- related_object_type, related_object_id
- data_json
- dt_created, dt_expires
- active
```

### 2. `25_notifications_read` - Stav přečtení (per user)
```sql
- id (PK)
- notification_id (FK -> 25_notifications)
- user_id
- is_read (0/1)
- dt_read
- is_dismissed (0/1)
- dt_dismissed
- dt_created

UNIQUE KEY: (notification_id, user_id)
INDEX: (user_id, is_read)
INDEX: (user_id, is_dismissed)
INDEX: (user_id, is_read, dt_created)
```

**Výhoda tohoto designu:**
- ✅ Broadcast notifikace (to_all_users) se uloží pouze 1x do `25_notifications`
- ✅ Pro každého uživatele se vytvoří záznam v `25_notifications_read`
- ✅ Úspora místa (1 notifikace pro 100 uživatelů = 1 + 100 záznamů místo 100)
- ✅ Každý uživatel má vlastní `is_read`, `dt_read`
- ✅ Snadné mazání starých notifikací (DELETE z `25_notifications` → CASCADE do `25_notifications_read`)
- ✅ Statistiky (kolik uživatelů přečetlo, kdy nejdřív/nejpozději)

**Příklad: Broadcast notifikace pro 50 uživatelů**
```
Starý design: 50 záznamů v 25_notifications (1 pro každého uživatele)
Nový design: 1 záznam v 25_notifications + 50 záznamů v 25_notifications_read
```

---

## ❌ Problémy zjištěné při testování

### 1. Background task se nespouští
**Chyba v konzoli:**
```
[BackgroundTask] Task "checkNotifications" skipped - condition not met
```

**Důvod:** Frontend používá šifrované uložení (`authStorage`), ale background task kontroloval nešifrovaný `sessionStorage.authToken`.

**✅ OPRAVENO** - Frontend aktualizován na použití `loadAuthData.token()`

---

### 2. Notifikace má NULL v `to_user_id`

**DB záznam v `25_notifications`:**
```sql
id: 1
type: order_status_nova
title: Nová objednávka vytvořena
message: Objednávka č. 2025-001 byla vytvořena.
to_user_id: NULL          ← PROBLÉM!
to_users_json: NULL
to_all_users: 0
```

**DB záznam v `25_notifications_read`:**
```sql
-- Žádný záznam! Protože to_user_id je NULL
```

**Důsledek:** Notifikace není přiřazena žádnému uživateli → nikdo ji neuvidí

---

## 🔧 Backend FIX potřebný

### Endpoint: `POST /api.eeo/notifications/create`

**Současné chování (ŠPATNĚ):**
```php
// Backend vytvoří notifikaci s NULL v to_user_id
// když frontend nepošle tento parametr
```

**Požadované chování (SPRÁVNĚ):**
```php
// Když NEJSOU nastaveny to_user_id, to_users ani to_all_users:
// → Použij aktuálního uživatele z tokenu

if (empty($to_user_id) && empty($to_users) && !$to_all_users) {
    // Získej user_id z username (který je v payloadu)
    $username = $payload['username'];
    $user = $db->query("SELECT id FROM users WHERE username = ?", [$username])->fetch();
    $to_user_id = $user['id'];
    
    error_log("[Notifications] No recipient specified, using current user: $to_user_id");
}
```

---

## 📝 Backend implementace - Kompletní logika

### Zpracování příjemců v PHP:

```php
<?php
// api.eeo/notifications/create.php

// 1. Získej parametry
$type = $payload['type'];
$to_user_id = $payload['to_user_id'] ?? null;
$to_users = $payload['to_users'] ?? null;
$to_all_users = $payload['to_all_users'] ?? false;
$username = $payload['username']; // Z auth tokenu

// 2. Načti template z DB
$template = $db->query(
    "SELECT * FROM 25_notification_templates WHERE type = ? AND active = 1",
    [$type]
)->fetch();

if (!$template) {
    throw new Exception("Notification template not found: $type");
}

// 3. Nahraď placeholdery v template
$data = $payload['data'] ?? [];
$app_title = replacePlaceholders($template['app_title'], $data);
$app_message = replacePlaceholders($template['app_message'], $data);
$email_subject = replacePlaceholders($template['email_subject'], $data);
$email_body = replacePlaceholders($template['email_body'], $data);

// 4. Urči příjemce (DŮLEŽITÉ!)
$recipient_user_ids = [];

if ($to_all_users) {
    // Broadcast - všichni aktivní uživatelé
    $users = $db->query("SELECT id FROM users WHERE active = 1")->fetchAll();
    $recipient_user_ids = array_column($users, 'id');
    
    error_log("[Notifications] Broadcasting to " . count($recipient_user_ids) . " users");
    
} elseif (!empty($to_users) && is_array($to_users)) {
    // Skupina uživatelů
    $recipient_user_ids = $to_users;
    
    error_log("[Notifications] Sending to group: " . implode(',', $recipient_user_ids));
    
} elseif (!empty($to_user_id)) {
    // Konkrétní uživatel
    $recipient_user_ids = [$to_user_id];
    
    error_log("[Notifications] Sending to user: $to_user_id");
    
} else {
    // ŽÁDNÝ příjemce nebyl zadán → použij aktuálního uživatele
    $current_user = $db->query(
        "SELECT id FROM users WHERE username = ?",
        [$username]
    )->fetch();
    
    if (!$current_user) {
        throw new Exception("Current user not found: $username");
    }
    
    $recipient_user_ids = [$current_user['id']];
    
    error_log("[Notifications] No recipient specified, using current user: " . $current_user['id']);
}

// 5. Vytvoř notifikaci v 25_notifications (1 záznam)
$stmt = $db->prepare("
    INSERT INTO 25_notifications (
        type, 
        title, 
        message, 
        from_user_id, 
        to_user_id,
        to_users_json,
        to_all_users,
        priority,
        category,
        send_email,
        related_object_type,
        related_object_id,
        data_json,
        dt_created,
        active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
");

$from_user_id = $current_user['id'] ?? 1; // ID tvůrce notifikace

$stmt->execute([
    $type,
    $app_title,
    $app_message,
    $from_user_id,
    count($recipient_user_ids) === 1 ? $recipient_user_ids[0] : null,  // NULL pro broadcast/group
    count($recipient_user_ids) > 1 ? json_encode($recipient_user_ids) : null,
    $to_all_users ? 1 : 0,
    $template['priority_default'],
    $payload['category'] ?? 'general',
    $template['send_email_default'],
    $payload['related_object_type'] ?? null,
    $payload['related_object_id'] ?? null,
    json_encode($data)
]);

$notification_id = $db->lastInsertId();

// 6. Vytvoř záznamy v 25_notifications_read (pro každého příjemce)
$stmt_read = $db->prepare("
    INSERT INTO 25_notifications_read (
        notification_id,
        user_id,
        is_read,
        is_dismissed,
        dt_created
    ) VALUES (?, ?, 0, 0, NOW())
");

foreach ($recipient_user_ids as $user_id) {
    $stmt_read->execute([$notification_id, $user_id]);
    
    error_log("[Notifications] Created read record for user: $user_id");
}

// 7. Odeslat email (pokud je potřeba)
if ($template['send_email_default'] && !empty($email_subject)) {
    foreach ($recipient_user_ids as $user_id) {
        // TODO: Odeslat email
        sendNotificationEmail($user_id, $email_subject, $email_body);
    }
    
    // Označit jako odeslaný
    $db->query(
        "UPDATE 25_notifications SET email_sent = 1, email_sent_at = NOW() WHERE id = ?",
        [$notification_id]
    );
}

// 8. Vrať response
echo json_encode([
    'status' => 'ok',
    'message' => 'Notifikace byla vytvořena',
    'notification_id' => $notification_id,
    'recipients_count' => count($recipient_user_ids)
]);

// Helper funkce
function replacePlaceholders($text, $data) {
    foreach ($data as $key => $value) {
        $text = str_replace('{' . $key . '}', $value, $text);
    }
    return $text;
}
```

---

## 📥 Načítání notifikací z DB

### Endpoint: `POST /api.eeo/notifications/list`

```php
<?php
// api.eeo/notifications/list.php

$username = $payload['username'];
$limit = $payload['limit'] ?? 20;
$offset = $payload['offset'] ?? 0;
$unread_only = $payload['unread_only'] ?? false;

// Získej user_id
$user = $db->query("SELECT id FROM users WHERE username = ?", [$username])->fetch();
if (!$user) {
    throw new Exception("User not found: $username");
}
$user_id = $user['id'];

// Načti notifikace s jejich stavem
$sql = "
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.priority,
        n.category,
        n.related_object_type,
        n.related_object_id,
        n.data_json,
        n.dt_created,
        nr.is_read,
        nr.dt_read,
        nr.is_dismissed,
        nr.dt_dismissed
    FROM 25_notifications n
    INNER JOIN 25_notifications_read nr ON n.id = nr.notification_id
    WHERE nr.user_id = ?
    AND n.active = 1
    AND nr.is_dismissed = 0
";

if ($unread_only) {
    $sql .= " AND nr.is_read = 0";
}

$sql .= "
    ORDER BY n.dt_created DESC
    LIMIT ? OFFSET ?
";

$notifications = $db->query($sql, [$user_id, $limit, $offset])->fetchAll();

// Formátuj data
$result = array_map(function($notif) {
    return [
        'id' => $notif['id'],
        'type' => $notif['type'],
        'title' => $notif['title'],
        'message' => $notif['message'],
        'priority' => $notif['priority'],
        'category' => $notif['category'],
        'related_object_type' => $notif['related_object_type'],
        'related_object_id' => $notif['related_object_id'],
        'data' => json_decode($notif['data_json'], true),
        'is_read' => (bool)$notif['is_read'],
        'dt_read' => $notif['dt_read'],
        'is_dismissed' => (bool)$notif['is_dismissed'],
        'dt_dismissed' => $notif['dt_dismissed'],
        'dt_created' => $notif['dt_created']
    ];
}, $notifications);

echo json_encode([
    'status' => 'ok',
    'data' => $result,
    'total' => count($result)
]);
```

---

## 🔢 Počet nepřečtených notifikací

### Endpoint: `POST /api.eeo/notifications/unread-count`

```php
<?php
// api.eeo/notifications/unread-count.php

$username = $payload['username'];

// Získej user_id
$user = $db->query("SELECT id FROM users WHERE username = ?", [$username])->fetch();
if (!$user) {
    throw new Exception("User not found: $username");
}
$user_id = $user['id'];

// Spočítej nepřečtené
$count = $db->query("
    SELECT COUNT(*) as cnt
    FROM 25_notifications_read nr
    INNER JOIN 25_notifications n ON nr.notification_id = n.id
    WHERE nr.user_id = ?
    AND nr.is_read = 0
    AND nr.is_dismissed = 0
    AND n.active = 1
", [$user_id])->fetch();

echo json_encode([
    'status' => 'ok',
    'unread_count' => (int)$count['cnt']
]);
```

---

## ✅ Označení jako přečtené

### Endpoint: `POST /api.eeo/notifications/mark-read`

```php
<?php
// api.eeo/notifications/mark-read.php

$username = $payload['username'];
$notification_id = $payload['notification_id'];

// Získej user_id
$user = $db->query("SELECT id FROM users WHERE username = ?", [$username])->fetch();
if (!$user) {
    throw new Exception("User not found: $username");
}
$user_id = $user['id'];

// Označ jako přečtené
$db->query("
    UPDATE 25_notifications_read
    SET is_read = 1, dt_read = NOW()
    WHERE notification_id = ?
    AND user_id = ?
", [$notification_id, $user_id]);

echo json_encode([
    'status' => 'ok',
    'message' => 'Notifikace označena jako přečtená'
]);
```

---

## ✅ Označení všech jako přečtené

### Endpoint: `POST /api.eeo/notifications/mark-all-read`

```php
<?php
// api.eeo/notifications/mark-all-read.php

$username = $payload['username'];

// Získej user_id
$user = $db->query("SELECT id FROM users WHERE username = ?", [$username])->fetch();
if (!$user) {
    throw new Exception("User not found: $username");
}
$user_id = $user['id'];

// Označ všechny jako přečtené
$result = $db->query("
    UPDATE 25_notifications_read
    SET is_read = 1, dt_read = NOW()
    WHERE user_id = ?
    AND is_read = 0
", [$user_id]);

$marked_count = $result->rowCount();

echo json_encode([
    'status' => 'ok',
    'message' => 'Všechny notifikace označeny jako přečtené',
    'marked_count' => $marked_count
]);
```

---

## 🗑️ Skrytí notifikace (dismiss)

### Endpoint: `POST /api.eeo/notifications/dismiss`

```php
<?php
// api.eeo/notifications/dismiss.php

$username = $payload['username'];
$notification_id = $payload['notification_id'];

// Získej user_id
$user = $db->query("SELECT id FROM users WHERE username = ?", [$username])->fetch();
if (!$user) {
    throw new Exception("User not found: $username");
}
$user_id = $user['id'];

// Skryj notifikaci
$db->query("
    UPDATE 25_notifications_read
    SET is_dismissed = 1, dt_dismissed = NOW()
    WHERE notification_id = ?
    AND user_id = ?
", [$notification_id, $user_id]);

echo json_encode([
    'status' => 'ok',
    'message' => 'Notifikace byla skryta'
]);
```

---

## 🧪 Testování po FIXu

### 1. Test s aktuálním uživatelem (default)
```javascript
// Frontend pošle BEZ to_user_id
await createNotification({
  type: 'order_status_nova',
  title: 'Test notifikace',
  message: 'Testovací zpráva'
});

// Backend musí doplnit:
// to_user_id = ID aktuálního uživatele z tokenu
```

**Kontrola v DB:**
```sql
-- Kontrola master záznamu
SELECT * FROM 25_notifications WHERE id = LAST_INSERT_ID();
-- to_user_id = ID aktuálního uživatele (nebo NULL pro broadcast)

-- Kontrola read záznamu
SELECT * FROM 25_notifications_read 
WHERE notification_id = LAST_INSERT_ID();
-- is_read = 0
-- is_dismissed = 0
-- user_id = ID aktuálního uživatele
```

---

### 2. Test s konkrétním uživatelem
```javascript
await createNotification({
  type: 'order_status_schvalena',
  to_user_id: 5
});
```

**Kontrola v DB:**
```sql
-- Master záznam
SELECT * FROM 25_notifications WHERE id = LAST_INSERT_ID();
-- to_user_id = 5

-- Read záznam
SELECT * FROM 25_notifications_read 
WHERE notification_id = LAST_INSERT_ID();
-- user_id = 5
-- is_read = 0
```

---

### 3. Test se skupinou uživatelů
```javascript
await createNotification({
  type: 'order_status_ke_schvaleni',
  to_users: [3, 5, 8]  // GARANT + PŘÍKAZCE + další
});
```

**Kontrola v DB:**
```sql
-- Master záznam (pouze 1)
SELECT * FROM 25_notifications 
WHERE type = 'order_status_ke_schvaleni' 
ORDER BY id DESC 
LIMIT 1;
-- to_user_id = NULL
-- to_users_json = "[3,5,8]"
-- to_all_users = 0

-- Read záznamy (3 záznamy)
SELECT * FROM 25_notifications_read 
WHERE notification_id = (
    SELECT id FROM 25_notifications 
    WHERE type = 'order_status_ke_schvaleni' 
    ORDER BY id DESC LIMIT 1
);
-- 3 záznamy:
-- user_id = 3, is_read = 0
-- user_id = 5, is_read = 0
-- user_id = 8, is_read = 0
```

---

### 4. Test broadcast (všichni uživatelé)
```javascript
await createNotification({
  type: 'system_maintenance',
  to_all_users: true
});
```

**Kontrola v DB:**
```sql
-- Master záznam (pouze 1)
SELECT * FROM 25_notifications 
WHERE type = 'system_maintenance' 
ORDER BY id DESC 
LIMIT 1;
-- to_user_id = NULL
-- to_users_json = NULL
-- to_all_users = 1

-- Read záznamy (N záznamů podle počtu uživatelů)
SELECT COUNT(*) as pocet
FROM 25_notifications_read 
WHERE notification_id = (
    SELECT id FROM 25_notifications 
    WHERE type = 'system_maintenance' 
    ORDER BY id DESC LIMIT 1
);
-- Mělo by být tolik záznamů, kolik je aktivních uživatelů

-- Detail
SELECT nr.user_id, u.username, nr.is_read
FROM 25_notifications_read nr
JOIN users u ON nr.user_id = u.id
WHERE nr.notification_id = (
    SELECT id FROM 25_notifications 
    WHERE type = 'system_maintenance' 
    ORDER BY id DESC LIMIT 1
)
ORDER BY u.username;
```

---

## 📋 Checklist pro backend vývojáře

### Endpoint: `POST /api.eeo/notifications/create`
- [ ] Implementovat logiku pro určení příjemce
- [ ] Když není `to_user_id`, `to_users` ani `to_all_users` → použít aktuálního uživatele
- [ ] Načíst template z `25_notification_templates`
- [ ] Nahradit placeholdery `{order_number}`, `{order_subject}`, atd.
- [ ] Vytvořit 1 záznam v `25_notifications`
- [ ] Vytvořit záznamy v `25_notifications_read` pro každého příjemce
- [ ] Pokud `send_email = 1` → odeslat email
- [ ] Vrátit `notification_id` v response

### Endpoint: `POST /api.eeo/notifications/list`
- [ ] JOIN `25_notifications` + `25_notifications_read`
- [ ] Filtrovat podle `user_id` z tokenu
- [ ] Respektovat `unread_only` parametr
- [ ] Nevrácet `is_dismissed = 1` notifikace
- [ ] Vrátit `is_read`, `dt_read` z tabulky `25_notifications_read`

### Endpoint: `POST /api.eeo/notifications/unread-count`
- [ ] Spočítat z `25_notifications_read`
- [ ] Filtrovat `user_id`, `is_read = 0`, `is_dismissed = 0`
- [ ] Vrátit pouze číslo

### Endpoint: `POST /api.eeo/notifications/mark-read`
- [ ] UPDATE `25_notifications_read`
- [ ] SET `is_read = 1`, `dt_read = NOW()`
- [ ] WHERE `notification_id` AND `user_id`

### Endpoint: `POST /api.eeo/notifications/mark-all-read`
- [ ] UPDATE všechny záznamy v `25_notifications_read`
- [ ] Pro daného `user_id`
- [ ] Vrátit počet označených

### Endpoint: `POST /api.eeo/notifications/dismiss`
- [ ] UPDATE `25_notifications_read`
- [ ] SET `is_dismissed = 1`, `dt_dismissed = NOW()`
- [ ] WHERE `notification_id` AND `user_id`

---

## �️ SQL příklady pro údržbu a debugging

### Zobrazit notifikace s read statusem pro konkrétního uživatele
```sql
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.dt_created,
    nr.is_read,
    nr.dt_read,
    nr.is_dismissed
FROM 25_notifications n
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id AND nr.user_id = 5
WHERE n.active = 1
ORDER BY n.dt_created DESC
LIMIT 20;
```

### Statistika přečtených notifikací
```sql
SELECT 
    n.type,
    COUNT(DISTINCT n.id) as celkem_notifikaci,
    COUNT(nr.id) as celkem_read_zaznamu,
    SUM(CASE WHEN nr.is_read = 1 THEN 1 ELSE 0 END) as precteno,
    SUM(CASE WHEN nr.is_read = 0 THEN 1 ELSE 0 END) as neprecteno,
    SUM(CASE WHEN nr.is_dismissed = 1 THEN 1 ELSE 0 END) as skryto
FROM 25_notifications n
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id
WHERE n.dt_created > NOW() - INTERVAL 7 DAY
GROUP BY n.type
ORDER BY celkem_notifikaci DESC;
```

### Nejaktivnější uživatelé (kolik notifikací dostali)
```sql
SELECT 
    u.username,
    COUNT(*) as pocet_notifikaci,
    SUM(CASE WHEN nr.is_read = 1 THEN 1 ELSE 0 END) as precteno,
    SUM(CASE WHEN nr.is_read = 0 THEN 1 ELSE 0 END) as neprecteno
FROM 25_notifications_read nr
JOIN users u ON nr.user_id = u.id
WHERE nr.dt_created > NOW() - INTERVAL 30 DAY
GROUP BY u.id, u.username
ORDER BY pocet_notifikaci DESC
LIMIT 10;
```

### Broadcast notifikace a jejich dosah
```sql
SELECT 
    n.id,
    n.title,
    n.dt_created,
    COUNT(nr.user_id) as pocet_prijemcu,
    SUM(CASE WHEN nr.is_read = 1 THEN 1 ELSE 0 END) as precteno,
    ROUND(SUM(CASE WHEN nr.is_read = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(nr.user_id), 2) as procento_precteni
FROM 25_notifications n
JOIN 25_notifications_read nr ON n.id = nr.notification_id
WHERE n.to_all_users = 1
GROUP BY n.id
ORDER BY n.dt_created DESC;
```

### Vymazat staré notifikace (starší než 90 dní)
```sql
-- Nejprve vymaž read záznamy (kvůli foreign key)
DELETE FROM 25_notifications_read 
WHERE notification_id IN (
    SELECT id FROM 25_notifications 
    WHERE dt_created < NOW() - INTERVAL 90 DAY
);

-- Pak vymaž master záznamy
DELETE FROM 25_notifications 
WHERE dt_created < NOW() - INTERVAL 90 DAY;

-- Nebo jen deaktivuj (doporučeno)
UPDATE 25_notifications 
SET active = 0 
WHERE dt_created < NOW() - INTERVAL 90 DAY;
```

### Kontrola orphaned read záznamů
```sql
-- Záznamy v 25_notifications_read bez odpovídající notifikace
SELECT nr.* 
FROM 25_notifications_read nr
LEFT JOIN 25_notifications n ON nr.notification_id = n.id
WHERE n.id IS NULL;

-- Vymazat orphaned záznamy
DELETE nr FROM 25_notifications_read nr
LEFT JOIN 25_notifications n ON nr.notification_id = n.id
WHERE n.id IS NULL;
```

---

## �🔗 Související dokumentace

- [NOTIFICATION-STATUS-UPDATE.md](./docs/features/NOTIFICATION-STATUS-UPDATE.md) - Frontend implementace
- [TESTING-NOTIFICATIONS.md](./docs/TESTING-NOTIFICATIONS.md) - Testovací návod
- [NOTIFICATION-RECIPIENTS.md](./docs/NOTIFICATION-RECIPIENTS.md) - Režimy příjemců

---

**Datum:** 15. října 2025, 23:35  
**Priorita:** 🔴 VYSOKÁ - Notifikace nefungují bez tohoto FIXu  
**Status:** ⏳ Čeká na backend implementaci
