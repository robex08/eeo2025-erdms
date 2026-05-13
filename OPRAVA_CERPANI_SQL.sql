-- ============================================================================
-- OPRAVNÉ SKRIPTY - Oprava chyb v čerpání LP a smluv
-- ============================================================================
-- Účel: Opravit identifikované problémy v datech
-- Datum: 13. května 2026
-- DŮLEŽITÉ: VŽDY ZÁLOHOVAT DATA PŘED SPUŠTĚNÍM!
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- ============================================================================
-- PŘÍPRAVA: Zálohování tabulek
-- ============================================================================

-- Záloha agregační tabulky LP
CREATE TABLE IF NOT EXISTS 25_limitovane_prisliby_cerpani_backup_20260513 AS
SELECT * FROM 25_limitovane_prisliby_cerpani;

-- Záloha tabulky smluv
CREATE TABLE IF NOT EXISTS 25_smlouvy_backup_20260513 AS
SELECT * FROM 25_smlouvy;

SELECT '✅ Zálohy vytvořeny!' as status;

-- ============================================================================
-- OPRAVA 1: Přepočítat všechny LP pro rok 2025
-- ============================================================================

-- Tato stored procedure už obsahuje opravenou logiku
CALL sp_prepocet_lp_cerpani_faktury(NULL);

SELECT '✅ LP přepočteny!' as status;

-- ============================================================================
-- OPRAVA 2: Přepočítat všechny smlouvy
-- ============================================================================

-- Tato stored procedure už obsahuje opravenou logiku proti dvojitému počítání
CALL sp_prepocet_cerpani_smluv(NULL, NULL);

SELECT '✅ Smlouvy přepočteny!' as status;

-- ============================================================================
-- OPRAVA 3: Vyčistit nekonzistentní data
-- ============================================================================

-- 3.1 Opravit smlouvy s negativními hodnotami (nulovat, pokud < 0)
UPDATE 25_smlouvy 
SET 
    cerpano_pozadovano = GREATEST(0, cerpano_pozadovano),
    cerpano_skutecne = GREATEST(0, cerpano_skutecne),
    cerpano_celkem = GREATEST(0, cerpano_celkem)
WHERE aktivni = 1
AND (cerpano_pozadovano < 0 OR cerpano_skutecne < 0 OR cerpano_celkem < 0);

-- 3.2 Opravit LP s negativními hodnotami
UPDATE 25_limitovane_prisliby_cerpani
SET 
    rezervovano = GREATEST(0, rezervovano),
    predpokladane_cerpani = GREATEST(0, predpokladane_cerpani),
    skutecne_cerpano = GREATEST(0, skutecne_cerpano),
    cerpano_pokladna = GREATEST(0, cerpano_pokladna)
WHERE rok = 2025
AND (rezervovano < 0 OR predpokladane_cerpani < 0 OR skutecne_cerpano < 0 OR cerpano_pokladna < 0);

SELECT '✅ Negativní hodnoty opraveny!' as status;

-- ============================================================================
-- OPRAVA 4: Synchronizovat cerpano_celkem ve smlouvách
-- ============================================================================

-- Ujistit se, že cerpano_celkem = cerpano_pozadovano + cerpano_skutecne
UPDATE 25_smlouvy
SET cerpano_celkem = COALESCE(cerpano_pozadovano, 0) + COALESCE(cerpano_skutecne, 0)
WHERE aktivni = 1
AND ABS(cerpano_celkem - (COALESCE(cerpano_pozadovano, 0) + COALESCE(cerpano_skutecne, 0))) > 0.01;

SELECT '✅ cerpano_celkem synchronizováno!' as status;

-- ============================================================================
-- OPRAVA 5: Aktualizovat zpětnou kompatibilitu (zbyva, procento_cerpani)
-- ============================================================================

-- Ve smlouvách: zajistit, že zpětně kompatibilní sloupce odpovídají skutečným
UPDATE 25_smlouvy
SET 
    zbyva = zbyva_skutecne,
    procento_cerpani = procento_skutecne
WHERE aktivni = 1;

SELECT '✅ Zpětná kompatibilita aktualizována!' as status;

-- ============================================================================
-- KONTROLA: Ověřit výsledky oprav
-- ============================================================================

-- Kontrola 1: LP bez záporných hodnot
SELECT 
    COUNT(*) as pocet_lp_se_zapornymi_hodnotami
FROM 25_limitovane_prisliby_cerpani
WHERE rok = 2025
AND (
    rezervovano < 0 
    OR predpokladane_cerpani < 0 
    OR skutecne_cerpano < 0 
    OR cerpano_pokladna < 0
);

