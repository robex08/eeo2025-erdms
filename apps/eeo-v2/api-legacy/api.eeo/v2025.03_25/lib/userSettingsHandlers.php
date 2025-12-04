<?php
/**
 * USER SETTINGS HANDLERS
 * 
 * KRITICKÉ PRAVIDLO:
 * Backend NESMÍ modifikovat, transformovat ani mapovat strukturu dat.
 * Backend je pouze úložiště - načítá a ukládá JSON PŘESNĚ JAK JE.
 * Frontend určuje strukturu dat.
 * 
 * Endpoint: /user/settings
 * Methods: GET, POST
 * 
 * PHP 5.6 / MySQL 5.5 Compatible
 * 
 * DATABÁZOVÁ TABULKA: 25_uzivatel_nastaveni
 * - id, uzivatel_id, nastaveni_data (TEXT/JSON), nastaveni_verze, vytvoreno, upraveno
 */

/**
 * DEPRECATED - Výchozí nastavení nyní řeší frontend
 * Backend vrací null pokud uživatel nemá nastavení
 * 
 * @return array Výchozí nastavení
 */
function getVychoziNastaveni_DEPRECATED() {
    return array(
        'verze' => '1.0',
        'chovani_aplikace' => array(
            'zapamatovat_filtry' => true,
            'vychozi_sekce_po_prihlaseni' => 'orders',
            'vychozi_filtry_stavu_objednavek' => array(),
            'auto_sbalit_zamcene_sekce' => true
        ),
        'zobrazeni_dlazic' => array(
            'nova' => true,
            'ke_schvaleni' => true,
            'schvalena' => true,
            'zamitnuta' => true,
            'rozpracovana' => true,
            'odeslana_dodavateli' => true,
            'potvrzena_dodavatelem' => true,
            'k_uverejneni_do_registru' => true,
            'uverejnena' => true,
            'ceka_na_potvrzeni' => true,
            'ceka_se' => true,
            'vecna_spravnost' => true,
            'dokoncena' => true,
            'zrusena' => true,
            'smazana' => true,
            'archivovano' => true,
            's_fakturou' => true,
            's_prilohami' => true,
            'moje_objednavky' => true
        ),
        'export_csv' => array(
            'oddelovac' => 'semicolon',
            'vlastni_oddelovac' => '',
            'oddelovac_seznamu' => 'pipe',
            'vlastni_oddelovac_seznamu' => '',
            'sloupce' => array(
                'zakladni_identifikace' => array(
                    'id' => true,
                    'cislo_objednavky' => true
                ),
                'predmet_a_popis' => array(
                    'predmet' => true,
                    'poznamka' => false
                ),
                'stavy_a_workflow' => array(
                    'stav_objednavky' => true,
                    'stav_workflow' => false,
                    'stav_komentar' => false
                ),
                'datumy' => array(
                    'dt_objednavky' => true,
                    'dt_vytvoreni' => true,
                    'dt_schvaleni' => false,
                    'dt_odeslani' => false,
                    'dt_akceptace' => false,
                    'dt_zverejneni' => false,
                    'dt_predpokladany_termin_dodani' => false,
                    'dt_aktualizace' => false
                ),
                'financni_udaje' => array(
                    'max_cena_s_dph' => true,
                    'celkova_cena_bez_dph' => false,
                    'celkova_cena_s_dph' => true,
                    'financovani_typ' => false,
                    'financovani_typ_nazev' => false,
                    'financovani_lp_kody' => false,
                    'financovani_lp_nazvy' => false,
                    'financovani_lp_cisla' => false
                ),
                'lide' => array(
                    'objednatel' => true,
                    'objednatel_email' => false,
                    'objednatel_telefon' => false,
                    'garant' => false,
                    'garant_email' => false,
                    'garant_telefon' => false,
                    'prikazce' => false,
                    'schvalovatel' => false,
                    'vytvoril_uzivatel' => false
                ),
                'dodavatel' => array(
                    'dodavatel_nazev' => true,
                    'dodavatel_ico' => false,
                    'dodavatel_dic' => false,
                    'dodavatel_adresa' => false,
                    'dodavatel_zastoupeny' => false,
                    'dodavatel_kontakt_jmeno' => false,
                    'dodavatel_kontakt_email' => false,
                    'dodavatel_kontakt_telefon' => false
                ),
                'strediska_a_struktura' => array(
                    'strediska' => true,
                    'strediska_nazvy' => false,
                    'druh_objednavky_kod' => false,
                    'stav_workflow_kod' => false
                ),
                'polozky_objednavky' => array(
                    'pocet_polozek' => true,
                    'polozky_celkova_cena_s_dph' => true,
                    'polozky_popis' => false,
                    'polozky_cena_bez_dph' => false,
                    'polozky_sazba_dph' => false,
                    'polozky_cena_s_dph' => false,
                    'polozky_usek_kod' => false,
                    'polozky_budova_kod' => false,
                    'polozky_mistnost_kod' => false,
                    'polozky_poznamka' => false,
                    'polozky_poznamka_umisteni' => false
                ),
                'prilohy' => array(
                    'prilohy_count' => false,
                    'prilohy_guid' => false,
                    'prilohy_typ' => false,
                    'prilohy_nazvy' => false,
                    'prilohy_velikosti' => false,
                    'prilohy_nahrano_uzivatel' => false,
                    'prilohy_dt_vytvoreni' => false
                ),
                'faktury' => array(
                    'faktury_count' => false,
                    'faktury_celkova_castka_s_dph' => false,
                    'faktury_cisla_vema' => false,
                    'faktury_castky' => false,
                    'faktury_datum_vystaveni' => false,
                    'faktury_datum_splatnosti' => false,
                    'faktury_datum_doruceni' => false,
                    'faktury_strediska' => false,
                    'faktury_poznamka' => false,
                    'faktury_pocet_priloh' => false,
                    'faktury_dorucena' => false
                ),
                'potvrzeni_a_odeslani' => array(
                    'stav_odeslano' => false,
                    'potvrzeno_dodavatelem' => false,
                    'zpusob_potvrzeni' => false,
                    'zpusob_platby' => false
                ),
                'registr_smluv' => array(
                    'zverejnit_registr_smluv' => false,
                    'registr_iddt' => false
                ),
                'ostatni' => array(
                    'zaruka' => false,
                    'misto_dodani' => false
                )
            )
        ),
        'export_pokladna' => array(
            'format' => 'xlsx'
        )
    );
}

