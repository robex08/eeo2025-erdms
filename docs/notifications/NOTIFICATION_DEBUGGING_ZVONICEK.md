# 🔔 Debugging Zvonečku Badge + Implementace AUTHOR_INFO

## 📊 Aktuální Stav

### ✅ Co FUNGUJE:
- Backend vytváří notifikace s `typ='user'` (opraveno z 'system')
- `od_uzivatele_id` = autor akce (user_id=100)
- Read záznamy automaticky vytvářeny v `25_notifikace_precteni`
- Notifikace ID 678 pro objednávku O-1983/11442:
  - `pro_uzivatele_id = 1` (admin/schvalovatel)
  - `precteno = 0` ✅
  - Unread count API vrací `1` ✅

### ❌ Co NEFUNGUJE:
- **Zvoneček badge se nerefreshuje** po vytvoření nové notifikace
- **Autor (user_id=100) a garant nedostávají notifikace** - NENÍ IMPLEMENTOVÁNO!

### 📁 Struktury DB:
```sql
-- Autor objednávky
SELECT uzivatel_id FROM 25a_objednavky WHERE id = 11442;
-- Result: 100

-- Garant objednávky  
SELECT garant_uzivatel_id FROM 25a_objednavky WHERE id = 11442;
-- Result: 100
```

---

## 🐛 PROBLÉM 1: Zvoneček Badge Nerefreshuje

### Backend Debug (PHP error_log):
```bash
# Sleduj PHP error log
tail -f /var/log/php/error.log | grep -E "UnreadCount|BTask"
```

**Očekávaný výstup při volání API:**
```
🔔 [UnreadCount] Počítám nepřečtené pro user_id=1...
   ✅ Výsledek: 1 nepřečtených notifikací
```

### Frontend Debug (Browser Console):

**1. Zkontroluj Background Task:**
```javascript
// Otevři Console (F12) a počkaj 60 sekund
// Měl bys vidět:
🔔 [BTask checkNotifications] START - 23:55:00
   → Volám getUnreadCount()...
   ✅ Unread count: 1
   → Volám onUnreadCountChange(1)
✅ [BTask checkNotifications] DONE
```

**2. Zkontroluj Network Tab:**
- Filtruj: `/notifications/unread-count`
- Měl by se volat každých 60 sekund
- Response: `{"status":"ok","unread_count":1}`

**3. Zkontroluj Context State:**
```javascript
// V Console:
window.bgTasksContext = document.querySelector('[data-bg-tasks]');
// Pak:
bgTasksContext.unreadNotificationsCount
// Mělo by vrátit: 1
```

### 🔧 Možné Příčiny:

#### A) Background Task Neběží
**Symptom:** Console nezobrazuje `🔔 [BTask checkNotifications] START`

**Řešení:**
```javascript
// V App.js - zkontroluj registerTasks()
console.log('🔧 [App] Registering tasks:', tasks.length);
tasks.forEach(taskConfig => {
  console.log('   → Task:', taskConfig.name, 'Enabled:', taskConfig.enabled);
});
```

#### B) Callback Není Napojen
**Symptom:** Console zobrazuje `✅ Unread count: 1` ale badge se nemění

**Řešení:**
```javascript
// V BackgroundTasksContext.js - přidej logging:
const handleUnreadCountChange = useCallback((count) => {
  console.log('🔄 [BackgroundTasksContext] handleUnreadCountChange:', count);
  console.log('   Current state:', unreadNotificationsCount);
  setUnreadNotificationsCount(count);
  console.log('   Updated state to:', count);
}, [unreadNotificationsCount]); // ⚠️ Možná chybí dependency!
```

#### C) Layout Component Neaktualizuje Badge
**Symptom:** Context má správnou hodnotu ale badge se nezobrazuje

**Řešení:**
```javascript
// V Layout.js - NotificationBellWrapper:
const unreadCount = bgTasks?.unreadNotificationsCount || 0;
console.log('🔔 [NotificationBellWrapper] Rendering badge:', unreadCount);
console.log('   bgTasks:', bgTasks);
```

---

## 🚀 PROBLÉM 2: Chybí Notifikace pro Autora a Garanta

### Co JE IMPLEMENTOVÁNO:
- ✅ Dokumentace v `NOTIFICATION_RECIPIENT_ROLES_EXTENSION.md`
- ❌ Žádný kód! Je to jen **návrh**.

### Co NENÍ IMPLEMENTOVÁNO:

#### 1. SQL Migrace - ENUM Rozšíření
```sql
-- Aktuální ENUM:
ALTER TABLE 25_hierarchie_vztahy SHOW COLUMNS LIKE 'recipient_role';
-- Result: ENUM('EXCEPTIONAL','APPROVAL','INFO')

-- Potřebujeme přidat:
ALTER TABLE 25_hierarchie_vztahy 
MODIFY COLUMN recipient_role ENUM(
  'EXCEPTIONAL',
  'APPROVAL', 
  'INFO',
  'AUTHOR_INFO',      -- ← NOVÉ!
  'GUARANTOR_INFO'    -- ← NOVÉ!
) NOT NULL;
```

