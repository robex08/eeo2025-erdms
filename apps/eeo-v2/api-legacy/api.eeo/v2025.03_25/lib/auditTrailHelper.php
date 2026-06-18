<?php
/**
 * AUDIT TRAIL HELPER - EEO Fáze 1
 * 
 * Funkce pro field-level audit log změn v systému EEO.
 * Ukládá do tabulky 25a_audit_zmen (TBL_AUDIT_ZMEN).
 * 
 * Napojení na zastupování: používá existující check_and_log_substitution_action()
 * a ukládá zastupovani_id jako nullable referenci. Tabulka 25_zastupovani_akce_log
 * zůstává BEZE ZMĚN.
 * 
 * POUŽITÍ:
 * 
 * // Jednoduchý UPDATE audit (před a po):
 * audit_log_field_changes($db, $token_data, 'OBJEDNAVKA', $order_id, 'order-v2/update', $old, $new);
 * 
 * // CREATE akce (nový objekt):
 * audit_log_action($db, $token_data, 'FAKTURA', $faktura_id, 'CREATE', 'invoices25/create');
 * 
 * // Specifická akce bez diff (UNLOCK, APPROVE apod.):
 * audit_log_action($db, $token_data, 'OBJEDNAVKA', $order_id, 'UNLOCK', 'orders25/unlock', 'Force unlock administrátorem');
 */

