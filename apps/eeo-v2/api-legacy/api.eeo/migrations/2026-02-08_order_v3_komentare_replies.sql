-- =============================================================================
-- MIGRACE: Přidání podpory odpovědí na komentáře (parent_comment_id)
-- =============================================================================
-- Datum: 8. 2. 2026
-- Autor: AI (GitHub Copilot)
-- Databáze: EEO-OSTRA-DEV (dev), eeo2025-dev
-- Tabulka: 25a_objednavky_komentare
-- =============================================================================

USE `EEO-OSTRA-DEV`;

-- =============================================================================
-- KROK 1: Přidání sloupce parent_comment_id pro odpovědi
-- =============================================================================

ALTER TABLE `25a_objednavky_komentare`
  ADD COLUMN `parent_comment_id` BIGINT UNSIGNED NULL DEFAULT NULL 
    COMMENT 'FK na nadřazený komentář (pro odpovědi)' 
    AFTER `objednavka_id`,
  ADD INDEX `idx_parent_comment` (`parent_comment_id`),
  ADD CONSTRAINT `fk_25a_obj_kom_parent` 
    FOREIGN KEY (`parent_comment_id`) 
    REFERENCES `25a_objednavky_komentare`(`id`) 
    ON DELETE CASCADE;

-- =============================================================================
-- KROK 2: Ověření struktury tabulky
-- =============================================================================

SHOW CREATE TABLE `25a_objednavky_komentare`;

-- Očekávaný výstup by měl obsahovat:
-- - `parent_comment_id` BIGINT UNSIGNED NULL
-- - INDEX `idx_parent_comment`
-- - FOREIGN KEY `fk_25a_obj_kom_parent`

-- =============================================================================
-- KROK 3: Testovací data (volitelné - pouze pro DEV)
-- =============================================================================

-- Příklad: Hlavní komentář
-- INSERT INTO `25a_objednavky_komentare` 
--   (objednavka_id, parent_comment_id, user_id, obsah, obsah_plain, dt_vytvoreni, smazano)
-- VALUES 
--   (123, NULL, 1, 'Hlavní komentář', 'Hlavní komentář', NOW(), 0);

-- Příklad: Odpověď na hlavní komentář (parent_comment_id = ID hlavního komentáře)
-- INSERT INTO `25a_objednavky_komentare` 
--   (objednavka_id, parent_comment_id, user_id, obsah, obsah_plain, dt_vytvoreni, smazano)
-- VALUES 
--   (123, LAST_INSERT_ID(), 2, 'Odpověď na komentář', 'Odpověď na komentář', NOW(), 0);

-- =============================================================================
-- ROLLBACK (pokud bude potřeba vrátit změny)
-- =============================================================================

-- ALTER TABLE `25a_objednavky_komentare`
--   DROP FOREIGN KEY `fk_25a_obj_kom_parent`;
--
-- ALTER TABLE `25a_objednavky_komentare`
--   DROP INDEX `idx_parent_comment`;
--
-- ALTER TABLE `25a_objednavky_komentare`
--   DROP COLUMN `parent_comment_id`;

-- =============================================================================
-- POZNÁMKY
-- =============================================================================
-- 1. Sloupec parent_comment_id je NULL pro hlavní komentáře (top-level)
-- 2. Sloupec parent_comment_id obsahuje ID nadřazeného komentáře pro odpovědi
-- 3. ON DELETE CASCADE zajistí, že smazání hlavního komentáře smaže i všechny odpovědi
-- 4. Index idx_parent_comment zrychlí vyhledávání odpovědí k danému komentáři
-- =============================================================================
