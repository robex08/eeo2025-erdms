# PROPOSAL: Org Hierarchy Architecture Refactor - FINAL
## Čistá separace: SOURCE → EDGE → TARGET (každý má jednu zodpovědnost)

**Datum:** 2026-01-03  
**Status:** ✅ SCHVÁLENO (Varianta B - Scope v TARGET NODE)  
**Priorita:** HIGH (zásadní zlepšení UX a logiky)

---

## 📋 FINÁLNÍ ARCHITEKTURA (VARIANTA B)

### **Princip: 1 NODE = 1 ZODPOVĚDNOST**

```
┌─────────────────────────────────────────┐
│  SOURCE NODE (Template/Event)           │
│  "Změna stavu objednávky"               │
│                                         │
│  📧 CO: Obsah notifikace                │
│  ├─ 🟡 WARN varianta (HTML šablona)     │
│  ├─ 🔴 URGENT varianta (HTML šablona)   │
│  └─ 🔵 INFO varianta (HTML šablona)     │
└─────────────────────────────────────────┘
         │
         │ [EDGE #1]
         │ ├─ KDY: [ORDER_PENDING_APPROVAL]
         │ ├─ JAK: Priority = AUTO/WARN/URGENT/INFO
         │ └─ (žádné scope definice!)
         ▼
┌─────────────────────────────────────────┐
│  TARGET NODE (Role/Úsek/User)           │
│  🎭 Role "Příkazce"                     │
│                                         │
│  👤 KDO: Definice příjemců              │
│  ├─ ○ Všem v roli                       │
│  ├─ ○ Vybraným osobám: [☑ Jan, ☑ Petr] │
│  └─ ● Z entity dynamicky:               │
│      └─ Pole: objednavka.prikazce_id    │
│                                         │
│  📬 JAK DORUČIT:                         │
│  ├─ Email: ☑                            │
│  └─ In-app: ☑                           │
└─────────────────────────────────────────┘
```

---

## 🎯 VÝHODY TÉTO ARCHITEKTURY

### 1. **Jasná separace zodpovědností**
- **SOURCE** = Co říká notifikace (obsah, varianty)
- **EDGE** = Kdy a jak poslat (event types, priorita)
- **TARGET** = Komu poslat (scope, doručení)

### 2. **Znovupoužitelnost TARGET NODE**
```
TARGET "Role Příkazce" může být cílem pro:
- EDGE #1: Šablona "Ke schválení" → Příkazce (URGENT)
- EDGE #2: Šablona "Schváleno" → Příkazce (INFO)
- EDGE #3: Šablona "Odmítnuto" → Příkazce (WARN)

A scope definice platí pro VŠE! ✅
```

### 3. **Dynamické načítání z entity (killer feature)**
```php
// TARGET NODE: Role "Příkazce"
// Scope: Z entity dynamicky (pole: prikazce_id)

// Backend při ORDER_PENDING_APPROVAL:
$order = getOrder(142);
$prikazce_id = $order['prikazce_id']; // 5
$recipient = getUser($prikazce_id);

sendNotification($recipient, $template, 'URGENT');
```

### 4. **Flexibilní kombinace**
```
Můžu mít:
- 1 šablonu → 10 různých rolí (10 edges)
- 1 roli → 5 různých šablon (5 edges)
- Různé priority pro různé event types
- Multi-match s deduplikací
```

---

## 📊 DB STRUKTURA ZMĚNY

### **Tabulka: `25_hierarchie_profily`**

**PŘED:**
```json
{
  "nodes": [
    {
      "id": "template-2",
      "typ": "template",
      "data": {
        "templateId": 2,
        "eventTypes": ["ORDER_PENDING_APPROVAL"],  // ❌ Patří na EDGE!
        "normalVariant": "",
        "urgentVariant": "APPROVER_URGENT"
      }
    },
    {
      "id": "role-5",
      "typ": "role",
      "data": {
        "roleId": 5,
        "name": "Příkazce"  // ❌ Chybí scope definice!
      }
    }
  ],
  "edges": [
    {
      "source": "template-2",
      "target": "role-5",
      "data": {
        "recipientRole": "APPROVAL",  // ❌ Zavádějící název
        "scope_filter": "PARTICIPANTS_ALL"  // ❌ Patří do TARGET!
      }
    }
  ]
}
```

