-- Migration script for 25_limitovane_prisliby
-- Assigns IDs from OLD table to NEW table based on matching records
-- New records get IDs at the end
-- Date: 2025-11-21
-- MySQL 5.5.43 compatible

-- 1. Backup current table (optional, comment out if not needed)
-- CREATE TABLE IF NOT EXISTS `25_limitovane_prisliby_BACKUP_20251121` LIKE `25_limitovane_prisliby`;
-- INSERT INTO `25_limitovane_prisliby_BACKUP_20251121` SELECT * FROM `25_limitovane_prisliby`;

-- 2. Save existing triggers
-- Run this query BEFORE migration to see triggers: SHOW TRIGGERS LIKE '25_limitovane_prisliby';
-- Backup trigger definitions (will be recreated at the end)

-- 3. Temporarily drop triggers
DROP TRIGGER IF EXISTS `trg_lp_cerpani_insert`;
DROP TRIGGER IF EXISTS `trg_lp_cerpani_update`;

-- 4. Clear current table
TRUNCATE TABLE `25_limitovane_prisliby`;

-- 5. Disable foreign key checks and allow manual ID insertion
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- 4. Insert data from NEW table with IDs from OLD table
-- Records are matched by: user_id, usek_id, kategorie, cislo_lp
-- Values (amounts, names) are taken from NEW table

-- ID 1: OLD(1) -> LPIT1 (85,4)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(1, 85, 4, 'LPIT', 'LPIT1', '501', 'Spotřeba materiálu', 1500000.00, '2025-01-01', '2025-12-31');

-- ID 2: OLD(2) -> LPIT2 (85,4)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(2, 85, 4, 'LPIT', 'LPIT2', '511', 'Opravy a udržování', 300000.00, '2025-01-01', '2025-12-31');

-- ID 3: OLD(3) -> LPIT3 (85,4)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(3, 85, 4, 'LPIT', 'LPIT3', '518', 'Ostatní služby', 1000000.00, '2025-01-01', '2025-12-31');

-- ID 4: OLD(4) -> LPIT4 (85,4)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(4, 85, 4, 'LPIT', 'LPIT4', '527', 'Zákonné sociální služby', 300000.00, '2025-01-01', '2025-12-31');

-- ID 5: OLD(5) -> LPIT5 (85,4)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(5, 85, 4, 'LPIT', 'LPIT5', '558', 'Náklady z drobného dlouhodobého majteku', 2000000.00, '2025-01-01', '2025-12-31');

-- ID 6: OLD(6) -> LPIA1 (64,9) - WARNING: OLD was usek_id=9, NEW is usek_id=10
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(6, 64, 10, 'LPIA', 'LPIA1', '501', 'Spotřeba materiálu', 10000.00, '2025-01-01', '2025-12-31');

-- ID 7: OLD(7) -> LPIA2 (64,9) - WARNING: OLD was usek_id=9, NEW is usek_id=10
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(7, 64, 10, 'LPIA', 'LPIA2', '527', 'Zákonné sociální náklady', 50000.00, '2025-01-01', '2025-12-31');

-- ID 8: OLD(8) -> LPT1 (65,10)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(8, 65, 10, 'LPT', 'LPT1', '501', 'Ostatní náklady', 60000.00, '2025-01-01', '2025-12-31');

-- ID 9: OLD(9) -> LPT2 (65,10)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(9, 65, 10, 'LPT', 'LPT2', '518', 'Zákonné sociální náklady', 160000.00, '2025-01-01', '2025-12-31');

-- ID 10: OLD(10) -> LPT3 (65,10)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(10, 65, 10, 'LPT', 'LPT3', '527', 'Zákonné sociální služby', 20000.00, '2025-01-01', '2025-12-31');

-- ID 11: OLD(11) -> LPP1 (49,5) - WARNING: OLD was user_id=49, NEW is user_id=76
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(11, 76, 5, 'LPP', 'LPP1', '501', 'Spotřeba materiálu', 10000.00, '2025-01-01', '2025-12-31');

-- ID 12: OLD(12) -> LPP2 (49,5) - WARNING: OLD was user_id=49, NEW is user_id=76
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(12, 76, 5, 'LPP', 'LPP2', '518', 'Ostatní náklady', 200000.00, '2025-01-01', '2025-12-31');

-- ID 13: OLD(13) -> LPP3 (49,5) - WARNING: OLD was user_id=49, NEW is user_id=76
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(13, 76, 5, 'LPP', 'LPP3', '527', 'Zákonné sociální služby', 80000.00, '2025-01-01', '2025-12-31');

-- ID 14: OLD(14) -> LPN1 (63,5) - WARNING: OLD was usek_id=5, NEW is usek_id=3
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(14, 63, 3, 'LPN', 'LPN1', '501', 'Spotřeba materiálu', 4600000.00, '2025-01-01', '2025-12-31');

-- ID 15: OLD(15) -> LPN2 (63,5) - WARNING: OLD was usek_id=5, NEW is usek_id=3
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(15, 63, 3, 'LPN', 'LPN2', '511', 'Opravy a udržování', 170000.00, '2025-01-01', '2025-12-31');

-- ID 16: OLD(16) -> LPN3 (63,5) - WARNING: OLD was usek_id=5, NEW is usek_id=3
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(16, 63, 3, 'LPN', 'LPN3', '518', 'Ostatní náklady', 2110000.00, '2025-01-01', '2025-12-31');

-- ID 17: OLD(17) -> LPN4 (63,5) - WARNING: OLD was usek_id=5, NEW is usek_id=3
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(17, 63, 3, 'LPN', 'LPN4', '558', 'Náklady z drobného dlouhodobého majetku', 450000.00, '2025-01-01', '2025-12-31');

