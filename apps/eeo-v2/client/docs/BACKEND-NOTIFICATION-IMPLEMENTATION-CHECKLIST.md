# ✅ BACKEND CHECKLIST - Notifikační Systém

**Datum:** 29.10.2025  
**Cíl:** Kompletní implementace notifikačního systému  
**Požadavky:** PHP 5.6, MySQL 5.5.43

---

## 📦 DODANÉ DOKUMENTY

- ✅ `NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql` - SQL migrace s templates
- ✅ `BACKEND-NOTIFICATION-API-REQUIREMENTS.md` - Kompletní API dokumentace
- ✅ `NOTIFICATION-WORKFLOW-PHASES-MAP.md` - Mapa všech 8 fází a jejich notifikací

---

## 🗂️ FÁZE IMPLEMENTACE

### FÁZE 1: Databáze (1-2 hodiny)

- [ ] **1.1** Zálohovat existující tabulku `25_notification_templates`
  ```bash
  mysqldump -u user -p evidence_smluv 25_notification_templates > backup_templates_$(date +%Y%m%d).sql
  ```

- [ ] **1.2** Spustit SQL migraci
  ```bash
  mysql -u user -p evidence_smluv < NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql
  ```

- [ ] **1.3** Ověřit vytvoření tabulky
  ```sql
  SELECT COUNT(*) FROM 25_notification_templates WHERE active = 1;
  -- Mělo by vrátit 21+ templates
  ```

- [ ] **1.4** Ověřit triggery (MySQL 5.5.43)
  ```sql
  SHOW TRIGGERS LIKE '25_notification_templates%';
  -- Měly by být 2 triggery: before_insert, before_update
  ```

- [ ] **1.5** Test INSERT (ověření dt_created automaticky)
  ```sql
  INSERT INTO 25_notification_templates (type, name, app_title, app_message) 
  VALUES ('test', 'Test', 'Test', 'Test');
  
  SELECT dt_created FROM 25_notification_templates WHERE type = 'test';
  -- Mělo by obsahovat aktuální datetime
  
  DELETE FROM 25_notification_templates WHERE type = 'test';
  ```

---

### FÁZE 2: Helper Funkce (2-3 hodiny)

- [ ] **2.1** Vytvořit soubor `/api.eeo/lib/notifications-helpers.php`

- [ ] **2.2** Implementovat funkce (PHP 5.6 compatible):
  - [ ] `getActionLabel($notificationType)` - Název akce
  - [ ] `getActionIcon($notificationType)` - Ikona akce
  - [ ] `getPriorityIcon($priority)` - Ikona priority
  - [ ] `generateItemsSummary($items, $maxLines)` - Přehled položek
  - [ ] `replacePlaceholders($template, $data)` - Nahrazení placeholderů
  - [ ] `formatNumber($number)` - Formátování čísel
  - [ ] `formatDateTime($datetime)` - Formátování data a času
  - [ ] `formatDate($datetime)` - Formátování data
  - [ ] `formatTime($datetime)` - Formátování času
  - [ ] `getWorkflowStateName($state)` - Název stavu workflow
  - [ ] `getOrderPlaceholderData($orderId, $actionUserId, $additionalData)` - Data objednávky
  - [ ] `getInvoiceStatusName($status)` - Název stavu faktury

- [ ] **2.3** Test helper funkcí
  ```php
  // Test formátování
  echo formatNumber(15000); // Mělo by vypsat: 15 000
  echo formatDateTime('2025-10-29 15:30:00'); // Mělo by vypsat: 29.10.2025 15:30
  
  // Test placeholderů
  $template = "Objednávka {order_number} má částku {max_price} Kč";
  $data = array('order_number' => '2025-123', 'max_price' => '15 000');
  echo replacePlaceholders($template, $data);
  // Mělo by vypsat: Objednávka 2025-123 má částku 15 000 Kč
  ```

---

### FÁZE 3: API Endpointy (4-6 hodin)

