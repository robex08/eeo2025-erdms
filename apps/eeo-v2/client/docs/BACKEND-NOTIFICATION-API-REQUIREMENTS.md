# ZADÁNÍ PRO BACKEND: Rozšíření Notifikačního API

**Datum:** 29.10.2025  
**Priority:** HIGH  
**Cíl:** Rozšířit notifikační systém o detailní placeholdery a automatické naplňování dat z objednávek

**⚠️ KRITICKÉ POŽADAVKY:**
- **PHP 5.6** (starší syntax, bez type hints, bez ?? operátoru)
- **MySQL 5.5.43** (bez DEFAULT CURRENT_TIMESTAMP na datetime, použít triggery)

---

## 📋 PŘEHLED ÚKOLŮ

### 1. ✅ SQL Migrace
- [ ] Spustit nový SQL soubor: `NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql`
- [ ] Ověřit, že všechny templates byly vytvořeny (mělo by být 12 order templates + systémové)
- [ ] Zálohovat stará data (tabulka `25_notification_templates_backup_20251029`)
- [ ] Otestovat načtení templates přes API

### 2. 🔧 API Endpointy - NOVÉ/ROZŠÍŘENÉ

#### 2.1 Rozšířit existující endpoint: `POST /notifications/create`

**Současný stav:**
```php
POST /api.eeo/notifications/create
Request: {
  "to_user_id": int,
  "type": string,
  "title": string,
  "message": string,
  "priority": string,
  "data_json": object
}
```

**POŽADOVANÉ ROZŠÍŘENÍ:**

```php
POST /api.eeo/notifications/create
Request: {
  "to_user_id": int,          // ID příjemce (NEBO array pro vícenásobné odeslání)
  "type": string,             // Typ z NOTIFICATION_TYPES (např. "order_status_ke_schvaleni")
  "order_id": int,            // NOVÉ: ID objednávky (pro automatické naplnění placeholderů)
  "action_user_id": int,      // NOVÉ: ID uživatele, který provedl akci
  "additional_data": {        // NOVÉ: Dodatečná data pro placeholdery
    "rejection_reason": string,
    "cancellation_reason": string,
    "custom_message": string,
    ...
  },
  "priority": string,         // Volitelné - přepíše default z templatu
  "send_email": bool,         // Volitelné - přepíše default z templatu
  "template_override": {      // Volitelné - přepíše části templatu
    "app_title": string,
    "app_message": string,
    "email_subject": string,
    "email_body": string
  }
}

Response: {
  "success": bool,
  "notification_id": int,
  "recipients_notified": int,  // Počet úspěšně odeslaných notifikací
  "email_sent": bool,
  "errors": array
}
```

**LOGIKA BACKENDU:**

