# 🗄️ Database Structure - EEO2025

> **Databáze:** eeo2025  
> **Server:** 10.3.172.11  
> **User:** erdms_user  
> **Datum:** 5. prosince 2025  

---

## 📊 Přehled tabulek

Celkem **43 tabulek** začínajících na `25_` nebo `25a_`:

### Kategorie tabulek:

- **25_*** (33 tabulek) - Core entities (číselníky, uživatelé, role, smlouvy...)
- **25a_*** (10 tabulek) - Transactional data (objednávky, faktury, pokladny...)

---

## 🔑 Core Entities (25_*)

### 👤 Uživatelé & Auth

#### `25_uzivatele` - Hlavní tabulka uživatelů
```sql
CREATE TABLE 25_uzivatele (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username             VARCHAR(50) NOT NULL UNIQUE,
  password_hash        VARCHAR(255) NOT NULL,
  titul_pred           VARCHAR(50),
  jmeno                VARCHAR(100),
  prijmeni             VARCHAR(100),
  titul_za             VARCHAR(50),
  email                VARCHAR(255),
  telefon              VARCHAR(50),
  pozice_id            INT UNSIGNED,
  lokalita_id          INT UNSIGNED,
  organizace_id        SMALLINT NOT NULL DEFAULT 1,
  usek_id              INT NOT NULL,
  aktivni              TINYINT(1) NOT NULL DEFAULT 1,
  dt_vytvoreni         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dt_aktualizace       TIMESTAMP NULL,
  dt_posledni_aktivita DATETIME NOT NULL,
  
  FOREIGN KEY (pozice_id) REFERENCES 25_pozice(id),
  FOREIGN KEY (lokalita_id) REFERENCES 25_lokality(id),
  FOREIGN KEY (usek_id) REFERENCES 25_useky(id)
);
```

**Klíčové sloupce:**
- `username` - Unikátní přihlašovací jméno
- `password_hash` - Hashované heslo
- `aktivni` - Aktivní/deaktivovaný uživatel
- `dt_posledni_aktivita` - Poslední aktivita (pro session tracking)

---

#### `25_uzivatele_role` - Přiřazení rolí uživatelům
```sql
CREATE TABLE 25_uzivatele_role (
  uzivatel_id INT UNSIGNED,
  role_id     INT UNSIGNED,
  PRIMARY KEY (uzivatel_id, role_id)
);
```

---

#### `25_role` - Role v systému
```sql
CREATE TABLE 25_role (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aktivni    TINYINT(4) NOT NULL DEFAULT 1,
  kod_role   VARCHAR(32) NOT NULL,
  nazev_role VARCHAR(50) NOT NULL UNIQUE,
  Popis      VARCHAR(128) NOT NULL
);
```

**Standardní role:**
- `SUPERADMIN` - Nejvyšší oprávnění
- `ADMINISTRATOR` - Administrátorská role
- `UZIVATEL` - Běžný uživatel
- `SCHVALOVATEL` - Schvalovatel objednávek
- `GARANT` - Garant objednávek

---

#### `25_prava` - Oprávnění
```sql
CREATE TABLE 25_prava (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kod_prava VARCHAR(50) NOT NULL UNIQUE,
  popis     VARCHAR(255),
  aktivni   TINYINT(11) NOT NULL DEFAULT 1
);
```

**Příklady oprávnění:**
- `ORDER_MANAGE` - Správa objednávek
- `ORDER_2025` - Přístup k objednávkám 2025+
- `INVOICE_MANAGE` - Správa faktur
- `USER_MANAGE` - Správa uživatelů
- `DICTIONARY_MANAGE` - Správa číselníků

---

#### `25_role_prava` - Přiřazení práv k rolím
```sql
CREATE TABLE 25_role_prava (
  role_id  INT UNSIGNED,
  pravo_id INT UNSIGNED,
  PRIMARY KEY (role_id, pravo_id)
);
```

---

#### `25_uzivatele_hierarchie` - Hierarchie nadřízený/podřízený
```sql
CREATE TABLE 25_uzivatele_hierarchie (
  nadrizeny_id INT UNSIGNED NOT NULL,
  podrizeny_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (nadrizeny_id, podrizeny_id)
);
```

---

#### `25_uzivatel_nastaveni` - Nastavení uživatelů
```sql
CREATE TABLE 25_uzivatel_nastaveni (
  user_id                       INT PRIMARY KEY,
  show_help                     TINYINT(1) DEFAULT 1,
  vychozi_sekce_po_prihlaseni   VARCHAR(50),
  vychozi_dlazdice_statistiky   TEXT, -- JSON array
  export_format                 VARCHAR(20) DEFAULT 'xlsx',
  -- ... další nastavení
);
```

**Ukládá:**
- Zobrazení helperů
- Výchozí sekci po přihlášení
- Preferované formáty exportu
- Filtrování v seznamech

---

#### `25_uzivatele_poznamky` - Todo poznámky uživatelů
```sql
CREATE TABLE 25_uzivatele_poznamky (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  text        TEXT NOT NULL,
  completed   TINYINT(1) DEFAULT 0,
  priority    ENUM('low','normal','high') DEFAULT 'normal',
  dt_created  DATETIME,
  dt_updated  DATETIME,
  dt_reminder DATETIME
);
```

---

### 🏢 Organizační struktura

