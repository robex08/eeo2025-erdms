<?php
/**
 * Hlavní script pro kompletní mapování a doplnění uživatelů
 * 
 * KROK 1: Doplnění telefonů z rs_telseznam do EEO dat (s prefixem 999-)
 * KROK 2: Párování podle osobních čísel se třetím seznamem  
 * KROK 3: Přidání chybějících uživatelů
 * KROK 4: Mapování lokalit a rolí na ID
 * KROK 5: Generování emailů pro nové uživatele
 */

// Načtení funkcí
function normalize_name($str) {
    $str = trim($str);
    $str = mb_strtolower($str, 'UTF-8');
    $replacements = [
        'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e',
        'í' => 'i', 'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's',
        'ť' => 't', 'ú' => 'u', 'ů' => 'u', 'ý' => 'y', 'ž' => 'z'
    ];
    return strtr($str, $replacements);
}

function generate_email($jmeno, $prijmeni) {
    $clean_jmeno = normalize_name($jmeno);
    $clean_prijmeni = normalize_name($prijmeni);
    return $clean_jmeno . '.' . $clean_prijmeni . '@zachranka.cz';
}

// Načítání dat
echo "=== NAČÍTÁNÍ ZDROJOVÝCH DAT ===\n";

// 1. EEO2025-dev uživatelé
$eeo_file = '/var/www/erdms-dev/export_uzivatele_2026-01-04_16-18-51.txt';
$eeo_users = [];
$handle = fopen($eeo_file, 'r');
$header = fgetcsv($handle, 0, "\t");
while (($data = fgetcsv($handle, 0, "\t")) !== FALSE) {
    if (count($data) == count($header)) {
        $eeo_users[] = array_combine($header, $data);
    }
}
fclose($handle);
echo "EEO uživatelé: " . count($eeo_users) . "\n";

// 2. rs_telseznam telefony
$rs_file = '/var/www/erdms-dev/rs_telseznam_extracted_2026-01-04_16-33-13.txt';
$rs_phones = [];
$handle = fopen($rs_file, 'r');
$header = fgetcsv($handle, 0, "\t");
while (($data = fgetcsv($handle, 0, "\t")) !== FALSE) {
    if (count($data) >= 4) {
        $rs_phones[] = [
            'prijmeni' => $data[0],
            'jmeno' => $data[1], 
            'titul' => $data[2],
            'mobil' => $data[3]
        ];
    }
}
fclose($handle);
echo "rs_telseznam záznamy: " . count($rs_phones) . "\n";

// 3. Třetí seznam s osobními čísly
$third_file = '/var/www/erdms-dev/third_source_fixed_2026-01-04_16-36-57.txt';
$third_users = [];
$handle = fopen($third_file, 'r');
$header = fgetcsv($handle, 0, "\t");
while (($data = fgetcsv($handle, 0, "\t")) !== FALSE) {
    if (count($data) >= 3) {
        $third_users[] = [
            'prijmeni' => $data[0],
            'jmeno' => $data[1],
            'titul' => $data[2],
            'mobil' => isset($data[3]) ? $data[3] : ''
        ];
    }
}
fclose($handle);
echo "Třetí seznam uživatelé: " . count($third_users) . "\n";

echo "\n=== KROK 1: DOPLNĚNÍ TELEFONŮ Z rs_telseznam ===\n";

$phone_updates = 0;
foreach ($eeo_users as &$eeo_user) {
    // Pokud nemá telefon nebo má neplatný
    if (empty($eeo_user['Telefon']) || $eeo_user['Telefon'] === 'NULL' || strlen($eeo_user['Telefon']) < 9) {
        
        // Hledej v rs_telseznam
        foreach ($rs_phones as $rs_phone) {
            if (normalize_name($eeo_user['Prijmeni']) === normalize_name($rs_phone['prijmeni']) &&
                normalize_name($eeo_user['Jmeno']) === normalize_name($rs_phone['jmeno'])) {
                
                if (!empty($rs_phone['mobil']) && $rs_phone['mobil'] !== '-') {
                    $eeo_user['Telefon'] = '999-' . $rs_phone['mobil']; // Prefix pro kontrolu
                    $phone_updates++;
                    echo "Telefon doplněn: {$eeo_user['Jmeno']} {$eeo_user['Prijmeni']} -> {$rs_phone['mobil']}\n";
                    break;
                }
            }
        }
    }
}
echo "Doplněno telefonů: $phone_updates\n";

echo "\n=== VÝSLEDEK KROKU 1 ===\n";
echo "Zpracováno uživatelů EEO: " . count($eeo_users) . "\n";
echo "Doplněno telefonů s prefixem 999-: $phone_updates\n";

// Uložit mezivýsledek
$step1_file = '/var/www/erdms-dev/step1_eeo_with_phones_' . date('Y-m-d_H-i-s') . '.txt';
$handle = fopen($step1_file, 'w');
fputcsv($handle, array_keys($eeo_users[0]), "\t");
foreach ($eeo_users as $user) {
    fputcsv($handle, array_values($user), "\t");
}
fclose($handle);
echo "Mezivýsledek uložen: $step1_file\n";

echo "\nKROK 1 DOKONČEN. Pokračovat dalšími kroky? (y/n): ";
$input = trim(fgets(STDIN));
if (strtolower($input) !== 'y') {
    echo "Zastaveno uživatelem.\n";
    exit;
}

echo "\n=== KROK 2: PÁROVÁNÍ PODLE OSOBNÍCH ČÍSEL ===\n";
echo "TODO: Implementace párování se třetím seznamem podle u0xxxx\n";
echo "TODO: Přidání chybějících uživatelů\n";
echo "TODO: Mapování lokalit a rolí\n";
?>