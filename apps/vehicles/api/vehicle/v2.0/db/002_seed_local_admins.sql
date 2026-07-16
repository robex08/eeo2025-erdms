-- Seed 2 local users for v0.75
-- DEV default passwords:
--   superadmin -> Superadmin@2026
--   administrator -> Administrator@2026

INSERT INTO vehicles_users (username, password_hash, role_code, auth_source, entra_id, display_name, must_change_password, is_active)
VALUES
  (
    'superadmin',
    '$2y$12$MfW7bQ3rVGHD5vZvH2bg/uKEK6.dfCQEdvzo0xEGxFQ1tAVfNS1b6',
    'superadmin',
    'local',
    'u03924',
    'Super Administrator',
    1,
    1
  ),
  (
    'administrator',
    '$2y$12$8PzaxTJ5TQy2FRNDPWTlQuuWt3TkpBSSxUvxR5NQcc2gT7pLWyY3a',
    'administrator',
    'local',
    'u09343',
    'Administrator',
    1,
    1
  )
ON DUPLICATE KEY UPDATE
  role_code = VALUES(role_code),
  auth_source = VALUES(auth_source),
  entra_id = VALUES(entra_id),
  display_name = VALUES(display_name),
  must_change_password = VALUES(must_change_password),
  is_active = VALUES(is_active);
