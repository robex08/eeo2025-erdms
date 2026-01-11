<?php
/**
 * Opravené zpracování třetího zdroje dat - správná detekce sloupců
 */

$raw_file = '/var/www/erdms-dev/third_source_raw_data.txt';
$output_file = '/var/www/erdms-dev/third_source_fixed_' . date('Y-m-d_H-i-s') . '.txt';

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

echo "Opravené zpracování třetího zdroje dat...\n";

// Hlavička pro výstupní soubor
fputcsv($out_handle, ['Prijmeni', 'Jmeno', 'Titul', 'Mobil'], "\t");

$processed = 0;
$line_number = 0;

while (($line = fgets($handle)) !== false) {
    $line_number++;
    $line = trim($line);
    
    if (empty($line) || $line_number == 1) continue; // Skip header
    
    // Parse TAB-separated data
    $parts = preg_split('/\t+/', $line);
    
    // Najdi příjmení a jméno ve správných pozicích
    $titul_pred = '';
    $prijmeni = '';
    $jmeno = '';
    $titul_za = '';
    
    // Pokusíme se najít strukturu automaticky
    $valid_parts = array_filter($parts, function($p) { return !empty(trim($p)); });
    $valid_parts = array_values($valid_parts);
    
    if (count($valid_parts) >= 2) {
        // První neprázdný je buď titul nebo příjmení
        if (preg_match('/^(MUDr\.|Bc\.|Mgr\.|Ing\.|Dr\.)/', $valid_parts[0])) {
            // První je titul
            $titul_pred = $valid_parts[0];
            $prijmeni = isset($valid_parts[1]) ? $valid_parts[1] : '';
            $jmeno = isset($valid_parts[2]) ? $valid_parts[2] : '';
            $titul_za = isset($valid_parts[3]) ? $valid_parts[3] : '';
        } else {
            // První je příjmení
            $prijmeni = $valid_parts[0];
            $jmeno = isset($valid_parts[1]) ? $valid_parts[1] : '';
            $titul_za = isset($valid_parts[2]) ? $valid_parts[2] : '';
        }
        
        // Kombinace titulu
        $full_titul = trim($titul_pred . ' ' . $titul_za);
        
        // Skipni prázdné záznamy
        if (empty($prijmeni) || empty($jmeno) || strlen($prijmeni) < 2) {
            continue;
        }
        
        // Zapiš data
        fputcsv($out_handle, [$prijmeni, $jmeno, $full_titul, ''], "\t");
        $processed++;
        
        // Debug pro první pár záznamů
        if ($processed <= 10) {
            echo "[$processed] $prijmeni $jmeno | $full_titul\n";
        }
    }
}

fclose($handle);
fclose($out_handle);

echo "Zpracováno: $processed záznamů\n";
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