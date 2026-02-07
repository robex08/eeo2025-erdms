#!/usr/bin/php
<?php
/**
 * Test šablony: order_vecna_spravnost_zamitnuta
 */

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'CHANGE_ME_DB_PASSWORD';
$dbName = 'eeo2025';

require_once __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mail.php';

echo "====================================================================\n";
echo "TEST: order_vecna_spravnost_zamitnuta (VĚCNÁ SPRÁVNOST)\n";
echo "====================================================================\n\n";

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("SELECT email_telo FROM 25_notifikace_sablony WHERE typ = 'order_vecna_spravnost_zamitnuta'");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✅ Načteno z DB: " . number_format(strlen($row['email_telo'])) . " bytů\n\n";
    
    $html = $row['email_telo'];
    
    // Testovací data - urgentní reklamace
    $testData = [
        '{recipient_name}' => 'Robert Holovský',
        '{order_number}' => 'OBJ-2025-TEST-REKLAMACE',
        '{predmet}' => 'TEST - Reklamace objednávky',
        '{strediska}' => 'IT oddělení',
        '{financovani}' => 'Rozpočet IT',
        '{amount}' => '50 000 Kč',
        '{date}' => date('d.m.Y H:i:s'),
        '{order_id}' => '77777',
        '{duvod}' => 'Testovací důvod zamítnutí věčné kontroly',
        '{poznamka}' => 'Toto je testovací email pro ověření Outlook kompatibility'
    ];
    
    foreach ($testData as $k => $v) {
        $html = str_replace($k, $v, $html);
    }
    
    $result = eeo_mail_send(
        'robert.holovsky@zachranka.cz',
        '❗ TEST - Věcná správnost (fixed)',
        $html,
        ['html' => true, 'from_email' => 'erdms@zachranka.cz', 'from_name' => 'eRDMS Test']
    );
    
    echo "📧 VĚCNÁ SPRÁVNOST: " . ($result['ok'] ? '✅ Odesláno' : '❌ Chyba') . "\n";
    echo "\n====================================================================\n";
    echo "✅ HOTOVO!\n";
    echo "====================================================================\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
