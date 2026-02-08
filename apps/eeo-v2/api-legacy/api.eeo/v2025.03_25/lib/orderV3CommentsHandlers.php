<?php

/**
 * Order V3 Comments Handlers - Komentáře k objednávkám V3
 * PHP 5.6 Compatible
 * Autor: Development Team
 * Datum: 2026-02-08
 * 
 * 🎯 ÚČEL:
 * - Komunikace účastníků objednávky během realizace
 * - Chronologický seznam komentářů bez threading
 * - Uložení do tabulky 25a_objednavky_komentare
 * - Přístup mají všichni účastníci objednávky (12 rolí) + admin
 * 
 * 📋 ENDPOINTY:
 * - POST orders-v3/comments/list      → Načte komentáře k objednávce
 * - POST orders-v3/comments/add       → Přidá nový komentář
 * - POST orders-v3/comments/delete    → Smaže vlastní komentář (soft delete)
 * 
 * 👥 12 ROLÍ ÚČASTNÍKŮ (právo přístupu):
 * 1. uzivatel_id - Autor/Tvůrce
 * 2. objednatel_id - Objednatel
 * 3. garant_uzivatel_id - Garant
 * 4. schvalovatel_id - Schvalovatel
 * 5. prikazce_id - Příkazce
 * 6. uzivatel_akt_id - Aktualizátor
 * 7. odesilatel_id - Odesílatel
 * 8. dodavatel_potvrdil_id - Potvrdil dodavatel
 * 9. zverejnil_id - Zveřejnil
 * 10. fakturant_id - Fakturant
 * 11. dokoncil_id - Dokončil
 * 12. potvrdil_vecnou_spravnost_id - Potvrdil věcnou správnost
 * 
 * ✅ DODRŽUJE PRAVIDLA Z PHPAPI.prompt.md:
 * - ✅ Pouze POST metoda
 * - ✅ Token a username z POST body
 * - ✅ Prepared statements
 * - ✅ Standardní JSON response
 * - ✅ České error messages
 * - ✅ TimezoneHelper pro timezone
 * - ✅ Konstanty tabulek
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php';

/**
 * Kontrola, zda má uživatel přístup k objednávce (12 rolí účastníků + admin)
 * 
 * @param PDO $db DB připojení
 * @param int $user_id ID uživatele
 * @param int $order_id ID objednávky
 * @param array $user_roles Role uživatele
 * @return bool True pokud má přístup
 */
function can_access_order_comments($db, $user_id, $order_id, $user_roles = array()) {
    // 1. Admin má přístup ke VŠEM objednávkám
    if (in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles)) {
        return true;
    }
    
    // 2. Zkontrolovat, zda je uživatel účastníkem objednávky (12 rolí)
    $stmt = $db->prepare("
        SELECT COUNT(*) as is_participant
        FROM " . TBL_OBJEDNAVKY . "
        WHERE id = ?
          AND (
              uzivatel_id = ?
              OR objednatel_id = ?
              OR garant_uzivatel_id = ?
              OR schvalovatel_id = ?
              OR prikazce_id = ?
              OR uzivatel_akt_id = ?
              OR odesilatel_id = ?
              OR dodavatel_potvrdil_id = ?
              OR zverejnil_id = ?
              OR fakturant_id = ?
              OR dokoncil_id = ?
              OR potvrdil_vecnou_spravnost_id = ?
          )
    ");
    
    // Všech 12 parametrů musí být user_id (kontrolujeme OR podmínky)
    $params = array($order_id);
    for ($i = 0; $i < 12; $i++) {
        $params[] = $user_id;
    }
    
    $stmt->execute($params);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return ($result && $result['is_participant'] > 0);
}

/**
 * POST - Načte komentáře k objednávce (chronologicky)
 * Endpoint: orders-v3/comments/list
 * POST: {token, username, order_id, limit, offset}
 * 
 * @param array $input POST data
 * @param array $config Konfigurace
 * @return void Vrací JSON response
 */
