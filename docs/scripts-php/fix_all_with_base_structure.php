#!/usr/bin/php
<?php
/**
 * Oprava VŠECH šablon podle přesné struktury ke_schvaleni
 * Zachovává width="600", vnořené tabulky, MSO conditionals
 */

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'CHANGE_ME_DB_PASSWORD';
$dbName = 'eeo2025';

echo str_repeat('=', 80) . "\n";
echo "OPRAVA VŠECH ŠABLON PODLE KE_SCHVALENI STRUKTURY\n";
echo str_repeat('=', 80) . "\n\n";

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Načtení ke_schvaleni jako base template
    $stmt = $pdo->query("SELECT email_telo FROM 25_notifikace_sablony WHERE typ = 'order_status_ke_schvaleni'");
    $base_template = $stmt->fetch(PDO::FETCH_ASSOC)['email_telo'];
    
    // Extrakce NORMAL verze (oranžová)
    preg_match('/<!-- RECIPIENT: APPROVER_NORMAL -->(.*)<!-- RECIPIENT: APPROVER_URGENT -->/s', $base_template, $matches);
    $template_normal = $matches[1];
    
    echo "✅ Načten base template ke_schvaleni (" . strlen($base_template) . " bytů)\n\n";
    
    // Konfigurace šablon - barvy, texty, typy
    $templates = [
        'order_status_schvalena' => [
            'color' => '#059669',
            'color_dark' => '#047857',
            'bg_card' => '#f0fdf4',
            'border_card' => '#bbf7d0',
            'title' => '✅ Objednávka schválena',
            'greeting' => 'vaše objednávka byla <strong style="font-weight: 700;">úspěšně schválena</strong>.',
            'button_text' => '👁 Zobrazit schválenou objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Můžete nyní pokračovat v dalším zpracování objednávky.'
        ],
        'order_status_zamitnuta' => [
            'color' => '#dc2626',
            'color_dark' => '#b91c1c',
            'bg_card' => '#fef2f2',
            'border_card' => '#fca5a5',
            'title' => '❌ Objednávka zamítnuta',
            'greeting' => 'vaše objednávka byla <strong style="font-weight: 700; color: #dc2626;">zamítnuta</strong>.',
            'button_text' => '👁 Zobrazit zamítnutou objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Pro více informací kontaktujte schvalovatele.'
        ],
        'order_status_nova' => [
            'color' => '#3b82f6',
            'color_dark' => '#2563eb',
            'bg_card' => '#eff6ff',
            'border_card' => '#bfdbfe',
            'title' => '📝 Nová objednávka vytvořena',
            'greeting' => 'byla vytvořena <strong style="font-weight: 700;">nová objednávka</strong>.',
            'button_text' => '👁 Zobrazit objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Objednávka čeká na další zpracování.'
        ],
        'order_status_dokoncena' => [
            'color' => '#059669',
            'color_dark' => '#047857',
            'bg_card' => '#f0fdf4',
            'border_card' => '#bbf7d0',
            'title' => '✅ Objednávka dokončena',
            'greeting' => 'objednávka byla <strong style="font-weight: 700;">úspěšně dokončena</strong>.',
            'button_text' => '👁 Zobrazit dokončenou objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Děkujeme za využití systému.'
        ],
        'order_status_odeslana' => [
            'color' => '#3b82f6',
            'color_dark' => '#2563eb',
            'bg_card' => '#eff6ff',
            'border_card' => '#bfdbfe',
            'title' => '📤 Objednávka odeslána',
            'greeting' => 'objednávka byla <strong style="font-weight: 700;">úspěšně odeslána</strong> dodavateli.',
            'button_text' => '👁 Zobrazit odeslanou objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Sledujte stav objednávky v systému.'
        ],
        'order_status_potvrzena' => [
            'color' => '#059669',
            'color_dark' => '#047857',
            'bg_card' => '#f0fdf4',
            'border_card' => '#bbf7d0',
            'title' => '✅ Objednávka potvrzena dodavatelem',
            'greeting' => 'objednávka byla <strong style="font-weight: 700;">potvrzena dodavatelem</strong>.',
            'button_text' => '👁 Zobrazit potvrzenou objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Objednávka je nyní v realizaci.'
        ],
        'order_status_ceka_se' => [
            'color' => '#f59e0b',
            'color_dark' => '#d97706',
            'bg_card' => '#fffbeb',
            'border_card' => '#fde68a',
            'title' => '⏸️ Objednávka čeká',
            'greeting' => 'objednávka <strong style="font-weight: 700;">čeká na další akci</strong>.',
            'button_text' => '👁 Zobrazit objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Zkontrolujte prosím stav objednávky.'
        ],
        'order_status_faktura_pridana' => [
            'color' => '#3b82f6',
            'color_dark' => '#2563eb',
            'bg_card' => '#eff6ff',
            'border_card' => '#bfdbfe',
            'title' => '💰 K objednávce byla přidána faktura',
            'greeting' => 'k objednávce byla <strong style="font-weight: 700;">přidána nová faktura</strong>.',
            'button_text' => '👁 Zobrazit fakturu',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Zkontrolujte prosím údaje na faktuře.'
        ],
        'order_status_faktura_schvalena' => [
            'color' => '#059669',
            'color_dark' => '#047857',
            'bg_card' => '#f0fdf4',
            'border_card' => '#bbf7d0',
            'title' => '💰 Faktura schválena',
            'greeting' => 'faktura k objednávce byla <strong style="font-weight: 700;">schválena</strong>.',
            'button_text' => '👁 Zobrazit schválenou fakturu',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Faktura je připravena k platbě.'
        ],
        'order_status_kontrola_potvrzena' => [
            'color' => '#059669',
            'color_dark' => '#047857',
            'bg_card' => '#f0fdf4',
            'border_card' => '#bbf7d0',
            'title' => '✅ Kontrola objednávky potvrzena',
            'greeting' => 'kontrola objednávky byla <strong style="font-weight: 700;">úspěšně potvrzena</strong>.',
            'button_text' => '👁 Zobrazit objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Objednávka může pokračovat v procesu.'
        ],
        'order_status_kontrola_zamitnuta' => [
            'color' => '#dc2626',
            'color_dark' => '#b91c1c',
            'bg_card' => '#fef2f2',
            'border_card' => '#fca5a5',
            'title' => '❌ Kontrola objednávky zamítnuta',
            'greeting' => 'kontrola objednávky byla <strong style="font-weight: 700; color: #dc2626;">zamítnuta</strong>.',
            'button_text' => '👁 Zobrazit objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Zkontrolujte prosím důvod zamítnutí.'
        ],
        'order_status_registr_ceka' => [
            'color' => '#f59e0b',
            'color_dark' => '#d97706',
            'bg_card' => '#fffbeb',
            'border_card' => '#fde68a',
            'title' => '📋 Objednávka čeká na zveřejnění',
            'greeting' => 'objednávka <strong style="font-weight: 700;">čeká na zveřejnění v registru</strong>.',
            'button_text' => '👁 Zobrazit objednávku',
            'footer_note' => 'Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>Po zveřejnění budete informováni.'
        ]
    ];
    
    $fixed = 0;
    
    foreach ($templates as $typ => $config) {
        echo "📧 Zpracovávám: $typ\n";
        
        // Vytvoření nové šablony z base
        $html = $template_normal;
        
        // Nahrazení barev
        $html = str_replace('#f97316', $config['color'], $html);
        $html = str_replace('#fb923c', $config['color_dark'], $html);
        $html = str_replace('#f9fafb', $config['bg_card'], $html);
        $html = str_replace('#e5e7eb', $config['border_card'], $html);
        
        // Nahrazení nadpisu
        $html = preg_replace(
            '/<h1[^>]*>.*?<\/h1>/s',
            '<h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">' . 
            $config['title'] . 
            '</h1>',
            $html,
            1
        );
        
        // Nahrazení greeting textu
        $html = preg_replace(
            '/(Dobrý den.*?<\/p>\s*<p[^>]*>).*?(<\/p>)/s',
            '$1' . $config['greeting'] . '$2',
            $html,
            1
        );
        
        // Nahrazení button textu
        $html = str_replace(
            '&#128065; Zobrazit a schválit objednávku',
            $config['button_text'],
            $html
        );
        $html = str_replace(
            'Zobrazit a schválit objednávku',
            str_replace('👁 ', '', $config['button_text']),
            $html
        );
        
        // Nahrazení footer note
        $html = preg_replace(
            '/(Tento e-mail byl automaticky vygenerován.*?<\/p>)/s',
            '<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; font-family: Arial, sans-serif;">' .
            $config['footer_note'] .
            '</p>',
            $html,
            1
        );
        
        // Oprava border pro karty
        $html = preg_replace(
            '/border: 2px solid #[0-9a-f]{6};/',
            'border: 2px solid ' . $config['border_card'] . ';',
            $html
        );
        
        // Uložení do DB
        $stmt = $pdo->prepare("UPDATE 25_notifikace_sablony SET email_telo = ?, dt_updated = NOW() WHERE typ = ?");
        if ($stmt->execute([$html, $typ])) {
            $fixed++;
            echo "   ✅ Uloženo (" . number_format(strlen($html)) . " bytů)\n\n";
        } else {
            echo "   ❌ Chyba při ukládání\n\n";
        }
    }
    
    echo str_repeat('=', 80) . "\n";
    echo "✅ HOTOVO! Opraveno $fixed šablon\n";
    echo str_repeat('=', 80) . "\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
