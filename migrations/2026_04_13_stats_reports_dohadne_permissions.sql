-- ============================================================================
-- MIGRACE: Práva pro sekci "Dohadné položky" v modulu Stats & Reporty
-- Datum: 13. dubna 2026
-- Popis: Přidání chybějících práv pro záložku "Dohadné položky"
-- DB: EEO-OSTRA-DEV (později PRODUKCE)
-- ============================================================================

USE `eeo2025`;

-- 1. Vytvořit nová práva pro Dohadné položky
INSERT IGNORE INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) VALUES
('DEFERRALS_VIEW', 'Zobrazení dohadných položek', 1),
('DEFERRALS_EDIT', 'Editace dohadných položek', 1),
('DEFERRALS_MANAGE', 'Správa dohadných položek', 1);

-- 2. Přiřadit práva administrátorským rolím automaticky
-- Role-level přiřazení (user_id = -1)
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
  AND p.kod_prava IN ('DEFERRALS_VIEW', 'DEFERRALS_EDIT', 'DEFERRALS_MANAGE');

-- 3. Přiřadit základní právo VIEW hlavnímu účetnímu a rozpočtářům
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('HLAVNI_UCETNI', 'UCETNI', 'SPRAVCE_ROZPOCTU', 'ROZPOCTAR')
  AND p.kod_prava = 'DEFERRALS_VIEW';

-- 4. Přiřadit právo EDIT hlavnímu účetnímu a správci rozpočtu
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, r.id, p.id, 1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('HLAVNI_UCETNI', 'SPRAVCE_ROZPOCTU')
  AND p.kod_prava = 'DEFERRALS_EDIT';

-- ============================================================================
-- OVĚŘENÍ: Zobrazení přiřazených práv
-- ============================================================================
SELECT 
    p.kod_prava AS 'Právo',
    p.popis AS 'Popis',
    COUNT(DISTINCT rp.role_id) AS 'Počet rolí',
    GROUP_CONCAT(DISTINCT r.nazev_role ORDER BY r.nazev_role SEPARATOR ', ') AS 'Role'
FROM `25_prava` p
LEFT JOIN `25_role_prava` rp ON p.id = rp.pravo_id AND rp.user_id = -1 AND rp.aktivni = 1
LEFT JOIN `25_role` r ON rp.role_id = r.id
WHERE p.kod_prava LIKE 'DEFERRALS_%'
GROUP BY p.id, p.kod_prava, p.popis
ORDER BY p.kod_prava;
