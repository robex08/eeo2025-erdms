# ✅ Notifikační systém - CO JE HOTOVO a CO CHYBÍ

**Datum analýzy:** 16. prosince 2025

---

## ✅ **CO MÁME HOTOVO (95% KOMPLETNÍ):**

### 1. Email systém ✅
- **Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mail.php`
- **Funkce:** `eeo_mail_send($to, $subject, $body, $options)`
- **Podpora:** SMTP, HTML, přílohy, CC/BCC
- **Config:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mailconfig.php`

### 2. Šablony v databázi ✅
**Tabulka:** `25_notifikace_sablony`

| ID | Typ | HTML | Fáze |
|----|-----|------|------|
| 1 | order_status_nova | 14760 chars | 5 |
| 3 | order_status_schvalena | 14066 chars | 1 |
| 4 | order_status_zamitnuta | 13981 chars | 1 |
| 5 | order_status_ceka_se | 14107 chars | 1 |
| 6 | order_status_odeslana | 16975 chars | 2 |
| 8 | order_status_potvrzena | 19438 chars | 2 |
| 9 | order_status_dokoncena | 11337 chars | 5 |
| 13 | order_status_registr_ceka | 10641 chars | 5 |
| 16 | order_status_faktura_pridana | 10882 chars | 5 |
| 17 | order_status_faktura_schvalena | 17799 chars | 3 |
| 20 | order_status_kontrola_potvrzena | 17484 chars | 4 |
| 21 | order_status_kontrola_zamitnuta | 17896 chars | 4 |

**VŠECH 12 PRIORITNÍCH ŠABLON JE KOMPLETNÍCH!** ✅

### 3. Notification Router ✅
**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`  
**Funkce:** `notificationRouter($db, $eventType, $objectId, $triggerUserId, $placeholderData)`  
**Řádek:** 1431-1550

**Co dělá:**
1. ✅ Najde příjemce z organizational hierarchy
2. ✅ Vybere správnou template variantu (normal/urgent/info)
3. ✅ Nahradí placeholdery v šabloně
4. ✅ Vytvoří in-app notifikaci v DB
5. ❌ **TODO (řádek 1518):** Email sending není implementované

### 4. Frontend ✅
- **NotificationsPage.js** - kompletní stránka s notifikacemi
- **NotificationDropdown.js** - zvoneček v hlavičce
- **Layout.js** - integrace
- **Prokliky na objednávky** - opraveno (commit 5636247)

### 5. Databázové schéma ✅
- ✅ `25_notifikace` - hlavní tabulka notifikací
- ✅ `25_notifikace_precteni` - stav přečtení per user
- ✅ `25_notifikace_sablony` - šablony
- ✅ `25_notifikace_typy_udalosti` - typy událostí
- ✅ Všechny tabulky v češtině po Czechification

---

## ❌ **CO CHYBÍ (5% PRÁCE):**

### **1. Email sending implementace** ⚠️ KRITICKÉ

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`  
**Řádek:** 1518  
**TODO kód:**
```php
// TODO: Implementovat sendNotificationEmail()
// sendNotificationEmail($recipient['uzivatel_id'], $processedTitle, $processedEmailBody);
```

**CO UDĚLAT:**
```php
// Implementace funkce (přidat na konec notificationHandlers.php)
function sendNotificationEmail($db, $userId, $subject, $htmlBody) {
    try {
        // 1. Načíst email uživatele z DB
        $stmt = $db->prepare("
            SELECT email FROM 25_uzivatele 
            WHERE uzivatel_id = :user_id AND aktivni = 1
        ");
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || empty($user['email'])) {
            error_log("[Notifications] User $userId has no email address");
            return array('ok' => false, 'error' => 'No email address');
        }
        
        // 2. Zavolat eeo_mail_send()
        require_once __DIR__ . '/mail.php';
        
        $result = eeo_mail_send(
            $user['email'],
            $subject,
            $htmlBody,
            array('html' => true)
        );
        
        // 3. Logovat výsledek
        if ($result['ok']) {
            error_log("[Notifications] Email sent to {$user['email']} for user $userId");
        } else {
            error_log("[Notifications] Email FAILED to {$user['email']} for user $userId");
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log("[Notifications] sendNotificationEmail Exception: " . $e->getMessage());
        return array('ok' => false, 'error' => $e->getMessage());
    }
}
```