1. **Načíst template z DB** podle `type`
2. **Načíst data objednávky** podle `order_id` (včetně položek, uživatelů, dodavatele)
3. **Připravit placeholder data:**
   ```php
   $placeholderData = [
     // ZÁKLADNÍ
     'order_number' => $order->number,
     'order_id' => $order->id,
     'order_subject' => $order->subject,
     'order_description' => $order->description,
     'max_price' => formatNumber($order->max_price),
     'max_price_with_dph' => formatNumber($order->max_price_with_dph),
     'workflow_state' => getWorkflowStateName($order->workflow_state),
     'workflow_phase' => $order->workflow_phase,
     
     // OSOBY
     'creator_name' => $order->creator->full_name,
     'creator_id' => $order->creator->id,
     'garant_name' => $order->garant->full_name ?? '-',
     'garant_id' => $order->garant->id ?? null,
     'prikazce_name' => $order->prikazce->full_name ?? '-',
     'prikazce_id' => $order->prikazce->id ?? null,
     'supplier_name' => $order->supplier->name ?? '-',
     'supplier_ic' => $order->supplier->ic ?? '-',
     'supplier_contact' => $order->supplier->contact ?? '-',
     
     // AKCE
     'action_performed_by' => $actionUser->full_name,
     'action_performed_by_id' => $actionUser->id,
     'action_performed_by_label' => getActionLabel($type), // "Schválil", "Zamítl", atd.
     'action_date' => formatDateTime(now()),
     'action_date_short' => formatDate(now()),
     'action_time' => formatTime(now()),
     'creation_date' => formatDateTime($order->created_at),
     
     // SCHVALOVÁNÍ
     'approver_name' => $approver->full_name ?? '-',
     'approver_id' => $approver->id ?? null,
     'approval_date' => formatDateTime($order->approved_at),
     'rejection_reason' => $additionalData['rejection_reason'] ?? '-',
     'cancellation_reason' => $additionalData['cancellation_reason'] ?? '-',
     
     // POLOŽKY
     'items_count' => count($order->items),
     'items_total_bez_dph' => formatNumber($itemsTotalNoDph),
     'items_total_s_dph' => formatNumber($itemsTotalWithDph),
     'items_summary' => generateItemsSummary($order->items, 3), // Max 3 řádky
     
     // ODKAZY
     'app_link' => "https://eeo.domain.cz/orders/{$order->id}",
     'app_link_edit' => "https://eeo.domain.cz/orders/{$order->id}/edit",
     'app_link_approve' => "https://eeo.domain.cz/orders/{$order->id}/approve",
     
     // IKONY
     'action_icon' => getActionIcon($type),
     'priority_icon' => getPriorityIcon($priority),
     
     // POKROČILÉ (volitelné)
     'notification_recipients_list' => implode(', ', $recipientNames),
     'notification_recipients_count' => count($recipients),
     'notification_id' => $notificationId,
     'notification_created' => formatDateTime(now())
   ];
   ```

4. **Nahradit placeholdery v templatu:**
   ```php
   function replacePlaceholders($template, $data) {
     foreach ($data as $key => $value) {
       $template = str_replace('{' . $key . '}', $value, $template);
     }
     // Odstranit nenaplněné placeholdery
     $template = preg_replace('/\{[a-z_]+\}/', '-', $template);
     return $template;
   }
   ```

5. **Vytvořit notifikaci v DB**
6. **Odeslat email** (pokud `send_email = true`)
7. **Vrátit response s počtem odeslaných notifikací**

---

#### 2.2 NOVÝ endpoint: `POST /notifications/preview`

**Účel:** Testování a preview notifikací před odesláním

```php
POST /api.eeo/notifications/preview
Request: {
  "type": string,             // Typ notifikace
  "order_id": int,            // ID objednávky pro data
  "action_user_id": int,      // ID uživatele akce
  "additional_data": object   // Dodatečná data
}

Response: {
  "success": bool,
  "template": {
    "type": string,
    "app_title": string,        // S nahrazenými placeholdery
    "app_message": string,      // S nahrazenými placeholdery
    "email_subject": string,    // S nahrazenými placeholdery
    "email_body": string,       // S nahrazenými placeholdery
    "priority": string,
    "send_email_default": bool
  },
  "placeholders_used": array,   // Seznam použitých placeholderů
  "missing_data": array         // Seznam chybějících dat
}
```

---

#### 2.3 NOVÝ endpoint: `GET /notifications/templates`

**Účel:** Načtení všech aktivních templates (pro admin rozhraní)

```php
GET /api.eeo/notifications/templates
Query: ?active_only=1

Response: {
  "success": bool,
  "templates": [
    {
      "id": int,
      "type": string,
      "name": string,
      "email_subject": string,
      "email_body": string,
      "app_title": string,
      "app_message": string,
      "send_email_default": bool,
      "priority_default": string,
      "active": bool,
      "dt_created": string,
      "dt_updated": string
    }
  ]
}
```

---

#### 2.4 ROZŠÍŘIT endpoint: `POST /notifications/list`

**Současný stav:** Vrací seznam notifikací uživatele

**POŽADOVANÉ ROZŠÍŘENÍ:**

```php
Response: {
  "success": bool,
  "notifications": [
    {
      "id": int,
      "type": string,
      "title": string,
      "message": string,
      "priority": string,
      "is_read": bool,
      "created_at": string,
      "data_json": object,
      // NOVÉ:
      "order_id": int,              // ID objednávky (pokud je to order notifikace)
      "order_number": string,       // Číslo objednávky (pro quick preview)
      "action_user_name": string,   // Jméno uživatele, který provedl akci
      "action_user_id": int         // ID uživatele, který provedl akci
    }
  ]
}
```

