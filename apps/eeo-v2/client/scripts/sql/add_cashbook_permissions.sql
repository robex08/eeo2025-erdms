-- ============================================================================
-- PŘIDÁNÍ OPRÁVNĚNÍ PRO POKLADNÍ KNIHU
-- Datum: 2025-11-07
-- ============================================================================

-- Pokladní kniha - oprávnění
INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) VALUES
-- Základní přístup
('CASH_BOOK_READ_OWN', 'Zobrazení vlastní pokladní knihy', 1),
('CASH_BOOK_READ_ALL', 'Zobrazení všech pokladních knih', 1),

-- Vytváření záznamů
('CASH_BOOK_CREATE', 'Vytvoření nového záznamu ve vlastní pokladní knize', 1),

-- Editace záznamů
('CASH_BOOK_EDIT_OWN', 'Editace záznamů ve vlastní pokladní knize', 1),
('CASH_BOOK_EDIT_ALL', 'Editace záznamů ve všech pokladních knihách', 1),

-- Mazání záznamů
('CASH_BOOK_DELETE_OWN', 'Smazání záznamů z vlastní pokladní knihy', 1),
('CASH_BOOK_DELETE_ALL', 'Smazání záznamů ze všech pokladních knih', 1),

-- Export
('CASH_BOOK_EXPORT_OWN', 'Export vlastní pokladní knihy (CSV, PDF)', 1),
('CASH_BOOK_EXPORT_ALL', 'Export všech pokladních knih (CSV, PDF)', 1),

-- Super právo
('CASH_BOOK_MANAGE', 'Kompletní správa všech pokladních knih (všechna práva)', 1);

-- ============================================================================
-- KONEC SQL SKRIPTU
-- ============================================================================

-- Poznámky k oprávněním:
-- 
-- CASH_BOOK_READ_OWN:
--   - Zobrazení vlastní pokladní knihy
--   - Uživatel vidí jen svou pokladnu (podle userId)
--
-- CASH_BOOK_READ_ALL:
--   - Zobrazení všech pokladních knih
--   - Pro administrátory, vedoucí, THP
--
-- CASH_BOOK_CREATE:
--   - Oprávnění vytvořit nový řádek ve vlastní pokladní knize
--   - Umožňuje přidávání příjmů a výdajů
--
-- CASH_BOOK_EDIT_OWN:
--   - Oprávnění upravovat záznamy ve vlastní pokladní knize
--   - Pro běžné účetní
--
-- CASH_BOOK_EDIT_ALL:
--   - Oprávnění upravovat záznamy ve všech pokladních knihách
--   - Pro THP, hlavní účetní, administrátory
--
-- CASH_BOOK_DELETE_OWN:
--   - Oprávnění mazat záznamy z vlastní pokladní knihy
--   - Rizikové právo - omezit
--
-- CASH_BOOK_DELETE_ALL:
--   - Oprávnění mazat záznamy ze všech pokladních knih
--   - Velmi rizikové - pouze pro administrátory a THP
--
-- CASH_BOOK_EXPORT_OWN:
--   - Export vlastní pokladní knihy (CSV, PDF)
--   - Tisk vlastní pokladny
--
-- CASH_BOOK_EXPORT_ALL:
--   - Export všech pokladních knih
--   - Pro vedoucí, administrátory
--
-- CASH_BOOK_MANAGE:
--   - Kompletní správa všech pokladních knih
--   - Zahrnuje všechna výše uvedená práva s _ALL
--   - Pro SUPERADMIN a ADMINISTRATOR
--
-- ============================================================================
-- Doporučené přiřazení rolím:
-- ============================================================================
--
-- UCETNI:
--   - CASH_BOOK_READ_OWN
--   - CASH_BOOK_CREATE
--   - CASH_BOOK_EDIT_OWN
--   - CASH_BOOK_EXPORT_OWN
--
-- THP / HLAVNI_UCETNI:
--   - CASH_BOOK_READ_ALL
--   - CASH_BOOK_CREATE
--   - CASH_BOOK_EDIT_ALL
--   - CASH_BOOK_DELETE_ALL
--   - CASH_BOOK_EXPORT_ALL
--
-- VEDOUCI:
--   - CASH_BOOK_READ_ALL
--   - CASH_BOOK_EXPORT_ALL
--
-- ADMINISTRATOR / SUPERADMIN:
--   - CASH_BOOK_MANAGE (zahrnuje vše)
--
-- ============================================================================
