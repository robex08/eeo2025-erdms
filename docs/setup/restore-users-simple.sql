-- ============================================================================
-- ERDMS - Jednoduchý restore erdms_users z backupu
-- Smaže tabulku a obnoví ji včetně foreign keys
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tabulky erdms_users
DROP TABLE IF EXISTS erdms_users;

-- Vytvoření nové tabulky erdms_users
CREATE TABLE `erdms_users` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `entra_id` VARCHAR(255) NULL,
  `upn` VARCHAR(255) NULL,
  `auth_source` ENUM('entra','local','legacy') NOT NULL DEFAULT 'legacy',
  `titul_pred` VARCHAR(50) NULL COLLATE utf8mb4_czech_ci,
  `jmeno` VARCHAR(100) NULL COLLATE utf8mb4_czech_ci,
  `prijmeni` VARCHAR(100) NULL COLLATE utf8mb4_czech_ci,
  `titul_za` VARCHAR(50) NULL COLLATE utf8mb4_czech_ci,
  `email` VARCHAR(255) NULL,
  `telefon` VARCHAR(50) NULL,
  `pozice_id` INT(10) UNSIGNED NULL,
  `lokalita_id` INT(10) UNSIGNED NULL,
  `organizace_id` SMALLINT(6) UNSIGNED NOT NULL DEFAULT 1,
  `usek_id` INT(11) UNSIGNED NOT NULL,
  `role` ENUM('admin','manager','user','readonly') NOT NULL DEFAULT 'user',
  `password_hash` VARCHAR(255) NULL,
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1,
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `entra_id` (`entra_id`),
  UNIQUE KEY `upn` (`upn`),
  KEY `idx_email` (`email`),
  KEY `idx_pozice` (`pozice_id`),
  KEY `idx_lokalita` (`lokalita_id`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_aktivni` (`aktivni`)
  
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_czech_ci;

-- Vložení dat z backupu
INSERT INTO erdms_users (id, username, entra_id, upn, auth_source, titul_pred, jmeno, prijmeni, 
  titul_za, email, telefon, pozice_id, lokalita_id, organizace_id, usek_id, role, 
  password_hash, aktivni, dt_vytvoreni)
VALUES
  (1, 'admin', NULL, NULL, 'local', 'IT', 'RH', 'ADMIN', NULL, 
   'robert.holovsky@zachranka.cz', '731137100', 68, 1, 1, 4, 'admin', NULL, 1, '2025-09-27 12:15:06'),
  (2, 'system', NULL, NULL, 'local', '', 'system', 'global', '', 
   NULL, NULL, NULL, NULL, 1, 4, 'user', NULL, 0, '2025-10-04 11:27:30'),
  (100, 'u03924', NULL, NULL, 'local', NULL, 'Robert', 'Holovský', NULL,
   'robert.holovsky@zachranka.cz', '731137100', 68, 1, 1, 4, 'user', NULL, 1, '2025-10-18 21:09:41');

-- Přidání foreign keys (pokud cílové tabulky existují)
ALTER TABLE erdms_users 
  ADD CONSTRAINT fk_users_pozice 
  FOREIGN KEY (pozice_id) REFERENCES 25_pozice(id) ON DELETE SET NULL;

ALTER TABLE erdms_users 
  ADD CONSTRAINT fk_users_lokalita 
  FOREIGN KEY (lokalita_id) REFERENCES 25_lokality(id) ON DELETE SET NULL;

ALTER TABLE erdms_users 
  ADD CONSTRAINT fk_users_usek 
  FOREIGN KEY (usek_id) REFERENCES 25_useky(id) ON DELETE RESTRICT;

SET FOREIGN_KEY_CHECKS = 1;

-- Verifikace
SELECT '✅ Restore dokončen' AS status;
SELECT COUNT(*) AS pocet_uzivatelu FROM erdms_users;
SELECT * FROM erdms_users;

-- Zobrazení foreign keys
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'erdms_users'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
