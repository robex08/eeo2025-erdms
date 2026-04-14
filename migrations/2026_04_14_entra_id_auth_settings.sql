-- ============================================================================
-- MIGRACE: Přidání nastavení EntraID autentizace
-- Datum: 2026-04-14
-- Popis: Přidání globálních nastavení pro režim autentizace do 25a_nastaveni_globalni
-- Author: AI Assistant
-- ============================================================================

USE eeo2025;

-- ============================================================================
-- Vložení nastavení pro EntraID autentizaci
-- ============================================================================

-- Nastavení 1: auth_mode (režim autentizace)
INSERT INTO 25a_nastaveni_globalni (klic, hodnota, popis, vytvoreno)
VALUES (
    'auth_mode',
    'local_only',
    'Režim autentizace: local_only (pouze lokální), entra_all (EntraID + lokální pro všechny), entra_admin_local (EntraID + lokální jen pro adminy)',
    NOW()
)
ON DUPLICATE KEY UPDATE 
    popis = VALUES(popis),
    aktualizovano = NOW();

-- Nastavení 2: entra_enabled (zapnout/vypnout EntraID)
INSERT INTO 25a_nastaveni_globalni (klic, hodnota, popis, vytvoreno)
VALUES (
    'entra_enabled',
    '0',
    'EntraID přihlášení povoleno: 0 (vypnuto, tlačítko neviditelné), 1 (zapnuto, tlačítko viditelné)',
    NOW()
)
ON DUPLICATE KEY UPDATE 
    popis = VALUES(popis),
    aktualizovano = NOW();

-- ============================================================================
-- OVĚŘENÍ: Zkontrolovat vložená nastavení
-- ============================================================================

SELECT 
    id,
    klic,
    hodnota,
    popis,
    vytvoreno,
    aktualizovano
FROM 25a_nastaveni_globalni
WHERE klic IN ('auth_mode', 'entra_enabled')
ORDER BY klic;

-- ============================================================================
-- POZNÁMKY K NASTAVENÍ:
-- ============================================================================
--
-- auth_mode hodnoty:
--   - 'local_only'        = Současný stav, pouze klasický login (výchozí)
--   - 'entra_all'         = EntraID + lokální login pro všechny (pilotní provoz)
--   - 'entra_admin_local' = EntraID pro users, lokální jen pro adminy (doporučený PROD)
--
-- entra_enabled hodnoty:
--   - '0' = EntraID tlačítko NEVIDITELNÉ na login page
--   - '1' = EntraID tlačítko VIDITELNÉ na login page
--
-- KOMBINACE:
--   entra_enabled=0, auth_mode=* → Tlačítko schované, EntraID nefunguje
--   entra_enabled=1, auth_mode=local_only → Chyba konfigurace (mělo by být zabráněno)
--   entra_enabled=1, auth_mode=entra_all → Oba způsoby pro všechny
--   entra_enabled=1, auth_mode=entra_admin_local → EntraID pro users, local pro admins
--
-- ROLLOUT PLÁN:
--   1. Nasadit kód s auth_mode='local_only', entra_enabled='0' → ZERO ZMĚN  
--   2. Testovat na DEV s entra_enabled='1', auth_mode='entra_all'
--   3. PROD soft launch: auth_mode='local_only', entra_enabled='0' (kód v PROD ale vypnutý)
--   4. PROD pilot: auth_mode='entra_all', entra_enabled='1' (dobrovolné testování)
--   5. PROD finální: auth_mode='entra_admin_local', entra_enabled='1'
--
-- ============================================================================
-- PŘÍKLAD POUŽITÍ V PHP:
-- ============================================================================
--
-- require_once 'models/GlobalSettingsModel.php';
-- $settingsModel = new GlobalSettingsModel($db);
-- 
-- // Načtení
-- $authMode = $settingsModel->getSetting('auth_mode');
-- $entraEnabled = $settingsModel->getSetting('entra_enabled');
-- 
-- if ($entraEnabled === '1' && $authMode !== 'local_only') {
--     // EntraID login je povolený
--     if ($authMode === 'entra_admin_local') {
--         // Zkontrolovat zda je user admin
--     }
-- }
--
-- // Uložení (pouze SUPERADMIN)
-- $settingsModel->setSetting('auth_mode', 'entra_all', 'Zapnut pilotní provoz');
--
-- ============================================================================
