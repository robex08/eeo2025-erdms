<?php

// Include api.php for TBL_ constants

// Define table names for new order queries - PHP 5.6 compatible
function get_orders_table_name() {
    return TBL_OBJEDNAVKY;
}

function get_order_items_table_name() {
    return TBL_OBJEDNAVKY_POLOZKY;
}

function get_order_attachments_table_name() {
    return TBL_OBJEDNAVKY_PRILOHY;
}

function get_states_table_name() {
    return TBL_CISELNIK_STAVY;
}

function get_users_table_name() {
    return TBL_UZIVATELE;
}

function get_invoices_table_name() {
    return TBL_FAKTURY;
}

function get_invoice_attachments_table_name() {
    return TBL_FAKTURY_PRILOHY;
}

// ========== SELECT QUERIES ==========

// Select all orders without conditions (only active)
function selectAllOrdersQuery() {
    return "SELECT * FROM " . get_orders_table_name() . " WHERE aktivni = 1 ORDER BY dt_vytvoreni DESC";
}

// Select all orders with optional year filter (by dt_aktualizace, only active)
function selectAllOrdersWithYearFilterQuery() {
    // Now supports optional :rok (year) and optional :mesic_od/:mesic_do (month range) filters by dt_vytvoreni
    return "SELECT * FROM " . get_orders_table_name() . " WHERE aktivni = 1 AND (:rok IS NULL OR YEAR(dt_vytvoreni) = :rok) AND (:mesic_od IS NULL OR MONTH(dt_vytvoreni) >= :mesic_od) AND (:mesic_do IS NULL OR MONTH(dt_vytvoreni) <= :mesic_do) ORDER BY dt_vytvoreni DESC";
}

// Select order by ID (only active)
function selectOrderByIdQuery() {
    return "SELECT * FROM " . get_orders_table_name() . " WHERE id = :id AND aktivni = 1";
}

// Select orders by user ID (where user is objednatel or garant, only active)
function selectOrdersByUserIdQuery() {
    return "SELECT * FROM " . get_orders_table_name() . " WHERE aktivni = 1 AND (objednatel_id = :uzivatel_id OR garant_uzivatel_id = :uzivatel_id) ORDER BY dt_vytvoreni DESC";
}

// Select orders by user ID with optional year filter (by dt_aktualizace, where user is objednatel or garant, only active)
function selectOrdersByUserIdWithYearFilterQuery() {
    // Supports optional :rok (year) and optional :mesic_od/:mesic_do (month range) filters by dt_vytvoreni
    return "SELECT * FROM " . get_orders_table_name() . " WHERE aktivni = 1 AND (objednatel_id = :uzivatel_id OR garant_uzivatel_id = :uzivatel_id) AND (:rok IS NULL OR YEAR(dt_vytvoreni) = :rok) AND (:mesic_od IS NULL OR MONTH(dt_vytvoreni) >= :mesic_od) AND (:mesic_do IS NULL OR MONTH(dt_vytvoreni) <= :mesic_do) ORDER BY dt_vytvoreni DESC";
}

// Select order status info by ID and user ID (lightweight query, where user is objednatel or garant, only active)
function selectOrderStatusByIdAndUserQuery() {
    return "SELECT id, stav_objednavky, stav_workflow_kod, uzivatel_id, objednatel_id, garant_uzivatel_id FROM " . get_orders_table_name() . " WHERE id = :id AND aktivni = 1 AND (objednatel_id = :uzivatel_id OR garant_uzivatel_id = :uzivatel_id)";
}

// Select order count by user ID (who created the order)
function selectOrderCountByUserQuery() {
    return "SELECT COUNT(*) as total_count FROM " . get_orders_table_name() . " WHERE uzivatel_id = :user_id AND aktivni = 1";
}

// Select order items by order ID
function selectOrderItemsByOrderIdQuery() {
    return "SELECT * FROM " . get_order_items_table_name() . " WHERE objednavka_id = :objednavka_id ORDER BY id";
}

// ADMIN FUNCTIONS - Select orders including deactivated ones

// Select order by ID inmuzeme to asi sjednodusitcluding deactivated (for admin/soft-delete purposes)
function selectOrderByIdIncludingInactiveQuery() {
    return "SELECT * FROM " . get_orders_table_name() . " WHERE id = :id";
}

