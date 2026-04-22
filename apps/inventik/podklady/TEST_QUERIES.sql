-- =============================================================================
-- INVENTIK - Testovací SQL dotazy
-- =============================================================================
-- Ukázkové dotazy pro práci s importovanými daty
-- =============================================================================

USE `inventik-dev`;

-- =============================================================================
-- ZÁKLADNÍ PŘEHLEDY
-- =============================================================================

-- Celkové počty
SELECT 'Budovy' as tabulka, COUNT(*) as pocet FROM budovy
UNION ALL
SELECT 'Inv.úseky', COUNT(*) FROM inventarni_useky
UNION ALL
SELECT 'Místnosti', COUNT(*) FROM mistnosti
UNION ALL
SELECT 'Majetek', COUNT(*) FROM majetek;

-- =============================================================================
-- MAJETEK - Základní dotazy
-- =============================================================================

-- Top 10 nejdražších položek
SELECT 
    cislo,
    nazev,
    cena_mj_num as cena,
    datum_zarazeni
FROM majetek
WHERE cena_mj_num IS NOT NULL
ORDER BY cena_mj_num DESC
LIMIT 10;

-- Majetek podle budov
SELECT 
    b.budovat as budova,
    COUNT(m.id) as pocet_polozek,
    SUM(m.cena_mj_num) as celkova_hodnota,
    AVG(m.cena_mj_num) as prumerna_cena
FROM budovy b
LEFT JOIN majetek m ON b.budt = m.budt
GROUP BY b.budt, b.budovat
ORDER BY pocet_polozek DESC
LIMIT 20;

-- Majetek podle inventárních úseků
SELECT 
    iu.nazinv as inv_usek,
    COUNT(m.id) as pocet_polozek,
    SUM(m.cena_mj_num) as celkova_hodnota
FROM inventarni_useky iu
LEFT JOIN majetek m ON iu.cinv = m.cinv
GROUP BY iu.cinv, iu.nazinv
ORDER BY pocet_polozek DESC
LIMIT 20;

-- =============================================================================
-- VYHLEDÁVÁNÍ
-- =============================================================================

-- Vyhledat majetek podle názvu
SELECT 
    cislo,
    nazev,
    cena_mj_num,
    b.budovat as budova
FROM majetek m
LEFT JOIN budovy b ON m.budt = b.budt
WHERE nazev LIKE '%počítač%' OR nazev LIKE '%notebook%'
LIMIT 20;

-- Majetek v konkrétní budově
SELECT 
    m.cislo,
    m.nazev,
    mi.mistt as mistnost,
    m.cena_mj_num
FROM majetek m
LEFT JOIN mistnosti mi ON m.budt = mi.budt AND m.mist = mi.mist
WHERE m.budt = '101'  -- Rakovník
LIMIT 20;

-- =============================================================================
-- STATISTIKY
-- =============================================================================

-- Roční přehled zařazení majetku
SELECT 
    YEAR(datum_zarazeni) as rok,
    COUNT(*) as pocet_polozek,
    SUM(cena_mj_num) as celkova_hodnota
FROM majetek
WHERE datum_zarazeni IS NOT NULL
GROUP BY YEAR(datum_zarazeni)
ORDER BY rok DESC;

-- Majetek podle účtů
SELECT 
    ucet,
    COUNT(*) as pocet,
    SUM(cena_mj_num) as hodnota
FROM majetek
GROUP BY ucet
ORDER BY pocet DESC;

-- =============================================================================
-- KOMPLETNÍ VIEW
-- =============================================================================

-- Použití připraveného view s kompletními informacemi
SELECT 
    inventarni_cislo,
    nazev,
    cena,
    datum_zarazeni,
    inventarni_usek,
    budova,
    mistnost
FROM v_majetek_prehled
WHERE cena > 10000
ORDER BY cena DESC
LIMIT 20;

-- =============================================================================
-- ANALÝZY
-- =============================================================================

-- Budovy bez majetku (pokud existují)
SELECT b.budovat
FROM budovy b
LEFT JOIN majetek m ON b.budt = m.budt
WHERE m.id IS NULL;

-- Místnosti s nejvíce majetkem
SELECT 
    mi.mistt as mistnost,
    b.budovat as budova,
    COUNT(m.id) as pocet_polozek
FROM mistnosti mi
LEFT JOIN majetek m ON mi.budt = m.budt AND mi.mist = m.mist
LEFT JOIN budovy b ON mi.budt = b.budt
WHERE m.id IS NOT NULL
GROUP BY mi.id, mi.mistt, b.budovat
ORDER BY pocet_polozek DESC
LIMIT 20;

-- Nejstarší a nejmladší majetek
(SELECT 'Nejstarší' as typ, cislo, nazev, datum_zarazeni
FROM majetek
WHERE datum_zarazeni IS NOT NULL
ORDER BY datum_zarazeni ASC
LIMIT 5)
UNION ALL
(SELECT 'Nejmladší', cislo, nazev, datum_zarazeni
FROM majetek
WHERE datum_zarazeni IS NOT NULL
ORDER BY datum_zarazeni DESC
LIMIT 5);

-- =============================================================================
-- EXPORT DO CSV (pomocí mysql client)
-- =============================================================================

/*
-- Export do CSV:
mysql -h 10.3.172.11 -u inventik -p'Inv3nt1k2026!' inventik-dev \
    -e "SELECT * FROM v_majetek_prehled" \
    > export_majetek.csv

-- Export konkrétní budovy:
mysql -h 10.3.172.11 -u inventik -p'Inv3nt1k2026!' inventik-dev \
    -e "SELECT * FROM v_majetek_prehled WHERE budova LIKE '%Kladno%'" \
    > export_kladno.csv
*/
