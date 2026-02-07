-- Aktualizace telefonů uživatelů
-- Datum: 2026-01-04 16:26:00
-- POZOR: POUZE PRO DEV DATABÁZI eeo2025-dev!
-- NEPROVÁDĚJTE BEZ POTVRZENÍ!

-- Tereza Balousová (ID: 47): 123123123 → 777123456
UPDATE `25_uzivatele` SET `telefon` = '777123456' WHERE `id` = 47;
-- Jan Černohorský (ID: 101): 731137 → 607121582
UPDATE `25_uzivatele` SET `telefon` = '607121582' WHERE `id` = 101;
-- Robert Holovský (ID: 100): 731137077 → 731137100
UPDATE `25_uzivatele` SET `telefon` = '731137100' WHERE `id` = 100;
