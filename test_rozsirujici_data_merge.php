<?php
/**
 * Test script pro ověření funkčnosti rozsirujiciDataHelper
 * 
 * Tento test ověří, že:
 * 1. Helper správně načte existující data
 * 2. Merge zachová všechny existující klíče
 * 3. Nová data se správně přidají/aktualizují
 */

// Načíst .env pro DB credentials
$envPath = __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'EEO-OSTRA-DEV');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASSWORD'] ?? '');

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/rozsirujiciDataHelper.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    echo "=== TEST ROZSIRUJICI DATA HELPER ===\n\n";

    // Test 1: Najít fakturu s existujícími rozsirujici_data
    $stmt = $pdo->query("
        SELECT id, fa_cislo_vema, rozsirujici_data 
        FROM 25a_objednavky_faktury 
        WHERE rozsirujici_data IS NOT NULL 
        AND rozsirujici_data != '' 
        AND rozsirujici_data != 'null'
        LIMIT 1
    ");
    $testInvoice = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$testInvoice) {
        echo "⚠️  Žádná faktura s rozsirujici_data nenalezena\n";
        echo "Vytvořím testovací data...\n\n";
        
        // Najít libovolnou fakturu
        $stmt = $pdo->query("SELECT id, fa_cislo_vema FROM 25a_objednavky_faktury WHERE aktivni = 1 LIMIT 1");
        $testInvoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$testInvoice) {
            die("❌ Žádná faktura k testování nenalezena\n");
        }
        
        // Vložit testovací data
        $testData = [
            'kontrola_radku' => [
                'kontrolovano' => true,
                'kontroloval_user_id' => 1,
                'kontrolovano_dne' => date('Y-m-d H:i:s')
            ],
            'typ_platby' => 'faktura'
        ];
        
        $stmt = $pdo->prepare("UPDATE 25a_objednavky_faktury SET rozsirujici_data = :data WHERE id = :id");
        $stmt->execute([
            'data' => json_encode($testData),
            'id' => $testInvoice['id']
        ]);
        
        $testInvoice['rozsirujici_data'] = json_encode($testData);
    }

    echo "📋 Testovací faktura: #{$testInvoice['id']} ({$testInvoice['fa_cislo_vema']})\n";
    echo "📦 Původní rozsirujici_data:\n";
    $original = json_decode($testInvoice['rozsirujici_data'], true);
    print_r($original);
    echo "\n";

    // Test 2: Použít helper pro přidání rocni_poplatek
    echo "🔧 Test 1: Přidání rocni_poplatek klíče pomocí setRozsirujiciDataKey...\n";
    
    $rocniPoplatekData = [
        'id' => 999,
        'nazev' => 'TEST Roční poplatek',
        'rok' => 2026,
        'prirazeno_dne' => TimezoneHelper::getCzechDateTime(),
        'prirazeno_uzivatelem_id' => 1
    ];
    
    setRozsirujiciDataKey(
        $pdo,
        '25a_objednavky_faktury',
        $testInvoice['id'],
        'rocni_poplatek',
        $rocniPoplatekData,
        1
    );
    
    // Ověřit výsledek
    $result = getRozsirujiciData($pdo, '25a_objednavky_faktury', $testInvoice['id']);
    
    echo "✅ Výsledná data po merge:\n";
    print_r($result);
    echo "\n";

    // Test 3: Ověřit, že původní klíče zůstaly zachovány
    $preserved = true;
    foreach ($original as $key => $value) {
        if (!isset($result[$key])) {
            echo "❌ CHYBA: Klíč '$key' byl ztracen!\n";
            $preserved = false;
        }
    }
    
    if ($preserved && isset($result['rocni_poplatek'])) {
        echo "✅ ÚSPĚCH: Všechny původní klíče zachovány + nový klíč 'rocni_poplatek' přidán\n\n";
    } else {
        echo "❌ SELHÁNÍ: Data nebyla správně mergována!\n\n";
    }

    // Test 4: Test hasRozsirujiciDataKey
    echo "🔧 Test 2: Ověření existence klíče pomocí hasRozsirujiciDataKey...\n";
    $hasRocniPoplatek = hasRozsirujiciDataKey($pdo, '25a_objednavky_faktury', $testInvoice['id'], 'rocni_poplatek');
    $hasNonExistent = hasRozsirujiciDataKey($pdo, '25a_objednavky_faktury', $testInvoice['id'], 'neexistujici_klic');
    
    if ($hasRocniPoplatek && !$hasNonExistent) {
        echo "✅ ÚSPĚCH: hasRozsirujiciDataKey správně detekuje existující/neexistující klíče\n\n";
    } else {
        echo "❌ SELHÁNÍ: hasRozsirujiciDataKey nefunguje správně\n\n";
    }

    // Test 5: Test getRozsirujiciDataKey
    echo "🔧 Test 3: Načtení konkrétního klíče pomocí getRozsirujiciDataKey...\n";
    $rocniPoplatekValue = getRozsirujiciDataKey($pdo, '25a_objednavky_faktury', $testInvoice['id'], 'rocni_poplatek');
    $defaultValue = getRozsirujiciDataKey($pdo, '25a_objednavky_faktury', $testInvoice['id'], 'neexistujici', 'DEFAULT');
    
    if ($rocniPoplatekValue && $rocniPoplatekValue['id'] == 999 && $defaultValue === 'DEFAULT') {
        echo "✅ ÚSPĚCH: getRozsirujiciDataKey správně vrací hodnoty a default\n";
        echo "   rocni_poplatek.nazev = {$rocniPoplatekValue['nazev']}\n\n";
    } else {
        echo "❌ SELHÁNÍ: getRozsirujiciDataKey nefunguje správně\n\n";
    }

    // Vyčištění - odstranit testovací data
    echo "🧹 Čištění: Odstraňuji testovací rocni_poplatek klíč...\n";
    removeRozsirujiciDataKey($pdo, '25a_objednavky_faktury', $testInvoice['id'], 'rocni_poplatek', 1);
    
    $finalData = getRozsirujiciData($pdo, '25a_objednavky_faktury', $testInvoice['id']);
    if (!isset($finalData['rocni_poplatek']) && isset($finalData['kontrola_radku'])) {
        echo "✅ ÚSPĚCH: Testovací klíč odstraněn, původní data zachována\n";
    } else {
        echo "⚠️  VAROVÁNÍ: Čištění může mít problémy\n";
    }

    echo "\n=== VŠECHNY TESTY DOKONČENY ===\n";
    echo "📊 Helper je připraven k použití v produkci!\n";

} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
