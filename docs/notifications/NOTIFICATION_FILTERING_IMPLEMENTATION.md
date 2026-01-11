# 🎯 Implementace filtrování notifikací a oprávnění

**Datum:** 16. prosince 2025  
**Status:** ✅ Frontend hotovo, Backend TODO

---

## 📋 Přehled

Systém nyní podporuje **3 typy filtrování** v grafu hierarchie:

### 1. 📋 **onlyOrderParticipants** (Template → User/Role)
Filtruje notifikace jen na uživatele, kteří jsou **přímo přiřazeni k objednávce**.

**Použití:**
- Template → Role "Příkazce" + ✅ onlyOrderParticipants
- Výsledek: Notifikaci dostane jen příkazce TÉTO konkrétní objednávky

### 2. 📍 **onlyOrderLocation** (Template → User/Role)
Filtruje notifikace na uživatele s **oprávněními pro lokalitu/úsek objednávky**.

**Použití:**
- Template → Role "Kontrolor" + ✅ onlyOrderLocation
- Výsledek: Notifikaci dostanou jen kontroloři, kteří mají v hierarchii vztah k úseku/lokalitě objednávky

### 3. 🎯 **applyToOrdersOnly** (User → Department/Location)
Omezuje viditelnost jen na **objednávky z konkrétního úseku/lokality**.

**Použití:**
- User "Jan Novák" → Department "Autodoprava" + ✅ applyToOrdersOnly
- Výsledek: Jan vidí jen objednávky vytvořené v Autodopravě

---

## 🎨 Frontend implementace

### Umístění checkboxů v UI:

#### Pro notifikace (Template → Role/User):
```
DetailSection "Nastavení notifikací"
  ├─ Event Types (multi-select)
  ├─ ✅ onlyOrderParticipants checkbox
  └─ ✅ onlyOrderLocation checkbox
```

#### Pro oprávnění (User → Department/Location):
```
DetailSection "Základní vlastnosti vztahu"
  ├─ Rozsah viditelnosti (Scope)
  └─ ✅ applyToOrdersOnly checkbox
```

### Struktura edge.data:
```javascript
{
  id: "edge-1",
  source: "template-123",
  target: "role-prikazce",
  data: {
    onlyOrderParticipants: true,    // Jen účastníci objednávky
    onlyOrderLocation: false,        // Kontrola lokality vypnuta
    selectedNotificationEventTypes: ["ORDER_SENT_FOR_APPROVAL"],
    notificationRecipientRole: "APPROVAL"
  }
}
```

---

## 🔧 Backend implementace (TODO)

### 1. Funkce `sendOrderNotification()` v `notificationHandlers.php`

```php
/**
 * Odešle notifikaci pro objednávku podle hierarchie
 */
function sendOrderNotification($orderId, $eventType) {
    // 1. Načti aktivní hierarchii
    $profile = getActiveHierarchyProfile();
    $structure = json_decode($profile['structure_json'], true);
    
    // 2. Najdi šablonu pro tento event
    $template = getTemplateForEvent($eventType);
    if (!$template) {
        error_log("Template not found for event: $eventType");
        return;
    }
    
    // 3. Načti objednávku s účastníky
    $order = getOrderWithParticipants($orderId);
    
    // 4. Projdi všechny edges z této šablony
    $recipients = [];
    foreach ($structure['edges'] as $edge) {
        if ($edge['source'] !== "template-{$template['id']}") continue;
        
        // Extrahuj nastavení edge
        $onlyParticipants = $edge['data']['onlyOrderParticipants'] ?? false;
        $onlyLocation = $edge['data']['onlyOrderLocation'] ?? false;
        
        // Najdi kandidáty na příjemce
        $candidates = getEdgeTargetUsers($edge, $structure);
        
        // Aplikuj filtry
        foreach ($candidates as $userId) {
            $shouldSend = true;
            
            // Filtr 1: Jen účastníci objednávky?
            if ($onlyParticipants && !isUserInOrder($userId, $order)) {
                $shouldSend = false;
            }
            
            // Filtr 2: Jen uživatelé s oprávněním pro lokalitu/úsek?
            if ($onlyLocation && !userHasAccessToOrderLocation($userId, $order, $structure)) {
                $shouldSend = false;
            }
            
            if ($shouldSend) {
                $recipients[] = $userId;
            }
        }
    }
    
    // 5. Odešli notifikace (odstranit duplicity)
    foreach (array_unique($recipients) as $userId) {
        sendNotification($userId, $template['id'], $orderId);
    }
}

/**
 * Zjistí, zda je uživatel účastníkem objednávky
 */
function isUserInOrder($userId, $order) {
    $participants = [
        $order['objednatel_id'],
        $order['garant_id'],
        $order['prikazce_id']
    ];
    
    // Přidej všechny schvalovatele
    if (!empty($order['schvalovatele'])) {
        foreach ($order['schvalovatele'] as $approver) {
            $participants[] = $approver['uzivatel_id'];
        }
    }
    
    return in_array($userId, $participants);
}

/**
 * Zjistí, zda má uživatel oprávnění pro lokalitu/úsek objednávky
 */
function userHasAccessToOrderLocation($userId, $order, $structure) {
    $userNodeId = "user-{$userId}";
    $orderDeptId = "department-{$order['usek_id']}";
    $orderLocId = "location-{$order['lokalita_id']}";
    
    // Projdi edges: má user vztah k department/location objednávky?
    foreach ($structure['edges'] as $edge) {
        if ($edge['source'] === $userNodeId) {
            $target = $edge['target'];
            if ($target === $orderDeptId || $target === $orderLocId) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Vrátí seznam uživatelů pro daný edge target
 */
function getEdgeTargetUsers($edge, $structure) {
    $target = $edge['target'];
    list($targetType, $targetId) = explode('-', $target, 2);
    
    $users = [];
    
    switch ($targetType) {
        case 'user':
            $users[] = $targetId;
            break;
            
        case 'role':
            $users = getUsersByRoleId($targetId);
            break;
            
        case 'department':
            $users = getUsersByDepartmentId($targetId);
            break;
            
        case 'location':
            $users = getUsersByLocationId($targetId);
            break;
    }
    
    return $users;
}
```