function handle_order_v3_comments_list($input, $config) {
    error_log("╔═══════════════════════════════════════════════════════════");
    error_log("║ 💬 ORDER V3 - NAČTENÍ KOMENTÁŘŮ");
    error_log("║ Čas: " . date('Y-m-d H:i:s'));
    error_log("║ Uživatel: " . (isset($input['username']) ? $input['username'] : 'N/A'));
    error_log("║ Order ID: " . (isset($input['order_id']) ? $input['order_id'] : 'N/A'));
    error_log("║ Endpoint: orders-v3/comments/list");
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
    $limit = isset($input['limit']) ? (int)$input['limit'] : 100;
    $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
    
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

        TimezoneHelper::setMysqlTimezone($db);
        
        $user_id = (int)$token_data['id'];
        
        // Získat role uživatele
        $stmt = $db->prepare("
            SELECT r.kod_role
            FROM " . TBL_UZIVATELE_ROLE . " ur
            INNER JOIN " . TBL_ROLE . " r ON ur.role_id = r.id
            WHERE ur.uzivatel_id = ?
        ");
        $stmt->execute(array($user_id));
        $roles_result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $user_roles = array();
        foreach ($roles_result as $row) {
            $user_roles[] = $row['kod_role'];
        }

        // 4. Kontrola přístupu k objednávce
        if (!can_access_order_comments($db, $user_id, $order_id, $user_roles)) {
            error_log("⛔ User ID $user_id nemá přístup k objednávce $order_id");
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Nemáte oprávnění zobrazit komentáře k této objednávce'
            ));
            return;
        }
        
        error_log("✅ User ID $user_id má přístup k objednávce $order_id");

        // 5. Načíst komentáře (chronologicky, nesmazané)
        $stmt = $db->prepare("
            SELECT 
                k.id,
                k.objednavka_id,
                k.user_id,
                k.obsah,
                k.obsah_plain,
                k.metadata,
                k.dt_vytvoreni,
                CONCAT(u.jmeno, ' ', u.prijmeni) as autor_jmeno,
                u.username as autor_username
            FROM 25a_objednavky_komentare k
            INNER JOIN " . TBL_UZIVATELE . " u ON k.user_id = u.id
            WHERE k.objednavka_id = ?
              AND k.smazano = 0
            ORDER BY k.dt_vytvoreni ASC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute(array($order_id, $limit, $offset));
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 6. Přidat flag "muze_smazat" (vlastní komentáře)
        foreach ($comments as &$comment) {
            $comment['muze_smazat'] = ($comment['user_id'] == $user_id);
            
            // Parsovat metadata JSON
            if ($comment['metadata']) {
                $comment['metadata'] = json_decode($comment['metadata'], true);
            }
        }
        
        // 7. Celkový počet komentářů
        $stmt = $db->prepare("
            SELECT COUNT(*) as total
            FROM 25a_objednavky_komentare
            WHERE objednavka_id = ?
              AND smazano = 0
        ");
        $stmt->execute(array($order_id));
        $total_row = $stmt->fetch(PDO::FETCH_ASSOC);
        $total = $total_row ? (int)$total_row['total'] : 0;

        // 8. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $comments,
            'message' => 'Komentáře načteny',
            'count' => count($comments),
            'total' => $total,
            'comments_count' => $total // Pro badge v UI
        ));

    } catch (PDOException $e) {
        error_log("❌ SQL ERROR v handle_order_v3_comments_list: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání komentářů'
        ));
    } catch (Exception $e) {
        error_log("❌ ERROR v handle_order_v3_comments_list: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při zpracování: ' . $e->getMessage()
        ));
    }
}

/**
 * POST - Přidá nový komentář k objednávce
 * Endpoint: orders-v3/comments/add
 * POST: {token, username, order_id, obsah}
 * 
 * @param array $input POST data
 * @param array $config Konfigurace
 * @return void Vrací JSON response
 */
