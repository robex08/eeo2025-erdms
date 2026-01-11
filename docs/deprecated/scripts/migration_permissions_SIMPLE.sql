-- ============================================================================
-- MIGRACE OPRÁVNĚNÍ: Sjednocení CONTACT_* a SUPPLIER_* práv - SIMPLIFIED
-- Prostředí: DEV
-- Datum: 2025-01-05
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
-- 3. MIGRACE PRÁV V ROLÍCH
-- ====================

-- 3.1 Role s CONTACT_MANAGE dostanou SUPPLIER_MANAGE
INSERT INTO 25_role_prava (user_id, role_id, pravo_id)
SELECT DISTINCT 
    rp.user_id,
    rp.role_id,
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_MANAGE') as pravo_id
FROM 25_role_prava rp
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'CONTACT_MANAGE'
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp2
    JOIN 25_prava p2 ON rp2.pravo_id = p2.id
    WHERE rp2.user_id = rp.user_id
    AND rp2.role_id = rp.role_id
    AND p2.kod_prava = 'SUPPLIER_MANAGE'
);

SELECT CONCAT('Migrace rolí CONTACT_MANAGE → SUPPLIER_MANAGE: ', ROW_COUNT(), ' záznamů') as status;

-- 3.2 Role s CONTACT_READ dostanou SUPPLIER_VIEW
INSERT INTO 25_role_prava (user_id, role_id, pravo_id)
SELECT DISTINCT 
    rp.user_id,
    rp.role_id,
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_VIEW') as pravo_id
FROM 25_role_prava rp
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'CONTACT_READ'
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp2
    JOIN 25_prava p2 ON rp2.pravo_id = p2.id
    WHERE rp2.user_id = rp.user_id
    AND rp2.role_id = rp.role_id
    AND p2.kod_prava = 'SUPPLIER_VIEW'
);

SELECT CONCAT('Migrace rolí CONTACT_READ → SUPPLIER_VIEW: ', ROW_COUNT(), ' záznamů') as status;

-- 3.3 Role s CONTACT_EDIT dostanou SUPPLIER_EDIT
INSERT INTO 25_role_prava (user_id, role_id, pravo_id)
SELECT DISTINCT 
    rp.user_id,
    rp.role_id,
    (SELECT id FROM 25_prava WHERE kod_prava = 'SUPPLIER_EDIT') as pravo_id
FROM 25_role_prava rp
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'CONTACT_EDIT'
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp2
    JOIN 25_prava p2 ON rp2.pravo_id = p2.id
    WHERE rp2.user_id = rp.user_id
    AND rp2.role_id = rp.role_id
    AND p2.kod_prava = 'SUPPLIER_EDIT'
);

SELECT CONCAT('Migrace rolí CONTACT_EDIT → SUPPLIER_EDIT: ', ROW_COUNT(), ' záznamů') as status;

-- ====================
-- 4. FINÁLNÍ KONTROLA
-- ====================

SELECT '
Práva po migraci:' as info;
SELECT id, kod_prava, popis 
FROM 25_prava 
WHERE kod_prava LIKE '%CONTACT%' 
   OR kod_prava LIKE '%SUPPLIER%' 
   OR kod_prava LIKE '%PHONEBOOK%'
ORDER BY kod_prava;

-- ====================
-- 5. POZNÁMKY
-- ====================

SELECT '
✅ Migrace dokončena!' as status;
SELECT 'Staré CONTACT_* práva můžete smazat po důkladném otestování.' as poznamka;
SELECT 'Backend handlers.php již upraven na SUPPLIER_MANAGE.' as backend_status;
