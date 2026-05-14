-- ============================================================
-- Migrace: Přidání EDUCATION_VIEW_ALL práva pro Statistiky & Reporty
-- Datum: 2026-05-14
-- Popis: Právo pro zobrazení vzdělávání bez omezení na úseky
--        (používáno v StatsReportsPage.js řádky 2484, 2494)
-- ============================================================

-- Přidání práva do číselníku
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'EDUCATION_VIEW_ALL', 'Statistika a reporty – Vzdělávání – zobrazení všech úseků (neomezené)', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'EDUCATION_VIEW_ALL');

-- Volitelné: Přiřazení práva roli ADMINISTRATOR
-- INSERT INTO 25_role_prava (role_kod, pravo_kod, aktivni)
-- SELECT 'ADMINISTRATOR', 'EDUCATION_VIEW_ALL', 1
-- FROM DUAL
-- WHERE NOT EXISTS (
--   SELECT 1 FROM 25_role_prava WHERE role_kod = 'ADMINISTRATOR' AND pravo_kod = 'EDUCATION_VIEW_ALL'
-- );

-- Kontrola
SELECT 'Právo EDUCATION_VIEW_ALL přidáno:' as status;
SELECT kod_prava, popis, aktivni FROM 25_prava WHERE kod_prava = 'EDUCATION_VIEW_ALL';
