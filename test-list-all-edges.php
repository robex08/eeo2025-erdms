<?php
/**
 * List all edges and their event types from profile 12
 */

$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// Get profile structure
$stmt = $pdo->prepare('SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12');
$stmt->execute();
$json = $stmt->fetchColumn();
$structure = json_decode($json, true);

echo "Profile PRIKAZCI - All Edges:\n";
echo str_repeat("=", 60) . "\n\n";

foreach ($structure['edges'] as $i => $edge) {
    echo "Edge #" . ($i + 1) . " (ID: {$edge['id']})\n";
    echo "  source: {$edge['source']}\n";
    echo "  target: {$edge['target']}\n";
    
    if (isset($edge['data']['eventTypes'])) {
        echo "  eventTypes: " . json_encode($edge['data']['eventTypes']) . "\n";
        
        // Translate IDs to names
        foreach ($edge['data']['eventTypes'] as $et) {
            if (is_numeric($et)) {
                $stmt = $pdo->prepare('SELECT kod FROM 25_notifikace_typy_udalosti WHERE id = ?');
                $stmt->execute([$et]);
                $kod = $stmt->fetchColumn();
                echo "    → $et = $kod\n";
            } else {
                echo "    → $et (string)\n";
            }
        }
    } else {
        echo "  eventTypes: NOT SET\n";
    }
    
    // Find target node
    foreach ($structure['nodes'] as $node) {
        if ($node['id'] === $edge['target']) {
            echo "  target node: {$node['data']['label']}\n";
            break;
        }
    }
    
    echo "\n";
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "Expected event types for ORDER notifications:\n";
$stmt = $pdo->query("SELECT id, kod FROM 25_notifikace_typy_udalosti WHERE kod LIKE 'ORDER%' ORDER BY kod");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  {$row['id']} = {$row['kod']}\n";
}