---

#### 2.5 NOVÝ endpoint: `POST /notifications/send-bulk`

**Účel:** Hromadné odeslání notifikací (pro adminy, systémové notifikace)

```php
POST /api.eeo/notifications/send-bulk
Request: {
  "recipients": array,          // Array of user IDs
  "type": string,
  "order_id": int,              // Volitelné
  "action_user_id": int,
  "additional_data": object,
  "priority": string,
  "send_email": bool
}

Response: {
  "success": bool,
  "total_sent": int,
  "failed": int,
  "errors": array
}
```

---

### 3. 🛠️ Helper Funkce (PHP Backend)

Vytvořit nové helper funkce v `/api.eeo/lib/notifications.php`:

**⚠️ DŮLEŽITÉ: PHP 5.6 KOMPATIBILITA**
- **BEZ type hints** (int, string, array, bool)
- **BEZ return type declarations**
- **BEZ null coalescing operátoru ??** (použít ternární operátor)
- **BEZ short array syntax []** (použít array())

```php
<?php
// PHP 5.6 Compatible

/**
 * Získá název akce podle typu notifikace
 * @param string $notificationType
 * @return string
 */
function getActionLabel($notificationType) {
  $labels = array(
    'order_status_ke_schvaleni' => 'Odeslal ke schválení',
    'order_status_schvalena' => 'Schválil',
    'order_status_zamitnuta' => 'Zamítl',
    'order_status_ceka_se' => 'Vrátil k doplnění',
    'order_status_odeslana' => 'Odeslal dodavateli',
    'order_status_potvrzena' => 'Potvrzeno dodavatelem',
    'order_status_dokoncena' => 'Dokončil',
    'order_status_zrusena' => 'Zrušil',
    'order_status_smazana' => 'Smazal',
    'order_status_nova' => 'Vytvořil',
    'order_status_rozpracovana' => 'Rozpracoval',
    // NOVÉ - REGISTR
    'order_status_registr_ceka' => 'Čeká na registr',
    'order_status_registr_zverejnena' => 'Zveřejnil v registru',
    // NOVÉ - FAKTURACE
    'order_status_faktura_ceka' => 'Čeká na fakturu',
    'order_status_faktura_pridana' => 'Přidal fakturu',
    'order_status_faktura_schvalena' => 'Schválil fakturu',
    'order_status_faktura_uhrazena' => 'Uhradil fakturu',
    // NOVÉ - VĚCNÁ KONTROLA
    'order_status_kontrola_ceka' => 'Čeká na kontrolu',
    'order_status_kontrola_potvrzena' => 'Potvrdil věcnou správnost',
    'order_status_kontrola_zamitnuta' => 'Zamítl věcnou správnost'
  );
  return isset($labels[$notificationType]) ? $labels[$notificationType] : 'Provedl akci';
}

/**
 * Získá ikonu podle typu notifikace
 * @param string $notificationType
 * @return string
 */
function getActionIcon($notificationType) {
  $icons = array(
    'order_status_nova' => '📝',
    'order_status_ke_schvaleni' => '📋',
    'order_status_schvalena' => '✅',
    'order_status_zamitnuta' => '❌',
    'order_status_ceka_se' => '⏸️',
    'order_status_odeslana' => '📤',
    'order_status_ceka_potvrzeni' => '⏳',
    'order_status_potvrzena' => '✔️',
    'order_status_dokoncena' => '🎉',
    'order_status_zrusena' => '🚫',
    'order_status_smazana' => '🗑️',
    'order_status_rozpracovana' => '📝',
    // NOVÉ
    'order_status_registr_ceka' => '📋',
    'order_status_registr_zverejnena' => '✅',
    'order_status_faktura_ceka' => '💵',
    'order_status_faktura_pridana' => '💰',
    'order_status_faktura_schvalena' => '✅',
    'order_status_faktura_uhrazena' => '💳',
    'order_status_kontrola_ceka' => '🔍',
    'order_status_kontrola_potvrzena' => '✅',
    'order_status_kontrola_zamitnuta' => '❌'
  );
  return isset($icons[$notificationType]) ? $icons[$notificationType] : '📌';
}

/**
 * Získá ikonu podle priority
 * @param string $priority
 * @return string
 */
function getPriorityIcon($priority) {
  $icons = array(
    'urgent' => '🔴',
    'high' => '🟠',
    'normal' => '🟢',
    'low' => '⚪'
  );
  return isset($icons[$priority]) ? $icons[$priority] : '⚪';
}

/**
 * Generuje stručný přehled položek objednávky
 * @param array $items
 * @param int $maxLines
 * @return string
 */
function generateItemsSummary($items, $maxLines) {
  if (empty($items)) {
    return 'Žádné položky';
  }
  
  $lines = array();
  $count = 0;
  
  foreach ($items as $item) {
    if ($count >= $maxLines) {
      $remaining = count($items) - $count;
      $lines[] = "... a {$remaining} dalších položek";
      break;
    }
    $lines[] = "- {$item->name} ({$item->quantity} {$item->unit})";
    $count++;
  }
  
  return implode("\n", $lines);
}

/**
 * Nahradí placeholdery v templatu
 * @param string $template
 * @param array $data
 * @return string
 */
function replacePlaceholders($template, $data) {
  foreach ($data as $key => $value) {
    $placeholder = '{' . $key . '}';
    // PHP 5.6: Řešení NULL hodnot bez ?? operátoru
    $replacement = ($value !== null && $value !== '') ? $value : '-';
    $template = str_replace($placeholder, $replacement, $template);
  }
  
  // Odstranit nenaplněné placeholdery (nahradit za "-")
  $template = preg_replace('/\{[a-z_]+\}/', '-', $template);
  
  return $template;
}

/**
 * Formátuje číslo s mezerami jako oddělovači tisíců
 * @param float|int $number
 * @return string
 */
function formatNumber($number) {
  return number_format($number, 0, ',', ' ');
}

/**
 * Formátuje datum a čas (PHP 5.6 compatible)
 * @param string|null $datetime
 * @return string
 */
function formatDateTime($datetime) {
  if (empty($datetime)) {
    return '-';
  }
  return date('d.m.Y H:i', strtotime($datetime));
}

/**
 * Formátuje datum (PHP 5.6 compatible)
 * @param string|null $datetime
 * @return string
 */
function formatDate($datetime) {
  if (empty($datetime)) {
    return '-';
  }
  return date('d.m.Y', strtotime($datetime));
}

/**
 * Formátuje čas (PHP 5.6 compatible)
 * @param string|null $datetime
 * @return string
 */
function formatTime($datetime) {
  if (empty($datetime)) {
    return '-';
  }
  return date('H:i', strtotime($datetime));
}

/**
 * Získá název stavu workflow
 * @param string $state
 * @return string
 */
function getWorkflowStateName($state) {
  $states = array(
    'nova' => 'Nová',
    'ke_schvaleni' => 'Ke schválení',
    'schvalena' => 'Schválena',
    'zamitnuta' => 'Zamítnuta',
    'ceka_se' => 'Čeká se',
    'odeslana' => 'Odeslána',
    'ceka_potvrzeni' => 'Čeká na potvrzení',
    'potvrzena' => 'Potvrzena',
    'registr' => 'V registru',
    'fakturace' => 'Fakturace',
    'kontrola' => 'Kontrola věcné správnosti',
    'zkontrolovana' => 'Zkontrolována',
    'dokoncena' => 'Dokončena',
    'zrusena' => 'Zrušena',
    'smazana' => 'Smazána',
    'rozpracovana' => 'Rozpracována'
  );
  return isset($states[$state]) ? $states[$state] : $state;
}

/**
 * Získá data objednávky pro placeholdery (PHP 5.6 compatible)
 * @param int $orderId
 * @param int $actionUserId
 * @param array $additionalData
 * @return array
 */
function getOrderPlaceholderData($orderId, $actionUserId, $additionalData) {
  // Výchozí hodnoty pro $additionalData
  if (!is_array($additionalData)) {
    $additionalData = array();
  }
  
  // TODO: Načíst data z DB
  $order = loadOrderById($orderId);
  $actionUser = loadUserById($actionUserId);
  
  // Spočítat celkové ceny položek
  $itemsTotalNoDph = 0;
  $itemsTotalWithDph = 0;
  foreach ($order->items as $item) {
    $itemsTotalNoDph += $item->price_bez_dph * $item->quantity;
    $itemsTotalWithDph += $item->price_s_dph * $item->quantity;
  }
  
  // Spočítat faktury
  $invoicesCount = is_array($order->faktury) ? count($order->faktury) : 0;
  
  // PHP 5.6: BEZ short array syntax []
  return array(
    // ZÁKLADNÍ
    'order_number' => $order->number,
    'order_id' => $order->id,
    'order_subject' => isset($order->subject) ? $order->subject : '-',
    'order_description' => isset($order->description) ? $order->description : '-',
    'max_price' => formatNumber($order->max_price),
    'max_price_with_dph' => formatNumber($order->max_price_with_dph),
    'workflow_state' => getWorkflowStateName($order->workflow_state),
    'workflow_phase' => $order->workflow_phase,
    
    // OSOBY
    'creator_name' => $order->creator->full_name,
    'creator_id' => $order->creator->id,
    'garant_name' => isset($order->garant->full_name) ? $order->garant->full_name : '-',
    'garant_id' => isset($order->garant->id) ? $order->garant->id : null,
    'prikazce_name' => isset($order->prikazce->full_name) ? $order->prikazce->full_name : '-',
    'prikazce_id' => isset($order->prikazce->id) ? $order->prikazce->id : null,
    'supplier_name' => isset($order->supplier->name) ? $order->supplier->name : '-',
    'supplier_ic' => isset($order->supplier->ic) ? $order->supplier->ic : '-',
    'supplier_contact' => isset($order->supplier->contact) ? $order->supplier->contact : '-',
    
    // AKCE
    'action_performed_by' => $actionUser->full_name,
    'action_performed_by_id' => $actionUser->id,
    'action_performed_by_label' => getActionLabel(isset($order->type) ? $order->type : 'order_status_nova'),
    'action_date' => formatDateTime(date('Y-m-d H:i:s')),
    'action_date_short' => formatDate(date('Y-m-d H:i:s')),
    'action_time' => formatTime(date('Y-m-d H:i:s')),
    'creation_date' => formatDateTime($order->created_at),
    
    // SCHVALOVÁNÍ
    'approver_name' => isset($order->approver->full_name) ? $order->approver->full_name : '-',
    'approver_id' => isset($order->approver->id) ? $order->approver->id : null,
    'approval_date' => formatDateTime($order->approved_at),
    'rejection_reason' => isset($additionalData['rejection_reason']) ? $additionalData['rejection_reason'] : '-',
    'cancellation_reason' => isset($additionalData['cancellation_reason']) ? $additionalData['cancellation_reason'] : '-',
    
    // POLOŽKY
    'items_count' => count($order->items),
    'items_total_bez_dph' => formatNumber($itemsTotalNoDph),
    'items_total_s_dph' => formatNumber($itemsTotalWithDph),
    'items_summary' => generateItemsSummary($order->items, 3),
    
    // REGISTR SMLUV
    'registr_iddt' => isset($order->registr_iddt) ? $order->registr_iddt : '-',
    'dt_zverejneni' => formatDate($order->dt_zverejneni),
    'ma_byt_zverejnena' => ($order->ma_byt_zverejnena == 1) ? 'Ano' : 'Ne',
    
    // FAKTURY
    'invoices_count' => $invoicesCount,
    'invoice_number' => isset($additionalData['invoice_number']) ? $additionalData['invoice_number'] : '-',
    'invoice_amount' => isset($additionalData['invoice_amount']) ? formatNumber($additionalData['invoice_amount']) : '-',
    'invoice_date' => isset($additionalData['invoice_date']) ? formatDate($additionalData['invoice_date']) : '-',
    'invoice_due_date' => isset($additionalData['invoice_due_date']) ? formatDate($additionalData['invoice_due_date']) : '-',
    'invoice_paid_date' => isset($additionalData['invoice_paid_date']) ? formatDate($additionalData['invoice_paid_date']) : '-',
    'invoice_status' => isset($additionalData['invoice_status']) ? $additionalData['invoice_status'] : '-',
    
    // VĚCNÁ SPRÁVNOST
    'asset_location' => isset($order->vecna_spravnost_umisteni_majetku) ? $order->vecna_spravnost_umisteni_majetku : '-',
    'vecna_spravnost_poznamka' => isset($order->vecna_spravnost_poznamka) ? $order->vecna_spravnost_poznamka : '-',
    'kontroloval_name' => isset($order->potvrdil_vecnou_spravnost_name) ? $order->potvrdil_vecnou_spravnost_name : '-',
    'dt_potvrzeni_vecne_spravnosti' => formatDateTime($order->dt_potvrzeni_vecne_spravnosti),
    
    // ODKAZY
    'app_link' => "https://eeo.domain.cz/orders/{$order->id}",
    'app_link_edit' => "https://eeo.domain.cz/orders/{$order->id}/edit",
    'app_link_approve' => "https://eeo.domain.cz/orders/{$order->id}/approve",
    
    // IKONY
    'action_icon' => getActionIcon(isset($order->type) ? $order->type : 'order_status_nova'),
    'priority_icon' => getPriorityIcon(isset($order->priority) ? $order->priority : 'normal')
  );
}

/**
 * Získá stav faktury slovně
 * @param string $status
 * @return string
 */
function getInvoiceStatusName($status) {
  $statuses = array(
    'nova' => 'Nová',
    'schvalena' => 'Schválená',
    'uhrazena' => 'Uhrazená',
    'storno' => 'Storno'
  );
  return isset($statuses[$status]) ? $statuses[$status] : $status;
}
```