#### 3.1 Rozšířit `/api.eeo/notifications/create.php`

- [ ] **3.1.1** Přidat nové parametry do request:
  ```php
  $orderId = isset($_POST['order_id']) ? intval($_POST['order_id']) : null;
  $actionUserId = isset($_POST['action_user_id']) ? intval($_POST['action_user_id']) : null;
  $additionalData = isset($_POST['additional_data']) ? $_POST['additional_data'] : array();
  ```

- [ ] **3.1.2** Načíst template z DB podle `type`
  ```php
  $template = getNotificationTemplate($type);
  if (!$template) {
    return error('Template not found');
  }
  ```

- [ ] **3.1.3** Načíst data objednávky (pokud `order_id` zadáno)
  ```php
  if ($orderId) {
    $placeholderData = getOrderPlaceholderData($orderId, $actionUserId, $additionalData);
  }
  ```

- [ ] **3.1.4** Nahradit placeholdery
  ```php
  $appTitle = replacePlaceholders($template['app_title'], $placeholderData);
  $appMessage = replacePlaceholders($template['app_message'], $placeholderData);
  $emailSubject = replacePlaceholders($template['email_subject'], $placeholderData);
  $emailBody = replacePlaceholders($template['email_body'], $placeholderData);
  ```

- [ ] **3.1.5** Vytvořit notifikaci v DB

- [ ] **3.1.6** Odeslat email (pokud `send_email = true`)

- [ ] **3.1.7** Vrátit response s ID notifikace

#### 3.2 Vytvořit `/api.eeo/notifications/preview.php` (NOVÝ)

- [ ] **3.2.1** Implementovat preview endpoint
  ```php
  POST /api.eeo/notifications/preview
  {
    "type": "order_status_ke_schvaleni",
    "order_id": 123,
    "action_user_id": 1
  }
  ```

- [ ] **3.2.2** Vrátit naplněný template (bez uložení do DB)

#### 3.3 Vytvořit `/api.eeo/notifications/templates.php` (NOVÝ)

- [ ] **3.3.1** Implementovat seznam templates
  ```php
  GET /api.eeo/notifications/templates?active_only=1
  ```

- [ ] **3.3.2** Vrátit všechny aktivní templates

#### 3.4 Rozšířit `/api.eeo/notifications/list.php`

- [ ] **3.4.1** Přidat nové sloupce do response:
  - `order_id`
  - `order_number`
  - `action_user_name`
  - `action_user_id`

#### 3.5 Vytvořit `/api.eeo/notifications/send-bulk.php` (NOVÝ)

- [ ] **3.5.1** Implementovat hromadné odesílání
  ```php
  POST /api.eeo/notifications/send-bulk
  {
    "recipients": [1, 2, 3],
    "type": "order_status_schvalena",
    "order_id": 123
  }
  ```

---

### FÁZE 4: Email Systém (2-3 hodiny)

- [ ] **4.1** Vytvořit `/api.eeo/config/email.php` - konfigurace SMTP

- [ ] **4.2** Vytvořit `/api.eeo/lib/email-sender.php`
  - [ ] Implementovat `sendNotificationEmail()` funkci
  - [ ] Použít PHPMailer (kompatibilní s PHP 5.6)

- [ ] **4.3** Test odesílání emailu
  ```php
  $result = sendNotificationEmail(
    'test@domain.cz',
    'Test User',
    'Test předmět',
    'Test tělo emailu'
  );
  ```

- [ ] **4.4** Implementovat email queue (volitelné, doporučené)
  - Zabránit blokování hlavního workflow
  - Použít tabulku `email_queue` nebo externí systém

---

### FÁZE 5: Bezpečnost & Validace (1-2 hodiny)

- [ ] **5.1** XSS prevence
  ```php
  function sanitizeForHtml($text) {
    return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
  }
  ```

- [ ] **5.2** Validace placeholderů
  ```php
  function validateTemplate($template) {
    // Kontrola neznámých placeholderů
  }
  ```

