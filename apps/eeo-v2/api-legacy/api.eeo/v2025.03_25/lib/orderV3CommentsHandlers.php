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
 * - POST orders-v3/comments/update    → Aktualizuje vlastní komentář
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
 * Kontrola, zda má uživatel přístup k objednávce a jejím komentářům
 * 
 * ✅ PRAVIDLA PŘÍSTUPU:
 * 1. ADMINI (isAdmin) - má přístup ke VŠEM objednávkám a komentářům
 * 2. Pokud uživatel VIDÍ objednávku (dle Orders V3 logiky) - má přístup k jejím komentářům
 *    - To zahrnuje: vlastní objednávky, podřízené (příkazce), účastníky (12 rolí)
 * 
 * @param PDO $db DB připojení
 * @param int $user_id ID uživatele
 * @param int $order_id ID objednávky
 * @param array $user_roles Role uživatele
 * @param bool $is_admin Je uživatel admin (isAdmin flag)
 * @return bool True pokud má přístup
 */
function can_access_order_comments($db, $user_id, $order_id, $user_roles = array(), $is_admin = false) {
    // 1. ADMINI má přístup ke VŠEM objednávkám (isAdmin flag)
    if ($is_admin) {
        error_log("✅ User ID $user_id má přístup - isAdmin");
        return true;
    }
    
    // 2. SUPERADMIN a ADMINISTRATOR mají přístup ke VŠEM objednávkám
    if (in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles)) {
        error_log("✅ User ID $user_id má přístup - SUPERADMIN/ADMINISTRATOR role");
        return true;
    }
    
    // 3. Zkontrolovat, zda uživatel VIDÍ objednávku podle Orders V3 logiky:
    //    a) Je účastníkem objednávky (12 rolí)
    //    b) Je příkazce nadřízený autorovi objednávky (hierarchie)
    
    // 3a) Přímý účastník objednávky (12 rolí)
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
    
    $params = array($order_id);
    for ($i = 0; $i < 12; $i++) {
        $params[] = $user_id;
    }
    
    $stmt->execute($params);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result && $result['is_participant'] > 0) {
        error_log("✅ User ID $user_id má přístup - účastník objednávky");
        return true;
    }
    
    // 3b) Příkazce vidí objednávky svých podřízených (hierarchie)
    // Získat autora objednávky
    $stmt = $db->prepare("
        SELECT uzivatel_id 
        FROM " . TBL_OBJEDNAVKY . " 
        WHERE id = ?
    ");
    $stmt->execute(array($order_id));
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($order) {
        $order_author_id = (int)$order['uzivatel_id'];
        
        // Zkontrolovat, zda je current user příkazce autora objednávky
        $stmt = $db->prepare("
            SELECT prikazce_id 
            FROM " . TBL_UZIVATELE . " 
            WHERE id = ?
        ");
        $stmt->execute(array($order_author_id));
        $author = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($author && (int)$author['prikazce_id'] === $user_id) {
            error_log("✅ User ID $user_id má přístup - příkazce autora objednávky");
            return true;
        }
    }
    
    error_log("⛔ User ID $user_id NEMÁ přístup k objednávce $order_id");
    return false;
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
        
        // ✅ Kontrola admin práv podle rolí (ne podle DB sloupce)
        $is_admin = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);

        // 4. Kontrola přístupu k objednávce
        if (!can_access_order_comments($db, $user_id, $order_id, $user_roles, $is_admin)) {
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
        // ⚠️ LIMIT a OFFSET musí být INT, ne string z prepared statement
        $limit_int = (int)$limit;
        $offset_int = (int)$offset;
        
        $stmt = $db->prepare("
            SELECT 
                k.id,
                k.objednavka_id,
                -- ✅ OPRAVA: Pokud parent je smazaný, nastav NULL (osiřelý komentář zobraz jako samostatný)
                CASE 
                    WHEN k.parent_comment_id IS NOT NULL 
                         AND EXISTS (SELECT 1 FROM 25a_objednavky_komentare p 
                                    WHERE p.id = k.parent_comment_id AND p.smazano = 0)
                    THEN k.parent_comment_id
                    ELSE NULL
                END as parent_comment_id,
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
            LIMIT $limit_int OFFSET $offset_int
        ");
        $stmt->execute(array($order_id));
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 6. Přidat flag "muze_smazat" (vlastní komentáře)
        // ✅ OPTIMALIZACE: Počet odpovědí získáme jedním dotazem pro všechny komentáře
        $comment_ids = array_column($comments, 'id');
        $replies_counts = array();
        
        if (!empty($comment_ids)) {
            $placeholders = implode(',', array_fill(0, count($comment_ids), '?'));
            $stmt_replies = $db->prepare("
                SELECT parent_comment_id, COUNT(*) as count
                FROM 25a_objednavky_komentare
                WHERE parent_comment_id IN ($placeholders)
                  AND smazano = 0
                GROUP BY parent_comment_id
            ");
            $stmt_replies->execute($comment_ids);
            $replies_result = $stmt_replies->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($replies_result as $row) {
                $replies_counts[$row['parent_comment_id']] = (int)$row['count'];
            }
        }
        
        foreach ($comments as &$comment) {
            $comment['muze_smazat'] = ($comment['user_id'] == $user_id);
            $comment['replies_count'] = isset($replies_counts[$comment['id']]) ? $replies_counts[$comment['id']] : 0;
            
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
        
        // 8. Najít poslední komentář (pro bubble tooltip)
        $last_comment = null;
        if (!empty($comments)) {
            $last_comment = end($comments); // Poslední v chronologickém pořadí
        }

        // 9. Úspěšná odpověď
        $response_data = array(
            'status' => 'success',
            'data' => $comments,
            'message' => 'Komentáře načteny',
            'count' => count($comments),
            'total' => $total,
            'comments_count' => $total, // Pro badge v UI
            'last_comment_author' => $last_comment ? $last_comment['autor_jmeno'] : null,
            'last_comment_date' => $last_comment ? $last_comment['dt_vytvoreni'] : null
        );
        
        // 🔍 DEBUG: Log response structure
        error_log("🔍 Response structure: " . json_encode(array_keys($response_data)));
        error_log("🔍 Comments count in data: " . count($comments));
        
        http_response_code(200);
        echo json_encode($response_data);

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
    $parent_comment_id = isset($input['parent_comment_id']) ? (int)$input['parent_comment_id'] : null;
    
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
        
        // Získat role uživatele a isAdmin flag
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
        
        // ✅ Kontrola admin práv podle rolí (ne podle DB sloupce)
        $is_admin = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);

        // 4. Kontrola přístupu k objednávce
        if (!can_access_order_comments($db, $user_id, $order_id, $user_roles, $is_admin)) {
            error_log("⛔ User ID $user_id nemá přístup k objednávce $order_id");
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Nemáte oprávnění komentovat tuto objednávku'
            ));
            return;
        }
        
        // ✅ Pokud je zadán parent_comment_id, ověřit, že existuje a patří ke stejné objednávce
        if ($parent_comment_id !== null && $parent_comment_id > 0) {
            $stmt = $db->prepare("
                SELECT objednavka_id 
                FROM 25a_objednavky_komentare 
                WHERE id = ? AND smazano = 0
            ");
            $stmt->execute(array($parent_comment_id));
            $parent = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$parent) {
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error',
                    'message' => 'Nadřazený komentář nebyl nalezen'
                ));
                return;
            }
            
            if ((int)$parent['objednavka_id'] !== $order_id) {
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error',
                    'message' => 'Nadřazený komentář patří k jiné objednávce'
                ));
                return;
            }
        }

        // 5. Sanitizace obsahu (XSS prevence)
        $obsah_safe = htmlspecialchars($obsah, ENT_QUOTES, 'UTF-8');
        $obsah_plain = strip_tags($obsah); // Plain text pro fulltext
        
        $dt_vytvoreni = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

        // 6. Vložit komentář do DB
        $stmt = $db->prepare("
            INSERT INTO 25a_objednavky_komentare 
                (objednavka_id, parent_comment_id, user_id, obsah, obsah_plain, dt_vytvoreni, smazano)
            VALUES 
                (?, ?, ?, ?, ?, ?, 0)
        ");
        $stmt->execute(array($order_id, $parent_comment_id, $user_id, $obsah_safe, $obsah_plain, $dt_vytvoreni));
        
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

        // 9. Vytvořit notifikace pro všechny účastníky objednávky
        try {
            create_order_comment_notifications($db, $order_id, $user_id, $comment_id, $comment);
        } catch (Exception $notif_error) {
            // Logujeme chybu, ale nezastavujeme zpracování
            error_log("⚠️ Chyba při vytváření notifikací pro komentář $comment_id: " . $notif_error->getMessage());
        }

        // 10. 🔔 NOVÉ: Pokud je to odpověď na komentář, pošli speciální notifikaci autorovi původního komentáře
        if ($parent_comment_id) {
            try {
                create_comment_reply_notification($db, $order_id, $parent_comment_id, $user_id, $comment_id, $comment);
            } catch (Exception $reply_notif_error) {
                error_log("⚠️ Chyba při vytváření notifikace pro odpověď na komentář $parent_comment_id: " . $reply_notif_error->getMessage());
            }
        }

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
 * POST - Aktualizace vlastního komentáře
 * Endpoint: orders-v3/comments/update
 * POST: {token, username, comment_id, obsah}
 * 
 * @param array $input POST data
 * @param array $config Konfigurace
 * @return void Vrací JSON response
 */
function handle_order_v3_comments_update($input, $config) {
    error_log("╔═══════════════════════════════════════════════════════════");
    error_log("║ ✏️ ORDER V3 - AKTUALIZACE KOMENTÁŘE");
    error_log("║ Čas: " . date('Y-m-d H:i:s'));
    error_log("║ Uživatel: " . (isset($input['username']) ? $input['username'] : 'N/A'));
    error_log("║ Comment ID: " . (isset($input['comment_id']) ? $input['comment_id'] : 'N/A'));
    error_log("║ Endpoint: orders-v3/comments/update");
    error_log("╚═══════════════════════════════════════════════════════════");
    
    // 1. Validace HTTP metody - POUZE POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // 2. Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $comment_id = isset($input['comment_id']) ? (int)$input['comment_id'] : 0;
    $obsah = isset($input['obsah']) ? trim($input['obsah']) : '';
    
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
    
    if (empty($obsah)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Obsah komentáře nesmí být prázdný'));
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
                smazano,
                obsah as original_obsah
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
            error_log("⚠️ Komentář ID $comment_id je smazaný - nelze editovat");
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Smazaný komentář nelze editovat'
            ));
            return;
        }
        
        // 5. Ověřit, že komentář patří uživateli
        if ((int)$comment['user_id'] !== $user_id) {
            error_log("❌ User ID $user_id se pokouší editovat cizí komentář (vlastník: " . $comment['user_id'] . ")");
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Nemáte oprávnění editovat tento komentář'
            ));
            return;
        }

        // 6. Aktualizovat komentář
        $dt_aktualizace = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
        
        $updateStmt = $db->prepare("
            UPDATE 25a_objednavky_komentare
            SET obsah = ?,
                dt_aktualizace = ?
            WHERE id = ?
        ");
        
        $success = $updateStmt->execute(array(
            $obsah,
            $dt_aktualizace,
            $comment_id
        ));
        
        if (!$success) {
            throw new Exception('Chyba při aktualizaci komentáře');
        }
        
        error_log("✅ Komentář ID $comment_id úspěšně aktualizován");
        error_log("   Původní text: " . substr($comment['original_obsah'], 0, 50) . "...");
        error_log("   Nový text: " . substr($obsah, 0, 50) . "...");
        
        // 7. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'message' => 'Komentář byl úspěšně aktualizován',
            'data' => array(
                'comment_id' => $comment_id,
                'dt_aktualizace' => $dt_aktualizace
            )
        ));

    } catch (Exception $e) {
        error_log("❌ Chyba při aktualizaci komentáře: " . $e->getMessage());
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
        
        // Pouze vlastník může smazat (nebo SUPERADMIN/ADMINISTRATOR)
        // Získat role uživatele
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

/**
 * Vytvoří notifikace pro všechny účastníky objednávky při přidání komentáře
 * 
 * Posílá notifikace všem 12 rolím účastníků objednávky (kromě autora komentáře):
 * - uzivatel_id, objednatel_id, garant_uzivatel_id, schvalovatel_id
 * - prikazce_id, uzivatel_akt_id, odesilatel_id, dodavatel_potvrdil_id
 * - zverejnil_id, fakturant_id, dokoncil_id, potvrdil_vecnou_spravnost_id
 * 
 * TODO: Budoucí rozšíření - org hierarchie (node/edge)
 * - Implementovat filtrování příjemců podle organizační hierarchie
 * - Vytvořit prop/node/edge strukturu pro hierarchii
 * - Rozšířit logiku pro parent/child vztahy v org struktuře
 * - Umožnit nastavení "notifikovat nadřízené" / "notifikovat tým" apod.
 * 
 * @param PDO $db Database connection
 * @param int $order_id ID objednávky
 * @param int $author_user_id ID autora komentáře (nebude notifikován)
 * @param int $comment_id ID komentáře
 * @param array $comment Data komentáře (pro text notifikace)
 * @return void
 */
function create_order_comment_notifications($db, $order_id, $author_user_id, $comment_id, $comment) {
    error_log("📧 Vytvářím notifikace pro komentář $comment_id k objednávce $order_id");
    
    // 1. Načíst všechny účastníky objednávky (12 rolí)
    $stmt = $db->prepare("
        SELECT 
            uzivatel_id,
            objednatel_id,
            garant_uzivatel_id,
            schvalovatel_id,
            prikazce_id,
            uzivatel_akt_id,
            odesilatel_id,
            dodavatel_potvrdil_id,
            zverejnil_id,
            fakturant_id,
            dokoncil_id,
            potvrdil_vecnou_spravnost_id,
            cislo_objednavky,
            predmet
        FROM " . TBL_OBJEDNAVKY . "
        WHERE id = ?
    ");
    $stmt->execute(array($order_id));
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        error_log("⚠️ Objednávka $order_id nenalezena - notifikace nebudou vytvořeny");
        return;
    }
    
    // 2. Sestavit seznam unikátních user_id účastníků (kromě autora)
    $participants = array();
    $role_fields = array(
        'uzivatel_id',
        'objednatel_id',
        'garant_uzivatel_id',
        'schvalovatel_id',
        'prikazce_id',
        'uzivatel_akt_id',
        'odesilatel_id',
        'dodavatel_potvrdil_id',
        'zverejnil_id',
        'fakturant_id',
        'dokoncil_id',
        'potvrdil_vecnou_spravnost_id'
    );
    
    foreach ($role_fields as $field) {
        $user_id = isset($order[$field]) ? (int)$order[$field] : 0;
        if ($user_id > 0 && $user_id != $author_user_id) {
            $participants[$user_id] = true; // Použití key jako ID zajistí unikátnost
        }
    }
    
    $participants_list = array_keys($participants);
    $participants_count = count($participants_list);
    
    error_log("👥 Nalezeno $participants_count unikátních účastníků pro notifikaci");
    
    if ($participants_count === 0) {
        error_log("ℹ️ Žádní účastníci k notifikaci (kromě autora)");
        return;
    }
    
    // 3. Připravit text notifikace
    $autor_jmeno = isset($comment['autor_jmeno']) ? $comment['autor_jmeno'] : 'Uživatel';
    $order_number = $order['cislo_objednavky'] ? $order['cislo_objednavky'] : "#" . $order_id;
    $predmet = $order['predmet'] ? mb_substr($order['predmet'], 0, 50) . '...' : '';
    
    $obsah_preview = isset($comment['obsah']) ? strip_tags($comment['obsah']) : '';
    if (strlen($obsah_preview) > 100) {
        $obsah_preview = mb_substr($obsah_preview, 0, 100) . '...';
    }
    
    $notif_title = "Nový komentář k objednávce $order_number";
    $notif_message = "$autor_jmeno přidal komentář: \"$obsah_preview\"";
    if ($predmet) {
        $notif_message .= " ($predmet)";
    }
    
    $dt_vytvoreni = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
    
    // 4. Vložit notifikace pro všechny účastníky (nový dvoustupňový systém)
    $created_count = 0;
    
    foreach ($participants_list as $user_id) {
        try {
            // A) Vytvoř notifikaci v hlavní tabulce (pouze in-app, bez emailu)
            $stmt = $db->prepare("
                INSERT INTO " . TBL_NOTIFIKACE . "
                    (typ, nadpis, zprava, od_uzivatele_id, pro_uzivatele_id, priorita, kategorie, 
                     objekt_typ, objekt_id, odeslat_email, email_odeslan, dt_created, aktivni)
                VALUES 
                    (?, ?, ?, ?, ?, 'normal', 'objednavky', 'objednavka', ?, 0, 0, ?, 1)
            ");
            $stmt->execute(array(
                'ORDER_COMMENT_ADDED',
                $notif_title,
                $notif_message,
                $author_user_id,
                $user_id,
                $order_id,
                $dt_vytvoreni
            ));
            
            $notifikace_id = $db->lastInsertId();
            
            // B) Vytvoř záznam pro čtení
            if ($notifikace_id) {
                $read_stmt = $db->prepare("
                    INSERT INTO " . TBL_NOTIFIKACE_PRECTENI . "
                        (notifikace_id, uzivatel_id, precteno, skryto, dt_created, smazano)
                    VALUES 
                        (?, ?, 0, 0, ?, 0)
                ");
                $read_stmt->execute(array($notifikace_id, $user_id, $dt_vytvoreni));
                $created_count++;
            }
            
        } catch (PDOException $e) {
            error_log("⚠️ Chyba při vytváření notifikace pro user_id $user_id: " . $e->getMessage());
        }
    }
    
    error_log("✅ Vytvořeno $created_count/$participants_count notifikací pro komentář $comment_id");
}

/**
 * Vytvoří speciální notifikaci pro autora původního komentáře, když mu někdo odpoví
 * 
 * @param PDO $db Database connection
 * @param int $order_id ID objednávky
 * @param int $parent_comment_id ID původního komentáře na který se odpovídá
 * @param int $reply_author_id ID autora odpovědi (nebude notifikován)
 * @param int $reply_comment_id ID nové odpovědi
 * @param array $reply_comment Data nové odpovědi
 * @return void
 */
function create_comment_reply_notification($db, $order_id, $parent_comment_id, $reply_author_id, $reply_comment_id, $reply_comment) {
    error_log("💬 Vytvářím notifikaci pro odpověď na komentář $parent_comment_id (reply ID: $reply_comment_id)");
    
    // 1. Najít autora původního komentáře
    $stmt = $db->prepare("
        SELECT 
            k.user_id as original_author_id,
            CONCAT(u.jmeno, ' ', u.prijmeni) as original_author_name,
            k.obsah as original_obsah
        FROM 25a_objednavky_komentare k
        INNER JOIN " . TBL_UZIVATELE . " u ON k.user_id = u.id
        WHERE k.id = ? AND k.smazano = 0
    ");
    $stmt->execute(array($parent_comment_id));
    $original_comment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$original_comment) {
        error_log("⚠️ Původní komentář $parent_comment_id nenalezen nebo je smazaný");
        return;
    }
    
    $original_author_id = (int)$original_comment['original_author_id'];
    
    // 2. Neodesílat notifikaci sobě samému (pokud autor odpovídá sám sobě)
    if ($original_author_id === $reply_author_id) {
        error_log("ℹ️ Autor odpovídá sám sobě - notifikace se neposílá");
        return;
    }
    
    // 3. Načíst info o objednávce
    $stmt = $db->prepare("
        SELECT cislo_objednavky, predmet, dt_vytvoreni
        FROM " . TBL_OBJEDNAVKY . "
        WHERE id = ?
    ");
    $stmt->execute(array($order_id));
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        error_log("⚠️ Objednávka $order_id nenalezena");
        return;
    }
    
    // 4. Připravit text notifikace
    $reply_author_name = isset($reply_comment['autor_jmeno']) ? $reply_comment['autor_jmeno'] : 'Uživatel';
    $order_number = $order['cislo_objednavky'] ? $order['cislo_objednavky'] : "#" . $order_id;
    $order_date = date('d.m.Y', strtotime($order['dt_vytvoreni']));
    
    $reply_preview = isset($reply_comment['obsah']) ? strip_tags($reply_comment['obsah']) : '';
    if (strlen($reply_preview) > 80) {
        $reply_preview = mb_substr($reply_preview, 0, 80) . '...';
    }
    
    $original_preview = strip_tags($original_comment['original_obsah']);
    if (strlen($original_preview) > 50) {
        $original_preview = mb_substr($original_preview, 0, 50) . '...';
    }
    
    $notif_title = "Odpověď na váš komentář k obj. $order_number";
    $notif_message = "$reply_author_name odpověděl na váš komentář \"$original_preview\" - z objednávky ze dne $order_date: \"$reply_preview\"";
    
    $dt_vytvoreni = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
    
    // 5. Vložit notifikaci pouze pro autora původního komentáře (nový dvoustupňový systém)
    try {
        // A) Vytvoř notifikaci v hlavní tabulce (pouze in-app, bez emailu)
        $stmt = $db->prepare("
            INSERT INTO " . TBL_NOTIFIKACE . "
                (typ, nadpis, zprava, od_uzivatele_id, pro_uzivatele_id, priorita, kategorie,
                 objekt_typ, objekt_id, odeslat_email, email_odeslan, dt_created, aktivni)
            VALUES 
                (?, ?, ?, ?, ?, 'normal', 'komentare', 'objednavka', ?, 0, 0, ?, 1)
        ");
        $stmt->execute(array(
            'COMMENT_REPLY',
            $notif_title,
            $notif_message,
            $reply_author_id,
            $original_author_id,
            $order_id,
            $dt_vytvoreni
        ));
        
        $notifikace_id = $db->lastInsertId();
        
        // B) Vytvoř záznam pro čtení
        if ($notifikace_id) {
            $read_stmt = $db->prepare("
                INSERT INTO " . TBL_NOTIFIKACE_PRECTENI . "
                    (notifikace_id, uzivatel_id, precteno, skryto, dt_created, smazano)
                VALUES 
                    (?, ?, 0, 0, ?, 0)
            ");
            $read_stmt->execute(array($notifikace_id, $original_author_id, $dt_vytvoreni));
            
            error_log("✅ Notifikace pro odpověď odeslána uživateli $original_author_id (autor původního komentáře $parent_comment_id)");
        }
        
    } catch (PDOException $e) {
        error_log("❌ Chyba při vytváření notifikace pro odpověď: " . $e->getMessage());
    }
}
