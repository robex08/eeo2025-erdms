# 🔄 Sjednocení názvosloví Event Types

**Datum:** 3. ledna 2026  
**Důvod:** Nekonzistentní naming convention napříč systémem

---

## ❌ Současný stav (NEKONZISTENTNÍ)

```javascript
// SMĚS lowercase a UPPERCASE!
'order_status_schvalena'          // ❌ lowercase
'ALARM_TODO_NORMAL'                // ❌ UPPERCASE  
'system_maintenance_scheduled'     // ❌ lowercase
'ORDER_STATUS_KE_SCHVALENI'        // ❌ konstanta UPPERCASE, ale hodnota lowercase
```

---

## ✅ NOVÝ STANDARD (UPPERCASE s underscore)

### Všechny event types = **UPPERCASE_WITH_UNDERSCORE**

```javascript
// OBJEDNÁVKY
ORDER_CREATED
ORDER_PENDING_APPROVAL
ORDER_APPROVED
ORDER_REJECTED
ORDER_AWAITING_CHANGES
ORDER_SENT_TO_SUPPLIER
ORDER_CONFIRMED_BY_SUPPLIER
ORDER_REGISTRY_PENDING
ORDER_REGISTRY_PUBLISHED
ORDER_INVOICE_PENDING
ORDER_INVOICE_ADDED
ORDER_VERIFICATION_PENDING
ORDER_VERIFICATION_APPROVED
ORDER_COMPLETED

// FAKTURY
INVOICE_CREATED
INVOICE_PENDING_APPROVAL
INVOICE_APPROVED
INVOICE_REJECTED
INVOICE_PAID
INVOICE_OVERDUE

// POKLADNA
CASHBOOK_ENTRY_CREATED
CASHBOOK_ENTRY_APPROVED
CASHBOOK_ENTRY_REJECTED

// TODO ALARMY
TODO_ALARM_NORMAL
TODO_ALARM_URGENT
TODO_ALARM_EXPIRED
TODO_COMPLETED
TODO_ASSIGNED

// SYSTÉM
SYSTEM_MAINTENANCE_SCHEDULED
SYSTEM_MAINTENANCE_STARTING
SYSTEM_MAINTENANCE_FINISHED
SYSTEM_BACKUP_COMPLETED
SYSTEM_UPDATE_AVAILABLE
SYSTEM_SECURITY_ALERT

// OSTATNÍ
USER_MENTIONED
DEADLINE_REMINDER
ORDER_FORCE_UNLOCKED
```

---

## 📋 MAPOVÁNÍ (starý → nový)

### Objednávky

| Starý kód | Nový kód | Popis |
|-----------|----------|-------|
| `order_status_nova` | `ORDER_CREATED` | Objednávka vytvořena |
| `order_status_rozpracovana` | `ORDER_DRAFT` | Rozpracovaná |
| `order_status_ke_schvaleni` | `ORDER_PENDING_APPROVAL` | Ke schválení |
| `order_status_schvalena` | `ORDER_APPROVED` | Schválena |
| `order_status_zamitnuta` | `ORDER_REJECTED` | Zamítnuta |
| `order_status_ceka_se` | `ORDER_AWAITING_CHANGES` | Vráceno k přepracování |
| `order_status_odeslana` | `ORDER_SENT_TO_SUPPLIER` | Odesláno dodavateli |
| `order_status_ceka_potvrzeni` | `ORDER_AWAITING_CONFIRMATION` | Čeká na potvrzení |
| `order_status_potvrzena` | `ORDER_CONFIRMED_BY_SUPPLIER` | Potvrzeno dodavatelem |
| `order_status_registr_ceka` | `ORDER_REGISTRY_PENDING` | Čeká na zveřejnění v registru |
| `order_status_registr_zverejnena` | `ORDER_REGISTRY_PUBLISHED` | Zveřejněno v registru |
| `order_status_faktura_ceka` | `ORDER_INVOICE_PENDING` | Čeká na vystavení faktury |
| `order_status_faktura_pridana` | `ORDER_INVOICE_ADDED` | Faktura přidána |
| `order_status_faktura_schvalena` | `ORDER_INVOICE_APPROVED` | Faktura schválena |
| `order_status_faktura_uhrazena` | `ORDER_INVOICE_PAID` | Faktura uhrazena |
| `order_status_kontrola_ceka` | `ORDER_VERIFICATION_PENDING` | Čeká na věcnou správnost |
| `order_status_kontrola_potvrzena` | `ORDER_VERIFICATION_APPROVED` | Věcná správnost OK |
| `order_status_kontrola_zamitnuta` | `ORDER_VERIFICATION_REJECTED` | Věcná správnost zamítnuta |
| `order_status_dokoncena` | `ORDER_COMPLETED` | Dokončena |

