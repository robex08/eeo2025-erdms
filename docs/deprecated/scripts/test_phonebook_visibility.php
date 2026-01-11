<?php
/**
 * Test načítání uživatelů a viditelnosti v telefonním seznamu
 * Pro debug účely
 */

// Load .env
require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/');
$dotenv->load();

// Include API dependencies
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

echo "🔵 TEST: Načítání uživatelů s viditelností v telefonním seznamu\n";
echo str_repeat("=", 80) . "\n";

try {
    $config = get_db_config_from_env();
    $db = get_db($config);
    
    if (!$db) {
        echo "❌ Chyba: Nelze připojit k databázi\n";
        exit(1);
    }
    
    echo "✅ Připojeno k databázi: " . $config['db_name'] . "\n\n";
    
    // Testovací query s viditelnost_v_tel_seznamu
    $sql = "
        SELECT 
            u.id,
            u.username,
            CONCAT(u.titul_pred, ' ', u.jmeno, ' ', u.prijmeni, ' ', u.titul_za) as full_name,
            u.email,
            u.telefon,
            u.aktivni,
            u.viditelny_v_tel_seznamu
        FROM 25_uzivatele u 
        WHERE u.id > 0 
        LIMIT 10
    ";
    
    echo "🔍 SQL dotaz:\n" . trim($sql) . "\n\n";
    
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "📊 Nalezeno uživatelů: " . count($users) . "\n";
    echo str_repeat("-", 80) . "\n";
    
    foreach ($users as $user) {
        $fullName = trim($user['full_name']);
        $visibility = (int)$user['viditelny_v_tel_seznamu'];
        $active = (int)$user['aktivni'];
        
        echo sprintf("ID: %3d | %s | %s | Tel. seznam: %s | Aktivní: %s\n",
            $user['id'],
            str_pad($fullName, 25, ' ', STR_PAD_RIGHT),
            str_pad($user['email'] ?: '(bez emailu)', 30, ' ', STR_PAD_RIGHT),
            $visibility ? '✅' : '❌',
            $active ? '✅' : '❌'
        );
        
        if ($user['telefon']) {
            echo "     Telefon: " . $user['telefon'] . "\n";
        }
        echo "\n";
    }
    
    // Sumarizace
    $visible_count = array_sum(array_column($users, 'viditelny_v_tel_seznamu'));
    $active_count = array_sum(array_column($users, 'aktivni'));
    
    echo str_repeat("=", 80) . "\n";
    echo "📋 SOUHRN:\n";
    echo "- Viditelní v tel. seznamu: {$visible_count}/" . count($users) . "\n";
    echo "- Aktivní uživatelé: {$active_count}/" . count($users) . "\n";
    echo "\n✅ Test dokončen úspěšně!\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}