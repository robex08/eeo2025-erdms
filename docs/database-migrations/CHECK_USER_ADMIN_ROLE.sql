-- ===================================================================
-- Kontrola a oprava SUPERADMIN role pro uživatele
-- Datum: 2025-12-19
-- ===================================================================

-- 1. 🔍 Zobrazit všechny uživatele a jejich role
SELECT 
    id,
    username,
    jmeno,
    prijmeni,
    email,
    role,
    aktivni,
    CASE 
        WHEN role IN ('SUPERADMIN', 'ADMINISTRATOR') THEN '✅ ADMIN - může hard delete'
        WHEN role = 'INVOICE_MANAGE' THEN '⚠️  Může spravovat faktury, ale NE hard delete'
        ELSE '❌ Nemůže mazat faktury'
    END as permission_check
FROM 25_uzivatele
WHERE aktivni = 1
ORDER BY 
    CASE role
        WHEN 'SUPERADMIN' THEN 1
        WHEN 'ADMINISTRATOR' THEN 2
        WHEN 'INVOICE_MANAGE' THEN 3
        ELSE 4
    END,
    username;

-- 2. 🔍 Zkontrolovat konkrétního uživatele (nahraďte 'vase_username')
-- SELECT id, username, role FROM 25_uzivatele WHERE username = 'vase_username';

-- 3. ✅ OPRAVA: Nastavit uživatele jako SUPERADMIN (pokud je potřeba)
-- BACKUP PŘED ZMĚNOU:
-- SELECT id, username, role, CURRENT_TIMESTAMP as backup_time 
-- FROM 25_uzivatele 
-- WHERE username = 'vase_username';

-- ZMĚNA ROLE (odkomentujte a upravte username):
-- UPDATE 25_uzivatele 
-- SET role = 'SUPERADMIN' 
-- WHERE username = 'vase_username' AND aktivni = 1;

-- 4. 🔍 Alternativní kontrola - přes 25_uzivatele_role tabulku (nový systém rolí)
SELECT 
    u.id,
    u.username,
    u.jmeno,
    u.prijmeni,
    u.role as legacy_role,
    GROUP_CONCAT(r.nazev_role SEPARATOR ', ') as new_roles,
    GROUP_CONCAT(r.kod_role SEPARATOR ', ') as role_codes
FROM 25_uzivatele u
LEFT JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
LEFT JOIN 25_role r ON ur.role_id = r.id
WHERE u.aktivni = 1
GROUP BY u.id, u.username, u.jmeno, u.prijmeni, u.role
ORDER BY u.username;

-- ===================================================================
-- POZNÁMKY:
-- ===================================================================
-- Backend kontroluje 25_uzivatele.role sloupec, NE 25_uzivatele_role tabulku
-- Pro hard delete faktury je potřeba role = 'SUPERADMIN' nebo 'ADMINISTRATOR'
-- Role 'INVOICE_MANAGE' umožňuje soft delete, ale NE hard delete
-- ===================================================================
