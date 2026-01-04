<?php
/**
 * Check template nodes for event types (legacy mode)
 */

$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// Get profile structure
$stmt = $pdo->prepare('SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12');
$stmt->execute();
$json = $stmt->fetchColumn();
$structure = json_decode($json, true);

echo "Profile PRIKAZCI - Template Nodes:\n";
echo str_repeat("=", 60) . "\n\n";

$templateCount = 0;
foreach ($structure['nodes'] as $node) {
    $nodeType = $node['type'] ?? $node['typ'] ?? null;
    
    if ($nodeType === 'template') {
        $templateCount++;
        echo "Template #{$templateCount} (ID: {$node['id']})\n";
        echo "  label: {$node['data']['label']}\n";
        
        if (isset($node['data']['eventTypes'])) {
            echo "  eventTypes: " . json_encode($node['data']['eventTypes']) . "\n";
            
            // Translate IDs to names
            foreach ($node['data']['eventTypes'] as $et) {
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
        echo "\n";
    }
}

echo "Total templates found: $templateCount\n";

if ($templateCount === 0) {
    echo "\n⚠️  No template nodes found!\n";
    echo "This means the profile is using the NEW system (edges with eventTypes)\n";
    echo "But all edges have empty eventTypes arrays!\n";
}
