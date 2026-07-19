-- Optimizes lookup paths for per-user vehicle visibility filters.

ALTER TABLE vehicles_user_vehicle_assignments
  ADD KEY idx_vehicles_user_vehicle_assignments_vehicle_user (vehicle_id, user_id);
