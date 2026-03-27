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
        error_log("🔍 [LP CERPANI SAVE] Začátek - faktura_id=$faktura_id, user_id=$user_id");
        error_log("🔍 [LP CERPANI SAVE] Počet LP záznamů: " . count($lp_cerpani));
        
        $sql_faktura = "SELECT 
            f.id, 
            f.fa_castka, 
            f.objednavka_id,
            o.financovani
        FROM " . TBL_FAKTURY . " f
        LEFT JOIN " . TBL_OBJEDNAVKY . " o ON f.objednavka_id = o.id
        WHERE f.id = ? AND f.aktivni = 1";
        
        error_log("🔍 [LP CERPANI SAVE] SQL: " . str_replace('?', $faktura_id, $sql_faktura));
        
        $stmt_faktura = $db->prepare($sql_faktura);
        $stmt_faktura->execute(array($faktura_id));
        $faktura = $stmt_faktura->fetch(PDO::FETCH_ASSOC);
        
        if (!$faktura) {
            error_log("❌ [LP CERPANI SAVE] Faktura ID $faktura_id nenalezena v DB");
            $db->rollBack();
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena'));
            return;
        }
        
        error_log("✅ [LP CERPANI SAVE] Faktura načtena: fa_castka=" . $faktura['fa_castka'] . ", objednavka_id=" . $faktura['objednavka_id']);
        
        // 2. Parse financování
        $financovani = null;
        if ($faktura['financovani']) {
            $financovani = json_decode($faktura['financovani'], true);
            error_log("🔍 [LP CERPANI SAVE] Financování: " . json_encode($financovani));
        } else {
            error_log("⚠️ [LP CERPANI SAVE] Objednávka NEMÁ financování!");
        }
        
        // 3. Validace: pokud je LP financování, MUSÍ být min. 1 LP kód
        if ($financovani && isset($financovani['typ']) && $financovani['typ'] === 'LP') {
            error_log("✅ [LP CERPANI SAVE] Detekováno LP financování - validace povinná");
            
            if (empty($lp_cerpani)) {
                error_log("❌ [LP CERPANI SAVE] Pole lp_cerpani je PRÁZDNÉ - chyba validace!");
                $db->rollBack();
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'Pro LP financování je povinné přiřadit alespoň jeden LP kód'
                ));
                return;
            }
            
            // 🔥 NOVÁ VALIDACE: LP kódy faktury MUSÍ být ze seznamu LP kódů objednávky
            if ($faktura['objednavka_id'] && isset($financovani['lp_kody']) && is_array($financovani['lp_kody'])) {
                $allowed_lp_kody = $financovani['lp_kody'];
                
                foreach ($lp_cerpani as $item) {
                    $faktura_lp_kod = trim($item['lp_cislo']);
                    
                    if (!in_array($faktura_lp_kod, $allowed_lp_kody)) {
                        $db->rollBack();
                        http_response_code(400);
                        echo json_encode(array(
                            'status' => 'error', 
                            'message' => 'LP kód "' . $faktura_lp_kod . '" není přiřazen k objednávce. Povolené LP kódy: ' . implode(', ', $allowed_lp_kody)
                        ));
                        return;
                    }
                }
            }
        }
        
        // 4. Validace: součet částek nesmí překročit fa_castka
        $suma = 0;
        foreach ($lp_cerpani as $item) {
            // ✅ Akceptovat 0 jako validní hodnotu (zálohová faktura), ale odmítnout null/undefined/prázdné
            if (!isset($item['castka']) || !is_numeric($item['castka']) || (float)$item['castka'] < 0) {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Částka musí být číslo >= 0 (0 je povoleno pro zálohové faktury)'));
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
        error_log("🔍 [LP CERPANI SAVE] Mažu existující LP čerpání pro fakturu $faktura_id");
        $sql_delete = "DELETE FROM " . TBL_FAKTURY_LP_CERPANI . " WHERE faktura_id = ?";
        $stmt_delete = $db->prepare($sql_delete);
        $stmt_delete->execute(array($faktura_id));
        $deleted_count = $stmt_delete->rowCount();
        error_log("✅ [LP CERPANI SAVE] Smazáno $deleted_count starých záznamů");
        
        // 6. Vložit nové záznamy
        error_log("🔍 [LP CERPANI SAVE] Vkládám " . count($lp_cerpani) . " nových LP záznamů");
        $sql_insert = "INSERT INTO " . TBL_FAKTURY_LP_CERPANI . " (
            faktura_id, lp_cislo, lp_id, castka, poznamka, 
            datum_pridani, pridal_user_id
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?)";
        
        $stmt_insert = $db->prepare($sql_insert);
        
        $inserted_ids = array();
        foreach ($lp_cerpani as $idx => $item) {
            error_log("🔍 [LP Row $idx] lp_cislo={$item['lp_cislo']}, lp_id={$item['lp_id']}, castka={$item['castka']}");
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
            
            $new_id = $db->lastInsertId();
            $inserted_ids[] = $new_id;
            error_log("✅ [LP Row $idx] Vloženo s ID=$new_id");
        }
        
        error_log("✅ [LP CERPANI SAVE] Celkem vloženo: " . count($inserted_ids) . " záznamů");
        
        $db->commit();
        
        // 7. Načíst zpět uložená data
        error_log("🔍 [LP CERPANI SAVE] Načítám zpět uložená data pro ověření");
        $sql_select = "SELECT * FROM " . TBL_FAKTURY_LP_CERPANI . " WHERE faktura_id = ? ORDER BY id";
        $stmt_select = $db->prepare($sql_select);
        $stmt_select->execute(array($faktura_id));
        $saved_data = $stmt_select->fetchAll(PDO::FETCH_ASSOC);
        error_log("✅ [LP CERPANI SAVE] Načteno " . count($saved_data) . " záznamů z DB");
        
        error_log("✅ [LP CERPANI SAVE] ÚSPĚCH - Vracím response s " . count($saved_data) . " záznamy");
        
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
        error_log("❌ [LP CERPANI SAVE] PDOException: " . $e->getMessage());
        error_log("❌ [LP CERPANI SAVE] Stack trace: " . $e->getTraceAsString());
        
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
            error_log("🔄 [LP CERPANI SAVE] Transaction rollback proveden");
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
        FROM " . TBL_FAKTURY_LP_CERPANI . " 
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
