<?php

/**
 * Invoice Check Handlers - Kontrola faktur v InvoiceListu
 * PHP 5.6 Compatible
 * Autor: Development Team
 * Datum: 2026-01-20
 * 
 * 🎯 ÚČEL:
 * - Umožnit kontrolorům zkontrolovat správnost VŠECH faktur v systému
 * - Kontrola se vztahuje na všechny typy financování
 * - Stav kontroly se ukládá do rozsirujici_data JSON v tabulce 25a_objednavky_faktury
 * - Právo kontroly má role KONTROLOR_FAKTUR (ID=17), SUPERADMIN (ID=1) a ADMINISTRATOR (ID=2)
 * 
 * 📋 ENDPOINTY:
 * - POST invoices/toggle-check      → Přepne stav kontroly faktury
 * - POST invoices/get-checks         → Načte stavy kontrol pro více faktur
 * 
 * 📊 FORMÁT JSON v rozsirujici_data:
 * {
 *   "kontrola_radku": {
 *     "kontrolovano": true,
 *     "kontroloval_user_id": 123,
 *     "kontroloval_username": "novak",
 *     "dt_kontroly": "2026-01-20 15:30:00"
 *   }
 * }
 * 
 * ✅ DODRŽUJE PRAVIDLA Z PHP_api.prompt.md:
 * - ✅ Pouze POST metoda
 * - ✅ Token a username z POST body (ne z headers)
 * - ✅ Prepared statements (SQL injection ochrana)
 * - ✅ Standardní JSON response formát (status, data, message)
 * - ✅ HTTP status codes (200, 400, 401, 403, 404, 500)
 * - ✅ České error messages
 * - ✅ TimezoneHelper pro správnou timezone
 * - ✅ Konstanty tabulek (TBL_FAKTURY, TBL_UZIVATELE_ROLE)
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/orderWorkflowHelpers.php';

/**
 * Helper - Ověří, zda je faktura uzamčena pro změnu věcné správnosti
 * 
 * LOGIKA LOCK:
 * - Pokud je faktura zamítnuta (status 2) a od té doby nebyla aktualizována účetní,
 *   je uzamčena pro další VS rozhodnutí.
 * - Odemčení: účetní upraví fakturu (jakákoli změna) → dt_aktualizace > dt_potvrzeni_vecne_spravnosti
 * 
 * @param array $faktura Data faktury (musí obsahovat vecna_spravnost_potvrzeno, dt_aktualizace, dt_potvrzeni_vecne_spravnosti)
 * @return bool TRUE = faktura je uzamčena, FALSE = faktura je odemčena
 */
function isFakturaLockedForVS($faktura) {
    // Pokud není zamítnuta, není uzamčena
    if (!isset($faktura['vecna_spravnost_potvrzeno']) || $faktura['vecna_spravnost_potvrzeno'] != VS_STATUS_ZAMITNUTA) {
        return false;
    }
    
    // Pokud chybí datum potvrzení/zamítnutí, není uzamčena (nemělo by nastat)
    if (empty($faktura['dt_potvrzeni_vecne_spravnosti'])) {
        return false;
    }
    
    // Pokud dt_aktualizace je novější než dt_potvrzeni, faktura byla upravena → odemčena
    if (!empty($faktura['dt_aktualizace'])) {
        $dt_aktualizace = strtotime($faktura['dt_aktualizace']);
        $dt_potvrzeni = strtotime($faktura['dt_potvrzeni_vecne_spravnosti']);
        
        if ($dt_aktualizace > $dt_potvrzeni) {
            return false; // Byla aktualizována po zamítnutí → odemčena
        }
    }
    
    // Faktura je zamítnutá a nebyla od té doby upravena → uzamčena
    return true;
}

/**
 * Validace LP rozkladu před potvrzením věcné správnosti faktury.
 * Pravidlo: pokud je objednávka financována z LP, musí existovat alespoň 1 řádek
 * v 25a_faktury_lp_cerpani pro danou fakturu.
 *
 * @throws Exception při porušení pravidla
 */
function ensureLpSplitExistsForVsApproval($db, $faktura_id, $objednavka_id) {
    if (empty($objednavka_id)) {
        return;
    }

    $stmt_order_fin = $db->prepare("SELECT financovani FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1 LIMIT 1");
    $stmt_order_fin->execute(array((int)$objednavka_id));
    $order_fin = $stmt_order_fin->fetch(PDO::FETCH_ASSOC);

    if (!$order_fin || empty($order_fin['financovani'])) {
        return;
    }

    $financovani = json_decode($order_fin['financovani'], true);
    if (!is_array($financovani) || !isset($financovani['typ']) || $financovani['typ'] !== 'LP') {
        return;
    }

    $stmt_lp = $db->prepare("\n        SELECT COUNT(*) AS cnt\n        FROM " . TBL_FAKTURY_LP_CERPANI . "\n        WHERE faktura_id = ?\n          AND (lp_cislo IS NOT NULL AND TRIM(lp_cislo) != '')\n          AND castka IS NOT NULL\n    ");
    $stmt_lp->execute(array((int)$faktura_id));
    $lp_count_row = $stmt_lp->fetch(PDO::FETCH_ASSOC);
    $lp_count = $lp_count_row ? (int)$lp_count_row['cnt'] : 0;

    if ($lp_count <= 0) {
        throw new Exception('Pro LP financování nelze potvrdit věcnou správnost bez LP rozkladu faktury.');
    }
}