#### `25_useky` - Úseky/Oddělení
```sql
CREATE TABLE 25_useky (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usek_zkr   VARCHAR(16) NOT NULL,  -- Zkratka úseku (např. "IT", "HR")
  usek_nazev VARCHAR(128) NOT NULL,  -- Název úseku
  aktivni    TINYINT(4) NOT NULL DEFAULT 1
);
```

---

#### `25_pozice` - Pracovní pozice
```sql
CREATE TABLE 25_pozice (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nazev_pozice  VARCHAR(100) NOT NULL,
  popis         VARCHAR(255),
  uroven        INT, -- Hierarchická úroveň
  aktivni       TINYINT(1) DEFAULT 1
);
```

---

#### `25_lokality` - Lokality/Pracoviště
```sql
CREATE TABLE 25_lokality (
  id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nazev  VARCHAR(100) NOT NULL,
  adresa VARCHAR(255),
  mesto  VARCHAR(100),
  psc    VARCHAR(10),
  aktivni TINYINT(1) DEFAULT 1
);
```

---

#### `25_organizace_vizitka` - Vizitky organizací
```sql
CREATE TABLE 25_organizace_vizitka (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nazev            VARCHAR(255) NOT NULL,
  ico              VARCHAR(20),
  dic              VARCHAR(20),
  adresa           VARCHAR(255),
  telefon          VARCHAR(50),
  email            VARCHAR(255),
  web              VARCHAR(255),
  bankovni_ucet    VARCHAR(50),
  kod_banky        VARCHAR(10),
  iban             VARCHAR(50),
  swift            VARCHAR(20),
  aktivni          TINYINT(1) DEFAULT 1
);
```

---

### 📦 Dodavatelé & Kontakty

#### `25_dodavatele` - Dodavatelé
```sql
CREATE TABLE 25_dodavatele (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nazev           VARCHAR(255) NOT NULL,
  adresa          VARCHAR(255),
  ico             VARCHAR(20),
  dic             VARCHAR(20),
  zastoupeny      VARCHAR(255),  -- Zastoupen kým
  kontakt_jmeno   VARCHAR(255),
  kontakt_email   VARCHAR(255),
  kontakt_telefon VARCHAR(50),
  user_id         INT NOT NULL DEFAULT 0,  -- Kdo vytvořil (0 = global)
  usek_zkr        VARCHAR(256) NOT NULL,   -- JSON array úseků
  dt_vytvoreni    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dt_aktualizace  TIMESTAMP DEFAULT '0000-00-00 00:00:00',
  aktivni         TINYINT(4) NOT NULL DEFAULT 1
);
```

**Poznámky:**
- `user_id = 0` → Globální dodavatel (viditelný pro všechny)
- `user_id > 0` → Uživatelský dodavatel (viditelný jen pro autora + jeho úsek)
- `usek_zkr` → JSON array zkratek úseků (např. `["IT","HR"]`)

---

### 📋 Číselníky

#### `25_ciselnik_stavy` - Stavy objednávek (workflow)
```sql
CREATE TABLE 25_ciselnik_stavy (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  kod_stavu   VARCHAR(50) NOT NULL UNIQUE,
  nazev_stavu VARCHAR(100) NOT NULL,
  popis       VARCHAR(255),
  barva       VARCHAR(20),  -- Barva pro UI (hex)
  poradi      INT,          -- Pořadí v workflow
  aktivni     TINYINT(1) DEFAULT 1
);
```

**Workflow stavy:**
- `NOVA` → Nová objednávka
- `ROZPRACOVANA` → Rozpracovaná
- `KE_SCHVALENI` → Čeká na schválení
- `SCHVALENA` → Schválená
- `ODESLANA` → Odeslána dodavateli
- `POTVRZENA` → Potvrzena dodavatelem
- `FAKTURACE` → Fakturace
- `VECNA_SPRAVNOST` → Kontrola věcné správnosti
- `DOKONCENA` → Dokončená
- `STORNOVANA` → Stornovaná
- `ZAMITNUTA` → Zamítnutá

---

### 📄 Smlouvy

#### `25_smlouvy` - Smlouvy s dodavateli
```sql
CREATE TABLE 25_smlouvy (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  cislo_smlouvy          VARCHAR(100) NOT NULL UNIQUE,
  usek_id                INT NOT NULL,
  usek_zkr               VARCHAR(50),
  druh_smlouvy           VARCHAR(100) NOT NULL,
  nazev_firmy            VARCHAR(255) NOT NULL,
  ico                    VARCHAR(20),
  dic                    VARCHAR(20),
  nazev_smlouvy          VARCHAR(500) NOT NULL,
  popis_smlouvy          TEXT,
  platnost_od            DATE,
  platnost_do            DATE NOT NULL,
  hodnota_bez_dph        DECIMAL(15,2) DEFAULT 0.00,
  hodnota_s_dph          DECIMAL(15,2) NOT NULL,
  sazba_dph              DECIMAL(5,2) DEFAULT 21.00,
  cerpano_celkem         DECIMAL(15,2) DEFAULT 0.00,
  zbyva                  DECIMAL(15,2) DEFAULT 0.00,
  procento_cerpani       DECIMAL(5,2) DEFAULT 0.00,
  aktivni                TINYINT(1) DEFAULT 1,
  stav                   ENUM('AKTIVNI','NEAKTIVNI','UKONCENA','PRERUSENA','PRIPRAVOVANA') DEFAULT 'AKTIVNI',
  dt_vytvoreni           DATETIME,
  dt_aktualizace         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  vytvoril_user_id       INT,
  upravil_user_id        INT,
  posledni_prepocet      DATETIME,
  poznamka               TEXT,
  cislo_dms              VARCHAR(100),
  kategorie              VARCHAR(50),
  hodnota_plneni_bez_dph DECIMAL(15,2),
  hodnota_plneni_s_dph   DECIMAL(15,2),
  
  INDEX idx_platnost_od (platnost_od),
  INDEX idx_aktivni (aktivni),
  INDEX idx_stav (stav),
  INDEX idx_kategorie (kategorie),
  INDEX idx_ico (ico)
);
```

