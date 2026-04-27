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
 * Načte globální nastavení pro plánování z tabulky 25a_nastaveni_globalni
 * 
 * @param PDO $db
 * @return array ['use_hierarchy' => bool, 'hierarchy_profile_id' => int|null]
 */
function getPlanningGlobalSettings($db) {
    $settings = [
        'use_hierarchy' => false,
        'hierarchy_profile_id' => null
    ];
    
    try {
        $stmt = $db->prepare("
            SELECT klic, hodnota 
            FROM 25a_nastaveni_globalni 
            WHERE klic IN ('PLANNING_USE_HIERARCHY', 'PLANNING_HIERARCHY_PROFILE_ID')
        ");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rows as $row) {
            if ($row['klic'] === 'PLANNING_USE_HIERARCHY') {
                $settings['use_hierarchy'] = ($row['hodnota'] == '1');
            } else if ($row['klic'] === 'PLANNING_HIERARCHY_PROFILE_ID') {
                $settings['hierarchy_profile_id'] = $row['hodnota'] ? (int)$row['hodnota'] : null;
            }
        }
    } catch (Exception $e) {
        error_log("❌ getPlanningGlobalSettings: " . $e->getMessage());
    }
    
    return $settings;
}

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
        if ($row['typ_prijemce'] === 'all') {
            // 🆕 VŠEM - Získat VŠECHNY aktivní uživatele
            $sql_all = "SELECT id, email FROM " . TBL_UZIVATELE . " WHERE aktivni = 1";
            $stmt_all = $db->prepare($sql_all);
            $stmt_all->execute();
            $users = $stmt_all->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($users as $user) {
                $recipients[] = [
                    'user_id' => $user['id'],
                    'email' => $user['email'],
                    'priority' => 'normal',
                    'delivery' => ['email' => true, 'inApp' => true]
                ];
            }
        } else if ($row['typ_prijemce'] === 'role' && $row['kod_role']) {
            // Získat všechny uživatele s touto rolí
            $sql_role = "SELECT DISTINCT u.id, u.email 
                        FROM " . TBL_UZIVATELE . " u
                        JOIN " . TBL_UZIVATELE_ROLE . " ur ON ur.uzivatel_id = u.id
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
            $sql_user = "SELECT id, email FROM " . TBL_UZIVATELE . " WHERE id = ? AND aktivni = 1";
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
 * Přidá k seznamu záznamů detail příjemců (role + uživatelé) pro tooltipy
 * @param PDO $db
 * @param array $records
 * @param string $typ 'zprava' nebo 'udalost'
 */
function attachPlanningRecipientsToList($db, &$records, $typ) {
    if (empty($records)) {
        return;
    }

    if ($typ === 'zprava') {
        $tbl_prijemci = TBL_PLAN_ZPRAVY_PRIJEMCI;
        $id_field = 'zprava_id';
    } else {
        $tbl_prijemci = TBL_PLAN_UDALOSTI_PRIJEMCI;
        $id_field = 'udalost_id';
    }

    $ids = array_values(array_filter(array_map(fn($r) => (int)($r['id'] ?? 0), $records)));
    if (empty($ids)) {
        return;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $sql = "SELECT $id_field as record_id, typ_prijemce, kod_role, user_id
            FROM `$tbl_prijemci`
            WHERE $id_field IN ($placeholders)";
    $stmt = $db->prepare($sql);
    $stmt->execute($ids);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $byRecord = [];
    $roleCodes = [];
    $userIds = [];

    foreach ($rows as $row) {
        $recordId = (int)($row['record_id'] ?? 0);
        if ($row['typ_prijemce'] === 'role' && $row['kod_role']) {
            $code = $row['kod_role'];
            $byRecord[$recordId]['roles'][$code] = true;
            $roleCodes[$code] = true;
        } else if ($row['typ_prijemce'] === 'user' && $row['user_id']) {
            $uid = (int)$row['user_id'];
            if ($uid) {
                $byRecord[$recordId]['users'][$uid] = true;
                $userIds[$uid] = true;
            }
        }
    }

    $roleMap = [];
    if (!empty($roleCodes)) {
        $roleKeys = array_keys($roleCodes);
        $rolePlaceholders = implode(',', array_fill(0, count($roleKeys), '?'));
        $sqlRole = "SELECT kod_role, nazev_role FROM `" . TBL_ROLE . "` WHERE kod_role IN ($rolePlaceholders)";
        $stmtRole = $db->prepare($sqlRole);
        $stmtRole->execute($roleKeys);
        foreach ($stmtRole->fetchAll(PDO::FETCH_ASSOC) as $role) {
            $roleMap[$role['kod_role']] = $role['nazev_role'];
        }
    }

    $userMap = [];
    if (!empty($userIds)) {
        $userKeys = array_keys($userIds);
        $userPlaceholders = implode(',', array_fill(0, count($userKeys), '?'));
        $sqlUser = "SELECT id, jmeno, prijmeni, email FROM `" . TBL_UZIVATELE . "` WHERE id IN ($userPlaceholders)";
        $stmtUser = $db->prepare($sqlUser);
        $stmtUser->execute($userKeys);
        foreach ($stmtUser->fetchAll(PDO::FETCH_ASSOC) as $user) {
            $userMap[(int)$user['id']] = $user;
        }
    }

    foreach ($records as &$record) {
        $recordId = (int)($record['id'] ?? 0);
        $recordRoles = array_keys($byRecord[$recordId]['roles'] ?? []);
        $recordUsers = array_keys($byRecord[$recordId]['users'] ?? []);

        $record['prijemci_role_kody'] = $recordRoles;
        $record['prijemci_user_ids'] = array_map('intval', $recordUsers);

        $record['prijemci_roles'] = [];
        foreach ($recordRoles as $code) {
            if (isset($roleMap[$code])) {
                $record['prijemci_roles'][] = $roleMap[$code] . ' (' . $code . ')';
            } else {
                $record['prijemci_roles'][] = $code;
            }
        }

        $record['prijemci_users'] = [];
        foreach ($recordUsers as $uid) {
            if (isset($userMap[$uid])) {
                $user = $userMap[$uid];
                $label = trim(($user['prijmeni'] ?? '') . ' ' . ($user['jmeno'] ?? ''));
                if (!empty($user['email'])) {
                    $label = trim($label . ' - ' . $user['email']);
                }
                $record['prijemci_users'][] = $label !== '' ? $label : (string)$uid;
            } else {
                $record['prijemci_users'][] = (string)$uid;
            }
        }
    }
    unset($record);
}

/**
 * Vrati DateTime objekt v ceske time zone.
 * @param string $value
 * @return DateTime|null
 */
function parseCzechDateTime($value) {
    if (empty($value)) {
        return null;
    }

    try {
        $tz = new DateTimeZone('Europe/Prague');
        return new DateTime($value, $tz);
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Zkontroluje, zda je uzivatel prijemcem udalosti.
 * @param PDO $db
 * @param array $event
 * @param int $userId
 * @return bool
 */
function isUserRecipientForEvent($db, $event, $userId) {
    $explicit = getPlanningRecipients($db, (int)$event['id'], 'udalost');
    $globalSettings = getPlanningGlobalSettings($db);
    $hierarchyRecipients = [];

    if ($globalSettings['use_hierarchy'] && !empty($event['pouzit_hierarchii'])) {
        $profileId = !empty($event['hierarchy_profile_id']) ? (int)$event['hierarchy_profile_id'] : ($globalSettings['hierarchy_profile_id'] ?? null);
        if ($profileId) {
            $hierarchyResult = resolveHierarchyNotificationRecipients(
                $db,
                'PLANNING_EVENT_CREATED',
                [
                    'record_id' => $event['id'],
                    'nazev' => $event['nazev'] ?? '',
                    'autor_id' => $event['autor_id'] ?? null
                ],
                $profileId
            );
            if ($hierarchyResult && isset($hierarchyResult['recipients']) && !empty($hierarchyResult['recipients'])) {
                $hierarchyRecipients = $hierarchyResult['recipients'];
            }
        }
    }

    $allRecipients = mergeRecipients($explicit, $hierarchyRecipients);
    if (empty($allRecipients)) {
        return true;
    }

    foreach ($allRecipients as $recipient) {
        if ((int)$recipient['user_id'] === (int)$userId) {
            return true;
        }
    }

    return false;
}

/**
 * Zkontroluje, zda uživatel obdržel in-app notifikaci k planning události.
 * Neřeší read/unread, stačí existence doručené notifikace.
 * @param PDO $db
 * @param int $eventId
 * @param int $userId
 * @return bool
 */
function hasPlanningEventNotificationForUser($db, $eventId, $userId) {
    try {
        $sql = "SELECT COUNT(*)
                FROM " . TBL_NOTIFIKACE . " n
                INNER JOIN " . TBL_NOTIFIKACE_PRECTENI . " nr ON nr.notifikace_id = n.id
                WHERE n.typ = 'PLANNING_EVENT_CREATED'
                  AND n.objekt_typ = 'planning_event'
                  AND n.objekt_id = ?
                  AND n.aktivni = 1
                  AND nr.uzivatel_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([(int)$eventId, (int)$userId]);
        return ((int)$stmt->fetchColumn()) > 0;
    } catch (Exception $e) {
        error_log('[Planning] hasPlanningEventNotificationForUser failed: ' . $e->getMessage());
        return false;
    }
}

/**
 * Bezpecny check, zda sloupec existuje (pro kompatibilitu bez migrace).
 * @param PDO $db
 * @param string $table
 * @param string $column
 * @return bool
 */
function planningHasColumn($db, $table, $column) {
    static $cache = [];
    $key = $table . ':' . $column;
    if (isset($cache[$key])) {
        return $cache[$key];
    }

    try {
        $sql = "SHOW COLUMNS FROM `" . $table . "` LIKE ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$column]);
        $cache[$key] = $stmt->fetch(PDO::FETCH_ASSOC) ? true : false;
    } catch (Exception $e) {
        error_log("[Planning] Column check failed for {$table}.{$column}: " . $e->getMessage());
        $cache[$key] = false;
    }

    return $cache[$key];
}

/**
 * Zajisti existenci hlavniho terminu a vrati jeho ID.
 * @param PDO $db
 * @param int $eventId
 * @param string|null $dtOd
 * @param string|null $dtDo
 * @param string $dtCreated
 * @return int|null
 */
/**
 * @deprecated Od refactoringu k 1:N schematu neni koncept "hlavniho terminu".
 * Udalost ma N rovnocennych terminu; dt_od/dt_do udalosti se udrzuje DB triggery.
 * Funkce je ponechana jako no-op pro zpetnou kompatibilitu.
 */
function ensureMainEventTerm($db, $eventId, $dtOd, $dtDo, $dtCreated) {
    return null;
}

/**
 * Vrati deadline pro zmenu odpovedi.
 * @param array $event
 * @param array $term
 * @return DateTime|null
 */
function getEventResponseDeadline($event, $term) {
    $start = parseCzechDateTime($term['dt_od'] ?? null);
    if (!$start) {
        return null;
    }
    $end = parseCzechDateTime($term['dt_do'] ?? null);
    $createdRaw = $event['dt_created'] ?? ($event['dt_vytvoreno'] ?? ($event['dt_create'] ?? null));
    $created = parseCzechDateTime($createdRaw);
    $now = parseCzechDateTime(TimezoneHelper::getCzechDateTime());

    $durationHours = null;
    if ($end) {
        $durationHours = ($end->getTimestamp() - $start->getTimestamp()) / 3600;
    }

    $deadline = clone $start;
    // Pravidla (vztazena k dt_od terminu):
    // - udalost vytvorena ten samy den jako dt_od => deadline = dt_od - 1h
    // - vicedenni udalost (konci jiny den nez zacina)     => deadline = dt_od - 24h
    // - jednodenni udalost (standard)                     => deadline = dt_od - 6h
    $sameDayCreated = $created && $created->format('Y-m-d') === $start->format('Y-m-d');
    $multiDay = $end && $end->format('Y-m-d') !== $start->format('Y-m-d');

    if ($sameDayCreated) {
        $deadline->modify('-1 hour');
    } elseif ($multiDay) {
        $deadline->modify('-24 hours');
    } else {
        $deadline->modify('-6 hours');
    }

    return $deadline;
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
    // Načíst jméno autora
    $organizator = null;
    if (!empty($record['autor_id'])) {
        $sqlAutor = "SELECT CONCAT(jmeno, ' ', prijmeni) as full_name FROM " . TBL_UZIVATELE . " WHERE id = ?";
        $stmtAutor = $db->prepare($sqlAutor);
        $stmtAutor->execute([$record['autor_id']]);
        $autorData = $stmtAutor->fetch(PDO::FETCH_ASSOC);
        if ($autorData) {
            $organizator = $autorData['full_name'];
        }
    }
    
    // 1. Získat EXPLICITNÍ příjemce (role + konkrétní uživatelé z tabulky)
    $explicitRecipients = getPlanningRecipients($db, $record['id'], $typ);
    
    // 2. Načíst GLOBÁLNÍ nastavení hierarchie
    $globalSettings = getPlanningGlobalSettings($db);
    
    // 3. POKUD je globálně zapnuta hierarchie → získat příjemce i z hierarchie
    $hierarchyRecipients = [];
    if ($globalSettings['use_hierarchy']) {
        $hierarchyResult = resolveHierarchyNotificationRecipients(
            $db,
            $event_type,
            [
                'record_id' => $record['id'],
                'nazev' => $record['nazev'],
                'autor_id' => $record['autor_id']
            ],
            $globalSettings['hierarchy_profile_id']
        );
        
        // ✅ FALLBACK: Pokud hierarchie nevrátí žádné příjemce → použít jen explicitní
        if ($hierarchyResult && isset($hierarchyResult['recipients']) && !empty($hierarchyResult['recipients'])) {
            $hierarchyRecipients = $hierarchyResult['recipients'];
        }
        // else: hierarchyRecipients zůstane prázdný array
        //       → mergeRecipients vrátí pouze explicitRecipients
    }
    
    // 4. MERGE příjemců (deduplikace, nejvyšší priorita)
    // Pokud hierarchyRecipients je prázdný → vrátí se jen explicitRecipients
    $allRecipients = mergeRecipients($explicitRecipients, $hierarchyRecipients);
    
    // 5. Načíst termíny události (pokud je to udalost)
    $terminyData = [];
    if ($typ === 'udalost') {
        $sqlTerminy = "SELECT id, dt_od, dt_do, poradi, poznamka, kapacita 
                      FROM `" . TBL_PLAN_UDALOSTI_TERMINY . "`
                      WHERE udalost_id = ? 
                      ORDER BY poradi ASC, id ASC";
        $stmtTerminy = $db->prepare($sqlTerminy);
        $stmtTerminy->execute([$record['id']]);
        $terminyData = $stmtTerminy->fetchAll(PDO::FETCH_ASSOC);
        
        // Načíst počty accepted pro každý termín
        if (!empty($terminyData)) {
            $terminIds = array_column($terminyData, 'id');
            $placeholders = implode(',', array_fill(0, count($terminIds), '?'));
            $sqlAccepted = "SELECT termin_id, COUNT(*) as accepted_count 
                           FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . "
                           WHERE termin_id IN ($placeholders) AND typ_odpovedi = 'accepted'
                           GROUP BY termin_id";
            $stmtAccepted = $db->prepare($sqlAccepted);
            $stmtAccepted->execute($terminIds);
            $acceptedCounts = [];
            foreach ($stmtAccepted->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $acceptedCounts[$row['termin_id']] = (int)$row['accepted_count'];
            }
            
            // Přidat accepted_count k termínům
            foreach ($terminyData as &$termin) {
                $termin['accepted_count'] = $acceptedCounts[$termin['id']] ?? 0;
                $termin['is_full'] = !empty($termin['kapacita']) && $termin['accepted_count'] >= $termin['kapacita'];
            }
        }
    }
    
    // 6. Vytvořit notifikaci pro každého příjemce (kromě autora)
    $autorId = (int)($record['autor_id'] ?? 0);
    foreach ($allRecipients as $recipient) {
        // ✅ Neposílat notifikaci autorovi o jeho vlastní akci
        if ($recipient['user_id'] == $autorId) {
            continue;
        }
        
        createNotification($db, [
            ':typ' => $event_type,
            ':nadpis' => $record['nazev'],
            ':zprava' => $typ === 'zprava' ? ($record['obsah'] ?? '') : ($record['popis'] ?? ''),
            ':data_json' => json_encode([
                'record_id' => $record['id'],
                'typ' => $typ,
                'dt_od' => $record['dt_od'] ?? null,
                'dt_do' => $record['dt_do'] ?? null,
                'nazev' => $record['nazev'] ?? null,
                'organizator' => $organizator,
                'terminy' => $terminyData
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
 * Body: {token, username, page?, per_page?, search_term?, filter_nazev?, filter_text?, filter_dt_od?, filter_dt_do?}
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        $page = max(1, (int)($input['page'] ?? 1));
        $per_page = (int)($input['per_page'] ?? 50);
        $per_page = max(1, min(200, $per_page));
        $offset = ($page - 1) * $per_page;

        $search_term = trim((string)($input['search_term'] ?? ''));
        $filter_nazev = trim((string)($input['filter_nazev'] ?? ''));
        $filter_organizator = trim((string)($input['filter_organizator'] ?? ''));
        $filter_text = trim((string)($input['filter_text'] ?? ''));
        $filter_dt_od = trim((string)($input['filter_dt_od'] ?? ''));
        $filter_dt_do = trim((string)($input['filter_dt_do'] ?? ''));

        $include_inactive = !empty($input['include_inactive']);
        $where = [];
        if (!$include_inactive) {
            $where[] = 'z.aktivni = 1';
        }
        $params = [];

        if ($search_term !== '') {
            $like = '%' . $search_term . '%';
            $where[] = '(z.nazev LIKE ? OR z.obsah LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }
        if ($filter_nazev !== '') {
            $where[] = 'z.nazev LIKE ?';
            $params[] = '%' . $filter_nazev . '%';
        }
        if ($filter_organizator !== '') {
            $where[] = '(u.jmeno LIKE ? OR u.prijmeni LIKE ? OR CONCAT(u.prijmeni, " ", u.jmeno) LIKE ?)';
            $like = '%' . $filter_organizator . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        if ($filter_text !== '') {
            $where[] = 'z.obsah LIKE ?';
            $params[] = '%' . $filter_text . '%';
        }
        if ($filter_dt_od !== '') {
            $where[] = 'DATE(z.dt_od) = ?';
            $params[] = $filter_dt_od;
        }
        if ($filter_dt_do !== '') {
            $where[] = 'DATE(z.dt_do) = ?';
            $params[] = $filter_dt_do;
        }

        $whereSql = empty($where) ? '1=1' : implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) FROM " . TBL_PLAN_ZPRAVY . " z 
                     LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = z.autor_id 
                     WHERE $whereSql";
        $stmtCount = $db->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // Třídění - validace a mapování
        $sort_field = trim((string)($input['sort_field'] ?? 'dt_updated'));
        $sort_direction = strtoupper(trim((string)($input['sort_direction'] ?? 'DESC')));
        
        // Povolené sloupce pro třídění zpráv
        $allowed_sort_fields = [
            'nazev' => 'z.nazev',
            'obsah' => 'z.obsah',
            'dt_od' => 'z.dt_od',
            'dt_do' => 'z.dt_do',
            'dt_created' => 'z.dt_created',
            'dt_updated' => 'z.dt_updated',
            'dt_aktualizace' => 'z.dt_updated', // alias pro kompatibilitu
            'autor' => 'u.prijmeni', // třídění podle jména organizátora
            'organizator' => 'u.prijmeni' // alias
        ];
        
        $sort_column = $allowed_sort_fields[$sort_field] ?? 'z.dt_updated';
        $sort_dir = in_array($sort_direction, ['ASC', 'DESC']) ? $sort_direction : 'DESC';

        $sql = "SELECT z.*, 
                       u.jmeno as autor_jmeno, u.prijmeni as autor_prijmeni,
                       COUNT(DISTINCT zp.id) as pocet_prijemcu,
                       COUNT(DISTINCT zo.id) as pocet_odpovedi
                FROM " . TBL_PLAN_ZPRAVY . " z
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = z.autor_id
                LEFT JOIN " . TBL_PLAN_ZPRAVY_PRIJEMCI . " zp ON zp.zprava_id = z.id
                LEFT JOIN " . TBL_PLAN_ZPRAVY_ODPOVEDI . " zo ON zo.zprava_id = z.id
                WHERE $whereSql
                GROUP BY z.id
                ORDER BY $sort_column $sort_dir
                LIMIT $per_page OFFSET $offset";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $zpravy = $stmt->fetchAll(PDO::FETCH_ASSOC);

        attachPlanningRecipientsToList($db, $zpravy, 'zprava');

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $zpravy,
            'count' => count($zpravy),
            'pagination' => [
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $per_page > 0 ? (int)ceil($total / $per_page) : 0
            ]
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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
                   u.jmeno as autor_jmeno, u.prijmeni as autor_prijmeni
            FROM " . TBL_PLAN_ZPRAVY . " z
            LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = z.autor_id
            WHERE z.id = ?";

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
                 ORDER BY o.dt_odpovedi ASC";
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
 * Body: {token, username, nazev, obsah, dt_od, dt_do, prijemci: [{typ_prijemce, kod_role?, user_id?}]}
 * Poznámka: Organizační hierarchie je řízena globálním nastavením v 25a_nastaveni_globalni
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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
                (nazev, obsah, dt_od, dt_do, autor_id, dt_created, aktivni)
                VALUES (?, ?, ?, ?, ?, ?, 1)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $nazev,
            $obsah,
            $input['dt_od'] ?? null,
            $input['dt_do'] ?? null,
            $token_data['id'],
            $dt_created
        ]);

        $zprava_id = $db->lastInsertId();

        // 🆕 INSERT příjemců - podpora pro "Všem"
        $sendToAll = isset($input['sendToAll']) && ($input['sendToAll'] == 1 || $input['sendToAll'] === true);
        
        if ($sendToAll) {
            // 📧 Poslat VŠEM aktivním uživatelům
            $sql_prijemce = "INSERT INTO " . TBL_PLAN_ZPRAVY_PRIJEMCI . " 
                            (zprava_id, typ_prijemce, kod_role, user_id, dt_created)
                            VALUES (?, ?, ?, ?, ?)";
            $stmt_prijemce = $db->prepare($sql_prijemce);
            $stmt_prijemce->execute([
                $zprava_id,
                'all',
                null,
                null,
                $dt_created
            ]);
        } else if (isset($input['prijemci']) && is_array($input['prijemci'])) {
            // 📧 Poslat vybraným příjemcům
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

        // ❌ ZAKOMENTOVÁNO: Zprávy se NEPOSÍLAJÍ automaticky (dle požadavku)
        // Zprávy se zobrazují pouze v scroll info message boxu na dashboardu
        // $zprava = [
        //     'id' => $zprava_id,
        //     'nazev' => $nazev,
        //     'obsah' => $obsah,
        //     'autor_id' => $token_data['id'],
        //     'dt_do' => $input['dt_do'] ?? null
        // ];
        // createPlanningNotifications($db, $zprava, 'zprava', 'PLANNING_MESSAGE_CREATED');

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
 * Body: {token, username, id, nazev, obsah, dt_od, dt_do}
 * Poznámka: Organizační hierarchie je řízena globálním nastavením
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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
                SET nazev = ?, obsah = ?, dt_od = ?, dt_do = ?
                WHERE id = ? AND aktivni = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $input['nazev'] ?? '',
            $input['obsah'] ?? '',
            $input['dt_od'] ?? null,
            $input['dt_do'] ?? null,
            $id
        ]);

        // Aktualizace příjemců - přepiš vše
        $sql_del_prij = "DELETE FROM " . TBL_PLAN_ZPRAVY_PRIJEMCI . " WHERE zprava_id = ?";
        $stmt_del_prij = $db->prepare($sql_del_prij);
        $stmt_del_prij->execute([$id]);

        // 🆕 Podpora pro "Všem"
        $sendToAll = isset($input['sendToAll']) && ($input['sendToAll'] == 1 || $input['sendToAll'] === true);
        $dt_created = TimezoneHelper::getCzechDateTime();
        
        if ($sendToAll) {
            // 📧 Poslat VŠEM aktivním uživatelům
            $sql_prijemce = "INSERT INTO " . TBL_PLAN_ZPRAVY_PRIJEMCI . " 
                            (zprava_id, typ_prijemce, kod_role, user_id, dt_created)
                            VALUES (?, ?, ?, ?, ?)";
            $stmt_prijemce = $db->prepare($sql_prijemce);
            $stmt_prijemce->execute([$id, 'all', null, null, $dt_created]);
        } else if (isset($input['prijemci']) && is_array($input['prijemci'])) {
            // 📧 Poslat vybraným příjemcům
            $sql_prijemce = "INSERT INTO " . TBL_PLAN_ZPRAVY_PRIJEMCI . " 
                            (zprava_id, typ_prijemce, kod_role, user_id, dt_created)
                            VALUES (?, ?, ?, ?, ?)";
            $stmt_prijemce = $db->prepare($sql_prijemce);

            foreach ($input['prijemci'] as $prijemce) {
                $stmt_prijemce->execute([
                    $id,
                    $prijemce['typ_prijemce'] ?? 'user',
                    $prijemce['kod_role'] ?? null,
                    $prijemce['user_id'] ?? null,
                    $dt_created
                ]);
            }
        }

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
 * DELETE zpráva (hard delete)
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        $db->beginTransaction();

        $sqlDelRecipients = "DELETE FROM " . TBL_PLAN_ZPRAVY_PRIJEMCI . " WHERE zprava_id = ?";
        $stmtDelRecipients = $db->prepare($sqlDelRecipients);
        $stmtDelRecipients->execute([$id]);

        $sqlDelResponses = "DELETE FROM " . TBL_PLAN_ZPRAVY_ODPOVEDI . " WHERE zprava_id = ?";
        $stmtDelResponses = $db->prepare($sqlDelResponses);
        $stmtDelResponses->execute([$id]);

        $notifSql = "SELECT id FROM " . TBL_NOTIFIKACE . " WHERE objekt_typ = ? AND objekt_id = ?";
        $stmtNotif = $db->prepare($notifSql);
        $stmtNotif->execute(['planning_message', $id]);
        $notifIds = $stmtNotif->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($notifIds)) {
            $placeholders = implode(',', array_fill(0, count($notifIds), '?'));
            $sqlDelRead = "DELETE FROM " . TBL_NOTIFIKACE_PRECTENI . " WHERE notifikace_id IN ($placeholders)";
            $stmtDelRead = $db->prepare($sqlDelRead);
            $stmtDelRead->execute($notifIds);

            $sqlDelNotif = "DELETE FROM " . TBL_NOTIFIKACE . " WHERE id IN ($placeholders)";
            $stmtDelNotif = $db->prepare($sqlDelNotif);
            $stmtDelNotif->execute($notifIds);
        }

        $sql = "DELETE FROM " . TBL_PLAN_ZPRAVY . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$id]);

        $db->commit();

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Zpráva smazána'
        ]);

    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při mazání zprávy: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in messages/delete: " . $e->getMessage());
    }
}

/**
 * SET ACTIVE stav zprávy
 * POST planning/messages/set-active
 * Body: {token, username, id, aktivni}
 */
function handle_planning_messages_set_active($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $id = $input['id'] ?? null;
    $aktivni = $input['aktivni'] ?? null;

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

    if ($aktivni === null || $aktivni === '') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí hodnota aktivni']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        $sql = "UPDATE " . TBL_PLAN_ZPRAVY . " SET aktivni = ? WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([(int)$aktivni, $id]);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => ((int)$aktivni === 1 ? 'Zpráva aktivována' : 'Zpráva deaktivována')
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při změně stavu zprávy: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in messages/set-active: " . $e->getMessage());
    }
}

