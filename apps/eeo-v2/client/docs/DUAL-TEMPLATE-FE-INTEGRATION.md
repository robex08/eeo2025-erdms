# Frontend Integrace Dual-Template Notifikací

## 📋 Přehled

Implementace odesílání **dual-template emailových notifikací** (APPROVER + SUBMITTER) při vytvoření nebo změně objednávky na stav **ODESLANA_KE_SCHVALENI**.

## ✅ Implementované Komponenty

### 1. **Frontend Service** (`notificationService.js`)

#### Nová metoda: `sendOrderApprovalNotifications()`

```javascript
await notificationServiceDual.sendOrderApprovalNotifications({
  token,
  username,
  orderData: {
    id: orderId,
    ev_cislo: orderNumber,
    predmet: formData.predmet,
    prikazce_id: formData.prikazce_id,
    garant_id: formData.garant_uzivatel_id,
    vytvoril: formData.objednatel_id,
    objednatel_id: formData.objednatel_id,
    dodavatel_nazev: formData.dodavatel_nazev,
    financovani_display: formData.zpusob_financovani,
    max_price_with_dph: formData.max_cena_s_dph
  }
});
```

**Funkce:**
- Sestaví pole příjemců s **deduplikací** (Set)
- APPROVER: `prikazce_id` (vždy)
- SUBMITTER: `garant_id`, `vytvoril`, `objednatel_id` (kromě `prikazce_id`)
- Volá API endpoint `/notifications/send-dual`
- **Non-blocking error handling** (nerozbije workflow)

---

### 2. **Backend Handler** (`handlers.php`)

#### Funkce: `handle_notifications_send_dual()`

**Vstup:**
```json
{
  "token": "xxx",
  "username": "user",
  "order_id": 123,
  "order_number": "EEO-2025-001",
  "order_subject": "Předmět objednávky",
  "commander_id": 5,
  "garant_id": 10,
  "creator_id": 15,
  "supplier_name": "Dodavatel s.r.o.",
  "funding": "04-EU fondy",
  "max_price": "50 000 Kč",
  "recipients": [5, 10, 15]
}
```

**Proces:**
1. ✅ **Ověření tokenu**
2. ✅ **Načtení šablony** z `25_notification_templates` (type = `order_status_ke_schvaleni`)
3. ✅ **Pro každého příjemce:**
   - Načíst `email` a `nastaveni` z `users` tabulky
   - **Zkontrolovat nastavení:**
     - `notifikace.email` - pokud `false` → **SKIP EMAIL**
   - Detekovat typ příjemce: `APPROVER` (příkazce) / `SUBMITTER` (ostatní)
   - Extrahovat správnou HTML šablonu pomocí `get_email_template_by_recipient()`
   - Nahradit placeholdery
   - **Odeslat email** (pokud enabled)

⚠️ **DŮLEŽITÉ:** In-app notifikace (zvonečky) se **NEODESÍLAJÍ zde**! Ty už odešle standardní notifikační systém (`sendOrderNotifications()` v OrderForm25.js). Tato funkce odesílá **POUZE dual-template emaily**.

**Výstup:**
```json
{
  "status": "ok",
  "sent_email": 2,
  "total": 3,
  "results": [
    {
      "user_id": 5,
      "email": "prikazce@example.com",
      "sent_email": true,
      "email_enabled": true,
      "system_enabled": true,
      "error": null
    }
  ]
}
```

---

### 3. **OrderForm25.js Integrace**

#### Místo volání 1: **INSERT** (nová objednávka) - řádek ~9530

```javascript
// 🔔 Odeslat notifikace při vytvoření nové objednávky
if (hasWorkflowState(workflowKod, 'ODESLANA_KE_SCHVALENI')) {
  try {
    await notificationServiceDual.sendOrderApprovalNotifications({
      token,
      username,
      orderData: { ... }
    });
  } catch (dualError) {
    addDebugLog('warning', 'NOTIFICATION', 'dual-error-new', ...);
  }
}
```

#### Místo volání 2: **UPDATE** (změna stavu) - řádek ~9975

```javascript
// Odeslat notifikace při změně workflow stavu
const hasKeSchvaleni = hasWorkflowState(result.stav_workflow_kod, 'ODESLANA_KE_SCHVALENI');
const hadKeSchvaleni = oldWorkflowKod ? hasWorkflowState(oldWorkflowKod, 'ODESLANA_KE_SCHVALENI') : false;

if (hasKeSchvaleni && !hadKeSchvaleni) {
  try {
    await notificationServiceDual.sendOrderApprovalNotifications({ ... });
  } catch (dualError) { ... }
}
```

