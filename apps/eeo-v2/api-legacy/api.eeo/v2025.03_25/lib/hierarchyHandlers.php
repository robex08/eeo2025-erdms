<?php
// v2025.03_25/lib/hierarchyHandlers.php

// ============ HIERARCHIE UŽIVATELŮ ============

function handle_hierarchy_subordinates($data, $pdo) {
    global $queries;
    
    // Validace vstupních dat
    if (!isset($data['user_id']) || !is_numeric($data['user_id'])) {
        return array('status' => 'error', 'message' => 'Chybí nebo neplatné user_id');
    }
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    try {
        $stmt = $pdo->prepare($queries['hierarchy_get_subordinates']);
        $stmt->bindParam(':nadrizeny_id', $data['user_id'], PDO::PARAM_INT);
        $stmt->execute();
        
        $subordinates = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $subordinates[] = array(
                'id' => (int)$row['podrizeny_id'],
                'username' => $row['username'],
                'jmeno' => $row['jmeno'],
                'prijmeni' => $row['prijmeni'],
                'titul_pred' => $row['titul_pred'],
                'titul_za' => $row['titul_za'],
                'email' => $row['email'],
                'pozice_nazev' => $row['nazev_pozice'],
                'organizace_nazev' => $row['organizace_nazev'],
                'usek_nazev' => $row['usek_nazev'],
                'hierarchie' => array(
                    'dt_od' => $row['dt_od'],
                    'dt_do' => $row['dt_do'],
                    'aktivni' => (int)$row['aktivni'],
                    'poznamka' => $row['poznamka']
                )
            );
        }
        
        return array(
            'status' => 'ok',
            'data' => $subordinates,
            'count' => count($subordinates)
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_hierarchy_subordinates: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání podřízených');
    }
}

function handle_hierarchy_superiors($data, $pdo) {
    global $queries;
    
    // Validace vstupních dat
    if (!isset($data['user_id']) || !is_numeric($data['user_id'])) {
        return array('status' => 'error', 'message' => 'Chybí nebo neplatné user_id');
    }
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    try {
        $stmt = $pdo->prepare($queries['hierarchy_get_superiors']);
        $stmt->bindParam(':podrizeny_id', $data['user_id'], PDO::PARAM_INT);
        $stmt->execute();
        
        $superiors = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $superiors[] = array(
                'id' => (int)$row['nadrizeny_id'],
                'username' => $row['username'],
                'jmeno' => $row['jmeno'],
                'prijmeni' => $row['prijmeni'],
                'titul_pred' => $row['titul_pred'],
                'titul_za' => $row['titul_za'],
                'email' => $row['email'],
                'pozice_nazev' => $row['nazev_pozice'],
                'organizace_nazev' => $row['organizace_nazev'],
                'usek_nazev' => $row['usek_nazev'],
                'hierarchie' => array(
                    'dt_od' => $row['dt_od'],
                    'dt_do' => $row['dt_do'],
                    'aktivni' => (int)$row['aktivni'],
                    'poznamka' => $row['poznamka']
                )
            );
        }
        
        return array(
            'status' => 'ok',
            'data' => $superiors,
            'count' => count($superiors)
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_hierarchy_superiors: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání nadřízených');
    }
}

