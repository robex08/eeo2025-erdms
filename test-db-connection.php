<?php
/**
 * Test databázového připojení a .env načítání
 */

echo "🔍 DB CONNECTION & ENV TEST\n";
echo "======================================================================\n\n";

// Simuluj dev environment
$_SERVER['REQUEST_URI'] = '/dev/api.eeo/test';
define('IS_DEV_ENV', strpos($_SERVER['REQUEST_URI'], '/dev/api.eeo') !== false);
define('ENV_NAME', IS_DEV_ENV ? 'DEV' : 'PROD');
define('VERSION', 'v2025.03_25');

echo "✅ Environment: " . (IS_DEV_ENV ? 'DEV' : 'PROD') . " (REQUEST_URI: {$_SERVER['REQUEST_URI']})\n";

// Test .env načítání
$env_file = __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/.env';
echo "📁 .env file exists: " . (file_exists($env_file) ? 'YES' : 'NO') . " ($env_file)\n";

if (file_exists($env_file)) {
    echo "📄 .env content preview:\n";
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach (array_slice($lines, 0, 5) as $line) {
        echo "   " . $line . "\n";
    }
}

// Načti DB config
try {
    $_config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/' . VERSION . '/lib/dbconfig.php';
    $config = $_config['mysql'];
    
    echo "\n📊 DB CONFIG:\n";
    echo "   Host: " . $config['host'] . "\n";
    echo "   Database: " . $config['database'] . "\n";
    echo "   User: " . $config['username'] . "\n";
    echo "   Password: " . (strlen($config['password']) > 0 ? str_repeat('*', strlen($config['password'])) : 'EMPTY') . "\n";
    
    // Test připojení  
    $dsn = "mysql:host={$config['host']};port=3306;dbname={$config['database']};charset=utf8mb4";
    
    echo "\n🔗 Testing DB connection...\n";
    echo "   DSN: " . str_replace($config['password'], '****', $dsn) . "\n";
    
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]);
    
    echo "✅ Database connection OK\n";
    
    // Test SELECT
    $stmt = $pdo->query("SELECT DATABASE() as current_db, VERSION() as mysql_version");
    $result = $stmt->fetch();
    
    echo "   Current DB: " . $result['current_db'] . "\n";
    echo "   MySQL Version: " . $result['mysql_version'] . "\n";
    
    // Test tabulky
    $stmt = $pdo->query("SHOW TABLES LIKE '25_%' LIMIT 5");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "   Sample tables (" . count($tables) . "): " . implode(', ', $tables) . "\n";
    
} catch (Exception $e) {
    echo "❌ Database connection FAILED: " . $e->getMessage() . "\n";
    echo "   Error Code: " . $e->getCode() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n======================================================================\n";
echo "🎯 DB & ENV TEST COMPLETED\n";
?>