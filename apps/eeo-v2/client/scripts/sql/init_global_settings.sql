-- ====================================================
-- GLOBÁLNÍ NASTAVENÍ SYSTÉMU EEO
-- Inicializace tabulky 25a_nastaveni_globalni
-- ====================================================

-- Vytvoření tabulky pokud neexistuje
CREATE TABLE IF NOT EXISTS `25a_nastaveni_globalni` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `klic` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Klíč nastavení',
  `hodnota` TEXT NOT NULL COMMENT 'Hodnota nastavení',
  `typ` ENUM('boolean', 'integer', 'string', 'json') DEFAULT 'string' COMMENT 'Typ hodnoty',
  `popis` TEXT COMMENT 'Popis nastavení',
  `kategorie` VARCHAR(50) DEFAULT 'general' COMMENT 'Kategorie: notifications, hierarchy, maintenance',
  `vytvoreno` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `aktualizovano` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_klic` (`klic`),
  KEY `idx_kategorie` (`kategorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Globální nastavení celého systému EEO';

-- Vložení výchozích hodnot (pouze pokud neexistují)
INSERT INTO `25a_nastaveni_globalni` (`klic`, `hodnota`, `typ`, `popis`, `kategorie`) VALUES
('notifications_enabled', '1', 'boolean', 'Hlavní vypínač notifikací - má vyšší prioritu než hierarchie a uživatelská nastavení', 'notifications'),
('notifications_bell_enabled', '1', 'boolean', 'Zvoneček (in-app notifikace) v horní liště aplikace', 'notifications'),
('notifications_email_enabled', '1', 'boolean', 'Zasílání e-mailových notifikací uživatelům', 'notifications'),
('hierarchy_enabled', '0', 'boolean', 'Zapnutí systému hierarchie workflow (neovlivňuje stávající role a práva)', 'hierarchy'),
('hierarchy_profile_id', 'NULL', 'integer', 'ID aktivního hierarchického profilu z tabulky 25_hierarchie_vztahy', 'hierarchy'),
('hierarchy_logic', 'OR', 'string', 'Logika oprávnění: OR (hierarchie NEBO práva) / AND (hierarchie A práva)', 'hierarchy'),
('maintenance_mode', '0', 'boolean', 'Režim údržby systému - přístup pouze pro SUPERADMIN', 'maintenance'),
('maintenance_message', 'Systém je momentálně v údržbě. Omlouváme se za komplikace.', 'string', 'Vlastní zpráva zobrazená uživatelům během údržby', 'maintenance')
ON DUPLICATE KEY UPDATE
  `popis` = VALUES(`popis`),
  `typ` = VALUES(`typ`),
  `kategorie` = VALUES(`kategorie`);

-- Trigger pro automatickou aktualizaci času
DROP TRIGGER IF EXISTS `trigger_25a_nastaveni_globalni_update`;

DELIMITER $$
CREATE TRIGGER `trigger_25a_nastaveni_globalni_update`
BEFORE UPDATE ON `25a_nastaveni_globalni`
FOR EACH ROW
BEGIN
    SET NEW.aktualizovano = NOW();
END$$
DELIMITER ;

-- ====================================================
-- UKÁZKOVÉ DOTAZY PRO TESTOVÁNÍ
-- ====================================================

-- Načtení všech nastavení
-- SELECT * FROM 25a_nastaveni_globalni ORDER BY kategorie, klic;

-- Načtení nastavení pro notifikace
-- SELECT klic, hodnota, popis FROM 25a_nastaveni_globalni WHERE kategorie = 'notifications';

-- Změna nastavení
-- UPDATE 25a_nastaveni_globalni SET hodnota = '0' WHERE klic = 'notifications_enabled';

-- Kontrola maintenance mode
-- SELECT hodnota FROM 25a_nastaveni_globalni WHERE klic = 'maintenance_mode';
