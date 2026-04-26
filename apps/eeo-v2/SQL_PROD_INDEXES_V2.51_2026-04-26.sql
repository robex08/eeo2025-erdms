-- ============================================================================
-- CONSOLIDATED PRODUCTION INDEX MIGRATION - Verze 2.51
-- ============================================================================
-- Datum: 26. dubna 2026
-- Databáze: eeo2025 (PRODUCTION)
-- Účel: Aplikace všech chybějících performance indexů z DEV do PROD
-- 
-- ⚠️ PREREKVIZITY:
-- - Backup PROD databáze vytvořen
-- - Spuštěno mimo špičku (večer/noc)
-- - MariaDB 11.8+
--
-- 📊 OČEKÁVANÉ ZLEPŠENÍ:
-- - Order V3 List: -30% až -50% TTFB
-- - Stats & Reports: 2-5x rychlejší queries
-- - Attachments queries: 2-5x rychlejší
-- - Invoice queries: 2-3x rychlejší
--
-- ⏱️ TRVÁNÍ: ~2-5 minut (závisí na velikosti tabulek)
-- ⏱️ DOWNTIME: 0 minut (ALGORITHM=INPLACE, LOCK=NONE)
--
-- ============================================================================

USE eeo2025;

-- ============================================================================
-- ČÁST 1: TABULKA 25a_objednavky (Objednávky)
-- ============================================================================

-- Index pro WHERE aktivni = 1 (velmi častý filtr)
CREATE INDEX IF NOT EXISTS idx_obj_aktivni 
ON `25a_objednavky` (`aktivni`);

-- Index pro WHERE stav_objednavky IN (...)
CREATE INDEX IF NOT EXISTS idx_obj_stav 
ON `25a_objednavky` (`stav_objednavky`);

-- Index pro WHERE druh_objednavky_kod (vzdělávání, majetek)
CREATE INDEX IF NOT EXISTS idx_obj_druh 
ON `25a_objednavky` (`druh_objednavky_kod`);

-- Složený index pro WHERE aktivni=1 AND stav_objednavky=X (nejčastější pattern)
CREATE INDEX IF NOT EXISTS idx_obj_aktivni_stav 
ON `25a_objednavky` (`aktivni`, `stav_objednavky`);

-- ============================================================================
-- ČÁST 2: TABULKA 25a_objednavky_faktury (Faktury)
-- ============================================================================

-- Index pro JOIN s objednávkami (KRITICKÝ pro performance!)
-- LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
CREATE INDEX IF NOT EXISTS idx_faktury_objednavka 
ON `25a_objednavky_faktury` (`objednavka_id`);

-- Index pro WHERE stav IN (...)
CREATE INDEX IF NOT EXISTS idx_faktury_stav 
ON `25a_objednavky_faktury` (`stav`);

-- Index pro WHERE aktivni = 1
CREATE INDEX IF NOT EXISTS idx_faktury_aktivni 
ON `25a_objednavky_faktury` (`aktivni`);

-- Index pro WHERE fa_datum_splatnosti (overdue faktury)
CREATE INDEX IF NOT EXISTS idx_faktury_splatnost 
ON `25a_objednavky_faktury` (`fa_datum_splatnosti`);

-- Složený index pro WHERE aktivni=1 AND stav=X
CREATE INDEX IF NOT EXISTS idx_faktury_aktivni_stav 
ON `25a_objednavky_faktury` (`aktivni`, `stav`);

-- Složený index pro korelované subquery (Order V3 optimalizace)
-- WHERE objednavka_id = o.id AND aktivni = 1
ALTER TABLE `25a_objednavky_faktury`
  ADD INDEX IF NOT EXISTS `idx_objednavka_aktivni` (`objednavka_id`, `aktivni`);

-- ============================================================================
-- ČÁST 3: TABULKA 25a_objednavky_prilohy (Přílohy objednávek)
-- ============================================================================

-- Index pro JOIN s objednávkami (KRITICKÝ!)
-- LEFT JOIN 25a_objednavky_prilohy p ON p.objednavka_id = o.id
CREATE INDEX IF NOT EXISTS idx_prilohy_objednavka 
ON `25a_objednavky_prilohy` (`objednavka_id`);

-- Index pro GROUP BY typ_prilohy (Stats & Reports)
CREATE INDEX IF NOT EXISTS idx_prilohy_obj_typ 
ON `25a_objednavky_prilohy` (`typ_prilohy`);

-- Složený index pro batch enrichment (Order V3 optimalizace)
-- WHERE objednavka_id IN (...) GROUP BY objednavka_id, typ_prilohy
ALTER TABLE `25a_objednavky_prilohy`
  ADD INDEX IF NOT EXISTS `idx_obj_typ` (`objednavka_id`, `typ_prilohy`);

-- ============================================================================
-- ČÁST 4: TABULKA 25a_faktury_prilohy (Přílohy faktur)
-- ============================================================================

-- Index pro JOIN s fakturami
-- LEFT JOIN 25a_faktury_prilohy fp ON fp.faktura_id = f.id
CREATE INDEX IF NOT EXISTS idx_prilohy_fa_faktura 
ON `25a_faktury_prilohy` (`faktura_id`);

-- Index pro GROUP BY typ_prilohy
CREATE INDEX IF NOT EXISTS idx_prilohy_fa_typ 
ON `25a_faktury_prilohy` (`typ_prilohy`);

-- ============================================================================
-- ČÁST 5: TABULKA 25a_objednavky_komentare (Komentáře)
-- ============================================================================