function handle_hierarchy_add_relation($data, $pdo) {
    global $queries;
    
    // Validace vstupních dat
    $required_fields = array('nadrizeny_id', 'podrizeny_id');
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || !is_numeric($data[$field])) {
            return array('status' => 'error', 'message' => "Chybí nebo neplatné pole: $field");
        }
    }
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    // Kontrola oprávnění
    if (!has_permission($auth_result['user_id'], 'HIERARCHY_MANAGE', $pdo)) {
        return array('status' => 'error', 'message' => 'Nemáte oprávnění ke správě hierarchie');
    }
    
    // Validace dat
    if ($data['nadrizeny_id'] == $data['podrizeny_id']) {
        return array('status' => 'error', 'message' => 'Uživatel nemůže být sám sobě nadřízený');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Kontrola existence uživatelů
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM 25_uzivatele WHERE id IN (:nadrizeny_id, :podrizeny_id) AND aktivni = 1");
        $stmt->bindParam(':nadrizeny_id', $data['nadrizeny_id'], PDO::PARAM_INT);
        $stmt->bindParam(':podrizeny_id', $data['podrizeny_id'], PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->fetchColumn() != 2) {
            $pdo->rollBack();
            return array('status' => 'error', 'message' => 'Jeden nebo oba uživatelé neexistují nebo nejsou aktivní');
        }
        
        // Příprava dat pro vložení
        $dt_od = isset($data['dt_od']) ? $data['dt_od'] : date('Y-m-d');
        $dt_do = isset($data['dt_do']) ? $data['dt_do'] : null;
        $aktivni = isset($data['aktivni']) ? (int)$data['aktivni'] : 1;
        $poznamka = isset($data['poznamka']) ? $data['poznamka'] : null;
        
        // Vložení vztahu
        $stmt = $pdo->prepare($queries['hierarchy_add_relation']);
        $stmt->bindParam(':nadrizeny_id', $data['nadrizeny_id'], PDO::PARAM_INT);
        $stmt->bindParam(':podrizeny_id', $data['podrizeny_id'], PDO::PARAM_INT);
        $stmt->bindParam(':dt_od', $dt_od);
        $stmt->bindParam(':dt_do', $dt_do);
        $stmt->bindParam(':aktivni', $aktivni, PDO::PARAM_INT);
        $stmt->bindParam(':poznamka', $poznamka);
        
        $stmt->execute();
        
        $pdo->commit();
        
        return array(
            'status' => 'ok',
            'message' => 'Hierarchický vztah byl úspěšně vytvořen',
            'data' => array(
                'nadrizeny_id' => (int)$data['nadrizeny_id'],
                'podrizeny_id' => (int)$data['podrizeny_id'],
                'dt_od' => $dt_od,
                'dt_do' => $dt_do,
                'aktivni' => $aktivni
            )
        );
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        
        // Kontrola duplikátu
        if ($e->getCode() == 23000) {
            return array('status' => 'error', 'message' => 'Hierarchický vztah již existuje');
        }
        
        error_log("Database error in handle_hierarchy_add_relation: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při vytváření hierarchického vztahu');
    }
}

