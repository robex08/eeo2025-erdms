#!/usr/bin/php
<?php
/**
 * Test odeslání opravené šablony "order_status_ke_schvaleni" na email
 * robert.holovsky@zachranka.cz
 */

require_once __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mail.php';

echo "====================================================================\n";
echo "TEST ODESLÁNÍ OPRAVENÉ ŠABLONY - order_status_ke_schvaleni\n";
echo "====================================================================\n\n";

$config = require __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    // Připojení k DB
    $pdo = new PDO(
        "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
        $config['mysql']['username'],
        $config['mysql']['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Připojeno k databázi\n\n";
    
    // Načtení šablony z DB
    $stmt = $pdo->prepare("
        SELECT email_predmet, email_telo 
        FROM 25_notifikace_sablony 
        WHERE typ = 'order_status_ke_schvaleni'
    ");
    $stmt->execute();
    $template = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$template || !$template['email_telo']) {
        throw new Exception("Šablona nenalezena nebo je prázdná!");
    }
    
    echo "✅ Šablona načtena z DB (" . number_format(strlen($template['email_telo'])) . " bytů)\n\n";
    
    // TEST 1: APPROVER_NORMAL verze
    echo "📧 TEST 1: Verze APPROVER_NORMAL (oranžová)\n";
    echo "========================================\n";
    
    $html = $template['email_telo'];
    
    // Extrakce první varianty (APPROVER_NORMAL)
    preg_match('/<!-- RECIPIENT: APPROVER_NORMAL -->(.*)<!-- RECIPIENT: APPROVER_URGENT -->/s', $html, $matches);
    $normalVersion = $matches[1] ?? '';
    
    if (!$normalVersion) {
        throw new Exception("Nepodařilo se extrahovat APPROVER_NORMAL verzi!");
    }
    
    // Náhrada placeholderů - ukázková data
    $testData = [
        '{recipient_name}' => 'Robert Holovský',
        '{order_number}' => 'OBJ-2025-TEST-001',
        '{predmet}' => 'TEST - Opravená email šablona pro Outlook 365',
        '{strediska}' => 'IT oddělení - Testování',
        '{financovani}' => 'Rozpočet IT - Testovací položka',
        '{financovani_poznamka}' => 'Toto je testovací objednávka pro ověření Outlook kompatibility',
        '{amount}' => '1 234 567 Kč',
        '{date}' => date('d.m.Y H:i:s'),
        '{order_id}' => '99999',
        '{approver_name}' => 'Testovací schvalovatel'
    ];
    
    foreach ($testData as $placeholder => $value) {
        $normalVersion = str_replace($placeholder, $value, $normalVersion);
    }
    
    // Odeslání emailu - NORMAL verze
    $toEmail = 'robert.holovsky@zachranka.cz';
    $subject = '✅ TEST - Outlook opravená šablona (NORMAL)';
    
    $mailOptions = [
        'html' => true,
        'from_email' => 'erdms@zachranka.cz',
        'from_name' => 'eRDMS Test System'
    ];
    
    echo "   Odesílám na: $toEmail\n";
    echo "   Předmět: $subject\n";
    echo "   Velikost HTML: " . number_format(strlen($normalVersion)) . " bytů\n";
    
    $result = eeo_mail_send($toEmail, $subject, $normalVersion, $mailOptions);
    
    if ($result['ok']) {
        echo "   ✅ Email NORMAL verze ODESLÁN!\n\n";
    } else {
        echo "   ❌ Chyba: " . ($result['error'] ?? 'Unknown') . "\n\n";
    }
    
    // Pauza mezi emaily
    sleep(2);
    
    // TEST 2: APPROVER_URGENT verze (RED ALERT)
    echo "📧 TEST 2: Verze APPROVER_URGENT (červená - HIGH ALERT)\n";
    echo "========================================\n";
    
    preg_match('/<!-- RECIPIENT: APPROVER_URGENT -->(.*)<!-- RECIPIENT: SUBMITTER -->/s', $html, $matches);
    $urgentVersion = $matches[1] ?? '';
    
    if ($urgentVersion) {
        foreach ($testData as $placeholder => $value) {
            $urgentVersion = str_replace($placeholder, $value, $urgentVersion);
        }
        
        $subjectUrgent = '🚨 TEST - Outlook opravená šablona (URGENT ALERT)';
        
        echo "   Odesílám na: $toEmail\n";
        echo "   Předmět: $subjectUrgent\n";
        echo "   Velikost HTML: " . number_format(strlen($urgentVersion)) . " bytů\n";
        
        $result = eeo_mail_send($toEmail, $subjectUrgent, $urgentVersion, $mailOptions);
        
        if ($result['ok']) {
            echo "   ✅ Email URGENT verze ODESLÁN!\n\n";
        } else {
            echo "   ❌ Chyba: " . ($result['error'] ?? 'Unknown') . "\n\n";
        }
    }
    
    sleep(2);
    
    // TEST 3: SUBMITTER verze
    echo "📧 TEST 3: Verze SUBMITTER (zelená - pro příkazce)\n";
    echo "========================================\n";
    
    preg_match('/<!-- RECIPIENT: SUBMITTER -->(.*)$/s', $html, $matches);
    $submitterVersion = $matches[1] ?? '';
    
    if ($submitterVersion) {
        // Odstranit trailing html/body/html tagy pokud jsou
        $submitterVersion = preg_replace('/<\/html>\s*$/i', '</html>', $submitterVersion);
        
        foreach ($testData as $placeholder => $value) {
            $submitterVersion = str_replace($placeholder, $value, $submitterVersion);
        }
        
        $subjectSubmitter = '✅ TEST - Outlook opravená šablona (SUBMITTER)';
        
        echo "   Odesílám na: $toEmail\n";
        echo "   Předmět: $subjectSubmitter\n";
        echo "   Velikost HTML: " . number_format(strlen($submitterVersion)) . " bytů\n";
        
        $result = eeo_mail_send($toEmail, $subjectSubmitter, $submitterVersion, $mailOptions);
        
        if ($result['ok']) {
            echo "   ✅ Email SUBMITTER verze ODESLÁN!\n\n";
        } else {
            echo "   ❌ Chyba: " . ($result['error'] ?? 'Unknown') . "\n\n";
        }
    }
    
    echo "====================================================================\n";
    echo "✅ HOTOVO! Zkontroluj emailovou schránku:\n";
    echo "   $toEmail\n\n";
    echo "📋 Měl bys dostat 3 emaily:\n";
    echo "   1. NORMAL verze (oranžová) - standardní schvalovací notifikace\n";
    echo "   2. URGENT verze (červená) - high alert urgentní notifikace\n";
    echo "   3. SUBMITTER verze (zelená) - potvrzení pro příkazce\n\n";
    echo "🔍 TESTUJ v MS Outlook 365:\n";
    echo "   - Jsou vidět všechny texty?\n";
    echo "   - Tlačítka jsou klikatelná a viditelná?\n";
    echo "   - Barvy jsou správné (oranžová/červená/zelená)?\n";
    echo "   - České znaky se zobrazují správně?\n";
    echo "====================================================================\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    if (isset($e)) {
        echo "   Stack trace:\n" . $e->getTraceAsString() . "\n";
    }
    exit(1);
}
