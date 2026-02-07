# 🔔 Kompletní Analýza Notifikačního Systému ERDMS
**Datum:** 12. ledna 2026  
**Autor:** AI Assistant  
**Důvod:** Analýza včerejších změn a ověření věcné správnosti notifikací

---

## 📋 Executive Summary

Notifikační systém ERDMS je **3-vrstvový hybrid** kombinující:
1. **Frontend trigger systém** (OrderForm25.js)
2. **Backend notification router** (notificationHandlers.php)
3. **Organizační hierarchie** (hierarchyTriggers.php)

### ⚠️ KRITICKÉ ZJIŠTĚNÍ

**Včerejší změny (2ec5d29 - FIX: Věcná správnost notifications for contract invoices)** zavedly support pro notifikace o věcné správnosti FAKTUR ke SMLOUVÁM, ale **NENÍ JASNÉ**, jestli se správně propojuje s org hierarchií.

---

## 🎯 1. NOTIFIKAČNÍ TRIGGERY - KDE A KDY SE POSÍLAJÍ

### 1.1 Frontend Triggery (OrderForm25.js)

```javascript
// Hlavní trigger funkce
const sendOrderNotifications = async (orderId, orderNumber, newWorkflowState, oldWorkflowState, formData)
```

**Volá se na těchto 2 MÍSTECH:**

#### A) Po vytvoření NOVÉ objednávky (řádek ~10713)
```javascript
await sendOrderNotifications(orderId, orderNumber, workflowKod, null, formData);
```

#### B) Po ZMĚNĚ workflow stavu (řádek ~11233)
```javascript
await sendOrderNotifications(formData.id, orderNumber, result.stav_workflow_kod, oldWorkflowKod, formData);
```

### 1.2 Detekce Typu Notifikace

Systém detekuje změnu workflow pomocí:

```javascript
const hasWorkflowState = (stav, keyword) => {
  if (!stav || typeof stav !== 'string') return false;
  return stav.toUpperCase().includes(keyword);
};
```

**PŘÍKLAD - Schválení objednávky:**
```javascript
const hasSchvalena = hasWorkflowState(newWorkflowState, 'SCHVALENA');
const hadSchvalena = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'SCHVALENA') : false;

if (hasSchvalena && !hadSchvalena) {
  notificationType = 'order_status_schvalena';
}
```

### 1.3 Event Types - KOMPLETNÍ SEZNAM

#### 🟢 **OBJEDNÁVKY** (12 stavů + 9 nových fází)

| Event Type | Kdy se triggeruje | Příjemci (org hierarchie) |
|---|---|---|
| `ORDER_PENDING_APPROVAL` | Nová objednávka / Ke schválení | Garant, Příkazce, Schvalovatel |
| `ORDER_APPROVED` | Příkazce schválil | Objednatel, Garant |
| `ORDER_REJECTED` | Příkazce zamítl | Objednatel, Garant |
| `ORDER_AWAITING_CHANGES` | Vrácena k doplnění | Objednatel |
| `ORDER_SENT_TO_SUPPLIER` | Odeslána dodavateli | Garant, Příkazce |
| `ORDER_CONFIRMED_BY_SUPPLIER` | Potvrzena dodavatelem | Objednatel, Garant, Příkazce |
| `ORDER_REGISTRY_PENDING` | Čeká na registr smluv | Garant |
| `ORDER_REGISTRY_PUBLISHED` | Zveřejněna v registru | Všichni účastníci |
| `ORDER_INVOICE_PENDING` | Čeká na fakturu | Ekonom |
| `ORDER_INVOICE_ADDED` | Faktura přidána | Garant, Příkazce |
| `ORDER_VERIFICATION_PENDING` | Čeká na věcnou kontrolu | **→ ZDE JE PROBLÉM!** |
| `ORDER_VERIFICATION_APPROVED` | Věcná kontrola provedena | **→ ZDE JE PROBLÉM!** |
| `ORDER_COMPLETED` | Dokončena | Všichni |

#### 🔴 **FAKTURY** (3 event types)

| Event Type | Kdy se triggeruje | Backend lokace |
|---|---|---|
| `INVOICE_CREATED` | Nová faktura vytvořena | invoiceHandlers.php |
| `INVOICE_DUE_SOON` | Blíží se splatnost | CRON/scheduled task |
| `INVOICE_OVERDUE` | Po splatnosti | CRON/scheduled task |

#### 🔵 **SMLOUVY** (1 event type)

| Event Type | Kdy se triggeruje |
|---|---|
| `CONTRACT_EXPIRING` | Končí platnost |

#### 🟡 **POKLADNA** (1 event type)

| Event Type | Kdy se triggeruje |
|---|---|
| `CASHBOOK_LOW_BALANCE` | Nízký zůstatek |

---

