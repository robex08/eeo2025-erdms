-- ============================================================================
-- MIGRACE: Rozšíření věcné správnosti faktur o ZAMÍTNUTÍ
-- Datum: 2026-06-05
-- Autor: AI Assistant (GitHub Copilot)
-- 
-- POPIS:
-- Rozšiřuje věcnou správnost faktury o 3. stav - ZAMÍTNUTO (hodnota 2).
-- Recykluje existující sloupce (žádné nové sloupce).
-- 
-- SÉMANTIKA:
-- - 0/NULL = Neověřeno (předáno ke kontrole)
-- - 1 = Potvrzeno (poznámka volitelná)
-- - 2 = Zamítnuto (poznámka POVINNÁ = důvod zamítnutí)
-- 
-- PRAVIDLA:
-- - Kdo akci provedl: potvrdil_vecnou_spravnost_id
-- - Kdy: dt_potvrzeni_vecne_spravnosti
-- - Důvod/poznámka: vecna_spravnost_poznamka (povinná při statusu 2)
-- 
-- DATABÁZE: eeo2025-dev (testovací verze)
-- ============================================================================

USE `eeo2025-dev`;

-- ============================================================================
-- 1. Rozšíření TINYINT(1) na TINYINT(2) pro jistotu (hodnoty se vejdou už teď)
-- ============================================================================
ALTER TABLE `25a_objednavky_faktury`
    MODIFY COLUMN `vecna_spravnost_potvrzeno` TINYINT(2) UNSIGNED NULL DEFAULT NULL
    COMMENT 'Stav věcné správnosti: 0=neověřeno, 1=potvrzeno, 2=zamítnuto';

-- ============================================================================
-- 2. Aktualizace komentáře u souvisejících sloupců pro dokumentaci
-- ============================================================================
ALTER TABLE `25a_objednavky_faktury`
    MODIFY COLUMN `potvrdil_vecnou_spravnost_id` INT(11) NULL DEFAULT NULL
    COMMENT 'ID uživatele, který potvrdil NEBO zamítl věcnou správnost',
    
    MODIFY COLUMN `dt_potvrzeni_vecne_spravnosti` DATETIME NULL DEFAULT NULL
    COMMENT 'Datum a čas potvrzení NEBO zamítnutí věcné správnosti',
    
    MODIFY COLUMN `vecna_spravnost_poznamka` TEXT NULL
    COMMENT 'Poznámka k VS (volitelná pro status 1, POVINNÁ pro status 2 = důvod zamítnutí)';

-- ============================================================================
-- 3. Ověření migrace
-- ============================================================================
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = '25a_objednavky_faktury'
    AND COLUMN_NAME IN (
        'vecna_spravnost_potvrzeno',
        'potvrdil_vecnou_spravnost_id',
        'dt_potvrzeni_vecne_spravnosti',
        'vecna_spravnost_poznamka'
    )
ORDER BY ORDINAL_POSITION;

-- ============================================================================
-- 4. Test dat - kontrola existujících hodnot
-- ============================================================================
SELECT 
    'Test stávajících hodnot' AS test,
    COUNT(*) AS celkem_faktur,
    SUM(CASE WHEN vecna_spravnost_potvrzeno IS NULL THEN 1 ELSE 0 END) AS neoveeno_null,
    SUM(CASE WHEN vecna_spravnost_potvrzeno = 0 THEN 1 ELSE 0 END) AS neoveeno_0,
    SUM(CASE WHEN vecna_spravnost_potvrzeno = 1 THEN 1 ELSE 0 END) AS potvrzeno,
    SUM(CASE WHEN vecna_spravnost_potvrzeno = 2 THEN 1 ELSE 0 END) AS zamitnuto_nove
FROM `25a_objednavky_faktury`
WHERE aktivni = 1;

-- ============================================================================
-- POZNÁMKY:
-- - Žádná stávající data nebudou změněna (pouze se rozšíří rozsah hodnot)
-- - Status 2 (zamítnutí) bude možné nastavit až po implementaci backendu
-- - Po spuštění této migrace pokračujte implementací backendu (Fáze 2)
-- ============================================================================