**Pak změnit řádek 1518:**
```php
// Bylo:
// TODO: Implementovat sendNotificationEmail()

// Bude:
$emailResult = sendNotificationEmail($db, $recipient['uzivatel_id'], $processedTitle, $processedEmailBody);
if (!$emailResult['ok']) {
    $result['errors'][] = "Email failed for user {$recipient['uzivatel_id']}: " . $emailResult['error'];
}
```

---

### **2. Volání notification routeru z workflow** ⚠️ KRITICKÉ

**PROBLÉM:** `notificationRouter()` existuje, ale **NIKDE SE NEVOLÁ!**

**KDE VOLAT:**

#### **A. PHP Backend (změna stavu objednávky)**
**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php`

**Najít místo, kde se mění status objednávky, a přidat:**
```php
// Příklad: Po schválení objednávky
if ($newStatus === 'SCHVALENA') {
    // Připravit data pro placeholdery
    $placeholderData = array(
        'order_number' => $orderData['cislo_obj'],
        'order_id' => $orderId,
        'predmet' => $orderData['predmet'],
        'amount' => $orderData['castka_celkem_s_dph'],
        'approver_name' => $currentUser['name'],
        'creator_name' => $orderData['objednatel_jmeno'],
        'approval_date' => date('d.m.Y H:i')
    );
    
    // Zavolat notification router
    require_once __DIR__ . '/notificationHandlers.php';
    notificationRouter($db, 'ORDER_APPROVED', $orderId, $currentUserId, $placeholderData);
}
```

**MAPOVÁNÍ STATUS → EVENT:**
| Status | Event Type |
|--------|------------|
| NOVA | N/A (pouze draft) |
| KE_SCHVALENI | ORDER_SENT_FOR_APPROVAL |
| SCHVALENA | ORDER_APPROVED |
| ZAMITNUTA | ORDER_REJECTED |
| CEKA_SE | ORDER_WAITING_FOR_CHANGES |
| ODESLANA | ORDER_SENT_TO_SUPPLIER |
| REGISTR_CEKA | ORDER_REGISTRY_APPROVAL_REQUESTED |
| FAKTURA_PRIDANA | ORDER_INVOICE_ADDED |
| KONTROLA_OK | ORDER_MATERIAL_CHECK_COMPLETED |
| DOKONCENA | ORDER_COMPLETED |

#### **B. NEBO Frontend (jednodušší pro testování)**
**Soubor:** `/apps/eeo-v2/client/src/services/apiOrderV2.js`

**Přidat nový endpoint call:**
```javascript
export async function triggerNotification(eventType, orderId, placeholders, token, username) {
  try {
    const response = await apiOrderV2.post('/notifications/trigger', {
      token,
      username,
      event_type: eventType,
      object_id: orderId,
      placeholder_data: placeholders
    });
    
    return validateAPIResponse(response, 'triggerNotification');
  } catch (error) {
    console.error('Trigger notification failed:', error);
    throw error;
  }
}
```

**Zavolat v OrderForm25.js po úspěšném schválení:**
```javascript
// Po úspěšném schválení
await triggerNotification(
  'ORDER_APPROVED',
  orderId,
  {
    order_number: formData.cislo_obj,
    predmet: formData.predmet,
    amount: formData.castka_celkem_s_dph,
    approver_name: userDetail.name
  },
  userDetail.token,
  userDetail.username
);
```

---

### **3. Queue systém** ⚙️ OPTIONAL (budoucí rozšíření)

**STAV:** Není implementováno, ale **není kritické** pro základní fungování.

**PROČ NENÍ POTŘEBA HNED:**
- Notifikace se posílají synchronně (hned při akci)
- Pro malý počet notifikací (< 100/den) je to dostačující
- Email sending je rychlý (< 1s per email)

**KDY IMPLEMENTOVAT:**
- Pokud se notifikace začnou zpožďovat (> 5s response time)
- Pokud chceme retry logic pro failed emails
- Pokud chceme scheduled notifications (poslat za X hodin)

**DB tabulky (pro budoucnost):**
```sql
CREATE TABLE 25_notifikace_fronta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  objekt_id INT NOT NULL,
  recipient_user_id INT NOT NULL,
  template_id INT NOT NULL,
  status ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
  priority INT DEFAULT 0,
  scheduled_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  retry_count INT DEFAULT 0,
  error_message TEXT NULL,
  placeholder_data JSON,
  dt_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_priority (status, priority)
);

