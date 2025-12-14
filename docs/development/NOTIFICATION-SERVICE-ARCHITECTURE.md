# Centralizovaný Notifikační Systém - Architektura

## 🏗️ Přehled

Centrální služba pro zpracování notifikací napříč všemi moduly (objednávky, faktury, pokladna, atd.).

## 📦 Struktura

### Nová služba: `NotificationService.php`

**Umístění:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/NotificationService.php`

```php
<?php
/**
 * Centralizovaná služba pro zpracování workflow notifikací
 * 
 * Použití:
 * $service = new NotificationService($db);
 * $service->processWorkflowNotifications('orders', $orderId, 'status_changed', $data);
 */
class NotificationService {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Hlavní metoda - zavolá se po uložení záznamu v libovolném modulu
     * 
     * @param string $module Název modulu ('orders', 'invoices', 'cashbook')
     * @param int $recordId ID záznamu (např. order_id)
     * @param string $eventType Typ události ('status_changed', 'created', 'approved')
     * @param array $data Data pro placeholdery
     */
    public function processWorkflowNotifications($module, $recordId, $eventType, $data) {
        // 1. Načti aktivní hierarchii/workflow pro daný modul
        $workflow = $this->loadWorkflow($module);
        if (!$workflow) {
            error_log("[NotificationService] No workflow found for module: $module");
            return;
        }
        
        // 2. Najdi relevantní notifikační uzly podle event_type
        $notificationNodes = $this->findRelevantNodes($workflow, $eventType);
        
        // 3. Pro každý notifikační uzel
        foreach ($notificationNodes as $node) {
            // 4. Najdi příjemce (procházej EDGES z tohoto uzlu)
            $recipients = $this->findRecipients($node, $workflow, $data);
            
            // 5. Rozhodni normální vs. mimořádný stav
            $isUrgent = $this->determineUrgency($module, $data);
            $variantType = $isUrgent ? $node['urgentVariant'] : $node['normalVariant'];
            
            error_log("[NotificationService] Using variant: $variantType (urgent: " . ($isUrgent ? 'yes' : 'no') . ")");
            
            // 6. Pro každého příjemce
            foreach ($recipients as $recipient) {
                // 7. Kontrola EDGE - má příjemce dostávat notifikace?
                $edge = $this->getEdge($node['id'], $recipient['nodeId'], $workflow);
                if (!$edge || !$this->isEdgeEnabled($edge)) {
                    error_log("[NotificationService] Skipping recipient {$recipient['email']} - edge disabled");
                    continue;
                }
                
                // 8. Načti šablonu a extrahuj správnou HTML variantu
                $template = $this->getTemplate($node['templateId']);
                $htmlVariant = $this->extractVariant($template['email_body'], $variantType);
                
                // 9. Nahraď placeholdery
                $emailSubject = $this->replacePlaceholders($template['email_subject'], $data);
                $emailBody = $this->replacePlaceholders($htmlVariant, $data);
                $appTitle = $this->replacePlaceholders($template['app_title'], $data);
                $appMessage = $this->replacePlaceholders($template['app_message'], $data);
                
                // 10. Odešli notifikaci
                if ($edge['emailEnabled'] && $template['email_body']) {
                    $this->sendEmail($recipient['email'], $emailSubject, $emailBody);
                }
                
                if ($edge['inAppEnabled'] && $template['app_title']) {
                    $this->saveInAppNotification($recipient['userId'], $appTitle, $appMessage, $data);
                }
                
                error_log("[NotificationService] Notification sent to {$recipient['email']}");
            }
        }
    }
    