#### 2. Frontend Checkboxy v OrganizationHierarchy.js
```javascript
// V EdgeConfigPanel (kolem řádku 800+):
<FormControlLabel
  control={
    <Checkbox
      checked={edgeData.onlyOrderAuthor || false}
      onChange={(e) => updateEdgeData('onlyOrderAuthor', e.target.checked)}
    />
  }
  label="🖊️ Pouze pro AUTORA objednávky"
/>

<FormControlLabel
  control={
    <Checkbox
      checked={edgeData.onlyOrderGuarantor || false}
      onChange={(e) => updateEdgeData('onlyOrderGuarantor', e.target.checked)}
    />
  }
  label="🛡️ Pouze pro GARANTA objednávky"
/>
```

#### 3. Backend Filtry v notificationHandlers.php
```php
// V findNotificationRecipients() kolem řádku 1789:

$onlyAuthor = isset($edge['data']['onlyOrderAuthor']) ? $edge['data']['onlyOrderAuthor'] : false;
$onlyGuarantor = isset($edge['data']['onlyOrderGuarantor']) ? $edge['data']['onlyOrderGuarantor'] : false;

// NOVÁ KONTROLA: Pouze autor objednávky
if ($onlyAuthor) {
    $stmt = $db->prepare("SELECT uzivatel_id FROM " . TABLE_OBJEDNAVKY . " WHERE id = :order_id");
    $stmt->execute([':order_id' => $objectId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order || $targetNode['data']['user_id'] != $order['uzivatel_id']) {
        error_log("      ⏩ SKIP - Checkbox 'onlyAuthor' aktivní, ale target není autor");
        continue;
    }
    error_log("      ✅ MATCH - Target je AUTOR objednávky!");
}

// NOVÁ KONTROLA: Pouze garant objednávky
if ($onlyGuarantor) {
    $stmt = $db->prepare("SELECT garant_uzivatel_id FROM " . TABLE_OBJEDNAVKY . " WHERE id = :order_id");
    $stmt->execute([':order_id' => $objectId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order || !$order['garant_uzivatel_id'] || $targetNode['data']['user_id'] != $order['garant_uzivatel_id']) {
        error_log("      ⏩ SKIP - Checkbox 'onlyGuarantor' aktivní, ale target není garant");
        continue;
    }
    error_log("      ✅ MATCH - Target je GARANT objednávky!");
}
```

#### 4. Priority Mapping
```php
// V notificationRouter() kolem řádku 1600:
':priorita' => $recipient['recipientRole'], // EXCEPTIONAL, APPROVAL, INFO, AUTHOR_INFO, GUARANTOR_INFO

// DB ENUM priorita musí přijímat všechny hodnoty!
// Pokud DB má jen ('low','normal','high','urgent','EXCEPTIONAL','APPROVAL','INFO'),
// musíme přidat 'AUTHOR_INFO' a 'GUARANTOR_INFO'

// NEBO mapovat v kódu:
function mapRecipientRoleToPriority($recipientRole) {
    switch ($recipientRole) {
        case 'EXCEPTIONAL':
            return 'EXCEPTIONAL';
        case 'APPROVAL':
            return 'APPROVAL';
        case 'INFO':
        case 'AUTHOR_INFO':        // ← MAP to INFO
        case 'GUARANTOR_INFO':     // ← MAP to INFO
            return 'INFO';
        default:
            return 'INFO';
    }
}

// Pak v createNotification():
':priorita' => mapRecipientRoleToPriority($recipient['recipientRole']),
```

---

## 🎯 Kroky Implementace (Priorita)

### VYSOKÁ PRIORITA - Debug Zvoneček:

1. **Otevři browser console**
2. **Počkej 60 sekund** (interval background task)
3. **Zkontroluj console output:**
   - Běží `🔔 [BTask checkNotifications] START`?
   - Volá se `getUnreadCount()`?
   - Vrací správný count?
   - Volá se `onUnreadCountChange()`?

4. **Zkontroluj Network tab:**
   - Volá se `/notifications/unread-count` každých 60s?
   - Response je `{"status":"ok","unread_count":1}`?

5. **Zkontroluj React DevTools:**
   - BackgroundTasksContext má `unreadNotificationsCount: 1`?
   - NotificationBellWrapper dostává správný prop?

### STŘEDNÍ PRIORITA - Implementuj AUTHOR_INFO:

1. ✅ SQL migrace: Rozšířit ENUM `recipient_role`
2. ✅ SQL migrace: Rozšířit ENUM `priorita` (nebo mapovat v kódu)
3. ✅ Frontend: Přidat checkboxy v OrganizationHierarchy.js
4. ✅ Backend: Přidat filtry v findNotificationRecipients()
5. ✅ Backend: Přidat priority mapping (pokud potřeba)
6. ✅ UI: Vytvořit edges v org-hierarchy pro autora/garanta
7. ✅ Test: Vytvořit objednávku a ověřit 3 notifikace (schvalovatel, autor, garant)

