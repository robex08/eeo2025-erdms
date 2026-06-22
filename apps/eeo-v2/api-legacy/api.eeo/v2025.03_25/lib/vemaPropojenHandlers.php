<?php
/**
 * VEMA Propojení Handlers - Hledání vazeb mezi VEMA a EEO
 * 
 * Endpoint pro propojení VEMA faktur s EEO záznamy (objednávky, faktury, smlouvy)
 * podle různých kritérií (číslo obj, ev.číslo smlouvy, var.symbol, VEMA kód)
 */

require_once __DIR__ . '/dbconfig.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/TimezoneHelper.php';

/**
 * Najde EEO záznamy propojené s VEMA fakturou
 * POST /vema-faktury/propojeni-eeo
 * 
 * Parametry:
 * - token (string, required)
 * - username (string, required)
 * - vema_faktura (object, required) - data VEMA faktury {cfak, cobj, csml, vsymb, cdok, smlouva_ecsml}
 * 
 * Algoritmus hledání (podle priority):
 * 1. Č. objednávky - formát O-xxxx/75030926/2026 → EEO O-xxxx/75030926/2026/usek
 * 2. Ev.číslo smlouvy - smlouva_ecsml → EEO 25_smlouvy.cislo_smlouvy
 * 3. Variabilní symbol - vsymb → EEO 25a_objednavky_faktury (hledat v různých polích)
 * 4. VEMA kód - cdok → EEO 25a_objednavky_faktury.fa_vema_kod
 * 
 * Response: {
 *   status: 'success',
 *   data: {
 *     objednavky: [...],
 *     faktury: [...],
 *     smlouvy: [...],
 *     celkem: 10
 *   }
 * }
 */
function handle_vema_faktury_propojeni_eeo($input, $config) {
    // Validace metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Uživatelské jméno neodpovídá tokenu'));
        return;
    }

    // Kontrola oprávnění VEMA_VIEW
    if (!has_permission($token_data['id'], 'VEMA_VIEW')) {
        http_response_code(403);
        echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k zobrazení Deníku VEMA'));
        return;
    }

    // Data VEMA faktury
    $vema_faktura = isset($input['vema_faktura']) ? $input['vema_faktura'] : array();
    
    if (empty($vema_faktura)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí data VEMA faktury'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        // Výsledky
        $objednavky = array();
        $faktury = array();
        $smlouvy = array();

        // ==================================================================
        // 1. PRIORITA: Hledat podle čísla objednávky
        // ==================================================================
        if (!empty($vema_faktura['cobj_formatovane']) || !empty($vema_faktura['cobj'])) {
            $cobj = !empty($vema_faktura['cobj_formatovane']) ? $vema_faktura['cobj_formatovane'] : $vema_faktura['cobj'];
            
            // VEMA má: O-1234/75030926/2026
            // EEO má: O-1234/75030926/2026/PTN (+ úsek na konci)
            // Hledat pomocí LIKE s wildcardou na konci
            $cobj_pattern = $cobj . '%';
            
            $sql = "SELECT 
                        id, 
                        cislo_objednavky,
                        datum_p as datum_prijeti,
                        celkova_cena_s_dph as castka,
                        stav_objednavky as stav,
                        'objednavka' as typ_zaznamu
                    FROM `" . TBL_OBJEDNAVKY . "` 
                    WHERE cislo_objednavky LIKE ?
                    LIMIT 50";
            
            $stmt = $db->prepare($sql);
            $stmt->execute(array($cobj_pattern));
            $objednavky = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // ==================================================================
        // 2. PRIORITA: Hledat podle evidenčního čísla smlouvy
        // ==================================================================
        if (!empty($vema_faktura['smlouva_ecsml'])) {
            $ecsml = $vema_faktura['smlouva_ecsml'];
            
            $sql = "SELECT 
                        id,
                        cislo_smlouvy,
                        nazev_smlouvy,
                        platnost_od,
                        platnost_do,
                        hodnota_s_dph as castka,
                        stav_smlouvy as stav,
                        'smlouva' as typ_zaznamu
                    FROM `" . TBL_SMLOUVY . "`
                    WHERE cislo_smlouvy = ?
                    LIMIT 10";
            
            $stmt = $db->prepare($sql);
            $stmt->execute(array($ecsml));
            $smlouvy = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // ==================================================================
        // 3. PRIORITA: Hledat podle variabilního symbolu
        // ==================================================================
        if (!empty($vema_faktura['vsymb'])) {
            $vsymb = $vema_faktura['vsymb'];
            
            // Hledat v rozsirujici_data JSON (obsahuje var.symbol někdy)
            // Nebo přímo v poli, pokud existuje
            $sql = "SELECT 
                        f.id,
                        f.fa_cislo_vema as cislo_faktury,
                        f.fa_datum_vystaveni as datum_vystaveni,
                        f.fa_castka as castka,
                        f.stav,
                        o.cislo_objednavky,
                        'faktura' as typ_zaznamu
                    FROM `" . TBL_FAKTURY . "` f
                    LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                    WHERE f.fa_cislo_vema = ?
                       OR f.rozsirujici_data LIKE ?
                    LIMIT 50";
            
            $stmt = $db->prepare($sql);
            $stmt->execute(array($vsymb, '%' . $vsymb . '%'));
            $faktury_vsymb = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $faktury = array_merge($faktury, $faktury_vsymb);
        }

        // ==================================================================
        // 4. PRIORITA: Hledat podle VEMA kódu (cdok)
        // ==================================================================
        if (!empty($vema_faktura['cdok'])) {
            $cdok = $vema_faktura['cdok'];
            
            $sql = "SELECT 
                        f.id,
                        f.fa_cislo_vema as cislo_faktury,
                        f.fa_vema_kod,
                        f.fa_datum_vystaveni as datum_vystaveni,
                        f.fa_castka as castka,
                        f.stav,
                        o.cislo_objednavky,
                        'faktura' as typ_zaznamu
                    FROM `" . TBL_FAKTURY . "` f
                    LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                    WHERE f.fa_vema_kod = ?
                    LIMIT 50";
            
            $stmt = $db->prepare($sql);
            $stmt->execute(array($cdok));
            $faktury_cdok = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $faktury = array_merge($faktury, $faktury_cdok);
        }

        // Deduplikace faktur podle ID
        $faktury_unique = array();
        $seen_ids = array();
        foreach ($faktury as $faktura) {
            if (!in_array($faktura['id'], $seen_ids)) {
                $faktury_unique[] = $faktura;
                $seen_ids[] = $faktura['id'];
            }
        }

        // Celkový počet nalezených záznamů
        $celkem = count($objednavky) + count($faktury_unique) + count($smlouvy);

        // Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'objednavky' => $objednavky,
                'faktury' => $faktury_unique,
                'smlouvy' => $smlouvy,
                'celkem' => $celkem,
                'kriteria' => array(
                    'cobj' => !empty($vema_faktura['cobj_formatovane']) ? $vema_faktura['cobj_formatovane'] : (!empty($vema_faktura['cobj']) ? $vema_faktura['cobj'] : null),
                    'ecsml' => !empty($vema_faktura['smlouva_ecsml']) ? $vema_faktura['smlouva_ecsml'] : null,
                    'vsymb' => !empty($vema_faktura['vsymb']) ? $vema_faktura['vsymb'] : null,
                    'cdok' => !empty($vema_faktura['cdok']) ? $vema_faktura['cdok'] : null
                )
            ),
            'message' => 'Propojení nalezeno'
        ));

    } catch (Exception $e) {
        error_log("VEMA Propojení Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při hledání propojení: ' . $e->getMessage()
        ));
    }
}
