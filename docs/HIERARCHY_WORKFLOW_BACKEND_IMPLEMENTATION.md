# HIERARCHY NOTIFICATION WORKFLOW - Backend Implementation

**Datum:** 3. ledna 2026  
**Verze:** v2025.03_25  
**Stav:** ✅ IMPLEMENTOVÁNO

---

## 🎯 PŘEHLED

Implementace workflow systému pro notifikace pomocí org. hierarchie s podporou nové architektury:
- **SOURCE NODE** (template) → definuje OBSAH a KDY (eventTypes)
- **EDGE** (vztah) → definuje PRIORITU (AUTO/URGENT/WARNING/INFO)
- **TARGET NODE** (role/úsek/user) → definuje KOHO a JAK (scopeDefinition, delivery)

---

## 📁 NOVÉ SOUBORY

### `hierarchyTriggers.php`
Hlavní logika pro resolve příjemců notifikací podle hierarchie.

**Hlavní funkce:**
```php
resolveHierarchyNotificationRecipients($eventType, $eventData, $pdo)
```

**Parametry:**
- `$eventType` (string) - Název události (např. "ORDER_APPROVED")
- `$eventData` (array) - Data entity (objednávka, faktura, etc.)
- `$pdo` (PDO) - Databázové připojení

**Návratová hodnota:**
```php
[
    'recipients' => [
        [
            'user_id' => 123,
            'email' => 'user@example.com',
            'username' => 'jnovak',
            'delivery' => [
                'email' => true,
                'inApp' => true,
                'sms' => false
            ]
        ],
        // ...
    ],
    'variant_id' => 456,      // ID šablony podle priority
    'priority' => 'URGENT',   // Resolved priority
    'profile_id' => 1,        // ID použitého profilu
    'profile_name' => 'Produkční hierarchie'
]
```

**Nebo `false`** pokud:
- Hierarchie není zapnutá (`hierarchy_enabled = 0`)
- Není vybraný profil (`hierarchy_profile_id = NULL`)
- Profil neexistuje nebo není aktivní
- Žádné template nodes nemají daný eventType

---

## 🔄 WORKFLOW PROCESU

### 1. **Kontrola Global Settings**
```sql
SELECT klic, hodnota 
FROM 25a_nastaveni_globalni 
WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')
```

Pokud `hierarchy_enabled != 1` → vrátit `false` (fallback na klasický systém)

### 2. **Načtení struktur profilu**
```sql
SELECT structure_json, nazev 
FROM 25_hierarchie_profily 
WHERE id = ? AND aktivni = 1
```

Parsování JSON → `{nodes: [...], edges: [...]}`

### 3. **Najít TEMPLATE nodes s eventType**
```php
foreach ($structure['nodes'] as $node) {
    if ($node['type'] === 'template' && 
        in_array($eventTypeId, $node['data']['eventTypes'])) {
        // Match!
    }
}
```

### 4. **Projít EDGES z template**
Pro každý edge:
- Zkontrolovat `edge.data.eventTypes` (subset z template)
- Resolve **priority**:
  - `AUTO` → `resolveAutoPriority($eventData)` → kontrola `mimoradna_udalost`
  - Jinak použít statickou hodnotu (URGENT/WARNING/INFO)
- Resolve **variant_id** z template podle priority:
  - `URGENT` → `urgentVariant`
  - `WARNING` → `warningVariant`
  - `INFO` → `infoVariant`

### 5. **Najít TARGET NODE a resolve příjemce**
```php
$recipients = resolveTargetNodeRecipients($targetNode, $eventData, $pdo);
```

**Podle typu node:**

#### **ROLE**
```php
scopeDefinition.type:
  - ALL: SELECT DISTINCT u.id FROM 25_uzivatele u
         INNER JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
         WHERE ur.role_id = ? AND u.aktivni = 1
  
  - SELECTED: SELECT id FROM 25_uzivatele
              WHERE id IN (selectedIds) AND aktivni = 1
  
  - DYNAMIC_FROM_ENTITY: SELECT id FROM 25_uzivatele
                         WHERE id = eventData[field] AND aktivni = 1
```

#### **DEPARTMENT (úsek)**
```php
scopeDefinition.type:
  - ALL: SELECT id FROM 25_uzivatele
         WHERE usek_id = ? AND aktivni = 1
  
  - SELECTED: SELECT id FROM 25_uzivatele
              WHERE id IN (selectedIds) AND aktivni = 1
  
  - DYNAMIC_FROM_ENTITY: Stejné jako ROLE
```

#### **USER**
```php
SELECT id FROM 25_uzivatele
WHERE id = node.data.userId AND aktivni = 1
```

### 6. **Deduplikace**
Pokud je uživatel v několika rolích/úsecích → vrátit jen jednou.

### 7. **Vrátit výsledek**
```php
return [
    'recipients' => $uniqueRecipients,
    'variant_id' => $variantId,
    'priority' => $priority,
    'profile_id' => $profileId,
    'profile_name' => $profileName
];
```

---

## 📐 STRUKTURA JSON (NOVÁ V2)

### **NODE - Template**
```json
{
  "id": "template-order-approved",
  "type": "template",
  "position": {"x": 100, "y": 100},
  "data": {
    "templateId": 5,
    "warningVariant": 123,
    "urgentVariant": 456,
    "infoVariant": 789,
    "previewVariant": 123,
    "eventTypes": [1, 2, 3]
  }
}
```

### **NODE - Role (TARGET)**
```json
{
  "id": "role-ucetni",
  "type": "role",
  "position": {"x": 300, "y": 100},
  "data": {
    "roleId": 5,
    "roleName": "UCETNI",
    "scopeDefinition": {
      "type": "SELECTED",
      "selectedIds": [10, 25, 30]
    },
    "delivery": {
      "email": true,
      "inApp": true,
      "sms": false
    }
  }
}
```

