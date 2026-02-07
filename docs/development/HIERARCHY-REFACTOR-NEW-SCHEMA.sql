-- NOVÁ JEDNODUCHÁ STRUKTURA PRO HIERARCHII
-- Každý záznam = jeden vztah (šipka) na canvasu

CREATE TABLE IF NOT EXISTS 25_hierarchie_vztahy (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    profil_id INT UNSIGNED NOT NULL,
    
    -- Typ vztahu
    typ_vztahu ENUM('user-user', 'location-user', 'user-location', 'department-user', 'user-department') NOT NULL,
    
    -- IDs podle typu
    user_id_1 INT UNSIGNED NULL, -- První uživatel (může být NULL)
    user_id_2 INT UNSIGNED NULL, -- Druhý uživatel (může být NULL)
    lokalita_id INT UNSIGNED NULL, -- Lokalita (pokud je v vztahu)
    usek_id INT UNSIGNED NULL, -- Útvar (pokud je v vztahu)
    
    -- Pozice nodes na canvasu (JSON)
    pozice_node_1 JSON NULL, -- {x: 100, y: 200} pro první node
    pozice_node_2 JSON NULL, -- {x: 300, y: 400} pro druhý node
    
    -- Oprávnění
    uroven_opravneni TINYINT DEFAULT 1,
    viditelnost_objednavky TINYINT(1) DEFAULT 0,
    viditelnost_faktury TINYINT(1) DEFAULT 0,
    viditelnost_smlouvy TINYINT(1) DEFAULT 0,
    viditelnost_pokladna TINYINT(1) DEFAULT 0,
    viditelnost_uzivatele TINYINT(1) DEFAULT 0,
    viditelnost_lp TINYINT(1) DEFAULT 0,
    
    -- Notifikace
    notifikace_email TINYINT(1) DEFAULT 0,
    notifikace_inapp TINYINT(1) DEFAULT 0,
    notifikace_typy JSON NULL,
    
    -- Metadata
    aktivni TINYINT(1) DEFAULT 1,
    dt_vytvoreni DATETIME DEFAULT CURRENT_TIMESTAMP,
    dt_upraveno DATETIME NULL,
    upravil_user_id INT UNSIGNED NULL,
    
    INDEX idx_profil (profil_id, aktivni),
    INDEX idx_user1 (user_id_1),
    INDEX idx_user2 (user_id_2),
    INDEX idx_lokalita (lokalita_id),
    INDEX idx_usek (usek_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- PŘÍKLADY POUŽITÍ:

-- user→user: Jan řídí Hanu
-- typ_vztahu='user-user', user_id_1=85, user_id_2=52, pozice_node_1={x:100,y:100}, pozice_node_2={x:300,y:200}

-- location→user: Všichni z Benešova mají nadřízeného RH ADMIN
-- typ_vztahu='location-user', lokalita_id=16, user_id_2=1, pozice_node_1={x:50,y:50}, pozice_node_2={x:250,y:150}

-- user→location: RH ADMIN vidí vše z Benešova
-- typ_vztahu='user-location', user_id_1=1, lokalita_id=16, pozice_node_1={x:100,y:100}, pozice_node_2={x:300,y:100}

-- department→user: Všichni z IT útvaru mají nadřízeného Jana
-- typ_vztahu='department-user', usek_id=5, user_id_2=85, pozice_node_1={x:0,y:0}, pozice_node_2={x:200,y:100}

-- user→department: Jan vidí celý IT útvar
-- typ_vztahu='user-department', user_id_1=85, usek_id=5, pozice_node_1={x:100,y:50}, pozice_node_2={x:300,y:50}
