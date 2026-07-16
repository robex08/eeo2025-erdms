-- Přidá status vozidla (český ENUM) a čas poslední synchronizace do list_cars
ALTER TABLE list_cars
    ADD COLUMN IF NOT EXISTS status_vozidla ENUM('aktivni', 'neaktivni', 'vyrazene') NOT NULL DEFAULT 'aktivni' AFTER zzs_typ,
    ADD COLUMN IF NOT EXISTS last_update DATETIME NULL DEFAULT NULL AFTER status_vozidla;

-- Volitelné: zpětné doplnění času pro existující řádky
UPDATE list_cars
SET last_update = NOW()
WHERE last_update IS NULL;
