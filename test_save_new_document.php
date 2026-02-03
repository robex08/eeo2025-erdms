<?php
/**
 * Test ukládání nového dokladu
 * Ověří, že číslo dokladu se po uložení nezmění na 001
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

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/CashbookService.php';

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

echo "\n=== TEST UKLÁDÁNÍ NOVÉHO DOKLADU ===\n";
echo "Databáze: {$config['dbname']}\n\n";

// Test na knihu 22 (únor, pokladna_id=14)
$bookId = 22;

// 1. Zjistit aktuální stav
echo "1. Aktuální stav knihy $bookId:\n";
$stmt = $db->prepare("
    SELECT k.id, k.uzivatel_id, k.mesic, k.rok, k.pokladna_id,
           COUNT(e.id) as pocet_dokladu
    FROM 25a_pokladni_knihy k
    LEFT JOIN 25a_pokladni_polozky e ON e.pokladni_kniha_id = k.id AND e.smazano = 0
    WHERE k.id = ?
    GROUP BY k.id
");
$stmt->execute(array($bookId));
$kniha = $stmt->fetch(PDO::FETCH_ASSOC);

echo "   Kniha: uzivatel={$kniha['uzivatel_id']}, {$kniha['mesic']}/{$kniha['rok']}, pokladna_id={$kniha['pokladna_id']}\n";
echo "   Počet dokladů: {$kniha['pocet_dokladu']}\n\n";

// 2. Zjistit aktuální maximum
echo "2. Aktuální maximum napříč pokladnou:\n";
$stmt = $db->prepare("
    SELECT 
        e.typ_dokladu,
        COUNT(*) as pocet,
        MAX(e.cislo_poradi_v_roce) as max_poradi,
        MAX(e.cislo_dokladu) as max_cislo
    FROM 25a_pokladni_polozky e
    JOIN 25a_pokladni_knihy k ON e.pokladni_kniha_id = k.id
    WHERE k.pokladna_id = ? AND k.rok = ? AND e.smazano = 0
    GROUP BY e.typ_dokladu
");
$stmt->execute(array($kniha['pokladna_id'], $kniha['rok']));
$stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($stats as $stat) {
    echo "   {$stat['typ_dokladu']}: {$stat['pocet']}x, max={$stat['max_cislo']} (pořadí {$stat['max_poradi']})\n";
}
echo "\n";

// 3. Vytvořit testovací data pro nový doklad
$testData = array(
    'datum_zapisu' => date('Y-m-d'),
    'obsah_zapisu' => 'TEST - nový příjem',
    'komu_od_koho' => 'Test',
    'castka_prijem' => 100.00,
    'lp_kod' => null,
    'lp_popis' => null,
    'poznamka' => 'Testovací záznam'
);

echo "3. Vytvářím nový testovací doklad (příjem 100 Kč)...\n";

$service = new CashbookService($db);
try {
    $entryId = $service->createEntry($bookId, $testData, 1);
    echo "   ✓ Doklad vytvořen s ID: $entryId\n\n";
    
    // 4. Načíst vytvořený doklad
    echo "4. Načítám vytvořený doklad:\n";
    $stmt = $db->prepare("
        SELECT id, cislo_dokladu, cislo_poradi_v_roce, typ_dokladu, datum_zapisu, obsah_zapisu, castka_prijem
        FROM 25a_pokladni_polozky
        WHERE id = ?
    ");
    $stmt->execute(array($entryId));
    $entry = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "   Číslo dokladu: {$entry['cislo_dokladu']}\n";
    echo "   Pořadí v roce: {$entry['cislo_poradi_v_roce']}\n";
    echo "   Typ: {$entry['typ_dokladu']}\n";
    echo "   Obsah: {$entry['obsah_zapisu']}\n\n";
    
    // 5. Ověřit, že číslo je správně
    if ($entry['cislo_dokladu'] === 'P001') {
        echo "   ❌ CHYBA: Číslo dokladu je P001, mělo by pokračovat od předchozího!\n\n";
    } else {
        echo "   ✓ OK: Číslo dokladu pokračuje správně\n\n";
    }
    
    // 6. Zobrazit všechny doklady v knize 22
    echo "5. Všechny doklady v knize 22 po přidání:\n";
    $stmt = $db->prepare("
        SELECT id, cislo_dokladu, typ_dokladu, datum_zapisu, obsah_zapisu
        FROM 25a_pokladni_polozky
        WHERE pokladni_kniha_id = ? AND smazano = 0
        ORDER BY datum_zapisu ASC, id ASC
    ");
    $stmt->execute(array($bookId));
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($items as $item) {
        $marker = ($item['id'] == $entryId) ? ' ← NOVÝ' : '';
        echo "   [{$item['cislo_dokladu']}] {$item['typ_dokladu']} - {$item['datum_zapisu']} - {$item['obsah_zapisu']}{$marker}\n";
    }
    echo "\n";
    
    // 7. Smazat testovací záznam
    echo "6. Mažu testovací doklad...\n";
    $stmt = $db->prepare("DELETE FROM 25a_pokladni_polozky WHERE id = ?");
    $stmt->execute(array($entryId));
    echo "   ✓ Testovací doklad smazán\n";
    
    // 8. Přečíslovat zpět
    echo "7. Přečíslovávám pokladnu zpět...\n";
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/DocumentNumberService.php';
    $docService = new DocumentNumberService($db);
    $docService->renumberBookDocuments($bookId);
    echo "   ✓ Přečíslováno\n";
    
} catch (Exception $e) {
    echo "   ✗ CHYBA: " . $e->getMessage() . "\n";
    echo "   Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n=== HOTOVO ===\n";
