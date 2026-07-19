-- Add dedicated fleet manager role to vehicles users.

ALTER TABLE vehicles_users
  MODIFY COLUMN role_code ENUM('superadmin', 'administrator', 'fleet_manager', 'user') NOT NULL;