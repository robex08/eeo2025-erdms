<?php

require_once 'dbconfig.php';

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

/**
 * Validuje a normalizuje user input data
 * @param array $input - Input data
 * @param bool $is_update - Zda je to update (některá pole nejsou povinná)
 * @return array - Array s 'valid' => bool, 'data' => normalized_data, 'errors' => array
 * 
 * DŮLEŽITÉ:
 * - Při CREATE: nový username je v poli 'new_username' (ne 'username')
 * - Pole 'username' obsahuje username přihlášeného uživatele z tokenu
 * - Při UPDATE: username se NEMĚNÍ a NESMÍ se validovat
 */
function validateUserInput($input, $is_update = false) {
    $errors = array();
    $data = array();
    
    // Username - pouze při CREATE (INSERT)
    if (!$is_update) {
        // CREATE operace - používáme new_username
        // Pozor: 'username' obsahuje přihlášeného uživatele, 'new_username' je nový uživatel!
        $username = isset($input['new_username']) ? trim($input['new_username']) : '';
        if (empty($username)) {
            $errors[] = 'Username (new_username) je povinný při vytváření uživatele';
        } elseif (strlen($username) < 3) {
            $errors[] = 'Username musí mít alespoň 3 znaky';
        } elseif (!preg_match('/^[a-zA-Z0-9._-]+$/', $username)) {
            $errors[] = 'Username může obsahovat pouze písmena, číslice, tečky, pomlčky a podtržítka';
        } else {
            $data['username'] = $username;
        }
    }
    // Při UPDATE se username IGNORUJE - nemění se a není potřeba validace!
    
    // Jméno (povinné)
    if (!$is_update || isset($input['jmeno'])) {
        $jmeno = isset($input['jmeno']) ? trim($input['jmeno']) : '';
        if (empty($jmeno) && !$is_update) {
            $errors[] = 'Jméno je povinné';
        } elseif (!empty($jmeno)) {
            $data['jmeno'] = $jmeno;
        }
    }
    
    // Příjmení (povinné)
    if (!$is_update || isset($input['prijmeni'])) {
        $prijmeni = isset($input['prijmeni']) ? trim($input['prijmeni']) : '';
        if (empty($prijmeni) && !$is_update) {
            $errors[] = 'Příjmení je povinné';
        } elseif (!empty($prijmeni)) {
            $data['prijmeni'] = $prijmeni;
        }
    }
    
    // Email (volitelný, ale pokud je zadán, musí být validní)
    // ZABEZPEČENÍ: Použij nullableString() pro konzistentní zpracování NULL hodnot
    if (isset($input['email'])) {
        // Importovat funkci z stringHelpers.php pokud ještě není
        if (!function_exists('nullableString')) {
            require_once __DIR__ . '/stringHelpers.php';
        }
        $email = nullableString($input['email']);
        if ($email !== null) {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Neplatný formát emailu';
            } else {
                $data['email'] = $email;
            }
        } else {
            $data['email'] = null;
        }
    }
    
    // Telefon (volitelný, může být NULL nebo prázdný string)
    // ZABEZPEČENÍ: Použij nullableString() pro konzistentní zpracování
    // DŮLEŽITÉ: VŽDY nastav do $data, i když je NULL (aby se vymazal z DB)
    if (isset($input['telefon'])) {
        if (!function_exists('nullableString')) {
            require_once __DIR__ . '/stringHelpers.php';
        }
        $data['telefon'] = nullableString($input['telefon']);
    }
    
    // Tituly - ŽÁDNÁ VALIDACE, může být NULL nebo jakákoliv hodnota
    // ZABEZPEČENÍ: Použij nullableString() pro konzistentní zpracování
    // DŮLEŽITÉ: VŽDY nastav do $data, i když je NULL (aby se vymazal z DB při UPDATE!)
    if (isset($input['titul_pred'])) {
        if (!function_exists('nullableString')) {
            require_once __DIR__ . '/stringHelpers.php';
        }
        // OPRAVA: Nastav i když je výsledek NULL - pro vymazání z DB
        $data['titul_pred'] = nullableString($input['titul_pred']);
    }
    
    if (isset($input['titul_za'])) {
        if (!function_exists('nullableString')) {
            require_once __DIR__ . '/stringHelpers.php';
        }
        // OPRAVA: Nastav i když je výsledek NULL - pro vymazání z DB
        $data['titul_za'] = nullableString($input['titul_za']);
    }
    
    // Foreign key IDs (volitelné, ale musí být validní čísla)
    $fk_fields = array('usek_id', 'lokalita_id', 'pozice_id', 'organizace_id');
    foreach ($fk_fields as $field) {
        if (isset($input[$field])) {
            $value = $input[$field];
            if ($value === '' || $value === null) {
                $data[$field] = null;
            } elseif (is_numeric($value) && (int)$value > 0) {
                $data[$field] = (int)$value;
            } else {
                $errors[] = "Neplatná hodnota pro $field";
            }
        }
    }
    
    // Aktivní (default 1)
    if (isset($input['aktivni'])) {
        $data['aktivni'] = (int)$input['aktivni'];
    } elseif (!$is_update) {
        $data['aktivni'] = 1;
    }
    
    // Password (pouze při vytváření nebo změně hesla)
    if (isset($input['password']) && !empty($input['password'])) {
        $password = trim($input['password']);
        if (strlen($password) < 6) {
            $errors[] = 'Heslo musí mít alespoň 6 znaků';
        } else {
            // Hash password
            if (function_exists('password_hash')) {
                $data['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
            } else {
                // Fallback pro starší PHP
                $data['password_hash'] = md5($password);
            }
        }
    }
    
    return array(
        'valid' => empty($errors),
        'data' => $data,
        'errors' => $errors
    );
}

