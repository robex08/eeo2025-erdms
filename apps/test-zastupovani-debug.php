<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Načti .env
$envFile = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

$host = $_ENV['DB_HOST'] ?? '10.3.172.11';
$dbname = $_ENV['DB_NAME'] ?? 'EEO-OSTRA-DEV';
$user = $_ENV['DB_USER'] ?? 'eeo_user';
$pass = $_ENV['DB_PASSWORD'] ?? '';

echo "=== DEBUG ZASTUPOVÁNÍ ===\n\n";
echo "DB Host: $host\n";
echo "DB Name: $dbname\n";
echo "DB User: $user\n\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "--- 1. Je zastupování zapnuto? ---\n";
    $stmt = $pdo->query("SELECT klic, hodnota FROM 25a_nastaveni_globalni WHERE klic = 'substitution_enabled'");
    $setting = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($setting) {
        echo "Nalezeno: " . json_encode($setting, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    } else {
        echo "NENÍ v DB!\n\n";
    }
    
    echo "\n--- 2. Aktivní zastupování pro u03924 (Robert Hooovsky) ---\n";
    $stmt = $pdo->query("
        SELECT 
            z.id,
            z.zastupce_id,
            u1.username as zastupce_username,
            z.zastupovany_id,
            u2.username as zastupovany_username,
            z.dt_od,
            z.dt_do,
            z.opravneni,
            z.aktivni
        FROM 25_uzivatele_zastupovani z
        LEFT JOIN 25_uzivatele u1 ON z.zastupce_id = u1.id
        LEFT JOIN 25_uzivatele u2 ON z.zastupovany_id = u2.id
        WHERE u1.username = 'u03924'
        AND z.aktivni = 1
        AND CURDATE() BETWEEN z.dt_od AND z.dt_do
    ");
    $zastupovani = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($zastupovani) > 0) {
        echo "Nalezeno " . count($zastupovani) . " aktivních zastupování:\n";
        foreach ($zastupovani as $z) {
            echo json_encode($z, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        }
    } else {
        echo "ŽÁDNÉ aktivní zastupování!\n";
    }
    
    echo "\n--- 3. ID uživatele u03924 ---\n";
    $stmt = $pdo->query("SELECT id, username, jmeno, prijmeni FROM 25_uzivatele WHERE username = 'u03924'");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user) {
        echo json_encode($user, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        $zastupce_id = $user['id'];
        
        echo "\n--- 4. Pro koho může u03924 (ID=$zastupce_id) zastupovat? ---\n";
        $stmt = $pdo->prepare("
            SELECT 
                z.zastupovany_id,
                u.username as zastupovany_username,
                z.opravneni,
                z.dt_od,
                z.dt_do
            FROM 25_uzivatele_zastupovani z
            LEFT JOIN 25_uzivatele u ON z.zastupovany_id = u.id
            WHERE z.zastupce_id = ?
            AND z.aktivni = 1
            AND CURDATE() BETWEEN z.dt_od AND z.dt_do
        ");
        $stmt->execute([$zastupce_id]);
        $mozne = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($mozne) > 0) {
            foreach ($mozne as $m) {
                echo json_encode($m, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
            }
        } else {
            echo "ŽÁDNÉ aktivní zastupování pro tohoto uživatele!\n";
        }
    } else {
        echo "Uživatel u03924 NENALEZEN!\n";
    }
    
    echo "\n--- 5. Jaké role a oprávnění má u03924? ---\n";
    if ($user) {
        $userid = $user['id'];
        
        $stmt = $pdo->prepare("
            SELECT DISTINCT r.kod_role, r.nazev_role
            FROM 25_role r
            JOIN 25_uzivatele_role ur ON r.id = ur.role_id
            WHERE ur.uzivatel_id = ?
        ");
        $stmt->execute([$userid]);
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Role:\n";
        if (count($roles) > 0) {
            foreach ($roles as $role) {
                echo "  - " . $role['kod_role'] . " (" . $role['nazev_role'] . ")\n";
            }
        } else {
            echo "  Žádné role!\n";
        }
        
        echo "\nOprávnění ORDER_*:\n";
        $stmt = $pdo->prepare("
            SELECT DISTINCT p.kod_prava, p.popis
            FROM 25_prava p
            JOIN 25_role_prava rp ON p.id = rp.pravo_id
            JOIN 25_uzivatele_role ur ON rp.role_id = ur.role_id
            WHERE ur.uzivatel_id = ?
            AND p.kod_prava LIKE 'ORDER_%'
        ");
        $stmt->execute([$userid]);
        $perms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($perms) > 0) {
            foreach ($perms as $perm) {
                echo "  - " . $perm['kod_prava'] . " (" . $perm['popis'] . ")\n";
            }
        } else {
            echo "  Žádná ORDER_* oprávnění!\n";
        }
    }
    
    echo "\n--- 6. Test helper funkce get_user_ids_with_substitution ---\n";
    
    // SKIP test - potrebujeme definovat konstanty z api.php
    echo "SKIP - potřebujeme načíst konstanty z api.php\n";
    /*
    // Include hierarchyHandlers
    require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php';
    
    $test_user_id = $zastupce_id ?? 100;
    $test_permissions = ['ORDERS_VIEW'];
    
    echo "Test pro user_id=$test_user_id s permissions: " . implode(', ', $test_permissions) . "\n";
    $user_ids = get_user_ids_with_substitution($pdo, $test_user_id, $test_permissions);
    echo "Vrácené user_ids: " . json_encode($user_ids) . "\n";
    */
    
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
