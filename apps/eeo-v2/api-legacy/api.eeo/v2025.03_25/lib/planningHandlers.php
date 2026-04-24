<?php

/**
 * Planning Module API Handlers
 * 
 * Funkce pro správu modulu plánování - zprávy pro dashboard a události v kalendáři
 * Podporuje org. hierarchii pro targeting příjemců
 * 
 * VŠECHNY ENDPOINTY používají POST s username + token autentizací
 * 
 * @author GitHub Copilot
 * @date 2026-04-24
 */

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

// Include TimezoneHelper for consistent datetime handling
require_once __DIR__ . '/TimezoneHelper.php';

// Include notification helpers (pro vytváření notifikací)
require_once __DIR__ . '/notificationHelpers.php';

// Include hierarchy triggers (pro org hierarchii)
require_once __DIR__ . '/hierarchyTriggers.php';

// Include queries.php for table constants
require_once __DIR__ . '/queries.php';

// ==========================================
// HELPER FUNKCE
// ==========================================

/**
 * Získá explicitní příjemce zprávy nebo události z databáze
 * @param PDO $db
 * @param int $record_id
 * @param string $typ 'zprava' nebo 'udalost'
 * @return array Seznam příjemců [['user_id' => ..., 'email' => ...], ...]
 */
function getPlanningRecipients($db, $record_id, $typ) {
    if ($typ === 'zprava') {
        $tbl_prijemci = TBL_PLAN_ZPRAVY_PRIJEMCI;
        $id_field = 'zprava_id';
    } else {
        $tbl_prijemci = TBL_PLAN_UDALOSTI_PRIJEMCI;
        $id_field = 'udalost_id';
    }
    
    $recipients = [];
    
    // Načíst explicitní příjemce z tabulky
    $sql = "SELECT typ_prijemce, kod_role, user_id 
            FROM `$tbl_prijemci` 
            WHERE $id_field = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute([$record_id]);
    $prijemci_rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($prijemci_rows as $row) {
        if ($row['typ_prijemce'] === 'role' && $row['kod_role']) {
            // Získat všechny uživatele s touto rolí
            $sql_role = "SELECT DISTINCT u.id, u.email 
                        FROM " . TBL_UZIVATELE . " u
                        JOIN " . TBL_UZIVATELE_ROLE . " ur ON ur.user_id = u.id
                        JOIN " . TBL_ROLE . " r ON r.id = ur.role_id
                        WHERE r.kod_role = ? AND u.aktivni = 1";
            $stmt_role = $db->prepare($sql_role);
            $stmt_role->execute([$row['kod_role']]);
            $users = $stmt_role->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($users as $user) {
                $recipients[] = [
                    'user_id' => $user['id'],
                    'email' => $user['email'],
                    'priority' => 'normal',
                    'delivery' => ['email' => true, 'inApp' => true]
                ];
            }
        } else if ($row['typ_prijemce'] === 'user' && $row['user_id']) {
            // Získat konkrétního uživatele
            $sql_user = "SELECT id, email FROM " . TBL_UZIVATELE . " WHERE id = ? AND u.aktivni = 1";
            $stmt_user = $db->prepare($sql_user);
            $stmt_user->execute([$row['user_id']]);
            $user = $stmt_user->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                $recipients[] = [
                    'user_id' => $user['id'],
                    'email' => $user['email'],
                    'priority' => 'normal',
                    'delivery' => ['email' => true, 'inApp' => true]
                ];
            }
        }
    }
    
    // Deduplikace podle user_id
    $unique_recipients = [];
    foreach ($recipients as $r) {
        $unique_recipients[$r['user_id']] = $r;
    }
    
    return array_values($unique_recipients);
}

/**
 * Merge explicitních a hierarchických příjemců
 * Pokud $hierarchy je prázdný → vrátí pouze $explicit (fallback)
 * 
 * @param array $explicit Explicitní příjemci
 * @param array $hierarchy Příjemci z hierarchie
 * @return array Merged příjemci s deduplikací a prioritou
 */
