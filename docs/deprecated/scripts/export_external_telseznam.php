<?php
/**
 * Export dat z externí DB 10.1.1.253 (Intranet_zzs / rs_telseznam)
 * POUZE SELECT - žádné změny!
 */

try {
    echo "Připojuji se k externí databázi 10.1.1.253...\n";
    
    // Připojení k externí databázi
    $external_config = [
        'host' => '10.1.1.253',
        'dbname' => 'intranet_zzs',
        'charset' => 'utf8mb4'
    ];
    
    // Použiji známé přístupové údaje
    $credentials = [
        ['username' => 'root', 'password' => 'adminSQL22107000'],
    ];
    
    $pdo = null;
    foreach ($credentials as $cred) {
        try {
            $dsn = "mysql:host={$external_config['host']};dbname={$external_config['dbname']};charset={$external_config['charset']}";
            $pdo = new PDO($dsn, $cred['username'], $cred['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5
            ]);
            echo "Úspěšné připojení s user: {$cred['username']}\n";
            break;
        } catch (PDOException $e) {
            echo "Chyba připojení s {$cred['username']}: " . $e->getMessage() . "\n";
        }
    }
    
    if (!$pdo) {
        echo "\nNepodařilo se připojit k externí databázi.\n";
        echo "Potřebuji přístupové údaje pro databázi na 10.1.1.253\n";
        exit;
    }
    
    echo "\n=== KONTROLA DOSTUPNÝCH TABULEK ===\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        echo "Tabulka: $table\n";
    }
    
    if (in_array('rs_telseznam', $tables)) {
        echo "\n=== STRUKTURA TABULKY rs_telseznam ===\n";
        $stmt = $pdo->query("DESCRIBE `rs_telseznam`");
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
        $stmt = $pdo->query("SELECT COUNT(*) as pocet FROM `rs_telseznam`");
        $count = $stmt->fetch();
        echo "Celkem záznamů: " . $count['pocet'] . "\n";
        
        echo "\n=== UKÁZKA PRVNÍCH 3 ZÁZNAMŮ ===\n";
        $stmt = $pdo->query("SELECT * FROM `rs_telseznam` LIMIT 3");
        $samples = $stmt->fetchAll();
        
        if (!empty($samples)) {
            // Hlavička
            echo implode("\t", array_keys($samples[0])) . "\n";
            // Data
            foreach ($samples as $row) {
                echo implode("\t", array_values($row)) . "\n";
            }
        }
        
        // Export dat
        echo "\n=== EXPORT DAT ===\n";
        $sql = "SELECT 
                    prijmeni,
                    jmeno,
                    titul,
                    mobil
                FROM `rs_telseznam`
                WHERE mobil IS NOT NULL AND mobil != ''
                ORDER BY prijmeni, jmeno";
        
        $stmt = $pdo->query($sql);
        $records = $stmt->fetchAll();
        
        $filename = '/var/www/erdms-dev/export_externa_telseznam_' . date('Y-m-d_H-i-s') . '.txt';
        $handle = fopen($filename, 'w');
        
        if ($handle) {
            // Hlavička
            fputcsv($handle, ['Prijmeni', 'Jmeno', 'Titul', 'Mobil'], "\t");
            
            // Data
            foreach ($records as $record) {
                fputcsv($handle, array_values($record), "\t");
            }
            
            fclose($handle);
            
            echo "Export dokončen!\n";
            echo "Soubor: $filename\n";
            echo "Počet exportovaných záznamů: " . count($records) . "\n";
        }
        
    } else {
        echo "\nTabulka 'rs_telseznam' nebyla nalezena!\n";
        echo "Dostupné tabulky: " . implode(', ', $tables) . "\n";
    }

} catch (PDOException $e) {
    echo "CHYBA DB: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
?>