---

### 💰 Limitované přísliby (LP)

#### `25_limitovane_prisliby` - Master tabulka LP
```sql
CREATE TABLE 25_limitovane_prisliby (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  user_id               INT NOT NULL,
  usek_id               INT NOT NULL,
  kategorie             VARCHAR(32) NOT NULL,  -- Typ LP
  cislo_lp              VARCHAR(255),          -- Číslo LP
  cislo_uctu            INT,                   -- Číslo účtu
  nazev_uctu            VARCHAR(255),          -- Název účtu
  vyse_financniho_kryti DECIMAL(15,2),         -- Výše finančního krytí
  platne_od             DATE,
  platne_do             DATE
);
```

---

#### `25_limitovane_prisliby_cerpani` - Čerpání LP (aggregovaná data)
```sql
CREATE TABLE 25_limitovane_prisliby_cerpani (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  cislo_lp              VARCHAR(50) NOT NULL,
  kategorie             VARCHAR(50) NOT NULL,
  usek_id               INT NOT NULL,
  user_id               INT NOT NULL,
  rok                   YEAR NOT NULL,
  celkovy_limit         DECIMAL(15,2) DEFAULT 0.00,
  rezervovano           DECIMAL(15,2) DEFAULT 0.00,  -- Objednávky KE_SCHVALENI
  predpokladane_cerpani DECIMAL(15,2) DEFAULT 0.00,  -- Objednávky ODESLANE
  skutecne_cerpano      DECIMAL(15,2) DEFAULT 0.00,  -- Objednávky FAKTUROVANE
  cerpano_pokladna      DECIMAL(15,2) DEFAULT 0.00,  -- Pokladní knihy
  zbyva_rezervace       DECIMAL(15,2) DEFAULT 0.00,
  zbyva_predpoklad      DECIMAL(15,2) DEFAULT 0.00,
  zbyva_skutecne        DECIMAL(15,2) DEFAULT 0.00,
  procento_rezervace    DECIMAL(5,2) DEFAULT 0.00,
  procento_predpoklad   DECIMAL(5,2) DEFAULT 0.00,
  procento_skutecne     DECIMAL(5,2) DEFAULT 0.00,
  celkove_cerpano       DECIMAL(15,2) DEFAULT 0.00,
  celkove_zbyva         DECIMAL(15,2) DEFAULT 0.00,
  celkove_procento      DECIMAL(5,2) DEFAULT 0.00,
  pocet_zaznamu         INT DEFAULT 1,
  ma_navyseni           TINYINT(1) DEFAULT 0,
  posledni_prepocet     DATETIME,
  
  INDEX idx_cislo_lp (cislo_lp),
  INDEX idx_kategorie (kategorie),
  INDEX idx_usek_id (usek_id),
  INDEX idx_user_id (user_id),
  INDEX idx_rok (rok)
);
```

**Typy čerpání:**
- **Rezervace** - Objednávky ve stavu KE_SCHVALENI
- **Předpoklad** - Objednávky ve stavu ODESLANA, POTVRZENA
- **Skutečné** - Objednávky s fakturou (FAKTURACE, DOKONCENA)
- **Pokladna** - Čerpání z pokladních knih

---

### 📝 Šablony

#### `25_sablony_docx` - DOCX šablony pro generování dokumentů
```sql
CREATE TABLE 25_sablony_docx (
  id                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nazev                    VARCHAR(255) NOT NULL,
  popis                    TEXT,
  typ_dokumentu            VARCHAR(64),  -- Typ (objednavka, smlouva...)
  nazev_souboru            VARCHAR(255) NOT NULL,
  nazev_souboru_ulozeny    VARCHAR(255) NOT NULL,
  cesta_souboru            VARCHAR(512) DEFAULT 'sablony/',
  velikost_souboru         INT UNSIGNED,
  md5_hash                 VARCHAR(32),
  mapovani_json            TEXT,  -- JSON mapování placeholderů
  platnost_od              DATE,
  platnost_do              DATE,
  aktivni                  TINYINT(1) DEFAULT 1,
  usek_omezeni             TEXT,  -- JSON array úseků
  vytvoril_uzivatel_id     INT UNSIGNED,
  dt_vytvoreni             DATETIME,
  aktualizoval_uzivatel_id INT UNSIGNED,
  dt_aktualizace           DATETIME,
  castka                   DECIMAL(15,2) DEFAULT 0.00,
  verze                    VARCHAR(32) DEFAULT '1.0',
  poznamka                 TEXT,
  
  INDEX idx_typ_dokumentu (typ_dokumentu),
  INDEX idx_aktivni (aktivni),
  INDEX idx_platnost_od (platnost_od),
  INDEX idx_vytvoril (vytvoril_uzivatel_id)
);
```

---

#### `25_sablony_objednavek` - Šablony objednávek (metadata)
```sql
CREATE TABLE 25_sablony_objednavek (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nazev          VARCHAR(255) NOT NULL,
  popis          TEXT,
  data_json      TEXT,  -- JSON s výchozími hodnotami
  user_id        INT UNSIGNED NOT NULL,
  usek_zkr       VARCHAR(256),  -- JSON array úseků
  dt_vytvoreni   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dt_aktualizace TIMESTAMP,
  aktivni        TINYINT(1) DEFAULT 1
);
```

