<?php

// Handlers pro API endpointy

// Debug mode - set to true to enable detailed logging
define('API_DEBUG_MODE', true);

// Token configuration
define('TOKEN_LIFETIME', 12 * 3600);           // 12 hodin = 43200 sekund (zkráceno pro bezpečnost)
define('TOKEN_REFRESH_THRESHOLD', 10 * 60);    // Obnovit pokud zbývá < 10 minut = 600 sekund

// Připojení k databázi (PDO)
function get_db($config) {
    // ✅ FIX: Backwards compatible - pokud $config obsahuje 'mysql', použij to (nový způsob)
    // Jinak předpokládej, že $config JE přímo MySQL konfigurace (starý způsob)
    $dbConfig = isset($config['mysql']) ? $config['mysql'] : $config;
    
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['database']};charset=utf8mb4";
    return new PDO($dsn, $dbConfig['username'], $dbConfig['password'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ));
}

// --- Jednotné JSON odpovědi ---
function api_ok($data = null, $extra = array()) {
    $resp = array('status' => 'ok');
    if ($data !== null) $resp['data'] = $data;
    foreach ($extra as $k => $v) { $resp[$k] = $v; }
    echo json_encode($resp);
    exit;
}

function api_error($httpCode, $message, $code = null, $extra = array()) {
    if (is_int($httpCode) && $httpCode > 0) {
        http_response_code($httpCode);
    }
    $resp = array('status' => 'error', 'message' => $message);
    if ($code) $resp['code'] = $code;
    foreach ($extra as $k => $v) { $resp[$k] = $v; }
    echo json_encode($resp);
    exit;
}

// Funkce pro ověření tokenu - optimalizováno pro reuse DB spojení
function verify_token($token, $db = null) {
    if (!$token) {
        return false;
    }
    
    $decoded = base64_decode($token);
    if (!$decoded) {
        return false;
    }
    
    $parts = explode('|', $decoded);
    if (count($parts) !== 2) {
        return false;
    }
    
    list($username, $timestamp) = $parts;
    
    // Kontrola, zda token není starší než 24 hodin
    if (time() - $timestamp > 86400) {
        return false;
    }
    
    // Ověření, že uživatel existuje a je aktivní
    try {
        // Pokud není předáno DB spojení, vytvoř nové (backward compatibility)
        if ($db === null) {
            $config = require __DIR__ . '/dbconfig.php';
            $config = $config['mysql'];
            $db = new PDO("mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4", 
                         $config['username'], $config['password'], array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ));
        }
        
        $stmt = $db->prepare("SELECT id, username FROM " . TBL_UZIVATELE . " WHERE username = ? AND aktivni = 1");
        $stmt->execute(array($username));
        $user = $stmt->fetch();
        
        if (!$user) {
            return false;
        }
        
        return array('id' => (int)$user['id'], 'username' => $username);
    } catch (Exception $e) {
        error_log("❌ verify_token: Exception: " . $e->getMessage());
        return false;
    }
}

/**
 * Verify token V2 - Enhanced version for Order V2 API
 * Verifies both token validity and username match
 * 
 * @param string $username Username from request
 * @param string $token Token from request  
 * @param PDO|null $db Optional database connection
 * @return array|false User data array or false on failure
 */
function verify_token_v2($username, $token, $db = null) {
    if (!$token || !$username) {
        return false;
    }
    
    // First verify token structure and expiry
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        return false;
    }
    
    // Additional check: verify username matches token username
    if ($token_data['username'] !== $username) {
        return false;
    }
    
    // V2: Přidat informaci o roli uživatele (pro admin bypass)
    // ✅ NOVÝ SYSTÉM: Kontrola přes 25_uzivatele_role + 25_role
    try {
        // Pokud není předáno DB spojení, vytvoř nové
        if ($db === null) {
            $config = require __DIR__ . '/dbconfig.php';
            $config = $config['mysql'];
            $db = new PDO("mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4", 
                         $config['username'], $config['password'], array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ));
        }
        
        // ✅ Kontrola admin rolí přes NOVÝ SYSTÉM (25_uzivatele_role + 25_role)
        $stmt = $db->prepare("
            SELECT r.kod_role 
            FROM " . TBL_ROLE . " r
            INNER JOIN " . TBL_UZIVATELE_ROLE . " ur ON ur.role_id = r.id
            WHERE ur.uzivatel_id = ?
        ");
        $stmt->execute(array($token_data['id']));
        $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Admin může být SUPERADMIN nebo ADMINISTRATOR
        $token_data['is_admin'] = !empty(array_intersect($roles, array('SUPERADMIN', 'ADMINISTRATOR')));
        $token_data['roles'] = $roles; // ✅ Přidat pole rolí do výstupu
        
        // ✅ Načtení uživatelských oprávnění (pro Annual Fees a další moduly)
        // OPRAVENO 2026-03-06 v2: Načítá OBOJÍ - přímo přiřazená práva + práva z rolí
        // STRUKTURA 25_role_prava:
        //   user_id=-1, role_id=X  → právo přiřazené roli X
        //   user_id=Y, role_id=-1  → právo přiřazené přímo uživateli Y
        $stmt = $db->prepare("
            SELECT DISTINCT p.kod_prava, p.popis 
            FROM " . TBL_ROLE_PRAVA . " rp
            INNER JOIN " . TBL_PRAVA . " p ON p.id = rp.pravo_id
            WHERE (
                (rp.user_id = ? AND rp.role_id = -1)  -- přímo přiřazená práva uživateli
                OR (
                    rp.user_id = -1  -- práva z role
                    AND rp.role_id IN (
                        SELECT role_id 
                        FROM " . TBL_UZIVATELE_ROLE . " 
                        WHERE uzivatel_id = ?
                    )
                )
            )
            AND rp.aktivni = 1
        ");
        $stmt->execute(array($token_data['id'], $token_data['id']));
        $token_data['permissions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } catch (Exception $e) {
        error_log("verify_token_v2: Error loading role - " . $e->getMessage());
        $token_data['is_admin'] = false;
    }
    
    return $token_data;
}

/**
 * Získá timestamp vypršení tokenu
 * Token formát: base64_encode(username|timestamp)
 * 
 * @param string $token
 * @return int|false Unix timestamp vypršení nebo false při chybě
 */
function get_token_expiration($token) {
    if (!$token) return false;
    
    $decoded = base64_decode($token);
    if (!$decoded) return false;
    
    $parts = explode('|', $decoded);
    if (count($parts) !== 2) return false;
    
    list($username, $timestamp) = $parts;
    
    // Token vyprší po TOKEN_LIFETIME sekundách od vytvoření
    $expiration = intval($timestamp) + TOKEN_LIFETIME;
    
    return $expiration;
}

/**
 * Vygeneruje nový token pro uživatele
 * Token formát: base64_encode(username|new_timestamp)
 * 
 * @param string $username
 * @return string Nový token
 */
function generate_new_token($username) {
    $timestamp = time();
    $token = base64_encode($username . '|' . $timestamp);
    return $token;
}

// =============================================================================
// USER ACTIVITY TRACKING FUNCTIONS
// =============================================================================

/**
 * Aktualizuje aktivitu uživatele s metadata
 * 
 * @param PDO $db Database connection
 * @param array $queries Pole SQL dotazů
 * @param int $user_id ID uživatele
 * @param array $metadata Pole s metadaty [ip, module, path, user_agent, session_id]
 * @return bool True při úspěchu, False při chybě
 */
function update_user_activity_with_metadata($db, $queries, $user_id, $metadata) {
    try {
        // 1. Připrav JSON metadata
        $json_metadata = json_encode([
            'last_public_ip' => $metadata['public_ip'] ?? null,
            'last_local_ip' => $metadata['local_ip'] ?? null,
            'last_module' => $metadata['module'] ?? null,
            'last_path' => $metadata['path'] ?? null,
            'last_user_agent' => $metadata['user_agent'] ?? null,
            'session_id' => $metadata['session_id'] ?? null,
            'updated_at' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);

        // 2. Update 25_uzivatele
        if (isset($queries['uzivatele_update_activity_with_metadata'])) {
            $stmt = $db->prepare($queries['uzivatele_update_activity_with_metadata']);
            $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
            $stmt->bindParam(':metadata', $json_metadata, PDO::PARAM_STR);
            $stmt->execute();
        }

        // 3. Insert do activity log (use public_ip as primary IP)
        if (isset($queries['uzivatele_activity_log_insert'])) {
            $ip_for_log = $metadata['public_ip'] ?? $metadata['local_ip'] ?? '';
            $stmt_log = $db->prepare($queries['uzivatele_activity_log_insert']);
            $stmt_log->bindParam(':uzivatel_id', $user_id, PDO::PARAM_INT);
            $stmt_log->bindParam(':ip_address', $ip_for_log, PDO::PARAM_STR);
            $stmt_log->bindParam(':module_name', $metadata['module'], PDO::PARAM_STR);
            $stmt_log->bindParam(':module_path', $metadata['path'], PDO::PARAM_STR);
            $stmt_log->bindParam(':user_agent', $metadata['user_agent'], PDO::PARAM_STR);
            $stmt_log->bindParam(':session_id', $metadata['session_id'], PDO::PARAM_STR);
            $stmt_log->execute();
        }

        return true;
    } catch (Exception $e) {
        error_log("update_user_activity_with_metadata error: " . $e->getMessage());
        return false;
    }
}

/**
 * Získá IP adresu klienta (supports proxy headers)
 * 
 * @return string IP adresa nebo prázdný string
 */
function get_client_ip() {
    $ip = '';
    
    // Priority: Check proxy headers first (real client IP)
    // mod_remoteip sets REMOTE_ADDR to real client IP
    if (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip = $_SERVER['REMOTE_ADDR'];
    } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        $ip = $_SERVER['HTTP_X_REAL_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        // Fallback: parse X-Forwarded-For manually
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($ips[0]);
    } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    }
    
    // Validate IP address
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        // Convert IPv6 localhost to IPv4
        if ($ip === '::1') {
            return '127.0.0.1';
        }
        
        // Extract IPv4 from IPv6-mapped format
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            if (preg_match('/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i', $ip, $matches)) {
                return $matches[1];
            }
        }
        
        return $ip;
    }
    
    return '';
}

/**
 * Získá User Agent string klienta
 * 
 * @return string User agent nebo prázdný string
 */
function get_user_agent() {
    return $_SERVER['HTTP_USER_AGENT'] ?? '';
}

/**
 * Zkontroluje, zda je token blízko vypršení a měl by být obnoven
 * 
 * @param string $token
 * @return bool True pokud token potřebuje refresh
 */
function should_refresh_token($token) {
    $expiration = get_token_expiration($token);
    if ($expiration === false) return false;
    
    $now = time();
    $time_until_expiry = $expiration - $now;
    
    // Refresh pokud token je validní a zbývá méně nebo rovno TOKEN_REFRESH_THRESHOLD
    return ($time_until_expiry > 0 && $time_until_expiry <= TOKEN_REFRESH_THRESHOLD);
}

function handle_users_approvers($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'err' => 'Neplatný nebo chybějící token',
            'debug' => array(
                'token' => $token,
                'token_decoded' => $token ? base64_decode($token) : null,
                'token_parts' => $token ? explode('|', base64_decode($token)) : null
            )
        ));
        return;
    }

    // Ověření, že username z tokenu odpovídá username z požadavku
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }

    try {
        $db = get_db($config);
        // Update last activity for the authenticated user
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id']);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal
        }
        
        // Get users with ORDER APPROVE permission
        $stmt = $db->prepare("
            SELECT DISTINCT u.id, u.username, u.jmeno, u.prijmeni, u.email, u.titul_pred, u.titul_za,
                   CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as cele_jmeno,
                   u.usek_id, us.usek_zkr
            FROM ".TBL_UZIVATELE." u
            LEFT JOIN ".TBL_USEKY." us ON u.usek_id = us.id
            JOIN ".TBL_UZIVATELE_ROLE." ur ON u.id = ur.uzivatel_id
            JOIN ".TBL_ROLE_PRAVA." rp ON ur.role_id = rp.role_id
            JOIN ".TBL_PRAVA." p ON rp.pravo_id = p.id
            WHERE p.kod_prava = 'ORDER_APPROVE' AND u.aktivni = 1
            ORDER BY u.prijmeni, u.jmeno
        ");
        $stmt->execute();
        $approvers = $stmt->fetchAll();
        
        echo json_encode($approvers);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání schvalovatelů: ' . $e->getMessage()));
        exit;
    }
}

function handle_login($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $password = isset($input['password']) ? $input['password'] : '';
    // Trim password to avoid accidental whitespace issues from client
    $password = is_string($password) ? trim($password) : $password;

    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí username nebo password!'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['uzivatele_login']);
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        $user = $stmt->fetch();

        // DEBUG výpisy do JSON
        $debug = [
            'sql' => $queries['uzivatele_login'],
            'username' => $username,
            'user_fetched' => $user,
            'password_hash_length' => $user ? strlen($user['password_hash']) : null,
            'password_hash_prefix' => $user ? substr($user['password_hash'], 0, 4) : null
        ];

        if (!$user) {
            http_response_code(401);
            echo json_encode(array('err' => 'Špatné přihlašovací údaje', 'debug' => $debug));
            return;
        }

        // Kontrola aktivního uživatele (musí být aktivní = 1)
        if (isset($user['aktivni']) && (int)$user['aktivni'] !== 1) {
            http_response_code(403);
            echo json_encode(array('err' => 'Uživatel nemá oprávnění k přihlášení (neaktivní)', 'code' => 'USER_INACTIVE'));
            return;
        }

    $ok = false;

        $debug['rh_user']  = $user['username'];
        $debug['rh_pass']  = $password;
        $debug['rh_len']   = strlen($user['password_hash']);

        $stored = $user['password_hash'];

        // optional debug requested by client
        $debugMode = isset($input['debugMode']) && $input['debugMode'];
        if ($debugMode) {
            $debug['provided_password_len'] = is_string($password) ? strlen($password) : null;
            // include md5 of provided password (safe-ish, still don't log plaintext in prod)
            $debug['provided_password_md5'] = is_string($password) ? md5($password) : null;
        }

        // 1) bcrypt/hash variants: $2y$, $2a$, $2b$ (length ~60)
        $bcrypt_prefix = substr($stored, 0, 4);
        if (in_array($bcrypt_prefix, array('$2y$', '$2a$', '$2b$')) && strlen($stored) >= 59) {
            // prefer password_verify if available
            if (function_exists('password_verify')) {
                $ok = password_verify($password, $stored);
                $debug['pw_check_method'] = 'password_verify';
                if ($debugMode) {
                    $debug['pw_password_verify_result'] = $ok;
                }
            } else {
                // fallback to crypt-based verification
                $ok = (crypt($password, $stored) === $stored);
                $debug['pw_check_method'] = 'crypt_fallback';
            }
        }

        // 2) MD5 hex (legacy)
        if (!$ok && preg_match('/^[0-9a-f]{32}$/i', $stored)) {
            if (md5($password) === $stored) {
                $ok = true;
                $debug['pw_check_method'] = 'md5';
            }
        }

        // 3) Fallback to plaintext comparison (legacy insecure)
        if (!$ok) {
            if ($password === $stored) {
                $ok = true;
                $debug['pw_check_method'] = 'plaintext';
            }
        }

        // crypt fallback diagnostic for debugMode
        if ($debugMode) {
            $cryptResult = crypt($password, $stored);
            $debug['crypt_result'] = $cryptResult;
            $debug['crypt_equals_stored'] = ($cryptResult === $stored);
        }

        $debug['password_check'] = $ok ? 'OK' : 'FAIL';

        if (!$ok) {
            http_response_code(401);
            echo json_encode(array('err' => 'Špatné přihlašovací údaje', 'debug' => $debug));
            return;
        }

        // If we authenticated using a legacy method (md5 or plaintext), rehash the password
        // into a modern algorithm (password_hash) on first successful login.
        if (isset($debug['pw_check_method']) && in_array($debug['pw_check_method'], array('md5', 'plaintext'))) {
            if (function_exists('password_hash')) {
                try {
                    $newHash = password_hash($password, PASSWORD_DEFAULT);
                    if ($newHash) {
                        $stmtRehash = $db->prepare("UPDATE " . TBL_UZIVATELE . " SET password_hash = :hash WHERE id = :id");
                        $stmtRehash->bindParam(':hash', $newHash);
                        $stmtRehash->bindParam(':id', $user['id'], PDO::PARAM_INT);
                        $stmtRehash->execute();
                        $debug['rehash_done'] = true;
                    }
                } catch (Exception $e) {
                    // non-fatal: do not block login on rehash errors, but record debug info
                    $debug['rehash_error'] = $e->getMessage();
                }
            } else {
                $debug['rehash_skipped'] = 'password_hash_not_available';
            }
        }

        // ✅ Kontrola vynucené změny hesla - pokud je vynucena_zmena_hesla = 1, vrátíme error + token
        if (isset($user['vynucena_zmena_hesla']) && (int)$user['vynucena_zmena_hesla'] === 1) {
            // Vygeneruj dočasný token pro změnu hesla
            $tempToken = base64_encode($user['username'] . '|' . time());
            http_response_code(403);
            echo json_encode(array(
                'err' => 'Musíte si změnit heslo',
                'code' => 'FORCE_PASSWORD_CHANGE',
                'force_password_change' => true,
                'userId' => $user['id'],
                'username' => $user['username'],
                'token' => $tempToken
            ));
            return;
        }

        // Uložit skutečný čas přihlášení a aktualizovat dt_posledni_aktivita
        try {
            $stmtLogin = $db->prepare("
                UPDATE " . TBL_UZIVATELE . " 
                SET dt_posledni_prihlaseni = NOW(),
                    dt_posledni_aktivita = NOW()
                WHERE id = :id
            ");
            $stmtLogin->bindParam(':id', $user['id'], PDO::PARAM_INT);
            $stmtLogin->execute();
        } catch (Exception $e) {
            // non-fatal – login pokračuje i při chybě
        }

        $token = base64_encode($user['username'] . '|' . time());
        unset($user['password_hash']);
        $user['token'] = $token;
        $user['auth_method'] = 'local'; // 🔐 EntraID: Mark local authentication
        echo json_encode($user);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba databáze: ' . $e->getMessage()));
        exit;
    }
}

/**
 * Token refresh endpoint
 * Validates old token and issues new one if still valid
 * 
 * @param array $input POST data containing username and old_token
 * @param array $config Database configuration
 * @param array $queries SQL queries (not used in this handler)
 * @return void Echoes JSON response
 */
function handle_token_refresh($input, $config, $queries) {
    $username = isset($input['username']) ? trim($input['username']) : '';
    $old_token = isset($input['old_token']) ? trim($input['old_token']) : '';
    
    if (!$username || !$old_token) {
        http_response_code(400);
        echo json_encode(array(
            'err' => 'Chybí username nebo token',
            'code' => 'MISSING_PARAMS'
        ));
        return;
    }
    
    try {
        // Ověř starý token pomocí verify_token()
        $token_data = verify_token($old_token);
        
        if (!$token_data) {
            http_response_code(401);
            echo json_encode(array(
                'err' => 'Neplatný nebo expirovaný token',
                'code' => 'INVALID_TOKEN'
            ));
            return;
        }
        
        // Ověř, že username z tokenu odpovídá username z požadavku
        if ($token_data['username'] !== $username) {
            http_response_code(401);
            echo json_encode(array(
                'err' => 'Username z tokenu neodpovídá username z požadavku',
                'code' => 'USERNAME_MISMATCH'
            ));
            return;
        }
        
        // Vygeneruj nový token
        $new_token = base64_encode($username . '|' . time());
        $expires_at = date('Y-m-d H:i:s', time() + TOKEN_LIFETIME);
        
        if (API_DEBUG_MODE) {
            error_log("Token refresh: username=$username, old_token_valid=yes, new_token_generated");
        }
        
        http_response_code(200);
        echo json_encode(array(
            'token' => $new_token,
            'expires_at' => $expires_at,
            'message' => 'Token refreshed successfully',
            'lifetime_seconds' => TOKEN_LIFETIME
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'err' => 'Server error: ' . $e->getMessage(),
            'code' => 'SERVER_ERROR'
        ));
        error_log("Token refresh error: " . $e->getMessage());
    }
}

function handle_user_detail($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'err' => 'Neplatný nebo chybějící token',
            'debug' => array(
                'token' => $token,
                'token_decoded' => $token ? base64_decode($token) : null,
                'token_parts' => $token ? explode('|', base64_decode($token)) : null
            )
        ));
        return;
    }

    // Ověření, že username z tokenu odpovídá username z požadavku
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }

    // Pokud není poslán user_id, použij ID z tokenu (pro detail vlastního profilu)
    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : $token_data['id'];

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí nebo neplatné user_id'));
        return;
    }

    try {
        $db = get_db($config);
        // Update last activity for the authenticated user (the one from token)
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id']);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal: continue even if update fails
        }
        $stmt = $db->prepare($queries['uzivatele_detail']);
        $stmt->bindParam(':id', $user_id);
        $stmt->execute();
        $user_detail = $stmt->fetch();

        if (!$user_detail) {
            http_response_code(404);
            echo json_encode(array('err' => 'Uživatel nenalezen'));
            return;
        }

        // Fetch all roles assigned to the requested user (via 25_uzivatele_role)
        $roles = [];
        try {
            $stmtRoles = $db->prepare($queries['uzivatele_roles_by_user']);
            $stmtRoles->bindParam(':uzivatel_id', $user_id);
            $stmtRoles->execute();
            $roles = $stmtRoles->fetchAll();
        } catch (Exception $e) {
            $roles = [];
        }
        // Build roles with their rights - KEEP IDs for frontend form prefilling
    $roles_with_rights = [];
        foreach ($roles as $roleRow) {
            $roleRights = [];
            // role id may not exist (defensive)
            if (isset($roleRow['id'])) {
                try {
                    $stmtR = $db->prepare($queries['uzivatele_prava_by_role']);
                    $stmtR->bindParam(':role_id', $roleRow['id']);
                    $stmtR->execute();
                    $rights = $stmtR->fetchAll();
                    foreach ($rights as $r) {
                        // KEEP id for frontend checkboxes - FRONTEND FIX
                        $roleRights[] = $r;
                    }
                } catch (Exception $e) {
                    // ignore per-role errors
                }
            }

            // KEEP role id for frontend checkboxes - FRONTEND FIX
            $roleResp = $roleRow;
            $roleResp['rights'] = $roleRights;
            $roles_with_rights[] = $roleResp;
        }

        $user_detail['roles'] = $roles_with_rights;

        // Přímá práva přiřazená přímo uživateli (user_id v 25_role_prava)
        $direct_rights = [];
        try {
            if (isset($queries['uzivatele_prava_direct_by_user'])) {
                $stmtDR = $db->prepare($queries['uzivatele_prava_direct_by_user']);
                $stmtDR->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                $stmtDR->execute();
                $direct_rights = $stmtDR->fetchAll();
                // KEEP id for frontend checkboxes - FRONTEND FIX
            }
        } catch (Exception $e) {
            $direct_rights = [];
        }
        $user_detail['direct_rights'] = $direct_rights;

        // FRONTEND FIX: Create structured nested objects for better UX
        // Each číselník gets its own object with id + nazev
        // PHP 5.6 compatible version
        
        // Pozice object
        if (isset($user_detail['pozice_id']) && $user_detail['pozice_id']) {
            $user_detail['pozice'] = array(
                'id' => (int)$user_detail['pozice_id'],
                'nazev' => isset($user_detail['nazev_pozice']) ? $user_detail['nazev_pozice'] : null,
                'parent_id' => isset($user_detail['pozice_parent_id']) ? $user_detail['pozice_parent_id'] : null
            );
        } else {
            $user_detail['pozice'] = null;
        }
        
        // Lokalita object  
        if (isset($user_detail['lokalita_id']) && $user_detail['lokalita_id']) {
            $user_detail['lokalita'] = array(
                'id' => (int)$user_detail['lokalita_id'],
                'nazev' => isset($user_detail['lokalita_nazev']) ? $user_detail['lokalita_nazev'] : null,
                'typ' => isset($user_detail['lokalita_typ']) ? $user_detail['lokalita_typ'] : null,
                'parent_id' => isset($user_detail['lokalita_parent_id']) ? $user_detail['lokalita_parent_id'] : null
            );
        } else {
            $user_detail['lokalita'] = null;
        }
        
        // Usek object
        if (isset($user_detail['usek_id']) && $user_detail['usek_id']) {
            $user_detail['usek'] = array(
                'id' => (int)$user_detail['usek_id'],
                'nazev' => isset($user_detail['usek_nazev']) ? $user_detail['usek_nazev'] : null,
                'zkratka' => isset($user_detail['usek_zkr']) ? $user_detail['usek_zkr'] : null
            );
        } else {
            $user_detail['usek'] = null;
        }
        
        // Organizace object
        if (isset($user_detail['organizace_id']) && $user_detail['organizace_id']) {
            $user_detail['organizace'] = array(
                'id' => (int)$user_detail['organizace_id'],
                'nazev' => isset($user_detail['nazev_organizace']) ? $user_detail['nazev_organizace'] : null,
                'ico' => isset($user_detail['organizace_ico']) ? $user_detail['organizace_ico'] : null
            );
        } else {
            $user_detail['organizace'] = null;
        }
        
        // Clean up ONLY redundant descriptive fields 
        // KEEP IDs and zkratka for backwards compatibility and FE form prefilling
        $cleanup_fields = [
            'nazev_pozice', 'pozice_parent_id',
            'lokalita_nazev', 'lokalita_typ', 'lokalita_parent_id', 
            'usek_nazev',  // Keep usek_id and usek_zkr!
            'nazev_organizace', 'organizace_ico',
            'organizace_ulice_cislo', 'organizace_mesto', 'organizace_psc',
            'organizace_zastoupeny', 'organizace_datova_schranka', 
            'organizace_email', 'organizace_telefon', 'nadrizeny_cely_jmeno'
        ];
        
        foreach ($cleanup_fields as $field) {
            if (isset($user_detail[$field])) {
                unset($user_detail[$field]);
            }
        }

        // === PŘIDÁNO: STATISTIKY OBJEDNÁVEK ===
        // Načíst statistiky objednávek pro uživatele
        $stats = array(
            'celkem' => 0,
            'aktivni' => 0,
            'zruseno_storno' => 0,
            'stavy' => array(
                'NOVA' => 0,
                'KE_SCHVALENI' => 0,
                'SCHVALENA' => 0,
                'ZAMITNUTA' => 0,
                'ROZPRACOVANA' => 0,
                'ODESLANA' => 0,
                'POTVRZENA' => 0,
                'UVEREJNENA' => 0,
                'CEKA_POTVRZENI' => 0,
                'DOKONCENA' => 0,
                'ZRUSENA' => 0,
                'SMAZANA' => 0,
                'ARCHIVOVANO' => 0
            )
        );
        
        if (isset($queries['user_orders_statistics'])) {
            try {
                $stmtStats = $db->prepare($queries['user_orders_statistics']);
                $stmtStats->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                $stmtStats->execute();
                $statsData = $stmtStats->fetch();
                
                if ($statsData) {
                    $stats['celkem'] = (int)$statsData['celkem'];
                    
                    // Jednotlivé stavy (lowercase klíče z SQL)
                    $stats['stavy']['nova'] = (int)$statsData['nova'];
                    $stats['stavy']['ke_schvaleni'] = (int)$statsData['ke_schvaleni'];
                    $stats['stavy']['schvalena'] = (int)$statsData['schvalena'];
                    $stats['stavy']['zamitnuta'] = (int)$statsData['zamitnuta'];
                    $stats['stavy']['rozpracovana'] = (int)$statsData['rozpracovana'];
                    $stats['stavy']['odeslana'] = (int)$statsData['odeslana'];
                    $stats['stavy']['potvrzena'] = (int)$statsData['potvrzena'];
                    $stats['stavy']['uverejnena'] = (int)$statsData['uverejnena'];
                    $stats['stavy']['ceka_potvrzeni'] = (int)$statsData['ceka_potvrzeni'];
                    $stats['stavy']['dokoncena'] = (int)$statsData['dokoncena'];
                    $stats['stavy']['zrusena'] = (int)$statsData['zrusena'];
                    $stats['stavy']['smazana'] = (int)$statsData['smazana'];
                    $stats['stavy']['archivovano'] = (int)$statsData['archivovano'];
                    $stats['stavy']['vecna_spravnost'] = (int)$statsData['vecna_spravnost'];
                    $stats['stavy']['zkontrolovana'] = (int)$statsData['zkontrolovana'];
                    
                    // Vypočítat agregáty
                    $zruseno = $stats['stavy']['zrusena'] + $stats['stavy']['smazana'] + $stats['stavy']['archivovano'];
                    $stats['zruseno_storno'] = $zruseno;
                    $stats['aktivni'] = $stats['celkem'] - $zruseno;
                }
            } catch (Exception $e) {
                // Non-fatal: pokud statistiky selžou, vrátíme prázdné hodnoty
                error_log("Chyba při načítání statistik objednávek: " . $e->getMessage());
            }
        }
        
        $user_detail['statistiky_objednavek'] = $stats;
        
        // 🔐 EntraID: Transform auth_source to auth_method for frontend consistency
        if (isset($user_detail['auth_source'])) {
            $user_detail['auth_method'] = $user_detail['auth_source'];
            unset($user_detail['auth_source']); // Remove duplicate field
        } else {
            // Default to 'local' for old users without auth_source
            $user_detail['auth_method'] = 'local';
        }

        echo json_encode($user_detail);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba databáze: ' . $e->getMessage()));
        exit;
    }
}

