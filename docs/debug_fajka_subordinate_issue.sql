-- Debug: Proč Fajka nevidí objednávky Šulgana?
-- Datum: 16. ledna 2026

-- ============================================================================
-- KROK 1: Zkontrolovat Fajku - usek_id a práva
-- ============================================================================

SELECT 
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as full_name,
    u.usek_id,
    us.nazev_useku,
    us.zkratka
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
WHERE u.username LIKE '%fajka%' OR u.prijmeni LIKE '%Fajka%'
LIMIT 5;

-- Práva Fajky:
SELECT DISTINCT p.id, p.kod_prava, p.nazev_prava
FROM 25_prava p
WHERE p.kod_prava LIKE 'ORDER_%'
AND p.id IN (
    -- Přímá práva
    SELECT rp.pravo_id FROM 25_role_prava rp 
    JOIN 25_uzivatele u ON rp.user_id = u.id
    WHERE u.username LIKE '%fajka%' OR u.prijmeni LIKE '%Fajka%'
    
    UNION
    
    -- Práva z rolí
    SELECT rp.pravo_id 
    FROM 25_uzivatele u
    JOIN 25_uzivatele_role ur ON ur.uzivatel_id = u.id
    JOIN 25_role_prava rp ON rp.role_id = ur.role_id AND rp.user_id = -1
    WHERE u.username LIKE '%fajka%' OR u.prijmeni LIKE '%Fajka%'
);

-- ============================================================================
-- KROK 2: Zkontrolovat Šulgana - usek_id
-- ============================================================================

SELECT 
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as full_name,
    u.usek_id,
    us.nazev_useku,
    us.zkratka
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
WHERE u.username LIKE '%sulgan%' OR u.prijmeni LIKE '%Sulgan%' OR u.prijmeni LIKE '%Šulgan%'
LIMIT 5;

-- ============================================================================
-- KROK 3: Jsou ve stejném úseku?
-- ============================================================================

SELECT 
    'Fajka' as uzivatel,
    u.id,
    u.username,
    u.usek_id,
    us.nazev_useku
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
WHERE u.username LIKE '%fajka%' OR u.prijmeni LIKE '%Fajka%'

UNION ALL

SELECT 
    'Šulgan' as uzivatel,
    u.id,
    u.username,
    u.usek_id,
    us.nazev_useku
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
WHERE u.username LIKE '%sulgan%' OR u.prijmeni LIKE '%Sulgan%' OR u.prijmeni LIKE '%Šulgan%';

-- ============================================================================
-- KROK 4: Všichni uživatelé na úseku PTN
-- ============================================================================

SELECT 
    u.id,
    u.username,
    CONCAT(u.jmeno, ' ', u.prijmeni) as full_name,
    u.usek_id,
    us.nazev_useku,
    us.zkratka
FROM 25_uzivatele u
LEFT JOIN 25_useky us ON u.usek_id = us.id
WHERE us.zkratka = 'PTN' OR us.nazev_useku LIKE '%PTN%'
ORDER BY u.username;

-- ============================================================================
-- KROK 5: Objednávky Šulgana
-- ============================================================================

SELECT 
    o.id,
    o.cislo_objednavky,
    o.stav_objednavky,
    o.objednatel_id,
    CONCAT(u_obj.jmeno, ' ', u_obj.prijmeni) as objednatel,
    o.garant_uzivatel_id,
    CONCAT(u_gar.jmeno, ' ', u_gar.prijmeni) as garant,
    o.uzivatel_id,
    CONCAT(u_uz.jmeno, ' ', u_uz.prijmeni) as uzivatel,
    o.dt_objednavky,
    o.aktivni
FROM 25a_objednavky o
LEFT JOIN 25_uzivatele u_obj ON o.objednatel_id = u_obj.id
LEFT JOIN 25_uzivatele u_gar ON o.garant_uzivatel_id = u_gar.id
LEFT JOIN 25_uzivatele u_uz ON o.uzivatel_id = u_uz.id
WHERE o.aktivni = 1
AND (
    u_obj.username LIKE '%sulgan%' OR u_obj.prijmeni LIKE '%Sulgan%' OR u_obj.prijmeni LIKE '%Šulgan%'
    OR u_gar.username LIKE '%sulgan%' OR u_gar.prijmeni LIKE '%Sulgan%' OR u_gar.prijmeni LIKE '%Šulgan%'
    OR u_uz.username LIKE '%sulgan%' OR u_uz.prijmeni LIKE '%Sulgan%' OR u_uz.prijmeni LIKE '%Šulgan%'
)
ORDER BY o.dt_objednavky DESC
LIMIT 10;

-- ============================================================================
-- KROK 6: Zkontrolovat úseky v databázi
-- ============================================================================

SELECT * FROM 25_useky WHERE zkratka LIKE '%PTN%' OR nazev_useku LIKE '%PTN%';
