-- ============================================================================
-- SQL MIGRACE: PŘIDÁNÍ APP SETTING PRO ZASTUPOVÁNÍ
-- ============================================================================
-- Datum: 12. dubna 2026
-- Účel: Přidat globální nastavení pro zapnutí/vypnutí systému zastupování
-- Tabulka: 25a_nastaveni_globalni
-- Klíč: substitution_enabled
-- Výchozí hodnota: 0 (VYPNUTO - bezpečná varianta)
-- ============================================================================

USE `eeo2025-dev`;

-- Kontrola zda už neexistuje
SELECT COUNT(*) as existing_count 
FROM `25a_nastaveni_globalni` 
WHERE klic = 'substitution_enabled';

-- Přidání záznamu (pouze pokud neexistuje)
INSERT INTO `25a_nastaveni_globalni` (klic, hodnota, popis, vytvoreno, aktualizovano)
SELECT 'substitution_enabled', '0', 'Zapnutí/vypnutí systému zastupování (0=vypnuto, 1=zapnuto)', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM `25a_nastaveni_globalni` WHERE klic = 'substitution_enabled'
);

-- Výsledná kontrola - co je v DB
SELECT klic, hodnota, vytvoreno, aktualizovano 
FROM `25a_nastaveni_globalni` 
WHERE klic = 'substitution_enabled';

-- ============================================================================
-- POZNÁMKY PRO AKTIVACI:
-- ============================================================================
-- 1. Po spuštění této migrace je zastupování VYPNUTO (hodnota = 0)
-- 2. Pro ZAPNUTÍ zastupování změnit hodnotu na 1:
--    UPDATE `25a_nastaveni_globalni` SET hodnota = '1', aktualizovano = NOW() 
--    WHERE klic = 'substitution_enabled';
--
-- 3. Pro VYPNUTÍ zastupování změnit hodnotu na 0:
--    UPDATE `25a_nastaveni_globalni` SET hodnota = '0', aktualizovano = NOW() 
--    WHERE klic = 'substitution_enabled';
--
-- 4. UI pro správu nastavení bude přidán v dalším kroku
-- ============================================================================

-- Kontrola všech globálních nastavení souvisejících se systémem:
SELECT klic, hodnota, vytvoreno, aktualizovano 
FROM `25a_nastaveni_globalni` 
WHERE klic IN ('hierarchy_enabled', 'substitution_enabled')
ORDER BY klic;
