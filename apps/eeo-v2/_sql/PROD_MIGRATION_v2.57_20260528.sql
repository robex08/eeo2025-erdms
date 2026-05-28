-- =====================================================
-- PRODUKČNÍ MIGRACE v2.57 - 28. května 2026
-- =====================================================
-- Databáze: eeo2025 (PRODUKCE)
-- Změny: LP odbory + LP modul + Optimalizace smluv
-- =====================================================

USE `eeo2025`;

-- ===========================
-- ČÁST 1: NOVÁ TABULKA - Odborové LP přiřazení
-- ===========================
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

SELECT 'Tabulka 25a_odbory_lp_prirazeni vytvořena' as status;

-- ===========================
-- ČÁST 2: NOVÉ SLOUPCE - LP modul
-- ===========================
-- Přidání sloupce modul do tabulky limitovaných příslibů
-- (pokud už existuje, skok na další krok)
SET @col_exists = (SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'eeo2025'
      AND TABLE_NAME = '25_limitovane_prisliby'
      AND COLUMN_NAME = 'modul');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `25_limitovane_prisliby`
     ADD COLUMN `modul` VARCHAR(50) DEFAULT ''op'' 
     COMMENT ''Viditelnost LP: o=objednávky, p=pokladna, f=faktury. Kombinace: op, fp, fop. Default op''
     AFTER `kategorie`',
    'SELECT ''Sloupec modul již existuje'' as status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index pro rychlé filtrování (pokud neexistuje)
SET @idx_exists = (SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'eeo2025'
      AND TABLE_NAME = '25_limitovane_prisliby'
      AND INDEX_NAME = 'idx_modul');

SET @sql_idx = IF(@idx_exists = 0,
    'CREATE INDEX `idx_modul` ON `25_limitovane_prisliby` (`modul`)',
    'SELECT ''Index idx_modul již existuje'' as status');

PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

SELECT 'Sloupec modul + index připraven' as status;

-- ===========================
-- ČÁST 3: NOVÉ SLOUPCE - LP čerpání z odborů
-- ===========================
-- Sloupec: cerpano_odbory_faktury
SET @col1_exists = (SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'eeo2025'
      AND TABLE_NAME = '25_limitovane_prisliby_cerpani'
      AND COLUMN_NAME = 'cerpano_odbory_faktury');

SET @sql1 = IF(@col1_exists = 0,
    'ALTER TABLE `25_limitovane_prisliby_cerpani`
     ADD COLUMN `cerpano_odbory_faktury` DECIMAL(15,2) DEFAULT 0.00
     COMMENT ''Čerpání z faktur přiřazených přes odbory (bez objednávky)''
     AFTER `cerpano_pokladna`',
    'SELECT ''Sloupec cerpano_odbory_faktury již existuje'' as status');

PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Sloupec: cerpano_odbory_pokladna
SET @col2_exists = (SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'eeo2025'
      AND TABLE_NAME = '25_limitovane_prisliby_cerpani'
      AND COLUMN_NAME = 'cerpano_odbory_pokladna');

SET @sql2 = IF(@col2_exists = 0,
    'ALTER TABLE `25_limitovane_prisliby_cerpani`
     ADD COLUMN `cerpano_odbory_pokladna` DECIMAL(15,2) DEFAULT 0.00
     COMMENT ''Čerpání z pokladních položek přiřazených přes odbory''
     AFTER `cerpano_odbory_faktury`',
    'SELECT ''Sloupec cerpano_odbory_pokladna již existuje'' as status');

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SELECT 'Sloupce pro odbory LP čerpání připraveny' as status;

-- ===========================
-- OVĚŘENÍ MIGRACÍ
-- ===========================
SELECT '=== OVĚŘENÍ STRUKTURY ===' as check_title;

-- Tabulka 25a_odbory_lp_prirazeni
SELECT 
    'Tabulka odbory_lp_prirazeni' as item,
    COUNT(*) as pocet_zaznamu
FROM `25a_odbory_lp_prirazeni`;

-- Sloupec modul
SELECT 
    'Sloupec 25_limitovane_prisliby.modul' as item,
    COUNT(DISTINCT modul) as unique_values,
    GROUP_CONCAT(DISTINCT modul) as values
FROM `25_limitovane_prisliby`;

-- Sloupce odbory čerpání
SELECT 
    'Sloupce odbory čerpání' as item,
    SUM(cerpano_odbory_faktury) as sum_faktury,
    SUM(cerpano_odbory_pokladna) as sum_pokladna,
    COUNT(*) as pocet_lp
FROM `25_limitovane_prisliby_cerpani`;

SELECT '=== MIGRACE DOKONČENA ===' as final_status;

-- =====================================================
-- POZNÁMKY PRO ADMINISTRÁTORA
-- =====================================================
-- • Všechny změny jsou bezpečné - nepřepisují existující data
-- • Nové sloupce mají DEFAULT hodnoty → 100% zpětná kompatibilita
-- • Indexy jsou vytvořeny pokud neexistují
-- • Foreign keys zajišťují konzistenci dat
-- 
-- ROLLBACK není nutný - změny jsou additive-only.
-- Pokud by bylo třeba vrátit změny:
--   DROP TABLE IF EXISTS `25a_odbory_lp_prirazeni`;
--   ALTER TABLE `25_limitovane_prisliby` DROP COLUMN `modul`;
--   ALTER TABLE `25_limitovane_prisliby_cerpani` DROP COLUMN `cerpano_odbory_faktury`;
--   ALTER TABLE `25_limitovane_prisliby_cerpani` DROP COLUMN `cerpano_odbory_pokladna`;
