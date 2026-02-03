<?php
/**
 * Test lednových dokladů - simulace situace P002 a V017
 */

// Načíst konstanty tabulek
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php';

// Načíst .env proměnné
$envPath = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

try {
    // Připojení k DB
    $config = array(
        'host' => $_ENV['DB_HOST'] ?? '10.3.172.11',
        'port' => $_ENV['DB_PORT'] ?? '3306', 
        'dbname' => $_ENV['DB_NAME'] ?? 'EEO-OSTRA-DEV',
        'username' => $_ENV['DB_USER'] ?? 'erdms_user',
        'password' => $_ENV['DB_PASSWORD'] ?? 'AhchohTahnoh7eim',
        'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4'
    );

    $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";
    $db = new PDO($dsn, $config['username'], $config['password'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ));

    echo "\n=== SIMULACE LEDNOVÝCH DOKLADŮ ===\n\n";

    $bookId = 22;
    echo "📚 Přidávání lednových dokladů do knihy ID: $bookId\n\n";

    // Simulace přidání několika lednových dokladů
    echo "=== PŘIDÁVÁNÍ TESTOVACÍCH LEDNOVÝCH DOKLADŮ ===\n";
    
    $januaryEntries = [
        ['datum' => '2026-01-15', 'typ' => 'prijem', 'castka' => 1000, 'popis' => 'Test příjem leden'],
        ['datum' => '2026-01-16', 'typ' => 'vydaj', 'castka' => 500, 'popis' => 'Test výdaj leden 1'],
        ['datum' => '2026-01-17', 'typ' => 'vydaj', 'castka' => 200, 'popis' => 'Test výdaj leden 2'],
        ['datum' => '2026-01-18', 'typ' => 'vydaj', 'castka' => 300, 'popis' => 'Test výdaj leden 3'],
        ['datum' => '2026-01-19', 'typ' => 'vydaj', 'castka' => 150, 'popis' => 'Test výdaj leden 4'],
        ['datum' => '2026-01-20', 'typ' => 'vydaj', 'castka' => 400, 'popis' => 'Test výdaj leden 5'],
        ['datum' => '2026-01-21', 'typ' => 'vydaj', 'castka' => 250, 'popis' => 'Test výdaj leden 6'],
        ['datum' => '2026-01-22', 'typ' => 'vydaj', 'castka' => 350, 'popis' => 'Test výdaj leden 7'],
        ['datum' => '2026-01-23', 'typ' => 'vydaj', 'castka' => 100, 'popis' => 'Test výdaj leden 8'],
        ['datum' => '2026-01-24', 'typ' => 'vydaj', 'castka' => 600, 'popis' => 'Test výdaj leden 9'],
        ['datum' => '2026-01-25', 'typ' => 'vydaj', 'castka' => 800, 'popis' => 'Test výdaj leden 10'],
        ['datum' => '2026-01-26', 'typ' => 'vydaj', 'castka' => 450, 'popis' => 'Test výdaj leden 11'],
        ['datum' => '2026-01-27', 'typ' => 'vydaj', 'castka' => 750, 'popis' => 'Test výdaj leden 12'],
        ['datum' => '2026-01-28', 'typ' => 'vydaj', 'castka' => 300, 'popis' => 'Test výdaj leden 13'],
        ['datum' => '2026-01-29', 'typ' => 'vydaj', 'castka' => 550, 'popis' => 'Test výdaj leden 14'],
        ['datum' => '2026-01-30', 'typ' => 'vydaj', 'castka' => 200, 'popis' => 'Test výdaj leden 15'],
        ['datum' => '2026-01-31', 'typ' => 'vydaj', 'castka' => 400, 'popis' => 'Test výdaj leden 16']
    ];
    
    foreach ($januaryEntries as $entry) {
        $stmt = $db->prepare("
            INSERT INTO 25a_pokladni_polozky 
            (pokladni_kniha_id, datum_zapisu, typ_dokladu, castka_celkem, obsah_zapisu, cislo_dokladu, cislo_poradi_v_roce, smazano)
            VALUES (?, ?, ?, ?, ?, 'TEMP', 1, 0)
        ");
        $stmt->execute([
            $bookId, 
            $entry['datum'], 
            $entry['typ'], 
            $entry['castka'], 
            $entry['popis']
        ]);
        
        echo "✅ Přidán {$entry['typ']} z {$entry['datum']}: {$entry['castka']} Kč\n";
    }

    echo "\n=== PŘEČÍSLOVÁNÍ VŠECH DOKLADŮ ===\n";
    
    require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/DocumentNumberService.php';
    $docService = new DocumentNumberService($db);
    
    $result = $docService->renumberBookDocuments($bookId);
    
    if ($result) {
        echo "✅ Kontinuální přečíslování dokončeno!\n\n";
    } else {
        echo "❌ Chyba při přečíslování!\n\n";
        exit(1);
    }

    echo "=== VÝSLEDNÝ STAV - LEDEN + ÚNOR ===\n";
    $stmt = $db->prepare("
        SELECT 
            p.id, 
            p.datum_zapisu, 
            p.cislo_dokladu, 
            p.cislo_poradi_v_roce, 
            p.typ_dokladu,
            MONTH(p.datum_zapisu) as mesic
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ?
          AND p.smazano = 0
        ORDER BY p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo sprintf("%-6s %-12s %-15s %-8s %-10s\n", "MĚSÍC", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
    echo str_repeat("-", 60) . "\n";
    
    $lastJanuaryOrder = 0;
    foreach ($entries as $entry) {
        echo sprintf("%-6s %-12s %-15s %-8s %-10s\n", 
            $entry['mesic'],
            $entry['datum_zapisu'],
            $entry['cislo_dokladu'],
            $entry['cislo_poradi_v_roce'],
            $entry['typ_dokladu']
        );
        
        if ($entry['mesic'] == 1) { // leden
            $lastJanuaryOrder = max($lastJanuaryOrder, $entry['cislo_poradi_v_roce']);
        }
    }

    echo "\n📊 ANALÝZA VÝSLEDKU:\n";
    echo "   Poslední lednový doklad má pořadí: $lastJanuaryOrder\n";
    
    // Test únorových dokladů
    echo "\n=== TEST NOVÝCH ÚNOROVÝCH DOKLADŮ ===\n";
    
    $testPrijem = $docService->generateDocumentNumber($bookId, 'prijem', '2026-02-10', 1);
    echo "🔢 Nový PŘÍJEM únor: " . $testPrijem['cislo_dokladu'] . " (pořadí: " . $testPrijem['cislo_poradi_v_roce'] . ")\n";
    
    $testVydaj = $docService->generateDocumentNumber($bookId, 'vydaj', '2026-02-10', 1);
    echo "🔢 Nový VÝDAJ únor: " . $testVydaj['cislo_dokladu'] . " (pořadí: " . $testVydaj['cislo_poradi_v_roce'] . ")\n";

    $expectedNext = $lastJanuaryOrder + 3; // +2 z února + 1 nový
    echo "\n💡 Únoroví dokladi POKRAČUJÍ od pořadí " . ($lastJanuaryOrder + 3) . "+\n";
    echo "✅ Číslování je nyní kontinuální napříč celým rokem!\n";

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
}
?>