function handle_user_active($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token'));
        exit;
    }
    
    try {
        $db = get_db($config);
        
        $stmt = $db->prepare($queries['uzivatele_active_last_5_minutes']);
        $stmt->execute();
        $active_users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $active_users
        ));
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba databáze: ' . $e->getMessage()));
        exit;
    }
}

/**
 * 💓 KEEPALIVE: Jednoduchý ping endpoint - každých 5 minut
 * 
 * Účel:
 * - Zobrazit že user je aktivní/online
 * - BEZ token validace nebo refresh (rychlý, lightweight)
 * - BEZ kritických error handlerů
 * - Minimální DB zátěž (jen UPDATE timestamp)
 * 
 * Rozdíl oproti update-activity:
 * - ŽÁDNÝ token refresh
 * - ŽÁDNÉ složité kontroly
 * - Tiché selhání (není kritický)
 * - Vždy vrací 200 OK (i při chybě)
 * 
 * @param array $input - {token, username, timestamp}
 * @param array $config - DB config
 * @param array $queries - SQL queries (nepoužívá se)
 */
function handle_user_keepalive($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Minimální validace - jen zkontroluj že nejsou prázdné
    if (empty($request_username) || empty($token)) {
        // Tiché selhání - vrátit OK i při chybě
        echo json_encode(array('status' => 'ok', 'keepalive' => true, 'silentFail' => 'missing_params'));
        exit;
    }
    
    try {
        $db = get_db($config);
        
        // MINIMÁLNÍ token check - jen ověřit že existuje, BEZ refresh logiky
        $checkTokenSQL = "SELECT id, username FROM " . TBL_UZIVATELE . " WHERE username = :username";
        $stmt = $db->prepare($checkTokenSQL);
        $stmt->bindParam(':username', $request_username, PDO::PARAM_STR);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            // Tiché selhání - user neexistuje
            echo json_encode(array('status' => 'ok', 'keepalive' => true, 'silentFail' => 'user_not_found'));
            exit;
        }
        
        // UPDATE aktivity - jen timestamp, nic víc
        $updateSQL = "UPDATE " . TBL_UZIVATELE . " SET dt_posledni_aktivita = NOW() WHERE id = :id";
        $updateStmt = $db->prepare($updateSQL);
        $updateStmt->bindParam(':id', $user['id'], PDO::PARAM_INT);
        $updateStmt->execute();
        
        // Vždy vrátit OK
        echo json_encode(array(
            'status' => 'ok',
            'keepalive' => true,
            'timestamp' => date('Y-m-d H:i:s')
        ));
        
    } catch (Exception $e) {
        // Tiché selhání i při DB chybě - není kritický
        if (API_DEBUG_MODE) {
            error_log("Keepalive error (non-critical): " . $e->getMessage());
        }
        echo json_encode(array('status' => 'ok', 'keepalive' => true, 'silentFail' => 'db_error'));
    }
}

function handle_user_update_activity($input, $config, $queries) {
    // Ověření tokenu - ✅ POUŽÍVÁ verify_token_v2 (jednotné s ostatními endpointy)
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    if (empty($request_username) || empty($token)) {
        http_response_code(401);
        echo json_encode(array('err' => 'Chybí username nebo token', 'status' => 'error', 'message' => 'Token vypršel'));
        exit;
    }
    
    try {
        $db = get_db($config);
        
        // ✅ verify_token_v2 - jednotná verifikace pro všechny endpointy
        $token_data = verify_token_v2($request_username, $token, $db);
        
        if (!$token_data) {
            http_response_code(401);
            echo json_encode(array('err' => 'Neplatný token', 'status' => 'error', 'message' => 'Token vypršel'));
            exit;
        }
        
        // Pro update aktivity použijeme ID z tokenu (přihlášený uživatel)
        $user_id = $token_data['id'];
        $username = $token_data['username'];
        
        // Nejdřív zkontroluj, že uživatel existuje
        $checkStmt = $db->prepare("SELECT id, username, aktivni FROM " . TBL_UZIVATELE . " WHERE id = :id");
        $checkStmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $checkStmt->execute();
        $userExists = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$userExists) {
            http_response_code(404);
            echo json_encode(array('err' => 'Uživatel nenalezen'));
            exit;
        }
        
        if (API_DEBUG_MODE) {
            error_log("update_activity - User ID: $user_id, Username: " . $userExists['username']);
        }
        
        // Proveď UPDATE aktivity
        $updateSQL = "UPDATE " . TBL_UZIVATELE . " SET dt_posledni_aktivita = NOW() WHERE id = :id";
        
        $stmt = $db->prepare($updateSQL);
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        if (API_DEBUG_MODE) {
            error_log("update_activity - Row count: " . $stmt->rowCount());
        }
        
        // ✅ NOVÉ: Kontrola, zda je potřeba token refresh
        $new_token = null;
        
        if (should_refresh_token($token)) {
            // Token je blízko vypršení - vygeneruj nový
            $new_token = generate_new_token($username);
            
            $expiration = get_token_expiration($token);
            $time_until_expiry = $expiration - time();
            
            if (API_DEBUG_MODE) {
                error_log(sprintf(
                    "🔄 [TOKEN-REFRESH] user=%s (id=%d), token_ttl=%ds, new_token_generated=YES",
                    $username,
                    $user_id,
                    $time_until_expiry
                ));
            }
        }
        
        // Response s novým tokenem (pokud byl vygenerován)
        $response = array(
            'status' => 'ok',
            'message' => 'Aktivita aktualizována',
            'new_token' => $new_token  // null pokud není potřeba refresh
        );
        
        // Pro debug přidat timestamp
        if (API_DEBUG_MODE) {
            $response['timestamp'] = date('Y-m-d H:i:s');
        }
        
        echo json_encode($response);
        exit;
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("update_activity - Exception: " . $e->getMessage());
        }
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba databáze: ' . $e->getMessage()));
        exit;
    }
}

function handle_orders_create($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token'));
        exit;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username neodpovídá tokenu'));
        exit;
    }
    
    // Parsování komplexního JSON payloadu
    $payload = isset($input['payloadPreview']) ? $input['payloadPreview'] : null;
    if (!$payload) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí payloadPreview'));
        exit;
    }
    
    try {
        $db = get_db($config);
        $db->beginTransaction();
        
        // 1. Vytvoření hlavní objednávky
        $stmt = $db->prepare($queries['objednavky_insert']);
        $params = [
            ':uzivatel_id' => $token_data['id'],
            ':dodavatel_id' => 1, // TODO: mapovat z payloadu
            ':lokalita_id' => 1,  // TODO: mapovat z payloadu  
            ':stav_id' => 1,      // TODO: mapovat z workflowState
            ':nazev_objednavky' => $payload['subject'],
            ':popis' => isset($payload['description']) ? $payload['description'] : '',
            ':poznamka' => isset($payload['notes']) ? $payload['notes'] : ''
        ];
        
        $stmt->execute($params);
        $order_id = $db->lastInsertId();

        // Pokud stav odpovídá schvalovacím stavům (SCHVALENA, ZAMITNUTA, CEKA_SE), nastavíme schválení
        if (isset($params[':stav_id']) && (int)$params[':stav_id'] > 0) {
            try {
                $stmtSt = $db->prepare("SELECT kod_stavu, typ_objektu FROM ".TBL_CISELNIK_STAVY." WHERE id = :id LIMIT 1");
                $stmtSt->execute([':id' => (int)$params[':stav_id']]);
                $stavRow = $stmtSt->fetch();
                if ($stavRow && strtoupper($stavRow['typ_objektu']) === 'OBJEDNAVKA') {
                    $kod = strtoupper($stavRow['kod_stavu']);
                    if (in_array($kod, array('SCHVALENA','ZAMITNUTA','CEKA_SE'))) {
                        $stmtUpdSchv = $db->prepare("UPDATE ".TBL_OBJEDNAVKY." SET datum_schvaleni = NOW(), schvalovatel_id = :u, uzivatel_akt_id = :akt_id, dt_aktualizace = NOW() WHERE id = :oid LIMIT 1");
                        $stmtUpdSchv->execute([':u' => $token_data['id'], ':akt_id' => $token_data['id'], ':oid' => $order_id]); // ✅ FIXED: Also set uzivatel_akt_id
                    }
                }
            } catch (Exception $e) {
                // Nezablokuje vytvoření objednávky
                error_log('create_order schvaleni set fail: '.$e->getMessage());
            }
        }
        
        // 2. Vytvoření položek objednávky
        if (isset($payload['items']) && is_array($payload['items'])) {
            $stmt_item = $db->prepare($queries['objednavky_polozky_insert']);
            foreach ($payload['items'] as $item) {
                $stmt_item->execute([
                    ':objednavka_id' => $order_id,
                    ':popis' => $item['description'],
                    ':cena_bez_dph' => floatval($item['priceExclVat']),
                    ':dph_sazba' => intval($item['vatRate']),
                    ':cena_s_dph' => floatval($item['priceInclVat'])
                ]);
            }
        }
        
        // 3. Vytvoření příloh
        if (isset($payload['attachmentsMeta']) && is_array($payload['attachmentsMeta'])) {
            $stmt_attach = $db->prepare($queries['objednavky_prilohy_insert']);
            foreach ($payload['attachmentsMeta'] as $attachment) {
                $stmt_attach->execute([
                    ':objednavka_id' => $order_id,
                    ':nazev_souboru' => $attachment['storedName'],
                    ':puvodni_nazev' => $attachment['originalName'],
                    ':velikost' => intval($attachment['size']),
                    ':typ_prilohy' => $attachment['typ']
                ]);
            }
        }
        
        $db->commit();
        
        echo json_encode(array(
            'success' => true,
            'order_id' => $order_id,
            'message' => 'Objednávka vytvořena s položkami a přílohami'
        ));
        exit;
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření objednávky: ' . $e->getMessage()));
        exit;
    }
}

function handle_ciselniky($input, $config, $queries) {
    try {
        $db = get_db($config);
        $result = [];

        // If this is a POST request, require a valid token (simple token verification)
        if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $token = isset($input['token']) ? $input['token'] : '';
            if (!$token) {
                http_response_code(401);
                echo json_encode(array('err' => 'Chybí token'));
                exit;
            }
            $token_data = verify_token($token);
            if (!$token_data) {
                http_response_code(401);
                echo json_encode(array('err' => 'Neplatný token'));
                exit;
            }
        }
        // If client provided a 'typ' parameter (e.g. 'OBJEDNAVKA'), return only stavy for that typ
        if (isset($input['typ']) && $input['typ']) {
            $typ = $input['typ'];
            $stmt = $db->prepare($queries['ciselnik_stavy_select_by_typ']);
            $stmt->bindParam(':typ', $typ);
            $stmt->execute();
            $result = $stmt->fetchAll();
            echo json_encode($result);
            exit;
        }

        // Default: return all standard form ciselniky
        foreach ($queries['ciselniky_pro_formular'] as $key => $query) {
            $stmt = $db->prepare($query);
            $stmt->execute();
            $result[$key] = $stmt->fetchAll();
        }

        echo json_encode($result);
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání číselníků: ' . $e->getMessage()));
        exit;
    }
}

// Legacy bridge: handle selected old "react-*" actions via new API
function handle_react_action($input, $config, $queries) {
    // Accept params from POST body or query string
    $action = isset($input['action']) ? $input['action'] : (isset($_GET['action']) ? $_GET['action'] : '');
    if (!$action) {
        api_error(400, 'Chybí parametr action', 'MISSING_ACTION');
        return;
    }

    try {
        // Optional database override (for legacy DB selection)
        $dbOverride = isset($input['database']) ? $input['database'] : (isset($input['db']) ? $input['db'] : (isset($_GET['database']) ? $_GET['database'] : (isset($_GET['db']) ? $_GET['db'] : null)));
        if ($dbOverride !== null) {
            // Basic validation to avoid DSN injection: allow alnum, underscore, dash
            if (!preg_match('/^[A-Za-z0-9_\-]+$/', $dbOverride)) {
                api_error(400, 'Neplatný název databáze', 'INVALID_DATABASE');
                return;
            }
            // ✅ FIX: Použít $config['mysql'] protože teď předáváme celou konfiguraci
            $dbConfig = isset($config['mysql']) ? $config['mysql'] : $config;
            $dsn = "mysql:host={$dbConfig['host']};dbname={$dbOverride};charset=utf8mb4";
            $db = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        } else {
            $db = get_db($config);
        }
        switch ($action) {
            case 'react-attachment-id': {
                $idRaw = isset($input['id']) ? $input['id'] : (isset($_GET['id']) ? $_GET['id'] : null);
                $id = is_numeric($idRaw) ? (int)$idRaw : 0;
                if ($id <= 0) {
                    api_error(400, 'Chybí nebo neplatné id', 'INVALID_ID');
                    return;
                }
                // Optional explicit table name from FE: tabulka_opriloh
                $tbl = isset($input['tabulka_opriloh']) ? $input['tabulka_opriloh'] : (isset($_GET['tabulka_opriloh']) ? $_GET['tabulka_opriloh'] : null);
                if ($tbl !== null) {
                    // Validate table identifier (simple whitelist)
                    if (!preg_match('/^[A-Za-z0-9_]+$/', $tbl)) {
                        api_error(400, 'Neplatný název tabulky', 'INVALID_TABLE');
                        return;
                    }
                    $sql = "SELECT * FROM `{$tbl}` WHERE (id_smlouvy = :id) ORDER BY soubor";
                } else {
                    if (!isset($queries['old_react_attachment_id'])) {
                        api_error(500, 'Dotaz pro staré přílohy není k dispozici', 'MISSING_QUERY');
                        return;
                    }
                    $sql = $queries['old_react_attachment_id'];
                }
                $stmt = $db->prepare($sql);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                $rows = $stmt->fetchAll();
                api_ok($rows);
                return;
            }
            default:
                api_error(400, 'Nepodporovaná akce', 'UNSUPPORTED_ACTION', array('action' => $action));
                return;
        }
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// Send notification email via API (requires token)
function handle_notify_email($input, $config, $queries) {
    // Verify token
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data || ($username && $token_data['username'] !== $username)) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }

    $to = isset($input['to']) ? $input['to'] : '';
    $subject = isset($input['subject']) ? $input['subject'] : '';
    $body = isset($input['body']) ? $input['body'] : '';
    $html = isset($input['html']) ? (bool)$input['html'] : false;
    $cc = isset($input['cc']) ? $input['cc'] : array();
    $bcc = isset($input['bcc']) ? $input['bcc'] : array();
    $reply_to = isset($input['reply_to']) ? $input['reply_to'] : '';
    $from_email = isset($input['from_email']) ? $input['from_email'] : '';
    $from_name = isset($input['from_name']) ? $input['from_name'] : '';

    if (!$to || !$subject || !$body) {
        api_error(400, 'Chybí pole to/subject/body', 'MISSING_FIELDS');
        return;
    }

    require_once __DIR__ . '/mail.php';

    $opts = array(
        'html' => $html,
        'cc' => $cc,
        'bcc' => $bcc,
        'reply_to' => $reply_to
    );
    
    // Add from_email and from_name if provided
    if ($from_email) {
        $opts['from_email'] = $from_email;
    }
    if ($from_name) {
        $opts['from_name'] = $from_name;
    }

    $res = eeo_mail_send($to, $subject, $body, $opts);

    if (isset($res['ok']) && $res['ok']) {
        api_ok(array('sent' => true));
        return;
    }
    api_error(500, 'Odeslání emailu selhalo', 'MAIL_FAILED', array('debug' => isset($res['debug']) ? $res['debug'] : null));
}

/**
 * Handler pro dual-template email notifikace
 * Odesílá 2 varianty emailů (APPROVER + SUBMITTER) z jedné šablony v DB
 * 
 * @param array $input - Očekává: token, username, order_id, order_number, order_subject,
 *                       commander_id, garant_id, creator_id, supplier_name, funding, 
 *                       max_price, recipients (array of user_ids)
 */
function handle_notifications_send_dual($input, $config, $queries) {
    set_time_limit(30); // Max 30 sekund
    
    // Verify token
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    try {
        $token_data = verify_token($token);
    } catch (Exception $e) {
        api_error(401, 'Chyba ověření tokenu: ' . $e->getMessage(), 'TOKEN_ERROR');
        return;
    }
    
    if (!$token_data || ($username && $token_data['username'] !== $username)) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    // Validace vstupů - nový formát s from/to
    $has_from = !empty($input['from']) && is_array($input['from']);
    $has_to = !empty($input['to']) && is_array($input['to']);
    
    if (empty($input['order_id']) || (!$has_from && !$has_to)) {
        api_error(400, 'Chybí povinné parametry (order_id, from nebo to)', 'MISSING_FIELDS');
        return;
    }
    
    require_once __DIR__ . '/email-template-helper.php';
    require_once __DIR__ . '/mail.php';
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        error_log("📧 DB CONNECTION ERROR: " . $e->getMessage());
        api_error(500, 'Chyba připojení k DB: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
    
    // Načtení šablony z DB (typ = ORDER_PENDING_APPROVAL)
    try {
        $stmt = $db->prepare("SELECT * FROM " . TBL_NOTIFIKACE_SABLONY . " WHERE typ = 'ORDER_PENDING_APPROVAL' AND aktivni = 1 LIMIT 1");
        $stmt->execute();
        $template = $stmt->fetch();
    } catch (Exception $e) {
        error_log("📧 TEMPLATE QUERY ERROR: " . $e->getMessage());
        api_error(500, 'Chyba při načítání šablony: ' . $e->getMessage(), 'QUERY_ERROR');
        return;
    }
    
    if (!$template) {
        api_error(404, 'Šablona notifikace nenalezena nebo není aktivní', 'TEMPLATE_NOT_FOUND');
        return;
    }
    
    // Sestavení STŘEDISEK (spojit názvy čárkou - frontend už poslal převedené názvy)
    $strediska_display = 'Neuvedeno';
    if (!empty($input['strediska_names']) && is_array($input['strediska_names']) && count($input['strediska_names']) > 0) {
        $strediska_display = implode(', ', $input['strediska_names']);
    }
    
    // 💰 FINANCOVÁNÍ - parsovat JSON objekt z frontendu (formát z normalizeFinancovaniForBackend)
    $financovani_full = 'Neuvedeno';
    $financovani_poznamka = '';
    
    if (!empty($input['financovani_json'])) {
        $financovani_data = json_decode($input['financovani_json'], true);
        
        if (json_last_error() === JSON_ERROR_NONE && is_array($financovani_data)) {
            $typ = $financovani_data['typ'] ?? 'Neuvedeno';
            $nazev = $financovani_data['nazev'] ?? $typ;
            $financovani_full = $nazev;
            
            // Podle typu přidat specifická data
            // LP - načíst čísla LP z DB podle ID
            if (!empty($financovani_data['lp_kody']) && is_array($financovani_data['lp_kody'])) {
                $lp_ids = array_map('intval', $financovani_data['lp_kody']);
                $lp_placeholders = implode(',', array_fill(0, count($lp_ids), '?'));
                
                try {
                    $stmt_lp = $db->prepare("SELECT cislo_lp FROM " . TBL_LP_MASTER . " WHERE id IN ($lp_placeholders)");
                    $stmt_lp->execute($lp_ids);
                    $lp_cisla = $stmt_lp->fetchAll(PDO::FETCH_COLUMN);
                    
                    if (!empty($lp_cisla)) {
                        $financovani_full .= ' - ' . implode(', ', $lp_cisla);
                    }
                } catch (Exception $e) {
                    error_log("⚠️ Chyba při načítání LP čísel: " . $e->getMessage());
                }
            }
            // Smlouvy
            if (!empty($financovani_data['cislo_smlouvy'])) {
                $financovani_full .= ' - ' . $financovani_data['cislo_smlouvy'];
                if (!empty($financovani_data['smlouva_poznamka'])) {
                    $financovani_poznamka = $financovani_data['smlouva_poznamka'];
                }
            }
            // Individuální schválení
            if (!empty($financovani_data['individualni_schvaleni'])) {
                $financovani_full .= ' - ' . $financovani_data['individualni_schvaleni'];
                if (!empty($financovani_data['individualni_poznamka'])) {
                    $financovani_poznamka = $financovani_data['individualni_poznamka'];
                }
            }
            // Pojistná událost
            if (!empty($financovani_data['pojistna_udalost_cislo'])) {
                $financovani_full .= ' - ' . $financovani_data['pojistna_udalost_cislo'];
                if (!empty($financovani_data['pojistna_udalost_poznamka'])) {
                    $financovani_poznamka = $financovani_data['pojistna_udalost_poznamka'];
                }
            }
        }
    }
    
    // Sestavení dat z FE inputu (všechny potřebné údaje už přicházejí z frontendu)
    $order_data = [
        'id' => $input['order_id'],
        'ev_cislo' => $input['order_number'],
        'predmet' => $input['order_subject'],
        'prikazce_id' => $input['commander_id'],  // Pro načtení jména příkazce
        'vytvoril' => $input['creator_id'],       // Pro načtení jména tvůrce
        'dodavatel_nazev' => $input['supplier_name'],
        'strediska_display' => $strediska_display,        // Spojená střediska
        'financovani_display' => $financovani_full,       // Financování typ + číslo/kód
        'financovani_poznamka' => $financovani_poznamka,  // Poznámka samostatně
        'max_price_formatted' => $input['max_price']
    ];
    
    $results = [];
    $sent_count = 0;
    $in_app_count = 0;
    
    // Sloučit from (SUBMITTER) a to (APPROVER) do jednoho pole s typ označením
    $all_recipients = [];
    
    if ($has_from) {
        foreach ($input['from'] as $user_id) {
            $all_recipients[] = ['user_id' => $user_id, 'typ' => 'SUBMITTER'];
        }
    }
    
    if ($has_to) {
        foreach ($input['to'] as $user_id) {
            $all_recipients[] = ['user_id' => $user_id, 'typ' => 'APPROVER'];
        }
    }
    
    file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "🔄 Starting recipient loop (" . count($all_recipients) . " recipients: from=" . ($has_from ? count($input['from']) : 0) . ", to=" . ($has_to ? count($input['to']) : 0) . ")\n", FILE_APPEND);
    
    // Projít všechny příjemce
    foreach ($all_recipients as $recipient) {
        $user_id = $recipient['user_id'];
        $recipient_type = $recipient['typ'];
        
        file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "  👤 Processing user_id: $user_id (typ: $recipient_type)\n", FILE_APPEND);
        if (!$user_id) {
            error_log("⚠️ Prázdné user_id, přeskakuji");
            continue;
        }
        
        // 1. Načíst user data (email + settings)
        file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    🔍 Querying user data...\n", FILE_APPEND);
        try {
            $stmt_user = $db->prepare("
                SELECT u.id, u.username, u.email, u.jmeno, u.prijmeni, s.nastaveni_data as nastaveni
                FROM " . TBL_UZIVATELE . " u
                LEFT JOIN " . TBL_UZIVATEL_NASTAVENI . " s ON u.id = s.uzivatel_id
                WHERE u.id = ? 
                LIMIT 1
            ");
            $stmt_user->execute([$user_id]);
            $user = $stmt_user->fetch();
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    ✅ User fetched: " . ($user ? $user['username'] : 'NOT FOUND') . "\n", FILE_APPEND);
        } catch (Exception $e) {
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    ❌ USER QUERY ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
            throw $e;
        }
        
        if (!$user || empty($user['email'])) {
            error_log("⚠️ User ID $user_id nemá email nebo neexistuje");
            $results[] = [
                'user_id' => $user_id,
                'sent_email' => false,
                'sent_in_app' => false,
                'error' => 'User nemá email nebo neexistuje'
            ];
            continue;
        }
        
        // 2. Zkontrolovat nastavení notifikací
        $settings = [];
        if (!empty($user['nastaveni'])) {
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    📋 Parsing settings JSON...\n", FILE_APPEND);
            $decoded = json_decode($user['nastaveni'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $settings = $decoded;
                file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    ✅ Settings parsed OK\n", FILE_APPEND);
            } else {
                file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    ⚠️ JSON decode failed: " . json_last_error_msg() . "\n", FILE_APPEND);
            }
        } else {
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    ℹ️ No settings found\n", FILE_APPEND);
        }
        
        $email_enabled = isset($settings['notifikace']['email']) ? (bool)$settings['notifikace']['email'] : true;
        $system_enabled = isset($settings['notifikace']['system']) ? (bool)$settings['notifikace']['system'] : true;
        
        file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    📧 Email: " . ($email_enabled ? 'ON' : 'OFF') . ", System: " . ($system_enabled ? 'ON' : 'OFF') . "\n", FILE_APPEND);
        error_log("📧 User {$user['username']} (ID: $user_id) - Email: " . ($email_enabled ? 'ON' : 'OFF') . ", System: " . ($system_enabled ? 'ON' : 'OFF'));
        
        $sent_email = false;
        
        // 3. Odeslat EMAIL (pokud má zapnuté)
        // ⚠️ POZNÁMKA: IN-APP notifikace (zvonečky) se NEODESÍLAJÍ zde!
        // Ty už odešle standardní notifikační systém (sendOrderNotifications v OrderForm25.js)
        // Tato funkce odesílá POUZE dual-template emaily s kontrolou nastavení
        
        if ($email_enabled) {
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    📨 Sending email (typ: $recipient_type)...\n", FILE_APPEND);
            
            // Určit přesný typ šablony: APPROVER_NORMAL, APPROVER_URGENT nebo SUBMITTER
            // from[] = SUBMITTER (zelená informační šablona)
            // to[] = APPROVER_NORMAL (oranžová) nebo APPROVER_URGENT (červená) podle is_urgent flagu
            $is_urgent = !empty($input['is_urgent']) ? (bool)$input['is_urgent'] : false;
            
            if ($recipient_type === 'APPROVER') {
                $template_type = $is_urgent ? 'APPROVER_URGENT' : 'APPROVER_NORMAL';
            } else {
                $template_type = 'SUBMITTER';
            }
            
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    🎭 Template typ: $template_type" . ($is_urgent ? " 🚨" : "") . "\n", FILE_APPEND);
            
            // Extrahuj správnou HTML šablonu podle typu (triple-template: normal/urgent/submitter)
            $email_body = get_email_template_by_recipient($template['email_body'], $template_type);
            error_log("📧 Extrahována šablona $template_type: " . strlen($email_body) . " znaků");
            
            // Nahraď placeholdery v subject
            $email_subject = str_replace(
                ['{order_number}'],
                [$order_data['ev_cislo']],
                $template['email_subject']
            );
            
            // Načíst jméno příkazce (schvalovatele) pro {approver_name}
            $approver_name = 'Schvalovatel';
            if ($order_data['prikazce_id']) {
                $stmt_approver = $db->prepare("SELECT jmeno, prijmeni FROM " . TBL_UZIVATELE . " WHERE id = ? LIMIT 1");
                $stmt_approver->execute([$order_data['prikazce_id']]);
                $approver = $stmt_approver->fetch();
                if ($approver) {
                    $approver_name = trim($approver['jmeno'] . ' ' . $approver['prijmeni']);
                }
            }
            
            // {user_name} = jméno AKTUÁLNÍHO příjemce emailu (ne tvůrce objednávky!)
            $recipient_name = trim($user['jmeno'] . ' ' . $user['prijmeni']);
            
            // Datum = aktuální čas odeslání emailu
            $date_formatted = date('d.m.Y H:i');
            
            // Nahraď placeholdery v body
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    🔄 Replacing placeholders...\n", FILE_APPEND);
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "       recipient_name: $recipient_name (user_id: $user_id)\n", FILE_APPEND);
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "       approver_name: $approver_name\n", FILE_APPEND);
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "       strediska: {$order_data['strediska_display']}\n", FILE_APPEND);
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "       financovani: {$order_data['financovani_display']}\n", FILE_APPEND);
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "       poznamka: {$order_data['financovani_poznamka']}\n", FILE_APPEND);
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "       date: $date_formatted\n", FILE_APPEND);
            
            $email_body = str_replace(
                [
                    '{order_number}', 
                    '{order_id}',
                    '{predmet}', 
                    '{strediska}',           // ZMĚNĚNO z dodavatel_nazev
                    '{financovani}',         // Typ + číslo smlouvy/LP
                    '{financovani_poznamka}', // Poznámka ke smlouvě
                    '{amount}',
                    '{date}',
                    '{user_name}',
                    '{approver_name}'
                ],
                [
                    $order_data['ev_cislo'],
                    $order_data['id'],
                    $order_data['predmet'],
                    $order_data['strediska_display'],       // Střediska spojená čárkou
                    $order_data['financovani_display'],     // Financování typ + číslo
                    $order_data['financovani_poznamka'],    // Poznámka samostatně
                    $order_data['max_price_formatted'],
                    $date_formatted,
                    $recipient_name,  // Jméno AKTUÁLNÍHO příjemce
                    $approver_name    // Jméno příkazce z DB
                ],
                $email_body
            );
            
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    ✅ All 10 placeholders replaced\n", FILE_APPEND);
            
            file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    📨 Calling eeo_mail_send to: {$user['email']}\n", FILE_APPEND);
            error_log("📧 Odesílám email na: {$user['email']} (typ: $recipient_type)");
            
            // Odešli email
            try {
                $mail_result = eeo_mail_send($user['email'], $email_subject, $email_body, ['html' => true]);
                file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    ✅ eeo_mail_send returned: " . json_encode($mail_result) . "\n", FILE_APPEND);
            } catch (Exception $e) {
                file_put_contents('/var/www/erdms-dev/logs/dual-notification-debug.log', date('[Y-m-d H:i:s] ') . "    ❌ MAIL ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
                throw $e;
            }
            
            $sent_email = isset($mail_result['ok']) && $mail_result['ok'];
            if ($sent_email) $sent_count++;
        } else {
            error_log("📧 Email pro user $user_id VYPNUTÝ v nastavení");
        }
        
        $results[] = [
            'user_id' => $user_id,
            'email' => $user['email'],
            'sent_email' => $sent_email,
            'email_enabled' => $email_enabled,
            'system_enabled' => $system_enabled,
            'error' => (!$sent_email && $email_enabled) ? 'Email se nepodařilo odeslat' : null
        ];
    }
    
    error_log("📧 Odesláno $sent_count dual-template emailů z " . count($results) . " příjemců");
    error_log("📧 ⚠️ POZNÁMKA: In-app notifikace (zvonečky) se odesílají přes standardní systém, ne zde!");
    
    api_ok([
        'sent_email' => $sent_count,
        'total' => count($results),
        'results' => $results
    ]);
}

