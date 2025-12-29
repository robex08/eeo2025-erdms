<?php

/**
 * Faktury LP Čerpání Handlers - API pro čerpání limitovaných příslibů na fakturách
 * PHP 5.6 Compatible
 * 
 * 🎯 ÚČEL:
 * Umožňuje uživatelům při kontrole věcné správnosti faktury rozdělit částku
 * mezi více LP kódů (limitované přísl iby). Tím se sleduje skutečné čerpání
 * LP na úrovni faktur, ne jen plánované na úrovni položek objednávky.
 * 
 * 📊 TABULKA: 25a_faktury_lp_cerpani
 * 
 * 🔌 ENDPOINTY:
 * - faktury/lp-cerpani/save  → Uložit/aktualizovat LP čerpání na faktuře
 * - faktury/lp-cerpani/get   → Načíst LP čerpání pro fakturu
 * 
 * ✅ VALIDACE:
 * - Součet částek MUSÍ být ≤ fa_castka (nesmí překročit)
 * - Pokud je financování typu LP, MUSÍ být min. 1 LP kód přiřazen
 * - Každá částka MUSÍ být > 0
 * 
 * Created: 2025-12-29
 */

// Include TimezoneHelper for consistent timezone handling
require_once __DIR__ . '/TimezoneHelper.php';

/**
 * Uložit/aktualizovat LP čerpání na faktuře
 * 
 * INPUT:
 * {
 *   "username": "string",
 *   "token": "string",
 *   "faktura_id": 182,
 *   "lp_cerpani": [
 *     {"lp_cislo": "6", "lp_id": 6, "castka": 50000.00, "poznamka": ""},
 *     {"lp_cislo": "7", "lp_id": 7, "castka": 25000.00, "poznamka": ""}
 *   ]
 * }
 * 
 * OUTPUT:
 * {
 *   "status": "ok",
 *   "message": "LP čerpání uloženo",
 *   "data": {...}
 * }
 */
function handle_save_faktura_lp_cerpani($input, $config, $queries) {
    // Token verification
    $token_data = verify_token_v2($input['username'], $input['token']);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    // Validate required fields
    if (!isset($input['faktura_id']) || (int)$input['faktura_id'] <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí faktura_id'));
        return;
    }
    
    if (!isset($input['lp_cerpani']) || !is_array($input['lp_cerpani'])) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí lp_cerpani array'));
        return;
    }
    
    $faktura_id = (int)$input['faktura_id'];
    $lp_cerpani = $input['lp_cerpani'];
    $user_id = $token_data['id'];
    
    try {
        $db = get_db($config);
        TimezoneHelper::setMysqlTimezone($db);
        
        $db->beginTransaction();
        
        // 1. Načíst fakturu + objednávku (potřebujeme fa_castka + financování)
        $sql_faktura = "SELECT 
            f.id, 
            f.fa_castka, 
            f.objednavka_id,
            o.financovani
        FROM " . TBL_FAKTURY . " f
        LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
        WHERE f.id = ? AND f.aktivni = 1";
        
        $stmt_faktura = $db->prepare($sql_faktura);
        $stmt_faktura->execute(array($faktura_id));
        $faktura = $stmt_faktura->fetch(PDO::FETCH_ASSOC);
        
        if (!$faktura) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena'));
            return;
        }
        
        // 2. Parse financování
        $financovani = null;
        if ($faktura['financovani']) {
            $financovani = json_decode($faktura['financovani'], true);
        }
        
        // 3. Validace: pokud je LP financování, MUSÍ být min. 1 LP kód
        if ($financovani && isset($financovani['typ']) && $financovani['typ'] === 'LP') {
            if (empty($lp_cerpani)) {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'Pro LP financování je povinné přiřadit alespoň jeden LP kód'
                ));
                return;
            }
        }
        
        // 4. Validace: součet částek nesmí překročit fa_castka
        $suma = 0;
        foreach ($lp_cerpani as $item) {
            if (!isset($item['castka']) || (float)$item['castka'] <= 0) {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Všechny částky musí být > 0'));
                return;
            }
            
            if (!isset($item['lp_cislo']) || empty($item['lp_cislo'])) {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Chybí lp_cislo'));
                return;
            }
            
            $suma += (float)$item['castka'];
        }
        
        if ($suma > $faktura['fa_castka']) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Součet LP čerpání (' . number_format($suma, 2) . ' Kč) překračuje částku faktury (' . number_format($faktura['fa_castka'], 2) . ' Kč)'
            ));
            return;
        }
        
        // 5. Smazat stávající záznamy pro tuto fakturu
        $sql_delete = "DELETE FROM 25a_faktury_lp_cerpani WHERE faktura_id = ?";
        $stmt_delete = $db->prepare($sql_delete);
        $stmt_delete->execute(array($faktura_id));
        
        // 6. Vložit nové záznamy
        $sql_insert = "INSERT INTO 25a_faktury_lp_cerpani (
            faktura_id, lp_cislo, lp_id, castka, poznamka, 
            datum_pridani, pridal_user_id
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?)";
        
        $stmt_insert = $db->prepare($sql_insert);
        
        $inserted_ids = array();
        foreach ($lp_cerpani as $item) {
            $lp_id = isset($item['lp_id']) && (int)$item['lp_id'] > 0 ? (int)$item['lp_id'] : null;
            $poznamka = isset($item['poznamka']) && !empty($item['poznamka']) ? $item['poznamka'] : null;
            
            $stmt_insert->execute(array(
                $faktura_id,
                trim($item['lp_cislo']),
                $lp_id,
                (float)$item['castka'],
                $poznamka,
                $user_id
            ));
            
            $inserted_ids[] = $db->lastInsertId();
        }
        
        $db->commit();
        
        // 7. Načíst zpět uložená data
        $sql_select = "SELECT * FROM 25a_faktury_lp_cerpani WHERE faktura_id = ? ORDER BY id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->execute(array($faktura_id));
        $saved_data = $stmt_select->fetchAll(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'LP čerpání úspěšně uloženo (' . count($saved_data) . ' záznamů)',
            'data' => array(
                'faktura_id' => $faktura_id,
                'lp_cerpani' => $saved_data,
                'suma' => $suma,
                'fa_castka' => $faktura['fa_castka']
            )
        ));
        
    } catch (PDOException $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při ukládání LP čerpání',
            'error' => $e->getMessage()
        ));
    }
}

