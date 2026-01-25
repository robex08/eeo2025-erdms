<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$host = '10.3.172.11';
$dbname = 'EEO-OSTRA-DEV';
$user = 'erdms_user';
$pass = 'AhchohTahnoh7eim';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== POLOŽKY PRO BOOK_ID 20 (User 100, Pokladna 999) ===\n\n";
    
    $stmt = $pdo->query("
        SELECT * FROM 25a_pokladni_polozky
        WHERE pokladni_kniha_id = 20
    ");
    
    $polozky = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Počet položek: " . count($polozky) . "\n\n";
    
    if (count($polozky) > 0) {
        foreach ($polozky as $idx => $pol) {
            echo "=== POLOŽKA #" . ($idx + 1) . " ===\n";
            print_r($pol);
            echo "\n";
        }
    } else {
        echo "⚠️ ŽÁDNÉ POLOŽKY NEBYLY NALEZENY!\n";
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
}
