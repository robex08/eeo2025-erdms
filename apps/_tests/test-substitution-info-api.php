<?php

// Test substitution info v API response

// Load .env
$dotenv_path = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env';
if (file_exists($dotenv_path)) {
    $lines = file($dotenv_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value, '"\'');
        }
    }
}

// ============================================================
// Setup: Vytvoř test data - objednávka s schválením v zastoupení
// ============================================================

echo "========================================\n";
echo "TEST: Substitution Info v OrderV3 List\n";
echo "========================================\n\n";

// Připoj k DB
$db = new PDO(
    'mysql:host=' . $_ENV['DB_HOST'] . ';dbname=' . $_ENV['DB_NAME'],
    $_ENV['DB_USER'],
    $_ENV['DB_PASSWORD']
);

// Admin (ID=1) = zástupce
// Robert Holovský (ID=100) = zastupovaný
// Objednávka (ID=1545) = ta kterou admin schválil v zastoupení

// Zjisti token admina
$user_query = "SELECT id, username, jmeno, prijmeni FROM 25_uzivatele WHERE id = 1";
$stmt = $db->prepare($user_query);
$stmt->execute();
$admin_user = $stmt->fetch(PDO::FETCH_ASSOC);

echo "1️⃣  Admin uživatel: " . $admin_user['jmeno'] . " " . $admin_user['prijmeni'] . " (ID=" . $admin_user['id'] . ")\n\n";

// Načti objednávku 1545 s jejím schválením
$order_query = "
SELECT 
    o.id,
    o.cislo_objednavky,
    o.schvalovatel_id,
    o.dt_schvaleni,
    o.potvrdil_vecnou_spravnost_id,
    o.dt_potvrzeni_vecne_spravnosti,
    u_schv.jmeno as schvalovatel_jmeno,
    u_schv.prijmeni as schvalovatel_prijmeni,
    u_potvr.jmeno as potvr_jmeno,
    u_potvr.prijmeni as potvr_prijmeni
FROM 25a_objednavky o
LEFT JOIN 25_uzivatele u_schv ON o.schvalovatel_id = u_schv.id
LEFT JOIN 25_uzivatele u_potvr ON o.potvrdil_vecnou_spravnost_id = u_potvr.id
WHERE o.id = 1545
";

$stmt = $db->prepare($order_query);
$stmt->execute();
$order = $stmt->fetch(PDO::FETCH_ASSOC);

echo "2️⃣  Objednávka:\n";
echo "   ID: " . $order['id'] . "\n";
echo "   Číslo: " . $order['cislo_objednavky'] . "\n";
echo "   Schvalovatel: " . $order['schvalovatel_jmeno'] . " " . $order['schvalovatel_prijmeni'] . " (ID=" . $order['schvalovatel_id'] . ")\n";
echo "   Schválena: " . $order['dt_schvaleni'] . "\n";
if ($order['potvrdil_vecnou_spravnost_id']) {
    echo "   Potvrzovatel věcné správnosti: " . $order['potvr_jmeno'] . " " . $order['potvr_prijmeni'] . " (ID=" . $order['potvrdil_vecnou_spravnost_id'] . ")\n";
    echo "   Potvrzeno: " . $order['dt_potvrzeni_vecne_spravnosti'] . "\n";
}
echo "\n";

// Zkontroluj audit log - mělo by tam být zastupování
echo "3️⃣  Kontrola audit logu (25_zastupovani_akce_log):\n";
$audit_query = "
SELECT 
    z.id,
    z.zastupovani_id,
    z.zastupce_id,
    z.zastupovany_id,
    z.akce_typ,
    z.objekt_typ,
    z.objekt_id,
    z.popis_akce,
    z.dt_akce
FROM 25_zastupovani_akce_log z
WHERE z.zastupce_id = 1 
  AND z.akce_typ = 'APPROVE'
  AND z.objekt_id = 1545
ORDER BY z.dt_akce DESC
LIMIT 1
";

