-- ============================================================================
-- MIGRACE: Vytvoření tabulky pro zastupování uživatelů
-- ============================================================================
-- Datum: 26. března 2026
-- Popis: Umožňuje uživatelům nastavit zástupce během nepřítomnosti
--        (dovolená, služební cesta, nemoc)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25_uzivatele_zastupovani` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Kdo je zastupován (např. Fajka na dovolené)
    `zastupovany_id` INT UNSIGNED NOT NULL,
    
    -- Kdo zastupuje (např. Nováková)
    `zastupce_id` INT UNSIGNED NOT NULL,
    
    -- Období zastupování
    `dt_od` DATE NOT NULL COMMENT 'Začátek zastupování (včetně)',
    `dt_do` DATE NOT NULL COMMENT 'Konec zastupování (včetně)',
    
    -- Typ zastupování
    `typ_zastupovani` ENUM('full', 'orders_only', 'limited') NOT NULL DEFAULT 'orders_only'
        COMMENT 'full = všechna práva, orders_only = pouze schvalování objednávek, limited = omezené',
    
    -- Volitelný popis
    `popis` TEXT NULL COMMENT 'Důvod zastupování (např. "Dovolená - Řecko")',
    
    -- Aktivita (soft delete)
    `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = aktivní, 0 = deaktivováno',
    
    -- Audit trail
    `vytvoril_user_id` INT UNSIGNED NOT NULL COMMENT 'Kdo vytvořil záznam',
    `dt_vytvoreni` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `dt_aktualizace` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (`zastupovany_id`) REFERENCES `25_uzivatele`(`id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    FOREIGN KEY (`zastupce_id`) REFERENCES `25_uzivatele`(`id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    FOREIGN KEY (`vytvoril_user_id`) REFERENCES `25_uzivatele`(`id`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Indexy pro výkon
    INDEX `idx_zastupovany` (`zastupovany_id`, `aktivni`),
    INDEX `idx_zastupce` (`zastupce_id`, `aktivni`),
    INDEX `idx_datum` (`dt_od`, `dt_do`, `aktivni`),
    INDEX `idx_aktivni_datum` (`aktivni`, `dt_od`, `dt_do`),
    
    -- Validační constraint
    CONSTRAINT `chk_datum` CHECK (`dt_od` <= `dt_do`),
    CONSTRAINT `chk_duplicita` UNIQUE (`zastupovany_id`, `zastupce_id`, `dt_od`, `dt_do`, `aktivni`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Zastupování uživatelů během nepřítomnosti (dovolená, nemoc, služební cesta)';

-- ============================================================================
-- TESTOVACÍ DATA (volitelné - zakomentováno)
-- ============================================================================

/*
-- Příklad: Fajka (user_id=10) jede na dovolenou, zastupuje ji Nováková (user_id=15)
INSERT INTO `25_uzivatele_zastupovani` 
    (`zastupovany_id`, `zastupce_id`, `dt_od`, `dt_do`, `typ_zastupovani`, `popis`, `vytvoril_user_id`)
VALUES
    (10, 15, '2026-04-01', '2026-04-14', 'orders_only', 'Dovolená - Řecko', 10),
    (20, 15, '2026-05-10', '2026-05-15', 'full', 'Služební cesta - Praha', 20);
*/

-- ============================================================================
-- ROLLBACK SCRIPT (v případě potřeby)
-- ============================================================================

-- DROP TABLE IF EXISTS `25_uzivatele_zastupovani`;

-- ============================================================================
-- POZNÁMKY
-- ============================================================================

/*
POUŽITÍ:
1. Spustit migration: mysql -h 10.3.172.11 -u erdms_user -p EEO-OSTRA-DEV < 2026-03-26_create_zastupovani_table.sql
2. Ověřit: SHOW TABLES LIKE '25_uzivatele_zastupovani';
3. Otestovat: DESCRIBE 25_uzivatele_zastupovani;

INTEGRACE S BACKEND API:
- Konstanta TBL_UZIVATELE_ZASTUPOVANI je již definována v api.php
- SQL queries jsou připravené v queries.php
- Backend handlery jsou v hierarchyHandlers.php:
  * handle_substitution_list
  * handle_substitution_create
  * handle_substitution_update
  * handle_substitution_deactivate
  * handle_substitution_current

BEZPEČNOST:
- CHECK constraint zajišťuje dt_od <= dt_do
- UNIQUE constraint brání duplicitním záznamům
- CASCADE DELETE při smazání uživatele odstraní i zastupování
- RESTRICT DELETE na vytvoril_user_id brání smazání autora (audit trail)

VÝKON:
- Indexy na zastupovany_id, zastupce_id, datum pro rychlé vyhledávání
- Složený index na aktivni + datum pro queries typu "aktuální zastupování"
*/
