-- Migration: Přidání sloupce visible_in_phonebook do 25_uzivatele
-- Datum: 2026-01-05
-- Popis: Oddělení viditelnosti v telefonním seznamu od aktivního přihlášení
-- ENV: DEV

-- Přidat sloupec visible_in_phonebook (default 1 = viditelný)
ALTER TABLE 25_uzivatele 
ADD COLUMN visible_in_phonebook TINYINT(1) NOT NULL DEFAULT 1 
COMMENT 'Viditelnost v telefonním seznamu (menu Kontakty). 1=viditelný, 0=skrytý' 
AFTER aktivni;

-- Kontrola
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'eeo2025-dev'
  AND TABLE_NAME = '25_uzivatele'
  AND COLUMN_NAME IN ('aktivni', 'visible_in_phonebook')
ORDER BY ORDINAL_POSITION;

-- Poznámka:
-- aktivni = 1 -> uživatel se může přihlásit do systému
-- visible_in_phonebook = 1 -> zobrazí se v menu "Kontakty" (telefonní seznam)
-- 
-- Případy použití:
-- 1. aktivni=1, visible_in_phonebook=1 -> normální zaměstnanec (přihlášení + v seznamu)
-- 2. aktivni=1, visible_in_phonebook=0 -> systémový účet (přihlášení, ale ne v seznamu)
-- 3. aktivni=0, visible_in_phonebook=1 -> bývalý zaměstnanec (nepřihlásí se, ale v seznamu)
-- 4. aktivni=0, visible_in_phonebook=0 -> deaktivován úplně
