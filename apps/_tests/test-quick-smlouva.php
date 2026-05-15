<?php
/**
 * QUICK TEST: Ověření smlouva-expand endpointu
 * Testuje smlouvu S-253 (id=57) která MÁ objednávky
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';

$config = [
    'host' => '10.3.172.11',
    'database' => 'EEO-OSTRA-DEV',
    'username' => 'erdms_user',
    'password' => 'CHANGE_ME_DB_PASSWORD'
];

define('TBL_SMLOUVY', '25_smlouvy');
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_FAKTURY', '25a_objednavky_faktury');

$smlouva_id = 57; // S-253/75030926/2025

echo "=== QUICK TEST: smlouva-expand endpoint ===\n";
echo "Smlouva ID: $smlouva_id\n\n";

try {
    $db = get_db($config);
    
    // 1. Načti smlouvu
    $stmt_s = $db->prepare("SELECT id, cislo_smlouvy FROM " . TBL_SMLOUVY . " WHERE id = ? LIMIT 1");
    $stmt_s->execute([$smlouva_id]);
    $smlouva = $stmt_s->fetch(PDO::FETCH_ASSOC);
    $cislo_smlouvy = $smlouva['cislo_smlouvy'];
    
    echo "Smlouva: $cislo_smlouvy\n\n";
    
    // 2. Test SQL pro objednávky
    $sql = "
        SELECT o.id, o.cislo_objednavky, o.max_cena_s_dph
        FROM " . TBL_OBJEDNAVKY . " o
        WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
          AND o.aktivni = 1
          AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
        ORDER BY o.dt_vytvoreni DESC
        LIMIT 5
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute([$cislo_smlouvy]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✅ OBJEDNÁVKY: " . count($orders) . "\n";
    foreach ($orders as $o) {
        echo "   - {$o['cislo_objednavky']}: " . number_format($o['max_cena_s_dph'], 2, ',', ' ') . " Kč\n";
    }
    
    // 3. Test SQL pro přímé faktury
    echo "\n";
    $sql_direct = "
        SELECT f.id, f.fa_cislo_vema, f.fa_castka
        FROM " . TBL_FAKTURY . " f
        WHERE f.smlouva_id = ? AND f.objednavka_id IS NULL AND f.aktivni = 1
        ORDER BY f.fa_datum_vystaveni DESC
        LIMIT 5
    ";
    $stmt_direct = $db->prepare($sql_direct);
    $stmt_direct->execute([$smlouva_id]);
    $direct = $stmt_direct->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✅ PŘÍMÉ FAKTURY: " . count($direct) . "\n";
    foreach ($direct as $f) {
        echo "   - {$f['fa_cislo_vema']}: " . number_format($f['fa_castka'], 2, ',', ' ') . " Kč\n";
    }
    
    echo "\n";
    if (count($orders) > 0 && count($direct) > 0) {
        echo "🎯 VÝSLEDEK: Smlouva má OBOJE - objednávky I přímé faktury\n";
    } elseif (count($orders) > 0) {
        echo "🎯 VÝSLEDEK: Smlouva má pouze OBJEDNÁVKY\n";
    } elseif (count($direct) > 0) {
        echo "🎯 VÝSLEDEK: Smlouva má pouze PŘÍMÉ FAKTURY\n";
    } else {
        echo "⚠️ VÝSLEDEK: Smlouva nemá žádná data!\n";
    }
    
    echo "\n";
    echo "📋 ZÁVĚR:\n";
    echo "   Backend SQL funguje: " . (count($orders) > 0 ? "✅ ANO" : "❌ NE") . "\n";
    echo "   Frontend by měl zobrazit " . (count($orders) > 0 ? "DVĚ SEKCE" : "POUZE PŘÍMÉ FAKTURY") . "\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
}
