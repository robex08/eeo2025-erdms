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

---

## Deploy do PROD (FE only – sticky search/share UX)
- Datum/čas: so 14. února 2026, 21:13 CET
- Git commit (DEV): `49d1cd0` (feature/v3-development)
- FE build-prod hash (nový): `4c21e0fe39a6`
- FE build-prod hash (původní): `dbb8e42c914a`

### Záloha pro rollback (před nasazením)
- Adresář: `/var/www/__BCK_PRODUKCE/2026-02-14/211407/`
- FE tarball: `fe-eeo-v2-prod_dbb8e42c914a.tgz`
- Kopie souborů: `prod-index.html`, `prod-version.json`

### Nasazení
- Zdroj: `/var/www/erdms-dev/apps/eeo-v2/client/build-prod/`
- Cíl: `/var/www/erdms-platform/apps/eeo-v2/`
- Rsync: bez `--delete`, bez zásahu do `api/` a `api-legacy/` (FE-only)

### Ověření
- `/var/www/erdms-platform/apps/eeo-v2/version.json`: `buildHash=4c21e0fe39a6`
- `index.html`: placeholder `__BUILD_HASH__` není přítomen (hash injektován)

Pozn.: produkční `.env*` nebyl měněn.