// ==========================================
// EVENTS ENDPOINTS (obdobné jako messages)
// ==========================================

/**
 * GET seznam událostí
 * POST planning/events/list
 * Body: {token, username, page?, per_page?, search_term?, filter_nazev?, filter_text?, filter_dt_od?, filter_dt_do?}
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        $page = max(1, (int)($input['page'] ?? 1));
        $per_page = (int)($input['per_page'] ?? 50);
        $per_page = max(1, min(200, $per_page));
        $offset = ($page - 1) * $per_page;

        $search_term = trim((string)($input['search_term'] ?? ''));
        $filter_nazev = trim((string)($input['filter_nazev'] ?? ''));
        $filter_organizator = trim((string)($input['filter_organizator'] ?? ''));
        $filter_text = trim((string)($input['filter_text'] ?? ''));
        $filter_dt_od = trim((string)($input['filter_dt_od'] ?? ''));
        $filter_dt_do = trim((string)($input['filter_dt_do'] ?? ''));

        $include_inactive = !empty($input['include_inactive']);
        $where = [];
        if (!$include_inactive) {
            $where[] = 'u.aktivni = 1';
        }
        $params = [];

        if ($search_term !== '') {
            $like = '%' . $search_term . '%';
            $where[] = '(u.nazev LIKE ? OR u.popis LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }
        if ($filter_nazev !== '') {
            $where[] = 'u.nazev LIKE ?';
            $params[] = '%' . $filter_nazev . '%';
        }
        if ($filter_organizator !== '') {
            $where[] = '(us.jmeno LIKE ? OR us.prijmeni LIKE ? OR CONCAT(us.prijmeni, " ", us.jmeno) LIKE ?)';
            $like = '%' . $filter_organizator . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        if ($filter_text !== '') {
            $where[] = 'u.popis LIKE ?';
            $params[] = '%' . $filter_text . '%';
        }
        if ($filter_dt_od !== '') {
            $where[] = 'DATE(u.dt_od) = ?';
            $params[] = $filter_dt_od;
        }
        if ($filter_dt_do !== '') {
            $where[] = 'DATE(u.dt_do) = ?';
            $params[] = $filter_dt_do;
        }

        $whereSql = empty($where) ? '1=1' : implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) FROM " . TBL_PLAN_UDALOSTI . " u 
                     LEFT JOIN " . TBL_UZIVATELE . " us ON us.id = u.autor_id 
                     WHERE $whereSql";
        $stmtCount = $db->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // Třídění - validace a mapování
        $sort_field = trim((string)($input['sort_field'] ?? 'dt_updated'));
        $sort_direction = strtoupper(trim((string)($input['sort_direction'] ?? 'DESC')));
        
        // Povolené sloupce pro třídění událostí
        $allowed_sort_fields = [
            'nazev' => 'u.nazev',
            'popis' => 'u.popis',
            'dt_od' => 'u.dt_od',
            'dt_do' => 'u.dt_do',
            'dt_created' => 'u.dt_created',
            'dt_updated' => 'u.dt_updated',
            'dt_aktualizace' => 'u.dt_updated', // alias pro kompatibilitu
            'autor' => 'us.prijmeni', // třídění podle jména organizátora
            'organizator' => 'us.prijmeni' // alias
        ];
        
        $sort_column = $allowed_sort_fields[$sort_field] ?? 'u.dt_updated';
        $sort_dir = in_array($sort_direction, ['ASC', 'DESC']) ? $sort_direction : 'DESC';

        $sql = "SELECT u.*, 
                       us.jmeno as autor_jmeno, us.prijmeni as autor_prijmeni,
                       COUNT(DISTINCT up.id) as pocet_prijemcu,
                       COUNT(DISTINCT CASE WHEN uo.typ_odpovedi = 'accepted' THEN uo.id END) as accepted_count
                FROM " . TBL_PLAN_UDALOSTI . " u
                LEFT JOIN " . TBL_UZIVATELE . " us ON us.id = u.autor_id
                LEFT JOIN " . TBL_PLAN_UDALOSTI_PRIJEMCI . " up ON up.udalost_id = u.id
                LEFT JOIN " . TBL_PLAN_UDALOSTI_ODPOVEDI . " uo ON uo.udalost_id = u.id
                WHERE $whereSql
                GROUP BY u.id
                ORDER BY $sort_column $sort_dir
                LIMIT $per_page OFFSET $offset";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $udalosti = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pro každou událost načti její další termíny (z tabulky termínů)
        if (!empty($udalosti)) {
            $ids = array_map(fn($u) => (int)$u['id'], $udalosti);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $sqlTerm = "SELECT udalost_id, id, dt_od, dt_do, poradi, poznamka, kapacita
                        FROM `" . TBL_PLAN_UDALOSTI_TERMINY . "`
                        WHERE udalost_id IN ($placeholders)
                        ORDER BY udalost_id, poradi ASC, id ASC";
            $stmtTerm = $db->prepare($sqlTerm);
            $stmtTerm->execute($ids);
            $terminy = $stmtTerm->fetchAll(PDO::FETCH_ASSOC);

            $terminyByEvent = [];
            foreach ($terminy as $t) {
                $terminyByEvent[$t['udalost_id']][] = $t;
            }
            
            // ✅ Načíst počty accepted pro každý termín
            if (!empty($terminy)) {
                $terminIds = array_column($terminy, 'id');
                $placeholders2 = implode(',', array_fill(0, count($terminIds), '?'));
                $sqlAccepted = "SELECT termin_id, COUNT(*) as accepted_count 
                               FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . "
                               WHERE termin_id IN ($placeholders2) AND typ_odpovedi = 'accepted'
                               GROUP BY termin_id";
                $stmtAccepted = $db->prepare($sqlAccepted);
                $stmtAccepted->execute($terminIds);
                $acceptedCounts = [];
                foreach ($stmtAccepted->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    $acceptedCounts[$row['termin_id']] = (int)$row['accepted_count'];
                }
                
                // Přidat accepted_count a is_full k termínům
                foreach ($terminyByEvent as &$eventTerms) {
                    foreach ($eventTerms as &$termin) {
                        $termin['accepted_count'] = $acceptedCounts[$termin['id']] ?? 0;
                        $termin['kapacita'] = $termin['kapacita'] !== null ? (int)$termin['kapacita'] : null;
                        $termin['is_full'] = false;
                        if ($termin['kapacita'] !== null && $termin['kapacita'] > 0) {
                            $termin['is_full'] = ($termin['accepted_count'] >= $termin['kapacita']);
                        }
                    }
                    unset($termin);
                }
                unset($eventTerms);
            }
            
            foreach ($udalosti as &$u) {
                $u['terminy'] = $terminyByEvent[$u['id']] ?? [];
                
                // Spočítat max_kapacita (maximum ze všech termínů)
                $max_kapacita = null;
                foreach ($u['terminy'] as $term) {
                    $kap = $term['kapacita'];
                    if ($kap !== null && $kap > 0) {
                        if ($max_kapacita === null || $kap > $max_kapacita) {
                            $max_kapacita = $kap;
                        }
                    }
                }
                $u['max_kapacita'] = $max_kapacita;
            }
            unset($u);
        }

        attachPlanningRecipientsToList($db, $udalosti, 'udalost');

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $udalosti,
            'count' => count($udalosti),
            'pagination' => [
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $per_page > 0 ? (int)ceil($total / $per_page) : 0
            ]
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
 * GET detail události
 * POST planning/events/get
 * Body: {token, username, id}
 */
