<?php
$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// Check if ORDER_APPROVED nodes now have type in DB
$stmt = $pdo->prepare('SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12');
$stmt->execute();
$json = $stmt->fetchColumn();
$structure = json_decode($json, true);

echo "Checking if ORDER_APPROVED nodes have type in DB:\n";
echo str_repeat('=', 60) . "\n\n";

// Find ORDER_APPROVED template and its target nodes
$approvedTemplate = null;
foreach ($structure['nodes'] as $node) {
    if (isset($node['data']['eventTypes']) && in_array('ORDER_APPROVED', $node['data']['eventTypes'])) {
        $approvedTemplate = $node;
        break;
    }
}

if (!$approvedTemplate) {
    echo "❌ ORDER_APPROVED template not found!\n";
    exit;
}

echo "✅ ORDER_APPROVED template: " . $approvedTemplate['id'] . "\n\n";

// Find target nodes (edges from this template)
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

echo "Target nodes for ORDER_APPROVED:\n";
foreach ($targetNodes as $i => $node) {
    echo "Node #" . ($i+1) . " (" . $node['id'] . "): " . $node['data']['label'] . "\n";
    
    $scope = $node['data']['scopeDefinition'] ?? [];
    $type = $scope['type'] ?? 'NOT SET';
    $fields = $scope['fields'] ?? [];
    
    echo "  Type: $type\n";
    echo "  Fields: " . json_encode($fields) . "\n\n";
}

echo "\nExpected: All nodes should have type='DYNAMIC_FROM_ENTITY'\n";
echo "Status: " . (count($targetNodes) > 0 && 
    array_filter($targetNodes, function($n) { 
        return ($n['data']['scopeDefinition']['type'] ?? null) === 'DYNAMIC_FROM_ENTITY'; 
    }) === $targetNodes ? "✅ ALL FIXED" : "❌ NEEDS FIX") . "\n";

// Now test notification trigger again
echo "\n" . str_repeat('=', 60) . "\n";
echo "Testing ORDER_APPROVED notification again...\n\n";

$notificationData = [
    'event_type' => 'ORDER_APPROVED',
    'objednatel_id' => 2,
    'garant_uzivatel_id' => 2,
    'prikazce_id' => 2,
    'obj_cislo' => 'O-0025/75030926/2026/IT'
];

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
curl_close($ch);

$result = json_decode($response, true);
echo "ORDER_APPROVED notification test result:\n";
echo "Status: " . ($result['status'] ?? 'unknown') . "\n";
echo "Message: " . ($result['zprava'] ?? 'no message') . "\n";
echo "Sent: " . ($result['sent'] ?? 0) . "\n";
echo "Errors: " . count($result['errors'] ?? []) . "\n";

if (($result['sent'] ?? 0) > 0) {
    echo "\n🎉 SUCCESS! ORDER_APPROVED notifications are now working!\n";
} else {
    echo "\n❌ Still not working. Need further investigation.\n";
}
?>