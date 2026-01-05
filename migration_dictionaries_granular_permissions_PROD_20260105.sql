-- =============================================================================
-- MIGRATION: Granular Permissions for Dictionaries - PRODUCTION
-- =============================================================================
-- Date: 2026-01-05
-- Author: System
-- Description: Přidání granulárních CRUD práv pro jednotlivé číselníky
--
-- ⚠️ PRODUKČNÍ DATABÁZE: eeo2025
--
-- DŮLEŽITÉ:
-- - Tato migrace POUZE přidává nová práva do tabulky 25_prava
-- - NIKOMU je nepřiřazuje (zachování zpětné kompatibility)
-- - Stávající DICT_MANAGE zůstává funkční jako superpravo
-- - CASH_BOOK_MANAGE zůstává pro modul pokladny
--
-- TESTOVÁNO NA: eeo2025-dev ✅
-- =============================================================================

USE `eeo2025`;

-- Začátek transakce pro atomickou operaci
START TRANSACTION;

-- =============================================================================
-- 1. LOKALITY (LOCATIONS)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('LOCATIONS_VIEW', 'Zobrazení lokalit v číselníku (read-only)', 1),
  ('LOCATIONS_CREATE', 'Vytváření nových lokalit v číselníku', 1),
  ('LOCATIONS_EDIT', 'Editace existujících lokalit v číselníku', 1),
  ('LOCATIONS_DELETE', 'Mazání lokalit z číselníku', 1);

-- =============================================================================
-- 2. POZICE (POSITIONS)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('POSITIONS_VIEW', 'Zobrazení pozic v číselníku (read-only)', 1),
  ('POSITIONS_CREATE', 'Vytváření nových pozic v číselníku', 1),
  ('POSITIONS_EDIT', 'Editace existujících pozic v číselníku', 1),
  ('POSITIONS_DELETE', 'Mazání pozic z číselníku', 1);

-- =============================================================================
-- 3. SMLOUVY (CONTRACTS)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('CONTRACTS_VIEW', 'Zobrazení smluv v číselníku (read-only)', 1),
  ('CONTRACTS_CREATE', 'Vytváření nových smluv v číselníku', 1),
  ('CONTRACTS_EDIT', 'Editace existujících smluv v číselníku', 1),
  ('CONTRACTS_DELETE', 'Mazání smluv z číselníku', 1);

-- =============================================================================
-- 4. ORGANIZACE (ORGANIZATIONS)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('ORGANIZATIONS_VIEW', 'Zobrazení organizací v číselníku (read-only)', 1),
  ('ORGANIZATIONS_CREATE', 'Vytváření nových organizací v číselníku', 1),
  ('ORGANIZATIONS_EDIT', 'Editace existujících organizací v číselníku', 1),
  ('ORGANIZATIONS_DELETE', 'Mazání organizací z číselníku', 1);

-- =============================================================================
-- 5. ÚSEKY/ODDĚLENÍ (DEPARTMENTS)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('DEPARTMENTS_VIEW', 'Zobrazení úseků v číselníku (read-only)', 1),
  ('DEPARTMENTS_CREATE', 'Vytváření nových úseků v číselníku', 1),
  ('DEPARTMENTS_EDIT', 'Editace existujících úseků v číselníku', 1),
  ('DEPARTMENTS_DELETE', 'Mazání úseků z číselníku', 1);

-- =============================================================================
-- 6. STAVY (STATES)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('STATES_VIEW', 'Zobrazení stavů v číselníku (read-only)', 1),
  ('STATES_CREATE', 'Vytváření nových stavů v číselníku', 1),
  ('STATES_EDIT', 'Editace existujících stavů v číselníku', 1),
  ('STATES_DELETE', 'Mazání stavů z číselníku', 1);

-- =============================================================================
-- 7. ROLE (ROLES)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('ROLES_VIEW', 'Zobrazení rolí v číselníku (read-only)', 1),
  ('ROLES_CREATE', 'Vytváření nových rolí v číselníku', 1),
  ('ROLES_EDIT', 'Editace existujících rolí v číselníku', 1),
  ('ROLES_DELETE', 'Mazání rolí z číselníku', 1);