function handle_planning_events_get($input, $config) {
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
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID události']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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
                       us.jmeno as autor_jmeno, us.prijmeni as autor_prijmeni
                FROM " . TBL_PLAN_UDALOSTI . " u
                LEFT JOIN " . TBL_UZIVATELE . " us ON us.id = u.autor_id
            WHERE u.id = ?";

        $stmt = $db->prepare($sql);
        $stmt->execute([$id]);
        $udalost = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$udalost) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Událost nenalezena']);
            return;
        }

        $sql_prijemci = "SELECT * FROM " . TBL_PLAN_UDALOSTI_PRIJEMCI . " WHERE udalost_id = ?";
        $stmt_prijemci = $db->prepare($sql_prijemci);
        $stmt_prijemci->execute([$id]);
        $udalost['prijemci'] = $stmt_prijemci->fetchAll(PDO::FETCH_ASSOC);

        $sql_term = "SELECT id, dt_od, dt_do, poradi, poznamka, kapacita
                     FROM `" . TBL_PLAN_UDALOSTI_TERMINY . "`
                     WHERE udalost_id = ?
                     ORDER BY poradi ASC, id ASC";
        $stmt_term = $db->prepare($sql_term);
        $stmt_term->execute([$id]);
        $terminyVse = $stmt_term->fetchAll(PDO::FETCH_ASSOC);

        // ✅ Načíst počty accepted odpovědí pro všechny termíny
        $acceptedCounts = [];
        if (!empty($terminyVse)) {
            $termIds = array_column($terminyVse, 'id');
            $termPlaceholders = implode(',', array_fill(0, count($termIds), '?'));
            $sqlAccepted = "SELECT termin_id, COUNT(*) as accepted_count 
                           FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . "
                           WHERE termin_id IN ($termPlaceholders) AND typ_odpovedi = 'accepted'
                           GROUP BY termin_id";
            $stmtAccepted = $db->prepare($sqlAccepted);
            $stmtAccepted->execute($termIds);
            $acceptedRows = $stmtAccepted->fetchAll(PDO::FETCH_ASSOC);
            foreach ($acceptedRows as $row) {
                $acceptedCounts[$row['termin_id']] = (int)$row['accepted_count'];
            }
        }

        // ✅ Načíst odpovědi aktuálního uživatele
        $respByTerm = [];
        if (!empty($terminyVse)) {
            $termIds = array_column($terminyVse, 'id');
            $termPlaceholders = implode(',', array_fill(0, count($termIds), '?'));
            $sqlResp = "SELECT termin_id, typ_odpovedi, poznamka, dt_odpovedi
                        FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . "
                        WHERE user_id = ? AND termin_id IN ($termPlaceholders)";
            $stmtResp = $db->prepare($sqlResp);
            $stmtResp->execute(array_merge([$token_data['id']], $termIds));
            $respRows = $stmtResp->fetchAll(PDO::FETCH_ASSOC);
            foreach ($respRows as $row) {
                $respByTerm[$row['termin_id']] = $row;
            }
        }

        // ✅ Přidat informace k termínům
        $now = parseCzechDateTime(TimezoneHelper::getCzechDateTime());
        foreach ($terminyVse as &$term) {
            $termId = $term['id'];
            
            // Přidat odpověď uživatele
            if (isset($respByTerm[$termId])) {
                $term['moje_odpoved'] = $respByTerm[$termId];
            }

            // Přidat deadline a can_change
            $deadline = getEventResponseDeadline($udalost, $term);
            if ($deadline) {
                $term['deadline'] = $deadline->format('Y-m-d H:i:s');
                $term['can_change'] = $now ? ($now <= $deadline) : true;
            } else {
                $term['deadline'] = null;
                $term['can_change'] = true;
            }

            // Přidat informace o kapacitě a obsazenosti
            $term['kapacita'] = $term['kapacita'] !== null ? (int)$term['kapacita'] : null;
            $term['accepted_count'] = $acceptedCounts[$termId] ?? 0;
            $term['is_full'] = false;
            if ($term['kapacita'] !== null && $term['kapacita'] > 0) {
                $term['is_full'] = ($term['accepted_count'] >= $term['kapacita']);
            }
        }
        unset($term);

        $udalost['terminy'] = $terminyVse;
        // Zpetna kompatibilita
        $udalost['terminy_vse'] = $terminyVse;
        $udalost['hlavni_termin_id'] = !empty($terminyVse) ? (int)$terminyVse[0]['id'] : null;
        $udalost['isRecipient'] = isUserRecipientForEvent($db, $udalost, $token_data['id']);
        // Přesnější flag pro odkazy z emailu: uživatel musí mít doručenou notifikaci k události.
        $udalost['isEmailLinkRecipient'] = hasPlanningEventNotificationForUser($db, (int)$id, (int)$token_data['id']);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $udalost
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání události: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/get: " . $e->getMessage());
    }
}

