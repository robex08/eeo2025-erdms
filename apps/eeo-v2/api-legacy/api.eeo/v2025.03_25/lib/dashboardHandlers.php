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
        // Backend posílá capability pokud má uživatel CASH_BOOK_* právo
        // Frontend kontroluje přiřazení pokladny v cashbook_summary.pokladny a případně widget nezobrazí
        $cash_perm_codes_list = ['CASH_BOOK_MANAGE', 'CASH_BOOK_READ_ALL', 'CASH_BOOK_READ_OWN',
                                 'CASH_BOOK_EDIT_ALL', 'CASH_BOOK_EDIT_OWN',
                                 'CASH_BOOK_EXPORT_ALL', 'CASH_BOOK_EXPORT_OWN'];
        $has_cashbook_perm = $is_admin || !empty(array_intersect($perm_codes, $cash_perm_codes_list));
        if ($has_cashbook_perm) {
            // Přidat capability - frontend zkontroluje přiřazení pokladen
            $dashboard_caps[] = 'DASHBOARD_CASH_BOOK';
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

        // === MOJE STATISTIKY (osobní přehled přihlášeného uživatele) ===
        $result['my_stats'] = _dashboard_get_my_stats($db, $user_id);

        // === STATISTIKY OBJEDNÁVEK ===
        // Vždy načíst – potřebné pro QuickTiles v hlavičce (widget zobrazení řídí frontend dle DASHBOARD_ORDERS_STATS)
        $usek_id = $user_info['usek_id'] ?? null;
        $result['orders_stats'] = _dashboard_get_order_stats($db, $user_id, $is_admin, $has_order_read, $perm_codes, $usek_id);

        // === MOJE OBJEDNÁVKY K AKCI ===
        $result['my_orders_pending'] = _dashboard_get_my_orders_pending($db, $user_id, $days, $has_order_approve, $is_admin, $usek_id, $perm_codes);

        // === FAKTURY K VĚCNÉ KONTROLE ===
        if ($has_cap('DASHBOARD_INVOICES_CONFIRM')) {
            $result['my_invoices_pending'] = _dashboard_get_invoices_pending_check($db, $user_id, $is_admin, $days, $usek_id, $perm_codes);
        }

        // === OBJEDNÁVKY KE SCHVÁLENÍ (příkazce) ===
        if ($has_cap('DASHBOARD_ORDERS_APPROVE')) {
            $result['orders_for_approval'] = _dashboard_get_orders_for_approval($db, $user_id, $is_admin, $days, $usek_id, $perm_codes);
        }

        // === FAKTURY PO SPLATNOSTI ===
        if ($has_cap('DASHBOARD_INVOICES_OVERDUE')) {
            $result['invoices_overdue'] = _dashboard_get_invoices_overdue($db, $user_id, $is_admin, $usek_id, $perm_codes);
        }

        // === FAKTURY BLÍŽÍCÍ SE SPLATNOSTI ===
        if ($has_cap('DASHBOARD_INVOICES_DUE_SOON')) {
            $result['invoices_due_soon'] = _dashboard_get_invoices_due_soon($db, $user_id, $is_admin, $days, $usek_id, $perm_codes);
        }

        // === REGISTR VZ - objednávky ke zveřejnění ===
        if ($has_cap('DASHBOARD_ORDERS_REGISTRY')) {
            $result['orders_for_registry'] = _dashboard_get_orders_for_registry($db, $user_id, $is_admin, $perm_codes);
        }

        // === REGISTR VZ - zveřejněné objednávky ===
        if ($has_cap('DASHBOARD_ORDERS_PUBLISHED')) {
            $result['orders_published_recent'] = _dashboard_get_orders_published($db, $user_id, $is_admin, $days, $perm_codes);
        }

        // === UPOZORNĚNÍ - prodlení ===
        $result['alerts'] = _dashboard_get_alerts($db, $user_id, $is_admin, $perm_codes);

        // === FOCUS ALERTS – personalizované kritické zprávy pod welcome card ===
        $result['focus_alerts'] = _dashboard_get_focus_alerts($db, $user_id, $is_admin, $perm_codes, $has_cap, $usek_id);

        // === NEPŘEČTENÉ NOTIFIKACE ===
        $result['notifications_unread'] = _dashboard_get_notifications_unread($db, $user_id, 5);

        // === NOTIFIKACE ZA 7 DNÍ (včetně přečtených) ===
        $result['notifications_recent'] = _dashboard_get_notifications_recent($db, $user_id, 7, 15);

        // === GRAF: OBJEDNÁVKY V ČASE (posledních 30 dní) ===
        if ($has_cap('DASHBOARD_CHART_TIMELINE')) {
            $timeline_result = _dashboard_get_orders_timeline($db, $user_id, $is_admin, $has_order_read, 30, $perm_codes);
            $result['chart_orders_timeline'] = $timeline_result['items'];
        }

        // === TOP DODAVATELÉ ===
        if ($has_cap('DASHBOARD_TOP_SUPPLIERS')) {
            $result['top_suppliers'] = _dashboard_get_top_suppliers($db, $user_id, $is_admin, $has_order_read, $perm_codes);
        }

        // === SMLOUVY - KRITICKÝ STAV (dle úseku uživatele) ===
        if ($has_cap('DASHBOARD_SPENDING_CONTRACTS')) {
            $result['smlouvy_critical'] = _dashboard_get_smlouvy_critical($db, $user_id, $is_admin, $usek_id, $perm_codes);
        }

        // === LP - KRITICKÝ STAV (dle úseku uživatele) ===
        if ($has_cap('DASHBOARD_SPENDING_LP')) {
            $result['lp_critical'] = _dashboard_get_lp_critical($db, $user_id, $is_admin, $usek_id, $perm_codes);
        }

        // === ROČNÍ POPLATKY - SPLATNOST ===
        if ($has_cap('DASHBOARD_ANNUAL_FEES')) {
            $result['annual_fees_due'] = _dashboard_get_annual_fees_due($db, $perm_codes);
        }

        // === GRAF: MAJETEK PODLE DRUHU ===
        if ($has_cap('DASHBOARD_CHART_MAJETEK')) {
            $result['chart_majetek_by_druh'] = _dashboard_get_majetek_by_druh($db, $user_id, $is_admin);
        }

        // === GRAF: ROČNÍ POPLATKY PODLE DRUHU A PLATBY ===
        if ($has_cap('DASHBOARD_CHART_FEES')) {
            $result['chart_fees_by_druh'] = _dashboard_get_fees_by_druh($db);
        }

        // === POKLADNA - PŘEHLED (aktuální nebo vybraný měsíc) ===
        if ($has_cap('DASHBOARD_CASH_BOOK')) {
            $cashbook_month = isset($input['cashbook_month']) ? (int)$input['cashbook_month'] : (int)date('n');
            if ($cashbook_month < 1 || $cashbook_month > 12) $cashbook_month = (int)date('n');
            $result['cashbook_summary'] = _dashboard_get_cashbook_summary($db, $user_id, $is_admin, $perm_codes, $cashbook_month);
        }

        // === KOMENTÁŘE K OBJEDNÁVKÁM (kde je uživatel účastník) ===
        $result['order_comments_recent'] = _dashboard_get_order_comments_recent($db, $user_id, $days, $is_admin, $perm_codes);

        // === STATISTIKY FAKTUR ===
        if ($has_cap('DASHBOARD_INVOICES_STATS')) {
            $result['invoices_stats'] = _dashboard_get_invoice_stats($db, $user_id, $is_invoice_admin, $is_invoice_admin, $usek_id, $perm_codes);
        }

        // === KONTAKTY - počet zaměstnanců + dodavatelů ===
        if ($is_admin || in_array('PHONEBOOK_VIEW', $perm_codes)) {
            $result['contacts_count'] = _dashboard_get_contacts_count($db);
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
        WHERE u.id = :user_id AND u.aktivni = 1
    ");
    $stmt->execute([':user_id' => $user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) return null;

    // Načtení rolí
    $stmt2 = $db->prepare("
        SELECT r.nazev_role, r.kod_role
        FROM `" . TBL_UZIVATELE_ROLE . "` ur
        JOIN `" . TBL_ROLE . "` r ON r.id = ur.role_id
        WHERE ur.uzivatel_id = :user_id
    ");
    $stmt2->execute([':user_id' => $user_id]);
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
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);
    
    // Rok filtr - stejný jako OrderV3 (dt_objednavky = datum objednávky)
    $where_sql = "o.aktivni = 1 AND o.id != 1 AND YEAR(o.dt_objednavky) = YEAR(CURDATE()) {$v3_filter['where']}";
    $params = $v3_filter['params'];
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
function _dashboard_get_my_orders_pending($db, $user_id, $days, $has_order_approve = false, $is_admin = false, $usek_id = null, $permissions = []) {
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);
    
    $excluded_states = "('DOKONCENA', 'ZKONTROLOVANA', 'ZRUSENA', 'ZAMITNUTA', 'STORNOVANA')";

    $select = "
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni,
               JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) as aktualni_stav,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_gar.jmeno as garant_jmeno, u_gar.prijmeni as garant_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni,
               u_schv.jmeno as schvalovatel_jmeno, u_schv.prijmeni as schvalovatel_prijmeni,
               DATEDIFF(CURDATE(), o.dt_vytvoreni) as dni_od_vytvoreni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_gar ON u_gar.id = o.garant_uzivatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_schv ON u_schv.id = o.schvalovatel_id
        WHERE o.aktivni = 1
          AND o.id != 1
          AND YEAR(o.dt_vytvoreni) = YEAR(CURDATE())
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
              NOT IN {$excluded_states}
          {$v3_filter['where']}
    ";

    $stmt = $db->prepare($select . " ORDER BY o.dt_vytvoreni DESC LIMIT 50");
    $stmt->execute($v3_filter['params']);
    $all_orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Kategorizace objednávek podle role uživatele
    $objednatel = [];
    $garant = [];
    $prikazce = [];
    $ostatni = [];
    
    foreach ($all_orders as $order) {
        // Detekce primární role v objednávce
        $role_priority = [];
        if ($order['objednavatel_jmeno'] || (!$order['objednatel_jmeno'] && $order['uzivatel_id'] == $user_id)) {
            $role_priority[] = ['category' => 'objednatel', 'priority' => 1];
        }
        if (!empty($order['garant_jmeno'])) {
            $role_priority[] = ['category' => 'garant', 'priority' => 2];
        }
        if (($has_order_approve && !empty($order['prikazce_jmeno'])) || !empty($order['schvalovatel_jmeno'])) {
            $role_priority[] = ['category' => 'prikazce', 'priority' => 3];
        }
        
        // Přiřadit do kategorie podle nejvyšší priority (nejnižší číslo)
        usort($role_priority, function($a, $b) { return $a['priority'] - $b['priority']; });
        
        if (!empty($role_priority)) {
            $category = $role_priority[0]['category'];
            if ($category === 'objednatel' && count($objednatel) < 25) {
                $objednatel[] = $order;
            } elseif ($category === 'garant' && count($garant) < 25) {
                $garant[] = $order;
            } elseif ($category === 'prikazce' && count($prikazce) < 25) {
                $prikazce[] = $order;
            } else {
                $ostatni[] = $order;
            }
        } else {
            $ostatni[] = $order;
        }
    }

    return [
        'objednatel'        => $objednatel,
        'garant'            => $garant,
        'prikazce'          => $prikazce,
        'usek'              => $ostatni,
        'has_prikazce_role' => $has_order_approve,
        'is_admin'          => $is_admin,
        'total_count'       => count($all_orders)
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
function _dashboard_get_invoices_pending_check($db, $user_id, $is_admin, $days, $usek_id = null, $permissions = []) {
    $filter = _dashboard_build_invoice_v3_where($db, $user_id, $is_admin, $permissions, $usek_id);
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
function _dashboard_get_orders_for_approval($db, $user_id, $is_admin, $days, $usek_id = null, $permissions = []) {
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);
    
    // Dodatečný filtr pro ke schválení - pouze objednávky ve stavech ke schválení
    $approval_filter = "";
    $params = [];
    
    if (!$is_admin) {
        // Běžný user vidí jen objednávky kde je příkazce/schvalovatel nebo z úseku
        $conditions = ["o.prikazce_id = :appr_user_id", "o.schvalovatel_id = :appr_schv_id"];
        $params[':appr_user_id'] = $user_id;
        $params[':appr_schv_id'] = $user_id;
        if ($usek_id) {
            $conditions[] = "o.usek_id = :appr_usek_id";
            $params[':appr_usek_id'] = $usek_id;
        }
        $approval_filter = "AND (" . implode(' OR ', $conditions) . ")";
    }
    
    $all_params = array_merge($v3_filter['params'], $params);

    $stmt = $db->prepare("
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni,
               JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) as aktualni_stav,
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
          {$v3_filter['where']}
          {$approval_filter}
        ORDER BY o.dt_vytvoreni ASC
        LIMIT 50
    ");
    $stmt->execute($all_params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Faktury po splatnosti
 */
function _dashboard_get_invoices_overdue($db, $user_id, $is_admin, $usek_id = null, $permissions = []) {
    $filter = _dashboard_build_invoice_v3_where($db, $user_id, $is_admin, $permissions, $usek_id);
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
function _dashboard_get_invoices_due_soon($db, $user_id, $is_admin, $days, $usek_id = null, $permissions = []) {
    $filter = _dashboard_build_invoice_v3_where($db, $user_id, $is_admin, $permissions, $usek_id);
    $where_user = $filter['where'];
    $params = array_merge($filter['params'], [':days_interval' => $days]);

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
          AND f.fa_datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL :days_interval DAY)
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
 * Respektuje Order V3 viditelnost (12-role WHERE).
 */
function _dashboard_get_orders_for_registry($db, $user_id, $is_admin, $permissions = []) {
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);
    
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
          {$v3_filter['where']}
        ORDER BY dni_cekani DESC, o.dt_vytvoreni ASC
        LIMIT 30
    ");
    $stmt->execute($v3_filter['params']);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Zveřejněné objednávky - primárně posledních 7 dní, fallback na posledních 10 v roce.
 * Vrací: { items: [...], is_fallback: bool }
 * Respektuje Order V3 viditelnost (12-role WHERE).
 */
function _dashboard_get_orders_published($db, $user_id, $is_admin, $days, $permissions = []) {
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);
    
    $select = "
        SELECT o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph as celkova_cena_s_dph,
               o.stav_objednavky, o.dt_vytvoreni, o.dt_zverejneni,
               u_obj.jmeno as objednavatel_jmeno, u_obj.prijmeni as objednavatel_prijmeni,
               u_prik.jmeno as prikazce_jmeno, u_prik.prijmeni as prikazce_prijmeni,
               u_zver.jmeno as zverejnil_jmeno, u_zver.prijmeni as zverejnil_prijmeni
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
        LEFT JOIN `" . TBL_UZIVATELE . "` u_prik ON u_prik.id = o.prikazce_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u_zver ON u_zver.id = o.zverejnil_id
        WHERE o.aktivni = 1
          AND o.id != 1
          AND (
              (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
              OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
          )
          {$v3_filter['where']}
    ";

    // 1. Nejdřív zkus posledních 7 dní
    $stmt = $db->prepare($select . "
          AND o.dt_zverejneni >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY o.dt_zverejneni DESC
        LIMIT 15
    ");
    $stmt->execute($v3_filter['params']);
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
    $stmt2->execute($v3_filter['params']);
    $items2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    return ['items' => $items2, 'is_fallback' => true];
}

/**
 * Upozornění na prodlení
 */
function _dashboard_get_alerts($db, $user_id, $is_admin, $permissions) {
    $alerts = [];

    // 1. Objednávky v prodlení - ve fázi fakturace (POTVRZENA až VECNA_SPRAVNOST), bez akce >7 dní
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);

    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE o.aktivni = 1
          AND o.id != 1
          AND JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
              IN ('POTVRZENA', 'FAKTURACE', 'VECNA_SPRAVNOST')
          AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 7
          {$v3_filter['where']}
    ");
    $stmt->execute($v3_filter['params']);
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

    // --- 6. Kritické LP přísliby (>=90% totální čerpání) ---
    // ✅ OPRAVA: používáme TOTÁLNÍ čerpání (skutecne + predpokladane + rezervovano) konzistentně s modulem Čerpání
    if ($has_cap('DASHBOARD_SPENDING_LP') || $is_admin) {
        $where_lp = ($is_admin || !$usek_id) ? "" : "AND c.usek_id = ?";
        $params_lp = [date('Y')];
        if (!$is_admin && $usek_id) {
            $params_lp[] = $usek_id;
        }

        // Počet LP >=90% (kritické + překročené)
        $stmt = $db->prepare("
            SELECT 
                SUM(CASE WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 0.9
                          AND ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) < 1.0 THEN 1 ELSE 0 END) as kriticke,
                SUM(CASE WHEN ((c.skutecne_cerpano + c.predpokladane_cerpani + c.rezervovano) / NULLIF(c.celkovy_limit, 0)) >= 1.0 THEN 1 ELSE 0 END) as prekrocene
            FROM `" . TBL_LIMITOVANE_PRISLIBY_CERPANI . "` c
            WHERE c.rok = ?
              AND c.celkovy_limit > 0
              {$where_lp}
        ");
        $stmt->execute($params_lp);
        $row_lp = $stmt->fetch(PDO::FETCH_ASSOC);
        $cnt_kriticke = (int)($row_lp['kriticke'] ?? 0);
        $cnt_prekrocene = (int)($row_lp['prekrocene'] ?? 0);

        // Alert pro PŘEČERPANÉ LP (>= 100%) - DANGER
        if ($cnt_prekrocene > 0) {
            $items[] = [
                'severity' => 'danger',
                'icon' => 'coins',
                'text' => "{$cnt_prekrocene} " . ($cnt_prekrocene === 1 ? 'LP příslib je' : ($cnt_prekrocene < 5 ? 'LP přísliby jsou' : 'LP příslibů je')) . " přečerpáno",
                'link' => '/cerpani',
                'linkTab' => 'limited-promises',
                'count' => $cnt_prekrocene
            ];
        }

        // Alert pro KRITICKÉ LP (90-99%) - WARNING
        if ($cnt_kriticke > 0) {
            $items[] = [
                'severity' => 'warning',
                'icon' => 'coins',
                'text' => "{$cnt_kriticke} " . ($cnt_kriticke === 1 ? 'LP příslib má' : ($cnt_kriticke < 5 ? 'LP přísliby mají' : 'LP příslibů má')) . " vyčerpáno přes 90 %",
                'link' => '/cerpani',
                'linkTab' => 'limited-promises',
                'count' => $cnt_kriticke
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

    // --- 9. Moje objednávky ve zpracování (pro objednatele/garanta) ---
    // Objednatel/garant vidí kolik JEHO objednávek je schválených, odeslaných, čeká na fakturu atd.
    if (!$is_admin) {
        $stav_sql = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))";

        // a) Schválené, ke zpracování
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.uzivatel_id = ? OR o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND {$stav_sql} = 'SCHVALENA'
              AND YEAR(o.dt_objednavky) = YEAR(CURDATE())
        ");
        $stmt->execute([$user_id, $user_id, $user_id]);
        $cnt9a = (int)$stmt->fetchColumn();
        if ($cnt9a > 0) {
            $items[] = [
                'severity' => 'info',
                'icon' => 'gavel',
                'text' => "{$cnt9a} " . ($cnt9a === 1 ? 'objednávka schválena' : ($cnt9a < 5 ? 'objednávky schváleny' : 'objednávek schváleno')) . ", ke zpracování",
                'link' => '/orders25-list-v3',
                'linkFilterStav' => 'SCHVALENA',
                'count' => $cnt9a
            ];
        }

        // b) Odesláno dodavateli / čeká potvrzení
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.uzivatel_id = ? OR o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND {$stav_sql} IN ('ODESLANA', 'ODESLANA_DODAVATELI')
              AND YEAR(o.dt_objednavky) = YEAR(CURDATE())
        ");
        $stmt->execute([$user_id, $user_id, $user_id]);
        $cnt9b = (int)$stmt->fetchColumn();
        if ($cnt9b > 0) {
            $items[] = [
                'severity' => 'info',
                'icon' => 'hourglass-half',
                'text' => "{$cnt9b} " . ($cnt9b === 1 ? 'objednávka odeslaná' : ($cnt9b < 5 ? 'objednávky odeslané' : 'objednávek odesláno')) . " dodavateli",
                'link' => '/orders25-list-v3',
                'linkFilterStav' => 'ODESLANA',
                'count' => $cnt9b
            ];
        }

        // c) Potvrzeno dodavatelem, čeká faktura
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.uzivatel_id = ? OR o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND {$stav_sql} IN ('POTVRZENA', 'FAKTURACE')
              AND YEAR(o.dt_objednavky) = YEAR(CURDATE())
        ");
        $stmt->execute([$user_id, $user_id, $user_id]);
        $cnt9c = (int)$stmt->fetchColumn();
        if ($cnt9c > 0) {
            $items[] = [
                'severity' => 'info',
                'icon' => 'file-invoice',
                'text' => "{$cnt9c} " . ($cnt9c === 1 ? 'objednávka čeká' : ($cnt9c < 5 ? 'objednávky čekají' : 'objednávek čeká')) . " na fakturaci",
                'link' => '/orders25-list-v3',
                'linkFilterStav' => 'POTVRZENA',
                'count' => $cnt9c
            ];
        }

        // d) Věcná správnost / ke zveřejnění
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.uzivatel_id = ? OR o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND ({$stav_sql} IN ('VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'UVEREJNIT')
                   OR (" . sqlNormalizeExpression('o.zverejnit') . " = 'ano'
                       AND NOT (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)))
              AND YEAR(o.dt_objednavky) = YEAR(CURDATE())
        ");
        $stmt->execute([$user_id, $user_id, $user_id]);
        $cnt9d = (int)$stmt->fetchColumn();
        if ($cnt9d > 0) {
            $items[] = [
                'severity' => 'info',
                'icon' => 'chart-line',
                'text' => "{$cnt9d} " . ($cnt9d === 1 ? 'objednávka' : ($cnt9d < 5 ? 'objednávky' : 'objednávek')) . " čeká na věcnou správnost / zveřejnění",
                'link' => '/orders25-list-v3',
                'linkFilterStav' => 'VECNA_SPRAVNOST',
                'count' => $cnt9d
            ];
        }
    }

    // Sort by severity (danger first, then warning, then info)
    usort($items, function($a, $b) {
        $order = ['danger' => 0, 'warning' => 1, 'info' => 2];
        return ($order[$a['severity']] ?? 9) - ($order[$b['severity']] ?? 9);
    });

    return $items;
}

/**
 * Co nového od posledního přihlášení — rozděleno do 2 sekcí:
 * 1) "Vyžaduje vaši akci" — aktuální stav bez časového filtru
 * 2) "Změny od přihlášení" — události od dt_posledni_prihlaseni
 */
function _dashboard_get_news_since_login($db, $user_id, $is_admin, $perm_codes, $last_login, $usek_id) {
    $action_items = [];  // Sekce 1: Vyžaduje vaši akci (bez časového filtru)
    $changes = [];       // Sekce 2: Změny od přihlášení (s časovým filtrem)

    // Období: od posledního přihlášení, včetně dneška
    $today = date('Y-m-d 00:00:00');
    $since = $last_login ?: $today;

    // ============================================================
    // SEKCE 1: VYŽADUJE VAŠI AKCI (bez časového filtru – aktuální stav)
    // ============================================================

    // 1a. Objednávky čekající ke schválení
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
            $action_items[] = [
                'icon' => 'gavel',
                'text' => "{$cnt} " . ($cnt === 1 ? 'objednávka čeká' : ($cnt < 5 ? 'objednávky čekají' : 'objednávek čeká')) . " ke schválení",
                'link' => '/orders25-list-v3',
                'filter' => 'ke_schvaleni',
                'count' => $cnt
            ];
        }
    }

    // 1b. Faktury čekající na potvrzení
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
            $action_items[] = [
                'icon' => 'file-invoice',
                'text' => "{$cnt} " . ($cnt === 1 ? 'faktura čeká' : ($cnt < 5 ? 'faktury čekají' : 'faktur čeká')) . " na potvrzení",
                'link' => '/invoices25-list',
                'filter' => 'my_invoices',
                'count' => $cnt
            ];
        }
    }

    // ============================================================
    // SEKCE 2: ZMĚNY OD PŘIHLÁŠENÍ (s časovým filtrem od $since)
    // ============================================================

    // 2a. Nově vytvořené objednávky (kde je uživatel objednatel/garant)
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
            $changes[] = [
                'icon' => 'shopping-cart',
                'text' => "{$cnt} " . ($cnt === 1 ? 'nová objednávka' : ($cnt < 5 ? 'nové objednávky' : 'nových objednávek')),
                'link' => '/orders25-list-v3',
                'filter' => null,
                'count' => $cnt
            ];
        }
    }

    // 2b. Schválené objednávky
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
            $changes[] = [
                'icon' => 'check-circle',
                'text' => "{$cnt} " . ($cnt === 1 ? 'objednávka schválena' : ($cnt < 5 ? 'objednávky schváleny' : 'objednávek schváleno')),
                'link' => '/orders25-list-v3',
                'filter' => 'schvalena',
                'count' => $cnt
            ];
        }
    }

    // 2c. Zamítnuté objednávky
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
            $changes[] = [
                'icon' => 'exclamation-triangle',
                'text' => "{$cnt} " . ($cnt === 1 ? 'objednávka zamítnuta' : ($cnt < 5 ? 'objednávky zamítnuty' : 'objednávek zamítnuto')),
                'link' => '/orders25-list-v3',
                'filter' => 'zamitnuta',
                'count' => $cnt
            ];
        }
    }

    // 2d. Dokončené objednávky
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
            $changes[] = [
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

    return [
        'action_items' => $action_items,
        'changes' => $changes,
        'since' => $since,
        'since_formatted' => $since_formatted
    ];
}

