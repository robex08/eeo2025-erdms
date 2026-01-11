-- =====================================================
-- NOTIFICATION HIERARCHY SYSTEM - Database Schema
-- =====================================================
-- 
-- Tato tabulka ukládá vizuální org. hierarchii pro notifikace
-- Každý profil obsahuje JSON strukturu s nodes a edges
-- 
-- Node typy:
--   - template: Šablona notifikace s eventTypes[]
--   - user: Konkrétní uživatel (z 25_uzivatele)
--   - role: Role (z 25_user_roles)
--   - location: Lokalita (z 25_lokality)
--   - department: Oddělení/Úsek (z 25_useky)
--
-- Edge typ:
--   - notification: Šipka z Template k příjemci
--     - data.notifications.types[] = eventTypes které triggerují
--
-- =====================================================

CREATE TABLE IF NOT EXISTS `25_hierarchy_profiles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nazev` VARCHAR(100) NOT NULL,
  `popis` TEXT,
  `aktivni` TINYINT(1) NOT NULL DEFAULT 0,
  `structure_json` LONGTEXT NOT NULL COMMENT 'JSON with {nodes: [], edges: []}',
  `vytvoril_user_id` INT UNSIGNED,
  `dt_vytvoreno` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_upraveno` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uniq_nazev` (`nazev`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_vytvoril` (`vytvoril_user_id`),
  
  CONSTRAINT `fk_hierarchy_profiles_user` 
    FOREIGN KEY (`vytvoril_user_id`) 
    REFERENCES `25_uzivatele`(`id`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Visual notification hierarchy profiles with graph structure';

-- =====================================================
-- Příklad struktury JSON:
-- =====================================================
-- {
--   "nodes": [
--     {
--       "id": "template-order-approved",
--       "typ": "template",
--       "pozice": {"x": 100, "y": 100},
--       "data": {
--         "label": "Objednávka schválena",
--         "eventTypes": ["ORDER_APPROVED", "ORDER_REJECTED"]
--       }
--     },
--     {
--       "id": "role-ucetni",
--       "typ": "role",
--       "pozice": {"x": 300, "y": 100},
--       "data": {
--         "role_id": 5,
--         "role_name": "UCETNI"
--       }
--     },
--     {
--       "id": "user-123",
--       "typ": "user",
--       "pozice": {"x": 500, "y": 100},
--       "data": {
--         "uzivatel_id": 123,
--         "username": "robert",
--         "full_name": "Robert Novák"
--       }
--     }
--   ],
--   "edges": [
--     {
--       "id": "edge-1",
--       "source": "template-order-approved",
--       "target": "role-ucetni",
--       "typ": "notification",
--       "data": {
--         "notifications": {
--           "types": ["ORDER_APPROVED"],
--           "channels": {
--             "email": true,
--             "inapp": true
--           }
--         }
--       }
--     },
--     {
--       "id": "edge-2",
--       "source": "template-order-approved",
--       "target": "user-123",
--       "typ": "notification",
--       "data": {
--         "notifications": {
--           "types": ["ORDER_REJECTED"],
--           "channels": {
--             "email": true,
--             "inapp": false
--           }
--         }
--       }
--     }
--   ]
-- }
