<?php

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

/**
 * Pomocná funkce: ověří token a vrátí token_data, nebo false
 */
function _substitution_auth($data, $pdo) {
    $token = isset($data['token']) ? trim($data['token']) : '';
    $username = isset($data['username']) ? trim($data['username']) : '';
    if (!$token || !$username) {
        return false;
    }
    $token_data = verify_token_v2($username, $token, $pdo);
    if (!$token_data) {
        return false;
    }
    return $token_data;
}

/**
 * Pomocná funkce: má uživatel dané právo?
 * Prochází $token_data['permissions'] načtená z verify_token_v2
 */
function _substitution_has_right($token_data, $kod_prava) {
    if (empty($token_data['permissions'])) return false;
    foreach ($token_data['permissions'] as $p) {
        if (isset($p['kod_prava']) && $p['kod_prava'] === $kod_prava) return true;
    }
    return false;
}

/**
 * Pomocná funkce: dekóduje opravneni JSON z DB
 */
function _substitution_decode_opravneni($opravneni_raw) {
    if (empty($opravneni_raw)) return array();
    $decoded = json_decode($opravneni_raw, true);
    return is_array($decoded) ? $decoded : array();
}

/**
 * Pomocná funkce: může uživatel spravovat své zastupování?
 * Ano pokud má USER_SUBSTITUTE_SET, je admin, nebo má v tabulce možností aktivní vlastní pravidla.
 */
function _substitution_can_manage_own($token_data, $pdo, $queries) {
    if (!empty($token_data['is_admin']) || _substitution_has_right($token_data, 'USER_SUBSTITUTE_SET')) {
        return true;
    }

    try {
        if (!isset($queries['moznosti_zastupovani_can_set_own'])) {
            return false;
        }
        $user_id = (int)($token_data['id'] ?? 0);
        if ($user_id <= 0) return false;

        $stmt = $pdo->prepare($queries['moznosti_zastupovani_can_set_own']);
        $stmt->execute(array(':user_id' => $user_id));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['cnt'] ?? 0) > 0;
    } catch (Exception $e) {
        error_log('_substitution_can_manage_own error: ' . $e->getMessage());
        return false;
    }
}

/**
 * POST substitution/list
 * Vrátí moje zastupování (kdo zastupuje mě) nebo aktuálně aktivní (pro adminy)
 */
function handle_substitution_list($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    try {
        TimezoneHelper::setMysqlTimezone($pdo);

        $user_id = (int)$token_data['id'];
        $stmt = $pdo->prepare($queries['substitution_get_by_user']);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();

        $substitutions = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $substitutions[] = array(
                'id' => (int)$row['id'],
                'zastupovany' => array(
                    'id' => (int)$row['zastupovany_id'],
                    'username' => $row['zastupovany_username'],
                    'jmeno' => $row['zastupovany_jmeno'],
                    'prijmeni' => $row['zastupovany_prijmeni'],
                    'email' => $row['zastupovany_email'],
                    'telefon' => $row['zastupovany_telefon']
                ),
                'zastupce' => array(
                    'id' => (int)$row['zastupce_id'],
                    'username' => $row['zastupce_username'],
                    'jmeno' => $row['zastupce_jmeno'],
                    'prijmeni' => $row['zastupce_prijmeni'],
                    'email' => $row['zastupce_email'],
                    'telefon' => $row['zastupce_telefon']
                ),
                'dt_od' => $row['dt_od'],
                'dt_do' => $row['dt_do'],
                'opravneni' => _substitution_decode_opravneni($row['opravneni']),
                'popis' => $row['popis'],
                'aktivni' => (int)$row['aktivni'],
                'dt_ukonceni' => $row['dt_ukonceni'] ?? null
            );
        }

        return array('status' => 'ok', 'data' => $substitutions, 'count' => count($substitutions));

    } catch (PDOException $e) {
        error_log("substitution_list DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání zastupování');
    }
}

/**
 * POST substitution/create
 * Uživatel nastaví svého zástupce. Vyžaduje právo USER_SUBSTITUTE_SET.
 * zastupovany_id MUSÍ odpovídat přihlášenému uživateli.
 * Povinná pole: zastupce_id, dt_od, dt_do, opravneni (objekt)
 */
function handle_substitution_create($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    if (!_substitution_can_manage_own($token_data, $pdo, $queries)) {
        return array('status' => 'error', 'message' => 'Nemáte oprávnění nastavit vlastního zástupce');
    }

    // Povinná pole
    $required = array('zastupce_id', 'dt_od', 'dt_do', 'opravneni');
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            return array('status' => 'error', 'message' => "Chybí povinné pole: $field");
        }
    }

    $zastupovany_id = (int)$token_data['id']; // default: aktuální uživatel
    $admin_override = false;

    // Admin override: může zadat jiného zastupovaného
    if ($token_data['is_admin'] && isset($data['zastupovany_id']) && (int)$data['zastupovany_id'] > 0) {
        $zastupovany_id = (int)$data['zastupovany_id'];
        $admin_override = true;
    }

    $zastupce_id = (int)$data['zastupce_id'];
    $dt_od = trim($data['dt_od']);
    $dt_do = trim($data['dt_do']);
    $popis = isset($data['popis']) ? trim($data['popis']) : null;

    if ($popis === null || $popis === '') {
        return array('status' => 'error', 'message' => 'Poznámka / odůvodnění je povinná');
    }

    // Validace: nesmí zastupovat sám sebe
    if ($zastupovany_id === $zastupce_id) {
        return array('status' => 'error', 'message' => 'Nemůžete nastavit sebe jako vlastního zástupce');
    }

    // Validace dat
    if (!$dt_od || !$dt_do || strtotime($dt_od) === false || strtotime($dt_do) === false) {
        return array('status' => 'error', 'message' => 'Neplatný formát datumu (YYYY-MM-DD)');
    }
    if (strtotime($dt_od) >= strtotime($dt_do)) {
        return array('status' => 'error', 'message' => 'Datum začátku musí být před datem konce');
    }

    // Validace opravneni - musí být objekt/pole
    $opravneni_input = $data['opravneni'];
    if (is_string($opravneni_input)) {
        $opravneni_arr = json_decode($opravneni_input, true);
    } else {
        $opravneni_arr = (array)$opravneni_input;
    }
    if (!is_array($opravneni_arr) || empty($opravneni_arr)) {
        return array('status' => 'error', 'message' => 'Pole opravneni musí být neprázdný objekt (např. {"view":1})');
    }

    $module_visibility_enabled = !empty($opravneni_arr['module_visibility']);
    $cashbook_transfer_enabled = !empty($opravneni_arr['cashbook_transfer']);
    if ($cashbook_transfer_enabled && !$module_visibility_enabled) {
        return array('status' => 'error', 'message' => 'Přenos pokladny vyžaduje zapnutý přenos viditelnosti modulů.');
    }
    if ($cashbook_transfer_enabled) {
        $eligibility = _substitution_cashbook_transfer_eligibility($pdo, $zastupovany_id);
        if (empty($eligibility['eligible'])) {
            return array('status' => 'error', 'message' => !empty($eligibility['reason']) ? $eligibility['reason'] : 'Přenos pokladny nelze pro tohoto uživatele povolit.');
        }
    }
    if (!empty($opravneni_arr['approve'])) {
        $eligibility = _substitution_cashbook_transfer_eligibility($pdo, $zastupovany_id);
        if (empty($eligibility['can_order_approve'])) {
            return array('status' => 'error', 'message' => !empty($eligibility['order_approve_reason']) ? $eligibility['order_approve_reason'] : 'Schvalovací oprávnění nelze pro tohoto uživatele povolit.');
        }
    }

    $opravneni_json = json_encode($opravneni_arr, JSON_UNESCAPED_UNICODE);

    try {
        TimezoneHelper::setMysqlTimezone($pdo);
        $pdo->beginTransaction();

        // Ověření proti vazební tabulce možností zastupování (platí pro všechny včetně admin override)
        $stmt = $pdo->prepare($queries['substitution_validate_candidate_pair']);
        $stmt->execute(array(
            ':zastupce_id' => $zastupce_id,
            ':zastupovany_id' => $zastupovany_id,
            ':zastupovany_id2' => $zastupovany_id,
        ));
        if ((int)$stmt->fetchColumn() === 0) {
            $pdo->rollBack();
            return array('status' => 'error', 'message' => 'Vybraný uživatel není povoleným zástupcem dle vazební tabulky');
        }

        // Vložení záznamu
        $stmt = $pdo->prepare($queries['substitution_create']);
        $stmt->bindParam(':zastupovany_id', $zastupovany_id, PDO::PARAM_INT);
        $stmt->bindParam(':zastupce_id', $zastupce_id, PDO::PARAM_INT);
        $stmt->bindParam(':dt_od', $dt_od);
        $stmt->bindParam(':dt_do', $dt_do);
        $stmt->bindParam(':opravneni', $opravneni_json);
        $stmt->bindParam(':popis', $popis);
        $stmt->bindParam(':vytvoril_user_id', $zastupovany_id, PDO::PARAM_INT);
        $stmt->execute();
        $new_id = (int)$pdo->lastInsertId();

        $pdo->commit();

        // ── NOTIFIKACE po commitu ──────────────────────────────────────────
        try {
            // Načti jména zástupce a zastupovaného pro notifikaci
            $stmt_names = $pdo->prepare(
                "SELECT id, jmeno, prijmeni FROM " . TBL_UZIVATELE . " WHERE id IN (?, ?) AND aktivni = 1"
            );
            $stmt_names->execute(array($zastupce_id, $zastupovany_id));
            $names = array();
            while ($r = $stmt_names->fetch(PDO::FETCH_ASSOC)) {
                $names[(int)$r['id']] = trim($r['jmeno'] . ' ' . $r['prijmeni']);
            }
            $zastupce_jmeno   = isset($names[$zastupce_id])   ? $names[$zastupce_id]   : 'Zástupce';
            $zastupovany_jmeno = isset($names[$zastupovany_id]) ? $names[$zastupovany_id] : 'Uživatel';
            $dt_od_fmt = date('d.m.Y', strtotime($dt_od));
            $dt_do_fmt = date('d.m.Y', strtotime($dt_do));

            $notif_data_json = json_encode(array(
                'substitution_id' => $new_id,
                'placeholders' => array(
                    'zastupce_jmeno'   => $zastupce_jmeno,
                    'zastupovany_jmeno' => $zastupovany_jmeno,
                    'dt_od' => $dt_od_fmt,
                    'dt_do' => $dt_do_fmt,
                )
            ), JSON_UNESCAPED_UNICODE);

            // Notifikace PRO ZÁSTUPCE – byl nastaven jako zástupce
            createNotification($pdo, array(
                ':typ'              => 'SUBSTITUTION_SET',
                ':nadpis'           => 'Jste zástupcem pro ' . $zastupovany_jmeno,
                ':zprava'           => 'Byli jste nastaveni jako zástupce pro ' . $zastupovany_jmeno . ' v období ' . $dt_od_fmt . ' – ' . $dt_do_fmt . '.',
                ':data_json'        => $notif_data_json,
                ':od_uzivatele_id'  => (int)$token_data['id'],
                ':pro_uzivatele_id' => $zastupce_id,
                ':prijemci_json'    => null,
                ':pro_vsechny'      => 0,
                ':priorita'         => 'normal',
                ':kategorie'        => 'zastupovani',
                ':odeslat_email'    => 0,
                ':objekt_typ'       => 'zastupovani',
                ':objekt_id'        => $new_id,
                ':dt_expires'       => null,
                ':aktivni'          => 1,
            ));

            // Notifikace PRO ZASTUPOVANÉHO – pouze pokud admin nastavoval zástupce za jiného
            if ($admin_override && $zastupovany_id !== (int)$token_data['id']) {
                createNotification($pdo, array(
                    ':typ'              => 'SUBSTITUTION_CREATED',
                    ':nadpis'           => 'Zástupce nastaven: ' . $zastupce_jmeno,
                    ':zprava'           => 'Byl vám nastaven zástupce ' . $zastupce_jmeno . ' v období ' . $dt_od_fmt . ' – ' . $dt_do_fmt . '.',
                    ':data_json'        => $notif_data_json,
                    ':od_uzivatele_id'  => (int)$token_data['id'],
                    ':pro_uzivatele_id' => $zastupovany_id,
                    ':prijemci_json'    => null,
                    ':pro_vsechny'      => 0,
                    ':priorita'         => 'normal',
                    ':kategorie'        => 'zastupovani',
                    ':odeslat_email'    => 0,
                    ':objekt_typ'       => 'zastupovani',
                    ':objekt_id'        => $new_id,
                    ':dt_expires'       => null,
                    ':aktivni'          => 1,
                ));
            }
        } catch (Exception $e_notif) {
            error_log("substitution_create – notifikace selhaly: " . $e_notif->getMessage());
            // Notifikace jsou nekritické – pokračujeme
        }
        // ─────────────────────────────────────────────────────────────────

        return array(
            'status' => 'ok',
            'message' => 'Zastupování bylo úspěšně nastaveno',
            'data' => array(
                'id' => $new_id,
                'zastupovany_id' => $zastupovany_id,
                'zastupce_id' => $zastupce_id,
                'dt_od' => $dt_od,
                'dt_do' => $dt_do,
                'opravneni' => $opravneni_arr,
                'popis' => $popis
            )
        );

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log("substitution_create DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při ukládání zastupování');
    }
}

/**
 * POST substitution/update
 * Aktualizuje existující zastupování. Musí patřit přihlášenému uživateli.
 * Povinná pole: id, zastupce_id, dt_od, dt_do, opravneni
 */
