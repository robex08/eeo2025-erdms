-- =============================================================================
-- Přidání práva SPENDING_VIEW_ALL - nahlížení do čerpání bez filtru úseku
-- =============================================================================
-- Datum: 2026-05-14
-- Popis: Právo umožňuje uživatelům vidět všechna čerpání (LP + smlouvy)
--        bez omezení na jejich úsek (jen nahlížení, bez správy)
-- KRITICKÉ: Toto právo se již používá v kódu na 9 místech, ale chybělo v DB!
-- =============================================================================

-- 1. Kontrola, zda právo už neexistuje
SELECT 'Kontrola existence práva SPENDING_VIEW_ALL...' AS status;
SELECT COUNT(*) AS existuje 
FROM 25_prava 
WHERE kod_prava = 'SPENDING_VIEW_ALL';

-- 2. Přidání práva do tabulky 25_prava
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES (
    'SPENDING_VIEW_ALL',
    'Statistika a reporty – Čerpání – zobrazení všech úseků (jen nahlížení)',
    1
)
ON DUPLICATE KEY UPDATE 
    popis = 'Statistika a reporty – Čerpání – zobrazení všech úseků (jen nahlížení)',
    aktivni = 1;

-- 3. Ověření vložení
SELECT 'Právo bylo úspěšně přidáno:' AS status;
SELECT id, kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava = 'SPENDING_VIEW_ALL';

-- =============================================================================
-- POZNÁMKY:
-- =============================================================================
-- BUG FIX: Toto právo se již používá v kódu:
--   - apps/eeo-v2/client/src/pages/StatsReportsPage.js (line 2449, 2461)
--   - apps/eeo-v2/client/src/App.js (line 477, 1112)
--   - apps/eeo-v2/client/src/utils/availableSections.js (line 122, 132)
--   - apps/eeo-v2/client/src/components/Layout.js (line 2117, 2231, 4032)
--
-- Bez tohoto práva v DB nefungovalo ověřování přístupů pro uživatele!
--
-- EXISTUJÍCÍ PRÁVA:
--   - SPENDING_CONTRACT_VIEW_ALL - zobrazení čerpání smluv (všechny)
--   - SPENDING_LP_VIEW_ALL       - zobrazení čerpání LP (všechny)
--   - SPENDING_VIEW_OWN          - zobrazení vlastního čerpání
--   - SPENDING_MANAGE            - kompletní správa
--
-- SPENDING_VIEW_ALL = obecné právo pro nahlížení do VŠEHO (LP + smlouvy)
--
-- PŘIŘAZENÍ PRÁVA UŽIVATELŮM/ROLÍM:
-- - Přímé přiřazení uživateli:
--   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_kod, aktivni) 
--   VALUES (<user_id>, 'SPENDING_VIEW_ALL', 1);
--
-- - Přiřazení roli:
--   INSERT INTO 25_role_prava (role_kod, pravo_kod, aktivni) 
--   VALUES ('<role_kod>', 'SPENDING_VIEW_ALL', 1);
-- =============================================================================
