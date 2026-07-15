-- Burza Sluzby: doplneni telefonu do users tabulky.
-- Spustit po 011_create_burza_sluzby_app_settings.sql

ALTER TABLE burza_sluzby_users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(64) NULL AFTER email;