/**
 * CREATE nová událost
 * POST planning/events/create
 * Body: {token, username, nazev, popis, dt_od, dt_do, prijemci}
 * Poznámka: Organizační hierarchie je řízena globálním nastavením
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        // Sestavit všechny termíny
        $allTerms = [];
        if (!empty($input['dt_od'])) {
            $allTerms[] = [
                'dt_od' => $input['dt_od'], 
                'dt_do' => $input['dt_do'] ?? null, 
                'poznamka' => null,
                'kapacita' => null
            ];
        }
        if (isset($input['terminy']) && is_array($input['terminy'])) {
            foreach ($input['terminy'] as $t) {
                if (empty($t['dt_od'])) continue;
                $allTerms[] = [
                    'dt_od' => $t['dt_od'], 
                    'dt_do' => $t['dt_do'] ?? null, 
                    'poznamka' => $t['poznamka'] ?? null,
                    'kapacita' => isset($t['kapacita']) && $t['kapacita'] !== null && $t['kapacita'] !== '' ? (int)$t['kapacita'] : null
                ];
            }
        }

        // dt_od/dt_do události nastavit z prvního termínu (pokud existuje)
        $udalost_dt_od = null;
        $udalost_dt_do = null;
        if (!empty($allTerms)) {
            $udalost_dt_od = $allTerms[0]['dt_od'];
            $udalost_dt_do = $allTerms[0]['dt_do'];
        }

        // INSERT události - dt_od je POVINNÉ (pokud není termín, nelze vytvořit)
        if (!$udalost_dt_od) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Chybí alespoň jeden termín události']);
            return;
        }

        $sql = "INSERT INTO " . TBL_PLAN_UDALOSTI . "
                (nazev, popis, dt_od, dt_do, autor_id, dt_created, aktivni)
                VALUES (?, ?, ?, ?, ?, ?, 1)";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            $nazev,
            $input['popis'] ?? '',
            $udalost_dt_od,
            $udalost_dt_do,
            $token_data['id'],
            $dt_created
        ]);

        $udalost_id = $db->lastInsertId();

        // 🆕 INSERT příjemců - podpora pro "Všem"
        $sendToAll = isset($input['sendToAll']) && ($input['sendToAll'] == 1 || $input['sendToAll'] === true);
        
        if ($sendToAll) {
            // 📧 Poslat VŠEM aktivním uživatelům
            $sql_prijemce = "INSERT INTO " . TBL_PLAN_UDALOSTI_PRIJEMCI . " 
                            (udalost_id, typ_prijemce, kod_role, user_id, dt_created)
                            VALUES (?, ?, ?, ?, ?)";
            $stmt_prijemce = $db->prepare($sql_prijemce);
            $stmt_prijemce->execute([
                $udalost_id,
                'all',
                null,
                null,
                $dt_created
            ]);
        } else if (isset($input['prijemci']) && is_array($input['prijemci'])) {
            // 📧 Poslat vybraným příjemcům
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

        // INSERT všech termínů (rovnocenně) - allTerms už sestaveny výše
        $sql_term = "INSERT INTO `" . TBL_PLAN_UDALOSTI_TERMINY . "`
                     (udalost_id, dt_od, dt_do, poradi, poznamka, kapacita, dt_created)
                     VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt_term = $db->prepare($sql_term);
        $poradi = 0;

        foreach ($allTerms as $t) {
            $stmt_term->execute([
                $udalost_id,
                $t['dt_od'],
                $t['dt_do'] ?? null,
                $poradi++,
                $t['poznamka'],
                $t['kapacita'],
                $dt_created
            ]);
        }

        // ⚠️ ZMĚNA: Automatické notifikace VYPNUTY
        // Notifikace se odesílají MANUÁLNĚ přes tlačítko "Odeslat notifikace"
        // viz endpoint: planning/events/send-notifications
        // $udalost = [
        //     'id' => $udalost_id,
        //     'nazev' => $nazev,
        //     'popis' => $input['popis'] ?? '',
        //     'autor_id' => $token_data['id'],
        //     'dt_od' => $input['dt_od'] ?? null
        // ];
        // createPlanningNotifications($db, $udalost, 'udalost', 'PLANNING_EVENT_CREATED');

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

/**
 * UPDATE událost
 * POST planning/events/update
 * Body: {token, username, id, nazev, popis, dt_od, dt_do, prijemci, terminy}
 */