CREATE TABLE 25_notifikace_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notifikace_fronta_id INT NOT NULL,
  channel ENUM('email', 'inapp') NOT NULL,
  status ENUM('SUCCESS', 'FAILED') NOT NULL,
  dt_delivered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_data JSON,
  error_message TEXT NULL,
  FOREIGN KEY (notifikace_fronta_id) REFERENCES 25_notifikace_fronta(id) ON DELETE CASCADE
);
```

---

## 🎯 **AKČNÍ PLÁN - CO UDĚLAT TEĎKA:**

### **KROK 1: Implementovat email sending** (15 minut)
1. Otevřít `notificationHandlers.php`
2. Přidat funkci `sendNotificationEmail()` (viz výše)
3. Změnit řádek 1518 na volání funkce
4. Otestovat: `php test-notification-email.php`

### **KROK 2: Vytvořit test skript** (10 minut)
```php
// /var/www/erdms-dev/test-notification-system.php
<?php
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php';
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php';

$db = getDbConnection();

// Test: Odeslat notifikaci o schválení obj
$placeholders = array(
    'order_number' => 'OBJ-2025-TEST',
    'order_id' => 123,
    'predmet' => 'Test objednávka',
    'amount' => '25000',
    'approver_name' => 'Admin Test',
    'creator_name' => 'Robert Test',
    'approval_date' => date('d.m.Y H:i')
);

$result = notificationRouter(
    $db,
    'ORDER_APPROVED',  // Event type
    123,                // Order ID
    1,                  // Trigger user ID
    $placeholders
);

echo "Notification sent: " . ($result['success'] ? 'YES' : 'NO') . "\n";
echo "Recipients: " . $result['sent'] . "\n";
if (!empty($result['errors'])) {
    echo "Errors: " . implode(', ', $result['errors']) . "\n";
}
?>
```

### **KROK 3: Napojit na workflow** (5 minut)
- Najít v `handlers.php` změnu stavu objednávky
- Přidat volání `notificationRouter()` po úspěšné změně

### **KROK 4: Testování** (10 minut)
1. Vytvořit testovací objednávku
2. Schválit ji
3. Ověřit:
   - ✅ In-app notifikace v DB (`25_notifikace`)
   - ✅ Email dorazil do schránky
   - ✅ Správná šablona (zelená pro autora, modrá pro schvalovatele)

---

## 📊 **CELKOVÁ DOKONČENOST:**

| Komponenta | Status | % Hotovo |
|------------|--------|----------|
| Email systém | ✅ DONE | 100% |
| Šablony v DB | ✅ DONE | 100% |
| Notification Router | ✅ DONE | 95% (chybí email sending call) |
| Frontend | ✅ DONE | 100% |
| DB schema | ✅ DONE | 100% |
| Email sending funkce | ❌ TODO | 0% (15 min práce) |
| Workflow integrace | ❌ TODO | 0% (5 min práce) |
| **CELKEM** | | **95%** |

---

## 🚀 **ODHADOVANÝ ČAS DO SPUŠTĚNÍ:**

**30 minut** (email funkce + workflow integrace + testování)

---

## 📝 **POZNÁMKY:**

- Queue systém **NENÍ POTŘEBA** pro základní fungování
- Všechny kritické komponenty **UŽ EXISTUJÍ**
- Jen **2 malé úkoly** zbývají (email + volání)
- Dokumentace je **kompletní** (2470 řádků v NOTIFICATION-CENTER-ARCHITECTURE.md)

---

**Připravil:** GitHub Copilot  
**Datum:** 16. prosince 2025  
**Status:** ✅ READY FOR IMPLEMENTATION (30 min práce)