function handle_hierarchy_remove_relation($data, $pdo) {
    global $queries;
    
    // Validace vstupních dat
    if (!isset($data['nadrizeny_id']) || !is_numeric($data['nadrizeny_id']) ||
        !isset($data['podrizeny_id']) || !is_numeric($data['podrizeny_id'])) {
        return array('status' => 'error', 'message' => 'Chybí nebo neplatné nadrizeny_id nebo podrizeny_id');
    }
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    // Kontrola oprávnění
    if (!has_permission($auth_result['user_id'], 'HIERARCHY_MANAGE', $pdo)) {
        return array('status' => 'error', 'message' => 'Nemáte oprávnění ke správě hierarchie');
    }
    
    try {
        $stmt = $pdo->prepare($queries['hierarchy_remove_relation']);
        $stmt->bindParam(':nadrizeny_id', $data['nadrizeny_id'], PDO::PARAM_INT);
        $stmt->bindParam(':podrizeny_id', $data['podrizeny_id'], PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return array(
                'status' => 'ok',
                'message' => 'Hierarchický vztah byl úspěšně ukončen',
                'data' => array(
                    'nadrizeny_id' => (int)$data['nadrizeny_id'],
                    'podrizeny_id' => (int)$data['podrizeny_id'],
                    'dt_ukonceni' => date('Y-m-d')
                )
            );
        } else {
            return array('status' => 'error', 'message' => 'Hierarchický vztah nebyl nalezen nebo již není aktivní');
        }
        
    } catch (PDOException $e) {
        error_log("Database error in handle_hierarchy_remove_relation: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při ukončování hierarchického vztahu');
    }
}

// ============ ZASTUPOVÁNÍ UŽIVATELŮ ============

function handle_substitution_list($data, $pdo) {
    global $queries;
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    try {
        // Pokud je zadán user_id, vrátí zastupování pro konkrétního uživatele
        if (isset($data['user_id']) && is_numeric($data['user_id'])) {
            $stmt = $pdo->prepare($queries['substitution_get_by_user']);
            $stmt->bindParam(':user_id', $data['user_id'], PDO::PARAM_INT);
        } else {
            // Jinak vrátí všechna aktivní zastupování
            $stmt = $pdo->prepare($queries['substitution_get_active']);
        }
        
        $stmt->execute();
        
        $substitutions = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $substitutions[] = array(
                'id' => (int)$row['id'],
                'zastupovany' => array(
                    'id' => (int)$row['zastupovany_id'],
                    'username' => $row['zastupovany_username'],
                    'jmeno' => $row['zastupovany_jmeno'],
                    'prijmeni' => $row['zastupovany_prijmeni']
                ),
                'zastupce' => array(
                    'id' => (int)$row['zastupce_id'],
                    'username' => $row['zastupce_username'],
                    'jmeno' => $row['zastupce_jmeno'],
                    'prijmeni' => $row['zastupce_prijmeni']
                ),
                'dt_od' => $row['dt_od'],
                'dt_do' => $row['dt_do'],
                'typ_zastupovani' => $row['typ_zastupovani'],
                'popis' => $row['popis'],
                'aktivni' => isset($row['aktivni']) ? (int)$row['aktivni'] : 1,
                'vytvoril_username' => isset($row['vytvoril_username']) ? $row['vytvoril_username'] : null
            );
        }
        
        return array(
            'status' => 'ok',
            'data' => $substitutions,
            'count' => count($substitutions)
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_substitution_list: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání zastupování');
    }
}

function handle_substitution_create($data, $pdo) {
    global $queries;
    
    // Validace vstupních dat
    $required_fields = array('zastupovany_id', 'zastupce_id', 'dt_od', 'dt_do', 'typ_zastupovani');
    foreach ($required_fields as $field) {
        if (!isset($data[$field])) {
            return array('status' => 'error', 'message' => "Chybí povinné pole: $field");
        }
    }
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    // Kontrola oprávnění
    if (!has_permission($auth_result['user_id'], 'USER_SUBSTITUTE_MANAGE', $pdo)) {
        return array('status' => 'error', 'message' => 'Nemáte oprávnění ke správě zastupování');
    }
    
    // Validace dat
    if ($data['zastupovany_id'] == $data['zastupce_id']) {
        return array('status' => 'error', 'message' => 'Uživatel nemůže zastupovat sám sebe');
    }
    
    if (strtotime($data['dt_od']) >= strtotime($data['dt_do'])) {
        return array('status' => 'error', 'message' => 'Datum začátku musí být před datem konce');
    }
    
    $allowed_types = array('full', 'orders_only', 'limited');
    if (!in_array($data['typ_zastupovani'], $allowed_types)) {
        return array('status' => 'error', 'message' => 'Neplatný typ zastupování');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Kontrola existence uživatelů
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM 25_uzivatele WHERE id IN (:zastupovany_id, :zastupce_id) AND aktivni = 1");
        $stmt->bindParam(':zastupovany_id', $data['zastupovany_id'], PDO::PARAM_INT);
        $stmt->bindParam(':zastupce_id', $data['zastupce_id'], PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->fetchColumn() != 2) {
            $pdo->rollBack();
            return array('status' => 'error', 'message' => 'Jeden nebo oba uživatelé neexistují nebo nejsou aktivní');
        }
        
        // Vložení zastupování
        $stmt = $pdo->prepare($queries['substitution_create']);
        $stmt->bindParam(':zastupovany_id', $data['zastupovany_id'], PDO::PARAM_INT);
        $stmt->bindParam(':zastupce_id', $data['zastupce_id'], PDO::PARAM_INT);
        $stmt->bindParam(':dt_od', $data['dt_od']);
        $stmt->bindParam(':dt_do', $data['dt_do']);
        $stmt->bindParam(':typ_zastupovani', $data['typ_zastupovani']);
        $stmt->bindParam(':popis', $data['popis']);
        $stmt->bindParam(':vytvoril_user_id', $auth_result['user_id'], PDO::PARAM_INT);
        
        $stmt->execute();
        $substitution_id = $pdo->lastInsertId();
        
        $pdo->commit();
        
        return array(
            'status' => 'ok',
            'message' => 'Zastupování bylo úspěšně vytvořeno',
            'data' => array(
                'id' => (int)$substitution_id,
                'zastupovany_id' => (int)$data['zastupovany_id'],
                'zastupce_id' => (int)$data['zastupce_id'],
                'dt_od' => $data['dt_od'],
                'dt_do' => $data['dt_do'],
                'typ_zastupovani' => $data['typ_zastupovani'],
                'popis' => $data['popis']
            )
        );
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Database error in handle_substitution_create: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při vytváření zastupování');
    }
}

function handle_substitution_update($data, $pdo) {
    global $queries;
    
    // Validace vstupních dat
    if (!isset($data['substitution_id']) || !is_numeric($data['substitution_id'])) {
        return array('status' => 'error', 'message' => 'Chybí nebo neplatné substitution_id');
    }
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    // Kontrola oprávnění
    if (!has_permission($auth_result['user_id'], 'USER_SUBSTITUTE_MANAGE', $pdo)) {
        return array('status' => 'error', 'message' => 'Nemáte oprávnění ke správě zastupování');
    }
    
    try {
        $stmt = $pdo->prepare($queries['substitution_update']);
        $stmt->bindParam(':substitution_id', $data['substitution_id'], PDO::PARAM_INT);
        $stmt->bindParam(':dt_od', $data['dt_od']);
        $stmt->bindParam(':dt_do', $data['dt_do']);
        $stmt->bindParam(':typ_zastupovani', $data['typ_zastupovani']);
        $stmt->bindParam(':popis', $data['popis']);
        
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return array(
                'status' => 'ok',
                'message' => 'Zastupování bylo úspěšně aktualizováno',
                'data' => array(
                    'id' => (int)$data['substitution_id'],
                    'dt_od' => $data['dt_od'],
                    'dt_do' => $data['dt_do'],
                    'typ_zastupovani' => $data['typ_zastupovani'],
                    'popis' => $data['popis']
                )
            );
        } else {
            return array('status' => 'error', 'message' => 'Zastupování nebylo nalezeno nebo již není aktivní');
        }
        
    } catch (PDOException $e) {
        error_log("Database error in handle_substitution_update: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při aktualizaci zastupování');
    }
}

function handle_substitution_deactivate($data, $pdo) {
    global $queries;
    
    // Validace vstupních dat
    if (!isset($data['substitution_id']) || !is_numeric($data['substitution_id'])) {
        return array('status' => 'error', 'message' => 'Chybí nebo neplatné substitution_id');
    }
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    // Kontrola oprávnění
    if (!has_permission($auth_result['user_id'], 'USER_SUBSTITUTE_MANAGE', $pdo)) {
        return array('status' => 'error', 'message' => 'Nemáte oprávnění ke správě zastupování');
    }
    
    try {
        $stmt = $pdo->prepare($queries['substitution_deactivate']);
        $stmt->bindParam(':substitution_id', $data['substitution_id'], PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return array(
                'status' => 'ok',
                'message' => 'Zastupování bylo úspěšně deaktivováno',
                'data' => array(
                    'id' => (int)$data['substitution_id'],
                    'deaktivovano' => date('Y-m-d H:i:s')
                )
            );
        } else {
            return array('status' => 'error', 'message' => 'Zastupování nebylo nalezeno');
        }
        
    } catch (PDOException $e) {
        error_log("Database error in handle_substitution_deactivate: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při deaktivaci zastupování');
    }
}

function handle_substitution_current($data, $pdo) {
    global $queries;
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    try {
        // Zjištění aktuálních zastupování pro přihlášeného uživatele
        $stmt = $pdo->prepare($queries['substitution_check_current']);
        $stmt->bindParam(':zastupce_id', $auth_result['user_id'], PDO::PARAM_INT);
        $stmt->execute();
        
        $current_substitutions = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $current_substitutions[] = array(
                'zastupovany_id' => (int)$row['zastupovany_id'],
                'typ_zastupovani' => $row['typ_zastupovani'],
                'zastupovany_username' => $row['zastupovany_username'],
                'zastupovany_jmeno' => $row['zastupovany_jmeno'],
                'zastupovany_prijmeni' => $row['zastupovany_prijmeni']
            );
        }
        
        return array(
            'status' => 'ok',
            'data' => $current_substitutions,
            'count' => count($current_substitutions)
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_substitution_current: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání aktuálních zastupování');
    }
}

// ============ SCHVALOVACÍ PRAVOMOCI ============

function handle_approval_permissions($data, $pdo) {
    global $queries;
    
    // Kontrola autentifikace
    $auth_result = authenticate_user($data, $pdo);
    if ($auth_result['status'] !== 'ok') {
        return $auth_result;
    }
    
    $user_id = isset($data['user_id']) ? $data['user_id'] : $auth_result['user_id'];
    
    try {
        $stmt = $pdo->prepare($queries['approval_get_user_permissions']);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $permissions = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $permissions[] = array(
                'kod_prava' => $row['kod_prava'],
                'nazev' => $row['nazev']
            );
        }
        
        return array(
            'status' => 'ok',
            'data' => array(
                'user_id' => (int)$user_id,
                'approval_permissions' => $permissions,
                'can_approve' => count($permissions) > 0
            )
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_approval_permissions: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání schvalovacích oprávnění');
    }
}

// ============ ORGANIZAČNÍ HIERARCHIE - NOVÉ ENDPOINTY ============

/**
 * Načte všechny uživatele pro org. hierarchii
 */
function handle_hierarchy_users_list($data, $pdo) {
    // Kontrola autentifikace - stejný pattern jako handle_users_list()
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatný nebo chybějící token');
    }
    
    // Ověření, že username z tokenu odpovídá username z požadavku
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovídá username z požadavku');
    }
    
    try {
        $sql = "
            SELECT 
                u.id,
                u.jmeno,
                u.prijmeni,
                u.email,
                u.pozice_id,
                p.nazev_pozice as pozice,
                l.nazev as lokalita,
                us.usek_nazev as usek,
                us.usek_zkr,
                u.aktivni
            FROM 25_uzivatele u
            LEFT JOIN 25_lokality l ON u.lokalita_id = l.id
            LEFT JOIN 25_useky us ON u.usek_id = us.id
            LEFT JOIN 25_pozice p ON u.pozice_id = p.id
            WHERE u.aktivni = 1
            ORDER BY u.prijmeni, u.jmeno
        ";
        
        $stmt = $pdo->query($sql);
        $users = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // UTF-8 sanitizace pro každé pole
            foreach ($row as $key => $value) {
                if (is_string($value)) {
                    $row[$key] = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
                }
            }
            
            $initials = strtoupper(
                (isset($row['jmeno'][0]) ? $row['jmeno'][0] : '') .
                (isset($row['prijmeni'][0]) ? $row['prijmeni'][0] : '')
            );
            
            $users[] = array(
                'id' => (string)$row['id'],
                'name' => trim($row['jmeno'] . ' ' . $row['prijmeni']),
                'position' => $row['pozice'] ?: 'Neuvedeno',
                'location' => $row['lokalita'] ?: 'Neuvedeno',
                'department' => $row['usek'] ?: 'Neuvedeno',
                'departmentCode' => $row['usek_zkr'] ?: '',
                'initials' => $initials ?: '?',
                'email' => $row['email']
            );
        }
        
        error_log("hierarchy_users_list - Found " . count($users) . " users");
        
        return array(
            'success' => true,
            'data' => $users,
            'count' => count($users)
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_hierarchy_users_list: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba při načítání uživatelů', 'details' => $e->getMessage());
    }
}

