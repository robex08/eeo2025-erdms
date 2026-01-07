<?php
/**
 * 📋 Spisovka Processing Log Endpoints
 * 
 * API endpointy pro sledování zpracovaných dokumentů ze Spisovka InBox.
 * Umožňuje účetním sledovat zpracované dokumenty a postupně "odbavovat" InBox.
 *
 * Endpoints:
 * - GET /api/spisovka-zpracovani/list - Seznam zpracovaných dokumentů
 * - GET /api/spisovka-zpracovani/stats - Statistiky zpracování
 * - POST /api/spisovka-zpracovani/mark - Označit dokument jako zpracovaný
 * 
 * ✅ Implementováno podle OrderV2 konvencí:
 * - PDO připojení z dbconfig.php
 * - Token authentication (verify_token_v2)
 * - Standardizovaný error handling
 * - České názvy sloupců a tabulek (prefix 25_)
 *
 * @author Senior Developer
 * @date 19. prosince 2025
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/orderQueries.php';

// === TABLE CONSTANTS ===
define('TBL_SPISOVKA_ZPRACOVANI_LOG', '25_spisovka_zpracovani_log');

/**
 * GET /api/spisovka-zpracovani/list
 * Seznam zpracovaných dokumentů s možností filtrování
 * 
 * Parametry (GET/POST):
 * - token: string (required) - Autentizační token
 * - username: string (required) - Uživatelské jméno
 * - uzivatel_id: int (optional) - Filtr podle uživatele (NULL = všichni)
 * - stav: string (optional) - Filtr podle stavu (ZAEVIDOVANO|NENI_FAKTURA|CHYBA|DUPLIKAT)
 * - datum_od: date (optional) - Filtr od data
 * - datum_do: date (optional) - Filtr do data
 * - limit: int (optional, default 100) - Počet záznamů
 * - offset: int (optional, default 0) - Offset pro stránkování
 */
