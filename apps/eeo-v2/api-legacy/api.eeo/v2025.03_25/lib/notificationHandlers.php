<?php
/**
 * Notification System API Handlers
 * 
 * Funkce pro správu notifikačního systému
 */

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

// Include TimezoneHelper for consistent datetime handling
require_once __DIR__ . '/TimezoneHelper.php';

// Include notification helpers (nové funkce pro placeholdery)
require_once __DIR__ . '/notificationHelpers.php';

// ==========================================
// HELPER FUNKCE
// ==========================================

/**
 * Vytvoří novou notifikaci s MySQL 5.5 kompatibilitou
 */
function createNotification($db, $params) {
    // Přidáme dt_created pro MySQL 5.5 kompatibilitu
    if (!isset($params[':dt_created'])) {
        $params[':dt_created'] = TimezoneHelper::getCzechDateTime();
    }
    
    // Přidáme aktivni flag pokud není nastaven
    if (!isset($params[':aktivni'])) {
        $params[':aktivni'] = 1;
    }
    
    $sql = "INSERT INTO " . TABLE_NOTIFIKACE . " 
            (typ, nadpis, zprava, data_json, od_uzivatele_id, pro_uzivatele_id, prijemci_json, pro_vsechny, 
             priorita, kategorie, odeslat_email, objekt_typ, objekt_id, dt_expires, dt_created, aktivni) 
            VALUES 
            (:typ, :nadpis, :zprava, :data_json, :od_uzivatele_id, :pro_uzivatele_id, :prijemci_json, :pro_vsechny,
             :priorita, :kategorie, :odeslat_email, :objekt_typ, :objekt_id, :dt_expires, :dt_created, :aktivni)";
    
    try {
        $stmt = $db->prepare($sql);
        $result = $stmt->execute($params);
        
        if (!$result) {
            error_log("[Notifications] SQL Error: " . json_encode($stmt->errorInfo()));
            error_log("[Notifications] SQL Params: " . json_encode($params));
            return false;
        }
        
        // Získat ID vytvořené notifikace
        $notifikace_id = $db->lastInsertId();
        
        // Vytvořit záznam v read tabulce pro příjemce
        if ($notifikace_id && isset($params[':pro_uzivatele_id']) && $params[':pro_uzivatele_id']) {
            $read_sql = "INSERT INTO " . TABLE_NOTIFIKACE_PRECTENI . " 
                        (notifikace_id, uzivatel_id, precteno, dt_precteno, skryto, dt_skryto, dt_created, smazano, dt_smazano)
                        VALUES (:notifikace_id, :uzivatel_id, 0, NULL, 0, NULL, :dt_created, 0, NULL)";
            
            $read_stmt = $db->prepare($read_sql);
            $read_stmt->execute([
                ':notifikace_id' => $notifikace_id,
                ':uzivatel_id' => $params[':pro_uzivatele_id'],
                ':dt_created' => $params[':dt_created']
            ]);
        }
        
        return $notifikace_id;
        
    } catch (Exception $e) {
        error_log("[Notifications] Exception in createNotification: " . $e->getMessage());
        error_log("[Notifications] SQL Params: " . json_encode($params));
        throw $e;
    }
}

/**
 * Načte template pro daný typ notifikace
 */
function getNotificationTemplate($db, $typ) {
    $sql = "SELECT * FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE typ = :typ AND aktivni = 1";
    $stmt = $db->prepare($sql);
    $stmt->execute(array(':typ' => $typ));
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Nahradí placeholdery v textu notifikace
 */
function replacePlaceholders($text, $data) {
    if (empty($text) || empty($data)) return $text;
    
    foreach ($data as $key => $value) {
        $text = str_replace('{' . $key . '}', $value, $text);
    }
    return $text;
}

// ==========================================
// API HANDLERY
// ==========================================

/**
 * Načte notifikace pro uživatele podle 2-tabulkové struktury FE
 * POST /notifications/list
 * 
 * Používá INNER JOIN s " . TABLE_NOTIFIKACE_PRECTENI . " - uživatel vidí jen notifikace,
 * pro které má záznam v read tabulce
 */
function handle_notifications_list($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];
        
        // Parametry
        $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $unread_only = isset($input['unread_only']) ? (bool)$input['unread_only'] : false;
        $kategorie = isset($input['kategorie']) ? $input['kategorie'] : null;
        $include_dismissed = isset($input['include_dismissed']) ? (bool)$input['include_dismissed'] : false;

        // Sestavení dotazu - INNER JOIN s read tabulkou
        $where_conditions = array(
            "nr.uzivatel_id = :uzivatel_id",
            "n.aktivni = 1",
            "(n.dt_expires IS NULL OR n.dt_expires > NOW())"
        );
        
        // Vždy filtruj smazané notifikace
        $where_conditions[] = "nr.smazano = 0";
        
        // Pokud NENÍ include_dismissed, filtruj skryté notifikace
        if (!$include_dismissed) {
            $where_conditions[] = "nr.skryto = 0";
        }
        
        $params = array(':uzivatel_id' => $uzivatel_id);

        if ($unread_only) {
            $where_conditions[] = "nr.precteno = 0";
        }

        if ($kategorie) {
            $where_conditions[] = "n.kategorie = :kategorie";
            $params[':kategorie'] = $kategorie;
        }

        // Sestavení SELECT - vždy včetně skryto a smazano
        $select_columns = "n.id,
                    n.typ,
                    n.nadpis,
                    n.zprava,
                    n.priorita,
                    n.kategorie,
                    n.objekt_typ,
                    n.objekt_id,
                    n.data_json,
                    n.dt_created,
                    nr.precteno,
                    nr.dt_precteno,
                    nr.skryto,
                    nr.dt_skryto";

        $sql = "SELECT " . $select_columns . "
                FROM " . TABLE_NOTIFIKACE . " n
                INNER JOIN " . TABLE_NOTIFIKACE_PRECTENI . " nr ON n.id = nr.notifikace_id
                WHERE " . implode(' AND ', $where_conditions) . "
                ORDER BY n.dt_created DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Formátuj data pro frontend (české názvy)
        $result = array_map(function($notif) {
            $item = array(
                'id' => (int)$notif['id'],
                'typ' => $notif['typ'],
                'nadpis' => $notif['nadpis'],
                'zprava' => $notif['zprava'],
                'priorita' => $notif['priorita'],
                'kategorie' => $notif['kategorie'],
                'objekt_typ' => $notif['objekt_typ'],
                'objekt_id' => $notif['objekt_id'] ? (int)$notif['objekt_id'] : null,
                'data' => $notif['data_json'] ? json_decode($notif['data_json'], true) : null,
                'precteno' => $notif['precteno'] == 1,
                'dt_precteno' => $notif['dt_precteno'],
                'dt_created' => $notif['dt_created']
            );
            
            // Vždy vrátit skryto
            $item['skryto'] = $notif['skryto'] == 1;
            $item['dt_skryto'] = $notif['dt_skryto'];
            
            return $item;
        }, $notifications);

        // Počet celkem pro stránkování
        $count_sql = "SELECT COUNT(*) as total
                      FROM " . TABLE_NOTIFIKACE . " n
                      INNER JOIN " . TABLE_NOTIFIKACE_PRECTENI . " nr ON n.id = nr.notifikace_id
                      WHERE " . implode(' AND ', $where_conditions);
        
        $count_stmt = $db->prepare($count_sql);
        foreach ($params as $key => $value) {
            if ($key !== ':limit' && $key !== ':offset') {
                $count_stmt->bindValue($key, $value);
            }
        }
        $count_stmt->execute();
        $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání notifikací: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_list: " . $e->getMessage());
    }
}

/**
 * Označí notifikaci jako přečtenou
 * POST /notifications/mark-read
 */
function handle_notifications_mark_read($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notifikace_id = isset($input['notifikace_id']) ? (int)$input['notifikace_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($notifikace_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];

        $current_time = TimezoneHelper::getCzechDateTime();
        $sql = "INSERT INTO " . TABLE_NOTIFIKACE_PRECTENI . " (notifikace_id, uzivatel_id, precteno, dt_precteno, dt_created)
                VALUES (:notifikace_id, :uzivatel_id, 1, :dt_precteno, :dt_created)
                ON DUPLICATE KEY UPDATE 
                  precteno = 1, 
                  dt_precteno = :dt_precteno_update";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notifikace_id' => $notifikace_id,
            ':uzivatel_id' => $uzivatel_id,
            ':dt_precteno' => $current_time,
            ':dt_created' => $current_time,
            ':dt_precteno_update' => $current_time
        ));

        echo json_encode(array(
            'status' => 'ok',
            'zprava' => 'Notifikace byla zamítnuta'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při zamítání notifikace: ' . $e->getMessage()]);
    }
}

/**
 * Skrýt všechny notifikace v dropdownu
 * POST /notifications/dismiss-all
 */
function handle_notifications_dismiss_all($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Aktualizovat všechny nepřečtené/neskryté notifikace uživatele
        $sql = "UPDATE " . TABLE_NOTIFIKACE_PRECTENI . " 
                SET skryto = 1, 
                    dt_skryto = :dt_skryto 
                WHERE uzivatel_id = :uzivatel_id 
                  AND skryto = 0";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':uzivatel_id' => $uzivatel_id,
            ':dt_skryto' => $current_time
        ));

        $count = $stmt->rowCount();

        echo json_encode(array(
            'status' => 'ok',
            'zprava' => "Všechny notifikace skryty v dropdownu",
            'hidden_count' => $count
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při skrývání všech notifikací: ' . $e->getMessage()]);
    }
}

/**
 * Obnovit skrytou notifikaci (zobrazit zpět v dropdownu)
 * POST /notifications/restore
 */
