<?php

require_once __DIR__ . '/../../api.php';
// v2025.03_25/lib/hierarchyHandlers.php

// ============================================================================================================
// DEPRECATED: Tento soubor obsahuje ZASTARALÉ funkce pro původní hierarchii (TBL_UZIVATELE_HIERARCHIE (25_uzivatele_hierarchie))
// Tabulka 25_uzivatele_hierarchie byla SMAZÁNA 13.12.2025
// 
// NOVÉ API pro hierarchii: používá structure_json v tabulce TBL_HIERARCHIE_PROFILY (25_hierarchie_profily)
// Tyto funkce jsou ponechány pouze pro zpětnou kompatibilitu s legacy endpointy, které už se nepoužívají
// ============================================================================================================

// ============ HIERARCHIE UŽIVATELŮ (DEPRECATED) ============

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
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM " . TBL_UZIVATELE . " WHERE id IN (:nadrizeny_id, :podrizeny_id) AND aktivni = 1");
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
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM " . TBL_UZIVATELE . " WHERE id IN (:zastupovany_id, :zastupce_id) AND aktivni = 1");
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
            FROM " . TBL_UZIVATELE . " u
            LEFT JOIN " . TBL_LOKALITY . " l ON u.lokalita_id = l.id
            LEFT JOIN " . TBL_USEKY . " us ON u.usek_id = us.id
            LEFT JOIN " . TBL_POZICE . " p ON u.pozice_id = p.id
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
            
            // Načíst role uživatele z TBL_UZIVATELE_ROLE (25_uzivatele_role)
            $roleStmt = $pdo->prepare("SELECT role_id FROM " . TBL_UZIVATELE_ROLE . " WHERE uzivatel_id = ?");
            $roleStmt->execute(array($row['id']));
            $userRoles = $roleStmt->fetchAll(PDO::FETCH_COLUMN);
            
            $users[] = array(
                'id' => (string)$row['id'],
                'name' => trim($row['jmeno'] . ' ' . $row['prijmeni']),
                'position' => $row['pozice'] ?: 'Neuvedeno',
                'location' => $row['lokalita'] ?: 'Neuvedeno',
                'department' => $row['usek'] ?: 'Neuvedeno',
                'departmentCode' => $row['usek_zkr'] ?: '',
                'initials' => $initials ?: '?',
                'email' => $row['email'],
                'roles' => array_map('intval', $userRoles) // Pole ID rolí
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
            FROM " . TBL_LOKALITY . " l
            LEFT JOIN " . TBL_UZIVATELE . " u ON u.lokalita_id = l.id AND u.aktivni = 1
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
            FROM " . TBL_USEKY . " us
            LEFT JOIN " . TBL_UZIVATELE . " u ON u.usek_id = us.id AND u.aktivni = 1
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
    
    $profilId = isset($data['profile_id']) ? (int)$data['profile_id'] : null;
    
    // Pokud není zadán profil_id, načti aktivní profil
    if ($profilId === null) {
        $stmt = $pdo->query("SELECT id FROM " . TBL_HIERARCHIE_PROFILY . " WHERE aktivni = 1 LIMIT 1");
        $activeProfile = $stmt->fetch(PDO::FETCH_ASSOC);
        $profilId = $activeProfile ? (int)$activeProfile['id'] : 1;
    }
    
    try {
        // Načtení pouze uživatelů, kteří mají vztahy v daném profilu
        $sql_users = "
            SELECT DISTINCT
                u.id,
                u.jmeno,
                u.prijmeni,
                u.pozice_id,
                p.nazev_pozice as pozice,
                l.nazev as lokalita,
                us.usek_nazev as usek
            FROM " . TBL_UZIVATELE . " u
            LEFT JOIN " . TBL_LOKALITY . " l ON u.lokalita_id = l.id
            LEFT JOIN " . TBL_USEKY . " us ON u.usek_id = us.id
            LEFT JOIN " . TBL_POZICE . " p ON u.pozice_id = p.id
            WHERE u.aktivni = 1
            AND u.id IN (
                SELECT DISTINCT user_id_1 FROM ".TBL_HIERARCHIE_VZTAHY." WHERE profil_id = ? AND aktivni = 1 AND user_id_1 IS NOT NULL
                UNION
                SELECT DISTINCT user_id_2 FROM ".TBL_HIERARCHIE_VZTAHY." WHERE profil_id = ? AND aktivni = 1 AND user_id_2 IS NOT NULL
            )
        ";
        
        $stmt = $pdo->prepare($sql_users);
        $stmt->execute(array($profilId, $profilId));
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
        
        // Načtení vztahů s pozicemi
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
                h.rozsirene_kombinace,
                h.layout_pozice,
                h.dt_od,
                h.dt_do,
                h.aktivni
            FROM " . TBL_UZIVATELE_HIERARCHIE . " h
            WHERE h.aktivni = 1
              AND h.profil_id = ?
              AND (h.dt_od IS NULL OR h.dt_od <= CURDATE())
              AND (h.dt_do IS NULL OR h.dt_do >= CURDATE())
        ";
        
        $stmt = $pdo->prepare($sql_relationships);
        $stmt->execute(array($profilId));
        $edges = array();
        
        $stmt = $pdo->prepare($sql_relationships);
        $stmt->execute(array($profilId));
        $edges = array();
        
        // Sbíráme ID lokalit a útvarů pro pozdější načtení
        $locationIds = array();
        $departmentIds = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Dekódovat rozšířené oprávnění
            $extLocations = $row['rozsirene_lokality'] ? json_decode($row['rozsirene_lokality'], true) : array();
            $extDepartments = $row['rozsirene_useky'] ? json_decode($row['rozsirene_useky'], true) : array();
            
            // Sbírat ID lokalit a útvarů
            if (!empty($extLocations) && is_array($extLocations)) {
                foreach ($extLocations as $locId) {
                    $locationIds[(string)$locId] = true;
                }
            }
            if (!empty($extDepartments) && is_array($extDepartments)) {
                foreach ($extDepartments as $deptId) {
                    $departmentIds[(string)$deptId] = true;
                }
            }
            
            // Upravit source/target podle rozšířených oprávnění
            $source = (string)$row['nadrizeny_id'];
            $target = (string)$row['podrizeny_id'];
            
            // Pokud nadrizeny_id je NULL a máme lokality, jedná se o location → user
            if (empty($row['nadrizeny_id']) && !empty($extLocations) && is_array($extLocations)) {
                $source = 'location-' . $extLocations[0];
            }
            // Pokud nadrizeny_id je NULL a máme útvary, jedná se o department → user
            else if (empty($row['nadrizeny_id']) && !empty($extDepartments) && is_array($extDepartments)) {
                $source = 'department-' . $extDepartments[0];
            }
            
            // Pokud podrizeny_id je NULL a máme lokality, jedná se o user → location
            if (empty($row['podrizeny_id']) && !empty($extLocations) && is_array($extLocations)) {
                $target = 'location-' . $extLocations[0];
            }
            // Pokud podrizeny_id je NULL a máme útvary, jedná se o user → department
            else if (empty($row['podrizeny_id']) && !empty($extDepartments) && is_array($extDepartments)) {
                $target = 'department-' . $extDepartments[0];
            }
            
            $edges[] = array(
                'source' => $source,
                'target' => $target,
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
                        'locations' => $extLocations,
                        'departments' => $extDepartments,
                        'combinations' => $row['rozsirene_kombinace'] ? json_decode($row['rozsirene_kombinace'], true) : array()
                    )
                ),
                'validity' => array(
                    'from' => $row['dt_od'],
                    'to' => $row['dt_do']
                )
            );
        }
        
        // Načíst lokality z DB a vytvořit location nodes
        if (!empty($locationIds)) {
            $locationIdsArray = array_keys($locationIds);
            $placeholders = implode(',', array_fill(0, count($locationIdsArray), '?'));
            $sqlLocations = "SELECT id, nazev FROM " . TBL_LOKALITY . " WHERE id IN ($placeholders) AND aktivni = 1";
            $stmtLoc = $pdo->prepare($sqlLocations);
            $stmtLoc->execute($locationIdsArray);
            
            while ($locRow = $stmtLoc->fetch(PDO::FETCH_ASSOC)) {
                $nodes[] = array(
                    'id' => 'location-' . $locRow['id'],
                    'name' => mb_convert_encoding($locRow['nazev'], 'UTF-8', 'UTF-8'),
                    'type' => 'location',
                    'metadata' => array(
                        'locationId' => (int)$locRow['id']
                    )
                );
            }
        }
        
        // Načíst útvary z DB a vytvořit department nodes
        if (!empty($departmentIds)) {
            $departmentIdsArray = array_keys($departmentIds);
            $placeholders = implode(',', array_fill(0, count($departmentIdsArray), '?'));
            $sqlDepartments = "SELECT id, usek_nazev FROM " . TBL_USEKY . " WHERE id IN ($placeholders) AND aktivni = 1";
            $stmtDept = $pdo->prepare($sqlDepartments);
            $stmtDept->execute($departmentIdsArray);
            
            while ($deptRow = $stmtDept->fetch(PDO::FETCH_ASSOC)) {
                $nodes[] = array(
                    'id' => 'department-' . $deptRow['id'],
                    'name' => mb_convert_encoding($deptRow['usek_nazev'], 'UTF-8', 'UTF-8'),
                    'type' => 'department',
                    'metadata' => array(
                        'departmentId' => (int)$deptRow['id']
                    )
                );
            }
        }
        
        // Načíst pozice z DB a přidat je do nodes
        $posStmt = $pdo->prepare("SELECT nadrizeny_id, podrizeny_id, layout_pozice, rozsirene_lokality, rozsirene_useky FROM " . TBL_UZIVATELE_HIERARCHIE . " WHERE profil_id = ? AND aktivni = 1 AND layout_pozice IS NOT NULL");
        $posStmt->execute(array($profilId));
        $nodePositions = array();
        while ($posRow = $posStmt->fetch(PDO::FETCH_ASSOC)) {
            if ($posRow['layout_pozice']) {
                $layoutData = json_decode($posRow['layout_pozice'], true);
                $extLoc = $posRow['rozsirene_lokality'] ? json_decode($posRow['rozsirene_lokality'], true) : array();
                $extDept = $posRow['rozsirene_useky'] ? json_decode($posRow['rozsirene_useky'], true) : array();
                
                if (isset($layoutData['source'])) {
                    // Zjistit správné ID podle extended permissions
                    $sourceId = (string)$posRow['nadrizeny_id'];
                    if (empty($posRow['nadrizeny_id']) && !empty($extLoc) && is_array($extLoc)) {
                        $sourceId = 'location-' . $extLoc[0];
                    } else if (empty($posRow['nadrizeny_id']) && !empty($extDept) && is_array($extDept)) {
                        $sourceId = 'department-' . $extDept[0];
                    }
                    $nodePositions[$sourceId] = $layoutData['source'];
                }
                
                if (isset($layoutData['target'])) {
                    // Zjistit správné ID podle extended permissions
                    $targetId = (string)$posRow['podrizeny_id'];
                    if (empty($posRow['podrizeny_id']) && !empty($extLoc) && is_array($extLoc)) {
                        $targetId = 'location-' . $extLoc[0];
                    } else if (empty($posRow['podrizeny_id']) && !empty($extDept) && is_array($extDept)) {
                        $targetId = 'department-' . $extDept[0];
                    }
                    $nodePositions[$targetId] = $layoutData['target'];
                }
            }
        }
        
        // Přidat layoutPosition do nodes
        for ($i = 0; $i < count($nodes); $i++) {
            if (isset($nodePositions[$nodes[$i]['id']])) {
                $nodes[$i]['layoutPosition'] = $nodePositions[$nodes[$i]['id']];
            }
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
        error_log("HIERARCHY STRUCTURE ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri nacitani hierarchie', 'details' => $e->getMessage());
    }
}

