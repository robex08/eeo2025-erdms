<?php

/**
 * ČÍSELNÍKY HANDLERS - PHP 5.6 Compatible
 * Handlers pro všechny číselníky podle vzoru Orders25
 * 
 * Kompatibilní s:
 * - PHP 5.6
 * - MySQL 5.5.43
 * - PDO interface
 * 
 * Vytvoreno: 20. října 2025
 */

// =============================================================================
// 1. LOKALITY - TBL_LOKALITY (25_lokality)
// =============================================================================

/**
 * Seznam všech lokalit
 * POST /lokality/list
 */
function handle_ciselniky_lokality_list($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Filtrovat pouze aktivní lokality, pokud není explicitně požadováno jinak
        $show_inactive = isset($input['show_inactive']) && $input['show_inactive'] === true;
        
        // Použít JOIN pro efektivní načtení počtu uživatelů v jednom dotazu
        // Počítat VŠECHNY uživatele (aktivní i neaktivní) podle požadavku FE
        if ($show_inactive) {
            $sql = "
                SELECT 
                    l.*,
                    COUNT(DISTINCT u.id) as pocet_uzivatelu
                FROM " . TBL_LOKALITY . " l
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.lokalita_id = l.id
                GROUP BY l.id
                ORDER BY l.nazev ASC
            ";
        } else {
            $sql = "
                SELECT 
                    l.*,
                    COUNT(DISTINCT u.id) as pocet_uzivatelu
                FROM " . TBL_LOKALITY . " l
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.lokalita_id = l.id
                WHERE l.aktivni = 1
                GROUP BY l.id
                ORDER BY l.nazev ASC
            ";
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $lokality = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $lokality
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání lokalit: ' . $e->getMessage()));
    }
}

/**
 * Detail lokality podle ID
 * POST /lokality/by-id
 */
function handle_ciselniky_lokality_by_id($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "SELECT * FROM " . TBL_LOKALITY . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(array('err' => 'Lokalita nenalezena'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání lokality: ' . $e->getMessage()));
    }
}

/**
 * Vytvoření nové lokality
 * POST /lokality/insert
 */
function handle_ciselniky_lokality_insert($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['nazev']) || empty(trim($input['nazev']))) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí nebo je prázdný parametr nazev'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "INSERT INTO " . TBL_LOKALITY . " (nazev, typ, parent_id, aktivni) VALUES (:nazev, :typ, :parent_id, :aktivni)";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':nazev' => trim($input['nazev']),
            ':typ' => isset($input['typ']) ? trim($input['typ']) : null,
            ':parent_id' => isset($input['parent_id']) && $input['parent_id'] !== '' ? (int)$input['parent_id'] : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);
        $new_id = $db->lastInsertId();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Lokalita byla vytvořena',
            'data' => array('id' => (int)$new_id)
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření lokality: ' . $e->getMessage()));
    }
}

/**
 * Aktualizace lokality
 * POST /lokality/update
 */
function handle_ciselniky_lokality_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id']) || !isset($input['nazev']) || empty(trim($input['nazev']))) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID nebo nazev'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "UPDATE " . TBL_LOKALITY . " SET nazev = :nazev, typ = :typ, parent_id = :parent_id, aktivni = :aktivni WHERE id = :id";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':id' => (int)$input['id'],
            ':nazev' => trim($input['nazev']),
            ':typ' => isset($input['typ']) ? trim($input['typ']) : null,
            ':parent_id' => isset($input['parent_id']) && $input['parent_id'] !== '' ? (int)$input['parent_id'] : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Lokalita byla aktualizována'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Lokalita nenalezena nebo nebyla změněna'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při aktualizaci lokality: ' . $e->getMessage()));
    }
}

/**
 * Smazání lokality (SOFT DELETE - nastavení aktivni = 0)
 * POST /lokality/delete
 */
function handle_ciselniky_lokality_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Soft delete - nastavíme aktivni = 0
        $sql = "UPDATE " . TBL_LOKALITY . " SET aktivni = 0 WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Lokalita byla deaktivována'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Lokalita nenalezena'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při mazání lokality: ' . $e->getMessage()));
    }
}

// =============================================================================
// 2. POZICE - 25_pozice  
// =============================================================================

/**
 * Seznam všech pozic
 * POST /pozice/list
 */
function handle_ciselniky_pozice_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný parametr pro zobrazení i neaktivních
        $show_inactive = isset($input['show_inactive']) ? (bool)$input['show_inactive'] : false;
        
        if ($show_inactive) {
            $sql = "
                SELECT 
                    p.*,
                    u.id AS usek_id_detail,
                    u.usek_nazev,
                    u.usek_zkr 
                FROM " . TBL_POZICE . " p 
                LEFT JOIN " . TBL_USEKY . " u ON p.usek_id = u.id 
                ORDER BY p.nazev_pozice ASC
            ";
        } else {
            $sql = "
                SELECT 
                    p.*,
                    u.id AS usek_id_detail,
                    u.usek_nazev,
                    u.usek_zkr 
                FROM " . TBL_POZICE . " p 
                LEFT JOIN " . TBL_USEKY . " u ON p.usek_id = u.id 
                WHERE p.aktivni = 1
                ORDER BY p.nazev_pozice ASC
            ";
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $pozice = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pro každou pozici spočítat počet uživatelů
        foreach ($pozice as &$pozice_item) {
            if ($show_inactive) {
                $sql_users = "SELECT COUNT(*) as pocet FROM " . TBL_UZIVATELE . " WHERE pozice_id = :pozice_id";
            } else {
                $sql_users = "SELECT COUNT(*) as pocet FROM " . TBL_UZIVATELE . " WHERE pozice_id = :pozice_id AND aktivni = 1";
            }
            
            $stmt_users = $db->prepare($sql_users);
            $stmt_users->execute(array(':pozice_id' => $pozice_item['id']));
            $row = $stmt_users->fetch(PDO::FETCH_ASSOC);
            
            $pozice_item['pocet_uzivatelu'] = (int)$row['pocet'];
        }
        unset($pozice_item);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $pozice
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání pozic: ' . $e->getMessage()));
    }
}

/**
 * Detail pozice podle ID
 * POST /pozice/by-id
 */
function handle_ciselniky_pozice_by_id($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "
            SELECT 
                p.*,
                u.id AS usek_id_detail,
                u.usek_nazev,
                u.usek_zkr 
            FROM " . TBL_POZICE . " p 
            LEFT JOIN " . TBL_USEKY . " u ON p.usek_id = u.id 
            WHERE p.id = :id
        ";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(array('err' => 'Pozice nenalezena'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání pozice: ' . $e->getMessage()));
    }
}

/**
 * Vytvoření nové pozice
 * POST /pozice/insert
 */
function handle_ciselniky_pozice_insert($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['nazev_pozice']) || empty(trim($input['nazev_pozice']))) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí nebo je prázdný parametr nazev_pozice'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "INSERT INTO " . TBL_POZICE . " (nazev_pozice, parent_id, usek_id, aktivni) VALUES (:nazev_pozice, :parent_id, :usek_id, :aktivni)";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':nazev_pozice' => trim($input['nazev_pozice']),
            ':parent_id' => isset($input['parent_id']) && $input['parent_id'] !== '' ? (int)$input['parent_id'] : null,
            ':usek_id' => isset($input['usek_id']) && $input['usek_id'] !== '' ? (int)$input['usek_id'] : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);
        $new_id = $db->lastInsertId();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Pozice byla vytvořena',
            'data' => array('id' => (int)$new_id)
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření pozice: ' . $e->getMessage()));
    }
}

/**
 * Aktualizace pozice
 * POST /pozice/update
 */
function handle_ciselniky_pozice_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id']) || !isset($input['nazev_pozice']) || empty(trim($input['nazev_pozice']))) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID nebo nazev_pozice'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "UPDATE " . TBL_POZICE . " SET nazev_pozice = :nazev_pozice, parent_id = :parent_id, usek_id = :usek_id, aktivni = :aktivni WHERE id = :id";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':id' => (int)$input['id'],
            ':nazev_pozice' => trim($input['nazev_pozice']),
            ':parent_id' => isset($input['parent_id']) && $input['parent_id'] !== '' ? (int)$input['parent_id'] : null,
            ':usek_id' => isset($input['usek_id']) && $input['usek_id'] !== '' ? (int)$input['usek_id'] : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Pozice byla aktualizována'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Pozice nenalezena nebo nebyla změněna'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při aktualizaci pozice: ' . $e->getMessage()));
    }
}

