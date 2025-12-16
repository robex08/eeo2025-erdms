<?php
// Konstanty pro tabulky
// --- generováno podle aktuální DB struktury ---
define('TABLE_AUDITNI_ZAZNAMY', '25_auditni_zaznamy');
define('TABLE_CISELNIK_STAVY', '25_ciselnik_stavy');
define('TABLE_DODAVATELE', '25_dodavatele');
define('TABLE_LOKALITY', '25_lokality');
define('TABLE_OBJEDNAVKY', '25a_objednavky');              // ⚠️ SPRÁVNĚ: 25a_objednavky (NE 25_objednavky!)
define('TABLE_OBJEDNAVKY_POLOZKY', '25a_objednavky_polozky');
define('TABLE_OBJEDNAVKY_PRILOHY', '25a_objednavky_prilohy');
define('TABLE_OBJEDNAVKY_FAKTURY', '25a_objednavky_faktury');
define('TABLE_LIMITOVANE_PRISLIBY', '25_limitovane_prisliby');
define('TABLE_ORGANIZACE', '25_organizace_vizitka');
define('TABLE_POZICE', '25_pozice');
define('TABLE_PRAVA', '25_prava');
define('TABLE_ROLE', '25_role');
define('TABLE_ROLE_PRAVA', '25_role_prava');
define('TABLE_USEKY', '25_useky');
define('TABLE_UZIVATELE', '25_uzivatele');
define('TABLE_SABLONY_OBJEDNAVEK', '25_sablony_objednavek');
// DEPRECATED: Old hierarchy table (kept for backward compatibility, but table doesn't exist)
define('TABLE_UZIVATELE_HIERARCHIE', '25_hierarchie_vztahy');
define('TABLE_HIERARCHIE_VZTAHY', '25_hierarchie_vztahy');
define('TABLE_HIERARCHIE_PROFILY', '25_hierarchie_profily');
define('TABLE_UZIVATELE_ROLE', '25_uzivatele_role');
define('TABLE_UZIVATELE_POZNAMKY', '25_uzivatele_poznamky');

// === NOTIFICATION SYSTEM CONSTANTS (České názvy) ===
define('TABLE_NOTIFIKACE', '25_notifikace');                              // Hlavní tabulka notifikací
define('TABLE_NOTIFIKACE_PRECTENI', '25_notifikace_precteni');           // Read state pro příjemce
define('TABLE_NOTIFIKACE_SABLONY', '25_notifikace_sablony');             // Šablony emailů/notifikací
define('TABLE_NOTIFIKACE_TYPY_UDALOSTI', '25_notifikace_typy_udalosti'); // Katalog EVENT_TYPES
define('TABLE_NOTIFIKACE_FRONTA', '25_notifikace_fronta');               // Fronta pro plánované odesílání
define('TABLE_NOTIFIKACE_AUDIT', '25_notifikace_audit');                 // Audit log doručení
define('TABLE_NOTIFIKACE_UZIVATELE_NASTAVENI', '25_notifikace_uzivatele_nastaveni'); // User preferences

// === CASHBOOK (POKLADNA) CONSTANTS ===
define('TABLE_POKLADNI_KNIHY', '25a_pokladni_knihy');
define('TABLE_POKLADNI_POLOZKY', '25a_pokladni_polozky');
define('TABLE_POKLADNI_AUDIT', '25a_pokladni_audit');
define('TABLE_POKLADNI_PRIRAZENI', '25a_pokladni_prirazeni');

// === CHAT SYSTEM CONSTANTS ===
define('TABLE_CHAT_KONVERZACE', '25_chat_konverzace');
define('TABLE_CHAT_UCASTNICI', '25_chat_ucastnici');
define('TABLE_CHAT_ZPRAVY', '25_chat_zpravy');
define('TABLE_CHAT_PRECTENE_ZPRAVY', '25_chat_prectene_zpravy');
define('TABLE_CHAT_MENTIONS', '25_chat_mentions');
define('TABLE_CHAT_REAKCE', '25_chat_reakce');
define('TABLE_CHAT_ONLINE_STATUS', '25_chat_online_status');
// --- konec generovaných konstant ---

// --- konstanty pro starou (OLD) DB z /v2025.03_25/old/config.php ---
define('OLD_TABLE_USERS', 'users');
define('OLD_TABLE_RIGHTS', 'rights');
define('OLD_TABLE_GROUPS', 'groups');
define('OLD_TABLE_LOCATION', 'locations');
define('OLD_TABLE_SMLUVY', 'smlouvy');
define('OLD_TABLE_OBJEDNAVKY', 'r_objednavky');
define('OLD_TABLE_UMISTENI', 'umisteni');
define('OLD_TABLE_PARTNER', 'partner');
define('OLD_TABLE_OKRESY', 'okresy');
define('OLD_TABLE_GARANT', 'garant');
define('OLD_TABLE_DRUH', 'druh_smlouvy');
define('OLD_TABLE_MENU', 'menu');
define('OLD_TABLE_PRILOHY', 'pripojene_dokumenty');
define('OLD_TABLE_OPRILOHY', 'r_pripojene_odokumenty');
define('OLD_TABLE_MPRILOHY', 'pripojene_mdokumenty');
define('OLD_TABLE_MAPOKRESY', 'map_okresy');
define('OLD_TABLE_MAJETEK', 'majetek');
define('OLD_TABLE_MAJETEK_D', 'majetek_duvod');
define('OLD_TABLE_LPS', 'r_LP');
define('OLD_TABLE_OBJMD', 'r_objMetaData');
// --- konec old konstant ---

// SQL dotazy

// --- GENEROVANÉ SELECTY PRO VŠECHNY TABULKY ---
$queries['auditni_zaznamy_select_all'] = "SELECT * FROM ".TABLE_AUDITNI_ZAZNAMY;
$queries['auditni_zaznamy_select_by_id'] = "SELECT * FROM ".TABLE_AUDITNI_ZAZNAMY." WHERE id = :id";
$queries['ciselnik_stavy_select_all'] = "SELECT * FROM ".TABLE_CISELNIK_STAVY;
$queries['ciselnik_stavy_select_by_id'] = "SELECT * FROM ".TABLE_CISELNIK_STAVY." WHERE id = :id";
// Select status entries by their type (e.g. 'OBJEDNAVKA') - expects a parameter :typ
$queries['ciselnik_stavy_select_by_typ'] = "SELECT id, typ_objektu, kod_stavu, nazev_stavu, popis FROM ".TABLE_CISELNIK_STAVY." WHERE typ_objektu = :typ ORDER BY id";
$queries['dodavatele_select_all'] = "SELECT * FROM ".TABLE_DODAVATELE;
$queries['dodavatele_select_by_id'] = "SELECT * FROM ".TABLE_DODAVATELE." WHERE id = :id";
$queries['dodavatele_select_by_ico'] = "SELECT * FROM ".TABLE_DODAVATELE." WHERE ico = :ico LIMIT 1";
$queries['dodavatele_update_by_ico'] = "UPDATE ".TABLE_DODAVATELE." SET dt_aktualizace = NOW() WHERE ico = :ico";
$queries['dodavatele_insert'] = "INSERT INTO ".TABLE_DODAVATELE." (nazev, adresa, ico, dic, zastoupeny, kontakt_jmeno, kontakt_email, kontakt_telefon, dt_vytvoreni, dt_aktualizace) VALUES (:nazev, :adresa, :ico, :dic, :zastoupeny, :kontakt_jmeno, :kontakt_email, :kontakt_telefon, NOW(), NOW())";
$queries['dodavatele_update'] = "UPDATE ".TABLE_DODAVATELE." SET nazev = :nazev, adresa = :adresa, ico = :ico, dic = :dic, zastoupeny = :zastoupeny, kontakt_jmeno = :kontakt_jmeno, kontakt_email = :kontakt_email, kontakt_telefon = :kontakt_telefon, dt_aktualizace = NOW() WHERE id = :id";
$queries['lokality_select_all'] = "SELECT * FROM ".TABLE_LOKALITY;
$queries['lokality_select_by_id'] = "SELECT * FROM ".TABLE_LOKALITY." WHERE id = :id";
// RAW SELECT - surová data z DB bez jakýchkoli úprav
$queries['objednavky_select_all_raw'] = "SELECT * FROM ".TABLE_OBJEDNAVKY." ORDER BY id DESC";

// ENRICHED SELECT - surová data + rozšířené JSON pole s názvy z číselníků
// Kompatibilní s MySQL 5.6 a PHP 5.6 - parsuje JSON v PHP místo SQL
$queries['objednavky_select_all_enriched'] = "
    SELECT * FROM ".TABLE_OBJEDNAVKY." o
    ORDER BY o.id DESC
";

// LEGACY - původní dotaz pro zpětnou kompatibilitu
$queries['objednavky_select_all'] = "SELECT id, cislo_objednavky, datum_objednavky, predmet, strediska, financovani_dodatek, prikazce_id, max_cena_s_dph, zdroj_financovani, druh_objednavky, schvalil_uzivatel_id, datum_schvaleni, garant_uzivatel_id, objednatel_id, created_by_uzivatel_id, updated_by_uzivatel_id, dodavatel_id, dodavatel_nazev, dodavatel_adresa, dodavatel_ico, dodavatel_dic, dodavatel_zastoupeny, dodavatel_kontakt_jmeno, dodavatel_kontakt_email, dodavatel_kontakt_telefon, predpokladany_termin_dodani, misto_dodani, zaruka, stav_odeslano, datum_odeslani, potvrzeno_dodavatelem, datum_akceptace, potvrzeno_zpusob, zpusob_platby, zverejnit_registr_smluv, datum_zverejneni, registr_smluv_id, poznamka, stav_id, stav_komentar, aktivni, dt_vytvoreni, dt_aktualizace FROM ".TABLE_OBJEDNAVKY; 
$queries['objednavky_check_number'] = "SELECT id, objednatel_id FROM ".TABLE_OBJEDNAVKY." WHERE cislo_objednavky = :cislo_objednavky LIMIT 1";
$queries['objednavky_next_number'] = "
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(SUBSTRING(cislo_objednavky, 3), '/', 1) AS UNSIGNED)), 0) as last_used_number 
    FROM ".TABLE_OBJEDNAVKY." 
    WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(cislo_objednavky, '/', -2), '/', 1) = YEAR(NOW()) AND cislo_objednavky LIKE 'O-%'
