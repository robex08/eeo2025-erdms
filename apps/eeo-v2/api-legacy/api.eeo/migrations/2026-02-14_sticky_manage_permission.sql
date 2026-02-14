-- Přidání oprávnění pro Sticky NOTES
-- Právo: STICKY_MANAGE
-- Pozn.: Skript je idempotentní (lze spustit opakovaně).

-- 1) Založení práva v číselníku práv
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'STICKY_MANAGE', 'Sticky NOTES – správa/užívání tabule', 1
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM 25_prava WHERE kod_prava = 'STICKY_MANAGE'
);

-- 2) (Volitelné, pro konzistenci) přiřazení k roli SUPERADMIN na úrovni role (user_id = -1)
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
SELECT -1, r.id, p.id, 1
FROM 25_role r
JOIN 25_prava p ON p.kod_prava = 'STICKY_MANAGE'
WHERE r.kod_role = 'SUPERADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM 25_role_prava rp
      WHERE rp.user_id = -1
        AND rp.role_id = r.id
        AND rp.pravo_id = p.id
  );
