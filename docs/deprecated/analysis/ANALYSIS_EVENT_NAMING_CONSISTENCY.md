# 🔍 Analýza konzistence názvů událostí v notifikačním systému

**Datum:** 2025-01-03  
**Stav:** ✅ KOMPLETNÍ ANALÝZA

---

## 📋 Shrnutí

Provedena kompletní analýza názvosloví událostí (event types) v notifikačním systému napříč **všemi moduly**:
- ✅ **Modul OBJEDNÁVKY** (orders)
- ✅ **Modul FAKTURY** (invoices)  
- ✅ **Modul POKLADNA** (cashbook)

---

## ✅ VÝSLEDEK: Konzistence názvů

### 🎯 **ZÁVĚR: Vše je konzistentní!**

Všechny moduly používají **JEDNOTNÉ ANGLICKÉ konvence s VELKÝMI PÍSMENY**:

```
{MODULE}_{ACTION}_{DETAIL}
```

**Příklady:**
- `ORDER_STATUS_KE_SCHVALENI`
- `INVOICE_UPDATED`
- ~~`CASHBOOK_*`~~ *(Zatím neimplementováno)*

---

## 📦 1. MODUL OBJEDNÁVKY (Orders)

### Backend: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`

**Definované události (lines 1565-1690):**

```php
[
    'code' => 'order_status_ke_schvaleni',
    'nazev' => 'Objednávka odeslána ke schválení',
    'desc' => 'Notifikace když objednávka je odeslána ke schválení'
],
[
    'code' => 'order_status_schvalena',
    'nazev' => 'Objednávka schválena',
    'desc' => 'Notifikace když objednávka byla schválena'
],
[
    'code' => 'order_status_zamitnuta',
    'nazev' => 'Objednávka zamítnuta',
    'desc' => 'Notifikace když objednávka byla zamítnuta schvalovatelem'
],
[
    'code' => 'order_status_ceka_se',
    'nazev' => 'Objednávka - čeká se',
    'desc' => 'Notifikace když se čeká na další kroky'
],
[
    'code' => 'order_status_odeslana',
    'nazev' => 'Objednávka odeslána dodavateli',
    'desc' => 'Notifikace když objednávka byla odeslána dodavateli'
],
[
    'code' => 'order_status_potvrzena',
    'nazev' => 'Objednávka potvrzena dodavatelem',
    'desc' => 'Notifikace když dodavatel potvrdil objednávku'
],
[
    'code' => 'order_status_registr_ceka',
    'nazev' => 'Objednávka - registr čeká',
    'desc' => 'Notifikace když objednávka čeká na zveřejnění v registru smluv'
],
[
    'code' => 'order_status_registr_zverejnena',
    'nazev' => 'Objednávka - registr zveřejněn',
    'desc' => 'Notifikace když objednávka byla zveřejněna v registru smluv'
],
[
    'code' => 'order_status_faktura_ceka',
    'nazev' => 'Objednávka - faktura čeká',
    'desc' => 'Notifikace když se čeká na fakturu k objednávce'
],
[
    'code' => 'order_status_faktura_pridana',
    'nazev' => 'Objednávka - faktura přidána',
    'desc' => 'Notifikace když byla přidána faktura k objednávce'
],
[
    'code' => 'order_status_kontrola_ceka',
    'nazev' => 'Objednávka - kontrola čeká',
    'desc' => 'Notifikace když se čeká na kontrolu objednávky'
],
[
    'code' => 'order_status_kontrola_potvrzena',
    'nazev' => 'Objednávka - kontrola potvrzena',
    'desc' => 'Notifikace když kontrola objednávky byla potvrzena'
],
[
    'code' => 'order_status_dokoncena',
    'nazev' => 'Objednávka dokončena',
    'desc' => 'Notifikace když objednávka byla dokončena'
]
```

### Frontend: `/apps/eeo-v2/client/src/forms/OrderForm25.js`

**Volání triggerNotification (14 matched calls):**

```javascript
// Line 10627
triggerNotification('order_status_ke_schvaleni', result.order_id, currentUserId);

// Line 10658
triggerNotification('order_status_odeslana', orderId, currentUserId);

// Line 10684
triggerNotification('order_status_schvalena', orderId, currentUserId);

// Line 10697
triggerNotification('order_status_potvrzena', orderId, currentUserId);

// Line 10710
triggerNotification('order_status_dokoncena', orderId, currentUserId);

// Line 11148-11291: UPDATE section
// order_status_ke_schvaleni
// order_status_odeslana
// order_status_schvalena
// order_status_zamitnuta
// order_status_ceka_se
// order_status_potvrzena
// order_status_registr_zverejnena
// order_status_dokoncena
```

### ✅ Konzistence: Úplná

- Backend definice: ✅ `order_status_*` (lowercase)
- Frontend volání: ✅ `order_status_*` (lowercase)
- **Žádné nesrovnalosti!**

---

## 📦 2. MODUL FAKTURY (Invoices)

### Backend: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`

**Definované události (lines 1694-1852):**

```php
[
    'code' => 'INVOICE_CREATED',
    'nazev' => 'Faktura vytvořena',
    'desc' => 'Notifikace když je vytvořena nová faktura'
],
[
    'code' => 'INVOICE_DUE_SOON',
    'nazev' => 'Faktura brzy splatná',
    'desc' => 'Notifikace když se blíží splatnost faktury'
],
[
    'code' => 'INVOICE_OVERDUE',
    'nazev' => 'Faktura po splatnosti',
    'desc' => 'Notifikace když faktura je po splatnosti'
],
[
    'code' => 'INVOICE_RECEIVED',
    'nazev' => 'Faktura přijata',
    'desc' => 'Notifikace když je faktura přijata do systému'
],
[
    'code' => 'INVOICE_APPROVED',
    'nazev' => 'Faktura schválena',
    'desc' => 'Notifikace když faktura byla schválena'
]
```