---

### 4. 📧 Email Implementace

#### 4.1 Konfigurace SMTP

Vytvořit konfigurační soubor `/api.eeo/config/email.php`:

```php
<?php
return [
  'smtp_host' => 'smtp.domain.cz',
  'smtp_port' => 587,
  'smtp_username' => 'notifications@domain.cz',
  'smtp_password' => '***',
  'smtp_encryption' => 'tls',
  'from_email' => 'notifications@domain.cz',
  'from_name' => 'Systém EEO',
  'reply_to' => 'podpora@domain.cz'
];
```

#### 4.2 Email Sender

Vytvořit `/api.eeo/lib/email-sender.php`:

```php
<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendNotificationEmail($toEmail, $toName, $subject, $body) {
  $config = require(__DIR__ . '/../config/email.php');
  
  $mail = new PHPMailer(true);
  
  try {
    // SMTP konfigurace
    $mail->isSMTP();
    $mail->Host = $config['smtp_host'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['smtp_username'];
    $mail->Password = $config['smtp_password'];
    $mail->SMTPSecure = $config['smtp_encryption'];
    $mail->Port = $config['smtp_port'];
    $mail->CharSet = 'UTF-8';
    
    // Odesílatel
    $mail->setFrom($config['from_email'], $config['from_name']);
    $mail->addReplyTo($config['reply_to']);
    
    // Příjemce
    $mail->addAddress($toEmail, $toName);
    
    // Obsah
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = nl2br($body); // Převést \n na <br>
    $mail->AltBody = strip_tags($body);
    
    $mail->send();
    return ['success' => true];
  } catch (Exception $e) {
    return [
      'success' => false,
      'error' => $mail->ErrorInfo
    ];
  }
}
```

