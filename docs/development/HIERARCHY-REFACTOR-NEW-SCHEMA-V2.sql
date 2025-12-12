-- ============================================================================
-- HIERARCHIE VZTAHŮ - FINÁLNÍ SCHÉMA PRO WORKFLOW SYSTÉM
-- ============================================================================
-- Každý záznam = jedna šipka (edge) na canvasu
-- Podporuje: user→user, location→user, user→location, department→user, user→department

CREATE TABLE IF NOT EXISTS 25_hierarchie_vztahy (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    profil_id INT UNSIGNED NOT NULL COMMENT 'ID profilu (konfigurace hierarchie)',
    
    -- ========================================================================
    -- TYP VZTAHU A ÚČASTNÍCI
    -- ========================================================================
    typ_vztahu ENUM(
        'user-user',        -- Uživatel → Uživatel (klasický nadřízený-podřízený)
        'location-user',    -- Lokalita → Uživatel (všichni z lokality → nadřízený)
        'user-location',    -- Uživatel → Lokalita (nadřízený vidí celou lokalitu)
        'department-user',  -- Úsek → Uživatel (všichni z úseku → nadřízený)
        'user-department'   -- Uživatel → Úsek (nadřízený vidí celý úsek)
    ) NOT NULL,
    
    -- IDs účastníků (podle typu vztahu se vyplní příslušné)
    user_id_1 INT UNSIGNED NULL COMMENT 'První uživatel (nadřízený pro user-user)',
    user_id_2 INT UNSIGNED NULL COMMENT 'Druhý uživatel (podřízený pro user-user)',
    lokalita_id INT UNSIGNED NULL COMMENT 'ID lokality (pokud je v vztahu)',
    usek_id INT UNSIGNED NULL COMMENT 'ID úseku (pokud je v vztahu)',
    
    -- Pozice nodes na canvasu pro vizualizaci
    pozice_node_1 JSON NULL COMMENT '{"x": 100, "y": 200} pro první node',
    pozice_node_2 JSON NULL COMMENT '{"x": 300, "y": 400} pro druhý node',
    
    -- ========================================================================
    -- NASTAVENÍ VZTAHU
    -- ========================================================================
    
    -- Typ vztahu (co přesně znamená tato šipka?)
    druh_vztahu ENUM(
        'prime',        -- Přímý nadřízený (klasická podřízenost)
        'zastupovani',  -- Zastupování (dočasné, při nepřítomnosti)
        'delegovani',   -- Delegování (konkrétní úkol/projekt) - TODO
        'rozsirene'     -- Rozšířené oprávnění (extra práva) - TODO
    ) DEFAULT 'prime' COMMENT 'Druh vztahu mezi uživateli',
    
    -- Rozsah viditelnosti (Scope) - co nadřízený uvidí?
    scope ENUM(
        'OWN',      -- Jen vlastní záznamy podřízeného
        'TEAM',     -- Celý úsek podřízeného
        'LOCATION', -- Celá lokalita podřízeného
        'ALL'       -- Všechny záznamy v systému (admin režim)
    ) DEFAULT 'OWN' COMMENT 'Rozsah dat, která nadřízený uvidí',
    
    -- ========================================================================
    -- OPRÁVNĚNÍ PRO MODULY (co nadřízený uvidí v jednotlivých modulech)
    -- ========================================================================
    viditelnost_objednavky TINYINT(1) DEFAULT 0 COMMENT 'Vidí objednávky podle scope',
    viditelnost_faktury TINYINT(1) DEFAULT 0 COMMENT 'Vidí faktury podle scope',
    viditelnost_smlouvy TINYINT(1) DEFAULT 0 COMMENT 'Vidí smlouvy podle scope (TODO)',
    viditelnost_pokladna TINYINT(1) DEFAULT 0 COMMENT 'Vidí pokladnu podle scope',
    pokladna_readonly TINYINT(1) DEFAULT 1 COMMENT 'Pokladna jen pro čtení (zatím)',
    viditelnost_uzivatele TINYINT(1) DEFAULT 0 COMMENT 'Vidí uživatele podle scope (deprecated)',
    viditelnost_lp TINYINT(1) DEFAULT 0 COMMENT 'Vidí likvidační protokoly (deprecated)',
    
    -- ========================================================================
    -- ROZŠÍŘENÁ OPRÁVNĚNÍ (navíc k základnímu vztahu)
    -- ========================================================================
    rozsirene_lokality JSON NULL COMMENT '[12, 15, 18] - pole ID lokalit, navíc k základnímu scope',
    rozsirene_useky JSON NULL COMMENT '[3, 5, 7] - pole ID úseků, navíc k základnímu scope',
    kombinace_lokalita_usek JSON NULL COMMENT '[{"locationId": 12, "departmentId": 3}] - specifické kombinace (AND logika)',
    
    -- ========================================================================
    -- NOTIFIKACE
    -- ========================================================================
    notifikace_email TINYINT(1) DEFAULT 0 COMMENT 'Posílat e-mail notifikace?',
    notifikace_inapp TINYINT(1) DEFAULT 1 COMMENT 'Zobrazit in-app notifikace?',
    notifikace_typy JSON NULL COMMENT '[1, 5, 8] - pole ID typů událostí pro notifikace',
    
    -- ========================================================================
    -- METADATA
    -- ========================================================================
    aktivni TINYINT(1) DEFAULT 1 COMMENT 'Aktivní/deaktivní vztah',
    dt_vytvoreni DATETIME DEFAULT CURRENT_TIMESTAMP,
    dt_upraveno DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    upravil_user_id INT UNSIGNED NULL COMMENT 'Kdo naposledy upravil',
    poznamka TEXT NULL COMMENT 'Volitelná poznámka k vztahu',
    
    -- ========================================================================
    -- INDEXY PRO RYCHLÉ VYHLEDÁVÁNÍ
    -- ========================================================================
    INDEX idx_profil (profil_id, aktivni),
    INDEX idx_user1 (user_id_1, aktivni),
    INDEX idx_user2 (user_id_2, aktivni),
    INDEX idx_lokalita (lokalita_id, aktivni),
    INDEX idx_usek (usek_id, aktivni),
    INDEX idx_typ_vztahu (typ_vztahu, aktivni),
    INDEX idx_druh_vztahu (druh_vztahu, aktivni)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
COMMENT='Workflow hierarchie - vztahy mezi uživateli, lokalitami a úseky';

-- ============================================================================
-- PŘÍKLADY POUŽITÍ
-- ============================================================================

-- PŘÍKLAD 1: Černohorský je nadřízený Holovského
-- -------------------------------------------------
INSERT INTO 25_hierarchie_vztahy (
    profil_id, typ_vztahu, user_id_1, user_id_2,
    druh_vztahu, scope,
    viditelnost_objednavky, viditelnost_faktury, viditelnost_pokladna,
    pozice_node_1, pozice_node_2
) VALUES (
    1,              -- profil_id (výchozí profil)
    'user-user',    -- uživatel → uživatel
    85,             -- Jan Černohorský (nadřízený, získává práva)
    52,             -- Robert Holovský (podřízený, sdílí data)
    'prime',        -- Přímý nadřízený
    'TEAM',         -- Černohorský uvidí celý IT úsek Holovského
    1,              -- Vidí objednávky ✅
    1,              -- Vidí faktury ✅
    1,              -- Vidí pokladnu ✅ (read-only díky pokladna_readonly=1)
    '{"x": 200, "y": 100}',  -- Pozice Černohorského na canvasu
    '{"x": 200, "y": 300}'   -- Pozice Holovského na canvasu
);

-- ČO ČERNOHORSKÝ UVIDÍ:
-- ✅ Všechny objednávky z IT úseku (kam patří Holovský)
-- ✅ Všechny faktury z IT úseku
-- ✅ Všechny pokladní doklady z IT úseku (jen read-only)
-- ❌ Neuvidí smlouvy (viditelnost_smlouvy=0)

-- PŘÍKLAD 2: Vedoucí s rozšířenými lokacemi
-- -------------------------------------------------
INSERT INTO 25_hierarchie_vztahy (
    profil_id, typ_vztahu, user_id_1, user_id_2,
    druh_vztahu, scope,
    viditelnost_objednavky, viditelnost_faktury,
    rozsirene_lokality, rozsirene_useky,
    pozice_node_1, pozice_node_2
) VALUES (
    1,
    'user-user',
    85,             -- Černohorský
    52,             -- Holovský
    'prime',
    'TEAM',         -- Základně vidí IT úsek Holovského (Kladno)
    1, 1,
    '[15, 18]',     -- + navíc vidí všechny úseky z lokace Beroun (15) a Praha (18)
    '[7, 9]',       -- + navíc vidí úsek Finance (7) a Marketing (9) ze všech lokací
    '{"x": 200, "y": 100}',
    '{"x": 200, "y": 300}'
);

-- ČO ČERNOHORSKÝ UVIDÍ:
-- ✅ IT úsek Kladno (díky scope=TEAM a vztahu s Holovským)
-- ✅ + VŠECHNY úseky v Berouně (díky rozsirene_lokality=[15])
-- ✅ + VŠECHNY úseky v Praze (díky rozsirene_lokality=[18])
-- ✅ + Finance ze všech lokací (díky rozsirene_useky=[7])
-- ✅ + Marketing ze všech lokací (díky rozsirene_useky=[9])

-- PŘÍKLAD 3: Kombinace lokalita+úsek (jen IT v Berouně)
-- -------------------------------------------------
INSERT INTO 25_hierarchie_vztahy (
    profil_id, typ_vztahu, user_id_1, user_id_2,
    druh_vztahu, scope,
    viditelnost_objednavky, viditelnost_faktury,
    kombinace_lokalita_usek,
    pozice_node_1, pozice_node_2
) VALUES (
    1,
    'user-user',
    85, 52,
    'prime',
    'OWN',          -- Základně jen Holovského záznamy
    1, 1,
    '[{"locationId": 15, "departmentId": 3}]',  -- + jen IT (3) z Berouna (15), ne celý Beroun!
    '{"x": 200, "y": 100}',
    '{"x": 200, "y": 300}'
);

-- ČO ČERNOHORSKÝ UVIDÍ:
-- ✅ Holovského vlastní záznamy (díky scope=OWN)
-- ✅ + JEN IT úsek v Berouně (ne všechny úseky!)

-- PŘÍKLAD 4: Lokalita → Uživatel (všichni z Kladna → vedoucí)
-- -------------------------------------------------
INSERT INTO 25_hierarchie_vztahy (
    profil_id, typ_vztahu, lokalita_id, user_id_2,
    druh_vztahu, scope,
    viditelnost_objednavky,
    pozice_node_1, pozice_node_2
) VALUES (
    1,
    'location-user',  -- lokalita → uživatel
    12,              -- Kladno (node na levé straně)
    1,               -- RH ADMIN (node na pravé straně, získává práva)
    'prime',
    'LOCATION',      -- RH ADMIN vidí celou lokalitu Kladno
    1,
    '{"x": 100, "y": 200}',
    '{"x": 400, "y": 200}'
);

-- ČO RH ADMIN UVIDÍ:
-- ✅ Všechny objednávky ze všech úseků v Kladně

-- ============================================================================
-- JAK TO POUŽÍT V APLIKACI (PHP/JavaScript)
-- ============================================================================

/*
KE KONKRÉTNÍM DOTAZŮM V MODULECH:

1. MODUL OBJEDNÁVKY - Co uvidí Černohorský (user_id=85)?
   ========================================================
   
   SELECT DISTINCT o.*
   FROM 25_objednavky o
   INNER JOIN 25_uzivatele creator ON o.vytvoril_user_id = creator.uzivatel_id
   WHERE 
       -- Základní viditelnost podle vztahů
       EXISTS (
           SELECT 1 FROM 25_hierarchie_vztahy h
           WHERE h.user_id_1 = 85  -- Černohorský
             AND h.aktivni = 1
             AND h.viditelnost_objednavky = 1
             AND (
                 -- Scope OWN: jen podřízeného záznamy
                 (h.scope = 'OWN' AND o.vytvoril_user_id = h.user_id_2)
                 
                 OR
                 
                 -- Scope TEAM: celý úsek podřízeného
                 (h.scope = 'TEAM' AND creator.usek_id = (
                     SELECT usek_id FROM 25_uzivatele WHERE uzivatel_id = h.user_id_2
                 ))
                 
                 OR
                 
                 -- Scope LOCATION: celá lokalita podřízeného
                 (h.scope = 'LOCATION' AND creator.lokalita_id = (
                     SELECT lokalita_id FROM 25_uzivatele WHERE uzivatel_id = h.user_id_2
                 ))
                 
                 OR
                 
                 -- Scope ALL: všechny záznamy
                 (h.scope = 'ALL')
             )
       )
       
       OR
       
       -- Rozšířené lokality (navíc k základnímu scope)
       EXISTS (
           SELECT 1 FROM 25_hierarchie_vztahy h
           WHERE h.user_id_1 = 85
             AND h.aktivni = 1
             AND h.viditelnost_objednavky = 1
             AND JSON_CONTAINS(h.rozsirene_lokality, CAST(creator.lokalita_id AS JSON))
       )
       
       OR
       
       -- Rozšířené úseky
       EXISTS (
           SELECT 1 FROM 25_hierarchie_vztahy h
           WHERE h.user_id_1 = 85
             AND h.aktivni = 1
             AND h.viditelnost_objednavky = 1
             AND JSON_CONTAINS(h.rozsirene_useky, CAST(creator.usek_id AS JSON))
       )
       
       OR
       
       -- Kombinace lokalita+úsek
       EXISTS (
           SELECT 1 FROM 25_hierarchie_vztahy h, JSON_TABLE(
               h.kombinace_lokalita_usek,
               '$[*]' COLUMNS(
                   locationId INT PATH '$.locationId',
                   departmentId INT PATH '$.departmentId'
               )
           ) AS combo
           WHERE h.user_id_1 = 85
             AND h.aktivni = 1
             AND h.viditelnost_objednavky = 1
             AND combo.locationId = creator.lokalita_id
             AND combo.departmentId = creator.usek_id
       );

2. KONTROLA PRÁV - Má Černohorský právo vidět objednávku #12345?
   ================================================================
   
   SELECT COUNT(*) > 0 AS ma_pravo
   FROM 25_objednavky o
   INNER JOIN 25_uzivatele creator ON o.vytvoril_user_id = creator.uzivatel_id
   WHERE o.id = 12345
     AND (
         -- ... stejná logika jako výše ...
     );

3. SEZNAM PODŘÍZENÝCH - Koho řídí Černohorský?
   ==============================================
   
   SELECT u.*, h.druh_vztahu, h.scope
   FROM 25_hierarchie_vztahy h
   INNER JOIN 25_uzivatele u ON h.user_id_2 = u.uzivatel_id
   WHERE h.user_id_1 = 85  -- Černohorský
     AND h.typ_vztahu = 'user-user'
     AND h.aktivni = 1
   ORDER BY u.prijmeni, u.jmeno;

4. SEZNAM NADŘÍZENÝCH - Kdo řídí Holovského?
   ============================================
   
   SELECT u.*, h.druh_vztahu, h.scope
   FROM 25_hierarchie_vztahy h
   INNER JOIN 25_uzivatele u ON h.user_id_1 = u.uzivatel_id
   WHERE h.user_id_2 = 52  -- Holovský
     AND h.typ_vztahu = 'user-user'
     AND h.aktivni = 1
   ORDER BY u.prijmeni, u.jmeno;
*/

-- ============================================================================
-- MIGRACE Z PŮVODNÍHO SCHÉMATU
-- ============================================================================

-- Pokud máte již data v původní tabulce, migrujte takto:

-- 1. Přejmenovat starou tabulku
-- RENAME TABLE 25_hierarchie_vztahy TO 25_hierarchie_vztahy_old;

-- 2. Vytvořit novou tabulku (viz výše)

-- 3. Migrovat data
-- INSERT INTO 25_hierarchie_vztahy (
--     id, profil_id, typ_vztahu, user_id_1, user_id_2, lokalita_id, usek_id,
--     pozice_node_1, pozice_node_2,
--     scope,  -- NOVÉ!
--     viditelnost_objednavky, viditelnost_faktury, viditelnost_smlouvy,
--     viditelnost_pokladna, viditelnost_uzivatele, viditelnost_lp,
--     notifikace_email, notifikace_inapp, notifikace_typy,
--     aktivni, dt_vytvoreni, dt_upraveno, upravil_user_id
-- )
-- SELECT 
--     id, profil_id, typ_vztahu, user_id_1, user_id_2, lokalita_id, usek_id,
--     pozice_node_1, pozice_node_2,
--     CASE uroven_opravneni  -- Převod uroven_opravneni → scope
--         WHEN 1 THEN 'OWN'
--         WHEN 2 THEN 'TEAM'
--         WHEN 3 THEN 'LOCATION'
--         WHEN 4 THEN 'ALL'
--         ELSE 'OWN'
--     END AS scope,
--     viditelnost_objednavky, viditelnost_faktury, viditelnost_smlouvy,
--     viditelnost_pokladna, viditelnost_uzivatele, viditelnost_lp,
--     notifikace_email, notifikace_inapp, notifikace_typy,
--     aktivni, dt_vytvoreni, dt_upraveno, upravil_user_id
-- FROM 25_hierarchie_vztahy_old;

-- 4. Zkontrolovat a smazat starou tabulku
-- DROP TABLE 25_hierarchie_vztahy_old;
