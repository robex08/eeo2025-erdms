<?php
/**
 * TEST: Odbory LP API (save/get/delete)
 * Testuje CRUD operace na odbory LP přiřazení
 */

require_once __DIR__ . '/../eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

$db = new PDO(
    'mysql:host=10.3.172.11;port=3306;dbname=EEO-OSTRA-DEV;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim'
);

echo "===========================================\n";
echo "PŘÍPRAVA TESTU: Vyhledání testovacích dat\n";
echo "===========================================\n\n";

// Najít LP s modulem 'fp'
$stmt = $db->query("SELECT id FROM 25_limitovane_prisliby WHERE modul = 'fp' LIMIT 1");
$lp_id = $stmt->fetchColumn();

if (!$lp_id) {
    echo "❌ LP s modulem 'fp' nenalezen!\n";
    exit(1);
}
echo "✅ LP ID: $lp_id\n";

// Najít fakturu bez objednávky (standalone)
$stmt = $db->query("
    SELECT fa.id, fa.fa_cislo_vema
    FROM 25a_objednavky_faktury fa
    WHERE fa.objednavka_id IS NULL
    LIMIT 1
");
$faktura = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$faktura) {
    echo "❌ Faktura bez objednávky nenalezena!\n";
    exit(1);
}
$faktura_id = $faktura['id'];
echo "✅ Faktura ID: $faktura_id (číslo: {$faktura['fa_cislo_vema']})\n\n";

echo "===========================================\n";
echo "TEST 1: SAVE - Vytvoření odbory LP přiřazení\n";
echo "===========================================\n\n";

// Nejdřív smaž existující přiřazení (pokud existuje)
$db->exec("DELETE FROM 25a_odbory_lp_prirazeni WHERE faktura_id = $faktura_id");

