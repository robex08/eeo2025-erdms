-- ============================================================================
-- STATS & REPORTS PERFORMANCE OPTIMIZATION - DB INDEXES
-- Datum: 26. dubna 2026
-- Účel: Zrychlení Orders V3 List a Attachments queries
-- ============================================================================
-- 
-- ⚠️ POZNÁMKA: Spustit na DEV databázi EEO-OSTRA-DEV
--              Po otestování nasadit do PROD (eeo2025)
--
-- 🎯 OČEKÁVANÉ ZLEPŠENÍ: 2-5x rychlejší JOINy
--
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- ============================================================================
-- ČÁST 1: INDEXY PRO ORDERS V3 LIST
-- ============================================================================

-- Index na objednavka_id v tabulce faktur (JOIN optimalizace)
CREATE INDEX IF NOT EXISTS idx_faktury_objednavka 
ON `25a_objednavky_faktury` (objednavka_id);

-- Index na objednavka_id v tabulce příloh (JOIN optimalizace)
CREATE INDEX IF NOT EXISTS idx_prilohy_objednavka 
ON `25a_objednavky_prilohy` (objednavka_id);

-- Index na stav objednávky (WHERE filtry)
CREATE INDEX IF NOT EXISTS idx_obj_stav 
ON `25a_objednavky` (stav_objednavky);

-- Index na druh objednávky (WHERE filtry - vzdělávání, majetek)
CREATE INDEX IF NOT EXISTS idx_obj_druh 
ON `25a_objednavky` (druh_objednavky_kod);

-- Index na aktivní objednávky (WHERE o.aktivni = 1)
CREATE INDEX IF NOT EXISTS idx_obj_aktivni 
ON `25a_objednavky` (aktivni);

-- ============================================================================
-- ČÁST 2: INDEXY PRO FAKTURY
-- ============================================================================

-- Index na stav faktury (WHERE filtry)
CREATE INDEX IF NOT EXISTS idx_faktury_stav 
ON `25a_objednavky_faktury` (stav);

-- Index na aktivní faktury
CREATE INDEX IF NOT EXISTS idx_faktury_aktivni 
ON `25a_objednavky_faktury` (aktivni);

-- Index na datum splatnosti (overdue faktury)
CREATE INDEX IF NOT EXISTS idx_faktury_splatnost 
ON `25a_objednavky_faktury` (fa_datum_splatnosti);

-- ============================================================================
-- ČÁST 3: INDEXY PRO PŘÍLOHY
-- ============================================================================

-- Index na typ přílohy (GROUP BY typ_prilohy)
CREATE INDEX IF NOT EXISTS idx_prilohy_obj_typ 
ON `25a_objednavky_prilohy` (typ_prilohy);

-- Index na faktura_id v tabulce příloh faktur
CREATE INDEX IF NOT EXISTS idx_prilohy_fa_faktura 
ON `25a_faktury_prilohy` (faktura_id);

-- Index na typ přílohy faktur
CREATE INDEX IF NOT EXISTS idx_prilohy_fa_typ 
ON `25a_faktury_prilohy` (typ_prilohy);

-- ============================================================================
-- ČÁST 4: SLOŽENÉ INDEXY (compound indexes)
-- ============================================================================

-- Složený index pro aktivní objednávky + stav (velmi častý pattern)
CREATE INDEX IF NOT EXISTS idx_obj_aktivni_stav 
ON `25a_objednavky` (aktivni, stav_objednavky);

-- Složený index pro aktivní faktury + stav
CREATE INDEX IF NOT EXISTS idx_faktury_aktivni_stav 
ON `25a_objednavky_faktury` (aktivni, stav);

-- ============================================================================
-- ČÁST 5: OVĚŘENÍ INDEXŮ
-- ============================================================================

-- Zobrazit všechny indexy na objednávkách
SHOW INDEXES FROM `25a_objednavky`;

-- Zobrazit všechny indexy na fakturách
SHOW INDEXES FROM `25a_objednavky_faktury`;

-- Zobrazit všechny indexy na přílohách objednávek
SHOW INDEXES FROM `25a_objednavky_prilohy`;

-- Zobrazit všechny indexy na přílohách faktur
SHOW INDEXES FROM `25a_faktury_prilohy`;

-- ============================================================================
-- ČÁST 6: EXPLAIN ANALYZE - TESTOVÁNÍ
-- ============================================================================

-- Test query Orders V3 List (před/po indexech)
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

-- Test query Attachments Stats
EXPLAIN
SELECT 
    COALESCE(a.typ_prilohy, 'NEURCENO') as typ_prilohy,
    COUNT(*) as pocet
FROM `25a_objednavky_prilohy` a
INNER JOIN `25a_objednavky` o ON a.objednavka_id = o.id
WHERE o.aktivni = 1
GROUP BY COALESCE(a.typ_prilohy, 'NEURCENO');

-- ============================================================================
-- ROLLBACK (pokud by bylo potřeba)
-- ============================================================================

/*
-- Odstranění indexů (pouze pokud by byl problém!)
DROP INDEX IF EXISTS idx_faktury_objednavka ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_prilohy_objednavka ON `25a_objednavky_prilohy`;
DROP INDEX IF EXISTS idx_obj_stav ON `25a_objednavky`;
DROP INDEX IF EXISTS idx_obj_druh ON `25a_objednavky`;
DROP INDEX IF EXISTS idx_obj_aktivni ON `25a_objednavky`;
DROP INDEX IF EXISTS idx_faktury_stav ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_faktury_aktivni ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_faktury_splatnost ON `25a_objednavky_faktury`;
DROP INDEX IF EXISTS idx_prilohy_obj_typ ON `25a_objednavky_prilohy`;
DROP INDEX IF EXISTS idx_prilohy_fa_faktura ON `25a_faktury_prilohy`;
DROP INDEX IF EXISTS idx_prilohy_fa_typ ON `25a_faktury_prilohy`;
DROP INDEX IF EXISTS idx_obj_aktivni_stav ON `25a_objednavky`;
DROP INDEX IF EXISTS idx_faktury_aktivni_stav ON `25a_objednavky_faktury`;
*/

-- ============================================================================
-- POZNÁMKY K NASAZENÍ
-- ============================================================================
--
-- 1. DEV TEST:
--    mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' EEO-OSTRA-DEV < sql_indexes.sql
--
-- 2. OVĚŘENÍ:
--    - Zkontrolovat SHOW INDEXES výstupy
--    - Spustit EXPLAIN queries před/po
--    - Otestovat rychlost v aplikaci
--
-- 3. PRODUCTION DEPLOY (PO TESTU):
--    - Změnit USE na: USE `eeo2025`;
--    - Nasadit v době nízkého provozu
--    - Monitorovat server load
--
-- 4. OČEKÁVANÉ ČASY:
--    - Vytvoření indexů: ~30-60 sekund (záleží na velikosti tabulek)
--    - Bez downtime (MySQL vytváří indexy online)
--
-- ============================================================================
