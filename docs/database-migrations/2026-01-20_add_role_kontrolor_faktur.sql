-- =============================================================================
-- MIGRACE: Přidání role KONTROLOR_FAKTUR
-- Datum: 2026-01-20
-- Autor: Development Team
-- Popis: Nová role pro kontrolu všech faktur v systému
-- =============================================================================
-- 
-- Účel:
-- - Umožnit kontrolorům zkontrolovat správnost všech faktur v systému
-- - Kontrola se vztahuje na všechny typy financování
-- - Stav kontroly se ukládá do rozsirujici_data JSON v tabulce 25a_objednavky_faktury
--
-- DŮLEŽITÉ:
-- - V aplikačním kódu VŽDY používat 'kod_role' (např. 'KONTROLOR_FAKTUR')
-- - NIKDY nepoužívat ID role (ID se může změnit při migracích)
--
-- Database: EEO-OSTRA-DEV (DEV)
-- =============================================================================

USE `EEO-OSTRA-DEV`;

-- Přidání nové role KONTROLOR_FAKTUR
INSERT INTO `25_role` (`aktivni`, `kod_role`, `nazev_role`, `Popis`)
VALUES (
    1,
    'KONTROLOR_FAKTUR',
    'Kontrolor faktur',
    'Může zkontrolovat správnost všech faktur v systému'
);

-- Poznámka: ID role bude přiděleno automaticky (AUTO_INCREMENT)
-- Pro přiřazení role konkrétním uživatelům použij:
-- INSERT INTO `25_uzivatele_role` (`uzivatel_id`, `role_id`, `aktivni`) 
-- VALUES ({USER_ID}, {NEW_ROLE_ID}, 1);

-- =============================================================================
-- KONEC MIGRACE
-- =============================================================================
