# 🏗️ NÁVRH: Refaktoring architektury notifikačního systému

**Datum:** 3. ledna 2026  
**Autor:** Analýza systému + návrh zlepšení  
**Status:** 📋 PROPOSAL - čeká na schválení

---

## 🎯 Shrnutí problému

### Současný stav je **LOGICKY NEKONZISTENTNÍ** a **ZAVÁDĚJÍCÍ**:

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ SOUČASNÁ ARCHITEKTURA (MATOUCÍ)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NODE (Template)                                                │
│  ├─ name: "Schvalovatel" ← ROLE PŘÍJEMCE! (zavádějící)         │
│  ├─ normalVariant: "APPROVER_NORMAL"                            │
│  ├─ urgentVariant: "APPROVER_URGENT"                            │
│  ├─ infoVariant: "SUBMITTER"                                    │
│  └─ eventTypes: ["order_status_schvalena"]                      │
│                                                                  │
│  EDGE                                                            │
│  ├─ recipient_type: "ROLE" ← KDO TO DOSTANE                    │
│  ├─ scope_filter: "PARTICIPANTS_ALL"                            │
│  ├─ recipientRole: "APPROVAL" ← URČUJE VARIANTU                │
│  ├─ sendEmail: true                                             │
│  └─ sendInApp: true                                             │
│                                                                  │
│  PROBLÉM:                                                        │
│  - NODE název říká "Schvalovatel" ale to je ROLE příjemce!     │
│  - EDGE určuje recipient_type → není jasné KDO má JAK dostat    │
│  - Varianty (NORMAL/URGENT/INFO) jsou vázané na NODE            │
│  - recipientRole na EDGE určuje variantu → duplicitní logika    │
│  - Není možné poslat JEDNOMU uživateli více variant             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### **KLÍČOVÝ PROBLÉM:**
- Když je uživatel **PŘÍKAZCE (garant)** → měl by dostat **INFO** variantu
- Když je uživatel **SCHVALOVATEL** → měl by dostat **APPROVAL** variantu
- Ale org hierarchie říká: "Tento template jde na SCHVALOVATELE"
- A pak na EDGE říkáme: "recipientRole=APPROVAL"

**=> Není jasná separace zodpovědností!**

---

## ✅ NAVRŽENÁ ARCHITEKTURA (LOGICKÁ A FLEXIBILNÍ)

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ NOVÁ ARCHITEKTURA (JASNÁ SEPARACE)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NODE (Notification Definition)                                 │
│  ├─ name: "Objednávka schválena" ← ČÍM TO JE, NE KOMU          │
│  ├─ eventTypes: ["order_status_schvalena"]                      │
│  │                                                              │
│  ├─ variants:                                                   │
│  │   ├─ WARNING:                                               │
│  │   │   ├─ templateId: 123                                    │
│  │   │   ├─ name: "Schválení - kritická urgentní"             │
│  │   │   ├─ priority: "critical"                               │
│  │   │   └─ color: "#ef4444" (červená)                         │
│  │   │                                                          │
│  │   ├─ URGENT:                                                │
│  │   │   ├─ templateId: 124                                    │
│  │   │   ├─ name: "Schválení - urgentní"                      │
│  │   │   ├─ priority: "urgent"                                 │
│  │   │   └─ color: "#f59e0b" (oranžová)                        │
│  │   │                                                          │
│  │   └─ INFO:                                                  │
│  │       ├─ templateId: 125                                    │
│  │       ├─ name: "Schválení - informační"                    │
│  │       ├─ priority: "info"                                   │
│  │       └─ color: "#10b981" (zelená)                          │
│  │                                                              │
│  └─ description: "Notifikace když je objednávka schválena"     │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                  │
│  EDGE (Recipient Rules)                                         │
│  ├─ recipient_type: "ENTITY_APPROVER" ← KDO                    │
│  ├─ scope_filter: "PARTICIPANTS_ALL"  ← FILTR                  │
│  ├─ variant: "WARNING" ← JAKOU VARIANTU POSLAT                 │
│  ├─ sendEmail: true                                             │
│  ├─ sendInApp: true                                             │
│  └─ conditions:                                                 │
│      ├─ amount_gte: 50000 ← Pokud částka >= 50k               │
│      └─ lp_required: true  ← Pokud vyžaduje LP                 │
│                                                                  │
│  EDGE (jiné pravidlo - stejný NODE!)                            │
│  ├─ recipient_type: "ENTITY_GUARANTOR" ← KDO                   │
│  ├─ scope_filter: "SAME_LOCATION"                               │
│  ├─ variant: "INFO" ← INFO pro garanta                         │
│  ├─ sendEmail: true                                             │
│  └─ sendInApp: true                                             │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                  │
│  TARGET NODE (User Preferences)                                 │
│  ├─ email: true/false  ← JEN PREFERENCE DORUČENÍ               │
│  ├─ inApp: true/false                                           │
│  ├─ category_filters:                                           │
│  │   ├─ orders: true                                            │
│  │   ├─ invoices: true                                          │
│  │   └─ pokladna: false                                         │
│  └─ (ŽÁDNÁ DEFINICE ŠABLON - jen preference uživatele)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Detailní popis změn

