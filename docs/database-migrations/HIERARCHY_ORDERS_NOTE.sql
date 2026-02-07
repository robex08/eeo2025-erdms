-- =====================================================
-- POZNÁMKA K HIERARCHII PRO OBJEDNÁVKY
-- =====================================================
-- Datum: 16. prosince 2025
-- 
-- DŮLEŽITÉ:
-- Hierarchické filtrování objednávek (hierarchyOrderFilters.php)
-- stále používá starou tabulku 25_hierarchie_vztahy.
-- 
-- Po refactoringu na structure_json je tato funkce NEKOMPATIBILNÍ.
-- 
-- MOŽNOSTI:
-- 
-- 1. DOČASNĚ VYPNOUT hierarchické filtrování objednávek
--    - Nastavit hierarchy_enabled = 0 v global_settings
--    - SQL: UPDATE 25a_nastaveni_globalni SET hodnota = '0' WHERE klic = 'hierarchy_enabled';
-- 
-- 2. REFAKTOROVAT hierarchyOrderFilters.php
--    - Přepsat logiku aby četla ze structure_json
--    - To vyžaduje kompletní přepis (nodes/edges místo relací)
-- 
-- 3. ZACHOVAT STAROU TABULKU pouze pro Orders
--    - Vytvořit 25_hierarchie_vztahy znovu
--    - Používat pouze pro filtrování objednávek
--    - Notifikační hierarchie používá structure_json
-- 
-- DOPORUČENÍ:
-- Pro teď VYPNĚTE hierarchii pro objednávky (možnost 1),
-- dokud nebude čas na kompletní refactoring (možnost 2).
-- 
-- =====================================================

-- VYPNOUT hierarchii pro objednávky:
UPDATE 25a_nastaveni_globalni 
SET hodnota = '0' 
WHERE klic = 'hierarchy_enabled';

-- OVĚŘENÍ:
SELECT klic, hodnota, popis 
FROM 25a_nastaveni_globalni 
WHERE klic = 'hierarchy_enabled';

-- =====================================================
-- VÝSLEDEK:
-- - Hierarchické filtrování objednávek je vypnuto
-- - Všichni uživatelé vidí objednávky podle rolí (standardní chování)
-- - Notifikační hierarchie funguje normálně (structure_json)
-- =====================================================
