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

// Načíst enrichment funkce z orderHandlers.php
require_once __DIR__ . '/orderHandlers.php';

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

    error_log("🔍 [V3 ORDER DETAIL] Request: order_id=$order_id, username=$username");
    error_log("🔍 [V3 ORDER DETAIL] TBL_OBJEDNAVKY defined: " . (defined('TBL_OBJEDNAVKY') ? 'YES' : 'NO'));
    error_log("🔍 [V3 ORDER DETAIL] TBL_CISELNIK_STAVY defined: " . (defined('TBL_CISELNIK_STAVY') ? 'YES' : 'NO'));

    if (!$token || !$username) {
        error_log("❌ [V3 ORDER DETAIL] Missing auth");
        api_error(401, 'Chybí autentizační údaje', 'MISSING_AUTH');
        return;
    }

    if (!$order_id || !is_numeric($order_id)) {
        error_log("❌ [V3 ORDER DETAIL] Invalid order_id: $order_id");
        api_error(400, 'Chybí nebo neplatné ID objednávky', 'INVALID_ORDER_ID');
        return;
    }

    try {
        error_log("🔌 [V3 ORDER DETAIL] Connecting to DB...");
        $db = get_db($config);
        
        // Ověření tokenu
        error_log("🔐 [V3 ORDER DETAIL] Verifying token...");
        $user = verify_token($token, $db);
        if (!$user) {
            error_log("❌ [V3 ORDER DETAIL] Invalid token");
            api_error(401, 'Neplatný nebo vypršelý token', 'INVALID_TOKEN');
            return;
        }
        error_log("✅ [V3 ORDER DETAIL] Token valid for user: " . ($user['username'] ?? 'unknown'));

        // Načtení základních údajů objednávky
        error_log("📋 [V3 ORDER DETAIL] Loading order data...");
        $sql = "SELECT 
            o.*,
            u1.jmeno as objednatel_jmeno,
            u1.prijmeni as objednatel_prijmeni,
            u1.email as objednatel_email,
            u1.titul_pred as objednatel_titul_pred,
            u1.titul_za as objednatel_titul_za,
            u2.jmeno as garant_jmeno,
            u2.prijmeni as garant_prijmeni,
            u2.email as garant_email,
            u2.titul_pred as garant_titul_pred,
            u2.titul_za as garant_titul_za,
            u3.jmeno as prikazce_jmeno,
            u3.prijmeni as prikazce_prijmeni,
            u3.email as prikazce_email,
            u3.titul_pred as prikazce_titul_pred,
            u3.titul_za as prikazce_titul_za,
            u4.jmeno as schvalovatel_jmeno,
            u4.prijmeni as schvalovatel_prijmeni,
            u4.email as schvalovatel_email,
            u4.titul_pred as schvalovatel_titul_pred,
            u4.titul_za as schvalovatel_titul_za,
            u5.jmeno as uzivatel_jmeno,
            u5.prijmeni as uzivatel_prijmeni,
            u5.email as uzivatel_email,
            u5.titul_pred as uzivatel_titul_pred,
            u5.titul_za as uzivatel_titul_za,
            u6.jmeno as odesilatel_jmeno,
            u6.prijmeni as odesilatel_prijmeni,
            u6.email as odesilatel_email,
            u6.titul_pred as odesilatel_titul_pred,
            u6.titul_za as odesilatel_titul_za,
            u7.jmeno as dodavatel_potvrdil_jmeno,
            u7.prijmeni as dodavatel_potvrdil_prijmeni,
            u7.email as dodavatel_potvrdil_email,
            u7.titul_pred as dodavatel_potvrdil_titul_pred,
            u7.titul_za as dodavatel_potvrdil_titul_za,
            u8.jmeno as zverejnil_jmeno,
            u8.prijmeni as zverejnil_prijmeni,
            u8.email as zverejnil_email,
            u8.titul_pred as zverejnil_titul_pred,
            u8.titul_za as zverejnil_titul_za,
            u9.jmeno as fakturant_jmeno,
            u9.prijmeni as fakturant_prijmeni,
            u9.email as fakturant_email,
            u9.titul_pred as fakturant_titul_pred,
            u9.titul_za as fakturant_titul_za,
            u10.jmeno as potvrdil_vecnou_spravnost_jmeno,
            u10.prijmeni as potvrdil_vecnou_spravnost_prijmeni,
            u10.email as potvrdil_vecnou_spravnost_email,
            u10.titul_pred as potvrdil_vecnou_spravnost_titul_pred,
            u10.titul_za as potvrdil_vecnou_spravnost_titul_za,
            u11.jmeno as dokoncil_jmeno,
            u11.prijmeni as dokoncil_prijmeni,
            u11.email as dokoncil_email,
            u11.titul_pred as dokoncil_titul_pred,
            u11.titul_za as dokoncil_titul_za,
            u12.jmeno as uzivatel_aktualizace_jmeno,
            u12.prijmeni as uzivatel_aktualizace_prijmeni,
            u12.email as uzivatel_aktualizace_email,
            u12.titul_pred as uzivatel_aktualizace_titul_pred,
            u12.titul_za as uzivatel_aktualizace_titul_za
        FROM " . TBL_OBJEDNAVKY . " o
        LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
        LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
        LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
        LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
        LEFT JOIN " . TBL_UZIVATELE . " u5 ON o.uzivatel_id = u5.id
        LEFT JOIN " . TBL_UZIVATELE . " u6 ON o.odesilatel_id = u6.id
        LEFT JOIN " . TBL_UZIVATELE . " u7 ON o.dodavatel_potvrdil_id = u7.id
        LEFT JOIN " . TBL_UZIVATELE . " u8 ON o.zverejnil_id = u8.id
        LEFT JOIN " . TBL_UZIVATELE . " u9 ON o.fakturant_id = u9.id
        LEFT JOIN " . TBL_UZIVATELE . " u10 ON o.potvrdil_vecnou_spravnost_id = u10.id
        LEFT JOIN " . TBL_UZIVATELE . " u11 ON o.dokoncil_id = u11.id
        LEFT JOIN " . TBL_UZIVATELE . " u12 ON o.uzivatel_akt_id = u12.id
        WHERE o.id = :order_id
        AND o.aktivni = 1";

        error_log("🔍 [V3 ORDER DETAIL] SQL: " . str_replace("\n", " ", $sql));
        $stmt = $db->prepare($sql);
        $stmt->execute(['order_id' => $order_id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            error_log("❌ [V3 ORDER DETAIL] Order not found: $order_id");
            api_error(404, 'Objednávka nebyla nalezena', 'ORDER_NOT_FOUND');
            return;
        }
        error_log("✅ [V3 ORDER DETAIL] Order found: " . ($order['predmet'] ?? 'N/A'));

        // Načtení položek objednávky
        $sql_items = "SELECT 
            p.id,
            p.popis,
            p.cena_bez_dph,
            p.sazba_dph,
            p.cena_s_dph,
            p.usek_kod,
            p.budova_kod,
            p.mistnost_kod,
            p.poznamka,
            p.lp_id,
            p.dt_vytvoreni,
            lp.cislo_lp as lppts_cislo,
            lp.nazev_uctu as lppts_nazev
        FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
        LEFT JOIN " . TBL_LIMITOVANE_PRISLIBY . " lp ON p.lp_id = lp.id
        WHERE p.objednavka_id = :order_id
        ORDER BY p.id ASC";

        $stmt_items = $db->prepare($sql_items);
        $stmt_items->execute(['order_id' => $order_id]);
        $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

        // Načtení faktur
        $sql_invoices = "SELECT 
            f.id,
            f.fa_cislo_vema,
            f.fa_datum_vystaveni,
            f.fa_datum_splatnosti,
            f.fa_castka,
            f.stav,
            f.fa_poznamka,
            f.dt_vytvoreni,
            f.vytvoril_uzivatel_id,
            f.dt_potvrzeni_vecne_spravnosti,
            f.potvrdil_vecnou_spravnost_id,
            uv.jmeno as vytvoril_jmeno,
            uv.prijmeni as vytvoril_prijmeni,
            uv.email as vytvoril_email,
            uv.titul_pred as vytvoril_titul_pred,
            uv.titul_za as vytvoril_titul_za,
            uvs.jmeno as potvrdil_vecnou_spravnost_jmeno,
            uvs.prijmeni as potvrdil_vecnou_spravnost_prijmeni,
            uvs.email as potvrdil_vecnou_spravnost_email,
            uvs.titul_pred as potvrdil_vecnou_spravnost_titul_pred,
            uvs.titul_za as potvrdil_vecnou_spravnost_titul_za
        FROM " . TBL_FAKTURY . " f
        LEFT JOIN " . TBL_UZIVATELE . " uv ON f.vytvoril_uzivatel_id = uv.id
        LEFT JOIN " . TBL_UZIVATELE . " uvs ON f.potvrdil_vecnou_spravnost_id = uvs.id
        WHERE f.objednavka_id = :order_id
        AND f.aktivni = 1
        ORDER BY f.fa_datum_vystaveni DESC";

        $stmt_invoices = $db->prepare($sql_invoices);
        $stmt_invoices->execute(['order_id' => $order_id]);
        $invoices = $stmt_invoices->fetchAll(PDO::FETCH_ASSOC);

        // Načtení příloh faktur - opravené názvy sloupců podle skutečné DB struktury
        $sql_invoice_attachments = "SELECT 
            fp.id,
            fp.faktura_id,
            fp.objednavka_id,
            fp.guid,
            fp.typ_prilohy,
            fp.originalni_nazev_souboru,
            fp.systemova_cesta,
            fp.velikost_souboru_b,
            fp.je_isdoc,
            fp.isdoc_parsed,
            fp.isdoc_data_json,
            fp.nahrano_uzivatel_id,
            fp.dt_vytvoreni,
            fp.dt_aktualizace,
            u.jmeno as nahrano_jmeno,
            u.prijmeni as nahrano_prijmeni,
            u.email as nahrano_email,
            u.titul_pred as nahrano_titul_pred,
            u.titul_za as nahrano_titul_za
        FROM " . TBL_FAKTURY_PRILOHY . " fp
        LEFT JOIN " . TBL_UZIVATELE . " u ON fp.nahrano_uzivatel_id = u.id
        INNER JOIN " . TBL_FAKTURY . " f ON fp.faktura_id = f.id
        WHERE f.objednavka_id = :order_id
        ORDER BY fp.dt_vytvoreni DESC";

        $stmt_invoice_attachments = $db->prepare($sql_invoice_attachments);
        $stmt_invoice_attachments->execute(['order_id' => $order_id]);
        $invoice_attachments = $stmt_invoice_attachments->fetchAll(PDO::FETCH_ASSOC);

        // ✅ Kontrola existence souborů pro fakturní přílohy
        // ENVIRONMENT-AWARE: Použít aktuální UPLOAD_ROOT_PATH z .env (DEV/PROD)
        $upload_root = $config['upload']['root_path'] ?? '/var/www/erdms-dev/data/eeo-v2/prilohy/';
        error_log("🔍 [V3 ORDER DETAIL] Upload root: $upload_root");
        
        foreach ($invoice_attachments as &$attachment) {
            $systemova_cesta = $attachment['systemova_cesta'] ?? '';
            
            if (empty($systemova_cesta)) {
                $file_path = '';
            } else {
                // UNIVERZÁLNÍ: Vždy použít jen název souboru (basename) + aktuální upload root
                // Funguje pro staré záznamy s plnou cestou i nové s jen názvem
                // Příklad: /var/www/erdms-platform/.../fa-xxx.pdf -> fa-xxx.pdf -> /var/www/erdms-dev/.../fa-xxx.pdf
                $filename = basename($systemova_cesta);
                $file_path = rtrim($upload_root, '/') . '/' . $filename;
            }
            
            $attachment['file_exists'] = !empty($file_path) && file_exists($file_path);
            error_log("🔍 FA priloha: " . basename($systemova_cesta) . " -> exists: " . ($attachment['file_exists'] ? 'YES' : 'NO') . " (env-aware path: $file_path)");
        }
        unset($attachment); // Uvolnění reference

        // Přiřazení příloh k fakturám
        foreach ($invoices as &$invoice) {
            $invoice['prilohy'] = [];
            foreach ($invoice_attachments as $attachment) {
                if ($attachment['faktura_id'] == $invoice['id']) {
                    $invoice['prilohy'][] = $attachment;
                }
            }
            $invoice['prilohy_count'] = count($invoice['prilohy']);
        }
        unset($invoice); // Uvolnění reference

        // Načtení příloh objednávky
        $sql_attachments = "SELECT 
            p.id,
            p.guid,
            p.originalni_nazev_souboru,
            p.systemova_cesta,
            p.typ_prilohy,
            p.velikost_souboru_b,
            p.nahrano_uzivatel_id,
            p.dt_vytvoreni,
            u.jmeno as nahral_jmeno,
            u.prijmeni as nahral_prijmeni,
            u.email as nahral_email,
            u.titul_pred as nahral_titul_pred,
            u.titul_za as nahral_titul_za
        FROM " . TBL_OBJEDNAVKY_PRILOHY . " p
        LEFT JOIN " . TBL_UZIVATELE . " u ON p.nahrano_uzivatel_id = u.id
        WHERE p.objednavka_id = :order_id
        ORDER BY p.dt_vytvoreni DESC";

        $stmt_attachments = $db->prepare($sql_attachments);
        $stmt_attachments->execute(['order_id' => $order_id]);
        $attachments = $stmt_attachments->fetchAll(PDO::FETCH_ASSOC);

        // ✅ Kontrola existence souborů pro objednávkové přílohy
        // ENVIRONMENT-AWARE: Použít stejný upload root jako pro FA přílohy
        foreach ($attachments as &$attachment) {
            $systemova_cesta = $attachment['systemova_cesta'] ?? '';
            
            if (empty($systemova_cesta)) {
                $file_path = '';
            } else {
                // UNIVERZÁLNÍ: Vždy použít jen název souboru (basename) + aktuální upload root
                $filename = basename($systemova_cesta);
                $file_path = rtrim($upload_root, '/') . '/' . $filename;
            }
            
            $attachment['file_exists'] = !empty($file_path) && file_exists($file_path);
            error_log("🔍 OBJ priloha: " . basename($systemova_cesta) . " -> exists: " . ($attachment['file_exists'] ? 'YES' : 'NO') . " (env-aware path: $file_path)");
        }
        unset($attachment); // Uvolnění reference

        // Načtení workflow kroků - DEAKTIVOVÁNO (tabulka workflow_kroky neexistuje v DB)
        $workflow_steps = [];
        // TODO: Až bude tabulka workflow_kroky vytvořena, odkomentovat a přidat TBL_* konstantu
        /*
        try {
            $sql_workflow = "SELECT 
                w.*,
                u.jmeno as user_jmeno,
                u.prijmeni as user_prijmeni
            FROM workflow_kroky w
            LEFT JOIN " . TBL_UZIVATELE . " u ON w.user_id = u.id
            WHERE w.objednavka_id = :order_id
            ORDER BY w.dt_provedeni ASC";

            $stmt_workflow = $db->prepare($sql_workflow);
            $stmt_workflow->execute(['order_id' => $order_id]);
            $workflow_steps = $stmt_workflow->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $workflow_steps = [];
        }
        */

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
            $total_bez_dph += floatval($item['cena_bez_dph'] ?? 0);
            $total_s_dph += floatval($item['cena_s_dph'] ?? 0);
        }

        $order['polozky_celkova_cena_bez_dph'] = $total_bez_dph;
        $order['polozky_celkova_cena_s_dph'] = $total_s_dph;

        // 🔥 ENRICHMENT - Obohacení dat jako ve V2
        error_log("🎨 [V3 ORDER DETAIL] Starting enrichment...");

        // 1️⃣ STŘEDISKA - načti názvy z číselníku
        if (!empty($order['strediska_kod'])) {
            $strediska_array = json_decode($order['strediska_kod'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($strediska_array)) {
                $strediska_enriched = loadStrediskaByKod($db, $strediska_array);
                if (!empty($strediska_enriched)) {
                    // Pro zobrazení: čárkou oddělený seznam názvů
                    $strediska_nazvy = array_column($strediska_enriched, 'nazev');
                    $order['strediska_nazvy'] = implode(', ', $strediska_nazvy);
                    
                    // ✅ Přidat do _enriched jako 'strediska' (ne strediska_data) - kompatibilita s frontend dialogem
                    if (!isset($order['_enriched'])) {
                        $order['_enriched'] = array();
                    }
                    $order['_enriched']['strediska'] = $strediska_enriched;
                    error_log("✅ Enriched strediska: " . $order['strediska_nazvy']);
                }
            }
        }

        // 2️⃣ FINANCOVÁNÍ - typ + LP detaily
        if (!empty($order['financovani'])) {
            $financovani_obj = json_decode($order['financovani'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($financovani_obj)) {
                // Typ financování
                if (!empty($financovani_obj['typ'])) {
                    $typ_nazev = getFinancovaniTypNazev($db, $financovani_obj['typ']);
                    if ($typ_nazev) {
                        $order['financovani_typ_nazev'] = $typ_nazev;
                        $financovani_obj['typ_nazev'] = $typ_nazev;
                    }
                    
                    // LP detaily - univerzálně pro všechny typy financování s LP kódy
                    if (!empty($financovani_obj['lp_kody']) && is_array($financovani_obj['lp_kody'])) {
                        $lp_detaily = array();
                        $lp_nazvy_string = array();
                        
                        foreach ($financovani_obj['lp_kody'] as $lp_id) {
                            $lp_detail = getLPDetaily($db, $lp_id);
                            if ($lp_detail) {
                                // Pro frontend objekty
                                $lp_detaily[] = array(
                                    'id' => $lp_id,
                                    'cislo_lp' => $lp_detail['cislo_lp'],
                                    'nazev' => $lp_detail['nazev_uctu']
                                );
                                // Pro string zobrazení
                                $lp_nazvy_string[] = $lp_detail['cislo_lp'] . ' - ' . $lp_detail['nazev_uctu'];
                            }
                        }
                        
                        if (!empty($lp_detaily)) {
                            $financovani_obj['lp_nazvy'] = $lp_detaily;
                            $order['financovani_lp_nazvy'] = implode(', ', $lp_nazvy_string);
                            error_log("✅ Enriched financování LP: " . $order['financovani_lp_nazvy']);
                        }
                    }
                    
                    // Smlouvy
                    if ($financovani_obj['typ'] === 'SMLOUVA' && !empty($financovani_obj['smlouva_id'])) {
                        enrichOrderRegistrSmluv($db, $order);
                    }
                }
                
                // Celý zobrazovací text pro financování - pouze typ, bez LP kódů
                if (!empty($order['financovani_typ_nazev'])) {
                    $order['financovani_display'] = $order['financovani_typ_nazev'];
                } else {
                    $order['financovani_display'] = json_encode($financovani_obj, JSON_UNESCAPED_UNICODE);
                }
                
                // ✅ Přidat parsovaný objekt financovani pro frontend (jako v OrderList25)
                $order['financovani'] = $financovani_obj;
            }
        }

        // 3️⃣ DRUH OBJEDNÁVKY - název z číselníku + atribut_objektu (majetek)
        if (!empty($order['druh_objednavky_kod'])) {
            $druh_kod = $order['druh_objednavky_kod'];
            // Může být JSON nebo string
            $decoded = json_decode($druh_kod, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && isset($decoded['kod_stavu'])) {
                $druh_kod = $decoded['kod_stavu'];
            }
            
            $stmt = $db->prepare("SELECT nazev_stavu, atribut_objektu FROM " . TBL_CISELNIK_STAVY . " WHERE typ_objektu = 'DRUH_OBJEDNAVKY' AND kod_stavu = :kod LIMIT 1");
            $stmt->execute(['kod' => $druh_kod]);
            $druh_data = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($druh_data) {
                $order['druh_objednavky_nazev'] = $druh_data['nazev_stavu'];
                $order['druh_objednavky_atribut'] = isset($druh_data['atribut_objektu']) ? (int)$druh_data['atribut_objektu'] : 0;
                error_log("✅ Enriched druh objednávky: " . $order['druh_objednavky_nazev'] . " (atribut: " . $order['druh_objednavky_atribut'] . ")");
            }
        }

        // 4️⃣ STAV WORKFLOW - název posledního stavu
        if (!empty($order['stav_workflow_kod'])) {
            $stav_array = json_decode($order['stav_workflow_kod'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($stav_array) && !empty($stav_array)) {
                $posledni_stav = end($stav_array);
                $stav_data = loadStavByKod($db, $posledni_stav);
                if ($stav_data) {
                    $order['stav_workflow_nazev'] = $stav_data['nazev_stavu'];
                    $order['stav_workflow_barva'] = isset($stav_data['barva']) ? $stav_data['barva'] : null;
                    error_log("✅ Enriched stav workflow: " . $order['stav_workflow_nazev']);
                }
            }
        }

        // 5️⃣ FINANCOVÁNÍ - LP/Smlouvy enrichment s budget info (pro schvalovací dialog)
        if (!empty($order['financovani'])) {
            error_log("🎨 [V3 ORDER DETAIL] Enriching financování with LP budget info...");
            enrichOrderFinancovani($db, $order);
            error_log("✅ [V3 ORDER DETAIL] Financování enriched");
        }

        error_log("🎨 [V3 ORDER DETAIL] Enrichment completed");

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
            p.id,
            p.popis,
            p.cena_bez_dph,
            p.sazba_dph,
            p.cena_s_dph,
            p.dt_vytvoreni,
            p.budova_nazev,
            p.mistnost_nazev,
            p.usek_nazev
        FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
        WHERE p.objednavka_id = :order_id
        ORDER BY p.id ASC";

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
            f.id,
            f.fa_cislo_vema,
            f.fa_datum_vystaveni,
            f.fa_datum_splatnosti,
            f.fa_castka,
            f.stav,
            f.fa_poznamka,
            f.dt_vytvoreni,
            f.vytvoril_uzivatel_id,
            f.dt_potvrzeni_vecne_spravnosti,
            f.potvrdil_vecnou_spravnost_id,
            uv.jmeno as vytvoril_jmeno,
            uv.prijmeni as vytvoril_prijmeni,
            uv.email as vytvoril_email,
            uv.titul_pred as vytvoril_titul_pred,
            uv.titul_za as vytvoril_titul_za,
            uvs.jmeno as potvrdil_vecnou_spravnost_jmeno,
            uvs.prijmeni as potvrdil_vecnou_spravnost_prijmeni,
            uvs.email as potvrdil_vecnou_spravnost_email,
            uvs.titul_pred as potvrdil_vecnou_spravnost_titul_pred,
            uvs.titul_za as potvrdil_vecnou_spravnost_titul_za
        FROM " . TBL_FAKTURY . " f
        LEFT JOIN " . TBL_UZIVATELE . " uv ON f.vytvoril_uzivatel_id = uv.id
        LEFT JOIN " . TBL_UZIVATELE . " uvs ON f.potvrdil_vecnou_spravnost_id = uvs.id
        WHERE f.objednavka_id = :order_id
        AND f.aktivni = 1
        ORDER BY f.fa_datum_vystaveni DESC";

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
            p.id,
            p.guid,
            p.originalni_nazev_souboru,
            p.systemova_cesta,
            p.typ_prilohy,
            p.velikost_souboru_b,
            p.nahrano_uzivatel_id,
            p.dt_vytvoreni,
            u.jmeno as nahral_jmeno,
            u.prijmeni as nahral_prijmeni,
            u.email as nahral_email,
            u.titul_pred as nahral_titul_pred,
            u.titul_za as nahral_titul_za
        FROM " . TBL_OBJEDNAVKY_PRILOHY . " p
        LEFT JOIN " . TBL_UZIVATELE . " u ON p.nahrano_uzivatel_id = u.id
        WHERE p.objednavka_id = :order_id
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
