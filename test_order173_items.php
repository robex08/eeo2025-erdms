<?php
// Test debugging pro objednávku 173 - proč se neukládají položky

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Připojení k DB
try {
    $pdo = new PDO(
        'mysql:host=10.3.172.11;dbname=EEO-OSTRA-DEV;charset=utf8mb4',
        'erdms_user',
        'AhchohTahnoh7eim',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    die("DB Error: " . $e->getMessage());
}

// Load helper functions
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderQueries.php';

echo "=== TEST: Objednávka 173 - položky ===\n\n";

// 1. Zkontrolovat aktuální položky v DB
$stmt = $pdo->prepare("SELECT * FROM 25a_objednavky_polozky WHERE objednavka_id = 173");
$stmt->execute();
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "1. Aktuální položky v DB:\n";
echo "   Počet: " . count($items) . "\n\n";

if (count($items) > 0) {
    foreach ($items as $item) {
        echo "   - ID: {$item['id']}, Popis: {$item['popis']}, Cena: {$item['cena_bez_dph']}\n";
    }
    echo "\n";
}

// 2. TEST validace a parsování položek - simulace frontendu
echo "2. TEST: Simulace dat z frontendu\n\n";

// Příklad A: Správný formát
$testInputA = [
    'polozky' => [
        [
            'popis' => 'Test položka 1',
            'cena_bez_dph' => 1000.00,
            'sazba_dph' => 21,
            'cena_s_dph' => 1210.00,
            'usek_kod' => 'IT',
            'budova_kod' => null,
            'mistnost_kod' => null,
            'lp_id' => 15
        ],
        [
            'popis' => 'Test položka 2',
            'cena_bez_dph' => 2000.00,
            'sazba_dph' => 21,
            'cena_s_dph' => 2420.00,
            'lp_id' => null
        ]
    ]
];

echo "   TEST A: Pole 'polozky' s dvěma položkami\n";
$resultA = validateAndParseOrderItems($testInputA);
if (is_array($resultA) && isset($resultA['valid']) && $resultA['valid'] === false) {
    echo "   ❌ VALIDACE SELHALA:\n";
    print_r($resultA['errors']);
} elseif ($resultA === false) {
    echo "   ❌ Vrátilo FALSE (prázdné položky nebo chybný formát)\n";
} else {
    echo "   ✅ Validace OK: " . count($resultA) . " položek\n";
    foreach ($resultA as $idx => $item) {
        echo "      - [{$idx}] {$item['popis']}: {$item['cena_bez_dph']} Kč\n";
    }
}
echo "\n";

// Příklad B: Klíč polozky_objednavky
$testInputB = [
    'polozky_objednavky' => [
        [
            'popis' => 'Test položka 3',
            'cena_bez_dph' => 500.00,
            'sazba_dph' => 21,
            'cena_s_dph' => 605.00
        ]
    ]
];

echo "   TEST B: Pole 'polozky_objednavky' s jednou položkou\n";
$resultB = validateAndParseOrderItems($testInputB);
if (is_array($resultB) && isset($resultB['valid']) && $resultB['valid'] === false) {
    echo "   ❌ VALIDACE SELHALA:\n";
    print_r($resultB['errors']);
} elseif ($resultB === false) {
    echo "   ❌ Vrátilo FALSE\n";
} else {
    echo "   ✅ Validace OK: " . count($resultB) . " položek\n";
}
echo "\n";

// Příklad C: Prázdné položky (bez popisu)
$testInputC = [
    'polozky' => [
        [
            'popis' => '',  // PRÁZDNÝ POPIS!
            'cena_bez_dph' => 1000.00,
            'sazba_dph' => 21,
            'cena_s_dph' => 1210.00
        ]
    ]
];

echo "   TEST C: Položka s prázdným popisem\n";
$resultC = validateAndParseOrderItems($testInputC);
if (is_array($resultC) && isset($resultC['valid']) && $resultC['valid'] === false) {
    echo "   ❌ VALIDACE SELHALA:\n";
    print_r($resultC['errors']);
} elseif ($resultC === false) {
    echo "   ❌ Vrátilo FALSE (očekáváno - položka bez popisu se ignoruje)\n";
} else {
    echo "   ✅ Validace OK: " . count($resultC) . " položek\n";
}
echo "\n";

// Příklad D: Položky s pouze mezerami v popisu
$testInputD = [
    'polozky' => [
        [
            'popis' => '   ',  // POUZE MEZERY!
            'cena_bez_dph' => 1000.00,
            'sazba_dph' => 21,
            'cena_s_dph' => 1210.00
        ]
    ]
];

echo "   TEST D: Položka s mezerami v popisu\n";
$resultD = validateAndParseOrderItems($testInputD);
if (is_array($resultD) && isset($resultD['valid']) && $resultD['valid'] === false) {
    echo "   ❌ VALIDACE SELHALA:\n";
    print_r($resultD['errors']);
} elseif ($resultD === false) {
    echo "   ❌ Vrátilo FALSE (očekáváno - trim() odstraní mezery)\n";
} else {
    echo "   ✅ Validace OK: " . count($resultD) . " položek\n";
}
echo "\n";

echo "=== ZÁVĚR ===\n";
echo "Pokud frontend posílá položky s prázdným nebo jen s mezerami v popisu,\n";
echo "funkce validateAndParseOrderItems() je ignoruje a vrátí FALSE.\n";
echo "Backend pak nekontroluje chybu a položky se neuloží.\n\n";

echo "DALŠÍ KROK: Zkontrolovat developer console v prohlížeči při ukládání objednávky 173.\n";
echo "Hledat payload v Network tab (POST/PUT request) a zkontrolovat pole 'polozky' nebo 'polozky_objednavky'.\n";
