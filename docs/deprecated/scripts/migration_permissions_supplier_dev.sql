-- ============================================================================
-- MIGRACE OPRÁVNĚNÍ: Sjednocení CONTACT_* a SUPPLIER_* práv
-- Prostředí: DEV
-- Datum: 2025-01-05
-- Autor: robex08
-- Účel: Odstranit duplicitu mezi CONTACT_* a SUPPLIER_* právy,
--       přidat SUPPLIER_VIEW místo SUPPLIER_READ,
--       přidat PHONEBOOK_MANAGE pro konzistenci
-- ============================================================================

-- ====================
-- 1. KONTROLA SOUČASNÉHO STAVU
-- ====================

SELECT 'Současná práva před migrací:' as info;
SELECT id, kod_prava, popis 
FROM 25_prava 
WHERE kod_prava LIKE '%CONTACT%' 
   OR kod_prava LIKE '%SUPPLIER%' 
   OR kod_prava LIKE '%PHONEBOOK%'
ORDER BY kod_prava;

SELECT '
Uživatelé s CONTACT_* právy:' as info;
SELECT u.username, p.kod_prava, p.nazev
FROM 25_uzivatele u
JOIN 25_uzivatele_prava up ON u.id = up.id_uzivatel
JOIN 25_prava p ON up.id = p.id
WHERE p.kod_prava LIKE 'CONTACT_%'
ORDER BY u.username, p.kod_prava;

-- ====================
-- 2. PŘEJMENOVÁNÍ A NOVÁ PRÁVA
-- ====================

-- Přejmenovat SUPPLIER_READ na SUPPLIER_VIEW (konzistentní s PHONEBOOK_VIEW)
UPDATE 25_prava 
SET kod_prava = 'SUPPLIER_VIEW',
    popis = 'Oprávnění k prohlížení dodavatelů (vlastní úsek + globální)'
WHERE kod_prava = 'SUPPLIER_READ';

SELECT 'Přejmenováno SUPPLIER_READ → SUPPLIER_VIEW' as status;

-- Přidat nová práva pokud neexistují
INSERT INTO 25_prava (kod_prava, popis)
SELECT 'SUPPLIER_VIEW', 'Oprávnění k prohlížení dodavatelů (vlastní úsek + globální)'
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'SUPPLIER_VIEW');

INSERT INTO 25_prava (kod_prava, popis)
SELECT 'SUPPLIER_CREATE', 'Oprávnění k vytváření nových dodavatelů'
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'SUPPLIER_CREATE');

INSERT INTO 25_prava (kod_prava, popis)
SELECT 'SUPPLIER_DELETE', 'Oprávnění k mazání dodavatelů'
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'SUPPLIER_DELETE');

INSERT INTO 25_prava (kod_prava, popis)
SELECT 'PHONEBOOK_MANAGE', 'Plný přístup k telefonnímu seznamu zaměstnanců (všechny operace)'
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'PHONEBOOK_MANAGE');

SELECT 'Vytvořena nová práva: SUPPLIER_CREATE, SUPPLIER_DELETE, PHONEBOOK_MANAGE' as status;

-- ====================
-- 3. MIGRACE UŽIVATELSKÝCH PRÁV
-- ====================

-- 3.1 CONTACT_MANAGE → SUPPLIER_MANAGE
-- Uživatelé s CONTACT_MANAGE dostanou SUPPLIER_MANAGE
INSERT INTO 25_uzivatele_prava (id_uzivatel, id)
SELECT 
    up.id_uzivatel, 
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_MANAGE') as id
FROM 25_uzivatele_prava up
JOIN 25_prava p ON up.id = p.id
WHERE p.kod_prava = 'CONTACT_MANAGE'
AND NOT EXISTS (
    SELECT 1 FROM 25_uzivatele_prava up2
    JOIN 25_prava p2 ON up2.id = p2.id
    WHERE up2.id_uzivatel = up.id_uzivatel 
    AND p2.kod_prava = 'SUPPLIER_MANAGE'
);

SELECT CONCAT('Migrace CONTACT_MANAGE → SUPPLIER_MANAGE: ', ROW_COUNT(), ' uživatelů') as status;

-- 3.2 CONTACT_READ → SUPPLIER_VIEW
-- Uživatelé s CONTACT_READ dostanou SUPPLIER_VIEW
INSERT INTO 25_uzivatele_prava (id_uzivatel, id)
SELECT 
    up.id_uzivatel, 
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_VIEW') as id
FROM 25_uzivatele_prava up
JOIN 25_prava p ON up.id = p.id
WHERE p.kod_prava = 'CONTACT_READ'
AND NOT EXISTS (
    SELECT 1 FROM 25_uzivatele_prava up2
    JOIN 25_prava p2 ON up2.id = p2.id
    WHERE up2.id_uzivatel = up.id_uzivatel 
    AND p2.kod_prava = 'SUPPLIER_VIEW'
);

SELECT CONCAT('Migrace CONTACT_READ → SUPPLIER_VIEW: ', ROW_COUNT(), ' uživatelů') as status;

-- 3.3 CONTACT_EDIT → SUPPLIER_EDIT
-- Uživatelé s CONTACT_EDIT dostanou SUPPLIER_EDIT
INSERT INTO 25_uzivatele_prava (id_uzivatel, id)
SELECT 
    up.id_uzivatel, 
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_EDIT') as id
FROM 25_uzivatele_prava up
JOIN 25_prava p ON up.id = p.id
WHERE p.kod_prava = 'CONTACT_EDIT'
AND NOT EXISTS (
    SELECT 1 FROM 25_uzivatele_prava up2
    JOIN 25_prava p2 ON up2.id = p2.id
    WHERE up2.id_uzivatel = up.id_uzivatel 
    AND p2.kod_prava = 'SUPPLIER_EDIT'
);