/**
 * Načte všechny lokality
 */
function handle_hierarchy_locations_list($data, $pdo) {
    // Kontrola autentifikace - stejný pattern jako handle_users_list()
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatný nebo chybějící token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovídá username z požadavku');
    }
    
    try {
        $sql = "
            SELECT 
                l.id,
                l.nazev,
                l.kod,
                l.typ,
                COUNT(u.id) as userCount
            FROM 25_lokality l
            LEFT JOIN 25_uzivatele u ON u.lokalita_id = l.id AND u.aktivni = 1
            GROUP BY l.id, l.nazev, l.kod, l.typ
            ORDER BY l.nazev
        ";
        
        $stmt = $pdo->query($sql);
        $locations = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // UTF-8 sanitizace
            foreach ($row as $key => $value) {
                if (is_string($value)) {
                    $row[$key] = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
                }
            }
            
            $locations[] = array(
                'id' => (string)$row['id'],
                'name' => $row['nazev'],
                'code' => $row['kod'],
                'type' => $row['typ'],
                'userCount' => (int)$row['userCount']
            );
        }
        
        return array(
            'success' => true,
            'data' => $locations,
            'count' => count($locations)
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_hierarchy_locations_list: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba při načítání lokalit', 'details' => $e->getMessage());
    }
}