// Select all orders including deactivated (for admin purposes)  
function selectAllOrdersIncludingInactiveQuery() {
    return "SELECT * FROM " . get_orders_table_name() . " ORDER BY dt_vytvoreni DESC";
}

// ========== INSERT QUERIES ==========

// Insert new order
function insertOrderQuery() {
    return "INSERT INTO " . get_orders_table_name() . " (
            cislo_objednavky, dt_objednavky, predmet, strediska_kod, 
            max_cena_s_dph, mimoradna_udalost, financovani, druh_objednavky_kod, stav_workflow_kod, stav_objednavky,
            uzivatel_id, uzivatel_akt_id, garant_uzivatel_id, objednatel_id, 
            schvalovatel_id, prikazce_id, dt_schvaleni, schvaleni_komentar,
            dodavatel_id, dodavatel_nazev, dodavatel_adresa, dodavatel_ico, 
            dodavatel_dic, dodavatel_zastoupeny, dodavatel_kontakt_jmeno, 
            dodavatel_kontakt_email, dodavatel_kontakt_telefon, 
            dt_predpokladany_termin_dodani, misto_dodani, zaruka, dt_odeslani,
            odeslani_storno_duvod, dodavatel_zpusob_potvrzeni, dt_akceptace, dt_zverejneni,
            registr_iddt, poznamka,
            zverejnil_id, potvrdil_vecnou_spravnost_id, dt_potvrzeni_vecne_spravnosti,
            vecna_spravnost_umisteni_majetku, vecna_spravnost_poznamka, potvrzeni_vecne_spravnosti,
            potvrzeni_dokonceni_objednavky,
            dt_vytvoreni, dt_aktualizace,
            dt_zamek, zamek_uzivatel_id, aktivni,
            odesilatel_id, dodavatel_potvrdil_id, fakturant_id, dt_faktura_pridana,
            dokoncil_id, dt_dokonceni, dokonceni_poznamka
        ) VALUES (
            :cislo_objednavky, :dt_objednavky, :predmet, :strediska_kod, 
            :max_cena_s_dph, :mimoradna_udalost, :financovani, :druh_objednavky_kod, :stav_workflow_kod, :stav_objednavky,
            :uzivatel_id, :uzivatel_akt_id, :garant_uzivatel_id, :objednatel_id, 
            :schvalovatel_id, :prikazce_id, :dt_schvaleni, :schvaleni_komentar,
            :dodavatel_id, :dodavatel_nazev, :dodavatel_adresa, :dodavatel_ico, 
            :dodavatel_dic, :dodavatel_zastoupeny, :dodavatel_kontakt_jmeno, 
            :dodavatel_kontakt_email, :dodavatel_kontakt_telefon, 
            :dt_predpokladany_termin_dodani, :misto_dodani, :zaruka, :dt_odeslani,
            :odeslani_storno_duvod, :dodavatel_zpusob_potvrzeni, :dt_akceptace, :dt_zverejneni,
            :registr_iddt, :poznamka,
            :zverejnil_id, :potvrdil_vecnou_spravnost_id, :dt_potvrzeni_vecne_spravnosti,
            :vecna_spravnost_umisteni_majetku, :vecna_spravnost_poznamka, :potvrzeni_vecne_spravnosti,
            :potvrzeni_dokonceni_objednavky,
            :dt_vytvoreni, :dt_aktualizace,
            :dt_zamek, :zamek_uzivatel_id, :aktivni,
            :odesilatel_id, :dodavatel_potvrdil_id, :fakturant_id, :dt_faktura_pridana,
            :dokoncil_id, :dt_dokonceni, :dokonceni_poznamka
        )";
}

// Insert order item (zjednodušeno - 3 kódy + poznamka)
function insertOrderItemQuery() {
    return "INSERT INTO " . get_order_items_table_name() . " (
        objednavka_id, popis, cena_bez_dph, sazba_dph, cena_s_dph,
        usek_kod, budova_kod, mistnost_kod, poznamka
    ) VALUES (
        :objednavka_id, :popis, :cena_bez_dph, :sazba_dph, :cena_s_dph,
        :usek_kod, :budova_kod, :mistnost_kod, :poznamka
    )";
}

