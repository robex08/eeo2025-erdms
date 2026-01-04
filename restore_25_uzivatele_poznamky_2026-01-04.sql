-- ============================================================================
-- OBNOVENÍ TABULKY 25_uzivatele_poznamky v DEV databázi
-- ============================================================================
-- Datum: 2026-01-04
-- Důvod: Tabulka chyběla v eeo2025-dev, způsobovala 500 errory v TODO/NOTES
-- Zdroj: Produkční databáze eeo2025
-- ============================================================================

-- Tabulka pro TODO seznamy a poznámky uživatelů
CREATE TABLE IF NOT EXISTS `25_uzivatele_poznamky` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'ID uživatele z tabulky 25_uzivatele',
  `typ` enum('TODO','NOTES') NOT NULL COMMENT 'Typ záznamu - TODO nebo NOTES',
  `obsah` text DEFAULT NULL COMMENT 'JSON struktura s obsahem',
  `dt_vytvoreni` datetime NOT NULL COMMENT 'Datum a čas vytvoření',
  `dt_aktualizace` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Datum a čas poslední aktualizace',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_typ` (`user_id`,`typ`) COMMENT 'Jeden záznam každého typu na uživatele',
  KEY `idx_user_id` (`user_id`),
  KEY `idx_typ` (`typ`),
  KEY `idx_dt_aktualizace` (`dt_aktualizace`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci 
COMMENT='Uživatelské TODO seznamy a poznámky - jeden záznam každého typu na uživatele';

-- ============================================================================
-- POZNÁMKY:
-- ============================================================================
-- 1. Tabulka byla obnovena z produkce pomocí:
--    mysqldump -h 10.3.172.11 -u erdms_user eeo2025 25_uzivatele_poznamky | mysql eeo2025-dev
--
-- 2. Příčina ztráty neznámá - možné scénáře:
--    - DROP TABLE při testování
--    - Restore ze starého backupu
--    - Manuální úprava databáze
--
-- 3. Endpoint používající tuto tabulku:
--    POST /todonotes/load
--    POST /todonotes/save
--    POST /todonotes/delete
--    POST /todonotes/by-id
--    POST /todonotes/search
--    POST /todonotes/with-details
--    POST /todonotes/recent
--    POST /todonotes/stats
--
-- 4. Konstanta v api.php:
--    define('TBL_UZIVATELE_POZNAMKY', '25_uzivatele_poznamky');
--
-- ============================================================================
