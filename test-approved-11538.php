<?php
echo "🔍 TEST ORDER_APPROVED NOTIFIKACE PRO OBJEDNÁVKU #11538\n";
echo str_repeat('=', 70) . "\n\n";

// Database connection
$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7iem', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// 1. Najít informace o objednávce 11538 v správné tabulce
echo "1️⃣ INFORMACE O OBJEDNÁVCE #11538\n";
echo str_repeat('-', 50) . "\n";

$stmt = $pdo->prepare("SELECT id, obj_cislo, prikazce_id, garant_uzivatel_id, objednatel_id FROM 25a_objednavky WHERE id = 11538");
$stmt->execute();
$objednavka = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$objednavka) {
    echo "❌ Objednávka #11538 nebyla nalezena!\n";
    exit;
}

echo "✅ Objednávka nalezena:\n";
echo "   ID: " . $objednavka['id'] . "\n";
echo "   Obj číslo: " . $objednavka['obj_cislo'] . "\n";
echo "   Příkazce ID: " . $objednavka['prikazce_id'] . "\n";
echo "   Garant ID: " . $objednavka['garant_uzivatel_id'] . "\n";
echo "   Objednatel ID: " . $objednavka['objednatel_id'] . "\n";

// 2. Zkusit najít strukturu debug_notification_log
echo "2️⃣ KONTROLA DEBUG LOG TABULKY\n";
echo str_repeat('-', 50) . "\n";

try {
    $stmt = $pdo->query("SHOW COLUMNS FROM debug_notification_log");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "✅ Sloupce v debug_notification_log:\n";
    foreach ($columns as $col) {
        echo "   - $col\n";
    }
    echo "\n";
    
    // Najít správný sloupec pro identifikaci
    if (in_array('obj_cislo', $columns)) {
        $identifier_column = 'obj_cislo';
        $identifier_value = $objednavka['obj_cislo'];
    } elseif (in_array('order_id', $columns)) {
        $identifier_column = 'order_id';
        $identifier_value = $objednavka['id'];
    } else {
        echo "⚠️ Neznámý identifikátor, použiji nejnovější záznamy\n";
        $identifier_column = 'id';
        $identifier_value = '> 0';
    }
    
} catch (Exception $e) {
    echo "❌ Chyba při kontrole tabulky: " . $e->getMessage() . "\n";
    $identifier_column = 'id';
    $identifier_value = '> 0';
}

echo "\n";

// 3. Odeslat ORDER_APPROVED notifikaci
echo "3️⃣ ODESÍLÁNÍ ORDER_APPROVED NOTIFIKACE\n";
echo str_repeat('-', 50) . "\n";

$notificationData = [
    'event_type' => 'ORDER_APPROVED',
    'objednatel_id' => (int)$objednavka['objednatel_id'],
    'garant_uzivatel_id' => (int)$objednavka['garant_uzivatel_id'],
    'prikazce_id' => (int)$objednavka['prikazce_id'],
    'obj_cislo' => $objednavka['obj_cislo']
];

