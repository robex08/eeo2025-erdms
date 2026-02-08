<?php

/**
 * Order V3 Check Handlers - Kontrola objednávek v Order25ListV3
 * PHP 5.6 Compatible
 * Autor: Development Team
 * Datum: 2026-02-08
 * 
 * 🎯 ÚČEL:
 * - Umožnit kontrolorům zkontrolovat správnost objednávek V3
 * - Jednoduchý checkbox - zkontrolováno ANO/NE (bez komentářů)
 * - Stav kontroly se ukládá do kontrola_metadata JSON v tabulce 25a_objednavky
 * - Právo kontroly má role KONTROLOR_OBJEDNAVEK (ID=18), SUPERADMIN (ID=1) a ADMINISTRATOR (ID=2)
 * 
 * 📋 ENDPOINTY:
 * - POST orders-v3/check              → Toggle stav kontroly objednávky
 * - POST orders-v3/get-checks         → Načte stavy kontrol pro více objednávek
 * 
 * 📊 FORMÁT JSON v kontrola_metadata:
 * {
 *   "zkontrolovano": true,
 *   "kontroloval_user_id": 42,
 *   "kontroloval_jmeno": "Jan Novák",
 *   "dt_kontroly": "2026-02-08 14:30:00"
 * }
 * 
 * ✅ DODRŽUJE PRAVIDLA Z PHPAPI.prompt.md:
 * - ✅ Pouze POST metoda
 * - ✅ Token a username z POST body (ne z headers)
 * - ✅ Prepared statements (SQL injection ochrana)
 * - ✅ Standardní JSON response formát (status, data, message)
 * - ✅ HTTP status codes (200, 400, 401, 403, 404, 500)
 * - ✅ České error messages
 * - ✅ TimezoneHelper pro správnou timezone
 * - ✅ Konstanty tabulek (TBL_OBJEDNAVKY)
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php';

/**
 * POST - Toggle stav kontroly objednávky
 * Endpoint: orders-v3/check
 * POST: {token, username, order_id, checked}
 * 
 * @param array $input POST data (token, username, order_id, checked)
 * @param array $config Konfigurace (DB přístup)
 * @return void Vrací JSON response
 */
function handle_order_v3_check($input, $config) {
    // ==========================================
    // 🐛 DEV DEBUG LOGGING - KONTROLA OBJEDNÁVKY
    // ==========================================
    error_log("╔═══════════════════════════════════════════════════════════");
    error_log("║ ✅ ORDER V3 - KONTROLA OBJEDNÁVKY");
    error_log("║ Čas: " . date('Y-m-d H:i:s'));
    error_log("║ Uživatel: " . (isset($input['username']) ? $input['username'] : 'N/A'));
    error_log("║ Order ID: " . (isset($input['order_id']) ? $input['order_id'] : 'N/A'));
    error_log("║ Checked: " . (isset($input['checked']) ? ($input['checked'] ? 'ANO' : 'NE') : 'N/A'));
    error_log("║ Endpoint: orders-v3/check");
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
    $order_id = isset($input['order_id']) ? (int)$input['order_id'] : 0;
    $checked = isset($input['checked']) ? (bool)$input['checked'] : false;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné order_id'));
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

        // Nastavit MySQL timezone na českou (+01:00 nebo +02:00)
        TimezoneHelper::setMysqlTimezone($db);
        
        $user_id = (int)$token_data['id'];
        
        // 4. Kontrola oprávnění - má uživatel právo kontrolovat objednávky?
        $stmt = $db->prepare("
            SELECT COUNT(*) as has_permission
            FROM " . TBL_UZIVATELE_ROLE . " ur
            INNER JOIN " . TBL_ROLE . " r ON ur.role_id = r.id
            WHERE ur.uzivatel_id = ?
              AND r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR', 'KONTROLOR_OBJEDNAVEK')
        ");
        $stmt->execute(array($user_id));
        $permission = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$permission || $permission['has_permission'] == 0) {
            error_log("⛔ User ID $user_id nemá oprávnění ke kontrole objednávek");
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Nemáte oprávnění ke kontrole objednávek'
            ));
            return;
        }
        
        error_log("✅ User ID $user_id má oprávnění ke kontrole");

        // 5. Zkontrolovat, zda objednávka existuje
        $stmt = $db->prepare("SELECT id FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
        $stmt->execute(array($order_id));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            error_log("❌ Objednávka ID $order_id neexistuje");
            http_response_code(404);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Objednávka s ID ' . $order_id . ' neexistuje'
            ));
            return;
        }

        // 6. Získat jméno kontrolora
        $stmt = $db->prepare("
            SELECT CONCAT(jmeno, ' ', prijmeni) as cele_jmeno
            FROM " . TBL_UZIVATELE . "
            WHERE id = ?
        ");
        $stmt->execute(array($user_id));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $kontroloval_jmeno = $user ? $user['cele_jmeno'] : $username;

        // 7. Sestavit JSON metadata
        $dt_kontroly = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
        
        $metadata = array(
            'zkontrolovano' => $checked,
            'kontroloval_user_id' => $user_id,
            'kontroloval_jmeno' => $kontroloval_jmeno,
            'dt_kontroly' => $dt_kontroly
        );
        
        $metadata_json = json_encode($metadata);

        // 8. Uložit do databáze
        $stmt = $db->prepare("
            UPDATE " . TBL_OBJEDNAVKY . "
            SET kontrola_metadata = ?
            WHERE id = ?
        ");
        $stmt->execute(array($metadata_json, $order_id));
        
        error_log("✅ Kontrola objednávky ID $order_id uložena: " . ($checked ? 'ZKONTROLOVÁNO' : 'ZRUŠENO'));

        // 9. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'order_id' => $order_id,
                'kontrola' => $metadata
            ),
            'message' => $checked ? 'Objednávka označena jako zkontrolovaná' : 'Kontrola objednávky zrušena'
        ));

    } catch (PDOException $e) {
        error_log("❌ SQL ERROR v handle_order_v3_check: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při ukládání kontroly objednávky'
        ));
    } catch (Exception $e) {
        error_log("❌ ERROR v handle_order_v3_check: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při zpracování: ' . $e->getMessage()
        ));
    }
}

