-- ============================================================================
-- MIGRACE: Přidání EntraID autentizace do EEO-v2
-- Datum: 2026-04-14
-- Popis: Přidání sloupců pro Microsoft Entra ID do tabulky 25_uzivatele
-- Author: AI Assistant
-- ============================================================================

-- TESTOVÁNO NA: MySQL 5.5.46 (DEV environment)
-- CÍLOVÁ DB: eeo2025 (DEV), později eeo2025 (PROD after testing)

-- ============================================================================
-- ČÁST 1: Přidání EntraID columns do 25_uzivatele
-- ============================================================================

USE eeo2025;

-- Zkontrolovat existenci sloupců před přidáním
-- (MySQL 5.5 nemá IF NOT EXISTS pro ALTER TABLE ADD COLUMN, proto používáme stored procedure)

DELIMITER $$

DROP PROCEDURE IF EXISTS add_entra_columns$$

CREATE PROCEDURE add_entra_columns()
BEGIN
    -- Přidat entra_id column (Microsoft Entra Object ID - GUID)
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = 'eeo2025' 
        AND TABLE_NAME = '25_uzivatele' 
        AND COLUMN_NAME = 'entra_id'
    ) THEN
        ALTER TABLE 25_uzivatele 
        ADD COLUMN entra_id VARCHAR(255) NULL UNIQUE 
        COMMENT 'Microsoft Entra ID (Azure AD) Object ID (GUID)';
        
        SELECT 'Column entra_id added successfully' AS message;
    ELSE
        SELECT 'Column entra_id already exists, skipping' AS message;
    END IF;
    
    -- Přidat upn column (User Principal Name - email formát)
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = 'eeo2025' 
        AND TABLE_NAME = '25_uzivatele' 
        AND COLUMN_NAME = 'upn'
    ) THEN
        ALTER TABLE 25_uzivatele 
        ADD COLUMN upn VARCHAR(255) NULL 
        COMMENT 'User Principal Name z Entra ID (např. u03924@zachranka.cz)';
        
        SELECT 'Column upn added successfully' AS message;
    ELSE
        SELECT 'Column upn already exists, skipping' AS message;
    END IF;
    
    -- Přidat auth_source column (odkud se uživatel přihlašuje)
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = 'eeo2025' 
        AND TABLE_NAME = '25_uzivatele' 
        AND COLUMN_NAME = 'auth_source'
    ) THEN
        ALTER TABLE 25_uzivatele 
        ADD COLUMN auth_source ENUM('local', 'entra_id', 'hybrid') DEFAULT 'local' 
        COMMENT 'Zdroj autentizace: local (heslo v DB), entra_id (Microsoft), hybrid (obojí)';
        
        SELECT 'Column auth_source added successfully' AS message;
    ELSE
        SELECT 'Column auth_source already exists, skipping' AS message;
    END IF;
    
    -- Přidat entra_sync_at column (čas poslední synchronizace s Entra ID)
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = 'eeo2025' 
        AND TABLE_NAME = '25_uzivatele' 
        AND COLUMN_NAME = 'entra_sync_at'
    ) THEN
        ALTER TABLE 25_uzivatele 
        ADD COLUMN entra_sync_at TIMESTAMP NULL 
        COMMENT 'Čas poslední synchronizace uživatelských dat s Microsoft Entra ID';
        
        SELECT 'Column entra_sync_at added successfully' AS message;
    ELSE
        SELECT 'Column entra_sync_at already exists, skipping' AS message;
    END IF;
END$$

DELIMITER ;

-- Spustit proceduru
CALL add_entra_columns();

-- Smazat proceduru (cleanup)
DROP PROCEDURE IF EXISTS add_entra_columns;

-- ============================================================================
-- OVĚŘENÍ: Zkontrolovat přidané columns
-- ============================================================================

SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'eeo2025'
AND TABLE_NAME = '25_uzivatele'
AND COLUMN_NAME IN ('entra_id', 'upn', 'auth_source', 'entra_sync_at')
ORDER BY ORDINAL_POSITION;

-- ============================================================================
-- POZNÁMKY K MIGRACI:
-- ============================================================================
-- 
-- 1. BACKWARD COMPATIBLE: 
--    - Všechny nové columns jsou NULL nebo mají DEFAULT hodnotu
--    - Existující users zůstávají auth_source='local'
--    - Žádná povinná data pro stávající záznamy
--
-- 2. UNIQUE CONSTRAINT na entra_id:
--    - Jeden Entra ID = max. jeden EEO user
--    - Zabraňuje duplicitám při synchronizaci
--
-- 3. auth_source hodnoty:
--    - 'local' = klasický login (username + password)
--    - 'entra_id' = pouze EntraID login
--    - 'hybrid' = může použít obojí (rezerva pro budoucnost)
--
-- 4. ROLLBACK (pokud bude potřeba):
--    ALTER TABLE 25_uzivatele DROP COLUMN entra_id;
--    ALTER TABLE 25_uzivatele DROP COLUMN upn;
--    ALTER TABLE 25_uzivatele DROP COLUMN auth_source;
--    ALTER TABLE 25_uzivatele DROP COLUMN entra_sync_at;
--
-- ============================================================================
-- TESTOVÁNÍ:
-- ============================================================================
--
-- -- Vložit testovacího uživatele s EntraID
-- INSERT INTO 25_uzivatele (
--   username, password_hash, entra_id, upn, auth_source, 
--   jmeno, prijmeni, email, aktivni, organizace_id, usek_id
-- ) VALUES (
--   'u99999', '', 
--   'a1b2c3d4-1234-5678-90ab-cdef12345678', 
--   'u99999@zachranka.cz',
--   'entra_id',
--   'Test', 'Uživatel', 'u99999@zachranka.cz', 
--   1, 1, 1
-- );
--
-- -- Zkontrolovat
-- SELECT id, username, entra_id, upn, auth_source, entra_sync_at 
-- FROM 25_uzivatele WHERE username = 'u99999';
--
-- -- Cleanup
-- DELETE FROM 25_uzivatele WHERE username = 'u99999';
--
-- ============================================================================