**PO:**
```json
{
  "nodes": [
    {
      "id": "template-2",
      "typ": "template",
      "data": {
        "templateId": 2,
        "warnVariant": "RECIPIENT",
        "urgentVariant": "RECIPIENT",
        "infoVariant": "SUBMITTER"
        // ❌ Žádné eventTypes!
      }
    },
    {
      "id": "role-5",
      "typ": "role",
      "data": {
        "roleId": 5,
        "name": "Příkazce",
        "scopeDefinition": {  // ✅ NOVÉ!
          "type": "DYNAMIC_FROM_ENTITY",  // VŠEM / SELECTED / DYNAMIC_FROM_ENTITY
          "field": "prikazce_id",  // Pro DYNAMIC
          "selectedIds": [],  // Pro SELECTED
          "includeSubordinates": false  // Pro hierarchii
        },
        "delivery": {  // ✅ NOVÉ!
          "email": true,
          "inApp": true,
          "sms": false
        }
      }
    }
  ],
  "edges": [
    {
      "source": "template-2",
      "target": "role-5",
      "data": {
        "eventTypes": ["ORDER_PENDING_APPROVAL"],  // ✅ Přesunuto z NODE!
        "priority": "AUTO",  // AUTO / WARN / URGENT / INFO
        "priorityAuto": {  // Když priority=AUTO
          "exceptional": true,  // Použij URGENT pro mimořádné
          "fields": ["mimoradna_udalost"]
        }
        // ❌ Žádný scope_filter!
      }
    }
  ]
}
```

---

## 🎨 FRONTEND ZMĚNY (OrganizationHierarchy.js)

### **1. DYNAMICKÉ DIALOGY podle typu NODE**

```javascript
// Detail panelu podle node.typ
const renderNodeDetail = (node) => {
  switch(node.typ) {
    case 'template':
      return <TemplateNodeDetail node={node} />;
    case 'role':
      return <RoleTargetDetail node={node} />;
    case 'usek':
      return <UsekTargetDetail node={node} />;
    case 'user':
      return <UserTargetDetail node={node} />;
    default:
      return null;
  }
};
```

### **2. SOURCE NODE (Template) - KRÁTKÝ**

```jsx
<FormGroup>
  <Label>🟡 WARN varianta</Label>
  <Select value={warnVariant}>
    <option value="RECIPIENT">📧 Standardní</option>
    <option value="SUBMITTER">✅ Potvrzení</option>
  </Select>
</FormGroup>

<FormGroup>
  <Label>🔴 URGENT varianta</Label>
  <Select value={urgentVariant}>
    <option value="RECIPIENT">🚨 Urgentní</option>
  </Select>
</FormGroup>

<FormGroup>
  <Label>🔵 INFO varianta</Label>
  <Select value={infoVariant}>
    <option value="SUBMITTER">✅ Potvrzení</option>
  </Select>
</FormGroup>

<InfoBox>
💡 Event Types definujete na šipce (EDGE)
</InfoBox>
```

### **3. TARGET NODE - Role - DYNAMICKÝ**

```jsx
<h3>👤 Komu posílat notifikace</h3>

<FormGroup>
  <Label>Rozsah příjemců</Label>
  <Select value={scopeType} onChange={e => setScopeType(e.target.value)}>
    <option value="ALL">Všem v roli "Příkazce"</option>
    <option value="SELECTED">Vybraným osobám</option>
    <option value="DYNAMIC">Z entity (dynamicky)</option>
  </Select>
</FormGroup>

{scopeType === 'SELECTED' && (
  <CustomSelect
    multiple
    value={selectedUserIds}
    options={allUsersWithRole.map(u => ({
      value: u.id,
      label: `${u.jmeno} ${u.prijmeni}`
    }))}
  />
)}

{scopeType === 'DYNAMIC' && (
  <>
    <FormGroup>
      <Label>Načíst z pole entity</Label>
      <Select value={dynamicField}>
        <option value="prikazce_id">Příkazce</option>
        <option value="garant_uzivatel_id">Garant</option>
        <option value="uzivatel_id">Autor</option>
        <option value="schvalovatel_id">Schvalovatel</option>
      </Select>
    </FormGroup>
    <small>Backend načte uživatele z objednavka.{dynamicField}</small>
  </>
)}

<h3>📬 Doručení</h3>
<Checkbox checked={deliveryEmail}>📧 Email</Checkbox>
<Checkbox checked={deliveryInApp}>🔔 In-app</Checkbox>
```

### **4. TARGET NODE - Úsek - JINÝ DIALOG**

