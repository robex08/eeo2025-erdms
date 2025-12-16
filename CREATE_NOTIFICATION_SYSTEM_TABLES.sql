-- ============================================
-- NOTIFICATION SYSTEM - COMPLETE DATABASE SCHEMA
-- Datum: 2025-12-16
-- Popis: Kompletní schéma pro centrální notifikační systém
-- Všechny názvy v češtině podle konvence 25_*
-- ============================================

-- ============================================
-- TABULKA 1: 25_notifikace_typy_udalosti
-- Katalog všech typů událostí (EVENT_TYPES)
-- ============================================

CREATE TABLE IF NOT EXISTS `25_notifikace_typy_udalosti` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `kod` VARCHAR(100) NOT NULL COMMENT 'Unikátní kód události (ORDER_CREATED, INVOICE_DUE_SOON, ...)',
  `nazev` VARCHAR(255) NOT NULL COMMENT 'Lidsky čitelný název',
  `kategorie` VARCHAR(50) NOT NULL COMMENT 'orders, invoices, contracts, cashbook',
  `popis` TEXT NULL COMMENT 'Detailní popis události',
  `uroven_nahlhavosti` ENUM('NORMAL', 'URGENT', 'EXCEPTIONAL') DEFAULT 'NORMAL' COMMENT 'Úroveň priority/naléhavosti',
  `role_prijemcu` TEXT NULL COMMENT 'JSON pole možných recipient roles [EXCEPTIONAL, APPROVAL, INFO]',
  `vychozi_kanaly` TEXT NULL COMMENT 'JSON pole výchozích kanálů [email, inapp, sms, push]',
  `modul` VARCHAR(50) NULL COMMENT 'Příslušnost k modulu systému',
  `aktivni` TINYINT(1) DEFAULT 1 COMMENT 'Zda je událost aktivní',
  `dt_vytvoreno` DATETIME DEFAULT NULL COMMENT 'Datum vytvoření záznamu',
  `dt_upraveno` DATETIME DEFAULT NULL COMMENT 'Datum poslední úpravy',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kod` (`kod`),
  KEY `idx_kategorie` (`kategorie`),
  KEY `idx_modul` (`modul`),
  KEY `idx_aktivni` (`aktivni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Katalog typů notifikačních událostí';

-- ============================================
-- TABULKA 2: 25_notifikace_fronta
-- Fronta pro odložené/plánované odesílání notifikací
-- ============================================

