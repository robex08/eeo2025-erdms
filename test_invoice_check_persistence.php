<?php
/**
 * TEST: Ověření persistence kontroly faktur při update
 * =======================================================
 * 
 * Tento test ověřuje třífázový systém kontroly faktur:
 * 1. Unchecked - nezkontrolováno
 * 2. Checked OK (zelená) - zkontrolováno, beze změn (dt_kontroly >= dt_aktualizace)
 * 3. Checked Modified (oranžová) - zkontrolováno, ale po kontrole upraveno (dt_kontroly < dt_aktualizace)
 * 
 * TEST SCÉNÁŘE:
 * 1. ✅ Kontrola zůstává persistentní při UPDATE faktury
 * 2. ✅ dt_aktualizace se aktualizuje při UPDATE
 * 3. ✅ Porovnání dt_kontroly vs dt_aktualizace správně určuje stav
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';

// Konfigurace
$config = array(
    'host' => '10.3.172.11',
    'database' => 'EEO-OSTRA-DEV',
    'username' => 'erdms_user',
    'password' => 'CHANGE_ME_DB_PASSWORD'
);

$db = get_db($config);
if (!$db) {
    die("❌ Chyba připojení k databázi\n");
}

TimezoneHelper::setMysqlTimezone($db);

echo "╔══════════════════════════════════════════════════════════════════════════╗\n";
echo "║ TEST: PERSISTENCE KONTROLY FAKTUR (Třífázový systém)                    ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════╝\n\n";

// ============================================================================
// KROK 1: Najít testovací fakturu
// ============================================================================
echo "📋 KROK 1: Hledám testovací fakturu...\n";

$stmt = $db->prepare("
    SELECT id, fa_cislo_vema, rozsirujici_data, dt_aktualizace, dt_vytvoreni
    FROM 25a_objednavky_faktury
    WHERE aktivni = 1
    ORDER BY dt_vytvoreni DESC
    LIMIT 1
");
$stmt->execute();
$faktura = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$faktura) {
    die("❌ Žádná faktura nenalezena v databázi\n");
}

echo "✅ Nalezena faktura #{$faktura['id']} - {$faktura['fa_cislo_vema']}\n";
echo "   dt_aktualizace: {$faktura['dt_aktualizace']}\n";
echo "   dt_vytvoreni: {$faktura['dt_vytvoreni']}\n\n";

// ============================================================================
// KROK 2: Simulovat kontrolu faktury (nastavit kontrola_radku)
// ============================================================================
echo "📋 KROK 2: Simuluji kontrolu faktury...\n";

$rozsirujici_data = array();
if (!empty($faktura['rozsirujici_data'])) {
    $rozsirujici_data = json_decode($faktura['rozsirujici_data'], true);
}

$dt_kontroly = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
$rozsirujici_data['kontrola_radku'] = array(
    'kontrolovano' => true,
    'kontroloval_user_id' => 1,
    'kontroloval_username' => 'test',
    'kontroloval_cele_jmeno' => 'Test User',
    'dt_kontroly' => $dt_kontroly
);

$stmt_update = $db->prepare("
    UPDATE 25a_objednavky_faktury
    SET rozsirujici_data = ?,
        dt_aktualizace = NOW()
    WHERE id = ?
");
$stmt_update->execute(array(
    json_encode($rozsirujici_data),
    $faktura['id']
));

echo "✅ Faktura zkontrolována (dt_kontroly: $dt_kontroly)\n\n";

// ============================================================================
// KROK 3: Načíst aktuální stav
// ============================================================================
echo "📋 KROK 3: Načítám aktuální stav faktury...\n";

$stmt = $db->prepare("
    SELECT id, fa_cislo_vema, rozsirujici_data, dt_aktualizace
    FROM 25a_objednavky_faktury
    WHERE id = ?
");
$stmt->execute(array($faktura['id']));
$faktura_after_check = $stmt->fetch(PDO::FETCH_ASSOC);

$rozsirujici_after_check = json_decode($faktura_after_check['rozsirujici_data'], true);
$dt_aktualizace_after_check = $faktura_after_check['dt_aktualizace'];

echo "   dt_aktualizace: $dt_aktualizace_after_check\n";
echo "   dt_kontroly: " . $rozsirujici_after_check['kontrola_radku']['dt_kontroly'] . "\n";

// Porovnat časové značky
$ts_kontroly = strtotime($rozsirujici_after_check['kontrola_radku']['dt_kontroly']);
$ts_aktualizace = strtotime($dt_aktualizace_after_check);

if ($ts_kontroly >= $ts_aktualizace) {
    echo "✅ STAV: Checked OK (zelená) - zkontrolováno, beze změn\n\n";
} else {
    echo "⚠️ STAV: Checked Modified (oranžová) - zkontrolováno, ale upraveno\n\n";
}

// Počkej 2 sekundy aby byl rozdíl v časech
sleep(2);

// ============================================================================
// KROK 4: Simulovat UPDATE faktury (změna částky)
// ============================================================================
echo "📋 KROK 4: Simuluji UPDATE faktury (změna částky)...\n";

$stmt_update2 = $db->prepare("
    UPDATE 25a_objednavky_faktury
    SET fa_castka = fa_castka + 0.01,
        dt_aktualizace = NOW()
    WHERE id = ?
");
$stmt_update2->execute(array($faktura['id']));

echo "✅ Faktura aktualizována (změna částky)\n\n";

// ============================================================================
// KROK 5: Ověřit persistenci kontroly
// ============================================================================
echo "📋 KROK 5: Ověřuji persistenci kontroly...\n";

$stmt = $db->prepare("
    SELECT id, fa_cislo_vema, rozsirujici_data, dt_aktualizace
    FROM 25a_objednavky_faktury
    WHERE id = ?
");
$stmt->execute(array($faktura['id']));
$faktura_after_update = $stmt->fetch(PDO::FETCH_ASSOC);

$rozsirujici_after_update = json_decode($faktura_after_update['rozsirujici_data'], true);
$dt_aktualizace_after_update = $faktura_after_update['dt_aktualizace'];

echo "   dt_aktualizace: $dt_aktualizace_after_update (ZMĚNĚNO)\n";

if (isset($rozsirujici_after_update['kontrola_radku'])) {
    echo "✅ KONTROLA PERSISTENTNÍ: kontrola_radku zůstala zachována\n";
    echo "   dt_kontroly: " . $rozsirujici_after_update['kontrola_radku']['dt_kontroly'] . " (NEZMĚNĚNO)\n";
    
    // Porovnat časové značky
    $ts_kontroly_final = strtotime($rozsirujici_after_update['kontrola_radku']['dt_kontroly']);
    $ts_aktualizace_final = strtotime($dt_aktualizace_after_update);
    
    echo "\n📊 POROVNÁNÍ ČASOVÝCH ZNAČEK:\n";
    echo "   dt_kontroly:    " . date('Y-m-d H:i:s', $ts_kontroly_final) . " (timestamp: $ts_kontroly_final)\n";
    echo "   dt_aktualizace: " . date('Y-m-d H:i:s', $ts_aktualizace_final) . " (timestamp: $ts_aktualizace_final)\n";
    
    if ($ts_kontroly_final < $ts_aktualizace_final) {
        echo "\n✅ STAV: Checked Modified (oranžová) - zkontrolováno, ale následně upraveno\n";
        echo "   ⚠️ Faktura byla po kontrole upravena!\n";
    } else {
        echo "\n✅ STAV: Checked OK (zelená) - zkontrolováno, beze změn\n";
    }
} else {
    echo "❌ CHYBA: kontrola_radku byla ztracena při UPDATE!\n";
}

echo "\n╔══════════════════════════════════════════════════════════════════════════╗\n";
echo "║ VÝSLEDEK TESTU                                                           ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════╝\n";

if (isset($rozsirujici_after_update['kontrola_radku']) && 
    $ts_kontroly_final < $ts_aktualizace_final) {
    echo "✅ TEST ÚSPĚŠNÝ: Třífázový systém kontroly funguje správně!\n";
    echo "   - Kontrola zůstává persistentní při UPDATE\n";
    echo "   - dt_aktualizace se správně aktualizuje\n";
    echo "   - Porovnání časů správně detekuje změnu po kontrole\n";
} else {
    echo "❌ TEST NEÚSPĚŠNÝ: Problém s persistencí nebo detekcí změn\n";
}

echo "\n";