function handle_notifications_restore($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notifikace_id = isset($input['notifikace_id']) ? (int)$input['notifikace_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notifikace_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];

        // Nastavit skryto zpět na 0
        $sql = "UPDATE " . TABLE_NOTIFIKACE_PRECTENI . " 
                SET skryto = 0, 
                    dt_skryto = NULL 
                WHERE notifikace_id = :notifikace_id 
                  AND uzivatel_id = :uzivatel_id";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notifikace_id' => $notifikace_id,
            ':uzivatel_id' => $uzivatel_id
        ));

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => 'Notifikace obnovena v dropdownu'
            ));
        } else {
            http_response_code(404);
            echo json_encode(['err' => 'Notifikace nenalezena nebo není skrytá']);
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při obnovování notifikace: ' . $e->getMessage()]);
    }
}

/**
 * Smazat notifikaci z databáze (soft delete)
 * POST /notifications/delete
 */
function handle_notifications_delete($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notifikace_id = isset($input['notifikace_id']) ? (int)$input['notifikace_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notifikace_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Soft delete - nastavit smazano = 1 v read tabulce
        $sql = "UPDATE " . TABLE_NOTIFIKACE_PRECTENI . " 
                SET smazano = 1, 
                    dt_smazano = :dt_smazano 
                WHERE notifikace_id = :notifikace_id 
                  AND uzivatel_id = :uzivatel_id";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notifikace_id' => $notifikace_id,
            ':uzivatel_id' => $uzivatel_id,
            ':dt_smazano' => $current_time
        ));

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => 'Notifikace trvale smazána z databáze'
            ));
        } else {
            http_response_code(404);
            echo json_encode(['err' => 'Notifikace nenalezena nebo nemáte oprávnění']);
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při mazání notifikace: ' . $e->getMessage()]);
    }
}

/**
 * Smazat všechny notifikace uživatele (soft delete)
 * POST /notifications/delete-all
 */
function handle_notifications_delete_all($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $confirm = isset($input['confirm']) ? (bool)$input['confirm'] : false;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if (!$confirm) {
        http_response_code(400);
        echo json_encode(['err' => 'Vyžaduje se potvrzení (confirm: true)']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Soft delete všech notifikací uživatele
        $sql = "UPDATE " . TABLE_NOTIFIKACE_PRECTENI . " 
                SET smazano = 1, 
                    dt_smazano = :dt_smazano 
                WHERE uzivatel_id = :uzivatel_id 
                  AND smazano = 0";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':uzivatel_id' => $uzivatel_id,
            ':dt_smazano' => $current_time
        ));

        $count = $stmt->rowCount();

        echo json_encode(array(
            'status' => 'ok',
            'zprava' => 'Všechny notifikace trvale smazány',
            'deleted_count' => $count
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při mazání všech notifikací: ' . $e->getMessage()]);
    }
}

/**
 * Označí všechny notifikace jako přečtené podle 2-tabulkové struktury FE
 * POST /notifications/mark-all-read
 */
function handle_notifications_mark_all_read($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];

        // Označ všechny nepřečtené záznamy v " . TABLE_NOTIFIKACE_PRECTENI . "
        $current_time = TimezoneHelper::getCzechDateTime();
        $sql = "UPDATE " . TABLE_NOTIFIKACE_PRECTENI . " 
                SET precteno = 1, dt_precteno = :dt_precteno
                WHERE uzivatel_id = :uzivatel_id 
                  AND precteno = 0";

        $stmt = $db->prepare($sql);
        $result = $stmt->execute(array(
            ':uzivatel_id' => $uzivatel_id,
            ':dt_precteno' => $current_time
        ));
        
        if ($result) {
            $marked_count = $stmt->rowCount();
            
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => "Označeno {$marked_count} notifikací jako přečtených",
                'marked_count' => $marked_count
            ));
        } else {
            throw new Exception('UPDATE selhal');
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při označování notifikací: ' . $e->getMessage()]);
        error_log("[Notifications] Exception in handle_notifications_mark_all_read: " . $e->getMessage());
    }
}

/**
 * Počet nepřečtených notifikací podle 2-tabulkové struktury FE
 * POST /notifications/unread-count
 */
function handle_notifications_unread_count($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];
        
        error_log("🔔 [UnreadCount] Počítám nepřečtené pro user_id=$uzivatel_id...");

        // Spočítej nepřečtené z " . TABLE_NOTIFIKACE_PRECTENI . "
        // MUSÍ být: nepřečtené (precteno=0), NEsmazané (smazano=0), NEdismissnuté (skryto=0)
        $sql = "SELECT COUNT(*) as unread_count
                FROM " . TABLE_NOTIFIKACE_PRECTENI . " nr
                INNER JOIN " . TABLE_NOTIFIKACE . " n ON nr.notifikace_id = n.id
                WHERE nr.uzivatel_id = :uzivatel_id
                  AND nr.precteno = 0
                  AND nr.skryto = 0
                  AND nr.smazano = 0
                  AND n.aktivni = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(':uzivatel_id' => $uzivatel_id));

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $count = (int)$result['unread_count'];
        
        error_log("   ✅ Výsledek: $count nepřečtených notifikací");

        echo json_encode(array(
            'status' => 'ok',
            'unread_count' => $count
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při počítání notifikací: ' . $e->getMessage()]);
        error_log("[Notifications] Exception in handle_notifications_unread_count: " . $e->getMessage());
    }
}

/**
 * Vytvoří novou notifikaci podle 2-tabulkové struktury FE
 * POST /notifications/create
 * 
 * ROZŠÍŘENO: Podpora order_id pro automatické naplnění placeholderů
 * 
 * Struktura:
 * 1. Vytvoří 1 záznam v " . TABLE_NOTIFIKACE . " (master data)
 * 2. Vytvoří záznamy v " . TABLE_NOTIFIKACE_PRECTENI . " pro každého příjemce
 */