**Podmínka spuštění:**
- **První save** s workflow stavem `ODESLANA_KE_SCHVALENI`
- UPDATE: `hasKeSchvaleni && !hadKeSchvaleni` (přechod na tento stav)

---

## 🎨 Email Šablony

### APPROVER (Červená - pro příkazce)
```html
<!-- Gradient: #dc3545 → #c82333 -->
<div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
  <h1>🔴 KE SCHVÁLENÍ</h1>
  <p>Byla vytvořena nová objednávka, kterou je třeba schválit.</p>
</div>
```

### SUBMITTER (Zelená - pro garant/autor)
```html
<!-- Gradient: #28a745 → #218838 -->
<div style="background: linear-gradient(135deg, #28a745 0%, #218838 100%);">
  <h1>✅ ODESLÁNA KE SCHVÁLENÍ</h1>
  <p>Objednávka byla úspěšně odeslána ke schválení příkazcem.</p>
</div>
```

**Placeholdery:**
- `{order_number}` - ev_cislo
- `{predmet}` - název objednávky
- `{dodavatel_nazev}` - dodavatel
- `{financovani_display}` - způsob financování
- `{max_price_with_dph}` - maximální cena

---

## 🗄️ Databázová Struktura

### Tabulka: `25_notification_templates`

| Sloupec | Hodnota |
|---------|---------|
| `id` | 2 |
| `type` | `order_status_ke_schvaleni` |
| `email_subject` | `EEO: Nová objednávka ke schválení #{order_number}` |
| `email_body` | 13,502 znaků (APPROVER 6,875 + SUBMITTER 6,567) |
| `app_title` | `{action_icon} Ke schválení: {order_number}` |
| `app_message` | Text pro zvoneček notifikaci |

**Delimitery v `email_body`:**
```html
<!-- RECIPIENT: APPROVER -->
...HTML šablona pro příkazce...

<!-- RECIPIENT: SUBMITTER -->
...HTML šablona pro garant/autor...
```

### Tabulka: `25_notifications` (in-app notifikace)

| Sloupec | Popis |
|---------|-------|
| `type` | `order_status_ke_schvaleni` |
| `title` | Krátký titulek |
| `message` | Dlouhý text s placeholdery |
| `from_user_id` | Kdo akci provedl |
| `to_user_id` | Komu je notifikace určena |
| `priority` | `high` |
| `related_object_type` | `order` |
| `related_object_id` | ID objednávky |

---

## ⚙️ User Settings (nastavení notifikací)

### Tabulka: `users` → sloupec `nastaveni` (JSON)

```json
{
  "notifikace": {
    "email": true,    // Posílat emaily
    "system": true    // Zobrazit v zvoničku
  }
}
```

**Backend kontrola:**
```php
$settings = json_decode($user['nastaveni'], true);
$email_enabled = isset($settings['notifikace']['email']) ? (bool)$settings['notifikace']['email'] : true;
$system_enabled = isset($settings['notifikace']['system']) ? (bool)$settings['notifikace']['system'] : true;
```

**Výchozí chování:** Pokud chybí nastavení → `true` (odesílat)

---

## 🔄 Workflow Trigger

### Kdy se odesílají notifikace?

1. **Nová objednávka** (INSERT)
   - Automaticky má `stav_workflow_kod: ["ODESLANA_KE_SCHVALENI"]`
   - Odesílá se **vždy**

2. **Update objednávky** (UPDATE)
   - Kontrola změny stavu: `hasKeSchvaleni && !hadKeSchvaleni`
   - Odesílá se **pouze při prvním přechodu** na tento stav

### Deduplikace příjemců

```javascript
const recipientSet = new Set();

// APPROVER
if (orderData.prikazce_id) {
  recipientSet.add(orderData.prikazce_id);
}

// SUBMITTER (vynechat příkazce)
if (orderData.garant_id && orderData.garant_id !== orderData.prikazce_id) {
  recipientSet.add(orderData.garant_id);
}
if (orderData.vytvoril && orderData.vytvoril !== orderData.prikazce_id) {
  recipientSet.add(orderData.vytvoril);
}
if (orderData.objednatel_id && orderData.objednatel_id !== orderData.prikazce_id) {
  recipientSet.add(orderData.objednatel_id);
}

const recipients = Array.from(recipientSet);
```

**Pravidlo:** Pokud je `objednatel_id === garant_id` → odesílá se **jen 1 email** typu SUBMITTER

---

## 🧪 Testing Checklist

### Backend Test
```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/
php test-dual-template.php
```

