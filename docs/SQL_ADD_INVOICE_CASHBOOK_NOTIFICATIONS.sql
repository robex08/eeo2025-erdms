-- =============================================================================
-- PŘIDÁNÍ NOVÝCH NOTIFIKAČNÍCH UDÁLOSTÍ A ŠABLON
-- Datum: 31. 12. 2025
-- Popis: Rozšíření notifikací pro faktury a pokladnu v rámci org. hierarchie
-- =============================================================================

USE `eeo2025-dev`;

-- -----------------------------------------------------------------------------
-- 1. PŘIDÁNÍ NOVÝCH TYPŮ UDÁLOSTÍ (25_notifikace_typy_udalosti)
-- -----------------------------------------------------------------------------

-- FAKTURY - nové události
INSERT INTO `25_notifikace_typy_udalosti` 
(kod, nazev, kategorie, popis, uroven_nahlhavosti, role_prijemcu, vychozi_kanaly, modul, aktivni, dt_vytvoreno)
VALUES
-- Faktura předána (ke kontrole/schválení)
('INVOICE_SUBMITTED', 'Faktura předána', 'invoices', 
 'Událost nastane při předání faktury ke kontrole nebo schválení', 
 'NORMAL', '["GARANT","THP_PES"]', '["app","email"]', 'invoices', 1, NOW()),

-- Faktura vrácena (k doplnění/opravě)
('INVOICE_RETURNED', 'Faktura vrácena', 'invoices', 
 'Událost nastane při vrácení faktury k doplnění nebo opravě', 
 'NORMAL', '["CREATOR","GARANT"]', '["app","email"]', 'invoices', 1, NOW()),

-- Věcná správnost vyžadována
('INVOICE_MATERIAL_CHECK_REQUESTED', 'Věcná správnost vyžadována', 'invoices', 
 'Událost nastane když je třeba provést kontrolu věcné správnosti faktury', 
 'NORMAL', '["GARANT","THP_PES"]', '["app","email"]', 'invoices', 1, NOW()),

-- Faktura aktualizována
('INVOICE_UPDATED', 'Faktura aktualizována', 'invoices', 
 'Událost nastane při jakékoli aktualizaci údajů faktury', 
 'NORMAL', '["GARANT","THP_PES","CREATOR"]', '["app"]', 'invoices', 1, NOW()),

-- Věcná správnost potvrzena
('INVOICE_MATERIAL_CHECK_APPROVED', 'Věcná správnost faktury potvrzena', 'invoices', 
 'Událost nastane po potvrzení věcné správnosti faktury', 
 'NORMAL', '["CREATOR","GARANT","ACCOUNTANT"]', '["app","email"]', 'invoices', 1, NOW()),

-- Uveřejněno v registru
('INVOICE_REGISTRY_PUBLISHED', 'Faktura uveřejněna v registru', 'invoices', 
 'Událost nastane po uveřejnění faktury v registru smluv', 
 'NORMAL', '["CREATOR","GARANT"]', '["app"]', 'invoices', 1, NOW()),

-- POKLADNA - nové události
('CASHBOOK_MONTH_CLOSED', 'Pokladna uzavřena za měsíc', 'cashbook', 
 'Událost nastane po uzavření pokladny za ukončený měsíc', 
 'NORMAL', '["ACCOUNTANT","MANAGER"]', '["app","email"]', 'cashbook', 1, NOW()),

('CASHBOOK_MONTH_LOCKED', 'Pokladna uzamčena za měsíc', 'cashbook', 
 'Událost nastane po finálním uzamčení pokladny za měsíc (nelze měnit)', 
 'URGENT', '["ACCOUNTANT","MANAGER"]', '["app","email"]', 'cashbook', 1, NOW());

-- -----------------------------------------------------------------------------
-- 2. PŘIDÁNÍ NOTIFIKAČNÍCH ŠABLON (25_notifikace_sablony)
-- -----------------------------------------------------------------------------

