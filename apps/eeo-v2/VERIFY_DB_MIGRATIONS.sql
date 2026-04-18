-- ============================================================================
-- VERIFICATION SCRIPT - Ověření DB migrací před/po deployi
-- ============================================================================
-- Datum: 2026-04-18
-- Účel: Zkontrolovat, že všechny potřebné DB struktury existují v PROD DB
-- Použití: mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < VERIFY_DB_MIGRATIONS.sql
-- ============================================================================

SELECT '=== OVĚŘENÍ DB MIGRACÍ PRO DEPLOY 2026-04-18 ===' AS info;

-- ============================================================================
-- 1. KOMENTÁŘE OBJEDNÁVEK - Sloupec dt_aktualizace
-- ============================================================================
SELECT 
    '1. Komentáře - dt_aktualizace' AS test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK - sloupec existuje'
        ELSE '❌ CHYBÍ - nutná migrace SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql'
    END AS status,
    COUNT(*) as sloupec_existuje
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25a_objednavky_komentare'
  AND COLUMN_NAME = 'dt_aktualizace';

-- ============================================================================
-- 2. NOTIFIKACE - Event typy pro komentáře
-- ============================================================================
SELECT 
    '2. Notifikace - Event typy' AS test_name,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ OK - oba event typy existují'
        WHEN COUNT(*) = 1 THEN '⚠️  ČÁSTEČNĚ - chybí jeden event type'
        ELSE '❌ CHYBÍ - nutná migrace SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql'
    END AS status,
    GROUP_CONCAT(kod SEPARATOR ', ') as nalezene_typy
FROM 25_notifikace_typy_udalosti
WHERE kod IN ('ORDER_COMMENT_ADDED', 'COMMENT_REPLY');

-- ============================================================================
-- 3. NOTIFIKACE - Šablony pro komentáře
-- ============================================================================
SELECT 
    '3. Notifikace - Šablony' AS test_name,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ OK - obě šablony existují'
        WHEN COUNT(*) = 1 THEN '⚠️  ČÁSTEČNĚ - chybí jedna šablona'
        ELSE '❌ CHYBÍ - nutná migrace SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql'
    END AS status,
    GROUP_CONCAT(typ SEPARATOR ', ') as nalezene_sablony
FROM 25_notifikace_sablony
WHERE typ IN ('ORDER_COMMENT_ADDED', 'COMMENT_REPLY');

-- ============================================================================
-- 4. DASHBOARD - Oprávnění pro aktivní uživatele
-- ============================================================================
SELECT 
    '4. Dashboard - Právo DASHBOARD_ACTIVE_USERS' AS test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK - právo existuje'
        ELSE '❌ CHYBÍ - nutná migrace 2026-04-13_dashboard_active_users_permission.sql'
    END AS status,
    COUNT(*) as pravo_existuje
FROM 25_prava
WHERE kod_prava = 'DASHBOARD_ACTIVE_USERS';

-- ============================================================================
-- 5. DASHBOARD - Přiřazení práva SUPERADMIN roli
-- ============================================================================
SELECT 
    '5. Dashboard - Přiřazení SUPERADMIN' AS test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK - právo přiřazeno SUPERADMIN roli'
        ELSE '⚠️  CHYBÍ - SUPERADMIN nemá právo (spusť migraci)'
    END AS status,
    COUNT(*) as prirazeni_existuji
FROM 25_role_prava rp
JOIN 25_prava p ON p.id = rp.pravo_id
JOIN 25_role r ON r.id = rp.role_id
WHERE p.kod_prava = 'DASHBOARD_ACTIVE_USERS'
  AND r.kod_role = 'SUPERADMIN';

-- ============================================================================
-- 6. FAKTURY - Věcná správnost sloupce
-- ============================================================================
SELECT 
    '6. Faktury - Věcná správnost sloupce' AS test_name,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ OK - všechny sloupce věcné správnosti existují'
        WHEN COUNT(*) > 0 THEN '⚠️  ČÁSTEČNĚ - některé sloupce chybí'
        ELSE '❌ CHYBÍ - nutná migrace migration_faktury_vecna_spravnost.sql'
    END AS status,
    COUNT(*) as pocet_sloupcu,
    GROUP_CONCAT(COLUMN_NAME SEPARATOR ', ') as nalezene_sloupce
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25a_faktury_objednavek'
  AND COLUMN_NAME IN (
    'potvrzeni_vecne_spravnosti',
    'potvrzeno_uzivatel_id',
    'potvrzeno_datum',
    'vecna_spravnost_umisteni_majetku',
    'vecna_spravnost_poznamka'
  );

