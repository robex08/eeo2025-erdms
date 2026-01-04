<?php
/**
 * 🔧 AUTOMATICKÁ OPRAVA: Frontend vs Backend mismatch
 * ===================================================
 * 
 * OPRAVY:
 * 1. Přidá roleId do scopeDefinition kde chybí
 * 2. Přidá deliverySettings z delivery pro backward compatibility  
 * 3. Přidá kompletní scopeDefinition kde chybí
 * 4. Aktivuje delivery settings pro všechny target nodes
 */

// Database connection
$pdo = new PDO(
    "mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", 
    "erdms_user", 
    "AhchohTahnoh7eim",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "🔧 AUTOMATICKÁ OPRAVA: Profile PRIKAZCI data\n";
echo str_repeat("=", 60) . "\n";

// Načti profil
$stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
$stmt->execute();
$json = $stmt->fetchColumn();

$structure = json_decode($json, true);
$originalNodes = count($structure['nodes']);
$changesCount = 0;

echo "📊 Original nodes: $originalNodes\n";

// Projdi všechny nodes a opravi je
foreach ($structure['nodes'] as $index => &$node) {
    if ($node['data']['type'] === 'role') {
        $nodeChanges = [];
        $nodeLabel = $node['data']['label'] ?? $node['id'];
        
        // Fix 1: roleId do scopeDefinition
        if (isset($node['data']['roleId'])) {
            if (!isset($node['data']['scopeDefinition'])) {
                $node['data']['scopeDefinition'] = [
                    'type' => 'ALL',
                    'roleId' => $node['data']['roleId']
                ];
                $nodeChanges[] = "Added complete scopeDefinition";
            } else {
                if (!isset($node['data']['scopeDefinition']['roleId'])) {
                    $node['data']['scopeDefinition']['roleId'] = $node['data']['roleId'];
                    $nodeChanges[] = "Added roleId to scopeDefinition";
                }
            }
        }
        
        // Fix 2: delivery -> deliverySettings
        if (isset($node['data']['delivery']) && !isset($node['data']['deliverySettings'])) {
            $node['data']['deliverySettings'] = $node['data']['delivery'];
            $nodeChanges[] = "Added deliverySettings from delivery";
        }
        
        // Fix 3: Aktivuj delivery settings pokud nejsou nastavené  
        if (!isset($node['data']['delivery'])) {
            $node['data']['delivery'] = [
                'email' => true,
                'inApp' => true, 
                'sms' => false
            ];
            $nodeChanges[] = "Added default delivery settings";
        }
        
        if (!isset($node['data']['deliverySettings'])) {
            $node['data']['deliverySettings'] = [
                'email' => true,
                'inApp' => true,
                'sms' => false
            ];
            $nodeChanges[] = "Added default deliverySettings";
        }
        
        if (count($nodeChanges) > 0) {
            $changesCount++;
            echo "🔧 $nodeLabel:\n";
            foreach ($nodeChanges as $change) {
                echo "   • $change\n";
            }
        }
    }
}

echo "\n📊 Celkem změn v nodes: $changesCount\n";

if ($changesCount > 0) {
    echo "\n💾 Ukládání opravených dat do databáze...\n";
    
    $newJson = json_encode($structure, JSON_UNESCAPED_UNICODE);
    
    $stmt = $pdo->prepare("
        UPDATE 25_hierarchie_profily 
        SET structure_json = ?
        WHERE id = 12
    ");
    
    try {
        $stmt->execute([$newJson]);
        echo "✅ Profil úspěšně aktualizován!\n";
        
        // Verifikace
        $stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
        $stmt->execute();
        $verifyJson = $stmt->fetchColumn();
        $verifyStructure = json_decode($verifyJson, true);
        
        $verifiedNodes = 0;
        $verifiedDelivery = 0;
        $verifiedScope = 0;
        
        foreach ($verifyStructure['nodes'] as $node) {
            if ($node['data']['type'] === 'role') {
                $verifiedNodes++;
                
                if (isset($node['data']['deliverySettings'])) {
                    $verifiedDelivery++;
                }
                
                if (isset($node['data']['scopeDefinition']['roleId'])) {
                    $verifiedScope++;
                }
            }
        }
        
        echo "\n🔍 VERIFIKACE:\n";
        echo "   • Role nodes: $verifiedNodes\n";
        echo "   • S deliverySettings: $verifiedDelivery\n";
        echo "   • S scopeDefinition.roleId: $verifiedScope\n";
        
    } catch (Exception $e) {
        echo "❌ CHYBA při ukládání: " . $e->getMessage() . "\n";
        exit(1);
    }
} else {
    echo "✅ Žádné změny potřebné!\n";
}

echo "\n🏁 Oprava dokončena: " . date('Y-m-d H:i:s') . "\n";
?>