function handle_spisovka_zpracovani_list($input, $config) {
    // OKAMŽITÝ DB logging - musí fungovat!
    try {
        $log_pdo = new PDO("mysql:host=10.3.172.11;dbname=eeo2025", "eeo2025", "hn48qka?a");
        $log_pdo->exec("INSERT INTO debug_api_log (endpoint, method, input_data, error_message) VALUES ('START', 'POST', 'Function called', 'Config check: " . (isset($config) ? 'YES' : 'NO') . "')");
    } catch (Exception $le) {
        file_put_contents('/tmp/debug_log_error.txt', date('Y-m-d H:i:s') . " - " . $le->getMessage() . "\n", FILE_APPEND);
    }
    
    // DB Debug logger
    $debug_pdo = null;
    try {
        $debug_pdo = new PDO(
            "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
            $config['mysql']['username'],
            $config['mysql']['password']
        );
        $debug_pdo->exec("INSERT INTO debug_api_log (endpoint, method, input_data) VALUES ('spisovka-zpracovani/list', 'POST', " . $debug_pdo->quote(json_encode($input)) . ")");
    } catch (Exception $e) {
        error_log("Debug log failed: " . $e->getMessage());
        file_put_contents('/tmp/debug_log_error.txt', date('Y-m-d H:i:s') . " - Config log failed: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    error_log("📋 handle_spisovka_zpracovani_list called");
    error_log("Input: " . json_encode($input));
    
    // Ověření tokenu
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    if (!function_exists('verify_token_v2')) {
        $err_msg = "verify_token_v2 function NOT FOUND!";
        error_log("❌ " . $err_msg);
        if ($debug_pdo) {
            $debug_pdo->exec("INSERT INTO debug_api_log (endpoint, method, error_message) VALUES ('spisovka-zpracovani/list', 'POST', " . $debug_pdo->quote($err_msg) . ")");
        }
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'verify_token_v2 not found']);
        return;
    }
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        if ($debug_pdo) {
            $debug_pdo->exec("INSERT INTO debug_api_log (endpoint, method, error_message) VALUES ('spisovka-zpracovani/list', 'POST', 'Auth failed')");
        }
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Neplatný nebo chybějící token'
        ]);
        return;
    }
    
    $current_user_id = $auth_result['id'];
    
    try {
        // PDO připojení
        $pdo = new PDO(
            "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
            $config['mysql']['username'],
            $config['mysql']['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        
        // 🔐 KONTROLA OPRÁVNĚNÍ - SPISOVKA_MANAGE nebo ADMIN role
        $stmt_perm = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM 25_prava p
            WHERE (p.kod_prava = 'SPISOVKA_MANAGE' OR p.kod_prava = 'ADMIN')
            AND p.aktivni = 1
            AND (
                p.id IN (
                    -- Přímá práva uživatele
                    SELECT rp.pravo_id 
                    FROM 25_role_prava rp 
                    WHERE rp.user_id = :user_id1 AND rp.aktivni = 1
                )
                OR p.id IN (
                    -- Práva z rolí (ADMIN check)
                    SELECT rp.pravo_id 
                    FROM 25_uzivatel_role ur
                    JOIN 25_role r ON ur.role_id = r.id
                    JOIN 25_role_prava rp ON r.id = rp.role_id AND rp.user_id = -1
                    WHERE ur.uzivatel_id = :user_id2 
                    AND r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
                    AND rp.aktivni = 1
                )
            )
        ");
        $stmt_perm->execute([':user_id1' => $current_user_id, ':user_id2' => $current_user_id]);
        $has_permission = $stmt_perm->fetch(PDO::FETCH_ASSOC);
        
        if (!$has_permission || $has_permission['count'] == 0) {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => 'Nedostatečná oprávnění. Vyžadováno: SPISOVKA_MANAGE nebo ADMIN role.'
            ]);
            return;
        }
        
        // Parametry filtrace
        $uzivatel_id = isset($input['uzivatel_id']) ? (int)$input['uzivatel_id'] : null;
        $stav = isset($input['stav']) ? $input['stav'] : null;
        $datum_od = isset($input['datum_od']) ? $input['datum_od'] : null;
        $datum_do = isset($input['datum_do']) ? $input['datum_do'] : null;
        $limit = isset($input['limit']) ? (int)$input['limit'] : 100;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        
        // Validace limitu
        if ($limit < 1 || $limit > 1000) {
            $limit = 100;
        }
        
        // Sestavení WHERE podmínek
        $where = ['1=1'];
        $params = [];
        
        if ($uzivatel_id !== null && $uzivatel_id > 0) {
            $where[] = 'szl.uzivatel_id = :uzivatel_id';
            $params[':uzivatel_id'] = $uzivatel_id;
        }
        
        if ($stav !== null && in_array($stav, ['ZAEVIDOVANO', 'NENI_FAKTURA', 'CHYBA', 'DUPLIKAT'])) {
            $where[] = 'szl.stav = :stav';
            $params[':stav'] = $stav;
        }
        
        if ($datum_od !== null) {
            $where[] = 'DATE(szl.zpracovano_kdy) >= :datum_od';
            $params[':datum_od'] = $datum_od;
        }
        
        if ($datum_do !== null) {
            $where[] = 'DATE(szl.zpracovano_kdy) <= :datum_do';
            $params[':datum_do'] = $datum_do;
        }
        
        $where_clause = implode(' AND ', $where);
        
        // Dotaz s JOIN na uživatele (naše DB!)
        $sql = "
            SELECT 
                szl.id,
                szl.dokument_id,
                szl.spisovka_priloha_id,
                szl.uzivatel_id,
                szl.zpracovano_kdy,
                szl.faktura_id,
                szl.fa_cislo_vema,
                szl.stav,
                szl.poznamka,
                szl.doba_zpracovani_s,
                szl.dt_vytvoreni,
                CONCAT(u.jmeno, ' ', u.prijmeni) as uzivatel_jmeno
            FROM " . TBL_SPISOVKA_ZPRACOVANI_LOG . " szl
            LEFT JOIN " . get_users_table_name() . " u ON szl.uzivatel_id = u.id
            WHERE {$where_clause}
            ORDER BY szl.zpracovano_kdy DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $pdo->prepare($sql);
        
        // Bind parametrů
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $results = $stmt->fetchAll();
        
        // Počet celkových záznamů pro stránkování
        $count_sql = "
            SELECT COUNT(*) as total
            FROM " . TBL_SPISOVKA_ZPRACOVANI_LOG . " szl
            WHERE {$where_clause}
        ";
        $count_stmt = $pdo->prepare($count_sql);
        foreach ($params as $key => $value) {
            $count_stmt->bindValue($key, $value);
        }
        $count_stmt->execute();
        $total = $count_stmt->fetch()['total'];
        
        echo json_encode([
            'status' => 'ok',
            'data' => $results,
            'meta' => [
                'total' => (int)$total,
                'limit' => $limit,
                'offset' => $offset,
                'count' => count($results),
                'timestamp' => TimezoneHelper::getApiTimestamp()
            ]
        ]);
        
    } catch (PDOException $e) {
        $err_msg = "PDO Error: " . $e->getMessage();
        $stack = $e->getTraceAsString();
        error_log("Spisovka zpracovani list error: " . $err_msg);
        error_log("Stack: " . $stack);
        
        // Log do DB
        if ($debug_pdo) {
            try {
                $debug_pdo->exec("INSERT INTO debug_api_log (endpoint, method, error_message, stack_trace) VALUES ('spisovka-zpracovani/list', 'POST', " . $debug_pdo->quote($err_msg) . ", " . $debug_pdo->quote($stack) . ")");
            } catch (Exception $log_err) {
                error_log("Failed to log error to DB: " . $log_err->getMessage());
            }
        }
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání zpracovaných dokumentů',
            'debug' => $err_msg
        ]);
    } catch (Exception $e) {
        $err_msg = "General Error: " . $e->getMessage();
        $stack = $e->getTraceAsString();
        error_log("Spisovka zpracovani list error: " . $err_msg);
        
        // Log do DB
        if ($debug_pdo) {
            try {
                $debug_pdo->exec("INSERT INTO debug_api_log (endpoint, method, error_message, stack_trace) VALUES ('spisovka-zpracovani/list', 'POST', " . $debug_pdo->quote($err_msg) . ", " . $debug_pdo->quote($stack) . ")");
            } catch (Exception $log_err) {
                error_log("Failed to log error to DB: " . $log_err->getMessage());
            }
        }
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání zpracovaných dokumentů',
            'debug' => $err_msg
        ]);
    }
}

