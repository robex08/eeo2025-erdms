<?php
/**
 * 🔧 OPRAVA PROFILU PRIKAZCI: Přesun eventTypes z nodes do edges
 * =============================================================
 * 
 * PROBLÉM: Template node obsahuje ORDER_PENDING_APPROVAL v eventTypes,
 *          ale edges žádné eventTypes nemají.
 * 
 * ŘEŠENÍ: Podle nové architektury eventTypes patří do EDGES, ne do NODES.
 * 
 * AKCE:
 * 1. Přesuneme ORDER_PENDING_APPROVAL z template node do příslušných edges
 * 2. Odstraníme eventTypes z template node  
 * 3. Aktualizujeme profil v databázi
 */

// Database connection
$pdo = new PDO(
    "mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", 
    "erdms_user", 
    "AhchohTahnoh7eim",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "🔧 OPRAVA PROFILU PRIKAZCI: EventTypes migrace\n";
echo str_repeat("=", 60) . "\n";

// Načti profil
$stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
$stmt->execute();
$json = $stmt->fetchColumn();

if (!$json) {
    echo "❌ Profil PRIKAZCI nenalezen!\n";
    exit(1);
}

$structure = json_decode($json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "❌ Nevalidní JSON!\n";
    exit(1);
}

echo "📊 Original - Nodes: " . count($structure['nodes']) . ", Edges: " . count($structure['edges']) . "\n";

// 1️⃣ Najdi template node s ORDER_PENDING_APPROVAL
$templateNodeId = null;
$templateEventTypes = [];

foreach ($structure['nodes'] as $index => $node) {
    if (isset($node['data']['eventTypes']) && 
        is_array($node['data']['eventTypes']) && 
        in_array('ORDER_PENDING_APPROVAL', $node['data']['eventTypes'])) {
        
        $templateNodeId = $node['id'];
        $templateEventTypes = $node['data']['eventTypes'];
        
        echo "✅ Template node nalezen: {$templateNodeId}\n";
        echo "   EventTypes: " . implode(', ', $templateEventTypes) . "\n";
        
        // Odstranit eventTypes z template node
        unset($structure['nodes'][$index]['data']['eventTypes']);
        echo "   ➜ EventTypes odstraněny z template node\n";
        break;
    }
}

if (!$templateNodeId) {
    echo "❌ Template node s ORDER_PENDING_APPROVAL nenalezen!\n";
    exit(1);
}

// 2️⃣ Najdi všechny outgoing edges z template node a přidej eventTypes
$edgesUpdated = 0;

foreach ($structure['edges'] as $index => $edge) {
    if ($edge['source'] === $templateNodeId) {
        // Přidej eventTypes do edge
        $structure['edges'][$index]['data']['eventTypes'] = $templateEventTypes;
        $edgesUpdated++;
        
        echo "✅ Edge aktualizován: {$edge['id']}\n";
        echo "   Target: {$edge['target']}\n";
        echo "   EventTypes přidány: " . implode(', ', $templateEventTypes) . "\n";
        
        // Najdi target node pro info
        foreach ($structure['nodes'] as $node) {
            if ($node['id'] === $edge['target']) {
                echo "   Target role: " . ($node['data']['label'] ?? 'N/A') . "\n";
                break;
            }
        }
        echo "\n";
    }
}

echo "📊 Celkem aktualizováno edges: $edgesUpdated\n";

// 3️⃣ Validace nové struktury
echo "\n🔍 VALIDACE OPRAVENÉ STRUKTURY:\n";

$approvalEdges = 0;
$templateNodes = 0;

foreach ($structure['edges'] as $edge) {
    if (isset($edge['data']['eventTypes']) && 
        in_array('ORDER_PENDING_APPROVAL', $edge['data']['eventTypes'])) {
        $approvalEdges++;
    }
}

foreach ($structure['nodes'] as $node) {
    if (isset($node['data']['eventTypes']) && 
        in_array('ORDER_PENDING_APPROVAL', $node['data']['eventTypes'])) {
        $templateNodes++;
    }
}

echo "✅ Edges s ORDER_PENDING_APPROVAL: $approvalEdges\n";
echo "✅ Template nodes s ORDER_PENDING_APPROVAL: $templateNodes (mělo by být 0)\n";

if ($approvalEdges > 0 && $templateNodes == 0) {
    echo "🎯 Struktura je správně opravena!\n";
} else {
    echo "❌ Struktura není správně opravena!\n";
    exit(1);
}

// 4️⃣ Zápis do databáze
echo "\n💾 UKLÁDÁNÍ DO DATABÁZE...\n";

$newJson = json_encode($structure, JSON_UNESCAPED_UNICODE);

$stmt = $pdo->prepare("
    UPDATE 25_hierarchie_profily 
    SET structure_json = ?
    WHERE id = 12
");

try {
    $stmt->execute([$newJson]);
    echo "✅ Profil úspěšně aktualizován v databázi!\n";
    
    // Ověř změnu
    $stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
    $stmt->execute();
    $verifyJson = $stmt->fetchColumn();
    
    $verifyStructure = json_decode($verifyJson, true);
    $verifyApprovalEdges = 0;
    
    foreach ($verifyStructure['edges'] as $edge) {
        if (isset($edge['data']['eventTypes']) && 
            in_array('ORDER_PENDING_APPROVAL', $edge['data']['eventTypes'])) {
            $verifyApprovalEdges++;
        }
    }
    
    echo "🔍 Verifikace: $verifyApprovalEdges edges s ORDER_PENDING_APPROVAL\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA při ukládání: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n🎉 OPRAVA DOKONČENA ÚSPĚŠNĚ!\n";
echo str_repeat("=", 60) . "\n";
echo "📋 CHANGELOG:\n";
echo "   ✅ ORDER_PENDING_APPROVAL přesunut z template node do edges\n";
echo "   ✅ Template node očištěn od eventTypes\n";
echo "   ✅ $edgesUpdated edges aktualizováno\n";
echo "   ✅ Profil uložen do databáze\n";
echo "\n💡 Nyní můžete znovu spustit workflow analýzu!\n";

?>