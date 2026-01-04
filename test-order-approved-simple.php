<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Přímé DB připojení
$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

echo "Testing ORDER_APPROVED notification processing...\n";
echo "============================================================\n";

// ✅ REAL TEST DATA (objednávka 11539)
$test_data = array(
    'action' => 'ORDER_APPROVED',
    'objectId' => '11539',
    'userId' => '12345',  // ID schvalovatele (simulace)
    'additionalData' => array()  // Prázdné, jak posílá frontend
);

echo "Test data:\n";
echo "  Order ID: " . $test_data['objectId'] . "\n";
echo "  Action: " . $test_data['action'] . "\n";
echo "  Additional data: " . (empty($test_data['additionalData']) ? 'EMPTY (from frontend)' : 'NOT EMPTY') . "\n\n";

// Načíst objednávku z DB
$stmt = $pdo->prepare("
    SELECT o.*, 
           CONCAT(objednatel.jmeno, ' ', objednatel.prijmeni) as objednatel_name,
           CONCAT(prikazce.jmeno, ' ', prikazce.prijmeni) as prikazce_name,
           CONCAT(garant.jmeno, ' ', garant.prijmeni) as garant_name
    FROM 25a_objednavky o
    LEFT JOIN 25_uzivatele objednatel ON o.objednatel_id = objednatel.id
    LEFT JOIN 25_uzivatele prikazce ON o.prikazce_id = prikazce.id
    LEFT JOIN 25_uzivatele garant ON o.garant_uzivatel_id = garant.id
    WHERE o.id = ?
");
$stmt->execute([$test_data['objectId']]);
$order = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$order) {
    echo "❌ Order not found: " . $test_data['objectId'] . "\n";
    exit;
}

echo "Found order:\n";
echo "  Číslo: " . $order['cislo_objednavky'] . "\n";
echo "  Předmět: " . $order['predmet'] . "\n";
echo "  Objednatel: " . ($order['objednatel_name'] ?? 'NULL') . " (ID: " . ($order['objednatel_id'] ?? 'NULL') . ")\n";
echo "  Příkazce: " . ($order['prikazce_name'] ?? 'NULL') . " (ID: " . ($order['prikazce_id'] ?? 'NULL') . ")\n";
echo "  Garant: " . ($order['garant_name'] ?? 'NULL') . " (ID: " . ($order['garant_uzivatel_id'] ?? 'NULL') . ")\n\n";

// Test placeholder data který by vrátil loadOrderPlaceholders
$placeholders = array(
    'objednavka_id' => $order['id'],
    'uzivatel_id' => $order['uzivatel_id'],
    'objednatel_id' => $order['objednatel_id'],
    'prikazce_id' => $order['prikazce_id'], 
    'garant_uzivatel_id' => $order['garant_uzivatel_id'],
    'schvalovatel_id' => $order['schvalovatel_id'],
);

echo "Placeholder IDs (for hierarchy):\n";
foreach ($placeholders as $key => $value) {
    echo "  $key: " . ($value ?? 'NULL') . "\n";
}

// Test hierarchy profile
$stmt = $pdo->prepare('SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12');
$stmt->execute();
$json = $stmt->fetchColumn();
$structure = json_decode($json, true);

echo "\nTesting hierarchy recipient resolution...\n";

// Najít template s ORDER_APPROVED
$templateNode = null;
foreach ($structure['nodes'] as $node) {
    $nodeType = $node['type'] ?? $node['typ'] ?? null;
    if ($nodeType === 'template' && isset($node['data']['eventTypes'])) {
        if (in_array('ORDER_APPROVED', $node['data']['eventTypes'])) {
            $templateNode = $node;
            break;
        }
    }
}

if (!$templateNode) {
    echo "❌ No template node found for ORDER_APPROVED\n";
    exit;
}

echo "Found template: " . $templateNode['id'] . "\n";

// Najít cílové nodes pro tento template
$targetNodes = [];
foreach ($structure['edges'] as $edge) {
    if ($edge['source'] === $templateNode['id']) {
        foreach ($structure['nodes'] as $node) {
            if ($node['id'] === $edge['target']) {
                $targetNodes[] = $node;
            }
        }
    }
}

echo "Target nodes: " . count($targetNodes) . "\n";

// Testovat každý node
$totalRecipients = 0;
foreach ($targetNodes as $node) {
    echo "\nTesting node: " . $node['id'] . " (" . ($node['data']['label'] ?? 'No label') . ")\n";
    echo "  Type: " . ($node['data']['type'] ?? 'NO TYPE') . "\n";
    
    // ✅ SCOPE JE NA NODE!
    $scopeDef = $node['data']['scopeDefinition'] ?? [];
    echo "  Scope type: " . ($scopeDef['type'] ?? 'NO TYPE') . "\n";
    echo "  Fields: " . json_encode($scopeDef['fields'] ?? []) . "\n";
    
    if (($scopeDef['type'] ?? '') === 'DYNAMIC_FROM_ENTITY') {
        $fields = $scopeDef['fields'] ?? [];
        $userIds = [];
        
        foreach ($fields as $field) {
            if (isset($placeholders[$field]) && $placeholders[$field] !== null) {
                $userIds[] = $placeholders[$field];
                echo "  -> $field = " . $placeholders[$field] . "\n";
            } else {
                echo "  -> $field = NULL (no recipient)\n";
            }
        }
        
        if (!empty($userIds)) {
            // Načíst jména uživatelů
            $userIds = array_unique($userIds); // Zabránit duplicitám
            $placeholders_users = implode(',', array_fill(0, count($userIds), '?'));
            $stmt = $pdo->prepare("SELECT id, CONCAT(jmeno, ' ', prijmeni) as full_name, email FROM 25_uzivatele WHERE id IN ($placeholders_users)");
            $stmt->execute($userIds);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "  Recipients found: " . count($users) . "\n";
            foreach ($users as $user) {
                echo "    - " . $user['full_name'] . " (" . $user['email'] . ")\n";
            }
            
            $totalRecipients += count($users);
        } else {
            echo "  ❌ No recipients - all fields NULL\n";
        }
    } else {
        echo "  ℹ️ Skipping - not DYNAMIC_FROM_ENTITY\n";
    }
}

echo "\n" . str_repeat('=', 60) . "\n";
if (!empty($userIds)) {
    echo "✅ TEST RESULT: Should send " . count($users) . " notifications\n";
} else {
    echo "❌ TEST RESULT: Would send 0 notifications (no recipients found)\n";
}
?>