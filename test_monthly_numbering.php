<?php
/**
 * Analýza číslování podle měsíců
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

    echo "\n=== ANALÝZA ČÍSLOVÁNÍ PO MĚSÍCÍCH ===\n\n";

    // Najdu všechny knihy uživatele 1 pro rok 2026
    $stmt = $db->prepare("
        SELECT id, rok, uzivatel_id 
        FROM 25a_pokladni_knihy 
        WHERE uzivatel_id = 1 AND rok = 2026
        ORDER BY id
    ");
    $stmt->execute();
    $books = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "📚 Nalezené knihy pro uživatele 1, rok 2026:\n";
    foreach ($books as $book) {
        echo "   Kniha ID: {$book['id']}\n";
        
        // Pro každou knihu zobrazím doklady podle měsíců
        $stmt2 = $db->prepare("
            SELECT 
                MONTH(p.datum_zapisu) as mesic,
                p.typ_dokladu,
                p.cislo_dokladu,
                p.cislo_poradi_v_roce,
                p.datum_zapisu
            FROM 25a_pokladni_polozky p
            WHERE p.pokladni_kniha_id = ?
              AND p.smazano = 0
              AND YEAR(p.datum_zapisu) = 2026
            ORDER BY p.datum_zapisu, p.typ_dokladu
        ");
        $stmt2->execute([$book['id']]);
        $entries = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($entries)) {
            echo "     - Žádné doklady\n";
            continue;
        }
        
        echo sprintf("     %-6s %-8s %-12s %-8s %-12s\n", "MĚSÍC", "TYP", "ČÍSLO", "POŘADÍ", "DATUM");
        echo "     " . str_repeat("-", 50) . "\n";
        
        foreach ($entries as $entry) {
            echo sprintf("     %-6d %-8s %-12s %-8d %-12s\n", 
                $entry['mesic'],
                $entry['typ_dokladu'],
                $entry['cislo_dokladu'],
                $entry['cislo_poradi_v_roce'],
                $entry['datum_zapisu']
            );
        }
        echo "\n";
    }

    // Nyní zkusím přidat nové doklady pro únor
    echo "=== TEST NOVÝCH DOKLADŮ PRO ÚNOR ===\n\n";
    
    $bookId = 22; // Hlavní kniha
    
    require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/DocumentNumberService.php';
    $docService = new DocumentNumberService($db);
    
    echo "📅 Generuji doklady pro únor 2026:\n";
    
    // Test pro příjem v únoru
    $testPrijem = $docService->generateDocumentNumber($bookId, 'prijem', '2026-02-05', 1);
    echo "🔢 Nový PŘÍJEM únor: " . $testPrijem['cislo_dokladu'] . " (pořadí: " . $testPrijem['cislo_poradi_v_roce'] . ")\n";
    
    // Test pro výdaj v únoru  
    $testVydaj = $docService->generateDocumentNumber($bookId, 'vydaj', '2026-02-05', 1);
    echo "🔢 Nový VÝDAJ únor: " . $testVydaj['cislo_dokladu'] . " (pořadí: " . $testVydaj['cislo_poradi_v_roce'] . ")\n";
    
    echo "\n✅ Analýza dokončena!\n";

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
}
?>