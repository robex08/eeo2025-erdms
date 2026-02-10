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
// Order V3 helpery (permissions, period, parsování filtrů)
require_once __DIR__ . '/orderV3Handlers.php';

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
            f.vecna_spravnost_poznamka,
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
        require_once __DIR__ . '/environment-utils.php';
        $upload_root = $config['upload']['root_path'] ?? get_upload_root_path();
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

/**
 * 🔍 Handler: FIND ORDER PAGE V3
 * 
 * Najde stránku na které se objednávka nachází (pro scroll po návratu z editace)
 * Používá stejné filtry a třídění jako hlavní list endpoint
 * 
 * @param array $input POST data
 * @param array $config DB konfigurace
 * @return void JSON response s page number
 */
function handle_orders_v3_find_page($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $order_id = $input['order_id'] ?? 0;
    $per_page = $input['per_page'] ?? 50;
    $period = $input['period'] ?? null;
    $year = $input['year'] ?? null; // Backward compatibility
    $filters = $input['filters'] ?? [];
    $sorting = $input['sorting'] ?? [];

    error_log("🔍 [V3 FIND PAGE] Request: order_id=$order_id, per_page=$per_page, period=" . ($period ?? 'null') . ", year=" . ($year ?? 'null'));

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

        $user_id = isset($user['id']) ? (int)$user['id'] : 0;

        // Sestavit WHERE podmínky - shodné s order-v3/list
        $where_conditions = [];
        $where_params = [];

        $where_conditions[] = "o.aktivni = 1";
        $where_conditions[] = "o.id != 1";

        if (!$period && $year) {
            $period_range = [
                'date_from' => $year . '-01-01',
                'date_to' => $year . '-12-31'
            ];
        } else {
            $period_range = calculatePeriodRange($period ?? 'all');
        }

        if ($period_range !== null) {
            $where_conditions[] = "o.dt_objednavky BETWEEN ? AND ?";
            $where_params[] = $period_range['date_from'];
            $where_params[] = $period_range['date_to'];
        }

        if (!empty($filters['cislo_objednavky'])) {
            $where_conditions[] = "(
                LOWER(o.cislo_objednavky) LIKE LOWER(?)
                OR LOWER(o.predmet) LIKE LOWER(?)
                OR EXISTS(
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol
                    WHERE pol.objednavka_id = o.id
                    AND LOWER(pol.popis) LIKE LOWER(?)
                )
            )";
            $where_params[] = '%' . $filters['cislo_objednavky'] . '%';
            $where_params[] = '%' . $filters['cislo_objednavky'] . '%';
            $where_params[] = '%' . $filters['cislo_objednavky'] . '%';
        }

        if (!empty($filters['dodavatel_nazev'])) {
            $where_conditions[] = "(
                LOWER(d.nazev) LIKE LOWER(?)
                OR LOWER(o.dodavatel_nazev) LIKE LOWER(?)
                OR LOWER(o.dodavatel_adresa) LIKE LOWER(?)
                OR LOWER(o.dodavatel_kontakt_jmeno) LIKE LOWER(?)
                OR LOWER(o.dodavatel_kontakt_email) LIKE LOWER(?)
            )";
            $where_params[] = '%' . $filters['dodavatel_nazev'] . '%';
            $where_params[] = '%' . $filters['dodavatel_nazev'] . '%';
            $where_params[] = '%' . $filters['dodavatel_nazev'] . '%';
            $where_params[] = '%' . $filters['dodavatel_nazev'] . '%';
            $where_params[] = '%' . $filters['dodavatel_nazev'] . '%';
        }

        if (!empty($filters['objednatel_garant'])) {
            $where_conditions[] = "(
                LOWER(CONCAT(u1.prijmeni, ' ', u1.jmeno)) LIKE LOWER(?)
                OR LOWER(CONCAT(u2.prijmeni, ' ', u2.jmeno)) LIKE LOWER(?)
            )";
            $where_params[] = '%' . $filters['objednatel_garant'] . '%';
            $where_params[] = '%' . $filters['objednatel_garant'] . '%';
        }

        if (!empty($filters['prikazce_schvalovatel'])) {
            $where_conditions[] = "(
                LOWER(CONCAT(u3.prijmeni, ' ', u3.jmeno)) LIKE LOWER(?)
                OR LOWER(CONCAT(u4.prijmeni, ' ', u4.jmeno)) LIKE LOWER(?)
            )";
            $where_params[] = '%' . $filters['prikazce_schvalovatel'] . '%';
            $where_params[] = '%' . $filters['prikazce_schvalovatel'] . '%';
        }

        if (!empty($filters['objednatel']) && is_array($filters['objednatel'])) {
            $ids = array_map('intval', $filters['objednatel']);
            if (!empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $where_conditions[] = "o.objednatel_id IN ($placeholders)";
                foreach ($ids as $id) { $where_params[] = $id; }
            }
        }
        if (!empty($filters['garant']) && is_array($filters['garant'])) {
            $ids = array_map('intval', $filters['garant']);
            if (!empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $where_conditions[] = "o.garant_uzivatel_id IN ($placeholders)";
                foreach ($ids as $id) { $where_params[] = $id; }
            }
        }
        if (!empty($filters['prikazce']) && is_array($filters['prikazce'])) {
            $ids = array_map('intval', $filters['prikazce']);
            if (!empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $where_conditions[] = "o.prikazce_id IN ($placeholders)";
                foreach ($ids as $id) { $where_params[] = $id; }
            }
        }
        if (!empty($filters['schvalovatel']) && is_array($filters['schvalovatel'])) {
            $ids = array_map('intval', $filters['schvalovatel']);
            if (!empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $where_conditions[] = "o.schvalovatel_id IN ($placeholders)";
                foreach ($ids as $id) { $where_params[] = $id; }
            }
        }

        if (!empty($filters['stav']) && is_array($filters['stav'])) {
            $stav_map = array(
                'NOVA' => 'NOVA',
                'KE_SCHVALENI' => 'ODESLANA_KE_SCHVALENI',
                'SCHVALENA' => 'SCHVALENA',
                'ZAMITNUTA' => 'ZAMITNUTA',
                'ROZPRACOVANA' => 'ROZPRACOVANA',
                'ODESLANA' => 'ODESLANA',
                'POTVRZENA' => 'POTVRZENA',
                'K_UVEREJNENI_DO_REGISTRU' => 'UVEREJNIT',
                'UVEREJNENA' => 'UVEREJNIT',
                'FAKTURACE' => 'FAKTURACE',
                'VECNA_SPRAVNOST' => 'VECNA_SPRAVNOST',
                'ZKONTROLOVANA' => 'ZKONTROLOVANA',
                'DOKONCENA' => 'DOKONCENA',
                'ZRUSENA' => 'ZRUSENA',
                'SMAZANA' => 'SMAZANA',
                'ODESLANA_KE_SCHVALENI' => 'ODESLANA_KE_SCHVALENI',
                'UVEREJNIT' => 'UVEREJNIT',
            );

            $workflow_conditions = array();
            foreach ($filters['stav'] as $stav_key) {
                $stav_key_upper = strtoupper(trim($stav_key));
                if (empty($stav_key_upper)) {
                    continue;
                }

                $workflow_kod = $stav_map[$stav_key_upper] ?? $stav_key_upper;
                if ($workflow_kod === 'NOVA') {
                    $workflow_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = ?";
                    $where_params[] = $workflow_kod;
                } else {
                    $workflow_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = ?";
                    $where_params[] = $workflow_kod;
                }
            }

            if (!empty($workflow_conditions)) {
                $where_conditions[] = '(' . implode(' OR ', $workflow_conditions) . ')';
            }
        }

        if (!empty($filters['lp_kody']) && is_array($filters['lp_kody'])) {
            $lp_ids = array_map('intval', $filters['lp_kody']);
            $lp_conditions = array();
            foreach ($lp_ids as $lp_id) {
                $lp_conditions[] = "JSON_SEARCH(JSON_EXTRACT(o.financovani, '$.lp_kody'), 'one', CAST(? AS CHAR)) IS NOT NULL";
                $where_params[] = $lp_id;
            }
            if (!empty($lp_conditions)) {
                $where_conditions[] = '(' . implode(' OR ', $lp_conditions) . ')';
            }
        }

        $objednatel_filter = !empty($filters['objednatel_jmeno']) ? $filters['objednatel_jmeno'] : '';
        $garant_filter = !empty($filters['garant_jmeno']) ? $filters['garant_jmeno'] : '';
        if ($objednatel_filter && $garant_filter && $objednatel_filter === $garant_filter) {
            $where_conditions[] = "(CONCAT(u1.jmeno, ' ', u1.prijmeni) LIKE ? OR CONCAT(u2.jmeno, ' ', u2.prijmeni) LIKE ?)";
            $where_params[] = '%' . $objednatel_filter . '%';
            $where_params[] = '%' . $objednatel_filter . '%';
        } else {
            if ($objednatel_filter) {
                $where_conditions[] = "CONCAT(u1.jmeno, ' ', u1.prijmeni) LIKE ?";
                $where_params[] = '%' . $objednatel_filter . '%';
            }
            if ($garant_filter) {
                $where_conditions[] = "CONCAT(u2.jmeno, ' ', u2.prijmeni) LIKE ?";
                $where_params[] = '%' . $garant_filter . '%';
            }
        }

        $prikazce_filter = !empty($filters['prikazce_jmeno']) ? $filters['prikazce_jmeno'] : '';
        $schvalovatel_filter = !empty($filters['schvalovatel_jmeno']) ? $filters['schvalovatel_jmeno'] : '';
        if ($prikazce_filter && $schvalovatel_filter && $prikazce_filter === $schvalovatel_filter) {
            $where_conditions[] = "(CONCAT(u3.jmeno, ' ', u3.prijmeni) LIKE ? OR CONCAT(u4.jmeno, ' ', u4.prijmeni) LIKE ?)";
            $where_params[] = '%' . $prikazce_filter . '%';
            $where_params[] = '%' . $prikazce_filter . '%';
        } else {
            if ($prikazce_filter) {
                $where_conditions[] = "CONCAT(u3.jmeno, ' ', u3.prijmeni) LIKE ?";
                $where_params[] = '%' . $prikazce_filter . '%';
            }
            if ($schvalovatel_filter) {
                $where_conditions[] = "CONCAT(u4.jmeno, ' ', u4.prijmeni) LIKE ?";
                $where_params[] = '%' . $schvalovatel_filter . '%';
            }
        }

        if (!empty($filters['financovani'])) {
            $financovani_search = $filters['financovani'];
            $financovani_conditions = [];
            $financovani_conditions[] = "o.financovani LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            $financovani_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            $financovani_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.pojistna_udalost_cislo')) LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            $financovani_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.poznamka')) LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            $financovani_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.individualni_schvaleni')) LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';

            $search_lower = mb_strtolower($financovani_search, 'UTF-8');
            if (stripos($search_lower, 'limit') !== false ||
                stripos($search_lower, 'příslib') !== false ||
                stripos($search_lower, 'prislib') !== false) {
                $financovani_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.typ')) = 'LP'";
            }

            $financovani_conditions[] = "EXISTS (
                SELECT 1 FROM " . TBL_LIMITOVANE_PRISLIBY . " lp
                WHERE LOWER(lp.cislo_lp) LIKE LOWER(?)
                AND JSON_SEARCH(
                    JSON_EXTRACT(o.financovani, '$.lp_kody'),
                    'one',
                    CAST(lp.id AS CHAR)
                ) IS NOT NULL
            )";
            $where_params[] = '%' . $financovani_search . '%';

            $where_conditions[] = "(" . implode(" OR ", $financovani_conditions) . ")";
        }

        if (!empty($filters['moje_objednavky']) && $filters['moje_objednavky'] === true) {
            $where_conditions[] = "(o.objednatel_id = ? OR o.garant_uzivatel_id = ? OR o.prikazce_id = ? OR o.schvalovatel_id = ?)";
            $where_params[] = $user_id;
            $where_params[] = $user_id;
            $where_params[] = $user_id;
            $where_params[] = $user_id;
        }

        if (!empty($filters['mimoradne_udalosti']) && $filters['mimoradne_udalosti'] === true) {
            $where_conditions[] = "o.mimoradna_udalost = 1";
        }

        if (!empty($filters['s_fakturou']) && $filters['s_fakturou'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)";
        }

        if (!empty($filters['s_prilohami']) && $filters['s_prilohami'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p WHERE p.objednavka_id = o.id)";
        }

        if (!empty($filters['s_komentari']) && $filters['s_komentari'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom WHERE kom.objednavka_id = o.id AND kom.smazano = 0)";
        }

        if (!empty($filters['s_mymi_komentari']) && $filters['s_mymi_komentari'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom WHERE kom.objednavka_id = o.id AND kom.user_id = ? AND kom.smazano = 0)";
            $where_params[] = $user_id;
        }

        if (!empty($filters['fulltext_search'])) {
            $search_term = trim($filters['fulltext_search']);
            if ($search_term !== '') {
                $search_term_no_diacritics = $search_term;
                $search_term_no_diacritics = str_replace(['á','à','â','ä','ã','å','ā'], 'a', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['é','è','ê','ë','ē','ė','ę'], 'e', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['í','ì','î','ï','ī','į'], 'i', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['ó','ò','ô','ö','õ','ø','ō'], 'o', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['ú','ù','û','ü','ū','ů'], 'u', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['ý','ÿ'], 'y', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['č'], 'c', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['ď'], 'd', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['ň'], 'n', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['ř'], 'r', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['š'], 's', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['ť'], 't', $search_term_no_diacritics);
                $search_term_no_diacritics = str_replace(['ž'], 'z', $search_term_no_diacritics);

                $where_conditions[] = "(
                    LOWER(o.cislo_objednavky) LIKE LOWER(?) OR
                    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        o.predmet, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                        LIKE LOWER(?) OR
                    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        o.poznamka, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                        LIKE LOWER(?) OR
                    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        o.dodavatel_nazev, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                        LIKE LOWER(?) OR
                    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        CONCAT(u1.prijmeni, ' ', u1.jmeno), 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                        LIKE LOWER(?) OR
                    LOWER(u1.email) LIKE LOWER(?) OR
                    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        CONCAT(u2.prijmeni, ' ', u2.jmeno), 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                        LIKE LOWER(?) OR
                    LOWER(u2.email) LIKE LOWER(?) OR
                    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        CONCAT(u3.prijmeni, ' ', u3.jmeno), 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                        LIKE LOWER(?) OR
                    LOWER(u3.email) LIKE LOWER(?) OR
                    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        CONCAT(u4.prijmeni, ' ', u4.jmeno), 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                        LIKE LOWER(?) OR
                    LOWER(u4.email) LIKE LOWER(?) OR
                    EXISTS (
                        SELECT 1 FROM " . TBL_UZIVATELE . " ux
                        WHERE (
                            ux.id = o.uzivatel_id OR ux.id = o.uzivatel_akt_id OR ux.id = o.odesilatel_id OR
                            ux.id = o.dodavatel_potvrdil_id OR ux.id = o.zverejnil_id OR ux.id = o.fakturant_id OR
                            ux.id = o.dokoncil_id OR ux.id = o.potvrdil_vecnou_spravnost_id OR ux.id = o.zamek_uzivatel_id
                        ) AND (
                            LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                                CONCAT(ux.jmeno, ' ', ux.prijmeni), 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                                LIKE LOWER(?) OR
                            LOWER(ux.email) LIKE LOWER(?)
                        )
                    ) OR
                    EXISTS (
                        SELECT 1 FROM " . TBL_FAKTURY . " f
                        WHERE f.objednavka_id = o.id AND f.aktivni = 1 AND (
                            LOWER(f.fa_cislo_vema) LIKE LOWER(?) OR
                            LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                                f.fa_poznamka, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                                LIKE LOWER(?) OR
                            LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                                f.vecna_spravnost_poznamka, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                                LIKE LOWER(?) OR
                            LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                                f.vecna_spravnost_umisteni_majetku, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                                LIKE LOWER(?)
                        )
                    ) OR
                    EXISTS (
                        SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr
                        WHERE pr.objednavka_id = o.id AND (
                            LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                                pr.originalni_nazev_souboru, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                                LIKE LOWER(?) OR
                            LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                                pr.typ_prilohy, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                                LIKE LOWER(?)
                        )
                    ) OR
                    EXISTS (
                        SELECT 1 FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol
                        WHERE pol.objednavka_id = o.id AND (
                            LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                                pol.popis, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                                LIKE LOWER(?) OR
                            LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                                pol.poznamka, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s'))
                                LIKE LOWER(?)
                        )
                    )
                )";

                $search_pattern = '%' . $search_term . '%';
                $search_pattern_no_diacritics = '%' . strtolower($search_term_no_diacritics) . '%';
                $where_params[] = $search_pattern;
                for ($i = 0; $i < 21; $i++) {
                    $where_params[] = $search_pattern_no_diacritics;
                }
            }
        }

        if (!empty($filters['dodavatel'])) {
            $where_conditions[] = "o.dodavatel_nazev LIKE ?";
            $where_params[] = '%' . $filters['dodavatel'] . '%';
        }

        if (!empty($filters['datum_od'])) {
            $where_conditions[] = "DATE(o.dt_objednavky) >= ?";
            $where_params[] = $filters['datum_od'];
        }

        if (!empty($filters['datum_do'])) {
            $where_conditions[] = "DATE(o.dt_objednavky) <= ?";
            $where_params[] = $filters['datum_do'];
        }

        if (!empty($filters['datum_presne'])) {
            $where_conditions[] = "DATE(o.dt_objednavky) = ?";
            $where_params[] = $filters['datum_presne'];
        }

        if (!empty($filters['cena_max'])) {
            $parsed = parseOperatorValue($filters['cena_max']);
            if ($parsed) {
                $where_conditions[] = "o.max_cena_s_dph {$parsed['operator']} ?";
                $where_params[] = $parsed['value'];
            }
        }

        if (!empty($filters['cena_max_od']) && !empty($filters['cena_max_do'])) {
            $where_conditions[] = "o.max_cena_s_dph BETWEEN ? AND ?";
            $where_params[] = floatval($filters['cena_max_od']);
            $where_params[] = floatval($filters['cena_max_do']);
        } elseif (!empty($filters['cena_max_od'])) {
            $where_conditions[] = "o.max_cena_s_dph >= ?";
            $where_params[] = floatval($filters['cena_max_od']);
        } elseif (!empty($filters['cena_max_do'])) {
            $where_conditions[] = "o.max_cena_s_dph <= ?";
            $where_params[] = floatval($filters['cena_max_do']);
        }

        if (!empty($filters['cena_polozky'])) {
            $parsed = parseOperatorValue($filters['cena_polozky']);
            if ($parsed) {
                $where_conditions[] = "EXISTS (
                    SELECT 1
                    FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol
                    WHERE pol.objednavka_id = o.id
                    GROUP BY pol.objednavka_id
                    HAVING SUM(pol.cena_s_dph) {$parsed['operator']} ?
                )";
                $where_params[] = $parsed['value'];
            }
        }

        if (!empty($filters['cena_faktury'])) {
            $parsed = parseOperatorValue($filters['cena_faktury']);
            if ($parsed) {
                $where_conditions[] = "EXISTS (
                    SELECT 1
                    FROM " . TBL_FAKTURY . " f
                    WHERE f.objednavka_id = o.id AND f.aktivni = 1
                    GROUP BY f.objednavka_id
                    HAVING SUM(f.fa_castka) {$parsed['operator']} ?
                )";
                $where_params[] = $parsed['value'];
            }
        }

        if (!empty($filters['stav_registru']) && is_array($filters['stav_registru'])) {
            $stav_conditions = array();
            foreach ($filters['stav_registru'] as $stav) {
                switch ($stav) {
                    case 'publikovano':
                        $stav_conditions[] = "(o.dt_zverejneni IS NOT NULL OR o.stav_objednavky = 'Uveřejněna v registru smluv')";
                        break;
                    case 'nepublikovano':
                        $stav_conditions[] = "(o.stav_objednavky = 'Ke zveřejnění' AND o.dt_zverejneni IS NULL)";
                        break;
                    case 'nezverejnovat':
                        $stav_conditions[] = "(o.stav_objednavky = 'NEUVEREJNIT' OR (o.stav_objednavky NOT IN ('Ke zveřejnění', 'Uveřejněna v registru smluv') AND o.dt_zverejneni IS NULL))";
                        break;
                }
            }
            if (!empty($stav_conditions)) {
                $where_conditions[] = '(' . implode(' OR ', $stav_conditions) . ')';
            }
        }

        applyOrderV3UserPermissions($user_id, $db, $where_conditions, $where_params);

        $where_clause = implode(' AND ', $where_conditions);

        // Sestavit ORDER BY (shodně s list)
        $order_parts = [];
        if (!empty($sorting) && is_array($sorting)) {
            foreach ($sorting as $sort) {
                $col = $sort['id'] ?? '';
                $dir = ($sort['desc'] ?? false) ? 'DESC' : 'ASC';

                $column_mapping = [
                    'dt_objednavky' => 'o.dt_objednavky',
                    'cislo_objednavky' => 'o.cislo_objednavky',
                    'dodavatel_nazev' => 'COALESCE(o.dodavatel_nazev, d.nazev)',
                    'stav_objednavky' => 'o.stav_objednavky',
                    'cena_s_dph' => 'cena_s_dph',
                    'max_cena_s_dph' => 'o.max_cena_s_dph',
                    'faktury_celkova_castka_s_dph' => 'faktury_celkova_castka_s_dph',
                    'objednatel_garant' => 'u1.prijmeni',
                    'prikazce_schvalovatel' => 'u3.prijmeni',
                ];

                if (isset($column_mapping[$col])) {
                    $order_parts[] = $column_mapping[$col] . ' ' . $dir;
                }
            }
        }

        if (empty($order_parts)) {
            $order_parts[] = 'o.dt_objednavky DESC';
        }

        $order_clause = implode(', ', $order_parts);

        // SQL pro nalezení pozice objednávky v celém datasetu
        $sql = "SELECT position FROM (
            SELECT 
                o.id,
                ROW_NUMBER() OVER (ORDER BY $order_clause) as position
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
            LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
            LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
            WHERE $where_clause
        ) ranked
        WHERE id = :order_id";

        $stmt = $db->prepare($sql);
        $stmt->execute(array_merge($where_params, ['order_id' => $order_id]));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            // Objednávka nenalezena v datasetu (možná nesplňuje filtry)
            error_log("⚠️ [V3 FIND PAGE] Order #$order_id not found in filtered dataset");
            api_ok(null, [
                'found' => false,
                'page' => null,
                'message' => 'Objednávka nenalezena v aktuálních filtrech'
            ]);
            return;
        }

        $position = $result['position'];
        $page = (int) ceil($position / $per_page);

        error_log("✅ [V3 FIND PAGE] Order #$order_id found at position $position, page $page");

        api_ok(null, [
            'found' => true,
            'page' => $page,
            'position' => $position,
            'per_page' => $per_page
        ]);

    } catch (Exception $e) {
        error_log("❌ [V3 FIND PAGE] Error: " . $e->getMessage());
        api_error(500, 'Chyba při hledání stránky objednávky', 'SERVER_ERROR');
    }
}

