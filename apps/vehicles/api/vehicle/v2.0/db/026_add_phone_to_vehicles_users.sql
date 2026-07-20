-- Adds manual phone contact field for vehicles users.

ALTER TABLE vehicles_users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40) DEFAULT NULL AFTER email;
