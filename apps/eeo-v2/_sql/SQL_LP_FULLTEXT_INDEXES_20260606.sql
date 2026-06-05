-- ============================================================================
-- MIGRACE: LP FULLTEXT SEARCH - Přidání FULLTEXT indexů
-- Datum: 2026-06-06
-- Verze: v2.58
--
-- POPIS:
-- Přidává FULLTEXT indexy pro optimalizaci vyhledávání LP
-- - Fulltext index na číslo, název, úsek, příkazce
-- - Umožňuje rychlé vyhledávání textů přirozeným jazykem
-- - Optimalizace pro MATCH...AGAINST SQL queries
--
-- DATABÁZE: eeo2025 (PRODUKCE) nebo EEO-OSTRA-DEV (TEST)
-- ============================================================================

-- VYBRAT správnou databázi:
USE `eeo2025`;  -- PRODUKCE
-- USE `EEO-OSTRA-DEV`;  -- DEVELOPMENT

-- ============================================================================
-- 1. Ověření, zda FULLTEXT index již existuje
-- ============================================================================
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25_limitovane_prisliby'
  AND INDEX_NAME LIKE '%ft_%' OR INDEX_TYPE = 'FULLTEXT';

-- ============================================================================
-- 2. Přidání FULLTEXT indexu - pokud neexistuje
-- ============================================================================
ALTER TABLE `25_limitovane_prisliby`
  ADD FULLTEXT INDEX `ft_lp_cislo_nazev_search` 
    (`cislo_lp`, `nazev_lp`)
  COMMENT 'Fulltext index pro vyhledávání dle čísla a názvu LP';

-- ============================================================================
-- 3. Přidání FULLTEXT indexu pro úsek a příkazce - pokud neexistuje
-- ============================================================================
ALTER TABLE `25_limitovane_prisliby`
  ADD FULLTEXT INDEX `ft_lp_usek_prikazce_search`
    (`nazev_usek`, `nazev_prikazce`)
  COMMENT 'Fulltext index pro vyhledávání dle úseku a příkazce';

-- ============================================================================
-- 4. Kombinovaný FULLTEXT index - všechna pole
-- ============================================================================
-- Poznámka: MariaDB/MySQL dovoluje FULLTEXT na max 32 sloupců
ALTER TABLE `25_limitovane_prisliby`
  ADD FULLTEXT INDEX `ft_lp_full_search`
    (`cislo_lp`, `nazev_lp`, `nazev_usek`, `nazev_prikazce`)
  COMMENT 'Kombinovaný fulltext index pro globální LP vyhledávání';

-- ============================================================================
-- 5. Ověření vytvoření indexů
-- ============================================================================
SHOW INDEXES FROM `25_limitovane_prisliby` WHERE Index_type = 'FULLTEXT';

-- Detailní info o indexech:
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    INDEX_TYPE,
    STAT_NAME,
    STAT_VALUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25_limitovane_prisliby'
  AND (INDEX_NAME LIKE 'ft_%' OR INDEX_TYPE = 'FULLTEXT')
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================================================
-- 6. Test FULLTEXT vyhledávání - PŘÍKLAD
-- ============================================================================
-- Vyhledávání LP dle čísla:
SELECT 
    id,
    cislo_lp,
    nazev_lp,
    nazev_usek,
    nazev_prikazce,
    MATCH(cislo_lp, nazev_lp) AGAINST('2026' IN BOOLEAN MODE) AS relevance
FROM `25_limitovane_prisliby`
WHERE MATCH(cislo_lp, nazev_lp) AGAINST('2026' IN BOOLEAN MODE)
ORDER BY relevance DESC
LIMIT 10;

-- ============================================================================
-- 7. Test FULLTEXT vyhledávání - Příkazce
-- ============================================================================
SELECT 
    id,
    cislo_lp,
    nazev_prikazce,
    MATCH(nazev_usek, nazev_prikazce) AGAINST('hasiči' IN BOOLEAN MODE) AS relevance
FROM `25_limitovane_prisliby`
WHERE MATCH(nazev_usek, nazev_prikazce) AGAINST('hasiči' IN BOOLEAN MODE)
ORDER BY relevance DESC
LIMIT 10;

-- ============================================================================
-- 8. Statistika - počet LP dle stavu
-- ============================================================================
SELECT 
    'Statistika LP' as statistika,
    COUNT(*) as celkem_lp,
    SUM(CASE WHEN stav = 1 THEN 1 ELSE 0 END) as aktivni,
    SUM(CASE WHEN stav = 0 THEN 1 ELSE 0 END) as neaktivni,
    COUNT(DISTINCT nazev_usek) as pocet_useku,
    COUNT(DISTINCT nazev_prikazce) as pocet_prikazcu
FROM `25_limitovane_prisliby`;

-- ============================================================================
-- 9. Benchmark - FULLTEXT vs LIKE (pro porovnání výkonu)
-- ============================================================================

-- FULLTEXT query (měla by být rychlejší):
-- EXPLAIN SELECT * FROM 25_limitovane_prisliby
-- WHERE MATCH(cislo_lp, nazev_lp) AGAINST('2026' IN BOOLEAN MODE)
-- LIMIT 50;

-- LIKE query (pomaleší):
-- EXPLAIN SELECT * FROM 25_limitovane_prisliby
-- WHERE cislo_lp LIKE '%2026%' OR nazev_lp LIKE '%2026%'
-- LIMIT 50;

-- ============================================================================
-- POZNÁMKA PRO PRODUKCI:
-- - FULLTEXT indexy se aktualizují automaticky
-- - Výkon se zvýší zejména pro velké tabulky (>10k řádků)
-- - REPAIR TABLE se obvykle nepotřebuje (MariaDB 10.3+)
-- - Index paměť: ~2-5% velikosti tabulky dat
-- ============================================================================
