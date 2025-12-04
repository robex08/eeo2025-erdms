<?php
/**
 * USER PROFILE ENDPOINT - ENRICHED DATA
 * 
 * Endpoint: /user/profile
 * Request: { "token": "...", "username": "...", "user_id": 100 }
 * Response: Kompletní profil s obohacenými daty včetně statistik
 * 
 * PHP 5.6 / MySQL 5.5 Compatible
 * 
 * ROZDÍL OPROTI /user/detail:
 * - Response wrappnutý v { status: "ok", data: {...} }
 * - Organizace obsahuje VŠECHNA pole (včetně web, adresa, atd.)
 * - Opravený SQL dotaz pro statistiky
 */

/**
 * Handle user profile with enriched data
 */
function handle_user_profile($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'err' => 'Neplatný nebo chybějící token',
            'code' => 401
        ));
        return;
    }
    
    // Ověření username
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'err' => 'Username z tokenu neodpovídá username z požadavku',
            'code' => 401
        ));
        return;
    }
    
    // Pokud není poslán user_id, použij ID z tokenu (vlastní profil)
    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : $token_data['id'];
    
    if (!$user_id || $user_id <= 0) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'err' => 'Chybí nebo neplatné user_id',
            'code' => 400
        ));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Update last activity
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id'], PDO::PARAM_INT);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal
        }
        
        // 1. Načíst kompletní detail uživatele
        if (!isset($queries['user_detail_full'])) {
            http_response_code(500);
            echo json_encode(array(
                'status' => 'error',
                'err' => 'Query user_detail_full není definován',
                'code' => 500
            ));
            return;
        }
        
        $stmt = $db->prepare($queries['user_detail_full']);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(array(
                'status' => 'error',
                'err' => 'Uživatel nebyl nalezen',
                'code' => 404
            ));
            return;
        }
        
        // 2. Sestavit response strukturu
        $response = array(
            'uzivatel_id' => $user['uzivatel_id'],
            'login' => $user['login'],
            'username' => $user['username'],
            'jmeno' => $user['jmeno'],
            'prijmeni' => $user['prijmeni'],
            'email' => $user['email'],
            'telefon' => $user['telefon'],
            'titul_pred' => $user['titul_pred'],
            'titul_za' => $user['titul_za'],
            'aktivni' => (int)$user['aktivni'],
            'dt_vytvoreni' => $user['dt_vytvoreni'],
            'dt_aktualizace' => $user['dt_aktualizace'],
            'dt_posledni_aktivita' => $user['dt_posledni_aktivita']
        );
        
        // 3. Usek jako OBJEKT
        if ($user['usek_id']) {
            $response['usek'] = array(
                'id' => (int)$user['usek_id'],
                'usek_nazev' => $user['usek_nazev'],
                'usek_zkr' => $user['usek_zkratka']
            );
        } else {
            $response['usek'] = null;
        }
        
        // 4. Pozice jako OBJEKT
        if ($user['pozice_id']) {
            $response['pozice'] = array(
                'id' => (int)$user['pozice_id'],
                'nazev' => $user['pozice_nazev'],
                'parent_id' => $user['pozice_parent_id'] ? (int)$user['pozice_parent_id'] : null
            );
        } else {
            $response['pozice'] = null;
        }
        
        // 5. Lokalita jako OBJEKT
        if ($user['lokalita_id']) {
            $response['lokalita'] = array(
                'id' => (int)$user['lokalita_id'],
                'nazev' => $user['lokalita_nazev'],
                'typ' => $user['lokalita_typ'],
                'parent_id' => $user['lokalita_parent_id'] ? (int)$user['lokalita_parent_id'] : null
            );
        } else {
            $response['lokalita'] = null;
        }
        
        // 6. ORGANIZACE jako OBJEKT - VŠECHNA POLE VČETNĚ PRÁZDNÝCH
        if ($user['organizace_id']) {
            // PHP 5.6 compatible - vytvoření pole adresa z ulice_cislo + mesto + psc
            $adresa_parts = array();
            if (!empty($user['organizace_ulice_cislo'])) {
                $adresa_parts[] = $user['organizace_ulice_cislo'];
            }
            if (!empty($user['organizace_mesto'])) {
                $adresa_parts[] = $user['organizace_mesto'];
            }
            if (!empty($user['organizace_psc'])) {
                $adresa_parts[] = $user['organizace_psc'];
            }
            $adresa_combined = implode(', ', $adresa_parts);
            
            // PHP 5.6 compatible - hodnoty z DB (mohou být NULL nebo string)
            $response['organizace'] = array(
                'id' => (int)$user['organizace_id'],
                'nazev_organizace' => !empty($user['organizace_nazev']) ? $user['organizace_nazev'] : '',
                'zkratka' => !empty($user['organizace_zkratka']) ? $user['organizace_zkratka'] : '',
                'ico' => !empty($user['organizace_ico']) ? $user['organizace_ico'] : '',
                'dic' => !empty($user['organizace_dic']) ? $user['organizace_dic'] : '',
                'ulice_cislo' => !empty($user['organizace_ulice_cislo']) ? $user['organizace_ulice_cislo'] : '',
                'mesto' => !empty($user['organizace_mesto']) ? $user['organizace_mesto'] : '',
                'psc' => !empty($user['organizace_psc']) ? $user['organizace_psc'] : '',
                'adresa' => $adresa_combined,
                'zastoupeny' => !empty($user['organizace_zastoupeny']) ? $user['organizace_zastoupeny'] : '',
                'datova_schranka' => !empty($user['organizace_datova_schranka']) ? $user['organizace_datova_schranka'] : '',
                'email' => !empty($user['organizace_email']) ? $user['organizace_email'] : '',
                'telefon' => !empty($user['organizace_telefon']) ? $user['organizace_telefon'] : ''
            );
        } else {
            $response['organizace'] = null;
        }
        
        // 7. Nadřízený jako OBJEKT
        if (isset($user['nadrizeny_id']) && $user['nadrizeny_id']) {
            $response['nadrizeny'] = array(
                'id' => (int)$user['nadrizeny_id'],
                'cely_jmeno' => $user['nadrizeny_cely_jmeno']
            );
        } else {
            $response['nadrizeny'] = null;
        }
        
        // 8. Role s právy
        $roles = array();
        if (isset($queries['user_roles_with_rights'])) {
            $stmtRoles = $db->prepare($queries['user_roles_with_rights']);
            $stmtRoles->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmtRoles->execute();
            $rolesData = $stmtRoles->fetchAll();
            
            foreach ($rolesData as $role) {
                $rights = array();
                
                if (isset($queries['role_rights'])) {
                    $stmtRights = $db->prepare($queries['role_rights']);
                    $stmtRights->bindParam(':role_id', $role['id'], PDO::PARAM_INT);
                    $stmtRights->execute();
                    $rightsData = $stmtRights->fetchAll();
                    
                    foreach ($rightsData as $right) {
                        $rights[] = array(
                            'id' => (int)$right['id'],
                            'kod_prava' => $right['kod_prava'],
                            'popis' => $right['popis']
                        );
                    }
                }
                
                $roles[] = array(
                    'id' => (int)$role['id'],
                    'nazev_role' => $role['nazev_role'],
                    'popis' => $role['popis'],
                    'rights' => $rights
                );
            }
        }
        $response['roles'] = $roles;
        
        // 9. Přímá práva
        $direct_rights = array();
        if (isset($queries['user_direct_rights'])) {
            $stmtDirect = $db->prepare($queries['user_direct_rights']);
            $stmtDirect->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmtDirect->execute();
            $directData = $stmtDirect->fetchAll();
            
            foreach ($directData as $right) {
                $direct_rights[] = array(
                    'id' => (int)$right['id'],
                    'kod_prava' => $right['kod_prava'],
                    'popis' => $right['popis']
                );
            }
        }
        $response['direct_rights'] = $direct_rights;
        
        // 10. STATISTIKY OBJEDNÁVEK - OPRAVENÝ SQL
        $stats = array(
            'celkem' => 0,
            'aktivni' => 0,
            'zruseno_storno' => 0,
            'stavy' => array(
                'nova' => 0,
                'ke_schvaleni' => 0,
                'schvalena' => 0,
                'zamitnuta' => 0,
                'rozpracovana' => 0,
                'odeslana' => 0,
                'potvrzena' => 0,
                'uverejnena' => 0,
                'ceka_potvrzeni' => 0,
                'dokoncena' => 0,
                'zrusena' => 0,
                'smazana' => 0,
                'archivovano' => 0,
                'vecna_spravnost' => 0,
                'zkontrolovana' => 0
            )
        );
        
        // OPRAVENÝ SQL - správná tabulka 25a_objednavky + české stavy s diakritikou
        // PHP 5.6 compatible - používáme přímý název tabulky místo konstanty
        $sql_stats = "
            SELECT 
                COUNT(*) as celkem,
                SUM(CASE WHEN o.stav_objednavky IN ('NOVA', 'Nová') THEN 1 ELSE 0 END) as nova,
                SUM(CASE WHEN o.stav_objednavky IN ('KE_SCHVALENI', 'Ke schválení') THEN 1 ELSE 0 END) as ke_schvaleni,
                SUM(CASE WHEN o.stav_objednavky IN ('SCHVALENA', 'Schválená') THEN 1 ELSE 0 END) as schvalena,
                SUM(CASE WHEN o.stav_objednavky IN ('ZAMITNUTA', 'Zamítnutá') THEN 1 ELSE 0 END) as zamitnuta,
                SUM(CASE WHEN o.stav_objednavky IN ('ROZPRACOVANA', 'Rozpracovaná') THEN 1 ELSE 0 END) as rozpracovana,
                SUM(CASE WHEN o.stav_objednavky IN ('ODESLANA', 'Odeslaná') THEN 1 ELSE 0 END) as odeslana,
                SUM(CASE WHEN o.stav_objednavky IN ('POTVRZENA', 'Potvrzená') THEN 1 ELSE 0 END) as potvrzena,
                SUM(CASE WHEN o.stav_objednavky IN ('UVEREJNENA', 'Uveřejněná') THEN 1 ELSE 0 END) as uverejnena,
                SUM(CASE WHEN o.stav_objednavky IN ('CEKA_POTVRZENI', 'Čeká potvrzení', 'Čeká na potvrzení') THEN 1 ELSE 0 END) as ceka_potvrzeni,
                SUM(CASE WHEN o.stav_objednavky IN ('DOKONCENA', 'Dokončená') THEN 1 ELSE 0 END) as dokoncena,
                SUM(CASE WHEN o.stav_objednavky IN ('ZRUSENA', 'Zrušená', 'STORNO') THEN 1 ELSE 0 END) as zrusena,
                SUM(CASE WHEN o.stav_objednavky IN ('SMAZANA', 'Smazaná') THEN 1 ELSE 0 END) as smazana,
                SUM(CASE WHEN o.stav_objednavky IN ('ARCHIVOVANO', 'Archivováno') THEN 1 ELSE 0 END) as archivovano,
                SUM(CASE WHEN o.stav_objednavky IN ('VECNA_SPRAVNOST', 'Věcná správnost') THEN 1 ELSE 0 END) as vecna_spravnost,
                SUM(CASE WHEN o.stav_objednavky IN ('ZKONTROLOVANA', 'Zkontrolovaná') THEN 1 ELSE 0 END) as zkontrolovana
            FROM 25a_objednavky o
            WHERE o.uzivatel_id = :user_id AND o.aktivni = 1
        ";
        
        try {
            $stmtStats = $db->prepare($sql_stats);
            $stmtStats->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmtStats->execute();
            $statsData = $stmtStats->fetch();
            
            if ($statsData) {
                $stats['celkem'] = (int)$statsData['celkem'];
                
                // Jednotlivé stavy
                $stats['stavy']['nova'] = (int)$statsData['nova'];
                $stats['stavy']['ke_schvaleni'] = (int)$statsData['ke_schvaleni'];
                $stats['stavy']['schvalena'] = (int)$statsData['schvalena'];
                $stats['stavy']['zamitnuta'] = (int)$statsData['zamitnuta'];
                $stats['stavy']['rozpracovana'] = (int)$statsData['rozpracovana'];
                $stats['stavy']['odeslana'] = (int)$statsData['odeslana'];
                $stats['stavy']['potvrzena'] = (int)$statsData['potvrzena'];
                $stats['stavy']['uverejnena'] = (int)$statsData['uverejnena'];
                $stats['stavy']['ceka_potvrzeni'] = (int)$statsData['ceka_potvrzeni'];
                $stats['stavy']['dokoncena'] = (int)$statsData['dokoncena'];
                $stats['stavy']['zrusena'] = (int)$statsData['zrusena'];
                $stats['stavy']['smazana'] = (int)$statsData['smazana'];
                $stats['stavy']['archivovano'] = (int)$statsData['archivovano'];
                $stats['stavy']['vecna_spravnost'] = (int)$statsData['vecna_spravnost'];
                $stats['stavy']['zkontrolovana'] = (int)$statsData['zkontrolovana'];
                
                // Vypočítat agregáty
                $zruseno = $stats['stavy']['zrusena'] + $stats['stavy']['smazana'] + $stats['stavy']['archivovano'];
                $stats['zruseno_storno'] = $zruseno;
                $stats['aktivni'] = $stats['celkem'] - $zruseno;
            }
        } catch (Exception $e) {
            error_log("Chyba při načítání statistik profilu: " . $e->getMessage());
        }
        
        $response['statistiky_objednavek'] = $stats;
        
        // Finální response s wrappingem
        echo json_encode(array(
            'status' => 'ok',
            'data' => $response
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'err' => 'Chyba při načítání profilu: ' . $e->getMessage(),
            'code' => 500
        ));
    }
}

?>