/**
 * Smazání pozice (SOFT DELETE - aktivni = 0)
 * POST /pozice/delete
 */
function handle_ciselniky_pozice_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // SOFT DELETE - nastavení aktivni = 0 místo skutečného smazání
        $sql = "UPDATE " . TBL_POZICE . " SET aktivni = 0 WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Pozice deaktivována'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Pozice nenalezena'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při mazání pozice: ' . $e->getMessage()));
    }
}

// =============================================================================
// 3. ÚSEKY - TBL_USEKY (25_useky)
// =============================================================================

/**
 * Seznam všech úseků
 * POST /useky/list
 */
function handle_ciselniky_useky_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný parametr pro zobrazení i neaktivních
        $show_inactive = isset($input['show_inactive']) ? (bool)$input['show_inactive'] : false;
        
        if ($show_inactive) {
            $sql = "SELECT * FROM " . TBL_USEKY . " ORDER BY usek_nazev ASC";
        } else {
            $sql = "SELECT * FROM " . TBL_USEKY . " WHERE aktivni = 1 ORDER BY usek_nazev ASC";
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $useky = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pro každý úsek spočítat počet uživatelů
        foreach ($useky as &$usek) {
            if ($show_inactive) {
                $sql_users = "SELECT COUNT(*) as pocet FROM " . TBL_UZIVATELE . " WHERE usek_id = :usek_id";
            } else {
                $sql_users = "SELECT COUNT(*) as pocet FROM " . TBL_UZIVATELE . " WHERE usek_id = :usek_id AND aktivni = 1";
            }
            
            $stmt_users = $db->prepare($sql_users);
            $stmt_users->execute(array(':usek_id' => $usek['id']));
            $row = $stmt_users->fetch(PDO::FETCH_ASSOC);
            
            $usek['pocet_uzivatelu'] = (int)$row['pocet'];
        }
        unset($usek);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $useky
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání úseků: ' . $e->getMessage()));
    }
}

/**
 * Detail úseku podle ID
 * POST /useky/by-id
 */
function handle_ciselniky_useky_by_id($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "SELECT * FROM " . TBL_USEKY . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(array('err' => 'Úsek nenalezen'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání úseku: ' . $e->getMessage()));
    }
}

/**
 * Vytvoření nového úseku
 * POST /useky/insert
 */
function handle_ciselniky_useky_insert($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['nazev']) || empty(trim($input['nazev']))) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí nebo je prázdný parametr nazev'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "INSERT INTO " . TBL_USEKY . " (usek_nazev, usek_zkr, aktivni) VALUES (:nazev, :zkr, :aktivni)";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':nazev' => trim($input['nazev']),
            ':zkr' => isset($input['zkr']) ? trim($input['zkr']) : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);
        $new_id = $db->lastInsertId();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Úsek byl vytvořen',
            'data' => array('id' => (int)$new_id)
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření úseku: ' . $e->getMessage()));
    }
}

/**
 * Aktualizace úseku
 * POST /useky/update
 */
function handle_ciselniky_useky_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id']) || !isset($input['nazev']) || empty(trim($input['nazev']))) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID nebo nazev'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "UPDATE " . TBL_USEKY . " SET usek_nazev = :nazev, usek_zkr = :zkr, aktivni = :aktivni WHERE id = :id";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':id' => (int)$input['id'],
            ':nazev' => trim($input['nazev']),
            ':zkr' => isset($input['zkr']) ? trim($input['zkr']) : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Úsek byl aktualizován'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Úsek nenalezen nebo nebyl změněn'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při aktualizaci úseku: ' . $e->getMessage()));
    }
}

/**
 * Smazání úseku (SOFT DELETE - aktivni = 0)
 * POST /useky/delete
 */
function handle_ciselniky_useky_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // SOFT DELETE - nastavení aktivni = 0 místo skutečného smazání
        $sql = "UPDATE " . TBL_USEKY . " SET aktivni = 0 WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Úsek deaktivován'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Úsek nenalezen'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při mazání úseku: ' . $e->getMessage()));
    }
}

// =============================================================================
// 4. ORGANIZACE - TBL_ORGANIZACE_VIZITKA (25_organizace_vizitka)
// =============================================================================

/**
 * Seznam všech organizací
 * POST /organizace/list
 */
function handle_ciselniky_organizace_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný parametr 'aktivni' pro filtrování
        // Pokud není uveden, vrací se VŠECHNY organizace
        $aktivni = isset($input['aktivni']) ? $input['aktivni'] : null;
        
        if ($aktivni === 1 || $aktivni === '1' || $aktivni === true) {
            // Vrátit POUZE aktivní
            $sql = "SELECT * FROM " . TBL_ORGANIZACE_VIZITKA . " WHERE aktivni = 1 ORDER BY nazev_organizace ASC";
        } elseif ($aktivni === 0 || $aktivni === '0' || $aktivni === false) {
            // Vrátit POUZE neaktivní
            $sql = "SELECT * FROM " . TBL_ORGANIZACE_VIZITKA . " WHERE aktivni = 0 ORDER BY nazev_organizace ASC";
        } else {
            // Není specifikováno -> vrátit VŠECHNY
            $sql = "SELECT * FROM " . TBL_ORGANIZACE_VIZITKA . " ORDER BY nazev_organizace ASC";
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $organizace = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pro každou organizaci spočítat počet uživatelů (vždy pouze aktivní)
        foreach ($organizace as &$org) {
            $sql_users = "SELECT COUNT(*) as pocet FROM " . TBL_UZIVATELE . " WHERE organizace_id = :organizace_id AND aktivni = 1";
            
            $stmt_users = $db->prepare($sql_users);
            $stmt_users->execute(array(':organizace_id' => $org['id']));
            $row = $stmt_users->fetch(PDO::FETCH_ASSOC);
            
            $org['pocet_uzivatelu'] = (int)$row['pocet'];
        }
        unset($org);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $organizace
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání organizací: ' . $e->getMessage()));
    }
}

/**
 * Detail organizace podle ID
 * POST /organizace/by-id
 */
function handle_ciselniky_organizace_by_id($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "SELECT * FROM " . TBL_ORGANIZACE_VIZITKA . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(array('err' => 'Organizace nenalezena'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání organizace: ' . $e->getMessage()));
    }
}

/**
 * Vytvoření nové organizace
 * POST /organizace/insert
 */
function handle_ciselniky_organizace_insert($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Povinné pole
    $required_fields = array('ico', 'dic', 'nazev_organizace');
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            http_response_code(400);
            echo json_encode(array('err' => 'Chybí nebo je prázdný povinný parametr: ' . $field));
            return;
        }
    }

    try {
        $db = get_db($config);
        
        $sql = "
            INSERT INTO " . TBL_ORGANIZACE_VIZITKA . " 
            (ico, dic, nazev_organizace, ulice_cislo, mesto, psc, zastoupeny, datova_schranka, email, telefon, aktivni, dt_aktualizace) 
            VALUES (:ico, :dic, :nazev_organizace, :ulice_cislo, :mesto, :psc, :zastoupeny, :datova_schranka, :email, :telefon, :aktivni, NOW())
        ";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':ico' => trim($input['ico']),
            ':dic' => trim($input['dic']),
            ':nazev_organizace' => trim($input['nazev_organizace']),
            ':ulice_cislo' => isset($input['ulice_cislo']) ? trim($input['ulice_cislo']) : null,
            ':mesto' => isset($input['mesto']) ? trim($input['mesto']) : null,
            ':psc' => isset($input['psc']) ? trim($input['psc']) : null,
            ':zastoupeny' => isset($input['zastoupeny']) ? trim($input['zastoupeny']) : null,
            ':datova_schranka' => isset($input['datova_schranka']) ? trim($input['datova_schranka']) : null,
            ':email' => isset($input['email']) ? trim($input['email']) : null,
            ':telefon' => isset($input['telefon']) ? trim($input['telefon']) : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);
        $new_id = $db->lastInsertId();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Organizace byla vytvořena',
            'data' => array('id' => (int)$new_id)
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření organizace: ' . $e->getMessage()));
    }
}

