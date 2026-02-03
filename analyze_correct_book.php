<?php
/**
 * Analýza SPRÁVNÉ pokladní knihy s lednami daty
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
    echo "=== HLEDÁNÍ SPRÁVNÉ KNIHY S LEDNAMA DATY ===\n\n";

    // Najít knihu s lednama doklady P491 a V591
    $stmt = $db->prepare("
        SELECT DISTINCT
            k.id,
            k.rok,
            k.uzivatel_id,
            k.ciselna_rada_ppd,
            k.ciselna_rada_vpd
        FROM 25a_pokladni_knihy k
        JOIN 25a_pokladni_polozky p ON k.id = p.pokladni_kniha_id
        WHERE k.rok = 2026
          AND p.smazano = 0
          AND (p.cislo_dokladu LIKE 'P491%' OR p.cislo_dokladu LIKE 'V591%')
    ");
    $stmt->execute();
    $book = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$book) {
        echo "❌ Kniha s lednama doklady nenalezena!\n";
        exit(1);
    }
    
    $bookId = $book['id'];
    echo "📚 NALEZENA KNIHA: ID=$bookId, rok={$book['rok']}, uživatel={$book['uzivatel_id']}\n";
    echo "   Číselné řady: PPD={$book['ciselna_rada_ppd']}, VPD={$book['ciselna_rada_vpd']}\n\n";

    echo "=== SOUČASNÝ STAV - LEDEN ===\n";
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
        ORDER BY p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    $januaryEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", "ID", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
    echo str_repeat("-", 60) . "\n";
    
    $lastJanuaryOrder = 0;
    foreach ($januaryEntries as $entry) {
        echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", 
            $entry['id'],
            $entry['datum_zapisu'],
            $entry['cislo_dokladu'],
            $entry['cislo_poradi_v_roce'],
            $entry['typ_dokladu']
        );
        $lastJanuaryOrder = max($lastJanuaryOrder, $entry['cislo_poradi_v_roce']);
    }

    echo "\n=== SOUČASNÝ STAV - ÚNOR ===\n";
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
        ORDER BY p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    $februaryEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($februaryEntries)) {
        echo "   (žádné únorové doklady)\n";
    } else {
        echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", "ID", "DATUM", "ČÍSLO", "POŘADÍ", "TYP");
        echo str_repeat("-", 60) . "\n";
        
        foreach ($februaryEntries as $entry) {
            echo sprintf("%-5s %-12s %-15s %-8s %-10s\n", 
                $entry['id'],
                $entry['datum_zapisu'],
                $entry['cislo_dokladu'],
                $entry['cislo_poradi_v_roce'],
                $entry['typ_dokladu']
            );
        }
    }

    echo "\n📊 ANALÝZA:\n";
    echo "   Poslední lednový doklad má pořadí: $lastJanuaryOrder\n";
    echo "   Únor BY MĚL pokračovat od pořadí: " . ($lastJanuaryOrder + 1) . "\n\n";

    echo "❓ CHCETE PŘEČÍSLOVAT KONTINUÁLNĚ? (ano/ne): ";

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
}
?>