function mergeRecipients($explicit, $hierarchy) {
    $byUserId = [];
    
    // Přidat explicitní příjemce
    foreach ($explicit as $r) {
        $byUserId[$r['user_id']] = [
            'user_id' => $r['user_id'],
            'email' => $r['email'],
            'priority' => 'normal',
            'delivery' => ['email' => true, 'inApp' => true]
        ];
    }
    
    // Merge s hierarchií (zachovat nejvyšší prioritu)
    // ✅ Pokud $hierarchy je prázdný → tento foreach neproběhne → fallback na explicitní
    foreach ($hierarchy as $r) {
        if (!isset($byUserId[$r['user_id']])) {
            $byUserId[$r['user_id']] = $r;
        } else {
            // Upgrade priority: URGENT > WARNING > INFO > normal
            $priorities = ['urgent' => 4, 'warning' => 3, 'info' => 2, 'normal' => 1];
            $currentPrio = $byUserId[$r['user_id']]['priority'] ?? 'normal';
            $newPrio = $r['priority'] ?? 'normal';
            
            if ($priorities[$newPrio] > $priorities[$currentPrio]) {
                $byUserId[$r['user_id']]['priority'] = $newPrio;
            }
            
            // OR logika pro delivery
            if (isset($r['delivery'])) {
                $byUserId[$r['user_id']]['delivery']['email'] = 
                    $byUserId[$r['user_id']]['delivery']['email'] || $r['delivery']['email'];
                $byUserId[$r['user_id']]['delivery']['inApp'] = 
                    $byUserId[$r['user_id']]['delivery']['inApp'] || $r['delivery']['inApp'];
            }
        }
    }
    
    return array_values($byUserId);
}

/**
 * Vytvoří notifikace pro všechny příjemce zprávy/události
 * 
 * @param PDO $db
 * @param array $record Záznam zprávy nebo události
 * @param string $typ 'zprava' nebo 'udalost'
 * @param string $event_type Typ eventu pro notifikaci
 */
function createPlanningNotifications($db, $record, $typ, $event_type) {
    // 1. Získat EXPLICITNÍ příjemce (role + konkrétní uživatelé z tabulky)
    $explicitRecipients = getPlanningRecipients($db, $record['id'], $typ);
    
    // 2. POKUD je pouzit_hierarchii = 1 → získat příjemce i z hierarchie
    $hierarchyRecipients = [];
    if (isset($record['pouzit_hierarchii']) && $record['pouzit_hierarchii'] == 1) {
        $hierarchyResult = resolveHierarchyNotificationRecipients(
            $db,
            $event_type,
            [
                'record_id' => $record['id'],
                'nazev' => $record['nazev'],
                'autor_id' => $record['autor_id']
            ],
            $record['hierarchy_profile_id'] ?? null
        );
        
        // ✅ FALLBACK: Pokud hierarchie nevrátí žádné příjemce → použít jen explicitní
        if ($hierarchyResult && isset($hierarchyResult['recipients']) && !empty($hierarchyResult['recipients'])) {
            $hierarchyRecipients = $hierarchyResult['recipients'];
        }
        // else: hierarchyRecipients zůstane prázdný array
        //       → mergeRecipients vrátí pouze explicitRecipients
    }
    
    // 3. MERGE příjemců (deduplikace, nejvyšší priorita)
    // Pokud hierarchyRecipients je prázdný → vrátí se jen explicitRecipients
    $allRecipients = mergeRecipients($explicitRecipients, $hierarchyRecipients);
    
    // 4. Vytvořit notifikaci pro každého příjemce
    foreach ($allRecipients as $recipient) {
        createNotification($db, [
            ':typ' => $event_type,
            ':nadpis' => $record['nazev'],
            ':zprava' => $typ === 'zprava' ? ($record['obsah'] ?? '') : ($record['popis'] ?? ''),
            ':data_json' => json_encode([
                'record_id' => $record['id'],
                'typ' => $typ
            ]),
            ':od_uzivatele_id' => $record['autor_id'],
            ':pro_uzivatele_id' => $recipient['user_id'],
            ':prijemci_json' => null,
            ':pro_vsechny' => 0,
            ':priorita' => $recipient['priority'] ?? 'normal',
            ':kategorie' => 'planning_' . $typ,  // planning_zprava nebo planning_udalost
            ':odeslat_email' => $recipient['delivery']['email'] ?? 1,
            ':objekt_typ' => 'planning_' . ($typ === 'zprava' ? 'message' : 'event'),
            ':objekt_id' => $record['id'],
            ':dt_expires' => $typ === 'zprava' ? ($record['dt_do'] ?? null) : ($record['dt_od'] ?? null),
            ':dt_created' => TimezoneHelper::getCzechDateTime(),
            ':aktivni' => 1
        ]);
    }
}

