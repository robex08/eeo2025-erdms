<?php
// Test: Zkontrolovat triggery na tabulce 25_plan_udalosti

// Načti DB credentials z .env
$envFile = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env';
$envVars = [];
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $value = trim($parts[1], " \t\n\r\0\x0B\"'");
            $envVars[$key] = $value;
        }
    }
}

$host = $envVars['DB_HOST'] ?? 'localhost';
$dbname = $envVars['DB_NAME'] ?? 'EEO-OSTRA-DEV';
$user = $envVars['DB_USER'] ?? 'eeo_api';
$pass = $envVars['DB_PASSWORD'] ?? '';

try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $db = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Zkontroluj triggery
    $sql = "SHOW TRIGGERS FROM `$dbname` WHERE `Table` = '25_plan_udalosti'";
    $stmt = $db->query($sql);
    $triggers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "=== TRIGGERY NA 25_plan_udalosti ===\n";
    if (empty($triggers)) {
        echo "Žádné triggery nenalezeny.\n";
    } else {
        foreach ($triggers as $trigger) {
            echo "\nTrigger: " . $trigger['Trigger'] . "\n";
            echo "Event: " . $trigger['Event'] . "\n";
            echo "Timing: " . $trigger['Timing'] . "\n";
            echo "Statement: " . $trigger['Statement'] . "\n";
            echo str_repeat('-', 80) . "\n";
        }
    }
    
    // Zkontroluj strukturu tabulky
    echo "\n=== STRUKTURA TABULKY 25_plan_udalosti ===\n";
    $sql = "DESCRIBE `25_plan_udalosti`";
    $stmt = $db->query($sql);
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $col) {
        if ($col['Field'] === 'dt_od' || $col['Field'] === 'dt_do') {
            echo "Sloupec: {$col['Field']}, Type: {$col['Type']}, Null: {$col['Null']}, Default: {$col['Default']}\n";
        }
    }
    
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