function handle_planning_events_update($input, $config) {
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
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID události']);
        return;
    }

    $nazev = $input['nazev'] ?? '';
    if (!$nazev) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí název události']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        // UPDATE zakladnich udaju udalosti. dt_od/dt_do se NEMENI primo – dopocita se
        // automaticky triggerem z tabulky terminy (MIN/MAX).
        $sql = "UPDATE " . TBL_PLAN_UDALOSTI . "
                SET nazev = ?, popis = ?
                WHERE id = ? AND aktivni = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $input['nazev'] ?? '',
            $input['popis'] ?? '',
            $id
        ]);

        // Aktualizace příjemců - přepiš vše
        $sql_del_prij = "DELETE FROM " . TBL_PLAN_UDALOSTI_PRIJEMCI . " WHERE udalost_id = ?";
        $stmt_del_prij = $db->prepare($sql_del_prij);
        $stmt_del_prij->execute([$id]);

        // 🆕 Podpora pro "Všem"
        $sendToAll = isset($input['sendToAll']) && ($input['sendToAll'] == 1 || $input['sendToAll'] === true);
        $dt_created = TimezoneHelper::getCzechDateTime();
        
        if ($sendToAll) {
            // 📧 Poslat VŠEM aktivním uživatelům
            $sql_prijemce = "INSERT INTO " . TBL_PLAN_UDALOSTI_PRIJEMCI . " 
                            (udalost_id, typ_prijemce, kod_role, user_id, dt_created)
                            VALUES (?, ?, ?, ?, ?)";
            $stmt_prijemce = $db->prepare($sql_prijemce);
            $stmt_prijemce->execute([$id, 'all', null, null, $dt_created]);
        } else if (isset($input['prijemci']) && is_array($input['prijemci'])) {
            // 📧 Poslat vybraným příjemcům
            $sql_prijemce = "INSERT INTO " . TBL_PLAN_UDALOSTI_PRIJEMCI . " 
                            (udalost_id, typ_prijemce, kod_role, user_id, dt_created)
                            VALUES (?, ?, ?, ?, ?)";
            $stmt_prijemce = $db->prepare($sql_prijemce);

            foreach ($input['prijemci'] as $prijemce) {
                $stmt_prijemce->execute([
                    $id,
                    $prijemce['typ_prijemce'] ?? 'user',
                    $prijemce['kod_role'] ?? null,
                    $prijemce['user_id'] ?? null,
                    $dt_created
                ]);
            }
        }

        // Aktualizace termínů – přepiš všechny (kaskáda smaže odpovědi nebudeme, odpovědi jsou v jine tabulce)
        // POZN: Odpovedi uzivatelu na stare terminy zustanou (cizi klic termin_id je volny bez FK).
        $dt_created = TimezoneHelper::getCzechDateTime();
        // Posbirej ID existujicich terminu
        $stmtOldTerms = $db->prepare("SELECT id FROM `" . TBL_PLAN_UDALOSTI_TERMINY . "` WHERE udalost_id = ?");
        $stmtOldTerms->execute([$id]);
        $oldTermIds = array_column($stmtOldTerms->fetchAll(PDO::FETCH_ASSOC), 'id');

        // Rozhodni, ktere si smazat a ktere UPDATE/INSERT
        $inputTerms = is_array($input['terminy'] ?? null) ? $input['terminy'] : [];
        $keptIds = [];
        $sql_upd_term = "UPDATE `" . TBL_PLAN_UDALOSTI_TERMINY . "`
                        SET dt_od = ?, dt_do = ?, poradi = ?, poznamka = ?, kapacita = ?
                        WHERE id = ? AND udalost_id = ?";
        $sql_ins_term = "INSERT INTO `" . TBL_PLAN_UDALOSTI_TERMINY . "`
                        (udalost_id, dt_od, dt_do, poradi, poznamka, kapacita, dt_created)
                        VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt_upd_term = $db->prepare($sql_upd_term);
        $stmt_ins_term = $db->prepare($sql_ins_term);
        $poradi = 0;
        foreach ($inputTerms as $term) {
            if (empty($term['dt_od'])) continue;
            $termId = !empty($term['id']) && is_numeric($term['id']) ? (int)$term['id'] : null;
            $kapacita = isset($term['kapacita']) && $term['kapacita'] !== null && $term['kapacita'] !== '' ? (int)$term['kapacita'] : null;
            if ($termId && in_array($termId, $oldTermIds)) {
                $stmt_upd_term->execute([
                    $term['dt_od'],
                    $term['dt_do'] ?? null,
                    $poradi++,
                    $term['poznamka'] ?? null,
                    $kapacita,
                    $termId,
                    $id
                ]);
                $keptIds[] = $termId;
            } else {
                $stmt_ins_term->execute([
                    $id,
                    $term['dt_od'],
                    $term['dt_do'] ?? null,
                    $poradi++,
                    $term['poznamka'] ?? null,
                    $kapacita,
                    $dt_created
                ]);
            }
        }
        // Smaz ty, ktere nejsou v novem seznamu (zaroven smaze i odpovedi pokud existuje FK)
        $toDelete = array_diff($oldTermIds, $keptIds);
        if (!empty($toDelete)) {
            $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
            $stmt_del = $db->prepare("DELETE FROM `" . TBL_PLAN_UDALOSTI_TERMINY . "` WHERE id IN ($placeholders) AND udalost_id = ?");
            $stmt_del->execute(array_merge(array_values($toDelete), [$id]));
            // Smaz odpovedi na smazane terminy
            $stmt_del_resp = $db->prepare("DELETE FROM `" . TBL_PLAN_UDALOSTI_ODPOVEDI . "` WHERE termin_id IN ($placeholders)");
            $stmt_del_resp->execute(array_values($toDelete));
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Událost aktualizována'
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při aktualizaci události: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/update: " . $e->getMessage());
    }
}

/**
 * DELETE událost (hard delete)
 * POST planning/events/delete
 * Body: {token, username, id}
 */
function handle_planning_events_delete($input, $config) {
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
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID události']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        $db->beginTransaction();

        $sqlDelRecipients = "DELETE FROM " . TBL_PLAN_UDALOSTI_PRIJEMCI . " WHERE udalost_id = ?";
        $stmtDelRecipients = $db->prepare($sqlDelRecipients);
        $stmtDelRecipients->execute([$id]);

        $sqlDelResponses = "DELETE FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . " WHERE udalost_id = ?";
        $stmtDelResponses = $db->prepare($sqlDelResponses);
        $stmtDelResponses->execute([$id]);

        // POZNÁMKA: Termíny NEMAZAT ručně! Mají foreign key s ON DELETE CASCADE,
        // takže se smažou automaticky. Pokud bychom je mazali ručně, spustilo by se
        // DELETE trigger, který aktualizuje dt_od/dt_do v hlavní tabulce na NULL
        // (protože by nebyly žádné termíny) a to je zakázané (dt_od je NOT NULL).

        $notifSql = "SELECT id FROM " . TBL_NOTIFIKACE . " WHERE objekt_typ = ? AND objekt_id = ?";
        $stmtNotif = $db->prepare($notifSql);
        $stmtNotif->execute(['planning_event', $id]);
        $notifIds = $stmtNotif->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($notifIds)) {
            $placeholders = implode(',', array_fill(0, count($notifIds), '?'));
            $sqlDelRead = "DELETE FROM " . TBL_NOTIFIKACE_PRECTENI . " WHERE notifikace_id IN ($placeholders)";
            $stmtDelRead = $db->prepare($sqlDelRead);
            $stmtDelRead->execute($notifIds);

            $sqlDelNotif = "DELETE FROM " . TBL_NOTIFIKACE . " WHERE id IN ($placeholders)";
            $stmtDelNotif = $db->prepare($sqlDelNotif);
            $stmtDelNotif->execute($notifIds);
        }

        $sql = "DELETE FROM " . TBL_PLAN_UDALOSTI . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$id]);

        $db->commit();

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Událost smazána'
        ]);

    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při mazání události: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/delete: " . $e->getMessage());
    }
}

/**
 * SET ACTIVE stav události
 * POST planning/events/set-active
 * Body: {token, username, id, aktivni}
 */
function handle_planning_events_set_active($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $id = $input['id'] ?? null;
    $aktivni = $input['aktivni'] ?? null;

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID události']);
        return;
    }

    if ($aktivni === null || $aktivni === '') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí hodnota aktivni']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        $sql = "UPDATE " . TBL_PLAN_UDALOSTI . " SET aktivni = ? WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([(int)$aktivni, $id]);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => ((int)$aktivni === 1 ? 'Událost aktivována' : 'Událost deaktivována')
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při změně stavu události: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/set-active: " . $e->getMessage());
    }
}

/**
 * CALENDAR seznam udalosti pro prihlaseneho uzivatele
 * POST planning/events/calendar
 * Body: {token, username, year, month}
 */
