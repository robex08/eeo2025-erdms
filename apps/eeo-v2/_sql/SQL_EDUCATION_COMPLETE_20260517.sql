-- ============================================================
-- Migration: Add EDUCATION_COMPLETE permission for order completion
-- Date: 2026-05-17
-- Description: Allows completing education-related orders (Vzdělávání)
-- ============================================================

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'EDUCATION_COMPLETE', 'Vzdelavani - dokonceni objednavky', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'EDUCATION_COMPLETE');

SELECT 'EDUCATION_COMPLETE present' AS status;
SELECT kod_prava, popis, aktivni FROM 25_prava WHERE kod_prava = 'EDUCATION_COMPLETE';
