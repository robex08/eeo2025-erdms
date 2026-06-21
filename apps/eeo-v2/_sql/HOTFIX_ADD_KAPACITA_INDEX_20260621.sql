-- ============================================================================
-- MIGRACE PROD: Přidání indexu na sloupec kapacita
-- Tabulka: 25_plan_udalosti_terminy
-- Datum: 2026-06-21
-- Aplikováno: 2026-06-21 19:40
-- Důvod: Index existoval v DEV, chyběl v PROD (zjištěno post-deployment validací)
-- ============================================================================

USE eeo2025;

-- Přidat index na kapacita
ALTER TABLE `25_plan_udalosti_terminy`
ADD INDEX `idx_kapacita` (`kapacita`);

-- Ověření
SHOW INDEX FROM `25_plan_udalosti_terminy` WHERE Column_name = 'kapacita';

SELECT 'Index na kapacita úspěšně přidán!' as Status;

-- ============================================================================
-- POZNÁMKY:
-- - Index zlepší výkon dotazů filtrujících podle kapacity termínů
-- - Změna zjištěna komplexní validací 117 tabulek mezi DEV a PROD
-- - Po aplikaci: PROD a DEV mají identickou strukturu (117/117 ✓)
-- ============================================================================
