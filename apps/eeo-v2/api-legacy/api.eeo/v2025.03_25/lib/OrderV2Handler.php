<?php
/**
 * Order V2 Handler - Standardized API for 25a_objednavky
 * 
 * Implementuje standardizaci datových typů podle dokumentu:
 * - JSON sloupce s konzistentním názvoslovím
 * - Peněžní částky jako STRING pro přesnost
 * - Standardizované formáty pro FE ↔ BE komunikaci
 * 
 * Kompatibilita: PHP 5.6+, MySQL 5.5.43+
 * 
 * @author Senior Developer
 * @date 29. října 2025
 */

require_once 'dbconfig.php';
require_once 'handlers.php';

class OrderV2Handler {
    
    private $db;
    private $config;
    
    public function __construct($config) {
        $this->config = $config;
        $this->db = get_db($config);
    }
    
    /**
     * Transformace dat z DB do standardizovaného formátu pro FE
     * 
     * @param array $rawData Raw data z tabulky 25a_objednavky
     * @return array Standardizovaná data podle dokumentu
     */
    public function transformFromDB($rawData) {
        if (!$rawData) {
            return null;
        }
        
        $result = $rawData;
        
        // ========== JSON SLOUPCE - STANDARDIZACE ==========
        
        // 1. strediska_kod: KONEČNÝ FORMÁT → Array stringů (BEZ MODIFIKACE)
        // ✅ Backend → Frontend: ["KLADNO", "BEROUN"] beze změn
        if (!empty($rawData['strediska_kod'])) {
            $strediska = $this->safeJsonDecode($rawData['strediska_kod'], array());
            if (is_array($strediska)) {
                // Vrátit array jak je v DB, pouze vyčistit prázdné hodnoty
                $result['strediska_kod'] = array_values(array_filter($strediska, function($item) {
                    return !empty($item);
                }));
            }
        }
        
        // 2. financovani: Surová data z DB bez transformace
        // ✅ NOVÝ PŘÍSTUP: Poslat FE přesně to co je v DB
        if (isset($rawData['financovani']) && $rawData['financovani'] !== null && $rawData['financovani'] !== '') {
            $financovani = $this->safeJsonDecode($rawData['financovani'], null);
            if (is_array($financovani)) {
                // Poslat surová data jak jsou v DB
                $result['financovani'] = $financovani;
            } elseif ($financovani === null) {
                // JSON parsing failed nebo je null - zachováme null
                $result['financovani'] = null;
            }
        }
        
        // 3. druh_objednavky_kod: Extract just the code or keep as string
        if (!empty($rawData['druh_objednavky_kod'])) {
            $druh = $this->safeJsonDecode($rawData['druh_objednavky_kod'], null);
            if (is_array($druh) && isset($druh['kod_stavu'])) {
                $result['druh_objednavky_kod'] = $druh['kod_stavu'];
            } elseif (is_array($druh) && isset($druh['kod'])) {
                $result['druh_objednavky_kod'] = $druh['kod'];
            } else {
                // Už je to string nebo něco jiného - nech to tak
                $result['druh_objednavky_kod'] = $rawData['druh_objednavky_kod'];
            }
        }
        
        // 4. stav_workflow_kod: Ensure it's array of strings
        if (!empty($rawData['stav_workflow_kod'])) {
            $stavy = $this->safeJsonDecode($rawData['stav_workflow_kod'], array());
            if (is_array($stavy)) {
                $result['stav_workflow_kod'] = array_values(array_filter($stavy));
            }
        }
        
        // 5. dodavatel_zpusob_potvrzeni: Vrátit PŘESNĚ jak je v DB (RAW)
        if (isset($rawData['dodavatel_zpusob_potvrzeni'])) {
            // ✅ VRÁTIT PŘESNĚ JAK JE V DB - bez parsování!
            $result['dodavatel_zpusob_potvrzeni'] = $rawData['dodavatel_zpusob_potvrzeni'];
        }
        
        // ========== BOOLEAN POLE - PŘEVOD NA BOOLEAN ==========
        
        // mimoradna_udalost: TINYINT(1) → boolean
        if (isset($rawData['mimoradna_udalost'])) {
            $result['mimoradna_udalost'] = (bool)$rawData['mimoradna_udalost'];
        }
        
        // ========== PENĚŽNÍ ČÁSTKY - STRING PRO PŘESNOST ==========
        
        $moneyFields = array('max_cena_s_dph');
        foreach ($moneyFields as $field) {
            if (isset($rawData[$field]) && $rawData[$field] !== null) {
                // Convert to string with 2 decimal places
                $result[$field] = number_format((float)$rawData[$field], 2, '.', '');
            }
        }
        
        // ========== BOOLEAN POLE - PŘEVOD NA INTEGER 0/1 ==========
        // 🔧 NORMALIZACE: Vždy posíláme 0 nebo 1 (integer), NIKDY string '0' nebo boolean
        
        $boolFields = array('aktivni', 'potvrzeni_dokonceni_objednavky', 'potvrzeni_vecne_spravnosti');
        foreach ($boolFields as $field) {
            if (isset($rawData[$field])) {
                // Explicitně převést na integer 0 nebo 1
                $result[$field] = $rawData[$field] ? 1 : 0;
            }
        }
        
        // ========== ID POLE - ENSURE INTEGER OR NULL ==========
        
        $idFields = array(
            'id', 'uzivatel_id', 'uzivatel_akt_id', 'garant_uzivatel_id', 
            'objednatel_id', 'schvalovatel_id', 'prikazce_id', 'dodavatel_id',
            'odesilatel_id', 'dodavatel_potvrdil_id', 'zverejnil_id', 
            'fakturant_id', 'dokoncil_id', 'potvrdil_vecnou_spravnost_id', 'zamek_uzivatel_id'
        );
        
        foreach ($idFields as $field) {
            if (isset($rawData[$field])) {
                if ($rawData[$field] === null || $rawData[$field] === '' || $rawData[$field] === 0) {
                    $result[$field] = null;
                } else {
                    $result[$field] = (int)$rawData[$field];
                }
            }
        }
        
        // ========== CHYBĚJÍCÍ POLE - PŘIDÁNÍ ==========
        
        // Základní stav objednávky (varchar)
        if (isset($rawData['stav_objednavky'])) {
            $result['stav_objednavky'] = $rawData['stav_objednavky'];
        }
        
        // Flag pro zveřejnění (tinytext)
        if (isset($rawData['zverejnit'])) {
            $result['zverejnit'] = $rawData['zverejnit'];
        }
        
        // Důvod storna (text)
        if (isset($rawData['odeslani_storno_duvod'])) {
            $result['odeslani_storno_duvod'] = $rawData['odeslani_storno_duvod'];
        }
        
        // Registr údaje
        if (isset($rawData['registr_iddt'])) {
            $result['registr_iddt'] = $rawData['registr_iddt'];
        }
        
        // Základní stav objednávky
        if (isset($rawData['stav_objednavky'])) {
            $result['stav_objednavky'] = $rawData['stav_objednavky'];
        }
        
        // Zveřejnění
        if (isset($rawData['zverejnit'])) {
            $result['zverejnit'] = $rawData['zverejnit'];
        }
        
        // Storno důvod  
        if (isset($rawData['odeslani_storno_duvod'])) {
            $result['odeslani_storno_duvod'] = $rawData['odeslani_storno_duvod'];
        }
        
        // ========== DATETIME STANDARDIZACE ==========
        
        // DATETIME pole (s časem)
        $datetimeFields = array(
            'dt_objednavky', 'dt_schvaleni', 'dt_odeslani', 'dt_akceptace', 
            'dt_zverejneni', 'dt_faktura_pridana', 'dt_dokonceni', 
            'dt_potvrzeni_vecne_spravnosti', 'dt_vytvoreni', 'dt_aktualizace', 'dt_zamek'
        );
        
        foreach ($datetimeFields as $field) {
            if (isset($rawData[$field]) && $rawData[$field] !== null && $rawData[$field] !== '0000-00-00 00:00:00') {
                // Zachovat původní MySQL datetime formát (YYYY-MM-DD HH:MM:SS)
                $result[$field] = $rawData[$field];
            } else {
                // NULL nebo invalid hodnota
                $result[$field] = null;
            }
        }
        
        // DATE pole (pouze datum, bez času)
        $dateFields = array('dt_predpokladany_termin_dodani');
        
        foreach ($dateFields as $field) {
            if (isset($rawData[$field]) && $rawData[$field] !== null && $rawData[$field] !== '0000-00-00') {
                // MySQL date formát (YYYY-MM-DD)
                $result[$field] = $rawData[$field];
            } else {
                $result[$field] = null;
            }
        }
        
        return $result;
    }
    
