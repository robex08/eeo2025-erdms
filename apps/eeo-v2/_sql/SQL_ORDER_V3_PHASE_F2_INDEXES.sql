-- =============================================================================
-- ORDER V3 OPTIMIZATION - PHASE F2: DATABASE INDEXES
-- =============================================================================
-- Datum: 2026-04-21
-- Databáze: EEO-OSTRA-DEV (DEV) / eeo2025 (PROD)
-- Účel: Přidání 6 kritických indexů pro optimalizaci Order V3 endpointu
-- Očekávaný přínos: -30% až -50% TTFB (kombinovaně s F1: -60% až -80%)
--
-- PREREKVIZITY:
-- - Fáze F1 (batch processing) již nasazena v kódu
-- - Záloha databáze vytvořena
-- - MariaDB 11.8+
--
-- POZNÁMKA:
-- - ALGORITHM=INPLACE, LOCK=NONE umožňuje vytvoření indexu bez zamčení zápisu
-- - Na DEV (671 řádků) trvá každý index cca 0.1-0.5s
-- - Na PROD (větší data) může trvat několik sekund až desítky sekund
-- =============================================================================

USE `EEO-OSTRA-DEV`;

-- -----------------------------------------------------------------------------
-- 1. HLAVNÍ TABULKA: 25a_objednavky
-- -----------------------------------------------------------------------------

-- Index pro WHERE aktivni=1 + default ORDER BY dt_objednavky DESC
-- Pokrývá nejčastější dotaz v handle_order_v3_list
ALTER TABLE `25a_objednavky`
  ADD INDEX `idx_aktivni_dt_objednavky` (`aktivni`, `dt_objednavky`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- Index pro JOIN na dodavatele (LEFT JOIN 25_dodavatele ON dodavatel_id)
-- Používá se také ve filtru podle dodavatele
ALTER TABLE `25a_objednavky`
  ADD INDEX `idx_dodavatel_id` (`dodavatel_id`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- Index pro filtr podle dt_vytvoreni (používá se v period filtrech)
ALTER TABLE `25a_objednavky`
  ADD INDEX `idx_dt_vytvoreni` (`dt_vytvoreni`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- -----------------------------------------------------------------------------
-- 2. SOUVISEJÍCÍ TABULKY
-- -----------------------------------------------------------------------------

-- Index pro faktury - korelované subquery COUNT(*) a SUM(fa_castka)
-- WHERE objednavka_id = o.id AND aktivni = 1
ALTER TABLE `25a_objednavky_faktury`
  ADD INDEX `idx_objednavka_aktivni` (`objednavka_id`, `aktivni`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- Index pro komentáře - korelované subquery pro last_comment_author a last_comment_date
-- WHERE objednavka_id = o.id AND smazano = 0 ORDER BY dt_vytvoreni DESC
ALTER TABLE `25a_objednavky_komentare`
  ADD INDEX `idx_obj_smazano_dt` (`objednavka_id`, `smazano`, `dt_vytvoreni`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- Index pro přílohy - batch enrichment attachment status
-- WHERE objednavka_id IN (...) GROUP BY objednavka_id, typ_prilohy
ALTER TABLE `25a_objednavky_prilohy`
  ADD INDEX `idx_obj_typ` (`objednavka_id`, `typ_prilohy`),
  ALGORITHM=INPLACE, LOCK=NONE;

-- =============================================================================
-- KONEC SKRIPTU
-- =============================================================================
-- 
-- VERIFIKACE PO SPUŠTĚNÍ:
-- -------------------------
-- SHOW INDEX FROM `25a_objednavky` WHERE Key_name LIKE 'idx_%';
-- SHOW INDEX FROM `25a_objednavky_faktury` WHERE Key_name = 'idx_objednavka_aktivni';
-- SHOW INDEX FROM `25a_objednavky_komentare` WHERE Key_name = 'idx_obj_smazano_dt';
-- SHOW INDEX FROM `25a_objednavky_prilohy` WHERE Key_name = 'idx_obj_typ';
--
-- TESTOVÁNÍ EXPLAIN:
-- ------------------
-- EXPLAIN SELECT * FROM 25a_objednavky 
--   WHERE aktivni=1 ORDER BY dt_objednavky DESC LIMIT 50;
-- -- Očekáváno: key=idx_aktivni_dt_objednavky, rows=50, NO filesort
--
-- ROLLBACK (pokud by bylo potřeba):
-- ----------------------------------
-- DROP INDEX `idx_aktivni_dt_objednavky` ON `25a_objednavky`;
-- DROP INDEX `idx_dodavatel_id` ON `25a_objednavky`;
-- DROP INDEX `idx_dt_vytvoreni` ON `25a_objednavky`;
-- DROP INDEX `idx_objednavka_aktivni` ON `25a_objednavky_faktury`;
-- DROP INDEX `idx_obj_smazano_dt` ON `25a_objednavky_komentare`;
-- DROP INDEX `idx_obj_typ` ON `25a_objednavky_prilohy`;
-- =============================================================================