function handle_order_v3_comments_add($input, $config) {
    error_log("╔═══════════════════════════════════════════════════════════");
    error_log("║ ➕ ORDER V3 - PŘIDÁNÍ KOMENTÁŘE");
    error_log("║ Čas: " . date('Y-m-d H:i:s'));
    error_log("║ Uživatel: " . (isset($input['username']) ? $input['username'] : 'N/A'));
    error_log("║ Order ID: " . (isset($input['order_id']) ? $input['order_id'] : 'N/A'));
    error_log("║ Endpoint: orders-v3/comments/add");
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
    $obsah = isset($input['obsah']) ? trim($input['obsah']) : '';
    
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
    
    if (empty($obsah)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Komentář nemůže být prázdný'));
        return;
    }
    
    if (strlen($obsah) > 5000) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Komentář je příliš dlouhý (max 5000 znaků)'));
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
        
        $user_id = (int)$token_data['id'];
        
        // Získat role uživatele
        $stmt = $db->prepare("
            SELECT r.kod_role
            FROM " . TBL_UZIVATELE_ROLE . " ur
            INNER JOIN " . TBL_ROLE . " r ON ur.role_id = r.id
            WHERE ur.uzivatel_id = ?
        ");
        $stmt->execute(array($user_id));
        $roles_result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $user_roles = array();
        foreach ($roles_result as $row) {
            $user_roles[] = $row['kod_role'];
        }

        // 4. Kontrola přístupu k objednávce
        if (!can_access_order_comments($db, $user_id, $order_id, $user_roles)) {
            error_log("⛔ User ID $user_id nemá přístup k objednávce $order_id");
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Nemáte oprávnění komentovat tuto objednávku'
            ));
            return;
        }

        // 5. Sanitizace obsahu (XSS prevence)
        $obsah_safe = htmlspecialchars($obsah, ENT_QUOTES, 'UTF-8');
        $obsah_plain = strip_tags($obsah); // Plain text pro fulltext
        
        $dt_vytvoreni = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

        // 6. Vložit komentář do DB
        $stmt = $db->prepare("
            INSERT INTO 25a_objednavky_komentare 
                (objednavka_id, user_id, obsah, obsah_plain, dt_vytvoreni, smazano)
            VALUES 
                (?, ?, ?, ?, ?, 0)
        ");
        $stmt->execute(array($order_id, $user_id, $obsah_safe, $obsah_plain, $dt_vytvoreni));
        
        $comment_id = $db->lastInsertId();
        
        error_log("✅ Komentář ID $comment_id přidán k objednávce $order_id");

        // 7. Načíst zpět vložený komentář
        $stmt = $db->prepare("
            SELECT 
                k.id,
                k.objednavka_id,
                k.user_id,
                k.obsah,
                k.dt_vytvoreni,
                CONCAT(u.jmeno, ' ', u.prijmeni) as autor_jmeno,
                u.username as autor_username
            FROM 25a_objednavky_komentare k
            INNER JOIN " . TBL_UZIVATELE . " u ON k.user_id = u.id
            WHERE k.id = ?
        ");
        $stmt->execute(array($comment_id));
        $comment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($comment) {
            $comment['muze_smazat'] = true; // Vlastní komentář
        }

        // 8. Celkový počet komentářů
        $stmt = $db->prepare("
            SELECT COUNT(*) as total
            FROM 25a_objednavky_komentare
            WHERE objednavka_id = ?
              AND smazano = 0
        ");
        $stmt->execute(array($order_id));
        $total_row = $stmt->fetch(PDO::FETCH_ASSOC);
        $total = $total_row ? (int)$total_row['total'] : 0;

        // 9. TODO: Vytvořit notifikaci pro účastníky (implementováno v kroku 6)
        // create_order_comment_notification($db, $order_id, $user_id, $comment_id);

        // 10. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $comment,
            'message' => 'Komentář přidán',
            'comments_count' => $total // Pro update badge
        ));

    } catch (PDOException $e) {
        error_log("❌ SQL ERROR v handle_order_v3_comments_add: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při přidávání komentáře'
        ));
    } catch (Exception $e) {
        error_log("❌ ERROR v handle_order_v3_comments_add: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při zpracování: ' . $e->getMessage()
        ));
    }
}

