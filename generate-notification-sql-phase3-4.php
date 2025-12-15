<?php
/**
 * Generator SQL skriptů pro UPDATE notification templates
 * Fáze 3+4: order_status_faktura_schvalena, order_status_kontrola_potvrzena, order_status_kontrola_zamitnuta
 * 
 * Datum: 15. prosince 2025
 */

$templates = [
    // FÁZE 3 - Faktury
    [
        'type' => 'order_status_faktura_schvalena',
        'name' => 'Faktura schválena',
        'email_subject' => '💰 Faktura {invoice_number} byla schválena',
        'app_title' => '💰 Faktura schválena: {invoice_number}',
        'app_message' => 'Faktura {invoice_number} k objednávce {order_number} byla schválena',
        'send_email_default' => true,
        'priority_default' => 'normal',
        'html_file' => 'templates/order_status_faktura_schvalena.html'
    ],
    // FÁZE 4 - Kontrola kvality
    [
        'type' => 'order_status_kontrola_potvrzena',
        'name' => 'Kontrola kvality potvrzena',
        'email_subject' => '✅ Kontrola objednávky {order_number} byla potvrzena',
        'app_title' => '✅ Kontrola OK: {order_number}',
        'app_message' => 'Kontrola kvality objednávky {order_number} byla úspěšně potvrzena',
        'send_email_default' => true,
        'priority_default' => 'normal',
        'html_file' => 'templates/order_status_kontrola_potvrzena.html'
    ],
    [
        'type' => 'order_status_kontrola_zamitnuta',
        'name' => 'Kontrola kvality zamítnuta',
        'email_subject' => '❌ Kontrola objednávky {order_number} byla zamítnuta',
        'app_title' => '❌ Kontrola zamítnuta: {order_number}',
        'app_message' => 'Kontrola kvality objednávky {order_number} byla zamítnuta - nutné úpravy',
        'send_email_default' => true,
        'priority_default' => 'high',
        'html_file' => 'templates/order_status_kontrola_zamitnuta.html'
    ]
];

$sqlStatements = [];

foreach ($templates as $template) {
    $htmlContent = file_get_contents(__DIR__ . '/' . $template['html_file']);
    
    if ($htmlContent === false) {
        die("❌ Chyba: Soubor {$template['html_file']} nenalezen!\n");
    }
    
    // Escapování pro SQL
    $escapedHtml = addslashes($htmlContent);
    $escapedSubject = addslashes($template['email_subject']);
    $escapedAppTitle = addslashes($template['app_title']);
    $escapedAppMessage = addslashes($template['app_message']);
    $escapedName = addslashes($template['name']);
    
    $sendEmail = $template['send_email_default'] ? 1 : 0;
    
    $sql = "UPDATE 25_notification_templates 
SET 
    name = '{$escapedName}',
    email_subject = '{$escapedSubject}',
    email_body = '{$escapedHtml}',
    app_title = '{$escapedAppTitle}',
    app_message = '{$escapedAppMessage}',
    send_email_default = {$sendEmail},
    priority_default = '{$template['priority_default']}',
    active = 1,
    dt_updated = NOW()
WHERE type = '{$template['type']}';";
    
    $sqlStatements[] = $sql;
    
    echo "✅ Vygenerován SQL pro: {$template['name']}\n";
    echo "   - Email subject: {$template['email_subject']}\n";
    echo "   - HTML délka: " . strlen($htmlContent) . " bytů\n";
    echo "   - Priority: {$template['priority_default']}\n";
    echo "   - Varianty: RECIPIENT + SUBMITTER\n\n";
}

// Uložení do souboru
$outputFile = __DIR__ . '/UPDATE_NOTIFICATION_TEMPLATES_PHASE3_4.sql';
$sqlContent = "-- ============================================\n";
$sqlContent .= "-- NOTIFICATION TEMPLATES - FÁZE 3+4 UPDATE\n";
$sqlContent .= "-- Datum: " . date('Y-m-d H:i:s') . "\n";
$sqlContent .= "-- Fáze 3: order_status_faktura_schvalena (faktury)\n";
$sqlContent .= "-- Fáze 4: order_status_kontrola_potvrzena, order_status_kontrola_zamitnuta (kontrola)\n";
$sqlContent .= "-- Struktura: 2 varianty (RECIPIENT + SUBMITTER)\n";
$sqlContent .= "-- ============================================\n\n";

foreach ($sqlStatements as $i => $sql) {
    $sqlContent .= "-- Šablona " . ($i + 1) . ": {$templates[$i]['name']}\n";
    $sqlContent .= $sql . "\n\n";
}

file_put_contents($outputFile, $sqlContent);

echo "✅ SQL skript uložen: {$outputFile}\n";
echo "📊 Celkem šablon: " . count($templates) . "\n";
echo "\n";
echo "🚀 Spuštění SQL:\n";
echo "   mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' eeo2025 < UPDATE_NOTIFICATION_TEMPLATES_PHASE3_4.sql\n";
