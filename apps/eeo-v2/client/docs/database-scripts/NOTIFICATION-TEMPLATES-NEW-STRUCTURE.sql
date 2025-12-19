-- =====================================================================
-- NOVÁ STRUKTURA NOTIFIKAČNÍCH TEMPLATES
-- Datum: 29.10.2025
-- Účel: Rozšíření notification templates o detailní placeholdery
-- POŽADAVKY: PHP 5.6, MySQL 5.5.43
-- =====================================================================

-- =====================================================================
-- 1. DROP STARÝCH TABULEK (ZÁLOHA)
-- =====================================================================

-- Záloha starých dat před změnami
CREATE TABLE IF NOT EXISTS `25_notification_templates_backup_20251029` 
SELECT * FROM `25_notification_templates`;

-- =====================================================================
-- 2. NOVÁ STRUKTURA TABULKY
-- =====================================================================

DROP TABLE IF EXISTS `25_notification_templates`;

CREATE TABLE `25_notification_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(100) NOT NULL COMMENT 'Typ notifikace (enum z NOTIFICATION_TYPES)',
  `name` varchar(255) NOT NULL COMMENT 'Název templatu pro admin',
  
  -- EMAIL NOTIFIKACE
  `email_subject` varchar(500) DEFAULT NULL COMMENT 'Předmět emailu (placeholdery)',
  `email_body` text DEFAULT NULL COMMENT 'Tělo emailu (placeholdery, HTML možné)',
  `send_email_default` tinyint(1) DEFAULT 0 COMMENT 'Výchozí: poslat email? (0=ne, 1=ano)',
  
  -- APP NOTIFIKACE (zvoneček)
  `app_title` varchar(255) NOT NULL COMMENT 'Titulek v aplikaci (placeholdery)',
  `app_message` text NOT NULL COMMENT 'Zpráva v aplikaci (placeholdery)',
  
  -- PRIORITA A AKTIVNOST
  `priority_default` enum('low','normal','high','urgent') DEFAULT 'normal' COMMENT 'Výchozí priorita',
  `active` tinyint(1) DEFAULT 1 COMMENT 'Je template aktivní? (0=ne, 1=ano)',
  
  -- METADATA (MySQL 5.5.43 kompatibilní - bez DEFAULT CURRENT_TIMESTAMP na datetime)
  `dt_created` datetime DEFAULT NULL,
  `dt_updated` datetime DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `type` (`type`),
  KEY `idx_active` (`active`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci 
COMMENT='Templates pro notifikace - rozšířené o detailní placeholdery';

-- MySQL 5.5.43: Trigger pro dt_created (náhrada za DEFAULT CURRENT_TIMESTAMP)
DELIMITER $$
CREATE TRIGGER `25_notification_templates_before_insert`
BEFORE INSERT ON `25_notification_templates`
FOR EACH ROW
BEGIN
  IF NEW.dt_created IS NULL THEN
    SET NEW.dt_created = NOW();
  END IF;
END$$
DELIMITER ;

-- MySQL 5.5.43: Trigger pro dt_updated (náhrada za ON UPDATE CURRENT_TIMESTAMP)
DELIMITER $$
CREATE TRIGGER `25_notification_templates_before_update`
BEFORE UPDATE ON `25_notification_templates`
FOR EACH ROW
BEGIN
  SET NEW.dt_updated = NOW();
END$$
DELIMITER ;

-- =====================================================================
-- 3. DOKUMENTACE PLACEHOLDERŮ
-- =====================================================================

/*
ZÁKLADNÍ PLACEHOLDERY (vždy dostupné):
=====================================
{order_number}           - Číslo objednávky (např. 2025-001)
{order_id}              - ID objednávky v DB
{order_subject}         - Předmět objednávky
{order_description}     - Popis objednávky
{max_price}             - Maximální částka (formátováno: "12 500")
{max_price_with_dph}    - Maximální částka s DPH (formátováno: "15 125")
{workflow_state}        - Aktuální stav objednávky (slovně, např. "Ke schválení")
{workflow_phase}        - Fáze workflow (1-8)

OSOBY:
=====================================
{creator_name}          - Jméno tvůrce objednávky
{creator_id}            - ID tvůrce
{garant_name}           - Jméno garanta
{garant_id}             - ID garanta
{prikazce_name}         - Jméno příkazce
{prikazce_id}           - ID příkazce
{supplier_name}         - Název dodavatele
{supplier_ic}           - IČ dodavatele
{supplier_contact}      - Kontakt na dodavatele

AKCE A ČASOVÉ ÚDAJE:
=====================================
{action_performed_by}       - Kdo provedl akci (jméno uživatele)
{action_performed_by_id}    - ID uživatele, který provedl akci
{action_performed_by_label} - Label akce (např. "Schválil", "Zamítl", "Vytvořil")
{action_date}              - Datum a čas akce (formát: "29.10.2025 19:45")
{action_date_short}        - Datum akce (formát: "29.10.2025")
{action_time}              - Čas akce (formát: "19:45")
{creation_date}            - Datum vytvoření objednávky (formát: "29.10.2025 19:45")

SCHVALOVACÍ PROCES:
=====================================
{approver_name}         - Jméno schvalovatele
{approver_id}           - ID schvalovatele
{approval_date}         - Datum schválení
{rejection_reason}      - Důvod zamítnutí
{cancellation_reason}   - Důvod zrušení

POLOŽKY A ČÁSTKY:
=====================================
{items_count}           - Celkový počet položek
{items_total_bez_dph}   - Celková cena položek bez DPH (formátováno)
{items_total_s_dph}     - Celková cena položek s DPH (formátováno)
{items_summary}         - Stručný přehled položek (1-3 řádky)

REGISTR SMLUV (FÁZE 5):
=====================================
{registr_iddt}          - ID dokumentu v registru smluv
{dt_zverejneni}         - Datum zveřejnění v registru (formát: "29.10.2025")
{ma_byt_zverejnena}     - Má být zveřejněna? (Ano/Ne)

FAKTURY (FÁZE 6):
=====================================
{invoices_count}        - Počet faktur k objednávce
{invoice_number}        - Číslo faktury
{invoice_amount}        - Částka faktury (formátováno)
{invoice_date}          - Datum vystavení faktury (formát: "29.10.2025")
{invoice_due_date}      - Datum splatnosti faktury (formát: "15.11.2025")
{invoice_paid_date}     - Datum úhrady faktury (formát: "10.11.2025")
{invoice_status}        - Stav faktury (Nová, Schválená, Uhrazená)

VĚCNÁ SPRÁVNOST (FÁZE 7):
=====================================
{asset_location}        - Umístění majetku
{vecna_spravnost_poznamka} - Poznámka k věcné správnosti
{kontroloval_name}      - Jméno kontrolora věcné správnosti
{dt_potvrzeni_vecne_spravnosti} - Datum potvrzení věcné správnosti

TODO ALARMY:
=====================================
{todo_title}            - Název úkolu
{todo_description}      - Popis úkolu
{todo_deadline}         - Termín splnění úkolu (formát: "29.10.2025")
{alarm_time}            - Čas alarmu (formát: "29.10.2025 08:00")
{days_overdue}          - Počet dní po termínu
{completed_by}          - Kdo dokončil úkol
{completed_date}        - Datum dokončení (formát: "29.10.2025 15:30")
{completion_note}       - Poznámka k dokončení
{assigned_by}           - Kdo přiřadil úkol
{alarm_count}           - Počet alarmů nastavených pro úkol
{first_alarm}           - Čas prvního alarmu (formát: "29.10.2025 08:00")

SYSTÉMOVÉ (údržba, bezpečnost):
=====================================
{maintenance_date}      - Datum údržby (formát: "29.10.2025")
{start_time}            - Čas začátku (formát: "02:00")
{end_time}              - Čas konce (formát: "04:00")
{duration}              - Trvání v minutách
{current_time}          - Aktuální čas
{finish_time}           - Čas dokončení
{actual_duration}       - Skutečné trvání v minutách
{backup_time}           - Čas zálohy
{backup_size}           - Velikost zálohy (např. "2.5 GB")
{backup_location}       - Umístění zálohy
{next_backup}           - Čas další zálohy
{version}               - Verze systému (např. "2.1.0")
{release_date}          - Datum vydání verze
{update_features}       - Seznam nových funkcí (multi-line)
{bug_fixes}             - Seznam opravených chyb (multi-line)
{new_features}          - Seznam nových funkcí (multi-line)
{install_time}          - Čas instalace
{alert_type}            - Typ bezpečnostního upozornění
{detection_time}        - Čas detekce
{alert_description}     - Popis upozornění
{recommended_action}    - Doporučená akce
{location}              - Lokace (město)
{country}               - Země
{login_time}            - Čas přihlášení
{device_info}           - Info o zařízení
{inactive_duration}     - Doba neaktivity v minutách
{usage_percent}         - Procento zaplnění disku
{free_space}            - Volné místo (GB)
{total_space}           - Celková kapacita (GB)
{backup_retention}      - Doba uchování záloh (dny)

KOMENTÁŘE A ZMÍNKY:
=====================================
{mention_author}        - Autor komentáře, který vás zmínil
{comment_text}          - Text komentáře
{comment_time}          - Čas komentáře

DEADLINE REMINDERS:
=====================================
{deadline_date}         - Termín dodání (formát: "29.10.2025")
{days_remaining}        - Zbývající dny do termínu

FORCE UNLOCK:
=====================================
{unlocked_by}           - Kdo odemkl objednávku
{unlock_time}           - Čas odemknutí
{unlock_reason}         - Důvod odemknutí

ODKAZY:
=====================================
{app_link}              - Přímý odkaz na objednávku v aplikaci
{app_link_edit}         - Odkaz na editaci objednávky
{app_link_approve}      - Odkaz na schválení objednávky

POKROČILÉ (volitelné - pro rozšířené notifikace):
=====================================
{notification_recipients_list}  - Seznam příjemců notifikace (jména oddělená čárkami)
{notification_recipients_count} - Počet příjemců notifikace
{notification_id}              - ID této notifikace v DB
{notification_created}         - Datum vytvoření notifikace

IKONY A FORMÁTOVÁNÍ:
=====================================
{action_icon}           - Ikona podle typu akce (např. ✅, ❌, 📤, atd.)
{priority_icon}         - Ikona podle priority (🔴 urgent, 🟠 high, 🟢 normal, ⚪ low)
*/

-- =====================================================================
-- 4. NOVÉ TEMPLATES PRO STAVY OBJEDNÁVEK
-- =====================================================================

-- Template: NOVÁ OBJEDNÁVKA (ROZPRACOVANÁ)
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_nova',
  'Nová objednávka vytvořena',
  'Vytvořena objednávka {order_number}',
  'Dobrý den,\n\nbyla vytvořena nová objednávka:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n👤 Vytvořil: {creator_name}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n📅 Datum: {creation_date}\n📊 Stav: {workflow_state}\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '{action_icon} Nová objednávka {order_number}',
  'Vytvořena objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč s DPH). Autor: {creator_name}, {creation_date}.',
  0,
  'low',
  1
);

-- Template: KE SCHVÁLENÍ
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_ke_schvaleni',
  'Objednávka odeslána ke schválení',
  'Ke schválení: Objednávka {order_number}',
  'Dobrý den,\n\nobjednávka čeká na Vaše schválení:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n👤 Vytvořil: {creator_name}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n📅 Odesláno: {action_date}\n👤 Garant: {garant_name}\n👤 Příkazce: {prikazce_name}\n\n📦 Počet položek: {items_count}\n💵 Celková cena položek: {items_total_s_dph} Kč s DPH\n\n➡️ Schválit objednávku: {app_link_approve}\n➡️ Zobrazit detail: {app_link}\n\nS pozdravem,\nSystém EEO',
  '{action_icon} Ke schválení: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) čeká na schválení. Vytvořil: {creator_name}, Odesláno: {action_date}. Položky: {items_count} ({items_total_s_dph} Kč s DPH).',
  1,
  'high',
  1
);

-- Template: SCHVÁLENA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_schvalena',
  'Objednávka schválena',
  '✅ Objednávka {order_number} byla schválena',
  'Dobrý den,\n\nobjednávka byla schválena:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n✅ Schválil: {action_performed_by}\n📅 Datum schválení: {action_date}\n\n📦 Počet položek: {items_count}\n💵 Celková cena: {items_total_s_dph} Kč s DPH\n\nObjednávku lze nyní odeslat dodavateli.\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '✅ Schválena: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) byla schválena. Schválil: {action_performed_by}, {action_date}.',
  1,
  'normal',
  1
);

-- Template: ZAMÍTNUTA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_zamitnuta',
  'Objednávka zamítnuta',
  '❌ Objednávka {order_number} byla zamítnuta',
  'Dobrý den,\n\nobjednávka byla zamítnuta:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n❌ Zamítl: {action_performed_by}\n📅 Datum zamítnutí: {action_date}\n📝 Důvod zamítnutí: {rejection_reason}\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '❌ Zamítnuta: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) byla zamítnuta. Zamítl: {action_performed_by}, {action_date}. Důvod: {rejection_reason}',
  1,
  'high',
  1
);

-- Template: ČEKÁ SE (vrácena k doplnění)
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_ceka_se',
  'Objednávka vrácena k doplnění',
  '⏸️ Objednávka {order_number} čeká na doplnění',
  'Dobrý den,\n\nobjednávka byla vrácena k doplnění informací:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n⏸️ Vrátil: {action_performed_by}\n📅 Datum: {action_date}\n\nProsím doplňte požadované informace a opět odešlete ke schválení.\n\nOdkaz: {app_link_edit}\n\nS pozdravem,\nSystém EEO',
  '⏸️ Čeká na doplnění: {order_number}',
  'Objednávka {order_number}: "{order_subject}" byla vrácena k doplnění. Vrátil: {action_performed_by}, {action_date}.',
  1,
  'normal',
  1
);

-- Template: ODESLÁNA DODAVATELI
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_odeslana',
  'Objednávka odeslána dodavateli',
  '📤 Objednávka {order_number} odeslána dodavateli',
  'Dobrý den,\n\nobjednávka byla odeslána dodavateli:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name} (IČ: {supplier_ic})\n📤 Odeslal: {action_performed_by}\n📅 Datum odeslání: {action_date}\n👤 Garant: {garant_name}\n\n📦 Počet položek: {items_count}\n💵 Celková cena: {items_total_s_dph} Kč s DPH\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '📤 Odeslána: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) odeslána dodavateli {supplier_name}. Odeslal: {action_performed_by}, {action_date}. Garant: {garant_name}.',
  1,
  'normal',
  1
);

-- Template: ČEKÁ NA POTVRZENÍ DODAVATELEM
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_ceka_potvrzeni',
  'Objednávka čeká na potvrzení dodavatelem',
  '⏳ Objednávka {order_number} čeká na potvrzení',
  'Dobrý den,\n\nobjednávka čeká na potvrzení dodavatelem:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n📅 Odesláno: {action_date}\n👤 Garant: {garant_name}\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '⏳ Čeká na potvrzení: {order_number}',
  'Objednávka {order_number}: "{order_subject}" čeká na potvrzení dodavatelem {supplier_name}. Odesláno: {action_date}. Garant: {garant_name}.',
  0,
  'normal',
  1
);

-- Template: POTVRZENA DODAVATELEM
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_potvrzena',
  'Objednávka potvrzena dodavatelem',
  '✔️ Objednávka {order_number} potvrzena dodavatelem',
  'Dobrý den,\n\nobjednávka byla potvrzena dodavatelem:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n✔️ Potvrzeno: {action_date}\n👤 Garant: {garant_name}\n\n📦 Počet položek: {items_count}\n💵 Celková cena: {items_total_s_dph} Kč s DPH\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '✔️ Potvrzena: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) potvrzena dodavatelem {supplier_name}. Datum: {action_date}. Garant: {garant_name}.',
  1,
  'normal',
  1
);

-- Template: DOKONČENA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_dokoncena',
  'Objednávka dokončena',
  '🎉 Objednávka {order_number} dokončena',
  'Dobrý den,\n\nobjednávka byla úspěšně dokončena:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n🎉 Dokončil: {action_performed_by}\n📅 Datum dokončení: {action_date}\n👤 Garant: {garant_name}\n\n📦 Počet položek: {items_count}\n💵 Celková cena: {items_total_s_dph} Kč s DPH\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '🎉 Dokončena: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) úspěšně dokončena. Dokončil: {action_performed_by}, {action_date}. Dodavatel: {supplier_name}.',
  1,
  'normal',
  1
);

-- Template: ZRUŠENA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_zrusena',
  'Objednávka zrušena',
  '🚫 Objednávka {order_number} byla zrušena',
  'Dobrý den,\n\nobjednávka byla zrušena:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🚫 Zrušil: {action_performed_by}\n📅 Datum zrušení: {action_date}\n📝 Důvod zrušení: {cancellation_reason}\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '🚫 Zrušena: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) byla zrušena. Zrušil: {action_performed_by}, {action_date}. Důvod: {cancellation_reason}',
  1,
  'high',
  1
);

-- Template: SMAZÁNA (trvale)
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_smazana',
  'Objednávka smazána',
  '🗑️ Objednávka {order_number} byla smazána',
  'Dobrý den,\n\nobjednávka byla trvale smazána:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🗑️ Smazal: {action_performed_by}\n📅 Datum smazání: {action_date}\n\nS pozdravem,\nSystém EEO',
  '🗑️ Smazána: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) byla trvale smazána. Smazal: {action_performed_by}, {action_date}.',
  1,
  'high',
  1
);

-- Template: ROZPRACOVANÁ (koncept)
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_rozpracovana',
  'Objednávka rozpracována (koncept)',
  '📝 Objednávka {order_number} rozpracována',
  'Dobrý den,\n\nobjednávka je rozpracována jako koncept:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n👤 Autor: {creator_name}\n📅 Datum vytvoření: {creation_date}\n📊 Stav: {workflow_state}\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '📝 Rozpracována: {order_number}',
  'Objednávka {order_number}: "{order_subject}" ({max_price_with_dph} Kč) rozpracována jako koncept. Autor: {creator_name}, {creation_date}.',
  0,
  'low',
  1
);

-- =====================================================================
-- NOVÉ TEMPLATES: FÁZE 5 - REGISTR SMLUV
-- =====================================================================

-- Template: ČEKÁ NA ZVEŘEJNĚNÍ V REGISTRU
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_registr_ceka',
  'Objednávka čeká na zveřejnění v registru',
  '📋 Objednávka {order_number} čeká na registr',
  'Dobrý den,\n\nobjednávka čeká na zveřejnění v registru smluv:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n👤 Garant: {garant_name}\n📅 Potvrzeno: {action_date}\n\n⚠️ Je potřeba vyplnit údaje pro registr smluv.\n\nOdkaz: {app_link_edit}\n\nS pozdravem,\nSystém EEO',
  '📋 Čeká na registr: {order_number}',
  'Objednávka {order_number}: "{order_subject}" čeká na zveřejnění v registru smluv. Garant: {garant_name}. Je potřeba vyplnit údaje.',
  1,
  'normal',
  1
);

-- Template: ZVEŘEJNĚNA V REGISTRU
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_registr_zverejnena',
  'Objednávka zveřejněna v registru',
  '✅ Objednávka {order_number} zveřejněna v registru',
  'Dobrý den,\n\nobjednávka byla zveřejněna v registru smluv:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n📅 Datum zveřejnění: {action_date}\n🔗 ID registru: {registr_iddt}\n👤 Zveřejnil: {action_performed_by}\n\n📦 Počet položek: {items_count}\n💵 Celková cena: {items_total_s_dph} Kč s DPH\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '✅ V registru: {order_number}',
  'Objednávka {order_number}: "{order_subject}" zveřejněna v registru smluv. ID registru: {registr_iddt}. Zveřejnil: {action_performed_by}, {action_date}.',
  1,
  'normal',
  1
);

-- =====================================================================
-- NOVÉ TEMPLATES: FÁZE 6 - FAKTURACE
-- =====================================================================

-- Template: ČEKÁ NA FAKTURU
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_faktura_ceka',
  'Objednávka čeká na přidání faktury',
  '💵 Objednávka {order_number} čeká na fakturu',
  'Dobrý den,\n\nobjednávka čeká na přidání faktury:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n👤 Garant: {garant_name}\n\n📦 Počet položek: {items_count}\n💵 Celková cena: {items_total_s_dph} Kč s DPH\n\n⚠️ Je potřeba přidat fakturu od dodavatele.\n\nOdkaz: {app_link_edit}\n\nS pozdravem,\nSystém EEO',
  '💵 Čeká na fakturu: {order_number}',
  'Objednávka {order_number}: "{order_subject}" čeká na přidání faktury. Dodavatel: {supplier_name}, Garant: {garant_name}.',
  1,
  'normal',
  1
);

-- Template: FAKTURA PŘIDÁNA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_faktura_pridana',
  'K objednávce byla přidána faktura',
  '💰 Faktura přidána k objednávce {order_number}',
  'Dobrý den,\n\nk objednávce byla přidána faktura:\n\n📋 Číslo objednávky: {order_number}\n📝 Předmět: {order_subject}\n🏢 Dodavatel: {supplier_name}\n💰 Max. částka objednávky: {max_price_with_dph} Kč s DPH\n\n🧾 Číslo faktury: {invoice_number}\n💵 Částka faktury: {invoice_amount} Kč s DPH\n📅 Datum vystavení: {invoice_date}\n📅 Datum splatnosti: {invoice_due_date}\n👤 Přidal: {action_performed_by}\n📅 Přidáno: {action_date}\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '💰 Faktura přidána: {order_number}',
  'K objednávce {order_number}: "{order_subject}" přidána faktura č. {invoice_number} ({invoice_amount} Kč). Přidal: {action_performed_by}, {action_date}.',
  1,
  'normal',
  1
);

-- Template: FAKTURA SCHVÁLENA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_faktura_schvalena',
  'Faktura schválena k úhradě',
  '✅ Faktura {invoice_number} schválena k úhradě',
  'Dobrý den,\n\nfaktura byla schválena k úhradě:\n\n📋 Objednávka: {order_number}\n📝 Předmět: {order_subject}\n🏢 Dodavatel: {supplier_name}\n\n🧾 Číslo faktury: {invoice_number}\n💵 Částka: {invoice_amount} Kč s DPH\n📅 Splatnost: {invoice_due_date}\n✅ Schválil: {action_performed_by}\n📅 Datum schválení: {action_date}\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '✅ Faktura schválena: {invoice_number}',
  'Faktura č. {invoice_number} ({invoice_amount} Kč) pro objednávku {order_number} schválena k úhradě. Schválil: {action_performed_by}, {action_date}.',
  1,
  'normal',
  1
);

-- Template: FAKTURA UHRAZENA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_faktura_uhrazena',
  'Faktura uhrazena',
  '💳 Faktura {invoice_number} uhrazena',
  'Dobrý den,\n\nfaktura byla uhrazena:\n\n📋 Objednávka: {order_number}\n📝 Předmět: {order_subject}\n🏢 Dodavatel: {supplier_name}\n\n🧾 Číslo faktury: {invoice_number}\n💵 Částka: {invoice_amount} Kč s DPH\n💳 Datum úhrady: {action_date}\n👤 Potvrdil úhradu: {action_performed_by}\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '💳 Faktura uhrazena: {invoice_number}',
  'Faktura č. {invoice_number} ({invoice_amount} Kč) pro objednávku {order_number} uhrazena. Potvrdil: {action_performed_by}, {action_date}.',
  1,
  'normal',
  1
);

-- =====================================================================
-- NOVÉ TEMPLATES: FÁZE 7 - VĚCNÁ SPRÁVNOST (KONTROLA)
-- =====================================================================

-- Template: ČEKÁ NA KONTROLU VĚCNÉ SPRÁVNOSTI
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_kontrola_ceka',
  'Objednávka čeká na kontrolu věcné správnosti',
  '🔍 Objednávka {order_number} čeká na kontrolu',
  'Dobrý den,\n\nobjednávka čeká na kontrolu věcné správnosti:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n👤 Garant: {garant_name}\n\n📦 Počet položek: {items_count}\n💵 Celková cena: {items_total_s_dph} Kč s DPH\n🧾 Počet faktur: {invoices_count}\n\n⚠️ Je potřeba provést kontrolu věcné správnosti dodávky.\n\nOdkaz: {app_link_edit}\n\nS pozdravem,\nSystém EEO',
  '🔍 Čeká na kontrolu: {order_number}',
  'Objednávka {order_number}: "{order_subject}" čeká na kontrolu věcné správnosti. Garant: {garant_name}. Dodavatel: {supplier_name}.',
  1,
  'high',
  1
);

-- Template: VĚCNÁ SPRÁVNOST POTVRZENA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_kontrola_potvrzena',
  'Věcná správnost potvrzena',
  '✅ Věcná správnost potvrzena: {order_number}',
  'Dobrý den,\n\nvěcná správnost objednávky byla potvrzena:\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n\n✅ Potvrdil věcnou správnost: {action_performed_by}\n📅 Datum potvrzení: {action_date}\n📍 Umístění majetku: {asset_location}\n📝 Poznámka: {vecna_spravnost_poznamka}\n\n📦 Počet položek: {items_count}\n💵 Celková cena: {items_total_s_dph} Kč s DPH\n\nObjednávku lze nyní dokončit.\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '✅ Věcná správnost OK: {order_number}',
  'Objednávka {order_number}: "{order_subject}" - věcná správnost potvrzena. Kontroloval: {action_performed_by}, {action_date}. Umístění: {asset_location}.',
  1,
  'normal',
  1
);

-- Template: VĚCNÁ SPRÁVNOST ZAMÍTNUTA
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_status_kontrola_zamitnuta',
  'Věcná správnost zamítnuta (reklamace)',
  '❌ Věcná správnost zamítnuta: {order_number}',
  'Dobrý den,\n\nvěcná správnost objednávky byla zamítnuta (reklamace):\n\n📋 Číslo: {order_number}\n📝 Předmět: {order_subject}\n💰 Max. částka: {max_price_with_dph} Kč s DPH\n🏢 Dodavatel: {supplier_name}\n\n❌ Zamítl: {action_performed_by}\n📅 Datum: {action_date}\n📝 Důvod zamítnutí: {rejection_reason}\n📝 Poznámka: {vecna_spravnost_poznamka}\n\n⚠️ Je potřeba kontaktovat dodavatele a vyřešit reklamaci.\n\nOdkaz: {app_link}\n\nS pozdravem,\nSystém EEO',
  '❌ Věcná správnost zamítnuta: {order_number}',
  'Objednávka {order_number}: "{order_subject}" - věcná správnost zamítnuta (reklamace). Zamítl: {action_performed_by}, {action_date}. Důvod: {rejection_reason}',
  1,
  'high',
  1
);

-- =====================================================================
-- 5. TODO ALARM NOTIFIKACE (DŮLEŽITÉ!)
-- =====================================================================

-- Template: TODO ALARM - Běžná připomínka
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'alarm_todo_normal',
  'TODO Alarm - Běžná připomínka',
  '🔔 Připomínka úkolu: {todo_title}',
  'Dobrý den,\n\npřipomínáme Vám úkol:\n\n📋 Úkol: {todo_title}\n📝 Popis: {todo_description}\n📅 Termín: {todo_deadline}\n⏰ Alarm: {alarm_time}\n🔗 Odkaz na úkol: {app_link}\n\nS pozdravem,\nSystém EEO',
  '🔔 Připomínka: {todo_title}',
  'Připomínka úkolu: "{todo_title}". Termín: {todo_deadline}, Alarm: {alarm_time}.',
  1,
  'normal',
  1
);

-- Template: TODO ALARM - Urgentní (vyžaduje pozornost)
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'alarm_todo_high',
  'TODO Alarm - URGENTNÍ',
  '⚠️ URGENTNÍ: Úkol {todo_title} vyžaduje pozornost!',
  'Dobrý den,\n\n⚠️ URGENTNÍ ÚKOL vyžaduje Vaši pozornost:\n\n📋 Úkol: {todo_title}\n📝 Popis: {todo_description}\n📅 Termín: {todo_deadline}\n⏰ Alarm: {alarm_time}\n🔥 Priorita: VYSOKÁ\n\n⚡ Je třeba věnovat tomuto úkolu okamžitou pozornost!\n\n🔗 Odkaz na úkol: {app_link}\n\nS pozdravem,\nSystém EEO',
  '⚠️ URGENTNÍ: {todo_title}',
  '⚠️ URGENTNÍ úkol: "{todo_title}". Termín: {todo_deadline}. Vyžaduje okamžitou pozornost!',
  1,
  'urgent',
  1
);

-- Template: TODO ALARM - Prošlý termín
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'alarm_todo_expired',
  'TODO Alarm - Prošlý termín',
  '❌ Prošel termín úkolu: {todo_title}',
  'Dobrý den,\n\n❌ Prošel termín následujícího úkolu:\n\n📋 Úkol: {todo_title}\n📝 Popis: {todo_description}\n📅 Termín byl: {todo_deadline}\n⏰ Uplynulo: {days_overdue} dní\n\n⚠️ Prosím dokončete tento úkol nebo aktualizujte jeho termín.\n\n🔗 Odkaz na úkol: {app_link}\n\nS pozdravem,\nSystém EEO',
  '❌ Prošlý termín: {todo_title}',
  '❌ Úkol "{todo_title}" má prošlý termín ({todo_deadline}). Uplynulo: {days_overdue} dní.',
  1,
  'high',
  1
);

-- Template: TODO - Úkol dokončen
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'todo_completed',
  'TODO - Úkol dokončen',
  '✅ Úkol dokončen: {todo_title}',
  'Dobrý den,\n\núkol byl označen jako dokončený:\n\n📋 Úkol: {todo_title}\n✅ Dokončil: {completed_by}\n📅 Datum dokončení: {completed_date}\n📝 Poznámka: {completion_note}\n\n🔗 Odkaz na úkol: {app_link}\n\nS pozdravem,\nSystém EEO',
  '✅ Dokončeno: {todo_title}',
  'Úkol "{todo_title}" byl dokončen. Dokončil: {completed_by}, {completed_date}.',
  0,
  'low',
  1
);

-- Template: TODO - Nový úkol přiřazen
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'todo_assigned',
  'TODO - Nový úkol přiřazen',
  '📋 Nový úkol: {todo_title}',
  'Dobrý den,\n\nbyl Vám přiřazen nový úkol:\n\n📋 Úkol: {todo_title}\n📝 Popis: {todo_description}\n👤 Přiřadil: {assigned_by}\n📅 Termín: {todo_deadline}\n⏰ Alarmy: {alarm_count}\n🔔 První alarm: {first_alarm}\n\n🔗 Odkaz na úkol: {app_link}\n\nS pozdravem,\nSystém EEO',
  '📋 Nový úkol: {todo_title}',
  'Nový úkol přiřazen: "{todo_title}". Termín: {todo_deadline}, Přiřadil: {assigned_by}.',
  1,
  'normal',
  1
);

-- =====================================================================
-- 6. SYSTÉMOVÉ NOTIFIKACE
-- =====================================================================

-- Template: Systémová údržba - Plánovaná
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_maintenance_scheduled',
  'Plánovaná údržba systému',
  '🔧 Plánovaná údržba systému - {maintenance_date}',
  'Dobrý den,\n\nplánovaná údržba systému proběhne:\n\n📅 Datum: {maintenance_date}\n⏰ Od: {start_time}\n⏰ Do: {end_time}\n⏱️ Předpokládané trvání: {duration} minut\n\n⚠️ Systém bude během této doby nedostupný.\n\nDěkujeme za pochopení.\n\nS pozdravem,\nSystém EEO',
  '🔧 Plánovaná údržba',
  'Údržba systému: {maintenance_date} od {start_time} do {end_time}. Systém bude nedostupný.',
  1,
  'high',
  1
);

-- Template: Systémová údržba - Začíná
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_maintenance_starting',
  'Údržba systému začíná',
  '🔧 Údržba systému právě začíná',
  'Dobrý den,\n\núdržba systému právě začíná.\n\n⏰ Aktuální čas: {current_time}\n⏱️ Předpokládané trvání: {duration} minut\n\n⚠️ Systém bude během této doby nedostupný.\n\nDěkujeme za trpělivost.\n\nS pozdravem,\nSystém EEO',
  '🔧 Údržba začíná',
  'Systém přechází do režimu údržby. Předpokládané trvání: {duration} minut.',
  1,
  'urgent',
  1
);

-- Template: Systémová údržba - Dokončena
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_maintenance_finished',
  'Údržba systému dokončena',
  '✅ Údržba systému byla dokončena',
  'Dobrý den,\n\núdržba systému byla úspěšně dokončena.\n\n⏰ Čas dokončení: {finish_time}\n⏱️ Trvání: {actual_duration} minut\n\n✅ Systém je opět plně funkční.\n\nDěkujeme za trpělivost.\n\nS pozdravem,\nSystém EEO',
  '✅ Údržba dokončena',
  'Systém je opět plně funkční. Údržba dokončena v {finish_time}.',
  1,
  'normal',
  1
);

-- Template: Zálohování - Dokončeno
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_backup_completed',
  'Automatické zálohování dokončeno',
  '💾 Zálohování systému dokončeno',
  'Automatické zálohování systému bylo úspěšně dokončeno.\n\n⏰ Čas: {backup_time}\n📦 Velikost zálohy: {backup_size}\n📍 Umístění: {backup_location}\n📅 Další záloha: {next_backup}\n\nS pozdravem,\nSystém EEO',
  '💾 Zálohování dokončeno',
  'Záloha systému vytvořena ({backup_size}). Další záloha: {next_backup}.',
  0,
  'low',
  1
);

-- Template: Aktualizace - Dostupná
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_update_available',
  'Dostupná aktualizace systému',
  '🆕 Je dostupná nová verze systému {version}',
  'Dobrý den,\n\nje dostupná nová verze systému.\n\n🆕 Verze: {version}\n📅 Datum vydání: {release_date}\n\n✨ Nové funkce:\n{update_features}\n\n🐛 Opravy chyb:\n{bug_fixes}\n\n📅 Aktualizace bude provedena během plánované údržby.\n\nS pozdravem,\nSystém EEO',
  '🆕 Dostupná aktualizace',
  'Nová verze systému {version} je dostupná. Aktualizace při další údržbě.',
  1,
  'normal',
  1
);

-- Template: Aktualizace - Instalována
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_update_installed',
  'Systém byl aktualizován',
  '✅ Systém byl aktualizován na verzi {version}',
  'Dobrý den,\n\nsystém byl úspěšně aktualizován.\n\n🆕 Verze: {version}\n⏰ Čas instalace: {install_time}\n\n✨ Nové funkce:\n{new_features}\n\n🐛 Opravené chyby:\n{bug_fixes}\n\nS pozdravem,\nSystém EEO',
  '✅ Systém aktualizován',
  'Systém aktualizován na verzi {version}. Nové funkce dostupné.',
  1,
  'normal',
  1
);

-- Template: Bezpečnostní upozornění
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_security_alert',
  'Bezpečnostní upozornění',
  '🚨 Bezpečnostní upozornění - {alert_type}',
  'Dobrý den,\n\n🚨 Bylo detekováno bezpečnostní upozornění:\n\n⚠️ Typ: {alert_type}\n⏰ Čas detekce: {detection_time}\n📍 IP adresa: {ip_address}\n👤 Uživatel: {username}\n\n📝 Popis:\n{alert_description}\n\n✅ Doporučená akce:\n{recommended_action}\n\nS pozdravem,\nSystém EEO',
  '🚨 Bezpečnostní upozornění',
  'Detekováno: {alert_type}. Čas: {detection_time}. Akce: {recommended_action}',
  1,
  'urgent',
  1
);

-- Template: Neobvyklé přihlášení
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_user_login_alert',
  'Neobvyklé přihlášení detekováno',
  '⚠️ Neobvyklé přihlášení do Vašeho účtu',
  'Dobrý den,\n\n⚠️ Detekovali jsme neobvyklé přihlášení do Vašeho účtu:\n\n👤 Uživatel: {username}\n📍 Lokace: {location}\n🌍 Země: {country}\n⏰ Čas: {login_time}\n💻 IP adresa: {ip_address}\n🖥️ Zařízení: {device_info}\n\n❓ Pokud jste to nebyli Vy, okamžitě změňte heslo a kontaktujte administrátora.\n\n✅ Pokud jste to byli Vy, můžete toto upozornění ignorovat.\n\nS pozdravem,\nSystém EEO',
  '⚠️ Neobvyklé přihlášení',
  'Přihlášení z {location} ({country}) v {login_time}. IP: {ip_address}. Zkontrolujte, zda jste to byli Vy.',
  1,
  'high',
  1
);

-- Template: Relace vypršela
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_session_expired',
  'Relace vypršela',
  'Vaše relace v systému vypršela',
  'Dobrý den,\n\nVaše přihlášení do systému vypršelo z důvodu neaktivity.\n\n⏰ Délka neaktivity: {inactive_duration} minut\n\n🔐 Pro pokračování v práci se prosím přihlaste znovu.\n\nS pozdravem,\nSystém EEO',
  '🔐 Relace vypršela',
  'Vaše relace vypršela z důvodu neaktivity. Přihlaste se prosím znovu.',
  0,
  'normal',
  1
);

-- Template: Nedostatek místa na disku
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'system_storage_warning',
  'Upozornění na nedostatek místa',
  '⚠️ Nedostatek místa na disku - {usage_percent}%',
  'Dobrý den,\n\n⚠️ Úložný prostor serveru je téměř plný:\n\n📊 Zaplněno: {usage_percent}%\n💾 Zbývá: {free_space} GB\n📦 Celková kapacita: {total_space} GB\n\n📝 Doporučení:\n- Archivovat staré objednávky\n- Smazat nepotřebné přílohy\n- Vyčistit zálohy starší než {backup_retention} dní\n\nS pozdravem,\nSystém EEO',
  '⚠️ Nedostatek místa',
  'Disk zaplněn na {usage_percent}%. Zbývá {free_space} GB. Doporučujeme archivaci.',
  1,
  'high',
  1
);

-- Template: Uživatel zmíněn v komentáři
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'user_mention',
  'Zmínka v komentáři',
  '💬 Byli jste zmíněni v komentáři',
  'Dobrý den,\n\nuživatel {mention_author} vás zmínil v komentáři:\n\n📋 Objednávka: {order_number}\n📝 Předmět: {order_subject}\n👤 Autor komentáře: {mention_author}\n⏰ Čas: {comment_time}\n\n💬 Komentář:\n"{comment_text}"\n\n🔗 Odkaz na objednávku: {app_link}\n\nS pozdravem,\nSystém EEO',
  '💬 Zmínka v komentáři',
  '{mention_author} vás zmínil v komentáři k objednávce {order_number}.',
  0,
  'low',
  1
);

-- Template: Deadline reminder (připomínka termínu)
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'deadline_reminder',
  'Upozornění na blížící se termín',
  '⏰ Blíží se termín objednávky {order_number}',
  'Dobrý den,\n\nblíží se termín dodání objednávky:\n\n📋 Objednávka: {order_number}\n📝 Předmět: {order_subject}\n📅 Termín dodání: {deadline_date}\n⏰ Zbývá: {days_remaining} dní\n🏢 Dodavatel: {supplier_name}\n\n⚠️ Prosím zkontrolujte stav objednávky.\n\n🔗 Odkaz na objednávku: {app_link}\n\nS pozdravem,\nSystém EEO',
  '⏰ Blíží se termín',
  'Objednávka {order_number} má termín dodání {deadline_date}. Zbývá {days_remaining} dní.',
  1,
  'high',
  1
);

-- Template: Force unlock (násilné odemknutí objednávky)
INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES (
  'order_unlock_forced',
  'Objednávka násilně odemknuta',
  '🔓 Objednávka {order_number} byla násilně odemknuta',
  'Dobrý den,\n\nobjednávka, kterou jste měli zamčenou, byla násilně odemknuta:\n\n📋 Objednávka: {order_number}\n📝 Předmět: {order_subject}\n👤 Odemkl: {unlocked_by}\n⏰ Čas: {unlock_time}\n📝 Důvod: {unlock_reason}\n\n⚠️ Vaše neuložené změny byly ztraceny.\n\n🔗 Odkaz na objednávku: {app_link}\n\nS pozdravem,\nSystém EEO',
  '🔓 Objednávka odemknuta',
  'Objednávka {order_number} byla násilně odemknuta uživatelem {unlocked_by}. Důvod: {unlock_reason}',
  1,
  'high',
  1
);

-- =====================================================================
-- 6. DEPRECATED TEMPLATES (zachováno pro zpětnou kompatibilitu)
-- =====================================================================

INSERT INTO `25_notification_templates` 
(`type`, `name`, `email_subject`, `email_body`, `app_title`, `app_message`, `send_email_default`, `priority_default`, `active`) 
VALUES 
('order_approved', 'Objednávka schválena (DEPRECATED)', 'Objednávka {order_number} schválena', 'DEPRECATED: Použijte order_status_schvalena', 'Objednávka schválena', 'DEPRECATED', 0, 'normal', 0),
('order_rejected', 'Objednávka zamítnuta (DEPRECATED)', 'Objednávka {order_number} zamítnuta', 'DEPRECATED: Použijte order_status_zamitnuta', 'Objednávka zamítnuta', 'DEPRECATED', 0, 'normal', 0),
('order_created', 'Nová objednávka (DEPRECATED)', 'Nová objednávka {order_number}', 'DEPRECATED: Použijte order_status_ke_schvaleni', 'Nová objednávka', 'DEPRECATED', 0, 'normal', 0);

-- =====================================================================
-- 7. KONTROLNÍ SELECT
-- =====================================================================

SELECT 
  id, 
  type, 
  name, 
  priority_default, 
  send_email_default,
  active,
  LENGTH(app_message) as app_msg_len,
  LENGTH(email_body) as email_body_len
FROM `25_notification_templates`
ORDER BY 
  CASE 
    WHEN type LIKE 'order_status_%' THEN 1
    WHEN type LIKE 'alarm_todo_%' THEN 2
    WHEN type LIKE 'todo_%' THEN 3
    WHEN type LIKE 'system_%' THEN 4
    WHEN type IN ('user_mention', 'deadline_reminder', 'order_unlock_forced') THEN 5
    ELSE 6
  END,
  id;

-- Souhrn podle kategorie
SELECT 
  CASE 
    WHEN type LIKE 'order_status_%' THEN 'Objednávky (stavy)'
    WHEN type LIKE 'alarm_todo_%' THEN 'TODO Alarmy'
    WHEN type LIKE 'todo_%' THEN 'TODO Akce'
    WHEN type LIKE 'system_%' THEN 'Systémové'
    WHEN type IN ('user_mention', 'deadline_reminder', 'order_unlock_forced') THEN 'Ostatní'
    ELSE 'Deprecated'
  END as kategorie,
  COUNT(*) as pocet,
  SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as aktivnich,
  SUM(CASE WHEN send_email_default = 1 THEN 1 ELSE 0 END) as s_emailem
FROM `25_notification_templates`
GROUP BY kategorie
ORDER BY 
  CASE kategorie
    WHEN 'Objednávky (stavy)' THEN 1
    WHEN 'TODO Alarmy' THEN 2
    WHEN 'TODO Akce' THEN 3
    WHEN 'Systémové' THEN 4
    WHEN 'Ostatní' THEN 5
    ELSE 6
  END;

-- Celkový počet
SELECT 
  COUNT(*) as celkem_templates,
  SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as aktivnich,
  SUM(CASE WHEN send_email_default = 1 THEN 1 ELSE 0 END) as s_default_emailem
FROM `25_notification_templates`;

-- =====================================================================
-- OČEKÁVANÝ VÝSLEDEK:
-- =====================================================================
/*
SOUHRN TEMPLATES:
- Objednávky (stavy): 21 templates (Fáze 1-8 + speciální)
- TODO Alarmy: 3 templates (normal, high, expired)
- TODO Akce: 2 templates (assigned, completed)
- Systémové: 10 templates (údržba, zálohy, aktualizace, bezpečnost)
- Ostatní: 3 templates (mention, deadline, force_unlock)
- Deprecated: 3 templates (neaktivní, pro zpětnou kompatibilitu)

CELKEM: 42 templates
AKTIVNÍCH: 39 templates (bez deprecated)
*/

-- =====================================================================
-- POZNÁMKY K IMPLEMENTACI:
-- =====================================================================
/*
1. BACKEND API musí implementovat placeholder replacement:
   - Funkce replacePlaceholders($template, $data)
   - Validace dostupných placeholderů
   - Escapování pro XSS prevenci

2. Frontend (React) musí:
   - Načíst templates z API
   - Zobrazit preview s naplněnými placeholdery
   - Umožnit testování notifikací

3. Nové placeholdery vyžadují:
   - Rozšíření notificationData objektu v OrderForm25.js
   - Přidání výpočtu items_count, items_total_*
   - Přidání notification_recipients_list
   - TODO ALARM DATA: načítání z tabulky TODO úkolů
   - SYSTÉMOVÉ DATA: údržba, zálohy, bezpečnost

4. Email notifikace:
   - Backend musí podporovat HTML emaily
   - Template engine pro email (např. PHPMailer)
   - Konfigurace SMTP serveru

5. TODO ALARM WORKER:
   - Backend worker/cron job pro kontrolu alarmů
   - Běží každou minutu nebo podle nastavení
   - Kontroluje tabulku TODO úkolů a alarmy
   - Odesílá notifikace podle typu (normal, high, expired)
   - Více info: docs/BACKEND-TODO-ALARM-QUICK-START.md

6. Testing:
   - Vytvořit testovací endpoint pro preview notifikací
   - Administrátorské rozhraní pro správu templates
   - Možnost zaslat testovací notifikaci
   
7. Počet templates:
   - Objednávky: 21 templates (všechny fáze workflow)
   - TODO Alarmy: 5 templates (alarmy + akce)
   - Systémové: 10 templates (údržba, bezpečnost, aktualizace)
   - Ostatní: 3 templates (mention, deadline, force_unlock)
   - Deprecated: 3 templates (zpětná kompatibilita)
   - CELKEM: 42 templates
*/
