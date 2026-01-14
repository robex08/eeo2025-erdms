<?php
// require_once 'v2025.02/inc/config.php';


$queries = array(
    // PARTNERS 
    "react-all-partners" => "SELECT DISTINCT * FROM " . $config['db']['partner'],
        
    // USERS
    "react-all-okres" => "SELECT * FROM {$config['db']['okresy']} ORDER BY okres",
    "react-all-stanoviste" => "SELECT * FROM {$config['db']['location']} ORDER BY name",
    "react-all-umisteni" => "SELECT * FROM {$config['db']['umisteni']} ORDER BY umisteni",
    "react-user-rights" => "SELECT * FROM {$config['db']['groups']} WHERE (id = :id)",
    "react-user-info" => "SELECT {$config['db']['users']}.name, surname, {$config['db']['location']}.name as lokalita, email, phone "
    . " FROM {$config['db']['users']}, {$config['db']['location']} "
    . " WHERE (location_id = {$config['db']['location']}.id) and ({$config['db']['users']}.id = :id)",
    
    // -----   
    "react-user-id" => "SELECT * FROM " . $config['db']['users'] . " WHERE id= :id",
    "react-all-users" => "SELECT id, surname, name, email, department, phone, active, username, dt_activity, 
                                           (SELECT name FROM {$config['db']['groups']} WHERE ({$config['db']['groups']}.id = group_id)) as group_name "
                                           
                                           . " FROM " . $config['db']['users'],
    // NEPOUZITE -           
    "get-all-users" => "SELECT * FROM {$config['db']['users']}",
    "get-user-id" => "SELECT * FROM {$config['db']['users']} WHERE id = :id",
    "insert-user" => "INSERT INTO {$config['db']['users']} (username, email, password) VALUES (:username, :email, :password)",
    "update-user" => "UPDATE {$config['db']['users']} SET username = :username, email = :email WHERE id = :id",
    "delete-user" => "UPDATE {$config['db']['users']} SET state = 'deleted' WHERE id = :id",

    // LOGIN - Ověření pouze podle username a hashovaného hesla
    "login-user" => "SELECT id, username FROM {$config['db']['users']} WHERE username = :username AND password = :password LIMIT 1",

    // ORDERS
   // "get-all-orders" => "SELECT * FROM {$config['db']['objednavky']}",
   // "get-orders-year" => "SELECT * FROM {$config['db']['objednavky']} WHERE datum_u BETWEEN :yearFrom AND :yearTo",            
    "get-order-id" => "SELECT * FROM {$config['db']['objednavky']} WHERE id = :id",
    "insert-order" => "INSERT INTO {$config['db']['objednavky']} (user_id, amount) VALUES (:user_id, :amount)",
    "update-order" => "UPDATE {$config['db']['objednavky']} SET amount = :amount WHERE id = :id",
    "delete-order" => "DELETE FROM {$config['db']['objednavky']} WHERE id = :id",
    
            
    // UPDATE ORDER
      "react-update-order-id" => "UPDATE {$config['db']['objednavky']} SET %s WHERE id = :id",            
            
    // z EEO 
        "react-all-garants" => "SELECT * FROM {$config['db']['garant']} ORDER BY garant;",
        "react-all-lps" => "SELECT  *, DATE_FORMAT(platne_do , '%d.%m.%Y') as platne_do, DATE_FORMAT(platne_do , '%d.%m.%Y') as platne_od, "
                . " (SELECT TRIM(CONCAT(surname, ' ', name)) FROM {$config['db']['users']} WHERE {$config['db']['users']}.id = user_id) as jmeno "
                . " FROM {$config['db']['lps']} ORDER BY kategorie, platne_od;",
        "react-all-types" => "SELECT * FROM {$config['db']['druh']} ORDER BY druh;",
    //  -------                
        "react-attachment-id" => "SELECT * FROM {$config['db']['oprilohy']} WHERE (id_smlouvy= :id) ORDER BY soubor;",     
        "react-order-raw-id" => "SELECT * FROM {$config['db']['objednavky']} WHERE id= :id",
        "react-get-year-orders" =>
        "SELECT obj.id, obj.evidencni_c, DATE_FORMAT(obj.datum_u, '%d.%m.%Y') as datum_p, obj.dodatek_sml_id, obj.vypovedni_lhuta, (SELECT garant FROM garant WHERE garant.id = obj.garant_id) as garant, (SELECT surname FROM users WHERE users.id = obj.user_id) as uName, (SELECT okres FROM okresy WHERE okresy.id = obj.okres_id) as okres, (SELECT umisteni FROM umisteni WHERE umisteni.id = obj.umisteni_id) as umisteni, (SELECT druh FROM druh_smlouvy WHERE druh_smlouvy.id = obj.druh_sml_id) as druh_sml, obj.tt_vyrc, obj.tt_dinfo, obj.faktura, obj.pokladni_dok, DATE_FORMAT(obj.dt_pridani, '%d.%m.%Y %H:%i:%s') as dt_pridani, (SELECT TRIM(CONCAT(surname,' ', name)) FROM users WHERE users.id = obj.user_id) as userCreator, DATE_FORMAT(obj.dt_modifikace, '%d.%m.%Y %H:%i:%s') as dt_modifikace, (SELECT TRIM(CONCAT(surname,' ', name)) FROM users WHERE users.id = obj.upd_user_id) as userUpdater, obj.partner_nazev, obj.partner_ic, obj.partner_adresa, obj.obsah, obj.cena, obj.cena_rok, obj.platnost_do, obj.ukonceno, DATE_FORMAT(obj.dt_zverejneni, '%d.%m.%Y') as dt_zverejneni, obj.zverejnit, obj.idds, (SELECT COUNT(opriloh.id_smlouvy) FROM :tbl_oprilohy opriloh WHERE opriloh.id_smlouvy = obj.id) as prilohy, obj.poznamka, obj.poznamka_garant, (SELECT metadata FROM :tbl_objMD objmd WHERE objmd.objednavka_id = obj.id) as objMetaData FROM :tab_obj obj WHERE obj.datum_u >= :yearFrom AND obj.datum_u < DATE_ADD(:yearTo, INTERVAL 1 DAY);",
        "react-order-id" =>
        "SELECT id,  evidencni_c, DATE_FORMAT(datum_u , '%d.%m.%Y') as datum_p, dodatek_sml_id, vypovedni_lhuta, 
                                                    (SELECT garant FROM {$config['db']['garant']} WHERE {$config['db']['garant']}.id = garant_id) as garant,
                                                    (SELECT surname FROM {$config['db']['users']} WHERE {$config['db']['users']}.id = user_id) as uName,    
                                                    (SELECT okres FROM {$config['db']['okresy']} WHERE {$config['db']['okresy']}.id = okres_id) as okres,
                                                    (SELECT umisteni FROM {$config['db']['umisteni']} WHERE {$config['db']['umisteni']}.id = umisteni_id) as umisteni,
                                                    (SELECT druh FROM {$config['db']['druh']} WHERE {$config['db']['druh']}.id = druh_sml_id) as druh_sml, tt_vyrc, tt_dinfo,
                                                    faktura, pokladni_dok, 
                                                    DATE_FORMAT(dt_pridani, '%d.%m.%Y %H:%i:%s') as dt_pridani,
                                                    (SELECT TRIM(CONCAT(surname,' ', name)) FROM {$config['db']['users']} WHERE {$config['db']['users']}.id = user_id) as userCreator,
                                                    DATE_FORMAT(dt_modifikace, '%d.%m.%Y %H:%i:%s') as dt_modifikace, 
                                                    (SELECT TRIM(CONCAT(surname,' ', name)) FROM {$config['db']['users']} WHERE {$config['db']['users']}.id = upd_user_id) as userUpdater,     
                                                    partner_nazev, partner_ic, partner_adresa, obsah, cena, cena_rok, platnost_do, ukonceno, DATE_FORMAT(dt_zverejneni, '%d.%m.%Y') as dt_zverejneni, zverejnit, idds,
                                                    (SELECT COUNT(id_smlouvy) FROM {$config['db']['oprilohy']}  WHERE {$config['db']['oprilohy']}.id_smlouvy = {$config['db']['objednavky']}.id) as prilohy,  
                                                    poznamka, poznamka_garant,
                                                    (SELECT metadata FROM {$config['db']['objMD']} WHERE {$config['db']['objMD']}.objednavka_id = {$config['db']['objednavky']}.id) as objMetaData  
                                                    FROM {$config['db']['objednavky']} 
                                                    WHERE {$config['db']['objednavky']}.id = :id"
                                                                
    
    
    
);

function getQuery($key) {
    global $queries;
    return isset($queries[$key]) ? $queries[$key] : null;
}

// Replace placeholders for dynamic tables
foreach ($queries as $k => &$q) {
    $q = str_replace('{$config[\'db\'][\'objednavky\']}', ':tab_obj', $q);
    $q = str_replace('{$config[\'db\'][\'oprilohy\']}', ':tbl_oprilohy', $q);
    $q = str_replace('{$config[\'db\'][\'objMD\']}', ':tbl_objMD', $q);
}

?>
