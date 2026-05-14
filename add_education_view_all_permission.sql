-- =============================================================================
-- Přidání práva EDUCATION_VIEW_ALL - nahlížení do vzdělávání bez filtru úseku
-- =============================================================================
-- Datum: 2026-05-14
-- Popis: Právo umožňuje uživatelům vidět všechny objednávky ve vzdělávání 
--        bez omezení na jejich úsek, ale NEMŮŽE je dokončovat (jen nahlížet)
-- Pattern: Stejný jako SPENDING_VIEW_ALL (nahlížení bez filtru úseku)
-- =============================================================================

-- 1. Kontrola, zda právo už neexistuje
SELECT 'Kontrola existence práva EDUCATION_VIEW_ALL...' AS status;
SELECT COUNT(*) AS existuje 
FROM 25_prava 
WHERE kod_prava = 'EDUCATION_VIEW_ALL';

-- 2. Přidání práva do tabulky 25_prava
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES (
    'EDUCATION_VIEW_ALL',
    'Statistika a reporty – Vzdělávání – zobrazení všech úseků (jen nahlížení)',
    1
)
ON DUPLICATE KEY UPDATE 
    popis = 'Statistika a reporty – Vzdělávání – zobrazení všech úseků (jen nahlížení)',
    aktivni = 1;

-- 3. Ověření vložení
SELECT 'Právo bylo úspěšně přidáno:' AS status;
SELECT id, kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava = 'EDUCATION_VIEW_ALL';

-- =============================================================================
-- POZNÁMKY:
-- =============================================================================
-- - Právo NEMĚNÍ možnost dokončování objednávek (to vyžaduje ORDER_MANAGE/ORDER_COMPLETE)
-- - Pouze vypíná filtr úseku v sekci Vzdělávání
-- - Frontend: apps/eeo-v2/client/src/pages/StatsReportsPage.js (lines 2449, 2459)
-- - Backend: Zatím není třeba kontrolovat (filtr úseku je frontend-only)
--
-- PŘIŘAZENÍ PRÁVA UŽIVATELŮM/ROLÍM:
-- - Přímé přiřazení uživateli:
--   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_kod, aktivni) 
--   VALUES (<user_id>, 'EDUCATION_VIEW_ALL', 1);
--
-- - Přiřazení roli:
--   INSERT INTO 25_role_prava (role_kod, pravo_kod, aktivni) 
--   VALUES ('<role_kod>', 'EDUCATION_VIEW_ALL', 1);
-- =============================================================================