if (!defined('AUDIT_TRAIL_LOADED')) {
    define('AUDIT_TRAIL_LOADED', true);

// ============================================================================
// WHITELIST polí pro audit podle typu objektu
// Technická pole (dt_aktualizace, uzivatel_akt_id, ...) se NEauditují.
// ============================================================================
define('AUDIT_FIELDS_OBJEDNAVKA', [
    // Identifikace
    'cislo_objednavky',
    'dt_objednavky',
    'druh_objednavky_kod',
    'strediska_kod',
    'mimoradna_udalost',
    // Předmět a cena
    'predmet',
    'max_cena_s_dph',
    'financovani',
    // Workflow a stav
    'stav_workflow_kod',
    'stav_objednavky',
    // Uživatelé a role
    'uzivatel_id',
    'objednatel_id',
    'prikazce_id',
    'garant_uzivatel_id',
    'schvalovatel_id',
    'fakturant_id',
    // Schválení
    'dt_schvaleni',
    'schvaleni_komentar',
    // Dodavatel
    'dodavatel_id',
    'dodavatel_nazev',
    'dodavatel_adresa',
    'dodavatel_ico',
    'dodavatel_dic',
    'dodavatel_zastoupeny',
    'dodavatel_kontakt_jmeno',
    'dodavatel_kontakt_email',
    'dodavatel_kontakt_telefon',
    // Dodací podmínky
    'dt_predpokladany_termin_dodani',
    'misto_dodani',
    'zaruka',
    // Odeslání a akceptace
    'dt_odeslani',
    'odesilatel_id',
    'odeslani_storno_duvod',
    'dodavatel_zpusob_potvrzeni',
    'dt_akceptace',
    'dodavatel_potvrdil_id',
    // Poznámky
    'poznamka',
    // Položky objednávky (syntetické pole pro diff kolekce položek)
    'polozky_objednavky',
    // Dokončení
    'dokoncil_id',
    'dt_dokonceni',
    'dokonceni_poznamka',
    'potvrzeni_dokonceni_objednavky',
    // Věcná správnost
    'potvrdil_vecnou_spravnost_id',
    'potvrzeni_vecne_spravnosti',
    'vecna_spravnost_umisteni_majetku',
    'vecna_spravnost_poznamka',
    // Ostatní
    'registr_iddt',
    'aktivni',
]);

define('AUDIT_FIELDS_OBJEDNAVKA_POLOZKA', [
    'objednavka_id',
    'lp_id',
    'popis',
    'cena_bez_dph',
    'sazba_dph',
    'cena_s_dph',
    'usek_kod',
    'budova_kod',
    'mistnost_kod',
    'poznamka',
]);

define('AUDIT_FIELDS_FAKTURA', [
    'objednavka_id',
    'smlouva_id',
    'fa_castka',
    'fa_cislo_vema',
    'fa_vema_kod',
    'fa_typ',
    'fa_datum_vystaveni',
    'fa_datum_splatnosti',
    'fa_datum_doruceni',
    'fa_datum_zaplaceni',
    'fa_strediska_kod',
    'fa_poznamka',
    'rozsirujici_data',
    'fa_dorucena',
    'fa_zaplacena',
    'stav',
    'vecna_spravnost_potvrzeno',
    'potvrdil_vecnou_spravnost_id',
    'vecna_spravnost_duvod',
    'vecna_spravnost_poznamka',
    'vecna_spravnost_umisteni_majetku',
    'fa_predana_zam_id',
    'fa_datum_predani_zam',
    'fa_datum_vraceni_zam',
    'aktivni',
]);

define('AUDIT_FIELDS_ROCNI_POPLATEK', [
    'smlouva_id',
    'dodavatel_id',
    'nazev',
    'popis',
    'poznamka',
    'rok',
    'druh',
    'platba',
    'celkova_castka',
    'zaplaceno_celkem',
    'zbyva_zaplatit',
    'stav',
    'rozsirujici_data',
    'aktivni',
]);

define('AUDIT_FIELDS_ROCNI_POPLATEK_POLOZKA', [
    'rocni_poplatek_id',
    'faktura_id',
    'poradi',
    'nazev_polozky',
    'castka',
    'datum_splatnosti',
    'datum_zaplaceno',
    'datum_zaplaceni',
    'cislo_dokladu',
    'stav',
    'poznamka',
    'rozsirujici_data',
    'aktivni',
]);

define('AUDIT_FIELDS_DODAVATEL', [
    'nazev', 'adresa', 'ico', 'dic', 'zastoupeny',
    'kontakt_jmeno', 'kontakt_email', 'kontakt_telefon',
]);

define('AUDIT_FIELDS_UZIVATEL', [
    'jmeno', 'prijmeni', 'titul_pred', 'titul_za',
    'email', 'telefon',
    'usek_id', 'lokalita_id', 'pozice_id', 'organizace_id',
    'aktivni',
]);

// Mapa typ → whitelist
$AUDIT_FIELDS_MAP = [
    'OBJEDNAVKA'              => AUDIT_FIELDS_OBJEDNAVKA,
    'OBJEDNAVKA_POLOZKA'      => AUDIT_FIELDS_OBJEDNAVKA_POLOZKA,
    'FAKTURA'                 => AUDIT_FIELDS_FAKTURA,
    'ROCNI_POPLATEK'          => AUDIT_FIELDS_ROCNI_POPLATEK,
    'ROCNI_POPLATEK_POLOZKA'  => AUDIT_FIELDS_ROCNI_POPLATEK_POLOZKA,
    'DODAVATEL'               => AUDIT_FIELDS_DODAVATEL,
    'UZIVATEL'                => AUDIT_FIELDS_UZIVATEL,
];

/**
 * Převod workflow/stavových kódů objednávky na audit akci.
 * Vrací null, pokud pro stav nemá být zapsána samostatná akce.
 */
function audit_map_order_state_to_action($state_code) {
    $state = strtoupper(trim((string)$state_code));
    if ($state === '') {
        return null;
    }

    // Schvalovací rozhodnutí příkazce
    if ($state === 'SCHVALENA') {
        return 'APPROVE';
    }
    if ($state === 'ZAMITNUTA') {
        return 'REJECT';
    }
    if (in_array($state, ['CEKA_SE', 'ODLOZENO', 'ODLOZENA', 'ODLOZENI'], true)) {
        return 'POSTPONE';
    }

    // Uživatelské storno musí být oddělené od zamítnutí
    if (in_array($state, ['STORNO', 'STORNOVANA', 'STORNOVANO', 'ZRUSENA', 'ZRUSENO'], true)) {
        return 'STORNO';
    }

    // Přechod do schvalování
    if (in_array($state, ['ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI'], true)) {
        return 'SUBMIT';
    }

    return null;
}

// ============================================================================
// INTERNÍ POMOCNÉ FUNKCE
// ============================================================================

/**
 * Normalizuje hodnotu pro srovnání (JSON pole → seřazené, null/empty sjednotit).
 */
function _audit_normalize_value($value) {
    if ($value === null || $value === '' || $value === 'NULL') {
        return null;
    }
    // Pokus o JSON decode (pro JSON pole jako stav_workflow_kod, fa_strediska_kod)
    if (is_string($value) && strlen($value) > 1 && ($value[0] === '[' || $value[0] === '{')) {
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            // Seřadit pole hodnot pro stabilní porovnání
            if (is_array($decoded) && array_values($decoded) === $decoded) {
                sort($decoded);
            }
            return json_encode($decoded, JSON_UNESCAPED_UNICODE);
        }
    }
    return (string)$value;
}

