-- ============================================================================
-- MIGRACE: Přidání auth_mode sloupce pro Entra ID
-- Datum: 18. 4. 2026
-- Popis: Přidání sloupce auth_mode do tabulky 25_uzivatele
--        pro podporu různých režimů autentizace (local/entra/both)
-- ============================================================================

-- Přidání sloupce auth_mode
ALTER TABLE `25_uzivatele`
ADD COLUMN `auth_mode` ENUM('local', 'entra', 'both') NULL DEFAULT 'local'
COMMENT 'Režim autentizace uživatele: local (lokální heslo), entra (pouze Entra ID), both (obojí)'
AFTER `upn`;

-- Nastavení výchozí hodnoty pro existující uživatele
UPDATE `25_uzivatele`
SET `auth_mode` = 'local'
WHERE `auth_mode` IS NULL;

-- Index pro rychlé vyhledávání podle režimu autentizace
CREATE INDEX `idx_auth_mode` ON `25_uzivatele` (`auth_mode`);

SELECT 'auth_mode sloupec úspěšně přidán' AS status;

-- Ověření
SHOW COLUMNS FROM `25_uzivatele` WHERE Field = 'auth_mode';