/**
 * Validuje vazby na další tabulky
 * @param PDO $db - Databázové spojení
 * @param array $queries - Dotazy
 * @param array $data - Data k validaci
 * @return array - Array s chybami
 */
function validateUserRelations($db, $queries, $data) {
    $errors = array();
    
    $relations = array(
        'usek_id' => 'validate_usek_exists',
        'lokalita_id' => 'validate_lokalita_exists', 
        'pozice_id' => 'validate_pozice_exists',
        'organizace_id' => 'validate_organizace_exists'
    );
    
    foreach ($relations as $field => $query_key) {
        if (isset($data[$field]) && $data[$field] !== null) {
            try {
                $stmt = $db->prepare($queries[$query_key]);
                $stmt->bindParam(':id', $data[$field], PDO::PARAM_INT);
                $stmt->execute();
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$result || (int)$result['count'] === 0) {
                    $errors[] = "Neplatná hodnota pro $field - záznam neexistuje";
                }
            } catch (Exception $e) {
                $errors[] = "Chyba při validaci $field: " . $e->getMessage();
            }
        }
    }
    
    return $errors;
}

/**
 * Zkontroluje duplicity username
 * @param PDO $db - Databázové spojení  
 * @param array $queries - Dotazy
 * @param array $data - Data k validaci (username se kontroluje POUZE pokud je v $data)
 * @param int $exclude_id - ID k vyloučení (při update)
 * @return array - Array s chybami
 * 
 * POZNÁMKA:
 * - Username se kontroluje pouze při CREATE (když je v $data['username'])
 * - Při UPDATE není username v $data, takže se nekontroluje
 * - Email a telefon se NEKONTROLUJÍ - uživatel může být v systému 2x pod různými username se stejnými údaji
 */
function validateUserUniqueness($db, $queries, $data, $exclude_id = 0) {
    $errors = array();
    
    // Kontrola username (pouze pokud je v $data - tj. pouze při CREATE)
    if (isset($data['username'])) {
        try {
            $stmt = $db->prepare($queries['uzivatele_check_username']);
            $stmt->bindParam(':username', $data['username'], PDO::PARAM_STR);
            $stmt->bindParam(':exclude_id', $exclude_id, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result && (int)$result['count'] > 0) {
                $errors[] = 'Username již existuje';
            }
        } catch (Exception $e) {
            $errors[] = 'Chyba při kontrole username: ' . $e->getMessage();
        }
    }
    
    // Email a telefon se NEKONTROLUJÍ na duplicitu
    // Uživatel může být v systému pod 2 username se stejnými kontaktními údaji
    
    return $errors;
}