function handle_substitution_update($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    if (!_substitution_can_manage_own($token_data, $pdo, $queries)) {
        return array('status' => 'error', 'message' => 'Nemáte oprávnění upravit zastupování');
    }

    $required = array('id', 'zastupce_id', 'dt_od', 'dt_do', 'opravneni');
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            return array('status' => 'error', 'message' => "Chybí povinné pole: $field");
        }
    }

    $substitution_id = (int)$data['id'];
    $zastupovany_id = (int)$token_data['id'];
    $zastupce_id = (int)$data['zastupce_id'];
    $dt_od = trim($data['dt_od']);
    $dt_do = trim($data['dt_do']);
    $popis = isset($data['popis']) ? trim($data['popis']) : null;

    if ($popis === null || $popis === '') {
        return array('status' => 'error', 'message' => 'Poznámka / odůvodnění je povinná');
    }

    if ($zastupovany_id === $zastupce_id) {
        return array('status' => 'error', 'message' => 'Nemůžete nastavit sebe jako vlastního zástupce');
    }
    if (strtotime($dt_od) >= strtotime($dt_do)) {
        return array('status' => 'error', 'message' => 'Datum začátku musí být před datem konce');
    }

    $opravneni_input = $data['opravneni'];
    $opravneni_arr = is_string($opravneni_input) ? json_decode($opravneni_input, true) : (array)$opravneni_input;
    if (!is_array($opravneni_arr) || empty($opravneni_arr)) {
        return array('status' => 'error', 'message' => 'Pole opravneni musí být neprázdný objekt');
    }

    $module_visibility_enabled = !empty($opravneni_arr['module_visibility']);
    $cashbook_transfer_enabled = !empty($opravneni_arr['cashbook_transfer']);
    if ($cashbook_transfer_enabled && !$module_visibility_enabled) {
        return array('status' => 'error', 'message' => 'Přenos pokladny vyžaduje zapnutý přenos viditelnosti modulů.');
    }
    if ($cashbook_transfer_enabled) {
        $eligibility = _substitution_cashbook_transfer_eligibility($pdo, $zastupovany_id);
        if (empty($eligibility['eligible'])) {
            return array('status' => 'error', 'message' => !empty($eligibility['reason']) ? $eligibility['reason'] : 'Přenos pokladny nelze pro tohoto uživatele povolit.');
        }
    }
    if (!empty($opravneni_arr['approve'])) {
        $eligibility = _substitution_cashbook_transfer_eligibility($pdo, $zastupovany_id);
        if (empty($eligibility['can_order_approve'])) {
            return array('status' => 'error', 'message' => !empty($eligibility['order_approve_reason']) ? $eligibility['order_approve_reason'] : 'Schvalovací oprávnění nelze pro tohoto uživatele povolit.');
        }
    }

    $opravneni_json = json_encode($opravneni_arr, JSON_UNESCAPED_UNICODE);

    try {
        TimezoneHelper::setMysqlTimezone($pdo);

        // Ověření proti vazební tabulce možností zastupování i při UPDATE.
        $stmtCandidate = $pdo->prepare($queries['substitution_validate_candidate_pair']);
        $stmtCandidate->execute([
            ':zastupce_id' => $zastupce_id,
            ':zastupovany_id' => $zastupovany_id,
            ':zastupovany_id2' => $zastupovany_id,
        ]);
        $rowCandidate = $stmtCandidate->fetch(PDO::FETCH_ASSOC);
        $isAllowed = (int)($rowCandidate['cnt'] ?? 0) > 0;
        if (!$isAllowed) {
            return array('status' => 'error', 'message' => 'Vybraný uživatel není povoleným zástupcem dle vazební tabulky');
        }

        $stmt = $pdo->prepare($queries['substitution_update']);
        $stmt->bindParam(':substitution_id', $substitution_id, PDO::PARAM_INT);
        $stmt->bindParam(':zastupovany_id', $zastupovany_id, PDO::PARAM_INT);
        $stmt->bindParam(':dt_od', $dt_od);
        $stmt->bindParam(':dt_do', $dt_do);
        $stmt->bindParam(':opravneni', $opravneni_json);
        $stmt->bindParam(':popis', $popis);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            // Nekritická notifikace pro zástupce: zastupování bylo upraveno.
            try {
                $stmtNames = $pdo->prepare("SELECT id, jmeno, prijmeni FROM " . TBL_UZIVATELE . " WHERE id IN (?, ?) AND aktivni = 1");
                $stmtNames->execute([$zastupce_id, $zastupovany_id]);
                $names = [];
                while ($r = $stmtNames->fetch(PDO::FETCH_ASSOC)) {
                    $names[(int)$r['id']] = trim(($r['jmeno'] ?? '') . ' ' . ($r['prijmeni'] ?? ''));
                }

                $zastupce_jmeno = $names[$zastupce_id] ?? 'Zástupce';
                $zastupovany_jmeno = $names[$zastupovany_id] ?? 'Uživatel';
                $dt_od_fmt = date('d.m.Y', strtotime($dt_od));
                $dt_do_fmt = date('d.m.Y', strtotime($dt_do));

                $notif_data_json = json_encode([
                    'substitution_id' => $substitution_id,
                    'placeholders' => [
                        'zastupce_jmeno' => $zastupce_jmeno,
                        'zastupovany_jmeno' => $zastupovany_jmeno,
                        'dt_od' => $dt_od_fmt,
                        'dt_do' => $dt_do_fmt,
                    ]
                ], JSON_UNESCAPED_UNICODE);

                createNotification($pdo, [
                    ':typ'              => 'SUBSTITUTION_SET',
                    ':nadpis'           => 'Zastupování upraveno: ' . $zastupovany_jmeno,
                    ':zprava'           => 'Nastavení zastupování za ' . $zastupovany_jmeno . ' bylo upraveno na období ' . $dt_od_fmt . ' – ' . $dt_do_fmt . '.',
                    ':data_json'        => $notif_data_json,
                    ':od_uzivatele_id'  => (int)$token_data['id'],
                    ':pro_uzivatele_id' => $zastupce_id,
                    ':prijemci_json'    => null,
                    ':pro_vsechny'      => 0,
                    ':priorita'         => 'normal',
                    ':kategorie'        => 'zastupovani',
                    ':odeslat_email'    => 0,
                    ':objekt_typ'       => 'zastupovani',
                    ':objekt_id'        => $substitution_id,
                    ':dt_expires'       => null,
                    ':aktivni'          => 1,
                ]);
            } catch (Exception $e_notif) {
                error_log("substitution_update – notifikace selhaly: " . $e_notif->getMessage());
            }

            return array(
                'status' => 'ok',
                'message' => 'Zastupování bylo úspěšně aktualizováno',
                'data' => array(
                    'id' => $substitution_id,
                    'zastupce_id' => $zastupce_id,
                    'dt_od' => $dt_od,
                    'dt_do' => $dt_do,
                    'opravneni' => $opravneni_arr,
                    'popis' => $popis
                )
            );
        } else {
            return array('status' => 'error', 'message' => 'Zastupování nebylo nalezeno nebo nepatří vašemu účtu');
        }

    } catch (PDOException $e) {
        error_log("substitution_update DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při aktualizaci zastupování');
    }
}

/**
 * POST substitution/deactivate
 * Zruší (deaktivuje) zastupování. Musí patřit přihlášenému uživateli.
 * Povinné pole: id
 */
function handle_substitution_deactivate($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    if (!_substitution_can_manage_own($token_data, $pdo, $queries)) {
        return array('status' => 'error', 'message' => 'Nemáte oprávnění zrušit zastupování');
    }

    if (!isset($data['id']) || !is_numeric($data['id'])) {
        return array('status' => 'error', 'message' => 'Chybí nebo neplatné id zastupování');
    }

    $substitution_id = (int)$data['id'];
    $current_user_id = (int)$token_data['id'];
    $is_admin = !empty($token_data['is_admin']);

    try {
        TimezoneHelper::setMysqlTimezone($pdo);

        // Načti data zastupování PŘED změnou (pro validaci i notifikaci)
        $stmt_info = $pdo->prepare(
            "SELECT z.id, z.zastupce_id, z.zastupovany_id, z.dt_od, z.dt_do, z.aktivni,
                    uc.jmeno AS zastupce_jmeno, uc.prijmeni AS zastupce_prijmeni,
                    uo.jmeno AS zastupovany_jmeno, uo.prijmeni AS zastupovany_prijmeni
             FROM " . TBL_UZIVATELE_ZASTUPOVANI . " z
             LEFT JOIN " . TBL_UZIVATELE . " uc ON uc.id = z.zastupce_id
             LEFT JOIN " . TBL_UZIVATELE . " uo ON uo.id = z.zastupovany_id
             WHERE z.id = ?"
        );
        $stmt_info->execute(array($substitution_id));
        $sub_info = $stmt_info->fetch(PDO::FETCH_ASSOC);

        if (!$sub_info) {
            return array('status' => 'error', 'message' => 'Zastupování nebylo nalezeno');
        }

        // Non-admin může měnit pouze svá zastupování (kde je zastupovaný)
        if (!$is_admin && (int)$sub_info['zastupovany_id'] !== $current_user_id) {
            return array('status' => 'error', 'message' => 'Nemáte oprávnění měnit toto zastupování');
        }

        $today = TimezoneHelper::getCzechDateTime('Y-m-d');
        $is_future = ((int)$sub_info['aktivni'] === 1) && ((string)$sub_info['dt_od'] > $today);
        $is_active_now = ((int)$sub_info['aktivni'] === 1) && ((string)$sub_info['dt_od'] <= $today) && ((string)$sub_info['dt_do'] >= $today);

        // Ukončené / neaktivní / již proběhlé nelze měnit kvůli historii
        if (!$is_future && !$is_active_now) {
            return array('status' => 'error', 'message' => 'Ukončené zastupování nelze smazat ani deaktivovat');
        }

        $operation = 'deactivated';
        if ($is_future) {
            // Budoucí záznam: smazat úplně
            if ($is_admin) {
                $stmt = $pdo->prepare("DELETE FROM " . TBL_UZIVATELE_ZASTUPOVANI . " WHERE id = :substitution_id");
                $stmt->bindParam(':substitution_id', $substitution_id, PDO::PARAM_INT);
            } else {
                $stmt = $pdo->prepare("DELETE FROM " . TBL_UZIVATELE_ZASTUPOVANI . " WHERE id = :substitution_id AND zastupovany_id = :zastupovany_id");
                $stmt->bindParam(':substitution_id', $substitution_id, PDO::PARAM_INT);
                $stmt->bindParam(':zastupovany_id', $current_user_id, PDO::PARAM_INT);
            }
            $operation = 'deleted';
        } else {
            // Běžící záznam: pouze deaktivovat
            if ($is_admin) {
                $stmt = $pdo->prepare(
                    "UPDATE " . TBL_UZIVATELE_ZASTUPOVANI . "
                     SET aktivni = 0, dt_aktualizace = NOW(), dt_ukonceni = NOW()
                     WHERE id = :substitution_id AND aktivni = 1"
                );
                $stmt->bindParam(':substitution_id', $substitution_id, PDO::PARAM_INT);
            } else {
                $stmt = $pdo->prepare($queries['substitution_deactivate']);
                $stmt->bindParam(':substitution_id', $substitution_id, PDO::PARAM_INT);
                $stmt->bindParam(':zastupovany_id', $current_user_id, PDO::PARAM_INT);
            }
        }

        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            // ── NOTIFIKACE: Zastupování ukončeno ───────────────────────────
            if ($sub_info) {
                try {
                    $zastupce_jmeno_full   = trim($sub_info['zastupce_jmeno'] . ' ' . $sub_info['zastupce_prijmeni']);
                    $zastupovany_jmeno_full = trim($sub_info['zastupovany_jmeno'] . ' ' . $sub_info['zastupovany_prijmeni']);
                    $dt_od_fmt = $sub_info['dt_od'] ? date('d.m.Y', strtotime($sub_info['dt_od'])) : '?';
                    $dt_do_fmt = $sub_info['dt_do'] ? date('d.m.Y', strtotime($sub_info['dt_do'])) : '?';

                    $notif_data_json = json_encode(array(
                        'substitution_id' => $substitution_id,
                        'placeholders' => array(
                            'zastupce_jmeno'   => $zastupce_jmeno_full,
                            'zastupovany_jmeno' => $zastupovany_jmeno_full,
                            'dt_od' => $dt_od_fmt,
                            'dt_do' => $dt_do_fmt,
                        )
                    ), JSON_UNESCAPED_UNICODE);

                    createNotification($pdo, array(
                        ':typ'              => 'SUBSTITUTION_ENDED',
                        ':nadpis'           => ($operation === 'deleted' ? 'Plánované zastupování zrušeno' : 'Zastupování ukončeno'),
                        ':zprava'           => ($operation === 'deleted'
                            ? 'Plánované zastupování za ' . $zastupovany_jmeno_full . ' (' . $dt_od_fmt . ' – ' . $dt_do_fmt . ') bylo zrušeno před začátkem.'
                            : 'Vaše zastupování za ' . $zastupovany_jmeno_full . ' (' . $dt_od_fmt . ' – ' . $dt_do_fmt . ') bylo ukončeno.'),
                        ':data_json'        => $notif_data_json,
                        ':od_uzivatele_id'  => (int)$current_user_id,
                        ':pro_uzivatele_id' => (int)$sub_info['zastupce_id'],
                        ':prijemci_json'    => null,
                        ':pro_vsechny'      => 0,
                        ':priorita'         => 'normal',
                        ':kategorie'        => 'zastupovani',
                        ':odeslat_email'    => 0,
                        ':objekt_typ'       => 'zastupovani',
                        ':objekt_id'        => $substitution_id,
                        ':dt_expires'       => null,
                        ':aktivni'          => 1,
                    ));
                } catch (Exception $e_notif) {
                    error_log("substitution_deactivate – notifikace selhaly: " . $e_notif->getMessage());
                }
            }
            // ───────────────────────────────────────────────────────────────
            return array(
                'status' => 'ok',
                'message' => ($operation === 'deleted'
                    ? 'Plánované zastupování bylo smazáno'
                    : 'Aktivní zastupování bylo deaktivováno'),
                'data' => array('operation' => $operation)
            );
        } else {
            return array('status' => 'error', 'message' => 'Zastupování nebylo nalezeno nebo jej nelze změnit');
        }

    } catch (PDOException $e) {
        error_log("substitution_deactivate DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při rušení zastupování');
    }
}

/**
 * POST substitution/current
 * Vrátí aktuálně platná zastupování pro přihlášeného uživatele jakožto zástupce
 * (koho aktuálně zastupuji já)
 */
function handle_substitution_current($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    try {
        TimezoneHelper::setMysqlTimezone($pdo);

        $user_id = (int)$token_data['id'];
        $stmt = $pdo->prepare($queries['substitution_check_current']);
        $stmt->bindParam(':zastupce_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();

        $result = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $result[] = array(
                'id' => (int)$row['id'],
                'zastupovany_id' => (int)$row['zastupovany_id'],
                'zastupovany_username' => $row['zastupovany_username'],
                'zastupovany_jmeno' => $row['zastupovany_jmeno'],
                'zastupovany_prijmeni' => $row['zastupovany_prijmeni'],
                'zastupovany_email' => $row['zastupovany_email'],
                'zastupovany_telefon' => $row['zastupovany_telefon'],
                'dt_od' => $row['dt_od'],
                'dt_do' => $row['dt_do'],
                'aktivni' => (int)$row['aktivni'],
                'opravneni' => _substitution_decode_opravneni($row['opravneni']),
                'popis' => $row['popis']
            );
        }

        return array('status' => 'ok', 'data' => $result, 'count' => count($result));

    } catch (PDOException $e) {
        error_log("substitution_current DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání aktuálních zastupování');
    }
}

/**
 * Pomocná funkce: vrátí všechny kódy práv uživatele (role + direct práva).
 *
 * @param PDO $pdo
 * @param int $user_id
 * @return array
 */
function _substitution_get_permission_codes_for_user($pdo, $user_id) {
    $codes = array();

    try {
        $stmt_roles = $pdo->prepare("SELECT role_id FROM " . TBL_UZIVATELE_ROLE . " WHERE uzivatel_id = :user_id");
        $stmt_roles->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt_roles->execute();
        $role_ids = $stmt_roles->fetchAll(PDO::FETCH_COLUMN, 0);

        foreach ($role_ids as $role_id) {
            $stmt_rights = $pdo->prepare(
                "SELECT p.kod_prava
                 FROM " . TBL_ROLE_PRAVA . " rp
                 INNER JOIN " . TBL_PRAVA . " p ON p.id = rp.pravo_id
                 WHERE rp.role_id = :role_id"
            );
            $stmt_rights->bindParam(':role_id', $role_id, PDO::PARAM_INT);
            $stmt_rights->execute();
            while ($row = $stmt_rights->fetch(PDO::FETCH_ASSOC)) {
                if (!empty($row['kod_prava'])) {
                    $codes[] = strtoupper(trim($row['kod_prava']));
                }
            }
        }

        $stmt_direct = $pdo->prepare(
            "SELECT p.kod_prava
             FROM " . TBL_ROLE_PRAVA . " rp
             INNER JOIN " . TBL_PRAVA . " p ON p.id = rp.pravo_id
             WHERE rp.user_id = :user_id"
        );
        $stmt_direct->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt_direct->execute();
        while ($row = $stmt_direct->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($row['kod_prava'])) {
                $codes[] = strtoupper(trim($row['kod_prava']));
            }
        }
    } catch (PDOException $e) {
        error_log("substitution_effective_permissions rights fetch error for user " . (int)$user_id . ": " . $e->getMessage());
    }

    return array_values(array_unique($codes));
}

