<?php
/**
 * Script pro párování uživatelů mezi EEO2025 a externími zdroji
 * POUZE analýza a doporučení - žádné změny v DB!
 */

function load_eeo_users() {
    $file = '/var/www/erdms-dev/export_uzivatele_2026-01-04_16-18-51.txt';
    
    if (!file_exists($file)) {
        echo "CHYBA: EEO export soubor neexistuje!\n";
        return [];
    }
    
    $handle = fopen($file, 'r');
    $header = fgetcsv($handle, 0, "\t");
    $users = [];
    
    while (($data = fgetcsv($handle, 0, "\t")) !== FALSE) {
        if (count($data) == count($header)) {
            $user = array_combine($header, $data);
            $users[] = $user;
        }
    }
    
    fclose($handle);
    echo "Načteno " . count($users) . " uživatelů z EEO2025\n";
    return $users;
}

function load_external_users($filename = null) {
    // Hledej nejnovější externí soubor
    $patterns = [
        '/var/www/erdms-dev/externa_normalized_*.txt',
        '/var/www/erdms-dev/rs_telseznam_export.*',
        '/var/www/erdms-dev/external_data.*'
    ];
    
    $external_file = null;
    
    if ($filename && file_exists($filename)) {
        $external_file = $filename;
    } else {
        foreach ($patterns as $pattern) {
            $files = glob($pattern);
            if (!empty($files)) {
                $external_file = $files[0];
                break;
            }
        }
    }
    
    if (!$external_file) {
        echo "Žádný externí soubor nenalezen!\n";
        return [];
    }
    
    echo "Načítám externí data z: $external_file\n";
    
    $handle = fopen($external_file, 'r');
    $header = fgetcsv($handle, 0, "\t");
    $users = [];
    
    while (($data = fgetcsv($handle, 0, "\t")) !== FALSE) {
        if (count($data) == count($header)) {
            $user = array_combine($header, $data);
            $users[] = $user;
        }
    }
    
    fclose($handle);
    echo "Načteno " . count($users) . " záznamů z externího zdroje\n";
    return $users;
}

function normalize_name($str) {
    // Normalizace jmen pro porovnávání
    $str = trim($str);
    $str = mb_strtolower($str, 'UTF-8');
    
    // Odstranění diakritiky
    $replacements = [
        'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e',
        'í' => 'i', 'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's',
        'ť' => 't', 'ú' => 'u', 'ů' => 'u', 'ý' => 'y', 'ž' => 'z'
    ];
    
    return strtr($str, $replacements);
}

function compare_users($eeo_users, $external_users) {
    echo "\n=== ANALÝZA PÁROVÁNÍ ===\n";
    
    $matches = [];
    $eeo_missing = [];
    $external_missing = [];
    $phone_updates = [];
    
    // Vytvoř indexy pro rychlé hledání
    $eeo_index = [];
    foreach ($eeo_users as $user) {
        $key = normalize_name($user['Prijmeni']) . '_' . normalize_name($user['Jmeno']);
        $eeo_index[$key] = $user;
    }
    
    $external_index = [];
    foreach ($external_users as $user) {
        $key = normalize_name($user['Prijmeni']) . '_' . normalize_name($user['Jmeno']);
        $external_index[$key] = $user;
    }
    
    // Najdi shody
    foreach ($eeo_index as $key => $eeo_user) {
        if (isset($external_index[$key])) {
            $external_user = $external_index[$key];
            $matches[] = [
                'eeo' => $eeo_user,
                'external' => $external_user,
                'key' => $key
            ];
            
            // Kontrola telefonu
            $eeo_phone = trim($eeo_user['Telefon'] ?? '');
            $ext_phone = trim($external_user['Mobil'] ?? '');
            
            if ($ext_phone && $ext_phone !== $eeo_phone) {
                $phone_updates[] = [
                    'user' => $eeo_user,
                    'current_phone' => $eeo_phone,
                    'new_phone' => $ext_phone
                ];
            }
        } else {
            $eeo_missing[] = $eeo_user;
        }
    }
    
    // Najdi uživatele jen v externím zdroji
    foreach ($external_index as $key => $external_user) {
        if (!isset($eeo_index[$key])) {
            $external_missing[] = $external_user;
        }
    }
    
    // Výsledky
    echo "Celkem EEO uživatelů: " . count($eeo_users) . "\n";
    echo "Celkem externích záznamů: " . count($external_users) . "\n";
    echo "Nalezeno shod: " . count($matches) . "\n";
    echo "Jen v EEO: " . count($eeo_missing) . "\n";
    echo "Jen v externím zdroji: " . count($external_missing) . "\n";
    echo "Potřeba aktualizace telefonu: " . count($phone_updates) . "\n";
    
    // Detailní výsledky
    create_mapping_report($matches, $eeo_missing, $external_missing, $phone_updates);
    
    return [
        'matches' => $matches,
        'eeo_missing' => $eeo_missing,
        'external_missing' => $external_missing,
        'phone_updates' => $phone_updates
    ];
}

