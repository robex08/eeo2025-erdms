-- Legacy table optimizations for migration and search
-- Keep existing schema, only add helpful indexes for v2 migration and read performance.

ALTER TABLE list_cars
  ADD INDEX idx_list_cars_spz (w_spz),
  ADD INDEX idx_list_cars_status_last_update (status_vozidla, last_update),
  ADD INDEX idx_list_cars_carid_spz (w_carid, w_spz);

ALTER TABLE cars_detail
  ADD INDEX idx_cars_detail_carid (w_carid),
  ADD INDEX idx_cars_detail_brand_model (w_tovarni_znacka, w_model_vozu),
  ADD INDEX idx_cars_detail_fuel (w_typ_phm);

ALTER TABLE cars_position
  ADD INDEX idx_cars_position_carid_id (w_carid, id),
  ADD INDEX idx_cars_position_update (dt_aktualizace);
