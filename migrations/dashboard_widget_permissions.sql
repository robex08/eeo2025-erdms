-- =============================================================================
-- MIGRACE: Dashboard Widget Permissions
-- Datum: 2026-04-07
-- Popis: Přidání granulárních práv pro viditelnost dashboard widgetů
-- DB: EEO-OSTRA-DEV
-- =============================================================================

-- 1. Vložení nových DASHBOARD_* práv do 25_prava
INSERT IGNORE INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) VALUES
  ('DASHBOARD_INVOICES_CONFIRM',    'Dashboard: Faktury k potvrzení (věcná správnost)', 1),
  ('DASHBOARD_ORDERS_APPROVE',      'Dashboard: Objednávky ke schválení', 1),
  ('DASHBOARD_INVOICES_OVERDUE',    'Dashboard: Faktury po splatnosti', 1),
  ('DASHBOARD_INVOICES_DUE_SOON',   'Dashboard: Faktury blížící se splatnosti', 1),
  ('DASHBOARD_INVOICES_STATS',      'Dashboard: Statistiky faktur', 1),
  ('DASHBOARD_ORDERS_REGISTRY',     'Dashboard: Objednávky ke zveřejnění (VZ)', 1),
  ('DASHBOARD_ORDERS_PUBLISHED',    'Dashboard: Zveřejněné objednávky', 1),
  ('DASHBOARD_SPENDING_CONTRACTS',  'Dashboard: Čerpání smluv - kritický stav', 1),
  ('DASHBOARD_SPENDING_LP',         'Dashboard: Limitované přísliby - kritický stav', 1),
  ('DASHBOARD_ORDERS_STATS',        'Dashboard: Statistiky objednávek', 1),
  ('DASHBOARD_CHART_TIMELINE',      'Dashboard: Graf objednávek v čase', 1),
  ('DASHBOARD_TOP_SUPPLIERS',       'Dashboard: Top dodavatelé', 1);

-- 2. Přiřazení výchozích práv rolím (user_id=-1 = role-level)
-- Role IDs: 1=SUPERADMIN, 2=ADMINISTRATOR, 3=SPRAVCE_ROZPOCTU, 4=ROZPOCTAR,
--   5=PRIKAZCE_OPERACE, 6=HLAVNI_UCETNI, 7=UCETNI, 8=VEREJNE_ZAKAZKY,
--   9=THP_PES, 10=VRCHNI, 11=PRIMAR, 12=REFERENT, 13=VEDOUCI_AUTODILNY,
--   14=VEDOUCI_ODDELENI, 15=REDITEL, 16=NAMESTEK, 17=KONTROLOR_FAKTUR,
--   18=KONTROLOR_OBJEDNAVEK

-- PRIKAZCE_OPERACE (5) → schválení, faktury po splatnosti, blížící se, stats faktur, stats objednávek
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 5, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_ORDERS_APPROVE', 'DASHBOARD_INVOICES_OVERDUE', 'DASHBOARD_INVOICES_DUE_SOON',
  'DASHBOARD_INVOICES_STATS', 'DASHBOARD_ORDERS_STATS'
);

-- REDITEL (15) → schválení, faktury po splatnosti, stats faktur, čerpání smluv+LP, stats obj, graf, top dodavatelé
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 15, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_ORDERS_APPROVE', 'DASHBOARD_INVOICES_OVERDUE', 'DASHBOARD_INVOICES_STATS',
  'DASHBOARD_SPENDING_CONTRACTS', 'DASHBOARD_SPENDING_LP', 'DASHBOARD_ORDERS_STATS',
  'DASHBOARD_CHART_TIMELINE', 'DASHBOARD_TOP_SUPPLIERS'
);

-- NAMESTEK (16) → schválení, faktury po splatnosti, stats faktur, čerpání smluv+LP, stats obj
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 16, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_ORDERS_APPROVE', 'DASHBOARD_INVOICES_OVERDUE', 'DASHBOARD_INVOICES_STATS',
  'DASHBOARD_SPENDING_CONTRACTS', 'DASHBOARD_SPENDING_LP', 'DASHBOARD_ORDERS_STATS'
);

