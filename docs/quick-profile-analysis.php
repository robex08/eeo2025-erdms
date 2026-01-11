<?php
/**
 * RYCHLÁ ANALÝZA PROFILU PRIKAZCI
 * Cíl: Najít ORDER_PENDING_APPROVAL v JSON struktuře
 */

// Database connection
$pdo = new PDO(
    "mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", 
    "erdms_user", 
    "AhchohTahnoh7eim",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "🔍 RYCHLÁ ANALÝZA: Hledání ORDER_PENDING_APPROVAL v profilu PRIKAZCI\n";
echo str_repeat("=", 70) . "\n";

// Načti profil
$stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
$stmt->execute();
$json = $stmt->fetchColumn();

if (!$json) {
    echo "❌ Profil nenalezen!\n";
    exit(1);
}

echo "📊 JSON velikost: " . number_format(strlen($json)) . " bytes\n";

$structure = json_decode($json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "❌ Nevalidní JSON!\n";
    exit(1);
}

echo "📊 Uzly (nodes): " . count($structure['nodes'] ?? []) . "\n";
echo "📊 Hrany (edges): " . count($structure['edges'] ?? []) . "\n";

// Hledej všechny výskyty ORDER_PENDING_APPROVAL
$occurrences = substr_count($json, 'ORDER_PENDING_APPROVAL');
echo "🎯 Výskytů 'ORDER_PENDING_APPROVAL': $occurrences\n\n";

// Detailní analýza nodes
echo "🔍 ANALÝZA NODES:\n";
foreach (($structure['nodes'] ?? []) as $index => $node) {
    $nodeData = $node['data'] ?? [];
    
    // Kontrola eventTypes v node data
    if (isset($nodeData['eventTypes']) && is_array($nodeData['eventTypes'])) {
        if (in_array('ORDER_PENDING_APPROVAL', $nodeData['eventTypes'])) {
            echo "   ✅ Node #{$index} (ID: {$node['id']}) - eventTypes: " . implode(', ', $nodeData['eventTypes']) . "\n";
            echo "      Type: {$nodeData['type']}, Label: {$nodeData['label']}\n";
        }
    }
    
    // Kontrola templateName pro template nodes
    if (isset($nodeData['templateName']) && $nodeData['type'] === 'template') {
        if (strpos($nodeData['templateName'], 'schval') !== false || strpos($nodeData['subject'], 'schval') !== false) {
            echo "   📧 Template Node #{$index} (ID: {$node['id']}):\n";
            echo "      Template: {$nodeData['templateName']}\n";
            echo "      Subject: {$nodeData['subject']}\n";
        }
    }
}

// Detailní analýza edges
echo "\n🔍 ANALÝZA EDGES:\n";
foreach (($structure['edges'] ?? []) as $index => $edge) {
    $edgeData = $edge['data'] ?? [];
    
    // Kontrola eventTypes v edge data
    if (isset($edgeData['eventTypes']) && is_array($edgeData['eventTypes'])) {
        if (in_array('ORDER_PENDING_APPROVAL', $edgeData['eventTypes'])) {
            echo "   ✅ Edge #{$index} (ID: {$edge['id']}) - eventTypes: " . implode(', ', $edgeData['eventTypes']) . "\n";
            echo "      Label: {$edgeData['label']}, Priority: {$edgeData['priority']}\n";
            echo "      Source: {$edge['source']} → Target: {$edge['target']}\n";
        }
    }
    
    // Výpis všech edges pro kontrolu
    if (isset($edgeData['label']) && (strpos($edgeData['label'], 'schval') !== false || strpos($edgeData['label'], 'approval') !== false)) {
        echo "   📝 Edge #{$index} (ID: {$edge['id']} - možný approval:\n";
        echo "      Label: {$edgeData['label']}\n";
        echo "      EventTypes: " . (isset($edgeData['eventTypes']) ? implode(', ', $edgeData['eventTypes']) : 'NONE') . "\n";
    }
}

// Hledej i jiné event types související se schválením
echo "\n🔍 VŠECHNY EVENT TYPES V PROFILU:\n";
$allEventTypes = [];

// Z nodes
foreach (($structure['nodes'] ?? []) as $node) {
    if (isset($node['data']['eventTypes'])) {
        $allEventTypes = array_merge($allEventTypes, $node['data']['eventTypes']);
    }
}

// Z edges  
foreach (($structure['edges'] ?? []) as $edge) {
    if (isset($edge['data']['eventTypes'])) {
        $allEventTypes = array_merge($allEventTypes, $edge['data']['eventTypes']);
    }
}

$uniqueEventTypes = array_unique($allEventTypes);
sort($uniqueEventTypes);

foreach ($uniqueEventTypes as $eventType) {
    $highlight = (strpos($eventType, 'APPROVAL') !== false || strpos($eventType, 'schval') !== false) ? '🎯 ' : '   ';
    echo "$highlight$eventType\n";
}

echo "\n🏁 Rychlá analýza dokončena\n";
?>