/**
 * Spravuje role uživatele
 * @param PDO $db - Databázové spojení
 * @param array $queries - Dotazy
 * @param int $user_id - ID uživatele
 * @param array $role_ids - Array ID rolí
 * @return bool - Úspěch
 */
function manageUserRoles($db, $queries, $user_id, $role_ids) {
    try {
        // Smaž všechny stávající role pro tohoto uživatele
        $stmt = $db->prepare($queries['uzivatele_roles_delete_all']);
        $stmt->bindParam(':uzivatel_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        error_log("Deleted old roles for user_id: $user_id, affected rows: " . $stmt->rowCount());
        
        // Přidej nové role
        if (!empty($role_ids) && is_array($role_ids)) {
            foreach ($role_ids as $role_id) {
                if (is_numeric($role_id) && (int)$role_id > 0) {
                    $stmt = $db->prepare($queries['uzivatele_roles_insert']);
                    $stmt->bindParam(':uzivatel_id', $user_id, PDO::PARAM_INT);
                    $role_id_int = (int)$role_id;
                    $stmt->bindParam(':role_id', $role_id_int, PDO::PARAM_INT);
                    $stmt->execute();
                    error_log("Inserted role_id: $role_id_int for user_id: $user_id");
                }
            }
        }
        
        return true;
    } catch (Exception $e) {
        error_log("ERROR in manageUserRoles: " . $e->getMessage());
        return false;
    }
}

/**
 * Spravuje přímá práva uživatele
 * @param PDO $db - Databázové spojení
 * @param array $queries - Dotazy
 * @param int $user_id - ID uživatele
 * @param array $pravo_ids - Array ID práv
 * @return bool - Úspěch
 */
function manageUserDirectRights($db, $queries, $user_id, $pravo_ids) {
    try {
        // Smaž všechna stávající přímá práva
        $stmt = $db->prepare($queries['uzivatele_direct_rights_delete_all']);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        error_log("Deleted old direct rights for user_id: $user_id, affected rows: " . $stmt->rowCount());
        
        // Přidej nová práva
        if (!empty($pravo_ids) && is_array($pravo_ids)) {
            foreach ($pravo_ids as $pravo_id) {
                if (is_numeric($pravo_id) && (int)$pravo_id > 0) {
                    $stmt = $db->prepare($queries['uzivatele_direct_rights_insert']);
                    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                    $pravo_id_int = (int)$pravo_id;
                    $stmt->bindParam(':pravo_id', $pravo_id_int, PDO::PARAM_INT);
                    $stmt->execute();
                    error_log("Inserted direct right pravo_id: $pravo_id_int for user_id: $user_id (role_id=-1)");
                }
            }
        }
        
        return true;
    } catch (Exception $e) {
        error_log("ERROR in manageUserDirectRights: " . $e->getMessage());
        return false;
    }
}

// ========== USER MANAGEMENT HANDLERS ==========

/**
 * Vytvoření nového uživatele
 * 
 * DŮLEŽITÉ PRO FRONTEND:
 * - 'username' v requestu = username přihlášeného uživatele (z tokenu)
 * - 'new_username' = nový username pro vytvářeného uživatele
 * - 'token' = autentizační token
 * 
 * Endpoint validuje, že 'new_username' je unikátní.
 * Pokud již existuje, vrátí HTTP 409 s chybou 'Username již existuje'.
 */
function handle_users_create($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token', 'code' => 'UNAUTHORIZED'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Username z tokenu neodpovídá username z požadavku', 'code' => 'UNAUTHORIZED'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Validace input dat
        $validation = validateUserInput($input, false);
        if (!$validation['valid']) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => implode(', ', $validation['errors']), 'code' => 'VALIDATION_ERROR'));
            return;
        }
        
        $data = $validation['data'];
        
        // Kontrola povinného hesla při vytváření
        if (!isset($data['password_hash'])) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Heslo je povinné při vytváření uživatele', 'code' => 'MISSING_PASSWORD'));
            return;
        }
        
        // Validace vazeb
        $relation_errors = validateUserRelations($db, $queries, $data);
        if (!empty($relation_errors)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => implode(', ', $relation_errors), 'code' => 'RELATION_ERROR'));
            return;
        }
        
        // Kontrola duplicit
        $uniqueness_errors = validateUserUniqueness($db, $queries, $data, 0);
        if (!empty($uniqueness_errors)) {
            http_response_code(409);
            echo json_encode(array('status' => 'error', 'message' => implode(', ', $uniqueness_errors), 'code' => 'DUPLICATE_ERROR'));
            return;
        }
        
        $db->beginTransaction();
        
        // Vložení uživatele
        $stmt = $db->prepare($queries['uzivatele_insert']);
        $stmt->bindParam(':username', $data['username'], PDO::PARAM_STR);
        $stmt->bindParam(':password_hash', $data['password_hash'], PDO::PARAM_STR);
        $stmt->bindParam(':jmeno', $data['jmeno'], PDO::PARAM_STR);
        $stmt->bindParam(':prijmeni', $data['prijmeni'], PDO::PARAM_STR);
        $stmt->bindParam(':titul_pred', $data['titul_pred'], PDO::PARAM_STR);
        $stmt->bindParam(':titul_za', $data['titul_za'], PDO::PARAM_STR);
        $stmt->bindParam(':email', $data['email'], PDO::PARAM_STR);
        $stmt->bindParam(':telefon', $data['telefon'], PDO::PARAM_STR);
        $stmt->bindParam(':usek_id', $data['usek_id'], PDO::PARAM_INT);
        $stmt->bindParam(':lokalita_id', $data['lokalita_id'], PDO::PARAM_INT);
        $stmt->bindParam(':pozice_id', $data['pozice_id'], PDO::PARAM_INT);
        $stmt->bindParam(':organizace_id', $data['organizace_id'], PDO::PARAM_INT);
        $stmt->bindParam(':aktivni', $data['aktivni'], PDO::PARAM_INT);
        $stmt->execute();
        
        $user_id = $db->lastInsertId();
        
        // Správa rolí
        if (isset($input['roles']) && is_array($input['roles'])) {
            manageUserRoles($db, $queries, $user_id, $input['roles']);
        }
        
        // Správa přímých práv
        if (isset($input['direct_rights']) && is_array($input['direct_rights'])) {
            manageUserDirectRights($db, $queries, $user_id, $input['direct_rights']);
        }
        
        $db->commit();
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'id' => (int)$user_id,
                'username' => $data['username'],
                'message' => 'Uživatel byl úspěšně vytvořen'
            )
        ));
        
    } catch (Exception $e) {
        if (isset($db)) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření uživatele: ' . $e->getMessage(), 'code' => 'SERVER_ERROR'));
    }
}