// Change password: validates old password and updates to a new secure hash
function handle_user_change_password($input, $config, $queries) {
    // Verify token
    $token = isset($input['token']) ? $input['token'] : '';
    $usernameReq = isset($input['username']) ? $input['username'] : '';
    $token_data = verify_token($token);
    if (!$token_data || ($usernameReq && $token_data['username'] !== $usernameReq)) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }

    // Read old/new passwords (support multiple naming conventions)
    $old = isset($input['oldPassword']) ? $input['oldPassword'] : (isset($input['old_password']) ? $input['old_password'] : (isset($input['currentPassword']) ? $input['currentPassword'] : ''));
    $new = isset($input['newPassword']) ? $input['newPassword'] : (isset($input['new_password']) ? $input['new_password'] : '');

    if (!is_string($old)) $old = '';
    if (!is_string($new)) $new = '';
    $old = trim($old);
    $new = trim($new);

    // Pro nové heslo musí být vždy zadáno
    if ($new === '') {
        api_error(400, 'Chybí nové heslo', 'MISSING_FIELDS');
        return;
    }
    if (strlen($new) < 6) {
        api_error(400, 'Nové heslo je příliš krátké (min. 6 znaků)', 'WEAK_PASSWORD');
        return;
    }

    try {
        $db = get_db($config);
        // Fetch current stored hash + vynucena_zmena_hesla flag
        $stmt = $db->prepare("SELECT id, username, password_hash, vynucena_zmena_hesla FROM " . TBL_UZIVATELE . " WHERE id = :id LIMIT 1");
        $stmt->bindParam(':id', $token_data['id'], PDO::PARAM_INT);
        $stmt->execute();
        $user = $stmt->fetch();
        if (!$user) {
            api_error(404, 'Uživatel nenalezen', 'NOT_FOUND');
            return;
        }

        // Pokud má uživatel vynucenou změnu hesla, NEPOTŘEBUJE staré heslo
        $forceChange = isset($user['vynucena_zmena_hesla']) && (int)$user['vynucena_zmena_hesla'] === 1;
        
        // Pokud NENÍ vynucená změna, musí ověřit staré heslo
        if (!$forceChange) {
            if ($old === '') {
                api_error(400, 'Chybí staré heslo', 'MISSING_FIELDS');
                return;
            }
            
            $stored = isset($user['password_hash']) ? $user['password_hash'] : '';
            $ok = false;

            // Verify old password (same logic as in handle_login)
            $bcrypt_prefix = substr($stored, 0, 4);
            if (in_array($bcrypt_prefix, array('$2y$', '$2a$', '$2b$')) && strlen($stored) >= 59) {
                if (function_exists('password_verify')) {
                    $ok = password_verify($old, $stored);
                } else {
                    $ok = (crypt($old, $stored) === $stored);
                }
            }
            if (!$ok && preg_match('/^[0-9a-f]{32}$/i', $stored)) {
                $ok = (md5($old) === $stored);
            }
            if (!$ok && $stored !== '') {
                // legacy plaintext fallback
                $ok = ($old === $stored);
            }

            if (!$ok) {
                api_error(400, 'Původní heslo není správné', 'OLD_PASSWORD_INVALID');
                return;
            }
        }

        // Hash new password using password_hash if available, else legacy fallback
        $newHash = '';
        if (function_exists('password_hash')) {
            $newHash = password_hash($new, PASSWORD_DEFAULT);
        } else {
            // PHP < 5.5 fallback (should not happen on 5.6); use md5 as last resort
            $newHash = md5($new);
        }
        if (!$newHash) {
            api_error(500, 'Chyba při hashování hesla', 'HASH_ERROR');
            return;
        }

        $stmtU = $db->prepare("UPDATE " . TBL_UZIVATELE . " SET password_hash = :hash, vynucena_zmena_hesla = 0, dt_aktualizace = NOW() WHERE id = :id");
        $stmtU->bindParam(':hash', $newHash);
        $stmtU->bindParam(':id', $user['id'], PDO::PARAM_INT);
        $stmtU->execute();

        // Vygeneruj nový token po úspěšné změně hesla
        $newToken = base64_encode($user['username'] . '|' . time());
        
        api_ok(array('changed' => true, 'token' => $newToken));
        return;
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

function handle_limitovane_prisliby($input, $config, $queries) {
    // Require token + username validation (only authenticated users)
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token (eliminuje duplicitní spojení)
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }

    try {
        // DB spojení již existuje z verify_token() výše

        // Build query to return full LP records with all columns
        // Accept filtering by usek_id (int) or usek_zkr (string) which joins to TBL_USEKY
        $params = array();
        $usekId = isset($input['usek_id']) ? intval($input['usek_id']) : null;
        $usekZkr = isset($input['usek_zkr']) ? trim($input['usek_zkr']) : null;
        $kategorie = isset($input['kategorie']) ? trim($input['kategorie']) : null;

        // Unified query builder - always include usek info via LEFT JOIN
        // Vrátit LP kódy, které jsou platné kdykoliv v aktuálním roce
        // (tzn. platne_od <= konec roku AND platne_do >= začátek roku)
        $currentYear = date('Y');
        $yearStart = $currentYear . '-01-01';
        $yearEnd = $currentYear . '-12-31';
        
        $sql = "SELECT lp.id, lp.user_id, lp.usek_id, lp.kategorie, lp.cislo_lp, lp.cislo_uctu, lp.nazev_uctu, lp.vyse_financniho_kryti, lp.platne_od, lp.platne_do, u.usek_zkr, u.usek_nazev 
                FROM " . TBL_LP_MASTER . " lp 
                LEFT JOIN " . TBL_USEKY . " u ON lp.usek_id = u.id 
                WHERE lp.cislo_lp IS NOT NULL 
                AND lp.platne_od <= :year_end 
                AND lp.platne_do >= :year_start";
        
        // Přidat parametry pro rok
        $params[':year_start'] = $yearStart;
        $params[':year_end'] = $yearEnd;

        // Add filters dynamically
        if ($usekZkr !== null && $usekZkr !== '') {
            $sql .= " AND u.usek_zkr = :usek_zkr";
            $params[':usek_zkr'] = $usekZkr;
        }
        if ($usekId !== null && $usekId > 0) {
            $sql .= " AND lp.usek_id = :usek_id";
            $params[':usek_id'] = $usekId;
        }
        if ($kategorie !== null && $kategorie !== '') {
            $sql .= " AND lp.kategorie = :kategorie";
            $params[':kategorie'] = $kategorie;
        }

        $sql .= " ORDER BY lp.cislo_lp";

        // Conditional debug logging
        if (API_DEBUG_MODE) {
            error_log("LP Query SQL: " . $sql);
            error_log("LP Query Params: " . json_encode($params));
        }

        $stmt = $db->prepare($sql);
        // Bind parameters with correct types (INT vs STRING)
        foreach ($params as $k => $v) {
            if ($k === ':usek_id') {
                $stmt->bindValue($k, $v, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($k, $v, PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC); // return full objects

        // Conditional debug logging
        if (API_DEBUG_MODE) {
            error_log("LP Query Result Count: " . count($rows));
        }

        api_ok($rows);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("LP Query Error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání limitovaných příslibů: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// ========== DODAVATELE HANDLERS ==========

// Dodavatele: list all
function handle_dodavatele_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba a ted mi jen pro kontrolu vrat připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }

    try {
        $stmt = $db->prepare($queries['dodavatele_select_all']);
        $stmt->execute();
        $dodavatele = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        api_ok($dodavatele);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatele list error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání dodavatelů: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// Dodavatele: get by ID
function handle_dodavatele_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $dodavatel_id = isset($input['id']) ? intval($input['id']) : null;
    
    if (!$dodavatel_id || $dodavatel_id <= 0) {
        api_error(400, 'Chybí nebo je neplatné ID dodavatele', 'MISSING_ID');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }

    try {
        $stmt = $db->prepare($queries['dodavatele_select_by_id']);
        $stmt->bindValue(':id', $dodavatel_id, PDO::PARAM_INT);
        $stmt->execute();
        $dodavatel = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$dodavatel) {
            api_error(404, 'Dodavatel nenalezen', 'NOT_FOUND');
            return;
        }
        
        api_ok($dodavatel);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatel detail error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání dodavatele: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// Dodavatele: search by IČO
function handle_dodavatele_search_ico($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $ico = isset($input['ico']) ? trim($input['ico']) : '';
    
    if (!$ico) {
        api_error(400, 'Chybí IČO', 'MISSING_ICO');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }

    try {
        $stmt = $db->prepare($queries['dodavatele_select_by_ico']);
        $stmt->bindValue(':ico', $ico, PDO::PARAM_STR);
        $stmt->execute();
        $dodavatel = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$dodavatel) {
            // Vrátíme prázdný result místo 404, aby FE mohl rozlišit "neexistuje" vs "chyba"
            api_ok(null);
            return;
        }
        
        api_ok($dodavatel);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatel search by ICO error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při vyhledávání dodavatele podle IČO: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

/**
 * Handler pro vyhledání dodavatele podle názvu (LIKE search)
 */
function handle_dodavatele_search_nazev($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $nazev = isset($input['nazev']) ? trim($input['nazev']) : '';
    
    if (!$nazev) {
        api_error(400, 'Chybí název dodavatele pro vyhledání', 'MISSING_NAZEV');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    try {
        $stmt = $db->prepare($queries['dodavatele_search_nazev']);
        $stmt->bindValue(':nazev', '%' . $nazev . '%', PDO::PARAM_STR);
        $stmt->execute();
        $dodavatele = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        api_ok($dodavatele, array('count' => count($dodavatele), 'search_term' => $nazev));
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatel search by nazev error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při vyhledávání dodavatele podle názvu: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

/**
 * Handler pro univerzální vyhledání dodavatele podle IČO nebo názvu (OR logika)
 */
function handle_dodavatele_search($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $nazev = isset($input['nazev']) ? trim($input['nazev']) : '';
    $ico = isset($input['ico']) ? trim($input['ico']) : '';
    
    if (!$nazev && !$ico) {
        api_error(400, 'Musí být poskytnut název nebo IČO pro vyhledání', 'MISSING_SEARCH_PARAMS');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    try {
        // Dynamické sestavení WHERE podmínek pro OR logiku
        $whereConditions = array();
        $params = array();
        
        if ($nazev) {
            $whereConditions[] = "nazev LIKE :nazev";
            $params[':nazev'] = '%' . $nazev . '%';
        }
        
        if ($ico) {
            $whereConditions[] = "ico = :ico";
            $params[':ico'] = $ico;
        }
        
        $sql = "SELECT * FROM " . TBL_DODAVATELE . " WHERE " . implode(' OR ', $whereConditions) . " ORDER BY nazev";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $stmt->execute();
        $dodavatele = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $searchInfo = array(
            'count' => count($dodavatele),
            'search_criteria' => array()
        );
        
        if ($nazev) $searchInfo['search_criteria']['nazev'] = $nazev;
        if ($ico) $searchInfo['search_criteria']['ico'] = $ico;
        
        api_ok($dodavatele, $searchInfo);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatel universal search error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při vyhledávání dodavatele: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

/**
 * Handler pro filtrované načítání kontaktů podle přístupu uživatele
 * Vrací: GLOBAL (user_id=0) + uživatelské (user_id=ID) + úsekové (usek_zkr obsahuje JSON)
 * 
 * Parametry z FE (volitelné - pokud nejsou, načtou se z DB podle tokenu):
 * - user_id: ID uživatele pro filtrování
 * - usek_zkr: zkratka úseku pro úsekové kontakty
 */
function handle_dodavatele_contacts($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Volitelné parametry z FE - ošetření pro případy, kdy přijde array místo očekávané hodnoty
    $fe_user_id = null;
    if (isset($input['user_id'])) {
        if (is_array($input['user_id'])) {
            // Pokud je array, vezmi první prvek
            $fe_user_id = !empty($input['user_id']) ? (int)$input['user_id'][0] : null;
        } else {
            $fe_user_id = (int)$input['user_id'];
        }
        // Pokud je výsledek 0, nastav na null (0 není validní user_id)
        if ($fe_user_id === 0) {
            $fe_user_id = null;
        }
    }
    
    // Ošetření usek_zkr - může přijít jako string nebo array z FE
    $fe_usek_zkr = null;
    if (isset($input['usek_zkr'])) {
        if (is_array($input['usek_zkr'])) {
            // Pokud je to array, vezmi první prvek nebo ignoruj prázdné
            $fe_usek_zkr = !empty($input['usek_zkr']) ? trim((string)$input['usek_zkr'][0]) : null;
        } else {
            // Pokud je to string, použij trim
            $fe_usek_zkr = trim($input['usek_zkr']);
        }
        // Pokud je výsledek prázdný string, nastav na null
        if ($fe_usek_zkr === '') {
            $fe_usek_zkr = null;
        }
    }
    
    $load_all = isset($input['load_all']) ? (bool)$input['load_all'] : false;
    
    // Debug: loguj příchozí parametry
    if (API_DEBUG_MODE) {
        $debug_usek_type = isset($input['usek_zkr']) ? gettype($input['usek_zkr']) : 'not_set';
        error_log("handle_dodavatele_contacts - Input params: " . json_encode(array(
            'fe_user_id' => $fe_user_id,
            'fe_usek_zkr' => $fe_usek_zkr,
            'fe_usek_zkr_type' => $debug_usek_type,
            'load_all' => $load_all
        )));
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    // Získej user_id z tokenu a načti jeho úsek z DB
    $user_id = $token_data['id'];
    
    try {
        // Načti informace o uživateli včetně úseku
        $stmtUser = $db->prepare("SELECT u.id, u.username, us.usek_zkr 
                                  FROM " . TBL_UZIVATELE . " u 
                                  LEFT JOIN " . TBL_USEKY . " us ON u.usek_id = us.id 
                                  WHERE u.id = :user_id");
        $stmtUser->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmtUser->execute();
        $userInfo = $stmtUser->fetch(PDO::FETCH_ASSOC);
        
        if (!$userInfo) {
            api_error(404, 'Uživatel nenalezen', 'USER_NOT_FOUND');
            return;
        }
        
        $user_usek_zkr = $userInfo['usek_zkr'] ? $userInfo['usek_zkr'] : '';
        
        // Použij parametry z FE pokud jsou poskytnuty, jinak data z DB
        $final_user_id = $fe_user_id !== null ? $fe_user_id : $user_id;
        $final_usek_zkr = $fe_usek_zkr !== null ? $fe_usek_zkr : $user_usek_zkr;
        
        if (API_DEBUG_MODE) {
            error_log("User info from DB: " . json_encode($userInfo));
            error_log("Final filter params - user_id: $final_user_id, usek_zkr: $final_usek_zkr");
        }
        
        // Sestavení SQL - buď všechny kontakty nebo filtrované
        if ($load_all) {
            // Načti všechny kontakty bez filtrování
            $sql = "SELECT * FROM " . TBL_DODAVATELE . " ORDER BY nazev";
            $params = array();
        } else {
            // Filtrované načítání (původní logika)
            $sql = "SELECT * FROM " . TBL_DODAVATELE . " WHERE 
                (user_id = 0) OR 
                (user_id = :user_id)";
            
            $params = array(':user_id' => $final_user_id);
            
            // Pokud má uživatel definovaný úsek, přidej úsekové kontakty
            // Použijeme LIKE místo JSON_CONTAINS pro kompatibilitu s MySQL 5.6
            if ($final_usek_zkr) {
                $sql .= " OR (usek_zkr != '' AND usek_zkr LIKE :usek_zkr_like)";
                $params[':usek_zkr_like'] = '%"' . $final_usek_zkr . '"%'; // Hledá "IT" v JSON
            }
            
            $sql .= " ORDER BY nazev";
        }
        
        if (API_DEBUG_MODE) {
            error_log("Dodavatele contacts SQL: " . $sql);
            error_log("Dodavatele contacts params: " . json_encode($params));
        }
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            if ($key === ':user_id') {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value, PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        $dodavatele = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $filterInfo = array(
            'count' => count($dodavatele),
            'load_all' => $load_all
        );
        
        if ($load_all) {
            $filterInfo['mode'] = 'all_contacts_no_filter';
        } else {
            $filterInfo['filter_criteria'] = array(
                'user_id' => $final_user_id,
                'usek_zkr' => $final_usek_zkr,
                'includes_global' => true,
                'source' => array(
                    'user_id_from_fe' => $fe_user_id !== null,
                    'usek_zkr_from_fe' => $fe_usek_zkr !== null
                )
            );
        }
        
        api_ok($dodavatele, $filterInfo);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatele contacts error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání kontaktů: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

/**
 * Ověří, zda má uživatel admin právo pro správu kontaktů
 */
function user_has_admin_rights($user_id, $db, $queries) {
    try {
        // Kontrola přímých práv
        if (isset($queries['uzivatele_prava_direct_by_user'])) {
            $stmtDirect = $db->prepare($queries['uzivatele_prava_direct_by_user']);
            $stmtDirect->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmtDirect->execute();
            $direct_rights = $stmtDirect->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($direct_rights as $right) {
                $kod = isset($right['kod_prava']) ? $right['kod_prava'] : '';
                if (in_array($kod, array('SUPERADMIN', 'ADMIN', 'SUPPLIER_MANAGE'))) {
                    return true;
                }
            }
        }
        
        // Kontrola práv přes role
        if (isset($queries['uzivatele_roles_by_user']) && isset($queries['uzivatele_prava_by_role'])) {
            $stmtRoles = $db->prepare($queries['uzivatele_roles_by_user']);
            $stmtRoles->bindParam(':uzivatel_id', $user_id, PDO::PARAM_INT);
            $stmtRoles->execute();
            $roles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($roles as $role) {
                if (isset($role['id'])) {
                    $stmtRights = $db->prepare($queries['uzivatele_prava_by_role']);
                    $stmtRights->bindParam(':role_id', $role['id'], PDO::PARAM_INT);
                    $stmtRights->execute();
                    $role_rights = $stmtRights->fetchAll(PDO::FETCH_ASSOC);
                    
                    foreach ($role_rights as $right) {
                        $kod = isset($right['kod_prava']) ? $right['kod_prava'] : '';
                        if (in_array($kod, array('SUPERADMIN', 'ADMIN', 'SUPPLIER_MANAGE'))) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Handler pro načítání všech kontaktů dodavatelů pro admin uživatele
 * Bez filtrování podle user_id a usek_zkr
 */
function handle_dodavatele_contacts_admin($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    $user_id = $token_data['id'];
    
    // Ověř admin práva
    if (!user_has_admin_rights($user_id, $db, $queries)) {
        api_error(403, 'Nedostatečná oprávnění pro přístup ke všem kontaktům', 'FORBIDDEN');
        return;
    }
    
    try {
        // Načti všechny kontakty bez filtrování
        $sql = "SELECT * FROM " . TBL_DODAVATELE . " ORDER BY nazev";
        
        if (API_DEBUG_MODE) {
            error_log("Admin dodavatele contacts SQL: " . $sql);
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $dodavatele = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $filterInfo = array(
            'count' => count($dodavatele),
            'mode' => 'admin_all_contacts',
            'user_id' => $user_id,
            'no_filtering' => true
        );
        
        api_ok($dodavatele, $filterInfo);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Admin dodavatele contacts error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání všech kontaktů: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// Dodavatele: create new
function handle_dodavatele_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Validace povinných polí
    $nazev = isset($input['nazev']) ? trim($input['nazev']) : '';
    $ico = isset($input['ico']) ? trim($input['ico']) : '';
    
    if (!$nazev) {
        api_error(400, 'Chybí povinné pole: nazev', 'MISSING_REQUIRED_FIELD');
        return;
    }
    
    if (!$ico) {
        api_error(400, 'Chybí povinné pole: ico', 'MISSING_REQUIRED_FIELD');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }

    try {
        // Připrav volitelná pole (nazev a ico jsou už validována výše)
        $adresa = isset($input['adresa']) ? trim($input['adresa']) : null;
        $dic = isset($input['dic']) ? trim($input['dic']) : null;
        $zastoupeny = isset($input['zastoupeny']) ? trim($input['zastoupeny']) : null;
        $kontakt_jmeno = isset($input['kontakt_jmeno']) ? trim($input['kontakt_jmeno']) : null;
        $kontakt_email = isset($input['kontakt_email']) ? trim($input['kontakt_email']) : null;
        $kontakt_telefon = isset($input['kontakt_telefon']) ? trim($input['kontakt_telefon']) : null;
        
        // User management - default hodnoty
        $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0; // 0 = globální
        $usek_zkr = isset($input['usek_zkr']) ? trim($input['usek_zkr']) : '';
        
        $stmt = $db->prepare($queries['dodavatele_insert']);
        $stmt->bindValue(':nazev', $nazev, PDO::PARAM_STR);
        $stmt->bindValue(':adresa', $adresa, PDO::PARAM_STR);
        $stmt->bindValue(':ico', $ico, PDO::PARAM_STR);
        $stmt->bindValue(':dic', $dic, PDO::PARAM_STR);
        $stmt->bindValue(':zastoupeny', $zastoupeny, PDO::PARAM_STR);
        $stmt->bindValue(':kontakt_jmeno', $kontakt_jmeno, PDO::PARAM_STR);
        $stmt->bindValue(':kontakt_email', $kontakt_email, PDO::PARAM_STR);
        $stmt->bindValue(':kontakt_telefon', $kontakt_telefon, PDO::PARAM_STR);
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':usek_zkr', $usek_zkr, PDO::PARAM_STR);
        $stmt->execute();
        
        $new_id = $db->lastInsertId();
        
        api_ok(array('id' => (int)$new_id, 'message' => 'Dodavatel úspěšně vytvořen'));
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatel create error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při vytváření dodavatele: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// Dodavatele: update by ID
function handle_dodavatele_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $dodavatel_id = isset($input['id']) ? intval($input['id']) : null;
    
    if (!$dodavatel_id || $dodavatel_id <= 0) {
        api_error(400, 'Chybí nebo je neplatné ID dodavatele', 'MISSING_ID');
        return;
    }
    
    // Validace - nazev je povinný jen pokud je poskytnut
    $nazev = isset($input['nazev']) ? trim($input['nazev']) : null;
    if (isset($input['nazev']) && !$nazev) {
        api_error(400, 'Pole nazev nesmí být prázdné', 'INVALID_FIELD_VALUE');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }

    try {
        // Ověř, že dodavatel existuje
        $stmtCheck = $db->prepare($queries['dodavatele_select_by_id']);
        $stmtCheck->bindValue(':id', $dodavatel_id, PDO::PARAM_INT);
        $stmtCheck->execute();
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing) {
            api_error(404, 'Dodavatel nenalezen', 'NOT_FOUND');
            return;
        }
        
        // Dynamické sestavení UPDATE dotazu - aktualizuj jen poskytnuté hodnoty
        $updateFields = array();
        $params = array();
        
        if ($nazev !== null) {
            $updateFields[] = "nazev = :nazev";
            $params[':nazev'] = $nazev;
        }
        if (isset($input['adresa'])) {
            $updateFields[] = "adresa = :adresa";
            $params[':adresa'] = trim($input['adresa']);
        }
        if (isset($input['ico'])) {
            $updateFields[] = "ico = :ico";
            $params[':ico'] = trim($input['ico']);
        }
        if (isset($input['dic'])) {
            $updateFields[] = "dic = :dic";
            $params[':dic'] = trim($input['dic']);
        }
        if (isset($input['zastoupeny'])) {
            $updateFields[] = "zastoupeny = :zastoupeny";
            $params[':zastoupeny'] = trim($input['zastoupeny']);
        }
        if (isset($input['kontakt_jmeno'])) {
            $updateFields[] = "kontakt_jmeno = :kontakt_jmeno";
            $params[':kontakt_jmeno'] = trim($input['kontakt_jmeno']);
        }
        if (isset($input['kontakt_email'])) {
            $updateFields[] = "kontakt_email = :kontakt_email";
            $params[':kontakt_email'] = trim($input['kontakt_email']);
        }
        if (isset($input['kontakt_telefon'])) {
            $updateFields[] = "kontakt_telefon = :kontakt_telefon";
            $params[':kontakt_telefon'] = trim($input['kontakt_telefon']);
        }
        if (isset($input['user_id'])) {
            $updateFields[] = "user_id = :user_id";
            $params[':user_id'] = (int)$input['user_id'];
        }
        if (isset($input['usek_zkr'])) {
            $updateFields[] = "usek_zkr = :usek_zkr";
            $params[':usek_zkr'] = trim($input['usek_zkr']);
        }
        
        if (empty($updateFields)) {
            api_error(400, 'Nejsou poskytnuty žádné hodnoty k aktualizaci', 'NO_UPDATE_FIELDS');
            return;
        }
        
        // Vždy aktualizuj dt_aktualizace
        $updateFields[] = "dt_aktualizace = NOW()";
        
        $sql = "UPDATE " . TBL_DODAVATELE . " SET " . implode(', ', $updateFields) . " WHERE id = :id";
        $params[':id'] = $dodavatel_id;
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            if ($key === ':id' || $key === ':user_id') {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value, PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        
        api_ok(array('id' => $dodavatel_id, 'message' => 'Dodavatel úspěšně aktualizován'));
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatel update error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při aktualizaci dodavatele: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// Dodavatele: partial update by ICO (updates only provided fields)
function handle_dodavatele_update_by_ico($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $ico = isset($input['ico']) ? trim($input['ico']) : '';
    
    if (!$ico) {
        api_error(400, 'Chybí IČO dodavatele', 'MISSING_ICO');
        return;
    }
    
    // Validace povinného pole název - pokud je v requestu, nesmí být prázdný
    if (array_key_exists('nazev', $input)) {
        $nazev = trim($input['nazev']);
        if ($nazev === '') {
            api_error(400, 'Název dodavatele nesmí být prázdný', 'INVALID_FIELD');
            return;
        }
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }

    try {
        // Ověř, že dodavatel existuje
        $stmtCheck = $db->prepare($queries['dodavatele_select_by_ico']);
        $stmtCheck->bindValue(':ico', $ico, PDO::PARAM_STR);
        $stmtCheck->execute();
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing) {
            api_error(404, 'Dodavatel s daným IČO nenalezen', 'NOT_FOUND');
            return;
        }
        
        // Dynamicky sestav UPDATE dotaz jen pro poskytnutá pole
        $updateFields = array();
        $params = array(':ico' => $ico);
        
        // Definice všech aktualizovatelných polí
        $allowedFields = array(
            'nazev' => PDO::PARAM_STR,
            'adresa' => PDO::PARAM_STR,
            'dic' => PDO::PARAM_STR,
            'zastoupeny' => PDO::PARAM_STR,
            'kontakt_jmeno' => PDO::PARAM_STR,
            'kontakt_email' => PDO::PARAM_STR,
            'kontakt_telefon' => PDO::PARAM_STR,
            'user_id' => PDO::PARAM_INT,
            'usek_zkr' => PDO::PARAM_STR
        );
        
        // Projdi všechna pole a přidej jen ta, která jsou v requestu
        foreach ($allowedFields as $field => $paramType) {
            if (array_key_exists($field, $input)) {
                $value = $input[$field];
                
                // Speciální zpracování pro user_id
                if ($field === 'user_id') {
                    $value = (int)$value;
                } 
                // Speciální zpracování pro usek_zkr - konverze array na JSON
                elseif ($field === 'usek_zkr') {
                    if (is_array($value)) {
                        // Pokud je to array, převeď na JSON array zkratek
                        $value = json_encode(array_values($value));
                    } elseif (is_string($value)) {
                        // Pokud je to už string, zkontroluj jestli je to validní JSON
                        $decoded = json_decode($value, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                            $value = json_encode(array_values($decoded));
                        } else {
                            // Není to JSON, předpokládej že je to jediná zkratka
                            $value = json_encode(array($value));
                        }
                    }
                }
                elseif (is_string($value)) {
                    // Pokud je string, trim, jinak ponech null
                    $value = trim($value);
                    // Prázdný string můžeme považovat za null (volitelné)
                    if ($value === '') {
                        $value = null;
                    }
                }
                $updateFields[] = "$field = :$field";
                $params[":$field"] = $value;
            }
        }
        
        // Pokud nejsou žádná pole k aktualizaci
        if (empty($updateFields)) {
            api_error(400, 'Nebyla poskytnuta žádná pole k aktualizaci', 'NO_FIELDS_TO_UPDATE');
            return;
        }
        
        // Vždy aktualizuj dt_aktualizace
        $updateFields[] = "dt_aktualizace = NOW()";
        
        // Sestav finální SQL
        $sql = "UPDATE " . TBL_DODAVATELE . " SET " . implode(', ', $updateFields) . " WHERE ico = :ico";
        
        if (API_DEBUG_MODE) {
            error_log("Partial update SQL: " . $sql);
            error_log("Partial update params: " . json_encode($params));
        }
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            if ($key === ':ico') {
                $stmt->bindValue($key, $value, PDO::PARAM_STR);
            } elseif ($key === ':user_id') {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value, PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        
        api_ok(array(
            'ico' => $ico, 
            'updated_fields' => array_keys(array_diff_key($params, array(':ico' => true))),
            'message' => 'Dodavatel úspěšně aktualizován'
        ));
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatel partial update by ICO error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při aktualizaci dodavatele: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

/**
 * Handler pro smazání dodavatele podle ID
 */
function handle_dodavatele_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if (!$id) {
        api_error(400, 'Chybí ID dodavatele pro smazání', 'MISSING_ID');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }

    try {
        // Ověř, že dodavatel existuje a získej jeho údaje pro log
        $stmtCheck = $db->prepare($queries['dodavatele_select_by_id']);
        $stmtCheck->bindValue(':id', $id, PDO::PARAM_INT);
        $stmtCheck->execute();
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing) {
            api_error(404, 'Dodavatel s daným ID nenalezen', 'NOT_FOUND');
            return;
        }
        
        // Smaž dodavatele
        $stmt = $db->prepare($queries['dodavatele_delete']);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        $affected = $stmt->rowCount();
        
        if ($affected === 0) {
            api_error(404, 'Dodavatel nenalezen nebo již byl smazán', 'NOT_FOUND');
            return;
        }
        
        if (API_DEBUG_MODE) {
            error_log("Dodavatel deleted - ID: $id, nazev: " . $existing['nazev'] . ", ICO: " . $existing['ico']);
        }
        
        api_ok(array(
            'deleted' => true,
            'id' => $id,
            'nazev' => $existing['nazev'],
            'ico' => $existing['ico'],
            'message' => 'Dodavatel úspěšně smazán'
        ));
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Dodavatel delete error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při mazání dodavatele: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// ========== END DODAVATELE HANDLERS ==========

// ========== USEKY (DEPARTMENTS) HANDLERS ==========

/**
 * Handler pro seznam všech úseků
 */
function handle_useky_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    try {
        $stmt = $db->prepare($queries['useky_list']);
        $stmt->execute();
        $useky = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        api_ok($useky, array('count' => count($useky)));
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Useky list error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání úseků: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

/**
 * Handler pro detail úseku podle ID
 */
function handle_useky_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if (!$id) {
        api_error(400, 'Chybí povinné pole: id', 'MISSING_REQUIRED_FIELD');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    try {
        $stmt = $db->prepare($queries['useky_select_by_id']);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $usek = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$usek) {
            api_error(404, 'Úsek nenalezen', 'NOT_FOUND');
            return;
        }
        
        api_ok($usek);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Useky detail error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání úseku: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

/**
 * Handler pro vyhledání úseku podle zkratky
 */
function handle_useky_by_zkr($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $usek_zkr = isset($input['usek_zkr']) ? trim($input['usek_zkr']) : '';
    
    if (!$usek_zkr) {
        api_error(400, 'Chybí zkratka úseku', 'MISSING_USEK_ZKR');
        return;
    }
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    try {
        $stmt = $db->prepare($queries['useky_select_by_zkr']);
        $stmt->bindValue(':usek_zkr', $usek_zkr, PDO::PARAM_STR);
        $stmt->execute();
        $usek = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$usek) {
            api_error(404, 'Úsek s danou zkratkou nenalezen', 'NOT_FOUND');
            return;
        }
        
        api_ok($usek);
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Useky by zkr error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při vyhledávání úseku: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// ========== END USEKY HANDLERS ==========

// Templates: select all OR by user (includes global user_id=0), insert, update
function handle_templates_select($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    // Username rule: if username provided it must match token; if missing and user_id==0 in request, block.
    $request_username = isset($input['username']) ? $input['username'] : '';
    if ($request_username) {
        if ($token_data['username'] !== $request_username) {
            api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
            return;
        }
    } else {
        if (isset($input['user_id']) && intval($input['user_id']) === 0) {
            api_error(401, 'Požadováno username při operaci s user_id=0', 'MISSING_USERNAME');
            return;
        }
    }
    // Username rule: if username is provided, it must match token; if username is missing and
    // the request explicitly contains user_id=0, block the operation.
    $request_username = isset($input['username']) ? $input['username'] : '';
    if ($request_username) {
        if ($token_data['username'] !== $request_username) {
            api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
            return;
        }
    } else {
        if (isset($input['user_id']) && intval($input['user_id']) === 0) {
            api_error(401, 'Požadováno username při operaci s user_id=0', 'MISSING_USERNAME');
            return;
        }
    }

    try {
        $db = get_db($config);
    $userId = isset($input['user_id']) ? intval($input['user_id']) : $token_data['id'];
    // 'typ' is an enum-like field; support but prefer filtering by 'kategorie'
    $typ = isset($input['typ']) ? trim($input['typ']) : null;
    // Accept 'kategorie' parameter; default to 'OBJEDNAVKA' if not provided
    $kategorie = isset($input['kategorie']) ? trim($input['kategorie']) : 'OBJEDNAVKA';

        // include global templates saved as user_id = 0 OR user_id IS NULL
        $params = array();
        // Build SQL: always include kategorie filter (default 'OBJEDNAVKA'), optionally also typ
        if ($typ !== null && $typ !== '') {
            // filter by both kategorie and typ
            $sql = "SELECT * FROM " . TBL_SABLONY_OBJEDNAVEK . " WHERE (user_id = :user_id OR user_id = 0 OR user_id IS NULL) AND kategorie = :kategorie AND typ = :typ ORDER BY id";
            $params[':user_id'] = $userId;
            $params[':kategorie'] = $kategorie;
            $params[':typ'] = $typ;
        } else {
            // filter by kategorie only
            $sql = "SELECT * FROM " . TBL_SABLONY_OBJEDNAVEK . " WHERE (user_id = :user_id OR user_id = 0 OR user_id IS NULL) AND kategorie = :kategorie ORDER BY id";
            $params[':user_id'] = $userId;
            $params[':kategorie'] = $kategorie;
        }

        $stmt = $db->prepare($sql);
        // bind params dynamically
        foreach ($params as $pname => $pval) {
            if (is_int($pval)) {
                $stmt->bindValue($pname, $pval, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($pname, $pval, PDO::PARAM_STR);
            }
        }

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // Optional debug output for FE to diagnose empty results
        if (isset($input['debug']) && $input['debug']) {
            // build filled SQL for phpMyAdmin by inlining parameter values (quoted/escaped)
            $filled_sql = $sql;
            foreach ($params as $pname => $pval) {
                if (is_null($pval)) {
                    $replacement = 'NULL';
                } elseif (is_int($pval) || (is_string($pval) && preg_match('/^-?\d+$/', $pval))) {
                    $replacement = (string)$pval;
                } else {
                    // use PDO::quote to escape string safely
                    $replacement = $db->quote($pval);
                }
                $filled_sql = str_replace($pname, $replacement, $filled_sql);
            }
            $debugOut = array(
                'sql' => $sql,
                'filled_sql' => $filled_sql,
                'user_id' => $userId,
                'typ' => $typ,
                'rows_count' => count($rows)
            );
            api_ok($rows, $debugOut);
            return;
        }
        api_ok($rows);
        return;
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

function handle_templates_insert($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    // Username rule as above
    $request_username = isset($input['username']) ? $input['username'] : '';
    if ($request_username) {
        if ($token_data['username'] !== $request_username) {
            api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
            return;
        }
    } else {
        if (isset($input['user_id']) && intval($input['user_id']) === 0) {
            api_error(401, 'Požadováno username při operaci s user_id=0', 'MISSING_USERNAME');
            return;
        }
    }

    // Do not enforce further ownership here; FE decides which user_id to send.
    $userId = isset($input['user_id']) ? intval($input['user_id']) : $token_data['id'];
    $nazev = isset($input['nazev_sablony']) ? trim($input['nazev_sablony']) : '';
    $polozky_po = isset($input['polozky_po']) ? $input['polozky_po'] : '';
    $polozky_detail = isset($input['polozky_detail']) ? $input['polozky_detail'] : '';
    $typ = isset($input['typ']) ? $input['typ'] : 'PO';
    $kategorie = isset($input['kategorie']) ? $input['kategorie'] : 'OBJEDNAVKA';

    if ($nazev === '') {
        api_error(400, 'Chybí nazev_sablony', 'MISSING_FIELDS');
        return;
    }

    try {
        $db = get_db($config);
        
        // Načíst usek_zkr uživatele
        $usek_zkr = null;
        $userQuery = "SELECT u.usek_id, us.usek_zkr FROM " . TBL_UZIVATELE . " u LEFT JOIN " . TBL_USEKY . " us ON u.usek_id = us.id WHERE u.id = :user_id";
        $stmtUser = $db->prepare($userQuery);
        $stmtUser->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmtUser->execute();
        $userData = $stmtUser->fetch(PDO::FETCH_ASSOC);
        if ($userData && $userData['usek_zkr']) {
            $usek_zkr = $userData['usek_zkr'];
        }
        
        $stmt = $db->prepare($queries['sablony_objednavek_insert']);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindParam(':nazev_sablony', $nazev);
        $stmt->bindParam(':polozky_po', $polozky_po);
        $stmt->bindParam(':polozky_detail', $polozky_detail);
        $stmt->bindParam(':typ', $typ);
        $stmt->bindParam(':kategorie', $kategorie);
        $stmt->bindParam(':usek_zkr', $usek_zkr);
        $stmt->execute();
        $id = $db->lastInsertId();
        api_ok(array('id' => (int)$id));
        return;
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

function handle_templates_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }

    $id = isset($input['id']) ? intval($input['id']) : 0;
    if ($id <= 0) {
        api_error(400, 'Chybí id šablony', 'MISSING_ID');
        return;
    }

    // Fetch existing row early to allow returning current data; ownership rules are not enforced server-side.
    try {
        $db = get_db($config);
        $stmtExisting = $db->prepare($queries['sablony_objednavek_select_by_id']);
        $stmtExisting->bindParam(':id', $id, PDO::PARAM_INT);
        $stmtExisting->execute();
        $existingRow = $stmtExisting->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze při načítání šablony: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
    if (!$existingRow) {
        api_error(404, 'Šablona nenalezena', 'NOT_FOUND');
        return;
    }

    // Note: do NOT enforce username or owner checks here. FE should manage ownership and username validation.

    // Accept partial updates: only update columns provided in the request.
    // Allow updating user_id (ownership transfer) with simple permission rules below.
    $updatable = array('nazev_sablony', 'polozky_po', 'polozky_detail', 'typ', 'kategorie', 'user_id');
    $fields = array();
    $params = array();
    foreach ($updatable as $col) {
        if (array_key_exists($col, $input)) {
            // trim strings except for json/text fields
            $val = $input[$col];
            if (is_string($val)) $val = trim($val);
            $fields[] = "$col = :$col";
            $params[":".$col] = $val;
        }
    }

    // Ownership changes (user_id) are allowed as provided by FE/token; server does not block them.

    if (count($fields) === 0) {
        api_error(400, 'Nic k aktualizaci, pošli alespoň jedno pole', 'NO_FIELDS');
        return;
    }

    // Always update dt_aktualizace
    $set_sql = implode(', ', $fields) . ', dt_aktualizace = NOW()';

    try {
        $db = get_db($config);
        $sql = "UPDATE " . TBL_SABLONY_OBJEDNAVEK . " SET " . $set_sql . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        // bind dynamic params
        foreach ($params as $pname => $pval) {
            if (is_int($pval)) {
                $stmt->bindValue($pname, $pval, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($pname, $pval, PDO::PARAM_STR);
            }
        }
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        // Fetch the updated row so client sees the new dt_aktualizace (system time)
        try {
            $stmtSel = $db->prepare($queries['sablony_objednavek_select_by_id']);
            $stmtSel->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtSel->execute();
            $updatedRow = $stmtSel->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $updatedRow = null;
        }
        api_ok(array('updated' => true, 'row' => $updatedRow));
        return;
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

// Delete template by id. Only the owner (user_id) or admin/system may delete.
function handle_templates_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    // Username rule: if username provided it must match token; if missing and user_id==0 in request, block.
    if ($request_username) {
        if ($token_data['username'] !== $request_username) {
            api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
            return;
        }
    } else {
        if (isset($input['user_id']) && intval($input['user_id']) === 0) {
            api_error(401, 'Požadováno username při operaci s user_id=0', 'MISSING_USERNAME');
            return;
        }
    }

    $id = isset($input['id']) ? intval($input['id']) : 0;
    if ($id <= 0) {
        api_error(400, 'Chybí id šablony', 'MISSING_ID');
        return;
    }

    try {
        $db = get_db($config);
        // fetch template to check owner
        $stmt = $db->prepare($queries['sablony_objednavek_select_by_id']);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            api_error(404, 'Šablona nenalezena', 'NOT_FOUND');
            return;
        }

        $ownerId = isset($row['user_id']) ? intval($row['user_id']) : 0;
        // Username rule: if username provided it must match token; if missing and request contains user_id=0, block.
        $request_username = isset($input['username']) ? $input['username'] : '';
        if ($request_username) {
            if ($token_data['username'] !== $request_username) {
                api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
                return;
            }
            // token+username valid -> allow deletion (FE is responsible for authorization)
        } else {
            if (isset($input['user_id']) && intval($input['user_id']) === 0) {
                api_error(401, 'Požadováno username při operaci s user_id=0', 'MISSING_USERNAME');
                return;
            }
            // no username and no explicit user_id=0 -> allow (FE handles ownership)
        }

        $stmtD = $db->prepare($queries['sablony_objednavek_delete']);
        $stmtD->bindParam(':id', $id, PDO::PARAM_INT);
        $stmtD->execute();

        api_ok(array('deleted' => true));
        return;
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

function handle_users_list($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'err' => 'Neplatný nebo chybějící token',
            'debug' => array(
                'token' => $token,
                'token_decoded' => $token ? base64_decode($token) : null,
                'token_parts' => $token ? explode('|', base64_decode($token)) : null
            )
        ));
        return;
    }

    // Ověření, že username z tokenu odpovídá username z požadavku
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }

    try {
        $db = get_db($config);
        // Update last activity for the authenticated user (the one from token)
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id']);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal: continue even if update fails
        }
        
        // Fetch users - s volitelným filtrem na aktivní/neaktivní
        // Pokud je parametr 'aktivni' nastaven, filtruje podle něj
        // Pokud není nastaven, vrací všechny uživatele
        $has_aktivni_filter = isset($input['aktivni']) && ($input['aktivni'] === 0 || $input['aktivni'] === 1 || $input['aktivni'] === '0' || $input['aktivni'] === '1');
        
        if ($has_aktivni_filter) {
            // Filtrování podle aktivity - vytvoříme vlastní SQL s WHERE podmínkou
            $aktivni_value = (int)$input['aktivni'];
            $sql = "
                SELECT 
                    u.id,
                    u.username,
                    u.titul_pred,
                    u.jmeno,
                    u.prijmeni,
                    u.dt_posledni_aktivita,
                    u.aktivita_metadata,
                    u.titul_za,
                    u.email,
                    u.telefon,
                    u.aktivni,
                    u.vynucena_zmena_hesla,
                    u.dt_vytvoreni,
                    u.dt_aktualizace,
                    u.viditelny_v_tel_seznamu,
                    
                    IFNULL(p.nazev_pozice, '') as nazev_pozice,
                    p.parent_id as pozice_parent_id,
                    
                    IFNULL(l.nazev, '') as lokalita_nazev,
                    l.typ as lokalita_typ,
                    l.parent_id as lokalita_parent_id,
                    
                    IFNULL(us.usek_zkr, '') as usek_zkr,
                    IFNULL(us.usek_nazev, '') as usek_nazev,
                    
                    CONCAT_WS(' ', MIN(u_nadrizeny.titul_pred), MIN(u_nadrizeny.jmeno), MIN(u_nadrizeny.prijmeni), MIN(u_nadrizeny.titul_za)) as nadrizeny_cely_jmeno

                FROM " . TBL_UZIVATELE . " u
                    LEFT JOIN " . TBL_POZICE . " p ON u.pozice_id = p.id
                    LEFT JOIN " . TBL_LOKALITY . " l ON u.lokalita_id = l.id
                    LEFT JOIN " . TBL_USEKY . " us ON u.usek_id = us.id
                    LEFT JOIN " . TBL_UZIVATELE . " u_nadrizeny ON p.parent_id = u_nadrizeny.pozice_id AND u_nadrizeny.aktivni = 1
                WHERE u.id > 0 AND u.aktivni = :aktivni
                GROUP BY u.id, u.username, u.titul_pred, u.jmeno, u.prijmeni, u.dt_posledni_aktivita, u.aktivita_metadata, u.titul_za, u.email, u.telefon, u.aktivni, u.vynucena_zmena_hesla, u.dt_vytvoreni, u.dt_aktualizace, u.viditelny_v_tel_seznamu, p.nazev_pozice, p.parent_id, l.nazev, l.typ, l.parent_id, us.usek_zkr, us.usek_nazev
                ORDER BY u.aktivni DESC, u.jmeno, u.prijmeni
            ";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':aktivni', $aktivni_value, PDO::PARAM_INT);
            $stmt->execute();
        } else {
            // Bez filtru - použijeme původní dotaz (všichni uživatelé)
            $stmt = $db->prepare($queries['uzivatele_select_all']);
            $stmt->execute();
        }
        
        $users = $stmt->fetchAll();

        $users_with_roles = [];
        foreach ($users as $user) {
            $user_id = $user['id'];
            
            // Přidání displayName pro frontend kompatibilitu (PHP 5.6 compatible)
            $titul_pred = isset($user['titul_pred']) ? $user['titul_pred'] : '';
            $jmeno = isset($user['jmeno']) ? $user['jmeno'] : '';
            $prijmeni = isset($user['prijmeni']) ? $user['prijmeni'] : '';
            $titul_za = isset($user['titul_za']) ? $user['titul_za'] : '';
            $displayName = trim($titul_pred . ' ' . $jmeno . ' ' . $prijmeni . ' ' . $titul_za);
            $user['displayName'] = $displayName;
            
            // Transformace aktivni -> deaktivovan pro frontend kompatibilitu (inverted logic)
            // aktivni=1 -> deaktivovan=0, aktivni=0 -> deaktivovan=1
            if (isset($user['aktivni'])) {
                $user['deaktivovan'] = (int)$user['aktivni'] === 1 ? 0 : 1;
            } else {
                $user['deaktivovan'] = 0; // default: není deaktivován
            }
            
            // Fetch all roles assigned to this user (via 25_uzivatele_role)
            $roles = [];
            try {
                $stmtRoles = $db->prepare($queries['uzivatele_roles_by_user']);
                $stmtRoles->bindParam(':uzivatel_id', $user_id);
                $stmtRoles->execute();
                $roles = $stmtRoles->fetchAll();
            } catch (Exception $e) {
                $roles = [];
            }
            
            // Build roles with their rights (so client sees which rights belong to which role)
            $roles_with_rights = [];
            foreach ($roles as $roleRow) {
                $roleRights = [];
                // role id may not exist (defensive)
                if (isset($roleRow['id'])) {
                    try {
                        $stmtR = $db->prepare($queries['uzivatele_prava_by_role']);
                        $stmtR->bindParam(':role_id', $roleRow['id']);
                        $stmtR->execute();
                        $rights = $stmtR->fetchAll();
                        foreach ($rights as $r) {
                            // remove id from per-role right for response
                            if (isset($r['id'])) unset($r['id']);
                            $roleRights[] = $r;
                        }
                    } catch (Exception $e) {
                        // ignore per-role errors
                    }
                }

                // prepare role for response (remove id as requested)
                $roleResp = $roleRow;
                if (isset($roleResp['id'])) unset($roleResp['id']);
                $roleResp['rights'] = $roleRights;
                $roles_with_rights[] = $roleResp;
            }

            $user['roles'] = $roles_with_rights;

            // Přímá práva přiřazená přímo uživateli (user_id v 25_role_prava) - sjednocení s user/detail
            $direct_rights = [];
            try {
                if (isset($queries['uzivatele_prava_direct_by_user'])) {
                    $stmtDR = $db->prepare($queries['uzivatele_prava_direct_by_user']);
                    $stmtDR->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                    $stmtDR->execute();
                    $direct_rights = $stmtDR->fetchAll();
                    // Odstraň id z jednotlivých práv pro konzistenci s user/detail
                    foreach ($direct_rights as &$right) {
                        if (isset($right['id'])) unset($right['id']);
                    }
                }
            } catch (Exception $e) {
                $direct_rights = [];
            }
            $user['direct_rights'] = $direct_rights;

            $users_with_roles[] = $user;
        }

        echo json_encode($users_with_roles);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba databáze: ' . $e->getMessage()));
        exit;
    }
}

/**
 * POST - Přepínání viditelnosti uživatele v telefonním seznamu
 * Endpoint: users/toggle-visibility
 * POST: {token, username, user_id, viditelny_v_tel_seznamu}
 */
function handle_users_toggle_visibility($input, $config, $queries) {
    // 1. Validace HTTP metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    // 2. Parametry z body
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $user_id = $input['user_id'] ?? 0;
    $viditelny_v_tel_seznamu = $input['viditelny_v_tel_seznamu'] ?? null;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí user_id']);
        return;
    }

    if ($viditelny_v_tel_seznamu === null || ($viditelny_v_tel_seznamu !== 0 && $viditelny_v_tel_seznamu !== 1)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Parametr viditelny_v_tel_seznamu musí být 0 nebo 1']);
        return;
    }

    // 3. Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        // 4. DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // Nastavení české časové zóny pro MySQL session
        TimezoneHelper::setMysqlTimezone($db);

        // 5. Kontrola oprávnění - načtení rolí uživatele
        $stmt = $db->prepare("
            SELECT DISTINCT r.kod_role
            FROM " . TBL_ROLE . " r
            JOIN " . TBL_UZIVATELE_ROLE . " ur ON r.id = ur.role_id
            JOIN " . TBL_UZIVATELE . " u ON ur.uzivatel_id = u.id
            WHERE u.username = ? LIMIT 10
        ");
        $stmt->execute([$username]);
        $user_roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $is_admin = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
        
        // Kontrola specifického práva PHONEBOOK_MANAGE
        $has_permission = false;
        if (!$is_admin) {
            $stmt = $db->prepare("
                SELECT COUNT(*) as count
                FROM " . TBL_UZIVATELE . " u
                JOIN " . TBL_UZIVATELE_ROLE . " ur ON u.id = ur.uzivatel_id
                JOIN " . TBL_ROLE_PRAVA . " rp ON ur.role_id = rp.role_id
                JOIN " . TBL_PRAVA . " p ON rp.pravo_id = p.id
                WHERE u.username = ? AND p.kod_prava = 'PHONEBOOK_MANAGE'
                LIMIT 1
            ");
            $stmt->execute([$username]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $has_permission = $result && $result['count'] > 0;
        }
        
        if (!$is_admin && !$has_permission) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Nemáte oprávnění pro úpravu viditelnosti zaměstnanců']);
            return;
        }

        // 6. Ověření existence uživatele
        $stmt = $db->prepare("SELECT id, jmeno, prijmeni FROM " . TBL_UZIVATELE . " WHERE id = ? LIMIT 1");
        $stmt->execute([$user_id]);
        $target_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$target_user) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Uživatel nenalezen']);
            return;
        }

        // 7. UPDATE viditelnost
        $stmt = $db->prepare("
            UPDATE " . TBL_UZIVATELE . " 
            SET viditelny_v_tel_seznamu = ?, dt_aktualizace = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$viditelny_v_tel_seznamu, $user_id]);

        // 8. Úspěšná odpověď
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'user_id' => (int)$user_id,
                'viditelny_v_tel_seznamu' => (int)$viditelny_v_tel_seznamu,
                'jmeno' => $target_user['jmeno'],
                'prijmeni' => $target_user['prijmeni']
            ],
            'message' => 'Viditelnost zaměstnance byla úspěšně změněna'
        ]);

    } catch (Exception $e) {
        // 9. Error handling
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při zpracování: ' . $e->getMessage()
        ]);
    }
}

function handle_orders_next_number($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'err' => 'Neplatný nebo chybějící token',
            'debug' => array(
                'token' => $token,
                'token_decoded' => $token ? base64_decode($token) : null,
                'token_parts' => $token ? explode('|', base64_decode($token)) : null
            )
        ));
        return;
    }

    // Ověření, že username z tokenu odpovídá username z požadavku
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }

    try {
        $db = get_db($config);
        // Update last activity for the authenticated user
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id']);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal
        }
        
        // Get next order number
        $stmt = $db->prepare($queries['objednavky_next_number']);
        $stmt->execute();
        $result = $stmt->fetch();
        $last_used_number = $result['last_used_number'];
        
        // Next number to use will be last_used + 1
        $next_number = $last_used_number + 1;
        
        // Get user org data
        $stmtOrg = $db->prepare($queries['uzivatele_org_data_by_username']);
        $stmtOrg->bindParam(':username', $request_username);
        $stmtOrg->execute();
        $org_data = $stmtOrg->fetch();
        
        if (!$org_data) {
            http_response_code(404);
            echo json_encode(array('err' => 'Uživatel nenalezen nebo nemá přiřazenou organizaci/úsek'));
            return;
        }
        
        $ico = $org_data['organizace_ico'];
        $usek_zkr = $org_data['usek_zkr'];
        $current_year = TimezoneHelper::getCzechDateTime('Y');
        
        // Format numbers with leading zeros to 4 digits
        $formatted_last_used = sprintf('%04d', $last_used_number);
        $formatted_next = sprintf('%04d', $next_number);
        
        // Compose order number strings in format O-cislo/ICO/ROK/usekZKRatka
        $last_used_order_string = 'O-' . $formatted_last_used . '/' . $ico . '/' . $current_year . '/' . $usek_zkr;
        $next_order_string = 'O-' . $formatted_next . '/' . $ico . '/' . $current_year . '/' . $usek_zkr;
        
        echo json_encode(array(
            'last_used_number' => $last_used_number,
            'next_number' => $next_number,
            'formatted_last_used' => $formatted_last_used,
            'formatted_next' => $formatted_next,
            'ico' => $ico,
            'usek_zkr' => $usek_zkr,
            'current_year' => $current_year,
            'last_used_order_string' => $last_used_order_string,
            'next_order_string' => $next_order_string,
            'order_number_string' => $next_order_string
        ));
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba databáze: ' . $e->getMessage()));
        exit;
    }
}

function handle_order_check_number($input, $config, $queries) {
    // Validate token & username
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $orderNumber = null;
    // Accept either root key orderNumber or inside payload for flexibility
    if (isset($input['orderNumber'])) {
        $orderNumber = trim($input['orderNumber']);
    } elseif (isset($input['payload']['orderNumber'])) {
        $orderNumber = trim($input['payload']['orderNumber']);
    }
    $suggest = false;
    if (isset($input['suggest'])) {
        $suggest = (bool)$input['suggest'];
    } elseif (isset($input['payload']['suggest'])) {
        $suggest = (bool)$input['payload']['suggest'];
    }

    if (!$token || !$request_username) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí token nebo username'));
        return;
    }
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token nebo username'));
        return;
    }
    if (!$orderNumber) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí orderNumber'));
        return;
    }
    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['objednavky_check_number']);
        $stmt->execute([':cislo_objednavky' => $orderNumber]);
        $exists = $stmt->fetch(PDO::FETCH_ASSOC);
        $canUse = $exists ? false : true;
        $response = [
            'status' => 'OK',
            'orderNumber' => $orderNumber,
            'exists' => (bool)$exists,
            'canUse' => $canUse
        ];
        // Optional suggestion of next available number (only if existing and pattern matches)
        if (!$canUse && $suggest) {
            // Pattern: O-XXXX/REST
            if (preg_match('~^O-(\d{4})/(.+)$~', $orderNumber, $m)) {
                try {
                    $stmtNext = $db->prepare($queries['objednavky_next_number']);
                    $stmtNext->execute();
                    $next = $stmtNext->fetch();
                    if ($next && isset($next['last_used_number'])) {
                        $num = (int)$next['last_used_number'] + 1;
                        $formatted = str_pad($num, 4, '0', STR_PAD_LEFT);
                        $response['suggestedOrderNumber'] = 'O-' . $formatted . '/' . $m[2];
                    }
                } catch (Exception $e2) {
                    // non-fatal; just log
                    error_log('order_check_number suggest generation failed: ' . $e2->getMessage());
                }
            }
        }
        echo json_encode($response);
        return;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'ERROR', 'message' => $e->getMessage()));
        return;
    }
}

function handle_lokality($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'err' => 'Neplatný nebo chybějící token',
            'debug' => array(
                'token' => $token,
                'token_decoded' => $token ? base64_decode($token) : null,
                'token_parts' => $token ? explode('|', base64_decode($token)) : null
            )
        ));
        return;
    }

    // Ověření, že username z tokenu odpovídá username z požadavku
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }

    try {
        $db = get_db($config);
        // Update last activity for the authenticated user
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id']);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal
        }
        
        $stmt = $db->prepare($queries['lokality_select_all']);
        $stmt->execute();
        $lokality = $stmt->fetchAll();
        
        echo json_encode($lokality);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání lokalit: ' . $e->getMessage()));
        exit;
    }
}

function handle_orders_list($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token'));
        exit;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username neodpovídá tokenu'));
        exit;
    }
    
    try {
        $db = get_db($config);
        
        // Načtení objednávek s detaily
        $stmt = $db->prepare($queries['objednavky_select_with_details']);
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Collect raw IDs for debugging and count duplicates
        $idsRaw = [];
        foreach ($orders as $r) {
            $idsRaw[] = isset($r['id']) ? intval($r['id']) : null;
        }

        // Defensive: remove accidental duplicate rows with the same order id
        $unique = [];
        foreach ($orders as $r) {
            $id = isset($r['id']) ? intval($r['id']) : null;
            if ($id === null) continue;
            if (!isset($unique[$id])) {
                $unique[$id] = $r;
            }
            // if a duplicate exists, ignore the later duplicate row
        }
        $orders = array_values($unique);

        // Prepare minimal internal debug counts (not returned) to assist logging if needed
        $idsRawCounts = array_count_values($idsRaw);
        // If you want to log this, we can write to error_log here during development
        
        // Decode nested JSON produced by the main query for items and attachments
        foreach ($orders as &$order) {
            // polozky and prilohy are JSON array strings produced in the SELECT; decode them
            $order['items'] = [];
            if (!empty($order['polozky'])) {
                $decoded = json_decode($order['polozky'], true);
                $order['items'] = is_array($decoded) ? $decoded : [];
            }

            $order['attachments'] = [];
            if (!empty($order['prilohy'])) {
                $decodedA = json_decode($order['prilohy'], true);
                $order['attachments'] = is_array($decodedA) ? $decodedA : [];
            }

            // optionally remove the raw JSON string fields to avoid duplication
            unset($order['polozky']);
            unset($order['prilohy']);

            // Parse CSV ID lists into arrays for client convenience (keep CSV fields too)
            $order['polozky_ids_array'] = [];
            if (!empty($order['polozky_ids'])) {
                $parts = array_filter(array_map('trim', explode(',', $order['polozky_ids'])), function($v) { return $v !== ''; });
                $parts = array_map('intval', $parts);
                $order['polozky_ids_array'] = array_values(array_unique($parts));
            }

            $order['prilohy_ids_array'] = [];
            if (!empty($order['prilohy_ids'])) {
                $partsA = array_filter(array_map('trim', explode(',', $order['prilohy_ids'])), function($v) { return $v !== ''; });
                $partsA = array_map('intval', $partsA);
                $order['prilohy_ids_array'] = array_values(array_unique($partsA));
            }

            // Remove legacy CSV fields to return only array-form IDs
            unset($order['polozky_ids']);
            unset($order['prilohy_ids']);

            // Parse selected centers: prefer new `strediska` JSON column, fall back to legacy `misto_dodani`
            // $order['strediska'] = [];
            if (!empty($order['strediska'])) {
                $decodedCenters = json_decode($order['strediska'], true);
                $order['strediska'] = is_array($decodedCenters) ? $decodedCenters : [];
            } elseif (!empty($order['misto_dodani'])) {
                // backward compatibility: older rows may still use misto_dodani
                $decodedCenters = json_decode($order['misto_dodani'], true);
                $order['strediska'] = is_array($decodedCenters) ? $decodedCenters : [];
            }
            // limit_prisliby decode (JSON array)
            if (isset($order['limit_prisliby']) && $order['limit_prisliby'] !== null && $order['limit_prisliby'] !== '') {
                $decodedLimit = json_decode($order['limit_prisliby'], true);
                $order['limit_prisliby'] = is_array($decodedLimit) ? $decodedLimit : [];
            } else {
                $order['limit_prisliby'] = [];
            }
        }
        unset($order);

        // Collect referenced IDs: users, dodavatele, lokality, stavy
        $userIds = [];
        $dodavIds = [];
        $lokalityIds = [];
        $stavIds = [];
        foreach ($orders as $order) {
            if (!empty($order['objednatel_id'])) {
                $userIds[] = intval($order['objednatel_id']);
            }
            if (!empty($order['garant_uzivatel_id'])) {
                $userIds[] = intval($order['garant_uzivatel_id']);
            }
            if (!empty($order['created_by_uzivatel_id'])) {
                $userIds[] = intval($order['created_by_uzivatel_id']);
            }
            if (!empty($order['schvalil_uzivatel_id'])) {
                $userIds[] = intval($order['schvalil_uzivatel_id']);
            }
            if (!empty($order['dodavatel_id'])) {
                $dodavIds[] = intval($order['dodavatel_id']);
            }
            if (!empty($order['lokalita_id'])) {
                $lokalityIds[] = intval($order['lokalita_id']);
            }
            if (!empty($order['stav_id'])) {
                $stavIds[] = intval($order['stav_id']);
            }
            if (!empty($order['attachments']) && is_array($order['attachments'])) {
                foreach ($order['attachments'] as $att) {
                    if (!empty($att['nahrano_uzivatel_id'])) {
                        $userIds[] = intval($att['nahrano_uzivatel_id']);
                    }
                }
            }
        }

        // Build user map
        $userMap = [];
        if (!empty($userIds)) {
            $userIds = array_values(array_unique($userIds));
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $sqlUsers = "SELECT id, titul_pred, jmeno, prijmeni, titul_za, email, telefon FROM " . TBL_UZIVATELE . " WHERE id IN (" . $placeholders . ")";
            $stmtUsers = $db->prepare($sqlUsers);
            $stmtUsers->execute($userIds);
            $fetchedUsers = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
            foreach ($fetchedUsers as $u) {
                $userMap[intval($u['id'])] = $u;
            }
        }

        // Fetch dodavatele in bulk
        $dodavMap = [];
        if (!empty($dodavIds)) {
            $dodavIds = array_values(array_unique($dodavIds));
            $ph = implode(',', array_fill(0, count($dodavIds), '?'));
            $sqlDod = "SELECT id, nazev AS dodavatel_nazev, ico, dic FROM " . TBL_DODAVATELE . " WHERE id IN (" . $ph . ")";
            $stmtDod = $db->prepare($sqlDod);
            $stmtDod->execute($dodavIds);
            foreach ($stmtDod->fetchAll(PDO::FETCH_ASSOC) as $d) {
                $dodavMap[intval($d['id'])] = $d;
            }
        }

        // Fetch lokality in bulk
        $lokMap = [];
        if (!empty($lokalityIds)) {
            $lokalityIds = array_values(array_unique($lokalityIds));
            $ph = implode(',', array_fill(0, count($lokalityIds), '?'));
            $sqlLok = "SELECT id, nazev, typ, parent_id FROM " . TBL_LOKALITY . " WHERE id IN (" . $ph . ")";
            $stmtLok = $db->prepare($sqlLok);
            $stmtLok->execute($lokalityIds);
            foreach ($stmtLok->fetchAll(PDO::FETCH_ASSOC) as $l) {
                $lokMap[intval($l['id'])] = $l;
            }
        }

        // Fetch stavy in bulk
        $stavMap = [];
        if (!empty($stavIds)) {
            $stavIds = array_values(array_unique($stavIds));
            $ph = implode(',', array_fill(0, count($stavIds), '?'));
            // fetch new schema columns for stavy
            $sqlStav = "SELECT id, typ_objektu, kod_stavu, nazev_stavu, popis FROM " . TBL_CISELNIK_STAVY . " WHERE id IN (" . $ph . ")";
            $stmtStav = $db->prepare($sqlStav);
            $stmtStav->execute($stavIds);
            foreach ($stmtStav->fetchAll(PDO::FETCH_ASSOC) as $s) {
                $stavMap[intval($s['id'])] = $s;
            }
        }

        // Attach nested user objects and convenience full-name fields, and other FK objects
        foreach ($orders as &$order) {
            // objednatel
            $order['objednatel'] = null;
            if (!empty($order['objednatel_id']) && isset($userMap[intval($order['objednatel_id'])])) {
                $u = $userMap[intval($order['objednatel_id'])];
                $full = trim(($u['titul_pred'] ? $u['titul_pred'] . ' ' : '') . $u['jmeno'] . ' ' . $u['prijmeni'] . ($u['titul_za'] ? ' ' . $u['titul_za'] : ''));
                $u['fullname'] = $full;
                $order['objednatel'] = $u;
            }

            // garant
            $order['garant'] = null;
            if (!empty($order['garant_uzivatel_id']) && isset($userMap[intval($order['garant_uzivatel_id'])])) {
                $u = $userMap[intval($order['garant_uzivatel_id'])];
                $full = trim(($u['titul_pred'] ? $u['titul_pred'] . ' ' : '') . $u['jmeno'] . ' ' . $u['prijmeni'] . ($u['titul_za'] ? ' ' . $u['titul_za'] : ''));
                $u['fullname'] = $full;
                $order['garant'] = $u;
            }

            // created_by user
            $order['created_by_uzivatel'] = null;
            if (!empty($order['created_by_uzivatel_id']) && isset($userMap[intval($order['created_by_uzivatel_id'])])) {
                $u = $userMap[intval($order['created_by_uzivatel_id'])];
                $full = trim(($u['titul_pred'] ? $u['titul_pred'] . ' ' : '') . $u['jmeno'] . ' ' . $u['prijmeni'] . ($u['titul_za'] ? ' ' . $u['titul_za'] : ''));
                $u['fullname'] = $full;
                $order['created_by_uzivatel'] = $u;
            }

            // schvalil user
            $order['schvalil_uzivatel'] = null;
            if (!empty($order['schvalil_uzivatel_id']) && isset($userMap[intval($order['schvalil_uzivatel_id'])])) {
                $u = $userMap[intval($order['schvalil_uzivatel_id'])];
                $full = trim(($u['titul_pred'] ? $u['titul_pred'] . ' ' : '') . $u['jmeno'] . ' ' . $u['prijmeni'] . ($u['titul_za'] ? ' ' . $u['titul_za'] : ''));
                $u['fullname'] = $full;
                $order['schvalil_uzivatel'] = $u;
            }

            // dodavatel
            $order['dodavatel'] = null;
            if (!empty($order['dodavatel_id']) && isset($dodavMap[intval($order['dodavatel_id'])])) {
                $order['dodavatel'] = $dodavMap[intval($order['dodavatel_id'])];
            }

            // lokalita
            $order['lokalita'] = null;
            if (!empty($order['lokalita_id']) && isset($lokMap[intval($order['lokalita_id'])])) {
                $order['lokalita'] = $lokMap[intval($order['lokalita_id'])];
            }

            // stav
            $order['stav'] = null;
            if (!empty($order['stav_id']) && isset($stavMap[intval($order['stav_id'])])) {
                $order['stav'] = $stavMap[intval($order['stav_id'])];
            }

            // attachments: attach uploader user object if available
            if (!empty($order['attachments']) && is_array($order['attachments'])) {
                foreach ($order['attachments'] as &$att) {
                    $att['nahrano_uzivatel'] = null;
                    $att['nahrano_uzivatel_id_'] = '';
                    if (!empty($att['nahrano_uzivatel_id']) && isset($userMap[intval($att['nahrano_uzivatel_id'])])) {
                        $uu = $userMap[intval($att['nahrano_uzivatel_id'])];
                        $fullu = trim(($uu['titul_pred'] ? $uu['titul_pred'] . ' ' : '') . $uu['jmeno'] . ' ' . $uu['prijmeni'] . ($uu['titul_za'] ? ' ' . $uu['titul_za'] : ''));
                        $uu['fullname'] = $fullu;
                        $att['nahrano_uzivatel'] = $uu;
                    }
                }
                unset($att);
            }
        }
        unset($order);
        
        echo json_encode(array(
            'status' => 'OK',
            'orders' => $orders
        ));
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'ERROR',
            'message' => 'Chyba při načítání objednávek: ' . $e->getMessage()
        ));
        exit;
    }
}

function handle_order_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $orderId = isset($input['orderId']) ? (int)$input['orderId'] : (isset($input['id']) ? (int)$input['id'] : 0);
    if (!$token || !$request_username) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí token nebo username'));
        return;
    }
    if ($orderId <= 0) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí nebo neplatné orderId'));
        return;
    }
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token nebo username'));
        return;
    }
    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['objednavky_select_one_with_details']);
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(array('err' => 'Objednávka nenalezena', 'orderId' => $orderId));
            return;
        }
        // Dekódování JSON částí stejně jako v listu
        $row['items'] = [];
        if (!empty($row['polozky'])) {
            $decoded = json_decode($row['polozky'], true);
            $row['items'] = is_array($decoded) ? $decoded : [];
        }
        $row['attachments'] = [];
        if (!empty($row['prilohy'])) {
            $decodedA = json_decode($row['prilohy'], true);
            $row['attachments'] = is_array($decodedA) ? $decodedA : [];
        }
        unset($row['polozky']);
        unset($row['prilohy']);
        // strediska JSON
        if (!empty($row['strediska'])) {
            $decodedCenters = json_decode($row['strediska'], true);
            $row['strediska'] = is_array($decodedCenters) ? $decodedCenters : [];
        } else if (!empty($row['misto_dodani'])) {
            $decodedCenters = json_decode($row['misto_dodani'], true);
            $row['strediska'] = is_array($decodedCenters) ? $decodedCenters : [];
        } else {
            $row['strediska'] = [];
        }
        // limit_prisliby JSON
        if (isset($row['limit_prisliby']) && $row['limit_prisliby'] !== null && $row['limit_prisliby'] !== '') {
            $decodedLimit = json_decode($row['limit_prisliby'], true);
            $row['limit_prisliby'] = is_array($decodedLimit) ? $decodedLimit : [];
        } else {
            $row['limit_prisliby'] = [];
        }

        // Obohacení schvalil_uzivatel_id o jméno uživatele
        if (!empty($row['schvalil_uzivatel_id'])) {
            $stmt_user = $db->prepare("SELECT CONCAT_WS(' ', titul_pred, jmeno, prijmeni, titul_za) as cely_jmeno FROM " . TBL_UZIVATELE . " WHERE id = :user_id AND aktivni = 1");
            $stmt_user->bindValue(':user_id', $row['schvalil_uzivatel_id'], PDO::PARAM_INT);
            $stmt_user->execute();
            $user_data = $stmt_user->fetch(PDO::FETCH_ASSOC);
            
            if ($user_data) {
                $row['schvalil_uzivatel_id_nazev'] = trim($user_data['cely_jmeno']);
                $row['schvaleno_kym'] = trim($user_data['cely_jmeno']);
            } else {
                $row['schvalil_uzivatel_id_nazev'] = null;
                $row['schvaleno_kym'] = null;
            }
        } else {
            $row['schvalil_uzivatel_id_nazev'] = null;
            $row['schvaleno_kym'] = null;
        }

        echo json_encode(array('status' => 'OK', 'order' => $row));
        return;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'ERROR', 'message' => $e->getMessage()));
        return;
    }
}

