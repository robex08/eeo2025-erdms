<?php
/**
 * Script pro opravu číslování dokladů v pokladně
 * Přečísluje všechny doklady kontinuálně podle data
 */

// Načíst konstanty tabulek
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php';

// Načíst konfigurace a pomocné funkce
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

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

    echo "\n=== OPRAVA ČÍSLOVÁNÍ DOKLADŮ V POKLADNĚ ===\n\n";

    // Najít pokladní knihu uživatele 1 pro rok 2026
    $stmt = $db->prepare("
        SELECT id, rok, uzivatel_id 
        FROM 25a_pokladni_knihy 
        WHERE uzivatel_id = 1 AND rok = 2026
    ");
    $stmt->execute();
    $book = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$book) {
        echo "❌ Pokladní kniha pro uživatele 1, rok 2026 nenalezena\n";
        exit(1);
    }
    
    $bookId = $book['id'];
    echo "📚 Opravuji pokladní knihu ID: $bookId (uživatel 1, rok 2026)\n\n";

    // Zobrazit stav PŘED opravou
    echo "=== STAV PŘED OPRAVOU ===\n";
    $stmt = $db->prepare("
        SELECT 
            p.id, p.datum_zapisu, p.cislo_dokladu, p.cislo_poradi_v_roce, p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ?
          AND p.smazano = 0
        ORDER BY p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($entries)) {
        echo "❌ Žádné záznamy v pokladní knize\n";
        exit(1);
    }
    
    echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", "ID", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
    echo str_repeat("-", 60) . "\n";
    
    foreach ($entries as $entry) {
        echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", 
            $entry['id'],
            $entry['datum_zapisu'],
            $entry['cislo_dokladu'],
            $entry['cislo_poradi_v_roce'],
            $entry['typ_dokladu']
        );
    }

    // Použít DocumentNumberService pro přečíslování
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

    // Zobrazit stav PO opravě
    echo "=== STAV PO OPRAVĚ ===\n";
    $stmt->execute([$bookId]);
    $entriesAfter = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", "ID", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
    echo str_repeat("-", 60) . "\n";
    
    foreach ($entriesAfter as $entry) {
        echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", 
            $entry['id'],
            $entry['datum_zapisu'],
            $entry['cislo_dokladu'],
            $entry['cislo_poradi_v_roce'],
            $entry['typ_dokladu']
        );
    }

    echo "\n✅ OPRAVA DOKONČENA!\n";
    echo "📋 Číslování je nyní kontinuální napříč všemi typy dokladů v rámci pokladny.\n";

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>