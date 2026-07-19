-- Explicit approval state for local and Entra-created users.
-- Existing users stay approved; auto-created Entra users are created as pending.

ALTER TABLE vehicles_users
  ADD COLUMN IF NOT EXISTS approval_status ENUM('approved', 'pending') NOT NULL DEFAULT 'approved' AFTER auth_source,
  ADD KEY idx_vehicles_users_approval_active (approval_status, is_active);

UPDATE vehicles_users
SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status = '';