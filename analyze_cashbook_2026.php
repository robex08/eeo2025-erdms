<?php
/**
 * Analýza všech záznamů pokladny pro rok 2026
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

    echo "\n=== ANALÝZA VŠECH ZÁZNAMŮ POKLADNY PRO ROK 2026 ===\n\n";

    // Najít všechny pokladní knihy pro rok 2026
    $stmt = $db->prepare("
        SELECT id, rok, uzivatel_id 
        FROM 25a_pokladni_knihy 
        WHERE rok = 2026
    ");
    $stmt->execute();
    $books = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($books as $book) {
        $bookId = $book['id'];
        echo "📚 Pokladní kniha ID: $bookId (uživatel {$book['uzivatel_id']}, rok {$book['rok']})\n";

        // Zobrazit všechny záznamy v této knize
        $stmt2 = $db->prepare("
            SELECT 
                p.id, p.datum_zapisu, p.cislo_dokladu, p.cislo_poradi_v_roce, p.typ_dokladu,
                MONTH(p.datum_zapisu) as mesic
            FROM 25a_pokladni_polozky p
            WHERE p.pokladni_kniha_id = ?
              AND p.smazano = 0
            ORDER BY p.datum_zapisu, p.id
        ");
        $stmt2->execute([$bookId]);
        $entries = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($entries)) {
            echo "   ❌ Žádné záznamy v této knize\n\n";
            continue;
        }
        
        echo sprintf("   %-5s %-12s %-6s %-15s %-8s %-10s\n", "ID", "DATUM", "MĚSÍC", "ČÍSLO", "POŘADÍ", "TYP");
        echo "   " . str_repeat("-", 65) . "\n";
        
        $previousMonth = null;
        foreach ($entries as $entry) {
            if ($previousMonth !== $entry['mesic']) {
                if ($previousMonth !== null) {
                    echo "   " . str_repeat("-", 65) . "\n";
                }
                $previousMonth = $entry['mesic'];
            }
            
            echo sprintf("   %-5s %-12s %-6s %-15s %-8s %-10s\n", 
                $entry['id'],
                $entry['datum_zapisu'],
                $entry['mesic'],
                $entry['cislo_dokladu'],
                $entry['cislo_poradi_v_roce'],
                $entry['typ_dokladu']
            );
        }
        echo "\n";
    }

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>