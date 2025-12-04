<?php
/**
 * Universal Search - Helper Functions
 * PHP 5.6 compatible
 * 
 * Utility funkce pro univerzální vyhledávání:
 * - Escapování LIKE wildcards
 * - Formátování highlight textů
 * - Formátování uživatelských jmen
 */

/**
 * Odstraní diakritiku z českého textu
 * Pro vyhledávání bez háčků a čárek
 * 
 * @param string $string Vstupní řetězec s diakritikou
 * @return string Řetězec bez diakritiky
 */
function removeDiacritics($string) {
    if (empty($string)) {
        return '';
    }
    
    // České znaky s diakritikou
    $from = array(
        'á', 'Á', 'č', 'Č', 'ď', 'Ď', 'é', 'É', 'ě', 'Ě',
        'í', 'Í', 'ň', 'Ň', 'ó', 'Ó', 'ř', 'Ř', 'š', 'Š',
        'ť', 'Ť', 'ú', 'Ú', 'ů', 'Ů', 'ý', 'Ý', 'ž', 'Ž'
    );
    
    // Bez diakritiky
    $to = array(
        'a', 'A', 'c', 'C', 'd', 'D', 'e', 'E', 'e', 'E',
        'i', 'I', 'n', 'N', 'o', 'O', 'r', 'R', 's', 'S',
        't', 'T', 'u', 'U', 'u', 'U', 'y', 'Y', 'z', 'Z'
    );
    
    return str_replace($from, $to, $string);
}

/**
 * Escapuje speciální znaky pro LIKE dotazy (% a _)
 * Zamezuje SQL injection přes wildcard characters
 * 
 * @param string $string Vstupní řetězec
 * @return string Escapovaný řetězec
 */
function escapeLikeWildcards($string) {
    if (empty($string)) {
        return '';
    }
    return addcslashes($string, '%_');
}

/**
 * Normalizuje telefonní číslo - odstraní mezery, pomlčky, plus
 * Pro lepší matching čísel v různých formátech
 * 
 * @param string $phone Telefonní číslo
 * @return string Normalizované číslo (pouze cifry)
 */
function normalizePhoneNumber($phone) {
    if (empty($phone)) {
        return '';
    }
    // Odstraní mezery, +, -, ( a )
    return str_replace(array(' ', '+', '-', '(', ')'), '', $phone);
}

/**
 * Vytvoří highlight text pro zobrazení kde byl nalezen match
 * 
 * @param string $matchType Typ matche (telefon, email, ico, ...)
 * @param mixed $value Hodnota která matchovala
 * @return string Formátovaný highlight text
 */
function createHighlight($matchType, $value) {
    $labels = array(
        'telefon' => 'Telefon',
        'email' => 'Email',
        'jmeno_prijmeni' => 'Jméno',
        'username' => 'Username',
        'ico' => 'IČO',
        'dic' => 'DIČ',
        'cislo_objednavky' => 'Číslo objednávky',
        'predmet' => 'Předmět',
        'financovani' => 'Financování (smlouvy)',
        'dodavatel_nazev' => 'Dodavatel',
        'dodavatel_ico' => 'IČO dodavatele',
        'dodavatel_kontakt_telefon' => 'Telefon dodavatele',
        'dodavatel_kontakt_email' => 'Email dodavatele',
        'cislo_smlouvy' => 'Číslo smlouvy',
        'nazev_smlouvy' => 'Název smlouvy',
        'nazev_firmy' => 'Firma',
        'fa_cislo_vema' => 'Číslo faktury',
        'fa_cislo_dodavatele' => 'Číslo faktury dodavatele',
        'variabilni_symbol' => 'Variabilní symbol',
        'nazev' => 'Název',
        'kontakt_telefon' => 'Kontaktní telefon',
        'kontakt_email' => 'Kontaktní email',
        'kontakt_jmeno' => 'Kontaktní osoba',
        'adresa' => 'Adresa'
    );
    
    $label = isset($labels[$matchType]) ? $labels[$matchType] : 'Match';
    
    // Bezpečné zobrazení hodnoty (trim, max délka)
    $displayValue = is_string($value) ? trim($value) : strval($value);
    if (strlen($displayValue) > 100) {
        $displayValue = substr($displayValue, 0, 97) . '...';
    }
    
    return $label . ': ' . $displayValue;
}

/**
 * Formátuje celé jméno uživatele včetně titulů
 * PHP 5.6 kompatibilní (použití array místo null coalescing)
 * 
 * @param array $user Pole s údaji uživatele
 * @return string Celé jméno s tituly
 */
function formatUserName($user) {
    $parts = array();
    
    if (!empty($user['titul_pred'])) {
        $parts[] = $user['titul_pred'];
    }
    
    if (!empty($user['jmeno'])) {
        $parts[] = $user['jmeno'];
    }
    
    if (!empty($user['prijmeni'])) {
        $parts[] = $user['prijmeni'];
    }
    
    if (!empty($user['titul_za'])) {
        $parts[] = $user['titul_za'];
    }
    
    return implode(' ', $parts);
}