/**
 * Aktualizace organizace
 * POST /organizace/update
 */
function handle_ciselniky_organizace_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    // Povinné pole
    $required_fields = array('ico', 'dic', 'nazev_organizace');
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            http_response_code(400);
            echo json_encode(array('err' => 'Chybí nebo je prázdný povinný parametr: ' . $field));
            return;
        }
    }

    try {
        $db = get_db($config);
        
        $sql = "
            UPDATE " . TBL_ORGANIZACE_VIZITKA . " 
            SET ico = :ico, dic = :dic, nazev_organizace = :nazev_organizace, 
                ulice_cislo = :ulice_cislo, mesto = :mesto, psc = :psc, 
                zastoupeny = :zastoupeny, datova_schranka = :datova_schranka, 
                email = :email, telefon = :telefon, aktivni = :aktivni, dt_aktualizace = NOW()
            WHERE id = :id
        ";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':id' => (int)$input['id'],
            ':ico' => trim($input['ico']),
            ':dic' => trim($input['dic']),
            ':nazev_organizace' => trim($input['nazev_organizace']),
            ':ulice_cislo' => isset($input['ulice_cislo']) ? trim($input['ulice_cislo']) : null,
            ':mesto' => isset($input['mesto']) ? trim($input['mesto']) : null,
            ':psc' => isset($input['psc']) ? trim($input['psc']) : null,
            ':zastoupeny' => isset($input['zastoupeny']) ? trim($input['zastoupeny']) : null,
            ':datova_schranka' => isset($input['datova_schranka']) ? trim($input['datova_schranka']) : null,
            ':email' => isset($input['email']) ? trim($input['email']) : null,
            ':telefon' => isset($input['telefon']) ? trim($input['telefon']) : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Organizace byla aktualizována'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Organizace nenalezena nebo nebyla změněna'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při aktualizaci organizace: ' . $e->getMessage()));
    }
}

/**
 * Smazání organizace (SOFT DELETE - aktivni = 0)
 * POST /organizace/delete
 */
function handle_ciselniky_organizace_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // SOFT DELETE - nastavení aktivni = 0 místo skutečného smazání
        $sql = "UPDATE " . TBL_ORGANIZACE_VIZITKA . " SET aktivni = 0 WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Organizace deaktivována'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Organizace nenalezena'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při deaktivaci organizace: ' . $e->getMessage()));
    }
}

// =============================================================================
// 5. DODAVATELÉ - TBL_DODAVATELE (25_dodavatele)
// =============================================================================

/**
 * Seznam všech dodavatelů
 * POST /dodavatele/list
 */
function handle_ciselniky_dodavatele_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Získat údaje aktuálního uživatele včetně jeho úseků
        $sqlUser = "SELECT u.id as user_id, u.usek_zkr FROM " . TBL_UZIVATELE . " u WHERE u.username = :username LIMIT 1";
        $stmtUser = $db->prepare($sqlUser);
        $stmtUser->bindParam(':username', $request_username, PDO::PARAM_STR);
        $stmtUser->execute();
        $currentUser = $stmtUser->fetch(PDO::FETCH_ASSOC);
        
        if (!$currentUser) {
            http_response_code(403);
            echo json_encode(array('err' => 'Uživatel nenalezen'));
            return;
        }
        
        $current_user_id = $currentUser['user_id'];
        $current_user_useky = $currentUser['usek_zkr'] ? json_decode($currentUser['usek_zkr'], true) : array();
        if (!is_array($current_user_useky)) {
            $current_user_useky = $currentUser['usek_zkr'] ? array($currentUser['usek_zkr']) : array();
        }
        
        // Kontrola oprávnění - SUPPLIER_MANAGE vidí všechny
        $has_supplier_manage = has_permission($db, $request_username, 'SUPPLIER_MANAGE');
        
        // Volitelný parametr pro zobrazení i neaktivních
        $show_inactive = isset($input['show_inactive']) ? (bool)$input['show_inactive'] : false;
        
        if ($has_supplier_manage) {
            // Admin vidí všechny dodavatele
            if ($show_inactive) {
                $sql = "SELECT * FROM " . TBL_DODAVATELE . " ORDER BY nazev ASC";
            } else {
                $sql = "SELECT * FROM " . TBL_DODAVATELE . " WHERE aktivni = 1 ORDER BY nazev ASC";
            }
            $stmt = $db->prepare($sql);
            $stmt->execute();
        } else {
            // Běžný uživatel vidí pouze:
            // 1. Své osobní dodavatele (user_id = current_user_id)
            // 2. Dodavatele svých úseků (usek_zkr obsahuje jeho úsek)
            // 3. Globální dodavatele (user_id = 0 AND usek_zkr IS NULL OR usek_zkr = '')
            
            $aktivniCondition = $show_inactive ? '' : ' AND aktivni = 1';
            
            // Složitější dotaz s filtrováním podle viditelnosti
            $sql = "SELECT * FROM " . TBL_DODAVATELE . " 
                    WHERE (
                        user_id = :user_id
                        OR (user_id = 0 AND (usek_zkr IS NULL OR usek_zkr = '' OR usek_zkr = '[]'))";
            
            // Přidáme kontrolu úseků, pokud má uživatel nějaké
            if (!empty($current_user_useky)) {
                $usekConditions = array();
                foreach ($current_user_useky as $idx => $usek) {
                    $usekConditions[] = "usek_zkr LIKE :usek_$idx";
                }
                if (!empty($usekConditions)) {
                    $sql .= " OR (" . implode(' OR ', $usekConditions) . ")";
                }
            }
            
            $sql .= ")" . $aktivniCondition . " ORDER BY nazev ASC";
            
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            
            // Bind úseky
            if (!empty($current_user_useky)) {
                foreach ($current_user_useky as $idx => $usek) {
                    $usekPattern = '%"' . $usek . '"%';
                    $stmt->bindValue(":usek_$idx", $usekPattern, PDO::PARAM_STR);
                }
            }
            
            $stmt->execute();
        }
        
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání dodavatelů: ' . $e->getMessage()));
    }
}

/**
 * Detail dodavatele podle ID
 * POST /dodavatele/by-id
 */
function handle_ciselniky_dodavatele_by_id($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "SELECT * FROM " . TBL_DODAVATELE . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(array('err' => 'Dodavatel nenalezen'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání dodavatele: ' . $e->getMessage()));
    }
}

// Poznámka: CRUD operace pro dodavatele včetně podpory soft delete pomocí sloupce 'aktivni'.
// Struktura tabulky 25_dodavatele: id, nazev, ico, dic, ulice, cp, mesto, psc, 
// stat, kontaktni_osoba, telefon, email, poznamka, aktivni, dt_vytvoreni, dt_aktualizace

/**
 * Vytvoření nového dodavatele
 * POST /dodavatele/insert
 */
function handle_ciselniky_dodavatele_insert($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['nazev'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí povinný parametr: nazev'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Zpracování usek_zkr - konverze array na JSON
        $usek_zkr_json = '';
        if (isset($input['usek_zkr'])) {
            if (is_array($input['usek_zkr'])) {
                // Pokud je to array, převeď na JSON array zkratek
                $usek_zkr_json = json_encode(array_values($input['usek_zkr']));
            } elseif (is_string($input['usek_zkr'])) {
                // Pokud je to už string, zkontroluj jestli je to validní JSON
                $decoded = json_decode($input['usek_zkr'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $usek_zkr_json = json_encode(array_values($decoded));
                } else {
                    // Není to JSON, předpokládej že je to jediná zkratka
                    $usek_zkr_json = json_encode(array($input['usek_zkr']));
                }
            }
        }
        
        $sql = "INSERT INTO " . TBL_DODAVATELE . " (
            nazev, ico, dic, ulice, cp, mesto, psc, stat, 
            kontaktni_osoba, telefon, email, poznamka, user_id, usek_zkr, aktivni
        ) VALUES (
            :nazev, :ico, :dic, :ulice, :cp, :mesto, :psc, :stat,
            :kontaktni_osoba, :telefon, :email, :poznamka, :user_id, :usek_zkr, :aktivni
        )";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':nazev' => $input['nazev'],
            ':ico' => isset($input['ico']) ? $input['ico'] : null,
            ':dic' => isset($input['dic']) ? $input['dic'] : null,
            ':ulice' => isset($input['ulice']) ? $input['ulice'] : null,
            ':cp' => isset($input['cp']) ? $input['cp'] : null,
            ':mesto' => isset($input['mesto']) ? $input['mesto'] : null,
            ':psc' => isset($input['psc']) ? $input['psc'] : null,
            ':stat' => isset($input['stat']) ? $input['stat'] : null,
            ':kontaktni_osoba' => isset($input['kontaktni_osoba']) ? $input['kontaktni_osoba'] : null,
            ':telefon' => isset($input['telefon']) ? $input['telefon'] : null,
            ':email' => isset($input['email']) ? $input['email'] : null,
            ':poznamka' => isset($input['poznamka']) ? $input['poznamka'] : null,
            ':user_id' => isset($input['user_id']) ? (int)$input['user_id'] : 0,
            ':usek_zkr' => $usek_zkr_json,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        ));

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Dodavatel vytvořen',
            'id' => $db->lastInsertId()
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření dodavatele: ' . $e->getMessage()));
    }
}

