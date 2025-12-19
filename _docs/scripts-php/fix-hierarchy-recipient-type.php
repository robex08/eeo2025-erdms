<?php
/**
 * Oprava recipient_type pro ORDER_SENT_FOR_APPROVAL edge
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

$dbConfig = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    $dsn = "mysql:host={$dbConfig['mysql']['host']};dbname={$dbConfig['mysql']['database']};charset=utf8mb4";
    $db = new PDO($dsn, $dbConfig['mysql']['username'], $dbConfig['mysql']['password']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Připojeno k DB\n\n";
    
    $profileId = 12;
    
    // Načíst profil
    $stmt = $db->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = ?");
    $stmt->execute([$profileId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$row) {
        die("❌ Profil $profileId nenalezen!\n");
    }
    
    $structure = json_decode($row['structure_json'], true);
    echo "📊 Načten profil ID=$profileId\n\n";
    
    // Najít template pro ORDER_SENT_FOR_APPROVAL
    $templateNode = null;
    foreach ($structure['nodes'] as $node) {
        if ($node['typ'] === 'template' && 
            isset($node['data']['eventTypes']) && 
            in_array('ORDER_SENT_FOR_APPROVAL', $node['data']['eventTypes'])) {
            $templateNode = $node;
            break;
        }
    }
    
    if (!$templateNode) {
        die("❌ Template pro ORDER_SENT_FOR_APPROVAL nenalezen!\n");
    }
    
    echo "✅ Nalezen template: {$templateNode['data']['name']}\n\n";
    
    // Najít edge z tohoto template
    $edgesFixed = 0;
    foreach ($structure['edges'] as &$edge) {
        if ($edge['source'] !== $templateNode['id']) {
            continue;
        }
        
        // Najít target node
        $targetNode = null;
        foreach ($structure['nodes'] as $n) {
            if ($n['id'] === $edge['target']) {
                $targetNode = $n;
                break;
            }
        }
        
        if (!$targetNode) {
            continue;
        }
        
        $currentRecipientType = $edge['data']['recipient_type'] ?? 'N/A';
        
        echo "🔧 Edge: {$edge['id']}\n";
        echo "   Target: {$targetNode['typ']} - {$targetNode['data']['name']}\n";
        echo "   Současný recipient_type: $currentRecipientType\n";
        
        // Pokud target je 'role' ale recipient_type je 'USER', oprav to
        if ($targetNode['typ'] === 'role' && $currentRecipientType !== 'ROLE') {
            $edge['data']['recipient_type'] = 'ROLE';
            echo "   ✅ OPRAVENO → ROLE\n\n";
            $edgesFixed++;
        } elseif ($targetNode['typ'] === 'user' && $currentRecipientType !== 'USER') {
            $edge['data']['recipient_type'] = 'USER';
            echo "   ✅ OPRAVENO → USER\n\n";
            $edgesFixed++;
        } elseif ($targetNode['typ'] === 'group' && $currentRecipientType !== 'GROUP') {
            $edge['data']['recipient_type'] = 'GROUP';
            echo "   ✅ OPRAVENO → GROUP\n\n";
            $edgesFixed++;
        } else {
            echo "   ℹ️  Ponecháno (už má správný recipient_type)\n\n";
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
    
} catch (Exception $e) {
    die("❌ Chyba: " . $e->getMessage() . "\n");
}