function handle_planning_events_calendar($input, $config) {
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    $year = (int)($input['year'] ?? date('Y'));
    $month = (int)($input['month'] ?? date('n'));
    if ($month < 1 || $month > 12) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný měsíc']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $rangeStart = sprintf('%04d-%02d-01 00:00:00', $year, $month);
        $rangeEnd = date('Y-m-t 23:59:59', strtotime(sprintf('%04d-%02d-01', $year, $month)));

        $eventIds = [];

        $sqlTermIds = "SELECT DISTINCT udalost_id FROM `" . TBL_PLAN_UDALOSTI_TERMINY . "`
                      WHERE dt_od <= ? AND (dt_do IS NULL OR dt_do >= ?)";
        $stmtTermIds = $db->prepare($sqlTermIds);
        $stmtTermIds->execute([$rangeEnd, $rangeStart]);
        $termIds = $stmtTermIds->fetchAll(PDO::FETCH_COLUMN);

        $sqlEventIds = "SELECT id FROM " . TBL_PLAN_UDALOSTI . "
                        WHERE aktivni = 1 AND dt_od <= ? AND (dt_do IS NULL OR dt_do >= ?)";
        $stmtEventIds = $db->prepare($sqlEventIds);
        $stmtEventIds->execute([$rangeEnd, $rangeStart]);
        $baseIds = $stmtEventIds->fetchAll(PDO::FETCH_COLUMN);

        $eventIds = array_unique(array_merge($termIds ?: [], $baseIds ?: []));
        $eventIds = array_values(array_filter(array_map('intval', $eventIds)));

        if (empty($eventIds)) {
            http_response_code(200);
            echo json_encode(['status' => 'success', 'data' => []]);
            return;
        }

        $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
        $sqlEvents = "SELECT u.*, 
                      us.jmeno as autor_jmeno, 
                      us.prijmeni as autor_prijmeni,
                      us.email as autor_email,
                      us.telefon as autor_telefon
                      FROM " . TBL_PLAN_UDALOSTI . " u
                      LEFT JOIN " . TBL_UZIVATELE . " us ON us.id = u.autor_id
                      WHERE u.id IN ($placeholders) AND u.aktivni = 1";
        $stmtEvents = $db->prepare($sqlEvents);
        $stmtEvents->execute($eventIds);
        $events = $stmtEvents->fetchAll(PDO::FETCH_ASSOC);

        if (empty($events)) {
            http_response_code(200);
            echo json_encode(['status' => 'success', 'data' => []]);
            return;
        }

        $sqlTerms = "SELECT id, udalost_id, dt_od, dt_do, poradi, poznamka, kapacita
                     FROM `" . TBL_PLAN_UDALOSTI_TERMINY . "`
                     WHERE udalost_id IN ($placeholders)
                     ORDER BY poradi ASC, id ASC";
        $stmtTerms = $db->prepare($sqlTerms);
        $stmtTerms->execute($eventIds);
        $terms = $stmtTerms->fetchAll(PDO::FETCH_ASSOC);

        $termsByEvent = [];
        foreach ($terms as $term) {
            $termsByEvent[$term['udalost_id']][] = $term;
        }

        // ✅ Načíst počty accepted odpovědí pro všechny termíny
        $termIds = array_column($terms, 'id');
        $acceptedCounts = [];
        if (!empty($termIds)) {
            $termPlaceholders = implode(',', array_fill(0, count($termIds), '?'));
            $sqlAccepted = "SELECT termin_id, COUNT(*) as accepted_count 
                           FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . "
                           WHERE termin_id IN ($termPlaceholders) AND typ_odpovedi = 'accepted'
                           GROUP BY termin_id";
            $stmtAccepted = $db->prepare($sqlAccepted);
            $stmtAccepted->execute($termIds);
            $acceptedRows = $stmtAccepted->fetchAll(PDO::FETCH_ASSOC);
            foreach ($acceptedRows as $row) {
                $acceptedCounts[$row['termin_id']] = (int)$row['accepted_count'];
            }
        }

        $respByTerm = [];
        $sqlResp = "SELECT udalost_id, termin_id, typ_odpovedi, poznamka, dt_odpovedi
                    FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . "
                    WHERE user_id = ? AND udalost_id IN ($placeholders)";
        $stmtResp = $db->prepare($sqlResp);
        $stmtResp->execute(array_merge([$token_data['id']], $eventIds));
        $respRows = $stmtResp->fetchAll(PDO::FETCH_ASSOC);
        foreach ($respRows as $row) {
            if (!empty($row['termin_id'])) {
                $respByTerm[$row['termin_id']] = $row;
            }
        }

        $now = parseCzechDateTime(TimezoneHelper::getCzechDateTime());
        $filtered = [];
        
        // ✅ Načíst všechny příjemce pro události (pro frontend)
        $sqlPrijemci = "SELECT udalost_id, typ_prijemce, kod_role, user_id
                       FROM " . TBL_PLAN_UDALOSTI_PRIJEMCI . "
                       WHERE udalost_id IN ($placeholders)";
        $stmtPrijemci = $db->prepare($sqlPrijemci);
        $stmtPrijemci->execute($eventIds);
        $prijemciRows = $stmtPrijemci->fetchAll(PDO::FETCH_ASSOC);
        
        $prijemciByEvent = [];
        foreach ($prijemciRows as $row) {
            $prijemciByEvent[$row['udalost_id']][] = $row;
        }
        
        // ✅ Načíst detaily uživatelů pro příjemce typu 'user'
        $userIds = array_values(array_unique(array_filter(
            array_map(fn($r) => $r['user_id'], 
                array_filter($prijemciRows, fn($r) => $r['typ_prijemce'] === 'user' && !empty($r['user_id'])))
        )));
        
        $userDetails = [];
        if (!empty($userIds)) {
            $userPlaceholders = implode(',', array_fill(0, count($userIds), '?'));
            $sqlUsers = "SELECT id, username, jmeno, prijmeni FROM " . TBL_UZIVATELE . " WHERE id IN ($userPlaceholders)";
            $stmtUsers = $db->prepare($sqlUsers);
            $stmtUsers->execute($userIds);
            $usersData = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
            foreach ($usersData as $u) {
                $userDetails[$u['id']] = $u;
            }
        }
        
        foreach ($events as $event) {
            if (!isUserRecipientForEvent($db, $event, $token_data['id'])) {
                continue;
            }

            // ✅ Můj přehled/kalendář: příjemce vidí událost až po odeslání planning notifikace.
            // Organizátor (autor) ji vidí vždy.
            $isAuthor = ((int)($event['autor_id'] ?? 0) === (int)$token_data['id']);
            if (!$isAuthor && !hasPlanningEventNotificationForUser($db, (int)$event['id'], (int)$token_data['id'])) {
                continue;
            }

            $eventTerms = $termsByEvent[$event['id']] ?? [];
            foreach ($eventTerms as &$term) {
                $termId = $term['id'];
                if (isset($respByTerm[$termId])) {
                    $term['moje_odpoved'] = $respByTerm[$termId];
                }

                $deadline = getEventResponseDeadline($event, $term);
                if ($deadline) {
                    $term['deadline'] = $deadline->format('Y-m-d H:i:s');
                    $term['can_change'] = $now ? ($now <= $deadline) : true;
                } else {
                    $term['deadline'] = null;
                    $term['can_change'] = true;
                }

                // ✅ Přidat informace o kapacitě a obsazenosti
                $term['kapacita'] = $term['kapacita'] !== null ? (int)$term['kapacita'] : null;
                $term['accepted_count'] = $acceptedCounts[$termId] ?? 0;
                $term['is_full'] = false;
                if ($term['kapacita'] !== null && $term['kapacita'] > 0) {
                    $term['is_full'] = ($term['accepted_count'] >= $term['kapacita']);
                }
            }
            unset($term);

            $event['terminy'] = $eventTerms;
            $event['hlavni_termin_id'] = !empty($eventTerms) ? (int)$eventTerms[0]['id'] : null;
            
            // ✅ Přidat příjemce události
            $eventPrijemci = $prijemciByEvent[$event['id']] ?? [];
            $event['prijemci'] = array_map(function($p) use ($userDetails) {
                if ($p['typ_prijemce'] === 'user' && $p['user_id'] && isset($userDetails[$p['user_id']])) {
                    $u = $userDetails[$p['user_id']];
                    return [
                        'typ' => 'user',
                        'id' => (int)$u['id'],
                        'username' => $u['username'],
                        'jmeno' => $u['jmeno'],
                        'prijmeni' => $u['prijmeni']
                    ];
                } else if ($p['typ_prijemce'] === 'role' && $p['kod_role']) {
                    return [
                        'typ' => 'role',
                        'kod_role' => $p['kod_role']
                    ];
                } else {
                    return null;
                }
            }, $eventPrijemci);
            
            // Odfiltrovat null hodnoty
            $event['prijemci'] = array_values(array_filter($event['prijemci']));
            
            $filtered[] = $event;
        }

        http_response_code(200);
        echo json_encode(['status' => 'success', 'data' => $filtered]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání událostí: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/calendar: " . $e->getMessage());
    }
}

/**
 * Odpoved uzivatele na termin udalosti
 * POST planning/events/respond
 * Body: {token, username, id, termin_id, typ_odpovedi, poznamka?}
 */
