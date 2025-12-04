<?php
/**
 * USER DETAIL WITH ORDER STATISTICS HANDLER
 * 
 * Endpoint: action=user, operation=detail
 * Request: { "action": "user", "operation": "detail", "username": "...", "token": "...", "user_id": 100 }
 * Response: Kompletní detail uživatele včetně statistik objednávek
 * 
 * PHP 5.6 / MySQL 5.5 Compatible
 */

/**
 * Handle user detail with full statistics
 * 
 * @param array $input POST data
 * @param array $config DB konfigurace
 * @param array $queries SQL dotazy
 */
function handle_user_detail_with_statistics($input, $config, $queries) {
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
    
    // Ověření, že username z tokenu odpovídá username z požadavku
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'err' => 'Username z tokenu neodpovídá username z požadavku',
            'code' => 401
        ));
        return;
    }
    
    // user_id je povinný parametr
    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    
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
        
        // Update last activity pro autentifikovaného uživatele
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
        
        // 2. Sestavit strukturu podle specifikace
        $response = array(
            'uzivatel_id' => (int)$user['uzivatel_id'],
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
                'nazev' => $user['usek_nazev'],
                'zkratka' => $user['usek_zkratka'],
                'popis' => $user['usek_popis']
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
        
        // 6. Organizace jako OBJEKT s kompletními údaji
        if ($user['organizace_id']) {
            $response['organizace'] = array(
                'id' => (int)$user['organizace_id'],
                'nazev' => $user['organizace_nazev'],
                'ico' => $user['organizace_ico'],
                'dic' => $user['organizace_dic'],
                'ulice_cislo' => $user['organizace_ulice_cislo'],
                'mesto' => $user['organizace_mesto'],
                'psc' => $user['organizace_psc'],
                'zastoupeny' => $user['organizace_zastoupeny'],
                'datova_schranka' => $user['organizace_datova_schranka'],
                'email' => $user['organizace_email'],
                'telefon' => $user['organizace_telefon']
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
                
                // Načíst práva pro tuto roli
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
        
        // 9. Přímá práva (direct_rights)
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
        
        // 10. STATISTIKY OBJEDNÁVEK
        $stats = array(
            'celkem' => 0,
            'aktivni' => 0,
            'zruseno_storno' => 0,
            'stavy' => array(
                'NOVA' => 0,
                'KE_SCHVALENI' => 0,
                'SCHVALENA' => 0,
                'ZAMITNUTA' => 0,
                'ROZPRACOVANA' => 0,
                'ODESLANA' => 0,
                'POTVRZENA' => 0,
                'UVEREJNENA' => 0,
                'CEKA_POTVRZENI' => 0,
                'DOKONCENA' => 0,
                'ZRUSENA' => 0,
                'SMAZANA' => 0,
                'ARCHIVOVANO' => 0
            )
        );
        
        if (isset($queries['user_orders_statistics'])) {
            $stmtStats = $db->prepare($queries['user_orders_statistics']);
            $stmtStats->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmtStats->execute();
            $statsData = $stmtStats->fetch();
            
            if ($statsData) {
                $stats['celkem'] = (int)$statsData['celkem'];
                
                // Jednotlivé stavy (lowercase klíče z SQL)
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
        }
        
        $response['statistiky_objednavek'] = $stats;
        
        // Finální response
        echo json_encode(array(
            'status' => 'ok',
            'data' => $response
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'err' => 'Chyba při načítání detailu uživatele: ' . $e->getMessage(),
            'code' => 500
        ));
    }
}
