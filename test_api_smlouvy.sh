#!/bin/bash
# Test API endpoint pro seznam smluv s statistikami

# Získat SESSION_ID z cookies nebo použít test token
# Pro dev prostředí použijeme direct API call

cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo

# Simulace API volání pomocí PHP skriptu
php -r '
// Načíst API
require_once __DIR__ . "/api.php";

// Simulovat request
$_SERVER["REQUEST_METHOD"] = "GET";
$_GET["action"] = "ciselniky/smlouvy/list";
$_GET["include_stats"] = "true";
$_GET["limit"] = "100";

// Mock uživatele (ID 1 = admin)
$_SESSION["user_id"] = 1;
$_SESSION["user_role"] = "administrator";

// Zavolat handler
$response = handle_smlouvy_list();

// Najít smlouvu S-132/75030926/22
if (isset($response["data"]) && is_array($response["data"])) {
    foreach ($response["data"] as $smlouva) {
        if ($smlouva["cislo_smlouvy"] === "S-132/75030926/22") {
            echo "=== SMLOUVA S-132/75030926/22 ===\n";
            echo "ID: " . $smlouva["id"] . "\n";
            echo "Název: " . $smlouva["nazev_smlouvy"] . "\n";
            echo "pocet_objednavek: " . $smlouva["pocet_objednavek"] . "\n";
            echo "pocet_faktur_celkem: " . $smlouva["pocet_faktur_celkem"] . "\n";
            echo "Badge by měl ukazovat: " . ($smlouva["pocet_objednavek"] + $smlouva["pocet_faktur_celkem"]) . "\n";
            exit(0);
        }
    }
    echo "❌ Smlouva S-132/75030926/22 nebyla nalezena v odpovědi API\n";
} else {
    echo "❌ API nevrátilo platná data\n";
    echo "Response: " . json_encode($response, JSON_PRETTY_PRINT) . "\n";
}
'