function handle_hierarchy_save($data, $pdo) {
    // Kontrola autentifikace - standardni pattern
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny nebo chybejici token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovida username z pozadavku');
    }
    
    try {
        $pdo->beginTransaction();
        
        $nodes = isset($data['nodes']) ? $data['nodes'] : array();
        $edges = isset($data['edges']) ? $data['edges'] : array();
        $userId = $token_data['id'];
        $profilId = isset($data['profile_id']) ? (int)$data['profile_id'] : 1;
        
        // Smazat všechny vztahy v daném profilu (DELETE strategie)
        $stmt = $pdo->prepare("
            DELETE FROM " . TBL_UZIVATELE_HIERARCHIE . " 
            WHERE profil_id = ?
        ");
        $stmt->execute(array($profilId));
        
        // Vytvořit mapu pozic pro každý uzel (userId -> position)
        // Frontend posílá node['id'] = userId, takže použijeme to přímo
        $nodePositions = array();
        if (isset($nodes) && !empty($nodes)) {
            foreach ($nodes as $node) {
                if (isset($node['id']) && isset($node['position'])) {
                    $nodePositions[(string)$node['id']] = $node['position'];
                }
            }
        }
        
        // Vložit nové vztahy
        if (!empty($edges)) {
            $sql = "
                INSERT INTO " . TBL_UZIVATELE_HIERARCHIE . " (
                    nadrizeny_id, podrizeny_id, profil_id, typ_vztahu, uroven_opravneni,
                    viditelnost_objednavky, viditelnost_faktury, viditelnost_smlouvy,
                    viditelnost_pokladna, viditelnost_uzivatele, viditelnost_lp,
                    notifikace_email, notifikace_inapp, notifikace_typy,
                    rozsirene_lokality, rozsirene_useky, rozsirene_kombinace,
                    layout_pozice, aktivni, upravil_user_id, dt_vytvoreni
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
            ";
            
            $stmt = $pdo->prepare($sql);
            
            foreach ($edges as $edge) {
                $permissions = isset($edge['permissions']) ? $edge['permissions'] : array();
                $visibility = isset($permissions['visibility']) ? $permissions['visibility'] : array();
                $notifications = isset($permissions['notifications']) ? $permissions['notifications'] : array();
                $extended = isset($permissions['extended']) ? $permissions['extended'] : array();
                $validity = isset($edge['validity']) ? $edge['validity'] : array();
                
                // Zpracování source a target - mohou být NULL pro rozšířené vztahy
                $sourceId = isset($edge['source']) && $edge['source'] !== null ? (int)$edge['source'] : null;
                $targetId = isset($edge['target']) && $edge['target'] !== null ? (int)$edge['target'] : null;
                
                // Zkombinovat pozice source a target uzlů pro tento vztah
                $sourcePos = null;
                $targetPos = null;
                if ($sourceId !== null) {
                    $sourceKey = (string)$sourceId;
                    $sourcePos = isset($nodePositions[$sourceKey]) ? $nodePositions[$sourceKey] : null;
                }
                if ($targetId !== null) {
                    $targetKey = (string)$targetId;
                    $targetPos = isset($nodePositions[$targetKey]) ? $nodePositions[$targetKey] : null;
                }
                
                $layoutPoziceData = array(
                    'source' => $sourcePos,
                    'target' => $targetPos
                );
                
                $stmt->execute(array(
                    $sourceId,
                    $targetId,
                    $profilId,
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
                    json_encode(isset($extended['combinations']) ? $extended['combinations'] : array()),
                    json_encode($layoutPoziceData),
                    $userId
                ));
            }
        }
        
        $pdo->commit();
        
        return array(
            'success' => true,
            'message' => 'Hierarchie uspesne ulozena',
            'saved' => array(
                'relationships' => count($edges)
            )
        );
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("HIERARCHY SAVE ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri ukladani hierarchie', 'details' => $e->getMessage());
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("HIERARCHY SAVE ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri ukladani hierarchie', 'details' => $e->getMessage());
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
        array('id' => 'order_created', 'name' => 'Nova objednavka', 'category' => 'orders'),
        array('id' => 'order_approved', 'name' => 'Schvalena objednavka', 'category' => 'orders'),
        array('id' => 'order_rejected', 'name' => 'Zamitnuta objednavka', 'category' => 'orders'),
        array('id' => 'invoice_created', 'name' => 'Nova faktura', 'category' => 'invoices'),
        array('id' => 'invoice_approved', 'name' => 'Schvalena faktura', 'category' => 'invoices'),
        array('id' => 'invoice_paid', 'name' => 'Zaplacena faktura', 'category' => 'invoices'),
        array('id' => 'contract_expiring', 'name' => 'Vyprseni smlouvy', 'category' => 'contracts'),
        array('id' => 'contract_created', 'name' => 'Nova smlouva', 'category' => 'contracts'),
        array('id' => 'budget_warning', 'name' => 'Upozorneni na rozpocet', 'category' => 'finance'),
        array('id' => 'approval_required', 'name' => 'Vyzaduje schvaleni', 'category' => 'general'),
        array('id' => 'mention', 'name' => 'Zminka v komentari', 'category' => 'general'),
        array('id' => 'task_assigned', 'name' => 'Prirazeny ukol', 'category' => 'general')
    );
    
    return array(
        'success' => true,
        'data' => $notificationTypes
    );
}

/**
 * Seznam profilů organizačních řádů
 */
function handle_hierarchy_profiles_list($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny nebo chybejici token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovida username z pozadavku');
    }
    
    try {
        $stmt = $pdo->query("
            SELECT 
                p.id,
                p.nazev,
                p.popis,
                p.aktivni,
                p.dt_vytvoreno,
                p.dt_upraveno,
                p.structure_json,
                u.jmeno,
                u.prijmeni
            FROM " . TBL_HIERARCHIE_PROFILY . " p
            LEFT JOIN " . TBL_UZIVATELE . " u ON p.vytvoril_user_id = u.id
            ORDER BY p.aktivni DESC, p.nazev ASC
        ");
        
        $profiles = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Spočítat vztahy z structure_json (edges)
            $relationshipsCount = 0;
            if (!empty($row['structure_json'])) {
                $structure = json_decode($row['structure_json'], true);
                if ($structure && isset($structure['edges'])) {
                    $relationshipsCount = count($structure['edges']);
                }
            }
            
            $profiles[] = array(
                'id' => (int)$row['id'],
                'name' => $row['nazev'],
                'description' => $row['popis'],
                'isActive' => (bool)$row['aktivni'],
                'createdAt' => $row['dt_vytvoreno'],
                'updatedAt' => $row['dt_upraveno'],
                'createdBy' => $row['jmeno'] ? trim($row['jmeno'] . ' ' . $row['prijmeni']) : null,
                'relationshipsCount' => $relationshipsCount
            );
        }
        
        return array('success' => true, 'data' => $profiles);
        
    } catch (PDOException $e) {
        error_log("PROFILES LIST ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri nacitani profilu');
    }
}

/**
 * Vytvoření nového profilu (Save As)
 */
function handle_hierarchy_profiles_create($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny nebo chybejici token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovida username z pozadavku');
    }
    
    $nazev = isset($data['name']) ? trim($data['name']) : '';
    $popis = isset($data['description']) ? trim($data['description']) : '';
    $setActive = isset($data['set_active']) ? (bool)$data['set_active'] : false;
    
    if (empty($nazev)) {
        return array('success' => false, 'error' => 'Nazev profilu je povinny');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Zkontrolovat zda profil s tímto názvem již existuje
        $stmt = $pdo->prepare("SELECT id FROM " . TBL_HIERARCHIE_PROFILY . " WHERE nazev = ?");
        $stmt->execute(array($nazev));
        if ($stmt->fetch()) {
            return array('success' => false, 'error' => 'Profil s timto nazvem jiz existuje', 'code' => 'PROFILE_EXISTS');
        }
        
        // Deaktivovat všechny profily pokud nastavujeme tento jako aktivní
        if ($setActive) {
            $pdo->exec("UPDATE " . TBL_HIERARCHIE_PROFILY . " SET aktivni = 0");
        }
        
        // Vytvořit nový profil
        $stmt = $pdo->prepare("
            INSERT INTO " . TBL_HIERARCHIE_PROFILY . " (nazev, popis, aktivni, vytvoril_user_id)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute(array($nazev, $popis, $setActive ? 1 : 0, $token_data['id']));
        
        $newProfilId = $pdo->lastInsertId();
        
        $pdo->commit();
        
        return array(
            'success' => true,
            'message' => 'Profil uspesne vytvoren',
            'profile_id' => (int)$newProfilId
        );
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("PROFILE CREATE ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri vytvareni profilu');
    }
}

/**
 * Smazání profilu
 */
function handle_hierarchy_profiles_delete($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny nebo chybejici token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovida username z pozadavku');
    }
    
    $profilId = isset($data['profile_id']) ? (int)$data['profile_id'] : 0;
    
    if ($profilId <= 0) {
        return array('success' => false, 'error' => 'Neplatne profile_id');
    }
    
    try {
        // Zkontrolovat, zda není poslední profil
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM " . TBL_HIERARCHIE_PROFILY . "");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row['cnt'] <= 1) {
            return array('success' => false, 'error' => 'Nelze smazat posledni profil');
        }
        
        // Smazat profil (structure_json je součástí profilu, smaže se automaticky)
        $stmt = $pdo->prepare("DELETE FROM " . TBL_HIERARCHIE_PROFILY . " WHERE id = ?");
        $stmt->execute(array($profilId));
        
        return array('success' => true, 'message' => 'Profil uspesne smazan');
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("DELETE PROFILE ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri mazani profilu');
    }
}

/**
 * Nastavení aktivního profilu
 */
function handle_hierarchy_profiles_set_active($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny nebo chybejici token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovida username z pozadavku');
    }
    
    $profilId = isset($data['profile_id']) ? (int)$data['profile_id'] : 0;
    
    if ($profilId <= 0) {
        return array('success' => false, 'error' => 'Neplatne profile_id');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Deaktivovat všechny
        $pdo->exec("UPDATE " . TBL_HIERARCHIE_PROFILY . " SET aktivni = 0");
        
        // Aktivovat vybraný
        $stmt = $pdo->prepare("UPDATE " . TBL_HIERARCHIE_PROFILY . " SET aktivni = 1 WHERE id = ?");
        $stmt->execute(array($profilId));
        
        $pdo->commit();
        
        return array('success' => true, 'message' => 'Aktivni profil nastaven');
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("SET ACTIVE PROFILE ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri nastaveni aktivniho profilu');
    }
}

/**
 * Toggle aktivního stavu profilu (enable/disable)
 */
function handle_hierarchy_profiles_toggle_active($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny nebo chybejici token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovida username z pozadavku');
    }
    
    $profilId = isset($data['profile_id']) ? (int)$data['profile_id'] : 0;
    $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 0;
    
    if ($profilId <= 0) {
        return array('success' => false, 'error' => 'Neplatne profile_id');
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE " . TBL_HIERARCHIE_PROFILY . " SET aktivni = ? WHERE id = ?");
        $stmt->execute(array($isActive, $profilId));
        
        $statusText = $isActive ? 'aktivovan' : 'deaktivovan';
        return array('success' => true, 'message' => "Profil byl $statusText");
        
    } catch (PDOException $e) {
        error_log("TOGGLE PROFILE ACTIVE ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri zmene stavu profilu');
    }
}

/**
 * Uložení structure_json do profilu
 * 
 * @param array $data Request data s nodes a edges
 * @param PDO $pdo Database connection
 * @return array Response
 */
function handle_hierarchy_profiles_save_structure($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny nebo chybejici token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovida username z pozadavku');
    }
    
    $profileId = isset($data['profile_id']) ? (int)$data['profile_id'] : 0;
    $nodes = isset($data['nodes']) ? $data['nodes'] : [];
    $edges = isset($data['edges']) ? $data['edges'] : [];
    
    if ($profileId <= 0) {
        return array('success' => false, 'error' => 'Neplatne profile_id');
    }
    
    // Sestavit structure JSON
    $structure = array(
        'nodes' => $nodes,
        'edges' => $edges
    );
    
    $structureJson = json_encode($structure, JSON_UNESCAPED_UNICODE);
    
    try {
        $stmt = $pdo->prepare("
            UPDATE " . TBL_HIERARCHIE_PROFILY . " 
            SET structure_json = :structure, dt_upraveno = NOW() 
            WHERE id = :profileId
        ");
        $stmt->execute([
            'structure' => $structureJson,
            'profileId' => $profileId
        ]);
        
        return array(
            'success' => true,
            'message' => 'Struktura hierarchie byla ulozena',
            'nodes_count' => count($nodes),
            'edges_count' => count($edges)
        );
        
    } catch (PDOException $e) {
        error_log("SAVE STRUCTURE ERROR: " . $e->getMessage());
        return array('success' => false, 'error' => 'Chyba pri ukladani struktury');
    }
}

/**
 * Načtení structure_json z profilu
 * 
 * @param array $data Request data
 * @param PDO $pdo Database connection
 * @return array Response
 */
function handle_hierarchy_profiles_load_structure($data, $pdo) {
    $token = isset($data['token']) ? $data['token'] : '';
    $request_username = isset($data['username']) ? $data['username'] : '';
    
    $token_data = verify_token($token, $pdo);
    if (!$token_data) {
        return array('success' => false, 'error' => 'Neplatny nebo chybejici token');
    }
    
    if ($token_data['username'] !== $request_username) {
        return array('success' => false, 'error' => 'Username z tokenu neodpovida username z pozadavku');
    }
    
    $profileId = isset($data['profile_id']) ? (int)$data['profile_id'] : 0;
    
    if ($profileId <= 0) {
        // Načíst aktivní profil
        $stmt = $pdo->prepare("SELECT id, structure_json FROM " . TBL_HIERARCHIE_PROFILY . " WHERE aktivni = 1 LIMIT 1");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("SELECT id, structure_json FROM " . TBL_HIERARCHIE_PROFILY . " WHERE id = :profileId");
        $stmt->execute(['profileId' => $profileId]);
    }
    
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        return array('success' => false, 'error' => 'Profil nenalezen');
    }
    
    if (empty($profile['structure_json'])) {
        return array(
            'success' => true,
            'data' => array(
                'profile_id' => (int)$profile['id'],
                'nodes' => [],
                'edges' => []
            )
        );
    }
    
    $structure = json_decode($profile['structure_json'], true);
    
    if (!$structure) {
        return array('success' => false, 'error' => 'Chybny JSON format struktury');
    }
    
    return array(
        'success' => true,
        'data' => array(
            'profile_id' => (int)$profile['id'],
            'nodes' => isset($structure['nodes']) ? $structure['nodes'] : [],
            'edges' => isset($structure['edges']) ? $structure['edges'] : []
        )
    );
}

?>