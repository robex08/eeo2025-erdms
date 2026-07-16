# Vehicles v0.75 - DEV start guide

## Branch and baseline
- Branch: feature/vehicles-v2-refactor
- Baseline tag: vehicles-baseline-20260716-084215

## Frontend v2
1. cd apps/vehicles/frontend-v2
2. cp .env.example .env
3. npm install
4. npm run dev

Poznámka:
- Frontend-v2 má DEV proxy pro `/dev/api.vehicles` na `https://erdms.zachranka.cz`.
- Po změně `vite.config.js` je nutné restartovat `npm start` / `npm run dev`.
- Tato změna je pouze pro lokální DEV běh frontend-v2, produkce se tím nemění.

## API v2
1. cd apps/vehicles/api/vehicle/v2.0
2. cp .env.example .env
3. Configure DB credentials in .env
4. Ensure Apache route points to /dev/api.vehicles/vehicle/v2.0

## Database setup (vehicles-zzs-dev)
1. Execute db/001_create_v2_tables.sql
2. Execute db/003_optimize_legacy_indexes.sql
3. Update placeholder password hashes in db/002_seed_local_admins.sql
4. Execute db/002_seed_local_admins.sql

## cars_list migration
- Trigger POST /dev/api.vehicles/vehicle/v2.0/sync/vehicles
- This migrates legacy list_cars into vehicles_cars_list_v2

## Legacy and deprecation
- Legacy app remains available at existing vehicles app path.
- New FE has route /legacy with deprecated notice and link to old app.

## Safety guard
- DEV only work.
- No deploy script to production is used.
- Scope limited to apps/vehicles.
