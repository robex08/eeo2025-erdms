# 🧹 Čištění starých anglických event názvů - HOTOVO

**Datum:** 2025-01-03  
**Status:** ✅ KOMPLETNÍ

---

## 📋 Problém

V systému byly **DUPLICITNÍ event type definice**:

### ❌ STARÉ ANGLICKÉ (ODSTRANĚNO)
```php
'ORDER_SENT_FOR_APPROVAL'         // ❌ Starý název
'ORDER_APPROVED'                  // ❌ Starý název  
'ORDER_REJECTED'                  // ❌ Starý název
'ORDER_WAITING_FOR_CHANGES'       // ❌ Starý název
'ORDER_SENT_TO_SUPPLIER'          // ❌ Starý název
'ORDER_CONFIRMED_BY_SUPPLIER'     // ❌ Starý název
'ORDER_FULFILLED'                 // ❌ Starý název
'ORDER_CANCELLED'                 // ❌ Starý název
'ORDER_ARCHIVED'                  // ❌ Starý název
'ORDER_WAITING'                   // ❌ Starý název
```

### ✅ NOVÉ ČESKÉ (AKTIVNÍ)
```php
'order_status_ke_schvaleni'       // ✅ Správný název
'order_status_schvalena'          // ✅ Správný název
'order_status_zamitnuta'          // ✅ Správný název
'order_status_ceka_se'            // ✅ Správný název
'order_status_odeslana'           // ✅ Správný název
'order_status_potvrzena'          // ✅ Správný název
'order_status_registr_ceka'       // ✅ Správný název
'order_status_registr_zverejnena' // ✅ Správný název
'order_status_faktura_ceka'       // ✅ Správný název
'order_status_faktura_pridana'    // ✅ Správný název
'order_status_kontrola_ceka'      // ✅ Správný název
'order_status_kontrola_potvrzena' // ✅ Správný název
'order_status_dokoncena'          // ✅ Správný název
```

---

## ✅ Řešení

### 1. Backend - notificationHandlers.php

**Odstraněno 10 starých event types (řádky 1774-1838)**

```php
// ❌ PŘED:
$eventTypes = array(
    array('code' => 'ORDER_SENT_FOR_APPROVAL', ...),
    array('code' => 'ORDER_APPROVED', ...),
    array('code' => 'ORDER_REJECTED', ...),
    // ... dalších 7 starých definic
    
    // ✅ Následují SPRÁVNÉ české definice
    array('code' => 'order_status_ke_schvaleni', ...),
    // ...
);

// ✅ PO:
// ❌ STARÉ ANGLICKÉ EVENT TYPES ODSTRANĚNY
// Nyní používáme POUZE české lowercase názvy (order_status_*, INVOICE_*, atd.)
// Viz řádky 1565-1690 pro kompletní seznam aktivních event types

$eventTypes = array(
    // Pouze SPRÁVNÉ české event types
    array('code' => 'order_status_ke_schvaleni', ...),
    array('code' => 'order_status_schvalena', ...),
    // ...
);
```

**Opraveny komentáře (3 místa):**

```php
// ❌ PŘED:
// Použití: notificationRouter($db, 'ORDER_SENT_FOR_APPROVAL', ...)
// @param string $eventType - Event typ code (ORDER_SENT_FOR_APPROVAL, ORDER_APPROVED, etc.)
// event_type: string (ORDER_APPROVED, ORDER_REJECTED, ...),

// ✅ PO:
// Použití: notificationRouter($db, 'order_status_ke_schvaleni', ...)
// @param string $eventType - Event typ code (order_status_ke_schvaleni, order_status_schvalena, etc.)
// event_type: string (order_status_schvalena, order_status_zamitnuta, ...),
```

### 2. Frontend - OrganizationHierarchy.js

**Opraveny příklady v nápovědách (3 místa):**

