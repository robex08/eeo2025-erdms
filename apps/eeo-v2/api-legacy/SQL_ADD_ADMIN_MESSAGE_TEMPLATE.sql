-- ================================================
-- Přidání šablony pro ADMIN_MESSAGE notifikace
-- Datum: 2026-04-11
-- Účel: Rychlé zprávy od administrátora uživatelům
-- ================================================

-- Přidat do DEV databáze (EEO-OSTRA-DEV)
INSERT INTO `25_notifikace_sablony` 
(
  `typ`, 
  `nazev`, 
  `email_predmet`, 
  `email_telo`, 
  `email_vychozi`, 
  `app_nadpis`, 
  `app_zprava`, 
  `priorita_vychozi`, 
  `aktivni`, 
  `dt_created`
) 
VALUES 
(
  'ADMIN_MESSAGE',
  'Zpráva od administrátora',
  'Zpráva od administrátora systému',
  'Máte novou zprávu od správce systému.',
  0, -- Email se neposílá automaticky
  'Zpráva od administrátora',
  'Máte novou zprávu od správce systému',
  'normal', -- Výchozí priorita (může být změněna na 'high' při odesílání)
  1, -- Aktivní
  NOW()
);

-- ================================================
-- POZNÁMKY:
-- ================================================
-- - Typ: ADMIN_MESSAGE
-- - Priorita může být při odesílání přepsána na 'high' pro URGENT zprávy
-- - Email se NEPOSÍLÁ automaticky (email_vychozi = 0)
-- - Použití: Dashboard -> Aktivní uživatelé -> Ikona obálky u uživatele
-- - Frontend: SendQuickMessageModal.js
-- - API: /notifications/create
-- ================================================

-- Pro PRODUKČNÍ databázi (eeo2025) - použít stejný INSERT s kontrolou:
-- INSERT INTO `25_notifikace_sablony` ... 
-- WHERE NOT EXISTS (SELECT 1 FROM `25_notifikace_sablony` WHERE typ = 'ADMIN_MESSAGE');
