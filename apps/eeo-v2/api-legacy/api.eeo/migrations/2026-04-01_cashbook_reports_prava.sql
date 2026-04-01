-- ============================================================
-- Migrace: Přehled pokladen (Cashbook Reports) oprávnění
-- Datum: 2026-04-01
-- Popis: Přidání oprávnění pro tab "Přehled pokladen" v modulu
--        Statistika a reporty (Stats & Reports).
--
--        DŮVOD: Oddělení oprávnění pro reportovací modul od
--               oprávnění pro běžnou práci s pokladnami.
--               - CASH_BOOK_READ_OWN = vidí jen své pokladny
--               - CASHBOOK_REPORTS_VIEW = vidí reportovací přehled VŠECH pokladen
--
-- Skript je idempotentní – lze spustit opakovaně.
-- ============================================================

-- ============================================================
-- ČÁST A: Nová oprávnění v číselníku 25_prava
-- ============================================================

-- --- Přehled pokladen (tab: cashbook v Stats & Reports) ---
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'CASHBOOK_REPORTS_VIEW', 'Statistika a reporty – Přehled pokladen – zobrazení', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'CASHBOOK_REPORTS_VIEW');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'CASHBOOK_REPORTS_MANAGE', 'Statistika a reporty – Přehled pokladen – správa', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'CASHBOOK_REPORTS_MANAGE');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'CASHBOOK_REPORTS_EXPORT', 'Statistika a reporty – Přehled pokladen – export', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'CASHBOOK_REPORTS_EXPORT');

-- ============================================================
-- ČÁST B: Přiřazení nových oprávnění rolím SUPERADMIN + ADMINISTRATOR
-- ============================================================

-- SUPERADMIN
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
SELECT -1, r.id, p.id, 1
FROM 25_role r
JOIN 25_prava p ON p.kod_prava IN (
    'CASHBOOK_REPORTS_VIEW', 
    'CASHBOOK_REPORTS_MANAGE', 
    'CASHBOOK_REPORTS_EXPORT'
)
WHERE r.kod_role = 'SUPERADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM 25_role_prava rp
      WHERE rp.user_id = -1
        AND rp.role_id = r.id
        AND rp.pravo_id = p.id
  );

-- ADMINISTRATOR
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
SELECT -1, r.id, p.id, 1
FROM 25_role r
JOIN 25_prava p ON p.kod_prava IN (
    'CASHBOOK_REPORTS_VIEW', 
    'CASHBOOK_REPORTS_MANAGE', 
    'CASHBOOK_REPORTS_EXPORT'
)
WHERE r.kod_role = 'ADMINISTRATOR'
  AND NOT EXISTS (
      SELECT 1 FROM 25_role_prava rp
      WHERE rp.user_id = -1
        AND rp.role_id = r.id
        AND rp.pravo_id = p.id
  );

-- ============================================================
-- Konec migrace
-- ============================================================
