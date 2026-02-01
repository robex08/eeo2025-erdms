<?php
define('__ROOT__', dirname(__FILE__));
chdir('/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo');
require_once 'v2025.03_25/lib/config.php';

$db = get_db($config);

echo "=== SLOUPCE V 25_useky ===\n";
$stmt = $db->query('SHOW COLUMNS FROM 25_useky');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . " - " . $row['Type'] . "\n";
}

echo "\n=== SAMPLE DATA ===\n";
$stmt2 = $db->query('SELECT * FROM 25_useky LIMIT 2');
while ($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
    print_r($row);
}
