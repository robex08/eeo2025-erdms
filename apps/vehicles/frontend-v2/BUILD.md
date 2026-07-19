# Vehicles Frontend V2 - Build a deploy na produkci

Tato verze se nasazuje oddelene od puvodni aplikace `vehicles`.

## Produkcni cesty

- Frontend URL: `https://erdms.zachranka.cz/vehicles-v2`
- Frontend target dir: `/var/www/erdms-platform/apps/vehicles-v2/frontend`
- API base URL: `/api.vehicles-v2/vehicle/v2.0`
- API target dir: `/var/www/erdms-platform/apps/vehicles-v2/api/vehicle/v2.0`

## Frontend build

1. Vytvor lokalni produkcni env:

```bash
cd /var/www/erdms-dev/apps/vehicles/frontend-v2
cp .env.production.example .env.production.local
```

2. Over hodnoty v `.env.production.local`:

```bash
VITE_APP_BASE_PATH=/vehicles-v2/
VITE_ENTRA_REDIRECT_PATH=/vehicles-v2
VITE_API_V2_BASE_URL=/api.vehicles-v2/vehicle/v2.0
VITE_API_LEGACY_GET_URL=/api.vehicles/api.php
```

3. Vytvor build:

```bash
cd /var/www/erdms-dev/apps/vehicles/frontend-v2
npm run build
```

## Frontend deploy

Bezpecny postup bez `rsync --delete`:

```bash
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p /var/__BCK_PORDUKCE/vehicles-v2
cp -a /var/www/erdms-platform/apps/vehicles-v2/frontend \
  "/var/__BCK_PORDUKCE/vehicles-v2/frontend_$TS"

mkdir -p /var/www/erdms-platform/apps/vehicles-v2/frontend
cp -a /var/www/erdms-dev/apps/vehicles/frontend-v2/dist/. \
  /var/www/erdms-platform/apps/vehicles-v2/frontend/
```

Poznamka:
- Stare hashovane assety mohou v cili zustat. To je akceptovatelne, pokud `index.html` odkazuje na novy build.

## Backend deploy

1. Zkopiruj API v2 do produkce oddelene od stareho backendu:

```bash
mkdir -p /var/www/erdms-platform/apps/vehicles-v2/api/vehicle
cp -a /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0 \
  /var/www/erdms-platform/apps/vehicles-v2/api/vehicle/
```

2. V produkcnim `.env` pro API nastav minimalne:

```bash
VEHICLES_V2_DB_HOST=10.3.172.11
VEHICLES_V2_DB_PORT=3306
VEHICLES_V2_DB_NAME=vehicles-zzs
VEHICLES_V2_DB_USER=YOUR_DB_USER
VEHICLES_V2_DB_PASS=YOUR_DB_PASSWORD
VEHICLES_V2_ENV=production
VEHICLES_V2_API_BASE_PATH=/api.vehicles-v2/vehicle/v2.0
VEHICLES_V2_FRONTEND_BASE_PATH=/vehicles-v2
VEHICLES_V2_COOKIE_PATH=/api.vehicles-v2/vehicle/v2.0
VEHICLES_V2_COOKIE_SECURE=1
VEHICLES_V2_CENTRAL_AUTH_BASE=https://erdms.zachranka.cz
VEHICLES_V2_ENTRA_REDIRECT_URL=https://erdms.zachranka.cz/vehicles-v2
```

## Po deployi

```bash
apachectl configtest
systemctl reload apache2
```

Zkontroluj:

- `https://erdms.zachranka.cz/vehicles-v2`
- prihlaseni pres Entra ID
- odpoved API na `/api.vehicles-v2/vehicle/v2.0/health`