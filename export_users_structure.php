<?php
/**
 * Analýza struktury tabulky 25_uzivatele
 * POUZE pro zjištění struktury - žádné změny!
 */

// Načtení DB konfigurace
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    // Připojení k DEV databázi
    $config = [
        'host' => '10.3.172.11',
        'dbname' => 'eeo2025-dev',  // POUZE DEV!
        'username' => 'erdms_user',
        'password' => 'AhchohTahnoh7eim',
        'charset' => 'utf8mb4'
    ];

    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    echo "=== STRUKTURA TABULKY 25_uzivatele ===\n";
    
    // Zjištění struktury tabulky
    $stmt = $pdo->query("DESCRIBE `25_uzivatele`");
    $columns = $stmt->fetchAll();
    
    foreach ($columns as $column) {
        echo sprintf("%-20s %-15s %-5s %-10s %s\n", 
            $column['Field'], 
            $column['Type'], 
            $column['Null'], 
            $column['Key'],
            $column['Extra']
        );
    }
    
    echo "\n=== POČET ZÁZNAMŮ ===\n";
    $stmt = $pdo->query("SELECT COUNT(*) as pocet FROM `25_uzivatele`");
    $count = $stmt->fetch();
    echo "Celkem uživatelů: " . $count['pocet'] . "\n";
    
    echo "\n=== UKÁZKA PRVNÍCH 3 ZÁZNAMŮ ===\n";
    $stmt = $pdo->query("SELECT * FROM `25_uzivatele` LIMIT 3");
    $samples = $stmt->fetchAll();
    
    if (!empty($samples)) {
        // Hlavička
        echo implode("\t", array_keys($samples[0])) . "\n";
        // Data
        foreach ($samples as $row) {
            echo implode("\t", array_values($row)) . "\n";
        }
    }

} catch (PDOException $e) {
    echo "CHYBA DB: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
?>