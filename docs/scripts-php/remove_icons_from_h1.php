#!/usr/bin/php
<?php
/**
 * Odstranění ikon z nadpisů (h1) ve všech šablonách
 * VÝJIMKA: KE_SCHVALENI URGENT - tam nechat
 */

$dbHost = '10.3.172.11';
$dbUser = 'erdms_user';
$dbPass = 'CHANGE_ME_DB_PASSWORD';
$dbName = 'eeo2025';

echo str_repeat('=', 80) . "\n";
echo "ODSTRANĚNÍ IKON Z NADPISŮ (kromě KE_SCHVALENI URGENT)\n";
echo str_repeat('=', 80) . "\n\n";

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("
        SELECT typ FROM 25_notifikace_sablony 
        WHERE email_telo IS NOT NULL AND LENGTH(email_telo) > 1000
        ORDER BY typ
    ");
    
    $count = 0;
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $typ = $row['typ'];
        
        echo "📧 Zpracovávám: $typ\n";
        
        // Načtení šablony
        $stmt2 = $pdo->prepare("SELECT email_telo FROM 25_notifikace_sablony WHERE typ = ?");
        $stmt2->execute([$typ]);
        $html = $stmt2->fetch(PDO::FETCH_ASSOC)['email_telo'];
        
        // Pro KE_SCHVALENI zpracovat speciálně - URGENT nechat, ostatní odstranit
        if ($typ === 'order_status_ke_schvaleni') {
            // NORMAL - odstranit ❗
            $html = preg_replace(
                '/(<h1[^>]*>)\s*&#10071;\s*(.*?<\/h1>)/s',
                '$1$2',
                $html,
                1
            );
            
            // SUBMITTER - bez ikony
            $html = preg_replace(
                '/(<!-- RECIPIENT: SUBMITTER -->.*?<h1[^>]*>)(.*?)(Objednávka odeslána ke schválení)(.*?<\/h1>)/s',
                '$1$3$4',
                $html
            );
            
            // URGENT - nechat ⚡ (&#9889;)
            echo "   ✅ NORMAL a SUBMITTER: ikony odstraněny, URGENT: ⚡ ponechán\n\n";
        } else {
            // Odstranění všech běžných emoji a HTML entit z h1
            $patterns = [
                '/(<h1[^>]*>)\s*✅\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*❌\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*📝\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*📤\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*⏸️\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*💰\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*📋\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*❗\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*&#10004;\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*&#10071;\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*&#128203;\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*&#128640;\s*(.*?<\/h1>)/s',
                '/(<h1[^>]*>)\s*&#128176;\s*(.*?<\/h1>)/s',
            ];
            
            foreach ($patterns as $pattern) {
                $html = preg_replace($pattern, '$1$2', $html);
            }
            
            echo "   ✅ Ikony odstraněny\n\n";
        }
        
        // Uložení
        $stmt3 = $pdo->prepare("UPDATE 25_notifikace_sablony SET email_telo = ?, dt_updated = NOW() WHERE typ = ?");
        if ($stmt3->execute([$html, $typ])) {
            $count++;
        }
    }
    
    echo str_repeat('=', 80) . "\n";
    echo "✅ HOTOVO! Upraveno $count šablon\n";
    echo str_repeat('=', 80) . "\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