### 2. Funkce pro filtrování viditelnosti objednávek

```php
/**
 * Aplikuje hierarchické filtrování na SQL query
 */
function applyHierarchyFilter($userId, &$query) {
    $profile = getActiveHierarchyProfile();
    $structure = json_decode($profile['structure_json'], true);
    
    $userNodeId = "user-{$userId}";
    $allowedDepts = [];
    $allowedLocs = [];
    
    // Najdi všechny edges: User → Department/Location
    foreach ($structure['edges'] as $edge) {
        if ($edge['source'] !== $userNodeId) continue;
        
        $applyToOrdersOnly = $edge['data']['applyToOrdersOnly'] ?? false;
        if (!$applyToOrdersOnly) continue; // Tento vztah se nepoužívá pro filtrování
        
        list($targetType, $targetId) = explode('-', $edge['target'], 2);
        
        if ($targetType === 'department') {
            $allowedDepts[] = $targetId;
        } elseif ($targetType === 'location') {
            $allowedLocs[] = $targetId;
        }
    }
    
    // Aplikuj na SQL
    if (!empty($allowedDepts) || !empty($allowedLocs)) {
        $conditions = [];
        
        if (!empty($allowedDepts)) {
            $deptList = implode(',', array_map('intval', $allowedDepts));
            $conditions[] = "o.usek_id IN ($deptList)";
        }
        
        if (!empty($allowedLocs)) {
            $locList = implode(',', array_map('intval', $allowedLocs));
            $conditions[] = "o.lokalita_id IN ($locList)";
        }
        
        if (!empty($conditions)) {
            $query .= " AND (" . implode(' OR ', $conditions) . ")";
        }
    }
}
```

---

## 📊 Příklady použití

### Příklad 1: Schvalovací notifikace pro konkrétního příkazce

**Graf:**
```
Šablona "Objednávka ke schválení"
  → Role "Příkazce"
     ✅ onlyOrderParticipants = true
     Event Types: ORDER_SENT_FOR_APPROVAL
```

**Objednávka #123:**
- Objednatel: Robert (user_id=10)
- Garant: Tomáš (user_id=20)
- Příkazce: **Petr (user_id=30)**

**Výsledek:**
- Notifikaci dostane **jen Petr**, ne všichni příkazci v systému

---

### Příklad 2: Info notifikace pro kontrolory dané lokality

**Graf:**
```
Šablona "Info o schválení"
  → Role "Kontrolor"
     ❌ onlyOrderParticipants = false
     ✅ onlyOrderLocation = true
     Event Types: ORDER_APPROVED
```

**Objednávka #456:**
- Lokalita: Beroun (location_id=5)
- Úsek: Autodoprava (department_id=12)

**Hierarchie:**
- Kontrolor Karel → Location Beroun ✅
- Kontrolor Jana → Location Praha ❌

**Výsledek:**
- Notifikaci dostane **jen Karel**, ne Jana

---

### Příklad 3: Omezená viditelnost objednávek

**Graf:**
```
User "Jan Novák"
  → Department "Autodoprava"
     ✅ applyToOrdersOnly = true
     Scope: TEAM
```

**Výsledek:**
- Jan vidí **jen objednávky z úseku Autodoprava**
- Nevidí objednávky z jiných úseků, i kdyby měl právo ORDER_VIEW_ALL

---

## ✅ Checklist implementace

### Frontend (HOTOVO)
- [x] Checkbox `onlyOrderParticipants` v Template edge detailu
- [x] Checkbox `onlyOrderLocation` v Template edge detailu
- [x] Checkbox `applyToOrdersOnly` v User→Department/Location detailu
- [x] Ukládání do `edge.data`
- [x] Zobrazování jen pro relevantní typy vztahů

### Backend (TODO)
- [ ] Funkce `sendOrderNotification()` s filtry
- [ ] Funkce `isUserInOrder()`
- [ ] Funkce `userHasAccessToOrderLocation()`
- [ ] Funkce `getEdgeTargetUsers()`
- [ ] Funkce `applyHierarchyFilter()` pro SQL
- [ ] Integrace do `hierarchyOrderFilters.php`
- [ ] Testy pro všechny scénáře

---

## 🚀 Další kroky

1. **Implementovat backend funkce** podle výše uvedeného kódu
2. **Otestovat scenáře:**
   - Notifikace jen pro účastníky objednávky
   - Notifikace podle lokality/úseku
   - Viditelnost objednávek podle hierarchie
3. **Dokumentovat API** pro frontend-backend komunikaci
4. **Vytvořit admin UI** pro testování notifikací