```jsx
<h3>👥 Komu posílat notifikace</h3>

<FormGroup>
  <Label>Rozsah příjemců</Label>
  <Select value={scopeType}>
    <option value="ALL">Všem v úseku "IT"</option>
    <option value="ENTITY_PARTICIPANTS">Jen účastníkům entity</option>
    <option value="SELECTED_USEKY">Vybraným úsekům</option>
  </Select>
</FormGroup>

{scopeType === 'SELECTED_USEKY' && (
  <CustomSelect
    multiple
    value={selectedUsekIds}
    options={allUseky.map(u => ({
      value: u.id,
      label: u.usek_nazev
    }))}
  />
)}
```

### **5. EDGE Detail - JEDNODUCHÝ**

```jsx
<h3>📅 Kdy poslat</h3>
<CustomSelect
  multiple
  value={eventTypes}
  options={allEventTypes}
  placeholder="Vyberte event types..."
/>

<h3>⚡ Priorita</h3>
<Select value={priority}>
  <option value="AUTO">🤖 Automaticky (dle mimořádné události)</option>
  <option value="WARN">🟡 WARN (vždy)</option>
  <option value="URGENT">🔴 URGENT (vždy)</option>
  <option value="INFO">🔵 INFO (vždy)</option>
</Select>

{priority === 'AUTO' && (
  <small>
    Backend zkontroluje pole objednavka.mimoradna_udalost
    • Ano → URGENT varianta
    • Ne → WARN varianta
  </small>
)}
```

---

## 🔧 BACKEND ZMĚNY

### **1. NOVÝ ENDPOINT: hierarchy/target-node/detail**

```php
/**
 * POST - Načte detail TARGET NODE včetně scope options
 * Endpoint: hierarchy/target-node/detail
 * POST: {token, username, nodeId, nodeType}
 */
function handle_hierarchy_target_detail($input, $config) {
    // Validace
    $nodeType = $input['nodeType']; // 'role', 'usek', 'user'
    $nodeId = $input['nodeId'];
    
    $db = get_db($config);
    
    switch($nodeType) {
        case 'role':
            // Načti všechny uživatele s touto rolí
            $stmt = $db->prepare("
                SELECT u.id, u.jmeno, u.prijmeni, u.email
                FROM 25_uzivatele u
                JOIN 25_uzivatele_role ur ON u.id = ur.user_id
                WHERE ur.role_id = ?
                AND u.aktivni = 1
            ");
            $stmt->execute([$nodeId]);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'status' => 'success',
                'data' => [
                    'nodeType' => 'role',
                    'availableUsers' => $users,
                    'dynamicFields' => [
                        ['value' => 'prikazce_id', 'label' => 'Příkazce objednávky'],
                        ['value' => 'garant_uzivatel_id', 'label' => 'Garant objednávky'],
                        ['value' => 'uzivatel_id', 'label' => 'Autor objednávky'],
                        ['value' => 'schvalovatel_id', 'label' => 'Schvalovatel']
                    ]
                ]
            ];
            
        case 'usek':
            // Načti všechny uživatele v úseku
            $stmt = $db->prepare("
                SELECT id, jmeno, prijmeni, email
                FROM 25_uzivatele
                WHERE usek_id = ?
                AND aktivni = 1
            ");
            $stmt->execute([$nodeId]);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'status' => 'success',
                'data' => [
                    'nodeType' => 'usek',
                    'availableUsers' => $users,
                    'allUseky' => getAllUseky($db)
                ]
            ];
            
        case 'user':
            return [
                'status' => 'success',
                'data' => [
                    'nodeType' => 'user',
                    'message' => 'Konkrétní uživatel - scope není potřeba'
                ]
            ];
    }
}
```

### **2. UPDATE: notificationRouter()**