/**
 * Načte všechny úseky
 */
function handle_hierarchy_departments_list($data, $pdo) {
    // Kontrola autentifikace - stejný pattern jako handle_users_list()
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatný nebo chybějící token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovídá username z požadavku');
    }
    
    try {
        $sql = "
            SELECT 
                us.id,
                us.usek_zkr,
                us.usek_nazev,
                COUNT(u.id) as userCount
            FROM 25_useky us
            LEFT JOIN 25_uzivatele u ON u.usek_id = us.id AND u.aktivni = 1
            GROUP BY us.id, us.usek_zkr, us.usek_nazev
            ORDER BY us.usek_nazev
        ";
        
        $stmt = $pdo->query($sql);
        $departments = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // UTF-8 sanitizace
            foreach ($row as $key => $value) {
                if (is_string($value)) {
                    $row[$key] = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
                }
            }
            
            $departments[] = array(
                'id' => (string)$row['id'],
                'name' => $row['usek_nazev'],
                'code' => $row['usek_zkr'],
                'userCount' => (int)$row['userCount']
            );
        }
        
        return array(
            'success' => true,
            'data' => $departments,
            'count' => count($departments)
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_hierarchy_departments_list: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba při načítání úseků', 'details' => $e->getMessage());
    }
}

/**
 * Načte kompletní hierarchickou strukturu
 */
