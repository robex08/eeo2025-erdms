# 🎨 Vylepšení Testovacího Panelu Notifikací

**Datum:** 15. října 2025, 22:50  
**Změny:** Zvětšení o 30% + Info o příjemcích notifikací

---

## 📋 Co bylo změněno

### 1️⃣ **Zvětšení celého panelu o 30%**

**Důvod:** Lepší čitelnost, text byl příliš malý

#### Změněné rozměry:

| Element | Původní | Nové (×1.3) |
|---------|---------|-------------|
| **Container max-width** | 900px | 1170px |
| **Container margin** | 40px | 52px |
| **Container padding** | 20px | 26px |
| **Celkový font-size** | 100% | 130% |
| **Header padding** | 30px | 39px |
| **H1 font-size** | 28px | 36.4px |
| **H2 font-size** | 20px | 26px |
| **Button padding** | 15px 20px | 19.5px 26px |
| **Button font-size** | 14px | 18.2px |
| **Button icon** | 20px | 26px |
| **Log container** | 400px max | 520px max |
| **Log font-size** | 12px | 15.6px |

**Výsledek:** Celý panel je o 30% větší a lépe čitelný

---

### 2️⃣ **Info o příjemcích notifikací**

**Důvod:** Uživatel potřebuje vědět, komu se notifikace posílají

#### Přidané info bloky:

##### A) **Zelený alert (úspěšné přihlášení):**
```
✅ Přihlášen jako: username

👤 Příjemce notifikací:
Notifikace se vytvoří pouze pro tebe (username).
Backend použije token a username k určení user_id.
```

##### B) **Log zpráva při vytváření:**
```
[22:50:15] Creating notification: order_created
[22:50:15] 📤 Recipient: Current user (username)
[22:50:15] Sending POST request to...
```

##### C) **Backend kontrola (červený alert):**
```
⚠️ BACKEND KONTROLA:
Pokud se notifikace nezobrazí ani po minutě, zkontroluj:
- Je endpoint implementován?
- Vrací backend správné ID?
- Je notifikace v DB?
- Je user_id správně nastaveno? Backend musí:
  • Vzít username z payloadu
  • Najít odpovídající user_id v DB (např. tabulka users)
  • Uložit notifikaci s tímto user_id

💡 SQL příklad kontroly:
SELECT * FROM 25_notifications 
WHERE user_id = (SELECT id FROM users WHERE username = 'username') 
ORDER BY created_at DESC LIMIT 5;
```

---

## 🎯 Jak to funguje - Přiřazení příjemce

### Frontend → Backend flow:

```javascript
// 1. Frontend získá auth data
const token = await loadAuthData.token();
const user = await loadAuthData.user();

// 2. Frontend pošle payload
{
  "token": "jwt_token_here",
  "username": "john_doe",  // ← TOTO
  "type": "order_approved",
  "title": "...",
  "message": "..."
}

// 3. Backend zpracuje
// Krok 1: Ověří token
// Krok 2: Najde user_id podle username
$user_id = getUserIdByUsername($payload['username']);

// Krok 3: Uloží notifikaci
INSERT INTO 25_notifications (user_id, type, title, message, ...)
VALUES ($user_id, 'order_approved', '...', '...', ...);

// 4. Frontend načte notifikace (background task)
// - GET /notifications/list s token + username
// - Backend vrací pouze notifikace pro tohoto user_id
// - Badge zobrazí počet nepřečtených
```

---

## 🔍 Backend implementace - Doporučení

### Krok 1: Získání user_id z username

```php
// PHP příklad
function getUserIdByUsername($username) {
    $query = "SELECT id FROM users WHERE username = ?";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$username]);
    
    $user = $stmt->fetch();
    if (!$user) {
        throw new Exception("User not found: $username");
    }
    
    return $user['id'];
}
```

### Krok 2: Vytvoření notifikace

```php
// Endpoint: POST /api.eeo/notifications/create
function createNotification($payload) {
    // Ověř token
    $token = $payload['token'];
    if (!verifyToken($token)) {
        return ['err' => 'Invalid token'];
    }
    
    // Získej user_id
    $user_id = getUserIdByUsername($payload['username']);
    
    // Ulož notifikaci
    $query = "INSERT INTO 25_notifications 
              (user_id, type, title, message, priority, category, data_json, is_read, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, false, NOW())";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([
        $user_id,
        $payload['type'],
        $payload['title'],
        $payload['message'],
        $payload['priority'],
        $payload['category'],
        $payload['data_json']
    ]);
    
    $notification_id = $pdo->lastInsertId();
    
    // Vrať ID
    return [
        'status' => 'ok',
        'notification_id' => $notification_id,  // ← DŮLEŽITÉ!
        'message' => 'Notification created successfully'
    ];
}
```

