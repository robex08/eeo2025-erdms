-- =============================================================================
-- 💰 ROČNÍ POPLATKY - AKTUALIZACE V1.1 (DEV)
-- =============================================================================
-- Databáze: EEO-OSTRA-DEV
-- Datum: 2026-01-30
-- Verze: 1.1.0
-- =============================================================================
--
-- ZMĚNY:
-- 1. Přidání sloupce 'poznamka' do hlavní tabulky 25a_rocni_poplatky
-- 2. Vytvoření nové tabulky 25a_rocni_poplatky_prilohy (přílohy k hlavním řádkům)
--    - Prefix: "rp" při ukládání do složky
--    - Vztah: K hlavnímu řádku (ne k podřádkům)
--
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- ČÁST 1: AKTUALIZACE HLAVNÍ TABULKY - Přidání sloupce 'poznamka'
-- =============================================================================

-- Zkontrolovat, zda sloupec 'poznamka' již existuje
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV'
  AND TABLE_NAME = '25a_rocni_poplatky'
  AND COLUMN_NAME = 'poznamka';

-- Přidat sloupec 'poznamka' (pokud neexistuje)
ALTER TABLE `25a_rocni_poplatky`
ADD COLUMN `poznamka` TEXT NULL COMMENT 'Poznámka k ročnímu poplatku'
AFTER `popis`;

-- Ověření přidání sloupce
DESCRIBE `25a_rocni_poplatky`;

-- =============================================================================
-- ČÁST 2: NOVÁ TABULKA - 25a_rocni_poplatky_prilohy
-- =============================================================================

CREATE TABLE IF NOT EXISTS `25a_rocni_poplatky_prilohy` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  
  -- VAZBA NA ROČNÍ POPLATEK (hlavní řádek)
  `rocni_poplatek_id` INT(10) UNSIGNED NOT NULL COMMENT 'Vazba na 25a_rocni_poplatky.id',
  
  -- ÚDAJE O SOUBORU
  `guid` VARCHAR(50) DEFAULT NULL COMMENT 'GUID pro jedinečnost souboru',
  `typ_prilohy` VARCHAR(50) DEFAULT NULL COMMENT 'Klasifikace přílohy (např. SMLOUVA, FAKTURA, JINE)',
  `originalni_nazev_souboru` VARCHAR(255) NOT NULL COMMENT 'Původní název souboru',
  `systemova_cesta` VARCHAR(255) NOT NULL COMMENT 'Cesta k souboru na disku (relativní, prefix: rp)',
  `velikost_souboru_b` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Velikost souboru v bytech',
  
  -- AUDIT TRAIL
  `nahrano_uzivatel_id` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který nahrál soubor',
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Datum a čas vytvoření',
  `dt_aktualizace` DATETIME DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  
  PRIMARY KEY (`id`),
  INDEX `idx_rocni_poplatek_id` (`rocni_poplatek_id`),
  INDEX `idx_nahrano_uzivatel_id` (`nahrano_uzivatel_id`),
  INDEX `idx_guid` (`guid`),
  INDEX `idx_dt_vytvoreni` (`dt_vytvoreni`),
  
  CONSTRAINT `fk_rp_prilohy_rocni_poplatek`
    FOREIGN KEY (`rocni_poplatek_id`) 
    REFERENCES `25a_rocni_poplatky` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  
  CONSTRAINT `fk_rp_prilohy_uzivatel`
    FOREIGN KEY (`nahrano_uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci 
COMMENT='Přílohy k ročním poplatkům (hlavní řádky) - prefix: rp';

-- =============================================================================
-- ČÁST 3: OVĚŘENÍ ZMĚN
-- =============================================================================

-- Zkontrolovat sloupec 'poznamka' v hlavní tabulce
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV'
  AND TABLE_NAME = '25a_rocni_poplatky'
  AND COLUMN_NAME IN ('popis', 'poznamka', 'rok');

-- Zkontrolovat novou tabulku příloh
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV'
  AND TABLE_NAME = '25a_rocni_poplatky_prilohy';

-- Zobrazit strukturu nové tabulky
DESCRIBE `25a_rocni_poplatky_prilohy`;

-- Zkontrolovat foreign keys
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV'
  AND TABLE_NAME = '25a_rocni_poplatky_prilohy'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- ✅ AKTUALIZACE DOKONČENA - DEV
-- =============================================================================
-- Provedeno:
-- 1. ✅ Přidán sloupec 'poznamka' do tabulky 25a_rocni_poplatky
-- 2. ✅ Vytvořena tabulka 25a_rocni_poplatky_prilohy
-- 3. ✅ Nastaveny indexy a foreign keys
-- 
-- Poznámky:
-- - Sloupce 'rok', 'druh' (default='JINE'), 'platba' (default='MESICNI') jsou BEZ ZMĚNY
-- - Přílohy jsou vztaženy k hlavnímu řádku (ne k podřádkům)
-- - Při ukládání použít prefix "rp" pro soubory
-- =============================================================================