function handle_hierarchy_structure($data, $pdo) {
    // Kontrola autentifikace - stejný pattern jako handle_users_list()
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatný nebo chybějící token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovídá username z požadavku');
    }
    
    try {
        // Načtení uživatelů
        $sql_users = "
            SELECT 
                u.id,
                u.jmeno,
                u.prijmeni,
                u.pozice_id,
                p.nazev_pozice as pozice,
                l.nazev as lokalita,
                us.usek_nazev as usek
            FROM 25_uzivatele u
            LEFT JOIN 25_lokality l ON u.lokalita_id = l.id
            LEFT JOIN 25_useky us ON u.usek_id = us.id
            LEFT JOIN 25_pozice p ON u.pozice_id = p.id
            WHERE u.aktivni = 1
        ";
        
        $stmt = $pdo->query($sql_users);
        $nodes = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // UTF-8 sanitizace
            foreach ($row as $key => $value) {
                if (is_string($value)) {
                    $row[$key] = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
                }
            }
            
            $initials = strtoupper(
                (isset($row['jmeno'][0]) ? $row['jmeno'][0] : '') .
                (isset($row['prijmeni'][0]) ? $row['prijmeni'][0] : '')
            );
            
            $nodes[] = array(
                'id' => (string)$row['id'],
                'name' => trim($row['jmeno'] . ' ' . $row['prijmeni']),
                'position' => $row['pozice'] ?: 'Neuvedeno',
                'initials' => $initials ?: '?',
                'metadata' => array(
                    'location' => $row['lokalita'] ?: 'Neuvedeno',
                    'department' => $row['usek'] ?: 'Neuvedeno'
                )
            );
        }
        
        // Načtení vztahů
        $sql_relationships = "
            SELECT 
                h.nadrizeny_id,
                h.podrizeny_id,
                h.typ_vztahu,
                h.uroven_opravneni,
                h.viditelnost_objednavky,
                h.viditelnost_faktury,
                h.viditelnost_smlouvy,
                h.viditelnost_pokladna,
                h.viditelnost_uzivatele,
                h.viditelnost_lp,
                h.notifikace_email,
                h.notifikace_inapp,
                h.notifikace_typy,
                h.rozsirene_lokality,
                h.rozsirene_useky,
                h.dt_od,
                h.dt_do,
                h.aktivni
            FROM 25_uzivatele_hierarchie h
            WHERE h.aktivni = 1
              AND (h.dt_od IS NULL OR h.dt_od <= CURDATE())
              AND (h.dt_do IS NULL OR h.dt_do >= CURDATE())
        ";
        
        $stmt = $pdo->query($sql_relationships);
        $edges = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $edges[] = array(
                'id' => 'e' . $row['nadrizeny_id'] . '-' . $row['podrizeny_id'],
                'source' => (string)$row['nadrizeny_id'],
                'target' => (string)$row['podrizeny_id'],
                'type' => $row['typ_vztahu'] ?: 'prime',
                'permissions' => array(
                    'level' => (int)$row['uroven_opravneni'],
                    'visibility' => array(
                        'objednavky' => (bool)$row['viditelnost_objednavky'],
                        'faktury' => (bool)$row['viditelnost_faktury'],
                        'smlouvy' => (bool)$row['viditelnost_smlouvy'],
                        'pokladna' => (bool)$row['viditelnost_pokladna'],
                        'uzivatele' => (bool)$row['viditelnost_uzivatele'],
                        'lp' => (bool)$row['viditelnost_lp']
                    ),
                    'notifications' => array(
                        'email' => (bool)$row['notifikace_email'],
                        'inapp' => (bool)$row['notifikace_inapp'],
                        'types' => $row['notifikace_typy'] ? json_decode($row['notifikace_typy'], true) : array()
                    ),
                    'extended' => array(
                        'locations' => $row['rozsirene_lokality'] ? json_decode($row['rozsirene_lokality'], true) : array(),
                        'departments' => $row['rozsirene_useky'] ? json_decode($row['rozsirene_useky'], true) : array()
                    )
                ),
                'validity' => array(
                    'from' => $row['dt_od'],
                    'to' => $row['dt_do']
                )
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'nodes' => $nodes,
                'edges' => $edges
            ),
            'counts' => array(
                'users' => count($nodes),
                'relationships' => count($edges)
            )
        );
        
    } catch (PDOException $e) {
        error_log("Database error in handle_hierarchy_structure: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba při načítání hierarchické struktury', 'details' => $e->getMessage());
    }
}

