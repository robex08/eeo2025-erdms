#!/usr/bin/env php
<?php
/**
 * TEST: Kontrola notifikací pro věcnou správnost
 * 
 * Ověřuje:
 * 1. Zda existují event types INVOICE_MATERIAL_CHECK_REQUESTED a INVOICE_MATERIAL_CHECK_APPROVED
 * 2. Zda jsou k nim připojené template v hierarchickém profilu
 * 3. Zda se generují notifikace při změně workflow stavu
 * 
 * Usage: php test_workflow_notifications_vecna.php [order_id]
 */

// Přímé připojení k databázi (DEV)
try {
    $pdo = new PDO(
        "mysql:host=10.3.172.11;port=3306;dbname=eeo2025-dev;charset=utf8mb4",
        "erdms_user",
        "AhchohTahnoh7eim",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    die("❌ Chyba připojení k databázi: " . $e->getMessage() . "\n");
}

echo "=================================================================\n";
echo "TEST WORKFLOW NOTIFIKACÍ PRO VĚCNOU SPRÁVNOST\n";
echo "=================================================================\n\n";

// Zkontrolovat event types
echo "1. KONTROLA EVENT TYPES\n";
echo "-----------------------------------------------------------------\n";

$sql = "SELECT * FROM notification_event_types WHERE event_type IN ('INVOICE_MATERIAL_CHECK_REQUESTED', 'INVOICE_MATERIAL_CHECK_APPROVED')";
$stmt = $pdo->query($sql);
$eventTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($eventTypes)) {
    echo "❌ CHYBA: Event types NENALEZENY v databázi!\n\n";
} else {
    foreach ($eventTypes as $event) {
        echo "✅ Event Type: {$event['event_type']}\n";
        echo "   - Název: {$event['event_name']}\n";
        echo "   - Popis: {$event['description']}\n";
        echo "   - Aktivní: " . ($event['is_active'] ? 'ANO' : 'NE') . "\n\n";
    }
}

// Zkontrolovat templates v hierarchickém profilu
echo "2. KONTROLA TEMPLATES V HIERARCHICKÉM PROFILU\n";
echo "-----------------------------------------------------------------\n";

$sql = "SELECT 
    nht.id,
    nht.event_type,
    nht.template_name,
    nht.is_active,
    nhp.profile_name,
    nhp.is_active as profile_active
FROM notification_hierarchy_templates nht
JOIN notification_hierarchy_profiles nhp ON nht.hierarchy_profile_id = nhp.id
WHERE nht.event_type IN ('INVOICE_MATERIAL_CHECK_REQUESTED', 'INVOICE_MATERIAL_CHECK_APPROVED')
ORDER BY nht.event_type, nhp.profile_name";

$stmt = $pdo->query($sql);
$templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($templates)) {
    echo "❌ CHYBA: NENALEZENY templates pro věcnou správnost!\n\n";
} else {
    foreach ($templates as $tpl) {
        echo "✅ Template: {$tpl['template_name']}\n";
        echo "   - Event Type: {$tpl['event_type']}\n";
        echo "   - Profil: {$tpl['profile_name']}\n";
        echo "   - Template aktivní: " . ($tpl['is_active'] ? 'ANO' : 'NE') . "\n";
        echo "   - Profil aktivní: " . ($tpl['profile_active'] ? 'ANO' : 'NE') . "\n\n";
    }
}