-- ============================================================================
-- 7. FAKTURY - Foreign key na uživatele (věcná správnost)
-- ============================================================================
SELECT 
    '7. Faktury - FK věcná správnost' AS test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK - foreign key existuje'
        ELSE '⚠️  CHYBÍ - foreign key na potvrzeno_uzivatel_id (nemusí být kritické)'
    END AS status,
    COUNT(*) as fk_existuje
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25a_faktury_objednavek'
  AND COLUMN_NAME = 'potvrzeno_uzivatel_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ============================================================================
-- 8. UŽIVATELÉ - Entra ID sloupce
-- ============================================================================
SELECT 
    '8. Uživatelé - Entra ID sloupce' AS test_name,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ OK - Entra ID sloupce existují'
        WHEN COUNT(*) > 0 THEN '⚠️  ČÁSTEČNĚ - některé sloupce chybí'
        ELSE '❌ CHYBÍ - nutná migrace pro Entra ID (entra_id, upn)'
    END AS status,
    COUNT(*) as pocet_sloupcu,
    GROUP_CONCAT(COLUMN_NAME SEPARATOR ', ') as nalezene_sloupce
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25_uzivatele'
  AND COLUMN_NAME IN ('entra_id', 'upn', 'auth_mode');

-- ============================================================================
-- 9. GLOBÁLNÍ NASTAVENÍ - Entra konfigurace
-- ============================================================================
SELECT 
    '9. Globální nastavení - Entra konfigurace' AS test_name,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ OK - Entra nastavení existují'
        WHEN COUNT(*) > 0 THEN '⚠️  ČÁSTEČNĚ - některá nastavení chybí'
        ELSE '⚠️  CHYBÍ - Entra nastavení neexistují (vytvoří se automaticky)'
    END AS status,
    GROUP_CONCAT(CONCAT(klic, '=', hodnota) SEPARATOR ', ') as nalezena_nastaveni
FROM 25a_nastaveni_globalni
WHERE klic IN ('entra_enabled', 'auth_mode', 'auto_provision_enabled');

-- ============================================================================
-- 10. FAKTURY PŘÍLOHY - Tabulka (pokud se používá)
-- ============================================================================
SELECT 
    '10. Faktury přílohy - Tabulka' AS test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK - tabulka 25a_faktury_prilohy existuje'
        ELSE '⚠️  INFO - tabulka neexistuje (pokud se nepoužívá, OK)'
    END AS status,
    COUNT(*) as tabulka_existuje
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25a_faktury_prilohy';

-- ============================================================================
-- SHRNUTÍ VÝSLEDKŮ
-- ============================================================================
SELECT '=== SHRNUTÍ ===' AS info;

SELECT 
    'Celkový počet testů' AS metrika,
    10 AS hodnota;

SELECT 
    'Verze databáze' AS metrika,
    DATABASE() AS hodnota;

SELECT 
    'Datum kontroly' AS metrika,
    NOW() AS hodnota;

-- ============================================================================
-- DETAILNÍ PŘEHLED EXISTUJÍCÍCH STRUKTUR
-- ============================================================================
SELECT '=== DETAILNÍ PŘEHLED ===' AS info;

-- Sloupce komentářů
SELECT 
    'Komentáře - struktura' AS info,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25a_objednavky_komentare'
  AND COLUMN_NAME IN ('dt_vytvoreni', 'dt_aktualizace')
ORDER BY ORDINAL_POSITION;

-- Faktury - věcná správnost
SELECT 
    'Faktury - věcná správnost struktura' AS info,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25a_faktury_objednavek'
  AND COLUMN_NAME LIKE '%vecn%' OR COLUMN_NAME LIKE '%potvrzeno%'
ORDER BY ORDINAL_POSITION;

-- Uživatelé - Entra
SELECT 
    'Uživatelé - Entra struktura' AS info,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25_uzivatele'
  AND (COLUMN_NAME LIKE '%entra%' OR COLUMN_NAME LIKE '%upn%' OR COLUMN_NAME = 'auth_mode')
ORDER BY ORDINAL_POSITION;

SELECT '=== KONEC OVĚŘENÍ ===' AS info;

-- ============================================================================
-- POZNÁMKY K VÝSLEDKŮM:
-- ============================================================================
-- ✅ OK - vše funguje, migrace není potřeba
-- ⚠️  ČÁSTEČNĚ - některé struktury chybí, zkontroluj detaily
-- ❌ CHYBÍ - nutná migrace před deployem!
--
-- Po spuštění tohoto skriptu:
-- 1. Zkontroluj všechny výsledky
-- 2. Pokud je něco ❌ CHYBÍ - spusť příslušnou migraci
-- 3. Spusť tento script znovu pro ověření
-- 4. Až je vše ✅ OK - můžeš pokračovat v deployi
-- ============================================================================
