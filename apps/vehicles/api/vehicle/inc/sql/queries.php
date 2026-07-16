<?php
/**
 * Vehicles API - SQL dotazy
 * 
 * Centrální místo pro všechny SQL queries.
 * Používejte pojmenované konstanty pro snadnou správu.
 */
class Queries
{
    /**
     * Seznam vozidel s detaily, smlouvami, dotacemi, poslední pozicí a MT daty
     */
    const CARS_LIST_DETAIL = "
        SELECT 
            cars_group.w_groupname, 
            list_cars.w_spz, 
            list_cars.zzs_typ, 
            list_cars.status_vozidla,
            list_cars.last_update,
            list_cars.wd_cargroupid,
            list_cars.wd_groupname,
            cars_detail.*, 
            cars_smlouva.Datum_od, 
            cars_smlouva.Datum_do, 
            cars_dotace.inv_cislo, 
            cars_dotace.usek, 
            cars_dotace.budov, 
            cars_dotace.mistnost, 
            cars_dotace.vozidlo_popis, 
            cars_dotace.VIN, 
            cars_dotace.dt_zarazeni, 
            cars_dotace.dt_konec_odpis, 
            cars_dotace.plan_vyrazeni, 
            cars_dotace.dotace,
            last_pos.w_km as pos_km, 
            last_pos.w_lp as pos_lp, 
            last_pos.w_ln as pos_ln,
            last_pos.w_majak as pos_majak,
            last_pos.w_zs as pos_zs,
            last_pos.w_zd as pos_zd,
            last_pos.pos_dt_aktualizace,
            cars_mt.skupina as mt_skupina,
            cars_mt.znak as mt_znak,
            cars_mt.app_vyjezd_1 as mt_app_vyjezd_1,
            cars_mt.cela_adresa as mt_cela_adresa,
            cars_mt.inv_cis_sestra as mt_inv_cis_sestra,
            cars_mt.sestra_IMEI as mt_sestra_IMEI,
            cars_mt.`sestra SIM` as mt_sestra_SIM,
            cars_mt.inv_cis_ridic as mt_inv_cis_ridic,
            cars_mt.ridic_IMEI as mt_ridic_IMEI,
            cars_mt.ridic_SIM as mt_ridic_SIM,
            cars_mt.app_vyjezd_2 as mt_app_vyjezd_2
        FROM list_cars
        LEFT JOIN cars_detail ON list_cars.w_carid = cars_detail.w_carid
        LEFT JOIN cars_group ON cars_group.w_groupid = cars_detail.w_groupid
        LEFT JOIN cars_smlouva ON REPLACE(list_cars.w_spz, ' ', '') = REPLACE(cars_smlouva.spz, ' ', '')
        LEFT JOIN cars_dotace ON REPLACE(list_cars.w_spz, ' ', '') = REPLACE(cars_dotace.w_spz, ' ', '')
        LEFT JOIN (
            SELECT cp.w_carid, cp.w_km, cp.w_lp, cp.w_ln, cp.w_majak, cp.w_zs, cp.w_zd,
                   cp.dt_aktualizace as pos_dt_aktualizace
            FROM cars_position cp
            INNER JOIN (
                SELECT w_carid, MAX(id) as max_id 
                FROM cars_position 
                GROUP BY w_carid
            ) latest ON cp.w_carid = latest.w_carid AND cp.id = latest.max_id
        ) last_pos ON list_cars.w_carid = last_pos.w_carid
        LEFT JOIN (
            SELECT spz, skupina, znak, app_vyjezd_1, cela_adresa, 
                   inv_cis_sestra, sestra_IMEI, `sestra SIM`,
                   inv_cis_ridic, ridic_IMEI, ridic_SIM, app_vyjezd_2
            FROM cars_mt
            GROUP BY spz
        ) cars_mt ON REPLACE(list_cars.w_spz, ' ', '') = cars_mt.spz
        ORDER BY list_cars.w_spz ASC
        LIMIT 500
    ";

    /**
     * Pozice vozidla podle carid (s MT daty)
     */
    const CAR_POSITION_BY_ID = "
        SELECT cars_position.*, cars_mt.*
        FROM list_cars
        LEFT JOIN cars_mt ON REPLACE(list_cars.w_spz, ' ', '') = cars_mt.spz
        JOIN cars_position ON cars_position.w_carid = list_cars.w_carid
        WHERE cars_position.w_carid = :carid
    ";

    /**
     * KM měsíční statistiky podle carid
     */
    const CAR_KM_BY_ID = "
        SELECT * FROM cars_km_mesic
        WHERE cars_km_mesic.w_carid = :carid
    ";

    /**
     * KM měsíční statistiky pro VŠECHNA vozidla (batch)
     * Vrací pouze záznamy s dt_aktualizace max 6 měsíců staré
     */
    const CAR_KM_ALL = "
        SELECT km.*, lc.w_spz
        FROM cars_km_mesic km
        INNER JOIN list_cars lc ON lc.w_carid = km.w_carid
        WHERE km.dt_aktualizace >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        ORDER BY lc.w_spz ASC
    ";

    /**
     * Seznam všech carid z list_cars
     */
    const ALL_CAR_IDS = "
        SELECT w_carid FROM list_cars
    ";

