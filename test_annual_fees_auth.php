<?php
/**
 * Test annual fees endpointů - kontrola autentizace a dat
 */

// Přímé připojení k DEV databázi
$dbHost = '10.3.172.11';
$dbName = 'EEO-OSTRA-DEV';
$dbUser = 'erdms_user';
$dbPass = 'AhchohTahnoh7eim';

try {
    // Připojení k databázi
    $db = new PDO(
        "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        )
    );

    echo "✅ Připojení k DB OK\n\n";

    // Test 1: Zkontroluj, jestli existuje tabulka 25_ciselnik_stavy
    $stmt = $db->query("SHOW TABLES LIKE '25_ciselnik_stavy'");
    if ($stmt->rowCount() > 0) {
        echo "✅ Tabulka 25_ciselnik_stavy existuje\n\n";
    } else {
        echo "❌ Tabulka 25_ciselnik_stavy NEEXISTUJE!\n";
        exit(1);
    }

    // Test 2: Zkontroluj data pro roční poplatky
    echo "📊 Data pro roční poplatky:\n";
    echo "─────────────────────────────────────\n";

    $types = [
        'DRUH_ROCNIHO_POPLATKU',
        'PLATBA_ROCNIHO_POPLATKU',
        'ROCNI_POPLATEK'
    ];

    foreach ($types as $type) {
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM 25_ciselnik_stavy WHERE typ_objektu = ?");
        $stmt->execute([$type]);
        $result = $stmt->fetch();
        echo "{$type}: {$result['count']} záznamů\n";

        if ($result['count'] > 0) {
            $stmt = $db->prepare("SELECT kod_stavu, nazev_stavu, aktivni FROM 25_ciselnik_stavy WHERE typ_objektu = ? LIMIT 3");
            $stmt->execute([$type]);
            while ($row = $stmt->fetch()) {
                $aktivni = $row['aktivni'] ? '✓' : '✗';
                echo "  - [{$aktivni}] {$row['kod_stavu']}: {$row['nazev_stavu']}\n";
            }
        }
        echo "\n";
    }

    // Test 3: Simuluj request na endpoint
    echo "🔐 Test autentizace:\n";
    echo "─────────────────────────────────────\n";

    // Načti verify_token funkci
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';

    // Simuluj test token (musíš doplnit real token z browseru)
    $test_token = 'PLACEHOLDER_TOKEN'; // ← DOPLŇ REAL TOKEN!
    $test_username = 'admin';

    if ($test_token === 'PLACEHOLDER_TOKEN') {
        echo "⚠️  Pro otestování autentizace doplň platný token do souboru\n";
        echo "   Najdeš ho v DevTools → Application → Local Storage → token\n";
    } else {
        $token_data = verify_token($test_token);
        if ($token_data) {
            echo "✅ Token je platný pro uživatele: {$token_data['username']}\n";
        } else {
            echo "❌ Token je neplatný nebo vypršel\n";
        }
    }

} catch (PDOException $e) {
    echo "❌ Chyba DB: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Test dokončen\n";
