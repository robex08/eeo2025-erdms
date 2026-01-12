#!/usr/bin/env php
<?php
/**
 * Debug script pro testování notifikačního systému
 * Spustit: php test_notifications_debug.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "════════════════════════════════════════════════════════════════\n";
echo "  NOTIFIKAČNÍ SYSTÉM - DEBUG TEST\n";
echo "════════════════════════════════════════════════════════════════\n\n";

// 1. Test DB připojení
echo "1️⃣ Test databázového připojení...\n";
try {
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
    $dbConfig = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
    
    $dsn = 'mysql:host=' . $dbConfig['mysql']['host'] . ';dbname=' . $dbConfig['mysql']['database'] . ';charset=utf8mb4';
    $db = new PDO($dsn, $dbConfig['mysql']['username'], $dbConfig['mysql']['password']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "   ✅ DB připojení: OK\n";
    echo "   Database: " . $dbConfig['mysql']['database'] . "\n";
    echo "   Host: " . $dbConfig['mysql']['host'] . "\n\n";
    
} catch (Exception $e) {
    echo "   ❌ DB připojení: FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// 2. Test existence tabulek
echo "2️⃣ Test existence notifikačních tabulek...\n";
$tables = ['25_notifikace', '25_notifikace_precteni', '25_notifikace_sablony', '25_notifikace_typy_udalosti'];
foreach ($tables as $table) {
    try {
        $stmt = $db->query("SELECT COUNT(*) FROM $table");
        $count = $stmt->fetchColumn();
        echo "   ✅ $table: $count záznamů\n";
    } catch (Exception $e) {
        echo "   ❌ $table: NEEXISTUJE\n";
    }
}
echo "\n";

// 3. Test posledních notifikací
echo "3️⃣ Posledních 3 notifikace...\n";
try {
    $stmt = $db->query("
        SELECT id, typ, nadpis, pro_uzivatele_id, dt_created 
        FROM 25_notifikace 
        ORDER BY dt_created DESC 
        LIMIT 3
    ");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   • ID:" . $row['id'] . " | " . $row['typ'] . " | Pro:" . $row['pro_uzivatele_id'] . " | " . $row['dt_created'] . "\n";
    }
} catch (Exception $e) {
    echo "   ❌ Chyba: " . $e->getMessage() . "\n";
}
echo "\n";

// 4. Test vytvoření notifikace
echo "4️⃣ Test vytvoření nové notifikace...\n";
try {
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';
    
    $timestamp = date('Y-m-d H:i:s');
    $params = [
        ':typ' => 'DEBUG_TEST',
        ':nadpis' => 'Debug test ' . date('H:i:s'),
        ':zprava' => 'Testovací notifikace pro debug',
        ':data_json' => json_encode(['timestamp' => $timestamp]),
        ':od_uzivatele_id' => 1,
        ':pro_uzivatele_id' => 23,
        ':prijemci_json' => null,
        ':pro_vsechny' => 0,
        ':priorita' => 'INFO',
        ':kategorie' => 'DEBUG',
        ':odeslat_email' => 0,
        ':objekt_typ' => 'debug',
        ':objekt_id' => 999,
        ':dt_expires' => null,
        ':dt_created' => $timestamp,
        ':aktivni' => 1
    ];
    
    $sql = "INSERT INTO " . TBL_NOTIFIKACE . " 
            (typ, nadpis, zprava, data_json, od_uzivatele_id, pro_uzivatele_id, prijemci_json, pro_vsechny, 
             priorita, kategorie, odeslat_email, objekt_typ, objekt_id, dt_expires, dt_created, aktivni) 
            VALUES 
            (:typ, :nadpis, :zprava, :data_json, :od_uzivatele_id, :pro_uzivatele_id, :prijemci_json, :pro_vsechny,
             :priorita, :kategorie, :odeslat_email, :objekt_typ, :objekt_id, :dt_expires, :dt_created, :aktivni)";
    
    $stmt = $db->prepare($sql);
    $result = $stmt->execute($params);
    
    if ($result) {
        $notifId = $db->lastInsertId();
        echo "   ✅ Notifikace vytvořena: ID = $notifId\n";
        
        // Vytvořit záznam v read tabulce
        $readSql = "INSERT INTO " . TBL_NOTIFIKACE_PRECTENI . " 
                    (notifikace_id, uzivatel_id, precteno, dt_created)
                    VALUES (:notifikace_id, :uzivatel_id, 0, :dt_created)";
        
        $readStmt = $db->prepare($readSql);
        $readStmt->execute([
            ':notifikace_id' => $notifId,
            ':uzivatel_id' => 23,
            ':dt_created' => $timestamp
        ]);
        
        echo "   ✅ Záznam v read tabulce vytvořen\n";
    }
} catch (Exception $e) {
    echo "   ❌ Chyba: " . $e->getMessage() . "\n";
}
echo "\n";

// 5. Test API handlers
echo "5️⃣ Test existence API handlerů...\n";
$files = [
    'notificationHandlers.php' => __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php',
    'handlers.php' => __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php',
    'hierarchyTriggers.php' => __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php'
];

foreach ($files as $name => $path) {
    if (file_exists($path)) {
        echo "   ✅ $name existuje\n";
    } else {
        echo "   ❌ $name NEEXISTUJE\n";
    }
}
echo "\n";

// 6. Test debug_notification_log tabulky
echo "6️⃣ Test debug logu...\n";
try {
    $stmt = $db->query("
        SELECT message, data, dt_created 
        FROM debug_notification_log 
        ORDER BY dt_created DESC 
        LIMIT 5
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($rows)) {
        echo "   ⚠️  Žádné záznamy v debug_notification_log\n";
    } else {
        echo "   Posledních 5 debug záznamů:\n";
        foreach ($rows as $row) {
            echo "   • " . $row['dt_created'] . " | " . $row['message'] . "\n";
        }
    }
} catch (Exception $e) {
    echo "   ❌ Tabulka debug_notification_log neexistuje nebo je prázdná\n";
}
echo "\n";

// 7. Test event types v DB
echo "7️⃣ Testované event types v DB...\n";
try {
    $stmt = $db->query("
        SELECT kod, nazev FROM 25_notifikace_typy_udalosti 
        WHERE kod IN ('ORDER_PENDING_APPROVAL', 'INVOICE_MATERIAL_CHECK_REQUESTED', 'INVOICE_MATERIAL_CHECK_APPROVED')
    ");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   ✅ " . $row['kod'] . " - " . $row['nazev'] . "\n";
    }
} catch (Exception $e) {
    echo "   ❌ Chyba: " . $e->getMessage() . "\n";
}

echo "\n════════════════════════════════════════════════════════════════\n";
echo "  TEST DOKONČEN\n";
echo "════════════════════════════════════════════════════════════════\n";
