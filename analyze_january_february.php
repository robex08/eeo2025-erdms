<?php
/**
 * Analýza číslování - leden vs únor
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

    echo "\n=== ANALÝZA ČÍSLOVÁNÍ LEDEN vs ÚNOR ===\n\n";

    $bookId = 22; // Hlavní kniha uživatele 1
    
    echo "📚 Pokladní kniha ID: $bookId (uživatel 1, rok 2026)\n\n";

    echo "=== LEDEN 2026 ===\n";
    $stmt = $db->prepare("
        SELECT 
            p.id,
            p.datum_zapisu,
            p.cislo_dokladu,
            p.cislo_poradi_v_roce,
            p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ?
          AND YEAR(p.datum_zapisu) = 2026
          AND MONTH(p.datum_zapisu) = 1
          AND p.smazano = 0
        ORDER BY p.typ_dokladu, p.cislo_poradi_v_roce
    ");
    $stmt->execute([$bookId]);
    $ledneEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($ledneEntries)) {
        echo "❌ V lednu nejsou žádné doklady\n";
    } else {
        echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", "ID", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
        echo str_repeat("-", 60) . "\n";
        
        $maxPrijem = 0;
        $maxVydaj = 0;
        
        foreach ($ledneEntries as $entry) {
            echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", 
                $entry['id'],
                $entry['datum_zapisu'],
                $entry['cislo_dokladu'],
                $entry['cislo_poradi_v_roce'],
                $entry['typ_dokladu']
            );
            
            if ($entry['typ_dokladu'] == 'prijem') {
                $maxPrijem = max($maxPrijem, $entry['cislo_poradi_v_roce']);
            } elseif ($entry['typ_dokladu'] == 'vydaj') {
                $maxVydaj = max($maxVydaj, $entry['cislo_poradi_v_roce']);
            }
        }
        
        echo "\n📊 POSLEDNÍ ČÍSLA V LEDNU:\n";
        echo "   Příjmy: P" . sprintf("%03d", $maxPrijem) . " (pořadí: $maxPrijem)\n";
        echo "   Výdaje: V" . sprintf("%03d", $maxVydaj) . " (pořadí: $maxVydaj)\n";
        echo "\n💡 ÚNOR BY MĚL POKRAČOVAT:\n";
        echo "   Příjmy: P" . sprintf("%03d", $maxPrijem + 1) . " (pořadí: " . ($maxPrijem + 1) . ")\n";
        echo "   Výdaje: V" . sprintf("%03d", $maxVydaj + 1) . " (pořadí: " . ($maxVydaj + 1) . ")\n";
    }

    echo "\n=== ÚNOR 2026 ===\n";
    $stmt = $db->prepare("
        SELECT 
            p.id,
            p.datum_zapisu,
            p.cislo_dokladu,
            p.cislo_poradi_v_roce,
            p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ?
          AND YEAR(p.datum_zapisu) = 2026
          AND MONTH(p.datum_zapisu) = 2
          AND p.smazano = 0
        ORDER BY p.typ_dokladu, p.cislo_poradi_v_roce
    ");
    $stmt->execute([$bookId]);
    $unorEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($unorEntries)) {
        echo "❌ V únoru nejsou žádné doklady\n";
    } else {
        echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", "ID", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
        echo str_repeat("-", 60) . "\n";
        
        foreach ($unorEntries as $entry) {
            echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", 
                $entry['id'],
                $entry['datum_zapisu'],
                $entry['cislo_dokladu'],
                $entry['cislo_poradi_v_roce'],
                $entry['typ_dokladu']
            );
        }
    }

    // Ukázat celý rok chronologicky
    echo "\n=== CELÝ ROK 2026 CHRONOLOGICKY ===\n";
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
          AND YEAR(p.datum_zapisu) = 2026
          AND p.smazano = 0
        ORDER BY p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    $allEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo sprintf("%-6s %-12s %-15s %-8s %-10s\n", "MĚSÍC", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
    echo str_repeat("-", 60) . "\n";
    
    foreach ($allEntries as $entry) {
        echo sprintf("%-6s %-12s %-15s %-8s %-10s\n", 
            $entry['mesic'],
            $entry['datum_zapisu'],
            $entry['cislo_dokladu'],
            $entry['cislo_poradi_v_roce'],
            $entry['typ_dokladu']
        );
    }

    echo "\n✅ Analýza dokončena!\n";

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
}
?>