---

## 📝 Rychlé SQL Skripty

### Zkontrolovat aktuální ENUM:
```sql
SELECT COLUMN_TYPE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'eeo2025' 
  AND TABLE_NAME = '25_hierarchie_vztahy' 
  AND COLUMN_NAME = 'recipient_role';
```

### Zkontrolovat ENUM priorita:
```sql
SELECT COLUMN_TYPE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'eeo2025' 
  AND TABLE_NAME = '25_notifikace' 
  AND COLUMN_NAME = 'priorita';
```

### Zkontrolovat nepřečtené pro user_id:
```sql
SELECT COUNT(*) as unread_count
FROM 25_notifikace_precteni nr
INNER JOIN 25_notifikace n ON nr.notifikace_id = n.id
WHERE nr.uzivatel_id = 1
  AND nr.precteno = 0
  AND nr.skryto = 0
  AND nr.smazano = 0
  AND n.aktivni = 1;
```

### Testovací notifikace pro autora (user_id=100):
```sql
-- 1. Vytvořit notifikaci
INSERT INTO 25_notifikace 
  (typ, nadpis, zprava, od_uzivatele_id, pro_uzivatele_id, priorita, kategorie, objekt_typ, objekt_id, aktivni, dt_created)
VALUES 
  ('user', '🖊️ Vaše objednávka byla odeslána ke schválení', 'O-1983/75030926/2025/IT', 100, 100, 'INFO', 'orders', 'orders', 11442, 1, NOW());

-- 2. Vytvořit read záznam
INSERT INTO 25_notifikace_precteni 
  (notifikace_id, uzivatel_id, precteno, skryto, smazano, dt_created)
VALUES 
  (LAST_INSERT_ID(), 100, 0, 0, 0, NOW());
```

---

## 🔍 Debugging Commands

### Backend (PHP):
```bash
# Sleduj error log
tail -f /var/log/php/error.log | grep -E "NotificationRouter|UnreadCount|findNotificationRecipients"

# Test API přímo
curl -X POST http://localhost:3002/api/notifications/unread-count \
  -H "Content-Type: application/json" \
  -d '{"token":"BASE64_TOKEN","username":"u03924"}'
```

### Frontend (Browser):
```javascript
// Test background task manuálně
import { getUnreadCount } from './services/notificationsUnified';
getUnreadCount().then(count => console.log('Unread:', count));

// Zkontroluj context
const bgTasks = document.querySelector('[data-testid="bg-tasks-provider"]')?._reactRootContainer?._internalRoot?.current?.child?.stateNode;
console.log('BgTasks state:', bgTasks?.state);
```

---

## ✅ Checklist

### Debug Zvoneček:
- [ ] Console zobrazuje background task logy každých 60s
- [ ] Network tab ukazuje volání `/notifications/unread-count`
- [ ] API vrací správný count (`{"unread_count":1}`)
- [ ] BackgroundTasksContext.unreadNotificationsCount se aktualizuje
- [ ] Layout badge zobrazuje červené číslo

### Implementace AUTHOR_INFO:
- [ ] SQL: ENUM `recipient_role` rozšířen o AUTHOR_INFO, GUARANTOR_INFO
- [ ] SQL: ENUM `priorita` podporuje nové hodnoty (nebo mapping v PHP)
- [ ] Frontend: Checkboxy v EdgeConfigPanel
- [ ] Backend: Filtry onlyOrderAuthor, onlyOrderGuarantor
- [ ] Backend: Priority mapping funkce
- [ ] UI: Edges vytvořeny v org-hierarchy
- [ ] Test: 3 notifikace (schvalovatel + autor + garant) při schválení objednávky

---

## 🎯 Příklad Finální Konfigurace

```
Organizational Hierarchy: NOTIF-01-2025

[Template: order_status_ke_schvaleni]
  ├─→ [User: Jan Schvalovatel #1]
  │    Role: APPROVAL
  │    In-App: ✅  Email: ✅
  │
  ├─→ [Group: Všichni uživatelé]
  │    Role: AUTHOR_INFO
  │    Checkbox: ✅ Pouze pro AUTORA
  │    In-App: ✅  Email: ❌
  │
  └─→ [Group: Všichni uživatelé]
       Role: GUARANTOR_INFO
       Checkbox: ✅ Pouze pro GARANTA
       In-App: ✅  Email: ✅
```

**Výsledek při odeslání objednávky O-1983:**
1. Jan Schvalovatel #1 → APPROVAL notifikace (email + in-app)
2. Autor (user_id=100) → AUTHOR_INFO notifikace (in-app only)
3. Garant (user_id=100) → GUARANTOR_INFO notifikace (email + in-app)

---

**Důležité:** Zvoneček badge musí fungovat PŘED implementací AUTHOR_INFO! Nejdřív debug, pak feature.
