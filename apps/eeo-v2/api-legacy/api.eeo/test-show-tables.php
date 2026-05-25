<?php
/**
 * Zjistit názvy tabulek v dev DB
 */

// Načíst .env
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value));
    }
}

$host = getenv('DB_HOST');
$dbname = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');

echo "=== ZJIŠŤUJI NÁZVY TABULEK V $dbname ===\n\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Najít tabulky obsahující "objednavk" nebo "smlouv"
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "Tabulky obsahující 'objednavk':\n";
    foreach ($tables as $table) {
        if (stripos($table, 'objednavk') !== false) {
            echo "  - $table\n";
        }
    }
    
    echo "\nTabulky obsahující 'smlouv':\n";
    foreach ($tables as $table) {
        if (stripos($table, 'smlouv') !== false) {
            echo "  - $table\n";
        }
    }
    
    echo "\nTabulky obsahující 'faktur':\n";
    foreach ($tables as $table) {
        if (stripos($table, 'faktur') !== false) {
            echo "  - $table\n";
        }
    }
    
} catch (PDOException $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