// ==========================================
// MESSAGES ENDPOINTS
// ==========================================

/**
 * GET seznam zpráv
 * POST planning/messages/list
 * Body: {token, username}
 */
function handle_planning_messages_list($input, $config) {
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

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $sql = "SELECT z.*, 
                       u.jmeno as autor_jmeno, u.prijmeni as autor_prijmeni,
                       hp.nazev as hierarchy_profile_nazev,
                       COUNT(DISTINCT zp.id) as pocet_prijemcu,
                       COUNT(DISTINCT zo.id) as pocet_odpovedi
                FROM " . TBL_PLAN_ZPRAVY . " z
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = z.autor_id
                LEFT JOIN " . TBL_HIERARCHIE_PROFILY . " hp ON hp.id = z.hierarchy_profile_id
                LEFT JOIN " . TBL_PLAN_ZPRAVY_PRIJEMCI . " zp ON zp.zprava_id = z.id
                LEFT JOIN " . TBL_PLAN_ZPRAVY_ODPOVEDI . " zo ON zo.zprava_id = z.id
                WHERE z.aktivni = 1
                GROUP BY z.id
                ORDER BY z.dt_created DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute();
        $zpravy = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $zpravy,
            'count' => count($zpravy)
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání zpráv: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in messages/list: " . $e->getMessage());
    }
}

/**
 * GET detail zprávy
 * POST planning/messages/get
 * Body: {token, username, id}
 */
function handle_planning_messages_get($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $id = $input['id'] ?? null;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID zprávy']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $sql = "SELECT z.*, 
                       u.jmeno as autor_jmeno, u.prijmeni as autor_prijmeni,
                       hp.nazev as hierarchy_profile_nazev
                FROM " . TBL_PLAN_ZPRAVY . " z
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = z.autor_id
                LEFT JOIN " . TBL_HIERARCHIE_PROFILY . " hp ON hp.id = z.hierarchy_profile_id
                WHERE z.id = ? AND z.aktivni = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute([$id]);
        $zprava = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$zprava) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Zpráva nenalezena']);
            return;
        }

        // Načíst příjemce
        $sql_prijemci = "SELECT * FROM " . TBL_PLAN_ZPRAVY_PRIJEMCI . " WHERE zprava_id = ?";
        $stmt_prijemci = $db->prepare($sql_prijemci);
        $stmt_prijemci->execute([$id]);
        $zprava['prijemci'] = $stmt_prijemci->fetchAll(PDO::FETCH_ASSOC);

        // Načíst odpovědi
        $sql_odpovedi = "SELECT o.*, u.jmeno, u.prijmeni 
                         FROM " . TBL_PLAN_ZPRAVY_ODPOVEDI . " o
                         LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = o.user_id
                         WHERE o.zprava_id = ?
                         ORDER BY o.dt_created ASC";
        $stmt_odpovedi = $db->prepare($sql_odpovedi);
        $stmt_odpovedi->execute([$id]);
        $zprava['odpovedi'] = $stmt_odpovedi->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $zprava
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání zprávy: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in messages/get: " . $e->getMessage());
    }
}

/**
 * CREATE nová zpráva
 * POST planning/messages/create
 * Body: {token, username, nazev, obsah, dt_od, dt_do, pouzit_hierarchii, hierarchy_profile_id, prijemci: [{typ_prijemce, kod_role?, user_id?}]}
 */