    /**
     * Načti workflow hierarchii z DB pro daný modul
     */
    private function loadWorkflow($module) {
        $sql = "SELECT * FROM 25_workflow_hierarchy 
                WHERE module = :module AND active = 1 
                ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':module' => $module]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) return null;
        
        return [
            'id' => $row['id'],
            'module' => $row['module'],
            'nodes' => json_decode($row['nodes'], true),
            'edges' => json_decode($row['edges'], true)
        ];
    }
    
    /**
     * Najdi notifikační uzly, které mají daný eventType
     */
    private function findRelevantNodes($workflow, $eventType) {
        $relevantNodes = [];
        
        foreach ($workflow['nodes'] as $node) {
            if ($node['type'] === 'template' && 
                isset($node['eventTypes']) && 
                in_array($eventType, $node['eventTypes'])) {
                $relevantNodes[] = $node;
            }
        }
        
        return $relevantNodes;
    }
    
    /**
     * Najdi všechny příjemce pro daný notifikační uzel
     */
    private function findRecipients($node, $workflow, $data) {
        $recipients = [];
        
        // Najdi všechny EDGES vycházející z tohoto uzlu
        foreach ($workflow['edges'] as $edge) {
            if ($edge['source'] === $node['id']) {
                $targetNode = $this->findNodeById($workflow, $edge['target']);
                
                if ($targetNode) {
                    // Podle typu uzlu získej uživatele
                    $users = $this->resolveNodeToUsers($targetNode, $data);
                    $recipients = array_merge($recipients, $users);
                }
            }
        }
        
        return $recipients;
    }
    
    /**
     * Převeď uzel (role/user/location/department) na seznam uživatelů
     */
    private function resolveNodeToUsers($node, $data) {
        $users = [];
        
        switch ($node['type']) {
            case 'role':
                // Najdi všechny uživatele s touto rolí
                $sql = "SELECT u.id, u.email, u.jmeno, u.prijmeni 
                        FROM 25_users u
                        JOIN 25_user_roles ur ON u.id = ur.user_id
                        WHERE ur.role_id = :roleId AND u.active = 1";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([':roleId' => $node['roleId']]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                break;
                
            case 'user':
                // Konkrétní uživatel
                $sql = "SELECT id, email, jmeno, prijmeni FROM 25_users WHERE id = :userId AND active = 1";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([':userId' => $node['userId']]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($user) $users[] = $user;
                break;
                
            case 'location':
                // Všichni uživatelé z lokality
                $sql = "SELECT id, email, jmeno, prijmeni FROM 25_users 
                        WHERE location_id = :locationId AND active = 1";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([':locationId' => $node['locationId']]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                break;
                
            case 'department':
                // Všichni uživatelé z úseku
                $sql = "SELECT id, email, jmeno, prijmeni FROM 25_users 
                        WHERE department_id = :deptId AND active = 1";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([':deptId' => $node['departmentId']]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                break;
        }
        
        // Přidej nodeId pro späté vyhledání edge
        foreach ($users as &$user) {
            $user['nodeId'] = $node['id'];
        }
        
        return $users;
    }
    
    /**
     * Rozhodni, zda jde o mimořádný případ
     */
    private function determineUrgency($module, $data) {
        // Logika závisí na modulu
        switch ($module) {
            case 'orders':
                // Mimořádné pokud cena > limit nebo urgentní flag
                $priceLimit = 50000; // z konfigurace
                $amount = isset($data['amount']) ? floatval($data['amount']) : 0;
                return $amount > $priceLimit || ($data['is_urgent'] ?? false);
                
            case 'invoices':
                // Mimořádné pokud faktury před splatností < 3 dny
                $dueDate = $data['due_date'] ?? null;
                if ($dueDate) {
                    $diff = strtotime($dueDate) - time();
                    return $diff < (3 * 86400); // 3 dny
                }
                return false;
                
            default:
                return false;
        }
    }
    
    /**
     * Extrahuj HTML variantu ze šablony podle <!-- RECIPIENT: TYPE -->
     */
    private function extractVariant($emailBody, $variantType) {
        if (!$emailBody || !str_contains($emailBody, '<!-- RECIPIENT:')) {
            return $emailBody;
        }
        
        $delimiter = "<!-- RECIPIENT: $variantType -->";
        $startPos = strpos($emailBody, $delimiter);
        
        if ($startPos === false) {
            return $emailBody; // Fallback
        }
        
        $htmlStart = $startPos + strlen($delimiter);
        
        // Najdi konec (další delimiter)
        $otherDelimiters = ['APPROVER_NORMAL', 'APPROVER_URGENT', 'SUBMITTER'];
        $htmlEnd = strlen($emailBody);
        
        foreach ($otherDelimiters as $other) {
            if ($other === $variantType) continue;
            $otherDelimiter = "<!-- RECIPIENT: $other -->";
            $pos = strpos($emailBody, $otherDelimiter, $htmlStart);
            if ($pos !== false && $pos < $htmlEnd) {
                $htmlEnd = $pos;
            }
        }
        
        return trim(substr($emailBody, $htmlStart, $htmlEnd - $htmlStart));
    }
    
    /**
     * Nahraď placeholdery v textu
     */
    private function replacePlaceholders($text, $data) {
        if (!$text) return $text;
        
        foreach ($data as $key => $value) {
            $text = str_replace("{{$key}}", $value, $text);
            $text = str_replace("{{{{$key}}}}", $value, $text);
        }
        
        return $text;
    }
    
    /**
     * Pomocné funkce
     */
    private function findNodeById($workflow, $nodeId) {
        foreach ($workflow['nodes'] as $node) {
            if ($node['id'] === $nodeId) return $node;
        }
        return null;
    }
    
    private function getEdge($sourceId, $targetId, $workflow) {
        foreach ($workflow['edges'] as $edge) {
            if ($edge['source'] === $sourceId && $edge['target'] === $targetId) {
                return $edge;
            }
        }
        return null;
    }
    
    private function isEdgeEnabled($edge) {
        return isset($edge['enabled']) && $edge['enabled'] === true;
    }
    
    private function getTemplate($templateId) {
        $sql = "SELECT * FROM 25_notification_templates WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $templateId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    private function sendEmail($to, $subject, $body) {
        // Implementace emailu (PHPMailer nebo eeo_mail_send)
        require_once __DIR__ . '/email-helper.php';
        return eeo_mail_send($to, $subject, $body, true);
    }
    
    private function saveInAppNotification($userId, $title, $message, $data) {
        $sql = "INSERT INTO 25_notifications (user_id, title, message, data, created_at) 
                VALUES (:userId, :title, :message, :data, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':userId' => $userId,
            ':title' => $title,
            ':message' => $message,
            ':data' => json_encode($data)
        ]);
    }
}
```

## 🔌 Integrace do modulů

### Příklad: Objednávky

**Soubor:** `order-form-25-save.php`

```php
// Po úspěšném uložení objednávky:

