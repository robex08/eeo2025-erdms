<?php

require_once __DIR__ . '/../../api.php';
// ========================================
// CHAT SYSTÉM - SQL QUERIES
// Pro přidání do queries.php
// ========================================

// === KONSTANTY PRO TABULKY ===
define('TBL_CHAT_KONVERZACE', '25_chat_konverzace');
define('TBL_CHAT_UCASTNICI', '25_chat_ucastnici');
define('TBL_CHAT_ZPRAVY', '25_chat_zpravy');
define('TBL_CHAT_PRECTENE_ZPRAVY', '25_chat_prectene_zpravy');
define('TBL_CHAT_MENTIONS', '25_chat_mentions');
define('TBL_CHAT_REAKCE', '25_chat_reakce');
define('TBL_CHAT_ONLINE_STATUS', '25_chat_online_status');

// ========================================
// KONVERZACE QUERIES
// ========================================

// Načtení všech konverzací pro uživatele
$queries['chat_konverzace_select_by_user'] = "
    SELECT 
        k.*,
        COUNT(DISTINCT u.user_id) as pocet_ucastniku,
        (SELECT COUNT(*) FROM ".TBL_CHAT_ZPRAVY." z 
         WHERE z.konverzace_id = k.id AND z.smazano = 0) as pocet_zprav,
        (SELECT COUNT(*) FROM ".TBL_CHAT_ZPRAVY." z 
         WHERE z.konverzace_id = k.id AND z.smazano = 0 
         AND z.dt_vytvoreni > COALESCE(muj.dt_posledni_precteni, '1970-01-01')) as neprectenych_zprav
    FROM ".TBL_CHAT_KONVERZACE." k
    LEFT JOIN ".TBL_CHAT_UCASTNICI." u ON k.id = u.konverzace_id AND u.aktivni = 1
    LEFT JOIN ".TBL_CHAT_UCASTNICI." muj ON k.id = muj.konverzace_id AND muj.user_id = :user_id AND muj.aktivni = 1
    WHERE k.aktivni = 1 
    AND (
        k.typ = 'BROADCAST' OR
        muj.user_id IS NOT NULL OR
        (k.typ = 'USEK' AND k.usek_id IN (
            SELECT us.id FROM ".TBL_USEKY." us 
            JOIN ".TBL_POZICE." p ON us.id = p.usek_id 
            JOIN ".TBL_UZIVATELE." uz ON p.id = uz.pozice_id 
            WHERE uz.id = :user_id
        ))
    )
    GROUP BY k.id
    ORDER BY k.dt_posledni_zprava DESC, k.dt_vytvoreni DESC
";

// Načtení konkrétní konverzace s detaily
$queries['chat_konverzace_select_by_id'] = "
    SELECT 
        k.*,
        CONCAT_WS(' ', u_creator.titul_pred, u_creator.jmeno, u_creator.prijmeni, u_creator.titul_za) as creator_jmeno,
        us.usek_nazev,
        COUNT(DISTINCT ucast.user_id) as pocet_ucastniku
    FROM ".TBL_CHAT_KONVERZACE." k
    LEFT JOIN ".TBL_UZIVATELE." u_creator ON k.created_by_user_id = u_creator.id
    LEFT JOIN ".TBL_USEKY." us ON k.usek_id = us.id
    LEFT JOIN ".TBL_CHAT_UCASTNICI." ucast ON k.id = ucast.konverzace_id AND ucast.aktivni = 1
    WHERE k.id = :konverzace_id AND k.aktivni = 1
    GROUP BY k.id
";

// Vytvoření nové konverzace
$queries['chat_konverzace_insert'] = "
    INSERT INTO ".TBL_CHAT_KONVERZACE." 
    (nazev, typ, usek_id, popis, created_by_user_id, dt_vytvoreni) 
    VALUES (:nazev, :typ, :usek_id, :popis, :created_by_user_id, NOW())
";

// Aktualizace času poslední zprávy v konverzaci
$queries['chat_konverzace_update_last_message'] = "
    UPDATE ".TBL_CHAT_KONVERZACE." 
    SET dt_posledni_zprava = NOW() 
    WHERE id = :konverzace_id