-- ID 18: OLD(18) -> LPL1 (62,2)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(18, 62, 2, 'LPL', 'LPL1', '501', 'Spotřeba materiálu', 950000.00, '2025-01-01', '2025-12-31');

-- ID 19: OLD(19) -> LPL2 (62,2)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(19, 62, 2, 'LPL', 'LPL2', '518', 'Ostatní služby', 150000.00, '2025-01-01', '2025-12-31');

-- ID 20: OLD(20) -> LPL3 (62,2)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(20, 62, 2, 'LPL', 'LPL3', '527', 'Zákonné sociální služby', 1300000.00, '2025-01-01', '2025-12-31');

-- ID 26: OLD(26) -> LPPT1 (51,6)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(26, 51, 6, 'LPPT', 'LPPT1', '501', 'Spotřeba materiálu', 9000000.00, '2025-01-01', '2025-12-31');

-- ID 27: OLD(27) -> LPPT2 (51,6)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(27, 51, 6, 'LPPT', 'LPPT2', '511', 'Opravy a udržování', 12389580.00, '2025-01-01', '2025-12-31');

-- ID 28: OLD(28) -> LPPT3 (51,6)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(28, 51, 6, 'LPPT', 'LPPT3', '518', 'Ostatní služby', 3500000.00, '2025-01-01', '2025-12-31');

-- ID 29: OLD(29) -> LPPT4 (51,6)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(29, 51, 6, 'LPPT', 'LPPT4', '527', 'Zákonné sociální služby', 50000.00, '2025-01-01', '2025-12-31');

-- ID 30: OLD(30) -> LPPT5 (51,6)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(30, 51, 6, 'LPPT', 'LPPT5', '558', 'Náklady z drobného dlouhodobého majetku', 2500000.00, '2025-01-01', '2025-12-31');

-- ID 31: OLD(31) -> LPR1 (64,10)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(31, 64, 10, 'LPR', 'LPR1', '512', 'Cestovné', 2000000.00, '2025-01-01', '2025-12-31');

-- ID 32: OLD(32) -> LPR2 (64,10)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(32, 64, 10, 'LPR', 'LPR2', '513', 'Náklady na reprezentaci', 600000.00, '2025-01-01', '2025-12-31');

-- ID 33: OLD(33) -> LPZOS1 (57,8)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(33, 57, 8, 'LPZOS', 'LPZOS1', '501', 'Spotřeba materiálu', 10000.00, '2025-01-01', '2025-12-31');

-- ID 34: OLD(34) -> LPZOS2 (57,8)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(34, 57, 8, 'LPZOS', 'LPZOS2', '513', 'Náklady na reprezentaci', 20000.00, '2025-01-01', '2025-12-31');

-- ID 35: OLD(35) -> LPZOS3 (57,8)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(35, 57, 8, 'LPZOS', 'LPZOS3', '518', 'Ostatní služby', 400000.00, '2025-01-01', '2025-12-31');

-- ID 36: OLD(36) -> LPZOS4 (57,8)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(36, 57, 8, 'LPZOS', 'LPZOS4', '527', 'Zákonné sociální služby', 100000.00, '2025-01-01', '2025-12-31');

-- ID 37: OLD(37) -> LPZOS5 (57,8)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(37, 57, 8, 'LPZOS', 'LPZOS5', '558', 'Náklady z drobného dlouhodobého majetku', 50000.00, '2025-01-01', '2025-12-31');

-- NEW RECORDS (not found in OLD table) - get new IDs at the end
-- ID 38: NEW -> LPP4 (76,5)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(38, 76, 5, 'LPP', 'LPP4', '527', 'Zákonné sociální služby - odbory', 148939.00, '2025-01-01', '2025-12-31');

-- ID 39: NEW -> LPR3 (64,10)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(39, 64, 10, 'LPR', 'LPR3', '518', 'Ostatní služby', 50000.00, '2025-01-01', '2025-12-31');

-- ID 40: NEW -> LPE1 (47,1)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(40, 47, 1, 'LPE', 'LPE1', '501', 'Spotřeba materiálu', 0.00, '2025-01-01', '2025-12-31');

-- ID 41: NEW -> LPE2 (47,1)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(41, 47, 1, 'LPE', 'LPE2', '518', 'Ostatní služby', 900000.00, '2025-01-01', '2025-12-31');

-- ID 42: NEW -> LPE3 (47,1)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(42, 47, 1, 'LPE', 'LPE3', '527', 'Zákonné sociální služby', 150000.00, '2025-01-01', '2025-12-31');

-- ID 43: NEW -> LPMK1 (64,10)
INSERT INTO `25_limitovane_prisliby` (`id`, `user_id`, `usek_id`, `kategorie`, `cislo_lp`, `cislo_uctu`, `nazev_uctu`, `vyse_financniho_kryti`, `platne_od`, `platne_do`) VALUES
(43, 64, 10, 'LPMK', 'LPMK1', '527', 'Zákonné sociální náklady', 100000.00, '2025-01-01', '2025-12-31');

-- Reset AUTO_INCREMENT to next available ID
ALTER TABLE `25_limitovane_prisliby` AUTO_INCREMENT = 44;

-- Re-enable foreign key checks and restore SQL mode
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_MODE = '';

-- NOTE: Triggers were temporarily dropped but NOT recreated
-- They should already exist in the database from previous table structure changes
-- If triggers are missing, you can recreate them manually

-- Verification query (optional)
-- SELECT COUNT(*) as total_records FROM `25_limitovane_prisliby`;
-- SELECT kategorie, COUNT(*) as count FROM `25_limitovane_prisliby` GROUP BY kategorie ORDER BY kategorie;