/**
 * Aktualizace dodavatele
 * POST /dodavatele/update
 */
function handle_ciselniky_dodavatele_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id']) || !isset($input['nazev'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí povinné parametry: id, nazev'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Zpracování usek_zkr - konverze array na JSON
        $usek_zkr_json = null;
        if (isset($input['usek_zkr'])) {
            if (is_array($input['usek_zkr'])) {
                // Pokud je to array, převeď na JSON array zkratek
                $usek_zkr_json = json_encode(array_values($input['usek_zkr']));
            } elseif (is_string($input['usek_zkr'])) {
                // Pokud je to už string, zkontroluj jestli je to validní JSON
                $decoded = json_decode($input['usek_zkr'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $usek_zkr_json = json_encode(array_values($decoded));
                } else {
                    // Není to JSON, předpokládej že je to jediná zkratka
                    $usek_zkr_json = json_encode(array($input['usek_zkr']));
                }
            }
        }
        
        $sql = "UPDATE " . TBL_DODAVATELE . " SET 
            nazev = :nazev,
            ico = :ico,
            dic = :dic,
            ulice = :ulice,
            cp = :cp,
            mesto = :mesto,
            psc = :psc,
            stat = :stat,
            kontaktni_osoba = :kontaktni_osoba,
            telefon = :telefon,
            email = :email,
            poznamka = :poznamka,
            user_id = :user_id,
            usek_zkr = :usek_zkr,
            aktivni = :aktivni
        WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':id' => $input['id'],
            ':nazev' => $input['nazev'],
            ':ico' => isset($input['ico']) ? $input['ico'] : null,
            ':dic' => isset($input['dic']) ? $input['dic'] : null,
            ':ulice' => isset($input['ulice']) ? $input['ulice'] : null,
            ':cp' => isset($input['cp']) ? $input['cp'] : null,
            ':mesto' => isset($input['mesto']) ? $input['mesto'] : null,
            ':psc' => isset($input['psc']) ? $input['psc'] : null,
            ':stat' => isset($input['stat']) ? $input['stat'] : null,
            ':kontaktni_osoba' => isset($input['kontaktni_osoba']) ? $input['kontaktni_osoba'] : null,
            ':telefon' => isset($input['telefon']) ? $input['telefon'] : null,
            ':email' => isset($input['email']) ? $input['email'] : null,
            ':poznamka' => isset($input['poznamka']) ? $input['poznamka'] : null,
            ':user_id' => isset($input['user_id']) ? (int)$input['user_id'] : 0,
            ':usek_zkr' => $usek_zkr_json,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        ));

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Dodavatel aktualizován'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při aktualizaci dodavatele: ' . $e->getMessage()));
    }
}

/**
 * Smazání dodavatele (soft delete pomocí aktivni = 0)
 * POST /dodavatele/delete
 */
function handle_ciselniky_dodavatele_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // SOFT DELETE - nastavení aktivni = 0 místo skutečného smazání
        $sql = "UPDATE " . TBL_DODAVATELE . " SET aktivni = 0 WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Dodavatel deaktivován'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Dodavatel nenalezen'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při deaktivaci dodavatele: ' . $e->getMessage()));
    }
}

// =============================================================================
// 6. STAVY - TBL_CISELNIK_STAVY (READ-ONLY)
// =============================================================================

/**
 * Seznam všech stavů
 * POST /stavy/list
 */
function handle_ciselniky_stavy_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný parametr pro zobrazení i neaktivních
        $zobrazit_neaktivni = isset($input['zobrazit_neaktivni']) ? (bool)$input['zobrazit_neaktivni'] : false;
        
        // Volitelný parametr pro zobrazení i stavů s prošlou platností
        $zobrazit_prosle = isset($input['zobrazit_prosle']) ? (bool)$input['zobrazit_prosle'] : false;
        
        // Volitelný filtr podle typu objektu
        $sql = "SELECT * FROM " . TBL_CISELNIK_STAVY . "";
        $params = array();
        $where_conditions = array();
        
        // Filtr na aktivni (pokud není zobrazit_neaktivni)
        if (!$zobrazit_neaktivni) {
            $where_conditions[] = "aktivni = 1";
        }
        
        // Filtr na platnost_do (pokud není zobrazit_prosle) - zobrazí pouze platné stavy
        if (!$zobrazit_prosle) {
            $where_conditions[] = "platnost_do >= CURDATE()";
        }
        
        // Filtr podle typu objektu
        if (isset($input['typ_objektu']) && !empty($input['typ_objektu'])) {
            $where_conditions[] = "typ_objektu = :typ_objektu";
            $params[':typ_objektu'] = $input['typ_objektu'];
        }
        
        // Přidání WHERE podmínek
        if (!empty($where_conditions)) {
            $sql .= " WHERE " . implode(" AND ", $where_conditions);
        }
        
        $sql .= " ORDER BY typ_objektu ASC, nazev_stavu ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání stavů: ' . $e->getMessage()));
    }
}

// =============================================================================
// 7. ROLE - 25_role (READ-ONLY)
// =============================================================================

/**
 * Seznam všech rolí
 * POST /role/list
 */
