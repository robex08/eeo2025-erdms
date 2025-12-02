-- ============================================================================
-- ERDMS - Migrace tabulky 25_uzivatele → erdms_users
-- Elektronický Rozcestník pro Dokument Management System
-- ============================================================================
-- 
-- Tento script:
-- 1. Vytvoří modernizovanou tabulku erdms_users s podporou EntraID
-- 2. Optimalizuje datové typy a indexy
-- 3. Připraví strukturu pro hybridní autentizaci (EntraID + legacy)
-- 4. Nastaví správné kódování utf8mb4_czech_ci pro české texty
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VYTVOŘENÍ TABULKY erdms_users
-- ----------------------------------------------------------------------------
-- Modernizovaná verze 25_uzivatele s podporou EntraID sync
-- ----------------------------------------------------------------------------

CREATE TABLE `erdms_users` (
  -- =========================================================================
  -- Primární identifikátory
  -- =========================================================================
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Interní ID uživatele',
  
  `username` VARCHAR(50) NOT NULL 
    COMMENT 'Formát: u{osobni_cislo_5cifer}, např. u03924 - unikátní identifikátor',
  
  -- =========================================================================
  -- EntraID integrace (nové sloupce)
  -- =========================================================================
  `entra_id` VARCHAR(255) NULL 
    COMMENT 'Object ID z Microsoft Entra ID (oid claim z tokenu)',
  
  `upn` VARCHAR(255) NULL 
    COMMENT 'User Principal Name z Entra (např. jan.novak@zachranka.cz)',
  
  `entra_sync_at` TIMESTAMP NULL 
    COMMENT 'Poslední synchronizace dat z EntraID',
  
  `auth_source` ENUM('entra','local','legacy') NOT NULL DEFAULT 'legacy'
    COMMENT 'Zdroj autentizace: entra=SSO přes Entra, local=lokální účet, legacy=migrovaný',
  
  -- =========================================================================
  -- Osobní údaje (synchronizované z EntraID při přihlášení)
  -- =========================================================================
  `titul_pred` VARCHAR(50) NULL 
    COLLATE utf8mb4_czech_ci
    COMMENT 'Titul před jménem (Ing., MUDr., ...)',
  
  `jmeno` VARCHAR(100) NULL 
    COLLATE utf8mb4_czech_ci
    COMMENT 'Křestní jméno - sync z EntraID',
  
  `prijmeni` VARCHAR(100) NULL 
    COLLATE utf8mb4_czech_ci
    COMMENT 'Příjmení - sync z EntraID',
  
  `titul_za` VARCHAR(50) NULL 
    COLLATE utf8mb4_czech_ci
    COMMENT 'Titul za jménem (Ph.D., CSc., ...)',
  
  `email` VARCHAR(255) NULL 
    COMMENT 'Email - sync z EntraID nebo manuální',
  
  `telefon` VARCHAR(50) NULL 
    COMMENT 'Telefon - manuálně nebo z EntraID',
  
  -- =========================================================================
  -- Aplikační metadata (POUZE v DB, NE v EntraID)
  -- =========================================================================
  `pozice_id` INT(10) UNSIGNED NULL 
    COMMENT 'FK → 25_pozice nebo erdms_pozice',
  
  `lokalita_id` INT(10) UNSIGNED NULL 
    COMMENT 'FK → 25_lokality nebo erdms_lokality - domovská lokalita',
  
  `organizace_id` SMALLINT(6) UNSIGNED NOT NULL DEFAULT 1 
    COMMENT 'FK → erdms_organizace',
  
  `usek_id` INT(11) UNSIGNED NOT NULL 
    COMMENT 'FK → 25_useky nebo erdms_useky',
  
  -- =========================================================================
  -- Role a oprávnění (aplikační logika)
  -- =========================================================================
  `role` ENUM('admin','manager','user','readonly') NOT NULL DEFAULT 'user'
    COMMENT 'Globální role v ERDMS systému',
  
  `opravneni` JSON NULL 
    COMMENT 'Detailní oprávnění jako JSON objekt',
  
  -- =========================================================================
  -- Stavy
  -- =========================================================================
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 
    COMMENT '0 = neaktivní/zablokovaný, 1 = aktivní',
  
  -- =========================================================================
  -- Legacy autentizace (pro zpětnou kompatibilitu)
  -- =========================================================================
  `password_hash` VARCHAR(255) NULL 
    COMMENT 'DEPRECATED - pouze pro legacy účty nebo fallback (bcrypt/argon2)',
  
  -- =========================================================================
  -- Časová razítka
  -- =========================================================================
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP 
    COMMENT 'Datum vytvoření záznamu',
  
  `dt_aktualizace` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    COMMENT 'Datum poslední aktualizace záznamu',
  
  `dt_posledni_aktivita` DATETIME NULL 
    COMMENT 'Datum a čas poslední aktivity (přihlášení/akce)',
  
  -- =========================================================================
  -- Indexy a constraints
  -- =========================================================================
  PRIMARY KEY (`id`),
  
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `entra_id` (`entra_id`),
  UNIQUE KEY `upn` (`upn`),
  
  KEY `idx_email` (`email`),
  KEY `idx_pozice` (`pozice_id`),
  KEY `idx_lokalita` (`lokalita_id`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_auth_source` (`auth_source`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_role` (`role`),
  KEY `idx_dt_posledni_aktivita` (`dt_posledni_aktivita`)
  
  -- Foreign keys budou přidány po vytvoření souvisejících tabulek
  -- CONSTRAINT `fk_users_pozice` FOREIGN KEY (`pozice_id`) 
  --   REFERENCES `erdms_pozice` (`id`) ON DELETE SET NULL,
  -- CONSTRAINT `fk_users_lokalita` FOREIGN KEY (`lokalita_id`) 
  --   REFERENCES `erdms_lokality` (`id`) ON DELETE SET NULL,
  -- CONSTRAINT `fk_users_usek` FOREIGN KEY (`usek_id`) 
  --   REFERENCES `erdms_useky` (`id`) ON DELETE RESTRICT
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_czech_ci
  COMMENT='Uživatelé ERDMS - hybridní autentizace EntraID + DB';


-- ----------------------------------------------------------------------------
-- 2. OPTIMALIZACE & ZMĚNY oproti 25_uzivatele
-- ----------------------------------------------------------------------------

-- ✅ ZMĚNY:
-- 1. Všechny INT sloupce → UNSIGNED (ID nemůže být záporné)
-- 2. VARCHAR sloupce s českým textem → COLLATE utf8mb4_czech_ci explicitně
-- 3. Přidány indexy pro časté dotazy (email, role, auth_source)
-- 4. dt_aktualizace → automatický ON UPDATE CURRENT_TIMESTAMP
-- 5. Přidáno: entra_id, upn, entra_sync_at, auth_source, role, opravneni
-- 6. password_hash → NULL (nepovinný pro EntraID účty)
-- 7. Optimalizované datové typy:
--    - organizace_id: SMALLINT (max 32767 organizací stačí)
--    - aktivni: TINYINT(1) (boolean)
--    - role: ENUM (úspora místa oproti VARCHAR)

-- ❌ ODSTRANĚNO:
-- - Žádné sloupce nebyly odstraněny pro zpětnou kompatibilitu

-- ⚠️ POZNÁMKY:
-- - Foreign keys jsou zakomentované - přidat až budou existovat cílové tabulky
-- - password_hash ponechán pro legacy účty a fallback


-- ----------------------------------------------------------------------------
-- 3. TEST KÓDOVÁNÍ - Ověření českých znaků
-- ----------------------------------------------------------------------------

-- Vložení testovacího uživatele s diakritikou
INSERT INTO `erdms_users` (
  `username`, `jmeno`, `prijmeni`, `titul_pred`, `titul_za`,
  `email`, `pozice_id`, `lokalita_id`, `usek_id`, `organizace_id`,
  `role`, `aktivni`, `auth_source`
) VALUES (
  'u00001',
  'Český',
  'Žluťoučký',
  'Ing.',
  'Ph.D.',
  'cesky.zlutoucky@zachranka.cz',
  NULL,
  NULL,
  1,
  1,
  'user',
  1,
  'legacy'
);

-- Test čtení s diakritikou
SELECT 
  id, username, jmeno, prijmeni, titul_pred, titul_za
FROM erdms_users
WHERE username = 'u00001';

-- Očekávaný výsledek:
-- id | username | jmeno  | prijmeni    | titul_pred | titul_za
-- 1  | u00001   | Český  | Žluťoučký   | Ing.       | Ph.D.


-- ----------------------------------------------------------------------------
-- 4. TEST VYHLEDÁVÁNÍ BEZ DIAKRITIKY
-- ----------------------------------------------------------------------------

-- Test 1: Vyhledání "Cesky" (bez háčků) najde "Český" (s háčky)
SELECT * FROM erdms_users 
WHERE jmeno LIKE '%Cesky%';
-- Najde: Český

-- Test 2: Case-insensitive
SELECT * FROM erdms_users 
WHERE prijmeni LIKE '%ZLUTOUCKY%';
-- Najde: Žluťoučký

-- Test 3: Řazení českých znaků
INSERT INTO erdms_users (username, jmeno, usek_id, auth_source) VALUES
  ('u00002', 'Čeněk', 1, 'legacy'),
  ('u00003', 'David', 1, 'legacy'),
  ('u00004', 'Šárka', 1, 'legacy'),
  ('u00005', 'Řehoř', 1, 'legacy'),
  ('u00006', 'Žaneta', 1, 'legacy');

SELECT username, jmeno FROM erdms_users ORDER BY jmeno;
-- Správné české řazení: Čeněk, Český, David, Řehoř, Šárka, Žaneta, Žluťoučký


-- ----------------------------------------------------------------------------
-- 5. MIGRACE DAT ze stávající tabulky 25_uzivatele
-- ----------------------------------------------------------------------------

-- ⚠️ SPUSŤ TENTO SCRIPT AŽ MÁTE BACKUP PŮVODNÍ TABULKY!
-- CREATE TABLE 25_uzivatele_backup AS SELECT * FROM 25_uzivatele;

/*
-- Migrace všech uživatelů ze staré tabulky
INSERT INTO erdms_users (
  username,
  titul_pred,
  jmeno,
  prijmeni,
  titul_za,
  email,
  telefon,
  pozice_id,
  lokalita_id,
  organizace_id,
  usek_id,
  aktivni,
  password_hash,
  dt_vytvoreni,
  dt_aktualizace,
  dt_posledni_aktivita,
  auth_source,  -- Nový sloupec
  role          -- Nový sloupec - nastavit default
)
SELECT 
  username,
  titul_pred,
  jmeno,
  prijmeni,
  titul_za,
  email,
  telefon,
  pozice_id,
  lokalita_id,
  organizace_id,
  usek_id,
  aktivni,
  password_hash,
  dt_vytvoreni,
  dt_aktualizace,
  dt_posledni_aktivita,
  'legacy' as auth_source,  -- Všichni jsou legacy při migraci
  'user' as role            -- Default role
FROM 25_uzivatele
ORDER BY id;

-- Kontrola počtu migrovaných záznamů
SELECT 
  (SELECT COUNT(*) FROM 25_uzivatele) as puvodni_pocet,
  (SELECT COUNT(*) FROM erdms_users WHERE auth_source = 'legacy') as migrovano,
  (SELECT COUNT(*) FROM 25_uzivatele) - (SELECT COUNT(*) FROM erdms_users WHERE auth_source = 'legacy') as rozdil;
*/


-- ----------------------------------------------------------------------------
-- 6. POST-MIGRACE: Doplnění EntraID dat
-- ----------------------------------------------------------------------------

-- Po migraci postupně při prvním loginu přes EntraID aktualizuj:
/*
UPDATE erdms_users
SET 
  entra_id = ?,              -- Z tokenu (oid claim)
  upn = ?,                   -- Z tokenu (preferred_username)
  auth_source = 'entra',     -- Přepni z legacy na entra
  entra_sync_at = NOW(),
  password_hash = NULL       -- Smazat legacy heslo (už není potřeba)
WHERE username = ?;
*/


-- ----------------------------------------------------------------------------
-- 7. OVĚŘOVACÍ DOTAZY
-- ----------------------------------------------------------------------------

-- Zobraz strukturu tabulky
DESCRIBE erdms_users;

-- Zobraz charset a collation všech sloupců
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  CHARACTER_SET_NAME,
  COLLATION_NAME,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'erdms' 
  AND TABLE_NAME = 'erdms_users'
ORDER BY ORDINAL_POSITION;

-- Statistiky uživatelů podle auth_source
SELECT 
  auth_source,
  COUNT(*) as pocet,
  COUNT(entra_id) as ma_entra_id,
  COUNT(password_hash) as ma_heslo
FROM erdms_users
GROUP BY auth_source;

-- Uživatelé bez EntraID (ještě se nepřihlásili přes SSO)
SELECT 
  id, username, jmeno, prijmeni, email, auth_source, dt_posledni_aktivita
FROM erdms_users
WHERE auth_source = 'legacy'
  AND entra_id IS NULL
ORDER BY dt_posledni_aktivita DESC;


-- ----------------------------------------------------------------------------
-- 8. DOPORUČENÉ INDEXY PRO OPTIMALIZACI
-- ----------------------------------------------------------------------------

-- Pokud budete často hledat podle jména/příjmení, přidejte fulltext index:
-- ALTER TABLE erdms_users 
--   ADD FULLTEXT INDEX idx_fulltext_jmeno_prijmeni (jmeno, prijmeni);

-- Pro rychlé vyhledávání emailu (pokud bude unikátní):
-- ALTER TABLE erdms_users 
--   ADD UNIQUE KEY unique_email (email);


-- ============================================================================
-- SROVNÁNÍ: 25_uzivatele vs erdms_users
-- ============================================================================

/*
+-------------------------+----------------------+---------------------------+
| Sloupec                 | 25_uzivatele         | erdms_users               |
+-------------------------+----------------------+---------------------------+
| id                      | INT(10)              | INT(10) UNSIGNED ✅       |
| username                | VARCHAR(50)          | VARCHAR(50) ✅            |
| password_hash           | VARCHAR(255)         | VARCHAR(255) NULL ✅      |
| titul_pred              | VARCHAR(50)          | VARCHAR(50) utf8mb4 ✅    |
| jmeno                   | VARCHAR(100)         | VARCHAR(100) utf8mb4 ✅   |
| prijmeni                | VARCHAR(100)         | VARCHAR(100) utf8mb4 ✅   |
| titul_za                | VARCHAR(50)          | VARCHAR(50) utf8mb4 ✅    |
| email                   | VARCHAR(255)         | VARCHAR(255) + index ✅   |
| telefon                 | VARCHAR(50)          | VARCHAR(50) ✅            |
| pozice_id               | INT(10)              | INT(10) UNSIGNED ✅       |
| lokalita_id             | INT(10)              | INT(10) UNSIGNED ✅       |
| organizace_id           | SMALLINT(6)          | SMALLINT(6) UNSIGNED ✅   |
| usek_id                 | INT(11)              | INT(11) UNSIGNED ✅       |
| aktivni                 | TINYINT(1)           | TINYINT(1) ✅             |
| dt_vytvoreni            | TIMESTAMP            | TIMESTAMP ✅              |
| dt_aktualizace          | TIMESTAMP            | TIMESTAMP AUTO ✅         |
| dt_posledni_aktivita    | DATETIME             | DATETIME ✅               |
| ---                     | ---                  | ---                       |
| entra_id                | ❌ Neexistuje        | VARCHAR(255) ✅ NOVÉ      |
| upn                     | ❌ Neexistuje        | VARCHAR(255) ✅ NOVÉ      |
| entra_sync_at           | ❌ Neexistuje        | TIMESTAMP ✅ NOVÉ         |
| auth_source             | ❌ Neexistuje        | ENUM ✅ NOVÉ              |
| role                    | ❌ Neexistuje        | ENUM ✅ NOVÉ              |
| opravneni               | ❌ Neexistuje        | JSON ✅ NOVÉ              |
+-------------------------+----------------------+---------------------------+

✅ VÝHODY nové struktury:
- Podpora EntraID SSO
- Optimalizované datové typy (UNSIGNED)
- Explicitní utf8mb4_czech_ci pro české texty
- Lepší indexy
- Role a oprávnění
- Připraveno pro budoucí rozšíření
*/


-- ============================================================================
-- HOTOVO!
-- ============================================================================
-- Po spuštění tohoto scriptu máte:
-- ✓ Novou tabulku erdms_users s podporou EntraID
-- ✓ Optimalizované datové typy a indexy
-- ✓ Správné kódování utf8mb4_czech_ci
-- ✓ Test data s českými znaky
-- ✓ Připraveno na migraci z 25_uzivatele
-- ✓ Zpětně kompatibilní struktura
-- ============================================================================
