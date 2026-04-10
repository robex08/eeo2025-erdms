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
        $is_superadmin = in_array('SUPERADMIN', $roles);

        // Načtení detailu uživatele
        $user_info = _dashboard_get_user_info($db, $user_id);

        // === DASHBOARD CAPABILITIES (nový systém – z DASHBOARD_* práv) ===
        // $permissions je pole asociativních polí [{kod_prava: "...", popis: "..."}, ...]
        $perm_codes = array_column($permissions, 'kod_prava');
        $dashboard_caps = [];
        foreach ($perm_codes as $p) {
            if (strpos($p, 'DASHBOARD_') === 0) {
                $dashboard_caps[] = $p;
            }
        }
        // === CASHBOOK PŘÍSTUP - dynamicky přidat DASHBOARD_CASH_BOOK ===
        $cash_perm_codes_list = ['CASH_BOOK_MANAGE', 'CASH_BOOK_READ_ALL', 'CASH_BOOK_READ_OWN',
                                 'CASH_BOOK_EDIT_ALL', 'CASH_BOOK_EDIT_OWN',
                                 'CASH_BOOK_EXPORT_ALL', 'CASH_BOOK_EXPORT_OWN'];
        $has_cashbook_perm = $is_admin || !empty(array_intersect($perm_codes, $cash_perm_codes_list));
        if ($has_cashbook_perm) {
            if ($is_admin) {
                $dashboard_caps[] = 'DASHBOARD_CASH_BOOK';
            } else {
                $stmt_cbk = $db->prepare("SELECT COUNT(*) FROM `" . TBL_POKLADNY_UZIVATELE . "` WHERE uzivatel_id = ? AND (platne_do IS NULL OR platne_do >= CURDATE())");
                $stmt_cbk->execute([$user_id]);
                if ((int)$stmt_cbk->fetchColumn() > 0) {
                    $dashboard_caps[] = 'DASHBOARD_CASH_BOOK';
                }
            }
        }

        // Admin vidí vše
        $has_cap = function($cap) use ($dashboard_caps, $is_admin) {
            return $is_admin || in_array($cap, $dashboard_caps);
        };

        // Zpětná kompatibilita – staré flagy pro SQL dotazy uvnitř widgetů
        $has_order_approve = $has_cap('DASHBOARD_ORDERS_APPROVE');
        $has_invoice_manage = $has_cap('DASHBOARD_INVOICES_OVERDUE') || $has_cap('DASHBOARD_INVOICES_DUE_SOON');

        // ✅ Invoice admin flag – zrcadlí invoiceHandlers.php logiku (zahrnuje UCETNI, HLAVNI_UCETNI, KONTROLOR_FAKTUR)
        // BUG FIX: $has_invoice_manage používal DASHBOARD_* caps, ne skutečné INVOICE_MANAGE oprávnění
        $is_invoice_admin = $is_admin
            || in_array('UCETNI', $roles)
            || in_array('HLAVNI_UCETNI', $roles)
            || in_array('KONTROLOR_FAKTUR', $roles)
            || in_array('INVOICE_MANAGE', $perm_codes);
        $has_invoice_check = $has_cap('DASHBOARD_INVOICES_CONFIRM');
        $has_spending = $has_cap('DASHBOARD_SPENDING_CONTRACTS') || $has_cap('DASHBOARD_SPENDING_LP');
        $has_registry = $has_cap('DASHBOARD_ORDERS_REGISTRY') || $has_cap('DASHBOARD_ORDERS_PUBLISHED');
        $has_order_read = in_array('ORDER_READ_ALL', $perm_codes) || in_array('ORDER_VIEW_ALL', $perm_codes) || in_array('ORDER_MANAGE', $perm_codes) || $is_admin;

        $date_from = date('Y-m-d', strtotime("-{$days} days"));
        $date_to = date('Y-m-d');

        $result = [
            'user' => $user_info,
            'dashboard_capabilities' => $dashboard_caps,
            'roles_detected' => [
                'is_admin' => $is_admin,
                'has_order_approve' => $has_order_approve,
                'has_invoice_manage' => $has_invoice_manage,
                'has_invoice_check' => $has_invoice_check,
                'has_spending' => $has_spending,
                'has_registry' => $has_registry
            ]
        ];

        // === SVÁTEK (nameday) ===
        $namedays = cz_get_namedays_list();
        $today_key = date('j.n.');
        $result['nameday'] = $namedays[$today_key] ?? null;

        // === CO NOVÉHO OD POSLEDNÍHO PŘIHLÁŠENÍ ===
        $last_login = $user_info['dt_posledni_prihlaseni'] ?? null;
        $result['news_since_login'] = _dashboard_get_news_since_login($db, $user_id, $is_admin, $perm_codes, $last_login, $usek_id ?? null);

        // === STATISTIKY OBJEDNÁVEK ===
        // Vždy načíst – potřebné pro QuickTiles v hlavičce (widget zobrazení řídí frontend dle DASHBOARD_ORDERS_STATS)
        $usek_id = $user_info['usek_id'] ?? null;
        $result['orders_stats'] = _dashboard_get_order_stats($db, $user_id, $is_admin, $has_order_read, $perm_codes, $usek_id);

        // === MOJE OBJEDNÁVKY K AKCI ===
        $result['my_orders_pending'] = _dashboard_get_my_orders_pending($db, $user_id, $days, $has_order_approve);

        // === FAKTURY K VĚCNÉ KONTROLE ===
        if ($has_cap('DASHBOARD_INVOICES_CONFIRM')) {
            $result['my_invoices_pending'] = _dashboard_get_invoices_pending_check($db, $user_id, $is_admin, $days, $usek_id);
        }

        // === OBJEDNÁVKY KE SCHVÁLENÍ (příkazce) ===
        if ($has_cap('DASHBOARD_ORDERS_APPROVE')) {
            $result['orders_for_approval'] = _dashboard_get_orders_for_approval($db, $user_id, $is_admin, $days, $usek_id);
        }

        // === FAKTURY PO SPLATNOSTI ===
        if ($has_cap('DASHBOARD_INVOICES_OVERDUE')) {
            $result['invoices_overdue'] = _dashboard_get_invoices_overdue($db, $user_id, $is_admin, $usek_id);
        }

        // === FAKTURY BLÍŽÍCÍ SE SPLATNOSTI ===
        if ($has_cap('DASHBOARD_INVOICES_DUE_SOON')) {
            $result['invoices_due_soon'] = _dashboard_get_invoices_due_soon($db, $user_id, $is_admin, $days, $usek_id);
        }

        // === REGISTR VZ - objednávky ke zveřejnění ===
        if ($has_cap('DASHBOARD_ORDERS_REGISTRY')) {
            $result['orders_for_registry'] = _dashboard_get_orders_for_registry($db);
        }

        // === REGISTR VZ - zveřejněné objednávky ===
        if ($has_cap('DASHBOARD_ORDERS_PUBLISHED')) {
            $result['orders_published_recent'] = _dashboard_get_orders_published($db, $days);
        }

        // === UPOZORNĚNÍ - prodlení ===
        $result['alerts'] = _dashboard_get_alerts($db, $user_id, $is_admin, $perm_codes);

        // === FOCUS ALERTS – personalizované kritické zprávy pod welcome card ===
        $result['focus_alerts'] = _dashboard_get_focus_alerts($db, $user_id, $is_admin, $perm_codes, $has_cap, $usek_id);

        // === NEPŘEČTENÉ NOTIFIKACE ===
        $result['notifications_unread'] = _dashboard_get_notifications_unread($db, $user_id, 5);

        // === GRAF: OBJEDNÁVKY V ČASE (posledních 30 dní) ===
        if ($has_cap('DASHBOARD_CHART_TIMELINE')) {
            $timeline_result = _dashboard_get_orders_timeline($db, $user_id, $is_admin, $has_order_read, 30);
            $result['chart_orders_timeline'] = $timeline_result['items'];
        }

        // === TOP DODAVATELÉ ===
        if ($has_cap('DASHBOARD_TOP_SUPPLIERS')) {
            $result['top_suppliers'] = _dashboard_get_top_suppliers($db, $user_id, $is_admin, $has_order_read);
        }

        // === SMLOUVY - KRITICKÝ STAV (dle úseku uživatele) ===
        if ($has_cap('DASHBOARD_SPENDING_CONTRACTS')) {
            $result['smlouvy_critical'] = _dashboard_get_smlouvy_critical($db, $user_id, $is_admin, $usek_id);
        }

        // === LP - KRITICKÝ STAV (dle úseku uživatele) ===
        if ($has_cap('DASHBOARD_SPENDING_LP')) {
            $result['lp_critical'] = _dashboard_get_lp_critical($db, $user_id, $is_admin, $usek_id);
        }

        // === ROČNÍ POPLATKY - SPLATNOST ===
        if ($has_cap('DASHBOARD_ANNUAL_FEES')) {
            $result['annual_fees_due'] = _dashboard_get_annual_fees_due($db);
        }

        // === POKLADNA - PŘEHLED (aktuální nebo vybraný měsíc) ===
        if ($has_cap('DASHBOARD_CASH_BOOK')) {
            $cashbook_month = isset($input['cashbook_month']) ? (int)$input['cashbook_month'] : (int)date('n');
            if ($cashbook_month < 1 || $cashbook_month > 12) $cashbook_month = (int)date('n');
            $result['cashbook_summary'] = _dashboard_get_cashbook_summary($db, $user_id, $is_admin, $perm_codes, $cashbook_month);
        }

        // === KOMENTÁŘE K OBJEDNÁVKÁM (kde je uživatel účastník) ===
        $result['order_comments_recent'] = _dashboard_get_order_comments_recent($db, $user_id, $days);

        // === STATISTIKY FAKTUR ===
        if ($has_cap('DASHBOARD_INVOICES_STATS')) {
            $result['invoices_stats'] = _dashboard_get_invoice_stats($db, $user_id, $is_invoice_admin, $is_invoice_admin, $usek_id);
        }

        // === AKTIVNÍ UŽIVATELÉ (pouze SUPERADMIN, vždy posledni blok) ===
        if ($is_superadmin) {
            $result['active_users_admin'] = _dashboard_get_active_users($db);
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
               u.pozice_id, u.usek_id, u.dt_posledni_prihlaseni,
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
 * Používá stejnou logiku oprávnění jako OrderV3 (applyOrderV3UserPermissions).
 * Parametry $is_admin, $has_order_read, $permissions, $usek_id jsou zachovány
 * kvůli zpětné kompatibilitě volání, ale oprávnění řeší applyOrderV3UserPermissions.
 */
function _dashboard_get_order_stats($db, $user_id, $is_admin, $has_order_read, $permissions, $usek_id = null) {
    $where_parts = ["o.aktivni = 1", "o.id != 1"];
    $params = [];

    // Rok filtr - stejný jako OrderV3 (dt_objednavky = datum objednávky)
    $where_parts[] = "YEAR(o.dt_objednavky) = YEAR(CURDATE())";

    // Oprávnění uživatele - shodně s OrderV3 (12 polí + hierarchie + úsek/podřízení)
    applyOrderV3UserPermissions($user_id, $db, $where_parts, $params);

    $where_sql = implode(' AND ', $where_parts);
    $sql = "
        SELECT 
            COUNT(*) as total,
            -- NOVA je vždy první stav v poli ($[0]) - stejná logika jako OrderV3
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = 'NOVA' THEN 1 ELSE 0 END) as nove,
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
            SUM(CASE 
                WHEN (
                    (
                        JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT'
                        OR " . sqlNormalizeExpression('o.zverejnit') . " = 'ano'
                        OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'ke zverejneni'
                    )
                    AND NOT (
                        (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                        OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
                    )
                ) THEN 1 ELSE 0 
            END) as k_uverejneni_do_registru,
            SUM(CASE 
                WHEN (
                    (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                    OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
                ) THEN 1 ELSE 0 
            END) as uverejnena,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'DOKONCENA' THEN 1 ELSE 0 END) as dokoncena,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'ZRUSENA' THEN 1 ELSE 0 END) as zrusena,
            -- Celková částka: stejná priorita jako OrderV3 (faktury > položky > max_cena_s_dph)
            COALESCE(SUM(
                CASE
                    WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                    THEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                    WHEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id) > 0
                    THEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id)
                    ELSE COALESCE(o.max_cena_s_dph, 0)
                END
            ), 0) as celkova_castka
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
function _dashboard_get_my_orders_pending($db, $user_id, $days, $has_order_approve = false) {
    $active_states = "('NOVA', 'ROZPRACOVANA', 'SCHVALENA', 'VECNA_SPRAVNOST', 'ODESLANA', 'ODESLANA_DODAVATELI', 'ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI')";

    $select = "
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni,
               JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) as aktualni_stav,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        WHERE o.aktivni = 1
          AND o.id != 1
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
              IN {$active_states}
    ";

    // 1. Jsem objednatel
    $stmt1 = $db->prepare($select . "
          AND (o.objednatel_id = ? OR (o.objednatel_id IS NULL AND o.uzivatel_id = ?))
        ORDER BY o.dt_vytvoreni DESC LIMIT 15");
    $stmt1->execute([$user_id, $user_id]);
    $objednatel = $stmt1->fetchAll(PDO::FETCH_ASSOC);

    // 2. Jsem garant (vyloučit objednávky kde jsem objednatel)
    $objednatel_ids = array_column($objednatel, 'id');
    $exclude_garant = '';
    if (!empty($objednatel_ids)) {
        $ph = implode(',', array_map('intval', $objednatel_ids));
        $exclude_garant = "AND o.id NOT IN ($ph)";
    }
    $stmt2 = $db->prepare($select . "
          AND o.garant_uzivatel_id = ?
          {$exclude_garant}
        ORDER BY o.dt_vytvoreni DESC LIMIT 15");
    $stmt2->execute([$user_id]);
    $garant = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // 3. Jsem příkazce nebo schvalovatel (pouze pokud mám toto právo)
    $prikazce = [];
    if ($has_order_approve) {
        $all_ids = array_merge($objednatel_ids, array_column($garant, 'id'));
        $exclude_prik = '';
        if (!empty($all_ids)) {
            $ph2 = implode(',', array_map('intval', $all_ids));
            $exclude_prik = "AND o.id NOT IN ($ph2)";
        }
        $stmt3 = $db->prepare($select . "
              AND (o.prikazce_id = ? OR o.schvalovatel_id = ?)
              {$exclude_prik}
            ORDER BY o.dt_vytvoreni DESC LIMIT 15");
        $stmt3->execute([$user_id, $user_id]);
        $prikazce = $stmt3->fetchAll(PDO::FETCH_ASSOC);
    }

    return [
        'objednatel'        => $objednatel,
        'garant'            => $garant,
        'prikazce'          => $prikazce,
        'has_prikazce_role' => $has_order_approve
    ];
}

/**
 * Helper: Sestaví WHERE podmínku a parametry pro viditelnost faktur uživatele.
 * Logika shodná s invoiceHandlers.php handle_invoices25_list():
 *  - admin ($is_admin) → žádné omezení
 *  - ostatní → faktury k objednávkám kde je uživatel účastníkem (7 rolí),
 *              přímé sloupce faktury (fa_predana_zam_id, potvrdil_vecnou_spravnost_id, vytvoril_uzivatel_id),
 *              faktury k smlouvám úseku uživatele (pokud $usek_id)
 * Vrací ['where' => '...', 'params' => [...]] – where je buď '' nebo "AND (...)".
 */
function _dashboard_build_invoice_user_filter($db, $user_id, $is_admin, $usek_id = null) {
    if ($is_admin) {
        return ['where' => '', 'params' => []];
    }

    $conditions = [];
    $params = [];

    // 1️⃣ Faktury k objednávkám kde je uživatel účastníkem (7 rolí)
    $stmt_orders = $db->prepare("
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
    ");
    $stmt_orders->execute(array_fill(0, 7, $user_id));
    $order_ids = $stmt_orders->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($order_ids)) {
        $placeholders = implode(',', array_map('intval', $order_ids));
        $conditions[] = "f.objednavka_id IN ({$placeholders})";
    }

    // 2️⃣ Předáno k věcné kontrole
    $conditions[] = 'f.fa_predana_zam_id = ?';
    $params[] = $user_id;

    // 3️⃣ Potvrdil věcnou správnost
    $conditions[] = 'f.potvrdil_vecnou_spravnost_id = ?';
    $params[] = $user_id;

    // 4️⃣ Sám vytvořil fakturu
    $conditions[] = 'f.vytvoril_uzivatel_id = ?';
    $params[] = $user_id;

    // 5️⃣ Faktury k smlouvám úseku uživatele
    if ($usek_id) {
        $conditions[] = '(f.smlouva_id IS NOT NULL AND f.smlouva_id > 0 AND EXISTS (SELECT 1 FROM `' . TBL_SMLOUVY . '` sm2 WHERE sm2.id = f.smlouva_id AND sm2.usek_id = ?))';
        $params[] = (int)$usek_id;
    }

    if (empty($conditions)) {
        // Bez přístupu – vrátíme podmínku která nevybere nic
        return ['where' => 'AND 1=0', 'params' => []];
    }

    return ['where' => 'AND (' . implode(' OR ', $conditions) . ')', 'params' => $params];
}

/**
 * Faktury čekající na věcnou kontrolu
 */
function _dashboard_get_invoices_pending_check($db, $user_id, $is_admin, $days, $usek_id = null) {
    $filter = _dashboard_build_invoice_user_filter($db, $user_id, $is_admin, $usek_id);
    $where_user = $filter['where'];
    $params = $filter['params'];

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
        ORDER BY f.fa_datum_splatnosti ASC
        LIMIT 50
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
          AND o.id != 1
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) 
              IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI')
          {$where_user}
        ORDER BY o.dt_vytvoreni ASC
        LIMIT 50
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Faktury po splatnosti
 */
function _dashboard_get_invoices_overdue($db, $user_id, $is_admin, $usek_id = null) {
    $filter = _dashboard_build_invoice_user_filter($db, $user_id, $is_admin, $usek_id);
    $where_user = $filter['where'];
    $params = $filter['params'];

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
function _dashboard_get_invoices_due_soon($db, $user_id, $is_admin, $days, $usek_id = null) {
    $filter = _dashboard_build_invoice_user_filter($db, $user_id, $is_admin, $usek_id);
    $where_user = $filter['where'];
    $params = array_merge($filter['params'], [$days]);

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
 * Vrací POUZE skutečně čekající na zveřejnění + počet dní čekání.
 */
function _dashboard_get_orders_for_registry($db) {
    $stmt = $db->prepare("
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni,
               o.dt_aktualizace,
               DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) as dni_cekani,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        WHERE o.aktivni = 1
          AND o.id != 1
          AND (
              JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT'
              OR " . sqlNormalizeExpression('o.zverejnit') . " = 'ano'
              OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'ke zverejneni'
          )
          AND NOT (
              (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
              OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
          )
        ORDER BY dni_cekani DESC, o.dt_vytvoreni ASC
        LIMIT 30
    ");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Zveřejněné objednávky - primárně posledních 7 dní, fallback na posledních 10 v roce.
 * Vrací: { items: [...], is_fallback: bool }
 */
function _dashboard_get_orders_published($db, $days) {
    $select = "
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni, o.dt_zverejneni,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        WHERE o.aktivni = 1
          AND o.id != 1
          AND (
              (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
              OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
          )
    ";

    // 1. Nejdřív zkus posledních 7 dní
    $stmt = $db->prepare($select . "
          AND o.dt_zverejneni >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY o.dt_zverejneni DESC
        LIMIT 15
    ");
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($items)) {
        return ['items' => $items, 'is_fallback' => false];
    }

    // 2. Fallback: posledních 10 v aktuálním roce
    $stmt2 = $db->prepare($select . "
          AND YEAR(o.dt_objednavky) = YEAR(CURDATE())
        ORDER BY o.dt_zverejneni DESC
        LIMIT 10
    ");
    $stmt2->execute();
    $items2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    return ['items' => $items2, 'is_fallback' => true];
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
          AND o.id != 1
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

    // 2. Objednávky ke zveřejnění (> 2 dny)
    if ($is_admin || in_array('DASHBOARD_ORDERS_REGISTRY', $permissions)) {
        $stmt_reg = $db->prepare("
            SELECT COUNT(*) as count
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1
              AND o.id != 1
              AND (
                  JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT'
                  OR " . sqlNormalizeExpression('o.zverejnit') . " = 'ano'
                  OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'ke zverejneni'
              )
              AND NOT (
                  (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                  OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
              )
              AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 2
        ");
        $stmt_reg->execute();
        $row_reg = $stmt_reg->fetch(PDO::FETCH_ASSOC);
        if ($row_reg['count'] > 0) {
            $alerts[] = [
                'type' => 'warning',
                'icon' => 'globe',
                'title' => 'Ke zveřejnění – prodlení',
                'message' => $row_reg['count'] . ' ' . ($row_reg['count'] === 1 ? 'objednávka čeká' : ($row_reg['count'] < 5 ? 'objednávky čekají' : 'objednávek čeká')) . ' na zveřejnění déle než 2 dny',
                'count' => (int)$row_reg['count'],
                'link' => '/orders25-list-v3'
            ];
        }
    }

    // 3. Nepotvrzené faktury (>7 dní)
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
 * Focus alerts – personalizované kritické zprávy pod welcome card
 * Běžní uživatelé: dlouho nevyřízené objednávky
 * Vyšší role: vyčerpání smluv/LP, neschválené, nezaplacené
 */
function _dashboard_get_focus_alerts($db, $user_id, $is_admin, $permissions, $has_cap, $usek_id) {
    $items = [];

    // --- 1. Moje objednávky bez akce > 14 dní (VŠICHNI) ---
    $stmt = $db->prepare("
        SELECT COUNT(*) as cnt
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE o.aktivni = 1 AND o.id != 1
          AND (o.uzivatel_id = ? OR o.objednatel_id = ?)
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
              NOT IN ('DOKONCENA', 'STORNO', 'ZAMITNUTA')
          AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 14
    ");
    $stmt->execute([$user_id, $user_id]);
    $cnt = (int)$stmt->fetchColumn();
    if ($cnt > 0) {
        $items[] = [
            'severity' => 'warning',
            'icon' => 'hourglass-half',
            'text' => "Máte {$cnt} " . ($cnt === 1 ? 'objednávku' : ($cnt < 5 ? 'objednávky' : 'objednávek')) . " bez akce déle než 14 dní",
            'link' => '/orders25-list-v3',
            'count' => $cnt
        ];
    }

    // --- 2. Ke schválení > 14 dní (pro příkazce vždy, admin vidí vše) ---
    {
        $where_u = $is_admin ? "" : "AND o.prikazce_id = ?";
        $params = $is_admin ? [] : [$user_id];
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
                  IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI')
              AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 14
              {$where_u}
        ");
        $stmt->execute($params);
        $cnt2 = (int)$stmt->fetchColumn();
        if ($cnt2 > 0) {
            $items[] = [
                'severity' => 'danger',
                'icon' => 'gavel',
                'text' => "{$cnt2} " . ($cnt2 === 1 ? 'objednávka čeká' : ($cnt2 < 5 ? 'objednávky čekají' : 'objednávek čeká')) . " na Vaše schválení déle než 14 dní",
                'link' => '/orders25-list-v3',
                'count' => $cnt2
            ];
        }
    }

    // --- 3. Nepotvrzené faktury > 5 dní ---
    if ($has_cap('DASHBOARD_INVOICES_CONFIRM') || $is_admin) {
        $where_f = $is_admin ? "" : "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ?)";
        $params_f = $is_admin ? [] : [$user_id, $user_id];
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_FAKTURY . "` f
            WHERE f.aktivni = 1
              AND f.stav IN ('ZAEVIDOVANA', 'VECNA_SPRAVNOST')
              AND DATEDIFF(CURDATE(), f.dt_vytvoreni) > 5
              {$where_f}
        ");
        $stmt->execute($params_f);
        $cnt3 = (int)$stmt->fetchColumn();
        if ($cnt3 > 0) {
            $items[] = [
                'severity' => 'danger',
                'icon' => 'file-invoice',
                'text' => "{$cnt3} " . ($cnt3 === 1 ? 'faktura čeká' : ($cnt3 < 5 ? 'faktury čekají' : 'faktur čeká')) . " na potvrzení déle než 5 dní",
                'link' => '/invoices25-list',
                'count' => $cnt3
            ];
        }
    }

    // --- 4. Faktury po splatnosti (nezaplaceno) ---
    if ($has_cap('DASHBOARD_INVOICES_OVERDUE') || $is_admin) {
        $where_f2 = $is_admin ? "" : "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ?)";
        $params_f2 = $is_admin ? [] : [$user_id, $user_id];
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_FAKTURY . "` f
            WHERE f.aktivni = 1
              AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO')
              AND f.fa_datum_splatnosti < CURDATE()
              {$where_f2}
        ");
        $stmt->execute($params_f2);
        $cnt4 = (int)$stmt->fetchColumn();
        if ($cnt4 > 0) {
            $items[] = [
                'severity' => 'danger',
                'icon' => 'exclamation-triangle',
                'text' => "{$cnt4} " . ($cnt4 === 1 ? 'faktura je' : ($cnt4 < 5 ? 'faktury jsou' : 'faktur je')) . " po splatnosti",
                'link' => '/invoices25-list',
                'count' => $cnt4
            ];
        }
    }

    // --- 5. Kritické čerpání smluv (>90%) ---
    if ($has_cap('DASHBOARD_SPENDING_CONTRACTS') || $is_admin) {
        $where_s = ($is_admin || !$usek_id) ? "" : "AND s.usek_id = ?";
        $params_s = ($is_admin || !$usek_id) ? [] : [$usek_id];
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_SMLOUVY . "` s
            WHERE s.aktivni = 1
              AND s.procento_cerpani >= 90
              AND (s.platnost_do IS NULL OR CURDATE() <= s.platnost_do)
              {$where_s}
        ");
        $stmt->execute($params_s);
        $cnt5 = (int)$stmt->fetchColumn();
        if ($cnt5 > 0) {
            $items[] = [
                'severity' => 'warning',
                'icon' => 'chart-line',
                'text' => "{$cnt5} " . ($cnt5 === 1 ? 'smlouva má' : ($cnt5 < 5 ? 'smlouvy mají' : 'smluv má')) . " vyčerpáno přes 90 % rozpočtu",
                'link' => '/cerpani',
                'linkTab' => 'contracts',
                'count' => $cnt5
            ];
        }
    }

    // --- 6. Kritické LP přísliby (>90%) ---
    if ($has_cap('DASHBOARD_SPENDING_LP') || $is_admin) {
        $where_lp = ($is_admin || !$usek_id) ? "" : "AND c.usek_id = ?";
        $params_lp = [date('Y')];
        if (!$is_admin && $usek_id) {
            $params_lp[] = $usek_id;
        }
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_LIMITOVANE_PRISLIBY_CERPANI . "` c
            WHERE c.rok = ?
              AND c.celkovy_limit > 0
              AND (c.skutecne_cerpano / NULLIF(c.celkovy_limit, 0)) >= 0.9
              {$where_lp}
        ");
        $stmt->execute($params_lp);
        $cnt6 = (int)$stmt->fetchColumn();
        if ($cnt6 > 0) {
            $items[] = [
                'severity' => 'warning',
                'icon' => 'coins',
                'text' => "{$cnt6} " . ($cnt6 === 1 ? 'LP příslib má' : ($cnt6 < 5 ? 'LP přísliby mají' : 'LP příslibů má')) . " vyčerpáno přes 90 %",
                'link' => '/cerpani',
                'linkTab' => 'limited-promises',
                'count' => $cnt6
            ];
        }
    }

    // --- 7. Roční poplatky po splatnosti ---
    if ($has_cap('DASHBOARD_ANNUAL_FEES') || $is_admin) {
        $stmt = $db->query("
            SELECT COUNT(*) as cnt,
                   COALESCE(SUM(rpp.castka), 0) as castka
            FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
            JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rp.id = rpp.rocni_poplatek_id AND rp.aktivni = 1
            WHERE rpp.aktivni = 1
              AND rpp.stav != 'ZAPLACENO'
              AND rpp.datum_splatnosti < CURDATE()
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $cnt7 = (int)($row['cnt'] ?? 0);
        if ($cnt7 > 0) {
            $items[] = [
                'severity' => 'danger',
                'icon' => 'calendar-check',
                'text' => "{$cnt7} " . ($cnt7 === 1 ? 'položka ročního poplatku je' : ($cnt7 < 5 ? 'položky ročních poplatků jsou' : 'položek ročních poplatků je')) . " po splatnosti",
                'link' => '/annual-fees',
                'linkFilterStav' => '_PO_SPLATNOSTI',
                'count' => $cnt7
            ];
        }
    }

    // --- 8. Roční poplatky blížící se splatnosti (do 10 dní) ---
    if ($has_cap('DASHBOARD_ANNUAL_FEES') || $is_admin) {
        $stmt = $db->query("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
            JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rp.id = rpp.rocni_poplatek_id AND rp.aktivni = 1
            WHERE rpp.aktivni = 1
              AND rpp.stav != 'ZAPLACENO'
              AND rpp.datum_splatnosti >= CURDATE()
              AND rpp.datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY)
        ");
        $cnt8 = (int)$stmt->fetchColumn();
        if ($cnt8 > 0) {
            $items[] = [
                'severity' => 'warning',
                'icon' => 'calendar-check',
                'text' => "{$cnt8} " . ($cnt8 === 1 ? 'položce ročního poplatku se blíží' : ($cnt8 < 5 ? 'položkám ročních poplatků se blíží' : 'položkám ročních poplatků se blíží')) . " splatnost (do 10 dní)",
                'link' => '/annual-fees',
                'count' => $cnt8
            ];
        }
    }

    // Sort by severity (danger first, then warning)
    usort($items, function($a, $b) {
        $order = ['danger' => 0, 'warning' => 1, 'info' => 2];
        return ($order[$a['severity']] ?? 9) - ($order[$b['severity']] ?? 9);
    });

    return $items;
}

/**
 * Co nového od posledního přihlášení
 * Vrací souhrn nových událostí (objednávky, faktury) od dt_posledni_prihlaseni
 */
function _dashboard_get_news_since_login($db, $user_id, $is_admin, $perm_codes, $last_login, $usek_id) {
    $news = [];

    // Období: od posledního přihlášení, včetně dneška
    $today = date('Y-m-d 00:00:00');
    $since = $last_login ?: $today;

    // 1. Nově vytvořené objednávky (kde je uživatel objednatel/garant)
    {
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND o.dt_vytvoreni >= ?
        ");
        $stmt->execute([$user_id, $user_id, $since]);
        $cnt = (int)$stmt->fetchColumn();
        if ($cnt > 0) {
            $news[] = [
                'icon' => 'shopping-cart',
                'text' => "{$cnt} " . ($cnt === 1 ? 'nová objednávka vytvořena' : ($cnt < 5 ? 'nové objednávky vytvořeny' : 'nových objednávek vytvořeno')),
                'link' => '/orders25-list-v3',
                'filter' => 'ke_schvaleni',
                'count' => $cnt
            ];
        }
    }

    // 2. Objednávky čekající ke schválení (AKČNÍ – bez časového filtru, ukazuje aktuální stav)
    {
        $where_u = $is_admin ? "" : "AND (o.prikazce_id = ?)";
        $params = [];
        if (!$is_admin) { $params[] = $user_id; }
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
                  IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI')
              {$where_u}
        ");
        $stmt->execute($params);
        $cnt = (int)$stmt->fetchColumn();
        if ($cnt > 0) {
            $news[] = [
                'icon' => 'gavel',
                'text' => "{$cnt} " . ($cnt === 1 ? 'objednávka čeká' : ($cnt < 5 ? 'objednávky čekají' : 'objednávek čeká')) . " ke schválení",
                'link' => '/orders25-list-v3',
                'filter' => 'ke_schvaleni',
                'count' => $cnt
            ];
        }
    }

    // 3. Schválené objednávky
    {
        $where_u = $is_admin ? "" : "AND (o.objednatel_id = ? OR o.prikazce_id = ?)";
        $params = [$since];
        if (!$is_admin) { $params[] = $user_id; $params[] = $user_id; }
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
                  = 'SCHVALENA'
              AND o.dt_aktualizace >= ?
              {$where_u}
        ");
        $stmt->execute($params);
        $cnt = (int)$stmt->fetchColumn();
        if ($cnt > 0) {
            $news[] = [
                'icon' => 'check-circle',
                'text' => "{$cnt} " . ($cnt === 1 ? 'objednávka schválena' : ($cnt < 5 ? 'objednávky schváleny' : 'objednávek schváleno')),
                'link' => '/orders25-list-v3',
                'filter' => 'schvalena',
                'count' => $cnt
            ];
        }
    }

    // 4. Zamítnuté objednávky
    {
        $where_u = $is_admin ? "" : "AND (o.objednatel_id = ? OR o.prikazce_id = ?)";
        $params = [$since];
        if (!$is_admin) { $params[] = $user_id; $params[] = $user_id; }
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
                  = 'ZAMITNUTA'
              AND o.dt_aktualizace >= ?
              {$where_u}
        ");
        $stmt->execute($params);
        $cnt = (int)$stmt->fetchColumn();
        if ($cnt > 0) {
            $news[] = [
                'icon' => 'exclamation-triangle',
                'text' => "{$cnt} " . ($cnt === 1 ? 'objednávka zamítnuta' : ($cnt < 5 ? 'objednávky zamítnuty' : 'objednávek zamítnuto')),
                'link' => '/orders25-list-v3',
                'filter' => 'zamitnuta',
                'count' => $cnt
            ];
        }
    }

    // 5. Faktury čekající na potvrzení (AKČNÍ – bez časového filtru)
    {
        $where_f = $is_admin ? "" : "AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ?)";
        $params_f = [];
        if (!$is_admin) { $params_f[] = $user_id; $params_f[] = $user_id; }
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_FAKTURY . "` f
            WHERE f.aktivni = 1
              AND f.stav IN ('ZAEVIDOVANA', 'VECNA_SPRAVNOST')
              {$where_f}
        ");
        $stmt->execute($params_f);
        $cnt = (int)$stmt->fetchColumn();
        if ($cnt > 0) {
            $news[] = [
                'icon' => 'file-invoice',
                'text' => "{$cnt} " . ($cnt === 1 ? 'faktura čeká' : ($cnt < 5 ? 'faktury čekají' : 'faktur čeká')) . " na potvrzení",
                'link' => '/invoices25-list',
                'filter' => 'my_invoices',
                'count' => $cnt
            ];
        }
    }

    // 6. Dokončené objednávky
    {
        $where_u = $is_admin ? "" : "AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)";
        $params = [$since];
        if (!$is_admin) { $params[] = $user_id; $params[] = $user_id; }
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
                  = 'DOKONCENA'
              AND o.dt_aktualizace >= ?
              {$where_u}
        ");
        $stmt->execute($params);
        $cnt = (int)$stmt->fetchColumn();
        if ($cnt > 0) {
            $news[] = [
                'icon' => 'check-double',
                'text' => "{$cnt} " . ($cnt === 1 ? 'objednávka dokončena' : ($cnt < 5 ? 'objednávky dokončeny' : 'objednávek dokončeno')),
                'link' => '/orders25-list-v3',
                'filter' => 'dokoncena',
                'count' => $cnt
            ];
        }
    }

    // Formát data pro UI
    $since_dt = new DateTime($since);
    $since_formatted = $since_dt->format('j.n. H:i');

    return ['items' => $news, 'since' => $since, 'since_formatted' => $since_formatted];
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
    // Určení způsobu agregace podle délky periody
    if ($days >= 181) {
        // Rok → agregace po měsících (12 bodů)
        $group_by    = 'month';
        $select_den  = "DATE_FORMAT(DATE(o.dt_vytvoreni), '%Y-%m-01') as den";
        $group_clause = "DATE_FORMAT(DATE(o.dt_vytvoreni), '%Y-%m-01')";
    } elseif ($days >= 32) {
        // Kvartál → agregace po týdnech (pondělí = začátek týdne)
        $group_by    = 'week';
        $select_den  = "DATE(DATE_SUB(DATE(o.dt_vytvoreni), INTERVAL WEEKDAY(DATE(o.dt_vytvoreni)) DAY)) as den";
        $group_clause = "DATE(DATE_SUB(DATE(o.dt_vytvoreni), INTERVAL WEEKDAY(DATE(o.dt_vytvoreni)) DAY))";
    } else {
        // 7/14/30 dní → agregace po dnech
        $group_by    = 'day';
        $select_den  = "DATE(o.dt_vytvoreni) as den";
        $group_clause = "DATE(o.dt_vytvoreni)";
    }

    $where_user = "";
    $params = [$days];

    if (!$is_admin && !$has_order_read) {
        $where_user = "AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)";
        $params = array_merge($params, [$user_id, $user_id]);
    }

    $stmt = $db->prepare("
        SELECT {$select_den},
               COUNT(*) as pocet,
               COALESCE(SUM(
                   CASE
                       WHEN (SELECT COALESCE(SUM(f.fa_castka), 0)
                             FROM `" . TBL_FAKTURY . "` f
                             WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                       THEN (SELECT COALESCE(SUM(f.fa_castka), 0)
                             FROM `" . TBL_FAKTURY . "` f
                             WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                       WHEN (SELECT COALESCE(SUM(p.cena_s_dph), 0)
                             FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p
                             WHERE p.objednavka_id = o.id) > 0
                       THEN (SELECT COALESCE(SUM(p.cena_s_dph), 0)
                             FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p
                             WHERE p.objednavka_id = o.id)
                       ELSE COALESCE(o.max_cena_s_dph, 0)
                   END
               ), 0) as castka
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE o.aktivni = 1
          AND o.id != 1
          AND o.dt_vytvoreni >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          {$where_user}
        GROUP BY {$group_clause}
        ORDER BY den ASC
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return ['items' => $items, 'group_by' => $group_by];
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
          AND o.id != 1
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
    // ✅ OPRAVA: používáme TOTÁLNÍ čerpání (skutecne + predpokladane + rezervovano) jako v modulu Čerpání
    $stmt_stats = $db->prepare("
        SELECT 
            COUNT(*) as celkem_aktivnich,
            SUM(CASE WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.50 AND ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) < 0.75 THEN 1 ELSE 0 END) as stredni,
            SUM(CASE WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.75 AND ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) < 0.90 THEN 1 ELSE 0 END) as vysoke,
            SUM(CASE WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.90 AND ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) < 1.0 THEN 1 ELSE 0 END) as kriticke,
            SUM(CASE WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 1.0 THEN 1 ELSE 0 END) as prekrocene,
            COALESCE(SUM(c.celkovy_limit), 0) as celkem_limit,
            COALESCE(SUM(c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano), 0) as celkem_cerpano
        FROM `" . TBL_LIMITOVANE_PRISLIBY_CERPANI . "` c
        WHERE c.rok = ?
          AND c.celkovy_limit > 0
          {$where_usek}
    ");
    $stmt_stats->execute($params);
    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);

    // 2. Konkrétní kritické LP (blíží se vyčerpání >= 50%)
    // ✅ OPRAVA: používáme TOTÁLNÍ čerpání (skutecne + predpokladane + rezervovano) jako v modulu Čerpání
    $stmt = $db->prepare("
        SELECT c.id, c.cislo_lp, c.rok,
               c.celkovy_limit, c.skutecne_cerpano, c.zbyva_skutecne,
               c.predpokladane_cerpani, c.rezervovano,
               IFNULL(u.usek_nazev, '') as usek_nazev,
               IFNULL(u.usek_zkr, '') as usek_zkr,
               CONCAT(IFNULL(uz.jmeno, ''), ' ', IFNULL(uz.prijmeni, '')) as spravce_jmeno,
               ROUND(((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) * 100, 2) as procento_cerpani,
               CASE
                   WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 1.0 THEN 'PREKROCENO'
                   WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.90 THEN 'CERPANI_KRITICKE'
                   WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.75 THEN 'CERPANI_VYSOKE'
                   WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.50 THEN 'CERPANI_STREDNI'
                   ELSE 'WARNING'
               END as typ_kriticky
        FROM `" . TBL_LIMITOVANE_PRISLIBY_CERPANI . "` c
        LEFT JOIN `" . TBL_USEKY . "` u ON c.usek_id = u.id
        LEFT JOIN `" . TBL_UZIVATELE . "` uz ON c.user_id = uz.id
        WHERE c.rok = ?
          AND c.celkovy_limit > 0
          AND ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.50
          {$where_usek}
        ORDER BY 
          CASE
              WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 1.0 THEN 0
              WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.90 THEN 1
              WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.75 THEN 2
              WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.50 THEN 3
              ELSE 4
          END ASC,
          ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) DESC
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

    // Načte objednávky kde jsem autor komentáře NEBO jsem zapojen do objednávky
    // Seskupí dle objednávky, vrátí poslední komentář + počet komentářů za období
    $stmt = $db->prepare("
        SELECT
            o.id as objednavka_id,
            o.cislo_objednavky,
            o.predmet,
            COUNT(k.id) as komentaru_celkem,
            MAX(k.dt_vytvoreni) as posledni_komentar_dt,
            SUBSTRING_INDEX(GROUP_CONCAT(k.obsah_plain ORDER BY k.dt_vytvoreni DESC SEPARATOR '|||'), '|||', 1) as posledni_obsah,
            SUBSTRING_INDEX(GROUP_CONCAT(CONCAT(au.jmeno, ' ', au.prijmeni) ORDER BY k.dt_vytvoreni DESC SEPARATOR '|||'), '|||', 1) as posledni_autor
        FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k
        INNER JOIN `" . TBL_OBJEDNAVKY . "` o ON k.objednavka_id = o.id AND o.aktivni = 1 AND o.id != 1
        LEFT JOIN `" . TBL_UZIVATELE . "` au ON k.user_id = au.id
        WHERE k.smazano = 0
          AND k.dt_vytvoreni >= ?
          AND (
              k.user_id = ?
              OR o.uzivatel_id = ?
              OR o.objednatel_id = ?
              OR o.garant_uzivatel_id = ?
              OR o.schvalovatel_id = ?
              OR o.prikazce_id = ?
              OR o.odesilatel_id = ?
              OR o.fakturant_id = ?
              OR o.potvrdil_vecnou_spravnost_id = ?
          )
        GROUP BY o.id, o.cislo_objednavky, o.predmet
        ORDER BY posledni_komentar_dt DESC
        LIMIT 15
    ");
    $stmt->execute([
        $date_from,
        $user_id,
        $user_id, $user_id, $user_id, $user_id,
        $user_id, $user_id, $user_id, $user_id
    ]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Statistiky faktur - počty dle klíčových stavů
 */
function _dashboard_get_invoice_stats($db, $user_id, $is_admin, $has_invoice_manage, $usek_id = null) {
    // Rok filtr – shodný s modulem faktur (řádek 1672 invoiceHandlers.php)
    $current_year = (int)date('Y');
    $year_filter = "AND (YEAR(f.fa_datum_vystaveni) = ? OR YEAR(f.fa_datum_doruceni) = ? OR YEAR(f.fa_datum_splatnosti) = ?)";

    // Oprávnění: admin nebo INVOICE_MANAGE vidí vše, ostatní přes rozšířenou logiku (shodnou s invoiceHandlers)
    $effective_admin = $is_admin || $has_invoice_manage;
    $filter = _dashboard_build_invoice_user_filter($db, $user_id, $effective_admin, $usek_id);
    $where_user = $filter['where'];
    // Rok parametry nejdříve (odpovídají pořadí placeholderů v $year_filter), pak user-filter params
    $params = array_merge([$current_year, $current_year, $current_year], $filter['params']);

    $uid = (int)$user_id;
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
            COALESCE(SUM(CASE WHEN (f.fa_zaplacena = 0 OR f.fa_zaplacena IS NULL) AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE() THEN f.fa_castka ELSE 0 END), 0) as castka_po_splatnosti
        FROM `" . TBL_FAKTURY . "` f
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
        LEFT JOIN `" . TBL_SMLOUVY . "` sm ON f.smlouva_id = sm.id
        WHERE f.aktivni = 1
          AND (
              (f.objednavka_id IS NULL OR o.aktivni = 1)
              AND (f.smlouva_id IS NULL OR sm.aktivni = 1)
          )
          {$year_filter}
          {$where_user}
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// ============================================================================
// ADMIN ENDPOINTS - Správa oprávnění dashboard widgetů
// ============================================================================

/**
 * Načte matici role → DASHBOARD_* práva
 * POST /dashboard/admin/widget-permissions
 */
function handle_dashboard_admin_get_widget_permissions($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    try {
        $db = get_db($config);
        $token_data = verify_token_v2($username, $token, $db);
        if (!$token_data || empty($token_data['is_admin'])) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Přístup odepřen - vyžadována role admin']);
            return;
        }

        // Všechny DASHBOARD_* práva
        $stmt = $db->query("SELECT id, kod_prava, popis FROM `" . TBL_PRAVA . "` WHERE kod_prava LIKE 'DASHBOARD_%' AND aktivni = 1 ORDER BY kod_prava");
        $prava = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Všechny aktivní role (kromě SUPERADMIN, ADMINISTRATOR)
        $stmt = $db->query("SELECT id, kod_role, nazev_role FROM `" . TBL_ROLE . "` WHERE aktivni = 1 AND kod_role NOT IN ('SUPERADMIN', 'ADMINISTRATOR') ORDER BY nazev_role");
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Aktuální přiřazení role → právo
        $stmt = $db->query("
            SELECT rp.role_id, p.kod_prava
            FROM `" . TBL_ROLE_PRAVA . "` rp
            JOIN `" . TBL_PRAVA . "` p ON p.id = rp.pravo_id
            WHERE rp.user_id = -1
              AND rp.aktivni = 1
              AND p.kod_prava LIKE 'DASHBOARD_%'
        ");
        $assignments = [];
        foreach ($stmt as $row) {
            $assignments[$row['kod_prava']][] = (int)$row['role_id'];
        }

        echo json_encode([
            'status' => 'success',
            'data' => [
                'prava' => $prava,
                'roles' => $roles,
                'assignments' => $assignments
            ]
        ]);

    } catch (Exception $e) {
        error_log("Dashboard Admin Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

/**
 * Uloží matici role → DASHBOARD_* práva (bulk update)
 * POST /dashboard/admin/save-widget-permissions
 * Body: { token, username, assignments: { "DASHBOARD_XY": [role_id, role_id, ...], ... } }
 */
function handle_dashboard_admin_save_widget_permissions($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $assignments = $input['assignments'] ?? [];

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    try {
        $db = get_db($config);
        $token_data = verify_token_v2($username, $token, $db);
        if (!$token_data || empty($token_data['is_admin'])) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Přístup odepřen']);
            return;
        }

        $db->beginTransaction();

        // Načtení DASHBOARD_* práv
        $stmt = $db->query("SELECT id, kod_prava FROM `" . TBL_PRAVA . "` WHERE kod_prava LIKE 'DASHBOARD_%' AND aktivni = 1");
        $prava_map = [];
        foreach ($stmt as $row) {
            $prava_map[$row['kod_prava']] = (int)$row['id'];
        }

        // Smazání starých role-level DASHBOARD_* přiřazení
        $prava_ids = implode(',', array_values($prava_map));
        if ($prava_ids) {
            $db->exec("DELETE FROM `" . TBL_ROLE_PRAVA . "` WHERE user_id = -1 AND pravo_id IN ({$prava_ids})");
        }

        // Vložení nových
        $insert = $db->prepare("INSERT INTO `" . TBL_ROLE_PRAVA . "` (user_id, role_id, pravo_id, aktivni) VALUES (-1, ?, ?, 1)");
        $count = 0;
        foreach ($assignments as $kod_prava => $role_ids) {
            if (!isset($prava_map[$kod_prava])) continue;
            $pravo_id = $prava_map[$kod_prava];
            foreach ($role_ids as $role_id) {
                $insert->execute([(int)$role_id, $pravo_id]);
                $count++;
            }
        }

        $db->commit();

        echo json_encode([
            'status' => 'success',
            'message' => "Uloženo {$count} přiřazení",
            'count' => $count
        ]);

    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log("Dashboard Admin Save Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

/**
 * Načte DASHBOARD_* práva pro konkrétního uživatele (přímá práva)
 * POST /dashboard/admin/user-widget-permissions
 * Body: { token, username, target_user_id }
 */
function handle_dashboard_admin_get_user_widget_permissions($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $target_user_id = (int)($input['target_user_id'] ?? 0);

    if (!$token || !$username || !$target_user_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí parametry']);
        return;
    }

    try {
        $db = get_db($config);
        $token_data = verify_token_v2($username, $token, $db);
        if (!$token_data || empty($token_data['is_admin'])) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Přístup odepřen']);
            return;
        }

        // Info o cílovém uživateli
        $stmt = $db->prepare("SELECT id, jmeno, prijmeni, username FROM `" . TBL_UZIVATELE . "` WHERE id = ? AND aktivni = 1");
        $stmt->execute([$target_user_id]);
        $target_user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$target_user) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Uživatel nenalezen']);
            return;
        }

        // Role uživatele
        $stmt = $db->prepare("SELECT r.kod_role, r.nazev_role FROM `" . TBL_UZIVATELE_ROLE . "` ur JOIN `" . TBL_ROLE . "` r ON r.id = ur.role_id WHERE ur.uzivatel_id = ?");
        $stmt->execute([$target_user_id]);
        $target_user['roles'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Práva z rolí (zděděná)
        $stmt = $db->prepare("
            SELECT DISTINCT p.kod_prava
            FROM `" . TBL_ROLE_PRAVA . "` rp
            JOIN `" . TBL_PRAVA . "` p ON p.id = rp.pravo_id
            WHERE rp.user_id = -1
              AND rp.aktivni = 1
              AND p.kod_prava LIKE 'DASHBOARD_%'
              AND rp.role_id IN (SELECT role_id FROM `" . TBL_UZIVATELE_ROLE . "` WHERE uzivatel_id = ?)
        ");
        $stmt->execute([$target_user_id]);
        $inherited = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'kod_prava');

        // Přímá práva uživatele
        $stmt = $db->prepare("
            SELECT p.kod_prava
            FROM `" . TBL_ROLE_PRAVA . "` rp
            JOIN `" . TBL_PRAVA . "` p ON p.id = rp.pravo_id
            WHERE rp.user_id = ?
              AND rp.role_id = -1
              AND rp.aktivni = 1
              AND p.kod_prava LIKE 'DASHBOARD_%'
        ");
        $stmt->execute([$target_user_id]);
        $direct = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'kod_prava');

        // Všechny DASHBOARD_* práva
        $stmt = $db->query("SELECT id, kod_prava, popis FROM `" . TBL_PRAVA . "` WHERE kod_prava LIKE 'DASHBOARD_%' AND aktivni = 1 ORDER BY kod_prava");
        $prava = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'status' => 'success',
            'data' => [
                'user' => $target_user,
                'prava' => $prava,
                'inherited' => $inherited,
                'direct' => $direct
            ]
        ]);

    } catch (Exception $e) {
        error_log("Dashboard Admin User Perms Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

/**
 * Uloží přímá DASHBOARD_* práva pro konkrétního uživatele
 * POST /dashboard/admin/save-user-widget-permissions
 * Body: { token, username, target_user_id, direct_permissions: ["DASHBOARD_XY", ...] }
 */
function handle_dashboard_admin_save_user_widget_permissions($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $target_user_id = (int)($input['target_user_id'] ?? 0);
    $direct_permissions = $input['direct_permissions'] ?? [];

    if (!$token || !$username || !$target_user_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí parametry']);
        return;
    }

    try {
        $db = get_db($config);
        $token_data = verify_token_v2($username, $token, $db);
        if (!$token_data || empty($token_data['is_admin'])) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Přístup odepřen']);
            return;
        }

        $db->beginTransaction();

        // Načtení DASHBOARD_* práv
        $stmt = $db->query("SELECT id, kod_prava FROM `" . TBL_PRAVA . "` WHERE kod_prava LIKE 'DASHBOARD_%' AND aktivni = 1");
        $prava_map = [];
        foreach ($stmt as $row) {
            $prava_map[$row['kod_prava']] = (int)$row['id'];
        }

        // Smazání starých přímých DASHBOARD_* práv pro tohoto uživatele
        $prava_ids = implode(',', array_values($prava_map));
        if ($prava_ids) {
            $stmt = $db->prepare("DELETE FROM `" . TBL_ROLE_PRAVA . "` WHERE user_id = ? AND role_id = -1 AND pravo_id IN ({$prava_ids})");
            $stmt->execute([$target_user_id]);
        }

        // Vložení nových přímých práv
        $insert = $db->prepare("INSERT INTO `" . TBL_ROLE_PRAVA . "` (user_id, role_id, pravo_id, aktivni) VALUES (?, -1, ?, 1)");
        $count = 0;
        foreach ($direct_permissions as $kod_prava) {
            if (!isset($prava_map[$kod_prava])) continue;
            $insert->execute([$target_user_id, $prava_map[$kod_prava]]);
            $count++;
        }

        $db->commit();

        echo json_encode([
            'status' => 'success',
            'message' => "Uloženo {$count} přímých práv pro uživatele #{$target_user_id}",
            'count' => $count
        ]);

    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log("Dashboard Admin Save User Perms Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

// ============================================================================
// ROČNÍ POPLATKY - SPLATNOST (dashboard widget)
// ============================================================================

/**
 * Vrací roční poplatky s položkami po splatnosti nebo blížícími se splatností.
 * stats: celkový přehled + items: konkrétní záznamy
 */
function _dashboard_get_annual_fees_due($db) {
    // Statistiky
    $stmt = $db->query("
        SELECT
            (SELECT COUNT(DISTINCT rp.id) FROM `" . TBL_ROCNI_POPLATKY . "` rp WHERE rp.aktivni = 1) as celkem,
            (SELECT COUNT(*) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                JOIN `" . TBL_ROCNI_POPLATKY . "` rp2 ON rp2.id = rpp.rocni_poplatek_id AND rp2.aktivni = 1
                WHERE rpp.aktivni = 1 AND rpp.stav != 'ZAPLACENO' AND rpp.datum_splatnosti < CURDATE()
            ) as po_splatnosti,
            (SELECT COUNT(*) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                JOIN `" . TBL_ROCNI_POPLATKY . "` rp3 ON rp3.id = rpp.rocni_poplatek_id AND rp3.aktivni = 1
                WHERE rpp.aktivni = 1 AND rpp.stav != 'ZAPLACENO'
                  AND rpp.datum_splatnosti >= CURDATE()
                  AND rpp.datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ) as blizi_se,
            (SELECT COALESCE(SUM(rpp.castka), 0) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                JOIN `" . TBL_ROCNI_POPLATKY . "` rp4 ON rp4.id = rpp.rocni_poplatek_id AND rp4.aktivni = 1
                WHERE rpp.aktivni = 1 AND rpp.stav != 'ZAPLACENO' AND rpp.datum_splatnosti < CURDATE()
            ) as castka_po_splatnosti,
            (SELECT COALESCE(SUM(rpp.castka), 0) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                JOIN `" . TBL_ROCNI_POPLATKY . "` rp5 ON rp5.id = rpp.rocni_poplatek_id AND rp5.aktivni = 1
                WHERE rpp.aktivni = 1 AND rpp.stav != 'ZAPLACENO'
                  AND rpp.datum_splatnosti >= CURDATE()
                  AND rpp.datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ) as castka_blizi_se
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    // Konkrétní položky: po splatnosti + blížící se (max 15)
    $stmt2 = $db->query("
        SELECT rp.id, rp.nazev, rp.druh, rp.rok, rp.celkova_castka, rp.zaplaceno_celkem, rp.zbyva_zaplatit,
               rp.rozsirujici_data,
               rpp.id as polozka_id, rpp.datum_splatnosti, rpp.castka as polozka_castka, rpp.stav as polozka_stav,
               DATEDIFF(rpp.datum_splatnosti, CURDATE()) as dni_do_splatnosti,
               CASE
                 WHEN rpp.datum_splatnosti < CURDATE() THEN 'PO_SPLATNOSTI'
                 ELSE 'BLIZI_SE'
               END as typ
        FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
        JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rp.id = rpp.rocni_poplatek_id AND rp.aktivni = 1
        WHERE rpp.aktivni = 1
          AND rpp.stav != 'ZAPLACENO'
          AND rpp.datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY rpp.datum_splatnosti ASC
        LIMIT 15
    ");
    $items = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // Dekódovat dodavatel_nazev z rozsirujici_data JSON
    foreach ($items as &$item) {
        $item['dodavatel_nazev'] = '';
        if (!empty($item['rozsirujici_data'])) {
            $ext = json_decode($item['rozsirujici_data'], true);
            $item['dodavatel_nazev'] = $ext['dodavatel_nazev'] ?? '';
        }
        unset($item['rozsirujici_data']);
    }
    unset($item);

    return [
        'stats' => $stats,
        'items' => $items
    ];
}

/**
 * Přehled pokladny/pokladen pro dashboard widget
 * Admin: agregát přes všechny pokladny
 * Běžný uživatel: jeho přiřazené pokladny
 */
function _dashboard_get_cashbook_summary($db, $user_id, $is_admin, $perm_codes, $mesic = null) {
    $rok = (int)date('Y');
    $mesic = ($mesic !== null && $mesic >= 1 && $mesic <= 12) ? (int)$mesic : (int)date('n');
    $mesic_nazvy = ['', 'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
                        'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

    $has_read_all = $is_admin
        || in_array('CASH_BOOK_MANAGE', $perm_codes)
        || in_array('CASH_BOOK_READ_ALL', $perm_codes)
        || in_array('CASH_BOOK_EDIT_ALL', $perm_codes);

    if ($has_read_all) {
        // === ADMIN / SPRÁVCE: Agregát přes všechny aktivní pokladny ===

        // Souhrnné statistiky aktuálního měsíce
        $stmt = $db->prepare("
            SELECT
                COUNT(DISTINCT pk.pokladna_id) as pocet_pokladen,
                COALESCE(SUM(pk.koncovy_stav), 0) as celkovy_stav,
                COALESCE(SUM(pk.celkove_prijmy), 0) as prijmy_mesic,
                COALESCE(SUM(pk.celkove_vydaje), 0) as vydaje_mesic,
                COALESCE(SUM(pk.pocet_zaznamu), 0) as pocet_polozek,
                SUM(CASE WHEN pk.stav_knihy = 'aktivni' THEN 1 ELSE 0 END) as aktivnich_knih,
                SUM(CASE WHEN pk.stav_knihy != 'aktivni' THEN 1 ELSE 0 END) as uzavrenych_knih
            FROM `" . TBL_POKLADNI_KNIHY . "` pk
            INNER JOIN `" . TBL_POKLADNY . "` p ON p.id = pk.pokladna_id AND p.aktivni = 1
            WHERE pk.rok = ? AND pk.mesic = ?
        ");
        $stmt->execute([$rok, $mesic]);
        $souhrn_row = $stmt->fetch(PDO::FETCH_ASSOC);

        $souhrn = [
            'pocet_pokladen'  => (int)($souhrn_row['pocet_pokladen'] ?? 0),
            'celkovy_stav'    => (float)($souhrn_row['celkovy_stav'] ?? 0),
            'prijmy_mesic'    => (float)($souhrn_row['prijmy_mesic'] ?? 0),
            'vydaje_mesic'    => (float)($souhrn_row['vydaje_mesic'] ?? 0),
            'pocet_polozek'   => (int)($souhrn_row['pocet_polozek'] ?? 0),
            'aktivnich_knih'  => (int)($souhrn_row['aktivnich_knih'] ?? 0),
            'uzavrenych_knih' => (int)($souhrn_row['uzavrenych_knih'] ?? 0),
        ];

        // Detail každé pokladny
        $stmt2 = $db->prepare("
            SELECT
                pk.id as kniha_id,
                pk.pokladna_id,
                p.nazev as pokladna_nazev,
                p.cislo_pokladny,
                p.nazev_pracoviste,
                pk.pocatecni_stav,
                pk.koncovy_stav,
                pk.celkove_prijmy as prijmy,
                pk.celkove_vydaje as vydaje,
                pk.pocet_zaznamu as pocet_polozek,
                pk.stav_knihy
            FROM `" . TBL_POKLADNI_KNIHY . "` pk
            INNER JOIN `" . TBL_POKLADNY . "` p ON p.id = pk.pokladna_id AND p.aktivni = 1
            WHERE pk.rok = ? AND pk.mesic = ?
            ORDER BY p.cislo_pokladny ASC
        ");
        $stmt2->execute([$rok, $mesic]);
        $pokladny = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        return [
            'is_admin_view' => true,
            'rok'   => $rok,
            'mesic' => $mesic,
            'mesic_nazev' => $mesic_nazvy[$mesic] ?? '',
            'souhrn'  => $souhrn,
            'pokladny' => $pokladny
        ];

    } else {
        // === BĚŽNÝ UŽIVATEL: Jeho přiřazené pokladny ===

        // Zjistit ID přiřazených pokladen
        $stmt = $db->prepare("
            SELECT DISTINCT pu.pokladna_id
            FROM `" . TBL_POKLADNY_UZIVATELE . "` pu
            WHERE pu.uzivatel_id = ?
              AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
        ");
        $stmt->execute([$user_id]);
        $pokladna_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($pokladna_ids)) {
            return [
                'is_admin_view' => false,
                'rok' => $rok, 'mesic' => $mesic, 'mesic_nazev' => $mesic_nazvy[$mesic] ?? '',
                'pokladny' => [], 'souhrn' => null
            ];
        }

        $placeholders = implode(',', array_fill(0, count($pokladna_ids), '?'));
        $params = array_merge([$rok, $mesic], $pokladna_ids);

        $stmt2 = $db->prepare("
            SELECT
                pk.id as kniha_id,
                pk.pokladna_id,
                p.nazev as pokladna_nazev,
                p.cislo_pokladny,
                p.nazev_pracoviste,
                pk.pocatecni_stav,
                pk.koncovy_stav,
                pk.celkove_prijmy as prijmy,
                pk.celkove_vydaje as vydaje,
                pk.pocet_zaznamu as pocet_polozek,
                pk.stav_knihy
            FROM `" . TBL_POKLADNI_KNIHY . "` pk
            INNER JOIN `" . TBL_POKLADNY . "` p ON p.id = pk.pokladna_id AND p.aktivni = 1
            WHERE pk.rok = ? AND pk.mesic = ?
              AND pk.pokladna_id IN ({$placeholders})
            ORDER BY p.cislo_pokladny ASC
        ");
        $stmt2->execute($params);
        $pokladny = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        // Souhrn (zobrazit jen pokud má více pokladen)
        $souhrn = null;
        if (count($pokladny) > 1) {
            $souhrn = [
                'pocet_pokladen' => count($pokladny),
                'celkovy_stav'   => array_sum(array_column($pokladny, 'koncovy_stav')),
                'prijmy_mesic'   => array_sum(array_column($pokladny, 'prijmy')),
                'vydaje_mesic'   => array_sum(array_column($pokladny, 'vydaje')),
                'pocet_polozek'  => array_sum(array_column($pokladny, 'pocet_polozek')),
            ];
        }

        return [
            'is_admin_view' => false,
            'rok'   => $rok,
            'mesic' => $mesic,
            'mesic_nazev' => $mesic_nazvy[$mesic] ?? '',
            'pokladny' => $pokladny,
            'souhrn'   => $souhrn
        ];
    }
}

// ============================================================
// ENDPOINT: dashboard/chart-timeline
// Vrátí pouze data grafu objednávky v čase (bez reloadu celého dashboardu)
// POST: { token, username, chart_days: 7|14|30 }
// ============================================================
function handle_dashboard_chart_timeline($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    // Validace chart_days: povolené hodnoty 7, 14, 30, 90, 365
    $allowed_days = [7, 14, 30, 90, 365];
    $chart_days = isset($input['chart_days']) ? (int)$input['chart_days'] : 30;
    if (!in_array($chart_days, $allowed_days)) {
        $chart_days = 30;
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
        $perm_codes = array_column($token_data['permissions'] ?? [], 'kod_prava');
        $has_order_read = in_array('ORDER_READ_ALL', $perm_codes) || in_array('ORDER_VIEW_ALL', $perm_codes) || in_array('ORDER_MANAGE', $perm_codes) || $is_admin;

        $timeline = _dashboard_get_orders_timeline($db, $user_id, $is_admin, $has_order_read, $chart_days);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $timeline['items'],
            'group_by' => $timeline['group_by'],
            'chart_days' => $chart_days
        ]);

    } catch (Exception $e) {
        error_log('handle_dashboard_chart_timeline error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba při načítání grafu']);
    }
}

// ============================================================
// ENDPOINT: dashboard/cashbook-summary
// Vrátí pouze cashbook summary (bez reloadu celého dashboardu)
// ============================================================
function handle_dashboard_cashbook_summary($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    $cashbook_month = isset($input['cashbook_month']) ? (int)$input['cashbook_month'] : (int)date('n');
    if ($cashbook_month < 1 || $cashbook_month > 12) {
        $cashbook_month = (int)date('n');
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
        $permissions = $token_data['permissions'] ?? [];
        $perm_codes = array_column($permissions, 'kod_prava');

        $cashbook_summary = _dashboard_get_cashbook_summary($db, $user_id, $is_admin, $perm_codes, $cashbook_month);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data'   => $cashbook_summary
        ]);

    } catch (Exception $e) {
        error_log('handle_dashboard_cashbook_summary error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba při zpracování: ' . $e->getMessage()]);
    }
}

// ============================================================================
// AKTIVNÍ UŽIVATELÉ – pouze SUPERADMIN
// ============================================================================

/**
 * POST dashboard/active-users
 * Vrátí aktivní uživatele s rozšířenými informacemi (pouze SUPERADMIN).
 */
function handle_dashboard_active_users($input, $config) {
    $token    = $input['token']    ?? '';
    $username = $input['username'] ?? '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) throw new Exception('Chyba připojení k databázi');

        TimezoneHelper::setMysqlTimezone($db);

        $token_data = verify_token_v2($username, $token, $db);
        if (!$token_data || $token_data['username'] !== $username) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
            return;
        }

        $roles = $token_data['roles'] ?? [];
        if (!in_array('SUPERADMIN', $roles)) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Přístup odepřen – pouze SUPERADMIN']);
            return;
        }

        $data = _dashboard_get_active_users($db);

        http_response_code(200);
        echo json_encode(['status' => 'success', 'data' => $data]);

    } catch (Exception $e) {
        error_log('handle_dashboard_active_users error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba při zpracování: ' . $e->getMessage()]);
    }
}

/**
 * Vrátí aktivní uživatele (posledních 5 minut) s rozšířenými informacemi:
 * IP adresa, aktuální modul, počty objednávek (objednatel / schválené / ke schválení)
 *
 * @param PDO $db
 * @return array
 */
function _dashboard_get_active_users($db) {
    try {
        $stmt = $db->prepare("
            SELECT
                u.id,
                u.username,
                TRIM(CONCAT(
                    IFNULL(CONCAT(u.titul_pred, ' '), ''),
                    u.jmeno, ' ', u.prijmeni,
                    IFNULL(CONCAT(' ', u.titul_za), '')
                )) AS cele_jmeno,
                u.dt_posledni_aktivita,
                u.aktivita_metadata,
                IFNULL(us.usek_zkr,    '') AS usek_zkr,
                IFNULL(us.usek_nazev,  '') AS usek_nazev,
                IFNULL(p.nazev_pozice, '') AS pozice,

                /* Počet objednávek kde je objednatel (aktuální rok) */
                (SELECT COUNT(*)
                 FROM `" . TBL_OBJEDNAVKY . "`
                 WHERE uzivatel_id = u.id
                   AND aktivni = 1
                   AND YEAR(dt_objednavky) = YEAR(NOW())
                ) AS pocet_objednavek_objednatel,

                /* Počet schválených objednávek (příkazce nebo schvalovatel) */
                (SELECT COUNT(*)
                 FROM `" . TBL_OBJEDNAVKY . "`
                 WHERE (prikazce_id = u.id OR schvalovatel_id = u.id)
                   AND stav_objednavky IN ('SCHVALENA','ODESLANA','ODESLANA_DODAVATELI','POTVRZENA','FAKTURACE','VECNA_SPRAVNOST','UVEREJNIT','DOKONCENA')
                   AND aktivni = 1
                   AND YEAR(dt_objednavky) = YEAR(NOW())
                ) AS pocet_schvalenych,

                /* Počet objednávek čekajících na schválení (příkazce nebo schvalovatel) */
                (SELECT COUNT(*)
                 FROM `" . TBL_OBJEDNAVKY . "`
                 WHERE (prikazce_id = u.id OR schvalovatel_id = u.id)
                   AND stav_objednavky IN ('KE_SCHVALENI','ODESLANA_KE_SCHVALENI')
                   AND aktivni = 1
                ) AS pocet_ke_schvaleni,

                /* Role uživatele – čárkou oddělený seznam */
                (SELECT GROUP_CONCAT(r2.kod_role ORDER BY r2.kod_role SEPARATOR ',')
                 FROM `" . TBL_UZIVATELE_ROLE . "` ur2
                 JOIN `" . TBL_ROLE . "` r2 ON r2.id = ur2.role_id
                 WHERE ur2.uzivatel_id = u.id
                ) AS role_kody

            FROM `" . TBL_UZIVATELE . "` u
            LEFT JOIN `" . TBL_USEKY . "`  us ON u.usek_id    = us.id
            LEFT JOIN `" . TBL_POZICE . "`  p  ON u.pozice_id  = p.id
            WHERE u.dt_posledni_aktivita IS NOT NULL
              AND u.dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
              AND u.aktivni = 1
            ORDER BY u.dt_posledni_aktivita DESC
        ");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($rows as $row) {
            // Parsování aktivita_metadata (JSON)
            $meta = [];
            if (!empty($row['aktivita_metadata'])) {
                $decoded = json_decode($row['aktivita_metadata'], true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            }

            // Sestavení výsledku
            $result[] = [
                'id'                          => (int)$row['id'],
                'username'                    => $row['username'],
                'cele_jmeno'                  => $row['cele_jmeno'],
                'dt_posledni_aktivita'        => $row['dt_posledni_aktivita'],
                'usek_zkr'                    => $row['usek_zkr'],
                'usek_nazev'                  => $row['usek_nazev'],
                'pozice'                      => $row['pozice'],
                'ip_adresa'                   => $meta['last_public_ip'] ?? ($meta['last_local_ip'] ?? null),
                'ip_local'                    => $meta['last_local_ip'] ?? null,
                'modul'                       => $meta['last_module'] ?? null,
                'cesta'                       => $meta['last_path'] ?? null,
                'role_kody'                   => $row['role_kody'] ? explode(',', $row['role_kody']) : [],
                'pocet_objednavek_objednatel' => (int)$row['pocet_objednavek_objednatel'],
                'pocet_schvalenych'           => (int)$row['pocet_schvalenych'],
                'pocet_ke_schvaleni'          => (int)$row['pocet_ke_schvaleni'],
            ];
        }

        return [
            'items' => $result,
            'count' => count($result),
        ];

    } catch (Exception $e) {
        error_log('_dashboard_get_active_users error: ' . $e->getMessage());
        return ['items' => [], 'count' => 0];
    }
}