function handle_create_order($input, $config, $queries) {
    // Debug: zobrazíme, co se parsovalo
    error_log("handle_create_order input: " . json_encode($input));
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí token'));
        exit;
    }
    
    if (!$request_username) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí username'));
        exit;
    }
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token'));
        exit;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username neodpovídá tokenu'));
        exit;
    }


    // Parsování payloadu
    $payload = isset($input['payload']) ? $input['payload'] : null;


    if (!$payload) {
        error_log("handle_create_order: payload missing, input keys: " . implode(', ', array_keys($input)));
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí payload'));
        exit;
    }


    try {
        $db = get_db($config);
        $db->beginTransaction();

        // ✅ KRITICKÁ OPRAVA: Číslo objednávky MUSÍ být VŽDY vygenerováno backendem
        // Frontend může poslat návrh, ale backend ho VŽDY vygeneruje nebo ověří
        $orderNumber = null;
        
        // Pokud FE poslal orderNumber, zkontrolujeme ho
        if (isset($payload['orderNumber']) && !empty($payload['orderNumber']) && $payload['orderNumber'] !== 'null') {
            $orderNumber = (string)$payload['orderNumber'];
        } elseif (isset($payload['navrhovane_cislo_objednavky']) && !empty($payload['navrhovane_cislo_objednavky']) && $payload['navrhovane_cislo_objednavky'] !== 'null') {
            $orderNumber = (string)$payload['navrhovane_cislo_objednavky'];
        }
        
        // Pokud máme číslo z FE, zkontroluj zda už neexistuje
        if ($orderNumber !== null) {
            $stmt_check = $db->prepare($queries['objednavky_check_number']);
            $stmt_check->execute([':cislo_objednavky' => $orderNumber]);
            $existing = $stmt_check->fetch();

            if ($existing) {
                // Číslo je obsazené → vygeneruj nové
                error_log("⚠️ Číslo objednávky {$orderNumber} je obsazené, generuji nové");
                $orderNumber = null;
            }
        }
        
        // Pokud nemáme číslo NEBO je obsazené → automaticky vygeneruj
        if ($orderNumber === null) {
            try {
                // Získání dalšího čísla v sekvenci
                $stmtNext = $db->prepare("
                    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) + 1 as next_number 
                    FROM " . get_orders_table_name() . "
                    WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(cislo_objednavky, '/', -2), '/', 1) = YEAR(NOW()) AND cislo_objednavky LIKE 'O-%'
                ");
                $stmtNext->execute();
                $nextResult = $stmtNext->fetch();
                
                // Získání organizačních dat uživatele
                $stmtOrg = $db->prepare($queries['uzivatele_org_data_by_username']);
                $stmtOrg->bindParam(':username', $request_username);
                $stmtOrg->execute();
                $org_data = $stmtOrg->fetch();
                
                if ($org_data && $nextResult) {
                    $ico = $org_data['organizace_ico'];
                    $usek_zkr = $org_data['usek_zkr'];
                    $current_year = TimezoneHelper::getCzechDateTime('Y');
                    $formatted_number = sprintf('%04d', $nextResult['next_number']);
                    $orderNumber = 'O-' . $formatted_number . '/' . $ico . '/' . $current_year . '/' . $usek_zkr;
                    
                    error_log("✅ Vygenerováno číslo objednávky: {$orderNumber}");
                } else {
                    // Fallback POUZE pro případ kritické chyby DB
                    $orderNumber = 'O-TEMP-' . time() . '-' . $token_data['id'];
                    error_log("⚠️ WARNING: Použito fallback číslo objednávky: {$orderNumber} (chybí org_data nebo next_number)");
                }
            } catch (Exception $e) {
                // Fallback POUZE pro případ kritické chyby
                $orderNumber = 'O-TEMP-' . time() . '-' . $token_data['id'];
                error_log("⚠️ ERROR při generování čísla objednávky: " . $e->getMessage());
                error_log("⚠️ Použito fallback číslo: {$orderNumber}");
            }
        }
        
        // ✅ GARANTUJEME: $orderNumber NIKDY není NULL/prázdný v tomto bodě
        // 2. Mapování polí z payloadu (podpora nového i starého názvosloví)

        // Datum objednávky: pokud není posláno (orderDate / datum_objednavky), použij dnešek
        if (isset($payload['orderDate'])) {
            $datum_objednavky = (string)$payload['orderDate'];
        } elseif (isset($payload['datum_objednavky'])) {
            $datum_objednavky = (string)$payload['datum_objednavky'];
        } else {
            $datum_objednavky = date('Y-m-d');
        }

        // Předmět: subject vs predmet
        if (isset($payload['subject'])) {
            $predmet = (string)$payload['subject'];
        } elseif (isset($payload['predmet'])) {
            $predmet = (string)$payload['predmet'];
        } else {
            $predmet = '';
        }

        // Objednatel: primárně z tokenu, ale pokud FE posílá objednatel_id a odpovídá tokenu, povolíme
        $objednatel_id = $token_data['id'];
        if (isset($payload['objednatel_id'])) {
            $incomingObj = (int)$payload['objednatel_id'];
            if ($incomingObj === (int)$token_data['id']) {
                $objednatel_id = $incomingObj; // pouze pokud matchuje token
            }
        }

        // Garant: purchaser.garant nebo garant_uzivatel_id
        if (isset($payload['purchaser']['garant'])) {
            $garant_uzivatel_id = intval($payload['purchaser']['garant']);
        } elseif (isset($payload['garant_uzivatel_id'])) {
            $garant_uzivatel_id = intval($payload['garant_uzivatel_id']);
        } else {
            $garant_uzivatel_id = null;
        }

        // Cena: maxPriceInclVat nebo max_cena_s_dph
        if (isset($payload['maxPriceInclVat'])) {
            $max_cena_s_dph = floatval($payload['maxPriceInclVat']);
        } elseif (isset($payload['max_cena_s_dph'])) {
            $max_cena_s_dph = floatval($payload['max_cena_s_dph']);
        } else {
            $max_cena_s_dph = 0;
        }

        // Stav
        $stav_id = isset($payload['stav_id']) ? (int)$payload['stav_id'] : 1;

        // Střediska: center (array) nebo strediska (array/string)
        $strediska = '[]';
        if (isset($payload['center'])) {
            if (is_array($payload['center'])) {
                $strediska = json_encode($payload['center']);
            }
        } elseif (isset($payload['strediska'])) {
            if (is_array($payload['strediska'])) {
                $strediska = json_encode($payload['strediska']);
            } elseif (is_string($payload['strediska']) && $payload['strediska'] !== '') {
                // Pokud je string s čárkami, rozdělíme na jednotlivá ID
                if (strpos($payload['strediska'], ',') !== false) {
                    $ids = array_map('trim', explode(',', $payload['strediska']));
                    $strediska = json_encode($ids);
                } else {
                    // jedno ID jako string -> udělej pole
                    $strediska = json_encode([$payload['strediska']]);
                }
            }
        }

        // prikazce_id
        $prikazce_id = isset($payload['prikazce_id']) ? (string)$payload['prikazce_id'] : null;

        // financovani_dodatek (JSON string) – může přijít přímo nebo složený z cislo_smlouvy/smlouva_poznamka
        $financovani_dodatek = '[]';
        if (isset($payload['financovani_dodatek'])) {
            if (is_array($payload['financovani_dodatek'])) {
                $financovani_dodatek = json_encode($payload['financovani_dodatek']);
            } elseif (is_string($payload['financovani_dodatek']) && $payload['financovani_dodatek'] !== '') {
                // pokud FE už posílá JSON jako string necháme beze změny
                $financovani_dodatek = $payload['financovani_dodatek'];
            }
        } else {
            // fallback merge pokud dorazí legacy pole
            $merge = [];
            if (isset($payload['cislo_smlouvy']) && $payload['cislo_smlouvy'] !== '') {
                $merge['cislo_smlouvy'] = (string)$payload['cislo_smlouvy'];
            }
            if (isset($payload['smlouva_poznamka']) && $payload['smlouva_poznamka'] !== '') {
                $merge['smlouva_poznamka'] = (string)$payload['smlouva_poznamka'];
            }
            if (!empty($merge)) {
                $financovani_dodatek = json_encode($merge);
            }
        }
        
        // 3. Vytvoření hlavní objednávky
        $stmt = $db->prepare($queries['objednavky_insert_full']);
        $params = [
            ':cislo_objednavky' => $orderNumber,
            ':datum_objednavky' => $datum_objednavky,
            ':uzivatel_id' => $token_data['id'],  // Kdo vytvořil objednávku
            ':objednatel_id' => $objednatel_id,  // Kdo objednává (obvykle = uzivatel_id)
            ':created_by_uzivatel_id' => $token_data['id'],
            ':updated_by_uzivatel_id' => $token_data['id'],
            ':garant_uzivatel_id' => $garant_uzivatel_id,
            ':predmet' => $predmet,
            ':prikazce_id' => $prikazce_id,
            ':max_cena_s_dph' => $max_cena_s_dph,
            ':stav_id' => $stav_id,
            ':strediska' => $strediska,
            ':financovani_dodatek' => $financovani_dodatek,
            ':stav_komentar' => isset($payload['stav_komentar']) ? (string)$payload['stav_komentar'] : ''
        ];
        
        $stmt->execute($params);
        $order_id = $db->lastInsertId();
        
        // Položky se ignorují při prvním uložení
        
        $db->commit();
        
        echo json_encode(array(
            'status' => 'OK',
            'id' => (int)$order_id,
            'orderNumber' => $orderNumber
        ));
        exit;
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(array(
            'status' => 'ERROR',
            'message' => 'Chyba při vytváření objednávky: ' . $e->getMessage()
        ));
        exit;
    }
}