/**
 * Moje statistiky – osobní přehled přihlášeného uživatele
 * Vrací: počty objednávek k vyřízení, faktur k potvrzení, ke zveřejnění,
 *        částky odeslaných bez faktury a vyfakturovaných nedokončených
 */
function _dashboard_get_my_stats($db, $user_id) {
    $stav_sql = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))";
    $stats = [];

    try {
        // 1. Moje objednávky k vyřízení (ke schválení / rozpracované odeslané)
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ? OR o.prikazce_id = ?)
              AND {$stav_sql} IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI', 'ROZPRACOVANA')
        ");
        $stmt->execute([$user_id, $user_id, $user_id]);
        $stats['objednavky_k_vyrizeni'] = (int)$stmt->fetchColumn();

        // 2. Faktury k potvrzení (kde jsem zodpovědný za věcnou správnost)
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_FAKTURY . "` f
            WHERE f.aktivni = 1
              AND f.stav IN ('ZAEVIDOVANA', 'VECNA_SPRAVNOST')
              AND (f.potvrdil_vecnou_spravnost_id = ? OR f.fa_predana_zam_id = ?)
        ");
        $stmt->execute([$user_id, $user_id]);
        $stats['faktury_k_potvrzeni'] = (int)$stmt->fetchColumn();

        // 3. Moje objednávky ke zveřejnění do registru
        $stmt = $db->prepare("
            SELECT COUNT(*) as cnt
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND (
                  {$stav_sql} = 'UVEREJNIT'
                  OR o.zverejnit = 'ano'
                  OR o.stav_objednavky = 'ke zverejneni'
              )
              AND NOT (
                  (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                  OR o.stav_objednavky = 'uverejnena v registru smluv'
              )
        ");
        $stmt->execute([$user_id, $user_id]);
        $stats['ke_zverejneni'] = (int)$stmt->fetchColumn();

        // 4. Odeslané objednávky BEZ faktury – částka (max_cena_s_dph / položky)
        // 4. U dodavatele bez faktury – ODESLANA/POTVRZENA/CEKA_POTVRZENI (dle workflow)
        $stmt = $db->prepare("
            SELECT 
                COUNT(*) as cnt,
                COALESCE(SUM(
                    CASE
                        WHEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id) > 0
                        THEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id)
                        ELSE COALESCE(o.max_cena_s_dph, 0)
                    END
                ), 0) as castka
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND {$stav_sql} IN ('ODESLANA', 'ODESLANA_DODAVATELI', 'CEKA_POTVRZENI', 'POTVRZENA')
              AND (SELECT COUNT(*) FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.aktivni = 1) = 0
        ");
        $stmt->execute([$user_id, $user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['odeslane_bez_faktury'] = [
            'count' => (int)$row['cnt'],
            'castka' => round((float)$row['castka'], 2)
        ];

        // 4b. Schválené objednávky k odeslání (schváleny, ale ještě neodeslány dodavateli)
        $stmt = $db->prepare("
            SELECT 
                COUNT(*) as cnt,
                COALESCE(SUM(
                    CASE
                        WHEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id) > 0
                        THEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id)
                        ELSE COALESCE(o.max_cena_s_dph, 0)
                    END
                ), 0) as castka
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND {$stav_sql} = 'SCHVALENA'
        ");
        $stmt->execute([$user_id, $user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['schvalene_k_odeslani'] = [
            'count' => (int)$row['cnt'],
            'castka' => round((float)$row['castka'], 2)
        ];

        // 5. Vyfakturované ale nedokončené objednávky – částka faktur
        $stmt = $db->prepare("
            SELECT 
                COUNT(*) as cnt,
                COALESCE(SUM(
                    (SELECT COALESCE(SUM(f.fa_castka), 0) FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                ), 0) as castka
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE o.aktivni = 1 AND o.id != 1
              AND (o.objednatel_id = ? OR o.garant_uzivatel_id = ?)
              AND {$stav_sql} NOT IN ('DOKONCENA', 'ZKONTROLOVANA', 'ZRUSENA', 'STORNOVANA', 'ZAMITNUTA')
              AND (SELECT COUNT(*) FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
        ");
        $stmt->execute([$user_id, $user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['vyfakturovane_nedokoncene'] = [
            'count' => (int)$row['cnt'],
            'castka' => round((float)$row['castka'], 2)
        ];

    } catch (Exception $e) {
        error_log("Dashboard my_stats error: " . $e->getMessage());
        return ['error' => 'Chyba při načítání statistik'];
    }

    return $stats;
}

/**
 * Nepřečtené notifikace
 */
function _dashboard_get_notifications_unread($db, $user_id, $limit) {
    $stmt = $db->prepare("
        SELECT n.id, n.typ, n.nadpis, n.zprava, n.priorita, n.kategorie,
               n.objekt_typ, n.objekt_id, n.dt_created, n.od_uzivatele_id,
               nr.precteno, nr.skryto,
               from_user.jmeno as from_user_jmeno, from_user.prijmeni as from_user_prijmeni
        FROM `" . TBL_NOTIFIKACE . "` n
        INNER JOIN `" . TBL_NOTIFIKACE_PRECTENI . "` nr 
            ON n.id = nr.notifikace_id
        LEFT JOIN `" . TBL_UZIVATELE . "` from_user
            ON n.od_uzivatele_id = from_user.id
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
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Přidat from_user_name
    return array_map(function($notif) {
        if ($notif['from_user_jmeno']) {
            $notif['from_user_name'] = trim($notif['from_user_jmeno'] . ' ' . ($notif['from_user_prijmeni'] ?? ''));
        }
        return $notif;
    }, $notifications);
}

/**
 * Notifikace za posledních N dní (včetně přečtených)
 * Vrací pole s příznakem precteno pro FE styling (přečtené = zeslabené)
 * ✅ JOIN na faktury a objednávky - získání čísel přímo z DB
 * ✅ JOIN na uživatele - objednatel, příkazce, schvalovatel, vytvořil FA, předáno komu
 */
function _dashboard_get_notifications_recent($db, $user_id, $days = 7, $limit = 15) {
    $stmt = $db->prepare("
        SELECT n.id, n.typ, n.nadpis, n.zprava, n.priorita, n.kategorie,
               n.objekt_typ, n.objekt_id, n.data_json, n.dt_created, n.od_uzivatele_id,
               nr.precteno, nr.skryto, nr.dt_precteno,
               o.cislo_objednavky, o.predmet as objednavka_predmet, o.max_cena_s_dph as objednavka_cena,
               o.stav_objednavky,
               f.fa_cislo_vema, f.fa_castka, f.fa_datum_splatnosti, f.stav as faktura_stav,
               CASE 
                   WHEN f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE() AND f.stav NOT IN ('ZAPLACENO','DOKONCENA','STORNO') 
                   THEN 1 
                   ELSE 0 
               END as je_po_splatnosti,
               objednatel.jmeno as objednatel_jmeno, objednatel.prijmeni as objednatel_prijmeni,
               prikazce.jmeno as prikazce_jmeno, prikazce.prijmeni as prikazce_prijmeni,
               schvalovatel.jmeno as schvalovatel_jmeno, schvalovatel.prijmeni as schvalovatel_prijmeni,
               vytvoril_fa.jmeno as vytvoril_fa_jmeno, vytvoril_fa.prijmeni as vytvoril_fa_prijmeni,
               predano_komu.jmeno as predano_komu_jmeno, predano_komu.prijmeni as predano_komu_prijmeni,
               from_user.jmeno as from_user_jmeno, from_user.prijmeni as from_user_prijmeni
        FROM `" . TBL_NOTIFIKACE . "` n
        INNER JOIN `" . TBL_NOTIFIKACE_PRECTENI . "` nr 
            ON n.id = nr.notifikace_id
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o
            ON n.objekt_typ = 'orders' AND n.objekt_id = o.id
        LEFT JOIN `" . TBL_FAKTURY . "` f
            ON n.objekt_typ = 'invoices' AND n.objekt_id = f.id
        LEFT JOIN `" . TBL_UZIVATELE . "` objednatel
            ON o.objednatel_id = objednatel.id
        LEFT JOIN `" . TBL_UZIVATELE . "` prikazce
            ON o.prikazce_id = prikazce.id
        LEFT JOIN `" . TBL_UZIVATELE . "` schvalovatel
            ON o.schvalovatel_id = schvalovatel.id
        LEFT JOIN `" . TBL_UZIVATELE . "` vytvoril_fa
            ON f.vytvoril_uzivatel_id = vytvoril_fa.id
        LEFT JOIN `" . TBL_UZIVATELE . "` predano_komu
            ON f.fa_predana_zam_id = predano_komu.id
        LEFT JOIN `" . TBL_UZIVATELE . "` from_user
            ON n.od_uzivatele_id = from_user.id
        WHERE n.aktivni = 1
          AND nr.uzivatel_id = ?
          AND nr.smazano = 0
          AND (n.dt_expires IS NULL OR n.dt_expires > NOW())
          AND n.dt_created >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY nr.precteno ASC, n.dt_created DESC
        LIMIT " . (int)$limit . "
    ");
    $stmt->execute([$user_id, (int)$days]);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // DEBUG: Log prvních notifikací
    if (count($notifications) > 0) {
        error_log("🔔 [Dashboard Notifications] Počet: " . count($notifications));
        $first = $notifications[0];
        error_log("🔔 [First notif] typ={$first['typ']}, objekt_typ={$first['objekt_typ']}, stav_obj={$first['stav_objednavky']}, stav_fa={$first['faktura_stav']}");
    }
    
    // Parsuj data_json + doplň čísla a jména z DB
    return array_map(function($notif) {
        $data = $notif['data_json'] ? json_decode($notif['data_json'], true) : [];
        $placeholders = isset($data['placeholders']) ? $data['placeholders'] : [];
        
        // ✅ Doplň čísla z DB (priorita: placeholders → DB)
        if ($notif['cislo_objednavky'] && empty($placeholders['order_number'])) {
            $placeholders['order_number'] = $notif['cislo_objednavky'];
        }
        if ($notif['fa_cislo_vema'] && empty($placeholders['invoice_number'])) {
            $placeholders['invoice_number'] = $notif['fa_cislo_vema'];
        }
        
        // ✅ Doplň jména z DB
        if ($notif['objednatel_jmeno']) {
            $placeholders['objednatel_name'] = trim($notif['objednatel_jmeno'] . ' ' . $notif['objednatel_prijmeni']);
        }
        if ($notif['prikazce_jmeno']) {
            $placeholders['prikazce_name'] = trim($notif['prikazce_jmeno'] . ' ' . $notif['prikazce_prijmeni']);
        }
        if ($notif['schvalovatel_jmeno']) {
            $placeholders['schvalovatel_name'] = trim($notif['schvalovatel_jmeno'] . ' ' . $notif['schvalovatel_prijmeni']);
        }
        if ($notif['vytvoril_fa_jmeno']) {
            $placeholders['vytvoril_fa_name'] = trim($notif['vytvoril_fa_jmeno'] . ' ' . $notif['vytvoril_fa_prijmeni']);
        }
        if ($notif['predano_komu_jmeno']) {
            $placeholders['predano_komu_name'] = trim($notif['predano_komu_jmeno'] . ' ' . $notif['predano_komu_prijmeni']);
        }
        
        // ✅ from_user_name (odesílatel notifikace)
        $from_user_name = null;
        if ($notif['from_user_jmeno']) {
            $from_user_name = trim($notif['from_user_jmeno'] . ' ' . ($notif['from_user_prijmeni'] ?? ''));
        }
        
        // ✅ Doplň další detaily z DB
        if ($notif['objednavka_predmet']) {
            $placeholders['order_subject'] = $notif['objednavka_predmet'];
        }
        if ($notif['objednavka_cena']) {
            $placeholders['order_amount_raw'] = $notif['objednavka_cena'];
        }
        if ($notif['fa_castka']) {
            $placeholders['invoice_amount_raw'] = $notif['fa_castka'];
        }
        if ($notif['fa_datum_splatnosti']) {
            $placeholders['invoice_due_date'] = date('d.m.Y', strtotime($notif['fa_datum_splatnosti']));
        }
        
        // ✅ Stav objednávky/faktury
        if ($notif['stav_objednavky']) {
            $placeholders['order_status'] = $notif['stav_objednavky'];
        }
        if ($notif['faktura_stav']) {
            $placeholders['invoice_status'] = $notif['faktura_stav'];
            $placeholders['invoice_is_overdue'] = $notif['je_po_splatnosti'];
        }
        
        $data['placeholders'] = $placeholders;
        
        return [
            'id' => (int)$notif['id'],
            'typ' => $notif['typ'],
            'nadpis' => $notif['nadpis'],
            'zprava' => $notif['zprava'],
            'priorita' => $notif['priorita'],
            'kategorie' => $notif['kategorie'],
            'objekt_typ' => $notif['objekt_typ'],
            'objekt_id' => $notif['objekt_id'] ? (int)$notif['objekt_id'] : null,
            'data' => $data,
            'precteno' => $notif['precteno'],
            'dt_precteno' => $notif['dt_precteno'],
            'dt_created' => $notif['dt_created'],
            'from_user_name' => $from_user_name
        ];
    }, $notifications);
}

/**
 * Graf: denní počty objednávek za posledních N dní
 */
function _dashboard_get_orders_timeline($db, $user_id, $is_admin, $has_order_read, $days, $permissions = []) {
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);
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

    $all_params = array_merge($v3_filter['params'], [':timeline_days' => $days]);

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
          AND o.dt_vytvoreni >= DATE_SUB(CURDATE(), INTERVAL :timeline_days DAY)
          {$v3_filter['where']}
        GROUP BY {$group_clause}
        ORDER BY den ASC
    ");
    $stmt->execute($all_params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return ['items' => $items, 'group_by' => $group_by];
}

/**
 * Top dodavatelé (za aktuální rok)
 */
function _dashboard_get_top_suppliers($db, $user_id, $is_admin, $has_order_read, $permissions = []) {
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);

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
          {$v3_filter['where']}
        GROUP BY o.dodavatel_nazev
        ORDER BY celkova_castka DESC
        LIMIT 8
    ");
    $stmt->execute($v3_filter['params']);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Smlouvy v kritickém stavu - dle úseku uživatele
 * Kritický stav = čerpání >= 75% stropní ceny NEBO platnost končí do 30 dnů
 * Pouze AKTIVNÍ smlouvy (ne ukončené)
 */
function _dashboard_get_smlouvy_critical($db, $user_id, $is_admin, $usek_id, $permissions = []) {
    // Smlouvy - kontrola práv (LP_MANAGE nebo ADMIN vidí všechny, ostatní jen svého úseku)
    $hasLpManage = in_array('LP_MANAGE', $permissions) || in_array('SMLOUVA_MANAGE', $permissions);
    $canViewAll = $is_admin || $hasLpManage;
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
function _dashboard_get_lp_critical($db, $user_id, $is_admin, $usek_id, $permissions = []) {
    // LP - kontrola práv (LP_MANAGE nebo ADMIN vidí všechny, ostatní jen svého úseku)
    $hasLpManage = in_array('LP_MANAGE', $permissions);
    $canViewAll = $is_admin || $hasLpManage;
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
function _dashboard_get_order_comments_recent($db, $user_id, $days = 7, $is_admin = false, $permissions = []) {
    // Aplikovat Order V3 viditelnost (12-role WHERE)
    $v3_filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);
    
    $date_from = date('Y-m-d', strtotime("-{$days} days"));

    // Načte objednávky kde jsem autor komentáře NEBO jsem zapojen do objednávky (Order V3 pravidla)
    // Seskupí dle objednávky, vrátí poslední komentář + počet komentářů za období
    $all_params = array_merge($v3_filter['params'], [':comments_date_from' => $date_from, ':comments_user_id' => $user_id]);
    $stmt = $db->prepare("
        SELECT
            o.id as objednavka_id,
            o.cislo_objednavky,
            o.predmet,
            o.max_cena_s_dph,
            o.dt_objednavky,
            DATEDIFF(CURDATE(), o.dt_objednavky) as dni_od_vytvoreni,
            COUNT(k.id) as komentaru_celkem,
            MAX(k.dt_vytvoreni) as posledni_komentar_dt,
            SUBSTRING_INDEX(GROUP_CONCAT(k.obsah_plain ORDER BY k.dt_vytvoreni DESC SEPARATOR '|||'), '|||', 1) as posledni_obsah,
            SUBSTRING_INDEX(GROUP_CONCAT(CONCAT(au.jmeno, ' ', au.prijmeni) ORDER BY k.dt_vytvoreni DESC SEPARATOR '|||'), '|||', 1) as posledni_autor,
            TRIM(CONCAT(COALESCE(obd.jmeno, ''), ' ', COALESCE(obd.prijmeni, ''))) as objednatel_jmeno,
            TRIM(CONCAT(COALESCE(sch.jmeno, ''), ' ', COALESCE(sch.prijmeni, ''))) as schvalovatel_jmeno,
            TRIM(CONCAT(COALESCE(prk.jmeno, ''), ' ', COALESCE(prk.prijmeni, ''))) as prikazce_jmeno
        FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k
        INNER JOIN `" . TBL_OBJEDNAVKY . "` o ON k.objednavka_id = o.id AND o.aktivni = 1 AND o.id != 1
        LEFT JOIN `" . TBL_UZIVATELE . "` au ON k.user_id = au.id
        LEFT JOIN `" . TBL_UZIVATELE . "` obd ON o.objednatel_id = obd.id
        LEFT JOIN `" . TBL_UZIVATELE . "` sch ON o.schvalovatel_id = sch.id
        LEFT JOIN `" . TBL_UZIVATELE . "` prk ON o.prikazce_id = prk.id
        WHERE k.smazano = 0
          AND k.dt_vytvoreni >= :comments_date_from
          AND (k.user_id = :comments_user_id OR 1=1)
          {$v3_filter['where']}
        GROUP BY o.id, o.cislo_objednavky, o.predmet, o.max_cena_s_dph, o.dt_objednavky,
                 obd.jmeno, obd.prijmeni, sch.jmeno, sch.prijmeni, prk.jmeno, prk.prijmeni
        ORDER BY posledni_komentar_dt DESC
        LIMIT 15
    ");
    $stmt->execute($all_params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Statistiky faktur - počty dle klíčových stavů
 */
function _dashboard_get_invoice_stats($db, $user_id, $is_admin, $has_invoice_manage, $usek_id = null, $permissions = []) {
    // Rok filtr – shodný s modulem faktur (řádek 1672 invoiceHandlers.php)
    $current_year = (int)date('Y');
    $year_filter = "AND (YEAR(f.fa_datum_vystaveni) = :stats_year1 OR YEAR(f.fa_datum_doruceni) = :stats_year2 OR YEAR(f.fa_datum_splatnosti) = :stats_year3)";

    // Oprávnění: admin nebo INVOICE_MANAGE vidí vše, ostatní přes rozšířenou logiku (shodnou s invoiceHandlers)
    $effective_admin = $is_admin || $has_invoice_manage;
    $filter = _dashboard_build_invoice_v3_where($db, $user_id, $effective_admin, $permissions, $usek_id);
    $where_user = $filter['where'];
    // Rok parametry nejdříve (odpovídají pořadí placeholderů v $year_filter), pak user-filter params
    $params = array_merge(
        [':stats_year1' => $current_year, ':stats_year2' => $current_year, ':stats_year3' => $current_year],
        $filter['params']
    );

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
function _dashboard_get_annual_fees_due($db, $permissions = []) {
    // Roční poplatky - kontrola práv (ANNUAL_FEE_MANAGE nebo ANNUAL_FEE_VIEW nebo ADMIN)
    // Pro teď zobrazit všem (bude upřesněno pokud vzniknou specifická práva)
    $hasAccess = !empty($permissions); // Pokud má jakékoliv permission, má přístup
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
 * Graf: majetek podle druhu objednávky (Doughnut/Bar)
 * Vrátí počet a celkovou hodnotu objednávek klasifikovaných jako MAJETEK dle druhu.
 */
function _dashboard_get_majetek_by_druh($db, $user_id, $is_admin) {
    $majetek_codes = array('ELEKTRONIKA', 'FKSP', 'MAJETEK', 'NABYTEK', 'VZDELAVANI_VYBAVENI');
    $placeholders = implode(',', array_fill(0, count($majetek_codes), '?'));

    // Primárně ze skutečně fakturovaných částek (fa_castka). Objednávky bez faktur jsou ignorovány.
    $stmt = $db->prepare("
        SELECT
            JSON_UNQUOTE(JSON_EXTRACT(o.druh_objednavky_kod, '$.kod_stavu')) AS druh_kod,
            cs.nazev_stavu AS druh_nazev,
            COUNT(DISTINCT o.id) AS pocet,
            COALESCE(SUM(f.fa_castka), 0) AS castka_celkem
        FROM `" . TBL_OBJEDNAVKY . "` o
        INNER JOIN `" . TBL_FAKTURY . "` f
            ON f.objednavka_id = o.id
            AND f.aktivni = 1
            AND f.stav NOT IN ('STORNO')
        LEFT JOIN `" . TBL_CISELNIK_STAVY . "` cs
            ON cs.kod_stavu = JSON_UNQUOTE(JSON_EXTRACT(o.druh_objednavky_kod, '$.kod_stavu'))
            AND cs.typ_objektu = 'DRUH_OBJEDNAVKY'
        WHERE o.aktivni = 1
          AND o.id != 1
          AND JSON_UNQUOTE(JSON_EXTRACT(o.druh_objednavky_kod, '$.kod_stavu')) IN ($placeholders)
        GROUP BY druh_kod, druh_nazev
        ORDER BY castka_celkem DESC
    ");
    $stmt->execute($majetek_codes);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Graf: roční poplatky podle druhu a typu platby
 * Vrátí skupinová data druh × platba pro stacked bar chart.
 */
function _dashboard_get_fees_by_druh($db) {
    $rok = (int)date('Y');

    // Souhrn dle druhu a platby pro aktuální rok
    $stmt = $db->prepare("
        SELECT
            rp.druh,
            COALESCE(cs_druh.nazev_stavu, rp.druh) AS druh_nazev,
            rp.platba,
            COALESCE(cs_platba.nazev_stavu, rp.platba) AS platba_nazev,
            COUNT(*) AS pocet,
            COALESCE(SUM(rp.celkova_castka), 0) AS castka_celkem
        FROM `" . TBL_ROCNI_POPLATKY . "` rp
        LEFT JOIN `" . TBL_CISELNIK_STAVY . "` cs_druh
            ON cs_druh.kod_stavu = rp.druh AND cs_druh.typ_objektu = 'ROCNI_POPLATEK_DRUH'
        LEFT JOIN `" . TBL_CISELNIK_STAVY . "` cs_platba
            ON cs_platba.kod_stavu = rp.platba AND cs_platba.typ_objektu = 'PLATBA_ROCNIHO_POPLATKU'
        WHERE rp.aktivni = 1
          AND rp.rok = ?
        GROUP BY rp.druh, druh_nazev, rp.platba, platba_nazev
        ORDER BY castka_celkem DESC
    ");
    $stmt->execute([$rok]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Celkový součet pro rok
    $total = array_sum(array_column($rows, 'castka_celkem'));

    return [
        'rok'   => $rok,
        'rows'  => $rows,
        'total' => $total
    ];
}

/**
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

        $period = $input['period'] ?? '5min'; // 5min | 12h | 24h | 7d
        $data = _dashboard_get_active_users($db, $period);

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
function _dashboard_get_active_users($db, $period = '5min') {
    // Mapování period → minuty pro SQL interval
    $period_map = [
        '5min' => 5,
        '12h'  => 720,
        '24h'  => 1440,
        '7d'   => 10080,
    ];
    $minutes = $period_map[$period] ?? 5;

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
                u.email,
                u.telefon,

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
              AND u.dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL :minutes MINUTE)
              AND u.aktivni = 1
            ORDER BY u.dt_posledni_aktivita DESC
        ");
        $stmt->execute([':minutes' => $minutes]);
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
                'email'                       => $row['email'] ?? null,
                'telefon'                     => $row['telefon'] ?? null,
                'pocet_objednavek_objednatel' => (int)$row['pocet_objednavek_objednatel'],
                'pocet_schvalenych'           => (int)$row['pocet_schvalenych'],
                'pocet_ke_schvaleni'          => (int)$row['pocet_ke_schvaleni'],
            ];
        }

        return [
            'items'  => $result,
            'count'  => count($result),
            'period' => $period,
            'counts' => _dashboard_active_users_counts($db),
        ];

    } catch (Exception $e) {
        error_log('_dashboard_get_active_users error: ' . $e->getMessage());
        return ['items' => [], 'count' => 0, 'period' => $period, 'counts' => ['5min'=>0,'12h'=>0,'24h'=>0,'7d'=>0]];
    }
}

/**
 * Vrátí počty aktivních uživatelů pro všechna 4 časová okna najednou.
 */
function _dashboard_active_users_counts($db) {
    try {
        $stmt = $db->query("
            SELECT
                SUM(dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 5    MINUTE)) AS `5min`,
                SUM(dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 720   MINUTE)) AS `12h`,
                SUM(dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 1440  MINUTE)) AS `24h`,
                SUM(dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 10080 MINUTE)) AS `7d`
            FROM `" . TBL_UZIVATELE . "`
            WHERE dt_posledni_aktivita IS NOT NULL AND aktivni = 1
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return [
            '5min' => (int)($row['5min'] ?? 0),
            '12h'  => (int)($row['12h']  ?? 0),
            '24h'  => (int)($row['24h']  ?? 0),
            '7d'   => (int)($row['7d']   ?? 0),
        ];
    } catch (Exception $e) {
        error_log('_dashboard_active_users_counts error: ' . $e->getMessage());
        return ['5min'=>0,'12h'=>0,'24h'=>0,'7d'=>0];
    }
}

/**
 * =============================================================================
 * HELPER FUNCTIONS - ORDER V3 VISIBILITY RULES
 * =============================================================================
 */

/**
 * Sestaví WHERE podmínku pro viditelnost objednávek podle Order V3 pravidel (12-role WHERE).
 * 
 * @param int $user_id ID uživatele
 * @param bool $is_admin Je admin? (SUPERADMIN, ADMINISTRATOR nebo ORDER_*_ALL permissions)
 * @param array $permissions Pole permission kódů uživatele
 * @return array ['where' => string, 'params' => array] - WHERE podmínka a parametry pro PDO
 * 
 * Pravidla:
 * - ADMIN (SUPERADMIN, ADMINISTRATOR nebo ORDER_MANAGE, ORDER_READ_ALL, ORDER_VIEW_ALL) → vidí VŠECHNY objednávky (žádný filtr)
 * - Běžný user → vidí JEN objednávky kde má některou z 12 rolí:
 *   1. uzivatel_id, 2. objednatel_id, 3. garant_uzivatel_id, 4. schvalovatel_id, 
 *   5. prikazce_id, 6. uzivatel_akt_id, 7. odesilatel_id, 8. dodavatel_potvrdil_id,
 *   9. zverejnil_id, 10. fakturant_id, 11. dokoncil_id, 12. potvrdil_vecnou_spravnost_id
 * 
 * Použití:
 * ```php
 * $filter = _dashboard_build_order_v3_where($user_id, $is_admin, $permissions);
 * $sql = "SELECT * FROM 25a_objednavky o WHERE o.aktivni = 1 {$filter['where']}";
 * $stmt = $db->prepare($sql);
 * $stmt->execute($filter['params']);
 * ```
 */
function _dashboard_build_order_v3_where($user_id, $is_admin, $permissions = []) {
    // ADMIN nebo má ORDER_*_ALL permissions → vidí VŠECHNY objednávky
    $hasAdminPermissions = in_array('ORDER_MANAGE', $permissions) ||
                          in_array('ORDER_READ_ALL', $permissions) ||
                          in_array('ORDER_VIEW_ALL', $permissions) ||
                          in_array('ORDER_EDIT_ALL', $permissions) ||
                          in_array('ORDER_DELETE_ALL', $permissions);
    
    if ($is_admin || $hasAdminPermissions) {
        return ['where' => '', 'params' => []];
    }
    
    // Běžný user → 12-role WHERE filtr
    $where = " AND (
        o.uzivatel_id = :v3_user_id
        OR o.objednatel_id = :v3_user_id
        OR o.garant_uzivatel_id = :v3_user_id
        OR o.schvalovatel_id = :v3_user_id
        OR o.prikazce_id = :v3_user_id
        OR o.uzivatel_akt_id = :v3_user_id
        OR o.odesilatel_id = :v3_user_id
        OR o.dodavatel_potvrdil_id = :v3_user_id
        OR o.zverejnil_id = :v3_user_id
        OR o.fakturant_id = :v3_user_id
        OR o.dokoncil_id = :v3_user_id
        OR o.potvrdil_vecnou_spravnost_id = :v3_user_id
    )";
    
    return [
        'where' => $where,
        'params' => [':v3_user_id' => (int)$user_id]
    ];
}

/**
 * Sestaví WHERE podmínku pro viditelnost faktur podle Order V3 pravidel.
 * Faktury jsou viditelné pokud:
 * 1. User je ADMIN
 * 2. User má přístup k objednávce faktury (12-role WHERE z objednávky)
 * 3. User je přímo na faktuře: fa_predana_zam_id, potvrdil_vecnou_spravnost_id, vytvoril_uzivatel_id
 * 4. Faktura je ke smlouvě úseku uživatele (pokud $usek_id zadáno)
 * 
 * @param object $db PDO instance
 * @param int $user_id ID uživatele
 * @param bool $is_admin Je admin?
 * @param array $permissions Pole permission kódů uživatele
 * @param int|null $usek_id ID úseku uživatele (pro faktury ke smlouvám úseku)
 * @return array ['where' => string, 'params' => array]
 */
function _dashboard_build_invoice_v3_where($db, $user_id, $is_admin, $permissions = [], $usek_id = null) {
    // ADMIN nebo má INVOICE_*_ALL permissions → vidí VŠECHNY faktury
    $hasInvoiceAdmin = in_array('INVOICE_MANAGE', $permissions) ||
                       in_array('INVOICE_READ_ALL', $permissions) ||
                       in_array('INVOICE_VIEW_ALL', $permissions) ||
                       in_array('INVOICE_EDIT_ALL', $permissions);
    
    if ($is_admin || $hasInvoiceAdmin) {
        return ['where' => '', 'params' => []];
    }
    
    // Běžný user → faktury k objednávkám kde má 12-role NEBO přímé role na faktuře
    $conditions = [];
    $params = [];
    
    // 1️⃣ Faktury k objednávkám kde má user 12-role
    $stmt_orders = $db->prepare("
        SELECT DISTINCT o.id
        FROM `" . TBL_OBJEDNAVKY . "` o
        WHERE (
            o.uzivatel_id = ?
            OR o.objednatel_id = ?
            OR o.garant_uzivatel_id = ?
            OR o.schvalovatel_id = ?
            OR o.prikazce_id = ?
            OR o.uzivatel_akt_id = ?
            OR o.odesilatel_id = ?
            OR o.dodavatel_potvrdil_id = ?
            OR o.zverejnil_id = ?
            OR o.fakturant_id = ?
            OR o.dokoncil_id = ?
            OR o.potvrdil_vecnou_spravnost_id = ?
        )
    ");
    $stmt_orders->execute(array_fill(0, 12, $user_id));
    $order_ids = $stmt_orders->fetchAll(PDO::FETCH_COLUMN);
    
    if (!empty($order_ids)) {
        $placeholders = implode(',', array_map('intval', $order_ids));
        $conditions[] = "f.objednavka_id IN ({$placeholders})";
    }
    
    // 2️⃣ Přímé role na faktuře
    $conditions[] = 'f.fa_predana_zam_id = :v3_inv_user_1';
    $params[':v3_inv_user_1'] = $user_id;
    
    $conditions[] = 'f.potvrdil_vecnou_spravnost_id = :v3_inv_user_2';
    $params[':v3_inv_user_2'] = $user_id;
    
    $conditions[] = 'f.vytvoril_uzivatel_id = :v3_inv_user_3';
    $params[':v3_inv_user_3'] = $user_id;
    
    // 3️⃣ Faktury ke smlouvám úseku uživatele
    if ($usek_id) {
        $conditions[] = '(f.smlouva_id IS NOT NULL AND f.smlouva_id > 0 AND EXISTS (
            SELECT 1 FROM `' . TBL_SMLOUVY . '` sm 
            WHERE sm.id = f.smlouva_id AND sm.usek_id = :v3_inv_usek
        ))';
        $params[':v3_inv_usek'] = (int)$usek_id;
    }
    
    if (empty($conditions)) {
        // Bez přístupu → vrátíme podmínku která nevybere nic
        return ['where' => ' AND 1=0', 'params' => []];
    }
    
    return [
        'where' => ' AND (' . implode(' OR ', $conditions) . ')',
        'params' => $params
    ];
}

// ============================================================================
// FINANČNÍ TRHY - Proxy endpoint pro krypto + FX data
// ============================================================================

/**
 * POST /api.eeo/dashboard/finance-markets
 * Proxy volání na CoinGecko + Frankfurter API
 * Vrací: BTC, ETH ceny + EUR/CZK, EUR/USD, USD/CZK kurzy
 * Cache: 30 minut server-side (file cache)
 */
function handle_dashboard_finance_markets($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    // Volitelné: uživatel může poslat vlastní tickery akcií
    $stock_tickers = $input['stock_tickers'] ?? ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    // Volitelné: uživatel může poslat vlastní krypto IDs
    $crypto_ids = $input['crypto_ids'] ?? ['bitcoin', 'ethereum'];
    // Volitelné: uživatel může poslat vlastní FX páry
    $fx_pairs = $input['fx_pairs'] ?? ['CZK', 'USD'];

    // Validace vstupů
    if (!is_array($stock_tickers)) $stock_tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    if (!is_array($crypto_ids)) $crypto_ids = ['bitcoin', 'ethereum'];
    if (!is_array($fx_pairs)) $fx_pairs = ['CZK', 'USD'];

    // Omezení na rozumný počet (prevence abuse)
    $stock_tickers = array_slice(array_map('strtoupper', array_filter($stock_tickers, 'is_string')), 0, 15);
    $crypto_ids = array_slice(array_map('strtolower', array_filter($crypto_ids, 'is_string')), 0, 10);
    $fx_pairs = array_slice(array_map('strtoupper', array_filter($fx_pairs, 'is_string')), 0, 6);

    // Validace tickerů - pouze alfanumerické + tečka
    $stock_tickers = array_filter($stock_tickers, function($t) { return preg_match('/^[A-Z0-9.]{1,10}$/', $t); });
    $crypto_ids = array_filter($crypto_ids, function($t) { return preg_match('/^[a-z0-9-]{1,30}$/', $t); });
    $fx_pairs = array_filter($fx_pairs, function($t) { return preg_match('/^[A-Z]{3}$/', $t); });

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

        $token_data = verify_token_v2($username, $token, $db);
        if (!$token_data) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
            return;
        }

        // Server-side cache (15 minut) - cache klíč závisí na parametrech
        $cache_key = md5(json_encode(['c' => $crypto_ids, 's' => $stock_tickers, 'f' => $fx_pairs]));
        $cache_dir = $_ENV['UPLOAD_ROOT_PATH'] ?? '/var/www/erdms-data/';
        $cache_file = rtrim($cache_dir, '/') . '/cache/finance_' . $cache_key . '.json';
        $cache_expiry = 15 * 60; // 15 minut

        // Zkus načíst z cache
        if (file_exists($cache_file)) {
            $cache_content = file_get_contents($cache_file);
            $cache_data = json_decode($cache_content, true);
            if ($cache_data && isset($cache_data['timestamp']) && (time() - $cache_data['timestamp']) < $cache_expiry) {
                http_response_code(200);
                echo json_encode([
                    'status' => 'success',
                    'data' => $cache_data['data'],
                    'cached' => true,
                    'message' => 'Finanční data z cache'
                ]);
                return;
            }
        }

        // Fetch z externích API (paralelně nelze v PHP bez curl_multi, tak sekvenčně)
        $crypto_data = _finance_fetch_crypto($crypto_ids);
        $fx_data = _finance_fetch_forex($fx_pairs);
        $stock_data = !empty($stock_tickers) ? _finance_fetch_stocks($stock_tickers) : [];

        $result = [
            'crypto' => $crypto_data,
            'forex' => $fx_data,
            'stocks' => $stock_data,
            'updated_at' => date('c')
        ];

        // Uložit do cache
        $cache_dir_path = dirname($cache_file);
        if (!is_dir($cache_dir_path)) {
            mkdir($cache_dir_path, 0755, true);
        }
        file_put_contents($cache_file, json_encode([
            'data' => $result,
            'timestamp' => time()
        ]), LOCK_EX);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $result,
            'cached' => false,
            'message' => 'Finanční data načtena úspěšně'
        ]);

    } catch (Exception $e) {
        error_log("📈 Finance Markets Error: " . $e->getMessage() . " | User: {$username}");
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání finančních dat: ' . $e->getMessage()
        ]);
    }
}

/**
 * Fetch krypto dat z CoinGecko API (free, bez API klíče)
 * @param array $crypto_ids - pole CoinGecko ID (např. ['bitcoin', 'ethereum', 'solana'])
 */
function _finance_fetch_crypto($crypto_ids = ['bitcoin', 'ethereum']) {
    if (empty($crypto_ids)) return [];

    $ids_str = implode(',', $crypto_ids);
    $url = 'https://api.coingecko.com/api/v3/simple/price?ids=' . urlencode($ids_str) . '&vs_currencies=usd,eur,czk&include_24hr_change=true&include_market_cap=true';

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 10,
            'header' => "Accept: application/json\r\nUser-Agent: ERDMS-Dashboard/1.0\r\n"
        ]
    ]);

    $response = @file_get_contents($url, false, $ctx);
    if ($response === false) {
        error_log("📈 CoinGecko API Error: Nepodařilo se načíst data");
        return [];
    }

    $data = json_decode($response, true);
    if (!$data) return [];

    // Mapování CoinGecko ID na lidsky čitelné symboly
    $symbol_map = [
        'bitcoin' => '₿', 'ethereum' => 'Ξ', 'solana' => 'SOL',
        'ripple' => 'XRP', 'cardano' => 'ADA', 'polkadot' => 'DOT',
        'dogecoin' => 'DOGE', 'avalanche-2' => 'AVAX', 'chainlink' => 'LINK',
        'litecoin' => 'LTC'
    ];
    $name_map = [
        'bitcoin' => 'Bitcoin', 'ethereum' => 'Ethereum', 'solana' => 'Solana',
        'ripple' => 'XRP', 'cardano' => 'Cardano', 'polkadot' => 'Polkadot',
        'dogecoin' => 'Dogecoin', 'avalanche-2' => 'Avalanche', 'chainlink' => 'Chainlink',
        'litecoin' => 'Litecoin'
    ];

    $result = [];
    foreach ($crypto_ids as $id) {
        if (isset($data[$id])) {
            $result[] = [
                'id' => $id,
                'name' => $name_map[$id] ?? ucfirst($id),
                'symbol' => $symbol_map[$id] ?? strtoupper(substr($id, 0, 3)),
                'price_usd' => $data[$id]['usd'] ?? null,
                'price_eur' => $data[$id]['eur'] ?? null,
                'price_czk' => $data[$id]['czk'] ?? null,
                'change_24h' => $data[$id]['usd_24h_change'] ?? null,
                'market_cap' => $data[$id]['usd_market_cap'] ?? null
            ];
        }
    }

    return $result;
}

/**
 * Fetch FX kurzů z Frankfurter API (free, server-side)
 * @param array $targets - cílové měny (např. ['CZK', 'USD'])
 */
function _finance_fetch_forex($targets = ['CZK', 'USD']) {
    if (empty($targets)) return [];

    $targets_str = implode(',', $targets);
    $url = 'https://api.frankfurter.app/latest?from=EUR&to=' . urlencode($targets_str);

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 10,
            'header' => "Accept: application/json\r\nUser-Agent: ERDMS-Dashboard/1.0\r\n"
        ]
    ]);

    $response = @file_get_contents($url, false, $ctx);
    if ($response === false) {
        error_log("📈 Frankfurter API Error: Nepodařilo se načíst FX data");
        return [];
    }

    $data = json_decode($response, true);
    if (!$data || !isset($data['rates'])) return [];

    $result = [];
    $eur_czk = $data['rates']['CZK'] ?? null;
    $eur_usd = $data['rates']['USD'] ?? null;

    if ($eur_czk) $result[] = ['pair' => 'EUR/CZK', 'rate' => round($eur_czk, 2)];
    if ($eur_usd) $result[] = ['pair' => 'EUR/USD', 'rate' => round($eur_usd, 4)];
    if ($eur_czk && $eur_usd) {
        $result[] = ['pair' => 'USD/CZK', 'rate' => round($eur_czk / $eur_usd, 2)];
    }

    return $result;
}

/**
 * Fetch akcií z Yahoo Finance v8 quote API (free, server-side only)
 * @param array $tickers - pole tickerů (např. ['AAPL', 'MSFT', 'TSLA'])
 */
function _finance_fetch_stocks($tickers) {
    if (empty($tickers)) return [];

    $symbols = implode(',', $tickers);
    $url = 'https://query1.finance.yahoo.com/v8/finance/chart/' . urlencode($tickers[0]) . '?comparisons=' . urlencode(implode(',', array_slice($tickers, 1))) . '&range=1d&interval=1d';

    // Alternativa: použít v7 quote endpoint pro více symbolů najednou
    $url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' . urlencode($symbols);

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 12,
            'header' => "Accept: application/json\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n"
        ]
    ]);

    $response = @file_get_contents($url, false, $ctx);
    if ($response === false) {
        error_log("📈 Yahoo Finance API Error: Nepodařilo se načíst data pro: " . $symbols);
        // Fallback: zkusit alternativní API
        return _finance_fetch_stocks_fallback($tickers);
    }

    $data = json_decode($response, true);
    $quotes = $data['quoteResponse']['result'] ?? [];

    if (empty($quotes)) {
        return _finance_fetch_stocks_fallback($tickers);
    }

    $result = [];
    foreach ($quotes as $q) {
        $result[] = [
            'ticker' => $q['symbol'] ?? '',
            'name' => $q['shortName'] ?? $q['longName'] ?? $q['symbol'] ?? '',
            'price' => $q['regularMarketPrice'] ?? null,
            'change' => $q['regularMarketChangePercent'] ?? null,
            'currency' => $q['currency'] ?? 'USD',
            'market_cap' => $q['marketCap'] ?? null,
            'exchange' => $q['exchangeTimezoneName'] ?? '',
            'market_state' => $q['marketState'] ?? ''
        ];
    }

    return $result;
}