/**
 * POST - Načte stavy kontrol pro více objednávek (bulk load)
 * Endpoint: orders-v3/get-checks
 * POST: {token, username, order_ids: [1,2,3...]}
 * 
 * @param array $input POST data (token, username, order_ids)
 * @param array $config Konfigurace (DB přístup)
 * @return void Vrací JSON response
 */
function handle_order_v3_get_checks($input, $config) {
    // 1. Validace HTTP metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // 2. Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $order_ids = isset($input['order_ids']) ? $input['order_ids'] : array();
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }
    
    if (!is_array($order_ids) || empty($order_ids)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí order_ids pole'));
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

        TimezoneHelper::setMysqlTimezone($db);
        
        // Sanitizace order_ids - pouze celá čísla
        $safe_ids = array();
        foreach ($order_ids as $id) {
            $int_id = (int)$id;
            if ($int_id > 0) {
                $safe_ids[] = $int_id;
            }
        }
        
        if (empty($safe_ids)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Žádné platné order_ids'));
            return;
        }

        // 4. Načíst kontrola_metadata pro všechny objednávky
        $placeholders = implode(',', array_fill(0, count($safe_ids), '?'));
        $stmt = $db->prepare("
            SELECT 
                id,
                kontrola_metadata
            FROM " . TBL_OBJEDNAVKY . "
            WHERE id IN ($placeholders)
        ");
        $stmt->execute($safe_ids);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 5. Parsovat JSON metadata
        $checks = array();
        foreach ($results as $row) {
            $metadata = null;
            if ($row['kontrola_metadata']) {
                $metadata = json_decode($row['kontrola_metadata'], true);
            }
            
            $checks[$row['id']] = $metadata ? $metadata : array(
                'zkontrolovano' => false,
                'kontroloval_user_id' => null,
                'kontroloval_jmeno' => null,
                'dt_kontroly' => null
            );
        }
        
        // 6. Doplnit chybějící IDs (objednávky které neexistují)
        foreach ($safe_ids as $id) {
            if (!isset($checks[$id])) {
                $checks[$id] = null; // Objednávka neexistuje
            }
        }

        // 7. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $checks,
            'message' => 'Stavy kontrol načteny',
            'count' => count($checks)
        ));

    } catch (PDOException $e) {
        error_log("❌ SQL ERROR v handle_order_v3_get_checks: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání stavů kontrol'
        ));
    } catch (Exception $e) {
        error_log("❌ ERROR v handle_order_v3_get_checks: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při zpracování: ' . $e->getMessage()
        ));
    }
}