// Insert multiple order items at once (batch insert) - zjednodušeno na 3 kódy + poznamka
function insertOrderItemsBatchQuery($itemsCount) {
    $values = [];
    for ($i = 0; $i < $itemsCount; $i++) {
        $values[] = "(:objednavka_id, :popis_{$i}, :cena_bez_dph_{$i}, :sazba_dph_{$i}, :cena_s_dph_{$i}, :usek_kod_{$i}, :budova_kod_{$i}, :mistnost_kod_{$i}, :poznamka_{$i}, :lp_id_{$i}, NOW(), NOW())";
    }
    
    return "INSERT INTO " . get_order_items_table_name() . " (
        objednavka_id, popis, cena_bez_dph, sazba_dph, cena_s_dph, 
        usek_kod, budova_kod, mistnost_kod, poznamka, lp_id,
        dt_vytvoreni, dt_aktualizace
    ) VALUES " . implode(', ', $values);
}

// Update order item by ID (zjednodušeno na 3 kódy + poznamka)
function updateOrderItemByIdQuery() {
    return "UPDATE " . get_order_items_table_name() . " SET 
        popis = :popis,
        cena_bez_dph = :cena_bez_dph,
        sazba_dph = :sazba_dph,
        cena_s_dph = :cena_s_dph,
        usek_kod = :usek_kod,
        budova_kod = :budova_kod,
        mistnost_kod = :mistnost_kod,
        poznamka = :poznamka,
        dt_aktualizace = NOW()
    WHERE id = :id AND objednavka_id = :objednavka_id";
}

// Insert order attachment
function insertOrderAttachmentQuery() {
    return "INSERT INTO " . get_order_attachments_table_name() . " (
        objednavka_id, guid, typ_prilohy, originalni_nazev_souboru, 
        systemova_cesta, velikost_souboru_b, nahrano_uzivatel_id
    ) VALUES (
        :objednavka_id, :guid, :typ_prilohy, :originalni_nazev_souboru, 
        :systemova_cesta, :velikost_souboru_b, :nahrano_uzivatel_id
    )";
}

// ========== UPDATE QUERIES ==========

// Update order by ID
function updateOrderByIdQuery() {
    return "UPDATE " . get_orders_table_name() . " SET 
        dt_objednavky = :dt_objednavky,
        predmet = :predmet,
        strediska_kod = :strediska_kod,
        max_cena_s_dph = :max_cena_s_dph,
        mimoradna_udalost = :mimoradna_udalost,
        financovani = :financovani,
        druh_objednavky_kod = :druh_objednavky_kod,
        stav_workflow_kod = :stav_workflow_kod,
        stav_objednavky = :stav_objednavky,
        uzivatel_akt_id = :uzivatel_akt_id,
        garant_uzivatel_id = :garant_uzivatel_id,
        objednatel_id = :objednatel_id,
        schvalovatel_id = :schvalovatel_id,
        prikazce_id = :prikazce_id,
        dt_schvaleni = :dt_schvaleni,
        schvaleni_komentar = :schvaleni_komentar,
        dodavatel_id = :dodavatel_id,
        dodavatel_nazev = :dodavatel_nazev,
        dodavatel_adresa = :dodavatel_adresa,
        dodavatel_ico = :dodavatel_ico,
        dodavatel_dic = :dodavatel_dic,
        dodavatel_zastoupeny = :dodavatel_zastoupeny,
        dodavatel_kontakt_jmeno = :dodavatel_kontakt_jmeno,
        dodavatel_kontakt_email = :dodavatel_kontakt_email,
        dodavatel_kontakt_telefon = :dodavatel_kontakt_telefon,
        dt_predpokladany_termin_dodani = :dt_predpokladany_termin_dodani,
        misto_dodani = :misto_dodani,
        zaruka = :zaruka,
        dt_odeslani = :dt_odeslani,
        odeslani_storno_duvod = :odeslani_storno_duvod,
        dodavatel_zpusob_potvrzeni = :dodavatel_zpusob_potvrzeni,
        dt_akceptace = :dt_akceptace,
        dt_zverejneni = :dt_zverejneni,
        registr_iddt = :registr_iddt,
        poznamka = :poznamka,
        zverejnil_id = :zverejnil_id,
        potvrdil_vecnou_spravnost_id = :potvrdil_vecnou_spravnost_id,
        dt_potvrzeni_vecne_spravnosti = :dt_potvrzeni_vecne_spravnosti,
        aktivni = :aktivni,
        odesilatel_id = :odesilatel_id,
        dodavatel_potvrdil_id = :dodavatel_potvrdil_id,
        fakturant_id = :fakturant_id,
        dt_faktura_pridana = :dt_faktura_pridana,
        dokoncil_id = :dokoncil_id,
        dt_dokonceni = :dt_dokonceni,
        dokonceni_poznamka = :dokonceni_poznamka,
        potvrzeni_dokonceni_objednavky = :potvrzeni_dokonceni_objednavky,
        vecna_spravnost_umisteni_majetku = :vecna_spravnost_umisteni_majetku,
        vecna_spravnost_poznamka = :vecna_spravnost_poznamka,
        potvrzeni_vecne_spravnosti = :potvrzeni_vecne_spravnosti,
        dt_aktualizace = NOW()
    WHERE id = :id";
}