---

### 5. 🔒 Bezpečnost a Validace

#### 5.1 XSS Prevence

```php
function sanitizeForHtml($text) {
  return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
}

// Použití při naplňování placeholderů:
$placeholderData['order_subject'] = sanitizeForHtml($order->subject);
```

#### 5.2 Validace Placeholderů

```php
function validateTemplate($template) {
  // Kontrola neznámých placeholderů
  $knownPlaceholders = [
    'order_number', 'order_subject', 'creator_name', 'max_price', 
    'action_performed_by', 'action_date', 'garant_name', ...
  ];
  
  preg_match_all('/\{([a-z_]+)\}/', $template, $matches);
  $unknownPlaceholders = array_diff($matches[1], $knownPlaceholders);
  
  if (!empty($unknownPlaceholders)) {
    return [
      'valid' => false,
      'error' => 'Unknown placeholders: ' . implode(', ', $unknownPlaceholders)
    ];
  }
  
  return ['valid' => true];
}
```

---

### 6. 📊 Monitoring a Logy

#### 6.1 Log Odeslaných Notifikací

Vytvořit tabulku pro detailní logy:

```sql
CREATE TABLE `25_notification_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `type` varchar(100) NOT NULL,
  `email_sent` tinyint(1) DEFAULT 0,
  `email_sent_at` datetime DEFAULT NULL,
  `email_error` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notification_id` (`notification_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 7. ✅ Testovací Checklist