/**
 * Načte nastavení pro daného uživatele
 * 
 * PRAVIDLO: Vrací JSON PŘESNĚ JAK JE v databázi, bez jakýchkoliv transformací.
 * Pokud uživatel nemá nastavení, vrací null (frontend si použije své výchozí).
 * 
 * @param PDO $db Databázové připojení
 * @param int $uzivatel_id ID uživatele
 * @return array Pole s klíči: nastaveni (raw JSON nebo null), verze, upraveno
 */
function nactiUzivatelNastaveni($db, $uzivatel_id) {
    try {
        $stmt = $db->prepare("
            SELECT nastaveni_data, nastaveni_verze, upraveno 
            FROM 25_uzivatel_nastaveni 
            WHERE uzivatel_id = ?
        ");
        $stmt->execute(array($uzivatel_id));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            // Dekóduj JSON PŘESNĚ JAK JE
            $nastaveni = json_decode($row['nastaveni_data'], true);
            
            // Kontrola JSON chyby
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("Chyba při dekódování JSON nastavení pro uživatele $uzivatel_id: " . json_last_error_msg());
                // Při chybě vrať null - frontend použije výchozí
                return array(
                    'nastaveni' => null,
                    'verze' => '1.0',
                    'upraveno' => null
                );
            }
            
            // Vrať data PŘESNĚ JAK JSOU - ŽÁDNÉ transformace!
            return array(
                'nastaveni' => $nastaveni,
                'verze' => $row['nastaveni_verze'],
                'upraveno' => $row['upraveno']
            );
        }
        
        // Uživatel nemá nastavení - vrať null (frontend použije výchozí)
        return array(
            'nastaveni' => null,
            'verze' => '1.0',
            'upraveno' => null
        );
    } catch (PDOException $e) {
        error_log("Chyba při načítání nastavení uživatele $uzivatel_id: " . $e->getMessage());
        
        // Při chybě vrať null
        return array(
            'nastaveni' => null,
            'verze' => '1.0',
            'upraveno' => null
        );
    }
}

/**
 * Uloží nastavení pro daného uživatele
 * 
 * PRAVIDLO: Ukládá JSON PŘESNĚ JAK PŘIŠEL od frontendu, bez jakýchkoliv transformací.
 * Backend je jen úložiště.
 * 
 * @param PDO $db Databázové připojení
 * @param int $uzivatel_id ID uživatele
 * @param mixed $nastaveni_data Nastavení PŘESNĚ jak přišla od FE (array/object)
 * @return bool TRUE při úspěchu
 * @throws Exception Při chybě
 */