";

// ========================================
// ÚČASTNÍCI QUERIES
// ========================================

// Načtení účastníků konverzace
$queries['chat_ucastnici_select_by_konverzace'] = "
    SELECT 
        u.*,
        CONCAT_WS(' ', uz.titul_pred, uz.jmeno, uz.prijmeni, uz.titul_za) as uzivatel_jmeno,
        uz.email,
        os.status as online_status,
        os.posledni_aktivita
    FROM ".TBL_CHAT_UCASTNICI." u
    JOIN ".TBL_UZIVATELE." uz ON u.user_id = uz.id
    LEFT JOIN ".TBL_CHAT_ONLINE_STATUS." os ON u.user_id = os.user_id
    WHERE u.konverzace_id = :konverzace_id AND u.aktivni = 1
    ORDER BY u.role DESC, uz.jmeno, uz.prijmeni
";

// Přidání účastníka do konverzace
$queries['chat_ucastnici_insert'] = "
    INSERT INTO ".TBL_CHAT_UCASTNICI." 
    (konverzace_id, user_id, role, dt_pripojeni) 
    VALUES (:konverzace_id, :user_id, :role, NOW())
    ON DUPLICATE KEY UPDATE aktivni = 1, dt_pripojeni = NOW()
";

// Aktualizace času posledního přečtení
$queries['chat_ucastnici_update_last_read'] = "
    UPDATE ".TBL_CHAT_UCASTNICI." 
    SET dt_posledni_precteni = NOW(), dt_posledni_aktivita = NOW() 
    WHERE konverzace_id = :konverzace_id AND user_id = :user_id
";

// Kontrola oprávnění uživatele ke konverzaci
$queries['chat_ucastnici_check_permission'] = "
    SELECT u.*, k.typ, k.usek_id
    FROM ".TBL_CHAT_UCASTNICI." u
    JOIN ".TBL_CHAT_KONVERZACE." k ON u.konverzace_id = k.id
    WHERE u.konverzace_id = :konverzace_id AND u.user_id = :user_id AND u.aktivni = 1
    LIMIT 1
";

// ========================================
// ZPRÁVY QUERIES
// ========================================

// Načtení zpráv z konverzace (s paginací a časovým filtrem)
$queries['chat_zpravy_select_by_konverzace'] = "
    SELECT 
        z.*,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as author_jmeno,
        u.username as author_username,
        parent_z.obsah_plain as parent_obsah,
        CONCAT_WS(' ', parent_u.titul_pred, parent_u.jmeno, parent_u.prijmeni, parent_u.titul_za) as parent_author_jmeno,
        (SELECT COUNT(*) FROM ".TBL_CHAT_REAKCE." r WHERE r.zprava_id = z.id) as pocet_reakci,
        (SELECT GROUP_CONCAT(DISTINCT r.emoji ORDER BY r.emoji SEPARATOR ',') 
         FROM ".TBL_CHAT_REAKCE." r WHERE r.zprava_id = z.id) as reakce_emoji
    FROM ".TBL_CHAT_ZPRAVY." z
    JOIN ".TBL_UZIVATELE." u ON z.user_id = u.id
    LEFT JOIN ".TBL_CHAT_ZPRAVY." parent_z ON z.parent_zprava_id = parent_z.id
    LEFT JOIN ".TBL_UZIVATELE." parent_u ON parent_z.user_id = parent_u.id
    WHERE z.konverzace_id = :konverzace_id 
    AND z.smazano = 0
    AND z.dt_vytvoreni >= :od_casu
    ORDER BY z.dt_vytvoreni ASC
    LIMIT :limit OFFSET :offset
";

