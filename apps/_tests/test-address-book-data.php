#!/usr/bin/env php
<?php
/**
 * Test script pro kontrolu dat adresáře zaměstnanců
 * Datum: 2026-04-21
 */

// Load .env z API
$envFile = __DIR__ . '/eeo-v2/api-legacy/api.eeo/.env';
if (!file_exists($envFile)) {
    die("ERROR: .env file not found at: $envFile\n");
}

// Parse .env file
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    
    list($name, $value) = explode('=', $line, 2);
    $name = trim($name);
    $value = trim($value);
    
    // Remove quotes if present
    if (preg_match('/^(["\'])(.*)\\1$/', $value, $matches)) {
        $value = $matches[2];
    }
    
    $_ENV[$name] = $value;
    putenv("$name=$value");
}

// Database credentials
$dbHost = $_ENV['DB_HOST'] ?? 'localhost';
$dbName = $_ENV['DB_NAME'] ?? 'eeo2025-dev';
$dbUser = $_ENV['DB_USER'] ?? '';
$dbPass = $_ENV['DB_PASSWORD'] ?? '';

echo "\n";
echo "=================================================================\n";
echo "TEST ADRESÁŘE ZAMĚSTNANCŮ - KONTROLA DAT\n";
echo "=================================================================\n";
echo "Database: $dbName @ $dbHost\n";
echo "Datum testu: " . date('Y-m-d H:i:s') . "\n";
echo "=================================================================\n\n";

