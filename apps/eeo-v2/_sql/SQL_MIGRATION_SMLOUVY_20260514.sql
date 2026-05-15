-- =============================================================================
-- MIGRATION SCRIPT: Kopie SMLUV z PRODUKCE do DEV
-- =============================================================================
-- Datum: 2026-05-14
-- Autor: GitHub Copilot (PHPAPI agent)
-- 
-- Zdroj: eeo2025 (produkce) - READ-ONLY
-- Cíl: EEO-OSTRA-DEV (development) - WRITE
--
-- CO SE KOPÍRUJE:
-- 1. Smlouvy (25_smlouvy) - KOMPLETNÍ PŘEPIS
-- 2. Import log smluv (25_smlouvy_import_log) - KOMPLETNÍ PŘEPIS
-- =============================================================================

-- Zakázání foreign key checks pro DEV DB
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- ČÁST 1: SMLOUVY (KOMPLETNÍ PŘEPIS)
-- =============================================================================

TRUNCATE TABLE `EEO-OSTRA-DEV`.`25_smlouvy`;
INSERT INTO `EEO-OSTRA-DEV`.`25_smlouvy` 
SELECT * FROM eeo2025.`25_smlouvy`;

-- =============================================================================
-- ČÁST 2: IMPORT LOG SMLUV (KOMPLETNÍ PŘEPIS)
-- =============================================================================

TRUNCATE TABLE `EEO-OSTRA-DEV`.`25_smlouvy_import_log`;
INSERT INTO `EEO-OSTRA-DEV`.`25_smlouvy_import_log` 
SELECT * FROM eeo2025.`25_smlouvy_import_log`;

-- =============================================================================
-- DOKONČENÍ: Povolení foreign key checks zpět
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- Zobrazit statistiky po migraci
SELECT 
    'Smlouvy' as tabulka,
    COUNT(*) as pocet_zaznamu
FROM `EEO-OSTRA-DEV`.`25_smlouvy`
UNION ALL
SELECT 
    'Import log',
    COUNT(*)
FROM `EEO-OSTRA-DEV`.`25_smlouvy_import_log`;

-- =============================================================================
-- OVĚŘENÍ: Faktury Dashboard count
-- =============================================================================
SELECT 
    'Dashboard faktury (should be 2400)' as kontrola,
    COUNT(*) as pocet
FROM `EEO-OSTRA-DEV`.`25a_objednavky_faktury` f
LEFT JOIN `EEO-OSTRA-DEV`.`25a_objednavky` o ON f.objednavka_id = o.id
LEFT JOIN `EEO-OSTRA-DEV`.`25_smlouvy` sm ON f.smlouva_id = sm.id
WHERE f.aktivni = 1
  AND (
      (f.objednavka_id IS NULL OR o.aktivni = 1)
      AND (f.smlouva_id IS NULL OR sm.aktivni = 1)
  )
  AND (YEAR(f.fa_datum_vystaveni) = 2026 OR YEAR(f.fa_datum_doruceni) = 2026 OR YEAR(f.fa_datum_splatnosti) = 2026);

-- =============================================================================
-- POZNÁMKY:
-- =============================================================================
-- ✅ Provedeno: Kompletní kopie smluv z produkce
-- ✅ Provedeno: Kompletní kopie import logu
-- ℹ️  DŮVOD: Dashboard faktur potřebuje aktivní smlouvy pro správný count
-- 🎯 VÝSLEDEK: Dashboard by měl nyní zobrazit 2400 faktur (stejně jako produkce)
-- =============================================================================