```php
function notificationRouter($db, $eventType, $entityType, $entityId, $entityData) {
    // 1. Načti aktivní org hierarchy profil
    $profile = getActiveHierarchyProfile($db);
    $structure = json_decode($profile['structure_json'], true);
    
    // 2. Najdi všechny EDGES které mají tento eventType
    $matchingEdges = [];
    foreach ($structure['edges'] as $edge) {
        if (in_array($eventType, $edge['data']['eventTypes'])) {
            $matchingEdges[] = $edge;
        }
    }
    
    // 3. Pro každý EDGE vyhodnoť příjemce
    $allRecipients = [];
    foreach ($matchingEdges as $edge) {
        // Načti SOURCE node (template)
        $sourceNode = findNodeById($structure['nodes'], $edge['source']);
        
        // Načti TARGET node
        $targetNode = findNodeById($structure['nodes'], $edge['target']);
        
        // Urči prioritu
        $priority = determinePriority($edge, $entityData);
        
        // Vyhodnoť příjemce podle TARGET NODE scope
        $recipients = resolveTargetNodeRecipients($db, $targetNode, $entityType, $entityId, $entityData);
        
        foreach ($recipients as $recipient) {
            $allRecipients[] = [
                'userId' => $recipient['id'],
                'templateId' => $sourceNode['data']['templateId'],
                'priority' => $priority,
                'delivery' => $targetNode['data']['delivery']
            ];
        }
    }
    
    // 4. Deduplikace (vyšší priorita vyhrává)
    $uniqueRecipients = deduplicateRecipients($allRecipients);
    
    // 5. Pošli notifikace
    foreach ($uniqueRecipients as $recipient) {
        sendNotification($db, $recipient);
    }
}

function resolveTargetNodeRecipients($db, $targetNode, $entityType, $entityId, $entityData) {
    $scope = $targetNode['data']['scopeDefinition'];
    
    switch ($scope['type']) {
        case 'ALL':
            // Všem v roli/úseku
            return getAllUsersInTarget($db, $targetNode);
            
        case 'SELECTED':
            // Jen vybraným
            return getUsersByIds($db, $scope['selectedIds']);
            
        case 'DYNAMIC_FROM_ENTITY':
            // Načti z entity
            $field = $scope['field']; // 'prikazce_id'
            $userId = $entityData[$field];
            return [$db->query("SELECT * FROM 25_uzivatele WHERE id = $userId")->fetch()];
    }
}

function determinePriority($edge, $entityData) {
    $priorityConfig = $edge['data']['priority'];
    
    if ($priorityConfig === 'AUTO') {
        // Automatická detekce
        $checkFields = $edge['data']['priorityAuto']['fields'];
        foreach ($checkFields as $field) {
            if (!empty($entityData[$field])) {
                return 'URGENT'; // Mimořádná událost
            }
        }
        return 'WARN'; // Běžná událost
    }
    
    return $priorityConfig; // WARN / URGENT / INFO
}
```

---

## 📝 IMPLEMENTAČNÍ PLÁN

### **FÁZE 1: Frontend (4h)**
- [ ] Dynamické dialogy podle node.typ
- [ ] TARGET NODE - Role detail
- [ ] TARGET NODE - Úsek detail  
- [ ] EDGE detail simplifikace
- [ ] SOURCE detail zkrácení

### **FÁZE 2: Backend (4h)**
- [ ] Endpoint: target-node/detail
- [ ] Update: notificationRouter()
- [ ] Funkce: resolveTargetNodeRecipients()
- [ ] Funkce: determinePriority()

### **FÁZE 3: DB Migrace (2h)**
- [ ] PHP script pro migraci JSON
- [ ] Backup stávajících dat
- [ ] Migrace structure_json
- [ ] Validace

### **FÁZE 4: Testy (2h)**
- [ ] Unit testy BE funkcí
- [ ] End-to-end test notifikací
- [ ] Multi-edge deduplikace test

**CELKEM: ~12 hodin**

---

## ✅ ROZHODNUTÍ

**Status:** ✅ SCHVÁLENO k implementaci

**Příští kroky:**
1. Implementovat Frontend změny
2. Implementovat Backend endpointy
3. DB migrace
4. Testování

**Připraveno k realizaci!** 🚀

---

## 📋 PROBLÉM SOUČASNÉHO STAVU

### Současná architektura (DUPLICITNÍ):

```
┌─────────────────────────────────┐
│  NODE (Template)                │
│  "Šablona pro Schvalovatele"    │◄── ❌ Redundantní: Komu?
│                                 │
│  🟠 BĚŽNÉ případy               │◄── ❌ Redundantní: Priorita?
│  🔴 URGENTNÍ případy            │
│  🟢 INFORMAČNÍ zprávy           │
└─────────────────────────────────┘
         │
         │ [EDGE]
         │ - Priorita: NORMAL       ◄── ❌ Duplicita!
         │ - Event Types: [...]
         ▼
┌─────────────────────────────────┐
│  TARGET NODE                    │
│  Role "Schvalovatel"             │◄── ❌ Duplicita!
└─────────────────────────────────┘
```

**PROBLÉMY:**
1. ❌ **DUPLICITA:** "Schvalovatel" je definován v NODE i TARGET
2. ❌ **ZMATEK:** Priorita (BĚŽNÉ/URGENTNÍ) je v NODE i EDGE
3. ❌ **RIGIDITA:** Nelze poslat 2 různé priority stejné roli
4. ❌ **ŠPATNÁ SEMANTIKA:** Template node je pojmenovaný podle příjemce, ne podle obsahu

