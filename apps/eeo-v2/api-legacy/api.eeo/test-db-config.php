<?php
header('Content-Type: text/plain');
echo "=== ENV TEST ===\n";
echo "DB_NAME from getenv: " . (getenv('DB_NAME') ?: 'NOT SET') . "\n";
echo "DB_NAME from \$_ENV: " . ($_ENV['DB_NAME'] ?? 'NOT SET') . "\n";
echo "\n=== DBCONFIG TEST ===\n";
$config = include 'v2025.03_25/lib/dbconfig.php';
echo "Database from config: " . $config['mysql']['database'] . "\n";
echo "\n=== .ENV FILE ===\n";
echo file_exists('.env') ? "EXISTS\n" : "NOT FOUND\n";
if (file_exists('.env')) {
    $content = file_get_contents('.env');
    $lines = explode("\n", $content);
    foreach ($lines as $line) {
        if (strpos($line, 'DB_NAME') !== false) {
            echo $line . "\n";
        }
    }
}
