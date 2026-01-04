<?php
/**
 * Quick test - check ORDER_PENDING_APPROVAL event type setup
 */

$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// 1. Get event type ID
$stmt = $pdo->prepare('SELECT id, kod FROM 25_notifikace_typy_udalosti WHERE kod = ?');
$stmt->execute(['ORDER_PENDING_APPROVAL']);
$eventType = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$eventType) {
    echo "❌ Event type ORDER_PENDING_APPROVAL not found!\n";
    
    // List all ORDER event types
    echo "\nAll ORDER event types:\n";
    $stmt = $pdo->query("SELECT id, kod, nazev FROM 25_notifikace_typy_udalosti WHERE kod LIKE 'ORDER%' ORDER BY kod");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  {$row['kod']} (ID: {$row['id']}) - {$row['nazev']}\n";
    }
    exit;
}
echo "✅ Event Type: {$eventType['kod']} (ID: {$eventType['id']})\n\n";

// 2. Get profile structure
$stmt = $pdo->prepare('SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12');
$stmt->execute();
$json = $stmt->fetchColumn();
$structure = json_decode($json, true);

echo "Profile structure loaded: " . count($structure['edges']) . " edges total\n\n";

// 3. Find edges with ORDER_PENDING_APPROVAL
$found = 0;
foreach ($structure['edges'] as $edge) {
    if (isset($edge['data']['eventTypes'])) {
        foreach ($edge['data']['eventTypes'] as $et) {
            if ($et === 'ORDER_PENDING_APPROVAL' || $et === $eventType['id']) {
                $found++;
                echo "✅ Edge {$edge['id']}: source={$edge['source']}, target={$edge['target']}\n";
                echo "   eventTypes: " . json_encode($edge['data']['eventTypes']) . "\n";
                
                // Find target node
                foreach ($structure['nodes'] as $node) {
                    if ($node['id'] === $edge['target']) {
                        echo "   target node: {$node['data']['label']} (type: {$node['data']['type']})\n";
                        if (isset($node['data']['scopeDefinition'])) {
                            $scope = $node['data']['scopeDefinition'];
                            echo "   scope: {$scope['type']}\n";
                            if (isset($scope['fields'])) {
                                echo "   fields: " . json_encode($scope['fields']) . "\n";
                            }
                        }
                        break;
                    }
                }
                echo "\n";
            }
        }
    }
}
echo "\nTotal edges found: $found\n";

if ($found === 0) {
    echo "\n❌ NO EDGES FOUND with ORDER_PENDING_APPROVAL!\n";
    echo "This is why you get 'Žádní příjemci nenalezeni'\n";
    echo "\nTo fix this:\n";
    echo "1. Open Hierarchie Editor\n";
    echo "2. Add edges with ORDER_PENDING_APPROVAL event type\n";
    echo "3. Configure target nodes (roles/users) and scope\n";
}
