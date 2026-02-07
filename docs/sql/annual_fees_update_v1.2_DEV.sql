-- =============================================================================
-- ANNUAL FEES - Úprava položek v1.2 (DEV)
-- =============================================================================
-- Datum: 2026-01-30
-- Databáze: EEO-OSTRA-DEV
-- Popis: Přidání sloupců pro číslo dokladu a datum zaplacení
-- =============================================================================

USE `EEO-OSTRA-DEV`;

-- 1. Přidání sloupce pro číslo dokladu (VEMA)
ALTER TABLE `25a_rocni_poplatky_polozky`
ADD COLUMN `cislo_dokladu` VARCHAR(100) NULL COMMENT 'Číslo dokladu z VEMA' AFTER `castka`;

-- 2. Přidání sloupce pro datum zaplacení
ALTER TABLE `25a_rocni_poplatky_polozky`
ADD COLUMN `datum_zaplaceno` DATE NULL COMMENT 'Datum skutečného zaplacení položky' AFTER `cislo_dokladu`;

-- 3. Odstranění indexu na faktura_id (pokud existuje) - necháme sloupec pro historii
-- ALTER TABLE `25a_rocni_poplatky_polozky` DROP INDEX `idx_faktura` IF EXISTS;

-- =============================================================================
-- POZNÁMKY:
-- - Sloupce faktura_id a faktura_cislo ZŮSTÁVAJÍ pro historická data
-- - V UI se už nebudou používat, ale v DB zůstanou pro možný export/analýzu
-- - nazev_polozky se změní na "Poznámka" pouze v UI, DB sloupec zůstane stejný
-- =============================================================================

SELECT 'Migration v1.2 completed successfully!' AS Status;
