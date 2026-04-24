-- ============================================================================
-- MIGRACE: Přesun nastavení hierarchie z per-message na globální nastavení
-- Datum: 2026-04-24
-- Popis: Organizační hierarchie je globální nastavení, ne volba uživatele
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- 1. Přidání globálních nastavení pro plánování do 25a_nastaveni_globalni
-- -------------------------------------------------------------------------
INSERT IGNORE INTO 25a_nastaveni_globalni 
  (klic, hodnota, popis, vytvoreno, aktualizovano) 
VALUES
  (
    'PLANNING_USE_HIERARCHY',
    '0',
    'Globální nastavení: Použít organizační hierarchii pro automatické rozesílání plánovaných zpráv a událostí (0=vypnuto, 1=zapnuto)',
    NOW(),
    NOW()
  ),
  (
    'PLANNING_HIERARCHY_PROFILE_ID',
    NULL,
    'ID hierarchického profilu, který se použije pro plánování (pokud je PLANNING_USE_HIERARCHY=1)',
    NOW(),
    NOW()
  );

-- 2. Odstranění sloupců pouzit_hierarchii a hierarchy_profile_id z tabulek
-- ---------------------------------------------------------------------------

-- Zkontrolovat, zda sloupce existují, a pokud ano, odstranit je
SET @exist_zpravy_hierarchie := (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV' 
    AND TABLE_NAME = '25_plan_zpravy' 
    AND COLUMN_NAME = 'pouzit_hierarchii'
);

SET @exist_zpravy_profile := (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV' 
    AND TABLE_NAME = '25_plan_zpravy' 
    AND COLUMN_NAME = 'hierarchy_profile_id'
);

SET @exist_udalosti_hierarchie := (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV' 
    AND TABLE_NAME = '25_plan_udalosti' 
    AND COLUMN_NAME = 'pouzit_hierarchii'
);

SET @exist_udalosti_profile := (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV' 
    AND TABLE_NAME = '25_plan_udalosti' 
    AND COLUMN_NAME = 'hierarchy_profile_id'
);

-- Odstranit sloupce z 25_plan_zpravy
SET @sql_zpravy_hierarchie := IF(
  @exist_zpravy_hierarchie > 0,
  'ALTER TABLE 25_plan_zpravy DROP COLUMN pouzit_hierarchii',
  'SELECT "Sloupec pouzit_hierarchii již neexistuje v 25_plan_zpravy"'
);
PREPARE stmt FROM @sql_zpravy_hierarchie;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_zpravy_profile := IF(
  @exist_zpravy_profile > 0,
  'ALTER TABLE 25_plan_zpravy DROP COLUMN hierarchy_profile_id',
  'SELECT "Sloupec hierarchy_profile_id již neexistuje v 25_plan_zpravy"'
);
PREPARE stmt FROM @sql_zpravy_profile;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Odstranit sloupce z 25_plan_udalosti
SET @sql_udalosti_hierarchie := IF(
  @exist_udalosti_hierarchie > 0,
  'ALTER TABLE 25_plan_udalosti DROP COLUMN pouzit_hierarchii',
  'SELECT "Sloupec pouzit_hierarchii již neexistuje v 25_plan_udalosti"'
);
PREPARE stmt FROM @sql_udalosti_hierarchie;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_udalosti_profile := IF(
  @exist_udalosti_profile > 0,
  'ALTER TABLE 25_plan_udalosti DROP COLUMN hierarchy_profile_id',
  'SELECT "Sloupec hierarchy_profile_id již neexistuje v 25_plan_udalosti"'
);
PREPARE stmt FROM @sql_udalosti_profile;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- KONEC MIGRACE
-- ============================================================================
