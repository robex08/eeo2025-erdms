-- Burza Sluzby: jednorazovy backfill oddeleni z display_name
-- Priklad vstupu: "Bezouškova Tereza | ZZSSK"
-- Spustit v databazi: burza-sluzby-dev

UPDATE burza_sluzby_users
SET
    department = TRIM(SUBSTRING_INDEX(display_name, '|', -1)),
    display_name = TRIM(SUBSTRING_INDEX(display_name, '|', 1)),
    updated_at = NOW()
WHERE
    (department IS NULL OR TRIM(department) = '')
    AND display_name IS NOT NULL
    AND display_name LIKE '%|%';