function ulozUzivatelNastaveni($db, $uzivatel_id, $nastaveni_data) {
    // Serializuj JSON PŘESNĚ JAK PŘIŠEL - ŽÁDNÉ transformace!
    $json = json_encode($nastaveni_data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new Exception('Chyba při serializaci JSON: ' . json_last_error_msg());
    }
    
    // INSERT ... ON DUPLICATE KEY UPDATE (MySQL 5.5 compatible)
    $stmt = $db->prepare("
        INSERT INTO 25_uzivatel_nastaveni 
            (uzivatel_id, nastaveni_data, nastaveni_verze, vytvoreno) 
        VALUES (?, ?, '1.0', NOW())
        ON DUPLICATE KEY UPDATE 
            nastaveni_data = VALUES(nastaveni_data),
            upraveno = NOW()
    ");
    
    try {
        $result = $stmt->execute(array($uzivatel_id, $json));
        
        if ($result) {
            error_log("Nastavení úspěšně uloženo pro uživatele $uzivatel_id (velikost: " . strlen($json) . " bajtů)");
        }
        
        return $result;
    } catch (PDOException $e) {
        error_log("Chyba při ukládání nastavení uživatele $uzivatel_id: " . $e->getMessage());
        throw new Exception('Chyba při ukládání nastavení do databáze');
    }
}

/**
 * Handle GET request - Načtení nastavení uživatele
 * 
 * Input: Query params ?token=XXX&username=YYY
 * Output: { "status": "ok", "data": { "nastaveni": {...}, "verze": "1.0", "upraveno": "..." } }
 */
function handle_user_settings_get($input, $config, $queries) {
    // GET používá $_GET, ne $input (který je pro POST)
    $token = isset($_GET['token']) ? $_GET['token'] : '';
    $request_username = isset($_GET['username']) ? $_GET['username'] : '';
    
    if (!$token || !$request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chybí token nebo username',
            'code' => 401
        ));
        return;
    }
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Neplatný nebo expirovaný token',
            'code' => 401
        ));
        return;
    }
    
    // Ověření username
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Username z tokenu neodpovídá username z požadavku',
            'code' => 401
        ));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Update last activity
        try {
            if (isset($queries['uzivatele_update_last_activity'])) {
                $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
                $stmtUpd->bindParam(':id', $token_data['id'], PDO::PARAM_INT);
                $stmtUpd->execute();
            }
        } catch (Exception $e) {
            // non-fatal
        }
        
        // Načíst nastavení
        $result = nactiUzivatelNastaveni($db, $token_data['id']);
        
        // Response
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("user/settings GET error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání nastavení',
            'code' => 500
        ));
    }
}

/**
 * Handle POST/PUT request - Uložení nastavení uživatele
 * 
 * Input: { "token": "...", "username": "...", "nastaveni": {...} }
 * Output: { "status": "ok", "message": "Nastavení bylo úspěšně uloženo" }
 */
function handle_user_settings_save($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chybí token nebo username',
            'code' => 401
        ));
        return;
    }
    
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Neplatný nebo expirovaný token',
            'code' => 401
        ));
        return;
    }
    
    // Ověření username
    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Username z tokenu neodpovídá username z požadavku',
            'code' => 401
        ));
        return;
    }
    
    // Validace nastavení
    if (!isset($input['nastaveni'])) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chybí pole "nastaveni" v požadavku',
            'code' => 400
        ));
        return;
    }
    
    $nastaveni = $input['nastaveni'];
    
    // ŽÁDNÉ transformace - ukládáme PŘESNĚ JAK PŘIŠLO
    // Frontend si strukturu dat (včetně verze) řídí sám
    
    try {
        $db = get_db($config);
        
        // Update last activity
        try {
            if (isset($queries['uzivatele_update_last_activity'])) {
                $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
                $stmtUpd->bindParam(':id', $token_data['id'], PDO::PARAM_INT);
                $stmtUpd->execute();
            }
        } catch (Exception $e) {
            // non-fatal
        }
        
        // Uložit nastavení
        ulozUzivatelNastaveni($db, $token_data['id'], $nastaveni);
        
        // Response - sjednoceno s Order V2 (status: ok)
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Nastavení bylo úspěšně uloženo'
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("user/settings POST error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => $e->getMessage(),
            'code' => 500
        ));
    }
}