---

## ✅ NOVÁ ARCHITEKTURA (ČISTÁ)

### Princip: **1 concern = 1 layer**

```
┌─────────────────────────────────────────┐
│  NODE (Template)                        │
│  📧 "Změna stavu objednávky"            │◄── ✅ Jen OBSAH!
│                                         │
│  Varianty (volitelné):                  │
│  ├─ 🟡 WARNING (standardní)             │◄── ✅ Jen DESIGN!
│  ├─ 🔴 URGENT (urgentní obsah)          │
│  └─ 🟢 INFO (potvrzovací styl)          │
│                                         │
│  💡 Pokud 1 varianta → pro všechny      │
└─────────────────────────────────────────┘
         │
         │ [EDGE #1]
         │ ├─ Komu: Role "Příkazce"         ◄── ✅ KDO
         │ ├─ Kdy: ORDER_PENDING_APPROVAL   ◄── ✅ KDY
         │ ├─ Jak: Jen účastníci entity     ◄── ✅ JAK
         │ └─ Priorita: URGENT               ◄── ✅ JAKÁ VARIANTA
         ▼
┌─────────────────────────────────────────┐
│  TARGET NODE                            │
│  🎭 Role "Příkazce"                     │◄── ✅ Jen TYP
│                                         │
│  Doručení:                              │◄── ✅ Jen MEDIUM
│  ├─ 📧 Email: ✅                        │
│  ├─ 🔔 In-app: ✅                       │
│  └─ 📱 SMS: ❌                          │
└─────────────────────────────────────────┘
```

**MOŽNOST MULTI-EDGE:**
```
Template "Změna stavu"
    │
    ├─[EDGE #1: Příkazce + URGENT + ORDER_PENDING_APPROVAL]──► Role "Příkazce"
    │
    ├─[EDGE #2: Příkazce + INFO + ORDER_APPROVED]────────────► Role "Příkazce"
    │
    └─[EDGE #3: Skladník + WARNING + ORDER_SENT_TO_SUPPLIER]─► Role "Skladník"
```

---

## 🎯 VÝHODY NOVÉ ARCHITEKTURY

### 1. **Čistá separace concerns**
- **NODE** = Co říká notifikace (obsah, design)
- **EDGE** = Komu, kdy, jak, s jakou prioritou
- **TARGET** = Kdo je příjemce, jak doručit

### 2. **Flexibilita**
- ✅ Jedna šablona pro **více rolí**
- ✅ Stejná role s **různými prioritami** (INFO + URGENT)
- ✅ Různé scope filtry pro stejnou šablonu

### 3. **Škálovatelnost**
- ✅ Přidání nové role = jen nový edge
- ✅ Změna textu = edit template (nezasáhne routing)
- ✅ Změna routingu = edit edge (nezasáhne template)

### 4. **Deduplikace**
Backend automaticky:
```javascript
// Uživatel splňuje podmínky 2 edges:
Edge #1: Role "Příkazce" → URGENT
Edge #2: Role "Manažer" → INFO

// Backend vyhodnotí:
if (user.má_obě_role) {
  // Pošli jen tu s vyšší prioritou
  send(user, template, variant='URGENT')
}
```

### 5. **Intuitivní UX**
```
Uživatel:
"Chci poslat urgentní notifikaci příkazcům při ORDER_PENDING_APPROVAL"

Postup:
1. Klikni na template → vyber/vytvoř URGENT variantu
2. Táhni šipku z template na "Role Příkazce"
3. Na šipce nastav:
   - Event: ORDER_PENDING_APPROVAL
   - Priorita: URGENT
   - Scope: Jen účastníci entity

✅ HOTOVO!
```

---

## 📊 SROVNÁNÍ PŘED/PO

| Aspekt | PŘED (duplicitní) | PO (čistá separace) |
|--------|-------------------|---------------------|
| **NODE název** | "Šablona pro Schvalovatele" | "Změna stavu objednávky" |
| **NODE obsah** | 3 selecty (BĚŽNÉ/URGENT/INFO) + "komu" | 3 HTML varianty (WARNING/URGENT/INFO) |
| **EDGE definuje** | Priorita (duplicita!) | Komu + Kdy + Jak + Priorita |
| **TARGET určuje** | Role (duplicita!) | Role + Doručení (email/app) |
| **Flexibilita** | 1 template = 1 role | 1 template = N rolí/priorit |
| **Multi-priority** | ❌ Nelze | ✅ Ano (více edges) |

