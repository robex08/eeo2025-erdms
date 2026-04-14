-- ============================================================================
-- MIGRACE: OPRAVA práv pro Přehled pokladen v Stats & Reporty
-- Datum: 13. dubna 2026
-- Popis: Oprava chybně vytvořených práv CASHBOOK_OVERVIEW_* na CASHBOOK_REPORTS_*
-- 
-- PROBLÉM: Migrace 2026_03_30_cashbook_overview_permissions.sql vytvořila
--          špatné názvy práv (CASHBOOK_OVERVIEW_*) místo správných (CASHBOOK_REPORTS_*)
--          které používá backend API a frontend.
-- 
-- ŘEŠENÍ: Smazat špatná práva a vytvořit správná.
-- ============================================================================

USE `eeo2025`;

-- ============================================================================
-- KROK 1: Smazat chybně vytvořená práva z předchozí migrace
-- ============================================================================

-- Smazat přiřazení práv rolím
DELETE FROM `25_role_prava` 
WHERE pravo_id IN (
    SELECT id FROM `25_prava` 
    WHERE kod_prava IN ('CASHBOOK_OVERVIEW_VIEW', 'CASHBOOK_OVERVIEW_EXPORT')
);

-- Smazat samotná práva
DELETE FROM `25_prava` 
WHERE kod_prava IN ('CASHBOOK_OVERVIEW_VIEW', 'CASHBOOK_OVERVIEW_EXPORT');

-- ============================================================================
-- KROK 2: Vytvořit SPRÁVNÁ práva podle implementace
-- ============================================================================

INSERT IGNORE INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) VALUES
('CASHBOOK_REPORTS_VIEW', 'Zobrazení přehledu pokladen v reportech', 1),
('CASHBOOK_REPORTS_MANAGE', 'Správa reportů pokladen', 1),
('CASHBOOK_REPORTS_EXPORT', 'Export přehledu pokladen do CSV/Excel', 1);

-- ============================================================================
-- KROK 3: Přiřadit práva rolím (role-level, user_id = -1)
-- ============================================================================

-- 3.1 Administrátoři → vše
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
  AND p.kod_prava IN ('CASHBOOK_REPORTS_VIEW', 'CASHBOOK_REPORTS_MANAGE', 'CASHBOOK_REPORTS_EXPORT');

-- 3.2 Hlavní účetní → vše (VIEW, MANAGE, EXPORT)
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role = 'HLAVNI_UCETNI'
  AND p.kod_prava IN ('CASHBOOK_REPORTS_VIEW', 'CASHBOOK_REPORTS_MANAGE', 'CASHBOOK_REPORTS_EXPORT');

-- 3.3 Účetní → VIEW a EXPORT
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role = 'UCETNI'
  AND p.kod_prava IN ('CASHBOOK_REPORTS_VIEW', 'CASHBOOK_REPORTS_EXPORT');

-- 3.4 Správce rozpočtu → VIEW
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role = 'SPRAVCE_ROZPOCTU'
  AND p.kod_prava = 'CASHBOOK_REPORTS_VIEW';

-- 3.5 Rozpočtář → VIEW
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role = 'ROZPOCTAR'
  AND p.kod_prava = 'CASHBOOK_REPORTS_VIEW';

-- ============================================================================
-- VERIFIKACE: Zobrazení vytvořených práv a jejich přiřazení
-- ============================================================================

SELECT 
    p.kod_prava AS 'Kód práva',
    p.popis AS 'Popis',
    p.aktivni AS 'Aktivní',
    COUNT(DISTINCT rp.role_id) AS 'Počet rolí',
    GROUP_CONCAT(DISTINCT r.nazev_role ORDER BY r.nazev_role SEPARATOR ', ') AS 'Přiřazené role'
FROM `25_prava` p
LEFT JOIN `25_role_prava` rp ON p.id = rp.pravo_id AND rp.user_id = -1 AND rp.aktivni = 1
LEFT JOIN `25_role` r ON rp.role_id = r.id
WHERE p.kod_prava LIKE 'CASHBOOK_%'
GROUP BY p.id, p.kod_prava, p.popis, p.aktivni
ORDER BY p.kod_prava;

-- ============================================================================
-- POZNÁMKY:
-- ============================================================================
-- 
-- 1. Tato migrace OPRAVUJE chybu z migrace 2026_03_30_cashbook_overview_permissions.sql
-- 
-- 2. Správné názvy práv podle backend API (cashbookHandlersExtended.php):
--    - CASHBOOK_REPORTS_VIEW   (řádek 1533, 1844)
--    - CASHBOOK_REPORTS_MANAGE (řádek 1533, 1844)
--    - CASHBOOK_REPORTS_EXPORT (řádek 1533, 1844)
-- 
-- 3. Frontend (StatsReportsPage.js) používá stejné názvy (řádek 2327)
-- 
-- 4. Po spuštění migrace doporučuji přejmenovat starý soubor:
--    mv migrations/2026_03_30_cashbook_overview_permissions.sql \
--       migrations/DEPRECATED_2026_03_30_cashbook_overview_permissions.sql.bak
-- 
-- ============================================================================
