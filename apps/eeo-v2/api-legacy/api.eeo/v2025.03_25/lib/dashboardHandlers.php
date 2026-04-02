<?php
/**
 * Dashboard Handlers - Agregovaný endpoint pro uživatelský dashboard
 * 
 * POST /api.eeo/dashboard/data
 * Vrací všechna data potřebná pro dashboard na základě rolí uživatele.
 * 
 * POST: {token, username, days: 7}
 * 
 * Response: {
 *   status: 'success',
 *   data: {
 *     user: {jmeno, prijmeni, role, ...},
 *     orders_stats: {total, ke_schvaleni, schvalena, ...},
 *     my_orders_pending: [...],
 *     my_invoices_pending: [...],
 *     alerts: [...],
 *     notifications_unread: [...],
 *     orders_for_approval: [...],
 *     invoices_overdue: [...],
 *     invoices_due_soon: [...],
 *     orders_for_registry: [...],
 *     orders_published: [...],
 *     chart_orders_timeline: [...],
 *     top_suppliers: [...]
 *   }
 * }
 */

/**
 * POST /api.eeo/dashboard/data
 */
function handle_dashboard_data($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $days = isset($input['days']) ? (int)$input['days'] : 7;

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $token_data = verify_token_v2($username, $token, $db);
        if (!$token_data) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
            return;
        }

        $user_id = (int)$token_data['id'];
        $is_admin = !empty($token_data['is_admin']);
        $roles = $token_data['roles'] ?? [];
        $permissions = $token_data['permissions'] ?? [];

        // Načtení detailu uživatele
        $user_info = _dashboard_get_user_info($db, $user_id);

        // Detekce rolí
        $has_order_approve = in_array('ORDER_APPROVE', $permissions) || in_array('ORDER_APPROVE_ALL', $permissions) || $is_admin;
        $has_invoice_manage = in_array('INVOICE_MANAGE', $permissions) || in_array('INVOICE_EDIT_ALL', $permissions) || $is_admin;
        $has_invoice_check = in_array('INVOICE_MATERIAL_CHECK', $permissions) || in_array('FIN_CONTROL_MANAGE', $permissions) || $is_admin;
        $has_spending = in_array('SPENDING_MANAGE', $permissions) || in_array('LP_MANAGE', $permissions) || $is_admin;
        $has_registry = in_array('ORDER_REGISTRY_MANAGE', $permissions) || $is_admin;
        $has_order_read = in_array('ORDER_READ_ALL', $permissions) || in_array('ORDER_VIEW_ALL', $permissions) || in_array('ORDER_MANAGE', $permissions) || $is_admin;

        $date_from = date('Y-m-d', strtotime("-{$days} days"));
        $date_to = date('Y-m-d');

        $result = [
            'user' => $user_info,
            'roles_detected' => [
                'is_admin' => $is_admin,
                'has_order_approve' => $has_order_approve,
                'has_invoice_manage' => $has_invoice_manage,
                'has_invoice_check' => $has_invoice_check,
                'has_spending' => $has_spending,
                'has_registry' => $has_registry
            ]
        ];

        // === STATISTIKY OBJEDNÁVEK ===
        $usek_id = $user_info['usek_id'] ?? null;
        $result['orders_stats'] = _dashboard_get_order_stats($db, $user_id, $is_admin, $has_order_read, $permissions, $usek_id);

        // === MOJE OBJEDNÁVKY K AKCI ===
        $result['my_orders_pending'] = _dashboard_get_my_orders_pending($db, $user_id, $days);

        // === FAKTURY K VĚCNÉ KONTROLE ===
        if ($has_invoice_check || $has_invoice_manage) {
            $result['my_invoices_pending'] = _dashboard_get_invoices_pending_check($db, $user_id, $is_admin, $days);
        }

        // === OBJEDNÁVKY KE SCHVÁLENÍ (příkazce) ===
        if ($has_order_approve) {
            $result['orders_for_approval'] = _dashboard_get_orders_for_approval($db, $user_id, $is_admin, $days, $usek_id);
        }

        // === FAKTURY PO SPLATNOSTI / BLÍŽÍCÍ SE ===
        if ($has_invoice_manage || $has_order_approve) {
            $result['invoices_overdue'] = _dashboard_get_invoices_overdue($db, $user_id, $is_admin);
            $result['invoices_due_soon'] = _dashboard_get_invoices_due_soon($db, $user_id, $is_admin, $days);
        }

        // === REGISTR VZ - objednávky ke zveřejnění ===
        if ($has_registry) {
            $result['orders_for_registry'] = _dashboard_get_orders_for_registry($db);
            $result['orders_published_recent'] = _dashboard_get_orders_published($db, $days);
        }

        // === UPOZORNĚNÍ - prodlení ===
        $result['alerts'] = _dashboard_get_alerts($db, $user_id, $is_admin, $permissions);

        // === NEPŘEČTENÉ NOTIFIKACE ===
        $result['notifications_unread'] = _dashboard_get_notifications_unread($db, $user_id, 5);

        // === GRAF: OBJEDNÁVKY V ČASE (posledních 30 dní) ===
        $result['chart_orders_timeline'] = _dashboard_get_orders_timeline($db, $user_id, $is_admin, $has_order_read, 30);

        // === TOP DODAVATELÉ ===
        $result['top_suppliers'] = _dashboard_get_top_suppliers($db, $user_id, $is_admin, $has_order_read);

        // === SMLOUVY - KRITICKÝ STAV (dle úseku uživatele) ===
        $result['smlouvy_critical'] = _dashboard_get_smlouvy_critical($db, $user_id, $is_admin, $usek_id);

        // === LP - KRITICKÝ STAV (dle úseku uživatele) ===
        $result['lp_critical'] = _dashboard_get_lp_critical($db, $user_id, $is_admin, $usek_id);

        // === KOMENTÁŘE K OBJEDNÁVKÁM (kde je uživatel účastník) ===
        $result['order_comments_recent'] = _dashboard_get_order_comments_recent($db, $user_id, $days);

        // === STATISTIKY FAKTUR ===
        if ($has_invoice_check || $has_invoice_manage || $has_order_approve) {
            $result['invoices_stats'] = _dashboard_get_invoice_stats($db, $user_id, $is_admin, $has_invoice_manage);
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $result,
            'message' => 'Dashboard data načtena úspěšně'
        ]);

    } catch (Exception $e) {
        error_log("🏠 Dashboard Error: " . $e->getMessage() . " | User: {$username}");
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání dashboard dat: ' . $e->getMessage()
        ]);
    }
}

