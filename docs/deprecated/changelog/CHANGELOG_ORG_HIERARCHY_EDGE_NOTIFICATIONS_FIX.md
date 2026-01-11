# 🔧 Oprava frontend organizační hierarchie - EDGE notifikace

**Datum:** 2025-01-03  
**Status:** ✅ IMPLEMENTOVÁNO

---

## 📋 Problém

**EDGE** (spojení mezi TEMPLATE → Recipient) měl **redundantní pole** `notifications.types`, které způsobovalo:
- ❌ Zmatení uživatelů - nevěděli zda EDGE definuje vlastní události nebo dědí z TEMPLATE
- ❌ Duplicitu dat - stejné event types uložené na dvou místech
- ❌ Riziko nesouladu - EDGE mohl mít jiné události než jeho parent TEMPLATE
- ❌ Chybnou logiku - backend `findNotificationRecipients()` hledá events POUZE v TEMPLATE, EDGE events ignoruje

---

## ✅ Řešení

### 1. **Odstraněna redundantní state proměnná**

```javascript
// ❌ PŘED (řádek 1590):
const [selectedNotificationEventTypes, setSelectedNotificationEventTypes] = useState([]);

// ✅ PO:
// ❌ selectedNotificationEventTypes ODSTRANĚNO - EDGE dědí event types z parent TEMPLATE NODE
```

### 2. **Upraven auto-save useEffect**

```javascript
// ❌ PŘED (řádek 1709):
notifications: {
  ...(e.data?.notifications || {}),
  types: selectedNotificationEventTypes // ❌ Ukládalo vlastní events
}

// ✅ PO:
notifications: {
  ...(e.data?.notifications || {})
  // types: ODSTRANĚNO - nepotřebujeme ukládat, parent template je source of truth
}
```

### 3. **Odstraněno načítání edge.data.notifications.types**

```javascript
// ❌ PŘED (řádek 2387):
setSelectedNotificationEventTypes(edge.data?.notifications?.types || []);

// ✅ PO:
// ❌ selectedNotificationEventTypes ODSTRANĚNO - EDGE dědí event types z parent TEMPLATE NODE
```

### 4. **Nahrazen editable select za read-only info box**

**PŘED:** Uživatel mohl editovat event types přímo na EDGE (matoucí!)

**PO:** Zobrazuje se **read-only info box** s:
- 📋 Event types zděděnými z parent TEMPLATE
- 🔒 Zamčený stav (nelze editovat na EDGE)
- 💡 Nápověda jak změnit (upravit parent template)
- ⚠️ Warning pokud parent template nemá žádné events

**Implementace (řádky 7600-7670):**

```javascript
{/* ✅ Event Types - READ-ONLY zobrazení zděděných z parent TEMPLATE */}
<FormGroup style={{ marginBottom: '16px' }}>
  <Label>
    Typy událostí (Event Types)
    <span style={{ color: '#3b82f6', marginLeft: '4px', fontWeight: 'normal', fontSize: '0.75rem' }}>
      🔒 zděděno z šablony
    </span>
  </Label>
  {(() => {
    // Získat parent TEMPLATE node
    const sourceNode = nodes.find(n => n.id === selectedEdge?.source);
    const parentEventTypes = sourceNode?.data?.eventTypes || [];
    
    if (parentEventTypes.length === 0) {
      return (
        <div style={{
          padding: '12px',
          background: '#fef2f2',
          border: '2px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '0.875rem',
          lineHeight: '1.5'
        }}>
          ⚠️ <strong>Šablona nemá definované žádné události!</strong><br/>
          Pro aktivaci tohoto spojení musíte nejprve nastavit event types 
          u zdrojové šablony <strong>{sourceNode?.data?.label || 'Neznámá'}</strong>.
        </div>
      );
    }
    
    return (
      <div style={{
        padding: '12px',
        background: '#f0f9ff',
        border: '2px solid #93c5fd',
        borderRadius: '8px'
      }}>
        <div style={{ marginBottom: '8px', color: '#1e40af', fontWeight: '600', fontSize: '0.875rem' }}>
          📋 Události ze šablony "{sourceNode?.data?.label || 'Neznámá'}":
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {parentEventTypes.map((eventCode, idx) => {
            // Najít plný název události
            const eventDetail = notificationEventTypes.find(et => 
              (et.kod || et.code) === eventCode
            );
            return (
              <div key={idx} style={{
                padding: '6px 12px',
                background: '#dbeafe',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                color: '#1e40af',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {eventDetail?.nazev || eventDetail?.name || eventCode}
              </div>
            );
          })}
        </div>
        <div style={{ 
          marginTop: '10px',
          fontSize: '0.7rem', 
          color: '#64748b',
          lineHeight: '1.4'
        }}>
          💡 <strong>Tyto události aktivují notifikaci pro příjemce na konci tohoto spojení.</strong><br/>
          Pro změnu událostí upravte zdrojovou šablonu (klikněte na uzel šablony).
        </div>
      </div>
    );
  })()}
</FormGroup>
```