---

### 🔔 Notifikace

#### `25_notifications` - Notifikace
```sql
CREATE TABLE 25_notifications (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type                VARCHAR(64) NOT NULL,  -- Typ notifikace
  title               VARCHAR(255) NOT NULL,
  message             TEXT,
  data_json           TEXT,  -- JSON s dodatečnými daty
  from_user_id        INT,
  to_user_id          INT,
  to_users_json       TEXT,  -- JSON array user IDs
  to_all_users        TINYINT(1) DEFAULT 0,
  priority            ENUM('low','normal','high','urgent') DEFAULT 'normal',
  category            VARCHAR(32),
  send_email          TINYINT(1) DEFAULT 0,
  email_sent          TINYINT(1) DEFAULT 0,
  email_sent_at       DATETIME,
  related_object_type VARCHAR(32),  -- Typ entity (order, invoice...)
  related_object_id   BIGINT,       -- ID entity
  dt_created          DATETIME NOT NULL,
  dt_expires          DATETIME,
  active              TINYINT(1) DEFAULT 1,
  
  INDEX idx_type (type),
  INDEX idx_to_user (to_user_id),
  INDEX idx_from_user (from_user_id),
  INDEX idx_created (dt_created),
  INDEX idx_expires (dt_expires),
  INDEX idx_active (active),
  INDEX idx_email (send_email),
  INDEX idx_related (related_object_type)
);
```

---

#### `25_notification_templates` - Šablony notifikací
```sql
CREATE TABLE 25_notification_templates (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type              VARCHAR(64) NOT NULL UNIQUE,
  name              VARCHAR(255) NOT NULL,
  title_template    VARCHAR(255),
  message_template  TEXT,
  default_priority  ENUM('low','normal','high','urgent') DEFAULT 'normal',
  default_category  VARCHAR(32),
  send_email        TINYINT(1) DEFAULT 0,
  active            TINYINT(1) DEFAULT 1,
  variables_json    TEXT  -- JSON popis proměnných
);
```

---

#### `25_notifications_read` - Přečtené notifikace
```sql
CREATE TABLE 25_notifications_read (
  notification_id BIGINT UNSIGNED,
  user_id         INT,
  dt_read         DATETIME NOT NULL,
  PRIMARY KEY (notification_id, user_id)
);
```

---

### 💬 Chat

#### `25_chat_konverzace` - Chat konverzace
```sql
CREATE TABLE 25_chat_konverzace (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nazev            VARCHAR(255),
  typ              ENUM('private','group','channel') DEFAULT 'private',
  vytvoril_user_id INT UNSIGNED NOT NULL,
  dt_vytvoreni     DATETIME NOT NULL,
  dt_aktualizace   DATETIME,
  aktivni          TINYINT(1) DEFAULT 1
);
```

---

#### `25_chat_zpravy` - Chat zprávy
```sql
CREATE TABLE 25_chat_zpravy (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  konverzace_id  INT UNSIGNED NOT NULL,
  uzivatel_id    INT UNSIGNED NOT NULL,
  text           TEXT NOT NULL,
  attachments    TEXT,  -- JSON array příloh
  parent_msg_id  BIGINT UNSIGNED,  -- Reply na zprávu
  dt_odeslani    DATETIME NOT NULL,
  dt_upraveno    DATETIME,
  upraveno       TINYINT(1) DEFAULT 0,
  smazano        TINYINT(1) DEFAULT 0,
  
  INDEX idx_konverzace (konverzace_id),
  INDEX idx_uzivatel (uzivatel_id),
  INDEX idx_datum (dt_odeslani)
);
```

---

#### `25_chat_ucastnici` - Účastníci konverzace
```sql
CREATE TABLE 25_chat_ucastnici (
  konverzace_id INT UNSIGNED,
  uzivatel_id   INT UNSIGNED,
  role          ENUM('owner','admin','member') DEFAULT 'member',
  dt_pripojeni  DATETIME NOT NULL,
  PRIMARY KEY (konverzace_id, uzivatel_id)
);
```

---

#### `25_chat_prectene_zpravy` - Přečtené zprávy
```sql
CREATE TABLE 25_chat_prectene_zpravy (
  konverzace_id INT UNSIGNED,
  uzivatel_id   INT UNSIGNED,
  zprava_id     BIGINT UNSIGNED,
  dt_precteno   DATETIME NOT NULL,
  PRIMARY KEY (konverzace_id, uzivatel_id)
);
```

---

#### `25_chat_reakce` - Reakce na zprávy (emoji)
```sql
CREATE TABLE 25_chat_reakce (
  zprava_id   BIGINT UNSIGNED,
  uzivatel_id INT UNSIGNED,
  emoji       VARCHAR(10) NOT NULL,
  dt_pridano  DATETIME NOT NULL,
  PRIMARY KEY (zprava_id, uzivatel_id, emoji)
);
```

---

#### `25_chat_mentions` - Zmínky uživatelů v chatu
```sql
CREATE TABLE 25_chat_mentions (
  zprava_id      BIGINT UNSIGNED,
  uzivatel_id    INT UNSIGNED,
  zminka_text    VARCHAR(100),  -- @username
  dt_vytvoreni   DATETIME NOT NULL,
  precteno       TINYINT(1) DEFAULT 0,
  PRIMARY KEY (zprava_id, uzivatel_id)
);
```