### TODO Alarmy

| Starý kód | Nový kód |
|-----------|----------|
| `alarm_todo_normal` | `TODO_ALARM_NORMAL` |
| `alarm_todo_high` | `TODO_ALARM_URGENT` |
| `alarm_todo_expired` | `TODO_ALARM_EXPIRED` |
| `todo_completed` | `TODO_COMPLETED` |
| `todo_assigned` | `TODO_ASSIGNED` |

### Systémové

| Starý kód | Nový kód |
|-----------|----------|
| `system_maintenance_scheduled` | `SYSTEM_MAINTENANCE_SCHEDULED` |
| `system_maintenance_starting` | `SYSTEM_MAINTENANCE_STARTING` |
| `system_maintenance_finished` | `SYSTEM_MAINTENANCE_FINISHED` |
| `system_backup_completed` | `SYSTEM_BACKUP_COMPLETED` |
| `system_update_available` | `SYSTEM_UPDATE_AVAILABLE` |
| `system_update_installed` | `SYSTEM_UPDATE_INSTALLED` |
| `system_security_alert` | `SYSTEM_SECURITY_ALERT` |
| `system_user_login_alert` | `SYSTEM_USER_LOGIN_ALERT` |
| `system_session_expired` | `SYSTEM_SESSION_EXPIRED` |
| `system_storage_warning` | `SYSTEM_STORAGE_WARNING` |

### Ostatní

| Starý kód | Nový kód |
|-----------|----------|
| `user_mention` | `USER_MENTIONED` |
| `deadline_reminder` | `DEADLINE_REMINDER` |
| `order_unlock_forced` | `ORDER_FORCE_UNLOCKED` |

---

## 🛠️ CO BY TO OBNÁŠELO?

### 1. **Databáze** (KRITICKÉ!)

#### Tabulka `25_notification_templates`
- Pole `type` = event type kód
- **MIGRACE SQL:**

```sql
-- Backup
CREATE TABLE 25_notification_templates_backup_20260103 
SELECT * FROM 25_notification_templates;

-- Migrace objednávky
UPDATE 25_notification_templates SET type = 'ORDER_CREATED' WHERE type = 'order_status_nova';
UPDATE 25_notification_templates SET type = 'ORDER_PENDING_APPROVAL' WHERE type = 'order_status_ke_schvaleni';
UPDATE 25_notification_templates SET type = 'ORDER_APPROVED' WHERE type = 'order_status_schvalena';
UPDATE 25_notification_templates SET type = 'ORDER_REJECTED' WHERE type = 'order_status_zamitnuta';
UPDATE 25_notification_templates SET type = 'ORDER_AWAITING_CHANGES' WHERE type = 'order_status_ceka_se';
UPDATE 25_notification_templates SET type = 'ORDER_SENT_TO_SUPPLIER' WHERE type = 'order_status_odeslana';
UPDATE 25_notification_templates SET type = 'ORDER_CONFIRMED_BY_SUPPLIER' WHERE type = 'order_status_potvrzena';
UPDATE 25_notification_templates SET type = 'ORDER_REGISTRY_PENDING' WHERE type = 'order_status_registr_ceka';
UPDATE 25_notification_templates SET type = 'ORDER_REGISTRY_PUBLISHED' WHERE type = 'order_status_registr_zverejnena';
UPDATE 25_notification_templates SET type = 'ORDER_INVOICE_PENDING' WHERE type = 'order_status_faktura_ceka';
UPDATE 25_notification_templates SET type = 'ORDER_INVOICE_ADDED' WHERE type = 'order_status_faktura_pridana';
UPDATE 25_notification_templates SET type = 'ORDER_VERIFICATION_PENDING' WHERE type = 'order_status_kontrola_ceka';
UPDATE 25_notification_templates SET type = 'ORDER_VERIFICATION_APPROVED' WHERE type = 'order_status_kontrola_potvrzena';
UPDATE 25_notification_templates SET type = 'ORDER_COMPLETED' WHERE type = 'order_status_dokoncena';

-- Migrace TODO
UPDATE 25_notification_templates SET type = 'TODO_ALARM_NORMAL' WHERE type = 'alarm_todo_normal';
UPDATE 25_notification_templates SET type = 'TODO_ALARM_URGENT' WHERE type = 'alarm_todo_high';
UPDATE 25_notification_templates SET type = 'TODO_ALARM_EXPIRED' WHERE type = 'alarm_todo_expired';
UPDATE 25_notification_templates SET type = 'TODO_COMPLETED' WHERE type = 'todo_completed';
UPDATE 25_notification_templates SET type = 'TODO_ASSIGNED' WHERE type = 'todo_assigned';

-- Migrace systém
UPDATE 25_notification_templates SET type = 'SYSTEM_MAINTENANCE_SCHEDULED' WHERE type = 'system_maintenance_scheduled';
UPDATE 25_notification_templates SET type = 'SYSTEM_SECURITY_ALERT' WHERE type = 'system_security_alert';
-- ... atd.

-- Migrace ostatní
UPDATE 25_notification_templates SET type = 'USER_MENTIONED' WHERE type = 'user_mention';
UPDATE 25_notification_templates SET type = 'DEADLINE_REMINDER' WHERE type = 'deadline_reminder';
UPDATE 25_notification_templates SET type = 'ORDER_FORCE_UNLOCKED' WHERE type = 'order_unlock_forced';
```

