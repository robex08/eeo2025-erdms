-- ============================================================================
-- TELEFONNÍ SEZNAM - SQL IMPLEMENTACE PRÁVA
-- ============================================================================
-- Datum: 29. listopadu 2025
-- Právo: PHONEBOOK_VIEW
-- Účel: Přístup k telefonnímu seznamu (pouze čtení)
-- ============================================================================

-- 1. PŘIDÁNÍ PRÁVA DO DATABÁZE
-- ============================================================================

INSERT INTO prava (kod_prava, popis, aktivni) 
VALUES ('PHONEBOOK_VIEW', 'Přístup k telefonnímu seznamu (pouze čtení)', 1);

-- Případně pokud máte také sloupce created_at, updated_at:
-- INSERT INTO prava (kod_prava, popis, aktivni, created_at, updated_at) 
-- VALUES ('PHONEBOOK_VIEW', 'Přístup k telefonnímu seznamu (pouze čtení)', 1, NOW(), NOW());


-- 2. PŘIŘAZENÍ PRÁVA ADMIN ROLÍM
-- ============================================================================

-- Získat ID nově vytvořeného práva
SET @pravo_id = (SELECT id FROM prava WHERE kod_prava = 'PHONEBOOK_VIEW' LIMIT 1);

-- Přiřadit právo roli SUPERADMIN
INSERT INTO role_prava (role_id, pravo_id)
SELECT r.id, @pravo_id
FROM role r
WHERE r.kod_role = 'SUPERADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_prava rp 
    WHERE rp.role_id = r.id AND rp.pravo_id = @pravo_id
  );

-- Přiřadit právo roli ADMINISTRATOR
INSERT INTO role_prava (role_id, pravo_id)
SELECT r.id, @pravo_id
FROM role r
WHERE r.kod_role = 'ADMINISTRATOR'
  AND NOT EXISTS (
    SELECT 1 FROM role_prava rp 
    WHERE rp.role_id = r.id AND rp.pravo_id = @pravo_id
  );


-- 3. KONTROLA IMPLEMENTACE
-- ============================================================================

-- Kontrola, že právo bylo přidáno
SELECT * FROM prava WHERE kod_prava = 'PHONEBOOK_VIEW';

-- Kontrola přiřazení k rolím
SELECT 
  r.kod_role,
  r.nazev_role,
  p.kod_prava,
  p.popis
FROM role r
JOIN role_prava rp ON r.id = rp.role_id
JOIN prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'PHONEBOOK_VIEW';


-- 4. PŘIŘAZENÍ PRÁVA KONKRÉTNÍMU UŽIVATELI (volitelné)
-- ============================================================================

-- Pokud chcete přiřadit právo přímo konkrétnímu uživateli (mimo role):
-- SET @user_id = 123; -- ID uživatele
-- SET @pravo_id = (SELECT id FROM prava WHERE kod_prava = 'PHONEBOOK_VIEW' LIMIT 1);
-- 
-- INSERT INTO user_prava (user_id, pravo_id)
-- VALUES (@user_id, @pravo_id)
-- ON DUPLICATE KEY UPDATE pravo_id = pravo_id;


-- 5. ODEBRAT PRÁVO (rollback)
-- ============================================================================
-- Použijte pouze v případě potřeby vrátit změny zpět

-- DELETE FROM role_prava 
-- WHERE pravo_id = (SELECT id FROM prava WHERE kod_prava = 'PHONEBOOK_VIEW');
-- 
-- DELETE FROM user_prava 
-- WHERE pravo_id = (SELECT id FROM prava WHERE kod_prava = 'PHONEBOOK_VIEW');
-- 
-- DELETE FROM prava WHERE kod_prava = 'PHONEBOOK_VIEW';


-- ============================================================================
-- POZNÁMKY
-- ============================================================================
-- 
-- 1. Frontend je připraven a čeká na toto právo
-- 2. Menu položka se zobrazí automaticky po implementaci
-- 3. Právo je type VIEW (pouze čtení), žádné editace
-- 4. Admin role (SUPERADMIN, ADMINISTRATOR) mají právo automaticky
-- 
-- ============================================================================
