# Rozšíření Recipient Roles - Autor a Garant

## 📋 Požadavek

Dle zadání by měli notifikace dostávat nejen schvalovatelé, ale také:
- **Autor objednávky** (user_id=100) - INFO notifikace "Odesláno ke schválení"
- **Garant objednávky** - INFO notifikace

## 🎯 Aktuální Stav

**Implementované role:**
```javascript
// V organizational hierarchy:
EXCEPTIONAL: { role: 'EXCEPTIONAL', priority: 'urgent' },   // Výjimečná priorita
APPROVAL: { role: 'APPROVAL', priority: 'high' },           // Ke schválení
INFO: { role: 'INFO', priority: 'normal' }                  // Informativní
```

**Co chybí:**
- Recipient role pro **AUTHOR** (autor objednávky)
- Recipient role pro **GUARANTOR** (garant objednávky)
- Filter checkbox: "Pouze pro autora objednávky"
- Filter checkbox: "Pouze pro garanta objednávky"

## 📐 Návrh Implementace

### 1. **Rozšíření Recipient Roles v DB**

Aktuálně v `25_hierarchie_vztahy`:
```sql
recipient_role ENUM('EXCEPTIONAL', 'APPROVAL', 'INFO')
```

**Návrh rozšíření:**
```sql
ALTER TABLE 25_hierarchie_vztahy 
MODIFY COLUMN recipient_role ENUM(
  'EXCEPTIONAL',    -- Urgentní notifikace (červená)
  'APPROVAL',       -- Ke schválení (oranžová)
  'INFO',           -- Informativní (modrá)
  'AUTHOR_INFO',    -- Pro autora objednávky (modrá)
  'GUARANTOR_INFO'  -- Pro garanta objednávky (modrá)
) NOT NULL;
```

### 2. **Frontend - Organizational Hierarchy Editor**

**Přidat checkboxy pro targetNode config:**

```javascript
// V OrganizationHierarchy.js - EdgeConfigPanel
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

**Edge data struktura:**
```json
{
  "source": "template_node_id",
  "target": "user_node_id",
  "data": {
    "notifications": {
      "sendInApp": true,
      "sendEmail": false,
      "recipientRole": "AUTHOR_INFO"  // ← NOVÁ HODNOTA
    },
    "onlyOrderAuthor": true,  // ← NOVÝ CHECKBOX
    "onlyOrderGuarantor": false
  }
}
```

### 3. **Backend - findNotificationRecipients()**

**Rozšířit logiku filtrování v notificationHandlers.php:**

```php
// V cyklu přes edges (kolem řádku 1789):
$onlyParticipants = isset($edge['data']['onlyOrderParticipants']) ? $edge['data']['onlyOrderParticipants'] : false;
$onlyAuthor = isset($edge['data']['onlyOrderAuthor']) ? $edge['data']['onlyOrderAuthor'] : false;
$onlyGuarantor = isset($edge['data']['onlyOrderGuarantor']) ? $edge['data']['onlyOrderGuarantor'] : false;

// ... existující kontrola onlyParticipants ...

