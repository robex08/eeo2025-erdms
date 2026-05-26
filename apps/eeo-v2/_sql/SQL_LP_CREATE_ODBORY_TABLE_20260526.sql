-- =====================================================
-- MIGRACE: Vytvoření tabulky pro odborové LP přiřazení
-- Soubor: SQL_LP_CREATE_ODBORY_TABLE_20260526.sql
-- Datum: 26. května 2026
-- Účel: Přímé přiřazení odborových LP k fakturám a pokladním položkám
-- Autor: AI Assistant + robex08
-- =====================================================

USE `EEO-OSTRA-DEV`;

-- Vytvoření nové tabulky
CREATE TABLE IF NOT EXISTS `25a_odbory_lp_prirazeni` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  -- Vazby (vzájemně se vylučující)
  `faktura_id` INT(10) DEFAULT NULL COMMENT 'FK na 25a_objednavky_faktury',
  `pokladni_polozka_id` INT(10) DEFAULT NULL COMMENT 'FK na 25a_pokladni_polozky',
  
  -- LP přiřazení
  `lp_id` INT(11) NOT NULL COMMENT 'FK na 25_limitovane_prisliby',
  
  -- Metadata
  `poznamka` TEXT COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Poznámka k přiřazení',
  
  -- Audit trail
  `vytvoril_uzivatel_id` INT(11) UNSIGNED DEFAULT NULL COMMENT 'Kdo vytvořil záznam',
  `dt_vytvoreni` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Datum a čas vytvoření',
  `dt_aktualizace` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Datum a čas poslední aktualizace',
  
  -- Indexy
  UNIQUE KEY `uniq_faktura` (`faktura_id`),
  UNIQUE KEY `uniq_pokladna` (`pokladni_polozka_id`),
  INDEX `idx_lp` (`lp_id`),
  INDEX `idx_vytvoril` (`vytvoril_uzivatel_id`),
  INDEX `idx_dt_vytvoreni` (`dt_vytvoreni`),
  
  -- Constraint: Musí být vyplněno PRÁVĚ jedno
  -- CHECK constraint nepodporován v této verzi MariaDB - validace na aplikační vrstvě
  
  -- Foreign keys
  CONSTRAINT `fk_odbory_lp_faktura`
    FOREIGN KEY (`faktura_id`)
    REFERENCES `25a_objednavky_faktury` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  
  CONSTRAINT `fk_odbory_lp_pokladna`
    FOREIGN KEY (`pokladni_polozka_id`)
    REFERENCES `25a_pokladni_polozky` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  
  CONSTRAINT `fk_odbory_lp_lp`
    FOREIGN KEY (`lp_id`)
    REFERENCES `25_limitovane_prisliby` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  
  CONSTRAINT `fk_odbory_lp_uzivatel`
    FOREIGN KEY (`vytvoril_uzivatel_id`)
    REFERENCES `25_uzivatele` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Odborové LP přiřazení pro standalone faktury a pokladní položky';

-- Ověření
SHOW CREATE TABLE `25a_odbory_lp_prirazeni`;
SELECT COUNT(*) as pocet_zaznamu FROM `25a_odbory_lp_prirazeni`;

-- =====================================================
-- ROLLBACK (v případě problémů):
-- =====================================================
-- DROP TABLE IF EXISTS `25a_odbory_lp_prirazeni`;