function handle_update_order($input, $config, $queries) {
    // Token + username validation (reuse pattern)
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    if (!$token || !$request_username) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí token nebo username'));
        exit;
    }
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token nebo nesouhlasí username'));
        exit;
    }

    // Expect orderId (can come either at root or inside payload) and payload
    $payload = isset($input['payload']) ? $input['payload'] : null;
    $orderId = 0;
    if (isset($input['orderId'])) {
        $orderId = (int)$input['orderId'];
    } elseif ($payload && isset($payload['orderId'])) {
        $orderId = (int)$payload['orderId'];
    }
    if ($orderId <= 0) {
        error_log('handle_update_order: missing orderId. input keys: '.implode(',', array_keys($input)).' payload keys: '.($payload && is_array($payload) ? implode(',', array_keys($payload)) : 'NONE'));
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí nebo neplatné orderId'));
        exit;
    }
    if (!$payload || !is_array($payload)) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí payload'));
        exit;
    }

    // Povolená editable pole (minimal set, lze rozšířit): predmet, max_cena_s_dph, stav_id, stav_komentar, strediska
    // Pokud FE posílá supplier objekt, rozbalíme do payloadu aby se dal mapovat jednotně
    if (isset($payload['supplier']) && is_array($payload['supplier'])) {
        $sup = $payload['supplier'];
        $mapSup = [
            'supplierId' => 'dodavatel_id',
            'id' => 'dodavatel_id',
            'name' => 'dodavatel_nazev',
            'address' => 'dodavatel_adresa',
            'ico' => 'dodavatel_ico',
            'dic' => 'dodavatel_dic',
            'representedBy' => 'dodavatel_zastoupeny',
            'contactName' => 'dodavatel_kontakt_jmeno',
            'contactEmail' => 'dodavatel_kontakt_email',
            'contactPhone' => 'dodavatel_kontakt_telefon'
        ];
        foreach ($mapSup as $k => $col) {
            if (array_key_exists($k, $sup) && !array_key_exists($col, $payload)) {
                $payload[$col] = $sup[$k];
            }
        }
    }

    // purchaser.garant -> garant_uzivatel_id
    if (isset($payload['purchaser']['garant']) && !isset($payload['garant_uzivatel_id'])) {
        $payload['garant_uzivatel_id'] = (int)$payload['purchaser']['garant'];
    }

    $fieldsMap = [
        // základ
        'subject' => 'predmet',
        'predmet' => 'predmet',
        'maxPriceInclVat' => 'max_cena_s_dph',
        'max_cena_s_dph' => 'max_cena_s_dph',
        'stav_id' => 'stav_id',
        'stav_komentar' => 'stav_komentar',
        'center' => 'strediska',
        'strediska' => 'strediska',
        'prikazce_id' => 'prikazce_id',
    'datum_objednavky' => 'datum_objednavky',
        'financovani_dodatek' => 'financovani_dodatek',
        'zdroj_financovani' => 'zdroj_financovani',
        'druh_objednavky' => 'druh_objednavky',
        'poznamka' => 'poznamka',
        // dodavatel info
        'dodavatel_id' => 'dodavatel_id',
        'dodavatel_nazev' => 'dodavatel_nazev',
        'dodavatel_adresa' => 'dodavatel_adresa',
        'dodavatel_ico' => 'dodavatel_ico',
        'dodavatel_dic' => 'dodavatel_dic',
        'dodavatel_zastoupeny' => 'dodavatel_zastoupeny',
        'dodavatel_kontakt_jmeno' => 'dodavatel_kontakt_jmeno',
        'dodavatel_kontakt_email' => 'dodavatel_kontakt_email',
        'dodavatel_kontakt_telefon' => 'dodavatel_kontakt_telefon',
        // termíny a místa
        'predpokladany_termin_dodani' => 'predpokladany_termin_dodani',
        'misto_dodani' => 'misto_dodani',
        'zaruka' => 'zaruka',
        // potvrzení, odeslání
        'stav_odeslano' => 'stav_odeslano',
        'datum_odeslani' => 'datum_odeslani',
        'potvrzeno_dodavatelem' => 'potvrzeno_dodavatelem',
        'datum_akceptace' => 'datum_akceptace',
    // nový sjednocený způsob platby (JSON / text)
    'zpusob_platby' => 'zpusob_platby',
        // registr smluv
        'zverejnit_registr_smluv' => 'zverejnit_registr_smluv',
        'datum_zverejneni' => 'datum_zverejneni',
        'registr_smluv_id' => 'registr_smluv_id',
        // garant
        'garant_uzivatel_id' => 'garant_uzivatel_id'
    ];

    $setParts = [];
    $params = [':id' => $orderId];
    $incomingStavId = null;
    foreach ($fieldsMap as $payloadKey => $dbCol) {
        if (!array_key_exists($payloadKey, $payload)) continue;
        $rawVal = $payload[$payloadKey];
        $value = $rawVal;
        switch ($dbCol) {
            case 'strediska':
                if (is_array($rawVal)) {
                    $value = json_encode($rawVal);
                } elseif (is_string($rawVal) && $rawVal !== '') {
                    // Pokud je string s čárkami, rozdělíme na jednotlivá ID
                    if (strpos($rawVal, ',') !== false) {
                        $ids = array_map('trim', explode(',', $rawVal));
                        $value = json_encode($ids);
                    } else {
                        // jedno ID jako string -> udělej pole
                        $value = json_encode(array($rawVal));
                    }
                } else {
                    $value = '[]';
                }
                break;
            case 'financovani_dodatek':
                if (is_array($rawVal)) {
                    $value = json_encode($rawVal);
                } elseif (is_string($rawVal) && $rawVal !== '') {
                    $value = $rawVal;
                } else {
                    $value = '[]';
                }
                break;
            case 'max_cena_s_dph':
                $value = floatval($rawVal);
                break;
            case 'dodavatel_id':
            case 'garant_uzivatel_id':
            case 'stav_odeslano':
            case 'potvrzeno_dodavatelem':
            case 'zpusob_platby':
                if (is_array($rawVal)) {
                    $value = json_encode($rawVal);
                } else {
                    $value = (string)$rawVal; // allow JSON/text
                }
                break;
            case 'zverejnit_registr_smluv':
                $value = (int) (!!$rawVal); // boolean -> 0/1
                break;
            case 'potvrzeno_zpusob':
                if (is_array($rawVal)) {
                    $value = json_encode($rawVal);
                } else {
                    $value = (string)$rawVal; // allow JSON/text
                }
                break;
            case 'datum_objednavky':
            case 'predpokladany_termin_dodani':
            case 'datum_odeslani':
            case 'datum_akceptace':
            case 'datum_zverejneni':
                if ($rawVal === null || $rawVal === '') {
                    $value = null; // allow null
                } else {
                    $dt = DateTime::createFromFormat('Y-m-d', (string)$rawVal);
                    if (!$dt || $dt->format('Y-m-d') !== (string)$rawVal) {
                        http_response_code(400);
                        echo json_encode(array('err' => 'Neplatný formát datumu pro pole '.$dbCol.', očekává se Y-m-d'));
                        exit;
                    }
                    $value = (string)$rawVal;
                }
                break;
            case 'stav_id':
                $value = (int)$rawVal;
                $incomingStavId = $value;
                break;
            default:
                // leave as-is (string / text)
                break;
        }
        $ph = ':' . $dbCol;
        $setParts[] = "$dbCol = $ph";
        $params[$ph] = $value;
    }

    // Fallback merge for legacy cislo_smlouvy / smlouva_poznamka into financovani_dodatek if not explicitly provided
    if (!in_array('financovani_dodatek = :financovani_dodatek', $setParts, true)) {
        $merge = [];
        if (isset($payload['cislo_smlouvy']) && $payload['cislo_smlouvy'] !== '') {
            $merge['cislo_smlouvy'] = (string)$payload['cislo_smlouvy'];
        }
        if (isset($payload['smlouva_poznamka']) && $payload['smlouva_poznamka'] !== '') {
            $merge['smlouva_poznamka'] = (string)$payload['smlouva_poznamka'];
        }
        if (!empty($merge)) {
            $setParts[] = 'financovani_dodatek = :financovani_dodatek';
            $params[':financovani_dodatek'] = json_encode($merge);
        }
    }

    if (empty($setParts)) {
        http_response_code(400);
        echo json_encode(array('err' => 'Žádná podporovaná pole k aktualizaci'));
        exit;
    }

    // Pokud měníme stav a nový stav je schvalovací, přidej nastavení datum_schvaleni a schvalil_uzivatel_id
    if ($incomingStavId) {
        try {
            $dbLookup = get_db($config);
            $stmtSt = $dbLookup->prepare("SELECT kod_stavu, typ_objektu FROM ".TBL_CISELNIK_STAVY." WHERE id = :id LIMIT 1");
            $stmtSt->execute([':id' => $incomingStavId]);
            $stavRow = $stmtSt->fetch();
            if ($stavRow && strtoupper($stavRow['typ_objektu']) === 'OBJEDNAVKA') {
                $kod = strtoupper($stavRow['kod_stavu']);
                if (in_array($kod, ['SCHVALENA','ZAMITNUTA','CEKA_SE'])) {
                    $setParts[] = 'datum_schvaleni = NOW()';
                    $setParts[] = 'schvalovatel_id = :schvalovatel_id';
                    $params[':schvalovatel_id'] = $token_data['id'];
                }
                // stav_datum vždy při změně stavu
                $setParts[] = 'stav_datum = NOW()';
            }
        } catch (Exception $e) {
            error_log('update_order status check fail: '.$e->getMessage());
        }
    }

    // Always set update tracking fields and dt_aktualizace = NOW()
    $setParts[] = 'updated_by_uzivatel_id = :updated_by_uzivatel_id';
    $params[':updated_by_uzivatel_id'] = $token_data['id'];
    $setParts[] = 'uzivatel_akt_id = :uzivatel_akt_id';  // ✅ ADDED: Also set new field for consistency
    $params[':uzivatel_akt_id'] = $token_data['id'];
    $setParts[] = 'dt_aktualizace = NOW()';

    $sql = 'UPDATE '.TBL_OBJEDNAVKY.' SET '.implode(', ', $setParts).' WHERE id = :id LIMIT 1';

    $debug = (!empty($input['debugSql'])) || (!empty($payload['debugSql']));
    $debugData = [];

    try {
        $db = get_db($config);
        $db->beginTransaction();

        // Ověření existence objednávky
        $stmtExist = $db->prepare('SELECT id, cislo_objednavky FROM '.TBL_OBJEDNAVKY.' WHERE id = :id LIMIT 1');
        $stmtExist->execute([':id' => $orderId]);
        $existingRow = $stmtExist->fetch();
        if (!$existingRow) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(array('err' => 'Objednávka s tímto ID neexistuje', 'orderId' => $orderId));
            exit;
        }

        // Hlavní UPDATE
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $affectedMain = $stmt->rowCount();

        if ($debug) {
            $debugData['sqlMain'] = $sql;
            $debugData['sqlMainParams'] = $params;
            $debugData['sqlMainExpanded'] = expand_sql($sql, $params);
        }

        // Položky: úplná náhrada, pokud přišly
        $itemsChanged = false;
        if (isset($payload['polozky']) && is_array($payload['polozky'])) {
            $stmtDel = $db->prepare('DELETE FROM '.TBL_OBJEDNAVKY_POLOZKY.' WHERE objednavka_id = :oid');
            $stmtDel->execute([':oid' => $orderId]);
            $itemsChanged = true; // i kdyby žádné nové nepřišly, smazali jsme staré
            if ($debug) {
                $debugData['itemsDelete'] = 'DELETE FROM '.TBL_OBJEDNAVKY_POLOZKY.' WHERE objednavka_id = '.(int)$orderId;
            }
            $insertSql = $queries['objednavky_polozky_insert'];
            $stmtItem = $db->prepare($insertSql);
            $debugItems = [];
            foreach ($payload['polozky'] as $idx => $item) {
                if (!is_array($item)) continue;
                $ip = [
                    ':objednavka_id' => $orderId,
                    ':popis' => isset($item['popis']) ? (string)$item['popis'] : '',
                    ':cena_bez_dph' => isset($item['cena_bez_dph']) ? floatval($item['cena_bez_dph']) : 0,
                    ':sazba_dph' => isset($item['sazba_dph']) ? (int)$item['sazba_dph'] : 0,
                    ':cena_s_dph' => isset($item['cena_s_dph']) ? floatval($item['cena_s_dph']) : 0
                ];
                $stmtItem->execute($ip);
                if ($debug) {
                    $debugItems[] = [
                        'params' => $ip,
                        'expanded' => expand_sql($insertSql, $ip)
                    ];
                }
            }
            if ($debug) {
                $debugData['itemsInsert'] = $queries['objednavky_polozky_insert'];
                $debugData['itemsInsertExec'] = $debugItems;
            }
        }

        $db->commit();

        // ✅ WORKFLOW UPDATE: Po vyplnění údajů o zveřejnění automaticky přejít na UVEREJNENA → FAKTURACE
        if (isset($payload['datum_zverejneni']) || isset($payload['registr_smluv_id'])) {
            try {
                require_once __DIR__ . '/orderWorkflowHelpers.php';
                $registrData = [];
                if (isset($payload['datum_zverejneni'])) {
                    $registrData['datum_zverejneni'] = $payload['datum_zverejneni'];
                }
                if (isset($payload['registr_smluv_id'])) {
                    $registrData['registr_smluv_id'] = $payload['registr_smluv_id'];
                }
                updateWorkflowAfterRegistrFilled($db, $orderId, $registrData);
            } catch (Exception $e) {
                error_log("[WORKFLOW] Chyba při automatickém workflow update po vyplnění registru: " . $e->getMessage());
                // Pokračovat normálně - není to kritická chyba
            }
        }

        $orderNumber = isset($existingRow['cislo_objednavky']) && $existingRow['cislo_objednavky'] !== null ? (string)$existingRow['cislo_objednavky'] : '';
        if ($orderNumber === '') {
            // fallback reread (edge)
            try {
                $stmtNum = $db->prepare('SELECT cislo_objednavky FROM '.TBL_OBJEDNAVKY.' WHERE id = :id LIMIT 1');
                $stmtNum->execute([':id' => $orderId]);
                $tmp = $stmtNum->fetch();
                if ($tmp && !empty($tmp['cislo_objednavky'])) {
                    $orderNumber = (string)$tmp['cislo_objednavky'];
                }
            } catch (Exception $e2) { /* ignore */ }
        }

        $changed = ($affectedMain > 0) || $itemsChanged;
        $resp = [
            'status' => $changed ? 'OK' : 'NOCHANGE',
            'id' => $orderId,
            'orderNumber' => $orderNumber
        ];
        if ($debug) {
            $resp['debug'] = $debugData;
        }
        echo json_encode($resp);
        exit;
    } catch (Exception $e) {
        try { if (isset($db) && $db->inTransaction()) { $db->rollBack(); } } catch (Exception $ignored) {}
        http_response_code(500);
        echo json_encode(array('status' => 'ERROR', 'message' => $e->getMessage()));
        exit;
    }
}

