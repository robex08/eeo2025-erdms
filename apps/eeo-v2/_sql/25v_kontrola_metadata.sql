-- =====================================================
-- VEMA Kontrola & Metadata - Evidence kontrolních záznamů
-- =====================================================
-- Tabulka pro ukládání kontrolních záznamů a metadat
-- k importovaným VEMA datům (faktury, firmy, smlouvy)
-- 
-- Provázání přes VEMA ID (ne naše auto_increment ID!)
-- aby metadata zůstala správná i po reimporu
-- =====================================================

CREATE TABLE IF NOT EXISTS `25v_kontrola_metadata` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  
  -- Identifikace záznamu
  `typ_zaznamu` enum('faktura','firma','smlouva') NOT NULL COMMENT 'Typ VEMA záznamu',
  `vema_id` varchar(50) NOT NULL COMMENT 'ID z VEMA (firma/cfak/csml) - NIKDY naše auto_increment!',
  `vema_id_secondary` varchar(50) DEFAULT NULL COMMENT 'Sekundární VEMA ID (např. firma pro fakturu)',
  
  -- Status kontroly
  `kontrola_status` enum('nezkontrolovano','v_kontrole','zkontrolovano','ma_problem','pozastaveno') NOT NULL DEFAULT 'nezkontrolovano',
  `priorita` tinyint(1) DEFAULT 0 COMMENT '0=normální, 1=vysoká, 2=kritická',
  
  -- Kontrolní informace
  `poznamka` text DEFAULT NULL COMMENT 'Poznámka ke kontrole',
  `kontroloval_uzivatel_id` int(11) DEFAULT NULL COMMENT 'Kdo provedl kontrolu',
  `dt_kontroly` datetime DEFAULT NULL COMMENT 'Datum poslední kontroly',
  
  -- Rozšiřitelná metadata (JSON)
  `metadata_json` longtext DEFAULT NULL COMMENT 'Další metadata ve formátu JSON pro budoucí rozšíření',
  
  -- Systémové údaje
  `vytvoril_uzivatel_id` int(11) NOT NULL COMMENT 'Kdo vytvořil záznam',
  `dt_vytvoreni` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `upravil_uzivatel_id` int(11) DEFAULT NULL,
  `dt_upravy` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_typ_vema` (`typ_zaznamu`, `vema_id`),
  KEY `idx_typ_zaznamu` (`typ_zaznamu`),
  KEY `idx_vema_id` (`vema_id`),
  KEY `idx_kontrola_status` (`kontrola_status`),
  KEY `idx_kontroloval` (`kontroloval_uzivatel_id`),
  KEY `idx_dt_kontroly` (`dt_kontroly`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Evidence kontrolních záznamů a metadat k VEMA importům';

-- =====================================================
-- Příklady použití metadata_json:
-- =====================================================
-- {
--   "financni_kontrola": {
--     "castka_nesouhlasi": true,
--     "chybi_prilohy": false,
--     "duplicita_s": "12345"
--   },
--   "pravni_kontrola": {
--     "status": "ok",
--     "datum": "2026-06-22"
--   },
--   "vlastni_pole": "libovolná hodnota"
-- }