/**
 * POST - Přepne stav kontroly faktury NEBO nastaví stav věcné správnosti
 * 
 * 🆕 ROZŠÍŘENO O ZAMÍTNUTÍ VĚCNÉ SPRÁVNOSTI (status 0/1/2)
 * 
 * Endpoint: invoices/toggle-check
 * POST (kontrola): {token, username, faktura_id, kontrolovano}
 * POST (věcná): {token, username, faktura_id, status, vecna_spravnost_duvod}
 * 
 * DŮLEŽITÉ:
 * - Režim "kontrola" (`kontrolovano`) ukládá POUZE check stav v `rozsirujici_data.kontrola_radku`
 *   + `dt_aktualizace`. Nesmí měnit žádná workflow/VS pole faktury ani objednávky/smlouvy.
 * - Režim "věcná správnost" (`status`) mění VS pole a navazující workflow logiku.
 * 
 * @param array $input POST data (token, username, faktura_id, kontrolovano|status, vecna_spravnost_duvod)
 * @param array $config Konfigurace (DB přístup)
 * @return void Vrací JSON response
 */
function handle_invoice_toggle_check($input, $config) {
    // ==========================================
    // 🐛 DEV DEBUG LOGGING - VĚCNÁ SPRÁVNOST
    // ==========================================
    error_log("╔═══════════════════════════════════════════════════════════");
    error_log("║ ✅ MODUL FAKTUR - VĚCNÁ SPRÁVNOST");
    error_log("║ Čas: " . date('Y-m-d H:i:s'));
    error_log("║ Uživatel: " . (isset($input['username']) ? $input['username'] : 'N/A'));
    error_log("║ Faktura ID: " . (isset($input['faktura_id']) ? $input['faktura_id'] : 'N/A'));
    error_log("║ Status: " . (isset($input['status']) ? $input['status'] : (isset($input['kontrolovano']) ? 'legacy' : 'N/A')));
    error_log("║ Endpoint: invoices/toggle-check");
    error_log("╚═══════════════════════════════════════════════════════════");
    
    // 1. Validace HTTP metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // 2. Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $faktura_id = isset($input['faktura_id']) ? (int)$input['faktura_id'] : 0;
    
    $is_check_mode = isset($input['kontrolovano']) && !isset($input['status']);
    $is_vs_mode = isset($input['status']);

    $status = null;
    $kontrolovano = null;

    if ($is_check_mode) {
        $raw_kontrolovano = $input['kontrolovano'];

        if (is_bool($raw_kontrolovano)) {
            $kontrolovano = $raw_kontrolovano;
        } else {
            $raw_norm = strtolower(trim((string)$raw_kontrolovano));
            if ($raw_norm === '1' || $raw_norm === 'true' || $raw_norm === 'yes' || $raw_norm === 'on') {
                $kontrolovano = true;
            } elseif ($raw_norm === '0' || $raw_norm === 'false' || $raw_norm === 'no' || $raw_norm === 'off') {
                $kontrolovano = false;
            }
        }

        if ($kontrolovano === null) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Neplatná hodnota kontrolovano (očekáváno true/false)'));
            return;
        }
    } elseif ($is_vs_mode) {
        $status = (int)$input['status'];
    } else {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí parametr status nebo kontrolovano'));
        return;
    }
    
    $vecna_spravnost_duvod = isset($input['vecna_spravnost_duvod']) ? trim($input['vecna_spravnost_duvod']) : '';
    
    // Validace základních parametrů
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }
    
    if ($faktura_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné faktura_id'));
        return;
    }
    
    // Validace status hodnoty (0/1/2) pouze pro režim věcné správnosti
    if ($is_vs_mode && !in_array($status, array(VS_STATUS_NEPOTVRZENA, VS_STATUS_POTVRZENA, VS_STATUS_ZAMITNUTA))) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný status (očekávány hodnoty 0, 1 nebo 2)'));
        return;
    }
    
    // Validace povinného důvodu při zamítnutí (jen VS režim)
    if ($is_vs_mode && $status === VS_STATUS_ZAMITNUTA && strlen($vecna_spravnost_duvod) < 5) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Při zamítnutí je povinné uvést důvod (minimálně 5 znaků)'));
        return;
    }

    // 3. Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        // Nastavit timezone
        TimezoneHelper::setMysqlTimezone($db);

        // 4. Načtení aktuálního stavu faktury 
        // (s dt_aktualizace pro lock check + objednávka/smlouva pro kontrolu oprávnění)
        $stmt_faktura = $db->prepare("
            SELECT 
                f.id, 
                f.fa_cislo_vema,
                f.objednavka_id,
                f.smlouva_id,
                f.fa_predana_zam_id,
                f.vytvoril_uzivatel_id as faktura_vytvoril_id,
                f.vecna_spravnost_potvrzeno,
                f.potvrdil_vecnou_spravnost_id,
                f.dt_potvrzeni_vecne_spravnosti,
                f.dt_aktualizace,
                f.rozsirujici_data,
                o.garant_uzivatel_id,
                o.uzivatel_id as objednavka_vytvoril_id,
                o.prikazce_id,
                sm.usek_id as smlouva_usek_id
            FROM " . TBL_FAKTURY . " f
            LEFT JOIN " . TBL_OBJEDNAVKY . " o ON f.objednavka_id = o.id
            LEFT JOIN " . TBL_SMLOUVY . " sm ON f.smlouva_id = sm.id
            WHERE f.id = ? AND f.aktivni = 1
        ");
        $stmt_faktura->execute(array($faktura_id));
        $faktura = $stmt_faktura->fetch(PDO::FETCH_ASSOC);
        
        if (!$faktura) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena'));
            return;
        }

        // 5. ✅ ROZŠÍŘENÁ KONTROLA OPRÁVNĚNÍ (2026-06-08)
        // Mohou potvrzovat/zamítat věcnou správnost:
        // 1. Admin/Superadmin/Kontrolor faktur - globální právo
        // 2. Uživatel s právy INVOICE_MANAGE
        // === Pro faktury s OBJEDNÁVKOU: ===
        // 3. Garant objednávky
        // 4. Autor objednávky
        // 5. Příkazce objednávky
        // === Pro faktury se SMLOUVOU (bez objednávky): ===
        // 6. Uživatel z úseku smlouvy
        // === Pro VŠECHNY faktury: ===
        // 7. Autor faktury
        // 8. Uživatel komu byla faktura předána (fa_predana_zam_id)
        // 9. Kolegové z úseku uživatele komu byla faktura předána
        
        $user_id = $token_data['id'];
        $has_permission = false;
        $substitution_context = null;
        
        // Načíst úsek aktuálního uživatele
        $stmt_user_usek = $db->prepare("
            SELECT u.usek_id 
            FROM " . TBL_UZIVATELE . " u 
            WHERE u.id = ?
        ");
        $stmt_user_usek->execute(array($user_id));
        $user_usek_data = $stmt_user_usek->fetch(PDO::FETCH_ASSOC);
        $user_usek_id = $user_usek_data ? (int)$user_usek_data['usek_id'] : null;

        // 5x. Kontrola aktivního zastoupení vůči uživateli, kterému je faktura předána
        // Důležité: používá se pro oprávnění i pro audit log (badge v seznamu faktur)
        if (!empty($faktura['fa_predana_zam_id'])
            && (int)$faktura['fa_predana_zam_id'] !== (int)$user_id
            && function_exists('get_active_substitution_for_action')) {
            try {
                $target_zastupovany_id = (int)$faktura['fa_predana_zam_id'];

                // Primárně očekáváme oprávnění confirm pro věcnou správnost
                $substitution_context = get_active_substitution_for_action($db, $user_id, 'confirm', $target_zastupovany_id);

                // Fallback pro starší záznamy, kde může být jen approve
                if (!$substitution_context) {
                    $substitution_context = get_active_substitution_for_action($db, $user_id, 'approve', $target_zastupovany_id);
                }

                if ($substitution_context) {
                    error_log("✅ VS zastoupení: Uživatel #{$user_id} aktivně zastupuje uživatele #{$target_zastupovany_id} pro fakturu #{$faktura_id}");
                }
            } catch (Exception $e) {
                error_log("⚠️ VS zastoupení check error: " . $e->getMessage());
                $substitution_context = null;
            }
        }
        
        // 5a. Kontrola globálních rolí (SUPERADMIN, ADMINISTRATOR, KONTROLOR_FAKTUR)
        $stmt_role = $db->prepare("
            SELECT COUNT(*) as has_role 
            FROM " . TBL_UZIVATELE_ROLE . " ur
            INNER JOIN " . TBL_ROLE . " r ON ur.role_id = r.id
            WHERE ur.uzivatel_id = ? 
            AND r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR', 'KONTROLOR_FAKTUR')
        ");
        $stmt_role->execute(array($user_id));
        $role_check = $stmt_role->fetch(PDO::FETCH_ASSOC);
        
        if ($role_check && $role_check['has_role'] > 0) {
            $has_permission = true;
            error_log("✅ VS oprávnění: Uživatel #{$user_id} má globální roli (Admin/Kontrolor)");
        }
        
        // 5b. Kontrola práva INVOICE_MANAGE
        // OPRAVENO 2026-06-08: Použití správné struktury práv přes TBL_ROLE_PRAVA
        if (!$has_permission) {
            $stmt_pravo = $db->prepare("
                SELECT COUNT(*) as has_pravo
                FROM " . TBL_PRAVA . " p
                WHERE p.kod_prava = 'INVOICE_MANAGE'
                AND p.id IN (
                    -- Přímá práva (user_id != -1, role_id = -1)
                    SELECT rp.pravo_id FROM " . TBL_ROLE_PRAVA . " rp 
                    WHERE rp.user_id = ? AND rp.role_id = -1
                    
                    UNION
                    
                    -- Práva z rolí (user_id = -1, role_id = X)
                    SELECT rp.pravo_id 
                    FROM " . TBL_UZIVATELE_ROLE . " ur
                    JOIN " . TBL_ROLE_PRAVA . " rp ON ur.role_id = rp.role_id AND rp.user_id = -1
                    WHERE ur.uzivatel_id = ?
                )
            ");
            $stmt_pravo->execute(array($user_id, $user_id));
            $pravo_check = $stmt_pravo->fetch(PDO::FETCH_ASSOC);
            
            if ($pravo_check && $pravo_check['has_pravo'] > 0) {
                $has_permission = true;
                error_log("✅ VS oprávnění: Uživatel #{$user_id} má právo INVOICE_MANAGE");
            }
        }
        
        // 5c. Kontrola vztahu k OBJEDNÁVCE (pokud má faktura objednávku)
        if (!$has_permission && $faktura['objednavka_id']) {
            if ($faktura['garant_uzivatel_id'] == $user_id) {
                $has_permission = true;
                error_log("✅ VS oprávnění: Uživatel #{$user_id} je garant objednávky #{$faktura['objednavka_id']}");
            } elseif ($faktura['objednavka_vytvoril_id'] == $user_id) {
                $has_permission = true;
                error_log("✅ VS oprávnění: Uživatel #{$user_id} je autor objednávky #{$faktura['objednavka_id']}");
            } elseif ($faktura['prikazce_id'] == $user_id) {
                $has_permission = true;
                error_log("✅ VS oprávnění: Uživatel #{$user_id} je příkazce objednávky #{$faktura['objednavka_id']}");
            }
        }
        
        // 5d. Kontrola vztahu ke SMLOUVĚ (pokud má faktura smlouvu bez objednávky)
        if (!$has_permission && $faktura['smlouva_id'] && !$faktura['objednavka_id']) {
            // Uživatel z úseku smlouvy může schválit věcnou správnost
            if ($faktura['smlouva_usek_id'] && $user_usek_id && $faktura['smlouva_usek_id'] == $user_usek_id) {
                $has_permission = true;
                error_log("✅ VS oprávnění: Uživatel #{$user_id} je z úseku smlouvy #{$faktura['smlouva_id']} (úsek #{$user_usek_id})");
            }
        }
        
        // 5e. Kontrola autora faktury
        if (!$has_permission && $faktura['faktura_vytvoril_id'] == $user_id) {
            $has_permission = true;
            error_log("✅ VS oprávnění: Uživatel #{$user_id} je autor faktury #{$faktura_id}");
        }
        
        // 5f. Kontrola fa_predana_zam_id - uživatel komu byla faktura předána
        if (!$has_permission && $faktura['fa_predana_zam_id']) {
            if ($faktura['fa_predana_zam_id'] == $user_id) {
                $has_permission = true;
                error_log("✅ VS oprávnění: Uživatel #{$user_id} je uživatel komu byla faktura předána (fa_predana_zam_id)");
            } else {
                // Kontrola kolegů z úseku uživatele komu byla faktura předána
                $stmt_predany_usek = $db->prepare("
                    SELECT u.usek_id 
                    FROM " . TBL_UZIVATELE . " u 
                    WHERE u.id = ?
                ");
                $stmt_predany_usek->execute(array($faktura['fa_predana_zam_id']));
                $predany_usek_data = $stmt_predany_usek->fetch(PDO::FETCH_ASSOC);
                $predany_usek_id = $predany_usek_data ? (int)$predany_usek_data['usek_id'] : null;
                
                // Pokud je aktuální uživatel ze stejného úseku jako uživatel komu byla faktura předána
                if ($predany_usek_id && $user_usek_id && $predany_usek_id == $user_usek_id) {
                    $has_permission = true;
                    error_log("✅ VS oprávnění: Uživatel #{$user_id} je kolega z úseku #{$user_usek_id} uživatele #{$faktura['fa_predana_zam_id']} komu byla faktura předána");
                }

                // Aktivní zastoupení má přednost nad omezením úsek/lokalita
                if (!$has_permission && $substitution_context) {
                    $has_permission = true;
                    error_log("✅ VS oprávnění: Uživatel #{$user_id} má aktivní zastoupení pro uživatele #{$faktura['fa_predana_zam_id']}");
                }
            }
        }
        
        // 5g. Pokud nemá žádné oprávnění, vrátit 403
        if (!$has_permission) {
            error_log("❌ VS oprávnění ZAMÍTNUTO: Uživatel #{$user_id} nemá oprávnění k faktuře #{$faktura_id}");
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Nemáte oprávnění pro potvrzení/zamítnutí věcné správnosti této faktury. Musíte být garant, autor nebo příkazce objednávky, autor faktury, nebo mít příslušná práva.'
            ));
            return;
        }

        // 5h. REŽIM KONTROLY FAKTURY (bez zásahu do VS/workflow polí)
        if ($is_check_mode) {
            $czech_datetime = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

            $rozsirujici_data = array();
            if (!empty($faktura['rozsirujici_data'])) {
                $decoded_rozsirujici = json_decode($faktura['rozsirujici_data'], true);
                if (is_array($decoded_rozsirujici)) {
                    $rozsirujici_data = $decoded_rozsirujici;
                }
            }

            $rozsirujici_data['kontrola_radku'] = array(
                'kontrolovano' => $kontrolovano,
                'kontroloval_user_id' => $kontrolovano ? (int)$token_data['id'] : null,
                'kontroloval_username' => $kontrolovano ? $username : null,
                'dt_kontroly' => $kontrolovano ? $czech_datetime : null
            );

            $stmt_update_check = $db->prepare("\n                UPDATE " . TBL_FAKTURY . "\n                SET\n                    rozsirujici_data = ?,\n                    dt_aktualizace = ?,\n                    aktualizoval_uzivatel_id = ?\n                WHERE id = ?\n            ");
            $stmt_update_check->execute(array(
                json_encode($rozsirujici_data),
                $czech_datetime,
                (int)$token_data['id'],
                $faktura_id
            ));

            http_response_code(200);
            echo json_encode(array(
                'status' => 'success',
                'message' => $kontrolovano ? 'Faktura byla označena jako zkontrolovaná.' : 'Kontrola faktury byla zrušena.',
                'data' => array(
                    'faktura_id' => $faktura_id,
                    'kontrolovano' => $kontrolovano,
                    'dt_kontroly' => $kontrolovano ? $czech_datetime : null,
                    'mode' => 'check_only'
                )
            ));
            return;
        }
        
        // 6. Kontrola zamčeného stavu (pokud je zamítnuta a od té doby nebyla upravena)
        if (isFakturaLockedForVS($faktura)) {
            http_response_code(423); // HTTP 423 Locked
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Faktura je uzamčena. Vyčkejte na opravu od účetní. Po úpravě faktury bude možné znovu rozhodnout o věcné správnosti.',
                'locked' => true
            ));
            return;
        }

        // 6b. Ochrana proti přepsání potvrzujícího uživatele při opakované volbě stejného statusu
        $current_vs_status = (int)($faktura['vecna_spravnost_potvrzeno'] ?? VS_STATUS_NEPOTVRZENA);
        if ($status === $current_vs_status && $status !== VS_STATUS_NEPOTVRZENA) {
            error_log("🔒 VS beze změny: Faktura #$faktura_id už má status $status, zachovávám původního potvrzujícího uživatele");
            http_response_code(200);
            echo json_encode(array(
                'status' => 'success',
                'message' => 'Věcná správnost je již nastavena na stejný stav. Původní potvrzující uživatel zůstal beze změny.',
                'data' => array(
                    'faktura_id' => $faktura_id,
                    'fa_cislo_vema' => $faktura['fa_cislo_vema'],
                    'vecna_spravnost_status' => $current_vs_status,
                    'vecna_spravnost_duvod' => $vecna_spravnost_duvod,
                    'potvrdil_id' => !empty($faktura['potvrdil_vecnou_spravnost_id']) ? (int)$faktura['potvrdil_vecnou_spravnost_id'] : null,
                    'dt_potvrzeni' => $faktura['dt_potvrzeni_vecne_spravnosti'] ?? null,
                    'no_change' => true
                )
            ));
            return;
        }

        // 7. START TRANSAKCE - všechny změny v jedné transakci
        if ($status === VS_STATUS_POTVRZENA) {
            try {
                ensureLpSplitExistsForVsApproval($db, $faktura_id, (int)$faktura['objednavka_id']);
            } catch (Exception $lpGuardError) {
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error',
                    'message' => $lpGuardError->getMessage()
                ));
                return;
            }
        }

        $db->beginTransaction();
        
        try {
            $czech_datetime = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
            
            // 8a. Uložení statusu věcné správnosti do hlavní tabulky faktury
            if ($status === VS_STATUS_NEPOTVRZENA) {
                // Reset všech VS údajů
                $stmt_update_vs = $db->prepare("
                    UPDATE " . TBL_FAKTURY . "
                    SET 
                        vecna_spravnost_potvrzeno = NULL,
                        potvrdil_vecnou_spravnost_id = NULL,
                        dt_potvrzeni_vecne_spravnosti = NULL,
                        vecna_spravnost_duvod = NULL,
                        vecna_spravnost_poznamka = NULL,
                        vecna_spravnost_umisteni_majetku = NULL,
                        dt_aktualizace = ?,
                        aktualizoval_uzivatel_id = ?
                    WHERE id = ?
                ");
                $stmt_update_vs->execute(array($czech_datetime, $token_data['id'], $faktura_id));
                
            } elseif ($status === VS_STATUS_POTVRZENA) {
                // Status 1 (potvrzeno) - uložit údaje + nastavit stav faktury na VECNA_SPRAVNOST
                $stmt_update_vs = $db->prepare("
                    UPDATE " . TBL_FAKTURY . "
                    SET 
                        vecna_spravnost_potvrzeno = ?,
                        potvrdil_vecnou_spravnost_id = ?,
                        dt_potvrzeni_vecne_spravnosti = ?,
                        vecna_spravnost_duvod = ?,
                        stav = ?,
                        dt_aktualizace = ?,
                        aktualizoval_uzivatel_id = ?
                    WHERE id = ?
                ");
                $stmt_update_vs->execute(array(
                    $status,
                    $token_data['id'],
                    $czech_datetime,
                    $vecna_spravnost_duvod,
                    INVOICE_STATUS_VERIFICATION,
                    $czech_datetime,
                    $token_data['id'],
                    $faktura_id
                ));
                
                error_log("✅ Potvrzena VS faktury #$faktura_id - stav změněn na VECNA_SPRAVNOST");
                
            } else {
                // Status 2 (zamítnuto) - uložit údaje (stav faktury se nastaví níže)
                $stmt_update_vs = $db->prepare("
                    UPDATE " . TBL_FAKTURY . "
                    SET 
                        vecna_spravnost_potvrzeno = ?,
                        potvrdil_vecnou_spravnost_id = ?,
                        dt_potvrzeni_vecne_spravnosti = ?,
                        vecna_spravnost_duvod = ?,
                        dt_aktualizace = ?,
                        aktualizoval_uzivatel_id = ?
                    WHERE id = ?
                ");
                $stmt_update_vs->execute(array(
                    $status,
                    $token_data['id'],
                    $czech_datetime,
                    $vecna_spravnost_duvod,
                    $czech_datetime,
                    $token_data['id'],
                    $faktura_id
                ));
            }
            
            // 8b. Pokud je status ZAMÍTNUTO (2), provést další akce
            if ($status === VS_STATUS_ZAMITNUTA) {
                // 8b1. Změna stavu faktury na V_RESENI
                $stmt_update_stav = $db->prepare("
                    UPDATE " . TBL_FAKTURY . "
                    SET stav = ?
                    WHERE id = ?
                ");
                $stmt_update_stav->execute(array(INVOICE_STATUS_IN_PROGRESS, $faktura_id));
                
                // 8b2. Smazání LP čerpání faktury
                $stmt_delete_lp = $db->prepare("
                    DELETE FROM " . TBL_FAKTURY_LP_CERPANI . "
                    WHERE faktura_id = ?
                ");
                $stmt_delete_lp->execute(array($faktura_id));
                
                error_log("🔴 Zamítnuta VS faktury #$faktura_id - stav změněn na V_RESENI, LP čerpání smazáno");
            }

            // 8c. Audit log akce v zastoupení (pokud byla akce provedena za zastupovaného)
            if ($substitution_context && function_exists('log_substitution_action')) {
                $sub_akce_typ = 'UPDATE';
                $sub_popis = 'Úprava věcné správnosti faktury';

                if ($status === VS_STATUS_POTVRZENA) {
                    $sub_akce_typ = 'CONFIRM';
                    $sub_popis = 'Potvrzení věcné správnosti faktury';
                } elseif ($status === VS_STATUS_ZAMITNUTA) {
                    $sub_akce_typ = 'REJECT';
                    $sub_popis = 'Zamítnutí věcné správnosti faktury';
                } elseif ($status === VS_STATUS_NEPOTVRZENA) {
                    $sub_akce_typ = 'UPDATE';
                    $sub_popis = 'Reset věcné správnosti faktury';
                }

                $logged_sub = log_substitution_action(
                    $db,
                    (int)$substitution_context['zastupovani_id'],
                    (int)$user_id,
                    (int)$substitution_context['zastupovany_id'],
                    $sub_akce_typ,
                    'FAKTURA',
                    (int)$faktura_id,
                    $sub_popis
                );

                if (!$logged_sub) {
                    error_log("⚠️ VS substitution audit: nepodařilo se zapsat audit log pro fakturu #{$faktura_id}");
                }
            }
            
            // 9. ⚠️ AUTOMATICKÁ SPRÁVA WORKFLOW A STAVU OBJEDNÁVKY
            // podle věcné správnosti faktury
            error_log("🔍 [WORKFLOW CHECK] Faktura ID: {$faktura_id}, Objednávka ID: " . ($faktura['objednavka_id'] ?? 'NULL') . ", Status: {$status}");
            if (!empty($faktura['objednavka_id'])) {
                $objednavka_id = (int)$faktura['objednavka_id'];
                
                if ($status === VS_STATUS_POTVRZENA) {
                    // ✅ POTVRZENO - zkontrolovat, zda jsou všechny faktury potvrzeny
                    // Pokud ano, přidat ZKONTROLOVANA do workflow a změnit stav na "Zkontrolována"
                    updateWorkflowAfterVecnaSpravnostApproved($db, $objednavka_id);
                    error_log("✅ Spuštěna aktualizace workflow pro objednávku #{$objednavka_id} po potvrzení VS faktury #{$faktura_id}");
                    
                } elseif ($status === VS_STATUS_ZAMITNUTA || $status === VS_STATUS_NEPOTVRZENA) {
                    // ❌ ZAMÍTNUTO nebo RESETOVÁNO - zkontrolovat, zda ještě nejsou všechny faktury potvrzeny
                    // Pokud ne, odebrat ZKONTROLOVANA z workflow a vrátit stav na "Věcná správnost"
                    error_log("🔍 [CONDITION] elseif (status === VS_STATUS_ZAMITNUTA || status === VS_STATUS_NEPOTVRZENA) -> SPLNĚNA! Status=$status");
                    removeZkontrolovanaFromWorkflow($db, $objednavka_id);
                    error_log("🔍 [BEFORE CALL] Volám removeZkontrolovanaFromWorkflow(\$db, {$objednavka_id})");
                    error_log("🔄 Spuštěna revize workflow pro objednávku #{$objednavka_id} po zamítnutí/resetu VS faktury #{$faktura_id}");
                    error_log("🔍 [AFTER CALL] removeZkontrolovanaFromWorkflow() dokončena");
                }
            }
            
            // 10. COMMIT transakce
            $db->commit();
            
            // 🔔 11. NOTIFIKACE podle statusu věcné správnosti (MIMO TRANSAKCI)
            try {
                if ($status === VS_STATUS_POTVRZENA) {
                    // ✅ POTVRZENO - poslat notifikaci přes organizační hierarchii
                    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_APPROVED', $faktura_id, $token_data['id']);
                    error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_APPROVED for invoice $faktura_id");
                } elseif ($status === VS_STATUS_ZAMITNUTA) {
                    // ❌ ZAMÍTNUTO - poslat notifikaci přes organizační hierarchii s důvodem
                    $reason = $vecna_spravnost_duvod ?: 'Neuvedeno';
                    
                    // ✅ Placeholdery se automaticky generují v loadUniversalPlaceholders
                    // Obsahují vecna_spravnost_datum_potvrzeni (již formátovaný z DB)
                    $customPlaceholders = array(
                        'vecna_spravnost_duvod' => $reason,
                        'rejection_reason'      => $reason,  // ✅ Alias pro šablonu
                        'reason'                => $reason,  // ✅ Univerzální alias
                    );
                    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REJECTED', $faktura_id, $token_data['id'], $customPlaceholders);
                    error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_REJECTED for invoice $faktura_id (reason: $vecna_spravnost_duvod)");
                } elseif ($status === VS_STATUS_NEPOTVRZENA) {
                    // 🔄 RESET - poslat notifikaci o požadavku na nové ověření
                    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $faktura_id, $token_data['id']);
                    error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_REQUESTED for invoice $faktura_id (reset)");
                }
            } catch (Exception $notifErr) {
                // Notifikace nesmí blokovat úspěch operace
                error_log("⚠️ Chyba při odesílání notifikace pro fakturu #$faktura_id: " . $notifErr->getMessage());
            }
            
            // 12. Úspěšná odpověď
            http_response_code(200);
            echo json_encode(array(
                'status' => 'success',
                'message' => ($status === VS_STATUS_ZAMITNUTA) 
                    ? 'Věcná správnost faktury byla zamítnuta. Faktura vrácena k dořešení.' 
                    : (($status === VS_STATUS_POTVRZENA) 
                        ? 'Věcná správnost faktury byla potvrzena.' 
                        : 'Věcná správnost faktury byla resetována.'),
                'data' => array(
                    'faktura_id' => $faktura_id,
                    'fa_cislo_vema' => $faktura['fa_cislo_vema'],
                    'vecna_spravnost_status' => $status,
                    'vecna_spravnost_duvod' => $vecna_spravnost_duvod,
                    'potvrdil_id' => ($status > 0) ? $token_data['id'] : null,
                    'dt_potvrzeni' => ($status > 0) ? $czech_datetime : null,
                    'lp_cerpani_smazano' => ($status === VS_STATUS_ZAMITNUTA)
                )
            ));
            
        } catch (Exception $e) {
            // ROLLBACK při chybě
            $db->rollBack();
            throw $e;
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chyba při změně stavu věcné správnosti: ' . $e->getMessage()
        ));
        error_log("❌ Chyba při změně VS faktury #$faktura_id: " . $e->getMessage());
    }
}

/**
 * POST - Načte stavy kontrol pro více faktur najednou
 * Endpoint: invoices/get-checks
 * POST: {token, username, faktura_ids[]}
 * 
 * @param array $input POST data (token, username, faktura_ids)
 * @param array $config Konfigurace (DB přístup)
 * @return void Vrací JSON response s mapou faktura_id => kontrola_stav
 */
function handle_invoice_get_checks($input, $config) {
    // 1. Validace HTTP metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // 2. Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $faktura_ids = isset($input['faktura_ids']) && is_array($input['faktura_ids']) 
        ? array_map('intval', $input['faktura_ids']) 
        : array();
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }
    
    if (empty($faktura_ids)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí seznam faktura_ids'));
        return;
    }

    // 3. Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // 4. Načtení faktur
        $placeholders = implode(',', array_fill(0, count($faktura_ids), '?'));
        $stmt = $db->prepare("
            SELECT id, fa_cislo_vema, rozsirujici_data 
            FROM " . TBL_FAKTURY . " 
            WHERE id IN ($placeholders) AND aktivni = 1
        ");
        $stmt->execute($faktura_ids);
        $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 5. Parsování stavů kontrol
        $checks = array();
        
        // Načíst dt_aktualizace pro všechny faktury najednou
        $stmt_dates = $db->prepare("
            SELECT id, dt_aktualizace 
            FROM " . TBL_FAKTURY . " 
            WHERE id IN ($placeholders)
        ");
        $stmt_dates->execute($faktura_ids);
        $dates_map = array();
        while ($row = $stmt_dates->fetch(PDO::FETCH_ASSOC)) {
            $dates_map[$row['id']] = $row['dt_aktualizace'];
        }
        
        foreach ($faktury as $faktura) {
            $kontrola_stav = array(
                'kontrolovano' => false,
                'kontroloval_user_id' => null,
                'kontroloval_username' => null,
                'dt_kontroly' => null
            );

            if (!empty($faktura['rozsirujici_data'])) {
                $parsed = json_decode($faktura['rozsirujici_data'], true);
                if (is_array($parsed) && isset($parsed['kontrola_radku'])) {
                    $kontrola_stav = $parsed['kontrola_radku'];
                }
            }
            
            // ✅ TŘÍFÁZOVÝ SYSTÉM: Kontrola, zda po kontrole došlo k update
            $check_status = 'unchecked';  // Default
            if ($kontrola_stav['kontrolovano']) {
                $dt_kontroly = isset($kontrola_stav['dt_kontroly']) ? $kontrola_stav['dt_kontroly'] : null;
                $dt_aktualizace = isset($dates_map[$faktura['id']]) ? $dates_map[$faktura['id']] : null;
                
                if ($dt_kontroly && $dt_aktualizace) {
                    // Porovnat časové značky
                    $ts_kontroly = strtotime($dt_kontroly);
                    $ts_aktualizace = strtotime($dt_aktualizace);
                    
                    if ($ts_kontroly >= $ts_aktualizace) {
                        $check_status = 'checked_ok';  // ✅ Zelená - zkontrolováno, beze změn
                    } else {
                        $check_status = 'checked_modified';  // ⚠️ Oranžová - zkontrolováno, ale upraveno
                    }
                } else {
                    $check_status = 'checked_ok';  // Pokud nemáme dt_aktualizace, považujeme za OK
                }
            }

            $checks[$faktura['id']] = array(
                'faktura_id' => $faktura['id'],
                'fa_cislo_vema' => $faktura['fa_cislo_vema'],
                'kontrola' => $kontrola_stav,
                'check_status' => $check_status  // unchecked | checked_ok | checked_modified
            );
        }

        // 6. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $checks,
            'count' => count($checks)
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chyba při načítání stavů kontrol: ' . $e->getMessage()
        ));
    }
}
