<?php

require_once __DIR__ . '/../../api.php';
/**
 * DOCX Template Data Handler
 * Speciální endpoint pro generování DOCX šablon s kompletně rozvinutými daty
 * Všechna ID jsou nahrazena úplnými objekty bez _id sufixů
 * PHP 5.6 kompatibilní
 */

/**
 * Helper funkce pro formátování měny do českého formátu s jednotkou Kč
 * @param float $value Částka k naformátování
 * @return string Naformátovaná částka s mezerou jako tisícovým oddělovačem a jednotkou " Kč"
 */
function format_cz_currency($value) {
    // Formátování s 2 des. místy, mezera jako tisícový oddělovač, tečka jako des. oddělovač, jednotka Kč
    return number_format((float)$value, 2, '.', ' ') . ' Kč';
}

/**
 * Získání kompletních dat objednávky pro DOCX generování
 * POST /sablona_docx/order-data
 */
function handle_sablona_docx_order_data($input, $config, $queries) {
    try {
        $db = get_db($config);
        
        // Kontrola autentizace
        if (!isset($input['token'])) {
            api_error(400, 'Chybí autentizační token');
            return;
        }
        
        if (!isset($input['username'])) {
            api_error(400, 'Chybí username');
            return;
        }
        
        $uzivatel = verify_token($input['token'], $db);
        if (!$uzivatel) {
            api_error(401, 'Neplatný token');
            return;
        }
        
        // Ověření username
        if ($uzivatel['username'] !== $input['username']) {
            api_error(401, 'Neplatný username pro token');
            return;
        }
        
        // Kontrola ID objednávky
        if (!isset($input['objednavka_id'])) {
            api_error(400, 'Chybí parametr objednavka_id');
            return;
        }
        
        $objednavka_id = intval($input['objednavka_id']);
        
        // Vybraný uživatel je NEPOVINNÝ (pokud není zadán, použije se prázdný řetězec)
        $vybrany_uzivatel_id = isset($input['vybrany_uzivatel_id']) ? intval($input['vybrany_uzivatel_id']) : 0;
        
        // Hlavní SELECT s JOINy pro kompletní data - OPRAVENO PRO 25a_objednavky
        $sql = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.dt_objednavky,
                o.predmet,
                o.poznamka,
                o.max_cena_s_dph,
                o.misto_dodani,
                o.dt_vytvoreni,
                o.strediska_kod,
                o.financovani,
                o.druh_objednavky_kod,
                o.stav_workflow_kod,
                o.stav_objednavky,
                o.dt_schvaleni,
                o.schvaleni_komentar,
                o.dt_predpokladany_termin_dodani,
                o.misto_dodani,
                o.zaruka,
                o.dt_odeslani,
                o.dodavatel_zpusob_potvrzeni,
                o.dt_akceptace,
                o.dt_zverejneni,
                o.registr_iddt,
                o.poznamka,
                o.dt_aktualizace,
                
                -- Dodavatel data PŘÍMO z objednávky (ne z JOIN tabulky)
                o.dodavatel_nazev,
                o.dodavatel_adresa,
                o.dodavatel_ico,
                o.dodavatel_dic,
                o.dodavatel_zastoupeny,
                o.dodavatel_kontakt_jmeno,
                o.dodavatel_kontakt_email,
                o.dodavatel_kontakt_telefon,
                
                -- Objednatel (rozvinuto)
                ob.username AS objednatel_username,
                ob.titul_pred AS objednatel_titul_pred,
                ob.jmeno AS objednatel_jmeno,
                ob.prijmeni AS objednatel_prijmeni,
                ob.titul_za AS objednatel_titul_za,
                ob.email AS objednatel_email,
                ob.telefon AS objednatel_telefon,
                ob.pozice_id AS objednatel_pozice_id,
                ob.lokalita_id AS objednatel_lokalita_id,
                ob_poz.nazev_pozice AS objednatel_pozice_nazev,
                ob_lok.nazev AS objednatel_lokalita_nazev,
                
                -- Garant (rozvinuto)
                gu.username AS garant_username,
                gu.titul_pred AS garant_titul_pred,
                gu.jmeno AS garant_jmeno,
                gu.prijmeni AS garant_prijmeni,
                gu.titul_za AS garant_titul_za,
                gu.email AS garant_email,
                gu.telefon AS garant_telefon,
                gu.pozice_id AS garant_pozice_id,
                gu.lokalita_id AS garant_lokalita_id,
                gu_poz.nazev_pozice AS garant_pozice_nazev,
                gu_lok.nazev AS garant_lokalita_nazev,
                
                -- Vytvořil (rozvinuto) - OPRAVENO: uzivatel_id místo created_by_uzivatel_id
                cu.username AS created_by_username,
                cu.titul_pred AS created_by_titul_pred,
                cu.jmeno AS created_by_jmeno,
                cu.prijmeni AS created_by_prijmeni,
                cu.titul_za AS created_by_titul_za,
                cu.email AS created_by_email,
                cu.telefon AS created_by_telefon,
                cu.pozice_id AS created_by_pozice_id,
                cu.lokalita_id AS created_by_lokalita_id,
                cu_poz.nazev_pozice AS created_by_pozice_nazev,
                cu_lok.nazev AS created_by_lokalita_nazev,
                
                -- Schválil (rozvinuto) - OPRAVENO: schvalovatel_id místo schvalil_uzivatel_id
                su.username AS schvalil_username,
                su.titul_pred AS schvalil_titul_pred,
                su.jmeno AS schvalil_jmeno,
                su.prijmeni AS schvalil_prijmeni,
                su.titul_za AS schvalil_titul_za,
                su.email AS schvalil_email,
                su.telefon AS schvalil_telefon,
                su.pozice_id AS schvalil_pozice_id,
                su.lokalita_id AS schvalil_lokalita_id,
                su_poz.nazev_pozice AS schvalil_pozice_nazev,
                su_lok.nazev AS schvalil_lokalita_nazev,
                
                -- Příkazce (rozvinuto) - NOVÉ POLE
                pu.username AS prikazce_username,
                pu.titul_pred AS prikazce_titul_pred,
                pu.jmeno AS prikazce_jmeno,
                pu.prijmeni AS prikazce_prijmeni,
                pu.titul_za AS prikazce_titul_za,
                pu.email AS prikazce_email,
                pu.telefon AS prikazce_telefon,
                pu.pozice_id AS prikazce_pozice_id,
                pu.lokalita_id AS prikazce_lokalita_id,
                pu_poz.nazev_pozice AS prikazce_pozice_nazev,
                pu_lok.nazev AS prikazce_lokalita_nazev
                
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_UZIVATELE . " ob ON o.objednatel_id = ob.id
            LEFT JOIN " . TBL_POZICE . " ob_poz ON ob.pozice_id = ob_poz.id
            LEFT JOIN " . TBL_LOKALITY . " ob_lok ON ob.lokalita_id = ob_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " gu ON o.garant_uzivatel_id = gu.id
            LEFT JOIN " . TBL_POZICE . " gu_poz ON gu.pozice_id = gu_poz.id
            LEFT JOIN " . TBL_LOKALITY . " gu_lok ON gu.lokalita_id = gu_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " cu ON o.uzivatel_id = cu.id
            LEFT JOIN " . TBL_POZICE . " cu_poz ON cu.pozice_id = cu_poz.id
            LEFT JOIN " . TBL_LOKALITY . " cu_lok ON cu.lokalita_id = cu_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " su ON o.schvalovatel_id = su.id
            LEFT JOIN " . TBL_POZICE . " su_poz ON su.pozice_id = su_poz.id
            LEFT JOIN " . TBL_LOKALITY . " su_lok ON su.lokalita_id = su_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " pu ON o.prikazce_id = pu.id
            LEFT JOIN " . TBL_POZICE . " pu_poz ON pu.pozice_id = pu_poz.id
            LEFT JOIN " . TBL_LOKALITY . " pu_lok ON pu.lokalita_id = pu_lok.id
            WHERE o.id = :objednavka_id AND o.aktivni = 1
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            api_error(404, 'Objednávka nenalezena');
            return;
        }
        
        // Načtení vybraného uživatele (pouze pokud je ID > 0)
        $vybrany_uzivatel_cele_jmeno = '';
        
        if ($vybrany_uzivatel_id > 0) {
            $vybrany_uzivatel_sql = "
                SELECT 
                    titul_pred,
                    jmeno,
                    prijmeni,
                    titul_za
                FROM " . TBL_UZIVATELE . "
                WHERE id = :vybrany_uzivatel_id AND aktivni = 1
                LIMIT 1
            ";
            
            $stmt = $db->prepare($vybrany_uzivatel_sql);
            $stmt->execute(array(':vybrany_uzivatel_id' => $vybrany_uzivatel_id));
            $vybrany_uzivatel = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($vybrany_uzivatel) {
                // Sestavení celého jména vybraného uživatele s tituly
                if ($vybrany_uzivatel['titul_pred']) {
                    $vybrany_uzivatel_cele_jmeno .= $vybrany_uzivatel['titul_pred'] . ' ';
                }
                $vybrany_uzivatel_cele_jmeno .= $vybrany_uzivatel['jmeno'] . ' ' . $vybrany_uzivatel['prijmeni'];
                if ($vybrany_uzivatel['titul_za']) {
                    $vybrany_uzivatel_cele_jmeno .= ', ' . $vybrany_uzivatel['titul_za'];
                }
                $vybrany_uzivatel_cele_jmeno = trim($vybrany_uzivatel_cele_jmeno);
            }
        }
        
        // Získání položek objednávky - OPRAVENO PRO 25a_objednavky_polozky
        $items_sql = "
            SELECT 
                p.id,
                p.popis,
                p.cena_bez_dph,
                p.sazba_dph,
                p.cena_s_dph
            FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
            WHERE p.objednavka_id = :objednavka_id
            ORDER BY p.id ASC
        ";
        
        $stmt = $db->prepare($items_sql);
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Získání příloh - OPRAVENO PRO 25a_objednavky_prilohy
        $attachments_sql = "
            SELECT 
                pr.id,
                pr.originalni_nazev_souboru,
                pr.velikost_souboru_b,
                pr.typ_prilohy,
                pr.dt_vytvoreni,
                
                -- Uživatel který nahrál (rozvinuto)
                nu.username AS nahrano_uzivatel_username,
                nu.titul_pred AS nahrano_uzivatel_titul_pred,
                nu.jmeno AS nahrano_uzivatel_jmeno,
                nu.prijmeni AS nahrano_uzivatel_prijmeni,
                nu.titul_za AS nahrano_uzivatel_titul_za,
                nu.email AS nahrano_uzivatel_email
                
            FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr
            LEFT JOIN " . TBL_UZIVATELE . " nu ON pr.nahrano_uzivatel_id = nu.id
            WHERE pr.objednavka_id = :objednavka_id
            ORDER BY pr.dt_vytvoreni ASC
        ";
        
        $stmt = $db->prepare($attachments_sql);
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Vytvoření kompletní struktury podle přesných DB polí 25a_objednavky
        $result = array(
            // === PŘESNÉ DB POLE NÁZVY ===
            'cislo_objednavky' => $order['cislo_objednavky'] ? $order['cislo_objednavky'] : "",
            'dt_objednavky' => $order['dt_objednavky'] ? $order['dt_objednavky'] : "",
            'predmet' => $order['predmet'] ? $order['predmet'] : "",
            'strediska_kod' => $order['strediska_kod'] ? $order['strediska_kod'] : "",
            'max_cena_s_dph' => $order['max_cena_s_dph'] ? (float)$order['max_cena_s_dph'] : "",
            'financovani' => $order['financovani'] ? $order['financovani'] : "",
            'druh_objednavky_kod' => $order['druh_objednavky_kod'] ? $order['druh_objednavky_kod'] : "",
            'stav_workflow_kod' => $order['stav_workflow_kod'] ? $order['stav_workflow_kod'] : "",
            'stav_objednavky' => $order['stav_objednavky'] ? $order['stav_objednavky'] : "",
            'dt_schvaleni' => $order['dt_schvaleni'] ? $order['dt_schvaleni'] : "",
            'schvaleni_komentar' => $order['schvaleni_komentar'] ? $order['schvaleni_komentar'] : "",
            'dt_predpokladany_termin_dodani' => $order['dt_predpokladany_termin_dodani'] ? $order['dt_predpokladany_termin_dodani'] : "",
            'misto_dodani' => $order['misto_dodani'] ? $order['misto_dodani'] : "",
            'zaruka' => $order['zaruka'] ? $order['zaruka'] : "",
            'dt_odeslani' => $order['dt_odeslani'] ? $order['dt_odeslani'] : "",
            'dodavatel_zpusob_potvrzeni' => $order['dodavatel_zpusob_potvrzeni'] ? $order['dodavatel_zpusob_potvrzeni'] : "",
            'dt_akceptace' => $order['dt_akceptace'] ? $order['dt_akceptace'] : "",
            'dt_zverejneni' => $order['dt_zverejneni'] ? $order['dt_zverejneni'] : "",
            'registr_iddt' => $order['registr_iddt'] ? $order['registr_iddt'] : "",
            'poznamka' => $order['poznamka'] ? $order['poznamka'] : "",
            'dt_vytvoreni' => $order['dt_vytvoreni'] ? $order['dt_vytvoreni'] : "",
            'dt_aktualizace' => $order['dt_aktualizace'] ? $order['dt_aktualizace'] : "",
            
            // === DODAVATEL POLE (pouze existující v DB) ===
            'dodavatel_nazev' => $order['dodavatel_nazev'] ? $order['dodavatel_nazev'] : "",
            'dodavatel_adresa' => $order['dodavatel_adresa'] ? $order['dodavatel_adresa'] : "",
            'dodavatel_ico' => $order['dodavatel_ico'] ? $order['dodavatel_ico'] : "",
            'dodavatel_dic' => $order['dodavatel_dic'] ? $order['dodavatel_dic'] : "",
            'dodavatel_zastoupeny' => $order['dodavatel_zastoupeny'] ? $order['dodavatel_zastoupeny'] : "",
            'dodavatel_kontakt_jmeno' => $order['dodavatel_kontakt_jmeno'] ? $order['dodavatel_kontakt_jmeno'] : "",
            'dodavatel_kontakt_email' => $order['dodavatel_kontakt_email'] ? $order['dodavatel_kontakt_email'] : "",
            'dodavatel_kontakt_telefon' => $order['dodavatel_kontakt_telefon'] ? $order['dodavatel_kontakt_telefon'] : "",
            
            // Rozvinuté objekty uživatelů bez ID polí
            'objednatel' => array(
                'username' => $order['objednatel_username'] ? $order['objednatel_username'] : "",
                'titul_pred' => $order['objednatel_titul_pred'] ? $order['objednatel_titul_pred'] : "",
                'jmeno' => $order['objednatel_jmeno'] ? $order['objednatel_jmeno'] : "",
                'prijmeni' => $order['objednatel_prijmeni'] ? $order['objednatel_prijmeni'] : "",
                'titul_za' => $order['objednatel_titul_za'] ? $order['objednatel_titul_za'] : "",
                'email' => $order['objednatel_email'] ? $order['objednatel_email'] : "",
                'telefon' => $order['objednatel_telefon'] ? $order['objednatel_telefon'] : "",
                'plne_jmeno' => $order['objednatel_username'] ? trim(($order['objednatel_titul_pred'] ? $order['objednatel_titul_pred'] . ' ' : '') . 
                                                                  ($order['objednatel_jmeno'] ? $order['objednatel_jmeno'] . ' ' : '') . 
                                                                  ($order['objednatel_prijmeni'] ? $order['objednatel_prijmeni'] . ' ' : '') . 
                                                                  ($order['objednatel_titul_za'] ? $order['objednatel_titul_za'] : '')) : "",
                'pozice' => array(
                    'id' => $order['objednatel_pozice_id'] ? (int)$order['objednatel_pozice_id'] : "",
                    'nazev_pozice' => $order['objednatel_pozice_nazev'] ? $order['objednatel_pozice_nazev'] : ""
                ),
                'lokalita' => array(
                    'id' => $order['objednatel_lokalita_id'] ? (int)$order['objednatel_lokalita_id'] : "",
                    'nazev' => $order['objednatel_lokalita_nazev'] ? $order['objednatel_lokalita_nazev'] : ""
                )
            ),
            
            'garant' => array(
                'username' => $order['garant_username'] ? $order['garant_username'] : "",
                'titul_pred' => $order['garant_titul_pred'] ? $order['garant_titul_pred'] : "",
                'jmeno' => $order['garant_jmeno'] ? $order['garant_jmeno'] : "",
                'prijmeni' => $order['garant_prijmeni'] ? $order['garant_prijmeni'] : "",
                'titul_za' => $order['garant_titul_za'] ? $order['garant_titul_za'] : "",
                'email' => $order['garant_email'] ? $order['garant_email'] : "",
                'telefon' => $order['garant_telefon'] ? $order['garant_telefon'] : "",
                'plne_jmeno' => $order['garant_username'] ? trim(($order['garant_titul_pred'] ? $order['garant_titul_pred'] . ' ' : '') . 
                                                               ($order['garant_jmeno'] ? $order['garant_jmeno'] . ' ' : '') . 
                                                               ($order['garant_prijmeni'] ? $order['garant_prijmeni'] . ' ' : '') . 
                                                               ($order['garant_titul_za'] ? $order['garant_titul_za'] : '')) : "",
                'pozice' => array(
                    'id' => $order['garant_pozice_id'] ? (int)$order['garant_pozice_id'] : "",
                    'nazev_pozice' => $order['garant_pozice_nazev'] ? $order['garant_pozice_nazev'] : ""
                ),
                'lokalita' => array(
                    'id' => $order['garant_lokalita_id'] ? (int)$order['garant_lokalita_id'] : "",
                    'nazev' => $order['garant_lokalita_nazev'] ? $order['garant_lokalita_nazev'] : ""
                )
            ),
            
            'uzivatel' => array(
                'username' => $order['created_by_username'] ? $order['created_by_username'] : "",
                'titul_pred' => $order['created_by_titul_pred'] ? $order['created_by_titul_pred'] : "",
                'jmeno' => $order['created_by_jmeno'] ? $order['created_by_jmeno'] : "",
                'prijmeni' => $order['created_by_prijmeni'] ? $order['created_by_prijmeni'] : "",
                'titul_za' => $order['created_by_titul_za'] ? $order['created_by_titul_za'] : "",
                'email' => $order['created_by_email'] ? $order['created_by_email'] : "",
                'telefon' => $order['created_by_telefon'] ? $order['created_by_telefon'] : "",
                'plne_jmeno' => $order['created_by_username'] ? trim(($order['created_by_titul_pred'] ? $order['created_by_titul_pred'] . ' ' : '') . 
                                                                   ($order['created_by_jmeno'] ? $order['created_by_jmeno'] . ' ' : '') . 
                                                                   ($order['created_by_prijmeni'] ? $order['created_by_prijmeni'] . ' ' : '') . 
                                                                   ($order['created_by_titul_za'] ? $order['created_by_titul_za'] : '')) : "",
                'pozice' => array(
                    'id' => $order['created_by_pozice_id'] ? (int)$order['created_by_pozice_id'] : "",
                    'nazev_pozice' => $order['created_by_pozice_nazev'] ? $order['created_by_pozice_nazev'] : ""
                ),
                'lokalita' => array(
                    'id' => $order['created_by_lokalita_id'] ? (int)$order['created_by_lokalita_id'] : "",
                    'nazev' => $order['created_by_lokalita_nazev'] ? $order['created_by_lokalita_nazev'] : ""
                )
            ),
            
            'schvalovatel' => array(
                'username' => $order['schvalil_username'] ? $order['schvalil_username'] : "",
                'titul_pred' => $order['schvalil_titul_pred'] ? $order['schvalil_titul_pred'] : "",
                'jmeno' => $order['schvalil_jmeno'] ? $order['schvalil_jmeno'] : "",
                'prijmeni' => $order['schvalil_prijmeni'] ? $order['schvalil_prijmeni'] : "",
                'titul_za' => $order['schvalil_titul_za'] ? $order['schvalil_titul_za'] : "",
                'email' => $order['schvalil_email'] ? $order['schvalil_email'] : "",
                'telefon' => $order['schvalil_telefon'] ? $order['schvalil_telefon'] : "",
                'plne_jmeno' => $order['schvalil_username'] ? trim(($order['schvalil_titul_pred'] ? $order['schvalil_titul_pred'] . ' ' : '') . 
                                                                 ($order['schvalil_jmeno'] ? $order['schvalil_jmeno'] . ' ' : '') . 
                                                                 ($order['schvalil_prijmeni'] ? $order['schvalil_prijmeni'] . ' ' : '') . 
                                                                 ($order['schvalil_titul_za'] ? $order['schvalil_titul_za'] : '')) : "",
                'pozice' => array(
                    'id' => $order['schvalil_pozice_id'] ? (int)$order['schvalil_pozice_id'] : "",
                    'nazev_pozice' => $order['schvalil_pozice_nazev'] ? $order['schvalil_pozice_nazev'] : ""
                ),
                'lokalita' => array(
                    'id' => $order['schvalil_lokalita_id'] ? (int)$order['schvalil_lokalita_id'] : "",
                    'nazev' => $order['schvalil_lokalita_nazev'] ? $order['schvalil_lokalita_nazev'] : ""
                )
            ),
            
            // Příkazce (podle DB pole prikazce_id)
            'prikazce' => array(
                'username' => $order['prikazce_username'] ? $order['prikazce_username'] : "",
                'titul_pred' => $order['prikazce_titul_pred'] ? $order['prikazce_titul_pred'] : "",
                'jmeno' => $order['prikazce_jmeno'] ? $order['prikazce_jmeno'] : "",
                'prijmeni' => $order['prikazce_prijmeni'] ? $order['prikazce_prijmeni'] : "",
                'titul_za' => $order['prikazce_titul_za'] ? $order['prikazce_titul_za'] : "",
                'email' => $order['prikazce_email'] ? $order['prikazce_email'] : "",
                'telefon' => $order['prikazce_telefon'] ? $order['prikazce_telefon'] : "",
                'plne_jmeno' => $order['prikazce_username'] ? trim(($order['prikazce_titul_pred'] ? $order['prikazce_titul_pred'] . ' ' : '') . 
                                                                 ($order['prikazce_jmeno'] ? $order['prikazce_jmeno'] . ' ' : '') . 
                                                                 ($order['prikazce_prijmeni'] ? $order['prikazce_prijmeni'] . ' ' : '') . 
                                                                 ($order['prikazce_titul_za'] ? $order['prikazce_titul_za'] : '')) : "",
                'pozice' => array(
                    'id' => $order['prikazce_pozice_id'] ? (int)$order['prikazce_pozice_id'] : "",
                    'nazev_pozice' => $order['prikazce_pozice_nazev'] ? $order['prikazce_pozice_nazev'] : ""
                ),
                'lokalita' => array(
                    'id' => $order['prikazce_lokalita_id'] ? (int)$order['prikazce_lokalita_id'] : "",
                    'nazev' => $order['prikazce_lokalita_nazev'] ? $order['prikazce_lokalita_nazev'] : ""
                )
            )
        );
        
        // Přidání položek
        $result['polozky'] = array();
        $celkova_cena_bez_dph = 0;
        $celkova_cena_s_dph = 0;
        
        foreach ($items as $item) {
            $polozka = array(
                'id' => $item['id'] ? (int)$item['id'] : "",
                'popis' => $item['popis'] ? $item['popis'] : "",
                'cena_bez_dph' => $item['cena_bez_dph'] ? (float)$item['cena_bez_dph'] : "",
                'sazba_dph' => $item['sazba_dph'] ? (int)$item['sazba_dph'] : "",
                'cena_s_dph' => $item['cena_s_dph'] ? (float)$item['cena_s_dph'] : ""
            );
            
            $result['polozky'][] = $polozka;
            
            // Sčítání celkových cen
            if ($item['cena_bez_dph']) {
                $celkova_cena_bez_dph += (float)$item['cena_bez_dph'];
            }
            if ($item['cena_s_dph']) {
                $celkova_cena_s_dph += (float)$item['cena_s_dph'];
            }
        }
        
        // Přidání celkových cen (numerické hodnoty - zachováno pro zpětnou kompatibilitu)
        $result['celkova_cena_bez_dph'] = $celkova_cena_bez_dph ? (float)$celkova_cena_bez_dph : "";
        $result['celkova_cena_s_dph'] = $celkova_cena_s_dph ? (float)$celkova_cena_s_dph : "";
        $result['pocet_polozek'] = count($items) ? count($items) : "";
        
        // === NOVÉ: Vypočítané hodnoty pro DOCX šablony ===
        // Výpočet DPH
        $vypoctene_dph = $celkova_cena_s_dph - $celkova_cena_bez_dph;
        
        // Aktuální datum a čas pro generování
        $now = time();
        
        $result['vypocitane'] = array(
            // Měna s jednotkou " Kč" (mezera jako tisícový oddělovač, tečka jako des. oddělovač)
            'celkova_cena_bez_dph' => format_cz_currency($celkova_cena_bez_dph),
            'celkova_cena_s_dph' => format_cz_currency($celkova_cena_s_dph),
            'vypoctene_dph' => format_cz_currency($vypoctene_dph),
            
            // Statistiky (číselné hodnoty)
            'pocet_polozek' => count($items),
            'pocet_priloh' => count($attachments),
            
            // Datum a čas generování (české formáty)
            'datum_generovani' => date('d.m.Y', $now),
            'cas_generovani' => date('H:i', $now),
            'datum_cas_generovani' => date('d.m.Y H:i', $now),
            
            // Celé jméno vybraného uživatele (může být garant, přikazce, schvalovatel, atd.)
            'vybrany_uzivatel_cele_jmeno' => $vybrany_uzivatel_cele_jmeno
        );
        
        // Přidání příloh
        $result['prilohy'] = array();
        foreach ($attachments as $attachment) {
            $priloha = array(
                'id' => $attachment['id'] ? (int)$attachment['id'] : "",
                'originalni_nazev_souboru' => $attachment['originalni_nazev_souboru'] ? $attachment['originalni_nazev_souboru'] : "",
                'velikost_souboru_b' => $attachment['velikost_souboru_b'] ? (int)$attachment['velikost_souboru_b'] : "",
                'typ_prilohy' => $attachment['typ_prilohy'] ? $attachment['typ_prilohy'] : "",
                'dt_vytvoreni' => $attachment['dt_vytvoreni'] ? $attachment['dt_vytvoreni'] : "",
                'nahrano_uzivatel' => array(
                    'username' => $attachment['nahrano_uzivatel_username'] ? $attachment['nahrano_uzivatel_username'] : "",
                    'titul_pred' => $attachment['nahrano_uzivatel_titul_pred'] ? $attachment['nahrano_uzivatel_titul_pred'] : "",
                    'jmeno' => $attachment['nahrano_uzivatel_jmeno'] ? $attachment['nahrano_uzivatel_jmeno'] : "",
                    'prijmeni' => $attachment['nahrano_uzivatel_prijmeni'] ? $attachment['nahrano_uzivatel_prijmeni'] : "",
                    'titul_za' => $attachment['nahrano_uzivatel_titul_za'] ? $attachment['nahrano_uzivatel_titul_za'] : "",
                    'email' => $attachment['nahrano_uzivatel_email'] ? $attachment['nahrano_uzivatel_email'] : "",
                    'plne_jmeno' => $attachment['nahrano_uzivatel_username'] ? trim(($attachment['nahrano_uzivatel_titul_pred'] ? $attachment['nahrano_uzivatel_titul_pred'] . ' ' : '') .
                                                                                  ($attachment['nahrano_uzivatel_jmeno'] ? $attachment['nahrano_uzivatel_jmeno'] . ' ' : '') .
                                                                                  ($attachment['nahrano_uzivatel_prijmeni'] ? $attachment['nahrano_uzivatel_prijmeni'] . ' ' : '') .
                                                                                  ($attachment['nahrano_uzivatel_titul_za'] ? $attachment['nahrano_uzivatel_titul_za'] : '')) : ""
                )
            );
            
            $result['prilohy'][] = $priloha;
        }
        
        $result['pocet_priloh'] = count($attachments) ? count($attachments) : "";
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage());
    }
}

