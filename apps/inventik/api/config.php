<?php
/**
 * Inventik API - Configuration
 * 
 * Load environment variables from .env file
 * IMPORTANT: .env values take precedence over global environment variables
 */

// Load .env file and store values
$envConfig = [];
if (file_exists(__DIR__ . '/.env')) {
    $envLines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($envLines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue; // Skip empty lines and comments
        }
        
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $envConfig[trim($key)] = trim($value);
        }
    }
}

// Helper function to get config value (.env file takes precedence)
function getConfig($key, $default = '') {
    global $envConfig;
    return $envConfig[$key] ?? $default;
}

// Database configuration (from .env file, NOT from global environment)
define('DB_HOST', getConfig('DB_HOST', '10.3.172.11'));
define('DB_PORT', getConfig('DB_PORT', '3306'));
define('DB_NAME', getConfig('DB_NAME', 'inventik-dev'));
define('DB_USER', getConfig('DB_USER', 'inventik'));
define('DB_PASSWORD', getConfig('DB_PASSWORD', ''));
define('DB_CHARSET', getConfig('DB_CHARSET', 'utf8mb4'));

// Application configuration
define('APP_ENV', getConfig('APP_ENV', 'development'));
define('APP_DEBUG', getConfig('APP_DEBUG') === 'true');
define('APP_VERSION', '1.0.0');

// Timezone
date_default_timezone_set('Europe/Prague');
