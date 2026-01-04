<?php
/**
 * Export uživatelů z tabulky 25_uzivatele do CSV/TXT
 * POUZE SELECT - žádné změny v DB!
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

    echo "Export uživatelů z 25_uzivatele...\n";
    
    // SQL dotaz pro export relevantních sloupců
    $sql = "SELECT 
                id,
                username,
                titul_pred,
                jmeno,
                prijmeni, 
                titul_za,
                email,
                telefon,
                pozice_id,
                lokalita_id,
                organizace_id,
                usek_id,
                aktivni,
                dt_vytvoreni,
                dt_aktualizace,
                dt_posledni_aktivita
            FROM `25_uzivatele`
            ORDER BY prijmeni, jmeno";
    
    $stmt = $pdo->query($sql);
    $users = $stmt->fetchAll();
    
    // Export do TAB-separated souboru
    $filename = '/var/www/erdms-dev/export_uzivatele_' . date('Y-m-d_H-i-s') . '.txt';
    $handle = fopen($filename, 'w');
    
    if ($handle) {
        // Hlavička
        fputcsv($handle, [
            'ID', 'Username', 'Titul_pred', 'Jmeno', 'Prijmeni', 'Titul_za', 
            'Email', 'Telefon', 'Pozice_ID', 'Lokalita_ID', 'Organizace_ID', 
            'Usek_ID', 'Aktivni', 'DT_Vytvoreni', 'DT_Aktualizace', 'DT_Posledni_aktivita'
        ], "\t");
        
        // Data
        foreach ($users as $user) {
            fputcsv($handle, array_values($user), "\t");
        }
        
        fclose($handle);
        
        echo "Export dokončen!\n";
        echo "Soubor: $filename\n";
        echo "Počet exportovaných uživatelů: " . count($users) . "\n";
        
        // Vytvoř i kopii ve formátu pro MySQL LOAD DATA (pro případný klon tabulky)
        $sql_filename = '/var/www/erdms-dev/backup_uzivatele_' . date('Y-m-d_H-i-s') . '.sql';
        $sql_handle = fopen($sql_filename, 'w');
        
        if ($sql_handle) {
            // SQL hlavička pro případné vytvoření klonu tabulky
            fwrite($sql_handle, "-- Backup tabulky 25_uzivatele z " . date('Y-m-d H:i:s') . "\n");
            fwrite($sql_handle, "-- POZOR: Toto je pouze pro referenci, NEPROVÁDĚT bez potvrzení!\n\n");
            fwrite($sql_handle, "DROP TABLE IF EXISTS `AKT_uzivatelu_EEO2025`;\n");
            fwrite($sql_handle, "CREATE TABLE `AKT_uzivatelu_EEO2025` LIKE `25_uzivatele`;\n\n");
            
            foreach ($users as $user) {
                $values = array_map(function($val) {
                    return is_null($val) ? 'NULL' : "'" . addslashes($val) . "'";
                }, array_values($user));
                
                fwrite($sql_handle, "INSERT INTO `AKT_uzivatelu_EEO2025` VALUES (" . implode(', ', $values) . ");\n");
            }
            
            fclose($sql_handle);
            echo "SQL backup: $sql_filename\n";
        }
        
    } else {
        echo "CHYBA: Nelze vytvořit soubor!\n";
    }

} catch (PDOException $e) {
    echo "CHYBA DB: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
?>