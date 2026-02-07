-- =====================================================
-- Migration: Rozšíření sloupce chybove_zaznamy
-- Datum: 30. prosince 2025
-- Důvod: TEXT (64KB) je příliš malý pro velké importy
-- Řešení: MEDIUMTEXT (16MB)
-- =====================================================

USE eeo2025-dev;

-- Změna sloupce z TEXT na MEDIUMTEXT
ALTER TABLE `25_smlouvy_import_log` 
MODIFY COLUMN `chybove_zaznamy` MEDIUMTEXT DEFAULT NULL 
COMMENT 'JSON se seznamem chyb: [{row, field, message}] - MEDIUMTEXT pro velké importy';

-- Ověření změny
SHOW COLUMNS FROM `25_smlouvy_import_log` LIKE 'chybove_zaznamy';

-- Očekávaný výsledek:
-- Type: mediumtext
-- Limit: 16,777,215 bytů (16 MB)

-- =====================================================
-- Pro produkční databázi (PROVÉST RUČNĚ):
-- =====================================================
-- USE eeo2025;
-- 
-- ALTER TABLE `25_smlouvy_import_log` 
-- MODIFY COLUMN `chybove_zaznamy` MEDIUMTEXT DEFAULT NULL 
-- COMMENT 'JSON se seznamem chyb: [{row, field, message}] - MEDIUMTEXT pro velké importy';
-- =====================================================
