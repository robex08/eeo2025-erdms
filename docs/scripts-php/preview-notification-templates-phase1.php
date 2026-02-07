<?php
/**
 * Test Script - Preview notifikačních šablon
 * Zobrazuje HTML náhled všech variant šablon s testovacími daty
 */

// Testovací data pro placeholder substitution
$test_data = [
    'order_number' => 'OBJ-2025-00123',
    'order_id' => '456',
    'order_subject' => 'Nákup kancelářského materiálu',
    'predmet' => 'Kancelářský materiál - tonery, papír A4, desky',
    'strediska' => 'ZZS MSK - Ostrava, ZZS MSK - Opava',
    'financovani' => 'Rozpočet provozní - kapitola 5',
    'financovani_poznamka' => 'Standardní provozní náklady, schválený rozpočet 2025',
    'amount' => '15 840 Kč',
    'date' => '15. 12. 2025 10:30',
    'creator_name' => 'Jan Novák',
    'approver_name' => 'Ing. Marie Svobodová',
    'approval_date' => '15. 12. 2025 14:15',
    'rejection_date' => '15. 12. 2025 14:15',
    'rejection_comment' => 'Objednávka neobsahuje kompletní specifikaci požadovaného zboží. Prosím doplňte katalogová čísla tonerů a upřesněte počty jednotlivých položek.',
    'revision_date' => '15. 12. 2025 14:15',
    'revision_comment' => "Prosím doplňte následující informace:\n\n1. Katalogová čísla tonerů (uvést přesný typ pro tiskárnu HP LaserJet Pro)\n2. Počet balení papíru A4 (specifikovat gramáž)\n3. Typ desek - prezentační nebo rychlovazače?\n\nPo doplnění prosím znovu odešlete ke schválení."
];

// Šablony k zobrazení
$templates = [
    'order_status_schvalena' => [
        'name' => 'Objednávka schválena',
        'file' => '/var/www/erdms-dev/templates/order_status_schvalena.html',
        'icon' => '✅',
        'color' => '#059669'
    ],
    'order_status_zamitnuta' => [
        'name' => 'Objednávka zamítnuta',
        'file' => '/var/www/erdms-dev/templates/order_status_zamitnuta.html',
        'icon' => '❌',
        'color' => '#dc2626'
    ],
    'order_status_ceka_se' => [
        'name' => 'Objednávka vrácena k doplnění',
        'file' => '/var/www/erdms-dev/templates/order_status_ceka_se.html',
        'icon' => '⏸️',
        'color' => '#f97316'
    ]
];

/**
 * Nahradí placeholdery v HTML šabloně testovacími daty
 */
function replacePlaceholders($html, $data) {
    foreach ($data as $key => $value) {
        $html = str_replace('{' . $key . '}', $value, $html);
    }
    return $html;
}

/**
 * Extrahuje konkrétní recipient variant ze šablony
 */
function extractRecipientVariant($html, $recipient_type) {
    // Najít začátek varianty
    $start_marker = "<!-- RECIPIENT: $recipient_type -->";
    $start_pos = strpos($html, $start_marker);
    
    if ($start_pos === false) {
        return null;
    }
    
    // Posunout na začátek HTML po markeru
    $start_pos = strpos($html, '<!DOCTYPE html>', $start_pos);
    
    // Najít další RECIPIENT marker nebo konec
    $next_marker_pos = strpos($html, '<!-- RECIPIENT:', $start_pos + 1);
    
    if ($next_marker_pos !== false) {
        // Další varianta existuje, vzít obsah do ní
        $end_pos = $next_marker_pos;
    } else {
        // Žádná další varianta, vzít do konce
        $end_pos = strlen($html);
    }
    
    return substr($html, $start_pos, $end_pos - $start_pos);
}