// Načtení nových zpráv od určitého času (pro polling)
$queries['chat_zpravy_select_new_messages'] = "
    SELECT 
        z.*,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as author_jmeno,
        u.username as author_username,
        (SELECT COUNT(*) FROM ".TBL_CHAT_REAKCE." r WHERE r.zprava_id = z.id) as pocet_reakci
    FROM ".TBL_CHAT_ZPRAVY." z
    JOIN ".TBL_UZIVATELE." u ON z.user_id = u.id
    WHERE z.konverzace_id = :konverzace_id 
    AND z.smazano = 0
    AND z.dt_vytvoreni > :posledni_cas
    ORDER BY z.dt_vytvoreni ASC
";

// Vložení nové zprávy
$queries['chat_zpravy_insert'] = "
    INSERT INTO ".TBL_CHAT_ZPRAVY." 
    (konverzace_id, user_id, parent_zprava_id, obsah, obsah_plain, typ, metadata, dt_vytvoreni) 
    VALUES (:konverzace_id, :user_id, :parent_zprava_id, :obsah, :obsah_plain, :typ, :metadata, NOW())
";

// Editace zprávy
$queries['chat_zpravy_update'] = "
    UPDATE ".TBL_CHAT_ZPRAVY." 
    SET obsah = :obsah, obsah_plain = :obsah_plain, metadata = :metadata, 
        editovano = 1, dt_editace = NOW() 
    WHERE id = :zprava_id AND user_id = :user_id AND smazano = 0
";

// Smazání zprávy (soft delete)
$queries['chat_zpravy_delete'] = "
    UPDATE ".TBL_CHAT_ZPRAVY." 
    SET smazano = 1, dt_smazani = NOW() 
    WHERE id = :zprava_id AND user_id = :user_id
";

// Vyhledávání ve zprávách
$queries['chat_zpravy_search'] = "
    SELECT 
        z.*,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as author_jmeno,
        k.nazev as konverzace_nazev,
        MATCH(z.obsah_plain) AGAINST(:search_term IN NATURAL LANGUAGE MODE) as relevance
    FROM ".TBL_CHAT_ZPRAVY." z
    JOIN ".TBL_UZIVATELE." u ON z.user_id = u.id
    JOIN ".TBL_CHAT_KONVERZACE." k ON z.konverzace_id = k.id
    JOIN ".TBL_CHAT_UCASTNICI." uc ON k.id = uc.konverzace_id AND uc.user_id = :user_id AND uc.aktivni = 1
    WHERE z.smazano = 0
    AND MATCH(z.obsah_plain) AGAINST(:search_term IN NATURAL LANGUAGE MODE)
    ORDER BY relevance DESC, z.dt_vytvoreni DESC
    LIMIT :limit
";

// ========================================
// MENTIONS QUERIES
// ========================================

// Načtení nepřečtených zmínek pro uživatele
$queries['chat_mentions_select_unread'] = "
    SELECT 
        m.*,
        z.obsah_plain,
        z.dt_vytvoreni as zprava_dt,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as author_jmeno,
        k.nazev as konverzace_nazev
    FROM ".TBL_CHAT_MENTIONS." m
    JOIN ".TBL_CHAT_ZPRAVY." z ON m.zprava_id = z.id
    JOIN ".TBL_UZIVATELE." u ON z.user_id = u.id
    JOIN ".TBL_CHAT_KONVERZACE." k ON z.konverzace_id = k.id
    WHERE m.user_id = :user_id AND m.precteno = 0 AND z.smazano = 0
    ORDER BY z.dt_vytvoreni DESC
    LIMIT :limit
";

// Vložení zmínky
$queries['chat_mentions_insert'] = "
    INSERT INTO ".TBL_CHAT_MENTIONS." 
    (zprava_id, user_id, pozice_start, pozice_end, dt_vytvoreni) 
    VALUES (:zprava_id, :user_id, :pozice_start, :pozice_end, NOW())
    ON DUPLICATE KEY UPDATE pozice_start = VALUES(pozice_start), pozice_end = VALUES(pozice_end)
";

// Označení zmínky jako přečtené
$queries['chat_mentions_mark_read'] = "
    UPDATE ".TBL_CHAT_MENTIONS." 
    SET precteno = 1, dt_precteni = NOW() 
    WHERE user_id = :user_id AND zprava_id = :zprava_id
";

// ========================================
// REAKCE QUERIES
// ========================================

