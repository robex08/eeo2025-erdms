<?php
// Rychlý script pro zjištění struktury tabulky
$config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    $db = new PDO(
        "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
        $config['mysql']['username'],
        $config['mysql']['password']
    );
    
    $stmt = $db->query("SHOW COLUMNS FROM 25a_objednavky");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Sloupce tabulky 25a_objednavky:\n";
    foreach ($columns as $col) {
        echo "  • {$col['Field']} ({$col['Type']})\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
