-- ============================================================================
-- MIGRACE: Práva pro Přehled pokladen v modulu Statistika a reporty  
-- Datum: 30. března 2026
-- Popis: Vytvoření nových práv pro zobrazení a export přehledu pokladen
-- ============================================================================

-- 1. Vytvořit nová práva (ignorovat pokud existují)
INSERT INTO `prava` (`kod_prava`, `popis`) 
SELECT 'CASHBOOK_OVERVIEW_VIEW', 'Zobrazení přehledu pokladen v sekci Statistika a reporty'
WHERE NOT EXISTS (SELECT 1 FROM prava WHERE kod_prava = 'CASHBOOK_OVERVIEW_VIEW');

INSERT INTO `prava` (`kod_prava`, `popis`)
SELECT 'CASHBOOK_OVERVIEW_EXPORT', 'Export přehledu pokladen do CSV/Excel'
WHERE NOT EXISTS (SELECT 1 FROM prava WHERE kod_prava = 'CASHBOOK_OVERVIEW_EXPORT');

-- 2. Přiřadit práva ADMIN a SUPERADMIN rolím (automaticky)
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

-- Hotovo
SELECT 'Migration completed successfully' AS status;
