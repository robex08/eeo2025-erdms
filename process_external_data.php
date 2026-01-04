<?php
/**
 * Template pro import dat z externí databáze
 * Pro případ, že budete mít CSV export z rs_telseznam
 */

echo "=== IMPORT DAT Z EXTERNÍHO ZDROJE ===\n";
echo "Tento script zpracuje CSV/TXT soubor z externí databáze rs_telseznam\n\n";

function process_external_file($filename) {
    if (!file_exists($filename)) {
        echo "CHYBA: Soubor $filename neexistuje!\n";
        return false;
    }
    
    $handle = fopen($filename, 'r');
    if (!$handle) {
        echo "CHYBA: Nelze otevřít soubor $filename!\n";
        return false;
    }
    
    echo "Zpracovávám soubor: $filename\n";
    
    // Detekce oddělovače
    $first_line = fgets($handle);
    rewind($handle);
    
    $delimiter = "\t"; // TAB default
    if (strpos($first_line, ';') !== false) $delimiter = ';';
    if (strpos($first_line, ',') !== false) $delimiter = ',';
    
    echo "Detekovaný oddělovač: " . ($delimiter === "\t" ? "TAB" : $delimiter) . "\n";
    
    // Načti hlavičku
    $header = fgetcsv($handle, 0, $delimiter);
    if (!$header) {
        echo "CHYBA: Nelze načíst hlavičku!\n";
        fclose($handle);
        return false;
    }
    
    echo "Sloupce: " . implode(', ', $header) . "\n";
    
    $external_users = [];
    $line_count = 1;
    
    while (($data = fgetcsv($handle, 0, $delimiter)) !== FALSE) {
        $line_count++;
        
        if (count($data) == count($header)) {
            $record = array_combine($header, $data);
            
            // Očekávané sloupce: prijmeni, jmeno, titul, mobil
            $external_users[] = [
                'prijmeni' => $record['prijmeni'] ?? $record['Prijmeni'] ?? '',
                'jmeno' => $record['jmeno'] ?? $record['Jmeno'] ?? '',
                'titul' => $record['titul'] ?? $record['Titul'] ?? '',
                'mobil' => $record['mobil'] ?? $record['Mobil'] ?? $record['telefon'] ?? ''
            ];
        } else {
            echo "Varování: Řádek $line_count má nesprávný počet sloupců\n";
        }
    }
    
    fclose($handle);
    
    echo "Načteno " . count($external_users) . " záznamů\n\n";
    
    // Uložit normalizovaná data
    $output_file = '/var/www/erdms-dev/externa_normalized_' . date('Y-m-d_H-i-s') . '.txt';
    $out_handle = fopen($output_file, 'w');
    
    if ($out_handle) {
        fputcsv($out_handle, ['Prijmeni', 'Jmeno', 'Titul', 'Mobil'], "\t");
        
        foreach ($external_users as $user) {
            fputcsv($out_handle, array_values($user), "\t");
        }
        
        fclose($out_handle);
        echo "Normalizovaná data uložena do: $output_file\n";
    }
    
    return $external_users;
}

// Ukázkové použití
$test_files = [
    '/var/www/erdms-dev/rs_telseznam_export.csv',
    '/var/www/erdms-dev/rs_telseznam_export.txt',
    '/var/www/erdms-dev/external_data.csv'
];

echo "Hledám externí soubory...\n";
$found = false;

foreach ($test_files as $file) {
    if (file_exists($file)) {
        echo "Nalezen soubor: $file\n";
        process_external_file($file);
        $found = true;
        break;
    }
}

if (!$found) {
    echo "Žádný externí soubor nebyl nalezen.\n";
    echo "Očekávané názvy souborů:\n";
    foreach ($test_files as $file) {
        echo "- $file\n";
    }
    echo "\nNebo zadejte název souboru jako parametr:\n";
    echo "php process_external_data.php /cesta/k/souboru.csv\n";
}

// Zpracování parametru z příkazové řádky
if (isset($argv[1])) {
    echo "\nZpracovávám soubor z parametru: {$argv[1]}\n";
    process_external_file($argv[1]);
}
?>