---

## 🔧 IMPLEMENTACE

### **FÁZE 1: Frontend refaktor (2-3 hodiny)**

#### A) NODE (Template) Detail Panel

**PŘED:**
```javascript
<FormGroup>
  <Label>🟠 Barva emailu pro BĚŽNÉ případy</Label>
  <select value={templateNormalVariant}>
    <option>Příjemce (oranžová - normální)</option>
  </select>
</FormGroup>

<FormGroup>
  <Label>🔴 Barva emailu pro URGENTNÍ případy</Label>
  ...
</FormGroup>

<FormGroup>
  <Label>🟢 Barva emailu pro INFORMAČNÍ zprávy</Label>
  ...
</FormGroup>
```

**PO:**
```javascript
<h3>📧 Varianty šablony</h3>
<p>Definujte různé verze emailu pro různé priority:</p>

<FormGroup>
  <Label>🟡 WARNING varianta</Label>
  <select value={templateWarningVariant}>
    <option value="RECIPIENT">📧 Standardní obsah</option>
    <option value="SUBMITTER">✅ Potvrzovací styl</option>
  </select>
  <small>Použije se při prioritě WARNING na edge</small>
</FormGroup>

<FormGroup>
  <Label>🔴 URGENT varianta</Label>
  <select value={templateUrgentVariant}>
    <option value="RECIPIENT">🚨 Urgentní obsah</option>
  </select>
  <small>Použije se při prioritě URGENT na edge</small>
</FormGroup>

<FormGroup>
  <Label>🟢 INFO varianta</Label>
  <select value={templateInfoVariant}>
    <option value="SUBMITTER">✅ Potvrzení</option>
  </select>
  <small>Použije se při prioritě INFO na edge</small>
</FormGroup>

<InfoBox>
💡 Pokud má šablona jen 1 variantu, použije se pro všechny priority
</InfoBox>
```

**ZMĚNY:**
- ❌ Odstranit zmínky o "Schvalovatel", "Autor objednávky"
- ✅ Změnit labels: "BĚŽNÉ/URGENTNÍ/INFORMAČNÍ" → "WARNING/URGENT/INFO"
- ✅ Přidat vysvětlení že to je VARIANTA, ne příjemce

#### B) EDGE Detail Panel

**PŘED:**
```javascript
<Label>📊 Priorita notifikace pro příjemce</Label>
<Select>
  <option value="EXCEPTIONAL">🚨 EXCEPTIONAL</option>
  <option value="APPROVAL">📧 NORMAL</option>
  <option value="INFO">✅ SUBMITTER</option>
</Select>

<small>Backend použije RECIPIENT variantu s urgentním obsahem</small>
```

**PO:**
```javascript
<Label>⚡ Která varianta šablony se použije?</Label>
<Select value={edgePriority}>
  <option value="URGENT">🔴 URGENT - urgentní varianta</option>
  <option value="WARNING">🟡 WARNING - standardní varianta</option>
  <option value="INFO">🟢 INFO - informační varianta</option>
</Select>

<InfoBox>
💡 Backend vybere odpovídající variantu z template node
Pokud šablona nemá danou variantu, použije se defaultní
</InfoBox>

<FormGroup>
  <Label>👤 Komu poslat</Label>
  <p>Target: <strong>{targetNode.label}</strong></p>
</FormGroup>

<FormGroup>
  <Label>📅 Kdy poslat (Event Types)</Label>
  <MultiSelect value={edgeEventTypes}>
    <option>ORDER_PENDING_APPROVAL</option>
    <option>ORDER_APPROVED</option>
    ...
  </MultiSelect>
</FormGroup>

<FormGroup>
  <Label>🎯 Scope Filter</Label>
  <Select value={edgeScopeFilter}>
    <option>Všichni daného typu</option>
    <option>Jen účastníci entity</option>
    ...
  </Select>
</FormGroup>
```

**ZMĚNY:**
- ✅ Přejmenovat "Priorita" → "Která varianta"
- ✅ WARNING/URGENT/INFO místo EXCEPTIONAL/NORMAL/SUBMITTER
- ✅ Zdůraznit že se vybírá VARIANTA šablony
- ✅ Event Types na EDGE (ne jen zděděno)

#### C) TARGET NODE Detail

