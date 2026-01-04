<?php
$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// Get profile structure
$stmt = $pdo->prepare('SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12');
$stmt->execute();
$json = $stmt->fetchColumn();
$structure = json_decode($json, true);

echo "Checking ORDER_APPROVED configuration:\n";
echo str_repeat('=', 70) . "\n\n";

// Find template node with ORDER_APPROVED
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
    echo "❌ Template node with ORDER_APPROVED NOT FOUND!\n";
    echo "This is why no recipients were found.\n\n";
    echo "Available event types in templates:\n";
    foreach ($structure['nodes'] as $node) {
        $nodeType = $node['type'] ?? $node['typ'] ?? null;
        if ($nodeType === 'template' && isset($node['data']['eventTypes'])) {
            echo "  - " . implode(', ', $node['data']['eventTypes']) . "\n";
        }
    }
    exit;
}

echo "✅ Template Node found: {$templateNode['id']}\n\n";

// Find all edges from this template
$edges = array_filter($structure['edges'], function($edge) use ($templateNode) {
    return $edge['source'] === $templateNode['id'];
});

echo "Found " . count($edges) . " edges:\n\n";

foreach ($edges as $i => $edge) {
    echo "Edge #" . ($i + 1) . " (ID: {$edge['id']})\n";
    
    // Find target node
    foreach ($structure['nodes'] as $node) {
        if ($node['id'] === $edge['target']) {
            echo "  Target: {$node['data']['label']} (type: {$node['data']['type']})\n";
            
            if (isset($node['data']['scopeDefinition'])) {
                $scope = $node['data']['scopeDefinition'];
                echo "  Scope: {$scope['type']}\n";
                if (isset($scope['fields'])) {
                    echo "  Fields: " . json_encode($scope['fields']) . "\n";
                } elseif (isset($scope['field'])) {
                    echo "  Field: {$scope['field']}\n";
                }
            }
            break;
        }
    }
    echo "\n";
}