function handle_ciselniky_role_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný parametr pro zobrazení i neaktivních
        $show_inactive = isset($input['show_inactive']) ? (bool)$input['show_inactive'] : false;
        
        if ($show_inactive) {
            $sql = "SELECT * FROM " . TBL_ROLE . " ORDER BY nazev_role ASC";
        } else {
            $sql = "SELECT * FROM " . TBL_ROLE . " WHERE aktivni = 1 ORDER BY nazev_role ASC";
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pro každou roli načíst práva
        foreach ($roles as &$role) {
            $pravaStmt = $db->prepare("
                SELECT p.kod_prava, p.popis
                FROM " . TBL_ROLE_PRAVA . " rp
                JOIN " . TBL_PRAVA . " p ON rp.pravo_id = p.id
                WHERE rp.role_id = ? AND rp.aktivni = 1
            ");
            $pravaStmt->execute(array($role['id']));
            $prava = $pravaStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Analyzovat práva a určit přístup k modulům
            $hasOrderAccess = false;
            $hasInvoiceAccess = false;
            $hasCashbookAccess = false;
            
            foreach ($prava as $pravo) {
                if (strpos($pravo['kod_prava'], 'ORDER_') === 0) {
                    $hasOrderAccess = true;
                }
                if (strpos($pravo['kod_prava'], 'INVOICE_') === 0) {
                    $hasInvoiceAccess = true;
                }
                if (strpos($pravo['kod_prava'], 'CASHBOOK_') === 0) {
                    $hasCashbookAccess = true;
                }
            }
            
            $role['prava'] = $prava;
            $role['modules'] = array(
                'orders' => $hasOrderAccess,
                'invoices' => $hasInvoiceAccess,
                'cashbook' => $hasCashbookAccess
            );
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $roles
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání rolí: ' . $e->getMessage()));
    }
}

/**
 * Detail role podle ID
 * POST /role/by-id
 */
function handle_ciselniky_role_by_id($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "SELECT * FROM " . TBL_ROLE . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(array('err' => 'Role nenalezena'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání role: ' . $e->getMessage()));
    }
}

/**
 * Vytvoření nové role
 * POST /ciselniky/role/insert
 */
function handle_ciselniky_role_insert($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Validace povinných parametrů
    $nazev_role = isset($input['nazev_role']) ? trim($input['nazev_role']) : '';
    
    if (empty($nazev_role)) {
        http_response_code(400);
        echo json_encode(array('err' => 'Název role je povinný'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelné parametry
        $popis = isset($input['popis']) ? trim($input['popis']) : '';
        $aktivni = isset($input['aktivni']) ? (int)$input['aktivni'] : 1;
        
        // Validace aktivni (0 nebo 1)
        if ($aktivni !== 0 && $aktivni !== 1) {
            $aktivni = 1;
        }
        
        // INSERT do databáze
        $sql = "INSERT INTO " . TBL_ROLE . " (nazev_role, popis, aktivni) 
                VALUES (:nazev_role, :popis, :aktivni)";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':nazev_role', $nazev_role, PDO::PARAM_STR);
        $stmt->bindParam(':popis', $popis, PDO::PARAM_STR);
        $stmt->bindParam(':aktivni', $aktivni, PDO::PARAM_INT);
        $stmt->execute();
        
        $new_id = (int)$db->lastInsertId();
        
        // Načtení vytvořené role pro response
        $sql_select = "SELECT id, nazev_role, popis, aktivni 
                       FROM " . TBL_ROLE . " WHERE id = :id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->bindParam(':id', $new_id, PDO::PARAM_INT);
        $stmt_select->execute();
        $created_role = $stmt_select->fetch(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $created_role
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření role: ' . $e->getMessage()));
    }
}

/**
 * Aktualizace existující role
 * POST /ciselniky/role/update
 */
function handle_ciselniky_role_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Validace povinných parametrů
    $role_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if ($role_id <= 0) {
        http_response_code(400);
        echo json_encode(array('err' => 'ID role je povinné'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Kontrola existence role
        $sql_check = "SELECT id FROM " . TBL_ROLE . " WHERE id = :id";
        $stmt_check = $db->prepare($sql_check);
        $stmt_check->bindParam(':id', $role_id, PDO::PARAM_INT);
        $stmt_check->execute();
        
        if (!$stmt_check->fetch()) {
            http_response_code(404);
            echo json_encode(array('err' => 'Role s tímto ID nebyla nalezena'));
            return;
        }
        
        // Sestavení UPDATE dotazu - pouze pokud je parametr přítomen
        $updates = array();
        $params = array(':id' => $role_id);
        
        if (isset($input['nazev_role'])) {
            $updates[] = 'nazev_role = :nazev_role';
            $params[':nazev_role'] = trim($input['nazev_role']);
        }
        
        if (isset($input['popis'])) {
            $updates[] = 'popis = :popis';
            $params[':popis'] = trim($input['popis']);
        }
        
        if (isset($input['aktivni'])) {
            $aktivni = (int)$input['aktivni'];
            if ($aktivni !== 0 && $aktivni !== 1) {
                $aktivni = 1;
            }
            $updates[] = 'aktivni = :aktivni';
            $params[':aktivni'] = $aktivni;
        }
        
        if (count($updates) === 0) {
            http_response_code(400);
            echo json_encode(array('err' => 'Žádná data k aktualizaci'));
            return;
        }
        
        // UPDATE
        $sql = "UPDATE " . TBL_ROLE . " SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        // Načtení aktualizované role pro response
        $sql_select = "SELECT id, nazev_role, popis, aktivni 
                       FROM " . TBL_ROLE . " WHERE id = :id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->bindParam(':id', $role_id, PDO::PARAM_INT);
        $stmt_select->execute();
        $updated_role = $stmt_select->fetch(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'data' => $updated_role
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při aktualizaci role: ' . $e->getMessage()));
    }
}

/**
 * Seznam všech rolí ENRICHED - obohaceno o práva (strukturovaně)
 * POST /role/list-enriched
 */
function handle_ciselniky_role_list_enriched($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný parametr pro zobrazení i neaktivních
        $show_inactive = isset($input['show_inactive']) ? (bool)$input['show_inactive'] : false;
        
        // 1. Načtení všech rolí
        if ($show_inactive) {
            $sql_roles = "SELECT * FROM " . TBL_ROLE . " ORDER BY nazev_role ASC";
        } else {
            $sql_roles = "SELECT * FROM " . TBL_ROLE . " WHERE aktivni = 1 ORDER BY nazev_role ASC";
        }
        
        $stmt = $db->prepare($sql_roles);
        $stmt->execute();
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 2. Pro každou roli načíst práva rozdělená na globální a personalizovaná
        foreach ($roles as &$role) {
            
            // A) GLOBÁLNÍ PRÁVA (user_id = -1) - platí pro celou roli
            if ($show_inactive) {
                $sql_global = "
                    SELECT 
                        p.id,
                        p.kod_prava,
                        p.popis,
                        p.aktivni as pravo_aktivni,
                        rp.aktivni as vazba_aktivni
                    FROM " . TBL_ROLE_PRAVA . " rp
                    JOIN " . TBL_PRAVA . " p ON rp.pravo_id = p.id
                    WHERE rp.role_id = :role_id
                      AND rp.user_id = -1
                    ORDER BY p.kod_prava ASC
                ";
            } else {
                $sql_global = "
                    SELECT 
                        p.id,
                        p.kod_prava,
                        p.popis,
                        p.aktivni as pravo_aktivni,
                        rp.aktivni as vazba_aktivni
                    FROM " . TBL_ROLE_PRAVA . " rp
                    JOIN " . TBL_PRAVA . " p ON rp.pravo_id = p.id
                    WHERE rp.role_id = :role_id
                      AND rp.user_id = -1
                      AND rp.aktivni = 1
                      AND p.aktivni = 1
                    ORDER BY p.kod_prava ASC
                ";
            }
            
            $stmt_global = $db->prepare($sql_global);
            $stmt_global->execute(array(':role_id' => $role['id']));
            $prava_globalni = $stmt_global->fetchAll(PDO::FETCH_ASSOC);
            
            // Celkový počet uživatelů s rolí (pro statistiky)
            if ($show_inactive) {
                $sql_users_for_role = "
                    SELECT COUNT(DISTINCT ur.uzivatel_id) as pocet 
                    FROM " . TBL_UZIVATELE_ROLE . " ur
                    WHERE ur.role_id = :role_id
                ";
            } else {
                $sql_users_for_role = "
                    SELECT COUNT(DISTINCT ur.uzivatel_id) as pocet 
                    FROM " . TBL_UZIVATELE_ROLE . " ur
                    JOIN " . TBL_UZIVATELE . " u ON u.id = ur.uzivatel_id
                    WHERE ur.role_id = :role_id 
                      AND u.aktivni = 1
                ";
            }
            
            $stmt_users_for_role = $db->prepare($sql_users_for_role);
            $stmt_users_for_role->execute(array(':role_id' => $role['id']));
            $users_for_role_row = $stmt_users_for_role->fetch(PDO::FETCH_ASSOC);
            $pocet_uzivatelu_celkem = (int)$users_for_role_row['pocet'];
            
            // Pro každé právo spočítat CELKOVÝ počet uživatelů NAPŘÍČ VŠEMI ROLEMI
            // = uživatelé, kteří mají právo z JAKÉKOLIV role + personalizovaně přiřazení
            foreach ($prava_globalni as &$pravo) {
                if ($show_inactive) {
                    // Unikátní uživatelé s tímto právem:
                    // 1) mají jakoukoli roli, která má toto právo globálně (user_id = -1)
                    // 2) mají právo personalizovaně (user_id != -1)
                    $sql_users_count = "
                        SELECT COUNT(DISTINCT user_id) as pocet
                        FROM (
                            -- Uživatelé z rolí, které mají toto právo globálně
                            SELECT DISTINCT ur.uzivatel_id as user_id
                            FROM " . TBL_UZIVATELE_ROLE . " ur
                            WHERE EXISTS (
                                SELECT 1 FROM " . TBL_ROLE_PRAVA . " rp
                                WHERE rp.role_id = ur.role_id
                                  AND rp.pravo_id = :pravo_id
                                  AND rp.user_id = -1
                            )
                            
                            UNION
                            
                            -- Uživatelé s personalizovaným přiřazením tohoto práva
                            SELECT DISTINCT rp.user_id
                            FROM " . TBL_ROLE_PRAVA . " rp
                            WHERE rp.pravo_id = :pravo_id
                              AND rp.user_id != -1
                        ) AS combined_users
                    ";
                } else {
                    $sql_users_count = "
                        SELECT COUNT(DISTINCT user_id) as pocet
                        FROM (
                            -- Aktivní uživatelé z rolí, které mají toto právo globálně
                            SELECT DISTINCT ur.uzivatel_id as user_id
                            FROM " . TBL_UZIVATELE_ROLE . " ur
                            JOIN " . TBL_UZIVATELE . " u ON u.id = ur.uzivatel_id
                            WHERE u.aktivni = 1
                              AND EXISTS (
                                SELECT 1 FROM " . TBL_ROLE_PRAVA . " rp
                                WHERE rp.role_id = ur.role_id
                                  AND rp.pravo_id = :pravo_id
                                  AND rp.user_id = -1
                                  AND rp.aktivni = 1
                            )
                            
                            UNION
                            
                            -- Aktivní uživatelé s personalizovaným právem
                            SELECT DISTINCT rp.user_id
                            FROM " . TBL_ROLE_PRAVA . " rp
                            JOIN " . TBL_UZIVATELE . " u ON u.id = rp.user_id
                            WHERE rp.pravo_id = :pravo_id
                              AND rp.user_id != -1
                              AND rp.aktivni = 1
                              AND u.aktivni = 1
                        ) AS combined_users
                    ";
                }
                
                $stmt_users = $db->prepare($sql_users_count);
                $stmt_users->execute(array(
                    ':pravo_id' => $pravo['id']
                ));
                $users_row = $stmt_users->fetch(PDO::FETCH_ASSOC);
                
                // Celkový počet unikátních uživatelů s tímto právem (napříč všemi rolemi)
                $pravo['pocet_uzivatelu'] = (int)$users_row['pocet'];
            }
            unset($pravo); // Uvolnění reference
            
            // Přidání strukturovaných dat k roli
            $role['prava_globalni'] = $prava_globalni;
            
            // Statistiky
            $role['statistiky'] = array(
                'pocet_prav' => count($prava_globalni),
                'pocet_uzivatelu' => $pocet_uzivatelu_celkem
            );
        }
        unset($role); // Uvolnění reference

        echo json_encode(array(
            'status' => 'ok',
            'data' => $roles
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání rolí s právy: ' . $e->getMessage()));
    }
}

// =============================================================================
// 8. PRÁVA - 25_prava (READ-ONLY)
// =============================================================================

/**
 * Seznam všech práv
 * POST /prava/list
 */
function handle_ciselniky_prava_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Filtrovat pouze aktivní práva, pokud není explicitně požadováno jinak
        $show_inactive = isset($input['show_inactive']) && $input['show_inactive'] === true;
        
        if ($show_inactive) {
            $sql = "SELECT * FROM " . TBL_PRAVA . " ORDER BY kod_prava ASC";
        } else {
            $sql = "SELECT * FROM " . TBL_PRAVA . " WHERE aktivni = 1 ORDER BY kod_prava ASC";
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $prava = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pro každé právo spočítat počet uživatelů, kteří ho mají
        foreach ($prava as &$pravo) {
            if ($show_inactive) {
                // Unikátní uživatelé s tímto právem:
                // 1) mají jakoukoli roli, která má toto právo globálně (user_id = -1)
                // 2) mají právo personalizovaně (user_id != -1)
                $sql_users_count = "
                    SELECT COUNT(DISTINCT user_id) as pocet
                    FROM (
                        -- Uživatelé z rolí, které mají toto právo globálně
                        SELECT DISTINCT ur.uzivatel_id as user_id
                        FROM " . TBL_UZIVATELE_ROLE . " ur
                        WHERE EXISTS (
                            SELECT 1 FROM " . TBL_ROLE_PRAVA . " rp
                            WHERE rp.role_id = ur.role_id
                              AND rp.pravo_id = :pravo_id
                              AND rp.user_id = -1
                        )
                        
                        UNION
                        
                        -- Uživatelé s personalizovaným přiřazením tohoto práva
                        SELECT DISTINCT rp.user_id
                        FROM " . TBL_ROLE_PRAVA . " rp
                        WHERE rp.pravo_id = :pravo_id
                          AND rp.user_id != -1
                    ) AS combined_users
                ";
            } else {
                $sql_users_count = "
                    SELECT COUNT(DISTINCT user_id) as pocet
                    FROM (
                        -- Aktivní uživatelé z rolí, které mají toto právo globálně
                        SELECT DISTINCT ur.uzivatel_id as user_id
                        FROM " . TBL_UZIVATELE_ROLE . " ur
                        JOIN " . TBL_UZIVATELE . " u ON u.id = ur.uzivatel_id
                        WHERE u.aktivni = 1
                          AND EXISTS (
                            SELECT 1 FROM " . TBL_ROLE_PRAVA . " rp
                            WHERE rp.role_id = ur.role_id
                              AND rp.pravo_id = :pravo_id
                              AND rp.user_id = -1
                              AND rp.aktivni = 1
                        )
                        
                        UNION
                        
                        -- Aktivní uživatelé s personalizovaným právem
                        SELECT DISTINCT rp.user_id
                        FROM " . TBL_ROLE_PRAVA . " rp
                        JOIN " . TBL_UZIVATELE . " u ON u.id = rp.user_id
                        WHERE rp.pravo_id = :pravo_id
                          AND rp.user_id != -1
                          AND rp.aktivni = 1
                          AND u.aktivni = 1
                    ) AS combined_users
                ";
            }
            
            $stmt_users = $db->prepare($sql_users_count);
            $stmt_users->execute(array(':pravo_id' => $pravo['id']));
            $users_row = $stmt_users->fetch(PDO::FETCH_ASSOC);
            
            // Přidat počet uživatelů k právu
            $pravo['pocet_uzivatelu'] = (int)$users_row['pocet'];
        }
        unset($pravo); // Uvolnění reference

        echo json_encode(array(
            'status' => 'ok',
            'data' => $prava
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání práv: ' . $e->getMessage()));
    }
}

/**
 * Detail práva podle ID
 * POST /prava/by-id
 */
function handle_ciselniky_prava_by_id($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí parametr ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "SELECT * FROM " . TBL_PRAVA . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(array('err' => 'Právo nenalezeno'));
            return;
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $data
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání práva: ' . $e->getMessage()));
    }
}

/**
 * Vytvoření nového práva
 * POST /ciselniky/prava/insert
 */
function handle_ciselniky_prava_insert($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Validace povinných polí
    if (!isset($input['kod_prava']) || trim($input['kod_prava']) === '') {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí povinné pole: kod_prava'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "INSERT INTO " . TBL_PRAVA . " (kod_prava, popis, aktivni) VALUES (:kod_prava, :popis, :aktivni)";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':kod_prava' => trim($input['kod_prava']),
            ':popis' => isset($input['popis']) ? trim($input['popis']) : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);
        $new_id = $db->lastInsertId();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Právo bylo vytvořeno',
            'data' => array('id' => (int)$new_id)
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření práva: ' . $e->getMessage()));
    }
}

/**
 * Aktualizace práva
 * POST /ciselniky/prava/update
 */
function handle_ciselniky_prava_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Validace povinných polí
    if (!isset($input['id']) || (int)$input['id'] <= 0) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí nebo neplatné pole: id'));
        return;
    }

    if (!isset($input['kod_prava']) || trim($input['kod_prava']) === '') {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí povinné pole: kod_prava'));
        return;
    }

    try {
        $db = get_db($config);
        
        $sql = "UPDATE " . TBL_PRAVA . " SET kod_prava = :kod_prava, popis = :popis, aktivni = :aktivni WHERE id = :id";
        $stmt = $db->prepare($sql);
        
        $params = array(
            ':id' => (int)$input['id'],
            ':kod_prava' => trim($input['kod_prava']),
            ':popis' => isset($input['popis']) ? trim($input['popis']) : null,
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1
        );
        
        $stmt->execute($params);

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Právo bylo aktualizováno'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Právo nenalezeno nebo nebylo změněno'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při aktualizaci práva: ' . $e->getMessage()));
    }
}

/**
 * Smazání práva (soft delete - nastavení aktivni = 0)
 * POST /ciselniky/prava/delete
 */
function handle_ciselniky_prava_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    if (!isset($input['id']) || (int)$input['id'] <= 0) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí nebo neplatné pole: id'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Soft delete - nastavíme aktivni = 0
        $sql = "UPDATE " . TBL_PRAVA . " SET aktivni = 0 WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Právo bylo deaktivováno'
            ));
        } else {
            http_response_code(404);
            echo json_encode(array('err' => 'Právo nenalezeno'));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při mazání práva: ' . $e->getMessage()));
    }
}

// =============================================================================
// 9. SPRÁVA PRÁV ROLÍ - TBL_ROLE_PRAVA (25_role_prava)
// =============================================================================

/**
 * Přiřadit právo k roli
 * POST /ciselniky/role/assign-pravo
 * 
 * Bezpečně přiřadí právo k roli (user_id = -1 pro globální práva role).
 * Nedotýká se uživatelských práv (role_id = -1).
 */
function handle_ciselniky_role_assign_pravo($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Validace vstupů - kompatibilní se string i int z FE
    if (!isset($input['role_id']) || empty($input['role_id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí pole: role_id'));
        return;
    }

    if (!isset($input['pravo_id']) || empty($input['pravo_id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí pole: pravo_id'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Konverze na int pro bezpečné použití v SQL
        $role_id = (int)$input['role_id'];
        $pravo_id = (int)$input['pravo_id'];
        
        if ($role_id <= 0 || $pravo_id <= 0) {
            http_response_code(400);
            echo json_encode(array('err' => 'Neplatná hodnota role_id nebo pravo_id'));
            return;
        }

        // Kontrola, zda vazba již neexistuje (POUZE pro globální práva role, user_id = -1)
        $sql_check = "
            SELECT COUNT(*) as count
            FROM " . TBL_ROLE_PRAVA . "
            WHERE role_id = :role_id 
              AND pravo_id = :pravo_id 
              AND user_id = -1
        ";
        $stmt_check = $db->prepare($sql_check);
        $stmt_check->execute(array(
            ':role_id' => $role_id,
            ':pravo_id' => $pravo_id
        ));
        $row = $stmt_check->fetch(PDO::FETCH_ASSOC);
        
        if ((int)$row['count'] > 0) {
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Právo již je přiřazeno k této roli'
            ));
            return;
        }
        
        // Přiřazení práva k roli (user_id = -1 = globální práva role)
        $sql_insert = "
            INSERT INTO " . TBL_ROLE_PRAVA . " (user_id, role_id, pravo_id, aktivni)
            VALUES (-1, :role_id, :pravo_id, 1)
        ";
        $stmt_insert = $db->prepare($sql_insert);
        $stmt_insert->execute(array(
            ':role_id' => $role_id,
            ':pravo_id' => $pravo_id
        ));

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Právo bylo přiřazeno k roli'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při přiřazování práva: ' . $e->getMessage()
        ));
    }
}

