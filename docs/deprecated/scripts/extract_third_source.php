<?php
/**
 * Zpracování třetího zdroje dat do CSV formátu
 */

$raw_file = '/var/www/erdms-dev/third_source_raw_data.txt';
$output_file = '/var/www/erdms-dev/third_source_extracted_' . date('Y-m-d_H-i-s') . '.txt';

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

echo "Zpracovávám třetí zdroj dat...\n";

// Hlavička pro výstupní soubor (jen základní data pro mapování)
fputcsv($out_handle, ['Prijmeni', 'Jmeno', 'Titul', 'Mobil'], "\t");

$processed = 0;
$line_number = 0;

while (($line = fgets($handle)) !== false) {
    $line_number++;
    $line = trim($line);
    
    if (empty($line) || $line_number == 1) continue; // Skip header
    
    // Parse TAB-separated data
    $data = explode("\t", $line);
    
    if (count($data) >= 3) {
        // Sloupce: Titul, Prijmeni, Jmeno, Titul_Za, ...
        $titul = isset($data[0]) ? trim($data[0]) : '';
        $prijmeni = isset($data[1]) ? trim($data[1]) : '';
        $jmeno = isset($data[2]) ? trim($data[2]) : '';
        $titul_za = isset($data[3]) ? trim($data[3]) : '';
        $pozice = isset($data[4]) ? trim($data[4]) : '';
        $lokalita = isset($data[5]) ? trim($data[5]) : '';
        $osobni_cislo = isset($data[6]) ? trim($data[6]) : '';
        $nesoulad = isset($data[8]) ? trim($data[8]) : '';
        
        // Kombinace titulu
        $full_titul = trim($titul . ' ' . $titul_za);
        
        // Skipni prázdné záznamy nebo řádky s jen mezerami
        if (empty($prijmeni) || empty($jmeno) || strlen($prijmeni) < 2) {
            echo "Skipping line $line_number: '$prijmeni' '$jmeno'\n";
            continue;
        }
        
        // Tento zdroj nemá přímo mobily, ale má osobní číslo
        $mobil = $osobni_cislo; // nebo můžeme nechat prázdný
        
        // Zapiš data
        fputcsv($out_handle, [$prijmeni, $jmeno, $full_titul, ''], "\t");
        $processed++;
        
        // Debug pro první pár záznamů
        if ($processed <= 5) {
            echo "[$processed] $prijmeni $jmeno | $full_titul | $pozice | $lokalita\n";
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

echo "\n=== STATISTIKY ===\n";
echo "Celkem záznamů: $processed\n";
echo "Tento soubor obsahuje detailní pozice a lokality\n";
echo "Připraveno pro cross-mapování s EEO a rs_telseznam\n";
?>