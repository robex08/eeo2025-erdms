-- ============================================================================
-- SQL DOTAZY PRO DETAILNÍ ROZPIS LP ČERPÁNÍ (LPIT1)
-- Bez použití agregační tabulky 25_limitovane_prisliby_cerpani
-- ============================================================================

-- 1️⃣ SEZNAM VŠECH OBJEDNÁVEK PRO LPIT1 (včetně všech LP kódů)
-- ============================================================================
SELECT 
    obj.id as objednavka_id,
    obj.cislo_objednavky,
    obj.status_objednavky_id,
    obj.celkova_cena_bez_dph,
    obj.celkova_cena_s_dph,
    
    -- Detail LP na této objednávce
    GROUP_CONCAT(DISTINCT lpc.cislo_lp ORDER BY lpc.cislo_lp SEPARATOR ', ') as vse_lp_kody,
    COUNT(DISTINCT lpc.cislo_lp) as pocet_lp_na_objednavce,
    
    -- Suma faktur pro tuto objednávku
    COALESCE(SUM(DISTINCT fakt.castka_celkem), 0) as suma_faktur,
    COALESCE(SUM(DISTINCT fakt.castka_uhrazeno), 0) as suma_uhrazeno,
    
    -- Vypočítaný podíl pro LPIT1 (při více LP se dělí rovnoměrně)
    ROUND(obj.celkova_cena_s_dph / COUNT(DISTINCT lpc.cislo_lp), 2) as podil_na_lpit1,
    
    -- Rezervace (status 4 = rezervováno)
    CASE 
        WHEN obj.status_objednavky_id = 4 THEN ROUND(obj.celkova_cena_s_dph / COUNT(DISTINCT lpc.cislo_lp), 2)
        ELSE 0 
    END as rezervace_podil,
    
    -- Předpoklad (faktury / počet LP)
    ROUND(COALESCE(SUM(DISTINCT fakt.castka_celkem), 0) / COUNT(DISTINCT lpc.cislo_lp), 2) as predpoklad_podil,
    
    -- Skutečně uhrazeno
    ROUND(COALESCE(SUM(DISTINCT fakt.castka_uhrazeno), 0) / COUNT(DISTINCT lpc.cislo_lp), 2) as skutecne_podil

FROM 25a_objednavky obj
INNER JOIN 25_limitovane_prisliby_cerpani lpc ON obj.id = lpc.objednavka_id
LEFT JOIN 25a_objednavky_faktury fakt ON obj.id = fakt.objednavka_id AND fakt.stav != 'stornovana'

WHERE 
    lpc.cislo_lp = 'LPIT1'
    AND obj.status_objednavky_id IN (4, 5, 6, 7, 8, 9, 10, 11, 12)
    AND obj.rok = 2025

GROUP BY obj.id, obj.cislo_objednavky, obj.status_objednavky_id, obj.celkova_cena_bez_dph, obj.celkova_cena_s_dph

ORDER BY obj.cislo_objednavky;


-- 2️⃣ AGREGACE PRO DVA SLOUPCE (jako na obrázku)
-- ============================================================================
-- VYČERPÁNO (SKUTEČNĚ) - sloupec 1
--   → Požadováno: SUM(rezervace_podil) kde status = 4
--   → Plánováno: SUM(predpoklad_podil) = suma faktur / počet LP
--   → Z pokladny: SUM(skutecne_podil) kde je označeno z pokladny

SELECT 
    'LPIT1' as cislo_lp,
    
    -- Sloupec 1: VYČERPÁNO (SKUTEČNĚ)
    ROUND(SUM(CASE WHEN obj.status_objednavky_id = 4 
        THEN obj.celkova_cena_s_dph / COUNT(DISTINCT lpc.cislo_lp) 
        ELSE 0 END), 2) as pozadovano,
    
    ROUND(SUM(
        COALESCE(fakt.castka_celkem, 0) / COUNT(DISTINCT lpc.cislo_lp)
    ), 2) as planovano,
    
    0 as z_pokladny,
    
    -- Sloupec 2: ZBÝVÁ (SKUTEČNÉ)
    -- (Limit - součet výše)
    (1500000 - ROUND(SUM(
        COALESCE(fakt.castka_celkem, 0) / COUNT(DISTINCT lpc.cislo_lp)
    ), 2)) as zbyva_planovano
    