**PŘIDAT:**
```javascript
<h3>📬 Způsob doručení</h3>

<FormGroup>
  <Label>
    <Checkbox checked={deliveryEmail} />
    📧 Email
  </Label>
</FormGroup>

<FormGroup>
  <Label>
    <Checkbox checked={deliveryInApp} />
    🔔 In-app notifikace (zvonek)
  </Label>
</FormGroup>

<FormGroup>
  <Label>
    <Checkbox checked={deliverySMS} disabled />
    📱 SMS (zatím nepodporováno)
  </Label>
</FormGroup>

<InfoBox>
💡 Pokud není zaškrtnuto nic, použije se defaultní nastavení
</InfoBox>
```

---

### **FÁZE 2: Backend refaktor (3-4 hodiny)**

#### A) Deduplikace při multi-match

**Nová funkce v `notificationHandlers.php`:**

```php
/**
 * Deduplikace příjemců když splňují více org hierarchy rules
 * 
 * @param array $matches - [
 *   ['userId' => 123, 'priority' => 'URGENT', 'templateVariant' => 'RECIPIENT'],
 *   ['userId' => 123, 'priority' => 'INFO', 'templateVariant' => 'SUBMITTER']
 * ]
 * @return array - deduplikovaný seznam
 */
function deduplicateRecipients($matches) {
    $grouped = [];
    
    foreach ($matches as $match) {
        $userId = $match['userId'];
        
        if (!isset($grouped[$userId])) {
            $grouped[$userId] = $match;
        } else {
            // Vyber vyšší prioritu
            $priorityOrder = ['URGENT' => 3, 'WARNING' => 2, 'INFO' => 1];
            $currentPriority = $priorityOrder[$grouped[$userId]['priority']];
            $newPriority = $priorityOrder[$match['priority']];
            
            if ($newPriority > $currentPriority) {
                $grouped[$userId] = $match;
            }
        }
    }
    
    return array_values($grouped);
}
```

#### B) Multi-edge processing

```php
// Při spuštění notifikace (např. ORDER_PENDING_APPROVAL)
$eventType = 'ORDER_PENDING_APPROVAL';
$orderId = 142;

// 1. Najdi všechny edges které mají tento event type
$matchingEdges = findEdgesByEventType($eventType);

// 2. Pro každý edge vyhodnoť příjemce
$allRecipients = [];
foreach ($matchingEdges as $edge) {
    $recipients = resolveEdgeRecipients($edge, $orderId);
    $allRecipients = array_merge($allRecipients, $recipients);
}

// 3. Deduplikuj
$uniqueRecipients = deduplicateRecipients($allRecipients);

// 4. Pošli notifikace
foreach ($uniqueRecipients as $recipient) {
    sendNotification(
        userId: $recipient['userId'],
        templateId: $edge['templateId'],
        variant: $recipient['templateVariant'], // 'RECIPIENT' nebo 'SUBMITTER'
        priority: $recipient['priority'] // 'URGENT', 'WARNING', 'INFO'
    );
}
```

---

### **FÁZE 3: Databáze změny (1 hodina)**

**Tabulka `25_hierarchie_edges` (nebo jak se jmenuje):**

```sql
ALTER TABLE 25_hierarchie_edges 
ADD COLUMN priority ENUM('URGENT', 'WARNING', 'INFO') DEFAULT 'WARNING'
COMMENT 'Která varianta šablony se použije';

-- Migrace stávajících dat:
UPDATE 25_hierarchie_edges 
SET priority = CASE 
    WHEN recipient_role = 'EXCEPTIONAL' THEN 'URGENT'
    WHEN recipient_role = 'APPROVAL' THEN 'WARNING'
    WHEN recipient_role = 'INFO' THEN 'INFO'
    ELSE 'WARNING'
END;

-- Přidat event_types do edge (pokud ještě není):
ALTER TABLE 25_hierarchie_edges
ADD COLUMN event_types JSON DEFAULT NULL
COMMENT 'Event types které aktivují tento edge';
```

**Tabulka `25_hierarchie_nodes` (template nodes):**

```sql
-- Přejmenovat sloupce pro varianty:
ALTER TABLE 25_hierarchie_nodes
CHANGE template_normal_variant template_warning_variant VARCHAR(50),
CHANGE template_urgent_variant template_urgent_variant VARCHAR(50),
CHANGE template_info_variant template_info_variant VARCHAR(50);

-- Migrace hodnot:
UPDATE 25_hierarchie_nodes
SET 
    template_warning_variant = COALESCE(template_normal_variant, 'RECIPIENT'),
    template_urgent_variant = COALESCE(template_urgent_variant, 'RECIPIENT'),
    template_info_variant = COALESCE(template_info_variant, 'SUBMITTER');
```

