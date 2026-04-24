<?php
// Test: Zkontrolovat strukturu tabulky termínů a foreign keys

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
    
    // Zkontroluj foreign keys na tabulce termínů
    echo "=== FOREIGN KEYS NA 25_plan_udalosti_terminy ===\n";
    $sql = "SELECT 
        kcu.CONSTRAINT_NAME, 
        kcu.TABLE_NAME, 
        kcu.COLUMN_NAME, 
        kcu.REFERENCED_TABLE_NAME, 
        kcu.REFERENCED_COLUMN_NAME,
        rc.UPDATE_RULE,
        rc.DELETE_RULE
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc 
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
        AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
    WHERE kcu.TABLE_SCHEMA = ? 
    AND kcu.TABLE_NAME = '25_plan_udalosti_terminy' 
    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$dbname]);
    $fks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($fks)) {
        echo "Žádné foreign keys nenalezeny.\n";
    } else {
        foreach ($fks as $fk) {
            echo "\nConstraint: {$fk['CONSTRAINT_NAME']}\n";
            echo "  {$fk['TABLE_NAME']}.{$fk['COLUMN_NAME']} -> {$fk['REFERENCED_TABLE_NAME']}.{$fk['REFERENCED_COLUMN_NAME']}\n";
            echo "  ON UPDATE: {$fk['UPDATE_RULE']}\n";
            echo "  ON DELETE: {$fk['DELETE_RULE']}\n";
        }
    }
    
    // Zkontroluj triggery na tabulce termínů
    echo "\n=== TRIGGERY NA 25_plan_udalosti_terminy ===\n";
    $sql = "SHOW TRIGGERS FROM `$dbname` WHERE `Table` = '25_plan_udalosti_terminy'";
    $stmt = $db->query($sql);
    $triggers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
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
    
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
}
