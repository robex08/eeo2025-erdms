<?php

require_once __DIR__ . '/../../api.php';
// TODO/NOTES API Handlers (Final Design v2025.03_25)
// Konzistentní API struktura s ostatními endpointy

/**
 * Načtení poznámek/TODO pro uživatele
 * Endpoint: POST /user/notes
 * Parametry: token, username, [typ] (TODO|NOTES - volitelný)
 */
function handle_user_notes_get($input, $config, $queries) {
    // Ověření tokenu
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
    
    $user_id = $token_data['id'];
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : null;
    
    // Validace typu
    if ($typ && !in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené hodnoty: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    try {
        if ($typ) {
            // Načtení konkrétního typu
            $stmt = $db->prepare($queries['uzivatele_poznamky_select_by_user_type']);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) {
                // Vytvořit prázdný záznam pokud neexistuje
                $default_content = '{"content":"","settings":{"auto_save":true}}';
                
                $result = [
                    'id' => null,
                    'user_id' => $user_id,
                    'typ' => $typ,
                    'obsah' => $default_content,
                    'dt_vytvoreni' => null,
                    'dt_aktualizace' => null
                ];
            }
            
            // Parsovat JSON obsah
            if ($result['obsah']) {
                $result['obsah_parsed'] = json_decode($result['obsah'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $result['obsah_parsed'] = null;
                    $result['json_error'] = json_last_error_msg();
                }
            }
            
            api_ok($result);
        } else {
            // Načtení všech typů pro uživatele
            $stmt = $db->prepare($queries['uzivatele_poznamky_select_by_user']);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parsovat JSON obsah pro všechny záznamy
            foreach ($results as &$result) {
                if ($result['obsah']) {
                    $result['obsah_parsed'] = json_decode($result['obsah'], true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        $result['obsah_parsed'] = null;
                        $result['json_error'] = json_last_error_msg();
                    }
                }
            }
            
            // Zajistit, že máme oba typy (vytvořit default pokud chybí)
            $found_types = array_column($results, 'typ');
            $required_types = ['TODO', 'NOTES'];
            
            foreach ($required_types as $required_type) {
                if (!in_array($required_type, $found_types)) {
                    $default_content = '{"content":"","settings":{"auto_save":true}}';
                    
                    $results[] = [
                        'id' => null,
                        'user_id' => $user_id,
                        'typ' => $required_type,
                        'obsah' => $default_content,
                        'obsah_parsed' => json_decode($default_content, true),
                        'dt_vytvoreni' => null,
                        'dt_aktualizace' => null
                    ];
                }
            }
            
            // Seřadit podle typu
            usort($results, function($a, $b) {
                return strcmp($a['typ'], $b['typ']);
            });
            
            api_ok($results, ['count' => count($results)]);
        }
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("User notes get error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání poznámek: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Uložení poznámek/TODO pro uživatele
 * Endpoint: POST /user/notes/save
 * Parametry: token, username, typ (TODO|NOTES), obsah (JSON string nebo object)
 */
function handle_user_notes_save($input, $config, $queries) {
    // Ověření tokenu
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
    
    $user_id = $token_data['id'];
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : '';
    $obsah = isset($input['obsah']) ? $input['obsah'] : '';
    
    // Validace povinných polí
    if (!in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Povinné pole typ. Povolené hodnoty: TODO, NOTES', 'MISSING_TYPE');
        return;
    }
    
    if (empty($obsah)) {
        api_error(400, 'Povinné pole obsah', 'MISSING_CONTENT');
        return;
    }
    
    // Zpracování obsahu - pokud je to již JSON string, nech ho, jinak enkóduj
    if (is_array($obsah) || is_object($obsah)) {
        $obsah_json = json_encode($obsah, JSON_UNESCAPED_UNICODE);
    } else {
        // Ověř, že je to platný JSON
        $test_decode = json_decode($obsah, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            api_error(400, 'Obsah musí být platný JSON: ' . json_last_error_msg(), 'INVALID_JSON');
            return;
        }
        $obsah_json = $obsah;
    }
    
    try {
        // Použít UPSERT (INSERT ON DUPLICATE KEY UPDATE)
        $stmt = $db->prepare($queries['uzivatele_poznamky_upsert']);
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
        $stmt->bindValue(':obsah', $obsah_json, PDO::PARAM_STR);
        $stmt->execute();
        
        $affected_rows = $stmt->rowCount();
        $was_insert = $affected_rows === 1;
        $was_update = $affected_rows === 2; // ON DUPLICATE KEY UPDATE reports 2 rows
        
        // Načtení aktualizovaného záznamu
        $stmt_select = $db->prepare($queries['uzivatele_poznamky_select_by_user_type']);
        $stmt_select->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt_select->bindValue(':typ', $typ, PDO::PARAM_STR);
        $stmt_select->execute();
        $saved_record = $stmt_select->fetch(PDO::FETCH_ASSOC);
        
        if ($saved_record && $saved_record['obsah']) {
            $saved_record['obsah_parsed'] = json_decode($saved_record['obsah'], true);
        }
        
        api_ok($saved_record, [
            'action' => $was_insert ? 'created' : 'updated',
            'affected_rows' => $affected_rows,
            'message' => $was_insert ? 'Poznámky vytvořeny' : 'Poznámky aktualizovány'
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("User notes save error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při ukládání poznámek: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Smazání poznámek/TODO pro uživatele
 * Endpoint: POST /user/notes/delete
 * Parametry: token, username, typ (TODO|NOTES) - volitelný, pokud není uvedený, smaže vše
 */
function handle_user_notes_delete($input, $config, $queries) {
    // Ověření tokenu
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
    
    $user_id = $token_data['id'];
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : null;
    
    // Validace typu pokud je uvedený
    if ($typ && !in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené hodnoty: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    try {
        if ($typ) {
            // Smazat konkrétní typ
            $stmt = $db->prepare($queries['uzivatele_poznamky_delete']);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
            $stmt->execute();
            $affected_rows = $stmt->rowCount();
            
            $message = $affected_rows > 0 
                ? "Poznámky typu {$typ} byly smazány" 
                : "Žádné poznámky typu {$typ} nebyly nalezeny";
                
        } else {
            // Smazat všechny poznámky uživatele
            $stmt = $db->prepare($queries['uzivatele_poznamky_delete_all_user']);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->execute();
            $affected_rows = $stmt->rowCount();
            
            $message = $affected_rows > 0 
                ? "Všechny poznámky byly smazány ({$affected_rows} záznamů)" 
                : "Žádné poznámky nebyly nalezeny";
        }
        
        api_ok([
            'deleted' => $affected_rows > 0,
            'affected_rows' => $affected_rows,
            'typ' => $typ,
            'message' => $message
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("User notes delete error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při mazání poznámek: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Statistiky použití poznámek/TODO (admin endpoint)
 * Endpoint: POST /admin/notes/stats
 * Parametry: token, username (admin uživatel)
 */
function handle_user_notes_stats($input, $config, $queries) {
    // Ověření tokenu
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
    
    // TODO: Přidat kontrolu admin práv
    // if (!user_has_admin_rights($token_data['id'], $db, $queries)) {
    //     api_error(403, 'Nedostatečná oprávnění', 'FORBIDDEN');
    //     return;
    // }
    
    try {
        $stmt = $db->prepare($queries['uzivatele_poznamky_stats']);
        $stmt->execute();
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Dodatečné statistiky
        $stmt_total = $db->prepare("SELECT COUNT(*) as total_records FROM " . TBL_UZIVATELE_POZNAMKY);
        $stmt_total->execute();
        $total = $stmt_total->fetch(PDO::FETCH_ASSOC);
        
        $stmt_active_users = $db->prepare("SELECT COUNT(DISTINCT user_id) as active_users FROM " . TBL_UZIVATELE_POZNAMKY);
        $stmt_active_users->execute();
        $active_users = $stmt_active_users->fetch(PDO::FETCH_ASSOC);
        
        api_ok([
            'usage_by_type' => $stats,
            'total_records' => (int)$total['total_records'],
            'active_users' => (int)$active_users['active_users']
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("User notes stats error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání statistik: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Načtení poznámky podle ID
 * Endpoint: POST /user/notes/by-id
 * Parametry: token, username, id
 */
function handle_user_notes_by_id($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $note_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if (!$note_id) {
        api_error(400, 'Chybí nebo je neplatné ID poznámky', 'MISSING_ID');
        return;
    }
    
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
        $stmt = $db->prepare($queries['uzivatele_poznamky_select_by_id']);
        $stmt->bindValue(':id', $note_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            api_error(404, 'Poznámka nebyla nalezena', 'NOT_FOUND');
            return;
        }
        
        // Ověření, že poznámka patří aktuálnímu uživateli
        if ($result['user_id'] != $token_data['id']) {
            api_error(403, 'Nemáte oprávnění k této poznámce', 'FORBIDDEN');
            return;
        }
        
        // Parsovat JSON obsah
        if ($result['obsah']) {
            $result['obsah_parsed'] = json_decode($result['obsah'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $result['obsah_parsed'] = null;
                $result['json_error'] = json_last_error_msg();
            }
        }
        
        api_ok($result);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("User notes by ID error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání poznámky: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Vyhledání v poznámkách podle obsahu
 * Endpoint: POST /user/notes/search
 * Parametry: token, username, search_term, [typ]
 */
function handle_user_notes_search($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $search_term = isset($input['search_term']) ? trim($input['search_term']) : '';
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : null;
    
    if (!$search_term) {
        api_error(400, 'Chybí vyhledávací termín', 'MISSING_SEARCH_TERM');
        return;
    }
    
    if ($typ && !in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené hodnoty: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
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
        $user_id = $token_data['id'];
        $search_like = '%' . $search_term . '%';
        
        if ($typ) {
            // Vyhledání pouze v konkrétním typu
            $sql = $queries['uzivatele_poznamky_search_content'] . " AND typ = :typ";
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindValue(':search_term', $search_like, PDO::PARAM_STR);
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
        } else {
            // Vyhledání ve všech typech
            $stmt = $db->prepare($queries['uzivatele_poznamky_search_content']);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindValue(':search_term', $search_like, PDO::PARAM_STR);
        }
        
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parsovat JSON obsah pro všechny výsledky
        foreach ($results as &$result) {
            if ($result['obsah']) {
                $result['obsah_parsed'] = json_decode($result['obsah'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $result['obsah_parsed'] = null;
                    $result['json_error'] = json_last_error_msg();
                }
            }
        }
        
        api_ok($results, [
            'count' => count($results),
            'search_term' => $search_term,
            'searched_type' => $typ
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("User notes search error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při vyhledávání: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Získání poznámek s detaily uživatele
 * Endpoint: POST /user/notes/with-details
 * Parametry: token, username, [user_id] (pro admin)
 */
function handle_user_notes_with_details($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $target_user_id = isset($input['user_id']) ? (int)$input['user_id'] : null;
    
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
    
    // Určení cílového uživatele
    $user_id = $target_user_id ?: $token_data['id'];
    
    // Pokud se ptá na jiného uživatele, zkontrolovat admin práva
    if ($target_user_id && $target_user_id !== $token_data['id']) {
        // TODO: Implementovat kontrolu admin práv
        // Pro nyní povoleno pouze vlastní data
        api_error(403, 'Nemáte oprávnění k datům jiného uživatele', 'FORBIDDEN');
        return;
    }
    
    try {
        $stmt = $db->prepare($queries['uzivatele_poznamky_select_with_user_details']);
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parsovat JSON obsah pro všechny záznamy
        foreach ($results as &$result) {
            if ($result['obsah']) {
                $result['obsah_parsed'] = json_decode($result['obsah'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $result['obsah_parsed'] = null;
                    $result['json_error'] = json_last_error_msg();
                }
            }
        }
        
        api_ok($results, [
            'count' => count($results),
            'user_id' => $user_id
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("User notes with details error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání poznámek s detaily: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Nedávná aktivita - nedávno upravené poznámky
 * Endpoint: POST /user/notes/recent
 * Parametry: token, username, [days] (výchozí 7), [limit] (výchozí 10)
 */
function handle_user_notes_recent_activity($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $days = isset($input['days']) ? max(1, min(365, (int)$input['days'])) : 7;
    $limit = isset($input['limit']) ? max(1, min(100, (int)$input['limit'])) : 10;
    
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
        // Přidat WHERE podmínku pro aktuálního uživatele
        $sql = str_replace(
            'WHERE p.dt_aktualizace', 
            'WHERE p.user_id = :user_id AND p.dt_aktualizace', 
            $queries['uzivatele_poznamky_recent_activity']
        );
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $stmt->bindValue(':days', $days, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parsovat JSON obsah pro všechny záznamy
        foreach ($results as &$result) {
            if ($result['obsah']) {
                $result['obsah_parsed'] = json_decode($result['obsah'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $result['obsah_parsed'] = null;
                    $result['json_error'] = json_last_error_msg();
                }
                
                // Přidat velikost obsahu
                $result['obsah_velikost'] = strlen($result['obsah']);
            }
        }
        
        api_ok($results, [
            'count' => count($results),
            'days' => $days,
            'limit' => $limit
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("User notes recent activity error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání nedávné aktivity: ' . $e->getMessage(), 'DB_ERROR');
    }
}

// ========== JEDNODUCHÉ LOAD/SAVE ENDPOINTY ==========

/**
 * Jednoduché načítání poznámek/TODO podle user_id
 * Endpoint: POST /load
 * Parametry: token, username, typ (TODO|NOTES)
 */
function handle_simple_load($input, $config, $queries) {
    // Ověření povinných parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : '';
    
    if (!$token || !$username || !$typ) {
        api_error(400, 'Chybí povinné parametry: token, username, typ', 'MISSING_PARAMETERS');
        return;
    }
    
    // Validace typu
    if (!in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené hodnoty: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu a username
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    $user_id = $token_data['id'];
    
    try {
        // Načtení podle user_id a typu
        $stmt = $db->prepare($queries['uzivatele_poznamky_select_by_user_type']);
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            // Neexistuje záznam - vrátit prázdnou strukturu s info
            $default_content = '{"content":"","settings":{"auto_save":true}}';
            
            $result = [
                'id' => null, // Žádné DB ID - nový záznam
                'user_id' => $user_id,
                'typ' => $typ,
                'obsah' => $default_content,
                'dt_vytvoreni' => null,
                'dt_aktualizace' => null,
                'is_new' => true // Flag pro FE
            ];
        } else {
            $result['is_new'] = false; // Existující záznam
        }
        
        // Parsovat JSON obsah
        if ($result['obsah']) {
            $result['obsah_parsed'] = json_decode($result['obsah'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $result['obsah_parsed'] = null;
                $result['json_error'] = json_last_error_msg();
            }
        }
        
        api_ok($result);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Simple load error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání dat: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Jednoduché ukládání poznámek/TODO s inteligentní INSERT/UPDATE logikou
 * Endpoint: POST /save
 * Parametry: token, username, typ (TODO|NOTES), obsah (JSON string), [id] (volitelné DB ID)
 */
function handle_simple_save($input, $config, $queries) {
    // Ověření povinných parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : '';
    $obsah = isset($input['obsah']) ? $input['obsah'] : '';
    $record_id = isset($input['id']) ? (int)$input['id'] : null; // Volitelné DB ID
    
    if (!$token || !$username || !$typ || !$obsah) {
        api_error(400, 'Chybí povinné parametry: token, username, typ, obsah', 'MISSING_PARAMETERS');
        return;
    }
    
    // Validace typu
    if (!in_array($typ, ['TODO', 'NOTES'])) {
        api_error(400, 'Neplatný typ. Povolené hodnoty: TODO, NOTES', 'INVALID_TYPE');
        return;
    }
    
    // Validace JSON obsahu
    if (is_string($obsah)) {
        $parsed_obsah = json_decode($obsah, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            api_error(400, 'Neplatný JSON v parametru obsah: ' . json_last_error_msg(), 'INVALID_JSON');
            return;
        }
    } else {
        // Pokud už je obsah array, převést na JSON string
        $obsah = json_encode($obsah);
        if (json_last_error() !== JSON_ERROR_NONE) {
            api_error(400, 'Chyba při převodu obsahu na JSON: ' . json_last_error_msg(), 'JSON_ENCODE_ERROR');
            return;
        }
    }
    
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Ověření tokenu a username
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    
    if ($token_data['username'] !== $username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    $user_id = $token_data['id'];
    
    try {
        $is_update = false;
        $final_id = null;
        
        // Pokud máme ID, ověříme že záznam existuje a patří uživateli
        if ($record_id) {
            $stmt = $db->prepare($queries['uzivatele_poznamky_select_by_id']);
            $stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
            $stmt->execute();
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$existing) {
                api_error(404, 'Záznam s daným ID nenalezen', 'RECORD_NOT_FOUND');
                return;
            }
            
            if ($existing['user_id'] != $user_id) {
                api_error(403, 'Nemáte oprávnění upravovat tento záznam', 'FORBIDDEN');
                return;
            }
            
            if ($existing['typ'] !== $typ) {
                api_error(400, 'Typ záznamu neodpovídá požadovanému typu', 'TYPE_MISMATCH');
                return;
            }
            
            // UPDATE existujícího záznamu
            $stmt = $db->prepare($queries['uzivatele_poznamky_update']);
            $stmt->bindValue(':obsah', $obsah, PDO::PARAM_STR);
            $stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
            $result = $stmt->execute();
            
            $is_update = true;
            $final_id = $record_id;
            
        } else {
            // Žádné ID - zkusíme najít existující záznam pro uživatele a typ
            $stmt = $db->prepare($queries['uzivatele_poznamky_select_by_user_type']);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
            $stmt->execute();
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                // UPDATE existujícího záznamu
                $stmt = $db->prepare($queries['uzivatele_poznamky_update']);
                $stmt->bindValue(':obsah', $obsah, PDO::PARAM_STR);
                $stmt->bindValue(':id', $existing['id'], PDO::PARAM_INT);
                $result = $stmt->execute();
                
                $is_update = true;
                $final_id = $existing['id'];
                
            } else {
                // INSERT nového záznamu
                $stmt = $db->prepare($queries['uzivatele_poznamky_insert']);
                $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
                $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
                $stmt->bindValue(':obsah', $obsah, PDO::PARAM_STR);
                $result = $stmt->execute();
                
                $is_update = false;
                $final_id = $db->lastInsertId();
            }
        }
        
        if ($result) {
            api_ok([
                'message' => $is_update ? 'Data byla úspěšně aktualizována' : 'Nový záznam byl vytvořen',
                'action' => $is_update ? 'UPDATE' : 'INSERT',
                'id' => $final_id,
                'user_id' => $user_id,
                'typ' => $typ,
                'obsah_length' => strlen($obsah)
            ]);
        } else {
            api_error(500, 'Chyba při ukládání dat', 'SAVE_ERROR');
        }
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Simple save error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při ukládání dat: ' . $e->getMessage(), 'DB_ERROR');
    }
}

// ========== NOVÉ TODO/NOTES API HANDLERS (Final Design v2025.03_25) ==========

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
            $default_content = ['obsah' => '', 'settings' => ['auto_save' => true]];
                
            api_ok([
                'id' => null,
                'user_id' => $target_user_id,
                'typ' => $typ,
                'obsah' => $default_content,
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
 * Parametry: username, token, typ (TODO|NOTES), obsah, [id]
 */
function handle_todonotes_save($input, $config, $queries) {
    // Validace povinných parametrů
    $required = ['username', 'token', 'typ', 'obsah'];
    foreach ($required as $param) {
        if (!isset($input[$param])) {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return;
        }
    }
    
    $username = $input['username'];
    $token = $input['token'];
    $typ = strtoupper(trim($input['typ']));
    $obsah = $input['obsah'];
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
    
    // Validace a konverze obsah na JSON
    $obsah_json = json_encode($obsah, JSON_UNESCAPED_UNICODE);
    if ($obsah_json === false) {
        api_error(400, 'Neplatný JSON v obsah', 'INVALID_JSON');
        return;
    }
    
    try {
        if ($record_id) {
            // UPDATE existující záznam (máme ID)
            $stmt = $db->prepare($queries['uzivatele_poznamky_update']);
            $stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
            $stmt->bindValue(':obsah', $obsah_json, PDO::PARAM_STR);
            $result = $stmt->execute();
            
            if ($result && $stmt->rowCount() > 0) {
                api_ok([
                    'message' => 'Data byla úspěšně aktualizována',
                    'action' => 'UPDATE',
                    'id' => $record_id,
                    'user_id' => $user_id,
                    'typ' => $typ,
                    'obsah_length' => strlen($obsah_json)
                ]);
            } else {
                api_error(404, 'Záznam s daným ID neexistuje', 'RECORD_NOT_FOUND');
            }
            
        } else {
            // INSERT nový záznam (id je null)
            // Nejdřív zkontrolujeme, jestli už náhodou neexistuje (ochrana proti duplicate)
            $stmt = $db->prepare("SELECT id FROM ".TBL_UZIVATELE_POZNAMKY." WHERE user_id = :user_id AND typ = :typ");
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
            $stmt->execute();
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                // Záznam už existuje, ale frontend neví ID → proveď UPDATE
                $existing_id = (int)$existing['id'];
                $stmt = $db->prepare($queries['uzivatele_poznamky_update']);
                $stmt->bindValue(':id', $existing_id, PDO::PARAM_INT);
                $stmt->bindValue(':obsah', $obsah_json, PDO::PARAM_STR);
                $result = $stmt->execute();
                
                if ($result && $stmt->rowCount() > 0) {
                    api_ok([
                        'message' => 'Existující záznam byl aktualizován',
                        'action' => 'UPDATE',
                        'id' => $existing_id,
                        'user_id' => $user_id,
                        'typ' => $typ,
                        'obsah_length' => strlen($obsah_json)
                    ]);
                } else {
                    api_error(500, 'Chyba při aktualizaci existujícího záznamu', 'UPDATE_ERROR');
                }
            } else {
                // Opravdu nový záznam
                $stmt = $db->prepare($queries['uzivatele_poznamky_insert']);
                $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
                $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
                $stmt->bindValue(':obsah', $obsah_json, PDO::PARAM_STR);
                $result = $stmt->execute();
                
                if ($result) {
                    $new_id = $db->lastInsertId();
                    api_ok([
                        'message' => 'Nový záznam byl vytvořen',
                        'action' => 'INSERT',
                        'id' => (int)$new_id,
                        'user_id' => $user_id,
                        'typ' => $typ,
                        'obsah_length' => strlen($obsah_json)
                    ]);
                } else {
                    api_error(500, 'Chyba při vytváření záznamu', 'SAVE_ERROR');
                }
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
                'id' => null,
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
            'obsah' => json_decode($row['obsah'], true),
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
                'obsah' => json_decode($row['obsah'], true),
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
                'obsah' => $content,
                'dt_vytvoreni' => $row['dt_vytvoreni']
            ];
            
            // Přidání univerzálních statistik
            if ($include_stats) {
                $item['stats'] = [
                    'word_count' => str_word_count($obsah_text),
                    'char_count' => strlen($obsah_text)
                ];
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
                'obsah' => json_decode($row['obsah'], true),
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