function handle_planning_events_respond($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $eventId = $input['id'] ?? null;
    $terminId = $input['termin_id'] ?? null;
    $typOdpovedi = $input['typ_odpovedi'] ?? '';
    $poznamka = $input['poznamka'] ?? null;

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$eventId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí ID události']);
        return;
    }

    if (!in_array($typOdpovedi, ['accepted', 'declined'], true)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný typ odpovědi']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        $sqlEvent = "SELECT * FROM " . TBL_PLAN_UDALOSTI . " WHERE id = ? AND aktivni = 1";
        $stmtEvent = $db->prepare($sqlEvent);
        $stmtEvent->execute([$eventId]);
        $event = $stmtEvent->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Událost nenalezena']);
            return;
        }

        if (!isUserRecipientForEvent($db, $event, $token_data['id'])) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Nejste příjemcem události']);
            return;
        }

        // Pozn.: guardy podle typ_odpovedi/vyzaduje_odpoved zameřene; akceptace/odmitnuti
        // je mozne pro libovolnou udalost, ktere je uzivatel prijemcem.

        // VZDY vyzaduj konkretni termin_id - vsechny terminy jsou samostatne entity
        $numericTerminId = is_numeric($terminId) ? (int)$terminId : 0;
        if ($numericTerminId <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Chybí termin_id']);
            return;
        }
        $sqlTerm = "SELECT * FROM `" . TBL_PLAN_UDALOSTI_TERMINY . "` WHERE id = ? AND udalost_id = ?";
        $stmtTerm = $db->prepare($sqlTerm);
        $stmtTerm->execute([$numericTerminId, $eventId]);
        $term = $stmtTerm->fetch(PDO::FETCH_ASSOC);
        if (!$term) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Termín nenalezen']);
            return;
        }
        $terminId = (int)$term['id'];

        $deadline = getEventResponseDeadline($event, $term);
        $now = parseCzechDateTime(TimezoneHelper::getCzechDateTime());
        if ($deadline && $now && $now > $deadline) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Změna rozhodnutí už není možná']);
            return;
        }

        // ✅ KONTROLA KAPACITY TERMÍNU při akceptaci (accepted)
        if ($typOdpovedi === 'accepted' && $term['kapacita'] !== null && $term['kapacita'] > 0) {
            // Spočítat aktuální počet accepted odpovědí (kromě aktuálního uživatele)
            $sqlCountAccepted = "SELECT COUNT(*) FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . " 
                                WHERE termin_id = ? AND typ_odpovedi = 'accepted' AND user_id != ?";
            $stmtCount = $db->prepare($sqlCountAccepted);
            $stmtCount->execute([$terminId, $token_data['id']]);
            $currentAccepted = (int)$stmtCount->fetchColumn();
            
            // Zkontrolovat, zda ještě je volné místo
            if ($currentAccepted >= $term['kapacita']) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error', 
                    'message' => 'Termín je plně obsazen',
                    'detail' => sprintf('Kapacita: %d/%d', $currentAccepted, $term['kapacita'])
                ]);
                return;
            }
        }

        $dtOdpovedi = TimezoneHelper::getCzechDateTime();
        $sql = "INSERT INTO " . TBL_PLAN_UDALOSTI_ODPOVEDI . "
                (udalost_id, termin_id, user_id, typ_odpovedi, poznamka, dt_odpovedi)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE typ_odpovedi = VALUES(typ_odpovedi), poznamka = VALUES(poznamka), dt_odpovedi = VALUES(dt_odpovedi)";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $eventId,
            $terminId,
            $token_data['id'],
            $typOdpovedi,
            $poznamka,
            $dtOdpovedi
        ]);

        // ✅ Přepočítat aktuální accepted_count pro termín
        $sqlAcceptedCount = "SELECT COUNT(*) FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . " 
                            WHERE termin_id = ? AND typ_odpovedi = 'accepted'";
        $stmtAcceptedCount = $db->prepare($sqlAcceptedCount);
        $stmtAcceptedCount->execute([$terminId]);
        $acceptedCount = (int)$stmtAcceptedCount->fetchColumn();

        // ✅ Zjistit, zda je termín plný
        $isFull = false;
        if ($term['kapacita'] !== null && $term['kapacita'] > 0) {
            $isFull = ($acceptedCount >= $term['kapacita']);
        }

        // 🔔 ODESLAT NOTIFIKACI ORGANIZÁTOROVI (pouze in-app, BEZ emailu)
        $organizatorId = (int)$event['autor_id'];
        if ($organizatorId && $organizatorId !== $token_data['id']) {
            // Načíst jméno respondenta
            $sqlRespondent = "SELECT CONCAT(jmeno, ' ', prijmeni) as full_name FROM " . TBL_UZIVATELE . " WHERE id = ?";
            $stmtRespondent = $db->prepare($sqlRespondent);
            $stmtRespondent->execute([$token_data['id']]);
            $respondentData = $stmtRespondent->fetch(PDO::FETCH_ASSOC);
            $respondentName = $respondentData ? $respondentData['full_name'] : 'Uživatel';
            
            // Formátovat datum termínu
            $terminDate = formatCzechDateTime($term['dt_od']);
            
            $actionText = $typOdpovedi === 'accepted' ? 'přijal' : 'odmítl';
            $nadpis = sprintf('%s %s termín: %s', $respondentName, $actionText, $event['nazev']);
            $zprava = sprintf('%s %s termín události "%s" (%s)', 
                $respondentName, 
                $actionText, 
                $event['nazev'], 
                $terminDate
            );
            
            if ($poznamka) {
                $zprava .= "\nPoznámka: " . $poznamka;
            }

            try {
                createNotification($db, [
                    ':typ' => 'PLANNING_EVENT_RESPONSE',
                    ':nadpis' => $nadpis,
                    ':zprava' => $zprava,
                    ':data_json' => json_encode([
                        'event_id' => $eventId,
                        'termin_id' => $terminId,
                        'respondent_id' => $token_data['id'],
                        'respondent_name' => $respondentName,
                        'response_type' => $typOdpovedi,
                        'poznamka' => $poznamka
                    ]),
                    ':od_uzivatele_id' => $token_data['id'],
                    ':pro_uzivatele_id' => $organizatorId,
                    ':prijemci_json' => null,
                    ':pro_vsechny' => 0,
                    ':priorita' => 'normal',
                    ':kategorie' => 'planning',
                    ':odeslat_email' => 0, // ❌ BEZ EMAILU
                    ':objekt_typ' => 'planning_event_response',
                    ':objekt_id' => $eventId,
                    ':dt_expires' => null,
                    ':dt_created' => TimezoneHelper::getCzechDateTime(),
                    ':aktivni' => 1
                ]);
            } catch (Exception $notifyEx) {
                // Selhání notifikace nesmí zablokovat uložení odpovědi.
                error_log('[Planning] Organizer notification failed in events/respond: ' . $notifyEx->getMessage());
            }
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => $typOdpovedi === 'accepted' ? 'Termín potvrzen' : 'Termín odmítnut',
            'data' => [
                'udalost_id' => (int)$eventId,
                'termin_id' => (int)$terminId,
                'typ_odpovedi' => $typOdpovedi,
                'poznamka' => $poznamka,
                'dt_odpovedi' => $dtOdpovedi,
                'accepted_count' => $acceptedCount,
                'is_full' => $isFull
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při ukládání odpovědi: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/respond: " . $e->getMessage());
    }
}

/**
 * Seznam odpovedi na udalosti (pro admin tabulku)
 * POST planning/events/responses/list
 * Body: {token, username, ids: [1,2,3]}
 */
function handle_planning_events_responses_list($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $ids = $input['ids'] ?? [];

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    if (!is_array($ids) || empty($ids)) {
        http_response_code(200);
        echo json_encode(['status' => 'success', 'data' => []]);
        return;
    }

    $eventIds = array_values(array_filter(array_map('intval', $ids)));
    if (empty($eventIds)) {
        http_response_code(200);
        echo json_encode(['status' => 'success', 'data' => []]);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
        $sql = "SELECT o.udalost_id, o.termin_id, o.user_id, o.typ_odpovedi, o.poznamka, o.dt_odpovedi,
                       u.jmeno, u.prijmeni, u.email, u.telefon,
                       t.dt_od, t.dt_do, t.poradi
                FROM " . TBL_PLAN_UDALOSTI_ODPOVEDI . " o
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = o.user_id
                LEFT JOIN `" . TBL_PLAN_UDALOSTI_TERMINY . "` t ON t.id = o.termin_id
                WHERE o.udalost_id IN ($placeholders)
                ORDER BY o.udalost_id, t.poradi ASC, o.dt_odpovedi DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($eventIds);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $grouped = [];
        foreach ($rows as $row) {
            $eventId = (int)$row['udalost_id'];
            if (!isset($grouped[$eventId])) {
                $grouped[$eventId] = [];
            }
            $grouped[$eventId][] = $row;
        }

        http_response_code(200);
        echo json_encode(['status' => 'success', 'data' => $grouped]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání odpovědí: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/responses/list: " . $e->getMessage());
    }
}

// ==========================================
// HELPER ENDPOINTY - NAČTENÍ PŘÍJEMCŮ
// ==========================================

/**
 * GET seznam aktivních rolí pro výběr příjemců
 * POST planning/recipients/roles
 * Body: {token, username}
 */
function handle_planning_recipients_roles($input, $config) {
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        $sql = "SELECT id, kod_role, nazev_role, Popis 
                FROM " . TBL_ROLE . " 
                WHERE aktivni = 1 
                ORDER BY nazev_role ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $roles,
            'count' => count($roles)
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání rolí: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in recipients/roles: " . $e->getMessage());
    }
}

/**
 * GET seznam aktivních uživatelů pro výběr příjemců
 * POST planning/recipients/users
 * Body: {token, username}
 */
function handle_planning_recipients_users($input, $config) {
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        $sql = "SELECT id, jmeno, prijmeni, email 
                FROM " . TBL_UZIVATELE . " 
                WHERE aktivni = 1 
                ORDER BY prijmeni ASC, jmeno ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $users,
            'count' => count($users)
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání uživatelů: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in recipients/users: " . $e->getMessage());
    }
}

// ==========================================
// 🆕 MANUÁLNÍ ODESLÁNÍ NOTIFIKACÍ
// ==========================================

/**
 * Manuální odeslání notifikací pro událost
 * POST planning/events/send-notifications
 * Body: {token, username, event_id}
 * 
 * Odesílá email notifikace s detaily události a termíny všem příjemcům.
 * Volá se manuálně z adminu přes tlačítko "Odeslat notifikace".
 */
function handle_planning_events_send_notifications($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $eventId = $input['event_id'] ?? null;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$eventId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí event_id']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
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

        // Načíst událost
        $sqlEvent = "SELECT * FROM " . TBL_PLAN_UDALOSTI . " WHERE id = ?";
        $stmtEvent = $db->prepare($sqlEvent);
        $stmtEvent->execute([$eventId]);
        $event = $stmtEvent->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Událost nenalezena']);
            return;
        }

        // ⚠️ KONTROLA: Nelze odesílat notifikace pro disabled událost
        if (!$event['aktivni']) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Nelze odesílat notifikace pro neaktivní událost']);
            return;
        }

        $authorId = (int)($event['autor_id'] ?? 0);
        $actorId = (int)($token_data['id'] ?? 0);

        // Upozornění: pokud odesílá jiný uživatel než organizátor, akci povolíme,
        // ale vrátíme warning (uživatel má přístup do administrace plánování).
        $sentByNonAuthor = ($authorId !== $actorId);
        if ($sentByNonAuthor) {
            error_log("[Planning] Manual send-notifications by non-author: event_id={$eventId}, actor_id={$actorId}, author_id={$authorId}");
        }

        error_log("[Planning] Manual send-notifications: event_id={$eventId}, actor_id={$actorId}, author_id={$authorId}");

        // Načíst termíny
        $sqlTerminy = "SELECT * FROM " . TBL_PLAN_UDALOSTI_TERMINY . " WHERE udalost_id = ? ORDER BY poradi ASC, dt_od ASC";
        $stmtTerminy = $db->prepare($sqlTerminy);
        $stmtTerminy->execute([$eventId]);
        $terminy = $stmtTerminy->fetchAll(PDO::FETCH_ASSOC);

        // 📊 Spočítat statistiku příjemců (pro message)
        $sqlStats = "SELECT 
                        SUM(CASE WHEN typ_prijemce = 'role' THEN 1 ELSE 0 END) as roles_count,
                        SUM(CASE WHEN typ_prijemce = 'user' THEN 1 ELSE 0 END) as users_count,
                        SUM(CASE WHEN typ_prijemce = 'all' THEN 1 ELSE 0 END) as all_count
                     FROM " . TBL_PLAN_UDALOSTI_PRIJEMCI . " 
                     WHERE udalost_id = ?";
        $stmtStats = $db->prepare($sqlStats);
        $stmtStats->execute([$eventId]);
        $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);
        $rolesCount = (int)($stats['roles_count'] ?? 0);
        $usersCount = (int)($stats['users_count'] ?? 0);
        $allCount = (int)($stats['all_count'] ?? 0);

        // Vytvořit notifikace (IN-APP vždy, EMAIL pokud je možné)
        $result = sendPlanningEventNotifications($db, $event, $terminy, $authorId);

        if (($result['count'] ?? 0) <= 0) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Notifikace nebyly odeslány žádnému příjemci. Zkontrolujte příjemce události.',
                'data' => $result
            ]);
            return;
        }

        // 📝 Sestavit message podle statistiky
        $parts = [];
        if ($rolesCount > 0) {
            $parts[] = sprintf('%d rol%s', $rolesCount, $rolesCount == 1 ? 'i' : 'ím');
        }
        if ($usersCount > 0) {
            $parts[] = sprintf('%d konkrétn%s uživatel%s', 
                $usersCount, 
                $usersCount == 1 ? 'ímu' : 'ím',
                $usersCount == 1 ? 'i' : 'ům'
            );
        }
        if ($allCount > 0) {
            $parts[] = 'všem uživatelům';
        }
        
        $recipientsInfo = !empty($parts) ? implode(' a ', $parts) : 'žádným příjemcům';
        
        $message = sprintf('Notifikace odeslány %d uživatel%s (%s)', 
            $result['count'],
            $result['count'] == 1 ? 'i' : 'ům',
            $recipientsInfo
        );

        $message .= sprintf(', e-mail odeslán %d×', (int)($result['email_sent_count'] ?? 0));

        $warning = null;
        if ($sentByNonAuthor) {
            $warning = 'Notifikace byly odeslány uživatelem, který není organizátor události.';
            $message = 'Upozornění: ' . $warning . ' ' . $message;
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'data' => $result,
            'warning' => $warning
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při odesílání notifikací: ' . $e->getMessage()
        ]);
        error_log("[Planning] Exception in events/send-notifications: " . $e->getMessage());
    }
}

