<?php
// Test načítání .env souboru

// Načti dbconfig.php (který načítá .env)
$config = require __DIR__ . '/v2025.03_25/lib/dbconfig.php';

echo "<h1>Test načítání .env souboru</h1>";

echo "<h2>Upload konfigurace:</h2>";
echo "<pre>";
print_r($config['upload']);
echo "</pre>";

echo "<h2>Environment variables:</h2>";
echo "<pre>";
echo "UPLOAD_ROOT_PATH (getenv): " . getenv('UPLOAD_ROOT_PATH') . "\n";
echo "UPLOAD_ROOT_PATH (\$_ENV): " . ($_ENV['UPLOAD_ROOT_PATH'] ?? 'NOT SET') . "\n";
echo "UPLOAD_ROOT_PATH (\$_SERVER): " . ($_SERVER['UPLOAD_ROOT_PATH'] ?? 'NOT SET') . "\n";
echo "</pre>";

echo "<h2>.env file check:</h2>";
echo "<pre>";
$env_file = __DIR__ . '/.env';
echo "Path: $env_file\n";
echo "Exists: " . (file_exists($env_file) ? 'YES' : 'NO') . "\n";
echo "Readable: " . (is_readable($env_file) ? 'YES' : 'NO') . "\n";
if (file_exists($env_file)) {
    echo "\nPerms: " . substr(sprintf('%o', fileperms($env_file)), -4) . "\n";
    echo "Owner: " . posix_getpwuid(fileowner($env_file))['name'] . "\n";
}
echo "\nCurrent user: " . get_current_user() . "\n";
echo "Process user: " . posix_getpwuid(posix_geteuid())['name'] . "\n";
echo "</pre>";

echo "<h2>.env file content (first 5 lines):</h2>";
echo "<pre>";
if (is_readable($env_file)) {
    $lines = array_slice(file($env_file, FILE_IGNORE_NEW_LINES), 0, 10);
    foreach ($lines as $i => $line) {
        echo ($i+1) . ": " . htmlspecialchars($line) . "\n";
    }
} else {
    echo "Cannot read .env file!\n";
}
echo "</pre>";

echo "<h2>Config check:</h2>";
echo "<pre>";
echo "root_path isset: " . (isset($config['upload']['root_path']) ? 'YES' : 'NO') . "\n";
echo "root_path empty: " . (empty($config['upload']['root_path']) ? 'YES' : 'NO') . "\n";
echo "root_path value: " . ($config['upload']['root_path'] ?? 'NOT SET') . "\n";
echo "</pre>";
