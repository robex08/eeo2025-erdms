-- ============================================================================
-- PRODUKČNÍ MIGRACE - 2026-06-21
-- Tabulka: 25a_audit_zmen
-- Popis: Přidání field-level audit logu do PROD databáze
-- ============================================================================
-- ⚠️ DŮLEŽITÉ:
--    - Spouštět POUZE na PROD databázi (eeo2025)
--    - Nejdřív otestovat na eeo2025_migrace0626
--    - Tabulka bude vytvořena PRÁZDNÁ (žádná data z DEV)
--    - Použit IF NOT EXISTS = bezpečné pro opakované spuštění
--    - ŽÁDNÉ změny existujících tabulek
-- ============================================================================
-- Datum: 2026-06-21
-- Autor: EEO DEV TEAM
-- Backup: /var/www/__BCK_PRODUKCE/2026-06-21/ (vytvořeno před nasazením)
-- Migrace DB: eeo2025_migrace0626 (testovací klón)
-- ============================================================================

-- Použití:
-- 1. TEST: mysql -h 10.3.172.11 -u phpmyadmin -p eeo2025_migrace0626 < tento_soubor.sql
-- 2. PROD: mysql -h 10.3.172.11 -u phpmyadmin -p eeo2025 < tento_soubor.sql
-- ============================================================================

-- Nastavení databáze (pro PROD nasazení změnit na eeo2025)
-- USE `eeo2025`;

-- ============================================================================
-- VYTVOŘENÍ TABULKY: 25a_audit_zmen
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_audit_zmen` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- KDO provedl akci (snapshot v čase akce - chrání před přejmenováním uživatele)
    `uzivatel_id`           INT(10) UNSIGNED NOT NULL,
    `username_snapshot`     VARCHAR(100) NOT NULL,
    `jmeno_snapshot`        VARCHAR(100) NOT NULL DEFAULT '',
    `prijmeni_snapshot`     VARCHAR(100) NOT NULL DEFAULT '',

    -- CO bylo změněno
    `objekt_typ`            VARCHAR(50) NOT NULL COMMENT 'OBJEDNAVKA | FAKTURA | ROCNI_POPLATEK | ROCNI_POPLATEK_POLOZKA | DODAVATEL',
    `objekt_id`             INT(10) UNSIGNED NOT NULL,
    `akce_typ`              VARCHAR(50) NOT NULL COMMENT 'CREATE | UPDATE | DELETE | UNLOCK | APPROVE | REJECT | RESET | LOCK',

    -- POLE - jeden řádek = jedna změna jednoho pole
    `pole`                  VARCHAR(100) NOT NULL COMMENT 'Název DB sloupce (např. max_cena_s_dph)',
    `stara_hodnota_json`    TEXT NULL COMMENT 'NULL u CREATE akcí',
    `nova_hodnota_json`     TEXT NULL COMMENT 'NULL u DELETE akcí',

    -- KONTEXT akce
    `endpoint`              VARCHAR(150) NOT NULL DEFAULT '' COMMENT 'Např. order-v2/{id} nebo invoices25/update',
    `batch_id`              VARCHAR(36) NOT NULL DEFAULT '' COMMENT 'UUID - propojení změn z jednoho uložení (objednávka + faktury)',
    `ip_adresa`             VARCHAR(45) NULL,
    `user_agent`            VARCHAR(255) NULL,
    `poznamka`              VARCHAR(500) NULL,

    -- ZASTUPOVÁNÍ - nullable odkaz, 25_zastupovani_akce_log BEZE ZMĚN
    `zastupovani_id`        INT(10) UNSIGNED NULL DEFAULT NULL COMMENT 'FK na 25_uzivatele_zastupovani.id - pouze pokud se jednalo v zastoupení',

    `dt_akce`               DATETIME NOT NULL,

    PRIMARY KEY (`id`),

    -- Indexy pro timeline a filtrování
    INDEX `idx_objekt` (`objekt_typ`, `objekt_id`, `dt_akce`),
    INDEX `idx_uzivatel` (`uzivatel_id`, `dt_akce`),
    INDEX `idx_batch` (`batch_id`),
    INDEX `idx_akce_typ` (`akce_typ`, `dt_akce`),
    INDEX `idx_zastupovani` (`zastupovani_id`),
    INDEX `idx_dt_akce` (`dt_akce`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Field-level audit log pro Objednávky, Faktury, Roční poplatky, Dodavatele. PROD migrace 2026-06-21.';

-- ============================================================================
-- OVĚŘENÍ PO NASAZENÍ
-- ============================================================================
-- Zkontrolovat, že tabulka byla vytvořena:
SELECT 'Tabulka 25a_audit_zmen byla vytvořena' AS status;

-- Zobrazit strukturu:
SHOW COLUMNS FROM `25a_audit_zmen`;

-- Ověřit indexy:
SHOW INDEX FROM `25a_audit_zmen`;

-- Zkontrolovat počet řádků (mělo by být 0 = prázdná tabulka):
SELECT COUNT(*) AS pocet_radku FROM `25a_audit_zmen`;

-- Ověřit collation:
SELECT 
    TABLE_NAME,
    TABLE_COLLATION,
    ENGINE,
    TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = '25a_audit_zmen';

-- ============================================================================
-- KONEC MIGRACE
-- ============================================================================
-- ✅ Po úspěšném nasazení:
--    1. Tabulka 25a_audit_zmen existuje v PROD
--    2. Tabulka je prázdná (0 řádků)
--    3. Všechny indexy jsou vytvořeny
--    4. PHP API může začít zapisovat audit logy
--
-- 📝 Poznámky:
--    - Data se začnou generovat automaticky při API operacích
--    - První zápisy proběhnou při úpravě objednávek/faktur v PROD
--    - Žádná migrace starých dat není nutná (nový feature)
-- ============================================================================
