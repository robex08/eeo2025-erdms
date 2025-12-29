<?php
/**
 * DEBUG náhled welcome email šablony z databáze
 */

// DB konfigurace
$config = array(
    'db_host' => '10.3.172.11',
    'db_port' => 3306,
    'db_name' => 'eeo2025-dev',
    'db_user' => 'erdms_user',
    'db_pass' => 'AhchohTahnoh7eim',
    'db_charset' => 'utf8mb4'
);

try {
    // Připojení k DB
    $db = new PDO(
        "mysql:host={$config['db_host']};port={$config['db_port']};dbname={$config['db_name']};charset={$config['db_charset']}",
        $config['db_user'],
        $config['db_pass'],
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );
    
    // Načtení šablony z DB
    $stmt = $db->prepare("SELECT * FROM 25_notifikace_sablony WHERE typ = 'welcome_new_user' AND aktivni = 1");
    $stmt->execute();
    $template = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$template) {
        die('❌ Šablona welcome_new_user nebyla nalezena v databázi!');
    }
    
    // Připravení placeholder dat pro náhled
    $placeholders = array(
        '{uzivatelske_jmeno}' => 'jan.novak',
        '{docasne_heslo}' => 'Test1234!',
        '{cele_jmeno}' => 'Jan Novák',
        '{jmeno}' => 'Jan',
        '{prijmeni}' => 'Novák',
        '{email}' => 'jan.novak@zachranka.cz'
    );
    
    // Nahrazení placeholderů
    $email_body = $template['email_telo'];
    $email_subject = $template['email_predmet'];
    
    foreach ($placeholders as $placeholder => $value) {
        $email_body = str_replace($placeholder, $value, $email_body);
        $email_subject = str_replace($placeholder, $value, $email_subject);
    }
    
    // Výpis HTML náhledu
    header('Content-Type: text/html; charset=UTF-8');
    echo $email_body;
    
} catch (Exception $e) {
    die('❌ Chyba: ' . $e->getMessage());
}
?>
