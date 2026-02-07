-- ============================================================================
-- TESTOVACÍ DATA: Multi-profilový systém
-- ============================================================================
-- Vytvoří testovací profily a vztahy pro otestování nového systému
-- Datum: 15. ledna 2026
-- Autor: Robert Novák

-- ============================================================================
-- 1. Vytvořit testovací profily
-- ============================================================================

-- Profil 1: Notifikace (hlavní notifikační profil)
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, popis, aktivni, dt_vytvoreno)
VALUES (
  'PROF-NOTIF-MAIN',
  'NOTIFIKACE',
  'Hlavní notifikační profil pro standardní workflow',
  1,
  NOW()
);

SET @profil_notif = LAST_INSERT_ID();

-- Profil 2: Viditelnost pro náměstky
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, popis, aktivni, dt_vytvoreno)
VALUES (
  'VIDITELNOST-NAMESTEK',
  'VIDITELNOST',
  'Rozšířená viditelnost pro náměstky ředitele - vidí celý úsek',
  1,
  NOW()
);

SET @profil_namestek = LAST_INSERT_ID();

-- Profil 3: Viditelnost pro příkazce
INSERT INTO 25_hierarchie_profily (nazev, typ_profilu, popis, aktivni, dt_vytvoreno)
VALUES (
  'VIDITELNOST-PRIKAZCE',
  'VIDITELNOST',
  'Viditelnost pro příkazce - vidí specifické uživatele',
  1,
  NOW()
);

SET @profil_prikazce = LAST_INSERT_ID();

-- ============================================================================
-- 2. Vytvořit testovací vztahy (předpokládá existující user IDs)
-- ============================================================================

-- Poznámka: Nahraď 85, 52, 87 skutečnými user IDs z tvé databáze
-- SELECT id, jmeno, prijmeni, username FROM 25_uzivatele WHERE id IN (85, 52, 87);

-- Vztah 1: Jan Černohorský (85) - NAMESTEK vidí celý IT úsek (3)
INSERT INTO 25_hierarchie_vztahy (
  profil_id, 
  profil_type, 
  typ_vztahu, 
  user_id_1, 
  usek_id,
  druh_vztahu,
  scope, 
  viditelnost_objednavky, 
  viditelnost_faktury,
  uroven_prav_objednavky, 
  uroven_prav_faktury,
  aktivni,
  dt_vytvoreni
) VALUES (
  @profil_namestek,
  'VIDITELNOST',
  'user-department',
  85,  -- Jan Černohorský
  3,   -- Úsek IT
  'rozsirene',
  'TEAM',
  1,
  1,
  'READ_ONLY',
  'READ_ONLY',
  1,
  NOW()
);

-- Vztah 2: Jan Černohorský (85) vidí i konkrétní uživatele (Holovský 52, Sulganová 87)
INSERT INTO 25_hierarchie_vztahy (
  profil_id, 
  profil_type, 
  typ_vztahu, 
  user_id_1, 
  personalized_users,
  druh_vztahu,
  scope, 
  viditelnost_objednavky, 
  viditelnost_faktury,
  uroven_prav_objednavky,
  aktivni,
  dt_vytvoreni
) VALUES (
  @profil_namestek,
  'VIDITELNOST',
  'user-user',
  85,  -- Jan Černohorský
  '[52, 87]',  -- Holovský, Sulganová
  'rozsirene',
  'OWN',
  1,
  1,
  'READ_ONLY',
  1,
  NOW()
);

-- Vztah 3: Jan Černohorský (85) vidí objednávky z lokalit Kladno (5) a Benešov (8)
INSERT INTO 25_hierarchie_vztahy (
  profil_id, 
  profil_type, 
  typ_vztahu, 
  user_id_1, 
  rozsirene_lokality,
  druh_vztahu,
  scope, 
  viditelnost_objednavky,
  uroven_prav_objednavky,
  aktivni,
  dt_vytvoreni
) VALUES (
  @profil_namestek,
  'VIDITELNOST',
  'user-location',
  85,  -- Jan Černohorský
  '[5, 8]',  -- Kladno, Benešov
  'rozsirene',
  'LOCATION',
  1,
  'READ_ONLY',
  1,
  NOW()
);

