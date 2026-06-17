-- ============================================================================
-- AUDIT LOG EEO - Fáze 1
-- Tabulka: 25a_audit_zmen
-- Popis: Specializovaný field-level audit log pro objednávky, faktury,
--        roční poplatky a kontakty dodavatelů.
--        Napojení na zastupování přes zastupovani_id (nullable FK) –
--        tabulka 25_zastupovani_akce_log zůstává BEZE ZMĚN.
-- Autor: AI / EEO DEV TEAM
-- Datum: 2026-06-13
-- DB: eeo2025-dev (DEV) / eeo2025 (PROD - nasadit PŘED deployem PHP kódu)
-- ============================================================================

USE `EEO-OSTRA-DEV`;

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
  COMMENT='Field-level audit log pro Objednávky, Faktury, Roční poplatky, Dodavatele. Fáze 1.';

-- ============================================================================
-- OVĚŘENÍ
-- ============================================================================
SHOW TABLES LIKE '25a_audit_zmen';
SHOW COLUMNS FROM `25a_audit_zmen`;