/**
 * Serializuje hodnotu pro uložení do audit záznamu.
 */
function _audit_serialize($value) {
    if ($value === null) {
        return null;
    }
    if (is_array($value) || is_object($value)) {
        return json_encode($value, JSON_UNESCAPED_UNICODE);
    }
    return (string)$value;
}

/**
 * Vrátí UUID v4 pro batch_id.
 */
function _audit_generate_batch_id() {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * Z token_data/parametru vytáhne cílového zastupovaného pro audit.
 * Vrací int ID nebo null.
 */
function _audit_extract_target_zastupovany_id($token_data, $explicit_target_zastupovany_id = null) {
    $explicit = (int)$explicit_target_zastupovany_id;
    if ($explicit > 0) {
        return $explicit;
    }

    if (!is_array($token_data)) {
        return null;
    }

    $direct_keys = array('audit_target_user_id', 'target_zastupovany_id', 'zastupovany_id', 'pro_uzivatele_id');
    foreach ($direct_keys as $key) {
        if (isset($token_data[$key]) && (int)$token_data[$key] > 0) {
            return (int)$token_data[$key];
        }
    }

    if (isset($token_data['substitution_context']) && is_array($token_data['substitution_context'])) {
        $ctx = $token_data['substitution_context'];
        if (isset($ctx['zastupovany_id']) && (int)$ctx['zastupovany_id'] > 0) {
            return (int)$ctx['zastupovany_id'];
        }
    }

    if (isset($token_data['delegation']) && is_array($token_data['delegation'])) {
        $delegation = $token_data['delegation'];
        if (isset($delegation['zastupovany_id']) && (int)$delegation['zastupovany_id'] > 0) {
            return (int)$delegation['zastupovany_id'];
        }
    }

    return null;
}

/**
 * Zjistí zastupovani_id z aktivního zastupování uživatele.
 * Vrátí int ID nebo null.
 * Selhání je non-fatal.
 */
function _audit_get_zastupovani_id($db, $uzivatel_id, $token_data = array(), $target_zastupovany_id = null) {
    if (!function_exists('get_active_substitution_for_action')) {
        return null;
    }
    try {
        $resolved_target_zastupovany_id = _audit_extract_target_zastupovany_id($token_data, $target_zastupovany_id);
        $substitution = get_active_substitution_for_action($db, (int)$uzivatel_id, 'approve', $resolved_target_zastupovany_id);
        if ($substitution && !empty($substitution['zastupovani_id'])) {
            return (int)$substitution['zastupovani_id'];
        }
    } catch (Exception $e) {
        error_log('[AUDIT] _audit_get_zastupovani_id error: ' . $e->getMessage());
    }
    return null;
}

/**
 * Vrátí snapshot uživatelských údajů z token_data.
 */
function _audit_user_snapshot($db, $token_data) {
    $uzivatel_id = isset($token_data['id']) ? (int)$token_data['id'] : 0;
    $username    = isset($token_data['username']) ? (string)$token_data['username'] : '';
    $jmeno       = '';
    $prijmeni    = '';

    if ($uzivatel_id > 0 && $db) {
        try {
            $stmt = $db->prepare(
                "SELECT jmeno, prijmeni FROM `" . TBL_UZIVATELE . "` WHERE id = ? LIMIT 1"
            );
            $stmt->execute([$uzivatel_id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $jmeno    = (string)($row['jmeno'] ?? '');
                $prijmeni = (string)($row['prijmeni'] ?? '');
            }
        } catch (Exception $e) {
            error_log('[AUDIT] _audit_user_snapshot DB error: ' . $e->getMessage());
        }
    }

    return [$uzivatel_id, $username, $jmeno, $prijmeni];
}

// ============================================================================
// VEŘEJNÉ FUNKCE
// ============================================================================

/**
 * Zapíše audit záznamy pro field-level změny (diff starého a nového stavu).
 * Jeden řádek v 25a_audit_zmen = jedna změna jednoho pole.
 * 
 * @param PDO    $db          DB spojení
 * @param array  $token_data  Výsledek verify_token() – musí obsahovat 'id', 'username'
 * @param string $objekt_typ  OBJEDNAVKA | FAKTURA | ROCNI_POPLATEK | ...
 * @param int    $objekt_id   ID změněného objektu
 * @param string $endpoint    Endpoint ze kterého přišla změna (pro log)
 * @param array  $stary_stav  Stará data (associative array)
 * @param array  $novy_stav   Nová data (associative array)
 * @param string $batch_id    UUID pro propojení více změn z jednoho save (volitelné)
 * @param string $poznamka    Volitelná poznámka
 * @return string  batch_id (pro případné propojení dalších změn)
 */
function audit_log_field_changes(
    $db,
    $token_data,
    $objekt_typ,
    $objekt_id,
    $endpoint,
    array $stary_stav,
    array $novy_stav,
    $batch_id = '',
    $poznamka = ''
) {
    global $AUDIT_FIELDS_MAP;

    if (!$db || !$token_data || !$objekt_id) {
        return $batch_id ?: _audit_generate_batch_id();
    }

    try {
        if (!$batch_id) {
            $batch_id = _audit_generate_batch_id();
        }

        // Whitelist polí pro tento typ
        $allowed_fields = isset($AUDIT_FIELDS_MAP[$objekt_typ])
            ? $AUDIT_FIELDS_MAP[$objekt_typ]
            : [];

        // Vypočítat diff
        $changes = [];
        foreach ($allowed_fields as $pole) {
            $stara = _audit_normalize_value($stary_stav[$pole] ?? null);
            $nova  = _audit_normalize_value($novy_stav[$pole] ?? null);

            if ($stara !== $nova) {
                $changes[] = [
                    'pole'             => $pole,
                    'stara_hodnota'    => _audit_serialize($stary_stav[$pole] ?? null),
                    'nova_hodnota'     => _audit_serialize($novy_stav[$pole] ?? null),
                ];
            }
        }

        if (empty($changes)) {
            return $batch_id; // Žádná auditovatelná změna
        }

        list($uzivatel_id, $username, $jmeno, $prijmeni) = _audit_user_snapshot($db, $token_data);
        $zastupovani_id = _audit_get_zastupovani_id($db, $uzivatel_id, $token_data);
        $ip             = _audit_get_ip();
        $user_agent     = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 255) : null;
        $dt_akce        = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

        $sql = "INSERT INTO `" . TBL_AUDIT_ZMEN . "`
            (uzivatel_id, username_snapshot, jmeno_snapshot, prijmeni_snapshot,
             objekt_typ, objekt_id, akce_typ,
             pole, stara_hodnota_json, nova_hodnota_json,
             endpoint, batch_id, ip_adresa, user_agent,
             zastupovani_id, poznamka, dt_akce)
            VALUES
            (:uzivatel_id, :username_snapshot, :jmeno_snapshot, :prijmeni_snapshot,
             :objekt_typ, :objekt_id, 'UPDATE',
             :pole, :stara_hodnota_json, :nova_hodnota_json,
             :endpoint, :batch_id, :ip_adresa, :user_agent,
             :zastupovani_id, :poznamka, :dt_akce)";

        $stmt = $db->prepare($sql);

        foreach ($changes as $change) {
            $stmt->execute([
                ':uzivatel_id'        => $uzivatel_id,
                ':username_snapshot'  => $username,
                ':jmeno_snapshot'     => $jmeno,
                ':prijmeni_snapshot'  => $prijmeni,
                ':objekt_typ'         => $objekt_typ,
                ':objekt_id'          => (int)$objekt_id,
                ':pole'               => $change['pole'],
                ':stara_hodnota_json' => $change['stara_hodnota'],
                ':nova_hodnota_json'  => $change['nova_hodnota'],
                ':endpoint'           => substr($endpoint, 0, 150),
                ':batch_id'           => $batch_id,
                ':ip_adresa'          => $ip,
                ':user_agent'         => $user_agent,
                ':zastupovani_id'     => $zastupovani_id,
                ':poznamka'           => $poznamka ? substr($poznamka, 0, 500) : null,
                ':dt_akce'            => $dt_akce,
            ]);
        }

    } catch (Exception $e) {
        // FAIL-SAFE: audit nikdy nesmí rozbít business transakci
        error_log('[AUDIT] audit_log_field_changes error: ' . $e->getMessage());
    }

    return $batch_id;
}

/**
 * Zapíše jednorázový audit záznam pro akci BEZ field diffu
 * (CREATE, DELETE, UNLOCK, APPROVE, REJECT, POSTPONE, STORNO, SUBMIT, LOCK apod.)
 * 
 * @param PDO    $db
 * @param array  $token_data
 * @param string $objekt_typ
 * @param int    $objekt_id
 * @param string $akce_typ    CREATE | DELETE | UNLOCK | APPROVE | REJECT | POSTPONE | STORNO | SUBMIT | LOCK
 * @param string $endpoint
 * @param string $poznamka
 * @param string $batch_id
 * @return string batch_id
 */
function audit_log_action(
    $db,
    $token_data,
    $objekt_typ,
    $objekt_id,
    $akce_typ,
    $endpoint,
    $poznamka = '',
    $batch_id = ''
) {
    if (!$db || !$token_data || !$objekt_id) {
        return $batch_id ?: _audit_generate_batch_id();
    }

    try {
        if (!$batch_id) {
            $batch_id = _audit_generate_batch_id();
        }

        list($uzivatel_id, $username, $jmeno, $prijmeni) = _audit_user_snapshot($db, $token_data);
        $zastupovani_id = _audit_get_zastupovani_id($db, $uzivatel_id, $token_data);
        $ip             = _audit_get_ip();
        $user_agent     = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 255) : null;
        $dt_akce        = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

        $sql = "INSERT INTO `" . TBL_AUDIT_ZMEN . "`
            (uzivatel_id, username_snapshot, jmeno_snapshot, prijmeni_snapshot,
             objekt_typ, objekt_id, akce_typ,
             pole, stara_hodnota_json, nova_hodnota_json,
             endpoint, batch_id, ip_adresa, user_agent,
             zastupovani_id, poznamka, dt_akce)
            VALUES
            (:uzivatel_id, :username_snapshot, :jmeno_snapshot, :prijmeni_snapshot,
             :objekt_typ, :objekt_id, :akce_typ,
             '', NULL, NULL,
             :endpoint, :batch_id, :ip_adresa, :user_agent,
             :zastupovani_id, :poznamka, :dt_akce)";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':uzivatel_id'        => $uzivatel_id,
            ':username_snapshot'  => $username,
            ':jmeno_snapshot'     => $jmeno,
            ':prijmeni_snapshot'  => $prijmeni,
            ':objekt_typ'         => $objekt_typ,
            ':objekt_id'          => (int)$objekt_id,
            ':akce_typ'           => strtoupper($akce_typ),
            ':endpoint'           => substr($endpoint, 0, 150),
            ':batch_id'           => $batch_id,
            ':ip_adresa'          => $ip,
            ':user_agent'         => $user_agent,
            ':zastupovani_id'     => $zastupovani_id,
            ':poznamka'           => $poznamka ? substr($poznamka, 0, 500) : null,
            ':dt_akce'            => $dt_akce,
        ]);

    } catch (Exception $e) {
        error_log('[AUDIT] audit_log_action error: ' . $e->getMessage());
    }

    return $batch_id;
}

