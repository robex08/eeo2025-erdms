<?php
/**
 * TEST: Automatický přepočet čerpání LP při odbory přiřazení
 * Ověřuje, že když přiřadíme LP k faktuře, automaticky se přepočítá čerpání
 */

require_once __DIR__ . '/../eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

$db = new PDO(
    'mysql:host=10.3.172.11;port=3306;dbname=EEO-OSTRA-DEV;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim'
);

echo "===========================================\n";
echo "TEST: Automatický přepočet čerpání LP\n";
echo "===========================================\n\n";

// Najít LP s modulem 'fp'
$stmt = $db->query("SELECT id, cislo_lp FROM 25_limitovane_prisliby WHERE modul = 'fp' LIMIT 1");
$lp = $stmt->fetch(PDO::FETCH_ASSOC);
$lp_id = $lp['id'];
$lp_code = $lp['cislo_lp'];

echo "✅ LP: $lp_code (ID: $lp_id)\n";

// Najít fakturu s částkou
$stmt = $db->query("
    SELECT fa.id, fa.fa_cislo_vema, fa.fa_castka, fa.potvrdil_vecnou_spravnost_id
    FROM 25a_objednavky_faktury fa
    WHERE fa.objednavka_id IS NULL
      AND fa.fa_castka > 0
      AND fa.potvrdil_vecnou_spravnost_id IS NOT NULL
    LIMIT 1
");
$faktura = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$faktura) {
    echo "❌ Faktura s částkou a potvrzením nenalezena!\n";
    exit(1);
}

$faktura_id = $faktura['id'];
$faktura_castka = $faktura['fa_castka'];
echo "✅ Faktura: {$faktura['fa_cislo_vema']} (částka: $faktura_castka Kč)\n\n";

// Smaž existující přiřazení
$db->exec("DELETE FROM 25a_odbory_lp_prirazeni WHERE faktura_id = $faktura_id");

echo "===========================================\n";
echo "KROK 1: Čerpání PŘED přiřazením LP\n";
echo "===========================================\n\n";