// Pokud je zadán order_id, zkontrolovat konkrétní objednávku
if ($argc > 1) {
    $orderId = intval($argv[1]);
    
    echo "3. KONTROLA OBJEDNÁVKY #$orderId\n";
    echo "-----------------------------------------------------------------\n";
    
    // Načíst objednávku
    $sql = "SELECT 
        ev_cislo,
        predmet,
        stav_workflow_kod,
        potvrzeni_vecne_spravnosti,
        potvrdil_vecnou_spravnost_id,
        dt_potvrzeni_vecne_spravnosti
    FROM objednavky
    WHERE id = :id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        echo "❌ CHYBA: Objednávka #$orderId NENALEZENA!\n\n";
    } else {
        echo "Objednávka: {$order['ev_cislo']}\n";
        echo "Předmět: {$order['predmet']}\n";
        echo "Workflow stav: {$order['stav_workflow_kod']}\n";
        echo "Věcná správnost checkbox: " . ($order['potvrzeni_vecne_spravnosti'] ? 'ZAŠKRTNUT' : 'NEZAŠKRTNUT') . "\n";
        echo "Potvrdil: " . ($order['potvrdil_vecnou_spravnost_id'] ?? 'NIKDO') . "\n";
        echo "Datum potvrzení: " . ($order['dt_potvrzeni_vecne_spravnosti'] ?? 'NENÍ') . "\n\n";
        
        // Zkontrolovat faktury
        $sql = "SELECT 
            id,
            fa_cislo_vema,
            vecna_spravnost_potvrzeno,
            potvrdil_vecnou_spravnost_id,
            dt_potvrzeni_vecne_spravnosti
        FROM faktury
        WHERE objednavka_id = :order_id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['order_id' => $orderId]);
        $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Faktury: " . count($faktury) . "\n";
        if (!empty($faktury)) {
            foreach ($faktury as $fa) {
                echo "  - FA #{$fa['id']} ({$fa['fa_cislo_vema']})\n";
                echo "    Věcná potvrzena: " . ($fa['vecna_spravnost_potvrzeno'] ? 'ANO' : 'NE') . "\n";
                echo "    Potvrdil: " . ($fa['potvrdil_vecnou_spravnost_id'] ?? 'NIKDO') . "\n";
                echo "    Datum: " . ($fa['dt_potvrzeni_vecne_spravnosti'] ?? 'NENÍ') . "\n\n";
            }
        }
        
        // Zkontrolovat notifikace pro tuto objednávku
        echo "4. NOTIFIKACE PRO OBJEDNÁVKU #$orderId\n";
        echo "-----------------------------------------------------------------\n";
        
        $sql = "SELECT 
            n.id,
            n.event_type,
            n.subject,
            n.status,
            n.dt_created,
            u.jmeno,
            u.prijmeni
        FROM notifications n
        LEFT JOIN uzivatele u ON n.user_id = u.id
        WHERE n.event_type IN ('INVOICE_MATERIAL_CHECK_REQUESTED', 'INVOICE_MATERIAL_CHECK_APPROVED')
        AND n.order_id = :order_id
        ORDER BY n.dt_created DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['order_id' => $orderId]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($notifications)) {
            echo "⚠️ NENALEZENY ŽÁDNÉ notifikace pro věcnou správnost!\n";
            echo "   → Buď se workflow stav nezměnil, nebo notifikace selhaly.\n\n";
        } else {
            foreach ($notifications as $notif) {
                echo "✉️ Notifikace #{$notif['id']}\n";
                echo "   - Event: {$notif['event_type']}\n";
                echo "   - Příjemce: {$notif['jmeno']} {$notif['prijmeni']}\n";
                echo "   - Předmět: {$notif['subject']}\n";
                echo "   - Stav: {$notif['status']}\n";
                echo "   - Vytvořeno: {$notif['dt_created']}\n\n";
            }
        }
    }
}

echo "\n=================================================================\n";
echo "DOPORUČENÍ:\n";
echo "-----------------------------------------------------------------\n";
echo "1. Zkontroluj browser console v OrderForm při uložení objednávky\n";
echo "2. Hledej log: 'Notifikace odeslána: věcná správnost vyžadována'\n";
echo "3. Hledej log: 'Notifikace odeslána: věcná správnost potvrzena'\n";
echo "4. Zkontroluj že oldWorkflowKod !== result.stav_workflow_kod\n";
echo "=================================================================\n";