---

### **FÁZE 4: Migrace stávajících dat (30 min)**

```sql
-- Přejmenovat template nodes:
UPDATE 25_hierarchie_nodes
SET label = REPLACE(label, 'Šablona pro Schvalovatele', 'Schválení objednávky')
WHERE type = 'template' AND label LIKE '%Schvalovatel%';

UPDATE 25_hierarchie_nodes
SET label = REPLACE(label, 'Šablona pro Autora', 'Potvrzení akce')
WHERE type = 'template' AND label LIKE '%Autor%';
```

---

## 📝 DOKUMENTACE ZMĚN

### Pro uživatele:

**CHANGELOG.md:**
```markdown
## [1.96] - 2026-01-03

### 🎯 MAJOR: Org Hierarchy Architecture Refactor

**BREAKING CHANGE:** Změna logiky notifikačních šablon

**PŘED:**
- Template node byl pojmenovaný podle příjemce ("Schvalovatel")
- 3 selecty pro výběr barev (oranžová/červená/zelená)
- Priorita definována duplicitně v NODE i EDGE

**PO:**
- Template node popisuje OBSAH notifikace
- 3 varianty podle PRIORITY (WARNING/URGENT/INFO)
- Edge definuje KOMU, KDY a S JAKOU PRIORITOU
- Možnost poslat stejnou šablonu více rolím s různými prioritami
- Automatická deduplikace při multi-match

**VÝHODY:**
✅ Čistší separace concerns
✅ Větší flexibilita (1 šablona = N rolí)
✅ Možnost multi-priority pro stejnou roli
✅ Intuitivnější UX

**MIGRACE:**
Stávající org hierarchy profily byly automaticky migrovány.
Zkontrolujte si nastavení v Org Hierarchy editoru.
```

---

## 🗓️ IMPLEMENTAČNÍ PLÁN

### **Sprint 1 (4 hodiny):**
- [ ] Frontend: NODE detail panel refaktor
- [ ] Frontend: EDGE detail panel refaktor
- [ ] Frontend: TARGET node - přidat doručení
- [ ] Git checkpoint

### **Sprint 2 (4 hodiny):**
- [ ] Backend: Deduplikace logika
- [ ] Backend: Multi-edge processing
- [ ] Backend: Varianta selection dle priority
- [ ] Testy: Unit testy pro deduplikaci

### **Sprint 3 (2 hodiny):**
- [ ] Databáze: Alter tables
- [ ] Databáze: Migrace stávajících dat
- [ ] Dokumentace: CHANGELOG
- [ ] Dokumentace: User guide update

### **Sprint 4 (2 hodiny):**
- [ ] End-to-end testy
- [ ] UX testy s reálnými uživateli
- [ ] Bug fixes
- [ ] Deploy na TEST

**CELKEM: ~12 hodin práce**

---

## ⚠️ RIZIKA A MITIGACE

### Riziko 1: Breaking change pro stávající profily
**Mitigace:** Automatická migrace + user notification

### Riziko 2: Složitost deduplikace
**Mitigace:** Důkladné unit testy + edge cases

### Riziko 3: UX confusion během migrace
**Mitigace:** Tooltip "📘 Nový systém!" + link na dokumentaci

---

## 🎓 BUDOUCÍ ROZŠÍŘENÍ

### Fáze 2 (později):
1. **Multiple Org Hierarchies:**
   - Org Hierarchy #1: Notifikace
   - Org Hierarchy #2: Oprávnění (viditelnost objednávek)
   - Org Hierarchy #3: Workflow (schvalování)

2. **Advanced Deduplikation:**
   - Time-based (poslat urgentní, po 2h info)
   - Digest mode (seskupit více notifikací)

3. **Delivery Channels:**
   - SMS integrace
   - Slack/Teams webhooks
   - Push notifications (mobile app)

---

## ✅ ROZHODNUTÍ

**Status:** 💡 AWAITING APPROVAL

**Otázky k diskusi:**
1. Souhlasíte s touto architekturou?
2. Je naming správný? (WARNING/URGENT/INFO vs jiné?)
3. Priorita implementace? (hned / po deadline)
4. Chybí něco v návrhu?

**Připraveno k implementaci po schválení!** 🚀

---

**Autor:** GitHub Copilot  
**Datum:** 2026-01-03  
**Verze:** 1.0 (draft)
