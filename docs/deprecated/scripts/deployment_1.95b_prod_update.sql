-- ============================================================================
-- EEO v2 - PROD Update notifikačních šablon - verze 1.95b
-- ============================================================================
-- Datum: 3. ledna 2026
-- Popis: Přidání ikon podle typu notifikace (APPROVAL/EXCEPTIONAL/INFO)
--        Pro PRODUKČNÍ databázi eeo2025
-- ============================================================================

USE eeo2025;

-- Update email předmětu pro order_status_ke_schvaleni
UPDATE 25_notifikace_sablony 
SET email_predmet = '{action_icon} EEO: Nová objednávka ke schválení #{order_number}'
WHERE typ = 'order_status_ke_schvaleni';

-- Ověření
SELECT id, typ, email_predmet, app_nadpis 
FROM 25_notifikace_sablony 
WHERE typ = 'order_status_ke_schvaleni';
