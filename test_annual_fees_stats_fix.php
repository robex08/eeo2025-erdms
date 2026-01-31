<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Test annual fees stats query
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php';  // konstanty tabulek
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesQueries.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';

try {
    echo "🔌 Připojuji k databázi...\n";
    $db = get_db();
    if (!$db) {
        throw new Exception('Chyba připojení k databázi');
    }
    
    setMysqlTimezone($db);
    echo "✅ Připojení OK\n";
    
    echo "📊 Testuji queryAnnualFeesStats...\n";
    $stats = queryAnnualFeesStats($db, 2024);
    
    echo "✅ SQL query úspěšný!\n";
    echo "📈 Statistiky:\n";
    echo "- Celkem poplatků: " . ($stats['celkem_poplatku'] ?? 'N/A') . "\n";
    echo "- Dashboard aktuální měsíc: " . ($stats['dashboard']['currentMonth'] ?? 'N/A') . "\n";
    echo "- Dashboard po splatnosti: " . ($stats['dashboard']['overdue'] ?? 'N/A') . "\n";
    
    echo "\n🔍 Kompletní dashboard data:\n";
    print_r($stats['dashboard']);
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "📍 File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    echo "🔍 Trace:\n" . $e->getTraceAsString() . "\n";
}
?>