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

?>