-- Burza Sluzby: availabilities table (volne terminy zamestnancu)
-- Spustit v databazi: burza-sluzby-dev

CREATE TABLE IF NOT EXISTS burza_sluzby_availabilities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    employee_note TEXT DEFAULT NULL,
    metadata JSON DEFAULT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_burza_availabilities_user
        FOREIGN KEY (user_id)
        REFERENCES burza_sluzby_users(id)
        ON DELETE CASCADE,

    KEY idx_burza_availabilities_status (status),
    KEY idx_burza_availabilities_start_time (start_time),
    KEY idx_burza_availabilities_end_time (end_time),
    KEY idx_burza_availabilities_user_status (user_id, status),

    CONSTRAINT chk_burza_availabilities_time_range
        CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
