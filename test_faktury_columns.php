<?php
// Test: Zjištění struktury tabulky 25a_objednavky_faktury

$config = [
    'host' => '10.3.172.11',
    'port' => '3306',
    'database' => 'EEO-OSTRA-DEV',
    'username' => 'erdms_user',
    'password' => 'AhchohTahnoh7eim',
    'charset' => 'utf8mb4'
];

try {
    $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
    $db = new PDO($dsn, $config['username'], $config['password']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Načti jednu fakturu s LIMIT 1
    $stmt = $db->prepare("SELECT * FROM `25a_objednavky_faktury` WHERE aktivni = 1 LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($row) {
        echo "=== SLOUPCE TABULKY 25a_objednavky_faktury ===\n\n";
        foreach (array_keys($row) as $column) {
            echo "- " . $column . "\n";
        }
    } else {
        echo "Žádná faktura nenalezena\n";
    }
    
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
