-- ============================================================================
-- MIGRATION: Fix all foreign keys referencing non-existent table
-- Date: 2024-12-31
-- Issue: Multiple tables have FK constraints referencing '25a_objednavky_pokazene'
--        which doesn't exist. Should reference '25a_objednavky' instead.
-- ============================================================================

-- BACKUP COMMANDS (run before migration):
-- mysqldump -u erdms_user -pAhchohTahnoh7eim -h 10.3.172.11 eeo2025-dev 25a_objednavky_polozky > backup_polozky_20241231.sql
-- mysqldump -u erdms_user -pAhchohTahnoh7eim -h 10.3.172.11 eeo2025-dev 25a_faktury_prilohy > backup_faktury_prilohy_20241231.sql

USE `eeo2025-dev`;

-- ============================================================================
-- STEP 1: Delete orphaned records
-- ============================================================================

-- Delete orphaned order items (8 records)
DELETE p FROM 25a_objednavky_polozky p
LEFT JOIN 25a_objednavky o ON p.objednavka_id = o.id
WHERE o.id IS NULL;

-- Delete orphaned invoice attachments (82 records)
DELETE fp FROM 25a_faktury_prilohy fp
LEFT JOIN 25a_objednavky o ON fp.objednavka_id = o.id
WHERE o.id IS NULL;

-- ============================================================================
-- STEP 2: Fix 25a_objednavky_polozky FK constraint
-- ============================================================================

-- Drop incorrect FK constraint
ALTER TABLE `25a_objednavky_polozky`
DROP FOREIGN KEY `25a_objednavky_polozky_ibfk_1`;

-- Add correct FK constraint
ALTER TABLE `25a_objednavky_polozky`
ADD CONSTRAINT `25a_objednavky_polozky_ibfk_1`
FOREIGN KEY (`objednavka_id`)
REFERENCES `25a_objednavky` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ============================================================================
-- STEP 3: Fix 25a_faktury_prilohy FK constraint
-- ============================================================================

-- Drop incorrect FK constraint
ALTER TABLE `25a_faktury_prilohy`
DROP FOREIGN KEY `fk_faktury_prilohy_objednavka`;

-- Add correct FK constraint
ALTER TABLE `25a_faktury_prilohy`
ADD CONSTRAINT `fk_faktury_prilohy_objednavka`
FOREIGN KEY (`objednavka_id`)
REFERENCES `25a_objednavky` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify FK constraints point to correct table
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'eeo2025-dev'
  AND TABLE_NAME IN ('25a_objednavky_polozky', '25a_faktury_prilohy')
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Verify no orphaned records remain
SELECT 'Orphaned objednavky_polozky' as check_type, COUNT(*) as count
FROM 25a_objednavky_polozky p
LEFT JOIN 25a_objednavky o ON p.objednavka_id = o.id
WHERE o.id IS NULL
UNION ALL
SELECT 'Orphaned faktury_prilohy', COUNT(*)
FROM 25a_faktury_prilohy fp
LEFT JOIN 25a_objednavky o ON fp.objednavka_id = o.id
WHERE o.id IS NULL;