";
$queries['objednavky_polozky_select_all'] = "SELECT * FROM ".TABLE_OBJEDNAVKY_POLOZKY;
$queries['objednavky_polozky_select_by_id'] = "SELECT * FROM ".TABLE_OBJEDNAVKY_POLOZKY." WHERE id = :id";
$queries['objednavky_prilohy_select_all'] = "SELECT * FROM ".TABLE_OBJEDNAVKY_PRILOHY;
$queries['objednavky_prilohy_select_by_id'] = "SELECT * FROM ".TABLE_OBJEDNAVKY_PRILOHY." WHERE id = :id";
// Limitovane prisliby
$queries['limitovane_prisliby_select_all'] = "SELECT * FROM ".TABLE_LIMITOVANE_PRISLIBY;
$queries['limitovane_prisliby_select_by_filters'] = "SELECT id, user_id, usek_id, kategorie, cislo_lp, cislo_uctu, nazev_uctu, vyse_financniho_kryti, platne_od, platne_do FROM ".TABLE_LIMITOVANE_PRISLIBY." WHERE 1=1";
$queries['limitovane_prisliby_select_basic_info'] = "SELECT id, cislo_lp, nazev_uctu, vyse_financniho_kryti FROM ".TABLE_LIMITOVANE_PRISLIBY;
$queries['limitovane_prisliby_select_by_id'] = "SELECT * FROM ".TABLE_LIMITOVANE_PRISLIBY." WHERE id = :id";

// Templates for orders (legacy/new)
$queries['sablony_objednavek_select_all'] = "SELECT * FROM " . TABLE_SABLONY_OBJEDNAVEK . " ORDER BY id";
$queries['sablony_objednavek_select_by_user_or_global'] = "SELECT * FROM " . TABLE_SABLONY_OBJEDNAVEK . " WHERE (user_id = :user_id OR user_id = 0) ORDER BY id";
$queries['sablony_objednavek_select_by_id'] = "SELECT * FROM " . TABLE_SABLONY_OBJEDNAVEK . " WHERE id = :id LIMIT 1";
$queries['sablony_objednavek_insert'] = "INSERT INTO " . TABLE_SABLONY_OBJEDNAVEK . " (user_id, dt_vytvoreni, dt_aktualizace, nazev_sablony, polozky_po, polozky_detail, typ, kategorie, usek_zkr) VALUES (:user_id, NOW(), NOW(), :nazev_sablony, :polozky_po, :polozky_detail, :typ, :kategorie, :usek_zkr)";
$queries['sablony_objednavek_update'] = "UPDATE " . TABLE_SABLONY_OBJEDNAVEK . " SET dt_aktualizace = NOW(), nazev_sablony = :nazev_sablony, polozky_po = :polozky_po, polozky_detail = :polozky_detail, typ = :typ, kategorie = :kategorie WHERE id = :id";
$queries['sablony_objednavek_delete'] = "DELETE FROM " . TABLE_SABLONY_OBJEDNAVEK . " WHERE id = :id";
$queries['pozice_select_all'] = "SELECT * FROM ".TABLE_POZICE;
$queries['pozice_select_by_id'] = "SELECT * FROM ".TABLE_POZICE." WHERE id = :id";
// Hierarchical/tree select for pozice with parent name and usek info
$queries['pozice_tree_select'] = "
    SELECT p.id, p.nazev_pozice, p.parent_id, p.usek_id,
           parent.nazev_pozice AS parent_nazev,
           us.usek_zkr, us.usek_nazev
    FROM " . TABLE_POZICE . " p
    LEFT JOIN " . TABLE_POZICE . " parent ON p.parent_id = parent.id
    LEFT JOIN " . TABLE_USEKY . " us ON p.usek_id = us.id
    ORDER BY COALESCE(p.parent_id, 0), p.nazev_pozice
";

// Select positions for a given usek (department)
$queries['pozice_select_by_usek'] = "SELECT id, nazev_pozice, parent_id, usek_id FROM " . TABLE_POZICE . " WHERE usek_id = :usek_id ORDER BY nazev_pozice";

// Select direct children of a parent position
$queries['pozice_select_children'] = "SELECT id, nazev_pozice, parent_id, usek_id FROM " . TABLE_POZICE . " WHERE parent_id = :parent_id ORDER BY nazev_pozice";
$queries['prava_select_all'] = "SELECT * FROM ".TABLE_PRAVA;
$queries['prava_select_by_id'] = "SELECT * FROM ".TABLE_PRAVA." WHERE id = :id";
// Readable list of rights (code + description)
$queries['prava_list'] = "SELECT id, kod_prava, popis FROM " . TABLE_PRAVA . " ORDER BY kod_prava";
$queries['prava_select_by_kod'] = "SELECT id, kod_prava, popis FROM " . TABLE_PRAVA . " WHERE kod_prava = :kod_prava LIMIT 1";
$queries['role_select_all'] = "SELECT * FROM ".TABLE_ROLE;
$queries['role_select_by_id'] = "SELECT * FROM ".TABLE_ROLE." WHERE id = :id";
// Readable list of roles and lookup by name
$queries['role_list'] = "SELECT id, kod_role, nazev_role, popis FROM " . TABLE_ROLE . " ORDER BY nazev_role";
$queries['role_select_by_nazev'] = "SELECT id, kod_role, nazev_role, popis FROM " . TABLE_ROLE . " WHERE nazev_role = :nazev_role LIMIT 1";

// Detail role s právy
$queries['role_detail_with_rights'] = "
    SELECT r.id, r.nazev_role, r.popis, r.aktivni,
           GROUP_CONCAT(DISTINCT p.id) as prava_ids,
           GROUP_CONCAT(DISTINCT p.kod_prava) as prava_kody,
           GROUP_CONCAT(DISTINCT p.popis SEPARATOR '|') as prava_popisy
    FROM " . TABLE_ROLE . " r
    LEFT JOIN " . TABLE_ROLE_PRAVA . " rp ON r.id = rp.role_id
    LEFT JOIN " . TABLE_PRAVA . " p ON rp.pravo_id = p.id
    WHERE r.id = :id
    GROUP BY r.id, r.nazev_role, r.popis, r.aktivni
";

$queries['role_prava_select_all'] = "SELECT * FROM ".TABLE_ROLE_PRAVA;
$queries['role_prava_select_by_id'] = "SELECT * FROM ".TABLE_ROLE_PRAVA." WHERE role_id = :role_id AND pravo_id = :pravo_id";

// === ORGANIZACE QUERIES ===
$queries['organizace_select_all'] = "SELECT * FROM ".TABLE_ORGANIZACE." ORDER BY nazev_organizace";
$queries['organizace_select_by_id'] = "SELECT * FROM ".TABLE_ORGANIZACE." WHERE id = :id";
$queries['organizace_list'] = "SELECT id, nazev_organizace as nazev, ico, dic FROM " . TABLE_ORGANIZACE . " ORDER BY nazev_organizace";

// ORGANIZACE CRUD
$queries['organizace_insert'] = "
    INSERT INTO ".TABLE_ORGANIZACE." (
        nazev_organizace, ico, dic, ulice_cislo, mesto, psc, 
        zastoupeny, datova_schranka, email, telefon
    ) VALUES (
        :nazev_organizace, :ico, :dic, :ulice_cislo, :mesto, :psc,
        :zastoupeny, :datova_schranka, :email, :telefon
    )
";

$queries['organizace_update'] = "
    UPDATE ".TABLE_ORGANIZACE." SET
        nazev_organizace = :nazev_organizace,
        ico = :ico,
        dic = :dic,
        ulice_cislo = :ulice_cislo,
        mesto = :mesto,
        psc = :psc,
        zastoupeny = :zastoupeny,
        datova_schranka = :datova_schranka,
        email = :email,
        telefon = :telefon
    WHERE id = :id
";

$queries['organizace_delete'] = "DELETE FROM ".TABLE_ORGANIZACE." WHERE id = :id";

// Kontrola existence organizace pro FK
$queries['organizace_check_usage'] = "
    SELECT 
        (SELECT COUNT(*) FROM ".TABLE_UZIVATELE." WHERE organizace_id = :id) as users_count
";

// Extended organizace detail pro admin
$queries['organizace_detail_full'] = "SELECT * FROM ".TABLE_ORGANIZACE." WHERE id = :id";

$queries['useky_select_all'] = "SELECT * FROM ".TABLE_USEKY;
$queries['useky_select_by_id'] = "SELECT * FROM ".TABLE_USEKY." WHERE id = :id";
// Simple list of useky (departments)
$queries['useky_list'] = "SELECT id, usek_zkr, usek_nazev FROM " . TABLE_USEKY . " ORDER BY usek_zkr";
$queries['useky_select_by_zkr'] = "SELECT id, usek_zkr, usek_nazev FROM " . TABLE_USEKY . " WHERE usek_zkr = :usek_zkr LIMIT 1";
$queries['uzivatele_select_all'] = "
    SELECT 
        u.id,
        u.username,
        u.titul_pred,
        u.jmeno,
        u.prijmeni,
        u.dt_posledni_aktivita,
        u.titul_za,
        u.email,
        u.telefon,
        u.aktivni,
        u.dt_vytvoreni,
        u.dt_aktualizace,
        
        IFNULL(p.nazev_pozice, '') as nazev_pozice,
        p.parent_id as pozice_parent_id,
        
        IFNULL(l.nazev, '') as lokalita_nazev,
        l.typ as lokalita_typ,
        l.parent_id as lokalita_parent_id,
        
        IFNULL(us.usek_zkr, '') as usek_zkr,
        IFNULL(us.usek_nazev, '') as usek_nazev,
        
        CONCAT_WS(' ', MIN(u_nadrizeny.titul_pred), MIN(u_nadrizeny.jmeno), MIN(u_nadrizeny.prijmeni), MIN(u_nadrizeny.titul_za)) as nadrizeny_cely_jmeno

    FROM " . TABLE_UZIVATELE . " u
        LEFT JOIN " . TABLE_POZICE . " p ON u.pozice_id = p.id
        LEFT JOIN " . TABLE_LOKALITY . " l ON u.lokalita_id = l.id
    LEFT JOIN " . TABLE_USEKY . " us ON u.usek_id = us.id
        LEFT JOIN " . TABLE_UZIVATELE . " u_nadrizeny ON p.parent_id = u_nadrizeny.pozice_id AND u_nadrizeny.aktivni = 1
    WHERE u.id > 0
    GROUP BY u.id, u.username, u.titul_pred, u.jmeno, u.prijmeni, u.dt_posledni_aktivita, u.titul_za, u.email, u.telefon, u.aktivni, u.dt_vytvoreni, u.dt_aktualizace, p.nazev_pozice, p.parent_id, l.nazev, l.typ, l.parent_id, us.usek_zkr, us.usek_nazev
    ORDER BY u.aktivni DESC, u.jmeno, u.prijmeni
