#!/usr/bin/env php
<?php
/**
 * Test: Výpočet čerpání "v procesu" pro smlouvu S-016/75030926/2025
 */

$db = new PDO("mysql:host=10.3.172.11;dbname=EEO-OSTRA-DEV;charset=utf8mb4", 'erdms_user', 'AhchohTahnoh7eim');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$cislo_smlouvy = 'S-016/75030926/2025';
$stmt = $db->prepare("SELECT id FROM 25_smlouvy WHERE cislo_smlouvy = ?");
$stmt->execute([$cislo_smlouvy]);
$smlouva = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$smlouva) die("❌ Smlouva nenalezena\n");

$smlouva_id = $smlouva['id'];

echo "\n=== TEST: Čerpání 'v procesu' pro smlouvu $cislo_smlouvy ===\n\n";

// Test 3. části UNION (objednávky bez faktur)
$sql = "
    SELECT 
        o.cislo_objednavky,
        o.stav_objednavky,
        o.max_cena_s_dph,
        COALESCE(
            NULLIF((SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM 25a_objednavky_polozky pol WHERE pol.objednavka_id = o.id), 0),
            o.max_cena_s_dph
        ) AS cerpano_castka,
        (SELECT COUNT(*) FROM 25a_objednavky_faktury f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as pocet_faktur
    FROM 25a_objednavky o
    WHERE REPLACE(o.financovani, '\\\\\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
      AND o.aktivni = 1
      AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena', 'Dokončená', 'Archivovaná', 'Smazaná')
      AND NOT EXISTS (
        SELECT 1 FROM 25a_objednavky_faktury f2
        WHERE f2.objednavka_id = o.id AND f2.aktivni = 1 AND f2.stav NOT IN ('STORNO')
      )
";
$stmt = $db->prepare($sql);
$stmt->execute([$cislo_smlouvy]);
$rozpracovane = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "🔍 Rozpracované objednávky (bez faktur):\n";
echo "   Počet: " . count($rozpracovane) . "\n\n";

if (count($rozpracovane) > 0) {
    $celkem = 0;
    foreach ($rozpracovane as $r) {
        echo "   • {$r['cislo_objednavky']}\n";
        echo "     Stav: {$r['stav_objednavky']}\n";
        echo "     Max cena: " . number_format($r['max_cena_s_dph'], 2, ',', ' ') . " Kč\n";
        echo "     Čerpáno: " . number_format($r['cerpano_castka'], 2, ',', ' ') . " Kč\n";
        echo "     Faktur: {$r['pocet_faktur']}\n\n";
        $celkem += (float)$r['cerpano_castka'];
    }
    echo "   📊 Celkem v procesu (rozpracované obj.): " . number_format($celkem, 2, ',', ' ') . " Kč\n";
} else {
    echo "   ⚠️ Žádné rozpracované objednávky nenalezeny\n";
    echo "   Možné příčiny:\n";
    echo "   - Objednávky mají faktury\n";
    echo "   - Objednávky jsou v dokončeném stavu\n";
    echo "   - Problém s REPLACE() funkcí\n";
}

echo "\n=== Konec testu ===\n\n";