### Krok 3: Načítání notifikací

```php
// Endpoint: POST /api.eeo/notifications/list
function getNotificationsList($payload) {
    // Ověř token
    $token = $payload['token'];
    if (!verifyToken($token)) {
        return ['err' => 'Invalid token'];
    }
    
    // Získej user_id
    $user_id = getUserIdByUsername($payload['username']);
    
    // Načti notifikace POUZE pro tohoto uživatele
    $query = "SELECT * FROM 25_notifications 
              WHERE user_id = ? 
              ORDER BY created_at DESC 
              LIMIT ? OFFSET ?";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([
        $user_id,
        $payload['limit'],
        $payload['offset']
    ]);
    
    $notifications = $stmt->fetchAll();
    
    return [
        'status' => 'ok',
        'data' => $notifications,
        'total' => count($notifications)
    ];
}
```

---

## 📊 Testování - Kontrola příjemce

### 1. Vytvoř notifikaci
```
http://localhost:3000/test-notifications
→ Klikni na "Nová objednávka"
```

### 2. Zkontroluj log
```
[22:50:15] Creating notification: order_created
[22:50:15] 📤 Recipient: Current user (john_doe)  ← TADY
[22:50:15] Sending POST request to...
```

### 3. Zkontroluj DB (SQL)
```sql
-- Najdi user_id
SELECT id FROM users WHERE username = 'john_doe';
-- např. vrátí: id = 5

-- Zkontroluj notifikace pro tohoto uživatele
SELECT * FROM 25_notifications 
WHERE user_id = 5 
ORDER BY created_at DESC 
LIMIT 5;

-- Měla by tam být nová notifikace s:
-- - user_id = 5
-- - type = 'order_created'
-- - title = 'Nová objednávka k schválení'
-- - is_read = false
```

### 4. Zkontroluj badge
```
Počkej max. 60 sekund
→ Zvoněček v menu by měl mít červený badge s číslem
→ Klikni na zvoněček → zobraz notifikaci
```

---

## ⚠️ Možné problémy

### 1. "Notifikace se nezobrazuje ani po minutě"

**Příčina:** `user_id` v DB nesedí

**Debug:**
```sql
-- Co backend uložil?
SELECT user_id, type, title, created_at 
FROM 25_notifications 
ORDER BY created_at DESC 
LIMIT 1;

-- Jaké user_id očekává frontend?
SELECT id FROM users WHERE username = 'john_doe';

-- Shodují se? Pokud ne, backend používá špatné user_id
```

---

### 2. "Backend vrací chybu 'User not found'"

**Příčina:** Username v payloadu nesedí s DB

**Debug:**
```sql
-- Zkontroluj username v DB
SELECT username FROM users WHERE username = 'john_doe';

-- Je tam? Pokud ne:
-- 1. Přihlas se znovu (možná session expirovala)
-- 2. Zkontroluj case-sensitive username (John_Doe vs john_doe)
```

---

### 3. "Notifikace vidí i jiní uživatelé"

**Příčina:** Backend nefiltruje podle `user_id`

**Oprava:** V `/api.eeo/notifications/list` musí být:
```php
WHERE user_id = $current_user_id  // ← TOTO CHYBÍ
```

---

## 📝 Soubory změněny

1. ✅ `src/pages/NotificationTestPanel.js` - Zvětšení o 30% + info o příjemcích
2. ✅ `docs/fixes/TEST-PANEL-IMPROVEMENTS.md` - Tato dokumentace

---

## ✅ Status

- [x] Panel zvětšen o 30% (lepší čitelnost)
- [x] Přidáno info o příjemci (zelený alert)
- [x] Log zobrazuje recipient
- [x] Backend checklist vysvětluje user_id mapping
- [x] SQL příklad pro kontrolu
- [x] Žádné kompilační chyby
- [ ] **Čeká na backend:** Implementace user_id mappingu

---

**🎯 Shrnutí:**
- Panel je větší a lépe čitelný
- Jasně ukazuje, komu se notifikace posílá (pouze aktuálnímu uživateli)
- Backend dostává `username` a musí najít odpovídající `user_id` v DB
- Notifikace se zobrazí pouze přihlášenému uživateli