- [ ] SQL migrace proběhla úspěšně
- [ ] Všechny templates jsou v DB
- [ ] Endpoint `/notifications/create` rozšířen
- [ ] Endpoint `/notifications/preview` vytvořen
- [ ] Endpoint `/notifications/templates` vytvořen
- [ ] Endpoint `/notifications/send-bulk` vytvořen
- [ ] Helper funkce implementovány
- [ ] Placeholder replacement funguje
- [ ] Email odesílání funguje (test email)
- [ ] XSS prevence implementována
- [ ] Validace placeholderů funguje
- [ ] Logy se zapisují do DB
- [ ] Testováno na testovací objednávce
- [ ] Performance test (100+ notifikací najednou)

---

### 8. 🚀 Deployment Postup

1. **Záloha DB:**
   ```bash
   mysqldump -u user -p evidence_smluv > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Spustit SQL migrace:**
   ```bash
   mysql -u user -p evidence_smluv < NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql
   ```

3. **Deploy backend kódu:**
   - Nahrát nové soubory do `/api.eeo/`
   - Ověřit oprávnění souborů

4. **Konfigurace emailů:**
   - Nastavit SMTP údaje v `config/email.php`
   - Otestovat odesílání testovacího emailu

5. **Test API endpointů:**
   ```bash
   # Test preview
   curl -X POST https://eeo.domain.cz/api.eeo/notifications/preview \
     -H "Content-Type: application/json" \
     -d '{"type":"order_status_ke_schvaleni","order_id":123,"action_user_id":1}'
   
   # Test create
   curl -X POST https://eeo.domain.cz/api.eeo/notifications/create \
     -H "Content-Type: application/json" \
     -d '{"to_user_id":2,"type":"order_status_ke_schvaleni","order_id":123,"action_user_id":1}'
   ```

6. **Monitoring:**
   - Sledovat error logy: `/api.eeo/logs/error.log`
   - Sledovat email delivery rate

---

### 9. 📞 Kontakt

**Frontend vývojář:** [Jméno]  
**Backend vývojář:** [Jméno]  
**Priority:** HIGH - nutné dokončit do [Datum]

---

## 💡 Příklady Použití

### Příklad 1: Odeslat notifikaci při schválení objednávky

```php
// Backend PHP (PHP 5.6 compatible)
$result = createNotification(array(
  'to_user_id' => $order->creator_id,
  'type' => 'order_status_schvalena',
  'order_id' => $order->id,
  'action_user_id' => $currentUser->id,
  'priority' => 'normal',
  'send_email' => true
));
```

### Příklad 2: Hromadné odeslání při zamítnutí

```php
// Notifikace pro tvůrce, garanta a příkazce (PHP 5.6)
$recipients = array(
  $order->creator_id,
  $order->garant_id,
  $order->prikazce_id
);

