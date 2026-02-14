# Deploy log – 2026-02-14

## Stav (DEV workspace)
- FE build DEV hotový: `/var/www/erdms-dev/apps/eeo-v2/client/build`
- FE build PROD hotový: `/var/www/erdms-dev/apps/eeo-v2/client/build-prod`
  - buildHash: `463abf889a19`
  - REACT_APP_VERSION (prod): `2.32`

## Zálohy PRODUKCE (před deploy)
Vytvořeno do:
- `/var/www/__BCK_PRODUKCE/2026-02-14/eeo-v2-predeploy-20260214-154456/`

Obsah:
- `fe-eeo-v2-root-20260214-154456.tar.gz`
- `be-node-api-20260214-154456.tar.gz`
- `be-php-api-legacy-20260214-154456.tar.gz`
- `db-eeo2025-20260214-154456.sql.gz`
- `SHA256SUMS.txt`

Pozn.: produkční `.env` nebyl upraven (jen čten pro dump přihlašovacích údajů).

## Kontrola PROD DB (read-only)
- DB: `eeo2025`
- `25a_objednavky_komentare.dt_aktualizace`: existuje (1)
- `25_notifikace_typy_udalosti` pro `ORDER_COMMENT_ADDED`, `COMMENT_REPLY`: 2 řádky
- `25_notifikace_sablony` pro `ORDER_COMMENT_ADDED`, `COMMENT_REPLY`: 2 řádky

=> SQL migrace pro komentáře/notifikace se na PROD už jeví jako aplikovaná.

## Deploy do PROD
- Datum/čas: so 14. února 2026, 16:02:56 CET
- FE deploy: /var/www/erdms-dev/apps/eeo-v2/client/build-prod -> /var/www/erdms-platform/apps/eeo-v2 (bez --delete, exclude api/, api-legacy/, client/)
- PHP deploy: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo -> /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo (bez --delete, exclude .env*)
- FE buildHash: 463abf889a19

## Produkce: úprava verze v api-legacy .env
- Datum/čas: so 14. února 2026, 16:05:45 CET
- Změna: pouze `REACT_APP_VERSION=2.31` -> `REACT_APP_VERSION=2.32`
- Soubor: `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env`
- Záloha: `/var/www/__BCK_PRODUKCE/2026-02-14/eeo-v2-env-backup-20260214-160545/api-legacy.env`
