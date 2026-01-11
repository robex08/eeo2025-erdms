<?php
$host = '10.3.172.11';
$db = 'eeo2025-dev';
$user = 'erdms_user';
$pass = 'AhchohTahnoh7eim';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "╔═══════════════════════════════════════════════════════════════════════════╗\n";
    echo "║  KONTROLA OBJEDNÁVKY O-0046/2026 - WORKFLOW & FAKTURANTI                 ║\n";
    echo "╚═══════════════════════════════════════════════════════════════════════════╝\n\n";
    
    // 1️⃣ Načíst objednávku
    $stmt = $pdo->prepare("
        SELECT 
            o.id,
            o.cislo_objednavky,
            o.fakturant_id,
            o.dt_faktura_pridana,
            u.jmeno AS fakturant_jmeno,
            u.email AS fakturant_email
        FROM 25a_objednavky o
        LEFT JOIN 25_uzivatele u ON o.fakturant_id = u.id
        WHERE o.cislo_objednavky LIKE 'O-0046%'
        LIMIT 1
    ");
    $stmt->execute();
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        echo "❌ Objednávka O-0046 nenalezena!\n";
        exit(1);
    }
    
    echo "📋 OBJEDNÁVKA:\n";
    echo "   ID: {$order['id']}\n";
    echo "   Číslo: {$order['cislo_objednavky']}\n";
    echo "   fakturant_id: " . ($order['fakturant_id'] ?: 'NULL') . "\n";
    echo "   dt_faktura_pridana: " . ($order['dt_faktura_pridana'] ?: 'NULL') . "\n";
    
    if ($order['fakturant_id']) {
        echo "   👤 Fakturant (z obj): {$order['fakturant_jmeno']} ({$order['fakturant_email']})\n";
    } else {
        echo "   ⚠️  Fakturant není nastaven!\n";
    }
    echo "\n";
    
    // 2️⃣ Načíst všechny faktury k této objednávce
    $stmt = $pdo->prepare("
        SELECT 
            f.id AS faktura_id,
            f.fa_cislo_vema,
            f.vytvoril_uzivatel_id,
            f.dt_vytvoreni,
            u.jmeno AS vytvoril_jmeno,
            u.email AS vytvoril_email
        FROM 25a_objednavky_faktury f
        LEFT JOIN 25_uzivatele u ON f.vytvoril_uzivatel_id = u.id
        WHERE f.objednavka_id = ?
        ORDER BY f.dt_vytvoreni ASC
    ");
    $stmt->execute([$order['id']]);
    $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "📄 FAKTURY K OBJEDNÁVCE:\n";
    if (empty($faktury)) {
        echo "   ❌ Žádné faktury nenalezeny!\n\n";
    } else {
        foreach ($faktury as $idx => $fak) {
            $num = $idx + 1;
            echo "   {$num}. FA#{$fak['fa_cislo_vema']}\n";
            echo "      - Faktura ID: {$fak['faktura_id']}\n";
            echo "      - vytvoril_uzivatel_id: " . ($fak['vytvoril_uzivatel_id'] ?: 'NULL') . "\n";
            echo "      - 👤 Vytvořil: {$fak['vytvoril_jmeno']} ({$fak['vytvoril_email']})\n";
            echo "      - 📅 Datum: {$fak['dt_vytvoreni']}\n";
            echo "\n";
        }
    }
    
    // 3️⃣ Unikátní seznam fakturantů
    echo "👥 UNIKÁTNÍ FAKTURANTI (z faktur):\n";
    if (empty($faktury)) {
        echo "   (žádné faktury)\n\n";
    } else {
        $uniqueUsers = [];
        foreach ($faktury as $fak) {
            $uid = $fak['vytvoril_uzivatel_id'];
            if ($uid && !isset($uniqueUsers[$uid])) {
                $uniqueUsers[$uid] = [
                    'id' => $uid,
                    'jmeno' => $fak['vytvoril_jmeno'],
                    'email' => $fak['vytvoril_email']
                ];
            }
        }
        
        if (empty($uniqueUsers)) {
            echo "   ⚠️ Žádný z faktur nemá vyplněno vytvoril_uzivatel_id!\n\n";
        } else {
            foreach ($uniqueUsers as $u) {
                echo "   - ID {$u['id']}: {$u['jmeno']} ({$u['email']})\n";
            }
            echo "\n";
        }
    }
    
    // 4️⃣ Porovnání
    echo "🔍 ANALÝZA:\n";
    echo "   - Tabulka 25a_objednavky.fakturant_id: " . ($order['fakturant_id'] ?: '❌ NULL') . "\n";
    echo "   - Faktury s vytvoril_uzivatel_id: " . count($faktury) . " záznamů\n";
    
    if ($order['fakturant_id']) {
        $isInFaktury = false;
        foreach ($faktury as $fak) {
            if ($fak['vytvoril_uzivatel_id'] == $order['fakturant_id']) {
                $isInFaktury = true;
                break;
            }
        }
        
        if ($isInFaktury) {
            echo "   ✅ fakturant_id = {$order['fakturant_id']} ODPOVÍDÁ uživateli z faktur\n";
        } else {
            echo "   ⚠️  fakturant_id = {$order['fakturant_id']} NEODPOVÍDÁ žádné faktuře!\n";
        }
    }
    
    echo "\n";
    echo "💡 SOUČASNÝ STAV KÓDU:\n";
    echo "   ✅ Workflow krok 6 'Přidání faktur':\n";
    echo "      Zobrazuje VŠECHNY faktury s vytvoril_uzivatel + dt_vytvoreni\n";
    echo "   ✅ Odpovědné osoby 'Fakturant(i)':\n";
    echo "      Zobrazuje UNIKÁTNÍ seznam všech fakturantů z faktur\n";
    echo "      (tzn. UNIQUE vytvoril_uzivatel_id ze všech faktur + primární fakturant_id)\n\n";
    
} catch (PDOException $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}
