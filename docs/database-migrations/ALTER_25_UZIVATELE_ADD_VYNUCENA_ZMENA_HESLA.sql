-- ============================================================
-- Migrace: Přidání sloupce pro vynucenou změnu hesla
-- ============================================================
-- Datum: 2025-12-28
-- Autor: System
-- Účel: Přidání sloupce pro indikaci dočasného hesla/nutnosti změny hesla
-- Tabulka: 25_uzivatele
-- ============================================================

USE eeo2025;

-- 1. Přidání sloupce vynucena_zmena_hesla
ALTER TABLE 25_uzivatele 
ADD COLUMN vynucena_zmena_hesla TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Vynucená změna hesla při příštím přihlášení (1=ano, 0=ne)' 
AFTER aktivni;

-- 2. Přidání indexu pro rychlé vyhledávání uživatelů s vynucenou změnou
CREATE INDEX idx_vynucena_zmena_hesla ON 25_uzivatele(vynucena_zmena_hesla);

-- 3. Ověření struktury
DESCRIBE 25_uzivatele;

-- ============================================================
-- POZNÁMKY K POUŽITÍ:
-- ============================================================
-- 
-- Tento sloupec se nastaví na 1 když:
-- - Admin resetuje heslo uživatele
-- - Systém vygeneruje dočasné heslo pro nového uživatele
-- - Admin manuálně vynutí změnu hesla
-- 
-- Sloupec se resetuje na 0 když:
-- - Uživatel úspěšně změní heslo v aplikaci
-- 
-- Login flow:
-- 1. Uživatel se pokusí přihlásit
-- 2. Pokud vynucena_zmena_hesla = 1:
--    - Zobrazí se formulář pro změnu hesla
--    - Bez změny hesla nelze pokračovat do aplikace
-- 3. Po úspěšné změně:
--    - vynucena_zmena_hesla = 0
--    - Uživatel je přihlášen
-- 
-- Příklady SQL příkazů:
-- 
-- Nastavení vynucené změny hesla:
-- UPDATE 25_uzivatele SET vynucena_zmena_hesla = 1 WHERE id = 123;
-- 
-- Resetování po změně hesla:
-- UPDATE 25_uzivatele SET vynucena_zmena_hesla = 0 WHERE id = 123;
-- 
-- Výpis uživatelů s vynucenou změnou:
-- SELECT id, username, jmeno, prijmeni, email 
-- FROM 25_uzivatele 
-- WHERE vynucena_zmena_hesla = 1 AND aktivni = 1;
-- 
-- ============================================================

-- Rollback (pokud by bylo potřeba vrátit změnu):
-- ALTER TABLE 25_uzivatele DROP COLUMN vynucena_zmena_hesla;
-- DROP INDEX idx_vynucena_zmena_hesla ON 25_uzivatele;
