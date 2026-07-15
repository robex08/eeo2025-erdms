-- Burza Sluzby: audit actor columns for CRUD tracking
-- Spustit v databazi: burza-sluzby-dev

ALTER TABLE burza_sluzby_users
    ADD COLUMN IF NOT EXISTS created_by BIGINT UNSIGNED NULL AFTER local_password_hash,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT UNSIGNED NULL AFTER created_by,
    ADD KEY idx_burza_users_created_by (created_by),
    ADD KEY idx_burza_users_updated_by (updated_by);

ALTER TABLE burza_sluzby_users
    ADD CONSTRAINT fk_burza_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES burza_sluzby_users(id)
        ON DELETE SET NULL,
    ADD CONSTRAINT fk_burza_users_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES burza_sluzby_users(id)
        ON DELETE SET NULL;

ALTER TABLE burza_sluzby_availabilities
    ADD COLUMN IF NOT EXISTS created_by BIGINT UNSIGNED NULL AFTER user_id,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT UNSIGNED NULL AFTER created_by,
    ADD KEY idx_burza_availabilities_created_by (created_by),
    ADD KEY idx_burza_availabilities_updated_by (updated_by);

UPDATE burza_sluzby_availabilities
SET created_by = user_id,
    updated_by = COALESCE(updated_by, user_id)
WHERE created_by IS NULL;

ALTER TABLE burza_sluzby_availabilities
    ADD CONSTRAINT fk_burza_availabilities_created_by
        FOREIGN KEY (created_by)
        REFERENCES burza_sluzby_users(id)
        ON DELETE SET NULL,
    ADD CONSTRAINT fk_burza_availabilities_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES burza_sluzby_users(id)
        ON DELETE SET NULL;

ALTER TABLE burza_sluzby_shift_assignments
    ADD COLUMN IF NOT EXISTS created_by BIGINT UNSIGNED NULL AFTER approver_id,
    ADD COLUMN IF NOT EXISTS updated_by BIGINT UNSIGNED NULL AFTER created_by,
    ADD KEY idx_burza_assignments_created_by (created_by),
    ADD KEY idx_burza_assignments_updated_by (updated_by);

UPDATE burza_sluzby_shift_assignments
SET created_by = approver_id,
    updated_by = COALESCE(updated_by, approver_id)
WHERE created_by IS NULL;

ALTER TABLE burza_sluzby_shift_assignments
    ADD CONSTRAINT fk_burza_assignments_created_by
        FOREIGN KEY (created_by)
        REFERENCES burza_sluzby_users(id)
        ON DELETE SET NULL,
    ADD CONSTRAINT fk_burza_assignments_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES burza_sluzby_users(id)
        ON DELETE SET NULL;
