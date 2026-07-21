-- Adds dynamic vehicle visibility scope by station/group/type and stores manual vehicle picks.

ALTER TABLE vehicles_users
  ADD COLUMN vehicle_manual_ids_json LONGTEXT NULL AFTER has_all_vehicles,
  ADD COLUMN vehicle_scope_stations_json LONGTEXT NULL AFTER vehicle_manual_ids_json,
  ADD COLUMN vehicle_scope_groups_json LONGTEXT NULL AFTER vehicle_scope_stations_json,
  ADD COLUMN vehicle_scope_types_json LONGTEXT NULL AFTER vehicle_scope_groups_json;

-- Backfill existing users: keep current assignment behavior as manual vehicle selection.
UPDATE vehicles_users u
SET u.vehicle_manual_ids_json = (
  SELECT JSON_ARRAYAGG(a.vehicle_id)
  FROM vehicles_user_vehicle_assignments a
  WHERE a.user_id = u.id
)
WHERE u.vehicle_manual_ids_json IS NULL;

-- Ensure empty arrays where user had no assignments.
UPDATE vehicles_users
SET vehicle_manual_ids_json = JSON_ARRAY()
WHERE vehicle_manual_ids_json IS NULL;

UPDATE vehicles_users
SET vehicle_scope_stations_json = JSON_ARRAY(),
    vehicle_scope_groups_json = JSON_ARRAY(),
    vehicle_scope_types_json = JSON_ARRAY()
WHERE vehicle_scope_stations_json IS NULL
   OR vehicle_scope_groups_json IS NULL
   OR vehicle_scope_types_json IS NULL;
