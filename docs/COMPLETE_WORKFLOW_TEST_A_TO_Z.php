<?php
/**
 * 🔍 KOMPLETNÍ TEST WORKFLOW: A → Z
 * ==================================
 * 
 * Test celého workflow:
 * 1. Frontend ukládání (simulace)
 * 2. Backend save do DB
 * 3. Backend load z DB
 * 4. hierarchyTriggers čtení
 * 5. Odesílání email/inapp
 * 
 * Najdeme PŘESNĚ kde je problém!
 */

// Načti konstanty z API (všechny potřebné pro hierarchyTriggers)
define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');
define('TBL_ROLE', '25_role');
define('TBL_ODDELENI', '25_oddeleni');
define('TBL_NASTAVENI_GLOBALNI', '25a_nastaveni_globalni');
define('TBL_NOTIFIKACE_SABLONY', '25_notifikace_sablony');
define('TBL_NOTIFIKACE_TYPY_UDALOSTI', '25_notifikace_typy_udalosti');

require_once __DIR__ . '/../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php';

$pdo = new PDO(
    "mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", 
    "erdms_user", 
    "AhchohTahnoh7eim",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║          KOMPLETNÍ TEST WORKFLOW A → Z                      ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

// ============================================================================
// 1️⃣ CO JE AKTUÁLNĚ V DATABÁZI
// ============================================================================

echo "1️⃣ AKTUÁLNÍ STAV V DATABÁZI\n";
echo str_repeat("=", 60) . "\n";

$stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
$stmt->execute();
$dbJson = $stmt->fetchColumn();
$dbStructure = json_decode($dbJson, true);

// Najdi ORDER_PENDING_APPROVAL edges
$approvalEdges = [];
foreach ($dbStructure['edges'] as $edge) {
    if (isset($edge['data']['eventTypes']) && in_array('ORDER_PENDING_APPROVAL', $edge['data']['eventTypes'])) {
        $approvalEdges[] = $edge;
    }
}

echo "📊 Edges s ORDER_PENDING_APPROVAL: " . count($approvalEdges) . "\n\n";

foreach ($approvalEdges as $i => $edge) {
    echo "EDGE #" . ($i + 1) . " (ID: {$edge['id']})\n";
    
    // Najdi target node
    $targetNode = null;
    foreach ($dbStructure['nodes'] as $node) {
        if ($node['id'] === $edge['target']) {
            $targetNode = $node;
            break;
        }
    }
    
    if ($targetNode) {
        echo "   Target: {$targetNode['data']['label']}\n";
        echo "   Type: {$targetNode['data']['type']}\n";
        
        // DELIVERY kontrola
        $deliveryOld = $targetNode['data']['delivery'] ?? null;
        $deliveryNew = $targetNode['data']['deliverySettings'] ?? null;
        
        echo "   \n   📧 DELIVERY V DB:\n";
        if ($deliveryOld) {
            echo "      delivery.email: " . ($deliveryOld['email'] ? '✅ TRUE' : '❌ FALSE') . "\n";
            echo "      delivery.inApp: " . ($deliveryOld['inApp'] ? '✅ TRUE' : '❌ FALSE') . "\n";
            echo "      delivery.sms: " . ($deliveryOld['sms'] ? '✅ TRUE' : '❌ FALSE') . "\n";
        } else {
            echo "      delivery: ❌ NENÍ V DB!\n";
        }
        
        if ($deliveryNew) {
            echo "      deliverySettings.email: " . ($deliveryNew['email'] ? '✅ TRUE' : '❌ FALSE') . "\n";
            echo "      deliverySettings.inApp: " . ($deliveryNew['inApp'] ? '✅ TRUE' : '❌ FALSE') . "\n";
            echo "      deliverySettings.sms: " . ($deliveryNew['sms'] ? '✅ TRUE' : '❌ FALSE') . "\n";
        } else {
            echo "      deliverySettings: ❌ NENÍ V DB!\n";
        }
        
        // SCOPE kontrola
        $scope = $targetNode['data']['scopeDefinition'] ?? null;
        echo "   \n   🎯 SCOPE V DB:\n";
        if ($scope) {
            echo "      type: " . ($scope['type'] ?? 'N/A') . "\n";
            echo "      roleId: " . ($scope['roleId'] ?? '❌ CHYBÍ') . "\n";
            echo "      field: " . ($scope['field'] ?? 'N/A') . "\n";
        } else {
            echo "      scopeDefinition: ❌ NENÍ V DB!\n";
        }
    }
    
    echo "\n";
}

// ============================================================================
// 2️⃣ JAK BACKEND HIERARCHYTRIGGERS ČTENÍ
// ============================================================================

echo "2️⃣ JAK BACKEND ČTENÍ (hierarchyTriggers.php)\n";
echo str_repeat("=", 60) . "\n";

// Simuluj ORDER_PENDING_APPROVAL event
$eventData = [
    'orderId' => 999999,
    'objednatel_id' => 1,
    'order_number' => 'TEST-WORKFLOW'
];

try {
    $result = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData, $pdo);
    
    echo "✅ Backend funkce volána úspěšně!\n\n";
    
    if (isset($result['recipients']) && count($result['recipients']) > 0) {
        echo "📬 PŘÍJEMCI NALEZENI: " . count($result['recipients']) . "\n\n";
        
        foreach ($result['recipients'] as $i => $recipient) {
            echo "Příjemce #" . ($i + 1) . ":\n";
            echo "   User ID: {$recipient['user_id']}\n";
            echo "   Email: {$recipient['email']}\n";
            
            // DELIVERY kontrola
            if (isset($recipient['delivery'])) {
                $del = $recipient['delivery'];
                echo "   \n   📧 DELIVERY Z BACKEND:\n";
                echo "      email: " . ($del['email'] ? '✅ TRUE' : '❌ FALSE') . "\n";
                echo "      inApp: " . ($del['inApp'] ? '✅ TRUE' : '❌ FALSE') . "\n";
                echo "      sms: " . ($del['sms'] ? '✅ TRUE' : '❌ FALSE') . "\n";
            } else {
                echo "   📧 DELIVERY: ❌ CHYBÍ V BACKEND VÝSLEDKU!\n";
            }
            
            // Template info
            if (isset($recipient['templateName'])) {
                echo "   📄 Template: {$recipient['templateName']}\n";
            }
            
            echo "\n";
        }
    } else {
        echo "❌ ŽÁDNÍ PŘÍJEMCI NENALEZENI!\n";
        echo "Debug info:\n";
        print_r($result);
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA v backend funkci: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

// ============================================================================
// 3️⃣ KONTROLA JAK FRONTEND ODESÍLÁ DATA
// ============================================================================

echo "\n3️⃣ JAK FRONTEND MĚŘÍ DATA (check kódu)\n";
echo str_repeat("=", 60) . "\n";

$orgHierPath = __DIR__ . '/../apps/eeo-v2/client/src/pages/OrganizationHierarchy.js';
if (file_exists($orgHierPath)) {
    $content = file_get_contents($orgHierPath);
    
    // Najdi delivery save patterns
    preg_match_all('/delivery:\s*\{[^}]+\}/', $content, $matches);
    
    if (count($matches[0]) > 0) {
        echo "✅ Frontend ukládá delivery v " . count($matches[0]) . " místech:\n\n";
        
        $unique = array_unique($matches[0]);
        foreach ($unique as $i => $match) {
            echo ($i + 1) . ". " . trim($match) . "\n";
        }
    } else {
        echo "⚠️ Nenalezen delivery save pattern!\n";
    }
    
    echo "\n";
    
    // Najdi deliverySettings patterns
    preg_match_all('/deliverySettings:\s*\{[^}]+\}/', $content, $matches2);
    
    if (count($matches2[0]) > 0) {
        echo "✅ Frontend ukládá deliverySettings v " . count($matches2[0]) . " místech:\n\n";
        
        $unique2 = array_unique($matches2[0]);
        foreach ($unique2 as $i => $match) {
            echo ($i + 1) . ". " . trim($match) . "\n";
        }
    } else {
        echo "❌ Frontend NEUKLÁDÁ deliverySettings!\n";
    }
}

// ============================================================================
// 4️⃣ FINÁLNÍ DIAGNÓZA
// ============================================================================

echo "\n\n╔══════════════════════════════════════════════════════════════╗\n";
echo "║                    FINÁLNÍ DIAGNÓZA                          ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

$problems = [];
$fixes = [];

// Check 1: Jsou delivery data v DB?
$hasDeliveryInDB = false;
foreach ($approvalEdges as $edge) {
    foreach ($dbStructure['nodes'] as $node) {
        if ($node['id'] === $edge['target']) {
            if (isset($node['data']['delivery']) || isset($node['data']['deliverySettings'])) {
                $hasDeliveryInDB = true;
            }
        }
    }
}

if (!$hasDeliveryInDB) {
    $problems[] = "❌ Delivery data NEJSOU v databázi";
    $fixes[] = "Opravit ukládání profilu - přidat delivery do nodes";
}

// Check 2: Backend čte delivery?
if (isset($result['recipients']) && count($result['recipients']) > 0) {
    $hasDeliveryInResult = isset($result['recipients'][0]['delivery']);
    if (!$hasDeliveryInResult) {
        $problems[] = "❌ Backend NEČTE delivery z DB";
        $fixes[] = "Opravit hierarchyTriggers.php - číst delivery z node";
    }
} else {
    $problems[] = "❌ Backend NENALEZL žádné příjemce";
    $fixes[] = "Zkontrolovat logiku v hierarchyTriggers.php";
}

if (count($problems) > 0) {
    echo "🔴 NALEZENÉ PROBLÉMY:\n\n";
    foreach ($problems as $i => $problem) {
        echo ($i + 1) . ". $problem\n";
    }
    
    echo "\n\n🔧 POTŘEBNÉ OPRAVY:\n\n";
    foreach ($fixes as $i => $fix) {
        echo ($i + 1) . ". $fix\n";
    }
} else {
    echo "✅ VŠE FUNGUJE SPRÁVNĚ!\n";
}

echo "\n🏁 Test dokončen: " . date('Y-m-d H:i:s') . "\n";
?>