function handle_planning_messages_create($input, $config) {
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

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    $nazev = $input['nazev'] ?? '';
    $obsah = $input['obsah'] ?? '';
    
    if (!$nazev || !$obsah) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí název nebo obsah']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);
        $dt_created = TimezoneHelper::getCzechDateTime();

        // INSERT zprávy
        $sql = "INSERT INTO " . TBL_PLAN_ZPRAVY . " 
                (nazev, obsah, dt_od, dt_do, pouzit_hierarchii, hierarchy_profile_id, autor_id, dt_created, aktivni)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $nazev,
            $obsah,
            $input['dt_od'] ?? null,
            $input['dt_do'] ?? null,
            $input['pouzit_hierarchii'] ?? 0,
            $input['hierarchy_profile_id'] ?? null,
            $token_data['user_id'],
            $dt_created
        ]);

        $zprava_id = $db->lastInsertId();

        // INSERT příjemců
        if (isset($input['prijemci']) && is_array($input['prijemci'])) {
            $sql_prijemce = "INSERT INTO " . TBL_PLAN_ZPRAVY_PRIJEMCI . " 
                            (zprava_id, typ_prijemce, kod_role, user_id, dt_created)
                            VALUES (?, ?, ?, ?, ?)";
            $stmt_prijemce = $db->prepare($sql_prijemce);
            
            foreach ($input['prijemci'] as $prijemce) {
                $stmt_prijemce->execute([
                    $zprava_id,
                    $prijemce['typ_prijemce'] ?? 'user',
                    $prijemce['kod_role'] ?? null,
                    $prijemce['user_id'] ?? null,
                    $dt_created
                ]);
            }
        }

        // Vytvořit notifikace pro příjemce
        $zprava = [
            'id' => $zprava_id,
            'nazev' => $nazev,
            'obsah' => $obsah,
            'autor_id' => $token_data['user_id'],
            'pouzit_hierarchii' => $input['pouzit_hierarchii'] ?? 0,
            'hierarchy_profile_id' => $input['hierarchy_profile_id'] ?? null,
            'dt_do' => $input['dt_do'] ?? null
        ];
        createPlanningNotifications($db, $zprava, 'zprava', 'PLANNING_MESSAGE_CREATED');

        http_response_code(201);
        echo json_encode([
            'status' => 'success',
            'message' => 'Zpráva vytvořena',
            'data' => ['id' => $zprava_id]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při vytváření zprávy: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in messages/create: " . $e->getMessage());
    }
}

/**
 * UPDATE zpráva
 * POST planning/messages/update
 * Body: {token, username, id, nazev, obsah, dt_od, dt_do, pouzit_hierarchii, hierarchy_profile_id}
 */
function handle_planning_messages_update($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $id = $input['id'] ?? null;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID zprávy']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $sql = "UPDATE " . TBL_PLAN_ZPRAVY . " 
                SET nazev = ?, obsah = ?, dt_od = ?, dt_do = ?, 
                    pouzit_hierarchii = ?, hierarchy_profile_id = ?
                WHERE id = ? AND aktivni = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $input['nazev'] ?? '',
            $input['obsah'] ?? '',
            $input['dt_od'] ?? null,
            $input['dt_do'] ?? null,
            $input['pouzit_hierarchii'] ?? 0,
            $input['hierarchy_profile_id'] ?? null,
            $id
        ]);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Zpráva aktualizována'
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při aktualizaci zprávy: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in messages/update: " . $e->getMessage());
    }
}

/**
 * DELETE zpráva (soft delete)
 * POST planning/messages/delete
 * Body: {token, username, id}
 */
function handle_planning_messages_delete($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $id = $input['id'] ?? null;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID zprávy']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $sql = "UPDATE " . TBL_PLAN_ZPRAVY . " SET aktivni = 0 WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$id]);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Zpráva smazána'
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při mazání zprávy: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in messages/delete: " . $e->getMessage());
    }
}

// ==========================================
// EVENTS ENDPOINTS (obdobné jako messages)
// ==========================================

