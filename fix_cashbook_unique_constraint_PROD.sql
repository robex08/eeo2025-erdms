-- ============================================================================
-- OPRAVA UNIQUE CONSTRAINT V 25a_pokladni_knihy - PRODUKCE
-- Datum: 25. ledna 2026 13:35
-- BACKUP: eeo2025_full_backup_20260125_133349_before_cashbook_fix.sql
-- ============================================================================

USE `eeo2025`;

-- 1. ODSTRANIT ŠPATNÝ CONSTRAINT
ALTER TABLE 25a_pokladni_knihy 
DROP INDEX unique_uzivatel_pokladna_obdobi;

-- 2. PŘIDAT SPRÁVNÝ CONSTRAINT
ALTER TABLE 25a_pokladni_knihy 
ADD UNIQUE KEY unique_pokladna_obdobi (pokladna_id, rok, mesic);

-- 3. OVĚŘENÍ
SHOW CREATE TABLE 25a_pokladni_knihy;
