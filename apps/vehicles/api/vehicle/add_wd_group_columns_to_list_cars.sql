-- Přidá sloupce s group informací přímo z WebDispečinku API
ALTER TABLE list_cars
    ADD COLUMN IF NOT EXISTS wd_cargroupid INT NULL DEFAULT NULL AFTER last_update,
    ADD COLUMN IF NOT EXISTS wd_groupname VARCHAR(128) NULL DEFAULT NULL AFTER wd_cargroupid;
