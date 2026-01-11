-- ================================================================
-- MIGRACE: Nové oprávnění SPISOVKA_MANAGE
-- Verze: 2.00
-- Datum: 7. ledna 2026
-- Popis: Přidání oprávnění pro správu Spisovka InBox (non-admin)
-- ================================================================

-- Autor: Robert Holovský + GitHub Copilot
-- Účel: Umožnit operativní přiřazování přístupu ke Spisovka InBox 
--       pro ekonomy, účetní a další uživatele bez ADMIN role

-- ================================================================
-- 1. VYTVOŘENÍ NOVÉHO OPRÁVNĚNÍ
-- ================================================================

-- Kontrola zda právo již neexistuje
SELECT 'Kontrola existence SPISOVKA_MANAGE...' AS status;

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
SELECT 'SPISOVKA_MANAGE', 'Správa Spisovka InBox - přístup k evidenci faktur ze spisovny', 1
WHERE NOT EXISTS (
    SELECT 1 FROM `25_prava` WHERE `kod_prava` = 'SPISOVKA_MANAGE'
);

SELECT CASE 
    WHEN ROW_COUNT() > 0 THEN '✅ Oprávnění SPISOVKA_MANAGE bylo vytvořeno'
    ELSE '⚠️  Oprávnění SPISOVKA_MANAGE již existuje'
END AS vysledek;

-- ================================================================
-- 2. AUTOMATICKÉ PŘIŘAZENÍ PRO ADMINY (VOLITELNÉ)
-- ================================================================

-- Poznámka: Admini (SUPERADMIN, ADMINISTRATOR) již mají přístup
-- implicitně přes hasPermission('ADMIN'), ale můžeme přiřadit explicitně
-- pro konzistenci nebo budoucí změny v logice.

-- UNCOMMENT níže pokud chcete přiřadit explicitně:
/*
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`)
SELECT r.id, p.id
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
  AND p.kod_prava = 'SPISOVKA_MANAGE'
  AND NOT EXISTS (
      SELECT 1 FROM `25_role_prava` rp
      WHERE rp.role_id = r.id AND rp.pravo_id = p.id
  );

SELECT '✅ SPISOVKA_MANAGE přiřazeno rolím: SUPERADMIN, ADMINISTRATOR' AS vysledek;
*/

-- ================================================================
-- 3. DOPORUČENÉ PŘIŘAZENÍ PRO EKONOMICKÉ ROLE
-- ================================================================

-- Přiřadit pro roli EKONOM (pokud existuje)
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`)
SELECT r.id, p.id
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role = 'EKONOM'
  AND p.kod_prava = 'SPISOVKA_MANAGE'
  AND NOT EXISTS (
      SELECT 1 FROM `25_role_prava` rp
      WHERE rp.role_id = r.id AND rp.pravo_id = p.id
  );

SELECT CASE 
    WHEN ROW_COUNT() > 0 THEN '✅ SPISOVKA_MANAGE přiřazeno roli: EKONOM'
    ELSE '⚠️  Role EKONOM neexistuje nebo již má toto právo'
END AS vysledek;

-- Přiřadit pro roli UCETNI (pokud existuje)
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`)
SELECT r.id, p.id
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role = 'UCETNI'
  AND p.kod_prava = 'SPISOVKA_MANAGE'
  AND NOT EXISTS (
      SELECT 1 FROM `25_role_prava` rp
      WHERE rp.role_id = r.id AND rp.pravo_id = p.id
  );

SELECT CASE 
    WHEN ROW_COUNT() > 0 THEN '✅ SPISOVKA_MANAGE přiřazeno roli: UCETNI'
    ELSE '⚠️  Role UCETNI neexistuje nebo již má toto právo'
END AS vysledek;

-- ================================================================
-- 4. KONTROLNÍ DOTAZY
-- ================================================================

-- Zobrazit ID nového oprávnění
SELECT 
    id,
    kod_prava,
    popis,
    aktivni,
    dt_vytvoreni
FROM `25_prava`
WHERE `kod_prava` = 'SPISOVKA_MANAGE';

-- Zobrazit všechna přiřazení tohoto oprávnění
SELECT 
    r.nazev_role,
    r.kod_role,
    p.kod_prava,
    p.popis,
    rp.dt_prideleni
FROM `25_role_prava` rp
JOIN `25_role` r ON rp.role_id = r.id
JOIN `25_prava` p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'SPISOVKA_MANAGE'
ORDER BY r.nazev_role;

-- ================================================================
-- ROLLBACK (v případě potřeby)
-- ================================================================

-- Odebrat přiřazení
-- DELETE FROM `25_role_prava` WHERE pravo_id = (SELECT id FROM `25_prava` WHERE kod_prava = 'SPISOVKA_MANAGE');

-- Smazat oprávnění
-- DELETE FROM `25_prava` WHERE kod_prava = 'SPISOVKA_MANAGE';

-- ================================================================
-- POZNÁMKY PRO DEPLOYMENT
-- ================================================================

/*
MANUÁLNÍ PŘIŘAZENÍ JEDNOTLIVÝM UŽIVATELŮM:

1. Zjistit ID uživatele:
   SELECT id, jmeno, prijmeni, username FROM 25_uzivatele WHERE username = 'novakj';

2. Zjistit ID oprávnění:
   SELECT id FROM 25_prava WHERE kod_prava = 'SPISOVKA_MANAGE';

3. Přiřadit oprávnění uživateli:
   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id)
   VALUES ([UZIVATEL_ID], [PRAVO_ID]);

PŘÍKLAD:
   INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id)
   SELECT 42, id FROM 25_prava WHERE kod_prava = 'SPISOVKA_MANAGE';

KONTROLA:
   SELECT 
       u.jmeno, 
       u.prijmeni, 
       u.username,
       p.kod_prava,
       p.popis
   FROM 25_uzivatel_prava up
   JOIN 25_uzivatele u ON up.uzivatel_id = u.id
   JOIN 25_prava p ON up.pravo_id = p.id
   WHERE p.kod_prava = 'SPISOVKA_MANAGE';
*/
