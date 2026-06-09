-- ============================================================================
-- OVĚŘENÍ: Jsou v databázi všechna práva pro modul "Statistika a reporty"?
-- ============================================================================
-- Datum: 2026-06-08
-- Cíl: Zjistit, zda jsou všechna "oušková" práva korektně nastavena v DB
-- ============================================================================

-- ============================================================================
-- ČÁST 1: VŠECHNA PRÁVA - PŘEHLED
-- ============================================================================

SELECT 
    CASE 
        WHEN kod_prava LIKE 'FIN_CONTROL_%' THEN '1. Finanční kontrola'
        WHEN kod_prava LIKE 'EDUCATION_%' THEN '2. Vzdělávání'
        WHEN kod_prava LIKE 'SPENDING_%' THEN '3. 💰 ČERPÁNÍ'
        WHEN kod_prava LIKE 'REPORT_%' THEN '4. Reporty'
        WHEN kod_prava LIKE 'STATISTICS_%' THEN '5. Statistiky'
        WHEN kod_prava LIKE 'ATTACHMENTS_%' THEN '6. Přílohy'
        WHEN kod_prava LIKE 'PIVOT_%' THEN '7. Agregační tabulka'
        WHEN kod_prava LIKE 'CASHBOOK_REPORTS_%' THEN '8. Přehled pokladen'
        WHEN kod_prava LIKE 'DOHADNE_%' THEN '9. Dohadné položky'
        ELSE 'OSTATNÍ'
    END AS sekce,
    kod_prava,
    popis,
    IF(aktivni = 1, '✅ Aktivní', '❌ NEAKTIVNÍ') AS status
FROM 25_prava
WHERE kod_prava IN (
    -- Finanční kontrola
    'FIN_CONTROL_VIEW', 'FIN_CONTROL_EDIT', 'FIN_CONTROL_MANAGE',
    -- Vzdělávání
    'EDUCATION_VIEW', 'EDUCATION_EDIT', 'EDUCATION_MANAGE', 'EDUCATION_VIEW_ALL',
    -- ČERPÁNÍ ⭐
    'SPENDING_VIEW_ALL', 'SPENDING_VIEW_OWN', 'SPENDING_MANAGE',
    'SPENDING_CONTRACT_VIEW_ALL', 'SPENDING_LP_VIEW_ALL',
    -- Reporty
    'REPORT_VIEW', 'REPORT_EDIT', 'REPORT_MANAGE',
    -- Statistiky
    'STATISTICS_VIEW', 'STATISTICS_EDIT', 'STATISTICS_MANAGE',
    -- Přílohy
    'ATTACHMENTS_VIEW', 'ATTACHMENTS_MANAGE',
    -- Agregační tabulka
    'PIVOT_VIEW', 'PIVOT_EDIT', 'PIVOT_MANAGE',
    -- Přehled pokladen
    'CASHBOOK_REPORTS_VIEW', 'CASHBOOK_REPORTS_MANAGE', 'CASHBOOK_REPORTS_EXPORT',
    -- Dohadné položky
    'DOHADNE_VIEW', 'DOHADNE_EDIT', 'DOHADNE_MANAGE'
)
ORDER BY sekce, kod_prava;

-- ============================================================================
-- ČÁST 2: FOKUS NA ČERPÁNÍ - DETAILNÍ ANALÝZA
-- ============================================================================

SELECT 
    '=== ČERPÁNÍ (SPENDING) ===' AS 'SEKCE',
    kod_prava AS 'Právo',
    popis AS 'Popis',
    IF(aktivni = 1, '✅ ANO', '❌ NE') AS 'Existuje?'
FROM 25_prava
WHERE kod_prava LIKE 'SPENDING_%'
ORDER BY kod_prava;

-- ============================================================================
-- ČÁST 3: KONTROLA PŘIŘAZENÍ PRÁV K ROLÍM (ČERPÁNÍ)
-- ============================================================================

SELECT 
    '--- ROLE S PRÁVY ČERPÁNÍ ---' AS info,
    r.nazev_role AS 'Role',
    rp.kod_prava AS 'Právo',
    IF(rp.aktivni = 1, '✅ Aktivní', '❌ Neaktivní') AS 'Status'
FROM 25_role r
LEFT JOIN 25_role_prava rp ON r.id_role = rp.id_role
WHERE rp.kod_prava LIKE 'SPENDING_%' OR (rp.kod_prava IS NULL AND r.nazev_role IN ('ADMIN', 'SUPERADMIN'))
ORDER BY r.nazev_role, rp.kod_prava;

