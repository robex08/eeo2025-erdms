-- ============================================================================
-- ERDMS - Setup databáze a uživatele
-- Elektronický Rozcestník pro Dokument Management System
-- ============================================================================
-- 
-- Tento script vytvoří:
-- 1. Novou databázi 'erdms' s českým utf8mb4 collation
-- 2. Uživatele 'erdms_user' s přístupem z web serveru
-- 3. Nastaví správné oprávnění
--
-- Spustit jako root nebo admin na MySQL serveru 10.3.172.11
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VYTVOŘENÍ DATABÁZE
-- ----------------------------------------------------------------------------
-- Použijeme utf8mb4_czech_ci pro:
-- - Plnou podporu českých znaků včetně diakritiky
-- - Case-insensitive vyhledávání (á = a, Č = č)
-- - Správné řazení českých znaků (ch mezi h-i)
-- ----------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `erdms`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_czech_ci;

-- Ověření vytvoření
SHOW CREATE DATABASE `erdms`;


-- ----------------------------------------------------------------------------
-- 2. VYTVOŘENÍ UŽIVATELE + OPRÁVNĚNÍ
-- ----------------------------------------------------------------------------
-- DŮLEŽITÉ: Upravte 'heslo_zde' -> Silné heslo (min 16 znaků)
-- 
-- Přístup pro aplikaci ze 2 zdrojů:
--   - akd-www-web01 (hostname)
--   - 10.3.174.11 (IP fallback, když hostname nefunguje)
-- 
-- Poznámka: Localhost není potřeba - admin přístup řešen přes root/phpmyadmin účet
-- ----------------------------------------------------------------------------

-- Přístup z hostname web serveru
GRANT ALL PRIVILEGES ON `erdms`.* TO 'erdms_user'@'akd-www-web01' 
  IDENTIFIED BY 'heslo_zde';

-- Přístup z IP adresy web serveru (fallback)
GRANT ALL PRIVILEGES ON `erdms`.* TO 'erdms_user'@'10.3.174.11' 
  IDENTIFIED BY 'heslo_zde';


-- ----------------------------------------------------------------------------
-- 3. APLIKACE ZMĚN
-- ----------------------------------------------------------------------------

FLUSH PRIVILEGES;


-- ----------------------------------------------------------------------------
-- 4. OVĚŘENÍ KONFIGURACE
-- ----------------------------------------------------------------------------

-- Ověřit charset a collation databáze
SELECT 
  SCHEMA_NAME,
  DEFAULT_CHARACTER_SET_NAME,
  DEFAULT_COLLATION_NAME
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'erdms';

-- Očekávaný výsledek:
-- erdms | utf8mb4 | utf8mb4_czech_ci

-- Ověřit vytvořeného uživatele (měly by být 2 záznamy)
SELECT User, Host FROM mysql.user WHERE User = 'erdms_user';

-- Očekávaný výsledek:
-- erdms_user | akd-www-web01
-- erdms_user | 10.3.174.11

-- Ověřit oprávnění
SHOW GRANTS FOR 'erdms_user'@'akd-www-web01';
SHOW GRANTS FOR 'erdms_user'@'10.3.174.11';


-- ----------------------------------------------------------------------------
-- 5. TEST VYHLEDÁVÁNÍ BEZ DIAKRITIKY
-- ----------------------------------------------------------------------------
-- Ověřte, že vyhledávání funguje bez ohledu na diakritiku
-- ----------------------------------------------------------------------------

USE erdms;

-- Vytvoříme testovací tabulku
CREATE TEMPORARY TABLE test_diakritika (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(100) COLLATE utf8mb4_czech_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Vložíme testovací data
INSERT INTO test_diakritika (text) VALUES
  ('Česká republika'),
  ('Záchranná služba'),
  ('Příjem pacienta'),
  ('Zdravotník'),
  ('Šéf oddělení');

-- TEST 1: Vyhledávání BEZ diakritiky najde záznamy S diakritikou
SELECT * FROM test_diakritika WHERE text LIKE '%ceska%';
-- Najde: "Česká republika"

-- TEST 2: Case-insensitive vyhledávání
SELECT * FROM test_diakritika WHERE text LIKE '%ZACHRANNA%';
-- Najde: "Záchranná služba"

-- TEST 3: Bez diakritiky i case-insensitive
SELECT * FROM test_diakritika WHERE text LIKE '%prijem%';
-- Najde: "Příjem pacienta"

-- TEST 4: Řazení českých znaků
SELECT * FROM test_diakritika ORDER BY text;
-- Správné řazení: Česká, Příjem, Šéf, Záchranná, Zdravotník

-- Pokud výsledky odpovídají, collation je správně nastavená ✓


-- ============================================================================
-- POZNÁMKY A DOPORUČENÍ
-- ============================================================================

-- 1. COLLATION utf8mb4_czech_ci:
--    - 'czech' = české řazení (ch, ř, š, ž správně)
--    - 'ci' = case insensitive (A = a, Č = č)
--    - Vyhledávání 'zahrada' najde 'Záhrada', 'zahrada', 'ZÁHRADA'

-- 2. CHARSET utf8mb4:
--    - Plná podpora Unicode (emoji, speciální znaky)
--    - Doporučeno pro všechny nové projekty
--    - Nepotřebujete convertovat ě → e, á → a

-- 3. BEZPEČNOST:
--    - Použijte SILNÉ heslo (min 16 znaků)
--    - Nepoužívejte @'%' v produkci
--    - Povolte pouze konkrétní hostname/IP web serveru

-- 4. FIREWALL:
--    - Ujistěte se, že firewall povoluje spojení na port 3306
--    - Z IP adresy web serveru akd-www-web01

-- 5. SSL PŘIPOJENÍ (doporučeno):
--    - Přidejte REQUIRE SSL do CREATE USER
--    - CREATE USER 'erdms_user'@'...' IDENTIFIED BY '...' REQUIRE SSL;

-- ============================================================================
-- KONFIGURACE PRO NODE.JS (.env)
-- ============================================================================

-- DB_HOST=10.3.172.11
-- DB_PORT=3306
-- DB_NAME=erdms
-- DB_USER=erdms_user
-- DB_PASSWORD=heslo_zde
-- DB_CHARSET=utf8mb4
-- DB_COLLATION=utf8mb4_czech_ci

-- ============================================================================
-- PŘÍKLAD PŘIPOJENÍ V NODE.JS
-- ============================================================================

/*
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  // Pro MariaDB/MySQL 8.0+
  authPlugins: {
    mysql_native_password: () => () => Buffer.from(process.env.DB_PASSWORD + '\0')
  }
});

// Test připojení
const connection = await pool.getConnection();
console.log('✓ Připojeno k databázi');
connection.release();
*/

-- ============================================================================
-- HOTOVO! 
-- ============================================================================
-- Po spuštění tohoto scriptu bude:
-- ✓ Databáze 'erdms' vytvořena s českým utf8mb4
-- ✓ Uživatel 'erdms_user' vytvořen s přístupem
-- ✓ Vyhledávání bez diakritiky bude fungovat automaticky
-- ✓ Připraveno pro Node.js aplikaci
-- ============================================================================
