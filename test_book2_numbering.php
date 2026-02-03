<?php
/**
 * Test kontinuálního číslování pro knihu ID 2
 */

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

require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/DocumentNumberService.php';

try {
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

    echo "\n🎯 DATABÁZE: {$config['dbname']}\n\n";
    
    $bookId = 2;
    echo "📚 KNIHA ID: $bookId\n\n";

    echo "=== LEDEN 2026 - POSLEDNÍ DOKLADY ===\n";
    $stmt = $db->prepare("
        SELECT 
            p.id, p.datum_zapisu, p.cislo_dokladu, p.cislo_poradi_v_roce, p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ?
          AND YEAR(p.datum_zapisu) = 2026
          AND MONTH(p.datum_zapisu) = 1
          AND p.smazano = 0
        ORDER BY p.cislo_poradi_v_roce DESC
        LIMIT 5
    ");
    $stmt->execute([$bookId]);
    $lastJanuary = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($lastJanuary as $entry) {
        echo sprintf("   %-12s %-15s pořadí: %d (%s)\n", 
            $entry['datum_zapisu'],
            $entry['cislo_dokladu'],
            $entry['cislo_poradi_v_roce'],
            $entry['typ_dokladu']
        );
    }
    
    $maxOrder = $lastJanuary[0]['cislo_poradi_v_roce'] ?? 0;
    echo "\n📊 Poslední lednový doklad: pořadí $maxOrder\n\n";

    echo "=== ÚNOR 2026 - SOUČASNÝ STAV ===\n";
    $stmt = $db->prepare("
        SELECT 
            p.id, p.datum_zapisu, p.cislo_dokladu, p.cislo_poradi_v_roce, p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ?
          AND YEAR(p.datum_zapisu) = 2026
          AND MONTH(p.datum_zapisu) = 2
          AND p.smazano = 0
        ORDER BY p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    $february = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($february)) {
        echo "   (žádné únorové doklady)\n";
    } else {
        foreach ($february as $entry) {
            echo sprintf("   %-12s %-15s pořadí: %d (%s)\n", 
                $entry['datum_zapisu'],
                $entry['cislo_dokladu'],
                $entry['cislo_poradi_v_roce'],
                $entry['typ_dokladu']
            );
        }
    }

    echo "\n=== TEST NOVÉHO ČÍSLOVÁNÍ ===\n";
    
    $docService = new DocumentNumberService($db);
    
    // Test pro nový příjem v únoru
    $testPrijem = $docService->generateDocumentNumber($bookId, 'prijem', '2026-02-05', 1);
    echo "🔢 Nový PŘÍJEM únor: {$testPrijem['cislo_dokladu']} (pořadí: {$testPrijem['cislo_poradi_v_roce']})\n";
    
    // Test pro nový výdaj v únoru
    $testVydaj = $docService->generateDocumentNumber($bookId, 'vydaj', '2026-02-05', 1);
    echo "🔢 Nový VÝDAJ únor: {$testVydaj['cislo_dokladu']} (pořadí: {$testVydaj['cislo_poradi_v_roce']})\n";

    $expectedNext = $maxOrder + 1;
    echo "\n💡 VÝSLEDEK:\n";
    if ($testPrijem['cislo_poradi_v_roce'] == $expectedNext) {
        echo "✅ Číslování POKRAČUJE správně z ledna! ($maxOrder → $expectedNext)\n";
        echo "✅ Nové doklady v únoru navazují na lednové doklady.\n";
    } else {
        echo "❌ Číslování NEPOKRAČUJE! Očekáváno: $expectedNext, dostali jsme: {$testPrijem['cislo_poradi_v_roce']}\n";
    }

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
}
?>