-- ============================================================================
-- ČÁST 4: POČET PRÁV PER SEKCE
-- ============================================================================

SELECT 
    CASE 
        WHEN kod_prava LIKE 'FIN_CONTROL_%' THEN 'Finanční kontrola'
        WHEN kod_prava LIKE 'EDUCATION_%' THEN 'Vzdělávání'
        WHEN kod_prava LIKE 'SPENDING_%' THEN '💰 ČERPÁNÍ'
        WHEN kod_prava LIKE 'REPORT_%' THEN 'Reporty'
        WHEN kod_prava LIKE 'STATISTICS_%' THEN 'Statistiky'
        WHEN kod_prava LIKE 'ATTACHMENTS_%' THEN 'Přílohy'
        WHEN kod_prava LIKE 'PIVOT_%' THEN 'Agregační tabulka'
        WHEN kod_prava LIKE 'CASHBOOK_REPORTS_%' THEN 'Přehled pokladen'
        WHEN kod_prava LIKE 'DOHADNE_%' THEN 'Dohadné položky'
    END AS sekce,
    COUNT(*) AS 'Počet práv',
    SUM(CASE WHEN aktivni = 1 THEN 1 ELSE 0 END) AS 'Aktivních'
FROM 25_prava
WHERE kod_prava IN (
    'FIN_CONTROL_VIEW', 'FIN_CONTROL_EDIT', 'FIN_CONTROL_MANAGE',
    'EDUCATION_VIEW', 'EDUCATION_EDIT', 'EDUCATION_MANAGE', 'EDUCATION_VIEW_ALL',
    'SPENDING_VIEW_ALL', 'SPENDING_VIEW_OWN', 'SPENDING_MANAGE',
    'SPENDING_CONTRACT_VIEW_ALL', 'SPENDING_LP_VIEW_ALL',
    'REPORT_VIEW', 'REPORT_EDIT', 'REPORT_MANAGE',
    'STATISTICS_VIEW', 'STATISTICS_EDIT', 'STATISTICS_MANAGE',
    'ATTACHMENTS_VIEW', 'ATTACHMENTS_MANAGE',
    'PIVOT_VIEW', 'PIVOT_EDIT', 'PIVOT_MANAGE',
    'CASHBOOK_REPORTS_VIEW', 'CASHBOOK_REPORTS_MANAGE', 'CASHBOOK_REPORTS_EXPORT',
    'DOHADNE_VIEW', 'DOHADNE_EDIT', 'DOHADNE_MANAGE'
)
GROUP BY sekce
ORDER BY sekce;

-- ============================================================================
-- ČÁST 5: SEZNAM VŠECH SEKCÍ - CO CHYBÍ?
-- ============================================================================

SELECT 
    CONCAT('Sekce: ', sekce, ' | Minimalní právo: ', min_pravo) AS 'PŘEHLED SEKCÍ'
FROM (
    SELECT 'Finanční kontrola' AS sekce, 'FIN_CONTROL_VIEW' AS min_pravo
    UNION SELECT 'Vzdělávání', 'EDUCATION_VIEW'
    UNION SELECT 'ČERPÁNÍ', 'SPENDING_VIEW_OWN' -- ⭐ NEJKRITIČTĚJŠÍ!
    UNION SELECT 'Reporty', 'REPORT_VIEW'
    UNION SELECT 'Statistiky', 'STATISTICS_VIEW'
    UNION SELECT 'Přílohy', 'ATTACHMENTS_VIEW'
    UNION SELECT 'Agregační tabulka', 'PIVOT_VIEW'
    UNION SELECT 'Přehled pokladen', 'CASHBOOK_REPORTS_VIEW'
    UNION SELECT 'Dohadné položky', 'DOHADNE_VIEW'
) AS sekce_list;

-- ============================================================================
-- ZPRÁVA SHRNUTÍ
-- ============================================================================
-- 
-- ✅ MÁME PRÁVA? - Zde se zobrazí výsledky dotazů výše
-- 
-- NEJDŮLEŽITĚJŠÍ PRO ČERPÁNÍ (💰):
-- - SPENDING_VIEW_OWN         → Zobrazení jen svého úseku
-- - SPENDING_VIEW_ALL         → Zobrazení všech úseků (bez správy)
-- - SPENDING_MANAGE           → Plná správa (změna filtrů, editace)
--
-- Pokud práva chybí, spusť:
--   source add_spending_view_all_permission.sql;
--
-- ============================================================================