/**
 * Validuje vstupní data pro search endpoint
 * 
 * @param array $data Input data z requestu
 * @return array Array s 'valid' (bool) a 'errors' (array)
 */
function validateSearchInput($data) {
    $errors = array();
    
    // Username je povinný
    if (!isset($data['username']) || empty(trim($data['username']))) {
        $errors[] = 'Username parameter is required';
    }
    
    // Token je povinný
    if (!isset($data['token']) || empty(trim($data['token']))) {
        $errors[] = 'Token parameter is required';
    }
    
    // Query je povinné a min 3 znaky
    if (!isset($data['query']) || empty(trim($data['query']))) {
        $errors[] = 'Query parameter is required';
    } else if (strlen(trim($data['query'])) < 3) {
        $errors[] = 'Query must be at least 3 characters long';
    }
    
    // Limit - pokud je zadaný, musí být číselný a max 200
    if (isset($data['limit'])) {
        if (!is_numeric($data['limit'])) {
            $errors[] = 'Limit must be a number';
        } else if (intval($data['limit']) > 200) {
            $errors[] = 'Limit cannot exceed 200';
        } else if (intval($data['limit']) < 1) {
            $errors[] = 'Limit must be at least 1';
        }
    }
    
    // Categories - pokud je zadané, musí být pole
    if (isset($data['categories']) && !is_array($data['categories'])) {
        $errors[] = 'Categories must be an array';
    }
    
    // Include_inactive - musí být boolean-like
    if (isset($data['include_inactive'])) {
        if (!is_bool($data['include_inactive']) && 
            $data['include_inactive'] !== '0' && 
            $data['include_inactive'] !== '1' &&
            $data['include_inactive'] !== 0 &&
            $data['include_inactive'] !== 1) {
            $errors[] = 'Include_inactive must be boolean (true/false or 0/1)';
        }
    }
    
    // Archivovano - musí být boolean-like (stejně jako Order V2)
    if (isset($data['archivovano'])) {
        if (!is_bool($data['archivovano']) && 
            $data['archivovano'] !== '0' && 
            $data['archivovano'] !== '1' &&
            $data['archivovano'] !== 0 &&
            $data['archivovano'] !== 1) {
            $errors[] = 'Archivovano must be boolean (true/false or 0/1)';
        }
    }
    
    return array(
        'valid' => empty($errors),
        'errors' => $errors
    );
}

/**
 * Normalizuje boolean hodnotu z requestu
 * PHP 5.6 compatible
 * 
 * @param mixed $value Hodnota k normalizaci
 * @return bool Normalizovaná boolean hodnota
 */
function normalizeBool($value) {
    if (is_bool($value)) {
        return $value;
    }
    if (is_numeric($value)) {
        return intval($value) === 1;
    }
    if (is_string($value)) {
        return in_array(strtolower($value), array('true', '1', 'yes'));
    }
    return false;
}

/**
 * Získá výchozí kategorie pokud nejsou zadané
 * 
 * @return array Seznam všech dostupných kategorií
 */
function getDefaultSearchCategories() {
    return array(
        'users',
        'orders_2025',
        'contracts',
        'invoices',
        'suppliers',
        'suppliers_from_orders'
    );
}

/**
 * Vrátí label pro kategorii (pro response)
 * 
 * @param string $category Klíč kategorie
 * @return string Český label kategorie
 */
function getCategoryLabel($category) {
    $labels = array(
        'users' => 'Uživatelé/Kontakty',
        'orders_2025' => 'Objednávky',
        'contracts' => 'Smlouvy',
        'invoices' => 'Faktury',
        'suppliers' => 'Dodavatelé',
        'suppliers_from_orders' => 'Dodavatelé z objednávek'
    );
    
    return isset($labels[$category]) ? $labels[$category] : ucfirst($category);
}

/**
 * Loguje chybu do error logu
 * Wrapper pro jednotný formát logování
 * 
 * @param string $message Chybová zpráva
 * @param array $context Kontextové informace
 */
function logSearchError($message, $context = array()) {
    $logMessage = '[SEARCH ERROR] ' . $message;
    if (!empty($context)) {
        $logMessage .= ' | Context: ' . json_encode($context);
    }
    error_log($logMessage);
}

/**
 * Měří dobu trvání operace v milisekundách
 * 
 * @param float $startTime microtime(true) ze začátku operace
 * @return int Doba trvání v milisekundách
 */
function getElapsedTimeMs($startTime) {
    return round((microtime(true) - $startTime) * 1000);
}

