<?php
/**
 * FINÁLNÍ KOMPLETNÍ AKTUALIZACE UŽIVATELŮ
 * 
 * Co dělá:
 * 1. Vezme původní tabulku 25_uzivatele (103 uživatelů)
 * 2. Aktualizuje telefony z rs_telseznam (prefix 999-)
 * 3. Opraví nologin usernames z CSV
 * 4. Přidá nové uživatele z CSV
 * 5. Zachová všechna původní ID a usernames (kromě nologin)
 */

try {
    $pdo = new PDO(
        'mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4',
        'erdms_user',
        'AhchohTahnoh7eim',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    echo str_repeat("=", 80) . "\n";
    echo "🚀 FINÁLNÍ KOMPLETNÍ AKTUALIZACE UŽIVATELSKÉ TABULKY\n";
    echo str_repeat("=", 80) . "\n";
    echo "📅 Datum: " . date('Y-m-d H:i:s') . "\n\n";

    // 1. VYTVOŘENÍ FINÁLNÍ TABULKY
    $finalTable = '25_uzivatele_FINAL_' . date('Ymd_His');
    
    echo "🏗️  KROK 1: Vytváření finální tabulky '$finalTable'\n";
    echo str_repeat("-", 50) . "\n";
    
    // Smaž starou verzi pokud existuje
    try {
        $pdo->exec("DROP TABLE IF EXISTS `$finalTable`");
    } catch (Exception $e) {
        echo "⚠️  Stará tabulka neexistuje (OK)\n";
    }
    
    // Vytvoř kopii struktury i dat
    $pdo->exec("CREATE TABLE `$finalTable` LIKE 25_uzivatele");
    $pdo->exec("INSERT INTO `$finalTable` SELECT * FROM 25_uzivatele");
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable`");
    $originalCount = $stmt->fetch()['count'];
    echo "✅ Zkopírováno $originalCount původních uživatelů\n\n";

    // 2. AKTUALIZACE TELEFONŮ Z RS_TELSEZNAM
    echo "📞 KROK 2: Aktualizace telefonů z rs_telseznam\n";
    echo str_repeat("-", 50) . "\n";
    
    $phoneFile = 'rs_telseznam_extracted_2026-01-04_16-33-13.txt';
    if (!file_exists($phoneFile)) {
        throw new Exception("Soubor s telefony $phoneFile neexistuje!");
    }
    
    $phoneLines = file($phoneFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    array_shift($phoneLines); // Přeskoč hlavičku
    
    $phoneUpdates = 0;
    foreach ($phoneLines as $line) {
        $cols = explode("\t", $line);
        if (count($cols) < 4) continue;
        
        $prijmeni = trim($cols[0]); // Prijmeni je první sloupec
        $jmeno = trim($cols[1]);    // Jmeno je druhý sloupec
        $telefon = trim($cols[3]);  // Mobil je čtvrtý sloupec
        
        if (empty($jmeno) || empty($prijmeni) || empty($telefon)) continue;
        
        // Najdi uživatele v finální tabulce
        $stmt = $pdo->prepare("SELECT id, telefon FROM `$finalTable` WHERE jmeno = ? AND prijmeni = ?");
        $stmt->execute([$jmeno, $prijmeni]);
        $user = $stmt->fetch();
        
        if ($user) {
            // Aktualizuj telefon s prefixem 999-
            $newTelefon = '999-' . $telefon;
            $stmt = $pdo->prepare("UPDATE `$finalTable` SET telefon = ? WHERE id = ?");
            $stmt->execute([$newTelefon, $user['id']]);
            echo "📱 ID {$user['id']}: $jmeno $prijmeni → $newTelefon\n";
            $phoneUpdates++;
        } else {
            echo "👻 Telefon $telefon pro $jmeno $prijmeni nenalezen v DB\n";
        }
    }
    echo "✅ Aktualizováno telefonů: $phoneUpdates\n\n";

    // 3. AKTUALIZACE NOLOGIN USERNAMES Z CSV
    echo "👤 KROK 3: Oprava nologin usernames z CSV\n";
    echo str_repeat("-", 50) . "\n";
    
    $csvFile = 'podklady/Seznam osob - mail.csv';
    if (!file_exists($csvFile)) {
        throw new Exception("CSV soubor $csvFile neexistuje!");
    }
    
    $csvLines = file($csvFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    array_shift($csvLines); // Přeskoč hlavičku
    
    // Načti mapování pozic a lokalit
    $lokalityMap = [];
    $stmt = $pdo->query("SELECT id, nazev FROM 25_lokality");
    while ($row = $stmt->fetch()) {
        $lokalityMap[strtolower(trim($row['nazev']))] = $row['id'];
    }
    
    $poziceMap = [];
    $stmt = $pdo->query("SELECT id, nazev_pozice FROM 25_pozice");
    while ($row = $stmt->fetch()) {
        $poziceMap[strtolower(trim($row['nazev_pozice']))] = $row['id'];
    }
    
    $nologinUpdates = 0;
    $newUsers = 0;
    $existingInCsv = [];
    
    foreach ($csvLines as $line) {
        $cols = explode(";", $line);
        if (count($cols) < 7) continue;
        
        $titul = trim($cols[0]);
        $prijmeni = trim($cols[1]);
        $jmeno = trim($cols[2]);
        $titulZa = trim($cols[3]);
        $pozice = trim($cols[4]);
        $lokalita = trim($cols[5]);
        $osobniCislo = trim($cols[6]);
        
        if (empty($osobniCislo) || empty($jmeno) || empty($prijmeni)) continue;
        if (empty($pozice)) continue; // Preskoc prazdne radky
        
        // Najdi existing uživatele podle jména
        $stmt = $pdo->prepare("SELECT id, username FROM `$finalTable` WHERE TRIM(jmeno) = TRIM(?) AND TRIM(prijmeni) = TRIM(?) COLLATE utf8mb4_general_ci");
        $stmt->execute([$jmeno, $prijmeni]);
        $existingUser = $stmt->fetch();
        
        if ($existingUser) {
            $existingInCsv[] = $existingUser['id'];
            
            // Pokud má nologin username, oprav ho na osobní číslo z CSV
            if (strpos($existingUser['username'], 'nologin') === 0) {
                // Zkontroluj, jestli už někdo jiný nemá tento username
                $stmt = $pdo->prepare("SELECT id, jmeno, prijmeni FROM `$finalTable` WHERE username = ? AND id != ?");
                $stmt->execute([$osobniCislo, $existingUser['id']]);
                $conflictUser = $stmt->fetch();
                
                if ($conflictUser) {
                    echo "⚠️  Přeskočen nologin {$existingUser['username']} (ID {$existingUser['id']}) - username $osobniCislo už má {$conflictUser['jmeno']} {$conflictUser['prijmeni']} (ID {$conflictUser['id']})\n";
                } else {
                    $stmt = $pdo->prepare("UPDATE `$finalTable` SET username = ? WHERE id = ?");
                    $stmt->execute([$osobniCislo, $existingUser['id']]);
                    echo "🔧 ID {$existingUser['id']}: {$existingUser['username']} → $osobniCislo ($jmeno $prijmeni)\n";
                    $nologinUpdates++;
                }
            } else {
                echo "✅ ID {$existingUser['id']}: zachován username {$existingUser['username']} ($jmeno $prijmeni)\n";
            }
        } else {
            // Před přidáním nového uživatele zkontroluj, jestli už username neexistuje
            $stmt = $pdo->prepare("SELECT id, jmeno, prijmeni FROM `$finalTable` WHERE username = ?");
            $stmt->execute([$osobniCislo]);
            $duplicateUser = $stmt->fetch();
            
            if ($duplicateUser) {
                echo "⚠️  Přeskočen $jmeno $prijmeni ($osobniCislo) - username už má {$duplicateUser['jmeno']} {$duplicateUser['prijmeni']} (ID {$duplicateUser['id']})\n";
                continue;
            }
            
            // Nový uživatel z CSV - přidej ho (podle jména neexistuje v DB)
            $lokalitaId = $lokalityMap[strtolower($lokalita)] ?? 40; // Default Kladno
            $poziceId = $poziceMap[strtolower($pozice)] ?? 1; // Default pozice
            
            // Najdi volné ID
            $stmt = $pdo->query("SELECT MAX(id) as maxId FROM `$finalTable`");
            $maxId = $stmt->fetch()['maxId'] ?? 200;
            $newId = $maxId + 1;
            
            $stmt = $pdo->prepare("INSERT INTO `$finalTable` 
                (id, username, password_hash, jmeno, prijmeni, pozice_id, lokalita_id, 
                 organizace_id, usek_id, aktivni, vynucena_zmena_hesla, dt_vytvoreni, dt_posledni_aktivita) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 40, 1, 1, 0, NOW(), NOW())");
            
            try {
                $stmt->execute([
                    $newId,
                    $osobniCislo,
                    'temporary_hash_' . $newId,
                    $jmeno,
                    $prijmeni,
                    $poziceId,
                    $lokalitaId
                ]);
                
                echo "➕ ID $newId: přidán $osobniCislo ($jmeno $prijmeni)\n";
                $newUsers++;
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
                    echo "⚠️  Přeskočen $jmeno $prijmeni ($osobniCislo) - username již existuje\n";
                } else {
                    throw $e;
                }
            }
        }
    }
    
    // 4. FINÁLNÍ STATISTIKY
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "🎯 FINÁLNÍ TABULKA HOTOVA: `$finalTable`\n";
    echo str_repeat("=", 80) . "\n\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable`");
    $finalCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable` WHERE username LIKE 'nologin%'");
    $remainingNologin = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable` WHERE telefon LIKE '999-%'");
    $phonesWithPrefix = $stmt->fetch()['count'];
    
    echo "📊 VÝSLEDNÉ STATISTIKY:\n";
    echo "- Celkem uživatelů: $finalCount (původně: $originalCount)\n";
    echo "- Aktualizované telefony: $phoneUpdates (s prefixem 999-)\n";
    echo "- Opravené nologin usernames: $nologinUpdates\n";
    echo "- Nově přidaní uživatelé: $newUsers\n";
    echo "- Zbývající nologin uživatelé: $remainingNologin\n";
    echo "- Telefony s prefixem 999-: $phonesWithPrefix\n\n";
    
    echo "🔍 KONTROLNÍ DOTAZY:\n";
    echo "-- Michaela Nováková:\n";
    echo "SELECT id, username, jmeno, prijmeni, telefon FROM `$finalTable` WHERE jmeno = 'Michaela' AND prijmeni = 'Nováková';\n\n";
    echo "-- Kateřina Veselá:\n";
    echo "SELECT id, username, jmeno, prijmeni, telefon FROM `$finalTable` WHERE jmeno = 'Kateřina' AND prijmeni = 'Veselá';\n\n";
    echo "-- Zbývající nologin:\n";
    echo "SELECT id, username, jmeno, prijmeni FROM `$finalTable` WHERE username LIKE 'nologin%' LIMIT 10;\n\n";
    
    // Ulož název tabulky
    file_put_contents('final_table_name.txt', $finalTable);
    echo "📝 Název finální tabulky uložen do: final_table_name.txt\n";
    
    echo "\n🎉 KOMPLETNÍ AKTUALIZACE DOKONČENA!\n\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n\n";
    exit(1);
}
?>