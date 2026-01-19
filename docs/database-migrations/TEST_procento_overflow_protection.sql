-- ========================================
-- TEST: Overflow protection v přepočtu čerpání smluv
-- ========================================
-- Datum: 2026-01-19
-- Účel: Ověření, že LEAST() funkce správně omezuje hodnoty procent
-- ========================================

USE `EEO-OSTRA-DEV`;

-- Test 1: Zobrazení struktury sloupců (měly by být DECIMAL(7,2))
SELECT 
    'Test 1: Struktura sloupců' as test_name,
    COLUMN_NAME,
    COLUMN_TYPE,
    NUMERIC_PRECISION,
    NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV'
  AND TABLE_NAME = '25_smlouvy'
  AND COLUMN_NAME LIKE 'procento%'
ORDER BY COLUMN_NAME;

-- Test 2: Kontrola hodnot procent (všechny by měly být <= 9999.99)
SELECT 
    'Test 2: Range check' as test_name,
    COUNT(*) as celkem_smluv,
    COUNT(CASE WHEN procento_skutecne > 9999.99 THEN 1 END) as prekrocilo_max,
    MAX(procento_skutecne) as max_procento_skutecne,
    MAX(procento_pozadovano) as max_procento_pozadovano,
    MAX(procento_planovano) as max_procento_planovano,
    MAX(procento_cerpani) as max_procento_cerpani
FROM 25_smlouvy
WHERE aktivni = 1;

-- Test 3: Smlouvy s nejvyšším čerpáním
SELECT 
    'Test 3: Top čerpání' as test_name,
    cislo_smlouvy,
    hodnota_s_dph,
    cerpano_skutecne,
    procento_skutecne,
    CASE 
        WHEN hodnota_s_dph = 0 THEN 'Neomezená (NULL)'
        WHEN procento_skutecne > 100 THEN 'Překročení!'
        WHEN procento_skutecne = 9999.99 THEN 'Omezeno LEAST()'
        ELSE 'Normální'
    END as status
FROM 25_smlouvy
WHERE cerpano_skutecne > 0
ORDER BY procento_skutecne DESC
LIMIT 10;

-- Test 4: Smlouvy s NULL hodnotou (neomezené)
SELECT 
    'Test 4: Neomezené smlouvy' as test_name,
    COUNT(*) as pocet_neomezenych,
    SUM(cerpano_skutecne) as celkem_cerpano
FROM 25_smlouvy
WHERE aktivni = 1
  AND hodnota_s_dph = 0
  AND procento_skutecne IS NULL;

-- Test 5: Simulace extrémního případu (pro demonstraci)
SELECT 
    'Test 5: Simulace LEAST()' as test_name,
    'Bez ošetření' as typ,
    (999999.99 / 100) * 100 as vypocet_bez_least
UNION ALL
SELECT 
    'Test 5: Simulace LEAST()' as test_name,
    'S ošetřením' as typ,
    LEAST((999999.99 / 100) * 100, 9999.99) as vypocet_s_least;

SELECT '✅ Všechny testy dokončeny' as status;
