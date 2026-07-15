-- Burza Sluzby: users table (Entra profile + local app data)
-- Spustit v databazi: burza-sluzby-dev
-- Poznamka: schema je navrzene tak, aby zustala kompatibilni s aktualnim API/UI

CREATE TABLE IF NOT EXISTS burza_sluzby_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- Entra identity keys
    entra_id VARCHAR(255) NOT NULL,
    username VARCHAR(128) NOT NULL,
    user_principal_name VARCHAR(255) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(64) DEFAULT NULL,

    -- Basic profile fields
    display_name VARCHAR(255) DEFAULT NULL,
    title_before VARCHAR(64) DEFAULT NULL,
    title_after VARCHAR(64) DEFAULT NULL,
    given_name VARCHAR(128) DEFAULT NULL,
    surname VARCHAR(128) DEFAULT NULL,
    department VARCHAR(255) DEFAULT NULL,
    job_title VARCHAR(255) DEFAULT NULL,

    -- Local app permissions/settings
    local_role ENUM('employee','doctor','head_doctor','paramedic','approver','admin') NOT NULL DEFAULT 'employee',
    access_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',

    -- Backward compatibility with current app UI (reads local_user.role)
    role VARCHAR(64) NOT NULL DEFAULT 'user',

    -- Full Entra payload + app settings
    entra_data JSON DEFAULT NULL,
    permissions_json JSON DEFAULT NULL,
    local_settings JSON DEFAULT NULL,
    local_login_enabled TINYINT(1) NOT NULL DEFAULT 0,
    local_login_username VARCHAR(128) DEFAULT NULL,
    local_password_hash VARCHAR(255) DEFAULT NULL,

    -- Lifecycle flags
    aktivni TINYINT(1) NOT NULL DEFAULT 1,
    local_note TEXT DEFAULT NULL,
    last_login_at DATETIME DEFAULT NULL,

    -- Auditing
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_burza_users_entra_id (entra_id),
    UNIQUE KEY uq_burza_users_username (username),
    UNIQUE KEY uq_burza_users_local_login_username (local_login_username),
    UNIQUE KEY uq_burza_users_upn (user_principal_name),

    KEY idx_burza_users_department (department),
    KEY idx_burza_users_local_role (local_role),
    KEY idx_burza_users_role (role),
    KEY idx_burza_users_aktivni (aktivni),
    KEY idx_burza_users_surname_given (surname, given_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