// Přidání/odebrání reakce
$queries['chat_reakce_toggle'] = "
    INSERT INTO ".TBL_CHAT_REAKCE." (zprava_id, user_id, emoji, dt_vytvoreni) 
    VALUES (:zprava_id, :user_id, :emoji, NOW())
    ON DUPLICATE KEY UPDATE dt_vytvoreni = NOW()
";

$queries['chat_reakce_remove'] = "
    DELETE FROM ".TBL_CHAT_REAKCE." 
    WHERE zprava_id = :zprava_id AND user_id = :user_id AND emoji = :emoji
";

// Načtení reakcí na zprávu
$queries['chat_reakce_select_by_zprava'] = "
    SELECT 
        r.*,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as uzivatel_jmeno
    FROM ".TBL_CHAT_REAKCE." r
    JOIN ".TBL_UZIVATELE." u ON r.user_id = u.id
    WHERE r.zprava_id = :zprava_id
    ORDER BY r.dt_vytvoreni ASC
";

// ========================================
// ONLINE STATUS QUERIES
// ========================================

// Aktualizace online statusu
$queries['chat_online_status_upsert'] = "
    INSERT INTO ".TBL_CHAT_ONLINE_STATUS." 
    (user_id, status, posledni_aktivita, ip_adresa, user_agent) 
    VALUES (:user_id, :status, NOW(), :ip_adresa, :user_agent)
    ON DUPLICATE KEY UPDATE 
        status = VALUES(status), 
        posledni_aktivita = NOW(), 
        ip_adresa = VALUES(ip_adresa), 
        user_agent = VALUES(user_agent)
";

// Načtení online statusu uživatelů
$queries['chat_online_status_select_users'] = "
    SELECT 
        os.*,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as uzivatel_jmeno,
        u.username
    FROM ".TBL_CHAT_ONLINE_STATUS." os
    JOIN ".TBL_UZIVATELE." u ON os.user_id = u.id
    WHERE os.user_id IN (:user_ids)
    ORDER BY os.posledni_aktivita DESC
";

// Označení neaktivních uživatelů jako offline (starší než X minut)
$queries['chat_online_status_mark_offline'] = "
    UPDATE ".TBL_CHAT_ONLINE_STATUS." 
    SET status = 'OFFLINE' 
    WHERE posledni_aktivita < DATE_SUB(NOW(), INTERVAL :minutes MINUTE) 
    AND status != 'OFFLINE'
";

// ========================================
// STATISTIKY A ADMIN QUERIES
// ========================================

// Celkové statistiky chatu
$queries['chat_stats_overview'] = "
    SELECT 
        (SELECT COUNT(*) FROM ".TBL_CHAT_KONVERZACE." WHERE aktivni = 1) as pocet_konverzaci,
        (SELECT COUNT(*) FROM ".TBL_CHAT_ZPRAVY." WHERE smazano = 0) as pocet_zprav,
        (SELECT COUNT(DISTINCT user_id) FROM ".TBL_CHAT_UCASTNICI." WHERE aktivni = 1) as aktivnich_uzivatelu,
        (SELECT COUNT(*) FROM ".TBL_CHAT_ONLINE_STATUS." WHERE status != 'OFFLINE') as online_uzivatelu
";

// Nejaktivnější konverzace
$queries['chat_stats_active_conversations'] = "
    SELECT 
        k.id,
        k.nazev,
        k.typ,
        COUNT(z.id) as pocet_zprav,
        COUNT(DISTINCT z.user_id) as pocet_prispevovatelu,
        MAX(z.dt_vytvoreni) as posledni_zprava
    FROM ".TBL_CHAT_KONVERZACE." k
    LEFT JOIN ".TBL_CHAT_ZPRAVY." z ON k.id = z.konverzace_id AND z.smazano = 0
    WHERE k.aktivni = 1
    AND z.dt_vytvoreni >= DATE_SUB(NOW(), INTERVAL :days DAY)
    GROUP BY k.id
    ORDER BY pocet_zprav DESC
    LIMIT :limit
";

?>