    /**
     * Transformace standardizovaných dat z FE do DB formátu
     * 
     * @param array $standardData Standardizovaná data z FE
     * @return array Data připravená pro INSERT/UPDATE do DB
     */
    public function transformToDB($standardData, $isUpdate = false) {
        if (!$standardData) {
            return array();
        }
        
        // Filtrování - odstranit autentizační a systémové parametry které nejsou DB sloupce
        $authFields = array('token', 'username', 'id'); // id se nepřepíše při UPDATE
        
        // BLACKLIST - pole která NEEXISTUJÍ v tabulce 25a_objednavky
        // (jsou v jiných tabulkách nebo jsou virtuální)
        $blacklistedFields = array(
            'faktury',              // Je v 25a_objednavky_faktury (samostatná tabulka)
            'polozky',              // Je v 25_objednavky_polozky (samostatná tabulka)
            'polozky_count',        // Virtuální pole (počítané)
            'prilohy',              // Je v 25a_objednavky_prilohy (samostatná tabulka)
            'lock_info',            // Virtuální pole (sestavené ze zamek_* polí)
            'enriched_data',        // Virtuální pole (JOIN data)
            'items',                // Alias pro polozky
            'attachments',          // Alias pro prilohy
            '_existing_order',      // Interní helper pro validace při UPDATE
            '_current_user_id',     // Interní helper pro validace při UPDATE
            'storno_provedl',       // 🛑 DEPRECATED: Pole neexistuje v DB (používáme odesilatel_id)
            'datum_storna',         // 🛑 DEPRECATED: Pole neexistuje v DB (používáme dt_odeslani)
            'stav_stornovano',      // 🛑 DEPRECATED: Pole neexistuje v DB (používáme workflow ZRUSENA)
            'storno_uzivatel_id'    // 🛑 DEPRECATED: Pole neexistuje v DB (používáme odesilatel_id)
        );
        
        // 🔒 ONLY during UPDATE: Block core IDs from being changed
        if ($isUpdate) {
            $blacklistedFields[] = 'uzivatel_id';   // Technical creator - never update from frontend
            $blacklistedFields[] = 'objednatel_id'; // Business orderer - never update from frontend  
        }
        
        $result = array();
        foreach ($standardData as $key => $value) {
            if (!in_array($key, $authFields) && !in_array($key, $blacklistedFields)) {
                // 🔧 FIELD MAPPING: frontend → database column names
                if ($key === 'schvalil_uzivatel_id') {
                    // Frontend posílá schvalil_uzivatel_id, ale DB má schvalovatel_id
                    $result['schvalovatel_id'] = $value;
                } elseif ($key === 'storno_uzivatel_id') {
                    // 🛑 DEPRECATED: storno_uzivatel_id neexistuje v DB
                    // Používáme odesilatel_id pro OBOJÍ (odeslání i storno)
                    // IGNOROVAT - nepřepisovat odesilatel_id z frontendu
                    error_log("WARNING: Frontend poslal deprecated pole storno_uzivatel_id - IGNOROVÁNO");
                } else {
                    $result[$key] = $value;
                }
            }
        }
        
        // ========== JSON SLOUPCE - PŘÍPRAVA PRO DB ==========
        
        // 1. strediska_kod: KONEČNÝ FORMÁT → JSON array stringů (BEZ MODIFIKACE)
        // ✅ Frontend → Backend: ["KLADNO", "BEROUN"] → uloženo jako JSON beze změn
        if (isset($standardData['strediska_kod'])) {
            if (is_array($standardData['strediska_kod'])) {
                // Uložit bez modifikace - pouze odstranit prázdné hodnoty
                $cleanedStrediska = array_values(array_filter($standardData['strediska_kod']));
                $result['strediska_kod'] = json_encode($cleanedStrediska);
            } elseif (is_string($standardData['strediska_kod'])) {
                // Už je to JSON string - nech to tak jak je
                $result['strediska_kod'] = $standardData['strediska_kod'];
            }
        }
        
        // 2. financovani: KONEČNÝ FORMÁT → JSON objekt {typ, lp_kody, ...}
        // ✅ Frontend → Backend: {typ: "LP", lp_kody: [...]} → uloženo jako JSON
        if (isset($standardData['financovani'])) {
            if (is_array($standardData['financovani'])) {
                // Validace: typ je povinný
                if (!isset($standardData['financovani']['typ']) || empty($standardData['financovani']['typ'])) {
                    // Pokud chybí typ, zkus fallback na kod_stavu (backwards compatibility)
                    if (isset($standardData['financovani']['kod_stavu'])) {
                        $standardData['financovani']['typ'] = $standardData['financovani']['kod_stavu'];
                    }
                }
                
                // Sestavení objektu pouze s relevantními poli (bez redundantních názvu)
                $financovaniData = array(
                    'typ' => $standardData['financovani']['typ']
                );
                
                // Dynamická pole podle typu
                if (isset($standardData['financovani']['lp_kody']) && is_array($standardData['financovani']['lp_kody'])) {
                    $financovaniData['lp_kody'] = $standardData['financovani']['lp_kody'];
                } elseif (isset($standardData['financovani']['lp_kod']) && is_array($standardData['financovani']['lp_kod'])) {
                    // Backwards compatibility
                    $financovaniData['lp_kody'] = $standardData['financovani']['lp_kod'];
                }
                if (isset($standardData['financovani']['lp_poznamka'])) {
                    $financovaniData['lp_poznamka'] = $standardData['financovani']['lp_poznamka'];
                }
                
                if (isset($standardData['financovani']['cislo_smlouvy'])) {
                    $financovaniData['cislo_smlouvy'] = $standardData['financovani']['cislo_smlouvy'];
                }
                if (isset($standardData['financovani']['smlouva_poznamka'])) {
                    $financovaniData['smlouva_poznamka'] = $standardData['financovani']['smlouva_poznamka'];
                }
                if (isset($standardData['financovani']['individualni_schvaleni'])) {
                    $financovaniData['individualni_schvaleni'] = $standardData['financovani']['individualni_schvaleni'];
                }
                if (isset($standardData['financovani']['individualni_poznamka'])) {
                    $financovaniData['individualni_poznamka'] = $standardData['financovani']['individualni_poznamka'];
                }
                if (isset($standardData['financovani']['pojistna_udalost_cislo'])) {
                    $financovaniData['pojistna_udalost_cislo'] = $standardData['financovani']['pojistna_udalost_cislo'];
                }
                if (isset($standardData['financovani']['pojistna_udalost_poznamka'])) {
                    $financovaniData['pojistna_udalost_poznamka'] = $standardData['financovani']['pojistna_udalost_poznamka'];
                }
                
                $result['financovani'] = json_encode($financovaniData);
            } elseif (is_string($standardData['financovani'])) {
                // Už je to JSON string - zkus parsovat a normalizovat
                $parsed = $this->safeJsonDecode($standardData['financovani'], null);
                if (is_array($parsed)) {
                    // Re-encode s čistou strukturou (bez redundance)
                    $financovaniData = array('typ' => isset($parsed['typ']) ? $parsed['typ'] : (isset($parsed['kod_stavu']) ? $parsed['kod_stavu'] : null));
                    
                    // Přidej relevantní dynamická pole
                    foreach (array('lp_kody', 'lp_kod', 'cislo_smlouvy', 'smlouva_poznamka', 'individualni_schvaleni', 'individualni_poznamka', 'pojistna_udalost_cislo', 'pojistna_udalost_poznamka') as $key) {
                        if (isset($parsed[$key])) {
                            $financovaniData[$key] = $parsed[$key];
                        }
                    }
                    
                    $result['financovani'] = json_encode($financovaniData);
                } else {
                    // Nějak selhalo, nech původní
                    $result['financovani'] = $standardData['financovani'];
                }
            }
        }
        
        // 3. druh_objednavky_kod: Keep as string (not JSON)
        if (isset($standardData['druh_objednavky_kod'])) {
            if (is_string($standardData['druh_objednavky_kod'])) {
                $result['druh_objednavky_kod'] = $standardData['druh_objednavky_kod'];
            }
        }
        
        // 4. stav_workflow_kod: Convert to JSON array
        if (isset($standardData['stav_workflow_kod'])) {
            if (is_array($standardData['stav_workflow_kod'])) {
                $result['stav_workflow_kod'] = json_encode(array_values($standardData['stav_workflow_kod']));
            } elseif (is_string($standardData['stav_workflow_kod'])) {
                // Už je to JSON string
                $result['stav_workflow_kod'] = $standardData['stav_workflow_kod'];
            }
        }
        
        // 5. dodavatel_zpusob_potvrzeni: Convert to JSON + respektovat potvrzeno pole
        if (isset($standardData['dodavatel_zpusob_potvrzeni'])) {
            if (is_array($standardData['dodavatel_zpusob_potvrzeni'])) {
                // Zachovat původní strukturu + přidat potvrzeno pokud existuje
                $zpusobData = $standardData['dodavatel_zpusob_potvrzeni'];
                
                // DEBUG LOG
                error_log("DEBUG transformToDB - INPUT zpusobData: " . json_encode($zpusobData));
                
                // Pokud FE posílá potvrzeno: true/false, zachovat ho v JSON
                if (isset($zpusobData['potvrzeno'])) {
                    // Už je v datech, explicitně zachovat jako boolean
                    $zpusobData['potvrzeno'] = (bool)$zpusobData['potvrzeno'];
                    error_log("DEBUG transformToDB - potvrzeno FOUND in zpusobData: " . ($zpusobData['potvrzeno'] ? 'true' : 'false'));
                } elseif (isset($standardData['potvrzeno'])) {
                    // Potvrzeno je na root úrovni, přesunout do zpusobu
                    $zpusobData['potvrzeno'] = (bool)$standardData['potvrzeno'];
                    error_log("DEBUG transformToDB - potvrzeno FOUND on root: " . ($zpusobData['potvrzeno'] ? 'true' : 'false'));
                } else {
                    error_log("DEBUG transformToDB - potvrzeno NOT FOUND anywhere");
                }
                
                $finalJson = json_encode($zpusobData);
                error_log("DEBUG transformToDB - FINAL JSON: " . $finalJson);
                $result['dodavatel_zpusob_potvrzeni'] = $finalJson;
            } elseif (is_string($standardData['dodavatel_zpusob_potvrzeni'])) {
                // Už je to JSON string - možná přidat potvrzeno
                $decoded = $this->safeJsonDecode($standardData['dodavatel_zpusob_potvrzeni'], array());
                if (is_array($decoded) && isset($standardData['potvrzeno'])) {
                    $decoded['potvrzeno'] = (bool)$standardData['potvrzeno'];
                    $result['dodavatel_zpusob_potvrzeni'] = json_encode($decoded);
                } else {
                    $result['dodavatel_zpusob_potvrzeni'] = $standardData['dodavatel_zpusob_potvrzeni'];
                }
            }
        }
        
        // ========== BOOLEAN POLE - PŘEVOD NA TINYINT ==========
        
        // mimoradna_udalost: boolean → TINYINT(1) pro DB
        // OPRAVA: Vždy nastavit, i když je false (aby se uložilo do DB při CREATE)
        if (array_key_exists('mimoradna_udalost', $standardData)) {
            $result['mimoradna_udalost'] = $standardData['mimoradna_udalost'] ? 1 : 0;
        } else {
            // Výchozí hodnota pokud není vůbec zadáno
            $result['mimoradna_udalost'] = 0;
        }
        
        // ========== PENĚŽNÍ ČÁSTKY - PŘEVOD NA DECIMAL ==========
        
        $moneyFields = array('max_cena_s_dph');
        foreach ($moneyFields as $field) {
            if (isset($standardData[$field])) {
                // MySQL DECIMAL expects string or number
                if (is_string($standardData[$field])) {
                    $result[$field] = $standardData[$field];
                } else {
                    $result[$field] = number_format((float)$standardData[$field], 2, '.', '');
                }
            }
        }
        
        // ========== DATETIME ZPĚT DO MYSQL FORMÁTU ==========
        
        // DATETIME pole (s časem)
        $datetimeFields = array(
            'dt_objednavky', 'dt_schvaleni', 'dt_odeslani', 'dt_akceptace', 
            'dt_zverejneni', 'dt_faktura_pridana', 'dt_dokonceni', 
            'dt_potvrzeni_vecne_spravnosti', 'dt_vytvoreni', 'dt_aktualizace', 'dt_zamek'
        );
        
        foreach ($datetimeFields as $field) {
            if (isset($standardData[$field]) && $standardData[$field] !== null && $standardData[$field] !== '') {
                // 🔥 FIX: Frontend už posílá LOKÁLNÍ ČESKÝ ČAS (ne UTC)!
                // NEKONVERTOVAT! Pouze zajistit správný MySQL formát (Y-m-d H:i:s)
                $dt = false;
                
                // ISO format s millisekundami: 2026-01-09T00:49:44.125Z
                if (!$dt && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/', $standardData[$field])) {
                    $dt = DateTime::createFromFormat('Y-m-d\TH:i:s.v\Z', $standardData[$field]);
                }
                
                // ISO format bez millisekundy: 2026-01-09T00:49:44Z nebo 2026-01-09T00:49:44
                if (!$dt && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $standardData[$field])) {
                    $cleaned = rtrim($standardData[$field], 'Z');
                    $dt = DateTime::createFromFormat('Y-m-d\TH:i:s', $cleaned);
                }
                
                // Standard MySQL format: 2026-01-09 00:49:44
                if (!$dt && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $standardData[$field])) {
                    // ✅ UŽ JE V SPRÁVNÉM FORMÁTU - jen zkopírovat
                    $result[$field] = $standardData[$field];
                    continue;
                }
                
                // Pokud přišlo jen datum bez času (Y-m-d), přidej půlnoc
                if (!$dt && preg_match('/^\d{4}-\d{2}-\d{2}$/', $standardData[$field])) {
                    $result[$field] = $standardData[$field] . ' 00:00:00';
                    continue;
                }
                
                if ($dt) {
                    // Konvertuj do MySQL formátu
                    $result[$field] = $dt->format('Y-m-d H:i:s');
                } else {
                    // Last resort - pokus o strtotime
                    $timestamp = strtotime($standardData[$field]);
                    if ($timestamp !== false) {
                        $result[$field] = date('Y-m-d H:i:s', $timestamp);
                    } else {
                        // Fallback - current timestamp
                        $result[$field] = date('Y-m-d H:i:s');
                    }
                }
            }
        }
        
        // DATE pole (pouze datum) - NOVÉ!
        $dateFields = array('dt_predpokladany_termin_dodani');
        
        foreach ($dateFields as $field) {
            if (isset($standardData[$field]) && $standardData[$field] !== null) {
                // Parse ISO date or MySQL date format back to MySQL date
                $dt = DateTime::createFromFormat('Y-m-d', $standardData[$field]);
                if (!$dt) {
                    // Zkus i s časem a extrahuj jen datum
                    $dt = DateTime::createFromFormat('Y-m-d\TH:i:s\Z', $standardData[$field]);
                }
                if ($dt) {
                    $result[$field] = $dt->format('Y-m-d'); // MySQL DATE format
                } else {
                    // Pokud selže parsing, nech původní hodnotu
                    $result[$field] = $standardData[$field];
                }
            }
        }
        
        // Přidej do result jako tinyint
        if (array_key_exists('potvrzeni_dokonceni_objednavky', $standardData)) {
            $result['potvrzeni_dokonceni_objednavky'] = $standardData['potvrzeni_dokonceni_objednavky'] ? 1 : 0;
            error_log("💾 [DB] potvrzeni_dokonceni_objednavky bude uloženo jako: " . ($result['potvrzeni_dokonceni_objednavky'] ? '1' : '0'));
        }
        
        // Přidej do result pokud je nastaveno
        if (isset($standardData['dokoncil_id'])) {
            $result['dokoncil_id'] = $standardData['dokoncil_id'];
            error_log("💾 [DB] dokoncil_id bude uloženo jako: {$result['dokoncil_id']}");
        }
        
        
        // Zveřejnění
        if (isset($standardData['zverejnit'])) {
            $result['zverejnit'] = $standardData['zverejnit'];
        }
        
        // Storno důvod
        if (isset($standardData['odeslani_storno_duvod'])) {
            $result['odeslani_storno_duvod'] = $standardData['odeslani_storno_duvod'];
        }
        
        return $result;
    }
    
    /**
     * Načtení objednávky podle ID s lock informacemi a workflow tracking
     * 
     * @param int $orderId ID objednávky
     * @param int $currentUserId ID aktuálního uživatele (pro lock logic)
     * @param bool $includeArchived Zahrnout i archivované objednávky
     * @return array|null Standardizovaná data objednávky nebo null
     */
    public function getOrderById($orderId, $currentUserId, $includeArchived = false) {
        try {
            // Základní dotaz s lock informacemi a workflow tracking daty
            $sql = "SELECT o.*, 
                    CASE 
                        WHEN o.dt_zamek IS NULL OR o.zamek_uzivatel_id IS NULL OR o.zamek_uzivatel_id = 0 THEN 'unlocked'
                        WHEN TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) > 15 THEN 'expired'
                        WHEN o.zamek_uzivatel_id = :current_user_id THEN 'owned'
                        ELSE 'locked'
                    END as lock_status,
                    TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as lock_age_minutes,
                    -- Lock user data (pouze pokud existuje zámek)
                    CASE 
                        WHEN o.zamek_uzivatel_id IS NOT NULL AND o.zamek_uzivatel_id > 0 THEN
                            CONCAT(
                                CASE WHEN u_lock.titul_pred IS NOT NULL AND u_lock.titul_pred != '' 
                                     THEN CONCAT(u_lock.titul_pred, ' ') 
                                     ELSE '' 
                                END,
                                COALESCE(u_lock.jmeno, ''), 
                                ' ', 
                                COALESCE(u_lock.prijmeni, ''),
                                CASE WHEN u_lock.titul_za IS NOT NULL AND u_lock.titul_za != '' 
                                     THEN CONCAT(' ', u_lock.titul_za) 
                                     ELSE '' 
                                END
                            )
                        ELSE NULL
                    END as zamek_uzivatel_jmeno,
                    u_lock.email as zamek_uzivatel_email,
                    u_lock.telefon as zamek_uzivatel_telefon,
                    (SELECT COUNT(*) FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k WHERE k.objednavka_id = o.id AND k.smazano = 0) AS comments_count,
                    (SELECT CONCAT(COALESCE(u2.jmeno, ''), ' ', COALESCE(u2.prijmeni, ''))
                     FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k2
                     LEFT JOIN `" . TBL_UZIVATELE . "` u2 ON k2.user_id = u2.id
                     WHERE k2.objednavka_id = o.id AND k2.smazano = 0
                     ORDER BY k2.id DESC LIMIT 1) AS last_comment_author,
                    (SELECT k3.dt_vytvoreni
                     FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k3
                     WHERE k3.objednavka_id = o.id AND k3.smazano = 0
                     ORDER BY k3.id DESC LIMIT 1) AS last_comment_date
                FROM " . $this->getOrdersTableName() . " o
                LEFT JOIN " . $this->getUsersTableName() . " u_lock ON o.zamek_uzivatel_id = u_lock.id AND o.zamek_uzivatel_id > 0
                WHERE o.id = :id";
            
            if (!$includeArchived) {
                $sql .= " AND o.aktivni = 1";
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
            $stmt->bindParam(':current_user_id', $currentUserId, PDO::PARAM_INT);
            $stmt->execute();
            
            $rawOrder = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$rawOrder) {
                return null;
            }
            
            // Standardizace dat
            $order = $this->transformFromDB($rawOrder);
            
            // Přidání lock_info objektu
            $lockStatus = $rawOrder['lock_status'];
            $lockUserId = isset($rawOrder['zamek_uzivatel_id']) && $rawOrder['zamek_uzivatel_id'] > 0 ? (int)$rawOrder['zamek_uzivatel_id'] : null;
            $lockAt = !empty($rawOrder['dt_zamek']) && $rawOrder['dt_zamek'] !== '0000-00-00 00:00:00' ? $rawOrder['dt_zamek'] : null;
            
            // VALIDACE: locked může být TRUE pouze pokud máme validní data
            $isLocked = ($lockStatus === 'locked' && $lockUserId !== null && $lockAt !== null);
            $isOwned = ($lockStatus === 'owned' && $lockUserId !== null);
            $isExpired = ($lockStatus === 'expired');
            
            // Pokud je lock status "locked" ale chybí data, přepneme na "unlocked"
            if ($lockStatus === 'locked' && ($lockUserId === null || $lockAt === null)) {
                $lockStatus = 'unlocked';
                $isLocked = false;
            }
            
            $order['lock_info'] = array(
                'locked' => $isLocked, // TRUE pouze když zamčená JINÝM uživatelem A máme validní data
                'locked_by_user_id' => $lockUserId,
                'locked_by_user_fullname' => !empty($rawOrder['zamek_uzivatel_jmeno']) ? trim($rawOrder['zamek_uzivatel_jmeno']) : null,
                'locked_by_user_email' => !empty($rawOrder['zamek_uzivatel_email']) ? $rawOrder['zamek_uzivatel_email'] : null,
                'locked_by_user_telefon' => !empty($rawOrder['zamek_uzivatel_telefon']) ? $rawOrder['zamek_uzivatel_telefon'] : null,
                'locked_at' => $lockAt,
                'lock_status' => $lockStatus, // unlocked|expired|owned|locked
                'lock_age_minutes' => $rawOrder['lock_age_minutes'] !== null ? (int)$rawOrder['lock_age_minutes'] : null,
                'is_owned_by_me' => $isOwned, // TRUE pokud JÁ vlastním zámek
                'is_expired' => $isExpired // TRUE pokud zámek vypršel (>15 min)
            );
            
            // Vyčištění dočasných polí
            unset($order['lock_status']);
            unset($order['lock_age_minutes']);
            unset($order['zamek_uzivatel_jmeno']);
            unset($order['zamek_uzivatel_email']);
            unset($order['zamek_uzivatel_telefon']);

            // 💬 Komentáře badge - přidat do výsledku
            $order['comments_count'] = (int)($rawOrder['comments_count'] ?? 0);
            $order['last_comment_author'] = !empty($rawOrder['last_comment_author']) ? trim($rawOrder['last_comment_author']) : null;
            $order['last_comment_date'] = !empty($rawOrder['last_comment_date']) ? $rawOrder['last_comment_date'] : null;
            
            return $order;
            
        } catch (Exception $e) {
            error_log("OrderV2Handler::getOrderById() Error: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Bezpečné JSON dekódování s fallback hodnotou
     * 
     * @param string $json JSON string
     * @param mixed $default Výchozí hodnota při chybě
     * @return mixed Dekódovaná data nebo $default
     */
    private function safeJsonDecode($json, $default = null) {
        // OPRAVENO: kontrola pouze null a empty string, ne empty() který filtruje i "[]" a "{}"
        if ($json === null || $json === '') {
            return $default;
        }
        
        $decoded = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON decode error: " . json_last_error_msg() . " for: " . $json);
            return $default;
        }
        
        return $decoded;
    }
    
    /**
     * Získání názvu tabulky uživatelů (kompatibilita s různými verzemi)
     * 
     * @return string Název tabulky
     */
    private function getUsersTableName() {
        // Zkusíme použít existující funkci pokud existuje
        if (function_exists('get_users_table_name')) {
            return get_users_table_name();
        }
        
        // Fallback - použít TBL_ konstantu
        return TBL_UZIVATELE;
    }
    
    private function getOrdersTableName() {
        // Zkusíme použít existující funkci pokud existuje
        if (function_exists('get_orders_table_name')) {
            return get_orders_table_name();
        }
        
        // Fallback - použít TBL_ konstantu
        return TBL_OBJEDNAVKY;
    }
    
    /**
     * Validace dat před uložením (CREATE operace)
     * POZOR: Minimální validace - FE si řídí povinnost polí podle fáze formuláře
     * 
     * @param array $data Data k validaci
     * @return array Array s 'valid' => bool a 'errors' => array
     */
    public function validateOrderData($data) {
        $errors = array();
        
        // 🔥 ŽÁDNÁ POVINNÁ POLE! Validace je na FE
        // BE pouze ověřuje formát poskytnutých hodnot
        
        // Validace ID polí - POUZE pokud jsou zadána
        if (isset($data['uzivatel_id']) && (!is_numeric($data['uzivatel_id']) || $data['uzivatel_id'] <= 0)) {
            $errors[] = 'ID uživatele musí být kladné číslo';
        }
        
        if (isset($data['schvalovatel_id']) && (!is_numeric($data['schvalovatel_id']) || $data['schvalovatel_id'] <= 0)) {
            $errors[] = 'ID schvalovatele musí být kladné číslo';
        }
        
        if (isset($data['prikazce_id']) && (!is_numeric($data['prikazce_id']) || $data['prikazce_id'] <= 0)) {
            $errors[] = 'ID příkazce musí být kladné číslo';
        }
        
        return $this->validateCommonFields($data, $errors);
    }
    
    /**
     * Validace dat před UPDATE operací
     * 
     * 🔥 ŽÁDNÁ POVINNÁ POLE! Partial update plně podporován
     * - Validace povinnosti je POUZE na FE
     * - BE pouze kontroluje formát poskytnutých hodnot
     * 
     * @param array $data Data k validaci
     * @return array Array s 'valid' => bool a 'errors' => array
     */
    public function validateOrderDataForUpdate($data) {
        $errors = array();
        
        // Validace pouze těch polí, která JSOU poskytnutá
        
        if (isset($data['uzivatel_id']) && (!is_numeric($data['uzivatel_id']) || $data['uzivatel_id'] <= 0)) {
            $errors[] = 'ID uživatele musí být kladné číslo';
        }
        
        if (isset($data['schvalovatel_id']) && (!is_numeric($data['schvalovatel_id']) || $data['schvalovatel_id'] <= 0)) {
            $errors[] = 'ID schvalovatele musí být kladné číslo';
        }
        
        if (isset($data['prikazce_id']) && (!is_numeric($data['prikazce_id']) || $data['prikazce_id'] <= 0)) {
            $errors[] = 'ID příkazce musí být kladné číslo';
        }
        
        return $this->validateCommonFields($data, $errors);
    }
    
    /**
     * Generuje další dostupné evidenční číslo objednávky
     * Formát: O-XXXX/ICO/ROK/USEK_ZKR
     * 
     * @param string $username Username uživatele pro získání org dat
     * @return array Array s informacemi o čísle nebo false při chybě
     */
    public function generateNextOrderNumber($username) {
        try {
            // Získání org dat uživatele
            $orgData = $this->getUserOrgData($username);
            if (!$orgData) {
                return false;
            }
            
            // Získání posledního použitého čísla pro aktuální rok
            $sql = "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) as last_used_number 
                    FROM " . $this->getOrdersTableName() . "
                    WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(cislo_objednavky, '/', -2), '/', 1) = YEAR(NOW()) 
                    AND cislo_objednavky LIKE 'O-%'";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $lastUsedNumber = (int)$result['last_used_number'];
            $nextNumber = $lastUsedNumber + 1;
            $currentYear = TimezoneHelper::getCzechDateTime('Y');
            
            // Formátování čísel s nulami
            $formattedLastUsed = sprintf('%04d', $lastUsedNumber);
            $formattedNext = sprintf('%04d', $nextNumber);
            
            // Sestavení řetězců evidenčních čísel
            $lastUsedOrderString = 'O-' . $formattedLastUsed . '/' . $orgData['ico'] . '/' . $currentYear . '/' . $orgData['usek_zkr'];
            $nextOrderString = 'O-' . $formattedNext . '/' . $orgData['ico'] . '/' . $currentYear . '/' . $orgData['usek_zkr'];
            
            return array(
                'last_used_number' => $lastUsedNumber,
                'next_number' => $nextNumber,
                'formatted_last_used' => $formattedLastUsed,
                'formatted_next' => $formattedNext,
                'ico' => $orgData['ico'],
                'usek_zkr' => $orgData['usek_zkr'],
                'current_year' => $currentYear,
                'last_used_order_string' => $lastUsedOrderString,
                'next_order_string' => $nextOrderString,
                'order_number_string' => $nextOrderString // FE potřebuje NEXT volné číslo
            );
            
        } catch (Exception $e) {
            error_log("OrderV2Handler::generateNextOrderNumber() Error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Kontroluje dostupnost evidenčního čísla objednávky
     * 
     * @param string $orderNumber Číslo objednávky ke kontrole
     * @param string $username Username pro případný suggestion
     * @param bool $suggest Zda navrhnout alternativní číslo při konfliktu
     * @return array Array s výsledkem kontroly
     */
    public function checkOrderNumber($orderNumber, $username, $suggest = false) {
        try {
            // Kontrola existence čísla v databázi
            $sql = "SELECT id, objednatel_id FROM " . $this->getOrdersTableName() . " WHERE cislo_objednavky = :cislo_objednavky LIMIT 1";
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':cislo_objednavky', $orderNumber, PDO::PARAM_STR);
            $stmt->execute();
            
            $exists = $stmt->fetch(PDO::FETCH_ASSOC);
            $canUse = !$exists;
            
            $response = array(
                'orderNumber' => $orderNumber,
                'exists' => (bool)$exists,
                'canUse' => $canUse
            );
            
            if ($exists) {
                $response['existing_order'] = array(
                    'id' => (int)$exists['id'],
                    'objednatel_id' => (int)$exists['objednatel_id']
                );
            }
            
            // Pokud je číslo obsazené a je požadován návrh
            if (!$canUse && $suggest) {
                $nextNumberData = $this->generateNextOrderNumber($username);
                if ($nextNumberData) {
                    $response['suggestion'] = $nextNumberData['next_order_string'];
                }
            }
            
            return $response;
            
        } catch (Exception $e) {
            error_log("OrderV2Handler::checkOrderNumber() Error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Získá organizační data uživatele (ICO, úsek_zkr)
     * 
     * @param string $username Username uživatele
     * @return array|false Data organizace nebo false při chybě
     */
    private function getUserOrgData($username) {
        try {
            // Použij existující logiku z queries.php
            // FIX: usek_id je přímo v tabulce 25_uzivatele, ne v 25_pozice
            // FIX: tabulka se jmenuje 25_organizace_vizitka, ne 25_organizace
            $sql = "SELECT 
                        IFNULL(us.usek_zkr, '') as usek_zkr,
                        o.ico as organizace_ico
                    FROM " . $this->getUsersTableName() . " u
                    LEFT JOIN 25_useky us ON u.usek_id = us.id
                    LEFT JOIN 25_organizace_vizitka o ON u.organizace_id = o.id
                    WHERE u.username = :username AND u.aktivni = 1";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':username', $username, PDO::PARAM_STR);
            $stmt->execute();
            
            $orgData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($orgData && !empty($orgData['organizace_ico'])) {
                return array(
                    'ico' => $orgData['organizace_ico'],
                    'usek_zkr' => $orgData['usek_zkr']
                );
            }
            
            return false;
            
        } catch (Exception $e) {
            error_log("OrderV2Handler::getUserOrgData() Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Validuje délku JSON pole proti DB limitům
     * 
     * @param mixed $data Data k validaci
     * @param string $fieldName Název pole
     * @param int $maxLength Maximální délka v DB
     * @return string|null Chybová zpráva nebo null při úspěchu
     */
    private function validateJsonFieldLength($data, $fieldName, $maxLength) {
        if (isset($data[$fieldName])) {
            $json = is_array($data[$fieldName]) ? json_encode($data[$fieldName]) : (string)$data[$fieldName];
            if (strlen($json) > $maxLength) {
                return "Pole {$fieldName} překračuje maximální délku {$maxLength} znaků (aktuální: " . strlen($json) . ")";
            }
        }
        return null;
    }

    /**
     * Společná validace pro CREATE i UPDATE
     * Validuje pouze formát dat, ne jejich povinnost
     * 
     * @param array $data Data k validaci
     * @param array $errors Stávající chyby
     * @return array Array s 'valid' => bool a 'errors' => array
     */
    private function validateCommonFields($data, $errors) {
        
        // Validace JSON polí - pouze pokud jsou zadaná
        if (isset($data['strediska_kod'])) {
            if (!is_array($data['strediska_kod']) && !is_string($data['strediska_kod'])) {
                $errors[] = 'strediska_kod musí být array nebo JSON string';
            }
            // Validace délky pro TEXT pole (bez limitu, ale rozumná kontrola)
        }
        
        // Validace JSON polí s DB limity
        $jsonLengthError = $this->validateJsonFieldLength($data, 'druh_objednavky_kod', 128);
        if ($jsonLengthError) {
            $errors[] = $jsonLengthError;
        }
        
        $jsonLengthError = $this->validateJsonFieldLength($data, 'stav_workflow_kod', 256);
        if ($jsonLengthError) {
            $errors[] = $jsonLengthError;
        }
        
        $jsonLengthError = $this->validateJsonFieldLength($data, 'dodavatel_zpusob_potvrzeni', 128);
        if ($jsonLengthError) {
            $errors[] = $jsonLengthError;
        }
        
        // Validace peněžních částek - pouze pokud jsou zadané
        if (isset($data['max_cena_s_dph']) && $data['max_cena_s_dph'] !== null && $data['max_cena_s_dph'] !== '') {
            if (!is_numeric($data['max_cena_s_dph']) && !is_string($data['max_cena_s_dph'])) {
                $errors[] = 'max_cena_s_dph musí být číslo nebo string';
            } elseif (is_string($data['max_cena_s_dph']) && $data['max_cena_s_dph'] !== '' && !is_numeric($data['max_cena_s_dph'])) {
                $errors[] = 'max_cena_s_dph string musí obsahovat číselnou hodnotu';
            } elseif (is_numeric($data['max_cena_s_dph']) && (float)$data['max_cena_s_dph'] < 0) {
                $errors[] = 'max_cena_s_dph nemůže být záporná';
            }
        }
        
        // Validace dalších ID polí - pouze pokud jsou zadaná
        $idFields = ['garant_uzivatel_id', 'objednatel_id', 'odesilatel_id', 'dodavatel_id', 
                     'fakturant_id', 'dokoncil_id', 'potvrdil_vecnou_spravnost_id'];
        
        foreach ($idFields as $field) {
            if (isset($data[$field]) && $data[$field] !== null && $data[$field] !== '' && (!is_numeric($data[$field]) || $data[$field] <= 0)) {
                $errors[] = "{$field} musí být kladné číslo nebo null";
            }
        }
        
        // Validace boolean polí - pouze pokud jsou zadaná
        $boolFields = ['aktivni', 'potvrzeni_dokonceni_objednavky', 'potvrzeni_vecne_spravnosti'];
        
        foreach ($boolFields as $field) {
            if (isset($data[$field]) && $data[$field] !== null && !is_bool($data[$field]) && $data[$field] !== 0 && $data[$field] !== 1 && $data[$field] !== '0' && $data[$field] !== '1') {
                $errors[] = "{$field} musí být boolean (true/false nebo 0/1)";
            }
        }
        
        // Validace VARCHAR polí podle DB limitů
        $varcharFields = array(
            'cislo_objednavky' => 50,
            'predmet' => 255,
            'stav_objednavky' => 64,
            'schvaleni_komentar' => 255,
            'dodavatel_nazev' => 255,
            'dodavatel_adresa' => 255,
            'dodavatel_ico' => 20,
            'dodavatel_dic' => 20,
            'dodavatel_zastoupeny' => 255,
            'dodavatel_kontakt_jmeno' => 255,
            'dodavatel_kontakt_email' => 255,
            'dodavatel_kontakt_telefon' => 50,
            'misto_dodani' => 255,
            'zaruka' => 100,
            'registr_iddt' => 100
        );
        
        foreach ($varcharFields as $field => $maxLength) {
            if (isset($data[$field]) && $data[$field] !== null && is_string($data[$field]) && strlen($data[$field]) > $maxLength) {
                $errors[] = "Pole {$field} překračuje maximální délku {$maxLength} znaků (aktuální: " . strlen($data[$field]) . ")";
            }
        }
        
        return array(
            'valid' => empty($errors),
            'errors' => $errors
        );
    }
}