#!/usr/bin/env php
<?php
/**
 * Test: Debug pro konkrétní objednávku - zjistit její vazbu na smlouvu
 */

if (php_sapi_name() !== 'cli') {
    die('Tento skript lze spustit pouze z příkazové řádky (CLI).');
}

echo "\n=== DEBUG: Objednávka → Smlouva vazba ===\n\n";

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

// Číslo objednávky z parametru
$cislo_objednavky = $argv[1] ?? null;

if (!$cislo_objednavky) {
    echo "Zadej číslo objednávky: ";
    $cislo_objednavky = trim(fgets(STDIN));
}

if (empty($cislo_objednavky)) {
    die("❌ Číslo objednávky nesmí být prázdné\n");
}

echo "🔍 Hledám objednávku: $cislo_objednavky\n\n";

// Najít objednávku
$stmt = $db->prepare("
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
    WHERE o.cislo_objednavky = ?
    LIMIT 1
");
$stmt->execute([$cislo_objednavky]);
$order = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$order) {
    die("❌ Objednávka nenalezena v databázi\n");
}

echo "✅ Objednávka nalezena:\n";
echo "   ID: {$order['id']}\n";
echo "   Číslo: {$order['cislo_objednavky']}\n";
echo "   Stav: {$order['stav_objednavky']}\n";
echo "   Cena: " . number_format($order['max_cena_s_dph'], 2, ',', ' ') . " Kč\n";
echo "   Aktivní: {$order['aktivni']}\n";
echo "   Počet faktur: {$order['pocet_faktur']}\n\n";