/**
 * GET seznam událostí
 * POST planning/events/list
 * Body: {token, username}
 */
function handle_planning_events_list($input, $config) {
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

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $sql = "SELECT u.*, 
                       us.jmeno as autor_jmeno, us.prijmeni as autor_prijmeni,
                       hp.nazev as hierarchy_profile_nazev,
                       COUNT(DISTINCT up.id) as pocet_prijemcu,
                       COUNT(DISTINCT uo.id) as pocet_odpovedi
                FROM " . TBL_PLAN_UDALOSTI . " u
                LEFT JOIN " . TBL_UZIVATELE . " us ON us.id = u.autor_id
                LEFT JOIN " . TBL_HIERARCHIE_PROFILY . " hp ON hp.id = u.hierarchy_profile_id
                LEFT JOIN " . TBL_PLAN_UDALOSTI_PRIJEMCI . " up ON up.udalost_id = u.id
                LEFT JOIN " . TBL_PLAN_UDALOSTI_ODPOVEDI . " uo ON uo.udalost_id = u.id
                WHERE u.aktivni = 1
                GROUP BY u.id
                ORDER BY u.dt_od DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute();
        $udalosti = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $udalosti,
            'count' => count($udalosti)
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání událostí: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/list: " . $e->getMessage());
    }
}

/**
 * CREATE nová událost
 * POST planning/events/create
 * Body: {token, username, nazev, popis, dt_od, dt_do, pouzit_hierarchii, hierarchy_profile_id, prijemci}
 */
function handle_planning_events_create($input, $config) {
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

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    $nazev = $input['nazev'] ?? '';
    
    if (!$nazev) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí název události']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);
        $dt_created = TimezoneHelper::getCzechDateTime();

        // INSERT události
        $sql = "INSERT INTO " . TBL_PLAN_UDALOSTI . " 
                (nazev, popis, dt_od, dt_do, pouzit_hierarchii, hierarchy_profile_id, autor_id, dt_created, aktivni)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $nazev,
            $input['popis'] ?? '',
            $input['dt_od'] ?? null,
            $input['dt_do'] ?? null,
            $input['pouzit_hierarchii'] ?? 0,
            $input['hierarchy_profile_id'] ?? null,
            $token_data['user_id'],
            $dt_created
        ]);

        $udalost_id = $db->lastInsertId();

        // INSERT příjemců
        if (isset($input['prijemci']) && is_array($input['prijemci'])) {
            $sql_prijemce = "INSERT INTO " . TBL_PLAN_UDALOSTI_PRIJEMCI . " 
                            (udalost_id, typ_prijemce, kod_role, user_id, dt_created)
                            VALUES (?, ?, ?, ?, ?)";
            $stmt_prijemce = $db->prepare($sql_prijemce);
            
            foreach ($input['prijemci'] as $prijemce) {
                $stmt_prijemce->execute([
                    $udalost_id,
                    $prijemce['typ_prijemce'] ?? 'user',
                    $prijemce['kod_role'] ?? null,
                    $prijemce['user_id'] ?? null,
                    $dt_created
                ]);
            }
        }

        // Vytvořit notifikace pro příjemce
        $udalost = [
            'id' => $udalost_id,
            'nazev' => $nazev,
            'popis' => $input['popis'] ?? '',
            'autor_id' => $token_data['user_id'],
            'pouzit_hierarchii' => $input['pouzit_hierarchii'] ?? 0,
            'hierarchy_profile_id' => $input['hierarchy_profile_id'] ?? null,
            'dt_od' => $input['dt_od'] ?? null
        ];
        createPlanningNotifications($db, $udalost, 'udalost', 'PLANNING_EVENT_CREATED');

        http_response_code(201);
        echo json_encode([
            'status' => 'success',
            'message' => 'Událost vytvořena',
            'data' => ['id' => $udalost_id]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při vytváření události: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/create: " . $e->getMessage());
    }
}

// Další event handlers (get, update, delete) - obdobné jako pro messages
// Pro stručnost je vynechávám, budou přidány v další iteraci pokud potřeba

?>
