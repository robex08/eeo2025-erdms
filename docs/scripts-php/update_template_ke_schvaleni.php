#!/usr/bin/php
<?php
// Script pro nahrání opravené šablony do databáze

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'AhchohTahnoh7eim';
$dbName = 'eeo2025';

echo "====================================================================\n";
echo "Nahrávám opravenou šablonu 'order_status_ke_schvaleni' do DB\n";
echo "====================================================================\n\n";

try {
    // Připojení k DB
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Připojeno k databázi\n\n";
    
    // Načtení souboru
    $templateFile = '/var/www/erdms-dev/templates/FIXED_order_status_ke_schvaleni_outlook.html';
    
    if (!file_exists($templateFile)) {
        throw new Exception("Soubor $templateFile neexistuje!");
    }
    
    $htmlContent = file_get_contents($templateFile);
    $fileSize = strlen($htmlContent);
    
    echo "✅ Načten soubor: " . basename($templateFile) . "\n";
    echo "   Velikost: " . number_format($fileSize) . " bytů\n\n";
    
    // Kontrola obsahu
    $hasGradient = (strpos($htmlContent, 'linear-gradient') !== false);
    $hasBoxShadow = (strpos($htmlContent, 'box-shadow') !== false);
    $hasMSO = (strpos($htmlContent, '<!--[if mso]>') !== false);
    
    echo "📋 Kontrola šablony:\n";
    echo "   Gradient: " . ($hasGradient ? "❌ ANO (špatně!)" : "✅ NE (správně!)") . "\n";
    echo "   Box-shadow: " . ($hasBoxShadow ? "❌ ANO (špatně!)" : "✅ NE (správně!)") . "\n";
    echo "   MSO podmínky: " . ($hasMSO ? "✅ ANO (správně!)" : "⚠️ NE") . "\n";
    echo "   Počet variant: " . substr_count($htmlContent, '<!-- RECIPIENT:') . "\n\n";
    
    if ($hasGradient || $hasBoxShadow) {
        echo "⚠️ VAROVÁNÍ: Šablona stále obsahuje problematický CSS!\n\n";
    }
    
    // Update do DB
    echo "💾 Ukládám do databáze...\n";
    
    $stmt = $pdo->prepare("
        UPDATE 25_notifikace_sablony 
        SET email_telo = ?,
            dt_updated = NOW()
        WHERE typ = 'order_status_ke_schvaleni'
    ");
    
    $stmt->execute([$htmlContent]);
    $rowsAffected = $stmt->rowCount();
    
    if ($rowsAffected > 0) {
        echo "✅ Šablona úspěšně aktualizována! ($rowsAffected řádek)\n\n";
        
        // Ověření v DB
        $stmt = $pdo->prepare("
            SELECT 
                typ,
                LENGTH(email_telo) as velikost,
                CASE WHEN email_telo LIKE '%linear-gradient%' THEN 'ANO' ELSE 'NE' END as ma_gradient,
                CASE WHEN email_telo LIKE '%box-shadow%' THEN 'ANO' ELSE 'NE' END as ma_box_shadow,
                CASE WHEN email_telo LIKE '%<!--[if mso]>%' THEN 'ANO' ELSE 'NE' END as ma_mso,
                dt_updated
            FROM 25_notifikace_sablony
            WHERE typ = 'order_status_ke_schvaleni'
        ");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "📊 Stav v databázi:\n";
        echo "   Typ: {$result['typ']}\n";
        echo "   Velikost: " . number_format($result['velikost']) . " bytů\n";
        echo "   Gradient: " . ($result['ma_gradient'] === 'NE' ? '✅' : '❌') . " {$result['ma_gradient']}\n";
        echo "   Box-shadow: " . ($result['ma_box_shadow'] === 'NE' ? '✅' : '❌') . " {$result['ma_box_shadow']}\n";
        echo "   MSO podmínky: " . ($result['ma_mso'] === 'ANO' ? '✅' : '⚠️') . " {$result['ma_mso']}\n";
        echo "   Aktualizováno: {$result['dt_updated']}\n\n";
        
        echo "====================================================================\n";
        echo "✅ HOTOVO! Šablona je připravena k použití.\n";
        echo "====================================================================\n";
        
    } else {
        echo "⚠️ Žádný řádek nebyl aktualizován (šablona neexistuje?)\n";
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
