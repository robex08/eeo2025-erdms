<?php

define("VERSION_OBJEDNAVKY", 'objednavky0123');
define("VERSION_PRILOHY", 'r_pripojene_odokumenty');


$config["mysql"] = array(
    "host" => "localhost",
    "username" => "root",
    "password" => "adminSQL22107000",
    "database" => "evidence_smluv"
);


$config["db"]              = array (
                              "users" => "users",
                              "rights" => "rights",
                              "groups" => "groups",
                              "location" =>"locations",
                   //           "user_location"=>"user_location",
                              "smlouvy" => "smlouvy",
                              "objednavky" => VERSION_OBJEDNAVKY,
                              "umisteni" => "umisteni",
                              "partner" => "partner",
                              "okresy" => "okresy",
                              "garant" => "garant",
                              "druh" => "druh_smlouvy",
                              "menu" => "menu",
                              "prilohy" => "pripojene_dokumenty",
                              "oprilohy" => VERSION_PRILOHY,
                              "mprilohy" => "pripojene_mdokumenty",
                              "mapokresy"=>"map_okresy",
                              "majetek"=>"majetek",
                              "majetek_d"=>"majetek_duvod",
                              "lps"=>"r_LP",
                              "objMD"=>"r_objMetaData"
);


/*function setDBConfig($dbKey, $value) {
         global $config;
         $config['db'][$dbKey] = $value;
}*/
?>