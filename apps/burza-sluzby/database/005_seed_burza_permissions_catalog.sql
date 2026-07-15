-- Burza Sluzby: seed prav pro administraci role-based opravneni.
-- Spustit po 004_create_burza_sluzby_catalog.sql

-- Cleanup historickych duplicitnich scope zapisu,
-- ktere jsou dnes pokryte fallback mapovanim roli v API.
DELETE FROM burza_sluzby_catalog
WHERE category = 'permissions'
    AND (
        (item_key = 'BURZA_AVAILABILITY_CREATE' AND role_scope IN ('doctor', 'paramedic'))
        OR (item_key IN ('BURZA_ASSIGN_APPROVE', 'BURZA_ASSIGN_REJECT') AND role_scope = 'head_doctor')
    );

INSERT INTO burza_sluzby_catalog
    (category, item_key, item_value, description, role_scope, purpose, sort_order, is_active, metadata)
VALUES
    ('permissions', 'BURZA_AVAILABILITY_CREATE', 'Vytvaret dostupnosti', 'Muze vytvaret a upravovat vlastni nabidky sluzeb.', 'employee', 'ui', 10, 1, NULL),
    ('permissions', 'BURZA_ASSIGN_APPROVE', 'Schvalovat smeny', 'Muze schvalovat a prirazovat smeny v oddeleni.', 'approver', 'workflow', 20, 1, NULL),
    ('permissions', 'BURZA_ASSIGN_REJECT', 'Zamitat smeny', 'Muze zamitat pozadavky v oddeleni.', 'approver', 'workflow', 30, 1, NULL),
    ('permissions', 'BURZA_USERS_VIEW', 'Zobrazit uzivatele', 'Muze otevrit seznam uzivatelu v administraci.', 'admin', 'admin', 40, 1, NULL),
    ('permissions', 'BURZA_USERS_EDIT', 'Upravovat uzivatele', 'Muze menit role, aktivaci a profilova data uzivatelu.', 'admin', 'admin', 50, 1, NULL),
    ('permissions', 'BURZA_CATALOG_EDIT', 'Spravovat ciselniky', 'Muze upravovat ciselniky prav a dalsich kategorii.', 'admin', 'admin', 60, 1, NULL),
    ('permissions', 'BURZA_AUDIT_VIEW', 'Zobrazit audit', 'Muze zobrazit auditni udalosti aplikace.', 'admin', 'audit', 70, 1, NULL)
ON DUPLICATE KEY UPDATE
    item_value = VALUES(item_value),
    description = VALUES(description),
    purpose = VALUES(purpose),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    metadata = VALUES(metadata),
    updated_at = NOW();
