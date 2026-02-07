<?php
/**
 * Extrakce příjmení, jména, titulu a mobilního telefonu z rs_telseznam
 */

$raw_file = '/var/www/erdms-dev/rs_telseznam_raw_data.csv';
$output_file = '/var/www/erdms-dev/rs_telseznam_extracted_' . date('Y-m-d_H-i-s') . '.txt';

if (!file_exists($raw_file)) {
    echo "CHYBA: Raw soubor neexistuje!\n";
    exit;
}

$handle = fopen($raw_file, 'r');
$out_handle = fopen($output_file, 'w');

if (!$handle || !$out_handle) {
    echo "CHYBA: Nelze otevřít soubory!\n";
    exit;
}

echo "Zpracovávám rs_telseznam data...\n";

// Hlavička pro výstupní soubor
fputcsv($out_handle, ['Prijmeni', 'Jmeno', 'Titul', 'Mobil'], "\t");

$processed = 0;
$with_mobile = 0;

while (($line = fgets($handle)) !== false) {
    $line = trim($line);
    if (empty($line)) continue;
    
    // Parse CSV s středníkovým oddělovačem
    $data = str_getcsv($line, ';', '"');
    
    if (count($data) >= 11) {
        // Extrakce sloupců:
        // [2] = Příjmení, [3] = Jméno, [4] = Titul, [9] = Mobilní telefon
        $prijmeni = isset($data[2]) ? trim($data[2], '"') : '';
        $jmeno = isset($data[3]) ? trim($data[3], '"') : '';
        $titul = isset($data[4]) ? trim($data[4], '"') : '';
        $mobil = isset($data[9]) ? trim($data[9], '"') : '';
        
        // Skipni prázdné nebo neplatné záznamy
        if (empty($prijmeni) || empty($jmeno)) {
            continue;
        }
        
        // Počítej pouze s platným mobilním číslem
        if (!empty($mobil) && $mobil !== '-' && strlen($mobil) >= 9) {
            $with_mobile++;
        }
        
        // Zapiš data
        fputcsv($out_handle, [$prijmeni, $jmeno, $titul, $mobil], "\t");
        $processed++;
    }
}

fclose($handle);
fclose($out_handle);

echo "Zpracováno: $processed záznamů\n";
echo "S mobilním telefonem: $with_mobile záznamů\n";
echo "Výstupní soubor: $output_file\n";

// Zobrazit prvních 10 záznamů
echo "\n=== PRVNÍCH 10 ZÁZNAMŮ ===\n";
$preview_handle = fopen($output_file, 'r');
if ($preview_handle) {
    $count = 0;
    while (($data = fgetcsv($preview_handle, 0, "\t")) !== false && $count < 11) {
        echo implode("\t", $data) . "\n";
        $count++;
    }
    fclose($preview_handle);
}
?>