### **EDGE**
```json
{
  "id": "edge-1",
  "source": "template-order-approved",
  "target": "role-ucetni",
  "data": {
    "priority": "AUTO",
    "eventTypes": [1]
  }
}
```

---

## 🔄 MIGRACE STARÝCH STRUKTUR

Funkce `migrateHierarchyStructureToV2()` automaticky migruje při načítání:

### **NODE změny:**
- `normalVariant` → `warningVariant`
- Přidány defaulty: `scopeDefinition: {type: 'ALL'}`, `delivery: {email: true, inApp: true, sms: false}`

### **EDGE změny:**
- `recipientRole` → `priority`:
  - `EXCEPTIONAL` → `URGENT`
  - `APPROVAL` → `WARNING`
  - `INFO` → `INFO`
- Přidán default: `priority: 'WARNING'`

---

## 🧪 TESTOVÁNÍ

### Test script
```bash
php _docs/scripts-php/test-hierarchy-triggers.php
```

### Ruční test
```php
require_once 'api.php';

$eventData = [
    'id' => 123,
    'prikazce_id' => 10,
    'mimoradna_udalost' => 1
];

$result = resolveHierarchyNotificationRecipients('ORDER_APPROVED', $eventData, $pdo);

if ($result) {
    echo "Recipients: " . count($result['recipients']) . "\n";
    echo "Priority: " . $result['priority'] . "\n";
    echo "Variant ID: " . $result['variant_id'] . "\n";
} else {
    echo "Hierarchy disabled or no matches\n";
}
```

---

## 🔌 INTEGRACE DO STÁVAJÍCÍCH TRIGGERŮ

### Příklad - Schválení objednávky
```php
// V notificationHandlers.php nebo orderHandlers.php

// Načíst data objednávky
$order = getOrderById($orderId, $pdo);

// Zkusit hierarchy systém
$hierarchyResult = resolveHierarchyNotificationRecipients('ORDER_APPROVED', $order, $pdo);

if ($hierarchyResult) {
    // Použít hierarchy
    foreach ($hierarchyResult['recipients'] as $recipient) {
        $userId = $recipient['user_id'];
        $delivery = $recipient['delivery'];
        
        // Odeslat podle delivery preferences
        if ($delivery['email']) {
            sendEmail($userId, $hierarchyResult['variant_id'], $order);
        }
        if ($delivery['inApp']) {
            createInAppNotification($userId, $hierarchyResult['variant_id'], $order);
        }
        if ($delivery['sms']) {
            sendSMS($userId, $order);
        }
    }
} else {
    // Fallback na klasický systém
    sendNotificationClassicWay($orderId);
}
```

---

## ⚙️ HELPER FUNKCE

### `getActiveHierarchyProfileId($pdo)`
Vrací ID aktivního profilu nebo `null`.

### `isHierarchyEnabled($pdo)`
Vrací `true` pokud `hierarchy_enabled = 1`.

### `resolveAutoPriority($eventData)`
Vrací `URGENT` pokud `mimoradna_udalost = 1`, jinak `WARNING`.

### `resolveTargetNodeRecipients($targetNode, $eventData, $pdo)`
Resolve příjemce podle typu node a scopeDefinition.

---

## 📊 VÝKONNOST

### Optimalizace
- ✅ **Single profile load** - struktura se načte jen jednou
- ✅ **Prepared statements** - všechny DB queries
- ✅ **Deduplikace** - uživatel jen jednou i když je v několika rolích
- ✅ **Early return** - pokud hierarchie není zapnutá, vrátit `false` okamžitě

### Caching (budoucí)
```php
// Cache structure_json in memory (APCu/Redis)
$cacheKey = "hierarchy_profile_{$profileId}";
$structure = apcu_fetch($cacheKey);
if (!$structure) {
    $structure = loadFromDB($profileId);
    apcu_store($cacheKey, $structure, 3600);
}
```

---

## 🔒 BEZPEČNOST

- ✅ Prepared statements pro všechny queries
- ✅ Kontrola `aktivni = 1` pro uživatele
- ✅ Validace JSON struktury
- ✅ Error logging bez odhalení citlivých dat
- ✅ Token autentizace pro save/load endpointy

---

## 📝 CHANGELOG

### v2025.03_25 (3.1.2026)
- ✅ Implementován `hierarchyTriggers.php`
- ✅ Přidána migrace struktur v `hierarchyHandlers.php`
- ✅ Support pro novou architekturu (SOURCE → EDGE → TARGET)
- ✅ AUTO priority mode s `mimoradna_udalost` check
- ✅ Scope definition: ALL/SELECTED/DYNAMIC_FROM_ENTITY
- ✅ Delivery preferences per recipient

---

## 🚀 NASAZENÍ

### Kroky
1. ✅ Vytvořit `hierarchyTriggers.php`
2. ✅ Upravit `hierarchyHandlers.php` (migrace)
3. ✅ Přidat require do `api.php`
4. 🔜 Vytvořit test script
5. 🔜 Testování na dev
6. 🔜 Integrace do existujících triggerů
7. 🔜 Deploy na produkci

### Kontrola
```bash
# Syntax check
php -l hierarchyTriggers.php

# Test funkčnosti
php test-hierarchy-triggers.php

# Check error log
tail -f /var/log/apache2/error.log | grep "HIERARCHY TRIGGER"
```

---

## 📞 PODPORA

Pro otázky nebo problémy kontaktujte development team.

**HOTLINE:** HIERARCHY TRIGGER log prefix v error_log