FROM 25a_objednavky obj
INNER JOIN 25_limitovane_prisliby_cerpani lpc ON obj.id = lpc.objednavka_id
LEFT JOIN (
    SELECT objednavka_id, SUM(castka_celkem) as castka_celkem
    FROM 25a_objednavky_faktury
    WHERE stav != 'stornovana'
    GROUP BY objednavka_id
) fakt ON obj.id = fakt.objednavka_id

WHERE 
    lpc.cislo_lp = 'LPIT1'
    AND obj.status_objednavky_id IN (4, 5, 6, 7, 8, 9, 10, 11, 12)
    AND obj.rok = 2025;


-- 3️⃣ DETAILNÍ ROZPIS S ČÍSLY OBJEDNÁVEK
-- ============================================================================
-- Pro tooltip - seznam objednávek s částkami

SELECT 
    obj.cislo_objednavky,
    COUNT(DISTINCT lpc.cislo_lp) as pocet_lp,
    obj.celkova_cena_s_dph as cena_celkem,
    
    -- Podíl pro LPIT1 (děleno počtem LP)
    ROUND(obj.celkova_cena_s_dph / COUNT(DISTINCT lpc.cislo_lp), 2) as podil_lpit1,
    
    -- Rezervace (jen status 4)
    CASE 
        WHEN obj.status_objednavky_id = 4 
        THEN ROUND(obj.celkova_cena_s_dph / COUNT(DISTINCT lpc.cislo_lp), 2)
        ELSE 0 
    END as rezervace,
    
    -- Předpoklad (faktury)
    ROUND(COALESCE(SUM(fakt.castka_celkem), 0) / COUNT(DISTINCT lpc.cislo_lp), 2) as predpoklad,
    
    obj.status_objednavky_id

FROM 25a_objednavky obj
INNER JOIN 25_limitovane_prisliby_cerpani lpc ON obj.id = lpc.objednavka_id
LEFT JOIN 25a_objednavky_faktury fakt ON obj.id = fakt.objednavka_id AND fakt.stav != 'stornovana'

WHERE 
    lpc.cislo_lp = 'LPIT1'
    AND obj.status_objednavky_id IN (4, 5, 6, 7, 8, 9, 10, 11, 12)
    AND obj.rok = 2025

GROUP BY obj.id, obj.cislo_objednavky, obj.status_objednavky_id, obj.celkova_cena_s_dph

ORDER BY obj.cislo_objednavky;


-- 4️⃣ KONTROLA - SEČTI SI TO RUČNĚ
-- ============================================================================
-- Tento dotaz ti ukáže každou objednávku zvlášť pro manuální kontrolu

SELECT 
    'Detail pro kontrolu' as typ,
    obj.cislo_objednavky,
    obj.status_objednavky_id,
    obj.celkova_cena_s_dph,
    COUNT(DISTINCT lpc.cislo_lp) as pocet_lp,
    ROUND(obj.celkova_cena_s_dph / COUNT(DISTINCT lpc.cislo_lp), 2) as podil,
    
    -- Rezervace
    CASE WHEN obj.status_objednavky_id = 4 THEN '✓ ANO' ELSE '✗ NE' END as je_rezervace,
    CASE 
        WHEN obj.status_objednavky_id = 4 
        THEN ROUND(obj.celkova_cena_s_dph / COUNT(DISTINCT lpc.cislo_lp), 2)
        ELSE 0 
    END as prispeje_k_rezervaci,
    
    -- Faktury
    COALESCE(SUM(fakt.castka_celkem), 0) as suma_faktur,
    ROUND(COALESCE(SUM(fakt.castka_celkem), 0) / COUNT(DISTINCT lpc.cislo_lp), 2) as prispeje_k_planovano

FROM 25a_objednavky obj
INNER JOIN 25_limitovane_prisliby_cerpani lpc ON obj.id = lpc.objednavka_id
LEFT JOIN 25a_objednavky_faktury fakt ON obj.id = fakt.objednavka_id AND fakt.stav != 'stornovana'

WHERE 
    lpc.cislo_lp = 'LPIT1'
    AND obj.status_objednavky_id IN (4, 5, 6, 7, 8, 9, 10, 11, 12)
    AND obj.rok = 2025

GROUP BY obj.id, obj.cislo_objednavky, obj.status_objednavky_id, obj.celkova_cena_s_dph

ORDER BY obj.cislo_objednavky;
