# 🔔 Architektura Notifikačního Systému - Návrh & Diskusní Dokument

**Datum:** 15. prosince 2025  
**Autor:** GitHub Copilot  
**Status:** DRAFT - K DISKUSI  
**Branch:** feature/orderform25-sprint1-cleanup

---

## 📋 Obsah

1. [Executive Summary](#executive-summary)
2. [Současný Stav](#současný-stav)
3. [Identifikované Problémy](#identifikované-problémy)
4. [Navrhovaná Architektura](#navrhovaná-architektura)
5. [Prioritizační Logika](#prioritizační-logika)
6. [Implementační Oblasti](#implementační-oblasti)
7. [Technické Otázky K Diskusi](#technické-otázky-k-diskusi)
8. [Roadmap & Fáze](#roadmap--fáze)

---

## 🎯 Executive Summary

### Cíl Dokumentu
Definovat komplexní notifikační systém, který:
- ✅ Respektuje globální nastavení systému
- ✅ Umožňuje personalizaci na úrovni uživatele
- ✅ Využívá hierarchii organizace pro cílení notifikací
- ✅ Podporuje email i in-app notifikace (🔔 zvonek)
- ✅ Je konzistentní napříč moduly (OrderForm, BackTask Manager, Mobile App)

### Klíčové Požadavky
1. **3-úrovňová prioritizace**: Global Settings → User Preferences → Hierarchy Rules
2. **Automatické vypnutí výchozích notifikací** při aktivaci hierarchy
3. **Jednotná logika** pro všechny typy událostí (objednávky, BT, alarmy, mobile)
4. **Podpora opt-out** - uživatel může odmítnout specifické typy notifikací

---

## 🔍 Současný Stav

### Implementované Komponenty

#### 1. **Notifikační Šablony** (✅ Hotovo)
- **Databáze:** `25_notification_templates` (8 šablon)
- **Fáze:**
  - Fáze 1: `order_status_schvalena`, `order_status_zamitnuta`, `order_status_ceka_se`
  - Fáze 2: `order_status_odeslana`, `order_status_potvrzena`
  - Fáze 3: `order_status_faktura_schvalena`
  - Fáze 4: `order_status_kontrola_potvrzena`, `order_status_kontrola_zamitnuta`
- **Varianty:** Každá šablona má 2 varianty (RECIPIENT + SUBMITTER)

#### 2. **Hierarchie Organizace** (✅ Implementováno)
- **Modul:** `OrganizationHierarchy.js`
- **Funkce:** 
  - Vizuální workflow builder
  - Výběr notifikačních šablon pro jednotlivé kroky
  - Parser variant (RECIPIENT, SUBMITTER, APPROVER_NORMAL, APPROVER_URGENT)
- **Backend:** 
  - `notificationTemplatesHandlers.php` (API)
  - `notificationHelpers.php` (zpracování šablon)

#### 3. **Testovací Panel** (✅ Hotovo)
- **Soubor:** `MailTestPanelV2.js`
- **Funkce:** 16 testovacích tlačítek pro všechny šablony × varianty

#### 4. **Výchozí Notifikace v Kódu** (⚠️ Legacy)
- **Umístění:** Pravděpodobně v `OrderForm` komponentě a backend handlers
- **Problém:** Hardcoded logika, nerespektuje hierarchii
- **Status:** Nutno identifikovat a refaktorovat

---

## ⚠️ Identifikované Problémy

### 1. **Kolize s Výchozími Notifikacemi**
**Problém:**  
Když je aktivována hierarchie, výchozí notifikace v kódu stále fungují → duplicitní notifikace

**Současné Chování:**
```javascript
// Někde v kódu (hypoteticky):
if (orderStatus === 'schvalena') {
  sendEmailToApprover(); // ❌ HARDCODED
}
```

**Očekávané Chování:**
```javascript
if (orderStatus === 'schvalena') {
  if (isHierarchyActive()) {
    sendNotificationViaHierarchy(); // ✅ Použije hierarchii
  } else {
    sendDefaultNotification(); // ✅ Fallback na výchozí
  }
}
```

### 2. **Chybějící Prioritizační Logika**
**Problém:**  
Není jasné, jak se kombinují:
- Globální nastavení (email/in-app zapnuto/vypnuto)
- Uživatelské preference (profil uživatele)
- Hierarchie (workflow pravidla)

**Příklad kolize:**
- Global: Email ENABLED, In-app ENABLED
- User: Chce jen in-app (email DISABLED)
- Hierarchy: Definuje email notifikaci
- **→ Co se stane?** 🤔

### 3. **ResizeObserver Error**
**Problém:**  
```
ResizeObserver loop completed with undelivered notifications.
```
Při mazání profilu hierarchie (pravděpodobně React re-render issue)

**Možné příčiny:**
- Nesprávná cleanup logika v useEffect
- Canvas/SVG resize během unmount
- State update během unmount

### 4. **Nekonzistentní Implementace Napříč Moduly**
- **OrderForm:** Notifikace při změně stavu objednávky
- **BackTask Manager:** Notifikace pro úkoly, alarmy, systémové zprávy
- **Mobile App:** Notifikace pro operace schválení

**Problém:** Každý modul může mít vlastní logiku → těžko udržovatelné

---

## 🏗️ Navrhovaná Architektura

### Principy Návrhu

1. **Single Source of Truth** - jeden centrální service pro rozhodování
2. **Separation of Concerns** - oddělení logiky rozhodování od odeslání
3. **Extensibility** - snadné přidání nových typů událostí
4. **Testability** - jasná pravidla, snadné unit testy
5. **Backward Compatibility** - funguje i bez hierarchie (fallback)

### Architektonické Vrstvy

```
┌─────────────────────────────────────────────────────────┐
│                    EVENT SOURCES                         │
│  OrderForm | BackTask Manager | Mobile App | Alarmy     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           NOTIFICATION DECISION ENGINE                   │
│  - Evaluates 3-level priority                           │
│  - Determines: WHO, WHEN, HOW                           │
│  - Returns: NotificationDecision[]                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           NOTIFICATION DISPATCHER                        │
│  - Email Service (SMTP)                                  │
│  - In-App Service (DB + WebSocket)                      │
│  - SMS Service (budoucnost?)                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎚️ Prioritizační Logika

### 3-úrovňová Kaskáda

```javascript
/**
 * Priority: Global → User → Hierarchy
 * 
 * Pravidla:
 * 1. Pokud Global DISABLED → stop, žádná notifikace
 * 2. Pokud User opt-out → respektuj to, i když hierarchy říká jinak
 * 3. Hierarchy určuje WHO (komu) a WHICH TEMPLATE (jakou šablonu)
 */

function shouldSendNotification(eventType, user, hierarchyProfile) {
  // LEVEL 1: Global Settings
  const globalSettings = getGlobalSettings();
  if (!globalSettings.notifications_enabled) {
    return { send: false, reason: 'Global notifications disabled' };
  }
  
  // LEVEL 2: User Preferences
  const userPrefs = getUserNotificationPreferences(user.id);
  const channels = determineChannels(globalSettings, userPrefs);
  
  if (channels.length === 0) {
    return { send: false, reason: 'User opted out of all channels' };
  }
  
  // LEVEL 3: Hierarchy Rules
  if (hierarchyProfile && hierarchyProfile.active) {
    const recipients = getRecipientsFromHierarchy(eventType, hierarchyProfile);
    return {
      send: true,
      recipients: recipients,
      channels: channels,
      template: hierarchyProfile.templates[eventType]
    };
  }
  
  // FALLBACK: Default Notifications
  return {
    send: true,
    recipients: getDefaultRecipients(eventType),
    channels: channels,
    template: getDefaultTemplate(eventType)
  };
}

function determineChannels(globalSettings, userPrefs) {
  const channels = [];
  
  // Email Channel
  if (globalSettings.email_enabled && userPrefs.email_enabled) {
    channels.push('email');
  }
  
  // In-App Channel
  if (globalSettings.inapp_enabled && userPrefs.inapp_enabled) {
    channels.push('inapp');
  }
  
  return channels;
}
```

### Rozhodovací Tabulka

| Global Email | Global In-App | User Email | User In-App | Hierarchy Email | Result          |
|--------------|---------------|------------|-------------|-----------------|-----------------|
| ✅ ON        | ✅ ON         | ✅ ON      | ✅ ON       | ✅ Defined      | Email + In-App  |
| ✅ ON        | ✅ ON         | ❌ OFF     | ✅ ON       | ✅ Defined      | In-App only     |
| ✅ ON        | ✅ ON         | ❌ OFF     | ❌ OFF      | ✅ Defined      | ❌ No notif.    |
| ❌ OFF       | ✅ ON         | ✅ ON      | ✅ ON       | ✅ Defined      | In-App only     |
| ❌ OFF       | ❌ OFF        | ✅ ON      | ✅ ON       | ✅ Defined      | ❌ No notif.    |
| ✅ ON        | ✅ ON         | ✅ ON      | ✅ ON       | ❌ Not defined  | Fallback logic  |

**Klíčové pravidlo:**  
🔴 **User preference je VETO** - pokud uživatel vypne kanál, hierarchie to nemůže přebít.

---

## 🎯 Notification Triggers - Centrální Správa Událostí

### Koncept: Notification Center

**Princip:**  
Všechny notifikace procházejí centrálním **Notification Center**, které:
1. Zachytí událost (trigger)
2. Předá Decision Engine
3. Decision Engine rozhodne WHO + HOW + WHEN
4. Dispatcher odešle notifikace

```
Event Source → Notification Center → Decision Engine → Dispatcher → Email/In-App
```

### Unified API

```javascript
// NotificationCenter.js
class NotificationCenter {
  
  /**
   * Hlavní metoda pro triggerování notifikací
   * @param {string} eventType - Typ události (order_status_schvalena, task_assigned, atd.)
   * @param {object} eventData - Data události (order_id, user_id, atd.)
   * @param {object} context - Kontext volání (source: 'web'/'mobile', user, atd.)
   */
  static async trigger(eventType, eventData, context = {}) {
    console.log(`📢 [NotificationCenter] Trigger: ${eventType}`, eventData);
    
    try {
      // Předej Decision Engine
      const decisions = await NotificationDecisionEngine.processEvent({
        eventType,
        eventData,
        context
      });
      
      console.log(`✅ [NotificationCenter] Processed: ${decisions.length} notifications`);
      return decisions;
      
    } catch (error) {
      console.error(`❌ [NotificationCenter] Error processing ${eventType}:`, error);
      // Logování, ale nehavaruj aplikaci
      return [];
    }
  }
}

export default NotificationCenter;
```

---

## 🛠️ Implementační Oblasti

### A) OrderForm - Notifikace při Změně Stavu

#### Trigger Points v Kódu

**1. Uložení objednávky KE SCHVÁLENÍ**

```javascript
// OrderForm.jsx (nebo backend handler)
const handleSaveOrder = async (formData) => {
  const oldStatus = currentOrder?.status;
  const newStatus = formData.status;
  
  // Uložení objednávky
  const savedOrder = await saveOrderAPI(formData);
  
  // ✅ TRIGGER: Notifikace POUZE při změně stavu
  if (oldStatus !== newStatus) {
    await NotificationCenter.trigger(
      `order_status_${newStatus}`, // eventType
      {
        order_id: savedOrder.id,
        order_number: savedOrder.cislo_obj,
        old_status: oldStatus,
        new_status: newStatus,
        author: currentUser,
        order_data: {
          nazev: savedOrder.nazev,
          celkova_castka: savedOrder.celkova_castka,
          dodavatel: savedOrder.dodavatel_nazev,
          popis: savedOrder.popis
        }
      },
      {
        source: 'web', // nebo 'mobile'
        user: currentUser
      }
    );
  }
};
```

**Konkrétní trigger body:**

| Akce Uživatele | Změna Stavu | Event Type | Příjemci |
|----------------|-------------|------------|----------|
| User uloží obj. ke schválení | `nova` → `ceka_se` | `order_status_ceka_se` | Schvalovatel (dle hierarchie) |
| Schvalovatel schválí | `ceka_se` → `schvalena` | `order_status_schvalena` | Autor objednávky |
| Schvalovatel zamítne | `ceka_se` → `zamitnuta` | `order_status_zamitnuta` | Autor objednávky |

**2. Operace schválení/zamítnutí**

```javascript
// OrderApprovalPanel.jsx (nebo backend)
const handleApprove = async (orderId, decision) => {
  const order = await getOrderById(orderId);
  
  // Update stavu v DB
  const updatedOrder = await updateOrderStatus(orderId, decision.newStatus);
  
  // ✅ TRIGGER: Notifikace o rozhodnutí
  await NotificationCenter.trigger(
    decision.newStatus === 'schvalena' 
      ? 'order_status_schvalena' 
      : 'order_status_zamitnuta',
    {
      order_id: updatedOrder.id,
      order_number: updatedOrder.cislo_obj,
      old_status: order.status,
      new_status: decision.newStatus,
      approver: currentUser, // Kdo schválil/zamítl
      author: order.autor, // Původní autor objednávky
      approval_note: decision.note, // Poznámka schvalovatele
      order_data: {
        nazev: updatedOrder.nazev,
        celkova_castka: updatedOrder.celkova_castka,
        dodavatel: updatedOrder.dodavatel_nazev
      }
    },
    {
      source: 'web',
      user: currentUser
    }
  );
};
```

**3. Komunikace s dodavatelem**

```javascript
// OrderSupplierPanel.jsx
const handleSendToSupplier = async (orderId) => {
  const order = await getOrderById(orderId);
  
  // Odeslat objednávku dodavateli (email, API, atd.)
  await sendOrderToSupplier(order);
  
  // Update stavu
  const updatedOrder = await updateOrderStatus(orderId, 'odeslana');
  
  // ✅ TRIGGER: Notifikace o odeslání
  await NotificationCenter.trigger(
    'order_status_odeslana',
    {
      order_id: updatedOrder.id,
      order_number: updatedOrder.cislo_obj,
      old_status: order.status,
      new_status: 'odeslana',
      supplier: order.dodavatel,
      sent_at: new Date(),
      order_data: { /* ... */ }
    },
    { source: 'web', user: currentUser }
  );
};

const handleSupplierConfirmation = async (orderId, confirmationData) => {
  // Dodavatel potvrdil objednávku
  const updatedOrder = await updateOrderStatus(orderId, 'potvrzena');
  
  // ✅ TRIGGER: Notifikace o potvrzení
  await NotificationCenter.trigger(
    'order_status_potvrzena',
    {
      order_id: updatedOrder.id,
      order_number: updatedOrder.cislo_obj,
      old_status: 'odeslana',
      new_status: 'potvrzena',
      supplier: updatedOrder.dodavatel,
      confirmed_at: new Date(),
      delivery_date: confirmationData.delivery_date,
      order_data: { /* ... */ }
    },
    { source: 'supplier_portal', user: null } // Dodavatel není v systému
  );
};
```

**4. Fakturace a kontrola kvality**

```javascript
// InvoicePanel.jsx
const handleInvoiceApproval = async (invoiceId, approved) => {
  const invoice = await getInvoiceById(invoiceId);
  const order = await getOrderById(invoice.order_id);
  
  // Update stavu
  await updateInvoiceStatus(invoiceId, approved ? 'schvalena' : 'zamitnuta');
  
  if (approved) {
    // ✅ TRIGGER: Faktura schválena
    await NotificationCenter.trigger(
      'order_status_faktura_schvalena',
      {
        order_id: order.id,
        invoice_id: invoice.id,
        invoice_number: invoice.cislo_faktury,
        invoice_amount: invoice.castka,
        approver: currentUser,
        author: order.autor
      },
      { source: 'web', user: currentUser }
    );
  }
};

// QualityControlPanel.jsx
const handleQualityCheck = async (orderId, passed, notes) => {
  const order = await getOrderById(orderId);
  
  // Update stavu
  const updatedOrder = await updateOrderStatus(
    orderId, 
    passed ? 'kontrola_potvrzena' : 'kontrola_zamitnuta'
  );
  
  // ✅ TRIGGER: Výsledek kontroly
  await NotificationCenter.trigger(
    passed ? 'order_status_kontrola_potvrzena' : 'order_status_kontrola_zamitnuta',
    {
      order_id: updatedOrder.id,
      order_number: updatedOrder.cislo_obj,
      old_status: order.status,
      new_status: passed ? 'kontrola_potvrzena' : 'kontrola_zamitnuta',
      controller: currentUser,
      author: order.autor,
      control_notes: notes,
      rejection_reason: passed ? null : notes
    },
    { source: 'web', user: currentUser }
  );
};
```

#### Trigger Locations - Kde v Kódu Implementovat

**Frontend (React):**
- `OrderForm.jsx` - handleSave, handleSubmitForApproval
- `OrderApprovalPanel.jsx` - handleApprove, handleReject
- `OrderSupplierPanel.jsx` - handleSendToSupplier
- `InvoicePanel.jsx` - handleInvoiceApproval
- `QualityControlPanel.jsx` - handleQualityCheck

**Backend (PHP API):**
- `orderHandlers.php` - saveOrder, updateOrderStatus
- `approvalHandlers.php` - approveOrder, rejectOrder
- `supplierHandlers.php` - sendToSupplier, confirmFromSupplier
- `invoiceHandlers.php` - approveInvoice
- `qualityHandlers.php` - performQualityCheck

**Doporučení:**  
✅ **Backend implementation preferred** - notifikace trigger na backendu je bezpečnější a konzistentnější

#### Stavy Vyžadující Notifikaci
1. `ceka_se` → Čeká na schválení (autor uložil ke schválení)
2. `schvalena` → Schvalovatel schválil
3. `zamitnuta` → Schvalovatel zamítl
4. `odeslana` → Odesláno dodavateli
5. `potvrzena` → Dodavatel potvrdil
6. `faktura_schvalena` → Faktura schválena
7. `kontrola_potvrzena` → Kontrola kvality OK
8. `kontrola_zamitnuta` → Kontrola kvality FAIL

### B) BackTask Manager - Úkoly, Alarmy, Systémové Zprávy

#### Event Types
```javascript
const BT_NOTIFICATION_EVENTS = {
  TASK_ASSIGNED: 'bt_task_assigned',        // Přiřazen nový úkol
  TASK_DEADLINE: 'bt_task_deadline',        // Blíží se deadline
  TASK_OVERDUE: 'bt_task_overdue',          // Po deadline
  TASK_COMPLETED: 'bt_task_completed',      // Úkol dokončen
  ALARM_TRIGGERED: 'bt_alarm_triggered',    // Alarm vyvolán
  SYSTEM_MESSAGE: 'bt_system_message'       // Systémová zpráva
};
```

#### Implementace
```javascript
// V BackTask manageru
const assignTask = async (taskData) => {
  const task = await createTaskAPI(taskData);
  
  await NotificationDecisionEngine.processEvent({
    eventType: BT_NOTIFICATION_EVENTS.TASK_ASSIGNED,
    eventData: {
      task_id: task.id,
      assignee: task.assignee,
      assigner: currentUser,
      deadline: task.deadline,
      priority: task.priority
    }
  });
};
```

### C) Mobile App - Operace Schválení

#### Specifika Mobile
- Uživatel může schvalovat objednávky z mobilu
- Notifikace se musí odesílat stejně jako z web aplikace
- Push notifikace (budoucnost?)

#### Implementace
```javascript
// V mobile API endpointu
POST /mobile/orders/:id/approve

const approveOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  order.status = 'schvalena';
  await order.save();
  
  // ✅ Stejná logika jako web
  await NotificationDecisionEngine.processEvent({
    eventType: 'order_status_schvalena',
    eventData: {
      order_id: order.id,
      approver: req.user,
      source: 'mobile',  // Značka, že to přišlo z mobilu
      timestamp: new Date()
    }
  });
  
  res.json({ success: true });
};
```

---

## 🤔 Technické Otázky K Diskusi

### 1. **Automatické Vypnutí Výchozích Notifikací**

**Otázka:**  
Jak zjistit, že hierarchie je aktivní pro danou událost?

**Možnosti:**

#### A) Databázový Flag
```sql
ALTER TABLE 25_hierarchy_profiles 
ADD COLUMN overrides_defaults BOOLEAN DEFAULT 1;
```
✅ Výhoda: Explicitní kontrola  
❌ Nevýhoda: Nutná migrace DB

#### B) Automatická Detekce
```javascript
function isHierarchyActive(eventType) {
  const activeProfiles = getActiveHierarchyProfiles();
  return activeProfiles.some(profile => 
    profile.notifications[eventType] !== null
  );
}
```
✅ Výhoda: Žádná migrace  
❌ Nevýhoda: Možná nejasnost

**📌 Návrh:** Kombinace obou - flag `notifications_enabled` na úrovni profilu + automatická detekce

---

### 2. **User Opt-Out Granularita**

**Otázka:**  
Jak detailní má být opt-out uživatele?

**Možnosti:**

#### A) Jednoduchá (doporučeno)
```javascript
user_preferences = {
  email_enabled: true,      // Chci/nechci email
  inapp_enabled: true       // Chci/nechci zvonek
}
```

#### B) Per Event Type
```javascript
user_preferences = {
  email: {
    order_status: true,
    backtask: false,
    alarms: true
  },
  inapp: {
    order_status: true,
    backtask: true,
    alarms: true
  }
}
```

#### C) Úplně Granulární (overkill?)
```javascript
user_preferences = {
  email: {
    order_status_schvalena: true,
    order_status_zamitnuta: false,
    // ... pro každou událost
  }
}
```

**📌 Návrh:** Začít s A), rozšířit na B) pokud bude požadavek

---

### 3. **Hierarchie vs. Default Logic**

**Otázka:**  
Co když hierarchie definuje pouze některé události?

**Příklad:**
- Hierarchie definuje: `order_status_schvalena`, `order_status_zamitnuta`
- Hierarchie NEDEFINUJE: `order_status_odeslana`

**Chování:**

#### Možnost 1: Strict Mode
```javascript
if (hierarchy.notifications[eventType]) {
  // Použij hierarchii
} else {
  // ❌ Neposílej vůbec
}
```

#### Možnost 2: Fallback Mode (doporučeno)
```javascript
if (hierarchy.notifications[eventType]) {
  // Použij hierarchii
} else {
  // ✅ Použij výchozí logiku
  sendDefaultNotification(eventType);
}
```

**📌 Návrh:** Fallback Mode - hierarchie rozšiřuje, nevypíná celý systém

---

### 4. **Notifikace při Opakovaném Uložení**

**Otázka:**  
Posílat notifikaci při každém uložení, nebo jen při změně stavu?

**Scénář:**
```
1. User vytvoří objednávku, status = 'nova'
2. User uloží změny (přidá položku), status = 'nova'
3. User uloží změny (opraví poznámku), status = 'nova'
4. User změní status na 'ceka_se'
```

**Možnosti:**

#### A) Jen při změně stavu (doporučeno)
✅ Výhoda: Méně spamu  
✅ Výhoda: Odpovídá workflow logice  
❌ Nevýhoda: Může zmeškat důležité úpravy?

#### B) Při každém uložení
❌ Nevýhoda: Spam notifikací  
✅ Výhoda: Úplný audit trail

**📌 Návrh:** Pouze při změně stavu (`old_status !== new_status`)

---

### 5. **ResizeObserver Error Fix**

**Problém:**
```javascript
// Při mazání profilu hierarchie
ResizeObserver loop completed with undelivered notifications.
```

**Možné řešení:**

#### A) Global Error Handler (quick fix)
```javascript
// V index.js nebo App.jsx
window.addEventListener('error', (e) => {
  if (e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
    return false;
  }
});
```

#### B) Cleanup v useEffect (správné řešení)
```javascript
// V OrganizationHierarchy.js
useEffect(() => {
  // ... canvas/resize logic
  
  return () => {
    // ✅ Cleanup při unmount
    resizeObserver?.disconnect();
    canvas?.destroy();
  };
}, []);
```

#### C) RequestAnimationFrame Debounce
```javascript
const handleResize = () => {
  if (resizeTimeoutRef.current) {
    cancelAnimationFrame(resizeTimeoutRef.current);
  }
  
  resizeTimeoutRef.current = requestAnimationFrame(() => {
    updateCanvasSize();
  });
};
```

**📌 Návrh:** Kombinace B) + C) - cleanup + debounce

---

## 🗺️ Roadmap & Fáze

### Fáze 1: Foundation (1-2 týdny)
**Cíl:** Vytvořit Decision Engine a základní infrastrukturu

- [ ] Vytvořit `NotificationDecisionEngine.js` service
- [ ] Implementovat 3-level priority logic
- [ ] Vytvořit DB tabulku `user_notification_preferences`
- [ ] Vytvořit API endpoint `/users/:id/notification-preferences`
- [ ] Unit testy pro decision logic

### Fáze 2: OrderForm Integration (1 týden)
**Cíl:** Nahradit hardcoded notifikace v OrderForm

- [ ] Identifikovat všechny výchozí notifikace v kódu
- [ ] Refaktorovat na použití Decision Engine
- [ ] Implementovat `isHierarchyActive()` check
- [ ] Testování všech 8 stavů objednávky

### Fáze 3: User Preferences UI (1 týden)
**Cíl:** Umožnit uživatelům nastavit preference

- [ ] Vytvořit `NotificationPreferencesPanel.jsx`
- [ ] Přidat do User Profile sekce
- [ ] Checkboxy: Email ON/OFF, In-App ON/OFF
- [ ] Per-event type settings (budoucnost)

### Fáze 4: BackTask Integration (1 týden)
**Cíl:** Notifikace pro úkoly, alarmy, systémové zprávy

- [ ] Identifikovat BT notification points
- [ ] Vytvořit event types (TASK_ASSIGNED, ALARM_TRIGGERED, atd.)
- [ ] Implementovat notifikační šablony pro BT
- [ ] Integrace s Decision Engine

### Fáze 5: Mobile App Support (1 týden)
**Cíl:** Konzistentní notifikace z mobile

- [ ] Audit mobile API endpointů
- [ ] Implementovat Decision Engine na backendu
- [ ] Testování mobile → notifikace flow
- [ ] Push notifikace (volitelné, budoucnost)

### Fáze 6: Bug Fixes & Polish (3-5 dní)
**Cíl:** Vyřešit známé problémy

- [ ] ✅ Fix ResizeObserver error
- [ ] Testing edge cases
- [ ] Performance optimizace
- [ ] Dokumentace pro vývojáře

---

## 📊 Database Schema Změny

### Nová Tabulka: `user_notification_preferences`

```sql
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT 1,
  inapp_enabled BOOLEAN DEFAULT 1,
  
  -- Event type preferences (future expansion)
  event_preferences JSON DEFAULT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_prefs (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Rozšíření: `25_hierarchy_profiles`

```sql
ALTER TABLE 25_hierarchy_profiles 
ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1 COMMENT 'Pokud TRUE, hierarchie přebíjí výchozí notifikace';
```

### Rozšíření: `global_settings` (pokud existuje)

```sql
-- Pokud global_settings tabulka existuje
ALTER TABLE global_settings
ADD COLUMN notifications_email_enabled BOOLEAN DEFAULT 1,
ADD COLUMN notifications_inapp_enabled BOOLEAN DEFAULT 1;

-- Pokud neexistuje, vytvořit
CREATE TABLE IF NOT EXISTS global_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO global_settings (setting_key, setting_value, description) VALUES
('notifications_email_enabled', '1', 'Master switch pro email notifikace'),
('notifications_inapp_enabled', '1', 'Master switch pro in-app notifikace (zvonek)');
```

---

## 🧪 Testovací Scénáře

### Test Case 1: Základní Flow
```
GIVEN: User má email=ON, inapp=ON
AND: Global má email=ON, inapp=ON
AND: Hierarchie je aktivní pro order_status_schvalena
WHEN: Objednávka změní status na 'schvalena'
THEN: 
  - Notifikace se odešle dle hierarchie
  - Email i in-app notifikace
  - Výchozí notifikace se NEODESÍLÁ
```

### Test Case 2: User Opt-Out
```
GIVEN: User má email=OFF, inapp=ON
AND: Global má email=ON, inapp=ON
AND: Hierarchie definuje email notifikaci
WHEN: Objednávka změní status na 'schvalena'
THEN:
  - Odešle se POUZE in-app notifikace
  - Email se NEODESÍLÁ (user preference wins)
```

### Test Case 3: Hierarchie Neaktivní
```
GIVEN: Hierarchie NENÍ definována
AND: Global má email=ON, inapp=ON
AND: User má email=ON, inapp=ON
WHEN: Objednávka změní status na 'schvalena'
THEN:
  - Použije se fallback (výchozí notifikace)
  - Email + in-app dle výchozí logiky
```

### Test Case 4: Global Disable
```
GIVEN: Global má email=OFF
AND: User má email=ON
AND: Hierarchie definuje email notifikaci
WHEN: Objednávka změní status
THEN:
  - Email se NEODESÍLÁ (global override)
  - In-app může jít (pokud global inapp=ON)
```

---

## 📝 Code Snippets - Návrh API

### NotificationDecisionEngine.js

```javascript
/**
 * Centrální rozhodovací engine pro notifikace
 * 
 * Pravidla:
 * 1. Global Settings → master switch
 * 2. User Preferences → per-user override
 * 3. Hierarchy Rules → určuje WHO + WHICH TEMPLATE
 */

class NotificationDecisionEngine {
  
  /**
   * Hlavní entry point - zpracuje událost a rozhodne o notifikacích
   */
  async processEvent(event) {
    const { eventType, eventData } = event;
    
    // 1. Získej globální nastavení
    const globalSettings = await this.getGlobalSettings();
    
    // 2. Kontrola hierarchie
    const hierarchyConfig = await this.getHierarchyConfig(eventType);
    
    // 3. Získej příjemce
    const recipients = hierarchyConfig 
      ? await this.getRecipientsFromHierarchy(hierarchyConfig, eventData)
      : await this.getDefaultRecipients(eventType, eventData);
    
    // 4. Pro každého příjemce rozhoduj o kanálech
    const decisions = [];
    for (const recipient of recipients) {
      const userPrefs = await this.getUserPreferences(recipient.id);
      const channels = this.determineChannels(globalSettings, userPrefs);
      
      if (channels.length > 0) {
        decisions.push({
          recipient: recipient,
          channels: channels,
          template: hierarchyConfig?.template || this.getDefaultTemplate(eventType),
          eventData: eventData
        });
      }
    }
    
    // 5. Odešli notifikace
    await this.dispatch(decisions);
    
    return decisions;
  }
  
  /**
   * Určí dostupné kanály dle 3-level priority
   */
  determineChannels(globalSettings, userPrefs) {
    const channels = [];
    
    if (globalSettings.email_enabled && userPrefs.email_enabled) {
      channels.push('email');
    }
    
    if (globalSettings.inapp_enabled && userPrefs.inapp_enabled) {
      channels.push('inapp');
    }
    
    return channels;
  }
  
  /**
   * Kontrola, zda je hierarchie aktivní pro daný event
   */
  async getHierarchyConfig(eventType) {
    const profiles = await db.query(`
      SELECT * FROM 25_hierarchy_profiles 
      WHERE active = 1 
      AND notifications_enabled = 1
      AND JSON_EXTRACT(notifications, '$.${eventType}') IS NOT NULL
    `);
    
    return profiles.length > 0 ? profiles[0] : null;
  }
  
  /**
   * Získá příjemce z hierarchie
   */
  async getRecipientsFromHierarchy(hierarchyConfig, eventData) {
    // Parse hierarchie a najdi příslušné uzly
    // Vrať uživatele, kteří mají dostat notifikaci
    
    // TODO: Implementovat logiku parsingu hierarchie
    return [];
  }
  
  /**
   * Fallback - výchozí příjemci (pokud hierarchie není aktivní)
   */
  async getDefaultRecipients(eventType, eventData) {
    // Výchozí logika - např. všichni schvalovatelé
    // TODO: Implementovat
    return [];
  }
  
  /**
   * Odešle notifikace dle rozhodnutí
   */
  async dispatch(decisions) {
    for (const decision of decisions) {
      for (const channel of decision.channels) {
        if (channel === 'email') {
          await this.sendEmail(decision);
        } else if (channel === 'inapp') {
          await this.sendInApp(decision);
        }
      }
    }
  }
  
  async sendEmail(decision) {
    // TODO: Implementovat odeslání emailu
    console.log('Sending email to:', decision.recipient.email);
  }
  
  async sendInApp(decision) {
    // TODO: Implementovat uložení do DB + WebSocket push
    console.log('Sending in-app to:', decision.recipient.id);
  }
  
  async getGlobalSettings() {
    // TODO: Load z DB nebo config
    return {
      email_enabled: true,
      inapp_enabled: true
    };
  }
  
  async getUserPreferences(userId) {
    const prefs = await db.query(
      'SELECT * FROM user_notification_preferences WHERE user_id = ?',
      [userId]
    );
    
    return prefs.length > 0 ? prefs[0] : {
      email_enabled: true,  // Default
      inapp_enabled: true
    };
  }
  
  getDefaultTemplate(eventType) {
    // Fallback šablona
    return `default_${eventType}`;
  }
}

export default new NotificationDecisionEngine();
```

---

## 🎨 UI Mock - User Notification Preferences

```jsx
// NotificationPreferencesPanel.jsx

const NotificationPreferencesPanel = ({ userId }) => {
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    inapp_enabled: true
  });
  
  const handleSave = async () => {
    await fetch(`/api/users/${userId}/notification-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences)
    });
    
    toast.success('Nastavení uloženo');
  };
  
  return (
    <Card>
      <CardHeader>
        <h3>🔔 Nastavení Notifikací</h3>
      </CardHeader>
      <CardBody>
        <FormGroup>
          <Label check>
            <Input 
              type="checkbox"
              checked={preferences.email_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                email_enabled: e.target.checked
              })}
            />
            {' '}
            📧 Email notifikace
          </Label>
          <FormText color="muted">
            Dostávat notifikace na email
          </FormText>
        </FormGroup>
        
        <FormGroup>
          <Label check>
            <Input 
              type="checkbox"
              checked={preferences.inapp_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                inapp_enabled: e.target.checked
              })}
            />
            {' '}
            🔔 In-app notifikace (zvonek)
          </Label>
          <FormText color="muted">
            Zobrazovat notifikace v aplikaci
          </FormText>
        </FormGroup>
        
        <Alert color="info">
          ℹ️ Tyto nastavení ovlivňují všechny typy notifikací 
          (objednávky, úkoly, alarmy)
        </Alert>
        
        <Button color="primary" onClick={handleSave}>
          Uložit nastavení
        </Button>
      </CardBody>
    </Card>
  );
};
```

---

## 📚 Další Kroky

### Immediate (zítra)
1. ✅ Přečíst tento dokument
2. 💬 Diskuse o open questions
3. 📝 Rozhodnout o architektuře
4. 🎯 Prioritizovat fáze

### Short-term (tento sprint)
1. 🐛 Fix ResizeObserver error
2. 🏗️ Vytvořit NotificationDecisionEngine
3. 🗄️ Vytvořit DB schema pro user preferences
4. 🔗 Integrace OrderForm

### Long-term (příští sprints)
1. 🎨 UI pro user preferences
2. 📱 Mobile app integration
3. 🔔 BackTask Manager integration
4. 📊 Reporting & analytics

---

## ❓ Open Questions Summary

1. **Automatické vypnutí výchozích notifikací:** Flag v DB vs. automatická detekce?
2. **User opt-out granularita:** Per-channel vs. per-event-type vs. úplně granulární?
3. **Hierarchie fallback mode:** Strict (nedefinováno = žádná notif) vs. Fallback (použít výchozí)?
4. **Notifikace při uložení:** Jen při změně stavu vs. při každém uložení?
5. **ResizeObserver fix:** Global handler vs. useEffect cleanup vs. debounce?

---

## 🏁 Závěr

Tento dokument definuje komplexní notifikační systém s 3-úrovňovou prioritizací:

```
Global Settings → User Preferences → Hierarchy Rules
```

**Klíčové principy:**
- ✅ User preference je VETO (opt-out respektován)
- ✅ Hierarchie určuje WHO a WHICH TEMPLATE
- ✅ Fallback na výchozí logiku pokud hierarchie není aktivní
- ✅ Jednotný systém napříč OrderForm, BackTask, Mobile

**Další kroky:**
1. Diskuse o open questions
2. Schválení architektury
3. Roadmap prioritizace
4. Start implementace Fáze 1

---

**Připraveno k diskusi! 🚀**
