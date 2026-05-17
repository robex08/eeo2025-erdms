/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.6-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 10.3.172.11    Database: eeo2025
-- ------------------------------------------------------
-- Server version	11.8.6-MariaDB-0+deb13u1 from Debian

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
-- Table structure for table `25_prava`
--

DROP TABLE IF EXISTS `25_prava`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `25_prava` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kod_prava` varchar(50) NOT NULL COMMENT 'Kód pro kontrolu v aplikaci, např. CREATE_ORDER.',
  `popis` varchar(255) DEFAULT NULL,
  `aktivni` tinyint(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kod_prava` (`kod_prava`)
) ENGINE=InnoDB AUTO_INCREMENT=215 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Jednotlivá oprávnění v systému.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `25_prava`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `25_prava` WRITE;
/*!40000 ALTER TABLE `25_prava` DISABLE KEYS */;
INSERT INTO `25_prava` VALUES
(1,'ORDER_CREATE','Vytvořit novou objednávku',1),
(2,'ORDER_SAVE','Uložit rozpracovanou objednávku',1),
(3,'ORDER_READ_OWN','Zobrazit vlastní objednávky',1),
(4,'ORDER_READ_SUBORDINATE','Zobrazit objednávky podřízených',1),
(5,'ORDER_READ_ALL','Zobrazit všechny objednávky',1),
(6,'ORDER_EDIT_OWN','Upravit vlastní objednávku (před schválením)',1),
(7,'ORDER_EDIT_ALL','Upravit jakoukoliv objednávku (administrátorské právo)',1),
(8,'ORDER_DELETE_OWN','Smazat vlastní objednávku (před schválením)',1),
(9,'ORDER_DELETE_ALL','Smazat jakoukoliv objednávku (administrátorské právo)',1),
(10,'ORDER_APPROVE','Schválit nebo zamítnout objednávku',1),
(11,'ORDER_LOCK','Zamknout objednávku proti úpravám (po schválení)',1),
(12,'ORDER_UNLOCK','Odemknout zamčenou objednávku (administrátorské právo)',1),
(13,'USER_MANAGE','Spravovat uživatele, role a jejich zařazení',1),
(14,'SUPPLIER_MANAGE','Spravovat číselník dodavatelů',1),
(15,'SETTINGS_MANAGE','Správa globální konfigurace aplikace (parametry systému, integrace, bezpečnost)',1),
(16,'TEMPLATE_MANAGE','Spravovat šablony objednávek',1),
(20,'ORDER_EDIT_SUBORDINATE','Editace objednávky podřízených',1),
(21,'ORDER_MANAGE','Kompletní správa objednávek',1),
(22,'ORDER_2025','Správa objednávek pro rok 2025 a dál',1),
(23,'ORDER_OLD','Správa původních objednávek z EEO',1),
(24,'ORDER_IMPORT','Možnost importu ze starých objednávek do nového EEO 2025',1),
(25,'USER_SUBSTITUTE','Má právo být zástupem',1),
(26,'DICT_MANAGE','Může spravovat číselníky',1),
(27,'USER_DELETE','Oprávnění smazat uživatele s databáze',1),
(28,'INVOICE_MANAGE','Správa faktur - přidávání a úprava faktur k objednávkám',1),
(29,'INVOICE_ADD','Faktury - přidávání faktur k objednávkám',1),
(30,'INVOICE_EDIT','Faktury - editace faktur k objednávkám',1),
(31,'INVOICE_DELETE','Faktury - smazání faktur',1),
(32,'ORDER_COMPLETE','Dokončení objednávky - uzavření workflow',1),
(33,'ORDER_PUBLISH_REGISTRY','Zveřejnění objednávky v registru smluv',1),
(35,'CASH_BOOK_CREATE','Vytvoření nového záznamu ve vlastní pokladní knize',1),
(39,'CASH_BOOK_MANAGE','Kompletní správa všech pokladních knih (všechna práva)',1),
(40,'CASH_BOOK_READ_OWN','Zobrazení vlastní pokladní knihy',1),
(41,'CASH_BOOK_READ_ALL','Zobrazení všech pokladních knih',1),
(42,'CASH_BOOK_EDIT_OWN','Editace záznamů ve vlastní pokladní knize',1),
(43,'CASH_BOOK_EDIT_ALL','Editace záznamů ve všech pokladních knihách',1),
(44,'CASH_BOOK_DELETE_OWN','Smazání záznamů z vlastní pokladní knihy',1),
(45,'CASH_BOOK_DELETE_ALL','Smazání záznamů ze všech pokladních knih',1),
(46,'CASH_BOOK_EXPORT_OWN','Export vlastní pokladní knihy (CSV, PDF)',1),
(47,'CASH_BOOK_EXPORT_ALL','Export všech pokladních knih (CSV, PDF)',1),
(70,'HELPER_VIEW','Zobrazení kontextového pomocníka (avatar mince)',1),
(71,'HELPER_MANAGE','Správa nastavení kontextového pomocníka',1),
(75,'CONTRACT_VIEW','Zobrazení smluv v číselníkách',1),
(76,'CONTRACT_CREATE','Vytváření nových smluv',1),
(77,'CONTRACT_EDIT','Editace existujících smluv',1),
(78,'CONTRACT_DELETE','Mazání smluv',1),
(79,'CONTRACT_IMPORT','Hromadný import smluv z Excelu/CSV',1),
(80,'USER_VIEW','Zobrazení seznamu uživatelů (read-only)',1),
(81,'DICT_VIEW','Zobrazení číselníků (read-only)',1),
(82,'CASH_BOOK_VIEW','Zobrazení pokladní knihy (obecné právo)',1),
(83,'REPORT_VIEW','Zobrazení reportů',1),
(84,'REPORT_EXPORT','Export dat z reportů (CSV/PDF/Excel)',1),
(85,'REPORT_MANAGE','Správa reportů a vytváření vlastních šablon',1),
(86,'STATISTICS_VIEW','Zobrazení statistik a dashboardů',1),
(87,'STATISTICS_EXPORT','Export statistických dat a grafů',1),
(88,'STATISTICS_MANAGE','Správa statistik a vytváření dashboardů',1),
(89,'SETTINGS_VIEW','Zobrazení globální konfigurace aplikace (systémové nastavení)',1),
(90,'PHONEBOOK_VIEW','Přístup k telefonnímu a emailovému seznamu',1),
(91,'SUPPLIER_VIEW','Oprávnění k prohlížení dodavatelů (vlastní úsek + globální)',1),
(92,'SUPPLIER_EDIT','Editace dodavatelů',1),
(93,'HIERARCHY_IMMUNE','Imunní vůči hierarchii workflow - vidí všechna data bez ohledu na hierarchii',1),
(94,'INVOICE_VIEW','Faktury - prohlížení všech faktur (read-only)',1),
(95,'INVOICE_MATERIAL_CORRECTNESS','Faktury - věcná správnost (material correctness verification)',1),
(96,'MAINTENANCE_ADMIN','Přístup do systému během maintenance režimu',1),
(97,'ORDER_SHOW_ARCHIVE','Zobrazení checkboxu ARCHIV v seznamu objednávek',1),
(98,'LOCATIONS_VIEW','Zobrazení lokalit v číselníku (read-only)',1),
(99,'LOCATIONS_CREATE','Vytváření nových lokalit v číselníku',1),
(100,'LOCATIONS_EDIT','Editace existujících lokalit v číselníku',1),
(101,'LOCATIONS_DELETE','Mazání lokalit z číselníku',1),
(102,'POSITIONS_VIEW','Zobrazení pozic v číselníku (read-only)',1),
(103,'POSITIONS_CREATE','Vytváření nových pozic v číselníku',1),
(104,'POSITIONS_EDIT','Editace existujících pozic v číselníku',1),
(105,'POSITIONS_DELETE','Mazání pozic z číselníku',1),
(110,'ORGANIZATIONS_VIEW','Zobrazení organizací v číselníku (read-only)',1),
(111,'ORGANIZATIONS_CREATE','Vytváření nových organizací v číselníku',1),
(112,'ORGANIZATIONS_EDIT','Editace existujících organizací v číselníku',1),
(113,'ORGANIZATIONS_DELETE','Mazání organizací z číselníku',1),
(114,'DEPARTMENTS_VIEW','Zobrazení úseků v číselníku (read-only)',1),
(115,'DEPARTMENTS_CREATE','Vytváření nových úseků v číselníku',1),
(116,'DEPARTMENTS_EDIT','Editace existujících úseků v číselníku',1),
(117,'DEPARTMENTS_DELETE','Mazání úseků z číselníku',1),
(118,'STATES_VIEW','Zobrazení stavů v číselníku (read-only)',1),
(119,'STATES_CREATE','Vytváření nových stavů v číselníku',1),
(120,'STATES_EDIT','Editace existujících stavů v číselníku',1),
(121,'STATES_DELETE','Mazání stavů z číselníku',1),
(122,'ROLES_VIEW','Zobrazení rolí v číselníku (read-only)',1),
(123,'ROLES_CREATE','Vytváření nových rolí v číselníku',1),
(124,'ROLES_EDIT','Editace existujících rolí v číselníku',1),
(125,'ROLES_DELETE','Mazání rolí z číselníku',1),
(126,'PERMISSIONS_VIEW','Zobrazení práv v číselníku (read-only)',1),
(127,'PERMISSIONS_CREATE','Vytváření nových práv v číselníku',1),
(128,'PERMISSIONS_EDIT','Editace existujících práv v číselníku',1),
(129,'PERMISSIONS_DELETE','Mazání práv z číselníku',1),
(130,'DOCX_TEMPLATES_VIEW','Zobrazení DOCX šablon v číselníku (read-only)',1),
(131,'DOCX_TEMPLATES_CREATE','Vytváření nových DOCX šablon v číselníku',1),
(132,'DOCX_TEMPLATES_EDIT','Editace existujících DOCX šablon v číselníku',1),
(133,'DOCX_TEMPLATES_DELETE','Mazání DOCX šablon z číselníku',1),
(134,'CASH_BOOKS_VIEW','Zobrazení pokladních knih v číselníku (read-only)',1),
(135,'CASH_BOOKS_CREATE','Vytváření nových pokladních knih v číselníku',1),
(136,'CASH_BOOKS_EDIT','Editace pokladních knih v číselníku',1),
(137,'CASH_BOOKS_DELETE','Mazání pokladních knih z číselníku',1),
(138,'PHONEBOOK_CREATE','Vytváření nových kontaktů v adresáři',1),
(139,'PHONEBOOK_EDIT','Editace existujících kontaktů v adresáři',1),
(140,'PHONEBOOK_DELETE','Mazání kontaktů z adresáře',1),
(141,'SUPPLIER_CREATE','Oprávnění k vytváření nových dodavatelů',1),
(142,'SUPPLIER_DELETE','Oprávnění k mazání dodavatelů',1),
(143,'PHONEBOOK_MANAGE','Plný přístup k telefonnímu seznamu zaměstnanců (všechny operace)',1),
(144,'FILE_REGISTRY_MANAGE','Správa spisové služby / file registry (přístup k spisovka inbox)',1),
(145,'ANNUAL_FEES_MANAGE','Kompletní správa ročních poplatků (všechna práva)',1),
(146,'ANNUAL_FEES_CREATE','Vytváření nových ročních poplatků',1),
(147,'ANNUAL_FEES_VIEW','Zobrazení ročních poplatků (read-only)',1),
(148,'ANNUAL_FEES_EDIT','Editace existujících ročních poplatků',1),
(149,'ANNUAL_FEES_DELETE','Mazání ročních poplatků',1),
(150,'ANNUAL_FEES_ITEM_CREATE','Přidávání položek do ročních poplatků',1),
(151,'ANNUAL_FEES_ITEM_UPDATE','Editace položek ročních poplatků (změna stavu, částky)',1),
(152,'ANNUAL_FEES_ITEM_DELETE','Mazání položek ročních poplatků',1),
(153,'ANNUAL_FEES_ITEM_PAYMENT','Označování položek ročních poplatků jako zaplaceno/nezaplaceno',1),
(154,'BETA_TESTER','Přístup k BETA funkcím a testovacímu menu s novými moduly',1),
(155,'SPENDING_MANAGE','Kompletní správa čerpání (smlouvy + limitované přísliby)',1),
(156,'SPENDING_CONTRACT_VIEW_ALL','Zobrazení čerpání smluv - všechny záznamy',1),
(157,'SPENDING_CONTRACT_VIEW_OWN','Zobrazení čerpání smluv - vlastní záznamy',1),
(158,'SPENDING_LP_VIEW_ALL','Zobrazení čerpání limitovaných příslibů - všechny záznamy',1),
(159,'SPENDING_LP_VIEW_OWN','Zobrazení čerpání limitovaných příslibů - vlastní záznamy',1),
(160,'STICKY_MANAGE','Sticky NOTES – správa/užívání tabule',1),
(161,'FIN_CONTROL_VIEW','Statistika a reporty – Finanční kontrola – zobrazení',1),
(162,'FIN_CONTROL_EDIT','Statistika a reporty – Finanční kontrola – editace',1),
(163,'FIN_CONTROL_MANAGE','Statistika a reporty – Finanční kontrola – správa',1),
(164,'EDUCATION_VIEW','Statistika a reporty – Vzdělávání – zobrazení',1),
(165,'EDUCATION_EDIT','Statistika a reporty – Vzdělávání – editace',1),
(166,'EDUCATION_MANAGE','Statistika a reporty – Vzdělávání – správa',1),
(167,'ATTACHMENTS_VIEW','Statistika a reporty – Přílohy – zobrazení',1),
(168,'ATTACHMENTS_MANAGE','Statistika a reporty – Přílohy – správa',1),
(169,'PIVOT_VIEW','Statistika a reporty – Agregační tabulka – zobrazení',1),
(170,'PIVOT_EDIT','Statistika a reporty – Agregační tabulka – editace',1),
(171,'PIVOT_MANAGE','Statistika a reporty – Agregační tabulka – správa',1),
(172,'REPORT_EDIT','Statistika a reporty – Reporty – editace',1),
(173,'STATISTICS_EDIT','Statistika a reporty – Statistiky – editace',1),
(174,'ASSET_VIEW','Přehled majetku – zobrazení',1),
(175,'ASSET_MANAGE','Přehled majetku – správa',1),
(176,'ASSET_EXPORT','Přehled majetku – export',1),
(177,'CASHBOOK_REPORTS_VIEW','Statistika a reporty – Přehled pokladen – zobrazení',1),
(178,'CASHBOOK_REPORTS_MANAGE','Statistika a reporty – Přehled pokladen – správa',1),
(179,'CASHBOOK_REPORTS_EXPORT','Statistika a reporty – Přehled pokladen – export',1),
(180,'DASHBOARD_INVOICES_CONFIRM','Domovská stránka: Faktury k potvrzení (věcná správnost)',1),
(181,'DASHBOARD_ORDERS_APPROVE','Domovská stránka: Objednávky ke schválení',1),
(182,'DASHBOARD_INVOICES_OVERDUE','Domovská stránka: Faktury po splatnosti',1),
(183,'DASHBOARD_INVOICES_DUE_SOON','Domovská stránka: Faktury blížící se splatnosti',1),
(184,'DASHBOARD_INVOICES_STATS','Domovská stránka: Statistiky faktur',1),
(185,'DASHBOARD_ORDERS_REGISTRY','Domovská stránka: Objednávky ke zveřejnění (VZ)',1),
(186,'DASHBOARD_ORDERS_PUBLISHED','Domovská stránka: Zveřejněné objednávky',1),
(187,'DASHBOARD_SPENDING_CONTRACTS','Domovská stránka: Čerpání smluv - kritický stav',1),
(188,'DASHBOARD_SPENDING_LP','Domovská stránka: Limitované přísliby - kritický stav',1),
(189,'DASHBOARD_ORDERS_STATS','Domovská stránka: Statistiky objednávek',1),
(190,'DASHBOARD_CHART_TIMELINE','Domovská stránka: Graf objednávek v čase',1),
(191,'DASHBOARD_TOP_SUPPLIERS','Domovská stránka: Top dodavatelé',1),
(192,'DASHBOARD_ANNUAL_FEES','Domovská stránka: Roční poplatky - splatnost',1),
(193,'DASHBOARD_CHART_MAJETEK','Domovská stránka: Graf majetku podle druhu',1),
(194,'DASHBOARD_CHART_FEES','Domovská stránka: Graf rocnich poplatku podle druhu',1),
(195,'DASHBOARD_CASH_BOOK','Domovská stránka: Pokladna - přehled',1),
(196,'DASHBOARD_NOTIFICATIONS','Domovská stránka: Notifikace - poslední zprávy',1),
(197,'DASHBOARD_RSS_NEWS','Domovská stránka: RSS Zprávy',1),
(198,'DASHBOARD_ORDER_COMMENTS','Domovská stránka: Komentáře k objednávkám',1),
(199,'DASHBOARD_ALERTS','Domovská stránka: Upozornění',1),
(200,'DASHBOARD_MY_ORDERS','Domovská stránka: Moje objednávky',1),
(201,'DASHBOARD_WELCOME','Domovská stránka: Přehledová karta (základní info)',1),
(202,'DASHBOARD_WEATHER','Domovská stránka: Widget počasí',1),
(203,'DASHBOARD_CALENDAR','Domovská stránka: Widget kalendář',1),
(204,'DASHBOARD_FINANCE_MARKETS','Domovská stránka: Finanční trhy (krypto BTC/ETH + FX kurzy)',1),
(205,'USER_SUBSTITUTE_SET','Oprávnění nastavit vlastního zástupce po dobu nepřítomnosti',1),
(206,'DEFERRALS_VIEW','Zobrazení dohadných položek',1),
(207,'DEFERRALS_EDIT','Editace dohadných položek',1),
(208,'DEFERRALS_MANAGE','Správa dohadných položek',1),
(212,'DASHBOARD_ACTIVE_USERS','Domovská stránka: Dashboard aktivních uživatelů',1),
(213,'PLANNING_MANAGE','Správa plánování a rezervačního kalendáře',1),
(214,'EDUCATION_VIEW_ALL','Statistika a reporty – Vzdělávání – zobrazení všech úseků (neomezené)',1);
/*!40000 ALTER TABLE `25_prava` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-05-17 10:56:04
