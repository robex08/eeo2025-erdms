<?php
/**
 * Check scope definitions for ORDER_PENDING_APPROVAL
 */

$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// Get profile structure
$stmt = $pdo->prepare('SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12');
$stmt->execute();
$json = $stmt->fetchColumn();
$structure = json_decode($json, true);

echo "Checking ORDER_PENDING_APPROVAL scope definitions:\n";
echo str_repeat("=", 70) . "\n\n";

// Find template node with ORDER_PENDING_APPROVAL
$templateNode = null;
foreach ($structure['nodes'] as $node) {
    $nodeType = $node['type'] ?? $node['typ'] ?? null;
    if ($nodeType === 'template' && isset($node['data']['eventTypes'])) {
        if (in_array('ORDER_PENDING_APPROVAL', $node['data']['eventTypes'])) {
            $templateNode = $node;
            break;
        }
    }
}

if (!$templateNode) {
    echo "❌ Template node with ORDER_PENDING_APPROVAL not found!\n";
    exit;
}

echo "✅ Template Node: {$templateNode['id']}\n\n";

// Find all edges from this template
$edges = array_filter($structure['edges'], function($edge) use ($templateNode) {
    return $edge['source'] === $templateNode['id'];
});

echo "Found " . count($edges) . " edges from this template:\n\n";

foreach ($edges as $i => $edge) {
    echo "Edge #" . ($i + 1) . " (ID: {$edge['id']})\n";
    
    // Find target node
    foreach ($structure['nodes'] as $node) {
        if ($node['id'] === $edge['target']) {
            echo "  Target: {$node['data']['label']} (type: {$node['data']['type']})\n";
            
            // Check scope definition
            if (isset($node['data']['scopeDefinition'])) {
                $scope = $node['data']['scopeDefinition'];
                echo "  Scope type: {$scope['type']}\n";
                
                if ($scope['type'] === 'DYNAMIC_FROM_ENTITY') {
                    if (isset($scope['fields'])) {
                        echo "  Fields (NEW format): " . json_encode($scope['fields']) . "\n";
                    } elseif (isset($scope['field'])) {
                        echo "  Field (OLD format): {$scope['field']}\n";
                    } else {
                        echo "  ❌ NO FIELDS DEFINED!\n";
                    }
                } elseif ($scope['type'] === 'SELECTED_USERS') {
                    echo "  Users: " . json_encode($scope['users']) . "\n";
                } elseif ($scope['type'] === 'ALL_IN_ROLE') {
                    echo "  All users in role\n";
                }
            } else {
                echo "  ❌ NO SCOPE DEFINITION!\n";
            }
            
            break;
        }
    }
    echo "\n";
}

echo "\n" . str_repeat("=", 70) . "\n";
echo "Expected field names:\n";
echo "  ✅ prikazce_id\n";
echo "  ✅ garant_uzivatel_id\n";
echo "  ✅ objednatel_id\n";
echo "\nIf scope uses different field names, notifications will not work!\n";