";
$queries['uzivatele_select_by_id'] = "SELECT * FROM ".TABLE_UZIVATELE." WHERE id = :id";
// Update last activity timestamp for a user
$queries['uzivatele_update_last_activity'] = "UPDATE " . TABLE_UZIVATELE . " SET dt_posledni_aktivita = NOW() WHERE id = :id";
// Select active users from last 5 minutes - opraveno pro PHP 5.6/MySQL 5.5 kompatibilitu
$queries['uzivatele_active_last_5_minutes'] = "SELECT id, username, CONCAT(jmeno, ' ', prijmeni) AS cele_jmeno, dt_posledni_aktivita FROM " . TABLE_UZIVATELE . " WHERE dt_posledni_aktivita IS NOT NULL AND dt_posledni_aktivita >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) AND aktivni = 1 ORDER BY dt_posledni_aktivita DESC";
$queries['uzivatele_hierarchie_select_all'] = "SELECT * FROM ".TABLE_UZIVATELE_HIERARCHIE;
$queries['uzivatele_hierarchie_select_by_id'] = "SELECT * FROM ".TABLE_UZIVATELE_HIERARCHIE." WHERE nadrizeny_id = :nadrizeny_id AND podrizeny_id = :podrizeny_id";
// --- KONEC GENEROVANÝCH SELECTŮ ---

// --- SELECTY pro STARÉ tabulky (prefix old_) - převzato z /old/queries.php ---
$queries['old_react_all_partners'] = "SELECT DISTINCT * FROM " . OLD_TABLE_PARTNER;

$queries['old_react_all_okres'] = "SELECT * FROM " . OLD_TABLE_OKRESY . " ORDER BY okres";
$queries['old_react_all_stanoviste'] = "SELECT * FROM " . OLD_TABLE_LOCATION . " ORDER BY name";
$queries['old_react_all_umisteni'] = "SELECT * FROM " . OLD_TABLE_UMISTENI . " ORDER BY umisteni";
$queries['old_react_user_rights'] = "SELECT * FROM " . OLD_TABLE_GROUPS . " WHERE (id = :id)";
$queries['old_react_user_info'] = "SELECT " . OLD_TABLE_USERS . ".name, surname, " . OLD_TABLE_LOCATION . ".name as lokalita, email, phone"
    . " FROM " . OLD_TABLE_USERS . ", " . OLD_TABLE_LOCATION
    . " WHERE (location_id = " . OLD_TABLE_LOCATION . ".id) and (" . OLD_TABLE_USERS . ".id = :id)";

$queries['old_react_user_id'] = "SELECT * FROM " . OLD_TABLE_USERS . " WHERE id= :id";
$queries['old_react_all_users'] = "SELECT id, surname, name, email, department, phone, active, username, dt_activity, "
    . "(SELECT name FROM " . OLD_TABLE_GROUPS . " WHERE (" . OLD_TABLE_GROUPS . ".id = group_id)) as group_name FROM " . OLD_TABLE_USERS;

$queries['old_get_all_users'] = "SELECT * FROM " . OLD_TABLE_USERS;
$queries['old_get_user_id'] = "SELECT * FROM " . OLD_TABLE_USERS . " WHERE id = :id";
$queries['old_insert_user'] = "INSERT INTO " . OLD_TABLE_USERS . " (username, email, password) VALUES (:username, :email, :password)";
$queries['old_update_user'] = "UPDATE " . OLD_TABLE_USERS . " SET username = :username, email = :email WHERE id = :id";
$queries['old_delete_user'] = "UPDATE " . OLD_TABLE_USERS . " SET state = 'deleted' WHERE id = :id";

$queries['old_login_user'] = "SELECT id, username FROM " . OLD_TABLE_USERS . " WHERE username = :username AND password = :password LIMIT 1";

$queries['old_get_order_id'] = "SELECT * FROM " . OLD_TABLE_OBJEDNAVKY . " WHERE id = :id";
$queries['old_insert_order'] = "INSERT INTO " . OLD_TABLE_OBJEDNAVKY . " (user_id, amount) VALUES (:user_id, :amount)";
$queries['old_update_order'] = "UPDATE " . OLD_TABLE_OBJEDNAVKY . " SET amount = :amount WHERE id = :id";
$queries['old_delete_order'] = "DELETE FROM " . OLD_TABLE_OBJEDNAVKY . " WHERE id = :id";

$queries['old_react_update_order_id'] = "UPDATE " . OLD_TABLE_OBJEDNAVKY . " SET %s WHERE id = :id";

$queries['old_react_all_garants'] = "SELECT * FROM " . OLD_TABLE_GARANT . " ORDER BY garant;";
$queries['old_react_all_lps'] = "SELECT  *, DATE_FORMAT(platne_do , '%d.%m.%Y') as platne_do, DATE_FORMAT(platne_do , '%d.%m.%Y') as platne_od, "
    . "(SELECT TRIM(CONCAT(surname, ' ', name)) FROM " . OLD_TABLE_USERS . " WHERE " . OLD_TABLE_USERS . ".id = user_id) as jmeno "
    . " FROM " . OLD_TABLE_LPS . " ORDER BY kategorie, platne_od;";
$queries['old_react_all_types'] = "SELECT * FROM " . OLD_TABLE_DRUH . " ORDER BY druh;";

$queries['old_react_attachment_id'] = "SELECT * FROM " . OLD_TABLE_OPRILOHY . " WHERE (id_smlouvy= :id) ORDER BY soubor;";
$queries['old_react_order_raw_id'] = "SELECT * FROM " . OLD_TABLE_OBJEDNAVKY . " WHERE id= :id";

$queries['old_react_get_year_orders'] =
    "SELECT id,  evidencni_c, DATE_FORMAT(datum_u , '%d.%m.%Y') as datum_p, dodatek_sml_id, vypovedni_lhuta, "
    . "(SELECT garant FROM " . OLD_TABLE_GARANT . " WHERE " . OLD_TABLE_GARANT . ".id = garant_id) as garant,"
    . "(SELECT surname FROM " . OLD_TABLE_USERS . " WHERE " . OLD_TABLE_USERS . ".id = user_id) as uName,"
    . "(SELECT okres FROM " . OLD_TABLE_OKRESY . " WHERE " . OLD_TABLE_OKRESY . ".id = okres_id) as okres,"
    . "(SELECT umisteni FROM " . OLD_TABLE_UMISTENI . " WHERE " . OLD_TABLE_UMISTENI . ".id = umisteni_id) as umisteni,"
    . "(SELECT druh FROM " . OLD_TABLE_DRUH . " WHERE " . OLD_TABLE_DRUH . ".id = druh_sml_id) as druh_sml, tt_vyrc, tt_dinfo,"
    . "faktura, pokladni_dok, DATE_FORMAT(dt_pridani, '%d.%m.%Y %H:%i:%s') as dt_pridani,"
    . "(SELECT TRIM(CONCAT(surname,' ', name)) FROM " . OLD_TABLE_USERS . " WHERE " . OLD_TABLE_USERS . ".id = user_id) as userCreator,"
    . "DATE_FORMAT(dt_modifikace, '%d.%m.%Y %H:%i:%s') as dt_modifikace,"
    . "(SELECT TRIM(CONCAT(surname,' ', name)) FROM " . OLD_TABLE_USERS . " WHERE " . OLD_TABLE_USERS . ".id = upd_user_id) as userUpdater,"
    . "partner_nazev, partner_ic, partner_adresa, obsah, cena, cena_rok, platnost_do, ukonceno, DATE_FORMAT(dt_zverejneni, '%d.%m.%Y') as dt_zverejneni, zverejnit, idds,"
    . "(SELECT COUNT(id_smlouvy) FROM " . OLD_TABLE_OPRILOHY . "  WHERE " . OLD_TABLE_OPRILOHY . ".id_smlouvy = " . OLD_TABLE_OBJEDNAVKY . ".id) as prilohy,"
    . "poznamka, poznamka_garant,"
    . "(SELECT metadata FROM " . OLD_TABLE_OBJMD . " WHERE " . OLD_TABLE_OBJMD . ".objednavka_id = " . OLD_TABLE_OBJEDNAVKY . ".id) as objMetaData"
    . " FROM " . OLD_TABLE_OBJEDNAVKY
    . " WHERE datum_u BETWEEN :yearFrom AND :yearTo;";

$queries['old_react_order_id'] =
    "SELECT id,  evidencni_c, DATE_FORMAT(datum_u , '%d.%m.%Y') as datum_p, dodatek_sml_id, vypovedni_lhuta, "
    . "(SELECT garant FROM " . OLD_TABLE_GARANT . " WHERE " . OLD_TABLE_GARANT . ".id = garant_id) as garant,"
    . "(SELECT surname FROM " . OLD_TABLE_USERS . " WHERE " . OLD_TABLE_USERS . ".id = user_id) as uName,"
    . "(SELECT okres FROM " . OLD_TABLE_OKRESY . " WHERE " . OLD_TABLE_OKRESY . ".id = okres_id) as okres,"
    . "(SELECT umisteni FROM " . OLD_TABLE_UMISTENI . " WHERE " . OLD_TABLE_UMISTENI . ".id = umisteni_id) as umisteni,"
    . "(SELECT druh FROM " . OLD_TABLE_DRUH . " WHERE " . OLD_TABLE_DRUH . ".id = druh_sml_id) as druh_sml, tt_vyrc, tt_dinfo,"
    . "faktura, pokladni_dok, DATE_FORMAT(dt_pridani, '%d.%m.%Y %H:%i:%s') as dt_pridani,"
    . "(SELECT TRIM(CONCAT(surname,' ', name)) FROM " . OLD_TABLE_USERS . " WHERE " . OLD_TABLE_USERS . ".id = user_id) as userCreator,"
    . "DATE_FORMAT(dt_modifikace, '%d.%m.%Y %H:%i:%s') as dt_modifikace,"
    . "(SELECT TRIM(CONCAT(surname,' ', name)) FROM " . OLD_TABLE_USERS . " WHERE " . OLD_TABLE_USERS . ".id = upd_user_id) as userUpdater,"
    . "partner_nazev, partner_ic, partner_adresa, obsah, cena, cena_rok, platnost_do, ukonceno, DATE_FORMAT(dt_zverejneni, '%d.%m.%Y') as dt_zverejneni, zverejnit, idds,"
    . "(SELECT COUNT(id_smlouvy) FROM " . OLD_TABLE_OPRILOHY . "  WHERE " . OLD_TABLE_OPRILOHY . ".id_smlouvy = " . OLD_TABLE_OBJEDNAVKY . ".id) as prilohy,"
    . "poznamka, poznamka_garant,"
    . "(SELECT metadata FROM " . OLD_TABLE_OBJMD . " WHERE " . OLD_TABLE_OBJMD . ".objednavka_id = " . OLD_TABLE_OBJEDNAVKY . ".id) as objMetaData"
    . " FROM " . OLD_TABLE_OBJEDNAVKY
    . " WHERE " . OLD_TABLE_OBJEDNAVKY . ".id = :id";
// --- konec old selectů ---

// INSERT dotazy
$queries['objednavky_insert'] = "INSERT INTO ".TABLE_OBJEDNAVKY." 
    (uzivatel_id, dodavatel_id, lokalita_id, stav_id, nazev_objednavky, popis, poznamka, dt_vytvoreni, dt_aktualizace) 
    VALUES (:uzivatel_id, :dodavatel_id, :lokalita_id, :stav_id, :nazev_objednavky, :popis, :poznamka, NOW(), NOW())";

