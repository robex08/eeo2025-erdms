<?php
// ════════════════════════════════════════════════════════════════════════════════
// Migrace Generic Recipient System - Přidání recipient_type a scope_filter do edges
// ════════════════════════════════════════════════════════════════════════════════
//
// ÚČEL:
// Přidat do structure_json.edges[].data dva nové atributy:
//   1) recipient_type - automaticky detekovat z target node type
//   2) scope_filter - default 'NONE', nebo 'ENTITY_PARTICIPANTS' pokud onlyOrderParticipants=true
//
// POUŽITÍ:
// php migrate-generic-recipient-system.php
//
// ════════════════════════════════════════════════════════════════════════════════

$dbConfig = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

echo "🚀 Generic Recipient System Migration\n";
echo "════════════════════════════════════════════════════════════════\n\n";

try {
    // Připojení k DB
    $db = new PDO(
        "mysql:host=" . $dbConfig['mysql']['host'] . ";dbname=" . $dbConfig['mysql']['database'] . ";charset=utf8mb4",
        $dbConfig['mysql']['username'],
        $dbConfig['mysql']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
    
    echo "✅ Database connected\n\n";
    
    // Načíst všechny profily s neprázdnou strukturou
    $stmt = $db->query("
        SELECT id, nazev, structure_json 
        FROM 25_hierarchie_profily 
        WHERE structure_json IS NOT NULL 
        AND structure_json != '' 
        AND structure_json != '{\"nodes\":[],\"edges\":[]}'
        ORDER BY aktivni DESC, nazev ASC
    ");
    
    $profiles = $stmt->fetchAll();
    
    if (empty($profiles)) {
        echo "⚠️ Žádné profily s daty k migraci\n";
        exit(0);
    }
    
    echo "📊 Nalezeno " . count($profiles) . " profilů k migraci\n\n";
    
    $totalUpdated = 0;
    $totalEdgesProcessed = 0;
    
    // Projít všechny profily
    foreach ($profiles as $profile) {
        $profileId = $profile['id'];
        $profileName = $profile['nazev'];
        
        echo "📦 Profil: {$profileName} (ID: {$profileId})\n";
        
        // Dekódovat JSON
        $structure = json_decode($profile['structure_json'], true);
        
        if (!$structure || !isset($structure['nodes']) || !isset($structure['edges'])) {
            echo "   ⚠️ Neplatná struktura JSON - přeskakuji\n\n";
            continue;
        }
        
        $nodes = $structure['nodes'];
        $edges = $structure['edges'];
        
        echo "   - Nodes: " . count($nodes) . "\n";
        echo "   - Edges: " . count($edges) . "\n";
        
        // Vytvořit mapu node_id → node_type pro rychlé vyhledávání
        $nodeTypeMap = [];
        foreach ($nodes as $node) {
            $nodeId = $node['id'] ?? null;
            $nodeType = $node['data']['type'] ?? $node['typ'] ?? 'user';
            
            if ($nodeId) {
                $nodeTypeMap[$nodeId] = $nodeType;
            }
        }
        
        // Projít všechny edges a přidat recipient_type a scope_filter
        $edgesModified = 0;
        foreach ($edges as &$edge) {
            $edgeId = $edge['id'] ?? 'unknown';
            $targetId = $edge['target'] ?? null;
            
            if (!$targetId) {
                echo "   ⚠️ Edge {$edgeId} nemá target - přeskakuji\n";
                continue;
            }
            
            // Inicializovat data pokud neexistuje
            if (!isset($edge['data'])) {
                $edge['data'] = [];
            }
            
            // ────────────────────────────────────────────────────────────
            // 1. recipient_type - detekovat z target node type
            // ────────────────────────────────────────────────────────────
            $targetNodeType = $nodeTypeMap[$targetId] ?? null;
            
            if (!$targetNodeType) {
                echo "   ⚠️ Edge {$edgeId} target node nenalezen - přeskakuji\n";
                continue;
            }
            
            // Mapování node type → recipient_type
            $recipientType = 'USER'; // default
            switch ($targetNodeType) {
                case 'user':
                    $recipientType = 'USER';
                    break;
                case 'role':
                    $recipientType = 'ROLE';
                    break;
                case 'group':
                    $recipientType = 'GROUP';
                    break;
                case 'genericRecipient':
                    // Generic node - zjistit z node.data.genericType
                    $targetNode = null;
                    foreach ($nodes as $n) {
                        if ($n['id'] === $targetId) {
                            $targetNode = $n;
                            break;
                        }
                    }
                    if ($targetNode && isset($targetNode['data']['genericType'])) {
                        $recipientType = $targetNode['data']['genericType'];
                    }
                    break;
                default:
                    $recipientType = 'USER';
            }
            
            // Přidat pouze pokud ještě neexistuje
            if (!isset($edge['data']['recipient_type'])) {
                $edge['data']['recipient_type'] = $recipientType;
                $edgesModified++;
            }
            
            // ────────────────────────────────────────────────────────────
            // 2. scope_filter - default NONE, nebo ENTITY_PARTICIPANTS
            // ────────────────────────────────────────────────────────────
            $scopeFilter = 'NONE'; // default
            
            // Pokud je onlyOrderParticipants = true → ENTITY_PARTICIPANTS
            if (isset($edge['data']['onlyOrderParticipants']) && $edge['data']['onlyOrderParticipants'] === true) {
                $scopeFilter = 'ENTITY_PARTICIPANTS';
            }
            
            // Přidat pouze pokud ještě neexistuje
            if (!isset($edge['data']['scope_filter'])) {
                $edge['data']['scope_filter'] = $scopeFilter;
                $edgesModified++;
            }
            
            echo "   ✅ Edge {$edgeId}: recipient_type={$recipientType}, scope_filter={$scopeFilter}\n";
        }
        unset($edge); // Break reference
        
        // Aktualizovat structure
        $structure['edges'] = $edges;
        
        // Uložit zpět do DB
        if ($edgesModified > 0) {
            $updatedJson = json_encode($structure, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            
            $updateStmt = $db->prepare("
                UPDATE 25_hierarchie_profily 
                SET structure_json = :structure, dt_upraveno = NOW()
                WHERE id = :id
            ");
            $updateStmt->execute([
                ':structure' => $updatedJson,
                ':id' => $profileId
            ]);
            
            $totalUpdated++;
            $totalEdgesProcessed += $edgesModified;
            
            echo "   💾 Uloženo - upraveno {$edgesModified} edges\n\n";
        } else {
            echo "   ℹ️ Žádné změny - edges už mají recipient_type a scope_filter\n\n";
        }
    }
    
    echo "════════════════════════════════════════════════════════════════\n";
    echo "✅ MIGRACE DOKONČENA\n";
    echo "   - Aktualizováno profilů: {$totalUpdated}\n";
    echo "   - Zpracováno edges: {$totalEdgesProcessed}\n";
    echo "════════════════════════════════════════════════════════════════\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