CREATE TABLE IF NOT EXISTS `25_notifikace_fronta` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `typ_udalosti_kod` VARCHAR(100) NOT NULL COMMENT 'EVENT_TYPE code z tabulky 25_notifikace_typy_udalosti',
  `notifikace_id` BIGINT(20) UNSIGNED NULL COMMENT 'FK na 25_notifications (po vytvoření notifikace)',
  `stav` ENUM('CEKA', 'ZPRACOVAVA_SE', 'ODESLANO', 'CHYBA', 'ZRUSENO') DEFAULT 'CEKA' COMMENT 'Stav zpracování',
  `priorita` TINYINT(1) DEFAULT 5 COMMENT '1=nejvyšší, 10=nejnižší',
  `pokus_cislo` TINYINT(1) DEFAULT 0 COMMENT 'Počet pokusů o odeslání',
  `max_pokusu` TINYINT(1) DEFAULT 3 COMMENT 'Maximální počet pokusů',
  
  -- Příjemci
  `prijemce_user_id` INT(11) NULL COMMENT 'Cílový uživatel',
  `prijemce_role` VARCHAR(50) NULL COMMENT 'EXCEPTIONAL, APPROVAL, INFO',
  
  -- Kanály
  `odeslat_email` TINYINT(1) DEFAULT 0,
  `odeslat_inapp` TINYINT(1) DEFAULT 1,
  `odeslat_sms` TINYINT(1) DEFAULT 0,
  `odeslat_push` TINYINT(1) DEFAULT 0,
  
  -- Data pro zpracování
  `sablona_id` INT(11) NULL COMMENT 'FK na 25_notification_templates',
  `sablona_varianta` VARCHAR(50) NULL COMMENT 'RECIPIENT, SUBMITTER, urgentVariant, ...',
  `placeholder_data` TEXT NULL COMMENT 'JSON s daty pro placeholdery',
  `objekt_typ` VARCHAR(32) NULL COMMENT 'orders, invoices, contracts, ...',
  `objekt_id` BIGINT(20) NULL COMMENT 'ID souvisejícího objektu',
  `trigger_user_id` INT(11) NULL COMMENT 'Kdo akci provedl',
  
  -- Časování
  `dt_vytvoreno` DATETIME NOT NULL COMMENT 'Kdy byla položka přidána do fronty',
  `dt_planovano` DATETIME NULL COMMENT 'Kdy má být odeslána (NULL = hned)',
  `dt_zpracovano` DATETIME NULL COMMENT 'Kdy byla zpracována',
  `dt_odeslano` DATETIME NULL COMMENT 'Kdy byla skutečně odeslána',
  
  -- Chyby
  `chyba_zprava` TEXT NULL COMMENT 'Chybová hláška při selhání',
  `chyba_log` TEXT NULL COMMENT 'Detailní log chyby',
  
  PRIMARY KEY (`id`),
  KEY `idx_stav` (`stav`),
  KEY `idx_priorita` (`priorita`),
  KEY `idx_prijemce` (`prijemce_user_id`),
  KEY `idx_dt_planovano` (`dt_planovano`),
  KEY `idx_typ_udalosti` (`typ_udalosti_kod`),
  KEY `idx_notifikace` (`notifikace_id`),
  KEY `idx_objekt` (`objekt_typ`, `objekt_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Fronta pro plánované odesílání notifikací';

-- ============================================
-- TABULKA 3: 25_notifikace_audit
-- Audit log všech odeslaných notifikací
-- ============================================

CREATE TABLE IF NOT EXISTS `25_notifikace_audit` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `notifikace_id` BIGINT(20) UNSIGNED NULL COMMENT 'FK na 25_notifications',
  `fronta_id` BIGINT(20) UNSIGNED NULL COMMENT 'FK na 25_notifikace_fronta',
  `typ_udalosti_kod` VARCHAR(100) NOT NULL COMMENT 'EVENT_TYPE code',
  
  -- Příjemce
  `prijemce_user_id` INT(11) NOT NULL COMMENT 'Kdo dostal notifikaci',
  `prijemce_email` VARCHAR(255) NULL COMMENT 'Email příjemce (v době odeslání)',
  `prijemce_jmeno` VARCHAR(255) NULL COMMENT 'Jméno příjemce (v době odeslání)',
  
  -- Odesílatel
  `odesilatel_user_id` INT(11) NULL COMMENT 'Kdo akci provedl',
  `odesilatel_jmeno` VARCHAR(255) NULL COMMENT 'Jméno odesílatele',
  
  -- Kanály - co bylo odesláno
  `kanal_email` TINYINT(1) DEFAULT 0 COMMENT 'Byl odeslán email?',
  `kanal_inapp` TINYINT(1) DEFAULT 0 COMMENT 'Byla vytvořena in-app notifikace?',
  `kanal_sms` TINYINT(1) DEFAULT 0 COMMENT 'Bylo odesláno SMS?',
  `kanal_push` TINYINT(1) DEFAULT 0 COMMENT 'Byla odeslána push notifikace?',
  
  -- Status doručení
  `email_doruceno` TINYINT(1) NULL COMMENT 'NULL=neznámo, 0=nedoručeno, 1=doručeno',
  `email_otevren` TINYINT(1) NULL COMMENT 'Byl email otevřen?',
  `email_kliknuto` TINYINT(1) NULL COMMENT 'Byl kliknut link v emailu?',
  `inapp_precteno` TINYINT(1) NULL COMMENT 'Byla in-app notifikace přečtena?',
  `sms_doruceno` TINYINT(1) NULL COMMENT 'Bylo SMS doručeno?',
  
  -- Metadata
  `sablona_id` INT(11) NULL COMMENT 'Použitá šablona',
  `sablona_typ` VARCHAR(100) NULL COMMENT 'Typ šablony (order_status_schvalena, ...)',
  `sablona_varianta` VARCHAR(50) NULL COMMENT 'Použitá varianta (RECIPIENT, SUBMITTER, ...)',
  `priorita` VARCHAR(50) NULL COMMENT 'EXCEPTIONAL, APPROVAL, INFO',
  
  -- Kontext
  `objekt_typ` VARCHAR(32) NULL COMMENT 'orders, invoices, contracts, ...',
  `objekt_id` BIGINT(20) NULL COMMENT 'ID souvisejícího objektu',
  `objekt_cislo` VARCHAR(100) NULL COMMENT 'Číslo obj/faktury pro snadné vyhledávání',
  
  -- Časování
  `dt_vytvoreno` DATETIME NOT NULL COMMENT 'Kdy byl záznam vytvořen',
  `dt_email_odesl` DATETIME NULL COMMENT 'Kdy byl email odeslán',
  `dt_email_doruc` DATETIME NULL COMMENT 'Kdy byl email doručen',
  `dt_email_otevren` DATETIME NULL COMMENT 'Kdy byl email otevřen',
  `dt_inapp_precteno` DATETIME NULL COMMENT 'Kdy byla in-app notif přečtena',
  
  -- Diagnostika
  `user_agent` VARCHAR(500) NULL COMMENT 'User agent prohlížeče/klienta',
  `ip_adresa` VARCHAR(45) NULL COMMENT 'IP adresa příjemce',
  `chyba_log` TEXT NULL COMMENT 'Chyby při odesílání',
  
  PRIMARY KEY (`id`),
  KEY `idx_notifikace` (`notifikace_id`),
  KEY `idx_fronta` (`fronta_id`),
  KEY `idx_prijemce` (`prijemce_user_id`),
  KEY `idx_odesilatel` (`odesilatel_user_id`),
  KEY `idx_typ_udalosti` (`typ_udalosti_kod`),
  KEY `idx_objekt` (`objekt_typ`, `objekt_id`),
  KEY `idx_dt_vytvoreno` (`dt_vytvoreno`),
  KEY `idx_email_doruceno` (`email_doruceno`),
  KEY `idx_inapp_precteno` (`inapp_precteno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Audit log odeslaných notifikací';

-- ============================================
-- TABULKA 4: 25_notifikace_uzivatele_nastaveni
-- Uživatelská nastavení pro notifikace (preferences)
-- ============================================

CREATE TABLE IF NOT EXISTS `25_notifikace_uzivatele_nastaveni` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uzivatel_id` INT(11) NOT NULL COMMENT 'FK na 25_uzivatele',
  
  -- Globální nastavení
  `povoleno` TINYINT(1) DEFAULT 1 COMMENT 'Globální vypínač notifikací',
  `email_povoleno` TINYINT(1) DEFAULT 1 COMMENT 'Povolit email notifikace',
  `inapp_povoleno` TINYINT(1) DEFAULT 1 COMMENT 'Povolit in-app notifikace',
  `sms_povoleno` TINYINT(1) DEFAULT 0 COMMENT 'Povolit SMS notifikace',
  `push_povoleno` TINYINT(1) DEFAULT 0 COMMENT 'Povolit push notifikace',
  
  -- Kategorie modulů (JSON)
  `kategorie_objednavky` TINYINT(1) DEFAULT 1 COMMENT 'Notifikace z modulu objednávky',
  `kategorie_faktury` TINYINT(1) DEFAULT 1 COMMENT 'Notifikace z modulu faktury',
  `kategorie_smlouvy` TINYINT(1) DEFAULT 1 COMMENT 'Notifikace z modulu smlouvy',
  `kategorie_pokladna` TINYINT(1) DEFAULT 1 COMMENT 'Notifikace z modulu pokladna',
  
  -- Časové filtry
  `tiche_hodiny_od` TIME NULL COMMENT 'Začátek tichých hodin (např. 22:00)',
  `tiche_hodiny_do` TIME NULL COMMENT 'Konec tichých hodin (např. 07:00)',
  `vikend_povoleno` TINYINT(1) DEFAULT 1 COMMENT 'Odesílat i o víkendu?',
  
  -- Agregace
  `denni_souhrn` TINYINT(1) DEFAULT 0 COMMENT 'Posílat denní souhrn místo jednotlivých?',
  `denni_souhrn_cas` TIME DEFAULT '08:00:00' COMMENT 'Kdy poslat denní souhrn',
  
  -- Pokročilá nastavení (JSON)
  `pokrocile_json` TEXT NULL COMMENT 'JSON pro specifické typy událostí, role, atd.',
  
  -- Metadata
  `dt_vytvoreno` DATETIME DEFAULT NULL,
  `dt_upraveno` DATETIME DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_uzivatel` (`uzivatel_id`),
  KEY `idx_povoleno` (`povoleno`),
  KEY `idx_email` (`email_povoleno`),
  KEY `idx_inapp` (`inapp_povoleno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci COMMENT='Uživatelská nastavení notifikací';

-- ============================================
-- INITIAL DATA - Vložení EVENT_TYPES
-- ============================================

INSERT INTO `25_notifikace_typy_udalosti` 
  (`kod`, `nazev`, `kategorie`, `popis`, `uroven_nahlhavosti`, `role_prijemcu`, `vychozi_kanaly`, `modul`, `aktivni`, `dt_vytvoreno`)
VALUES
  -- OBJEDNÁVKY - Workflow
  ('ORDER_CREATED', 'Objednávka vytvořena', 'orders', 'Robert vytvoří objednávku → notifikace příkazci ke schválení', 'EXCEPTIONAL', '["EXCEPTIONAL","APPROVAL","INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  ('ORDER_APPROVED', 'Objednávka schválena', 'orders', 'Příkazce schválil → notifikace Robertovi, že může pokračovat', 'NORMAL', '["APPROVAL","INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  ('ORDER_REJECTED', 'Objednávka zamítnuta', 'orders', 'Příkazce zamítl → proces končí', 'EXCEPTIONAL', '["EXCEPTIONAL","INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  ('ORDER_WAITING_FOR_CHANGES', 'Objednávka vrácena k doplnění', 'orders', 'Příkazce vrátil → Robert doplní a znovu odešle', 'NORMAL', '["APPROVAL","INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  ('ORDER_SENT_TO_SUPPLIER', 'Objednávka odeslána dodavateli', 'orders', 'Robert odeslal dodavateli → notifikace nákupčímu a ostatním', 'NORMAL', '["APPROVAL","INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  ('ORDER_REGISTRY_APPROVAL_REQUESTED', 'Žádost o schválení v registru', 'orders', 'Robert žádá o registr → notifikace registru (role/úsek)', 'EXCEPTIONAL', '["EXCEPTIONAL","INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  ('ORDER_INVOICE_ADDED', 'Faktura doplněna', 'orders', 'Registr doplnil fakturu → Robert musí provést věcnou kontrolu', 'NORMAL', '["APPROVAL","INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  ('ORDER_MATERIAL_CHECK_COMPLETED', 'Věcná kontrola provedena', 'orders', 'Robert provedl kontrolu → registr může dokončit', 'NORMAL', '["APPROVAL","INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  ('ORDER_COMPLETED', 'Objednávka dokončena', 'orders', 'Registr dokončil → notifikace všem zúčastněným', 'NORMAL', '["INFO"]', '["email","inapp"]', 'orders', 1, NOW()),
  
  -- FAKTURY
  ('INVOICE_CREATED', 'Faktura vytvořena', 'invoices', 'Nová faktura byla vytvořena v systému', 'NORMAL', '["APPROVAL","INFO"]', '["email","inapp"]', 'invoices', 1, NOW()),
  ('INVOICE_DUE_SOON', 'Faktura brzy po splatnosti', 'invoices', 'Faktura se blíží ke dni splatnosti', 'EXCEPTIONAL', '["EXCEPTIONAL","INFO"]', '["email","inapp","sms"]', 'invoices', 1, NOW()),
  ('INVOICE_OVERDUE', 'Faktura po splatnosti', 'invoices', 'Faktura je po splatnosti', 'EXCEPTIONAL', '["EXCEPTIONAL"]', '["email","inapp","sms"]', 'invoices', 1, NOW()),
  
  -- SMLOUVY
  ('CONTRACT_EXPIRING', 'Smlouva brzy vyprší', 'contracts', 'Smlouva se blíží ke konci platnosti', 'EXCEPTIONAL', '["EXCEPTIONAL","INFO"]', '["email","inapp"]', 'contracts', 1, NOW()),
  
  -- POKLADNA
  ('CASHBOOK_LOW_BALANCE', 'Nízký zůstatek v pokladně', 'cashbook', 'Zůstatek v pokladně je pod minimální hranicí', 'EXCEPTIONAL', '["EXCEPTIONAL","INFO"]', '["email","inapp"]', 'cashbook', 1, NOW());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Ověření vytvoření tabulek
SELECT 
  TABLE_NAME as 'Tabulka',
  TABLE_ROWS as 'Počet řádků',
  CREATE_TIME as 'Vytvořeno'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'eeo2025' 
  AND TABLE_NAME LIKE '25_notifikace_%'
ORDER BY TABLE_NAME;

-- Ověření EVENT_TYPES
SELECT COUNT(*) as 'Počet událostí', kategorie 
FROM 25_notifikace_typy_udalosti 
GROUP BY kategorie;

-- Celkový přehled
SELECT 
  'Typy událostí' as 'Tabulka', 
  COUNT(*) as 'Počet záznamů' 
FROM 25_notifikace_typy_udalosti
UNION ALL
SELECT 
  'Fronta', 
  COUNT(*) 
FROM 25_notifikace_fronta
UNION ALL
SELECT 
  'Audit log', 
  COUNT(*) 
FROM 25_notifikace_audit
UNION ALL
SELECT 
  'Uživatelská nastavení', 
  COUNT(*) 
FROM 25_notifikace_uzivatele_nastaveni;
