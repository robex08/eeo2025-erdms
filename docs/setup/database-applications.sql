-- ============================================================================
-- ERDMS - Tabulka pro správu aplikací (Dashboard)
-- ============================================================================
-- Definuje aplikace dostupné přes ERDMS rozcestník
-- ============================================================================

CREATE TABLE `erdms_applications` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Kód aplikace (eeo, intranet, vozidla, szm)',
  `name` VARCHAR(100) NOT NULL COMMENT 'Název aplikace',
  `description` TEXT NULL COMMENT 'Popis aplikace',
  `url` VARCHAR(255) NOT NULL COMMENT 'URL adresa aplikace',
  `icon` VARCHAR(50) NULL COMMENT 'Ikona pro dashboard (např. document, car, cart)',
  `color` VARCHAR(20) NULL COMMENT 'Barva pro dashboard (hex nebo název)',
  `order` SMALLINT(6) NOT NULL DEFAULT 0 COMMENT 'Pořadí zobrazení na dashboardu',
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = skrytá, 1 = aktivní',
  `requires_role` VARCHAR(50) NULL COMMENT 'Minimální role (admin, manager, user)',
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `aktivni` (`aktivni`),
  KEY `order` (`order`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
COMMENT='Aplikace dostupné přes ERDMS rozcestník';


-- ============================================================================
-- Inicializační data - 4 základní aplikace ZZS
-- ============================================================================

INSERT INTO `erdms_applications` (
  `code`, `name`, `description`, `url`, `icon`, `color`, `order`, `aktivni`, `requires_role`
) VALUES
  (
    'eeo',
    'EEO - Evidence elektronických objednávek',
    'Systém pro správu a evidenci elektronických objednávek',
    'https://eeo.zachranka.cz',
    'document',
    '#3b82f6',
    10,
    1,
    'user'
  ),
  (
    'intranet',
    'Intranet ZZS',
    'Interní portál Zdravotnické záchranné služby',
    'https://intranet.zachranka.cz',
    'home',
    '#10b981',
    20,
    1,
    'user'
  ),
  (
    'vozidla',
    'Správa vozového parku',
    'Evidence a správa vozidel ZZS',
    'https://vozidla.zachranka.cz',
    'car',
    '#f59e0b',
    30,
    1,
    'user'
  ),
  (
    'szm',
    'SZM - Sklad zdravotnického materiálu',
    'E-Shop systém pro objednávání zdravotnického materiálu',
    'https://szm.zachranka.cz',
    'cart',
    '#ef4444',
    40,
    1,
    'user'
  );


-- ============================================================================
-- Tabulka: Uživatelská oprávnění k aplikacím
-- ============================================================================
-- M:N vztah mezi uživateli a aplikacemi s detailními oprávněními
-- ============================================================================

CREATE TABLE `erdms_user_app_permissions` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(10) UNSIGNED NOT NULL COMMENT 'ID uživatele',
  `app_id` INT(10) UNSIGNED NOT NULL COMMENT 'ID aplikace',
  
  -- Oprávnění
  `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = zakázáno, 1 = povoleno',
  `permissions` JSON NULL COMMENT 'Detailní oprávnění k aplikaci (read, write, delete, admin)',
  
  -- Metadata
  `dt_prideleno` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  `pridelit_kym` INT(10) UNSIGNED NULL COMMENT 'Kdo přidělil oprávnění (admin user_id)',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_app` (`user_id`, `app_id`),
  KEY `user_id` (`user_id`),
  KEY `app_id` (`app_id`),
  KEY `enabled` (`enabled`),
  
  CONSTRAINT `fk_user_app_user` FOREIGN KEY (`user_id`) 
    REFERENCES `erdms_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_app_application` FOREIGN KEY (`app_id`) 
    REFERENCES `erdms_applications` (`id`) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
COMMENT='Oprávnění uživatelů k jednotlivým aplikacím';


-- ============================================================================
-- PŘÍKLAD: Přidělení oprávnění uživateli
-- ============================================================================

-- Přidělení všech 4 aplikací uživateli s ID 42 (Jan Novák - u03924)
INSERT INTO `erdms_user_app_permissions` 
  (`user_id`, `app_id`, `enabled`, `permissions`, `pridelit_kym`)
VALUES
  -- EEO - plná práva
  (42, 1, 1, JSON_OBJECT('read', true, 'write', true, 'delete', false, 'export', true), 1),
  
  -- Intranet - jen čtení
  (42, 2, 1, JSON_OBJECT('read', true, 'write', false), 1),
  
  -- Vozidla - čtení + zápis
  (42, 3, 1, JSON_OBJECT('read', true, 'write', true, 'delete', false), 1),
  
  -- SZM - objednávání
  (42, 4, 1, JSON_OBJECT('read', true, 'order', true, 'manage_cart', true), 1);


-- ============================================================================
-- SQL DOTAZY pro práci s oprávněními
-- ============================================================================

-- 1. Získat všechny aplikace dostupné pro uživatele (pro dashboard)
SELECT 
  a.id,
  a.code,
  a.name,
  a.description,
  a.url,
  a.icon,
  a.color,
  a.order,
  uap.permissions
FROM erdms_applications a
INNER JOIN erdms_user_app_permissions uap ON a.id = uap.app_id
WHERE uap.user_id = ? 
  AND uap.enabled = 1 
  AND a.aktivni = 1
ORDER BY a.order ASC;


-- 2. Zkontrolovat, jestli uživatel má přístup k aplikaci
SELECT 
  uap.enabled,
  uap.permissions
FROM erdms_user_app_permissions uap
INNER JOIN erdms_applications a ON uap.app_id = a.id
WHERE uap.user_id = ?
  AND a.code = ?  -- např. 'eeo'
LIMIT 1;


-- 3. Přidělit novou aplikaci uživateli
INSERT INTO erdms_user_app_permissions 
  (user_id, app_id, enabled, permissions, pridelit_kym)
SELECT 
  ?, 
  id, 
  1, 
  JSON_OBJECT('read', true, 'write', false),
  ?
FROM erdms_applications
WHERE code = ?;


-- 4. Odebrat přístup k aplikaci
DELETE FROM erdms_user_app_permissions
WHERE user_id = ? AND app_id = (
  SELECT id FROM erdms_applications WHERE code = ?
);


-- 5. Aktualizovat oprávnění k aplikaci
UPDATE erdms_user_app_permissions
SET permissions = JSON_SET(
  permissions,
  '$.write', true,
  '$.delete', true
)
WHERE user_id = ? 
  AND app_id = (SELECT id FROM erdms_applications WHERE code = ?);


-- ============================================================================
-- ALTERNATIVNÍ ŘEŠENÍ: Oprávnění v JSON poli u uživatele
-- ============================================================================
-- Místo samostatné tabulky můžete použít JSON pole přímo v erdms_users
-- Výhoda: Rychlejší čtení (1 dotaz), jednodušší
-- Nevýhoda: Složitější správa, indexy

/*
-- V tabulce erdms_users:
`app_permissions` JSON NULL

-- Příklad struktury JSON:
{
  "eeo": {
    "enabled": true,
    "permissions": {
      "read": true,
      "write": true,
      "delete": false,
      "export": true
    }
  },
  "intranet": {
    "enabled": true,
    "permissions": {
      "read": true,
      "write": false
    }
  },
  "vozidla": {
    "enabled": true,
    "permissions": {
      "read": true,
      "write": true
    }
  },
  "szm": {
    "enabled": true,
    "permissions": {
      "read": true,
      "order": true
    }
  }
}

-- SQL dotaz pro získání dostupných aplikací:
SELECT 
  a.id,
  a.code,
  a.name,
  a.url,
  a.icon,
  JSON_EXTRACT(u.app_permissions, CONCAT('$.', a.code, '.permissions')) as permissions
FROM erdms_applications a
CROSS JOIN erdms_users u
WHERE u.id = ?
  AND JSON_EXTRACT(u.app_permissions, CONCAT('$.', a.code, '.enabled')) = true
  AND a.aktivni = 1
ORDER BY a.order;
*/


-- ============================================================================
-- DOPORUČENÍ: Která varianta použít?
-- ============================================================================

-- VARIANTA A: Samostatná tabulka erdms_user_app_permissions
-- ✅ Lepší normalizace
-- ✅ Snadnější správa přes admin rozhraní
-- ✅ Možnost auditovat změny (dt_prideleno, pridelit_kym)
-- ✅ Rychlejší přidávání/odebírání aplikací
-- ❌ Více SQL dotazů (JOIN)

-- VARIANTA B: JSON pole v erdms_users.app_permissions
-- ✅ Rychlejší čtení (1 dotaz)
-- ✅ Jednodušší migrace (jeden sloupec)
-- ❌ Složitější správa
-- ❌ Horší indexování
-- ❌ Obtížnější hledání "kdo má přístup k aplikaci X"

-- 🎯 DOPORUČUJI: VARIANTU A (samostatná tabulka)
--    Pro 4-10 aplikací je to čistější řešení s lepší správou


-- ============================================================================
-- MIGRACE: Pokud už máte JSON v erdms_users
-- ============================================================================

-- Přesun dat z JSON do tabulky
INSERT INTO erdms_user_app_permissions (user_id, app_id, enabled, permissions)
SELECT 
  u.id as user_id,
  a.id as app_id,
  JSON_EXTRACT(u.app_permissions, CONCAT('$.', a.code, '.enabled')) as enabled,
  JSON_EXTRACT(u.app_permissions, CONCAT('$.', a.code, '.permissions')) as permissions
FROM erdms_users u
CROSS JOIN erdms_applications a
WHERE JSON_EXTRACT(u.app_permissions, CONCAT('$.', a.code)) IS NOT NULL;

-- Pak můžete smazat sloupec app_permissions z erdms_users
-- ALTER TABLE erdms_users DROP COLUMN app_permissions;


-- ============================================================================
-- HOTOVO!
-- ============================================================================
-- Po spuštění tohoto scriptu budete mít:
-- ✓ Tabulku aplikací (erdms_applications) s 4 základními aplikacemi
-- ✓ Tabulku oprávnění (erdms_user_app_permissions)
-- ✓ SQL dotazy pro práci s oprávněními
-- ✓ Připraveno pro ERDMS dashboard rozcestník
-- ============================================================================
