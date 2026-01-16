-- Test script pro Department-Based Subordinate Permissions
-- Datum: 16. ledna 2026
-- Autor: GitHub Copilot & robex08

-- ============================================================================
-- TEST 1: Kontrola usek_id assignment
-- ============================================================================
-- Ověřit, že uživatelé mají přiřazené usek_id

SELECT 
    u.id,
    u.username,
    u.usek_id,
    us.nazev_useku,
    COUNT(u2.id) as pocet_kolegu
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
LEFT JOIN 25_uzivatele u2 ON u2.usek_id = u.usek_id AND u2.aktivni = 1
WHERE u.aktivni = 1
GROUP BY u.id, u.username, u.usek_id, us.nazev_useku
ORDER BY u.usek_id, u.username;

-- ============================================================================
-- TEST 2: Uživatelé bez usek_id (subordinate práva NEBUDOU fungovat)
-- ============================================================================

SELECT 
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as full_name
FROM 25_uzivatele u
WHERE u.aktivni = 1
AND (u.usek_id IS NULL OR u.usek_id = 0)
ORDER BY u.username;

-- Pokud jsou zde uživatelé → přiřadit jim usek_id!

-- ============================================================================
-- TEST 3: Kdo má právo ORDER_READ_SUBORDINATE?
-- ============================================================================

SELECT 
    u.id,
    u.username,
    u.usek_id,
    us.nazev_useku,
    'Přímé právo' as zdroj
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
JOIN 25_role_prava rp ON rp.user_id = u.id
WHERE rp.pravo_id = 4  -- ORDER_READ_SUBORDINATE
AND u.aktivni = 1

UNION

SELECT 
    u.id,
    u.username,
    u.usek_id,
    us.nazev_useku,
    CONCAT('Role: ', r.nazev_role) as zdroj
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
JOIN 25_uzivatele_role ur ON ur.uzivatel_id = u.id
JOIN 25_role_prava rp ON rp.role_id = ur.role_id AND rp.user_id = -1
JOIN 25_role r ON r.id = ur.role_id
WHERE rp.pravo_id = 4  -- ORDER_READ_SUBORDINATE
AND u.aktivni = 1

ORDER BY usek_id, username;

-- ============================================================================
-- TEST 4: Kdo má právo ORDER_EDIT_SUBORDINATE?
-- ============================================================================

SELECT 
    u.id,
    u.username,
    u.usek_id,
    us.nazev_useku,
    'Přímé právo' as zdroj
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
JOIN 25_role_prava rp ON rp.user_id = u.id
WHERE rp.pravo_id = 20  -- ORDER_EDIT_SUBORDINATE
AND u.aktivni = 1

UNION

SELECT 
    u.id,
    u.username,
    u.usek_id,
    us.nazev_useku,
    CONCAT('Role: ', r.nazev_role) as zdroj
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
JOIN 25_uzivatele_role ur ON ur.uzivatel_id = u.id
JOIN 25_role_prava rp ON rp.role_id = ur.role_id AND rp.user_id = -1
JOIN 25_role r ON r.id = ur.role_id
WHERE rp.pravo_id = 20  -- ORDER_EDIT_SUBORDINATE
AND u.aktivni = 1

ORDER BY usek_id, username;

-- ============================================================================
-- TEST 5: Simulace - jaké objednávky uvidí uživatel X?
-- ============================================================================
-- Nahraď :user_id skutečným ID testovacího uživatele

SET @test_user_id = 123;  -- 🔥 ZMĚŇ NA SKUTEČNÉ ID

-- Krok 1: Zjisti usek_id testovacího uživatele
SELECT 
    @test_usek_id := usek_id 
FROM 25_uzivatele 
WHERE id = @test_user_id;

-- Krok 2: Najdi kolegy ze stejného úseku
SELECT 
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as full_name,
    u.usek_id
FROM 25_uzivatele u
WHERE u.usek_id = @test_usek_id
AND u.aktivni = 1
ORDER BY u.username;

