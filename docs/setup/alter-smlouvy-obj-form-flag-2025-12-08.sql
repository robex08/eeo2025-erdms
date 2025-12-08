-- =====================================================
-- Migrace: Přidání příznaku pro použití smlouvy v obj. formuláři
-- Datum: 2025-12-08
-- Popis: Přidává sloupec pouzit_v_obj_formu pro rozlišení,
--        zda smlouva má být dostupná v obj. formuláři nebo ne
-- =====================================================

USE eeo2025;

-- Přidání nového sloupce pouzit_v_obj_formu
ALTER TABLE `25_smlouvy`
ADD COLUMN `pouzit_v_obj_formu` TINYINT(1) NOT NULL DEFAULT 0 
COMMENT '1 = Smlouva dostupná v obj. formuláři, 0 = Pouze v modulu smluv a faktur'
AFTER `aktivni`;

-- Přidání indexu pro rychlé filtrování
ALTER TABLE `25_smlouvy`
ADD INDEX `idx_pouzit_obj_form` (`pouzit_v_obj_formu`);

-- Označit všechny existující smlouvy jako dostupné v obj. formuláři (1)
-- (protože dosud byly pouze pro objednávky)
UPDATE `25_smlouvy`
SET `pouzit_v_obj_formu` = 1
WHERE `aktivni` = 1;

-- Verifikační SELECT
SELECT 
    id,
    cislo_smlouvy,
    nazev_smlouvy,
    aktivni,
    pouzit_v_obj_formu,
    dt_vytvoreni
FROM `25_smlouvy`
ORDER BY id DESC
LIMIT 20;

-- =====================================================
-- DOKUMENTACE POUŽITÍ:
-- =====================================================
-- 
-- pouzit_v_obj_formu = 1: Smlouva se zobrazí v:
--   - Obj. formulář (naseptávač smluv při vytváření objednávky)
--   - Modul smluv (seznam všech smluv)
--   - Modul faktur (naseptávač při evidenci faktury)
--   - Univerzální vyhledávání v hlavičce
--
-- pouzit_v_obj_formu = 0: Smlouva se zobrazí v:
--   - Modul smluv (seznam všech smluv)
--   - Modul faktur (naseptávač při evidenci faktury)
--   - Univerzální vyhledávání v hlavičce
--   (NEBUDE v obj. formuláři)
--
-- =====================================================