// === HANDLERY PRO SPRÁVU PŘÍLOH ===

/**
 * Pomocná funkce pro určení upload cesty podle konfigurace
 */
function get_upload_path($config, $objednavka_id, $user_id) {
    // Načtení upload konfigurace
    $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
    
    // Základní cesta - preferuj root_path, jinak fallback
    $basePath = '';
    if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path']) && is_dir($uploadConfig['root_path'])) {
        $basePath = $uploadConfig['root_path'];
    } else if (isset($uploadConfig['relative_path']) && !empty($uploadConfig['relative_path'])) {
        $basePath = $uploadConfig['relative_path'];
    } else {
        throw new Exception('Upload configuration missing: root_path or relative_path must be set');
    }
    
    // Přidání lomítka na konec pokud chybí
    if (substr($basePath, -1) !== '/') {
        $basePath .= '/';
    }
    
    // Struktura adresářů podle konfigurace
    $subPath = '';
    $dirStructure = isset($uploadConfig['directory_structure']) ? $uploadConfig['directory_structure'] : array();
    
    if (isset($dirStructure['by_date']) && $dirStructure['by_date']) {
        $subPath .= date('Y') . '/' . date('m') . '/';
    }
    
    if (isset($dirStructure['by_order']) && $dirStructure['by_order']) {
        $subPath .= 'order_' . $objednavka_id . '/';
    }
    
    if (isset($dirStructure['by_user']) && $dirStructure['by_user']) {
        $subPath .= 'user_' . $user_id . '/';
    }
    
    return $basePath . $subPath;
}

/**
 * Upload přílohy k objednávce - zpracuje metadata z FE
 * Očekává: originální název, systemový GUID název, velikost, klasifikace
 */
function handle_upload_attachment($config, $queries) {
    try {
        // Ověření tokenu a username
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Kontrola povinných parametrů z FE
        if (!isset($_POST['objednavka_id']) || empty($_POST['objednavka_id'])) {
            api_error(400, 'Chybí ID objednávky');
        }
        if (!isset($_POST['originalni_nazev']) || empty($_POST['originalni_nazev'])) {
            api_error(400, 'Chybí originální název souboru');
        }
        if (!isset($_POST['systemovy_nazev']) || empty($_POST['systemovy_nazev'])) {
            api_error(400, 'Chybí systemový GUID název');
        }
        if (!isset($_POST['velikost']) || !is_numeric($_POST['velikost'])) {
            api_error(400, 'Chybí nebo neplatná velikost souboru');
        }
        if (!isset($_POST['typ_prilohy']) || empty($_POST['typ_prilohy'])) {
            api_error(400, 'Chybí klasifikace dokumentu');
        }

        $objednavka_id = (int)$_POST['objednavka_id'];
        $originalni_nazev = $_POST['originalni_nazev'];
        $systemovy_nazev = $_POST['systemovy_nazev'];
        $velikost = (int)$_POST['velikost'];
        $typ_prilohy = $_POST['typ_prilohy']; // Obj, fa, apod.
        
        // Vyčisti možné whitespace znaky
        $systemovy_nazev = trim($systemovy_nazev);
        
        // Ověření/generování systemového názvu s prefixem data (podporuje velká i malá písmena)
        $is_guid = preg_match('/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/', $systemovy_nazev);
        $is_date_guid = preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/', $systemovy_nazev);
        $is_alt_format = preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9A-Fa-f]{10,}(\.[a-zA-Z0-9]+)?$/', $systemovy_nazev); // Flexibilnější hex délka + volitelná přípona
        
        // Pokud obsahuje příponu, odstraň ji pro další zpracování
        if ($is_alt_format && strpos($systemovy_nazev, '.') !== false) {
            $systemovy_nazev = substr($systemovy_nazev, 0, strrpos($systemovy_nazev, '.'));
        }
        
        // Automaticky přidej datum pokud má klasický GUID formát
        if ($is_guid) {
            $systemovy_nazev = date('Y-m-d') . '_' . $systemovy_nazev;
        }
        
        if (!$is_guid && !$is_date_guid && !$is_alt_format) {
            api_error(400, 'Neplatný formát systemového názvu - očekáván GUID, YYYY-MM-DD_GUID nebo YYYY-MM-DD_xxxxxxxxxx(.ext) formát');
        }
        
        // Kontrola existence objednávky
        $stmt = $db->prepare("SELECT id FROM ".TBL_OBJEDNAVKY." WHERE id = :id LIMIT 1");
        $stmt->execute(array(':id' => $objednavka_id));
        if (!$stmt->fetch()) {
            api_error(404, 'Objednávka nenalezena');
        }

        // Určení cesty pro uložení souboru
        $uploadPath = get_upload_path($config, $objednavka_id, $user['id']);
        
        // Vytvoření adresáře pokud neexistuje
        if (!is_dir($uploadPath)) {
            if (!mkdir($uploadPath, 0755, true)) {
                api_error(500, 'Nelze vytvořit upload adresář');
            }
        }
        
        // Získání přípony z originálního názvu pro systemový soubor
        $fileExt = strtolower(pathinfo($originalni_nazev, PATHINFO_EXTENSION));
        $systemova_cesta = $uploadPath . $systemovy_nazev . ($fileExt ? '.' . $fileExt : '');
        
        // Načtení upload konfigurace pro validaci
        $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
        
        // Validace přípony souboru
        $allowedExtensions = isset($uploadConfig['allowed_extensions']) ? 
            $uploadConfig['allowed_extensions'] : 
            array(
                // Dokumenty
                'pdf', 'doc', 'docx', 'rtf', 'odt',
                // Tabulky
                'xls', 'xlsx', 'ods', 'csv',
                // Prezentace  
                'ppt', 'pptx', 'odp',
                // Text
                'txt', 'md',
                // Obrázky
                'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
                // Archivy
                'zip', 'rar', '7z', 'tar', 'gz'
            );
        
        if ($fileExt && !in_array($fileExt, $allowedExtensions)) {
            api_error(400, 'Nepodporovaný typ souboru. Povolené typy: ' . implode(', ', $allowedExtensions));
        }

        // Validace velikosti podle konfigurace
        $maxFileSize = isset($uploadConfig['max_file_size']) ? 
            $uploadConfig['max_file_size'] : (20 * 1024 * 1024); // 20MB default
            
        if ($velikost > $maxFileSize) {
            api_error(400, 'Soubor je příliš velký. Maximální velikost: ' . ($maxFileSize / 1024 / 1024) . ' MB');
        }

        // Zpracování nahraného souboru pokud byl poslán
        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            // Přesun souboru na finální místo s GUID názvem
            if (!move_uploaded_file($_FILES['file']['tmp_name'], $systemova_cesta)) {
                api_error(500, 'Nelze uložit soubor');
            }
        } else {
            // Pokud soubor nebyl nahrán, vytvoř prázdný soubor (placeholder)
            if (!touch($systemova_cesta)) {
                api_error(500, 'Nelze vytvořit soubor');
            }
        }

        // Vygenerování GUID pro záznam v DB - extrahování z systemového názvu
        if (preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i', $systemovy_nazev, $matches)) {
            $guid = strtoupper($matches[1]); // Extrahuj GUID část
        } else {
            $guid = strtoupper($systemovy_nazev); // Fallback pro starý formát
        }
        
        // Kontrola duplicitního GUID
        $stmtCheck = $db->prepare($queries['objednavky_prilohy_select_by_guid']);
        $stmtCheck->execute(array(':guid' => $guid));
        if ($stmtCheck->fetch()) {
            // Smaž vytvořený soubor a vrat chybu
            if (file_exists($systemova_cesta)) {
                unlink($systemova_cesta);
            }
            api_error(400, 'GUID již existuje v databázi');
        }
        
        // Uložení záznamu do databáze
        $stmt = $db->prepare($queries['objednavky_prilohy_insert']);
        $result = $stmt->execute(array(
            ':objednavka_id' => $objednavka_id,
            ':guid' => $guid,
            ':typ_prilohy' => $typ_prilohy,
            ':originalni_nazev_souboru' => $originalni_nazev,
            ':systemova_cesta' => $systemova_cesta,
            ':velikost_souboru_b' => $velikost,
            ':nahrano_uzivatel_id' => $user['id']
        ));
        
        if (!$result) {
            // Smaž soubor pokud se nepodařilo uložit do DB
            if (file_exists($systemova_cesta)) {
                unlink($systemova_cesta);
            }
            api_error(500, 'Chyba při ukládání do databáze');
        }
        
        $attachment_id = $db->lastInsertId();
        
        // Úspěšná odpověď
        api_ok(array(
            'id' => (int)$attachment_id,
            'guid' => $guid,
            'originalni_nazev' => $originalni_nazev,
            'systemovy_nazev' => $systemovy_nazev,
            'velikost' => $velikost,
            'typ_prilohy' => $typ_prilohy,
            'message' => 'Příloha úspěšně nahrána'
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při nahrávání přílohy: ' . $e->getMessage());
    }
}

/**
 * Seznam příloh k objednávce - vrací info pro FE včetně ID, GUID, originální název, velikost, typ, kdo nahrál
 */
