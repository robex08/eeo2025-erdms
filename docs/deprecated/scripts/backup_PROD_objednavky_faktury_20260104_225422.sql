/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.3-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 10.3.172.11    Database: eeo2025
-- ------------------------------------------------------
-- Server version	11.8.3-MariaDB-0+deb13u1 from Debian

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `25a_objednavky`
--

DROP TABLE IF EXISTS `25a_objednavky`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_objednavky` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `cislo_objednavky` varchar(50) DEFAULT NULL,
  `dt_objednavky` datetime DEFAULT NULL,
  `predmet` varchar(255) NOT NULL,
  `strediska_kod` text NOT NULL,
  `max_cena_s_dph` decimal(15,2) DEFAULT NULL,
  `financovani` text DEFAULT NULL,
  `druh_objednavky_kod` varchar(255) DEFAULT NULL,
  `stav_workflow_kod` varchar(256) NOT NULL,
  `mimoradna_udalost` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Označení objednávky jako mimořádné (krize, havárie) - 1=ano, 0=ne',
  `stav_objednavky` varchar(64) NOT NULL,
  `uzivatel_id` int(10) unsigned NOT NULL,
  `uzivatel_akt_id` int(10) unsigned DEFAULT NULL,
  `garant_uzivatel_id` int(10) unsigned DEFAULT NULL,
  `objednatel_id` int(10) unsigned DEFAULT NULL,
  `schvalovatel_id` int(11) DEFAULT NULL,
  `dt_schvaleni` datetime DEFAULT NULL,
  `schvaleni_komentar` varchar(255) DEFAULT NULL,
  `prikazce_id` int(11) DEFAULT NULL,
  `dodavatel_id` int(10) DEFAULT NULL,
  `dodavatel_nazev` varchar(255) DEFAULT NULL,
  `dodavatel_adresa` varchar(255) DEFAULT NULL,
  `dodavatel_ico` varchar(20) DEFAULT NULL,
  `dodavatel_dic` varchar(20) DEFAULT NULL,
  `dodavatel_zastoupeny` varchar(255) DEFAULT NULL,
  `dodavatel_kontakt_jmeno` varchar(255) DEFAULT NULL,
  `dodavatel_kontakt_email` varchar(255) DEFAULT NULL,
  `dodavatel_kontakt_telefon` varchar(50) DEFAULT NULL,
  `dt_predpokladany_termin_dodani` date DEFAULT NULL,
  `misto_dodani` varchar(255) DEFAULT NULL,
  `zaruka` varchar(100) DEFAULT NULL,
  `dt_odeslani` datetime DEFAULT NULL COMMENT 'Datum odeslání objednávky dodavateli',
  `odesilatel_id` int(10) unsigned DEFAULT NULL COMMENT 'Kdo odeslal objednávku dodavateli nebo stornoval',
  `odeslani_storno_duvod` text DEFAULT NULL COMMENT 'Důvod odeslání nebo storna',
  `dodavatel_zpusob_potvrzeni` varchar(128) DEFAULT NULL COMMENT 'Způsob potvrzení objednávky dodavatelem',
  `dt_akceptace` datetime DEFAULT NULL COMMENT 'Datum akceptace objednávky dodavatelem',
  `dodavatel_potvrdil_id` int(10) unsigned DEFAULT NULL COMMENT 'Kdo potvrdil že dodavatel akceptoval objednávku',
  `zverejnit` tinytext DEFAULT NULL,
  `zverejnil_id` int(10) unsigned DEFAULT NULL COMMENT 'Kdo zveřejnil objednávku',
  `dt_zverejneni` datetime DEFAULT NULL COMMENT 'Kdy bylo potvrzeno zveřejnění',
  `registr_iddt` varchar(100) DEFAULT NULL,
  `poznamka` text DEFAULT NULL,
  `fakturant_id` int(10) unsigned DEFAULT NULL COMMENT 'Kdo přidal fakturu k objednávce',
  `dt_faktura_pridana` datetime DEFAULT NULL COMMENT 'Kdy byla faktura přidána do systému',
  `dokoncil_id` int(10) unsigned DEFAULT NULL COMMENT 'Kdo zkontroloval a dokončil objednávku',
  `dt_dokonceni` datetime DEFAULT NULL COMMENT 'Kdy byla objednávka dokončena',
  `dokonceni_poznamka` text DEFAULT NULL COMMENT 'Poznámka ke kontrole a dokončení',
  `potvrzeni_dokonceni_objednavky` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Boolean: Potvrzení dokončení objednávky (0=NE, 1=ANO)',
  `potvrdil_vecnou_spravnost_id` int(10) unsigned DEFAULT NULL COMMENT 'Kdo potvrdil věcnou správnost',
  `dt_potvrzeni_vecne_spravnosti` datetime DEFAULT NULL COMMENT 'Kdy byla potvrzena věcná správnost',
  `vecna_spravnost_umisteni_majetku` text DEFAULT NULL COMMENT 'Umístění majetku (věcná správnost)',
  `vecna_spravnost_poznamka` text DEFAULT NULL COMMENT 'Poznámka k věcné správnosti',
  `potvrzeni_vecne_spravnosti` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Boolean: Potvrzení věcné správnosti (0=NE, 1=ANO)',
  `dt_vytvoreni` datetime NOT NULL,
  `dt_aktualizace` datetime DEFAULT NULL,
  `dt_zamek` datetime DEFAULT NULL COMMENT 'Datum zamčení záznamu',
  `zamek_uzivatel_id` int(11) DEFAULT NULL,
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `uzivatel_id` (`uzivatel_id`),
  KEY `uzivatel_akt_id` (`uzivatel_akt_id`),
  KEY `garant_uzivatel_id` (`garant_uzivatel_id`),
  KEY `objednatel_id` (`objednatel_id`),
  KEY `schvalovatel_id` (`schvalovatel_id`),
  KEY `prikazce_id` (`prikazce_id`),
  KEY `idx_odesilatel` (`odesilatel_id`),
  KEY `idx_potvrdil` (`dodavatel_potvrdil_id`),
  KEY `idx_fakturant` (`fakturant_id`),
  KEY `idx_dt_faktura_pridana` (`dt_faktura_pridana`),
  KEY `idx_dokoncil` (`dokoncil_id`),
  KEY `idx_dt_dokonceni` (`dt_dokonceni`),
  KEY `fk_zverejnil` (`zverejnil_id`),
  KEY `fk_potvrdil_vecnou_spravnost` (`potvrdil_vecnou_spravnost_id`),
  CONSTRAINT `25a_objednavky_ibfk_1` FOREIGN KEY (`uzivatel_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `25a_objednavky_ibfk_2` FOREIGN KEY (`uzivatel_akt_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `25a_objednavky_ibfk_3` FOREIGN KEY (`garant_uzivatel_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `25a_objednavky_ibfk_4` FOREIGN KEY (`objednatel_id`) REFERENCES `25_uzivatele` (`id`),
  CONSTRAINT `fk_dodavatel_potvrdil` FOREIGN KEY (`dodavatel_potvrdil_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_dokoncil` FOREIGN KEY (`dokoncil_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_fakturant` FOREIGN KEY (`fakturant_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_odesilatel` FOREIGN KEY (`odesilatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_potvrdil_vecnou_spravnost` FOREIGN KEY (`potvrdil_vecnou_spravnost_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_zverejnil` FOREIGN KEY (`zverejnil_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `25a_objednavky`
--

LOCK TABLES `25a_objednavky` WRITE;
/*!40000 ALTER TABLE `25a_objednavky` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `25a_objednavky` VALUES
(1,'O-0000/75030926/2000/PTN','2000-10-18 23:31:03','SENESI - Mapei MAPESIL AC 150 ŽLUTÁ 310 ml Silikonová těsnicí hmota 4815042IT 1ks','[{\"kod_stavu\":\"KLADNO\",\"nazev_stavu\":\"Kladno\"}]',400.00,'{\"kod_stavu\":\"LP\",\"nazev_stavu\":\"Limitovaný příslib\",\"doplnujici_data\":{\"lp_kod\":[\"26\"]}}','{\"kod_stavu\":\"DODAVKA_ZBOZI\",\"nazev_stavu\":\"Dodávka zboží\"}','[\"SCHVALENA\",\"ROZPRACOVANA\"]',0,'Rozpracovaná',106,1,106,106,106,'2000-10-18 23:31:03','',104,NULL,'SENESI, SE','Budějovická 1228, Vodňany II, 38901 Vodňany','24850985','CZ24850985',NULL,NULL,NULL,NULL,'2000-10-18','Kladno',NULL,'2000-10-18 00:00:00',NULL,'','{\"zpusob\":[\"email\",\"eshop\"],\"platba\":\"pokladna\"}','2000-10-18 23:31:03',NULL,'0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,0,'2000-10-18 23:31:03','2000-10-18 23:31:03','0000-00-00 00:00:00',1,1),
(2,'O-0001/75030926/2025/EN','2025-12-31 10:58:09','Test - objednávka','[\"901_VEDENI_ZZS_SK\"]',85000.00,'{\"typ\":\"SMLOUVA\",\"cislo_smlouvy\":\"S-134\\/75030926\\/2025\"}','{\"kod_stavu\":\"SLUZBY\",\"nazev_stavu\":\"Služby\"}','[\"SCHVALENA\",\"ODESLANA\",\"POTVRZENA\",\"UVEREJNENA\",\"FAKTURACE\",\"VECNA_SPRAVNOST\",\"ZKONTROLOVANA\"]',0,'Zkontrolovaná',102,NULL,105,102,102,'2025-12-30 08:53:46','',102,NULL,'ALFIN servis, s.r.o.','Marš. Žukova 1865/17, 43401 Most','18383084','CZ18383084',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-30 08:05:57',102,'','{\"potvrzeni\":\"ANO\",\"zpusoby\":[\"telefon\"],\"platba\":\"faktura\",\"potvrzeno\":true}','2025-12-30 09:58:01',102,NULL,102,'2025-12-30 08:33:00','123',NULL,102,'2025-12-31 10:58:09',NULL,NULL,'',0,NULL,NULL,'','',0,'2025-12-30 08:46:13','2025-12-31 10:58:08',NULL,0,1),
(3,'O-0002/75030926/2025/EN','2025-12-30 13:16:08','Test 2','[\"901_VEDENI_ZZS_SK\"]',10000.00,'{\"typ\":\"LP\",\"lp_kody\":[40]}','{\"kod_stavu\":\"OSTATNI\",\"nazev_stavu\":\"Ostatní\"}','[\"SCHVALENA\",\"ODESLANA\",\"POTVRZENA\",\"NEUVEREJNIT\",\"FAKTURACE\",\"VECNA_SPRAVNOST\",\"ZKONTROLOVANA\",\"DOKONCENA\"]',0,'Dokončená',102,NULL,105,102,102,'2025-12-30 11:39:38','',102,NULL,'Alza.cz a.s.','Jankovcova 1522/53, Holešovice, 17000 Praha 7','27082440','CZ27082440',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-30 11:03:03',102,'','{\"potvrzeni\":\"ANO\",\"zpusoby\":[\"eshop\"],\"platba\":\"faktura\",\"potvrzeno\":true}','2025-12-30 12:15:18',102,NULL,NULL,NULL,NULL,NULL,102,'2025-12-30 13:16:08',102,'2025-12-30 13:16:04','',1,NULL,NULL,'','',0,'2025-12-30 11:37:40','2025-12-30 13:16:06',NULL,0,1),
(4,'O-0003/75030926/2025/EN','2025-12-30 14:15:54','test3','[\"901_VEDENI_ZZS_SK\"]',5000.00,'{\"typ\":\"INDIVIDUALNI_SCHVALENI\",\"individualni_schvaleni\":\"I-0003\\/75030926\\/2025\\/EN\"}','{\"kod_stavu\":\"LICENCE\",\"nazev_stavu\":\"Licence\"}','[\"SCHVALENA\",\"ODESLANA\"]',0,'Odeslaná dodavateli',102,NULL,105,102,102,'2025-12-30 14:13:12','',102,NULL,'ANAG, spol. s r. o.','Kollárovo nám. 698/7, 77900 Olomouc','25354671','CZ25354671',NULL,NULL,NULL,NULL,'2026-01-06',NULL,NULL,'2025-12-30 13:15:47',102,'',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'','',0,'2025-12-30 14:11:39','2025-12-30 14:15:52',NULL,0,1),
(5,'O-0004/75030926/2025/EN','2025-12-30 14:17:53','test 4 LP','[\"901_VEDENI_ZZS_SK\"]',8000.00,'{\"typ\":\"LP\",\"lp_kody\":[41]}',NULL,'[\"SCHVALENA\"]',0,'Schválená',102,NULL,105,102,102,'2025-12-30 14:16:54','',102,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'','',0,'2025-12-30 14:16:48','2025-12-30 14:17:51','2025-12-31 00:34:19',1,1),
(6,'O-0005/75030926/2025/EN','2025-12-30 14:22:28','test LP','[\"901_VEDENI_ZZS_SK\"]',5000.00,'{\"typ\":\"LP\",\"lp_kody\":[42]}','{\"kod_stavu\":\"CISTICÍ_PROSTREDKY\",\"nazev_stavu\":\"Čistící prostředky\"}','[\"SCHVALENA\",\"ODESLANA\",\"POTVRZENA\",\"NEUVEREJNIT\",\"FAKTURACE\",\"VECNA_SPRAVNOST\",\"ZKONTROLOVANA\",\"DOKONCENA\"]',0,'Dokončená',102,NULL,105,102,102,'2025-12-30 14:21:08','',102,NULL,'ANAG, spol. s r. o.','Kollárovo nám. 698/7, 77900 Olomouc','25354671','CZ25354671',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-30 13:21:30',102,'','{\"potvrzeni\":\"ANO\",\"zpusoby\":[\"eshop\"],\"platba\":\"faktura\",\"potvrzeno\":true}','2025-12-30 13:21:35',102,NULL,NULL,NULL,NULL,NULL,102,'2025-12-30 14:22:28',102,'2025-12-30 14:22:25',NULL,1,NULL,NULL,'','',0,'2025-12-30 14:21:05','2025-12-30 14:22:26',NULL,0,1),
(7,'O-0006/75030926/2025/EN','2025-12-31 10:57:39','test konzultace 2','[\"101_RLP_KLADNO\"]',5000.00,'{\"typ\":\"SMLOUVA\",\"cislo_smlouvy\":\"S-147\\/750309\\/26\\/23\"}',NULL,'[\"ZAMITNUTA\"]',0,'Zamítnutá',102,NULL,105,102,102,'2025-12-31 10:57:33','test',102,NULL,'Alter Audit, s.r.o.','třída Kpt. Jaroše 1844/28, Černá Pole, 60200 Brno','29268931','CZ29268931',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',0,NULL,NULL,'','',0,'2025-12-30 21:43:52','2025-12-31 10:57:38',NULL,0,1),
(8,'O-0007/75030926/2025/EN','2025-12-31 09:11:22','test  7','[\"901_VEDENI_ZZS_SK\"]',1000.00,'{\"typ\":\"SMLOUVA\",\"cislo_smlouvy\":\"S-353\\/75030926\\/2024\"}',NULL,'[\"ODESLANA_KE_SCHVALENI\"]',0,'Ke schválení',102,NULL,105,102,NULL,NULL,NULL,102,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,0,'2025-12-31 09:11:22',NULL,NULL,0,1),
(9,'O-0001/75030926/2026/EN','2026-01-02 12:03:00','Test LP','[\"901_VEDENI_ZZS_SK\"]',100000.00,'{\"typ\":\"LP\",\"lp_kody\":[144]}',NULL,'[\"SCHVALENA\"]',0,'Schválená',102,NULL,105,102,102,'2026-01-02 12:02:55','',102,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'','',0,'2026-01-02 12:02:47','2026-01-02 12:02:55','2026-01-02 14:27:49',102,1),
(10,'O-0002/75030926/2026/EN','2026-01-04 22:26:29','Test Odtah','[\"700_SPRAVA_DILNY\"]',10000.00,'{\"typ\":\"LP\",\"lp_kody\":[133]}','{\"kod_stavu\":\"AUTA\",\"nazev_stavu\":\"Auta\"}','[\"SCHVALENA\",\"ODESLANA\",\"POTVRZENA\",\"NEUVEREJNIT\",\"FAKTURACE\",\"VECNA_SPRAVNOST\"]',0,'Věcná správnost',102,102,105,102,102,'2026-01-02 22:47:36','',51,NULL,'AUTO PRAŽÁK Assistance s.r.o.','Jeníkov 10, 25765 Čechtice','28489969','CZ28489969',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-02 21:49:32',102,'','{\"potvrzeni\":\"ANO\",\"zpusoby\":[\"telefon\"],\"platba\":\"faktura\",\"potvrzeno\":true}','2026-01-02 21:26:28',102,NULL,NULL,NULL,NULL,NULL,102,'2026-01-04 22:26:29',NULL,NULL,'',0,NULL,NULL,'','',0,'2026-01-02 22:47:32','2026-01-04 22:26:28',NULL,0,1),
(11,'O-0003/75030926/2026/EN','2026-01-02 22:56:08','Odtah Test indiv','[\"700_SPRAVA_DILNY\"]',10000.00,'{\"typ\":\"INDIVIDUALNI_SCHVALENI\",\"individualni_schvaleni\":\"I-0003\\/75030926\\/2026\\/EN\"}','{\"kod_stavu\":\"AUTA\",\"nazev_stavu\":\"Auta\"}','[\"SCHVALENA\",\"ODESLANA\",\"POTVRZENA\",\"NEUVEREJNIT\",\"FAKTURACE\"]',0,'Fakturace',102,NULL,105,102,102,'2026-01-02 22:55:44','',47,NULL,'AUTO PRAŽÁK Assistance s.r.o.','Jeníkov 10, 25765 Čechtice','28489969','CZ28489969',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-02 21:56:03',102,'','{\"potvrzeni\":\"ANO\",\"zpusoby\":[\"telefon\"],\"platba\":\"faktura\",\"potvrzeno\":true}','2026-01-02 21:56:08',102,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'','',0,'2026-01-02 22:55:41','2026-01-02 22:56:09',NULL,0,1);
/*!40000 ALTER TABLE `25a_objednavky` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `25a_objednavky_polozky`
--

DROP TABLE IF EXISTS `25a_objednavky_polozky`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_objednavky_polozky` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lp_id` int(11) DEFAULT NULL COMMENT 'ID LP z limitovane_prisliby_master',
  `objednavka_id` int(10) unsigned NOT NULL,
  `popis` text NOT NULL,
  `cena_bez_dph` decimal(15,2) DEFAULT NULL,
  `sazba_dph` int(11) DEFAULT NULL,
  `cena_s_dph` decimal(15,2) DEFAULT NULL,
  `dt_vytvoreni` timestamp NOT NULL DEFAULT current_timestamp(),
  `dt_aktualizace` timestamp NULL DEFAULT NULL,
  `usek_kod` varchar(20) DEFAULT NULL COMMENT 'Kód úseku pro lokalizaci',
  `budova_kod` varchar(20) DEFAULT NULL COMMENT 'Kód budovy pro lokalizaci',
  `mistnost_kod` varchar(20) DEFAULT NULL COMMENT 'Kód místnosti pro lokalizaci',
  `poznamka` text DEFAULT NULL COMMENT 'JSON poznámka uživatele s volnými daty',
  PRIMARY KEY (`id`),
  KEY `objednavka_id` (`objednavka_id`),
  KEY `idx_polozky_lokalizace` (`usek_kod`,`budova_kod`,`mistnost_kod`),
  KEY `idx_lp_id` (`lp_id`),
  CONSTRAINT `25a_objednavky_polozky_ibfk_1` FOREIGN KEY (`objednavka_id`) REFERENCES `25a_objednavky` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `25a_objednavky_polozky`
--

LOCK TABLES `25a_objednavky_polozky` WRITE;
/*!40000 ALTER TABLE `25a_objednavky_polozky` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `25a_objednavky_polozky` VALUES
(11,40,3,'Test',8264.46,21,10000.00,'2025-12-30 12:16:06','2025-12-30 12:16:06',NULL,NULL,NULL,NULL),
(13,NULL,4,'test',4132.23,21,5000.00,'2025-12-30 13:15:52','2025-12-30 13:15:52',NULL,NULL,NULL,NULL),
(18,42,6,'test',4132.23,21,5000.00,'2025-12-30 13:22:26','2025-12-30 13:22:26',NULL,NULL,NULL,NULL),
(20,NULL,2,'Analýza',70247.93,21,85000.00,'2025-12-31 09:58:08','2025-12-31 09:58:08',NULL,NULL,NULL,NULL),
(26,NULL,11,'auta',8264.46,21,10000.00,'2026-01-02 21:56:09','2026-01-02 21:56:09',NULL,NULL,NULL,NULL),
(27,71,10,'auta',8264.46,21,10000.00,'2026-01-04 21:26:28','2026-01-04 21:26:28',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `25a_objednavky_polozky` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `25a_objednavky_faktury`
--

DROP TABLE IF EXISTS `25a_objednavky_faktury`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_objednavky_faktury` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `objednavka_id` int(10) DEFAULT NULL COMMENT 'Vazba na objednávku (pro rychlé dotazy) - nepovinné',
  `smlouva_id` int(10) unsigned DEFAULT NULL COMMENT 'ID smlouvy (FK na 25_smlouvy)',
  `fa_dorucena` tinyint(1) DEFAULT 0 COMMENT 'Zda byla faktura doručena (0=NE, 1=ANO)',
  `fa_zaplacena` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Zda byla faktura zaplacena (0=NE, 1=ANO)',
  `stav` enum('ZAEVIDOVANA','VECNA_SPRAVNOST','V_RESENI','PREDANA_PO','K_ZAPLACENI','ZAPLACENO','STORNO') NOT NULL DEFAULT 'ZAEVIDOVANA' COMMENT 'Workflow stav faktury - primárně pro účetní',
  `fa_datum_zaplaceni` datetime DEFAULT NULL COMMENT 'Datum a čas zaplacení faktury (systémově)',
  `fa_datum_vystaveni` date DEFAULT NULL COMMENT 'Datum vystavení faktury',
  `fa_datum_splatnosti` date DEFAULT NULL COMMENT 'Datum splatnosti faktury',
  `fa_datum_doruceni` date DEFAULT NULL COMMENT 'Datum doručení faktury',
  `fa_castka` decimal(15,2) NOT NULL COMMENT 'Částka faktury - povinné',
  `fa_cislo_vema` varchar(100) NOT NULL COMMENT 'Číslo Fa/VPD z VEMA - povinné',
  `fa_typ` varchar(32) DEFAULT 'BEZNA' COMMENT 'Typ faktury - kod_stavu (BEZNA, ZALOHOVA, VYUCTOVACI, DOBROPIS)',
  `potvrdil_vecnou_spravnost_id` int(11) DEFAULT NULL COMMENT 'ID uživatele, který potvrdil věcnou správnost faktury',
  `dt_potvrzeni_vecne_spravnosti` datetime DEFAULT NULL COMMENT 'Datum a čas potvrzení věcné správnosti faktury',
  `vecna_spravnost_umisteni_majetku` mediumtext DEFAULT NULL COMMENT 'Popis umístění majetku (volitelné)',
  `vecna_spravnost_poznamka` mediumtext DEFAULT NULL COMMENT 'Poznámka k věcné správnosti faktury (volitelné)',
  `vecna_spravnost_potvrzeno` tinyint(1) DEFAULT 0 COMMENT 'Boolean: Potvrzení věcné správnosti (0=NE, 1=ANO)',
  `fa_strediska_kod` mediumtext DEFAULT NULL COMMENT 'Středisko pro fakturu - editovatelné',
  `fa_poznamka` mediumtext DEFAULT NULL COMMENT 'Poznámka/vzkaz k faktuře - nepovinné',
  `rozsirujici_data` mediumtext DEFAULT NULL COMMENT 'JSON struktura pro budoucí rozšíření funkcionality',
  `fa_predana_zam_id` int(10) unsigned DEFAULT NULL COMMENT 'ID zaměstnance (25_uzivatele), komu byla FA předána',
  `fa_datum_predani_zam` date DEFAULT NULL COMMENT 'Datum předání FA zaměstnanci (ručně zadávané)',
  `fa_datum_vraceni_zam` date DEFAULT NULL COMMENT 'Datum vrácení FA od zaměstnance (ručně zadávané)',
  `vytvoril_uzivatel_id` int(10) NOT NULL COMMENT 'Kdo fakturu přidal',
  `aktualizoval_uzivatel_id` int(10) unsigned DEFAULT NULL,
  `dt_vytvoreni` datetime NOT NULL COMMENT 'Kdy byla faktura přidána',
  `dt_aktualizace` datetime DEFAULT NULL COMMENT 'Poslední aktualizace',
  `aktivni` tinyint(1) DEFAULT 1 COMMENT 'Aktivní záznam (pro soft delete)',
  PRIMARY KEY (`id`),
  KEY `idx_objednavka` (`objednavka_id`),
  KEY `idx_vytvoril` (`vytvoril_uzivatel_id`),
  KEY `idx_cislo_vema` (`fa_cislo_vema`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_faktury_datum_vystaveni` (`fa_datum_vystaveni`),
  KEY `idx_faktury_datum_splatnosti` (`fa_datum_splatnosti`),
  KEY `idx_faktury_datum_doruceni` (`fa_datum_doruceni`),
  KEY `idx_fa_zaplacena` (`fa_zaplacena`),
  KEY `idx_zaplacena_splatnost` (`fa_zaplacena`,`fa_datum_splatnosti`),
  KEY `idx_fa_typ` (`fa_typ`),
  KEY `idx_fa_potvrdil_vecnou_spravnost_id` (`potvrdil_vecnou_spravnost_id`),
  KEY `idx_fa_dt_potvrzeni_vecne_spravnosti` (`dt_potvrzeni_vecne_spravnosti`),
  KEY `idx_fa_vecna_spravnost_potvrzeno` (`vecna_spravnost_potvrzeno`),
  KEY `idx_fa_datum_zaplaceni` (`fa_datum_zaplaceni`),
  KEY `idx_fa_predana_zam_id` (`fa_predana_zam_id`),
  KEY `idx_fa_datum_predani_zam` (`fa_datum_predani_zam`),
  KEY `idx_fa_datum_vraceni_zam` (`fa_datum_vraceni_zam`),
  KEY `idx_faktury_smlouva_id` (`smlouva_id`),
  KEY `idx_aktualizoval_uzivatel` (`aktualizoval_uzivatel_id`),
  KEY `idx_faktury_stav` (`stav`),
  CONSTRAINT `fk_faktury_aktualizoval_uzivatel` FOREIGN KEY (`aktualizoval_uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_faktury_predana_zam` FOREIGN KEY (`fa_predana_zam_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Faktury k objednávkám s rozšiřujícími daty';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `25a_objednavky_faktury`
--

LOCK TABLES `25a_objednavky_faktury` WRITE;
/*!40000 ALTER TABLE `25a_objednavky_faktury` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `25a_objednavky_faktury` VALUES
(1,2,NULL,1,0,'K_ZAPLACENI',NULL,'2025-12-30','2026-01-30','2025-12-30',85000.00,'111','BEZNA',102,'2025-12-30 10:09:03','','',1,'[\"901_VEDENI_ZZS_SK\"]','','{\"typ_platby\":\"faktura\"}',NULL,NULL,NULL,102,102,'2025-12-30 10:08:18','2026-01-02 11:58:40',1),
(2,3,NULL,1,0,'K_ZAPLACENI',NULL,'2025-12-30','2026-01-30','2025-12-30',10000.00,'222','BEZNA',102,'2025-12-30 13:15:35','','',1,'[\"901_VEDENI_ZZS_SK\"]','','{\"typ_platby\":\"faktura\"}',NULL,NULL,NULL,102,102,'2025-12-30 13:15:18','2026-01-02 11:59:28',1),
(3,6,NULL,1,0,'K_ZAPLACENI',NULL,'2025-12-30','2026-01-30','2025-12-30',5000.00,'4444','BEZNA',102,'2025-12-30 14:22:18','','',1,'[\"901_VEDENI_ZZS_SK\"]','','{\"typ_platby\":\"faktura\"}',NULL,NULL,NULL,102,102,'2025-12-30 14:21:56','2026-01-02 08:49:10',1),
(4,NULL,NULL,1,1,'ZAPLACENO','2026-01-02 11:59:36','2025-12-17','2026-01-16','2025-12-30',43276.80,'227225','BEZNA',NULL,NULL,NULL,NULL,0,'[\"101_RLP_KLADNO\"]','',NULL,105,'2025-12-30',NULL,102,102,'2025-12-30 17:51:13','2026-01-02 11:59:36',1),
(5,NULL,4,1,0,'K_ZAPLACENI',NULL,'2025-12-30','2026-01-30','2025-12-30',48000.00,'123','BEZNA',NULL,NULL,NULL,NULL,0,'[]',NULL,NULL,NULL,NULL,NULL,102,102,'2025-12-30 21:17:48','2026-01-02 11:58:37',1),
(6,NULL,NULL,1,0,'ZAEVIDOVANA',NULL,'2025-12-30','2025-12-30','2025-12-30',1000.00,'TEST-FA-PRILOHA','BEZNA',NULL,NULL,NULL,NULL,0,'[\"105_RLP_ROZTOKY_U_PRAHY\"]','',NULL,NULL,NULL,NULL,1,1,'2025-12-30 21:18:53','2025-12-30 21:19:08',1),
(7,NULL,51,1,0,'K_ZAPLACENI',NULL,'2025-12-29','2026-01-30','2025-12-30',1000.00,'8888','BEZNA',NULL,NULL,NULL,NULL,0,'[]','',NULL,105,'2025-12-30',NULL,102,102,'2025-12-30 22:11:27','2026-01-02 11:59:35',1),
(8,NULL,48,1,0,'VECNA_SPRAVNOST',NULL,'2026-01-02','2026-01-01','2026-01-02',8532.92,'26010001','BEZNA',102,'2026-01-02 23:56:44','','',1,'[\"700_SPRAVA_DILNY\"]','',NULL,105,'2026-01-02',NULL,102,102,'2026-01-02 23:31:08','2026-01-02 23:56:45',1),
(9,11,NULL,1,0,'VECNA_SPRAVNOST',NULL,'2026-01-04','2026-02-04','2026-01-04',9500.00,'222','BEZNA',NULL,NULL,NULL,NULL,0,'[\"700_SPRAVA_DILNY\"]','',NULL,102,'2026-01-04',NULL,102,102,'2026-01-04 22:22:07','2026-01-04 22:24:39',1),
(10,10,NULL,1,0,'ZAEVIDOVANA',NULL,'2026-01-04','2026-02-03','2026-01-04',8000.00,'333','BEZNA',NULL,NULL,'','',0,'[]','','{\"typ_platby\":\"faktura\"}',NULL,NULL,NULL,102,102,'2026-01-04 22:25:38','2026-01-04 22:26:28',1);
/*!40000 ALTER TABLE `25a_objednavky_faktury` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `25a_objednavky_prilohy`
--

DROP TABLE IF EXISTS `25a_objednavky_prilohy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_objednavky_prilohy` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `objednavka_id` int(10) unsigned NOT NULL,
  `guid` varchar(50) DEFAULT NULL,
  `typ_prilohy` varchar(50) DEFAULT NULL,
  `originalni_nazev_souboru` varchar(255) NOT NULL,
  `systemova_cesta` varchar(255) NOT NULL,
  `velikost_souboru_b` int(10) DEFAULT NULL,
  `nahrano_uzivatel_id` int(10) unsigned DEFAULT NULL,
  `dt_vytvoreni` timestamp NOT NULL DEFAULT current_timestamp(),
  `dt_aktualizace` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `objednavka_id` (`objednavka_id`),
  KEY `nahrano_uzivatel_id` (`nahrano_uzivatel_id`),
  CONSTRAINT `25a_objednavky_prilohy_ibfk_1` FOREIGN KEY (`objednavka_id`) REFERENCES `25a_objednavky` (`id`),
  CONSTRAINT `25a_objednavky_prilohy_ibfk_2` FOREIGN KEY (`nahrano_uzivatel_id`) REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `25a_objednavky_prilohy`
--

LOCK TABLES `25a_objednavky_prilohy` WRITE;
/*!40000 ALTER TABLE `25a_objednavky_prilohy` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `25a_objednavky_prilohy` VALUES
(1,2,'2025-12-30_756b118b9aa01c86fa379f2f','CENOVA_NABIDKA','Cenová nabídka.jpg','obj-2025-12-30_756b118b9aa01c86fa379f2f.jpg',86983,102,'2025-12-30 07:48:42',NULL),
(2,3,'2025-12-30_865ebae0c6d153163714e2fb','OBJEDNAVKA','Číselníky.docx','obj-2025-12-30_865ebae0c6d153163714e2fb.docx',194105,102,'2025-12-30 10:39:07','2025-12-30 10:45:09'),
(3,3,'2025-12-30_017969386a082419e3257f7a','JINE','mail nový uživatelé.docx','obj-2025-12-30_017969386a082419e3257f7a.docx',34593,102,'2025-12-30 12:14:39','2025-12-30 12:14:42'),
(4,3,'2025-12-30_3f866ae5e59a86b5d987d457','KOSILKA','Financni_kontrola_2025-12-30_O_0002_75030926_2025_EN.pdf','fk-2025-12-30_3f866ae5e59a86b5d987d457.pdf',149536,102,'2025-12-30 12:16:06',NULL),
(5,6,'2025-12-30_7c14422431e880eeb1d77d9c','KOSILKA','Financni_kontrola_2025-12-30_O_0005_75030926_2025_EN.pdf','fk-2025-12-30_7c14422431e880eeb1d77d9c.pdf',149417,102,'2025-12-30 13:22:26',NULL),
(6,5,'2025-12-31_da8a867a682788fda48b6e46','PODKLADY','stavy faktury.png','obj-2025-12-31_da8a867a682788fda48b6e46.png',92330,1,'2025-12-30 23:34:33',NULL);
/*!40000 ALTER TABLE `25a_objednavky_prilohy` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `25a_faktury_lp_cerpani`
--

DROP TABLE IF EXISTS `25a_faktury_lp_cerpani`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_faktury_lp_cerpani` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `faktura_id` int(11) NOT NULL,
  `lp_cislo` varchar(20) NOT NULL,
  `lp_id` int(11) DEFAULT NULL,
  `castka` decimal(15,2) NOT NULL,
  `poznamka` text DEFAULT NULL,
  `datum_pridani` datetime NOT NULL DEFAULT current_timestamp(),
  `pridal_user_id` int(10) unsigned DEFAULT NULL,
  `datum_upravy` datetime DEFAULT NULL,
  `upravil_user_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_faktura_id` (`faktura_id`),
  KEY `idx_lp_cislo` (`lp_cislo`),
  KEY `idx_lp_id` (`lp_id`),
  KEY `idx_pridal_user_id` (`pridal_user_id`),
  KEY `idx_upravil_user_id` (`upravil_user_id`),
  CONSTRAINT `fk_faktury_lp_faktura` FOREIGN KEY (`faktura_id`) REFERENCES `25a_objednavky_faktury` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_faktury_lp_lp_id` FOREIGN KEY (`lp_id`) REFERENCES `25_limitovane_prisliby` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_faktury_lp_pridal` FOREIGN KEY (`pridal_user_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_faktury_lp_upravil` FOREIGN KEY (`upravil_user_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_castka_positive` CHECK (`castka` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Čerpání limitovaných příslibů na úrovni faktur - umožňuje rozdělit fakturu mezi více LP kódů';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `25a_faktury_lp_cerpani`
--

LOCK TABLES `25a_faktury_lp_cerpani` WRITE;
/*!40000 ALTER TABLE `25a_faktury_lp_cerpani` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `25a_faktury_lp_cerpani` VALUES
(1,2,'LPE1',40,10000.00,NULL,'2025-12-30 13:15:33',102,NULL,NULL),
(2,3,'LPE3',42,5000.00,NULL,'2025-12-30 14:22:12',102,NULL,NULL),
(4,10,'LPPT2',133,8000.00,NULL,'2026-01-04 22:26:28',102,NULL,NULL);
/*!40000 ALTER TABLE `25a_faktury_lp_cerpani` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`erdms_user`@`10.3.174.11`*/ /*!50003 TRIGGER trg_faktury_lp_cerpani_update 
BEFORE UPDATE ON 25a_faktury_lp_cerpani
FOR EACH ROW
BEGIN
    SET NEW.datum_upravy = NOW();
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `25a_faktury_prilohy`
--

DROP TABLE IF EXISTS `25a_faktury_prilohy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_faktury_prilohy` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  `faktura_id` int(10) NOT NULL COMMENT 'Vazba na fakturu (25a_faktury_objednavek)',
  `objednavka_id` int(10) unsigned DEFAULT NULL COMMENT 'Vazba na objednávku (pro rychlé dotazy) - nepovinné',
  `guid` varchar(50) DEFAULT NULL COMMENT 'GUID pro jedinečnost souboru',
  `typ_prilohy` varchar(50) DEFAULT NULL COMMENT 'Klasifikace: FAKTURA, ISDOC, DOPLNEK_FA',
  `originalni_nazev_souboru` varchar(255) NOT NULL COMMENT 'Původní název souboru',
  `systemova_cesta` varchar(255) NOT NULL COMMENT 'Cesta k souboru na disku (relativní)',
  `velikost_souboru_b` int(10) unsigned DEFAULT NULL COMMENT 'Velikost v bytech',
  `je_isdoc` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag: je to ISDOC soubor? (0=ne, 1=ano)',
  `isdoc_parsed` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag: byla extrahována ISDOC data? (0=ne, 1=ano)',
  `isdoc_data_json` mediumtext DEFAULT NULL COMMENT 'JSON s extrahovanými ISDOC daty (TEXT pro MySQL 5.5)',
  `nahrano_uzivatel_id` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele který nahrál soubor',
  `dt_vytvoreni` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Datum a čas vytvoření',
  `dt_aktualizace` datetime DEFAULT NULL COMMENT 'Datum poslední aktualizace (DATETIME pro MySQL 5.5)',
  PRIMARY KEY (`id`),
  KEY `idx_faktura_id` (`faktura_id`),
  KEY `idx_objednavka_id` (`objednavka_id`),
  KEY `idx_nahrano_uzivatel_id` (`nahrano_uzivatel_id`),
  KEY `idx_je_isdoc` (`je_isdoc`),
  KEY `idx_guid` (`guid`),
  KEY `idx_dt_vytvoreni` (`dt_vytvoreni`),
  CONSTRAINT `fk_faktury_prilohy_faktura` FOREIGN KEY (`faktura_id`) REFERENCES `25a_objednavky_faktury` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_faktury_prilohy_objednavka` FOREIGN KEY (`objednavka_id`) REFERENCES `25a_objednavky` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_faktury_prilohy_uzivatel` FOREIGN KEY (`nahrano_uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Přílohy k fakturám (PDF, ISDOC, apod.)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `25a_faktury_prilohy`
--

LOCK TABLES `25a_faktury_prilohy` WRITE;
/*!40000 ALTER TABLE `25a_faktury_prilohy` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `25a_faktury_prilohy` VALUES
(3,1,2,'2025-12-30_3fea3bee85da735b67983093','FAKTURA','doc_004.pdf','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2025-12-30_3fea3bee85da735b67983093.pdf',1204050,0,0,NULL,1,'2025-12-30 13:43:22',NULL),
(4,4,NULL,'2025-12-30_d7c1c3daee86873c1af391e8','FAKTURA','doc_003.pdf','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2025-12-30_d7c1c3daee86873c1af391e8.pdf',472624,0,0,NULL,102,'2025-12-30 16:51:15',NULL),
(5,6,NULL,'2025-12-30_0a2b677c36aed7d914a6f1ed','FAKTURA','2950181490.pdf','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2025-12-30_0a2b677c36aed7d914a6f1ed.pdf',99450,0,0,NULL,1,'2025-12-30 20:18:54',NULL),
(6,5,NULL,'2025-12-30_f32e879918847bcdaea8a776','FAKTURA','doc_001.pdf','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2025-12-30_f32e879918847bcdaea8a776.pdf',282323,0,0,NULL,102,'2025-12-30 20:30:04',NULL),
(7,5,NULL,'2025-12-30_6f5cee7e0a1ac174a9c6f2c6','JINE','zprava.txt','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2025-12-30_6f5cee7e0a1ac174a9c6f2c6.txt',415,0,0,NULL,102,'2025-12-30 20:30:41','2025-12-30 21:30:44'),
(8,7,NULL,'2025-12-30_a178990708fe4e68049b8418','FAKTURA','DOC001.pdf','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2025-12-30_a178990708fe4e68049b8418.pdf',111469,0,0,NULL,102,'2025-12-30 21:11:30',NULL),
(9,8,NULL,'2026-01-02_c2a10e25a6ec0b781953c7ef','FAKTURA','VF_26010001.PDF','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2026-01-02_c2a10e25a6ec0b781953c7ef.pdf',451474,0,0,NULL,102,'2026-01-02 22:31:09',NULL),
(10,8,NULL,'2026-01-02_4b1ed2f691c728f243dac75c','KOMUNIKACE','zprava.txt','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2026-01-02_4b1ed2f691c728f243dac75c.txt',158,0,0,NULL,102,'2026-01-02 22:31:12','2026-01-02 23:31:14'),
(11,9,11,'2026-01-04_dc4c46206b6d049309477fd9','FAKTURA','notes.png','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2026-01-04_dc4c46206b6d049309477fd9.png',95936,0,0,NULL,102,'2026-01-04 21:22:07',NULL),
(12,10,10,'2026-01-04_aee52ffbc807b7e876c57187','FAKTURA','kalkulacka.png','/var/www/erdms-platform/data/eeo-v2/prilohy/fa-2026-01-04_aee52ffbc807b7e876c57187.png',122572,0,0,NULL,102,'2026-01-04 21:25:38',NULL);
/*!40000 ALTER TABLE `25a_faktury_prilohy` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-01-04 22:54:22
