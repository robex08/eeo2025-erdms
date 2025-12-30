-- ============================================================================
-- FIX: Foreign key constraint pro 25a_objednavky_prilohy
-- ============================================================================
-- Datum: 31. prosince 2025
-- Problém: Foreign key constraint odkazoval na špatnou tabulku:
--          25a_objednavky_pokazene místo 25a_objednavky
-- Důvod: Někdo při práci na manuálech "vykroutil" databázový constraint
-- ============================================================================

USE eeo2025_dev;

-- 1. Vyčištění sirotčích záznamů (přílohy bez objednávky)
DELETE p
FROM 25a_objednavky_prilohy p
LEFT JOIN 25a_objednavky o ON p.objednavka_id = o.id
WHERE o.id IS NULL;

-- 2. Smazání chybného foreign key constraint (pokud existuje)
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = 'eeo2025-dev'
      AND TABLE_NAME = '25a_objednavky_prilohy'
      AND CONSTRAINT_NAME = '25a_objednavky_prilohy_ibfk_1'
);

SET @sql = IF(@constraint_exists > 0,
    'ALTER TABLE 25a_objednavky_prilohy DROP FOREIGN KEY 25a_objednavky_prilohy_ibfk_1',
    'SELECT "Constraint neexistuje, skip DROP" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Přidání správného foreign key constraint
ALTER TABLE 25a_objednavky_prilohy 
ADD CONSTRAINT 25a_objednavky_prilohy_ibfk_1 
FOREIGN KEY (objednavka_id) REFERENCES 25a_objednavky(id);

-- 4. Ověření opravy
SELECT '✅ Foreign key constraint opraven' as vysledek;
SHOW CREATE TABLE 25a_objednavky_prilohy\G

-- ============================================================================
-- POZNÁMKA: Pro PRODUCTION:
-- - Tato migrace je určena pouze pro DEV databázi
-- - PRODUCTION databáze má správný constraint a není třeba nic opravovat
-- ============================================================================