/**
 * Fallback: fetch akcií z Alpha Vantage demo nebo vracíme prázdné
 */
function _finance_fetch_stocks_fallback($tickers) {
    // Zkusit stooq.com CSV API (free, bez registrace)
    $result = [];
    foreach (array_slice($tickers, 0, 8) as $ticker) {
        $url = 'https://stooq.com/q/l/?s=' . urlencode(strtolower($ticker) . '.us') . '&f=sd2t2ohlcv&h&e=json';
        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 8,
                'header' => "Accept: application/json\r\nUser-Agent: ERDMS-Dashboard/1.0\r\n"
            ]
        ]);

        $response = @file_get_contents($url, false, $ctx);
        if ($response === false) continue;

        $data = json_decode($response, true);
        $symbols = $data['symbols'] ?? [];
        if (!empty($symbols) && isset($symbols[0]['close'])) {
            $s = $symbols[0];
            $open = $s['open'] ?? 0;
            $close = $s['close'] ?? 0;
            $change_pct = $open > 0 ? (($close - $open) / $open * 100) : null;

            $result[] = [
                'ticker' => strtoupper($ticker),
                'name' => strtoupper($ticker),
                'price' => $close,
                'change' => $change_pct ? round($change_pct, 2) : null,
                'currency' => 'USD',
                'market_cap' => null,
                'exchange' => '',
                'market_state' => ''
            ];
        }
    }
    return $result;
}