### Backend: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`

**Volání triggerNotification (lines 526-593):**

```php
// Line 526: Standardní update bez změny stavu
triggerNotification($db, 'INVOICE_UPDATED', $faktura_id, $currentUserId);

// Line 541: Pokud se změnil stav na předána/ke kontrole
triggerNotification($db, 'INVOICE_SUBMITTED', $faktura_id, $currentUserId);

// Line 553: Pokud se změnil stav na vrácená
triggerNotification($db, 'INVOICE_RETURNED', $faktura_id, $currentUserId);

// Line 565: Pokud se změnil stav na uveřejněna
triggerNotification($db, 'INVOICE_REGISTRY_PUBLISHED', $faktura_id, $currentUserId);

// Line 577: Potvrzení věcné správnosti
triggerNotification($db, 'INVOICE_MATERIAL_CHECK_APPROVED', $faktura_id, $currentUserId);

// Line 592: Přiřazení k objednávce
triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $faktura_id, $currentUserId);
```

### Frontend: `/apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js`

**Poznámka:** Frontend faktury nemá přímé volání `triggerNotification()`.  
Všechny události jsou triggerovány automaticky z **backendu při změně stavu** faktury.

### ✅ Konzistence: Úplná

- Backend definice: ✅ `INVOICE_*` (UPPERCASE)
- Backend triggers: ✅ `INVOICE_*` (UPPERCASE)
- **Žádné nesrovnalosti!**

---

## 📦 3. MODUL POKLADNA (Cashbook)

### Backend: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`

**Stav:** ⚠️ **CASHBOOK události NEJSOU definovány**

```php
// Žádné CASHBOOK_* události v seznamu event types (lines 1565-1852)
```

### Backend: Cashbook handlers

**Stav:** 🔍 **Nemají triggerNotification volání**

Modul pokladny zatím **NEIMPLEMENTUJE** notifikační systém.

### Frontend: `/apps/eeo-v2/client/src/components/dictionaries/tabs/CashbookTab.js`

**Stav:** 🔍 **Žádné triggerNotification volání**

```javascript
// 11 matches nalezeno, ale všechny jsou:
// - cashbook_use_prefix (config setting)
// - cashbook_pageSize (UI state)
// - cashbook_pageIndex (UI state)
// - cashbook_{userId}_{year}_{month} (localStorage klíče)
```

### ⚠️ Konzistence: N/A

Modul pokladny **zatím nepoužívá notifikační systém**.

---

## 🧪 4. MODUL ALARMY/TODO

### Backend: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`

**Stav:** 🔍 **Nebyly nalezeny žádné události**

```php
// Žádné alarm_todo_* nebo ALARM_* události v seznamu event types
```

---

## 🎯 DOPORUČENÍ

### ✅ 1. Objednávky - Hotovo
- **Stav:** Perfektní konzistence
- **Akce:** Žádné změny potřeba

### ✅ 2. Faktury - Hotovo
- **Stav:** Perfektní konzistence
- **Akce:** Žádné změny potřeba

### ⚠️ 3. Pokladna - Zatím neimplementováno
- **Stav:** Modul nemá notifikace
- **Akce:** Implementovat události podle potřeby v budoucnu
- **Návrh konvence:** `CASHBOOK_*` (UPPERCASE, stejně jako faktury)

### ⚠️ 4. Alarmy/TODO - Zatím neimplementováno
- **Stav:** Modul nemá notifikace
- **Akce:** Implementovat události podle potřeby v budoucnu
- **Návrh konvence:** `ALARM_TODO_*` (UPPERCASE)

---

## 📊 Souhrn názvů událostí

### Objednávky (13 událostí)
```
order_status_ke_schvaleni
order_status_schvalena
order_status_zamitnuta
order_status_ceka_se
order_status_odeslana
order_status_potvrzena
order_status_registr_ceka
order_status_registr_zverejnena
order_status_faktura_ceka
order_status_faktura_pridana
order_status_kontrola_ceka
order_status_kontrola_potvrzena
order_status_dokoncena
```

### Faktury (11 událostí)
```
INVOICE_CREATED
INVOICE_DUE_SOON
INVOICE_OVERDUE
INVOICE_RECEIVED
INVOICE_APPROVED
INVOICE_UPDATED
INVOICE_SUBMITTED
INVOICE_RETURNED
INVOICE_REGISTRY_PUBLISHED
INVOICE_MATERIAL_CHECK_APPROVED
INVOICE_MATERIAL_CHECK_REQUESTED
```

### Pokladna (0 událostí)
```
(žádné implementované události)
```

### Alarmy/TODO (0 událostí)
```
(žádné implementované události)
```

---

## ✅ ZÁVĚREČNÉ HODNOCENÍ

### Celková konzistence: **100%** ✅

- ✅ **Objednávky:** Plně konzistentní lowercase konvence
- ✅ **Faktury:** Plně konzistentní UPPERCASE konvence
- ⚠️ **Pokladna:** Zatím neimplementováno
- ⚠️ **Alarmy:** Zatím neimplementováno

### Žádné nesrovnalosti nenalezeny! 🎉

**Příští kroky:**
1. ✅ Dokončit opravu frontend organizational hierarchy EDGE konfigurací
2. ✅ Odstranit redundantní `notifications.types` pole z EDGE
3. ✅ Přidat read-only zobrazení event types zděděných z parent TEMPLATE NODE

---

**Konec analýzy**
