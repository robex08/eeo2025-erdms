<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Načti .env
$envFile = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// Načti API soubor pro token verify
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php';

echo "=== TEST LOGOVÁNÍ ZASTUPOVÁNÍ ===\n\n";

$host = $_ENV['DB_HOST'] ?? '10.3.172.11';
$dbname = $_ENV['DB_NAME'] ?? 'EEO-OSTRA-DEV';
$user = $_ENV['DB_USER'] ?? 'eeo_user';
$pass = $_ENV['DB_PASSWORD'] ?? '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "--- 1. Generování tokenu pro admina (ID=1) ---\n";
    // Připrav data pro simulaci tokenu
    $admin_user_id = 1;
    $admin_username = 'admin';
    
    // Simuluj login - vytvoř token (obvykle se generuje ve login endpointu)
    // Pro test budeme přímo volat handler s mock daty
    
    echo "Admin ID: 1, Username: admin\n";
    echo "Target objednávka: ID=1545 (user 100)\n\n";
    
    echo "--- 2. Zjišťování aktivního zastupování pro admina ---\n";
    $stmt = $pdo->query("
        SELECT z.id, z.zastupce_id, z.zastupovany_id, z.opravneni
        FROM 25_uzivatele_zastupovani z
        WHERE z.zastupce_id = 1
        AND z.aktivni = 1
        AND CURDATE() BETWEEN z.dt_od AND z.dt_do
        LIMIT 1
    ");
    $sub = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($sub) {
        echo "✅ Admin zastupuje:\n";
        echo "  - Zastupovany ID: " . $sub['zastupovany_id'] . "\n";
        echo "  - Oprávnění: " . $sub['opravneni'] . "\n";
    } else {
        echo "❌ Admin nemá aktivní zastupování!\n";
        exit;
    }
    
    echo "\n--- 3. Simulace volání API (check_and_log_substitution_action) ---\n";
    
    // Simulujeme token_data
    $token_data = [
        'id' => 1,
        'username' => 'admin',
        'is_admin' => true
    ];
    
    // Voláme helper funkci přímo
    // Nejdřív si ji musíme includnout
    require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php';
    
    echo "Volání check_and_log_substitution_action...\n";
    $was_substituting = check_and_log_substitution_action(
        $pdo, 
        $token_data, 
        'UPDATE', 
        'OBJEDNAVKA', 
        1545, 
        'Test úpravy objednávky v zastoupení'
    );
    
    if ($was_substituting) {
        echo "✅ Logování bylo provedeno (ACTION WAS IN SUBSTITUTION)\n";
    } else {
        echo "❌ Logování nebylo provedeno (NO SUBSTITUTION ACTIVE)\n";
    }
    
    echo "\n--- 4. Kontrola audit logu ---\n";
    $stmt = $pdo->query("
        SELECT id, zastupce_id, zastupovany_id, akce_typ, objekt_typ, objekt_id, popis_akce, dt_akce
        FROM 25_zastupovani_akce_log
        WHERE akce_typ = 'UPDATE' AND objekt_typ = 'OBJEDNAVKA' AND objekt_id = 1545
        ORDER BY dt_akce DESC
        LIMIT 3
    ");
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($logs) > 0) {
        echo "✅ Audit logs nalezeny: " . count($logs) . " záznamů\n";
        foreach ($logs as $log) {
            echo json_encode($log, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        }
    } else {
        echo "❌ Žádné audit logs v DB!\n";
    }
    
    echo "\n--- 5. Kontrola PHP error logu ---\n";
    $lastLines = array_slice(file('/var/www/erdms-dev/logs/php-error.log'), -20, 20);
    $substitutionLines = array_filter($lastLines, function($line) {
        return strpos($line, 'SUBSTITUTION') !== false || strpos($line, 'zastupov') !== false;
    });
    
    if (count($substitutionLines) > 0) {
        echo "Debug výpisy z logu:\n";
        foreach (array_slice($substitutionLines, -5) as $line) {
            echo trim($line) . "\n";
        }
    } else {
        echo "⚠️ Žádné debug výpisy v logu\n";
    }
    
    echo "\n=== ZÁVĚR ===\n";
    if (count($logs) > 0) {
        echo "✅ LOGOVÁNÍ ZASTUPOVÁNÍ FUNGUJE!\n";
    } else {
        echo "⚠️ Logování je připraveno, ale zatím nebylo spuštěno (v debug logu vidíš info)\n";
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
?>
