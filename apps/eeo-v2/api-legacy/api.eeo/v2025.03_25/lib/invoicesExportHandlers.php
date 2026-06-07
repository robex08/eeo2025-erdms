<?php
/**
 * Invoice Export Handler - Export všech faktur bez pagingu
 * 
 * Slouží pro Excel Power Query a ostatní export scénáře
 * GET /invoices25/export
 * 
 * Autentizace:
 * - Basic Auth (username + heslo)
 * - Query string (?username=xxx&password=xxx)
 * 
 * @version 2026-06-07
 */

/**
 * GET /invoices25/export
 * 
 * Vrací VŠECHNY faktury bez pagingu jako přímé pole
 * Totéž filtrování jako invoices25/list, ale bez LIMIT/OFFSET
 * 
 * Autentizace: Basic Auth nebo query string
 * Response: [{id, fa_cislo_vema, fa_castka, ...}, {...}, ...]
 */
function handle_invoices25_export($input, $config, $queries) {
    // 1. Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze GET metoda'));
        return;
    }
    
    // Merge GET parametry do $input (pro Excel Power Query kompatibilitu)
    $input = array_merge($input, $_GET);
    
    // 2. OVĚŘENÍ AUTENTIZACE
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $password = isset($input['password']) ? $input['password'] : '';
    $bearer_token = '';
    
    // Zkus Bearer Token (EntraID) z HTTP Authorization header
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        if (preg_match('/^Bearer\s+(.+)$/i', $auth_header, $matches)) {
            $bearer_token = $matches[1];
        }
    }
    
    // Pokud chybí všechny credentials -> vrátit 401
    if (empty($bearer_token) && empty($username) && empty($password) && empty($token)) {
        http_response_code(401);
        header('WWW-Authenticate: Bearer realm="ERDMS API"');
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Autentizace selhala - chybí credentials',
            'auth_required' => true
        ));
        return;
    }
    
    // 3. DB PŘIPOJENÍ
    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);
    } catch (Exception $e) {
        error_log("[InvoicesExport] ❌ DB connection failed: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba serveru - nelze se připojit k databázi'));
        return;
    }
    
    // 4. OVĚŘENÍ CREDENTIALS
    $user_id = 0;
    
    // 4a. Zkus Bearer Token (EntraID) - PRIORITA
    if ($bearer_token) {
        $token_data = verify_entra_bearer_token($bearer_token, $db);
        if ($token_data) {
            $username = $token_data['username'];
            $user_id = $token_data['user_id'];
            $token = $token_data['token'];
        } else {
            http_response_code(401);
            echo json_encode(array('status' => 'error', 'message' => 'Neplatný EntraID token'));
            return;
        }
    }
    // 4b. Zkus Basic Auth (heslo z query string nebo body)
    elseif (!empty($username) && !empty($password)) {
        $token_data = verify_basic_auth($username, $password, $db);
        if ($token_data) {
            $user_id = $token_data['user_id'];
            $token = $token_data['token'];
        } else {
            http_response_code(401);
            echo json_encode(array('status' => 'error', 'message' => 'Neplatné přihlašovací údaje'));
            return;
        }
    }
    
    // Pokud máme token, ověř ho
    if (!$token || !$username) {
        http_response_code(401);
        header('WWW-Authenticate: Bearer realm="ERDMS API"');
        echo json_encode(array('status' => 'error', 'message' => 'Vyžaduje autentizaci'));
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    $user_id = isset($token_data['id']) ? (int)$token_data['id'] : $user_id;
    
    // 5. NAČTENÍ FAKTUR - 1:1 SQL jako v list, ale BEZ LIMIT/OFFSET
    try {

        
        // Načíst role uživatele z DB
        $roles_sql = "SELECT r.kod_role 
                      FROM `25_role` r 
                      JOIN `25_uzivatele_role` ur ON r.id = ur.role_id 
                      WHERE ur.uzivatel_id = ?";
        $roles_stmt = $db->prepare($roles_sql);
        $roles_stmt->execute(array($user_id));
        $user_roles = array();
        while ($row = $roles_stmt->fetch(PDO::FETCH_ASSOC)) {
            $user_roles[] = $row['kod_role'];
        }
        
        // Načíst úsek uživatele z DB (pro filtrování podle úseku)
        $usek_sql = "SELECT u.usek_id, us.usek_zkr 
                     FROM `25_uzivatele` u 
                     LEFT JOIN `25_useky` us ON u.usek_id = us.id 
                     WHERE u.id = ?";
        $usek_stmt = $db->prepare($usek_sql);
        $usek_stmt->execute(array($user_id));
        $usek_data = $usek_stmt->fetch(PDO::FETCH_ASSOC);
        $user_usek_id = $usek_data ? (int)$usek_data['usek_id'] : null;
        $user_usek_zkr = $usek_data ? $usek_data['usek_zkr'] : null;
        
        // Admin control - stejně jako v originálním handle_invoices25_list
        $is_admin = in_array('SUPERADMIN', $user_roles) || 
                    in_array('ADMINISTRATOR', $user_roles) || 
                    in_array('UCETNI', $user_roles) ||
                    in_array('HLAVNI_UCETNI', $user_roles) ||
                    in_array('KONTROLOR_FAKTUR', $user_roles);
        
        // ========================================================================
        // SQL LOGIKA 1:1 z handle_invoices25_list, jen bez LIMIT/OFFSET
        // ========================================================================
        $where_conditions = array();
        $params = array();
        $where_conditions[] = 'f.aktivni = 1';
        
        // USER ISOLATION pro non-admin
        if (!$is_admin) {
            // 🔐 Non-admin vidí pouze:
            // 1. Faktury k objednávkám kde je účastníkem
            // 2. Faktury předané k věcné kontrole
            // 3. Faktury které sám vytvořil
            
            $user_access_conditions = array();
            $user_access_params = array();
            
            // Objednávky kde je uživatel účastníkem
            $user_orders_sql = "
                SELECT DISTINCT o.id 
                FROM `" . TBL_OBJEDNAVKY . "` o
                WHERE (
                    o.uzivatel_id = ?
                    OR o.garant_uzivatel_id = ?
                    OR o.objednatel_id = ?
                    OR o.schvalovatel_id = ?
                    OR o.prikazce_id = ?
                    OR o.potvrdil_vecnou_spravnost_id = ?
                    OR o.fakturant_id = ?
                )
            ";
            $user_orders_stmt = $db->prepare($user_orders_sql);
            $user_orders_stmt->execute(array($user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id));
            $user_order_ids = array();
            while ($row = $user_orders_stmt->fetch(PDO::FETCH_ASSOC)) {
                $user_order_ids[] = (int)$row['id'];
            }
            
            // Faktury k objednávkám kde je účastníkem
            if (!empty($user_order_ids)) {
                $user_access_conditions[] = 'f.objednavka_id IN (' . implode(',', $user_order_ids) . ')';
            }
            
            // Faktury předané k věcné kontrole
            $user_access_conditions[] = 'f.fa_predana_zam_id = ?';
            $user_access_params[] = $user_id;
            
            // Faktury potvrzené uživatelem
            $user_access_conditions[] = 'f.potvrdil_vecnou_spravnost_id = ?';
            $user_access_params[] = $user_id;
            
            // Faktury které sám vytvořil
            $user_access_conditions[] = 'f.vytvoril_uzivatel_id = ?';
            $user_access_params[] = $user_id;
            
            // Smlouvy přiřazené k úseku uživatele
            if ($user_usek_id) {
                $user_access_conditions[] = '(f.smlouva_id IS NOT NULL AND sm.usek_id = ?)';
                $user_access_params[] = $user_usek_id;

            }
            
            if (empty($user_access_conditions)) {
                http_response_code(200);
                echo json_encode(array());
                return;
            }
            
            $where_conditions[] = '(' . implode(' OR ', $user_access_conditions) . ')';
            $params = array_merge($params, $user_access_params);
        } else {
        }
        
        // Sestavit WHERE klauzuli
        $where_sql = implode(' AND ', $where_conditions);
        $faktury_table = get_invoices_table_name();
        
        // ⚠️ EXPORT MODE: ŽÁDNÝ LIMIT! Vrací všechny záznamy bez pagingu.
        $sql = "SELECT 
            f.*,
            o.cislo_objednavky,
            o.uzivatel_id AS objednavka_uzivatel_id,
            o.dodavatel_nazev AS objednavka_dodavatel_nazev,
            o.dodavatel_ico AS objednavka_dodavatel_ico,
            o.stav_workflow_kod AS objednavka_stav_workflow_kod,
            sm.cislo_smlouvy,
            sm.nazev_smlouvy,
            sm.nazev_firmy AS smlouva_nazev_firmy,
            sm.ico AS smlouva_ico,
            u_vytvoril.jmeno AS vytvoril_jmeno,
            u_vytvoril.prijmeni AS vytvoril_prijmeni,
            u_vytvoril.titul_pred AS vytvoril_titul_pred,
            u_vytvoril.titul_za AS vytvoril_titul_za,
            u_vytvoril.email AS vytvoril_email,
            u_vytvoril.telefon AS vytvoril_telefon,
            u_obj.jmeno AS objednavka_uzivatel_jmeno,
            u_obj.prijmeni AS objednavka_uzivatel_prijmeni,
            COUNT(DISTINCT prilohy.id) AS pocet_priloh,
            u_obj.titul_pred AS objednavka_uzivatel_titul_pred,
            u_obj.titul_za AS objednavka_uzivatel_titul_za,
            u_obj.email AS objednavka_uzivatel_email,
            u_obj.telefon AS objednavka_uzivatel_telefon,
            u_obj.organizace_id,
            u_obj.usek_id AS objednavka_usek_id,
            org.nazev_organizace AS organizace_nazev,
            us_obj.usek_zkr AS objednavka_usek_zkr,
            s.nazev_stavu AS fa_typ_nazev,
            s.popis AS fa_typ_popis,
            u_vecna.jmeno AS potvrdil_vecnou_spravnost_jmeno,
            u_vecna.prijmeni AS potvrdil_vecnou_spravnost_prijmeni,
            u_vecna.titul_pred AS potvrdil_vecnou_spravnost_titul_pred,
            u_vecna.titul_za AS potvrdil_vecnou_spravnost_titul_za,
            u_vecna.email AS potvrdil_vecnou_spravnost_email,
            u_predana.jmeno AS fa_predana_zam_jmeno,
            u_predana.prijmeni AS fa_predana_zam_prijmeni,
            u_predana.titul_pred AS fa_predana_zam_titul_pred,
            u_predana.titul_za AS fa_predana_zam_titul_za,
            u_aktualizoval.jmeno AS aktualizoval_jmeno,
            u_aktualizoval.prijmeni AS aktualizoval_prijmeni,
            u_aktualizoval.titul_pred AS aktualizoval_titul_pred,
            u_aktualizoval.titul_za AS aktualizoval_titul_za
        FROM `$faktury_table` f
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
        LEFT JOIN `25_smlouvy` sm ON f.smlouva_id = sm.id
        LEFT JOIN `25_uzivatele` u_vytvoril ON f.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_obj ON o.uzivatel_id = u_obj.id
        LEFT JOIN `25_organizace_vizitka` org ON u_obj.organizace_id = org.id
        LEFT JOIN `25_useky` us_obj ON u_obj.usek_id = us_obj.id
        LEFT JOIN `" . TBL_FAKTURY_PRILOHY . "` prilohy ON f.id = prilohy.faktura_id
        LEFT JOIN `25_ciselnik_stavy` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
        LEFT JOIN `25_uzivatele` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
        LEFT JOIN `25_uzivatele` u_predana ON f.fa_predana_zam_id = u_predana.id
        LEFT JOIN `25_uzivatele` u_aktualizoval ON f.aktualizoval_uzivatel_id = u_aktualizoval.id
        WHERE $where_sql
        GROUP BY f.id
        ORDER BY f.dt_aktualizace DESC, f.id DESC";
        

        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);
        

        
        // 6. VRÁTIT PŘÍMÉ POLE (ne paginated response)
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($faktury, JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("[InvoicesExport] ❌ Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání faktur: ' . $e->getMessage()));
    }
}
