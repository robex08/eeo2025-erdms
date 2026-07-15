-- Burza Sluzby: stav schvaleni pristupu uzivatele.
-- Spustit v databazi: burza-sluzby-dev

ALTER TABLE burza_sluzby_users
    ADD COLUMN IF NOT EXISTS access_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER local_role;

-- Inicializace stavajicich dat podle aktivniho stavu.
UPDATE burza_sluzby_users
SET access_status = CASE
    WHEN aktivni = 1 THEN 'approved'
    ELSE COALESCE(NULLIF(access_status, ''), 'rejected')
END,
updated_at = NOW();