- [ ] **5.3** Rate limiting
  - Max 100 notifikací za minutu na uživatele
  - Ochrana proti spamu

- [ ] **5.4** SQL injection prevence
  - Všechny parametry escapovat přes `mysqli_real_escape_string()`
  - Nebo použít prepared statements (doporučeno)

---

### FÁZE 6: Logging & Monitoring (1 hodina)

- [ ] **6.1** Vytvořit tabulku `25_notification_logs`
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
    `created_at` datetime DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_notification_id` (`notification_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_order_id` (`order_id`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  ```

- [ ] **6.2** Implementovat logování všech odeslaných notifikací

- [ ] **6.3** Error logging do `/api.eeo/logs/notifications-error.log`

---

### FÁZE 7: Testování (2-3 hodiny)

#### 7.1 Unit testy helper funkcí

- [ ] Test `getActionLabel()` - všechny typy
- [ ] Test `formatNumber()` - různé hodnoty
- [ ] Test `formatDateTime()` - různé formáty
- [ ] Test `replacePlaceholders()` - komplexní template
- [ ] Test `generateItemsSummary()` - 0, 1, 3, 10 položek

#### 7.2 Integrace testy API

- [ ] **Test 1:** Vytvořit notifikaci bez `order_id`
  ```bash
  curl -X POST http://localhost/api.eeo/notifications/create \
    -d "type=order_status_nova&to_user_id=1&action_user_id=1"
  ```

- [ ] **Test 2:** Vytvořit notifikaci s `order_id`
  ```bash
  curl -X POST http://localhost/api.eeo/notifications/create \
    -d "type=order_status_ke_schvaleni&to_user_id=2&order_id=123&action_user_id=1"
  ```

- [ ] **Test 3:** Preview notifikace
  ```bash
  curl -X POST http://localhost/api.eeo/notifications/preview \
    -d "type=order_status_schvalena&order_id=123&action_user_id=1"
  ```

- [ ] **Test 4:** Hromadné odeslání
  ```bash
  curl -X POST http://localhost/api.eeo/notifications/send-bulk \
    -d "recipients=[1,2,3]&type=order_status_dokoncena&order_id=123"
  ```

- [ ] **Test 5:** Odeslání emailu
  - Ověřit přijetí emailu v inbox
  - Kontrola formátování textu
  - Kontrola UTF-8 znaků (háčky, čárky)

#### 7.3 Test všech 21 typů notifikací

- [ ] `order_status_nova`
- [ ] `order_status_rozpracovana`
- [ ] `order_status_ke_schvaleni`
- [ ] `order_status_schvalena`
- [ ] `order_status_zamitnuta`
- [ ] `order_status_ceka_se`
- [ ] `order_status_odeslana`
- [ ] `order_status_ceka_potvrzeni`
- [ ] `order_status_potvrzena`
- [ ] `order_status_registr_ceka`
- [ ] `order_status_registr_zverejnena`
- [ ] `order_status_faktura_ceka`
- [ ] `order_status_faktura_pridana`
- [ ] `order_status_faktura_schvalena`
- [ ] `order_status_faktura_uhrazena`
- [ ] `order_status_kontrola_ceka`
- [ ] `order_status_kontrola_potvrzena`
- [ ] `order_status_kontrola_zamitnuta`
- [ ] `order_status_dokoncena`
- [ ] `order_status_zrusena`
- [ ] `order_status_smazana`

#### 7.4 Performance test

- [ ] Test: 100 notifikací najednou (bulk)
- [ ] Test: 1000 notifikací během 1 minuty
- [ ] Měřit response time (mělo by být < 200ms)
- [ ] Kontrola memory usage

---

### FÁZE 8: Dokumentace (1 hodina)

- [ ] **8.1** Vytvořit `/api.eeo/docs/notifications-api.md`
  - Popis všech endpointů
  - Request/Response příklady
  - Error codes

