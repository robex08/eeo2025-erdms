-- Přidání oprávnění pro Dashboard aktivních uživatelů
-- Právo: DASHBOARD_ACTIVE_USERS
-- Popis: Umožňuje zobrazit dashboard s přehledem aktivit uživatelů a jejich poslední aktivity
-- Datum: 2026-04-13
-- Poznámka: Skript je idempotentní (lze spustit opakovaně)

-- ============================================================================
-- ČÁST 1: Založení nového oprávnění v číselníku práv
-- ============================================================================
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'DASHBOARD_ACTIVE_USERS', 'Domovská stránka: Dashboard aktivních uživatelů', 1
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM 25_prava WHERE kod_prava = 'DASHBOARD_ACTIVE_USERS'
);

-- ============================================================================
-- ČÁST 2: Přiřazení práva k roli SUPERADMIN (automaticky viditelné)
-- ============================================================================
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
SELECT -1, r.id, p.id, 1
FROM 25_role r
JOIN 25_prava p ON p.kod_prava = 'DASHBOARD_ACTIVE_USERS'
WHERE r.kod_role = 'SUPERADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM 25_role_prava rp
      WHERE rp.user_id = -1
        AND rp.role_id = r.id
        AND rp.pravo_id = p.id
  );

-- ============================================================================
-- KONEC SKRIPTU
-- ============================================================================
-- Po spuštění tohoto skriptu:
-- 1. SUPERADMIN uživatelé automaticky vidí dashboard aktivních uživatelů
-- 2. Dashboard lze zpřístupnit dalším uživatelům přiřazením práva DASHBOARD_ACTIVE_USERS
-- 3. Ve frontendové aplikaci se zkontroluje: hasPermission('DASHBOARD_ACTIVE_USERS')
-- 4. V horní liště se zobrazí ikona dashboardu pro uživatele s tímto oprávněním
