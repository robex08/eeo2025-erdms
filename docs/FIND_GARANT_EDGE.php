<?php
$pdo = new PDO(
    'mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$stmt = $pdo->query("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
$profile = $stmt->fetch(PDO::FETCH_ASSOC);
$structure = json_decode($profile['structure_json'], true);

echo "Hledám edge s ORDER_PENDING_APPROVAL a field=garant_uzivatel_id:\n\n";

foreach ($structure['edges'] as $i => $edge) {
    if (isset($edge['data']['eventTypes']) && in_array('ORDER_PENDING_APPROVAL', $edge['data']['eventTypes'])) {
        // Najít target node
        foreach ($structure['nodes'] as $node) {
            if ($node['id'] === $edge['target']) {
                $field = $node['data']['scopeDefinition']['field'] ?? null;
                
                echo "EDGE #{$i}: {$edge['id']}\n";
                echo "  Target: {$node['data']['name']}\n";
                echo "  RoleId: {$node['data']['roleId']}\n";
                echo "  Scope Type: {$node['data']['scopeDefinition']['type']}\n";
                echo "  Scope Field: " . ($field ?: 'N/A') . "\n";
                echo "  Delivery: " . json_encode($node['data']['delivery'] ?? []) . "\n";
                echo "  DeliverySettings: " . json_encode($node['data']['deliverySettings'] ?? []) . "\n\n";
                
                break;
            }
        }
    }
}
