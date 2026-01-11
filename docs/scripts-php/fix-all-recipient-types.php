<?php
/**
 * Oprava VŠECH recipient_type v hierarchickém profilu
 * Automaticky nastaví recipient_type podle typu target node
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
    echo "📊 Načten profil ID=$profileId\n";
    echo "   Nodes: " . count($structure['nodes']) . "\n";
    echo "   Edges: " . count($structure['edges']) . "\n\n";
    
    // Projít VŠECHNY edges a opravit recipient_type podle target node typu
    $edgesFixed = 0;
    
    foreach ($structure['edges'] as &$edge) {
        // Najít target node
        $targetNode = null;
        foreach ($structure['nodes'] as $n) {
            if ($n['id'] === $edge['target']) {
                $targetNode = $n;
                break;
            }
        }
        
        if (!$targetNode) {
            echo "⚠️  Edge {$edge['id']} - target node nenalezen!\n";
            continue;
        }
        
        $currentRecipientType = $edge['data']['recipient_type'] ?? 'N/A';
        $correctRecipientType = null;
        
        // Určit správný recipient_type podle typu target node
        switch ($targetNode['typ']) {
            case 'role':
                $correctRecipientType = 'ROLE';
                break;
            case 'user':
                $correctRecipientType = 'USER';
                break;
            case 'group':
                $correctRecipientType = 'GROUP';
                break;
            default:
                echo "⚠️  Edge {$edge['id']} - neznámý typ target node: {$targetNode['typ']}\n";
                continue 2;
        }
        
        // Pokud recipient_type není správný, oprav ho
        if ($currentRecipientType !== $correctRecipientType) {
            echo "🔧 Edge: {$edge['id']}\n";
            echo "   Target: {$targetNode['typ']} - {$targetNode['data']['name']}\n";
            echo "   Současný recipient_type: $currentRecipientType\n";
            echo "   ✅ OPRAVENO → $correctRecipientType\n\n";
            
            $edge['data']['recipient_type'] = $correctRecipientType;
            $edgesFixed++;
        }
    }
    unset($edge);
    
    if ($edgesFixed === 0) {
        echo "ℹ️  Všechny edges mají správný recipient_type\n";
        exit(0);
    }
    
    // Uložit zpět do DB
    $updatedJson = json_encode($structure, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    $stmt = $db->prepare("UPDATE 25_hierarchie_profily SET structure_json = ? WHERE id = ?");
    $stmt->execute([$updatedJson, $profileId]);
    
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "✅ HOTOVO! Opraveno $edgesFixed edges\n";
    echo "═══════════════════════════════════════════════════════════════\n\n";
    echo "Všechny edges nyní mají správný recipient_type podle typu target node:\n";
    echo "  - role → ROLE\n";
    echo "  - user → USER\n";
    echo "  - group → GROUP\n\n";
    
} catch (Exception $e) {
    die("❌ Chyba: " . $e->getMessage() . "\n");
}
