# 🐛 NOTIFICATION PLACEHOLDERS BUG FIX - STATUS REPORT

**Datum:** 17. prosince 2025  
**Problém:** Placeholdery v notifikacích se nenahrazují, zobrazují se jako `{order_number}`, `{order_subject}` atd.

---

## 📊 ANALÝZA

### 1. Evidence z DB

```sql
SELECT id, nadpis, zprava, data_json FROM 25_notifikace WHERE id = 689;
```

**Výsledek:**
```
nadpis: "{action_icon} Ke schválení: {order_number}"
zprava: "Objednávka {order_number}: \"{order_subject}\"..."
data_json: {
  "event_type": "ORDER_SENT_FOR_APPROVAL",
  "object_id": 11454,
  "recipient_role": "INFO",
  "template_id": 2,
  "template_variant": "SUBMITTER",
  "placeholders": []  ← ❌ PRÁZDNÉ POLE!
}
```

### 2. Root Cause Analysis

**Frontend (`notificationsApi.js`):**
```javascript
export const triggerNotification = async (eventType, objectId, triggerUserId, placeholderData = {}) => {
  const payload = {
    event_type: eventType,
    object_id: objectId,
    trigger_user_id: triggerUserId,
    placeholder_data: placeholderData  // ← Posílá se {} (prázdný objekt)
  };
  const response = await notificationsApi.post('/notifications/trigger', payload);
};
```

**Backend (`notificationHandlers.php`):**

```php
// Line 2896 - handle_notifications_trigger()
$placeholderData = isset($input['placeholder_data']) ? $input['placeholder_data'] : array();
// ← Přijme [] (prázdné pole) protože FE posílá {}

// Line 2101 - notificationRouter()
$placeholderData = array_merge($dbPlaceholders, $placeholderData);
// ← Měl by mergovat DB data, ALE...

// Line 2155 - Per recipient
$processedTitle = replacePlaceholders($template['app_nadpis'], $placeholderData);
// ← Placeholders SE NAHRAZUJÍ zde, ALE $placeholderData je prázdný!

// Line 2169 - Uložení do data_json
$notificationData = array(
  'placeholders' => $placeholderData  // ← Ukládá se prázdný array!
);
```

**Problém:**
- `loadOrderPlaceholders()` SE VOLÁ (řádek 2092)
- ALE výsledek `$dbPlaceholders` se správně MERGUJE
- NEBO se kód vůbec nevolá protože není hierarchie/template

###3. Možné scénáře

#### Scénář A: loadOrderPlaceholders vrací prázdný array
```php
// Line 1465 - loadOrderPlaceholders()
// Pokud objednávka neexistuje nebo SQL selže
if (!$order) {
    error_log("[loadOrderPlaceholders] Order not found: $objectId");
    return array();  // ← Vrací prázdný array!
}
```

#### Scénář B: notificationRouter SE VŮBEC NEVOLÁ
- Notifikace se vytvářejí starým systémem (přímým voláním createNotification)
- Nebo hierarchie není správně nakonfigurována

#### Scénář C: PHP array vs JSON object conversion
```php
// Frontend posílá: placeholder_data: {}
// PHP přijme: [] (indexed array místo associative)
// json_encode([]) → "[]"
// json_encode({}) → "{}"
```

---

## 🔧 IMPLEMENTOVANÉ OPRAVY

### 1. Enhanced Logging v replacePlaceholders()

**Před:**
```php
function replacePlaceholders($text, $data) {
    if (empty($text) || empty($data)) return $text;
    foreach ($data as $key => $value) {
        $text = str_replace('{' . $key . '}', $value, $text);
    }
    return $text;
}
```

**Po:**
```php
function replacePlaceholders($text, $data) {
    error_log("🔄 [replacePlaceholders] CALLED");
    error_log("   Text: " . substr($text, 0, 100));
    error_log("   Data keys: " . (is_array($data) ? implode(', ', array_keys($data)) : 'NOT ARRAY'));
    error_log("   Data count: " . (is_array($data) ? count($data) : 0));
    
    if (empty($text)) {
        error_log("   ⚠️ Text is empty, returning original");
        return $text;
    }
    
    if (empty($data)) {
        error_log("   ⚠️ Data is empty, returning text WITHOUT replacements");
        return $text;
    }
    
    $originalText = $text;
    foreach ($data as $key => $value) {
        $placeholder = '{' . $key . '}';
        if (strpos($text, $placeholder) !== false) {
            error_log("   ✅ Replacing $placeholder with: " . substr($value, 0, 50));
            $text = str_replace($placeholder, $value, $text);
        }
    }
    
    if ($text === $originalText) {
        error_log("   ⚠️ NO REPLACEMENTS MADE! Text unchanged");
    } else {
        error_log("   ✅ Replacements done. Result: " . substr($text, 0, 100));
    }
    
    return $text;
}
```

### 2. Enhanced Logging v loadOrderPlaceholders()

```php
error_log("[loadOrderPlaceholders] ✅ Loaded " . count($placeholders) . " placeholders for order $objectId");
error_log("   order_number: " . $placeholders['order_number']);
error_log("   order_subject: " . $placeholders['order_subject']);
error_log("   creator_name: " . $placeholders['creator_name']);
error_log("   ALL KEYS: " . implode(', ', array_keys($placeholders)));
```

### 3. File Logging v handle_notifications_trigger()

