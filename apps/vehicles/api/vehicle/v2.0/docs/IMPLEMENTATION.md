# Vehicles v2.00 API + FE v0.75 (DEV only)

## Scope
- All work is limited to apps/vehicles in DEV workspace.
- No production deployment is included.
- Legacy vehicles app remains available as deprecated reference.

## API base URL
- /dev/api.vehicles/vehicle/v2.0

## Endpoints
- GET /health
- POST /auth/login-local
- GET /auth/entra-login-url
- POST /auth/login-entra
- POST /auth/logout
- GET /auth/me
- GET /vehicles
- GET /drivers
- GET /vehicles/detail?vehicleId=123
- GET /vehicles/events?vehicleId=123
- POST /vehicles/detail
- POST /vehicles/bulk/location-state
- POST /sync/vehicles
- POST /sync/drivers/quick

## Auth policy
- Local login is allowed only for roles superadmin and administrator.
- Other users must use EntraID and be authorized in local DB.

### Entra bridge
- API v2 verifies central ERDMS session by calling `GET /auth/me` on central auth service.
- If central session is valid, access is granted only when user exists and is active in `vehicles_users`.
- Matching is done by `entra_id`, then `username`, then `email`.

## Migration flow for cars_list
1. Apply db/001_create_v2_tables.sql
2. Apply db/003_optimize_legacy_indexes.sql
3. Apply db/005_create_vehicle_detail_cards.sql
4. Apply db/006_status_raw_no_default.sql
5. Apply db/007_add_webdispecink_columns.sql
6. Apply db/008_align_webdispecink_columns_to_w_prefix.sql
7. Apply db/009_add_zzs_typ_to_vehicle_detail_cards.sql
8. Apply db/016_optimize_overview_status_spz_index.sql
9. Apply db/017_create_station_addresses_v2.sql
10. Apply db/018_add_wln_match_to_station_addresses_v2.sql
11. Apply db/019_add_typ_to_station_addresses_v2.sql
12. Apply db/029_add_manual_location_state_to_vehicle_detail_cards.sql
13. Apply db/030_add_service_context_json_to_vehicle_detail_cards.sql
14. Apply db/031_create_vehicle_manual_events_v2.sql
15. Apply db/034_add_ccs_columns_to_vehicles_cars_list_v2.sql
16. Seed admin users using db/002_seed_local_admins.sql
17. Trigger POST /sync/vehicles for direct sync from WebDispecink into vehicles_cars_list_v2
18. Apply db/035_create_drivers_cache_v2.sql and trigger POST /sync/drivers/quick for cache aktivních řidičů

Poznámka:
- Pole `status` ve `vehicles_cars_list_v2` se ukládá jako raw hodnota ze sync logiky bez další byznys interpretace ve v2 UI.
- Endpoint `POST /sync/vehicles` synchronizuje přímo z WebDispecinku (bez závislosti na v1 endpointech).

## FE v2
- Location: apps/vehicles/frontend-v2
- Build: npm run build
- Runtime env key: VITE_API_V2_BASE_URL
