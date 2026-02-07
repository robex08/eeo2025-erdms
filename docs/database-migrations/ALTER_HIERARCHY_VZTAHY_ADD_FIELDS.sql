-- Přidání chybějících polí do tabulky 25_hierarchie_vztahy
-- Pro podporu relationshipType, modules, permissionLevel, extended, recipientRole

USE eeo2025;

-- 1. Typ vztahu (prime, zastupovani, delegovani, rozsirene)
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN druh_vztahu ENUM('prime', 'zastupovani', 'delegovani', 'rozsirene') DEFAULT 'prime' AFTER uroven_opravneni;

-- 2. Moduly (duplikát visibility pro zpětnou kompatibilitu)
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN modules JSON NULL COMMENT 'Viditelnost modulů {orders, invoices, contracts, cashbook, users, lp}' AFTER viditelnost_lp;

-- 3. Úroveň práv pro každý modul
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN permission_level JSON NULL COMMENT 'Úroveň práv {orders: READ_ONLY|EDIT|APPROVE, invoices: ..., contracts: ..., cashbook: ...}' AFTER modules;

-- 4. Rozšířené kombinace lokalit a útvarů
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN extended_data JSON NULL COMMENT 'Rozšířené lokality/útvary/kombinace {locations: [], departments: [], combinations: []}' AFTER permission_level;

-- 5. Recipient role pro notifikace
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN notifikace_recipient_role ENUM('APPROVAL', 'INFO', 'BOTH') DEFAULT 'APPROVAL' AFTER notifikace_typy;

-- 6. Notifikace node settings (template varianty)
ALTER TABLE 25_hierarchie_vztahy
ADD COLUMN node_settings JSON NULL COMMENT 'Nastavení template variant {source: {normalVariant, urgentVariant, infoVariant}, target: {...}}' AFTER notifikace_recipient_role;

-- 7. Template ID a Role ID (pro template-user a role-user vztahy)
-- SKIP: template_id a role_id už existují

-- 8. Aktualizovat typ_vztahu enum o nové typy
ALTER TABLE 25_hierarchie_vztahy
MODIFY COLUMN typ_vztahu ENUM(
    'user-user',
    'location-user', 
    'user-location',
    'department-user',
    'user-department',
    'template-user',
    'user-template',
    'role-user',
    'user-role'
) NOT NULL;

-- 9. Přidat indexy pro nové sloupce
ALTER TABLE 25_hierarchie_vztahy
ADD INDEX idx_template (template_id),
ADD INDEX idx_role (role_id);

-- Výpis struktury po změnách
SHOW CREATE TABLE 25_hierarchie_vztahy;
