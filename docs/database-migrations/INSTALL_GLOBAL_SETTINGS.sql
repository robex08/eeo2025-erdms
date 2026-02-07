-- ====================================================
-- GLOBÁLNÍ NASTAVENÍ SYSTÉMU EEO
-- Inicializace tabulky 25a_nastaveni_globalni
-- 
-- DŮLEŽITÉ: Spusťte tento SQL skript na REMOTE databázi:
-- Databáze: eeo2025
-- Server: 10.3.172.11
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
INSERT IGNORE INTO `25a_nastaveni_globalni` (`klic`, `hodnota`, `typ`, `popis`, `kategorie`) VALUES
('notifications_enabled', '1', 'boolean', 'Hlavní vypínač pro celý notifikační systém', 'notifications'),
('notifications_bell_enabled', '1', 'boolean', 'Zobrazování notifikací ve zvoničku aplikace', 'notifications'),
('notifications_email_enabled', '1', 'boolean', 'Zasílání notifikací na e-mailové adresy', 'notifications'),
('hierarchy_enabled', '0', 'boolean', 'Zapnutí/vypnutí hierarchie workflow', 'hierarchy'),
('hierarchy_profile_id', 'NULL', 'integer', 'ID aktivního hierarchického profilu', 'hierarchy'),
('hierarchy_logic', 'OR', 'string', 'Logika vyhodnocení hierarchie (OR/AND)', 'hierarchy'),
('maintenance_mode', '0', 'boolean', 'Režim údržby - přístup pouze pro SUPERADMIN', 'maintenance'),
('maintenance_message', 'Systém je momentálně v údržbě. Omlouváme se za komplikace.', 'string', 'Vlastní zpráva zobrazená uživatelům během údržby', 'maintenance');

-- Vytvoření triggeru pro automatickou aktualizaci časové značky
DROP TRIGGER IF EXISTS `trigger_25a_nastaveni_globalni_update`;
CREATE TRIGGER `trigger_25a_nastaveni_globalni_update`
BEFORE UPDATE ON `25a_nastaveni_globalni`
FOR EACH ROW
SET NEW.aktualizovano = NOW();

-- Výpis aktuálního stavu
SELECT 'Tabulka 25a_nastaveni_globalni byla úspěšně vytvořena/aktualizována' AS Status;
SELECT * FROM `25a_nastaveni_globalni` ORDER BY `kategorie`, `klic`;
