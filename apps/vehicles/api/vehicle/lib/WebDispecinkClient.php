<?php
/**
 * WebDispecinkClient - SOAP klient pro WebDispečink API
 * 
 * Zapouzdřuje komunikaci s externím SOAP API webdispecink.cz
 */
class WebDispecinkClient
{
    private SoapClient $client;
    private string $kodf;
    private string $username;
    private string $password;

    public function __construct()
    {
        $config = Config::getWebDispecinkConfig();
        $this->kodf = $config['kodf'];
        $this->username = $config['username'];
        $this->password = $config['password'];

        try {
            $this->client = new SoapClient(
                'https://api.webdispecink.cz/code/WebDispecinkServiceNet.php?wsdl',
                [
                    'trace' => true,
                    'exceptions' => true,
                    'connection_timeout' => 30,
                ]
            );
        } catch (SoapFault $e) {
            error_log("Vehicles API - SOAP init error: " . $e->getMessage());
            throw new RuntimeException('Chyba připojení k WebDispečink API');
        }
    }

    /**
     * Získat seznam vozidel
     */
    public function getCarsList(): array
    {
        $response = $this->client->_getCarsList($this->kodf, $this->username, $this->password);
        $cars = [];

        if (isset($response->item) && is_array($response->item)) {
            foreach ($response->item as $car) {
                if ($car->disabled == 0) {
                    $cars[] = [
                        'carid' => $car->carid,
                        'identifier' => $car->identifikator,
                    ];
                }
            }
        }

        return $cars;
    }

    /**
     * Získat skupiny vozidel
     */
    public function getCarsGroups(): array
    {
        $response = $this->client->_getCargroups($this->kodf, $this->username, $this->password);
        $groups = [];

        if (isset($response->item) && is_array($response->item)) {
            foreach ($response->item as $group) {
                $groups[] = [
                    'groupid' => $group->CargroupId,
                    'groupname' => $group->GroupName,
                    'numcars' => $group->NumCars,
                ];
            }
        }

        return $groups;
    }

    /**
     * Získat obecné info o vozidlech (_getCarsListGeneral5)
     */
    public function getCarsGeneralInfo(string $carIdList): object
    {
        return $this->client->_getCarsListGeneral5(
            $this->kodf,
            $this->username,
            $this->password,
            $carIdList
        );
    }

    /**
     * Získat pozice vozidel (_getCarsIDPosition2)
     */
    public function getCarsPositions(string $carIdList): object
    {
        return $this->client->_getCarsIDPosition2(
            $this->kodf,
            $this->username,
            $this->password,
            $carIdList
        );
    }

    /**
     * Získat KM statistiku pro vozidlo (_getStaCars2)
     */
    public function getCarsKmStats(int $carId, string $dateFrom, string $dateTo): ?object
    {
        $response = $this->client->_getStaCars2(
            $this->kodf,
            $this->username,
            $this->password,
            $carId,
            $dateFrom,
            $dateTo
        );

        if (is_object($response) && isset($response->item)) {
            return $response->item;
        }

        return null;
    }
}
