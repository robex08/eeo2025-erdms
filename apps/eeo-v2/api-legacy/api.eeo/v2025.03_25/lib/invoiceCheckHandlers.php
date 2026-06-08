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
    
    // Validace status hodnoty (0/1/2)
    if (!in_array($status, array(VS_STATUS_NEPOTVRZENA, VS_STATUS_POTVRZENA, VS_STATUS_ZAMITNUTA))) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný status (očekávány hodnoty 0, 1 nebo 2)'));
        return;
    }
    
    // Validace povinného důvodu při zamítnutí
    if ($status === VS_STATUS_ZAMITNUTA && strlen($vecna_spravnost_duvod) < 5) {
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
        
        // Načíst úsek aktuálního uživatele
        $stmt_user_usek = $db->prepare("
            SELECT u.usek_id 
            FROM " . TBL_UZIVATELE . " u 
            WHERE u.id = ?
        ");
        $stmt_user_usek->execute(array($user_id));
        $user_usek_data = $stmt_user_usek->fetch(PDO::FETCH_ASSOC);
        $user_usek_id = $user_usek_data ? (int)$user_usek_data['usek_id'] : null;
        
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
                        vecna_spravnost_duvod = NULL,
                        vecna_spravnost_poznamka = NULL,
                        vecna_spravnost_umisteni_majetku = NULL
                    WHERE id = ?
                ");
                $stmt_update_vs->execute(array($faktura_id));
                
            } elseif ($status === VS_STATUS_POTVRZENA) {
                // Status 1 (potvrzeno) - uložit údaje + nastavit stav faktury na VECNA_SPRAVNOST
                $stmt_update_vs = $db->prepare("
                    UPDATE " . TBL_FAKTURY . "
                    SET 
                        vecna_spravnost_potvrzeno = ?,
                        potvrdil_vecnou_spravnost_id = ?,
                        dt_potvrzeni_vecne_spravnosti = ?,
                        vecna_spravnost_duvod = ?,
                        stav = ?
                    WHERE id = ?
                ");
                $stmt_update_vs->execute(array(
                    $status,
                    $token_data['id'],
                    $czech_datetime,
                    $vecna_spravnost_duvod,
                    INVOICE_STATUS_VERIFICATION,
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
                        vecna_spravnost_duvod = ?
                    WHERE id = ?
                ");
                $stmt_update_vs->execute(array(
                    $status,
                    $token_data['id'],
                    $czech_datetime,
                    $vecna_spravnost_duvod,
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
            
            // 🔔 10. NOTIFIKACE podle statusu věcné správnosti
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
            
            // 11. Úspěšná odpověď
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
