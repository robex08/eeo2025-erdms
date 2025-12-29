-- Migrace: Vytvoření tabulky pro čerpání LP na fakturách
-- Datum: 2025-12-29
-- Autor: AI Assistant
-- Popis: Tabulka pro sledování skutečného čerpání limitovaných příslibů na úrovni faktur
--        Umožňuje rozdělit částku faktury mezi více LP kódů

-- Drop table if exists (pro testovací účely)
-- DROP TABLE IF EXISTS 25a_faktury_lp_cerpani;

CREATE TABLE 25a_faktury_lp_cerpani (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Vazba na fakturu
    faktura_id INT NOT NULL,
    
    -- LP kód a ID (cislo je povinné, id může být NULL pokud LP ještě neexistuje v číselníku)
    lp_cislo VARCHAR(20) NOT NULL,
    lp_id INT NULL,
    
    -- Částka čerpaná z této faktury na tento LP kód
    castka DECIMAL(15,2) NOT NULL,
    
    -- Volitelná poznámka (např. "Plánováno: 60k, Skutečně: 55k")
    poznamka TEXT NULL,
    
    -- Audit trail - vazba na 25_uzivatele
    datum_pridani DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pridal_user_id INT UNSIGNED NULL,
    datum_upravy DATETIME NULL,
    upravil_user_id INT UNSIGNED NULL,
    
    -- Indexy pro rychlé vyhledávání
    INDEX idx_faktura_id (faktura_id),
    INDEX idx_lp_cislo (lp_cislo),
    INDEX idx_lp_id (lp_id),
    INDEX idx_pridal_user_id (pridal_user_id),
    INDEX idx_upravil_user_id (upravil_user_id),
    
    -- Foreign keys
    CONSTRAINT fk_faktury_lp_faktura 
        FOREIGN KEY (faktura_id) 
        REFERENCES 25a_objednavky_faktury(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_faktury_lp_lp_id 
        FOREIGN KEY (lp_id) 
        REFERENCES 25_limitovane_prisliby(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_faktury_lp_pridal 
        FOREIGN KEY (pridal_user_id) 
        REFERENCES 25_uzivatele(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_faktury_lp_upravil 
        FOREIGN KEY (upravil_user_id) 
        REFERENCES 25_uzivatele(id) 
        ON DELETE SET NULL,
    
    -- Kontrola: částka musí být kladná
    CONSTRAINT chk_castka_positive 
        CHECK (castka > 0)
        
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
COMMENT='Čerpání limitovaných příslibů na úrovni faktur - umožňuje rozdělit fakturu mezi více LP kódů';

-- Trigger pro automatickou aktualizaci datum_upravy
DELIMITER //
CREATE TRIGGER trg_faktury_lp_cerpani_update 
BEFORE UPDATE ON 25a_faktury_lp_cerpani
FOR EACH ROW
BEGIN
    SET NEW.datum_upravy = NOW();
END//
DELIMITER ;

-- Testovací SELECT pro ověření struktury
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    COLUMN_DEFAULT,
    EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'eeo2025-dev'
AND TABLE_NAME = '25a_faktury_lp_cerpani'
ORDER BY ORDINAL_POSITION;