$queries['objednavky_insert_full'] = "INSERT INTO ".TABLE_OBJEDNAVKY." 
    (cislo_objednavky, datum_objednavky, objednatel_id, created_by_uzivatel_id, updated_by_uzivatel_id, garant_uzivatel_id, predmet, prikazce_id, max_cena_s_dph, stav_id, strediska, financovani_dodatek, stav_komentar, dt_vytvoreni, dt_aktualizace) 
    VALUES (:cislo_objednavky, :datum_objednavky, :objednatel_id, :created_by_uzivatel_id, :updated_by_uzivatel_id, :garant_uzivatel_id, :predmet, :prikazce_id, :max_cena_s_dph, :stav_id, :strediska, :financovani_dodatek, :stav_komentar, NOW(), NOW())";

$queries['objednavky_polozky_insert'] = "INSERT INTO ".TABLE_OBJEDNAVKY_POLOZKY."
    (objednavka_id, popis, cena_bez_dph, sazba_dph, cena_s_dph, dt_vytvoreni)
    VALUES (:objednavka_id, :popis, :cena_bez_dph, :sazba_dph, :cena_s_dph, NOW())";

// Opravené dotazy pro přílohy podle skutečné DB struktury
$queries['objednavky_prilohy_select_by_objednavka'] = "SELECT * FROM ".TABLE_OBJEDNAVKY_PRILOHY." WHERE objednavka_id = :objednavka_id ORDER BY dt_vytvoreni";
$queries['objednavky_prilohy_select_by_guid'] = "SELECT * FROM ".TABLE_OBJEDNAVKY_PRILOHY." WHERE guid = :guid LIMIT 1";
$queries['objednavky_prilohy_insert'] = "INSERT INTO ".TABLE_OBJEDNAVKY_PRILOHY."
    (objednavka_id, guid, typ_prilohy, originalni_nazev_souboru, systemova_cesta, velikost_souboru_b, nahrano_uzivatel_id, dt_vytvoreni)
    VALUES (:objednavka_id, :guid, :typ_prilohy, :originalni_nazev_souboru, :systemova_cesta, :velikost_souboru_b, :nahrano_uzivatel_id, NOW())";
$queries['objednavky_prilohy_update'] = "UPDATE ".TABLE_OBJEDNAVKY_PRILOHY." SET 
    typ_prilohy = :typ_prilohy, dt_aktualizace = NOW() WHERE id = :id";
$queries['objednavky_prilohy_delete'] = "DELETE FROM ".TABLE_OBJEDNAVKY_PRILOHY." WHERE id = :id";
$queries['objednavky_prilohy_delete_by_guid'] = "DELETE FROM ".TABLE_OBJEDNAVKY_PRILOHY." WHERE guid = :guid";

// Číselníky pro formuláře
$queries['ciselniky_pro_formular'] = [
    'stavy' => "SELECT id, typ_objektu, kod_stavu, nazev_stavu, popis FROM ".TABLE_CISELNIK_STAVY." ORDER BY id",
    'dodavatele' => "SELECT id, nazev AS dodavatel_nazev, ico, dic FROM ".TABLE_DODAVATELE." WHERE aktivni = 1 ORDER BY nazev",
    'lokality' => "SELECT id, nazev, typ FROM ".TABLE_LOKALITY." ORDER BY nazev"
];

// LOGIN dotaz pro uživatele (username + aktivni)
$queries['uzivatele_login'] = "SELECT id, username, password_hash, jmeno, prijmeni, email, role_id FROM ".TABLE_UZIVATELE." WHERE username = :username AND aktivni = 1 LIMIT 1";
$queries['uzivatele_login'] = "SELECT id, username, password_hash, jmeno, prijmeni, email FROM ".TABLE_UZIVATELE." WHERE username = :username AND aktivni = 1 LIMIT 1";

// KOMPLETNÍ dotaz pro uživatele s JOIN na všechny související tabulky
$queries['uzivatele_detail'] = "
    SELECT 
        u.id,
        u.username,
        u.titul_pred,
        u.jmeno,
        u.prijmeni,
        u.dt_posledni_aktivita,
        u.titul_za,
        u.email,
        u.telefon,
        u.aktivni,
        u.dt_vytvoreni,
        u.dt_aktualizace,
        
        -- FRONTEND CRITICAL IDs for form prefilling
        u.pozice_id,
        u.lokalita_id, 
        u.usek_id,
        u.organizace_id,
        
        /* role info removed: roles are provided via join table 25_uzivatele_role */
        
        IFNULL(p.nazev_pozice, '') as nazev_pozice,
        p.parent_id as pozice_parent_id,
        
        IFNULL(l.nazev, '') as lokalita_nazev,
        l.typ as lokalita_typ,
        l.parent_id as lokalita_parent_id,
        IFNULL(us.usek_nazev, '') as usek_nazev,
        IFNULL(us.usek_zkr, '') as usek_zkr,
        
        o.ico as organizace_ico,
        o.nazev_organizace,
        o.ulice_cislo as organizace_ulice_cislo,
        o.mesto as organizace_mesto,
        o.psc as organizace_psc,
        o.zastoupeny as organizace_zastoupeny,
        o.datova_schranka as organizace_datova_schranka,
        o.email as organizace_email,
        o.telefon as organizace_telefon,
        
        CONCAT_WS(' ', u_nadrizeny.titul_pred, u_nadrizeny.jmeno, u_nadrizeny.prijmeni, u_nadrizeny.titul_za) as nadrizeny_cely_jmeno
    /* role join removed: roles come from 25_uzivatele_role */

    FROM " . TABLE_UZIVATELE . " u
        /* role join removed: roles come from 25_uzivatele_role */
        LEFT JOIN " . TABLE_POZICE . " p ON u.pozice_id = p.id
        LEFT JOIN " . TABLE_LOKALITY . " l ON u.lokalita_id = l.id
        LEFT JOIN " . TABLE_USEKY . " us ON u.usek_id = us.id
        LEFT JOIN " . TABLE_ORGANIZACE . " o ON u.organizace_id = o.id
        LEFT JOIN " . TABLE_UZIVATELE . " u_nadrizeny ON p.parent_id = u_nadrizeny.pozice_id AND u_nadrizeny.aktivni = 1
    WHERE u.id = :id AND u.id > 0
";

// Rights for a given role (returns all columns from prava)
$queries['uzivatele_prava_by_role'] = "SELECT pr.* FROM " . TABLE_ROLE_PRAVA . " rp JOIN " . TABLE_PRAVA . " pr ON pr.id = rp.pravo_id WHERE rp.role_id = :role_id ORDER BY pr.id";
// Roles for a given user via join table
$queries['uzivatele_roles_by_user'] = "SELECT r.* FROM " . TABLE_UZIVATELE_ROLE . " ur JOIN " . TABLE_ROLE . " r ON r.id = ur.role_id WHERE ur.uzivatel_id = :uzivatel_id ORDER BY r.id";
// Přímá práva přiřazená uživateli přes user_id ve 25_role_prava
$queries['uzivatele_prava_direct_by_user'] = "SELECT pr.* FROM " . TABLE_ROLE_PRAVA . " rp JOIN " . TABLE_PRAVA . " pr ON pr.id = rp.pravo_id WHERE rp.user_id = :user_id ORDER BY pr.id";
// Dotaz pro získání uživatele podle username s kompletními daty
$queries['uzivatele_detail_by_username'] = "
    SELECT 
        u.id,
        u.username,
        u.titul_pred,
        u.jmeno,
        u.prijmeni,
        u.titul_za,
        u.email,
        u.telefon,
        u.aktivni,
        u.dt_vytvoreni,
        u.dt_aktualizace,
        
        /* role info removed: roles are provided via join table 25_uzivatele_role */
        
        IFNULL(p.nazev_pozice, '') as nazev_pozice,
        p.parent_id as pozice_parent_id,
        
        IFNULL(l.nazev, '') as lokalita_nazev,
        l.typ as lokalita_typ,
        l.parent_id as lokalita_parent_id,
        
        IFNULL(us.usek_zkr, '') as usek_zkr,
        IFNULL(us.usek_nazev, '') as usek_nazev,
        
        o.id as organizace_id,
        o.ico as organizace_ico,
        o.nazev_organizace,
        o.ulice_cislo as organizace_ulice_cislo,
        o.mesto as organizace_mesto,
        o.psc as organizace_psc,
        o.zastoupeny as organizace_zastoupeny,
        o.datova_schranka as organizace_datova_schranka,
        o.email as organizace_email,
        o.telefon as organizace_telefon
        
    FROM ".TABLE_UZIVATELE." u
    /* role join removed: roles come from 25_uzivatele_role */
    LEFT JOIN ".TABLE_POZICE." p ON u.pozice_id = p.id
    LEFT JOIN ".TABLE_LOKALITY." l ON u.lokalita_id = l.id
    LEFT JOIN ".TABLE_USEKY." us ON p.usek_id = us.id
    LEFT JOIN ".TABLE_ORGANIZACE." o ON u.organizace_id = o.id
    WHERE u.username = :username AND u.aktivni = 1
";

$queries['uzivatele_org_data_by_id'] = "
    SELECT 
        IFNULL(us.usek_zkr, '') as usek_zkr,
        o.ico as organizace_ico
    FROM ".TABLE_UZIVATELE." u
    LEFT JOIN ".TABLE_POZICE." p ON u.pozice_id = p.id
    LEFT JOIN ".TABLE_USEKY." us ON p.usek_id = us.id
    LEFT JOIN ".TABLE_ORGANIZACE." o ON u.organizace_id = o.id
    WHERE u.id = :id AND u.aktivni = 1
";
$queries['uzivatele_org_data_by_username'] = "
    SELECT 
        IFNULL(us.usek_zkr, '') as usek_zkr,
        o.ico as organizace_ico
    FROM ".TABLE_UZIVATELE." u
    LEFT JOIN ".TABLE_POZICE." p ON u.pozice_id = p.id
    LEFT JOIN ".TABLE_USEKY." us ON p.usek_id = us.id
    LEFT JOIN ".TABLE_ORGANIZACE." o ON u.organizace_id = o.id
    WHERE u.username = :username AND u.aktivni = 1
";

// === USERS MANAGEMENT API (CREATE, UPDATE, DELETE) ===

// Insert new user
$queries['uzivatele_insert'] = "INSERT INTO " . TABLE_UZIVATELE . " (
    username, password_hash, jmeno, prijmeni, titul_pred, titul_za, 
    email, telefon, usek_id, lokalita_id, pozice_id, organizace_id,
    aktivni, dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita
) VALUES (
    :username, :password_hash, :jmeno, :prijmeni, :titul_pred, :titul_za,
    :email, :telefon, :usek_id, :lokalita_id, :pozice_id, :organizace_id,
    :aktivni, NOW(), NOW(), NOW()
)";

