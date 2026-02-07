-- ============================================================================
-- 📅 AUTOMATICKÁ AKTUALIZACE STAVŮ ROČNÍCH POPLATKŮ PODLE DATA SPLATNOSTI
-- ============================================================================
-- 
-- Tento skript automaticky aktualizuje stavy položek ročních poplatků
-- podle jejich data splatnosti a současného stavu.
--
-- Logika:
-- - Zaplacené položky (ZAPLACENO) se nemění
-- - Nezaplacené po splatnosti → PO_SPLATNOSTI  
-- - Nezaplacené blížící se splatnosti (do 10 dní) → BLIZI_SE_SPLATNOST
-- - Ostatní nezaplacené → NEZAPLACENO
--
-- Datum: 2026-01-31
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- Nejdříve zobrazíme současný stav před změnami
SELECT 
    'PŘED ZMĚNOU' as status,
    stav,
    COUNT(*) as pocet
FROM 25a_rocni_poplatky_polozky 
WHERE aktivni = 1
GROUP BY stav
ORDER BY stav;

-- 1️⃣ Aktualizace položek PO SPLATNOSTI
-- (nezaplacené položky, kde je datum splatnosti v minulosti)
UPDATE 25a_rocni_poplatky_polozky 
SET 
    stav = 'PO_SPLATNOSTI',
    dt_aktualizace = NOW()
WHERE 
    aktivni = 1 
    AND stav != 'ZAPLACENO'
    AND datum_splatnosti < CURDATE();

SELECT 
    CONCAT('Aktualizováno na PO_SPLATNOSTI: ', ROW_COUNT(), ' položek') as vysledek;

-- 2️⃣ Aktualizace položek BLÍŽÍ SE SPLATNOST  
-- (nezaplacené položky, kde je datum splatnosti od dneška do 10 dní dopředu)
UPDATE 25a_rocni_poplatky_polozky 
SET 
    stav = 'BLIZI_SE_SPLATNOST',
    dt_aktualizace = NOW()
WHERE 
    aktivni = 1 
    AND stav != 'ZAPLACENO'
    AND datum_splatnosti >= CURDATE() 
    AND datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY);

SELECT 
    CONCAT('Aktualizováno na BLIZI_SE_SPLATNOST: ', ROW_COUNT(), ' položek') as vysledek;

-- 3️⃣ Aktualizace položek NEZAPLACENO
-- (nezaplacené položky, kde je datum splatnosti za více než 10 dní)  
UPDATE 25a_rocni_poplatky_polozky 
SET 
    stav = 'NEZAPLACENO',
    dt_aktualizace = NOW()
WHERE 
    aktivni = 1 
    AND stav != 'ZAPLACENO'
    AND datum_splatnosti > DATE_ADD(CURDATE(), INTERVAL 10 DAY);

SELECT 
    CONCAT('Aktualizováno na NEZAPLACENO: ', ROW_COUNT(), ' položek') as vysledek;

-- Zobrazíme výsledný stav po změnách
SELECT 
    'PO ZMĚNĚ' as status,
    stav,
    COUNT(*) as pocet
FROM 25a_rocni_poplatky_polozky 
WHERE aktivni = 1
GROUP BY stav
ORDER BY stav;

-- Detailní přehled podle kategorií splatnosti
SELECT 
    'PŘEHLED PODLE SPLATNOSTI' as kategorie,
    CASE 
        WHEN datum_splatnosti < CURDATE() THEN 'Po splatnosti'
        WHEN datum_splatnosti >= CURDATE() AND datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY) THEN 'Blíží se (do 10 dní)'
        WHEN datum_splatnosti > DATE_ADD(CURDATE(), INTERVAL 10 DAY) THEN 'Vzdálená splatnost'
        ELSE 'Bez data splatnosti'
    END as kategorie_splatnosti,
    stav,
    COUNT(*) as pocet
FROM 25a_rocni_poplatky_polozky 
WHERE aktivni = 1
GROUP BY 
    CASE 
        WHEN datum_splatnosti < CURDATE() THEN 'Po splatnosti'
        WHEN datum_splatnosti >= CURDATE() AND datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY) THEN 'Blíží se (do 10 dní)'
        WHEN datum_splatnosti > DATE_ADD(CURDATE(), INTERVAL 10 DAY) THEN 'Vzdálená splatnost'
        ELSE 'Bez data splatnosti'
    END,
    stav
ORDER BY kategorie_splatnosti, stav;

-- ============================================================================
-- ✅ DOKONČENO - stavy automaticky aktualizovány podle data splatnosti
-- ============================================================================