-- Burza Sluzby: shift assignments (schvalene zarazeni sluzeb)
-- Spustit v databazi: burza-sluzby-dev

CREATE TABLE IF NOT EXISTS burza_sluzby_shift_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    availability_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    approver_id BIGINT UNSIGNED DEFAULT NULL,

    assigned_department VARCHAR(150) NOT NULL,
    assigned_start DATETIME NOT NULL,
    assigned_end DATETIME NOT NULL,

    metadata JSON DEFAULT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_burza_assignments_availability
        FOREIGN KEY (availability_id)
        REFERENCES burza_sluzby_availabilities(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_burza_assignments_user
        FOREIGN KEY (user_id)
        REFERENCES burza_sluzby_users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_burza_assignments_approver
        FOREIGN KEY (approver_id)
        REFERENCES burza_sluzby_users(id)
        ON DELETE SET NULL,

    KEY idx_burza_assignments_department (assigned_department),
    KEY idx_burza_assignments_time (assigned_start, assigned_end),
    KEY idx_burza_assignments_user_time (user_id, assigned_start),
    KEY idx_burza_assignments_availability (availability_id),

    CONSTRAINT chk_burza_assignments_time_range
        CHECK (assigned_end > assigned_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
