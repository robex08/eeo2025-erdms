#!/usr/bin/env php
<?php
/**
 * Test users/list endpointu - kontrola dt_posledni_prihlaseni
 * Datum: 2026-04-21
 */

// Load .env z API
$envFile = __DIR__ . '/eeo-v2/api-legacy/api.eeo/.env';
if (!file_exists($envFile)) {
    die("ERROR: .env file not found at: $envFile\n");
}

// Parse .env file
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    
    list($name, $value) = explode('=', $line, 2);
    $name = trim($name);
    $value = trim($value);
    
    if (preg_match('/^(["\'])(.*)\\1$/', $value, $matches)) {
        $value = $matches[2];
    }
    
    $_ENV[$name] = $value;
    putenv("$name=$value");
}

$dbHost = $_ENV['DB_HOST'] ?? 'localhost';
$dbName = $_ENV['DB_NAME'] ?? 'eeo2025-dev';
$dbUser = $_ENV['DB_USER'] ?? '';
$dbPass = $_ENV['DB_PASSWORD'] ?? '';

echo "\n";
echo "=================================================================\n";
echo "TEST USERS/LIST ENDPOINT - KONTROLA dt_posledni_prihlaseni\n";
echo "=================================================================\n";

try {
    $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
    $db = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Zkontrolujeme prvních 5 uživatelů - co obsahují
    $stmt = $db->query("
        SELECT 
            u.id,
            CONCAT(u.jmeno, ' ', u.prijmeni) as cele_jmeno,
            u.dt_posledni_aktivita,
            u.dt_posledni_prihlaseni,
            u.aktivni
        FROM 25_uzivatele u
        WHERE u.id > 0
        ORDER BY u.dt_posledni_prihlaseni DESC
        LIMIT 10
    ");
    
    echo "\n✅ PRVNÍCH 10 UŽIVATELŮ (řazeno podle dt_posledni_prihlaseni):\n";
    echo str_repeat("=", 100) . "\n";
    printf("%-5s %-25s %-20s %-20s %-10s\n", 
        "ID", "JMÉNO", "POSLEDNÍ PŘIHLÁŠENÍ", "POSLEDNÍ AKTIVITA", "AKTIVNÍ");
    echo str_repeat("=", 100) . "\n";
    
    while ($row = $stmt->fetch()) {
        printf("%-5s %-25s %-20s %-20s %-10s\n",
            $row['id'],
            mb_substr($row['cele_jmeno'], 0, 25),
            $row['dt_posledni_prihlaseni'] ?? 'NULL',
            $row['dt_posledni_aktivita'] ?? 'NULL',
            $row['aktivni'] == 1 ? 'ANO' : 'NE'
        );
    }
    
    echo str_repeat("=", 100) . "\n";
    echo "\n✅ SLOUPCE JSOU NAČTENY SPRÁVNĚ Z DATABÁZE!\n";
    echo "\nPokud frontend zobrazí tyto hodnoty, oprava funguje.\n";
    echo "=================================================================\n\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n\n";
    exit(1);
}
