-- ============================================================================
-- Import dat z 25_uzivatele do erdms_users - DÁVKOVÝ IMPORT
-- Zachování původních ID uživatelů (NUTNÉ)
-- ============================================================================
-- Rozděleno do menších dávek po 20 záznamech
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- Dávka 1: ID 0-20
INSERT INTO erdms_users (id, username, titul_pred, jmeno, prijmeni, titul_za, email, telefon, pozice_id, lokalita_id, organizace_id, usek_id, aktivni, dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita, entra_id, upn, auth_source, role, opravneni, password_hash, entra_sync_at) VALUES
(0, 'system', '', 'system', 'global', '', NULL, NULL, NULL, NULL, 1, 4, 0, '2025-10-04 11:27:30', '2025-10-04 11:27:30', NULL, NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(1, 'admin', 'IT', 'RH', 'ADMIN', NULL, 'robert.holovsky@zachranka.cz', '731137100', 68, 1, 1, 4, 1, '2025-09-27 12:15:06', '2025-11-20 21:39:54', '2025-12-01 23:41:29', NULL, NULL, 'database', 'admin', NULL, NULL, NULL),
(2, 'nologin_lp', NULL, 'Leoš', 'Procházka', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2016-07-26 15:37:21', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(3, 'nologin_novakova', NULL, 'Michaela', 'Nováková', NULL, 'michaela.novakova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2025-10-10 13:16:35', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(4, 'nologin_pellichova', NULL, 'Jitka', 'Pellichová', NULL, 'jitka.pellichova@zachranka.cz', '', NULL, 40, 1, 6, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2024-12-03 07:41:07', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(5, 'nologin_163', NULL, 'Robert', 'Holovský', NULL, 'r.holovsky@zachranka.cz', '777007763', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2024-09-09 15:23:27', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(6, 'nologin_frolikova', NULL, 'Zuzana', 'Frolíková', NULL, 'zuzana.frolikova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', NULL, NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(7, 'nologin_chochola', NULL, 'Roman', 'Chochola', NULL, 'roman.chochola@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2023-03-31 12:44:57', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(8, 'nologin_2399', NULL, 'Patrik', 'Merhaut', NULL, '', '', NULL, 40, 1, 8, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2009-06-24 15:52:11', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(10, 'nologin_1985', NULL, 'Věra', 'Zemanová', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2009-06-24 15:52:11', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(11, 'nologin_9838', NULL, 'Petr', 'Mach', NULL, 'petr.mach@zachranka.cz', '', NULL, 40, 1, 6, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2025-09-19 10:30:31', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(12, 'nologin_2700', NULL, 'Pavel', 'Zahradníček', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2009-06-24 15:52:11', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(13, 'u00288', 'Bc.', 'Dana', 'Jirsová', NULL, 'dana.jirsova@zachranka.cz', '607675334', 55, 1, 1, 6, 1, '2025-10-18 21:09:41', '2025-11-25 07:26:17', '2025-10-15 13:01:27', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(14, 'nologin_1885', NULL, 'Jiří', 'Knor', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2009-06-24 15:52:11', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(15, 'nologin_3730', NULL, 'Šárka', 'Kehlová', NULL, 'sarka.kehlova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2018-10-17 07:50:22', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(16, 'nologin_rouckova', NULL, 'Olina', 'Roučková', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2016-08-09 13:16:41', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(17, 'nologin_blazkova', NULL, 'Anna', 'Blažková Kozlíková', NULL, 'blazkova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2021-02-11 11:21:34', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(18, 'nologin_thp_r', NULL, 'Robert', 'Holovský (THP Tester)', NULL, 'r.holovsky@zachranka.cz', '777007763', NULL, 40, 1, 6, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2019-09-17 11:02:59', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(19, 'nologin_2604', NULL, 'Soňa', 'Štursová', NULL, '', '', 1, 1, 1, 6, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2025-10-16 10:42:16', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(20, 'nologin_1480', NULL, 'Marie', 'Hanibalová Šimáková', NULL, 'tereza.balousova@zachranka.cz', '123123123', NULL, 1, 1, 6, 0, '2025-10-18 21:09:41', '2025-11-10 14:15:15', '2025-10-16 10:18:06', NULL, NULL, 'database', 'user', NULL, NULL, NULL);

-- Dávka 2: ID 21-40
INSERT INTO erdms_users (id, username, titul_pred, jmeno, prijmeni, titul_za, email, telefon, pozice_id, lokalita_id, organizace_id, usek_id, aktivni, dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita, entra_id, upn, auth_source, role, opravneni, password_hash, entra_sync_at) VALUES
(21, 'nologin_182', NULL, 'Olga', 'Roučková', NULL, '', '', 1, 1, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2017-04-07 11:10:51', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(22, 'nologin_7482', NULL, 'Miroslava', 'Němcová', NULL, '', '', 1, 1, 1, 6, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2025-10-16 12:41:47', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(23, 'u01241', NULL, 'Iva', 'Švehlová', NULL, 'iva.svehlova@zachranka.cz', '731137105', 60, 20, 1, 6, 1, '2025-10-18 21:09:41', '2025-11-25 08:48:18', '2025-10-10 13:18:12', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(24, 'nologin_8200', NULL, 'Jakub', 'Holeňa', NULL, '', '', 1, 1, 1, 6, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2025-10-09 08:02:13', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(25, 'nologin_399', NULL, 'Ivana', 'Plíšková', NULL, 'ivana.pliskova@zachranka.cz', '731137076', 60, 30, 1, 6, 0, '2025-10-18 21:09:41', '2025-11-25 08:53:10', '2025-09-24 11:01:51', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(27, 'u00836', NULL, 'Jitka', 'Indrová', NULL, 'jitka.indrova@zachranka.cz', '731124487', 60, 40, 1, 6, 1, '2025-10-18 21:09:41', '2025-11-25 07:31:17', '2025-10-17 14:06:07', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(28, 'u00883', NULL, 'Jiří', 'Hájek', NULL, 'jiri.hajek@zachranka.cz', '731137152', 60, 11, 1, 6, 1, '2025-10-18 21:09:41', '2025-11-25 07:31:28', '2025-11-26 07:53:44', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(29, 'nologin_77', NULL, 'Tomáš', 'Čech', NULL, '', '', 1, 1, 1, 6, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2025-10-13 18:46:07', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(31, 'nologin_2747', NULL, 'Eva', 'Durasová', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2018-05-23 05:16:00', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(32, 'nologin_2517', NULL, 'Jakub', 'Vachek', NULL, 'jakub.vachek@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2016-08-09 10:59:44', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(33, 'nologin_156', NULL, 'Pavel', 'Tlustý', NULL, '', '', NULL, 40, 1, 10, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2024-12-03 08:10:36', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(34, 'nologin_912', NULL, 'Peter', 'Matej', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2016-07-27 09:47:19', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(35, 'nologin_7396', NULL, 'Zuzana', 'Ekrtová', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2020-08-24 13:43:15', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(36, 'u05510', NULL, 'Lenka', 'Škarvadová', NULL, 'lenka.skarvadova@zachranka.cz', '604206234', 72, 16, 1, 7, 1, '2025-10-18 21:09:42', '2025-11-25 08:54:39', '2025-10-17 11:52:44', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(37, 'nologin_5157', NULL, 'Veronika', 'Aulická', NULL, '', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2025-09-29 11:14:20', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(38, 'nologin_2298', NULL, 'Hana', 'Kubešková', NULL, '', '', NULL, 40, 1, 8, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2021-11-15 13:51:16', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(39, 'nologin_2027', NULL, 'Barbora', 'Zemanová', NULL, '', '', NULL, 40, 1, 8, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2017-03-02 13:31:47', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(40, 'nologin_2651', NULL, 'Marie', 'Tůmová', NULL, '', '', NULL, 40, 1, 8, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2022-04-13 08:31:19', NULL, NULL, 'database', 'user', NULL, NULL, NULL);

-- Pokračuje dávka 3: ID 41-60
INSERT INTO erdms_users (id, username, titul_pred, jmeno, prijmeni, titul_za, email, telefon, pozice_id, lokalita_id, organizace_id, usek_id, aktivni, dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita, entra_id, upn, auth_source, role, opravneni, password_hash, entra_sync_at) VALUES
(41, 'nologin_fricova', NULL, 'Lucie', 'Dudáková', NULL, 'lucie.fricova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2024-01-17 19:09:14', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(42, 'nologin_majetek', NULL, 'Robert', 'Holovský (vyřazení)', NULL, 'robert.holovsky@zachranka.cz', '777007763', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2019-09-27 10:03:13', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(43, 'nologin_251', NULL, 'Štěpánka', 'Kachlířová', NULL, '', '', NULL, 40, 1, 3, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2025-10-16 14:47:16', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(44, 'u08184', NULL, 'Nikola', 'Konopásková', NULL, 'nikola.konopaskova@zachranka.cz', '+420123456789', 17, 1, 1, 10, 1, '2025-10-18 21:09:42', '2025-11-20 14:16:03', '2025-10-16 15:22:30', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(45, 'nologin_brozova', NULL, 'Hana', 'Brožová', NULL, 'hana.brozova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2024-05-22 12:11:22', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(47, 'u08240', 'Ing.', 'Tereza', 'Balousová', NULL, 'tereza.balousova@zachranka.cz', '123123123', 5, 1, 1, 1, 1, '2025-10-18 21:09:42', '2025-11-20 22:37:26', '2025-12-01 15:04:02', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(48, 'nologin_matousek', NULL, 'Michal', 'Matoušek', NULL, 'michal.matousek@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2023-07-11 11:14:53', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(49, 'nologin_08269', NULL, 'Jan', 'Roth', NULL, '', '', NULL, 40, 1, 5, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2022-02-15 09:20:28', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(50, 'nologin_08282', NULL, 'Anna', 'Brožová', NULL, 'anna.brozova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2024-11-17 23:51:34', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(51, 'u09343', 'Ing.', 'Jindřich', 'Fajka', NULL, 'jindrich.fajka@zachranka.cz', '736131215', 6, 1, 1, 6, 1, '2025-10-18 21:09:42', '2025-11-20 22:27:59', '2025-11-03 17:35:49', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(52, 'u09605', 'Bc.', 'Hana', 'Jonášová', NULL, 'hana.jonasova@zachranka.cz', '731137164', 70, 1, 1, 4, 1, '2025-10-18 21:09:42', '2025-11-20 21:38:05', '2025-11-27 13:57:44', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(53, 'nologin_6818', NULL, 'Štěpánka', 'Kubíčková', NULL, '', '', 1, 1, 1, 6, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2025-09-26 09:24:18', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(54, 'nologin_5628', NULL, 'Petr', 'Kolínský', NULL, '', '', 1, 1, 1, 6, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2025-10-15 19:11:15', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(55, 'nologin_2039', NULL, 'Jitka', 'Pellichová', NULL, 'jitka.pellichova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2023-08-16 16:43:21', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(56, 'nologin_09636', NULL, 'Jiří', 'Havel', NULL, 'jiri.havel@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2023-10-03 09:25:51', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(57, 'u09641', 'Mgr. Bc.', 'Ján', 'Čižmárik', 'MPH.', 'jan.cizmarik@zachrnaka.cz', '725567579', 35, 1, 1, 8, 1, '2025-10-18 21:09:42', '2025-11-20 22:35:26', '2025-08-13 14:57:28', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(58, 'nologin_3231', NULL, 'Patricia', 'Sedláčková', NULL, '', '', NULL, 40, 1, 8, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2023-11-27 15:05:37', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(59, 'nologin_9657', NULL, 'Zuzana', 'Kubáňová', NULL, 'zuzana.kubanova@zachranka.cz', '', NULL, 40, 1, 1, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2025-01-21 12:34:52', NULL, NULL, 'database', 'user', NULL, NULL, NULL),
(60, 'nologin_9660', NULL, 'Pavlína', 'Stinková', NULL, 'pavlina.stinkova@zachranka.cz', '', NULL, 40, 1, 6, 0, '2025-10-18 21:09:42', '2025-10-18 21:09:42', '2025-10-14 10:34:53', NULL, NULL, 'database', 'user', NULL, NULL, NULL);