// ========== DELETE QUERIES ==========

// Delete order attachments by order ID (for cleanup before deleting order)
function deleteOrderAttachmentsByOrderIdQuery() {
    return "DELETE FROM " . get_order_attachments_table_name() . " WHERE objednavka_id = :objednavka_id";
}

// Delete order items by order ID (for cleanup before deleting order)
function deleteOrderItemsByOrderIdQuery() {
    return "DELETE FROM " . get_order_items_table_name() . " WHERE objednavka_id = :objednavka_id";
}

// Delete order by ID (main order deletion)
function deleteOrderByIdQuery() {
    return "DELETE FROM " . get_orders_table_name() . " WHERE id = :id";
}

// Select attachment file paths for deletion from disk
function selectAttachmentPathsForDeletionQuery() {
    return "SELECT systemova_cesta FROM " . get_order_attachments_table_name() . " WHERE objednavka_id = :objednavka_id";
}

// Soft delete order - mark as inactive (aktivni = 0)
function softDeleteOrderByIdQuery() {
    return "UPDATE " . get_orders_table_name() . " SET 
        aktivni = 0,
        dt_aktualizace = NOW()
    WHERE id = :id";
}

// Hard delete order with all related data (complete cleanup)
// Step 1: Get attachment file paths before deletion
function selectOrderAttachmentsWithPathsQuery() {
    return "SELECT id, systemova_cesta, originalni_nazev_souboru 
            FROM " . get_order_attachments_table_name() . " 
            WHERE objednavka_id = :objednavka_id";
}

// Step 2: Delete all attachments records
function deleteAllOrderAttachmentsQuery() {
    return "DELETE FROM " . get_order_attachments_table_name() . " WHERE objednavka_id = :objednavka_id";
}

// Step 3: Delete all order items
function deleteAllOrderItemsQuery() {
    return "DELETE FROM " . get_order_items_table_name() . " WHERE objednavka_id = :objednavka_id";
}

// Step 4: Delete main order record
function hardDeleteOrderByIdQuery() {
    return "DELETE FROM " . get_orders_table_name() . " WHERE id = :id";
}

// ========== ADDITIONAL HELPER QUERIES ==========

// Get last inserted order ID
function getLastInsertIdQuery() {
    return "SELECT LAST_INSERT_ID() as last_id";
}

// Check if order exists
function checkOrderExistsQuery() {
    return "SELECT COUNT(*) as count FROM " . get_orders_table_name() . " WHERE id = :id";
}

// Check if user owns order
function checkUserOwnsOrderQuery() {
    return "SELECT COUNT(*) as count FROM " . get_orders_table_name() . " WHERE id = :id AND uzivatel_id = :uzivatel_id";
}

// ========== STATES QUERIES (25_ciselnik_stavy) ==========

// Select state by ID
function selectStateByIdQuery() {
    return "SELECT * FROM " . get_states_table_name() . " WHERE id = :id";
}

// Select states by object type and state code
function selectStatesByTypeAndCodeQuery() {
    return "SELECT * FROM " . get_states_table_name() . " WHERE typ_objektu = :typ_objektu AND kod_stavu = :kod_stavu ORDER BY nazev_stavu";
}

// Select states by parent state code
function selectStatesByParentCodeQuery() {
    return "SELECT * FROM " . get_states_table_name() . " WHERE nadrazeny_kod_stavu = :nadrazeny_kod_stavu ORDER BY nazev_stavu";
}

