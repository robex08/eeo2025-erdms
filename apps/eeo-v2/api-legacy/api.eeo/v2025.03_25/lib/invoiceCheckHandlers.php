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
 * POST - Nastaví stav věcné správnosti faktury (0=neověřeno, 1=potvrzeno, 2=zamítnuto)
 * 
 * 🆕 ROZŠÍŘENO O ZAMÍTNUTÍ VĚCNÉ SPRÁVNOSTI (status 0/1/2)
 * 
 * Endpoint: invoices/toggle-check
 * POST: {token, username, faktura_id, status, vecna_spravnost_poznamka}
 * 
 * BACKWARD COMPATIBILITY: Pokud přijde starý parametr "kontrolovano" (bool), mapuje se na status 0/1
 * 
 * @param array $input POST data (token, username, faktura_id, status, vecna_spravnost_poznamka)
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
    
    // BACKWARD COMPATIBILITY: mapování starého "kontrolovano" (bool) na nový "status" (0/1/2)
    if (isset($input['status'])) {
        $status = (int)$input['status'];
    } elseif (isset($input['kontrolovano'])) {
        // Starý parametr kontrolovano → mapování na status 0/1
        $status = $input['kontrolovano'] ? VS_STATUS_POTVRZENA : VS_STATUS_NEPOTVRZENA;
    } else {
        $status = VS_STATUS_NEPOTVRZENA; // Default
    }
    
    $vecna_spravnost_poznamka = isset($input['vecna_spravnost_poznamka']) ? trim($input['vecna_spravnost_poznamka']) : '';
    $vecna_spravnost_poznamka = isset($input['vecna_spravnost_poznamka']) ? trim($input['vecna_spravnost_poznamka']) : '';
    
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
    
    // Validace status hodnoty (0/1/2)
    if (!in_array($status, array(VS_STATUS_NEPOTVRZENA, VS_STATUS_POTVRZENA, VS_STATUS_ZAMITNUTA))) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný status (očekávány hodnoty 0, 1 nebo 2)'));
        return;
    }
    
    // Validace povinné poznámky při zamítnutí
    if ($status === VS_STATUS_ZAMITNUTA && strlen($vecna_spravnost_poznamka) < 5) {
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

        // 4. Kontrola role KONTROLOR_FAKTUR nebo SUPERADMIN nebo ADMINISTRATOR
        $stmt_role = $db->prepare("
            SELECT COUNT(*) as has_role 
            FROM " . TBL_UZIVATELE_ROLE . " ur
            INNER JOIN " . TBL_ROLE . " r ON ur.role_id = r.id
            WHERE ur.uzivatel_id = ? 
            AND r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR', 'KONTROLOR_FAKTUR')
        ");
        $stmt_role->execute(array($token_data['id']));
        $role_check = $stmt_role->fetch(PDO::FETCH_ASSOC);
        
        if (!$role_check || $role_check['has_role'] == 0) {
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Nemáte oprávnění pro kontrolu faktur. Vyžadována role KONTROLOR_FAKTUR, SUPERADMIN nebo ADMINISTRATOR.'
            ));
            return;
        }

        // 5. Načtení aktuálního stavu faktury (s dt_aktualizace pro lock check)
        $stmt_faktura = $db->prepare("
            SELECT 
                id, 
                fa_cislo_vema,
                objednavka_id,
                vecna_spravnost_potvrzeno,
                dt_potvrzeni_vecne_spravnosti,
                dt_aktualizace,
                rozsirujici_data 
            FROM " . TBL_FAKTURY . " 
            WHERE id = ? AND aktivni = 1
        ");
        $stmt_faktura->execute(array($faktura_id));
        $faktura = $stmt_faktura->fetch(PDO::FETCH_ASSOC);
        
        if (!$faktura) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena'));
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

        // 7. START TRANSAKCE - všechny změny v jedné transakci
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
                        vecna_spravnost_poznamka = NULL,
                        vecna_spravnost_umisteni_majetku = NULL
                    WHERE id = ?
                ");
                $stmt_update_vs->execute(array($faktura_id));
                
            } else {
                // Status 1 (potvrzeno) nebo 2 (zamítnuto) - uložit údaje
                $stmt_update_vs = $db->prepare("
                    UPDATE " . TBL_FAKTURY . "
                    SET 
                        vecna_spravnost_potvrzeno = ?,
                        potvrdil_vecnou_spravnost_id = ?,
                        dt_potvrzeni_vecne_spravnosti = ?,
                        vecna_spravnost_poznamka = ?
                    WHERE id = ?
                ");
                $stmt_update_vs->execute(array(
                    $status,
                    $token_data['id'],
                    $czech_datetime,
                    $vecna_spravnost_poznamka,
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
            
            // 9. COMMIT transakce
            $db->commit();
            
            // 10. Úspěšná odpověď
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
                    'vecna_spravnost_poznamka' => $vecna_spravnost_poznamka,
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