/**
 * POST - Smazání vlastního komentáře (soft delete)
 * Endpoint: orders-v3/comments/delete
 * POST: {token, username, comment_id}
 * 
 * @param array $input POST data
 * @param array $config Konfigurace
 * @return void Vrací JSON response
 */
function handle_order_v3_comments_delete($input, $config) {
    error_log("╔═══════════════════════════════════════════════════════════");
    error_log("║ 🗑️ ORDER V3 - SMAZÁNÍ KOMENTÁŘE");
    error_log("║ Čas: " . date('Y-m-d H:i:s'));
    error_log("║ Uživatel: " . (isset($input['username']) ? $input['username'] : 'N/A'));
    error_log("║ Comment ID: " . (isset($input['comment_id']) ? $input['comment_id'] : 'N/A'));
    error_log("║ Endpoint: orders-v3/comments/delete");
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
    $comment_id = isset($input['comment_id']) ? (int)$input['comment_id'] : 0;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }
    
    if ($comment_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné comment_id'));
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
        
        $user_id = (int)$token_data['id'];

        // 4. Zkontrolovat, zda komentář existuje a patří uživateli
        $stmt = $db->prepare("
            SELECT 
                id,
                objednavka_id,
                user_id,
                smazano
            FROM 25a_objednavky_komentare
            WHERE id = ?
        ");
        $stmt->execute(array($comment_id));
        $comment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$comment) {
            error_log("❌ Komentář ID $comment_id neexistuje");
            http_response_code(404);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Komentář nenalezen'
            ));
            return;
        }
        
        if ($comment['smazano'] == 1) {
            error_log("⚠️ Komentář ID $comment_id je již smazaný");
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Komentář je již smazán'
            ));
            return;
        }
        
        // Pouze vlastník může smazat (nebo admin)
        $stmt = $db->prepare("
            SELECT r.kod_role
            FROM " . TBL_UZIVATELE_ROLE . " ur
            INNER JOIN " . TBL_ROLE . " r ON ur.role_id = r.id
            WHERE ur.uzivatel_id = ?
              AND r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
        ");
        $stmt->execute(array($user_id));
        $is_admin = ($stmt->rowCount() > 0);
        
        if ($comment['user_id'] != $user_id && !$is_admin) {
            error_log("⛔ User ID $user_id nemá právo smazat komentář $comment_id (vlastník: {$comment['user_id']})");
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Můžete mazat pouze vlastní komentáře'
            ));
            return;
        }

        // 5. Soft delete - nastavit flag smazano
        $dt_smazani = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
        
        $stmt = $db->prepare("
            UPDATE 25a_objednavky_komentare
            SET smazano = 1,
                dt_smazani = ?
            WHERE id = ?
        ");
        $stmt->execute(array($dt_smazani, $comment_id));
        
        error_log("✅ Komentář ID $comment_id smazán (soft delete)");

        // 6. Aktualizovaný počet komentářů
        $order_id = $comment['objednavka_id'];
        $stmt = $db->prepare("
            SELECT COUNT(*) as total
            FROM 25a_objednavky_komentare
            WHERE objednavka_id = ?
              AND smazano = 0
        ");
        $stmt->execute(array($order_id));
        $total_row = $stmt->fetch(PDO::FETCH_ASSOC);
        $total = $total_row ? (int)$total_row['total'] : 0;

        // 7. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'comment_id' => $comment_id,
                'order_id' => $order_id
            ),
            'message' => 'Komentář smazán',
            'comments_count' => $total // Pro update badge
        ));

    } catch (PDOException $e) {
        error_log("❌ SQL ERROR v handle_order_v3_comments_delete: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při mazání komentáře'
        ));
    } catch (Exception $e) {
        error_log("❌ ERROR v handle_order_v3_comments_delete: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při zpracování: ' . $e->getMessage()
        ));
    }
}
