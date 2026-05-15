#!/usr/bin/env php
<?php
/**
 * Test: Přesná simulace výpočtu čerpání z smlouvyHandlers.php
 */

$db = new PDO("mysql:host=10.3.172.11;dbname=EEO-OSTRA-DEV;charset=utf8mb4", 'erdms_user', 'AhchohTahnoh7eim');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$cislo_smlouvy = 'S-016/75030926/2025';
$stmt = $db->prepare("SELECT id FROM 25_smlouvy WHERE cislo_smlouvy = ?");
$stmt->execute([$cislo_smlouvy]);
$smlouva = $stmt->fetch(PDO::FETCH_ASSOC);
$smlouva_id = $smlouva['id'];

echo "\n=== PŘESNÁ SIMULACE: Čerpání 'v procesu' ===\n\n";

// PŘESNÝ SQL z smlouvyHandlers.php (řádky 880-907)
$sql_vp = "SELECT COALESCE(SUM(castka), 0) FROM (
    SELECT f.fa_castka AS castka
    FROM 25a_objednavky_faktury f
    INNER JOIN 25a_objednavky o ON f.objednavka_id = o.id
    WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', :cislo_smlouvy_vp1, '\"%')
      AND o.aktivni = 1 AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
      AND f.aktivni = 1 AND f.stav NOT IN ('STORNO')
      AND NOT (f.vecna_spravnost_potvrzeno = 1 AND f.stav IN ('ZAPLACENO', 'DOKONCENA'))
    UNION ALL
    SELECT f.fa_castka AS castka
    FROM 25a_objednavky_faktury f
    WHERE f.smlouva_id = :smlouva_id_vp1 AND f.objednavka_id IS NULL
      AND f.aktivni = 1 AND f.stav NOT IN ('STORNO')
      AND NOT (f.vecna_spravnost_potvrzeno = 1 AND f.stav IN ('ZAPLACENO', 'DOKONCENA'))
    UNION ALL
    SELECT COALESCE(
        NULLIF((SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM 25a_objednavky_polozky pol WHERE pol.objednavka_id = o.id), 0),
        o.max_cena_s_dph
    ) AS castka
    FROM 25a_objednavky o
    WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', :cislo_smlouvy_vp2, '\"%')
      AND o.aktivni = 1
      AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena', 'Dokončená', 'Archivovaná', 'Smazaná')
      AND NOT EXISTS (
        SELECT 1 FROM 25a_objednavky_faktury f2
        WHERE f2.objednavka_id = o.id AND f2.aktivni = 1 AND f2.stav NOT IN ('STORNO')
      )
) _vp";

$stmt_vp = $db->prepare($sql_vp);
$stmt_vp->bindValue(':cislo_smlouvy_vp1', $cislo_smlouvy, PDO::PARAM_STR);
$stmt_vp->bindValue(':smlouva_id_vp1', $smlouva_id, PDO::PARAM_INT);
$stmt_vp->bindValue(':cislo_smlouvy_vp2', $cislo_smlouvy, PDO::PARAM_STR);
$stmt_vp->execute();
$cerpano_v_procesu = (float)($stmt_vp->fetchColumn() ?? 0);

echo "📊 Celkem čerpáno 'v procesu': " . number_format($cerpano_v_procesu, 2, ',', ' ') . " Kč\n\n";

// Detail - jen třetí část (objednávky bez faktur)
$sql_detail = "
    SELECT 
        o.cislo_objednavky,
        o.stav_objednavky,
        o.max_cena_s_dph,
        COALESCE(
            NULLIF((SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM 25a_objednavky_polozky pol WHERE pol.objednavka_id = o.id), 0),
            o.max_cena_s_dph
        ) AS cerpano_castka
    FROM 25a_objednavky o
    WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
      AND o.aktivni = 1
      AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena', 'Dokončená', 'Archivovaná', 'Smazaná')
      AND NOT EXISTS (
        SELECT 1 FROM 25a_objednavky_faktury f2
        WHERE f2.objednavka_id = o.id AND f2.aktivni = 1 AND f2.stav NOT IN ('STORNO')
      )
";
$stmt_detail = $db->prepare($sql_detail);
$stmt_detail->execute([$cislo_smlouvy]);
$rozpracovane = $stmt_detail->fetchAll(PDO::FETCH_ASSOC);

echo "🔍 Detail - Objednávky bez faktur (rozpracované):\n";
echo "   Počet: " . count($rozpracovane) . "\n";
if (count($rozpracovane) > 0) {
    foreach ($rozpracovane as $r) {
        echo "   • {$r['cislo_objednavky']} ({$r['stav_objednavky']}): " 
             . number_format($r['cerpano_castka'], 2, ',', ' ') . " Kč\n";
    }
} else {
    echo "   ⚠️ Žádné nenalezeny (možná mají jiný stav?)\n";
}

echo "\n=== Konec testu ===\n\n";
