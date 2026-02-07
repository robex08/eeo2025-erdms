<?php
/**
 * Přečíslování VŠECH pokladen v databázi
 * Projde všechny pokladny a přečísluje jejich doklady podle nového systému
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

echo "\n=== PŘEČÍSLOVÁNÍ VŠECH POKLADEN ===\n";
echo "Databáze: {$config['dbname']}\n\n";

$service = new DocumentNumberService($db);

// 1. Najít všechny unikátní kombinace pokladna_id + rok s doklady
echo "1. Hledám všechny pokladny s doklady...\n";
$stmt = $db->prepare("
    SELECT DISTINCT 
        k.pokladna_id,
        k.rok,
        COUNT(DISTINCT k.id) as pocet_knih,
        COUNT(e.id) as pocet_dokladu
    FROM 25a_pokladni_knihy k
    LEFT JOIN 25a_pokladni_polozky e ON e.pokladni_kniha_id = k.id AND e.smazano = 0
    WHERE k.pokladna_id IS NOT NULL
    GROUP BY k.pokladna_id, k.rok
    HAVING pocet_dokladu > 0
    ORDER BY k.rok DESC, k.pokladna_id ASC
");
$stmt->execute();
$pokladny = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "   Nalezeno: " . count($pokladny) . " pokladen s doklady\n\n";

// 2. Pro každou pokladnu zobrazit info
echo "2. Seznam pokladen k přečíslování:\n";
foreach ($pokladny as $p) {
    echo "   - Pokladna ID {$p['pokladna_id']}, rok {$p['rok']}: {$p['pocet_knih']} knih, {$p['pocet_dokladu']} dokladů\n";
}
echo "\n";

// 3. Zeptat se na potvrzení
echo "Chceš pokračovat s přečíslováním? (y/n): ";
$handle = fopen("php://stdin", "r");
$line = trim(fgets($handle));
fclose($handle);

if ($line !== 'y' && $line !== 'Y') {
    echo "\nPřerušeno uživatelem.\n";
    exit(0);
}

echo "\n3. Spouštím přečíslování...\n\n";

$success = 0;
$failed = 0;

foreach ($pokladny as $p) {
    $pokladnaId = $p['pokladna_id'];
    $rok = $p['rok'];
    
    echo "   Přečíslovávám pokladna_id={$pokladnaId}, rok={$rok}...\n";
    
    try {
        // Najít první knihu této pokladny v tomto roce
        $stmt = $db->prepare("
            SELECT id 
            FROM 25a_pokladni_knihy 
            WHERE pokladna_id = ? AND rok = ?
            LIMIT 1
        ");
        $stmt->execute(array($pokladnaId, $rok));
        $kniha = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($kniha) {
            // Přečíslovat knihu (což přečísluje celou pokladnu)
            $result = $service->renumberBookDocuments($kniha['id']);
            
            if ($result) {
                // Zjistit výsledné statistiky
                $stmt = $db->prepare("
                    SELECT 
                        e.typ_dokladu,
                        COUNT(*) as pocet,
                        MIN(e.cislo_dokladu) as min_cislo,
                        MAX(e.cislo_dokladu) as max_cislo
                    FROM 25a_pokladni_polozky e
                    JOIN 25a_pokladni_knihy k ON e.pokladni_kniha_id = k.id
                    WHERE k.pokladna_id = ? AND k.rok = ? AND e.smazano = 0
                    GROUP BY e.typ_dokladu
                ");
                $stmt->execute(array($pokladnaId, $rok));
                $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($stats as $stat) {
                    echo "      ✓ {$stat['typ_dokladu']}: {$stat['pocet']}x ({$stat['min_cislo']} - {$stat['max_cislo']})\n";
                }
                $success++;
            } else {
                echo "      ✗ CHYBA při přečíslování\n";
                $failed++;
            }
        } else {
            echo "      ✗ Kniha nenalezena\n";
            $failed++;
        }
        
    } catch (Exception $e) {
        echo "      ✗ CHYBA: " . $e->getMessage() . "\n";
        $failed++;
    }
}

echo "\n=== HOTOVO ===\n";
echo "Úspěšně přečíslováno: $success pokladen\n";
if ($failed > 0) {
    echo "Selhalo: $failed pokladen\n";
}
echo "\n";