/**
 * Helper funkce pro odeslání email notifikací o události
 * 
 * @param PDO $db
 * @param array $event Data události
 * @param array $terminy Seznam termínů
 * @param int $organizatorId ID organizátora
 * @return array ['count' => int, 'recipients' => array]
 */
function sendPlanningEventNotifications($db, $event, $terminy, $organizatorId) {
    // Načíst jméno organizátora
    $sqlOrg = "SELECT CONCAT(jmeno, ' ', prijmeni) as full_name FROM " . TBL_UZIVATELE . " WHERE id = ?";
    $stmtOrg = $db->prepare($sqlOrg);
    $stmtOrg->execute([$organizatorId]);
    $orgData = $stmtOrg->fetch(PDO::FETCH_ASSOC);
    $organizatorName = $orgData ? $orgData['full_name'] : 'Neznámý organizátor';

    // Načíst příjemce (role + konkrétní uživatelé)
    $explicitRecipients = getPlanningRecipients($db, $event['id'], 'udalost');
    
    // Načíst globální nastavení hierarchie
    $globalSettings = getPlanningGlobalSettings($db);
    
    // Pokud je zapnuta hierarchie → získat příjemce i z hierarchie
    $hierarchyRecipients = [];
    if ($globalSettings['use_hierarchy']) {
        $hierarchyResult = resolveHierarchyNotificationRecipients(
            $db,
            'PLANNING_EVENT_CREATED',
            [
                'record_id' => $event['id'],
                'nazev' => $event['nazev'],
                'autor_id' => $organizatorId
            ],
            $globalSettings['hierarchy_profile_id']
        );
        
        if ($hierarchyResult && isset($hierarchyResult['recipients']) && !empty($hierarchyResult['recipients'])) {
            $hierarchyRecipients = $hierarchyResult['recipients'];
        }
    }
    
    // Merge příjemců
    $allRecipients = mergeRecipients($explicitRecipients, $hierarchyRecipients);
    
    // Načíst FRONTEND_BASE_URL z .env (bez hardcoded domény)
    $frontendBaseUrl = $_ENV['FRONTEND_BASE_URL'] ?? '/dev/eeo-v2';
    
    // Sestavit link na událost (otevře postranní panel)
    $eventLink = $frontendBaseUrl . '?eventId=' . $event['id'] . '&openPanel=true';
    
    // Načíst email šablonu (volitelně - in-app notifikace nesmí selhat kvůli chybějící šabloně)
    $sqlTemplate = "SELECT * FROM 25_notifikace_sablony WHERE typ = 'PLANNING_EVENT_CREATED' AND aktivni = 1 LIMIT 1";
    $stmtTemplate = $db->prepare($sqlTemplate);
    $stmtTemplate->execute();
    $template = $stmtTemplate->fetch(PDO::FETCH_ASSOC);

    if (!$template || empty($template['email_telo']) || empty($template['email_predmet'])) {
        $template = null;
        error_log('[Planning] Email template PLANNING_EVENT_CREATED not available - will send IN-APP only');
    }
    
    // Formátovat termíny pro email (HTML sekce)
    $terminyHtml = buildTermsSectionHtml($terminy);
    
    $sentCount = 0;
    $emailSentCount = 0;
    $recipientsList = [];
    $skippedNoEmail = 0;
    $skippedMissingUser = 0;
    $failedCreateNotification = 0;
    $totalTargets = count($allRecipients);
    
    // Odeslat každému příjemci
    foreach ($allRecipients as $recipient) {
        // Načíst data příjemce
        $sqlUser = "SELECT id, email, jmeno, prijmeni FROM " . TBL_UZIVATELE . " WHERE id = ?";
        $stmtUser = $db->prepare($sqlUser);
        $stmtUser->execute([$recipient['user_id']]);
        $userData = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$userData) {
            $skippedMissingUser++;
            error_log('[Planning] Recipient user not found, user_id=' . (int)$recipient['user_id']);
            continue;
        }
        $hasEmail = !empty($userData['email']);
        $recipientName = trim($userData['jmeno'] . ' ' . $userData['prijmeni']);
        if ($recipientName === '') {
            $recipientName = 'Uživatel #' . (int)$userData['id'];
        }
        
        // Nahradit placeholdery v emailu (jen pokud je šablona dostupná)
        $emailBody = null;
        $emailSubject = null;
        if ($template) {
            $emailBody = $template['email_telo'];
            $emailBody = str_replace('{recipient_name}', htmlspecialchars($recipientName), $emailBody);
            $emailBody = str_replace('{event_title}', htmlspecialchars($event['nazev']), $emailBody);
            // ✅ POPIS: Zachovat HTML formatting (email je HTML dokument)
            $emailBody = str_replace('{event_description}', $event['popis'] ?? '', $emailBody);
            $emailBody = str_replace('{organizer_name}', htmlspecialchars($organizatorName), $emailBody);
            $emailBody = str_replace('{event_date}', formatCzechDate($event['dt_od']), $emailBody);
            $emailBody = str_replace('{event_link}', $eventLink, $emailBody);
            $emailBody = str_replace('{terms_section}', $terminyHtml, $emailBody);

            $emailSubject = $template['email_predmet'];
            $emailSubject = str_replace('{event_title}', $event['nazev'], $emailSubject);
        }
        
        // ✅ ZACHOVAT HTML formátování pro in-app notifikaci
        $htmlPopis = '';
        if (!empty($event['popis'])) {
            // Zachovat HTML tagy pro formátování (b, strong, i, em, u, br, ul, ol, li)
            $htmlPopis = strip_tags($event['popis'], '<b><strong><i><em><u><br><ul><ol><li>');
            // Odstranit nadbytečné prázdné řádky
            $htmlPopis = preg_replace('/(<br\s*\/?>){3,}/', '<br><br>', $htmlPopis);
            $htmlPopis = trim($htmlPopis);
        }
        
        // Vytvořit notifikaci (IN-APP + EMAIL)
        $notifikaceId = createNotification($db, [
            ':typ' => 'PLANNING_EVENT_CREATED',
            ':nadpis' => $event['nazev'],
            ':zprava' => $htmlPopis,
            ':data_json' => json_encode([
                'event_id' => $event['id'],
                'nazev' => $event['nazev'],
                'organizator' => $organizatorName,
                'dt_od' => $event['dt_od'],
                'terminy' => $terminy
            ]),
            ':od_uzivatele_id' => $organizatorId,
            ':pro_uzivatele_id' => $recipient['user_id'],
            ':prijemci_json' => null,
            ':pro_vsechny' => 0,
            ':priorita' => 'normal',
            ':kategorie' => 'planning',
            ':odeslat_email' => $hasEmail ? 1 : 0,
            ':objekt_typ' => 'planning_event',
            ':objekt_id' => $event['id'],
            ':dt_expires' => null, // ❌ PLANNING notifikace NEVYPRŠUJÍ automaticky
            ':dt_created' => TimezoneHelper::getCzechDateTime(),
            ':aktivni' => 1
        ]);

        if (!$notifikaceId) {
            $failedCreateNotification++;
            error_log('[Planning] createNotification failed for user_id=' . (int)$recipient['user_id'] . ', event_id=' . (int)$event['id']);
            continue;
        }

        $sentCount++;

        // 📧 ODESLAT EMAIL - použít existující funkci z notificationHandlers.php
        $emailSent = false;
        if ($hasEmail && $template && $emailSubject !== null && $emailBody !== null) {
            $emailResult = sendNotificationEmail($db, $recipient['user_id'], $emailSubject, $emailBody);
            $emailSent = $emailResult['ok'] ?? false;

            // Aktualizovat flag email_odeslan v DB
            if ($emailSent) {
                $sqlUpdateEmail = "UPDATE " . TBL_NOTIFIKACE . " 
                                  SET email_odeslan = 1, email_odeslan_kdy = NOW() 
                                  WHERE id = ?";
                $stmtUpdateEmail = $db->prepare($sqlUpdateEmail);
                $stmtUpdateEmail->execute([$notifikaceId]);
                $emailSentCount++;
            }
        } else if (!$hasEmail) {
            $skippedNoEmail++;
        }

        $recipientsList[] = [
            'user_id' => $recipient['user_id'],
            'email' => $userData['email'] ?? null,
            'name' => $recipientName,
            'email_sent' => $emailSent,
            'notification_created' => true
        ];
    }

    return [
        'count' => $sentCount,
        'email_sent_count' => $emailSentCount,
        'recipients' => $recipientsList,
        'total_targets' => $totalTargets,
        'skipped_no_email' => $skippedNoEmail,
        'skipped_missing_user' => $skippedMissingUser,
        'failed_create_notification' => $failedCreateNotification
    ];
}

/**
 * Sestaví HTML sekci s termíny pro email
 */
function buildTermsSectionHtml($terminy) {
    if (empty($terminy)) {
        return '<p style="color: #6b7280; font-size: 14px;">Žádné termíny nebyly zadány.</p>';
    }
    
    $html = '<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f0fdf4; border: 2px solid #bbf7d0; margin-bottom: 30px;">';
    $html .= '<tr><td style="padding: 20px;">';
    $html .= '<h2 style="margin: 0 0 15px 0; color: #15803d; font-size: 18px; font-weight: 700; font-family: Arial, sans-serif;">📅 Dostupné termíny</h2>';
    
    foreach ($terminy as $idx => $termin) {
        $dtOd = formatCzechDateTime($termin['dt_od']);
        $dtDo = !empty($termin['dt_do']) ? ' - ' . formatCzechDateTime($termin['dt_do']) : '';
        $kapacita = '';
        if ($termin['kapacita']) {
            $kapacita = ' <span style="color: #059669; font-weight: 600;">(Kapacita: ' . $termin['kapacita'] . ' míst)</span>';
        }
        $poznamka = !empty($termin['poznamka']) ? '<br><em style="color: #6b7280; font-size: 13px;">' . htmlspecialchars($termin['poznamka']) . '</em>' : '';
        
        $html .= '<p style="margin: 10px 0; font-size: 14px; color: #1f2937; font-family: Arial, sans-serif;">';
        $html .= '<strong>Termín ' . ($idx + 1) . ':</strong> ' . $dtOd . $dtDo . $kapacita . $poznamka;
        $html .= '</p>';
    }
    
    $html .= '</td></tr></table>';
    return $html;
}

/**
 * Formátuje datum do češtiny
 */
function formatCzechDate($dateStr) {
    if (!$dateStr) return '';
    $date = new DateTime($dateStr);
    $months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
    return $date->format('j') . '. ' . $months[(int)$date->format('n') - 1] . ' ' . $date->format('Y');
}

/**
 * Formátuje datum a čas do češtiny
 */
function formatCzechDateTime($dateStr) {
    if (!$dateStr) return '';
    $date = new DateTime($dateStr);
    return formatCzechDate($dateStr) . ' v ' . $date->format('H:i');
}

?>