// Select all states by object type
function selectStatesByObjectTypeQuery() {
    return "SELECT * FROM " . get_states_table_name() . " WHERE typ_objektu = :typ_objektu ORDER BY nazev_stavu";
}

// Select all states
function selectAllStatesQuery() {
    return "SELECT * FROM " . get_states_table_name() . " ORDER BY typ_objektu, nazev_stavu";
}

// ========== LOCK QUERIES ==========

// Select order by ID with lock information for editing
function selectOrderByIdForEditQuery() {
    return "SELECT o.*, 
            CASE 
                WHEN o.dt_zamek IS NULL OR o.zamek_uzivatel_id = 0 THEN 'unlocked'
                WHEN TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) > 15 THEN 'expired'
                WHEN o.zamek_uzivatel_id = :current_user_id THEN 'owned'
                ELSE 'locked'
            END as lock_status,
            TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as lock_age_minutes,
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
            ) as locked_by_user_fullname,
            u_lock.titul_pred as locked_by_user_titul_pred,
            u_lock.titul_za as locked_by_user_titul_za,
            u_lock.email as locked_by_user_email,
            u_lock.telefon as locked_by_user_telefon
            FROM " . get_orders_table_name() . " o
            LEFT JOIN " . get_users_table_name() . " u_lock ON o.zamek_uzivatel_id = u_lock.id
            WHERE o.id = :id AND o.aktivni = 1";
}

// Lock order for editing
function lockOrderForEditingQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET dt_zamek = NOW(), 
                zamek_uzivatel_id = :user_id 
            WHERE id = :id";
}

// Unlock order (clear lock)
function unlockOrderQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET dt_zamek = NULL, 
                zamek_uzivatel_id = 0 
            WHERE id = :id";
}

// Lock order for editing
function lockOrderQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET dt_zamek = NOW(), 
                zamek_uzivatel_id = :user_id 
            WHERE id = :id";
}

// Refresh lock (extend lock time)
function refreshLockQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET dt_zamek = NOW() 
            WHERE id = :id AND zamek_uzivatel_id = :user_id";
}

// ========== ATTACHMENT QUERIES ==========

// Select attachments by order ID
function selectAttachmentsByOrderIdQuery() {
    return "SELECT * FROM " . get_order_attachments_table_name() . " 
            WHERE objednavka_id = :objednavka_id ORDER BY dt_vytvoreni";
}

// Select attachment by ID
function selectAttachmentByIdQuery() {
    return "SELECT * FROM " . get_order_attachments_table_name() . " 
            WHERE id = :id";
}

// Select attachment by GUID
function selectAttachmentByGuidQuery() {
    return "SELECT * FROM " . get_order_attachments_table_name() . " 
            WHERE guid = :guid LIMIT 1";
}

// Update attachment
function updateAttachmentQuery() {
    return "UPDATE " . get_order_attachments_table_name() . " 
            SET typ_prilohy = :typ_prilohy, dt_aktualizace = NOW() 
            WHERE id = :id";
}

// Delete attachment by ID
function deleteAttachmentByIdQuery() {
    return "DELETE FROM " . get_order_attachments_table_name() . " 
            WHERE id = :id";
}

// Delete attachment by GUID
function deleteAttachmentByGuidQuery() {
    return "DELETE FROM " . get_order_attachments_table_name() . " 
            WHERE guid = :guid";
}

// ========== WORKFLOW TRACKING QUERIES ==========

// Update order - send to supplier (odeslani)
function updateOrderSendToSupplierQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET dt_odeslani = NOW(),
                odesilatel_id = :odesilatel_id,
                stav_workflow_kod = :stav_workflow_kod,
                dt_aktualizace = NOW(),
                uzivatel_akt_id = :uzivatel_akt_id
            WHERE id = :id AND aktivni = 1";
}

// Update order - cancel (storno)
function updateOrderCancelQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET dt_odeslani = NOW(),
                odesilatel_id = :odesilatel_id,
                odeslani_storno_duvod = :odeslani_storno_duvod,
                stav_workflow_kod = :stav_workflow_kod,
                stav_objednavky = 'STORNO',
                dt_aktualizace = NOW(),
                uzivatel_akt_id = :uzivatel_akt_id
            WHERE id = :id AND aktivni = 1";
}

