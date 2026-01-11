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

// Najít edge #1
foreach ($structure['edges'] as $edge) {
    if ($edge['id'] === 'reactflow__edge-template-2-1766007051172-role-5-1766006577394') {
        echo "EDGE #1 (Příkazce operace):\n";
        echo "Target: {$edge['target']}\n";
        echo "EventTypes: " . json_encode($edge['data']['eventTypes'] ?? []) . "\n\n";
        
        // Najít target node
        foreach ($structure['nodes'] as $node) {
            if ($node['id'] === $edge['target']) {
                echo "TARGET NODE:\n";
                echo "Name: {$node['data']['name']}\n";
                echo "RoleId: {$node['data']['roleId']}\n";
                echo "ScopeDefinition: " . json_encode($node['data']['scopeDefinition'] ?? []) . "\n";
                echo "Delivery: " . json_encode($node['data']['delivery'] ?? []) . "\n";
                break;
            }
        }
        break;
    }
}