### 5. **Přidána validace při vytváření EDGE**

**Nová validace v `onConnect` callback (řádek 2264):**

```javascript
// ✅ VALIDACE: Pokud source je TEMPLATE, zkontrolovat zda má definované event types
if (sourceNode?.data?.type === 'template') {
  const hasEventTypes = sourceNode.data?.eventTypes && sourceNode.data.eventTypes.length > 0;
  
  if (!hasEventTypes) {
    // 🚫 ZAMÍTNOUT spojení - template nemá event types
    if (window.showToast) {
      window.showToast(
        `⚠️ Nelze vytvořit spojení!\n\n` +
        `Šablona "${sourceNode.data?.label || 'Neznámá'}" nemá definované žádné události (Event Types).\n\n` +
        `📝 Nejprve klikněte na šablonu a přidejte alespoň jednu událost v sekci "Typy událostí".`,
        { type: 'warning', timeout: 8000 }
      );
    } else {
      alert(
        `⚠️ Nelze vytvořit spojení!\n\n` +
        `Šablona "${sourceNode.data?.label || 'Neznámá'}" nemá definované žádné události (Event Types).\n\n` +
        `Nejprve klikněte na šablonu a přidejte alespoň jednu událost.`
      );
    }
    return; // ❌ Zrušit vytvoření edge
  }
}
```

---

## 🎯 Výhody řešení

### ✅ Konzistence dat
- **Single Source of Truth:** Event types jsou definované POUZE v TEMPLATE NODE
- **Žádné duplicity:** EDGE už neukládá vlastní kopii events
- **Automatická synchronizace:** Změna events v TEMPLATE se okamžitě projeví ve všech EDGE

### ✅ UX zlepšení
- **Jasná vizuální indikace:** Uživatel vidí 🔒 zámek a modrý box = read-only
- **Nápověda:** Jasně napsáno jak změnit events (upravit parent template)
- **Prevence chyb:** Validace zabrání vytvoření neaktivních spojení

### ✅ Backend kompatibilita
- **Správná logika:** Backend hledá events v TEMPLATE, EDGE events ignoruje
- **Žádné breaking changes:** Backend neočekával edge.data.notifications.types

---

## 📊 Statistiky změn

**Soubor:** `/apps/eeo-v2/client/src/pages/OrganizationHierarchy.js`

- **Odebrané řádky:** ~35 řádků (state, auto-save, načítání, editable select)
- **Přidané řádky:** ~70 řádků (read-only info box s kompletní logikou + validace)
- **Čistý rozdíl:** +35 řádků (lepší UX a validace)

**Změněné části:**
1. State definice (řádek ~1590)
2. Auto-save useEffect (řádek ~1709)
3. Edge selection handler (řádek ~2387)
4. Detail panel UI (řádek ~7600)
5. onConnect validace (řádek ~2264)

---

## 🧪 Testovací scénáře

### ✅ Scénář 1: EDGE s validním parent TEMPLATE
1. Vytvořit TEMPLATE node s definovanými event types
2. Připojit EDGE z TEMPLATE → USER/ROLE/LOCATION/DEPARTMENT
3. **Očekávaný výsledek:** 
   - ✅ Edge se vytvoří
   - ✅ V detailu edge zobrazí modrý box s events zděděnými z template
   - ✅ Events nejsou editovatelné

