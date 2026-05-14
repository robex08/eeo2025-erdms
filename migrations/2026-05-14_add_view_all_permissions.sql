-- =============================================================================
-- PRODUKČNÍ MIGRACE: Nová práva EDUCATION_VIEW_ALL + SPENDING_VIEW_ALL
-- =============================================================================
-- Datum: 2026-05-14
-- Autor: Development team
-- Ticket/Issue: Vzdělávání a čerpání - nová práva pro nahlížení bez filtru úseku
-- 
-- ⚠️ KRITICKÉ: SPENDING_VIEW_ALL je BUG FIX - používáno v kódu, ale chybělo v DB!
-- =============================================================================

-- Výpis před změnami
SELECT '=== PŘED MIGRACÍ ===' AS status;
SELECT COUNT(*) AS pocet_existujicich 
FROM 25_prava 
WHERE kod_prava IN ('EDUCATION_VIEW_ALL', 'SPENDING_VIEW_ALL');

-- =============================================================================
-- 1. EDUCATION_VIEW_ALL
-- =============================================================================

INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES (
    'EDUCATION_VIEW_ALL',
    'Statistika a reporty – Vzdělávání – zobrazení všech úseků (jen nahlížení)',
    1
)
ON DUPLICATE KEY UPDATE 
    popis = 'Statistika a reporty – Vzdělávání – zobrazení všech úseků (jen nahlížení)',
    aktivni = 1;

SELECT 'EDUCATION_VIEW_ALL přidáno/aktualizováno' AS status;

-- =============================================================================
-- 2. SPENDING_VIEW_ALL
-- =============================================================================

INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES (
    'SPENDING_VIEW_ALL',
    'Statistika a reporty – Čerpání – zobrazení všech úseků (jen nahlížení)',
    1
)
ON DUPLICATE KEY UPDATE 
    popis = 'Statistika a reporty – Čerpání – zobrazení všech úseků (jen nahlížení)',
    aktivni = 1;

SELECT 'SPENDING_VIEW_ALL přidáno/aktualizováno' AS status;

-- =============================================================================
-- 3. OVĚŘENÍ PO MIGRACI
-- =============================================================================

SELECT '=== PO MIGRACI - OVĚŘENÍ ===' AS status;

SELECT id, kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava IN ('EDUCATION_VIEW_ALL', 'SPENDING_VIEW_ALL')
ORDER BY id;

-- Výpis souvisejících práv pro kontrolu
SELECT '=== SOUVISEJÍCÍ PRÁVA (pro kontrolu) ===' AS status;

SELECT id, kod_prava, LEFT(popis, 50) AS popis_short, aktivni 
FROM 25_prava 
WHERE kod_prava LIKE '%EDUCATION%' OR kod_prava LIKE '%SPENDING%'
ORDER BY kod_prava;

-- =============================================================================
-- POZNÁMKY PRO ADMINA:
-- =============================================================================
-- 
-- Po aplikaci této migrace:
-- 1. Ověřit výstup SELECT dotazů výše
-- 2. Přiřadit práva cílovým uživatelům/rolím podle potřeby:
--
--    -- Příklad přiřazení uživateli:
--    INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_kod, aktivni) 
--    VALUES (<user_id>, 'EDUCATION_VIEW_ALL', 1)
--    ON DUPLICATE KEY UPDATE aktivni = 1;
--
--    -- Příklad přiřazení roli:
--    INSERT INTO 25_role_prava (role_kod, pravo_kod, aktivni) 
--    VALUES ('<role_kod>', 'EDUCATION_VIEW_ALL', 1)
--    ON DUPLICATE KEY UPDATE aktivni = 1;
--
-- 3. Deploy frontendu (obsahuje změny v StatsReportsPage.js)
-- 4. Otestovat přístup s testovacím účtem
--
-- =============================================================================
