-- ============================================================================
-- PŘIŘAZENÍ OPRÁVNĚNÍ POKLADNÍ KNIHY K ROLÍM
-- Datum: 2025-11-07
-- ============================================================================
-- 
-- POZNÁMKA: Tento skript předpokládá následující ID rolí:
-- - SUPERADMIN: role_id = 1
-- - ADMINISTRATOR: role_id = 2
-- - THP: role_id = 4
-- - VEDOUCI: role_id = 3
-- - UCETNI: role_id = 5
-- - HLAVNI_UCETNI: role_id = 6
-- 
-- Před spuštěním zkontrolujte skutečná ID rolí ve vaší databázi!
-- SELECT * FROM `25_role`;
--
-- ============================================================================

-- 1. SUPERADMIN - Kompletní správa pokladní knihy
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 1, id FROM `25_prava` WHERE kod_prava = 'CASH_BOOK_MANAGE'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 2. ADMINISTRATOR - Kompletní správa pokladní knihy
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 2, id FROM `25_prava` WHERE kod_prava = 'CASH_BOOK_MANAGE'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 3. THP - Vše včetně mazání na VŠECH pokladnách
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 4, id FROM `25_prava` WHERE kod_prava IN (
  'CASH_BOOK_READ_ALL',
  'CASH_BOOK_CREATE',
  'CASH_BOOK_EDIT_ALL',
  'CASH_BOOK_DELETE_ALL',
  'CASH_BOOK_EXPORT_ALL'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 4. VEDOUCI - Pouze čtení a export VŠECH pokladních knih
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 3, id FROM `25_prava` WHERE kod_prava IN (
  'CASH_BOOK_READ_ALL',
  'CASH_BOOK_EXPORT_ALL'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 5. UCETNI - Vše kromě mazání, jen VLASTNÍ pokladna
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 5, id FROM `25_prava` WHERE kod_prava IN (
  'CASH_BOOK_READ_OWN',
  'CASH_BOOK_CREATE',
  'CASH_BOOK_EDIT_OWN',
  'CASH_BOOK_EXPORT_OWN'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 6. HLAVNI_UCETNI - Kompletní práva na VŠECH pokladnách
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 6, id FROM `25_prava` WHERE kod_prava IN (
  'CASH_BOOK_READ_ALL',
  'CASH_BOOK_CREATE',
  'CASH_BOOK_EDIT_ALL',
  'CASH_BOOK_DELETE_ALL',
  'CASH_BOOK_EXPORT_ALL'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ============================================================================
-- KONEC SQL SKRIPTU
-- ============================================================================

-- Kontrola přiřazených práv:
-- ============================================================================
-- SELECT 
--   r.nazev_role,
--   p.kod_prava,
--   p.popis
-- FROM `25_role_prava` rp
-- JOIN `25_role` r ON rp.role_id = r.id
-- JOIN `25_prava` p ON rp.pravo_id = p.id
-- WHERE p.kod_prava LIKE 'CASH_BOOK_%'
-- ORDER BY r.nazev_role, p.kod_prava;
-- ============================================================================
