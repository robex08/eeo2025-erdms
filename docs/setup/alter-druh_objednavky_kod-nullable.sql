-- ============================================
-- ALTER TABLE: druh_objednavky_kod - Allow NULL
-- ============================================
-- Datum: 5. prosince 2025
-- Důvod: Pole druh_objednavky_kod je vyplňováno až ve FÁZI 3,
--        ale databáze vyžaduje hodnotu už při INSERT ve fázi 1-2.
--        Řešení: Povolit NULL hodnoty pro toto pole.
-- ============================================

-- PRODUKČNÍ tabulka
ALTER TABLE r_objednavky 
MODIFY COLUMN druh_objednavky_kod VARCHAR(255) NULL DEFAULT NULL;

-- DEMO tabulky (pokud existují)
ALTER TABLE objednavky0103 
MODIFY COLUMN druh_objednavky_kod VARCHAR(255) NULL DEFAULT NULL;

ALTER TABLE objednavky0121 
MODIFY COLUMN druh_objednavky_kod VARCHAR(255) NULL DEFAULT NULL;

ALTER TABLE objednavky0123 
MODIFY COLUMN druh_objednavky_kod VARCHAR(255) NULL DEFAULT NULL;

-- Ověření změny
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'erdms'
  AND COLUMN_NAME = 'druh_objednavky_kod'
  AND TABLE_NAME IN ('r_objednavky', 'objednavky0103', 'objednavky0121', 'objednavky0123');