function create_mapping_report($matches, $eeo_missing, $external_missing, $phone_updates) {
    $report_file = '/var/www/erdms-dev/mapping_report_' . date('Y-m-d_H-i-s') . '.txt';
    $handle = fopen($report_file, 'w');
    
    if (!$handle) {
        echo "CHYBA: Nelze vytvořit report!\n";
        return;
    }
    
    fwrite($handle, "=== REPORT PÁROVÁNÍ UŽIVATELŮ ===\n");
    fwrite($handle, "Datum: " . date('Y-m-d H:i:s') . "\n\n");
    
    fwrite($handle, "=== NALEZENÉ SHODY (" . count($matches) . ") ===\n");
    fwrite($handle, "EEO_ID\tEEO_Jméno\tEEO_Telefon\t|\tExt_Jméno\tExt_Telefon\n");
    foreach ($matches as $match) {
        fwrite($handle, sprintf("%s\t%s %s\t%s\t|\t%s %s\t%s\n",
            $match['eeo']['ID'],
            $match['eeo']['Jmeno'], $match['eeo']['Prijmeni'],
            $match['eeo']['Telefon'],
            $match['external']['Jmeno'], $match['external']['Prijmeni'],
            $match['external']['Mobil']
        ));
    }
    
    fwrite($handle, "\n=== AKTUALIZACE TELEFONŮ (" . count($phone_updates) . ") ===\n");
    fwrite($handle, "ID\tJméno\tStarý_telefon\tNový_telefon\n");
    foreach ($phone_updates as $update) {
        fwrite($handle, sprintf("%s\t%s %s\t%s\t%s\n",
            $update['user']['ID'],
            $update['user']['Jmeno'], $update['user']['Prijmeni'],
            $update['current_phone'],
            $update['new_phone']
        ));
    }
    
    fwrite($handle, "\n=== JEN V EEO (" . count($eeo_missing) . ") ===\n");
    foreach ($eeo_missing as $user) {
        fwrite($handle, sprintf("%s\t%s %s\t%s\n",
            $user['ID'],
            $user['Jmeno'], $user['Prijmeni'],
            $user['Telefon']
        ));
    }
    
    fwrite($handle, "\n=== JEN V EXTERNÍM ZDROJI (" . count($external_missing) . ") ===\n");
    foreach ($external_missing as $user) {
        fwrite($handle, sprintf("%s %s\t%s\t%s\n",
            $user['Jmeno'], $user['Prijmeni'],
            $user['Titul'],
            $user['Mobil']
        ));
    }
    
    fclose($handle);
    echo "\nReport uložen do: $report_file\n";
}

// Hlavní spuštění
echo "=== PÁROVÁNÍ UŽIVATELŮ EEO2025 ===\n\n";

$eeo_users = load_eeo_users();
if (empty($eeo_users)) {
    exit("Nelze načíst EEO uživatele!\n");
}

$external_users = load_external_users($argv[1] ?? null);
if (empty($external_users)) {
    echo "\nČekám na externí data...\n";
    echo "Použití: php match_users.php [cesta_k_externimu_souboru]\n";
    exit;
}

$results = compare_users($eeo_users, $external_users);

echo "\n=== DOPORUČENÍ ===\n";
echo "1. Zkontrolujte report soubor pro detailní analýzu\n";
echo "2. Ověřte navrhované aktualizace telefonů\n";
echo "3. Rozhodněte o přidání nových uživatelů\n";
echo "4. PŘED JAKOUKOLIV ZMĚNOU V DB - zeptejte se!\n";
?>