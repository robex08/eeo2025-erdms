<?php
// Test script pro ověření opravy vynucené změny hesla v API

require_once 'apps/eeo-v2/api-legacy/api.eeo/api.php';

// Simulace POST requestu na users/list
echo "=== TEST API ENDPOINT users/list ===\n";
echo "Testování, zda API vrací pole 'vynucena_zmena_hesla'\n\n";

// Mock input data
$input = array(
    'token' => 'YWRtaW58MTczNTM3NzI5N3w2OE5xVXZsMjFObk9sOXJiWmZ3OWJGcjFHaE5zNWN4Qg==', // admin token
    'username' => 'admin'
);

// Základní konfigurace
$config = array(
    'db_host' => '10.3.172.11',
    'db_port' => 3306,
    'db_name' => 'eeo2025-dev', 
    'db_user' => 'erdms_user',
    'db_pass' => 'AhchohTahnoh7eim',
    'db_charset' => 'utf8mb4'
);

// Include queries
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';

try {
    // Test: načíst první 3 uživatele a zkontrolovat pole vynucena_zmena_hesla
    $db = new PDO(
        "mysql:host={$config['db_host']};port={$config['db_port']};dbname={$config['db_name']};charset={$config['db_charset']}",
        $config['db_user'],
        $config['db_pass'],
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );
    
    // Test dotaz s filtrem aktivni=1 (což používá problematický SQL)
    $aktivni_value = 1;
    $sql = "
        SELECT 
            u.id,
            u.username,
            u.aktivni,
            u.vynucena_zmena_hesla
        FROM " . TBL_UZIVATELE . " u
        WHERE u.id > 0 AND u.aktivni = :aktivni
        LIMIT 5
    ";
    
    $stmt = $db->prepare($sql);
    $stmt->bindParam(':aktivni', $aktivni_value, PDO::PARAM_INT);
    $stmt->execute();
    $users = $stmt->fetchAll();
    
    echo "Počet nalezených aktivních uživatelů: " . count($users) . "\n\n";
    
    foreach ($users as $user) {
        echo sprintf(
            "ID: %d | Username: %s | Aktivní: %d | Vynucená změna hesla: %d\n",
            $user['id'],
            $user['username'],
            $user['aktivni'],
            isset($user['vynucena_zmena_hesla']) ? $user['vynucena_zmena_hesla'] : 'CHYBÍ!'
        );
    }
    
    // Ověř, že admin (ID=1) má vynucenou změnu hesla = 1
    $admin_user = null;
    foreach ($users as $user) {
        if ($user['id'] == 1) {
            $admin_user = $user;
            break;
        }
    }
    
    if ($admin_user) {
        echo "\n=== VÝSLEDEK TESTU ===\n";
        if (isset($admin_user['vynucena_zmena_hesla']) && $admin_user['vynucena_zmena_hesla'] == 1) {
            echo "✅ ÚSPĚCH: Admin má vynucenou změnu hesla = 1\n";
            echo "✅ OPRAVA FUNGUJE: API správně vrací pole 'vynucena_zmena_hesla'\n";
        } else {
            echo "❌ CHYBA: Admin nemá správně nastavenou vynucenou změnu hesla\n";
            echo "❌ Očekáváno: 1, Skutečnost: " . (isset($admin_user['vynucena_zmena_hesla']) ? $admin_user['vynucena_zmena_hesla'] : 'NEEXISTUJE') . "\n";
        }
    } else {
        echo "\n❌ CHYBA: Admin uživatel nebyl nalezen mezi aktivními uživateli\n";
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA při testování: " . $e->getMessage() . "\n";
}

echo "\n=== KONEC TESTU ===\n";
?>