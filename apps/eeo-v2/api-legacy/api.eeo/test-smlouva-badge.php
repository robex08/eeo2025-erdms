<?php
/**
 * Diagnostický skript pro kontrolu badge u smlouvy S-132/75030926/22
 */

// Načíst .env
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value));
    }
}

// DB připojení
$host = getenv('DB_HOST');
$dbname = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');

echo "=== DIAGNOSTIKA BADGE PRO SMLOUVU S-132/75030926/22 ===\n\n";
echo "Database: $dbname @ $host\n\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $cislo_smlouvy = 'S-132/75030926/22';
    
    // 1. Zkontrolovat, jestli smlouva existuje
    echo "--- 1. KONTROLA EXISTENCE SMLOUVY ---\n";
    $stmt = $pdo->prepare("SELECT id, cislo_smlouvy, nazev_smlouvy, aktivni, pouzit_v_obj_formu FROM 25_smlouvy WHERE cislo_smlouvy = ?");
    $stmt->execute([$cislo_smlouvy]);
    $smlouva = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$smlouva) {
        echo "❌ Smlouva '$cislo_smlouvy' NENALEZENA v tabulce 25_smlouvy!\n";
        exit(1);
    }
    
    echo "✅ Smlouva nalezena:\n";
    echo "   ID: {$smlouva['id']}\n";
    echo "   Název: {$smlouva['nazev_smlouvy']}\n";
    echo "   Aktivní: {$smlouva['aktivni']}\n";
    echo "   Použít v obj. formuláři: {$smlouva['pouzit_v_obj_formu']}\n\n";
    
    // 2. Najít VŠECHNY objednávky které mají tuto smlouvu v financovani
    echo "--- 2. VŠECHNY OBJEDNÁVKY S TOUTO SMLOUVOU ---\n";
    $stmt = $pdo->prepare("
        SELECT o.id, o.cislo_objednavky, o.aktivni, o.stav_objednavky, o.financovani
        FROM 25a_objednavky o
        WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
    ");
    $stmt->execute([$cislo_smlouvy]);
    $vsechny_obj = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Celkem nalezeno: " . count($vsechny_obj) . " objednávek\n\n";
    
    if (count($vsechny_obj) === 0) {
        echo "❌ ŽÁDNÉ objednávky nenalezeny s financovani obsahujícím tuto smlouvu!\n";
        echo "   Pravděpodobná příčina: Objednávka nemá v JSON poli 'financovani' správně uloženo 'cislo_smlouvy'\n\n";
        
        // Zkusit najít objednávky jinak
        echo "--- Hledám objednávky s podobným číslem smlouvy ---\n";
        $stmt = $pdo->prepare("
            SELECT o.id, o.cislo_objednavky, o.aktivni, o.stav_objednavky, o.financovani
            FROM 25a_objednavky o
            WHERE o.financovani LIKE ?
            LIMIT 5
        ");
        $stmt->execute(['%S-132%']);
        $podobne = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($podobne) > 0) {
            echo "Nalezeny objednávky s podobným číslem:\n";
            foreach ($podobne as $obj) {
                echo "\nObjednávka ID {$obj['id']} - {$obj['cislo_objednavky']}:\n";
                echo "   Aktivní: {$obj['aktivni']}, Stav: {$obj['stav_objednavky']}\n";
                echo "   Financování: " . substr($obj['financovani'], 0, 200) . "...\n";
            }
        }
        exit(1);
    }
    
    // Zobrazit všechny nalezené objednávky
    foreach ($vsechny_obj as $idx => $obj) {
        echo "Objednávka #" . ($idx + 1) . ":\n";
        echo "   ID: {$obj['id']}\n";
        echo "   Číslo: {$obj['cislo_objednavky']}\n";
        echo "   Aktivní: {$obj['aktivni']}\n";
        echo "   Stav: {$obj['stav_objednavky']}\n";
        
        // Parsovat financovani JSON
        $fin = json_decode($obj['financovani'], true);
        if ($fin) {
            echo "   Financování typ: " . ($fin['typ'] ?? 'N/A') . "\n";
            echo "   Číslo smlouvy v JSON: " . ($fin['cislo_smlouvy'] ?? 'CHYBÍ!') . "\n";
        } else {
            echo "   ⚠️  Financování není validní JSON!\n";
        }
        echo "\n";
    }
    
    // 3. Zjistit, kolik z nich splňuje podmínky pro badge (aktivni=1 a stav != Zamítnutá/Zrušena)
    echo "--- 3. PLATNÉ OBJEDNÁVKY PRO BADGE (aktivní=1, stav OK) ---\n";
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS pocet
        FROM 25a_objednavky o
        WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
          AND o.aktivni = 1
          AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
    ");
    $stmt->execute([$cislo_smlouvy]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $pocet_platnych = $result['pocet'];
    echo "Počet platných objednávek pro badge: $pocet_platnych\n\n";
    
    if ($pocet_platnych == 0) {
        echo "❌ PROBLÉM: Badge ukazuje 0, protože:\n";
        $neplatne = array_filter($vsechny_obj, function($obj) {
            return $obj['aktivni'] != 1 || in_array($obj['stav_objednavky'], ['Zamítnutá', 'Zrušena']);
        });
        
        if (count($neplatne) > 0) {
            echo "   Nalezené objednávky NESPLŇUJÍ podmínky:\n";
            foreach ($neplatne as $obj) {
                echo "   - Obj. {$obj['cislo_objednavky']}: ";
                if ($obj['aktivni'] != 1) {
                    echo "aktivní={$obj['aktivni']} (mělo by být 1)";
                }
                if (in_array($obj['stav_objednavky'], ['Zamítnutá', 'Zrušena'])) {
                    echo " stav={$obj['stav_objednavky']} (neplatný stav)";
                }
                echo "\n";
            }
        }
    } else {
        echo "✅ Badge by měl ukazovat: $pocet_platnych\n";
    }
    
    // 4. Zkontrolovat faktury přímo navázané na smlouvu (bez objednávky)
    echo "\n--- 4. PŘÍMÉ FAKTURY NA SMLOUVU (bez objednávky) ---\n";
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS pocet
        FROM 25a_objednavky_faktury f
        WHERE f.smlouva_id = ? 
          AND f.objednavka_id IS NULL
          AND f.aktivni = 1
          AND f.stav != 'STORNO'
    ");
    $stmt->execute([$smlouva['id']]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Počet přímých faktur: {$result['pocet']}\n";
    
    // 5. Zjistit, co vrací API endpoint
    echo "\n--- 5. CO VRACÍ API ENDPOINT pro seznam smluv ---\n";
    echo "(simulace dotazu z smlouvyHandlers.php s include_stats=true)\n\n";
    
    $stmt = $pdo->prepare("
        SELECT 
            (
                SELECT COUNT(*)
                FROM 25a_objednavky o
                WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', s.cislo_smlouvy, '\"%')
                  AND o.aktivni = 1
                  AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
            ) AS pocet_objednavek,
            (
                SELECT COUNT(DISTINCT f.id)
                FROM 25a_objednavky_faktury f
                LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
                WHERE (
                    (f.smlouva_id = s.id AND f.objednavka_id IS NULL)
                    OR (o.id IS NOT NULL AND REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', s.cislo_smlouvy, '\"%'))
                )
                  AND f.aktivni = 1
                  AND f.stav != 'STORNO'
            ) AS pocet_faktur_celkem
        FROM 25_smlouvy s
        WHERE s.id = ?
    ");
    $stmt->execute([$smlouva['id']]);
    $api_result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "API vrací:\n";
    echo "   pocet_objednavek: {$api_result['pocet_objednavek']}\n";
    echo "   pocet_faktur_celkem: {$api_result['pocet_faktur_celkem']}\n\n";
    
    if ($api_result['pocet_objednavek'] == 0 && $api_result['pocet_faktur_celkem'] == 0) {
        echo "❌ ZÁVĚR: Badge ukazuje 0, protože API vrací 0 pro obě hodnoty.\n";
    } else {
        echo "✅ ZÁVĚR: Badge by měl ukazovat: " . 
             ($api_result['pocet_objednavek'] + $api_result['pocet_faktur_celkem']) . "\n";
    }
    
} catch (PDOException $e) {
    echo "❌ CHYBA databáze: " . $e->getMessage() . "\n";
    exit(1);
}