/**
 * Pomocná funkce: určí, zda je právo business/modulové (bez admin řízení systému).
 *
 * @param string $code
 * @return bool
 */
function _substitution_is_business_permission($code) {
    $c = strtoupper(trim((string)$code));
    if ($c === '') {
        return false;
    }

    $business_patterns = array(
        '/^ORDER_/',
        '/^INVOICE_/',
        '/^ANNUAL_FEES_/',
        '/^CASH_BOOK_/',
        '/^CASHBOOK_REPORTS_/',
        '/^SUPPLIER_/',
        '/^PHONEBOOK_/',
        '/^DICT_/',
        '/^ASSET_/',
        '/^REPORT_/',
        '/^STATISTICS_/',
        '/^STATS_/',
        '/^SPENDING_/',
        '/^LP_/',
        '/^CONTRACT_/',
        '/^ATTACHMENTS_/',
        '/^PIVOT_/',
        '/^EDUCATION_/',
        '/^FIN_CONTROL_/',
        '/^DASHBOARD_/',
        '/^CERPANI_/'
    );

    foreach ($business_patterns as $pattern) {
        if (preg_match($pattern, $c)) {
            return true;
        }
    }

    return false;
}

/**
 * Pomocná funkce: určí, zda je právo cashbookové.
 *
 * @param string $code
 * @return bool
 */
function _substitution_is_cashbook_permission($code) {
    $c = strtoupper(trim((string)$code));
    if ($c === '') {
        return false;
    }

    if (preg_match('/^CASH_BOOK_/', $c)) {
        return true;
    }
    if (preg_match('/^CASHBOOK_REPORTS_/', $c)) {
        return true;
    }

    return false;
}

/**
 * Pomocná funkce: filtruje práva dle scope zástupu.
 *
 * @param array $codes
 * @param bool $can_view
 * @param bool $can_approve
 * @param bool $can_confirm
 * @param bool $can_cashbook_transfer
 * @return array
 */
function _substitution_filter_permissions_by_scope($codes, $can_view, $can_approve, $can_confirm, $can_cashbook_transfer = false) {
    $filtered = array();

    foreach ((array)$codes as $code) {
        $norm = strtoupper(trim((string)$code));
        if ($norm === '') {
            continue;
        }

        if ($can_view) {
            if (_substitution_is_business_permission($norm)) {
                if (_substitution_is_cashbook_permission($norm) && !$can_cashbook_transfer) {
                    continue;
                }
                $filtered[] = $norm;
            }
            continue;
        }

        if ($can_approve && preg_match('/^ORDER_/', $norm)) {
            $filtered[] = $norm;
            continue;
        }

        if ($can_confirm && preg_match('/^INVOICE_/', $norm)) {
            $filtered[] = $norm;
            continue;
        }
    }

    return array_values(array_unique($filtered));
}

/**
 * Interní helper: zjistí způsobilost uživatele pro přenos pokladen.
 *
 * Podmínky:
 * - uživatel má cashbook práva
 * - a má přístup do pokladen (globální ALL/MANAGE nebo aktivní přiřazení)
 *
 * @param PDO $pdo
 * @param int $user_id
 * @return array
 */
function _substitution_cashbook_transfer_eligibility($pdo, $user_id) {
    $uid = (int)$user_id;
    $result = array(
        'eligible' => false,
        'has_cashbook_rights' => false,
        'has_cashbook_access' => false,
        'has_global_cashbook_access' => false,
        'cashbox_assignment_count' => 0,
        'reason' => 'Uživatel nemá potřebná práva k pokladně.',
        'can_order_approve' => false,
        'has_order_approval_rights' => false,
        'order_approve_reason' => 'Zastupovaný uživatel nemá schvalovací oprávnění pro objednávky.'
    );

    if ($uid <= 0) {
        $result['reason'] = 'Neplatné ID uživatele.';
        return $result;
    }

    $codes = _substitution_get_permission_codes_for_user($pdo, $uid);
    $has_rights = false;
    $has_global = false;

    foreach ((array)$codes as $code) {
        $norm = strtoupper(trim((string)$code));
        if ($norm === '') {
            continue;
        }

        if (_substitution_is_cashbook_permission($norm)) {
            $has_rights = true;
        }

        if ($norm === 'CASH_BOOK_READ_ALL' || $norm === 'CASH_BOOK_MANAGE') {
            $has_global = true;
            $has_rights = true;
        }
    }

    // Schvalovací oprávnění: role PRIKAZCE nebo ORDER_APPROVE* právo.
    $roles = function_exists('getUserRoles') ? (array)getUserRoles($uid, $pdo) : array();
    $is_prikazce = in_array('PRIKAZCE', (array)$roles, true);
    $has_order_approve = false;
    foreach ((array)$codes as $code) {
        $norm = strtoupper(trim((string)$code));
        if (preg_match('/^ORDER_APPROVE/', $norm)) {
            $has_order_approve = true;
            break;
        }
    }
    $result['has_order_approval_rights'] = ($is_prikazce || $has_order_approve);
    $result['can_order_approve'] = $result['has_order_approval_rights'];
    if ($result['has_order_approval_rights']) {
        $result['order_approve_reason'] = 'OK';
    }

    $result['has_cashbook_rights'] = $has_rights;
    $result['has_global_cashbook_access'] = $has_global;

    if ($has_global) {
        $result['has_cashbook_access'] = true;
        $result['eligible'] = true;
        // Globální přístup implikuje použitelné cashbook oprávnění.
        $result['has_cashbook_rights'] = true;
        $result['reason'] = 'OK';
        return $result;
    }

    try {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*)
             FROM " . TBL_POKLADNY_UZIVATELE . " pu
             WHERE pu.uzivatel_id = :user_id
               AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())"
        );
        $stmt->bindParam(':user_id', $uid, PDO::PARAM_INT);
        $stmt->execute();
        $cnt = (int)$stmt->fetchColumn();
        $result['cashbox_assignment_count'] = $cnt;

        if ($cnt > 0) {
            $result['has_cashbook_access'] = true;
            // Aktivní přiřazení do pokladny bereme jako implicitní způsobilost k přenosu pokladny.
            if (!$result['has_cashbook_rights']) {
                $result['has_cashbook_rights'] = true;
            }
            $result['eligible'] = true;
            $result['reason'] = 'OK';
        } else {
            if (!$has_rights) {
                $result['reason'] = 'Zastupovaný uživatel nemá cashbook oprávnění ani aktivní přiřazení do pokladen.';
            } else {
                $result['reason'] = 'Zastupovaný uživatel nemá aktivní přiřazení do pokladen.';
            }
        }
    } catch (PDOException $e) {
        error_log('_substitution_cashbook_transfer_eligibility DB error: ' . $e->getMessage());
        $result['reason'] = 'Nepodařilo se ověřit přístupy do pokladen.';
    }

    return $result;
}

/**
 * POST substitution/cashbook-transfer-eligibility
 * Vrátí, zda je možné povolit přenos pokladen pro zastupovaného uživatele.
 */
