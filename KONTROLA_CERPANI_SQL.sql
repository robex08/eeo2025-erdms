-- ============================================================================
-- SQL KONTROLNÍ SKRIPTY - Ověření správnosti čerpání
-- ============================================================================
-- Účel: Najít možné chyby v počítání čerpání LP a smluv
-- Datum: 13. května 2026
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- ============================================================================
-- ČÁST 1: KONTROLA LIMITOVANÝCH PŘÍSLIBŮ (LP)
-- ============================================================================

-- 1.1 Najít objednávky S fakturou, které by se NEMĚLY počítat do rezervace
-- (Rezervace = jen objednávky BEZ faktur a BEZ položek)
SELECT 
    o.id as objednavka_id,
    o.stav_objednavky,
    o.max_cena_s_dph,
    o.financovani,
    COUNT(DISTINCT f.id) as pocet_faktur,
    COUNT(DISTINCT pol.id) as pocet_polozek,
    GROUP_CONCAT(DISTINCT f.stav) as stavy_faktur
FROM 25a_objednavky o
LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id AND f.aktivni = 1
LEFT JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = o.id
WHERE o.aktivni = 1
AND o.stav_objednavky = 'Schválená'
AND o.financovani LIKE '%LP%'
AND YEAR(o.dt_vytvoreni) = 2025
GROUP BY o.id
HAVING pocet_faktur > 0 OR pocet_polozek > 0
ORDER BY o.id;

-- 1.2 Najít objednávky v PŘEDPOKLADU s POTVRZENOU věcnou správností
-- (Měly by být ve skutečném čerpání, ne v předpokladu!)
SELECT 
    o.id as objednavka_id,
    o.stav_objednavky,
    o.financovani,
    f.id as faktura_id,
    f.fa_castka,
    f.stav as faktura_stav,
    f.potvrdil_vecnou_spravnost_id,
    u.prijmeni,
    u.jmeno
FROM 25a_objednavky o
INNER JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id AND f.aktivni = 1
LEFT JOIN users u ON u.id = f.potvrdil_vecnou_spravnost_id
WHERE o.aktivni = 1
AND o.stav_objednavky NOT IN ('Ke schválení', 'Schválená', 'Nová', 'Zamítnutá', 'Zrušena')
AND o.financovani LIKE '%LP%'
AND f.potvrdil_vecnou_spravnost_id IS NOT NULL  -- UŽ má potvrzenou věcnou správnost
AND YEAR(o.dt_vytvoreni) = 2025
ORDER BY o.id;

-- 1.3 Kontrola LP čerpání - agregovaná data vs. raw data
SELECT 
    lpc.cislo_lp,
    lpc.rok,
    lpc.celkovy_limit,
    lpc.rezervovano,
    lpc.predpokladane_cerpani,
    lpc.skutecne_cerpano,
    lpc.cerpano_pokladna,
    lpc.zbyva_skutecne,
    lpc.procento_skutecne,
    -- Přepočet: celkové skutečné = faktury + pokladna
    (lpc.skutecne_cerpano + lpc.cerpano_pokladna) as celkove_skutecne_vypocet,
    -- Kontrola zůstatku
    (lpc.celkovy_limit - lpc.skutecne_cerpano - lpc.cerpano_pokladna) as zbyva_prepocet,
    -- Porovnání
    CASE 
        WHEN ABS(lpc.zbyva_skutecne - (lpc.celkovy_limit - lpc.skutecne_cerpano - lpc.cerpano_pokladna)) > 0.01 
        THEN '⚠️ NESHODUJE SE'
        ELSE '✅ OK'
    END as kontrola_zustatku
FROM 25_limitovane_prisliby_cerpani lpc
WHERE lpc.rok = 2025
ORDER BY lpc.cislo_lp;

-- 1.4 LP s překročeným limitem
SELECT 
    lpc.cislo_lp,
    lpc.celkovy_limit,
    lpc.skutecne_cerpano,
    lpc.cerpano_pokladna,
    (lpc.skutecne_cerpano + lpc.cerpano_pokladna) as celkove_skutecne,
    lpc.zbyva_skutecne,
    lpc.procento_skutecne,
    lpm.nazev_uctu,
    u.prijmeni,
    u.jmeno
FROM 25_limitovane_prisliby_cerpani lpc
INNER JOIN 25_limitovane_prisliby lpm ON lpm.cislo_lp = lpc.cislo_lp AND YEAR(lpm.platne_od) = lpc.rok
LEFT JOIN users u ON u.id = lpc.user_id
WHERE lpc.rok = 2025
AND lpc.zbyva_skutecne < 0
ORDER BY lpc.zbyva_skutecne ASC;

-- 1.5 Multi-LP objednávky bez LP rozpisu v fakturách
-- (Faktury by měly mít záznam v 25a_faktury_lp_cerpani pro správné rozdělení)
SELECT 
    f.id as faktura_id,
    f.fa_castka,
    o.id as objednavka_id,
    o.financovani,
    COUNT(flp.id) as pocet_lp_rozpisu
