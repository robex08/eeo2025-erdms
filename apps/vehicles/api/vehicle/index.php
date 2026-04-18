<?php
    // API pro webDispecink 
    /*
     * WebDispečink API credentials - nyní v .env souboru
     * DB credentials - nyní v .env souboru
     * 
     *      _getCarsListGeneral2
     *      _getCarsListGeneral5   /CarIdList muze byt seznam oddeleny carkami id1,id2,id3
     *      _getStaCars2
     * 
     *    SPZ, Car ID, Volaci znak, Lokalita,
     *    rychlost, parkovani, geolokace, majak
     * 
     * : _getCarsListGeneral5  [Popis], ["Identifikator"], [VIN], [Tovarni znacka]. [Typ_PHM], [Model_Vozu], [Stanoviste], ["DatOd"]
     */
    
    // Načíst konfiguraci z .env
    include_once "./inc/const.php";
    include_once "./v1.0/webDispecink.php";
    
    // Použít credentials z .env
    print_r(getCarsList($kodf, $username, $pass));
    
?>