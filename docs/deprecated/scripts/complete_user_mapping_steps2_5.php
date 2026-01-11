<?php
/**
 * KROKY 2-5: Dokončení mapování uživatelů
 */

require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

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

// Připojení k databázi pro mapování
try {
    $config = [
        'host' => '10.3.172.11',
        'dbname' => 'eeo2025-dev',
        'username' => 'erdms_user',
        'password' => 'AhchohTahnoh7eim',
        'charset' => 'utf8mb4'
    ];

    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Načtení mapovacích tabulek
    echo "=== NAČÍTÁNÍ MAPOVACÍCH TABULEK ===\n";
    
    // Lokality
    $stmt = $pdo->query("SELECT id, nazev FROM `25_lokality`");
    $lokality_map = [];
    while ($row = $stmt->fetch()) {
        $lokality_map[normalize_name($row['nazev'])] = $row['id'];
    }
    echo "Načteno lokalit: " . count($lokality_map) . "\n";
    
    // Pozice
    $stmt = $pdo->query("SELECT id, nazev_pozice FROM `25_pozice`");
    $pozice_map = [];
    while ($row = $stmt->fetch()) {
        $pozice_map[normalize_name($row['nazev_pozice'])] = $row['id'];
    }
    echo "Načteno pozic: " . count($pozice_map) . "\n";
    
    // Úseky
    $stmt = $pdo->query("SELECT id, usek_nazev FROM `25_useky`");
    $useky_map = [];
    while ($row = $stmt->fetch()) {
        $useky_map[normalize_name($row['usek_nazev'])] = $row['id'];
    }
    echo "Načteno úseků: " . count($useky_map) . "\n";

} catch (Exception $e) {
    echo "CHYBA připojení k DB: " . $e->getMessage() . "\n";
    exit;
}

echo "\n=== NAČÍTÁNÍ DAT Z KROKU 1 ===\n";
$step1_files = glob('/var/www/erdms-dev/step1_eeo_with_phones_*.txt');
if (empty($step1_files)) {
    echo "CHYBA: Nenalezen soubor z kroku 1!\n";
    exit;
}
$step1_file = end($step1_files);
echo "Načítám: $step1_file\n";

$eeo_users = [];
$handle = fopen($step1_file, 'r');
$header = fgetcsv($handle, 0, "\t");
while (($data = fgetcsv($handle, 0, "\t")) !== FALSE) {
    if (count($data) == count($header)) {
        $eeo_users[] = array_combine($header, $data);
    }
}
fclose($handle);
echo "EEO uživatelé po kroku 1: " . count($eeo_users) . "\n";

echo "\n=== NAČÍTÁNÍ TŘETÍHO SEZNAMU S OSOBNÍMI ČÍSLY ===\n";
$raw_third_file = '/var/www/erdms-dev/third_source_raw_data.txt';
$third_detailed = [];
$handle = fopen($raw_third_file, 'r');
$line_number = 0;

while (($line = fgets($handle)) !== false) {
    $line_number++;
    $line = trim($line);
    
    if (empty($line) || $line_number == 1) continue; // Skip header
    
    $parts = preg_split('/\t+/', $line);
    $valid_parts = array_filter($parts, function($p) { return !empty(trim($p)); });
    $valid_parts = array_values($valid_parts);
    
    if (count($valid_parts) >= 6) { // Potřebujeme alespoň 6 sloupců pro osobní číslo
        $titul_pred = '';
        $prijmeni = '';
        $jmeno = '';
        $titul_za = '';
        $pozice = '';
        $lokalita = '';
        $osobni_cislo = '';
        
        // Detekce struktury
        if (preg_match('/^(MUDr\.|Bc\.|Mgr\.|Ing\.|Dr\.)/', $valid_parts[0])) {
            // První je titul
            $titul_pred = $valid_parts[0];
            $prijmeni = isset($valid_parts[1]) ? $valid_parts[1] : '';
            $jmeno = isset($valid_parts[2]) ? $valid_parts[2] : '';
            $titul_za = isset($valid_parts[3]) ? $valid_parts[3] : '';
            $pozice = isset($valid_parts[4]) ? $valid_parts[4] : '';
            $lokalita = isset($valid_parts[5]) ? $valid_parts[5] : '';
            $osobni_cislo = isset($valid_parts[6]) ? $valid_parts[6] : '';
        } else {
            // První je příjmení
            $prijmeni = $valid_parts[0];
            $jmeno = isset($valid_parts[1]) ? $valid_parts[1] : '';
            $titul_za = isset($valid_parts[2]) ? $valid_parts[2] : '';
            $pozice = isset($valid_parts[3]) ? $valid_parts[3] : '';
            $lokalita = isset($valid_parts[4]) ? $valid_parts[4] : '';
            $osobni_cislo = isset($valid_parts[5]) ? $valid_parts[5] : '';
        }
        
        if (!empty($prijmeni) && !empty($jmeno) && !empty($osobni_cislo)) {
            $third_detailed[] = [
                'titul_pred' => $titul_pred,
                'prijmeni' => $prijmeni,
                'jmeno' => $jmeno,
                'titul_za' => $titul_za,
                'pozice' => $pozice,
                'lokalita' => $lokalita,
                'osobni_cislo' => $osobni_cislo
            ];
        }
    }
}
fclose($handle);

echo "Třetí seznam s osobními čísly: " . count($third_detailed) . "\n";

