-- ============================================================================
-- ERDMS - Tabulka erdms_users (PRODUCTION READY - bez interaktivních testů)
-- ============================================================================
-- 
-- POUŽITÍ: mysql -h HOST -u USER -pPASSWORD --skip-ssl DATABASE < tento_soubor.sql
-- 
-- Vytvoří kompletní tabulku erdms_users bez INSERT testů - safe pro automatizaci
-- ============================================================================

DROP TABLE IF EXISTS `erdms_users`;

CREATE TABLE `erdms_users` (
  -- Primární identifikátory
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Interní ID uživatele',
  `username` VARCHAR(50) NOT NULL COMMENT 'Formát: u{osobni_cislo_5cifer}',
  
  -- EntraID integrace
  `entra_id` VARCHAR(255) NULL COMMENT 'Object ID z Microsoft Entra ID',
  `upn` VARCHAR(255) NULL COMMENT 'User Principal Name z Entra',
  `entra_sync_at` TIMESTAMP NULL COMMENT 'Poslední synchronizace z EntraID',
  `auth_source` ENUM('entra','local','legacy') NOT NULL DEFAULT 'legacy',
  
  -- Osobní údaje
  `titul_pred` VARCHAR(50) NULL COLLATE utf8mb4_czech_ci,
  `jmeno` VARCHAR(100) NULL COLLATE utf8mb4_czech_ci,
  `prijmeni` VARCHAR(100) NULL COLLATE utf8mb4_czech_ci,
  `titul_za` VARCHAR(50) NULL COLLATE utf8mb4_czech_ci,
  `email` VARCHAR(255) NULL,
  `telefon` VARCHAR(50) NULL,
  
  -- Aplikační metadata
  `pozice_id` INT(10) UNSIGNED NULL,
  `lokalita_id` INT(10) UNSIGNED NULL,
  `organizace_id` SMALLINT(6) UNSIGNED NOT NULL DEFAULT 1,
  `usek_id` INT(11) UNSIGNED NOT NULL,
  
  -- Role a oprávnění
  `role` ENUM('admin','manager','user','readonly') NOT NULL DEFAULT 'user',
  `opravneni` JSON NULL,
  
  -- Stavy
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1,
  `password_hash` VARCHAR(255) NULL COMMENT 'DEPRECATED - pouze pro legacy',
  
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
