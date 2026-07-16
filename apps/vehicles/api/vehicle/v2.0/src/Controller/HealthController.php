<?php

declare(strict_types=1);

final class HealthController
{
    public function check(): void
    {
        Response::success([
            'service' => 'vehicles-api-v2',
            'appVersion' => Env::get('VEHICLES_V2_APP_VERSION', '0.75'),
            'environment' => Env::get('VEHICLES_V2_ENV', 'development'),
            'database' => Env::get('VEHICLES_V2_DB_NAME', 'vehicles-zzs-dev'),
            'wdCacheSource' => 'vehicles_wd_*_v2',
            'timestamp' => date(DATE_ATOM),
        ]);
    }
}
