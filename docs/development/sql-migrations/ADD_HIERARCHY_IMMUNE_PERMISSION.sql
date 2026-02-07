-- ============================================================================
-- HIERARCHIE WORKFLOW - SQL IMPLEMENTACE PRÁVA HIERARCHY_IMMUNE
-- ============================================================================
-- Datum: 13. prosince 2025
-- Právo: HIERARCHY_IMMUNE
-- Účel: Uživatel s tímto právem vidí všechna data bez ohledu na hierarchii
--       workflow. Hierarchie ho neomezuje ani nerozšiřuje viditelnost.
-- ============================================================================
-- Autor: GitHub Copilot & robex08
-- Verze: 1.0
-- ============================================================================

-- 1. PŘIDÁNÍ PRÁVA DO DATABÁZE
-- ============================================================================

INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('HIERARCHY_IMMUNE', 'Imunní vůči hierarchii workflow - vidí všechna data bez ohledu na hierarchii', 1)
ON DUPLICATE KEY UPDATE 
  popis = 'Imunní vůči hierarchii workflow - vidí všechna data bez ohledu na hierarchii',
  aktivni = 1;

-- 2. PŘIŘAZENÍ PRÁVA ADMIN ROLÍM
-- ============================================================================

-- Získat ID nově vytvořeného práva
SET @pravo_id = (SELECT id FROM 25_prava WHERE kod_prava = 'HIERARCHY_IMMUNE' LIMIT 1);

-- Přiřadit právo roli SUPERADMIN
INSERT IGNORE INTO 25_role_prava (role_id, pravo_id)
SELECT r.id, @pravo_id
FROM 25_role r
WHERE r.kod_role = 'SUPERADMIN';

-- Přiřadit právo roli ADMINISTRATOR
INSERT IGNORE INTO 25_role_prava (role_id, pravo_id)
SELECT r.id, @pravo_id
FROM 25_role r
WHERE r.kod_role = 'ADMINISTRATOR';

-- 3. VERIFIKACE
-- ============================================================================

-- Zkontrolovat, že právo bylo vytvořeno
SELECT 
  p.id,
  p.kod_prava,
  p.popis,
  p.aktivni
FROM 25_prava p
WHERE p.kod_prava = 'HIERARCHY_IMMUNE';

-- Zkontrolovat přiřazení k rolím
SELECT 
  r.kod_role,
  r.nazev_role,
  p.kod_prava,
  p.popis
FROM 25_role r
INNER JOIN 25_role_prava rp ON r.id = rp.role_id
INNER JOIN 25_prava p ON p.id = rp.pravo_id
WHERE p.kod_prava = 'HIERARCHY_IMMUNE'
ORDER BY r.kod_role;

-- 4. ROLLBACK (v případě potřeby)
-- ============================================================================

-- POZOR: Spustit pouze v případě potřeby vrátit změny!
-- DELETE FROM 25_role_prava WHERE pravo_id = (SELECT id FROM 25_prava WHERE kod_prava = 'HIERARCHY_IMMUNE');
-- DELETE FROM 25_prava WHERE kod_prava = 'HIERARCHY_IMMUNE';

-- ============================================================================
-- POZNÁMKY K POUŽITÍ
-- ============================================================================
-- 
-- Toto právo automaticky získávají:
-- - SUPERADMIN
-- - ADMINISTRATOR
--
-- Manuálně lze přiřadit specifickým uživatelům přes:
-- INSERT INTO 25_uzivatele_prava (uzivatel_id, pravo_id)
-- SELECT {USER_ID}, id FROM 25_prava WHERE kod_prava = 'HIERARCHY_IMMUNE';
--
-- Případně přes admin UI v části "Správa uživatelů" → "Práva"
-- ============================================================================