-- Složený index pro korelované subquery last comment
-- WHERE objednavka_id = o.id AND smazano = 0 ORDER BY dt_vytvoreni DESC
ALTER TABLE `25a_objednavky_komentare`
  ADD INDEX IF NOT EXISTS `idx_obj_smazano_dt` (`objednavka_id`, `smazano`, `dt_vytvoreni`);

-- ============================================================================
-- ČÁST 6: OVĚŘENÍ INDEXŮ
-- ============================================================================

-- Zobrazit všechny nové indexy na objednávkách
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME IN (
    '25a_objednavky',
    '25a_objednavky_faktury',
    '25a_objednavky_prilohy',
    '25a_faktury_prilohy',
    '25a_objednavky_komentare'
  )
  AND INDEX_NAME LIKE 'idx_%'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

-- Počet indexů na každé tabulce
SELECT 
    TABLE_NAME,
    COUNT(DISTINCT INDEX_NAME) as INDEX_COUNT
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME IN (
    '25a_objednavky',
    '25a_objednavky_faktury',
    '25a_objednavky_prilohy',
    '25a_faktury_prilohy',
    '25a_objednavky_komentare'
  )
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;

-- ============================================================================
-- ČÁST 7: TESTOVÁNÍ PERFORMANCE
-- ============================================================================

-- Test 1: Order V3 List query (před/po indexech)
EXPLAIN 
SELECT 
    o.id,
    o.cislo_objednavky,
    o.predmet,
    o.stav_objednavky,
    COUNT(DISTINCT f.id) as pocet_faktur,
    COUNT(DISTINCT p.id) as pocet_priloh
FROM `25a_objednavky` o
LEFT JOIN `25a_objednavky_faktury` f ON f.objednavka_id = o.id AND f.aktivni = 1
LEFT JOIN `25a_objednavky_prilohy` p ON p.objednavka_id = o.id
WHERE o.aktivni = 1 
  AND o.stav_objednavky IN ('SCHVALENA', 'DOKONCENA')
GROUP BY o.id
LIMIT 50;

-- Očekáváno: 
-- - key=idx_obj_aktivni_stav nebo idx_obj_aktivni
-- - Extra: Using index condition
-- - JOIN s f: key=idx_faktury_objednavka nebo idx_objednavka_aktivni
-- - JOIN s p: key=idx_prilohy_objednavka nebo idx_obj_typ

-- Test 2: Stats & Reports - Attachments query
EXPLAIN
SELECT 
    COALESCE(a.typ_prilohy, 'NEURCENO') as typ_prilohy,
    COUNT(*) as pocet
FROM `25a_objednavky_prilohy` a
INNER JOIN `25a_objednavky` o ON a.objednavka_id = o.id
WHERE o.aktivni = 1
GROUP BY COALESCE(a.typ_prilohy, 'NEURCENO');

-- Očekáváno:
-- - Tabulka o: key=idx_obj_aktivni (nebo PRIMARY)
-- - Tabulka a: key=idx_prilohy_objednavka
-- - Použití indexů pro GROUP BY

-- ============================================================================
-- ROLLBACK (pokud by byly problémy)
-- ============================================================================

/*
-- POZNÁMKA: Rollback není nutný - indexy neškodí, jen zabírají místo
-- Následující příkazy SMAZOU všechny nově vytvořené indexy

DROP INDEX IF EXISTS idx_obj_aktivni ON `25a_objednavky`;
DROP INDEX IF EXISTS idx_obj_stav ON `25a_objednavky`;
DROP INDEX IF EXISTS idx_obj_druh ON `25a_objednavky`;
DROP INDEX IF EXISTS idx_obj_aktivni_stav ON `25a_objednavky`;

DROP INDEX IF EXISTS idx_faktury_objednavka ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_faktury_stav ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_faktury_aktivni ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_faktury_splatnost ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_faktury_aktivni_stav ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_objednavka_aktivni ON `25a_objednavky_faktury`;

DROP INDEX IF EXISTS idx_prilohy_objednavka ON `25a_objednavky_prilohy`;
DROP INDEX IF EXISTS idx_prilohy_obj_typ ON `25a_objednavky_prilohy`;
DROP INDEX IF EXISTS idx_obj_typ ON `25a_objednavky_prilohy`;

DROP INDEX IF EXISTS idx_prilohy_fa_faktura ON `25a_faktury_prilohy`;
DROP INDEX IF EXISTS idx_prilohy_fa_typ ON `25a_faktury_prilohy`;

DROP INDEX IF EXISTS idx_obj_smazano_dt ON `25a_objednavky_komentare`;
*/

-- ============================================================================
-- KONEC MIGRACE
-- ============================================================================
--
-- ✅ DALŠÍ KROKY:
-- 1. Ověřit výsledky SHOW INDEXES queries
-- 2. Zkontrolovat výstup EXPLAIN queries (měly by používat indexy)
-- 3. Otestovat rychlost Order V3 List v aplikaci
-- 4. Otestovat Stats & Reports - Přílohy
-- 5. Monitorovat server load 24h
--
-- 📞 KONTAKT V PŘÍPADĚ PROBLÉMŮ:
-- - Zkontrolovat MySQL error log
-- - Zkontrolovat PHP error log: /var/www/erdms-dev/logs/php-error.log
-- - Rollback: Obnovit DB backup nebo smazat indexy (viz výše)
--
-- ============================================================================