$result = sendBulkNotification(array(
  'recipients' => $recipients,
  'type' => 'order_status_zamitnuta',
  'order_id' => $order->id,
  'action_user_id' => $approver->id,
  'additional_data' => array(
    'rejection_reason' => 'Nedostatečné odůvodnění potřeby'
  ),
  'send_email' => true
));
```

### Příklad 3: Přidání faktury k objednávce

```php
// Notifikace při přidání faktury (PHP 5.6)
$result = createNotification(array(
  'to_user_id' => $order->garant_id,
  'type' => 'order_status_faktura_pridana',
  'order_id' => $order->id,
  'action_user_id' => $currentUser->id,
  'additional_data' => array(
    'invoice_number' => $faktura->cislo_faktury,
    'invoice_amount' => $faktura->castka_s_dph,
    'invoice_date' => $faktura->datum_vystaveni,
    'invoice_due_date' => $faktura->datum_splatnosti
  ),
  'send_email' => true
));
```

### Příklad 4: Potvrzení věcné správnosti

```php
// Notifikace po kontrole věcné správnosti (PHP 5.6)
$result = createNotification(array(
  'to_user_id' => $order->creator_id,
  'type' => 'order_status_kontrola_potvrzena',
  'order_id' => $order->id,
  'action_user_id' => $kontrolor->id,
  'additional_data' => array(),
  'send_email' => true
));
```

### Příklad 5: Zveřejnění v registru smluv

```php
// Notifikace po zveřejnění v registru (PHP 5.6)
$recipients = array(
  $order->creator_id,
  $order->garant_id,
  $order->prikazce_id
);