$stmt = $db->prepare($audit_query);
$stmt->execute();
$audit = $stmt->fetch(PDO::FETCH_ASSOC);

if ($audit) {
    echo "   ✅ AUDIT LOG ZÁZNAM NALEZEN:\n";
    echo "      ID: " . $audit['id'] . "\n";
    echo "      Zástupce: ID=" . $audit['zastupce_id'] . " (Admin)\n";
    echo "      Zastupovaný: ID=" . $audit['zastupovany_id'] . "\n";
    echo "      Akce: " . $audit['akce_typ'] . " pro " . $audit['objekt_typ'] . " #" . $audit['objekt_id'] . "\n";
    echo "      Čas: " . $audit['dt_akce'] . "\n";
} else {
    echo "   ❌ AUDIT LOG ZÁZNAM NENALEZEN!\n";
}
echo "\n";

// 4. Zavolej API endpoint pro seznam objednávek
echo "4️⃣  Test API - OrderV3 List s filtry:\n";

// Vytvoř curl request na API
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/api.eeo/order-v3/list');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'token' => 'test-token', // Měl by být ignorován pro local test
    'username' => $admin_user['username'],
    'per_page' => 10,
    'filters' => [
        'cislo_objednavky' => $order['cislo_objednavky']
    ]
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
curl_setopt($ch, CURLOPT_USERPWD, $admin_user['username'] . ':pass');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response_json = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "   HTTP Status: " . $http_code . "\n";

if ($http_code == 200) {
    $response = json_decode($response_json, true);
    
    if ($response && isset($response['data']['orders']) && count($response['data']['orders']) > 0) {
        $returned_order = $response['data']['orders'][0];
        echo "   ✅ Objednávka vracena v API response\n";
        echo "      ID: " . $returned_order['id'] . "\n";
        echo "      Číslo: " . $returned_order['cislo_objednavky'] . "\n";
        
        // KRITICKÉ: Zkontroluj substitution_info
        if (isset($returned_order['substitution_info'])) {
            echo "\n   🎯 SUBSTITUTION_INFO:\n";
            
            if (!empty($returned_order['substitution_info'])) {
                echo "      ✅ SUBSTITUTION INFO OBSAŽENO!\n";
                
                if (isset($returned_order['substitution_info']['schvalovatel'])) {
                    $sub = $returned_order['substitution_info']['schvalovatel'];
                    echo "      📍 SCHVÁLENÍ (APPROVE):\n";
                    echo "         zastupovany_id: " . $sub['zastupovany_id'] . "\n";
                    echo "         zastupovany_jmeno: " . $sub['zastupovany_jmeno'] . "\n";
                    echo "         dt_akce: " . $sub['dt_akce'] . "\n";
                }
                
                if (isset($returned_order['substitution_info']['potvrdil_vecnou_spravnost'])) {
                    $sub = $returned_order['substitution_info']['potvrdil_vecnou_spravnost'];
                    echo "      📍 POTVRZENÍ (CONFIRM):\n";
                    echo "         zastupovany_id: " . $sub['zastupovany_id'] . "\n";
                    echo "         zastupovany_jmeno: " . $sub['zastupovany_jmeno'] . "\n";
                    echo "         dt_akce: " . $sub['dt_akce'] . "\n";
                }
            } else {
                echo "      ⚠️  substitution_info je PRÁZDNÉ (akce nebyla v zastoupení)\n";
            }
        } else {
            echo "   ❌ SUBSTITUTION_INFO CHYBÍ V RESPONSE!\n";
        }
    } else {
        echo "   ❌ Objednávka NENÍ v response!\n";
        echo "   Response: " . substr($response_json, 0, 200) . "...\n";
    }
} else {
    echo "   ❌ API vrátilo chybu: HTTP " . $http_code . "\n";
    echo "   Response: " . substr($response_json, 0, 200) . "...\n";
}

echo "\n========================================\n";
echo "✅ TEST HOTOV\n";
echo "========================================\n";

?>
