-- =============================================================================
-- MIGRACE: Přidání role KONTROLOR_FAKTUR
-- Datum: 2026-01-20
-- Autor: Development Team
-- Popis: Nová role pro kontrolu řádků faktur (LP čerpání)
-- =============================================================================
-- 
-- Účel:
-- - Umožnit kontrolorům odškrtávat jednotlivé řádky faktur
-- - Kontrola probíhá na úrovni LP čerpání (25a_faktury_lp_cerpani)
-- - Stav kontroly se ukládá do rozsirujici_data JSON v tabulce 25a_objednavky_faktury
--
-- Database: eeo2025-dev (DEV)
-- =============================================================================

USE `eeo2025-dev`;

-- Přidání nové role KONTROLOR_FAKTUR
INSERT INTO `25_role` (`aktivni`, `kod_role`, `nazev_role`, `Popis`)
VALUES (
    1,
    'KONTROLOR_FAKTUR',
    'Kontrolor faktur',
    'Může odškrtávat kontrolu jednotlivých řádků faktur (LP čerpání)'
);

-- Poznámka: ID role bude přiděleno automaticky (AUTO_INCREMENT)
-- Pro přiřazení role konkrétním uživatelům použij:
-- INSERT INTO `25_uzivatele_role` (`uzivatel_id`, `role_id`, `aktivni`) 
-- VALUES ({USER_ID}, {NEW_ROLE_ID}, 1);

-- =============================================================================
-- KONEC MIGRACE
-- =============================================================================
