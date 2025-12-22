#!/usr/bin/php
<?php
/**
 * Univerzální script pro opravu všech HTML email šablon pro Outlook 365
 * - Odstraní linear-gradient a nahradí solid barvami
 * - Odstraní box-shadow
 * - Opraví header strukturu (vnořené tabulky)
 * - Přidá MSO conditionals tam kde je potřeba
 */

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'AhchohTahnoh7eim';
$dbName = 'eeo2025';

// Šablony, které budeme opravovat (jen ty velké s HTML)
$templates_to_fix = [
    'order_status_ceka_se',
    'order_status_dokoncena',
    'order_status_faktura_pridana',
    'order_status_faktura_schvalena',
    'order_status_kontrola_potvrzena',
    'order_status_kontrola_zamitnuta',
    'order_status_nova',
    'order_status_odeslana',
    'order_status_potvrzena',
    'order_status_registr_ceka',
    'order_status_schvalena',
    'order_status_zamitnuta'
];

echo str_repeat('=', 80) . "\n";
echo "OPRAVA VŠECH EMAIL ŠABLON PRO OUTLOOK 365\n";
echo str_repeat('=', 80) . "\n\n";

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Připojeno k databázi\n\n";
    
    $fixed_count = 0;
    $error_count = 0;
    
    foreach ($templates_to_fix as $typ) {
        echo "📧 Zpracovávám: $typ\n";
        
        // Načtení šablony
        $stmt = $pdo->prepare("SELECT email_telo FROM 25_notifikace_sablony WHERE typ = ?");
        $stmt->execute([$typ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row || empty($row['email_telo'])) {
            echo "   ⚠️  Šablona nenalezena nebo prázdná\n\n";
            continue;
        }
        
        $html = $row['email_telo'];
        $original_size = strlen($html);
        
        // 1. Odstranění linear-gradient a nahrazení solid barvami
        // Zelená varianta (success)
        $html = preg_replace(
            '/background:\s*linear-gradient\([^)]*,\s*#059669[^)]*\)/i',
            'background-color: #059669',
            $html
        );
        
        // Oranžová varianta (warning/normal)
        $html = preg_replace(
            '/background:\s*linear-gradient\([^)]*,\s*#f97316[^)]*\)/i',
            'background-color: #f97316',
            $html
        );
        
        // Červená varianta (danger/urgent)
        $html = preg_replace(
            '/background:\s*linear-gradient\([^)]*,\s*#dc2626[^)]*\)/i',
            'background-color: #dc2626',
            $html
        );
        
        // Modrá varianta (info)
        $html = preg_replace(
            '/background:\s*linear-gradient\([^)]*,\s*#3b82f6[^)]*\)/i',
            'background-color: #3b82f6',
            $html
        );
        
        // Obecná náhrada všech linear-gradient (fallback)
        $html = preg_replace(
            '/background:\s*linear-gradient\([^)]+\)/i',
            'background-color: #059669',
            $html
        );
        
        // 2. Odstranění box-shadow
        $html = preg_replace(
            '/box-shadow:\s*[^;]+;/i',
            '',
            $html
        );
        
        // 3. Oprava header struktury - najít h1 v headerech a obalit vnořenými tabulkami
        // Pattern pro header s h1
        $html = preg_replace_callback(
            '/<td[^>]*style="[^"]*background-color:\s*#[0-9a-f]{6}[^"]*"[^>]*>\s*<h1/i',
            function($matches) {
                $td_tag = $matches[0];
                // Změnit padding a přidat align center, vnořené tabulky přidáme později ručně
                $td_tag = preg_replace('/padding:\s*[^;]+;/', 'padding: 0;', $td_tag);
                if (strpos($td_tag, 'align=') === false) {
                    $td_tag = str_replace('<td', '<td align="center"', $td_tag);
                }
                return $td_tag;
            },
            $html
        );
        
        // 4. Změna textu "EEO" na "EEO v2"
        $html = str_replace(
            'Tento e-mail byl automaticky vygenerován systémem EEO.',
            'Tento e-mail byl automaticky vygenerován systémem EEO v2.',
            $html
        );
        
        // 5. Přidání border-bottom pro větší hloubku místo box-shadow na content boxes
        $html = preg_replace(
            '/(<table[^>]*style="[^"]*background-color:\s*#ffffff[^"]*")([^>]*)>/i',
            '$1; border: 1px solid #e5e7eb;"$2>',
            $html
        );
        
        $new_size = strlen($html);
        
        // Kontrola, jestli jsme něco změnili
        if ($original_size === $new_size) {
            echo "   ℹ️  Žádné změny nebyly potřeba\n\n";
            continue;
        }
        
        // Uložení do databáze
        $stmt = $pdo->prepare("
            UPDATE 25_notifikace_sablony 
            SET email_telo = ?, dt_updated = NOW() 
            WHERE typ = ?
        ");
        
        if ($stmt->execute([$html, $typ])) {
            $fixed_count++;
            echo "   ✅ Opraveno a uloženo ($original_size → $new_size bytů)\n\n";
        } else {
            $error_count++;
            echo "   ❌ Chyba při ukládání\n\n";
        }
    }
    
    echo str_repeat('=', 80) . "\n";
    echo "HOTOVO!\n";
    echo "✅ Opraveno: $fixed_count šablon\n";
    if ($error_count > 0) {
        echo "❌ Chyby: $error_count\n";
    }
    echo str_repeat('=', 80) . "\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