echo "📤 Odesílání notifikace s daty:\n";
echo json_encode($notificationData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

$jsonData = json_encode($notificationData);
$ch = curl_init('https://erdms.zachranka.cz/dev/api.eeo/notifications/trigger');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($jsonData)
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "📡 HTTP Response Code: $httpCode\n";
if ($httpCode !== 200) {
    echo "❌ Chyba HTTP! Response: $response\n";
    exit;
}

$result = json_decode($response, true);
echo "📧 Výsledek notifikace:\n";
echo "   Status: " . ($result['status'] ?? 'unknown') . "\n";
echo "   Zpráva: " . ($result['zprava'] ?? 'no message') . "\n";
echo "   Odesláno: " . ($result['sent'] ?? 0) . "\n";
echo "   Chyby: " . count($result['errors'] ?? []) . "\n\n";

// 4. Analýza debug logu
echo "4️⃣ ANALÝZA DEBUG LOGU\n";
echo str_repeat('-', 50) . "\n";

$stmt = $pdo->prepare("
    SELECT 
        id, timestamp, event_type, obj_cislo, 
        template_id, recipient_count, recipients_json, 
        hierarchy_debug, error_message
    FROM debug_notification_log 
    WHERE obj_cislo = ? 
    ORDER BY timestamp DESC
");
$stmt->execute([$objednavka['obj_cislo']]);
$debugLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($debugLogs)) {
    echo "❌ Žádné debug záznamy pro {$objednavka['obj_cislo']}\n\n";
} else {
    foreach ($debugLogs as $i => $log) {
        echo "📊 Debug záznam #" . ($i+1) . ":\n";
        echo "   Čas: " . $log['timestamp'] . "\n";
        echo "   Event: " . $log['event_type'] . "\n";
        echo "   Template ID: " . $log['template_id'] . "\n";
        echo "   Počet příjemců: " . $log['recipient_count'] . "\n";
        
        if ($log['error_message']) {
            echo "   ❌ Chyba: " . $log['error_message'] . "\n";
        }
        
        if ($log['recipients_json']) {
            echo "   👥 Příjemci:\n";
            $recipients = json_decode($log['recipients_json'], true);
            if (is_array($recipients)) {
                foreach ($recipients as $j => $recipient) {
                    echo "      #" . ($j+1) . ": ";
                    echo "ID " . ($recipient['user_id'] ?? 'N/A');
                    echo " (" . ($recipient['email'] ?? 'no email') . ")";
                    echo " - " . ($recipient['full_name'] ?? 'no name') . "\n";
                }
            } else {
                echo "      (nepodařilo se dekódovat JSON)\n";
            }
        }
        
        if ($log['hierarchy_debug']) {
            echo "   🔍 Hierarchy debug:\n";
            $debug = json_decode($log['hierarchy_debug'], true);
            if (is_array($debug)) {
                echo "      " . json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
            } else {
                echo "      " . $log['hierarchy_debug'] . "\n";
            }
        }
        
        echo "\n";
    }
}

// 5. Kontrola aktuálního stavu hierarchie pro ORDER_APPROVED
echo "5️⃣ ANALÝZA HIERARCHIE PRO ORDER_APPROVED\n";
echo str_repeat('-', 50) . "\n";

$stmt = $pdo->prepare('SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12');
$stmt->execute();
$json = $stmt->fetchColumn();
$structure = json_decode($json, true);

// Najít ORDER_APPROVED template
$approvedTemplate = null;
foreach ($structure['nodes'] as $node) {
    if (isset($node['data']['eventTypes']) && in_array('ORDER_APPROVED', $node['data']['eventTypes'])) {
        $approvedTemplate = $node;
        break;
    }
}

if (!$approvedTemplate) {
    echo "❌ ORDER_APPROVED template nenalezen v hierarchii!\n\n";
} else {
    echo "✅ ORDER_APPROVED template: " . $approvedTemplate['id'] . "\n";
    echo "   Název: " . $approvedTemplate['data']['name'] . "\n";
    echo "   Template ID: " . $approvedTemplate['data']['templateId'] . "\n\n";
    
    // Najít target nodes (edges from this template)
    $targetNodes = [];
    foreach ($structure['edges'] as $edge) {
        if ($edge['source'] === $approvedTemplate['id']) {
            foreach ($structure['nodes'] as $node) {
                if ($node['id'] === $edge['target']) {
                    $targetNodes[] = $node;
                    break;
                }
            }
        }
    }
    
    echo "📋 Cílové role pro ORDER_APPROVED:\n";
    foreach ($targetNodes as $i => $node) {
        echo "   Role #" . ($i+1) . " (" . $node['id'] . "): " . $node['data']['label'] . "\n";
        
        $scope = $node['data']['scopeDefinition'] ?? [];
        $type = $scope['type'] ?? 'NOT SET';
        $fields = $scope['fields'] ?? [];
        
        echo "      Scope Type: $type\n";
        echo "      Scope Fields: " . json_encode($fields) . "\n";
        echo "      Role ID: " . ($node['data']['roleId'] ?? 'N/A') . "\n\n";
    }
}

// 6. Souhrnný výsledek
echo "6️⃣ SOUHRNNÝ VÝSLEDEK\n";
echo str_repeat('-', 50) . "\n";

$sentCount = $result['sent'] ?? 0;
if ($sentCount > 0) {
    echo "🎉 ÚSPĚCH! ORDER_APPROVED notifikace byla odeslána $sentCount příjemcům\n";
} else {
    echo "❌ PROBLÉM! ORDER_APPROVED notifikace nebyla odeslána žádným příjemcům\n";
    echo "   Možné příčiny:\n";
    echo "   - Chybí scope.type v hierarchii\n";
    echo "   - Neexistují uživatelé s odpovídajícími ID\n";
    echo "   - Chybné field mapping\n";
    echo "   - Template není správně propojen s role nodes\n";
}

echo "\n" . str_repeat('=', 70) . "\n";
echo "Test dokončen - zkontroluj výsledky výše 👆\n";
?>