FROM 25a_objednavky_faktury f
INNER JOIN 25a_objednavky o ON f.objednavka_id = o.id
LEFT JOIN 25a_faktury_lp_cerpani flp ON flp.faktura_id = f.id
WHERE f.aktivni = 1
AND f.stav != 'STORNO'
AND o.financovani LIKE '%"typ":"LP"%'
AND o.financovani LIKE '%"lp_kody"%'
AND YEAR(o.dt_vytvoreni) = 2025
GROUP BY f.id
HAVING pocet_lp_rozpisu = 0
ORDER BY f.fa_castka DESC;

-- ============================================================================
-- ČÁST 2: KONTROLA SMLUV
-- ============================================================================

-- 2.1 Najít položky S fakturou, které by se NEMĚLY počítat do požadováno
-- (Požadováno = jen položky BEZ faktury)
SELECT 
    pol.id as polozka_id,
    pol.cena_s_dph as polozka_cena,
    o.id as objednavka_id,
    o.financovani,
    f.id as faktura_id,
    f.fa_castka,
    f.stav as faktura_stav,
    -- Extrakt čísla smlouvy z JSON
    SUBSTRING_INDEX(SUBSTRING_INDEX(o.financovani, '"cislo_smlouvy":"', -1), '"', 1) as cislo_smlouvy
FROM 25a_objednavky_polozky pol
INNER JOIN 25a_objednavky o ON pol.objednavka_id = o.id
INNER JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id AND f.aktivni = 1
WHERE o.aktivni = 1
AND o.financovani LIKE '%cislo_smlouvy%'
AND f.stav != 'STORNO'
AND YEAR(o.dt_vytvoreni) = 2025
ORDER BY o.id;

-- 2.2 Smlouvy s čerpáním > 100%
SELECT 
    s.id,
    s.cislo_smlouvy,
    s.nazev_smlouvy,
    s.hodnota_s_dph as limit_smlouvy,
    s.cerpano_pozadovano,
    s.cerpano_skutecne,
    s.cerpano_celkem,
    s.zbyva_skutecne,
    s.procento_skutecne,
    s.procento_pozadovano,
    s.pouzit_v_obj_formu,
    -- Kontrola výpočtu
    (s.cerpano_pozadovano + s.cerpano_skutecne) as cerpano_celkem_prepocet,
    CASE 
        WHEN ABS(s.cerpano_celkem - (s.cerpano_pozadovano + s.cerpano_skutecne)) > 0.01 
        THEN '⚠️ NESHODUJE SE'
        ELSE '✅ OK'
    END as kontrola_celkem
FROM 25_smlouvy s
WHERE s.aktivni = 1
AND s.procento_skutecne > 100
ORDER BY s.procento_skutecne DESC;

-- 2.3 Přepočet smlouvy - porovnání očekávaných hodnot
-- (Pro konkrétní smlouvu - nahradit XXX skutečným číslem)
SET @cislo_smlouvy = 'S-XXX/XXXXXXXX/2025';  -- ⚠️ Změnit!

SELECT 
    'KONTROLA SMLOUVY' as typ,
    @cislo_smlouvy as cislo_smlouvy;

-- Položky BEZ faktury (měly by se počítat do požadováno)
SELECT 
    'Položky BEZ faktury' as kategorie,
    COUNT(pol.id) as pocet,
    SUM(pol.cena_s_dph) as suma
FROM 25a_objednavky o
INNER JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = o.id
LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id AND f.aktivni = 1
WHERE REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', @cislo_smlouvy, '"%')
AND o.stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
AND f.id IS NULL;

-- Položky S fakturou (NEMĚLY by se počítat do požadováno!)
SELECT 
    'Položky S fakturou (ERROR!)' as kategorie,
    COUNT(pol.id) as pocet,
    SUM(pol.cena_s_dph) as suma
FROM 25a_objednavky o
INNER JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = o.id
INNER JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id AND f.aktivni = 1
WHERE REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', @cislo_smlouvy, '"%')
AND o.stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
AND f.stav != 'STORNO';

-- Faktury (měly by se počítat do skutečně)
SELECT 
    'Faktury' as kategorie,
    COUNT(f.id) as pocet,
    SUM(f.fa_castka) as suma
