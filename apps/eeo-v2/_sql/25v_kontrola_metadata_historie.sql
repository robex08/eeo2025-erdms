-- Tabulka pro historii změn VEMA kontroly
-- Podobná jako 25a_fk_sledovani_udalosti pro FK sledování
-- Každá změna stavu, priority nebo komentář vytvoří nový záznam v historii

CREATE TABLE IF NOT EXISTS `25v_kontrola_metadata_historie` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kontrola_metadata_id` int(11) NOT NULL COMMENT 'FK na 25v_kontrola_metadata.id',
  `typ` enum('KOMENTAR','ZMENA_STAVU','ZMENA_PRIORITY','AUTO_SYSTEM') NOT NULL DEFAULT 'KOMENTAR' COMMENT 'Typ události',
  `text_zprava` text COMMENT 'Text komentáře nebo popis změny',
  `stav_pred` varchar(50) DEFAULT NULL COMMENT 'Hodnota před změnou (stav nebo priorita)',
  `stav_po` varchar(50) DEFAULT NULL COMMENT 'Hodnota po změně (stav nebo priorita)',
  `vytvoril_user_id` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele který provedl změnu',
  `dt_vytvoreni` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Časové razítko události',
  PRIMARY KEY (`id`),
  KEY `idx_kontrola_metadata_id` (`kontrola_metadata_id`),
  KEY `idx_vytvoril_user_id` (`vytvoril_user_id`),
  KEY `idx_typ` (`typ`),
  KEY `idx_dt_vytvoreni` (`dt_vytvoreni`),
  CONSTRAINT `fk_vema_kontrola_hist_metadata` FOREIGN KEY (`kontrola_metadata_id`) REFERENCES `25v_kontrola_metadata` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vema_kontrola_hist_user` FOREIGN KEY (`vytvoril_user_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Historie změn VEMA kontroly - události, změny stavů, komentáře';
