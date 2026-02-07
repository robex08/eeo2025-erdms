<?php
/**
 * Zkouška připojení k 10.1.1.253 a prozkoumání dostupných databází
 */

try {
    echo "Připojuji se k 10.1.1.253...\n";
    
    // Zkus připojení bez specifikace databáze
    $pdo = new PDO("mysql:host=10.1.1.253;charset=utf8mb4", 'root', 'adminSQL22107000', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 10
    ]);
    
    echo "Úspěšné připojení k serveru!\n\n";
    
    echo "=== DOSTUPNÉ DATABÁZE ===\n";
    $stmt = $pdo->query("SHOW DATABASES");
    $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($databases as $db) {
        echo "Database: $db\n";
    }
    
    // Zkus najít databázi s telseznamem
    $target_dbs = ['Intranet_zzs', 'intranet_zzs', 'intranet', 'spisovka350', 'evidence_smluv'];
    
    foreach ($target_dbs as $db_name) {
        if (in_array($db_name, $databases)) {
            echo "\n=== PROZKOUMÁNÍ DATABÁZE: $db_name ===\n";
            
            try {
                $pdo->exec("USE `$db_name`");
                
                $stmt = $pdo->query("SHOW TABLES");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                echo "Tabulky v $db_name:\n";
                foreach ($tables as $table) {
                    echo "- $table\n";
                    
                    // Hledej tabulky s "tel", "user", "personal" apod.
                    if (strpos($table, 'tel') !== false || 
                        strpos($table, 'user') !== false ||
                        strpos($table, 'personal') !== false ||
                        strpos($table, 'seznam') !== false ||
                        strpos($table, 'rs_') !== false) {
                        
                        echo "  ✨ ZAJÍMAVÁ TABULKA: $table\n";
                        
                        // Struktura zajímavé tabulky
                        $stmt = $pdo->query("DESCRIBE `$table`");
                        $columns = $stmt->fetchAll();
                        echo "  Sloupce: ";
                        foreach ($columns as $col) {
                            echo $col['Field'] . ' ';
                        }
                        echo "\n";
                        
                        // Počet záznamů
                        $stmt = $pdo->query("SELECT COUNT(*) as pocet FROM `$table`");
                        $count = $stmt->fetch();
                        echo "  Počet záznamů: " . $count['pocet'] . "\n";
                    }
                }
                
            } catch (Exception $e) {
                echo "Chyba při prozkoumání $db_name: " . $e->getMessage() . "\n";
            }
        }
    }

} catch (PDOException $e) {
    echo "CHYBA připojení: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
?>