// Update user by ID
$queries['uzivatele_update_by_id'] = "UPDATE " . TABLE_UZIVATELE . " SET 
    username = :username,
    jmeno = :jmeno,
    prijmeni = :prijmeni,
    titul_pred = :titul_pred,
    titul_za = :titul_za,
    email = :email,
    telefon = :telefon,
    usek_id = :usek_id,
    lokalita_id = :lokalita_id,
    pozice_id = :pozice_id,
    organizace_id = :organizace_id,
    aktivni = :aktivni,
    dt_aktualizace = NOW()
WHERE id = :id AND id > 0";

// Update user password
$queries['uzivatele_update_password'] = "UPDATE " . TABLE_UZIVATELE . " SET 
    password_hash = :password_hash,
    dt_aktualizace = NOW()
WHERE id = :id AND id > 0";

// Deactivate user (soft delete)
$queries['uzivatele_deactivate'] = "UPDATE " . TABLE_UZIVATELE . " SET 
    aktivni = 0,
    dt_aktualizace = NOW()
WHERE id = :id AND id > 0";

// Delete user (hard delete) - kompletní smazání ze systému
$queries['uzivatele_delete'] = "DELETE FROM " . TABLE_UZIVATELE . " WHERE id = :id AND id > 0";

// Check if username exists
$queries['uzivatele_check_username'] = "SELECT COUNT(*) as count FROM " . TABLE_UZIVATELE . " WHERE username = :username AND id != :exclude_id";

// Check if email exists  
$queries['uzivatele_check_email'] = "SELECT COUNT(*) as count FROM " . TABLE_UZIVATELE . " WHERE email = :email AND id != :exclude_id";

// User roles management
$queries['uzivatele_roles_delete_all'] = "DELETE FROM " . TABLE_UZIVATELE_ROLE . " WHERE uzivatel_id = :uzivatel_id";
$queries['uzivatele_roles_insert'] = "INSERT INTO " . TABLE_UZIVATELE_ROLE . " (uzivatel_id, role_id) VALUES (:uzivatel_id, :role_id)";

// Direct user rights management  
$queries['uzivatele_direct_rights_delete_all'] = "DELETE FROM " . TABLE_ROLE_PRAVA . " WHERE user_id = :user_id AND role_id = -1";
$queries['uzivatele_direct_rights_insert'] = "INSERT INTO " . TABLE_ROLE_PRAVA . " (user_id, role_id, pravo_id) VALUES (:user_id, -1, :pravo_id)";

// Validation queries
$queries['validate_usek_exists'] = "SELECT COUNT(*) as count FROM " . TABLE_USEKY . " WHERE id = :id";
$queries['validate_lokalita_exists'] = "SELECT COUNT(*) as count FROM " . TABLE_LOKALITY . " WHERE id = :id";
$queries['validate_pozice_exists'] = "SELECT COUNT(*) as count FROM " . TABLE_POZICE . " WHERE id = :id";
$queries['validate_organizace_exists'] = "SELECT COUNT(*) as count FROM " . TABLE_ORGANIZACE . " WHERE id = :id";
$queries['validate_role_exists'] = "SELECT COUNT(*) as count FROM " . TABLE_ROLE . " WHERE id = :id";
$queries['validate_pravo_exists'] = "SELECT COUNT(*) as count FROM " . TABLE_PRAVA . " WHERE id = :id";

 $sql_raw = <<<'SQL'
    SELECT 
        o.id,
        o.cislo_objednavky,
        o.datum_objednavky,
        o.predmet,
        o.strediska,
        o.financovani_dodatek,
        o.prikazce_id,
        o.max_cena_s_dph,
        o.zdroj_financovani,
        o.druh_objednavky,
        o.schvalil_uzivatel_id,
        o.datum_schvaleni,
        o.garant_uzivatel_id,
        o.objednatel_id,
        o.created_by_uzivatel_id,
        o.updated_by_uzivatel_id,
        o.dodavatel_id,
        o.dodavatel_nazev,
        o.dodavatel_adresa,
        o.dodavatel_ico,
        o.dodavatel_dic,
        o.dodavatel_zastoupeny,
        o.dodavatel_kontakt_jmeno,
        o.dodavatel_kontakt_email,
        o.dodavatel_kontakt_telefon,
        o.predpokladany_termin_dodani,
        o.misto_dodani,
        o.zaruka,
        o.stav_odeslano,
        o.datum_odeslani,
        o.potvrzeno_dodavatelem,
        o.datum_akceptace,
        o.potvrzeno_zpusob,
        o.zpusob_platby,
        o.zverejnit_registr_smluv,
        o.datum_zverejneni,
        o.registr_smluv_id,
        o.poznamka,
        o.stav_id,
        o.stav_datum,
        o.stav_komentar,
        o.aktivni,
    o.dt_vytvoreni,
        o.dt_aktualizace,
        
        u_objednatel.jmeno as objednatel_jmeno,
        u_objednatel.prijmeni as objednatel_prijmeni,
        u_garant.jmeno as garant_jmeno,
        u_garant.prijmeni as garant_prijmeni,
        
    s.nazev_stavu,
        
        (SELECT CONCAT('[', IFNULL(GROUP_CONCAT(
         CONCAT('{"id":', p.id,
             ',"popis":"', REPLACE(REPLACE(COALESCE(p.popis, ''), '\\', '\\\\'), '"', '\\"'),
             '","cena_bez_dph":', COALESCE(p.cena_bez_dph, 0),
             ',"sazba_dph":', COALESCE(p.sazba_dph, 0),
             ',"cena_s_dph":', COALESCE(p.cena_s_dph, 0),
             ',"dt_vytvoreni":"', COALESCE(DATE_FORMAT(p.dt_vytvoreni, '%Y-%m-%d %H:%i:%s'), ''),
             '","dt_aktualizace":"', COALESCE(DATE_FORMAT(p.dt_aktualizace, '%Y-%m-%d %H:%i:%s'), ''),
             '"}')
            ORDER BY p.id SEPARATOR ','), ''), ']')
         FROM {{TABLE_OBJEDNAVKY_POLOZKY}} p WHERE p.objednavka_id = o.id) as polozky,

        (SELECT CONCAT('[', IFNULL(GROUP_CONCAT(
         CONCAT('{"id":', a.id,
             ',"guid":"', REPLACE(REPLACE(COALESCE(a.guid, ''), '\\', '\\\\'), '"', '\\"'),
             '","typ_prilohy":"', REPLACE(REPLACE(COALESCE(a.typ_prilohy, ''), '\\', '\\\\'), '"', '\\"'),
             '","originalni_nazev_souboru":"', REPLACE(REPLACE(COALESCE(a.originalni_nazev_souboru, ''), '\\', '\\\\'), '"', '\\"'),
             '","systemova_cesta":"', REPLACE(REPLACE(COALESCE(a.systemova_cesta, ''), '\\', '\\\\'), '"', '\\"'),
             '","velikost_souboru_b":', COALESCE(a.velikost_souboru_b, 0),
             ',"nahrano_uzivatel_id":', COALESCE(a.nahrano_uzivatel_id, 0),
             ',"dt_vytvoreni":"', COALESCE(DATE_FORMAT(a.dt_vytvoreni, '%Y-%m-%d %H:%i:%s'), ''),
             '","dt_aktualizace":"', COALESCE(DATE_FORMAT(a.dt_aktualizace, '%Y-%m-%d %H:%i:%s'), ''),
             '"}')
            ORDER BY a.id SEPARATOR ','), ''), ']')
         FROM {{TABLE_OBJEDNAVKY_PRILOHY}} a WHERE a.objednavka_id = o.id) as prilohy

        
        
    FROM {{TABLE_OBJEDNAVKY}} o
    LEFT JOIN {{TABLE_UZIVATELE}} u_objednatel ON o.objednatel_id = u_objednatel.id
    LEFT JOIN {{TABLE_UZIVATELE}} u_garant ON o.garant_uzivatel_id = u_garant.id
    LEFT JOIN {{TABLE_CISELNIK_STAVY}} s ON o.stav_id = s.id
    ORDER BY o.id ASC
SQL;

$queries['objednavky_select_with_details'] = str_replace(
    ['{{TABLE_OBJEDNAVKY_POLOZKY}}', '{{TABLE_OBJEDNAVKY_PRILOHY}}', '{{TABLE_OBJEDNAVKY}}', '{{TABLE_UZIVATELE}}', '{{TABLE_CISELNIK_STAVY}}'],
    [TABLE_OBJEDNAVKY_POLOZKY, TABLE_OBJEDNAVKY_PRILOHY, TABLE_OBJEDNAVKY, TABLE_UZIVATELE, TABLE_CISELNIK_STAVY],
    $sql_raw
);

// Detail jedné objednávky se stejnou strukturou jako list
$queries['objednavky_select_one_with_details'] = str_replace(
    ['{{TABLE_OBJEDNAVKY_POLOZKY}}', '{{TABLE_OBJEDNAVKY_PRILOHY}}', '{{TABLE_OBJEDNAVKY}}', '{{TABLE_UZIVATELE}}', '{{TABLE_CISELNIK_STAVY}}'],
    [TABLE_OBJEDNAVKY_POLOZKY, TABLE_OBJEDNAVKY_PRILOHY, TABLE_OBJEDNAVKY, TABLE_UZIVATELE, TABLE_CISELNIK_STAVY],
    str_replace('ORDER BY o.id ASC', 'WHERE o.id = :id LIMIT 1', $sql_raw)
);

$queries['objednavky_polozky_by_objednavka'] = "SELECT * FROM ".TABLE_OBJEDNAVKY_POLOZKY." WHERE objednavka_id = :objednavka_id ORDER BY id";
$queries['objednavky_prilohy_by_objednavka'] = "SELECT * FROM ".TABLE_OBJEDNAVKY_PRILOHY." WHERE objednavka_id = :objednavka_id ORDER BY id";

// Query s aliasy pro orders25 kompatibilitu 
$queries['objednavky_prilohy_enriched_by_objednavka'] = "SELECT 
    p.id,
    p.objednavka_id,
    p.guid,
    p.typ_prilohy,
    p.typ_prilohy AS typ,
    p.originalni_nazev_souboru,
    p.originalni_nazev_souboru AS puvodni_nazev,
    p.originalni_nazev_souboru AS nazev_souboru,
    p.systemova_cesta,
    p.systemova_cesta AS cesta,
    p.velikost_souboru_b,
    p.velikost_souboru_b AS velikost,
    p.nahrano_uzivatel_id,
    p.dt_vytvoreni,
    p.dt_aktualizace,
    u.username AS nahrano_uzivatel_username,
    u.jmeno AS nahrano_uzivatel_jmeno,
    u.prijmeni AS nahrano_uzivatel_prijmeni,
    CONCAT(u.jmeno, ' ', u.prijmeni) AS nahrano_uzivatel_celne_jmeno