## 🏗️ 2. JAK SE GENERUJE / VYTVÁŘÍ NOTIFIKACE

### 2.1 Tok dat (Data Flow)

```
┌─────────────────────────────────────────────────────────────┐
│  1. FRONTEND TRIGGER                                        │
│     OrderForm25.js → sendOrderNotifications()               │
│     → notificationService.trigger()                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  2. BACKEND API ENDPOINT                                    │
│     POST /api.eeo/notifications/trigger                     │
│     → handle_notifications_trigger()                        │
│     → notificationRouter()                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  3. ORGANIZAČNÍ HIERARCHIE                                  │
│     hierarchyTriggers.php                                   │
│     → resolveHierarchyNotificationRecipients()              │
│       ├─ Načte aktivní profil hierarchie                   │
│       ├─ Najde TEMPLATE nodes pro event type               │
│       ├─ Projde EDGES a TARGET nodes                       │
│       ├─ Resolve příjemce (role/department/user)           │
│       └─ Aplikuje delivery preferences (email/inApp)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  4. PLACEHOLDER NAPLNĚNÍ                                    │
│     loadUniversalPlaceholders()                             │
│     → getOrderPlaceholderData()                             │
│       ├─ Načte objednávku z DB (JOIN účastníci)            │
│       ├─ Načte položky                                      │
│       ├─ Dekóduj JSON pole (střediska, financování)        │
│       └─ Vrátí 50+ placeholderů                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  5. VYTVOŘENÍ NOTIFIKACE V DB                               │
│     createNotification()                                    │
│     ├─ INSERT do 25_notifikace (master záznam)             │
│     └─ INSERT do 25_notifikace_precteni (pro každého)      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Placeholder Systém

**Automaticky načítaných 50+ placeholderů:**

```php
// Z objednávky
'order_number' => 'O-2025-142'
'order_subject' => 'Nákup kancelářských potřeb'
'max_price_with_dph' => '25 000 Kč'

// Účastníci - JMÉNA
'creator_name' => 'Jan Novák'
'objednatel_name' => 'Jan Novák'
'prikazce_name' => 'Marie Svobodová'
'garant_name' => 'Petr Dvořák'
'schvalovatel_name' => 'Marie Svobodová'
'trigger_user_name' => 'Marie Svobodová'  // Ten kdo akci vykonal

// Účastníci - ID (pro org hierarchii!)
'objednavka_id' => 142
'uzivatel_id' => 15
'objednatel_id' => 15
'prikazce_id' => 8
'garant_uzivatel_id' => 23
'schvalovatel_id' => 8

// Střediska, financování
'strediska' => 'Provozní, IT oddělení'
'financovani' => 'LP: 2025/001 (Investice)'

