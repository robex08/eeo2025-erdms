-- ================================================================================
-- PRODUKČNÍ UPDATE pro verzi 2.62 - VEMA Deník
-- ================================================================================
-- Datum: 2026-06-23
-- Účel: Přidání VEMA tabulek a práva VEMA_VIEW do produkční databáze eeo2025
-- ================================================================================

USE eeo2025;

-- ================================================================================
-- 1. PŘIDÁNÍ PRÁVA VEMA_VIEW
-- ================================================================================

-- Zkontrolovat, zda právo ještě neexistuje
INSERT IGNORE INTO `25_prava` (`id`, `kod_prava`, `popis`, `aktivni`)
VALUES (216, 'VEMA_VIEW', 'Zobrazení Deníku VEMA (import dat z VEMA systému)', 1);

-- ================================================================================
-- 2. VYTVOŘENÍ VEMA TABULEK
-- ================================================================================
-- Poznámka: Spouští se skripty pro vytvoření tabulek (pokud už neexistují)

-- 2.1 Hlavní tabulky
SOURCE /var/www/erdms-dev/apps/eeo-v2/_sql/vema_tables_create.sql;

-- 2.2 Metadata tabulky
SOURCE /var/www/erdms-dev/apps/eeo-v2/_sql/25v_kontrola_metadata.sql;
SOURCE /var/www/erdms-dev/apps/eeo-v2/_sql/25v_kontrola_metadata_historie.sql;

-- ================================================================================
-- KONEC UPDATU
-- ================================================================================

SELECT 'VEMA update dokončen - tabulky a práva přidány' AS status;
