---
name: eeo-build-troubleshoot
description: Spuštění a diagnostika DEV/PROD buildu eeo-v2 React klienta (apps/eeo-v2/client) - správné npm skripty, časté chyby (špatný endpoint, 404, DB mismatch), deploy postup. Použij při buildění, npm run build*, deploy nebo hlášení chyb typu "volá se špatné API"/"nefunguje build"/"404 na chunk".
---

# EEO v2 — Build DEV/PROD (client)

## Kritický problém

React nenačítá `.env.development` automaticky při buildu, i s `NODE_ENV=development`. Prostředí (DEV/PROD) určují `PUBLIC_URL` a `REACT_APP_API2_BASE_URL`, ne `NODE_ENV`.

## Správné příkazy (ověřeno v `client/package.json`)

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client

# DEV build (explicitní, doporučeno)
npm run build:dev:explicit
# → build/, API /dev/api.eeo/, PUBLIC_URL=/dev/eeo-v2, DB EEO-OSTRA-DEV

# PROD build
npm run build:prod
# → build-prod/, API /api.eeo/, PUBLIC_URL=/eeo-v2, DB eeo2025
```

`npm run build` a `npm run build:dev` existují taky, ale mají jiná (méně explicitní) nastavení proměnných — pro jistotu použij `build:dev:explicit` / `build:prod`, pokud uživatel nežádá jinak.

Buildy volají i `scripts/preserve-stale-assets.sh` (before/after) a `scripts/generate-build-info.sh` — nejde jen o `react-app-rewired build`, takže je nespouštěj ručně bez těchto kroků.

## DEV vs PROD přehled

| | DEV | PROD |
|---|---|---|
| DB | `EEO-OSTRA-DEV` | `eeo2025` |
| API | `/dev/api.eeo/` | `/api.eeo/` |
| PUBLIC_URL | `/dev/eeo-v2` | `/eeo-v2` |
| Build output | `client/build/` | `client/build-prod/` |
| Nasazení | automatické (Apache Alias) | ruční kopie do `/var/www/erdms-platform/` |

## PROD deploy (jen s explicitním potvrzením uživatele — viz skill `php-legacy-guardian`)

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client && npm run build:prod
cp -r build-prod/* /var/www/erdms-platform/apps/eeo-v2/
cp -r /var/www/erdms-dev/apps/eeo-v2/api-legacy /var/www/erdms-platform/apps/eeo-v2/
# KRITICKÉ: po zkopírování api-legacy vždy oprav produkční .env (DB_NAME=eeo2025, cesty do /var/www/erdms-platform/data/...)
systemctl reload apache2
```

## Ověření po buildu

```bash
# DEV
grep -o "dev/api.eeo" build/static/js/main.*.js
grep -o "/dev/eeo-v2" build/index.html
grep DB_NAME ../api-legacy/api.eeo/.env   # očekávej EEO-OSTRA-DEV

# PROD
grep -o "https://erdms.zachranka.cz/api.eeo" /var/www/erdms-platform/apps/eeo-v2/static/js/main.*.js
grep DB_NAME /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env   # očekávej eeo2025
```

## Časté chyby

| Symptom | Příčina | Oprava |
|---|---|---|
| PROD zapisuje do DEV databáze | zapomenutá oprava `.env` po zkopírování `api-legacy` | spusť `.env` fix z deploy postupu výše |
| `Uncaught SyntaxError: Unexpected token '<'` | špatný `PUBLIC_URL` | rebuild s `build:dev:explicit` nebo `build:prod` |
| DEV volá `/api.eeo/` místo `/dev/api.eeo/` | použit špatný build příkaz (`npm run build` místo `build:dev:explicit`) | rebuild správným skriptem |
| Build extrémně pomalý / OOM | chybí memory limit | skripty už mají `NODE_OPTIONS=--max_old_space_size=8192` vestavěné — pokud přesto padá, zkontroluj že neběží paralelně jiný build |

## Frontend konvence pro API base URL

Nikdy nehardcodovat absolutní produkční URL jako fallback:
```javascript
// ✅ SPRÁVNĚ
const API_BASE = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
// ❌ ŠPATNĚ — hardcoded absolutní URL jako fallback
const API_BASE = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';
```
Ověření, že v `src/` nezůstal žádný hardcoded absolutní endpoint:
```bash
grep -r "https://erdms.zachranka.cz/api.eeo" src/
```