### 1. **NODE = Definice notifikace** (ČÍM TO JE)

#### Účel:
- Definuje **obsah** notifikace
- Obsahuje **všechny varianty** (WARNING, URGENT, INFO)
- Bez ohledu na to, KDO to dostane

#### Struktura:
```json
{
  "id": "node-123",
  "typ": "template",
  "data": {
    "name": "Objednávka schválena",
    "eventTypes": ["order_status_schvalena"],
    "description": "Notifikace při schválení objednávky",
    
    "variants": {
      "WARNING": {
        "templateId": 123,
        "name": "Schválení - kritická urgentní",
        "priority": "critical",
        "color": "#ef4444",
        "icon": "⚠️",
        "htmlVariant": "APPROVER_URGENT"
      },
      "URGENT": {
        "templateId": 124,
        "name": "Schválení - urgentní",
        "priority": "urgent",
        "color": "#f59e0b",
        "icon": "🔶",
        "htmlVariant": "APPROVER_NORMAL"
      },
      "INFO": {
        "templateId": 125,
        "name": "Schválení - informační",
        "priority": "info",
        "color": "#10b981",
        "icon": "ℹ️",
        "htmlVariant": "SUBMITTER"
      }
    },
    
    "defaultVariant": "INFO"
  }
}
```

#### Výhody:
✅ Jasný název: "Objednávka schválena" - říká O ČEM to je  
✅ Všechny varianty na jednom místě  
✅ Můžu mít jen jednu variantu (INFO) nebo všechny tři  
✅ Flexibilní - můžu přidat další varianty (např. CONFIDENTIAL)

---

### 2. **EDGE = Pravidla příjemců** (KOMU A JAK)

#### Účel:
- Určuje **KDO** to dostane
- Určuje **JAKOU VARIANTU** dostane
- Definuje **PODMÍNKY** (částka, LP, úsek, atd.)
- Nastavuje **ZPŮSOB DORUČENÍ** (email, inApp)

#### Struktura:
```json
{
  "id": "edge-456",
  "source": "node-123",
  "target": "node-role-schvalovatel",
  "data": {
    "recipient_type": "ENTITY_APPROVER",
    "scope_filter": "PARTICIPANTS_ALL",
    
    "variant": "WARNING",
    
    "sendEmail": true,
    "sendInApp": true,
    
    "conditions": {
      "amount_gte": 50000,
      "lp_required": true,
      "financovani_typ": ["LP", "Grant"]
    },
    
    "source_info_recipients": {
      "enabled": false
    }
  }
}
```

#### Příklad více EDGE pro stejný NODE:
```json
// EDGE 1: Schvalovatelé - WARNING (kritická urgentní)
{
  "source": "node-schvalena",
  "target": "node-role-schvalovatel",
  "variant": "WARNING",
  "conditions": { "amount_gte": 100000 }
}

// EDGE 2: Schvalovatelé - URGENT (urgentní)
{
  "source": "node-schvalena",
  "target": "node-role-schvalovatel",
  "variant": "URGENT",
  "conditions": { "amount_gte": 50000, "amount_lt": 100000 }
}

// EDGE 3: Garant - INFO (zelená)
{
  "source": "node-schvalena",
  "target": "node-entity-garant",
  "variant": "INFO"
}

// EDGE 4: Objednatel - INFO (zelená)
{
  "source": "node-schvalena",
  "target": "node-entity-objednatel",
  "variant": "INFO"
}
```