---

#### `25_chat_online_status` - Online status uživatelů
```sql
CREATE TABLE 25_chat_online_status (
  uzivatel_id        INT UNSIGNED PRIMARY KEY,
  status             ENUM('online','offline','away','busy') DEFAULT 'offline',
  dt_posledni_aktivita DATETIME NOT NULL
);
```

---

### 📊 Audit & Logging

#### `25_auditni_zaznamy` - Audit log
```sql
CREATE TABLE 25_auditni_zaznamy (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uzivatel_id      INT UNSIGNED,
  akce             VARCHAR(64) NOT NULL,  -- Typ akce
  tabulka          VARCHAR(64),
  zaznam_id        BIGINT,
  stare_hodnoty    TEXT,  -- JSON
  nove_hodnoty     TEXT,  -- JSON
  ip_adresa        VARCHAR(45),
  user_agent       VARCHAR(255),
  dt_vytvoreni     DATETIME NOT NULL,
  
  INDEX idx_uzivatel (uzivatel_id),
  INDEX idx_akce (akce),
  INDEX idx_tabulka (tabulka),
  INDEX idx_datum (dt_vytvoreni)
);
```

---

## 💳 Transactional Data (25a_*)

### 📦 Objednávky

#### `25a_objednavky` - Objednávky (Order V2)
```sql
CREATE TABLE 25a_objednavky (
  id                               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cislo_objednavky                 VARCHAR(50),
  dt_objednavky                    DATETIME,
  predmet                          VARCHAR(255) NOT NULL,
  strediska_kod                    TEXT NOT NULL,  -- JSON array ["STR001","STR002"]
  max_cena_s_dph                   DECIMAL(15,2),
  financovani                      TEXT,  -- JSON {typ, nazev, lp_kody}
  druh_objednavky_kod              VARCHAR(255),
  stav_workflow_kod                VARCHAR(256) NOT NULL,  -- Workflow stavy
  mimoradna_udalost                TINYINT(1) DEFAULT 0,
  stav_objednavky                  VARCHAR(64) NOT NULL,
  
  -- Uživatelé
  uzivatel_id                      INT UNSIGNED NOT NULL,  -- Autor
  uzivatel_akt_id                  INT UNSIGNED,           -- Aktualizátor
  garant_uzivatel_id               INT UNSIGNED,           -- Garant
  objednatel_id                    INT UNSIGNED,           -- Objednatel
  schvalovatel_id                  INT,                    -- Schvalovatel
  dt_schvaleni                     DATETIME,
  schvaleni_komentar               VARCHAR(255),
  prikazce_id                      INT,                    -- Příkazce
  
  -- Dodavatel
  dodavatel_id                     INT,
  dodavatel_nazev                  VARCHAR(255),
  dodavatel_adresa                 VARCHAR(255),
  dodavatel_ico                    VARCHAR(20),
  dodavatel_dic                    VARCHAR(20),
  dodavatel_zastoupeny             VARCHAR(255),
  dodavatel_kontakt_jmeno          VARCHAR(255),
  dodavatel_kontakt_email          VARCHAR(255),
  dodavatel_kontakt_telefon        VARCHAR(50),
  
  -- Termíny a místo
  dt_predpokladany_termin_dodani   DATE,
  misto_dodani                     VARCHAR(255),
  zaruka                           VARCHAR(100),
  
  -- Odeslání
  dt_odeslani                      DATETIME,
  odesilatel_id                    INT UNSIGNED,
  odeslani_storno_duvod            TEXT,
  dodavatel_zpusob_potvrzeni       VARCHAR(128),  -- JSON {zpusob_potvrzeni[], zpusob_platby}
  
  -- Akceptace
  dt_akceptace                     DATETIME,
  dodavatel_potvrdil_id            INT UNSIGNED,
  
  -- Zveřejnění
  zverejnit                        TINYTEXT,
  zverejnil_id                     INT UNSIGNED,
  dt_zverejneni                    DATETIME,
  registr_iddt                     VARCHAR(100),
  
  -- Poznámka
  poznamka                         TEXT,
  
  -- Fakturace
  fakturant_id                     INT UNSIGNED,
  dt_faktura_pridana               DATETIME,
  
  -- Dokončení
  dokoncil_id                      INT UNSIGNED,
  dt_dokonceni                     DATETIME,
  dokonceni_poznamka               TEXT,
  potvrzeni_dokonceni_objednavky   TINYINT(1) DEFAULT 0,
  
  -- Věcná správnost
  potvrdil_vecnou_spravnost_id     INT UNSIGNED,
  dt_potvrzeni_vecne_spravnosti    DATETIME,
  vecna_spravnost_umisteni_majetku TEXT,
  vecna_spravnost_poznamka         TEXT,
  potvrzeni_vecne_spravnosti       TINYINT(1) DEFAULT 0,
  
  -- Metadata
  dt_vytvoreni                     DATETIME NOT NULL,
  dt_aktualizace                   DATETIME,
  dt_zamek                         DATETIME,
  zamek_uzivatel_id                INT,
  aktivni                          TINYINT(4) DEFAULT 1,
  
  INDEX idx_cislo (cislo_objednavky),
  INDEX idx_uzivatel (uzivatel_id),
  INDEX idx_stav (stav_workflow_kod),
  INDEX idx_datum (dt_objednavky),
  INDEX idx_garant (garant_uzivatel_id),
  INDEX idx_objednatel (objednatel_id),
  INDEX idx_schvalovatel (schvalovatel_id),
  INDEX idx_prikazce (prikazce_id),
  INDEX idx_odesilatel (odesilatel_id),
  INDEX idx_potvrdil (dodavatel_potvrdil_id),
  INDEX idx_zverejnil (zverejnil_id),
  INDEX idx_fakturant (fakturant_id),
  INDEX idx_dokoncil (dokoncil_id),
  INDEX idx_vecna_spravnost (potvrdil_vecnou_spravnost_id)
);
```

