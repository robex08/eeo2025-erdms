# PROPOSAL: Org Hierarchy Architecture Refactor
## Přechod na čistou separaci concerns: Template → Edge → Recipient

**Datum:** 2026-01-03  
**Status:** 💡 PROPOSAL (čeká na schválení)  
**Priorita:** HIGH (zásadní zlepšení UX a logiky)

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