/**
 * Vrátí IP adresu klienta pro audit log.
 */
function _audit_get_ip() {
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        return $_SERVER['HTTP_X_REAL_IP'];
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($parts[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? null;
}

/**
 * Zapíše audit záznam CREATE včetně počátečních hodnot whitelistovaných polí.
 * Jeden hlavičkový CREATE řádek + jeden řádek per neprázdné pole (old=NULL, new=hodnota).
 * Všechny řádky sdílejí stejný batch_id.
 *
 * @param PDO    $db
 * @param array  $token_data
 * @param string $objekt_typ  OBJEDNAVKA | FAKTURA | ROCNI_POPLATEK | DODAVATEL ...
 * @param int    $objekt_id
 * @param string $endpoint
 * @param array  $data        Počáteční data nového záznamu (associative array)
 * @param string $poznamka
 * @param string $batch_id
 * @return string batch_id
 */
function audit_log_create_with_data(
    $db,
    $token_data,
    $objekt_typ,
    $objekt_id,
    $endpoint,
    array $data,
    $poznamka = '',
    $batch_id = ''
) {
    global $AUDIT_FIELDS_MAP;

    if (!$db || !$token_data || !$objekt_id) {
        return _audit_generate_batch_id();
    }

    if (!$batch_id) {
        $batch_id = _audit_generate_batch_id();
    }

    try {
        list($uzivatel_id, $username, $jmeno, $prijmeni) = _audit_user_snapshot($db, $token_data);
        $zastupovani_id = _audit_get_zastupovani_id($db, $uzivatel_id, $token_data);
        $ip             = _audit_get_ip();
        $user_agent     = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 255) : null;
        $dt_akce        = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

        $sql = "INSERT INTO `" . TBL_AUDIT_ZMEN . "`
            (uzivatel_id, username_snapshot, jmeno_snapshot, prijmeni_snapshot,
             objekt_typ, objekt_id, akce_typ,
             pole, stara_hodnota_json, nova_hodnota_json,
             endpoint, batch_id, ip_adresa, user_agent,
             zastupovani_id, poznamka, dt_akce)
            VALUES
            (:uzivatel_id, :username_snapshot, :jmeno_snapshot, :prijmeni_snapshot,
             :objekt_typ, :objekt_id, 'CREATE',
             :pole, NULL, :nova_hodnota_json,
             :endpoint, :batch_id, :ip_adresa, :user_agent,
             :zastupovani_id, :poznamka, :dt_akce)";

        $stmt = $db->prepare($sql);
        $base = [
            ':uzivatel_id'       => $uzivatel_id,
            ':username_snapshot' => $username,
            ':jmeno_snapshot'    => $jmeno,
            ':prijmeni_snapshot' => $prijmeni,
            ':objekt_typ'        => $objekt_typ,
            ':objekt_id'         => (int)$objekt_id,
            ':endpoint'          => substr($endpoint, 0, 150),
            ':batch_id'          => $batch_id,
            ':ip_adresa'         => $ip,
            ':user_agent'        => $user_agent,
            ':zastupovani_id'    => $zastupovani_id,
            ':dt_akce'           => $dt_akce,
        ];

        // 1. Hlavičkový CREATE řádek (bez pole/hodnot – značí vznik objektu)
        $stmt->execute(array_merge($base, [
            ':pole'              => '',
            ':nova_hodnota_json' => null,
            ':poznamka'          => $poznamka ? substr($poznamka, 0, 500) : null,
        ]));

        // 2. Řádky pro každé whitelisted pole s neprázdnou hodnotou
        $allowed_fields = isset($AUDIT_FIELDS_MAP[$objekt_typ]) ? $AUDIT_FIELDS_MAP[$objekt_typ] : [];
        foreach ($allowed_fields as $pole) {
            $val        = $data[$pole] ?? null;
            $serialized = _audit_serialize($val);
            if ($serialized === null || $serialized === '') {
                continue;
            }
            $stmt->execute(array_merge($base, [
                ':pole'              => $pole,
                ':nova_hodnota_json' => $serialized,
                ':poznamka'          => null, // field řádky bez poznámky
            ]));
        }

    } catch (Exception $e) {
        error_log('[AUDIT] audit_log_create_with_data error: ' . $e->getMessage());
    }

    return $batch_id;
}

} // end if AUDIT_TRAIL_LOADED