function handle_substitution_cashbook_transfer_eligibility($data, $pdo) {
    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    $target_user_id = (int)$token_data['id'];
    if (!empty($data['zastupovany_id']) && (int)$data['zastupovany_id'] > 0) {
        $requested_id = (int)$data['zastupovany_id'];
        if (!$token_data['is_admin'] && $requested_id !== $target_user_id) {
            return array('status' => 'error', 'message' => 'Nemáte oprávnění ověřovat jiného uživatele');
        }
        $target_user_id = $requested_id;
    }

    try {
        $eligibility = _substitution_cashbook_transfer_eligibility($pdo, $target_user_id);
        return array(
            'status' => 'ok',
            'data' => array_merge($eligibility, array('zastupovany_id' => $target_user_id))
        );
    } catch (Exception $e) {
        error_log('substitution_cashbook_transfer_eligibility error: ' . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při ověřování přenosu pokladen');
    }
}

/**
 * POST substitution/effective-permissions
 * Vrátí efektivní kódy oprávnění převzaté z aktivních zastupování.
 *
 * Cíl: sjednotit FE viditelnost modulů/sekcí mezi menu a route guardy.
 */
function handle_substitution_effective_permissions($data, $pdo) {
    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    if (!isSubstitutionEnabled($pdo)) {
        return array(
            'status' => 'ok',
            'data' => array(
                'permission_codes' => array(),
                'substitutions' => array(),
                'delegation' => array(
                    'has_admin_access' => false,
                    'has_superadmin_access' => false,
                ),
            )
        );
    }

    try {
        TimezoneHelper::setMysqlTimezone($pdo);

        $user_id = (int)$token_data['id'];
        $stmt = $pdo->prepare(
            "SELECT z.id, z.zastupovany_id, z.opravneni, u.username
             FROM " . TBL_UZIVATELE_ZASTUPOVANI . " z
             LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = z.zastupovany_id
             WHERE z.zastupce_id = :zastupce_id
               AND z.aktivni = 1
               AND z.dt_od <= CURDATE()
               AND z.dt_do >= CURDATE()"
        );
        $stmt->bindParam(':zastupce_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();

        $permission_codes = array();
        $substitutions = array();
        $delegation = array(
            'has_admin_access' => false,
            'has_superadmin_access' => false,
        );

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $opravneni = _substitution_decode_opravneni($row['opravneni']);
            $can_view = !empty($opravneni['view']);
            // Nový explicitní check pro přenos viditelnosti modulů.
            // Fallback: staré záznamy bez module_visibility používají hodnotu view.
            $can_module_visibility = array_key_exists('module_visibility', (array)$opravneni)
                ? !empty($opravneni['module_visibility'])
                : $can_view;
            // Nový explicitní check pro přenos pokladny.
            // Fallback kompatibility: staré záznamy bez cashbook_transfer používají module_visibility.
            $can_cashbook_transfer = array_key_exists('cashbook_transfer', (array)$opravneni)
                ? !empty($opravneni['cashbook_transfer'])
                : $can_module_visibility;
            if (!$can_module_visibility) {
                $can_cashbook_transfer = false;
            }
            $can_approve = !empty($opravneni['approve']);
            $can_confirm = !empty($opravneni['confirm']);
            $can_admin = !empty($opravneni['administrator']);
            $can_superadmin = !empty($opravneni['superadmin']);

            if (!$can_view && !$can_module_visibility && !$can_cashbook_transfer && !$can_approve && !$can_confirm && !$can_admin && !$can_superadmin) {
                continue;
            }

            $zastupovany_id = (int)$row['zastupovany_id'];
            $codes_for_user = _substitution_get_permission_codes_for_user($pdo, $zastupovany_id);
            $transferred_codes = array();

            if ($can_superadmin) {
                $delegation['has_superadmin_access'] = true;
                $delegation['has_admin_access'] = true;
                $transferred_codes = $codes_for_user;
            } elseif ($can_admin) {
                $delegation['has_admin_access'] = true;
                $transferred_codes = $codes_for_user;
            } else {
                // Modulová viditelnost přenášej pouze podle view/approve/confirm checků
                $transferred_codes = _substitution_filter_permissions_by_scope(
                    $codes_for_user,
                    $can_module_visibility,
                    $can_approve,
                    $can_confirm,
                    $can_cashbook_transfer
                );
            }

            if (!empty($transferred_codes)) {
                $permission_codes = array_merge($permission_codes, $transferred_codes);
            }

            $substitutions[] = array(
                'id' => (int)$row['id'],
                'zastupovany_id' => $zastupovany_id,
                'zastupovany_username' => $row['username'],
                'opravneni' => $opravneni,
                'permission_codes_count' => count($transferred_codes),
                'delegation' => array(
                    'view' => $can_view,
                    'module_visibility' => $can_module_visibility,
                    'cashbook_transfer' => $can_cashbook_transfer,
                    'approve' => $can_approve,
                    'confirm' => $can_confirm,
                    'administrator' => $can_admin,
                    'superadmin' => $can_superadmin,
                ),
            );
        }

        $permission_codes = array_values(array_unique($permission_codes));

        return array(
            'status' => 'ok',
            'data' => array(
                'permission_codes' => $permission_codes,
                'substitutions' => $substitutions,
                'delegation' => $delegation,
            ),
            'count' => count($permission_codes),
        );
    } catch (PDOException $e) {
        error_log("substitution_effective_permissions DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání efektivních oprávnění zastupování');
    }
}

/**
 * POST substitution/candidates
 * Vrátí seznam uživatelů, kteří mohou být zástupcem dle vazební tabulky možností zastupování.
 * Pro admina je možné poslat zastupovany_id, aby dostal kandidáty pro konkrétního uživatele.
 */
function handle_substitution_candidates($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    try {
        $user_id = (int)$token_data['id'];
        $zastupovany_id = $user_id;

        if ($token_data['is_admin'] && isset($data['zastupovany_id']) && (int)$data['zastupovany_id'] > 0) {
            $zastupovany_id = (int)$data['zastupovany_id'];
        }

        $stmt = $pdo->prepare($queries['substitution_candidates']);
        $stmt->bindParam(':zastupovany_id', $zastupovany_id, PDO::PARAM_INT);
        $stmt->bindParam(':zastupovany_id2', $zastupovany_id, PDO::PARAM_INT);
        $stmt->execute();

        $candidates = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $titul_pred = trim($row['titul_pred'] . ' ');
            $titul_za = trim(' ' . $row['titul_za']);
            $candidates[] = array(
                'id' => (int)$row['id'],
                'username' => $row['username'],
                'jmeno' => $row['jmeno'],
                'prijmeni' => $row['prijmeni'],
                'cele_jmeno' => trim($titul_pred . $row['jmeno'] . ' ' . $row['prijmeni'] . $titul_za),
                'email' => $row['email'],
                'active_substitutions_count' => (int)$row['active_substitutions_count']
            );
        }

        return array('status' => 'ok', 'data' => $candidates, 'count' => count($candidates));

    } catch (PDOException $e) {
        error_log("substitution_candidates DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání kandidátů na zástupce');
    }
}

/**
 * POST substitution/admin-list
 * Admin/Superadmin – seznam všech zastupování v systému
 */
function handle_substitution_admin_list($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    // Read-only přehled – přístupný každému přihlášenému uživateli.
    // Citlivá pole (e-mail, telefon) jsou vracena pouze adminům.
    $is_admin = !empty($token_data['is_admin']);

    try {
        TimezoneHelper::setMysqlTimezone($pdo);
        $stmt = $pdo->query($queries['substitution_get_all']);

        $rows = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $opravneni = is_string($row['opravneni']) ? json_decode($row['opravneni'], true) : $row['opravneni'];
            $rows[] = array(
                'id'                    => (int)$row['id'],
                'zastupovany_id'        => (int)$row['zastupovany_id'],
                'zastupce_id'           => (int)$row['zastupce_id'],
                'vytvoril_user_id'      => (int)$row['vytvoril_user_id'],
                'dt_od'                 => $row['dt_od'],
                'dt_do'                 => $row['dt_do'],
                'opravneni'             => $opravneni,
                'popis'                 => $row['popis'],
                'aktivni'               => (bool)$row['aktivni'],
                'dt_vytvoreni'          => $row['dt_vytvoreni'],
                'dt_ukonceni'           => $row['dt_ukonceni'] ?? null,
                'zastupovany_username'  => $row['zastupovany_username'],
                'zastupovany_jmeno'     => trim($row['zastupovany_jmeno'] . ' ' . $row['zastupovany_prijmeni']),
                'zastupovany_email'     => $is_admin ? ($row['zastupovany_email'] ?? '') : '',
                'zastupovany_telefon'   => $is_admin ? ($row['zastupovany_telefon'] ?? '') : '',
                'zastupce_username'     => $row['zastupce_username'],
                'zastupce_jmeno'        => trim($row['zastupce_jmeno'] . ' ' . $row['zastupce_prijmeni']),
                'zastupce_email'        => $is_admin ? ($row['zastupce_email'] ?? '') : '',
                'zastupce_telefon'      => $is_admin ? ($row['zastupce_telefon'] ?? '') : '',
                'vytvoril_username'     => $is_admin ? $row['vytvoril_username'] : '',
                'vytvoril_jmeno'        => $is_admin ? trim($row['vytvoril_jmeno'] . ' ' . $row['vytvoril_prijmeni']) : '',
            );
        }

        return array('status' => 'ok', 'data' => $rows, 'count' => count($rows));

    } catch (PDOException $e) {
        error_log("substitution_admin_list DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání přehledu zastupování');
    }
}

function _substitution_audit_action_label($akce_typ) {
    $map = array(
        'APPROVE' => 'Schválení',
        'CONFIRM' => 'Potvrzení',
        'UPDATE' => 'Úprava',
        'CREATE' => 'Vytvoření',
        'CANCEL' => 'Storno',
        'REJECT' => 'Zamítnutí',
        'DELETE' => 'Smazání',
        'VIEW' => 'Zobrazení',
    );
    $key = strtoupper(trim((string)$akce_typ));
    return isset($map[$key]) ? $map[$key] : ($key ?: 'Akce');
}

function _substitution_audit_object_label($objekt_typ) {
    $map = array(
        'OBJEDNAVKA' => 'Objednávka',
        'FAKTURA' => 'Faktura',
        'SMLOUVA' => 'Smlouva',
        'LP' => 'Limitovaný příslib',
    );
    $key = strtoupper(trim((string)$objekt_typ));
    return isset($map[$key]) ? $map[$key] : ($key ?: 'Objekt');
}

function _substitution_audit_object_reference_from_row($row) {
    $objekt_typ = strtoupper(trim((string)($row['objekt_typ'] ?? '')));
    if ($objekt_typ === 'OBJEDNAVKA' && !empty($row['objekt_cislo_objednavky'])) {
        return (string)$row['objekt_cislo_objednavky'];
    }
    if ($objekt_typ === 'FAKTURA' && !empty($row['objekt_faktura_vs'])) {
        return (string)$row['objekt_faktura_vs'];
    }
    return null;
}

function _substitution_audit_object_identifier($objekt_typ, $objekt_reference, $objekt_id) {
    $typ = strtoupper(trim((string)$objekt_typ));
    if (!empty($objekt_reference)) {
        if ($typ === 'FAKTURA') {
            return 'VS ' . $objekt_reference;
        }
        return (string)$objekt_reference;
    }
    if ($objekt_id !== null && $objekt_id !== '') {
        return '#' . (int)$objekt_id;
    }
    return '—';
}

function _substitution_audit_is_technical_description($popis_akce) {
    $popis = trim((string)$popis_akce);
    if ($popis === '') {
        return true;
    }

    if (preg_match('/uzivatele\s+ID\s+\d+/iu', $popis)) {
        return true;
    }

    if (preg_match('/^(APPROVE|CONFIRM|UPDATE|CREATE|CANCEL|REJECT|DELETE|VIEW)\b/i', $popis)) {
        return true;
    }

    return false;
}

function _substitution_get_user_display_name_by_id($pdo, $user_id) {
    try {
        $stmt = $pdo->prepare("SELECT titul_pred, jmeno, prijmeni, titul_za, username FROM " . TBL_UZIVATELE . " WHERE id = ? LIMIT 1");
        $stmt->execute(array((int)$user_id));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return 'uživatel #' . (int)$user_id;
        }

        $full = trim((string)($row['titul_pred'] ?? '') . ' ' . (string)($row['jmeno'] ?? '') . ' ' . (string)($row['prijmeni'] ?? '') . ' ' . (string)($row['titul_za'] ?? ''));
        if ($full === '') {
            $full = 'uživatel #' . (int)$user_id;
        }

        $username = trim((string)($row['username'] ?? ''));
        if ($username !== '') {
            $full .= ' (' . $username . ')';
        }

        return $full;
    } catch (Exception $e) {
        return 'uživatel #' . (int)$user_id;
    }
}

function _substitution_get_object_reference($pdo, $objekt_typ, $objekt_id) {
    $typ = strtoupper(trim((string)$objekt_typ));
    $id = (int)$objekt_id;
    if ($id <= 0) {
        return null;
    }

    try {
        if ($typ === 'OBJEDNAVKA') {
            $stmt = $pdo->prepare("SELECT cislo_objednavky FROM " . TBL_OBJEDNAVKY . " WHERE id = ? LIMIT 1");
            $stmt->execute(array($id));
            $value = $stmt->fetchColumn();
            return $value ? (string)$value : null;
        }

        if ($typ === 'FAKTURA') {
            $stmt = $pdo->prepare("SELECT fa_cislo_vema FROM " . TBL_FAKTURY . " WHERE id = ? LIMIT 1");
            $stmt->execute(array($id));
            $value = $stmt->fetchColumn();
            return $value ? (string)$value : null;
        }
    } catch (Exception $e) {
        return null;
    }

    return null;
}

function _substitution_build_human_description($akce_typ, $objekt_typ, $objekt_id, $objekt_reference, $zastupce_name, $zastupovany_name) {
    $akce_label = _substitution_audit_action_label($akce_typ);
    $objekt_label = _substitution_audit_object_label($objekt_typ);
    $objekt_identifikator = _substitution_audit_object_identifier($objekt_typ, $objekt_reference, $objekt_id);

    return $akce_label . ': ' . $objekt_label . ' ' . $objekt_identifikator . ' provedl ' . $zastupce_name . ' v zastoupení za ' . $zastupovany_name . '.';
}

/**
 * POST substitution/audit-log
 * Admin/Superadmin – stránkovaný audit log akcí v zastoupení
 */
function handle_substitution_audit_log($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    if (!$token_data['is_admin']) {
        return array('status' => 'error', 'message' => 'Přístup zamítnut – pouze administrátor');
    }

    $page = isset($data['page']) ? (int)$data['page'] : 1;
    $per_page = isset($data['per_page']) ? (int)$data['per_page'] : 25;

    if ($page < 1) {
        $page = 1;
    }
    if ($per_page < 1) {
        $per_page = 25;
    }
    if ($per_page > 200) {
        $per_page = 200;
    }

    $offset = ($page - 1) * $per_page;

    try {
        TimezoneHelper::setMysqlTimezone($pdo);

        $stmt_count = $pdo->query($queries['substitution_audit_log_count']);
        $total_count = (int)$stmt_count->fetchColumn();
        $total_pages = $total_count > 0 ? (int)ceil($total_count / $per_page) : 0;

        $stmt = $pdo->prepare($queries['substitution_audit_log_list']);
        $stmt->bindValue(':limit', $per_page, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $akce_typ_kod = strtoupper(trim((string)$row['akce_typ']));
            $objekt_typ_kod = strtoupper(trim((string)$row['objekt_typ']));

            $zastupce_jmeno = trim(($row['zastupce_jmeno'] ?? '') . ' ' . ($row['zastupce_prijmeni'] ?? ''));
            $zastupovany_jmeno = trim(($row['zastupovany_jmeno'] ?? '') . ' ' . ($row['zastupovany_prijmeni'] ?? ''));
            if ($zastupce_jmeno === '') {
                $zastupce_jmeno = 'uživatel #' . (int)$row['zastupce_id'];
            }
            if ($zastupovany_jmeno === '') {
                $zastupovany_jmeno = 'uživatel #' . (int)$row['zastupovany_id'];
            }

            $objekt_reference = _substitution_audit_object_reference_from_row($row);
            $objekt_identifikator = _substitution_audit_object_identifier($objekt_typ_kod, $objekt_reference, $row['objekt_id'] ?? null);

            $popis_raw = (string)($row['popis_akce'] ?? '');
            $popis_human = _substitution_audit_is_technical_description($popis_raw)
                ? _substitution_build_human_description($akce_typ_kod, $objekt_typ_kod, $row['objekt_id'] ?? null, $objekt_reference, $zastupce_jmeno, $zastupovany_jmeno)
                : $popis_raw;

            $rows[] = array(
                'id' => (int)$row['id'],
                'zastupovani_id' => (int)$row['zastupovani_id'],
                'zastupce_id' => (int)$row['zastupce_id'],
                'zastupovany_id' => (int)$row['zastupovany_id'],
                'akce_typ_kod' => $akce_typ_kod,
                'akce_typ' => _substitution_audit_action_label($akce_typ_kod),
                'objekt_typ_kod' => $objekt_typ_kod,
                'objekt_typ' => _substitution_audit_object_label($objekt_typ_kod),
                'objekt_id' => isset($row['objekt_id']) ? (int)$row['objekt_id'] : null,
                'objekt_identifikator' => $objekt_identifikator,
                'objekt_reference' => $objekt_reference,
                'popis_akce_raw' => $popis_raw,
                'popis_akce' => $popis_human,
                'dt_akce' => $row['dt_akce'],
                'zastupce_username' => $row['zastupce_username'] ?? null,
                'zastupce_jmeno' => $zastupce_jmeno,
                'zastupovany_username' => $row['zastupovany_username'] ?? null,
                'zastupovany_jmeno' => $zastupovany_jmeno,
            );
        }

        return array(
            'status' => 'ok',
            'data' => $rows,
            'count' => count($rows),
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total_count,
                'total_pages' => $total_pages,
            ),
        );

    } catch (PDOException $e) {
        error_log('substitution_audit_log DB error: ' . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání auditního logu zastupování');
    }
}

/**
 * POST substitution/manageable-users
 * Admin – seznam uživatelů, za které může admin nastavit zastupování
 */
function handle_substitution_manageable_users($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    if (!$token_data['is_admin']) {
        return array('status' => 'error', 'message' => 'Přístup zamítnut – pouze administrátor');
    }

    try {
        $current_user_id = (int)$token_data['id'];
        $stmt = $pdo->prepare($queries['substitution_manageable_users']);
        $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();

        $users = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $titul_pred = trim($row['titul_pred'] . ' ');
            $titul_za   = trim(' ' . $row['titul_za']);
            $users[] = array(
                'id'         => (int)$row['id'],
                'username'   => $row['username'],
                'jmeno'      => $row['jmeno'],
                'prijmeni'   => $row['prijmeni'],
                'cele_jmeno' => trim($titul_pred . $row['jmeno'] . ' ' . $row['prijmeni'] . $titul_za),
                'email'      => $row['email'],
            );
        }

        return array('status' => 'ok', 'data' => $users, 'count' => count($users));

    } catch (PDOException $e) {
        error_log("substitution_manageable_users DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání spravovatelných uživatelů');
    }
}

/**
 * POST substitution/all-users-for-admin
 * Admin – seznam VŠECH aktivních uživatelů pro konfiguraci "Možnosti zastupování"
 * (bez filtrů na práva - admini definují kdo může koho zastupovat)
 */
function handle_substitution_all_users_for_admin($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    if (!$token_data['is_admin']) {
        return array('status' => 'error', 'message' => 'Přístup zamítnut – pouze administrátor');
    }

    try {
        $stmt = $pdo->prepare($queries['substitution_all_users_for_admin']);
        $stmt->execute();

        $users = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $titul_pred = trim($row['titul_pred'] . ' ');
            $titul_za   = trim(' ' . $row['titul_za']);
            $users[] = array(
                'id'         => (int)$row['id'],
                'username'   => $row['username'],
                'jmeno'      => $row['jmeno'],
                'prijmeni'   => $row['prijmeni'],
                'cele_jmeno' => trim($titul_pred . $row['jmeno'] . ' ' . $row['prijmeni'] . $titul_za),
                'email'      => $row['email'],
            );
        }

        return array('status' => 'ok', 'data' => $users, 'count' => count($users));

    } catch (PDOException $e) {
        error_log("substitution_all_users_for_admin DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání všech uživatelů');
    }
}

/**
 * Helper: založí záznam do audit logu zastupování
 */
function log_zastupovani_akce($pdo, $zastupovani_id, $zastupce_id, $zastupovany_id, $akce_typ, $objekt_typ, $objekt_id, $popis_akce = null) {
    global $queries;
    try {
        $stmt = $pdo->prepare($queries['substitution_log_action']);
        $stmt->bindParam(':zastupovani_id', $zastupovani_id, PDO::PARAM_INT);
        $stmt->bindParam(':zastupce_id',    $zastupce_id,    PDO::PARAM_INT);
        $stmt->bindParam(':zastupovany_id', $zastupovany_id, PDO::PARAM_INT);
        $stmt->bindParam(':akce_typ',       $akce_typ);
        $stmt->bindParam(':objekt_typ',     $objekt_typ);
        $stmt->bindParam(':objekt_id',      $objekt_id,      PDO::PARAM_INT);
        $stmt->bindParam(':popis_akce',     $popis_akce);
        $stmt->execute();
        return true;
    } catch (PDOException $e) {
        error_log("log_zastupovani_akce DB error: " . $e->getMessage() . " | zastupovani_id=$zastupovani_id akce=$akce_typ");
        return false;
    }
}

// ============ SYSTÉMOVÉ NASTAVENÍ ZASTUPOVÁNÍ ============

/**
 * Zkontroluje, zda je funkce zastupování globálně aktivní v systému
 * Kontroluje nastavení v tabulce 25a_nastaveni_globalni (klic: 'substitution_enabled')
 * 
 * @param PDO $pdo Database connection
 * @return bool TRUE pokud je zastupování zapnuté, FALSE pokud vypnuté nebo nenalezeno
 */
function isSubstitutionEnabled($pdo) {
    try {
        // Zkusit načíst nastavení z 25a_nastaveni_globalni
        $stmt = $pdo->prepare("
            SELECT hodnota 
            FROM " . TBL_NASTAVENI_GLOBALNI . " 
            WHERE klic = 'substitution_enabled'
            LIMIT 1
        ");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $enabled = (int)$row['hodnota'] === 1;
            error_log("🔍 SUBSTITUTION: System setting loaded - substitution_enabled = " . ($enabled ? 'YES' : 'NO'));
            return $enabled;
        }
        
        // Pokud záznam neexistuje → DEFAULTNĚ VYPNUTO (bezpečná varianta)
        error_log("⚠️ SUBSTITUTION: Setting 'substitution_enabled' not found in DB - defaulting to DISABLED");
        return false;
        
    } catch (PDOException $e) {
        error_log("❌ SUBSTITUTION: Error checking system setting: " . $e->getMessage());
        // V případě chyby → VYPNUTO (fail-safe)
        return false;
    }
}

// ============ HELPER FUNKCE PRO ROZŠÍŘENÍ PRÁV ============

/**
 * Zjistí všechna user_id která má uživatel vidět (vlastní + zastupovaní).
 * Používá se pro rozšíření viditelnosti dat v dashboardu a endpointech.
 * 
 * ⚠️ KONTROLUJE APP SETTING: Pokud je zastupování vypnuto → vrací pouze vlastní ID.
 * 
 * Podporuje SCOPE systém:
 * - view_scope = "own" (výchozí) → zástupce vidí jen záznamy kde je zastupovaný účastníkem
 * - view_scope = "inherit" → zástupce ZDĚDÍ kompletní přístupovou úroveň zastupovaného
 *   (pokud je zastupovaný admin → zástupce vidí VŠE, pokud má _SUBORDINATE → vidí i podřízené)
 * 
 * @param PDO $pdo PDO instance
 * @param int $user_id ID přihlášeného uživatele
 * @param array $required_permissions Jaká oprávnění musí být v zastupování (např. ['view'])
 * @param array|null &$scope_info Volitelný výstupní parametr s rozšířenými info o scope
 * @return array Pole user_id (vždy obsahuje minimálně vlastní ID)
 */
function get_user_ids_with_substitution($pdo, $user_id, $required_permissions = ['view'], &$scope_info = null) {
    $user_ids = [(int)$user_id]; // Vždy vlastní ID
    
    // Inicializace scope_info
    $scope_info = [
        'has_inherit_full_access' => false,
        'inherit_subordinate_ids' => [],
    ];
    
    // ⚠️ KONTROLA APP SETTING - pokud je zastupování vypnuto → vrátit pouze vlastní ID
    if (!isSubstitutionEnabled($pdo)) {
        error_log("🔍 SUBSTITUTION: System disabled → returning only own user_id=$user_id");
        return $user_ids;
    }
    
    try {
        // Kontrola aktivního zastupování (dnes platné)
        $stmt = $pdo->prepare("
            SELECT DISTINCT z.zastupovany_id, z.opravneni
            FROM " . TBL_UZIVATELE_ZASTUPOVANI . " z
            WHERE z.zastupce_id = :user_id
              AND z.aktivni = 1
              AND z.dt_od <= CURDATE()
              AND z.dt_do >= CURDATE()
        ");
        $stmt->execute([':user_id' => $user_id]);
        
        $count_substitutions = 0;
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Dekódování oprávnění z JSON
            $opravneni = json_decode($row['opravneni'], true);
            if (!is_array($opravneni)) {
                continue; // Pokud JSON je neplatný, přeskočit
            }
            
            // Kontrola požadovaných oprávnění
            $has_all_required = true;
            foreach ($required_permissions as $perm) {
                if (empty($opravneni[$perm])) {
                    $has_all_required = false;
                    break;
                }
            }
            
            if (!$has_all_required) {
                continue;
            }
            
            $zastupovany_id = (int)$row['zastupovany_id'];
            $user_ids[] = $zastupovany_id;
            $count_substitutions++;
            
            // === SCOPE SYSTÉM ===
            // Určení scope klíče podle požadovaného oprávnění
            $scope_key = 'view_scope'; // default
            if (in_array('approve', $required_permissions)) {
                $scope_key = 'approve_scope';
            }
            $scope = $opravneni[$scope_key] ?? 'own';
            
            error_log("🔍 SUBSTITUTION: User $user_id zastupuje user $zastupovany_id, scope=$scope (key=$scope_key)");
            
            if ($scope === 'inherit') {
                // INHERIT: Zdědí kompletní přístupovou úroveň zastupovaného uživatele
                error_log("🔍 SUBSTITUTION INHERIT: Načítám oprávnění zastupovaného uživatele $zastupovany_id");
                
                // Načti role zastupovaného
                $sub_roles = function_exists('getUserRoles') ? getUserRoles($zastupovany_id, $pdo) : [];
                $sub_permissions = function_exists('getUserOrderPermissions') ? getUserOrderPermissions($zastupovany_id, $pdo) : [];
                
                error_log("🔍 SUBSTITUTION INHERIT: User $zastupovany_id roles=" . implode(',', $sub_roles) . " perms=" . implode(',', $sub_permissions));
                
                // Kontrola admin přístupu zastupovaného
                $isSubAdmin = in_array('SUPERADMIN', $sub_roles) || in_array('ADMINISTRATOR', $sub_roles);
                $hasSubReadAll = in_array('ORDER_READ_ALL', $sub_permissions) || in_array('ORDER_VIEW_ALL', $sub_permissions);
                
                if ($isSubAdmin || $hasSubReadAll) {
                    $scope_info['has_inherit_full_access'] = true;
                    error_log("✅ SUBSTITUTION INHERIT: Zastupovaný user $zastupovany_id je ADMIN → zástupce $user_id získává PLNÝ PŘÍSTUP");
                }
                
                // Kontrola subordinate přístupu zastupovaného
                $hasSubReadSubordinate = in_array('ORDER_READ_SUBORDINATE', $sub_permissions) || in_array('ORDER_EDIT_SUBORDINATE', $sub_permissions);
                if ($hasSubReadSubordinate && function_exists('getUserDepartmentColleagueIds')) {
                    $sub_colleagues = getUserDepartmentColleagueIds($zastupovany_id, $pdo);
                    if (!empty($sub_colleagues)) {
                        $scope_info['inherit_subordinate_ids'] = array_merge(
                            $scope_info['inherit_subordinate_ids'],
                            array_map('intval', $sub_colleagues)
                        );
                        error_log("✅ SUBSTITUTION INHERIT: Přidáno " . count($sub_colleagues) . " podřízených uživatele $zastupovany_id");
                    }
                }
            } else {
                error_log("🔍 SUBSTITUTION OWN: User $user_id vidí jen záznamy uživatele $zastupovany_id (scope=own)");
            }
        }
        
        // Deduplikace inherit_subordinate_ids
        if (!empty($scope_info['inherit_subordinate_ids'])) {
            $scope_info['inherit_subordinate_ids'] = array_values(array_unique($scope_info['inherit_subordinate_ids']));
        }
        
        if ($count_substitutions > 0) {
            error_log("✅ SUBSTITUTION: User $user_id má rozšířenou viditelnost na " . count($user_ids) . " uživatelů (vlastní + $count_substitutions zastupovaných)" .
                ($scope_info['has_inherit_full_access'] ? ' [INHERIT FULL ACCESS]' : '') .
                (!empty($scope_info['inherit_subordinate_ids']) ? ' [+' . count($scope_info['inherit_subordinate_ids']) . ' subordinates]' : ''));
        } else {
            error_log("🔍 SUBSTITUTION: User $user_id nemá žádné aktivní zastupování s požadovanými oprávněními");
        }
        
        return array_unique($user_ids);
        
    } catch (PDOException $e) {
        error_log("❌ SUBSTITUTION: Chyba při načítání zastupování: " . $e->getMessage());
        // V případě chyby vrátit pouze vlastní ID (fail-safe)
        $scope_info = ['has_inherit_full_access' => false, 'inherit_subordinate_ids' => []];
        return [(int)$user_id];
    }
}

/**
 * Zjistí zda uživatel někoho aktivně zastupuje (s konkrétním oprávněním).
 * Vrací info o zastupování včetně oprávnění.
 * Používá se při akcích (schvalování, potvrzování) pro detekci a logování.
 * 
 * ⚠️ KONTROLUJE APP SETTING: Pokud je zastupování vypnuto → vrací NULL.
 * 
 * @param PDO $pdo PDO instance
 * @param int $zastupce_id ID zástupce (přihlášený user)
 * @param string $required_permission Požadované oprávnění (view, approve, confirm...)
 * @return array|null Pole s info [zastupovani_id, zastupovany_id, opravneni] nebo NULL
 */
function get_active_substitution_for_action($pdo, $zastupce_id, $required_permission = 'approve', $target_zastupovany_id = null) {
    // ⚠️ KONTROLA APP SETTING - pokud je zastupování vypnuto → vrátit NULL
    if (!isSubstitutionEnabled($pdo)) {
        return null;
    }
    
    try {
                $sql = "
                        SELECT z.id, z.zastupovany_id, z.opravneni
                        FROM " . TBL_UZIVATELE_ZASTUPOVANI . " z
                        WHERE z.zastupce_id = :zastupce_id
                            AND z.aktivni = 1
                            AND z.dt_od <= CURDATE()
                            AND z.dt_do >= CURDATE()";

                $params = [':zastupce_id' => $zastupce_id];

                if ($target_zastupovany_id !== null && (int)$target_zastupovany_id > 0) {
                        $sql .= " AND z.zastupovany_id = :target_zastupovany_id";
                        $params[':target_zastupovany_id'] = (int)$target_zastupovany_id;
                }

                $sql .= " LIMIT 1";

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            return null; // Neexistuje aktivní zastupování
        }
        
        $opravneni = json_decode($row['opravneni'], true);
        if (!is_array($opravneni) || empty($opravneni[$required_permission])) {
            error_log("🔍 SUBSTITUTION: User $zastupce_id zastupuje, ale NEMÁ oprávnění '$required_permission'" .
                (($target_zastupovany_id !== null) ? " pro user " . (int)$target_zastupovany_id : ""));
            return null; // Nemá požadované oprávnění
        }
        
        error_log("✅ SUBSTITUTION: User $zastupce_id aktivně zastupuje user " . $row['zastupovany_id'] . " s oprávněním '$required_permission'");
        
        return [
            'zastupovani_id' => (int)$row['id'],
            'zastupovany_id' => (int)$row['zastupovany_id'],
            'opravneni' => $opravneni
        ];
        
    } catch (PDOException $e) {
        error_log("❌ SUBSTITUTION: Chyba při kontrole aktivního zastupování: " . $e->getMessage());
        return null;
    }
}