/**
 * 📝 Handler: UPDATE ORDER V3
 * 
 * Aktualizuje objednávku (používá se hlavně pro schválení/zamítnutí)
 * 
 * @param array $input POST data s payload
 * @param array $config DB konfigurace
 * @return void JSON response
 */
function handle_orders_v3_update($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $payload = $input['payload'] ?? [];
    $order_id = $payload['id'] ?? 0;

    error_log("📝 [V3 ORDER UPDATE] Request: order_id=$order_id, username=$username");

    if (!$token || !$username) {
        error_log("❌ [V3 ORDER UPDATE] Missing auth");
        api_error(401, 'Chybí autentizační údaje', 'MISSING_AUTH');
        return;
    }

    if (!$order_id || !is_numeric($order_id)) {
        error_log("❌ [V3 ORDER UPDATE] Invalid order_id: $order_id");
        api_error(400, 'Chybí nebo neplatné ID objednávky', 'INVALID_ORDER_ID');
        return;
    }

    try {
        $db = get_db($config);
        TimezoneHelper::setMysqlTimezone($db);
        
        // Ověření tokenu
        $user = verify_token($token, $db);
        if (!$user) {
            error_log("❌ [V3 ORDER UPDATE] Invalid token");
            api_error(401, 'Neplatný nebo vypršelý token', 'INVALID_TOKEN');
            return;
        }

        // Build UPDATE query dynamically podle payload
        $allowed_fields = [
            'stav_objednavky',
            'stav_workflow_kod',
            'schvaleni_komentar',
            'schvalovatel_id',
            'mimoradna_udalost'
        ];

        $update_parts = [];
        $params = [];

        foreach ($allowed_fields as $field) {
            if (array_key_exists($field, $payload)) {
                $update_parts[] = "`$field` = ?";
                $params[] = $payload[$field];
            }
        }

        // ✅ AUTOMATICKÉ NASTAVENÍ dt_schvaleni při změně workflow stavu
        if (isset($payload['stav_workflow_kod'])) {
            $workflow_states = json_decode($payload['stav_workflow_kod'], true);
            if (is_array($workflow_states)) {
                // Pokud workflow obsahuje SCHVALENA, ZAMITNUTA nebo CEKA_SE
                if (in_array('SCHVALENA', $workflow_states) || 
                    in_array('ZAMITNUTA', $workflow_states) || 
                    in_array('CEKA_SE', $workflow_states)) {
                    $update_parts[] = "`dt_schvaleni` = ?";
                    $params[] = TimezoneHelper::getCzechDateTime();
                    error_log("✅ [V3 ORDER UPDATE] Auto-setting dt_schvaleni with TimezoneHelper");
                }
            }
        }

        if (empty($update_parts)) {
            error_log("❌ [V3 ORDER UPDATE] No fields to update");
            api_error(400, 'Žádná data k aktualizaci', 'NO_DATA');
            return;
        }

        // Přidej timestamp aktualizace
        $update_parts[] = "`dt_objednavky` = NOW()";
        $params[] = $order_id;

        $sql = "UPDATE `" . TBL_OBJEDNAVKY . "` 
                SET " . implode(', ', $update_parts) . "
                WHERE `id` = ?";

        error_log("🔍 [V3 ORDER UPDATE] SQL: $sql");
        error_log("🔍 [V3 ORDER UPDATE] Params: " . json_encode($params));

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        if ($stmt->rowCount() > 0) {
            error_log("✅ [V3 ORDER UPDATE] Order #$order_id updated successfully");
            api_ok('Objednávka byla aktualizována', [
                'order_id' => $order_id,
                'updated_fields' => array_keys(array_filter($payload, function($key) use ($allowed_fields) {
                    return in_array($key, $allowed_fields);
                }, ARRAY_FILTER_USE_KEY))
            ]);
        } else {
            error_log("⚠️ [V3 ORDER UPDATE] No rows affected for order #$order_id");
            api_ok('Objednávka nebyla změněna (data již aktuální)', [
                'order_id' => $order_id,
                'updated' => false
            ]);
        }

    } catch (Exception $e) {
        error_log("❌ [V3 ORDER UPDATE] Error: " . $e->getMessage());
        error_log("❌ [V3 ORDER UPDATE] Stack: " . $e->getTraceAsString());
        api_error(500, 'Chyba při aktualizaci objednávky: ' . $e->getMessage(), 'SERVER_ERROR');
    }
}
