-- Sjednoceni nazvu sloupcu na w_* podle WebDispecinku 1:1
-- Pro existujici v2 tabulku, ktera historicky pouzivala wd_* nebo interni nazvy

ALTER TABLE vehicles_cars_list_v2
  CHANGE COLUMN manufacturer w_tovarni_znacka VARCHAR(120) DEFAULT NULL,
  CHANGE COLUMN model w_model_vozu VARCHAR(120) DEFAULT NULL,
  CHANGE COLUMN fuel_type w_typ_phm VARCHAR(80) DEFAULT NULL,
  CHANGE COLUMN wd_cargroupid w_cargroupid INT DEFAULT NULL,
  CHANGE COLUMN wd_groupname w_groupname VARCHAR(120) DEFAULT NULL,
  CHANGE COLUMN wd_online w_online TINYINT DEFAULT NULL,
  CHANGE COLUMN wd_disabled w_disabled TINYINT DEFAULT NULL;