/**
 * GET /api/spisovka-zpracovani/stats
 * Statistiky zpracování dokumentů
 * 
 * Parametry:
 * - token: string (required)
 * - username: string (required)
 * - uzivatel_id: int (optional) - Stats pro konkrétního uživatele
 * - datum_od: date (optional)
 * - datum_do: date (optional)
 */
function handle_spisovka_zpracovani_stats($input, $config) {
    // Ověření tokenu
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Neplatný nebo chybějící token'
        ]);
        return;
    }
    
    try {
        // PDO připojení
        $pdo = new PDO(
            "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
            $config['mysql']['username'],
            $config['mysql']['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        
        // Parametry filtrace
        $uzivatel_id = isset($input['uzivatel_id']) ? (int)$input['uzivatel_id'] : null;
        $datum_od = isset($input['datum_od']) ? $input['datum_od'] : null;
        $datum_do = isset($input['datum_do']) ? $input['datum_do'] : null;
        
        // WHERE podmínky
        $where = ['1=1'];
        $params = [];
        
        if ($uzivatel_id !== null && $uzivatel_id > 0) {
            $where[] = 'uzivatel_id = :uzivatel_id';
            $params[':uzivatel_id'] = $uzivatel_id;
        }
        
        if ($datum_od !== null) {
            $where[] = 'DATE(zpracovano_kdy) >= :datum_od';
            $params[':datum_od'] = $datum_od;
        }
        
        if ($datum_do !== null) {
            $where[] = 'DATE(zpracovano_kdy) <= :datum_do';
            $params[':datum_do'] = $datum_do;
        }
        
        $where_clause = implode(' AND ', $where);
        
        // Celkové statistiky
        $stats_sql = "
            SELECT 
                COUNT(*) as celkem,
                COUNT(CASE WHEN stav = 'ZAEVIDOVANO' THEN 1 END) as zaevidovano,
                COUNT(CASE WHEN stav = 'NENI_FAKTURA' THEN 1 END) as neni_faktura,
                COUNT(CASE WHEN stav = 'CHYBA' THEN 1 END) as chyba,
                COUNT(CASE WHEN stav = 'DUPLIKAT' THEN 1 END) as duplikat,
                AVG(doba_zpracovani_s) as prumerna_doba_s,
                MIN(zpracovano_kdy) as prvni_zpracovani,
                MAX(zpracovano_kdy) as posledni_zpracovani
            FROM " . TBL_SPISOVKA_ZPRACOVANI_LOG . "
            WHERE {$where_clause}
        ";
        
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        $stats = $stmt->fetch();
        
        // Statistiky podle uživatelů (top 10) - JEN uzivatel_id, bez JOINu
        $sql_users = "
            SELECT 
                szl.uzivatel_id,
                COUNT(*) as pocet_zpracovanych
            FROM " . TBL_SPISOVKA_ZPRACOVANI_LOG . " szl
            WHERE {$where_clause}
            GROUP BY szl.uzivatel_id
            ORDER BY pocet_zpracovanych DESC
            LIMIT 10
        ";
        
        $stmt_users = $pdo->prepare($sql_users);
        foreach ($params as $key => $value) {
            $stmt_users->bindValue($key, $value);
        }
        $stmt_users->execute();
        $top_users = $stmt_users->fetchAll();
        
        echo json_encode([
            'status' => 'ok',
            'data' => [
                'celkem' => (int)$stats['celkem'],
                'podle_stavu' => [
                    'zaevidovano' => (int)$stats['zaevidovano'],
                    'neni_faktura' => (int)$stats['neni_faktura'],
                    'chyba' => (int)$stats['chyba'],
                    'duplikat' => (int)$stats['duplikat']
                ],
                'prumerna_doba_zpracovani_s' => $stats['prumerna_doba_zpracovani_s'] ? 
                    round((float)$stats['prumerna_doba_zpracovani_s'], 2) : null,
                'prvni_zpracovani' => $stats['prvni_zpracovani'],
                'posledni_zpracovani' => $stats['posledni_zpracovani'],
                'top_uzivatele' => $top_users
            ],
            'meta' => [
                'timestamp' => TimezoneHelper::getApiTimestamp()
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Spisovka zpracovani stats error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání statistik'
        ]);
    }
}

/**
 * POST /api/spisovka-zpracovani/mark
 * Označit dokument jako zpracovaný
 * 
 * Body parametry:
 * - token: string (required)
 * - username: string (required)
 * - dokument_id: int (required) - ID dokumentu ze Spisovky
 * - faktura_id: int (optional) - ID vytvořené faktury
 * - fa_cislo_vema: string (optional) - Číslo faktury
 * - stav: string (optional, default ZAEVIDOVANO) - Stav zpracování
 * - poznamka: string (optional) - Poznámka k zpracování
 * - doba_zpracovani_s: int (optional) - Doba zpracování v sekundách
 */
function handle_spisovka_zpracovani_mark($input, $config) {
    // Ověření tokenu
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Neplatný nebo chybějící token'
        ]);
        return;
    }
    
    $current_user_id = $auth_result['id'];
    
    // Validace povinných parametrů
    if (!isset($input['dokument_id']) || empty($input['dokument_id'])) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chybí povinný parametr: dokument_id'
        ]);
        return;
    }
    
    try {
        // PDO připojení
        $pdo = new PDO(
            "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
            $config['mysql']['username'],
            $config['mysql']['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        
        // Parametry
        $dokument_id = (int)$input['dokument_id'];
        $spisovka_priloha_id = isset($input['spisovka_priloha_id']) ? (int)$input['spisovka_priloha_id'] : null; // 🆕
        $faktura_id = isset($input['faktura_id']) ? (int)$input['faktura_id'] : null;
        $fa_cislo_vema = isset($input['fa_cislo_vema']) ? trim($input['fa_cislo_vema']) : null;
        $stav = isset($input['stav']) ? $input['stav'] : 'ZAEVIDOVANO';
        $poznamka = isset($input['poznamka']) ? trim($input['poznamka']) : null;
        $doba_zpracovani_s = isset($input['doba_zpracovani_s']) ? (int)$input['doba_zpracovani_s'] : null;
        
        // Validace stavu
        $allowed_states = ['ZAEVIDOVANO', 'NENI_FAKTURA', 'CHYBA', 'DUPLIKAT'];
        if (!in_array($stav, $allowed_states)) {
            $stav = 'ZAEVIDOVANO';
        }
        
        // Kontrola zda dokument už není zpracovaný (duplikát)
        $check_sql = "
            SELECT id FROM " . TBL_SPISOVKA_ZPRACOVANI_LOG . " 
            WHERE dokument_id = :dokument_id 
            LIMIT 1
        ";
        $check_stmt = $pdo->prepare($check_sql);
        $check_stmt->bindValue(':dokument_id', $dokument_id, PDO::PARAM_INT);
        $check_stmt->execute();
        
        if ($check_stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'status' => 'error',
                'message' => 'Dokument již byl zpracován',
                'code' => 'DUPLICATE_DOCUMENT'
            ]);
            return;
        }
        
        // INSERT záznamu
        $sql = "
            INSERT INTO " . TBL_SPISOVKA_ZPRACOVANI_LOG . " (
                dokument_id,
                spisovka_priloha_id,
                uzivatel_id,
                zpracovano_kdy,
                faktura_id,
                fa_cislo_vema,
                stav,
                poznamka,
                doba_zpracovani_s,
                dt_vytvoreni
            ) VALUES (
                :dokument_id,
                :spisovka_priloha_id,
                :uzivatel_id,
                NOW(),
                :faktura_id,
                :fa_cislo_vema,
                :stav,
                :poznamka,
                :doba_zpracovani_s,
                NOW()
            )
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':dokument_id', $dokument_id, PDO::PARAM_INT);
        $stmt->bindValue(':spisovka_priloha_id', $spisovka_priloha_id, PDO::PARAM_INT); // 🆕
        $stmt->bindValue(':uzivatel_id', $current_user_id, PDO::PARAM_INT);
        $stmt->bindValue(':faktura_id', $faktura_id, PDO::PARAM_INT);
        $stmt->bindValue(':fa_cislo_vema', $fa_cislo_vema);
        $stmt->bindValue(':stav', $stav);
        $stmt->bindValue(':poznamka', $poznamka);
        $stmt->bindValue(':doba_zpracovani_s', $doba_zpracovani_s, PDO::PARAM_INT);
        
        $stmt->execute();
        $new_id = $pdo->lastInsertId();
        
        echo json_encode([
            'status' => 'ok',
            'message' => 'Dokument byl označen jako zpracovaný',
            'data' => [
                'id' => (int)$new_id,
                'dokument_id' => $dokument_id,
                'uzivatel_id' => $current_user_id,
                'stav' => $stav
            ],
            'meta' => [
                'timestamp' => TimezoneHelper::getApiTimestamp()
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Spisovka zpracovani mark error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při označení dokumentu jako zpracovaného'
        ]);
    }
}
/**
 * POST /api/spisovka-zpracovani/delete
 * Smazat záznam o zpracování dokumentu
 * 
 * Parametry (POST):
 * - token: string (required) - Autentizační token
 * - username: string (required) - Uživatelské jméno
 * - dokument_id: int (required) - ID dokumentu ze Spisovky
 * 
 * Response:
 * {
 *   "status": "ok",
 *   "message": "Evidence dokumentu byla zrušena",
 *   "meta": { "timestamp": "2025-12-22T..." }
 * }
 */