-- Krok 3: Objednávky, které uživatel UVIDÍ s ORDER_READ/EDIT_SUBORDINATE
SELECT 
    o.id,
    o.cislo_objednavky,
    o.stav_objednavky,
    CONCAT(u_obj.jmeno, ' ', u_obj.prijmeni) as objednatel,
    CONCAT(u_gar.jmeno, ' ', u_gar.prijmeni) as garant,
    o.dt_objednavky,
    CASE 
        WHEN o.objednatel_id = @test_user_id OR 
             o.uzivatel_id = @test_user_id OR 
             o.garant_uzivatel_id = @test_user_id OR 
             o.schvalovatel_id = @test_user_id THEN 'Vlastní (je v roli)'
        ELSE 'Kolega z úseku'
    END as viditelnost_duvod
FROM 25a_objednavky o
LEFT JOIN 25_uzivatele u_obj ON o.objednatel_id = u_obj.id
LEFT JOIN 25_uzivatele u_gar ON o.garant_uzivatel_id = u_gar.id
WHERE o.aktivni = 1
AND (
    -- Všechny objednávky kolegů z úseku (12 rolí)
    o.uzivatel_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.objednatel_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.garant_uzivatel_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.schvalovatel_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.prikazce_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.uzivatel_akt_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.odesilatel_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.dodavatel_potvrdil_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.zverejnil_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.fakturant_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.dokoncil_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
    OR o.potvrdil_vecnou_spravnost_id IN (SELECT id FROM 25_uzivatele WHERE usek_id = @test_usek_id AND aktivni = 1)
)
ORDER BY o.dt_objednavky DESC
LIMIT 20;

-- ============================================================================
-- TEST 6: Kontrola konfliktu s hierarchií
-- ============================================================================
-- Ověřit, že subordinate práva fungují i když hierarchie NENÍ zapnutá

SELECT 
    hp.id,
    hp.nazev_profilu,
    hp.aktivni,
    hp.created_at,
    CASE 
        WHEN hp.aktivni = 1 THEN '⚠️ Hierarchie ZAPNUTÁ - subordinate práva fungují paralelně'
        ELSE '✅ Hierarchie VYPNUTÁ - subordinate práva fungují samostatně'
    END as stav
FROM 25_hierarchie_profily hp
ORDER BY hp.aktivni DESC, hp.created_at DESC;

-- ============================================================================
-- MIGRATION SCRIPTS (pokud potřeba)
-- ============================================================================

-- Přiřadit ORDER_READ_SUBORDINATE roli "Zástupce vedoucího"
/*
INSERT INTO 25_role_prava (role_id, pravo_id, user_id)
SELECT 
    r.id as role_id,
    4 as pravo_id,  -- ORDER_READ_SUBORDINATE
    -1 as user_id   -- -1 znamená právo z role
FROM 25_role r
WHERE r.nazev_role = 'Zástupce vedoucího'
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp2 
    WHERE rp2.role_id = r.id AND rp2.pravo_id = 4 AND rp2.user_id = -1
);
*/

-- Přiřadit ORDER_EDIT_SUBORDINATE roli "Vedoucí úseku"
/*
INSERT INTO 25_role_prava (role_id, pravo_id, user_id)
SELECT 
    r.id as role_id,
    20 as pravo_id,  -- ORDER_EDIT_SUBORDINATE
    -1 as user_id
FROM 25_role r
WHERE r.nazev_role = 'Vedoucí úseku'
AND NOT EXISTS (
    SELECT 1 FROM 25_role_prava rp2 
    WHERE rp2.role_id = r.id AND rp2.pravo_id = 20 AND rp2.user_id = -1
);
*/

-- ============================================================================
-- DEBUG: Error log monitoring
-- ============================================================================
-- Po nasazení zkontrolovat PHP error log:
-- tail -f /var/log/apache2/error.log | grep "DEPARTMENT SUBORDINATE"
-- 
-- Očekávaný výstup:
-- ✅ DEPARTMENT SUBORDINATE: Applied ORDER_EDIT_SUBORDINATE filter for 8 colleagues
-- ✅ DEPARTMENT SUBORDINATE: Applied ORDER_READ_SUBORDINATE filter for 8 colleagues
-- ⚠️ DEPARTMENT SUBORDINATE: User 123 has no usek_id or no colleagues in department
