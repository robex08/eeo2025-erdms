<?php
/**
 * DEBUG: Vypíše RAW data pokladny 999 přímo z databáze
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// DB připojení
$host = '10.3.172.11';
$dbname = 'EEO-OSTRA-DEV';
$user = 'erdms_user';
$pass = 'CHANGE_ME_DB_PASSWORD';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== DEBUG POKLADNA 999 - RAW DATA Z DATABÁZE ===\n\n";
    
    // 1. Základní info o pokladně
    echo "1️⃣ POKLADNA 999:\n";
    $stmt = $pdo->query("
        SELECT * FROM 25a_pokladny 
        WHERE cislo_pokladny = 999
    ");
    $pokladna = $stmt->fetch(PDO::FETCH_ASSOC);
    print_r($pokladna);
    echo "\n";
    
    $pokladna_id = $pokladna['id'];
    echo "✅ Pokladna ID: $pokladna_id\n\n";
    
    // 2. Všichni přiřazení uživatelé
    echo "2️⃣ PŘIŘAZENÍ UŽIVATELÉ (25a_pokladny_uzivatele):\n";
    $stmt = $pdo->prepare("
        SELECT 
            pu.id AS prirazeni_id,
            pu.uzivatel_id,
            pu.pokladna_id,
            u.jmeno,
            u.prijmeni,
            u.username
        FROM 25a_pokladny_uzivatele pu
        LEFT JOIN 25_uzivatele u ON u.id = pu.uzivatel_id
        WHERE pu.pokladna_id = ?
        ORDER BY pu.id
    ");
    $stmt->execute([$pokladna_id]);
    $prirazeni = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($prirazeni);
    echo "\n";
    
    // 3. Všechny pokladní knihy pro tuto pokladnu
    echo "3️⃣ VŠECHNY POKLADNÍ KNIHY (25a_pokladni_knihy) - LEDEN 2026:\n";
    $stmt = $pdo->prepare("
        SELECT 
            kb.*,
            u.jmeno,
            u.prijmeni,
            u.username
        FROM 25a_pokladni_knihy kb
        LEFT JOIN 25_uzivatele u ON u.id = kb.uzivatel_id
        WHERE kb.pokladna_id = ?
        AND kb.rok = 2026
        AND kb.mesic = 1
        ORDER BY kb.id
    ");
    $stmt->execute([$pokladna_id]);
    $knihy = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($knihy);
    echo "\n";
    
    // 4. VŠECHNY POLOŽKY pro každou knihu
    echo "4️⃣ VŠECHNY POLOŽKY (25a_pokladni_polozky):\n";
    foreach ($knihy as $kniha) {
        $book_id = $kniha['id'];
        $uziv_id = $kniha['uzivatel_id'];
        echo "\n--- Kniha ID: $book_id (User: $uziv_id - {$kniha['jmeno']} {$kniha['prijmeni']}) ---\n";
        
        $stmt = $pdo->prepare("
            SELECT * FROM 25a_pokladni_polozky
            WHERE pokladni_kniha_id = ?
            ORDER BY datum, id
        ");
        $stmt->execute([$book_id]);
        $polozky = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($polozky)) {
            echo "   ⚠️ ŽÁDNÉ POLOŽKY!\n";
        } else {
            echo "   ✅ Počet položek: " . count($polozky) . "\n";
            print_r($polozky);
        }
    }
    
    // 5. SPECIÁLNÍ: Položky pro user 100 (Robert Holovský)
    echo "\n\n5️⃣ SPECIÁLNÍ: Položky pro usera 100 (Robert Holovský):\n";
    $stmt = $pdo->prepare("
        SELECT 
            p.*,
            kb.id AS kniha_id,
            kb.uzivatel_id,
            kb.rok,
            kb.mesic,
            u.jmeno,
            u.prijmeni,
            u.username
        FROM 25a_pokladni_polozky p
        JOIN 25a_pokladni_knihy kb ON kb.id = p.pokladni_kniha_id
        JOIN 25_uzivatele u ON u.id = kb.uzivatel_id
        WHERE kb.pokladna_id = ?
        AND kb.uzivatel_id = 100
        AND kb.rok = 2026
        AND kb.mesic = 1
        ORDER BY p.datum, p.id
    ");
    $stmt->execute([$pokladna_id]);
    $polozky_100 = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($polozky_100)) {
        echo "   ⚠️ ŽÁDNÉ POLOŽKY pro usera 100!\n";
    } else {
        echo "   ✅ Počet položek: " . count($polozky_100) . "\n";
        print_r($polozky_100);
    }
    
    // 6. KONTROLA: Co vrací backend API endpoint
    echo "\n\n6️⃣ SIMULACE BACKEND API - cashbook-get pro pokladnu 999:\n";
    echo "   (Co by mělo vidět frontend)\n\n";
    
    // Najít všechny uživatele přiřazené k pokladně 999
    $user_ids = array_column($prirazeni, 'uzivatel_id');
    echo "   Uživatelé přiřazení k pokladně: " . implode(', ', $user_ids) . "\n\n";
    
    foreach ($user_ids as $uid) {
        echo "   --- User ID: $uid ---\n";
        
        // Najít knihu
        $stmt = $pdo->prepare("
            SELECT * FROM 25a_pokladni_knihy
            WHERE pokladna_id = ? AND uzivatel_id = ? AND rok = 2026 AND mesic = 1
        ");
        $stmt->execute([$pokladna_id, $uid]);
        $kb = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$kb) {
            echo "   ⚠️ Kniha neexistuje\n\n";
            continue;
        }
        
        echo "   ✅ Kniha ID: {$kb['id']}\n";
        
        // Načíst položky
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as pocet, 
                   SUM(CASE WHEN typ = 'prijem' THEN castka ELSE 0 END) as prijmy,
                   SUM(CASE WHEN typ = 'vydaj' THEN castka ELSE 0 END) as vydaje
            FROM 25a_pokladni_polozky
            WHERE pokladni_kniha_id = ?
        ");
        $stmt->execute([$kb['id']]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "   📊 Počet položek: {$stats['pocet']}\n";
        echo "   💰 Příjmy: {$stats['prijmy']} Kč\n";
        echo "   💸 Výdaje: {$stats['vydaje']} Kč\n\n";
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
