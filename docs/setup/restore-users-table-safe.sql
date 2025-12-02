-- ============================================================================
-- ERDMS - Kompletní restore tabulky erdms_users
-- Včetně foreign keys, indexů a triggerů
-- BEZPEČNÁ VERZE s ochranou dat
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET AUTOCOMMIT = 0;
START TRANSACTION;

-- ============================================================================
-- 1. BACKUP EXISTUJÍCÍCH DAT
-- ============================================================================

-- Backup erdms_users
DROP TABLE IF EXISTS erdms_users_backup_20251202;
CREATE TABLE erdms_users_backup_20251202 AS SELECT * FROM erdms_users;

SELECT CONCAT('✅ Zálohováno ', COUNT(*), ' uživatelů') AS backup_status 
FROM erdms_users_backup_20251202;

-- ============================================================================
-- 2. DROP A RECREATE TABULKY
-- ============================================================================

DROP TABLE IF EXISTS erdms_users;

CREATE TABLE `erdms_users` (
  -- Primární identifikátory
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Interní ID uživatele',
  `username` VARCHAR(50) NOT NULL COMMENT 'Formát: u{osobni_cislo_5cifer}, např. u03924',
  
  -- EntraID integrace
  `entra_id` VARCHAR(255) NULL COMMENT 'Object ID z Microsoft Entra ID',
  `upn` VARCHAR(255) NULL COMMENT 'User Principal Name z Entra',
  `entra_sync_at` TIMESTAMP NULL COMMENT 'Poslední synchronizace dat z EntraID',
  `auth_source` ENUM('entra','local','legacy') NOT NULL DEFAULT 'legacy',
  
  -- Osobní údaje
  `titul_pred` VARCHAR(50) NULL COLLATE utf8mb4_czech_ci,
  `jmeno` VARCHAR(100) NULL COLLATE utf8mb4_czech_ci,
  `prijmeni` VARCHAR(100) NULL COLLATE utf8mb4_czech_ci,
  `titul_za` VARCHAR(50) NULL COLLATE utf8mb4_czech_ci,
  `email` VARCHAR(255) NULL,
  `telefon` VARCHAR(50) NULL,
  
  -- Aplikační metadata
  `pozice_id` INT(10) UNSIGNED NULL COMMENT 'FK → 25_pozice',
  `lokalita_id` INT(10) UNSIGNED NULL COMMENT 'FK → 25_lokality',
  `organizace_id` SMALLINT(6) UNSIGNED NOT NULL DEFAULT 1,
  `usek_id` INT(11) UNSIGNED NOT NULL COMMENT 'FK → 25_useky',
  
  -- Role a oprávnění
  `role` ENUM('admin','manager','user','readonly') NOT NULL DEFAULT 'user',
  `opravneni` JSON NULL COMMENT 'Detailní oprávnění',
  
  -- Stavy
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1,
  
  -- Legacy autentizace
  `password_hash` VARCHAR(255) NULL,
  
  -- Časová razítka
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `dt_posledni_aktivita` DATETIME NULL,
  
  -- Indexy
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `entra_id` (`entra_id`),
  UNIQUE KEY `upn` (`upn`),
  KEY `idx_email` (`email`),
  KEY `idx_pozice` (`pozice_id`),
  KEY `idx_lokalita` (`lokalita_id`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_auth_source` (`auth_source`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_role` (`role`),
  KEY `idx_dt_posledni_aktivita` (`dt_posledni_aktivita`)
  
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_czech_ci
  COMMENT='Uživatelé ERDMS - hybridní autentizace EntraID + DB';

SELECT '✅ Tabulka erdms_users vytvořena' AS status;

-- ============================================================================
-- 3. OBNOVENÍ DAT Z BACKUPU
-- ============================================================================

INSERT INTO erdms_users 
SELECT * FROM erdms_users_backup_20251202;

SELECT CONCAT('✅ Obnoveno ', COUNT(*), ' uživatelů') AS restore_status 
FROM erdms_users;

-- ============================================================================
-- 4. PŘIDÁNÍ FOREIGN KEYS (podmíněně)
-- ============================================================================

-- FK: pozice_id → 25_pozice
SET @fk_pozice = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '25_pozice');

SET @sql = IF(@fk_pozice > 0,
  'ALTER TABLE erdms_users ADD CONSTRAINT fk_users_pozice 
   FOREIGN KEY (pozice_id) REFERENCES 25_pozice(id) ON DELETE SET NULL',
  'SELECT "⚠️  Tabulka 25_pozice neexistuje, FK přeskočen" AS warning'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: lokalita_id → 25_lokality
SET @fk_lokality = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '25_lokality');

SET @sql = IF(@fk_lokality > 0,
  'ALTER TABLE erdms_users ADD CONSTRAINT fk_users_lokalita 
   FOREIGN KEY (lokalita_id) REFERENCES 25_lokality(id) ON DELETE SET NULL',
  'SELECT "⚠️  Tabulka 25_lokality neexistuje, FK přeskočen" AS warning'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: usek_id → 25_useky
SET @fk_useky = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '25_useky');

SET @sql = IF(@fk_useky > 0,
  'ALTER TABLE erdms_users ADD CONSTRAINT fk_users_usek 
   FOREIGN KEY (usek_id) REFERENCES 25_useky(id) ON DELETE RESTRICT',
  'SELECT "⚠️  Tabulka 25_useky neexistuje, FK přeskočen" AS warning'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 5. TRIGGER: Automatická aktualizace dt_posledni_aktivita
-- ============================================================================

DROP TRIGGER IF EXISTS trg_users_update_activity;

DELIMITER $$

CREATE TRIGGER trg_users_update_activity
BEFORE UPDATE ON erdms_users
FOR EACH ROW
BEGIN
  IF (NEW.jmeno <> OLD.jmeno 
      OR NEW.prijmeni <> OLD.prijmeni 
      OR NEW.email <> OLD.email
      OR NEW.role <> OLD.role
      OR NEW.aktivni <> OLD.aktivni) THEN
    SET NEW.dt_posledni_aktivita = NOW();
  END IF;
END$$

DELIMITER ;

SELECT '✅ Trigger vytvořen' AS status;

-- ============================================================================
-- 6. COMMIT A ZAPNUTÍ FK CHECKS
-- ============================================================================

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
SET AUTOCOMMIT = 1;

-- ============================================================================
-- 7. VERIFIKACE
-- ============================================================================

SELECT '═══════════════════════════════════════════════════════' AS separator;
SELECT '📊 STATISTIKY' AS title;
SELECT '═══════════════════════════════════════════════════════' AS separator;

SELECT 
  COUNT(*) AS celkem_uzivatelu,
  COUNT(DISTINCT username) AS unique_usernames,
  COUNT(entra_id) AS s_entra_id,
  SUM(aktivni) AS aktivni_uzivatele,
  COUNT(*) - SUM(aktivni) AS neaktivni_uzivatele
FROM erdms_users;

SELECT '═══════════════════════════════════════════════════════' AS separator;
SELECT '🔗 FOREIGN KEYS' AS title;
SELECT '═══════════════════════════════════════════════════════' AS separator;

SELECT 
  CONSTRAINT_NAME AS fk_nazev,
  COLUMN_NAME AS sloupec,
  REFERENCED_TABLE_NAME AS cilova_tabulka,
  REFERENCED_COLUMN_NAME AS cilovy_sloupec
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'erdms_users'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT '═══════════════════════════════════════════════════════' AS separator;
SELECT '📑 INDEXY' AS title;
SELECT '═══════════════════════════════════════════════════════' AS separator;

SELECT 
  INDEX_NAME,
  NON_UNIQUE,
  COLUMN_NAME,
  INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'erdms_users'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

SELECT '═══════════════════════════════════════════════════════' AS separator;
SELECT '✅ RESTORE DOKONČEN ÚSPĚŠNĚ!' AS status;
SELECT '═══════════════════════════════════════════════════════' AS separator;