// Urgentnost
'is_urgent' => true/false
'mimoradna_udalost' => 1/0
```

---

## 🔗 3. SPOJENÍ S ORGANIZAČNÍ HIERARCHIÍ

### 3.1 Aktivace Hierarchie

**Kontrola v Global Settings:**

```sql
SELECT klic, hodnota 
FROM 25a_nastaveni_globalni
WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')
```

**Pokud `hierarchy_enabled = 1` → používá se org hierarchie!**

### 3.2 Struktura Profilu

```json
{
  "nodes": [
    {
      "id": "template-1",
      "type": "template",
      "data": {
        "eventTypes": ["ORDER_PENDING_APPROVAL"],
        "templateId": 42  // ID šablony z 25_notifikace_sablony
      }
    },
    {
      "id": "role-1",
      "type": "role",
      "data": {
        "roleId": 3,  // GARANT
        "scopeDefinition": {
          "type": "ALL_IN_ROLE"
        },
        "delivery": {
          "email": true,
          "inApp": true,
          "sms": false
        }
      }
    }
  ],
  "edges": [
    {
      "source": "template-1",
      "target": "role-1",
      "data": {
        "priority": "WARNING",  // nebo "AUTO", "URGENT"
        "eventTypes": ["ORDER_PENDING_APPROVAL"]
      }
    }
  ]
}
```

### 3.3 Scope Definice - Jak se vybírají příjemci

| Scope Type | Popis | Příklad |
|---|---|---|
| `ALL_IN_ROLE` | Všichni s danou rolí | Všichni garanti |
| `SELECTED` | Vybraní uživatelé z role | Jen Petr a Jana |
| `DYNAMIC_FROM_ENTITY` | Z fieldu objednávky | `garant_uzivatel_id` |

**PŘÍKLAD - Dynamický garant:**

```json
{
  "type": "DYNAMIC_FROM_ENTITY",
  "fields": ["garant_uzivatel_id"]
}
```

→ Backend vezme `$order['garant_uzivatel_id']` a tomu pošle notifikaci

---

## ❓ 4. POKRYTÍ MODULŮ ORGANIZAČNÍ HIERARCHIÍ

### ✅ **PLNĚ PODPOROVANÉ:**

#### 📦 **Objednávky (Orders)**
- ✅ ORDER_PENDING_APPROVAL
- ✅ ORDER_APPROVED
- ✅ ORDER_REJECTED
- ✅ ORDER_AWAITING_CHANGES
- ✅ ORDER_SENT_TO_SUPPLIER
- ✅ ORDER_CONFIRMED_BY_SUPPLIER
- ✅ ORDER_COMPLETED

#### 🧾 **Faktury (Invoices)**
- ✅ INVOICE_CREATED
- ✅ INVOICE_DUE_SOON (pokud nakonfigurováno)
- ✅ INVOICE_OVERDUE (pokud nakonfigurováno)

### ⚠️ **ČÁSTEČNĚ PODPOROVANÉ:**

#### 📝 **Registr smluv**
- ✅ ORDER_REGISTRY_PENDING - OK
- ✅ ORDER_REGISTRY_PUBLISHED - OK
- ⚠️ **ALE:** Není jasné, jestli se propojuje správně s workflow state

#### 💰 **Fakturace**
- ✅ ORDER_INVOICE_PENDING - OK
- ✅ ORDER_INVOICE_ADDED - OK
- ⚠️ **ALE:** Není jisté, zda se správně detekuje přidání faktury

### 🔴 **PROBLEMATICKÉ / NEFUNGUJÍCÍ:**

#### ✔️ **Věcná správnost**
- ❌ `ORDER_VERIFICATION_PENDING` - **CHYBÍ EVENT TYPE V DB!**
- ❌ `ORDER_VERIFICATION_APPROVED` - **CHYBÍ EVENT TYPE V DB!**
- ⚠️ Včerejší commit (2ec5d29) přidal support v `invoiceHandlers.php`:

```php
// Detekce změny vecna_spravnost_potvrzeno z 0 na 1
$vecnaSpravnostChanged = isset($input['vecna_spravnost_potvrzeno']) && 
                          (int)$input['vecna_spravnost_potvrzeno'] === 1 && 
                          (int)$oldInvoiceData['vecna_spravnost_potvrzeno'] !== 1;

if ($vecnaSpravnostChanged) {
    // ❓ CO SE TU STANE? Není vidět trigger notifikace!
}
```

#### 💳 **Pokladna (Cashbook)**
- ❓ `CASHBOOK_LOW_BALANCE` - **NENÍ IMPLEMENTOVÁNO**
- Není vidět trigger v backendu

---

## 🐛 5. ANALÝZA VČEREJŠÍCH ZMĚN

### Commit 2ec5d29 (11.1.2026)
```
✅ FIX: Věcná správnost notifications for contract invoices
```

**CO BYLO ZMĚNĚNO:**

1. `invoiceHandlers.php` - přidána detekce změny `vecna_spravnost_potvrzeno`
2. `debug_notifications_vecna_spravnost.sql` - SQL pro debug

**PROBLÉM:**

```php
// invoiceHandlers.php, řádek ~518
$vecnaSpravnostChanged = isset($input['vecna_spravnost_potvrzeno']) && 
                          (int)$input['vecna_spravnost_potvrzeno'] === 1 && 
                          (int)$oldInvoiceData['vecna_spravnost_potvrzeno'] !== 1;

