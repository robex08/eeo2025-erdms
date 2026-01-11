#!/usr/bin/php
<?php
/**
 * Odeslání merged emailu s úvodem pro Terezu a Roberta
 */

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'AhchohTahnoh7eim';
$dbName = 'eeo2025';

require_once __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mail.php';

echo "====================================================================\n";
echo "ODESLÁNÍ MERGED EMAILU - Tereza + Robert\n";
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
    
    // Vytvoření HTML s úvodním textem
    $html = '<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Návrh e-mailových notifikací - EEO V2</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .intro { 
            max-width: 800px; 
            margin: 0 auto 40px; 
            background: white; 
            padding: 40px; 
            border: 3px solid #3b82f6;
            border-radius: 8px;
        }
        .intro h1 { 
            color: #1f2937; 
            margin-top: 0;
            border-bottom: 3px solid #3b82f6; 
            padding-bottom: 15px;
        }
        .intro p { 
            line-height: 1.6; 
            color: #374151; 
            font-size: 16px;
        }
        .intro ul {
            background: #eff6ff;
            padding: 20px 20px 20px 40px;
            border-left: 4px solid #3b82f6;
            margin: 20px 0;
        }
        .intro li {
            margin: 8px 0;
            color: #1f2937;
        }
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
    <div class="intro">
        <h1>Návrh e-mailových notifikací - EEO V2</h1>
        
        <p><strong>Ahoj Terezo,</strong></p>
        
        <p>připravili jsme Ti kompletní náhled všech e-mailových notifikací ze systému <strong>EEO V2</strong> (Elektronická Evidence Objednávek).</p>
        
        <p>Všechny šablony byly aktualizovány pro <strong>plnou kompatibilitu s MS Outlook 365</strong> a dalšími e-mailovými klienty.</p>
        
        <p><strong>Co najdeš v tomto e-mailu:</strong></p>
        <ul>
            <li>✅ 15 kompletních HTML šablon</li>
            <li>✅ Jednotný vizuální styl</li>
            <li>✅ Optimalizace pro Outlook 365</li>
            <li>✅ Demo data pro snadné posouzení vzhledu</li>
        </ul>
        
        <p><strong>Prosíme Tě o kontrolu:</strong></p>
        <ul>
            <li>Vizuální podoby notifikací</li>
            <li>Srozumitelnosti textů</li>
            <li>Barevného označení dle typu notifikace</li>
            <li>Celkové konzistence napříč všemi šablonami</li>
        </ul>
        
        <p>V případě připomínek nebo návrhů na úpravy nás prosím kontaktuj.</p>
        
        <p><strong>Děkujeme za Tvůj čas a zpětnou vazbu.</strong></p>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 14px; color: #6b7280;">
            S pozdravem,<br>
            <strong>Robert & Tým EEO V2</strong><br>
            ' . date('d.m.Y') . '
        </p>
    </div>
';
    
    $counter = 1;
    foreach ($templates as $template) {
        echo "   " . $counter . ". " . $template['typ'] . "\n";
        
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
        
        $template_html = $template['email_telo'];
        
        // Testovací data
        $testData = [
            '{recipient_name}' => 'Demo Uživatel',
            '{order_number}' => 'OBJ-2025-DEMO-' . str_pad($counter, 3, '0', STR_PAD_LEFT),
            '{predmet}' => 'Testovací objednávka pro šablonu ' . $template['typ'],
            '{strediska}' => 'IT oddělení - DEMO',
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
    <div style="max-width: 800px; margin: 40px auto; background: #1f2937; color: white; padding: 30px; text-align: center; border-radius: 8px;">
        <h2>✅ Konec náhledu všech šablon</h2>
        <p>Celkem zobrazeno: ' . count($templates) . ' šablon</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">© 2025 EEO V2 | Elektronická Evidence Objednávek</p>
    </div>
</body>
</html>';
    
    echo "\n📦 Celková velikost: " . number_format(strlen($html)) . " bytů\n\n";
    
    // Odeslání na Terezu (TO) a Roberta (CC)
    $result = eeo_mail_send(
        'tereza.bezouskova@zachranka.cz',
        'Navrh emailovych notifikaci EEO V2 k posouzeni',
        $html,
        [
            'html' => true, 
            'from_email' => 'erdms@zachranka.cz', 
            'from_name' => 'EEO V2 System',
            'cc' => 'robert.holovsky@zachranka.cz'
        ]
    );
    
    echo "====================================================================\n";
    if ($result['ok']) {
        echo "✅ ODESLÁNO!\n";
        echo "   TO: tereza.bezouskova@zachranka.cz\n";
        echo "   CC: robert.holovsky@zachranka.cz\n";
        echo "   Šablon: " . count($templates) . "\n";
    } else {
        echo "❌ CHYBA při odesílání\n";
    }
    echo "====================================================================\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
