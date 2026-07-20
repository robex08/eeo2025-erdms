# Deployment Plan - Vehicles v0.91

Datum nasazeni: 2026-07-20
Prostredi: DEV -> PROD
Branch: feature/vehicles-v2-refactor

## Cile nasazeni

1. Nasadit frontend/backend zmeny Vehicles v0.91.
2. Mit korektni DB strukturu pro uzivatele a omezeni na vozidla.
3. Zajistit, aby legenda polohy v prehledu vozidel brala realne soucty z BE napric celym datasetem.

## Kriticke pravidlo poradi

1. Nejdriv DB migrace.
2. Az potom FE/BE deploy.

Duvod: Kod uz pocita s funkcemi a sloupci pro user-vehicle omezeni. Pokud by se nasadil kod bez DB zmen, hrozi chyby autorizace a/nebo chovani filtrovani.

---

## Cast A - Preddeploy kontrola

### A1) Potvrzeni DB topologie

Nejdriv overit, jestli produkce bezi:

1. na stejne DB jako DEV (shared DB), nebo
2. na samostatne produkcni DB.

Tohle rozhoduje, zda je potreba i prenos dat omezeni (assignments), nebo jen schema update.

### A2) Potvrzeni zdrojovych migraci

Migrace pro v0.91 + vecerni rozsirení:

1. apps/vehicles/api/vehicle/v2.0/db/022_add_approval_status_to_vehicles_users.sql
2. apps/vehicles/api/vehicle/v2.0/db/023_add_fleet_manager_role_to_vehicles_users.sql
3. apps/vehicles/api/vehicle/v2.0/db/024_add_vehicle_assignments_to_users.sql
4. apps/vehicles/api/vehicle/v2.0/db/025_optimize_vehicle_assignments_indexes.sql
5. apps/vehicles/api/vehicle/v2.0/db/026_add_phone_to_vehicles_users.sql
6. apps/vehicles/api/vehicle/v2.0/db/027_rename_telefon_to_phone_in_vehicles_users.sql
7. apps/vehicles/api/vehicle/v2.0/db/028_add_user_activity_columns.sql

### A3) Poznamka k idempotenci

Skript 024 neni plne idempotentni ve vsech verzich MariaDB/MySQL, proto pred aplikaci overit existenci sloupce has_all_vehicles.

---

## Cast B - Zalohy (povinne)

### B1) Souborova zaloha produkce

```bash
BACKUP_ROOT="/var/www/__BCK_PRODUKCE/vehicles_v0_91_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_ROOT"

rsync -av /var/www/erdms-platform/apps/vehicles/ "$BACKUP_ROOT/apps_vehicles/"
```

### B2) DB zaloha

Pozn.: doplnit spravny DB host/jmeno podle realne topologie.

```bash
mysqldump -h <DB_HOST> -u <DB_USER> -p <DB_NAME> | gzip > "$BACKUP_ROOT/db_before_v0_91.sql.gz"
```

---

## Cast C - DB migrace

### C1) Precheck existence sloupcu/tabulek/indexu

```sql
SHOW COLUMNS FROM vehicles_users LIKE 'approval_status';
SHOW COLUMNS FROM vehicles_users LIKE 'has_all_vehicles';
SHOW COLUMNS FROM vehicles_users LIKE 'role_code';
SHOW COLUMNS FROM vehicles_users LIKE 'phone';
SHOW COLUMNS FROM vehicles_users LIKE 'telefon';
SHOW COLUMNS FROM vehicles_users LIKE 'last_login_at';
SHOW COLUMNS FROM vehicles_users LIKE 'last_activity_at';
SHOW COLUMNS FROM vehicles_users LIKE 'activity_meta_json';

SHOW TABLES LIKE 'vehicles_user_vehicle_assignments';
SHOW INDEX FROM vehicles_user_vehicle_assignments;
```

### C2) Aplikace migraci v poradi

```bash
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0/db/022_add_approval_status_to_vehicles_users.sql
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0/db/023_add_fleet_manager_role_to_vehicles_users.sql
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0/db/024_add_vehicle_assignments_to_users.sql
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0/db/025_optimize_vehicle_assignments_indexes.sql
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0/db/026_add_phone_to_vehicles_users.sql
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0/db/027_rename_telefon_to_phone_in_vehicles_users.sql
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0/db/028_add_user_activity_columns.sql
```

### C3) Postcheck DB

```sql
SHOW COLUMNS FROM vehicles_users;
SHOW CREATE TABLE vehicles_user_vehicle_assignments;
SHOW INDEX FROM vehicles_user_vehicle_assignments;

-- vecerni kontrola users schema
SHOW COLUMNS FROM vehicles_users LIKE 'phone';
SHOW COLUMNS FROM vehicles_users LIKE 'telefon';
SHOW COLUMNS FROM vehicles_users LIKE 'last_login_at';
SHOW COLUMNS FROM vehicles_users LIKE 'last_activity_at';
SHOW COLUMNS FROM vehicles_users LIKE 'activity_meta_json';
```

---

## Cast D - Datovy prenos omezeni vozidel (jen pokud je PROD DB separatni)

Pokud je PROD DB oddelena od DEV:

