<?php

declare(strict_types=1);

final class WebDispecinkClientV2
{
    private SoapClient $client;
    private string $kodf;
    private string $username;
    private string $password;

    public function __construct()
    {
        $this->kodf = Env::get('WEBDISPECINK_KODF');
        $this->username = Env::get('WEBDISPECINK_USERNAME');
        $this->password = Env::get('WEBDISPECINK_PASSWORD');

        if ($this->kodf === '' || $this->username === '' || $this->password === '') {
            throw new RuntimeException('Chybi WebDispecink pristupove udaje ve v2 .env');
        }

        $this->client = new SoapClient(
            'https://api.webdispecink.cz/code/WebDispecinkServiceNet.php?wsdl',
            [
                'trace' => true,
                'exceptions' => true,
                'connection_timeout' => 30,
            ]
        );
    }

    public function getCarsList(): array
    {
        $groupMap = [];
        foreach ($this->getCarsGroups() as $group) {
            $groupMap[(int) ($group['groupid'] ?? 0)] = (string) ($group['groupname'] ?? '');
        }

        $allCars = $this->getCarsListRaw(0);
        $cars = [];

        foreach ($allCars as $car) {
            $carId = (int) ($car['carid'] ?? 0);
            $online = (int) ($car['online'] ?? 1);
            $disabled = (int) ($car['disabled'] ?? 0);
            $wdCargroupId = (int) ($car['cargroupid'] ?? 0);

            $cars[] = [
                'carid' => $carId,
                'identifier' => (string) ($car['identifikator'] ?? ''),
                'status_vozidla' => $disabled === 1 ? 'neaktivni' : 'aktivni',
                'w_online' => $online,
                'w_disabled' => $disabled,
                'w_cargroupid' => $wdCargroupId,
                'w_groupname' => $groupMap[$wdCargroupId] ?? '',
            ];
        }

        return $cars;
    }

    public function getCarsGroups(): array
    {
        return $this->fetchCarsGroups();
    }

    public function getCarsGeneralInfoByIds(array $carIds): array
    {
        if ($carIds === []) {
            return [];
        }

        $chunks = array_chunk(array_values(array_unique(array_map('intval', $carIds))), 200);
        $result = [];

        foreach ($chunks as $chunk) {
            $list = implode(',', $chunk);
            $response = $this->client->_getCarsListGeneral5(
                $this->kodf,
                $this->username,
                $this->password,
                $list
            );

            if (!isset($response->item)) {
                continue;
            }

            $items = is_array($response->item) ? $response->item : [$response->item];
            foreach ($items as $item) {
                $result[] = [
                    'carid' => (int) ($item->CarId ?? 0),
                    'w_tovarni_znacka' => (string) ($item->Tovarni_znacka ?? ''),
                    'w_model_vozu' => (string) ($item->Model_vozu ?? ''),
                    'w_typ_phm' => (string) ($item->Typ_PHM ?? ''),
                    'w_stanoviste' => (string) ($item->Stanoviste ?? ''),
                    'w_nadrz' => isset($item->Nadrz) ? (int) $item->Nadrz : 0,
                ];
            }
        }

        return $result;
    }

    public function getCarsPositionsByIds(array $carIds): array
    {
        if ($carIds === []) {
            return [];
        }

        $list = implode(',', array_values(array_unique(array_map('intval', $carIds))));
        $response = $this->client->_getCarsIDPosition2(
            $this->kodf,
            $this->username,
            $this->password,
            $list
        );

        if (!isset($response->item)) {
            return [];
        }

        $items = is_array($response->item) ? $response->item : [$response->item];
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'carid' => (int) ($item->cd ?? 0),
                'w_majak' => isset($item->i1s) ? (string) $item->i1s : '',
                'w_pt' => isset($item->pt) ? (string) $item->pt : '',
                'w_lp' => isset($item->lp) ? (string) $item->lp : '',
                'w_km' => isset($item->Km) ? (float) $item->Km : null,
                'w_ln' => isset($item->LN) ? (string) $item->LN : null,
                'w_zs' => isset($item->Zs) ? (string) $item->Zs : null,
                'w_zd' => isset($item->Zd) ? (string) $item->Zd : null,
            ];
        }

        return $result;
    }

    public function getCarsKmStatsByIds(array $carIds, int $intervalMonths = 1): array
    {
        if ($carIds === []) {
            return [];
        }

        $intervalMonths = max(1, $intervalMonths);
        $dateTo = new DateTime('first day of this month');
        $dateFrom = clone $dateTo;
        $dateFrom->modify('-' . $intervalMonths . ' months');

        $dateFromFormatted = $dateFrom->format('d.m.Y H:i:s');
        $dateToFormatted = $dateTo->format('d.m.Y H:i:s');

        $rows = [];
        foreach (array_values(array_unique(array_map('intval', $carIds))) as $carId) {
            if ($carId <= 0) {
                continue;
            }

            try {
                $response = $this->client->_getStaCars2(
                    $this->kodf,
                    $this->username,
                    $this->password,
                    $carId,
                    $dateFromFormatted,
                    $dateToFormatted
                );

                if (!isset($response->item)) {
                    continue;
                }

                $item = $response->item;
                $rows[] = [
                    'carid' => (int) ($item->carid ?? $carId),
                    'date_from' => isset($item->Casod) ? (string) $item->Casod : null,
                    'date_to' => isset($item->Casdo) ? (string) $item->Casdo : null,
                    'km' => isset($item->Celkem_km) ? (float) $item->Celkem_km : null,
                    'tach_end' => isset($item->Tach_end) ? (float) $item->Tach_end : null,
                    'interval' => $intervalMonths,
                ];
            } catch (Throwable $e) {
                error_log('Vehicles v2 KM sync car ' . $carId . ': ' . $e->getMessage());
            }
        }

        return $rows;
    }

    private function fetchCarsGroups(): array
    {
        $response = $this->client->_getCargroups($this->kodf, $this->username, $this->password);
        $groups = [];

        if (!isset($response->item)) {
            return $groups;
        }

        $items = is_array($response->item) ? $response->item : [$response->item];
        foreach ($items as $group) {
            $groups[] = [
                'groupid' => (int) ($group->CargroupId ?? 0),
                'groupname' => (string) ($group->GroupName ?? ''),
                'numcars' => (int) ($group->NumCars ?? 0),
            ];
        }

        return $groups;
    }

    private function getCarsListRaw(int $activeOnly = 0): array
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
}
