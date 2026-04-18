<?php


//  "SELECT cars_group.w_groupname, list_cars.w_spz, list_cars.zzs_typ, cars_detail.* FROM `cars_detail`, list_cars, cars_group WHERE (list_cars.w_carid = cars_detail.w_carid) AND (cars_group.w_groupid = cars_detail.w_groupid)";

/* $sql_CarsDetail = "SELECT cars_group.w_groupname, list_cars.w_spz, list_cars.zzs_typ, cars_detail.*, cars_smlouva.Datum_od, cars_smlouva.Datum_do FROM list_cars
LEFT JOIN cars_detail ON list_cars.w_carid = cars_detail.w_carid
LEFT JOIN cars_group ON cars_group.w_groupid = cars_detail.w_groupid
LEFT JOIN cars_smlouva ON REPLACE(list_cars.w_spz, ' ', '') = cars_smlouva.spz";
// vc. dotaci /
*/
$sql_CarsDetail = "SELECT cars_group.w_groupname, list_cars.w_spz, list_cars.zzs_typ, cars_detail . * , cars_smlouva.Datum_od, cars_smlouva.Datum_do, cars_dotace.inv_cislo, cars_dotace.usek, cars_dotace.budov, cars_dotace.mistnost, cars_dotace.vozidlo_popis, cars_dotace.VIN, cars_dotace.dt_zarazeni, cars_dotace.dt_konec_odpis, cars_dotace.plan_vyrazeni, cars_dotace.dotace
FROM list_cars
LEFT JOIN cars_detail ON list_cars.w_carid = cars_detail.w_carid
LEFT JOIN cars_group ON cars_group.w_groupid = cars_detail.w_groupid
LEFT JOIN cars_smlouva ON REPLACE( list_cars.w_spz, ' ', '' ) = REPLACE( cars_smlouva.spz, ' ', '' )
LEFT JOIN cars_dotace ON REPLACE( list_cars.w_spz, ' ', '' ) = REPLACE( cars_dotace.w_spz, ' ', '' )
ORDER BY `list_cars`.`w_spz` ASC
LIMIT 0 , 500";



// $sql_CarPositionByID = "SELECT * FROM `cars_position` WHERE `w_carid` = ?";
// $sql_CarPositionByID = "SELECT cars_position.* FROM cars_position, list_cars, cars_mt WHERE (REPLACE(list_cars.w_spz, ' ', '') = cars_mt.spz AND cars_position.w_carid=list_cars.w_carid) AND cars_position.w_carid = ?";

$sql_CarPositionByID = "SELECT cars_position.*, cars_mt.*
FROM list_cars
LEFT JOIN cars_mt ON REPLACE(list_cars.w_spz, ' ', '') = cars_mt.spz
JOIN cars_position ON cars_position.w_carid = list_cars.w_carid
WHERE cars_position.w_carid = ?";


$sql_CarKmByID = "SELECT * "
        . " FROM cars_km_mesic"
        . " WHERE cars_km_mesic.w_carid = ?";
        