/**
 * Načíst LP čerpání pro fakturu
 * 
 * INPUT:
 * {
 *   "username": "string",
 *   "token": "string",
 *   "faktura_id": 182
 * }
 * 
 * OUTPUT:
 * {
 *   "status": "ok",
 *   "data": {
 *     "faktura_id": 182,
 *     "lp_cerpani": [
 *       {"id": 1, "lp_cislo": "6", "lp_id": 6, "castka": 50000.00, ...}
 *     ],
 *     "suma": 75000.00,
 *     "fa_castka": 75000.00
 *   }
 * }
 */
function handle_get_faktura_lp_cerpani($input, $config, $queries) {
    // Token verification
    $token_data = verify_token_v2($input['username'], $input['token']);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    // Validate required fields
    if (!isset($input['faktura_id']) || (int)$input['faktura_id'] <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí faktura_id'));
        return;
    }
    
    $faktura_id = (int)$input['faktura_id'];
    
    try {
        $db = get_db($config);
        TimezoneHelper::setMysqlTimezone($db);
        
        // 1. Načíst fakturu (fa_castka)
        $sql_faktura = "SELECT id, fa_castka FROM " . TBL_FAKTURY . " WHERE id = ? AND aktivni = 1";
        $stmt_faktura = $db->prepare($sql_faktura);
        $stmt_faktura->execute(array($faktura_id));
        $faktura = $stmt_faktura->fetch(PDO::FETCH_ASSOC);
        
        if (!$faktura) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena'));
            return;
        }
        
        // 2. Načíst LP čerpání
        $sql_cerpani = "SELECT 
            id, faktura_id, lp_cislo, lp_id, castka, poznamka,
            datum_pridani, pridal_user_id, datum_upravy, upravil_user_id
        FROM 25a_faktury_lp_cerpani 
        WHERE faktura_id = ? 
        ORDER BY id";
        
        $stmt_cerpani = $db->prepare($sql_cerpani);
        $stmt_cerpani->execute(array($faktura_id));
        $lp_cerpani = $stmt_cerpani->fetchAll(PDO::FETCH_ASSOC);
        
        // 3. Vypočítat součet
        $suma = 0;
        foreach ($lp_cerpani as $item) {
            $suma += (float)$item['castka'];
        }
        
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'faktura_id' => $faktura_id,
                'lp_cerpani' => $lp_cerpani,
                'suma' => $suma,
                'fa_castka' => $faktura['fa_castka']
            )
        ));
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání LP čerpání',
            'error' => $e->getMessage()
        ));
    }
}

?>
