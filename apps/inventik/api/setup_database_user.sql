-- =============================================================================
-- INVENTIK - Database & User Setup
-- =============================================================================
-- Vytvoření databáze a dedikovaného uživatele pro Inventik
-- 
-- Spuštění:
-- mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' < setup_database_user.sql
-- 
-- =============================================================================

-- Vytvoření databáze (prázdná, bez tabulek)
CREATE DATABASE IF NOT EXISTS `inventik-dev` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_czech_ci;

-- Vytvoření uživatele 'inventik'
-- Generované heslo: Inv3nt1k2026!
CREATE USER IF NOT EXISTS 'inventik'@'10.3.174.11' IDENTIFIED BY 'Inv3nt1k2026!';
CREATE USER IF NOT EXISTS 'inventik'@'akd-www-web01' IDENTIFIED BY 'Inv3nt1k2026!';

-- Oprávnění POUZE pro databázi inventik-dev
GRANT ALL PRIVILEGES ON `inventik-dev`.* TO 'inventik'@'10.3.174.11';
GRANT ALL PRIVILEGES ON `inventik-dev`.* TO 'inventik'@'akd-www-web01';

-- Flush privileges
FLUSH PRIVILEGES;

-- Ověření
SELECT 'Databáze inventik-dev vytvořena (prázdná)' as Status;
SELECT 'Uživatel inventik vytvořen s přístupem pouze do inventik-dev' as Info;
SHOW GRANTS FOR 'inventik'@'10.3.174.11';