**Očekávaný výstup:**
```
✅ TEST 1: Template loaded (13502 chars)
✅ TEST 2: APPROVER extracted (6875 chars)
✅ TEST 3: SUBMITTER extracted (6567 chars)
✅ TEST 4: APPROVER contains correct gradient
✅ TEST 5: SUBMITTER contains correct gradient
```

### Frontend Test
1. **Vytvořit novou objednávku** v OrderForm25
2. Zkontrolovat **Debug Console**:
   ```
   ✅ [NOTIFICATION] dual-sent-new: Dual-template notifikace odeslána...
   ```
3. Zkontrolovat **email doručení** (SMTP akp-it-smtp01.zzssk.zachranka.cz:25)
4. Zkontrolovat **in-app notifikace** (zvoneček v UI)

### User Settings Test
1. Vypnout `notifikace.email` v ProfilePage
2. Vytvořit objednávku
3. Ověřit že **email NEBYL odeslán**
4. Ověřit že **in-app notifikace BYLA vytvořena** (pokud system=true)

---

## 📁 Soubory

| Soubor | Popis |
|--------|-------|
| `/apps/eeo-v2/client/src/services/notificationService.js` | Frontend service s metodou `sendOrderApprovalNotifications()` |
| `/apps/eeo-v2/client/src/forms/OrderForm25.js` | Integrace do workflow (řádky ~9530, ~9975) |
| `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php` | Backend handler `handle_notifications_send_dual()` |
| `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/email-template-helper.php` | Helper funkce pro extrakci šablon |
| `/apps/eeo-v2/api-legacy/api.eeo/api.php` | API routing pro `/notifications/send-dual` |
| `/docs/setup/update-notification-ke-schvaleni-dual.sql` | DB update script |

---

## 🚀 Deployment Checklist

- [x] Frontend service method implementována
- [x] Backend handler implementován
- [x] API routing nakonfigurován
- [x] User settings check přidán
- [x] In-app notifikace implementována
- [x] OrderForm25 integrace (INSERT + UPDATE)
- [x] Email template délka validována (13,502 znaků)
- [x] Deduplikace příjemců funguje
- [x] Non-blocking error handling
- [ ] **DB update script spuštěn** (update-notification-ke-schvaleni-dual.sql)
- [ ] **Production test** (vytvoření testovací objednávky)
- [ ] **Email delivery ověření** (kontrola SMTP logů)
- [ ] **User settings test** (vypnout/zapnout notifikace)

---

## 🐛 Debugging

### Backend log
```php
error_log("📧📧 DUAL NOTIFICATION REQUEST: " . json_encode($input));
error_log("📧 User {$user['username']} (ID: $user_id) - Email: ON/OFF, System: ON/OFF");
error_log("📧 Extrahována šablona APPROVER: 6875 znaků");
error_log("📧 Odesílám email na: user@example.com (typ: APPROVER)");
error_log("🔔 In-app notifikace vytvořena pro user 5");
```

### Frontend console
```javascript
addDebugLog('success', 'NOTIFICATION', 'dual-sent', `Dual-template notifikace odeslána...`);
addDebugLog('warning', 'NOTIFICATION', 'dual-error', `Chyba při dual-template notifikaci...`);
```

---

## 📧 SMTP Configuration

**Server:** `akp-it-smtp01.zzssk.zachranka.cz:25`  
**Autentizace:** Žádná (relay pro lokální síť)  
**Protokol:** `fsockopen()` v `eeo_mail_send()`

---

## 🔄 Workflow Sekvence

```
1. OrderForm25.js → Uložení objednávky (INSERT nebo UPDATE)
2. Workflow stav: ODESLANA_KE_SCHVALENI detekován
3. ✅ NEJPRVE: sendOrderNotifications() - standardní systém
   - Vytvoří in-app notifikace (zvonečky) pro garant, příkazce, schvalovatel
   - Kontroluje user settings (notifikace.system)
   - Používá existující notifikační infrastrukturu
4. ✅ POTOM: sendOrderApprovalNotifications() - dual-template emaily
   - Odesílá POUZE emaily (zvonečky už jsou vytvořené v kroku 3)
   - Kontroluje user settings (notifikace.email)
   - Extrahuje správnou HTML šablonu podle role (APPROVER/SUBMITTER)
```

**⚠️ KLÍČOVÉ:** Zvonečky a emaily jsou **oddělené systémy**:
- **Zvonečky** → Standardní `sendOrderNotifications()` (stávající logika)
- **Emaily** → Nový `sendOrderApprovalNotifications()` (dual-template)

---

## ✅ Hotovo!

Frontend integrace dual-template notifikací je **kompletní** a připravena k testování v produkčním prostředí.
