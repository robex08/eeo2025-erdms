#!/usr/bin/env php
<?php
/**
 * Test script: Debug pro endpoint order-v3/smlouva-expand
 * Cíl: Zjistit, proč se u některých smluv zobrazují jen faktury a ne objednávky v rozpracování
 */

// Pro volání z konzole
if (php_sapi_name() !== 'cli') {
    die('Tento skript lze spustit pouze z příkazové řádky (CLI).');
}

echo "\n=== TEST: Smlouva Expand - Debug čerpání ===\n\n";

// Připojení k DB
$db_host = '10.3.172.11';
$db_name = 'EEO-OSTRA-DEV';
$db_user = 'erdms_user';
$db_pass = 'AhchohTahnoh7eim';

try {
    $db = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Připojení k DB úspěšné\n\n";
} catch (PDOException $e) {
    die("❌ Chyba připojení k DB: " . $e->getMessage() . "\n");
}

// Zadej číslo smlouvy pro test
echo "Zadej číslo smlouvy (např. S-001/75030926/2025): ";
$cislo_smlouvy = trim(fgets(STDIN));

if (empty($cislo_smlouvy)) {
    die("❌ Číslo smlouvy nesmí být prázdné\n");
}

echo "\n🔍 Hledám smlouvu: $cislo_smlouvy\n\n";

// 1) Najít smlouvu
$stmt = $db->prepare("SELECT id, cislo_smlouvy, nazev_smlouvy FROM 25_smlouvy WHERE cislo_smlouvy = ?");
$stmt->execute([$cislo_smlouvy]);
$smlouva = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$smlouva) {
    die("❌ Smlouva nenalezena v databázi\n");
}

echo "✅ Smlouva nalezena:\n";
echo "   ID: {$smlouva['id']}\n";
echo "   Číslo: {$smlouva['cislo_smlouvy']}\n";
echo "   Název: {$smlouva['nazev_smlouvy']}\n\n";

$smlouva_id = $smlouva['id'];
$cislo_smlouvy_escaped = str_replace('/', '\\/', $cislo_smlouvy);

// 2) Hledat VŠECHNY objednávky (včetně těch s fakturami i bez)
echo "📋 Hledám VŠECHNY objednávky pro tuto smlouvu:\n";
echo "   Pattern 1: LIKE '%\"cislo_smlouvy\":\"$cislo_smlouvy\"%'\n";
echo "   Pattern 2: LIKE '%\"cislo_smlouvy\":\"$cislo_smlouvy_escaped\"%'\n\n";

$sql = "
    SELECT 
        o.id,
        o.cislo_objednavky,
        o.stav_objednavky,
        o.predmet,
        o.max_cena_s_dph,
        o.aktivni,
        o.financovani,
        (SELECT COUNT(*) FROM 25a_objednavky_faktury f 
         WHERE f.objednavka_id = o.id AND f.aktivni = 1) as pocet_faktur
    FROM 25a_objednavky o
    WHERE o.aktivni = 1
        AND (
            o.financovani LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
            OR o.financovani LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
        )
    ORDER BY o.dt_vytvoreni DESC
";
$stmt = $db->prepare($sql);
$stmt->execute([$cislo_smlouvy, $cislo_smlouvy_escaped]);
$all_orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "📊 Celkem nalezeno objednávek: " . count($all_orders) . "\n\n";

