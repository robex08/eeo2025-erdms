-- ============================================================================
-- MIGRACE: Přílohy k ročním poplatkům (Annual Fees Attachments)
-- ============================================================================
-- Datum: 31. ledna 2026
-- Autor: System
-- Verze: 1.0
-- 
-- Popis:
-- Přidává podporu pro přílohy k ročním poplatkům.
-- - Tabulka pro přílohy s prefixem 'rp' (roční poplatek)
-- - Ukládání do /data/eeo-v2/prilohy/rp/
-- - Vazba na 25a_rocni_poplatky
--
-- ============================================================================

-- 1. VYTVOŘENÍ TABULKY PRO PŘÍLOHY ROČNÍCH POPLATKŮ
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_rocni_poplatky_prilohy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  
  -- Vazba na roční poplatek
  `rocni_poplatek_id` int(11) NOT NULL COMMENT 'FK na 25a_rocni_poplatky',
  
  -- Metadata souboru
  `original_name` varchar(255) NOT NULL COMMENT 'Původní název souboru',
  `stored_name` varchar(255) NOT NULL COMMENT 'Uložený název na disku (prefix: rp_)',
  `file_path` varchar(512) NOT NULL COMMENT 'Relativní cesta k souboru',
  `file_size` int(11) NOT NULL COMMENT 'Velikost souboru v bajtech',
  `mime_type` varchar(100) DEFAULT NULL COMMENT 'MIME type souboru',
  `file_extension` varchar(10) DEFAULT NULL COMMENT 'Přípona souboru',
  
  -- Typ přílohy (možnost rozšíření v budoucnu)
  `typ_prilohy` varchar(50) DEFAULT 'PRILOHA' COMMENT 'Typ přílohy (PRILOHA, FAKTURA, atd.)',
  
  -- Audit trail
  `nahral_user_id` int(11) DEFAULT NULL COMMENT 'Kdo soubor nahrál',
  `dt_nahrano` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Kdy byl soubor nahrán',
  
  -- Poznámka k příloze
  `poznamka` text DEFAULT NULL COMMENT 'Volitelná poznámka k příloze',
  
  PRIMARY KEY (`id`),
  KEY `idx_rocni_poplatek` (`rocni_poplatek_id`),
  KEY `idx_nahral_user` (`nahral_user_id`),
  KEY `idx_dt_nahrano` (`dt_nahrano`),
  
  -- Cizí klíč na roční poplatek
  CONSTRAINT `fk_rp_prilohy_rocni_poplatek`
    FOREIGN KEY (`rocni_poplatek_id`)
    REFERENCES `25a_rocni_poplatky` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  
  -- Cizí klíč na uživatele (soft constraint)
  CONSTRAINT `fk_rp_prilohy_user`
    FOREIGN KEY (`nahral_user_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Přílohy k ročním poplatkům';

-- ============================================================================
-- 2. VYTVOŘENÍ ADRESÁŘE PRO PŘÍLOHY
-- ============================================================================

-- Adresář se vytvoří pomocí PHP při prvním uploadu
-- Path: /var/www/erdms-dev/data/eeo-v2/prilohy/rp/
-- Production: /var/www/erdms-platform/data/eeo-v2/prilohy/rp/

-- ============================================================================
-- 3. KONTROLA MIGRACE
-- ============================================================================

SELECT 
    'Migrace dokončena!' as Status,
    COUNT(*) as PocetSloupcu
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = '25a_rocni_poplatky_prilohy'
AND TABLE_SCHEMA = DATABASE();

SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CONCAT(ROUND(DATA_LENGTH / 1024 / 1024, 2), ' MB') as Size,
    TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = '25a_rocni_poplatky_prilohy'
AND TABLE_SCHEMA = DATABASE();

-- ============================================================================
-- 4. TESTOVACÍ DATA (VOLITELNÉ)
-- ============================================================================

-- Ukázka vložení testovací přílohy (pro development):
-- INSERT INTO `25a_rocni_poplatky_prilohy` 
-- (`rocni_poplatek_id`, `original_name`, `stored_name`, `file_path`, `file_size`, `mime_type`, `file_extension`, `typ_prilohy`, `nahral_user_id`)
-- VALUES
-- (1, 'smlouva_priloha.pdf', 'rp_20260131_123456_abc123.pdf', 'rp/rp_20260131_123456_abc123.pdf', 245678, 'application/pdf', 'pdf', 'PRILOHA', 1);

-- ============================================================================
-- KONEC MIGRACE
-- ============================================================================