try {
    // Připojení k databázi
    $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
    $db = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Připojení k databázi úspěšné\n\n";
    
    // 1. Celkový počet uživatelů
    $stmt = $db->query("SELECT COUNT(*) as total FROM 25_uzivatele WHERE id > 0");
    $total = $stmt->fetch()['total'];
    echo "📊 CELKEM UŽIVATELŮ: $total\n";
    
    // 2. Počet aktivních/neaktivních
    $stmt = $db->query("SELECT 
        SUM(CASE WHEN aktivni = 1 THEN 1 ELSE 0 END) as aktivni,
        SUM(CASE WHEN aktivni = 0 THEN 1 ELSE 0 END) as neaktivni
        FROM 25_uzivatele WHERE id > 0
    ");
    $counts = $stmt->fetch();
    echo "   ✓ Aktivní: {$counts['aktivni']}\n";
    echo "   ✓ Neaktivní: {$counts['neaktivni']}\n\n";
    
    // 3. Kontrola dt_posledni_aktivita
    echo "🕐 KONTROLA POSLEDNÍ AKTIVITY:\n";
    $stmt = $db->query("SELECT 
        SUM(CASE WHEN dt_posledni_aktivita IS NULL THEN 1 ELSE 0 END) as bez_aktivity,
        SUM(CASE WHEN dt_posledni_aktivita IS NOT NULL THEN 1 ELSE 0 END) as s_aktivitou,
        MAX(dt_posledni_aktivita) as nejnovejsi_aktivita,
        MIN(dt_posledni_aktivita) as nejstarsi_aktivita
        FROM 25_uzivatele WHERE id > 0
    ");
    $activity = $stmt->fetch();
    echo "   ✓ S aktivitou: {$activity['s_aktivitou']}\n";
    echo "   ✓ Bez aktivity (NULL): {$activity['bez_aktivity']}\n";
    echo "   ✓ Nejnovější aktivita: " . ($activity['nejnovejsi_aktivita'] ?? 'N/A') . "\n";
    echo "   ✓ Nejstarší aktivita: " . ($activity['nejstarsi_aktivita'] ?? 'N/A') . "\n\n";
    
    // 4. Rozdělení podle období poslední aktivity
    echo "📅 ROZDĚLENÍ PODLE OBDOBÍ POSLEDNÍ AKTIVITY:\n";
    $stmt = $db->query("SELECT 
        SUM(CASE WHEN dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as dnes,
        SUM(CASE WHEN dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND dt_posledni_aktivita < DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as tydne,
        SUM(CASE WHEN dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND dt_posledni_aktivita < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as mesic,
        SUM(CASE WHEN dt_posledni_aktivita < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as starsi_mesice
        FROM 25_uzivatele WHERE id > 0 AND dt_posledni_aktivita IS NOT NULL
    ");
    $periods = $stmt->fetch();
    echo "   ✓ Za poslední 24h: {$periods['dnes']}\n";
    echo "   ✓ Za poslední týden: {$periods['tydne']}\n";
    echo "   ✓ Za poslední měsíc: {$periods['mesic']}\n";
    echo "   ⚠️ Starší než měsíc: {$periods['starsi_mesice']}\n\n";
    
    // 5. Ukázka prvních 10 uživatelů
    echo "👥 UKÁZKA DAT (prvních 10 uživatelů):\n";
    echo str_repeat("=", 120) . "\n";
    printf("%-5s %-20s %-30s %-20s %-10s %-10s\n", 
        "ID", "JMÉNO", "EMAIL", "POSLEDNÍ AKTIVITA", "AKTIVNÍ", "VIDITELNÝ");
    echo str_repeat("=", 120) . "\n";
    
    $stmt = $db->query("SELECT 
        id,
        CONCAT(jmeno, ' ', prijmeni) as cele_jmeno,
        email,
        dt_posledni_aktivita,
        aktivni,
        viditelny_v_tel_seznamu,
        pozice_id,
        lokalita_id,
        usek_id
        FROM 25_uzivatele 
        WHERE id > 0 
        ORDER BY dt_posledni_aktivita DESC 
        LIMIT 10
    ");
    
    while ($row = $stmt->fetch()) {
        $aktivita = $row['dt_posledni_aktivita'] ?? 'NIKDY';
        $aktivni = $row['aktivni'] == 1 ? 'ANO' : 'NE';
        $viditelny = $row['viditelny_v_tel_seznamu'] == 1 ? 'ANO' : 'NE';
        
        printf("%-5s %-20s %-30s %-20s %-10s %-10s\n",
            $row['id'],
            mb_substr($row['cele_jmeno'], 0, 20),
            mb_substr($row['email'] ?? 'N/A', 0, 30),
            $aktivita,
            $aktivni,
            $viditelny
        );
    }
    echo str_repeat("=", 120) . "\n\n";
    
    // 6. Kontrola uživatelů se starými daty (lednová data)
    echo "⚠️ UŽIVATELÉ S AKTIVITOU ZE LEDNA 2026:\n";
    $stmt = $db->query("SELECT 
        id,
        CONCAT(jmeno, ' ', prijmeni) as cele_jmeno,
        email,
        dt_posledni_aktivita,
        aktivni
        FROM 25_uzivatele 
        WHERE id > 0 
        AND dt_posledni_aktivita >= '2026-01-01 00:00:00'
        AND dt_posledni_aktivita < '2026-02-01 00:00:00'
        ORDER BY dt_posledni_aktivita DESC
        LIMIT 20
    ");
    
    $januaryUsers = $stmt->fetchAll();
    echo "   Nalezeno: " . count($januaryUsers) . " uživatelů\n";
    
    if (count($januaryUsers) > 0) {
        echo "\n   První z nich:\n";
        foreach (array_slice($januaryUsers, 0, 5) as $user) {
            echo "   - ID {$user['id']}: {$user['cele_jmeno']} | {$user['dt_posledni_aktivita']} | " . 
                 ($user['aktivni'] == 1 ? 'AKTIVNÍ' : 'NEAKTIVNÍ') . "\n";
        }
    }
    echo "\n";
    
    // 7. Kontrola prázdných polí (pozice, lokalita, úsek)
    echo "🔍 KONTROLA PRÁZDNÝCH POLÍ:\n";
    $stmt = $db->query("SELECT 
        SUM(CASE WHEN pozice_id IS NULL OR pozice_id = 0 THEN 1 ELSE 0 END) as bez_pozice,
        SUM(CASE WHEN lokalita_id IS NULL OR lokalita_id = 0 THEN 1 ELSE 0 END) as bez_lokality,
        SUM(CASE WHEN usek_id IS NULL OR usek_id = 0 THEN 1 ELSE 0 END) as bez_useku,
        SUM(CASE WHEN email IS NULL OR email = '' THEN 1 ELSE 0 END) as bez_emailu,
        SUM(CASE WHEN telefon IS NULL OR telefon = '' THEN 1 ELSE 0 END) as bez_telefonu
        FROM 25_uzivatele WHERE id > 0 AND aktivni = 1
    ");
    $empty = $stmt->fetch();
    echo "   ⚠️ Aktivní uživatelé bez pozice: {$empty['bez_pozice']}\n";
    echo "   ⚠️ Aktivní uživatelé bez lokality: {$empty['bez_lokality']}\n";
    echo "   ⚠️ Aktivní uživatelé bez úseku: {$empty['bez_useku']}\n";
    echo "   ⚠️ Aktivní uživatelé bez emailu: {$empty['bez_emailu']}\n";
    echo "   ⚠️ Aktivní uživatelé bez telefonu: {$empty['bez_telefonu']}\n\n";
    
    echo "=================================================================\n";
    echo "✅ TEST DOKONČEN\n";
    echo "=================================================================\n\n";
    
} catch (PDOException $e) {
    echo "❌ CHYBA DATABÁZE: " . $e->getMessage() . "\n\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n\n";
    exit(1);
}
