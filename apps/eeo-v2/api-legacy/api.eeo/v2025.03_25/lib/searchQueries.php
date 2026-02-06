<?php

/**
 * Universal Search - SQL Query Builder
 * PHP 5.6 + MySQL 5.5.43 compatible
 * 
 * Funkce vracející SQL dotazy pro jednotlivé kategorie
 * Všechny dotazy používají prepared statements s parametry
 */

/**
 * SQL pro vyhledávání v uživatelích
 * JOIN na 25_pozice pro název pozice
 * 
 * @return string SQL dotaz
 */
function getSqlSearchUsers() {
    return "
        SELECT 
            u.id,
            u.username,
            u.jmeno,
            u.prijmeni,
            u.titul_pred,
            u.titul_za,
            u.email,
            u.telefon,
            p.nazev_pozice as pozice_nazev,
            CONCAT(
                COALESCE(us.usek_zkr, ''),
                IF(us.usek_zkr IS NOT NULL AND us.usek_nazev IS NOT NULL, ' - ', ''),
                COALESCE(us.usek_nazev, '')
            ) as usek,
            l.nazev as lokalita,
            l.kod as lokalita_kod,
            u.aktivni,
            DATE_FORMAT(u.dt_vytvoreni, '%Y-%m-%d %H:%i:%s') as dt_vytvoreni,
            DATE_FORMAT(u.dt_aktualizace, '%Y-%m-%d %H:%i:%s') as dt_aktualizace,
            CASE
                WHEN u.telefon LIKE :query THEN 'telefon'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(u.telefon, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE :query_normalized THEN 'telefon'
                WHEN u.email LIKE :query THEN 'email'
                WHEN CONCAT(u.jmeno, ' ', u.prijmeni) LIKE :query THEN 'jmeno'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     CONCAT(u.jmeno, ' ', u.prijmeni),
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'jmeno'
                WHEN u.username LIKE :query THEN 'username'
                WHEN u.titul_pred LIKE :query THEN 'titul'
                WHEN u.titul_za LIKE :query THEN 'titul'
                WHEN p.nazev_pozice LIKE :query THEN 'pozice'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     p.nazev_pozice,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'pozice'
                ELSE 'other'
            END as match_type
        FROM " . TBL_UZIVATELE . " u
        LEFT JOIN " . TBL_POZICE . " p ON u.pozice_id = p.id
        LEFT JOIN " . TBL_USEKY . " us ON u.usek_id = us.id
        LEFT JOIN " . TBL_LOKALITY . " l ON u.lokalita_id = l.id
        WHERE (
            u.telefon LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(u.telefon, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE :query_normalized
            OR u.email LIKE :query
            OR CONCAT(u.jmeno, ' ', u.prijmeni) LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               CONCAT(u.jmeno, ' ', u.prijmeni),
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR u.username LIKE :query
            OR u.titul_pred LIKE :query
            OR u.titul_za LIKE :query
            OR p.nazev_pozice LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               p.nazev_pozice,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
        )
        AND (:is_admin = 1 OR u.aktivni = 1 OR :include_inactive = 1)
        AND (:is_admin = 1 OR u.viditelny_v_tel_seznamu = 1)
        ORDER BY u.prijmeni, u.jmeno
        LIMIT :limit
    ";
}

/**
 * SQL pro vyhledávání v objednávkách 2025 (25a_objednavky)
 * JOINy na stavy, uživatele
 * 
 * @return string SQL dotaz
 */
function getSqlSearchOrders2025() {
    return "
        SELECT 
            o.id,
            o.cislo_objednavky,
            o.predmet,
            o.poznamka,
            o.financovani,
            o.stav_objednavky as stav,
            o.stav_workflow_kod as stav_kod,
            o.max_cena_s_dph,
            o.dodavatel_nazev,
            o.dodavatel_ico,
            o.dodavatel_kontakt_jmeno as dodavatel_kontakt,
            o.dodavatel_kontakt_telefon,
            o.dodavatel_kontakt_email,
            CONCAT(
                COALESCE(u_creator.jmeno, ''), 
                ' ', 
                COALESCE(u_creator.prijmeni, '')
            ) as creator,
            CONCAT(
                COALESCE(u_garant.jmeno, ''), 
                ' ', 
                COALESCE(u_garant.prijmeni, '')
            ) as garant,
            CONCAT(
                COALESCE(u_schval.jmeno, ''), 
                ' ', 
                COALESCE(u_schval.prijmeni, '')
            ) as schvalovatel,
            CONCAT(
                COALESCE(u_prikazce.jmeno, ''), 
                ' ', 
                COALESCE(u_prikazce.prijmeni, '')
            ) as prikazce,
            (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_PRILOHY . " WHERE objednavka_id = o.id) as pocet_priloh_obj,
            (SELECT COUNT(*) FROM " . TBL_FAKTURY . " WHERE objednavka_id = o.id AND aktivni = 1) as pocet_faktur,
            DATE(o.dt_objednavky) as datum_objednavky,
            DATE(o.dt_schvaleni) as datum_schvaleni,
            DATE(o.dt_odeslani) as datum_odeslani,
            DATE(o.dt_akceptace) as datum_akceptace,
            DATE(o.dt_zverejneni) as datum_zverejneni,
            DATE(o.dt_faktura_pridana) as datum_faktura_pridana,
            DATE(o.dt_dokonceni) as datum_dokonceni,
            DATE(o.dt_potvrzeni_vecne_spravnosti) as datum_vecne_spravnosti,
            o.dt_vytvoreni,
            o.dt_aktualizace,
            o.aktivni,
            CASE
                WHEN o.cislo_objednavky LIKE :query THEN 'cislo_objednavky'
                WHEN o.predmet LIKE :query THEN 'predmet'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     o.predmet,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'predmet'
                WHEN o.poznamka LIKE :query THEN 'poznamka'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     o.poznamka,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'poznamka'
                WHEN o.financovani LIKE :query THEN 'financovani'
                WHEN o.stav_objednavky LIKE :query THEN 'stav_objednavky'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     o.stav_objednavky,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'stav_objednavky'
                WHEN o.dodavatel_nazev LIKE :query THEN 'dodavatel_nazev'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     o.dodavatel_nazev,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'dodavatel_nazev'
                WHEN o.dodavatel_ico LIKE :query THEN 'dodavatel_ico'
                WHEN o.dodavatel_kontakt_telefon LIKE :query THEN 'dodavatel_kontakt_telefon'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(o.dodavatel_kontakt_telefon, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE :query_normalized THEN 'dodavatel_kontakt_telefon'
                WHEN o.dodavatel_kontakt_email LIKE :query THEN 'dodavatel_kontakt_email'
                WHEN CONCAT(u_creator.jmeno, ' ', u_creator.prijmeni) LIKE :query THEN 'creator'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     CONCAT(u_creator.jmeno, ' ', u_creator.prijmeni),
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'creator'
                WHEN CONCAT(u_garant.jmeno, ' ', u_garant.prijmeni) LIKE :query THEN 'garant'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     CONCAT(u_garant.jmeno, ' ', u_garant.prijmeni),
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'garant'
                WHEN CONCAT(u_schval.jmeno, ' ', u_schval.prijmeni) LIKE :query THEN 'schvalovatel'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     CONCAT(u_schval.jmeno, ' ', u_schval.prijmeni),
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'schvalovatel'
                WHEN CONCAT(u_prikazce.jmeno, ' ', u_prikazce.prijmeni) LIKE :query THEN 'prikazce'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     CONCAT(u_prikazce.jmeno, ' ', u_prikazce.prijmeni),
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'prikazce'
                ELSE 'other'
            END as match_type
        FROM " . TBL_OBJEDNAVKY . " o
        LEFT JOIN " . TBL_UZIVATELE . " u_creator ON o.uzivatel_id = u_creator.id
        LEFT JOIN " . TBL_UZIVATELE . " u_garant ON o.garant_uzivatel_id = u_garant.id
        LEFT JOIN " . TBL_UZIVATELE . " u_schval ON o.schvalovatel_id = u_schval.id
        LEFT JOIN " . TBL_UZIVATELE . " u_prikazce ON o.prikazce_id = u_prikazce.id
        WHERE (
            o.cislo_objednavky LIKE :query
            OR o.predmet LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               o.predmet,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.poznamka LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               o.poznamka,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.financovani LIKE :query
            OR o.stav_objednavky LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               o.stav_objednavky,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.dodavatel_nazev LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               o.dodavatel_nazev,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.dodavatel_ico LIKE :query
            OR o.dodavatel_kontakt_telefon LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(o.dodavatel_kontakt_telefon, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE :query_normalized
            OR o.dodavatel_kontakt_email LIKE :query
            OR CONCAT(u_creator.jmeno, ' ', u_creator.prijmeni) LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               CONCAT(u_creator.jmeno, ' ', u_creator.prijmeni),
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR CONCAT(u_garant.jmeno, ' ', u_garant.prijmeni) LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               CONCAT(u_garant.jmeno, ' ', u_garant.prijmeni),
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR CONCAT(u_schval.jmeno, ' ', u_schval.prijmeni) LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               CONCAT(u_schval.jmeno, ' ', u_schval.prijmeni),
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR CONCAT(u_prikazce.jmeno, ' ', u_prikazce.prijmeni) LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               CONCAT(u_prikazce.jmeno, ' ', u_prikazce.prijmeni),
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
        )
        AND (o.aktivni = 1 OR :include_inactive = 1)
        AND (o.stav_objednavky != 'ARCHIVOVANO' OR :archivovano = 1)
        AND (
            :is_admin = 1
            OR (o.stav_objednavky = 'ARCHIVOVANO' AND :archivovano = 1)
            OR o.uzivatel_id = :current_user_id
            OR o.objednatel_id = :current_user_id
            OR o.garant_uzivatel_id = :current_user_id
            OR o.schvalovatel_id = :current_user_id
            OR o.prikazce_id = :current_user_id
            OR o.uzivatel_akt_id = :current_user_id
            OR o.odesilatel_id = :current_user_id
            OR o.dodavatel_potvrdil_id = :current_user_id
            OR o.zverejnil_id = :current_user_id
            OR o.fakturant_id = :current_user_id
            OR o.dokoncil_id = :current_user_id
            OR o.potvrdil_vecnou_spravnost_id = :current_user_id
        )
        ORDER BY o.dt_vytvoreni DESC
        LIMIT :limit
    ";
}

// Orders Legacy (25_objednavky) - DEPRECATED, NEPOUŽÍVÁ SE

/**
 * SQL pro vyhledávání ve smlouvách
 * JOIN na 25_useky pro název úseku
 * 
 * @return string SQL dotaz
 */
function getSqlSearchContracts($filterObjForm = false) {
    $objFormFilter = $filterObjForm ? "AND sm.pouzit_v_obj_formu = :filter_obj_form" : "";
    
    return "
        SELECT 
            sm.id,
            sm.cislo_smlouvy,
            sm.nazev_smlouvy,
            sm.popis_smlouvy,
            sm.nazev_firmy,
            sm.ico,
            sm.dic,
            sm.platnost_od,
            sm.platnost_do,
            sm.hodnota_s_dph,
            sm.cerpano_celkem,
            sm.zbyva,
            sm.procento_cerpani,
            sm.pouzit_v_obj_formu,
            CONCAT(
                COALESCE(us.usek_zkr, ''),
                IF(us.usek_zkr IS NOT NULL AND us.usek_nazev IS NOT NULL, ' - ', ''),
                COALESCE(us.usek_nazev, '')
            ) as usek,
            sm.stav,
            sm.aktivni,
            sm.dt_vytvoreni,
            DATE_FORMAT(sm.dt_aktualizace, '%Y-%m-%d %H:%i:%s') as dt_aktualizace,
            CASE
                WHEN sm.cislo_smlouvy LIKE :query THEN 'cislo_smlouvy'
                WHEN sm.nazev_smlouvy LIKE :query THEN 'nazev_smlouvy'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     sm.nazev_smlouvy,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'nazev_smlouvy'
                WHEN sm.popis_smlouvy LIKE :query THEN 'popis_smlouvy'
                WHEN sm.nazev_firmy LIKE :query THEN 'nazev_firmy'
                WHEN sm.ico LIKE :query THEN 'ico'
                WHEN sm.dic LIKE :query THEN 'dic'
                WHEN COALESCE(us.usek_nazev, '') LIKE :query THEN 'usek_nazev'
                WHEN COALESCE(us.usek_zkr, '') LIKE :query THEN 'usek_zkr'
                ELSE 'other'
            END as match_type
        FROM " . TBL_SMLOUVY . " sm
        LEFT JOIN " . TBL_USEKY . " us ON sm.usek_id = us.id
        WHERE (
            sm.cislo_smlouvy LIKE :query
            OR sm.nazev_smlouvy LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               sm.nazev_smlouvy,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR sm.popis_smlouvy LIKE :query
            OR sm.nazev_firmy LIKE :query
            OR sm.ico LIKE :query
            OR sm.dic LIKE :query
            OR COALESCE(us.usek_nazev, '') LIKE :query
            OR COALESCE(us.usek_zkr, '') LIKE :query
        )
        AND (:is_admin = 1 OR sm.aktivni = 1 OR :include_inactive = 1)
        $objFormFilter
        ORDER BY sm.dt_vytvoreni DESC
        LIMIT :limit
    ";
}

/**
 * SQL pro vyhledávání ve fakturách
 * JOINy na objednávky a uživatele
 * 
 * @return string SQL dotaz
 */
function getSqlSearchInvoices() {
    return "
        SELECT 
            f.id,
            f.fa_cislo_vema,
            f.fa_castka as castka,
            f.fa_datum_vystaveni as datum_vystaveni,
            f.fa_datum_splatnosti as datum_splatnosti,
            f.fa_datum_zaplaceni as datum_uhrazeni,
            f.fa_poznamka as poznamka,
            f.fa_typ,
            f.fa_zaplacena,
            f.fa_dorucena,
            f.fa_predana_zam_id,
            f.fa_datum_predani_zam as datum_predani_zam,
            f.fa_datum_vraceni_zam as datum_vraceni_zam,
            f.vytvoril_uzivatel_id,
            f.dt_vytvoreni as datum_zaevidovani,
            o.cislo_objednavky as objednavka_cislo,
            sm.cislo_smlouvy as smlouva_cislo,
            o.dodavatel_nazev,
            o.dodavatel_ico,
            d.nazev as dodavatel_nazev_z_ciselniku,
            d.ico as dodavatel_ico_z_ciselniku,
            CONCAT(
                COALESCE(u.jmeno, ''), 
                ' ', 
                COALESCE(u.prijmeni, '')
            ) as nahrano_kym,
            CONCAT(
                COALESCE(u_predana.jmeno, ''), 
                ' ', 
                COALESCE(u_predana.prijmeni, '')
            ) as predano_kym,
            f.potvrdil_vecnou_spravnost_id,
            f.fa_predana_zam_id,
            f.stav as stav_workflow,
            CASE 
                WHEN f.fa_zaplacena = 1 THEN 'zaplaceno'
                WHEN f.fa_datum_splatnosti < CURDATE() THEN 'po_splatnosti'
                ELSE 'nezaplaceno'
            END as stav_platby,
            f.aktivni,
            f.dt_vytvoreni,
            f.dt_aktualizace,
            GROUP_CONCAT(DISTINCT fp.originalni_nazev_souboru SEPARATOR ', ') as prilohy_nazvy,
            GROUP_CONCAT(DISTINCT fp.typ_prilohy SEPARATOR ', ') as prilohy_typy,
            COUNT(DISTINCT fp.id) as pocet_priloh,
            CASE
                WHEN f.fa_cislo_vema LIKE :query THEN 'fa_cislo_vema'
                WHEN f.fa_typ LIKE :query THEN 'fa_typ'
                WHEN f.fa_poznamka LIKE :query THEN 'poznamka'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     f.fa_poznamka,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'poznamka'
                WHEN o.cislo_objednavky LIKE :query THEN 'objednavka_cislo'
                WHEN sm.cislo_smlouvy LIKE :query THEN 'smlouva_cislo'
                WHEN o.dodavatel_nazev LIKE :query THEN 'dodavatel_nazev'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     o.dodavatel_nazev,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'dodavatel_nazev'
                WHEN o.dodavatel_ico LIKE :query THEN 'dodavatel_ico'
                WHEN d.nazev LIKE :query THEN 'dodavatel_nazev_z_ciselniku'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     d.nazev,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'dodavatel_nazev_z_ciselniku'
                WHEN d.ico LIKE :query THEN 'dodavatel_ico_z_ciselniku'
                WHEN fp.originalni_nazev_souboru LIKE :query THEN 'priloha_nazev'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     fp.originalni_nazev_souboru,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'priloha_nazev'
                WHEN fp.typ_prilohy LIKE :query THEN 'priloha_typ'
                WHEN f.fa_typ LIKE :query THEN 'fa_typ'
                WHEN CONCAT(u_predana.jmeno, ' ', u_predana.prijmeni) LIKE :query THEN 'predano_kym'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     CONCAT(u_predana.jmeno, ' ', u_predana.prijmeni),
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'predano_kym'
                WHEN CONCAT(u.jmeno, ' ', u.prijmeni) LIKE :query THEN 'nahrano_kym'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     CONCAT(u.jmeno, ' ', u.prijmeni),
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'nahrano_kym'
                ELSE 'other'
            END as match_type
        FROM " . TBL_FAKTURY . " f
        LEFT JOIN " . TBL_OBJEDNAVKY . " o ON f.objednavka_id = o.id
        LEFT JOIN " . TBL_SMLOUVY . " sm ON f.smlouva_id = sm.id
        LEFT JOIN " . TBL_UZIVATELE . " u ON f.vytvoril_uzivatel_id = u.id
        LEFT JOIN " . TBL_UZIVATELE . " u_predana ON f.fa_predana_zam_id = u_predana.id
        LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
        LEFT JOIN " . TBL_FAKTURY_PRILOHY . " fp ON f.id = fp.faktura_id
        WHERE (
            f.fa_cislo_vema LIKE :query
            OR f.fa_typ LIKE :query
            OR f.fa_poznamka LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               f.fa_poznamka,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.cislo_objednavky LIKE :query
            OR sm.cislo_smlouvy LIKE :query
            OR o.dodavatel_nazev LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               o.dodavatel_nazev,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.dodavatel_ico LIKE :query
            OR d.nazev LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               d.nazev,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR d.ico LIKE :query
            OR fp.originalni_nazev_souboru LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               fp.originalni_nazev_souboru,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR fp.typ_prilohy LIKE :query
            OR CONCAT(u_predana.jmeno, ' ', u_predana.prijmeni) LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               CONCAT(u_predana.jmeno, ' ', u_predana.prijmeni),
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR CONCAT(u.jmeno, ' ', u.prijmeni) LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               CONCAT(u.jmeno, ' ', u.prijmeni),
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
        )
        AND f.aktivni = 1
        AND (
            (f.smlouva_id IS NULL OR f.smlouva_id = 0)
            OR JSON_EXTRACT(f.rozsirujici_data, '$.rocni_poplatek') IS NOT NULL
        )
        AND (
            (f.objednavka_id IS NULL OR f.objednavka_id = 0)
            OR JSON_EXTRACT(f.rozsirujici_data, '$.rocni_poplatek') IS NOT NULL
        )
        AND (
            :is_admin = 1
            OR f.fa_predana_zam_id = :user_id
            OR f.potvrdil_vecnou_spravnost_id = :user_id
            OR f.vytvoril_uzivatel_id = :user_id
            OR o.uzivatel_id = :user_id
            OR o.uzivatel_akt_id = :user_id
            OR o.garant_uzivatel_id = :user_id
            OR o.objednatel_id = :user_id
            OR o.schvalovatel_id = :user_id
            OR o.prikazce_id = :user_id
            OR o.odesilatel_id = :user_id
            OR o.dodavatel_potvrdil_id = :user_id
            OR o.zverejnil_id = :user_id
            OR o.fakturant_id = :user_id
            OR o.dokoncil_id = :user_id
            OR o.potvrdil_vecnou_spravnost_id = :user_id
        )
        GROUP BY f.id
        ORDER BY f.fa_datum_vystaveni DESC
        LIMIT :limit
    ";
}

/**
 * SQL pro vyhledávání v dodavatelích
 * OPRAVENO: Filtruje podle visibility (personal, úsek, global) pro non-adminy
 * 
 * @param bool $isAdmin Pokud true, vrátí SQL bez visibility filtru
 * @return string SQL dotaz
 */
function getSqlSearchSuppliers($isAdmin = false) {
    $baseSelect = "
        SELECT 
            d.id,
            d.nazev,
            d.ico,
            d.dic,
            d.adresa,
            d.zastoupeny,
            d.kontakt_jmeno,
            d.kontakt_email,
            d.kontakt_telefon,
            d.aktivni,
            d.user_id,
            d.usek_zkr,
            DATE_FORMAT(d.dt_vytvoreni, '%Y-%m-%d %H:%i:%s') as dt_vytvoreni,
            DATE_FORMAT(d.dt_aktualizace, '%Y-%m-%d %H:%i:%s') as dt_aktualizace,
            CASE
                WHEN d.nazev LIKE :query THEN 'nazev'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     d.nazev,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'nazev'
                WHEN d.ico LIKE :query THEN 'ico'
                WHEN d.dic LIKE :query THEN 'dic'
                WHEN d.kontakt_telefon LIKE :query THEN 'kontakt_telefon'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(d.kontakt_telefon, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE :query_normalized THEN 'kontakt_telefon'
                WHEN d.kontakt_email LIKE :query THEN 'kontakt_email'
                WHEN d.kontakt_jmeno LIKE :query THEN 'kontakt_jmeno'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     d.kontakt_jmeno,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'kontakt_jmeno'
                WHEN d.adresa LIKE :query THEN 'adresa'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     d.adresa,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'adresa'
                ELSE 'other'
            END as match_type
        FROM " . TBL_DODAVATELE . " d
        WHERE (
            d.nazev LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               d.nazev,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR d.ico LIKE :query
            OR d.dic LIKE :query
            OR d.kontakt_telefon LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(d.kontakt_telefon, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE :query_normalized
            OR d.kontakt_email LIKE :query
            OR d.kontakt_jmeno LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               d.kontakt_jmeno,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR d.adresa LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               d.adresa,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
        )";
    
    // Admin vidí všechny (pouze aktivni filtr)
    if ($isAdmin) {
        return $baseSelect . "
        AND (:is_admin = 1 OR d.aktivni = 1 OR :include_inactive = 1)
        ORDER BY d.dt_aktualizace DESC
        LIMIT :limit
    ";
    }
    
    // Non-admin: filtrování podle visibility + aktivni
    // Vrátíme SQL s placeholdery pro úseky, které se dynamicky sestaví v handleru
    return $baseSelect . "
        AND (:is_admin = 1 OR d.aktivni = 1 OR :include_inactive = 1)
        AND (
            d.user_id = :user_id
            OR (d.user_id = 0 AND (d.usek_zkr IS NULL OR d.usek_zkr = '' OR d.usek_zkr = '[]'))
            __USEK_CONDITIONS__
        )
        ORDER BY d.dt_aktualizace DESC
        LIMIT :limit
    ";
}

/**
 * SQL pro vyhledávání dodavatelů z objednávek (25a_objednavky)
 * Vyhledává POUZE v dodavatel_* polích, agreguje unikátní dodavatele
 * 
 * @return string SQL dotaz
 */
function getSqlSearchSuppliersFromOrders() {
    return "
        SELECT 
            o.dodavatel_nazev,
            o.dodavatel_ico,
            o.dodavatel_dic,
            o.dodavatel_adresa,
            o.dodavatel_kontakt_jmeno,
            o.dodavatel_kontakt_telefon,
            o.dodavatel_kontakt_email,
            COUNT(*) as pocet_objednavek,
            MAX(o.dt_aktualizace) as posledni_pouziti,
            MAX(o.id) as nejnovejsi_objednavka_id,
            CASE
                WHEN o.dodavatel_nazev LIKE :query THEN 'nazev'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     o.dodavatel_nazev,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'nazev'
                WHEN o.dodavatel_ico LIKE :query THEN 'ico'
                WHEN o.dodavatel_dic LIKE :query THEN 'dic'
                WHEN o.dodavatel_adresa LIKE :query THEN 'adresa'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     o.dodavatel_adresa,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'adresa'
                WHEN o.dodavatel_kontakt_jmeno LIKE :query THEN 'kontakt_jmeno'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                     o.dodavatel_kontakt_jmeno,
                     'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
                     'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
                     'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
                     LIKE :query_normalized THEN 'kontakt_jmeno'
                WHEN o.dodavatel_kontakt_telefon LIKE :query THEN 'kontakt_telefon'
                WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(o.dodavatel_kontakt_telefon, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE :query_normalized THEN 'kontakt_telefon'
                WHEN o.dodavatel_kontakt_email LIKE :query THEN 'kontakt_email'
                ELSE 'other'
            END as match_type
        FROM " . TBL_OBJEDNAVKY . " o
        WHERE (
            o.dodavatel_nazev LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               o.dodavatel_nazev,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.dodavatel_ico LIKE :query
            OR o.dodavatel_dic LIKE :query
            OR o.dodavatel_adresa LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               o.dodavatel_adresa,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.dodavatel_kontakt_jmeno LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               o.dodavatel_kontakt_jmeno,
               'á','a'),'Á','A'),'č','c'),'Č','C'),'ď','d'),'Ď','D'),'é','e'),'É','E'),'ě','e'),'Ě','E'),
               'í','i'),'Í','I'),'ň','n'),'Ň','N'),'ó','o'),'Ó','O'),'ř','r'),'Ř','R'),'š','s'),'Š','S'),
               'ť','t'),'Ť','T'),'ú','u'),'Ú','U'),'ů','u'),'Ů','U'),'ý','y'),'Ý','Y'),'ž','z'),'Ž','Z')
               LIKE :query_normalized
            OR o.dodavatel_kontakt_telefon LIKE :query
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(o.dodavatel_kontakt_telefon, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE :query_normalized
            OR o.dodavatel_kontakt_email LIKE :query
        )
        AND o.aktivni = 1
        AND (o.stav_objednavky != 'ARCHIVOVANO' OR :include_archived = 1)
        AND o.dodavatel_nazev IS NOT NULL
        AND o.dodavatel_nazev != ''
        GROUP BY 
            o.dodavatel_nazev,
            o.dodavatel_ico,
            o.dodavatel_dic,
            o.dodavatel_adresa,
            o.dodavatel_kontakt_jmeno,
            o.dodavatel_kontakt_telefon,
            o.dodavatel_kontakt_email
        ORDER BY pocet_objednavek DESC, posledni_pouziti DESC
        LIMIT :limit
    ";
}