-- Šablona: Faktura předána
INSERT INTO `25_notifikace_sablony`
(typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni, dt_created)
VALUES
('invoice_submitted', 'Faktura předána ke kontrole',
 '✉️ Faktura č. {{invoice_number}} předána ke kontrole',
 '<h2>Faktura předána ke kontrole</h2><p>Byla vám předána faktura k ověření a kontrole.</p><p><strong>Číslo faktury:</strong> {{invoice_number}}<br><strong>Dodavatel:</strong> {{supplier_name}}<br><strong>Částka:</strong> {{amount}} Kč<br><strong>Objednávka:</strong> {{order_number}}</p><p>Prosím zkontrolujte věcnou správnost a potvrďte.</p>',
 1,
 '📝 Faktura {{invoice_number}} předána',
 'Faktura č. {{invoice_number}} od {{supplier_name}} byla předána ke kontrole. Částka: {{amount}} Kč',
 'normal', 1, NOW());

-- Šablona: Faktura vrácena
INSERT INTO `25_notifikace_sablony`
(typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni, dt_created)
VALUES
('invoice_returned', 'Faktura vrácena k doplnění',
 '⚠️ Faktura č. {{invoice_number}} vrácena k doplnění',
 '<h2>Faktura vrácena</h2><p>Faktura byla vrácena k doplnění nebo opravě.</p><p><strong>Číslo faktury:</strong> {{invoice_number}}<br><strong>Dodavatel:</strong> {{supplier_name}}<br><strong>Důvod vrácení:</strong> {{return_reason}}</p><p>Prosím doplňte požadované údaje a předejte fakturu znovu.</p>',
 1,
 '⚠️ Faktura {{invoice_number}} vrácena',
 'Faktura č. {{invoice_number}} vrácena k doplnění. Důvod: {{return_reason}}',
 'normal', 1, NOW());

-- Šablona: Věcná správnost vyžadována
INSERT INTO `25_notifikace_sablony`
(typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni, dt_created)
VALUES
('invoice_material_check_requested', 'Věcná správnost faktury vyžadována',
 '🔍 Vyžadována kontrola věcné správnosti faktury {{invoice_number}}',
 '<h2>Vyžadována kontrola věcné správnosti</h2><p>Je třeba provést kontrolu věcné správnosti faktury.</p><p><strong>Číslo faktury:</strong> {{invoice_number}}<br><strong>Dodavatel:</strong> {{supplier_name}}<br><strong>Částka:</strong> {{amount}} Kč</p><p>Prosím ověřte, zda faktura odpovídá objednanému zboží/službám.</p>',
 1,
 '🔍 Kontrola faktury {{invoice_number}}',
 'Vyžadována kontrola věcné správnosti faktury č. {{invoice_number}} ({{amount}} Kč)',
 'normal', 1, NOW());

-- Šablona: Faktura aktualizována
INSERT INTO `25_notifikace_sablony`
(typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni, dt_created)
VALUES
('invoice_updated', 'Faktura aktualizována',
 '📝 Faktura č. {{invoice_number}} byla aktualizována',
 '<h2>Faktura aktualizována</h2><p>V faktuře byly provedeny změny.</p><p><strong>Číslo faktury:</strong> {{invoice_number}}<br><strong>Aktualizoval:</strong> {{updated_by}}<br><strong>Datum změny:</strong> {{updated_at}}</p>',
 0,
 '📝 Faktura {{invoice_number}} aktualizována',
 'Faktura č. {{invoice_number}} byla aktualizována uživatelem {{updated_by}}',
 'normal', 1, NOW());

-- Šablona: Věcná správnost potvrzena
INSERT INTO `25_notifikace_sablony`
(typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni, dt_created)
VALUES
('invoice_material_check_approved', 'Věcná správnost faktury potvrzena',
 '✅ Věcná správnost faktury {{invoice_number}} potvrzena',
 '<h2>Věcná správnost potvrzena</h2><p>Věcná správnost faktury byla ověřena a potvrzena.</p><p><strong>Číslo faktury:</strong> {{invoice_number}}<br><strong>Dodavatel:</strong> {{supplier_name}}<br><strong>Částka:</strong> {{amount}} Kč<br><strong>Potvrdil:</strong> {{approved_by}}</p><p>Faktura může pokračovat ke zpracování.</p>',
 1,
 '✅ Faktura {{invoice_number}} ověřena',
 'Věcná správnost faktury č. {{invoice_number}} byla potvrzena',
 'normal', 1, NOW());

