<?php
/**
 * Test fulltext hledání "TEST DEV"
 */

// Include config
require_once __DIR__ . '/../eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
// require_once __DIR__ . '/../eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/lpFulltextHandlers.php';

global $pdo;

// Test bez autentizace - prostě zkus vyvolat
$input = [
    'token' => 'test-token',
    'username' => 'test-user',
    'query' => 'TEST DEV',
    'rok' => 2025
];

echo "=== TEST FULLTEXT SEARCH: 'TEST DEV' ===\n";
echo "Query: " . json_encode($input) . "\n\n";

// Simulovat handle_lp_fulltext_search bez autentizace
$query = 'TEST DEV';
$rok = 2025;

if (!$pdo) {
    echo "ERROR: Nelze se připojit k databázi\n";
    exit(1);
}

$matching_lp_ids = [];
$matched_orders_by_lp = [];
$like = '%' . $query . '%';

try {
    // 1) Hledat v LP master
    echo "1) Hledání v LP master (cislo_lp, nazev_uctu, kategorie, cislo_uctu)...\n";
    $sql = "
        SELECT DISTINCT lpm.id, lpm.cislo_lp, lpm.nazev_uctu
        FROM `25_limitovane_prisliby_master` lpm
        WHERE lpm.cislo_lp LIKE :q OR lpm.nazev_uctu LIKE :q OR lpm.kategorie LIKE :q OR lpm.cislo_uctu LIKE :q
        LIMIT 10
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':q' => $like]);
    $lp_results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Nalezeno: " . count($lp_results) . " LP\n";
    foreach ($lp_results as $r) {
        echo "   - ID: {$r['id']}, Kód: {$r['cislo_lp']}, Název: {$r['nazev_uctu']}\n";
        $matching_lp_ids[$r['id']] = true;
    }
    
    // 2) Hledat v objednávkách
    echo "\n2) Hledání v objednávkách (cislo_objednavky, predmet, dodavatel_nazev)...\n";
    $sql = "
        SELECT o.id, o.cislo_objednavky, o.predmet, o.financovani, YEAR(o.dt_vytvoreni) as rok
        FROM `25a_objednavky` o
        WHERE (o.cislo_objednavky LIKE :q OR o.predmet LIKE :q OR o.dodavatel_nazev LIKE :q)
        AND o.aktivni = 1
        AND YEAR(o.dt_vytvoreni) = :rok
        LIMIT 20
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':q' => $like, ':rok' => $rok]);
    $order_results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Nalezeno: " . count($order_results) . " objednávek\n";
    foreach ($order_results as $o) {
        echo "   - ID: {$o['id']}, Číslo: {$o['cislo_objednavky']}, Předmět: {$o['predmet']}\n";
        if (!empty($o['financovani'])) {
            $fin = json_decode($o['financovani'], true);
            if (is_array($fin) && isset($fin['lp_kody'])) {
                echo "     LP kódy: " . json_encode($fin['lp_kody']) . "\n";
                foreach ($fin['lp_kody'] as $lp_id) {
                    $matching_lp_ids[(int)$lp_id] = true;
                }
            }
        }
    }
    
    // 3) Hledat v fakturách
    echo "\n3) Hledání v fakturách (fa_cislo_vema, fa_poznamka)...\n";
    $sql = "
        SELECT f.id, f.cislo_objednavky, f.fa_cislo_vema, o.financovani
        FROM `25a_objednavky_faktury` f
        LEFT JOIN `25a_objednavky` o ON o.id = f.cislo_objednavky
        WHERE (f.fa_cislo_vema LIKE :q OR f.fa_poznamka LIKE :q)
        AND YEAR(f.dt_vytvoreni) = :rok
        LIMIT 10
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':q' => $like, ':rok' => $rok]);
    $faktura_results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Nalezeno: " . count($faktura_results) . " faktur\n";
    
    echo "\n4) Shrnutí - Matchující LP:\n";
    $final_lp_ids = array_keys($matching_lp_ids);
    echo "   Celkem matchujících LP: " . count($final_lp_ids) . "\n";
    foreach ($final_lp_ids as $lp_id) {
        echo "   - LP ID: $lp_id\n";
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

echo "\n=== KONEC TESTU ===\n";
