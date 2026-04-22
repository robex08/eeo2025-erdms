<?php
/**
 * INVENTIK - CSV Import Script
 * 
 * Importuje všechny 4 CSV soubory do databáze
 * - budovy.csv -> budovy
 * - inv-usek.csv -> inventarni_useky
 * - mistnostni.csv -> mistnosti
 * - 26-04-22-ppsa.csv -> majetek
 * 
 * Použití: php import_csv.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300); // 5 minut

require_once __DIR__ . '/config.php';

// Připojení k databázi
try {
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        DB_HOST,
        DB_PORT,
        DB_NAME
    );
    
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    echo "✓ Připojení k databázi OK\n\n";
} catch (PDOException $e) {
    die("✗ Chyba připojení: " . $e->getMessage() . "\n");
}

// Helper funkce pro převod datumu
function convertDate($dateStr) {
    if (empty($dateStr)) return null;
    
    // Formát: DD.MM.YYYY -> YYYY-MM-DD
    if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', trim($dateStr), $m)) {
        return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
    }
    
    return null;
}

// Helper funkce pro převod čísla
function convertNumber($numStr) {
    if (empty($numStr)) return null;
    
    // Nahradit čárku tečkou
    $num = str_replace(',', '.', trim($numStr));
    
    return is_numeric($num) ? $num : null;
}

// =============================================================================
// 1. IMPORT BUDOVY
// =============================================================================

echo "═══════════════════════════════════════\n";
echo "1. IMPORT BUDOVY\n";
echo "═══════════════════════════════════════\n";

$csvFile = __DIR__ . '/../podklady/budovy.csv';
if (!file_exists($csvFile)) {
    die("✗ Soubor nenalezen: $csvFile\n");
}

$handle = fopen($csvFile, 'r');
$header = fgetcsv($handle, 0, ';'); // Přeskočit hlavičku
$imported = 0;
$errors = 0;

$stmt = $pdo->prepare("
    INSERT INTO budovy (budt, budovat, zaplf, koplf, bmist, datum_zapujceni, datum_ukonceni)
    VALUES (:budt, :budovat, :zaplf, :koplf, :bmist, :datum_zapujceni, :datum_ukonceni)
");

while (($row = fgetcsv($handle, 0, ';')) !== false) {
    try {
        $stmt->execute([
            ':budt' => $row[0] ?? null,
            ':budovat' => $row[1] ?? null,
            ':zaplf' => $row[2] ?? null,
            ':koplf' => $row[3] ?? null,
            ':bmist' => $row[4] ?? null,
            ':datum_zapujceni' => convertDate($row[2] ?? ''),
            ':datum_ukonceni' => convertDate($row[3] ?? ''),
        ]);
        $imported++;
    } catch (PDOException $e) {
        $errors++;
        echo "✗ Chyba: " . $e->getMessage() . "\n";
    }
}

fclose($handle);
echo "✓ Importováno budov: $imported\n";
if ($errors > 0) echo "⚠ Chyby: $errors\n";
echo "\n";

// =============================================================================
// 2. IMPORT INVENTÁRNÍ ÚSEKY
// =============================================================================

echo "═══════════════════════════════════════\n";
echo "2. IMPORT INVENTÁRNÍ ÚSEKY\n";
echo "═══════════════════════════════════════\n";

$csvFile = __DIR__ . '/../podklady/inv-usek.csv';
if (!file_exists($csvFile)) {
    die("✗ Soubor nenalezen: $csvFile\n");
}

$handle = fopen($csvFile, 'r');
$header = fgetcsv($handle, 0, ';');
$imported = 0;
$errors = 0;

$stmt = $pdo->prepare("
    INSERT INTO inventarni_useky (cinv, prac, nazinv, zaplf, koplf, datum_zapujceni, datum_ukonceni)
    VALUES (:cinv, :prac, :nazinv, :zaplf, :koplf, :datum_zapujceni, :datum_ukonceni)
");

while (($row = fgetcsv($handle, 0, ';')) !== false) {
    try {
        $stmt->execute([
            ':cinv' => $row[0] ?? null,
            ':prac' => $row[1] ?? null,
            ':nazinv' => $row[2] ?? null,
            ':zaplf' => $row[3] ?? null,
            ':koplf' => $row[4] ?? null,
            ':datum_zapujceni' => convertDate($row[3] ?? ''),
            ':datum_ukonceni' => convertDate($row[4] ?? ''),
        ]);
        $imported++;
    } catch (PDOException $e) {
        $errors++;
        echo "✗ Chyba: " . $e->getMessage() . "\n";
    }
}

fclose($handle);
echo "✓ Importováno inv. úseků: $imported\n";
if ($errors > 0) echo "⚠ Chyby: $errors\n";
echo "\n";

// =============================================================================
// 3. IMPORT MÍSTNOSTI
// =============================================================================

echo "═══════════════════════════════════════\n";
echo "3. IMPORT MÍSTNOSTI\n";
echo "═══════════════════════════════════════\n";

$csvFile = __DIR__ . '/../podklady/mistnostni.csv';
if (!file_exists($csvFile)) {
    die("✗ Soubor nenalezen: $csvFile\n");
}

$handle = fopen($csvFile, 'r');
$header = fgetcsv($handle, 0, ';');
$imported = 0;
$errors = 0;

$stmt = $pdo->prepare("
    INSERT INTO mistnosti (budt, mist, mistt, zaplf, koplf, datum_zapujceni, datum_ukonceni)
    VALUES (:budt, :mist, :mistt, :zaplf, :koplf, :datum_zapujceni, :datum_ukonceni)
");

while (($row = fgetcsv($handle, 0, ';')) !== false) {
    try {
        $stmt->execute([
            ':budt' => $row[0] ?? null,
            ':mist' => $row[1] ?? null,
            ':mistt' => $row[2] ?? null,
            ':zaplf' => $row[3] ?? null,
            ':koplf' => $row[4] ?? null,
            ':datum_zapujceni' => convertDate($row[3] ?? ''),
            ':datum_ukonceni' => convertDate($row[4] ?? ''),
        ]);
        $imported++;
    } catch (PDOException $e) {
        $errors++;
        // Může být duplicita nebo chybějící budova
        if (strpos($e->getMessage(), 'Duplicate') === false) {
            echo "✗ Chyba řádek " . ($imported + $errors) . ": " . $e->getMessage() . "\n";
        }
    }
}

fclose($handle);
echo "✓ Importováno místností: $imported\n";
if ($errors > 0) echo "⚠ Chyby: $errors\n";
echo "\n";

// =============================================================================
// 4. IMPORT MAJETEK
// =============================================================================

echo "═══════════════════════════════════════\n";
echo "4. IMPORT MAJETEK (může trvat déle...)\n";
echo "═══════════════════════════════════════\n";

$csvFile = __DIR__ . '/../podklady/26-04-22-ppsa.csv';
if (!file_exists($csvFile)) {
    die("✗ Soubor nenalezen: $csvFile\n");
}

$handle = fopen($csvFile, 'r');
$header = fgetcsv($handle, 0, ';');
$imported = 0;
$errors = 0;
$nezarazeno = 0;

// Načíst existující místnosti pro kontrolu
$mistnosti = [];
$result = $pdo->query("SELECT budt, mist FROM mistnosti");
while ($row = $result->fetch()) {
    $mistnosti[$row['budt'] . '|' . $row['mist']] = true;
}

echo "✓ Načteno místností pro kontrolu: " . count($mistnosti) . "\n";

$stmt = $pdo->prepare("
    INSERT INTO majetek (
        cinv, cislo, budt, mist, osc, zapl, nazev, poh, nomenkl, kat,
        typmajet, ucet, datzar, trida, mj, cenamj, czcpa, skp, jkpov, druh,
        cmnoz, ccena, fizd, hjz, dod, cdokpor, cdok, vyrcis, rok, evcis,
        cinnost, zak, najz, naji, naj, pracn, datpok, kontr, zpinv, zptck,
        pozn, obr, prilohy,
        datum_zarazeni, datum_zapujceni, datum_poklesu,
        cena_mj_num, mnozstvi_num, celkova_cena_num, rok_num, mistnost_nalezena
    ) VALUES (
        :cinv, :cislo, :budt, :mist, :osc, :zapl, :nazev, :poh, :nomenkl, :kat,
        :typmajet, :ucet, :datzar, :trida, :mj, :cenamj, :czcpa, :skp, :jkpov, :druh,
        :cmnoz, :ccena, :fizd, :hjz, :dod, :cdokpor, :cdok, :vyrcis, :rok, :evcis,
        :cinnost, :zak, :najz, :naji, :naj, :pracn, :datpok, :kontr, :zpinv, :zptck,
        :pozn, :obr, :prilohy,
        :datum_zarazeni, :datum_zapujceni, :datum_poklesu,
        :cena_mj_num, :mnozstvi_num, :celkova_cena_num, :rok_num, :mistnost_nalezena
    )
");

while (($row = fgetcsv($handle, 0, ';')) !== false) {
    try {
        // Kontrola existence místnosti
        $mistnostKlic = ($row[2] ?? '') . '|' . ($row[3] ?? '');
        $mistnostNalezena = isset($mistnosti[$mistnostKlic]) || empty($row[3]);
        
        if (!$mistnostNalezena) {
            $nezarazeno++;
        }
        
        $stmt->execute([
            ':cinv' => !empty($row[0]) ? $row[0] : null,
            ':cislo' => $row[1] ?? null,
            ':budt' => !empty($row[2]) ? $row[2] : null,
            ':mist' => !empty($row[3]) ? $row[3] : null,
            ':osc' => $row[4] ?? null,
            ':zapl' => $row[5] ?? null,
            ':nazev' => $row[6] ?? null,
            ':poh' => $row[7] ?? null,
            ':nomenkl' => $row[8] ?? null,
            ':kat' => $row[9] ?? null,
            ':typmajet' => $row[10] ?? null,
            ':ucet' => $row[11] ?? null,
            ':datzar' => $row[12] ?? null,
            ':trida' => $row[13] ?? null,
            ':mj' => $row[14] ?? null,
            ':cenamj' => $row[15] ?? null,
            ':czcpa' => $row[16] ?? null,
            ':skp' => $row[17] ?? null,
            ':jkpov' => $row[18] ?? null,
            ':druh' => $row[19] ?? null,
            ':cmnoz' => $row[20] ?? null,
            ':ccena' => $row[21] ?? null,
            ':fizd' => $row[22] ?? null,
            ':hjz' => $row[23] ?? null,
            ':dod' => $row[24] ?? null,
            ':cdokpor' => $row[25] ?? null,
            ':cdok' => $row[26] ?? null,
            ':vyrcis' => $row[27] ?? null,
            ':rok' => $row[28] ?? null,
            ':evcis' => $row[29] ?? null,
            ':cinnost' => $row[30] ?? null,
            ':zak' => $row[31] ?? null,
            ':najz' => $row[32] ?? null,
            ':naji' => $row[33] ?? null,
            ':naj' => $row[34] ?? null,
            ':pracn' => $row[35] ?? null,
            ':datpok' => $row[36] ?? null,
            ':kontr' => $row[37] ?? null,
            ':zpinv' => $row[38] ?? null,
            ':zptck' => $row[39] ?? null,
            ':pozn' => $row[40] ?? null,
            ':obr' => $row[41] ?? null,
            ':prilohy' => $row[42] ?? null,
            // Převedené hodnoty
            ':datum_zarazeni' => convertDate($row[12] ?? ''),
            ':datum_zapujceni' => convertDate($row[5] ?? ''),
            ':datum_poklesu' => convertDate($row[36] ?? ''),
            ':cena_mj_num' => convertNumber($row[15] ?? ''),
            ':mnozstvi_num' => convertNumber($row[20] ?? ''),
            ':celkova_cena_num' => convertNumber($row[21] ?? ''),
            ':rok_num' => is_numeric($row[28] ?? '') ? intval($row[28]) : null,
            ':mistnost_nalezena' => $mistnostNalezena ? 1 : 0,
        ]);
        $imported++;
        
        if ($imported % 1000 == 0) {
            echo "  ... importováno $imported položek\n";
        }
    } catch (PDOException $e) {
        $errors++;
        if ($errors <= 10) {
            echo "✗ Chyba řádek " . ($imported + $errors) . ": " . $e->getMessage() . "\n";
        }
    }
}

fclose($handle);
echo "✓ Importováno majetku: $imported\n";
echo "⚠ Nezařazeno (místnost nenalezena): $nezarazeno\n";
if ($errors > 0) echo "⚠ Chyby: $errors\n";
echo "\n";

// =============================================================================
// STATISTIKY
// =============================================================================

echo "═══════════════════════════════════════\n";
echo "STATISTIKY PO IMPORTU\n";
echo "═══════════════════════════════════════\n";

$stats = $pdo->query("
    SELECT 
        'Budovy' as tabulka, 
        COUNT(*) as pocet 
    FROM budovy
    UNION ALL
    SELECT 'Inv. úseky', COUNT(*) FROM inventarni_useky
    UNION ALL
    SELECT 'Místnosti', COUNT(*) FROM mistnosti
    UNION ALL
    SELECT 'Majetek', COUNT(*) FROM majetek
")->fetchAll();

foreach ($stats as $row) {
    printf("%-15s: %6d\n", $row['tabulka'], $row['pocet']);
}

echo "\n";
echo "✓ IMPORT DOKONČEN!\n";
echo "═══════════════════════════════════════\n";
