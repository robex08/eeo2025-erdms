# 🔍 Analýza: Organizační hierarchie a notifikační triggery

**Datum:** 3. ledna 2026  
**Problém:** Node/Edge triggery neodpovídají správně status order/invoice triggerům

---

## 🎯 Identifikované problémy

### 1. **NESOULAD V NÁZVECH EVENT TYPŮ**

#### Backend (PHP - notificationHandlers.php)
Backend používá **ČESKÉ názvy** s prefixem `order_status_`:
- `order_status_ke_schvaleni`
- `order_status_schvalena`
- `order_status_zamitnuta`
- `order_status_ceka_se`
- `order_status_odeslana`
- `order_status_potvrzena`
- `order_status_dokoncena`

#### Frontend Organization Hierarchy (OrganizationHierarchy.js)
Frontend načítá event types z BE API `/notifications/event-types/list`, které TAKÉ používají české názvy:
- `order_status_ke_schvaleni`
- `order_status_schvalena`
- atd.

✅ **SOULAD** - FE i BE používají stejné názvy

---

### 2. **CHYBĚJÍCÍ MAPOVÁNÍ V EDGE KONFIGURACI**

#### Problém v Edge Data struktuře:

```javascript
// EDGE má tyto properties:
edge.data = {
  // ✅ SPRÁVNĚ: Generic Recipient System
  recipient_type: 'USER' | 'ROLE' | 'GROUP' | 'TRIGGER_USER' | 'ENTITY_AUTHOR' | ...
  scope_filter: 'NONE' | 'ALL' | 'LOCATION' | 'PARTICIPANTS_ALL' | 'PARTICIPANTS_OBJEDNATEL' | ...
  sendEmail: true/false,
  sendInApp: true/false,
  recipientRole: 'EXCEPTIONAL' | 'APPROVAL' | 'INFO',
  
  // ❌ CHYBÍ: Vazba na konkrétní event types!
  // Edge by měla obsahovat pole eventTypes (podobně jako Template NODE)
  notifications: {
    types: [] // <--- TOTO JE PRÁZDNÉ!
  },
  
  // ✅ SPRÁVNĚ: Source INFO recipients
  source_info_recipients: {
    enabled: true,
    fields: ['uzivatel_id', 'garant_uzivatel_id', 'objednatel_id']
  }
}
```

---

### 3. **TEMPLATE NODE vs EDGE CONFUSION**

#### Současný stav:
- **TEMPLATE NODE** má `eventTypes: []` - určuje PRO KTERÉ UDÁLOSTI se použije
- **EDGE** má `notifications.types: []` - ale NENÍ JASNÉ, k čemu to slouží

#### Správné řešení:
- **TEMPLATE NODE** definuje ŠABLONU (email text, app text, varianty)
- **EDGE** definuje PŘÍJEMCE pro konkrétní event types

---

## 🛠️ Návrh řešení

### Krok 1: Sjednotit strukturu EDGE dat

```javascript
// EDGE by měla mít tuto strukturu:
edge.data = {
  // ═══════════════════════════════════════════════════════════
  // GENERIC RECIPIENT SYSTEM
  // ═══════════════════════════════════════════════════════════
  recipient_type: 'USER' | 'ROLE' | 'GROUP' | 'ENTITY_AUTHOR' | 'ENTITY_APPROVER' | ...,
  scope_filter: 'NONE' | 'ALL' | 'PARTICIPANTS_ALL' | 'PARTICIPANTS_OBJEDNATEL' | ...,
  
  // ═══════════════════════════════════════════════════════════
  // NOTIFICATION DELIVERY CONFIG
  // ═══════════════════════════════════════════════════════════
  sendEmail: true/false,
  sendInApp: true/false,
  recipientRole: 'EXCEPTIONAL' | 'APPROVAL' | 'INFO',
  
  // ═══════════════════════════════════════════════════════════
  // SOURCE INFO RECIPIENTS (pro tvůrce notifikace)
  // ═══════════════════════════════════════════════════════════
  source_info_recipients: {
    enabled: true,
    fields: ['uzivatel_id', 'garant_uzivatel_id', 'objednatel_id']
  },
  
  // ═══════════════════════════════════════════════════════════
  // 🆕 NOVÉ: Vazba na event types z parent TEMPLATE NODE
  // ═══════════════════════════════════════════════════════════
  // POZOR: Edge NEDEFINUJE svoje vlastní event types!
  // Event types jsou definovány v SOURCE (TEMPLATE) NODE
  // Edge jen říká "pro tyto příjemce z target node"
}
```