/**
 * POST - Historická data ceny pro graf
 * Endpoint: dashboard/finance-chart
 * POST: {token, username, ticker, range}
 * range: 1mo, 3mo, ytd
 */
function handle_dashboard_finance_chart($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $ticker = strtoupper(trim($input['ticker'] ?? ''));
    $range = $input['range'] ?? '1mo';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$ticker || !preg_match('/^[A-Z0-9.\-]{1,10}$/', $ticker)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný ticker']);
        return;
    }

    // Povolené rozsahy
    $allowed_ranges = ['1mo', '3mo', 'ytd', '6mo', '1y'];
    if (!in_array($range, $allowed_ranges)) {
        $range = '1mo';
    }

    // Interval dle rozsahu
    $interval_map = ['1mo' => '1d', '3mo' => '1d', 'ytd' => '1d', '6mo' => '1d', '1y' => '1wk'];
    $interval = $interval_map[$range];

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        $token_data = verify_token_v2($username, $token, $db);
        if (!$token_data) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
            return;
        }

        // Cache (1 hodina pro historická data)
        $cache_dir = $_ENV['UPLOAD_ROOT_PATH'] ?? '/var/www/erdms-data/';
        $cache_key = md5("chart_{$ticker}_{$range}");
        $cache_file = rtrim($cache_dir, '/') . '/cache/finance_chart_' . $cache_key . '.json';
        $cache_expiry = 60 * 60; // 1 hodina

        if (file_exists($cache_file)) {
            $cache_content = file_get_contents($cache_file);
            $cache_data = json_decode($cache_content, true);
            if ($cache_data && isset($cache_data['timestamp']) && (time() - $cache_data['timestamp']) < $cache_expiry) {
                http_response_code(200);
                echo json_encode([
                    'status' => 'success',
                    'data' => $cache_data['data'],
                    'cached' => true,
                    'message' => 'Graf data z cache'
                ]);
                return;
            }
        }

        // Fetch z Yahoo Finance v8 chart API
        $chart_data = _finance_fetch_chart($ticker, $range, $interval);

        if (empty($chart_data)) {
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data' => null,
                'message' => 'Data pro graf nejsou dostupná'
            ]);
            return;
        }

        // Cache uložit
        $cache_dir_path = dirname($cache_file);
        if (!is_dir($cache_dir_path)) {
            mkdir($cache_dir_path, 0755, true);
        }
        file_put_contents($cache_file, json_encode([
            'data' => $chart_data,
            'timestamp' => time()
        ]), LOCK_EX);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $chart_data,
            'cached' => false,
            'message' => 'Graf data načtena'
        ]);

    } catch (Exception $e) {
        error_log("📈 Finance Chart Error: " . $e->getMessage() . " | Ticker: {$ticker} | User: {$username}");
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání dat grafu'
        ]);
    }
}

