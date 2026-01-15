-- ============================================================================
-- MIGRACE 2: Přidat profil_type a personalized_users do 25_hierarchie_vztahy
-- ============================================================================
-- Účel: 
--   1. profil_type - umožnit vztah jen pro notifikace nebo jen pro viditelnost
--   2. personalized_users - konkrétní uživatelé, které uživatel vidí
-- Datum: 15. ledna 2026
-- Autor: Robert Novák

-- Přidat profil_type
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN profil_type ENUM(
  'NOTIFIKACE',
  'VIDITELNOST',
  'PRAVA',
  'ALL'
) DEFAULT 'ALL' 
COMMENT 'Typ vztahu - co řídí (NOTIFIKACE=notifikace, VIDITELNOST=práva+viditelnost, ALL=vše)'
AFTER profil_id;

-- Přidat personalized_users
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN personalized_users JSON NULL 
COMMENT '[52, 87, 91] - pole user IDs s personalizovanou viditelností'
AFTER rozsirene_useky;

-- ============================================================================
-- Přidat optimalizované indexy
-- ============================================================================

-- Index pro nejčastější dotazy (filtrování podle uživatele + profilu + typu)
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_user_profil_type (
  user_id_1, 
  profil_id, 
  profil_type, 
  aktivni
);

-- Index pro filtrování viditelnosti objednávek
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_user_profil_visibility (
  user_id_1, 
  profil_id, 
  profil_type, 
  aktivni, 
  viditelnost_objednavky
);

-- Index pro filtrování podle úseků
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_usek_visibility (
  usek_id, 
  viditelnost_objednavky, 
  aktivni
);

-- Index pro filtrování podle lokalit
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_lokalita_visibility (
  lokalita_id, 
  viditelnost_objednavky, 
  aktivni
);

-- Update existujících vztahů (všechny budou ALL - zachování zpětné kompatibility)
UPDATE 25_hierarchie_vztahy 
SET profil_type = 'ALL' 
WHERE profil_type IS NULL;

-- ============================================================================
-- Ověření migrace
-- ============================================================================
-- SELECT * FROM 25_hierarchie_vztahy LIMIT 5;
-- SHOW CREATE TABLE 25_hierarchie_vztahy;
-- SHOW INDEX FROM 25_hierarchie_vztahy;