**Klíčové body:**
- `stav_workflow_kod` - Workflow stavy oddělené `+` (např. "NOVA+KE_SCHVALENI")
- `strediska_kod` - JSON array středisek (např. `["STR001","STR002"]`)
- `financovani` - JSON objekt financování (např. `{"typ":"LP","nazev":"LP2025","lp_kody":["LP001"]}`)
- `dodavatel_zpusob_potvrzeni` - JSON objekt (např. `{"zpusob_potvrzeni":["email","portal"],"zpusob_platby":"prevod"}`)

---

#### `25a_objednavky_polozky` - Položky objednávky (LP čerpání)
```sql
CREATE TABLE 25a_objednavky_polozky (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lp_id          INT,              -- FK na 25_limitovane_prisliby_cerpani
  objednavka_id  INT UNSIGNED NOT NULL,
  popis          TEXT NOT NULL,
  cena_bez_dph   DECIMAL(15,2),
  sazba_dph      INT,
  cena_s_dph     DECIMAL(15,2),
  dt_vytvoreni   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dt_aktualizace TIMESTAMP,
  usek_kod       VARCHAR(20),
  budova_kod     VARCHAR(20),
  mistnost_kod   VARCHAR(20),
  poznamka       TEXT,
  
  INDEX idx_objednavka (objednavka_id),
  INDEX idx_lp (lp_id),
  INDEX idx_usek (usek_kod)
);
```

---

#### `25a_objednavky_prilohy` - Přílohy objednávky
```sql
CREATE TABLE 25a_objednavky_prilohy (
  id                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  objednavka_id            INT UNSIGNED NOT NULL,
  guid                     VARCHAR(50),  -- GUID souboru
  typ_prilohy              VARCHAR(50),  -- Typ (nabidka, smlouva, ostatni...)
  originalni_nazev_souboru VARCHAR(255) NOT NULL,
  systemova_cesta          VARCHAR(255) NOT NULL,
  velikost_souboru_b       INT,
  nahrano_uzivatel_id      INT UNSIGNED,
  dt_vytvoreni             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dt_aktualizace           TIMESTAMP,
  
  INDEX idx_objednavka (objednavka_id),
  INDEX idx_nahrano (nahrano_uzivatel_id)
);
```

**Systémový název souboru:** `obj-{objednavka_id}-{guid}.ext`

---

### 💰 Faktury

#### `25a_objednavky_faktury` - Faktury
```sql
CREATE TABLE 25a_objednavky_faktury (
  id                               INT AUTO_INCREMENT PRIMARY KEY,
  objednavka_id                    INT NOT NULL,
  fa_dorucena                      TINYINT(1) DEFAULT 0,
  fa_zaplacena                     TINYINT(1) DEFAULT 0,
  fa_datum_vystaveni               DATE,
  fa_datum_splatnosti              DATE,
  fa_datum_doruceni                DATE,
  fa_castka                        DECIMAL(15,2) NOT NULL,
  fa_cislo_vema                    VARCHAR(100) NOT NULL,
  fa_typ                           VARCHAR(32) DEFAULT 'BEZNA',  -- BEZNA, ZALOHOVA, DOBROPIS
  
  -- Věcná správnost
  potvrdil_vecnou_spravnost_id     INT,
  dt_potvrzeni_vecne_spravnosti    DATETIME,
  vecna_spravnost_umisteni_majetku TEXT,
  vecna_spravnost_poznamka         TEXT,
  vecna_spravnost_potvrzeno        TINYINT(1) DEFAULT 0,
  
  fa_strediska_kod                 TEXT,  -- JSON array středisek
  fa_poznamka                      TEXT,
  rozsirujici_data                 TEXT,  -- JSON další data
  
  vytvoril_uzivatel_id             INT NOT NULL,
  dt_vytvoreni                     DATETIME NOT NULL,
  dt_aktualizace                   DATETIME,
  aktivni                          TINYINT(1) DEFAULT 1,
  
  INDEX idx_objednavka (objednavka_id),
  INDEX idx_fa_zaplacena (fa_zaplacena),
  INDEX idx_fa_datum_vystaveni (fa_datum_vystaveni),
  INDEX idx_fa_datum_splatnosti (fa_datum_splatnosti),
  INDEX idx_fa_datum_doruceni (fa_datum_doruceni),
  INDEX idx_fa_cislo (fa_cislo_vema),
  INDEX idx_fa_typ (fa_typ),
  INDEX idx_potvrdil (potvrdil_vecnou_spravnost_id),
  INDEX idx_dt_potvrzeni (dt_potvrzeni_vecne_spravnosti),
  INDEX idx_vecna_spravnost (vecna_spravnost_potvrzeno),
  INDEX idx_vytvoril (vytvoril_uzivatel_id),
  INDEX idx_aktivni (aktivni)
);
```

---

