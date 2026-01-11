<?php
/**
 * Rychlá kontrola databáze intranet_zzs
 */

try {
    $pdo = new PDO("mysql:host=10.1.1.253;charset=utf8mb4", 'root', 'adminSQL22107000', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "=== VŠECHNY DATABÁZE ===\n";
    $stmt = $pdo->query("SHOW DATABASES");
    $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($databases as $db) {
        echo "$db\n";
    }
    
    // Zkus intranet_zzs
    if (in_array('intranet_zzs', $databases)) {
        echo "\n✅ Databáze intranet_zzs EXISTUJE!\n";
        
        $pdo->exec("USE `intranet_zzs`");
        echo "\n=== TABULKY V intranet_zzs ===\n";
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tables as $table) {
            echo "$table\n";
            
            if ($table === 'rs_telseznam') {
                echo "  ✨ NAŠEL JSEM rs_telseznam!\n";
            }
        }
    } else {
        echo "\n❌ Databáze intranet_zzs NEEXISTUJE\n";
    }

} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
?>