/**
 * Fetch historických cenových dat z Yahoo Finance v8 chart API
 */
function _finance_fetch_chart($ticker, $range = '1mo', $interval = '1d') {
    $url = "https://query1.finance.yahoo.com/v8/finance/chart/{$ticker}?range={$range}&interval={$interval}&includePrePost=false";

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 12,
            'header' => "Accept: application/json\r\nUser-Agent: ERDMS-Dashboard/1.0\r\n"
        ]
    ]);

    $response = @file_get_contents($url, false, $ctx);
    if ($response === false) {
        error_log("📈 Yahoo Chart API Error: Nepodařilo se načíst data pro {$ticker}");
        return null;
    }

    $data = json_decode($response, true);
    $result_data = $data['chart']['result'][0] ?? null;
    if (!$result_data) return null;

    $timestamps = $result_data['timestamp'] ?? [];
    $closes = $result_data['indicators']['quote'][0]['close'] ?? [];
    $meta = $result_data['meta'] ?? [];

    if (empty($timestamps) || empty($closes)) return null;

    // Sestavit pole bodů
    $points = [];
    for ($i = 0; $i < count($timestamps); $i++) {
        if (isset($closes[$i]) && $closes[$i] !== null) {
            $points[] = [
                'date' => date('Y-m-d', $timestamps[$i]),
                'price' => round($closes[$i], 2)
            ];
        }
    }

    if (empty($points)) return null;

    $first_price = $points[0]['price'];
    $last_price = $points[count($points) - 1]['price'];
    $change_pct = $first_price > 0 ? round(($last_price - $first_price) / $first_price * 100, 2) : 0;

    return [
        'ticker' => $ticker,
        'name' => $meta['shortName'] ?? $meta['symbol'] ?? $ticker,
        'currency' => $meta['currency'] ?? 'USD',
        'range' => $range,
        'interval' => $interval,
        'points' => $points,
        'price_current' => $last_price,
        'price_start' => $first_price,
        'change_pct' => $change_pct
    ];
}

/**
 * Počet kontaktů (zaměstnanci + dodavatelé) pro dashboard shortcut
 */
function _dashboard_get_contacts_count($db) {
    try {
        $employees = 0;
        $suppliers = 0;

        $stmt = $db->prepare("SELECT COUNT(*) FROM `" . TBL_UZIVATELE . "` WHERE aktivni = 1");
        $stmt->execute();
        $employees = (int)$stmt->fetchColumn();

        $stmt2 = $db->prepare("SELECT COUNT(*) FROM `" . TBL_DODAVATELE . "` WHERE aktivni = 1");
        $stmt2->execute();
        $suppliers = (int)$stmt2->fetchColumn();

        return [
            'employees' => $employees,
            'suppliers' => $suppliers,
            'total' => $employees + $suppliers
        ];
    } catch (Exception $e) {
        error_log("Dashboard contacts_count error: " . $e->getMessage());
        return ['employees' => 0, 'suppliers' => 0, 'total' => 0];
    }
}