/**
 * Aktualizace existujícího uživatele
 * 
 * DŮLEŽITÉ PRO FRONTEND:
 * - Username se při UPDATE NEMĚNÍ - je to identifikátor
 * - 'username' v requestu = username přihlášeného uživatele (z tokenu)
 * - 'id' = ID editovaného uživatele
 * - Pole 'new_username' se IGNORUJE při UPDATE
 * 
 * Validuje se pouze uniqueness emailu (pokud se mění).
 */
function handle_users_update($input, $config, $queries) {
    // DEBUG: Log incoming request
    error_log("=== handle_users_update CALLED ===");
    error_log("Input: " . json_encode($input));
    
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $user_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token', 'code' => 'UNAUTHORIZED'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Username z tokenu neodpovídá username z požladavku', 'code' => 'UNAUTHORIZED'));
        return;
    }

    if ($user_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné nebo chybějící ID uživatele', 'code' => 'MISSING_ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Kontrola existence uživatele
        $stmt = $db->prepare($queries['uzivatele_detail']);
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $existing_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing_user) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Uživatel nenalezen', 'code' => 'NOT_FOUND'));
            return;
        }
        
        // Validace input dat
        $validation = validateUserInput($input, true);
        if (!$validation['valid']) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => implode(', ', $validation['errors']), 'code' => 'VALIDATION_ERROR'));
            return;
        }
        
        $data = $validation['data'];
        
        // Validace vazeb
        $relation_errors = validateUserRelations($db, $queries, $data);
        if (!empty($relation_errors)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => implode(', ', $relation_errors), 'code' => 'RELATION_ERROR'));
            return;
        }
        
        // Kontrola duplicit (při UPDATE se kontroluje pouze email, username se NEMĚNÍ)
        $uniqueness_errors = validateUserUniqueness($db, $queries, $data, $user_id);
        
        if (!empty($uniqueness_errors)) {
            http_response_code(409);
            echo json_encode(array('status' => 'error', 'message' => implode(', ', $uniqueness_errors), 'code' => 'DUPLICATE_ERROR'));
            return;
        }
        
        // Kontrola new_username (pokud je zadán) - pro SUPERADMIN/Administrator
        $username_changed = false;
        $new_username = null;
        if (isset($input['new_username']) && !empty($input['new_username'])) {
            $new_username = trim($input['new_username']);
            
            // Kontrola, že new_username není stejný jako stávající
            if ($new_username === $existing_user['username']) {
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Nový username je stejný jako stávající', 'code' => 'SAME_USERNAME'));
                return;
            }
            
            // Kontrola, že new_username neexistuje v DB
            $stmt = $db->prepare($queries['uzivatele_check_username']);
            $stmt->bindParam(':username', $new_username, PDO::PARAM_STR);
            $exclude_id = 0;
            $stmt->bindParam(':exclude_id', $exclude_id, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result && (int)$result['count'] > 0) {
                http_response_code(409);
                echo json_encode(array('status' => 'error', 'message' => 'Username "' . $new_username . '" již existuje v databázi', 'code' => 'USERNAME_EXISTS'));
                return;
            }
        }
        
        $db->beginTransaction();
        
        // Příprava dat pro update (pouze zadaná pole)
        $update_fields = array();
        $update_values = array(':id' => $user_id);
        
        // Username se NEMĚNÍ při UPDATE - je to identifikátor
        $allowed_fields = array('jmeno', 'prijmeni', 'titul_pred', 'titul_za', 'email', 'telefon', 'usek_id', 'lokalita_id', 'pozice_id', 'organizace_id', 'aktivni');
        
        // DEBUG: Log validated data
        error_log("=== USER UPDATE DEBUG ===");
        error_log("User ID: " . $user_id);
        error_log("Validated data: " . json_encode($data));
        
        foreach ($allowed_fields as $field) {
            // OPRAVA: VŽDY přidej pole, pokud je v $data (i když je NULL)
            // array_key_exists() detekuje i NULL hodnoty, isset() je ignoruje
            if (array_key_exists($field, $data)) {
                $update_fields[] = "$field = :$field";
                $update_values[":$field"] = $data[$field];
                error_log("Adding field to update: $field = " . ($data[$field] === null ? 'NULL' : $data[$field]));
            }
        }
        
        // Update hesla (pokud je zadáno)
        if (isset($data['password_hash'])) {
            $stmt = $db->prepare($queries['uzivatele_update_password']);
            $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
            $stmt->bindParam(':password_hash', $data['password_hash'], PDO::PARAM_STR);
            $stmt->execute();
        }
        
        // Update username (pokud je zadán new_username)
        if ($new_username !== null) {
            $sql = "UPDATE " . TBL_UZIVATELE . " SET username = :new_username, dt_aktualizace = NOW() WHERE id = :id AND id > 0";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':new_username', $new_username, PDO::PARAM_STR);
            $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
            $stmt->execute();
            $username_changed = true;
            error_log("Username changed from '" . $existing_user['username'] . "' to '" . $new_username . "' for user_id: " . $user_id);
        }
        
        // Update ostatních dat (pokud jsou nějaká)
        if (!empty($update_fields)) {
            $sql = "UPDATE " . TBL_UZIVATELE . " SET " . implode(', ', $update_fields) . ", dt_aktualizace = NOW() WHERE id = :id AND id > 0";
            error_log("SQL: " . $sql);
            error_log("Values: " . json_encode($update_values));
            $stmt = $db->prepare($sql);
            
            // KRITICKÁ OPRAVA: Použij bindParam/bindValue s explicitními typy pro NULL support
            foreach ($update_values as $param => $value) {
                if ($value === null) {
                    $stmt->bindValue($param, null, PDO::PARAM_NULL);
                } else if (is_int($value)) {
                    $stmt->bindValue($param, $value, PDO::PARAM_INT);
                } else {
                    $stmt->bindValue($param, $value, PDO::PARAM_STR);
                }
            }
            
            $result = $stmt->execute();
            error_log("Execute result: " . ($result ? 'true' : 'false') . ", affected rows: " . $stmt->rowCount());
        } else {
            error_log("WARNING: No fields to update!");
        }
        
        // Správa rolí
        if (isset($input['roles']) && is_array($input['roles'])) {
            manageUserRoles($db, $queries, $user_id, $input['roles']);
        }
        
        // Správa přímých práv
        if (isset($input['direct_rights']) && is_array($input['direct_rights'])) {
            manageUserDirectRights($db, $queries, $user_id, $input['direct_rights']);
        }
        
        $db->commit();
        
        $response_data = array(
            'id' => (int)$user_id,
            'username' => $username_changed ? $new_username : $existing_user['username'],
            'message' => 'Uživatel byl úspěšně aktualizován'
        );
        
        // Přidej info o změně username
        if ($username_changed) {
            $response_data['username_changed'] = true;
            $response_data['old_username'] = $existing_user['username'];
            $response_data['new_username'] = $new_username;
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $response_data
        ));
        
    } catch (Exception $e) {
        if (isset($db)) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci uživatele: ' . $e->getMessage(), 'code' => 'SERVER_ERROR'));
    }
}