-- Vztah 4: Notifikační vztah - Černohorský dostává notifikace od Holovského
INSERT INTO 25_hierarchie_vztahy (
  profil_id, 
  profil_type, 
  typ_vztahu, 
  user_id_1, 
  user_id_2,
  druh_vztahu,
  notifikace_email,
  notifikace_inapp,
  notifikace_typy,
  notifikace_recipient_role,
  aktivni,
  dt_vytvoreni
) VALUES (
  @profil_notif,
  'NOTIFIKACE',
  'user-user',
  85,  -- Jan Černohorský (příjemce)
  52,  -- Holovský (odesílatel)
  'prime',
  1,
  1,
  '[1, 2, 3, 4, 5]',  -- Event type IDs (ORDER_CREATED, ORDER_APPROVED, atd.)
  'APPROVAL',
  1,
  NOW()
);

-- ============================================================================
-- 3. Ověření testovacích dat
-- ============================================================================

-- Zobrazit vytvořené profily
SELECT 
  id,
  nazev,
  typ_profilu,
  popis,
  aktivni
FROM 25_hierarchie_profily
WHERE nazev LIKE 'PROF-%' OR nazev LIKE 'VIDITELNOST-%'
ORDER BY id;

-- Zobrazit vytvořené vztahy
SELECT 
  v.id,
  p.nazev AS profil_nazev,
  p.typ_profilu AS profil_typ,
  v.profil_type AS vztah_typ,
  v.typ_vztahu,
  v.user_id_1,
  u1.jmeno AS user1_jmeno,
  u1.prijmeni AS user1_prijmeni,
  v.user_id_2,
  u2.jmeno AS user2_jmeno,
  u2.prijmeni AS user2_prijmeni,
  v.usek_id,
  us.usek_nazev,
  v.rozsirene_lokality,
  v.rozsirene_useky,
  v.personalized_users,
  v.viditelnost_objednavky,
  v.aktivni
FROM 25_hierarchie_vztahy v
LEFT JOIN 25_hierarchie_profily p ON v.profil_id = p.id
LEFT JOIN 25_uzivatele u1 ON v.user_id_1 = u1.id
LEFT JOIN 25_uzivatele u2 ON v.user_id_2 = u2.id
LEFT JOIN 25_useky us ON v.usek_id = us.id
WHERE v.profil_id IN (@profil_notif, @profil_namestek, @profil_prikazce)
ORDER BY v.id;

-- ============================================================================
-- 4. Test dotazu - jaké objednávky vidí Jan Černohorský (85)?
-- ============================================================================

-- Tento dotaz by měl vrátit objednávky z:
-- 1. Celého IT úseku (usek_id = 3)
-- 2. Konkrétních uživatelů (52, 87)
-- 3. Lokalit Kladno (5) a Benešov (8)

SELECT DISTINCT o.id, o.ev_cislo, o.predmet, 
  u.jmeno, u.prijmeni, u.usek_id, u.lokalita_id
FROM 25_objednavky o
JOIN 25_uzivatele u ON o.vytvoril = u.id
WHERE (
  -- 1. Úsek IT
  u.usek_id = 3
  OR
  -- 2. Konkrétní uživatelé
  u.id IN (52, 87)
  OR
  -- 3. Lokality
  u.lokalita_id IN (5, 8)
)
ORDER BY o.dt_vytvoreno DESC
LIMIT 20;

-- ============================================================================
-- 5. Cleanup (volitelné - smaže testovací data)
-- ============================================================================

/*
-- Smazat testovací vztahy
DELETE FROM 25_hierarchie_vztahy
WHERE profil_id IN (
  SELECT id FROM 25_hierarchie_profily 
  WHERE nazev LIKE 'PROF-%' OR nazev LIKE 'VIDITELNOST-%'
);

-- Smazat testovací profily
DELETE FROM 25_hierarchie_profily
WHERE nazev LIKE 'PROF-%' OR nazev LIKE 'VIDITELNOST-%';
*/