1. neprenaset assignments pres interni ID naslepo,
2. mapovat pres username (uzivatel) + legacy_carid (vozidlo).

Doporuceny princip:

1. export uzivatelu (username, has_all_vehicles) z DEV,
2. export assignment mapy z DEV jako username + legacy_carid,
3. import do PROD s joinem na prod vehicles_users a vehicles_cars_list_v2,
4. validace poctu.

Validacni dotazy:

```sql
SELECT COUNT(*) FROM vehicles_users WHERE has_all_vehicles = 0;
SELECT COUNT(*) FROM vehicles_user_vehicle_assignments;

SELECT u.username, COUNT(a.vehicle_id) AS assigned_count
FROM vehicles_users u
LEFT JOIN vehicles_user_vehicle_assignments a ON a.user_id = u.id
GROUP BY u.id, u.username
ORDER BY assigned_count DESC
LIMIT 50;
```

---

## Cast E - Build a deploy kodu

## E1) Build frontend-v2

```bash
cd /var/www/erdms-dev/apps/vehicles/frontend-v2
npm run build
```

Pred buildem overit produkcni env pro frontend-v2:

```bash
cat /var/www/erdms-dev/apps/vehicles/frontend-v2/.env.production.local
```

Musi obsahovat:

```bash
VITE_API_V2_BASE_URL=/api.vehicles-v2/vehicle/v2.0
VITE_API_LEGACY_GET_URL=/api.vehicles/api.php
```

## E2) Deploy do produkce

Pozor: vyhnout se destruktivnimu --delete pri rsync.

Doporuceni:

1. frontend nasadit bez mazani,
2. API nasadit bez prepisu .env,
3. explicitne zachovat produkcni konfiguraci.

Priklad frontend rsync (bez --delete):

```bash
rsync -av /var/www/erdms-dev/apps/vehicles/frontend-v2/dist/ /var/www/erdms-platform/apps/vehicles/
```

Priklad API rsync (bez .env):

```bash
rsync -av \
  --exclude '.env' \
  --exclude '.env.*' \
  /var/www/erdms-dev/apps/vehicles/api/vehicle/v2.0/ \
  /var/www/erdms-platform/apps/vehicles/api/vehicle/v2.0/
```

Nakonec reload:

```bash
systemctl reload apache2
```

## Cast E3 - Izolace vuci EEO publikaci (povinne)

1. Nenasazovat nic z `apps/eeo-v2`.
2. Nemenit apache aliasy pro EEO.
3. Nespoustet zadne EEO build/deploy skripty.
4. V ramci tohoto deploye menit pouze cesty `apps/vehicles` / `apps/vehicles-v2`.

## Cast E4 - Mapa popup servisni historie (404 fix)

### Pricina

Pokud neni nastavena `VITE_API_LEGACY_GET_URL`, fallback mohl smerovat na neexistujici endpoint pod `/api.vehicles-v2/vehicle/api.php`, coz v produkci vraci 404.

### Oprava v kodu

V `frontend-v2/src/services/apiClient.js` je doplnen produkcni fallback na:

```text
/api.vehicles/api.php
```

### Postdeploy overeni

```bash
curl -I "https://erdms.zachranka.cz/api.vehicles/api.php?action=dbServiceHistory&spz=1S0%200001"
```

Ocekavani: HTTP 200 (ne 404).

---

## Cast F - Postdeploy verifikace

### F1) Backend sanity

```bash
php -l /var/www/erdms-platform/apps/vehicles/api/vehicle/v2.0/src/Repository/VehicleRepository.php
```

### F2) Overeni legendy na prehledu vozidel

Ocekavani:

1. Legenda ukazuje pouze pocty kusu.
2. Pocty nejsou zavisle jen na prvni strance pagingu.
3. Pocty odpovidaji backend agregaci.

### F3) Role a omezeni

1. U uzivatele s has_all_vehicles = 1 vidi vse.
2. U uzivatele s has_all_vehicles = 0 vidi jen prirazena vozidla.
3. Dashboard/prehled/detail/mapa respektuji stejne omezeni.

### F4) Logy po deploy

```bash
tail -200 /var/www/erdms-dev/logs/php-error.log
```

### F5) Overeni map popupu servisni historie

1. Otevrit Vozidla na mape.
2. Kliknout na vozidlo a otevrit popup.
3. Overit, ze se nacita servisni historie bez 404 v browser konzoli.

---

## Cast G - Rollback plan

1. Stop dalsi deploy kroky.
2. Obnovit souborovou zalohu z B1.
3. Obnovit DB dump z B2.
4. Reload Apache.
5. Overit funkcnost zakladnich endpointu a prehledu vozidel.

---

## Rychly checklist

- [ ] Potvrzena DB topologie (shared vs separatni)
- [ ] Vytvorena souborova a DB zaloha
- [ ] Aplikovany migrace 022-025
- [ ] Overen postcheck DB
- [ ] (Pokud separatni DB) prenesena data omezeni pres username + legacy_carid
- [ ] Frontend build OK
- [ ] Deploy FE/BE bez destruktivniho mazani
- [ ] Reload Apache
- [ ] Overena legenda poctu a user-vehicle omezeni
- [ ] Zkontrolovane PHP logy bez kritickych chyb