```php
$logFile = '/tmp/notification_debug.log';
file_put_contents($logFile, "\n════════════════════════════════════════════════════════════════\n", FILE_APPEND);
file_put_contents($logFile, "🚀 [handle_notifications_trigger] API ENDPOINT CALLED! " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
file_put_contents($logFile, "   Input: " . json_encode($input) . "\n", FILE_APPEND);
```

---

## 🧪 TESTOVACÍ POSTUP

### 1. Manuální test přes curl

```bash
# Získat token
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' eeo2025 \
  -e "SELECT token FROM 25_tokeny WHERE uzivatel_id = 1 ORDER BY dt_created DESC LIMIT 1"

# Zavolat API
curl -X POST http://erdms.zachranka.cz/api.eeo/notifications/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ZKOPIROVAT_Z_DB",
    "username": "u03924",
    "event_type": "ORDER_SENT_FOR_APPROVAL",
    "object_id": 11454,
    "trigger_user_id": 1,
    "placeholder_data": {}
  }'
```

### 2. Zkontrolovat debug log

```bash
# FILE log
cat /tmp/notification_debug.log

# Apache error log
tail -100 /var/log/apache2/error.log | grep -E "replacePlaceholders|loadOrderPlaceholders|NotificationRouter"

# DB check
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' eeo2025 \
  -e "SELECT id, nadpis, JSON_PRETTY(data_json) FROM 25_notifikace ORDER BY id DESC LIMIT 1\G"
```

### 3. Očekávané výsledky

**V logu BY MĚLO BÝT:**
```
🚀 [handle_notifications_trigger] API ENDPOINT CALLED!
🔔 [NotificationRouter] TRIGGER PŘIJAT!
📊 [NotificationRouter] DB placeholders loaded: 14 keys
   Keys: action_icon, order_number, order_subject, max_price_with_dph, creator_name, ...
✅ [NotificationRouter] Merged placeholders: 14 keys total
🔍 [findNotificationRecipients] GENERIC SYSTEM START
✅ [NotificationRouter] Nalezeno 1 příjemců:
🔄 [replacePlaceholders] CALLED
   Text: {action_icon} Ke schválení: {order_number}
   Data keys: action_icon, order_number, order_subject, max_price_with_dph, ...
   ✅ Replacing {action_icon} with: 📋
   ✅ Replacing {order_number} with: O-1984/75030926/2025/IT
   ✅ Replacements done. Result: 📋 Ke schválení: O-1984/75030926/2025/IT
```

**V DB BY MĚLO BÝT:**
```
nadpis: "📋 Ke schválení: O-1984/75030926/2025/IT"
zprava: "Objednávka O-1984/75030926/2025/IT: \"Test předmět\" (15 000 Kč)..."
data_json: {
  "placeholders": {
    "action_icon": "📋",
    "order_number": "O-1984/75030926/2025/IT",
    "order_subject": "Test předmět",
    ...
  }
}
```

---

## ❓ OTÁZKY K DISKUZI

### 1. Frontend vs Backend placeholder loading

**Současný stav:**
- FE posílá `placeholder_data: {}` (prázdné)
- BE má načíst z DB přes `loadOrderPlaceholders()`

**Otázky:**
- ✅ Je tohle správný design? (Ano, dle domluvy)
- ❓ Proč FE vůbec posílá placeholder_data pokud je vždy prázdný?
- ❓ Měl by FE poslat aspoň základní data (order_number) pro fallback?

### 2. Dva způsoby vytváření notifikací?

**Možnost A:** Organizational Hierarchy (NOVÝ systém)
```
FE → /notifications/trigger → notificationRouter() → findNotificationRecipients() → createNotification()
```

**Možnost B:** Přímé vytváření (STARÝ systém?)
```
FE/BE → createNotification() PŘÍMO (bez routeru)
```

**Otázka:**
- ❓ Existuje starý systém který obchází router?
- ❓ Jsou všechny notifikace vytvářené přes org-hierarchy?

### 3. Proč jsou logy prázdné?

- ❌ Apache error log: prázdný
- ❌ PHP error_log(): nejde nikam
- ❓ Je error_log správně nakonfigurovaný?
- ❓ Má Apache právo zapisovat do /var/log?

---

## 🚀 DALŠÍ KROKY

### Immediate (dnes):
1. ✅ Spustit manuální test přes curl
2. ✅ Zkontrolovat `/tmp/notification_debug.log`
3. ✅ Ověřit zda se `loadOrderPlaceholders()` volá
4. ✅ Ověřit zda vrací data

### Short-term (zítra):
1. ⏳ Opravit PHP error_log konfiguraci
2. ⏳ Přidat frontend debugging (console.log placeholder_data)
3. ⏳ Zkontrolovat že všechny notifikace jdou přes org-hierarchy

### Long-term:
1. ⏳ Unifikovat notifikační systém (jen 1 způsob vytváření)
2. ⏳ Přidat unit testy pro replacePlaceholders()
3. ⏳ Monitoring a alerting pro failed notifications

---

## 📝 COMMITY

```bash
git add apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php
git commit -m "fix: Add comprehensive logging for notification placeholder debugging

- Enhanced replacePlaceholders() with step-by-step logging
- Added file logging to /tmp/notification_debug.log
- Added detailed placeholder keys logging in loadOrderPlaceholders()
- Added API endpoint entry logging in handle_notifications_trigger()

This will help identify why placeholders are not being replaced in notifications.

Related issue: Notification placeholders showing as {order_number} instead of actual values"
```

---

**Status:** ⏳ WAITING FOR TEST RESULTS
