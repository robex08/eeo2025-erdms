-- =============================================================================
-- CREATE DATABASE: EEO-OSTRA-DEV
-- =============================================================================
-- Tento script vytvoří novou databázi pro klon ostré databáze eeo2025
-- 
-- ⚠️ SPUSŤ POD ÚČTEM S ADMIN PRÁVY!
-- 
-- Použití:
-- mysql -u root -p < 01-create-eeo-ostra-dev-database.sql
-- 
-- =============================================================================

-- Vytvoření databáze
CREATE DATABASE IF NOT EXISTS `EEO-OSTRA-DEV` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_czech_ci;

-- Nastavení oprávnění pro stejného uživatele jako pro EEO2025
GRANT ALL PRIVILEGES ON `EEO-OSTRA-DEV`.* TO 'erdms_user'@'%';
FLUSH PRIVILEGES;

-- Ověření
SHOW DATABASES LIKE 'EEO-OSTRA-DEV';
SHOW GRANTS FOR 'erdms_user'@'%';

-- Info pro další krok
SELECT 'Databáze EEO-OSTRA-DEV byla vytvořena!' as Status;
SELECT 'Uživatel erdms_user má plná oprávnění k databázi' as Permissions;
SELECT 'Nyní můžeš spustit script: 02-clone-eeo2025-to-dev.sh' as NextStep;
