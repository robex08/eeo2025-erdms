<?php
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';

// Simulace dat z databáze
$test_cases = [
    [
        'name' => 'Zkontrolováno, bez úpravy',
        'dt_kontroly' => '2026-02-04 15:20:00',
        'dt_aktualizace' => '2026-02-04 15:20:00',
        'expected' => 'checked_ok'
    ],
    [
        'name' => 'Zkontrolováno, pak upraveno',
        'dt_kontroly' => '2026-02-04 15:00:00',
        'dt_aktualizace' => '2026-02-04 15:30:00',  // Novější než kontrola
        'expected' => 'checked_modified'
    ],
    [
        'name' => 'Upraveno, pak zkontrolováno',
        'dt_kontroly' => '2026-02-04 15:30:00',
        'dt_aktualizace' => '2026-02-04 15:00:00',  // Starší než kontrola
        'expected' => 'checked_ok'
    ],
];

echo "═══════════════════════════════════════════════════════════\n";
echo "TEST: Výpočet check_status - logika porovnání datumů\n";
echo "═══════════════════════════════════════════════════════════\n\n";

foreach ($test_cases as $test) {
    echo "Test: {$test['name']}\n";
    echo "  dt_kontroly:    {$test['dt_kontroly']}\n";
    echo "  dt_aktualizace: {$test['dt_aktualizace']}\n";
    
    $ts_kontroly = strtotime($test['dt_kontroly']);
    $ts_aktualizace = strtotime($test['dt_aktualizace']);
    
    echo "  ts_kontroly:    $ts_kontroly\n";
    echo "  ts_aktualizace: $ts_aktualizace\n";
    echo "  Rozdíl (s):     " . ($ts_kontroly - $ts_aktualizace) . "\n";
    
    // Logika z invoiceHandlers.php
    if ($ts_kontroly >= $ts_aktualizace) {
        $check_status = 'checked_ok';
        echo "  Výsledek: ✅ checked_ok (zelená) - kontrola >= aktualizace\n";
    } else {
        $check_status = 'checked_modified';
        echo "  Výsledek: ⚠️ checked_modified (oranžová) - kontrola < aktualizace\n";
    }
    
    if ($check_status === $test['expected']) {
        echo "  ✅ SPRÁVNĚ - odpovídá očekávání: {$test['expected']}\n";
    } else {
        echo "  ❌ CHYBA - očekáváno: {$test['expected']}, získáno: $check_status\n";
    }
    echo "\n";
}

echo "═══════════════════════════════════════════════════════════\n";
echo "TEST REÁLNÝCH DAT Z DATABÁZE\n";
echo "═══════════════════════════════════════════════════════════\n\n";

$db = get_db_connection();

$stmt = $db->prepare("
    SELECT 
        fa.id,
        fa.cislo_faktury,
        fa.dt_aktualizace,
        fa.rozsirujici_data
    FROM 25a_objednavky_faktury fa
    WHERE fa.rozsirujici_data LIKE '%kontrola_radku%'
    LIMIT 5
");
$stmt->execute();
$faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($faktury as $fa) {
    $rozsirujici = json_decode($fa['rozsirujici_data'], true);
    
    if (isset($rozsirujici['kontrola_radku'])) {
        $kontrola = $rozsirujici['kontrola_radku'];
        
        echo "Faktura #{$fa['id']} ({$fa['cislo_faktury']})\n";
        echo "  dt_aktualizace: {$fa['dt_aktualizace']}\n";
        echo "  dt_kontroly:    " . ($kontrola['dt_kontroly'] ?? 'NULL') . "\n";
        echo "  kontrolovano:   " . ($kontrola['kontrolovano'] ? 'ANO' : 'NE') . "\n";
        
        if (!empty($kontrola['kontrolovano'])) {
            $dt_kontroly = $kontrola['dt_kontroly'] ?? null;
            $dt_aktualizace = $fa['dt_aktualizace'];
            
            if ($dt_kontroly && $dt_aktualizace) {
                $ts_kontroly = strtotime($dt_kontroly);
                $ts_aktualizace = strtotime($dt_aktualizace);
                
                if ($ts_kontroly >= $ts_aktualizace) {
                    echo "  → check_status: ✅ checked_ok (zelená)\n";
                } else {
                    echo "  → check_status: ⚠️ checked_modified (oranžová)\n";
                }
                echo "  → Rozdíl: " . ($ts_kontroly - $ts_aktualizace) . " sekund\n";
            }
        }
        echo "\n";
    }
}

echo "═══════════════════════════════════════════════════════════\n";
echo "✅ Test dokončen\n";
