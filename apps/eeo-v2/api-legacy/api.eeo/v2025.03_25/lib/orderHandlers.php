<?php

require_once 'dbconfig.php';
require_once 'orderQueries.php';

// Include TimezoneHelper for consistent timezone handling across all datetime operations
require_once __DIR__ . '/TimezoneHelper.php';

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

// ========== HELPER FUNCTIONS ==========

/**
 * Získá údaje uživatele pro lock_info objekt
 * @param PDO $db - Databázové připojení
 * @param int $user_id - ID uživatele
 * @return array - Pole s údaji uživatele (fullname, titul_pred, titul_za, email, telefon)
 */
function getUserDataForLockInfo($db, $user_id) {
    $user_stmt = $db->prepare("SELECT 
        CONCAT(
            CASE WHEN titul_pred IS NOT NULL AND titul_pred != '' 
                 THEN CONCAT(titul_pred, ' ') 
                 ELSE '' 
            END,
            jmeno, 
            ' ', 
            prijmeni,
            CASE WHEN titul_za IS NOT NULL AND titul_za != '' 
                 THEN CONCAT(' ', titul_za) 
                 ELSE '' 
            END
        ) as fullname,
        titul_pred,
        titul_za,
        email,
        telefon
    FROM " . get_users_table_name() . " WHERE id = :id");
    $user_stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
    $user_stmt->execute();
    $user_data = $user_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user_data) {
        return [
            'fullname' => isset($user_data['fullname']) ? trim($user_data['fullname']) : '',
            'titul_pred' => $user_data['titul_pred'],
            'titul_za' => $user_data['titul_za'],
            'email' => $user_data['email'],
            'telefon' => $user_data['telefon']
        ];
    }
    
    return [
        'fullname' => '',
        'titul_pred' => null,
        'titul_za' => null,
        'email' => null,
        'telefon' => null
    ];
}

// ========== HELPER FUNCTIONS FOR ORDER ITEMS ==========

/**
 * Validuje a zpracuje položky objednávky z input dat
 * @param array $input - Input data obsahující položky
 * @return array|false - Vrací pole validních položek nebo false při chybě
 */
function validateAndParseOrderItems($input) {
    $items = [];
    
    // Kontrola, zda existují položky v input datech - podporujeme oba formáty
    $polozky_data = null;
    
    if (isset($input['polozky'])) {
        $polozky_data = $input['polozky'];
    } elseif (isset($input['polozky_objednavky'])) {
        $polozky_data = $input['polozky_objednavky'];
    }
    
    if ($polozky_data !== null) {
        // Pokud je to JSON string, dekódujeme
        if (is_string($polozky_data)) {
            $polozky_data = json_decode($polozky_data, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return false; // Chybný JSON
            }
        }
        
        // Kontrola, že je to pole nebo objekt s polem 'polozky'
        if (!is_array($polozky_data)) {
            return false;
        }
        
        // Pokud je struktura {"polozky": [...]} (FE formát)
        if (isset($polozky_data['polozky']) && is_array($polozky_data['polozky'])) {
            $polozky_data = $polozky_data['polozky'];
        }
        
        // Validace jednotlivých položek
        foreach ($polozky_data as $index => $item) {
            if (!is_array($item)) {
                continue; // Přeskočíme nevalidní položky
            }
            
            // Základní validace povinných polí + lokalizační data + LP
            $validatedItem = [
                'popis' => isset($item['popis']) ? trim($item['popis']) : '',
                'cena_bez_dph' => isset($item['cena_bez_dph']) ? floatval($item['cena_bez_dph']) : 0.0,
                'sazba_dph' => isset($item['sazba_dph']) ? intval($item['sazba_dph']) : 21,
                'cena_s_dph' => isset($item['cena_s_dph']) ? floatval($item['cena_s_dph']) : 0.0,
                // Zjednodušená lokalizace - 3 kódy + poznamka
                'usek_kod' => isset($item['usek_kod']) && !empty($item['usek_kod']) ? trim($item['usek_kod']) : null,
                'budova_kod' => isset($item['budova_kod']) && !empty($item['budova_kod']) ? trim($item['budova_kod']) : null,
                'mistnost_kod' => isset($item['mistnost_kod']) && !empty($item['mistnost_kod']) ? trim($item['mistnost_kod']) : null,
                'poznamka' => null, // Bude sestaveno jako JSON níže
                // LP na úrovni položky
                'lp_id' => isset($item['lp_id']) && $item['lp_id'] > 0 ? intval($item['lp_id']) : null
            ];
            
            // Pokud není zadána cena s DPH, vypočítáme ji
            if ($validatedItem['cena_s_dph'] <= 0 && $validatedItem['cena_bez_dph'] > 0) {
                $validatedItem['cena_s_dph'] = $validatedItem['cena_bez_dph'] * (1 + $validatedItem['sazba_dph'] / 100);
            }
            
            // Poznámka jako JSON objekt s volnými atributy (názvy, adresy, patra, atd.)
            $poznamka_data = array();
            $optional_poznamka_keys = array(
                'usek_nazev', 'budova_nazev', 'budova_adresa', 
                'mistnost_nazev', 'mistnost_patro', 'poznamka_lokalizace'
            );
            
            foreach ($optional_poznamka_keys as $key) {
                if (isset($item[$key]) && !empty(trim($item[$key]))) {
                    $poznamka_data[$key] = trim($item[$key]);
                }
            }
            
            // Pokud jsou nějaká data, uložíme jako JSON
            if (!empty($poznamka_data)) {
                $validatedItem['poznamka'] = json_encode($poznamka_data);
            }
            
            // Přidáme pouze položky s popisem
            if (!empty($validatedItem['popis'])) {
                $items[] = $validatedItem;
            }
        }
    }
    
    return $items;
}

/**
 * Vloží položky objednávky do databáze (pouze insert, nesmaže staré)
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @param array $items - Pole položek k vložení
 * @return bool - True při úspěchu
 */
function insertOrderItems($db, $order_id, $items) {
    if (empty($items)) {
        error_log("insertOrderItems: Žádné položky k vložení");
        return true; // Žádné položky k vložení
    }
    
    try {
        // Batch insert pro lepší výkon
        $itemsCount = count($items);
        error_log("insertOrderItems: Vkládám $itemsCount položek pro order_id=$order_id");
        
        $sql = insertOrderItemsBatchQuery($itemsCount);
        error_log("insertOrderItems: SQL = " . $sql);
        
        $stmt = $db->prepare($sql);
        
        $params = [':objednavka_id' => $order_id];
        
        foreach ($items as $index => $item) {
            $params[":popis_{$index}"] = $item['popis'];
            $params[":cena_bez_dph_{$index}"] = $item['cena_bez_dph'];
            $params[":sazba_dph_{$index}"] = $item['sazba_dph'];
            $params[":cena_s_dph_{$index}"] = $item['cena_s_dph'];
            // Zjednodušená lokalizace - 3 kódy + poznamka
            $params[":usek_kod_{$index}"] = $item['usek_kod'];
            $params[":budova_kod_{$index}"] = $item['budova_kod'];
            $params[":mistnost_kod_{$index}"] = $item['mistnost_kod'];
            $params[":poznamka_{$index}"] = $item['poznamka'];
            // LP na úrovni položky
            $params[":lp_id_{$index}"] = isset($item['lp_id']) ? $item['lp_id'] : null;
        }
        
        error_log("insertOrderItems: PARAMS = " . json_encode($params));
        
        $stmt->execute($params);
        $rowCount = $stmt->rowCount();
        
        error_log("insertOrderItems: ✅ Úspěšně vloženo, rowCount = $rowCount");
        return true;
        
    } catch (Exception $e) {
        error_log("insertOrderItems: ❌ EXCEPTION: " . $e->getMessage());
        error_log("insertOrderItems: TRACE: " . $e->getTraceAsString());
        return false;
    }
}

/**
 * Uloží položky objednávky do databáze (smaže staré, vloží nové)
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @param array $items - Pole položek k uložení
 * @return bool - True při úspěchu
 */
