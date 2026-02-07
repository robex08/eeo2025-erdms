/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.3-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 10.3.172.11    Database: eeo2025-dev
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
-- Dumping data for table `25_uzivatele_role`
--

LOCK TABLES `25_uzivatele_role` WRITE;
/*!40000 ALTER TABLE `25_uzivatele_role` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `25_uzivatele_role` (`uzivatel_id`, `role_id`) VALUES (1,1),
(102,2),
(47,3),
(90,4),
(99,4),
(1,5),
(3,5),
(33,5),
(44,5),
(47,5),
(51,5),
(57,5),
(62,5),
(63,5),
(64,5),
(65,5),
(67,5),
(68,5),
(75,5),
(79,5),
(85,5),
(95,5),
(101,5),
(102,5),
(104,5),
(113,5),
(70,6),
(69,7),
(71,7),
(78,7),
(83,7),
(86,7),
(102,7),
(112,7),
(79,8),
(82,8),
(102,8),
(13,9),
(19,9),
(20,9),
(23,9),
(24,9),
(25,9),
(27,9),
(28,9),
(29,9),
(36,9),
(40,9),
(43,9),
(52,9),
(53,9),
(69,9),
(75,9),
(76,9),
(77,9),
(86,9),
(87,9),
(91,9),
(98,9),
(100,9),
(102,9),
(103,9),
(104,9),
(105,9),
(106,9),
(107,9),
(111,9),
(135,9),
(24,10),
(25,10),
(54,10),
(102,10),
(114,10),
(117,10),
(119,10),
(121,10),
(123,10),
(125,10),
(128,10),
(129,10),
(131,10),
(133,10),
(66,11),
(110,11),
(115,11),
(116,11),
(118,11),
(120,11),
(122,11),
(124,11),
(126,11),
(127,11),
(130,11),
(132,11),
(134,11),
(40,12),
(43,12),
(77,12),
(33,14),
(44,14),
(57,14),
(67,14),
(75,14),
(76,14),
(85,14),
(92,14),
(102,14),
(113,14),
(64,15),
(47,16),
(51,16),
(62,16),
(63,16);
/*!40000 ALTER TABLE `25_uzivatele_role` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-01-05  0:05:25