// Update order - confirm acceptance (potvrzeni akceptace)
function updateOrderConfirmAcceptanceQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET dt_akceptace = NOW(),
                dodavatel_potvrdil_id = :dodavatel_potvrdil_id,
                dodavatel_zpusob_potvrzeni = :dodavatel_zpusob_potvrzeni,
                stav_workflow_kod = :stav_workflow_kod,
                dt_aktualizace = NOW(),
                uzivatel_akt_id = :uzivatel_akt_id
            WHERE id = :id AND aktivni = 1";
}

// Update order - add invoice (fakturace - FAZE 5)
function updateOrderAddInvoiceQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET fakturant_id = :fakturant_id,
                dt_faktura_pridana = NOW(),
                cislo_faktury = :cislo_faktury,
                datum_faktury = :datum_faktury,
                castka_bez_dph = :castka_bez_dph,
                castka_s_dph = :castka_s_dph,
                dt_aktualizace = NOW(),
                uzivatel_akt_id = :uzivatel_akt_id
            WHERE id = :id AND aktivni = 1";
}

// Update order - complete order (dokonceni)
function updateOrderCompleteQuery() {
    return "UPDATE " . get_orders_table_name() . " 
            SET dt_dokonceni = NOW(),
                dokoncil_id = :dokoncil_id,
                dokonceni_poznamka = :dokonceni_poznamka,
                stav_workflow_kod = :stav_workflow_kod,
                stav_objednavky = 'DOKONCENA',
                dt_aktualizace = NOW(),
                uzivatel_akt_id = :uzivatel_akt_id
            WHERE id = :id AND aktivni = 1";
}

// ========== FAKTURY QUERIES - MySQL 5.5.46 kompatibilní ==========

// Select all invoices for order
function selectInvoicesByOrderIdQuery() {
    return "SELECT * FROM " . get_invoices_table_name() . " 
            WHERE objednavka_id = :objednavka_id AND aktivni = 1 
            ORDER BY dt_vytvoreni DESC";
}

// Select invoice by ID
function selectInvoiceByIdQuery() {
    return "SELECT * FROM " . get_invoices_table_name() . " 
            WHERE id = :id AND aktivni = 1";
}

// Insert new invoice - EXPLICITNĚ nastavujeme dt_vytvoreni pro MySQL 5.5.46
function insertInvoiceQuery() {
    return "INSERT INTO " . get_invoices_table_name() . " (
                objednavka_id, fa_dorucena, fa_datum_vystaveni, fa_datum_splatnosti, 
                fa_datum_doruceni, fa_castka, fa_cislo_vema, fa_stredisko_kod, 
                fa_poznamka, rozsirujici_data, vytvoril_uzivatel_id, dt_vytvoreni, aktivni
            ) VALUES (
                :objednavka_id, :fa_dorucena, :fa_datum_vystaveni, :fa_datum_splatnosti,
                :fa_datum_doruceni, :fa_castka, :fa_cislo_vema, :fa_stredisko_kod,
                :fa_poznamka, :rozsirujici_data, :vytvoril_uzivatel_id, NOW(), 1
            )";
}

// Update invoice - EXPLICITNĚ nastavujeme dt_aktualizace pro MySQL 5.5.46
function updateInvoiceByIdQuery() {
    return "UPDATE " . get_invoices_table_name() . " SET 
                fa_dorucena = :fa_dorucena,
                fa_datum_vystaveni = :fa_datum_vystaveni,
                fa_datum_splatnosti = :fa_datum_splatnosti,
                fa_datum_doruceni = :fa_datum_doruceni,
                fa_castka = :fa_castka,
                fa_cislo_vema = :fa_cislo_vema,
                fa_stredisko_kod = :fa_stredisko_kod,
                fa_poznamka = :fa_poznamka,
                rozsirujici_data = :rozsirujici_data,
                dt_aktualizace = NOW()
            WHERE id = :id AND aktivni = 1";
}

// Soft delete invoice
function softDeleteInvoiceQuery() {
    return "UPDATE " . get_invoices_table_name() . " SET 
                aktivni = 0, 
                dt_aktualizace = NOW() 
            WHERE id = :id";
}