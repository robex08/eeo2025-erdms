<?php
/**
 * TEST SCRIPT: Systém zastupování
 * Testuje základní funkcionalitu helper funkcí pro zastupování
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Načtení API konstant
require_once __DIR__ . '/api-legacy/api.eeo/api.php';

// Načtení konfigurace
$config = require __DIR__ . '/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once __DIR__ . '/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';
require_once __DIR__ . '/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php';

echo "=============================================================================\n";
echo "TEST SYSTÉMU ZASTUPOVÁNÍ\n";
echo "=============================================================================\n\n";

try {
    // Získání DB připojení
    $db = get_db($config);
    if (!$db) {
        throw new Exception("❌ Chyba připojení k databázi!");
    }
    echo "✅ Připojení k databázi: OK\n\n";

    // TEST 1: Kontrola APP SETTING
    echo "--- TEST 1: Kontrola APP SETTING ---\n";
    $stmt = $db->prepare("SELECT klic, hodnota FROM `25a_nastaveni_globalni` WHERE klic = 'substitution_enabled'");
    $stmt->execute();
    $setting = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($setting) {
        echo "✅ APP SETTING existuje\n";
        echo "   Klíč: {$setting['klic']}\n";
        echo "   Hodnota: {$setting['hodnota']} " . ($setting['hodnota'] == '1' ? '(ZAPNUTO)' : '(VYPNUTO)') . "\n\n";
    } else {
        echo "❌ APP SETTING neexistuje!\n\n";
    }

    // TEST 2: isSubstitutionEnabled()
    echo "--- TEST 2: isSubstitutionEnabled() ---\n";
    $is_enabled = isSubstitutionEnabled($db);
    echo ($is_enabled ? "✅ Systém je ZAPNUTÝ" : "✅ Systém je VYPNUTÝ") . "\n\n";

    // TEST 3: get_user_ids_with_substitution() s vypnutým systémem
    echo "--- TEST 3: get_user_ids_with_substitution() - systém VYPNUTÝ ---\n";
    $test_user_id = 1; // Testovací uživatel
    $user_ids = get_user_ids_with_substitution($db, $test_user_id, ['view']);
    echo "Testovací user_id: $test_user_id\n";
    echo "Vrácené user_ids: " . implode(', ', $user_ids) . "\n";
    
    if (count($user_ids) === 1 && $user_ids[0] == $test_user_id) {
        echo "✅ Správně vrací pouze vlastní user_id (systém vypnutý)\n\n";
    } else {
        echo "❌ CHYBA: Mělo vrátit pouze [$test_user_id], vrátilo: " . json_encode($user_ids) . "\n\n";
    }

    // TEST 4: Kontrola aktivních zastupování v DB
    echo "--- TEST 4: Aktivní zastupování v databázi ---\n";
    $stmt = $db->prepare("
        SELECT 
            id,
            zastupce_id,
            zastupovany_id,
            dt_od,
            dt_do,
            opravneni,
            aktivni
        FROM `25_uzivatele_zastupovani`
        WHERE aktivni = 1 
        AND CURDATE() BETWEEN dt_od AND dt_do
        LIMIT 5
    ");
    $stmt->execute();
    $active_substitutions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($active_substitutions) > 0) {
        echo "Nalezeno " . count($active_substitutions) . " aktivních zastupování:\n";
        foreach ($active_substitutions as $sub) {
            $permissions = json_decode($sub['opravneni'], true);
            echo "  - ID {$sub['id']}: User {$sub['zastupce_id']} zastupuje {$sub['zastupovany_id']}\n";
            echo "    Platnost: {$sub['dt_od']} až {$sub['dt_do']}\n";
            echo "    Oprávnění: " . implode(', ', array_keys(array_filter($permissions))) . "\n";
        }
    } else {
        echo "ℹ️  Žádná aktivní zastupování v databázi\n";
    }
    echo "\n";

    // TEST 5: Simulace zapnutého systému (pokud jsou nějaká zastupování)
    if (count($active_substitutions) > 0 && !$is_enabled) {
        echo "--- TEST 5: Simulace ZAPNUTÉHO systému ---\n";
        echo "ℹ️  Pro test zapněte systém pomocí:\n";
        echo "   UPDATE `25a_nastaveni_globalni` SET hodnota = '1' WHERE klic = 'substitution_enabled';\n";
        echo "   Pak znovu spusťte tento test.\n\n";
    } elseif (count($active_substitutions) > 0 && $is_enabled) {
        echo "--- TEST 5: Test se ZAPNUTÝM systémem ---\n";
        $test_zastupce_id = $active_substitutions[0]['zastupce_id'];
        $user_ids = get_user_ids_with_substitution($db, $test_zastupce_id, ['view']);
        
        echo "Testovací zastupce ID: $test_zastupce_id\n";
        echo "Vrácené user_ids: " . implode(', ', $user_ids) . "\n";
        
        if (count($user_ids) > 1) {
            echo "✅ Správně vrací rozšířený seznam (vlastní ID + zastupovaní)\n\n";
        } else {
            echo "⚠️  Vrátil pouze vlastní ID - pravděpodobně nejsou 'view' oprávnění\n\n";
        }
    }

    echo "=============================================================================\n";
    echo "HOTOVO!\n";
    echo "=============================================================================\n";

} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