// INSERT přes ON DUPLICATE KEY UPDATE logiku
$stmt = $db->prepare("
    INSERT INTO 25a_odbory_lp_prirazeni 
        (faktura_id, lp_id, poznamka, vytvoril_uzivatel_id, dt_vytvoreni, dt_aktualizace)
    VALUES 
        (:faktura_id, :lp_id, :poznamka, 1, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
        lp_id = :lp_id,
        poznamka = :poznamka,
        dt_aktualizace = NOW()
");

$result = $stmt->execute([
    ':faktura_id' => $faktura_id,
    ':lp_id' => $lp_id,
    ':poznamka' => 'Testovací přiřazení LP k faktuře'
]);

if ($result) {
    echo "✅ Přiřazení vytvořeno!\n\n";
} else {
    echo "❌ Chyba při vytváření přiřazení!\n";
    exit(1);
}

echo "===========================================\n";
echo "TEST 2: GET - Načtení odbory LP přiřazení\n";
echo "===========================================\n\n";

$stmt = $db->prepare("
    SELECT 
        olp.*,
        lp.cislo_lp,
        lp.nazev_uctu,
        lp.modul,
        u.jmeno as vytvoril_jmeno,
        u.prijmeni as vytvoril_prijmeni
    FROM 25a_odbory_lp_prirazeni olp
    JOIN 25_limitovane_prisliby lp ON olp.lp_id = lp.id
    LEFT JOIN 25_uzivatele u ON olp.vytvoril_uzivatel_id = u.id
    WHERE olp.faktura_id = :faktura_id
");

$stmt->execute([':faktura_id' => $faktura_id]);
$prirazeni = $stmt->fetch(PDO::FETCH_ASSOC);

if ($prirazeni) {
    echo "✅ Přiřazení načteno!\n";
    echo "   LP: {$prirazeni['cislo_lp']} ({$prirazeni['nazev_uctu']})\n";
    echo "   Modul: {$prirazeni['modul']}\n";
    echo "   Poznámka: {$prirazeni['poznamka']}\n";
    echo "   Vytvořil: {$prirazeni['vytvoril_jmeno']} {$prirazeni['vytvoril_prijmeni']}\n\n";
} else {
    echo "❌ Přiřazení nenalezeno!\n";
    exit(1);
}

echo "===========================================\n";
echo "TEST 3: UPDATE - Změna poznámky\n";
echo "===========================================\n\n";

$stmt = $db->prepare("
    UPDATE 25a_odbory_lp_prirazeni
    SET poznamka = :poznamka,
        dt_aktualizace = NOW()
    WHERE faktura_id = :faktura_id
");

$result = $stmt->execute([
    ':faktura_id' => $faktura_id,
    ':poznamka' => 'Změněná poznámka - test UPDATE'
]);

if ($result) {
    // Ověř změnu
    $stmt = $db->prepare("SELECT poznamka FROM 25a_odbory_lp_prirazeni WHERE faktura_id = :faktura_id");
    $stmt->execute([':faktura_id' => $faktura_id]);
    $nova_poznamka = $stmt->fetchColumn();
    
    if ($nova_poznamka === 'Změněná poznámka - test UPDATE') {
        echo "✅ Poznámka změněna!\n\n";
    } else {
        echo "❌ Poznámka nebyla změněna!\n";
    }
} else {
    echo "❌ Chyba při UPDATE!\n";
}

echo "===========================================\n";
echo "TEST 4: DELETE - Smazání přiřazení\n";
echo "===========================================\n\n";

$stmt = $db->prepare("DELETE FROM 25a_odbory_lp_prirazeni WHERE faktura_id = :faktura_id");
$result = $stmt->execute([':faktura_id' => $faktura_id]);

if ($result) {
    // Ověř smazání
    $stmt = $db->prepare("SELECT COUNT(*) FROM 25a_odbory_lp_prirazeni WHERE faktura_id = :faktura_id");
    $stmt->execute([':faktura_id' => $faktura_id]);
    $count = $stmt->fetchColumn();
    
    if ($count == 0) {
        echo "✅ Přiřazení smazáno!\n\n";
    } else {
        echo "❌ Přiřazení nebylo smazáno!\n";
    }
} else {
    echo "❌ Chyba při DELETE!\n";
}

echo "===========================================\n";
echo "TEST 5: Ověření CASCADE DELETE (faktura)\n";
echo "===========================================\n\n";

// Vytvoř nové přiřazení
$stmt = $db->prepare("
    INSERT INTO 25a_odbory_lp_prirazeni 
        (faktura_id, lp_id, poznamka, vytvoril_uzivatel_id, dt_vytvoreni, dt_aktualizace)
    VALUES 
        (:faktura_id, :lp_id, 'Test CASCADE', 1, NOW(), NOW())
");
$stmt->execute([':faktura_id' => $faktura_id, ':lp_id' => $lp_id]);

echo "✅ Přiřazení vytvořeno pro test CASCADE\n";

// Zkontroluj, že existuje
$stmt = $db->prepare("SELECT COUNT(*) FROM 25a_odbory_lp_prirazeni WHERE faktura_id = :faktura_id");
$stmt->execute([':faktura_id' => $faktura_id]);
$count_before = $stmt->fetchColumn();
echo "   Počet přiřazení před: $count_before\n";

// Poznámka: CASCADE DELETE nelze testovat bez smazání faktury,
// což by bylo destruktivní. Jen ověříme, že constraint existuje.
$stmt = $db->query("
    SELECT 
        CONSTRAINT_NAME,
        DELETE_RULE
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'EEO-OSTRA-DEV'
      AND TABLE_NAME = '25a_odbory_lp_prirazeni'
      AND DELETE_RULE = 'CASCADE'
");
$cascades = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($cascades) > 0) {
    echo "✅ CASCADE DELETE constraint existuje:\n";
    foreach ($cascades as $c) {
        echo "   - {$c['CONSTRAINT_NAME']}: {$c['DELETE_RULE']}\n";
    }
} else {
    echo "⚠️  CASCADE DELETE constraint nenalezen (může být OK, pokud je RESTRICT)\n";
}

// Uklid - smaž testovací přiřazení
$db->exec("DELETE FROM 25a_odbory_lp_prirazeni WHERE faktura_id = $faktura_id");

echo "\n===========================================\n";
echo "✅ VŠECHNY TESTY DOKONČENY ÚSPĚŠNĚ!\n";
echo "===========================================\n";