function handle_users_partial_update($input, $config, $queries) {
    // Stejná logika jako handle_users_update, protože update už podporuje částečné úpravy
    handle_users_update($input, $config, $queries);
}

function handle_users_deactivate($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $user_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token', 'code' => 'UNAUTHORIZED'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Username z tokenu neodpovídá username z požadavku', 'code' => 'UNAUTHORIZED'));
        return;
    }

    if ($user_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné nebo chybějící ID uživatele', 'code' => 'MISSING_ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Kontrola existence uživatele
        $stmt = $db->prepare($queries['uzivatele_detail']);
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $existing_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing_user) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Uživatel nenalezen', 'code' => 'NOT_FOUND'));
            return;
        }
        
        // Deaktivace uživatele
        $stmt = $db->prepare($queries['uzivatele_deactivate']);
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'id' => (int)$user_id,
                'username' => $existing_user['username'],
                'deactivated' => true,
                'message' => 'Uživatel byl úspěšně deaktivován'
            )
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při deaktivaci uživatele: ' . $e->getMessage(), 'code' => 'SERVER_ERROR'));
    }
}

/**
 * Úplné smazání uživatele ze systému (hard delete)
 * 
 * VAROVÁNÍ: Toto TRVALE odstraní uživatele a všechny jeho vazby!
 * Pro běžné použití doporučujeme handle_users_deactivate() místo tohoto.
 * 
 * Endpoint: POST /users/delete
 * Parametry:
 * - token: autentizační token
 * - username: username přihlášeného uživatele
 * - id: ID uživatele ke smazání
 */