function handle_spisovka_zpracovani_delete($input, $config) {
    error_log("🗑️ handle_spisovka_zpracovani_delete called");
    error_log("Input: " . json_encode($input));
    
    // Ověření tokenu
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    if (!function_exists('verify_token_v2')) {
        error_log("❌ verify_token_v2 function NOT FOUND!");
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'verify_token_v2 not found']);
        return;
    }
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Neplatný nebo chybějící token'
        ]);
        return;
    }
    
    $current_user_id = $auth_result['id'];
    
    // Validace parametrů
    $dokument_id = isset($input['dokument_id']) ? (int)$input['dokument_id'] : 0;
    
    if (!$dokument_id) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'dokument_id je povinný parametr'
        ]);
        return;
    }
    
    try {
        // DB připojení
        $db = get_pdo_connection($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        // Nastavit časovou zónu
        TimezoneHelper::setMysqlTimezone($db);
        
        // Smazat záznam
        $stmt = $db->prepare("
            DELETE FROM `" . TBL_SPISOVKA_ZPRACOVANI_LOG . "`
            WHERE dokument_id = :dokument_id
        ");
        
        $stmt->execute([
            ':dokument_id' => $dokument_id
        ]);
        
        $deleted_count = $stmt->rowCount();
        
        if ($deleted_count === 0) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'Dokument nebyl nalezen v evidenci'
            ]);
            return;
        }
        
        error_log("✅ Spisovka zpracování smazáno: dokument_id={$dokument_id}, počet={$deleted_count}");
        
        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'message' => 'Evidence dokumentu byla zrušena',
            'data' => [
                'dokument_id' => $dokument_id,
                'deleted_count' => $deleted_count
            ],
            'meta' => [
                'timestamp' => TimezoneHelper::getApiTimestamp()
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Spisovka zpracovani delete error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při rušení evidence dokumentu'
        ]);
    }
}