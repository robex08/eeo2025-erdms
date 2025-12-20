<?php

require_once __DIR__ . '/../../api.php';
// ========================================
// CHAT SYSTÉM - API HANDLERS
// ========================================

/**
 * Načtení konverzací pro uživatele
 * Endpoint: POST /chat/conversations
 * Parametry: token, username
 */
function handle_chat_conversations_list($input, $config, $queries) {
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
        $stmt = $db->prepare($queries['chat_konverzace_select_by_user']);
        $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $stmt->execute();
        $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        api_ok($conversations, ['count' => count($conversations)]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Chat conversations list error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání konverzací: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Načtení zpráv z konverzace
 * Endpoint: POST /chat/messages
 * Parametry: token, username, konverzace_id, [od_casu], [limit], [offset]
 */
function handle_chat_messages_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $konverzace_id = isset($input['konverzace_id']) ? (int)$input['konverzace_id'] : 0;
    $od_casu = isset($input['od_casu']) ? $input['od_casu'] : date('Y-m-d H:i:s', strtotime('-1 day'));
    $limit = isset($input['limit']) ? min(100, max(1, (int)$input['limit'])) : 50;
    $offset = isset($input['offset']) ? max(0, (int)$input['offset']) : 0;
    
    if (!$konverzace_id) {
        api_error(400, 'Chybí ID konverzace', 'MISSING_CONVERSATION_ID');
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
        // Kontrola oprávnění ke konverzaci
        $perm_stmt = $db->prepare($queries['chat_ucastnici_check_permission']);
        $perm_stmt->bindValue(':konverzace_id', $konverzace_id, PDO::PARAM_INT);
        $perm_stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $perm_stmt->execute();
        $permission = $perm_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$permission && $permission['typ'] !== 'BROADCAST') {
            api_error(403, 'Nemáte oprávnění k této konverzaci', 'FORBIDDEN');
            return;
        }
        
        // Načtení zpráv
        $stmt = $db->prepare($queries['chat_zpravy_select_by_konverzace']);
        $stmt->bindValue(':konverzace_id', $konverzace_id, PDO::PARAM_INT);
        $stmt->bindValue(':od_casu', $od_casu, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parsování JSON metadata pro každou zprávu
        foreach ($messages as &$message) {
            if ($message['metadata']) {
                $message['metadata_parsed'] = json_decode($message['metadata'], true);
            }
        }
        
        // Aktualizace času posledního přečtení
        $read_stmt = $db->prepare($queries['chat_ucastnici_update_last_read']);
        $read_stmt->bindValue(':konverzace_id', $konverzace_id, PDO::PARAM_INT);
        $read_stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $read_stmt->execute();
        
        api_ok($messages, [
            'count' => count($messages),
            'konverzace_id' => $konverzace_id,
            'od_casu' => $od_casu,
            'limit' => $limit,
            'offset' => $offset
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Chat messages list error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání zpráv: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Načtení nových zpráv (polling endpoint)
 * Endpoint: POST /chat/messages/new
 * Parametry: token, username, konverzace_id, posledni_cas
 */
function handle_chat_messages_new($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $konverzace_id = isset($input['konverzace_id']) ? (int)$input['konverzace_id'] : 0;
    $posledni_cas = isset($input['posledni_cas']) ? $input['posledni_cas'] : '';
    
    if (!$konverzace_id || !$posledni_cas) {
        api_error(400, 'Chybí ID konverzace nebo čas poslední zprávy', 'MISSING_PARAMETERS');
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
        // Kontrola oprávnění ke konverzaci
        $perm_stmt = $db->prepare($queries['chat_ucastnici_check_permission']);
        $perm_stmt->bindValue(':konverzace_id', $konverzace_id, PDO::PARAM_INT);
        $perm_stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $perm_stmt->execute();
        $permission = $perm_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$permission && $permission['typ'] !== 'BROADCAST') {
            api_error(403, 'Nemáte oprávnění k této konverzaci', 'FORBIDDEN');
            return;
        }
        
        // Načtení nových zpráv
        $stmt = $db->prepare($queries['chat_zpravy_select_new_messages']);
        $stmt->bindValue(':konverzace_id', $konverzace_id, PDO::PARAM_INT);
        $stmt->bindValue(':posledni_cas', $posledni_cas, PDO::PARAM_STR);
        $stmt->execute();
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parsování JSON metadata
        foreach ($messages as &$message) {
            if ($message['metadata']) {
                $message['metadata_parsed'] = json_decode($message['metadata'], true);
            }
        }
        
        api_ok($messages, [
            'count' => count($messages),
            'konverzace_id' => $konverzace_id,
            'posledni_cas' => $posledni_cas,
            'server_time' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Chat new messages error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání nových zpráv: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Odeslání nové zprávy
 * Endpoint: POST /chat/messages/send
 * Parametry: token, username, konverzace_id, obsah, [typ], [parent_zprava_id], [metadata]
 */
function handle_chat_messages_send($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $konverzace_id = isset($input['konverzace_id']) ? (int)$input['konverzace_id'] : 0;
    $obsah = isset($input['obsah']) ? trim($input['obsah']) : '';
    $typ = isset($input['typ']) ? strtoupper(trim($input['typ'])) : 'TEXT';
    $parent_zprava_id = isset($input['parent_zprava_id']) ? (int)$input['parent_zprava_id'] : null;
    $metadata = isset($input['metadata']) ? $input['metadata'] : null;
    
    if (!$konverzace_id || !$obsah) {
        api_error(400, 'Chybí ID konverzace nebo obsah zprávy', 'MISSING_PARAMETERS');
        return;
    }
    
    if (!in_array($typ, ['TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'MENTION'])) {
        api_error(400, 'Neplatný typ zprávy', 'INVALID_MESSAGE_TYPE');
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
        // Kontrola oprávnění ke konverzaci
        $perm_stmt = $db->prepare($queries['chat_ucastnici_check_permission']);
        $perm_stmt->bindValue(':konverzace_id', $konverzace_id, PDO::PARAM_INT);
        $perm_stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $perm_stmt->execute();
        $permission = $perm_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$permission && $permission['typ'] !== 'BROADCAST') {
            api_error(403, 'Nemáte oprávnění k této konverzaci', 'FORBIDDEN');
            return;
        }
        
        // Příprava obsahu
        $obsah_plain = strip_tags($obsah); // Plain text verze pro vyhledávání
        
        // Validace metadata
        $metadata_json = null;
        if ($metadata) {
            if (is_string($metadata)) {
                $metadata_json = $metadata;
            } else {
                $metadata_json = json_encode($metadata);
            }
        }
        
        // Začátek transakce
        $db->beginTransaction();
        
        try {
            // Vložení zprávy
            $stmt = $db->prepare($queries['chat_zpravy_insert']);
            $stmt->bindValue(':konverzace_id', $konverzace_id, PDO::PARAM_INT);
            $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
            $stmt->bindValue(':parent_zprava_id', $parent_zprava_id, PDO::PARAM_INT);
            $stmt->bindValue(':obsah', $obsah, PDO::PARAM_STR);
            $stmt->bindValue(':obsah_plain', $obsah_plain, PDO::PARAM_STR);
            $stmt->bindValue(':typ', $typ, PDO::PARAM_STR);
            $stmt->bindValue(':metadata', $metadata_json, PDO::PARAM_STR);
            $stmt->execute();
            
            $zprava_id = $db->lastInsertId();
            
            // Aktualizace času poslední zprávy v konverzaci
            $update_stmt = $db->prepare($queries['chat_konverzace_update_last_message']);
            $update_stmt->bindValue(':konverzace_id', $konverzace_id, PDO::PARAM_INT);
            $update_stmt->execute();
            
            // Detekce a zpracování @mentions
            $mentions = [];
            if (preg_match_all('/@([a-zA-Z0-9._-]+)/', $obsah_plain, $matches, PREG_OFFSET_CAPTURE)) {
                foreach ($matches[1] as $match) {
                    $username = $match[0];
                    $pozice_start = $matches[0][array_search($match, $matches[1])][1];
                    $pozice_end = $pozice_start + strlen('@' . $username);
                    
                    // Najít uživatele podle username
                    $user_stmt = $db->prepare("SELECT id FROM ".TBL_UZIVATELE." WHERE username = :username AND aktivni = 1 LIMIT 1");
                    $user_stmt->bindValue(':username', $username, PDO::PARAM_STR);
                    $user_stmt->execute();
                    $mentioned_user = $user_stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($mentioned_user) {
                        // Vložení mention záznamu
                        $mention_stmt = $db->prepare($queries['chat_mentions_insert']);
                        $mention_stmt->bindValue(':zprava_id', $zprava_id, PDO::PARAM_INT);
                        $mention_stmt->bindValue(':user_id', $mentioned_user['id'], PDO::PARAM_INT);
                        $mention_stmt->bindValue(':pozice_start', $pozice_start, PDO::PARAM_INT);
                        $mention_stmt->bindValue(':pozice_end', $pozice_end, PDO::PARAM_INT);
                        $mention_stmt->execute();
                        
                        $mentions[] = [
                            'user_id' => $mentioned_user['id'],
                            'username' => $username,
                            'pozice_start' => $pozice_start,
                            'pozice_end' => $pozice_end
                        ];
                    }
                }
            }
            
            $db->commit();
            
            api_ok([
                'zprava_id' => $zprava_id,
                'konverzace_id' => $konverzace_id,
                'obsah' => $obsah,
                'typ' => $typ,
                'mentions' => $mentions,
                'dt_vytvoreni' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Chat send message error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při odesílání zprávy: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Načtení nepřečtených zmínek
 * Endpoint: POST /chat/mentions/unread
 * Parametry: token, username, [limit]
 */
function handle_chat_mentions_unread($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $limit = isset($input['limit']) ? min(50, max(1, (int)$input['limit'])) : 20;
    
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
        $stmt = $db->prepare($queries['chat_mentions_select_unread']);
        $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $mentions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        api_ok($mentions, [
            'count' => count($mentions),
            'limit' => $limit
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Chat mentions unread error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při načítání zmínek: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Aktualizace online statusu
 * Endpoint: POST /chat/status/update
 * Parametry: token, username, status
 */
function handle_chat_status_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $status = isset($input['status']) ? strtoupper(trim($input['status'])) : 'ONLINE';
    
    if (!in_array($status, ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE'])) {
        api_error(400, 'Neplatný status', 'INVALID_STATUS');
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
        $ip_adresa = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        
        $stmt = $db->prepare($queries['chat_online_status_upsert']);
        $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $stmt->bindValue(':status', $status, PDO::PARAM_STR);
        $stmt->bindValue(':ip_adresa', $ip_adresa, PDO::PARAM_STR);
        $stmt->bindValue(':user_agent', $user_agent, PDO::PARAM_STR);
        $stmt->execute();
        
        api_ok([
            'user_id' => $token_data['id'],
            'status' => $status,
            'posledni_aktivita' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Chat status update error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při aktualizaci statusu: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Vyhledávání ve zprávách
 * Endpoint: POST /chat/search
 * Parametry: token, username, search_term, [limit]
 */
function handle_chat_search($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $search_term = isset($input['search_term']) ? trim($input['search_term']) : '';
    $limit = isset($input['limit']) ? min(50, max(1, (int)$input['limit'])) : 20;
    
    if (!$search_term) {
        api_error(400, 'Chybí vyhledávací termín', 'MISSING_SEARCH_TERM');
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
        $stmt = $db->prepare($queries['chat_zpravy_search']);
        $stmt->bindValue(':user_id', $token_data['id'], PDO::PARAM_INT);
        $stmt->bindValue(':search_term', $search_term, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        api_ok($results, [
            'count' => count($results),
            'search_term' => $search_term,
            'limit' => $limit
        ]);
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Chat search error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při vyhledávání: ' . $e->getMessage(), 'DB_ERROR');
    }
}

?>