-- =====================================================
-- MIGRACE: Přidání sloupce modul do limitů příslibů
-- Soubor: SQL_LP_ADD_MODUL_COLUMN_20260526.sql
-- Datum: 26. května 2026
-- Účel: Modul-specifické zobrazení LP (objednávky/faktury/pokladna)
-- Autor: AI Assistant + robex08
-- =====================================================

USE `EEO-OSTRA-DEV`;

-- Backup před změnou (pro rollback)
CREATE TABLE IF NOT EXISTS `_backup_25_limitovane_prisliby_20260526` 
LIKE `25_limitovane_prisliby`;

INSERT INTO `_backup_25_limitovane_prisliby_20260526` 
SELECT * FROM `25_limitovane_prisliby`;

-- Přidání sloupce modul
ALTER TABLE `25_limitovane_prisliby`
ADD COLUMN `modul` VARCHAR(50) DEFAULT 'op' 
COMMENT 'Viditelnost LP: o=objednávky, p=pokladna, f=faktury. Kombinace: op, fp, fop. Default op (současný stav)'
AFTER `kategorie`;

-- Vytvoření indexu pro rychlé filtrování
CREATE INDEX `idx_modul` ON `25_limitovane_prisliby` (`modul`);

-- Ověření změn
SELECT 
    COUNT(*) as pocet_lp,
    modul,
    COUNT(*) as count_per_modul
FROM `25_limitovane_prisliby`
GROUP BY modul;

-- Výstup by měl zobrazit: všechny LP mají modul='op'

-- =====================================================
-- ROLLBACK (v případě problémů):
-- =====================================================
-- DROP INDEX `idx_modul` ON `25_limitovane_prisliby`;
-- ALTER TABLE `25_limitovane_prisliby` DROP COLUMN `modul`;
-- -- Obnovit z backupu:
-- TRUNCATE TABLE `25_limitovane_prisliby`;
-- INSERT INTO `25_limitovane_prisliby` SELECT * FROM `_backup_25_limitovane_prisliby_20260526`;