?>
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview notifikačních šablon - Fáze 1</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 36px;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .header p {
            font-size: 18px;
            opacity: 0.9;
        }
        
        .template-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        
        .template-header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #e5e7eb;
        }
        
        .template-icon {
            font-size: 48px;
            margin-right: 20px;
        }
        
        .template-title {
            flex: 1;
        }
        
        .template-title h2 {
            font-size: 28px;
            color: #1f2937;
            margin-bottom: 5px;
        }
        
        .template-title p {
            color: #6b7280;
            font-size: 14px;
        }
        
        .variants {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 30px;
        }
        
        .variant {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .variant-header {
            background: #f9fafb;
            padding: 15px 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .variant-header h3 {
            font-size: 18px;
            color: #1f2937;
        }
        
        .variant-header .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        
        .badge.recipient {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .badge.submitter {
            background: #fef3c7;
            color: #92400e;
        }
        
        .variant-body {
            padding: 0;
            background: #f5f5f5;
            max-height: 600px;
            overflow-y: auto;
        }
        
        .variant-body iframe {
            width: 100%;
            min-height: 600px;
            border: none;
            display: block;
        }
        
        .test-data {
            background: #f0f9ff;
            border: 2px solid #bae6fd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .test-data h3 {
            color: #0c4a6e;
            margin-bottom: 15px;
            font-size: 16px;
        }
        
        .test-data table {
            width: 100%;
            font-size: 13px;
        }
        
        .test-data td {
            padding: 6px;
            vertical-align: top;
        }
        
        .test-data td:first-child {
            font-weight: 600;
            color: #1e40af;
            width: 200px;
        }
        
        .test-data td:last-child {
            color: #374151;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 Preview notifikačních šablon</h1>
            <p>Fáze 1: Základní schvalovací workflow (Schválena, Zamítnuta, Čeká se)</p>
        </div>
        
        <div class="test-data">
            <h3>📊 Testovací data použitá v šablonách:</h3>
            <table>
                <?php foreach ($test_data as $key => $value): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($key); ?>:</td>
                        <td><?php echo nl2br(htmlspecialchars($value)); ?></td>
                    </tr>
                <?php endforeach; ?>
            </table>
        </div>
        
        <?php foreach ($templates as $type => $config): ?>
            <div class="template-section">
                <div class="template-header">
                    <div class="template-icon"><?php echo $config['icon']; ?></div>
                    <div class="template-title">
                        <h2><?php echo htmlspecialchars($config['name']); ?></h2>
                        <p>Template type: <code><?php echo htmlspecialchars($type); ?></code></p>
                    </div>
                </div>
                
                <?php
                // Načtení HTML šablony
                if (!file_exists($config['file'])) {
                    echo "<p style='color: red;'>❌ Soubor nenalezen: " . htmlspecialchars($config['file']) . "</p>";
                    continue;
                }
                
                $html = file_get_contents($config['file']);
                
                // Extrakce variant
                $recipient_html = extractRecipientVariant($html, 'RECIPIENT');
                $submitter_html = extractRecipientVariant($html, 'SUBMITTER');
                ?>
                
                <div class="variants">
                    <?php if ($recipient_html): ?>
                        <div class="variant">
                            <div class="variant-header">
                                <h3>
                                    Varianta: Příjemce
                                    <span class="badge recipient">RECIPIENT</span>
                                </h3>
                            </div>
                            <div class="variant-body">
                                <iframe srcdoc="<?php echo htmlspecialchars(replacePlaceholders($recipient_html, $test_data)); ?>"></iframe>
                            </div>
                        </div>
                    <?php endif; ?>
                    
                    <?php if ($submitter_html): ?>
                        <div class="variant">
                            <div class="variant-header">
                                <h3>
                                    Varianta: Odesilatel akce
                                    <span class="badge submitter">SUBMITTER</span>
                                </h3>
                            </div>
                            <div class="variant-body">
                                <iframe srcdoc="<?php echo htmlspecialchars(replacePlaceholders($submitter_html, $test_data)); ?>"></iframe>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</body>
</html>