FROM 25a_objednavky_faktury f
LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
WHERE (
    (f.objednavka_id IS NOT NULL AND REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', @cislo_smlouvy, '"%'))
    OR (f.smlouva_id = (SELECT id FROM 25_smlouvy WHERE cislo_smlouvy = @cislo_smlouvy) AND f.objednavka_id IS NULL)
)
AND f.stav != 'STORNO';

-- Aktuální hodnoty ve smlouvě
SELECT 
    'Aktuální hodnoty' as kategorie,
    s.cerpano_pozadovano,
    s.cerpano_skutecne,
    s.cerpano_celkem,
    s.hodnota_s_dph as limit,
    s.zbyva_skutecne,
    s.procento_skutecne
FROM 25_smlouvy s
WHERE s.cislo_smlouvy = @cislo_smlouvy;

-- 2.4 Smlouvy s nereálnými hodnotami
SELECT 
    s.cislo_smlouvy,
    s.hodnota_s_dph as limit,
    s.cerpano_pozadovano,
    s.cerpano_skutecne,
    s.cerpano_celkem,
    s.zbyva_skutecne,
    CASE 
        WHEN s.cerpano_pozadovano < 0 THEN '⚠️ Požadováno < 0'
        WHEN s.cerpano_skutecne < 0 THEN '⚠️ Skutečně < 0'
        WHEN s.hodnota_s_dph > 0 AND s.cerpano_celkem > (s.hodnota_s_dph * 2) THEN '⚠️ Čerpání > 200%'
        WHEN s.hodnota_s_dph > 0 AND s.zbyva_skutecne < (s.hodnota_s_dph * -0.5) THEN '⚠️ Zbývá < -50%'
        ELSE '✅ OK'
    END as status
FROM 25_smlouvy s
WHERE s.aktivni = 1
AND (
    s.cerpano_pozadovano < 0
    OR s.cerpano_skutecne < 0
    OR (s.hodnota_s_dph > 0 AND s.cerpano_celkem > (s.hodnota_s_dph * 2))
    OR (s.hodnota_s_dph > 0 AND s.zbyva_skutecne < (s.hodnota_s_dph * -0.5))
)
ORDER BY s.procento_skutecne DESC;

-- ============================================================================
-- ČÁST 3: KONTROLA KONZISTENCE DAT
-- ============================================================================

-- 3.1 Objednávky bez financování (měly by mít!)
SELECT 
    o.id,
    o.stav_objednavky,
    o.max_cena_s_dph,
    o.financovani,
    o.dt_vytvoreni
FROM 25a_objednavky o
WHERE o.aktivni = 1
AND (o.financovani IS NULL OR o.financovani = '')
AND o.stav_objednavky NOT IN ('Nová', 'Rozpracovaná', 'Zamítnutá', 'Zrušena')
AND YEAR(o.dt_vytvoreni) = 2025
ORDER BY o.id;

-- 3.2 Faktury bez objednávky a bez smlouvy
SELECT 
    f.id,
    f.fa_castka,
    f.stav,
    f.objednavka_id,
    f.smlouva_id,
    f.potvrdil_vecnou_spravnost_id
FROM 25a_objednavky_faktury f
WHERE f.aktivni = 1
AND f.objednavka_id IS NULL
AND f.smlouva_id IS NULL
AND YEAR(f.dt_vytvoreni) = 2025
ORDER BY f.fa_castka DESC;

-- 3.3 Pokladní položky bez LP kódu (měly by mít!)
SELECT 
    pp.id,
    pp.castka_vydaj,
    pp.lp_kod,
    pp.popis,
    pk.nazev as pokladna,
    pk.rok
FROM 25a_pokladni_polozky pp
INNER JOIN 25a_pokladni_knihy pk ON pk.id = pp.pokladni_kniha_id
WHERE pp.smazano = 0
AND (pp.lp_kod IS NULL OR pp.lp_kod = '')
AND pk.rok = 2025
ORDER BY pp.castka_vydaj DESC;

-- ============================================================================
-- ČÁST 4: SOUHRN STATISTIK
-- ============================================================================

-- 4.1 LP - Celkový přehled
SELECT 
    COUNT(DISTINCT lpc.cislo_lp) as pocet_lp,
    SUM(lpc.celkovy_limit) as celkovy_limit,
    SUM(lpc.rezervovano) as celkove_rezervovano,
    SUM(lpc.predpokladane_cerpani) as celkove_predpokladane,
    SUM(lpc.skutecne_cerpano) as celkove_skutecne_faktury,
    SUM(lpc.cerpano_pokladna) as celkove_pokladna,
    SUM(lpc.skutecne_cerpano + lpc.cerpano_pokladna) as celkove_skutecne_total,
    SUM(lpc.zbyva_skutecne) as celkove_zbyva,
    ROUND((SUM(lpc.skutecne_cerpano + lpc.cerpano_pokladna) / SUM(lpc.celkovy_limit)) * 100, 2) as prumerne_procento
FROM 25_limitovane_prisliby_cerpani lpc
WHERE lpc.rok = 2025;

-- 4.2 Smlouvy - Celkový přehled
SELECT 
    COUNT(*) as pocet_smluv,
    SUM(CASE WHEN hodnota_s_dph > 0 THEN 1 ELSE 0 END) as smlouvy_se_stropem,
    SUM(CASE WHEN hodnota_s_dph = 0 THEN 1 ELSE 0 END) as smlouvy_bez_stropu,
    SUM(hodnota_s_dph) as celkovy_limit,
    SUM(cerpano_pozadovano) as celkove_pozadovano,
    SUM(cerpano_skutecne) as celkove_skutecne,
    SUM(cerpano_celkem) as celkove_cerpano,
    SUM(zbyva_skutecne) as celkove_zbyva,
    ROUND(AVG(procento_skutecne), 2) as prumerne_procento
FROM 25_smlouvy
WHERE aktivni = 1;

-- ============================================================================
-- KONEC KONTROLNÍCH SKRIPTŮ
-- ============================================================================

SELECT '✅ Kontrolní skripty dokončeny!' as status;