```javascript
// ❌ PŘED:
<li><strong>Event Types</strong> - kdy poslat (ORDER_SENT_FOR_APPROVAL...)</li>

Např. vyberete <strong>ORDER_SENT_FOR_APPROVAL</strong> → když někdo odešle objednávku ke schválení

(např. <code>ORDER_EDIT_OWN</code>).

// ✅ PO:
<li><strong>Event Types</strong> - kdy poslat (order_status_ke_schvaleni...)</li>

Např. vyberete <strong>order_status_ke_schvaleni</strong> → když někdo odešle objednávku ke schválení

(např. <code>INVOICE_MANAGE</code>).
```

---

## 📊 Statistika změn

### Backend: notificationHandlers.php
- **Odstraněno:** 70 řádků (staré event type definice)
- **Opraveno:** 5 komentářů/příkladů

### Frontend: OrganizationHierarchy.js
- **Opraveno:** 3 příklady v nápovědách

### Celkem
- **Soubory změněny:** 2
- **Řádky odstraněny:** ~70
- **Komentáře opraveny:** 8

---

## 🎯 Výsledek

### ✅ JEDINÝ ZDROJ PRAVDY
Nyní existuje **POUZE JEDNA SADA** event types:
- `order_status_*` (lowercase, česky) pro OBJEDNÁVKY
- `INVOICE_*` (UPPERCASE, anglicky) pro FAKTURY

### ✅ ŽÁDNÉ DUPLICITY
- ❌ Odstraněny všechny staré anglické názvy
- ❌ Odstraněny všechny reference na staré názvy v komentářích
- ✅ Konzistentní pojmenování v celém systému

### ✅ DOKUMENTACE AKTUÁLNÍ
Všechny příklady v kódu a nápovědách používají **SPRÁVNÉ** názvy událostí.

---

## 🔍 Mapování starých → nových názvů

Pro případnou migraci existujících dat:

```
ORDER_SENT_FOR_APPROVAL      → order_status_ke_schvaleni
ORDER_APPROVED               → order_status_schvalena
ORDER_REJECTED               → order_status_zamitnuta
ORDER_WAITING_FOR_CHANGES    → order_status_ceka_se
ORDER_SENT_TO_SUPPLIER       → order_status_odeslana
ORDER_CONFIRMED_BY_SUPPLIER  → order_status_potvrzena
ORDER_FULFILLED              → order_status_dokoncena
ORDER_CANCELLED              → [není přesný ekvivalent - stav ZRUSENA]
ORDER_ARCHIVED               → [není přesný ekvivalent - stav ARCHIVOVANO]
ORDER_WAITING                → order_status_ceka_se
```

**Poznámka:** Některé staré události neměly přesný ekvivalent v nové sadě, protože:
- `ORDER_CANCELLED` = stav objednávky, ne notifikační událost
- `ORDER_ARCHIVED` = stav objednávky, ne notifikační událost
- Nový systém používá **workflow stavy** místo samostatných událostí

---

## 📚 Související dokumentace

- [CHANGELOG_NOTIFICATION_TRIGGERS_FIX.md](CHANGELOG_NOTIFICATION_TRIGGERS_FIX.md) - Původní migrace na české názvy
- [ANALYSIS_EVENT_NAMING_CONSISTENCY.md](ANALYSIS_EVENT_NAMING_CONSISTENCY.md) - Analýza konzistence názvů
- [CHANGELOG_ORG_HIERARCHY_EDGE_NOTIFICATIONS_FIX.md](CHANGELOG_ORG_HIERARCHY_EDGE_NOTIFICATIONS_FIX.md) - Oprava EDGE notifikací

---

## ✅ Závěr

**Problém:** Duplicitní event types (staré anglické + nové české) způsobovaly zmatení při konfiguraci notifikací.

**Řešení:** Odstraněny všechny staré anglické definice a reference. Systém nyní používá POUZE nové české lowercase názvy.

**Výsledek:** Čistý, konzistentní systém bez duplicit. Uživatelé vidí pouze správné názvy událostí.

---

**Konec dokumentace**
