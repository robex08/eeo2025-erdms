-- ====================================================
-- PŘIDÁNÍ PRÁVA: MAINTENANCE_ADMIN
-- Umožňuje přístup do systému během maintenance režimu
-- 
-- Databáze: eeo2025-dev
-- Server: 10.3.172.11
-- Datum: 2025-12-31
-- ====================================================

USE `eeo2025-dev`;

-- 1. Přidání práva MAINTENANCE_ADMIN
INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES ('MAINTENANCE_ADMIN', 'Přístup do systému během maintenance režimu', 1)
ON DUPLICATE KEY UPDATE 
    popis = VALUES(popis),
    aktivni = VALUES(aktivni);

-- Získat ID nově vloženého práva
SET @maintenance_admin_pravo_id = (SELECT id FROM `25_prava` WHERE kod_prava = 'MAINTENANCE_ADMIN' LIMIT 1);

-- 2. Přiřadit právo roli SUPERADMIN
SET @superadmin_role_id = (SELECT id FROM `25_role` WHERE kod_role = 'SUPERADMIN' LIMIT 1);
INSERT IGNORE INTO `25_role_prava` (`role_id`, `pravo_id`, `aktivni`)
VALUES (@superadmin_role_id, @maintenance_admin_pravo_id, 1);

-- 3. Přiřadit právo roli ADMINISTRATOR
SET @administrator_role_id = (SELECT id FROM `25_role` WHERE kod_role = 'ADMINISTRATOR' LIMIT 1);
INSERT IGNORE INTO `25_role_prava` (`role_id`, `pravo_id`, `aktivni`)
VALUES (@administrator_role_id, @maintenance_admin_pravo_id, 1);

-- Výpis pro kontrolu
SELECT 
    'Právo MAINTENANCE_ADMIN bylo přidáno' AS Status,
    @maintenance_admin_pravo_id AS pravo_id,
    @superadmin_role_id AS superadmin_role_id,
    @administrator_role_id AS administrator_role_id;

-- Zobrazit přiřazení
SELECT 
    r.kod_role,
    r.nazev_role,
    p.kod_prava,
    p.popis,
    rp.aktivni
FROM `25_role_prava` rp
JOIN `25_role` r ON r.id = rp.role_id
JOIN `25_prava` p ON p.id = rp.pravo_id
WHERE p.kod_prava = 'MAINTENANCE_ADMIN';

-- ====================================================
-- POZNÁMKY:
-- ====================================================
-- 
-- Po spuštění tohoto skriptu budou mít přístup během údržby:
-- 1. SUPERADMIN (role)
-- 2. ADMINISTRATOR (role)
-- 3. Kdokoliv s přímým právem MAINTENANCE_ADMIN
--
-- Frontend kontroluje: hasPermission('MAINTENANCE_ADMIN')
-- Backend kontroluje: has_permission() nebo isSuperAdmin
--
-- ====================================================
