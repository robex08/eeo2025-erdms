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
        $groupMap = [];
        foreach ($this->getCarsGroups() as $group) {
            $groupMap[(int) ($group['groupid'] ?? 0)] = (string) ($group['groupname'] ?? '');
        }

        // Všechna vozidla z WD API (activeOnly=0)
        $allCars = $this->getCarsList2(0);

        $cars = [];

        foreach ($allCars as $car) {
            $carId = (int) ($car['carid'] ?? 0);
            $online = (int) ($car['online'] ?? 1);
            $disabled = (int) ($car['disabled'] ?? 0);
            $wdCargroupId = (int) ($car['cargroupid'] ?? 0);
            $wdGroupName = $groupMap[$wdCargroupId] ?? '';

            // Pravidlo: disabled vozy jsou neaktivní, ostatní aktivní.
            // Vyřazené vozy (chybějící v API) se označují v handleru po syncu.
            $statusVozidla = $disabled === 1 ? 'neaktivni' : 'aktivni';

            $cars[] = [
                'carid' => $carId,
                'identifier' => $car['identifikator'] ?? '',
                'status_vozidla' => $statusVozidla,
                'online' => $online,
                'disabled' => $disabled,
                'wd_cargroupid' => $wdCargroupId,
                'wd_groupname' => $wdGroupName,
            ];
        }

        return $cars;
    }

    /**
     * Interní helper pro _getCarsList2 s activeOnly parametrem.
     */
    private function getCarsList2(int $activeOnly = 0): array
    {
        $response = $this->client->_getCarsList2(
            $this->kodf,
            $this->username,
            $this->password,
            $activeOnly
        );

        if (!isset($response->item)) {
            return [];
        }

        $items = is_array($response->item) ? $response->item : [$response->item];
        $rows = [];

        foreach ($items as $item) {
            $rows[] = [
                'carid' => (int) ($item->carid ?? 0),
                'identifikator' => (string) ($item->identifikator ?? ''),
                'online' => (int) ($item->online ?? -1),
                'disabled' => (int) ($item->disabled ?? -1),
                'cargroupid' => (int) ($item->cargroupid ?? 0),
            ];
        }

        return $rows;
    }

    /**
     * Získat skupiny vozidel
     */
    public function getCarsGroups(): array
    {
        $response = $this->client->_getCargroups($this->kodf, $this->username, $this->password);
        $groups = [];

        if (isset($response->item)) {
            $items = is_array($response->item) ? $response->item : [$response->item];

            foreach ($items as $group) {
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
