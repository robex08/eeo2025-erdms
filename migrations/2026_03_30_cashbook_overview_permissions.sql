-- ============================================================================
-- MIGRACE: Práva pro Přehled pokladen v modulu Statistika a reporty
-- Datum: 30. března 2026
-- Popis: Vytvoření nových práv pro zobrazení a export přehledu pokladen
-- ============================================================================

USE eeo2025;

-- 1. Vytvořit nová práva
INSERT INTO `prava` (`kod_prava`, `popis`) VALUES
('CASHBOOK_OVERVIEW_VIEW', 'Zobrazení přehledu pokladen v sekci Statistika a reporty'),
('CASHBOOK_OVERVIEW_EXPORT', 'Export přehledu pokladen do CSV/Excel');

-- 2. Přiřadit práva ADMIN roli (automaticky)
INSERT INTO role_prava (role_id, pravo_id)
SELECT r.id, p.id 
FROM roles r
CROSS JOIN prava p
WHERE r.nazev_role IN ('ADMIN', 'SUPERADMIN')
  AND p.kod_prava IN ('CASHBOOK_OVERVIEW_VIEW', 'CASHBOOK_OVERVIEW_EXPORT')
  AND NOT EXISTS (
    SELECT 1 FROM role_prava rp2 
    WHERE rp2.role_id = r.id AND rp2.pravo_id = p.id
  );

-- 3. Přiřadit právo VIEW i uživatelům s CASHBOOK_EDIT (pokud takové právo existuje)
INSERT INTO role_prava (role_id, pravo_id)
SELECT DISTINCT rp.role_id, p.id
FROM role_prava rp
CROSS JOIN prava p
WHERE rp.pravo_id IN (SELECT id FROM prava WHERE kod_prava LIKE 'CASHBOOK%')
  AND p.kod_prava = 'CASHBOOK_OVERVIEW_VIEW'
  AND NOT EXISTS (
    SELECT 1 FROM role_prava rp2 
    WHERE rp2.role_id = rp.role_id AND rp2.pravo_id = p.id
  );

-- Ověření
SELECT 
    p.kod_prava,
    p.popis,
    COUNT(DISTINCT rp.role_id) as pocet_roli,
    GROUP_CONCAT(DISTINCT r.nazev_role SEPARATOR ', ') as role
FROM prava p
LEFT JOIN role_prava rp ON p.id = rp.pravo_id
LEFT JOIN roles r ON rp.role_id = r.id
WHERE p.kod_prava LIKE 'CASHBOOK_OVERVIEW%'
GROUP BY p.id, p.kod_prava, p.popis
ORDER BY p.kod_prava;
