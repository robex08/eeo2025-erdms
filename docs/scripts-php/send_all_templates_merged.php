#!/usr/bin/php
<?php
/**
 * Sloučí VŠECHNY HTML šablony do JEDNOHO emailu a pošle JEDNOU
 */

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'CHANGE_ME_DB_PASSWORD';
$dbName = 'eeo2025';

require_once __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mail.php';

echo "====================================================================\n";
echo "SLOUČENÍ VŠECH ŠABLON DO JEDNOHO EMAILU\n";
echo "====================================================================\n\n";

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Načtení všech HTML šablon
    $stmt = $pdo->query("
        SELECT typ, email_predmet, email_telo, LENGTH(email_telo) as size
        FROM 25_notifikace_sablony 
        WHERE email_telo IS NOT NULL AND LENGTH(email_telo) > 1000
        ORDER BY typ
    ");
    
    $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "✅ Načteno " . count($templates) . " HTML šablon\n\n";
    
    // Vytvoření hlavního HTML wrapperu
    $html = '<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Všechny email šablony - EEO V2</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .separator { 
            margin: 40px 0; 
            padding: 20px; 
            background: #1f2937; 
            color: white; 
            text-align: center;
            font-size: 24px;
            font-weight: bold;
        }
        .template-info {
            background: #fff;
            padding: 15px;
            margin: 20px 0;
            border-left: 5px solid #3b82f6;
        }
    </style>
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px;">
        <h1 style="color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">
            📧 Všechny Email Šablony - EEO V2
        </h1>
        <p style="color: #6b7280; font-size: 14px;">
            Celkem: ' . count($templates) . ' šablon | Vygenerováno: ' . date('d.m.Y H:i:s') . '
        </p>
    </div>
';
    
    $counter = 1;
    foreach ($templates as $template) {
        echo "   " . $counter . ". " . $template['typ'] . " (" . number_format($template['size']) . " B)\n";
        
        // Přidání separátoru a info o šabloně
        $html .= '
    <div class="separator">
        ' . $counter . '. ' . strtoupper($template['typ']) . '
    </div>
    
    <div class="template-info">
        <strong>Typ:</strong> ' . $template['typ'] . '<br>
        <strong>Předmět:</strong> ' . htmlspecialchars($template['email_predmet']) . '<br>
        <strong>Velikost:</strong> ' . number_format($template['size']) . ' bytů
    </div>
';
        
        // Přidání samotné šablony
        $template_html = $template['email_telo'];
        
        // Nahrazení placeholderů testovacími daty
        $testData = [
            '{recipient_name}' => 'Robert Holovský',
            '{order_number}' => 'OBJ-2025-DEMO-' . str_pad($counter, 3, '0', STR_PAD_LEFT),
            '{predmet}' => 'Testovací objednávka pro šablonu ' . $template['typ'],
            '{strediska}' => 'IT oddělení - TEST',
            '{financovani}' => 'Rozpočet IT',
            '{financovani_poznamka}' => 'Demo data pro zobrazení šablony',
            '{amount}' => number_format($counter * 1000, 0, ',', ' ') . ' Kč',
            '{date}' => date('d.m.Y H:i:s'),
            '{order_id}' => '99' . str_pad($counter, 3, '0', STR_PAD_LEFT),
            '{approver_name}' => 'Demo Schvalovatel',
            '{invoice_number}' => 'FA-2025-' . $counter,
            '{order_subject}' => 'Demo předmět',
            '{rejection_reason}' => 'Demo důvod',
            '{inspector_name}' => 'Demo Kontrolor',
            '{inspection_date}' => date('d.m.Y')
        ];
        
        foreach ($testData as $k => $v) {
            $template_html = str_replace($k, $v, $template_html);
        }
        
        $html .= $template_html;
        
        $counter++;
    }
    
    $html .= '
    <div style="max-width: 800px; margin: 40px auto; background: #1f2937; color: white; padding: 30px; text-align: center;">
        <h2>✅ Konec přehledu všech šablon</h2>
        <p>Celkem zobrazeno: ' . count($templates) . ' šablon</p>
        <p style="font-size: 12px; color: #9ca3af;">© 2025 EEO V2 | Elektronická Evidence Objednávek</p>
    </div>
</body>
</html>';
    
    echo "\n📦 Celková velikost sloučeného HTML: " . number_format(strlen($html)) . " bytů\n\n";
    
    // Odeslání JEDNOHO emailu
    $result = eeo_mail_send(
        'robert.holovsky@zachranka.cz',
        'Vsechny email sablony EEO V2 - Kompletni prehled',
        $html,
        ['html' => true, 'from_email' => 'erdms@zachranka.cz', 'from_name' => 'eRDMS - Prehled sablon']
    );
    
    echo "====================================================================\n";
    if ($result['ok']) {
        echo "✅ ODESLÁNO! JEDEN email s " . count($templates) . " šablonami\n";
    } else {
        echo "❌ CHYBA při odesílání\n";
    }
    echo "====================================================================\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