// Parsovat JSON financování
echo "📋 Pole 'financovani' (JSON):\n";
if (empty($order['financovani'])) {
    echo "   ⚠️ Pole financovani je prázdné!\n\n";
} else {
    $financovani = json_decode($order['financovani'], true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "   ❌ Chyba parsování JSON: " . json_last_error_msg() . "\n";
        echo "   RAW: {$order['financovani']}\n\n";
    } else {
        echo "   ✅ JSON parsován správně:\n";
        $cislo_smlouvy = $financovani['cislo_smlouvy'] ?? null;
        if ($cislo_smlouvy) {
            echo "   • cislo_smlouvy: $cislo_smlouvy\n";
            
            // Najít smlouvu
            $stmt_s = $db->prepare("SELECT id, cislo_smlouvy, nazev_smlouvy, aktivni FROM 25_smlouvy WHERE cislo_smlouvy = ?");
            $stmt_s->execute([$cislo_smlouvy]);
            $smlouva = $stmt_s->fetch(PDO::FETCH_ASSOC);
            
            if ($smlouva) {
                echo "\n✅ Smlouva nalezena:\n";
                echo "   ID: {$smlouva['id']}\n";
                echo "   Číslo: {$smlouva['cislo_smlouvy']}\n";
                echo "   Název: {$smlouva['nazev_smlouvy']}\n";
                echo "   Aktivní: {$smlouva['aktivni']}\n\n";
                
                // Testovat, zda se objednávka vrátí při expand smlouvy
                echo "🧪 TEST: Měla by se tato objednávka vrátit při expand smlouvy?\n";
                $cislo_smlouvy_escaped = str_replace('/', '\\/', $cislo_smlouvy);
                
                echo "   DEBUG:\n";
                echo "   - cislo_smlouvy: $cislo_smlouvy\n";
                echo "   - cislo_smlouvy_escaped: $cislo_smlouvy_escaped\n";
                echo "   - Pattern 1: %\"cislo_smlouvy\":\"$cislo_smlouvy\"%\n";
                echo "   - Pattern 2: %\"cislo_smlouvy\":\"$cislo_smlouvy_escaped\"%\n\n";
                
                // Test každého patternu samostatně
                echo "   Test pattern 1 (bez escape):\n";
                $stmt_t1 = $db->prepare("SELECT COUNT(*) as cnt FROM 25a_objednavky o WHERE o.id = ? AND o.financovani LIKE ?");
                $stmt_t1->execute([$order['id'], "%\"cislo_smlouvy\":\"$cislo_smlouvy\"%"]);
                $t1 = $stmt_t1->fetch(PDO::FETCH_ASSOC);
                echo "      Výsledek: " . ($t1['cnt'] > 0 ? "✅ MATCHED" : "❌ NO MATCH") . "\n";
                
                echo "   Test pattern 2 (s escape \\/):\n";
                $stmt_t2 = $db->prepare("SELECT COUNT(*) as cnt FROM 25a_objednavky o WHERE o.id = ? AND o.financovani LIKE ?");
                $stmt_t2->execute([$order['id'], "%\"cislo_smlouvy\":\"$cislo_smlouvy_escaped\"%"]);
                $t2 = $stmt_t2->fetch(PDO::FETCH_ASSOC);
                echo "      Výsledek: " . ($t2['cnt'] > 0 ? "✅ MATCHED" : "❌ NO MATCH") . "\n\n";
                
                $sql_test = "
                    SELECT COUNT(*) as cnt
                    FROM 25a_objednavky o
                    WHERE o.aktivni = 1
                        AND (
                            o.financovani LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
                            OR o.financovani LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
                        )
                        AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
                        AND o.id = ?
                ";
                $stmt_test = $db->prepare($sql_test);
                $stmt_test->execute([$cislo_smlouvy, $cislo_smlouvy_escaped, $order['id']]);
                $test_result = $stmt_test->fetch(PDO::FETCH_ASSOC);
                
                if ((int)$test_result['cnt'] > 0) {
                    echo "   ✅ ANO - objednávka splňuje všechny podmínky endpointu\n";
                    echo "      - aktivni = 1 ✓\n";
                    echo "      - stav != 'Zamítnutá', 'Zrušena' ✓\n";
                    echo "      - obsahuje cislo_smlouvy v JSON ✓\n\n";
                    
                    // Zkontrolovat, zda má faktury
                    if ((int)$order['pocet_faktur'] > 0) {
                        echo "   ℹ️ Objednávka má {$order['pocet_faktur']} fakturu/faktur\n";
                        
                        // Načíst faktury
                        $stmt_fa = $db->prepare("
                            SELECT id, fa_cislo_vema, fa_vema_kod, fa_castka, stav, 
                                   fa_datum_vystaveni, vecna_spravnost_potvrzeno
                            FROM 25a_objednavky_faktury
                            WHERE objednavka_id = ? AND aktivni = 1
                            ORDER BY fa_datum_vystaveni DESC
                        ");
                        $stmt_fa->execute([$order['id']]);
                        $faktury = $stmt_fa->fetchAll(PDO::FETCH_ASSOC);
                        
                        echo "      Faktury:\n";
                        foreach ($faktury as $fa) {
                            echo "         • {$fa['fa_cislo_vema']} / {$fa['fa_vema_kod']}\n";
                            echo "           Částka: " . number_format($fa['fa_castka'], 2, ',', ' ') . " Kč\n";
                            echo "           Stav: {$fa['stav']}\n";
                            echo "           Věcná správnost: " . ($fa['vecna_spravnost_potvrzeno'] ? 'ANO' : 'NE') . "\n";
                        }
                    } else {
                        echo "   ℹ️ Objednávka NEMÁ žádné faktury (rozpracovaná)\n";
                    }
                    
                    echo "\n🎯 ZÁVĚR:\n";
                    echo "   Objednávka by se MĚLA zobrazit v čerpání smlouvy.\n";
                    echo "   Pokud se nezobrazuje, problém je pravděpodobně:\n";
                    echo "   1. Frontend filtruje data dalším způsobem\n";
                    echo "   2. Uživatel nemá oprávnění vidět tuto objednávku (requesting_user_id filtr)\n";
                    echo "   3. Cache problém - data se nenačetla znovu\n";
                    
                } else {
                    echo "   ❌ NE - objednávka NESPLŇUJE podmínky:\n";
                    if ((int)$order['aktivni'] !== 1) {
                        echo "      - aktivni = {$order['aktivni']} (mělo by být 1)\n";
                    }
                    if (in_array($order['stav_objednavky'], ['Zamítnutá', 'Zrušena'])) {
                        echo "      - stav = {$order['stav_objednavky']} (je vyloučen)\n";
                    }
                }
            } else {
                echo "\n❌ Smlouva s číslem '$cislo_smlouvy' NEBYLA nalezena!\n";
                echo "   Možné příčiny:\n";
                echo "   - Smlouva byla smazána\n";
                echo "   - Špatný formát čísla smlouvy\n";
            }
            
        } else {
            echo "   ⚠️ Pole 'cislo_smlouvy' v JSON CHYBÍ nebo je null!\n";
            echo "   Obsah financovani:\n";
            print_r($financovani);
        }
    }
}

echo "\n=== Konec debuggu ===\n\n";