-- VEDOUCI_ODDELENI (14) → schválení, faktury po splatnosti, stats obj
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 14, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_ORDERS_APPROVE', 'DASHBOARD_INVOICES_OVERDUE', 'DASHBOARD_ORDERS_STATS'
);

-- HLAVNI_UCETNI (6) → faktury k potvrzení, po splatnosti, blížící se, stats faktur, zveřejnění, stats obj, top dodavatelé
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 6, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_INVOICES_CONFIRM', 'DASHBOARD_INVOICES_OVERDUE', 'DASHBOARD_INVOICES_DUE_SOON',
  'DASHBOARD_INVOICES_STATS', 'DASHBOARD_ORDERS_REGISTRY', 'DASHBOARD_ORDERS_PUBLISHED',
  'DASHBOARD_ORDERS_STATS', 'DASHBOARD_TOP_SUPPLIERS'
);

-- UCETNI (7) → faktury k potvrzení, po splatnosti, blížící se, stats faktur, zveřejnění
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 7, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_INVOICES_CONFIRM', 'DASHBOARD_INVOICES_OVERDUE', 'DASHBOARD_INVOICES_DUE_SOON',
  'DASHBOARD_INVOICES_STATS', 'DASHBOARD_ORDERS_REGISTRY', 'DASHBOARD_ORDERS_PUBLISHED'
);

-- KONTROLOR_FAKTUR (17) → faktury k potvrzení, po splatnosti, blížící se, stats faktur
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 17, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_INVOICES_CONFIRM', 'DASHBOARD_INVOICES_OVERDUE', 'DASHBOARD_INVOICES_DUE_SOON',
  'DASHBOARD_INVOICES_STATS'
);

-- KONTROLOR_OBJEDNAVEK (18) → schválení, stats obj
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 18, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_ORDERS_APPROVE', 'DASHBOARD_ORDERS_STATS'
);

-- SPRAVCE_ROZPOCTU (3) → schválení, stats faktur, čerpání smluv+LP, stats obj
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 3, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_ORDERS_APPROVE', 'DASHBOARD_INVOICES_STATS',
  'DASHBOARD_SPENDING_CONTRACTS', 'DASHBOARD_SPENDING_LP', 'DASHBOARD_ORDERS_STATS'
);

-- ROZPOCTAR (4) → stats faktur, čerpání smluv+LP, stats obj
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 4, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_INVOICES_STATS', 'DASHBOARD_SPENDING_CONTRACTS', 'DASHBOARD_SPENDING_LP',
  'DASHBOARD_ORDERS_STATS'
);

-- THP_PES (9) → faktury k potvrzení
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 9, id, 1 FROM `25_prava` WHERE `kod_prava` IN ('DASHBOARD_INVOICES_CONFIRM');

-- VRCHNI (10) → faktury k potvrzení
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 10, id, 1 FROM `25_prava` WHERE `kod_prava` IN ('DASHBOARD_INVOICES_CONFIRM');

-- PRIMAR (11) → faktury k potvrzení, stats obj
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 11, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_INVOICES_CONFIRM', 'DASHBOARD_ORDERS_STATS'
);

-- VEREJNE_ZAKAZKY (8) → zveřejnění, zveřejněné, stats obj
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 8, id, 1 FROM `25_prava` WHERE `kod_prava` IN (
  'DASHBOARD_ORDERS_REGISTRY', 'DASHBOARD_ORDERS_PUBLISHED', 'DASHBOARD_ORDERS_STATS'
);

-- VEDOUCI_AUTODILNY (13) → stats obj
INSERT IGNORE INTO `25_role_prava` (`user_id`, `role_id`, `pravo_id`, `aktivni`)
SELECT -1, 13, id, 1 FROM `25_prava` WHERE `kod_prava` IN ('DASHBOARD_ORDERS_STATS');

-- REFERENT (12) → nic (jen základní widgety)
-- (žádný INSERT)

-- =============================================================================
-- VERIFIKACE
-- =============================================================================
-- SELECT p.kod_prava, r.kod_role
-- FROM 25_role_prava rp
-- JOIN 25_prava p ON p.id = rp.pravo_id
-- JOIN 25_role r ON r.id = rp.role_id
-- WHERE p.kod_prava LIKE 'DASHBOARD_%' AND rp.user_id = -1
-- ORDER BY p.kod_prava, r.kod_role;