#### `25a_faktury_prilohy` - Přílohy faktury
```sql
CREATE TABLE 25a_faktury_prilohy (
  id                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  faktura_id               INT NOT NULL,
  objednavka_id            INT NOT NULL,
  guid                     VARCHAR(50),
  typ_prilohy              VARCHAR(50),
  originalni_nazev_souboru VARCHAR(255) NOT NULL,
  systemova_cesta          VARCHAR(255) NOT NULL,
  velikost_souboru_b       INT,
  nahrano_uzivatel_id      INT UNSIGNED,
  dt_vytvoreni             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dt_aktualizace           TIMESTAMP,
  
  INDEX idx_faktura (faktura_id),
  INDEX idx_objednavka (objednavka_id),
  INDEX idx_nahrano (nahrano_uzivatel_id)
);
```

**Systémový název souboru:** `fa-{faktura_id}-{guid}.ext`

---

### 💵 Pokladní knihy

#### `25a_pokladny` - Pokladny
```sql
CREATE TABLE 25a_pokladny (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nazev          VARCHAR(255) NOT NULL,
  kod_pokladny   VARCHAR(50) NOT NULL UNIQUE,
  usek_id        INT NOT NULL,
  aktivni        TINYINT(1) DEFAULT 1,
  dt_vytvoreni   DATETIME NOT NULL,
  dt_aktualizace DATETIME
);
```

---

#### `25a_pokladny_uzivatele` - Přiřazení uživatelů k pokladnám
```sql
CREATE TABLE 25a_pokladny_uzivatele (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pokladna_id     INT NOT NULL,
  uzivatel_id     INT UNSIGNED NOT NULL,
  role            ENUM('pokladni','schvalovatel','admin') DEFAULT 'pokladni',
  aktivni         TINYINT(1) DEFAULT 1,
  dt_prirazeni    DATETIME NOT NULL,
  dt_aktualizace  DATETIME,
  
  INDEX idx_pokladna (pokladna_id),
  INDEX idx_uzivatel (uzivatel_id)
);
```

---

#### `25a_pokladni_knihy` - Pokladní knihy
```sql
CREATE TABLE 25a_pokladni_knihy (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  prirazeni_id            INT NOT NULL,  -- FK na 25a_pokladny_uzivatele
  pokladna_id             INT NOT NULL,
  uzivatel_id             INT UNSIGNED NOT NULL,
  rok                     SMALLINT NOT NULL,
  mesic                   TINYINT NOT NULL,
  cislo_pokladny          INT NOT NULL,
  kod_pracoviste          VARCHAR(50),
  nazev_pracoviste        VARCHAR(255),
  ciselna_rada_vpd        VARCHAR(10),   -- VPD = Výdajový pokladní doklad
  ciselna_rada_ppd        VARCHAR(10),   -- PPD = Příjmový pokladní doklad
  
  -- Stavy
  prevod_z_predchoziho    DECIMAL(10,2) DEFAULT 0.00,
  pocatecni_stav          DECIMAL(10,2) DEFAULT 0.00,
  koncovy_stav            DECIMAL(10,2) DEFAULT 0.00,
  celkove_prijmy          DECIMAL(10,2) DEFAULT 0.00,
  celkove_vydaje          DECIMAL(10,2) DEFAULT 0.00,
  pocet_zaznamu           INT DEFAULT 0,
  
  stav_knihy              ENUM('aktivni','uzavrena_uzivatelem','zamknuta_spravcem') DEFAULT 'aktivni',
  uzavrena_uzivatelem_kdy DATETIME,
  zamknuta_spravcem_kdy   DATETIME,
  zamknuta_spravcem_kym   INT UNSIGNED,
  poznamky                TEXT,
  
  vytvoreno               DATETIME NOT NULL,
  aktualizovano           DATETIME,
  vytvoril                INT UNSIGNED,
  aktualizoval            INT UNSIGNED,
  
  INDEX idx_prirazeni (prirazeni_id),
  INDEX idx_pokladna (pokladna_id),
  INDEX idx_uzivatel (uzivatel_id),
  INDEX idx_rok_mesic (rok, mesic),
  INDEX idx_stav (stav_knihy),
  INDEX idx_spravce (zamknuta_spravcem_kym)
);
```

---

#### `25a_pokladni_polozky` - Položky pokladní knihy
```sql
CREATE TABLE 25a_pokladni_polozky (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  kniha_id          INT NOT NULL,
  typ_zaznamu       ENUM('prijem','vydaj') NOT NULL,
  cislo_dokladu     VARCHAR(50) NOT NULL,
  datum_ucetni      DATE NOT NULL,
  datum_vyhotoveni  DATE,
  
  -- LP čerpání
  lp_id             INT,  -- FK na 25_limitovane_prisliby_cerpani
  lp_kategorie      VARCHAR(50),
  lp_cislo          VARCHAR(100),
  
  castka            DECIMAL(10,2) NOT NULL,
  ucet              VARCHAR(50),
  stredisko         VARCHAR(50),
  
  prijato_od        VARCHAR(255),  -- Pro příjem
  vyplaceno_komu    VARCHAR(255),  -- Pro výdaj
  
  predmet_plneni    TEXT NOT NULL,
  doklad_typ        VARCHAR(100),
  doklad_cislo      VARCHAR(100),
  
  poznamka          TEXT,
  
  vytvoreno         DATETIME NOT NULL,
  aktualizovano     DATETIME,
  vytvoril          INT UNSIGNED,
  aktualizoval      INT UNSIGNED,
  
  INDEX idx_kniha (kniha_id),
  INDEX idx_typ (typ_zaznamu),
  INDEX idx_datum (datum_ucetni),
  INDEX idx_lp (lp_id)
);
```