#### Výhody:
✅ Jasná separace: EDGE určuje KDO + JAKOU variantu  
✅ Flexibilita: Můžu poslat WARNING schvalovatelům, INFO garantům  
✅ Podmínky: Podle částky, LP, atd.  
✅ Možnost poslat VÍCE variant JEDNOMU uživateli (WARNING + INFO)

---

### 3. **TARGET NODE = Preference uživatele** (JAK DORUČIT)

#### Účel:
- **JEN** preference doručení (email vs inApp)
- Žádné definice šablon!
- Možná filtry kategorií (orders, invoices, pokladna)

#### Struktura:
```json
{
  "id": "node-user-123",
  "typ": "user",
  "data": {
    "userId": 123,
    "name": "Jan Novák",
    
    "preferences": {
      "email": true,
      "inApp": true,
      
      "category_filters": {
        "orders": true,
        "invoices": true,
        "pokladna": false
      }
    }
  }
}
```

#### Výhody:
✅ Jednoduché - jen preference  
✅ Žádná duplicitní logika

---

## 🔄 Deduplikace v novém systému

### Současné chování:
```php
// Deduplikační klíč: user_id + event_type
$dedupKey = $recipient['uzivatel_id'] . '|' . $eventType;

// Pokud user dostane 2 notifikace pro stejný event → odstraní duplicitu
// Ale vezme první, ne tu s vyšší prioritou!
```

### ✅ NOVÉ chování:
```php
// Deduplikace by SE NEMĚLA dělat automaticky!
// Protože můžu CHTÍT poslat WARNING + INFO stejnému uživateli

// Příklad:
// User je SCHVALOVATEL → dostane WARNING (červená)
// User je GARANT → dostane INFO (zelená)
// => Má dostat OBĚ notifikace!

// DEDUPLIKACE by měla být jen pokud:
// - Stejný user_id
// - Stejný event_type
// - Stejná VARIANTA
// => To už JE duplicita

$dedupKey = $recipient['uzivatel_id'] . '|' . $eventType . '|' . $variant;
```

---

## 📊 Příklady použití

### Příklad 1: Schválení objednávky

#### Scénář:
- Objednávka č. 2026/001 je schválena
- Částka: 75 000 Kč
- Garant: Jan Novák (user_id=5)
- Schvalovatel: Marie Svobodová (user_id=8)
- Objednatel: Petr Dvořák (user_id=12)

#### Co se stane:

1. **Org hierarchie najde NODE "Objednávka schválena"**
   - Event type: `order_status_schvalena` ✅

2. **Najde 3 EDGE vedoucí z tohoto NODE:**

   **EDGE 1:**
   ```json
   {
     "recipient_type": "ENTITY_APPROVER",
     "variant": "URGENT",
     "conditions": { "amount_gte": 50000 }
   }
   ```
   - Najde schvalovatele: Marie Svobodová (8)
   - Podmínka splněna: 75k >= 50k ✅
   - Pošle: **URGENT** (oranžová)

   **EDGE 2:**
   ```json
   {
     "recipient_type": "ENTITY_GUARANTOR",
     "variant": "INFO"
   }
   ```
   - Najde garanta: Jan Novák (5)
   - Pošle: **INFO** (zelená)

   **EDGE 3:**
   ```json
   {
     "recipient_type": "ENTITY_OBJEDNATEL",
     "variant": "INFO"
   }
   ```
   - Najde objednatele: Petr Dvořák (12)
   - Pošle: **INFO** (zelená)

#### Výsledek:
- Marie Svobodová (8) → **URGENT** (oranžová) - je schvalovatel
- Jan Novák (5) → **INFO** (zelená) - je garant
- Petr Dvořák (12) → **INFO** (zelená) - je objednatel

✅ **KAŽDÝ DOSTAL SPRÁVNOU VARIANTU!**

---

### Příklad 2: Uživatel má více rolí

#### Scénář:
- Objednávka č. 2026/002 je schválena
- Částka: 120 000 Kč
- Garant: Jan Novák (user_id=5)
- Schvalovatel: **TAKÉ Jan Novák (user_id=5)** ← STEJNÝ UŽIVATEL!
- Objednatel: Petr Dvořák (user_id=12)

#### Co se stane:

1. **EDGE 1 (schvalovatel):**
   - Najde Jana Nováka (5) jako schvalovatele
   - Podmínka: 120k >= 100k → **WARNING** (červená)

2. **EDGE 2 (garant):**
   - Najde Jana Nováka (5) jako garanta
   - → **INFO** (zelená)

