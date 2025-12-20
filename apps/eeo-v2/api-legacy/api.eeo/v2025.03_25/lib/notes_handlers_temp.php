<?php

require_once __DIR__ . '/../../api.php';
// TODO/NOTES API Handlers (Final Design v2025.03_25)
// Konzistentní API struktura s ostatními endpointy

// ========== TODO/NOTES API HANDLERS (Final Design v2025.03_25) ==========

/**
 * LOAD API - Načte TODO/NOTES pro uživatele a typ
 * Endpoint: POST /todonotes/load
 * Parametry: username, token, typ (TODO|NOTES), user_id
 */
function handle_todonotes_load($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token', 'typ', 'user_id'];
    foreach ($required as $param) {
        if (!isset($input[$param]) || empty($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $typ = strtoupper(trim($input['typ']));
    $target_user_id = (int)$input['user_id'];
    
    // Validace typu
    if (!in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return;
    }
    
    // Kontrola oprávnění (může načítat pouze své záznamy)
    if ($token_data['id'] !== $target_user_id) {
        api_error(403, 'Nemáte oprávnění k těmto datům', 'FORBIDDEN');
        return;
    }
    
    try {
        // Načtení existujícího záznamu
        $stmt = $db->prepare($queries['uzivatele_poznamky_select_by_user_type']);
        $stmt->bindValue(':user_id', $target_user_id, PDO::PARAM_INT);
        $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            // Existující záznam
            api_ok([
                'id' => (int)$row['id'],
                'user_id' => (int)$row['user_id'],
                'typ' => $row['typ'],
                'content' => json_decode($row['obsah'], true),
                'dt_vytvoreni' => $row['dt_vytvoreni'],
                'dt_aktualizace' => $row['dt_aktualizace'],
                'is_new' => false
            ]);
        } else {
            // Nový záznam (neexistuje)
            $default_content = ($typ === 'TODO') ? 
                ['items' => [], 'settings' => ['show_completed' => true, 'sort_by' => 'priority']] :
                ['sections' => [], 'settings' => ['auto_save' => true, 'editor_mode' => 'html']];
                
            api_ok([
                'id' => null,
                'user_id' => $target_user_id,
                'typ' => $typ,
                'content' => $default_content,
                'dt_vytvoreni' => null,
                'dt_aktualizace' => null,
                'is_new' => true
            ]);
        }
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání dat: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * SAVE API - Uloží (INSERT/UPDATE) TODO/NOTES obsah
 * Endpoint: POST /todonotes/save
 * Parametry: username, token, typ (TODO|NOTES), content, [id]
 */
function handle_todonotes_save($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token', 'typ', 'content'];
    foreach ($required as $param) {
        if (!isset($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $typ = strtoupper(trim($input['typ']));
    $content = $input['content'];
    $record_id = isset($input['id']) ? (int)$input['id'] : null;
    
    // Validace typu
    if (!in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return;
    }
    
    $user_id = $token_data['id'];
    
    // Validace a konverze content na JSON
    $content_json = json_encode($content, JSON_UNESCAPED_UNICODE);
    if ($content_json === false) {
        api_error(400, 'Neplatný JSON v content', 'INVALID_JSON');
        return;
    }
    
    try {
        if ($record_id) {
            // UPDATE existující záznam
            $stmt = $db->prepare($queries['uzivatele_poznamky_update']);
            $stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
            $stmt->bindValue(':obsah', $content_json, PDO::PARAM_STR);
            $result = $stmt->execute();
            
            if ($result && $stmt->rowCount() > 0) {
                api_ok([
                    'message' => 'Data byla úspěšně aktualizována',
                    'action' => 'UPDATE',
                    'id' => $record_id,
                    'user_id' => $user_id,
                    'typ' => $typ,
                    'content_length' => strlen($content_json)
                ]);
            } else {
                api_error(404, 'Záznam s daným ID neexistuje', 'RECORD_NOT_FOUND');
            }
            
        } else {
            // INSERT nový záznam
            $stmt = $db->prepare($queries['uzivatele_poznamky_insert']);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
            $stmt->bindValue(':obsah', $content_json, PDO::PARAM_STR);
            $result = $stmt->execute();
            
            if ($result) {
                $new_id = $db->lastInsertId();
                api_ok([
                    'message' => 'Nový záznam byl vytvořen',
                    'action' => 'INSERT',
                    'id' => (int)$new_id,
                    'user_id' => $user_id,
                    'typ' => $typ,
                    'content_length' => strlen($content_json)
                ]);
            } else {
                api_error(500, 'Chyba při vytváření záznamu', 'SAVE_ERROR');
            }
        }
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při ukládání dat: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * DELETE API - Smaže konkrétní záznam
 * Endpoint: POST /todonotes/delete
 * Parametry: username, token, typ, id
 */
function handle_todonotes_delete($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token', 'typ', 'id'];
    foreach ($required as $param) {
        if (!isset($input[$param]) || empty($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $typ = strtoupper(trim($input['typ']));
    $record_id = (int)$input['id'];
    
    // Validace typu
    if (!in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return;
    }
    
    try {
        // Ověření, že záznam existuje a patří uživateli
        $stmt = $db->prepare("SELECT user_id FROM ".TBL_UZIVATELE_POZNAMKY." WHERE id = :id AND typ = :typ");
        $stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
        $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            api_error(404, 'Záznam s daným ID neexistuje', 'RECORD_NOT_FOUND');
            return;
        }
        
        if ((int)$row['user_id'] !== (int)$token_data['id']) {
            api_error(403, 'Nemáte oprávnění smazat tento záznam', 'FORBIDDEN');
            return;
        }
        
        // Smazání záznamu
        $stmt = $db->prepare("DELETE FROM ".TBL_UZIVATELE_POZNAMKY." WHERE id = :id");
        $stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
        $result = $stmt->execute();
        
        if ($result && $stmt->rowCount() > 0) {
            api_ok([
                'message' => 'Záznam byl úspěšně smazán',
                'id' => $record_id,
                'typ' => $typ
            ]);
        } else {
            api_error(500, 'Chyba při mazání záznamu', 'DELETE_ERROR');
        }
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při mazání záznamu: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * BY-ID API - Načte konkrétní záznam podle ID
 * Endpoint: POST /todonotes/by-id
 * Parametry: username, token, id
 */
function handle_todonotes_by_id($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token', 'id'];
    foreach ($required as $param) {
        if (!isset($input[$param]) || empty($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $record_id = (int)$input['id'];
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return;
    }
    
    try {
        // Načtení záznamu
        $stmt = $db->prepare("SELECT * FROM ".TBL_UZIVATELE_POZNAMKY." WHERE id = :id");
        $stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            api_error(404, 'Záznam s daným ID neexistuje', 'RECORD_NOT_FOUND');
            return;
        }
        
        // Kontrola oprávnění
        if ((int)$row['user_id'] !== (int)$token_data['id']) {
            api_error(403, 'Nemáte oprávnění k tomuto záznamu', 'FORBIDDEN');
            return;
        }
        
        api_ok([
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'typ' => $row['typ'],
            'content' => json_decode($row['obsah'], true),
            'dt_vytvoreni' => $row['dt_vytvoreni'],
            'dt_aktualizace' => $row['dt_aktualizace']
        ]);
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání záznamu: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * SEARCH API - Fulltextové vyhledávání
 * Endpoint: POST /todonotes/search
 * Parametry: username, token, search, [typ], [limit]
 */
function handle_todonotes_search($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token', 'search'];
    foreach ($required as $param) {
        if (!isset($input[$param]) || empty($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $search_term = trim($input['search']);
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : null;
    $limit = isset($input['limit']) ? (int)$input['limit'] : 10;
    
    // Validace typu
    if ($typ && !in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    if ($limit > 100) $limit = 100; // Max 100 výsledků
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return;
    }
    
    try {
        $sql = "SELECT *, MATCH(obsah) AGAINST(:search_term IN BOOLEAN MODE) as match_score 
                FROM ".TBL_UZIVATELE_POZNAMKY." 
                WHERE user_id = :user_id 
                AND MATCH(obsah) AGAINST(:search_term IN BOOLEAN MODE)";
        
        if ($typ) {
            $sql .= " AND typ = :typ";
        }
        
        $sql .= " ORDER BY match_score DESC, dt_aktualizace DESC LIMIT :limit";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $stmt->bindValue(':search_term', $search_term, PDO::PARAM_STR);
        if ($typ) {
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = [
                'id' => (int)$row['id'],
                'typ' => $row['typ'],
                'content' => json_decode($row['obsah'], true),
                'dt_vytvoreni' => $row['dt_vytvoreni'],
                'match_score' => round((float)$row['match_score'], 2)
            ];
        }
        
        api_ok($results, [
            'total_found' => count($results),
            'search_term' => $search_term,
            'search_in_types' => $typ ? [$typ] : ['TODO', 'NOTES']
        ]);
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při vyhledávání: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * WITH-DETAILS API - Načte záznamy s dodatečnými informacemi
 * Endpoint: POST /todonotes/with-details
 * Parametry: username, token, [typ], [include_stats], [include_mentions]
 */
function handle_todonotes_with_details($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token'];
    foreach ($required as $param) {
        if (!isset($input[$param]) || empty($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : null;
    $include_stats = isset($input['include_stats']) ? (bool)$input['include_stats'] : true;
    $include_mentions = isset($input['include_mentions']) ? (bool)$input['include_mentions'] : true;
    
    // Validace typu
    if ($typ && !in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return;
    }
    
    try {
        $sql = "SELECT * FROM ".TBL_UZIVATELE_POZNAMKY." WHERE user_id = :user_id";
        if ($typ) {
            $sql .= " AND typ = :typ";
        }
        $sql .= " ORDER BY dt_aktualizace DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        if ($typ) {
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
        }
        $stmt->execute();
        
        $results = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $content = json_decode($row['obsah'], true);
            $obsah_text = json_encode($content, JSON_UNESCAPED_UNICODE);
            
            $item = [
                'id' => (int)$row['id'],
                'typ' => $row['typ'],
                'content' => $content,
                'dt_vytvoreni' => $row['dt_vytvoreni']
            ];
            
            // Přidání statistik
            if ($include_stats) {
                if ($row['typ'] === 'TODO' && isset($content['items'])) {
                    $total_items = count($content['items']);
                    $completed_items = 0;
                    foreach ($content['items'] as $todo_item) {
                        if (isset($todo_item['completed']) && $todo_item['completed']) {
                            $completed_items++;
                        }
                    }
                    $item['stats'] = [
                        'total_items' => $total_items,
                        'completed_items' => $completed_items,
                        'pending_items' => $total_items - $completed_items,
                        'word_count' => str_word_count($obsah_text),
                        'char_count' => strlen($obsah_text)
                    ];
                } else {
                    $item['stats'] = [
                        'word_count' => str_word_count($obsah_text),
                        'char_count' => strlen($obsah_text)
                    ];
                }
            }
            
            // Přidání zmínek
            if ($include_mentions) {
                preg_match_all('/@([a-zA-Z0-9_]+)/', $obsah_text, $matches);
                $item['mentions'] = array_unique($matches[0]);
                
                preg_match_all('/#([a-zA-Z0-9_]+)/', $obsah_text, $tag_matches);
                $item['tags'] = array_unique($tag_matches[0]);
            }
            
            $results[] = $item;
        }
        
        $includes = [];
        if ($include_stats) $includes[] = 'stats';
        if ($include_mentions) $includes[] = 'mentions';
        
        api_ok($results, [
            'includes' => $includes,
            'total_records' => count($results)
        ]);
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání detailů: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * RECENT API - Načte poslední záznamy podle data
 * Endpoint: POST /todonotes/recent
 * Parametry: username, token, [days], [limit], [typ]
 */
function handle_todonotes_recent($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token'];
    foreach ($required as $param) {
        if (!isset($input[$param]) || empty($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $days = isset($input['days']) ? (int)$input['days'] : 7;
    $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : null;
    
    // Validace typu
    if ($typ && !in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    if ($limit > 100) $limit = 100; // Max 100 výsledků
    if ($days > 365) $days = 365; // Max 1 rok zpět
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return;
    }
    
    try {
        $sql = "SELECT *, 
                DATEDIFF(NOW(), dt_aktualizace) as days_ago
                FROM ".TBL_UZIVATELE_POZNAMKY." 
                WHERE user_id = :user_id 
                AND dt_aktualizace >= DATE_SUB(NOW(), INTERVAL :days DAY)";
        
        if ($typ) {
            $sql .= " AND typ = :typ";
        }
        
        $sql .= " ORDER BY dt_aktualizace DESC LIMIT :limit";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $stmt->bindValue(':days', $days, PDO::PARAM_INT);
        if ($typ) {
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = [];
        $oldest_record = null;
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = [
                'id' => (int)$row['id'],
                'typ' => $row['typ'],
                'content' => json_decode($row['obsah'], true),
                'dt_vytvoreni' => $row['dt_vytvoreni'],
                'days_ago' => (int)$row['days_ago']
            ];
            
            if (!$oldest_record || $row['dt_aktualizace'] < $oldest_record) {
                $oldest_record = $row['dt_aktualizace'];
            }
        }
        
        api_ok($results, [
            'period_days' => $days,
            'total_found' => count($results),
            'oldest_record' => $oldest_record
        ]);
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání posledních záznamů: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * STATS API - Admin statistiky
 * Endpoint: POST /todonotes/stats
 * Parametry: username, token, [period], [include_users]
 */
function handle_todonotes_stats($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token'];
    foreach ($required as $param) {
        if (!isset($input[$param]) || empty($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $period = isset($input['period']) ? $input['period'] : 'month';
    $include_users = isset($input['include_users']) ? (bool)$input['include_users'] : true;
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return;
    }
    
    // Kontrola admin oprávnění (předpokládáme admin username)
    if ($username !== 'admin') {
        api_error(403, 'Pouze admin má přístup ke statistikám', 'ADMIN_REQUIRED');
        return;
    }
    
    try {
        // Celkové statistiky
        $stmt = $db->prepare("SELECT typ, COUNT(*) as total FROM ".TBL_UZIVATELE_POZNAMKY." GROUP BY typ");
        $stmt->execute();
        $overview = ['total_todos' => 0, 'total_notes' => 0, 'total_users' => 0, 'active_users_period' => 0];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if ($row['typ'] === 'TODO') {
                $overview['total_todos'] = (int)$row['total'];
            } else if ($row['typ'] === 'NOTES') {
                $overview['total_notes'] = (int)$row['total'];
            }
        }
        
        // Počet uživatelů
        $stmt = $db->prepare("SELECT COUNT(DISTINCT user_id) as total_users FROM ".TBL_UZIVATELE_POZNAMKY."");
        $stmt->execute();
        $overview['total_users'] = (int)$stmt->fetchColumn();
        
        // Aktivní uživatelé v období
        $period_sql = "1 MONTH";
        if ($period === 'week') $period_sql = "1 WEEK";
        else if ($period === 'year') $period_sql = "1 YEAR";
        
        $stmt = $db->prepare("SELECT COUNT(DISTINCT user_id) as active_users 
                             FROM ".TBL_UZIVATELE_POZNAMKY." 
                             WHERE dt_aktualizace >= DATE_SUB(NOW(), INTERVAL $period_sql)");
        $stmt->execute();
        $overview['active_users_period'] = (int)$stmt->fetchColumn();
        
        // Statistiky období
        $stmt = $db->prepare("SELECT typ, 
                             COUNT(*) as created,
                             SUM(CASE WHEN dt_vytvoreni != dt_aktualizace THEN 1 ELSE 0 END) as updated
                             FROM ".TBL_UZIVATELE_POZNAMKY." 
                             WHERE dt_vytvoreni >= DATE_SUB(NOW(), INTERVAL $period_sql)
                             GROUP BY typ");
        $stmt->execute();
        
        $period_stats = ['period' => $period, 'todos_created' => 0, 'notes_created' => 0, 'todos_updated' => 0, 'notes_updated' => 0];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if ($row['typ'] === 'TODO') {
                $period_stats['todos_created'] = (int)$row['created'];
                $period_stats['todos_updated'] = (int)$row['updated'];
            } else if ($row['typ'] === 'NOTES') {
                $period_stats['notes_created'] = (int)$row['created'];
                $period_stats['notes_updated'] = (int)$row['updated'];
            }
        }
        
        $response = [
            'overview' => $overview,
            'period_stats' => $period_stats,
            'trends' => [
                'most_active_day' => date('Y-m-d', strtotime('-1 day')), // Placeholder
                'avg_daily_items' => round(($overview['total_todos'] + $overview['total_notes']) / 30, 1),
                'growth_rate' => '+15%' // Placeholder
            ]
        ];
        
        // Detaily uživatelů
        if ($include_users) {
            $stmt = $db->prepare("SELECT u.username, up.user_id,
                                 SUM(CASE WHEN up.typ = 'TODO' THEN 1 ELSE 0 END) as todos_count,
                                 SUM(CASE WHEN up.typ = 'NOTES' THEN 1 ELSE 0 END) as notes_count,
                                 MAX(up.dt_aktualizace) as last_activity
                                 FROM ".TBL_UZIVATELE_POZNAMKY." up
                                 JOIN uzivatele u ON u.id = up.user_id
                                 GROUP BY up.user_id, u.username
                                 ORDER BY last_activity DESC
                                 LIMIT 20");
            $stmt->execute();
            
            $user_activity = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $user_activity[] = [
                    'username' => $row['username'],
                    'user_id' => (int)$row['user_id'],
                    'todos_count' => (int)$row['todos_count'],
                    'notes_count' => (int)$row['notes_count'],
                    'last_activity' => $row['last_activity']
                ];
            }
            $response['user_activity'] = $user_activity;
        }
        
        api_ok($response, [
            'generated_at' => date('Y-m-d H:i:s'),
            'admin_user' => $username,
            'includes' => $include_users ? ['users', 'trends'] : ['trends']
        ]);
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání statistik: ' . $e->getMessage(), 'DB_ERROR');
    }
}