if (count($all_orders) === 0) {
    echo "⚠️ Žádné objednávky nenalezeny!\n";
    echo "   Možné příčiny:\n";
    echo "   1. Pole 'financovani' neobsahuje číslo smlouvy\n";
    echo "   2. Formát JSON v poli 'financovani' je jiný\n";
    echo "   3. Objednávky mají aktivni=0\n\n";
    
    // Zkusit najít objednávky jinak
    echo "🔍 Zkouším najít objednávky obsahující '$cislo_smlouvy' v jakémkoliv formátu:\n";
    $stmt2 = $db->prepare("
        SELECT id, cislo_objednavky, stav_objednavky, aktivni, financovani
        FROM 25a_objednavky 
        WHERE financovani LIKE ?
        LIMIT 5
    ");
    $stmt2->execute(["%$cislo_smlouvy%"]);
    $loose_orders = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($loose_orders) > 0) {
        echo "   ✅ Nalezeno {count($loose_orders)} objednávek s volným hledáním:\n";
        foreach ($loose_orders as $lo) {
            echo "      - {$lo['cislo_objednavky']} (stav: {$lo['stav_objednavky']}, aktivni: {$lo['aktivni']})\n";
            echo "        financovani: {$lo['financovani']}\n";
        }
    } else {
        echo "   ❌ Ani volné hledání nenašlo žádné objednávky\n";
    }
} else {
    // Seskupit podle stavu a přítomnosti faktury
    $by_status = [];
    foreach ($all_orders as $ord) {
        $stav = $ord['stav_objednavky'];
        $has_fa = (int)$ord['pocet_faktur'] > 0;
        if (!isset($by_status[$stav])) {
            $by_status[$stav] = ['s_fakturou' => 0, 'bez_faktury' => 0];
        }
        if ($has_fa) {
            $by_status[$stav]['s_fakturou']++;
        } else {
            $by_status[$stav]['bez_faktury']++;
        }
    }
    
    echo "📊 Rozdělení podle stavu:\n";
    foreach ($by_status as $stav => $counts) {
        echo "   • $stav:\n";
        echo "      - s fakturou: {$counts['s_fakturou']}\n";
        echo "      - bez faktury (rozpracované): {$counts['bez_faktury']}\n";
    }
    echo "\n";
    
    // Ukázat první 3 objednávky
    echo "📄 První 3 objednávky:\n";
    foreach (array_slice($all_orders, 0, 3) as $ord) {
        echo "   • {$ord['cislo_objednavky']}\n";
        echo "     Stav: {$ord['stav_objednavky']}\n";
        echo "     Cena: " . number_format($ord['max_cena_s_dph'], 2, ',', ' ') . " Kč\n";
        echo "     Faktur: {$ord['pocet_faktur']}\n";
        echo "     Aktivní: {$ord['aktivni']}\n";
        echo "\n";
    }
}

// 3) Filtr který používá backend endpoint (simulace)
echo "\n🔍 SIMULACE FILTRU ENDPOINTU order-v3/smlouva-expand:\n";
echo "   Podmínka: stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')\n\n";

$filtered = array_filter($all_orders, function($o) {
    return !in_array($o['stav_objednavky'], ['Zamítnutá', 'Zrušena']);
});

echo "   ✅ Po filtraci zbývá: " . count($filtered) . " objednávek\n";
echo "   ❌ Odfiltrováno: " . (count($all_orders) - count($filtered)) . " objednávek\n\n";

// 4) Přímé faktury na smlouvu (bez objednávky)
echo "🧾 Přímé faktury na smlouvu (bez objednávky):\n";
$stmt_fa = $db->prepare("
    SELECT id, fa_cislo_vema, fa_vema_kod, fa_castka, stav
    FROM 25a_objednavky_faktury
    WHERE smlouva_id = ? AND objednavka_id IS NULL AND aktivni = 1
    ORDER BY fa_datum_vystaveni DESC
");
$stmt_fa->execute([$smlouva_id]);
$direct_faktury = $stmt_fa->fetchAll(PDO::FETCH_ASSOC);

echo "   Celkem: " . count($direct_faktury) . " faktur\n";
if (count($direct_faktury) > 0) {
    echo "   První 3:\n";
    foreach (array_slice($direct_faktury, 0, 3) as $fa) {
        echo "      • {$fa['fa_cislo_vema']} / {$fa['fa_vema_kod']}: " 
             . number_format($fa['fa_castka'], 2, ',', ' ') . " Kč (stav: {$fa['stav']})\n";
    }
}

echo "\n=== ZÁVĚR ===\n";
if (count($filtered) === 0 && count($direct_faktury) > 0) {
    echo "⚠️ PROBLÉM POTVRZEN: Zobrazují se jen přímé faktury, žádné objednávky!\n";
    echo "   Možné příčiny:\n";
    echo "   1. Všechny objednávky jsou zamítnuté nebo zrušené\n";
    echo "   2. Objednávky nemají správný formát cislo_smlouvy v JSON poli financovani\n";
    echo "   3. Objednávky mají aktivni=0\n";
} elseif (count($filtered) > 0) {
    echo "✅ Objednávky existují a měly by se zobrazit\n";
    echo "   Zkontroluj frontend - možná je tam další filtr\n";
}

echo "\n=== Konec testu ===\n\n";
