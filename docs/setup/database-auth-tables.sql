-- Tabulka pro sessions (přihlášení uživatelů)
CREATE TABLE IF NOT EXISTS erdms_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    entra_access_token TEXT,
    entra_refresh_token TEXT,
    entra_id_token TEXT,
    token_expires_at DATETIME,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES erdms_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_expires (token_expires_at),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Tabulka pro refresh tokeny (dlouhodobé přihlášení)
CREATE TABLE IF NOT EXISTS erdms_refresh_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    entra_refresh_token TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    ip_address VARCHAR(45),
    user_agent TEXT,
    revoked TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES erdms_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_revoked (revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Tabulka pro audit log přihlášení
CREATE TABLE IF NOT EXISTS erdms_auth_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED,
    username VARCHAR(100),
    event_type ENUM('login_success', 'login_failed', 'logout', 'token_refresh', 'token_revoked', 'password_change') NOT NULL,
    auth_method ENUM('entra_id', 'database', 'unknown') DEFAULT 'unknown',
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES erdms_users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
