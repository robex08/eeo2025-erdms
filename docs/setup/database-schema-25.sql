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
-- Table structure for table `25_auditni_zaznamy`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_auditni_zaznamy` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `casova_znacka` timestamp NOT NULL DEFAULT current_timestamp(),
  `uzivatel_id` int(10) unsigned DEFAULT NULL,
  `typ_akce` varchar(50) NOT NULL COMMENT 'Např. OBJEDNAVKA_VYTVORENA, OBJEDNAVKA_SCHVALENA',
  `cilovy_objekt_typ` varchar(50) DEFAULT NULL COMMENT 'Např. objednavka, polozka, priloha',
  `cilovy_objekt_id` int(10) unsigned DEFAULT NULL COMMENT 'ID záznamu v cílové tabulce',
  `metadata_json` text DEFAULT NULL COMMENT 'JSON obsahující detaily o změně (např. staré vs. nové hodnoty)',
  PRIMARY KEY (`id`),
  KEY `idx_cilovy_objekt` (`cilovy_objekt_typ`,`cilovy_objekt_id`),
  KEY `uzivatel_id` (`uzivatel_id`),
  CONSTRAINT `25_auditni_zaznamy_ibfk_1` FOREIGN KEY (`uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_chat_konverzace`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_chat_konverzace` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nazev` varchar(255) DEFAULT NULL COMMENT 'Název konverzace (pro skupinové chaty)',
  `typ` enum('PRIVATE','GROUP','USEK','BROADCAST') NOT NULL DEFAULT 'PRIVATE' COMMENT 'Typ konverzace',
  `usek_id` int(11) DEFAULT NULL COMMENT 'ID úseku pro úsekové chaty',
  `popis` text DEFAULT NULL COMMENT 'Popis konverzace',
  `created_by_user_id` int(11) NOT NULL COMMENT 'Kdo vytvořil konverzaci',
  `aktivni` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Je konverzace aktivní',
  `dt_vytvoreni` datetime NOT NULL DEFAULT '1970-01-01 00:00:01' COMMENT 'Datum vytvoření',
  `dt_aktualizace` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Poslední aktualizace',
  `dt_posledni_zprava` datetime DEFAULT NULL COMMENT 'Čas poslední zprávy',
  PRIMARY KEY (`id`),
  KEY `idx_typ` (`typ`),
  KEY `idx_usek_id` (`usek_id`),
  KEY `idx_created_by` (`created_by_user_id`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_dt_posledni_zprava` (`dt_posledni_zprava`),
  KEY `idx_konverzace_aktivni_dt` (`aktivni`,`dt_posledni_zprava`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Konverzace/místnosti pro chat';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_chat_mentions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_chat_mentions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `zprava_id` int(11) NOT NULL COMMENT 'ID zprávy',
  `user_id` int(11) NOT NULL COMMENT 'ID zmíněného uživatele',
  `pozice_start` int(11) DEFAULT NULL COMMENT 'Pozice začátku zmínky v textu',
  `pozice_end` int(11) DEFAULT NULL COMMENT 'Pozice konce zmínky v textu',
  `precteno` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Byla zmínka přečtena',
  `dt_precteni` datetime DEFAULT NULL COMMENT 'Čas přečtení zmínky',
  `dt_vytvoreni` datetime NOT NULL DEFAULT '1970-01-01 00:00:01' COMMENT 'Čas vytvoření zmínky',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_zprava_user` (`zprava_id`,`user_id`),
  KEY `idx_zprava_id` (`zprava_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_precteno` (`precteno`),
  KEY `idx_mentions_user_precteno` (`user_id`,`precteno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Zmínky uživatelů ve zprávách';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_chat_online_status`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_chat_online_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'ID uživatele',
  `status` enum('ONLINE','AWAY','BUSY','OFFLINE') NOT NULL DEFAULT 'OFFLINE' COMMENT 'Status uživatele',
  `posledni_aktivita` datetime NOT NULL DEFAULT '1970-01-01 00:00:01' COMMENT 'Poslední aktivita',
  `ip_adresa` varchar(45) DEFAULT NULL COMMENT 'IP adresa',
  `user_agent` text DEFAULT NULL COMMENT 'Browser/zařízení info',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_posledni_aktivita` (`posledni_aktivita`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Online status uživatelů';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_chat_prectene_zpravy`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_chat_prectene_zpravy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'ID uživatele',
  `zprava_id` int(11) NOT NULL COMMENT 'ID zprávy',
  `dt_precteni` datetime NOT NULL DEFAULT '1970-01-01 00:00:01' COMMENT 'Čas přečtení',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_zprava` (`user_id`,`zprava_id`),
  KEY `idx_zprava_id` (`zprava_id`),
  KEY `idx_dt_precteni` (`dt_precteni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Sledování přečtených zpráv';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_chat_reakce`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_chat_reakce` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `zprava_id` int(11) NOT NULL COMMENT 'ID zprávy',
  `user_id` int(11) NOT NULL COMMENT 'ID uživatele který reagoval',
  `emoji` varchar(10) NOT NULL COMMENT 'Emoji reakce',
  `dt_vytvoreni` datetime NOT NULL DEFAULT '1970-01-01 00:00:01' COMMENT 'Čas reakce',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_zprava_user_emoji` (`zprava_id`,`user_id`,`emoji`),
  KEY `idx_zprava_id` (`zprava_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Reakce na zprávy';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_chat_ucastnici`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_chat_ucastnici` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `konverzace_id` int(11) NOT NULL COMMENT 'ID konverzace',
  `user_id` int(11) NOT NULL COMMENT 'ID uživatele',
  `role` enum('MEMBER','ADMIN','MODERATOR') NOT NULL DEFAULT 'MEMBER' COMMENT 'Role v konverzaci',
  `dt_pripojeni` datetime NOT NULL DEFAULT '1970-01-01 00:00:01' COMMENT 'Kdy se připojil',
  `dt_posledni_aktivita` datetime DEFAULT NULL COMMENT 'Poslední aktivita v konverzaci',
  `dt_posledni_precteni` datetime DEFAULT NULL COMMENT 'Kdy naposledy četl zprávy',
  `notifikace` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Má zapnuté notifikace',
  `aktivni` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Je aktivní účastník',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_konverzace_user` (`konverzace_id`,`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_dt_posledni_aktivita` (`dt_posledni_aktivita`),
  KEY `idx_ucastnici_user_aktivni` (`user_id`,`aktivni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Účastníci konverzací';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_chat_zpravy`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_chat_zpravy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `konverzace_id` int(11) NOT NULL COMMENT 'ID konverzace',
  `user_id` int(11) NOT NULL COMMENT 'Autor zprávy',
  `parent_zprava_id` int(11) DEFAULT NULL COMMENT 'ID rodičovské zprávy (pro odpovědi)',
  `obsah` text NOT NULL COMMENT 'Obsah zprávy (HTML)',
  `obsah_plain` text DEFAULT NULL COMMENT 'Obsah bez HTML tagů (pro vyhledávání)',
  `typ` enum('TEXT','FILE','IMAGE','SYSTEM','MENTION') NOT NULL DEFAULT 'TEXT' COMMENT 'Typ zprávy',
  `metadata` text DEFAULT NULL COMMENT 'Metadata ve formátu JSON (přílohy, mentions, atd.)',
  `editovano` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Byla zpráva editována',
  `dt_editace` datetime DEFAULT NULL COMMENT 'Čas poslední editace',
  `smazano` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Je zpráva smazána',
  `dt_smazani` datetime DEFAULT NULL COMMENT 'Čas smazání',
  `dt_vytvoreni` datetime NOT NULL DEFAULT '1970-01-01 00:00:01' COMMENT 'Čas vytvoření zprávy',
  PRIMARY KEY (`id`),
  KEY `idx_konverzace_id` (`konverzace_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_zprava_id` (`parent_zprava_id`),
  KEY `idx_typ` (`typ`),
  KEY `idx_dt_vytvoreni` (`dt_vytvoreni`),
  KEY `idx_smazano` (`smazano`),
  KEY `idx_konverzace_dt` (`konverzace_id`,`dt_vytvoreni`),
  KEY `idx_zpravy_konv_dt_smazano` (`konverzace_id`,`dt_vytvoreni`,`smazano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Zprávy v chatech';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_ciselnik_stavy`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_ciselnik_stavy` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `typ_objektu` varchar(50) NOT NULL COMMENT 'Např. OBJEDNAVKA, FAKTURA',
  `kod_stavu` varchar(50) NOT NULL,
  `nadrazeny_kod_stavu` varchar(50) NOT NULL,
  `nazev_stavu` varchar(100) NOT NULL,
  `popis` text DEFAULT NULL,
  `platnost_do` date NOT NULL DEFAULT '2100-12-21',
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unq_typ_kod` (`typ_objektu`,`kod_stavu`)
) ENGINE=InnoDB AUTO_INCREMENT=341 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_dodavatele`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_dodavatele` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nazev` varchar(255) NOT NULL,
  `adresa` varchar(255) DEFAULT NULL,
  `ico` varchar(20) DEFAULT NULL,
  `dic` varchar(20) DEFAULT NULL,
  `zastoupeny` varchar(255) DEFAULT NULL COMMENT 'Jméno jednatele/zástupce.',
  `kontakt_jmeno` varchar(255) DEFAULT NULL,
  `kontakt_email` varchar(255) DEFAULT NULL,
  `kontakt_telefon` varchar(50) DEFAULT NULL,
  `user_id` int(11) NOT NULL DEFAULT 0,
  `usek_zkr` varchar(256) NOT NULL,
  `dt_vytvoreni` timestamp NOT NULL DEFAULT current_timestamp(),
  `dt_aktualizace` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Databáze dodavatelů.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_limitovane_prisliby`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_limitovane_prisliby` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `usek_id` int(11) NOT NULL,
  `kategorie` varchar(32) NOT NULL,
  `cislo_lp` varchar(255) DEFAULT NULL,
  `cislo_uctu` int(11) DEFAULT NULL,
  `nazev_uctu` varchar(255) DEFAULT NULL,
  `vyse_financniho_kryti` decimal(15,2) DEFAULT NULL,
  `platne_od` date DEFAULT NULL,
  `platne_do` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_usek_id` (`usek_id`),
  KEY `idx_usek_cislo` (`usek_id`,`cislo_lp`(191))
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_limitovane_prisliby_cerpani`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_limitovane_prisliby_cerpani` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cislo_lp` varchar(50) NOT NULL COMMENT 'Kód LP (např. LPIT1)',
  `kategorie` varchar(50) NOT NULL COMMENT 'Typ LP (LPIT, LPZDR, LPÚČ, LPFIN)',
  `usek_id` int(11) NOT NULL COMMENT 'ID úseku',
  `user_id` int(11) NOT NULL COMMENT 'ID správce LP',
  `rok` year(4) NOT NULL COMMENT 'Rok platnosti',
  `celkovy_limit` decimal(15,2) DEFAULT 0.00 COMMENT 'Suma všech vyse_financniho_kryti pro tento kód',
  `rezervovano` decimal(15,2) DEFAULT 0.00 COMMENT 'Rezervace = suma max_cena_s_dph z objednávek (pesimistický odhad)',
  `predpokladane_cerpani` decimal(15,2) DEFAULT 0.00 COMMENT 'Odhad = suma součtů položek objednávek (reálný odhad)',
  `skutecne_cerpano` decimal(15,2) DEFAULT 0.00 COMMENT 'Skutečnost = suma fakturovaných částek + pokladna (finální)',
  `cerpano_pokladna` decimal(15,2) DEFAULT 0.00 COMMENT 'Čerpání z pokladny (finální částky)',
  `zbyva_rezervace` decimal(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle rezervace (limit - rezervovano)',
  `zbyva_predpoklad` decimal(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle odhadu (limit - predpokladane_cerpani)',
  `zbyva_skutecne` decimal(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle skutečnosti (limit - skutecne_cerpano)',
  `procento_rezervace` decimal(5,2) DEFAULT 0.00 COMMENT 'Procento rezervace',
  `procento_predpoklad` decimal(5,2) DEFAULT 0.00 COMMENT 'Procento odhadu',
  `procento_skutecne` decimal(5,2) DEFAULT 0.00 COMMENT 'Procento skutečnosti',
  `celkove_cerpano` decimal(15,2) DEFAULT 0.00 COMMENT 'Celkově vyčerpáno z objednávek a pokladny',
  `celkove_zbyva` decimal(15,2) DEFAULT 0.00 COMMENT 'Zbývá (celkovy_limit - celkove_cerpano)',
  `celkove_procento` decimal(5,2) DEFAULT 0.00 COMMENT 'Procento čerpání',
  `pocet_zaznamu` int(11) DEFAULT 1 COMMENT 'Počet záznamů LP (1 = základní, 2+ = s navýšením)',
  `ma_navyseni` tinyint(1) DEFAULT 0 COMMENT '1 = má navýšení, 0 = jen základní záznam',
  `posledni_prepocet` datetime DEFAULT NULL COMMENT 'Časová značka posledního přepočtu',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_lp_rok` (`cislo_lp`,`rok`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_kategorie` (`kategorie`),
  KEY `idx_rok` (`rok`)
) ENGINE=InnoDB AUTO_INCREMENT=448 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Agregovaný stav čerpání LP podle kódů';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_limitovane_prisliby_zaloha`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_limitovane_prisliby_zaloha` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `usek_id` int(11) NOT NULL,
  `kategorie` varchar(32) NOT NULL,
  `cislo_lp` varchar(255) DEFAULT NULL,
  `cislo_uctu` int(11) DEFAULT NULL,
  `nazev_uctu` varchar(255) DEFAULT NULL,
  `vyse_financniho_kryti` decimal(15,2) DEFAULT NULL,
  `platne_od` date DEFAULT NULL,
  `platne_do` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_usek_id` (`usek_id`),
  KEY `idx_usek_cislo` (`usek_id`,`cislo_lp`(191))
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_lokality`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_lokality` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nazev` varchar(100) NOT NULL,
  `kod` varchar(50) NOT NULL,
  `typ` enum('Okres','Stanoviště','Ředitelství') NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL COMMENT 'Odkaz na nadřazenou lokalitu (okres). Pro okresy je NULL.',
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kod` (`kod`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `25_lokality_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `25_lokality` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Hierarchický číselník okresů a stanovišť.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_notification_templates`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_notification_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(100) NOT NULL COMMENT 'Typ notifikace (enum z NOTIFICATION_TYPES)',
  `name` varchar(255) NOT NULL COMMENT 'Název templatu pro admin',
  `email_subject` varchar(500) DEFAULT NULL COMMENT 'Předmět emailu (placeholdery)',
  `email_body` text DEFAULT NULL COMMENT 'Tělo emailu (placeholdery, HTML možné)',
  `send_email_default` tinyint(1) DEFAULT 0 COMMENT 'Výchozí: poslat email? (0=ne, 1=ano)',
  `app_title` varchar(255) NOT NULL COMMENT 'Titulek v aplikaci (placeholdery)',
  `app_message` text NOT NULL COMMENT 'Zpráva v aplikaci (placeholdery)',
  `priority_default` enum('low','normal','high','urgent') DEFAULT 'normal' COMMENT 'Výchozí priorita',
  `active` tinyint(1) DEFAULT 1 COMMENT 'Je template aktivní? (0=ne, 1=ano)',
  `dt_created` datetime DEFAULT NULL,
  `dt_updated` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type` (`type`),
  KEY `idx_active` (`active`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=112 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='Templates pro notifikace - rozšířené o detailní placeholdery';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_notifications`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(64) NOT NULL COMMENT 'Typ notifikace (order_approved, order_rejected, system_message, atd.)',
  `title` varchar(255) NOT NULL COMMENT 'Krátký titulek notifikace',
  `message` text DEFAULT NULL COMMENT 'Hlavní text notifikace',
  `data_json` text DEFAULT NULL COMMENT 'Dodatečná data v JSON formátu (odkazy, metadata, atd.)',
  `from_user_id` int(11) DEFAULT NULL COMMENT 'ID uživatele který notifikaci vytvořil (NULL = systém)',
  `to_user_id` int(11) DEFAULT NULL COMMENT 'Konkrétní uživatel (NULL = pro všechny)',
  `to_users_json` text DEFAULT NULL COMMENT 'JSON array s ID uživatelů pro skupinové notifikace',
  `to_all_users` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = notifikace pro všechny uživatele',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `category` varchar(32) DEFAULT NULL COMMENT 'Kategorie notifikace (orders, system, security, atd.)',
  `send_email` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = poslat také email',
  `email_sent` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = email byl odeslán',
  `email_sent_at` datetime DEFAULT NULL COMMENT 'Kdy byl email odeslán',
  `related_object_type` varchar(32) DEFAULT NULL COMMENT 'Typ objektu (order, user, system)',
  `related_object_id` bigint(20) DEFAULT NULL COMMENT 'ID souvisejícího objektu',
  `dt_created` datetime NOT NULL COMMENT 'Kdy byla notifikace vytvořena',
  `dt_expires` datetime DEFAULT NULL COMMENT 'Kdy notifikace expiruje (NULL = nikdy)',
  `active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = aktivní, 0 = neaktivní/smazaná',
  PRIMARY KEY (`id`),
  KEY `idx_to_user_id` (`to_user_id`),
  KEY `idx_from_user_id` (`from_user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_dt_created` (`dt_created`),
  KEY `idx_active_expires` (`active`,`dt_expires`),
  KEY `idx_related_object` (`related_object_type`,`related_object_id`),
  KEY `idx_email_pending` (`send_email`,`email_sent`),
  KEY `idx_notifications_active_type` (`active`,`type`,`dt_created`),
  KEY `idx_notifications_expires_active` (`dt_expires`,`active`),
  KEY `idx_user_dismissed` (`to_user_id`),
  KEY `idx_user_deleted` (`to_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=485 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='Hlavní tabulka notifikací';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_notifications_read`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_notifications_read` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `notification_id` bigint(20) unsigned NOT NULL COMMENT 'ID notifikace',
  `user_id` int(11) NOT NULL COMMENT 'ID uživatele',
  `is_read` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = přečteno, 0 = nepřečteno',
  `dt_read` datetime DEFAULT NULL COMMENT 'Kdy bylo označeno jako přečtené',
  `is_dismissed` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = uživatel notifikaci zamítl/skryl',
  `dt_dismissed` datetime DEFAULT NULL COMMENT 'Kdy byla zamítnuta',
  `dt_created` datetime NOT NULL COMMENT 'Kdy byl záznam vytvořen',
  `is_deleted` tinyint(1) DEFAULT 0 COMMENT 'Notifikace trvale smazána (soft delete)',
  `dt_deleted` datetime DEFAULT NULL COMMENT 'Datum a čas smazání notifikace',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notification_user` (`notification_id`,`user_id`),
  KEY `idx_user_read` (`user_id`,`is_read`),
  KEY `idx_user_dismissed` (`user_id`,`is_dismissed`),
  KEY `idx_notifications_user_unread` (`user_id`,`is_read`,`dt_created`),
  KEY `idx_user_deleted` (`user_id`,`is_deleted`),
  KEY `idx_dismissed_deleted` (`is_dismissed`,`is_deleted`),
  CONSTRAINT `25_notifications_read_ibfk_1` FOREIGN KEY (`notification_id`) REFERENCES `25_notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=907 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='Sledování přečtení notifikací uživateli';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_organizace_vizitka`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_organizace_vizitka` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ico` varchar(20) NOT NULL,
  `dic` varchar(32) NOT NULL,
  `nazev_organizace` varchar(255) NOT NULL,
  `zkrtaka` varchar(32) NOT NULL,
  `ulice_cislo` varchar(100) DEFAULT NULL,
  `mesto` varchar(100) DEFAULT NULL,
  `psc` varchar(10) DEFAULT NULL,
  `zastoupeny` varchar(255) DEFAULT NULL,
  `datova_schranka` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefon` varchar(50) DEFAULT NULL,
  `dt_aktualizace` timestamp NULL DEFAULT NULL,
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ico` (`ico`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_pozice`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_pozice` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nazev_pozice` varchar(100) NOT NULL COMMENT 'Název pracovní pozice dle organizačního řádu.',
  `parent_id` int(10) unsigned DEFAULT NULL COMMENT 'Odkaz na nadřazenou pozici v hierarchii.',
  `usek_id` int(10) unsigned DEFAULT NULL,
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nazev_pozice` (`nazev_pozice`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `25_pozice_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `25_pozice` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Hierarchický číselník pracovních pozic.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_prava`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_prava` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kod_prava` varchar(50) NOT NULL COMMENT 'Kód pro kontrolu v aplikaci, např. CREATE_ORDER.',
  `popis` varchar(255) DEFAULT NULL,
  `aktivni` tinyint(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kod_prava` (`kod_prava`)
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Jednotlivá oprávnění v systému.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_role`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_role` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  `kod_role` varchar(32) NOT NULL,
  `nazev_role` varchar(50) NOT NULL COMMENT 'Např. Administrátor, Schvalovatel, Uživatel.',
  `Popis` varchar(128) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nazev_role` (`nazev_role`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Uživatelské role v aplikaci.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_role_prava`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_role_prava` (
  `user_id` int(11) NOT NULL DEFAULT -1,
  `role_id` int(10) NOT NULL,
  `pravo_id` int(10) unsigned NOT NULL,
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  KEY `pravo_id` (`pravo_id`),
  CONSTRAINT `25_role_prava_ibfk_2` FOREIGN KEY (`pravo_id`) REFERENCES `25_prava` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Spojovací tabulka mezi rolemi a právy (vazba M:N).';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_sablony_docx`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_sablony_docx` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `nazev` varchar(255) NOT NULL COMMENT 'Název šablony pro zobrazení v aplikaci',
  `popis` text DEFAULT NULL COMMENT 'Podrobnější popis šablony a jejího účelu',
  `typ_dokumentu` varchar(64) DEFAULT NULL COMMENT 'Typ dokumentu (smlouva, objednavka, protokol...)',
  `nazev_souboru` varchar(255) NOT NULL COMMENT 'Originální název nahraného DOCX souboru',
  `nazev_souboru_ulozeny` varchar(255) NOT NULL COMMENT 'Unikátní název souboru na serveru (GUID_nazev.docx)',
  `cesta_souboru` varchar(512) NOT NULL DEFAULT 'sablony/' COMMENT 'Relativní cesta k souboru (např. sablony/)',
  `velikost_souboru` int(11) unsigned DEFAULT NULL COMMENT 'Velikost souboru v bytech',
  `md5_hash` varchar(32) DEFAULT NULL COMMENT 'MD5 hash pro kontrolu integrity souboru',
  `mapovani_json` text DEFAULT NULL COMMENT 'JSON struktura mapování DOCVARIABLE polí na DB pole',
  `platnost_od` date DEFAULT NULL COMMENT 'Datum od kdy je šablona platná',
  `platnost_do` date DEFAULT NULL COMMENT 'Datum do kdy je šablona platná (NULL = neomezeně)',
  `aktivni` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = aktivní, 0 = neaktivní',
  `usek_omezeni` text DEFAULT NULL COMMENT 'JSON pole zkratek úseků ["IT","FIN"] nebo NULL pro všechny',
  `vytvoril_uzivatel_id` int(11) unsigned DEFAULT NULL COMMENT 'ID uživatele který šablonu vytvořil',
  `dt_vytvoreni` datetime DEFAULT NULL COMMENT 'Datum a čas vytvoření záznamu',
  `aktualizoval_uzivatel_id` int(11) unsigned DEFAULT NULL COMMENT 'ID uživatele který šablonu naposledy upravil',
  `dt_aktualizace` datetime DEFAULT NULL COMMENT 'Datum a čas poslední aktualizace',
  `castka` decimal(15,2) NOT NULL DEFAULT 0.00,
  `verze` varchar(32) DEFAULT '1.0' COMMENT 'Verze šablony',
  `poznamka` text DEFAULT NULL COMMENT 'Interní poznámka k šabloně',
  PRIMARY KEY (`id`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_platnost` (`platnost_od`,`platnost_do`),
  KEY `idx_vytvoril` (`vytvoril_uzivatel_id`),
  KEY `idx_typ` (`typ_dokumentu`),
  KEY `idx_aktivni_platnost` (`aktivni`,`platnost_od`,`platnost_do`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='Evidence DOCX šablon dokumentů';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_sablony_objednavek`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_sablony_objednavek` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `dt_vytvoreni` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `dt_aktualizace` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nazev_sablony` varchar(255) NOT NULL,
  `polozky_po` text NOT NULL,
  `polozky_detail` text NOT NULL,
  `typ` enum('PO','detail','PO+detail') NOT NULL,
  `kategorie` varchar(50) NOT NULL DEFAULT 'OBJEDNAVKA',
  `usek_zkr` varchar(128) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sablony_uzivatel` (`user_id`),
  CONSTRAINT `fk_sablony_uzivatel` FOREIGN KEY (`user_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_smlouvy`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_smlouvy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cislo_smlouvy` varchar(100) NOT NULL COMMENT 'Evidenční číslo smlouvy (např. S-147/750309/26/23)',
  `usek_id` int(11) NOT NULL COMMENT 'ID úseku z tabulky 25_useky',
  `usek_zkr` varchar(50) DEFAULT NULL COMMENT 'Zkratka úseku (denormalizace pro rychlost)',
  `druh_smlouvy` varchar(100) NOT NULL COMMENT 'Typ smlouvy: SLUŽBY, KUPNÍ, RÁMCOVÁ, atd.',
  `nazev_firmy` varchar(255) NOT NULL COMMENT 'Název dodavatele/firmy',
  `ico` varchar(20) DEFAULT NULL COMMENT 'IČO dodavatele (8 číslic)',
  `dic` varchar(20) DEFAULT NULL COMMENT 'DIČ dodavatele (volitelné)',
  `nazev_smlouvy` varchar(500) NOT NULL COMMENT 'Název/předmět smlouvy',
  `popis_smlouvy` text DEFAULT NULL COMMENT 'Detailní popis smlouvy',
  `platnost_od` date DEFAULT NULL COMMENT 'Datum platnosti od',
  `platnost_do` date NOT NULL COMMENT 'Datum platnosti do',
  `hodnota_bez_dph` decimal(15,2) DEFAULT 0.00 COMMENT 'Hodnota smlouvy bez DPH',
  `hodnota_s_dph` decimal(15,2) NOT NULL COMMENT 'Hodnota smlouvy s DPH (hlavní částka)',
  `sazba_dph` decimal(5,2) DEFAULT 21.00 COMMENT 'Použitá sazba DPH v % (pro přepočty)',
  `cerpano_celkem` decimal(15,2) DEFAULT 0.00 COMMENT 'Celkové čerpání ze smlouvy (suma z objednávek)',
  `zbyva` decimal(15,2) DEFAULT 0.00 COMMENT 'Zbývající částka (hodnota_s_dph - cerpano_celkem)',
  `procento_cerpani` decimal(5,2) DEFAULT 0.00 COMMENT 'Procento čerpání (cerpano_celkem / hodnota_s_dph * 100)',
  `aktivni` tinyint(1) DEFAULT 1 COMMENT '1 = aktivní, 0 = neaktivní/archivováno',
  `stav` enum('AKTIVNI','NEAKTIVNI','UKONCENA','PRERUSENA','PRIPRAVOVANA') DEFAULT 'AKTIVNI' COMMENT 'Stav smlouvy - AKTIVNI=běžící, UKONCENA=platnost vypršela, PRERUSENA=přerušeno, PRIPRAVOVANA=ještě nenaběhla',
  `dt_vytvoreni` datetime DEFAULT NULL COMMENT 'Datum vytvoření záznamu',
  `dt_aktualizace` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Datum poslední aktualizace (automatické)',
  `vytvoril_user_id` int(11) DEFAULT NULL COMMENT 'ID uživatele, který vytvořil záznam',
  `upravil_user_id` int(11) DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  `posledni_prepocet` datetime DEFAULT NULL COMMENT 'Časová značka posledního přepočtu čerpání',
  `poznamka` text DEFAULT NULL COMMENT 'Interní poznámka k smlouvě',
  `cislo_dms` varchar(100) DEFAULT NULL COMMENT 'Číslo v DMS/archivním systému',
  `kategorie` varchar(50) DEFAULT NULL COMMENT 'Kategorie smlouvy pro filtrování (volitelné)',
  `hodnota_plneni_bez_dph` decimal(15,2) DEFAULT NULL,
  `hodnota_plneni_s_dph` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cislo_smlouvy` (`cislo_smlouvy`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_ico` (`ico`),
  KEY `idx_druh` (`druh_smlouvy`),
  KEY `idx_platnost` (`platnost_od`,`platnost_do`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_stav` (`stav`),
  KEY `idx_kategorie` (`kategorie`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Evidence smluv - správa a sledování čerpání';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_smlouvy_import_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_smlouvy_import_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dt_importu` datetime NOT NULL COMMENT 'Datum a čas importu',
  `user_id` int(11) NOT NULL COMMENT 'Uživatel, který provedl import',
  `username` varchar(100) DEFAULT NULL COMMENT 'Jméno uživatele (pro historii)',
  `nazev_souboru` varchar(255) DEFAULT NULL COMMENT 'Název importovaného souboru',
  `typ_souboru` varchar(10) DEFAULT NULL COMMENT 'Typ: XLSX, XLS, CSV',
  `velikost_souboru` int(11) DEFAULT NULL COMMENT 'Velikost souboru v bajtech',
  `pocet_radku` int(11) DEFAULT 0 COMMENT 'Počet záznamů v importu',
  `pocet_uspesnych` int(11) DEFAULT 0 COMMENT 'Počet úspěšně importovaných',
  `pocet_aktualizovanych` int(11) DEFAULT 0 COMMENT 'Počet aktualizovaných existujících',
  `pocet_preskoceno` int(11) DEFAULT 0 COMMENT 'Počet přeskočených (duplicity)',
  `pocet_chyb` int(11) DEFAULT 0 COMMENT 'Počet chyb při importu',
  `chybove_zaznamy` text DEFAULT NULL COMMENT 'JSON se seznamem chyb: [{row, field, message}]',
  `status` enum('SUCCESS','PARTIAL','FAILED') DEFAULT 'SUCCESS' COMMENT 'Stav importu - SUCCESS=vše OK, PARTIAL=některé chyby, FAILED=selhalo',
  `overwrite_existing` tinyint(1) DEFAULT 0 COMMENT 'Zda se přepisovaly existující záznamy',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_datum` (`dt_importu`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Historie hromadných importů smluv';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_useky`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_useky` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usek_zkr` varchar(16) CHARACTER SET utf8mb3 COLLATE utf8mb3_czech_ci NOT NULL,
  `usek_nazev` varchar(128) NOT NULL,
  `aktivni` tinyint(4) NOT NULL DEFAULT 1,
  UNIQUE KEY `id` (`id`),
  KEY `idx_usek_zkr` (`usek_zkr`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_uzivatel_nastaveni`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_uzivatel_nastaveni` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `uzivatel_id` int(10) NOT NULL COMMENT 'FK na 25_uzivatele.id',
  `nastaveni_data` text NOT NULL COMMENT 'JSON jako string',
  `nastaveni_verze` varchar(10) DEFAULT '1.0' COMMENT 'Verze struktury nastavení',
  `vytvoreno` datetime DEFAULT NULL COMMENT 'Nastaveno při INSERT přes NOW()',
  `upraveno` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Auto-update při změně',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_uzivatel` (`uzivatel_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Uživatelská nastavení aplikace - filtry, viditelnost dlaždic, export CSV';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_uzivatele`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_uzivatele` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL COMMENT 'Zahashované heslo - viz doporučení níže.',
  `titul_pred` varchar(50) DEFAULT NULL,
  `jmeno` varchar(100) DEFAULT NULL,
  `prijmeni` varchar(100) DEFAULT NULL,
  `titul_za` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefon` varchar(50) DEFAULT NULL,
  `pozice_id` int(10) unsigned DEFAULT NULL,
  `lokalita_id` int(10) unsigned DEFAULT NULL COMMENT 'Přiřazení uživatele k domovské lokalitě.',
  `organizace_id` smallint(6) NOT NULL DEFAULT 1,
  `usek_id` int(11) NOT NULL,
  `aktivni` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0 = neaktivní, 1 = aktivní',
  `dt_vytvoreni` timestamp NOT NULL DEFAULT current_timestamp(),
  `dt_aktualizace` timestamp NULL DEFAULT NULL,
  `dt_posledni_aktivita` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `pozice_id` (`pozice_id`),
  KEY `lokalita_id` (`lokalita_id`),
  KEY `fk_uzivatele_useky` (`usek_id`),
  CONSTRAINT `25_uzivatele_ibfk_2` FOREIGN KEY (`pozice_id`) REFERENCES `25_pozice` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `25_uzivatele_ibfk_3` FOREIGN KEY (`lokalita_id`) REFERENCES `25_lokality` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_uzivatele_useky` FOREIGN KEY (`usek_id`) REFERENCES `25_useky` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Uživatelé aplikace s definovanou rolí, pozicí a lokalitou.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_uzivatele_hierarchie`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_uzivatele_hierarchie` (
  `nadrizeny_id` int(10) unsigned NOT NULL COMMENT 'ID nadřízeného uživatele.',
  `podrizeny_id` int(10) unsigned NOT NULL COMMENT 'ID podřízeného uživatele.',
  PRIMARY KEY (`nadrizeny_id`,`podrizeny_id`),
  KEY `podrizeny_id` (`podrizeny_id`),
  CONSTRAINT `25_uzivatele_hierarchie_ibfk_1` FOREIGN KEY (`nadrizeny_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `25_uzivatele_hierarchie_ibfk_2` FOREIGN KEY (`podrizeny_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Definuje M:N vztahy v organizační struktuře.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_uzivatele_poznamky`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_uzivatele_poznamky` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'ID uživatele z tabulky 25_uzivatele',
  `typ` enum('TODO','NOTES') NOT NULL COMMENT 'Typ záznamu - TODO nebo NOTES',
  `obsah` text DEFAULT NULL COMMENT 'JSON struktura s obsahem',
  `dt_vytvoreni` datetime NOT NULL COMMENT 'Datum a čas vytvoření',
  `dt_aktualizace` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Datum a čas poslední aktualizace',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_typ` (`user_id`,`typ`) COMMENT 'Jeden záznam každého typu na uživatele',
  KEY `idx_user_id` (`user_id`),
  KEY `idx_typ` (`typ`),
  KEY `idx_dt_aktualizace` (`dt_aktualizace`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Uživatelské TODO seznamy a poznámky - jeden záznam každého typu na uživatele';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25_uzivatele_role`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_uzivatele_role` (
  `uzivatel_id` int(10) unsigned NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`uzivatel_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `25_uzivatele_role_ibfk_1` FOREIGN KEY (`uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE,
  CONSTRAINT `25_uzivatele_role_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `25_role` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_faktury_prilohy`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_faktury_prilohy` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  `faktura_id` int(10) NOT NULL COMMENT 'Vazba na fakturu (25a_faktury_objednavek)',
  `objednavka_id` int(10) unsigned NOT NULL COMMENT 'Vazba na objednávku (pro rychlé dotazy)',
  `guid` varchar(50) DEFAULT NULL COMMENT 'GUID pro jedinečnost souboru',
  `typ_prilohy` varchar(50) DEFAULT NULL COMMENT 'Klasifikace: FAKTURA, ISDOC, DOPLNEK_FA',
  `originalni_nazev_souboru` varchar(255) NOT NULL COMMENT 'Původní název souboru',
  `systemova_cesta` varchar(255) NOT NULL COMMENT 'Cesta k souboru na disku (relativní)',
  `velikost_souboru_b` int(10) unsigned DEFAULT NULL COMMENT 'Velikost v bytech',
  `je_isdoc` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag: je to ISDOC soubor? (0=ne, 1=ano)',
  `isdoc_parsed` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag: byla extrahována ISDOC data? (0=ne, 1=ano)',
  `isdoc_data_json` text DEFAULT NULL COMMENT 'JSON s extrahovanými ISDOC daty (TEXT pro MySQL 5.5)',
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
  CONSTRAINT `fk_faktury_prilohy_objednavka` FOREIGN KEY (`objednavka_id`) REFERENCES `25a_objednavky` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_faktury_prilohy_uzivatel` FOREIGN KEY (`nahrano_uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_uca1400_ai_ci COMMENT='Přílohy k fakturám (PDF, ISDOC, apod.)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_nastaveni_globalni`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_nastaveni_globalni` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `klic` varchar(100) NOT NULL COMMENT 'Klíč nastavení',
  `hodnota` text DEFAULT NULL COMMENT 'Hodnota (JSON nebo jednoduchá hodnota)',
  `popis` varchar(255) DEFAULT NULL COMMENT 'Popis nastavení',
  `vytvoreno` datetime NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` datetime DEFAULT NULL COMMENT 'Datum aktualizace',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_klic` (`klic`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Globální nastavení aplikace';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_objednavky`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=11357 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_objednavky_faktury`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_objednavky_faktury` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `objednavka_id` int(10) NOT NULL COMMENT 'Reference na 25a_objednavky',
  `fa_dorucena` tinyint(1) DEFAULT 0 COMMENT 'Zda byla faktura doručena (0=NE, 1=ANO)',
  `fa_zaplacena` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Zda byla faktura zaplacena (0=NE, 1=ANO)',
  `fa_datum_vystaveni` date DEFAULT NULL COMMENT 'Datum vystavení faktury',
  `fa_datum_splatnosti` date DEFAULT NULL COMMENT 'Datum splatnosti faktury',
  `fa_datum_doruceni` date DEFAULT NULL COMMENT 'Datum doručení faktury',
  `fa_castka` decimal(15,2) NOT NULL COMMENT 'Částka faktury - povinné',
  `fa_cislo_vema` varchar(100) NOT NULL COMMENT 'Číslo Fa/VPD z VEMA - povinné',
  `fa_typ` varchar(32) DEFAULT 'BEZNA' COMMENT 'Typ faktury - kod_stavu (BEZNA, ZALOHOVA, VYUCTOVACI, DOBROPIS)',
  `potvrdil_vecnou_spravnost_id` int(11) DEFAULT NULL COMMENT 'ID uživatele, který potvrdil věcnou správnost faktury',
  `dt_potvrzeni_vecne_spravnosti` datetime DEFAULT NULL COMMENT 'Datum a čas potvrzení věcné správnosti faktury',
  `vecna_spravnost_umisteni_majetku` text DEFAULT NULL COMMENT 'Popis umístění majetku (volitelné)',
  `vecna_spravnost_poznamka` text DEFAULT NULL COMMENT 'Poznámka k věcné správnosti faktury (volitelné)',
  `vecna_spravnost_potvrzeno` tinyint(1) DEFAULT 0 COMMENT 'Boolean: Potvrzení věcné správnosti (0=NE, 1=ANO)',
  `fa_strediska_kod` text DEFAULT NULL COMMENT 'Středisko pro fakturu - editovatelné',
  `fa_poznamka` text DEFAULT NULL COMMENT 'Poznámka/vzkaz k faktuře - nepovinné',
  `rozsirujici_data` text DEFAULT NULL COMMENT 'JSON struktura pro budoucí rozšíření funkcionality',
  `vytvoril_uzivatel_id` int(10) NOT NULL COMMENT 'Kdo fakturu přidal',
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
  KEY `idx_fa_vecna_spravnost_potvrzeno` (`vecna_spravnost_potvrzeno`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='Faktury k objednávkám s rozšiřujícími daty';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_objednavky_polozky`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=43725 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_objednavky_prilohy`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=73060 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_pokladni_audit`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_pokladni_audit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `typ_entity` enum('kniha','polozka') NOT NULL COMMENT 'Typ entity (kniha/položka)',
  `entita_id` int(11) NOT NULL COMMENT 'ID entity (pokladni_kniha_id nebo polozka_id)',
  `akce` enum('vytvoreni','uprava','smazani','obnoveni','uzavreni','otevreni','zamknuti','odemknuti') NOT NULL COMMENT 'Typ akce',
  `uzivatel_id` int(10) unsigned NOT NULL COMMENT 'ID uživatele, který provedl akci',
  `stare_hodnoty` text DEFAULT NULL COMMENT 'Staré hodnoty (JSON)',
  `nove_hodnoty` text DEFAULT NULL COMMENT 'Nové hodnoty (JSON)',
  `ip_adresa` varchar(45) DEFAULT NULL COMMENT 'IP adresa uživatele',
  `user_agent` varchar(255) DEFAULT NULL COMMENT 'User agent prohlížeče',
  `vytvoreno` datetime NOT NULL COMMENT 'Datum a čas akce',
  PRIMARY KEY (`id`),
  KEY `idx_entita` (`typ_entity`,`entita_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_akce` (`akce`),
  KEY `idx_vytvoreno` (`vytvoreno`),
  CONSTRAINT `fk_audit_uzivatel` FOREIGN KEY (`uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=332 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Audit log pokladních knih (historie změn)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_pokladni_knihy`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_pokladni_knihy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prirazeni_id` int(11) NOT NULL COMMENT 'ID přiřazení pokladny uživateli (FK)',
  `pokladna_id` int(11) NOT NULL COMMENT 'ID pokladny (FK) - denormalizace pro rychlejší dotazy',
  `uzivatel_id` int(10) unsigned NOT NULL COMMENT 'ID uživatele (majitel knihy)',
  `rok` smallint(4) NOT NULL COMMENT 'Rok (např. 2025)',
  `mesic` tinyint(2) NOT NULL COMMENT 'Měsíc (1-12)',
  `cislo_pokladny` int(11) NOT NULL COMMENT 'Číslo pokladny (kopie z 25a_pokladny)',
  `kod_pracoviste` varchar(50) DEFAULT NULL COMMENT 'Kód pracoviště (kopie)',
  `nazev_pracoviste` varchar(255) DEFAULT NULL COMMENT 'Název pracoviště (kopie)',
  `ciselna_rada_vpd` varchar(10) DEFAULT NULL COMMENT 'VPD prefix (kopie)',
  `ciselna_rada_ppd` varchar(10) DEFAULT NULL COMMENT 'PPD prefix (kopie)',
  `prevod_z_predchoziho` decimal(10,2) DEFAULT 0.00 COMMENT 'Převod z předchozího měsíce (Kč)',
  `pocatecni_stav` decimal(10,2) DEFAULT 0.00 COMMENT 'Počáteční stav (= převod z předchozího)',
  `koncovy_stav` decimal(10,2) DEFAULT 0.00 COMMENT 'Konečný stav měsíce (Kč)',
  `celkove_prijmy` decimal(10,2) DEFAULT 0.00 COMMENT 'Celkové příjmy za měsíc (Kč)',
  `celkove_vydaje` decimal(10,2) DEFAULT 0.00 COMMENT 'Celkové výdaje za měsíc (Kč)',
  `pocet_zaznamu` int(11) DEFAULT 0 COMMENT 'Počet záznamů v pokladní knize',
  `stav_knihy` enum('aktivni','uzavrena_uzivatelem','zamknuta_spravcem') DEFAULT 'aktivni' COMMENT 'Stav knihy: aktivni / uzavrena_uzivatelem / zamknuta_spravcem',
  `uzavrena_uzivatelem_kdy` datetime DEFAULT NULL COMMENT 'Kdy uživatel uzavřel měsíc',
  `zamknuta_spravcem_kdy` datetime DEFAULT NULL COMMENT 'Kdy správce zamknul knihu',
  `zamknuta_spravcem_kym` int(10) unsigned DEFAULT NULL COMMENT 'ID správce, který zamknul',
  `poznamky` text DEFAULT NULL COMMENT 'Poznámky k pokladní knize',
  `vytvoreno` datetime NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` datetime DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_uzivatel_pokladna_obdobi` (`uzivatel_id`,`pokladna_id`,`rok`,`mesic`),
  KEY `idx_prirazeni_id` (`prirazeni_id`),
  KEY `idx_pokladna_id` (`pokladna_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_rok_mesic` (`rok`,`mesic`),
  KEY `idx_stav_knihy` (`stav_knihy`),
  KEY `fk_knihy_spravce` (`zamknuta_spravcem_kym`),
  CONSTRAINT `fk_knihy_pokladna` FOREIGN KEY (`pokladna_id`) REFERENCES `25a_pokladny` (`id`),
  CONSTRAINT `fk_knihy_prirazeni` FOREIGN KEY (`prirazeni_id`) REFERENCES `25a_pokladny_uzivatele` (`id`),
  CONSTRAINT `fk_knihy_spravce` FOREIGN KEY (`zamknuta_spravcem_kym`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_knihy_uzivatel` FOREIGN KEY (`uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Pokladní knihy - hlavní záznamy (měsíční knihy)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_pokladni_polozky`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_pokladni_polozky` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pokladni_kniha_id` int(11) NOT NULL COMMENT 'ID pokladní knihy (FK)',
  `datum_zapisu` date NOT NULL COMMENT 'Datum zápisu',
  `cislo_dokladu` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci NOT NULL COMMENT 'Číslo dokladu (P001, V591-001, atd.)',
  `cislo_poradi_v_roce` int(11) NOT NULL COMMENT 'Pořadové číslo v rámci roku (1-999)',
  `typ_dokladu` enum('prijem','vydaj') CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci NOT NULL COMMENT 'Typ dokladu (příjem/výdaj)',
  `obsah_zapisu` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci NOT NULL COMMENT 'Obsah zápisu (popis operace)',
  `komu_od_koho` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Jméno osoby (komu/od koho)',
  `castka_prijem` decimal(10,2) DEFAULT NULL COMMENT 'Příjem (Kč)',
  `castka_vydaj` decimal(10,2) DEFAULT NULL COMMENT 'Výdaj (Kč)',
  `zustatek_po_operaci` decimal(10,2) NOT NULL COMMENT 'Zůstatek po této operaci (Kč)',
  `lp_kod` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Kód LP (limitované přísliby)',
  `lp_popis` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Popis LP kódu',
  `poznamka` text CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Poznámka k záznamu',
  `poradi_radku` int(11) NOT NULL DEFAULT 0 COMMENT 'Pořadí řádku (pro sorting)',
  `smazano` tinyint(1) DEFAULT 0 COMMENT 'Soft delete (0=aktivní, 1=smazaný)',
  `smazano_kdy` datetime DEFAULT NULL COMMENT 'Datum smazání',
  `smazano_kym` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele, který smazal',
  `vytvoreno` datetime NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` datetime DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  PRIMARY KEY (`id`),
  KEY `idx_pokladni_kniha_id` (`pokladni_kniha_id`),
  KEY `idx_datum_zapisu` (`datum_zapisu`),
  KEY `idx_typ_dokladu` (`typ_dokladu`),
  KEY `idx_smazano` (`smazano`),
  KEY `idx_poradi_radku` (`poradi_radku`),
  KEY `fk_polozky_vytvoril` (`vytvoril`),
  KEY `fk_polozky_smazal` (`smazano_kym`),
  CONSTRAINT `fk_polozky_kniha` FOREIGN KEY (`pokladni_kniha_id`) REFERENCES `25a_pokladni_knihy` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_polozky_smazal` FOREIGN KEY (`smazano_kym`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_polozky_vytvoril` FOREIGN KEY (`vytvoril`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_danish_ci COMMENT='Položky pokladní knihy (příjmy a výdaje)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_pokladny`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_pokladny` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cislo_pokladny` int(11) NOT NULL COMMENT 'Číslo pokladny (např. 100, 101, 102...)',
  `nazev` varchar(255) DEFAULT NULL COMMENT 'Název pokladny (např. "Sdílená pokladna IT")',
  `kod_pracoviste` varchar(50) DEFAULT NULL COMMENT 'Kód pracoviště (např. HK, PB, ME)',
  `nazev_pracoviste` varchar(255) DEFAULT NULL COMMENT 'Název pracoviště',
  `ciselna_rada_vpd` varchar(10) NOT NULL COMMENT 'Číselná řada VPD - výdaje (např. 591)',
  `vpd_od_cislo` int(11) DEFAULT 1 COMMENT 'Počáteční číslo VPD dokladu (výdaje od)',
  `ciselna_rada_ppd` varchar(10) NOT NULL COMMENT 'Číselná řada PPD - příjmy (např. 491)',
  `ppd_od_cislo` int(11) DEFAULT 1 COMMENT 'Počáteční číslo PPD dokladu (příjmy od)',
  `aktivni` tinyint(1) DEFAULT 1 COMMENT 'Aktivní pokladna (1=ano, 0=ne)',
  `poznamka` text DEFAULT NULL COMMENT 'Poznámka k pokladně',
  `vytvoreno` datetime NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` datetime DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cislo_pokladny` (`cislo_pokladny`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_kod_pracoviste` (`kod_pracoviste`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Definice pokladen (master data - VPD/PPD čísla, pracoviště)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `25a_pokladny_uzivatele`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25a_pokladny_uzivatele` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pokladna_id` int(11) NOT NULL COMMENT 'ID pokladny (FK)',
  `uzivatel_id` int(10) unsigned NOT NULL COMMENT 'ID uživatele (FK)',
  `je_hlavni` tinyint(1) DEFAULT 0 COMMENT 'Hlavní pokladna uživatele (1=ano, 0=ne)',
  `platne_od` date NOT NULL COMMENT 'Platnost přiřazení od',
  `platne_do` date DEFAULT NULL COMMENT 'Platnost do (NULL = aktivní)',
  `poznamka` text DEFAULT NULL COMMENT 'Poznámka (např. "Zástup za kolegu", "Sdílená pokladna")',
  `vytvoreno` datetime NOT NULL COMMENT 'Datum vytvoření přiřazení',
  `vytvoril` int(10) unsigned DEFAULT NULL COMMENT 'ID uživatele, který vytvořil přiřazení',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pokladna_uzivatel_obdobi` (`pokladna_id`,`uzivatel_id`,`platne_od`),
  KEY `idx_pokladna_id` (`pokladna_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_platne_od_do` (`platne_od`,`platne_do`),
  KEY `idx_je_hlavni` (`je_hlavni`),
  CONSTRAINT `fk_prirazeni_pokladna` FOREIGN KEY (`pokladna_id`) REFERENCES `25a_pokladny` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prirazeni_uzivatel` FOREIGN KEY (`uzivatel_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci COMMENT='Přiřazení uživatelů k pokladnám (many-to-many - podpora sdílených pokladen)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-12-05 20:26:47
