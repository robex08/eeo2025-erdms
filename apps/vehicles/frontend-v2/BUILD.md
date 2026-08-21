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

### Bezpečný production postup s dočasným index.html

Když se jde na produkci s databázovými změnami, doporučený pořadník je:

1. Dočasně přepsat produkční `index.html` údržbovou stránkou.
2. Udělat backup produkční DB `vehicles-zzs`.
3. Než se pustí jakýkoli deploy s DB změnami, vždy porovnat dev/prod schema a ověřit, které migrace ještě chybí.
4. Provést DB migrace.
5. Aktualizovat backend v2 a jeho konfiguraci.
6. Nasadit finální FE build, který nahradí údržbový `index.html`.

Pokud je v release nějaká DB migrace, nesmí se přeskočit kontrola schema parity mezi `vehicles-zzs-dev` a `vehicles-zzs`. Nejdřív musí být jasné, že produkce má všechny potřebné sloupce, tabulky a indexy, teprve potom se pokračuje backendem a frontendem.

Příklad ručního přepnutí do údržby:

```bash
cp /var/www/erdms-dev/apps/vehicles/frontend-v2/maintenance.html \
  /var/www/erdms-platform/apps/vehicles-v2/frontend/index.html
```

Příklad finálního přepisu FE po backendových a DB změnách:

```bash
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

### Doporučený bezpečný pořadník pro produkci

```bash
# 0) Maintenance page do produkce
cp /var/www/erdms-dev/apps/vehicles/frontend-v2/maintenance.html \
  /var/www/erdms-platform/apps/vehicles-v2/frontend/index.html

# 1) DB backup
DB_USER='YOUR_DB_USER' DB_PASS='YOUR_DB_PASSWORD' \
mysqldump -h 10.3.172.11 -u "$DB_USER" -p"$DB_PASS" \
  --single-transaction --routines --triggers --events \
  vehicles-zzs | gzip > /var/__BCK_PRODUKCE/vehicles-v2/vehicles-zzs_$(date +%Y%m%d_%H%M%S).sql.gz

# 2) DB schema check
#    - porovnat vehicles-zzs-dev vs vehicles-zzs
#    - zkontrolovat chybějící tabulky, sloupce a indexy
#    - pokud existuje migrace, nejdřív ji potvrdit proti schema diffu

# 3) DB migrace
#    - spouštět pouze schválené v2 migrace

# 4) Backend update
#    - zkopírovat API v2 do /var/www/erdms-platform/apps/vehicles-v2/api/vehicle/v2.0
#    - upravit produkční .env dle vehicles-zzs

# 5) Finální FE
cp -a /var/www/erdms-dev/apps/vehicles/frontend-v2/dist/. \
  /var/www/erdms-platform/apps/vehicles-v2/frontend/
```

Poznámky k bezpečnosti:
- Neprovádět žádné `rsync --delete`.
- Nezasahovat do původní aplikace `vehicles`.
- V tabulce `vehicles_users` neprovádět ruční obsahové změny mimo schválené migrace a konfiguraci.

## Po deployi

```bash
apachectl configtest
systemctl reload apache2
```

Zkontroluj:

- `https://erdms.zachranka.cz/vehicles-v2`
- prihlaseni pres Entra ID
- odpoved API na `/api.vehicles-v2/vehicle/v2.0/health`