#### Bez deduplikace:
- Jan Novák (5) → **WARNING** (červená) + **INFO** (zelená) - DVĚ notifikace ✅

#### S deduplikací (nová logika):
```php
$dedupKey = "5|order_status_schvalena|WARNING"; // První
$dedupKey = "5|order_status_schvalena|INFO";    // Druhá (jiná varianta!)

// => OBĚ projdou! Protože jsou RŮZNÉ VARIANTY
```

✅ **Jan dostane OBĚ notifikace - červenou jako schvalovatel, zelenou jako garant**

---

## 🛠️ Implementace

### Fáze 1: Databázová struktura (1-2 dny)

#### Změna tabulky `25_notifikace_hierarchie_profily`:

**NODE structure_json:**
```json
{
  "nodes": [
    {
      "id": "node-1",
      "typ": "template",
      "data": {
        "name": "Objednávka schválena",
        "eventTypes": ["order_status_schvalena"],
        "variants": {
          "WARNING": { "templateId": 123, ... },
          "URGENT": { "templateId": 124, ... },
          "INFO": { "templateId": 125, ... }
        },
        "defaultVariant": "INFO"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-role-schvalovatel",
      "data": {
        "recipient_type": "ENTITY_APPROVER",
        "variant": "WARNING",
        "conditions": { "amount_gte": 100000 },
        "sendEmail": true,
        "sendInApp": true
      }
    }
  ]
}
```

---

### Fáze 2: Backend logika (2-3 dny)

#### Změna `notificationHandlers.php`:

**PŘED:**
```php
// Určit variantu podle recipientRole
if ($recipientRole === 'EXCEPTIONAL') {
    $variant = $node['data']['urgentVariant'];
} elseif ($recipientRole === 'INFO') {
    $variant = $node['data']['infoVariant'];
} else {
    $variant = $node['data']['normalVariant'];
}
```

**PO:**
```php
// Varianta je definována na EDGE!
$variantKey = isset($edge['data']['variant']) ? $edge['data']['variant'] : 'INFO';

// Načíst šablonu z NODE variants
$variantConfig = isset($node['data']['variants'][$variantKey]) 
    ? $node['data']['variants'][$variantKey] 
    : $node['data']['variants'][$node['data']['defaultVariant']];

$templateId = $variantConfig['templateId'];
$htmlVariant = $variantConfig['htmlVariant'];
$priority = $variantConfig['priority'];
```

**Deduplikace:**
```php
// NOVÝ deduplikační klíč: user_id + event_type + VARIANTA
$dedupKey = $recipient['uzivatel_id'] . '|' . $eventType . '|' . $variantKey;

// Pokud je STEJNÁ varianta pro STEJNÉHO uživatele → duplicita
// Pokud je JINÁ varianta → NECHAT OBĚ!
```

---

### Fáze 3: Frontend UI (3-4 dny)

#### Změna `OrganizationHierarchy.js`:

**Template NODE editor:**
```jsx
<div className="node-variants">
  <h4>Varianty notifikace</h4>
  
  <VariantEditor
    label="⚠️ WARNING (Kritická urgentní)"
    variant="WARNING"
    templateId={warningTemplateId}
    onTemplateSelect={(id) => setWarningTemplateId(id)}
    color="#ef4444"
  />
  
  <VariantEditor
    label="🔶 URGENT (Urgentní)"
    variant="URGENT"
    templateId={urgentTemplateId}
    onTemplateSelect={(id) => setUrgentTemplateId(id)}
    color="#f59e0b"
  />
  
  <VariantEditor
    label="ℹ️ INFO (Informační)"
    variant="INFO"
    templateId={infoTemplateId}
    onTemplateSelect={(id) => setInfoTemplateId(id)}
    color="#10b981"
  />
</div>
```

**EDGE editor:**
```jsx
<div className="edge-variant-selector">
  <label>Jakou variantu poslat?</label>
  <select value={edgeVariant} onChange={e => setEdgeVariant(e.target.value)}>
    <option value="WARNING">⚠️ WARNING (Kritická)</option>
    <option value="URGENT">🔶 URGENT (Urgentní)</option>
    <option value="INFO">ℹ️ INFO (Informační)</option>
  </select>
</div>

<div className="edge-conditions">
  <h4>Podmínky (volitelné)</h4>
  <input 
    type="number" 
    placeholder="Minimální částka"
    value={minAmount}
    onChange={e => setMinAmount(e.target.value)}
  />
</div>
```

