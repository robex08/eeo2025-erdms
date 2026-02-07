<?php
/**
 * TEST KOMPLETNÍ MULTI-FIELD STORAGE IMPLEMENTACE
 * Testuje backend validaci, localStorage synchronizaci a databázové ukládání
 */

// Database connection
$pdo = new PDO("mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", "erdms_user", "CHANGE_ME_DB_PASSWORD");

// Načteme jen potřebné soubory
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php';

echo "🧪 === TEST MULTI-FIELD STORAGE IMPLEMENTACE ===\n\n";

// TEST 1: Backend validace a normalizace
echo "1️⃣ TEST: Backend validace multi-field konfigurace\n";

$testNodes = [
    [
        'id' => 'test-node-1',
        'data' => [
            'scopeDefinition' => [
                'field' => 'uzivatel_id' // Starý formát
            ]
        ]
    ],
    [
        'id' => 'test-node-2',
        'data' => [
            'scopeDefinition' => [
                'fields' => ['prikazce_id', 'objednatel_id', 'garant_uzivatel_id'] // Nový formát
            ]
        ]
    ],
    [
        'id' => 'test-node-3',
        'data' => [
            'scopeDefinition' => [
                'fields' => ['prikazce_id', 'INVALID_FIELD', 'objednatel_id'] // S nevalidním polem
            ]
        ]
    ]
];

$testEdges = [
    [
        'id' => 'test-edge-1',
        'source' => 'test-node-1',
        'target' => 'test-node-2',
        'data' => [
            'source_info_recipients' => [
                'field' => 'uzivatel_id' // Starý formát
            ]
        ]
    ],
    [
        'id' => 'test-edge-2',
        'source' => 'test-node-2',
        'target' => 'test-node-3',
        'data' => [
            'source_info_recipients' => [
                'fields' => ['prikazce_id', 'objednatel_id']
            ]
        ]
    ]
];

$testData = [
    'token' => 'test_token', // Pro test použijeme mock token
    'username' => 'test_user',
    'profile_id' => 12,
    'nodes' => $testNodes,
    'edges' => $testEdges
];

// Mock pro test - definujeme TBL konstanty
if (!defined('TBL_HIERARCHIE_PROFILY')) {
    define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');
}

// Mock token validation
if (!function_exists('verify_token')) {
    function verify_token($token, $pdo) {
        if ($token === 'test_token') {
            return ['username' => 'test_user'];
        }
        return false;
    }
}

echo "📤 Původní struktura:\n";
echo "  - Node 1: field = 'uzivatel_id'\n";
echo "  - Node 2: fields = ['prikazce_id', 'objednatel_id', 'garant_uzivatel_id']\n";
echo "  - Node 3: fields = ['prikazce_id', 'INVALID_FIELD', 'objednatel_id']\n";
echo "  - Edge 1: source_info field = 'uzivatel_id'\n";
echo "  - Edge 2: source_info fields = ['prikazce_id', 'objednatel_id']\n\n";

// Volání backend validace (simulace save_structure)
$result = handle_hierarchy_profiles_save_structure($testData, $pdo);

echo "📥 Backend odpověď:\n";
echo "  ✅ Status: " . ($result['success'] ? 'SUCCESS' : 'ERROR') . "\n";
if (isset($result['message'])) {
    echo "  📝 Zpráva: " . $result['message'] . "\n";
}
echo "\n";

// TEST 2: Načtení a kontrola uložených dat
echo "2️⃣ TEST: Načtení normalizovaných dat z databáze\n";

$loadResult = handle_hierarchy_profiles_load_structure([
    'token' => 'test_token',
    'username' => 'test_user',
    'profile_id' => 12
], $pdo);