/**
 * Zapíše audit log akce provedené v zastoupení.
 * Tabulka: 25_zastupovani_akce_log
 * 
 * @param PDO $pdo PDO instance
 * @param int $zastupovani_id ID záznamu zastupování
 * @param int $zastupce_id ID zástupce (kdo akci provedl)
 * @param int $zastupovany_id ID zastupovaného (v čí prospěch)
 * @param string $akce_typ Typ akce (APPROVE, CONFIRM, REJECT, VIEW, EDIT...)
 * @param string $objekt_typ Typ objektu (OBJEDNAVKA, FAKTURA, SMLOUVA...)
 * @param int|null $objekt_id ID objektu (číslo objednávky, faktury apod.)
 * @param string $popis_akce Textový popis akce
 * @return bool Úspěch zápisu
 */
function log_substitution_action($pdo, $zastupovani_id, $zastupce_id, $zastupovany_id, $akce_typ, $objekt_typ, $objekt_id = null, $popis_akce = '') {
    try {
        $objekt_reference = _substitution_get_object_reference($pdo, $objekt_typ, $objekt_id);
        $zastupce_name = _substitution_get_user_display_name_by_id($pdo, $zastupce_id);
        $zastupovany_name = _substitution_get_user_display_name_by_id($pdo, $zastupovany_id);

        $final_popis = trim((string)$popis_akce);
        if (_substitution_audit_is_technical_description($final_popis)) {
            $final_popis = _substitution_build_human_description(
                $akce_typ,
                $objekt_typ,
                $objekt_id,
                $objekt_reference,
                $zastupce_name,
                $zastupovany_name
            );
        }

        $stmt = $pdo->prepare("
            INSERT INTO `" . TBL_ZASTUPOVANI_AKCE_LOG . "` 
            (zastupovani_id, zastupce_id, zastupovany_id, akce_typ, objekt_typ, objekt_id, popis_akce, dt_akce)
            VALUES (:zast_id, :zastupce, :zastupovany, :akce, :objekt, :objekt_id, :popis, NOW())
        ");
        $stmt->execute([
            ':zast_id' => $zastupovani_id,
            ':zastupce' => $zastupce_id,
            ':zastupovany' => $zastupovany_id,
            ':akce' => $akce_typ,
            ':objekt' => $objekt_typ,
            ':objekt_id' => $objekt_id,
            ':popis' => $final_popis
        ]);
        
        error_log("📝 SUBSTITUTION AUDIT: $akce_typ on $objekt_typ #$objekt_id by user $zastupce_id (v zastoupení user $zastupovany_id)");
        return true;
        
    } catch (PDOException $e) {
        error_log("❌ SUBSTITUTION AUDIT ERROR: " . $e->getMessage());
        return false;
    }
}

/**
 * WRAPPER: Detekce a logování akcí v zastoupení
 * Používá se v handler funkcích (orders, invoices) pro automatické logování akcí
 * 
 * PŘÍKLAD POUŽITÍ v orderHandlers.php:
 * ```php
 * $token_data = verify_token($token);
 * check_and_log_substitution_action($db, $token_data, 'UPDATE', 'OBJEDNAVKA', $order_id, "Úprava objednávky");
 * ```
 * 
 * @param PDO $pdo PDO instance
 * @param array $token_data Data z verify_token() - musí obsahovat 'id' (user_id)
 * @param string $akce_typ Typ akce (CREATE, UPDATE, DELETE, APPROVE, CONFIRM, REJECT, VIEW...)
 * @param string $objekt_typ Typ objektu (OBJEDNAVKA, FAKTURA, SMLOUVA, LP...)
 * @param int|null $objekt_id ID objektu (číslo objednávky, faktury apod.)
 * @param string $popis_akce Textový popis akce
 * @return bool TRUE pokud byla akce v zastoupení (logováno), FALSE pokud uživatel jednal sám
 */
function check_and_log_substitution_action($pdo, $token_data, $akce_typ, $objekt_typ, $objekt_id = null, $popis_akce = '') {
    if (!$pdo || !$token_data || empty($token_data['id'])) {
        return false; // Chybí data
    }
    
    $zastupce_id = (int)$token_data['id'];
    
    // Detekce aktivního zastupování s oprávněním 'approve' (používá se v akcích)
    $substitution = get_active_substitution_for_action($pdo, $zastupce_id, 'approve');
    
    if (!$substitution) {
        // Žádné aktivní zastupování → uživatel jedná sám
        return false;
    }
    
    // Zastupování je aktivní → loguj akci
    $zastupovani_id = $substitution['zastupovani_id'];
    $zastupovany_id = $substitution['zastupovany_id'];
    
    $logged = log_substitution_action(
        $pdo,
        $zastupovani_id,
        $zastupce_id,
        $zastupovany_id,
        $akce_typ,
        $objekt_typ,
        $objekt_id,
        $popis_akce
    );
    
    return $logged;
}

// ============ MOŽNOSTI ZASTUPOVÁNÍ (VAZEBNÍ TABULKA) ============

/**
 * POST moznosti-zastupovani/list
 * Načtení seznamu možností zastupování pro uživatele
 */
function handle_moznosti_zastupovani_list($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    $zastupovany_id = isset($data['zastupovany_id']) ? (int)$data['zastupovany_id'] : 0;
    $current_user_id = (int)$token_data['id'];

    // Validace: uživatel může načíst pouze své vlastní nebo musí být admin
    if ($zastupovany_id !== $current_user_id && !$token_data['is_admin']) {
        return array('status' => 'error', 'message' => 'Přístup zamítnut - můžete načíst pouze své vlastní možnosti');
    }

    // Pokud není specifikováno zastupovany_id, načti pro current user
    if ($zastupovany_id === 0) {
        $zastupovany_id = $current_user_id;
    }

    try {
        $stmt = $pdo->prepare($queries['moznosti_zastupovani_list']);
        $stmt->bindParam(':zastupovany_id', $zastupovany_id, PDO::PARAM_INT);
        $stmt->execute();

        $rules = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $is_global_all_users = (int)($row['global_all_users'] ?? 0) === 1;
            $rule = array(
                'id' => (int)$row['id'],
                'zastupovany_id' => (int)$row['zastupovany_id'],
                'typ_zastupce' => $row['typ_zastupce'],
                'poznamka' => (string)($row['poznamka'] ?? ''),
                'global_all_users' => $is_global_all_users,
                'aktivni' => (int)$row['aktivni'],
                'dt_vytvoreni' => $row['dt_vytvoreni'],
                'dt_aktualizace' => $row['dt_aktualizace'],
            );

            // Přidání detailů podle typu
            switch ($row['typ_zastupce']) {
                case 'user':
                    $rule['zastupce_user_id'] = (int)$row['zastupce_user_id'];
                    $rule['zastupce_display'] = trim($row['zastupce_user_jmeno'] . ' ' . $row['zastupce_user_prijmeni']) . ' (' . $row['zastupce_user_username'] . ')';
                    break;
                case 'role':
                    $rule['zastupce_role_id'] = $row['zastupce_role_id'] ? (int)$row['zastupce_role_id'] : null;
                    $rule['zastupce_display'] = $row['zastupce_role_id']
                        ? ($row['zastupce_role_nazev'] . ' (' . $row['zastupce_role_kod'] . ')')
                        : 'Všichni uživatelé';
                    break;
                case 'usek':
                    $rule['zastupce_usek_id'] = (int)$row['zastupce_usek_id'];
                    $rule['zastupce_display'] = $row['zastupce_usek_nazev'] . ' (' . $row['zastupce_usek_zkr'] . ')';
                    break;
                case 'lokalita':
                    $rule['zastupce_lokalita_id'] = (int)$row['zastupce_lokalita_id'];
                    $rule['zastupce_display'] = $row['zastupce_lokalita_nazev'] . ' (' . $row['zastupce_lokalita_kod'] . ')';
                    break;
            }

            $rules[] = $rule;
        }

        return array('status' => 'ok', 'data' => $rules, 'count' => count($rules));

    } catch (PDOException $e) {
        error_log("moznosti_zastupovani_list DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání možností zastupování');
    }
}

/**
 * POST moznosti-zastupovani/create
 * Vytvoření nové možnosti zastupování
 */
function handle_moznosti_zastupovani_create($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    // Pouze admin může vytvářet pravidla
    if (!$token_data['is_admin']) {
        return array('status' => 'error', 'message' => 'Přístup zamítnut – pouze administrátor');
    }

    $zastupovany_id = isset($data['zastupovany_id']) ? (int)$data['zastupovany_id'] : 0;
    $typ_zastupce = isset($data['typ_zastupce']) ? trim($data['typ_zastupce']) : '';
    // Prázdný string, null, 0, nebo "0" se konvertuje na NULL pro skupiny
    $zastupce_user_id = !empty($data['zastupce_user_id']) ? (int)$data['zastupce_user_id'] : null;
    $zastupce_role_id = !empty($data['zastupce_role_id']) ? (int)$data['zastupce_role_id'] : null;
    $zastupce_usek_id = !empty($data['zastupce_usek_id']) ? (int)$data['zastupce_usek_id'] : null;
    $zastupce_lokalita_id = !empty($data['zastupce_lokalita_id']) ? (int)$data['zastupce_lokalita_id'] : null;
    $poznamka = isset($data['poznamka']) ? trim($data['poznamka']) : '';

    $vytvoril_user_id = (int)$token_data['id'];
    $is_global_all_users = ($zastupovany_id === 0);
    $global_all_users = $is_global_all_users ? 1 : 0;

    // Alias "all" -> globální pravidlo (bez konkrétní skupiny)
    if ($typ_zastupce === 'all') {
        $typ_zastupce = 'role';
        $zastupce_user_id = null;
        $zastupce_role_id = null;
        $zastupce_usek_id = null;
        $zastupce_lokalita_id = null;
    }

    // Validace
    if ($zastupovany_id < 0) {
        return array('status' => 'error', 'message' => 'Neplatné zastupovany_id');
    }

    if (!in_array($typ_zastupce, ['user', 'role', 'usek', 'lokalita'])) {
        return array('status' => 'error', 'message' => 'Neplatný typ_zastupce');
    }
    // Pro globální pravidlo je povolena pouze role/usek/lokalita/all
    if ($is_global_all_users && $typ_zastupce === 'user') {
        return array('status' => 'error', 'message' => 'Globální pravidlo nelze nastavit pro konkrétního uživatele');
    }

    // Kontrola, že odpovídající ID je vyplněné/správné
    $valid_target = false;
    // Pro 'user' musí být konkrétní ID > 0
    if ($typ_zastupce === 'user' && $zastupce_user_id > 0) {
        $valid_target = true;
    }
    // Pro skupiny (role, usek, lokalita) je OK i NULL (znamená "Všechny")
    elseif (in_array($typ_zastupce, ['role', 'usek', 'lokalita'])) {
        $valid_target = true;
    }

    if (!$valid_target) {
        return array('status' => 'error', 'message' => 'Pro uživatele musí být vybrán konkrétní zástupce');
    }

    try {
        if ($is_global_all_users) {
            // Globální pravidlo ukládáme jako 1 řádek s validním FK.
            // FK proto míří na uživatele, který pravidlo vytvořil.
            $stmt_dup = $pdo->prepare("\n                SELECT COUNT(*) as cnt\n                FROM " . TBL_MOZNOSTI_ZASTUPOVANI . "\n                WHERE aktivni = 1\n                  AND global_all_users = 1\n                  AND typ_zastupce = :typ_zastupce\n                  AND (\n                    (typ_zastupce = 'user' AND zastupce_user_id = :zastupce_user_id) OR\n                    (typ_zastupce = 'role' AND ((:zastupce_role_id IS NULL AND zastupce_role_id IS NULL) OR (:zastupce_role_id IS NOT NULL AND zastupce_role_id = :zastupce_role_id))) OR\n                    (typ_zastupce = 'usek' AND ((:zastupce_usek_id IS NULL AND zastupce_usek_id IS NULL) OR (:zastupce_usek_id IS NOT NULL AND zastupce_usek_id = :zastupce_usek_id))) OR\n                    (typ_zastupce = 'lokalita' AND ((:zastupce_lokalita_id IS NULL AND zastupce_lokalita_id IS NULL) OR (:zastupce_lokalita_id IS NOT NULL AND zastupce_lokalita_id = :zastupce_lokalita_id)))\n                  )\n            ");
            $stmt_dup->execute([
                ':typ_zastupce' => $typ_zastupce,
                ':zastupce_user_id' => $zastupce_user_id,
                ':zastupce_role_id' => $zastupce_role_id,
                ':zastupce_usek_id' => $zastupce_usek_id,
                ':zastupce_lokalita_id' => $zastupce_lokalita_id,
            ]);
            $dup_result = $stmt_dup->fetch(PDO::FETCH_ASSOC);

            // FK-safe hodnoty pro INSERT
            $zastupovany_id = $vytvoril_user_id;
        } else {
            $global_all_users = 0;

            // Kontrola duplikátu pro běžná pravidla
            $stmt_dup = $pdo->prepare($queries['moznosti_zastupovani_check_duplicate']);
            $stmt_dup->execute([
                ':zastupovany_id' => $zastupovany_id,
                ':typ_zastupce' => $typ_zastupce,
                ':zastupce_user_id' => $zastupce_user_id,
                ':zastupce_role_id' => $zastupce_role_id,
                ':zastupce_usek_id' => $zastupce_usek_id,
                ':zastupce_lokalita_id' => $zastupce_lokalita_id,
                ':exclude_id' => 0, // při create nechceme nic vyloučit
            ]);
            $dup_result = $stmt_dup->fetch(PDO::FETCH_ASSOC);
        }

        if ($dup_result && (int)$dup_result['cnt'] > 0) {
            return array('status' => 'error', 'message' => 'Toto pravidlo již existuje');
        }

        // Vytvoření pravidla
        $stmt = $pdo->prepare($queries['moznosti_zastupovani_create']);
        $stmt->execute([
            ':zastupovany_id' => $zastupovany_id,
            ':global_all_users' => $global_all_users,
            ':typ_zastupce' => $typ_zastupce,
            ':zastupce_user_id' => $zastupce_user_id,
            ':zastupce_role_id' => $zastupce_role_id,
            ':zastupce_usek_id' => $zastupce_usek_id,
            ':zastupce_lokalita_id' => $zastupce_lokalita_id,
            ':poznamka' => $poznamka,
            ':vytvoril_user_id' => $vytvoril_user_id,
        ]);

        $new_id = (int)$pdo->lastInsertId();

        error_log("✅ MOŽNOST ZASTUPOVÁNÍ VYTVOŘENA: ID=$new_id, zastupovany=$zastupovany_id, typ=$typ_zastupce, global=" . ($is_global_all_users ? '1' : '0') . ", vytvoril=$vytvoril_user_id");

        return array('status' => 'ok', 'message' => 'Možnost zastupování vytvořena', 'id' => $new_id);

    } catch (PDOException $e) {
        error_log("moznosti_zastupovani_create DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při vytváření možnosti zastupování: ' . $e->getMessage());
    }
}

/**
 * POST moznosti-zastupovani/delete
 * Smazání (deaktivace) možnosti zastupování
 */
function handle_moznosti_zastupovani_delete($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    // Pouze admin může mazat pravidla
    if (!$token_data['is_admin']) {
        return array('status' => 'error', 'message' => 'Přístup zamítnut – pouze administrátor');
    }

    $id = isset($data['id']) ? (int)$data['id'] : 0;

    if ($id <= 0) {
        return array('status' => 'error', 'message' => 'Neplatné ID');
    }

    try {
        $stmt = $pdo->prepare($queries['moznosti_zastupovani_delete']);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        error_log("✅ MOŽNOST ZASTUPOVÁNÍ SMAZÁNA: ID=$id");

        return array('status' => 'ok', 'message' => 'Možnost zastupování smazána');

    } catch (PDOException $e) {
        error_log("moznosti_zastupovani_delete DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při mazání možnosti zastupování');
    }
}

/**
 * POST moznosti-zastupovani/update
 * Aktualizace existující možnosti zastupování
 */
function handle_moznosti_zastupovani_update($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    // Pouze admin může upravovat pravidla
    if (!$token_data['is_admin']) {
        return array('status' => 'error', 'message' => 'Přístup zamítnut – pouze administrátor');
    }

    $id = isset($data['id']) ? (int)$data['id'] : 0;
    $zastupovany_id = isset($data['zastupovany_id']) ? (int)$data['zastupovany_id'] : 0;
    $typ_zastupce = isset($data['typ_zastupce']) ? trim($data['typ_zastupce']) : '';
    // Prázdný string, null, 0, nebo "0" se konvertuje na NULL pro skupiny
    $zastupce_user_id = !empty($data['zastupce_user_id']) ? (int)$data['zastupce_user_id'] : null;
    $zastupce_role_id = !empty($data['zastupce_role_id']) ? (int)$data['zastupce_role_id'] : null;
    $zastupce_usek_id = !empty($data['zastupce_usek_id']) ? (int)$data['zastupce_usek_id'] : null;
    $zastupce_lokalita_id = !empty($data['zastupce_lokalita_id']) ? (int)$data['zastupce_lokalita_id'] : null;
    $poznamka = isset($data['poznamka']) ? trim($data['poznamka']) : '';

    // Alias "all" -> globální pravidlo (bez konkrétní skupiny)
    if ($typ_zastupce === 'all') {
        $typ_zastupce = 'role';
        $zastupce_user_id = null;
        $zastupce_role_id = null;
        $zastupce_usek_id = null;
        $zastupce_lokalita_id = null;
    }

    // Validace
    if ($id <= 0) {
        return array('status' => 'error', 'message' => 'Neplatné ID');
    }

    if (!in_array($typ_zastupce, ['user', 'role', 'usek', 'lokalita'])) {
        return array('status' => 'error', 'message' => 'Neplatný typ_zastupce');
    }

    try {
        $stmt_existing = $pdo->prepare("SELECT zastupovany_id, global_all_users FROM " . TBL_MOZNOSTI_ZASTUPOVANI . " WHERE id = :id LIMIT 1");
        $stmt_existing->execute([':id' => $id]);
        $existing_rule = $stmt_existing->fetch(PDO::FETCH_ASSOC);
        if (!$existing_rule) {
            return array('status' => 'error', 'message' => 'Pravidlo nebylo nalezeno');
        }
        $existing_is_global = (int)($existing_rule['global_all_users'] ?? 0) === 1;
    } catch (PDOException $e) {
        error_log("moznosti_zastupovani_update load-existing DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání pravidla');
    }

    if ($existing_is_global) {
        // Globální pravidlo musí zůstat globální.
        $zastupovany_id = (int)$existing_rule['zastupovany_id'];
        $global_all_users = 1;
        if ($typ_zastupce === 'user') {
            return array('status' => 'error', 'message' => 'Globální pravidlo nelze nastavit pro konkrétního uživatele');
        }
    } elseif ($zastupovany_id <= 0) {
        return array('status' => 'error', 'message' => 'Neplatné zastupovany_id');
    } else {
        $global_all_users = 0;
    }

    // Kontrola, že odpovídající ID je vyplněné/správné
    $valid_target = false;
    // Pro 'user' musí být konkrétní ID > 0
    if ($typ_zastupce === 'user' && $zastupce_user_id > 0) {
        $valid_target = true;
    }
    // Pro skupiny (role, usek, lokalita) je OK i NULL (znamená "Všechny")
    elseif (in_array($typ_zastupce, ['role', 'usek', 'lokalita'])) {
        $valid_target = true;
    }

    if (!$valid_target) {
        return array('status' => 'error', 'message' => 'Pro uživatele musí být vybrán konkrétní zástupce');
    }

    try {
        // Aktualizace pravidla
        // POZN: Duplikátní kontrola se NEVYKONÁVÁ při UPDATE - uživatel si nemůže vytvořit duplikát editací
        $stmt = $pdo->prepare($queries['moznosti_zastupovani_update']);
        $stmt->execute([
            ':id' => $id,
            ':zastupovany_id' => $zastupovany_id,
            ':global_all_users' => $global_all_users,
            ':typ_zastupce' => $typ_zastupce,
            ':zastupce_user_id' => $zastupce_user_id,
            ':zastupce_role_id' => $zastupce_role_id,
            ':zastupce_usek_id' => $zastupce_usek_id,
            ':zastupce_lokalita_id' => $zastupce_lokalita_id,
            ':poznamka' => $poznamka,
        ]);

        error_log("✅ MOŽNOST ZASTUPOVÁNÍ AKTUALIZOVÁNA: ID=$id, zastupovany=$zastupovany_id, typ=$typ_zastupce");

        return array('status' => 'ok', 'message' => 'Možnost zastupování aktualizována');

    } catch (PDOException $e) {
        error_log("moznosti_zastupovani_update DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při aktualizaci možnosti zastupování: ' . $e->getMessage());
    }
}

/**
 * POST moznosti-zastupovani/list-all
 * Admin: seznam VŠECH možností zastupování v systému
 */
/**
 * POST substitution/is-candidate
 * Rychlý check: je přihlášený uživatel v tabulce možností zastupování jako potenciální zástupce?
 * Vrací { is_candidate: bool }  – používá se pro rozhodnutí zda zobrazit ouško Zastupování v profilu.
 */
function handle_substitution_is_candidate($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return ['status' => 'error', 'message' => 'Neplatný nebo chybějící token'];
    }

    $user_id = (int)$token_data['id'];

    try {
        $stmt = $pdo->prepare($queries['moznosti_zastupovani_is_candidate']);
        $stmt->execute([
            ':user_id'  => $user_id,
            ':user_id2' => $user_id,
            ':user_id3' => $user_id,
            ':user_id4' => $user_id,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $can_be_substitute = (int)($row['cnt'] ?? 0) > 0;

        $stmtOwn = $pdo->prepare($queries['moznosti_zastupovani_can_set_own']);
        $stmtOwn->execute([
            ':user_id' => $user_id,
        ]);
        $rowOwn = $stmtOwn->fetch(PDO::FETCH_ASSOC);
        $can_set_own_substitute = (int)($rowOwn['cnt'] ?? 0) > 0;

        $stmtRel = $pdo->prepare($queries['substitution_has_active_relation']);
        $stmtRel->execute([
            ':user_id' => $user_id,
            ':user_id2' => $user_id,
        ]);
        $rowRel = $stmtRel->fetch(PDO::FETCH_ASSOC);
        $has_active_relation = (int)($rowRel['cnt'] ?? 0) > 0;

        // Backward compatibility: původní pole is_candidate necháváme,
        // ale nyní reprezentuje "má přístup do ouška zastupování".
        $is_candidate = ($can_be_substitute || $can_set_own_substitute || $has_active_relation);

        error_log("🔍 [substitution/is-candidate] user_id=$user_id => can_be_substitute=" . ($can_be_substitute ? 1 : 0) . ", can_set_own=" . ($can_set_own_substitute ? 1 : 0) . ", active_rel=" . ($has_active_relation ? 1 : 0) . ", is_candidate=" . ($is_candidate ? 1 : 0));

        return [
            'status' => 'ok',
            'is_candidate' => $is_candidate,
            'can_be_substitute' => $can_be_substitute,
            'can_set_own_substitute' => $can_set_own_substitute,
            'has_active_relation' => $has_active_relation,
        ];

    } catch (PDOException $e) {
        error_log("substitution_is_candidate DB error: " . $e->getMessage());
        return ['status' => 'error', 'message' => 'Chyba při kontrole kandidatury'];
    }
}

function handle_moznosti_zastupovani_list_all($data, $pdo) {
    global $queries;

    $token_data = _substitution_auth($data, $pdo);
    if (!$token_data) {
        return array('status' => 'error', 'message' => 'Neplatný nebo chybějící token');
    }

    // Pouze admin může načíst všechny možnosti
    if (!$token_data['is_admin']) {
        return array('status' => 'error', 'message' => 'Přístup zamítnut – pouze administrátor');
    }

    try {
        $stmt = $pdo->prepare($queries['moznosti_zastupovani_list_all']);
        $stmt->execute();

        $rules = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $is_global_all_users = (int)($row['global_all_users'] ?? 0) === 1;
            $rule = array(
                'id' => (int)$row['id'],
                'zastupovany_id' => (int)$row['zastupovany_id'],
                'zastupovany_username' => $row['zastupovany_username'],
                'zastupovany_jmeno' => $row['zastupovany_jmeno'],
                'zastupovany_prijmeni' => $row['zastupovany_prijmeni'],
                'zastupovany_display' => $is_global_all_users
                    ? '🌐 Všichni uživatelé (globální pravidlo)'
                    : trim($row['zastupovany_jmeno'] . ' ' . $row['zastupovany_prijmeni']) . ' (' . $row['zastupovany_username'] . ')',
                'global_all_users' => $is_global_all_users,
                'typ_zastupce' => $row['typ_zastupce'],
                'poznamka' => (string)($row['poznamka'] ?? ''),
                'aktivni' => (int)$row['aktivni'],
                'dt_vytvoreni' => $row['dt_vytvoreni'],
            );

            // Přidání detailů podle typu
            switch ($row['typ_zastupce']) {
                case 'user':
                    $rule['zastupce_user_id'] = (int)$row['zastupce_user_id'];
                    $rule['zastupce_user_username'] = $row['zastupce_user_username'];
                    $rule['zastupce_user_jmeno'] = $row['zastupce_user_jmeno'];
                    $rule['zastupce_user_prijmeni'] = $row['zastupce_user_prijmeni'];
                    $rule['zastupce_display'] = trim($row['zastupce_user_jmeno'] . ' ' . $row['zastupce_user_prijmeni']) . ' (' . $row['zastupce_user_username'] . ')';
                    break;
                case 'role':
                    $rule['zastupce_role_id'] = $row['zastupce_role_id'] ? (int)$row['zastupce_role_id'] : null;
                    $rule['zastupce_role_kod'] = $row['zastupce_role_kod'];
                    $rule['zastupce_role_nazev'] = $row['zastupce_role_nazev'];
                    $rule['zastupce_display'] = $row['zastupce_role_id'] ? ($row['zastupce_role_nazev'] . ' (' . $row['zastupce_role_kod'] . ')') : 'Všichni uživatelé';
                    break;
                case 'usek':
                    $rule['zastupce_usek_id'] = $row['zastupce_usek_id'] ? (int)$row['zastupce_usek_id'] : null;
                    $rule['zastupce_usek_zkr'] = $row['zastupce_usek_zkr'];
                    $rule['zastupce_usek_nazev'] = $row['zastupce_usek_nazev'];
                    $rule['zastupce_display'] = $row['zastupce_usek_id'] ? ($row['zastupce_usek_nazev'] . ' (' . $row['zastupce_usek_zkr'] . ')') : 'Všechny úseky';
                    break;
                case 'lokalita':
                    $rule['zastupce_lokalita_id'] = $row['zastupce_lokalita_id'] ? (int)$row['zastupce_lokalita_id'] : null;
                    $rule['zastupce_lokalita_kod'] = $row['zastupce_lokalita_kod'];
                    $rule['zastupce_lokalita_nazev'] = $row['zastupce_lokalita_nazev'];
                    $rule['zastupce_display'] = $row['zastupce_lokalita_id'] ? ($row['zastupce_lokalita_nazev'] . ' (' . $row['zastupce_lokalita_kod'] . ')') : 'Všechny lokality';
                    break;
            }

            $rules[] = $rule;
        }

        return array('status' => 'ok', 'data' => $rules, 'count' => count($rules));

    } catch (PDOException $e) {
        error_log("moznosti_zastupovani_list_all DB error: " . $e->getMessage());
        return array('status' => 'error', 'message' => 'Chyba při načítání možností zastupování');
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
                u.titul_pred,
                u.jmeno,
                u.prijmeni,
                u.email,
                u.pozice_id,
                u.usek_id,
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
                'titul_pred' => $row['titul_pred'] ?: '',
                'jmeno' => $row['jmeno'] ?: '',
                'prijmeni' => $row['prijmeni'] ?: '',
                'name' => trim($row['jmeno'] . ' ' . $row['prijmeni']),
                'position' => $row['pozice'] ?: 'Neuvedeno',
                'location' => $row['lokalita'] ?: 'Neuvedeno',
                'department' => $row['usek'] ?: 'Neuvedeno',
                'departmentCode' => $row['usek_zkr'] ?: '',
                'initials' => $initials ?: '?',
                'email' => $row['email'],
                'roles' => array_map('intval', $userRoles), // Pole ID rolí
                'usek_id' => (int)$row['usek_id'] // Pro filtrování v SELECTED scope
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
        array('id' => 'ORDER_PENDING_APPROVAL', 'name' => 'Objednávka vytvořena / odeslána ke schválení', 'category' => 'orders'),
        array('id' => 'ORDER_APPROVED', 'name' => 'Objednávka schválena', 'category' => 'orders'),
        array('id' => 'ORDER_REJECTED', 'name' => 'Objednávka zamítnuta', 'category' => 'orders'),
        array('id' => 'ORDER_CANCELLED', 'name' => 'Objednávka zrušena', 'category' => 'orders'),
        array('id' => 'ORDER_STATUS_NOVA', 'name' => 'Nová objednávka', 'category' => 'orders'),
        array('id' => 'ORDER_STATUS_KONTROLA_CEKA', 'name' => 'Objednávka čeká na kontrolu', 'category' => 'orders'),
        array('id' => 'ORDER_STATUS_KONTROLA_POTVRZENA', 'name' => 'Objednávka potvrzena po kontrole', 'category' => 'orders'),
        array('id' => 'ORDER_STATUS_KONTROLA_ZAMITNUTA', 'name' => 'Objednávka zamítnuta po kontrole', 'category' => 'orders'),
        array('id' => 'ORDER_STATUS_ZAMITNUTO', 'name' => 'Objednávka zamítnuta', 'category' => 'orders'),
        array('id' => 'ORDER_STATUS_HOTOVA', 'name' => 'Objednávka hotová', 'category' => 'orders'),
        array('id' => 'ORDER_STATUS_DODANO', 'name' => 'Objednávka dodána', 'category' => 'orders'),
        array('id' => 'ORDER_COMMENT_NEW', 'name' => 'Nový komentář k objednávce', 'category' => 'orders'),
        array('id' => 'ORDER_COMMENT_MENTION', 'name' => 'Zmínka v komentáři objednávky', 'category' => 'orders'),
        array('id' => 'SYSTEM_USER_LOGIN_ALERT', 'name' => 'Upozornění na přihlášení uživatele', 'category' => 'system'),
        array('id' => 'SYSTEM_USER_PROFILE_CHANGED', 'name' => 'Změna profilu uživatele', 'category' => 'system')
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
    
    // VALIDACE A NORMALIZACE MULTI-FIELD STRUKTURY
    $normalizedNodes = array();
    foreach ($nodes as $node) {
        $normalizedNode = $node;
        
        // VALIDACE TARGET NODE - DYNAMIC_FROM_ENTITY s multi-field podporou
        if (isset($node['data']['scopeDefinition'])) {
            $scopeDef = $node['data']['scopeDefinition'];
            
            // Migrace starého formátu field -> fields
            if (isset($scopeDef['field']) && !isset($scopeDef['fields'])) {
                $normalizedNode['data']['scopeDefinition']['fields'] = array($scopeDef['field']);
                unset($normalizedNode['data']['scopeDefinition']['field']);
                error_log("HIERARCHY SAVE: Migrated single field '{$scopeDef['field']}' to multi-field format for node {$node['id']}");
            }
            
            // Validace fields array
            if (isset($scopeDef['fields'])) {
                $validFields = array(
                    'uzivatel_id', 'uzivatel_akt_id', 'garant_uzivatel_id', 'objednatel_id', 
                    'schvalovatel_id', 'prikazce_id', 'zamek_uzivatel_id', 'vytvoril_uzivatel_id', 
                    'aktualizoval_uzivatel_id', 'potvrdil_dodavatel_id', 'prikazce_fakturace_id',
                    'fa_predana_zam_id'
                );
                
                if (is_array($scopeDef['fields'])) {
                    $cleanedFields = array();
                    foreach ($scopeDef['fields'] as $field) {
                        if (in_array($field, $validFields)) {
                            $cleanedFields[] = $field;
                        } else {
                            error_log("HIERARCHY SAVE: Invalid field '{$field}' removed from node {$node['id']}");
                        }
                    }
                    $normalizedNode['data']['scopeDefinition']['fields'] = array_values(array_unique($cleanedFields));
                } else {
                    error_log("HIERARCHY SAVE: Invalid fields format in node {$node['id']}, using default");
                    $normalizedNode['data']['scopeDefinition']['fields'] = array('prikazce_id');
                }
            }
        }

        if (isset($normalizedNode['data']['eventTypes'])) {
            $normalizedNode['data']['eventTypes'] = normalizeHierarchyEventTypes($normalizedNode['data']['eventTypes']);
        }
        
        $normalizedNodes[] = $normalizedNode;
    }
    
    // VALIDACE EDGES - source_info_recipients s multi-field
    $normalizedEdges = array();
    foreach ($edges as $edge) {
        $normalizedEdge = $edge;
        
        if (isset($edge['data']['source_info_recipients'])) {
            $sourceInfo = $edge['data']['source_info_recipients'];
            
            // Migrace starého formátu field -> fields pro edge
            if (isset($sourceInfo['field']) && !isset($sourceInfo['fields'])) {
                $normalizedEdge['data']['source_info_recipients']['fields'] = array($sourceInfo['field']);
                unset($normalizedEdge['data']['source_info_recipients']['field']);
                error_log("HIERARCHY SAVE: Migrated edge single field '{$sourceInfo['field']}' to multi-field for edge {$edge['id']}");
            }
            
            // Validace fields v edges
            if (isset($sourceInfo['fields']) && is_array($sourceInfo['fields'])) {
                $validFields = array(
                    'uzivatel_id', 'uzivatel_akt_id', 'garant_uzivatel_id', 'objednatel_id', 
                    'schvalovatel_id', 'prikazce_id', 'zamek_uzivatel_id', 'vytvoril_uzivatel_id', 
                    'aktualizoval_uzivatel_id', 'potvrdil_dodavatel_id', 'prikazce_fakturace_id',
                    'fa_predana_zam_id'
                );
                
                $cleanedFields = array();
                foreach ($sourceInfo['fields'] as $field) {
                    if (in_array($field, $validFields)) {
                        $cleanedFields[] = $field;
                    }
                }
                $normalizedEdge['data']['source_info_recipients']['fields'] = array_values(array_unique($cleanedFields));
            }
        }

        if (isset($normalizedEdge['data']['eventTypes'])) {
            $normalizedEdge['data']['eventTypes'] = normalizeHierarchyEventTypes($normalizedEdge['data']['eventTypes']);
        }
        
        $normalizedEdges[] = $normalizedEdge;
    }
    
    // Sestavit structure JSON s normalizovanými daty
    $structure = array(
        'nodes' => $normalizedNodes,
        'edges' => $normalizedEdges,
        'version' => '1.1',  // Verze pro multi-field support
        'saved_at' => date('Y-m-d H:i:s')
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
    
    // MIGRACE starých struktur na novou architekturu
    $structure = migrateHierarchyStructureToV2($structure);
    
    return array(
        'success' => true,
        'data' => array(
            'profile_id' => (int)$profile['id'],
            'nodes' => isset($structure['nodes']) ? $structure['nodes'] : [],
            'edges' => isset($structure['edges']) ? $structure['edges'] : []
        )
    );
}

/**
 * Normalize legacy event type codes to current ones.
 * Accepts array or scalar input and returns unique array.
 */
function normalizeHierarchyEventTypes($eventTypes) {
    if ($eventTypes === null) {
        return array();
    }

    if (!is_array($eventTypes)) {
        $eventTypes = array($eventTypes);
    }

    $map = array(
        'ORDER_STATUS_NOVA' => 'ORDER_CREATED',
        'ORDER_STATUS_ROZPRACOVANA' => 'ORDER_DRAFT',
        'ORDER_STATUS_KE_SCHVALENI' => 'ORDER_PENDING_APPROVAL',
        'ORDER_STATUS_SCHVALENA' => 'ORDER_APPROVED',
        'ORDER_STATUS_ZAMITNUTA' => 'ORDER_REJECTED',
        'ORDER_STATUS_CEKA_SE' => 'ORDER_AWAITING_CHANGES',
        'ORDER_STATUS_ODESLANA' => 'ORDER_SENT_TO_SUPPLIER',
        'ORDER_STATUS_CEKA_POTVRZENI' => 'ORDER_AWAITING_CONFIRMATION',
        'ORDER_STATUS_POTVRZENA' => 'ORDER_CONFIRMED_BY_SUPPLIER',
        'ORDER_STATUS_REGISTR_CEKA' => 'ORDER_REGISTRY_PENDING',
        'ORDER_STATUS_REGISTR_ZVEREJNENA' => 'ORDER_REGISTRY_PUBLISHED',
        'ORDER_STATUS_FAKTURA_CEKA' => 'ORDER_INVOICE_PENDING',
        'ORDER_STATUS_FAKTURA_PRIDANA' => 'ORDER_INVOICE_ADDED',
        'ORDER_STATUS_FAKTURA_SCHVALENA' => 'ORDER_INVOICE_APPROVED',
        'ORDER_STATUS_FAKTURA_UHRAZENA' => 'ORDER_INVOICE_PAID',
        'ORDER_STATUS_KONTROLA_CEKA' => 'INVOICE_MATERIAL_CHECK_REQUESTED',
        'ORDER_STATUS_KONTROLA_POTVRZENA' => 'INVOICE_MATERIAL_CHECK_APPROVED',
        'ORDER_STATUS_KONTROLA_ZAMITNUTA' => 'INVOICE_MATERIAL_CHECK_REJECTED',
        'NOVA' => 'ORDER_CREATED',
        'ROZPRACOVANA' => 'ORDER_DRAFT',
        'ODESLANA_KE_SCHVALENI' => 'ORDER_PENDING_APPROVAL',
        'SCHVALENA' => 'ORDER_APPROVED',
        'ZAMITNUTA' => 'ORDER_REJECTED',
        'CEKA_SE' => 'ORDER_AWAITING_CHANGES',
        'ODESLANA' => 'ORDER_SENT_TO_SUPPLIER',
        'CEKA_POTVRZENI' => 'ORDER_AWAITING_CONFIRMATION',
        'POTVRZENA' => 'ORDER_CONFIRMED_BY_SUPPLIER',
        'REGISTR_CEKA' => 'ORDER_REGISTRY_PENDING',
        'REGISTR_ZVEREJNENA' => 'ORDER_REGISTRY_PUBLISHED',
        'FAKTURA_CEKA' => 'ORDER_INVOICE_PENDING',
        'FAKTURA_PRIDANA' => 'ORDER_INVOICE_ADDED',
        'FAKTURA_SCHVALENA' => 'ORDER_INVOICE_APPROVED',
        'FAKTURA_UHRAZENA' => 'ORDER_INVOICE_PAID',
        'KONTROLA_CEKA' => 'INVOICE_MATERIAL_CHECK_REQUESTED',
        'KONTROLA_POTVRZENA' => 'INVOICE_MATERIAL_CHECK_APPROVED',
        'KONTROLA_ZAMITNUTA' => 'INVOICE_MATERIAL_CHECK_REJECTED'
    );

    $normalized = array();
    foreach ($eventTypes as $eventType) {
        if (is_numeric($eventType)) {
            $normalized[] = $eventType;
            continue;
        }

        $key = strtoupper(trim((string)$eventType));
        $normalized[] = isset($map[$key]) ? $map[$key] : $eventType;
    }

    return array_values(array_unique($normalized));
}

/**
 * Migrace starých hierarchických struktur na novou architekturu
 * 
 * ZMĚNY v2:
 * - NODES: normalVariant → warningVariant
 * - NODES: Přidány scopeDefinition a delivery u role/department/user
 * - EDGES: recipientRole → priority (EXCEPTIONAL→URGENT, APPROVAL→WARNING)
 * 
 * @param array $structure Původní struktura
 * @return array Migrovaná struktura
 */
function migrateHierarchyStructureToV2($structure) {
    $migrated = false;
    
    // MIGRACE NODES
    if (isset($structure['nodes'])) {
        foreach ($structure['nodes'] as &$node) {
            // TEMPLATE nodes - přejmenování variant
            if ($node['type'] === 'template') {
                // normalVariant → warningVariant
                if (isset($node['data']['normalVariant'])) {
                    $node['data']['warningVariant'] = $node['data']['normalVariant'];
                    unset($node['data']['normalVariant']);
                    $migrated = true;
                }
                
                // Ensure eventTypes array exists
                if (!isset($node['data']['eventTypes'])) {
                    $node['data']['eventTypes'] = [];
                }

                $node['data']['eventTypes'] = normalizeHierarchyEventTypes($node['data']['eventTypes']);
            }
            
            // TARGET nodes (role/department/user) - přidat scopeDefinition a delivery
            if (in_array($node['type'], ['role', 'department', 'user'])) {
                // Přidat defaultní scopeDefinition pokud chybí
                if (!isset($node['data']['scopeDefinition'])) {
                    $node['data']['scopeDefinition'] = ['type' => 'ALL'];
                    $migrated = true;
                }
                
                // Přidat defaultní delivery pokud chybí
                if (!isset($node['data']['delivery'])) {
                    $node['data']['delivery'] = [
                        'email' => true,
                        'inApp' => true,
                        'sms' => false
                    ];
                    $migrated = true;
                }
            }
        }
    }
    
    // MIGRACE EDGES
    if (isset($structure['edges'])) {
        foreach ($structure['edges'] as &$edge) {
            // recipientRole → priority mapping
            if (isset($edge['data']['recipientRole'])) {
                $roleMapping = [
                    'EXCEPTIONAL' => 'URGENT',
                    'APPROVAL' => 'WARNING',
                    'INFO' => 'INFO'
                ];
                
                $oldRole = $edge['data']['recipientRole'];
                $edge['data']['priority'] = $roleMapping[$oldRole] ?? 'WARNING';
                unset($edge['data']['recipientRole']);
                $migrated = true;
            }
            
            // Přidat defaultní priority pokud chybí
            if (!isset($edge['data']['priority'])) {
                $edge['data']['priority'] = 'WARNING';
                $migrated = true;
            }
            
            // Ensure eventTypes array exists (subset of template eventTypes)
            if (!isset($edge['data']['eventTypes'])) {
                $edge['data']['eventTypes'] = [];
            }

            $edge['data']['eventTypes'] = normalizeHierarchyEventTypes($edge['data']['eventTypes']);
        }
    }
    
    if ($migrated) {
        error_log("HIERARCHY MIGRATION: Structure migrated to v2 architecture");
    }
    
    return $structure;
}

/**
 * 🎯 HELPER: Zjistí informace o zastoupení pro konkrétní akci
 * 
 * Čte z tabulky 25_zastupovani_akce_log a vrátí informace o tom,
 * zda uživatel jednal v zastoupení při konkrétní akci
 * 
 * @param PDO $pdo - databázové spojení
 * @param int $zastupce_id - uživatel, který akci vykonal (schvalovatel, potvrzovatel atd)
 * @param string $akce_typ - typ akce: APPROVE, CONFIRM, UPDATE
 * @param string $objekt_typ - typ objektu: OBJEDNAVKA, FAKTURA
 * @param int $objekt_id - ID objektu (objednávka ID, faktura ID)
 * @param string $dt_akce - čas akce (přibližně, ±60 sekund) - "2026-06-13 18:25:22"
 * 
 * @return array|bool - ['is_substitution' => true, 'zastupovany_id' => X, 'zastupovany_jmeno' => 'Jméno'] 
 *                     nebo false pokud je to vlastní akce
 */
function get_substitution_info_for_action($pdo, $zastupce_id, $akce_typ, $objekt_typ, $objekt_id, $dt_akce) {
    if (!$pdo || !$zastupce_id || !$akce_typ || !$objekt_typ || !$objekt_id || !$dt_akce) {
        return false;
    }
    
    try {
        // Vyhledej záznam v audit logu s přesností ±60 sekund
        // (čas se může mírně lišit kvůli asynchronnímu logování)
        $query = "
            SELECT 
                z.zastupovani_id,
                z.zastupovany_id,
                u.jmeno,
                u.prijmeni,
                z.dt_akce
            FROM " . TBL_ZASTUPOVANI_AKCE_LOG . " z
            LEFT JOIN " . TBL_UZIVATELE . " u ON z.zastupovany_id = u.id
            WHERE z.zastupce_id = ?
              AND z.akce_typ = ?
              AND z.objekt_typ = ?
              AND z.objekt_id = ?
              AND ABS(TIMESTAMPDIFF(SECOND, z.dt_akce, ?)) <= 60
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, z.dt_akce, ?)) ASC
            LIMIT 1
        ";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([
            $zastupce_id,
            $akce_typ,
            $objekt_typ,
            $objekt_id,
            $dt_akce,
            $dt_akce
        ]);
        
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$record) {
            // Fallback pro historická data: když chybí audit záznam,
            // zkusíme odvodit zastoupení z aktivního zástupu v čase akce.
            if ($objekt_typ === 'FAKTURA') {
                $stmtInvoice = $pdo->prepare("SELECT fa_predana_zam_id FROM " . TBL_FAKTURY . " WHERE id = ? LIMIT 1");
                $stmtInvoice->execute([(int)$objekt_id]);
                $invoice = $stmtInvoice->fetch(PDO::FETCH_ASSOC);

                $target_zastupovany_id = !empty($invoice['fa_predana_zam_id']) ? (int)$invoice['fa_predana_zam_id'] : 0;

                if ($target_zastupovany_id > 0 && (int)$target_zastupovany_id !== (int)$zastupce_id) {
                    $stmtFallback = $pdo->prepare("\n                        SELECT z.id as zastupovani_id, z.zastupovany_id, z.opravneni, u.jmeno, u.prijmeni\n                        FROM " . TBL_UZIVATELE_ZASTUPOVANI . " z\n                        LEFT JOIN " . TBL_UZIVATELE . " u ON z.zastupovany_id = u.id\n                        WHERE z.zastupce_id = ?\n                          AND z.zastupovany_id = ?\n                          AND z.aktivni = 1\n                          AND DATE(?) BETWEEN z.dt_od AND z.dt_do\n                        ORDER BY z.id DESC\n                        LIMIT 5\n                    ");
                    $stmtFallback->execute([
                        (int)$zastupce_id,
                        (int)$target_zastupovany_id,
                        $dt_akce
                    ]);

                    $fallbackRows = $stmtFallback->fetchAll(PDO::FETCH_ASSOC);

                    foreach ($fallbackRows as $fallbackRow) {
                        $opravneni = json_decode($fallbackRow['opravneni'] ?? '', true);
                        $hasPermission = false;

                        if (is_array($opravneni)) {
                            $confirm = $opravneni['confirm'] ?? null;
                            $approve = $opravneni['approve'] ?? null;

                            $toBool = function($value) {
                                if (is_bool($value)) return $value;
                                if (is_numeric($value)) return (int)$value === 1;
                                if (is_string($value)) {
                                    $normalized = strtolower(trim($value));
                                    return $normalized === '1' || $normalized === 'true' || $normalized === 'yes';
                                }
                                return false;
                            };

                            $hasPermission = $toBool($confirm) || $toBool($approve);
                        }

                        if ($hasPermission) {
                            error_log("[SUBSTITUTION INFO] Fallback match pro fakturu #{$objekt_id}, zastupce #{$zastupce_id}, zastupovany #{$target_zastupovany_id}");
                            return [
                                'is_substitution' => true,
                                'zastupovany_id' => (int)$fallbackRow['zastupovany_id'],
                                'zastupovany_jmeno' => trim(($fallbackRow['jmeno'] ?? '') . ' ' . ($fallbackRow['prijmeni'] ?? '')),
                                'dt_akce' => $dt_akce
                            ];
                        }
                    }
                }
            }

            return false; // Žádné zastupování
        }
        
        // Vraťka info o zastoupení
        return [
            'is_substitution' => true,
            'zastupovany_id' => (int)$record['zastupovany_id'],
            'zastupovany_jmeno' => trim($record['jmeno'] . ' ' . $record['prijmeni']),
            'dt_akce' => $record['dt_akce']
        ];
        
    } catch (Exception $e) {
        error_log("[SUBSTITUTION INFO] Error: " . $e->getMessage());
        return false;
    }
}

?>