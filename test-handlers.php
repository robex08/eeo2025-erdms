<?php
/**
 * Test jednotlivých handler funkcí
 */

echo "🔍 HANDLER FUNCTIONS TEST\n";
echo "======================================================================\n\n";

// Nastavení prostředí
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/dev/api.eeo/user/login';

// Simulace bez výstupu HTML
ob_start();

try {
    // Načti pouze potřebné části
    define('IS_DEV_ENV', true);
    define('ENV_NAME', 'DEV');
    define('VERSION', 'v2025.03_25');

    // Konstanty tabulek
    define('TBL_UZIVATELE', '25_uzivatele');
    define('TBL_TOKENS', '25_tokens');
    
    // DB config
    $_config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/' . VERSION . '/lib/dbconfig.php';
    $config = $_config['mysql'];
    
    // Queries
    require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/' . VERSION . '/lib/queries.php';
    
    echo "✅ Config a queries načteny\n";
    echo "📊 DB: " . $config['database'] . " na " . $config['host'] . "\n";
    
    // Test konkrétního query
    if (isset($queries['uzivatele_login'])) {
        echo "✅ Query 'uzivatele_login' exists\n";
        echo "📄 SQL: " . $queries['uzivatele_login'] . "\n\n";
    } else {
        echo "❌ Query 'uzivatele_login' NOT found\n";
        echo "📊 Available queries: " . implode(', ', array_keys($queries)) . "\n\n";
    }
    
    // Test DB připojení v get_db funkci
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/' . VERSION . '/lib/handlers.php';
    
    echo "🔗 Testing get_db() function...\n";
    $db = get_db($config);
    
    if ($db) {
        echo "✅ get_db() OK\n";
        
        // Test na uživatele tabulku
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM `25_uzivatele` WHERE aktivni = 1");
        $stmt->execute();
        $result = $stmt->fetch();
        echo "📊 Active users count: " . $result['count'] . "\n\n";
        
        // Test handle_login function s prázdnými daty
        echo "🎯 Testing handle_login with empty data...\n";
        $empty_input = [];
        
        ob_start(); // Zachytíme výstup funkce
        handle_login($empty_input, $config, $queries);
        $login_output = ob_get_clean();
        
        echo "📤 handle_login output: " . $login_output . "\n";
        
        $login_result = json_decode($login_output, true);
        if ($login_result && isset($login_result['err'])) {
            echo "✅ handle_login works correctly - returned error for empty data\n";
        } else {
            echo "❌ handle_login unexpected output\n";
        }
        
    } else {
        echo "❌ get_db() FAILED\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

ob_end_clean();

echo "\n======================================================================\n";
echo "🎯 HANDLER TEST COMPLETED\n";
?>