-- =============================================================================
-- 8. PRÁVA (PERMISSIONS)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('PERMISSIONS_VIEW', 'Zobrazení práv v číselníku (read-only)', 1),
  ('PERMISSIONS_CREATE', 'Vytváření nových práv v číselníku', 1),
  ('PERMISSIONS_EDIT', 'Editace existujících práv v číselníku', 1),
  ('PERMISSIONS_DELETE', 'Mazání práv z číselníku', 1);

-- =============================================================================
-- 9. DOCX ŠABLONY (DOCX_TEMPLATES)
-- =============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('DOCX_TEMPLATES_VIEW', 'Zobrazení DOCX šablon v číselníku (read-only)', 1),
  ('DOCX_TEMPLATES_CREATE', 'Vytváření nových DOCX šablon v číselníku', 1),
  ('DOCX_TEMPLATES_EDIT', 'Editace existujících DOCX šablon v číselníku', 1),
  ('DOCX_TEMPLATES_DELETE', 'Mazání DOCX šablon z číselníku', 1);

-- =============================================================================
-- 10. POKLADNÍ KNIHY - ČÍSELNÍK (CASH_BOOKS)
-- =============================================================================
-- POZNÁMKA: CASH_BOOK_MANAGE zůstává jako právo pro modul Pokladna
--           (správce všech pokladen, zamykání, atd.)
--           Tato práva jsou jen pro správu číselníku pokladních knih

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
  ('CASH_BOOKS_VIEW', 'Zobrazení pokladních knih v číselníku (read-only)', 1),
  ('CASH_BOOKS_CREATE', 'Vytváření nových pokladních knih v číselníku', 1),
  ('CASH_BOOKS_EDIT', 'Editace pokladních knih v číselníku', 1),
  ('CASH_BOOKS_DELETE', 'Mazání pokladních knih z číselníku', 1);

-- =============================================================================
-- COMMIT TRANSAKCE
-- =============================================================================

COMMIT;

-- =============================================================================
-- KONTROLNÍ VÝPIS
-- =============================================================================

SELECT 
  'Nově přidaná práva pro číselníky (PRODUCTION):' AS info;

SELECT 
  id,
  kod_prava,
  popis,
  aktivni
FROM `25_prava`
WHERE kod_prava IN (
  'LOCATIONS_VIEW', 'LOCATIONS_CREATE', 'LOCATIONS_EDIT', 'LOCATIONS_DELETE',
  'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT', 'POSITIONS_DELETE',
  'CONTRACTS_VIEW', 'CONTRACTS_CREATE', 'CONTRACTS_EDIT', 'CONTRACTS_DELETE',
  'ORGANIZATIONS_VIEW', 'ORGANIZATIONS_CREATE', 'ORGANIZATIONS_EDIT', 'ORGANIZATIONS_DELETE',
  'DEPARTMENTS_VIEW', 'DEPARTMENTS_CREATE', 'DEPARTMENTS_EDIT', 'DEPARTMENTS_DELETE',
  'STATES_VIEW', 'STATES_CREATE', 'STATES_EDIT', 'STATES_DELETE',
  'ROLES_VIEW', 'ROLES_CREATE', 'ROLES_EDIT', 'ROLES_DELETE',
  'PERMISSIONS_VIEW', 'PERMISSIONS_CREATE', 'PERMISSIONS_EDIT', 'PERMISSIONS_DELETE',
  'DOCX_TEMPLATES_VIEW', 'DOCX_TEMPLATES_CREATE', 'DOCX_TEMPLATES_EDIT', 'DOCX_TEMPLATES_DELETE',
  'CASH_BOOKS_VIEW', 'CASH_BOOKS_CREATE', 'CASH_BOOKS_EDIT', 'CASH_BOOKS_DELETE'
)
ORDER BY id;

SELECT 
  CONCAT('Celkem přidáno ', COUNT(*), ' nových práv') AS summary
FROM `25_prava`
WHERE kod_prava LIKE 'LOCATIONS_%' 
   OR kod_prava LIKE 'POSITIONS_%'
   OR kod_prava LIKE 'CONTRACTS_%'
   OR kod_prava LIKE 'ORGANIZATIONS_%'
   OR kod_prava LIKE 'DEPARTMENTS_%'
   OR kod_prava LIKE 'STATES_%'
   OR kod_prava LIKE 'ROLES_%'
   OR kod_prava LIKE 'PERMISSIONS_%'
   OR kod_prava LIKE 'DOCX_TEMPLATES_%'
   OR kod_prava LIKE 'CASH_BOOKS_%';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