-- Kontrola 2: Smlouvy bez záporných hodnot
SELECT 
    COUNT(*) as pocet_smluv_se_zapornymi_hodnotami
FROM 25_smlouvy
WHERE aktivni = 1
AND (
    cerpano_pozadovano < 0 
    OR cerpano_skutecne < 0 
    OR cerpano_celkem < 0
);

-- Kontrola 3: Smlouvy s nesynchronizovaným cerpano_celkem
SELECT 
    COUNT(*) as pocet_smluv_s_nesynchronizovanym_celkem
FROM 25_smlouvy
WHERE aktivni = 1
AND ABS(cerpano_celkem - (COALESCE(cerpano_pozadovano, 0) + COALESCE(cerpano_skutecne, 0))) > 0.01;

-- Kontrola 4: LP s překročeným limitem > 150%
SELECT 
    cislo_lp,
    celkovy_limit,
    skutecne_cerpano + cerpano_pokladna as celkove_skutecne,
    procento_skutecne
FROM 25_limitovane_prisliby_cerpani
WHERE rok = 2025
AND procento_skutecne > 150
ORDER BY procento_skutecne DESC;

-- Kontrola 5: Smlouvy s překročeným limitem > 150%
SELECT 
    cislo_smlouvy,
    nazev_smlouvy,
    hodnota_s_dph as limit,
    cerpano_celkem,
    procento_skutecne
FROM 25_smlouvy
WHERE aktivni = 1
AND hodnota_s_dph > 0
AND procento_skutecne > 150
ORDER BY procento_skutecne DESC;

-- ============================================================================
-- EXPORT: Statistiky před a po
-- ============================================================================

-- LP - Srovnání
SELECT 
    'PŘED OPRAVOU' as verze,
    SUM(lpc.celkovy_limit) as celkovy_limit,
    SUM(lpc.skutecne_cerpano + lpc.cerpano_pokladna) as celkove_skutecne,
    ROUND((SUM(lpc.skutecne_cerpano + lpc.cerpano_pokladna) / SUM(lpc.celkovy_limit)) * 100, 2) as prumerne_procento
FROM 25_limitovane_prisliby_cerpani_backup_20260513 lpc
WHERE lpc.rok = 2025

UNION ALL

SELECT 
    'PO OPRAVĚ' as verze,
    SUM(lpc.celkovy_limit) as celkovy_limit,
    SUM(lpc.skutecne_cerpano + lpc.cerpano_pokladna) as celkove_skutecne,
    ROUND((SUM(lpc.skutecne_cerpano + lpc.cerpano_pokladna) / SUM(lpc.celkovy_limit)) * 100, 2) as prumerne_procento
FROM 25_limitovane_prisliby_cerpani lpc
WHERE lpc.rok = 2025;

-- Smlouvy - Srovnání
SELECT 
    'PŘED OPRAVOU' as verze,
    SUM(hodnota_s_dph) as celkovy_limit,
    SUM(cerpano_celkem) as celkove_cerpano,
    ROUND(AVG(procento_skutecne), 2) as prumerne_procento
FROM 25_smlouvy_backup_20260513
WHERE aktivni = 1

UNION ALL

SELECT 
    'PO OPRAVĚ' as verze,
    SUM(hodnota_s_dph) as celkovy_limit,
    SUM(cerpano_celkem) as celkove_cerpano,
    ROUND(AVG(procento_skutecne), 2) as prumerne_procento
FROM 25_smlouvy
WHERE aktivni = 1;

-- ============================================================================
-- ROLLBACK (v případě potřeby)
-- ============================================================================

/*
-- Vrátit LP data z zálohy
TRUNCATE TABLE 25_limitovane_prisliby_cerpani;
INSERT INTO 25_limitovane_prisliby_cerpani 
SELECT * FROM 25_limitovane_prisliby_cerpani_backup_20260513;

-- Vrátit smlouvy z zálohy
UPDATE 25_smlouvy s
INNER JOIN 25_smlouvy_backup_20260513 b ON s.id = b.id
SET 
    s.cerpano_pozadovano = b.cerpano_pozadovano,
    s.cerpano_skutecne = b.cerpano_skutecne,
    s.cerpano_celkem = b.cerpano_celkem,
    s.zbyva_skutecne = b.zbyva_skutecne,
    s.procento_skutecne = b.procento_skutecne;

SELECT '↩️ ROLLBACK dokončen!' as status;
*/

-- ============================================================================
-- KONEC OPRAVNÝCH SKRIPTŮ
-- ============================================================================

SELECT '✅ Všechny opravy dokončeny!' as status;
