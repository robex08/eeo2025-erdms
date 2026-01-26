<?php
/**
 * TEST SCRIPT: Ověření funkce "show_only_inactive" filtru
 * 
 * Tento skript testuje backend API endpoint pro filtrování neaktivních objednávek
 */

// Načtení konfigurace
$config_file = __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/config.php';
if (!file_exists($config_file)) {
    die("❌ Config file not found: $config_file\n");
}

require_once $config_file;
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php';

echo "=============================================================================\n";
echo "TEST: show_only_inactive filter\n";
echo "=============================================================================\n\n";

// Připojení k databázi
$db = get_db($config);

// 1. Zjistit počet aktivních objednávek (aktivni = 1)
$stmt = $db->prepare("SELECT COUNT(*) as count FROM objednavky25 WHERE aktivni = 1");
$stmt->execute();
$activeCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

echo "📊 Aktivní objednávky (aktivni = 1): $activeCount\n";

// 2. Zjistit počet neaktivních objednávek (aktivni = 0)
$stmt = $db->prepare("SELECT COUNT(*) as count FROM objednavky25 WHERE aktivni = 0");
$stmt->execute();
$inactiveCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

echo "📊 Neaktivní objednávky (aktivni = 0): $inactiveCount\n\n";

// 3. Ukázat příklady neaktivních objednávek
if ($inactiveCount > 0) {
    echo "Příklady neaktivních objednávek:\n";
    echo "----------------------------------------\n";
    
    $stmt = $db->prepare("
        SELECT 
            id,
            objednavka_cislo,
            stav_objednavky,
            aktivni,
            datum_vytvoreni
        FROM objednavky25 
        WHERE aktivni = 0
        ORDER BY datum_vytvoreni DESC
        LIMIT 5
    ");
    $stmt->execute();
    $examples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($examples as $order) {
        echo sprintf(
            "ID: %d | Číslo: %s | Stav: %s | Aktivní: %d | Vytvořeno: %s\n",
            $order['id'],
            $order['objednavka_cislo'],
            $order['stav_objednavky'],
            $order['aktivni'],
            $order['datum_vytvoreni']
        );
    }
} else {
    echo "ℹ️ Žádné neaktivní objednávky v databázi\n";
}

echo "\n=============================================================================\n";
echo "✅ TEST DOKONČEN\n";
echo "=============================================================================\n\n";

echo "📝 INSTRUKCE PRO FRONTEND TEST:\n";
echo "1. Otevřete OrderList25 v prohlížeči\n";
echo "2. Přihlaste se jako ADMIN (SUPERADMIN nebo ADMINISTRATOR role)\n";
echo "3. Zaškrtněte checkbox 'Jen neaktivní'\n";
echo "4. Měli byste vidět $inactiveCount neaktivních objednávek\n";
echo "5. Odškrtněte checkbox - měli byste vidět $activeCount aktivních objednávek\n\n";