/**
 * Načte všechny přílohy objednávky (objednávkové + fakturní)
 * 
 * @param PDO $db Database connection
 * @param int $objednavka_id ID objednávky
 * @return array Pole příloh s URL ke stažení
 */
function getOrderAttachments($db, $objednavka_id) {
    $attachments = array();
    
    try {
        // Převedeme ID na integer pro jistotu
        $objednavka_id = (int)$objednavka_id;
        
        // 1. Přílohy objednávky - POZOR: dt_vytvoreni je timestamp, ne datetime!
        $sql = "
            SELECT 
                p.id,
                p.guid,
                p.typ_prilohy,
                p.originalni_nazev_souboru as nazev_souboru,
                p.systemova_cesta,
                p.velikost_souboru_b,
                p.nahrano_uzivatel_id,
                DATE_FORMAT(p.dt_vytvoreni, '%Y-%m-%d %H:%i:%s') as dt_vytvoreni,
                'objednavka' as typ_zdroje,
                NULL as faktura_id
            FROM 25a_objednavky_prilohy p
            WHERE p.objednavka_id = :objednavka_id
            ORDER BY p.dt_vytvoreni DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
        $stmt->execute();
        $orderAttachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("Universal Search: Order $objednavka_id has " . count($orderAttachments) . " order attachments");
        
        // 2. Přílohy faktur k této objednávce - fakturní přílohy mají přímo objednavka_id!
        $sql = "
            SELECT 
                fp.id,
                fp.guid,
                fp.typ_prilohy,
                fp.originalni_nazev_souboru as nazev_souboru,
                fp.systemova_cesta,
                fp.velikost_souboru_b,
                fp.nahrano_uzivatel_id,
                DATE_FORMAT(fp.dt_vytvoreni, '%Y-%m-%d %H:%i:%s') as dt_vytvoreni,
                'faktura' as typ_zdroje,
                fp.faktura_id
            FROM 25a_faktury_prilohy fp
            WHERE fp.objednavka_id = :objednavka_id
            ORDER BY fp.dt_vytvoreni DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
        $stmt->execute();
        $invoiceAttachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("Universal Search: Order $objednavka_id has " . count($invoiceAttachments) . " invoice attachments");
        
        // Přidáme download URL ke každé příloze
        foreach ($orderAttachments as &$att) {
            $att['download_url'] = '/api.eeo/order-v2/attachments/' . $att['guid'] . '/download';
        }
        
        foreach ($invoiceAttachments as &$att) {
            $att['download_url'] = '/api.eeo/order-v2/invoice-attachments/' . $att['guid'] . '/download';
        }
        
        // Spojíme oba typy příloh
        $attachments = array_merge($orderAttachments, $invoiceAttachments);
        
        error_log("Universal Search: Order $objednavka_id total attachments: " . count($attachments));
        
    } catch (Exception $e) {
        logSearchError('getOrderAttachments failed: ' . $e->getMessage(), array(
            'objednavka_id' => $objednavka_id
        ));
        error_log("Universal Search: getOrderAttachments ERROR for order $objednavka_id: " . $e->getMessage());
    }
    
    return $attachments;
}

/**
 * Vyhledávání dodavatelů z objednávek (agregovaných)
 * Vyhledává pouze v dodavatel_* polích z 25a_objednavky
 * 
 * @param PDO $db Database connection
 * @param string $likeQuery Query s % (LIKE)
 * @param string $normalizedQuery Normalized query bez diakritiky
 * @param int $limit Max počet výsledků
 * @param bool $includeArchived Include archived orders
 * @return array Results array
 */
function searchSuppliersFromOrders($db, $likeQuery, $normalizedQuery, $limit, $includeArchived) {
    $results = array();
    
    try {
        // DEBUG logging
        error_log('[searchSuppliersFromOrders] Query: ' . $likeQuery . ' | Normalized: ' . $normalizedQuery . ' | Limit: ' . $limit . ' | includeArchived: ' . ($includeArchived ? 1 : 0));
        
        $sql = getSqlSearchSuppliersFromOrders();
        $stmt = $db->prepare($sql);
        
        $stmt->bindValue(':query', $likeQuery, PDO::PARAM_STR);
        $stmt->bindValue(':query_normalized', $normalizedQuery, PDO::PARAM_STR);
        $stmt->bindValue(':include_archived', $includeArchived ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // DEBUG logging výsledků
        error_log('[searchSuppliersFromOrders] Found ' . count($results) . ' results');
        
        // Formátování výsledků
        foreach ($results as &$row) {
            $row['pocet_objednavek'] = (int)$row['pocet_objednavek'];
            $row['nejnovejsi_objednavka_id'] = (int)$row['nejnovejsi_objednavka_id'];
        }
        
    } catch (Exception $e) {
        logSearchError('searchSuppliersFromOrders failed: ' . $e->getMessage(), array(
            'query' => $likeQuery
        ));
    }
    
    return $results;
}