#### Tabulka `25_notifikace`
- Pole `typ` obsahuje event type
- **MIGRACE:**

```sql
-- Migrace existujících notifikací
UPDATE 25_notifikace SET typ = 'ORDER_APPROVED' WHERE typ = 'order_status_schvalena';
UPDATE 25_notifikace SET typ = 'ORDER_PENDING_APPROVAL' WHERE typ = 'order_status_ke_schvaleni';
-- ... atd. pro všechny typy
```

#### Tabulka `25_notifikace_hierarchie_profily`
- Pole `structure_json` → `nodes[].data.eventTypes[]`
- **MIGRACE:**

```sql
-- Toto bude složitější - JSON update
UPDATE 25_notifikace_hierarchie_profily
SET structure_json = JSON_REPLACE(
  structure_json,
  '$.nodes[*].data.eventTypes',
  -- Zde bude potřeba custom PHP/Python skript pro rekurzivní replace
)
WHERE aktivni = 1;
```

**LEPŠÍ:** PHP skript pro migrace JSON:

```php
// migration_event_types.php
$stmt = $db->query("SELECT id, structure_json FROM 25_notifikace_hierarchie_profily WHERE aktivni = 1");
while ($row = $stmt->fetch()) {
    $structure = json_decode($row['structure_json'], true);
    
    // Replace v eventTypes
    foreach ($structure['nodes'] as &$node) {
        if (isset($node['data']['eventTypes'])) {
            $node['data']['eventTypes'] = array_map(function($type) {
                return EVENT_TYPE_MIGRATION_MAP[$type] ?? $type;
            }, $node['data']['eventTypes']);
        }
    }
    
    $newJson = json_encode($structure);
    $db->prepare("UPDATE 25_notifikace_hierarchie_profily SET structure_json = ? WHERE id = ?")
       ->execute([$newJson, $row['id']]);
}
```

---

### 2. **Backend (PHP)**

#### Soubory k úpravě:
- `notificationHandlers.php` - všechny event type stringy
- `orderHandlers.php` - volání `triggerNotification(...)`
- `invoiceHandlers.php` - pokud existují
- `orderV2Endpoints.php` - API endpointy

**Příklad změn:**

```php
// PŘED:
triggerNotification($db, 'order_status_schvalena', $orderId, $userId, ...);

// PO:
triggerNotification($db, 'ORDER_APPROVED', $orderId, $userId, ...);
```

**Rozsah:** ~200-300 řádků změn

---

### 3. **Frontend (React)**

#### Soubory k úpravě:
- `src/constants/notificationTypes.js` - HLAVNÍ soubor
- `src/forms/OrderForm25.js` - všechna volání `triggerNotification`
- `src/services/notificationService.js`
- `src/services/notificationsApi.js`
- `src/services/notificationsUnified.js`
- `src/pages/Orders25List.js`
- `src/components/...` - komponenty které filtrují notifikace

