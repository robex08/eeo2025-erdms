-- DEV seed pro lokalni admin ucet u03924.
-- Hash je vytvoren pro heslo Bur.010149X*.

ALTER TABLE burza_sluzby_users
    ADD COLUMN IF NOT EXISTS local_password_hash VARCHAR(255) DEFAULT NULL AFTER local_settings;

ALTER TABLE burza_sluzby_users
    ADD COLUMN IF NOT EXISTS local_login_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER local_settings;

ALTER TABLE burza_sluzby_users
    ADD COLUMN IF NOT EXISTS local_login_username VARCHAR(128) DEFAULT NULL AFTER local_login_enabled;

INSERT INTO burza_sluzby_users (
    entra_id,
    username,
    user_principal_name,
    email,
    display_name,
    given_name,
    surname,
    department,
    job_title,
    local_role,
    role,
    entra_data,
    permissions_json,
    local_settings,
    local_login_enabled,
    local_login_username,
    local_password_hash,
    aktivni,
    local_note,
    last_login_at,
    created_at,
    updated_at
) VALUES (
    'local:u03924',
    'u03924',
    NULL,
    NULL,
    'u03924',
    NULL,
    NULL,
    NULL,
    NULL,
    'admin',
    'admin',
    NULL,
    '[]',
    NULL,
    1,
    'u03924',
    '$2y$12$xSNvtLyggv1nlkAkS/z4E./A5o1JR6GOQ/xsN00JJkPSkRyNx0dLi',
    1,
    'DEV local admin account',
    NULL,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    local_role = 'admin',
    role = 'admin',
    local_login_enabled = 1,
    local_login_username = VALUES(local_login_username),
    local_password_hash = VALUES(local_password_hash),
    aktivni = 1,
    local_note = VALUES(local_note),
    updated_at = NOW();