---

### Krok 2: Backend logika (PHP - již implementováno ✅)

Backend funkce `findNotificationRecipients()` již správně:

1. Hledá **TEMPLATE nodes** s daným `eventType`
2. Pro každý matching template hledá **EDGES** vedoucí z tohoto template
3. Pro každý edge:
   - Resolvuje příjemce podle `recipient_type` a `scope_filter`
   - Aplikuje `sendEmail`, `sendInApp`, `recipientRole`
   - Přidá source INFO recipients podle konfigurace

✅ **Backend je správně**

---

### Krok 3: Frontend - Oprava UI (organizationHierarchy.js)

#### Problém: Edge detail panel má zbytečné pole "Notifikační typy"

```javascript
// ❌ ŠPATNĚ: Edge nemá svoje vlastní event types
<DetailSection title="📧 Notifikační události" collapsible defaultOpen={true}>
  <FormGroup>
    <Label>Události (event types):</Label>
    <CustomSelect
      options={notificationEventTypes}
      value={selectedNotificationEventTypes}
      onChange={setSelectedNotificationEventTypes}
      // ...
    />
  </FormGroup>
</DetailSection>

// ✅ SPRÁVNĚ: Zobrazit event types z parent TEMPLATE NODE (read-only)
// Edge detail panel by měl jen říct:
// "Tento vztah doručuje notifikace pro události definované v šabloně: 'Objednávka ke schválení'"
```

---

### Krok 4: Frontend - Zjednodušit UI

#### Nový layout Edge detail panelu:

