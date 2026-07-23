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
            throw new RuntimeException('Chybí přístupové údaje WebDispečinku ve v2 .env');
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

    public function getDriversList(int $activeOnly = 0): array
    {
        $activeOnly = $activeOnly === 1 ? 1 : 0;

        try {
            $response = $this->client->_getDriversList2(
                $this->kodf,
                $this->username,
                $this->password,
                $activeOnly
            );
        } catch (Throwable $e) {
            throw new RuntimeException('API chyba (_getDriversList2): ' . $e->getMessage());
        }

        $items = $this->extractSoapItems($response, '_getDriversList2Result', 'WDS_DriverItem2');
        if ($items === []) {
            return [];
        }

        $result = [];
        foreach ($items as $item) {
            $driverId = (int) $this->extractField($item, ['iddriver', 'DriverId', 'driverid', 'RidicId', 'ridicid', 'id']);
            if ($driverId <= 0) {
                continue;
            }

            $firstName = trim((string) $this->extractField($item, ['jmeno', 'Jmeno', 'first_name', 'FirstName']));
            $lastName = trim((string) $this->extractField($item, ['prijmeni', 'Prijmeni', 'last_name', 'LastName']));
            $name = trim($firstName . ' ' . $lastName);
            $personalNumber = trim((string) $this->extractField($item, ['osobnicislo', 'OsobniCislo', 'PersonalNumber', 'personal_number']));
            $phone = trim((string) $this->extractField($item, ['mobil', 'Mobil', 'Phone', 'phone', 'Telefon', 'telefon', 'Mobile', 'mobile']));
            $email = trim((string) $this->extractField($item, ['Email', 'email', 'Mail', 'mail']));
            $identifier = trim((string) $this->extractField($item, ['spz', 'Spz', 'Identifier', 'identifikator']));

            $activeRaw = $this->extractField($item, ['disabled', 'Disabled', 'Active', 'active', 'IsActive', 'is_active']);
            $isActive = 1;
            if ($activeRaw !== null && $activeRaw !== '') {
                $normalized = strtolower(trim((string) $activeRaw));
                if (is_numeric($normalized)) {
                    // WD vrací disabled: 0 = aktivní, 1 = neaktivní.
                    $isActive = ((int) $normalized) === 0 ? 1 : 0;
                } elseif (in_array($normalized, ['false', 'no', 'ne', 'active', 'enabled'], true)) {
                    $isActive = 1;
                } elseif (in_array($normalized, ['true', 'yes', 'ano', 'disabled', 'inactive'], true)) {
                    $isActive = 0;
                }
            }

            if ($activeOnly === 1 && $isActive !== 1) {
                continue;
            }

            $rawJson = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $result[] = [
                'legacy_driverid' => $driverId,
                'driver_name' => $name,
                'personal_number' => $personalNumber,
                'phone' => $phone,
                'email' => $email,
                'legacy_carid' => null,
                'vehicle_identifier' => $identifier,
                'is_active' => $isActive,
                'raw_json' => is_string($rawJson) ? $rawJson : null,
            ];
        }

        return $result;
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

    public function getMonthlyStats(int $carId, int $year, int $month): array
    {
        $dates = WebDispecinkDateHelper::getCostsInterval($year, $month);

        try {
            $response = $this->client->_getStaCars(
                $this->kodf,
                $this->username,
                $this->password,
                $carId,
                $dates['casod'],
                $dates['casdo']
            );
            $items = $this->extractSoapItems($response, '_getStaCarsResult', 'WDS_StaCarsItem');
            $rows = [];
            foreach ($items as $item) {
                $fuelCosts = $this->toFloat($this->extractField($item, ['PHM_cena']));
                $otherCosts = $this->toFloat($this->extractField($item, ['Ostatni_naklady']));
                $totalCosts = $fuelCosts + $otherCosts;
                if ($totalCosts <= 0.0) {
                    $totalCosts = $this->toFloat($this->extractField($item, ['Naklady_celkem', 'NakladyCelkem']));
                }

                $fuelVolume = $this->toFloat($this->extractField($item, ['PHM_l']));
                $avgFuelPrice = $fuelVolume > 0 ? ($fuelCosts / $fuelVolume) : 0.0;

                $rows[] = [
                    'driver_name' => trim((string) $this->extractField($item, ['Ridic', 'Driver'])),
                    'driver_personal_number' => trim((string) $this->extractField($item, ['Osobni_cislo', 'PersonalNumber'])),
                    'km_business' => $this->toFloat($this->extractField($item, ['Sluzebni_km', 'Km_sluzebni', 'KmSluzebni'])),
                    'km_private' => $this->toFloat($this->extractField($item, ['Soukrome_km', 'Km_soukrome', 'KmSoukrome'])),
                    'km_total' => $this->toFloat($this->extractField($item, ['Celkem_km', 'Km_celkem', 'KmCelkem'])),
                    'fuel_start_l' => $this->toFloat($this->extractField($item, ['Start_stav_PHM'])),
                    'fuel_end_l' => $this->toFloat($this->extractField($item, ['End_stav_PHM'])),
                    'fuel_draw_l' => $fuelVolume,
                    'fuel_draw_cost_czk' => $fuelCosts,
                    'avg_fuel_price_czk_l' => $avgFuelPrice,
                    'amortization_czk' => $this->toFloat($this->extractField($item, ['Amortizace'])),
                    'driver_reimbursement_czk' => $this->toFloat($this->extractField($item, ['K_uhrade_ridici'])),
                    'paid_by_driver_czk' => $this->toFloat($this->extractField($item, ['Uhrazeno_ridicem'])),
                    'avg_consumption_l_100km' => $this->toFloat($this->extractField($item, ['Prum_spotreba'])),
                    'total_costs_czk' => $totalCosts,
                ];
            }

            return $rows;
        } catch (Throwable $e) {
            throw new RuntimeException('API chyba (_getStaCars): ' . $e->getMessage());
        }
    }

    public function getCcsCardInfo(
        int $carId,
        int $year,
        int $month,
        ?string $vehicleSpz = null,
        ?string $vehicleCallSign = null
    ): array
    {
        $dates = WebDispecinkDateHelper::getCostsInterval($year, $month);

        try {
            $response = $this->client->_getCarCosts(
                $this->kodf,
                $this->username,
                $this->password,
                $carId,
                $dates['casod'],
                $dates['casdo']
            );
            $items = $this->extractSoapItems($response, '_getCarCostsResult', 'WDS_CarCostsItem');
            $hasCcs = false;
            $cardNumber = null;
            $cardExpiration = null;

            foreach ($items as $item) {
                $source = strtolower(trim((string) $this->extractField($item, ['Zdroj', 'Source'])));
                $supplier = strtolower(trim((string) $this->extractField($item, ['Supplier'])));

                $sourceLooksLikeCard = $source === '2' || str_contains($source, 'card') || str_contains($source, 'karta');
                if ($sourceLooksLikeCard && str_contains($supplier, 'ccs')) {
                    $hasCcs = true;

                    if ($cardNumber === null) {
                        $candidate = $this->extractCardNumberFromCostItem($item);
                        if ($candidate !== null) {
                            $cardNumber = $candidate;
                        }
                    }
                }
            }

            $fuelCardInfo = $this->resolveCcsCardInfoFromFuelCards(
                $carId,
                $cardNumber,
                $vehicleSpz,
                $vehicleCallSign
            );
            if ($fuelCardInfo['card_number'] !== null) {
                $cardNumber = $fuelCardInfo['card_number'];
            }
            if ($fuelCardInfo['expiration_date'] !== null) {
                $cardExpiration = $fuelCardInfo['expiration_date'];
            }

            return [
                'imported' => $hasCcs,
                'card_number' => $cardNumber,
                'card_expiration' => $cardExpiration,
            ];
        } catch (Throwable $e) {
            throw new RuntimeException('API chyba (_getCarCosts): ' . $e->getMessage());
        }
    }

    public function hasCcsCardData(int $carId, int $year, int $month): bool
    {
        $info = $this->getCcsCardInfo($carId, $year, $month);
        return (bool) ($info['imported'] ?? false);
    }

    public function getCcsCardsAssignedToVehicles(): array
    {
        try {
            $response = $this->client->_getFuelCards($this->kodf, $this->username, $this->password);
        } catch (Throwable $e) {
            throw new RuntimeException('API chyba (_getFuelCards): ' . $e->getMessage());
        }

        $items = $this->extractSoapItems($response, '_getFuelCardsResult', 'WDS_FuelCardItem');
        if ($items === []) {
            return [];
        }

        $groupedByCarId = [];
        foreach ($items as $item) {
            $assign = (int) $this->extractField($item, ['assign', 'Assign']);
            $assignId = (int) $this->extractField($item, ['assign_id', 'AssignId']);
            $isInactive = (int) $this->extractField($item, ['is_inactive', 'IsInactive']);
            $cardType = strtolower(trim((string) $this->extractField($item, ['type', 'Type'])));
            $cardNumber = trim((string) $this->extractField($item, ['card_number', 'CardNumber']));
            $expirationDate = trim((string) $this->extractField($item, ['expiration_date', 'ExpirationDate']));

            if ($assign !== 1 || $assignId <= 0 || $isInactive === 1 || $cardNumber === '') {
                continue;
            }

            if (!str_contains($cardType, 'ccs')) {
                continue;
            }

            if (!isset($groupedByCarId[$assignId])) {
                $groupedByCarId[$assignId] = [];
            }

            $groupedByCarId[$assignId][] = [
                'card_number' => $cardNumber,
                'card_expiration' => $expirationDate !== '' ? $expirationDate : null,
            ];
        }

        if ($groupedByCarId === []) {
            return [];
        }

        $result = [];
        foreach ($groupedByCarId as $carId => $cards) {
            usort($cards, static function (array $left, array $right): int {
                $leftHasExpiration = is_string($left['card_expiration'] ?? null) && trim((string) $left['card_expiration']) !== '';
                $rightHasExpiration = is_string($right['card_expiration'] ?? null) && trim((string) $right['card_expiration']) !== '';

                if ($leftHasExpiration && !$rightHasExpiration) {
                    return -1;
                }

                if (!$leftHasExpiration && $rightHasExpiration) {
                    return 1;
                }

                return strcmp((string) ($left['card_number'] ?? ''), (string) ($right['card_number'] ?? ''));
            });

            $selected = $cards[0] ?? null;
            if ($selected === null) {
                continue;
            }

            $result[] = [
                'legacy_carid' => (int) $carId,
                'ccs_card_number' => (string) ($selected['card_number'] ?? ''),
                'ccs_card_expiration' => $selected['card_expiration'] ?? null,
            ];
        }

        return $result;
    }

    public function getMonthlyConsumption(int $carId, int $year, int $month): array
    {
        $dates = WebDispecinkDateHelper::getConsumptionInterval($year, $month);

        try {
            $response = $this->client->_getCarConsumption(
                $this->kodf,
                $this->username,
                $this->password,
                $carId,
                $dates['DateStart'],
                $dates['DateEnd']
            );
            $items = $this->extractSoapItems($response, '_getCarConsumptionResult', 'WDS_CarConsuptionItem');
            $rows = [];
            foreach ($items as $item) {
                $rows[] = [
                    'avg_consumption' => $this->toFloat($this->extractField($item, ['Spotreba', 'AverageConsumption'])),
                    'total_consumption_l' => $this->toFloat($this->extractField($item, ['Mesic_phm', 'Tankovano_phm', 'Spotreba'])),
                ];
            }

            return $rows;
        } catch (Throwable $e) {
            throw new RuntimeException('API chyba (_getCarConsumption): ' . $e->getMessage());
        }
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

    private function extractSoapItems(mixed $response, string $resultKey, string $itemKey): array
    {
        if (is_object($response) && isset($response->{$resultKey}) && is_object($response->{$resultKey}) && isset($response->{$resultKey}->{$itemKey})) {
            $items = $response->{$resultKey}->{$itemKey};
            return is_array($items) ? $items : [$items];
        }

        if (is_object($response) && isset($response->item)) {
            return is_array($response->item) ? $response->item : [$response->item];
        }

        return [];
    }

    private function extractField(mixed $item, array $keys): mixed
    {
        if (is_array($item)) {
            foreach ($keys as $key) {
                if (array_key_exists($key, $item)) {
                    return $item[$key];
                }
            }
            return null;
        }

        if (is_object($item)) {
            foreach ($keys as $key) {
                if (isset($item->{$key})) {
                    return $item->{$key};
                }
            }
        }

        return null;
    }

    private function toFloat(mixed $value): float
    {
        if ($value === null) {
            return 0.0;
        }

        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $normalized = str_replace(',', '.', trim((string) $value));
        return is_numeric($normalized) ? (float) $normalized : 0.0;
    }

    private function extractCardNumberFromCostItem(mixed $item): ?string
    {
        $explicit = $this->extractField($item, [
            'CardNumber',
            'CisloKarty',
            'CCSCard',
            'CCSCardNumber',
            'Karta',
        ]);
        $explicitNormalized = trim((string) ($explicit ?? ''));
        if ($explicitNormalized !== '') {
            return $explicitNormalized;
        }

        $fallback = $this->extractField($item, ['ExternalID', 'Cislo']);
        $fallbackNormalized = trim((string) ($fallback ?? ''));
        if ($fallbackNormalized !== '') {
            return $fallbackNormalized;
        }

        return null;
    }

    private function resolveCcsCardInfoFromFuelCards(
        int $carId,
        ?string $preferredCardNumber = null,
        ?string $vehicleSpz = null,
        ?string $vehicleCallSign = null
    ): array
    {
        try {
            $response = $this->client->_getFuelCards($this->kodf, $this->username, $this->password);
        } catch (Throwable) {
            return [
                'card_number' => null,
                'expiration_date' => null,
            ];
        }

        $items = $this->extractSoapItems($response, '_getFuelCardsResult', 'WDS_FuelCardItem');
        if ($items === []) {
            return [
                'card_number' => null,
                'expiration_date' => null,
            ];
        }

        $vehicleAssignedCards = [];
        $allAssignedCards = [];
        foreach ($items as $item) {
            $assign = (int) $this->extractField($item, ['assign', 'Assign']);
            $assignId = (int) $this->extractField($item, ['assign_id', 'AssignId']);
            $isInactive = (int) $this->extractField($item, ['is_inactive', 'IsInactive']);
            $cardType = strtolower(trim((string) $this->extractField($item, ['type', 'Type'])));
            $cardNumber = trim((string) $this->extractField($item, ['card_number', 'CardNumber']));
            $expirationDate = trim((string) $this->extractField($item, ['expiration_date', 'ExpirationDate']));
            $note = trim((string) $this->extractField($item, ['note', 'Note']));

            if ($cardNumber === '' || $isInactive === 1 || $assign !== 1) {
                continue;
            }

            $cardPayload = [
                'card_number' => $cardNumber,
                'expiration_date' => $expirationDate !== '' ? $expirationDate : null,
                'is_ccs' => str_contains($cardType, 'ccs'),
                'assign_id' => $assignId,
                'note' => $note,
            ];

            $allAssignedCards[] = $cardPayload;

            if ($assignId !== $carId) {
                continue;
            }

            $vehicleAssignedCards[] = $cardPayload;
        }

        if ($vehicleAssignedCards === []) {
            $matchByNote = [];
            $spzNeedle = $this->normalizeForMatch($vehicleSpz);
            $callSignNeedle = $this->normalizeForMatch($vehicleCallSign);

            if ($spzNeedle !== '' || $callSignNeedle !== '') {
                foreach ($allAssignedCards as $card) {
                    $noteNeedle = $this->normalizeForMatch($card['note'] ?? '');
                    if ($noteNeedle === '') {
                        continue;
                    }

                    $matchesSpz = $spzNeedle !== '' && str_contains($noteNeedle, $spzNeedle);
                    $matchesCallSign = $callSignNeedle !== '' && str_contains($noteNeedle, $callSignNeedle);
                    if ($matchesSpz || $matchesCallSign) {
                        $matchByNote[] = $card;
                    }
                }
            }

            if ($matchByNote !== []) {
                $vehicleAssignedCards = $matchByNote;
            } else {
                return [
                    'card_number' => null,
                    'expiration_date' => null,
                ];
            }
        }

        if (is_string($preferredCardNumber) && trim($preferredCardNumber) !== '') {
            $normalizedPreferred = trim($preferredCardNumber);
            foreach ($vehicleAssignedCards as $card) {
                if ($card['card_number'] === $normalizedPreferred) {
                    return [
                        'card_number' => $card['card_number'],
                        'expiration_date' => $card['expiration_date'],
                    ];
                }
            }
        }

        foreach ($vehicleAssignedCards as $card) {
            if ($card['is_ccs']) {
                return [
                    'card_number' => $card['card_number'],
                    'expiration_date' => $card['expiration_date'],
                ];
            }
        }

        return [
            'card_number' => $vehicleAssignedCards[0]['card_number'],
            'expiration_date' => $vehicleAssignedCards[0]['expiration_date'],
        ];
    }

    private function normalizeForMatch(?string $value): string
    {
        $normalized = strtoupper(trim((string) ($value ?? '')));
        if ($normalized === '') {
            return '';
        }

        return preg_replace('/[^A-Z0-9]/', '', $normalized) ?? '';
    }

    public function isPackageNotActivatedError(Throwable $error): bool
    {
        $message = strtolower((string) $error->getMessage());
        return str_contains($message, 'package is not activated');
    }

    /**
     * Načte měsíční km statistiky pro všechny řidiče.
     * Vrací pole indexované podle osobního čísla řidiče.
     * Pro každého řidiče agreguje data ze všech vozidel.
     */
    public function getDriversMonthlyKm(int $year, int $month): array
    {
        $allCars = $this->getCarsListRaw(0);
        $driverStats = [];

        foreach ($allCars as $car) {
            $carId = (int) ($car['carid'] ?? 0);
            if ($carId <= 0) {
                continue;
            }

            try {
                $stats = $this->getMonthlyStats($carId, $year, $month);
                
                foreach ($stats as $stat) {
                    $personalNumber = trim((string) ($stat['driver_personal_number'] ?? ''));
                    $driverName = trim((string) ($stat['driver_name'] ?? ''));
                    
                    // Přeskočit záznamy bez řidiče
                    if ($personalNumber === '' && $driverName === '') {
                        continue;
                    }
                    
                    // Klíč podle osobního čísla, fallback na jméno
                    $key = $personalNumber !== '' ? $personalNumber : $driverName;
                    
                    if (!isset($driverStats[$key])) {
                        $driverStats[$key] = [
                            'personal_number' => $personalNumber,
                            'driver_name' => $driverName,
                            'km_business' => 0.0,
                            'km_private' => 0.0,
                            'km_total' => 0.0,
                            'costs_total' => 0.0,
                            'costs_business' => 0.0,
                            'costs_private' => 0.0,
                        ];
                    }
                    
                    // Agregace km a costs ze všech vozidel
                    $kmBusiness = (float) ($stat['km_business'] ?? 0.0);
                    $kmPrivate = (float) ($stat['km_private'] ?? 0.0);
                    $kmTotal = (float) ($stat['km_total'] ?? 0.0);
                    $totalCosts = (float) ($stat['total_costs_czk'] ?? 0.0);
                    
                    $driverStats[$key]['km_business'] += $kmBusiness;
                    $driverStats[$key]['km_private'] += $kmPrivate;
                    $driverStats[$key]['km_total'] += $kmTotal;
                    $driverStats[$key]['costs_total'] += $totalCosts;
                    
                    // Výpočet poměrných nákladů (služební/soukromé)
                    if ($kmTotal > 0 && $totalCosts > 0) {
                        $businessCosts = $totalCosts * ($kmBusiness / $kmTotal);
                        $privateCosts = $totalCosts * ($kmPrivate / $kmTotal);
                        $driverStats[$key]['costs_business'] += $businessCosts;
                        $driverStats[$key]['costs_private'] += $privateCosts;
                    }
                }
            } catch (Throwable $e) {
                error_log('WebDispečink getDriversMonthlyKm carId=' . $carId . ': ' . $e->getMessage());
                continue;
            }
        }

        return array_values($driverStats);
    }
}