### ✅ Scénář 2: EDGE z TEMPLATE bez event types
1. Vytvořit TEMPLATE node BEZ definovaných event types
2. Pokusit se připojit EDGE z TEMPLATE → USER
3. **Očekávaný výsledek:**
   - ❌ Edge se NEVYTVOŘÍ
   - ⚠️ Zobrazí se toast/alert s varováním
   - 📝 Uživatel dostane instrukce jak opravit (přidat events do template)

### ✅ Scénář 3: EDGE existující z DB
1. Načíst hierarchii z DB s existujícími EDGE
2. Kliknout na EDGE detail
3. **Očekávaný výsledek:**
   - ✅ Zobrazí se read-only info box
   - ✅ Events zděděné z parent TEMPLATE (ne z edge.data)
   - ⚠️ Pokud parent nemá events, zobrazí se červený warning box

### ✅ Scénář 4: Změna events v TEMPLATE
1. Vytvořit TEMPLATE s events + EDGE
2. Změnit event types v TEMPLATE
3. Kliknout na EDGE detail
4. **Očekávaný výsledek:**
   - ✅ EDGE zobrazí AKTUALIZOVANÉ events z parent TEMPLATE
   - ✅ Změna se projeví okamžitě (bez reload)

---

## 🔄 Backend notifikační flow (BEZ ZMĚN)

Backend funkce `findNotificationRecipients()` funguje **SPRÁVNĚ** a **NEBYLO POTŘEBA MĚNIT**:

```php
function findNotificationRecipients($db, $eventType, $objectId, $triggerUserId, $placeholderData = []) {
    // 1️⃣ Hledá TEMPLATE nodes které mají tento eventType
    $stmt = $db->prepare("
        SELECT DISTINCT hp.id, hp.profil_kod, hp.profil_nazev, hp.data
        FROM 25_hierarchie_profily hp
        WHERE hp.typ = 'TEMPLATE'
        AND JSON_CONTAINS(hp.data->'$.eventTypes', ?)
    ");
    
    // 2️⃣ Pro každý matching TEMPLATE node, následuje EDGES
    foreach ($templateNodes as $template) {
        $edges = getEdgesFromTemplate($db, $template['id']);
        
        // 3️⃣ Resolve recipients z target nodes (USER, ROLE, LOCATION, DEPARTMENT)
        foreach ($edges as $edge) {
            $targetNode = getNodeById($db, $edge['target_id']);
            $recipients = resolveRecipients($db, $targetNode, ...);
            
            // 4️⃣ Apply EDGE config: scope_filter, sendEmail, sendInApp, recipientRole
            $filteredRecipients = applyScopeFilter($db, $recipients, $edge['scope_filter'], ...);
        }
    }
}
```

**Klíčové:**
- ✅ Backend hledá events POUZE v TEMPLATE node (`hp.data->'$.eventTypes'`)
- ✅ EDGE data obsahují POUZE: `scope_filter`, `sendEmail`, `sendInApp`, `recipientRole`
- ✅ EDGE **NIKDY** neměl events v backend logice!

---

## 📚 Související dokumentace

- [ANALYSIS_ORG_HIERARCHY_NOTIFICATION_TRIGGERS.md](ANALYSIS_ORG_HIERARCHY_NOTIFICATION_TRIGGERS.md) - Původní analýza problému
- [ANALYSIS_EVENT_NAMING_CONSISTENCY.md](ANALYSIS_EVENT_NAMING_CONSISTENCY.md) - Analýza konzistence názvů událostí
- [CHANGELOG_NOTIFICATION_TRIGGERS_FIX.md](CHANGELOG_NOTIFICATION_TRIGGERS_FIX.md) - Historie změn v notifikačním systému

---

## ✅ Závěr

**Problém:** EDGE měl redundantní `notifications.types` pole které matlo uživatele a neodpovídalo backend logice.

**Řešení:** 
1. ✅ Odstraněno redundantní pole
2. ✅ Přidáno read-only zobrazení zděděných events z parent TEMPLATE
3. ✅ Přidána validace při vytváření EDGE
4. ✅ Zlepšen UX s jasnou nápovědou

**Výsledek:** Konzistentní systém kde TEMPLATE = single source of truth pro event types, EDGE pouze přenáší notifikace k příjemcům s konfigurací (scope, email, inApp, role).

---

**Konec dokumentace**