-- Šablona: Uveřejněno v registru
INSERT INTO `25_notifikace_sablony`
(typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni, dt_created)
VALUES
('invoice_registry_published', 'Faktura uveřejněna v registru',
 '📢 Faktura č. {{invoice_number}} uveřejněna v registru',
 '<h2>Faktura uveřejněna v registru</h2><p>Faktura byla úspěšně uveřejněna v registru smluv.</p><p><strong>Číslo faktury:</strong> {{invoice_number}}<br><strong>Dodavatel:</strong> {{supplier_name}}<br><strong>Datum uveřejnění:</strong> {{published_at}}</p>',
 0,
 '📢 Faktura {{invoice_number}} v registru',
 'Faktura č. {{invoice_number}} byla uveřejněna v registru smluv',
 'normal', 1, NOW());

-- Šablona: Pokladna uzavřena za měsíc
INSERT INTO `25_notifikace_sablony`
(typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni, dt_created)
VALUES
('cashbook_month_closed', 'Pokladna uzavřena za měsíc',
 '📅 Pokladna {{cashbook_name}} uzavřena za {{month_year}}',
 '<h2>Pokladna uzavřena</h2><p>Pokladna byla uzavřena za ukončený měsíc.</p><p><strong>Pokladna:</strong> {{cashbook_name}}<br><strong>Období:</strong> {{month_year}}<br><strong>Uzavřel:</strong> {{closed_by}}<br><strong>Konečný zůstatek:</strong> {{final_balance}} Kč</p><p>Prosím ověřte správnost údajů před finálním uzamčením.</p>',
 1,
 '📅 Pokladna {{cashbook_name}} uzavřena',
 'Pokladna {{cashbook_name}} uzavřena za {{month_year}}. Zůstatek: {{final_balance}} Kč',
 'normal', 1, NOW());

-- Šablona: Pokladna uzamčena za měsíc
INSERT INTO `25_notifikace_sablony`
(typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni, dt_created)
VALUES
('cashbook_month_locked', 'Pokladna uzamčena za měsíc',
 '🔒 Pokladna {{cashbook_name}} UZAMČENA za {{month_year}}',
 '<h2>⚠️ Pokladna finálně uzamčena</h2><p><strong>POZOR:</strong> Pokladna byla finálně uzamčena. Nelze provádět žádné změny!</p><p><strong>Pokladna:</strong> {{cashbook_name}}<br><strong>Období:</strong> {{month_year}}<br><strong>Uzamkl:</strong> {{locked_by}}<br><strong>Finální zůstatek:</strong> {{final_balance}} Kč</p><p>Data jsou nyní archivována a nelze je měnit.</p>',
 1,
 '🔒 Pokladna {{cashbook_name}} UZAMČENA',
 '⚠️ Pokladna {{cashbook_name}} finálně uzamčena za {{month_year}}. Nelze měnit!',
 'urgent', 1, NOW());

-- -----------------------------------------------------------------------------
-- 3. OVĚŘENÍ VÝSLEDKU
-- -----------------------------------------------------------------------------

-- Kontrola přidaných typů událostí
SELECT '=== NOVÉ TYPY UDÁLOSTÍ ===' AS info;
SELECT kod, nazev, kategorie, modul, aktivni 
FROM `25_notifikace_typy_udalosti` 
WHERE kod IN (
    'INVOICE_SUBMITTED', 
    'INVOICE_RETURNED', 
    'INVOICE_MATERIAL_CHECK_REQUESTED',
    'INVOICE_UPDATED',
    'INVOICE_MATERIAL_CHECK_APPROVED',
    'INVOICE_REGISTRY_PUBLISHED',
    'CASHBOOK_MONTH_CLOSED',
    'CASHBOOK_MONTH_LOCKED'
)
ORDER BY kategorie, kod;

-- Kontrola přidaných šablon
SELECT '=== NOVÉ ŠABLONY ===' AS info;
SELECT typ, nazev, priorita_vychozi, aktivni 
FROM `25_notifikace_sablony` 
WHERE typ IN (
    'invoice_submitted',
    'invoice_returned',
    'invoice_material_check_requested',
    'invoice_updated',
    'invoice_material_check_approved',
    'invoice_registry_published',
    'cashbook_month_closed',
    'cashbook_month_locked'
)
ORDER BY typ;

-- =============================================================================
-- KONEC SKRIPTU
-- =============================================================================
