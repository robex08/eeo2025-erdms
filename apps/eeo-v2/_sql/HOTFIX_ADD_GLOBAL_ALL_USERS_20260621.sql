-- ============================================================================
-- HOTFIX MIGRACE PROD: Přidání sloupce global_all_users
-- Tabulka: 25_moznosti_zastupovani
-- Datum: 2026-06-21
-- Důvod: Sloupec chyběl v PROD, existoval v DEV
-- Chyba: "SQLSTATE[42S22]: Column not found: 1054 Unknown column 'global_all_users' in 'WHERE'"
-- ============================================================================
-- APLIKOVÁNO NA PROD: 2026-06-21 22:00
-- ============================================================================

USE eeo2025;

-- Přidat sloupec global_all_users (pokud neexistuje)
ALTER TABLE `25_moznosti_zastupovani`
ADD COLUMN IF NOT EXISTS `global_all_users` TINYINT(1) NOT NULL DEFAULT 0
AFTER `zastupovany_id`;

-- Přidat index na global_all_users (pokud neexistuje)
ALTER TABLE `25_moznosti_zastupovani`
ADD INDEX IF NOT EXISTS `idx_global_all_users` (`global_all_users`);

-- Ověření struktury
DESCRIBE `25_moznosti_zastupovani`;

-- ============================================================================
-- VÝSLEDNÁ STRUKTURA:
-- ============================================================================
-- id                   int(10) unsigned      PRI  auto_increment
-- zastupovany_id       int(10) unsigned      MUL
-- global_all_users     tinyint(1)            MUL  DEFAULT 0       <-- PŘIDÁNO
-- typ_zastupce         enum(...)             MUL
-- zastupce_user_id     int(10) unsigned      MUL
-- zastupce_role_id     int(10) unsigned      MUL
-- zastupce_usek_id     int(11)               MUL
-- zastupce_lokalita_id int(10) unsigned      MUL
-- aktivni              tinyint(1)            MUL  DEFAULT 1
-- poznamka             varchar(500)
-- vytvoril_user_id     int(10) unsigned      MUL
-- dt_vytvoreni         datetime              current_timestamp()
-- dt_aktualizace       datetime              on update current_timestamp()
-- ============================================================================

SELECT 'Hotfix migration completed successfully!' as Status;
