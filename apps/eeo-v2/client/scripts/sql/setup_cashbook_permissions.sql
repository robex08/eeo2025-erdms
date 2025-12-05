-- ============================================================================
-- KOMPLETNÍ SETUP OPRÁVNĚNÍ POKLADNÍ KNIHY
-- Datum: 2025-11-07
-- Popis: Idempotentní skript - lze spustit vícekrát bez problémů
-- ============================================================================

USE evidence_smluv;

-- ============================================================================
-- KROK 1: PŘIDÁNÍ/UPDATE OPRÁVNĚNÍ DO TABULKY 25_prava
-- ============================================================================

-- Nejdříve smažeme stará oprávnění bez _OWN/_ALL klasifikace
DELETE FROM `25_prava` WHERE kod_prava IN (
  'CASH_BOOK_READ',
  'CASH_BOOK_EDIT',
  'CASH_BOOK_DELETE',
  'CASH_BOOK_EXPORT'
);

-- Přidání nových oprávnění s _OWN/_ALL klasifikací
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
('CASH_BOOK_MANAGE', 'Kompletní správa všech pokladních knih (všechna práva)', 1)
ON DUPLICATE KEY UPDATE
  popis = VALUES(popis),
  aktivni = VALUES(aktivni);

-- ============================================================================
-- KROK 2: PŘIŘAZENÍ OPRÁVNĚNÍ K ROLÍM
-- ============================================================================

-- POZNÁMKA: Před spuštěním zkontrolujte ID rolí!
-- SELECT id, kod_role, nazev_role FROM `25_role`;

-- Smazání starých přiřazení pokladní knihy (pro čistý restart)
DELETE FROM `25_role_prava` 
WHERE pravo_id IN (
  SELECT id FROM `25_prava` WHERE kod_prava LIKE 'CASH_BOOK_%'
);

-- 1. SUPERADMIN - Kompletní správa (role_id = 1)
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 1, id FROM `25_prava` WHERE kod_prava = 'CASH_BOOK_MANAGE'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 2. ADMINISTRATOR - Kompletní správa (role_id = 2)
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 2, id FROM `25_prava` WHERE kod_prava = 'CASH_BOOK_MANAGE'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 3. THP - Vše včetně mazání na VŠECH pokladnách (role_id = 4)
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

-- 4. VEDOUCI - Pouze čtení a export VŠECH pokladních knih (role_id = 3)
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 3, id FROM `25_prava` WHERE kod_prava IN (
  'CASH_BOOK_READ_ALL',
  'CASH_BOOK_EXPORT_ALL'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 5. UCETNI - Vše kromě mazání, jen VLASTNÍ pokladna (role_id = 5)
-- ============================================================================
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`) 
SELECT 5, id FROM `25_prava` WHERE kod_prava IN (
  'CASH_BOOK_READ_OWN',
  'CASH_BOOK_CREATE',
  'CASH_BOOK_EDIT_OWN',
  'CASH_BOOK_EXPORT_OWN'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 6. HLAVNI_UCETNI - Kompletní práva na VŠECH pokladnách (role_id = 6)
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

-- ============================================================================
-- KONTROLNÍ DOTAZY
-- ============================================================================

-- Kontrola přidaných oprávnění:
SELECT 
  id, 
  kod_prava, 
  popis, 
  aktivni 
FROM `25_prava` 
WHERE kod_prava LIKE 'CASH_BOOK_%'
ORDER BY kod_prava;

-- Kontrola přiřazených práv k rolím:
SELECT 
  r.id as role_id,
  r.kod_role,
  r.nazev_role,
  p.kod_prava,
  p.popis
FROM `25_role_prava` rp
JOIN `25_role` r ON rp.role_id = r.id
JOIN `25_prava` p ON rp.pravo_id = p.id
WHERE p.kod_prava LIKE 'CASH_BOOK_%'
ORDER BY r.kod_role, p.kod_prava;

-- Matice práv pro přehled:
SELECT 
  r.kod_role,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_MANAGE' THEN '✓' ELSE '' END) AS MANAGE,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_READ_OWN' THEN '✓' ELSE '' END) AS READ_OWN,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_READ_ALL' THEN '✓' ELSE '' END) AS READ_ALL,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_CREATE' THEN '✓' ELSE '' END) AS `CREATE`,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_EDIT_OWN' THEN '✓' ELSE '' END) AS EDIT_OWN,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_EDIT_ALL' THEN '✓' ELSE '' END) AS EDIT_ALL,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_DELETE_OWN' THEN '✓' ELSE '' END) AS DEL_OWN,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_DELETE_ALL' THEN '✓' ELSE '' END) AS DEL_ALL,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_EXPORT_OWN' THEN '✓' ELSE '' END) AS EXP_OWN,
  MAX(CASE WHEN p.kod_prava = 'CASH_BOOK_EXPORT_ALL' THEN '✓' ELSE '' END) AS EXP_ALL
FROM `25_role` r
LEFT JOIN `25_role_prava` rp ON r.id = rp.role_id
LEFT JOIN `25_prava` p ON rp.pravo_id = p.id AND p.kod_prava LIKE 'CASH_BOOK_%'
GROUP BY r.kod_role
ORDER BY 
  CASE r.kod_role
    WHEN 'SUPERADMIN' THEN 1
    WHEN 'ADMINISTRATOR' THEN 2
    WHEN 'THP' THEN 3
    WHEN 'HLAVNI_UCETNI' THEN 4
    WHEN 'UCETNI' THEN 5
    WHEN 'VEDOUCI' THEN 6
    ELSE 99
  END;

-- ============================================================================