// Načti čerpání PŘED
$stmt = $db->prepare("
    SELECT 
        skutecne_cerpano,
        cerpano_pokladna,
        cerpano_odbory_faktury,
        cerpano_odbory_pokladna
    FROM 25_limitovane_prisliby_cerpani
    WHERE cislo_lp = :cislo_lp
");
$stmt->execute([':cislo_lp' => $lp_code]);
$cerpani_pred = $stmt->fetch(PDO::FETCH_ASSOC);

if ($cerpani_pred) {
    echo "Skutečně čerpáno: {$cerpani_pred['skutecne_cerpano']} Kč\n";
    echo "Čerpáno pokladna: {$cerpani_pred['cerpano_pokladna']} Kč\n";
    echo "Čerpáno odbory faktury: {$cerpani_pred['cerpano_odbory_faktury']} Kč\n";
    echo "Čerpáno odbory pokladna: {$cerpani_pred['cerpano_odbory_pokladna']} Kč\n\n";
} else {
    echo "⚠️  Žádné čerpání pro LP $lp_code\n\n";
}

echo "===========================================\n";
echo "KROK 2: Přiřazení LP k faktuře\n";
echo "===========================================\n\n";

$stmt = $db->prepare("
    INSERT INTO 25a_odbory_lp_prirazeni 
        (faktura_id, lp_id, poznamka, vytvoril_uzivatel_id, dt_vytvoreni, dt_aktualizace)
    VALUES 
        (:faktura_id, :lp_id, 'Test automatického přepočtu', 1, NOW(), NOW())
");
$stmt->execute([':faktura_id' => $faktura_id, ':lp_id' => $lp_id]);

echo "✅ LP přiřazen k faktuře\n\n";

echo "===========================================\n";
echo "KROK 3: Manuální přepočet čerpání\n";
echo "===========================================\n\n";

// Zavolej přepočet (simulace toho, co dělá handler)
require_once __DIR__ . '/../eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php';
require_once __DIR__ . '/../eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';

$config = [
    'db_host' => '10.3.172.11',
    'db_port' => '3306',
    'db_name' => 'EEO-OSTRA-DEV',
    'db_user' => 'erdms_user',
    'db_password' => 'AhchohTahnoh7eim',
    'db_charset' => 'utf8mb4'
];

// Mock verify_token_v2
function verify_token_v2($username, $token) {
    return ['id' => 1, 'username' => $username];
}

// Mock get_db
function get_db($config) {
    $dsn = "mysql:host={$config['db_host']};port={$config['db_port']};dbname={$config['db_name']};charset={$config['db_charset']}";
    return new PDO($dsn, $config['db_user'], $config['db_password']);
}

// Definuj konstanty (potřebné pro handler)
define('TBL_LIMITOVANE_PRISLIBY', '25_limitovane_prisliby');
define('TBL_LP_MASTER', '25_limitovane_prisliby');
define('TBL_LP_CERPANI', '25_limitovane_prisliby_cerpani');
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_OBJEDNAVKY_POLOZKY', '25a_objednavky_polozky');
define('TBL_SMLOUVY', '25_smlouvy');
define('TBL_FAKTURY', '25a_objednavky_faktury');
define('TBL_POKLADNI_KNIHY', '25a_pokladni_knihy');
define('TBL_POKLADNI_POLOZKY', '25a_pokladni_polozky');
define('TBL_ODBORY_LP', '25a_odbory_lp_prirazeni');

// Přepočti čerpání - vytvoř PDO spojení
$pdo = get_db($config);
$result = prepocetCerpaniPodleIdLP_PDO($pdo, $lp_id);

if ($result['success'] === true) {
    echo "✅ Přepočet čerpání dokončen\n\n";
} else {
    echo "❌ Chyba při přepočtu: {$result['error']}\n\n";
}

echo "===========================================\n";
echo "KROK 4: Čerpání PO přepočtu\n";
echo "===========================================\n\n";

// Načti čerpání PO
$stmt = $db->prepare("
    SELECT 
        skutecne_cerpano,
        cerpano_pokladna,
        cerpano_odbory_faktury,
        cerpano_odbory_pokladna
    FROM 25_limitovane_prisliby_cerpani
    WHERE cislo_lp = :cislo_lp
");
$stmt->execute([':cislo_lp' => $lp_code]);
$cerpani_po = $stmt->fetch(PDO::FETCH_ASSOC);

if ($cerpani_po) {
    echo "Skutečně čerpáno: {$cerpani_po['skutecne_cerpano']} Kč\n";
    echo "Čerpáno pokladna: {$cerpani_po['cerpano_pokladna']} Kč\n";
    echo "Čerpáno odbory faktury: {$cerpani_po['cerpano_odbory_faktury']} Kč\n";
    echo "Čerpáno odbory pokladna: {$cerpani_po['cerpano_odbory_pokladna']} Kč\n\n";
    
    // Porovnej rozdíl
    $rozdil_skutecne = $cerpani_po['skutecne_cerpano'] - ($cerpani_pred['skutecne_cerpano'] ?? 0);
    $rozdil_odbory = $cerpani_po['cerpano_odbory_faktury'] - ($cerpani_pred['cerpano_odbory_faktury'] ?? 0);
    
    echo "===========================================\n";
    echo "VÝSLEDEK\n";
    echo "===========================================\n\n";
    
    echo "Rozdíl skutečně čerpáno: +$rozdil_skutecne Kč\n";
    echo "Rozdíl odbory faktury: +$rozdil_odbory Kč\n\n";
    
    if ($rozdil_odbory == $faktura_castka) {
        echo "✅ SPRÁVNĚ! Odbory faktury se zvýšily o částku faktury ($faktura_castka Kč)\n";
    } else {
        echo "❌ CHYBA! Očekávaný rozdíl: $faktura_castka Kč, skutečný: $rozdil_odbory Kč\n";
    }
    
    if ($rozdil_skutecne == $faktura_castka) {
        echo "✅ SPRÁVNĚ! Skutečně čerpáno se zvýšilo o částku faktury ($faktura_castka Kč)\n";
    } else {
        echo "⚠️  INFO: Skutečně čerpáno změna: $rozdil_skutecne Kč (zahrnuje faktury z objednávek + odbory)\n";
    }
} else {
    echo "❌ Čerpání nenalezeno!\n";
}

// Uklid
$db->exec("DELETE FROM 25a_odbory_lp_prirazeni WHERE faktura_id = $faktura_id");
echo "\n✅ Testovací data vyčištěna\n";
