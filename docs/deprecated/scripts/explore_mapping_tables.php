<?php
/**
 * Zjištění struktury pomocných tabulek pro mapování
 */

require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    $config = [
        'host' => '10.3.172.11',
        'dbname' => 'eeo2025-dev',
        'username' => 'erdms_user',
        'password' => 'AhchohTahnoh7eim',
        'charset' => 'utf8mb4'
    ];

    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    echo "=== STRUKTURA TABULKY 25_lokality ===\n";
    $stmt = $pdo->query("DESCRIBE `25_lokality`");
    $columns = $stmt->fetchAll();
    foreach ($columns as $column) {
        echo sprintf("%-20s %-15s\n", $column['Field'], $column['Type']);
    }
    
    echo "\n=== OBSAH 25_lokality ===\n";
    $stmt = $pdo->query("SELECT id, nazev FROM `25_lokality` ORDER BY nazev");
    $lokality = $stmt->fetchAll();
    foreach ($lokality as $lokalita) {
        echo sprintf("ID: %-3s | %s\n", $lokalita['id'], $lokalita['nazev']);
    }
    
    echo "\n=== STRUKTURA TABULKY 25_pozice ===\n";
    $stmt = $pdo->query("DESCRIBE `25_pozice`");
    $columns = $stmt->fetchAll();
    foreach ($columns as $column) {
        echo sprintf("%-20s %-15s\n", $column['Field'], $column['Type']);
    }
    
    echo "\n=== OBSAH 25_pozice ===\n";
    $stmt = $pdo->query("SELECT id, nazev FROM `25_pozice` ORDER BY nazev");
    $pozice = $stmt->fetchAll();
    foreach ($pozice as $pozice_item) {
        echo sprintf("ID: %-3s | %s\n", $pozice_item['id'], $pozice_item['nazev']);
    }
    
    echo "\n=== STRUKTURA TABULKY 25_useky ===\n";
    $stmt = $pdo->query("DESCRIBE `25_useky`");
    $columns = $stmt->fetchAll();
    foreach ($columns as $column) {
        echo sprintf("%-20s %-15s\n", $column['Field'], $column['Type']);
    }
    
    echo "\n=== OBSAH 25_useky ===\n";
    $stmt = $pdo->query("SELECT id, nazev FROM `25_useky` ORDER BY nazev");
    $useky = $stmt->fetchAll();
    foreach ($useky as $usek) {
        echo sprintf("ID: %-3s | %s\n", $usek['id'], $usek['nazev']);
    }

} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
?>