/**
 * Uloží hierarchickou strukturu
 */
function handle_hierarchy_save($data, $pdo) {
    // Kontrola autentifikace - stejný pattern jako handle_users_list()
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatný nebo chybějící token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovídá username z požadavku');
    }
    
    // Kontrola admin oprávnění
    if (!has_permission($token_data['id'], 'HIERARCHY_MANAGE', $pdo)) {
        return array('success' => false, 'error' => 'Nemáte oprávnění ke správě hierarchie');
    }
    
    try {
        $pdo->beginTransaction();
        
        $nodes = isset($data['nodes']) ? $data['nodes'] : array();
        $edges = isset($data['edges']) ? $data['edges'] : array();
        $userId = $token_data['id'];
        
        // Deaktivovat všechny současné vztahy
        $stmt = $pdo->prepare("
            UPDATE 25_uzivatele_hierarchie 
            SET aktivni = 0, 
                upravil_user_id = ?,
                dt_upraveno = NOW()
            WHERE aktivni = 1
        ");
        $stmt->execute(array($userId));
        
        // Vložit nové vztahy
        if (!empty($edges)) {
            $sql = "
                INSERT INTO 25_uzivatele_hierarchie (
                    nadrizeny_id, podrizeny_id, typ_vztahu, uroven_opravneni,
                    viditelnost_objednavky, viditelnost_faktury, viditelnost_smlouvy,
                    viditelnost_pokladna, viditelnost_uzivatele, viditelnost_lp,
                    notifikace_email, notifikace_inapp, notifikace_typy,
                    rozsirene_lokality, rozsirene_useky,
                    dt_od, dt_do, aktivni, upravil_user_id, dt_vytvoreni
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
            ";
            
            $stmt = $pdo->prepare($sql);
            
            foreach ($edges as $edge) {
                $permissions = isset($edge['permissions']) ? $edge['permissions'] : array();
                $visibility = isset($permissions['visibility']) ? $permissions['visibility'] : array();
                $notifications = isset($permissions['notifications']) ? $permissions['notifications'] : array();
                $extended = isset($permissions['extended']) ? $permissions['extended'] : array();
                $validity = isset($edge['validity']) ? $edge['validity'] : array();
                
                $stmt->execute(array(
                    (int)$edge['source'],
                    (int)$edge['target'],
                    isset($edge['type']) ? $edge['type'] : 'prime',
                    isset($permissions['level']) ? (int)$permissions['level'] : 1,
                    isset($visibility['objednavky']) ? (int)$visibility['objednavky'] : 0,
                    isset($visibility['faktury']) ? (int)$visibility['faktury'] : 0,
                    isset($visibility['smlouvy']) ? (int)$visibility['smlouvy'] : 0,
                    isset($visibility['pokladna']) ? (int)$visibility['pokladna'] : 0,
                    isset($visibility['uzivatele']) ? (int)$visibility['uzivatele'] : 0,
                    isset($visibility['lp']) ? (int)$visibility['lp'] : 0,
                    isset($notifications['email']) ? (int)$notifications['email'] : 0,
                    isset($notifications['inapp']) ? (int)$notifications['inapp'] : 0,
                    json_encode(isset($notifications['types']) ? $notifications['types'] : array()),
                    json_encode(isset($extended['locations']) ? $extended['locations'] : array()),
                    json_encode(isset($extended['departments']) ? $extended['departments'] : array()),
                    isset($validity['from']) ? $validity['from'] : null,
                    isset($validity['to']) ? $validity['to'] : null,
                    $userId
                ));
            }
        }
        
        $pdo->commit();
        
        return array(
            'success' => true,
            'message' => 'Hierarchie úspěšně uložena',
            'saved' => array(
                'relationships' => count($edges)
            )
        );
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Database error in handle_hierarchy_save: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba při ukládání hierarchie', 'details' => $e->getMessage());
    }
}

/**
 * Typy notifikací
 */
function handle_hierarchy_notification_types($data, $pdo) {
    // Kontrola autentifikace - stejný pattern jako handle_users_list()
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatný nebo chybějící token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovídá username z požadavku');
    }
    
    $notificationTypes = array(
        array('id' => 'order_created', 'name' => 'Nová objednávka', 'category' => 'orders'),
        array('id' => 'order_approved', 'name' => 'Schválená objednávka', 'category' => 'orders'),
        array('id' => 'order_rejected', 'name' => 'Zamítnutá objednávka', 'category' => 'orders'),
        array('id' => 'invoice_created', 'name' => 'Nová faktura', 'category' => 'invoices'),
        array('id' => 'invoice_approved', 'name' => 'Schválená faktura', 'category' => 'invoices'),
        array('id' => 'invoice_paid', 'name' => 'Zaplacená faktura', 'category' => 'invoices'),
        array('id' => 'contract_expiring', 'name' => 'Vypršení smlouvy', 'category' => 'contracts'),
        array('id' => 'contract_created', 'name' => 'Nová smlouva', 'category' => 'contracts'),
        array('id' => 'budget_warning', 'name' => 'Upozornění na rozpočet', 'category' => 'finance'),
        array('id' => 'approval_required', 'name' => 'Vyžaduje schválení', 'category' => 'general'),
        array('id' => 'mention', 'name' => 'Zmínka v komentáři', 'category' => 'general'),
        array('id' => 'task_assigned', 'name' => 'Přiřazený úkol', 'category' => 'general')
    );
    
    return array(
        'success' => true,
        'data' => $notificationTypes
    );
}

?>