#!/usr/bin/php
<?php
/**
 * Vytvoření HTML šablony pro věčnou kontrolu - INFORMAČNÍ NOTIFIKACE
 */

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'CHANGE_ME_DB_PASSWORD';
$dbName = 'eeo2025';

echo "====================================================================\n";
echo "Vytváření HTML šablony: order_vecna_spravnost_zamitnuta\n";
echo "====================================================================\n\n";

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Načtení base template
    $stmt = $pdo->query("SELECT email_telo FROM 25_notifikace_sablony WHERE typ = 'order_status_ke_schvaleni'");
    $base = $stmt->fetch(PDO::FETCH_ASSOC)['email_telo'];
    
    // Extrakce NORMAL verze
    preg_match('/<!-- RECIPIENT: APPROVER_NORMAL -->(.*)<!-- RECIPIENT: APPROVER_URGENT -->/s', $base, $matches);
    $html = $matches[1];
    
    // MODRÁ - informační barva
    $html = str_replace('#f97316', '#3b82f6', $html); // main color
    $html = str_replace('#fb923c', '#2563eb', $html); // dark color
    $html = str_replace('#f9fafb', '#eff6ff', $html); // card bg
    $html = str_replace('#e5e7eb', '#bfdbfe', $html); // card border
    
    // Nadpis
    $html = preg_replace(
        '/<h1[^>]*>.*?<\/h1>/s',
        '<h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">' .
        '❗ Potvrďte správnost faktury' .
        '</h1>',
        $html,
        1
    );
    
    // Greeting text
    $html = preg_replace(
        '/(Dobrý den.*?<\/p>\s*<p[^>]*>).*?(<\/p>)/s',
        '$1' . 'k objednávce byla přiložena faktura. Prosím <strong style="font-weight: 700;">zkontrolujte správnost údajů</strong> - cenu, dodané množství a soulad s objednávkou.' . '$2',
        $html,
        1
    );
    
    // Button text
    $html = str_replace(
        '&#128065; Zobrazit a schválit objednávku',
        '👁 Zkontrolovat fakturu',
        $html
    );
    $html = str_replace(
        'Zobrazit a schválit objednávku',
        'Zkontrolovat fakturu',
        $html
    );
    
    // Footer note
    $html = preg_replace(
        '/(Tento e-mail byl automaticky vygenerován.*?<\/p>)/s',
        '<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; font-family: Arial, sans-serif;">' .
        'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Prosím zkontrolujte přiloženou fakturu a potvrďte správnost údajů.' .
        '</p>',
        $html,
        1
    );
    
    // Uložení
    $stmt = $pdo->prepare("UPDATE 25_notifikace_sablony SET email_telo = ?, dt_updated = NOW() WHERE typ = 'order_vecna_spravnost_zamitnuta'");
    
    if ($stmt->execute([$html])) {
        echo "✅ Šablona vytvořena a uložena (" . number_format(strlen($html)) . " bytů)\n";
        echo "   Modrá informační barva\n";
        echo "   Pokyn ke kontrole faktury\n\n";
    } else {
        echo "❌ Chyba při ukládání\n";
    }
    
    echo "====================================================================\n";
    echo "✅ HOTOVO!\n";
    echo "====================================================================\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