/**
 * Odebrat právo z role
 * POST /ciselniky/role/remove-pravo
 * 
 * Bezpečně odebere právo z role (user_id = -1).
 * KRITICKÉ: Nedotýká se uživatelských práv (role_id = -1).
 */
function handle_ciselniky_role_remove_pravo($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Validace vstupů - kompatibilní se string i int z FE
    if (!isset($input['role_id']) || empty($input['role_id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí pole: role_id'));
        return;
    }

    if (!isset($input['pravo_id']) || empty($input['pravo_id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí pole: pravo_id'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Konverze na int pro bezpečné použití v SQL
        $role_id = (int)$input['role_id'];
        $pravo_id = (int)$input['pravo_id'];
        
        if ($role_id <= 0 || $pravo_id <= 0) {
            http_response_code(400);
            echo json_encode(array('err' => 'Neplatná hodnota role_id nebo pravo_id'));
            return;
        }

        // KRITICKÉ: Smazat POUZE globální práva role (user_id = -1), 
        // NIKDY ne individuální uživatelská práva (user_id > 0)!
        $sql_delete = "
            DELETE FROM " . TBL_ROLE_PRAVA . "
            WHERE role_id = :role_id 
              AND pravo_id = :pravo_id 
              AND user_id = -1
        ";
        $stmt_delete = $db->prepare($sql_delete);
        $stmt_delete->execute(array(
            ':role_id' => $role_id,
            ':pravo_id' => $pravo_id
        ));

        if ($stmt_delete->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Právo bylo odebráno z role'
            ));
        } else {
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Právo nebylo přiřazeno k této roli'
            ));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při odebírání práva: ' . $e->getMessage()
        ));
    }
}

