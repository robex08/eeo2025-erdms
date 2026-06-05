-- ============================================================================
-- MIGRACE: Přidání sloupce pro DŮVOD věcné správnosti (oddělený od poznámky)
-- Datum: 2026-06-05
-- Autor: AI Assistant (GitHub Copilot)
-- 
-- POPIS:
-- Přidává nový sloupec vecna_spravnost_duvod (oddělený od vecna_spravnost_poznamka)
-- - vecna_spravnost_poznamka = interní poznámka (volitelná vždy)
-- - vecna_spravnost_duvod = důvod rozhodnutí (POVINNÝ při zamítnutí, volitelný při potvrzení)
-- 
-- DATABÁZE: EEO-OSTRA-DEV (testovací verze)
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- ============================================================================
-- 1. Přidání nového sloupce pro důvod
-- ============================================================================
ALTER TABLE `25a_objednavky_faktury`
    ADD COLUMN `vecna_spravnost_duvod` TEXT NULL DEFAULT NULL
    COMMENT 'Důvod rozhodnutí VS (volitelný pro status 1, POVINNÝ pro status 2)'
    AFTER `vecna_spravnost_poznamka`;

-- ============================================================================
-- 2. Ověření migrace
-- ============================================================================
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV'
  AND TABLE_NAME = '25a_objednavky_faktury'
  AND COLUMN_NAME IN ('vecna_spravnost_poznamka', 'vecna_spravnost_duvod', 'vecna_spravnost_potvrzeno');

-- ============================================================================
-- 3. Test - zobrazit existující data
-- ============================================================================
SELECT 'Test existujících hodnot' as test,
    COUNT(*) as celkem_faktur,
    SUM(CASE WHEN vecna_spravnost_potvrzeno IS NULL THEN 1 ELSE 0 END) as neoveeno_null,
    SUM(CASE WHEN vecna_spravnost_potvrzeno = 0 THEN 1 ELSE 0 END) as neoveeno_0,
    SUM(CASE WHEN vecna_spravnost_potvrzeno = 1 THEN 1 ELSE 0 END) as potvrzeno,
    SUM(CASE WHEN vecna_spravnost_potvrzeno = 2 THEN 1 ELSE 0 END) as zamitnuto
FROM `25a_objednavky_faktury`;