$result = sendBulkNotification(array(
  'recipients' => $recipients,
  'type' => 'order_status_registr_zverejnena',
  'order_id' => $order->id,
  'action_user_id' => $currentUser->id,
  'send_email' => true
));
```

### Příklad 6: Preview notifikace před odesláním

```php
// Frontend může zavolat preview pro kontrolu (PHP 5.6)
$preview = previewNotification(array(
  'type' => 'order_status_ke_schvaleni',
  'order_id' => 123,
  'action_user_id' => 1
));

// Response obsahuje naplněné placeholdery
echo $preview['template']['app_message'];
// "Objednávka 2025-123: "Nákup kancelářských potřeb" (15 000 Kč) čeká na schválení..."
```

---

## ⚠️ Důležité Poznámky

### PHP 5.6 Omezení:
1. **BEZ type hints** - nepoužívat `function foo(int $x, string $y)`
2. **BEZ return types** - nepoužívat `function foo(): string`
3. **BEZ null coalescing** - `??` NEEXISTUJE, použít `isset($x) ? $x : default`
4. **BEZ short array syntax** - místo `[]` použít `array()`
5. **BEZ splat operator** - `...$args` NEEXISTUJE
6. **BEZ anonymous classes** - nepoužívat `new class {}`
7. **Výchozí hodnoty parametrů** - pouze skaláry, ne `$x = []`, použít `$x = null` a pak `if (!$x) $x = array()`

### MySQL 5.5.43 Omezení:
1. **DEFAULT CURRENT_TIMESTAMP** - pouze na **PRVNÍM** TIMESTAMP sloupci v tabulce
2. **ON UPDATE CURRENT_TIMESTAMP** - pouze na TIMESTAMP, ne na DATETIME
3. **Řešení:** Použít **TRIGGER** pro automatické nastavení `dt_created` a `dt_updated`
4. **utf8mb4** NEEXISTUJE - použít `utf8` místo `utf8mb4`
5. **JSON typ** NEEXISTUJE - použít `TEXT` pro JSON data

### Triggery pro datetime sloupce (již v SQL):
```sql
-- Trigger pro dt_created
CREATE TRIGGER `25_notification_templates_before_insert`
BEFORE INSERT ON `25_notification_templates`
FOR EACH ROW
BEGIN
  IF NEW.dt_created IS NULL THEN
    SET NEW.dt_created = NOW();
  END IF;
END;

-- Trigger pro dt_updated
CREATE TRIGGER `25_notification_templates_before_update`
BEFORE UPDATE ON `25_notification_templates`
FOR EACH ROW
BEGIN
  SET NEW.dt_updated = NOW();
END;
```

### Bezpečnost:
1. **Všechny placeholdery musí být escapovány proti XSS**
2. **Email odesílání nesmí blokovat hlavní workflow** (použít queue/async)
3. **Validovat dostupnost dat před nahrazením placeholderů**
4. **Logovat všechny odeslané notifikace pro audit**
5. **Implementovat rate limiting pro ochranu proti spamu**

---

**Prepared by:** Frontend Team  
**Date:** 29.10.2025  
**Version:** 1.0
