-- ===================================================================
-- Kontrola oprávnění pro mazání faktur (NOVÝ SYSTÉM)
-- Datum: 2025-12-19
-- ===================================================================

-- 1. 🔍 Zkontrolovat uživatele a jejich admin role
SELECT 
    u.id,
    u.username,
    u.jmeno,
    u.prijmeni,
    GROUP_CONCAT(DISTINCT r.kod_role ORDER BY r.kod_role SEPARATOR ', ') as role_codes,
    GROUP_CONCAT(DISTINCT r.nazev_role ORDER BY r.nazev_role SEPARATOR ', ') as role_names,
    CASE 
        WHEN GROUP_CONCAT(r.kod_role) LIKE '%SUPERADMIN%' OR GROUP_CONCAT(r.kod_role) LIKE '%ADMINISTRATOR%' 
        THEN '✅ ADMIN - může hard delete'
        ELSE '❌ NENÍ ADMIN - nemůže hard delete'
    END as admin_status
FROM 25_uzivatele u
LEFT JOIN 25_uzivatele_role ur ON ur.uzivatel_id = u.id
LEFT JOIN 25_role r ON r.id = ur.role_id
WHERE u.aktivni = 1
GROUP BY u.id, u.username, u.jmeno, u.prijmeni
ORDER BY u.username;

-- 2. 🔍 Zkontrolovat INVOICE_MANAGE právo pro uživatele
SELECT 
    u.id,
    u.username,
    u.jmeno,
    u.prijmeni,
    GROUP_CONCAT(DISTINCT r.nazev_role ORDER BY r.nazev_role SEPARATOR ', ') as roles_with_permission,
    CASE 
        WHEN COUNT(p.id) > 0 THEN '✅ MÁ INVOICE_MANAGE - může soft delete'
        ELSE '❌ NEMÁ INVOICE_MANAGE - nemůže mazat faktury'
    END as invoice_manage_status
FROM 25_uzivatele u
LEFT JOIN 25_uzivatele_role ur ON ur.uzivatel_id = u.id
LEFT JOIN 25_role r ON r.id = ur.role_id
LEFT JOIN 25_role_prava rp ON rp.role_id = r.id
LEFT JOIN 25_prava p ON p.id = rp.pravo_id AND p.kod_prava = 'INVOICE_MANAGE'
WHERE u.aktivni = 1
GROUP BY u.id, u.username, u.jmeno, u.prijmeni
HAVING invoice_manage_status LIKE '%MÁ%' OR u.username = 'admin' OR u.username LIKE '%admin%'
ORDER BY u.username;

-- 3. 🔍 Detailní breakdown pro konkrétního uživatele (UPRAVTE USERNAME)
-- Odkomentujte a nahraďte 'your_username':
/*
SET @username = 'your_username';

SELECT 
    '=== UŽIVATEL ===' as section,
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as full_name,
    u.email
FROM 25_uzivatele u
WHERE u.username = @username;

SELECT 
    '=== ROLE ===' as section,
    r.id as role_id,
    r.kod_role,
    r.nazev_role
FROM 25_role r
INNER JOIN 25_uzivatele_role ur ON ur.role_id = r.id
INNER JOIN 25_uzivatele u ON u.id = ur.uzivatel_id
WHERE u.username = @username;

SELECT 
    '=== PRÁVA ===' as section,
    p.id as pravo_id,
    p.kod_prava,
    p.nazev as pravo_nazev,
    r.nazev_role as role_providing_permission
FROM 25_prava p
INNER JOIN 25_role_prava rp ON rp.pravo_id = p.id
INNER JOIN 25_role r ON r.id = rp.role_id
INNER JOIN 25_uzivatele_role ur ON ur.role_id = r.id
INNER JOIN 25_uzivatele u ON u.id = ur.uzivatel_id
WHERE u.username = @username
ORDER BY p.kod_prava;

SELECT 
    '=== VERDICT ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM 25_role r
            INNER JOIN 25_uzivatele_role ur ON ur.role_id = r.id
            INNER JOIN 25_uzivatele u ON u.id = ur.uzivatel_id
            WHERE u.username = @username 
            AND r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
        ) THEN '✅ MŮŽE HARD DELETE (je admin)'
        WHEN EXISTS (
            SELECT 1 FROM 25_prava p
            INNER JOIN 25_role_prava rp ON rp.pravo_id = p.id
            INNER JOIN 25_uzivatele_role ur ON ur.role_id = rp.role_id
            INNER JOIN 25_uzivatele u ON u.id = ur.uzivatel_id
            WHERE u.username = @username
            AND p.kod_prava = 'INVOICE_MANAGE'
        ) THEN '⚠️  MŮŽE SOFT DELETE (má INVOICE_MANAGE, ale není admin)'
        ELSE '❌ NEMŮŽE MAZAT FAKTURY (chybí INVOICE_MANAGE nebo admin role)'
    END as permission_status;
*/

-- 4. 📋 Seznam všech ADMIN uživatelů
SELECT 
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as full_name,
    r.kod_role as admin_role,
    r.nazev_role
FROM 25_uzivatele u
INNER JOIN 25_uzivatele_role ur ON ur.uzivatel_id = u.id
INNER JOIN 25_role r ON r.id = ur.role_id
WHERE u.aktivni = 1
AND r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
ORDER BY r.kod_role, u.username;

-- 5. 📋 Seznam uživatelů s INVOICE_MANAGE právem
SELECT 
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as full_name,
    GROUP_CONCAT(DISTINCT r.nazev_role SEPARATOR ', ') as roles_providing_permission
FROM 25_uzivatele u
INNER JOIN 25_uzivatele_role ur ON ur.uzivatel_id = u.id
INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
INNER JOIN 25_prava p ON p.id = rp.pravo_id
INNER JOIN 25_role r ON r.id = ur.role_id
WHERE u.aktivni = 1
AND p.kod_prava = 'INVOICE_MANAGE'
GROUP BY u.id, u.username, u.jmeno, u.prijmeni
ORDER BY u.username;

-- ===================================================================
-- POZNÁMKY:
-- ===================================================================
-- ✅ HARD DELETE: Vyžaduje roli SUPERADMIN nebo ADMINISTRATOR
-- ✅ SOFT DELETE: Vyžaduje právo INVOICE_MANAGE (přes 25_role_prava)
-- ✅ Backend kontroluje:
--    1. verify_token_v2() → kontroluje 25_uzivatele_role + 25_role.kod_role
--    2. handle_order_v2_delete_invoice() → kontroluje 25_role_prava + 25_prava.kod_prava
-- ===================================================================
