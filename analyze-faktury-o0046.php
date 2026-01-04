<?php
/**
 * Dotaz na objednávku O-0046/2026 s detaily faktur včetně toho, kdo je přidal
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "\n=== ANALÝZA FAKTUR OBJEDNÁVKY O-0046/2026 ===\n\n";

try {
    // Konfigurace databáze
    $config = [
        'host' => '10.3.172.11',
        'database' => 'eeo2025-dev',
        'username' => 'erdms_user',
        'password' => 'AhchohTahnoh7eim',
        'charset' => 'utf8mb4'
    ];
    
    $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    $pdo = new PDO($dsn, $config['username'], $config['password'], $options);
    
    echo "✅ Připojení k databázi: OK\n\n";
    
    // Najít objednávku O-0046/2026
    $sqlOrder = "
        SELECT 
            o.id,
            o.cislo_objednavky,
            o.predmet,
            o.stav_workflow_kod,
            o.fakturant_id,
            o.dt_faktura_pridana,
            u_fakturant.jmeno AS fakturant_jmeno,
            u_fakturant.prijmeni AS fakturant_prijmeni
        FROM 25a_objednavky o
        LEFT JOIN 25_uzivatele u_fakturant ON o.fakturant_id = u_fakturant.id
        WHERE o.cislo_objednavky LIKE 'O-0046%2026%'
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($sqlOrder);
    $stmt->execute();
    $order = $stmt->fetch();
    
    if (!$order) {
        echo "❌ Objednávka O-0046/2026 nebyla nalezena\n";
        exit;
    }
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "📦 OBJEDNÁVKA: {$order['cislo_objednavky']}\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "🆔 ID: {$order['id']}\n";
    echo "📋 Předmět: {$order['predmet']}\n";
    echo "🔄 Workflow: {$order['stav_workflow_kod']}\n\n";
    
    echo "📊 FAKTURANT V OBJEDNÁVCE (25a_objednavky.fakturant_id):\n";
    if ($order['fakturant_id']) {
        echo "   👤 ID: {$order['fakturant_id']}\n";
        echo "   👤 Jméno: {$order['fakturant_jmeno']} {$order['fakturant_prijmeni']}\n";
        echo "   📅 Datum přidání první faktury: {$order['dt_faktura_pridana']}\n";
    } else {
        echo "   ⚠️  Fakturant není nastaven\n";
    }
    
    echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "📄 FAKTURY (25a_objednavky_faktury):\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    
    // Načíst všechny faktury k této objednávce
    $sqlFaktury = "
        SELECT 
            f.id,
            f.fa_cislo_vema,
            f.fa_castka,
            f.fa_dorucena,
            f.fa_zaplacena,
            f.fa_datum_vystaveni,
            f.fa_datum_splatnosti,
            f.fa_datum_doruceni,
            f.fa_datum_zaplaceni,
            f.fa_poznamka,
            f.vytvoril_uzivatel_id,
            f.dt_vytvoreni,
            f.dt_aktualizace,
            u_vytvoril.jmeno AS vytvoril_jmeno,
            u_vytvoril.prijmeni AS vytvoril_prijmeni,
            u_vytvoril.email AS vytvoril_email
        FROM 25a_objednavky_faktury f
        LEFT JOIN 25_uzivatele u_vytvoril ON f.vytvoril_uzivatel_id = u_vytvoril.id
        WHERE f.objednavka_id = ? AND f.aktivni = 1
        ORDER BY f.dt_vytvoreni ASC
    ";
    
    $stmtFaktury = $pdo->prepare($sqlFaktury);
    $stmtFaktury->execute([$order['id']]);
    $faktury = $stmtFaktury->fetchAll();
    
    if (empty($faktury)) {
        echo "⚠️  Žádné faktury nebyly nalezeny\n";
    } else {
        echo "✅ Nalezeno " . count($faktury) . " faktur:\n\n";
        
        foreach ($faktury as $index => $faktura) {
            $cislo = $index + 1;
            echo "┌─────────────────────────────────────────────────────────────────┐\n";
            echo "│ FAKTURA #{$cislo}                                                  \n";
            echo "├─────────────────────────────────────────────────────────────────┤\n";
            echo "│ 🆔 ID faktury: {$faktura['id']}\n";
            echo "│ 📄 Číslo: {$faktura['fa_cislo_vema']}\n";
            echo "│ 💰 Částka: " . number_format($faktura['fa_castka'], 2, ',', ' ') . " Kč\n";
            echo "│ 📅 Datum vystavení: " . ($faktura['fa_datum_vystaveni'] ?: '---') . "\n";
            echo "│ 📅 Datum splatnosti: " . ($faktura['fa_datum_splatnosti'] ?: '---') . "\n";
            echo "│ 📅 Datum doručení: " . ($faktura['fa_datum_doruceni'] ?: '---') . "\n";
            echo "│ 📅 Datum zaplacení: " . ($faktura['fa_datum_zaplaceni'] ?: '---') . "\n";
            echo "│ ✅ Doručena: " . ($faktura['fa_dorucena'] ? 'ANO' : 'NE') . "\n";
            echo "│ ✅ Zaplacena: " . ($faktura['fa_zaplacena'] ? 'ANO' : 'NE') . "\n";
            
            if ($faktura['fa_poznamka']) {
                echo "│ 📝 Poznámka: {$faktura['fa_poznamka']}\n";
            }
            
            echo "│\n";
            echo "│ 👤 KDO PŘIDAL FAKTURU:\n";
            echo "│    • User ID: {$faktura['vytvoril_uzivatel_id']}\n";
            echo "│    • Jméno: {$faktura['vytvoril_jmeno']} {$faktura['vytvoril_prijmeni']}\n";
            echo "│    • Email: {$faktura['vytvoril_email']}\n";
            echo "│    • Vytvořeno: {$faktura['dt_vytvoreni']}\n";
            
            if ($faktura['dt_aktualizace']) {
                echo "│    • Aktualizováno: {$faktura['dt_aktualizace']}\n";
            }
            
            echo "└─────────────────────────────────────────────────────────────────┘\n\n";
        }
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "💡 VYSVĚTLENÍ PROBLÉMU:\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        
        echo "⚠️  PROBLÉM:\n";
        echo "   • V tabulce `25a_objednavky` je sloupec `fakturant_id`\n";
        echo "   • Tento sloupec ukládá ID uživatele, který přidal PRVNÍ fakturu\n";
        echo "   • Při přidání další faktury se tento sloupec PŘEPISUJE\n";
        echo "   • Tím se ztrácí informace o tom, kdo přidal tu první fakturu\n\n";
        
        echo "✅ ŘEŠENÍ:\n";
        echo "   • Informace o tom, kdo přidal každou konkrétní fakturu,\n";
        echo "     je uložena v tabulce `25a_objednavky_faktury`\n";
        echo "   • Sloupec `vytvoril_uzivatel_id` obsahuje ID uživatele\n";
        echo "   • Tento údaj se NIKDY NEPŘEPISUJE\n\n";
        
        echo "📊 DOPORUČENÍ:\n";
        echo "   1. Při výpisu faktur VŽDY zobrazovat `vytvoril_uzivatel_id`\n";
        echo "   2. Sloupec `fakturant_id` v `25a_objednavky` je DEPRECATED\n";
        echo "   3. Pro kontrolu použít JOIN s tabulkou `25a_objednavky_faktury`\n";
    }
    
} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
    echo "📍 Soubor: " . $e->getFile() . " řádek " . $e->getLine() . "\n";
}

echo "\n=== KONEC ANALÝZY ===\n\n";
?>