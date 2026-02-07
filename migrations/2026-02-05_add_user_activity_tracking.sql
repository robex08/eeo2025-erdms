-- =============================================================================
-- MIGRACE: Sledování uživatelské aktivity
-- =============================================================================
-- Datum: 2026-02-05
-- Účel: Přidání sledování IP adresy a aktuálního modulu pro uživatele
-- 
-- ZMĚNY:
-- 1. ALTER TABLE 25_uzivatele - přidání JSON sloupce aktivita_metadata
-- 2. CREATE TABLE 25_uzivatele_aktivita_log - historie aktivity (retention 90 dní)
-- 3. CREATE PROCEDURE sp_clean_activity_log - čištění starých záznamů
-- 4. CREATE EVENT evt_clean_activity_log - automatické čištění každý den
--
-- GDPR: Data se automaticky mažou po 90 dnech
-- =============================================================================

-- Použít DEV databázi
USE `EEO-OSTRA-DEV`;

-- =============================================================================
-- KROK 1: Přidat JSON sloupec do tabulky uživatelů
-- =============================================================================

-- Kontrola existence sloupce
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = '25_uzivatele' 
  AND COLUMN_NAME = 'aktivita_metadata';

-- Přidat sloupec pouze pokud neexistuje
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `25_uzivatele` 
     ADD COLUMN `aktivita_metadata` TEXT NULL 
     COMMENT ''JSON: {last_ip, last_module, last_path, last_user_agent, session_id}'' 
     AFTER `dt_posledni_aktivita`',
    'SELECT ''Column aktivita_metadata already exists'' AS ''Info''');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- KROK 2: Vytvořit tabulku pro log historie aktivity
-- =============================================================================

CREATE TABLE IF NOT EXISTS `25_uzivatele_aktivita_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uzivatel_id` INT UNSIGNED NOT NULL COMMENT 'FK na 25_uzivatele.id',
  `ip_address` VARCHAR(45) NULL COMMENT 'IPv4 nebo IPv6 adresa',
  `module_name` VARCHAR(100) NULL COMMENT 'Název modulu (Objednávky, Faktury...)',
  `module_path` VARCHAR(255) NULL COMMENT 'URL path (/orders25-list, /invoices25-list...)',
  `user_agent` VARCHAR(255) NULL COMMENT 'Browser user agent string',
  `session_id` VARCHAR(255) NULL COMMENT 'ID session z erdms_sessions (cross-DB reference)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Čas zaznamenání aktivity',
  
  PRIMARY KEY (`id`),
  INDEX `idx_uzivatel_id` (`uzivatel_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_session_id` (`session_id`),
  
  -- FK na 25_uzivatele s CASCADE delete
  CONSTRAINT `fk_aktivita_log_uzivatel` 
    FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Log uživatelské aktivity - automatické čištění po 90 dnech (GDPR)';

-- =============================================================================
-- KROK 3: Stored procedure pro čištění starých záznamů
-- =============================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_clean_activity_log`//

CREATE PROCEDURE `sp_clean_activity_log`()
BEGIN
  DECLARE deleted_count INT DEFAULT 0;
  
  -- Smazat záznamy starší než 90 dní
  DELETE FROM `25_uzivatele_aktivita_log` 
  WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 90 DAY);
  
  -- Získat počet smazaných řádků
  SET deleted_count = ROW_COUNT();
  
  -- Log do MySQL general log (pokud je zapnutý)
  IF deleted_count > 0 THEN
    SELECT CONCAT('Activity log cleanup: ', deleted_count, ' records deleted') AS result;
  ELSE
    SELECT 'Activity log cleanup: No records to delete' AS result;
  END IF;
  
END//

DELIMITER ;

-- =============================================================================
-- KROK 4: Event pro automatické čištění každý den ve 2:00
-- =============================================================================

-- POZNÁMKA: Event scheduler musí být zapnutý (vyžaduje SUPER privilégia)
-- Pokud není zapnutý, spusť: SET GLOBAL event_scheduler = ON; (jako root)
-- Nebo nastav v my.cnf: event_scheduler = ON

-- Vytvořit event
DROP EVENT IF EXISTS `evt_clean_activity_log`;

CREATE EVENT `evt_clean_activity_log`
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 2 HOUR)
ON COMPLETION PRESERVE
ENABLE
COMMENT 'Automatické čištění activity logu starších 90 dní (GDPR compliance)'
DO
  CALL sp_clean_activity_log();

-- =============================================================================
-- KROK 5: Testovací INSERT (pro ověření funkčnosti)
-- =============================================================================

-- Vložit testovací záznam pro uživatele ID=1 (pokud existuje)
INSERT INTO `25_uzivatele_aktivita_log` 
  (`uzivatel_id`, `ip_address`, `module_name`, `module_path`, `user_agent`, `session_id`) 
SELECT 
  1,
  '10.3.172.45',
  'Test modul',
  '/test-path',
  'Mozilla/5.0 (Test)',
  'test-session-id'
WHERE EXISTS (SELECT 1 FROM `25_uzivatele` WHERE `id` = 1)
LIMIT 1;

-- =============================================================================
-- KROK 6: Aktualizovat testovací metadata pro uživatele ID=1
-- =============================================================================

UPDATE `25_uzivatele` 
SET `aktivita_metadata` = JSON_OBJECT(
  'last_ip', '10.3.172.45',
  'last_module', 'Test modul',
  'last_path', '/test-path',
  'last_user_agent', 'Mozilla/5.0 (Test)',
  'session_id', 'test-session-id',
  'updated_at', NOW()
)
WHERE `id` = 1;

-- =============================================================================
-- KROK 7: Kontrola výsledků
-- =============================================================================

-- Zobrazit strukturu tabulky
SHOW CREATE TABLE `25_uzivatele_aktivita_log`;

-- Zobrazit sloupce
DESCRIBE `25_uzivatele`;

-- Zobrazit testovací data
SELECT 
  u.id,
  u.username,
  u.dt_posledni_aktivita,
  u.aktivita_metadata
FROM `25_uzivatele` u
WHERE u.id = 1;

-- Zobrazit log záznamy
SELECT * FROM `25_uzivatele_aktivita_log` ORDER BY created_at DESC LIMIT 5;

-- Zobrazit existující eventy
SHOW EVENTS LIKE 'evt_clean_activity_log';

-- =============================================================================
-- HOTOVO!
-- =============================================================================
-- 
-- Další kroky:
-- 1. Ověřit, že sloupec aktivita_metadata byl přidán
-- 2. Ověřit, že tabulka 25_uzivatele_aktivita_log existuje
-- 3. Ověřit, že stored procedure sp_clean_activity_log funguje
-- 4. Ověřit, že event evt_clean_activity_log je aktivní
-- 5. Implementovat PHP backend
-- 6. Implementovat React frontend
--
-- GDPR compliance:
-- - Data se automaticky mažou po 90 dnech
-- - Při smazání uživatele se mažou i jeho log záznamy (CASCADE)
-- - Přístup k datům pouze pro adminy (implementovat v PHP)
--
-- =============================================================================