```
┌─────────────────────────────────────────────────┐
│ 📧 Notifikační nastavení                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ ℹ️ Tento vztah doručuje notifikace pro:         │
│    Šablona: "Objednávka ke schválení"          │
│    Události: order_status_ke_schvaleni         │
│                                                 │
│ ══════════════════════════════════════════════ │
│                                                 │
│ 🎯 Kdo dostane notifikace:                      │
│    Typ příjemce: [Uživatel ▼]                  │
│    Scope filtr: [Všichni účastníci ▼]          │
│                                                 │
│ ══════════════════════════════════════════════ │
│                                                 │
│ 📨 Doručení:                                    │
│    ☑ Odeslat email                             │
│    ☑ Zobrazit v aplikaci                       │
│                                                 │
│ ══════════════════════════════════════════════ │
│                                                 │
│ 🎨 Priorita pro příjemce:                       │
│    Recipient role: [Ke schválení ▼]            │
│                                                 │
│ ══════════════════════════════════════════════ │
│                                                 │
│ 👥 Informovat také tvůrce:                      │
│    ☑ Povolit                                    │
│    Pole: [☑ Objednatel  ☑ Garant  ☑ Autor]    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📋 Konkrétní úkoly pro opravu

### 1. ✅ Backend - Již hotovo
- `findNotificationRecipients()` správně hledá template nodes podle eventType
- Správně aplikuje edge konfiguraci (recipient_type, scope_filter, sendEmail, sendInApp, recipientRole)

### 2. ❌ Frontend - Nutné opravy

#### A) Odstranit zbytečné pole z Edge detail panelu:
**Soubor:** `apps/eeo-v2/client/src/pages/OrganizationHierarchy.js`

```javascript
// ODSTRANIT tuto sekci z Edge detail panelu (cca řádek 5500-5600):
{selectedEdge && selectedEdge.metadata?.sourceType === 'template' && (
  <DetailSection title="📧 Notifikační události" collapsible defaultOpen={true}>
    <FormGroup>
      <Label>Události (event types):</Label>
      <CustomSelect
        options={notificationEventTypes}
        value={selectedNotificationEventTypes}
        onChange={setSelectedNotificationEventTypes}
        // ... ODSTRANIT
      />
    </FormGroup>
  </DetailSection>
)}
```

#### B) Přidat read-only zobrazení event types z parent template:

```javascript
// PŘIDAT místo odstraněné sekce:
{selectedEdge && selectedEdge.metadata?.sourceType === 'template' && (
  <DetailSection title="📧 Informace o šabloně" collapsible defaultOpen={true}>
    {(() => {
      // Najít source template node
      const templateNode = nodes.find(n => n.id === selectedEdge.source);
      const templateName = templateNode?.data?.name || 'Neznámá šablona';
      const templateEvents = templateNode?.data?.eventTypes || [];
      
      return (
        <>
          <InfoBox>
            <strong>Šablona:</strong> {templateName}
          </InfoBox>
          
          {templateEvents.length > 0 && (
            <InfoBox>
              <strong>Události:</strong>
              <ul style={{margin: '0.5rem 0', paddingLeft: '1.5rem'}}>
                {templateEvents.map(evt => (
                  <li key={evt}>{evt}</li>
                ))}
              </ul>
            </InfoBox>
          )}
          
          {templateEvents.length === 0 && (
            <WarningBox>
              ⚠️ Šablona nemá přiřazené žádné události. 
              Otevřete detail šablony a vyberte události.
            </WarningBox>
          )}
        </>
      );
    })()}
  </DetailSection>
)}
```

---

## 🎯 Výsledek po opravě

### Workflow:

1. **Uživatel vytvoří TEMPLATE NODE:**
   - Vybere notification template z DB (email text, app text)
   - Přiřadí **event types** (např. `order_status_ke_schvaleni`)
   - Nastaví varianty (normal, urgent, info)

2. **Uživatel vytvoří EDGE z template k příjemci:**
   - Vybere **recipient type** (USER, ROLE, ENTITY_AUTHOR, ...)
   - Nastaví **scope filter** (ALL, PARTICIPANTS_ALL, ...)
   - Zapne/vypne **email** a **in-app**
   - Vybere **recipient role** (EXCEPTIONAL, APPROVAL, INFO)
   - Nakonfiguruje **source info recipients**

3. **Backend při eventu `order_status_ke_schvaleni`:**
   - Najde všechny TEMPLATE nodes s tímto event typem
   - Pro každý template najde všechny EDGES
   - Pro každý edge:
     - Resolvuje příjemce (např. "všichni s rolí APPROVER")
     - Aplikuje scope filter (např. "jen účastníci této objednávky")
     - Odešle podle sendEmail/sendInApp
     - Použije správnou variantu podle recipientRole

---

## 🔐 Testovací scénář

### Příklad: Objednávka ke schválení

1. **Setup v org hierarchii:**
   ```
   [TEMPLATE: Objednávka ke schválení]
       eventTypes: ['order_status_ke_schvaleni']
       normalVariant: 'APPROVER_NORMAL'
       urgentVariant: 'APPROVER_URGENT'
       infoVariant: 'SUBMITTER'
       |
       | EDGE 1: → [ROLE: Příkazce]
       |   recipient_type: ROLE
       |   scope_filter: PARTICIPANTS_OBJEDNATEL
       |   recipientRole: APPROVAL
       |   sendEmail: true
       |   sendInApp: true
       |
       | EDGE 2: → [Tvůrce objednávky]
       |   recipient_type: ENTITY_AUTHOR
       |   scope_filter: NONE
       |   recipientRole: INFO
       |   sendEmail: false
       |   sendInApp: true
   ```

2. **Trigger:**
   ```javascript
   // OrderForm25.js při uložení objednávky
   await triggerNotification(
     'order_status_ke_schvaleni',
     orderId,
     user_id,
     { 
       order_number: 'O-2026-001',
       order_subject: 'Nákup kancelářských potřeb'
     }
   );
   ```

3. **Backend zpracování:**
   - Najde TEMPLATE s `order_status_ke_schvaleni`
   - EDGE 1: Najde všechny příkazce → filtruje jen ty, kteří jsou objednatel TÉTO objednávky → pošle APPROVAL notifikaci
   - EDGE 2: Najde tvůrce objednávky → pošle INFO notifikaci

---

## ✅ Checklist pro dokončení

- [ ] **1. Odstranit** `selectedNotificationEventTypes` state z Edge detail panelu
- [ ] **2. Přidat** read-only zobrazení event types z parent template NODE
- [ ] **3. Upravit** auto-save effect - EDGE už nebude ukládat svoje vlastní event types
- [ ] **4. Validace** - Zabránit vytvoření EDGE z template, pokud template nemá event types
- [ ] **5. Dokumentace** - Aktualizovat help modal s vysvětlením workflow
- [ ] **6. Test** - Vytvořit testovací hierarchii a ověřit funkčnost

---

## 📚 Související soubory

### Frontend:
- `apps/eeo-v2/client/src/pages/OrganizationHierarchy.js` - Hlavní UI
- `apps/eeo-v2/client/src/services/notificationsApi.js` - API volání
- `apps/eeo-v2/client/src/forms/OrderForm25.js` - Trigger notifikací

### Backend:
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php` - Logika routování
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php` - Načítání struktury

---

**Autor:** AI Development Assistant  
**Status:** 🔴 Requires immediate fix
