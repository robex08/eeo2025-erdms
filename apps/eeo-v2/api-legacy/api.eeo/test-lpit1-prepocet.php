<?php
/**
 * Test přepočtu LP čerpání pro LPIT1 (rok 2026)
 * OČEKÁVANÝ VÝSLEDEK: skutecne_cerpano = 91,705.60 Kč (místo 116,187.08)
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php';

echo "==========================================\n";
echo "TEST: Přepočet LP LPIT1 (rok 2026)\n";
echo "==========================================\n\n";

// Přímé PDO připojení
try {
    $pdo = new PDO(
        'mysql:host=10.3.172.11;dbname=EEO-OSTRA-DEV;charset=utf8mb4',
        'erdms_user',
        'AhchohTahnoh7eim',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    die("❌ CHYBA připojení k DB: " . $e->getMessage() . "\n");
}

if (!$pdo) {
    die("❌ CHYBA: Nelze připojit k databázi\n");
}

// LP ID pro LPIT1
$lp_id = 140;
$rok = 2026;

echo "🔍 Stav PŘED přepočtem:\n";
echo "------------------------------\n";
$stmt_before = $pdo->prepare("
    SELECT 
        cislo_lp,
        rok,
        celkovy_limit,
        rezervovano,
        predpokladane_cerpani,
        skutecne_cerpano,
        cerpano_pokladna,
        (skutecne_cerpano + cerpano_pokladna) as celkove_skutecne,
        posledni_prepocet
    FROM 25_limitovane_prisliby_cerpani
    WHERE cislo_lp = 'LPIT1' AND rok = 2026
");
$stmt_before->execute();
$before = $stmt_before->fetch(PDO::FETCH_ASSOC);

if ($before) {
    echo "Číslo LP: {$before['cislo_lp']}\n";
    echo "Rok: {$before['rok']}\n";
    echo "Celkový limit: " . number_format($before['celkovy_limit'], 2, ',', ' ') . " Kč\n";
    echo "Rezervováno: " . number_format($before['rezervovano'], 2, ',', ' ') . " Kč\n";
    echo "Předpokládané: " . number_format($before['predpokladane_cerpani'], 2, ',', ' ') . " Kč\n";
    echo "Skutečně (faktury): " . number_format($before['skutecne_cerpano'], 2, ',', ' ') . " Kč ⚠️ MĚLO BY BÝT 91,705.60 Kč\n";
    echo "Pokladna: " . number_format($before['cerpano_pokladna'], 2, ',', ' ') . " Kč\n";
    echo "CELKEM vyčerpáno: " . number_format($before['celkove_skutecne'], 2, ',', ' ') . " Kč\n";
    echo "Poslední přepočet: {$before['posledni_prepocet']}\n";
} else {
    echo "⚠️ Záznam neexistuje, bude vytvořen\n";
}

echo "\n🔄 Spouštím přepočet...\n";
echo "------------------------------\n";

$result = prepocetCerpaniPodleIdLP_PDO($pdo, $lp_id, $rok);

if ($result['success']) {
    echo "✅ Přepočet proběhl úspěšně!\n\n";
    
    echo "📊 Stav PO přepočtu:\n";
    echo "------------------------------\n";
    $stmt_after = $pdo->prepare("
        SELECT 
            cislo_lp,
            rok,
            celkovy_limit,
            rezervovano,
            predpokladane_cerpani,
            skutecne_cerpano,
            cerpano_pokladna,
            (skutecne_cerpano + cerpano_pokladna) as celkove_skutecne,
            zbyva_skutecne,
            procento_skutecne,
            posledni_prepocet
        FROM 25_limitovane_prisliby_cerpani
        WHERE cislo_lp = 'LPIT1' AND rok = 2026
    ");
    $stmt_after->execute();
    $after = $stmt_after->fetch(PDO::FETCH_ASSOC);
    
    echo "Číslo LP: {$after['cislo_lp']}\n";
    echo "Rok: {$after['rok']}\n";
    echo "Celkový limit: " . number_format($after['celkovy_limit'], 2, ',', ' ') . " Kč\n";
    echo "Rezervováno: " . number_format($after['rezervovano'], 2, ',', ' ') . " Kč\n";
    echo "Předpokládané: " . number_format($after['predpokladane_cerpani'], 2, ',', ' ') . " Kč\n";
    echo "Skutečně (faktury): " . number_format($after['skutecne_cerpano'], 2, ',', ' ') . " Kč";
    
    // Ověření správné hodnoty
    $expected = 91705.60;
    $actual = (float)$after['skutecne_cerpano'];
    $diff = abs($expected - $actual);
    
    if ($diff < 0.10) {
        echo " ✅ SPRÁVNĚ!\n";
    } else {
        echo " ❌ CHYBA! Očekáváno: " . number_format($expected, 2, ',', ' ') . " Kč\n";
    }
    
    echo "Pokladna: " . number_format($after['cerpano_pokladna'], 2, ',', ' ') . " Kč\n";
    echo "CELKEM vyčerpáno: " . number_format($after['celkove_skutecne'], 2, ',', ' ') . " Kč\n";
    echo "Zbývá: " . number_format($after['zbyva_skutecne'], 2, ',', ' ') . " Kč\n";
    echo "Procento: {$after['procento_skutecne']} %\n";
    echo "Poslední přepočet: {$after['posledni_prepocet']}\n";
    
    echo "\n📋 Detail objednávek pro LPIT1 2026:\n";
    echo "------------------------------\n";
    $stmt_detail = $pdo->prepare("
        SELECT 
            obj.cislo_obj,
            obj.max_cena_s_dph,
            COALESCE(SUM(DISTINCT fakt.fa_castka), 0) as suma_faktur,
            COALESCE(
                (SELECT SUM(p.cena_s_dph) 
                 FROM 25a_objednavky_polozky p 
                 WHERE p.objednavka_id = obj.id), 
                0
            ) as suma_polozek,
            COUNT(DISTINCT fakt.id) as pocet_faktur,
            CASE
                WHEN COUNT(DISTINCT fakt.id) > 0 THEN 'FAKTURY'
                WHEN (SELECT SUM(p.cena_s_dph) FROM 25a_objednavky_polozky p WHERE p.objednavka_id = obj.id) > 0 THEN 'POLOŽKY'
                ELSE 'REZERVACE'
            END as zdroj_cerpani,
            CASE
                WHEN COUNT(DISTINCT fakt.id) > 0 THEN COALESCE(SUM(DISTINCT fakt.fa_castka), 0)
                WHEN (SELECT SUM(p.cena_s_dph) FROM 25a_objednavky_polozky p WHERE p.objednavka_id = obj.id) > 0 
                    THEN (SELECT SUM(p.cena_s_dph) FROM 25a_objednavky_polozky p WHERE p.objednavka_id = obj.id)
                ELSE obj.max_cena_s_dph
            END as pouzita_hodnota
        FROM 25a_objednavky obj
        LEFT JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id AND fakt.aktivni = 1
        WHERE obj.aktivni = 1
        AND obj.financovani LIKE '%LPIT1%'
        AND obj.stav_workflow_kod NOT LIKE '%ZAMITNUTA%'
        AND obj.stav_workflow_kod NOT LIKE '%ZRUSENO%' 
        AND obj.stav_workflow_kod NOT LIKE '%STORNO%'
        AND YEAR(obj.dt_vytvoreni) = 2026
        GROUP BY obj.id, obj.cislo_obj, obj.max_cena_s_dph
        ORDER BY obj.cislo_obj
    ");
    $stmt_detail->execute();
    
    $celkem = 0;
    while ($row = $stmt_detail->fetch(PDO::FETCH_ASSOC)) {
        $hodnota = (float)$row['pouzita_hodnota'];
        $celkem += $hodnota;
        
        echo sprintf(
            "%-10s | Max: %10s | Faktury: %10s | Položky: %10s | POUŽITO: %10s (%s)\n",
            $row['cislo_obj'],
            number_format($row['max_cena_s_dph'], 2, ',', ' '),
            number_format($row['suma_faktur'], 2, ',', ' '),
            number_format($row['suma_polozek'], 2, ',', ' '),
            number_format($hodnota, 2, ',', ' '),
            $row['zdroj_cerpani']
        );
    }
    
    echo "------------------------------\n";
    echo "CELKEM: " . number_format($celkem, 2, ',', ' ') . " Kč\n";
    
} else {
    echo "❌ CHYBA při přepočtu:\n";
    echo $result['error'] . "\n";
}

echo "\n==========================================\n";
echo "Test dokončen.\n";
echo "==========================================\n";