function handle_users_delete($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $user_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token', 'code' => 'UNAUTHORIZED'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Username z tokenu neodpovídá username z požadavku', 'code' => 'UNAUTHORIZED'));
        return;
    }

    if ($user_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné nebo chybějící ID uživatele', 'code' => 'MISSING_ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Kontrola existence uživatele
        $stmt = $db->prepare($queries['uzivatele_detail']);
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $existing_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing_user) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Uživatel nenalezen', 'code' => 'NOT_FOUND'));
            return;
        }
        
        $db->beginTransaction();
        
        // Smazání vazeb na role
        $stmt = $db->prepare($queries['uzivatele_roles_delete_all']);
        $stmt->bindParam(':uzivatel_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        // Smazání přímých práv
        $stmt = $db->prepare($queries['uzivatele_direct_rights_delete_all']);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        // Úplné smazání uživatele z databáze
        $stmt = $db->prepare($queries['uzivatele_delete']);
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Uživatel nemohl být smazán', 'code' => 'DELETE_FAILED'));
            return;
        }
        
        $db->commit();
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'id' => (int)$user_id,
                'username' => $existing_user['username'],
                'deleted' => true,
                'message' => 'Uživatel byl trvale odstraněn ze systému'
            )
        ));
        
    } catch (Exception $e) {
        if (isset($db)) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání uživatele: ' . $e->getMessage(), 'code' => 'SERVER_ERROR'));
    }
}

?>