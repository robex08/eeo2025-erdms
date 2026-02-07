<?php
// Kontrola emailových adres aktivních uživatelů
$host = '10.3.172.11';
$db = 'eeo2025-dev';
$user = 'erdms_user';
$pass = 'AhchohTahnoh7eim';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("SELECT id, username, jmeno, prijmeni, email FROM 25_uzivatele WHERE aktivni = 1 ORDER BY id");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    function removeDiacritics($string) {
        $diacritics = [
            'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e',
            'í' => 'i', 'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's',
            'ť' => 't', 'ú' => 'u', 'ů' => 'u', 'ý' => 'y', 'ž' => 'z',
            'Á' => 'a', 'Č' => 'c', 'Ď' => 'd', 'É' => 'e', 'Ě' => 'e',
            'Í' => 'i', 'Ň' => 'n', 'Ó' => 'o', 'Ř' => 'r', 'Š' => 's',
            'Ť' => 't', 'Ú' => 'u', 'Ů' => 'u', 'Ý' => 'y', 'Ž' => 'z'
        ];
        return str_replace(array_keys($diacritics), array_values($diacritics), $string);
    }
    
    $stats = [
        'total' => 0,
        'ok' => 0,
        'not_zachranka' => 0,
        'wrong_format' => 0
    ];
    
    $problems = [];
    
    foreach ($users as $user) {
        $stats['total']++;
        
        $jmeno = trim($user['jmeno']);
        $prijmeni = trim($user['prijmeni']);
        $email = trim($user['email']);
        
        // Očekávaný email bez diakritiky
        $expectedEmail = strtolower(removeDiacritics($jmeno)) . '.' . strtolower(removeDiacritics($prijmeni)) . '@zachranka.cz';
        
        // Kontrola
        if (!str_contains($email, '@zachranka.cz')) {
            $stats['not_zachranka']++;
            $problems[] = [
                'id' => $user['id'],
                'username' => $user['username'],
                'jmeno' => $jmeno,
                'prijmeni' => $prijmeni,
                'email' => $email,
                'expected' => $expectedEmail,
                'problem' => 'NENÍ @zachranka.cz'
            ];
        } elseif ($email !== $expectedEmail) {
            $stats['wrong_format']++;
            $problems[] = [
                'id' => $user['id'],
                'username' => $user['username'],
                'jmeno' => $jmeno,
                'prijmeni' => $prijmeni,
                'email' => $email,
                'expected' => $expectedEmail,
                'problem' => 'NEODPOVÍDÁ jmeno.prijmeni (bez diakritiky)'
            ];
        } else {
            $stats['ok']++;
        }
    }
    
    echo "\n=== STATISTIKY ===\n";
    echo "Celkem aktivních uživatelů: {$stats['total']}\n";
    echo "Email správně (jmeno.prijmeni@zachranka.cz bez diakritiky): {$stats['ok']} (" . round($stats['ok']/$stats['total']*100, 1) . "%)\n";
    echo "Email NENÍ @zachranka.cz: {$stats['not_zachranka']}\n";
    echo "Email NEODPOVÍDÁ formátu jmeno.prijmeni: {$stats['wrong_format']}\n";
    
    echo "\n=== PROBLEMATICKÉ ZÁZNAMY (" . count($problems) . ") ===\n\n";
    
    foreach ($problems as $p) {
        echo "ID: {$p['id']} | {$p['username']} | {$p['jmeno']} {$p['prijmeni']}\n";
        echo "  Aktuální:   {$p['email']}\n";
        echo "  Očekávaný:  {$p['expected']}\n";
        echo "  Problém:    {$p['problem']}\n\n";
    }
    
} catch (PDOException $e) {
    echo "Chyba: " . $e->getMessage() . "\n";
}