if ($loadResult['success']) {
    $savedStructure = $loadResult['data'];
    
    echo "  ✅ Data úspěšně načtena\n";
    echo "  📊 Nodes: " . count($savedStructure['nodes']) . ", Edges: " . count($savedStructure['edges']) . "\n\n";
    
    // Kontrola migrace nodes
    foreach ($savedStructure['nodes'] as $node) {
        if (isset($node['data']['scopeDefinition'])) {
            $scope = $node['data']['scopeDefinition'];
            
            echo "  🔍 Node {$node['id']}:\n";
            
            if (isset($scope['field'])) {
                echo "    ❌ CHYBA: Stále obsahuje starý 'field': {$scope['field']}\n";
            } else {
                echo "    ✅ Starý 'field' byl odstraněn\n";
            }
            
            if (isset($scope['fields'])) {
                $fieldsStr = implode(', ', $scope['fields']);
                echo "    ✅ Multi-field 'fields': [{$fieldsStr}]\n";
                
                // Kontrola validace
                $validFields = [
                    'uzivatel_id', 'uzivatel_akt_id', 'garant_uzivatel_id', 'objednatel_id',
                    'schvalovatel_id', 'prikazce_id', 'zamek_uzivatel_id', 'vytvoril_uzivatel_id',
                    'aktualizoval_uzivatel_id', 'potvrdil_dodavatel_id', 'prikazce_fakturace_id'
                ];
                
                $invalidFields = array_diff($scope['fields'], $validFields);
                if (empty($invalidFields)) {
                    echo "    ✅ Všechna pole jsou validní\n";
                } else {
                    echo "    ❌ CHYBA: Nevalidní pole: " . implode(', ', $invalidFields) . "\n";
                }
            }
            echo "\n";
        }
    }
    
    // Kontrola migrace edges
    foreach ($savedStructure['edges'] as $edge) {
        if (isset($edge['data']['source_info_recipients'])) {
            $sourceInfo = $edge['data']['source_info_recipients'];
            
            echo "  🔍 Edge {$edge['id']}:\n";
            
            if (isset($sourceInfo['field'])) {
                echo "    ❌ CHYBA: Stále obsahuje starý 'field': {$sourceInfo['field']}\n";
            } else {
                echo "    ✅ Starý 'field' byl odstraněn\n";
            }
            
            if (isset($sourceInfo['fields'])) {
                $fieldsStr = implode(', ', $sourceInfo['fields']);
                echo "    ✅ Multi-field 'fields': [{$fieldsStr}]\n";
            }
            echo "\n";
        }
    }
} else {
    echo "  ❌ CHYBA při načítání: " . $loadResult['error'] . "\n\n";
}

// TEST 3: Simulace localStorage validation (JavaScript logika v PHP)
echo "3️⃣ TEST: Simulace frontend localStorage validace\n";

function simulateLocalStorageValidation($nodes, $edges) {
    $validFields = [
        'uzivatel_id', 'uzivatel_akt_id', 'garant_uzivatel_id', 'objednatel_id',
        'schvalovatel_id', 'prikazce_id', 'zamek_uzivatel_id', 'vytvoril_uzivatel_id',
        'aktualizoval_uzivatel_id', 'potvrdil_dodavatel_id', 'prikazce_fakturace_id'
    ];
    
    $normalizedNodes = [];
    $migratedCount = 0;
    $validatedCount = 0;
    
    foreach ($nodes as $node) {
        $normalized = $node;
        
        // Migrace field -> fields
        if (isset($node['data']['scopeDefinition']['field']) && !isset($node['data']['scopeDefinition']['fields'])) {
            $normalized['data']['scopeDefinition']['fields'] = [$node['data']['scopeDefinition']['field']];
            unset($normalized['data']['scopeDefinition']['field']);
            $migratedCount++;
            echo "  🔄 Migrace node {$node['id']}: field -> fields\n";
        }
        
        // Validace fields
        if (isset($normalized['data']['scopeDefinition']['fields'])) {
            $originalCount = count($normalized['data']['scopeDefinition']['fields']);
            $normalized['data']['scopeDefinition']['fields'] = array_intersect(
                $normalized['data']['scopeDefinition']['fields'],
                $validFields
            );
            $newCount = count($normalized['data']['scopeDefinition']['fields']);
            
            if ($newCount < $originalCount) {
                $validatedCount++;
                echo "  🧹 Validace node {$node['id']}: {$originalCount} -> {$newCount} polí\n";
            }
        }
        
        $normalizedNodes[] = $normalized;
    }
    
    return [
        'nodes' => $normalizedNodes,
        'migrated' => $migratedCount,
        'validated' => $validatedCount
    ];
}

$frontendResult = simulateLocalStorageValidation($testNodes, $testEdges);

echo "  📊 Frontend normalizace:\n";
echo "    🔄 Migrované nodes: {$frontendResult['migrated']}\n";
echo "    🧹 Validované nodes: {$frontendResult['validated']}\n\n";

// TEST 4: Výsledné porovnání
echo "4️⃣ TEST: Porovnání backend vs frontend normalizace\n";

$backendNodes = $savedStructure['nodes'] ?? [];
$frontendNodes = $frontendResult['nodes'];

$match = true;
for ($i = 0; $i < min(count($backendNodes), count($frontendNodes)); $i++) {
    $backendFields = $backendNodes[$i]['data']['scopeDefinition']['fields'] ?? [];
    $frontendFields = $frontendNodes[$i]['data']['scopeDefinition']['fields'] ?? [];
    
    if ($backendFields !== $frontendFields) {
        echo "  ❌ NESHODA node {$i}: backend [" . implode(',', $backendFields) . "] vs frontend [" . implode(',', $frontendFields) . "]\n";
        $match = false;
    }
}

if ($match) {
    echo "  ✅ Backend a frontend normalizace jsou konzistentní\n";
} else {
    echo "  ❌ CHYBA: Inconsistence mezi backend a frontend normalizací\n";
}

echo "\n🎯 === TEST DOKONČEN ===\n";

?>