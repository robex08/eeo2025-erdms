-- Adds user activity tracking fields.
-- last_login_at: timestamp of successful login
-- last_activity_at: rolling timestamp of API activity
-- activity_meta_json: extensible metadata payload (ip, user-agent, etc.)

ALTER TABLE vehicles_users
  ADD COLUMN IF NOT EXISTS last_login_at DATETIME DEFAULT NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS last_activity_at DATETIME DEFAULT NULL AFTER last_login_at,
  ADD COLUMN IF NOT EXISTS activity_meta_json LONGTEXT DEFAULT NULL AFTER last_activity_at;