function saveOrderItems($db, $order_id, $items) {
    try {
        // Nejprve smažeme všechny stávající položky
        $deleteStmt = $db->prepare(deleteOrderItemsByOrderIdQuery());
        $deleteStmt->bindParam(':objednavka_id', $order_id, PDO::PARAM_INT);
        $deleteStmt->execute();
        
        // Pak vložíme nové položky
        return insertOrderItems($db, $order_id, $items);
        
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Aktualizuje položky objednávky (smaže staré, vloží nové)
 * POZNÁMKA: Tato funkce je nyní aliasem pro saveOrderItems()
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @param array $items - Pole nových položek
 * @return bool - True při úspěchu
 */
function updateOrderItems($db, $order_id, $items) {
    return saveOrderItems($db, $order_id, $items);
}

/**
 * Načte položky objednávky z databáze (rozšířeno o lokalizační data)
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @return array - Pole položek s lokalizačními daty nebo prázdné pole při chybě
 */
function loadOrderItems($db, $order_id) {
    try {
        error_log("loadOrderItems: Loading items for order_id = " . $order_id);
        $query = selectOrderItemsByOrderIdQuery();
        error_log("loadOrderItems: SQL = " . $query);
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':objednavka_id', $order_id, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("loadOrderItems: Found " . count($items) . " items for order_id = " . $order_id);
        
        // Obohacení každé položky o parsovaná data z poznámky
        foreach ($items as &$item) {
            // Přidání parsovaných dat z poznámky pro pohodlí FE (přejmenováno na poznamka_umisteni)
            if (!empty($item['poznamka'])) {
                $poznamkaData = json_decode($item['poznamka'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($poznamkaData)) {
                    $item['poznamka_umisteni'] = $poznamkaData;
                } else {
                    $item['poznamka_umisteni'] = null;
                }
            } else {
                $item['poznamka_umisteni'] = null;
            }
        }
        
        return $items;
    } catch (Exception $e) {
        return [];
    }
}

/**
 * Načte přílohy objednávky podle ID objednávky (MySQL 5.6.43 + PHP 5.6 kompatibilní)
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @return array - Pole příloh se správnými názvy sloupců z 25a_objednavky_prilohy
 */
function loadOrderAttachments($db, $order_id) {
    global $queries;
    
    try {
        $stmt = $db->prepare($queries['objednavky_prilohy_enriched_by_objednavka']);
        $stmt->execute(array(':objednavka_id' => $order_id));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // PHP 5.6 kompatibilní error handling
        error_log("Error loading attachments for order $order_id: " . $e->getMessage());
        return array();
    }
}

/**
 * Přidá položky k jedné objednávce
 * @param PDO $db - Databázové spojení
 * @param array $order - Reference na objednávku (bude upravena)
 * @return void
 */
function enrichOrderWithItems($db, &$order) {
    // Načítání položek
    if (isset($order['id'])) {
        $order['polozky'] = loadOrderItems($db, $order['id']);
        error_log("enrichOrderWithItems: Order ID " . $order['id'] . " loaded " . count($order['polozky']) . " items");
        
        // LP na položkách: Načti LP ID z databáze a obohať položky
        if (!empty($order['polozky'])) {
            require_once __DIR__ . '/orderV2PolozkyLPHandlers.php';
            $lp_map = nacist_polozky_lp($db, $order['id']);
            foreach ($order['polozky'] as &$polozka) {
                if (isset($polozka['id']) && isset($lp_map[$polozka['id']])) {
                    $polozka['lp_id'] = $lp_map[$polozka['id']];
                }
            }
            unset($polozka);
            
            // Enrich s LP daty z 25_limitovane_prisliby
            $lp_kody = isset($order['objednavka_data']['lp_kody']) ? $order['objednavka_data']['lp_kody'] : array();
            $order['polozky'] = enrich_polozky_s_lp($db, $order['polozky'], $lp_kody);
        }
    } else {
        $order['polozky'] = [];
        error_log("enrichOrderWithItems: Order has no ID, setting empty items array");
    }
    
    // Počítání celkové ceny s DPH z položek
    $order['polozky_count'] = count($order['polozky']);
    $celkova_cena_s_dph = 0.0;
    
    foreach ($order['polozky'] as $polozka) {
        if (isset($polozka['cena_s_dph']) && is_numeric($polozka['cena_s_dph'])) {
            $celkova_cena_s_dph += (float)$polozka['cena_s_dph'];
        }
    }
    
    $order['polozky_celkova_cena_s_dph'] = $celkova_cena_s_dph;
    error_log("enrichOrderWithItems: Order ID " . (isset($order['id']) ? $order['id'] : 'N/A') . " total with DPH: " . $celkova_cena_s_dph);
    
    // Načítání příloh
    if (isset($order['id'])) {
        $order['prilohy'] = loadOrderAttachments($db, $order['id']);
    } else {
        $order['prilohy'] = [];
    }
    
    // Počet příloh
    $order['prilohy_count'] = count($order['prilohy']);
}

/**
 * Přidá položky k více objednávkám
 * @param PDO $db - Databázové spojení
 * @param array $orders - Reference na pole objednávek (bude upraveno)
 * @return void
 */
function enrichOrdersWithItems($db, &$orders) {
    foreach ($orders as &$order) {
        enrichOrderWithItems($db, $order);
    }
}

/**
 * Načte přílohy pro konkrétní fakturu
 * @param PDO $db - Databázové spojení
 * @param int $faktura_id - ID faktury
 * @return array - Pole příloh ve standardizovaném formátu
 */
function loadInvoiceAttachments($db, $faktura_id) {
    try {
        $attachments_table = get_invoice_attachments_table_name();
        $sql = "SELECT id, guid, typ_prilohy, originalni_nazev_souboru, systemova_cesta, velikost_souboru_b, dt_vytvoreni, nahrano_uzivatel_id 
                FROM `$attachments_table` 
                WHERE faktura_id = ? 
                ORDER BY dt_vytvoreni DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute([$faktura_id]);
        $rawAttachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // ✅ TRANSFORMACE: Vrátíme standardizovaný formát se správnými názvy polí
        $result = array();
        foreach ($rawAttachments as $attachment) {
            $result[] = array(
                'id' => (int)$attachment['id'],
                'guid' => $attachment['guid'],
                'typ_prilohy' => $attachment['typ_prilohy'],
                'originalni_nazev_souboru' => $attachment['originalni_nazev_souboru'], // ✅ SKUTEČNÝ NÁZEV SOUBORU z DB
                'systemova_cesta' => $attachment['systemova_cesta'],
                'velikost_souboru_b' => (int)$attachment['velikost_souboru_b'],
                'dt_vytvoreni' => $attachment['dt_vytvoreni'],
                'nahrano_uzivatel_id' => (int)$attachment['nahrano_uzivatel_id']
            );
        }
        
        return $result;
    } catch (Exception $e) {
        error_log("loadInvoiceAttachments: Error loading attachments for invoice $faktura_id: " . $e->getMessage());
        return array();
    }
}

/**
 * Načte faktury pro konkrétní objednávku včetně jejich příloh
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @return array - Pole faktur s přílohami
 */
function loadOrderInvoices($db, $order_id) {
    $faktury_table = get_invoices_table_name();
    $states_table = get_states_table_name();
    $users_table = get_users_table_name();
    
    // JOIN s číselníkem stavů pro získání názvu typu faktury + uživatel věcné kontroly
    $stmt = $db->prepare("
        SELECT 
            f.*,
            s.nazev_stavu as fa_typ_nazev,
            s.popis as fa_typ_popis,
            u_vecna.jmeno as potvrdil_vecnou_spravnost_jmeno,
            u_vecna.prijmeni as potvrdil_vecnou_spravnost_prijmeni,
            u_vecna.email as potvrdil_vecnou_spravnost_email
        FROM `$faktury_table` f
        LEFT JOIN `$states_table` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
        LEFT JOIN `$users_table` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
        WHERE f.objednavka_id = ? 
        ORDER BY f.id ASC
    ");
    $stmt->execute([$order_id]);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ✅ NORMALIZACE: fa_strediska_kod → array stringů (BEZ MODIFIKACE)
    foreach ($invoices as &$invoice) {
        if (isset($invoice['fa_strediska_kod']) && !empty($invoice['fa_strediska_kod'])) {
            // Pokud je to JSON string, parsuj ho
            if (is_string($invoice['fa_strediska_kod'])) {
                $decoded = json_decode($invoice['fa_strediska_kod'], true);
                if (is_array($decoded)) {
                    // Vrátit array jak je v DB, pouze vyčistit prázdné hodnoty
                    $invoice['fa_strediska_kod'] = array_values(array_filter($decoded, function($item) {
                        return !empty($item);
                    }));
                }
            }
        } else {
            // Prázdné → vrátit prázdné pole
            $invoice['fa_strediska_kod'] = array();
        }
        
        // ✅ PŘIDÁNO: Načtení příloh faktury
        if (isset($invoice['id'])) {
            $invoice['prilohy'] = loadInvoiceAttachments($db, $invoice['id']);
        } else {
            $invoice['prilohy'] = array();
        }
    }
    
    return $invoices;
}

/**
 * Přidá faktury k jedné objednávce
 * @param PDO $db - Databázové spojení
 * @param array $order - Reference na objednávku (bude upravena)
 * @return void
 */
function enrichOrderWithInvoices($db, &$order) {
    // Načítání faktur
    if (isset($order['id'])) {
        $order['faktury'] = loadOrderInvoices($db, $order['id']);
        error_log("enrichOrderWithInvoices: Order ID " . $order['id'] . " loaded " . count($order['faktury']) . " invoices");
    } else {
        $order['faktury'] = [];
        error_log("enrichOrderWithInvoices: Order has no ID, setting empty invoices array");
    }
    
    // Počet faktur
    $order['faktury_count'] = count($order['faktury']);
    
    // Celková částka z faktur s DPH
    $celkova_castka_faktur_s_dph = 0.0;
    foreach ($order['faktury'] as $faktura) {
        // Zkus castka_s_dph, pak fa_castka jako fallback
        $castka = null;
        if (isset($faktura['castka_s_dph']) && is_numeric($faktura['castka_s_dph'])) {
            $castka = (float)$faktura['castka_s_dph'];
        } elseif (isset($faktura['fa_castka']) && is_numeric($faktura['fa_castka'])) {
            $castka = (float)$faktura['fa_castka'];
        }
        
        if ($castka !== null) {
            $celkova_castka_faktur_s_dph += $castka;
        }
    }
    $order['faktury_celkova_castka_s_dph'] = $celkova_castka_faktur_s_dph;
}

/**
 * Obohacení objednávky o workflow uživatele (celé jméno s titulem + email + datum)
 * @param PDO $db - Databázové spojení
 * @param array $order - Reference na objednávku (bude upravena)
 * @return void
 */
function enrichOrderWithWorkflowUsers($db, &$order) {
    // Seznam workflow polí: *_id a odpovídající výstupní pole a datum pole
    $workflowFields = array(
        'uzivatel_id' => array('output' => 'uzivatel', 'date' => 'dt_vytvoreni'),
        'uzivatel_akt_id' => array('output' => 'uzivatel_akt', 'date' => 'dt_posledni_zmeny'),
        'garant_uzivatel_id' => array('output' => 'garant_uzivatel', 'date' => null),
        'objednatel_id' => array('output' => 'objednatel', 'date' => null),
        'schvalovatel_id' => array('output' => 'schvalovatel', 'date' => 'dt_schvaleni'),
        'prikazce_id' => array('output' => 'prikazce', 'date' => null),
        'odesilatel_id' => array('output' => 'odesilatel', 'date' => 'dt_odeslani'),
        'dodavatel_potvrdil_id' => array('output' => 'dodavatel_potvrdil', 'date' => 'dt_akceptace'),
        'zverejnil_id' => array('output' => 'zverejnil', 'date' => 'dt_zverejneni'),
        'fakturant_id' => array('output' => 'fakturant', 'date' => null),
        'dokoncil_id' => array('output' => 'dokoncil', 'date' => 'dt_dokonceni'),
        'potvrdil_vecnou_spravnost_id' => array('output' => 'potvrdil_vecnou_spravnost', 'date' => 'dt_potvrzeni_vecne_spravnosti')
    );
    
    foreach ($workflowFields as $idField => $config) {
        $outputField = $config['output'];
        $dateField = $config['date'];
        
        if (isset($order[$idField]) && $order[$idField] > 0) {
            $user = loadUserById($db, $order[$idField]);
            if ($user) {
                // Sestavení celého jména s titulem
                $celeMeno = '';
                if (!empty($user['titul_pred'])) {
                    $celeMeno .= $user['titul_pred'] . ' ';
                }
                $celeMeno .= trim($user['jmeno'] . ' ' . $user['prijmeni']);
                if (!empty($user['titul_za'])) {
                    $celeMeno .= ', ' . $user['titul_za'];
                }
                
                $order[$outputField] = array(
                    'cele_jmeno' => $celeMeno,
                    'email' => isset($user['email']) ? $user['email'] : null,
                    'datum' => ($dateField && isset($order[$dateField])) ? $order[$dateField] : null
                );
            } else {
                $order[$outputField] = null;
            }
        } else {
            $order[$outputField] = null;
        }
    }
}

/**
 * Načte lidský název typu financování z číselníku
 * @param PDO $db - Databázové spojení
 * @param string $kod - Kód typu financování (LP, POJISTNA_UDALOST, SMLOUVA, INDIVIDUALNI, INDIVIDUALNI_SCHVALENI, POKLADNA)
 * @return string|null - Lidský název nebo null
 */
function getFinancovaniTypNazev($db, $kod) {
    if (empty($kod)) return null;
    
    try {
        $stmt = $db->prepare("SELECT nazev_stavu FROM 25_ciselnik_stavy WHERE typ_objektu = 'FINANCOVANI_ZDROJ' AND kod_stavu = :kod AND aktivni = 1 LIMIT 1");
        $stmt->bindParam(':kod', $kod, PDO::PARAM_STR);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['nazev_stavu'] : null;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Načte LP detaily podle ID z tabulky 25_limitovane_prisliby
 * @param PDO $db - Databázové spojení
 * @param int $lp_id - ID z tabulky 25_limitovane_prisliby
 * @return array|null - Array s cislo_lp a nazev_uctu nebo null
 */
function getLPDetaily($db, $lp_id) {
    if (empty($lp_id)) return null;
    
    try {
        $stmt = $db->prepare("SELECT cislo_lp, nazev_uctu FROM 25_limitovane_prisliby WHERE id = :lp_id LIMIT 1");
        $stmt->bindParam(':lp_id', $lp_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result : null;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Obohacení financování o lidský název typu a LP názvů
 * @param PDO $db - Databázové spojení
 * @param array $order - Reference na objednávku (bude upravena)
 * @return void
 */
function enrichOrderFinancovani($db, &$order) {
    if (isset($order['financovani']) && is_array($order['financovani'])) {
        // Přidat název typu financování
        if (isset($order['financovani']['typ'])) {
            $nazev = getFinancovaniTypNazev($db, $order['financovani']['typ']);
            if ($nazev) {
                $order['financovani']['typ_nazev'] = $nazev;
            }
        }
        
        // Přidat LP detaily (cislo_lp a nazev_uctu)
        if (isset($order['financovani']['lp_kody']) && is_array($order['financovani']['lp_kody'])) {
            $lp_detaily = array();
            foreach ($order['financovani']['lp_kody'] as $lp_id) {
                $lp = getLPDetaily($db, $lp_id);
                if ($lp) {
                    $lp_detaily[] = array(
                        'id' => $lp_id,
                        'cislo_lp' => $lp['cislo_lp'],
                        'nazev' => $lp['nazev_uctu']
                    );
                } else {
                    $lp_detaily[] = array(
                        'id' => $lp_id,
                        'cislo_lp' => null,
                        'nazev' => null
                    );
                }
            }
            $order['financovani']['lp_nazvy'] = $lp_detaily;
        }
    }
}

/**
 * Obohacení informací o registru smluv - seskupí pole do objektu registr_smluv
 * @param PDO $db - Databázové spojení
 * @param array $order - Reference na objednávku (bude upravena)
 * @return void
 */
function enrichOrderRegistrSmluv($db, &$order) {
    $registr_smluv = array();
    
    // Přidat zverejnit
    $registr_smluv['zverejnit'] = isset($order['zverejnit']) ? $order['zverejnit'] : null;
    
    // Přidat zverejnil (enriched user)
    if (isset($order['zverejnil_id']) && $order['zverejnil_id'] > 0) {
        $user = loadUserById($db, $order['zverejnil_id']);
        if ($user) {
            $celeMeno = '';
            if (!empty($user['titul_pred'])) {
                $celeMeno .= $user['titul_pred'] . ' ';
            }
            $celeMeno .= trim($user['jmeno'] . ' ' . $user['prijmeni']);
            if (!empty($user['titul_za'])) {
                $celeMeno .= ', ' . $user['titul_za'];
            }
            
            $registr_smluv['zverejnil'] = array(
                'cele_jmeno' => $celeMeno,
                'email' => isset($user['email']) ? $user['email'] : null,
                'datum' => isset($order['dt_zverejneni']) ? $order['dt_zverejneni'] : null
            );
        } else {
            $registr_smluv['zverejnil'] = null;
        }
    } else {
        $registr_smluv['zverejnil'] = null;
    }
    
    // Přidat dt_zverejneni
    $registr_smluv['dt_zverejneni'] = isset($order['dt_zverejneni']) ? $order['dt_zverejneni'] : null;
    
    // Přidat registr_iddt
    $registr_smluv['registr_iddt'] = isset($order['registr_iddt']) ? $order['registr_iddt'] : null;
    
    $order['registr_smluv'] = $registr_smluv;
}

/**
 * Přidá faktury k více objednávkám
 * @param PDO $db - Databázové spojení
 * @param array $orders - Reference na pole objednávek (bude upraveno)
 * @return void
 */
function enrichOrdersWithInvoices($db, &$orders) {
    foreach ($orders as &$order) {
        enrichOrderWithInvoices($db, $order);
    }
}

// ========== ENRICHMENT FUNCTIONS FOR CODEBOOKS ==========

/**
 * Načte uživatele podle ID
 * @param PDO $db - Databázové spojení
 * @param int $user_id - ID uživatele
 * @return array|null - Data uživatele nebo null
 */
function loadUserById($db, $user_id) {
    if (!$user_id) return null;
    
    try {
        $stmt = $db->prepare("SELECT id, username, jmeno, prijmeni, email, telefon, titul_pred, titul_za, aktivni FROM 25_uzivatele WHERE id = :id AND id > 0");
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Načte střediska podle kódu (JSON string může obsahovat pole kódů)
 * @param PDO $db - Databázové spojení  
 * @param string $strediska_kod - Kód střediska nebo JSON array
 * @return array - Pole středisek
 */
function loadStrediskaByKod($db, $strediska_kod) {
    if (!$strediska_kod) return array();
    
    try {
        // Pokud je to JSON, dekódujeme
        $search_values = array();
        
        // ✅ OPRAVA: Pokud už je to array, použij ho přímo
        if (is_array($strediska_kod)) {
            $decoded = $strediska_kod;
        } elseif (is_string($strediska_kod) && strpos($strediska_kod, '[') === 0) {
            $decoded = json_decode($strediska_kod, true);
        } else {
            $decoded = null;
        }
        
        if (is_array($decoded)) {
            // Extrahuj kódy z objektů
            // ✅ FE posílá: [{"kod_stavu":"VLASIM","nazev_stavu":"Vlašim"}]
            // Preferujeme kod_stavu (uppercase, bez diakritiky) pro match s DB sloupcem 'kod'
            foreach ($decoded as $item) {
                if (is_array($item)) {
                    // Priorita: kod_stavu > kod > nazev_stavu > nazev
                    if (isset($item['kod_stavu'])) {
                        $search_values[] = $item['kod_stavu']; // ✅ "VLASIM"
                    } elseif (isset($item['kod'])) {
                        $search_values[] = $item['kod'];
                    } elseif (isset($item['nazev_stavu'])) {
                        $search_values[] = $item['nazev_stavu']; // Fallback "Vlašim"
                    } elseif (isset($item['nazev'])) {
                        $search_values[] = $item['nazev'];
                    }
                } else {
                    // Jednoduchý string
                    $search_values[] = $item;
                }
            }
        } else {
            $search_values = array($strediska_kod);
        }
        
        if (empty($search_values)) return array();
        
        // ✅ Hledání v 25_ciselnik_stavy kde typ_objektu='STREDISKA'
        $placeholders = implode(',', array_fill(0, count($search_values), '?'));
        
        $sql = "SELECT kod_stavu as kod, nazev_stavu as nazev, popis, aktivni 
                FROM 25_ciselnik_stavy 
                WHERE typ_objektu = 'STREDISKA' AND kod_stavu IN ($placeholders)
                ORDER BY nazev_stavu";
        $stmt = $db->prepare($sql);
        $stmt->execute($search_values);
        
        $strediska = array();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rows as $row) {
            $strediska[] = array(
                'kod' => $row['kod'],
                'nazev' => $row['nazev'],
                'popis' => isset($row['popis']) ? $row['popis'] : null,
                'aktivni' => (int)$row['aktivni']
            );
        }
        
        return $strediska;
    } catch (Exception $e) {
        error_log("Error loading strediska from lokality: " . $e->getMessage());
        return [];
    }
}

/**
 * Načte stav podle kódu
 * @param PDO $db - Databázové spojení
 * @param string $kod_stavu - Kód stavu
 * @return array|null - Data stavu nebo null
 */
function loadStavByKod($db, $kod_stavu) {
    if (!$kod_stavu) return null;
    
    try {
        // DŮLEŽITÉ: NEFILTRUJEME podle aktivni=1, aby se načetly i stavy archivovaných objednávek
        $stmt = $db->prepare("SELECT kod_stavu, nazev_stavu, popis, aktivni FROM 25_ciselnik_stavy WHERE kod_stavu = :kod AND typ_objektu = 'OBJEDNAVKA'");
        $stmt->bindParam(':kod', $kod_stavu, PDO::PARAM_STR);
        $stmt->execute();
        $stav = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Přidáme barvu a ikonu podle kódu stavu
        if ($stav) {
            switch ($kod_stavu) {
                case 'NOVA': 
                    $stav['barva'] = '#FFA500'; 
                    $stav['ikona'] = 'edit'; 
                    break;
                case 'DRAFT': 
                    $stav['barva'] = '#FFA500'; 
                    $stav['ikona'] = 'edit'; 
                    break;
                case 'SENT': 
                    $stav['barva'] = '#2196F3'; 
                    $stav['ikona'] = 'send'; 
                    break;
                case 'APPROVED': 
                    $stav['barva'] = '#4CAF50'; 
                    $stav['ikona'] = 'check'; 
                    break;
                case 'REJECTED': 
                    $stav['barva'] = '#F44336'; 
                    $stav['ikona'] = 'close'; 
                    break;
                case 'ROZPRACOVANA':
                    $stav['barva'] = '#FF9800'; 
                    $stav['ikona'] = 'build'; 
                    break;
                default: 
                    $stav['barva'] = '#9E9E9E'; 
                    $stav['ikona'] = 'info'; 
            }
        }
        
        return $stav;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Načte druh objednávky podle kódu  
 * @param PDO $db - Databázové spojení
 * @param string $druh_kod - Kód druhu objednávky
 * @return array|null - Data druhu nebo null
 */
function loadDruhObjednavkyByKod($db, $druh_kod) {
    if (!$druh_kod) return null;
    
    try {
        // Načteme z 25_ciselnik_stavy kde typ_objektu='DRUH_OBJEDNAVKY'
        $stmt = $db->prepare("SELECT kod_stavu as kod, nazev_stavu as nazev, popis FROM 25_ciselnik_stavy WHERE typ_objektu = 'DRUH_OBJEDNAVKY' AND kod_stavu = :druh LIMIT 1");
        $stmt->bindParam(':druh', $druh_kod, PDO::PARAM_STR);
        $stmt->execute();
        $druh = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($druh) {
            return array(
                'kod' => $druh['kod'],
                'nazev' => $druh['nazev'],
                'popis' => isset($druh['popis']) ? $druh['popis'] : null
            );
        }
        
        // Fallback na mock data pro nové druhy, které nejsou v DB
        $druhy_map = array(
            'STANDARD' => array(
                'kod' => 'STANDARD',
                'nazev' => 'Standardní objednávka',
                'popis' => 'Běžná objednávka materiálu/služeb'
            ),
            'URGENT' => array(
                'kod' => 'URGENT',
                'nazev' => 'Urgentní objednávka', 
                'popis' => 'Objednávka s prioritním zpracováním'
            ),
            'FRAMEWORK' => array(
                'kod' => 'FRAMEWORK',
                'nazev' => 'Rámcová objednávka',
                'popis' => 'Objednávka v rámci rámcové smlouvy'
            )
        );
        
        return isset($druhy_map[$druh_kod]) ? $druhy_map[$druh_kod] : null;
        
    } catch (Exception $e) {
        error_log("loadDruhObjednavkyByKod Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Načte limitovaný příslib (příkaz/operaci) podle ID
 * @param PDO $db - Databázové spojení
 * @param int $prikazce_id - ID limitovaného příslibu
 * @return array|null - Data příkazu nebo null
 */
function loadPrikazceById($db, $prikazce_id) {
    if (!$prikazce_id) return null;
    
    global $queries;
    
    try {
        $stmt = $db->prepare($queries['limitovane_prisliby_select_by_id']);
        $stmt->bindParam(':id', $prikazce_id, PDO::PARAM_INT);
        $stmt->execute();
        $prikazce = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($prikazce) {
            return array(
                'id' => $prikazce['id'],
                'cislo_lp' => isset($prikazce['cislo_lp']) ? $prikazce['cislo_lp'] : null,
                'cislo_uctu' => isset($prikazce['cislo_uctu']) ? $prikazce['cislo_uctu'] : null,
                'nazev_uctu' => isset($prikazce['nazev_uctu']) ? $prikazce['nazev_uctu'] : null,
                'vyse_financniho_kryti' => isset($prikazce['vyse_financniho_kryti']) ? $prikazce['vyse_financniho_kryti'] : null,
                'kategorie' => isset($prikazce['kategorie']) ? $prikazce['kategorie'] : null,
                'platne_od' => isset($prikazce['platne_od']) ? $prikazce['platne_od'] : null,
                'platne_do' => isset($prikazce['platne_do']) ? $prikazce['platne_do'] : null
            );
        }
        
        return null;
    } catch (Exception $e) {
        error_log("Error loading prikazce: " . $e->getMessage());
        return null;
    }
    
    if (isset($druhy_map[$druh_kod])) {
        return $druhy_map[$druh_kod];
    }
    
    // Fallback pro neznámé kódy
    return array(
        'kod' => $druh_kod,
        'nazev' => ucfirst(strtolower($druh_kod)),
        'popis' => 'Druh objednávky: ' . $druh_kod
    );
}

/**
 * Normalizuje datum/čas hodnotu pro uložení do databáze
 * Akceptuje formáty: YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, nebo prázdnou hodnotu
 * @param string $datetime_value - Datum/čas hodnota z inputu
 * @param bool $include_time - Zda má výsledek obsahovat čas (false = pouze datum)
 * @return string|null - Normalizovaná hodnota nebo null
 */
function normalizeDatetime($datetime_value, $include_time = true) {
    if (empty($datetime_value)) {
        return null;
    }
    
    // Trim a základní kontrola
    $datetime_value = trim($datetime_value);
    if ($datetime_value === '') {
        return null;
    }
    
    try {
        // Pokud je zadán pouze datum bez času, přidáme čas
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $datetime_value)) {
            if ($include_time) {
                // Pouze datum → přidáme aktuální český čas (respektuje letní/zimní čas)
                $datetime_value .= ' ' . TimezoneHelper::getCzechDateTime('H:i:s');
            }
            // Pro pouze datum pole vracíme bez změny
        }
        // Pokud je zadán datum + čas, validujeme formát
        else if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $datetime_value)) {
            // KRITICKÁ OPRAVA: FE posílá čas v UTC, musíme konvertovat na Europe/Prague
            // Použití TimezoneHelper pro konzistentní konverzi
            $datetime_value = TimezoneHelper::convertUtcToCzech($datetime_value);
        }
        // Jiné formáty (ISO 8601, apod.) - konvertuj přes TimezoneHelper
        else {
            // TimezoneHelper zvládá ISO 8601 (2025-11-14T18:50:57Z) i další formáty
            $converted = TimezoneHelper::convertUtcToCzech($datetime_value);
            if ($converted !== null) {
                $datetime_value = $converted;
                // Pokud nechceme čas, ořežeme ho
                if (!$include_time) {
                    $datetime_value = substr($datetime_value, 0, 10);
                }
            } else {
                // Fallback - pokud convertUtcToCzech selhal
                return null;
            }
        }
        
        return $datetime_value;
        
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Automaticky nastaví stav_objednavky podle posledního stavu z stav_workflow_kod
 * @param PDO $db - Databázové spojení
 * @param string $stav_workflow_kod - JSON array nebo string s kódy stavů
 * @return string - Název stavu pro uložení do stav_objednavky
 */
function getStavObjednavkyFromWorkflow($db, $stav_workflow_kod) {
    if (empty($stav_workflow_kod)) {
        return 'Nová'; // Default hodnota
    }
    
    try {
        // Pokud je to JSON array, dekódujeme a vezmeme poslední hodnotu
        $posledni_stav = '';
        if (strpos($stav_workflow_kod, '[') === 0) {
            $stavy_array = json_decode($stav_workflow_kod, true);
            if (is_array($stavy_array) && !empty($stavy_array)) {
                $posledni_stav = end($stavy_array); // Poslední prvek
            }
        } else {
            // Pokud to není JSON, použijeme to jako string
            $posledni_stav = $stav_workflow_kod;
        }
        
        if (empty($posledni_stav)) {
            return 'Nová';
        }
        
        // Najdeme název stavu v číselníku
        $stmt = $db->prepare("SELECT nazev_stavu FROM 25_ciselnik_stavy WHERE kod_stavu = :kod AND typ_objektu = 'OBJEDNAVKA'");
        $stmt->bindParam(':kod', $posledni_stav, PDO::PARAM_STR);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result && !empty($result['nazev_stavu'])) {
            return $result['nazev_stavu'];
        }
        
        // Fallback - pokud nenajdeme v DB, vytvoříme z kódu
        return ucfirst(strtolower(str_replace('_', ' ', $posledni_stav)));
        
    } catch (Exception $e) {
        return 'Nová';
    }
}

/**
 * Obohacuje jednu objednávku o číselníky
 * @param PDO $db - Databázové spojení
 * @param array $order - Reference na objednávku (bude upravena)
 * @return void
 */
function enrichOrderWithCodebooks($db, &$order) {
    $enriched = array();
    
    // Uživatelé
    if (isset($order['uzivatel_id']) && $order['uzivatel_id']) {
        $enriched['uzivatel'] = loadUserById($db, $order['uzivatel_id']);
    }
    
    if (isset($order['uzivatel_akt_id']) && $order['uzivatel_akt_id']) {
        $enriched['uzivatel_akt'] = loadUserById($db, $order['uzivatel_akt_id']);
    }
    
    if (isset($order['garant_uzivatel_id']) && $order['garant_uzivatel_id']) {
        $enriched['garant_uzivatel'] = loadUserById($db, $order['garant_uzivatel_id']);
    }
    
    if (isset($order['objednatel_id']) && $order['objednatel_id']) {
        $enriched['objednatel'] = loadUserById($db, $order['objednatel_id']);
    }
    
    if (isset($order['prikazce_id']) && $order['prikazce_id']) {
        $enriched['prikazce'] = loadUserById($db, $order['prikazce_id']);
    }
    
    if (isset($order['schvalovatel_id']) && $order['schvalovatel_id']) {
        $enriched['schvalovatel'] = loadUserById($db, $order['schvalovatel_id']);
    }
    
    // === WORKFLOW TRACKING USERS === (nová pole)
    if (isset($order['odesilatel_id']) && $order['odesilatel_id']) {
        $enriched['odesilatel'] = loadUserById($db, $order['odesilatel_id']);
    }
    
    if (isset($order['dodavatel_potvrdil_id']) && $order['dodavatel_potvrdil_id']) {
        $enriched['dodavatel_potvrdil'] = loadUserById($db, $order['dodavatel_potvrdil_id']);
    }
    
    if (isset($order['zverejnil_id']) && $order['zverejnil_id']) {
        $enriched['zverejnil'] = loadUserById($db, $order['zverejnil_id']);
    }
    
    if (isset($order['potvrdil_vecnou_spravnost_id']) && $order['potvrdil_vecnou_spravnost_id']) {
        $enriched['potvrdil_vecnou_spravnost'] = loadUserById($db, $order['potvrdil_vecnou_spravnost_id']);
    }
    
    if (isset($order['fakturant_id']) && $order['fakturant_id']) {
        $enriched['fakturant'] = loadUserById($db, $order['fakturant_id']);
    }
    
    if (isset($order['dokoncil_id']) && $order['dokoncil_id']) {
        $enriched['dokoncil'] = loadUserById($db, $order['dokoncil_id']);
    }
    
    // Střediska - zkontroluj oba možné názvy polí
    $strediska_value = null;
    if (isset($order['strediska_kod']) && $order['strediska_kod']) {
        $strediska_value = $order['strediska_kod'];
    } elseif (isset($order['strediska']) && $order['strediska']) {
        $strediska_value = $order['strediska'];
    }
    
    if ($strediska_value) {
        $enriched['strediska'] = loadStrediskaByKod($db, $strediska_value);
    }
    
    // Stavy - pokud je stav_workflow_kod array, načteme všechny stavy
    if (isset($order['stav_workflow_kod']) && $order['stav_workflow_kod']) {
        // Pokud je to JSON string, dekódujeme
        $stav_value = $order['stav_workflow_kod'];
        if (is_string($stav_value) && (strpos($stav_value, '[') === 0 || strpos($stav_value, '"') === 0)) {
            $decoded = json_decode($stav_value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $stav_value = $decoded;
            }
        }
        
        // Pokud je to array, načteme všechny stavy
        if (is_array($stav_value)) {
            $enriched['stav_workflow'] = array();
            foreach ($stav_value as $stav_kod) {
                $stav = loadStavByKod($db, $stav_kod);
                if ($stav) {
                    $enriched['stav_workflow'][] = $stav;
                }
            }
            // Pokud jsme nenašli žádný stav, nastavíme false pro zpětnou kompatibilitu
            if (empty($enriched['stav_workflow'])) {
                $enriched['stav_workflow'] = false;
            }
        } else {
            // Single stav
            $enriched['stav_workflow'] = loadStavByKod($db, $stav_value);
        }
    }
    
    // Druh objednávky
    if (isset($order['druh_objednavky_kod']) && $order['druh_objednavky_kod']) {
        $enriched['druh_objednavky'] = loadDruhObjednavkyByKod($db, $order['druh_objednavky_kod']);
    }
    
    // Přidáme enriched data k objednávce
    $order['_enriched'] = $enriched;
}

/**
 * Obohacuje více objednávek o číselníky
 * @param PDO $db - Databázové spojení
 * @param array $orders - Reference na pole objednávek (bude upraveno)
 * @return void
 */
function enrichOrdersWithCodebooks($db, &$orders) {
    foreach ($orders as &$order) {
        enrichOrderWithCodebooks($db, $order);
    }
}

// ========== ORDER HANDLERS ==========

function handle_orders25_list($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu']);
        return;
    }

    try {
        $db = get_db($config);
        
    // Volitelný rok a měsíc/interval měsíců pro filtrování podle dt_vytvoreni
    $rok = isset($input['rok']) && $input['rok'] !== '' ? (int)$input['rok'] : null;
    
    // Volitelný parametr archivovano (1 = jen archivované objednávky se stavem ARCHIVOVANO)
    $archivovano = isset($input['archivovano']) && $input['archivovano'] == 1 ? 1 : 0;
    
    // Parsing měsíce - může být jednotlivý (10) nebo interval (10-12)
    $mesic_od = null;
    $mesic_do = null;
    if (isset($input['mesic']) && $input['mesic'] !== '') {
        $mesic_input = trim($input['mesic']);
        if (strpos($mesic_input, '-') !== false) {
            // Interval měsíců (např. "10-12")
            $parts = explode('-', $mesic_input, 2);
            $mesic_od = (int)trim($parts[0]);
            $mesic_do = (int)trim($parts[1]);
            // Validace rozsahu
            if ($mesic_od < 1 || $mesic_od > 12 || $mesic_do < 1 || $mesic_do > 12) {
                http_response_code(400);
                echo json_encode(['err' => 'Neplatný interval měsíců. Použijte čísla 1-12 (např. "10-12")']);
                return;
            }
        } else {
            // Jednotlivý měsíc (např. "10")
            $mesic_od = (int)$mesic_input;
            $mesic_do = $mesic_od;
            // Validace měsíce
            if ($mesic_od < 1 || $mesic_od > 12) {
                http_response_code(400);
                echo json_encode(['err' => 'Neplatný měsíc. Použijte číslo 1-12']);
                return;
            }
        }
    }

    // Dynamické sestavení SQL dotazu s filtrem pro archivované objednávky
    $sql = "SELECT * FROM 25a_objednavky WHERE aktivni = 1";
    
    if ($rok !== null) {
        $sql .= " AND YEAR(dt_vytvoreni) = :rok";
    }
    if ($mesic_od !== null) {
        $sql .= " AND MONTH(dt_vytvoreni) >= :mesic_od";
    }
    if ($mesic_do !== null) {
        $sql .= " AND MONTH(dt_vytvoreni) <= :mesic_do";
    }
    
    // Pokud archivovano NENÍ nastaveno, vyloučíme archivované objednávky
    if ($archivovano == 0) {
        $sql .= " AND stav_objednavky != 'ARCHIVOVANO'";
    }
    // Pokud archivovano = 1, necháme všechny objednávky (i archivované)
    
    $sql .= " ORDER BY dt_vytvoreni DESC";

    // Select all orders with optional year/month filter
    $stmt = $db->prepare($sql);
    
    if ($rok !== null) {
        $stmt->bindParam(':rok', $rok, PDO::PARAM_INT);
    }
    if ($mesic_od !== null) {
        $stmt->bindParam(':mesic_od', $mesic_od, PDO::PARAM_INT);
    }
    if ($mesic_do !== null) {
        $stmt->bindParam(':mesic_do', $mesic_do, PDO::PARAM_INT);
    }
    
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Přidání položek k objednávkám
        enrichOrdersWithItems($db, $orders);
        
        // Přidání faktur k objednávkám
        enrichOrdersWithInvoices($db, $orders);
        
        // Přidání enriched číselníků k objednávkám  
        enrichOrdersWithCodebooks($db, $orders);

        echo json_encode([
            'status' => 'ok',
            'data' => $orders
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání objednávek: ' . $e->getMessage()]);
    }
}

function handle_orders25_by_id($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Volitelný parametr archivovano (1 = zahrnout i archivované objednávky)
        $archivovano = isset($input['archivovano']) && $input['archivovano'] == 1 ? 1 : 0;
        
        // NOVÉ: Použijeme dotaz s lock informacemi a workflow tracking daty
        // Dynamické sestavení SQL dotazu s lock_info a workflow user data
        $sql = "SELECT o.*, 
                CASE 
                    WHEN o.dt_zamek IS NULL OR o.zamek_uzivatel_id = 0 THEN 'unlocked'
                    WHEN TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) > 15 THEN 'expired'
                    WHEN o.zamek_uzivatel_id = :current_user_id THEN 'owned'
                    ELSE 'locked'
                END as lock_status,
                TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as lock_age_minutes,
                o.zamek_uzivatel_id,
                o.dt_zamek,
                CONCAT(
                    CASE WHEN u_lock.titul_pred IS NOT NULL AND u_lock.titul_pred != '' 
                         THEN CONCAT(u_lock.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_lock.jmeno, 
                    ' ', 
                    u_lock.prijmeni,
                    CASE WHEN u_lock.titul_za IS NOT NULL AND u_lock.titul_za != '' 
                         THEN CONCAT(' ', u_lock.titul_za) 
                         ELSE '' 
                    END
                ) as zamek_uzivatel_jmeno,
                u_lock.titul_pred as zamek_uzivatel_titul_pred,
                u_lock.titul_za as zamek_uzivatel_titul_za,
                u_lock.email as zamek_uzivatel_email,
                u_lock.telefon as zamek_uzivatel_telefon,
                -- Workflow tracking user data
                CONCAT(
                    CASE WHEN u_odesilatel.titul_pred IS NOT NULL AND u_odesilatel.titul_pred != '' 
                         THEN CONCAT(u_odesilatel.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_odesilatel.jmeno, 
                    ' ', 
                    u_odesilatel.prijmeni,
                    CASE WHEN u_odesilatel.titul_za IS NOT NULL AND u_odesilatel.titul_za != '' 
                         THEN CONCAT(' ', u_odesilatel.titul_za) 
                         ELSE '' 
                    END
                ) as odesilatel_jmeno,
                CONCAT(
                    CASE WHEN u_potvrdil.titul_pred IS NOT NULL AND u_potvrdil.titul_pred != '' 
                         THEN CONCAT(u_potvrdil.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_potvrdil.jmeno, 
                    ' ', 
                    u_potvrdil.prijmeni,
                    CASE WHEN u_potvrdil.titul_za IS NOT NULL AND u_potvrdil.titul_za != '' 
                         THEN CONCAT(' ', u_potvrdil.titul_za) 
                         ELSE '' 
                    END
                ) as potvrdil_jmeno,
                CONCAT(
                    CASE WHEN u_fakturant.titul_pred IS NOT NULL AND u_fakturant.titul_pred != '' 
                         THEN CONCAT(u_fakturant.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_fakturant.jmeno, 
                    ' ', 
                    u_fakturant.prijmeni,
                    CASE WHEN u_fakturant.titul_za IS NOT NULL AND u_fakturant.titul_za != '' 
                         THEN CONCAT(' ', u_fakturant.titul_za) 
                         ELSE '' 
                    END
                ) as fakturant_jmeno,
                CONCAT(
                    CASE WHEN u_dokoncil.titul_pred IS NOT NULL AND u_dokoncil.titul_pred != '' 
                         THEN CONCAT(u_dokoncil.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_dokoncil.jmeno, 
                    ' ', 
                    u_dokoncil.prijmeni,
                    CASE WHEN u_dokoncil.titul_za IS NOT NULL AND u_dokoncil.titul_za != '' 
                         THEN CONCAT(' ', u_dokoncil.titul_za) 
                         ELSE '' 
                    END
                ) as dokoncil_jmeno
                FROM " . get_orders_table_name() . " o
                LEFT JOIN " . get_users_table_name() . " u_lock ON o.zamek_uzivatel_id = u_lock.id
                LEFT JOIN " . get_users_table_name() . " u_odesilatel ON o.odesilatel_id = u_odesilatel.id
                LEFT JOIN " . get_users_table_name() . " u_potvrdil ON o.dodavatel_potvrdil_id = u_potvrdil.id
                LEFT JOIN " . get_users_table_name() . " u_fakturant ON o.fakturant_id = u_fakturant.id
                LEFT JOIN " . get_users_table_name() . " u_dokoncil ON o.dokoncil_id = u_dokoncil.id
                WHERE o.id = :id AND o.aktivni = 1";
        
        // Pokud archivovano NENÍ nastaveno, vyloučíme archivované objednávky
        if ($archivovano == 0) {
            $sql .= " AND o.stav_objednavky != 'ARCHIVOVANO'";
        }
        // Pokud archivovano = 1, necháme všechny objednávky (i archivované)
        
        // Select order by ID with lock info
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        // Přidání položek k objednávce
        enrichOrderWithItems($db, $order);
        
        // Přidání faktur k objednávce
        enrichOrderWithInvoices($db, $order);
        
        // Přidání enriched číselníků k objednávce
        enrichOrderWithCodebooks($db, $order);
        
        // NOVÉ: Sestavení lock_info objektu z dat dotazu
        // DŮLEŽITÉ: locked = true POUZE když je zamčená JINÝM uživatelem (lock_status === 'locked')
        // Pokud lock_status === 'owned', locked = false (protože JÁ ji mohu editovat)
        $lock_info = [
            'locked' => ($order['lock_status'] === 'locked'), // TRUE pouze když zamčená JINÝM
            'locked_by_user_id' => $order['zamek_uzivatel_id'] ? (int)$order['zamek_uzivatel_id'] : null,
            'locked_by_user_fullname' => $order['zamek_uzivatel_jmeno'] ? $order['zamek_uzivatel_jmeno'] : null,
            'locked_by_user_titul_pred' => $order['zamek_uzivatel_titul_pred'] ? $order['zamek_uzivatel_titul_pred'] : null,
            'locked_by_user_titul_za' => $order['zamek_uzivatel_titul_za'] ? $order['zamek_uzivatel_titul_za'] : null,
            'locked_by_user_email' => $order['zamek_uzivatel_email'] ? $order['zamek_uzivatel_email'] : null,
            'locked_by_user_telefon' => $order['zamek_uzivatel_telefon'] ? $order['zamek_uzivatel_telefon'] : null,
            'locked_at' => $order['dt_zamek'],
            'lock_status' => $order['lock_status'], // unlocked|expired|owned|locked
            'lock_age_minutes' => $order['lock_age_minutes'] !== null ? (int)$order['lock_age_minutes'] : null,
            'is_owned_by_me' => ($order['lock_status'] === 'owned') // TRUE pokud JÁ vlastním zámek
        ];
        
        // NOVÉ: Sestavení workflow_tracking_info objektu z dat dotazu
        $workflow_tracking_info = [
            'odesilatel' => [
                'user_id' => $order['odesilatel_id'] ? (int)$order['odesilatel_id'] : null,
                'fullname' => $order['odesilatel_jmeno'] ? trim($order['odesilatel_jmeno']) : null,
                'timestamp' => $order['dt_odeslani']
            ],
            'dodavatel_potvrdil' => [
                'user_id' => $order['dodavatel_potvrdil_id'] ? (int)$order['dodavatel_potvrdil_id'] : null,
                'fullname' => $order['potvrdil_jmeno'] ? trim($order['potvrdil_jmeno']) : null,
                'timestamp' => $order['dt_akceptace']
            ],
            'fakturant' => [
                'user_id' => $order['fakturant_id'] ? (int)$order['fakturant_id'] : null,
                'fullname' => $order['fakturant_jmeno'] ? trim($order['fakturant_jmeno']) : null,
                'timestamp' => $order['dt_faktura_pridana']
            ],
            'dokoncil' => [
                'user_id' => $order['dokoncil_id'] ? (int)$order['dokoncil_id'] : null,
                'fullname' => $order['dokoncil_jmeno'] ? trim($order['dokoncil_jmeno']) : null,
                'timestamp' => $order['dt_dokonceni'],
                'note' => $order['dokonceni_poznamka']
            ]
        ];
        
        // Vyčištění dočasných polí z order objektu
        unset($order['lock_status']);
        unset($order['lock_age_minutes']);
        unset($order['zamek_uzivatel_jmeno']);
        unset($order['zamek_uzivatel_titul_pred']);
        unset($order['zamek_uzivatel_titul_za']);
        unset($order['zamek_uzivatel_email']);
        unset($order['zamek_uzivatel_telefon']);
        unset($order['odesilatel_jmeno']);
        unset($order['potvrdil_jmeno']);
        unset($order['fakturant_jmeno']);
        unset($order['dokoncil_jmeno']);
        
        // Přidání lock_info a workflow_tracking_info do odpovědi
        $order['lock_info'] = $lock_info;
        $order['workflow_tracking_info'] = $workflow_tracking_info;

        echo json_encode([
            'status' => 'ok',
            'data' => $order
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_by_user($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        
    // Volitelný rok a měsíc/interval měsíců pro filtrování podle dt_vytvoreni
    $rok = isset($input['rok']) && $input['rok'] !== '' ? (int)$input['rok'] : null;
    
    // Volitelný parametr archivovano (1 = jen archivované objednávky se stavem ARCHIVOVANO)
    $archivovano = isset($input['archivovano']) && $input['archivovano'] == 1 ? 1 : 0;
    
    // Parsing měsíce - může být jednotlivý (10) nebo interval (10-12)
    $mesic_od = null;
    $mesic_do = null;
    if (isset($input['mesic']) && $input['mesic'] !== '') {
        $mesic_input = trim($input['mesic']);
        if (strpos($mesic_input, '-') !== false) {
            // Interval měsíců (např. "10-12")
            $parts = explode('-', $mesic_input, 2);
            $mesic_od = (int)trim($parts[0]);
            $mesic_do = (int)trim($parts[1]);
            // Validace rozsahu
            if ($mesic_od < 1 || $mesic_od > 12 || $mesic_do < 1 || $mesic_do > 12) {
                http_response_code(400);
                echo json_encode(['err' => 'Neplatný interval měsíců. Použijte čísla 1-12 (např. "10-12")']);
                return;
            }
        } else {
            // Jednotlivý měsíc (např. "10")
            $mesic_od = (int)$mesic_input;
            $mesic_do = $mesic_od;
            // Validace měsíce
            if ($mesic_od < 1 || $mesic_od > 12) {
                http_response_code(400);
                echo json_encode(['err' => 'Neplatný měsíc. Použijte číslo 1-12']);
                return;
            }
        }
    }
        
        // Pokud není zadán user_id, načti všechny objednávky (admin režim)
        if ($user_id <= 0) {
            // Admin režim - všechny objednávky
            // Dynamické sestavení SQL dotazu
            $sql = "SELECT * FROM 25a_objednavky WHERE aktivni = 1";
            
            if ($rok !== null) {
                $sql .= " AND YEAR(dt_vytvoreni) = :rok";
            }
            if ($mesic_od !== null) {
                $sql .= " AND MONTH(dt_vytvoreni) >= :mesic_od";
            }
            if ($mesic_do !== null) {
                $sql .= " AND MONTH(dt_vytvoreni) <= :mesic_do";
            }
            // Pokud archivovano NENÍ nastaveno, vyloučíme archivované objednávky
            if ($archivovano == 0) {
                $sql .= " AND stav_objednavky != 'ARCHIVOVANO'";
            }
            // Pokud archivovano = 1, necháme všechny objednávky (i archivované)
            $sql .= " ORDER BY dt_vytvoreni DESC";
            
            $stmt = $db->prepare($sql);
            if ($rok !== null) {
                $stmt->bindParam(':rok', $rok, PDO::PARAM_INT);
            }
            if ($mesic_od !== null) {
                $stmt->bindParam(':mesic_od', $mesic_od, PDO::PARAM_INT);
            }
            if ($mesic_do !== null) {
                $stmt->bindParam(':mesic_do', $mesic_do, PDO::PARAM_INT);
            }
        } else {
            // User režim - objednávky kde je user objednatel nebo garant
            $sql = "SELECT * FROM 25a_objednavky WHERE aktivni = 1 AND (objednatel_id = :uzivatel_id OR garant_uzivatel_id = :uzivatel_id)";
            
            if ($rok !== null) {
                $sql .= " AND YEAR(dt_vytvoreni) = :rok";
            }
            if ($mesic_od !== null) {
                $sql .= " AND MONTH(dt_vytvoreni) >= :mesic_od";
            }
            if ($mesic_do !== null) {
                $sql .= " AND MONTH(dt_vytvoreni) <= :mesic_do";
            }
            // Pokud archivovano NENÍ nastaveno, vyloučíme archivované objednávky
            if ($archivovano == 0) {
                $sql .= " AND stav_objednavky != 'ARCHIVOVANO'";
            }
            // Pokud archivovano = 1, necháme všechny objednávky (i archivované)
            $sql .= " ORDER BY dt_vytvoreni DESC";
            
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':uzivatel_id', $user_id, PDO::PARAM_INT);
            if ($rok !== null) {
                $stmt->bindParam(':rok', $rok, PDO::PARAM_INT);
            }
            if ($mesic_od !== null) {
                $stmt->bindParam(':mesic_od', $mesic_od, PDO::PARAM_INT);
            }
            if ($mesic_do !== null) {
                $stmt->bindParam(':mesic_do', $mesic_do, PDO::PARAM_INT);
            }
        }
        
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Přidání položek k objednávkám
        enrichOrdersWithItems($db, $orders);
        
        // Přidání faktur k objednávkám
        enrichOrdersWithInvoices($db, $orders);
        
        // Přidání enriched číselníků k objednávkám  
        enrichOrdersWithCodebooks($db, $orders);

        echo json_encode([
            'status' => 'ok',
            'data' => $orders
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání objednávek uživatele: ' . $e->getMessage()]);
    }
}

function handle_orders25_status_by_id_and_user($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $uzivatel_id = isset($input['uzivatel_id']) ? (int)$input['uzivatel_id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    if ($uzivatel_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID uživatele']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Select order status info by ID where user is objednatel or garant
        $stmt = $db->prepare(selectOrderStatusByIdAndUserQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':uzivatel_id', $uzivatel_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena nebo nepatří zadanému uživateli']);
            return;
        }

        // Determine user role in the order
        $user_role = '';
        if ((int)$order['objednatel_id'] === $uzivatel_id) {
            $user_role = 'objednatel';
        } else if ((int)$order['garant_uzivatel_id'] === $uzivatel_id) {
            $user_role = 'garant';
        }

        echo json_encode([
            'status' => 'ok',
            'data' => [
                'id' => (int)$order['id'],
                'stav_objednavky' => $order['stav_objednavky'],
                'stav_workflow_kod' => $order['stav_workflow_kod'],
                'uzivatel_id' => (int)$order['uzivatel_id'],
                'objednatel_id' => (int)$order['objednatel_id'],
                'garant_uzivatel_id' => (int)$order['garant_uzivatel_id'],
                'user_role' => $user_role
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání stavu objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_insert($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Nastavit MySQL timezone pro konzistentní datetime handling (NOW() bude v českém čase)
        TimezoneHelper::setMysqlTimezone($db);
        
        $db->beginTransaction();

        // ✅ KRITICKÁ OPRAVA: Číslo objednávky MUSÍ být VŽDY vygenerováno backendem
        // Frontend ho NEPOSÍLÁ, backend ho generuje sám pomocí getNextOrderNumber()
        // NIKDY nemůže být NULL, NIKDY nemůže být FALLBACK-ID
        
        $requested_order_number = isset($input['cislo_objednavky']) && !empty($input['cislo_objednavky']) ? $input['cislo_objednavky'] : null;
        $final_order_number = null;  // Iniciálně NULL, ale MUSÍ být vygenerováno
        
        if ($requested_order_number !== null) {
            // Kontrola, zda číslo už existuje (pro případ manuálního zadání z FE)
            $check_stmt = $db->prepare("SELECT COUNT(*) FROM " . get_orders_table_name() . " WHERE cislo_objednavky = :cislo_objednavky");
            $check_stmt->bindParam(':cislo_objednavky', $requested_order_number);
            $check_stmt->execute();
            
            if ($check_stmt->fetchColumn() > 0) {
                // Číslo je obsazené, najdi poslední použité číslo v roce a přičti 1
                $pattern_parts = explode('/', $requested_order_number);
                if (count($pattern_parts) >= 4) {
                    // Format: O-0001/12345678/2025/IT
                    $ico = $pattern_parts[1];
                    $year = $pattern_parts[2];
                    $usek = $pattern_parts[3];
                    
                    // Najdi poslední použité číslo v roce
                    $last_number_stmt = $db->prepare("
                        SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) as last_number 
                        FROM " . get_orders_table_name() . "
                        WHERE cislo_objednavky LIKE 'O-%/" . $ico . "/" . $year . "/" . $usek . "'
                    ");
                    $last_number_stmt->execute();
                    $last_result = $last_number_stmt->fetch();
                    $next_available = (isset($last_result['last_number']) ? $last_result['last_number'] : 0) + 1;
                    
                    $final_order_number = 'O-' . sprintf('%04d', $next_available) . '/' . $ico . '/' . $year . '/' . $usek;
                } else {
                    // Pokud formát nesedí, vygeneruj nové číslo (fallback)
                    $requested_order_number = null;
                }
            } else {
                // Číslo je volné, použij ho
                $final_order_number = $requested_order_number;
            }
        }
        
        // ✅ KLÍČOVÉ: Pokud číslo NENÍ zadáno NEBO je formát neplatný → VŽDY automaticky vygeneruj
        if ($final_order_number === null) {
            try {
                // Získání dalšího čísla v sekvenci
                $stmtNext = $db->prepare("
                    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) + 1 as next_number 
                    FROM " . get_orders_table_name() . "
                    WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(cislo_objednavky, '/', -2), '/', 1) = YEAR(NOW()) AND cislo_objednavky LIKE 'O-%'
                ");
                $stmtNext->execute();
                $nextResult = $stmtNext->fetch();
                
                // Získání organizačních dat uživatele
                $stmtOrg = $db->prepare($queries['uzivatele_org_data_by_username']);
                $stmtOrg->bindParam(':username', $request_username);
                $stmtOrg->execute();
                $org_data = $stmtOrg->fetch();
                
                if ($org_data && $nextResult) {
                    $ico = $org_data['organizace_ico'];
                    $usek_zkr = $org_data['usek_zkr'];
                    $current_year = TimezoneHelper::getCzechDateTime('Y');
                    $formatted_number = sprintf('%04d', $nextResult['next_number']);
                    $final_order_number = 'O-' . $formatted_number . '/' . $ico . '/' . $current_year . '/' . $usek_zkr;
                    
                    error_log("✅ Vygenerováno číslo objednávky: {$final_order_number}");
                } else {
                    // Fallback POUZE pro případ kritické chyby DB
                    $final_order_number = 'O-TEMP-' . time() . '-' . $token_data['id'];
                    error_log("⚠️ WARNING: Použito fallback číslo objednávky: {$final_order_number} (chybí org_data nebo next_number)");
                }
            } catch (Exception $e) {
                // Fallback POUZE pro případ kritické chyby
                $final_order_number = 'O-TEMP-' . time() . '-' . $token_data['id'];
                error_log("⚠️ ERROR při generování čísla objednávky: " . $e->getMessage());
                error_log("⚠️ Použito fallback číslo: {$final_order_number}");
            }
        }
        
        // ✅ GARANTUJEME: $final_order_number NIKDY není NULL v tomto bodě

        // Partial insert - pouze povinné a zadané hodnoty
        // Použít TimezoneHelper pro správný český čas (respektuje letní/zimní čas)
        $current_date = TimezoneHelper::getCzechDateTime('Y-m-d');
        $current_datetime = TimezoneHelper::getCzechDateTime();
        
        // ✅ NORMALIZACE: strediska_kod → JSON array stringů (UPPERCASE)
        $strediska_kod_normalized = 'NEZADANO';
        if (isset($input['strediska_kod'])) {
            if (is_array($input['strediska_kod'])) {
                // Normalizace: UPPERCASE + odstranění prázdných hodnot
                $normalizedStrediska = array_map(function($kod) {
                    return strtoupper(trim($kod));
                }, $input['strediska_kod']);
                $normalizedStrediska = array_values(array_unique(array_filter($normalizedStrediska)));
                $strediska_kod_normalized = json_encode($normalizedStrediska);
            } elseif (is_string($input['strediska_kod'])) {
                // Už je to string - zkus parsovat a normalizovat
                $parsed = json_decode($input['strediska_kod'], true);
                if (is_array($parsed)) {
                    $normalizedStrediska = array_map(function($kod) {
                        if (is_string($kod)) {
                            return strtoupper(trim($kod));
                        }
                        return strtoupper(trim((string)$kod));
                    }, $parsed);
                    $normalizedStrediska = array_values(array_unique(array_filter($normalizedStrediska)));
                    $strediska_kod_normalized = json_encode($normalizedStrediska);
                } else {
                    $strediska_kod_normalized = $input['strediska_kod'];
                }
            }
        }
        
        // ✅ NORMALIZACE: financovani → JSON objekt {typ, lp_kody, ...}
        $financovani_normalized = null;
        if (isset($input['financovani'])) {
            if (is_array($input['financovani'])) {
                // Validace: typ je povinný
                if (!isset($input['financovani']['typ']) || empty($input['financovani']['typ'])) {
                    // Pokud chybí typ, zkus fallback na kod_stavu (backwards compatibility)
                    if (isset($input['financovani']['kod_stavu'])) {
                        $input['financovani']['typ'] = $input['financovani']['kod_stavu'];
                    }
                }
                
                // Sestavení objektu pouze s relevantními poli
                $financovaniData = array(
                    'typ' => $input['financovani']['typ']
                );
                
                // Dynamická pole podle typu
                if (isset($input['financovani']['lp_kody']) && is_array($input['financovani']['lp_kody'])) {
                    $financovaniData['lp_kody'] = $input['financovani']['lp_kody'];
                } elseif (isset($input['financovani']['lp_kod']) && is_array($input['financovani']['lp_kod'])) {
                    // Backwards compatibility
                    $financovaniData['lp_kody'] = $input['financovani']['lp_kod'];
                }
                
                if (isset($input['financovani']['cislo_smlouvy'])) {
                    $financovaniData['cislo_smlouvy'] = $input['financovani']['cislo_smlouvy'];
                }
                if (isset($input['financovani']['smlouva_poznamka'])) {
                    $financovaniData['smlouva_poznamka'] = $input['financovani']['smlouva_poznamka'];
                }
                if (isset($input['financovani']['individualni_schvaleni'])) {
                    $financovaniData['individualni_schvaleni'] = $input['financovani']['individualni_schvaleni'];
                }
                if (isset($input['financovani']['individualni_poznamka'])) {
                    $financovaniData['individualni_poznamka'] = $input['financovani']['individualni_poznamka'];
                }
                if (isset($input['financovani']['pojistna_udalost_cislo'])) {
                    $financovaniData['pojistna_udalost_cislo'] = $input['financovani']['pojistna_udalost_cislo'];
                }
                if (isset($input['financovani']['pojistna_udalost_poznamka'])) {
                    $financovaniData['pojistna_udalost_poznamka'] = $input['financovani']['pojistna_udalost_poznamka'];
                }
                
                $financovani_normalized = json_encode($financovaniData);
            } elseif (is_string($input['financovani'])) {
                // Už je to JSON string - zkus parsovat a normalizovat
                $parsed = json_decode($input['financovani'], true);
                if (is_array($parsed)) {
                    // Re-encode s čistou strukturou
                    $financovaniData = array('typ' => isset($parsed['typ']) ? $parsed['typ'] : (isset($parsed['kod_stavu']) ? $parsed['kod_stavu'] : null));
                    
                    foreach (array('lp_kody', 'lp_kod', 'cislo_smlouvy', 'smlouva_poznamka', 'individualni_schvaleni', 'individualni_poznamka', 'pojistna_udalost_cislo', 'pojistna_udalost_poznamka') as $key) {
                        if (isset($parsed[$key])) {
                            $financovaniData[$key] = $parsed[$key];
                        }
                    }
                    
                    $financovani_normalized = json_encode($financovaniData);
                } else {
                    $financovani_normalized = $input['financovani'];
                }
            }
        }
        
        $orderData = [
            ':cislo_objednavky' => $final_order_number,
            ':dt_objednavky' => normalizeDatetime(isset($input['dt_objednavky']) ? $input['dt_objednavky'] : $current_datetime, true),
            ':predmet' => isset($input['predmet']) ? $input['predmet'] : 'Návrh objednávky',
            ':strediska_kod' => $strediska_kod_normalized,
            ':max_cena_s_dph' => isset($input['max_cena_s_dph']) ? $input['max_cena_s_dph'] : null,
            ':financovani' => $financovani_normalized,
            ':druh_objednavky_kod' => isset($input['druh_objednavky_kod']) ? $input['druh_objednavky_kod'] : 'STANDARDNI',
            ':stav_workflow_kod' => isset($input['stav_workflow_kod']) ? $input['stav_workflow_kod'] : 'NOVA',
            ':stav_objednavky' => getStavObjednavkyFromWorkflow($db, isset($input['stav_workflow_kod']) ? $input['stav_workflow_kod'] : 'NOVA'),
            ':uzivatel_id' => $token_data['id'],
            ':uzivatel_akt_id' => $token_data['id'],
            ':garant_uzivatel_id' => isset($input['garant_uzivatel_id']) && !empty($input['garant_uzivatel_id']) ? (int)$input['garant_uzivatel_id'] : null,
            ':objednatel_id' => isset($input['objednatel_id']) && !empty($input['objednatel_id']) ? (int)$input['objednatel_id'] : null,
            ':schvalovatel_id' => isset($input['schvalovatel_id']) && !empty($input['schvalovatel_id']) ? (int)$input['schvalovatel_id'] : null,
            ':prikazce_id' => isset($input['prikazce_id']) && !empty($input['prikazce_id']) ? (int)$input['prikazce_id'] : null,
            ':dt_schvaleni' => normalizeDatetime(isset($input['dt_schvaleni']) ? $input['dt_schvaleni'] : null, true),
            ':schvaleni_komentar' => isset($input['schvaleni_komentar']) && !empty($input['schvaleni_komentar']) ? $input['schvaleni_komentar'] : null,
            ':dodavatel_id' => isset($input['dodavatel_id']) && !empty($input['dodavatel_id']) ? (int)$input['dodavatel_id'] : null,
            ':dodavatel_nazev' => isset($input['dodavatel_nazev']) && !empty($input['dodavatel_nazev']) ? $input['dodavatel_nazev'] : null,
            ':dodavatel_adresa' => isset($input['dodavatel_adresa']) && !empty($input['dodavatel_adresa']) ? $input['dodavatel_adresa'] : null,
            ':dodavatel_ico' => isset($input['dodavatel_ico']) && !empty($input['dodavatel_ico']) ? $input['dodavatel_ico'] : null,
            ':dodavatel_dic' => isset($input['dodavatel_dic']) && !empty($input['dodavatel_dic']) ? $input['dodavatel_dic'] : null,
            ':dodavatel_zastoupeny' => isset($input['dodavatel_zastoupeny']) && !empty($input['dodavatel_zastoupeny']) ? $input['dodavatel_zastoupeny'] : null,
            ':dodavatel_kontakt_jmeno' => isset($input['dodavatel_kontakt_jmeno']) && !empty($input['dodavatel_kontakt_jmeno']) ? $input['dodavatel_kontakt_jmeno'] : null,
            ':dodavatel_kontakt_email' => isset($input['dodavatel_kontakt_email']) && !empty($input['dodavatel_kontakt_email']) ? $input['dodavatel_kontakt_email'] : null,
            ':dodavatel_kontakt_telefon' => isset($input['dodavatel_kontakt_telefon']) && !empty($input['dodavatel_kontakt_telefon']) ? $input['dodavatel_kontakt_telefon'] : null,
            ':dt_predpokladany_termin_dodani' => normalizeDatetime(isset($input['dt_predpokladany_termin_dodani']) ? $input['dt_predpokladany_termin_dodani'] : null, false),
            ':misto_dodani' => isset($input['misto_dodani']) && !empty($input['misto_dodani']) ? $input['misto_dodani'] : null,
            ':zaruka' => isset($input['zaruka']) && !empty($input['zaruka']) ? $input['zaruka'] : null,
            ':dt_odeslani' => normalizeDatetime(isset($input['dt_odeslani']) ? $input['dt_odeslani'] : null, true),
            ':odeslani_storno_duvod' => isset($input['odeslani_storno_duvod']) && !empty($input['odeslani_storno_duvod']) ? $input['odeslani_storno_duvod'] : null,
            ':dodavatel_zpusob_potvrzeni' => isset($input['dodavatel_zpusob_potvrzeni']) && !empty($input['dodavatel_zpusob_potvrzeni']) ? $input['dodavatel_zpusob_potvrzeni'] : null,
            ':dt_akceptace' => normalizeDatetime(isset($input['dt_akceptace']) ? $input['dt_akceptace'] : null, true),
            ':dt_zverejneni' => normalizeDatetime(isset($input['dt_zverejneni']) ? $input['dt_zverejneni'] : null, true),
            ':registr_iddt' => isset($input['registr_iddt']) && !empty($input['registr_iddt']) ? $input['registr_iddt'] : null,
            ':poznamka' => isset($input['poznamka']) && !empty($input['poznamka']) ? $input['poznamka'] : null,
            ':zverejnil_id' => null,
            ':potvrdil_vecnou_spravnost_id' => null,
            ':dt_potvrzeni_vecne_spravnosti' => null,
            ':vecna_spravnost_umisteni_majetku' => null,
            ':vecna_spravnost_poznamka' => null,
            ':potvrzeni_vecne_spravnosti' => 0,
            ':potvrzeni_dokonceni_objednavky' => 0,
            ':dt_vytvoreni' => $current_datetime, // Automaticky nastavit čas vytvoření
            ':dt_aktualizace' => $current_datetime, // Automaticky nastavit čas aktualizace
            ':dt_zamek' => $current_datetime, // Automaticky zamknout při vytváření
            ':zamek_uzivatel_id' => $token_data['id'], // Zamknout pro aktuálního uživatele
            ':aktivni' => 1,
            // Workflow tracking fields - při insert jsou všechny NULL
            ':odesilatel_id' => null,
            ':dodavatel_potvrdil_id' => null,
            ':fakturant_id' => null,
            ':dt_faktura_pridana' => null,
            ':dokoncil_id' => null,
            ':dt_dokonceni' => null,
            ':dokonceni_poznamka' => null
        ];

        // Insert order (již obsahuje zámek při vytváření)
        $stmt = $db->prepare(insertOrderQuery());
        $stmt->execute($orderData);
        $order_id = $db->lastInsertId();

        // ========== ✅ WORKFLOW REFACTORING: Vrátit KOMPLETNÍ záznam po INSERT ==========
        // Důvod: FE potřebuje všechna pole včetně Fáze 7 a 8 pro synchronizaci s draftem
        // Změna (28.10.2025): Místo částečných dat načítáme celý záznam jako v GET endpoint
        
        // Načtení kompletního záznamu s lock_info a workflow_tracking_info
        $sql = "SELECT o.*, 
                CASE 
                    WHEN o.dt_zamek IS NULL OR o.zamek_uzivatel_id = 0 THEN 'unlocked'
                    WHEN TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) > 15 THEN 'expired'
                    WHEN o.zamek_uzivatel_id = :current_user_id THEN 'owned'
                    ELSE 'locked'
                END as lock_status,
                TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as lock_age_minutes,
                o.zamek_uzivatel_id,
                o.dt_zamek,
                CONCAT(
                    CASE WHEN u_lock.titul_pred IS NOT NULL AND u_lock.titul_pred != '' 
                         THEN CONCAT(u_lock.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_lock.jmeno, 
                    ' ', 
                    u_lock.prijmeni,
                    CASE WHEN u_lock.titul_za IS NOT NULL AND u_lock.titul_za != '' 
                         THEN CONCAT(' ', u_lock.titul_za) 
                         ELSE '' 
                    END
                ) as zamek_uzivatel_jmeno,
                u_lock.titul_pred as zamek_uzivatel_titul_pred,
                u_lock.titul_za as zamek_uzivatel_titul_za,
                u_lock.email as zamek_uzivatel_email,
                u_lock.telefon as zamek_uzivatel_telefon,
                -- Workflow tracking user data
                CONCAT(
                    CASE WHEN u_odesilatel.titul_pred IS NOT NULL AND u_odesilatel.titul_pred != '' 
                         THEN CONCAT(u_odesilatel.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_odesilatel.jmeno, 
                    ' ', 
                    u_odesilatel.prijmeni,
                    CASE WHEN u_odesilatel.titul_za IS NOT NULL AND u_odesilatel.titul_za != '' 
                         THEN CONCAT(' ', u_odesilatel.titul_za) 
                         ELSE '' 
                    END
                ) as odesilatel_jmeno,
                CONCAT(
                    CASE WHEN u_potvrdil.titul_pred IS NOT NULL AND u_potvrdil.titul_pred != '' 
                         THEN CONCAT(u_potvrdil.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_potvrdil.jmeno, 
                    ' ', 
                    u_potvrdil.prijmeni,
                    CASE WHEN u_potvrdil.titul_za IS NOT NULL AND u_potvrdil.titul_za != '' 
                         THEN CONCAT(' ', u_potvrdil.titul_za) 
                         ELSE '' 
                    END
                ) as potvrdil_jmeno,
                CONCAT(
                    CASE WHEN u_fakturant.titul_pred IS NOT NULL AND u_fakturant.titul_pred != '' 
                         THEN CONCAT(u_fakturant.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_fakturant.jmeno, 
                    ' ', 
                    u_fakturant.prijmeni,
                    CASE WHEN u_fakturant.titul_za IS NOT NULL AND u_fakturant.titul_za != '' 
                         THEN CONCAT(' ', u_fakturant.titul_za) 
                         ELSE '' 
                    END
                ) as fakturant_jmeno,
                CONCAT(
                    CASE WHEN u_dokoncil.titul_pred IS NOT NULL AND u_dokoncil.titul_pred != '' 
                         THEN CONCAT(u_dokoncil.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_dokoncil.jmeno, 
                    ' ', 
                    u_dokoncil.prijmeni,
                    CASE WHEN u_dokoncil.titul_za IS NOT NULL AND u_dokoncil.titul_za != '' 
                         THEN CONCAT(' ', u_dokoncil.titul_za) 
                         ELSE '' 
                    END
                ) as dokoncil_jmeno,
                CONCAT(
                    CASE WHEN u_vecna_spravnost.titul_pred IS NOT NULL AND u_vecna_spravnost.titul_pred != '' 
                         THEN CONCAT(u_vecna_spravnost.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_vecna_spravnost.jmeno, 
                    ' ', 
                    u_vecna_spravnost.prijmeni,
                    CASE WHEN u_vecna_spravnost.titul_za IS NOT NULL AND u_vecna_spravnost.titul_za != '' 
                         THEN CONCAT(' ', u_vecna_spravnost.titul_za) 
                         ELSE '' 
                    END
                ) as potvrdil_vecnou_spravnost_jmeno
                FROM " . get_orders_table_name() . " o
                LEFT JOIN " . get_users_table_name() . " u_lock ON o.zamek_uzivatel_id = u_lock.id
                LEFT JOIN " . get_users_table_name() . " u_odesilatel ON o.odesilatel_id = u_odesilatel.id
                LEFT JOIN " . get_users_table_name() . " u_potvrdil ON o.dodavatel_potvrdil_id = u_potvrdil.id
                LEFT JOIN " . get_users_table_name() . " u_fakturant ON o.fakturant_id = u_fakturant.id
                LEFT JOIN " . get_users_table_name() . " u_dokoncil ON o.dokoncil_id = u_dokoncil.id
                LEFT JOIN " . get_users_table_name() . " u_vecna_spravnost ON o.potvrdil_vecnou_spravnost_id = u_vecna_spravnost.id
                WHERE o.id = :id AND o.aktivni = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id', $token_data['id'], PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(array('err' => 'Objednávka nebyla nalezena po insert'));
            return;
        }

        // Přidání položek k objednávce (prázdné pole při create)
        enrichOrderWithItems($db, $order);
        
        // Přidání faktur k objednávce (prázdné pole při create)
        enrichOrderWithInvoices($db, $order);
        
        // Přidání enriched číselníků k objednávce
        enrichOrderWithCodebooks($db, $order);
        
        // Sestavení lock_info objektu
        $lock_info = array(
            'locked' => ($order['lock_status'] === 'locked'),
            'locked_by_user_id' => $order['zamek_uzivatel_id'] ? (int)$order['zamek_uzivatel_id'] : null,
            'locked_by_user_fullname' => $order['zamek_uzivatel_jmeno'] ? $order['zamek_uzivatel_jmeno'] : null,
            'locked_by_user_titul_pred' => $order['zamek_uzivatel_titul_pred'] ? $order['zamek_uzivatel_titul_pred'] : null,
            'locked_by_user_titul_za' => $order['zamek_uzivatel_titul_za'] ? $order['zamek_uzivatel_titul_za'] : null,
            'locked_by_user_email' => $order['zamek_uzivatel_email'] ? $order['zamek_uzivatel_email'] : null,
            'locked_by_user_telefon' => $order['zamek_uzivatel_telefon'] ? $order['zamek_uzivatel_telefon'] : null,
            'locked_at' => $order['dt_zamek'],
            'lock_status' => $order['lock_status'],
            'lock_age_minutes' => $order['lock_age_minutes'] !== null ? (int)$order['lock_age_minutes'] : null,
            'is_owned_by_me' => ($order['lock_status'] === 'owned')
        );
        
        // Sestavení workflow_tracking_info objektu
        $workflow_tracking_info = array(
            'odesilatel' => array(
                'user_id' => $order['odesilatel_id'] ? (int)$order['odesilatel_id'] : null,
                'fullname' => $order['odesilatel_jmeno'] ? trim($order['odesilatel_jmeno']) : null,
                'timestamp' => $order['dt_odeslani']
            ),
            'dodavatel_potvrdil' => array(
                'user_id' => $order['dodavatel_potvrdil_id'] ? (int)$order['dodavatel_potvrdil_id'] : null,
                'fullname' => $order['potvrdil_jmeno'] ? trim($order['potvrdil_jmeno']) : null,
                'timestamp' => $order['dt_akceptace']
            ),
            'fakturant' => array(
                'user_id' => $order['fakturant_id'] ? (int)$order['fakturant_id'] : null,
                'fullname' => $order['fakturant_jmeno'] ? trim($order['fakturant_jmeno']) : null,
                'timestamp' => $order['dt_faktura_pridana']
            ),
            'dokoncil' => array(
                'user_id' => $order['dokoncil_id'] ? (int)$order['dokoncil_id'] : null,
                'fullname' => $order['dokoncil_jmeno'] ? trim($order['dokoncil_jmeno']) : null,
                'timestamp' => $order['dt_dokonceni'],
                'note' => $order['dokonceni_poznamka']
            ),
            'potvrdil_vecnou_spravnost' => array(
                'user_id' => $order['potvrdil_vecnou_spravnost_id'] ? (int)$order['potvrdil_vecnou_spravnost_id'] : null,
                'fullname' => $order['potvrdil_vecnou_spravnost_jmeno'] ? trim($order['potvrdil_vecnou_spravnost_jmeno']) : null,
                'timestamp' => $order['dt_potvrzeni_vecne_spravnosti']
            )
        );
        
        // Vyčištění dočasných polí z order objektu
        unset($order['lock_status']);
        unset($order['lock_age_minutes']);
        unset($order['zamek_uzivatel_jmeno']);
        unset($order['zamek_uzivatel_titul_pred']);
        unset($order['zamek_uzivatel_titul_za']);
        unset($order['zamek_uzivatel_email']);
        unset($order['zamek_uzivatel_telefon']);
        unset($order['odesilatel_jmeno']);
        unset($order['potvrdil_jmeno']);
        unset($order['fakturant_jmeno']);
        unset($order['dokoncil_jmeno']);
        unset($order['potvrdil_vecnou_spravnost_jmeno']);
        
        // Přidání lock_info a workflow_tracking_info do order
        $order['lock_info'] = $lock_info;
        $order['workflow_tracking_info'] = $workflow_tracking_info;
        
        $db->commit();

        // ✅ Vrátit KOMPLETNÍ záznam (všechna pole včetně Fáze 7 a 8)
        echo json_encode(array(
            'status' => 'ok',
            'data' => $order,
            'message' => 'Objednávka byla úspěšně vytvořena' . 
                        (isset($final_order_number) && isset($requested_order_number) && $final_order_number !== $requested_order_number ? 
                         ' s číslem ' . $final_order_number . ' (původně požadované číslo bylo obsazené)' : '') .
                         ' a zamčena pro editaci'
        ));
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při vytváření objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_update($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Nastavit MySQL timezone pro konzistentní datetime handling (NOW() bude v českém čase)
        TimezoneHelper::setMysqlTimezone($db);
        
        $current_user_id = $token_data['id'];

        // Check if order exists and verify lock status
        $stmtLockCheck = $db->prepare(selectOrderByIdForEditQuery());
        $stmtLockCheck->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmtLockCheck->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmtLockCheck->execute();
        $lockInfo = $stmtLockCheck->fetch(PDO::FETCH_ASSOC);

        if (!$lockInfo) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        // Kontrola zámku - UPDATE může provádět pouze vlastník zámku
        if ($lockInfo['lock_status'] === 'locked') {
            http_response_code(423); // 423 Locked
            echo json_encode([
                'err' => 'Objednávka je zamčená jiným uživatelem. Pro editaci použijte endpoint select-for-edit.',
                'lock_info' => [
                    'locked' => true, // ✅ TRUE protože zamčená JINÝM
                    'locked_by_user_id' => (int)$lockInfo['zamek_uzivatel_id'],
                    'locked_by_user_fullname' => isset($lockInfo['locked_by_user_fullname']) ? trim($lockInfo['locked_by_user_fullname']) : '',
                    'locked_at' => $lockInfo['dt_zamek'],
                    'lock_age_minutes' => (int)$lockInfo['lock_age_minutes'],
                    'lock_status' => 'locked',
                    'is_owned_by_me' => false // ✅ Nové pole
                ]
            ]);
            return;
        }

        // Pokud zámek vlastníme nebo je starý, refreshujeme ho
        if ($lockInfo['lock_status'] === 'owned' || $lockInfo['lock_status'] === 'expired' || $lockInfo['lock_status'] === 'unlocked') {
            $refreshStmt = $db->prepare(lockOrderForEditingQuery());
            $refreshStmt->bindParam(':id', $order_id, PDO::PARAM_INT);
            $refreshStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $refreshStmt->execute();
        }

        // Prepare update data
        
        // ✅ NORMALIZACE: strediska_kod → JSON array stringů (UPPERCASE)
        $strediska_kod_normalized = '';
        if (isset($input['strediska_kod'])) {
            if (is_array($input['strediska_kod'])) {
                // Normalizace: UPPERCASE + odstranění prázdných hodnot
                $normalizedStrediska = array_map(function($kod) {
                    return strtoupper(trim($kod));
                }, $input['strediska_kod']);
                $normalizedStrediska = array_values(array_unique(array_filter($normalizedStrediska)));
                $strediska_kod_normalized = json_encode($normalizedStrediska);
            } elseif (is_string($input['strediska_kod'])) {
                // Už je to string - zkus parsovat a normalizovat
                $parsed = json_decode($input['strediska_kod'], true);
                if (is_array($parsed)) {
                    $normalizedStrediska = array_map(function($kod) {
                        if (is_string($kod)) {
                            return strtoupper(trim($kod));
                        }
                        return strtoupper(trim((string)$kod));
                    }, $parsed);
                    $normalizedStrediska = array_values(array_unique(array_filter($normalizedStrediska)));
                    $strediska_kod_normalized = json_encode($normalizedStrediska);
                } else {
                    $strediska_kod_normalized = $input['strediska_kod'];
                }
            }
        }
        
        // ✅ NORMALIZACE: financovani → JSON objekt {typ, lp_kody, ...}
        $financovani_normalized = null;
        if (isset($input['financovani'])) {
            if (is_array($input['financovani'])) {
                // Validace: typ je povinný
                if (!isset($input['financovani']['typ']) || empty($input['financovani']['typ'])) {
                    // Pokud chybí typ, zkus fallback na kod_stavu (backwards compatibility)
                    if (isset($input['financovani']['kod_stavu'])) {
                        $input['financovani']['typ'] = $input['financovani']['kod_stavu'];
                    }
                }
                
                // Sestavení objektu pouze s relevantními poli
                $financovaniData = array(
                    'typ' => $input['financovani']['typ']
                );
                
                // Dynamická pole podle typu
                if (isset($input['financovani']['lp_kody']) && is_array($input['financovani']['lp_kody'])) {
                    $financovaniData['lp_kody'] = $input['financovani']['lp_kody'];
                } elseif (isset($input['financovani']['lp_kod']) && is_array($input['financovani']['lp_kod'])) {
                    // Backwards compatibility
                    $financovaniData['lp_kody'] = $input['financovani']['lp_kod'];
                }
                
                if (isset($input['financovani']['cislo_smlouvy'])) {
                    $financovaniData['cislo_smlouvy'] = $input['financovani']['cislo_smlouvy'];
                }
                if (isset($input['financovani']['smlouva_poznamka'])) {
                    $financovaniData['smlouva_poznamka'] = $input['financovani']['smlouva_poznamka'];
                }
                if (isset($input['financovani']['individualni_schvaleni'])) {
                    $financovaniData['individualni_schvaleni'] = $input['financovani']['individualni_schvaleni'];
                }
                if (isset($input['financovani']['individualni_poznamka'])) {
                    $financovaniData['individualni_poznamka'] = $input['financovani']['individualni_poznamka'];
                }
                if (isset($input['financovani']['pojistna_udalost_cislo'])) {
                    $financovaniData['pojistna_udalost_cislo'] = $input['financovani']['pojistna_udalost_cislo'];
                }
                if (isset($input['financovani']['pojistna_udalost_poznamka'])) {
                    $financovaniData['pojistna_udalost_poznamka'] = $input['financovani']['pojistna_udalost_poznamka'];
                }
                
                $financovani_normalized = json_encode($financovaniData);
            } elseif (is_string($input['financovani'])) {
                // Už je to JSON string - zkus parsovat a normalizovat
                $parsed = json_decode($input['financovani'], true);
                if (is_array($parsed)) {
                    // Re-encode s čistou strukturou
                    $financovaniData = array('typ' => isset($parsed['typ']) ? $parsed['typ'] : (isset($parsed['kod_stavu']) ? $parsed['kod_stavu'] : null));
                    
                    foreach (array('lp_kody', 'lp_kod', 'cislo_smlouvy', 'smlouva_poznamka', 'individualni_schvaleni', 'individualni_poznamka', 'pojistna_udalost_cislo', 'pojistna_udalost_poznamka') as $key) {
                        if (isset($parsed[$key])) {
                            $financovaniData[$key] = $parsed[$key];
                        }
                    }
                    
                    $financovani_normalized = json_encode($financovaniData);
                } else {
                    $financovani_normalized = $input['financovani'];
                }
            }
        }
        
        $updateData = [
            ':id' => $order_id,
            ':cislo_objednavky' => isset($input['cislo_objednavky']) ? $input['cislo_objednavky'] : null,
            ':dt_objednavky' => normalizeDatetime(isset($input['dt_objednavky']) ? $input['dt_objednavky'] : null, true),
            ':predmet' => isset($input['predmet']) ? $input['predmet'] : '',
            ':strediska_kod' => $strediska_kod_normalized,
            ':max_cena_s_dph' => isset($input['max_cena_s_dph']) ? $input['max_cena_s_dph'] : null,
            ':financovani' => $financovani_normalized,
            ':druh_objednavky_kod' => isset($input['druh_objednavky_kod']) ? $input['druh_objednavky_kod'] : '',
            ':stav_workflow_kod' => isset($input['stav_workflow_kod']) ? $input['stav_workflow_kod'] : 'NOVA',
            ':stav_objednavky' => getStavObjednavkyFromWorkflow($db, isset($input['stav_workflow_kod']) ? $input['stav_workflow_kod'] : 'NOVA'),
            ':uzivatel_akt_id' => $token_data['id'],
            ':garant_uzivatel_id' => isset($input['garant_uzivatel_id']) ? $input['garant_uzivatel_id'] : null,
            ':objednatel_id' => isset($input['objednatel_id']) ? $input['objednatel_id'] : null,
            ':schvalovatel_id' => isset($input['schvalovatel_id']) ? $input['schvalovatel_id'] : null,
            ':prikazce_id' => isset($input['prikazce_id']) ? $input['prikazce_id'] : null,
            ':dt_schvaleni' => normalizeDatetime(isset($input['dt_schvaleni']) ? $input['dt_schvaleni'] : null, true),
            ':schvaleni_komentar' => isset($input['schvaleni_komentar']) ? $input['schvaleni_komentar'] : null,
            ':dodavatel_id' => isset($input['dodavatel_id']) ? $input['dodavatel_id'] : null,
            ':dodavatel_nazev' => isset($input['dodavatel_nazev']) ? $input['dodavatel_nazev'] : null,
            ':dodavatel_adresa' => isset($input['dodavatel_adresa']) ? $input['dodavatel_adresa'] : null,
            ':dodavatel_ico' => isset($input['dodavatel_ico']) ? $input['dodavatel_ico'] : null,
            ':dodavatel_dic' => isset($input['dodavatel_dic']) ? $input['dodavatel_dic'] : null,
            ':dodavatel_zastoupeny' => isset($input['dodavatel_zastoupeny']) ? $input['dodavatel_zastoupeny'] : null,
            ':dodavatel_kontakt_jmeno' => isset($input['dodavatel_kontakt_jmeno']) ? $input['dodavatel_kontakt_jmeno'] : null,
            ':dodavatel_kontakt_email' => isset($input['dodavatel_kontakt_email']) ? $input['dodavatel_kontakt_email'] : null,
            ':dodavatel_kontakt_telefon' => isset($input['dodavatel_kontakt_telefon']) ? $input['dodavatel_kontakt_telefon'] : null,
            ':dt_predpokladany_termin_dodani' => normalizeDatetime(isset($input['dt_predpokladany_termin_dodani']) ? $input['dt_predpokladany_termin_dodani'] : null, false),
            ':misto_dodani' => isset($input['misto_dodani']) ? $input['misto_dodani'] : null,
            ':zaruka' => isset($input['zaruka']) ? $input['zaruka'] : null,
            ':dt_odeslani' => normalizeDatetime(isset($input['dt_odeslani']) ? $input['dt_odeslani'] : null, true),
            ':odeslani_storno_duvod' => isset($input['odeslani_storno_duvod']) ? $input['odeslani_storno_duvod'] : null,
            ':dodavatel_zpusob_potvrzeni' => isset($input['dodavatel_zpusob_potvrzeni']) ? $input['dodavatel_zpusob_potvrzeni'] : null,
            ':dt_akceptace' => normalizeDatetime(isset($input['dt_akceptace']) ? $input['dt_akceptace'] : null, true),
            ':dt_zverejneni' => normalizeDatetime(isset($input['dt_zverejneni']) ? $input['dt_zverejneni'] : null, true),
            ':registr_iddt' => isset($input['registr_iddt']) ? $input['registr_iddt'] : null,
            ':poznamka' => isset($input['poznamka']) ? $input['poznamka'] : null,
            ':zverejnil_id' => isset($input['zverejnil_id']) && !empty($input['zverejnil_id']) ? (int)$input['zverejnil_id'] : null,
            ':potvrdil_vecnou_spravnost_id' => isset($input['potvrdil_vecnou_spravnost_id']) && !empty($input['potvrdil_vecnou_spravnost_id']) ? (int)$input['potvrdil_vecnou_spravnost_id'] : null,
            ':dt_potvrzeni_vecne_spravnosti' => normalizeDatetime(isset($input['dt_potvrzeni_vecne_spravnosti']) ? $input['dt_potvrzeni_vecne_spravnosti'] : null, true),
            ':aktivni' => isset($input['aktivni']) ? (int)$input['aktivni'] : 1,
            // Workflow tracking fields - při update se zachovávají stávající hodnoty nebo se nastavují nové
            ':odesilatel_id' => isset($input['odesilatel_id']) && !empty($input['odesilatel_id']) ? (int)$input['odesilatel_id'] : null,
            ':dodavatel_potvrdil_id' => isset($input['dodavatel_potvrdil_id']) && !empty($input['dodavatel_potvrdil_id']) ? (int)$input['dodavatel_potvrdil_id'] : null,
            ':fakturant_id' => isset($input['fakturant_id']) && !empty($input['fakturant_id']) ? (int)$input['fakturant_id'] : null,
            ':dt_faktura_pridana' => normalizeDatetime(isset($input['dt_faktura_pridana']) ? $input['dt_faktura_pridana'] : null, true),
            ':dokoncil_id' => isset($input['dokoncil_id']) && !empty($input['dokoncil_id']) ? (int)$input['dokoncil_id'] : null,
            ':dt_dokonceni' => normalizeDatetime(isset($input['dt_dokonceni']) ? $input['dt_dokonceni'] : null, true),
            ':dokonceni_poznamka' => isset($input['dokonceni_poznamka']) ? $input['dokonceni_poznamka'] : null,
            ':potvrzeni_dokonceni_objednavky' => isset($input['potvrzeni_dokonceni_objednavky']) ? (int)$input['potvrzeni_dokonceni_objednavky'] : 0,
            ':vecna_spravnost_umisteni_majetku' => isset($input['vecna_spravnost_umisteni_majetku']) ? $input['vecna_spravnost_umisteni_majetku'] : null,
            ':vecna_spravnost_poznamka' => isset($input['vecna_spravnost_poznamka']) ? $input['vecna_spravnost_poznamka'] : null,
            ':potvrzeni_vecne_spravnosti' => isset($input['potvrzeni_vecne_spravnosti']) ? (int)$input['potvrzeni_vecne_spravnosti'] : 0
        ];

        // DEBUG - zaloguj věcnou správnost
        error_log("🔍 VECNA SPRAVNOST UPDATE - Order ID: {$order_id}");
        error_log("  - vecna_spravnost_umisteni_majetku: " . (isset($updateData[':vecna_spravnost_umisteni_majetku']) ? $updateData[':vecna_spravnost_umisteni_majetku'] : 'NULL'));
        error_log("  - vecna_spravnost_poznamka: " . (isset($updateData[':vecna_spravnost_poznamka']) ? $updateData[':vecna_spravnost_poznamka'] : 'NULL'));
        error_log("  - potvrzeni_vecne_spravnosti: " . $updateData[':potvrzeni_vecne_spravnosti']);

        // Update order
        $stmt = $db->prepare(updateOrderByIdQuery());
        $stmt->execute($updateData);

        // ========== ZPRACOVÁNÍ FAKTUR - POZOR! NEMAŽEME KVŮLI PŘÍLOHÁM! ==========
        // ========== ZPRACOVÁNÍ FAKTUR ==========
        // Frontend může poslat pole faktur:
        // - Pokud má faktura id=null nebo chybí → CREATE nové faktury
        // - Pokud má faktura id (number) → UPDATE existující faktury
        // - Přílohy se nespravují tady, jen v invoices25/attachments/*
        
        if (isset($input['faktury']) && is_array($input['faktury'])) {
            $faktury_table = get_invoices_table_name();
            
            foreach ($input['faktury'] as $faktura) {
                $faktura_id = isset($faktura['id']) ? (int)$faktura['id'] : null;
                
                if ($faktura_id === null || $faktura_id === 0) {
                    // ========== CREATE nová faktura ==========
                    $fa_castka = isset($faktura['fa_castka']) ? $faktura['fa_castka'] : null;
                    $fa_cislo_vema = isset($faktura['fa_cislo_vema']) ? trim($faktura['fa_cislo_vema']) : '';
                    
                    if (!$fa_castka || empty($fa_cislo_vema)) {
                        continue; // Přeskoč neplatnou fakturu
                    }
                    
                    // Zpracuj fa_strediska_kod - array → JSON, string → přímo
                    $fa_strediska_value = null;
                    if (isset($faktura['fa_strediska_kod'])) {
                        if (is_array($faktura['fa_strediska_kod'])) {
                            $fa_strediska_value = json_encode($faktura['fa_strediska_kod']);
                        } else {
                            $fa_strediska_value = $faktura['fa_strediska_kod'];
                        }
                    }
                    
                    // Zpracuj rozsirujici_data - array → JSON, string → přímo
                    // FE posílá: rozsirujici_data: { isdoc: {...}, ... }
                    $rozsirujici_value = null;
                    if (isset($faktura['rozsirujici_data'])) {
                        if (is_array($faktura['rozsirujici_data'])) {
                            $rozsirujici_value = json_encode($faktura['rozsirujici_data']);
                        } else {
                            $rozsirujici_value = $faktura['rozsirujici_data'];
                        }
                    }
                    
                    $sql_insert = "INSERT INTO `$faktury_table` (
                        objednavka_id,
                        fa_dorucena,
                        fa_castka,
                        fa_cislo_vema,
                        fa_datum_vystaveni,
                        fa_datum_splatnosti,
                        fa_datum_doruceni,
                        fa_strediska_kod,
                        fa_poznamka,
                        rozsirujici_data,
                        vytvoril_uzivatel_id,
                        dt_vytvoreni,
                        aktivni
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)";
                    
                    $stmt_insert = $db->prepare($sql_insert);
                    $stmt_insert->execute(array(
                        $order_id,
                        isset($faktura['fa_dorucena']) ? (int)$faktura['fa_dorucena'] : 0,
                        $fa_castka,
                        $fa_cislo_vema,
                        isset($faktura['fa_datum_vystaveni']) ? $faktura['fa_datum_vystaveni'] : null,
                        isset($faktura['fa_datum_splatnosti']) ? $faktura['fa_datum_splatnosti'] : null,
                        isset($faktura['fa_datum_doruceni']) ? $faktura['fa_datum_doruceni'] : null,
                        $fa_strediska_value,
                        isset($faktura['fa_poznamka']) ? $faktura['fa_poznamka'] : null,
                        $rozsirujici_value,
                        $current_user_id
                    ));
                    
                } else {
                    // ========== UPDATE existující faktura ==========
                    $update_fields = array();
                    $update_values = array();
                    
                    if (isset($faktura['fa_castka'])) {
                        $update_fields[] = 'fa_castka = ?';
                        $update_values[] = $faktura['fa_castka'];
                    }
                    if (isset($faktura['fa_cislo_vema'])) {
                        $update_fields[] = 'fa_cislo_vema = ?';
                        $update_values[] = trim($faktura['fa_cislo_vema']);
                    }
                    if (isset($faktura['fa_dorucena'])) {
                        $update_fields[] = 'fa_dorucena = ?';
                        $update_values[] = (int)$faktura['fa_dorucena'];
                    }
                    if (isset($faktura['fa_datum_vystaveni'])) {
                        $update_fields[] = 'fa_datum_vystaveni = ?';
                        $update_values[] = $faktura['fa_datum_vystaveni'];
                    }
                    if (isset($faktura['fa_datum_splatnosti'])) {
                        $update_fields[] = 'fa_datum_splatnosti = ?';
                        $update_values[] = $faktura['fa_datum_splatnosti'];
                    }
                    if (isset($faktura['fa_datum_doruceni'])) {
                        $update_fields[] = 'fa_datum_doruceni = ?';
                        $update_values[] = $faktura['fa_datum_doruceni'];
                    }
                    
                    // fa_strediska_kod může být array nebo už JSON string
                    if (isset($faktura['fa_strediska_kod'])) {
                        $update_fields[] = 'fa_strediska_kod = ?';
                        if (is_array($faktura['fa_strediska_kod'])) {
                            $update_values[] = json_encode($faktura['fa_strediska_kod']);
                        } else {
                            // Už je string (pravděpodobně JSON), použij přímo
                            $update_values[] = $faktura['fa_strediska_kod'];
                        }
                    }
                    
                    if (isset($faktura['fa_poznamka'])) {
                        $update_fields[] = 'fa_poznamka = ?';
                        $update_values[] = $faktura['fa_poznamka'];
                    }
                    
                    // rozsirujici_data může být array nebo už JSON string
                    // FE posílá: rozsirujici_data: { isdoc: {...}, ... }
                    if (isset($faktura['rozsirujici_data'])) {
                        $update_fields[] = 'rozsirujici_data = ?';
                        if (is_array($faktura['rozsirujici_data'])) {
                            $update_values[] = json_encode($faktura['rozsirujici_data']);
                        } else {
                            $update_values[] = $faktura['rozsirujici_data'];
                        }
                    }
                    
                    if (!empty($update_fields)) {
                        $update_fields[] = 'dt_aktualizace = NOW()';
                        $update_values[] = $faktura_id;
                        
                        $sql_update = "UPDATE `$faktury_table` SET " . implode(', ', $update_fields) . " WHERE id = ? AND aktivni = 1";
                        
                        // DEBUG: Log SQL a hodnoty
                        error_log("=== FAKTURA UPDATE DEBUG ===");
                        error_log("SQL: " . $sql_update);
                        error_log("VALUES: " . json_encode($update_values));
                        error_log("FAKTURA ID: " . $faktura_id);
                        
                        $stmt_update = $db->prepare($sql_update);
                        $stmt_update->execute($update_values);
                        
                        $affected_rows = $stmt_update->rowCount();
                        error_log("AFFECTED ROWS: " . $affected_rows);
                        
                        if ($affected_rows === 0) {
                            error_log("⚠️ WARNING: Faktura ID=$faktura_id nebyla aktualizována (buď neexistuje nebo není aktivní)");
                        }
                    } else {
                        error_log("⚠️ WARNING: Faktura ID=$faktura_id - žádná pole k updatu!");
                    }
                }
            }
        }

        // ========== ✅ WORKFLOW REFACTORING: Vrátit KOMPLETNÍ záznam po UPDATE ==========
        // Důvod: FE potřebuje všechna pole včetně Fáze 7 a 8 (vecna_spravnost_umisteni_majetku,
        //        vecna_spravnost_poznamka, dokonceni_poznamka) pro synchronizaci s draftem
        // Změna (28.10.2025): Místo částečných dat načítáme celý záznam jako v GET endpoint
        
        // Načtení kompletního záznamu s lock_info a workflow_tracking_info
        $sql = "SELECT o.*, 
                CASE 
                    WHEN o.dt_zamek IS NULL OR o.zamek_uzivatel_id = 0 THEN 'unlocked'
                    WHEN TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) > 15 THEN 'expired'
                    WHEN o.zamek_uzivatel_id = :current_user_id THEN 'owned'
                    ELSE 'locked'
                END as lock_status,
                TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as lock_age_minutes,
                o.zamek_uzivatel_id,
                o.dt_zamek,
                CONCAT(
                    CASE WHEN u_lock.titul_pred IS NOT NULL AND u_lock.titul_pred != '' 
                         THEN CONCAT(u_lock.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_lock.jmeno, 
                    ' ', 
                    u_lock.prijmeni,
                    CASE WHEN u_lock.titul_za IS NOT NULL AND u_lock.titul_za != '' 
                         THEN CONCAT(' ', u_lock.titul_za) 
                         ELSE '' 
                    END
                ) as zamek_uzivatel_jmeno,
                u_lock.titul_pred as zamek_uzivatel_titul_pred,
                u_lock.titul_za as zamek_uzivatel_titul_za,
                u_lock.email as zamek_uzivatel_email,
                u_lock.telefon as zamek_uzivatel_telefon,
                -- Workflow tracking user data
                CONCAT(
                    CASE WHEN u_odesilatel.titul_pred IS NOT NULL AND u_odesilatel.titul_pred != '' 
                         THEN CONCAT(u_odesilatel.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_odesilatel.jmeno, 
                    ' ', 
                    u_odesilatel.prijmeni,
                    CASE WHEN u_odesilatel.titul_za IS NOT NULL AND u_odesilatel.titul_za != '' 
                         THEN CONCAT(' ', u_odesilatel.titul_za) 
                         ELSE '' 
                    END
                ) as odesilatel_jmeno,
                CONCAT(
                    CASE WHEN u_potvrdil.titul_pred IS NOT NULL AND u_potvrdil.titul_pred != '' 
                         THEN CONCAT(u_potvrdil.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_potvrdil.jmeno, 
                    ' ', 
                    u_potvrdil.prijmeni,
                    CASE WHEN u_potvrdil.titul_za IS NOT NULL AND u_potvrdil.titul_za != '' 
                         THEN CONCAT(' ', u_potvrdil.titul_za) 
                         ELSE '' 
                    END
                ) as potvrdil_jmeno,
                CONCAT(
                    CASE WHEN u_fakturant.titul_pred IS NOT NULL AND u_fakturant.titul_pred != '' 
                         THEN CONCAT(u_fakturant.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_fakturant.jmeno, 
                    ' ', 
                    u_fakturant.prijmeni,
                    CASE WHEN u_fakturant.titul_za IS NOT NULL AND u_fakturant.titul_za != '' 
                         THEN CONCAT(' ', u_fakturant.titul_za) 
                         ELSE '' 
                    END
                ) as fakturant_jmeno,
                CONCAT(
                    CASE WHEN u_dokoncil.titul_pred IS NOT NULL AND u_dokoncil.titul_pred != '' 
                         THEN CONCAT(u_dokoncil.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_dokoncil.jmeno, 
                    ' ', 
                    u_dokoncil.prijmeni,
                    CASE WHEN u_dokoncil.titul_za IS NOT NULL AND u_dokoncil.titul_za != '' 
                         THEN CONCAT(' ', u_dokoncil.titul_za) 
                         ELSE '' 
                    END
                ) as dokoncil_jmeno,
                CONCAT(
                    CASE WHEN u_vecna_spravnost.titul_pred IS NOT NULL AND u_vecna_spravnost.titul_pred != '' 
                         THEN CONCAT(u_vecna_spravnost.titul_pred, ' ') 
                         ELSE '' 
                    END,
                    u_vecna_spravnost.jmeno, 
                    ' ', 
                    u_vecna_spravnost.prijmeni,
                    CASE WHEN u_vecna_spravnost.titul_za IS NOT NULL AND u_vecna_spravnost.titul_za != '' 
                         THEN CONCAT(' ', u_vecna_spravnost.titul_za) 
                         ELSE '' 
                    END
                ) as potvrdil_vecnou_spravnost_jmeno
                FROM " . get_orders_table_name() . " o
                LEFT JOIN " . get_users_table_name() . " u_lock ON o.zamek_uzivatel_id = u_lock.id
                LEFT JOIN " . get_users_table_name() . " u_odesilatel ON o.odesilatel_id = u_odesilatel.id
                LEFT JOIN " . get_users_table_name() . " u_potvrdil ON o.dodavatel_potvrdil_id = u_potvrdil.id
                LEFT JOIN " . get_users_table_name() . " u_fakturant ON o.fakturant_id = u_fakturant.id
                LEFT JOIN " . get_users_table_name() . " u_dokoncil ON o.dokoncil_id = u_dokoncil.id
                LEFT JOIN " . get_users_table_name() . " u_vecna_spravnost ON o.potvrdil_vecnou_spravnost_id = u_vecna_spravnost.id
                WHERE o.id = :id AND o.aktivni = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(array('err' => 'Objednávka nebyla nalezena po update'));
            return;
        }

        // Přidání položek k objednávce
        enrichOrderWithItems($db, $order);
        
        // Přidání faktur k objednávce
        enrichOrderWithInvoices($db, $order);
        
        // Přidání enriched číselníků k objednávce
        enrichOrderWithCodebooks($db, $order);
        
        // Sestavení lock_info objektu
        $lock_info = array(
            'locked' => ($order['lock_status'] === 'locked'),
            'locked_by_user_id' => $order['zamek_uzivatel_id'] ? (int)$order['zamek_uzivatel_id'] : null,
            'locked_by_user_fullname' => $order['zamek_uzivatel_jmeno'] ? $order['zamek_uzivatel_jmeno'] : null,
            'locked_by_user_titul_pred' => $order['zamek_uzivatel_titul_pred'] ? $order['zamek_uzivatel_titul_pred'] : null,
            'locked_by_user_titul_za' => $order['zamek_uzivatel_titul_za'] ? $order['zamek_uzivatel_titul_za'] : null,
            'locked_by_user_email' => $order['zamek_uzivatel_email'] ? $order['zamek_uzivatel_email'] : null,
            'locked_by_user_telefon' => $order['zamek_uzivatel_telefon'] ? $order['zamek_uzivatel_telefon'] : null,
            'locked_at' => $order['dt_zamek'],
            'lock_status' => $order['lock_status'],
            'lock_age_minutes' => $order['lock_age_minutes'] !== null ? (int)$order['lock_age_minutes'] : null,
            'is_owned_by_me' => ($order['lock_status'] === 'owned')
        );
        
        // Sestavení workflow_tracking_info objektu
        $workflow_tracking_info = array(
            'odesilatel' => array(
                'user_id' => $order['odesilatel_id'] ? (int)$order['odesilatel_id'] : null,
                'fullname' => $order['odesilatel_jmeno'] ? trim($order['odesilatel_jmeno']) : null,
                'timestamp' => $order['dt_odeslani']
            ),
            'dodavatel_potvrdil' => array(
                'user_id' => $order['dodavatel_potvrdil_id'] ? (int)$order['dodavatel_potvrdil_id'] : null,
                'fullname' => $order['potvrdil_jmeno'] ? trim($order['potvrdil_jmeno']) : null,
                'timestamp' => $order['dt_akceptace']
            ),
            'fakturant' => array(
                'user_id' => $order['fakturant_id'] ? (int)$order['fakturant_id'] : null,
                'fullname' => $order['fakturant_jmeno'] ? trim($order['fakturant_jmeno']) : null,
                'timestamp' => $order['dt_faktura_pridana']
            ),
            'dokoncil' => array(
                'user_id' => $order['dokoncil_id'] ? (int)$order['dokoncil_id'] : null,
                'fullname' => $order['dokoncil_jmeno'] ? trim($order['dokoncil_jmeno']) : null,
                'timestamp' => $order['dt_dokonceni'],
                'note' => $order['dokonceni_poznamka']
            ),
            'potvrdil_vecnou_spravnost' => array(
                'user_id' => $order['potvrdil_vecnou_spravnost_id'] ? (int)$order['potvrdil_vecnou_spravnost_id'] : null,
                'fullname' => $order['potvrdil_vecnou_spravnost_jmeno'] ? trim($order['potvrdil_vecnou_spravnost_jmeno']) : null,
                'timestamp' => $order['dt_potvrzeni_vecne_spravnosti']
            )
        );
        
        // Vyčištění dočasných polí z order objektu
        unset($order['lock_status']);
        unset($order['lock_age_minutes']);
        unset($order['zamek_uzivatel_jmeno']);
        unset($order['zamek_uzivatel_titul_pred']);
        unset($order['zamek_uzivatel_titul_za']);
        unset($order['zamek_uzivatel_email']);
        unset($order['zamek_uzivatel_telefon']);
        unset($order['odesilatel_jmeno']);
        unset($order['potvrdil_jmeno']);
        unset($order['fakturant_jmeno']);
        unset($order['dokoncil_jmeno']);
        unset($order['potvrdil_vecnou_spravnost_jmeno']);
        
        // Přidání lock_info a workflow_tracking_info do order
        $order['lock_info'] = $lock_info;
        $order['workflow_tracking_info'] = $workflow_tracking_info;

        // ✅ Vrátit KOMPLETNÍ záznam (všechna pole včetně Fáze 7 a 8)
        echo json_encode(array(
            'status' => 'ok',
            'data' => $order,
            'message' => 'Objednávka byla úspěšně aktualizována'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při aktualizaci objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_partial_insert($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Nastavit MySQL timezone pro konzistentní datetime handling (NOW() bude v českém čase)
        TimezoneHelper::setMysqlTimezone($db);
        
        $db->beginTransaction();

        // Minimální požadované hodnoty pro částečný insert
        $requiredFields = ['predmet'];
        foreach ($requiredFields as $field) {
            if (!isset($input[$field]) || empty(trim($input[$field]))) {
                http_response_code(400);
                echo json_encode(['err' => 'Chybí povinné pole: ' . $field]);
                return;
            }
        }

        // Pouze zadané hodnoty - ostatní NULL nebo výchozí hodnoty
        // Použít TimezoneHelper pro správný český čas (respektuje letní/zimní čas)
        $current_date = TimezoneHelper::getCzechDateTime('Y-m-d');
        $current_datetime = TimezoneHelper::getCzechDateTime();
        
        $fields = [];
        $values = [];
        $params = [];

        // Vždy přítomné hodnoty
        $fields[] = 'uzivatel_id';
        $values[] = ':uzivatel_id';
        $params[':uzivatel_id'] = $token_data['id'];

        $fields[] = 'uzivatel_akt_id';
        $values[] = ':uzivatel_akt_id';
        $params[':uzivatel_akt_id'] = $token_data['id'];

        $fields[] = 'aktivni';
        $values[] = ':aktivni';
        $params[':aktivni'] = 1;

        // Automaticky zamknout pro aktuálního uživatele
        $fields[] = 'dt_zamek';
        $values[] = ':dt_zamek';
        $params[':dt_zamek'] = $current_datetime;

        $fields[] = 'zamek_uzivatel_id';
        $values[] = ':zamek_uzivatel_id';
        $params[':zamek_uzivatel_id'] = $token_data['id'];

        $fields[] = 'stav_workflow_kod';
        $values[] = ':stav_workflow_kod';
        $params[':stav_workflow_kod'] = isset($input['stav_workflow_kod']) ? $input['stav_workflow_kod'] : 'NOVA';

        $fields[] = 'stav_objednavky';
        $values[] = ':stav_objednavky';
        $params[':stav_objednavky'] = getStavObjednavkyFromWorkflow($db, isset($input['stav_workflow_kod']) ? $input['stav_workflow_kod'] : 'NOVA');

        // Automaticky nastavené datum hodnoty
        $fields[] = 'dt_vytvoreni';
        $values[] = ':dt_vytvoreni';
        $params[':dt_vytvoreni'] = $current_datetime;

        $fields[] = 'dt_aktualizace';
        $values[] = ':dt_aktualizace';
        $params[':dt_aktualizace'] = $current_datetime;

        // Volitelné hodnoty - přidáme pouze pokud jsou zadané a neprázdné
        $optionalFields = [
            'cislo_objednavky', 'dt_objednavky', 'predmet', 'strediska_kod', 'max_cena_s_dph',
            'financovani', 'druh_objednavky_kod', 'garant_uzivatel_id', 'objednatel_id',
            'schvalovatel_id', 'prikazce_id', 'dt_schvaleni', 'schvaleni_komentar',
            'dodavatel_id', 'dodavatel_nazev', 'dodavatel_adresa', 'dodavatel_ico',
            'dodavatel_dic', 'dodavatel_zastoupeny', 'dodavatel_kontakt_jmeno',
            'dodavatel_kontakt_email', 'dodavatel_kontakt_telefon', 
            'dt_predpokladany_termin_dodani', 'misto_dodani', 'zaruka', 'dt_odeslani',
            'odeslani_storno_duvod', 'dodavatel_zpusob_potvrzeni', 'dt_akceptace', 'dt_zverejneni',
            'registr_iddt', 'poznamka',
            // Workflow tracking fields
            'odesilatel_id', 'dodavatel_potvrdil_id', 'fakturant_id', 'dt_faktura_pridana',
            'dokoncil_id', 'dt_dokonceni', 'dokonceni_poznamka', 'potvrzeni_dokonceni_objednavky',
            'zverejnil_id',
            'potvrdil_vecnou_spravnost_id', 'dt_potvrzeni_vecne_spravnosti',
            'vecna_spravnost_umisteni_majetku', 'vecna_spravnost_poznamka', 'potvrzeni_vecne_spravnosti'
        ];

        foreach ($optionalFields as $field) {
            if (isset($input[$field]) && $input[$field] !== '' && $input[$field] !== null) {
                $fields[] = $field;
                $values[] = ':' . $field;
                
                // Speciální zpracování pro některé typy polí
                if ($field === 'financovani' && is_array($input[$field])) {
                    $params[':' . $field] = json_encode($input[$field]);
                } elseif (in_array($field, ['garant_uzivatel_id', 'objednatel_id', 'schvalovatel_id', 'prikazce_id', 'dodavatel_id', 'odesilatel_id', 'dodavatel_potvrdil_id', 'fakturant_id', 'dokoncil_id', 'zverejnil_id', 'potvrdil_vecnou_spravnost_id'])) {
                    $params[':' . $field] = (int)$input[$field];
                } elseif (in_array($field, ['potvrzeni_vecne_spravnosti', 'potvrzeni_dokonceni_objednavky'])) {
                    // Boolean pole - konverze na tinyint(1)
                    $params[':' . $field] = (int)(bool)$input[$field];
                } elseif (strpos($field, 'dt_') === 0) {
                    // Datumová pole - normalizace podle typu
                    $include_time = !in_array($field, ['dt_predpokladany_termin_dodani']); // pouze termín dodání je bez času
                    $params[':' . $field] = normalizeDatetime($input[$field], $include_time);
                } else {
                    $params[':' . $field] = $input[$field];
                }
            }
        }
        
        // Automatické nastavení dt_ polí na současné datum, pokud nejsou zadána
        $dateFields = [
            'dt_objednavky' => $current_datetime,  // s časem
            'dt_predpokladany_termin_dodani' => null  // toto pole necháme NULL pokud není zadáno
        ];
        
        foreach ($dateFields as $field => $defaultValue) {
            if (!isset($input[$field]) || $input[$field] === '' || $input[$field] === null) {
                if ($defaultValue !== null) {  // pouze pokud má být nastavena výchozí hodnota
                    if (!in_array($field, $fields)) { // pouze pokud ještě není přidáno
                        $fields[] = $field;
                        $values[] = ':' . $field;
                        $params[':' . $field] = $defaultValue;
                    }
                }
            }
        }

        // ✅ KRITICKÁ OPRAVA: Číslo objednávky MUSÍ být VŽDY vygenerováno backendem
        // Frontend ho NEPOSÍLÁ, backend ho generuje sám pomocí getNextOrderNumber()
        // NIKDY nemůže být NULL, NIKDY nemůže být FALLBACK-ID
        
        $requested_order_number = isset($input['cislo_objednavky']) && !empty($input['cislo_objednavky']) ? $input['cislo_objednavky'] : null;
        $assigned_order_number = null;  // Iniciálně NULL, ale MUSÍ být vygenerováno
        
        if ($requested_order_number !== null) {
            // Kontrola, zda číslo už existuje (pro případ manuálního zadání z FE)
            $check_stmt = $db->prepare("SELECT COUNT(*) FROM " . get_orders_table_name() . " WHERE cislo_objednavky = :cislo_objednavky");
            $check_stmt->bindParam(':cislo_objednavky', $requested_order_number);
            $check_stmt->execute();
            
            if ($check_stmt->fetchColumn() > 0) {
                // Číslo je obsazené, najdi poslední použité číslo v roce a přičti 1
                $pattern_parts = explode('/', $requested_order_number);
                if (count($pattern_parts) >= 4) {
                    // Format: O-0001/12345678/2025/IT
                    $ico = $pattern_parts[1];
                    $year = $pattern_parts[2];
                    $usek = $pattern_parts[3];
                    
                    // Najdi poslední použité číslo v roce
                    $last_number_stmt = $db->prepare("
                        SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) as last_number 
                        FROM " . get_orders_table_name() . "
                        WHERE cislo_objednavky LIKE 'O-%/" . $ico . "/" . $year . "/" . $usek . "'
                    ");
                    $last_number_stmt->execute();
                    $last_result = $last_number_stmt->fetch();
                    $next_available = (isset($last_result['last_number']) ? $last_result['last_number'] : 0) + 1;
                    
                    $assigned_order_number = 'O-' . sprintf('%04d', $next_available) . '/' . $ico . '/' . $year . '/' . $usek;
                } else {
                    // Pokud formát nesedí, vygeneruj nové číslo (fallback)
                    $requested_order_number = null;
                }
            } else {
                // Číslo je volné, použij ho
                $assigned_order_number = $requested_order_number;
            }
        }
        
        // ✅ KLÍČOVÉ: Pokud číslo NENÍ zadáno NEBO je formát neplatný → VŽDY automaticky vygeneruj
        if ($assigned_order_number === null) {
            try {
                // Získání dalšího čísla v sekvenci
                $stmtNext = $db->prepare("
                    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) + 1 as next_number 
                    FROM " . get_orders_table_name() . "
                    WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(cislo_objednavky, '/', -2), '/', 1) = YEAR(NOW()) AND cislo_objednavky LIKE 'O-%'
                ");
                $stmtNext->execute();
                $nextResult = $stmtNext->fetch();
                
                // Získání organizačních dat uživatele
                $stmtOrg = $db->prepare($queries['uzivatele_org_data_by_username']);
                $stmtOrg->bindParam(':username', $request_username);
                $stmtOrg->execute();
                $org_data = $stmtOrg->fetch();
                
                if ($org_data && $nextResult) {
                    $ico = $org_data['organizace_ico'];
                    $usek_zkr = $org_data['usek_zkr'];
                    $current_year = TimezoneHelper::getCzechDateTime('Y');
                    $formatted_number = sprintf('%04d', $nextResult['next_number']);
                    $assigned_order_number = 'O-' . $formatted_number . '/' . $ico . '/' . $current_year . '/' . $usek_zkr;
                    
                    error_log("✅ Vygenerováno číslo objednávky: {$assigned_order_number}");
                } else {
                    // Fallback POUZE pro případ kritické chyby DB
                    $assigned_order_number = 'O-TEMP-' . time() . '-' . $token_data['id'];
                    error_log("⚠️ WARNING: Použito fallback číslo objednávky: {$assigned_order_number} (chybí org_data nebo next_number)");
                }
            } catch (Exception $e) {
                // Fallback POUZE pro případ kritické chyby
                $assigned_order_number = 'O-TEMP-' . time() . '-' . $token_data['id'];
                error_log("⚠️ ERROR při generování čísla objednávky: " . $e->getMessage());
                error_log("⚠️ Použito fallback číslo: {$assigned_order_number}");
            }
        }
        
        // ✅ GARANTUJEME: $assigned_order_number NIKDY není NULL v tomto bodě
        // Přidání do SQL parametrů (vždy přidej, i když už tam je)
        if (!in_array('cislo_objednavky', $fields)) {
            $fields[] = 'cislo_objednavky';
            $values[] = ':cislo_objednavky';
        }
        $params[':cislo_objednavky'] = $assigned_order_number;

        // Sestavení dynamického SQL dotazu
        $sql = "INSERT INTO " . get_orders_table_name() . " (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $values) . ")";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $order_id = $db->lastInsertId();

        // Zpracování položek objednávky
        $items_processed = 0;
        $items_errors = [];
        
        $order_items = validateAndParseOrderItems($input);
        if ($order_items !== false && !empty($order_items)) {
            if (insertOrderItems($db, $order_id, $order_items)) {
                $items_processed = count($order_items);
            } else {
                $items_errors[] = 'Chyba při ukládání položek objednávky';
            }
        }

        // Načtení aktuálního stavu objednávky z DB
        $stmtState = $db->prepare("SELECT stav_workflow_kod FROM " . get_orders_table_name() . " WHERE id = :id");
        $stmtState->execute([':id' => $order_id]);
        $currentState = $stmtState->fetch(PDO::FETCH_ASSOC);

        $db->commit();

        // ✅ GARANTUJEME: Číslo objednávky VŽDY existuje a je platné
        $responseData = [
            'id' => (int)$order_id,
            'cislo_objednavky' => $assigned_order_number,  // VŽDY vrátit vygenerované číslo
            'inserted_fields' => array_keys($params),
            'items_processed' => $items_processed,
            'stav_workflow_kod' => $currentState ? $currentState['stav_workflow_kod'] : null
        ];
        
        if (!empty($items_errors)) {
            $responseData['items_errors'] = $items_errors;
        }
        
        // Informace o změně čísla (pokud FE poslal jiné číslo, než bylo přiřazeno)
        if ($requested_order_number !== null && $assigned_order_number !== $requested_order_number) {
            $responseData['requested_number'] = $requested_order_number;
            $responseData['number_changed'] = true;
        }

        $successMessage = 'Částečná objednávka byla úspěšně vytvořena s číslem ' . $assigned_order_number;
        if ($items_processed > 0) {
            $successMessage .= " s {$items_processed} položkami";
        }
        if ($requested_order_number !== null && $assigned_order_number !== $requested_order_number) {
            $successMessage .= " (původně požadované číslo {$requested_order_number} bylo obsazené)";
        }
        $successMessage .= ' a zamčena pro editaci';
        
        // Získání údajů uživatele pro lock_info
        $user_data = getUserDataForLockInfo($db, $token_data['id']);

        echo json_encode([
            'status' => 'ok',
            'data' => $responseData,
            'lock_info' => [
                'locked' => false, // ✅ FALSE protože JÁ jsem ji vytvořil
                'locked_by_user_id' => $token_data['id'],
                'locked_by_user_fullname' => $user_data['fullname'],
                'locked_by_user_titul_pred' => $user_data['titul_pred'],
                'locked_by_user_titul_za' => $user_data['titul_za'],
                'locked_by_user_email' => $user_data['email'],
                'locked_by_user_telefon' => $user_data['telefon'],
                'locked_at' => TimezoneHelper::getCzechDateTime(),
                'lock_status' => 'owned',
                'is_owned_by_me' => true // ✅ Nové pole
            ],
            'message' => $successMessage
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při vytváření částečné objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_partial_update($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Nastavit MySQL timezone pro konzistentní datetime handling (NOW() bude v českém čase)
        TimezoneHelper::setMysqlTimezone($db);
        
        $db->beginTransaction();
        $current_user_id = $token_data['id'];

        // Check if order exists and verify lock status
        $stmtLockCheck = $db->prepare(selectOrderByIdForEditQuery());
        $stmtLockCheck->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmtLockCheck->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmtLockCheck->execute();
        $lockInfo = $stmtLockCheck->fetch(PDO::FETCH_ASSOC);

        if (!$lockInfo) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        // Kontrola zámku - PARTIAL UPDATE může provádět pouze vlastník zámku
        if ($lockInfo['lock_status'] === 'locked') {
            http_response_code(423); // 423 Locked
            echo json_encode([
                'err' => 'Objednávka je zamčená jiným uživatelem. Pro editaci použijte endpoint select-for-edit.',
                'lock_info' => [
                    'locked' => true, // ✅ TRUE protože zamčená JINÝM
                    'locked_by_user_id' => (int)$lockInfo['zamek_uzivatel_id'],
                    'locked_by_user_fullname' => isset($lockInfo['locked_by_user_fullname']) ? trim($lockInfo['locked_by_user_fullname']) : '',
                    'locked_at' => $lockInfo['dt_zamek'],
                    'lock_age_minutes' => (int)$lockInfo['lock_age_minutes'],
                    'lock_status' => 'locked',
                    'is_owned_by_me' => false // ✅ Nové pole
                ]
            ]);
            return;
        }

        // Pokud zámek vlastníme nebo je starý, refreshujeme ho
        if ($lockInfo['lock_status'] === 'owned' || $lockInfo['lock_status'] === 'expired' || $lockInfo['lock_status'] === 'unlocked') {
            $refreshStmt = $db->prepare(lockOrderForEditingQuery());
            $refreshStmt->bindParam(':id', $order_id, PDO::PARAM_INT);
            $refreshStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $refreshStmt->execute();
        }

        // Pouze zadané hodnoty budou aktualizovány
        $fields = [];
        $params = [':id' => $order_id];

        // Vždy aktualizujeme uživatele který provádí změnu
        $fields[] = 'uzivatel_akt_id = :uzivatel_akt_id';
        $params[':uzivatel_akt_id'] = $token_data['id'];

        $fields[] = 'dt_aktualizace = NOW()';

        // Volitelné hodnoty - aktualizujeme pouze pokud jsou zadané
        $optionalFields = [
            'cislo_objednavky', 'dt_objednavky', 'predmet', 'strediska_kod', 'max_cena_s_dph',
            'financovani', 'druh_objednavky_kod', 'stav_workflow_kod', 'garant_uzivatel_id', 
            'objednatel_id', 'schvalovatel_id', 'prikazce_id', 'dt_schvaleni', 'schvaleni_komentar',
            'dodavatel_id', 'dodavatel_nazev', 'dodavatel_adresa', 'dodavatel_ico',
            'dodavatel_dic', 'dodavatel_zastoupeny', 'dodavatel_kontakt_jmeno',
            'dodavatel_kontakt_email', 'dodavatel_kontakt_telefon', 
            'dt_predpokladany_termin_dodani', 'misto_dodani', 'zaruka', 'dt_odeslani',
            'odeslani_storno_duvod', 'dodavatel_zpusob_potvrzeni', 'dt_akceptace', 'dt_zverejneni',
            'registr_iddt', 'poznamka',
            'aktivni',
            // Workflow tracking fields
            'odesilatel_id', 'dodavatel_potvrdil_id', 'fakturant_id', 'dt_faktura_pridana',
            'dokoncil_id', 'dt_dokonceni', 'dokonceni_poznamka', 'potvrzeni_dokonceni_objednavky',
            'zverejnil_id', 'potvrdil_vecnou_spravnost_id', 'dt_potvrzeni_vecne_spravnosti',
            'vecna_spravnost_umisteni_majetku', 'vecna_spravnost_poznamka', 'potvrzeni_vecne_spravnosti'
        ];

        $updatedFields = [];
        foreach ($optionalFields as $field) {
            if (array_key_exists($field, $input)) { // Použijeme array_key_exists aby šly i NULL hodnoty
                $fields[] = $field . ' = :' . $field;
                $updatedFields[] = $field;
                
                // Speciální zpracování pro některé typy polí
                if ($field === 'financovani' && is_array($input[$field])) {
                    $params[':' . $field] = json_encode($input[$field]);
                } elseif (in_array($field, ['garant_uzivatel_id', 'objednatel_id', 'schvalovatel_id', 'prikazce_id', 'dodavatel_id', 'odesilatel_id', 'dodavatel_potvrdil_id', 'fakturant_id', 'dokoncil_id', 'zverejnil_id', 'potvrdil_vecnou_spravnost_id'])) {
                    $params[':' . $field] = $input[$field] ? (int)$input[$field] : null;
                } elseif (in_array($field, ['aktivni', 'potvrzeni_vecne_spravnosti', 'potvrzeni_dokonceni_objednavky'])) {
                    $params[':' . $field] = (int)$input[$field];
                } elseif (strpos($field, 'dt_') === 0) {
                    // Datumová pole - normalizace podle typu
                    $include_time = !in_array($field, ['dt_predpokladany_termin_dodani']); // pouze termín dodání je bez času
                    $params[':' . $field] = normalizeDatetime($input[$field], $include_time);
                } else {
                    $params[':' . $field] = $input[$field];
                }
            }
        }

        // Automatické nastavení stav_objednavky pokud se měnil stav_workflow_kod
        if (in_array('stav_workflow_kod', $updatedFields)) {
            $fields[] = 'stav_objednavky = :stav_objednavky';
            $params[':stav_objednavky'] = getStavObjednavkyFromWorkflow($db, $input['stav_workflow_kod']);
        }

        // Zpracování položek objednávky
        $items_processed = 0;
        $items_errors = [];
        $items_updated = false;
        
        // Kontrola, zda jsou v input datech položky k aktualizaci (oba formáty)
        if (array_key_exists('polozky', $input) || array_key_exists('polozky_objednavky', $input)) {
            $order_items = validateAndParseOrderItems($input);
            if ($order_items !== false) {
                // saveOrderItems() nejprve smaže všechny stávající položky, pak vloží nové
                if (saveOrderItems($db, $order_id, $order_items)) {
                    $items_processed = count($order_items);
                    $items_updated = true;
                } else {
                    $items_errors[] = 'Chyba při aktualizaci položek objednávky';
                }
            } else {
                $items_errors[] = 'Nevalidní formát položek objednávky';
            }
        }

        // ========== ZPRACOVÁNÍ FAKTUR ==========
        // Frontend může poslat pole faktur:
        // - Pokud má faktura id=null nebo chybí → CREATE nové faktury
        // - Pokud má faktura id (number) → UPDATE existující faktury
        // - Přílohy se nespravují tady, jen v invoices25/attachments/*
        
        $invoices_processed = 0;
        $invoices_updated = false;
        
        if (isset($input['faktury']) && is_array($input['faktury'])) {
            $faktury_table = get_invoices_table_name();
            
            foreach ($input['faktury'] as $faktura) {
                $faktura_id = isset($faktura['id']) ? (int)$faktura['id'] : null;
                
                if ($faktura_id === null || $faktura_id === 0) {
                    // ========== CREATE nová faktura ==========
                    $fa_castka = isset($faktura['fa_castka']) ? $faktura['fa_castka'] : null;
                    $fa_cislo_vema = isset($faktura['fa_cislo_vema']) ? trim($faktura['fa_cislo_vema']) : '';
                    
                    if (!$fa_castka || empty($fa_cislo_vema)) {
                        continue; // Přeskoč neplatnou fakturu
                    }
                    
                    // Zpracuj fa_strediska_kod - array → JSON, string → přímo
                    $fa_strediska_value = null;
                    if (isset($faktura['fa_strediska_kod'])) {
                        if (is_array($faktura['fa_strediska_kod'])) {
                            $fa_strediska_value = json_encode($faktura['fa_strediska_kod']);
                        } else {
                            $fa_strediska_value = $faktura['fa_strediska_kod'];
                        }
                    }
                    
                    // Zpracuj rozsirujici_data - array → JSON, string → přímo
                    // FE posílá: rozsirujici_data: { isdoc: {...}, ... }
                    $rozsirujici_value = null;
                    if (isset($faktura['rozsirujici_data'])) {
                        if (is_array($faktura['rozsirujici_data'])) {
                            $rozsirujici_value = json_encode($faktura['rozsirujici_data']);
                        } else {
                            $rozsirujici_value = $faktura['rozsirujici_data'];
                        }
                    }
                    
                    $sql_insert = "INSERT INTO `$faktury_table` (
                        objednavka_id,
                        fa_dorucena,
                        fa_castka,
                        fa_cislo_vema,
                        fa_datum_vystaveni,
                        fa_datum_splatnosti,
                        fa_datum_doruceni,
                        fa_strediska_kod,
                        fa_poznamka,
                        rozsirujici_data,
                        vytvoril_uzivatel_id,
                        dt_vytvoreni,
                        aktivni
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)";
                    
                    $stmt_insert = $db->prepare($sql_insert);
                    $stmt_insert->execute(array(
                        $order_id,
                        isset($faktura['fa_dorucena']) ? (int)$faktura['fa_dorucena'] : 0,
                        $fa_castka,
                        $fa_cislo_vema,
                        isset($faktura['fa_datum_vystaveni']) ? $faktura['fa_datum_vystaveni'] : null,
                        isset($faktura['fa_datum_splatnosti']) ? $faktura['fa_datum_splatnosti'] : null,
                        isset($faktura['fa_datum_doruceni']) ? $faktura['fa_datum_doruceni'] : null,
                        $fa_strediska_value,
                        isset($faktura['fa_poznamka']) ? $faktura['fa_poznamka'] : null,
                        $rozsirujici_value,
                        $current_user_id
                    ));
                    
                    $invoices_processed++;
                    $invoices_updated = true;
                    
                } else {
                    // ========== UPDATE existující faktura ==========
                    $update_fields = array();
                    $update_values = array();
                    
                    if (isset($faktura['fa_castka'])) {
                        $update_fields[] = 'fa_castka = ?';
                        $update_values[] = $faktura['fa_castka'];
                    }
                    if (isset($faktura['fa_cislo_vema'])) {
                        $update_fields[] = 'fa_cislo_vema = ?';
                        $update_values[] = trim($faktura['fa_cislo_vema']);
                    }
                    if (isset($faktura['fa_dorucena'])) {
                        $update_fields[] = 'fa_dorucena = ?';
                        $update_values[] = (int)$faktura['fa_dorucena'];
                    }
                    if (isset($faktura['fa_datum_vystaveni'])) {
                        $update_fields[] = 'fa_datum_vystaveni = ?';
                        $update_values[] = $faktura['fa_datum_vystaveni'];
                    }
                    if (isset($faktura['fa_datum_splatnosti'])) {
                        $update_fields[] = 'fa_datum_splatnosti = ?';
                        $update_values[] = $faktura['fa_datum_splatnosti'];
                    }
                    if (isset($faktura['fa_datum_doruceni'])) {
                        $update_fields[] = 'fa_datum_doruceni = ?';
                        $update_values[] = $faktura['fa_datum_doruceni'];
                    }
                    
                    // fa_strediska_kod může být array nebo už JSON string
                    if (isset($faktura['fa_strediska_kod'])) {
                        $update_fields[] = 'fa_strediska_kod = ?';
                        if (is_array($faktura['fa_strediska_kod'])) {
                            $update_values[] = json_encode($faktura['fa_strediska_kod']);
                        } else {
                            // Už je string (pravděpodobně JSON), použij přímo
                            $update_values[] = $faktura['fa_strediska_kod'];
                        }
                    }
                    
                    if (isset($faktura['fa_poznamka'])) {
                        $update_fields[] = 'fa_poznamka = ?';
                        $update_values[] = $faktura['fa_poznamka'];
                    }
                    
                    // rozsirujici_data může být array nebo už JSON string
                    // FE posílá: rozsirujici_data: { isdoc: {...}, ... }
                    if (isset($faktura['rozsirujici_data'])) {
                        $update_fields[] = 'rozsirujici_data = ?';
                        if (is_array($faktura['rozsirujici_data'])) {
                            $update_values[] = json_encode($faktura['rozsirujici_data']);
                        } else {
                            $update_values[] = $faktura['rozsirujici_data'];
                        }
                    }
                    
                    if (!empty($update_fields)) {
                        $update_fields[] = 'dt_aktualizace = NOW()';
                        $update_values[] = $faktura_id;
                        
                        $sql_update = "UPDATE `$faktury_table` SET " . implode(', ', $update_fields) . " WHERE id = ? AND aktivni = 1";
                        
                        // DEBUG: Log SQL a hodnoty
                        error_log("=== FAKTURA UPDATE DEBUG (partial-update) ===");
                        error_log("SQL: " . $sql_update);
                        error_log("VALUES: " . json_encode($update_values));
                        error_log("FAKTURA ID: " . $faktura_id);
                        
                        $stmt_update = $db->prepare($sql_update);
                        $stmt_update->execute($update_values);
                        
                        $affected_rows = $stmt_update->rowCount();
                        error_log("AFFECTED ROWS: " . $affected_rows);
                        
                        if ($affected_rows === 0) {
                            error_log("⚠️ WARNING: Faktura ID=$faktura_id nebyla aktualizována (buď neexistuje nebo není aktivní)");
                        } else {
                            $invoices_processed++;
                            $invoices_updated = true;
                        }
                    } else {
                        error_log("⚠️ WARNING: Faktura ID=$faktura_id - žádná pole k updatu!");
                    }
                }
            }
        }

        // Kontrola, zda byla zadána nějaká pole k aktualizaci (včetně položek)
        if (count($fields) <= 2 && !$items_updated && !$invoices_updated) { // Pouze uzivatel_akt_id a dt_aktualizace
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['err' => 'Nebyla zadána žádná pole ani položky k aktualizaci']);
            return;
        }

        // Sestavení dynamického SQL dotazu pouze pokud jsou pole k aktualizaci
        if (count($fields) > 2) {
            $sql = "UPDATE " . get_orders_table_name() . " SET " . implode(', ', $fields) . " WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }

        // Načtení aktuálního stavu objednávky z DB po update
        $stmtState = $db->prepare("SELECT stav_workflow_kod FROM " . get_orders_table_name() . " WHERE id = :id");
        $stmtState->execute([':id' => $order_id]);
        $currentState = $stmtState->fetch(PDO::FETCH_ASSOC);

        // Načtení vecna_spravnost polí po update
        // VŽDY načteme tyto údaje, protože frontend je potřebuje po UPDATE
        $vecna_spravnost_fields = array(
            'potvrzeni' => null,
            'umisteni' => null,
            'poznamka' => null,
            'user_id' => null,
            'dt' => null
        );
        
        // Detekce, zda byla vecna_spravnost pole aktualizována
        $vecna_spravnost_updated = false;
        $vecna_spravnost_field_names = array(
            'potvrzeni_vecne_spravnosti',
            'vecna_spravnost_umisteni_majetku',
            'vecna_spravnost_poznamka',
            'potvrdil_vecnou_spravnost_id',
            'dt_potvrzeni_vecne_spravnosti'
        );
        
        error_log("=== DETEKCE VECNA_SPRAVNOST UPDATE ===");
        error_log("UPDATED FIELDS: " . json_encode($updatedFields));
        
        foreach ($updatedFields as $field) {
            if (in_array($field, $vecna_spravnost_field_names)) {
                $vecna_spravnost_updated = true;
                error_log("✅ NALEZENO VECNA_SPRAVNOST POLE: " . $field);
                break;
            }
        }
        
        error_log("VECNA_SPRAVNOST_UPDATED: " . ($vecna_spravnost_updated ? 'TRUE' : 'FALSE'));
        
        // VŽDY načteme vecna_spravnost pole z DB pro vrácení frontendu
        // (nejen když se aktualizovala, ale vždy aby frontend měl aktuální stav)
        error_log("=== NAČÍTÁM VECNA_SPRAVNOST POLE Z DB ===");
        $stmtVS = $db->prepare("
            SELECT 
                potvrzeni_vecne_spravnosti,
                vecna_spravnost_umisteni_majetku,
                vecna_spravnost_poznamka,
                potvrdil_vecnou_spravnost_id,
                dt_potvrzeni_vecne_spravnosti
            FROM " . get_orders_table_name() . " 
            WHERE id = :id
        ");
        $stmtVS->execute([':id' => $order_id]);
        $vsData = $stmtVS->fetch(PDO::FETCH_ASSOC);
        
        error_log("VECNA_SPRAVNOST Z DB (raw): " . json_encode($vsData));
        
        if ($vsData) {
            $vecna_spravnost_fields = array(
                'potvrzeni' => isset($vsData['potvrzeni_vecne_spravnosti']) ? (int)$vsData['potvrzeni_vecne_spravnosti'] : null,
                'umisteni' => isset($vsData['vecna_spravnost_umisteni_majetku']) ? $vsData['vecna_spravnost_umisteni_majetku'] : null,
                'poznamka' => isset($vsData['vecna_spravnost_poznamka']) ? $vsData['vecna_spravnost_poznamka'] : null,
                'user_id' => isset($vsData['potvrdil_vecnou_spravnost_id']) ? (int)$vsData['potvrdil_vecnou_spravnost_id'] : null,
                'dt' => isset($vsData['dt_potvrzeni_vecne_spravnosti']) ? $vsData['dt_potvrzeni_vecne_spravnosti'] : null
            );
            error_log("VECNA_SPRAVNOST_FIELDS PRO FRONTEND (zpracované): " . json_encode($vecna_spravnost_fields));
        } else {
            error_log("⚠️ WARNING: Nepodařilo se načíst vecna_spravnost data z DB!");
        }

        // Načtení aktuálních faktur pro response (pokud byly zpracovány)
        $faktury_updated_data = array();
        if ($invoices_updated) {
            $faktury_table = get_invoices_table_name();
            $sql_faktury = "SELECT * FROM `$faktury_table` WHERE objednavka_id = ? AND aktivni = 1 ORDER BY dt_vytvoreni DESC";
            $stmt_faktury = $db->prepare($sql_faktury);
            $stmt_faktury->execute(array($order_id));
            $faktury_updated_data = $stmt_faktury->fetchAll(PDO::FETCH_ASSOC);
        }

        $db->commit();

        $responseData = [
            'id' => $order_id,
            'updated_fields' => $updatedFields,
            'items_processed' => $items_processed,
            'items_updated' => $items_updated,
            'invoices_processed' => $invoices_processed,
            'invoices_updated' => $invoices_updated,
            'stav_workflow_kod' => $currentState ? $currentState['stav_workflow_kod'] : null,
            'vecna_spravnost_fields' => $vecna_spravnost_fields
        ];
        
        // Přidej faktury do response, pokud byly aktualizovány
        if (!empty($faktury_updated_data)) {
            $responseData['faktury'] = $faktury_updated_data;
            $responseData['faktury_count'] = count($faktury_updated_data);
        }
        
        if (!empty($items_errors)) {
            $responseData['items_errors'] = $items_errors;
        }

        $successMessage = 'Objednávka byla částečně aktualizována';
        if ($items_updated) {
            $successMessage .= " včetně {$items_processed} položek";
        }
        if ($invoices_updated) {
            $successMessage .= " a {$invoices_processed} faktur";
        }

        $finalResponse = [
            'status' => 'ok',
            'data' => $responseData,
            'message' => $successMessage
        ];
        
        error_log("=== FINÁLNÍ RESPONSE PRO FRONTEND ===");
        error_log("VECNA_SPRAVNOST_FIELDS V RESPONSE: " . json_encode($finalResponse['data']['vecna_spravnost_fields']));
        error_log("CELÝ RESPONSE: " . json_encode($finalResponse));
        
        echo json_encode($finalResponse);
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při částečné aktualizaci objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_delete($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $db->beginTransaction();

        // Check if order exists
        $stmtCheck = $db->prepare(checkOrderExistsQuery());
        $stmtCheck->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmtCheck->execute();
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        // ========== KOMPLETNÍ MAZÁNÍ OBJEDNÁVKY + VŠECH NAVÁZANÝCH DAT ==========
        
        // 1. Get ORDER attachment file paths for deletion from disk
        $stmtPaths = $db->prepare(selectAttachmentPathsForDeletionQuery());
        $stmtPaths->bindParam(':objednavka_id', $order_id, PDO::PARAM_INT);
        $stmtPaths->execute();
        $orderFilePaths = $stmtPaths->fetchAll(PDO::FETCH_COLUMN);

        // 2. Get INVOICE attachment file paths for deletion from disk (před smazáním faktur!)
        $invoiceFilePaths = array();
        try {
            $stmtInvPaths = $db->prepare("
                SELECT fp.systemova_cesta 
                FROM 25a_faktury_prilohy fp
                INNER JOIN 25a_objednavky_faktury f ON fp.faktura_id = f.id
                WHERE f.objednavka_id = :objednavka_id
            ");
            $stmtInvPaths->bindParam(':objednavka_id', $order_id, PDO::PARAM_INT);
            $stmtInvPaths->execute();
            $invoiceFilePaths = $stmtInvPaths->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) {
            // Tabulka možná neexistuje - pokračujeme bez chyby
            error_log("Warning: Could not fetch invoice attachments for deletion: " . $e->getMessage());
        }

        // 3. Delete ORDER attachments from database
        $stmtDelAtt = $db->prepare(deleteOrderAttachmentsByOrderIdQuery());
        $stmtDelAtt->bindParam(':objednavka_id', $order_id, PDO::PARAM_INT);
        $stmtDelAtt->execute();

        // 4. Delete INVOICE attachments from database (CASCADE od faktur to nesmaže soubory!)
        try {
            $stmtDelInvAtt = $db->prepare("
                DELETE fp FROM 25a_faktury_prilohy fp
                INNER JOIN 25a_objednavky_faktury f ON fp.faktura_id = f.id
                WHERE f.objednavka_id = :objednavka_id
            ");
            $stmtDelInvAtt->bindParam(':objednavka_id', $order_id, PDO::PARAM_INT);
            $stmtDelInvAtt->execute();
        } catch (Exception $e) {
            // Tabulka možná neexistuje - pokračujeme bez chyby
            error_log("Warning: Could not delete invoice attachments: " . $e->getMessage());
        }

        // 5. Delete INVOICES from database (CASCADE smaže faktury, ale NE soubory!)
        try {
            $faktury_table = get_invoices_table_name();
            $stmtDelInv = $db->prepare("DELETE FROM `$faktury_table` WHERE objednavka_id = ?");
            $stmtDelInv->execute([$order_id]);
        } catch (Exception $e) {
            // Tabulka možná neexistuje - pokračujeme bez chyby
            error_log("Warning: Could not delete invoices: " . $e->getMessage());
        }

        // 6. Delete ORDER ITEMS from database
        $stmtDelItems = $db->prepare(deleteOrderItemsByOrderIdQuery());
        $stmtDelItems->bindParam(':objednavka_id', $order_id, PDO::PARAM_INT);
        $stmtDelItems->execute();

        // 7. Delete ORDER from database
        $stmtDelOrder = $db->prepare(deleteOrderByIdQuery());
        $stmtDelOrder->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmtDelOrder->execute();

        $db->commit();

        // ========== MAZÁNÍ SOUBORŮ Z DISKU (po úspěšném DB commitu) ==========
        $deletedFiles = 0;
        $failedFiles = [];
        
        // Smaž přílohy OBJEDNÁVKY
        foreach ($orderFilePaths as $filePath) {
            if (!empty($filePath) && file_exists($filePath)) {
                if (unlink($filePath)) {
                    $deletedFiles++;
                } else {
                    $failedFiles[] = $filePath;
                }
            }
        }
        
        // Smaž přílohy FAKTUR
        foreach ($invoiceFilePaths as $filePath) {
            if (!empty($filePath) && file_exists($filePath)) {
                if (unlink($filePath)) {
                    $deletedFiles++;
                } else {
                    $failedFiles[] = $filePath;
                }
            }
        }

        echo json_encode([
            'status' => 'ok',
            'message' => 'Objednávka včetně všech faktur, položek a příloh byla úspěšně smazána',
            'data' => [
                'order_attachments_deleted' => count($orderFilePaths),
                'invoice_attachments_deleted' => count($invoiceFilePaths),
                'files_deleted' => $deletedFiles,
                'files_failed' => count($failedFiles)
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při mazání objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_soft_delete($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $db->beginTransaction();

        // Zkontrolovat, zda objednávka existuje (včetně deaktivovaných)
        $checkStmt = $db->prepare(selectOrderByIdIncludingInactiveQuery());
        $checkStmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $checkStmt->execute();
        $order = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        // Zkontrolovat, zda už není soft-deleted
        if ($order['aktivni'] == 0) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['err' => 'Objednávka je již deaktivována']);
            return;
        }

        // Soft delete - nastavit aktivni = 0 a aktualizovat datum
        $softDeleteStmt = $db->prepare("UPDATE " . get_orders_table_name() . " 
                                        SET aktivni = 0, 
                                            dt_aktualizace = NOW(),
                                            uzivatel_akt_id = :uzivatel_akt_id
                                        WHERE id = :id");
        $softDeleteStmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $softDeleteStmt->bindParam(':uzivatel_akt_id', $token_data['id'], PDO::PARAM_INT);
        $softDeleteStmt->execute();

        $db->commit();

        echo json_encode([
            'status' => 'ok',
            'message' => 'Objednávka byla úspěšně deaktivována',
            'data' => [
                'id' => $order_id,
                'aktivni' => 0,
                'deaktivovano_uzivatelem' => $token_data['id']
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při deaktivaci objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_restore($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $db->beginTransaction();

        // Zkontrolovat, zda objednávka existuje (včetně deaktivovaných)
        $checkStmt = $db->prepare(selectOrderByIdIncludingInactiveQuery());
        $checkStmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $checkStmt->execute();
        $order = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        // Zkontrolovat, zda je deaktivovaná
        if ($order['aktivni'] == 1) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['err' => 'Objednávka je již aktivní']);
            return;
        }

        // Restore - nastavit aktivni = 1 a aktualizovat datum
        $restoreStmt = $db->prepare("UPDATE " . get_orders_table_name() . " 
                                     SET aktivni = 1, 
                                         dt_aktualizace = NOW(),
                                         uzivatel_akt_id = :uzivatel_akt_id
                                     WHERE id = :id");
        $restoreStmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $restoreStmt->bindParam(':uzivatel_akt_id', $token_data['id'], PDO::PARAM_INT);
        $restoreStmt->execute();

        $db->commit();

        echo json_encode([
            'status' => 'ok',
            'message' => 'Objednávka byla úspěšně obnovena',
            'data' => [
                'id' => $order_id,
                'aktivni' => 1,
                'obnoveno_uzivatelem' => $token_data['id']
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při obnově objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_next_number($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Update last activity for the authenticated user
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id']);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal
        }
        
        // Get last used order number for new table (25a_objednavky)
        $stmt = $db->prepare("
            SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) as last_used_number 
            FROM " . get_orders_table_name() . "
            WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(cislo_objednavky, '/', -2), '/', 1) = YEAR(NOW()) AND cislo_objednavky LIKE 'O-%'
        ");
        $stmt->execute();
        $result = $stmt->fetch();
        $last_used_number = $result['last_used_number'];
        
        // Next number to use will be last_used + 1
        $next_number = $last_used_number + 1;
        
        // Get user org data
        $stmtOrg = $db->prepare($queries['uzivatele_org_data_by_username']);
        $stmtOrg->bindParam(':username', $request_username);
        $stmtOrg->execute();
        $org_data = $stmtOrg->fetch();
        
        if (!$org_data) {
            http_response_code(404);
            echo json_encode(['err' => 'Uživatel nenalezen nebo nemá přiřazenou organizaci/úsek']);
            return;
        }
        
        $ico = $org_data['organizace_ico'];
        $usek_zkr = $org_data['usek_zkr'];
        $current_year = TimezoneHelper::getCzechDateTime('Y');
        
        // Format numbers with leading zeros to 4 digits
        $formatted_last_used = sprintf('%04d', $last_used_number);
        $formatted_next = sprintf('%04d', $next_number);
        
        // Compose order number strings in format O-cislo/ICO/ROK/usekZKRatka
        $last_used_order_string = 'O-' . $formatted_last_used . '/' . $ico . '/' . $current_year . '/' . $usek_zkr;
        $next_order_string = 'O-' . $formatted_next . '/' . $ico . '/' . $current_year . '/' . $usek_zkr;
        
        echo json_encode([
            'status' => 'ok',
            'data' => [
                'last_used_number' => $last_used_number,
                'next_number' => $next_number,
                'formatted_last_used' => $formatted_last_used,
                'formatted_next' => $formatted_next,
                'ico' => $ico,
                'usek_zkr' => $usek_zkr,
                'current_year' => $current_year,
                'last_used_order_string' => $last_used_order_string,
                'next_order_string' => $next_order_string,
                'order_number_string' => $next_order_string, // FE potřebuje NEXT volné číslo pro formulář
                'note' => 'order_number_string = posledně použité číslo, pro další insert použij next_order_string'
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při získávání dalšího čísla objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_check_number($input, $config, $queries) {
    // Validate token & username
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $orderNumber = null;
    
    // Accept either root key orderNumber or inside payload for flexibility
    if (isset($input['orderNumber'])) {
        $orderNumber = trim($input['orderNumber']);
    } elseif (isset($input['payload']['orderNumber'])) {
        $orderNumber = trim($input['payload']['orderNumber']);
    }
    
    $suggest = false;
    if (isset($input['suggest'])) {
        $suggest = (bool)$input['suggest'];
    } elseif (isset($input['payload']['suggest'])) {
        $suggest = (bool)$input['payload']['suggest'];
    }

    if (!$token || !$request_username) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí token nebo username']);
        return;
    }
    
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token nebo username']);
        return;
    }
    
    if (!$orderNumber) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí orderNumber']);
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Check if order number exists in new table (25a_objednavky)
        $stmt = $db->prepare("SELECT id, objednatel_id FROM " . get_orders_table_name() . " WHERE cislo_objednavky = :cislo_objednavky LIMIT 1");
        $stmt->execute([':cislo_objednavky' => $orderNumber]);
        $exists = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $canUse = $exists ? false : true;
        
        $response = [
            'status' => 'ok',
            'data' => [
                'orderNumber' => $orderNumber,
                'exists' => (bool)$exists,
                'canUse' => $canUse
            ]
        ];
        
        if ($exists) {
            $response['data']['existing_order'] = [
                'id' => (int)$exists['id'],
                'objednatel_id' => (int)$exists['objednatel_id']
            ];
        }
        
        // If suggest=true and number is taken, suggest next available
        if (!$canUse && $suggest) {
            // Call next_number logic to get suggestion
            $stmtNext = $db->prepare("
                SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) + 1 as next_number 
                FROM " . get_orders_table_name() . "
                WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(cislo_objednavky, '/', -2), '/', 1) = YEAR(NOW()) AND cislo_objednavky LIKE 'O-%'
            ");
            $stmtNext->execute();
            $nextResult = $stmtNext->fetch();
            
            if ($nextResult) {
                // Get user org data for suggestion
                $stmtOrg = $db->prepare($queries['uzivatele_org_data_by_username']);
                $stmtOrg->bindParam(':username', $request_username);
                $stmtOrg->execute();
                $org_data = $stmtOrg->fetch();
                
                if ($org_data) {
                    $ico = $org_data['organizace_ico'];
                    $usek_zkr = $org_data['usek_zkr'];
                    $current_year = TimezoneHelper::getCzechDateTime('Y');
                    $formatted_number = sprintf('%04d', $nextResult['next_number']);
                    $suggested_number = 'O-' . $formatted_number . '/' . $ico . '/' . $current_year . '/' . $usek_zkr;
                    
                    $response['data']['suggestion'] = $suggested_number;
                }
            }
        }
        
        echo json_encode($response);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při kontrole čísla objednávky: ' . $e->getMessage()]);
    }
}

// ========== STATES HANDLERS (25_ciselnik_stavy) ==========

function handle_states25_by_id($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $state_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($state_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID stavu']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný filtr podle aktivni (0 nebo 1)
        $aktivni = isset($input['aktivni']) ? (int)$input['aktivni'] : null;
        
        // Select state by ID s volitelným filtrem aktivni
        if ($aktivni !== null) {
            $sql = "SELECT * FROM " . get_states_table_name() . " WHERE id = :id AND aktivni = :aktivni";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':id', $state_id, PDO::PARAM_INT);
            $stmt->bindParam(':aktivni', $aktivni, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare(selectStateByIdQuery());
            $stmt->bindParam(':id', $state_id, PDO::PARAM_INT);
        }
        
        $stmt->execute();
        $state = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$state) {
            http_response_code(404);
            echo json_encode(['err' => 'Stav nebyl nalezen']);
            return;
        }

        echo json_encode([
            'status' => 'ok',
            'data' => $state
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání stavu: ' . $e->getMessage()]);
    }
}

function handle_states25_by_type_and_code($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $typ_objektu = isset($input['typ_objektu']) ? $input['typ_objektu'] : '';
    $kod_stavu = isset($input['kod_stavu']) ? $input['kod_stavu'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if (!$typ_objektu || !$kod_stavu) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí typ_objektu nebo kod_stavu']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný filtr podle aktivni (0 nebo 1)
        $aktivni = isset($input['aktivni']) ? (int)$input['aktivni'] : null;
        
        // Select states by object type and state code s volitelným filtrem aktivni
        if ($aktivni !== null) {
            $sql = "SELECT * FROM " . get_states_table_name() . " WHERE typ_objektu = :typ_objektu AND kod_stavu = :kod_stavu AND aktivni = :aktivni";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':typ_objektu', $typ_objektu, PDO::PARAM_STR);
            $stmt->bindParam(':kod_stavu', $kod_stavu, PDO::PARAM_STR);
            $stmt->bindParam(':aktivni', $aktivni, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare(selectStatesByTypeAndCodeQuery());
            $stmt->bindParam(':typ_objektu', $typ_objektu, PDO::PARAM_STR);
            $stmt->bindParam(':kod_stavu', $kod_stavu, PDO::PARAM_STR);
        }
        
        $stmt->execute();
        $states = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'status' => 'ok',
            'data' => $states
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání stavů: ' . $e->getMessage()]);
    }
}

function handle_states25_by_parent_code($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $nadrazeny_kod_stavu = isset($input['nadrazeny_kod_stavu']) ? $input['nadrazeny_kod_stavu'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if (!$nadrazeny_kod_stavu) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí nadrazeny_kod_stavu']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný filtr podle aktivni (0 nebo 1)
        $aktivni = isset($input['aktivni']) ? (int)$input['aktivni'] : null;
        
        // Select states by parent state code s volitelným filtrem aktivni
        if ($aktivni !== null) {
            $sql = "SELECT * FROM " . get_states_table_name() . " WHERE nadrazeny_kod_stavu = :nadrazeny_kod_stavu AND aktivni = :aktivni";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':nadrazeny_kod_stavu', $nadrazeny_kod_stavu, PDO::PARAM_STR);
            $stmt->bindParam(':aktivni', $aktivni, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare(selectStatesByParentCodeQuery());
            $stmt->bindParam(':nadrazeny_kod_stavu', $nadrazeny_kod_stavu, PDO::PARAM_STR);
        }
        
        $stmt->execute();
        $states = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'status' => 'ok',
            'data' => $states
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání stavů podle nadřazeného kódu: ' . $e->getMessage()]);
    }
}

function handle_states25_by_object_type($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $typ_objektu = isset($input['typ_objektu']) ? $input['typ_objektu'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if (!$typ_objektu) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí typ_objektu']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný filtr podle aktivni (0 nebo 1)
        $aktivni = isset($input['aktivni']) ? (int)$input['aktivni'] : null;
        
        // Select all states by object type s volitelným filtrem aktivni
        if ($aktivni !== null) {
            $sql = "SELECT * FROM " . get_states_table_name() . " WHERE typ_objektu = :typ_objektu AND aktivni = :aktivni ORDER BY nazev_stavu";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':typ_objektu', $typ_objektu, PDO::PARAM_STR);
            $stmt->bindParam(':aktivni', $aktivni, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare(selectStatesByObjectTypeQuery());
            $stmt->bindParam(':typ_objektu', $typ_objektu, PDO::PARAM_STR);
        }
        
        $stmt->execute();
        $states = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'status' => 'ok',
            'data' => $states
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání stavů podle typu objektu: ' . $e->getMessage()]);
    }
}

function handle_states25_list($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Volitelný filtr podle aktivni (0 nebo 1)
        $aktivni = isset($input['aktivni']) ? (int)$input['aktivni'] : null;
        
        // Select all states s volitelným filtrem aktivni
        if ($aktivni !== null) {
            $sql = "SELECT * FROM " . get_states_table_name() . " WHERE aktivni = :aktivni ORDER BY typ_objektu, nazev_stavu";
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':aktivni', $aktivni, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare(selectAllStatesQuery());
        }
        
        $stmt->execute();
        $states = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'status' => 'ok',
            'data' => $states
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání všech stavů: ' . $e->getMessage()]);
    }
}

// ========== LOCK MANAGEMENT HANDLERS ==========

/**
 * Handler pro SELECT objednávky s automatickým zamčením pro editaci
 * Endpoint: orders25/select-for-edit
 */
function handle_orders25_select_for_edit($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Nejdřív zkontrolujeme stav zámku
        $stmt = $db->prepare(selectOrderByIdForEditQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        $lock_status = $order['lock_status'];
        
        // Rozhodnutí na základě stavu zámku
        switch ($lock_status) {
            case 'unlocked':
            case 'expired':
                // Můžeme zamknout - objednávka není zamčená nebo zámek vypršel
                $lock_stmt = $db->prepare(lockOrderForEditingQuery());
                $lock_stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
                $lock_stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
                $lock_stmt->execute();
                
                // Načteme objednávku znovu s aktuálním zámkem
                $stmt->execute();
                $order = $stmt->fetch(PDO::FETCH_ASSOC);
                break;
                
            case 'owned':
                // Zámek už vlastníme - jen refreshujeme čas
                $refresh_stmt = $db->prepare(refreshLockQuery());
                $refresh_stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
                $refresh_stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
                $refresh_stmt->execute();
                
                // Načteme objednávku znovu s aktualizovaným zámkem
                $stmt->execute();
                $order = $stmt->fetch(PDO::FETCH_ASSOC);
                break;
                
            case 'locked':
                // Objednávka je zamčená jiným uživatelem
                http_response_code(423); // 423 Locked
                echo json_encode([
                    'err' => 'Objednávka je právě editována jiným uživatelem',
                    'lock_info' => [
                        'locked' => true, // ✅ TRUE protože zamčená JINÝM
                        'locked_by_user_id' => (int)$order['zamek_uzivatel_id'],
                        'locked_by_user_fullname' => isset($order['locked_by_user_fullname']) ? trim($order['locked_by_user_fullname']) : '',
                        'locked_at' => $order['dt_zamek'],
                        'lock_age_minutes' => (int)$order['lock_age_minutes'],
                        'lock_status' => 'locked',
                        'is_owned_by_me' => false // ✅ Nové pole
                    ]
                ]);
                return;
        }

        // Přidání položek k objednávce
        enrichOrderWithItems($db, $order);
        
        // Přidání faktur k objednávce
        enrichOrderWithInvoices($db, $order);
        
        // Získání údajů aktuálního uživatele pro lock_info
        $user_data = getUserDataForLockInfo($db, $current_user_id);

        echo json_encode([
            'status' => 'ok',
            'data' => $order,
            'lock_info' => [
                'locked' => false, // ✅ FALSE protože JÁ vlastním zámek
                'locked_by_user_id' => $current_user_id,
                'locked_by_user_fullname' => $user_data['fullname'],
                'locked_by_user_titul_pred' => $user_data['titul_pred'],
                'locked_by_user_titul_za' => $user_data['titul_za'],
                'locked_by_user_email' => $user_data['email'],
                'locked_by_user_telefon' => $user_data['telefon'],
                'locked_at' => $order['dt_zamek'],
                'lock_status' => 'owned',
                'is_owned_by_me' => true // ✅ Nové pole
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání objednávky pro editaci: ' . $e->getMessage()]);
    }
}

/**
 * Handler pro zamčení objednávky
 * Endpoint: orders25/lock
 */
function handle_orders25_lock($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Načteme objednávku s lock informacemi
        $stmt = $db->prepare(selectOrderByIdForEditQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        // Kontrola stavu zámku
        if ($order['lock_status'] === 'locked') {
            // Objednávka je již zamčená jiným uživatelem
            http_response_code(423); // 423 Locked
            echo json_encode([
                'err' => 'Objednávka je již zamčená jiným uživatelem',
                'lock_info' => [
                    'locked' => true, // ✅ TRUE protože zamčená JINÝM
                    'locked_by_user_id' => (int)$order['zamek_uzivatel_id'],
                    'locked_by_user_fullname' => $order['locked_by_user_fullname'],
                    'locked_by_user_titul_pred' => isset($order['locked_by_user_titul_pred']) ? $order['locked_by_user_titul_pred'] : null,
                    'locked_by_user_titul_za' => isset($order['locked_by_user_titul_za']) ? $order['locked_by_user_titul_za'] : null,
                    'locked_by_user_email' => isset($order['locked_by_user_email']) ? $order['locked_by_user_email'] : null,
                    'locked_by_user_telefon' => isset($order['locked_by_user_telefon']) ? $order['locked_by_user_telefon'] : null,
                    'locked_at' => $order['dt_zamek'],
                    'lock_status' => 'locked',
                    'is_owned_by_me' => false // ✅ Nové pole
                ]
            ]);
            return;
        }

        if ($order['lock_status'] === 'owned') {
            // Uživatel již vlastní zámek - refresh lock timestamp
            $lock_stmt = $db->prepare(lockOrderQuery());
            $lock_stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
            $lock_stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $lock_stmt->execute();
            
            echo json_encode([
                'status' => 'ok',
                'message' => 'Zámek byl obnoven',
                'lock_info' => [
                    'locked' => false, // ✅ FALSE protože JÁ vlastním zámek
                    'locked_by_user_id' => $current_user_id,
                    'locked_by_user_fullname' => $order['locked_by_user_fullname'],
                    'locked_by_user_titul_pred' => isset($order['locked_by_user_titul_pred']) ? $order['locked_by_user_titul_pred'] : null,
                    'locked_by_user_titul_za' => isset($order['locked_by_user_titul_za']) ? $order['locked_by_user_titul_za'] : null,
                    'locked_by_user_email' => isset($order['locked_by_user_email']) ? $order['locked_by_user_email'] : null,
                    'locked_by_user_telefon' => isset($order['locked_by_user_telefon']) ? $order['locked_by_user_telefon'] : null,
                    'locked_at' => TimezoneHelper::getCzechDateTime(),
                    'lock_status' => 'owned',
                    'is_owned_by_me' => true // ✅ Nové pole
                ]
            ]);
            return;
        }

        // Objednávka je volná - zamknout ji
        $lock_stmt = $db->prepare(lockOrderQuery());
        $lock_stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $lock_stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $lock_stmt->execute();

        // Získání údajů uživatele pro response
        $user_data = getUserDataForLockInfo($db, $current_user_id);

        echo json_encode([
            'status' => 'ok',
            'message' => 'Objednávka byla úspěšně zamčena',
            'lock_info' => [
                'locked' => false, // ✅ FALSE protože JÁ jsem ji zamknul
                'locked_by_user_id' => $current_user_id,
                'locked_by_user_fullname' => $user_data['fullname'],
                'locked_by_user_titul_pred' => $user_data['titul_pred'],
                'locked_by_user_titul_za' => $user_data['titul_za'],
                'locked_by_user_email' => $user_data['email'],
                'locked_by_user_telefon' => $user_data['telefon'],
                'locked_at' => TimezoneHelper::getCzechDateTime(),
                'lock_status' => 'owned',
                'is_owned_by_me' => true // ✅ Nové pole
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při zamykání objednávky: ' . $e->getMessage()]);
    }
}

/**
 * Handler pro odemčení objednávky
 * Endpoint: orders25/unlock
 */
function handle_orders25_unlock($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $force_unlock = isset($input['force']) ? (bool)$input['force'] : false;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Načteme objednávku s lock informacemi a oprávněními
        $stmt = $db->prepare(selectOrderByIdForEditQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }

        // Kontrola oprávnění k odemčení
        $can_unlock = false;
        $unlock_reason = '';
        
        // Force unlock - pouze pro SUPERADMIN (FE kontroluje a posílá force=true)
        if ($force_unlock) {
            $can_unlock = true;
            $unlock_reason = 'force_unlock';
        } else if ($order['lock_status'] !== 'locked') {
            // Objednávka není zamčená, může odemknout kdokoliv kdo má přístup
            $can_unlock = true;
            $unlock_reason = 'not_locked';
        } else if ($order['zamek_uzivatel_id'] == $current_user_id) {
            // Vlastník zámku může vždy odemknout
            $can_unlock = true;
            $unlock_reason = 'owner';
        } else if ($order['objednatel_id'] == $current_user_id || $order['garant_uzivatel_id'] == $current_user_id) {
            // Objednatel nebo garant může odemknout i zámek jiného uživatele
            $can_unlock = true;
            $unlock_reason = 'objednatel_or_garant';
        }
        
        if (!$can_unlock) {
            http_response_code(403);
            echo json_encode(['err' => 'Nemáte oprávnění k odemknutí objednávky']);
            return;
        }

        // Odemčení objednávky
        $unlock_stmt = $db->prepare(unlockOrderQuery());
        $unlock_stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $unlock_stmt->execute();

        $response = [
            'status' => 'ok',
            'message' => 'Objednávka byla úspěšně odemčena'
        ];
        
        // Přidej info o důvodu odemčení (pro debugging/audit)
        if ($force_unlock) {
            $response['unlock_type'] = 'forced';
        }

        echo json_encode($response);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při odemykání objednávky: ' . $e->getMessage()]);
    }
}

function handle_orders25_count_by_user($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }

    if ($user_id <= 0) {
        http_response_code(400);
        echo json_encode(array('err' => 'Neplatné nebo chybějící user_id'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Počet objednávek vytvořených uživatelem (uzivatel_id)
        $stmt = $db->prepare(selectOrderCountByUserQuery());
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $count = isset($result['total_count']) ? (int)$result['total_count'] : 0;

        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'user_id' => $user_id,
                'total_orders_count' => $count
            )
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání počtu objednávek: ' . $e->getMessage()));
    }
}

// ========== WORKFLOW TRACKING HANDLERS ==========

/**
 * Helper funkce pro přidání workflow stavu
 * @param string $current_workflow - Aktuální workflow kód
 * @param string $new_state - Nový stav k přidání
 * @return string - Aktualizovaný workflow kód
 */
function addWorkflowState($current_workflow, $new_state) {
    if (empty($current_workflow)) {
        return $new_state;
    }
    
    // Kontrola, zda už stav obsahuje daný kód
    if (strpos($current_workflow, $new_state) !== false) {
        return $current_workflow; // Už existuje
    }
    
    return $current_workflow . '+' . $new_state;
}

/**
 * Odeslání objednávky dodavateli
 * POST endpoint: orders25/send-to-supplier
 * 
 * @param array $input - POST data obsahující:
 *   - token: JWT token
 *   - username: Uživatelské jméno
 *   - id: ID objednávky
 *   - method: Způsob odeslání (email, portal, fax, osobne) - volitelné
 * @param array $config - Databázová konfigurace
 * @param array $queries - SQL dotazy
 */
function handle_orders25_send_to_supplier($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $method = isset($input['method']) ? $input['method'] : 'email';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Načíst aktuální objednávku
        $stmt = $db->prepare(selectOrderByIdQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }
        
        // Kontrola oprávnění - pouze tvůrce nebo garant může odeslat
        if ($order['uzivatel_id'] != $current_user_id && $order['garant_uzivatel_id'] != $current_user_id) {
            http_response_code(403);
            echo json_encode(['err' => 'Nemáte oprávnění odeslat tuto objednávku']);
            return;
        }
        
        // Kontrola stavu - může být odeslána pouze schválená objednávka
        if (strpos($order['stav_workflow_kod'], 'SCHVALENA') === false) {
            http_response_code(400);
            echo json_encode(['err' => 'Objednávka musí být nejprve schválena']);
            return;
        }
        
        // Aktualizace workflow stavu
        $new_workflow_code = addWorkflowState($order['stav_workflow_kod'], 'ODESLANA');
        
        // Uložení změn
        $stmt = $db->prepare(updateOrderSendToSupplierQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':odesilatel_id', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':stav_workflow_kod', $new_workflow_code, PDO::PARAM_STR);
        $stmt->bindParam(':uzivatel_akt_id', $current_user_id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            echo json_encode([
                'status' => 'ok',
                'message' => 'Objednávka byla úspěšně odeslána dodavateli',
                'data' => [
                    'order_id' => $order_id,
                    'sent_by_user_id' => $current_user_id,
                    'method' => $method,
                    'workflow_state' => $new_workflow_code
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba při ukládání změn']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při odeslání objednávky: ' . $e->getMessage()]);
    }
}

/**
 * Stornování objednávky
 * POST endpoint: orders25/cancel-order
 * 
 * @param array $input - POST data obsahující:
 *   - token: JWT token
 *   - username: Uživatelské jméno
 *   - id: ID objednávky
 *   - reason: Důvod storna (povinné)
 * @param array $config - Databázová konfigurace
 * @param array $queries - SQL dotazy
 */
function handle_orders25_cancel_order($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $reason = isset($input['reason']) ? trim($input['reason']) : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }
    
    if (empty($reason)) {
        http_response_code(400);
        echo json_encode(['err' => 'Důvod storna je povinný']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Načíst aktuální objednávku
        $stmt = $db->prepare(selectOrderByIdQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }
        
        // Kontrola oprávnění - pouze tvůrce nebo garant může stornovat
        if ($order['uzivatel_id'] != $current_user_id && $order['garant_uzivatel_id'] != $current_user_id) {
            http_response_code(403);
            echo json_encode(['err' => 'Nemáte oprávnění stornovat tuto objednávku']);
            return;
        }
        
        // Kontrola stavu - nesmí být už dokončená nebo stornovaná
        if (strpos($order['stav_workflow_kod'], 'DOKONCENA') !== false || 
            strpos($order['stav_workflow_kod'], 'ZRUSENA') !== false) {
            http_response_code(400);
            echo json_encode(['err' => 'Dokončenou nebo již stornovanou objednávku nelze stornovat']);
            return;
        }
        
        // Aktualizace workflow stavu
        $new_workflow_code = addWorkflowState($order['stav_workflow_kod'], 'ZRUSENA');
        
        // Uložení změn
        $stmt = $db->prepare(updateOrderCancelQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':odesilatel_id', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':odeslani_storno_duvod', $reason, PDO::PARAM_STR);
        $stmt->bindParam(':stav_workflow_kod', $new_workflow_code, PDO::PARAM_STR);
        $stmt->bindParam(':uzivatel_akt_id', $current_user_id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            echo json_encode([
                'status' => 'ok',
                'message' => 'Objednávka byla úspěšně stornována',
                'data' => [
                    'order_id' => $order_id,
                    'cancelled_by_user_id' => $current_user_id,
                    'reason' => $reason,
                    'workflow_state' => $new_workflow_code
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba při ukládání změn']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při stornování objednávky: ' . $e->getMessage()]);
    }
}

/**
 * Potvrzení akceptace od dodavatele
 * POST endpoint: orders25/confirm-acceptance
 * 
 * @param array $input - POST data obsahující:
 *   - token: JWT token
 *   - username: Uživatelské jméno
 *   - id: ID objednávky
 *   - confirmation_methods: Způsoby potvrzení (pole) - volitelné
 *   - payment_method: Způsob platby - volitelné
 * @param array $config - Databázová konfigurace
 * @param array $queries - SQL dotazy
 */
function handle_orders25_confirm_acceptance($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $confirmation_methods = isset($input['confirmation_methods']) ? $input['confirmation_methods'] : array('email');
    $payment_method = isset($input['payment_method']) ? $input['payment_method'] : 'faktura';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Načíst aktuální objednávku
        $stmt = $db->prepare(selectOrderByIdQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebбыла nalezena']);
            return;
        }
        
        // Kontrola oprávnění - pouze tvůrce nebo garant může potvrdit
        if ($order['uzivatel_id'] != $current_user_id && $order['garant_uzivatel_id'] != $current_user_id) {
            http_response_code(403);
            echo json_encode(['err' => 'Nemáte oprávnění potvrdit tuto objednávku']);
            return;
        }
        
        // Kontrola stavu - musí být odeslána
        if (strpos($order['stav_workflow_kod'], 'ODESLANA') === false) {
            http_response_code(400);
            echo json_encode(['err' => 'Objednávka musí být nejprve odeslána dodavateli']);
            return;
        }
        
        // Aktualizace workflow stavu
        $new_workflow_code = addWorkflowState($order['stav_workflow_kod'], 'POTVRZENA');
        
        // Příprava JSON pro způsob potvrzení
        $potvrzeni_data = array(
            'potvrzeni' => 'ANO',
            'zpusoby' => is_array($confirmation_methods) ? $confirmation_methods : array($confirmation_methods),
            'platba' => $payment_method
        );
        $potvrzeni_json = json_encode($potvrzeni_data);
        
        // Uložení změn
        $stmt = $db->prepare(updateOrderConfirmAcceptanceQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':dodavatel_potvrdil_id', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':dodavatel_zpusob_potvrzeni', $potvrzeni_json, PDO::PARAM_STR);
        $stmt->bindParam(':stav_workflow_kod', $new_workflow_code, PDO::PARAM_STR);
        $stmt->bindParam(':uzivatel_akt_id', $current_user_id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            echo json_encode([
                'status' => 'ok',
                'message' => 'Akceptace dodavatele byla úspěšně zaznamenána',
                'data' => [
                    'order_id' => $order_id,
                    'confirmed_by_user_id' => $current_user_id,
                    'confirmation_methods' => $confirmation_methods,
                    'payment_method' => $payment_method,
                    'workflow_state' => $new_workflow_code
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba při ukládání změn']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při potvrzování akceptace: ' . $e->getMessage()]);
    }
}

/**
 * Přidání faktury k objednávce (FÁZE 5)
 * POST endpoint: orders25/add-invoice
 * 
 * @param array $input - POST data obsahující:
 *   - token: JWT token
 *   - username: Uživatelské jméno
 *   - id: ID objednávky
 *   - cislo_faktury: Číslo faktury (povinné)
 *   - datum_faktury: Datum vystavení faktury (volitelné)
 *   - castka_bez_dph: Částka bez DPH (volitelné)
 *   - castka_s_dph: Částka s DPH (volitelné)
 * @param array $config - Databázová konfigurace
 * @param array $queries - SQL dotazy
 */
function handle_orders25_add_invoice($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $cislo_faktury = isset($input['cislo_faktury']) ? trim($input['cislo_faktury']) : '';
    $datum_faktury = isset($input['datum_faktury']) ? $input['datum_faktury'] : null;
    $castka_bez_dph = isset($input['castka_bez_dph']) ? floatval($input['castka_bez_dph']) : null;
    $castka_s_dph = isset($input['castka_s_dph']) ? floatval($input['castka_s_dph']) : null;

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }
    
    if (empty($cislo_faktury)) {
        http_response_code(400);
        echo json_encode(['err' => 'Číslo faktury je povinné']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Načíst aktuální objednávku
        $stmt = $db->prepare(selectOrderByIdQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }
        
        // Kontrola oprávnění - pouze tvůrce nebo garant může přidat fakturu
        if ($order['uzivatel_id'] != $current_user_id && $order['garant_uzivatel_id'] != $current_user_id) {
            http_response_code(403);
            echo json_encode(['err' => 'Nemáte oprávnění přidat fakturu k této objednávce']);
            return;
        }
        
        // Kontrola stavu - musí být potvrzena
        if (strpos($order['stav_workflow_kod'], 'POTVRZENA') === false) {
            http_response_code(400);
            echo json_encode(['err' => 'Objednávka musí být nejprve potvrzena dodavatelem']);
            return;
        }
        
        // Uložení změn
        $stmt = $db->prepare(updateOrderAddInvoiceQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':fakturant_id', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':cislo_faktury', $cislo_faktury, PDO::PARAM_STR);
        $stmt->bindParam(':datum_faktury', $datum_faktury, PDO::PARAM_STR);
        $stmt->bindParam(':castka_bez_dph', $castka_bez_dph, PDO::PARAM_STR);
        $stmt->bindParam(':castka_s_dph', $castka_s_dph, PDO::PARAM_STR);
        $stmt->bindParam(':uzivatel_akt_id', $current_user_id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            echo json_encode([
                'status' => 'ok',
                'message' => 'Faktura byla úspěšně přidána k objednávce',
                'data' => [
                    'order_id' => $order_id,
                    'added_by_user_id' => $current_user_id,
                    'cislo_faktury' => $cislo_faktury,
                    'datum_faktury' => $datum_faktury,
                    'castka_bez_dph' => $castka_bez_dph,
                    'castka_s_dph' => $castka_s_dph
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba při ukládání faktury']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při přidávání faktury: ' . $e->getMessage()]);
    }
}

/**
 * Dokončení objednávky
 * POST endpoint: orders25/complete-order
 * 
 * @param array $input - POST data obsahující:
 *   - token: JWT token
 *   - username: Uživatelské jméno
 *   - id: ID objednávky
 *   - note: Poznámka ke kontrole a dokončení (volitelné)
 * @param array $config - Databázová konfigurace
 * @param array $queries - SQL dotazy
 */
function handle_orders25_complete_order($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $note = isset($input['note']) ? trim($input['note']) : '';

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID objednávky']);
        return;
    }

    try {
        $db = get_db($config);
        $current_user_id = $token_data['id'];
        
        // Načíst aktuální objednávku
        $stmt = $db->prepare(selectOrderByIdQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(['err' => 'Objednávka nebyla nalezena']);
            return;
        }
        
        // Kontrola oprávnění - pouze tvůrce nebo garant může dokončit
        if ($order['uzivatel_id'] != $current_user_id && $order['garant_uzivatel_id'] != $current_user_id) {
            http_response_code(403);
            echo json_encode(['err' => 'Nemáte oprávnění dokončit tuto objednávku']);
            return;
        }
        
        // Kontrola stavu - nesmí být už dokončena nebo stornovaná
        if (strpos($order['stav_workflow_kod'], 'DOKONCENA') !== false) {
            http_response_code(400);
            echo json_encode(['err' => 'Objednávka je již dokončena']);
            return;
        }
        
        if (strpos($order['stav_workflow_kod'], 'ZRUSENA') !== false) {
            http_response_code(400);
            echo json_encode(['err' => 'Stornovanou objednávku nelze dokončit']);
            return;
        }
        
        // Aktualizace workflow stavu
        $new_workflow_code = addWorkflowState($order['stav_workflow_kod'], 'DOKONCENA');
        
        // Uložení změn
        $stmt = $db->prepare(updateOrderCompleteQuery());
        $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
        $stmt->bindParam(':dokoncil_id', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':dokonceni_poznamka', $note, PDO::PARAM_STR);
        $stmt->bindParam(':stav_workflow_kod', $new_workflow_code, PDO::PARAM_STR);
        $stmt->bindParam(':uzivatel_akt_id', $current_user_id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            echo json_encode([
                'status' => 'ok',
                'message' => 'Objednávka byla úspěšně dokončena',
                'data' => [
                    'order_id' => $order_id,
                    'completed_by_user_id' => $current_user_id,
                    'note' => $note,
                    'workflow_state' => $new_workflow_code
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba při ukládání změn']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při dokončování objednávky: ' . $e->getMessage()]);
    }
}