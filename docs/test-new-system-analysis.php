<?php
/**
 * 🎯 ANALÝZA: Kdo by dostal notifikaci s NOVÝM hierarchyTriggers systémem
 * 
 * PŘESNÁ ANALÝZA bez odesílání emailů
 */

// DB konfigurace
$config = require('/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php');

// DB připojení
function create_db_connection() {
    global $config;
    $dsn = "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4";
    return new PDO($dsn, $config['mysql']['username'], $config['mysql']['password'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ));
}

// Konstanty (potřebné pro hierarchyTriggers)
define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');
define('TBL_NASTAVENI_GLOBALNI', '25a_nastaveni_globalni');
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');
define('TBL_ROLE', '25_role');
define('TBL_NOTIFIKACE_TYPY_UDALOSTI', '25_notifikace_typy_udalosti');
define('TBL_NOTIFICATION_TEMPLATES', '25_notification_templates');
define('TBL_ORGANIZACNI_STRUKTURA', '25_organizacni_struktura');
define('TBL_USEK', '25_usek');
define('TBL_LOCATIONS', '25_locations');

require_once('/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php');

try {
    $pdo = create_db_connection();
    
    echo "🎯 ANALÝZA RECIPIENT RESOLUTION - NOVÝ SYSTÉM\n";
    echo "══════════════════════════════════════════════════════════════\n\n";

    // Najdi poslední objednávky s ORDER_PENDING_APPROVAL notifikacemi
    echo "1️⃣ Poslední 3 objednávky s ORDER_PENDING_APPROVAL notifikacemi:\n";
    $stmt = $pdo->prepare("
        SELECT DISTINCT o.id, o.cislo_objednavky, o.objednatel_id, o.garant_uzivatel_id, o.dt_vytvoreni,
               u1.jmeno as objednatel_jmeno, u1.prijmeni as objednatel_prijmeni,
               u2.jmeno as garant_jmeno, u2.prijmeni as garant_prijmeni
        FROM 25a_objednavky o
        LEFT JOIN 25_uzivatele u1 ON o.objednatel_id = u1.id  
        LEFT JOIN 25_uzivatele u2 ON o.garant_uzivatel_id = u2.id
        WHERE o.id IN (
            SELECT DISTINCT objekt_id 
            FROM 25_notifikace 
            WHERE typ = 'ORDER_PENDING_APPROVAL'
        )
        ORDER BY o.id DESC 
        LIMIT 3
    ");
    $stmt->execute();
    $orders = $stmt->fetchAll();
    
    foreach ($orders as $order) {
        echo "   📋 Objednávka {$order['id']}: {$order['cislo_objednavky']}\n";
        echo "      Objednatel: {$order['objednatel_jmeno']} {$order['objednatel_prijmeni']} (ID {$order['objednatel_id']})\n";
        echo "      Garant: {$order['garant_jmeno']} {$order['garant_prijmeni']} (ID {$order['garant_uzivatel_id']})\n";
        echo "      Vytvořeno: {$order['dt_vytvoreni']}\n\n";
    }

    echo "2️⃣ Testování NOVÉHO hierarchyTriggers systému:\n\n";

    foreach ($orders as $order) {
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "🔍 OBJEDNÁVKA: {$order['cislo_objednavky']} (ID {$order['id']})\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

        // Příprava dat pro resolveHierarchyNotificationRecipients
        $eventData = array(
            'order_id' => $order['id'],
            'order_number' => $order['cislo_objednavky'],
            'objednatel_id' => $order['objednatel_id'],
            'garant_uzivatel_id' => $order['garant_uzivatel_id'],
            // Další relevantní data
            'entity_type' => 'orders',
            'entity_id' => $order['id']
        );

        echo "   📊 Event Data:\n";
        echo "      - objednatel_id: {$order['objednatel_id']}\n";
        echo "      - garant_uzivatel_id: {$order['garant_uzivatel_id']}\n\n";

        // Volání nového systému  
        echo "   🎯 Volání resolveHierarchyNotificationRecipients()...\n";
        $result = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData, $pdo);

        if ($result === false) {
            echo "   ❌ ŽÁDNÍ PŘÍJEMCI (systém vrátil false)\n\n";
            continue;
        }

        echo "   ✅ VÝSLEDEK:\n";
        echo "      Priority: {$result['priority']}\n";
        echo "      Variant ID: {$result['variant_id']}\n";
        echo "      Počet příjemců: " . count($result['recipients']) . "\n\n";

        echo "   📋 DETAILNÍ SEZNAM PŘÍJEMCŮ:\n";
        echo "   " . str_repeat("─", 80) . "\n";
        printf("   %-4s %-20s %-15s %-15s %-10s %-8s\n", 
               "ID", "Jméno", "Email", "InApp", "Důvod", "Role");
        echo "   " . str_repeat("─", 80) . "\n";

        foreach ($result['recipients'] as $recipient) {
            // Načti údaje příjemce
            $stmt = $pdo->prepare("
                SELECT u.id, u.jmeno, u.prijmeni, u.email,
                       GROUP_CONCAT(r.nazev_role SEPARATOR ', ') as role_names
                FROM 25_uzivatele u
                LEFT JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
                LEFT JOIN 25_role r ON ur.role_id = r.id
                WHERE u.id = ?
                GROUP BY u.id
            ");
            $stmt->execute([$recipient['user_id']]);
            $userInfo = $stmt->fetch();

            if ($userInfo) {
                $name = $userInfo['jmeno'] . ' ' . $userInfo['prijmeni'];
                $email = $recipient['delivery']['email'] ? '✅' : '❌';
                $inapp = $recipient['delivery']['inApp'] ? '✅' : '❌';
                
                printf("   %-4d %-20s %-15s %-15s %-10s %-8s\n",
                       $recipient['user_id'],
                       substr($name, 0, 20),
                       $email,
                       $inapp,
                       $recipient['reason'] ?? 'N/A',
                       substr($userInfo['role_names'] ?? 'N/A', 0, 8)
                );
            }
        }
        echo "   " . str_repeat("─", 80) . "\n\n";

        // Porovnání se STARÝM systémem (co se skutečně poslalo)
        echo "   📧 POROVNÁNÍ SE STARÝM SYSTÉMEM:\n";
        $stmt = $pdo->prepare("
            SELECT n.pro_uzivatele_id, u.jmeno, u.prijmeni, n.nadpis
            FROM 25_notifikace n
            JOIN 25_uzivatele u ON n.pro_uzivatele_id = u.id
            WHERE n.typ = 'ORDER_PENDING_APPROVAL' AND n.objekt_id = ?
            ORDER BY n.id
        ");
        $stmt->execute([$order['id']]);
        $oldRecipients = $stmt->fetchAll();

        echo "   STARÝ systém poslal: " . count($oldRecipients) . " příjemců\n";
        foreach ($oldRecipients as $old) {
            echo "      - {$old['jmeno']} {$old['prijmeni']} (ID {$old['pro_uzivatele_id']})\n";
        }

        echo "\n   🔍 ROZDÍL:\n";
        $newIds = array_column($result['recipients'], 'user_id');
        $oldIds = array_column($oldRecipients, 'pro_uzivatele_id');
        
        $added = array_diff($newIds, $oldIds);
        $removed = array_diff($oldIds, $newIds);
        
        if (!empty($added)) {
            echo "      ➕ NOVĚ by dostali: " . implode(', ', $added) . "\n";
        }
        if (!empty($removed)) {
            echo "      ➖ UŽ by NEDostali: " . implode(', ', $removed) . "\n";
        }
        if (empty($added) && empty($removed)) {
            echo "      🆔 Stejní příjemci\n";
        }

        echo "\n";
    }

    echo "══════════════════════════════════════════════════════════════\n";
    echo "✅ ANALÝZA DOKONČENA\n";

} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}