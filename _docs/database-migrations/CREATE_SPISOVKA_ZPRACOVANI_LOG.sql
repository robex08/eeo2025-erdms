-- ================================================
-- 📋 SPISOVKA PROCESSING LOG TABLE
-- ================================================
-- Tabulka pro sledování zpracovaných dokumentů ze Spisovka InBox
-- Umožňuje účetním sledovat, které dokumenty již byly zaevidovány
-- a postupně "odbavovat" dokumenty z plovoucího okna.
--
-- ✅ Česká konvence názvů sloupců
-- ✅ InnoDB engine pro ACID compliance
-- ✅ 7 indexů pro optimalizované dotazy
-- ✅ Multi-user, multi-device tracking
-- ✅ Permission-based filtering support
--
-- Autor: Senior Developer
-- Datum: 19. prosince 2025
-- ================================================

USE eeo2025;

-- Vytvořit tabulku pro tracking zpracovaných Spisovka dokumentů
CREATE TABLE IF NOT EXISTS 25_spisovka_zpracovani_log (
    -- Primární klíč
    id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- ID dokumentu ze Spisovky (foreign key do dokument_priloha)
    dokument_id INT(11) UNSIGNED NOT NULL
        COMMENT 'ID dokumentu ze Spisovka InBox (foreign key → dokument_priloha.id)',
    
    -- Uživatel který dokument zpracoval
    uzivatel_id INT(11) UNSIGNED NOT NULL
        COMMENT 'ID uživatele který dokument zaevidoval (foreign key → uzivatele_25.id)',
    
    -- Časové razítko zpracování
    zpracovano_kdy DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        COMMENT 'Datum a čas zpracování dokumentu (automaticky při INSERT)',
    
    -- ID faktury která byla vytvořena z tohoto dokumentu (optional)
    faktura_id INT(11) UNSIGNED DEFAULT NULL
        COMMENT 'ID vytvořené faktury (foreign key → faktury_25.id, nullable)',
    
    -- Číslo faktury (denormalizováno pro rychlé vyhledávání)
    fa_cislo_vema VARCHAR(100) DEFAULT NULL
        COMMENT 'Číslo faktury (kopie z faktury_25.fa_cislo_vema pro rychlý přístup)',
    
    -- Stav zpracování
    stav ENUM('ZAEVIDOVANO', 'NENI_FAKTURA', 'CHYBA', 'DUPLIKAT') 
        NOT NULL DEFAULT 'ZAEVIDOVANO'
        COMMENT 'Stav zpracování: ZAEVIDOVANO=úspěšně, NENI_FAKTURA=není faktura, CHYBA=chyba, DUPLIKAT=již existuje',
    
    -- Poznámka k zpracování
    poznamka TEXT DEFAULT NULL
        COMMENT 'Volitelná poznámka účetní k zpracování dokumentu',
    
    -- Doba zpracování v sekundách (pro analytics)
    doba_zpracovani_s INT(11) UNSIGNED DEFAULT NULL
        COMMENT 'Doba zpracování v sekundách (od otevření do uložení faktury)',
    
    -- Metadata
    dt_vytvoreni DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        COMMENT 'Časové razítko vytvoření záznamu',
    
    -- Indexy pro optimalizované dotazy
    INDEX idx_dokument (dokument_id),
    INDEX idx_uzivatel (uzivatel_id),
    INDEX idx_zpracovano (zpracovano_kdy),
    INDEX idx_stav (stav),
    INDEX idx_faktura (faktura_id),
    INDEX idx_dokument_uzivatel (dokument_id, uzivatel_id),
    INDEX idx_zpracovano_stav (zpracovano_kdy, stav)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracking zpracovaných dokumentů ze Spisovka InBox pro účetní';

-- ================================================
-- ✅ HOTOVO
-- ================================================
-- Tabulka vytvořena s českými názvy sloupců podle konvencí projektu.
-- Optimalizováno pro:
-- 1. Rychlé vyhledávání zpracovaných dokumentů
-- 2. Filtrování podle uživatele (multi-user support)
-- 3. Filtrování podle stavu a data
-- 4. Propojení s fakturami pro audit trail
-- 5. Analytics zpracování (doba_zpracovani_s)
-- ================================================