SELECT CONCAT('Migrace CONTACT_EDIT → SUPPLIER_EDIT: ', ROW_COUNT(), ' uživatelů') as status;

-- ====================
-- 4. MIGRACE PRÁV V ROLÍCH
-- ====================

-- 4.1 Role s CONTACT_MANAGE dostanou SUPPLIER_MANAGE
INSERT INTO 25_role_prava (id_role, id)
SELECT 
    rp.id_role, 
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_MANAGE') as id
FROM 25_role_prava rp
JOIN 25_prava p ON rp.id = p.id
WHERE p.kod_prava = 'CONTACT_MANAGE'
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp2
    JOIN 25_prava p2 ON rp2.id = p2.id
    WHERE rp2.id_role = rp.id_role 
    AND p2.kod_prava = 'SUPPLIER_MANAGE'
);

SELECT CONCAT('Migrace rolí CONTACT_MANAGE → SUPPLIER_MANAGE: ', ROW_COUNT(), ' rolí') as status;

-- 4.2 Role s CONTACT_READ dostanou SUPPLIER_VIEW
INSERT INTO 25_role_prava (id_role, id)
SELECT 
    rp.id_role, 
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_VIEW') as id
FROM 25_role_prava rp
JOIN 25_prava p ON rp.id = p.id
WHERE p.kod_prava = 'CONTACT_READ'
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp2
    JOIN 25_prava p2 ON rp2.id = p2.id
    WHERE rp2.id_role = rp.id_role 
    AND p2.kod_prava = 'SUPPLIER_VIEW'
);

SELECT CONCAT('Migrace rolí CONTACT_READ → SUPPLIER_VIEW: ', ROW_COUNT(), ' rolí') as status;

-- 4.3 Role s CONTACT_EDIT dostanou SUPPLIER_EDIT
INSERT INTO 25_role_prava (id_role, id)
SELECT 
    rp.id_role, 
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_EDIT') as id
FROM 25_role_prava rp
JOIN 25_prava p ON rp.id = p.id
WHERE p.kod_prava = 'CONTACT_EDIT'
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp2
    JOIN 25_prava p2 ON rp2.id = p2.id
    WHERE rp2.id_role = rp.id_role 
    AND p2.kod_prava = 'SUPPLIER_EDIT'
);

SELECT CONCAT('Migrace rolí CONTACT_EDIT → SUPPLIER_EDIT: ', ROW_COUNT(), ' rolí') as status;

-- ====================
-- 5. SMAZÁNÍ STARÝCH PRÁV (VOLITELNÉ - OPATRNĚ!)
-- ====================

-- POZNÁMKA: Toto spustíme až po ověření že vše funguje!
-- Zakomentováno pro bezpečnost - odkomentovat ručně až po testování

-- -- Smazání přiřazení uživatelům
-- DELETE up FROM 25_uzivatele_prava up
-- JOIN 25_prava p ON up.id = p.id
-- WHERE p.kod_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT');
-- 
-- SELECT 'Smazána přiřazení CONTACT_* práv uživatelům' as status;
-- 
-- -- Smazání přiřazení rolím
-- DELETE rp FROM 25_role_prava rp
-- JOIN 25_prava p ON rp.id = p.id
-- WHERE p.kod_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT');
-- 
-- SELECT 'Smazána přiřazení CONTACT_* práv rolím' as status;
-- 
-- -- Smazání samotných práv
-- DELETE FROM 25_prava 
-- WHERE kod_prava IN ('CONTACT_MANAGE', 'CONTACT_READ', 'CONTACT_EDIT');
-- 
-- SELECT 'Smazána CONTACT_* práva z tabulky 25_prava' as status;

-- ====================
-- 6. FINÁLNÍ KONTROLA
-- ====================

SELECT '
Práva po migraci:' as info;
SELECT id, kod_prava, popis 
FROM 25_prava 
WHERE kod_prava LIKE '%CONTACT%' 
   OR kod_prava LIKE '%SUPPLIER%' 
   OR kod_prava LIKE '%PHONEBOOK%'
ORDER BY kod_prava;

SELECT '
Uživatelé s SUPPLIER_* právy:' as info;
SELECT u.username, p.kod_prava, p.nazev, COUNT(*) as pocet
FROM 25_uzivatele u
JOIN 25_uzivatele_prava up ON u.id = up.id_uzivatel
JOIN 25_prava p ON up.id = p.id
WHERE p.kod_prava LIKE 'SUPPLIER_%'
GROUP BY u.username, p.kod_prava, p.nazev
ORDER BY u.username, p.kod_prava;

SELECT '
Role s SUPPLIER_* právy:' as info;
SELECT r.kod_role, p.kod_prava, p.nazev
FROM 25_role r
JOIN 25_role_prava rp ON r.id_role = rp.id_role
JOIN 25_prava p ON rp.id = p.id
WHERE p.kod_prava LIKE 'SUPPLIER_%'
ORDER BY r.kod_role, p.kod_prava;

-- ====================
-- HOTOVO!
-- ====================
SELECT '
✅ Migrace oprávnění dokončena!' as status;
SELECT 'Zkontrolujte výše uvedené výstupy a otestujte funkčnost.' as dalsi_krok;
SELECT 'Po ověření funkčnosti můžete odkomentovat sekci 5 pro smazání starých CONTACT_* práv.' as poznamka;
