<?php
/**
 * Test číslování podle pokladny
 * Otestuje, že knihy se stejným pokladna_id sdílí číslování
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

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/DocumentNumberService.php';

// Připojení k databázi
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


echo "=== TEST ČÍSLOVÁNÍ PODLE POKLADNY ===\n\n";

// 1. Zjistit pokladna_id pro knihu 2
echo "1. Zjišťuji pokladna_id pro knihu 2:\n";
$stmt = $db->prepare("
    SELECT id, uzivatel_id, mesic, rok, pokladna_id, ciselna_rada_ppd, ciselna_rada_vpd
    FROM 25a_pokladni_knihy 
    WHERE id = 2
");
$stmt->execute();
$kniha2 = $stmt->fetch(PDO::FETCH_ASSOC);
echo "   Kniha 2: uzivatel={$kniha2['uzivatel_id']}, mesic={$kniha2['mesic']}, rok={$kniha2['rok']}, pokladna_id={$kniha2['pokladna_id']}\n";
echo "   Číselné řady: PPD={$kniha2['ciselna_rada_ppd']}, VPD={$kniha2['ciselna_rada_vpd']}\n\n";

// 2. Najít všechny knihy se stejným pokladna_id
echo "2. Hledám všechny knihy se stejným pokladna_id={$kniha2['pokladna_id']}:\n";
$stmt = $db->prepare("
    SELECT id, uzivatel_id, mesic, rok, pokladna_id
    FROM 25a_pokladni_knihy 
    WHERE pokladna_id = ?
    ORDER BY rok, mesic
");
$stmt->execute(array($kniha2['pokladna_id']));
$knihy = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($knihy as $kniha) {
    echo "   Kniha {$kniha['id']}: uzivatel={$kniha['uzivatel_id']}, {$kniha['mesic']}/{$kniha['rok']}\n";
}
echo "\n";

// 3. Pro každou knihu zobrazit počet dokladů
echo "3. Počet dokladů v jednotlivých knihách:\n";
foreach ($knihy as $kniha) {
    $stmt = $db->prepare("
        SELECT 
            typ_dokladu,
            COUNT(*) as pocet
        FROM 25a_pokladni_polozky
        WHERE pokladni_kniha_id = ?
          AND smazano = 0
        GROUP BY typ_dokladu
        ORDER BY typ_dokladu
    ");
    $stmt->execute(array($kniha['id']));
    $counts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "   Kniha {$kniha['id']} ({$kniha['mesic']}/{$kniha['rok']}): ";
    if (empty($counts)) {
        echo "žádné doklady";
    } else {
        $parts = array();
        foreach ($counts as $c) {
            $parts[] = "{$c['typ_dokladu']}={$c['pocet']}";
        }
        echo implode(', ', $parts);
    }
    echo "\n";
}
echo "\n";

// 4. Zobrazit aktuální číslování v knihách 2 a 22
echo "4. Aktuální číslování před přečíslováním:\n";
foreach (array(2, 22) as $bookId) {
    echo "\n   Kniha $bookId:\n";
    $stmt = $db->prepare("
        SELECT id, typ_dokladu, cislo_dokladu, cislo_poradi_v_roce, datum_zapisu, obsah_zapisu
        FROM 25a_pokladni_polozky
        WHERE pokladni_kniha_id = ?
          AND smazano = 0
        ORDER BY datum_zapisu ASC, id ASC
    ");
    $stmt->execute(array($bookId));
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($items as $item) {
        echo "      [{$item['cislo_dokladu']}] {$item['typ_dokladu']} - {$item['datum_zapisu']} - {$item['obsah_zapisu']}\n";
    }
}
echo "\n";

// 5. Spustit přečíslování pro knihu 22 (únor)
echo "5. Spouštím přečíslování pro knihu 22 (únor)...\n";
$service = new DocumentNumberService($db);
$result = $service->renumberBookDocuments(22);
echo "   Výsledek: " . ($result ? "ÚSPĚCH" : "CHYBA") . "\n\n";

// 6. Zobrazit nové číslování
echo "6. Nové číslování po přečíslování:\n";
foreach (array(2, 22) as $bookId) {
    echo "\n   Kniha $bookId:\n";
    $stmt = $db->prepare("
        SELECT id, typ_dokladu, cislo_dokladu, cislo_poradi_v_roce, datum_zapisu, obsah_zapisu
        FROM 25a_pokladni_polozky
        WHERE pokladni_kniha_id = ?
          AND smazano = 0
        ORDER BY datum_zapisu ASC, id ASC
    ");
    $stmt->execute(array($bookId));
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($items as $item) {
        echo "      [{$item['cislo_dokladu']}] {$item['typ_dokladu']} - {$item['datum_zapisu']} - {$item['obsah_zapisu']}\n";
    }
}
echo "\n";

// 7. Statistika číslování napříč knihami
echo "7. Statistika číslování napříč VŠEMI knihami stejné pokladny:\n";
$stmt = $db->prepare("
    SELECT 
        e.typ_dokladu,
        COUNT(*) as pocet,
        MIN(e.cislo_dokladu) as min_cislo,
        MAX(e.cislo_dokladu) as max_cislo
    FROM 25a_pokladni_polozky e
    JOIN 25a_pokladni_knihy k ON e.pokladni_kniha_id = k.id
    WHERE k.pokladna_id = ?
      AND k.rok = ?
      AND e.smazano = 0
    GROUP BY e.typ_dokladu
");
$stmt->execute(array($kniha2['pokladna_id'], $kniha2['rok']));
$stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($stats as $stat) {
    echo "   {$stat['typ_dokladu']}: {$stat['pocet']} dokladů ({$stat['min_cislo']} - {$stat['max_cislo']})\n";
}

echo "\n=== HOTOVO ===\n";