/**
 * Vyčistit duplicitní přiřazení práv k rolím (jednorázová akce)
 * POST /ciselniky/role/cleanup-duplicates
 * 
 * KRITICKÉ: Mění data v DB! Podporuje dry_run mode pro náhled.
 * Maže POUZE duplicitní záznamy globálních práv rolí (user_id = -1).
 * NIKDY nemaže individuální uživatelská práva (user_id > 0).
 */
function handle_ciselniky_role_cleanup_duplicates($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Parametry
    $confirm_cleanup = isset($input['confirm_cleanup']) ? (bool)$input['confirm_cleanup'] : false;
    $dry_run = isset($input['dry_run']) ? (bool)$input['dry_run'] : false;

    // Bezpečnostní kontrola - musí explicitně potvrdit (kromě dry_run)
    if (!$dry_run && !$confirm_cleanup) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Musíte potvrdit operaci nastavením confirm_cleanup = true'
        ));
        return;
    }

    try {
        $db = get_db($config);
        
        // KROK 1: Najdi všechny duplicitní záznamy v právech ROLÍ
        $sql_find_duplicates = "
            SELECT 
                rp.user_id,
                rp.role_id,
                rp.pravo_id,
                COUNT(*) as pocet,
                r.nazev_role,
                p.kod_prava,
                GROUP_CONCAT(rp.id ORDER BY rp.id) as duplicate_ids
            FROM " . TBL_ROLE_PRAVA . " rp
            LEFT JOIN " . TBL_ROLE . " r ON rp.role_id = r.id
            LEFT JOIN " . TBL_PRAVA . " p ON rp.pravo_id = p.id
            WHERE rp.user_id = -1
              AND rp.role_id > 0
            GROUP BY rp.user_id, rp.role_id, rp.pravo_id
            HAVING pocet > 1
            ORDER BY pocet DESC, rp.role_id
        ";
        
        $stmt_find = $db->prepare($sql_find_duplicates);
        $stmt_find->execute();
        $duplicates = $stmt_find->fetchAll(PDO::FETCH_ASSOC);
        
        // Spočítej celkový počet duplicit (celkem - 1 z každé skupiny)
        $total_duplicates = 0;
        $details = array();
        
        foreach ($duplicates as $row) {
            $count = (int)$row['pocet'];
            $total_duplicates += ($count - 1); // Ponecháme 1, ostatní jsou duplicity
            
            $details[] = array(
                'user_id' => (int)$row['user_id'],
                'role_id' => (int)$row['role_id'],
                'pravo_id' => (int)$row['pravo_id'],
                'count' => $count,
                'role_nazev' => $row['nazev_role'],
                'pravo_kod' => $row['kod_prava']
            );
        }
        
        // Pokud je dry_run, pouze vrať info bez mazání
        if ($dry_run) {
            echo json_encode(array(
                'status' => 'ok',
                'dry_run' => true,
                'message' => 'Náhled duplicit (data nebyla změněna)',
                'duplicates_found' => $total_duplicates,
                'details' => $details
            ));
            return;
        }
        
        // Pokud nejsou žádné duplicity, nic neděláme
        if ($total_duplicates === 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Nebyly nalezeny žádné duplicity',
                'deleted_count' => 0
            ));
            return;
        }
        
        // KROK 2: Spusť transakci pro bezpečné mazání
        $db->beginTransaction();
        
        // KROK 3: Smaž duplicity (ponechej nejstarší záznam = nejmenší ID)
        $sql_delete_duplicates = "
            DELETE rp1 
            FROM " . TBL_ROLE_PRAVA . " rp1
            INNER JOIN " . TBL_ROLE_PRAVA . " rp2 
            ON rp1.user_id = rp2.user_id 
               AND rp1.role_id = rp2.role_id 
               AND rp1.pravo_id = rp2.pravo_id
               AND rp1.id > rp2.id
            WHERE rp1.user_id = -1
              AND rp1.role_id > 0
        ";
        
        $stmt_delete = $db->prepare($sql_delete_duplicates);
        $stmt_delete->execute();
        $deleted_count = $stmt_delete->rowCount();
        
        // KROK 4: Přidej UNIQUE constraint (pokud ještě neexistuje)
        $sql_check_constraint = "
            SELECT COUNT(*) as constraint_exists
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = '25_role_prava'
              AND index_name = 'unique_user_role_pravo'
        ";
        
        $stmt_check = $db->prepare($sql_check_constraint);
        $stmt_check->execute();
        $constraint_row = $stmt_check->fetch(PDO::FETCH_ASSOC);
        $constraint_exists = (int)$constraint_row['constraint_exists'] > 0;
        
        if (!$constraint_exists) {
            $sql_add_constraint = "
                ALTER TABLE TBL_ROLE_PRAVA (25_role_prava)
                ADD UNIQUE KEY unique_user_role_pravo (user_id, role_id, pravo_id)
            ";
            $stmt_alter = $db->prepare($sql_add_constraint);
            $stmt_alter->execute();
        }
        
        // Commit transakce
        $db->commit();
        
        // Agreguj výsledky podle rolí pro přehledný výstup
        $affected_roles = array();
        foreach ($details as $dup) {
            $role_id = $dup['role_id'];
            if (!isset($affected_roles[$role_id])) {
                $affected_roles[$role_id] = array(
                    'role_id' => $role_id,
                    'nazev' => $dup['role_nazev'],
                    'duplicates' => 0
                );
            }
            $affected_roles[$role_id]['duplicates'] += ($dup['count'] - 1);
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Duplicity byly úspěšně odstraněny',
            'deleted_count' => $deleted_count,
            'affected_roles' => array_values($affected_roles),
            'unique_constraint_added' => !$constraint_exists
        ));
        
    } catch (Exception $e) {
        // Rollback v případě chyby
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při čištění duplicit: ' . $e->getMessage()
        ));
    }
}

