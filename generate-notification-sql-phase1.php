<?php
/**
 * Generator SQL skriptů pro aktualizaci notifikačních šablon
 * Fáze 1: Základní schvalovací workflow
 */

// Načtení HTML šablon
$templates = [
    'order_status_schvalena' => [
        'file' => '/var/www/erdms-dev/templates/order_status_schvalena.html',
        'subject' => '✅ Objednávka {order_number} byla schválena',
        'app_title' => '✅ Schválena: {order_number}',
        'app_message' => 'Objednávka {order_number}: "{order_subject}" byla schválena uživatelem {approver_name}. Datum schválení: {approval_date}.',
        'priority' => 'normal'
    ],
    'order_status_zamitnuta' => [
        'file' => '/var/www/erdms-dev/templates/order_status_zamitnuta.html',
        'subject' => '❌ Objednávka {order_number} byla zamítnuta',
        'app_title' => '❌ Zamítnuta: {order_number}',
        'app_message' => 'Objednávka {order_number} byla zamítnuta uživatelem {approver_name}. Důvod: {rejection_comment}',
        'priority' => 'high'
    ],
    'order_status_ceka_se' => [
        'file' => '/var/www/erdms-dev/templates/order_status_ceka_se.html',
        'subject' => '⏸️ Objednávka {order_number} čeká na doplnění',
        'app_title' => '⏸️ K doplnění: {order_number}',
        'app_message' => 'Objednávka {order_number} vrácena k doplnění uživatelem {approver_name}. Požadavky: {revision_comment}',
        'priority' => 'high'
    ]
];

echo "-- ============================================================================\n";
echo "-- SQL Skript pro aktualizaci notifikačních šablon - FÁZE 1\n";
echo "-- Základní schvalovací workflow (Schválena, Zamítnuta, Čeká se)\n";
echo "-- Generováno: " . date('Y-m-d H:i:s') . "\n";
echo "-- ============================================================================\n\n";

foreach ($templates as $type => $config) {
    echo "-- ============================================================================\n";
    echo "-- Template: $type\n";
    echo "-- ============================================================================\n\n";
    
    // Načtení HTML obsahu
    if (!file_exists($config['file'])) {
        echo "-- ERROR: File not found: {$config['file']}\n\n";
        continue;
    }
    
    $html_content = file_get_contents($config['file']);
    
    // MySQL escapování (addslashes pro SQL)
    $html_escaped = addslashes($html_content);
    $subject_escaped = addslashes($config['subject']);
    $app_title_escaped = addslashes($config['app_title']);
    $app_message_escaped = addslashes($config['app_message']);
    
    // Generování SQL UPDATE
    $sql = "UPDATE 25_notification_templates SET\n";
    $sql .= "    email_body = '$html_escaped',\n";
    $sql .= "    email_subject = '$subject_escaped',\n";
    $sql .= "    app_title = '$app_title_escaped',\n";
    $sql .= "    app_message = '$app_message_escaped',\n";
    $sql .= "    priority_default = '{$config['priority']}',\n";
    $sql .= "    dt_updated = NOW()\n";
    $sql .= "WHERE type = '$type';\n\n";
    
    echo $sql;
    
    // Ověření
    echo "-- Ověření aktualizace:\n";
    echo "SELECT id, type, name, LENGTH(email_body) as body_length, email_subject, active, dt_updated\n";
    echo "FROM 25_notification_templates WHERE type = '$type';\n\n";
}

echo "-- ============================================================================\n";
echo "-- Kontrola všech aktualizovaných šablon\n";
echo "-- ============================================================================\n\n";
echo "SELECT id, type, name, LENGTH(email_body) as body_length, email_subject, active, dt_updated\n";
echo "FROM 25_notification_templates\n";
echo "WHERE type IN ('order_status_schvalena', 'order_status_zamitnuta', 'order_status_ceka_se')\n";
echo "ORDER BY id;\n\n";

echo "-- ============================================================================\n";
echo "-- KONEC SKRIPTU\n";
echo "-- ============================================================================\n";
