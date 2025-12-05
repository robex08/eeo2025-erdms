-- ============================================================================
-- SETUP OPRÁVNĚNÍ PRO KONTEXTOVÉHO POMOCNÍKA (CONTEXTUAL HELPER)
-- Datum: 2025-11-07
-- Popis: Oprávnění pro zobrazení avatara - kontextového pomocníka ve stylu BTC mince
-- ============================================================================

-- ============================================================================
-- KROK 1: VYTVOŘENÍ OPRÁVNĚNÍ
-- ============================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) VALUES
('HELPER_VIEW', 'Zobrazení kontextového pomocníka (avatar mince)', 1),
('HELPER_MANAGE', 'Správa nastavení kontextového pomocníka', 1)
ON DUPLICATE KEY UPDATE
  popis = VALUES(popis),
  aktivni = VALUES(aktivni);

-- ============================================================================
-- KROK 2: PŘIŘAZENÍ OPRÁVNĚNÍ
-- ============================================================================

-- ⚠️ POZNÁMKA: Tento skript POUZE VYTVÁŘÍ OPRÁVNĚNÍ v tabulce 25_prava
-- 
-- Oprávnění se NEPŘIŘAZUJÍ automaticky k rolím ani uživatelům!
-- Administrátor může přiřazovat oprávnění:
--   - Individuálně jednotlivým uživatelům přes rozhraní Správy uživatelů
--   - Přes tabulku 25_uzivatel_prava (přímá práva uživatele)
--
-- Příklad ručního přiřazení oprávnění uživateli:
-- 
-- INSERT INTO `25_uzivatel_prava` (`uzivatel_id`, `pravo_id`)
-- SELECT 
--   (SELECT id FROM `25_uzivatele` WHERE username = 'jmeno.prijmeni'),
--   (SELECT id FROM `25_prava` WHERE kod_prava = 'HELPER_VIEW')
-- ON DUPLICATE KEY UPDATE uzivatel_id = uzivatel_id;
--
-- ============================================================================

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
WHERE kod_prava LIKE 'HELPER_%'
ORDER BY kod_prava;

-- Kontrola přiřazených práv k rolím (pro info):
SELECT 
  r.id as role_id,
  r.kod_role,
  r.nazev_role,
  p.kod_prava,
  p.popis
FROM `25_role_prava` rp
JOIN `25_role` r ON rp.role_id = r.id
JOIN `25_prava` p ON rp.pravo_id = p.id
WHERE p.kod_prava LIKE 'HELPER_%'
ORDER BY r.kod_role, p.kod_prava;

-- Kontrola přiřazení oprávnění uživatelům (přímá práva):
SELECT 
  u.id as user_id,
  u.username,
  u.jmeno,
  u.prijmeni,
  p.kod_prava,
  p.popis
FROM `25_uzivatel_prava` up
JOIN `25_uzivatele` u ON up.uzivatel_id = u.id
JOIN `25_prava` p ON up.pravo_id = p.id
WHERE p.kod_prava LIKE 'HELPER_%'
ORDER BY u.username, p.kod_prava;

-- ============================================================================
-- JAK PŘIŘADIT OPRÁVNĚNÍ UŽIVATELI:
-- ============================================================================
-- 
-- 1. Přes GUI (Správa uživatelů):
--    - Otevřete Správu uživatelů
--    - Vyberte uživatele
--    - V záložce "Přímá práva" přidejte HELPER_VIEW
--
-- 2. Ručně v databázi:
--
-- -- Přiřadit HELPER_VIEW uživateli "novak.jan"
-- INSERT INTO `25_uzivatel_prava` (`uzivatel_id`, `pravo_id`)
-- SELECT 
--   (SELECT id FROM `25_uzivatele` WHERE username = 'novak.jan'),
--   (SELECT id FROM `25_prava` WHERE kod_prava = 'HELPER_VIEW')
-- ON DUPLICATE KEY UPDATE uzivatel_id = uzivatel_id;
--
-- -- Odebrat oprávnění
-- DELETE FROM `25_uzivatel_prava`
-- WHERE uzivatel_id = (SELECT id FROM `25_uzivatele` WHERE username = 'novak.jan')
--   AND pravo_id = (SELECT id FROM `25_prava` WHERE kod_prava = 'HELPER_VIEW');
--
-- ============================================================================
