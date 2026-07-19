-- Optimalizace rychlosti prehledu vozidel:
-- Nejcastejsi query filtruje podle statusu a radi podle SPZ.
-- Kombinovany index umozni rychlejsi scan bez draheho filesortu.

ALTER TABLE vehicles_cars_list_v2
  ADD INDEX idx_vehicles_cars_list_v2_status_spz (status, spz);