if ($vecnaSpravnostChanged) {
    // ❌ CHYBÍ: Trigger notifikace!
    // ❌ Mělo by být:
    // triggerNotification($db, 'ORDER_VERIFICATION_APPROVED', $objednavka_id, $current_user_id);
}
```

### ⚠️ **ROZBILO SE TO TAKHLE:**

1. Frontend nastavuje `vecna_spravnost_potvrzeno = 1` na faktuře
2. Backend detekuje změnu (`$vecnaSpravnostChanged = true`)
3. **ALE:** Nic se neděje! Žádná notifikace se neposílá!
4. Org hierarchie čeká na event `ORDER_VERIFICATION_APPROVED`
5. Event nikdy nepřijde → notifikace se nepošlou

---

## 🛠️ 6. JAK TO OPRAVIT

### Fix 1: Přidat Trigger do invoiceHandlers.php

```php
// invoiceHandlers.php, po řádku ~518
if ($vecnaSpravnostChanged) {
    error_log("📩 [Invoice Update] Věcná správnost potvrzena → triggering notification");
    
    // Získat objednavka_id z faktury
    $stmt_order = $db->prepare("SELECT objednavka_id FROM `$faktury_table` WHERE id = ?");
    $stmt_order->execute([$invoice_id]);
    $objednavka_id = $stmt_order->fetchColumn();
    
    if ($objednavka_id) {
        // Zavolat notifikační router
        require_once __DIR__ . '/notificationHelpers.php';
        
        // ✅ POUŽÍT SPRÁVNÝ EVENT TYPE!
        // Musí být v tabulce 25_notifikace_event_types
        triggerOrderNotification(
            'order_status_kontrola_potvrzena',  // nebo ORDER_VERIFICATION_APPROVED
            $objednavka_id,
            $current_user_id,
            [
                'invoice_id' => $invoice_id,
                'fa_cislo' => $input['fa_cislo_vema'] ?? ''
            ]
        );
        
        error_log("✅ [Invoice Update] Notification triggered for order $objednavka_id");
    }
}
```

### Fix 2: Ověřit Event Type v DB

```sql
-- Zkontrolovat, zda existuje v 25_notifikace_event_types
SELECT id, kod, nazev 
FROM 25_notifikace_event_types
WHERE kod IN ('ORDER_VERIFICATION_APPROVED', 'ORDER_VERIFICATION_PENDING', 'order_status_kontrola_potvrzena');
```

**Pokud NEEXISTUJE → PŘIDAT:**

```sql
INSERT INTO 25_notifikace_event_types (kod, nazev, kategorie, popis, aktivni) VALUES
('order_status_kontrola_potvrzena', 'Věcná správnost potvrzena', 'orders', 'Kontrola věcné správnosti faktury byla provedena', 1),
('order_status_kontrola_ceka', 'Čeká na věcnou kontrolu', 'orders', 'Faktura čeká na kontrolu věcné správnosti', 1);
```

### Fix 3: Ověřit Org Hierarchii

```sql
-- Zkontrolovat, zda existuje pravidlo v hierarchii
SELECT * FROM 25_hierarchie_profily WHERE aktivni = 1;

-- Načíst structure_json a hledat event_types
-- Pokud CHYBÍ → přidat template node + edges v admin UI
```

---

## 📊 7. DOPORUČENÍ A DALŠÍ KROKY

### Priorita 1 - KRITICKÉ (dnes)
1. ✅ Přidat trigger do `invoiceHandlers.php` (viz Fix 1)
2. ✅ Ověřit event types v DB (viz Fix 2)
3. ✅ Otestovat věcnou správnost na DEV

### Priorita 2 - VYSOKÁ (tento týden)
4. 🔍 Audit VŠECH modulů (pokladna, smlouvy)
5. 📝 Doplnit chybějící event types
6. 🧪 Vytvořit automatické testy

### Priorita 3 - STŘEDNÍ (příští týden)
7. 📚 Aktualizovat dokumentaci
8. 🎯 Optimalizace hierarchyTriggers.php
9. 📈 Monitoring notifikací

---

## 🧪 8. TESTOVACÍ SCÉNÁŘE

### Test 1: Věcná správnost - Nový flow

```
1. Vytvoř objednávku O-TEST-001
2. Přidej fakturu FA-TEST-001
3. Nastav `vecna_spravnost_potvrzeno = 1`
4. ✅ Očekávaná notifikace: "Věcná správnost potvrzena"
   → Příjemci: Objednatel, Garant (dle org hierarchie)
```

### Test 2: Kompletní workflow

```
NOVÁ → KE_SCHVALENI → SCHVALENA → ODESLANA → POTVRZENA 
→ FAKTURACE → VECNA_SPRAVNOST → ZKONTROLOVANA → DOKONCENA

✅ Na každém přechodu musí přijít notifikace!
```

---

## 📁 9. KLÍČOVÉ SOUBORY

### Frontend
- `apps/eeo-v2/client/src/forms/OrderForm25.js` - hlavní trigger
- `apps/eeo-v2/client/src/services/notificationsUnified.js` - API wrapper
- `apps/eeo-v2/client/src/pages/NotificationTestPanel.js` - debug panel

### Backend
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php` - router
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php` - org hierarchie
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHelpers.php` - helpers
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php` - **PROBLÉM TU!**

### Database
- `25_notifikace` - master tabulka
- `25_notifikace_precteni` - read status per user
- `25_notifikace_sablony` - email/app šablony
- `25_notifikace_event_types` - definice event typů
- `25_hierarchie_profily` - org hierarchie profily

---

## 🎬 ZÁVĚR

**Notifikační systém je funkční, ALE:**

⚠️ **Věcná správnost NEFUNGUJE** kvůli chybějícímu triggeru v `invoiceHandlers.php`

**Doporučení:** Aplikovat Fix 1-3 a otestovat na DEV před nasazením na PROD.

**Org hierarchie POKRÝVÁ:**
- ✅ Objednávky (kompletně)
- ✅ Faktury (základní flow)
- ⚠️ Registr smluv (částečně)
- ❌ Věcná správnost (NE - včerejší změna to neopravila)
- ❌ Pokladna (NE - není implementováno)

