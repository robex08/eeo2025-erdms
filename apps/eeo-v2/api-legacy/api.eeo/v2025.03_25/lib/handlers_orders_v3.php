<?php
/**
 * ============================================================================
 * HANDLERS - ORDERS V3 API
 * ============================================================================
 * 
 * Datum: 3. února 2026
 * Účel: Backend API pro Orders V3 s pagination/filtering
 * 
 * ⚠️ DŮLEŽITÉ: Tento soubor je ODDĚLENÝ od V2 API!
 * - Nesmí nijak ovlivňovat existující V2 endpointy
 * - Používá vlastní funkce a SQL dotazy
 * - Nezávislý vývoj bez rizika ovlivnění V2
 * 
 * Endpointy:
 * - POST /orders-v3/detail - Detail objednávky
 * - POST /orders-v3/items - Položky objednávky
 * - POST /orders-v3/invoices - Faktury objednávky
 * - POST /orders-v3/attachments - Přílohy objednávky
 * 
 * ============================================================================
 */

/**
 * 📋 Handler: GET ORDER DETAIL V3
 * 
 * Načte kompletní detail objednávky včetně:
 * - Základní údaje
 * - Položky (s cenami, DPH)
 * - Faktury (s příl ohami)
 * - Přílohy
 * - Workflow kroky
 * - Detail dodavatele, uživatele, organizace
 * 
 * @param array $input POST data
 * @param array $config DB konfigurace
 * @return void JSON response
 */
function handle_orders_v3_detail($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $order_id = $input['order_id'] ?? 0;

    if (!$token || !$username) {
        api_error(401, 'Chybí autentizační údaje', 'MISSING_AUTH');
        return;
    }

    if (!$order_id || !is_numeric($order_id)) {
        api_error(400, 'Chybí nebo neplatné ID objednávky', 'INVALID_ORDER_ID');
        return;
    }

    try {
        $db = get_db($config);
        
        // Ověření tokenu
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný nebo vypršelý token', 'INVALID_TOKEN');
            return;
        }

        // Načtení základních údajů objednávky
        $sql = "SELECT 
            o.*,
            u.jmeno as user_jmeno,
            u.prijmeni as user_prijmeni,
            u.email as user_email,
            d.nazev as dodavatel_nazev,
            d.ico as dodavatel_ico,
            d.adresa as dodavatel_adresa,
            org.nazev as organizace_nazev
        FROM objednavky_2025 o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN dodavatele d ON o.dodavatel_id = d.id
        LEFT JOIN organizace org ON o.organizace_id = org.id
        WHERE o.id = :order_id
        AND o.aktivni = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute(['order_id' => $order_id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            api_error(404, 'Objednávka nebyla nalezena', 'ORDER_NOT_FOUND');
            return;
        }

        // Načtení položek objednávky
        $sql_items = "SELECT 
            p.*,
            p.nazev as polozka_nazev,
            p.mnozstvi,
            p.mj,
            p.cena_jednotkova_bez_dph,
            p.cena_jednotkova_s_dph,
            p.dph_procento,
            p.cena_celkem_bez_dph,
            p.cena_celkem_s_dph,
            p.poznamka
        FROM polozky_objednavky p
        WHERE p.objednavka_id = :order_id
        AND p.aktivni = 1
        ORDER BY p.poradi ASC, p.id ASC";

        $stmt_items = $db->prepare($sql_items);
        $stmt_items->execute(['order_id' => $order_id]);
        $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

        // Načtení faktur
        $sql_invoices = "SELECT 
            f.*,
            f.cislo_faktury,
            f.datum_vystaveni,
            f.datum_splatnosti,
            f.castka_bez_dph as fa_castka_bez_dph,
            f.castka_s_dph as fa_castka_s_dph,
            f.dph_castka as fa_dph_castka,
            f.stav as faktura_stav
        FROM faktury_2025 f
        WHERE f.objednavka_id = :order_id
        AND f.aktivni = 1
        ORDER BY f.datum_vystaveni DESC";

        $stmt_invoices = $db->prepare($sql_invoices);
        $stmt_invoices->execute(['order_id' => $order_id]);
        $invoices = $stmt_invoices->fetchAll(PDO::FETCH_ASSOC);

        // Načtení příloh objednávky
        $sql_attachments = "SELECT 
            p.*,
            p.nazev_souboru,
            p.typ,
            p.velikost,
            p.dt_vytvoreni
        FROM prilohy p
        WHERE p.objednavka_id = :order_id
        AND p.aktivni = 1
        ORDER BY p.dt_vytvoreni DESC";

        $stmt_attachments = $db->prepare($sql_attachments);
        $stmt_attachments->execute(['order_id' => $order_id]);
        $attachments = $stmt_attachments->fetchAll(PDO::FETCH_ASSOC);

        // Načtení workflow kroků (pokud existují)
        $workflow_steps = [];
        try {
            $sql_workflow = "SELECT 
                w.*,
                u.jmeno as user_jmeno,
                u.prijmeni as user_prijmeni
            FROM workflow_kroky w
            LEFT JOIN users u ON w.user_id = u.id
            WHERE w.objednavka_id = :order_id
            ORDER BY w.dt_provedeni ASC";

            $stmt_workflow = $db->prepare($sql_workflow);
            $stmt_workflow->execute(['order_id' => $order_id]);
            $workflow_steps = $stmt_workflow->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            // Tabulka workflow_kroky nemusí existovat - ignorujeme
            $workflow_steps = [];
        }

        // Sestavení kompletního detailu
        $order['polozky'] = $items;
        $order['polozky_count'] = count($items);
        $order['faktury'] = $invoices;
        $order['faktury_count'] = count($invoices);
        $order['prilohy'] = $attachments;
        $order['prilohy_count'] = count($attachments);
        $order['workflow_kroky'] = $workflow_steps;

        // Výpočet celkových cen
        $total_bez_dph = 0;
        $total_s_dph = 0;
        foreach ($items as $item) {
            $total_bez_dph += floatval($item['cena_celkem_bez_dph'] ?? 0);
            $total_s_dph += floatval($item['cena_celkem_s_dph'] ?? 0);
        }

        $order['polozky_celkova_cena_bez_dph'] = $total_bez_dph;
        $order['polozky_celkova_cena_s_dph'] = $total_s_dph;

        // Vrátit detail
        api_ok(null, [
            'order' => $order,
            'loaded_at' => date('Y-m-d H:i:s')
        ]);

    } catch (PDOException $e) {
        error_log("❌ [V3 ORDER DETAIL] DB Error: " . $e->getMessage());
        api_error(500, 'Chyba databáze při načítání detailu objednávky', 'DATABASE_ERROR');
    } catch (Exception $e) {
        error_log("❌ [V3 ORDER DETAIL] Error: " . $e->getMessage());
        api_error(500, 'Neočekávaná chyba při načítání detailu objednávky', 'SERVER_ERROR');
    }
}