- [ ] **8.2** Vytvořit `/api.eeo/docs/notifications-placeholders.md`
  - Seznam všech placeholderů
  - Příklady použití

- [ ] **8.3** Vytvořit `/api.eeo/docs/notifications-troubleshooting.md`
  - Časté problémy a řešení
  - Debug tipy

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Všechny testy prošly ✅
- [ ] Code review dokončen
- [ ] Záloha databáze provedena
- [ ] Záloha existujících API souborů

### Deployment

- [ ] **Krok 1:** Upload nových souborů na server
  ```
  /api.eeo/lib/notifications-helpers.php
  /api.eeo/lib/email-sender.php
  /api.eeo/config/email.php
  /api.eeo/notifications/preview.php
  /api.eeo/notifications/templates.php
  /api.eeo/notifications/send-bulk.php
  ```

- [ ] **Krok 2:** Aktualizovat existující soubory
  ```
  /api.eeo/notifications/create.php
  /api.eeo/notifications/list.php
  ```

- [ ] **Krok 3:** Spustit SQL migraci
  ```bash
  mysql -u user -p evidence_smluv < NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql
  ```

- [ ] **Krok 4:** Nastavit SMTP konfiguraci v `email.php`

- [ ] **Krok 5:** Test na produkci
  - Vytvořit testovací notifikaci
  - Ověřit přijetí emailu
  - Kontrola zvoničku v aplikaci

### Post-Deployment

- [ ] Monitoring error logů (první 24 hodin)
- [ ] Kontrola email delivery rate
- [ ] Performance monitoring
- [ ] User feedback

---

## 📊 ČASOVÝ ODHAD

| Fáze | Odhad času | Priorita |
|------|------------|----------|
| 1. Databáze | 1-2 h | HIGH |
| 2. Helper funkce | 2-3 h | HIGH |
| 3. API endpointy | 4-6 h | HIGH |
| 4. Email systém | 2-3 h | MEDIUM |
| 5. Bezpečnost | 1-2 h | HIGH |
| 6. Logging | 1 h | MEDIUM |
| 7. Testování | 2-3 h | HIGH |
| 8. Dokumentace | 1 h | LOW |
| **CELKEM** | **14-21 h** | - |

---

## ⚠️ KRITICKÉ POZNÁMKY

### PHP 5.6 - CO NESMÍTE POUŽÍT:
- ❌ Type hints: `function foo(int $x)`
- ❌ Return types: `function foo(): string`
- ❌ Null coalescing: `$x ?? 'default'` → použít `isset($x) ? $x : 'default'`
- ❌ Short array: `[]` → použít `array()`
- ❌ Splat operator: `...$args`
- ❌ Anonymous classes: `new class {}`

### MySQL 5.5.43 - CO NESMÍTE POUŽÍT:
- ❌ DEFAULT CURRENT_TIMESTAMP na více sloupcích
- ❌ ON UPDATE CURRENT_TIMESTAMP na DATETIME
- ❌ utf8mb4 → použít `utf8`
- ❌ JSON typ → použít `TEXT`

### CO POUŽÍT MÍSTO TOHO:
- ✅ Triggery pro `dt_created` a `dt_updated`
- ✅ Ternární operátor místo `??`
- ✅ `array()` místo `[]`
- ✅ `utf8` místo `utf8mb4`

---

## 📞 KONTAKT

- **Frontend vývojář:** [Jméno]
- **Backend vývojář:** [Jméno]
- **Zodpovědná osoba:** [Jméno]

---

## ✅ SIGN-OFF

Po dokončení implementace:

- [ ] Backend vývojář potvrzuje dokončení: _________________ Datum: _______
- [ ] Frontend vývojář potvrzuje integraci: _________________ Datum: _______
- [ ] QA potvrzuje testy: _________________ Datum: _______
- [ ] Project Manager schvaluje nasazení: _________________ Datum: _______

---

**Prepared by:** Frontend Team  
**Date:** 29.10.2025  
**Version:** 1.0
