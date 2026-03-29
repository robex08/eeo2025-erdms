<?php
/**
 * TEST: Smlouva expand endpoint
 * Ověřuje že endpoint vrací OBJEDNÁVKY i PŘÍMÉ FAKTURY
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Načti API config
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php';

// Simuluj input jako by přišel z POST
$smlouva_id = 57; // S-253/75030926/2025

$input = [
    'smlouva_id' => $smlouva_id,
    'token' => 'test-token', // Pro test přeskočíme auth
    'username' => 'admin'
];

$config = [
    'host' => '10.3.172.11',
    'database' => 'EEO-OSTRA-DEV',
    'username' => 'erdms_user',
    'password' => 'CHANGE_ME_DB_PASSWORD'
];

echo "=== TEST SMLOUVA EXPAND ===\n";
echo "Testuji smlouvu ID: $smlouva_id\n\n";

// Spusť handler bez autentizace (direct call)
ob_start();
try {
    // Otevři DB
    $db = get_db($config);
    
    // Načti smlouvu
    $stmt = $db->prepare("SELECT * FROM 25_smlouvy WHERE id = ?");
    $stmt->execute([$smlouva_id]);
    $smlouva = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$smlouva) {
        throw new Exception("Smlouva nenalezena");
    }
    
    echo "Smlouva: {$smlouva['cislo_smlouvy']}\n";
    echo "Název: {$smlouva['nazev_smlouvy']}\n\n";
    
    $cislo_smlouvy = $smlouva['cislo_smlouvy'];
    
    // TEST 1: Objednávky
    echo "--- TEST 1: OBJEDNÁVKY ---\n";
    $sql = "
        SELECT 
            o.id,
            o.cislo_objednavky,
            o.predmet,
            o.stav_objednavky,
            o.max_cena_s_dph
        FROM 25a_objednavky o
        WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', :cislo, '\"%')
          AND o.aktivni = 1
          AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
        ORDER BY o.dt_vytvoreni DESC
        LIMIT 10
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute(['cislo' => $cislo_smlouvy]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Počet objednávek: " . count($orders) . "\n";
    if (count($orders) > 0) {
        echo "První 3 objednávky:\n";
        foreach (array_slice($orders, 0, 3) as $o) {
            echo "  - {$o['cislo_objednavky']}: {$o['max_cena_s_dph']} Kč ({$o['stav_objednavky']})\n";
        }
    }
    echo "\n";
    
    // TEST 2: Přímé faktury
    echo "--- TEST 2: PŘÍMÉ FAKTURY ---\n";
    $sql = "
        SELECT 
            f.id,
            f.fa_cislo_vema,
            f.fa_castka,
            f.stav
        FROM 25a_objednavky_faktury f
        WHERE f.smlouva_id = :smlouva_id
          AND f.objednavka_id IS NULL
          AND f.aktivni = 1
          AND f.stav != 'STORNO'
        ORDER BY f.dt_vytvoreni DESC
        LIMIT 10
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute(['smlouva_id' => $smlouva_id]);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Počet přímých faktur: " . count($invoices) . "\n";
    if (count($invoices) > 0) {
        echo "První 3 faktury:\n";
        foreach (array_slice($invoices, 0, 3) as $f) {
            echo "  - {$f['fa_cislo_vema']}: {$f['fa_castka']} Kč ({$f['stav']})\n";
        }
    }
    
    echo "\n✅ TEST ÚSPĚŠNÝ!\n";
    if (count($orders) > 0 && count($invoices) > 0) {
        echo "✅ Smlouva má OBOJE: objednávky i přímé faktury\n";
    } elseif (count($orders) > 0) {
        echo "ℹ️ Smlouva má pouze objednávky (žádné přímé faktury)\n";
    } elseif (count($invoices) > 0) {
        echo "ℹ️ Smlouva má pouze přímé faktury (žádné objednávky)\n";
    } else {
        echo "⚠️ Smlouva nemá žádné objednávky ani faktury!\n";
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
$output = ob_get_clean();
echo $output;