/**
 * 📦 Handler: GET ORDER ITEMS V3
 * 
 * Načte pouze položky objednávky
 * 
 * @param array $input POST data
 * @param array $config DB konfigurace
 * @return void JSON response
 */
function handle_orders_v3_items($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $order_id = $input['order_id'] ?? 0;

    if (!$token || !$username) {
        api_error(401, 'Chybí autentizační údaje', 'MISSING_AUTH');
        return;
    }

    if (!$order_id || !is_numeric($order_id)) {
        api_error(400, 'Chybí nebo neplatné ID objednávky', 'INVALID_ORDER_ID');
        return;
    }

    try {
        $db = get_db($config);
        
        // Ověření tokenu
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný nebo vypršelý token', 'INVALID_TOKEN');
            return;
        }

        // Načtení položek
        $sql = "SELECT 
            p.*
        FROM polozky_objednavky p
        WHERE p.objednavka_id = :order_id
        AND p.aktivni = 1
        ORDER BY p.poradi ASC, p.id ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute(['order_id' => $order_id]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        api_ok(null, [
            'items' => $items,
            'count' => count($items)
        ]);

    } catch (Exception $e) {
        error_log("❌ [V3 ORDER ITEMS] Error: " . $e->getMessage());
        api_error(500, 'Chyba při načítání položek objednávky', 'SERVER_ERROR');
    }
}

/**
 * 🧾 Handler: GET ORDER INVOICES V3
 * 
 * Načte pouze faktury objednávky
 * 
 * @param array $input POST data
 * @param array $config DB konfigurace
 * @return void JSON response
 */
function handle_orders_v3_invoices($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $order_id = $input['order_id'] ?? 0;

    if (!$token || !$username) {
        api_error(401, 'Chybí autentizační údaje', 'MISSING_AUTH');
        return;
    }

    if (!$order_id || !is_numeric($order_id)) {
        api_error(400, 'Chybí nebo neplatné ID objednávky', 'INVALID_ORDER_ID');
        return;
    }

    try {
        $db = get_db($config);
        
        // Ověření tokenu
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný nebo vypršelý token', 'INVALID_TOKEN');
            return;
        }

        // Načtení faktur
        $sql = "SELECT 
            f.*
        FROM faktury_2025 f
        WHERE f.objednavka_id = :order_id
        AND f.aktivni = 1
        ORDER BY f.datum_vystaveni DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute(['order_id' => $order_id]);
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        api_ok(null, [
            'invoices' => $invoices,
            'count' => count($invoices)
        ]);

    } catch (Exception $e) {
        error_log("❌ [V3 ORDER INVOICES] Error: " . $e->getMessage());
        api_error(500, 'Chyba při načítání faktur objednávky', 'SERVER_ERROR');
    }
}

/**
 * 📎 Handler: GET ORDER ATTACHMENTS V3
 * 
 * Načte pouze přílohy objednávky
 * 
 * @param array $input POST data
 * @param array $config DB konfigurace
 * @return void JSON response
 */
function handle_orders_v3_attachments($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $order_id = $input['order_id'] ?? 0;

    if (!$token || !$username) {
        api_error(401, 'Chybí autentizační údaje', 'MISSING_AUTH');
        return;
    }

    if (!$order_id || !is_numeric($order_id)) {
        api_error(400, 'Chybí nebo neplatné ID objednávky', 'INVALID_ORDER_ID');
        return;
    }

    try {
        $db = get_db($config);
        
        // Ověření tokenu
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný nebo vypršelý token', 'INVALID_TOKEN');
            return;
        }

        // Načtení příloh
        $sql = "SELECT 
            p.*
        FROM prilohy p
        WHERE p.objednavka_id = :order_id
        AND p.aktivni = 1
        ORDER BY p.dt_vytvoreni DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute(['order_id' => $order_id]);
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        api_ok(null, [
            'attachments' => $attachments,
            'count' => count($attachments)
        ]);

    } catch (Exception $e) {
        error_log("❌ [V3 ORDER ATTACHMENTS] Error: " . $e->getMessage());
        api_error(500, 'Chyba při načítání příloh objednávky', 'SERVER_ERROR');
    }
}
