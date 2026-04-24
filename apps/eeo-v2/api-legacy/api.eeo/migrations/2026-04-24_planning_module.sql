-- Modul plánování a rezervačního kalendáře
-- Popis: Správa zpráv pro dashboard a plánovaných událostí s podporou org. hierarchie
-- Datum: 2026-04-24
-- Autor: GitHub Copilot
-- Poznámka: Skript je idempotentní (lze spustit opakovaně)

-- ============================================================================
-- ČÁST 1: Vytvoření tabulek pro plánování
-- ============================================================================

-- Tabulka 1: Zprávy pro dashboard
CREATE TABLE IF NOT EXISTS `25_plan_zpravy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nazev` VARCHAR(255) NOT NULL COMMENT 'Název zprávy',
  `obsah` TEXT NULL COMMENT 'Obsah zprávy',
  `typ` ENUM('info','warning','alert','success') DEFAULT 'info' COMMENT 'Typ zprávy - ovlivní barvu a ikonu',
  `barva` VARCHAR(20) NULL COMMENT 'Vlastní hex barva (override)',
  `priorita` TINYINT(4) DEFAULT 0 COMMENT 'Priorita zobrazení (vyšší = důležitější)',
  `autor_id` INT(11) NOT NULL COMMENT 'ID autora (FK 25_uzivatele)',
  `dt_od` DATETIME NULL COMMENT 'Platnost od (NULL = ihned)',
  `dt_do` DATETIME NULL COMMENT 'Platnost do (NULL = neomezeně)',
  `vyzaduje_potvrzeni` TINYINT(1) DEFAULT 0 COMMENT 'Vyžaduje reakci uživatele',
  `typ_odpovedi` ENUM('acknowledge','accept_decline','rsvp') DEFAULT 'acknowledge' COMMENT 'Typ požadované odpovědi',
  `pouzit_hierarchii` TINYINT(1) DEFAULT 0 COMMENT 'Použít org. hierarchii pro targeting',
  `hierarchy_profile_id` INT(11) NULL COMMENT 'ID hierarchického profilu (FK 25_hierarchie_profily)',
  `dt_created` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `dt_updated` DATETIME NULL COMMENT 'Datum poslední úpravy',
  `aktivni` TINYINT(1) DEFAULT 1 COMMENT 'Aktivní záznam (soft delete)',
  PRIMARY KEY (`id`),
  KEY `idx_autor` (`autor_id`),
  KEY `idx_platnost` (`dt_od`, `dt_do`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_hierarchie` (`pouzit_hierarchii`, `hierarchy_profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Zprávy pro dashboard';

-- Tabulka 2: Příjemci zpráv
CREATE TABLE IF NOT EXISTS `25_plan_zpravy_prijemci` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `zprava_id` INT(11) NOT NULL COMMENT 'ID zprávy (FK 25_plan_zpravy)',
  `typ_prijemce` ENUM('role','user') NOT NULL COMMENT 'Typ příjemce - role nebo konkrétní uživatel',
  `kod_role` VARCHAR(50) NULL COMMENT 'Kód role (pokud typ=role)',
  `user_id` INT(11) NULL COMMENT 'ID uživatele (pokud typ=user)',
  `dt_created` DATETIME NOT NULL COMMENT 'Datum přiřazení',
  PRIMARY KEY (`id`),
  KEY `idx_zprava` (`zprava_id`),
  KEY `idx_role` (`kod_role`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_zpravy_prijemci_zprava` FOREIGN KEY (`zprava_id`) REFERENCES `25_plan_zpravy` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Příjemci zpráv (explicitní targeting)';

-- Tabulka 3: Odpovědi uživatelů na zprávy
CREATE TABLE IF NOT EXISTS `25_plan_zpravy_odpovedi` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `zprava_id` INT(11) NOT NULL COMMENT 'ID zprávy (FK 25_plan_zpravy)',
  `user_id` INT(11) NOT NULL COMMENT 'ID uživatele (FK 25_uzivatele)',
  `typ_odpovedi` ENUM('acknowledged','accepted','declined','rsvp_yes','rsvp_no') NOT NULL COMMENT 'Typ odpovědi uživatele',
  `poznamka` TEXT NULL COMMENT 'Textová poznámka k odpovědi',
  `dt_odpovedi` DATETIME NOT NULL COMMENT 'Datum a čas odpovědi',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_zprava_user` (`zprava_id`, `user_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_zpravy_odpovedi_zprava` FOREIGN KEY (`zprava_id`) REFERENCES `25_plan_zpravy` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Odpovědi uživatelů na zprávy';

-- Tabulka 4: Plánované události/termíny
CREATE TABLE IF NOT EXISTS `25_plan_udalosti` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nazev` VARCHAR(255) NOT NULL COMMENT 'Název události',
  `popis` TEXT NULL COMMENT 'Popis události',
  `lokace` VARCHAR(255) NULL COMMENT 'Místo konání',
  `typ` ENUM('event','deadline','meeting','reminder') DEFAULT 'event' COMMENT 'Typ události',
  `barva` VARCHAR(20) DEFAULT '#1d4ed8' COMMENT 'Barva události v kalendáři (hex)',
  `dt_od` DATETIME NOT NULL COMMENT 'Datum a čas začátku',
  `dt_do` DATETIME NULL COMMENT 'Datum a čas konce (NULL pro událost bez konce)',
  `cely_den` TINYINT(1) DEFAULT 0 COMMENT 'Celodenní událost',
  `autor_id` INT(11) NOT NULL COMMENT 'ID autora (FK 25_uzivatele)',
  `vyzaduje_odpoved` TINYINT(1) DEFAULT 0 COMMENT 'Vyžaduje reakci uživatele',
  `typ_odpovedi` ENUM('acknowledge','accept_decline','rsvp') DEFAULT 'acknowledge' COMMENT 'Typ požadované odpovědi',
  `pouzit_hierarchii` TINYINT(1) DEFAULT 0 COMMENT 'Použít org. hierarchii pro targeting',
  `hierarchy_profile_id` INT(11) NULL COMMENT 'ID hierarchického profilu (FK 25_hierarchie_profily)',
  `dt_created` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `dt_updated` DATETIME NULL COMMENT 'Datum poslední úpravy',
  `aktivni` TINYINT(1) DEFAULT 1 COMMENT 'Aktivní záznam (soft delete)',
  PRIMARY KEY (`id`),
  KEY `idx_autor` (`autor_id`),
  KEY `idx_datum` (`dt_od`, `dt_do`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_hierarchie` (`pouzit_hierarchii`, `hierarchy_profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Plánované události a termíny';

-- Tabulka 5: Příjemci událostí
CREATE TABLE IF NOT EXISTS `25_plan_udalosti_prijemci` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `udalost_id` INT(11) NOT NULL COMMENT 'ID události (FK 25_plan_udalosti)',
  `typ_prijemce` ENUM('role','user') NOT NULL COMMENT 'Typ příjemce - role nebo konkrétní uživatel',
  `kod_role` VARCHAR(50) NULL COMMENT 'Kód role (pokud typ=role)',
  `user_id` INT(11) NULL COMMENT 'ID uživatele (pokud typ=user)',
  `dt_created` DATETIME NOT NULL COMMENT 'Datum přiřazení',
  PRIMARY KEY (`id`),
  KEY `idx_udalost` (`udalost_id`),
  KEY `idx_role` (`kod_role`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_udalosti_prijemci_udalost` FOREIGN KEY (`udalost_id`) REFERENCES `25_plan_udalosti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Příjemci událostí (explicitní targeting)';

-- Tabulka 6: Odpovědi uživatelů na události
CREATE TABLE IF NOT EXISTS `25_plan_udalosti_odpovedi` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `udalost_id` INT(11) NOT NULL COMMENT 'ID události (FK 25_plan_udalosti)',
  `user_id` INT(11) NOT NULL COMMENT 'ID uživatele (FK 25_uzivatele)',
  `typ_odpovedi` ENUM('acknowledged','accepted','declined','rsvp_yes','rsvp_no') NOT NULL COMMENT 'Typ odpovědi uživatele',
  `poznamka` TEXT NULL COMMENT 'Textová poznámka k odpovědi',
  `dt_odpovedi` DATETIME NOT NULL COMMENT 'Datum a čas odpovědi',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_udalost_user` (`udalost_id`, `user_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_udalosti_odpovedi_udalost` FOREIGN KEY (`udalost_id`) REFERENCES `25_plan_udalosti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Odpovědi uživatelů na události';

-- ============================================================================
-- ČÁST 2: Založení oprávnění
-- ============================================================================
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'PLANNING_MANAGE', 'Správa plánování a rezervačního kalendáře', 1
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM 25_prava WHERE kod_prava = 'PLANNING_MANAGE'
);

-- ============================================================================
-- ČÁST 3: Přiřazení práva k roli SUPERADMIN
-- ============================================================================
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
SELECT -1, r.id, p.id, 1
FROM 25_role r
JOIN 25_prava p ON p.kod_prava = 'PLANNING_MANAGE'
WHERE r.kod_role = 'SUPERADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM 25_role_prava rp
      WHERE rp.user_id = -1
        AND rp.role_id = r.id
        AND rp.pravo_id = p.id
  );

-- ============================================================================
-- ČÁST 4: Event typy pro hierarchii (notifikace)
-- ============================================================================
INSERT INTO 25_notifikace_typy_udalosti (kod, nazev, kategorie, popis, modul, aktivni)
SELECT 'PLANNING_MESSAGE_CREATED', 'Nová zpráva na dashboardu', 'planning', 'Vytvoření nové zprávy v modulu plánování', 'planning', 1
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM 25_notifikace_typy_udalosti WHERE kod = 'PLANNING_MESSAGE_CREATED'
);

INSERT INTO 25_notifikace_typy_udalosti (kod, nazev, kategorie, popis, modul, aktivni)
SELECT 'PLANNING_EVENT_CREATED', 'Nová událost v kalendáři', 'planning', 'Vytvoření nové události v rezervačním kalendáři', 'planning', 1
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM 25_notifikace_typy_udalosti WHERE kod = 'PLANNING_EVENT_CREATED'
);

INSERT INTO 25_notifikace_typy_udalosti (kod, nazev, kategorie, popis, modul, aktivni)
SELECT 'PLANNING_MESSAGE_RESPONSE', 'Odpověď na zprávu', 'planning', 'Uživatel reagoval na zprávu z modulu plánování', 'planning', 1
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM 25_notifikace_typy_udalosti WHERE kod = 'PLANNING_MESSAGE_RESPONSE'
);

INSERT INTO 25_notifikace_typy_udalosti (kod, nazev, kategorie, popis, modul, aktivni)
SELECT 'PLANNING_EVENT_RESPONSE', 'Odpověď na událost', 'planning', 'Uživatel reagoval na kalendářovou událost', 'planning', 1
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM 25_notifikace_typy_udalosti WHERE kod = 'PLANNING_EVENT_RESPONSE'
);

-- ============================================================================
-- KONEC SKRIPTU
-- ============================================================================
-- Po spuštění tohoto skriptu:
-- 1. Vytvořeno 6 tabulek pro modul plánování
-- 2. Založeno oprávnění PLANNING_MANAGE
-- 3. SUPERADMIN automaticky vidí modul plánování
-- 4. Vytvořeny event typy pro org. hierarchii
-- 5. Modul je připraven pro backend a frontend implementaci
