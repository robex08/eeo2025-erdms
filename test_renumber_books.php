<?php
/**
 * Test přečíslování dokladů v knihu podle typů
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
        'dbname' => $_ENV['DB_NAME'] ?? 'eeo2025-dev',
        'username' => $_ENV['DB_USER'] ?? 'erdms_user',
        'password' => $_ENV['DB_PASSWORD'] ?? 'AhchohTahnoh7eim',
        'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4'
    );

    $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";
    $db = new PDO($dsn, $config['username'], $config['password'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ));

    echo "\n=== TEST PŘEČÍSLOVÁNÍ DOKLADŮ ===\n\n";

    $bookId = 22; // Kniha uživatele 1 pro rok 2026
    echo "📚 Přečíslovávání pokladní knihy ID: $bookId\n\n";

    echo "=== SOUČASNÝ STAV PŘED PŘEČÍSLOVÁNÍM ===\n";
    $stmt = $db->prepare("
        SELECT 
            p.id, p.datum_zapisu, p.cislo_dokladu, p.cislo_poradi_v_roce, p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ?
          AND p.smazano = 0
        ORDER BY p.typ_dokladu, p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", "ID", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
    echo str_repeat("-", 60) . "\n";
    
    $currentType = '';
    foreach ($entries as $entry) {
        if ($currentType !== $entry['typ_dokladu']) {
            if ($currentType !== '') echo str_repeat("-", 60) . "\n";
            $currentType = $entry['typ_dokladu'];
        }
        echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", 
            $entry['id'],
            $entry['datum_zapisu'],
            $entry['cislo_dokladu'],
            $entry['cislo_poradi_v_roce'],
            $entry['typ_dokladu']
        );
    }

    echo "\n=== SPOUŠTÍM PŘEČÍSLOVÁNÍ ===\n";
    
    require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/DocumentNumberService.php';
    $docService = new DocumentNumberService($db);
    
    $result = $docService->renumberBookDocuments($bookId);
    
    if ($result) {
        echo "✅ Přečíslování dokončeno úspěšně!\n\n";
    } else {
        echo "❌ Chyba při přečíslování!\n\n";
        exit(1);
    }

    echo "=== STAV PO PŘEČÍSLOVÁNÍ ===\n";
    $stmt = $db->prepare("
        SELECT 
            p.id, p.datum_zapisu, p.cislo_dokladu, p.cislo_poradi_v_roce, p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ?
          AND p.smazano = 0
        ORDER BY p.typ_dokladu, p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", "ID", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
    echo str_repeat("-", 60) . "\n";
    
    $currentType = '';
    foreach ($entries as $entry) {
        if ($currentType !== $entry['typ_dokladu']) {
            if ($currentType !== '') echo str_repeat("-", 60) . "\n";
            $currentType = $entry['typ_dokladu'];
        }
        echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", 
            $entry['id'],
            $entry['datum_zapisu'],
            $entry['cislo_dokladu'],
            $entry['cislo_poradi_v_roce'],
            $entry['typ_dokladu']
        );
    }

    echo "\n✅ Test dokončen!\n";
    echo "📋 VÝSLEDEK: Každý typ má svoje číslování:\n";
    echo "   - Příjmy: P001, P002, P003... (nezávisle na výdajích)\n";
    echo "   - Výdaje: V001, V002, V003... (nezávisle na příjmech)\n\n";
    
    // Test nového dokladu
    echo "=== TEST NOVÉHO DOKLADU ===\n";
    
    // Test pro příjem
    $testPrijem = $docService->generateDocumentNumber($bookId, 'prijem', '2026-02-04', 1);
    echo "🔢 Nové číslo pro PŘÍJEM: " . $testPrijem['cislo_dokladu'] . " (pořadí: " . $testPrijem['cislo_poradi_v_roce'] . ")\n";
    
    // Test pro výdaj
    $testVydaj = $docService->generateDocumentNumber($bookId, 'vydaj', '2026-02-04', 1);
    echo "🔢 Nové číslo pro VÝDAJ: " . $testVydaj['cislo_dokladu'] . " (pořadí: " . $testVydaj['cislo_poradi_v_roce'] . ")\n";

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
}
?>