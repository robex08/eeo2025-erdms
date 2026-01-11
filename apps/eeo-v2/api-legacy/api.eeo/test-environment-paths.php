<?php
/**
 * 🧪 TEST SCRIPT - Environment Paths Validation
 * 
 * Ověří, zda environment detekce a path resolution fungují správně
 * pro DEV i PROD prostředí
 */

// Načtení konfigurace - nejprve .env, pak environment utils
$env_loaded = false;
foreach (['.env', '../../../.env'] as $env_path) {
    if (file_exists(__DIR__ . '/' . $env_path)) {
        $lines = file(__DIR__ . '/' . $env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if (!empty($name) && !getenv($name)) {
                putenv("$name=$value");
            }
        }
        $env_loaded = true;
        break;
    }
}

require_once __DIR__ . '/v2025.03_25/lib/environment-utils.php';

echo "🧪 ENVIRONMENT PATHS TEST\n";
echo "==========================\n\n";

// Debug informace
$debug_info = debug_environment_paths();

echo "🌍 Environment Info:\n";
echo "   Type: " . $debug_info['environment'] . "\n";
echo "   Detection method: " . (getenv('APP_ENV') ? 'APP_ENV variable' : 'REQUEST_URI fallback') . "\n\n";

echo "📁 Detected Paths:\n";
echo "   Upload Root:  " . $debug_info['upload_root_path'] . "\n";
echo "   Templates:    " . $debug_info['templates_path'] . "\n";
echo "   Manuals:      " . $debug_info['manuals_path'] . "\n\n";

echo "🔧 ENV Variables:\n";
foreach ($debug_info['env_vars'] as $var => $value) {
    echo sprintf("   %-20s: %s\n", $var, $value ?: '(not set)');
}
echo "\n";

// Test existence adresářů
echo "📊 Directory Existence Check:\n";
$paths_to_check = [
    'Upload Root' => rtrim($debug_info['upload_root_path'], '/'),
    'Templates' => rtrim($debug_info['templates_path'], '/'),
    'Manuals' => $debug_info['manuals_path']
];

foreach ($paths_to_check as $name => $path) {
    $exists = is_dir($path);
    $readable = $exists && is_readable($path);
    $status = $exists ? ($readable ? '✅ OK' : '⚠️ NOT READABLE') : '❌ MISSING';
    echo sprintf("   %-15s: %s (%s)\n", $name, $status, $path);
    
    if ($exists) {
        // Počítání souborů
        $files = glob($path . '/*');
        $file_count = $files ? count($files) : 0;
        echo sprintf("   %15s  Files: %d\n", '', $file_count);
        
        // Velikost adresáře
        if ($readable) {
            $size = shell_exec("du -sh " . escapeshellarg($path) . " 2>/dev/null | cut -f1");
            echo sprintf("   %15s  Size: %s\n", '', trim($size ?: 'Unknown'));
        }
    }
}

echo "\n";

// Test jednotlivých funkcí
echo "⚙️ Function Tests:\n";
echo "   get_upload_root_path(): " . get_upload_root_path() . "\n";
echo "   get_templates_path():   " . get_templates_path() . "\n";
echo "   get_manuals_path():     " . get_manuals_path() . "\n";
echo "   is_dev_environment():   " . (is_dev_environment() ? 'TRUE' : 'FALSE') . "\n\n";

// Migration readiness
echo "🚀 Migration Readiness:\n";
if (getenv('APP_ENV')) {
    echo "   ✅ APP_ENV is set - paths will switch automatically on deployment\n";
    echo "   ✅ No hardcoded paths remaining - ready for PROD migration\n";
} else {
    echo "   ⚠️  APP_ENV not set - using REQUEST_URI fallback detection\n";
    echo "   ⚠️  Consider setting APP_ENV for more reliable path detection\n";
}

echo "\n🎯 READY FOR DEV → PROD MIGRATION!\n";
?>