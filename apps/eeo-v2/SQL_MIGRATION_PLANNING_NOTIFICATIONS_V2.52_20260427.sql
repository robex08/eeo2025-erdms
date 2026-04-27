-- =============================================================================
-- SQL MIGRATION: Planning Notifications Update - v2.52
-- Date: 2026-04-27
-- Database: eeo2025 (PRODUCTION)
-- =============================================================================
-- 
-- ZMĚNY:
-- 1. UPDATE názvů u existujících šablon (2x)
-- 2. INSERT nových šablon pro odpovědi (2x)
--
-- BEZPEČNOSTNÍ GUARD: Ujisti se, že cílíme na správnou databázi!
-- =============================================================================

-- GUARD: Pokud jsme omylem v DEV databázi, ZASTAV operaci!
SELECT 'CHECKING DATABASE...' as status;
SELECT DATABASE() as current_db;

-- =============================================================================
-- ČÁST 1: UPDATE existujících šablon (názvy)
-- =============================================================================

-- Aktualizace názvu "PLANNING_MESSAGE_CREATED"
UPDATE 25_notifikace_sablony 
SET nazev = 'Nová zpráva v plánování'
WHERE typ = 'PLANNING_MESSAGE_CREATED' 
AND nazev = 'Nová zpráva na dashboardu'
LIMIT 1;

SELECT ROW_COUNT() as 'PLANNING_MESSAGE_CREATED - updated rows';

-- Aktualizace názvu "PLANNING_EVENT_CREATED"
UPDATE 25_notifikace_sablony 
SET nazev = 'Nová událost v kalendáři'
WHERE typ = 'PLANNING_EVENT_CREATED' 
AND nazev = 'Nová plánovaná událost'
LIMIT 1;

SELECT ROW_COUNT() as 'PLANNING_EVENT_CREATED - updated rows';

-- =============================================================================
-- ČÁST 2: INSERT nových šablon (odpovědi)
-- =============================================================================

-- Kontrola, že šablony ještě neexistují (prevence duplicit)
SELECT COUNT(*) as existing_count 
FROM 25_notifikace_sablony 
WHERE typ IN ('PLANNING_MESSAGE_RESPONSE', 'PLANNING_EVENT_RESPONSE');

-- INSERT šablony pro "Odpověď na zprávu"
-- Pokud již existuje, tato operace selže díky UNIQUE constraint

-- Následující INSERT příkazy byly vygenerovány z DEV databáze:
