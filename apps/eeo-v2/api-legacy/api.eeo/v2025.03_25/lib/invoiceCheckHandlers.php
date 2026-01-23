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
 * POST - Přepne stav kontroly faktury (řádku v InvoiceListu)
 * Endpoint: invoices/toggle-check
 * POST: {token, username, faktura_id, kontrolovano}
 * 
 * @param array $input POST data (token, username, faktura_id, kontrolovano)
 * @param array $config Konfigurace (DB přístup)
 * @return void Vrací JSON response
 */
function handle_invoice_toggle_check($input, $config) {
    // ==========================================
    // 🐛 DEV DEBUG LOGGING - KONTROLA FAKTURY
    // ==========================================
    error_log("╔═══════════════════════════════════════════════════════════");
    error_log("║ ✅ MODUL FAKTUR - KONTROLA ŘÁDKU");
    error_log("║ Čas: " . date('Y-m-d H:i:s'));
    error_log("║ Uživatel: " . (isset($input['username']) ? $input['username'] : 'N/A'));
    error_log("║ Faktura ID: " . (isset($input['faktura_id']) ? $input['faktura_id'] : 'N/A'));
    error_log("║ Kontrolováno: " . (isset($input['kontrolovano']) ? ($input['kontrolovano'] ? 'ANO' : 'NE') : 'N/A'));
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
    $kontrolovano = isset($input['kontrolovano']) ? (bool)$input['kontrolovano'] : false;
    
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

        // 5. Načtení aktuálního stavu faktury
        $stmt_faktura = $db->prepare("
            SELECT id, rozsirujici_data, fa_cislo_vema 
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

        // 6. Parsování nebo vytvoření rozsirujici_data
        $rozsirujici_data = array();
        if (!empty($faktura['rozsirujici_data'])) {
            $parsed = json_decode($faktura['rozsirujici_data'], true);
            if (is_array($parsed)) {
                $rozsirujici_data = $parsed;
            }
        }

        // 7. Načtení celého jména uživatele
        $stmt_user = $db->prepare("
            SELECT prijmeni, jmeno 
            FROM " . TBL_UZIVATELE . " 
            WHERE id = ?
        ");
        $stmt_user->execute(array($token_data['id']));
        $user_data = $stmt_user->fetch(PDO::FETCH_ASSOC);
        $cele_jmeno = $user_data ? trim($user_data['prijmeni'] . ' ' . $user_data['jmeno']) : $username;
        
        // 8. Aktualizace stavu kontroly
        if ($kontrolovano) {
            // Zaškrtnout kontrolu
            $rozsirujici_data['kontrola_radku'] = array(
                'kontrolovano' => true,
                'kontroloval_user_id' => $token_data['id'],
                'kontroloval_username' => $username,
                'kontroloval_cele_jmeno' => $cele_jmeno,
                'dt_kontroly' => TimezoneHelper::getCzechDateTime('Y-m-d H:i:s')
            );
        } else {
            // Odškrtnout kontrolu - smazat nebo nastavit false
            $rozsirujici_data['kontrola_radku'] = array(
                'kontrolovano' => false,
                'kontroloval_user_id' => null,
                'kontroloval_username' => null,
                'kontroloval_cele_jmeno' => null,
                'dt_kontroly' => null
            );
        }

        // 9. Uložení změn do DB
        $stmt_update = $db->prepare("
            UPDATE " . TBL_FAKTURY . " 
            SET rozsirujici_data = ?,
                aktualizoval_uzivatel_id = ?,
                dt_aktualizace = NOW()
            WHERE id = ?
        ");
        
        $stmt_update->execute(array(
            json_encode($rozsirujici_data),
            $token_data['id'],
            $faktura_id
        ));

        // 9. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'message' => 'Stav kontroly faktury byl úspěšně změněn',
            'data' => array(
                'faktura_id' => $faktura_id,
                'fa_cislo_vema' => $faktura['fa_cislo_vema'],
                'kontrolovano' => $kontrolovano,
                'kontrola_radku' => $rozsirujici_data['kontrola_radku']
            )
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chyba při změně stavu kontroly: ' . $e->getMessage()
        ));
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

            $checks[$faktura['id']] = array(
                'faktura_id' => $faktura['id'],
                'fa_cislo_vema' => $faktura['fa_cislo_vema'],
                'kontrola' => $kontrola_stav
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