// NOVÁ KONTROLA: Pouze autor objednávky
if ($onlyAuthor) {
    // Načti autora z DB
    $stmt = $db->prepare("SELECT uzivatel_id FROM " . TABLE_OBJEDNAVKY . " WHERE id = :order_id");
    $stmt->execute([':order_id' => $objectId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order || $targetNode['data']['user_id'] != $order['uzivatel_id']) {
        error_log("      ⏩ SKIP - Checkbox 'onlyAuthor' aktivní, ale target není autor");
        continue; // Přeskoč tento edge
    }
    error_log("      ✅ MATCH - Target je AUTOR objednávky!");
}

// NOVÁ KONTROLA: Pouze garant objednávky
if ($onlyGuarantor) {
    // Načti garanta z DB
    $stmt = $db->prepare("SELECT garant_id FROM " . TABLE_OBJEDNAVKY . " WHERE id = :order_id");
    $stmt->execute([':order_id' => $objectId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order || !$order['garant_id'] || $targetNode['data']['user_id'] != $order['garant_id']) {
        error_log("      ⏩ SKIP - Checkbox 'onlyGuarantor' aktivní, ale target není garant");
        continue; // Přeskoč tento edge
    }
    error_log("      ✅ MATCH - Target je GARANT objednávky!");
}
```

### 4. **Mapping priorit**

```php
// V notificationRouter() kolem řádku 1600:
function mapRecipientRoleToPriority($recipientRole) {
    switch ($recipientRole) {
        case 'EXCEPTIONAL':
            return 'EXCEPTIONAL';  // Urgentní
        case 'APPROVAL':
            return 'APPROVAL';     // Ke schválení
        case 'INFO':
        case 'AUTHOR_INFO':        // ← NOVÉ
        case 'GUARANTOR_INFO':     // ← NOVÉ
            return 'INFO';         // Informativní
        default:
            return 'INFO';
    }
}
```

### 5. **Příklad Konfigurace v Hierarchii**

**Schválení objednávky - 3 příjemci:**

```
[Template: order_status_ke_schvaleni]
    ↓ APPROVAL (sendInApp=true, sendEmail=true)
    → [User: Jan Schvalovatel #1]
    
    ↓ AUTHOR_INFO (sendInApp=true, sendEmail=false, onlyAuthor=true)
    → [Group: Všichni uživatelé]  // Ale filtr vybere pouze autora!
    
    ↓ GUARANTOR_INFO (sendInApp=true, sendEmail=true, onlyGuarantor=true)
    → [Group: Všichni uživatelé]  // Ale filtr vybere pouze garanta!
```

**Výsledek:**
- **Jan Schvalovatel #1** dostane APPROVAL notifikaci (email + in-app)
- **Autor (user_id=100)** dostane AUTHOR_INFO notifikaci (in-app only)
- **Garant** dostane GUARANTOR_INFO notifikaci (email + in-app)

## 📊 SQL Migrace

```sql
-- 1. Rozšířit ENUM pro recipient_role
ALTER TABLE 25_hierarchie_vztahy 
MODIFY COLUMN recipient_role ENUM(
  'EXCEPTIONAL',
  'APPROVAL', 
  'INFO',
  'AUTHOR_INFO',
  'GUARANTOR_INFO'
) NOT NULL;

-- 2. Přidat sloupce pro filtry (OPTIONAL - můžeme ukládat do edge_data_json)
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN only_order_author TINYINT(1) DEFAULT 0 AFTER recipient_role,
ADD COLUMN only_order_guarantor TINYINT(1) DEFAULT 0 AFTER only_order_author;

-- 3. Verifikace
SELECT recipient_role, COUNT(*) as count 
FROM 25_hierarchie_vztahy 
GROUP BY recipient_role;
```

## ✅ Výhody Tohoto Řešení

1. **Konzistentní s existující architekturou** - používá stejný pattern jako `onlyOrderParticipants`
2. **Flexibilní** - v hierarchii můžete nastavit různé varianty (email/in-app, template variant)
3. **Auditovatelné** - všechny notifikace mají `data_json` s `recipient_role`
4. **Škálovatelné** - snadno přidat další role (ORDER_CREATOR, ORDER_OBSERVER atd.)

## 🔧 Kroky Nasazení

1. ✅ Provést SQL migraci (rozšířit ENUM)
2. ⏳ Upravit frontend checkboxy v OrganizationHierarchy.js
3. ⏳ Rozšířit backend findNotificationRecipients() o filtry
4. ⏳ Vytvořit template s edges pro autora a garanta v org-hierarchy
5. ⏳ Otestovat vytvoření objednávky a schválení

## 📝 Poznámky

- **AUTHOR_INFO** a **GUARANTOR_INFO** mají stejnou prioritu jako INFO (normal/modrá)
- Rozdíl je v **recipient_role** - umožňuje filtrovat a analyzovat kdo dostal jakou notifikaci
- Checkboxy `onlyAuthor`/`onlyGuarantor` jsou **dynamické filtry** - stejný edge může být použit pro různé objednávky (vždy vybere správného autora/garanta)

## 🎯 User Story

**Jako** autor objednávky  
**Chci** dostat INFO notifikaci když moje objednávka byla odeslána ke schválení  
**Aby** jsem věděl, že proces pokračuje

**Jako** garant objednávky  
**Chci** dostat INFO notifikaci o všech změnách stavu objednávek mého střediska  
**Aby** jsem měl přehled o finančních závazcích