/**
 * Helper funkce pro sestavení objektu enriched uživatele
 * @param array $order Raw data z DB
 * @param string $prefix Prefix polí (např. 'garant_', 'prikazce_')
 * @param string $id_field Název pole s ID (např. 'garant_id', 'prikazce_user_id')
 * @return array|null Enriched user object nebo null pokud uživatel neexistuje
 */
function build_enriched_user($order, $prefix, $id_field = null) {
    // Zkontroluj, jestli uživatel existuje (podle username)
    if (!isset($order[$prefix . 'username']) || !$order[$prefix . 'username']) {
        return null;
    }
    
    // Pokud není zadáno ID pole, pokus se ho odvodit
    if ($id_field === null) {
        $id_field = $prefix . 'id';
    }
    
    // Sestavení celého jména s tituly
    $cele_jmeno = '';
    if ($order[$prefix . 'titul_pred']) {
        $cele_jmeno .= $order[$prefix . 'titul_pred'] . ' ';
    }
    $cele_jmeno .= $order[$prefix . 'jmeno'] . ' ' . $order[$prefix . 'prijmeni'];
    if ($order[$prefix . 'titul_za']) {
        $cele_jmeno .= ' ' . $order[$prefix . 'titul_za'];
    }
    $cele_jmeno = trim($cele_jmeno);
    
    // Sestavení objektu lokality
    $lokalita = null;
    if (isset($order[$prefix . 'lokalita_id']) && $order[$prefix . 'lokalita_id']) {
        $lokalita = array(
            'id' => (int)$order[$prefix . 'lokalita_id'],
            'nazev' => $order[$prefix . 'lokalita_nazev'] ? $order[$prefix . 'lokalita_nazev'] : '',
            'kod' => isset($order[$prefix . 'lokalita_kod']) && $order[$prefix . 'lokalita_kod'] ? $order[$prefix . 'lokalita_kod'] : ''
        );
    }
    
    return array(
        'id' => isset($order[$id_field]) ? (int)$order[$id_field] : 0,
        'cele_jmeno' => $cele_jmeno,
        'jmeno' => $order[$prefix . 'jmeno'] ? $order[$prefix . 'jmeno'] : '',
        'prijmeni' => $order[$prefix . 'prijmeni'] ? $order[$prefix . 'prijmeni'] : '',
        'titul_pred' => $order[$prefix . 'titul_pred'] ? $order[$prefix . 'titul_pred'] : '',
        'titul_za' => $order[$prefix . 'titul_za'] ? $order[$prefix . 'titul_za'] : '',
        'email' => $order[$prefix . 'email'] ? $order[$prefix . 'email'] : '',
        'telefon' => $order[$prefix . 'telefon'] ? $order[$prefix . 'telefon'] : '',
        'lokalita' => $lokalita
    );
}