// Ukázka prvních 5
echo "\nPrvních 5 záznamů:\n";
foreach (array_slice($third_detailed, 0, 5) as $user) {
    echo sprintf("%-15s %-10s | %s | %s | %s\n", 
        $user['prijmeni'], 
        $user['jmeno'], 
        $user['osobni_cislo'],
        $user['pozice'],
        $user['lokalita']
    );
}

echo "\n=== KROK 2: IDENTIFIKACE EXISTUJÍCÍCH A CHYBĚJÍCÍCH ===\n";

$matched_users = [];
$missing_users = [];

foreach ($third_detailed as $third_user) {
    $found = false;
    
    foreach ($eeo_users as $eeo_user) {
        if (normalize_name($eeo_user['Prijmeni']) === normalize_name($third_user['prijmeni']) &&
            normalize_name($eeo_user['Jmeno']) === normalize_name($third_user['jmeno'])) {
            
            $matched_users[] = [
                'eeo' => $eeo_user,
                'third' => $third_user
            ];
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $missing_users[] = $third_user;
    }
}

echo "Nalezeno shod: " . count($matched_users) . "\n";
echo "Chybí v EEO: " . count($missing_users) . "\n";

echo "\nChybějící uživatelé:\n";
foreach ($missing_users as $user) {
    echo sprintf("%-15s %-10s | %s | %s | %s\n", 
        $user['prijmeni'], 
        $user['jmeno'], 
        $user['osobni_cislo'],
        $user['pozice'],
        $user['lokalita']
    );
}

echo "\n=== KROK 3: VYTVOŘENÍ NOVÝCH UŽIVATELŮ ===\n";

$max_id = 0;
foreach ($eeo_users as $user) {
    $max_id = max($max_id, (int)$user['ID']);
}

$new_users = [];
foreach ($missing_users as $missing) {
    $max_id++;
    
    // Mapování lokality
    $lokalita_id = 1; // Default Kladno
    foreach ($lokality_map as $nazev => $id) {
        if (strpos(normalize_name($missing['lokalita']), $nazev) !== false) {
            $lokalita_id = $id;
            break;
        }
    }
    
    // Mapování pozice  
    $pozice_id = 40; // Default pozice
    foreach ($pozice_map as $nazev => $id) {
        if (strpos(normalize_name($missing['pozice']), normalize_name($nazev)) !== false) {
            $pozice_id = $id;
            break;
        }
    }
    
    // Generování username a email
    $username = 'nologin_' . strtolower($missing['osobni_cislo']);
    $email = generate_email($missing['jmeno'], $missing['prijmeni']);
    
    $new_user = [
        'ID' => $max_id,
        'Username' => $username,
        'Titul_pred' => $missing['titul_pred'],
        'Jmeno' => $missing['jmeno'],
        'Prijmeni' => $missing['prijmeni'],
        'Titul_za' => $missing['titul_za'],
        'Email' => $email,
        'Telefon' => '', // Bude doplněn později
        'Pozice_ID' => $pozice_id,
        'Lokalita_ID' => $lokalita_id,
        'Organizace_ID' => 1,
        'Usek_ID' => 1,
        'Aktivni' => 0, // Neaktivní pro kontrolu
        'DT_Vytvoreni' => date('Y-m-d H:i:s'),
        'DT_Aktualizace' => date('Y-m-d H:i:s'),
        'DT_Posledni_aktivita' => '0000-00-00 00:00:00',
        'Osobni_cislo' => $missing['osobni_cislo'] // Pomocné pole
    ];
    
    $new_users[] = $new_user;
    echo "Nový uživatel: {$new_user['Jmeno']} {$new_user['Prijmeni']} | {$new_user['Username']} | {$new_user['Email']}\n";
}

echo "Vytvořeno nových uživatelů: " . count($new_users) . "\n";

// Sloučení všech uživatelů
$all_users = array_merge($eeo_users, $new_users);
echo "\nCelkem uživatelů po sloučení: " . count($all_users) . "\n";

// Uložení finálního výsledku
$final_file = '/var/www/erdms-dev/final_users_complete_' . date('Y-m-d_H-i-s') . '.txt';
$handle = fopen($final_file, 'w');

// Hlavička (bez pomocného sloupce Osobni_cislo)
$final_header = ['ID', 'Username', 'Titul_pred', 'Jmeno', 'Prijmeni', 'Titul_za', 'Email', 'Telefon', 'Pozice_ID', 'Lokalita_ID', 'Organizace_ID', 'Usek_ID', 'Aktivni', 'DT_Vytvoreni', 'DT_Aktualizace', 'DT_Posledni_aktivita'];
fputcsv($handle, $final_header, "\t");

foreach ($all_users as $user) {
    $row = [];
    foreach ($final_header as $field) {
        $row[] = isset($user[$field]) ? $user[$field] : '';
    }
    fputcsv($handle, $row, "\t");
}
fclose($handle);

echo "\n=== VÝSLEDEK ===\n";
echo "Finální soubor: $final_file\n";
echo "Celkem uživatelů: " . count($all_users) . "\n";
echo "Původní EEO: " . count($eeo_users) . "\n";
echo "Nově přidáno: " . count($new_users) . "\n";
echo "Telefonů doplněno s prefixem 999-: (z kroku 1)\n";

echo "\n=== DALŠÍ KROKY ===\n";
echo "1. Zkontrolujte soubor $final_file\n";
echo "2. Ověřte mapování lokalit a pozic\n";
echo "3. Odstraňte prefix 999- z telefonů po kontrole\n";
echo "4. PŘED IMPORTEM DO DB - ZEPTEJTE SE!\n";
?>