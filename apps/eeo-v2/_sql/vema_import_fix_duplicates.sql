-- ================================================================================
-- VEMA Import - Oprava duplicit a implementace UPDATE logiky
-- ================================================================================
-- Datum: 2026-06-22
-- Účel: Přidat UNIQUE KEYs a připravit tabulky pro INSERT ... ON DUPLICATE KEY UPDATE
-- ================================================================================

USE `EEO-OSTRA-DEV`;

-- ================================================================================
-- 1. ODSTRANĚNÍ DUPLICIT (nechat jen nejnovější záznam)
-- ================================================================================

-- FIRMY: Odstranit duplicitní firmy (podle firma ID)
DELETE f1 FROM 25v_firmyupl f1
INNER JOIN (
    SELECT firma, MAX(id) as max_id
    FROM 25v_firmyupl
    WHERE firma IS NOT NULL
    GROUP BY firma
    HAVING COUNT(*) > 1
) f2 ON f1.firma = f2.firma AND f1.id < f2.max_id;

-- FAKTURY: Odstranit duplicitní faktury (podle cfak + firma + celkem)
DELETE f1 FROM 25v_fpazahl f1
INNER JOIN (
    SELECT cfak, firma, celkem, MAX(id) as max_id
    FROM 25v_fpazahl
    WHERE cfak IS NOT NULL AND firma IS NOT NULL
    GROUP BY cfak, firma, celkem
    HAVING COUNT(*) > 1
) f2 ON f1.cfak = f2.cfak AND f1.firma = f2.firma AND f1.celkem = f2.celkem AND f1.id < f2.max_id;

-- SMLOUVY: Odstranit duplicitní smlouvy (podle csml)
DELETE s1 FROM 25v_smla s1
INNER JOIN (
    SELECT csml, MAX(id) as max_id
    FROM 25v_smla
    WHERE csml IS NOT NULL
    GROUP BY csml
    HAVING COUNT(*) > 1
) s2 ON s1.csml = s2.csml AND s1.id < s2.max_id;

-- ================================================================================
-- 2. PŘIDÁNÍ UNIQUE KEY INDEXŮ (pokud ještě neexistují)
-- ================================================================================

-- FIRMY: UNIQUE KEY na firma ID
ALTER TABLE 25v_firmyupl 
ADD UNIQUE KEY unique_firma (firma);

-- FAKTURY: UNIQUE KEY na kombinaci cfak + firma + celkem
ALTER TABLE 25v_fpazahl 
ADD UNIQUE KEY unique_faktura (cfak, firma, celkem);

-- SMLOUVY: UNIQUE KEY na csml
ALTER TABLE 25v_smla 
ADD UNIQUE KEY unique_smlouva (csml);

-- ================================================================================
-- 3. OVĚŘENÍ
-- ================================================================================

-- Zkontrolovat že duplicity jsou pryč
SELECT 'FIRMY - Duplicity:' as kontrola;
SELECT firma, COUNT(*) as pocet 
FROM 25v_firmyupl 
WHERE firma IS NOT NULL
GROUP BY firma 
HAVING COUNT(*) > 1;

SELECT 'FAKTURY - Duplicity:' as kontrola;
SELECT cfak, firma, celkem, COUNT(*) as pocet 
FROM 25v_fpazahl 
WHERE cfak IS NOT NULL AND firma IS NOT NULL
GROUP BY cfak, firma, celkem 
HAVING COUNT(*) > 1;

SELECT 'SMLOUVY - Duplicity:' as kontrola;
SELECT csml, COUNT(*) as pocet 
FROM 25v_smla 
WHERE csml IS NOT NULL
GROUP BY csml 
HAVING COUNT(*) > 1;

-- Zobrazit indexy
SELECT 'UNIQUE KEYs:' as kontrola;
SHOW INDEX FROM 25v_firmyupl WHERE Key_name = 'unique_firma';
SHOW INDEX FROM 25v_fpazahl WHERE Key_name = 'unique_faktura';
SHOW INDEX FROM 25v_smla WHERE Key_name = 'unique_smlouva';