---

#### `25a_pokladni_audit` - Audit log pro pokladny
```sql
CREATE TABLE 25a_pokladni_audit (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kniha_id          INT,
  polozka_id        INT,
  uzivatel_id       INT UNSIGNED NOT NULL,
  akce              VARCHAR(64) NOT NULL,  -- create, update, delete, lock, unlock
  stare_hodnoty     TEXT,  -- JSON
  nove_hodnoty      TEXT,  -- JSON
  ip_adresa         VARCHAR(45),
  dt_vytvoreni      DATETIME NOT NULL,
  
  INDEX idx_kniha (kniha_id),
  INDEX idx_polozka (polozka_id),
  INDEX idx_uzivatel (uzivatel_id),
  INDEX idx_datum (dt_vytvoreni)
);
```

---

### ⚙️ Globální nastavení

#### `25a_nastaveni_globalni` - Globální nastavení systému
```sql
CREATE TABLE 25a_nastaveni_globalni (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  klic           VARCHAR(100) NOT NULL UNIQUE,
  hodnota        TEXT,
  typ            VARCHAR(50),  -- string, int, bool, json
  kategorie      VARCHAR(50),
  popis          VARCHAR(255),
  dt_vytvoreni   DATETIME NOT NULL,
  dt_aktualizace DATETIME,
  
  INDEX idx_klic (klic),
  INDEX idx_kategorie (kategorie)
);
```

**Příklady nastavení:**
- `system.version` → Verze systému
- `email.smtp_host` → SMTP server
- `order.prefix` → Prefix čísla objednávky
- `cashbook.max_items` → Max. počet položek v pokladní knize

---

## 🔗 Vztahy mezi tabulkami

### Objednávky:
```
25a_objednavky
├─ FK uzivatel_id → 25_uzivatele(id)
├─ FK garant_uzivatel_id → 25_uzivatele(id)
├─ FK objednatel_id → 25_uzivatele(id)
├─ FK schvalovatel_id → 25_uzivatele(id)
├─ FK dodavatel_id → 25_dodavatele(id)
├─ 1:N → 25a_objednavky_polozky(objednavka_id)
├─ 1:N → 25a_objednavky_prilohy(objednavka_id)
└─ 1:N → 25a_objednavky_faktury(objednavka_id)
```

### Faktury:
```
25a_objednavky_faktury
├─ FK objednavka_id → 25a_objednavky(id)
├─ FK vytvoril_uzivatel_id → 25_uzivatele(id)
└─ 1:N → 25a_faktury_prilohy(faktura_id)
```

### Uživatelé:
```
25_uzivatele
├─ FK pozice_id → 25_pozice(id)
├─ FK lokalita_id → 25_lokality(id)
├─ FK usek_id → 25_useky(id)
├─ N:M → 25_role (přes 25_uzivatele_role)
├─ 1:1 → 25_uzivatel_nastaveni(user_id)
└─ N:M → 25_uzivatele (přes 25_uzivatele_hierarchie)
```

### LP čerpání:
```
25_limitovane_prisliby_cerpani
├─ FK usek_id → 25_useky(id)
├─ FK user_id → 25_uzivatele(id)
└─ 1:N → 25a_objednavky_polozky(lp_id)
```

---

## 📈 Indexy & Performance

### Důležité indexy:

**Objednávky:**
- `idx_cislo` - Vyhledávání podle čísla objednávky
- `idx_uzivatel` - Filtrování podle autora
- `idx_stav` - Filtrování podle stavu workflow
- `idx_datum` - Řazení/filtrování podle data

**Faktury:**
- `idx_objednavka` - Vazba na objednávku (JOIN)
- `idx_fa_cislo` - Vyhledávání podle čísla faktury
- `idx_fa_datum_splatnosti` - Sledování splatnosti

**Notifikace:**
- `idx_to_user` - Filtrování pro konkrétního uživatele
- `idx_type` - Filtrování podle typu
- `idx_created` - Řazení podle data vytvoření

---

## 🔐 Bezpečnost

### Password hashing:
- PHP `password_hash()` s `PASSWORD_BCRYPT`
- Cost factor: 12

### Session management:
- JWT tokeny pro API
- Expirace: 8 hodin
- Refresh token: 30 dní

### Audit logging:
- Všechny důležité operace logované do `25_auditni_zaznamy`
- IP adresa a user agent

---

## 📝 Poznámky

### JSON sloupce:
- `strediska_kod` → Array stringů: `["STR001","STR002"]`
- `financovani` → Object: `{"typ":"LP","nazev":"LP2025","lp_kody":["LP001"]}`
- `dodavatel_zpusob_potvrzeni` → Object: `{"zpusob_potvrzeni":["email"],"zpusob_platby":"prevod"}`
- `usek_zkr` → Array stringů: `["IT","HR"]`

### Workflow:
- Stavy uloženy v `stav_workflow_kod` oddělené `+`
- Příklad: `"NOVA+KE_SCHVALENI+SCHVALENA"`
- Poslední stav = aktuální stav

### Soft delete:
- Většina tabulek má sloupec `aktivni` (TINYINT)
- `aktivni = 1` → Aktivní záznam
- `aktivni = 0` → Smazaný (soft delete)

---

**Export schématu:** `/var/www/erdms-dev/docs/setup/database-schema-25.sql`

**Poslední update:** 5. prosince 2025  
**Autor:** GitHub Copilot