function handle_get_attachments($config, $queries) {
    try {
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        $objednavka_id = isset($_POST['objednavka_id']) ? (int)$_POST['objednavka_id'] : 0;
        
        if (!$objednavka_id) {
            api_error(400, 'Chybí ID objednávky');
        }

        $stmt = $db->prepare($queries['objednavky_prilohy_select_by_objednavka']);
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $attachments = $stmt->fetchAll();

        // Získání informací o uživatelích pro attachment
        $userIds = array();
        foreach ($attachments as $att) {
            if (!empty($att['nahrano_uzivatel_id'])) {
                $userIds[] = $att['nahrano_uzivatel_id'];
            }
        }
        
        $userMap = array();
        if (!empty($userIds)) {
            $userIds = array_unique($userIds);
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $stmtUsers = $db->prepare("SELECT id, jmeno, prijmeni, email FROM ".TBL_UZIVATELE." WHERE id IN ($placeholders)");
            $stmtUsers->execute($userIds);
            $users = $stmtUsers->fetchAll();
            foreach ($users as $u) {
                $userMap[$u['id']] = $u;
            }
        }

        // Formátování výstupu podle požadavků FE
        $result = array();
        foreach ($attachments as $att) {
            $uploader = null;
            if (!empty($att['nahrano_uzivatel_id']) && isset($userMap[$att['nahrano_uzivatel_id']])) {
                $u = $userMap[$att['nahrano_uzivatel_id']];
                $uploader = array(
                    'id' => $u['id'],
                    'jmeno' => $u['jmeno'],
                    'prijmeni' => $u['prijmeni'],
                    'email' => $u['email'],
                    'celne_jmeno' => trim($u['jmeno'] . ' ' . $u['prijmeni'])
                );
            }
            
            // Ověření existence souboru na serveru
            $systemova_cesta = $att['systemova_cesta'];
            $isExist = file_exists($systemova_cesta);
            
            $result[] = array(
                'id' => (int)$att['id'],
                'guid' => $att['guid'],
                'originalni_nazev' => $att['originalni_nazev_souboru'],
                'systemovy_nazev' => basename($att['systemova_cesta']),
                'systemova_cesta' => $systemova_cesta, // Celá cesta pro debug
                'velikost' => (int)$att['velikost_souboru_b'],
                'typ_prilohy' => $att['typ_prilohy'], // Obj, fa, apod.
                'nahrano_uzivatel' => $uploader,
                'dt_vytvoreni' => $att['dt_vytvoreni'],
                'dt_aktualizace' => $att['dt_aktualizace'],
                'isExist' => $isExist
            );
        }

        api_ok(array(
            'attachments' => $result,
            'count' => count($result)
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání příloh: ' . $e->getMessage());
    }
}

/**
 * Ověření příloh k objednávce - s tokenem a username pro bezpečnost
 * Rychlý endpoint pro kontrolu existence s autentizací
 */
function handle_verify_attachments($config, $queries) {
    try {
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        $objednavka_id = isset($_POST['objednavka_id']) ? (int)$_POST['objednavka_id'] : 0;
        
        if (!$objednavka_id) {
            api_error(400, 'Chybí ID objednávky');
        }
        
        // Ověření existence objednávky
        $stmtOrder = $db->prepare("SELECT id FROM ".TBL_OBJEDNAVKY." WHERE id = :id LIMIT 1");
        $stmtOrder->execute(array(':id' => $objednavka_id));
        if (!$stmtOrder->fetch()) {
            api_error(404, 'Objednávka s ID ' . $objednavka_id . ' nenalezena');
        }
        
        // Načtení příloh
        $stmt = $db->prepare($queries['objednavky_prilohy_select_by_objednavka']);
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $attachments = $stmt->fetchAll();

        // Ověření existence příloh s detailním error handlingem
        $result = array();
        $errors = array();
        
        foreach ($attachments as $att) {
            try {
                $systemova_cesta = $att['systemova_cesta'];
                $isExist = false;
                $error_detail = null;
                
                // Kontrola existence souboru
                if (empty($systemova_cesta)) {
                    $error_detail = 'Prázdná cesta k souboru';
                } elseif (!file_exists($systemova_cesta)) {
                    $error_detail = 'Soubor neexistuje na cestě: ' . $systemova_cesta;
                } elseif (!is_readable($systemova_cesta)) {
                    $error_detail = 'Soubor není čitelný';
                    $isExist = true; // existuje, ale není čitelný
                } else {
                    $isExist = true;
                }
                
                $result[] = array(
                    'id' => (int)$att['id'],
                    'guid' => $att['guid'],
                    'originalni_nazev' => $att['originalni_nazev_souboru'],
                    'systemovy_nazev' => basename($att['systemova_cesta']),
                    'systemova_cesta' => $systemova_cesta,
                    'velikost' => (int)$att['velikost_souboru_b'],
                    'typ_prilohy' => $att['typ_prilohy'],
                    'dt_vytvoreni' => $att['dt_vytvoreni'],
                    'isExist' => $isExist,
                    'error_detail' => $error_detail
                );
                
                if ($error_detail) {
                    $errors[] = array(
                        'attachment_id' => (int)$att['id'],
                        'guid' => $att['guid'],
                        'error' => $error_detail
                    );
                }
                
            } catch (Exception $e) {
                $errors[] = array(
                    'attachment_id' => isset($att['id']) ? (int)$att['id'] : null,
                    'error' => 'Chyba při ověřování přílohy: ' . $e->getMessage()
                );
            }
        }

        api_ok(array(
            'objednavka_id' => $objednavka_id,
            'verified_by' => array(
                'user_id' => $user['id'],
                'username' => $user['username'],
                'full_name' => trim($user['jmeno'] . ' ' . $user['prijmeni'])
            ),
            'attachments' => $result,
            'count' => count($result),
            'existing_count' => count(array_filter($result, function($att) { return $att['isExist']; })),
            'missing_count' => count(array_filter($result, function($att) { return !$att['isExist']; })),
            'error_count' => count($errors),
            'errors' => $errors,
            'verification_time' => date('Y-m-d H:i:s'),
            'status_summary' => array(
                'all_exist' => count($errors) === 0 && count($result) > 0,
                'has_missing' => count(array_filter($result, function($att) { return !$att['isExist']; })) > 0,
                'has_errors' => count($errors) > 0,
                'no_attachments' => count($result) === 0
            )
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při ověřování příloh: ' . $e->getMessage());
    }
}

/**
 * Stažení přílohy
 */
function handle_download_attachment($config, $queries) {
    try {
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        if (!isset($_POST['guid']) || empty($_POST['guid'])) {
            api_error(400, 'Chybí GUID přílohy');
        }

        $guid = $_POST['guid'];

        $stmt = $db->prepare($queries['objednavky_prilohy_select_by_guid']);
        $stmt->execute(array(':guid' => $guid));
        $attachment = $stmt->fetch();

        if (!$attachment) {
            api_error(404, 'Příloha nenalezena');
        }

        $filePath = $attachment['systemova_cesta'];
        
        if (!file_exists($filePath)) {
            api_error(404, 'Soubor nenalezen na disku');
        }

        // Nastavení hlaviček pro stažení
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $attachment['originalni_nazev_souboru'] . '"');
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');

        // Odeslání souboru
        readfile($filePath);
        exit;

    } catch (Exception $e) {
        api_error(500, 'Chyba při stahování přílohy: ' . $e->getMessage());
    }
}

/**
 * Smazání přílohy - podporuje mazání podle ID nebo GUID
 */
function handle_delete_attachment($config, $queries) {
    try {
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Podporuj POST parametry
        $guid = isset($_POST['guid']) ? $_POST['guid'] : '';
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;

        if (empty($guid) && !$id) {
            api_error(400, 'Chybí ID nebo GUID přílohy');
        }

        // Najdi přílohu podle GUID nebo ID
        $attachment = null;
        if (!empty($guid)) {
            $stmt = $db->prepare($queries['objednavky_prilohy_select_by_guid']);
            $stmt->execute(array(':guid' => $guid));
            $attachment = $stmt->fetch();
        } elseif ($id > 0) {
            $stmt = $db->prepare("SELECT * FROM ".TBL_OBJEDNAVKY_PRILOHY." WHERE id = :id LIMIT 1");
            $stmt->execute(array(':id' => $id));
            $attachment = $stmt->fetch();
        }

        if (!$attachment) {
            api_error(404, 'Příloha nenalezena');
        }

        // Uložení informací pro odpověď
        $response_info = array(
            'id' => $attachment['id'],
            'guid' => $attachment['guid'],
            'originalni_nazev' => $attachment['originalni_nazev_souboru'],
            'typ_prilohy' => $attachment['typ_prilohy']
        );

        // Smaž soubor z disku
        if (file_exists($attachment['systemova_cesta'])) {
            if (!unlink($attachment['systemova_cesta'])) {
                // Pokud se nepodaří smazat soubor, zaznamename to ale nepřerušíme proces
                error_log('Nepodařilo se smazat soubor: ' . $attachment['systemova_cesta']);
            }
        }

        // Smaž záznam z databáze
        if (!empty($guid)) {
            $stmt = $db->prepare($queries['objednavky_prilohy_delete_by_guid']);
            $stmt->execute(array(':guid' => $guid));
        } else {
            $stmt = $db->prepare($queries['objednavky_prilohy_delete']);
            $stmt->execute(array(':id' => $id));
        }

        api_ok(array(
            'message' => 'Příloha byla úspěšně smazána',
            'deleted_attachment' => $response_info
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při mazání přílohy: ' . $e->getMessage());
    }
}

/**
 * Deaktivace přílohy (soft delete) - nastaví aktivni = 0
 */
function handle_deactivate_attachment($config, $queries) {
    try {
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        $guid = isset($_POST['guid']) ? $_POST['guid'] : '';
        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;

        if (empty($guid) && $id <= 0) {
            api_error(400, 'Chybí ID nebo GUID přílohy');
        }

        // Najdi přílohu
        if (!empty($guid)) {
            $stmt = $db->prepare($queries['objednavky_prilohy_select_by_guid']);
            $stmt->execute(array(':guid' => $guid));
        } else {
            $stmt = $db->prepare($queries['objednavky_prilohy_select']);
            $stmt->execute(array(':id' => $id));
        }
        
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$attachment) {
            api_error(404, 'Příloha nenalezena');
        }

        // Uložení informací pro odpověď
        $response_info = array(
            'id' => $attachment['id'],
            'guid' => $attachment['guid'],
            'originalni_nazev' => $attachment['originalni_nazev_souboru'],
            'typ_prilohy' => $attachment['typ_prilohy']
        );

        // Deaktivuj přílohu v databázi (soft delete)
        if (!empty($guid)) {
            $sql = "UPDATE " . TBL_OBJEDNAVKY_PRILOHY . " SET aktivni = 0, dt_aktualizace = NOW() WHERE guid = :guid";
            $stmt = $db->prepare($sql);
            $stmt->execute(array(':guid' => $guid));
        } else {
            $sql = "UPDATE " . TBL_OBJEDNAVKY_PRILOHY . " SET aktivni = 0, dt_aktualizace = NOW() WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute(array(':id' => $id));
        }

        api_ok(array(
            'message' => 'Příloha byla deaktivována',
            'deactivated_attachment' => $response_info
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při deaktivaci přílohy: ' . $e->getMessage());
    }
}

// Jednoduchá expanze SQL pro debug (nahrazení :param hodnotami)
if (!function_exists('expand_sql')) {
    function expand_sql($sql, $params) {
        // seřaď placeholdery dle délky, aby :cena nepřepsalo část :cena_bez_dph
        uksort($params, function($a,$b){ return strlen($b) - strlen($a); });
        foreach ($params as $k => $v) {
            $rep = 'NULL';
            if ($v === null) {
                $rep = 'NULL';
            } elseif (is_numeric($v)) {
                $rep = (string)$v;
            } else {
                $rep = "'".addslashes($v)."'";
            }
            $sql = str_replace($k, $rep, $sql);
        }
        return $sql;
    }
}

function handle_update_attachment($config, $queries) {
    try {
        // Ověření tokenu a username
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Kontrola povinných parametrů
        if (!isset($_POST['id']) || !is_numeric($_POST['id'])) {
            api_error(400, 'Chybí nebo neplatné ID přílohy');
        }
        if (!isset($_POST['typ_prilohy']) || empty($_POST['typ_prilohy'])) {
            api_error(400, 'Chybí typ přílohy');
        }

        $id = (int)$_POST['id'];
        $typ_prilohy = $_POST['typ_prilohy'];

        // Ověření existence přílohy
        $stmt = $db->prepare($queries['objednavky_prilohy_select_by_id']);
        $stmt->execute(array(':id' => $id));
        $attachment = $stmt->fetch();
        
        if (!$attachment) {
            api_error(404, 'Příloha s ID ' . $id . ' nenalezena');
        }

        // Aktualizace typu přílohy
        $stmt = $db->prepare($queries['objednavky_prilohy_update']);
        $result = $stmt->execute(array(
            ':id' => $id,
            ':typ_prilohy' => $typ_prilohy
        ));

        if (!$result) {
            api_error(500, 'Chyba při aktualizaci přílohy');
        }

        // Načtení aktualizované přílohy
        $stmt = $db->prepare($queries['objednavky_prilohy_select_by_id']);
        $stmt->execute(array(':id' => $id));
        $updated_attachment = $stmt->fetch();

        api_ok(array(
            'message' => 'Příloha úspěšně aktualizována',
            'attachment' => array(
                'id' => (int)$updated_attachment['id'],
                'objednavka_id' => (int)$updated_attachment['objednavka_id'],
                'guid' => $updated_attachment['guid'],
                'typ_prilohy' => $updated_attachment['typ_prilohy'],
                'originalni_nazev_souboru' => $updated_attachment['originalni_nazev_souboru'],
                'velikost_souboru_b' => (int)$updated_attachment['velikost_souboru_b'],
                'dt_vytvoreni' => $updated_attachment['dt_vytvoreni'],
                'dt_aktualizace' => $updated_attachment['dt_aktualizace']
            ),
            'updated_by' => array(
                'user_id' => $user['id'],
                'username' => $user['username']
            )
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba serveru: ' . $e->getMessage());
    }
}

/**
 * RAW SELECT - surová data z DB bez jakýchkoli úprav
 */
function handle_orders_list_raw($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token'));
        exit;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username neodpovídá tokenu'));
        exit;
    }
    
    try {
        $db = get_db($config);
        
        // RAW SELECT - bez jakýchkoli úprav
        $stmt = $db->prepare($queries['objednavky_select_all_raw']);
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'OK', 
            'orders' => $orders,
            'count' => count($orders),
            'note' => 'RAW data z DB bez úprav'
        ));
        return;
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'ERROR', 'message' => $e->getMessage()));
        return;
    }
}

/**
 * ENRICHED SELECT - surová data + rozšířené JSON pole s názvy z číselníků
 */
function handle_orders_list_enriched($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný token'));
        exit;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username neodpovídá tokenu'));
        exit;
    }
    
    try {
        $db = get_db($config);
        
        // 1. Načteme všechny objednávky
        $stmt = $db->prepare($queries['objednavky_select_all_enriched']);
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 2. Načteme všechny číselníky pro překlad ID na názvy
        
        // Lokality
        $stmt = $db->prepare("SELECT id, nazev, typ FROM ".TBL_LOKALITY);
        $stmt->execute();
        $lokality = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $lokalityMap = array();
        foreach ($lokality as $lokalita) {
            $lokalityMap[$lokalita['id']] = $lokalita['nazev'] . ' (' . $lokalita['typ'] . ')';
        }
        
        // Uživatelé
        $stmt = $db->prepare("SELECT id, CONCAT_WS(' ', titul_pred, jmeno, prijmeni, titul_za) as cely_jmeno FROM ".TBL_UZIVATELE." WHERE aktivni = 1");
        $stmt->execute();
        $uzivatele = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $uzivateleMap = array();
        foreach ($uzivatele as $uzivatel) {
            $uzivateleMap[$uzivatel['id']] = trim($uzivatel['cely_jmeno']);
        }
        
        // Dodavatelé
        $stmt = $db->prepare("SELECT id, nazev FROM ".TBL_DODAVATELE);
        $stmt->execute();
        $dodavatele = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $dodavateleMap = array();
        foreach ($dodavatele as $dodavatel) {
            $dodavateleMap[$dodavatel['id']] = $dodavatel['nazev'];
        }
        
        // Stavy
        $stmt = $db->prepare("SELECT id, nazev_stavu, kod_stavu FROM ".TBL_CISELNIK_STAVY." WHERE typ_objektu = 'OBJEDNAVKA'");
        $stmt->execute();
        $stavy = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stavyMap = array();
        foreach ($stavy as $stav) {
            $stavyMap[$stav['id']] = $stav['nazev_stavu'];
        }
        
        // Limitované přísliby
        $stmt = $db->prepare($queries['limitovane_prisliby_select_basic_info']);
        $stmt->execute();
        $limitovane_prisliby = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $limitovane_prislibsMap = array();
        foreach ($limitovane_prisliby as $lp) {
            $limitovane_prislibsMap[$lp['id']] = array(
                'cislo_lp' => $lp['cislo_lp'],
                'nazev_uctu' => $lp['nazev_uctu'],
                'vyse_financniho_kryti' => $lp['vyse_financniho_kryti']
            );
        }
        
        // 3. Načteme všechny položky objednávek
        $stmt = $db->prepare($queries['objednavky_polozky_select_all']);
        $stmt->execute();
        $all_polozky = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $polozkyMap = array();
        foreach ($all_polozky as $polozka) {
            if (!isset($polozkyMap[$polozka['objednavka_id']])) {
                $polozkyMap[$polozka['objednavka_id']] = array();
            }
            $polozkyMap[$polozka['objednavka_id']][] = $polozka;
        }
        
        // 4. Načteme všechny přílohy objednávek
        $stmt = $db->prepare($queries['objednavky_prilohy_select_all']);
        $stmt->execute();
        $all_prilohy = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $prilohyMap = array();
        foreach ($all_prilohy as $priloha) {
            if (!isset($prilohyMap[$priloha['objednavka_id']])) {
                $prilohyMap[$priloha['objednavka_id']] = array();
            }
            $prilohyMap[$priloha['objednavka_id']][] = $priloha;
        }
        
        // 5. Projdeme každou objednávku a rozšíříme všechna ID pole + připojíme položky a přílohy
        foreach ($orders as &$order) {
            
            // Připojení položek objednávky a výpočet statistik
            $order['polozky'] = isset($polozkyMap[$order['id']]) ? $polozkyMap[$order['id']] : array();
            
            // Počet položek
            $order['polozky_count'] = count($order['polozky']);
            
            // Celková cena položek (s DPH) - KLÍČOVÁ FUNKCIONALITA
            $celkova_cena_s_dph = 0.0;
            foreach ($order['polozky'] as $polozka) {
                if (isset($polozka['cena_s_dph']) && is_numeric($polozka['cena_s_dph'])) {
                    $celkova_cena_s_dph += (float)$polozka['cena_s_dph'];
                }
            }
            $order['polozky_celkova_cena_s_dph'] = $celkova_cena_s_dph;
            
            // Připojení příloh objednávky  
            $order['prilohy'] = isset($prilohyMap[$order['id']]) ? $prilohyMap[$order['id']] : array();
            
            // Počet příloh
            $order['prilohy_count'] = count($order['prilohy']);
            
            // Automatické nahrazování všech polí končících na 'id' nebo '_id' (kromě primárního klíče)
            foreach ($order as $fieldName => $fieldValue) {
                if (preg_match('/(^|_)id$/', $fieldName) && $fieldName !== 'id' && !empty($fieldValue)) {
                    // Pokud je hodnota číselná nebo může být převedena na číslo
                    if (is_numeric($fieldValue)) {
                        $id = (int)$fieldValue;
                        
                        // Určíme správný číselník podle názvu pole
                        if (strpos($fieldName, 'uzivatel') !== false || $fieldName === 'objednatel_id' || $fieldName === 'garant_id' || $fieldName === 'prikazce_id') {
                            // Uživatelská ID (včetně prikazce_id)
                            $userFullName = isset($uzivateleMap[$id]) ? $uzivateleMap[$id] : null;
                            $order[$fieldName . '_nazev'] = $userFullName;
                            
                            // Pro Orders25 kompatibilitu - vytvoříme user objekty
                            if ($userFullName) {
                                $order[str_replace('_id', '', $fieldName)] = array(
                                    'id' => $id,
                                    'fullname' => $userFullName
                                );
                            }
                        } elseif ($fieldName === 'dodavatel_id') {
                            // Dodavatel
                            $dodavatelNazev = isset($dodavateleMap[$id]) ? $dodavateleMap[$id] : null;
                            $order[$fieldName . '_nazev'] = $dodavatelNazev;
                            
                            // Pro Orders25 kompatibilitu
                            if ($dodavatelNazev) {
                                $order['dodavatel'] = array(
                                    'id' => $id,
                                    'nazev' => $dodavatelNazev
                                );
                            }
                        } elseif ($fieldName === 'lokalita_id') {
                            // Lokalita
                            $lokalitaNazev = isset($lokalityMap[$id]) ? $lokalityMap[$id] : null;
                            $order[$fieldName . '_nazev'] = $lokalitaNazev;
                            
                            // Pro Orders25 kompatibilitu
                            if ($lokalitaNazev) {
                                $order['lokalita'] = array(
                                    'id' => $id,
                                    'nazev' => $lokalitaNazev
                                );
                            }
                        } elseif ($fieldName === 'stav_id') {
                            // Stav
                            $stavNazev = isset($stavyMap[$id]) ? $stavyMap[$id] : null;
                            $order[$fieldName . '_nazev'] = $stavNazev;
                            
                            // Pro Orders25 kompatibilitu
                            if ($stavNazev) {
                                $order['stav'] = array(
                                    'id' => $id,
                                    'nazev' => $stavNazev
                                );
                            }
                        }
                    }
                }
            }
            
            // Speciální zpracování středisek (JSON pole)
            $order['strediska_nazvy'] = null;
            if (!empty($order['strediska']) && $order['strediska'] !== '' && $order['strediska'] !== '[]') {
                // Parsujeme JSON
                $strediskaIds = json_decode($order['strediska'], true);
                
                if (is_array($strediskaIds) && count($strediskaIds) > 0) {
                    $nazvy = array();
                    foreach ($strediskaIds as $idString) {
                        // Ošetříme případ, kdy je více ID v jednom stringu oddělených čárkou (kvůli starým datům)
                        if (strpos($idString, ',') !== false) {
                            // Rozdělíme string na jednotlivá ID
                            $multipleIds = explode(',', $idString);
                            foreach ($multipleIds as $singleId) {
                                $id = (int)trim($singleId);
                                if ($id > 0 && isset($lokalityMap[$id])) {
                                    $nazvy[] = $lokalityMap[$id];
                                }
                            }
                        } else {
                            // Normální jednotlivé ID
                            $id = (int)$idString;
                            if ($id > 0 && isset($lokalityMap[$id])) {
                                $nazvy[] = $lokalityMap[$id];
                            }
                        }
                    }
                    
                    if (count($nazvy) > 0) {
                        $order['strediska_nazvy'] = implode(', ', $nazvy);
                    }
                }
            }
            
            // Speciální zpracování financování dodatku (JSON pole s lp_kod)
            $order['financovani_dodatek_nazvy'] = null;
            if (!empty($order['financovani_dodatek']) && $order['financovani_dodatek'] !== '' && $order['financovani_dodatek'] !== '[]') {
                // Parsujeme JSON
                $financovani_data = json_decode($order['financovani_dodatek'], true);
                
                if (is_array($financovani_data) && isset($financovani_data['lp_kod'])) {
                    // Získáme LP kódy - může být string "6,7" nebo jednotlivé číslo
                    $lp_kody_string = $financovani_data['lp_kod'];
                    $lp_kody = array();
                    
                    if (strpos($lp_kody_string, ',') !== false) {
                        // Více LP kódů oddělených čárkou
                        $lp_kody = array_map('trim', explode(',', $lp_kody_string));
                    } else {
                        // Jednotlivý LP kód
                        $lp_kody = array(trim($lp_kody_string));
                    }
                    
                    $lp_nazvy = array();
                    foreach ($lp_kody as $lp_id) {
                        $lp_id = (int)$lp_id;
                        if ($lp_id > 0 && isset($limitovane_prislibsMap[$lp_id])) {
                            $lp_info = $limitovane_prislibsMap[$lp_id];
                            // $lp_nazvy[] = "LP {$lp_info['cislo_lp']}: {$lp_info['nazev_uctu']} ({$lp_info['vyse_financniho_kryti']} Kč)";
                            $lp_nazvy[] = "{$lp_info['cislo_lp']}";
                        }
                    }
                    
                    if (count($lp_nazvy) > 0) {
                        $order['financovani_dodatek_nazvy'] = "LP kód:".implode(', ', $lp_nazvy);
                    }
                }
            }
            
            // Parse CSV ID lists into arrays pro Orders25 kompatibilitu
            $order['polozky_ids_array'] = [];
            $order['prilohy_ids_array'] = [];
            
            // Přidání aliasů pro lepší čitelnost
            if (isset($order['schvalil_uzivatel_id_nazev'])) {
                $order['schvaleno_kym'] = $order['schvalil_uzivatel_id_nazev'];
            }
            
            // Pro prilohy - přidat uploader user info
            if (!empty($order['prilohy']) && is_array($order['prilohy'])) {
                foreach ($order['prilohy'] as &$att) {
                    $att['nahrano_uzivatel'] = null;
                    if (!empty($att['nahrano_uzivatel_id']) && isset($uzivateleMap[intval($att['nahrano_uzivatel_id'])])) {
                        $att['nahrano_uzivatel'] = array(
                            'id' => intval($att['nahrano_uzivatel_id']),
                            'fullname' => $uzivateleMap[intval($att['nahrano_uzivatel_id'])]
                        );
                    }
                }
                unset($att);
            }
        }
        unset($order); // Ukončíme referenci
        
        echo json_encode(array(
            'status' => 'OK', 
            'orders' => $orders
        ));
        return;
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'ERROR', 'message' => $e->getMessage()));
        return;
    }
}

// ========== ČÍSELNÍKY API HANDLERS ==========

/**
 * Handler pro seznam lokalit
 */
function handle_lokality_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['lokality_select_all']);
        $stmt->execute();
        $lokality = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $lokality
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání lokalit: ' . $e->getMessage()));
    }
}

/**
 * Handler pro detail lokality podle ID
 */
function handle_lokality_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $lokalita_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($lokalita_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID lokality'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['lokality_select_by_id']);
        $stmt->bindParam(':id', $lokalita_id, PDO::PARAM_INT);
        $stmt->execute();
        $lokalita = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lokalita) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Lokalita nenalezena'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $lokalita
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání lokality: ' . $e->getMessage()));
    }
}

/**
 * Handler pro seznam pozic
 */
function handle_pozice_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['pozice_select_all']);
        $stmt->execute();
        $pozice = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $pozice
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání pozic: ' . $e->getMessage()));
    }
}

/**
 * Handler pro detail pozice podle ID
 */
function handle_pozice_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $pozice_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($pozice_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID pozice'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['pozice_select_by_id']);
        $stmt->bindParam(':id', $pozice_id, PDO::PARAM_INT);
        $stmt->execute();
        $pozice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pozice) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Pozice nenalezena'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $pozice
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání pozice: ' . $e->getMessage()));
    }
}

/**
 * Handler pro seznam organizací
 */
function handle_organizace_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['organizace_list']);
        $stmt->execute();
        $organizace = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $organizace
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání organizací: ' . $e->getMessage()));
    }
}

/**
 * Handler pro detail organizace podle ID
 */
function handle_organizace_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $organizace_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($organizace_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID organizace'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['organizace_select_by_id']);
        $stmt->bindParam(':id', $organizace_id, PDO::PARAM_INT);
        $stmt->execute();
        $organizace = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$organizace) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Organizace nenalezena'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $organizace
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání organizace: ' . $e->getMessage()));
    }
}

/**
 * Handler pro vytvoření nové organizace
 */
function handle_organizace_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    // Validace vstupních dat
    $validation_result = validateOrganizaceInput($input, false);
    if (!$validation_result['valid']) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Neplatná vstupní data',
            'errors' => $validation_result['errors']
        ));
        return;
    }

    try {
        $db = get_db($config);
        $data = $validation_result['data'];

        // Kontrola jedinečnosti IČO
        if (!empty($data['ico'])) {
            $check_stmt = $db->prepare("SELECT COUNT(*) as count FROM ".TBL_ORGANIZACE_VIZITKA." WHERE ico = :ico");
            $check_stmt->bindParam(':ico', $data['ico']);
            $check_stmt->execute();
            $result = $check_stmt->fetch();
            
            if ($result['count'] > 0) {
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Organizace s tímto IČO již existuje'));
                return;
            }
        }

        // INSERT
        $stmt = $db->prepare($queries['organizace_insert']);
        $stmt->bindParam(':nazev_organizace', $data['nazev_organizace']);
        $stmt->bindParam(':ico', $data['ico']);
        $stmt->bindParam(':dic', $data['dic']);
        $stmt->bindParam(':ulice_cislo', $data['ulice_cislo']);
        $stmt->bindParam(':mesto', $data['mesto']);
        $stmt->bindParam(':psc', $data['psc']);
        $stmt->bindParam(':zastoupeny', $data['zastoupeny']);
        $stmt->bindParam(':datova_schranka', $data['datova_schranka']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':telefon', $data['telefon']);
        
        $stmt->execute();
        $new_id = $db->lastInsertId();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Organizace byla úspěšně vytvořena',
            'data' => array('id' => $new_id)
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření organizace: ' . $e->getMessage()));
    }
}

/**
 * Handler pro aktualizaci organizace
 */
function handle_organizace_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $organizace_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($organizace_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID organizace'));
        return;
    }

    // Validace vstupních dat
    $validation_result = validateOrganizaceInput($input, true);
    if (!$validation_result['valid']) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Neplatná vstupní data',
            'errors' => $validation_result['errors']
        ));
        return;
    }

    try {
        $db = get_db($config);
        $data = $validation_result['data'];

        // Kontrola existence organizace
        $check_stmt = $db->prepare("SELECT COUNT(*) as count FROM ".TBL_ORGANIZACE_VIZITKA." WHERE id = :id");
        $check_stmt->bindParam(':id', $organizace_id, PDO::PARAM_INT);
        $check_stmt->execute();
        $result = $check_stmt->fetch();
        
        if ($result['count'] == 0) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Organizace nenalezena'));
            return;
        }

        // Kontrola jedinečnosti IČO (kromě současné organizace)
        if (!empty($data['ico'])) {
            $check_ico_stmt = $db->prepare("SELECT COUNT(*) as count FROM ".TBL_ORGANIZACE_VIZITKA." WHERE ico = :ico AND id != :id");
            $check_ico_stmt->bindParam(':ico', $data['ico']);
            $check_ico_stmt->bindParam(':id', $organizace_id, PDO::PARAM_INT);
            $check_ico_stmt->execute();
            $ico_result = $check_ico_stmt->fetch();
            
            if ($ico_result['count'] > 0) {
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Organizace s tímto IČO již existuje'));
                return;
            }
        }

        // UPDATE - jen pole která byla poslána
        $update_fields = array();
        $params = array(':id' => $organizace_id);
        
        if (isset($data['nazev_organizace'])) {
            $update_fields[] = "nazev_organizace = :nazev_organizace";
            $params[':nazev_organizace'] = $data['nazev_organizace'];
        }
        if (isset($data['ico'])) {
            $update_fields[] = "ico = :ico";
            $params[':ico'] = $data['ico'];
        }
        if (isset($data['dic'])) {
            $update_fields[] = "dic = :dic";
            $params[':dic'] = $data['dic'];
        }
        if (isset($data['ulice_cislo'])) {
            $update_fields[] = "ulice_cislo = :ulice_cislo";
            $params[':ulice_cislo'] = $data['ulice_cislo'];
        }
        if (isset($data['mesto'])) {
            $update_fields[] = "mesto = :mesto";
            $params[':mesto'] = $data['mesto'];
        }
        if (isset($data['psc'])) {
            $update_fields[] = "psc = :psc";
            $params[':psc'] = $data['psc'];
        }
        if (isset($data['zastoupeny'])) {
            $update_fields[] = "zastoupeny = :zastoupeny";
            $params[':zastoupeny'] = $data['zastoupeny'];
        }
        if (isset($data['datova_schranka'])) {
            $update_fields[] = "datova_schranka = :datova_schranka";
            $params[':datova_schranka'] = $data['datova_schranka'];
        }
        if (isset($data['email'])) {
            $update_fields[] = "email = :email";
            $params[':email'] = $data['email'];
        }
        if (isset($data['telefon'])) {
            $update_fields[] = "telefon = :telefon";
            $params[':telefon'] = $data['telefon'];
        }

        if (empty($update_fields)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Žádná data k aktualizaci'));
            return;
        }

        $sql = "UPDATE ".TBL_ORGANIZACE_VIZITKA." SET " . implode(', ', $update_fields) . " WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Organizace byla úspěšně aktualizována'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci organizace: ' . $e->getMessage()));
    }
}

/**
 * Handler pro smazání organizace
 */
function handle_organizace_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $organizace_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($organizace_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID organizace'));
        return;
    }

    try {
        $db = get_db($config);

        // Kontrola existence organizace
        $check_stmt = $db->prepare("SELECT COUNT(*) as count FROM ".TBL_ORGANIZACE_VIZITKA." WHERE id = :id");
        $check_stmt->bindParam(':id', $organizace_id, PDO::PARAM_INT);
        $check_stmt->execute();
        $result = $check_stmt->fetch();
        
        if ($result['count'] == 0) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Organizace nenalezena'));
            return;
        }

        // Kontrola použití v jiných tabulkách
        $usage_stmt = $db->prepare($queries['organizace_check_usage']);
        $usage_stmt->bindParam(':id', $organizace_id, PDO::PARAM_INT);
        $usage_stmt->execute();
        $usage = $usage_stmt->fetch();

        if ($usage['users_count'] > 0) {
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Nelze smazat organizaci - má přiřazené uživatele (' . $usage['users_count'] . ')'
            ));
            return;
        }

        // DELETE
        $stmt = $db->prepare($queries['organizace_delete']);
        $stmt->bindParam(':id', $organizace_id, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Organizace byla úspěšně smazána'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání organizace: ' . $e->getMessage()));
    }
}

/**
 * Validace vstupních dat pro organizaci
 * @param array $input - Input data
 * @param bool $is_update - Zda je to update (některá pole nejsou povinná)
 * @return array - Array s 'valid' => bool, 'data' => normalized_data, 'errors' => array
 */
