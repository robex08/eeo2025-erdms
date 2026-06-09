-- ============================================================================
-- Migrace: Vazební tabulka pro možnosti zastupování (M:N)
-- Datum: 2026-06-09
-- Účel: Definuje KDO může KOHO zastupovat (před vytvořením časového zastupování)
-- ============================================================================

-- 1️⃣ Vytvořit tabulku možností zastupování
CREATE TABLE IF NOT EXISTS 25_moznosti_zastupovani (
    id INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- KDO bude zastupován (vždy konkrétní uživatel)
    zastupovany_id INT(10) UNSIGNED NOT NULL COMMENT 'Uživatel který může být zastupován',
    
    -- KDO může zastupovat (4 možnosti)
    typ_zastupce ENUM('user', 'role', 'usek', 'lokalita') NOT NULL 
        COMMENT 'user=konkrétní uživatel, role=celá role, usek=celý úsek, lokalita=celá lokalita',
    
    -- Reference na zástupce (POUZE JEDNO pole bude vyplněné podle typu)
    zastupce_user_id INT(10) UNSIGNED NULL 
        COMMENT 'ID konkrétního uživatele (když typ=user)',
    zastupce_role_id INT(10) UNSIGNED NULL 
        COMMENT 'ID role (když typ=role)',
    zastupce_usek_id INT(11) NULL 
        COMMENT 'ID úseku (když typ=usek)',
    zastupce_lokalita_id INT(10) UNSIGNED NULL 
        COMMENT 'ID lokality (když typ=lokalita)',
    
    -- Metadata
    aktivni TINYINT(1) NOT NULL DEFAULT 1 
        COMMENT 'Soft delete - 0=neaktivní, 1=aktivní',
    poznamka VARCHAR(500) NULL 
        COMMENT 'Volitelná poznámka',
    vytvoril_user_id INT(10) UNSIGNED NOT NULL 
        COMMENT 'Kdo vytvořil tento záznam',
    dt_vytvoreni DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dt_aktualizace DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_moznosti_zastupovany 
        FOREIGN KEY (zastupovany_id) REFERENCES 25_uzivatele(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_moznosti_zastupce_user 
        FOREIGN KEY (zastupce_user_id) REFERENCES 25_uzivatele(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_moznosti_zastupce_role 
        FOREIGN KEY (zastupce_role_id) REFERENCES 25_role(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_moznosti_zastupce_usek 
        FOREIGN KEY (zastupce_usek_id) REFERENCES 25_useky(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_moznosti_zastupce_lokalita 
        FOREIGN KEY (zastupce_lokalita_id) REFERENCES 25_lokality(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_moznosti_vytvoril 
        FOREIGN KEY (vytvoril_user_id) REFERENCES 25_uzivatele(id),
    
    -- Indexy pro rychlé vyhledávání
    INDEX idx_zastupovany (zastupovany_id, aktivni),
    INDEX idx_typ (typ_zastupce),
    INDEX idx_aktivni (aktivni)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Vazební tabulka M:N - definuje kdo může koho zastupovat';

-- 2️⃣ Smazat testovací data ze stávající tabulky zastupování (DEV only)
DELETE FROM 25_uzivatele_zastupovani WHERE id IN (2, 3);

-- 3️⃣ Vložit příklady pro testování
-- Příklad 1: Admin (user_id=1) může být zastupován konkrétním uživatelem u03924
INSERT INTO 25_moznosti_zastupovani 
    (zastupovany_id, typ_zastupce, zastupce_user_id, poznamka, vytvoril_user_id) 
VALUES 
    (1, 'user', 100, 'Příklad: konkrétní uživatel', 1);

-- Příklad 2: User 102 (u09694) může být zastupován kýmkoliv z role SCHVALOVATEL
INSERT INTO 25_moznosti_zastupovani 
    (zastupovany_id, typ_zastupce, zastupce_role_id, poznamka, vytvoril_user_id) 
VALUES 
    (102, 'role', 
     (SELECT id FROM 25_role WHERE kod_role = 'SCHVALOVATEL' LIMIT 1), 
     'Příklad: celá role', 1);

-- Příklad 3: User 102 může být zastupován kýmkoliv z úseku MB
INSERT INTO 25_moznosti_zastupovani 
    (zastupovany_id, typ_zastupce, zastupce_usek_id, poznamka, vytvoril_user_id) 
VALUES 
    (102, 'usek', 
     (SELECT id FROM 25_useky WHERE usek_zkr = 'MB' LIMIT 1), 
     'Příklad: celý úsek', 1);

-- ✅ Hotovo - ověř strukturu
SELECT 'Migration completed successfully' as status;
DESCRIBE 25_moznosti_zastupovani;
