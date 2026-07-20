-- Vehicles API v2.00 / App v0.75 - base schema
-- DEV only

CREATE TABLE IF NOT EXISTS vehicles_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  role_code ENUM('superadmin', 'administrator', 'fleet_manager', 'user') NOT NULL,
  auth_source ENUM('local', 'entra_id') NOT NULL DEFAULT 'local',
  approval_status ENUM('approved', 'pending') NOT NULL DEFAULT 'approved',
  entra_id VARCHAR(128) DEFAULT NULL,
  display_name VARCHAR(150) DEFAULT NULL,
  email VARCHAR(190) DEFAULT NULL,
  phone VARCHAR(40) DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL,
  last_activity_at DATETIME DEFAULT NULL,
  activity_meta_json LONGTEXT DEFAULT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  has_all_vehicles TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicles_users_username (username),
  UNIQUE KEY uq_vehicles_users_entra (entra_id),
  KEY idx_vehicles_users_role_active (role_code, is_active),
  KEY idx_vehicles_users_approval_active (approval_status, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

CREATE TABLE IF NOT EXISTS vehicles_user_vehicle_assignments (
  user_id INT UNSIGNED NOT NULL,
  vehicle_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, vehicle_id),
  KEY idx_vehicles_user_vehicle_assignments_vehicle (vehicle_id),
  KEY idx_vehicles_user_vehicle_assignments_vehicle_user (vehicle_id, user_id),
  CONSTRAINT fk_vehicles_user_vehicle_assignments_user
    FOREIGN KEY (user_id) REFERENCES vehicles_users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vehicles_user_vehicle_assignments_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles_cars_list_v2(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

CREATE TABLE IF NOT EXISTS vehicles_sync_jobs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_kind VARCHAR(60) NOT NULL,
  status ENUM('running', 'done', 'failed') NOT NULL,
  message VARCHAR(255) DEFAULT NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME DEFAULT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_vehicles_sync_jobs_kind_status (job_kind, status),
  KEY idx_vehicles_sync_jobs_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

CREATE TABLE IF NOT EXISTS vehicles_cars_list_v2 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_carid INT NOT NULL,
  spz VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  w_tovarni_znacka VARCHAR(120) DEFAULT NULL,
  w_model_vozu VARCHAR(120) DEFAULT NULL,
  w_typ_phm VARCHAR(80) DEFAULT NULL,
  w_cargroupid INT DEFAULT NULL,
  w_groupname VARCHAR(120) DEFAULT NULL,
  w_online TINYINT DEFAULT NULL,
  w_disabled TINYINT DEFAULT NULL,
  last_update DATETIME NOT NULL,
  migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicles_cars_list_v2_spz (spz),
  UNIQUE KEY uq_vehicles_cars_list_v2_legacy_carid (legacy_carid),
  KEY idx_vehicles_cars_list_v2_status (status),
  KEY idx_vehicles_cars_list_v2_brand_model (w_tovarni_znacka, w_model_vozu),
  KEY idx_vehicles_cars_list_v2_last_update (last_update)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