FROM ".TABLE_OBJEDNAVKY_PRILOHY." p
LEFT JOIN ".TABLE_UZIVATELE." u ON p.nahrano_uzivatel_id = u.id
WHERE p.objednavka_id = :objednavka_id 
ORDER BY p.dt_vytvoreni";

// === DODAVATELE QUERIES ===
$queries['dodavatele_select_all'] = "SELECT * FROM ".TABLE_DODAVATELE." ORDER BY nazev";
$queries['dodavatele_select_by_id'] = "SELECT * FROM ".TABLE_DODAVATELE." WHERE id = :id";
$queries['dodavatele_select_by_ico'] = "SELECT * FROM ".TABLE_DODAVATELE." WHERE ico = :ico";
$queries['dodavatele_search_nazev'] = "SELECT * FROM ".TABLE_DODAVATELE." WHERE nazev LIKE :nazev ORDER BY nazev";
$queries['dodavatele_search_combined'] = "SELECT * FROM ".TABLE_DODAVATELE." WHERE (:nazev IS NULL OR nazev LIKE :nazev) AND (:ico IS NULL OR ico = :ico) ORDER BY nazev";
$queries['dodavatele_filtered'] = "SELECT * FROM ".TABLE_DODAVATELE." WHERE 
    (user_id = 0) OR 
    (user_id = :user_id) OR 
    (usek_zkr != '' AND usek_zkr LIKE :usek_zkr_like) 
    ORDER BY nazev";
$queries['dodavatele_insert'] = "INSERT INTO ".TABLE_DODAVATELE." 
    (nazev, adresa, ico, dic, zastoupeny, kontakt_jmeno, kontakt_email, kontakt_telefon, user_id, usek_zkr, dt_vytvoreni, dt_aktualizace) 
    VALUES (:nazev, :adresa, :ico, :dic, :zastoupeny, :kontakt_jmeno, :kontakt_email, :kontakt_telefon, :user_id, :usek_zkr, NOW(), NOW())";
$queries['dodavatele_update'] = "UPDATE ".TABLE_DODAVATELE." SET 
    nazev = :nazev, adresa = :adresa, ico = :ico, dic = :dic, zastoupeny = :zastoupeny, 
    kontakt_jmeno = :kontakt_jmeno, kontakt_email = :kontakt_email, kontakt_telefon = :kontakt_telefon, 
    user_id = :user_id, usek_zkr = :usek_zkr, dt_aktualizace = NOW() 
    WHERE id = :id";
$queries['dodavatele_update_by_ico'] = "UPDATE ".TABLE_DODAVATELE." SET 
    nazev = :nazev, adresa = :adresa, dic = :dic, zastoupeny = :zastoupeny, 
    kontakt_jmeno = :kontakt_jmeno, kontakt_email = :kontakt_email, kontakt_telefon = :kontakt_telefon, 
    dt_aktualizace = NOW() 
    WHERE ico = :ico";

// Delete dodavatel
$queries['dodavatele_delete'] = "DELETE FROM ".TABLE_DODAVATELE." WHERE id = :id";

// ========== UŽIVATELSKÉ POZNÁMKY A TODO ==========

// Select user notes/TODO by user_id and type
$queries['uzivatele_poznamky_select_by_user_type'] = "SELECT * FROM ".TABLE_UZIVATELE_POZNAMKY." WHERE user_id = :user_id AND typ = :typ LIMIT 1";

// Select all notes/TODO for user
$queries['uzivatele_poznamky_select_by_user'] = "SELECT * FROM ".TABLE_UZIVATELE_POZNAMKY." WHERE user_id = :user_id ORDER BY typ";

// Insert new notes/TODO record (INSERT IGNORE to prevent duplicate key errors)
$queries['uzivatele_poznamky_insert'] = "INSERT IGNORE INTO ".TABLE_UZIVATELE_POZNAMKY." (user_id, typ, obsah, dt_vytvoreni) VALUES (:user_id, :typ, :obsah, NOW())";

// Insert new notes/TODO record
$queries['uzivatele_poznamky_insert'] = "INSERT INTO ".TABLE_UZIVATELE_POZNAMKY." (user_id, typ, obsah, dt_vytvoreni) VALUES (:user_id, :typ, :obsah, NOW())";

// Update existing notes/TODO content
$queries['uzivatele_poznamky_update'] = "UPDATE ".TABLE_UZIVATELE_POZNAMKY." SET obsah = :obsah WHERE id = :id";

// Upsert (INSERT ON DUPLICATE KEY UPDATE) - preferovaný způsob pro MySQL 5.6
$queries['uzivatele_poznamky_upsert'] = "INSERT INTO ".TABLE_UZIVATELE_POZNAMKY." (user_id, typ, obsah, dt_vytvoreni) VALUES (:user_id, :typ, :obsah, NOW()) ON DUPLICATE KEY UPDATE obsah = :obsah_update";

// Delete notes/TODO for user and type
$queries['uzivatele_poznamky_delete'] = "DELETE FROM ".TABLE_UZIVATELE_POZNAMKY." WHERE user_id = :user_id AND typ = :typ";

// Delete all notes/TODO for user
$queries['uzivatele_poznamky_delete_all_user'] = "DELETE FROM ".TABLE_UZIVATELE_POZNAMKY." WHERE user_id = :user_id";

// Statistics - count users with TODO/NOTES
$queries['uzivatele_poznamky_stats'] = "SELECT typ, COUNT(DISTINCT user_id) as pocet_uzivatelu FROM ".TABLE_UZIVATELE_POZNAMKY." GROUP BY typ";

// Select by ID (pro přímé načtení konkrétního záznamu)
$queries['uzivatele_poznamky_select_by_id'] = "SELECT * FROM ".TABLE_UZIVATELE_POZNAMKY." WHERE id = :id LIMIT 1";

// Select by multiple user IDs (pro batch loading)
$queries['uzivatele_poznamky_select_by_user_ids'] = "SELECT * FROM ".TABLE_UZIVATELE_POZNAMKY." WHERE user_id IN (:user_ids) ORDER BY user_id, typ";

// Select with user details (JOIN s tabulkou uživatelů)
$queries['uzivatele_poznamky_select_with_user_details'] = "
    SELECT 
        p.*,
        u.username,
        u.jmeno,
        u.prijmeni,
        u.email,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as uzivatel_cely_jmeno
    FROM ".TABLE_UZIVATELE_POZNAMKY." p
    LEFT JOIN ".TABLE_UZIVATELE." u ON p.user_id = u.id
    WHERE p.user_id = :user_id
    ORDER BY p.typ
";

// Search notes by content (full-text search v JSON obsahu)
$queries['uzivatele_poznamky_search_content'] = "SELECT * FROM ".TABLE_UZIVATELE_POZNAMKY." WHERE user_id = :user_id AND obsah LIKE :search_term ORDER BY dt_aktualizace DESC";

// Admin queries - pro administrátory
$queries['uzivatele_poznamky_admin_list_all'] = "
    SELECT 
        p.*,
        u.username,
        u.jmeno,
        u.prijmeni,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as uzivatel_cely_jmeno,
        CHAR_LENGTH(p.obsah) as obsah_velikost
    FROM ".TABLE_UZIVATELE_POZNAMKY." p
    LEFT JOIN ".TABLE_UZIVATELE." u ON p.user_id = u.id
    ORDER BY p.dt_aktualizace DESC
    LIMIT :limit OFFSET :offset
";

// Count total records for pagination
$queries['uzivatele_poznamky_admin_count'] = "SELECT COUNT(*) as total FROM ".TABLE_UZIVATELE_POZNAMKY;

// Recent activity - nedávno upravené poznámky
$queries['uzivatele_poznamky_recent_activity'] = "
    SELECT 
        p.*,
        u.username,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as uzivatel_cely_jmeno
    FROM ".TABLE_UZIVATELE_POZNAMKY." p
    LEFT JOIN ".TABLE_UZIVATELE." u ON p.user_id = u.id
    WHERE p.dt_aktualizace >= DATE_SUB(NOW(), INTERVAL :days DAY)
    ORDER BY p.dt_aktualizace DESC
    LIMIT :limit
";

// ========================================
// CHAT SYSTÉM QUERIES
// ========================================