function handle_notifications_create($input, $config, $queries) {
    // DEBUG: Log vstupních dat
    error_log("[Notifications] handle_notifications_create called");
    error_log("[Notifications] Input: " . json_encode($input));
    
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        error_log("[Notifications] Token verification failed");
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        error_log("[Notifications] Username mismatch: token=" . $token_data['username'] . ", request=" . $request_username);
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    // Validace povinných polí
    $required_fields = array('typ');
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            error_log("[Notifications] Missing required field: $field");
            http_response_code(400);
            echo json_encode(array('err' => "Chybí povinné pole: $field"));
            return;
        }
    }
    
    error_log("[Notifications] Token verified, required fields present");

    try {
        $db = get_db($config);
        $typ = $input['typ'];
        $current_uzivatel_id = $token_data['id'];
        $username = $token_data['username'];
        
        error_log("[Notifications] Processing typ: $typ for user: $username (ID: $current_uzivatel_id)");
        
        // Načti template z databáze
        $template = getNotificationTemplate($db, $typ);
        if (!$template) {
            error_log("[Notifications] Template not found for typ: $typ");
            http_response_code(400);
            echo json_encode(array('err' => "Neznámý typ notifikace: $typ"));
            return;
        }
        
        error_log("[Notifications] Template loaded: " . $template['nazev']);
        
        // NOVÉ: Podpora order_id pro automatické naplnění placeholderů
        $placeholderData = array();
        $order_id = isset($input['order_id']) ? (int)$input['order_id'] : null;
        $action_uzivatel_id = isset($input['action_uzivatel_id']) ? (int)$input['action_uzivatel_id'] : $current_uzivatel_id;
        $additional_data = isset($input['additional_data']) ? $input['additional_data'] : array();
        
        error_log("[Notifications] order_id from input: " . ($order_id ? $order_id : 'NULL'));
        error_log("[Notifications] action_uzivatel_id: $action_uzivatel_id");
        
        if ($order_id) {
            error_log("[Notifications] ===== LOADING ORDER DATA START =====");
            error_log("[Notifications] Loading placeholder data for order_id: $order_id");
            
            // Načti data objednávky a připrav placeholdery (s error handlingem)
            try {
                $placeholderData = getOrderPlaceholderData($db, $order_id, $action_uzivatel_id, $additional_data);
                
                error_log("[Notifications] getOrderPlaceholderData returned: " . (is_array($placeholderData) ? count($placeholderData) . " keys" : "NOT ARRAY"));
                
                if (isset($placeholderData['error'])) {
                    // ZMĚNA: Místo http 400 jen logujeme warning a pokračujeme bez placeholderů
                    error_log("[Notifications] ⚠️ WARNING: Could not load order data: " . $placeholderData['error']);
                    $placeholderData = array();
                } else {
                    error_log("[Notifications] ✅ Placeholder data loaded successfully!");
                    error_log("[Notifications] Keys: " . implode(', ', array_keys($placeholderData)));
                    error_log("[Notifications] order_number: " . (isset($placeholderData['order_number']) ? $placeholderData['order_number'] : 'NOT_SET'));
                    error_log("[Notifications] order_subject: " . (isset($placeholderData['order_subject']) ? substr($placeholderData['order_subject'], 0, 30) : 'NOT_SET'));
                }
                
                // Přidej ikonu a label akce VŽDY (i když order data selhala)
                $placeholderData['action_icon'] = getActionIcon($typ);
                $placeholderData['action_performed_by_label'] = getActionLabel($typ);
                $placeholderData['priority_icon'] = getPriorityIcon(
                    isset($input['priorita']) ? $input['priorita'] : $template['priorita_vychozi']
                );
                
                error_log("[Notifications] ===== LOADING ORDER DATA END =====");
            } catch (Exception $e) {
                error_log("[Notifications] ❌ EXCEPTION loading order data: " . $e->getMessage());
                error_log("[Notifications] Stack trace: " . $e->getTraceAsString());
                $placeholderData = array();
            }
        } else {
            error_log("[Notifications] ⚠️ No order_id provided - skipping placeholder data loading");
        }
        
        // Získej data pro nahrazení placeholderů (fallback na FE data)
        $data = array();
        if (isset($input['data']) && is_array($input['data'])) {
            $data = $input['data'];
        } elseif (isset($input['data_json']) && is_string($input['data_json'])) {
            $decoded = json_decode($input['data_json'], true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }
        
        // Merge placeholderData s data (placeholderData má přednost)
        $finalData = array_merge($data, $placeholderData);
        
        error_log("[Notifications] Final placeholder data: " . json_encode(array_keys($finalData)));
        error_log("[Notifications] Sample values: order_number=" . (isset($finalData['order_number']) ? $finalData['order_number'] : 'N/A') . 
                  ", order_name=" . (isset($finalData['order_name']) ? substr($finalData['order_name'], 0, 30) : 'N/A'));
        
        // Použij template_override pokud je zadáno (FE může přepsat template)
        $template_override = isset($input['template_override']) ? $input['template_override'] : array();
        
        $app_nadpis = isset($template_override['app_nadpis']) ? 
            $template_override['app_nadpis'] : $template['app_nadpis'];
        $app_message = isset($template_override['app_message']) ? 
            $template_override['app_message'] : $template['app_message'];
        $email_predmet = isset($template_override['email_predmet']) ? 
            $template_override['email_predmet'] : $template['email_predmet'];
        $email_telo = isset($template_override['email_telo']) ? 
            $template_override['email_telo'] : $template['email_telo'];
        
        // Nahraď placeholdery v template
        $app_nadpis = notif_replacePlaceholders($app_nadpis, $finalData);
        $app_message = notif_replacePlaceholders($app_message, $finalData);
        
        // Email vždy s placeholdery
        $email_predmet = notif_replacePlaceholders($email_predmet, $finalData);
        $email_telo = notif_replacePlaceholders($email_telo, $finalData);
        
        error_log("[Notifications] After placeholder replacement - Title: " . $app_nadpis);
        error_log("[Notifications] After placeholder replacement - Message: " . substr($app_message, 0, 100));
        
        // KLÍČOVÁ LOGIKA: Určení příjemců
        $pro_uzivatele_id = isset($input['pro_uzivatele_id']) ? (int)$input['pro_uzivatele_id'] : null;
        $to_users = isset($input['to_users']) && is_array($input['to_users']) ? $input['to_users'] : null;
        $pro_vsechny = isset($input['pro_vsechny']) ? (bool)$input['pro_vsechny'] : false;
        
        error_log("[Notifications] Recipients config: pro_uzivatele_id=" . ($pro_uzivatele_id ?: 'null') . 
                  ", to_users=" . ($to_users ? json_encode($to_users) : 'null') . 
                  ", pro_vsechny=" . ($pro_vsechny ? 'true' : 'false'));
        
        // Sestavení pole příjemců
        $recipient_uzivatel_ids = array();
        
        if ($pro_vsechny) {
            // Broadcast - všichni aktivní uživatelé
            $users_table = get_users_table_name();
            $stmt = $db->prepare("SELECT id FROM {$users_table} WHERE aktivni = 1");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $recipient_uzivatel_ids = array_column($users, 'id');
            error_log("[Notifications] Broadcasting '$typ' to " . count($recipient_uzivatel_ids) . " users");
            
        } elseif (!empty($to_users) && is_array($to_users)) {
            // Skupina uživatelů
            $recipient_uzivatel_ids = array_map('intval', $to_users);
            error_log("[Notifications] Sending '$typ' to group: " . implode(',', $recipient_uzivatel_ids));
            
        } elseif (!empty($pro_uzivatele_id)) {
            // Konkrétní uživatel
            $recipient_uzivatel_ids = array($pro_uzivatele_id);
            error_log("[Notifications] Sending '$typ' to user: $pro_uzivatele_id");
            
        } else {
            error_log("[Notifications] No recipients specified!");
            http_response_code(400);
            echo json_encode(array('err' => 'Musíte zadat alespoň jednoho příjemce (pro_uzivatele_id, to_users nebo pro_vsechny)'));
            return;
        }
        
        if (empty($recipient_uzivatel_ids)) {
            error_log("[Notifications] Recipients array is empty after processing!");
            http_response_code(400);
            echo json_encode(array('err' => 'Nebyli nalezeni žádní příjemci pro notifikaci'));
            return;
        }
        
        error_log("[Notifications] Final recipients: " . json_encode($recipient_uzivatel_ids));
        
        // 1. VYTVOŘ MASTER ZÁZNAM v " . TABLE_NOTIFIKACE . " (pouze 1 záznam)
        $priorita = isset($input['priorita']) ? $input['priorita'] : $template['priorita_vychozi'];
        $kategorie = isset($input['kategorie']) ? $input['kategorie'] : 'general';
        $odeslat_email = isset($input['odeslat_email']) ? (int)$input['odeslat_email'] : (int)$template['odeslat_email_default'];
        $objekt_typ = isset($input['objekt_typ']) ? $input['objekt_typ'] : ($order_id ? 'order' : null);
        $objekt_id = isset($input['objekt_id']) ? (int)$input['objekt_id'] : $order_id;
        
        $stmt = $db->prepare("
            INSERT INTO " . TABLE_NOTIFIKACE . " (
                typ, 
                nadpis, 
                zprava, 
                od_uzivatele_id, 
                pro_uzivatele_id,
                prijemci_json,
                pro_vsechny,
                priorita,
                kategorie,
                odeslat_email,
                objekt_typ,
                objekt_id,
                data_json,
                dt_created,
                aktivni
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
        ");
        
        $result = $stmt->execute(array(
            $typ,
            // Použij TEMPLATE s nahrazenými placeholdery, fallback na FE custom text
            !empty($app_nadpis) ? $app_nadpis : (!empty($input['nadpis']) ? $input['nadpis'] : 'Notifikace'),
            !empty($app_message) ? $app_message : (!empty($input['zprava']) ? $input['zprava'] : ''),
            $current_uzivatel_id,
            // Pro jednotlivce: konkrétní uzivatel_id, pro skupinu/broadcast: NULL
            count($recipient_uzivatel_ids) === 1 ? $recipient_uzivatel_ids[0] : null,
            // Pro skupinu: JSON array, jinak NULL
            count($recipient_uzivatel_ids) > 1 && !$pro_vsechny ? json_encode($recipient_uzivatel_ids) : null,
            $pro_vsechny ? 1 : 0,
            $priorita,
            $kategorie,
            $odeslat_email,
            $objekt_typ,
            $objekt_id,
            !empty($finalData) ? json_encode($finalData) : null
        ));
        
        if (!$result) {
            throw new Exception('Chyba při vytváření master notifikace');
        }
        
        $notifikace_id = $db->lastInsertId();
        
        // 2. VYTVOŘ READ ZÁZNAMY v " . TABLE_NOTIFIKACE_PRECTENI . " (pro každého příjemce)
        $stmt_read = $db->prepare("
            INSERT INTO " . TABLE_NOTIFIKACE_PRECTENI . " (
                notifikace_id,
                uzivatel_id,
                precteno,
                skryto,
                dt_created
            ) VALUES (?, ?, 0, 0, NOW())
        ");
        
        $read_records_created = 0;
        foreach ($recipient_uzivatel_ids as $uzivatel_id) {
            $result = $stmt_read->execute(array($notifikace_id, $uzivatel_id));
            if ($result) {
                $read_records_created++;
                error_log("[Notifications] Created read record for user: $uzivatel_id, notification: $notifikace_id");
            } else {
                error_log("[Notifications] Failed to create read record for user: $uzivatel_id, notification: $notifikace_id");
            }
        }
        
        // 3. ODESLAT EMAIL (pokud je potřeba)
        $email_odeslan = false;
        if ($odeslat_email && !empty($email_predmet)) {
            foreach ($recipient_uzivatel_ids as $uzivatel_id) {
                // TODO: Implementovat sendNotificationEmail($uzivatel_id, $email_predmet, $email_telo);
                error_log("[Notifications] Email should be sent to user: $uzivatel_id for notification: $notifikace_id");
            }
            
            // Označit jako odeslaný
            $stmt_email = $db->prepare("UPDATE " . TABLE_NOTIFIKACE . " SET email_odeslan = 1, email_odeslan_kdy = NOW() WHERE id = ?");
            $stmt_email->execute(array($notifikace_id));
            $email_odeslan = true;
        }
        
        // 4. RESPONSE
        $response = array(
            'status' => 'ok',
            'zprava' => 'Notifikace byla vytvořena',
            'notifikace_id' => (int)$notifikace_id,
            'recipients_count' => $read_records_created,
            'email_odeslan' => $email_odeslan
        );
        
        echo json_encode($response);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření notifikace: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_create: " . $e->getMessage());
    }
}

/**
 * Zamítne/skryje notifikaci
 * POST /notifications/dismiss
 */
function handle_notifications_dismiss($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notifikace_id = isset($input['notifikace_id']) ? (int)$input['notifikace_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notifikace_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];

        $current_time = TimezoneHelper::getCzechDateTime();
        
        // KROK 1: Zkus UPDATE (pokud záznam existuje)
        $sql_update = "UPDATE " . TABLE_NOTIFIKACE_PRECTENI . " 
                       SET skryto = 1, 
                           dt_skryto = :dt_skryto 
                       WHERE notifikace_id = :notifikace_id 
                         AND uzivatel_id = :uzivatel_id";

        $stmt = $db->prepare($sql_update);
        $stmt->execute(array(
            ':notifikace_id' => $notifikace_id,
            ':uzivatel_id' => $uzivatel_id,
            ':dt_skryto' => $current_time
        ));

        // KROK 2: Pokud UPDATE nezměnil žádný řádek, udělej INSERT
        if ($stmt->rowCount() == 0) {
            $sql_insert = "INSERT INTO " . TABLE_NOTIFIKACE_PRECTENI . " 
                           (notifikace_id, uzivatel_id, precteno, skryto, dt_skryto, dt_created)
                           VALUES (:notifikace_id, :uzivatel_id, 0, 1, :dt_skryto, :dt_created)";
            
            $stmt = $db->prepare($sql_insert);
            $stmt->execute(array(
                ':notifikace_id' => $notifikace_id,
                ':uzivatel_id' => $uzivatel_id,
                ':dt_skryto' => $current_time,
                ':dt_created' => $current_time
            ));
        }

        echo json_encode(array(
            'status' => 'ok',
            'zprava' => 'Notifikace skryta v dropdownu'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při skrývání notifikace: ' . $e->getMessage()));
    }
}

// ==========================================
// NOVÉ API ENDPOINTY PRO ROZŠÍŘENÝ NOTIFIKAČNÍ SYSTÉM
// ==========================================

/**
 * Náhled notifikace před odesláním (preview)
 * POST /notifications/preview
 * 
 * Umožňuje vidět, jak bude vypadat notifikace s nahrazenými placeholdery
 * BEZ jejího vytvoření v databázi
 */
function handle_notifications_preview($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    // Validace povinných polí
    if (empty($input['typ'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí povinné pole: typ'));
        return;
    }

    try {
        $db = get_db($config);
        $typ = $input['typ'];
        $current_uzivatel_id = $token_data['id'];
        
        // Načti template z databáze
        $template = getNotificationTemplate($db, $typ);
        if (!$template) {
            http_response_code(400);
            echo json_encode(array('err' => "Neznámý typ notifikace: $typ"));
            return;
        }
        
        // Načti placeholder data pokud je zadáno order_id
        $placeholderData = array();
        $order_id = isset($input['order_id']) ? (int)$input['order_id'] : null;
        $action_uzivatel_id = isset($input['action_uzivatel_id']) ? (int)$input['action_uzivatel_id'] : $current_uzivatel_id;
        $additional_data = isset($input['additional_data']) ? $input['additional_data'] : array();
        
        if ($order_id) {
            $placeholderData = getOrderPlaceholderData($db, $order_id, $action_uzivatel_id, $additional_data);
            
            if (isset($placeholderData['error'])) {
                http_response_code(400);
                echo json_encode(array('err' => $placeholderData['error']));
                return;
            }
            
            // Přidej ikony a labely
            $placeholderData['action_icon'] = getActionIcon($typ);
            $placeholderData['action_performed_by_label'] = getActionLabel($typ);
            $placeholderData['priority_icon'] = getPriorityIcon($template['priorita_vychozi']);
        }
        
        // Nahraď placeholdery
        $app_nadpis = notif_replacePlaceholders($template['app_nadpis'], $placeholderData);
        $app_message = notif_replacePlaceholders($template['app_message'], $placeholderData);
        $email_predmet = notif_replacePlaceholders($template['email_predmet'], $placeholderData);
        $email_telo = notif_replacePlaceholders($template['email_telo'], $placeholderData);
        
        // Zjisti které placeholdery byly použity
        preg_match_all('/\{([a-z_]+)\}/', $template['app_nadpis'] . $template['app_message'], $matches);
        $placeholders_used = array_unique($matches[1]);
        
        // Zjisti které placeholdery chybí (nebyly nahrazeny)
        $missing_data = array();
        foreach ($placeholders_used as $placeholder) {
            if (!isset($placeholderData[$placeholder]) || empty($placeholderData[$placeholder])) {
                $missing_data[] = $placeholder;
            }
        }
        
        // Response
        echo json_encode(array(
            'status' => 'ok',
            'template' => array(
                'typ' => $typ,
                'app_nadpis' => $app_nadpis,
                'app_message' => $app_message,
                'email_predmet' => $email_predmet,
                'email_telo' => $email_telo,
                'priorita' => $template['priorita_vychozi'],
                'odeslat_email_default' => $template['odeslat_email_default'] == 1
            ),
            'placeholders_used' => $placeholders_used,
            'missing_data' => $missing_data,
            'placeholder_data' => $placeholderData
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při náhledu notifikace: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_preview: " . $e->getMessage());
    }
}

/**
 * Seznam všech aktivních notification templates
 * GET /notifications/templates
 * POST /notifications/templates
 */
function handle_notifications_templates($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Parametry
        $active_only = isset($input['active_only']) ? (bool)$input['active_only'] : true;
        
        // Sestavení dotazu
        $sql = "SELECT * FROM " . TABLE_NOTIFIKACE_SABLONY . "";
        if ($active_only) {
            $sql .= " WHERE aktivni = 1";
        }
        $sql .= " ORDER BY nazev ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formátuj data
        $result = array_map(function($template) {
            return array(
                'id' => (int)$template['id'],
                'typ' => $template['typ'],
                'nazev' => $template['nazev'],
                'app_nadpis' => $template['app_nadpis'],
                'app_message' => $template['app_message'],
                'email_predmet' => $template['email_predmet'],
                'email_telo' => $template['email_telo'],
                'odeslat_email_default' => $template['odeslat_email_default'] == 1,
                'priorita_vychozi' => $template['priorita_vychozi'],
                'aktivni' => $template['aktivni'] == 1,
                'dt_created' => $template['dt_created'],
                'dt_updated' => $template['dt_updated']
            );
        }, $templates);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'total' => count($result)
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání templates: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_templates: " . $e->getMessage());
    }
}

/**
 * Hromadné odeslání notifikace více uživatelům
 * POST /notifications/send-bulk
 */
function handle_notifications_send_bulk($input, $config, $queries) {
    // Ověření tokenu - OPRAVENO: používáme verify_token_v2
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    // Validace povinných polí
    $required_fields = array('typ', 'recipients');
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(array('err' => "Chybí povinné pole: $field"));
            return;
        }
    }
    
    if (!is_array($input['recipients']) || empty($input['recipients'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Pole recipients musí být neprázdné pole user ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Připrav vstupní data pro handle_notifications_create
        $create_input = $input;
        $create_input['to_users'] = $input['recipients'];
        unset($create_input['recipients']);
        
        // Použij existující funkci handle_notifications_create
        // která už obsahuje všechnu logiku pro vytváření notifikací
        handle_notifications_create($create_input, $config, $queries);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při hromadném odesílání: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_send_bulk: " . $e->getMessage());
    }
}

// ==========================================
// EVENT TYPES API (pro Notification Center)
// ==========================================

/**
 * Seznam všech event types pro organizational hierarchy
 * GET /notifications/event-types/list
 * POST /notifications/event-types/list
 * 
 * @param array $input - Input parameters
 * @param array $config - Config array
 * @param array $queries - Queries array
 * @return void - Outputs JSON
 */
function handle_notifications_event_types_list($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    try {
        // Definice event types podle dokumentace
        $eventTypes = array(
            // OBJEDNÁVKY - Fáze 1: Vytvoření
            array(
                'code' => 'ORDER_SENT_FOR_APPROVAL',
                'nazev' => 'Objednávka vytvořena',
                'kategorie' => 'orders',
                'description' => 'Robert vytvoří objednávku → notifikace příkazci ke schválení',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2A: Schválení
            array(
                'code' => 'ORDER_APPROVED',
                'nazev' => 'Objednávka schválena',
                'kategorie' => 'orders',
                'description' => 'Příkazce schválil → notifikace Robertovi, že může pokračovat',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2B: Zamítnutí
            array(
                'code' => 'ORDER_REJECTED',
                'nazev' => 'Objednávka zamítnuta',
                'kategorie' => 'orders',
                'description' => 'Příkazce zamítl → proces končí',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2C: Vrácení
            array(
                'code' => 'ORDER_WAITING_FOR_CHANGES',
                'nazev' => 'Objednávka vrácena k doplnění',
                'kategorie' => 'orders',
                'description' => 'Příkazce vrátil → Robert doplní a znovu odešle',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 3: Plnění
            array(
                'code' => 'ORDER_SENT_TO_SUPPLIER',
                'nazev' => 'Objednávka odeslána dodavateli',
                'kategorie' => 'orders',
                'description' => 'Robert odeslal dodavateli → notifikace nákupčímu a ostatním',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 4: Registr
            array(
                'code' => 'ORDER_REGISTRY_APPROVAL_REQUESTED',
                'nazev' => 'Žádost o schválení v registru',
                'kategorie' => 'orders',
                'description' => 'Robert žádá o registr → notifikace registru (role/úsek)',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 5: Faktura
            array(
                'code' => 'ORDER_INVOICE_ADDED',
                'nazev' => 'Faktura doplněna',
                'kategorie' => 'orders',
                'description' => 'Registr doplnil fakturu → Robert musí provést věcnou kontrolu',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 6: Kontrola
            array(
                'code' => 'ORDER_MATERIAL_CHECK_COMPLETED',
                'nazev' => 'Věcná kontrola provedena',
                'kategorie' => 'orders',
                'description' => 'Robert provedl kontrolu → registr může dokončit',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 7: Dokončení
            array(
                'code' => 'ORDER_COMPLETED',
                'nazev' => 'Objednávka dokončena',
                'kategorie' => 'orders',
                'description' => 'Registr dokončil → notifikace všem zúčastněným',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('INFO')
            ),
            
            // FAKTURY
            array(
                'code' => 'INVOICE_CREATED',
                'nazev' => 'Faktura vytvořena',
                'kategorie' => 'invoices',
                'description' => 'Nová faktura byla vytvořena v systému',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            array(
                'code' => 'INVOICE_DUE_SOON',
                'nazev' => 'Faktura brzy po splatnosti',
                'kategorie' => 'invoices',
                'description' => 'Faktura se blíží ke dni splatnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            array(
                'code' => 'INVOICE_OVERDUE',
                'nazev' => 'Faktura po splatnosti',
                'kategorie' => 'invoices',
                'description' => 'Faktura je po splatnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL')
            ),
            
            // SMLOUVY
            array(
                'code' => 'CONTRACT_EXPIRING',
                'nazev' => 'Smlouva brzy vyprší',
                'kategorie' => 'contracts',
                'description' => 'Smlouva se blíží ke konci platnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // POKLADNA
            array(
                'code' => 'CASHBOOK_LOW_BALANCE',
                'nazev' => 'Nízký zůstatek v pokladně',
                'kategorie' => 'cashbook',
                'description' => 'Zůstatek v pokladně je pod minimální hranicí',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            )
        );
        
        // Filtrování podle kategorie (volitelné)
        $kategorie = isset($input['kategorie']) ? $input['kategorie'] : null;
        if ($kategorie) {
            $eventTypes = array_filter($eventTypes, function($event) use ($kategorie) {
                return $event['kategorie'] === $kategorie;
            });
            $eventTypes = array_values($eventTypes); // Reindex pole
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $eventTypes,
            'total' => count($eventTypes)
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání event types: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_event_types_list: " . $e->getMessage());
    }
}

// ==========================================
// NOTIFICATION ROUTER (pro automatické odesílání)
// ==========================================

/**
 * Mapování recipient role na DB ENUM priorita
 * AUTHOR_INFO a GUARANTOR_INFO se mapují na INFO (modrá, normální priorita)
 */
function mapRecipientRoleToPriority($recipientRole) {
    switch ($recipientRole) {
        case 'EXCEPTIONAL':
            return 'EXCEPTIONAL';  // Urgentní (červená)
        case 'APPROVAL':
            return 'APPROVAL';     // Ke schválení (oranžová)
        case 'INFO':
        case 'AUTHOR_INFO':        // ← Pro autora objednávky (modrá)
        case 'GUARANTOR_INFO':     // ← Pro garanta objednávky (modrá)
            return 'INFO';         // Informativní (modrá)
        default:
            return 'INFO';         // Fallback
    }
}

/**
 * Načte placeholder data z databáze podle object typu
 */
function loadOrderPlaceholders($db, $objectId) {
    try {
        // Načti objednávku
        $stmt = $db->prepare("
            SELECT o.*, CONCAT(u.name, ' ', u.surname) as creator_name
            FROM " . TABLE_OBJEDNAVKY . " o
            LEFT JOIN users u ON o.uzivatel_id = u.id
            WHERE o.id = :order_id
        ");
        $stmt->execute([':order_id' => $objectId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            return array();
        }
        
        // Načti položky
        $stmt = $db->prepare("
            SELECT COUNT(*) as items_count, SUM(COALESCE(cena_s_dph, 0)) as items_total_s_dph
            FROM " . TABLE_OBJEDNAVKY_POLOZKY . "
            WHERE objednavka_id = :order_id
        ");
        $stmt->execute([':order_id' => $objectId]);
        $items = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Připrav placeholders
        return array(
            'action_icon' => '📋',
            'order_number' => $order['cislo_objednavky'] ?? '',
            'order_subject' => $order['predmet'] ?? '',
            'max_price_with_dph' => number_format($order['max_cena_s_dph'] ?? 0, 0, ',', ' '),
            'creator_name' => $order['creator_name'] ?? 'Neznámý',
            'action_date' => date('d.m.Y H:i', strtotime($order['dt_objednavky'] ?? 'now')),
            'items_count' => $items['items_count'] ?? 0,
            'items_total_s_dph' => number_format($items['items_total_s_dph'] ?? 0, 0, ',', ' ')
        );
        
    } catch (Exception $e) {
        error_log("[loadOrderPlaceholders] Error: " . $e->getMessage());
        return array();
    }
}

/**
 * Hlavní router pro automatické odesílání notifikací při událostech
 * Použití: notificationRouter($db, 'ORDER_SENT_FOR_APPROVAL', $orderId, $userId, ['order_number' => 'O-2025-142', ...])
 * 
 * @param PDO $db - Database connection
 * @param string $eventType - Event typ code (ORDER_SENT_FOR_APPROVAL, ORDER_APPROVED, etc.)
 * @param int $objectId - ID objektu (objednávka, faktura, atd.)
 * @param int $triggerUserId - ID uživatele, který akci provedl
 * @param array $placeholderData - Data pro placeholder replacement
 * @return array - Výsledek odesílání { success: bool, sent: int, errors: array }
 */
function notificationRouter($db, $eventType, $objectId, $triggerUserId, $placeholderData = array()) {
    $result = array(
        'success' => false,
        'sent' => 0,
        'errors' => array()
    );
    
    error_log("════════════════════════════════════════════════════════════════");
    error_log("🔔 [NotificationRouter] TRIGGER PŘIJAT!");
    error_log("   Event Type: $eventType");
    error_log("   Object ID: $objectId");
    error_log("   Trigger User ID: $triggerUserId");
    error_log("   Placeholder Data (frontend): " . json_encode($placeholderData));
    error_log("════════════════════════════════════════════════════════════════");
    
    try {
        // 0. Načíst order data z DB a mergovat s frontend placeholders
        $objectType = getObjectTypeFromEvent($eventType);
        if ($objectType === 'orders') {
            $dbPlaceholders = loadOrderPlaceholders($db, $objectId);
            // Merguj: frontend data mají prioritu
            $placeholderData = array_merge($dbPlaceholders, $placeholderData);
            error_log("📊 [NotificationRouter] Merged placeholders: " . json_encode($placeholderData));
        }
        
        // 1. Najít příjemce podle organizational hierarchy
        error_log("🔍 [NotificationRouter] Hledám příjemce v org. hierarchii...");
        $recipients = findNotificationRecipients($db, $eventType, $objectId, $triggerUserId);
        
        if (empty($recipients)) {
            error_log("❌ [NotificationRouter] Žádní příjemci nenalezeni pro event $eventType, object $objectId");
            error_log("   → Zkontrolujte, zda existuje pravidlo v organizační hierarchii pro tento event type");
            return $result;
        }
        
        error_log("✅ [NotificationRouter] Nalezeno " . count($recipients) . " příjemců:");
        foreach ($recipients as $idx => $r) {
            error_log("   Příjemce #" . ($idx+1) . ": User ID={$r['uzivatel_id']}, Role={$r['recipientRole']}, Email=" . ($r['sendEmail'] ? 'ANO' : 'NE') . ", InApp=" . ($r['sendInApp'] ? 'ANO' : 'NE'));
        }
        
        // 2. Pro každého příjemce najít template a odeslat notifikaci
        foreach ($recipients as $recipient) {
            try {
                // $recipient obsahuje:
                // - uzivatel_id
                // - recipientRole (EXCEPTIONAL, APPROVAL, INFO)
                // - sendEmail (bool)
                // - sendInApp (bool)
                // - templateId
                // - templateVariant (normalVariant, urgentVariant, infoVariant)
                
                // 3. Načíst template z DB
                $stmt = $db->prepare("
                    SELECT * FROM " . TABLE_NOTIFIKACE_SABLONY . " 
                    WHERE id = :template_id AND aktivni = 1
                ");
                $stmt->execute([':template_id' => $recipient['templateId']]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$template) {
                    $result['errors'][] = "Template {$recipient['templateId']} not found";
                    continue;
                }
                
                // 4. Vybrat správnou variantu podle recipientRole
                $variant = $recipient['templateVariant'];
                
                // 5. Nahradit placeholdery v šabloně
                $processedTitle = replacePlaceholders($template['app_nadpis'], $placeholderData);
                $processedMessage = replacePlaceholders($template['app_message'], $placeholderData);
                $processedEmailBody = extractVariantFromEmailBody($template['email_telo'], $variant);
                $processedEmailBody = replacePlaceholders($processedEmailBody, $placeholderData);
                
                // 6. Připravit data pro notifikaci
                $notificationData = array(
                    'event_type' => $eventType,
                    'object_id' => $objectId,
                    'recipient_role' => $recipient['recipientRole'],
                    'template_id' => $recipient['templateId'],
                    'template_variant' => $variant,
                    'placeholders' => $placeholderData
                );
                
                // 7. Vytvořit in-app notifikaci
                if ($recipient['sendInApp']) {
                    $params = array(
                        ':typ' => 'user',  // ✅ OPRAVENO: 'user' místo 'system' - notifikaci poslal skutečný uživatel
                        ':nadpis' => $processedTitle,
                        ':zprava' => $processedMessage,
                        ':data_json' => json_encode($notificationData),
                        ':od_uzivatele_id' => $triggerUserId,  // ✅ Autor akce (user_id=100)
                        ':pro_uzivatele_id' => $recipient['uzivatel_id'],
                        ':prijemci_json' => null,
                        ':pro_vsechny' => 0,
                        ':priorita' => mapRecipientRoleToPriority($recipient['recipientRole']), // ✅ MAP: AUTHOR_INFO/GUARANTOR_INFO → INFO
                        ':kategorie' => $template['kategorie'],
                        ':odeslat_email' => $recipient['sendEmail'] ? 1 : 0,
                        ':objekt_typ' => getObjectTypeFromEvent($eventType),
                        ':objekt_id' => $objectId,
                        ':dt_expires' => null,
                        ':dt_created' => TimezoneHelper::getCzechDateTime(),
                        ':aktivni' => 1
                    );
                    
                    createNotification($db, $params);
                    $result['sent']++;
                }
                
                // 8. Odeslat email (pokud je povolený)
                if ($recipient['sendEmail']) {
                    $emailResult = sendNotificationEmail($db, $recipient['uzivatel_id'], $processedTitle, $processedEmailBody);
                    if (!$emailResult['ok']) {
                        $result['errors'][] = "Email failed for user {$recipient['uzivatel_id']}: " . ($emailResult['error'] ?? 'Unknown error');
                    }
                }
                
            } catch (Exception $e) {
                $result['errors'][] = "Error sending to user {$recipient['uzivatel_id']}: " . $e->getMessage();
                error_log("[NotificationRouter] Error sending to user {$recipient['uzivatel_id']}: " . $e->getMessage());
            }
        }
        
        $result['success'] = ($result['sent'] > 0);
        
    } catch (Exception $e) {
        $result['errors'][] = $e->getMessage();
        error_log("[NotificationRouter] Exception: " . $e->getMessage());
    }
    
    return $result;
}

/**
 * Najde příjemce notifikací podle organizational hierarchy
 * 
 * @param PDO $db
 * @param string $eventType - EVENT_TYPE code
 * @param int $objectId - ID objektu
 * @param int $triggerUserId - Kdo akci provedl
 * @return array - Pole příjemců s config
 */
function findNotificationRecipients($db, $eventType, $objectId, $triggerUserId) {
    $recipients = array();
    
    error_log("📋 [findNotificationRecipients] Začínám hledat příjemce...");
    
    try {
        // 1. Najít aktivní profil hierarchie
        error_log("   🔍 Hledám aktivní hierarchický profil...");
        $stmt = $db->prepare("
            SELECT id, structure_json 
            FROM 25_hierarchie_profily 
            WHERE aktivni = 1 
            LIMIT 1
        ");
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$profile) {
            error_log("   ❌ ŽÁDNÝ aktivní hierarchický profil nenalezen!");
            error_log("   → Zkontrolujte tabulku 25_hierarchie_profily, sloupec 'aktivni' = 1");
            return $recipients;
        }
        
        error_log("   ✅ Nalezen profil ID={$profile['id']}");
        
        $structure = json_decode($profile['structure_json'], true);
        if (!$structure) {
            error_log("   ❌ Neplatný JSON ve structure_json profilu {$profile['id']}");
            return $recipients;
        }
        
        error_log("   📊 Structure má " . count($structure['nodes']) . " nodes a " . count($structure['edges']) . " edges");
        
        // 2. Projít všechny TEMPLATE nodes a najít ty, které mají eventType
        error_log("   🔍 Hledám template nodes s event typem '$eventType'...");
        $matchingTemplates = 0;
        
        foreach ($structure['nodes'] as $node) {
            if ($node['typ'] !== 'template') continue;
            
            $eventTypes = isset($node['data']['eventTypes']) ? $node['data']['eventTypes'] : array();
            
            error_log("      Template: {$node['data']['name']}, Event Types: " . json_encode($eventTypes));
            
            // Pokud tento template nemá náš eventType, přeskoč
            if (!in_array($eventType, $eventTypes)) continue;
            
            $matchingTemplates++;
            error_log("      ✅ MATCH! Template '{$node['data']['name']}' má event '$eventType'");
            
            // 3. Najít všechny EDGE (šipky) vedoucí z tohoto template
            error_log("      🔗 Hledám edges z template '{$node['data']['name']}'...");
            $edgeCount = 0;
            
            foreach ($structure['edges'] as $edge) {
                if ($edge['source'] !== $node['id']) continue;
                
                $edgeCount++;
                error_log("         Edge #{$edgeCount}: {$edge['source']} → {$edge['target']}");
                
                $notifications = isset($edge['data']['notifications']) ? $edge['data']['notifications'] : array();
                error_log("         Notification config: " . json_encode($notifications));
                
                // Kontrola checkbox filtrů
                $onlyParticipants = isset($edge['data']['onlyOrderParticipants']) ? $edge['data']['onlyOrderParticipants'] : false;
                $onlyLocation = isset($edge['data']['onlyOrderLocation']) ? $edge['data']['onlyOrderLocation'] : false;
                $onlyAuthor = isset($edge['data']['onlyOrderAuthor']) ? $edge['data']['onlyOrderAuthor'] : false;
                $onlyGuarantor = isset($edge['data']['onlyOrderGuarantor']) ? $edge['data']['onlyOrderGuarantor'] : false;
                error_log("         Filtry: onlyParticipants=" . ($onlyParticipants ? 'ANO' : 'NE') . ", onlyLocation=" . ($onlyLocation ? 'ANO' : 'NE') . ", onlyAuthor=" . ($onlyAuthor ? 'ANO' : 'NE') . ", onlyGuarantor=" . ($onlyGuarantor ? 'ANO' : 'NE'));
                
                // Kontrola, zda edge má tento eventType v types[]
                $edgeEventTypes = isset($notifications['types']) ? $notifications['types'] : array();
                if (!in_array($eventType, $edgeEventTypes)) {
                    error_log("         ⚠️ Edge nemá event type '$eventType' v types[], přeskakuji");
                    continue;
                }
                
                error_log("         ✅ Edge obsahuje event type '$eventType'!");
                
                // 4. Určit cílového uživatele/roli z edge target
                $targetNodeId = $edge['target'];
                $targetNode = null;
                foreach ($structure['nodes'] as $n) {
                    if ($n['id'] === $targetNodeId) {
                        $targetNode = $n;
                        break;
                    }
                }
                
                if (!$targetNode) continue;
                
                // 5. Najít konkrétní uzivatel_id podle typu target node
                $targetUserIds = resolveTargetUsers($db, $targetNode, $objectId, $triggerUserId);
                
                // 5a. ✅ FILTR: Pouze ÚČASTNÍCI objednávky + automatické rozlišení rolí
                if ($onlyParticipants && $objectType === 'orders') {
                    error_log("         📋 Filtr 'onlyOrderParticipants' aktivní - hledám účastníky objednávky $objectId...");
                    
                    // Načti objednávku
                    $stmt = $db->prepare("
                        SELECT uzivatel_id, garant_uzivatel_id, prikazce_user_id, 
                               schvalil_1_user_id, schvalil_2_user_id, schvalil_3_user_id
                        FROM " . TABLE_OBJEDNAVKY . " 
                        WHERE id = :order_id
                    ");
                    $stmt->execute([':order_id' => $objectId]);
                    $order = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$order) {
                        error_log("         ⏩ SKIP - Objednávka $objectId nenalezena v DB");
                        continue;
                    }
                    
                    // Rozděl účastníky podle jejich role v objednávce
                    $approvers = array(); // Schvalovatelé + příkazce (APPROVAL role)
                    $infoRecipients = array(); // Autor + garant (INFO role)
                    
                    if ($order['uzivatel_id']) $infoRecipients[] = $order['uzivatel_id']; // Autor
                    if ($order['garant_uzivatel_id']) $infoRecipients[] = $order['garant_uzivatel_id']; // Garant
                    if ($order['prikazce_user_id']) $approvers[] = $order['prikazce_user_id']; // Příkazce
                    if ($order['schvalil_1_user_id']) $approvers[] = $order['schvalil_1_user_id']; // Schvalovatel 1
                    if ($order['schvalil_2_user_id']) $approvers[] = $order['schvalil_2_user_id']; // Schvalovatel 2
                    if ($order['schvalil_3_user_id']) $approvers[] = $order['schvalil_3_user_id']; // Schvalovatel 3
                    
                    $approvers = array_unique($approvers);
                    $infoRecipients = array_unique($infoRecipients);
                    
                    error_log("         ✅ Schvalovatelé/příkazce (APPROVAL): " . implode(', ', $approvers));
                    error_log("         ✅ Autor/garant (INFO): " . implode(', ', $infoRecipients));
                    
                    // 🎯 INTELIGENTNÍ FILTROVÁNÍ podle recipientRole v edge
                    $edgeRecipientRole = $recipientRole; // Z edge config
                    
                    if ($edgeRecipientRole === 'APPROVAL') {
                        // Edge je pro APPROVAL → filtruj jen schvalovate/příkazce
                        $targetUserIds = array_filter($targetUserIds, function($userId) use ($approvers) {
                            return in_array($userId, $approvers);
                        });
                        error_log("         🎯 Edge role=APPROVAL → filtr na schvalovatelé: " . implode(', ', $targetUserIds));
                    } 
                    elseif ($edgeRecipientRole === 'INFO' || $edgeRecipientRole === 'AUTHOR_INFO' || $edgeRecipientRole === 'GUARANTOR_INFO') {
                        // Edge je pro INFO → filtruj jen autor+garant
                        $targetUserIds = array_filter($targetUserIds, function($userId) use ($infoRecipients) {
                            return in_array($userId, $infoRecipients);
                        });
                        error_log("         🎯 Edge role=INFO → filtr na autor/garant: " . implode(', ', $targetUserIds));
                    }
                    else {
                        // EXCEPTIONAL nebo jiná role → použij všechny účastníky
                        $allParticipants = array_merge($approvers, $infoRecipients);
                        $allParticipants = array_unique($allParticipants);
                        $targetUserIds = array_filter($targetUserIds, function($userId) use ($allParticipants) {
                            return in_array($userId, $allParticipants);
                        });
                        error_log("         🎯 Edge role=$edgeRecipientRole → filtr na všichni účastníci: " . implode(', ', $targetUserIds));
                    }
                    
                    if (empty($targetUserIds)) {
                        error_log("         ⏩ SKIP - Žádný z target users není správný účastník pro tuto recipient role");
                        continue;
                    }
                    error_log("         ✅ MATCH - Finální target users: " . implode(', ', $targetUserIds));
                }
                
                // 5b. ✅ NOVÝ FILTR: Pouze AUTOR objednávky
                if ($onlyAuthor && $objectType === 'orders') {
                    error_log("         🖊️ Filtr 'onlyOrderAuthor' aktivní - hledám autora objednávky $objectId...");
                    $stmt = $db->prepare("SELECT uzivatel_id FROM " . TABLE_OBJEDNAVKY . " WHERE id = :order_id");
                    $stmt->execute([':order_id' => $objectId]);
                    $order = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$order || !$order['uzivatel_id']) {
                        error_log("         ⏩ SKIP - Objednávka $objectId nemá autora v DB");
                        continue;
                    }
                    
                    $authorId = $order['uzivatel_id'];
                    error_log("         ✅ Autor objednávky: user_id=$authorId");
                    
                    // Filtruj targetUserIds - pouze autor
                    $targetUserIds = array_filter($targetUserIds, function($userId) use ($authorId) {
                        return $userId == $authorId;
                    });
                    
                    if (empty($targetUserIds)) {
                        error_log("         ⏩ SKIP - Žádný z target users není autor objednávky");
                        continue;
                    }
                    error_log("         ✅ MATCH - Target user(s) jsou autor: " . implode(', ', $targetUserIds));
                }
                
                // 5b. ✅ NOVÝ FILTR: Pouze GARANT objednávky
                if ($onlyGuarantor && $objectType === 'orders') {
                    error_log("         🛡️ Filtr 'onlyOrderGuarantor' aktivní - hledám garanta objednávky $objectId...");
                    $stmt = $db->prepare("SELECT garant_uzivatel_id FROM " . TABLE_OBJEDNAVKY . " WHERE id = :order_id");
                    $stmt->execute([':order_id' => $objectId]);
                    $order = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$order || !$order['garant_uzivatel_id']) {
                        error_log("         ⏩ SKIP - Objednávka $objectId nemá garanta v DB");
                        continue;
                    }
                    
                    $guarantorId = $order['garant_uzivatel_id'];
                    error_log("         ✅ Garant objednávky: user_id=$guarantorId");
                    
                    // Filtruj targetUserIds - pouze garant
                    $targetUserIds = array_filter($targetUserIds, function($userId) use ($guarantorId) {
                        return $userId == $guarantorId;
                    });
                    
                    if (empty($targetUserIds)) {
                        error_log("         ⏩ SKIP - Žádný z target users není garant objednávky");
                        continue;
                    }
                    error_log("         ✅ MATCH - Target user(s) jsou garant: " . implode(', ', $targetUserIds));
                }
                
                // 6. Určit variantu šablony podle recipientRole
                $recipientRole = isset($notifications['recipientRole']) ? $notifications['recipientRole'] : 'APPROVAL';
                $variant = 'normalVariant'; // výchozí
                
                if ($recipientRole === 'EXCEPTIONAL') {
                    $variant = isset($node['data']['urgentVariant']) ? $node['data']['urgentVariant'] : 'APPROVER_URGENT';
                } elseif ($recipientRole === 'INFO') {
                    $variant = isset($node['data']['infoVariant']) ? $node['data']['infoVariant'] : 'SUBMITTER';
                } else {
                    $variant = isset($node['data']['normalVariant']) ? $node['data']['normalVariant'] : 'RECIPIENT';
                }
                
                // 7. Přidat každého target user do seznamu příjemců
                foreach ($targetUserIds as $userId) {
                    // ✅ KONTROLA UŽIVATELSKÝCH PREFERENCÍ
                    $userPrefs = getUserNotificationPreferences($db, $userId);
                    
                    // Pokud má uživatel notifikace vypnuté globálně, přeskoč
                    if (!$userPrefs['enabled']) {
                        error_log("[findNotificationRecipients] User $userId has notifications disabled globally");
                        continue;
                    }
                    
                    // Aplikovat uživatelské preference na kanály
                    $sendEmailFinal = isset($notifications['email']) ? (bool)$notifications['email'] : false;
                    $sendInAppFinal = isset($notifications['inapp']) ? (bool)$notifications['inapp'] : true;
                    
                    // Override podle user preferences
                    if (!$userPrefs['email_enabled']) {
                        $sendEmailFinal = false;
                    }
                    if (!$userPrefs['inapp_enabled']) {
                        $sendInAppFinal = false;
                    }
                    
                    // Kontrola kategorie (orders, invoices, contracts, cashbook)
                    $kategorie = getObjectTypeFromEvent($eventType);
                    if (isset($userPrefs['categories'][$kategorie]) && !$userPrefs['categories'][$kategorie]) {
                        error_log("[findNotificationRecipients] User $userId has kategorie '$kategorie' disabled");
                        continue;
                    }
                    
                    // Pokud jsou oba kanály vypnuté, přeskoč
                    if (!$sendEmailFinal && !$sendInAppFinal) {
                        error_log("[findNotificationRecipients] User $userId has both channels disabled for this notification");
                        continue;
                    }
                    
                    $recipients[] = array(
                        'uzivatel_id' => $userId,
                        'recipientRole' => $recipientRole,
                        'sendEmail' => $sendEmailFinal,
                        'sendInApp' => $sendInAppFinal,
                        'templateId' => $node['data']['templateId'],
                        'templateVariant' => $variant
                    );
                }
            }
        }
        
    } catch (Exception $e) {
        error_log("[findNotificationRecipients] Exception: " . $e->getMessage());
    }
    
    return $recipients;
}

/**
 * Najde konkrétní uzivatel_id podle typu node (user, role, location, department)
 * 
 * @param PDO $db
 * @param array $node - Target node z hierarchie
 * @param int $objectId - ID objektu (objednávka, faktura)
 * @param int $triggerUserId - Kdo akci provedl
 * @return array - Pole uzivatel_id
 */
function resolveTargetUsers($db, $node, $objectId, $triggerUserId) {
    $userIds = array();
    
    try {
        switch ($node['typ']) {
            case 'user':
                // Přímý uživatel
                if (isset($node['data']['userId'])) {
                    $userIds[] = $node['data']['userId'];
                }
                break;
                
            case 'role':
                // Všichni uživatelé s touto rolí
                $roleId = isset($node['data']['roleId']) ? $node['data']['roleId'] : null;
                if ($roleId) {
                    $stmt = $db->prepare("
                        SELECT DISTINCT ur.uzivatel_id 
                        FROM 25_user_roles ur
                        JOIN 25_users u ON ur.uzivatel_id = u.id
                        WHERE ur.role_id = :role_id AND u.aktivni = 1
                    ");
                    $stmt->execute([':role_id' => $roleId]);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userIds[] = $row['uzivatel_id'];
                    }
                }
                break;
                
            case 'location':
                // Všichni uživatelé na této lokaci
                $locationId = isset($node['data']['locationId']) ? $node['data']['locationId'] : null;
                if ($locationId) {
                    $stmt = $db->prepare("
                        SELECT DISTINCT id 
                        FROM 25_users 
                        WHERE location_id = :location_id AND aktivni = 1
                    ");
                    $stmt->execute([':location_id' => $locationId]);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userIds[] = $row['id'];
                    }
                }
                break;
                
            case 'department':
                // Všichni uživatelé v tomto oddělení
                $departmentId = isset($node['data']['departmentId']) ? $node['data']['departmentId'] : null;
                if ($departmentId) {
                    $stmt = $db->prepare("
                        SELECT DISTINCT id 
                        FROM 25_users 
                        WHERE department_id = :department_id AND aktivni = 1
                    ");
                    $stmt->execute([':department_id' => $departmentId]);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userIds[] = $row['id'];
                    }
                }
                break;
                
            default:
                error_log("[resolveTargetUsers] Unknown node typ: {$node['typ']}");
        }
    } catch (Exception $e) {
        error_log("[resolveTargetUsers] Exception: " . $e->getMessage());
    }
    
    return array_unique($userIds);
}

/**
 * Extrahuje správnou variantu z email_telo podle <!-- RECIPIENT: TYPE -->
 */
function extractVariantFromEmailBody($emailBody, $variant) {
    if (!$emailBody) return '';
    
    $marker = "<!-- RECIPIENT: $variant -->";
    
    if (!strpos($emailBody, $marker)) {
        // Varianta nenalezena, vrátit celé body (fallback)
        return $emailBody;
    }
    
    // Najít začátek varianty
    $start = strpos($emailBody, $marker);
    $start = $start + strlen($marker);
    
    // Najít konec varianty (další marker nebo konec)
    $end = strpos($emailBody, '<!-- RECIPIENT:', $start);
    if ($end === false) {
        $end = strlen($emailBody);
    }
    
    return trim(substr($emailBody, $start, $end - $start));
}

/**
 * Určí object typ podle event typ
 */
function getObjectTypeFromEvent($eventType) {
    if (strpos($eventType, 'ORDER_') === 0) return 'orders';
    if (strpos($eventType, 'INVOICE_') === 0) return 'invoices';
    if (strpos($eventType, 'CONTRACT_') === 0) return 'contracts';
    if (strpos($eventType, 'CASHBOOK_') === 0) return 'cashbook';
    return 'unknown';
}

/**
 * Načte uživatelské preference pro notifikace
 * Kombinuje Global Settings + User Profile Settings
 * 
 * @param PDO $db
 * @param int $userId
 * @return array - Preference settings
 */
function getUserNotificationPreferences($db, $userId) {
    $preferences = array(
        'enabled' => true,          // Globální zapnutí/vypnutí
        'email_enabled' => true,    // Email kanál
        'inapp_enabled' => true,    // In-app kanál
        'categories' => array(      // Kategorie modulů
            'orders' => true,
            'invoices' => true,
            'contracts' => true,
            'cashbook' => true
        )
    );
    
    try {
        // 1. GLOBAL SETTINGS - Systémová úroveň (má nejvyšší prioritu)
        $stmt = $db->prepare("
            SELECT klic, hodnota 
            FROM 25a_nastaveni_globalni 
            WHERE klic IN (
                'notifications_enabled',
                'notifications_email_enabled', 
                'notifications_inapp_enabled'
            )
        ");
        $stmt->execute();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $value = ($row['hodnota'] === '1' || $row['hodnota'] === 'true');
            
            if ($row['klic'] === 'notifications_enabled' && !$value) {
                // Systém je vypnutý globálně - nic nefunguje
                $preferences['enabled'] = false;
                return $preferences;
            }
            
            if ($row['klic'] === 'notifications_email_enabled') {
                $preferences['email_enabled'] = $value;
            }
            
            if ($row['klic'] === 'notifications_inapp_enabled') {
                $preferences['inapp_enabled'] = $value;
            }
        }
        
        // 2. USER PROFILE SETTINGS - Uživatelská úroveň
        // Načtení z tabulky 25_uzivatel_nastaveni
        $stmt = $db->prepare("
            SELECT nastaveni_data 
            FROM 25_uzivatel_nastaveni 
            WHERE uzivatel_id = :uzivatel_id
        ");
        $stmt->execute([':uzivatel_id' => $userId]);
        $userSettings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($userSettings && !empty($userSettings['nastaveni_data'])) {
            $settings = json_decode($userSettings['nastaveni_data'], true);
            
            if (isset($settings['notifikace_povoleny'])) {
                $preferences['enabled'] = (bool)$settings['notifikace_povoleny'];
            }
            
            if (isset($settings['notifikace_email_povoleny'])) {
                $preferences['email_enabled'] = $preferences['email_enabled'] && (bool)$settings['notifikace_email_povoleny'];
            }
            
            if (isset($settings['notifikace_inapp_povoleny'])) {
                $preferences['inapp_enabled'] = $preferences['inapp_enabled'] && (bool)$settings['notifikace_inapp_povoleny'];
            }
            
            if (isset($settings['notifikace_kategorie'])) {
                // Mapování českých názvů na anglické klíče
                $categoryMap = [
                    'objednavky' => 'orders',
                    'faktury' => 'invoices',
                    'smlouvy' => 'contracts',
                    'pokladna' => 'cashbook'
                ];
                
                foreach ($settings['notifikace_kategorie'] as $czCategory => $enabled) {
                    $enCategory = isset($categoryMap[$czCategory]) ? $categoryMap[$czCategory] : $czCategory;
                    $preferences['categories'][$enCategory] = (bool)$enabled;
                }
            }
        }
        
    } catch (Exception $e) {
        error_log("[getUserNotificationPreferences] Error loading preferences for user $userId: " . $e->getMessage());
    }
    
    return $preferences;
}

/**
 * API: Načte uživatelské preference pro notifikace
 * GET/POST /notifications/user-preferences
 * 
 * @param array $input
 * @param array $config
 * @param array $queries
 */
function handle_notifications_user_preferences($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Načíst uzivatel_id z username
        $stmt = $db->prepare("SELECT id FROM users WHERE username = :username");
        $stmt->execute([':username' => $request_username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(array('err' => 'Uživatel nenalezen'));
            return;
        }
        
        $userId = $user['id'];
        $preferences = getUserNotificationPreferences($db, $userId);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $preferences
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání preferencí: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_user_preferences: " . $e->getMessage());
    }
}

/**
 * API: Uloží uživatelské preference pro notifikace
 * POST /notifications/user-preferences/update
 * 
 * Input:
 * {
 *   "enabled": true,
 *   "email_enabled": true,
 *   "inapp_enabled": true,
 *   "categories": {
 *     "orders": true,
 *     "invoices": false,
 *     "contracts": true,
 *     "cashbook": true
 *   }
 * }
 * 
 * @param array $input
 * @param array $config
 * @param array $queries
 */
function handle_notifications_user_preferences_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Načíst uzivatel_id
        $stmt = $db->prepare("SELECT id FROM users WHERE username = :username");
        $stmt->execute([':username' => $request_username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(array('err' => 'Uživatel nenalezen'));
            return;
        }
        
        $userId = $user['id'];
        
        // Mapování anglických názvů na české
        $categoryMap = [
            'orders' => 'objednavky',
            'invoices' => 'faktury',
            'contracts' => 'smlouvy',
            'cashbook' => 'pokladna'
        ];
        
        $czCategories = array();
        if (isset($input['categories'])) {
            foreach ($input['categories'] as $enKey => $value) {
                $czKey = isset($categoryMap[$enKey]) ? $categoryMap[$enKey] : $enKey;
                $czCategories[$czKey] = (bool)$value;
            }
        } else {
            $czCategories = array(
                'objednavky' => true,
                'faktury' => true,
                'smlouvy' => true,
                'pokladna' => true
            );
        }
        
        // Sestavit preferences object (české klíče)
        $preferences = array(
            'notifikace_povoleny' => isset($input['enabled']) ? (bool)$input['enabled'] : true,
            'notifikace_email_povoleny' => isset($input['email_enabled']) ? (bool)$input['email_enabled'] : true,
            'notifikace_inapp_povoleny' => isset($input['inapp_enabled']) ? (bool)$input['inapp_enabled'] : true,
            'notifikace_kategorie' => $czCategories
        );
        
        $preferencesJson = json_encode($preferences);
        
        // Uložit do DB (INSERT nebo UPDATE)
        $stmt = $db->prepare("
            INSERT INTO 25_uzivatel_nastaveni (uzivatel_id, nastaveni_data, nastaveni_verze, vytvoreno)
            VALUES (:uzivatel_id, :settings, '1.0', NOW())
            ON DUPLICATE KEY UPDATE 
                nastaveni_data = :settings,
                upraveno = NOW()
        ");
        
        $result = $stmt->execute([
            ':settings' => $preferencesJson,
            ':uzivatel_id' => $userId
        ]);
        
        if ($result) {
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => 'Preference uloženy',
                'data' => $preferences
            ));
        } else {
            throw new Exception('Nepodařilo se uložit preference');
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při ukládání preferencí: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_user_preferences_update: " . $e->getMessage());
    }
}

/**
 * Odešle notifikační email uživateli
 * 
 * @param PDO $db
 * @param int $userId
 * @param string $subject
 * @param string $htmlBody
 * @return array - ['ok' => bool, 'error' => string]
 */
function sendNotificationEmail($db, $userId, $subject, $htmlBody) {
    try {
        // 1. Načíst email uživatele z DB
        $stmt = $db->prepare("
            SELECT email, jmeno, prijmeni 
            FROM 25_uzivatele 
            WHERE uzivatel_id = :user_id AND aktivni = 1
        ");
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || empty($user['email'])) {
            error_log("[sendNotificationEmail] User $userId has no email address");
            return array('ok' => false, 'error' => 'No email address');
        }
        
        // 2. Zavolat eeo_mail_send()
        require_once __DIR__ . '/mail.php';
        
        $result = eeo_mail_send(
            $user['email'],
            $subject,
            $htmlBody,
            array('html' => true)
        );
        
        // 3. Logovat výsledek
        if ($result['ok']) {
            error_log("[sendNotificationEmail] Email sent to {$user['email']} for user $userId");
        } else {
            error_log("[sendNotificationEmail] Email FAILED to {$user['email']} for user $userId");
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log("[sendNotificationEmail] Exception: " . $e->getMessage());
        return array('ok' => false, 'error' => $e->getMessage());
    }
}

/**
 * API Handler: Trigger notifikace podle event typu (použije org. hierarchii)
 * 
 * Endpoint: POST /api.eeo/notifications/trigger
 * Body: {
 *   token: string,
 *   username: string,
 *   event_type: string (ORDER_APPROVED, ORDER_REJECTED, ...),
 *   object_id: int (ID objednávky/faktury/...),
 *   trigger_user_id: int (kdo akci provedl)
 * }
 */
function handle_notifications_trigger($input, $config, $queries) {
    // ✅ Ověření tokenu - STEJNĚ JAKO V /notifications/list
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    if ($token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }
    
    $db = get_db($config);
    
    if (!$db) {
        http_response_code(500);
        echo json_encode(array('err' => 'Database connection failed'));
        return;
    }
    
    try {
        // Validace vstupních parametrů
        $eventType = isset($input['event_type']) ? $input['event_type'] : null;
        $objectId = isset($input['object_id']) ? intval($input['object_id']) : null;
        $triggerUserId = isset($input['trigger_user_id']) ? intval($input['trigger_user_id']) : null;
        
        if (!$eventType || !$objectId || !$triggerUserId) {
            http_response_code(400);
            echo json_encode(array(
                'err' => 'Missing required parameters',
                'required' => ['event_type', 'object_id', 'trigger_user_id']
            ));
            return;
        }
        
        // Volitelné placeholder data (pokud je poskytne frontend)
        $placeholderData = isset($input['placeholder_data']) ? $input['placeholder_data'] : array();
        
        // Zavolat notification router (hlavní logika)
        $result = notificationRouter($db, $eventType, $objectId, $triggerUserId, $placeholderData);
        
        if ($result['success']) {
            error_log("[NotificationTrigger] ✅ SUCCESS - Sent: " . $result['sent']);
            error_log("════════════════════════════════════════════════════════════════");
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => 'Notifikace odeslány',
                'sent' => $result['sent'],
                'errors' => $result['errors']
            ));
        } else {
            error_log("[NotificationTrigger] ❌ FAILED - Errors: " . json_encode($result['errors']));
            error_log("════════════════════════════════════════════════════════════════");
            http_response_code(500);
            echo json_encode(array(
                'err' => 'Failed to trigger notifications',
                'errors' => $result['errors']
            ));
        }
        
    } catch (Exception $e) {
        error_log("[NotificationTrigger] ❌ EXCEPTION: " . $e->getMessage());
        error_log("[NotificationTrigger] Stack trace: " . $e->getTraceAsString());
        error_log("════════════════════════════════════════════════════════════════");
        http_response_code(500);
        echo json_encode(array('err' => 'Exception: ' . $e->getMessage()));
    }
}