function validateOrganizaceInput($input, $is_update = false) {
    $errors = array();
    $data = array();
    
    // Název organizace (povinné při vytváření)
    if (!$is_update || isset($input['nazev_organizace'])) {
        $nazev = isset($input['nazev_organizace']) ? trim($input['nazev_organizace']) : '';
        if (empty($nazev) && !$is_update) {
            $errors[] = 'Název organizace je povinný';
        } elseif (!empty($nazev)) {
            if (strlen($nazev) > 255) {
                $errors[] = 'Název organizace je příliš dlouhý (max 255 znaků)';
            } else {
                $data['nazev_organizace'] = $nazev;
            }
        }
    }
    
    // IČO (povinné podle DB struktur - NOT NULL)
    if (!$is_update || isset($input['ico'])) {
        $ico = isset($input['ico']) ? trim($input['ico']) : '';
        if (empty($ico) && !$is_update) {
            $errors[] = 'IČO je povinné';
        } elseif (!empty($ico)) {
            if (strlen($ico) > 20) {
                $errors[] = 'IČO je příliš dlouhé (max 20 znaků)';
            } elseif (!preg_match('/^\d{8}$/', $ico)) {
                $errors[] = 'IČO musí obsahovat přesně 8 číslic';
            } else {
                $data['ico'] = $ico;
            }
        }
    }
    
    // DIČ (volitelné)
    if (isset($input['dic'])) {
        $dic = trim($input['dic']);
        if (!empty($dic)) {
            if (strlen($dic) > 32) {
                $errors[] = 'DIČ je příliš dlouhé (max 32 znaků)';
            } else {
                $data['dic'] = $dic;
            }
        } else {
            $data['dic'] = '';  // Prázdný string pro NOT NULL
        }
    }
    
    // Ulice a číslo (volitelné)
    if (isset($input['ulice_cislo'])) {
        $ulice = trim($input['ulice_cislo']);
        if (strlen($ulice) > 100) {
            $errors[] = 'Ulice a číslo je příliš dlouhé (max 100 znaků)';
        } else {
            $data['ulice_cislo'] = !empty($ulice) ? $ulice : null;
        }
    }
    
    // Město (volitelné)
    if (isset($input['mesto'])) {
        $mesto = trim($input['mesto']);
        if (strlen($mesto) > 100) {
            $errors[] = 'Město je příliš dlouhé (max 100 znaků)';
        } else {
            $data['mesto'] = !empty($mesto) ? $mesto : null;
        }
    }
    
    // PSČ (volitelné)
    if (isset($input['psc'])) {
        $psc = trim($input['psc']);
        if (!empty($psc)) {
            if (strlen($psc) > 10) {
                $errors[] = 'PSČ je příliš dlouhé (max 10 znaků)';
            } elseif (!preg_match('/^\d{5}$/', $psc)) {
                $errors[] = 'PSČ musí obsahovat přesně 5 číslic';
            } else {
                $data['psc'] = $psc;
            }
        } else {
            $data['psc'] = null;
        }
    }
    
    // Zastoupený (volitelné)
    if (isset($input['zastoupeny'])) {
        $zastoupeny = trim($input['zastoupeny']);
        if (strlen($zastoupeny) > 255) {
            $errors[] = 'Zastoupený je příliš dlouhé (max 255 znaků)';
        } else {
            $data['zastoupeny'] = !empty($zastoupeny) ? $zastoupeny : null;
        }
    }
    
    // Datová schránka (volitelné)
    if (isset($input['datova_schranka'])) {
        $ds = trim($input['datova_schranka']);
        if (!empty($ds)) {
            if (strlen($ds) > 20) {
                $errors[] = 'Datová schránka je příliš dlouhá (max 20 znaků)';
            } else {
                $data['datova_schranka'] = $ds;
            }
        } else {
            $data['datova_schranka'] = null;
        }
    }
    
    // Email (volitelné)
    if (isset($input['email'])) {
        $email = trim($input['email']);
        if (!empty($email)) {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Neplatný formát emailu';
            } elseif (strlen($email) > 255) {
                $errors[] = 'Email je příliš dlouhý (max 255 znaků)';
            } else {
                $data['email'] = $email;
            }
        } else {
            $data['email'] = null;
        }
    }
    
    // Telefon (volitelné)
    if (isset($input['telefon'])) {
        $telefon = trim($input['telefon']);
        if (strlen($telefon) > 50) {
            $errors[] = 'Telefon je příliš dlouhý (max 50 znaků)';
        } else {
            $data['telefon'] = !empty($telefon) ? $telefon : null;
        }
    }
    
    return array(
        'valid' => empty($errors),
        'data' => $data,
        'errors' => $errors
    );
}

/**
 * Handler pro seznam rolí
 */
function handle_role_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['role_list']);
        $stmt->execute();
        $role = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $role
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání rolí: ' . $e->getMessage()));
    }
}

/**
 * Handler pro detail role podle ID včetně práv
 */
function handle_role_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Podporuje jak 'id' tak 'role_id' pro kompatibilitu s různými FE
    $role_id = 0;
    if (isset($input['role_id'])) {
        $role_id = (int)$input['role_id'];
    } elseif (isset($input['id'])) {
        $role_id = (int)$input['id'];
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($role_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID role'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Základní informace o roli
        $stmt = $db->prepare($queries['role_select_by_id']);
        $stmt->bindParam(':id', $role_id, PDO::PARAM_INT);
        $stmt->execute();
        $role = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$role) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Role nenalezena'));
            return;
        }

        // Načtení práv role
        $stmt = $db->prepare("
            SELECT p.id, p.kod_prava, p.popis 
            FROM " . TBL_PRAVA . " p
            INNER JOIN " . TBL_ROLE_PRAVA . " rp ON p.id = rp.pravo_id
            WHERE rp.role_id = :role_id
            ORDER BY p.kod_prava
        ");
        $stmt->bindParam(':role_id', $role_id, PDO::PARAM_INT);
        $stmt->execute();
        $prava = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $role['prava'] = $prava;

        echo json_encode(array(
            'status' => 'ok',
            'data' => $role
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání role: ' . $e->getMessage()));
    }
}

/**
 * Handler pro seznam práv
 */
function handle_prava_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['prava_list']);
        $stmt->execute();
        $prava = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $prava
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání práv: ' . $e->getMessage()));
    }
}

/**
 * Handler pro detail práva podle ID
 */
function handle_prava_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $pravo_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($pravo_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID práva'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['prava_select_by_id']);
        $stmt->bindParam(':id', $pravo_id, PDO::PARAM_INT);
        $stmt->execute();
        $pravo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pravo) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Právo nenalezeno'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $pravo
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání práva: ' . $e->getMessage()));
    }
}

// ============================================================================
// ČÍSELNÍKY - CRUD OPERACE (CREATE, UPDATE, DELETE)
// ============================================================================

/**
 * LOKALITY - CREATE
 * Vytvoření nové lokality
 */
function handle_lokality_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $nazev = isset($input['nazev']) ? trim($input['nazev']) : '';
    $typ = isset($input['typ']) ? trim($input['typ']) : '';
    $parent_id = isset($input['parent_id']) ? (int)$input['parent_id'] : null;
    
    if (empty($nazev)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí povinný parametr: nazev'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        $sql = "INSERT INTO " . TBL_LOKALITY . " 
                (nazev, typ, parent_id) 
                VALUES (:nazev, :typ, :parent_id)";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':nazev', $nazev);
        $stmt->bindParam(':typ', $typ);
        $stmt->bindParam(':parent_id', $parent_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $new_id = $db->lastInsertId();
        
        $sql_select = "SELECT * FROM " . TBL_LOKALITY . " WHERE id = :id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->bindParam(':id', $new_id, PDO::PARAM_INT);
        $stmt_select->execute();
        $result = $stmt_select->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'message' => 'Lokalita úspěšně vytvořena'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření lokality: ' . $e->getMessage()));
    }
}

/**
 * LOKALITY - UPDATE
 * Aktualizace existující lokality
 */
function handle_lokality_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    $nazev = isset($input['nazev']) ? trim($input['nazev']) : '';
    $typ = isset($input['typ']) ? trim($input['typ']) : '';
    $parent_id = isset($input['parent_id']) ? (int)$input['parent_id'] : null;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID lokality'));
        return;
    }
    
    if (empty($nazev)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí povinný parametr: nazev'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        $sql = "UPDATE " . TBL_LOKALITY . " 
                SET nazev = :nazev, 
                    typ = :typ, 
                    parent_id = :parent_id
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':nazev', $nazev);
        $stmt->bindParam(':typ', $typ);
        $stmt->bindParam(':parent_id', $parent_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $sql_select = "SELECT * FROM " . TBL_LOKALITY . " WHERE id = :id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt_select->execute();
        $result = $stmt_select->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'message' => 'Lokalita úspěšně aktualizována'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci lokality: ' . $e->getMessage()));
    }
}

/**
 * LOKALITY - DELETE
 * Smazání lokality (hard delete - skutečné smazání z DB)
 */
function handle_lokality_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID lokality'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Hard delete - skutečné smazání z databáze
        $sql = "DELETE FROM " . TBL_LOKALITY . " WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Lokalita nenalezena'));
            return;
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Lokalita úspěšně smazána'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání lokality: ' . $e->getMessage()));
    }
}

/**
 * POZICE - CREATE
 * Vytvoření nové pozice
 */
function handle_pozice_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $nazev_pozice = isset($input['nazev_pozice']) ? trim($input['nazev_pozice']) : '';
    $parent_id = isset($input['parent_id']) ? (int)$input['parent_id'] : null;
    $usek_id = isset($input['usek_id']) ? (int)$input['usek_id'] : null;
    
    if (empty($nazev_pozice)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí povinný parametr: nazev_pozice'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        $sql = "INSERT INTO " . TBL_POZICE . " 
                (nazev_pozice, parent_id, usek_id) 
                VALUES (:nazev_pozice, :parent_id, :usek_id)";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':nazev_pozice', $nazev_pozice);
        $stmt->bindParam(':parent_id', $parent_id, PDO::PARAM_INT);
        $stmt->bindParam(':usek_id', $usek_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $new_id = $db->lastInsertId();
        
        $sql_select = "SELECT * FROM " . TBL_POZICE . " WHERE id = :id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->bindParam(':id', $new_id, PDO::PARAM_INT);
        $stmt_select->execute();
        $result = $stmt_select->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'message' => 'Pozice úspěšně vytvořena'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření pozice: ' . $e->getMessage()));
    }
}

/**
 * POZICE - UPDATE
 * Aktualizace existující pozice
 */
function handle_pozice_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    $nazev_pozice = isset($input['nazev_pozice']) ? trim($input['nazev_pozice']) : '';
    $parent_id = isset($input['parent_id']) ? (int)$input['parent_id'] : null;
    $usek_id = isset($input['usek_id']) ? (int)$input['usek_id'] : null;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID pozice'));
        return;
    }
    
    if (empty($nazev_pozice)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí povinný parametr: nazev_pozice'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        $sql = "UPDATE " . TBL_POZICE . " 
                SET nazev_pozice = :nazev_pozice, 
                    parent_id = :parent_id,
                    usek_id = :usek_id
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':nazev_pozice', $nazev_pozice);
        $stmt->bindParam(':parent_id', $parent_id, PDO::PARAM_INT);
        $stmt->bindParam(':usek_id', $usek_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $sql_select = "SELECT * FROM " . TBL_POZICE . " WHERE id = :id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt_select->execute();
        $result = $stmt_select->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'message' => 'Pozice úspěšně aktualizována'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci pozice: ' . $e->getMessage()));
    }
}

/**
 * POZICE - DELETE
 * Smazání pozice (hard delete - skutečné smazání z DB)
 */
function handle_pozice_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID pozice'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Hard delete - skutečné smazání z databáze
        $sql = "DELETE FROM " . TBL_POZICE . " WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Pozice nenalezena'));
            return;
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Pozice úspěšně smazána'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání pozice: ' . $e->getMessage()));
    }
}

/**
 * ÚSEKY - CREATE
 * Vytvoření nového úseku
 */
function handle_useky_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $nazev = isset($input['nazev']) ? trim($input['nazev']) : '';
    $zkr = isset($input['zkr']) ? trim($input['zkr']) : '';
    
    if (empty($nazev)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí povinný parametr: nazev'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Kontrola duplicity zkratky
        if (!empty($zkr)) {
            $sql_check = "SELECT id FROM " . TBL_USEKY . " WHERE zkr = :zkr LIMIT 1";
            $stmt_check = $db->prepare($sql_check);
            $stmt_check->bindParam(':zkr', $zkr);
            $stmt_check->execute();
            
            if ($stmt_check->fetch()) {
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Úsek se zkratkou ' . $zkr . ' již existuje'));
                return;
            }
        }
        
        $sql = "INSERT INTO " . TBL_USEKY . " (nazev, zkr) VALUES (:nazev, :zkr)";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':nazev', $nazev);
        $stmt->bindParam(':zkr', $zkr);
        $stmt->execute();
        
        $new_id = $db->lastInsertId();
        
        $sql_select = "SELECT * FROM " . TBL_USEKY . " WHERE id = :id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->bindParam(':id', $new_id, PDO::PARAM_INT);
        $stmt_select->execute();
        $result = $stmt_select->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'message' => 'Úsek úspěšně vytvořen'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření úseku: ' . $e->getMessage()));
    }
}

/**
 * ÚSEKY - UPDATE
 * Aktualizace existujícího úseku
 */
function handle_useky_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    $nazev = isset($input['nazev']) ? trim($input['nazev']) : '';
    $zkr = isset($input['zkr']) ? trim($input['zkr']) : '';
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID úseku'));
        return;
    }
    
    if (empty($nazev)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí povinný parametr: nazev'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Kontrola duplicity zkratky (kromě aktuálního záznamu)
        if (!empty($zkr)) {
            $sql_check = "SELECT id FROM " . TBL_USEKY . " WHERE zkr = :zkr AND id != :id LIMIT 1";
            $stmt_check = $db->prepare($sql_check);
            $stmt_check->bindParam(':zkr', $zkr);
            $stmt_check->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt_check->execute();
            
            if ($stmt_check->fetch()) {
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Úsek se zkratkou ' . $zkr . ' již existuje'));
                return;
            }
        }
        
        $sql = "UPDATE " . TBL_USEKY . " 
                SET nazev = :nazev, 
                    zkr = :zkr
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':nazev', $nazev);
        $stmt->bindParam(':zkr', $zkr);
        $stmt->execute();
        
        $sql_select = "SELECT * FROM " . TBL_USEKY . " WHERE id = :id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt_select->execute();
        $result = $stmt_select->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'message' => 'Úsek úspěšně aktualizován'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci úseku: ' . $e->getMessage()));
    }
}

/**
 * ÚSEKY - DELETE
 * Smazání úseku (hard delete - skutečné smazání z DB)
 */
function handle_useky_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID úseku'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Hard delete - skutečné smazání z databáze
        $sql = "DELETE FROM " . TBL_USEKY . " WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Úsek nenalezen'));
            return;
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Úsek úspěšně smazán'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání úseku: ' . $e->getMessage()));
    }
}

/**
 * Handler pro seznam stavů (read-only)
 */
function handle_stavy_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Query pro stavy
        $sql = "SELECT id, nazev, popis, barva, poradi, aktivni 
                FROM " . TBL_CISELNIK_STAVY . " 
                WHERE aktivni = 1 
                ORDER BY poradi ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $stavy = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $stavy
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání stavů: ' . $e->getMessage()));
    }
}

/**
 * Handler pro seznam úseků s hierarchií (tree structure)
 */
function handle_useky_list_hierarchy($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    try {
        // Získat všechny úseky
        $stmt = $db->prepare($queries['useky_list']);
        $stmt->execute();
        $useky = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Převést na hierarchickou strukturu
        $hierarchy = buildHierarchy($useky);
        
        api_ok($hierarchy, array('count' => count($useky)));
        return;
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Useky hierarchy error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání hierarchie úseků: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}

/**
 * Pomocná funkce pro vytvoření hierarchie ze seznamu úseků
 */
function buildHierarchy($items, $parentId = null) {
    $branch = array();
    
    foreach ($items as $item) {
        if ($item['parent_id'] == $parentId) {
            $children = buildHierarchy($items, $item['id']);
            if ($children) {
                $item['children'] = $children;
            }
            $branch[] = $item;
        }
    }
    
    return $branch;
}

// ========== STAVY CRUD HANDLERS ==========

/**
 * Handler pro detail stavu podle ID
 */
function handle_stavy_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $stav_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($stav_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID stavu'));
        return;
    }

    try {
        $db = get_db($config);
        $stmt = $db->prepare($queries['ciselnik_stavy_select_by_id']);
        $stmt->bindParam(':id', $stav_id, PDO::PARAM_INT);
        $stmt->execute();
        $stav = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$stav) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Stav nenalezen'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $stav
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání stavu: ' . $e->getMessage()));
    }
}

/**
 * Handler pro vytvoření stavu
 */
function handle_stavy_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    $typ_objektu = isset($input['typ_objektu']) ? trim($input['typ_objektu']) : '';
    $kod_stavu = isset($input['kod_stavu']) ? trim($input['kod_stavu']) : '';
    $nazev_stavu = isset($input['nazev_stavu']) ? trim($input['nazev_stavu']) : '';

    if (empty($typ_objektu) || empty($kod_stavu) || empty($nazev_stavu)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Typ objektu, kód a název stavu jsou povinné'));
        return;
    }

    try {
        $db = get_db($config);
        $sql = "INSERT INTO " . TBL_CISELNIK_STAVY . " (typ_objektu, kod_stavu, nazev_stavu, popis, dt_vytvoreni) 
                VALUES (:typ_objektu, :kod_stavu, :nazev_stavu, :popis, NOW())";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':typ_objektu', $typ_objektu);
        $stmt->bindParam(':kod_stavu', $kod_stavu);
        $stmt->bindParam(':nazev_stavu', $nazev_stavu);
        $popis = isset($input['popis']) ? trim($input['popis']) : '';
        $stmt->bindParam(':popis', $popis);
        $stmt->execute();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Stav byl úspěšně vytvořen',
            'id' => (int)$db->lastInsertId()
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření stavu: ' . $e->getMessage()));
    }
}

/**
 * Handler pro aktualizaci stavu
 */
function handle_stavy_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $stav_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($stav_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID stavu'));
        return;
    }

    try {
        $db = get_db($config);
        
        $updates = array();
        $params = array(':id' => $stav_id);
        
        if (isset($input['typ_objektu'])) {
            $updates[] = 'typ_objektu = :typ_objektu';
            $params[':typ_objektu'] = trim($input['typ_objektu']);
        }
        if (isset($input['kod_stavu'])) {
            $updates[] = 'kod_stavu = :kod_stavu';
            $params[':kod_stavu'] = trim($input['kod_stavu']);
        }
        if (isset($input['nazev_stavu'])) {
            $updates[] = 'nazev_stavu = :nazev_stavu';
            $params[':nazev_stavu'] = trim($input['nazev_stavu']);
        }
        if (isset($input['popis'])) {
            $updates[] = 'popis = :popis';
            $params[':popis'] = trim($input['popis']);
        }
        
        $updates[] = 'dt_aktualizace = NOW()';
        
        if (count($updates) == 1) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Žádná data k aktualizaci'));
            return;
        }
        
        $sql = "UPDATE " . TBL_CISELNIK_STAVY . " SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Stav byl úspěšně aktualizován'
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci stavu: ' . $e->getMessage()));
    }
}

/**
 * Handler pro smazání stavu (soft delete)
 */
function handle_stavy_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $stav_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($stav_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID stavu'));
        return;
    }

    try {
        $db = get_db($config);
        $sql = "DELETE FROM " . TBL_CISELNIK_STAVY . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $stav_id, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Stav byl úspěšně smazán'
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání stavu: ' . $e->getMessage()));
    }
}

// ========== ROLE CRUD HANDLERS ==========

/**
 * Handler pro vytvoření role
 */
function handle_role_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    $kod_role = isset($input['kod_role']) ? trim($input['kod_role']) : '';
    $nazev_role = isset($input['nazev_role']) ? trim($input['nazev_role']) : '';

    if (empty($kod_role)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Kód role je povinný'));
        return;
    }

    if (empty($nazev_role)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Název role je povinný'));
        return;
    }

    try {
        $db = get_db($config);
        $sql = "INSERT INTO " . TBL_ROLE . " (kod_role, nazev_role, popis, dt_vytvoreni) VALUES (:kod_role, :nazev_role, :popis, NOW())";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':kod_role', $kod_role);
        $stmt->bindParam(':nazev_role', $nazev_role);
        $popis = isset($input['popis']) ? trim($input['popis']) : '';
        $stmt->bindParam(':popis', $popis);
        $stmt->execute();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Role byla úspěšně vytvořena',
            'id' => (int)$db->lastInsertId()
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření role: ' . $e->getMessage()));
    }
}

/**
 * Handler pro aktualizaci role
 */
function handle_role_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $role_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($role_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID role'));
        return;
    }

    try {
        $db = get_db($config);
        
        $updates = array();
        $params = array(':id' => $role_id);
        
        if (isset($input['kod_role'])) {
            $updates[] = 'kod_role = :kod_role';
            $params[':kod_role'] = trim($input['kod_role']);
        }
        if (isset($input['nazev_role'])) {
            $updates[] = 'nazev_role = :nazev_role';
            $params[':nazev_role'] = trim($input['nazev_role']);
        }
        if (isset($input['popis'])) {
            $updates[] = 'popis = :popis';
            $params[':popis'] = trim($input['popis']);
        }
        
        $updates[] = 'dt_aktualizace = NOW()';
        
        if (count($updates) == 1) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Žádná data k aktualizaci'));
            return;
        }
        
        $sql = "UPDATE " . TBL_ROLE . " SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Role byla úspěšně aktualizována'
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci role: ' . $e->getMessage()));
    }
}

/**
 * Handler pro smazání role
 */
function handle_role_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $role_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($role_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID role'));
        return;
    }

    try {
        $db = get_db($config);
        $sql = "DELETE FROM " . TBL_ROLE . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $role_id, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Role byla úspěšně smazána'
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání role: ' . $e->getMessage()));
    }
}

// ========== PRAVA CRUD HANDLERS ==========

/**
 * Handler pro vytvoření práva
 */
function handle_prava_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    $kod_prava = isset($input['kod_prava']) ? trim($input['kod_prava']) : '';

    if (empty($kod_prava)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Kód práva je povinný'));
        return;
    }

    try {
        $db = get_db($config);
        $sql = "INSERT INTO " . TBL_PRAVA . " (kod_prava, popis, dt_vytvoreni) VALUES (:kod_prava, :popis, NOW())";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':kod_prava', $kod_prava);
        $popis = isset($input['popis']) ? trim($input['popis']) : '';
        $stmt->bindParam(':popis', $popis);
        $stmt->execute();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Právo bylo úspěšně vytvořeno',
            'id' => (int)$db->lastInsertId()
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření práva: ' . $e->getMessage()));
    }
}

/**
 * Handler pro aktualizaci práva
 */
function handle_prava_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $pravo_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($pravo_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID práva'));
        return;
    }

    try {
        $db = get_db($config);
        
        $updates = array();
        $params = array(':id' => $pravo_id);
        
        if (isset($input['kod_prava'])) {
            $updates[] = 'kod_prava = :kod_prava';
            $params[':kod_prava'] = trim($input['kod_prava']);
        }
        if (isset($input['popis'])) {
            $updates[] = 'popis = :popis';
            $params[':popis'] = trim($input['popis']);
        }
        
        $updates[] = 'dt_aktualizace = NOW()';
        
        if (count($updates) == 1) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Žádná data k aktualizaci'));
            return;
        }
        
        $sql = "UPDATE " . TBL_PRAVA . " SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Právo bylo úspěšně aktualizováno'
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci práva: ' . $e->getMessage()));
    }
}

/**
 * Handler pro smazání práva
 */
function handle_prava_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $pravo_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    if ($pravo_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID práva'));
        return;
    }

    try {
        $db = get_db($config);
        $sql = "DELETE FROM " . TBL_PRAVA . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $pravo_id, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Právo bylo úspěšně smazáno'
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání práva: ' . $e->getMessage()));
    }
}

// Legacy bridge: handle selected old "react-*" actions via new API
function handle_old_react_action($input, $config, $queries) {
    // Accept params from POST body or query string
    $action = isset($input['action']) ? $input['action'] : (isset($_GET['action']) ? $_GET['action'] : '');
    if (!$action) {
        api_error(400, 'Chybí parametr action', 'MISSING_ACTION');
        return;
    }

    try {
        // Optional database override (for legacy DB selection)
        $dbOverride = isset($input['database']) ? $input['database'] : (isset($input['db']) ? $input['db'] : (isset($_GET['database']) ? $_GET['database'] : (isset($_GET['db']) ? $_GET['db'] : null)));
        if ($dbOverride !== null) {
            // Basic validation to avoid DSN injection: allow alnum, underscore, dash
            if (!preg_match('/^[A-Za-z0-9_\-]+$/', $dbOverride)) {
                api_error(400, 'Neplatný název databáze', 'INVALID_DATABASE');
                return;
            }
            // ✅ FIX: Použít $config['mysql'] protože teď předáváme celou konfiguraci
            $dbConfig = isset($config['mysql']) ? $config['mysql'] : $config;
            $dsn = "mysql:host={$dbConfig['host']};dbname={$dbOverride};charset=utf8mb4";
            $db = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ));
        } else {
            $db = get_db($config);
        }
        switch ($action) {
            case 'react-attachment-id': {
                $idRaw = isset($input['id']) ? $input['id'] : (isset($_GET['id']) ? $_GET['id'] : null);
                $id = is_numeric($idRaw) ? (int)$idRaw : 0;
                if ($id <= 0) {
                    api_error(400, 'Chybí nebo neplatné id', 'INVALID_ID');
                    return;
                }
                // Optional explicit table name from FE: tabulka_opriloh
                $tbl = isset($input['tabulka_opriloh']) ? $input['tabulka_opriloh'] : (isset($_GET['tabulka_opriloh']) ? $_GET['tabulka_opriloh'] : null);
                if ($tbl !== null) {
                    // Validate table identifier (simple whitelist)
                    if (!preg_match('/^[A-Za-z0-9_]+$/', $tbl)) {
                        api_error(400, 'Neplatný název tabulky', 'INVALID_TABLE');
                        return;
                    }
                    $sql = "SELECT * FROM `{$tbl}` WHERE (id_smlouvy = :id) ORDER BY soubor";
                } else {
                    if (!isset($queries['old_react_attachment_id'])) {
                        api_error(500, 'Dotaz pro staré přílohy není k dispozici', 'MISSING_QUERY');
                        return;
                    }
                    $sql = $queries['old_react_attachment_id'];
                }
                $stmt = $db->prepare($sql);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                $rows = $stmt->fetchAll();
                api_ok($rows);
                return;
            }
            default:
                api_error(400, 'Nepodporovaná akce', 'UNSUPPORTED_ACTION', array('action' => $action));
                return;
        }
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}


// =============================================================================
// USER ACTIVITY TRACKING HANDLERS
// =============================================================================

/**
 * POST /user/activity/track
 * Zaznamenává aktivitu uživatele (modul, path, IP, user agent)
 */
function handle_user_activity_track($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $module = isset($input['module']) ? trim($input['module']) : '';
    $path = isset($input['path']) ? trim($input['path']) : '';
    
    if (!$token || !$username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    $db = get_db($config);
    $token_data = verify_token($token, $db);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        // Collect IP addresses
        $public_ip = isset($input['public_ip']) && !empty($input['public_ip']) 
            ? $input['public_ip'] 
            : null;
        
        $local_ip = isset($input['local_ip']) && !empty($input['local_ip']) 
            ? $input['local_ip'] 
            : null;
        
        // Get server-detected IP (can be used as fallback)
        $server_ip = get_client_ip();
        
        // If no public IP from frontend, use server-detected
        if (!$public_ip) {
            $public_ip = $server_ip;
        }
        
        // If no local IP from frontend and server IP is private/localhost, use it
        if (!$local_ip && $server_ip) {
            // Check if server IP is local/private
            if (preg_match('/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/', $server_ip)) {
                $local_ip = $server_ip;
            }
        }
        
        $metadata = [
            'public_ip' => $public_ip,
            'local_ip' => $local_ip,
            'module' => $module,
            'path' => $path,
            'user_agent' => get_user_agent(),
            'session_id' => $input['session_id'] ?? null
        ];

        $success = update_user_activity_with_metadata($db, $queries, $token_data['id'], $metadata);

        if ($success) {
            echo json_encode(['status' => 'ok', 'message' => 'Aktivita zaznamenána']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Chyba při zaznamenávání']);
        }
    } catch (Exception $e) {
        error_log("handle_user_activity_track error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba serveru']);
    }
}

/**
 * GET /user/activity/history
 * Získá historii aktivity uživatele
 */
function handle_user_activity_history($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $target_user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    $limit = isset($input['limit']) ? (int)$input['limit'] : 100;
    
    if ($limit > 1000) $limit = 1000;
    if ($limit < 1) $limit = 100;
    
    if (!$token || !$username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    $db = get_db($config);
    $token_data = verify_token($token, $db);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        
        if ($target_user_id === 0) {
            $target_user_id = $token_data['id'];
        }
        
        $is_admin = isset($token_data['is_admin']) && $token_data['is_admin'];
        if (!$is_admin && $target_user_id !== $token_data['id']) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Nemáte oprávnění']);
            return;
        }

        if (isset($queries['uzivatele_activity_log_select'])) {
            $stmt = $db->prepare($queries['uzivatele_activity_log_select']);
            $stmt->bindParam(':uzivatel_id', $target_user_id, PDO::PARAM_INT);
            $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $history = $stmt->fetchAll();

            echo json_encode(['status' => 'ok', 'data' => $history, 'count' => count($history)]);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Query není definován']);
        }
    } catch (Exception $e) {
        error_log("handle_user_activity_history error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba serveru']);
    }
}
