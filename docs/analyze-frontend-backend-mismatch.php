<?php
/**
 * 🔍 ANALÝZA PROBLÉMŮ: Frontend vs Backend delivery settings
 * ==========================================================
 * 
 * IDENTIFIKOVANÉ PROBLÉMY:
 * 1. Delivery settings se ukládají do node.data.delivery
 * 2. Backend očekává node.data.deliverySettings 
 * 3. RoleId se neukládá správně do scopeDefinition
 * 
 * Provedeme kompletní analýzu současného stavu a navrhnem opravy.
 */

// Database connection
$pdo = new PDO(
    "mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", 
    "erdms_user", 
    "AhchohTahnoh7eim",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "🔍 ANALÝZA PROBLÉMŮ: Frontend vs Backend data\n";
echo str_repeat("=", 60) . "\n";

// ============================================================================
// 1️⃣ ANALÝZA SOUČASNÉHO STAVU PROFILU
// ============================================================================

$stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
$stmt->execute();
$json = $stmt->fetchColumn();

$structure = json_decode($json, true);

echo "1️⃣ SOUČASNÝ STAV PROFILU PRIKAZCI\n";
echo str_repeat("-", 40) . "\n";

// Najdi target nodes (role nodes)
$targetNodes = [];
foreach ($structure['nodes'] as $index => $node) {
    if ($node['data']['type'] === 'role') {
        $targetNodes[] = [
            'index' => $index,
            'id' => $node['id'],
            'label' => $node['data']['label'] ?? 'N/A',
            'node' => $node
        ];
    }
}

echo "📊 Celkem target nodes (role): " . count($targetNodes) . "\n\n";

foreach ($targetNodes as $target) {
    $node = $target['node'];
    echo "🎯 NODE: {$target['label']} (ID: {$target['id']})\n";
    
    // Kontrola roleId
    $roleId = $node['data']['roleId'] ?? null;
    echo "   📋 roleId: " . ($roleId ? "✅ $roleId" : "❌ CHYBÍ") . "\n";
    
    // Kontrola scopeDefinition
    if (isset($node['data']['scopeDefinition'])) {
        $scope = $node['data']['scopeDefinition'];
        echo "   📡 scopeDefinition:\n";
        echo "      • Type: " . ($scope['type'] ?? 'N/A') . "\n";
        echo "      • RoleId: " . (isset($scope['roleId']) ? "✅ {$scope['roleId']}" : "❌ CHYBÍ") . "\n";
        echo "      • Field: " . ($scope['field'] ?? 'N/A') . "\n";
    } else {
        echo "   📡 scopeDefinition: ❌ CHYBÍ\n";
    }
    
    // Kontrola delivery settings
    $deliveryOld = $node['data']['delivery'] ?? null;
    $deliveryNew = $node['data']['deliverySettings'] ?? null;
    
    echo "   📧 delivery (frontend): ";
    if ($deliveryOld) {
        $email = $deliveryOld['email'] ?? false ? '✅' : '❌';
        $inApp = $deliveryOld['inApp'] ?? false ? '✅' : '❌';
        $sms = $deliveryOld['sms'] ?? false ? '✅' : '❌';
        echo "Email:$email InApp:$inApp SMS:$sms\n";
    } else {
        echo "❌ CHYBÍ\n";
    }
    
    echo "   📧 deliverySettings (backend): ";
    if ($deliveryNew) {
        $email = $deliveryNew['email'] ?? false ? '✅' : '❌';
        $inApp = $deliveryNew['inApp'] ?? false ? '✅' : '❌';
        $sms = $deliveryNew['sms'] ?? false ? '✅' : '❌';
        echo "Email:$email InApp:$inApp SMS:$sms\n";
    } else {
        echo "❌ CHYBÍ\n";
    }
    
    echo "\n";
}

// ============================================================================
// 2️⃣ ANALÝZA BACKEND OČEKÁVÁNÍ
// ============================================================================

echo "2️⃣ BACKEND OČEKÁVÁNÍ (hierarchyTriggers.php)\n";
echo str_repeat("-", 40) . "\n";

// Načti z hierarchyTriggers.php jak backend čte delivery settings
$hierarchyTriggersPath = __DIR__ . '/../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php';
if (file_exists($hierarchyTriggersPath)) {
    $content = file_get_contents($hierarchyTriggersPath);
    
    // Hledej delivery patterns
    $deliveryMatches = [];
    if (preg_match_all('/delivery.*Settings.*\[.*\]|delivery.*\[.*email.*\]|deliverySettings.*\[/', $content, $matches)) {
        $deliveryMatches = array_unique($matches[0]);
    }
    
    echo "🔍 Backend hledá delivery jako:\n";
    foreach ($deliveryMatches as $match) {
        echo "   • $match\n";
    }
    
    // Hledej roleId patterns
    $roleIdMatches = [];
    if (preg_match_all('/roleId.*=|scopeDefinition.*roleId|\[\'roleId\'\]/', $content, $matches)) {
        $roleIdMatches = array_unique($matches[0]);
    }
    
    echo "\n🔍 Backend hledá roleId jako:\n";
    foreach ($roleIdMatches as $match) {
        echo "   • $match\n";
    }
} else {
    echo "❌ hierarchyTriggers.php nenalezen\n";
}

// ============================================================================
// 3️⃣ IDENTIFIKOVANÉ PROBLÉMY
// ============================================================================

echo "\n3️⃣ IDENTIFIKOVANÉ PROBLÉMY\n";
echo str_repeat("-", 40) . "\n";

$problems = [
    "❌ DELIVERY MISMATCH" => [
        "Frontend ukládá do: node.data.delivery",
        "Backend čte z: node.data.deliverySettings", 
        "Výsledek: Delivery settings se nezobrazují v analýze"
    ],
    "❌ ROLEID CHYBÍ" => [
        "Frontend neukládá roleId do scopeDefinition", 
        "Backend potřebuje: scopeDefinition.roleId",
        "Výsledek: Role nelze identifikovat v backend analýze"
    ],
    "❌ INCOMPLETE SCOPE" => [
        "Některé target nodes mají neúplný scopeDefinition",
        "Chybí povinné vlastnosti pro backend zpracování",
        "Výsledek: Edge #3 je incomplete"
    ]
];

foreach ($problems as $title => $details) {
    echo "$title:\n";
    foreach ($details as $detail) {
        echo "   • $detail\n";
    }
    echo "\n";
}

// ============================================================================
// 4️⃣ NÁVRH OPRAV
// ============================================================================

echo "4️⃣ NÁVRHY OPRAV\n";
echo str_repeat("-", 40) . "\n";

echo "🔧 FRONTEND OPRAVY (OrganizationHierarchy.js):\n\n";

echo "1. DELIVERY SETTINGS FIX:\n";
echo "   Změnit z: node.data.delivery = { email: true, inApp: true, sms: false }\n";
echo "   Na:      node.data.deliverySettings = { email: true, inApp: true, sms: false }\n";
echo "   A zachovat i starý formát pro backward compatibility\n\n";

echo "2. ROLEID V SCOPEDEFINITION:\n";
echo "   Pro role nodes přidat: scopeDefinition.roleId = node.data.roleId\n";
echo "   Automaticky při ukládání role target node\n\n";

echo "3. SCOPE VALIDATION:\n";
echo "   Ověřit že všechny target nodes mají kompletní scopeDefinition\n";
echo "   Přidat required fields validation před uložením\n\n";

echo "🔧 BACKEND COMPATIBILITY:\n\n";

echo "1. DUAL DELIVERY SUPPORT:\n";
echo "   hierarchyTriggers.php číst jak delivery tak deliverySettings\n";
echo "   Preferovat deliverySettings, fallback na delivery\n\n";

echo "2. AUTOMATIC ROLEID INFERENCE:\n";
echo "   Pokud scopeDefinition.roleId chybí, vzít z node.data.roleId\n";
echo "   Automatic migration při načítání profilu\n\n";

// ============================================================================
// 5️⃣ QUICK FIX SCRIPT PREVIEW
// ============================================================================

echo "5️⃣ QUICK FIX NÁHLED\n";
echo str_repeat("-", 40) . "\n";

$fixNeeded = false;
$fixedNodes = [];

foreach ($structure['nodes'] as $index => $node) {
    if ($node['data']['type'] === 'role') {
        $needsFix = false;
        $fixes = [];
        
        // Fix 1: Delivery -> deliverySettings
        if (isset($node['data']['delivery']) && !isset($node['data']['deliverySettings'])) {
            $fixes[] = "Add deliverySettings from delivery";
            $needsFix = true;
        }
        
        // Fix 2: Add roleId to scopeDefinition
        if (isset($node['data']['roleId']) && isset($node['data']['scopeDefinition'])) {
            if (!isset($node['data']['scopeDefinition']['roleId'])) {
                $fixes[] = "Add roleId to scopeDefinition";
                $needsFix = true;
            }
        }
        
        // Fix 3: Add missing scopeDefinition
        if (!isset($node['data']['scopeDefinition']) && isset($node['data']['roleId'])) {
            $fixes[] = "Add complete scopeDefinition";
            $needsFix = true;
        }
        
        if ($needsFix) {
            $fixNeeded = true;
            $fixedNodes[] = [
                'id' => $node['id'],
                'label' => $node['data']['label'] ?? 'N/A',
                'fixes' => $fixes
            ];
        }
    }
}

if ($fixNeeded) {
    echo "🔧 NODES POTŘEBUJÍCÍ OPRAVU:\n\n";
    foreach ($fixedNodes as $fixNode) {
        echo "Node: {$fixNode['label']} (ID: {$fixNode['id']})\n";
        foreach ($fixNode['fixes'] as $fix) {
            echo "   • $fix\n";
        }
        echo "\n";
    }
    
    echo "💡 Spustit fix script? (Vytvořím automatickou opravu)\n";
} else {
    echo "✅ Všechny nodes jsou v pořádku!\n";
}

echo "\n🏁 Analýza dokončena: " . date('Y-m-d H:i:s') . "\n";
?>