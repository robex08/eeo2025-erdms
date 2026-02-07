<?php
/**
 * Generator SQL skriptů pro UPDATE notification templates
 * Fáze 2: order_status_odeslana, order_status_potvrzena
 * 
 * Datum: 15. prosince 2025
 */

$templates = [
    [
        'type' => 'order_status_odeslana',
        'name' => 'Objednávka odeslána dodavateli',
        'email_subject' => '📤 Objednávka {order_number} byla odeslána dodavateli',
        'app_title' => '📤 Odeslána: {order_number}',
        'app_message' => 'Objednávka {order_number} byla odeslána dodavateli {supplier_name}',
        'send_email_default' => true,
        'priority_default' => 'normal',
        'html_file' => 'templates/order_status_odeslana.html'
    ],
    [
        'type' => 'order_status_potvrzena',
        'name' => 'Objednávka potvrzena dodavatelem',
        'email_subject' => '✅ Objednávka {order_number} byla potvrzena dodavatelem',
        'app_title' => '✅ Potvrzena: {order_number}',
        'app_message' => 'Dodavatel {supplier_name} potvrdil objednávku {order_number}',
        'send_email_default' => true,
        'priority_default' => 'normal',
        'html_file' => 'templates/order_status_potvrzena.html'
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
    
    $sql = "UPDATE 25_notifikace_sablony 
SET 
    nazev = '{$escapedName}',
    email_predmet = '{$escapedSubject}',
    email_telo = '{$escapedHtml}',
    app_nadpis = '{$escapedAppTitle}',
    app_zprava = '{$escapedAppMessage}',
    email_vychozi = {$sendEmail},
    priorita_vychozi = '{$template['priority_default']}',
    aktivni = 1,
    dt_updated = NOW()
WHERE typ = '{$template['type']}';";
    
    $sqlStatements[] = $sql;
    
    echo "✅ Vygenerován SQL pro: {$template['name']}\n";
    echo "   - Email subject: {$template['email_subject']}\n";
    echo "   - HTML délka: " . strlen($htmlContent) . " bytů\n";
    echo "   - Varianty: RECIPIENT + SUBMITTER\n\n";
}

// Uložení do souboru
$outputFile = __DIR__ . '/UPDATE_NOTIFICATION_TEMPLATES_PHASE2.sql';
$sqlContent = "-- ============================================\n";
$sqlContent .= "-- NOTIFICATION TEMPLATES - FÁZE 2 UPDATE\n";
$sqlContent .= "-- Datum: " . date('Y-m-d H:i:s') . "\n";
$sqlContent .= "-- Šablony: order_status_odeslana, order_status_potvrzena\n";
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
echo "   mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 < UPDATE_NOTIFICATION_TEMPLATES_PHASE2.sql\n";