// Načtení všech konverzací pro uživatele
$queries['chat_konverzace_select_by_user'] = "
    SELECT 
        k.*,
        COUNT(DISTINCT u.user_id) as pocet_ucastniku,
        (SELECT COUNT(*) FROM ".TABLE_CHAT_ZPRAVY." z 
         WHERE z.konverzace_id = k.id AND z.smazano = 0) as pocet_zprav,
        (SELECT COUNT(*) FROM ".TABLE_CHAT_ZPRAVY." z 
         WHERE z.konverzace_id = k.id AND z.smazano = 0 
         AND z.dt_vytvoreni > COALESCE(muj.dt_posledni_precteni, '1970-01-01')) as neprectenych_zprav
    FROM ".TABLE_CHAT_KONVERZACE." k
    LEFT JOIN ".TABLE_CHAT_UCASTNICI." u ON k.id = u.konverzace_id AND u.aktivni = 1
    LEFT JOIN ".TABLE_CHAT_UCASTNICI." muj ON k.id = muj.konverzace_id AND muj.user_id = :user_id AND muj.aktivni = 1
    WHERE k.aktivni = 1 
    AND (
        k.typ = 'BROADCAST' OR
        muj.user_id IS NOT NULL OR
        (k.typ = 'USEK' AND k.usek_id IN (
            SELECT us.id FROM ".TABLE_USEKY." us 
            JOIN ".TABLE_POZICE." p ON us.id = p.usek_id 
            JOIN ".TABLE_UZIVATELE." uz ON p.id = uz.pozice_id 
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
    FROM ".TABLE_CHAT_KONVERZACE." k
    LEFT JOIN ".TABLE_UZIVATELE." u_creator ON k.created_by_user_id = u_creator.id
    LEFT JOIN ".TABLE_USEKY." us ON k.usek_id = us.id
    LEFT JOIN ".TABLE_CHAT_UCASTNICI." ucast ON k.id = ucast.konverzace_id AND ucast.aktivni = 1
    WHERE k.id = :konverzace_id AND k.aktivni = 1
    GROUP BY k.id
";

// Vytvoření nové konverzace
$queries['chat_konverzace_insert'] = "
    INSERT INTO ".TABLE_CHAT_KONVERZACE." 
    (nazev, typ, usek_id, popis, created_by_user_id, dt_vytvoreni) 
    VALUES (:nazev, :typ, :usek_id, :popis, :created_by_user_id, NOW())
";

// Aktualizace času poslední zprávy v konverzaci
$queries['chat_konverzace_update_last_message'] = "
    UPDATE ".TABLE_CHAT_KONVERZACE." 
    SET dt_posledni_zprava = NOW() 
    WHERE id = :konverzace_id
";

// Načtení účastníků konverzace
$queries['chat_ucastnici_select_by_konverzace'] = "
    SELECT 
        u.*,
        CONCAT_WS(' ', uz.titul_pred, uz.jmeno, uz.prijmeni, uz.titul_za) as uzivatel_jmeno,
        uz.email,
        os.status as online_status,
        os.posledni_aktivita
    FROM ".TABLE_CHAT_UCASTNICI." u
    JOIN ".TABLE_UZIVATELE." uz ON u.user_id = uz.id
    LEFT JOIN ".TABLE_CHAT_ONLINE_STATUS." os ON u.user_id = os.user_id
    WHERE u.konverzace_id = :konverzace_id AND u.aktivni = 1
    ORDER BY u.role DESC, uz.jmeno, uz.prijmeni
";

// Přidání účastníka do konverzace
$queries['chat_ucastnici_insert'] = "
    INSERT INTO ".TABLE_CHAT_UCASTNICI." 
    (konverzace_id, user_id, role, dt_pripojeni) 
    VALUES (:konverzace_id, :user_id, :role, NOW())
    ON DUPLICATE KEY UPDATE aktivni = 1, dt_pripojeni = NOW()
";

// Aktualizace času posledního přečtení
$queries['chat_ucastnici_update_last_read'] = "
    UPDATE ".TABLE_CHAT_UCASTNICI." 
    SET dt_posledni_precteni = NOW(), dt_posledni_aktivita = NOW() 
    WHERE konverzace_id = :konverzace_id AND user_id = :user_id
";

// Kontrola oprávnění uživatele ke konverzaci
$queries['chat_ucastnici_check_permission'] = "
    SELECT u.*, k.typ, k.usek_id
    FROM ".TABLE_CHAT_UCASTNICI." u
    JOIN ".TABLE_CHAT_KONVERZACE." k ON u.konverzace_id = k.id
    WHERE u.konverzace_id = :konverzace_id AND u.user_id = :user_id AND u.aktivni = 1
    LIMIT 1
";

// Načtení zpráv z konverzace (s paginací a časovým filtrem)
$queries['chat_zpravy_select_by_konverzace'] = "
    SELECT 
        z.*,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as author_jmeno,
        u.username as author_username,
        parent_z.obsah_plain as parent_obsah,
        CONCAT_WS(' ', parent_u.titul_pred, parent_u.jmeno, parent_u.prijmeni, parent_u.titul_za) as parent_author_jmeno,
        (SELECT COUNT(*) FROM ".TABLE_CHAT_REAKCE." r WHERE r.zprava_id = z.id) as pocet_reakci,
        (SELECT GROUP_CONCAT(DISTINCT r.emoji ORDER BY r.emoji SEPARATOR ',') 
         FROM ".TABLE_CHAT_REAKCE." r WHERE r.zprava_id = z.id) as reakce_emoji
    FROM ".TABLE_CHAT_ZPRAVY." z
    JOIN ".TABLE_UZIVATELE." u ON z.user_id = u.id
    LEFT JOIN ".TABLE_CHAT_ZPRAVY." parent_z ON z.parent_zprava_id = parent_z.id
    LEFT JOIN ".TABLE_UZIVATELE." parent_u ON parent_z.user_id = parent_u.id
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
        (SELECT COUNT(*) FROM ".TABLE_CHAT_REAKCE." r WHERE r.zprava_id = z.id) as pocet_reakci
    FROM ".TABLE_CHAT_ZPRAVY." z
    JOIN ".TABLE_UZIVATELE." u ON z.user_id = u.id
    WHERE z.konverzace_id = :konverzace_id 
    AND z.smazano = 0
    AND z.dt_vytvoreni > :posledni_cas
    ORDER BY z.dt_vytvoreni ASC
";

// Vložení nové zprávy
$queries['chat_zpravy_insert'] = "
    INSERT INTO ".TABLE_CHAT_ZPRAVY." 
    (konverzace_id, user_id, parent_zprava_id, obsah, obsah_plain, typ, metadata, dt_vytvoreni) 
    VALUES (:konverzace_id, :user_id, :parent_zprava_id, :obsah, :obsah_plain, :typ, :metadata, NOW())
";

// Editace zprávy
$queries['chat_zpravy_update'] = "
    UPDATE ".TABLE_CHAT_ZPRAVY." 
    SET obsah = :obsah, obsah_plain = :obsah_plain, metadata = :metadata, 
        editovano = 1, dt_editace = NOW() 
    WHERE id = :zprava_id AND user_id = :user_id AND smazano = 0
";

// Smazání zprávy (soft delete)
$queries['chat_zpravy_delete'] = "
    UPDATE ".TABLE_CHAT_ZPRAVY." 
    SET smazano = 1, dt_smazani = NOW() 
    WHERE id = :zprava_id AND user_id = :user_id
";

// Vyhledávání ve zprávách (bez FULLTEXT indexu - použije LIKE)
$queries['chat_zpravy_search'] = "
    SELECT 
        z.*,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as author_jmeno,
        k.nazev as konverzace_nazev,
        (CASE 
            WHEN z.obsah_plain LIKE CONCAT('%', :search_term, '%') THEN 1.0
            WHEN z.obsah LIKE CONCAT('%', :search_term, '%') THEN 0.8
            ELSE 0.5
        END) as relevance
    FROM ".TABLE_CHAT_ZPRAVY." z
    JOIN ".TABLE_UZIVATELE." u ON z.user_id = u.id
    JOIN ".TABLE_CHAT_KONVERZACE." k ON z.konverzace_id = k.id
    JOIN ".TABLE_CHAT_UCASTNICI." uc ON k.id = uc.konverzace_id AND uc.user_id = :user_id AND uc.aktivni = 1
    WHERE z.smazano = 0
    AND (z.obsah_plain LIKE CONCAT('%', :search_term, '%') OR z.obsah LIKE CONCAT('%', :search_term, '%'))
    ORDER BY relevance DESC, z.dt_vytvoreni DESC
    LIMIT :limit
";

// Načtení nepřečtených zmínek pro uživatele
$queries['chat_mentions_select_unread'] = "
    SELECT 
        m.*,
        z.obsah_plain,
        z.dt_vytvoreni as zprava_dt,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as author_jmeno,
        k.nazev as konverzace_nazev
    FROM ".TABLE_CHAT_MENTIONS." m
    JOIN ".TABLE_CHAT_ZPRAVY." z ON m.zprava_id = z.id
    JOIN ".TABLE_UZIVATELE." u ON z.user_id = u.id
    JOIN ".TABLE_CHAT_KONVERZACE." k ON z.konverzace_id = k.id
    WHERE m.user_id = :user_id AND m.precteno = 0 AND z.smazano = 0
    ORDER BY z.dt_vytvoreni DESC
    LIMIT :limit
";

// Vložení zmínky
$queries['chat_mentions_insert'] = "
    INSERT INTO ".TABLE_CHAT_MENTIONS." 
    (zprava_id, user_id, pozice_start, pozice_end, dt_vytvoreni) 
    VALUES (:zprava_id, :user_id, :pozice_start, :pozice_end, NOW())
    ON DUPLICATE KEY UPDATE pozice_start = VALUES(pozice_start), pozice_end = VALUES(pozice_end)
";

// Označení zmínky jako přečtené
$queries['chat_mentions_mark_read'] = "
    UPDATE ".TABLE_CHAT_MENTIONS." 
    SET precteno = 1, dt_precteni = NOW() 
    WHERE user_id = :user_id AND zprava_id = :zprava_id
";

// Přidání/odebrání reakce
$queries['chat_reakce_toggle'] = "
    INSERT INTO ".TABLE_CHAT_REAKCE." (zprava_id, user_id, emoji, dt_vytvoreni) 
    VALUES (:zprava_id, :user_id, :emoji, NOW())
    ON DUPLICATE KEY UPDATE dt_vytvoreni = NOW()
";

$queries['chat_reakce_remove'] = "
    DELETE FROM ".TABLE_CHAT_REAKCE." 
    WHERE zprava_id = :zprava_id AND user_id = :user_id AND emoji = :emoji
";

// Načtení reakcí na zprávu
$queries['chat_reakce_select_by_zprava'] = "
    SELECT 
        r.*,
        CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za) as uzivatel_jmeno
    FROM ".TABLE_CHAT_REAKCE." r
    JOIN ".TABLE_UZIVATELE." u ON r.user_id = u.id
    WHERE r.zprava_id = :zprava_id
    ORDER BY r.dt_vytvoreni ASC
";

// Aktualizace online statusu
$queries['chat_online_status_upsert'] = "
    INSERT INTO ".TABLE_CHAT_ONLINE_STATUS." 
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
    FROM ".TABLE_CHAT_ONLINE_STATUS." os
    JOIN ".TABLE_UZIVATELE." u ON os.user_id = u.id
    WHERE os.user_id IN (:user_ids)
    ORDER BY os.posledni_aktivita DESC
";

// Označení neaktivních uživatelů jako offline (starší než X minut)
$queries['chat_online_status_mark_offline'] = "
    UPDATE ".TABLE_CHAT_ONLINE_STATUS." 
    SET status = 'OFFLINE' 
    WHERE posledni_aktivita < DATE_SUB(NOW(), INTERVAL :minutes MINUTE) 
    AND status != 'OFFLINE'
";

// ============ HIERARCHIE UŽIVATELŮ ============
// ============ DEPRECATED: STARÁ HIERARCHIE (25_uzivatele_hierarchie) ============
// Tyto queries byly odstraněny 13.12.2025 - tabulka již neexistuje
// Nová hierarchie používá structure_json v 25_hierarchie_profily a hierarchyHandlers.php
/*
$queries['hierarchy_get_subordinates'] = "..."; // REMOVED
$queries['hierarchy_get_superiors'] = "..."; // REMOVED  
$queries['hierarchy_add_relation'] = "..."; // REMOVED
$queries['hierarchy_remove_relation'] = "..."; // REMOVED
*/

// ============ ZASTUPOVÁNÍ UŽIVATELŮ ============
$queries['substitution_get_active'] = "
    SELECT 
        z.id,
        z.zastupovany_id,
        z.zastupce_id,
        z.dt_od,
        z.dt_do,
        z.typ_zastupovani,
        z.popis,
        zu.username as zastupovany_username,
        zu.jmeno as zastupovany_jmeno,
        zu.prijmeni as zastupovany_prijmeni,
        zs.username as zastupce_username,
        zs.jmeno as zastupce_jmeno,
        zs.prijmeni as zastupce_prijmeni,
        v.username as vytvoril_username
    FROM 25_uzivatele_zastupovani z
    JOIN 25_uzivatele zu ON z.zastupovany_id = zu.id
    JOIN 25_uzivatele zs ON z.zastupce_id = zs.id
    JOIN 25_uzivatele v ON z.vytvoril_user_id = v.id
    WHERE z.aktivni = 1
    AND CURDATE() BETWEEN z.dt_od AND z.dt_do
    ORDER BY z.dt_od DESC
";

$queries['substitution_get_by_user'] = "
    SELECT 
        z.id,
        z.zastupovany_id,
        z.zastupce_id,
        z.dt_od,
        z.dt_do,
        z.typ_zastupovani,
        z.popis,
        z.aktivni,
        zu.username as zastupovany_username,
        zu.jmeno as zastupovany_jmeno,
        zu.prijmeni as zastupovany_prijmeni,
        zs.username as zastupce_username,
        zs.jmeno as zastupce_jmeno,
        zs.prijmeni as zastupce_prijmeni
    FROM 25_uzivatele_zastupovani z
    JOIN 25_uzivatele zu ON z.zastupovany_id = zu.id
    JOIN 25_uzivatele zs ON z.zastupce_id = zs.id
    WHERE (z.zastupovany_id = :user_id OR z.zastupce_id = :user_id)
    AND z.aktivni = 1
    ORDER BY z.dt_od DESC
";

$queries['substitution_create'] = "
    INSERT INTO 25_uzivatele_zastupovani 
    (zastupovany_id, zastupce_id, dt_od, dt_do, typ_zastupovani, popis, vytvoril_user_id, dt_vytvoreni)
    VALUES (:zastupovany_id, :zastupce_id, :dt_od, :dt_do, :typ_zastupovani, :popis, :vytvoril_user_id, NOW())
";

$queries['substitution_update'] = "
    UPDATE 25_uzivatele_zastupovani 
    SET dt_od = :dt_od,
        dt_do = :dt_do,
        typ_zastupovani = :typ_zastupovani,
        popis = :popis,
        dt_aktualizace = NOW()
    WHERE id = :substitution_id
    AND aktivni = 1
";

$queries['substitution_deactivate'] = "
    UPDATE 25_uzivatele_zastupovani 
    SET aktivni = 0, dt_aktualizace = NOW()
    WHERE id = :substitution_id
";

$queries['substitution_check_current'] = "
    SELECT 
        z.zastupovany_id,
        z.typ_zastupovani,
        zu.username as zastupovany_username,
        zu.jmeno as zastupovany_jmeno,
        zu.prijmeni as zastupovany_prijmeni
    FROM 25_uzivatele_zastupovani z
    JOIN 25_uzivatele zu ON z.zastupovany_id = zu.id
    WHERE z.zastupce_id = :zastupce_id
    AND z.aktivni = 1
    AND CURDATE() BETWEEN z.dt_od AND z.dt_do
    ORDER BY z.dt_od
";

// ============ SCHVALOVACÍ PRAVOMOCI ============
$queries['approval_get_user_permissions'] = "
    SELECT DISTINCT p.kod_prava, p.nazev
    FROM 25_prava p
    WHERE p.kod_prava LIKE 'ORDER_APPROVE%'
    AND (
        p.id IN (
            -- Přímá práva
            SELECT up.pravo_id FROM 25_uzivatele_prava up WHERE up.uzivatel_id = :user_id
        ) OR p.id IN (
            -- Práva z rolí
            SELECT rp.pravo_id 
            FROM 25_uzivatele_role ur
            JOIN 25_role_prava rp ON ur.role_id = rp.role_id
            WHERE ur.uzivatel_id = :user_id
        ) OR EXISTS (
            -- Zastupování - práva zastupovaného
            SELECT 1 FROM 25_uzivatele_zastupovani z
            WHERE z.zastupce_id = :user_id
            AND z.aktivni = 1
            AND CURDATE() BETWEEN z.dt_od AND z.dt_do
            AND z.typ_zastupovani IN ('full', 'orders_only')
            AND (
                p.id IN (SELECT up2.pravo_id FROM 25_uzivatele_prava up2 WHERE up2.uzivatel_id = z.zastupovany_id)
                OR p.id IN (
                    SELECT rp2.pravo_id 
                    FROM 25_uzivatele_role ur2
                    JOIN 25_role_prava rp2 ON ur2.role_id = rp2.role_id
                    WHERE ur2.uzivatel_id = z.zastupovany_id
                )
            )
        )
    )
";

// === USER DETAIL WITH FULL DATA AND ORDER STATISTICS ===
// Kompletní user detail s objekty (usek, pozice, lokalita, organizace, nadrizeny)
$queries['user_detail_full'] = "
    SELECT 
        u.id as uzivatel_id,
        u.username as login,
        u.username,
        u.jmeno,
        u.prijmeni,
        u.email,
        u.telefon,
        u.titul_pred,
        u.titul_za,
        u.aktivni,
        u.dt_vytvoreni,
        u.dt_aktualizace,
        u.dt_posledni_aktivita,
        
        -- Usek (object)
        us.id as usek_id,
        us.usek_nazev as usek_nazev,
        us.usek_zkr as usek_zkratka,
        
        -- Pozice (object)
        p.id as pozice_id,
        p.nazev_pozice as pozice_nazev,
        p.parent_id as pozice_parent_id,
        
        -- Lokalita (object)
        l.id as lokalita_id,
        l.nazev as lokalita_nazev,
        l.typ as lokalita_typ,
        l.parent_id as lokalita_parent_id,
        
        -- Organizace (object)
        o.id as organizace_id,
        o.nazev_organizace as organizace_nazev,
        o.ico as organizace_ico,
        o.dic as organizace_dic,
        o.zkrtaka as organizace_zkratka,
        o.ulice_cislo as organizace_ulice_cislo,
        o.mesto as organizace_mesto,
        o.psc as organizace_psc,
        o.zastoupeny as organizace_zastoupeny,
        o.datova_schranka as organizace_datova_schranka,
        o.email as organizace_email,
        o.telefon as organizace_telefon,
        
        -- Nadrizeny (object) - temporarily NULL after removing old hierarchy
        NULL as nadrizeny_id,
        NULL as nadrizeny_cely_jmeno
        
    FROM " . TABLE_UZIVATELE . " u
    LEFT JOIN " . TABLE_USEKY . " us ON u.usek_id = us.id
    LEFT JOIN " . TABLE_POZICE . " p ON u.pozice_id = p.id
    LEFT JOIN " . TABLE_LOKALITY . " l ON u.lokalita_id = l.id
    LEFT JOIN " . TABLE_ORGANIZACE . " o ON u.organizace_id = o.id
    -- REMOVED: Old hierarchy table (25_uzivatele_hierarchie) - nadrizeny field temporarily NULL
    -- LEFT JOIN " . TABLE_UZIVATELE_HIERARCHIE . " h ON u.id = h.podrizeny_id
    -- LEFT JOIN " . TABLE_UZIVATELE . " nadrizeny ON h.nadrizeny_id = nadrizeny.id AND nadrizeny.aktivni = 1
    WHERE u.id = :user_id
    LIMIT 1
";

// Statistiky objednávek podle stav_objednavky
// OPRAVENO: JOIN na číselník stavů, mapování podle skutečných hodnot z DB
// ARCHIVOVANO (NULL) - bez číselníku, fallback na přímé porovnání
$queries['user_orders_statistics'] = "
    SELECT 
        COUNT(DISTINCT o.id) as celkem,
        SUM(CASE WHEN cs.kod_stavu = 'NOVA' OR (cs.kod_stavu IS NULL AND o.stav_objednavky = 'NOVA') THEN 1 ELSE 0 END) as nova,
        SUM(CASE WHEN cs.kod_stavu = 'ODESLANA_KE_SCHVALENI' THEN 1 ELSE 0 END) as ke_schvaleni,
        SUM(CASE WHEN cs.kod_stavu = 'SCHVALENA' THEN 1 ELSE 0 END) as schvalena,
        SUM(CASE WHEN cs.kod_stavu = 'ZAMITNUTA' THEN 1 ELSE 0 END) as zamitnuta,
        SUM(CASE WHEN cs.kod_stavu = 'ROZPRACOVANA' THEN 1 ELSE 0 END) as rozpracovana,
        SUM(CASE WHEN cs.kod_stavu = 'ODESLANA' THEN 1 ELSE 0 END) as odeslana,
        SUM(CASE WHEN cs.kod_stavu = 'POTVRZENA' THEN 1 ELSE 0 END) as potvrzena,
        SUM(CASE WHEN cs.kod_stavu = 'UVEREJNIT' THEN 1 ELSE 0 END) as uverejnena,
        SUM(CASE WHEN cs.kod_stavu = 'CEKA_POTVRZENI' THEN 1 ELSE 0 END) as ceka_potvrzeni,
        SUM(CASE WHEN cs.kod_stavu = 'DOKONCENA' THEN 1 ELSE 0 END) as dokoncena,
        SUM(CASE WHEN cs.kod_stavu IN ('ZRUSENA', 'STORNO') THEN 1 ELSE 0 END) as zrusena,
        SUM(CASE WHEN cs.kod_stavu = 'SMAZANA' THEN 1 ELSE 0 END) as smazana,
        SUM(CASE WHEN cs.kod_stavu IS NULL AND o.stav_objednavky = 'ARCHIVOVANO' THEN 1 ELSE 0 END) as archivovano,
        SUM(CASE WHEN cs.kod_stavu = 'VECNA_SPRAVNOST' THEN 1 ELSE 0 END) as vecna_spravnost,
        SUM(CASE WHEN cs.kod_stavu = 'ZKONTROLOVANA' THEN 1 ELSE 0 END) as zkontrolovana
    FROM " . TABLE_OBJEDNAVKY . " o
    LEFT JOIN " . TABLE_CISELNIK_STAVY . " cs 
        ON cs.nazev_stavu = o.stav_objednavky 
        AND cs.typ_objektu = 'OBJEDNAVKA'
    WHERE o.uzivatel_id = :user_id AND o.aktivni = 1
";

// Role s právy pro daného uživatele
$queries['user_roles_with_rights'] = "
    SELECT 
        r.id,
        r.nazev_role,
        r.popis
    FROM " . TABLE_UZIVATELE_ROLE . " ur
    JOIN " . TABLE_ROLE . " r ON ur.role_id = r.id
    WHERE ur.uzivatel_id = :user_id
    ORDER BY r.nazev_role
";

// Práva dané role
$queries['role_rights'] = "
    SELECT 
        p.id,
        p.kod_prava,
        p.popis
    FROM " . TABLE_ROLE_PRAVA . " rp
    JOIN " . TABLE_PRAVA . " p ON rp.pravo_id = p.id
    WHERE rp.role_id = :role_id
    ORDER BY p.kod_prava
";

// Přímá práva uživatele (mimo role)
$queries['user_direct_rights'] = "
    SELECT 
        p.id,
        p.kod_prava,
        p.popis
    FROM " . TABLE_ROLE_PRAVA . " rp
    JOIN " . TABLE_PRAVA . " p ON rp.pravo_id = p.id
    WHERE rp.user_id = :user_id
    ORDER BY p.kod_prava
";

?>