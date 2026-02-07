<?php
/**
 * Oprava hierarchického profilu - přidat scope_filter pro ORDER_APPROVED edges
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

$dbConfig = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    $dsn = "mysql:host={$dbConfig['mysql']['host']};dbname={$dbConfig['mysql']['database']};charset=utf8mb4";
    $db = new PDO($dsn, $dbConfig['mysql']['username'], $dbConfig['mysql']['password']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Připojeno k DB\n\n";
    
    $profileId = 12; // PRIKAZCI profil
    
    // Načíst profil
    $stmt = $db->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = ?");
    $stmt->execute([$profileId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$row) {
        die("❌ Profil $profileId nenalezen!\n");
    }
    
    $structure = json_decode($row['structure_json'], true);
    echo "📊 Načten profil ID=$profileId\n";
    echo "   Nodes: " . count($structure['nodes']) . "\n";
    echo "   Edges: " . count($structure['edges']) . "\n\n";
    
    // Najít template pro ORDER_APPROVED
    $templateNode = null;
    foreach ($structure['nodes'] as $node) {
        if ($node['typ'] === 'template' && 
            isset($node['data']['eventTypes']) && 
            in_array('ORDER_APPROVED', $node['data']['eventTypes'])) {
            $templateNode = $node;
            break;
        }
    }
    
    if (!$templateNode) {
        die("❌ Template pro ORDER_APPROVED nenalezen!\n");
    }
    
    echo "✅ Nalezen template: {$templateNode['data']['name']}\n";
    echo "   Node ID: {$templateNode['id']}\n\n";
    
    // Najít všechny edges z tohoto template
    $edgesFixed = 0;
    foreach ($structure['edges'] as &$edge) {
        if ($edge['source'] !== $templateNode['id']) {
            continue;
        }
        
        $currentScopeFilter = $edge['data']['scope_filter'] ?? 'N/A';
        
        echo "🔧 Edge: {$edge['id']}\n";
        echo "   Současný scope_filter: $currentScopeFilter\n";
        
        // Pokud není nastaven scope_filter nebo je N/A, nastav PARTICIPANTS_ALL
        if (!isset($edge['data']['scope_filter']) || 
            $edge['data']['scope_filter'] === 'N/A' || 
            $edge['data']['scope_filter'] === 'NONE') {
            
            $edge['data']['scope_filter'] = 'PARTICIPANTS_ALL';
            echo "   ✅ OPRAVENO → PARTICIPANTS_ALL\n\n";
            $edgesFixed++;
        } else {
            echo "   ℹ️  Ponecháno (už má nastavený filtr)\n\n";
        }
    }
    unset($edge);
    
    if ($edgesFixed === 0) {
        echo "ℹ️  Žádné edges k opravě\n";
        exit(0);
    }
    
    // Uložit zpět do DB
    $updatedJson = json_encode($structure, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    $stmt = $db->prepare("UPDATE 25_hierarchie_profily SET structure_json = ? WHERE id = ?");
    $stmt->execute([$updatedJson, $profileId]);
    
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "✅ HOTOVO! Opraveno $edgesFixed edges\n";
    echo "═══════════════════════════════════════════════════════════════\n\n";
    echo "📋 CO SE ZMĚNILO:\n";
    echo "   Všechny edges pro ORDER_APPROVED template mají nyní:\n";
    echo "   scope_filter = PARTICIPANTS_ALL\n\n";
    echo "   To znamená, že notifikace při schválení objednávky dostanou\n";
    echo "   JEN účastníci TÉTO objednávky (autor, garant, schvalovatelé, příkazce).\n\n";
    
} catch (Exception $e) {
    die("❌ Chyba: " . $e->getMessage() . "\n");
}
