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
-- Table structure for table `25_hierarchie_vztahy`
--

DROP TABLE IF EXISTS `25_hierarchie_vztahy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_hierarchie_vztahy` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `profil_id` int(10) unsigned NOT NULL,
  `typ_vztahu` enum('user-user','location-user','user-location','department-user','user-department','template-user','template-location','template-department','template-role','user-role','role-user','department-role','role-department','location-role','role-location','role-role') NOT NULL,
  `user_id_1` int(10) unsigned DEFAULT NULL,
  `user_id_2` int(10) unsigned DEFAULT NULL,
  `lokalita_id` int(10) unsigned DEFAULT NULL,
  `usek_id` int(10) unsigned DEFAULT NULL,
  `template_id` int(10) unsigned DEFAULT NULL,
  `role_id` int(10) unsigned DEFAULT NULL COMMENT 'ID role (pokud je v vztahu)',
  `pozice_node_1` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pozice_node_1`)),
  `pozice_node_2` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pozice_node_2`)),
  `uroven_opravneni` tinyint(4) DEFAULT 1,
  `druh_vztahu` enum('prime','zastupovani','delegovani','rozsirene') DEFAULT 'prime',
  `viditelnost_objednavky` tinyint(1) DEFAULT 0,
  `viditelnost_faktury` tinyint(1) DEFAULT 0,
  `viditelnost_smlouvy` tinyint(1) DEFAULT 0,
  `viditelnost_pokladna` tinyint(1) DEFAULT 0,
  `viditelnost_uzivatele` tinyint(1) DEFAULT 0,
  `viditelnost_lp` tinyint(1) DEFAULT 0,
  `modules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Viditelnost modulů {orders, invoices, contracts, cashbook, users, lp}' CHECK (json_valid(`modules`)),
  `permission_level` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Úroveň práv {orders: READ_ONLY|EDIT|APPROVE, invoices: ..., contracts: ..., cashbook: ...}' CHECK (json_valid(`permission_level`)),
  `extended_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Rozšířené lokality/útvary/kombinace {locations: [], departments: [], combinations: []}' CHECK (json_valid(`extended_data`)),
  `notifikace_email` tinyint(1) DEFAULT 0,
  `notifikace_inapp` tinyint(1) DEFAULT 0,
  `notifikace_typy` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notifikace_typy`)),
  `notifikace_recipient_role` enum('APPROVAL','INFO','BOTH') DEFAULT 'APPROVAL',
  `node_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Nastavení template variant {source: {normalVariant, urgentVariant, infoVariant}, target: {...}}' CHECK (json_valid(`node_settings`)),
  `aktivni` tinyint(1) DEFAULT 1,
  `dt_vytvoreni` datetime DEFAULT current_timestamp(),
  `dt_upraveno` datetime DEFAULT NULL,
  `upravil_user_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_profil` (`profil_id`,`aktivni`),
  KEY `idx_user1` (`user_id_1`),
  KEY `idx_user2` (`user_id_2`),
  KEY `idx_lokalita` (`lokalita_id`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_template` (`template_id`)
) ENGINE=InnoDB AUTO_INCREMENT=260 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `25_hierarchie_vztahy`
--

LOCK TABLES `25_hierarchie_vztahy` WRITE;
/*!40000 ALTER TABLE `25_hierarchie_vztahy` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `25_hierarchie_vztahy` VALUES
(130,6,'role-location',NULL,NULL,1,NULL,NULL,11,'{\"x\":194.625,\"y\":-240.9484748840332}','{\"x\":210.125,\"y\":-118.05472183227539}',1,'prime',1,0,0,0,0,0,NULL,NULL,NULL,0,1,'[]','APPROVAL',NULL,1,'2025-12-13 11:57:13',NULL,1),
(131,7,'role-location',NULL,NULL,1,NULL,NULL,11,NULL,NULL,1,'prime',1,0,0,0,0,0,NULL,NULL,NULL,0,0,NULL,'APPROVAL',NULL,1,'2025-12-13 12:01:25',NULL,NULL),
(258,9,'template-user',NULL,100,NULL,NULL,5,NULL,'{\"x\":-1737.4581588155042,\"y\":-1700.6574378372904}','{\"x\":-1455.9581588155042,\"y\":-1586.9636969925639}',1,'prime',0,0,0,0,0,0,'{\"orders\":false,\"invoices\":false,\"contracts\":false,\"cashbook\":false,\"cashbookReadonly\":false,\"users\":false,\"lp\":false}','{\"orders\":\"READ_ONLY\",\"invoices\":\"READ_ONLY\",\"contracts\":\"READ_ONLY\",\"cashbook\":\"READ_ONLY\"}','{\"locations\":[],\"departments\":[],\"combinations\":[]}',1,1,'[]','INFO','{\"source\":{\"normalVariant\":\"SUBMITTER\",\"urgentVariant\":\"SUBMITTER\",\"infoVariant\":null,\"previewVariant\":null},\"target\":{\"normalVariant\":null,\"urgentVariant\":null,\"infoVariant\":null,\"previewVariant\":null}}',1,'2025-12-15 23:42:54',NULL,1),
(259,8,'template-user',NULL,100,NULL,NULL,5,NULL,'{\"x\":-1737.4581588155042,\"y\":-1700.6574378372904}','{\"x\":-1455.9581588155042,\"y\":-1586.9636969925639}',1,'prime',0,0,0,0,0,0,'{\"orders\":false,\"invoices\":false,\"contracts\":false,\"cashbook\":false,\"cashbookReadonly\":false,\"users\":false,\"lp\":false}','{\"orders\":\"READ_ONLY\",\"invoices\":\"READ_ONLY\",\"contracts\":\"READ_ONLY\",\"cashbook\":\"READ_ONLY\"}','{\"locations\":[],\"departments\":[],\"combinations\":[]}',1,1,'[]','INFO','{\"source\":{\"normalVariant\":\"SUBMITTER\",\"urgentVariant\":\"SUBMITTER\",\"infoVariant\":null,\"previewVariant\":null},\"target\":{\"normalVariant\":null,\"urgentVariant\":null,\"infoVariant\":null,\"previewVariant\":null}}',1,'2025-12-15 23:42:56',NULL,1);
/*!40000 ALTER TABLE `25_hierarchie_vztahy` ENABLE KEYS */;
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

-- Dump completed on 2025-12-16 20:06:24
