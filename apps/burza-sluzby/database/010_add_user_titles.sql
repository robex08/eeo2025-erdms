-- Burza Sluzby: doplneni titulu pred/za jmenem do users tabulky.
-- Spustit po 009_add_access_status.sql

ALTER TABLE burza_sluzby_users
    ADD COLUMN IF NOT EXISTS title_before VARCHAR(64) NULL AFTER display_name,
    ADD COLUMN IF NOT EXISTS title_after VARCHAR(64) NULL AFTER title_before;