---

### Fáze 4: Migrace dat (1 den)

#### SQL skript:
```sql
-- Migrovat existující NODE strukturu
UPDATE 25_notifikace_hierarchie_profily
SET structure_json = JSON_SET(
  structure_json,
  '$.nodes[*].data.variants',
  JSON_OBJECT(
    'INFO', JSON_OBJECT(
      'templateId', JSON_EXTRACT(structure_json, '$.nodes[*].data.templateId'),
      'htmlVariant', JSON_EXTRACT(structure_json, '$.nodes[*].data.normalVariant'),
      'priority', 'info',
      'color', '#10b981'
    )
  )
)
WHERE aktivni = 1;
```

---

### Fáze 5: Testování (2 dny)

#### Test scénáře:
1. Vytvořit NODE s 3 variantami (WARNING, URGENT, INFO)
2. Vytvořit 3 EDGE:
   - EDGE 1: Schvalovatel → WARNING
   - EDGE 2: Garant → INFO
   - EDGE 3: Objednatel → INFO
3. Schválit objednávku kde user je GARANT + SCHVALOVATEL
4. Ověřit: User dostane 2 notifikace (WARNING + INFO)

---

## 📈 Výhody nového systému

### 1. **Logická separace zodpovědností**
- NODE = ČÍM TO JE (definice notifikace)
- EDGE = KOMU + JAK (pravidla příjemců)
- TARGET NODE = Preference uživatele

### 2. **Flexibilita**
- Můžu mít jednu variantu nebo více
- Můžu poslat více variant jednomu uživateli
- Podmínky na EDGE (částka, LP, atd.)

### 3. **Přehlednost**
- Název NODE říká O ČEM to je: "Objednávka schválena"
- Ne "Schvalovatel" (což je ROLE, ne notifikace)

### 4. **Správná deduplikace**
- Deduplikace podle: user_id + event_type + **VARIANTA**
- Umožňuje poslat WARNING + INFO stejnému uživateli

### 5. **Připravenost do budoucna**
- Org hierarchie pro NOTIFIKACE
- Org hierarchie pro OPRÁVNĚNÍ (viditelnost objednávek, faktur)
- Separace = jasné použití

---

## ⚠️ Rizika a obavy

### 1. **Velkost změny**
- ⚠️ Velký refactoring backendu + frontendu
- ⚠️ Migrace dat
- ⚠️ Testování

### 2. **Zpětná kompatibilita**
- ⚠️ Existující hierarchie musí fungovat
- ✅ Můžeme migrovat automaticky
- ✅ Fallback na defaultVariant pokud není definováno

### 3. **Uživatelská zkušenost**
- ⚠️ Admini musí pochopit nový systém
- ✅ Lepší UI s jasnými sekcemi WARNING/URGENT/INFO
- ✅ Dokumentace + manuál

---

## 📝 TODO Plán

### ✅ Krok 1: Analýza a návrh (HOTOVO)
- [x] Analyzovat současný stav
- [x] Identifikovat problémy
- [x] Navrhnout novou architekturu
- [x] Sepsat dokumentaci

### 🔲 Krok 2: Schválení (čeká na rozhodnutí)
- [ ] Review návrhu
- [ ] Diskuse o rizicích
- [ ] Rozhodnutí: GO / NO-GO / UPRAVIT

### 🔲 Krok 3: Implementace (čeká na GO)
- [ ] **Fáze 1:** Databázová struktura (1-2 dny)
- [ ] **Fáze 2:** Backend logika (2-3 dny)
- [ ] **Fáze 3:** Frontend UI (3-4 dny)
- [ ] **Fáze 4:** Migrace dat (1 den)
- [ ] **Fáze 5:** Testování (2 dny)

**Celková doba:** ~10-12 dní práce

---

## 🎯 Rozhodnutí

### Otázky k zodpovězení:
1. ✅ Souhlasíš s tímto návrhem?
2. ❓ Jsou nějaké obavy / rizika?
3. ❓ Chceš něco změnit / upravit?
4. ❓ Můžeme začít implementovat?

### Možné varianty:
- **A) GO** - Začneme implementovat podle návrhu
- **B) UPRAVIT** - Upravit nějakou část návrhu
- **C) NO-GO** - Zůstat u současného řešení (s opravami)

---

**Status:** 📋 WAITING FOR DECISION

