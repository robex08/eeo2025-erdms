-- ============================================================================
-- ERDMS - Kompletní restore tabulky erdms_users
-- Včetně foreign keys, indexů a triggerů
-- ============================================================================

-- Backup stávajících dat
CREATE TABLE IF NOT EXISTS erdms_users_backup_20251202 AS SELECT * FROM erdms_users;

-- Drop tabulky (včetně FK)
DROP TABLE IF EXISTS erdms_users;

-- Vytvoření tabulky erdms_users
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

-- Obnovení dat z backupu
INSERT INTO erdms_users 
SELECT * FROM erdms_users_backup_20251202;

-- ============================================================================
-- PŘIDÁNÍ FOREIGN KEYS
-- ============================================================================

-- FK: pozice_id → 25_pozice (pokud existuje)
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '25_pozice');

SET @sql = IF(@table_exists > 0,
  'ALTER TABLE erdms_users ADD CONSTRAINT fk_users_pozice 
   FOREIGN KEY (pozice_id) REFERENCES 25_pozice(id) ON DELETE SET NULL',
  'SELECT "Tabulka 25_pozice neexistuje, FK přeskočen" AS warning'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: lokalita_id → 25_lokality (pokud existuje)
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '25_lokality');

SET @sql = IF(@table_exists > 0,
  'ALTER TABLE erdms_users ADD CONSTRAINT fk_users_lokalita 
   FOREIGN KEY (lokalita_id) REFERENCES 25_lokality(id) ON DELETE SET NULL',
  'SELECT "Tabulka 25_lokality neexistuje, FK přeskočen" AS warning'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: usek_id → 25_useky (pokud existuje)
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = '25_useky');

SET @sql = IF(@table_exists > 0,
  'ALTER TABLE erdms_users ADD CONSTRAINT fk_users_usek 
   FOREIGN KEY (usek_id) REFERENCES 25_useky(id) ON DELETE RESTRICT',
  'SELECT "Tabulka 25_useky neexistuje, FK přeskočen" AS warning'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- TRIGGER: Automatická aktualizace dt_posledni_aktivita
-- ============================================================================

DELIMITER $$

CREATE TRIGGER trg_users_update_activity
BEFORE UPDATE ON erdms_users
FOR EACH ROW
BEGIN
  -- Aktualizuj dt_posledni_aktivita při každé změně (kromě samotného dt_*)
  IF (NEW.jmeno <> OLD.jmeno 
      OR NEW.prijmeni <> OLD.prijmeni 
      OR NEW.email <> OLD.email
      OR NEW.role <> OLD.role
      OR NEW.aktivni <> OLD.aktivni) THEN
    SET NEW.dt_posledni_aktivita = NOW();
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- VERIFIKACE
-- ============================================================================

SELECT 'erdms_users' AS table_name,
       COUNT(*) AS row_count,
       COUNT(DISTINCT username) AS unique_usernames,
       COUNT(entra_id) AS with_entra_id,
       SUM(aktivni) AS active_users
FROM erdms_users;

-- Zobrazení Foreign Keys
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'erdms_users'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Zobrazení indexů
SHOW INDEX FROM erdms_users;

SELECT '✅ Restore dokončen' AS status;
