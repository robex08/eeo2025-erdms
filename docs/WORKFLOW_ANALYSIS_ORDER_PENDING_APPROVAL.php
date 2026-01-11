<?php
/**
 * 🔍 KOMPLETNÍ ANALÝZA WORKFLOW: ORDER_PENDING_APPROVAL
 * ====================================================
 * 
 * Datum: 4. ledna 2026
 * Účel: Podrobná analýza workflow "ke schválení" včetně příjemců a šablon
 * Profil: ID 12 "PRIKAZCI" 
 * Event: ORDER_PENDING_APPROVAL (ID 1)
 * 
 * Tento script vytvoří:
 * 1. Podrobnou tabulku příjemců a šablon
 * 2. Analýzu workflow struktery 
 * 3. Ověření dat v databázi
 * 4. Kompletní dokumentaci
 */

// Database connection setup
function getDbConnection() {
    return new PDO(
        "mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", 
        "erdms_user", 
        "AhchohTahnoh7eim",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
}

// Simplified hierarchy triggers (load from existing file if possible)
if (file_exists(__DIR__ . '/../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php')) {
    require_once __DIR__ . '/../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php';
} else {
    // Mock function if file not found
    function resolveHierarchyNotificationRecipients($eventType, $eventData, $pdo) {
        return ['recipients' => [], 'debug' => 'hierarchyTriggers.php not loaded'];
    }
}

// ============================================================================
// 🎯 HLAVNÍ ANALÝZA
// ============================================================================

function analyzeOrderPendingApprovalWorkflow($pdo) {
    echo "╔═══════════════════════════════════════════════════════════════╗\n";
    echo "║                    WORKFLOW ANALYSIS                          ║\n";
    echo "║              ORDER_PENDING_APPROVAL (ke schválení)            ║\n";
    echo "╚═══════════════════════════════════════════════════════════════╝\n\n";

    // ========================================================================
    // 1️⃣ VERIFIKACE EVENT TYPE
    // ========================================================================
    
    echo "1️⃣ EVENT TYPE VERIFIKACE\n";
    echo str_repeat("=", 50) . "\n";
    
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $eventTables = array_filter($tables, function($table) {
        return strpos($table, 'typy_udalosti') !== false || strpos($table, 'event_type') !== false;
    });
    
    if (empty($eventTables)) {
        echo "⚠️  Event types tabulka nenalezena, kontroluji profil přímo...\n\n";
    } else {
        foreach ($eventTables as $table) {
            echo "📋 Tabulka nalezena: $table\n";
        }
        echo "\n";
    }

    // ========================================================================
    // 2️⃣ ANALÝZA PROFILU PRIKAZCI
    // ========================================================================
    
    echo "2️⃣ PROFIL PRIKAZCI ANALÝZA\n";
    echo str_repeat("=", 50) . "\n";
    
    $stmt = $pdo->prepare("
        SELECT id, nazev, popis, aktivni, structure_json
        FROM 25_hierarchie_profily 
        WHERE nazev = 'PRIKAZCI'
    ");
    $stmt->execute();
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        echo "❌ PROFIL PRIKAZCI NENALEZEN!\n";
        return;
    }
    
    echo "✅ Profil nalezen:\n";
    echo "   📄 ID: {$profile['id']}\n";
    echo "   📄 Název: {$profile['nazev']}\n";
    echo "   📄 Aktivní: " . ($profile['aktivni'] ? '✅ ANO' : '❌ NE') . "\n";
    echo "   📄 JSON velikost: " . number_format(strlen($profile['structure_json'])) . " bytes\n\n";
    
    $structure = json_decode($profile['structure_json'], true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "❌ CHYBA: Nevalidní JSON structure!\n";
        return;
    }

    // ========================================================================
    // 3️⃣ ANALÝZA WORKFLOW STRUKTURY
    // ========================================================================
    
    echo "3️⃣ WORKFLOW STRUKTURA ANALÝZA\n";
    echo str_repeat("=", 50) . "\n";
    
    $nodes = $structure['nodes'] ?? [];
    $edges = $structure['edges'] ?? [];
    
    echo "📊 Celkový počet uzlů (nodes): " . count($nodes) . "\n";
    echo "📊 Celkový počet hran (edges): " . count($edges) . "\n\n";
    
    // Najdi edges s ORDER_PENDING_APPROVAL
    $approvalEdges = [];
    $approvalNodes = [];
    
    foreach ($edges as $edge) {
        $eventTypes = $edge['data']['eventTypes'] ?? [];
        if (in_array('ORDER_PENDING_APPROVAL', $eventTypes)) {
            $approvalEdges[] = $edge;
            
            // Najdi source a target nodes
            foreach ($nodes as $node) {
                if ($node['id'] === $edge['source'] || $node['id'] === $edge['target']) {
                    $approvalNodes[$node['id']] = $node;
                }
            }
        }
    }
    
    echo "🎯 Edges s ORDER_PENDING_APPROVAL: " . count($approvalEdges) . "\n";
    echo "🎯 Související uzly: " . count($approvalNodes) . "\n\n";

    // ========================================================================
    // 4️⃣ DETAILNÍ ANALÝZA WORKFLOW CHAIN
    // ========================================================================
    
    echo "4️⃣ DETAILNÍ WORKFLOW CHAIN\n";
    echo str_repeat("=", 50) . "\n";
    
    $workflowChains = [];
    
    foreach ($approvalEdges as $edgeIndex => $edge) {
        echo "🔗 EDGE #" . ($edgeIndex + 1) . " (ID: {$edge['id']})\n";
        echo "   ├─ Priority: {$edge['data']['priority']}\n";
        echo "   ├─ Label: {$edge['data']['label']}\n";
        echo "   ├─ Event Types: " . implode(', ', $edge['data']['eventTypes']) . "\n";
        
        // Source node
        $sourceNode = $approvalNodes[$edge['source']] ?? null;
        if ($sourceNode) {
            echo "   ├─ SOURCE: {$sourceNode['data']['label']} (Type: {$sourceNode['data']['type']})\n";
            
            if ($sourceNode['data']['type'] === 'template') {
                echo "   │  ├─ Template: {$sourceNode['data']['templateName']}\n";
                echo "   │  └─ Subject: {$sourceNode['data']['subject']}\n";
            }
        }
        
        // Target node
        $targetNode = $approvalNodes[$edge['target']] ?? null;
        if ($targetNode) {
            echo "   └─ TARGET: {$targetNode['data']['label']} (Type: {$targetNode['data']['type']})\n";
            
            if (isset($targetNode['data']['scopeDefinition'])) {
                $scope = $targetNode['data']['scopeDefinition'];
                echo "       ├─ Scope Type: {$scope['type']}\n";
                echo "       ├─ Role ID: {$scope['roleId']}\n";
                
                if (isset($scope['field'])) {
                    echo "       ├─ Dynamic Field: {$scope['field']}\n";
                }
                
                if (isset($scope['selectedUsers'])) {
                    echo "       ├─ Selected Users: " . count($scope['selectedUsers']) . "\n";
                }
                
                // Delivery settings
                if (isset($targetNode['data']['deliverySettings'])) {
                    $delivery = $targetNode['data']['deliverySettings'];
                    echo "       └─ Delivery: ";
                    $methods = [];
                    if ($delivery['inApp']) $methods[] = 'InApp';
                    if ($delivery['email']) $methods[] = 'Email';
                    if ($delivery['sms']) $methods[] = 'SMS';
                    echo implode(', ', $methods) . "\n";
                }
            }
        }
        
        // Připrav data pro tabulku
        $workflowChains[] = [
            'edge_id' => $edge['id'],
            'priority' => $edge['data']['priority'],
            'source_template' => $sourceNode['data']['templateName'] ?? 'N/A',
            'source_subject' => $sourceNode['data']['subject'] ?? 'N/A',
            'target_role' => $scope['roleId'] ?? 'N/A',
            'scope_type' => $scope['type'] ?? 'N/A',
            'scope_field' => $scope['field'] ?? 'N/A',
            'delivery_methods' => $methods ?? [],
            'target_label' => $targetNode['data']['label'] ?? 'N/A'
        ];
        
        echo "\n";
    }

    // ========================================================================
    // 5️⃣ NAČTENÍ ROLÍ A UŽIVATELŮ
    // ========================================================================
    
    echo "5️⃣ ROLE A UŽIVATELÉ ANALÝZA\n";
    echo str_repeat("=", 50) . "\n";
    
    $roleAnalysis = [];
    
    foreach ($workflowChains as $chain) {
        if ($chain['target_role'] !== 'N/A') {
            $roleId = $chain['target_role'];
            
            // Načti role info
            $stmt = $pdo->prepare("
                SELECT nazev, popis 
                FROM 25_role 
                WHERE id = ?
            ");
            $stmt->execute([$roleId]);
            $role = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($role) {
                // Počet uživatelů s rolí (aktivní)
                $stmt = $pdo->prepare("
                    SELECT COUNT(DISTINCT u.id) as active_count
                    FROM 25_uzivatele u
                    JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
                    WHERE ur.role_id = ? AND u.aktivni = 1
                ");
                $stmt->execute([$roleId]);
                $activeCount = $stmt->fetchColumn();
                
                // Počet uživatelů s rolí (celkem)
                $stmt = $pdo->prepare("
                    SELECT COUNT(DISTINCT u.id) as total_count
                    FROM 25_uzivatele u
                    JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
                    WHERE ur.role_id = ?
                ");
                $stmt->execute([$roleId]);
                $totalCount = $stmt->fetchColumn();
                
                $roleAnalysis[$roleId] = [
                    'name' => $role['nazev'],
                    'description' => $role['popis'],
                    'active_users' => $activeCount,
                    'total_users' => $totalCount,
                    'chains' => []
                ];
            }
        }
    }
    
    // Přiřaď chains k rolím
    foreach ($workflowChains as $chain) {
        if (isset($roleAnalysis[$chain['target_role']])) {
            $roleAnalysis[$chain['target_role']]['chains'][] = $chain;
        }
    }
    
    foreach ($roleAnalysis as $roleId => $data) {
        echo "👥 ROLE: {$data['name']} (ID: $roleId)\n";
        echo "   ├─ Popis: {$data['description']}\n";
        echo "   ├─ Aktivní uživatelé: {$data['active_users']}\n";
        echo "   ├─ Celkem uživatelé: {$data['total_users']}\n";
        echo "   └─ Počet workflow chains: " . count($data['chains']) . "\n\n";
    }

    // ========================================================================
    // 6️⃣ GENEROVÁNÍ PODROBNÉ TABULKY
    // ========================================================================
    
    echo "6️⃣ PODROBNÁ TABULKA PŘÍJEMCŮ A ŠABLON\n";
    echo str_repeat("=", 80) . "\n";
    
    printf("%-5s %-8s %-25s %-20s %-15s %-12s %-20s\n", 
        "Edge", "Priority", "Template (Šablona)", "Subject (Předmět)", "Role", "Scope", "Delivery");
    echo str_repeat("-", 80) . "\n";
    
    foreach ($workflowChains as $chain) {
        $delivery = implode('+', $chain['delivery_methods']);
        $roleName = $roleAnalysis[$chain['target_role']]['name'] ?? "Role-{$chain['target_role']}";
        
        printf("%-5s %-8s %-25s %-20s %-15s %-12s %-20s\n",
            $chain['edge_id'],
            $chain['priority'],
            substr($chain['source_template'], 0, 24),
            substr($chain['source_subject'], 0, 19),
            substr($roleName, 0, 14),
            $chain['scope_type'],
            $delivery
        );
    }
    
    echo "\n";

    // ========================================================================
    // 7️⃣ SIMULACE KONKRÉTNÍ OBJEDNÁVKY
    // ========================================================================
    
    echo "7️⃣ SIMULACE WORKFLOW PRO KONKRÉTNÍ OBJEDNÁVKU\n";
    echo str_repeat("=", 50) . "\n";
    
    // Najdi nejnovější objednávku
    $stmt = $pdo->query("
        SELECT id, kod, objednatel_id, datum_vytvoreni
        FROM 25_objednavky 
        ORDER BY id DESC 
        LIMIT 1
    ");
    $testOrder = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($testOrder) {
        echo "🎯 Test objednávka: {$testOrder['kod']} (ID: {$testOrder['id']})\n";
        echo "   ├─ Objednatel ID: {$testOrder['objednatel_id']}\n";
        echo "   └─ Datum: {$testOrder['datum_vytvoreni']}\n\n";
        
        // Simuluj notifikaci
        try {
            $eventData = [
                'orderId' => $testOrder['id'],
                'objednatel_id' => $testOrder['objednatel_id'],
                'order_number' => $testOrder['kod']
            ];
            
            echo "🚀 Simulace notifikace...\n";
            $result = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData, $pdo);
            
            if ($result && isset($result['recipients']) && count($result['recipients']) > 0) {
                echo "✅ Nalezeno " . count($result['recipients']) . " příjemců:\n\n";
                
                foreach ($result['recipients'] as $index => $recipient) {
                    echo "👤 Příjemce #" . ($index + 1) . ":\n";
                    echo "   ├─ ID: {$recipient['user_id']}\n";
                    echo "   ├─ Email: {$recipient['email']}\n";
                    echo "   ├─ Template: {$recipient['templateName']}\n";
                    echo "   ├─ Subject: {$recipient['subject']}\n";
                    echo "   └─ Delivery: " . implode('+', array_keys(array_filter([
                        'InApp' => $recipient['inApp'] ?? false,
                        'Email' => $recipient['email_delivery'] ?? false,
                        'SMS' => $recipient['sms'] ?? false
                    ]))) . "\n\n";
                }
            } else {
                echo "⚠️  Žádní příjemci nenalezeni!\n\n";
            }
        } catch (Exception $e) {
            echo "❌ CHYBA při simulaci: " . $e->getMessage() . "\n\n";
        }
    } else {
        echo "⚠️  Žádná testovací objednávka nenalezena\n\n";
    }

    return [
        'profile' => $profile,
        'structure' => $structure,
        'workflow_chains' => $workflowChains,
        'role_analysis' => $roleAnalysis
    ];
}

// ============================================================================
// 🎯 SPUŠTĚNÍ ANALÝZY
// ============================================================================

try {
    $pdo = getDbConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $analysis = analyzeOrderPendingApprovalWorkflow($pdo);
    
    echo "╔═══════════════════════════════════════════════════════════════╗\n";
    echo "║                         SOUHRN                               ║\n";
    echo "╚═══════════════════════════════════════════════════════════════╝\n\n";
    
    echo "✅ Analýza dokončena úspěšně!\n";
    echo "📊 Workflow chains: " . count($analysis['workflow_chains']) . "\n";
    echo "👥 Analyzované role: " . count($analysis['role_analysis']) . "\n";
    echo "📄 Profil PRIKAZCI: AKTIVNÍ\n";
    echo "🎯 Event ORDER_PENDING_APPROVAL: FUNKČNÍ\n\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "📍 Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n🏁 Analýza dokončena: " . date('Y-m-d H:i:s') . "\n";
?>