// ============================================================================
// HELPER FUNKCE
// ============================================================================

/**
 * Informace o uživateli
 */
function _dashboard_get_user_info($db, $user_id) {
    $stmt = $db->prepare("
        SELECT u.id, u.username, u.jmeno, u.prijmeni, u.email, u.telefon,
               u.pozice_id, u.usek_id,
               IFNULL(p.nazev_pozice, '') as pozice,
               IFNULL(us.usek_nazev, '') as usek_nazev,
               IFNULL(us.usek_zkr, '') as usek_zkr
        FROM `" . TBL_UZIVATELE . "` u
        LEFT JOIN `" . TBL_POZICE . "` p ON u.pozice_id = p.id
        LEFT JOIN `" . TBL_USEKY . "` us ON u.usek_id = us.id
        WHERE u.id = ? AND u.aktivni = 1
    ");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) return null;

    // Načtení rolí
    $stmt2 = $db->prepare("
        SELECT r.nazev_role, r.kod_role
        FROM `" . TBL_UZIVATELE_ROLE . "` ur
        JOIN `" . TBL_ROLE . "` r ON r.id = ur.role_id
        WHERE ur.uzivatel_id = ?
    ");
    $stmt2->execute([$user_id]);
    $user['roles'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    return $user;
}

/**
 * Statistiky objednávek - počty dle stavů
 */
function _dashboard_get_order_stats($db, $user_id, $is_admin, $has_order_read, $permissions, $usek_id = null) {
    $where_parts = ["o.aktivni = 1"];
    $params = [];

    // Rok filtr - aktuální rok
    $where_parts[] = "YEAR(o.dt_vytvoreni) = YEAR(CURDATE())";

    // Pokud není admin/read_all, filtruj dle účasti uživatele + úseku
    if (!$is_admin && !$has_order_read) {
        $user_conditions = ["o.objednatel_id = ?", "o.garant_uzivatel_id = ?", "o.prikazce_id = ?", "o.schvalovatel_id = ?"];
        $params = array_merge($params, [$user_id, $user_id, $user_id, $user_id]);

        // Příkazce vidí i objednávky svého úseku
        if ($usek_id && (in_array('ORDER_APPROVE', $permissions) || in_array('ORDER_APPROVE_ALL', $permissions))) {
            $user_conditions[] = "o.usek_id = ?";
            $params[] = $usek_id;
        }

        $where_parts[] = "(" . implode(' OR ', $user_conditions) . ")";
    }

    $where_sql = implode(' AND ', $where_parts);
    $sql = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'NOVA' THEN 1 ELSE 0 END) as nove,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI') THEN 1 ELSE 0 END) as ke_schvaleni,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'SCHVALENA' THEN 1 ELSE 0 END) as schvalena,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'ZAMITNUTA' THEN 1 ELSE 0 END) as zamitnuta,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'ROZPRACOVANA' THEN 1 ELSE 0 END) as rozpracovana,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) IN ('ODESLANA', 'ODESLANA_DODAVATELI') THEN 1 ELSE 0 END) as odeslana,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'POTVRZENA' THEN 1 ELSE 0 END) as potvrzena,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'FAKTURACE' THEN 1 ELSE 0 END) as fakturace,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'VECNA_SPRAVNOST' THEN 1 ELSE 0 END) as vecna_spravnost,
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
                        IN ('POTVRZENA', 'FAKTURACE', 'VECNA_SPRAVNOST')
                    AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 7
                THEN 1 ELSE 0 
            END) as fakturace_prodleni,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'ZKONTROLOVANA' THEN 1 ELSE 0 END) as zkontrolovana,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT' THEN 1 ELSE 0 END) as k_uverejneni_do_registru,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'UVEREJNENA' THEN 1 ELSE 0 END) as uverejnena,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'DOKONCENA' THEN 1 ELSE 0 END) as dokoncena,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'ZRUSENA' THEN 1 ELSE 0 END) as zrusena,
            COALESCE(SUM(o.max_cena_s_dph), 0) as celkova_castka
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE {$where_sql}
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Moje objednávky čekající na akci
 */
function _dashboard_get_my_orders_pending($db, $user_id, $days) {
    $stmt = $db->prepare("
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni,
               JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) as aktualni_stav,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        WHERE o.aktivni = 1
          AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) 
              IN ('NOVA', 'ROZPRACOVANA', 'SCHVALENA', 'VECNA_SPRAVNOST', 'ODESLANA', 'ODESLANA_DODAVATELI')
          AND o.dt_vytvoreni >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY o.dt_vytvoreni DESC
        LIMIT 10
    ");
    $stmt->execute([$user_id, $user_id, $days]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Faktury čekající na věcnou kontrolu
 */
function _dashboard_get_invoices_pending_check($db, $user_id, $is_admin, $days) {
    $where_user = $is_admin ? "" : "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ?)";
    $params = $is_admin ? [$days] : [$user_id, $user_id, $days];

    $stmt = $db->prepare("
        SELECT f.id, f.fa_cislo_vema as fa_cislo, f.fa_castka, f.fa_datum_splatnosti, f.stav,
               o.dodavatel_nazev as fa_dodavatel_nazev, f.objednavka_id,
               o.cislo_objednavky, o.predmet,
               DATEDIFF(f.fa_datum_splatnosti, CURDATE()) as dni_do_splatnosti,
               u_vyt.jmeno as vytvoril_jmeno, u_vyt.prijmeni as vytvoril_prijmeni,
               u_pred.jmeno as fa_predana_zam_jmeno, u_pred.prijmeni as fa_predana_zam_prijmeni,
               f.smlouva_id, sm.cislo_smlouvy
        FROM `" . TBL_FAKTURY . "` f
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON o.id = f.objednavka_id
        LEFT JOIN `" . TBL_SMLOUVY . "` sm ON sm.id = f.smlouva_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_vyt ON u_vyt.id = f.vytvoril_uzivatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_pred ON u_pred.id = f.fa_predana_zam_id
        WHERE f.aktivni = 1
          AND f.stav IN ('ZAEVIDOVANA', 'VECNA_SPRAVNOST')
          {$where_user}
          AND f.dt_vytvoreni >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY f.fa_datum_splatnosti ASC
        LIMIT 10
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Objednávky ke schválení (pro příkazce)
 */
function _dashboard_get_orders_for_approval($db, $user_id, $is_admin, $days, $usek_id = null) {
    $where_user = "";
    $params = [];

    if (!$is_admin) {
        $conditions = ["o.prikazce_id = ?", "o.schvalovatel_id = ?"];
        $params[] = $user_id;
        $params[] = $user_id;
        // Příkazce vidí i objednávky svého úseku ke schválení
        if ($usek_id) {
            $conditions[] = "o.usek_id = ?";
            $params[] = $usek_id;
        }
        $where_user = "AND (" . implode(' OR ', $conditions) . ")";
    }
    $params[] = $days;

    $stmt = $db->prepare("
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni,
               DATEDIFF(CURDATE(), o.dt_vytvoreni) as dni_od_vytvoreni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        WHERE o.aktivni = 1
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) 
              IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI')
          {$where_user}
          AND o.dt_vytvoreni >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY o.dt_vytvoreni ASC
        LIMIT 15
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Faktury po splatnosti
 */
function _dashboard_get_invoices_overdue($db, $user_id, $is_admin) {
    $where_user = $is_admin ? "" : "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ? OR o.prikazce_id = ?)";
    $params = $is_admin ? [] : [$user_id, $user_id, $user_id];

    $stmt = $db->prepare("
        SELECT f.id, f.fa_cislo_vema as fa_cislo, f.fa_castka, f.fa_datum_splatnosti, f.stav,
               o.dodavatel_nazev as fa_dodavatel_nazev, f.objednavka_id,
               o.cislo_objednavky, o.predmet,
               DATEDIFF(CURDATE(), f.fa_datum_splatnosti) as dni_po_splatnosti,
               u_vyt.jmeno as vytvoril_jmeno, u_vyt.prijmeni as vytvoril_prijmeni,
               u_pred.jmeno as fa_predana_zam_jmeno, u_pred.prijmeni as fa_predana_zam_prijmeni,
               f.smlouva_id, sm.cislo_smlouvy
        FROM `" . TBL_FAKTURY . "` f
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON o.id = f.objednavka_id
        LEFT JOIN `" . TBL_SMLOUVY . "` sm ON sm.id = f.smlouva_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_vyt ON u_vyt.id = f.vytvoril_uzivatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_pred ON u_pred.id = f.fa_predana_zam_id
        WHERE f.aktivni = 1
          AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO')
          AND f.fa_datum_splatnosti < CURDATE()
          {$where_user}
        ORDER BY f.fa_datum_splatnosti ASC
        LIMIT 15
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Faktury blížící se ke splatnosti
 */
function _dashboard_get_invoices_due_soon($db, $user_id, $is_admin, $days) {
    $where_user = $is_admin ? "" : "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ? OR o.prikazce_id = ?)";
    $params = $is_admin ? [$days] : [$user_id, $user_id, $user_id, $days];

    $stmt = $db->prepare("
        SELECT f.id, f.fa_cislo_vema as fa_cislo, f.fa_castka, f.fa_datum_splatnosti, f.stav,
               o.dodavatel_nazev as fa_dodavatel_nazev, f.objednavka_id,
               o.cislo_objednavky, o.predmet,
               DATEDIFF(f.fa_datum_splatnosti, CURDATE()) as dni_do_splatnosti,
               u_vyt.jmeno as vytvoril_jmeno, u_vyt.prijmeni as vytvoril_prijmeni,
               u_pred.jmeno as fa_predana_zam_jmeno, u_pred.prijmeni as fa_predana_zam_prijmeni,
               f.smlouva_id, sm.cislo_smlouvy
        FROM `" . TBL_FAKTURY . "` f
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON o.id = f.objednavka_id
        LEFT JOIN `" . TBL_SMLOUVY . "` sm ON sm.id = f.smlouva_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_vyt ON u_vyt.id = f.vytvoril_uzivatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_pred ON u_pred.id = f.fa_predana_zam_id
        WHERE f.aktivni = 1
          AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO')
          AND f.fa_datum_splatnosti >= CURDATE()
          AND f.fa_datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
          {$where_user}
        ORDER BY f.fa_datum_splatnosti ASC
        LIMIT 15
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Objednávky ke zveřejnění v registru VZ
 */
function _dashboard_get_orders_for_registry($db) {
    $stmt = $db->prepare("
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        WHERE o.aktivni = 1
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) 
              IN ('K_UVEREJNENI', 'CEKA_NA_UVEREJNENI')
        ORDER BY o.dt_vytvoreni ASC
        LIMIT 20
    ");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Objednávky nedávno zveřejněné
 */
function _dashboard_get_orders_published($db, $days) {
    $stmt = $db->prepare("
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        WHERE o.aktivni = 1
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) 
              = 'UVEREJNENA'
          AND o.dt_aktualizace >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY o.dt_aktualizace DESC
        LIMIT 10
    ");
    $stmt->execute([$days]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Upozornění na prodlení
 */
function _dashboard_get_alerts($db, $user_id, $is_admin, $permissions) {
    $alerts = [];

    // 1. Objednávky v prodlení - ve fázi fakturace (POTVRZENA až VECNA_SPRAVNOST), bez akce >7 dní
    $where_user = $is_admin ? "" : "AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ? OR o.prikazce_id = ?)";
    $params = $is_admin ? [] : [$user_id, $user_id, $user_id];

    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE o.aktivni = 1
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
              IN ('POTVRZENA', 'FAKTURACE', 'VECNA_SPRAVNOST')
          AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 7
          {$where_user}
    ");
    $stmt->execute($params);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row['count'] > 0) {
        $alerts[] = [
            'type' => 'warning',
            'icon' => 'clock',
            'title' => 'Objednávky v prodlení',
            'message' => $row['count'] . ' objednávek ve fakturaci čeká na akci déle než 7 dní',
            'count' => (int)$row['count'],
            'link' => '/orders25-list-v3'
        ];
    }

    // 2. Nepotvrzené faktury (>7 dní)
    $has_invoice = in_array('INVOICE_MANAGE', $permissions) || in_array('INVOICE_MATERIAL_CHECK', $permissions) || $is_admin;
    if ($has_invoice) {
        $where_user2 = $is_admin ? "" : "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ?)";
        $params2 = $is_admin ? [] : [$user_id, $user_id];

        $stmt2 = $db->prepare("
            SELECT COUNT(*) as count
            FROM `" . TBL_FAKTURY . "` f
            WHERE f.aktivni = 1
              AND f.stav IN ('ZAEVIDOVANA', 'VECNA_SPRAVNOST')
              AND DATEDIFF(CURDATE(), f.dt_vytvoreni) > 7
              {$where_user2}
        ");
        $stmt2->execute($params2);
        $row2 = $stmt2->fetch(PDO::FETCH_ASSOC);
        if ($row2['count'] > 0) {
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'exclamation-triangle',
                'title' => 'Nepotvrzené faktury',
                'message' => $row2['count'] . ' faktur čeká na potvrzení déle než 7 dní',
                'count' => (int)$row2['count'],
                'link' => '/invoices25-list'
            ];
        }
    }

    // 3. Faktury po splatnosti
    if ($has_invoice || in_array('ORDER_APPROVE', $permissions) || $is_admin) {
        $where_user3 = $is_admin ? "" : "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ?)";
        $params3 = $is_admin ? [] : [$user_id, $user_id];

        $stmt3 = $db->prepare("
            SELECT COUNT(*) as count
            FROM `" . TBL_FAKTURY . "` f
            WHERE f.aktivni = 1
              AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO')
              AND f.fa_datum_splatnosti < CURDATE()
              {$where_user3}
        ");
        $stmt3->execute($params3);
        $row3 = $stmt3->fetch(PDO::FETCH_ASSOC);
        if ($row3['count'] > 0) {
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'exclamation-circle',
                'title' => 'Faktury po splatnosti',
                'message' => $row3['count'] . ' faktur je po datu splatnosti',
                'count' => (int)$row3['count'],
                'link' => '/invoices25-list'
            ];
        }
    }

    return $alerts;
}

/**
 * Nepřečtené notifikace
 */
function _dashboard_get_notifications_unread($db, $user_id, $limit) {
    $stmt = $db->prepare("
        SELECT n.id, n.typ, n.nadpis, n.zprava, n.priorita, n.kategorie,
               n.objekt_typ, n.objekt_id, n.dt_created,
               nr.precteno, nr.skryto
        FROM `" . TBL_NOTIFIKACE . "` n
        INNER JOIN `" . TBL_NOTIFIKACE_PRECTENI . "` nr 
            ON n.id = nr.notifikace_id
        WHERE n.aktivni = 1
          AND nr.uzivatel_id = ?
          AND nr.precteno = 0
          AND nr.smazano = 0
          AND nr.skryto = 0
          AND (n.dt_expires IS NULL OR n.dt_expires > NOW())
        ORDER BY n.dt_created DESC
        LIMIT " . (int)$limit . "
    ");
    $stmt->execute([$user_id]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Graf: denní počty objednávek za posledních N dní
 */
function _dashboard_get_orders_timeline($db, $user_id, $is_admin, $has_order_read, $days) {
    $where_user = "";
    $params = [$days];

    if (!$is_admin && !$has_order_read) {
        $where_user = "AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)";
        $params = array_merge($params, [$user_id, $user_id]);
    }

    $stmt = $db->prepare("
        SELECT DATE(o.dt_vytvoreni) as den, 
               COUNT(*) as pocet,
               COALESCE(SUM(o.max_cena_s_dph), 0) as castka
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE o.aktivni = 1
          AND o.dt_vytvoreni >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          {$where_user}
        GROUP BY DATE(o.dt_vytvoreni)
        ORDER BY den ASC
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Top dodavatelé (za aktuální rok)
 */
function _dashboard_get_top_suppliers($db, $user_id, $is_admin, $has_order_read) {
    $where_user = "";
    $params = [];

    if (!$is_admin && !$has_order_read) {
        $where_user = "AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)";
        $params = [$user_id, $user_id];
    }

    $stmt = $db->prepare("
        SELECT o.dodavatel_nazev, 
               COUNT(*) as pocet_objednavek,
               COALESCE(SUM(o.max_cena_s_dph), 0) as celkova_castka
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE o.aktivni = 1
          AND o.dodavatel_nazev IS NOT NULL
          AND o.dodavatel_nazev != ''
          AND YEAR(o.dt_vytvoreni) = YEAR(CURDATE())
          {$where_user}
        GROUP BY o.dodavatel_nazev
        ORDER BY celkova_castka DESC
        LIMIT 8
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Smlouvy v kritickém stavu - dle úseku uživatele
 * Kritický stav = čerpání >= 75% stropní ceny NEBO platnost končí do 30 dnů
 * Pouze AKTIVNÍ smlouvy (ne ukončené)
 */
function _dashboard_get_smlouvy_critical($db, $user_id, $is_admin, $usek_id) {
    $where_usek = "";
    $params = [];

    // Admin vidí všechny, ostatní jen svůj úsek
    if (!$is_admin && $usek_id) {
        $where_usek = "AND s.usek_id = ?";
        $params[] = $usek_id;
    } elseif (!$is_admin && !$usek_id) {
        return ['items' => [], 'stats' => ['celkem_aktivnich' => 0, 'blizi_se_vycerpani' => 0, 'blizi_se_konec' => 0, 'celkem_hodnota' => 0, 'celkem_cerpano' => 0]];
    }

    // 1. Stats - celkový přehled aktivních smluv
    $stmt_stats = $db->prepare("
        SELECT 
            COUNT(*) as celkem_aktivnich,
            SUM(CASE WHEN s.procento_cerpani >= 75 THEN 1 ELSE 0 END) as blizi_se_vycerpani,
            SUM(CASE WHEN s.platnost_do <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND s.platnost_do >= CURDATE() THEN 1 ELSE 0 END) as blizi_se_konec,
            COALESCE(SUM(s.hodnota_s_dph), 0) as celkem_hodnota,
            COALESCE(SUM(s.cerpano_celkem), 0) as celkem_cerpano
        FROM `" . TBL_SMLOUVY . "` s
        WHERE s.aktivni = 1
          AND (s.platnost_do IS NULL OR CURDATE() <= s.platnost_do)
          {$where_usek}
    ");
    $stmt_stats->execute($params);
    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);

    // 2. Konkrétní kritické smlouvy (blíží se vyčerpání nebo konec platnosti)
    $stmt = $db->prepare("
        SELECT s.id, s.cislo_smlouvy, s.nazev_smlouvy,
               s.platnost_od, s.platnost_do,
               s.hodnota_s_dph, s.cerpano_celkem, s.zbyva,
               IFNULL(us.usek_nazev, '') as usek_nazev,
               IFNULL(us.usek_zkr, '') as usek_zkr,
               DATEDIFF(s.platnost_do, CURDATE()) as dnu_do_konce,
               LEAST(s.procento_cerpani, 100.0) as procento_cerpani,
               CASE
                   WHEN s.procento_cerpani >= 90 THEN 'CERPANI_KRITICKE'
                   WHEN s.procento_cerpani >= 75 THEN 'CERPANI_VYSOKE'
                   WHEN s.platnost_do <= DATE_ADD(CURDATE(), INTERVAL 14 DAY) AND s.platnost_do >= CURDATE() THEN 'KONCI_BRZY'
                   WHEN s.platnost_do <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND s.platnost_do >= CURDATE() THEN 'KONCI_DO_MESICE'
                   ELSE 'WARNING'
               END as typ_kriticky
        FROM `" . TBL_SMLOUVY . "` s
        LEFT JOIN `" . TBL_USEKY . "` us ON s.usek_id = us.id
        WHERE s.aktivni = 1
          AND (s.platnost_do IS NULL OR CURDATE() <= s.platnost_do)
          AND (
              (s.platnost_do <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND s.platnost_do >= CURDATE())
              OR (s.procento_cerpani >= 75)
          )
          {$where_usek}
        ORDER BY 
          CASE
              WHEN s.procento_cerpani >= 90 THEN 0
              WHEN s.platnost_do <= DATE_ADD(CURDATE(), INTERVAL 14 DAY) THEN 1
              WHEN s.procento_cerpani >= 75 THEN 2
              ELSE 3
          END ASC,
          s.platnost_do ASC
        LIMIT 15
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'items' => $items,
        'stats' => $stats
    ];
}

/**
 * Přehled LP v kritickém stavu (blíží se vyčerpání nebo už překročené)
 * @param PDO $db Database connection
 * @param int $user_id Current user ID
 * @param bool $is_admin Je admin?
 * @param int|null $usek_id ID úseku uživatele
 * @return array LP critical stats
 */
function _dashboard_get_lp_critical($db, $user_id, $is_admin, $usek_id) {
    $where_usek = "";
    $params = [date('Y')]; // Aktuální rok

    // Admin vidí všechny, ostatní jen svůj úsek
    if (!$is_admin && $usek_id) {
        $where_usek = "AND c.usek_id = ?";
        $params[] = $usek_id;
    } elseif (!$is_admin && !$usek_id) {
        return ['items' => [], 'stats' => ['celkem_aktivnich' => 0, 'stredni' => 0, 'vysoke' => 0, 'kriticke' => 0, 'prekrocene' => 0, 'celkem_limit' => 0, 'celkem_cerpano' => 0]];
    }

    // 1. Stats - celkový přehled LP pro aktuální rok
    $stmt_stats = $db->prepare("
        SELECT 
            COUNT(*) as celkem_aktivnich,
            SUM(CASE WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.50 AND (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) < 0.75 THEN 1 ELSE 0 END) as stredni,
            SUM(CASE WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.75 AND (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) < 0.90 THEN 1 ELSE 0 END) as vysoke,
            SUM(CASE WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.90 AND (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) < 1.0 THEN 1 ELSE 0 END) as kriticke,
            SUM(CASE WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 1.0 THEN 1 ELSE 0 END) as prekrocene,
            COALESCE(SUM(c.celkovy_limit), 0) as celkem_limit,
            COALESCE(SUM(c.skutecne_cerpano), 0) as celkem_cerpano
        FROM `" . TBL_LIMITOVANE_PRISLIBY_CERPANI . "` c
        WHERE c.rok = ?
          AND c.celkovy_limit > 0
          {$where_usek}
    ");
    $stmt_stats->execute($params);
    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);

    // 2. Konkrétní kritické LP (blíží se vyčerpání >= 50%)
    $stmt = $db->prepare("
        SELECT c.id, c.cislo_lp, c.rok,
               c.celkovy_limit, c.skutecne_cerpano, c.zbyva_skutecne,
               IFNULL(u.usek_nazev, '') as usek_nazev,
               IFNULL(u.usek_zkr, '') as usek_zkr,
               CONCAT(IFNULL(uz.jmeno, ''), ' ', IFNULL(uz.prijmeni, '')) as spravce_jmeno,
               ROUND((c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) * 100, 2) as procento_cerpani,
               CASE
                   WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 1.0 THEN 'PREKROCENO'
                   WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.90 THEN 'CERPANI_KRITICKE'
                   WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.75 THEN 'CERPANI_VYSOKE'
                   WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.50 THEN 'CERPANI_STREDNI'
                   ELSE 'WARNING'
               END as typ_kriticky
        FROM `" . TBL_LIMITOVANE_PRISLIBY_CERPANI . "` c
        LEFT JOIN `" . TBL_USEKY . "` u ON c.usek_id = u.id
        LEFT JOIN `" . TBL_UZIVATELE . "` uz ON c.user_id = uz.id
        WHERE c.rok = ?
          AND c.celkovy_limit > 0
          AND (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.50
          {$where_usek}
        ORDER BY 
          CASE
              WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 1.0 THEN 0
              WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.90 THEN 1
              WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.75 THEN 2
              WHEN (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.50 THEN 3
              ELSE 4
          END ASC,
          (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) DESC
        LIMIT 20
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'items' => $items,
        'stats' => $stats
    ];
}

/**
 * Nedávné komentáře k objednávkám, kde je uživatel účastník
 */
function _dashboard_get_order_comments_recent($db, $user_id, $days = 7) {
    $date_from = date('Y-m-d', strtotime("-{$days} days"));

    $stmt = $db->prepare("
        SELECT k.id, k.objednavka_id, k.obsah_plain, k.dt_vytvoreni,
               o.cislo_objednavky, o.predmet,
               CONCAT(au.jmeno, ' ', au.prijmeni) as autor_jmeno,
               au.username as autor_username
        FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k
        INNER JOIN `" . TBL_OBJEDNAVKY . "` o ON k.objednavka_id = o.id AND o.aktivni = 1
        LEFT JOIN `" . TBL_UZIVATELE . "` au ON k.user_id = au.id
        WHERE k.smazano = 0
          AND k.dt_vytvoreni >= ?
          AND k.user_id != ?
          AND (
              o.uzivatel_id = ?
              OR o.objednatel_id = ?
              OR o.garant_uzivatel_id = ?
              OR o.schvalovatel_id = ?
              OR o.prikazce_id = ?
              OR o.odesilatel_id = ?
              OR o.fakturant_id = ?
              OR o.potvrdil_vecnou_spravnost_id = ?
          )
        ORDER BY k.dt_vytvoreni DESC
        LIMIT 20
    ");
    $stmt->execute([
        $date_from, $user_id,
        $user_id, $user_id, $user_id, $user_id,
        $user_id, $user_id, $user_id, $user_id
    ]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Statistiky faktur - počty dle klíčových stavů
 */
function _dashboard_get_invoice_stats($db, $user_id, $is_admin, $has_invoice_manage) {
    $where_user = "";
    $params = [];

    // Rok filtr
    $year_filter = "AND YEAR(f.dt_vytvoreni) = YEAR(CURDATE())";

    // Ne-admin vidí jen faktury kde je účastník
    if (!$is_admin && !$has_invoice_manage) {
        $where_user = "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ? OR f.vytvoril_uzivatel_id = ?)";
        $params = [$user_id, $user_id, $user_id];
    }

    $uid = (int)$user_id;
    // ✅ OPRAVENO: Logika musí odpovídat invoiceHandlers.php
    // - DOKONCENA = zaplaceno/hotovo (vyloučit z po_splatnosti, nezaplaceno atd.)
    // - Kontrola dle stav, NE dle fa_zaplacena (ta bývá neaktuální)
    $sql = "
        SELECT
            COUNT(*) as total,
            COALESCE(SUM(f.fa_castka), 0) as celkova_castka,
            SUM(CASE WHEN f.stav = 'VECNA_SPRAVNOST' THEN 1 ELSE 0 END) as vecna_spravnost,
            SUM(CASE WHEN f.stav IN ('ZAPLACENO', 'DOKONCENA') THEN 1 ELSE 0 END) as zaplaceno,
            SUM(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') THEN 1 ELSE 0 END) as nezaplaceno,
            SUM(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti >= CURDATE() THEN 1 ELSE 0 END) as ve_splatnosti,
            SUM(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE() THEN 1 ELSE 0 END) as po_splatnosti,
            SUM(CASE WHEN f.stav = 'STORNO' THEN 1 ELSE 0 END) as storno,
            SUM(CASE WHEN (f.objednavka_id IS NULL OR f.objednavka_id = 0) AND (f.smlouva_id IS NULL OR f.smlouva_id = 0) THEN 1 ELSE 0 END) as bez_prirazeni,
            SUM(CASE WHEN f.objednavka_id IS NOT NULL AND f.objednavka_id > 0 THEN 1 ELSE 0 END) as s_objednavkou,
            SUM(CASE WHEN f.smlouva_id IS NOT NULL AND f.smlouva_id > 0 THEN 1 ELSE 0 END) as se_smlouvou,
            SUM(CASE WHEN f.vecna_spravnost_potvrzeno = 1 THEN 1 ELSE 0 END) as zkontrolovano,
            SUM(CASE WHEN f.fa_poznamka IS NOT NULL AND TRIM(f.fa_poznamka) <> '' THEN 1 ELSE 0 END) as s_poznamkou,
            SUM(CASE WHEN f.vytvoril_uzivatel_id = {$uid} THEN 1 ELSE 0 END) as moje_faktury,
            COALESCE(SUM(CASE WHEN f.stav IN ('ZAPLACENO', 'DOKONCENA') THEN f.fa_castka ELSE 0 END), 0) as castka_zaplaceno,
            COALESCE(SUM(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE() THEN f.fa_castka ELSE 0 END), 0) as castka_po_splatnosti
        FROM `" . TBL_FAKTURY . "` f
        WHERE f.aktivni = 1
          {$year_filter}
          {$where_user}
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}
