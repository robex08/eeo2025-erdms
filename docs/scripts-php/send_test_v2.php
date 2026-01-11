#!/usr/bin/php
<?php
/**
 * NOVÝ Test - posílá aktuální verzi přímo z DB
 */

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'CHANGE_ME_DB_PASSWORD';
$dbName = 'eeo2025';

require_once __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mail.php';

echo "====================================================================\n";
echo "NOVÝ TEST - Aktuální verze z DB\n";
echo "====================================================================\n\n";

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Načtení aktuální šablony
    $stmt = $pdo->query("SELECT email_telo, LENGTH(email_telo) as size FROM 25_notifikace_sablony WHERE typ = 'order_status_ke_schvaleni'");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✅ Načteno z DB: " . number_format($row['size']) . " bytů\n\n";
    
    $html = $row['email_telo'];
    
    // Testovací data
    $testData = [
        '{recipient_name}' => 'Robert Holovský',
        '{order_number}' => 'OBJ-2025-TEST-002',
        '{predmet}' => 'TEST v2 - Opravený header pro Outlook',
        '{strediska}' => 'IT oddělení - Testování v2',
        '{financovani}' => 'Rozpočet IT',
        '{financovani_poznamka}' => 'Test opravy headeru - vnořené tabulky',
        '{amount}' => '1 234 567 Kč',
        '{date}' => date('d.m.Y H:i:s'),
        '{order_id}' => '99999',
        '{approver_name}' => 'Testovací schvalovatel'
    ];
    
    // NORMAL verze
    preg_match('/<!-- RECIPIENT: APPROVER_NORMAL -->(.*)<!-- RECIPIENT: APPROVER_URGENT -->/s', $html, $matches);
    if ($matches[1]) {
        $normalHtml = $matches[1];
        foreach ($testData as $k => $v) {
            $normalHtml = str_replace($k, $v, $normalHtml);
        }
        
        $result = eeo_mail_send(
            'robert.holovsky@zachranka.cz',
            '❗ TEST v2 - Opravený header (NORMAL)',
            $normalHtml,
            ['html' => true, 'from_email' => 'erdms@zachranka.cz', 'from_name' => 'eRDMS Test v2']
        );
        
        echo "📧 NORMAL: " . ($result['ok'] ? '✅ Odesláno' : '❌ Chyba') . "\n";
    }
    
    sleep(1);
    
    // URGENT verze
    preg_match('/<!-- RECIPIENT: APPROVER_URGENT -->(.*)<!-- RECIPIENT: SUBMITTER -->/s', $html, $matches);
    if ($matches[1]) {
        $urgentHtml = $matches[1];
        foreach ($testData as $k => $v) {
            $urgentHtml = str_replace($k, $v, $urgentHtml);
        }
        
        $result = eeo_mail_send(
            'robert.holovsky@zachranka.cz',
            '⚡ TEST v2 - Opravený header (URGENT)',
            $urgentHtml,
            ['html' => true, 'from_email' => 'erdms@zachranka.cz', 'from_name' => 'eRDMS Test v2']
        );
        
        echo "📧 URGENT: " . ($result['ok'] ? '✅ Odesláno' : '❌ Chyba') . "\n";
    }
    
    sleep(1);
    
    // SUBMITTER verze
    preg_match('/<!-- RECIPIENT: SUBMITTER -->(.*)$/s', $html, $matches);
    if ($matches[1]) {
        $submitterHtml = $matches[1];
        $submitterHtml = preg_replace('/<\/html>\s*$/i', '</html>', $submitterHtml);
        foreach ($testData as $k => $v) {
            $submitterHtml = str_replace($k, $v, $submitterHtml);
        }
        
        $result = eeo_mail_send(
            'robert.holovsky@zachranka.cz',
            'ℹ️ TEST v2 - Opravený header (SUBMITTER)',
            $submitterHtml,
            ['html' => true, 'from_email' => 'erdms@zachranka.cz', 'from_name' => 'eRDMS Test v2']
        );
        
        echo "📧 SUBMITTER: " . ($result['ok'] ? '✅ Odesláno' : '❌ Chyba') . "\n";
    }
    
    echo "\n====================================================================\n";
    echo "✅ HOTOVO! Zkontroluj nové emaily s prefixem 'TEST v2'\n";
    echo "   Header by měl být nyní správně naformátovaný!\n";
    echo "====================================================================\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