    /**
     * Kontrola existence KM záznamu
     */
    const CHECK_KM_EXISTS = "
        SELECT COUNT(*) as cnt FROM cars_km_mesic
        WHERE w_carid = :carid 
        AND MONTH(dt_aktualizace) = :month 
        AND YEAR(dt_aktualizace) = :year 
        AND pocet_mesicu = :interval
    ";

    /**
     * Smazat KM záznamy pro vozidlo
     */
    const DELETE_KM_BY_CAR = "
        DELETE FROM cars_km_mesic WHERE w_carid = :carid
    ";

    /**
     * Vložit KM záznam
     */
    const INSERT_KM = "
        INSERT INTO cars_km_mesic 
        (w_carid, w_datod, w_datdo, pocet_mesicu, km, stavTach, dt_aktualizace) 
        VALUES (:carid, :datod, :datdo, :interval, :km, :stavtach, :dt_aktualizace)
    ";

    /**
     * Upsert cars_detail (INSERT nebo UPDATE)
     */
    const UPSERT_CAR_DETAIL = "
        INSERT INTO cars_detail 
        (w_carid, w_groupid, w_popis, w_tovarni_znacka, w_model_vozu, w_typ_phm, w_stanoviste, w_nadrz, w_datod, dt_aktualizace) 
        VALUES (:carid, :groupid, :popis, :znacka, :model, :phm, :stanoviste, :nadrz, :datod, :dt)
        ON DUPLICATE KEY UPDATE
            w_groupid = VALUES(w_groupid),
            w_popis = VALUES(w_popis),
            w_tovarni_znacka = VALUES(w_tovarni_znacka),
            w_model_vozu = VALUES(w_model_vozu),
            w_typ_phm = VALUES(w_typ_phm),
            w_stanoviste = VALUES(w_stanoviste),
            w_nadrz = VALUES(w_nadrz),
            w_datod = VALUES(w_datod),
            dt_aktualizace = VALUES(dt_aktualizace)
    ";

    /**
     * Upsert list_cars
     */
    const UPSERT_LIST_CAR = "
        INSERT INTO list_cars (w_carid, w_spz, status_vozidla, last_update, wd_cargroupid, wd_groupname) 
        VALUES (:carid, :spz, :status_vozidla, :last_update, :wd_cargroupid, :wd_groupname)
        ON DUPLICATE KEY UPDATE
            w_spz = VALUES(w_spz),
            status_vozidla = VALUES(status_vozidla),
            last_update = VALUES(last_update),
            wd_cargroupid = VALUES(wd_cargroupid),
            wd_groupname = VALUES(wd_groupname)
    ";

    /**
     * Upsert cars_group
     */
    const UPSERT_CAR_GROUP = "
        INSERT INTO cars_group (w_groupid, w_groupname, w_numcars) 
        VALUES (:groupid, :groupname, :numcars)
        ON DUPLICATE KEY UPDATE 
            w_groupname = VALUES(w_groupname), 
            w_numcars = VALUES(w_numcars)
    ";

    /**
     * Vložit pozici vozidla
     */
    const INSERT_CAR_POSITION = "
        INSERT INTO cars_position 
        (w_carid, w_majak, w_pt, w_lp, w_km, w_ln, w_zs, w_zd, dt_aktualizace) 
        VALUES (:carid, :majak, :pt, :lp, :km, :ln, :zs, :zd, :dt)
    ";

    /**
     * Servisní historie vozidla dle SPZ (EEO databáze)
     * Hledá v předmětu objednávek SPZ bez mezer
     * Filtruje pouze stavy od "Odeslaná" dál (mimo Zrušena/Zamítnutá)
     * Parametr :spz = SPZ bez mezer (např. '6SL8773')
     */
    const EEO_SERVICE_HISTORY_BY_SPZ = "
        SELECT 
            o.id,
            o.cislo_objednavky,
            o.predmet,
            o.dodavatel_nazev,
            o.stav_objednavky,
            o.dt_objednavky,
            o.dt_odeslani,
            o.dt_akceptace,
            o.dt_dokonceni,
            COALESCE(f.fa_suma, 0) as faktura_celkem,
            COALESCE(p.polozky_suma, 0) as polozky_celkem
        FROM `25a_objednavky` o
        LEFT JOIN (
            SELECT objednavka_id, SUM(fa_castka) as fa_suma 
            FROM `25a_objednavky_faktury` 
            WHERE stav != 'STORNO' 
            GROUP BY objednavka_id
        ) f ON o.id = f.objednavka_id
        LEFT JOIN (
            SELECT objednavka_id, SUM(cena_s_dph) as polozky_suma 
            FROM `25a_objednavky_polozky` 
            GROUP BY objednavka_id
        ) p ON o.id = p.objednavka_id
        WHERE REPLACE(o.predmet, ' ', '') LIKE CONCAT('%', :spz, '%')
          AND o.aktivni = 1
          AND o.stav_objednavky NOT IN ('Rozpracovaná', 'Ke schválení', 'Schválená', 'Zamítnutá', 'Zrušena')
        ORDER BY o.dt_akceptace DESC
        LIMIT 50
    ";
}