/**
 * Hromadná aktualizace práv role (přidání a odebrání v jedné transakci)
 * POST /ciselniky/role/bulk-update-prava
 * 
 * Efektivní endpoint pro přidání a odebrání více práv najednou.
 * Atomická operace - buď se provede vše, nebo nic.
 * Pracuje POUZE s globálními právy rolí (user_id = -1).
 */
function handle_ciselniky_role_bulk_update_prava($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu'));
        return;
    }

    // Validace role_id
    if (!isset($input['role_id']) || empty($input['role_id'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí pole: role_id'));
        return;
    }

    $role_id = (int)$input['role_id'];
    if ($role_id <= 0) {
        http_response_code(400);
        echo json_encode(array('err' => 'Neplatná hodnota role_id'));
        return;
    }

    // Parametry - mohou být prázdná pole
    $prava_to_add = isset($input['prava_to_add']) && is_array($input['prava_to_add']) 
        ? $input['prava_to_add'] 
        : array();
    $prava_to_remove = isset($input['prava_to_remove']) && is_array($input['prava_to_remove']) 
        ? $input['prava_to_remove'] 
        : array();

    // Převeď na int array a filtruj neplatné hodnoty
    $prava_to_add = array_filter(array_map('intval', $prava_to_add), function($id) { return $id > 0; });
    $prava_to_remove = array_filter(array_map('intval', $prava_to_remove), function($id) { return $id > 0; });

    // Pokud jsou oba pole prázdná, vrať OK bez změn
    if (empty($prava_to_add) && empty($prava_to_remove)) {
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Žádné změny nebyly provedeny',
            'added_count' => 0,
            'removed_count' => 0,
            'details' => array(
                'added' => array(),
                'removed' => array()
            )
        ));
        return;
    }

    try {
        $db = get_db($config);
        
        // Ověř, že role existuje
        $stmt_check_role = $db->prepare("SELECT id, nazev_role FROM " . TBL_ROLE . " WHERE id = :role_id");
        $stmt_check_role->execute(array(':role_id' => $role_id));
        $role = $stmt_check_role->fetch(PDO::FETCH_ASSOC);
        
        if (!$role) {
            http_response_code(404);
            echo json_encode(array('err' => 'Role neexistuje'));
            return;
        }
        
        // Začni transakci
        $db->beginTransaction();
        
        $added_count = 0;
        $removed_count = 0;
        $added_details = array();
        $removed_details = array();

        // === PŘIDÁNÍ PRÁV ===
        if (!empty($prava_to_add)) {
            // PHP 5.6 compatible - použijeme INSERT IGNORE pro duplicity
            $values = array();
            $placeholders = array();
            $i = 0;
            
            foreach ($prava_to_add as $pravo_id) {
                $placeholders[] = "(-1, :role_id, :pravo_id_$i, 1)";
                $values[":pravo_id_$i"] = $pravo_id;
                $i++;
            }
            
            if (!empty($placeholders)) {
                // INSERT IGNORE - vloží pouze nové záznamy, duplicity ignoruje
                $sql_insert = "
                    INSERT IGNORE INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
                    VALUES " . implode(", ", $placeholders);
                
                $values[':role_id'] = $role_id;
                
                $stmt_insert = $db->prepare($sql_insert);
                $stmt_insert->execute($values);
                $added_count = $stmt_insert->rowCount();
                
                // Získej detaily přidaných práv
                $ids_params = array();
                $ids_placeholder = array();
                foreach ($prava_to_add as $idx => $pravo_id) {
                    $param_name = ":pravo_detail_$idx";
                    $ids_placeholder[] = $param_name;
                    $ids_params[$param_name] = $pravo_id;
                }
                $sql_details = "SELECT id, kod_prava FROM " . TBL_PRAVA . " WHERE id IN (" . implode(',', $ids_placeholder) . ")";
                $stmt_details = $db->prepare($sql_details);
                $stmt_details->execute($ids_params);
                
                while ($row = $stmt_details->fetch(PDO::FETCH_ASSOC)) {
                    $added_details[] = array(
                        'pravo_id' => (int)$row['id'],
                        'kod_prava' => $row['kod_prava']
                    );
                }
            }
        }

        // === ODEBRÁNÍ PRÁV ===
        if (!empty($prava_to_remove)) {
            // Nejdřív získej detaily pro response
            $ids_params_select = array();
            $ids_placeholder_select = array();
            foreach ($prava_to_remove as $idx => $pravo_id) {
                $param_name = ":pravo_detail_remove_$idx";
                $ids_placeholder_select[] = $param_name;
                $ids_params_select[$param_name] = $pravo_id;
            }
            $sql_details = "SELECT id, kod_prava FROM " . TBL_PRAVA . " WHERE id IN (" . implode(',', $ids_placeholder_select) . ")";
            $stmt_details = $db->prepare($sql_details);
            $stmt_details->execute($ids_params_select);
            
            while ($row = $stmt_details->fetch(PDO::FETCH_ASSOC)) {
                $removed_details[] = array(
                    'pravo_id' => (int)$row['id'],
                    'kod_prava' => $row['kod_prava']
                );
            }
            
            // KRITICKÉ: Smaž POUZE globální práva role (user_id = -1)
            $ids_params_delete = array();
            $ids_placeholder_delete = array();
            foreach ($prava_to_remove as $idx => $pravo_id) {
                $param_name = ":pravo_delete_$idx";
                $ids_placeholder_delete[] = $param_name;
                $ids_params_delete[$param_name] = $pravo_id;
            }
            $sql_delete = "
                DELETE FROM " . TBL_ROLE_PRAVA . " 
                WHERE user_id = -1 
                  AND role_id = :role_id 
                  AND pravo_id IN (" . implode(',', $ids_placeholder_delete) . ")
            ";
            
            $ids_params_delete[':role_id'] = $role_id;
            $stmt_delete = $db->prepare($sql_delete);
            $stmt_delete->execute($ids_params_delete);
            $removed_count = $stmt_delete->rowCount();
        }

        // Commit transakce
        $db->commit();

        // Úspěšná response
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Práva byla úspěšně aktualizována',
            'added_count' => $added_count,
            'removed_count' => $removed_count,
            'details' => array(
                'added' => $added_details,
                'removed' => $removed_details
            )
        ));

    } catch (Exception $e) {
        // Rollback v případě chyby
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při hromadné aktualizaci práv: ' . $e->getMessage()
        ));
    }
}

?>