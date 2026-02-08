-- =============================================================================
-- MIGRACE: Kontrola a komentáře pro objednávky V3
-- =============================================================================
-- Datum: 8. února 2026
-- Databáze: EEO-OSTRA-DEV (DEV prostředí)
-- Autor: Development team
-- Popis: Přidání funkcionality kontroly objednávek a komentářového systému
-- =============================================================================

-- Použití:
-- mysql -h 10.3.172.11 -u erdms_user -p EEO-OSTRA-DEV < 2026-02-08_order_v3_kontrola_komentare.sql

-- =============================================================================
-- KROK 1: Přidat sloupec pro kontrolu objednávek
-- =============================================================================

ALTER TABLE `25a_objednavky`
ADD COLUMN `kontrola_metadata` JSON DEFAULT NULL 
COMMENT 'Metadata kontroly objednávky (JSON: zkontrolovano, kontroloval_user_id, kontroloval_jmeno, dt_kontroly)'
AFTER `poznamka`;

-- Příklad JSON struktury:
-- {
--   "zkontrolovano": true,
--   "kontroloval_user_id": 42,
--   "kontroloval_jmeno": "Jan Novák",
--   "dt_kontroly": "2026-02-08 14:30:00"
-- }

-- =============================================================================
-- KROK 2: Vytvořit tabulku pro komentáře k objednávkám
-- =============================================================================

CREATE TABLE `25a_objednavky_komentare` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `objednavka_id` INT UNSIGNED NOT NULL COMMENT 'FK na 25a_objednavky',
  `user_id` INT UNSIGNED NOT NULL COMMENT 'Autor komentáře',
  
  -- Obsah komentáře
  `obsah` TEXT NOT NULL COMMENT 'Komentář (plain text nebo HTML)',
  `obsah_plain` TEXT NOT NULL COMMENT 'Plain text pro fulltext search',
  `metadata` TEXT DEFAULT NULL COMMENT 'JSON s extra daty (workflow fáze, atd.)',
  
  -- Soft delete
  `smazano` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag',
  `dt_smazani` DATETIME DEFAULT NULL COMMENT 'Datum a čas smazání',
  
  -- Časové značky
  `dt_vytvoreni` DATETIME NOT NULL COMMENT 'Datum a čas vytvoření',
  
  -- Primary key
  PRIMARY KEY (`id`),
  
  -- Indexy pro rychlé vyhledávání
  INDEX `idx_objednavka` (`objednavka_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_datum` (`dt_vytvoreni`),
  INDEX `idx_smazano` (`smazano`),
  
  -- Fulltext index pro vyhledávání v obsahu
  FULLTEXT KEY `ft_obsah` (`obsah_plain`),
  
  -- Foreign keys
  CONSTRAINT `fk_25a_obj_kom_objednavka` 
    FOREIGN KEY (`objednavka_id`) 
    REFERENCES `25a_objednavky`(`id`) 
    ON DELETE CASCADE,
    
  CONSTRAINT `fk_25a_obj_kom_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `25_uzivatele`(`id`)
    ON DELETE RESTRICT
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Komentáře k objednávkám - chronologický seznam pro komunikaci účastníků';

-- =============================================================================
-- KROK 3: Přidat roli KONTROLOR_OBJEDNAVEK
-- =============================================================================

INSERT INTO `25_role` 
  (`kod_role`, `nazev_role`, `Popis`, `aktivni`) 
VALUES 
  (
    'KONTROLOR_OBJEDNAVEK', 
    'Kontrolor objednávek', 
    'Oprávnění ke kontrole objednávek (checkbox zkontrolováno)', 
    1
  );

-- Poznámka: ID role se přiřadí automaticky (AUTO_INCREMENT)
-- SUPERADMIN a ADMINISTRATOR mají právo kontroly automaticky

-- =============================================================================
-- OVĚŘENÍ MIGRACE
-- =============================================================================

-- Zkontrolovat přidaný sloupec
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE, 
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV'
  AND TABLE_NAME = '25a_objednavky'
  AND COLUMN_NAME = 'kontrola_metadata';

-- Zkontrolovat novou tabulku
SHOW CREATE TABLE `25a_objednavky_komentare`;

-- Zkontrolovat novou roli
SELECT * FROM `25_role` WHERE `kod_role` = 'KONTROLOR_OBJEDNAVEK';

-- =============================================================================
-- ROLLBACK (v případě potřeby vrátit změny)
-- =============================================================================

-- DROP TABLE `25a_objednavky_komentare`;
-- ALTER TABLE `25a_objednavky` DROP COLUMN `kontrola_metadata`;
-- DELETE FROM `25_role` WHERE `kod_role` = 'KONTROLOR_OBJEDNAVEK';

-- =============================================================================
-- KONEC MIGRACE
-- =============================================================================
