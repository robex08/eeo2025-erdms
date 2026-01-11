<?php
/**
 * Generování SQL příkazů na základě mapping reportu
 * POUZE náhled - NEPROVÁDÍ změny!
 */

function generate_sql_from_report($report_file) {
    if (!file_exists($report_file)) {
        echo "CHYBA: Report soubor neexistuje!\n";
        return;
    }
    
    $content = file_get_contents($report_file);
    $lines = explode("\n", $content);
    
    $sql_updates = [];
    $in_phone_section = false;
    
    foreach ($lines as $line) {
        if (strpos($line, '=== AKTUALIZACE TELEFONŮ') !== false) {
            $in_phone_section = true;
            continue;
        }
        
        if ($in_phone_section && strpos($line, '===') !== false) {
            $in_phone_section = false;
            continue;
        }
        
        if ($in_phone_section && !empty(trim($line)) && strpos($line, 'ID') === false) {
            $parts = explode("\t", $line);
            if (count($parts) >= 4) {
                $id = trim($parts[0]);
                $name = trim($parts[1]);
                $old_phone = trim($parts[2]);
                $new_phone = trim($parts[3]);
                
                if (is_numeric($id) && !empty($new_phone)) {
                    $sql_updates[] = [
                        'id' => $id,
                        'name' => $name,
                        'old_phone' => $old_phone,
                        'new_phone' => $new_phone
                    ];
                }
            }
        }
    }
    
    return $sql_updates;
}

$report_files = glob('/var/www/erdms-dev/mapping_report_*.txt');
if (empty($report_files)) {
    echo "Žádný mapping report nenalezen!\n";
    exit;
}

$latest_report = end($report_files);
echo "Zpracovávám report: $latest_report\n\n";

$updates = generate_sql_from_report($latest_report);

if (empty($updates)) {
    echo "Žádné aktualizace telefonů k provedení.\n";
    exit;
}

echo "=== NÁHLED SQL PŘÍKAZŮ ===\n";
echo "-- POZOR: Tyto příkazy jsou pouze pro náhled!\n";
echo "-- NEPROVÁDĚJTE bez explicitního potvrzení!\n";
echo "-- Databáze: eeo2025-dev (POUZE DEV!)\n\n";

foreach ($updates as $update) {
    echo sprintf("-- Uživatel: %s (ID: %s)\n", $update['name'], $update['id']);
    echo sprintf("-- Starý telefon: %s → Nový telefon: %s\n", 
        $update['old_phone'] ?: 'prázdný', 
        $update['new_phone']
    );
    echo sprintf("UPDATE `25_uzivatele` SET `telefon` = '%s' WHERE `id` = %d;\n\n", 
        addslashes($update['new_phone']), 
        $update['id']
    );
}

// Uložení SQL do souboru
$sql_file = '/var/www/erdms-dev/phone_updates_' . date('Y-m-d_H-i-s') . '.sql';
$handle = fopen($sql_file, 'w');

if ($handle) {
    fwrite($handle, "-- Aktualizace telefonů uživatelů\n");
    fwrite($handle, "-- Datum: " . date('Y-m-d H:i:s') . "\n");
    fwrite($handle, "-- POZOR: POUZE PRO DEV DATABÁZI eeo2025-dev!\n");
    fwrite($handle, "-- NEPROVÁDĚJTE BEZ POTVRZENÍ!\n\n");
    
    foreach ($updates as $update) {
        fwrite($handle, sprintf("-- %s (ID: %s): %s → %s\n", 
            $update['name'], 
            $update['id'],
            $update['old_phone'] ?: 'prázdný',
            $update['new_phone']
        ));
        fwrite($handle, sprintf("UPDATE `25_uzivatele` SET `telefon` = '%s' WHERE `id` = %d;\n", 
            addslashes($update['new_phone']), 
            $update['id']
        ));
    }
    
    fclose($handle);
    echo "SQL příkazy uloženy do: $sql_file\n";
    echo "Počet aktualizací: " . count($updates) . "\n";
}
?>