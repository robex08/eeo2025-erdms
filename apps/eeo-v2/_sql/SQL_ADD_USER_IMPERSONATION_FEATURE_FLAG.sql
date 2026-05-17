-- ============================================================================
-- SQL MIGRACE: PŘIDÁNÍ FEATURE FLAG PRO USER IMPERSONATION
-- ============================================================================
-- Datum: 17. května 2026
-- Účel: Přidat globální nastavení pro zapnutí/vypnutí user impersonation
-- Tabulka: 25a_nastaveni_globalni
-- Klíč: user_impersonation_enabled
-- Výchozí hodnota: 0 (VYPNUTO - bezpečná varianta)
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- Kontrola zda už neexistuje
SELECT COUNT(*) as existing_count 
FROM `25a_nastaveni_globalni` 
WHERE klic = 'user_impersonation_enabled';

-- Přidání záznamu (pouze pokud neexistuje)
INSERT INTO `25a_nastaveni_globalni` (klic, hodnota, popis, vytvoreno, aktualizovano)
SELECT 
    'user_impersonation_enabled', 
    '0', 
    'Povolit superadmin/administrator účtům přepnout se na jiného uživatele (0=vypnuto, 1=zapnuto)', 
    NOW(), 
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM `25a_nastaveni_globalni` WHERE klic = 'user_impersonation_enabled'
);

-- Výsledná kontrola - co je v DB
SELECT klic, hodnota, popis, vytvoreno, aktualizovano 
FROM `25a_nastaveni_globalni` 
WHERE klic = 'user_impersonation_enabled';

-- ============================================================================
-- POZNÁMKY:
-- - Default hodnota je '0' (vypnuto) - aplikace se chová jako dosud
-- - Pouze SUPERADMIN může změnit toto nastavení v AppSettings
-- - Backend kontroluje tento flag před každým impersonation API callem
-- - Frontend kontroluje flag pro zobrazení impersonation ikony
-- ============================================================================
