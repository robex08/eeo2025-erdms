-- ========================================
-- FIX: Rozšíření sloupců procento_* pro prevenci overflow chyby
-- ========================================
-- Datum: 2026-01-19
-- Důvod: SQLSTATE[22003]: Numeric value out of range: 1264 Out of range value for column 'procento_skutecne'
--
-- DECIMAL(5,2) = max 999.99
-- DECIMAL(7,2) = max 99999.99 (stačí pro procenta)
--
-- Použití:
--   mysql -h10.3.172.11 -uerdms_user -pAhchohTahnoh7eim EEO-OSTRA-DEV < 2026-01-19_fix_procento_columns_overflow.sql
-- ========================================

USE `EEO-OSTRA-DEV`;

-- Rozšíření sloupců v tabulce 25_smlouvy
ALTER TABLE `25_smlouvy` 
  MODIFY COLUMN `procento_cerpani` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_pozadovano` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_planovano` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_skutecne` DECIMAL(7,2) NULL DEFAULT 0.00;

-- Ověření změn
SHOW COLUMNS FROM `25_smlouvy` LIKE 'procento%';

SELECT 'Sloupce procento_* byly úspěšně rozšířeny na DECIMAL(7,2)' AS status;
