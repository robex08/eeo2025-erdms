<?php
/**
 * Zpracování dat z rs_telseznam - extrakce příjmení, jméno, titul, mobil
 */

$input_file = '/var/www/erdms-dev/rs_telseznam_raw.csv';
$output_file = '/var/www/erdms-dev/rs_telseznam_processed.txt';

if (!file_exists($input_file)) {
    echo "CHYBA: Vstupní soubor neexistuje!\n";
    exit;
}

echo "Zpracovávám data z rs_telseznam...\n";

$handle = fopen($input_file, 'r');
$output_handle = fopen($output_file, 'w');

if (!$handle || !$output_handle) {
    echo "CHYBA: Nelze otevřít soubory!\n";
    exit;
}

// Hlavička výstupního souboru
fputcsv($output_handle, ['Prijmeni', 'Jmeno', 'Titul', 'Mobil'], "\t");

$processed_count = 0;
$skipped_count = 0;

while (($line = fgets($handle)) !== FALSE) {
    $line = trim($line);
    if (empty($line)) continue;
    
    // Parsování CSV řádku s oddělovačem ;
    $data = str_getcsv($line, ';', '"');
    
    if (count($data) >= 10) {
        $prijmeni = trim($data[2], '"');
        $jmeno = trim($data[3], '"');
        $titul = trim($data[4], '"');
        
        // Mobil může být na pozici 8 nebo 9
        $mobil = '';
        if (isset($data[9]) && !empty(trim($data[9], '"')) && trim($data[9], '"') !== '-') {
            $mobil = trim($data[9], '"');
        } elseif (isset($data[8]) && !empty(trim($data[8], '"')) && trim($data[8], '"') !== '-') {
            $mobil = trim($data[8], '"');
        }
        
        // Čištění jména od dodatečných informací
        $jmeno = preg_replace('/,.*$/', '', $jmeno);  // Odstraň ", MBA" apod.
        $jmeno = preg_replace('/\s+DiS\.$/', '', $jmeno);  // Odstraň " DiS."
        $jmeno = trim($jmeno);
        
        // Přesun titulů z jména do titul pole
        if (empty($titul) && preg_match('/^(.*?)\s+(MUDr\.|Ing\.|Mgr\.|Bc\.|Dr\.)$/', $jmeno, $matches)) {
            $jmeno = $matches[1];
            $titul = $matches[2];
        }
        
        // Ošetření speciálních případů
        if (stripos($jmeno, 'pohotovost') !== false) {
            $skipped_count++;
            continue;  // Přeskoč IT pohotovost
        }
        
        // Výstup pouze pokud máme validní data
        if (!empty($prijmeni) && !empty($jmeno)) {
            fputcsv($output_handle, [
                $prijmeni,
                $jmeno,
                $titul,
                $mobil
            ], "\t");
            $processed_count++;
        } else {
            $skipped_count++;
        }
        
    } else {
        echo "Varování: Nesprávný počet sloupců na řádku: " . substr($line, 0, 50) . "...\n";
        $skipped_count++;
    }
}

fclose($handle);
fclose($output_handle);

echo "Zpracování dokončeno!\n";
echo "Zpracovaných záznamů: $processed_count\n";
echo "Přeskočených záznamů: $skipped_count\n";
echo "Výstupní soubor: $output_file\n";

// Zobraz ukázku výsledků
echo "\n=== UKÁZKA ZPRACOVANÝCH DAT ===\n";
$result_handle = fopen($output_file, 'r');
$header = fgetcsv($result_handle, 0, "\t");
echo implode("\t", $header) . "\n";
echo str_repeat("-", 60) . "\n";

for ($i = 0; $i < 10; $i++) {
    $row = fgetcsv($result_handle, 0, "\t");
    if (!$row) break;
    echo implode("\t", $row) . "\n";
}

fclose($result_handle);
?>