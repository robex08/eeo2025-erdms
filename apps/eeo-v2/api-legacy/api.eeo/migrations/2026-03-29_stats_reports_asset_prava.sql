-- ============================================================
-- Migrace: Stats & Reports + Asset Overview oprávnění
-- Datum: 2026-03-29
-- Popis: Přidání oprávnění pro nové moduly:
--   1) Statistika a reporty (nahrazuje samostatné Reporty + Statistiky)
--   2) Přehled majetku
-- + Vytvoření tabulek pro Finanční kontrolu (fk_sledovani)
--
-- Skript je idempotentní – lze spustit opakovaně.
-- DEV:  tabulky 25a_fk_sledovani* jsou CREATE IF NOT EXISTS → přeskočí
-- PROD: tabulky neexistují → vytvoří prázdné struktury
-- ============================================================

-- ============================================================
-- ČÁST A: Tabulky pro Finanční kontrolu
-- (v DEV již existují, v PROD se vytvoří jako prázdné struktury)
-- ============================================================

CREATE TABLE IF NOT EXISTS `25a_fk_sledovani` (
  `id`                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `objednavka_id`       INT             NOT NULL DEFAULT 0
                        COMMENT '0 = entita je pouze faktura',
  `faktura_id`          INT             NOT NULL DEFAULT 0
                        COMMENT '0 = entita je pouze objednávka',
  `entita_typ`          VARCHAR(20)     NOT NULL DEFAULT 'OBJ'
                        COMMENT 'OBJ | FA | OBJ_FA',
  `section_kontext`     VARCHAR(50)     NULL     DEFAULT NULL
                        COMMENT 'Kód záložky kde byl případ otevřen',
  `stav`                VARCHAR(20)     NOT NULL DEFAULT 'OPEN'
                        COMMENT 'OPEN | IN_PROGRESS | RESOLVED | IGNORED',
  `priorita`            TINYINT         NOT NULL DEFAULT 1,
  `vyzaduje_akci`       TINYINT(1)      NOT NULL DEFAULT 0,
  `prirazeno_user_id`   INT             NULL     DEFAULT NULL,
  `vytvoril_user_id`    INT             NOT NULL,
  `uzavrel_user_id`     INT             NULL     DEFAULT NULL,
  `upravil_user_id`     INT             NULL     DEFAULT NULL,
  `dt_vytvoreni`        DATETIME        NOT NULL,
  `dt_uzavreni`         DATETIME        NULL     DEFAULT NULL,
  `dt_upravy`           DATETIME        NULL     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_obj_fa` (`objednavka_id`, `faktura_id`),
  KEY `idx_stav`               (`stav`),
  KEY `idx_prirazeno`          (`prirazeno_user_id`),
  KEY `idx_dt_vytvoreni`       (`dt_vytvoreni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
  COMMENT='Sledování případů finanční kontroly k objednávkám/fakturám';

CREATE TABLE IF NOT EXISTS `25a_fk_sledovani_udalosti` (
  `id`                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `sledovani_id`        INT UNSIGNED    NOT NULL,
  `typ`                 VARCHAR(50)     NOT NULL
                        COMMENT 'AUTO_SYSTEM | ZMENA_STAVU | ZMENA_PRIORITY | ZMENA_VYZADUJE_AKCI | PRIRAZENI | KOMENTAR',
  `text_zprava`         TEXT            NULL     DEFAULT NULL,
  `stav_pred`           VARCHAR(30)     NULL     DEFAULT NULL,
  `stav_po`             VARCHAR(30)     NULL     DEFAULT NULL,
  `vytvoril_user_id`    INT             NULL     DEFAULT NULL,
  `dt_vytvoreni`        DATETIME        NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sledovani_id`  (`sledovani_id`),
  KEY `idx_dt_vytvoreni`  (`dt_vytvoreni`),
  CONSTRAINT `fk_udalosti_sledovani`
    FOREIGN KEY (`sledovani_id`)
    REFERENCES `25a_fk_sledovani` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
  COMMENT='Události (audit log) ke sledovaným případům finanční kontroly';

-- ============================================================
-- ČÁST B: Nová oprávnění v číselníku 25_prava
-- ============================================================

-- --- Finanční kontrola (tab: control) ---
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'FIN_CONTROL_VIEW', 'Statistika a reporty – Finanční kontrola – zobrazení', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'FIN_CONTROL_VIEW');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'FIN_CONTROL_EDIT', 'Statistika a reporty – Finanční kontrola – editace', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'FIN_CONTROL_EDIT');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'FIN_CONTROL_MANAGE', 'Statistika a reporty – Finanční kontrola – správa', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'FIN_CONTROL_MANAGE');

-- --- Vzdělávání (tab: vzdel) ---
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'EDUCATION_VIEW', 'Statistika a reporty – Vzdělávání – zobrazení', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'EDUCATION_VIEW');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'EDUCATION_EDIT', 'Statistika a reporty – Vzdělávání – editace', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'EDUCATION_EDIT');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'EDUCATION_MANAGE', 'Statistika a reporty – Vzdělávání – správa', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'EDUCATION_MANAGE');

-- --- Přílohy (tab: attachments) ---
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'ATTACHMENTS_VIEW', 'Statistika a reporty – Přílohy – zobrazení', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'ATTACHMENTS_VIEW');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'ATTACHMENTS_MANAGE', 'Statistika a reporty – Přílohy – správa', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'ATTACHMENTS_MANAGE');

-- --- Agregační tabulka (tab: pivot) ---
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'PIVOT_VIEW', 'Statistika a reporty – Agregační tabulka – zobrazení', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'PIVOT_VIEW');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'PIVOT_EDIT', 'Statistika a reporty – Agregační tabulka – editace', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'PIVOT_EDIT');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'PIVOT_MANAGE', 'Statistika a reporty – Agregační tabulka – správa', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'PIVOT_MANAGE');

-- --- Rozšíření stávajících tab: Reporty + Statistiky ---
-- (REPORT_VIEW, STATISTICS_VIEW, REPORT_MANAGE, STATISTICS_MANAGE, REPORT_EXPORT, STATISTICS_EXPORT již existují)
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'REPORT_EDIT', 'Statistika a reporty – Reporty – editace', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'REPORT_EDIT');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'STATISTICS_EDIT', 'Statistika a reporty – Statistiky – editace', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'STATISTICS_EDIT');

-- --- Přehled majetku ---
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'ASSET_VIEW', 'Přehled majetku – zobrazení', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'ASSET_VIEW');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'ASSET_MANAGE', 'Přehled majetku – správa', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'ASSET_MANAGE');

INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'ASSET_EXPORT', 'Přehled majetku – export', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'ASSET_EXPORT');

-- ============================================================
-- ČÁST C: Přiřazení nových oprávnění rolím SUPERADMIN + ADMINISTRATOR
-- ============================================================

-- Pomocný seznam nových oprávnění k hromadnému přiřazení rolím:
--   FIN_CONTROL_VIEW, FIN_CONTROL_EDIT, FIN_CONTROL_MANAGE
--   EDUCATION_VIEW, EDUCATION_EDIT, EDUCATION_MANAGE
--   ATTACHMENTS_VIEW, ATTACHMENTS_MANAGE
--   PIVOT_VIEW, PIVOT_EDIT, PIVOT_MANAGE
--   REPORT_EDIT, STATISTICS_EDIT
--   ASSET_VIEW, ASSET_MANAGE, ASSET_EXPORT

-- SUPERADMIN
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
SELECT -1, r.id, p.id, 1
FROM 25_role r
JOIN 25_prava p ON p.kod_prava IN (
    'FIN_CONTROL_VIEW', 'FIN_CONTROL_EDIT', 'FIN_CONTROL_MANAGE',
    'EDUCATION_VIEW', 'EDUCATION_EDIT', 'EDUCATION_MANAGE',
    'ATTACHMENTS_VIEW', 'ATTACHMENTS_MANAGE',
    'PIVOT_VIEW', 'PIVOT_EDIT', 'PIVOT_MANAGE',
    'REPORT_EDIT', 'STATISTICS_EDIT',
    'ASSET_VIEW', 'ASSET_MANAGE', 'ASSET_EXPORT'
)
WHERE r.kod_role = 'SUPERADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM 25_role_prava rp
      WHERE rp.user_id = -1
        AND rp.role_id = r.id
        AND rp.pravo_id = p.id
  );

-- ADMINISTRATOR
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
SELECT -1, r.id, p.id, 1
FROM 25_role r
JOIN 25_prava p ON p.kod_prava IN (
    'FIN_CONTROL_VIEW', 'FIN_CONTROL_EDIT', 'FIN_CONTROL_MANAGE',
    'EDUCATION_VIEW', 'EDUCATION_EDIT', 'EDUCATION_MANAGE',
    'ATTACHMENTS_VIEW', 'ATTACHMENTS_MANAGE',
    'PIVOT_VIEW', 'PIVOT_EDIT', 'PIVOT_MANAGE',
    'REPORT_EDIT', 'STATISTICS_EDIT',
    'ASSET_VIEW', 'ASSET_MANAGE', 'ASSET_EXPORT'
)
WHERE r.kod_role = 'ADMINISTRATOR'
  AND NOT EXISTS (
      SELECT 1 FROM 25_role_prava rp
      WHERE rp.user_id = -1
        AND rp.role_id = r.id
        AND rp.pravo_id = p.id
  );

-- ============================================================
-- Konec migrace
-- ============================================================
