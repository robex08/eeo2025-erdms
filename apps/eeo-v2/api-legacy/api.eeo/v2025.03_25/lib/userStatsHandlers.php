<?php
/**
 * USER STATISTICS HANDLERS
 * 
 * Endpointy pro načítání statistik uživatelů (FA, OBJ, pokladna)
 * Pro mobilní dashboard - rychlý přehled aktivních uživatelů s jejich aktivitou
 * 
 * PHP 5.6 / MySQL 5.5 Compatible
 */

require_once 'dbconfig.php';

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

/**
 * Načte rozšířené statistiky pro aktivní uživatele
 * POST user/active-with-stats
 * 
 * Vrací seznam aktivních uživatelů (posledních 5 minut) s:
 * - Počet objednávek (celkem aktivních)
 * - Počet faktur (celkem aktivních)
 * - Aktuální zůstatek pokladny (pokud má přiřazenou)
 * 
 * @param array $input POST data
 * @param array $config DB konfigurace
 * @param array $queries SQL dotazy
 */
function handle_user_active_with_stats($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Neplatný nebo chybějící token',
            'code' => 'UNAUTHORIZED'
        ));
        return;
    }
    
    // Ověření, že username z tokenu odpovídá username z požadavku
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Username z tokenu neodpovídá username z požadavku',
            'code' => 'UNAUTHORIZED'
        ));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Update last activity pro autentifikovaného uživatele
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id'], PDO::PARAM_INT);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal
        }
        
        // Načíst aktivní uživatele (posledních 5 minut)
        $stmt = $db->prepare($queries['uzivatele_active_last_5_minutes']);
        $stmt->execute();
        $active_users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Pro každého uživatele načti statistiky
        $users_with_stats = array();
        
        foreach ($active_users as $user) {
            $user_id = (int)$user['id'];
            
            // 1. OBJEDNÁVKY - počet aktivních objednávek (aktuální rok, BEZ archivovaných)
            // Zahrnuje všechny role: vytvořil, garant, příkazce, schvalovatel
            // POUŽIJ: 25a_objednavky (NE 25_objednavky - DEPRECATED!)
            $stmt_obj = $db->prepare("
                SELECT COUNT(*) as pocet
                FROM 25a_objednavky
                WHERE (
                        uzivatel_id = :user_id 
                        OR garant_uzivatel_id = :user_id
                        OR prikazce_id = :user_id
                        OR schvalovatel_id = :user_id
                    )
                    AND aktivni = 1
                    AND stav_objednavky != 'ARCHIVOVANO'
                    AND YEAR(dt_objednavky) = YEAR(NOW())
            ");
            $stmt_obj->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_obj->execute();
            $obj_result = $stmt_obj->fetch(PDO::FETCH_ASSOC);
            $obj_count = (int)$obj_result['pocet'];
            
            // 2. FAKTURY - počet aktivních faktur (tabulka 25a_objednavky_faktury)
            // Zahrnuje faktury kde:
            // - uživatel fakturu vytvořil (vytvoril_uzivatel_id)
            // - uživatel potvrdil věcnou správnost (potvrdil_vecnou_spravnost_id)
            // - uživateli byla faktura předána (fa_predana_zam_id)
            // - uživatel má roli v objednávce (uzivatel_id, garant, příkazce, schvalovatel)
            $stmt_fa = $db->prepare("
                SELECT COUNT(DISTINCT f.id) as pocet
                FROM 25a_objednavky_faktury f
                INNER JOIN 25a_objednavky o ON f.objednavka_id = o.id
                WHERE (
                        f.vytvoril_uzivatel_id = :user_id 
                        OR f.potvrdil_vecnou_spravnost_id = :user_id
                        OR f.fa_predana_zam_id = :user_id
                        OR o.uzivatel_id = :user_id
                        OR o.garant_uzivatel_id = :user_id
                        OR o.prikazce_id = :user_id
                        OR o.schvalovatel_id = :user_id
                    )
                    AND f.aktivni = 1
                    AND o.aktivni = 1
                    AND o.stav_objednavky != 'ARCHIVOVANO'
                    AND YEAR(o.dt_objednavky) = YEAR(NOW())
            ");
            $stmt_fa->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_fa->execute();
            $fa_result = $stmt_fa->fetch(PDO::FETCH_ASSOC);
            $fa_count = (int)$fa_result['pocet'];
            
            // 3. POKLADNA - aktuální zůstatek (pokud má přiřazenou pokladnu)
            // Zjistíme nejnovější pokladní knihu uživatele
            $stmt_pokl = $db->prepare("
                SELECT 
                    pk.id,
                    CONCAT('PKL ', pk.cislo_pokladny, ' (', pk.rok, '-', LPAD(pk.mesic, 2, '0'), ')') as nazev,
                    pk.koncovy_stav
                FROM 25a_pokladni_knihy pk
                WHERE pk.uzivatel_id = :user_id 
                    AND pk.stav_knihy = 'aktivni'
                ORDER BY pk.rok DESC, pk.mesic DESC
                LIMIT 1
            ");
            $stmt_pokl->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_pokl->execute();
            $pokl_result = $stmt_pokl->fetch(PDO::FETCH_ASSOC);
            
            $pokl_zustatek = null;
            $pokl_nazev = null;
            
            if ($pokl_result) {
                $pokl_zustatek = (float)$pokl_result['koncovy_stav'];
                $pokl_nazev = $pokl_result['nazev'];
            }
            
            // Sestavit výstup
            $users_with_stats[] = array(
                'id' => $user_id,
                'username' => $user['username'],
                'cele_jmeno' => $user['cele_jmeno'],
                'dt_posledni_aktivita' => $user['dt_posledni_aktivita'],
                'stats' => array(
                    'objednavky' => $obj_count,
                    'faktury' => $fa_count,
                    'pokladna_zustatek' => $pokl_zustatek,
                    'pokladna_nazev' => $pokl_nazev
                )
            );
        }
        
        // Vrátit výsledek
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'data' => $users_with_stats,
            'count' => count($users_with_stats)
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání statistik uživatelů: ' . $e->getMessage(),
            'code' => 'DB_ERROR'
        ));
    }
}

?>