**Příklad změn:**

```javascript
// PŘED:
const NOTIFICATION_TYPES = {
  ORDER_STATUS_SCHVALENA: 'order_status_schvalena'
};

// PO:
const NOTIFICATION_TYPES = {
  ORDER_APPROVED: 'ORDER_APPROVED'
};

// Použití:
triggerNotification({
  type: NOTIFICATION_TYPES.ORDER_APPROVED  // Místo ORDER_STATUS_SCHVALENA
});
```

**Rozsah:** ~150-200 řádků změn

---

### 4. **Org Hierarchie UI**

- Event type selector v Template NODE editoru
- Dropdown s event types musí zobrazovat nové názvy
- Ale UI label zůstane v češtině!

**Příklad:**

```javascript
// Dropdown
<option value="ORDER_APPROVED">Objednávka schválena</option>
<option value="ORDER_REJECTED">Objednávka zamítnuta</option>
```

---

## ⏱️ ČASOVÁ NÁROČNOST

| Krok | Čas | Popis |
|------|-----|-------|
| 1. SQL migrace DB templates | **15 min** | Přímé UPDATE příkazy |
| 2. SQL migrace existujících notifikací | **10 min** | UPDATE 25_notifikace |
| 3. PHP migrace org hierarchie JSON | **30 min** | Skript + testování |
| 4. Backend PHP změny | **45 min** | Find & Replace + testování |
| 5. Frontend JS změny | **30 min** | Změna constanta + imports |
| 6. Testování | **30 min** | Ověřit že vše funguje |
| **CELKEM** | **~2.5 hodiny** | Včetně testování |

---

## ⚠️ RIZIKA

### VYSOKÉ RIZIKO:
1. **Existující notifikace v DB** - pokud nemigujeme `25_notifikace.typ`, frontend nebude zobrazovat staré notifikace správně
2. **Org hierarchie JSON** - pokud nemigujeme `eventTypes`, pravidla přestanou fungovat
3. **API volání z frontendu** - pokud frontend pošle starý typ, backend nenajde template

### ŘEŠENÍ:
**DUAL SUPPORT** - Backend podporuje OBĚ varianty po přechodnou dobu:

```php
// Backend
function normalizeEventType($eventType) {
    $migration = [
        'order_status_schvalena' => 'ORDER_APPROVED',
        'order_status_ke_schvaleni' => 'ORDER_PENDING_APPROVAL',
        // ... celá mapa
    ];
    
    return $migration[$eventType] ?? $eventType;
}

// Použití
$normalizedType = normalizeEventType($input['event_type']);
triggerNotification($db, $normalizedType, ...);
```

**Výhoda:** Zpětná kompatibilita - starý kód bude fungovat!

---

## 📝 DOPORUČENÍ

### ⏰ KDYŽ MÁŠ 2 DNY:
**NEDĚL TO TEĎ** ❌

**Důvod:**
- Vysoké riziko chyb
- Mnoho souborů k úpravě
- Nutné otestovat všechny flow
- Může rozbít existující funkčnost

### ✅ CO UDĚLAT MÍSTO TOHO:
1. **Teď:** Pokračuj s org hierarchií refaktorem (varianty)
2. **Za 2 dny:** Předej s poznámkou "Event types naming refactor připraven - dokument: EVENT_TYPES_NAMING_REFACTOR.md"
3. **Později:** Implementuj po předání, když bude klid

### 🚀 NEBO: Quick win?
Pokud OPRAVDU chceš, můžem to udělat **RYCHLE BEZ MIGRACE**:
- Změnit jen **nové kódy** do budoucna
- Staré nechat jak jsou
- Mít v systému oba styly (ne ideální, ale funguje)

---

## 🎯 ROZHODNUTÍ

**Co uděláme?**

**A) TEĎ (2.5h)** - Kompletní refactor včetně migrace  
**B) POZDĚJI** - Po předání projektu  
**C) HYBRID** - Nové kódy UPPERCASE, staré nechat  
**D) SKIP** - Nechat jak je

---

**Doporučuji: B) POZDĚJI** ✅

Důvod: Za 2 dny předáváš → priorita je **stabilita**, ne **refaktoring názvů**.

