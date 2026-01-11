<?php
/**
 * Query pro objednávku O-0046 (rok 2026) - workflow status
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "\n=== DOTAZ NA OBJEDNÁVKU O-0046/2026 ===\n\n";

try {
    // Konfigurace databáze z .env.example
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
    
    echo "✅ Připojení k databázi: OK\n";
    echo "📍 Databáze: {$config['database']}\n\n";
    
    // Hledáme objednávky s číslem obsahujícím "O-0046" a rok 2026
    $sql = "
        SELECT 
            id,
            cislo_objednavky,
            predmet,
            stav_workflow_kod,
            dt_vytvoreni,
            dt_aktualizace,
            dt_objednavky,
            max_cena_s_dph,
            uzivatel_id,
            garant_uzivatel_id,
            strediska_kod
        FROM 25a_objednavky 
        WHERE cislo_objednavky LIKE '%O-0046%'
           AND (cislo_objednavky LIKE '%/2026%' OR YEAR(dt_objednavky) = 2026 OR YEAR(dt_vytvoreni) = 2026)
        ORDER BY dt_vytvoreni DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $orders = $stmt->fetchAll();
    
    if (empty($orders)) {
        echo "❌ Nebyla nalezena žádná objednávka s číslem O-0046 pro rok 2026\n";
        
        // Zkusíme najít podobné objednávky
        echo "\n🔍 Hledám podobné objednávky...\n";
        
        $similarSql = "
            SELECT 
                cislo_objednavky,
                predmet,
                dt_vytvoreni
            FROM 25a_objednavky 
            WHERE cislo_objednavky LIKE '%O-004%'
            ORDER BY cislo_objednavky DESC
            LIMIT 10
        ";
        
        $stmt = $pdo->prepare($similarSql);
        $stmt->execute();
        $similar = $stmt->fetchAll();
        
        if ($similar) {
            echo "\n📋 Nalezeny podobné objednávky:\n";
            foreach ($similar as $order) {
                echo "   • {$order['cislo_objednavky']} - {$order['predmet']} (vytvořeno: {$order['dt_vytvoreni']})\n";
            }
        }
        
    } else {
        echo "✅ Nalezeno " . count($orders) . " objednávek:\n\n";
        
        foreach ($orders as $order) {
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            echo "📦 OBJEDNÁVKA: {$order['cislo_objednavky']}\n";
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            echo "🆔 ID: {$order['id']}\n";
            echo "📋 Předmět: {$order['predmet']}\n";
            echo "💰 Max. cena s DPH: {$order['max_cena_s_dph']} Kč\n";
            echo "👤 Uživatel ID: {$order['uzivatel_id']}\n";
            echo "👨‍💼 Garant ID: {$order['garant_uzivatel_id']}\n";
            echo "🏢 Střediska: {$order['strediska_kod']}\n";
            echo "📅 Datum objednávky: {$order['dt_objednavky']}\n";
            echo "📅 Datum vytvoření: {$order['dt_vytvoreni']}\n";
            echo "📅 Poslední aktualizace: {$order['dt_aktualizace']}\n\n";
            
            // Workflow status
            echo "🔄 WORKFLOW STATUS:\n";
            $workflowStates = json_decode($order['stav_workflow_kod'], true);
            
            if (is_array($workflowStates)) {
                echo "   📊 Stavy: " . implode(' → ', $workflowStates) . "\n";
                echo "   📈 Současný stav: " . end($workflowStates) . "\n";
                echo "   🔢 Počet fází: " . count($workflowStates) . "\n";
            } else {
                echo "   📊 Stav (raw): {$order['stav_workflow_kod']}\n";
            }
            
            // Detailní workflow historie (pokud existuje)
            echo "\n📚 Workflow historie:\n";
            $historySql = "
                SELECT 
                    stav_workflow_kod,
                    dt_zmeny,
                    uzivatel_id
                FROM 25a_workflow_historie 
                WHERE objednavka_id = ?
                ORDER BY dt_zmeny ASC
            ";
            
            try {
                $historyStmt = $pdo->prepare($historySql);
                $historyStmt->execute([$order['id']]);
                $history = $historyStmt->fetchAll();
                
                if ($history) {
                    foreach ($history as $record) {
                        echo "   🕐 {$record['dt_zmeny']} - {$record['stav_workflow_kod']} (user: {$record['uzivatel_id']})\n";
                    }
                } else {
                    echo "   ⚠️  Žádná workflow historie nenalezena\n";
                }
            } catch (Exception $e) {
                echo "   ❌ Chyba při načítání historie: " . $e->getMessage() . "\n";
            }
            
            echo "\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
    echo "📍 Soubor: " . $e->getFile() . " řádek " . $e->getLine() . "\n";
}

echo "\n=== KONEC DOTAZU ===\n\n";
?>