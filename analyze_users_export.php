<?php
/**
 * Analýza exportovaných uživatelů pro mapování
 * Připrava pro porovnání s externími zdroji
 */

echo "=== ANALÝZA EXPORTU UŽIVATELŮ EEO2025-DEV ===\n";
echo "Datum: " . date('Y-m-d H:i:s') . "\n\n";

// Načtení exportovaných dat
$export_file = '/var/www/erdms-dev/export_uzivatele_2026-01-04_16-18-51.txt';
if (!file_exists($export_file)) {
    echo "CHYBA: Soubor $export_file neexistuje!\n";
    exit;
}

$handle = fopen($export_file, 'r');
if (!$handle) {
    echo "CHYBA: Nelze otevřít soubor!\n";
    exit;
}

// Načti hlavičku
$header = fgetcsv($handle, 0, "\t");
$users = [];
$stats = [
    'celkem' => 0,
    'aktivni' => 0,
    'neaktivni' => 0,
    's_telefonem' => 0,
    's_emailem' => 0,
    'bez_telefonu' => 0,
    'bez_emailu' => 0
];

// Načti data
while (($data = fgetcsv($handle, 0, "\t")) !== FALSE) {
    if (count($data) == count($header)) {
        $user = array_combine($header, $data);
        $users[] = $user;
        
        $stats['celkem']++;
        
        if ($user['Aktivni'] == '1') {
            $stats['aktivni']++;
        } else {
            $stats['neaktivni']++;
        }
        
        if (!empty($user['Telefon']) && $user['Telefon'] != 'NULL') {
            $stats['s_telefonem']++;
        } else {
            $stats['bez_telefonu']++;
        }
        
        if (!empty($user['Email']) && $user['Email'] != 'NULL') {
            $stats['s_emailem']++;
        } else {
            $stats['bez_emailu']++;
        }
    }
}

fclose($handle);

echo "=== STATISTIKY ===\n";
foreach ($stats as $key => $value) {
    echo sprintf("%-20s: %d\n", ucfirst(str_replace('_', ' ', $key)), $value);
}

echo "\n=== UKÁZKA PRO MAPOVÁNÍ ===\n";
echo "Sloupce pro porovnání s externími zdroji:\n";
echo "- Titul_pred\n";
echo "- Jmeno\n"; 
echo "- Prijmeni\n";
echo "- Titul_za\n";
echo "- Telefon\n";
echo "\n";

echo "Prvních 10 aktivních uživatelů:\n";
echo "Titul\tJméno\tPříjmení\tTelefon\tEmail\n";
echo str_repeat("-", 80) . "\n";

$count = 0;
foreach ($users as $user) {
    if ($user['Aktivni'] == '1' && $count < 10) {
        $titul_full = trim(($user['Titul_pred'] ?? '') . ' ' . ($user['Titul_za'] ?? ''));
        echo sprintf("%s\t%s\t%s\t%s\t%s\n",
            $titul_full ?: 'N/A',
            $user['Jmeno'] ?? 'N/A',
            $user['Prijmeni'] ?? 'N/A', 
            $user['Telefon'] ?? 'N/A',
            $user['Email'] ?? 'N/A'
        );
        $count++;
    }
}

echo "\n=== PŘÍPRAVA PRO MAPOVÁNÍ ===\n";
echo "1. ✅ Export z tabulky 25_uzivatele dokončen\n";
echo "2. ❌ Externí databáze 10.1.1.253 - potřebuji přístupové údaje\n";
echo "3. ⏳ Čekám na soubor pro párování\n";

echo "\nSoubory připravené pro mapování:\n";
echo "- $export_file (TAB separated)\n";
echo "- /var/www/erdms-dev/backup_uzivatele_2026-01-04_16-18-51.sql (SQL backup)\n";

echo "\nDalší kroky:\n";
echo "1. Získat přístup k databázi na 10.1.1.253\n";
echo "2. Export tabulky rs_telseznam (jmeno, prijmeni, titul, mobil)\n";
echo "3. Párování dat podle jména a příjmení\n";
echo "4. Analýza rozdílů a doporučení pro aktualizaci\n";
?>