/**
 * Helper funkce pro sestavení kombinací jmen pro vypočítané hodnoty
 * @param array $user Enriched user object
 * @return array Pole s různými formáty jména
 */
function build_name_combinations($user) {
    if (!$user) {
        return array(
            'jmeno_prijmeni' => '',
            'prijmeni_jmeno' => '',
            'cele_jmeno_s_tituly' => '',
            'jmeno' => '',
            'prijmeni' => ''
        );
    }
    
    return array(
        'jmeno_prijmeni' => $user['jmeno'] . ' ' . $user['prijmeni'],
        'prijmeni_jmeno' => $user['prijmeni'] . ' ' . $user['jmeno'],
        'cele_jmeno_s_tituly' => $user['cele_jmeno'],
        'jmeno' => $user['jmeno'],
        'prijmeni' => $user['prijmeni']
    );
}

/**
 * Nový ENRICHED endpoint pro DOCX šablony
 * Vrací kompletní data s enriched uživateli, vypočítanými hodnotami a seznamem dostupných uživatelů
 * POST /sablona_docx/order-enriched-data
 */
function handle_sablona_docx_order_enriched_data($input, $config, $queries) {
    try {
        $db = get_db($config);
        
        // === AUTENTIZACE ===
        if (!isset($input['token'])) {
            api_error(400, 'Chybí autentizační token');
            return;
        }
        
        if (!isset($input['username'])) {
            api_error(400, 'Chybí username');
            return;
        }
        
        $uzivatel = verify_token($input['token'], $db);
        if (!$uzivatel) {
            api_error(401, 'Neplatný token');
            return;
        }
        
        if ($uzivatel['username'] !== $input['username']) {
            api_error(401, 'Neplatný username pro token');
            return;
        }
        
        // === VALIDACE VSTUPU ===
        if (!isset($input['objednavka_id'])) {
            api_error(400, 'Chybí parametr objednavka_id');
            return;
        }
        
        $objednavka_id = intval($input['objednavka_id']);
        
        // === HLAVNÍ SELECT S ENRICHED DATY ===
        $sql = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.dt_objednavky,
                o.predmet,
                o.poznamka,
                o.max_cena_s_dph,
                o.strediska_kod,
                o.financovani,
                o.druh_objednavky_kod,
                o.stav_workflow_kod,
                o.dt_predpokladany_termin_dodani,
                o.misto_dodani,
                o.zaruka,
                
                -- Dodavatel data z objednávky
                o.dodavatel_nazev,
                o.dodavatel_adresa,
                o.dodavatel_ico,
                o.dodavatel_dic,
                o.dodavatel_zastoupeny,
                o.dodavatel_kontakt_jmeno,
                o.dodavatel_kontakt_email,
                o.dodavatel_kontakt_telefon,
                
                -- Garant (enriched)
                o.garant_uzivatel_id AS garant_uzivatel_id,
                gu.id AS garant_id,
                gu.username AS garant_username,
                gu.titul_pred AS garant_titul_pred,
                gu.jmeno AS garant_jmeno,
                gu.prijmeni AS garant_prijmeni,
                gu.titul_za AS garant_titul_za,
                gu.email AS garant_email,
                gu.telefon AS garant_telefon,
                gu.lokalita_id AS garant_lokalita_id,
                gu_lok.nazev AS garant_lokalita_nazev,
                gu_lok.kod AS garant_lokalita_kod,
                
                -- Příkazce (enriched)
                o.prikazce_id AS prikazce_id,
                pu.id AS prikazce_user_id,
                pu.username AS prikazce_username,
                pu.titul_pred AS prikazce_titul_pred,
                pu.jmeno AS prikazce_jmeno,
                pu.prijmeni AS prikazce_prijmeni,
                pu.titul_za AS prikazce_titul_za,
                pu.email AS prikazce_email,
                pu.telefon AS prikazce_telefon,
                pu.lokalita_id AS prikazce_lokalita_id,
                pu_lok.nazev AS prikazce_lokalita_nazev,
                pu_lok.kod AS prikazce_lokalita_kod,
                
                -- Schvalovatel (enriched)
                o.schvalovatel_id AS schvalovatel_id,
                su.id AS schvalovatel_user_id,
                su.username AS schvalovatel_username,
                su.titul_pred AS schvalovatel_titul_pred,
                su.jmeno AS schvalovatel_jmeno,
                su.prijmeni AS schvalovatel_prijmeni,
                su.titul_za AS schvalovatel_titul_za,
                su.email AS schvalovatel_email,
                su.telefon AS schvalovatel_telefon,
                su.lokalita_id AS schvalovatel_lokalita_id,
                su_lok.nazev AS schvalovatel_lokalita_nazev,
                su_lok.kod AS schvalovatel_lokalita_kod,
                
                -- Objednatel/uzivatel (enriched)
                o.uzivatel_id AS uzivatel_id,
                cu.id AS uzivatel_user_id,
                cu.username AS uzivatel_username,
                cu.titul_pred AS uzivatel_titul_pred,
                cu.jmeno AS uzivatel_jmeno,
                cu.prijmeni AS uzivatel_prijmeni,
                cu.titul_za AS uzivatel_titul_za,
                cu.email AS uzivatel_email,
                cu.telefon AS uzivatel_telefon,
                cu.lokalita_id AS uzivatel_lokalita_id,
                cu_lok.nazev AS uzivatel_lokalita_nazev,
                cu_lok.kod AS uzivatel_lokalita_kod,
                
                -- Odesílatel (enriched)
                o.odesilatel_id AS odesilatel_id,
                od.id AS odesilatel_user_id,
                od.username AS odesilatel_username,
                od.titul_pred AS odesilatel_titul_pred,
                od.jmeno AS odesilatel_jmeno,
                od.prijmeni AS odesilatel_prijmeni,
                od.titul_za AS odesilatel_titul_za,
                od.email AS odesilatel_email,
                od.telefon AS odesilatel_telefon,
                od.lokalita_id AS odesilatel_lokalita_id,
                od_lok.nazev AS odesilatel_lokalita_nazev,
                od_lok.kod AS odesilatel_lokalita_kod,
                
                -- Fakturant (enriched)
                o.fakturant_id AS fakturant_id,
                fk.id AS fakturant_user_id,
                fk.username AS fakturant_username,
                fk.titul_pred AS fakturant_titul_pred,
                fk.jmeno AS fakturant_jmeno,
                fk.prijmeni AS fakturant_prijmeni,
                fk.titul_za AS fakturant_titul_za,
                fk.email AS fakturant_email,
                fk.telefon AS fakturant_telefon,
                fk.lokalita_id AS fakturant_lokalita_id,
                fk_lok.nazev AS fakturant_lokalita_nazev,
                fk_lok.kod AS fakturant_lokalita_kod,
                
                -- Dodavatel potvrdil (enriched)
                o.dodavatel_potvrdil_id AS dodavatel_potvrdil_id,
                dp.id AS dodavatel_potvrdil_user_id,
                dp.username AS dodavatel_potvrdil_username,
                dp.titul_pred AS dodavatel_potvrdil_titul_pred,
                dp.jmeno AS dodavatel_potvrdil_jmeno,
                dp.prijmeni AS dodavatel_potvrdil_prijmeni,
                dp.titul_za AS dodavatel_potvrdil_titul_za,
                dp.email AS dodavatel_potvrdil_email,
                dp.telefon AS dodavatel_potvrdil_telefon,
                dp.lokalita_id AS dodavatel_potvrdil_lokalita_id,
                dp_lok.nazev AS dodavatel_potvrdil_lokalita_nazev,
                dp_lok.kod AS dodavatel_potvrdil_lokalita_kod,
                
                -- Potvrdil věcnou správnost (enriched)
                o.potvrdil_vecnou_spravnost_id AS potvrdil_vecnou_spravnost_id,
                vs.id AS potvrdil_vecnou_spravnost_user_id,
                vs.username AS potvrdil_vecnou_spravnost_username,
                vs.titul_pred AS potvrdil_vecnou_spravnost_titul_pred,
                vs.jmeno AS potvrdil_vecnou_spravnost_jmeno,
                vs.prijmeni AS potvrdil_vecnou_spravnost_prijmeni,
                vs.titul_za AS potvrdil_vecnou_spravnost_titul_za,
                vs.email AS potvrdil_vecnou_spravnost_email,
                vs.telefon AS potvrdil_vecnou_spravnost_telefon,
                vs.lokalita_id AS potvrdil_vecnou_spravnost_lokalita_id,
                vs_lok.nazev AS potvrdil_vecnou_spravnost_lokalita_nazev,
                vs_lok.kod AS potvrdil_vecnou_spravnost_lokalita_kod,
                
                -- Dokončil (enriched)
                o.dokoncil_id AS dokoncil_id,
                dk.id AS dokoncil_user_id,
                dk.username AS dokoncil_username,
                dk.titul_pred AS dokoncil_titul_pred,
                dk.jmeno AS dokoncil_jmeno,
                dk.prijmeni AS dokoncil_prijmeni,
                dk.titul_za AS dokoncil_titul_za,
                dk.email AS dokoncil_email,
                dk.telefon AS dokoncil_telefon,
                dk.lokalita_id AS dokoncil_lokalita_id,
                dk_lok.nazev AS dokoncil_lokalita_nazev,
                dk_lok.kod AS dokoncil_lokalita_kod
                
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_UZIVATELE . " gu ON o.garant_uzivatel_id = gu.id
            LEFT JOIN " . TBL_LOKALITY . " gu_lok ON gu.lokalita_id = gu_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " pu ON o.prikazce_id = pu.id
            LEFT JOIN " . TBL_LOKALITY . " pu_lok ON pu.lokalita_id = pu_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " su ON o.schvalovatel_id = su.id
            LEFT JOIN " . TBL_LOKALITY . " su_lok ON su.lokalita_id = su_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " cu ON o.uzivatel_id = cu.id
            LEFT JOIN " . TBL_LOKALITY . " cu_lok ON cu.lokalita_id = cu_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " od ON o.odesilatel_id = od.id
            LEFT JOIN " . TBL_LOKALITY . " od_lok ON od.lokalita_id = od_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " fk ON o.fakturant_id = fk.id
            LEFT JOIN " . TBL_LOKALITY . " fk_lok ON fk.lokalita_id = fk_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " dp ON o.dodavatel_potvrdil_id = dp.id
            LEFT JOIN " . TBL_LOKALITY . " dp_lok ON dp.lokalita_id = dp_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " vs ON o.potvrdil_vecnou_spravnost_id = vs.id
            LEFT JOIN " . TBL_LOKALITY . " vs_lok ON vs.lokalita_id = vs_lok.id
            LEFT JOIN " . TBL_UZIVATELE . " dk ON o.dokoncil_id = dk.id
            LEFT JOIN " . TBL_LOKALITY . " dk_lok ON dk.lokalita_id = dk_lok.id
            WHERE o.id = :objednavka_id AND o.aktivni = 1
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            api_error(404, 'Objednávka nenalezena');
            return;
        }
        
        // === NAČTENÍ POLOŽEK ===
        $items_sql = "
            SELECT 
                p.id,
                p.popis AS nazev,
                1 AS mnozstvi,
                'ks' AS mj,
                p.cena_bez_dph,
                p.cena_s_dph,
                p.sazba_dph,
                '' AS poznamka
            FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
            WHERE p.objednavka_id = :objednavka_id
            ORDER BY p.id ASC
        ";
        
        $stmt = $db->prepare($items_sql);
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // === NAČTENÍ PŘÍLOH ===
        $attachments_sql = "
            SELECT 
                pr.id,
                pr.originalni_nazev_souboru AS nazev_souboru,
                pr.typ_prilohy,
                pr.velikost_souboru_b AS velikost
            FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr
            WHERE pr.objednavka_id = :objednavka_id
            ORDER BY pr.dt_vytvoreni ASC
        ";
        
        $stmt = $db->prepare($attachments_sql);
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // === SESTAVENÍ ENRICHED UŽIVATELŮ ===
        $garant_uzivatel = build_enriched_user($order, 'garant_', 'garant_id');
        $prikazce_uzivatel = build_enriched_user($order, 'prikazce_', 'prikazce_user_id');
        $schvalovatel = build_enriched_user($order, 'schvalovatel_', 'schvalovatel_user_id');
        $uzivatel = build_enriched_user($order, 'uzivatel_', 'uzivatel_user_id');
        $odesilatel = build_enriched_user($order, 'odesilatel_', 'odesilatel_user_id');
        $fakturant = build_enriched_user($order, 'fakturant_', 'fakturant_user_id');
        $dodavatel_potvrdil = build_enriched_user($order, 'dodavatel_potvrdil_', 'dodavatel_potvrdil_user_id');
        $potvrdil_vecnou_spravnost = build_enriched_user($order, 'potvrdil_vecnou_spravnost_', 'potvrdil_vecnou_spravnost_user_id');
        $dokoncil = build_enriched_user($order, 'dokoncil_', 'dokoncil_user_id');
        
        // === VÝPOČET CEN ===
        $celkova_cena_bez_dph = 0.0;
        $celkova_cena_s_dph = 0.0;
        
        foreach ($items as $item) {
            if ($item['cena_bez_dph']) {
                $celkova_cena_bez_dph += (float)$item['cena_bez_dph'];
            }
            if ($item['cena_s_dph']) {
                $celkova_cena_s_dph += (float)$item['cena_s_dph'];
            }
        }
        
        $vypoctene_dph = $celkova_cena_s_dph - $celkova_cena_bez_dph;
        
        // === AKTUÁLNÍ DATUM A ČAS ===
        $now = time();
        
        // === SESTAVENÍ VYPOČÍTANÝCH HODNOT ===
        $vypocitane = array(
            // Ceny - RAW formát
            'celkova_cena_bez_dph' => number_format($celkova_cena_bez_dph, 2, '.', ''),
            'celkova_cena_s_dph' => number_format($celkova_cena_s_dph, 2, '.', ''),
            'vypoctene_dph' => number_format($vypoctene_dph, 2, '.', ''),
            
            // Ceny - S FORMÁTOVÁNÍM (mezera jako tisícový oddělovač)
            'celkova_cena_bez_dph_kc' => format_cz_currency($celkova_cena_bez_dph),
            'celkova_cena_s_dph_kc' => format_cz_currency($celkova_cena_s_dph),
            'vypoctene_dph_kc' => format_cz_currency($vypoctene_dph),
            
            // Statistiky
            'pocet_polozek' => count($items),
            'pocet_priloh' => count($attachments),
            
            // Datum a čas generování
            'datum_generovani' => date('d.m.Y', $now),
            'cas_generovani' => date('H:i', $now),
            'datum_cas_generovani' => date('d.m.Y H:i', $now)
        );
        
        // Přidání kombinací jmen pro všechny uživatele
        if ($garant_uzivatel) {
            $combinations = build_name_combinations($garant_uzivatel);
            $vypocitane['garant_jmeno_prijmeni'] = $combinations['jmeno_prijmeni'];
            $vypocitane['garant_prijmeni_jmeno'] = $combinations['prijmeni_jmeno'];
            $vypocitane['garant_cele_jmeno_s_tituly'] = $combinations['cele_jmeno_s_tituly'];
            $vypocitane['garant_jmeno'] = $combinations['jmeno'];
            $vypocitane['garant_prijmeni'] = $combinations['prijmeni'];
        }
        
        if ($prikazce_uzivatel) {
            $combinations = build_name_combinations($prikazce_uzivatel);
            $vypocitane['prikazce_jmeno_prijmeni'] = $combinations['jmeno_prijmeni'];
            $vypocitane['prikazce_prijmeni_jmeno'] = $combinations['prijmeni_jmeno'];
            $vypocitane['prikazce_cele_jmeno_s_tituly'] = $combinations['cele_jmeno_s_tituly'];
            $vypocitane['prikazce_jmeno'] = $combinations['jmeno'];
            $vypocitane['prikazce_prijmeni'] = $combinations['prijmeni'];
        }
        
        if ($schvalovatel) {
            $combinations = build_name_combinations($schvalovatel);
            $vypocitane['schvalovatel_jmeno_prijmeni'] = $combinations['jmeno_prijmeni'];
            $vypocitane['schvalovatel_prijmeni_jmeno'] = $combinations['prijmeni_jmeno'];
            $vypocitane['schvalovatel_cele_jmeno_s_tituly'] = $combinations['cele_jmeno_s_tituly'];
        }
        
        if ($uzivatel) {
            $combinations = build_name_combinations($uzivatel);
            $vypocitane['objednatel_jmeno_prijmeni'] = $combinations['jmeno_prijmeni'];
            $vypocitane['objednatel_prijmeni_jmeno'] = $combinations['prijmeni_jmeno'];
            $vypocitane['objednatel_cele_jmeno'] = $combinations['cele_jmeno_s_tituly'];
        }
        
        if ($odesilatel) {
            $combinations = build_name_combinations($odesilatel);
            $vypocitane['odesilatel_jmeno_prijmeni'] = $combinations['jmeno_prijmeni'];
            $vypocitane['odesilatel_prijmeni_jmeno'] = $combinations['prijmeni_jmeno'];
            $vypocitane['odesilatel_cele_jmeno'] = $combinations['cele_jmeno_s_tituly'];
        }
        
        // === SEZNAM DOSTUPNÝCH UŽIVATELŮ PRO PODPIS ===
        $dostupni_uzivatele = array();
        
        if ($garant_uzivatel) {
            $dostupni_uzivatele[] = array(
                'id' => $garant_uzivatel['id'],
                'cele_jmeno' => $garant_uzivatel['cele_jmeno'],
                'role' => 'Garant',
                'lokalita_nazev' => $garant_uzivatel['lokalita'] ? $garant_uzivatel['lokalita']['nazev'] : ''
            );
        }
        
        if ($prikazce_uzivatel) {
            $dostupni_uzivatele[] = array(
                'id' => $prikazce_uzivatel['id'],
                'cele_jmeno' => $prikazce_uzivatel['cele_jmeno'],
                'role' => 'Příkazce',
                'lokalita_nazev' => $prikazce_uzivatel['lokalita'] ? $prikazce_uzivatel['lokalita']['nazev'] : ''
            );
        }
        
        if ($schvalovatel) {
            $dostupni_uzivatele[] = array(
                'id' => $schvalovatel['id'],
                'cele_jmeno' => $schvalovatel['cele_jmeno'],
                'role' => 'Schvalovatel',
                'lokalita_nazev' => $schvalovatel['lokalita'] ? $schvalovatel['lokalita']['nazev'] : ''
            );
        }
        
        if ($uzivatel) {
            $dostupni_uzivatele[] = array(
                'id' => $uzivatel['id'],
                'cele_jmeno' => $uzivatel['cele_jmeno'],
                'role' => 'Objednatel',
                'lokalita_nazev' => $uzivatel['lokalita'] ? $uzivatel['lokalita']['nazev'] : ''
            );
        }
        
        if ($odesilatel) {
            $dostupni_uzivatele[] = array(
                'id' => $odesilatel['id'],
                'cele_jmeno' => $odesilatel['cele_jmeno'],
                'role' => 'Odesílatel',
                'lokalita_nazev' => $odesilatel['lokalita'] ? $odesilatel['lokalita']['nazev'] : ''
            );
        }
        
        if ($fakturant) {
            $dostupni_uzivatele[] = array(
                'id' => $fakturant['id'],
                'cele_jmeno' => $fakturant['cele_jmeno'],
                'role' => 'Fakturant',
                'lokalita_nazev' => $fakturant['lokalita'] ? $fakturant['lokalita']['nazev'] : ''
            );
        }
        
        // === SESTAVENÍ VÝSLEDNÉ STRUKTURY ===
        $result = array(
            // Základní data objednávky
            'id' => (int)$order['id'],
            'cislo_objednavky' => $order['cislo_objednavky'] ? $order['cislo_objednavky'] : '',
            'dt_objednavky' => $order['dt_objednavky'] ? $order['dt_objednavky'] : '',
            'predmet' => $order['predmet'] ? $order['predmet'] : '',
            'max_cena_s_dph' => $order['max_cena_s_dph'] ? $order['max_cena_s_dph'] : '',
            'poznamka' => $order['poznamka'] ? $order['poznamka'] : '',
            'strediska_kod' => $order['strediska_kod'] ? json_decode($order['strediska_kod'], true) : array(),
            'financovani' => $order['financovani'] ? json_decode($order['financovani'], true) : null,
            'druh_objednavky_kod' => $order['druh_objednavky_kod'] ? $order['druh_objednavky_kod'] : '',
            'stav_workflow_kod' => $order['stav_workflow_kod'] ? $order['stav_workflow_kod'] : '',
            'dt_predpokladany_termin_dodani' => $order['dt_predpokladany_termin_dodani'] ? $order['dt_predpokladany_termin_dodani'] : '',
            'misto_dodani' => $order['misto_dodani'] ? $order['misto_dodani'] : '',
            'zaruka' => $order['zaruka'] ? $order['zaruka'] : '',
            
            // ENRICHED UŽIVATELÉ
            'garant_uzivatel_id' => $order['garant_uzivatel_id'] ? (int)$order['garant_uzivatel_id'] : null,
            'garant_uzivatel' => $garant_uzivatel,
            
            'prikazce_id' => $order['prikazce_id'] ? (int)$order['prikazce_id'] : null,
            'prikazce_uzivatel' => $prikazce_uzivatel,
            
            'schvalovatel_id' => $order['schvalovatel_id'] ? (int)$order['schvalovatel_id'] : null,
            'schvalovatel' => $schvalovatel,
            
            'uzivatel_id' => $order['uzivatel_id'] ? (int)$order['uzivatel_id'] : null,
            'uzivatel' => $uzivatel,
            
            'odesilatel_id' => $order['odesilatel_id'] ? (int)$order['odesilatel_id'] : null,
            'odesilatel' => $odesilatel,
            
            'fakturant_id' => $order['fakturant_id'] ? (int)$order['fakturant_id'] : null,
            'fakturant' => $fakturant,
            
            'dodavatel_potvrdil_id' => $order['dodavatel_potvrdil_id'] ? (int)$order['dodavatel_potvrdil_id'] : null,
            'dodavatel_potvrdil' => $dodavatel_potvrdil,
            
            'potvrdil_vecnou_spravnost_id' => $order['potvrdil_vecnou_spravnost_id'] ? (int)$order['potvrdil_vecnou_spravnost_id'] : null,
            'potvrdil_vecnou_spravnost' => $potvrdil_vecnou_spravnost,
            
            'dokoncil_id' => $order['dokoncil_id'] ? (int)$order['dokoncil_id'] : null,
            'dokoncil' => $dokoncil,
            
            // DODAVATEL
            'dodavatel_nazev' => $order['dodavatel_nazev'] ? $order['dodavatel_nazev'] : '',
            'dodavatel_adresa' => $order['dodavatel_adresa'] ? $order['dodavatel_adresa'] : '',
            'dodavatel_ico' => $order['dodavatel_ico'] ? $order['dodavatel_ico'] : '',
            'dodavatel_dic' => $order['dodavatel_dic'] ? $order['dodavatel_dic'] : '',
            'dodavatel_zastoupeny' => $order['dodavatel_zastoupeny'] ? $order['dodavatel_zastoupeny'] : '',
            'dodavatel_kontakt_jmeno' => $order['dodavatel_kontakt_jmeno'] ? $order['dodavatel_kontakt_jmeno'] : '',
            'dodavatel_kontakt_email' => $order['dodavatel_kontakt_email'] ? $order['dodavatel_kontakt_email'] : '',
            'dodavatel_kontakt_telefon' => $order['dodavatel_kontakt_telefon'] ? $order['dodavatel_kontakt_telefon'] : '',
            
            // POLOŽKY
            'polozky' => $items,
            'polozky_count' => count($items),
            
            // PŘÍLOHY
            'prilohy' => $attachments,
            'prilohy_count' => count($attachments),
            
            // VYPOČÍTANÉ HODNOTY
            'vypocitane' => $vypocitane,
            
            // SEZNAM DOSTUPNÝCH UŽIVATELŮ PRO PODPIS
            'dostupni_uzivatele_pro_podpis' => $dostupni_uzivatele
        );
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage());
    }
}

?>