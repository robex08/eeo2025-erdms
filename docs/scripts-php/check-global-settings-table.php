<?php
// Zjistit strukturu tabulky 25a_nastaveni_globalni
$config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    $db = new PDO(
        "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
        $config['mysql']['username'],
        $config['mysql']['password']
    );
    
    echo "Struktura tabulky 25a_nastaveni_globalni:\n";
    $stmt = $db->query("SHOW COLUMNS FROM 25a_nastaveni_globalni");
    while ($col = $stmt->fetch()) {
        echo "  • {$col['Field']} ({$col['Type']})\n";
    }
    
    echo "\nObsah tabulky:\n";
    $stmt = $db->query("SELECT * FROM 25a_nastaveni_globalni LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        foreach ($row as $key => $value) {
            $display = strlen($value) > 100 ? substr($value, 0, 100) . '...' : $value;
            echo "  $key: $display\n";
        }
    } else {
        echo "  (žádné záznamy)\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