require_once __DIR__ . '/lib/NotificationService.php';
$notificationService = new NotificationService($db);

// Připrav data pro placeholdery
$notificationData = [
    'order_id' => $orderId,
    'order_number' => $orderNumber,
    'status' => $newStatus,
    'old_status' => $oldStatus,
    'predmet' => $order['predmet'],
    'dodavatel' => $order['dodavatel_nazev'],
    'amount' => $order['cena_s_dph'],
    'user_name' => $currentUser['jmeno'] . ' ' . $currentUser['prijmeni'],
    'approver_name' => $approver['jmeno'] . ' ' . $approver['prijmeni'],
    'date' => date('d.m.Y'),
    'is_urgent' => $order['is_urgent'] ?? false
];

// Zavolej notifikační službu
$notificationService->processWorkflowNotifications(
    'orders',                    // modul
    $orderId,                    // ID záznamu
    'order_status_ke_schvaleni', // typ události (odpovídá node eventTypes)
    $notificationData           // data
);
```

### Příklad: Faktury

```php
require_once __DIR__ . '/lib/NotificationService.php';
$notificationService = new NotificationService($db);

$notificationData = [
    'invoice_id' => $invoiceId,
    'invoice_number' => $invoiceNumber,
    'amount' => $invoice['amount'],
    'due_date' => $invoice['due_date'],
    'supplier' => $invoice['supplier_name'],
    // ... další data
];

$notificationService->processWorkflowNotifications(
    'invoices',
    $invoiceId,
    'invoice_received',
    $notificationData
);
```

## 📊 Databázová struktura

### Tabulka: `25_workflow_hierarchy`

```sql
CREATE TABLE `25_workflow_hierarchy` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `module` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `nodes` JSON NOT NULL,
  `edges` JSON NOT NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_module_active (`module`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Příklad JSON struktury:

```json
{
  "nodes": [
    {
      "id": "node_template_1",
      "type": "template",
      "templateId": 5,
      "name": "Objednávka ke schválení",
      "normalVariant": "APPROVER_NORMAL",
      "urgentVariant": "APPROVER_URGENT",
      "eventTypes": ["order_status_ke_schvaleni"]
    },
    {
      "id": "node_role_1",
      "type": "role",
      "roleId": 3,
      "name": "Příkazce"
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_template_1",
      "target": "node_role_1",
      "enabled": true,
      "emailEnabled": true,
      "inAppEnabled": true
    }
  ]
}
```

## 🎯 Výhody

1. ✅ **Centralizace** - Jedna služba pro všechny moduly
2. ✅ **Flexibility** - Workflow editor v UI
3. ✅ **Automatizace** - Automatický výběr variant
4. ✅ **Škálovatelnost** - Snadné přidání nových modulů
5. ✅ **Audit trail** - Vše logováno

## 📝 TODO

- [ ] Implementovat `NotificationService.php`
- [ ] Vytvořit DB tabulku `25_workflow_hierarchy`
- [ ] Integrovat do `order-form-25-save.php`
- [ ] Integrovat do ostatních modulů (faktury, pokladna)
- [ ] Přidat API endpoint pro ukládání workflow z UI
- [ ] Přidat testy
- [ ] Dokumentace API

## 🔗 Související soubory

- `/apps/eeo-v2/client/src/pages/OrganizationHierarchy.js` - UI editor
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/email-template-helper.php` - Existující helper
- `/docs/setup/update-notification-ke-schvaleni-dual.sql` - Příklad šablony s variantami
