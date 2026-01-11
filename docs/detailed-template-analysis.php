<?php
/**
 * DETAILNÍ ANALÝZA TEMPLATE NODE S ORDER_PENDING_APPROVAL
 */

// Database connection
$pdo = new PDO(
    "mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", 
    "erdms_user", 
    "AhchohTahnoh7eim",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "🔍 DETAILNÍ ANALÝZA: Template Node s ORDER_PENDING_APPROVAL\n";
echo str_repeat("=", 70) . "\n";

// Načti profil
$stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
$stmt->execute();
$json = $stmt->fetchColumn();

$structure = json_decode($json, true);

// Najdi template node s ORDER_PENDING_APPROVAL
$templateNode = null;
$templateNodeIndex = null;

foreach (($structure['nodes'] ?? []) as $index => $node) {
    $nodeData = $node['data'] ?? [];
    
    if (isset($nodeData['eventTypes']) && 
        is_array($nodeData['eventTypes']) && 
        in_array('ORDER_PENDING_APPROVAL', $nodeData['eventTypes'])) {
        
        $templateNode = $node;
        $templateNodeIndex = $index;
        break;
    }
}

if (!$templateNode) {
    echo "❌ Template node s ORDER_PENDING_APPROVAL nenalezen!\n";
    exit(1);
}

echo "✅ Template Node nalezen (Index: $templateNodeIndex)\n";
echo "📋 Node ID: {$templateNode['id']}\n";

$data = $templateNode['data'];
echo "\n📄 TEMPLATE DETAILY:\n";
echo "   Type: {$data['type']}\n";
echo "   Label: " . ($data['label'] ?? 'UNDEFINED') . "\n";
echo "   Template Name: " . ($data['templateName'] ?? 'UNDEFINED') . "\n";
echo "   Subject: " . ($data['subject'] ?? 'UNDEFINED') . "\n";
echo "   Event Types: " . implode(', ', $data['eventTypes'] ?? []) . "\n";

// Najdi všechny edges které míří na tento template nebo z něj vedou
echo "\n🔍 SOUVISEJÍCÍ EDGES:\n";

$incomingEdges = [];
$outgoingEdges = [];

foreach (($structure['edges'] ?? []) as $edge) {
    if ($edge['source'] === $templateNode['id']) {
        $outgoingEdges[] = $edge;
    }
    if ($edge['target'] === $templateNode['id']) {
        $incomingEdges[] = $edge;
    }
}

echo "📥 Incoming edges (vedoucí TO template): " . count($incomingEdges) . "\n";
foreach ($incomingEdges as $index => $edge) {
    echo "   #{$index} Edge ID: {$edge['id']}\n";
    echo "       Source: {$edge['source']} → Target: {$edge['target']}\n";
    echo "       Label: " . ($edge['data']['label'] ?? 'N/A') . "\n";
    echo "       EventTypes: " . implode(', ', $edge['data']['eventTypes'] ?? []) . "\n";
    echo "       Priority: " . ($edge['data']['priority'] ?? 'N/A') . "\n";
}

echo "\n📤 Outgoing edges (vedoucí FROM template): " . count($outgoingEdges) . "\n";
foreach ($outgoingEdges as $index => $edge) {
    echo "   #{$index} Edge ID: {$edge['id']}\n";
    echo "       Source: {$edge['source']} → Target: {$edge['target']}\n";
    echo "       Label: " . ($edge['data']['label'] ?? 'N/A') . "\n";
    echo "       EventTypes: " . implode(', ', $edge['data']['eventTypes'] ?? []) . "\n";
    echo "       Priority: " . ($edge['data']['priority'] ?? 'N/A') . "\n";
    
    // Najdi target node
    foreach (($structure['nodes'] ?? []) as $node) {
        if ($node['id'] === $edge['target']) {
            echo "       Target Type: {$node['data']['type']}\n";
            echo "       Target Label: " . ($node['data']['label'] ?? 'N/A') . "\n";
            
            if (isset($node['data']['scopeDefinition'])) {
                $scope = $node['data']['scopeDefinition'];
                echo "       Scope Type: {$scope['type']}\n";
                echo "       Role ID: {$scope['roleId']}\n";
                if (isset($scope['field'])) {
                    echo "       Field: {$scope['field']}\n";
                }
            }
            break;
        }
    }
    echo "\n";
}

// Kontrola všech edges pro ORDER_PENDING_APPROVAL
echo "\n🎯 VŠECHNY EDGES S ORDER_PENDING_APPROVAL:\n";
$approvalEdges = [];

foreach (($structure['edges'] ?? []) as $index => $edge) {
    $eventTypes = $edge['data']['eventTypes'] ?? [];
    if (in_array('ORDER_PENDING_APPROVAL', $eventTypes)) {
        $approvalEdges[] = $edge;
        echo "   ✅ Edge #{$index}: {$edge['id']}\n";
        echo "       EventTypes: " . implode(', ', $eventTypes) . "\n";
    }
}

if (empty($approvalEdges)) {
    echo "   ❌ ŽÁDNÉ EDGES S ORDER_PENDING_APPROVAL!\n";
    echo "\n🔧 PROBLÉM IDENTIFIKOVÁN:\n";
    echo "   Template má ORDER_PENDING_APPROVAL v eventTypes,\n";
    echo "   ale žádná edge nemá ORDER_PENDING_APPROVAL!\n";
    echo "\n💡 ŘEŠENÍ:\n";
    echo "   1. Přesunout ORDER_PENDING_APPROVAL z template node do příslušných edges\n";
    echo "   2. Nebo upravit edges aby obsahovaly ORDER_PENDING_APPROVAL\n";
}

echo "\n🏁 Detailní analýza dokončena\n";
?>